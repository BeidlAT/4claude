// Sphärenwerk – Klangmaschine (AudioWorklet-Prozessor)
//
// Alle Organe der Maschine rechnen hier im Audio-Thread. Der Hauptthread schickt nur Beschreibungen:
// welche Organe eingesetzt sind, welche Kabel stecken, wie die Regler stehen und welche Töne gespielt werden.
//
// Regeln für einen flüssigen Lauf auf dem iPad:
//  - In process() wird nichts angelegt (keine Arrays, Objekte oder Closures). Puffer, Stimmen, Körner und
//    Schläge entstehen beim Einsetzen eines Organs.
//  - Regler werden einmal pro Block (128 Samples) umgerechnet; Pegel gleiten innerhalb des Blocks.
//  - Rückkopplungen (Bandschleife, Kathedrale, Resonator) sättigen weich, der Altar prüft auf NaN.
'use strict';

const SR = sampleRate;
const BL = 128;
const TAU = Math.PI * 2;

/* ---------- Tabellen und Helfer ---------- */

const SIN_N = 4096;
const SIN_T = new Float32Array(SIN_N + 2);
for (let i = 0; i < SIN_N + 2; i++) SIN_T[i] = Math.sin(TAU * i / SIN_N);
// Sinus aus der Tabelle; Phase in Zyklen, 0 ≤ p < 1
function sinp(p) { const x = p * SIN_N, i = x | 0; return SIN_T[i] + (SIN_T[i + 1] - SIN_T[i]) * (x - i); }

const HANN_N = 2048;
const HANN_T = new Float32Array(HANN_N + 2);
for (let i = 0; i < HANN_N + 2; i++) HANN_T[i] = 0.5 - 0.5 * Math.cos(TAU * Math.min(i, HANN_N) / HANN_N);

let RS = 0x6d2b79f5 | 0;
function rnd() { RS ^= RS << 13; RS ^= RS >>> 17; RS ^= RS << 5; return (RS >>> 0) / 4294967296; }
function rndb() { return rnd() * 2 - 1; }

// Rauschtabelle: billiger als eine Zufallszahl pro Sample
const NZ_N = 16384, NZ_M = NZ_N - 1;
const NZ_T = new Float32Array(NZ_N);
for (let i = 0; i < NZ_N; i++) NZ_T[i] = rndb();

// weiche Sättigung (Padé-Näherung von tanh)
function sat(x) { if (x > 3) return 1; if (x < -3) return -1; const q = x * x; return x * (27 + q) / (27 + 9 * q); }

// PolyBLEP-Korrektur für einen Sprung der Höhe 2
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// 4-Punkt-Hermite-Interpolation in einem Ringpuffer (Maske m)
function herm(b, m, pos) {
  const i = Math.floor(pos), f = pos - i;
  const xm = b[(i - 1) & m], x0 = b[i & m], x1 = b[(i + 1) & m], x2 = b[(i + 2) & m];
  const c1 = 0.5 * (x1 - xm), c2 = xm - 2.5 * x0 + 2 * x1 - 0.5 * x2, c3 = 0.5 * (x2 - xm) + 1.5 * (x0 - x1);
  return ((c3 * f + c2) * f + c1) * f + x0;
}

function pow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

// Reglerkurven: 0 linear, 1 exponentiell, 2 ganzzahlig, 3 Pegel (v³·max), 4 Schalter
function mapP(lo, hi, c, v) {
  if (c === 1) return lo * Math.pow(hi / lo, v);
  if (c === 2) return Math.round(lo + (hi - lo) * v);
  if (c === 3) return hi * v * v * v;
  if (c === 4) return v >= 0.5 ? 1 : 0;
  return lo + (hi - lo) * v;
}

/* ---------- Grundbausteine ---------- */

class Bus {
  constructor() { this.L = new Float32Array(BL); this.R = new Float32Array(BL); this.lvl = 0; }
}

class Mod {
  constructor(E, id, P, spec, nAin, nAout, nMout) {
    this.E = E; this.id = id; this.P = P;
    const n = P.length;
    this.lo = new Float32Array(n); this.hi = new Float32Array(n); this.cv = new Int8Array(n);
    this.base = new Float32Array(n); this.mods = new Float32Array(n); this.v = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = spec ? spec[P[i]] : null;
      if (s) { this.lo[i] = s[0]; this.hi[i] = s[1]; this.cv[i] = s[2]; this.base[i] = s[3]; }
      else { this.lo[i] = 0; this.hi[i] = 1; this.cv[i] = 0; this.base[i] = 0.5; }
    }
    this.ain = []; for (let i = 0; i < nAin; i++) this.ain.push(new Bus());
    this.aout = []; for (let i = 0; i < nAout; i++) this.aout.push(new Bus());
    this.mout = new Float32Array(Math.max(1, nMout));
    this.inCab = [];
    this.dv = new Float32Array(64); this.nd = 0;
    this.upd();
  }
  setP(name, val) { const i = this.P.indexOf(name); if (i >= 0) this.base[i] = val < 0 ? 0 : val > 1 ? 1 : val; }
  upd() {
    const n = this.P.length, b = this.base, m = this.mods, v = this.v, lo = this.lo, hi = this.hi, c = this.cv;
    for (let i = 0; i < n; i++) { let x = b[i] + m[i]; x = x < 0 ? 0 : x > 1 ? 1 : x; v[i] = mapP(lo[i], hi[i], c[i], x); }
  }
  nv(i) { const x = this.base[i] + this.mods[i]; return x < 0 ? 0 : x > 1 ? 1 : x; }
  process() {}
  trig(port, hz, vel, dur, off) {}
  silence() {}
  disp() { this.nd = 0; }
}

// Tonhöhenerkennung (YIN) auf einem auf ~12 kHz heruntergerechneten Signal
class PitchTracker {
  constructor() {
    this.D = Math.max(1, Math.round(SR / 12000)); this.fs = SR / this.D;
    this.ring = new Float32Array(2048); this.w = 0; this.cnt = 0;
    this.l1 = 0; this.l2 = 0; this.k = 1 - Math.exp(-TAU * 2400 / SR);
    this.W = Math.round(0.03 * this.fs);
    this.tMin = Math.max(2, Math.floor(this.fs / 1100)); this.tMax = Math.ceil(this.fs / 62);
    this.buf = new Float32Array(this.W + this.tMax + 4); this.d = new Float32Array(this.tMax + 4);
    this.hz = 0; this.clar = 0; this.ok = false;
  }
  push(x) {
    const k = this.k, D = this.D, ring = this.ring;
    let l1 = this.l1, l2 = this.l2, c = this.cnt, w = this.w;
    for (let i = 0; i < BL; i++) {
      l1 += k * (x[i] - l1); l2 += k * (l1 - l2);
      if (++c >= D) { c = 0; ring[w] = l2; w = (w + 1) & 2047; }
    }
    this.l1 = l1; this.l2 = l2; this.cnt = c; this.w = w;
  }
  detect() {
    const W = this.W, tMax = this.tMax, N = W + tMax + 2, buf = this.buf, ring = this.ring, d = this.d, tMin = this.tMin;
    let r = (this.w - N) & 2047, en = 0;
    for (let i = 0; i < N; i++) { const x = ring[r]; buf[i] = x; en += x * x; r = (r + 1) & 2047; }
    let hz = 0, clar = 0;
    if (en > 1e-7) {
      d[0] = 1;
      let run = 0;
      for (let t = 1; t <= tMax + 1; t++) {
        let s = 0;
        for (let j = 0; j < W; j++) { const df = buf[j] - buf[j + t]; s += df * df; }
        run += s; d[t] = run > 0 ? s * t / run : 1;
      }
      // erstes Tal unter der Schwelle, sonst das tiefste Tal
      let best = 0, mv = 1e9, mi = tMin;
      for (let t = tMin; t < tMax; t++) {
        const x = d[t];
        if (x < mv) { mv = x; mi = t; }
        if (best === 0 && x < 0.16) {
          let u = t;
          while (u + 1 < tMax && d[u + 1] < d[u]) u++;
          best = u;
        }
      }
      if (best === 0 && mv <= 0.42) best = mi;
      if (best > 0) {
        const a = d[best - 1], b = d[best], c = d[best + 1], den = a - 2 * b + c;
        let off = den !== 0 ? 0.5 * (a - c) / den : 0;
        off = off > 1 ? 1 : off < -1 ? -1 : off;
        hz = this.fs / (best + off); clar = 1 - b;
      } else clar = 1 - Math.min(1, mv);
    }
    this.hz = hz > 0 ? hz : this.hz; this.clar = clar;
    this.ok = hz > 55 && hz < 1150 && clar > 0.55;
  }
}

// Tonhöhenverschiebung mit zwei rotierenden Leseköpfen (Doppler-Prinzip)
class Shifter {
  constructor(n) { this.N = pow2(n); this.m = this.N - 1; this.b = new Float32Array(this.N); this.w = 0; this.ph = 0; }
  // schreibt x und liefert das verschobene Signal; ratio > 1 = höher, W = Fensterlänge in Samples
  run(x, ratio, W) {
    const b = this.b, m = this.m;
    b[this.w] = x;
    let ph = this.ph + (1 - ratio) / W;
    if (ph >= 1) ph -= 1; else if (ph < 0) ph += 1;
    this.ph = ph;
    let pB = ph + 0.5; if (pB >= 1) pB -= 1;
    const posA = this.w - ph * W - 3 + this.N, posB = this.w - pB * W - 3 + this.N;
    const ia = posA | 0, fa = posA - ia, ib = posB | 0, fb = posB - ib;
    const xa = b[ia & m] + (b[(ia + 1) & m] - b[ia & m]) * fa;
    const xb = b[ib & m] + (b[(ib + 1) & m] - b[ib & m]) * fb;
    this.w = (this.w + 1) & m;
    return xa * HANN_T[(ph * HANN_N) | 0] + xb * HANN_T[(pB * HANN_N) | 0];
  }
  clear() { this.b.fill(0); }
}

/* ---------- Stimmen: der Chor der Sphären ---------- */

const ST_P = ['form', 'schwebung', 'glanz', 'filter', 'resonanz', 'anstieg', 'ausklang', 'drift', 'pegel',
  'atem', 'vibrato', 'gleiten', 'oktave', 'stimmen', 'breite', 'hoehe', 'hand'];

class Voice {
  constructor() {
    this.act = false; this.note = 0; this.gen = false; this.left = 0;
    this.hz = 220; this.tHz = 220; this.y = 0.5; this.ty = 0.5; this.vel = 0.8;
    this.p0 = 0; this.p1 = 0; this.p2 = 0; this.q1 = 0; this.q2 = 0; this.q3 = 0;
    this.env = 0; this.rel = false; this.age = 0;
    this.aL = 0; this.bL = 0; this.aR = 0; this.bR = 0; this.nL = 0; this.nR = 0;
    this.dp = 0; this.dpT = 0; this.dc = 0; this.dcT = 0; this.pan = 0; this.panT = 0;
    this.vph = 0; this.tph = 0; this.lvl = 0; this.nzi = 0;
    this.x1 = 1; this.y1 = 0; this.x2 = 1; this.y2 = 0; this.x3 = 1; this.y3 = 0;
  }
}

class Stimmen extends Mod {
  constructor(E, id, spec) {
    super(E, id, ST_P, spec, 0, 1, 1);
    this.vs = []; for (let i = 0; i < 16; i++) this.vs.push(new Voice());
    this.handY = 0.5;
    this.tL = new Float32Array(BL); this.tR = new Float32Array(BL);
  }
  find(n) { const vs = this.vs; for (let i = 0; i < 16; i++) if (vs[i].act && vs[i].note === n) return vs[i]; return null; }
  alloc() {
    const vs = this.vs, max = Math.max(1, Math.min(this.v[13] | 0, this.E.maxVoices));
    let act = 0, free = null;
    for (let i = 0; i < 16; i++) { const v = vs[i]; if (v.act) act++; else if (!free) free = v; }
    if (free && act < max) return free;
    let best = null, bs = 1e9;
    for (let i = 0; i < 16; i++) {
      const v = vs[i]; if (!v.act) continue;
      const s = (v.rel ? 0 : 4) + (v.gen ? 0 : 1) + v.env - v.age / (SR * 600);
      if (s < bs) { bs = s; best = v; }
    }
    return best || free || vs[0];
  }
  start(v, note, hz, y, vel, gen, dur) {
    const P = this.v;
    if (!v.act) {
      v.env = 0; v.aL = v.bL = v.aR = v.bR = 0; v.nL = v.nR = 0;
      v.p0 = rnd(); v.p1 = rnd(); v.p2 = rnd(); v.nzi = (rnd() * NZ_N) | 0;
      let a = rnd() * TAU; v.x1 = Math.cos(a); v.y1 = Math.sin(a);
      a = rnd() * TAU; v.x2 = Math.cos(a); v.y2 = Math.sin(a);
      a = rnd() * TAU; v.x3 = Math.cos(a); v.y3 = Math.sin(a);
      v.dp = v.dpT = rndb() * P[7] * 6; v.dc = v.dcT = 0;
      v.pan = v.panT = rndb() * P[14] * 0.7; v.vph = rnd(); v.tph = rnd();
      v.hz = hz;
    } else if (v.note !== note) v.hz = hz;
    v.act = true; v.note = note; v.gen = gen; v.left = gen ? Math.max(1, Math.round(dur * SR)) : 0;
    v.tHz = hz; v.y = v.ty = y; v.vel = vel; v.rel = false; v.age = 0;
  }
  padOn(n, hz, y, vel) {
    if (this.v[16] < 0.5) return;
    const v = this.find(n) || this.alloc();
    this.start(v, n, hz, y, vel, false, 0); this.handY = y;
  }
  padMove(n, hz, y) { const v = this.find(n); if (v) { v.tHz = hz; v.ty = y; } this.handY = y; }
  padOff(n) { const v = this.find(n); if (v && !v.gen) v.rel = true; }
  trig(port, hz, vel, dur) { const v = this.alloc(); this.start(v, this.E.genId--, hz, 0.3 + 0.35 * vel, vel, true, dur); }
  silence() { for (let i = 0; i < 16; i++) { this.vs[i].act = false; this.vs[i].env = 0; } }
  allOff() { for (let i = 0; i < 16; i++) if (this.vs[i].act) this.vs[i].rel = true; }
  // Durchgang 1: drei schwebende Oszillatoren in die Zwischenpuffer, spezialisiert je Wellenform-Abschnitt
  oscBlock(v, dt0, dt1, dt2, si, fr) {
    const tL = this.tL, tR = this.tR;
    let p0 = v.p0, p1 = v.p1, p2 = v.p2;
    if (si === 0) {
      for (let i = 0; i < BL; i++) {
        p0 += dt0; if (p0 >= 1) p0 -= 1;
        p1 += dt1; if (p1 >= 1) p1 -= 1;
        p2 += dt2; if (p2 >= 1) p2 -= 1;
        let x = p0 * SIN_N, k = x | 0, sn = SIN_T[k] + (SIN_T[k + 1] - SIN_T[k]) * (x - k);
        let t = p0 < 0.25 ? 4 * p0 : p0 < 0.75 ? 2 - 4 * p0 : 4 * p0 - 4;
        const oC = sn + (t - sn) * fr;
        x = p1 * SIN_N; k = x | 0; sn = SIN_T[k] + (SIN_T[k + 1] - SIN_T[k]) * (x - k);
        t = p1 < 0.25 ? 4 * p1 : p1 < 0.75 ? 2 - 4 * p1 : 4 * p1 - 4;
        const oA = sn + (t - sn) * fr;
        x = p2 * SIN_N; k = x | 0; sn = SIN_T[k] + (SIN_T[k + 1] - SIN_T[k]) * (x - k);
        t = p2 < 0.25 ? 4 * p2 : p2 < 0.75 ? 2 - 4 * p2 : 4 * p2 - 4;
        const oB = sn + (t - sn) * fr;
        tL[i] = 0.5 * (oC + oA); tR[i] = 0.5 * (oC + oB);
      }
    } else if (si === 1) {
      for (let i = 0; i < BL; i++) {
        p0 += dt0; if (p0 >= 1) p0 -= 1;
        p1 += dt1; if (p1 >= 1) p1 -= 1;
        p2 += dt2; if (p2 >= 1) p2 -= 1;
        let t = p0 < 0.25 ? 4 * p0 : p0 < 0.75 ? 2 - 4 * p0 : 4 * p0 - 4;
        let w = 1 - 2 * p0;
        if (p0 < dt0) { const u = p0 / dt0; w += u + u - u * u - 1; } else if (p0 > 1 - dt0) { const u = (p0 - 1) / dt0; w += u * u + u + u + 1; }
        const oC = t + (w - t) * fr;
        t = p1 < 0.25 ? 4 * p1 : p1 < 0.75 ? 2 - 4 * p1 : 4 * p1 - 4;
        w = 1 - 2 * p1;
        if (p1 < dt1) { const u = p1 / dt1; w += u + u - u * u - 1; } else if (p1 > 1 - dt1) { const u = (p1 - 1) / dt1; w += u * u + u + u + 1; }
        const oA = t + (w - t) * fr;
        t = p2 < 0.25 ? 4 * p2 : p2 < 0.75 ? 2 - 4 * p2 : 4 * p2 - 4;
        w = 1 - 2 * p2;
        if (p2 < dt2) { const u = p2 / dt2; w += u + u - u * u - 1; } else if (p2 > 1 - dt2) { const u = (p2 - 1) / dt2; w += u * u + u + u + 1; }
        const oB = t + (w - t) * fr;
        tL[i] = 0.5 * (oC + oA); tR[i] = 0.5 * (oC + oB);
      }
    } else {
      for (let i = 0; i < BL; i++) {
        p0 += dt0; if (p0 >= 1) p0 -= 1;
        p1 += dt1; if (p1 >= 1) p1 -= 1;
        p2 += dt2; if (p2 >= 1) p2 -= 1;
        let b = blep(p0, dt0), h = p0 + 0.5; if (h >= 1) h -= 1;
        let w = 1 - 2 * p0 + b;
        const oC = w + (((p0 < 0.5 ? 1 : -1) + b - blep(h, dt0)) * 0.72 - w) * fr;
        b = blep(p1, dt1); h = p1 + 0.5; if (h >= 1) h -= 1;
        w = 1 - 2 * p1 + b;
        const oA = w + (((p1 < 0.5 ? 1 : -1) + b - blep(h, dt1)) * 0.72 - w) * fr;
        b = blep(p2, dt2); h = p2 + 0.5; if (h >= 1) h -= 1;
        w = 1 - 2 * p2 + b;
        const oB = w + (((p2 < 0.5 ? 1 : -1) + b - blep(h, dt2)) * 0.72 - w) * fr;
        tL[i] = 0.5 * (oC + oA); tR[i] = 0.5 * (oC + oB);
      }
    }
    v.p0 = p0; v.p1 = p1; v.p2 = p2;
  }
  process() {
    this.upd();
    const P = this.v;
    const o = this.aout[0], L = o.L, R = o.R;
    L.fill(0); R.fill(0);
    const seg = P[0] * 3, si = seg >= 2.999 ? 2 : seg | 0, fr = seg - si;
    const detR = Math.pow(2, P[1] / 1200), glanz = P[2], cut = P[3], k = 1 / P[4];
    const ka = 1 - Math.exp(-2.04 / (P[5] * SR)), kr = 1 - Math.exp(-6.91 / (P[6] * SR));
    const drift = P[7], gain = 0.42 * P[8], breath = P[9] * 1.4, vib = P[10];
    const gk = 1 - Math.exp(-BL / (P[11] * SR)), octM = Math.pow(2, P[12]), width = P[14], hoehe = P[15];
    const fmax = SR * 0.22, tL = this.tL, tR = this.tR;
    for (let vi = 0; vi < 16; vi++) {
      const v = this.vs[vi];
      if (!v.act) continue;
      v.hz *= Math.pow(v.tHz / v.hz, gk);
      v.y += (v.ty - v.y) * 0.3;
      if (rnd() < BL / (SR * 1.1)) { v.dpT = rndb() * drift * 16; v.dcT = rndb() * drift * 0.7; v.panT = rndb() * width * 0.8; }
      v.dp += (v.dpT - v.dp) * 0.012; v.dc += (v.dcT - v.dc) * 0.012; v.pan += (v.panT - v.pan) * 0.004;
      v.vph += 5.2 * BL / SR; if (v.vph >= 1) v.vph -= 1;
      v.tph += 0.21 * BL / SR; if (v.tph >= 1) v.tph -= 1;
      const vibC = vib > 0 ? sinp(v.vph) * vib * 38 * Math.min(1, v.age / (0.6 * SR)) : 0;
      let f = v.hz * octM * Math.pow(2, (v.dp + vibC) / 1200);
      if (f > fmax) f = fmax;
      const dt0 = f / SR, dt1 = dt0 / detR, dt2 = dt0 * detR;
      this.oscBlock(v, dt0, dt1, dt2, si, fr);
      let fc = cut * Math.sqrt(f / 261.6) * Math.pow(2, (v.y - 0.5) * hoehe * 4 + v.dc) * (0.45 + 0.55 * Math.sqrt(v.env));
      if (fc < 25) fc = 25; else if (fc > SR * 0.42) fc = SR * 0.42;
      const g = Math.tan(Math.PI * fc / SR), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      // Glanz: drei leicht unharmonische Obertöne als rotierende Oszillatoren (je 4 Rechenschritte)
      const gl = glanz * (0.55 + 0.6 * v.y * hoehe);
      let tp2 = v.tph + 0.33; if (tp2 >= 1) tp2 -= 1;
      let tp3 = v.tph + 0.66; if (tp3 >= 1) tp3 -= 1;
      const dq1 = dt0 * 2.003, dq2 = dt0 * 2.997, dq3 = dt0 * 5.011;
      const g1 = dq1 < 0.4 ? gl * 0.5 * (0.55 + 0.45 * sinp(v.tph)) : 0;
      const g2 = dq2 < 0.4 ? gl * 0.33 * (0.55 + 0.45 * sinp(tp2)) : 0;
      const g3 = dq3 < 0.4 ? gl * 0.17 * (0.55 + 0.45 * sinp(tp3)) : 0;
      const e1 = g1 > 0 ? 2 * Math.sin(Math.PI * dq1) : 0, e2 = g2 > 0 ? 2 * Math.sin(Math.PI * dq2) : 0, e3 = g3 > 0 ? 2 * Math.sin(Math.PI * dq3) : 0;
      const pa = (v.pan + 1) * Math.PI / 4, pL = Math.cos(pa) * 1.4142, pR = Math.sin(pa) * 1.4142;
      const amp = gain * Math.pow(v.vel, 1.3);
      let env = v.env, aL = v.aL, bL = v.bL, aR = v.aR, bR = v.bR, nL = v.nL, nR = v.nR, nzi = v.nzi;
      let x1 = v.x1, y1 = v.y1, x2 = v.x2, y2 = v.y2, x3 = v.x3, y3 = v.y3;
      const rel = v.rel;
      for (let i = 0; i < BL; i++) {
        let xL = tL[i], xR = tR[i];
        if (breath > 0) {
          nL += 0.25 * (NZ_T[nzi] - nL); nR += 0.25 * (NZ_T[(nzi + 7919) & NZ_M] - nR); nzi = (nzi + 1) & NZ_M;
          xL += breath * nL; xR += breath * nR;
        }
        let v3 = xL - bL, v1 = a1 * aL + a2 * v3, v2 = bL + a2 * aL + a3 * v3;
        aL = 2 * v1 - aL; bL = 2 * v2 - bL;
        const yl = v2;
        v3 = xR - bR; v1 = a1 * aR + a2 * v3; v2 = bR + a2 * aR + a3 * v3;
        aR = 2 * v1 - aR; bR = 2 * v2 - bR;
        const yr = v2;
        x1 -= e1 * y1; y1 += e1 * x1;
        x2 -= e2 * y2; y2 += e2 * x2;
        x3 -= e3 * y3; y3 += e3 * x3;
        const s3 = y3 * g3;
        if (!rel) { env += (1.15 - env) * ka; if (env > 1) env = 1; } else env -= env * kr;
        const e = env * amp;
        L[i] += (yl + y1 * g1 + s3) * e * pL;
        R[i] += (yr + y2 * g2 + s3) * e * pR;
      }
      v.env = env; v.aL = aL; v.bL = bL; v.aR = aR; v.bR = bR; v.nL = nL; v.nR = nR; v.nzi = nzi;
      v.x1 = x1; v.y1 = y1; v.x2 = x2; v.y2 = y2; v.x3 = x3; v.y3 = y3;
      v.age += BL; v.lvl = env * Math.pow(v.vel, 1.3);
      if (v.gen && !v.rel) { v.left -= BL; if (v.left <= 0) v.rel = true; }
      if (rel && env < 3e-4) { v.act = false; v.lvl = 0; }
      if (!(Math.abs(aL) + Math.abs(x1) < 1e6)) { v.aL = v.bL = v.aR = v.bR = 0; v.x1 = 1; v.y1 = 0; v.act = false; }
    }
    this.mout[0] = this.handY;
  }
  disp() {
    // aktive Stimmen: Anzahl, dann Tonhöhe (log) und Pegel je Stimme
    const d = this.dv; let k = 1, n = 0;
    for (let i = 0; i < 16 && k < 62; i++) { const v = this.vs[i]; if (!v.act) continue; d[k++] = v.hz; d[k++] = v.lvl; n++; }
    d[0] = n; this.nd = k;
  }
}

/* ---------- Schlagwerk: gestimmte Klangkörper (Modalsynthese) ---------- */

const SW_P = ['material', 'haerte', 'nachklang', 'lage', 'schichtung', 'pegel', 'zufall', 'raum', 'stimmen', 'anschlag', 'yhaerte'];
const MAT = [
  { r: [1, 3.99, 9.9, 15.6], a: [1, 0.3, 0.1, 0.04], d: [1, 0.3, 0.12, 0.06], ds: 0.28, nz: 0.35, g: 1.25 },              // Holz
  { r: [1, 2.32, 4.25, 6.63, 9.38], a: [1, 0.5, 0.3, 0.17, 0.09], d: [1, 0.8, 0.6, 0.45, 0.32], ds: 1.4, nz: 0.06, g: 0.8 }, // Glas
  { r: [1, 2.756, 5.404, 8.933, 13.34], a: [1, 0.45, 0.27, 0.13, 0.06], d: [1, 0.55, 0.36, 0.22, 0.14], ds: 1.0, nz: 0.12, g: 0.85 }, // Metall
  { r: [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011], a: [0.5, 1, 0.62, 0.4, 0.5, 0.28, 0.22, 0.18],
    d: [1.5, 1, 0.82, 0.7, 0.6, 0.45, 0.4, 0.34], ds: 1.6, nz: 0.08, g: 0.62 },                                             // Glocke
  { r: [1, 1.0042, 2.74, 2.755, 5.12, 5.142], a: [1, 0.85, 0.5, 0.42, 0.24, 0.2], d: [1, 1, 0.68, 0.68, 0.42, 0.42], ds: 2.2, nz: 0.03, g: 0.7 }, // Schale
  { r: [1, 2, 3.01, 4.03, 5.05], a: [1, 0.5, 0.32, 0.18, 0.09], d: [1, 0.6, 0.42, 0.3, 0.2], ds: 0.32, nz: 0.55, g: 1.3, bend: 0.28 }, // Fell
  { drop: true, ds: 0.12, g: 0.9 },                                                                                         // Tropfen
  { r: [1, 2.57, 4.3, 6.4, 8.9], a: [1, 0.55, 0.35, 0.2, 0.12], d: [1, 0.42, 0.26, 0.16, 0.1], ds: 0.22, nz: 0.4, g: 1.1 }, // Stein
];

class Hit {
  constructor() {
    this.act = false; this.nm = 0; this.delay = 0; this.life = 0; this.t = 0; this.lvl = 0;
    this.c = new Float32Array(8); this.r2 = new Float32Array(8); this.g = new Float32Array(8);
    this.w = new Float32Array(8); this.r = new Float32Array(8);
    this.y1 = new Float32Array(8); this.y2 = new Float32Array(8);
    this.pl = new Float32Array(8); this.pr = new Float32Array(8);
    this.exN = 1; this.exT = 0; this.exA = 0; this.nz = 0; this.bend = 0;
    this.drop = false; this.dph = 0; this.dfr = 0; this.dfrT = 0; this.dk = 0; this.amp = 0; this.damp = 0;
    this.hz = 0; this.vel = 0;
  }
}

class Schlagwerk extends Mod {
  constructor(E, id, spec) {
    super(E, id, SW_P, spec, 0, 1, 0);
    this.hits = []; for (let i = 0; i < 16; i++) this.hits.push(new Hit());
    this.last = 0; this.lastHz = 0;
  }
  allocHit() {
    const max = Math.max(1, Math.min(this.v[8] | 0, 16));
    let act = 0, free = null, best = null, bs = 1e9;
    for (let i = 0; i < 16; i++) {
      const h = this.hits[i];
      if (!h.act) { if (!free) free = h; continue; }
      act++;
      const s = h.lvl * 4 + h.life / SR * 0.05;
      if (s < bs) { bs = s; best = h; }
    }
    if (free && act < max) return free;
    return best || free;
  }
  strike(hz, vel, hard, off) {
    const P = this.v, E = this.E;
    const h = this.allocHit();
    if (!h || !(hz > 0)) return;
    const mat = MAT[Math.max(0, Math.min(7, P[0] | 0))];
    const f = hz * Math.pow(2, P[3]);
    const zuf = P[6], raum = P[7];
    hard = hard < 0 ? 0 : hard > 1 ? 1 : hard;
    const T60 = Math.max(0.03, P[2] * mat.ds * (1 + rndb() * zuf * 0.25));
    const amp = vel * mat.g * P[5] * 0.5 * (1 + rndb() * zuf * 0.2);
    h.act = true; h.delay = off | 0; h.t = 0; h.hz = f; h.vel = vel; h.lvl = vel;
    if (mat.drop) {
      h.drop = true; h.nm = 0;
      h.dph = 0; h.dfr = f * 0.55; h.dfrT = f * (1.35 + rnd() * zuf * 0.4);
      h.dk = 1 - Math.exp(-1 / (0.014 * SR));
      const T = 0.05 + 0.22 * Math.sqrt(P[2]);
      h.damp = Math.exp(-6.91 / (T * SR)); h.amp = amp * 1.1;
      const p = rndb() * raum * 0.9, a = (p + 1) * Math.PI / 4;
      h.pl[0] = Math.cos(a); h.pr[0] = Math.sin(a);
      h.life = Math.round(T * SR * 1.2) + h.delay;
      E.noteHit(f, vel, 6);
      return;
    }
    h.drop = false;
    const hardC = 0.22 + 0.78 * hard;
    let nm = 0, maxT = 0;
    for (let m = 0; m < mat.r.length && nm < 8; m++) {
      const fm = f * mat.r[m] * (1 + rndb() * zuf * 0.006);
      if (fm >= SR * 0.45 || fm < 18) continue;
      const w = TAU * fm / SR, T = T60 * mat.d[m], r = Math.exp(-6.91 / (T * SR));
      if (T > maxT) maxT = T;
      h.w[nm] = w; h.r[nm] = r; h.c[nm] = 2 * r * Math.cos(w); h.r2[nm] = r * r;
      const am = mat.a[m] * Math.pow(hardC, m * 0.85) * (1 + rndb() * zuf * 0.3);
      h.g[nm] = am * Math.sin(w);
      const p = ((m & 1) ? 1 : -1) * raum * 0.55 + rndb() * raum * 0.35;
      const a = (Math.max(-1, Math.min(1, p)) + 1) * Math.PI / 4;
      h.pl[nm] = Math.cos(a) * 1.4142; h.pr[nm] = Math.sin(a) * 1.4142;
      h.y1[nm] = 0; h.y2[nm] = 0;
      nm++;
    }
    h.nm = nm;
    const exN = Math.max(2, Math.round(SR * (0.0065 - 0.006 * hard)));
    h.exN = exN; h.exT = 0; h.exA = amp * 2 / exN; h.nz = mat.nz * (0.4 + P[9]);
    h.bend = mat.bend ? mat.bend * (0.6 + hard * 0.8) : 0;
    h.life = Math.round(maxT * SR * 1.15) + exN + h.delay;
    E.noteHit(f, vel, P[0] | 0);
  }
  layerStrike(hz, vel, y) {
    const P = this.v;
    if (P[4] < 0.01) return;
    this.strike(hz, vel * P[4], P[1] + (y - 0.5) * P[10], 0);
  }
  trig(port, hz, vel, dur, off) { this.strike(hz, vel, this.v[1] + (vel - 0.6) * 0.4, off); }
  silence() { for (let i = 0; i < 16; i++) this.hits[i].act = false; }
  process() {
    this.upd();
    const o = this.aout[0], L = o.L, R = o.R;
    L.fill(0); R.fill(0);
    const bendTau = 0.045 * SR;
    for (let hi = 0; hi < 16; hi++) {
      const h = this.hits[hi];
      if (!h.act) continue;
      let i0 = 0;
      if (h.delay > 0) {
        if (h.delay >= BL) { h.delay -= BL; h.life -= BL; continue; }
        i0 = h.delay; h.delay = 0;
      }
      if (h.drop) {
        let dph = h.dph, dfr = h.dfr, amp = h.amp;
        const dfrT = h.dfrT, dk = h.dk, damp = h.damp, pl = h.pl[0], pr = h.pr[0];
        for (let i = i0; i < BL; i++) {
          dfr += (dfrT - dfr) * dk; dph += dfr / SR; if (dph >= 1) dph -= 1;
          const s = sinp(dph) * amp; amp *= damp;
          L[i] += s * pl; R[i] += s * pr;
        }
        h.dph = dph; h.dfr = dfr; h.amp = amp; h.lvl = amp;
      } else {
        const nm = h.nm, c = h.c, r2 = h.r2, g = h.g, y1 = h.y1, y2 = h.y2, pl = h.pl, pr = h.pr;
        if (h.bend > 0 && h.t < 0.35 * SR) {
          const fac = 1 + h.bend * Math.exp(-h.t / bendTau);
          for (let m = 0; m < nm; m++) { const w = Math.min(3.0, h.w[m] * fac); c[m] = 2 * h.r[m] * Math.cos(w); }
        }
        let exT = h.exT;
        const exN = h.exN, exA = h.exA, nz = h.nz, hs = HANN_N / exN;
        for (let i = i0; i < BL; i++) {
          let e = 0;
          if (exT < exN) { e = exA * HANN_T[(exT * hs) | 0] * (1 + nz * rndb()); exT++; }
          let sl = 0, sr = 0;
          for (let m = 0; m < nm; m++) {
            const y = c[m] * y1[m] - r2[m] * y2[m] + g[m] * e;
            y2[m] = y1[m]; y1[m] = y; sl += y * pl[m]; sr += y * pr[m];
          }
          L[i] += sl; R[i] += sr;
        }
        h.exT = exT;
        let en = 0; for (let m = 0; m < nm; m++) en += Math.abs(y1[m]) + Math.abs(y2[m]);
        h.lvl = en;
        if (exT >= exN && en < 2e-6) h.life = 0;
        if (!(en < 1e4)) h.life = 0;
      }
      h.t += BL - i0; h.life -= BL;
      if (h.life <= 0) h.act = false;
    }
  }
  disp() {
    const d = this.dv; let n = 0, k = 1;
    for (let i = 0; i < 16 && k < 62; i++) { const h = this.hits[i]; if (!h.act) continue; d[k++] = h.hz; d[k++] = Math.min(1, h.lvl * 4); n++; }
    d[0] = n; this.nd = k;
  }
}

/* ---------- Atem: das Mikrofon, mit Halten (granulares Einfrieren) ---------- */

const AT_P = ['eingang', 'schwelle', 'direkt', 'frost', 'laenge', 'einstimmen', 'textur', 'streuung', 'schichten', 'echo', 'halten'];

class Layer {
  constructor(maxN) {
    this.buf = new Float32Array(maxN + 4); this.maxN = maxN; this.n = 0;
    this.act = false; this.id = 0; this.f0 = 0; this.rate = 1; this.tRate = 1; this.vol = 1; this.tVol = 1;
    this.env = 0; this.rel = false; this.gain = 1; this.age = 0; this.lvl = 0;
    this.gs = new Float32Array(8); this.gt = new Float32Array(8); this.gn = new Float32Array(8); this.gj = new Float32Array(8);
    this.gL = new Float32Array(8); this.gR = new Float32Array(8);
  }
}

class Atem extends Mod {
  constructor(E, id, spec) {
    super(E, id, AT_P, spec, 0, 1, 2);
    this.rn = pow2(SR * 5); this.rm = this.rn - 1; this.ring = new Float32Array(this.rn);
    this.T = 0;
    this.pt = new PitchTracker(); this.ptc = 0;
    this.g = 0; this.gate = 0; this.env = 0; this.db = -120; this.dcx = 0; this.dcy = 0;
    this.sound = false; this.soundSince = 0; this.quietSince = 0; this.below = -1;
    this.hist = new Float32Array(6); this.hn = 0; this.hix = 0;
    this.voiced = false; this.stable = false; this.medC = 0; this.curHz = 0; this.lastHz = 0; this.lastVoicedAt = -1;
    this.cap = 0; this.capC = 0; this.pend = false; this.pendStart = 0; this.pendF0 = 0;
    const maxN = Math.ceil(SR * 2.6);
    this.layers = []; for (let i = 0; i < 8; i++) this.layers.push(new Layer(maxN));
    this.x = new Float32Array(BL);
    this.envOut = 0; this.pitchOut = 0;
  }
  analyze() {
    const pt = this.pt;
    const voiced = pt.ok && pt.clar > 0.78 && this.sound;
    this.voiced = voiced;
    if (voiced) {
      const c = 1200 * Math.log2(pt.hz / 440);
      this.hist[this.hix] = c; this.hix = (this.hix + 1) % 6; if (this.hn < 6) this.hn++;
      let mn = 1e9, mx = -1e9, sum = 0;
      for (let i = 0; i < this.hn; i++) { const h = this.hist[i]; if (h < mn) mn = h; if (h > mx) mx = h; sum += h; }
      this.stable = this.hn >= 5 && mx - mn < 45;
      this.medC = sum / this.hn; this.curHz = pt.hz; if (this.stable) { this.lastHz = 440 * Math.pow(2, this.medC / 1200); this.lastVoicedAt = this.T; }
    } else { this.hn = 0; this.stable = false; this.curHz = 0; }
  }
  beginCapture(f0) {
    const now = this.T, Lmax = this.v[4];
    this.cap = 1; this.capC = f0 > 0 ? 1200 * Math.log2(f0 / 440) : -99999;
    this.pendF0 = f0;
    this.pendStart = Math.max(this.soundSince + Math.round(0.05 * SR), now - Math.round(Lmax * SR));
    if (now - this.pendStart >= Lmax * SR * 0.98) { this.capture(this.pendStart, now, f0); this.pend = false; }
    else this.pend = true;
  }
  // von außen: Halten wurde gedrückt oder „Fangen“
  grab(force) {
    if (this.sound) { this.beginCapture(this.stable ? 440 * Math.pow(2, this.medC / 1200) : 0); return true; }
    if (!force) return false;
    const now = this.T, n = Math.round(this.v[4] * SR);
    // eben verklungen? Dann den letzten Ton nehmen, sonst die letzten Sekunden
    if (this.quietSince > 0 && now - this.quietSince < 2 * SR) {
      const e = this.quietSince - Math.round(0.03 * SR), s = Math.max(this.soundSince + Math.round(0.05 * SR), e - n);
      return this.capture(s, e, this.lastVoicedAt > this.soundSince ? this.lastHz : 0);
    }
    return this.capture(now - n, now, 0);
  }
  capture(s0, s1, f0) {
    const P = this.v, E = this.E;
    let n = s1 - s0;
    if (n < 0.1 * SR) return false;
    const maxL = Math.max(1, Math.min(P[8] | 0, E.maxLayers));
    let act = 0, oldest = null, free = null, quiet = null;
    for (let i = 0; i < 8; i++) {
      const l = this.layers[i];
      if (!l.act) { if (!free) free = l; continue; }
      if (!l.rel) { act++; if (!oldest || l.age > oldest.age) oldest = l; }
      if (!quiet || l.env < quiet.env) quiet = l;
    }
    if (act >= maxL && oldest) oldest.rel = true;
    const lay = free || quiet;
    if (!lay) return false;
    if (lay.act) E.port.postMessage({ t: 'lyr-', id: lay.id });
    if (n > lay.maxN) { s0 = s1 - lay.maxN; n = lay.maxN; }
    const b = lay.buf, ring = this.ring, rm = this.rm;
    let sq = 0;
    for (let i = 0; i < n; i++) { const x = ring[(s0 + i) & rm]; b[i] = x; sq += x * x; }
    b[n] = 0; b[n + 1] = 0;
    const fN = Math.min(Math.round(0.012 * SR), n >> 2);
    for (let i = 0; i < fN; i++) { const w = i / fN; b[i] *= w; b[n - 1 - i] *= w; }
    const rms = Math.sqrt(sq / n);
    if (rms < 2e-4) return false;
    lay.n = n; lay.gain = Math.min(10, 0.2 / rms); lay.f0 = f0;
    let r = 1;
    if (f0 > 0) { const t = E.nearestHz(f0); r = Math.pow(t / f0, P[5]); }
    lay.rate = lay.tRate = r; lay.vol = lay.tVol = 1;
    lay.act = true; lay.rel = false; lay.env = 0; lay.age = 0; lay.id = E.layerId++;
    for (let g = 0; g < 8; g++) { this.spawn(lay, g); lay.gt[g] = Math.floor(rnd() * lay.gn[g]); }
    E.port.postMessage({ t: 'lyr+', id: lay.id, f0: f0, hz: f0 > 0 ? f0 * r : 0, m: this.id });
    return true;
  }
  spawn(lay, g) {
    const P = this.v, rate = lay.rate, spread = P[7];
    const rj = rate * (1 + rndb() * 0.0024);
    const n = lay.n;
    let len = Math.round(P[6] * SR * (0.75 + 0.5 * rnd()));
    const maxLen = Math.floor((n - 6) / rj);
    if (len > maxLen * 0.85) len = Math.max(64, Math.floor(maxLen * 0.85));
    const span = Math.max(0, n - 6 - len * rj);
    let s0 = 2 + span * 0.5 + rndb() * span * 0.5 * (0.15 + 0.85 * spread);
    if (s0 < 2) s0 = 2; if (s0 > 2 + span) s0 = 2 + span;
    lay.gs[g] = s0; lay.gn[g] = len; lay.gt[g] = 0; lay.gj[g] = rj;
    const p = rndb() * (0.2 + 0.7 * spread), a = (p + 1) * Math.PI / 4;
    lay.gL[g] = Math.cos(a) * 1.4142; lay.gR[g] = Math.sin(a) * 1.4142;
  }
  releaseAll() { for (let i = 0; i < 8; i++) if (this.layers[i].act) this.layers[i].rel = true; this.pend = false; this.cap = 0; }
  layer(id) { for (let i = 0; i < 8; i++) { const l = this.layers[i]; if (l.act && l.id === id) return l; } return null; }
  silence() { for (let i = 0; i < 8; i++) this.layers[i].act = false; this.pend = false; this.cap = 0; }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    const gainT = Math.pow(10, P[0] / 20), thr = P[1], direkt = P[2], frost = P[3];
    const src = E.micBuf, x = this.x, ring = this.ring, rm = this.rm;
    let g = this.g, dcx = this.dcx, dcy = this.dcy, env = this.env;
    const gs = (gainT - g) / BL, rel = Math.exp(-1 / (0.08 * SR));
    const T0 = this.T;
    for (let i = 0; i < BL; i++) {
      g += gs;
      const s = src[i] * g;
      const y = s - dcx + 0.9995 * dcy; dcx = s; dcy = y;
      x[i] = y; ring[(T0 + i) & rm] = y;
      const a = y < 0 ? -y : y;
      env = a > env ? a : env * rel;
    }
    this.g = g; this.dcx = dcx; this.dcy = dcy; this.env = env; this.T = T0 + BL;
    const now = this.T;
    const db = env > 1e-6 ? 20 * Math.log10(env) : -120;
    this.db = db;
    if (!this.sound) {
      if (db > thr && E.micOn) { this.sound = true; this.soundSince = now - BL; this.below = -1; }
    } else if (db < thr - 5 || !E.micOn) {
      if (this.below < 0) this.below = now;
      else if (now - this.below > 0.15 * SR) { this.sound = false; this.quietSince = this.below; this.below = -1; }
    } else this.below = -1;
    this.pt.push(x);
    if (++this.ptc >= 6) { this.ptc = 0; this.pt.detect(); this.analyze(); }
    // Einfangen: beim Halten jeden gesungenen Ton, sonst nur auf Wunsch
    if (this.pend) {
      const len = now - this.pendStart;
      if (len >= P[4] * SR) { this.capture(this.pendStart, now, this.pendF0); this.pend = false; }
      else if (!this.sound) { this.capture(this.pendStart, this.quietSince - Math.round(0.03 * SR), this.pendF0); this.pend = false; }
    } else if (E.hold && P[10] >= 0.5 && E.micOn) {
      if (this.cap === 0) {
        if (this.sound && this.stable) this.beginCapture(440 * Math.pow(2, this.medC / 1200));
        else if (this.sound && !this.voiced && now - this.soundSince > 0.3 * SR && db > thr + 8) this.beginCapture(0);
      } else if (!this.sound) this.cap = 0;
      else if (this.stable && this.capC > -9999 && Math.abs(this.medC - this.capC) > 80) this.cap = 0;
    } else if (!this.sound) this.cap = 0;
    // Ausgang: Direktsignal hinter dem Tor, dazu die gehaltenen Schichten
    const o = this.aout[0], L = o.L, R = o.R;
    const gateT = this.sound ? 1 : 0, kg = gateT > this.gate ? 0.004 : 0.00012;
    let gate = this.gate;
    for (let i = 0; i < BL; i++) { gate += (gateT - gate) * kg; const s = x[i] * gate * direkt; L[i] = s; R[i] = s; }
    this.gate = gate;
    this.playLayers(L, R, frost);
    // Modulationsausgänge
    const envN = Math.max(0, Math.min(1, (db + 60) / 60));
    this.envOut += (envN - this.envOut) * (envN > this.envOut ? 0.5 : 0.08);
    this.mout[0] = this.envOut;
    if (this.voiced && this.curHz > 0) {
      const p = Math.log2(this.curHz / E.padLo) / E.padOct;
      this.pitchOut = p < 0 ? 0 : p > 1 ? 1 : p;
    }
    this.mout[1] = this.pitchOut;
  }
  playLayers(L, R, frost) {
    const E = this.E, G = E.grains;
    const kIn = 1 - Math.exp(-BL / (0.35 * SR)), kOut = 1 - Math.exp(-BL * 6.91 / (1.8 * SR));
    for (let li = 0; li < 8; li++) {
      const lay = this.layers[li];
      if (!lay.act) continue;
      const e0 = lay.env;
      if (!lay.rel) lay.env += (1 - lay.env) * kIn; else lay.env -= lay.env * kOut;
      const e1 = lay.env;
      lay.rate += (lay.tRate - lay.rate) * 0.08;
      lay.vol += (lay.tVol - lay.vol) * 0.1;
      lay.age += BL;
      const k0 = e0 * lay.gain * frost * lay.vol * 2 / G, k1 = e1 * lay.gain * frost * lay.vol * 2 / G;
      const dk = (k1 - k0) / BL, buf = lay.buf, nm1 = lay.n - 1;
      for (let g = 0; g < G; g++) {
        let s0 = lay.gs[g], t = lay.gt[g], len = lay.gn[g], rj = lay.gj[g], pl = lay.gL[g], pr = lay.gR[g];
        let hs = HANN_N / len, amp = k0;
        for (let i = 0; i < BL; i++) {
          if (t >= len) {
            this.spawn(lay, g);
            s0 = lay.gs[g]; t = 0; len = lay.gn[g]; rj = lay.gj[g]; pl = lay.gL[g]; pr = lay.gR[g]; hs = HANN_N / len;
          }
          const pos = s0 + t * rj, ii = pos | 0;
          if (ii >= nm1) { t = len; amp += dk; continue; }
          const xs = buf[ii] + (buf[ii + 1] - buf[ii]) * (pos - ii);
          const w = HANN_T[(t * hs) | 0] * amp;
          L[i] += xs * w * pl; R[i] += xs * w * pr;
          t++; amp += dk;
        }
        lay.gs[g] = s0; lay.gt[g] = t; lay.gn[g] = len; lay.gj[g] = rj; lay.gL[g] = pl; lay.gR[g] = pr;
      }
      lay.lvl = e1 * lay.vol;
      if (lay.rel && lay.env < 1e-3) { lay.act = false; E.port.postMessage({ t: 'lyr-', id: lay.id }); }
    }
  }
  disp() {
    const d = this.dv;
    d[0] = this.db; d[1] = this.voiced ? this.curHz : 0; d[2] = this.pt.clar; d[3] = this.sound ? 1 : 0; d[4] = this.pend ? 1 : 0;
    this.nd = 5;
  }
}

/* ---------- Spiegel: Harmonien im Raster der Tonleiter ---------- */

const SP_P = ['stufe1', 'stufe2', 'pegel1', 'pegel2', 'einstimmen', 'mischung', 'fenster', 'breite'];

class Spiegel extends Mod {
  constructor(E, id, spec) {
    super(E, id, SP_P, spec, 1, 1, 0);
    this.sh = [new Shifter(SR * 0.4), new Shifter(SR * 0.4), new Shifter(SR * 0.4)];
    this.pt = new PitchTracker(); this.ptc = 0; this.hz = 0;
    this.r = new Float32Array([1, 1, 1]); this.rT = new Float32Array([1, 1, 1]);
    this.x = new Float32Array(BL);
  }
  retarget() {
    const E = this.E, P = this.v, hz = this.hz;
    const s1 = P[0] | 0, s2 = P[1] | 0;
    if (hz > 0) {
      const i = E.nearestIdx(hz), f = E.scaleHz[i];
      this.rT[0] = Math.pow(f / hz, P[4]);
      this.rT[1] = E.scaleHz[Math.max(0, Math.min(E.scaleHz.length - 1, i + s1))] / hz;
      this.rT[2] = E.scaleHz[Math.max(0, Math.min(E.scaleHz.length - 1, i + s2))] / hz;
    } else {
      this.rT[0] = 1; this.rT[1] = E.stepRatio(s1); this.rT[2] = E.stepRatio(s2);
    }
  }
  silence() { for (const s of this.sh) s.clear(); }
  process() {
    this.upd();
    const P = this.v, inL = this.ain[0].L, inR = this.ain[0].R, x = this.x;
    for (let i = 0; i < BL; i++) x[i] = (inL[i] + inR[i]) * 0.5;
    this.pt.push(x);
    if (++this.ptc >= 6) { this.ptc = 0; this.pt.detect(); if (this.pt.ok && this.pt.clar > 0.75) this.hz = this.pt.hz; }
    this.retarget();
    for (let k = 0; k < 3; k++) this.r[k] += (this.rT[k] - this.r[k]) * 0.2;
    const W = P[6] * SR, p1 = P[2], p2 = P[3], tune = P[4], mix = P[5], wd = P[7] * 0.8;
    const r0 = this.r[0], r1 = this.r[1], r2 = this.r[2];
    const o = this.aout[0], L = o.L, R = o.R, a = this.sh[0], b = this.sh[1], c = this.sh[2];
    for (let i = 0; i < BL; i++) {
      const s = x[i];
      const pri = s + (a.run(s, r0, W) - s) * tune;
      const h1 = b.run(s, r1, W) * p1, h2 = c.run(s, r2, W) * p2;
      const wl = pri + h1 * (1 + wd) * 0.5 + h2 * (1 - wd) * 0.5;
      const wr = pri + h1 * (1 - wd) * 0.5 + h2 * (1 + wd) * 0.5;
      L[i] = inL[i] * (1 - mix) + wl * mix;
      R[i] = inR[i] * (1 - mix) + wr * mix;
    }
  }
}

/* ---------- Resonator: Saiten, gestimmt auf die Tonleiter ---------- */

const RS_P = ['lage', 'saiten', 'klingen', 'helligkeit', 'anregung', 'mischung', 'streuung', 'breite'];

class Resonator extends Mod {
  constructor(E, id, spec) {
    super(E, id, RS_P, spec, 1, 1, 0);
    this.N = pow2(SR / 18 + 8); this.m = this.N - 1;
    this.bufs = []; for (let k = 0; k < 12; k++) this.bufs.push(new Float32Array(this.N));
    this.w = 0; this.ns = 0;
    this.D = new Float32Array(12); this.Dt = new Float32Array(12); this.lp = new Float32Array(12);
    this.en = new Float32Array(12); this.hz = new Float32Array(12); this.det = new Float32Array(12);
    this.pl = new Float32Array(12); this.pr = new Float32Array(12); this.fb = new Float32Array(12);
    for (let k = 0; k < 12; k++) this.det[k] = rndb();
    this.key = -1;
  }
  retune() {
    const P = this.v, E = this.E, ns = P[1] | 0, oct = P[0] | 0, spread = P[6], wd = P[7];
    for (let k = 0; k < 12; k++) {
      if (k < ns) {
        const f = Math.min(SR * 0.2, E.stepHz(oct, k) * Math.pow(2, this.det[k] * spread * 14 / 1200));
        this.hz[k] = f; this.Dt[k] = SR / f;
        if (k >= this.ns || this.D[k] <= 0) this.D[k] = this.Dt[k];
        const p = (k & 1 ? 1 : -1) * wd * (0.35 + 0.65 * (k / Math.max(1, ns - 1))), a = (p + 1) * Math.PI / 4;
        this.pl[k] = Math.cos(a) * 1.4142; this.pr[k] = Math.sin(a) * 1.4142;
      } else { this.bufs[k].fill(0); this.lp[k] = 0; this.en[k] = 0; }
    }
    this.ns = ns;
  }
  silence() { for (let k = 0; k < 12; k++) { this.bufs[k].fill(0); this.lp[k] = 0; } }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    const key = (P[0] | 0) * 1000 + (P[1] | 0) * 10 + E.scaleVer * 100000 + Math.round(P[6] * 50) * 7 + Math.round(P[7] * 20) * 3;
    if (key !== this.key) { this.key = key; this.retune(); }
    const ns = this.ns, T60 = P[2], drive = Math.pow(10, P[4] / 20), mix = P[5];
    const a = 1 - Math.exp(-TAU * P[3] / SR);
    for (let k = 0; k < ns; k++) {
      this.D[k] += (this.Dt[k] - this.D[k]) * 0.08;
      this.fb[k] = Math.min(0.9995, Math.exp(-6.91 * this.D[k] / (SR * T60)));
    }
    const inL = this.ain[0].L, inR = this.ain[0].R, o = this.aout[0], L = o.L, R = o.R;
    const bufs = this.bufs, D = this.D, lp = this.lp, fb = this.fb, pl = this.pl, pr = this.pr, m = this.m, N = this.N;
    const norm = 0.55 / Math.sqrt(Math.max(1, ns));
    let w = this.w;
    for (let i = 0; i < BL; i++) {
      const xin = (inL[i] + inR[i]) * 0.5 * drive;
      let sl = 0, sr = 0;
      for (let k = 0; k < ns; k++) {
        const b = bufs[k], pos = w - D[k] + N, ii = pos | 0, f = pos - ii;
        const x0 = b[ii & m];
        const rd = x0 + (b[(ii + 1) & m] - x0) * f;
        const l = lp[k] + a * (rd - lp[k]);
        lp[k] = l;
        const res = fb[k] * l;
        let y = xin + res;
        if (y > 2.5) y = 2.5; else if (y < -2.5) y = -2.5;
        b[w] = y;
        sl += res * pl[k]; sr += res * pr[k];
      }
      w = (w + 1) & m;
      L[i] = inL[i] * (1 - mix) + sl * norm * mix;
      R[i] = inR[i] * (1 - mix) + sr * norm * mix;
    }
    this.w = w;
    for (let k = 0; k < ns; k++) {
      const e = Math.abs(lp[k]);
      this.en[k] = Math.max(e, this.en[k] * 0.93);
      if (!(e < 1e3)) { this.silence(); break; }
    }
  }
  disp() {
    const d = this.dv, ns = this.ns; d[0] = ns;
    for (let k = 0; k < ns; k++) { d[1 + k * 2] = this.hz[k]; d[2 + k * 2] = Math.min(1, this.en[k] * 3); }
    this.nd = 1 + ns * 2;
  }
}

/* ---------- Bandschleife: Bandecho mit Leiern ---------- */

const BS_P = ['zeit', 'rueckkopplung', 'leiern', 'ton', 'saettigung', 'mischung', 'takt', 'pingpong', 'alter', 'breite'];
const BS_DIV = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 8, 16];

class Bandschleife extends Mod {
  constructor(E, id, spec) {
    super(E, id, BS_P, spec, 1, 1, 0);
    this.N = pow2(SR * 10.5); this.m = this.N - 1;
    this.bL = new Float32Array(this.N); this.bR = new Float32Array(this.N); this.w = 0;
    this.D = SR * 0.5; this.Dt = this.D;
    this.wph = rnd(); this.fph = rnd(); this.dr = 0; this.drT = 0;
    this.lpL = 0; this.lpR = 0; this.hpL = 0; this.hpR = 0; this.hxL = 0; this.hxR = 0;
    this.reel = 0;
  }
  delaySec() {
    const P = this.v, nv = this.nv(0);
    let s;
    if (P[6] >= 0.5) s = BS_DIV[Math.round(nv * 9)] * 60 / this.E.bpm;
    else s = 0.03 * Math.pow(8 / 0.03, nv);
    return Math.min(s, (this.N - 16) / SR / 1.03);
  }
  silence() { this.bL.fill(0); this.bR.fill(0); this.lpL = this.lpR = this.hpL = this.hpR = 0; }
  process() {
    this.upd();
    const P = this.v;
    this.Dt = this.delaySec() * SR;
    const fbk = P[1] * 1.0, wow = P[2], tone = 1 - Math.exp(-TAU * P[3] / SR), drive = 0.6 + P[4] * 3.4;
    const mix = P[5], pp = P[7], hiss = P[8] * 0.0025, wd = P[9];
    const hpk = 1 - Math.exp(-TAU * 70 / SR);
    if (rnd() < BL / (SR * 2.5)) this.drT = rndb();
    this.dr += (this.drT - this.dr) * 0.003;
    const kD = 1 - Math.exp(-1 / (0.35 * SR));
    const bL = this.bL, bR = this.bR, m = this.m, N = this.N;
    const inL = this.ain[0].L, inR = this.ain[0].R, o = this.aout[0], L = o.L, R = o.R;
    let w = this.w, D = this.D, wph = this.wph, fph = this.fph, lpL = this.lpL, lpR = this.lpR;
    let hpL = this.hpL, hpR = this.hpR;
    const Dt = this.Dt, wInc = 0.43 / SR, fInc = 6.3 / SR;
    const wowS = wow * 0.0045 * SR, flS = wow * 0.00035 * SR, drS = wow * 0.002 * SR * this.dr;
    const satN = 1 / sat(drive * 0.5);
    for (let i = 0; i < BL; i++) {
      D += (Dt - D) * kD;
      wph += wInc; if (wph >= 1) wph -= 1;
      fph += fInc; if (fph >= 1) fph -= 1;
      const mod = sinp(wph) * wowS + sinp(fph) * flS + drS;
      const dl = D + mod, dr = D * (1 + 0.012 * wd) + mod * 0.9;
      const rl = herm(bL, m, w - dl + N), rr = herm(bR, m, w - dr + N);
      // Tonblende, Bass weg, weich sättigen
      lpL += tone * (rl - lpL); lpR += tone * (rr - lpR);
      hpL += hpk * (lpL - hpL); hpR += hpk * (lpR - hpR);
      const fl = sat((lpL - hpL) * drive * 0.5) * satN, fr = sat((lpR - hpR) * drive * 0.5) * satN;
      const nl = hiss > 0 ? rndb() * hiss : 0, nr = hiss > 0 ? rndb() * hiss : 0;
      bL[w] = inL[i] + fbk * (fl * (1 - pp) + fr * pp) + nl;
      bR[w] = inR[i] + fbk * (fr * (1 - pp) + fl * pp) + nr;
      w = (w + 1) & m;
      L[i] = inL[i] * (1 - mix) + rl * mix;
      R[i] = inR[i] * (1 - mix) + rr * mix;
    }
    this.w = w; this.D = D; this.wph = wph; this.fph = fph; this.lpL = lpL; this.lpR = lpR; this.hpL = hpL; this.hpR = hpR;
    this.reel += BL / Math.max(1, D) * 0.5; if (this.reel > 1) this.reel -= Math.floor(this.reel);
    if (!(Math.abs(lpL) + Math.abs(lpR) < 1e4)) this.silence();
  }
  disp() { const d = this.dv; d[0] = this.reel; d[1] = this.D / SR; d[2] = this.v[1]; this.nd = 3; }
}

/* ---------- Kathedrale: Hallraum (Dattorro) mit Schimmer und Ewigkeit ---------- */

const KA_P = ['raum', 'daempfung', 'schimmer', 'vordelay', 'mischung', 'ewigkeit', 'groesse', 'modulation', 'breite'];

class Kathedrale extends Mod {
  constructor(E, id, spec) {
    super(E, id, KA_P, spec, 1, 1, 0);
    const K = SR / 29761 * 1.65;
    const mk = (n) => { const N = pow2(Math.ceil(n * K) + 64); return { b: new Float32Array(N), m: N - 1 }; };
    this.pre = (() => { const N = pow2(SR * 0.32); return { b: new Float32Array(N), m: N - 1 }; })();
    this.ap = [mk(142), mk(107), mk(379), mk(277)];
    this.mlA = mk(672 + 40); this.d1A = mk(4453); this.ap2A = mk(1800); this.d2A = mk(3720);
    this.mlB = mk(908 + 40); this.d1B = mk(4217); this.ap2B = mk(2656); this.d2B = mk(3163);
    this.w = 0; this.pw = 0;
    this.lastA = 0; this.lastB = 0; this.dmA = 0; this.dmB = 0; this.bw = 0;
    this.lph = 0; this.fz = 0; this.shim = new Shifter(SR * 0.2); this.shOut = 0; this.shHp = 0; this.shLp = 0;
    this.size = -1; this.lvl = 0;
    this.n = new Int32Array(16);
  }
  setSize(s) {
    const k = SR / 29761 * s, n = this.n;
    const L = [142, 107, 379, 277, 672, 4453, 1800, 3720, 908, 4217, 2656, 3163];
    for (let i = 0; i < 12; i++) n[i] = Math.max(2, Math.round(L[i] * k));
    this.k = k; this.size = s;
    // Ausgangsabgriffe (Dattorro, Tabelle 2)
    this.tp = new Int32Array([266, 2974, 1913, 1996, 1990, 187, 1066, 353, 3627, 1228, 2673, 2111, 335, 121].map((t) => Math.max(1, Math.round(t * k))));
  }
  silence() {
    for (const a of [this.pre, ...this.ap, this.mlA, this.d1A, this.ap2A, this.d2A, this.mlB, this.d1B, this.ap2B, this.d2B]) a.b.fill(0);
    this.lastA = this.lastB = this.dmA = this.dmB = this.bw = 0; this.shim.clear(); this.shOut = 0;
  }
  process() {
    this.upd();
    const P = this.v;
    if (Math.abs(P[6] - this.size) > 0.004) this.setSize(P[6]);
    const fzT = P[5] >= 0.5 ? 1 : 0;
    const decay0 = 0.25 + P[0] * 0.735, damp0 = P[1] * 0.85, shim0 = P[2] * 0.5;
    const preD = Math.max(1, Math.round(P[3] * SR)), mix = P[4], modD = P[7] * 14 * this.k, wd = P[8];
    const inL = this.ain[0].L, inR = this.ain[0].R, o = this.aout[0], L = o.L, R = o.R;
    const n = this.n, tp = this.tp;
    const pre = this.pre, a1 = this.ap[0], a2 = this.ap[1], a3 = this.ap[2], a4 = this.ap[3];
    const mlA = this.mlA, d1A = this.d1A, ap2A = this.ap2A, d2A = this.d2A;
    const mlB = this.mlB, d1B = this.d1B, ap2B = this.ap2B, d2B = this.d2B;
    let w = this.w, pw = this.pw, lastA = this.lastA, lastB = this.lastB, dmA = this.dmA, dmB = this.dmB, bw = this.bw;
    let lph = this.lph, fz = this.fz, shOut = this.shOut, shHp = this.shHp, shLp = this.shLp;
    const lInc = 0.83 / SR, kfz = 1 / (0.06 * SR);
    const shW = 0.07 * SR, shHk = 1 - Math.exp(-TAU * 280 / SR), shLk = 1 - Math.exp(-TAU * 7000 / SR);
    let pk = 0;
    for (let i = 0; i < BL; i++) {
      fz += (fzT - fz) * kfz;
      const decay = decay0 + (1 - decay0) * fz, damp = damp0 * (1 - fz), gin = 1 - fz, shim = shim0 * (1 - fz);
      const x = (inL[i] + inR[i]) * 0.5;
      pre.b[pw & pre.m] = x;
      const xp = pre.b[(pw - preD) & pre.m];
      pw++;
      bw += 0.75 * (xp - bw);
      let u = bw * gin;
      let d, v;
      d = a1.b[(w - n[0]) & a1.m]; v = u - 0.75 * d; a1.b[w & a1.m] = v; u = d + 0.75 * v;
      d = a2.b[(w - n[1]) & a2.m]; v = u - 0.75 * d; a2.b[w & a2.m] = v; u = d + 0.75 * v;
      d = a3.b[(w - n[2]) & a3.m]; v = u - 0.625 * d; a3.b[w & a3.m] = v; u = d + 0.625 * v;
      d = a4.b[(w - n[3]) & a4.m]; v = u - 0.625 * d; a4.b[w & a4.m] = v; u = d + 0.625 * v;
      u += shOut * shim;
      lph += lInc; if (lph >= 1) lph -= 1;
      const mA = sinp(lph) * modD;
      let lp2 = lph + 0.37; if (lp2 >= 1) lp2 -= 1;
      const mB = sinp(lp2) * modD;
      // linke Hälfte
      let t = u + decay * lastB;
      let pos = w - n[4] - 20 - mA + 65536, ii = pos | 0, f = pos - ii;
      d = mlA.b[ii & mlA.m] + (mlA.b[(ii + 1) & mlA.m] - mlA.b[ii & mlA.m]) * f;
      v = t + 0.7 * d; mlA.b[w & mlA.m] = v; t = d - 0.7 * v;
      d1A.b[w & d1A.m] = t; t = d1A.b[(w - n[5]) & d1A.m];
      dmA = t * (1 - damp) + dmA * damp; t = dmA * decay;
      d = ap2A.b[(w - n[6]) & ap2A.m]; v = t - 0.5 * d; ap2A.b[w & ap2A.m] = v; t = d + 0.5 * v;
      d2A.b[w & d2A.m] = t; const outA = d2A.b[(w - n[7]) & d2A.m];
      // rechte Hälfte
      t = u + decay * lastA;
      pos = w - n[8] - 20 - mB + 65536; ii = pos | 0; f = pos - ii;
      d = mlB.b[ii & mlB.m] + (mlB.b[(ii + 1) & mlB.m] - mlB.b[ii & mlB.m]) * f;
      v = t + 0.7 * d; mlB.b[w & mlB.m] = v; t = d - 0.7 * v;
      d1B.b[w & d1B.m] = t; t = d1B.b[(w - n[9]) & d1B.m];
      dmB = t * (1 - damp) + dmB * damp; t = dmB * decay;
      d = ap2B.b[(w - n[10]) & ap2B.m]; v = t - 0.5 * d; ap2B.b[w & ap2B.m] = v; t = d + 0.5 * v;
      d2B.b[w & d2B.m] = t; const outB = d2B.b[(w - n[11]) & d2B.m];
      lastA = outA; lastB = outB;
      // Abgriffe
      let yl = d1B.b[(w - tp[0]) & d1B.m] + d1B.b[(w - tp[1]) & d1B.m] - ap2B.b[(w - tp[2]) & ap2B.m] + d2B.b[(w - tp[3]) & d2B.m]
        - d1A.b[(w - tp[4]) & d1A.m] - ap2A.b[(w - tp[5]) & ap2A.m] - d2A.b[(w - tp[6]) & d2A.m];
      let yr = d1A.b[(w - tp[7]) & d1A.m] + d1A.b[(w - tp[8]) & d1A.m] - ap2A.b[(w - tp[9]) & ap2A.m] + d2A.b[(w - tp[10]) & d2A.m]
        - d1B.b[(w - tp[11]) & d1B.m] - ap2B.b[(w - tp[12]) & ap2B.m] - d2B.b[(w - tp[13]) & d2B.m];
      yl *= 0.6; yr *= 0.6;
      // Schimmer: Oktave höher zurück in den Raum
      if (shim0 > 0.001) {
        const sh = this.shim.run((yl + yr) * 0.5, 2, shW);
        shLp += shLk * (sh - shLp); shHp += shHk * (shLp - shHp);
        shOut = shLp - shHp;
      } else shOut = 0;
      const mid = (yl + yr) * 0.5, side = (yl - yr) * 0.5 * wd;
      yl = mid + side; yr = mid - side;
      const ay = yl < 0 ? -yl : yl; if (ay > pk) pk = ay;
      L[i] = inL[i] * (1 - mix) + yl * mix;
      R[i] = inR[i] * (1 - mix) + yr * mix;
      w = (w + 1) & 0x3fffffff;
    }
    this.w = w; this.pw = pw & 0x3fffffff; this.lastA = lastA; this.lastB = lastB; this.dmA = dmA; this.dmB = dmB; this.bw = bw;
    this.lph = lph; this.fz = fz; this.shOut = shOut; this.shHp = shHp; this.shLp = shLp;
    this.lvl = Math.max(pk, this.lvl * 0.9);
    if (!(Math.abs(lastA) + Math.abs(lastB) < 1e4)) this.silence();
  }
  disp() { const d = this.dv; d[0] = Math.min(1, this.lvl * 2); d[1] = this.fz; this.nd = 2; }
}

/* ---------- Nebel: Rauschen, das in der Tonleiter singt ---------- */

const NB_P = ['farbe', 'wind', 'singen', 'lage', 'dichte', 'pegel', 'breite'];

class Nebel extends Mod {
  constructor(E, id, spec) {
    super(E, id, NB_P, spec, 0, 1, 0);
    this.pk = new Float32Array(6); this.br = new Float32Array(2);
    this.bf = new Float32Array(4); this.bfT = new Float32Array(4);
    this.s1 = new Float32Array(4); this.s2 = new Float32Array(4);
    for (let k = 0; k < 4; k++) { this.bf[k] = this.bfT[k] = 300 + 400 * k; }
    this.wph = rnd(); this.lpL = 0; this.lpR = 0;
    this.dc = new Float32Array(2); this.dy1 = new Float32Array(2); this.dy2 = new Float32Array(2); this.dcf = new Float32Array(2);
    this.dr2 = 0; this.A = new Float32Array(4);
    this.lvl = 0;
  }
  silence() { this.s1.fill(0); this.s2.fill(0); this.dy1.fill(0); this.dy2.fill(0); }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    const color = P[0], wind = P[1], sing = P[2], oct = P[3] | 0, dust = P[4], lvl = P[5], wd = P[6];
    // Filterziele wandern; beim Singen rasten sie auf Tönen der Tonleiter ein
    for (let k = 0; k < 4; k++) {
      if (rnd() < BL * wind * 0.35 / SR + 0.0004) {
        const step = Math.floor(rnd() * E.nSt * 2);
        const tone = E.stepHz(oct, step) * (k & 1 ? 2 : 1);
        const free = 180 * Math.pow(2, rnd() * 5);
        this.bfT[k] = tone + (free - tone) * (1 - sing);
      }
      this.bf[k] += (this.bfT[k] - this.bf[k]) * (0.004 + wind * 0.01);
    }
    // der Bandpass-Ausgang wird mit der Güte lauter (bei farbigem Rauschen etwa Q^0,18): ausgleichen
    const q = 1.2 + sing * sing * 60, kk = 1 / q, comp = 0.353 * Math.pow(q, -0.18);
    const A = this.A;
    for (let k = 0; k < 4; k++) A[k] = Math.tan(Math.PI * Math.min(this.bf[k], SR * 0.4) / SR);
    this.wph += wind * BL / SR; if (this.wph >= 1) this.wph -= Math.floor(this.wph);
    const sweep = 0.5 + 0.5 * sinp(this.wph);
    const lpk = 1 - Math.exp(-TAU * (300 + 5000 * sweep * sweep) / SR);
    const wW = color < 0.5 ? 1 - color * 2 : 0, wP = color < 0.5 ? color * 2 : 2 - color * 2, wB = color > 0.5 ? color * 2 - 1 : 0;
    const pk = this.pk, br = this.br, s1 = this.s1, s2 = this.s2;
    const o = this.aout[0], L = o.L, R = o.R;
    const dustP = dust * dust * 40 / SR;
    let lpL = this.lpL, lpR = this.lpR;
    for (let i = 0; i < BL; i++) {
      let out0 = 0, out1 = 0;
      for (let c = 0; c < 2; c++) {
        const wn = rndb();
        const j = c * 3;
        pk[j] = 0.99765 * pk[j] + wn * 0.099046; pk[j + 1] = 0.963 * pk[j + 1] + wn * 0.2965164; pk[j + 2] = 0.57 * pk[j + 2] + wn * 1.0526913;
        const pink = (pk[j] + pk[j + 1] + pk[j + 2] + wn * 0.1848) * 0.2;
        br[c] = (br[c] + 0.02 * wn) / 1.02;
        const col = wn * wW * 0.5 + pink * wP + br[c] * 3.2 * wB;
        // zwei Bandpässe je Kanal
        let sum = 0;
        for (let b = c; b < 4; b += 2) {
          const g = A[b], a1 = 1 / (1 + g * (g + kk)), a2 = g * a1, a3 = g * a2;
          const v3 = col - s2[b], v1 = a1 * s1[b] + a2 * v3, v2 = s2[b] + a2 * s1[b] + a3 * v3;
          s1[b] = 2 * v1 - s1[b]; s2[b] = 2 * v2 - s2[b];
          sum += v1;
        }
        const broad = col;
        if (c === 0) { lpL += lpk * (broad - lpL); out0 = lpL * (1 - sing) + sum * comp * sing; }
        else { lpR += lpk * (broad - lpR); out1 = lpR * (1 - sing) + sum * comp * sing; }
      }
      // Staub: kurze gestimmte Funken
      if (dustP > 0 && rnd() < dustP) {
        const c = rnd() < 0.5 ? 0 : 1;
        const hz = E.stepHz(oct + 1, Math.floor(rnd() * E.nSt * 2));
        const wv = TAU * Math.min(hz, SR * 0.4) / SR, r = Math.exp(-6.91 / (0.08 * SR));
        this.dcf[c] = 2 * r * Math.cos(wv); this.dr2 = r * r; this.dc[c] = 0.25 * Math.sin(wv) * (0.4 + rnd());
      }
      for (let c = 0; c < 2; c++) {
        const y = this.dcf[c] * this.dy1[c] - this.dr2 * this.dy2[c] + this.dc[c];
        this.dc[c] = 0; this.dy2[c] = this.dy1[c]; this.dy1[c] = y;
        if (c === 0) out0 += y; else out1 += y;
      }
      const mid = (out0 + out1) * 0.5, side = (out0 - out1) * 0.5 * wd;
      L[i] = (mid + side) * lvl * 0.7; R[i] = (mid - side) * lvl * 0.7;
    }
    this.lpL = lpL; this.lpR = lpR;
    if (!(Math.abs(s1[0]) + Math.abs(s2[1]) < 1e5)) this.silence();
  }
  disp() { const d = this.dv; d[0] = this.wph; d[1] = this.v[2]; for (let k = 0; k < 4; k++) d[2 + k] = this.bf[k]; this.nd = 6; }
}

/* ---------- Gezeiten: drei langsame Monde (Modulation) ---------- */

const GZ_P = ['periode', 'tiefe', 'form', 'verhaeltnis'];

class Gezeiten extends Mod {
  constructor(E, id, spec) {
    super(E, id, GZ_P, spec, 0, 0, 3);
    this.ph = new Float32Array([rnd(), rnd(), rnd()]);
    this.ra = new Float32Array(3); this.rb = new Float32Array(3);
    for (let k = 0; k < 3; k++) { this.ra[k] = rndb(); this.rb[k] = rndb(); }
  }
  process() {
    this.upd();
    const P = this.v, base = BL / (SR * P[0]), depth = P[1], form = P[2], ratio = P[3];
    for (let k = 0; k < 3; k++) {
      let ph = this.ph[k] + base * Math.pow(ratio, k);
      if (ph >= 1) { ph -= 1; this.ra[k] = this.rb[k]; this.rb[k] = rndb(); }
      this.ph[k] = ph;
      const s = sinp(ph);
      const t = ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
      const c = 0.5 - 0.5 * Math.cos(Math.PI * ph), rr = this.ra[k] + (this.rb[k] - this.ra[k]) * c;
      let y;
      if (form < 0.5) y = s + (t - s) * form * 2; else y = t + (rr - t) * (form - 0.5) * 2;
      this.mout[k] = y * depth;
    }
  }
  disp() { const d = this.dv; for (let k = 0; k < 3; k++) { d[k] = this.ph[k]; d[3 + k] = this.mout[k]; } this.nd = 6; }
}

/* ---------- Irrlicht: Zufall, weich und gestuft, dazu Funken ---------- */

const IR_P = ['rate', 'glaette', 'funken', 'lage', 'weite'];

class Irrlicht extends Mod {
  constructor(E, id, spec) {
    super(E, id, IR_P, spec, 0, 0, 2);
    this.ph = 0; this.tgt = 0; this.cur = 0; this.step = 0; this.spark = 0;
  }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    this.ph += P[0] * BL / SR;
    if (this.ph >= 1) {
      this.ph -= Math.floor(this.ph);
      this.tgt = rndb(); this.step = this.tgt;
      if (rnd() < P[2]) {
        const st = Math.floor(rnd() * (P[4] | 0));
        E.emit(this, 0, E.stepHz(P[3] | 0, st), 0.35 + rnd() * 0.5, 0.4 + rnd() * 2.5, 0);
        this.spark = 1;
      }
    }
    const tau = 0.01 + P[1] * P[1] * 3 / Math.max(0.05, P[0]);
    this.cur += (this.tgt - this.cur) * (1 - Math.exp(-BL / (tau * SR)));
    this.mout[0] = this.cur; this.mout[1] = this.step;
    this.spark *= 0.9;
  }
  disp() { const d = this.dv; d[0] = this.cur; d[1] = this.step; d[2] = this.spark; d[3] = this.ph; this.nd = 4; }
}

/* ---------- Uhrwerk: drei euklidische Ringe im Takt ---------- */

const UW_P = ['teilung', 'swing', 'lauf'];
for (let r = 1; r <= 3; r++) UW_P.push('r' + r + 's', 'r' + r + 'k', 'r' + r + 'o', 'r' + r + 'd', 'r' + r + 'v', 'r' + r + 'p', 'r' + r + 'h');
const UW_SPB = [1, 2, 4, 3];

class Uhrwerk extends Mod {
  constructor(E, id, spec) {
    super(E, id, UW_P, spec, 0, 0, 0);
    this.lastStep = -1e9; this.pos = new Float32Array(3); this.flash = new Float32Array(3);
  }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    for (let r = 0; r < 3; r++) this.flash[r] *= 0.88;
    if (P[2] < 0.5) { this.lastStep = -1e9; return; }
    const spb = UW_SPB[P[0] | 0], swing = P[1];
    const b0 = E.beat0, b1 = E.beat;
    const sEnd = Math.floor(b1 * spb);
    if (this.lastStep > sEnd + 1) this.lastStep = sEnd - 2;
    for (let s = Math.max(this.lastStep + 1, sEnd - 1); s <= sEnd; s++) {
      const tb = (s + ((s & 1) ? swing * 0.33 : 0)) / spb;
      if (tb < b0 || tb >= b1) { if (tb < b0) this.lastStep = s; continue; }
      this.lastStep = s;
      const off = Math.max(0, Math.min(BL - 1, Math.floor((tb - b0) / E.beatInc)));
      for (let r = 0; r < 3; r++) {
        const o = 3 + r * 7;
        const n = Math.max(1, P[o] | 0), k = Math.min(n, P[o + 1] | 0), rot = P[o + 2] | 0;
        const i = ((s % n) + n) % n;
        this.pos[r] = i / n;
        if (k > 0 && ((i + rot) * k) % n < k && rnd() < P[o + 5]) {
          E.emit(this, r, E.stepHz(P[o + 6] | 0, P[o + 3] | 0), P[o + 4], 0.8 / spb * 60 / E.bpm, off);
          this.flash[r] = 1;
        }
      }
    }
  }
  disp() { const d = this.dv; for (let r = 0; r < 3; r++) { d[r] = this.pos[r]; d[3 + r] = this.flash[r]; } this.nd = 6; }
}

/* ---------- Planeten: Umläufe, die Töne auslösen (Sphärenmusik) ---------- */

const PL_P = ['umlauf', 'planeten', 'streuung', 'lage', 'dauer', 'zufall', 'anschlag', 'lauf'];
const PL_R = [1, 1.1301, 1.3426, 1.5872, 1.7923, 2.0313, 2.4071];
const PL_S = [0, 4, 2, 7, 5, 9, 3];

class Planeten extends Mod {
  constructor(E, id, spec) {
    super(E, id, PL_P, spec, 0, 0, 0);
    this.ph = new Float32Array(7); this.fl = new Float32Array(7);
    // der erste Planet erreicht den Meridian nach wenigen Sekunden, die übrigen verteilt danach
    for (let k = 0; k < 7; k++) this.ph[k] = ((0.93 - k * 0.137) % 1 + 1) % 1;
  }
  process() {
    this.upd();
    const P = this.v, E = this.E;
    const np = P[1] | 0;
    for (let k = 0; k < 7; k++) this.fl[k] *= 0.95;
    if (P[7] < 0.5) return;
    for (let k = 0; k < np; k++) {
      const T = P[0] * (1 + (PL_R[k] - 1) * P[2] * 1.6);
      let ph = this.ph[k] + BL / (SR * T);
      if (ph >= 1) {
        ph -= 1;
        if (rnd() >= P[5] * 0.8) {
          let oct = P[3] | 0;
          if (rnd() < P[5] * 0.35) oct += rnd() < 0.5 ? -1 : 1;
          E.emit(this, 0, E.stepHz(oct, PL_S[k]), P[6] * (0.75 + rnd() * 0.25), P[4] * (0.7 + rnd() * 0.6), 0);
          this.fl[k] = 1;
        }
      }
      this.ph[k] = ph;
    }
  }
  disp() { const d = this.dv; const np = this.v[1] | 0; d[0] = np; for (let k = 0; k < 7; k++) { d[1 + k] = this.ph[k]; d[8 + k] = this.fl[k]; } this.nd = 15; }
}

/* ---------- Lot: die Neigung des iPads als Modulation ---------- */

const LT_P = ['empfindlichkeit', 'glaette'];

class Lot extends Mod {
  constructor(E, id, spec) { super(E, id, LT_P, spec, 0, 0, 2); this.x = 0; this.y = 0; }
  process() {
    this.upd();
    const P = this.v, E = this.E, sens = 0.4 + P[0] * 2.2, k = 1 - Math.exp(-BL / ((0.005 + P[1] * 0.6) * SR));
    const tx = Math.max(-1, Math.min(1, E.tiltX * sens)), ty = Math.max(-1, Math.min(1, E.tiltY * sens));
    this.x += (tx - this.x) * k; this.y += (ty - this.y) * k;
    this.mout[0] = this.x; this.mout[1] = this.y;
  }
  disp() { const d = this.dv; d[0] = this.x; d[1] = this.y; this.nd = 2; }
}

/* ---------- Altar: Summe, Wärme, Breite und Pegelwächter ---------- */

const AL_P = ['pegel', 'breite', 'waerme', 'grenze'];

class Altar extends Mod {
  constructor(E, id, spec) {
    super(E, id, AL_P, spec, 1, 0, 1);
    this.oL = new Float32Array(BL); this.oR = new Float32Array(BL);
    this.g = 0; this.lpL = 0; this.lpR = 0; this.dyL = 0; this.dyR = 0; this.dxL = 0; this.dxR = 0;
    this.env = 0; this.gr = 1; this.pkL = 0; this.pkR = 0; this.grMin = 1; this.puls = 0; this.bad = 0;
    this.kLp = 1 - Math.exp(-TAU * 650 / SR); this.rel = Math.exp(-1 / (0.22 * SR)); this.dcC = 1 - TAU * 10 / SR;
  }
  silence() { this.lpL = this.lpR = this.dyL = this.dyR = this.dxL = this.dxR = 0; this.env = 0; this.gr = 1; }
  process() {
    this.upd();
    const P = this.v, gain = P[0], wS = P[1] * 0.5, tilt = P[2], thr = Math.pow(10, P[3] / 20);
    const gLo = Math.pow(10, -tilt * 4.5 / 20), gHi = Math.pow(10, tilt * 4.5 / 20);
    const inL = this.ain[0].L, inR = this.ain[0].R, oL = this.oL, oR = this.oR;
    const kLp = this.kLp, rel = this.rel, dcC = this.dcC;
    let g = this.g, lpL = this.lpL, lpR = this.lpR, dyL = this.dyL, dyR = this.dyR, dxL = this.dxL, dxR = this.dxR;
    let env = this.env, gr = this.gr, pkL = 0, pkR = 0, grMin = 1, sum = 0;
    const gs = (gain - g) / BL, grRel = 1 - Math.exp(-1 / (0.18 * SR));
    for (let i = 0; i < BL; i++) {
      g += gs;
      let l = inL[i], r = inR[i];
      let y = l - dxL + dcC * dyL; dxL = l; dyL = y; l = y;
      y = r - dxR + dcC * dyR; dxR = r; dyR = y; r = y;
      lpL += kLp * (l - lpL); lpR += kLp * (r - lpR);
      l = lpL * gLo + (l - lpL) * gHi; r = lpR * gLo + (r - lpR) * gHi;
      const m = (l + r) * 0.5, s = (l - r) * wS;
      l = (m + s) * g; r = (m - s) * g;
      const a = Math.max(l < 0 ? -l : l, r < 0 ? -r : r);
      env = a > env ? a : env * rel;
      const tg = env > thr ? thr / env : 1;
      gr = tg < gr ? tg : gr + (tg - gr) * grRel;
      if (gr < grMin) grMin = gr;
      l *= gr; r *= gr;
      // weiche Kante oberhalb von 0,9
      if (l > 0.9) l = 0.9 + 0.1 * sat((l - 0.9) * 10); else if (l < -0.9) l = -0.9 + 0.1 * sat((l + 0.9) * 10);
      if (r > 0.9) r = 0.9 + 0.1 * sat((r - 0.9) * 10); else if (r < -0.9) r = -0.9 + 0.1 * sat((r + 0.9) * 10);
      oL[i] = l; oR[i] = r; sum += l + r;
      const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
      if (al > pkL) pkL = al; if (ar > pkR) pkR = ar;
    }
    if (!Number.isFinite(sum)) {
      oL.fill(0); oR.fill(0); this.bad++;
      this.E.reset();
      g = 0; lpL = lpR = dyL = dyR = dxL = dxR = 0; env = 0; gr = 1;
    }
    this.g = g; this.lpL = lpL; this.lpR = lpR; this.dyL = dyL; this.dyR = dyR; this.dxL = dxL; this.dxR = dxR;
    this.env = env; this.gr = gr;
    this.pkL = Math.max(pkL, this.pkL * 0.93); this.pkR = Math.max(pkR, this.pkR * 0.93);
    this.grMin = Math.min(this.grMin, grMin);
    const pl = Math.max(pkL, pkR);
    this.puls += (pl - this.puls) * (pl > this.puls ? 0.4 : 0.03);
    this.mout[0] = Math.min(1, this.puls * 1.4);
  }
  disp() { const d = this.dv; d[0] = this.pkL; d[1] = this.pkR; d[2] = this.grMin; this.grMin = 1; this.nd = 3; }
}

const TYPES = {
  stimmen: Stimmen, schlagwerk: Schlagwerk, atem: Atem, spiegel: Spiegel, resonator: Resonator,
  bandschleife: Bandschleife, kathedrale: Kathedrale, nebel: Nebel, gezeiten: Gezeiten, irrlicht: Irrlicht,
  uhrwerk: Uhrwerk, planeten: Planeten, lot: Lot, altar: Altar,
};
const GENERATORS = new Set(['uhrwerk', 'planeten', 'gezeiten', 'irrlicht', 'lot']);
const QUALITY = [{ voices: 8, grains: 4, layers: 4 }, { voices: 12, grains: 6, layers: 6 }, { voices: 16, grains: 8, layers: 8 }];

/* ---------- Die Maschine ---------- */

class Engine extends AudioWorkletProcessor {
  constructor() {
    super();
    this.mods = []; this.byId = new Map(); this.order = [];
    this.acab = []; this.mcab = []; this.tcab = [];
    this.altar = null; this.atem = null;
    this.micBuf = new Float32Array(BL); this.micOn = false; this.hold = false;
    this.bpm = 90; this.beat = 0; this.beat0 = 0; this.beatInc = 90 / 60 / SR;
    this.root0 = 16.3516; this.cents = new Float64Array([0, 200, 400, 500, 700, 900, 1100]); this.nSt = 7;
    this.scaleHz = new Float64Array(0); this.scaleVer = 0; this.padLo = 65.4; this.padOct = 3;
    this.setScale({ root0: this.root0, cents: [0, 200, 300, 500, 700, 900, 1000], lo: 65.4, oct: 3 });
    this.tiltX = 0; this.tiltY = 0;
    this.q = 1; this.maxVoices = 12; this.grains = 6; this.maxLayers = 6;
    this.genId = -1; this.layerId = 1;
    this.visEvery = Math.max(1, Math.round(SR / BL / 30)); this.visCnt = 0;
    this.hits = new Float32Array(96); this.nHits = 0;
    this.trEv = new Float32Array(96); this.nTr = 0;
    this.vbuf = new Float32Array(2048);
    this.rec = { ph: 0, L: null, R: null, i: 0, n: 2048, pool: [], frames: 0, loop: -1, end: 0, tailEnd: 0, click: 0, loopN: 0, totalN: 0 };
    this.clk = { t: 1e9, f: 1000, a: 0 };
    this.lastBeatInt = 0;
    this.err = 0;
    this.port.onmessage = (e) => { try { this.onMsg(e.data); } catch (err) { this.port.postMessage({ t: 'err', msg: String(err && err.message || err) }); } };
    this.port.postMessage({ t: 'ready', sr: SR });
  }

  /* --- Tonleiter --- */
  setScale(m) {
    this.root0 = m.root0; this.cents = Float64Array.from(m.cents); this.nSt = this.cents.length;
    if (m.lo) this.padLo = m.lo; if (m.oct) this.padOct = m.oct;
    const list = [];
    for (let o = 0; o < 11; o++) for (let i = 0; i < this.nSt; i++) {
      const f = this.root0 * Math.pow(2, o + this.cents[i] / 1200);
      if (f >= 15 && f <= 17000) list.push(f);
    }
    list.sort((a, b) => a - b);
    this.scaleHz = Float64Array.from(list); this.scaleVer++;
  }
  stepHz(oct, step) {
    const n = this.nSt, o = Math.floor(step / n), i = step - o * n;
    return this.root0 * Math.pow(2, oct + o + this.cents[i] / 1200);
  }
  stepRatio(step) { const n = this.nSt, o = Math.floor(step / n), i = step - o * n; return Math.pow(2, o + this.cents[i] / 1200); }
  nearestIdx(hz) {
    const a = this.scaleHz; let lo = 0, hi = a.length - 1;
    if (hi < 0) return 0;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (a[mid] < hz) lo = mid; else hi = mid; }
    return Math.abs(Math.log(hz / a[lo])) <= Math.abs(Math.log(a[hi] / hz)) ? lo : hi;
  }
  nearestHz(hz) { return this.scaleHz.length ? this.scaleHz[this.nearestIdx(hz)] : hz; }

  /* --- Organe und Kabel --- */
  addMod(m) {
    if (this.byId.has(m.id)) this.delMod(m.id);
    const C = TYPES[m.type];
    if (!C) return;
    const mod = new C(this, m.id, m.p);
    mod.type = m.type;
    this.mods.push(mod); this.byId.set(m.id, mod);
    if (m.type === 'altar') this.altar = mod;
    if (m.type === 'atem') this.atem = mod;
    this.reorder();
  }
  delMod(id) {
    const mod = this.byId.get(id);
    if (!mod) return;
    this.byId.delete(id); this.mods = this.mods.filter((x) => x !== mod);
    if (this.altar === mod) this.altar = null;
    if (this.atem === mod) this.atem = null;
    this.acab = this.acab.filter((c) => c.src !== mod && c.dst !== mod);
    this.mcab = this.mcab.filter((c) => c.src !== mod && c.dst !== mod);
    this.tcab = this.tcab.filter((c) => c.src !== mod && c.dst !== mod);
    this.reorder();
  }
  setPatch(m) {
    const get = (id) => this.byId.get(id);
    this.acab = []; this.mcab = []; this.tcab = [];
    for (const c of m.a || []) {
      const s = get(c[0]), d = get(c[2]);
      if (s && d && s.aout[c[1]] && d.ain[c[3]]) this.acab.push({ src: s, sp: c[1], dst: d, dp: c[3] });
    }
    for (const c of m.m || []) {
      const s = get(c[0]), d = get(c[2]);
      if (!s || !d) continue;
      const pi = d.P.indexOf(c[3]);
      if (pi >= 0 && c[1] < s.mout.length) this.mcab.push({ src: s, sp: c[1], dst: d, pi, depth: c[4] });
    }
    for (const c of m.tr || []) {
      const s = get(c[0]), d = get(c[2]);
      if (s && d) this.tcab.push({ src: s, sp: c[1], dst: d, dp: c[3] });
    }
    this.reorder();
  }
  reorder() {
    const mods = this.mods, deg = new Map(), out = new Map();
    for (const m of mods) { deg.set(m, 0); out.set(m, []); m.inCab = []; m.used = m === this.altar || m.type === 'atem' || GENERATORS.has(m.type); }
    const edge = (s, d) => { if (s !== d) { out.get(s).push(d); deg.set(d, deg.get(d) + 1); } };
    for (const c of this.acab) { edge(c.src, c.dst); c.dst.inCab.push(c); c.src.used = true; }
    for (const c of this.tcab) { edge(c.src, c.dst); c.src.used = true; }
    for (const c of this.mcab) { edge(c.src, c.dst); c.src.used = true; }
    const order = [], done = new Set();
    let rest = mods.filter((m) => m !== this.altar);
    while (rest.length) {
      let pick = rest.find((m) => deg.get(m) === 0);
      if (!pick) pick = rest.reduce((a, b) => (deg.get(a) <= deg.get(b) ? a : b));
      order.push(pick); done.add(pick);
      for (const d of out.get(pick)) deg.set(d, deg.get(d) - 1);
      rest = rest.filter((m) => m !== pick);
    }
    if (this.altar) order.push(this.altar);
    this.order = order;
  }
  emit(src, port, hz, vel, dur, off) {
    const tc = this.tcab;
    let hit = false;
    for (let i = 0; i < tc.length; i++) { const c = tc[i]; if (c.src === src && c.sp === port) { c.dst.trig(c.dp, hz, vel, dur, off); hit = true; } }
    if (this.nTr < 46) { this.trEv[this.nTr * 2] = src.id; this.trEv[this.nTr * 2 + 1] = port; this.nTr++; }
    return hit;
  }
  noteHit(hz, vel, mat) {
    if (this.nHits < 30) { const k = this.nHits * 3; this.hits[k] = hz; this.hits[k + 1] = vel; this.hits[k + 2] = mat; this.nHits++; }
  }

  /* --- Spieltöne vom Pad --- */
  noteOn(n, hz, y, vel) {
    const ms = this.mods;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (m.type === 'stimmen') m.padOn(n, hz, y, vel);
      else if (m.type === 'schlagwerk') m.layerStrike(hz, vel, y);
    }
  }
  noteMove(n, hz, y) { const ms = this.mods; for (let i = 0; i < ms.length; i++) if (ms[i].type === 'stimmen') ms[i].padMove(n, hz, y); }
  noteOff(n) { const ms = this.mods; for (let i = 0; i < ms.length; i++) if (ms[i].type === 'stimmen') ms[i].padOff(n); }

  setHold(on) {
    const was = this.hold; this.hold = !!on;
    if (this.atem) {
      if (this.hold && !was && this.micOn && this.atem.v[10] >= 0.5) this.atem.grab(false);
      if (!this.hold && was) this.atem.releaseAll();
    }
  }
  reset() { for (const m of this.mods) m.silence(); }

  setQuality(q) {
    this.q = Math.max(0, Math.min(2, q | 0));
    const Q = QUALITY[this.q]; this.maxVoices = Q.voices; this.grains = Q.grains; this.maxLayers = Q.layers;
  }

  onMsg(m) {
    switch (m.t) {
      case 'mod+': this.addMod(m); break;
      case 'mod-': this.delMod(m.id); break;
      case 'p': { const md = this.byId.get(m.id); if (md) md.setP(m.k, m.v); break; }
      case 'patch': this.setPatch(m); break;
      case 'scale': this.setScale(m); break;
      case 'tempo': this.bpm = Math.max(20, Math.min(300, m.bpm)); break;
      case 'on': this.noteOn(m.n, m.hz, m.y, m.v); break;
      case 'mv': this.noteMove(m.n, m.hz, m.y); break;
      case 'off': this.noteOff(m.n); break;
      case 'hold': this.setHold(m.on); break;
      case 'mic': this.micOn = !!m.on; if (!this.micOn) this.micBuf.fill(0); break;
      case 'cap': if (this.atem && !this.atem.grab(true)) this.port.postMessage({ t: 'note', k: 'nichts' }); break;
      case 'lyr': {
        if (!this.atem) break;
        if (m.op === 'all') { this.atem.releaseAll(); break; }
        const l = this.atem.layer(m.id);
        if (!l) break;
        if (m.op === 'off') l.rel = true;
        else if (m.op === 'mv') { if (m.ratio > 0) l.tRate = m.ratio; if (m.vol >= 0) l.tVol = m.vol; }
        break;
      }
      case 'allOff': for (const md of this.mods) if (md.type === 'stimmen') md.allOff(); break;
      case 'tilt': this.tiltX = m.x; this.tiltY = m.y; break;
      case 'quality': this.setQuality(m.q); break;
      case 'panic': this.reset(); if (this.atem) this.atem.silence(); break;
      case 'rec': this.recMsg(m); break;
      case 'back': if (this.rec.pool.length < 12 && m.l && m.l.length === this.rec.n) this.rec.pool.push([m.l, m.r]); break;
      case 'click': this.rec.click = m.mode | 0; break;
      case 'trig': { const md = this.byId.get(m.id); if (md) md.trig(m.port | 0, m.hz, m.vel, m.dur || 1, 0); break; }
    }
  }

  /* --- Aufnahme direkt vom Altar --- */
  recMsg(m) {
    const r = this.rec;
    if (m.op === 'arm') {
      r.end = m.bars * 4; r.tailEnd = r.end + (m.tail || 0); r.loop = -1; r.frames = 0;
      const spb = 60 / this.bpm * SR;
      r.loopN = Math.round(r.end * spb); r.totalN = Math.round(r.tailEnd * spb);
      this.beat = -(m.countIn | 0) * 4; this.beat0 = this.beat; this.lastBeatInt = Math.floor(this.beat) - 1;
      if ((m.countIn | 0) > 0) r.ph = 1; else { r.ph = 2; this.recStartChunk(); }
      if (m.click != null) r.click = m.click;
    } else if (m.op === 'free') {
      r.end = Infinity; r.tailEnd = Infinity; r.loopN = Infinity; r.totalN = Infinity; r.loop = -1; r.frames = 0; r.ph = 2; this.recStartChunk();
    } else if (m.op === 'stop') {
      if (r.ph === 1) { r.ph = 0; this.port.postMessage({ t: 'recDone', cancel: true }); }
      else if (r.ph >= 2) this.recFinish();
    }
  }
  recStartChunk() {
    const r = this.rec;
    const p = r.pool.pop();
    if (p) { r.L = p[0]; r.R = p[1]; } else { r.L = new Float32Array(r.n); r.R = new Float32Array(r.n); }
    r.i = 0;
  }
  recWrite(src, from, to) {
    const r = this.rec, sL = src.oL, sR = src.oR;
    for (let i = from; i < to; i++) {
      r.L[r.i] = sL[i]; r.R[r.i] = sR[i]; r.i++; r.frames++;
      if (r.i >= r.n) { this.port.postMessage({ t: 'rec', l: r.L, r: r.R }, [r.L.buffer, r.R.buffer]); this.recStartChunk(); }
    }
  }
  recFinish() {
    const r = this.rec;
    if (r.i > 0) { const l = r.L.slice(0, r.i), rr = r.R.slice(0, r.i); this.port.postMessage({ t: 'rec', l, r: rr, flush: true }, [l.buffer, rr.buffer]); }
    r.i = 0; r.ph = 0;
    this.port.postMessage({ t: 'recDone', loop: r.loop >= 0 ? r.loop : r.frames, total: r.frames });
  }
  // Start beim Durchgang durch Schlag 0 (samplegenau), danach zählen Samples: Schleife und Nachklang
  // haben so exakt die Länge, die das Tempo vorgibt.
  recBlock() {
    const r = this.rec, a = this.altar;
    if (r.ph === 0 || !a) return;
    let from = 0;
    if (r.ph === 1) {
      if (this.beat < 0) return;
      from = Math.max(0, Math.min(BL - 1, Math.ceil(-this.beat0 / this.beatInc)));
      r.ph = 2; this.recStartChunk();
    }
    while (from < BL && r.ph >= 2) {
      const limit = r.ph === 2 ? r.loopN : r.totalN;
      const to = Math.min(BL, from + (limit - r.frames));
      this.recWrite(a, from, to);
      from = to;
      if (r.frames >= limit) {
        if (r.ph === 2) { r.loop = r.frames; if (r.totalN > r.loopN) r.ph = 3; else this.recFinish(); }
        else this.recFinish();
      }
    }
  }
  // Klick: im Einzähler (1) oder immer (2); er landet nie in der Aufnahme
  clickBlock(oL, oR) {
    const r = this.rec, c = this.clk;
    const want = r.click === 2 || (r.click >= 1 && r.ph === 1);
    const bi = Math.floor(this.beat);
    if (want && bi !== this.lastBeatInt) {
      const off = Math.max(0, Math.min(BL - 1, Math.ceil((bi - this.beat0) / this.beatInc)));
      c.t = -off; c.f = ((bi % 4) + 4) % 4 === 0 ? 1760 : 1320; c.a = 0.32;
    }
    this.lastBeatInt = bi;
    if (c.t < 0.06 * SR) {
      const k = Math.exp(-1 / (0.012 * SR));
      let ph = 0;
      for (let i = 0; i < BL; i++) {
        const t = c.t + i;
        if (t < 0) continue;
        ph = t * c.f / SR; ph -= Math.floor(ph);
        const s = sinp(ph) * c.a * Math.pow(k, t);
        oL[i] += s; oR[i] += s;
      }
      c.t += BL;
    }
  }

  sendVis() {
    const d = this.vbuf, a = this.altar, at = this.atem;
    let k = 0;
    d[k++] = a ? a.pkL : 0; d[k++] = a ? a.pkR : 0; d[k++] = a ? a.grMin : 1;
    d[k++] = this.beat; d[k++] = this.bpm; d[k++] = this.rec.ph; d[k++] = this.rec.frames / SR;
    d[k++] = at ? at.db : -120; d[k++] = at && at.voiced ? at.curHz : 0; d[k++] = at ? at.pt.clar : 0; d[k++] = this.hold ? 1 : 0;
    d[k++] = this.micOn ? 1 : 0;
    // Stimmen (alle Stimmen-Organe)
    const vk = k++; let nv = 0;
    for (const m of this.mods) {
      if (m.type !== 'stimmen') continue;
      for (let i = 0; i < 16; i++) {
        const v = m.vs[i];
        if (!v.act || k > 900) continue;
        d[k++] = v.note; d[k++] = v.hz; d[k++] = v.lvl; d[k++] = v.y; nv++;
      }
    }
    d[vk] = nv;
    // Schläge seit der letzten Meldung
    d[k++] = this.nHits;
    for (let i = 0; i < this.nHits * 3; i++) d[k++] = this.hits[i];
    this.nHits = 0;
    // Atem-Schichten
    const lk = k++; let nl = 0;
    if (at) for (let i = 0; i < 8; i++) { const l = at.layers[i]; if (!l.act) continue; d[k++] = l.id; d[k++] = l.f0 > 0 ? l.f0 * l.rate : 0; d[k++] = l.lvl; d[k++] = l.rate; nl++; }
    d[lk] = nl;
    // Organe: Ausgangspegel und Anzeigedaten
    d[k++] = this.mods.length;
    for (const m of this.mods) {
      d[k++] = m.id; d[k++] = m.aout.length;
      for (let i = 0; i < m.aout.length; i++) d[k++] = m.aout[i].lvl;
      d[k++] = m.mout.length;
      for (let i = 0; i < m.mout.length; i++) d[k++] = m.mout[i];
      m.disp(); d[k++] = m.nd;
      for (let i = 0; i < m.nd; i++) d[k++] = m.dv[i];
      if (k > 1900) break;
    }
    d[k++] = this.nTr;
    for (let i = 0; i < this.nTr * 2; i++) d[k++] = this.trEv[i];
    this.nTr = 0;
    this.port.postMessage({ t: 'vis', d: d.slice(0, k) });
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out.length) return true;
    const oL = out[0], oR = out[1] || out[0];
    try {
      const inp = inputs[0];
      if (this.micOn && inp && inp.length && inp[0].length === BL) this.micBuf.set(inp[0]); else this.micBuf.fill(0);
      this.beatInc = this.bpm / 60 / SR; this.beat0 = this.beat; this.beat += this.beatInc * BL;
      const mods = this.mods;
      for (let i = 0; i < mods.length; i++) mods[i].mods.fill(0);
      const mc = this.mcab;
      for (let i = 0; i < mc.length; i++) { const c = mc[i]; c.dst.mods[c.pi] += c.depth * c.src.mout[c.sp]; }
      const ord = this.order;
      for (let k = 0; k < ord.length; k++) {
        const m = ord[k];
        const ain = m.ain;
        for (let i = 0; i < ain.length; i++) { ain[i].L.fill(0); ain[i].R.fill(0); }
        const cl = m.inCab;
        for (let j = 0; j < cl.length; j++) {
          const c = cl[j], s = c.src.aout[c.sp], b = ain[c.dp], sL = s.L, sR = s.R, bL = b.L, bR = b.R;
          for (let i = 0; i < BL; i++) { bL[i] += sL[i]; bR[i] += sR[i]; }
        }
        const ao = m.aout;
        if (!m.used) { for (let j = 0; j < ao.length; j++) { ao[j].L.fill(0); ao[j].R.fill(0); ao[j].lvl = 0; } continue; }
        m.process();
        for (let j = 0; j < ao.length; j++) {
          const b = ao[j], L = b.L, R = b.R; let pk = 0;
          for (let i = 0; i < BL; i += 4) { const x = L[i] < 0 ? -L[i] : L[i], y = R[i] < 0 ? -R[i] : R[i]; if (x > pk) pk = x; if (y > pk) pk = y; }
          b.lvl = pk > b.lvl ? pk : b.lvl * 0.94;
        }
      }
      const a = this.altar;
      if (a) { oL.set(a.oL); if (oR !== oL) oR.set(a.oR); } else { oL.fill(0); if (oR !== oL) oR.fill(0); }
      this.recBlock();
      this.clickBlock(oL, oR);
      if (++this.visCnt >= this.visEvery) { this.visCnt = 0; this.sendVis(); }
    } catch (err) {
      oL.fill(0); if (oR !== oL) oR.fill(0);
      if (this.err++ < 5) this.port.postMessage({ t: 'err', msg: String(err && err.stack || err) });
    }
    return true;
  }
}

registerProcessor('sphaerenwerk', Engine);
