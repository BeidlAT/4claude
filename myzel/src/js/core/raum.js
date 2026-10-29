/* ---------- Raum: rooms computed, not recorded (owner, 29.10.2026: „wie baust du echte Räume?“ – dev/klang/effektseite.md) ----------
   A room's impulse response for the convolver, made from its geometry: a box of W × D × H metres, its six surfaces of a
   material each (absorption per octave, 125 Hz … 8 kHz), the source and a stereo pair of microphones (ORTF: two
   cardioids 17 cm apart, 110° between them) at their places in it.
   – the early part: image sources up to the 3rd order – each reflection when it arrives (343 m/s), from where (the
     cardioids weigh it), how much each wall it met took per octave, what the air took over the way; the higher orders
     a little smeared by the walls' roughness (scattering)
   – the tail: from the mixing time on (≈ √V ms) dense, decaying per octave with the room's own time (Eyring, from its
     volume, its surfaces and the air), its echo density growing in, left and right as alike as the room makes them
   – both in seven octave bands (zero-phase), summed; the tail joins the reflections at their own level.
   genRoom runs in the DSP worker (copied by toString – nothing from outside) and returns [L, R] at sr. */
function genRoom(o, sr) {
  const C = 343, F = [125, 250, 500, 1000, 2000, 4000, 8000], NB = 7;
  const AIR = [0.0004, 0.001, 0.0019, 0.0037, 0.0097, 0.033, 0.118];   // dB per metre (20 °C, 50 %)
  const [W, D, H] = o.dim, sc = o.scat || 0.3;
  const S = [D * H, D * H, W * H, W * H, W * D, W * D], V = W * D * H, ST = 2 * (W * D + W * H + D * H);
  // (a room of its kind: o.T, the reverberation per octave real rooms of that kind have – the surfaces' materials keep
  // their differences, scaled per band so that the room as a whole absorbs what that takes (Eyring backwards))
  let mat = o.mat;
  if (o.T) mat = mat.map((m) => m.slice());
  if (o.T) for (let b = 0; b < NB; b++) {
    const m4 = 4 * (AIR[b] / 4.343) * V, want = 1 - Math.exp(-Math.max(1e-4, 0.161 * V / o.T[b] - m4) / ST);
    let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b];
    const k = want / Math.max(1e-6, a / ST); for (let s = 0; s < 6; s++) mat[s][b] = Math.min(0.95, Math.max(0.002, mat[s][b] * k));
  }
  // Eyring per band, the air's absorption in it (4mV)
  const T = F.map((f, b) => { let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b]; const al = Math.min(0.99, a / ST), m = (AIR[b] / 4.343); return 0.161 * V / (-ST * Math.log(1 - al) + 4 * m * V); });
  const len = Math.min(Math.round((Math.max(...T) * 1.05 + 0.1) * sr), Math.round((o.maxLen || 14) * sr));
  let N = 1; while (N < 2 * len) N <<= 1;
  const bands = [0, 1].map(() => F.map(() => new Float64Array(N)));
  // the pair: ORTF at the listener's place, facing the source (its axes ±55° in the horizontal)
  const [sx, sy, sz] = o.src, [lx, ly, lz] = o.mic, face = Math.atan2(sy - ly, sx - lx), half = (o.wide != null ? o.wide : 55) * Math.PI / 180, gap = o.gap != null ? o.gap : 0.17;
  const mics = [1, -1].map((side) => { const ax = face + side * half, px = lx - Math.sin(face) * gap / 2 * side, py = ly + Math.cos(face) * gap / 2 * side; return { x: px, y: py, z: lz, ux: Math.cos(ax), uy: Math.sin(ax) }; });
  let seed = (o.seed || 1) >>> 0; const R = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const ORD = o.order || 3, d0 = Math.hypot(sx - lx, sy - ly, sz - lz);
  // image sources: the room mirrored nx, ny, nz times; the walls met on the way (x low/high, y low/high, z low/high)
  for (let nx = -ORD; nx <= ORD; nx++) for (let ny = -ORD; ny <= ORD; ny++) for (let nz = -ORD; nz <= ORD; nz++) {
    const ord = Math.abs(nx) + Math.abs(ny) + Math.abs(nz); if (ord > ORD) continue;
    const im = [nx & 1 ? nx * W + (W - sx) : nx * W + sx, ny & 1 ? ny * D + (D - sy) : ny * D + sy, nz & 1 ? nz * H + (H - sz) : nz * H + sz];
    // the walls met: |n| crossings in each axis, half on each side of it
    const hits = [[Math.floor(Math.abs(nx) / 2) + (nx < 0 ? Math.abs(nx) % 2 : 0), Math.floor(Math.abs(nx) / 2) + (nx > 0 ? Math.abs(nx) % 2 : 0)], [Math.floor(Math.abs(ny) / 2) + (ny < 0 ? Math.abs(ny) % 2 : 0), Math.floor(Math.abs(ny) / 2) + (ny > 0 ? Math.abs(ny) % 2 : 0)], [Math.floor(Math.abs(nz) / 2) + (nz < 0 ? Math.abs(nz) % 2 : 0), Math.floor(Math.abs(nz) / 2) + (nz > 0 ? Math.abs(nz) % 2 : 0)]];
    const refl = F.map((_, b) => { let g = 1; for (let a = 0; a < 3; a++) for (let s = 0; s < 2; s++) g *= Math.pow(Math.sqrt(1 - mat[2 * a + s][b]), hits[a][s]); return g; });
    for (let c = 0; c < 2; c++) {
      const M = mics[c], dx = im[0] - M.x, dy = im[1] - M.y, dz = im[2] - M.z, d = Math.hypot(dx, dy, dz), t = d / C * sr;
      const cosA = (dx * -M.ux + dy * -M.uy) / d;   // (towards the source: the arrival comes from -direction)
      const card = 0.5 + 0.5 * -cosA, g0 = card * d0 / Math.max(d, 0.1);
      // the specular part, and the scattered share of the higher orders spread over a few ms
      const spec = ord < 2 ? 1 : Math.pow(1 - sc, ord - 1), sm = Math.round((0.0004 + 0.0012 * ord) * sr);
      for (let b = 0; b < NB; b++) {
        const g = g0 * refl[b] * Math.pow(10, -AIR[b] * d / 20), B = bands[c][b], i = Math.floor(t), fr = t - i;
        if (i + 1 >= len) continue;
        B[i] += g * spec * (1 - fr); B[i + 1] += g * spec * fr;
        if (spec < 1) { const k = 6, e = g * Math.sqrt((1 - spec * spec) / k); for (let q = 0; q < k; q++) { const j = i + Math.floor(R() * sm); if (j < len) B[j] += e * (R() < 0.5 ? -1 : 1); } }
      }
    }
  }
  // the tail: from the mixing time, per band its decay. Its level from the diffuse field: the reverberant energy against
  // the direct sound's is 16π·r²/A (A the room's absorption area in that band; a cardioid takes a third of a diffuse
  // field) – what the reflections already brought of it is taken off
  const tMix = Math.min(0.5, Math.max(0.02, Math.sqrt(V) / 1000)), iMix = Math.round(tMix * sr), coh = o.coh != null ? o.coh : 0.15;
  const iDir = Math.round(d0 / C * sr) + 2;
  for (let b = 0; b < NB; b++) {
    const k = 6.9078 / (T[b] * sr);   // ln(1000): −60 dB over T
    let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b];
    const A = -ST * Math.log(1 - Math.min(0.99, a / ST)) + 4 * (AIR[b] / 4.343) * V, want = 16 * Math.PI * d0 * d0 / (3 * A);
    let eImg = 0; for (let c = 0; c < 2; c++) for (let i = iDir; i < len; i++) eImg += bands[c][b][i] * bands[c][b][i];
    eImg /= 2;
    let eEnv = 0; for (let i = Math.floor(iMix * 0.4); i < len; i++) { const gr = i < iMix ? Math.pow((i - iMix * 0.4) / (iMix * 0.6), 2) : 1; eEnv += gr * gr * Math.exp(-2 * k * (i - iMix)); }
    const amp = Math.sqrt(Math.max(0.25 * want, want - eImg) / Math.max(1e-30, eEnv));
    const sh = Math.sqrt(coh), ind = Math.sqrt(1 - coh);
    for (let i = Math.floor(iMix * 0.4); i < len; i++) {
      const env = amp * Math.exp(-k * (i - iMix)), grow = i < iMix ? Math.pow((i - iMix * 0.4) / (iMix * 0.6), 2) : 1;
      // dense noise: a shared part and one of each side (their correlation the room's)
      const g = (R() + R() + R() - 1.5) * 2, nl = (R() + R() + R() - 1.5) * 2, nr = (R() + R() + R() - 1.5) * 2;
      bands[0][b][i] += env * grow * (sh * g + ind * nl); bands[1][b][i] += env * grow * (sh * g + ind * nr);
    }
  }
  // seven octave bands, zero-phase (each band's own filter on its own impulses), summed
  const fft = (re, im, inv) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bb = n >> 1; for (; j & bb; bb >>= 1) j ^= bb; j ^= bb; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let L = 2; L <= n; L <<= 1) { const a = (inv ? 2 : -2) * Math.PI / L, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += L) { let cr = 1, ci = 0; for (let j = 0; j < L / 2; j++) { const u = i + j, v = u + L / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  const out = [new Float32Array(len), new Float32Array(len)];
  // band shapes that sum to one at every frequency (raised-cosine crossovers on a log axis between the centres)
  const wts = (f, b) => { const x = Math.log2(Math.max(f, 1) / F[b]); if (b === 0 && x < 0) return 1; if (b === NB - 1 && x > 0) return 1; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x); };
  for (let c = 0; c < 2; c++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let b = 0; b < NB; b++) {
      const r2 = new Float64Array(N), i2 = new Float64Array(N); r2.set(bands[c][b]); fft(r2, i2, false);
      for (let k = 0; k <= N / 2; k++) { const w = wts(k * sr / N, b); re[k] += r2[k] * w; im[k] += i2[k] * w; if (k > 0 && k < N / 2) { re[N - k] += r2[N - k] * w; im[N - k] += i2[N - k] * w; } }
      bands[c][b] = null;
    }
    fft(re, im, true);
    for (let i = 0; i < len; i++) out[c][i] = re[i];
  }
  // the direct sound is the convolver's dry path's business: the response starts with it at 1 (the mixer sets dry and wet)
  let pk = 0; for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[c][i]));
  if (o.noDirect) { const i0 = Math.round(d0 / C * sr) + 2; for (let c = 0; c < 2; c++) for (let i = 0; i < Math.min(len, i0); i++) out[c][i] = 0; }
  if (pk > 0) for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) out[c][i] /= pk;
  return { L: out[0], R: out[1], T };
}
/* ---------- Besondere Räume: designed, not measured (owner, 29.10.2026: „special Hallräume … gerne ganz ausgefallene
   Sachen – Myzel soll sehr vielfältig werden“). Each a response for the convolver, made in the worker like genRoom:
   kind, its options (len: × its length; root: the key's root in Hz for those that ring in tune), sr → { L, R, T }.
   Built from three things: a dense tail decaying per octave (bands, zero-phase), discrete events (pings, chirps, grains,
   echoes) and resonances (decaying sines). Deterministic (its own seeded random). ---------- */
function genSpecial(kind, o, sr) {
  o = o || {};
  const F = [125, 250, 500, 1000, 2000, 4000, 8000], NB = 7, ln = o.len || 1;
  let seed = (o.seed || 7) >>> 0; const R = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const gauss = () => (R() + R() + R() - 1.5) * 2;
  const fft = (re, im, inv) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bb = n >> 1; for (; j & bb; bb >>= 1) j ^= bb; j ^= bb; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let L = 2; L <= n; L <<= 1) { const a = (inv ? 2 : -2) * Math.PI / L, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += L) { let cr = 1, ci = 0; for (let j = 0; j < L / 2; j++) { const u = i + j, v = u + L / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  const wts = (f, b) => { const x = Math.log2(Math.max(f, 1) / F[b]); if (b === 0 && x < 0) return 1; if (b === NB - 1 && x > 0) return 1; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x); };
  // a dense tail into out: per band its T, its envelope shape env(t) (× the decay), left/right alike by coh
  const tail = (out, T, amp, env, coh, t0) => {
    const len = out[0].length; let N = 1; while (N < len) N <<= 1;
    for (let c = 0; c < 2; c++) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let b = 0; b < NB; b++) {
        const r2 = new Float64Array(N), i2 = new Float64Array(N), k = 6.9078 / (T[b] * ln * sr), s0 = Math.round((t0 || 0) * sr);
        let sd = (o.seed || 7) * 7919 + b * 104729 + 1; const Rb = () => { sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5; return (sd >>> 0) / 4294967296; };
        let sc = (o.seed || 7) * 31337 + b * 7 + (c + 1) * 65537; const Rc = () => { sc ^= sc << 13; sc ^= sc >>> 17; sc ^= sc << 5; return (sc >>> 0) / 4294967296; };
        const sh = Math.sqrt(coh), ind = Math.sqrt(1 - coh);
        for (let i = s0; i < len; i++) { const t = (i - s0) / sr, g = (Rb() + Rb() + Rb() - 1.5) * 2, n = (Rc() + Rc() + Rc() - 1.5) * 2; r2[i] = amp * env(t) * Math.exp(-k * (i - s0)) * (sh * g + ind * n); }
        fft(r2, i2, false);
        for (let q = 0; q <= N / 2; q++) { const w = wts(q * sr / N, b); re[q] += r2[q] * w; im[q] += i2[q] * w; if (q > 0 && q < N / 2) { re[N - q] += r2[N - q] * w; im[N - q] += i2[N - q] * w; } }
      }
      fft(re, im, true);
      for (let i = 0; i < len; i++) out[c][i] += re[i];
    }
  };
  // a decaying sine (a resonance or a ping) into out: f, its start, amplitude, decay T60, pan –1 … 1, a glide (×/s)
  const ring = (out, f, t0, a, T, pan, glide) => {
    const len = out[0].length, i0 = Math.round(t0 * sr), k = 6.9078 / (T * sr), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), att = Math.max(4, Math.round(sr * 0.002));
    let ph = R() * 2 * Math.PI, fr = f;
    for (let i = i0; i < len; i++) { const j = i - i0, e = a * Math.exp(-k * j) * Math.min(1, j / att); if (e < 1e-6 && j > att) break; fr *= glide ? Math.pow(glide, 1 / sr) : 1; if (fr > 0.45 * sr) break; ph += 2 * Math.PI * fr / sr; const v = e * Math.sin(ph); out[0][i] += v * gl; out[1][i] += v * gr; }
  };
  const mk = (sec) => { const n = Math.max(256, Math.round(sec * sr)); return [new Float32Array(n), new Float32Array(n)]; };
  const one = () => 1;
  let out, T;
  const root = o.root || 220;
  switch (kind) {
    case 'platte': {   // a plate: dense at once, bright, no room in front of it
      T = [2.2, 2.5, 2.7, 2.6, 2.4, 2.1, 1.6]; out = mk(3.2 * ln);
      tail(out, T, 1, (t) => Math.min(1, t / 0.0015), 0.1, 0.001);
      break;
    }
    case 'feder': {   // a spring: chirps going round (the high ones arrive first – dispersion), a soft boing
      T = [2.8, 2.6, 2.2, 1.8, 1.4, 0.9, 0.5]; out = mk(3.4 * ln);
      const per = 0.034;
      for (let r = 0; r < 90; r++) {
        const t0 = 0.012 + r * per * (1 + 0.02 * (R() - 0.5)), a = 0.7 * Math.exp(-r * per * 6.9 / (2.4 * ln));
        if (a < 1e-4) break;
        for (const side of [-0.6, 0.6]) {
          const i0 = Math.round((t0 + (side > 0 ? 0.0011 : 0)) * sr), L = Math.round(0.026 * sr);
          let ph = 0;
          for (let j = 0; j < L && i0 + j < out[0].length; j++) { const x = j / L, f = 4200 * Math.pow(160 / 4200, Math.sqrt(x)); ph += 2 * Math.PI * f / sr; const v = a * Math.sin(ph) * Math.sin(Math.PI * x) * 0.6; out[side < 0 ? 0 : 1][i0 + j] += v; }
        }
      }
      tail(out, T, 0.08, (t) => Math.min(1, t / 0.03), 0.3, 0.01);
      break;
    }
    case 'rueckwaerts': {   // backwards: the hall swells up into the sound and stops
      T = [3, 3, 3, 3, 2.8, 2.4, 2]; const sec = 1.6 * ln; out = mk(sec);
      tail(out, T, 1, one, 0.15, 0);
      for (const c of out) { c.reverse(); const f = Math.round(0.01 * sr); for (let i = 0; i < f; i++) c[c.length - 1 - i] *= i / f; }
      break;
    }
    case 'gatter': {   // gated: dense and level for a quarter second, then gone (the eighties)
      T = [40, 40, 40, 40, 30, 20, 10]; const g = 0.28 * ln; out = mk(g + 0.05);
      tail(out, T, 1, (t) => (t < g ? Math.min(1, t / 0.004) : Math.max(0, 1 - (t - g) / 0.02)), 0.1, 0.002);
      break;
    }
    case 'geflecht': {   // the mycelium: micro-echoes spreading like a network – sparse at first, ever denser, glittering
      T = [3.5, 3.5, 3.8, 4, 3.6, 3, 2.2]; out = mk(5 * ln);
      const dur = 4.5 * ln; let t = 0.004;
      while (t < dur) {
        const rate = 40 + 2600 * Math.min(1, t / (0.6 * ln));   // grains per second: the network grows
        t += -Math.log(1 - R()) / rate;
        const f = 300 * Math.pow(20, R()), L = Math.round((0.002 + 0.018 * R()) * sr), a = 0.5 * Math.exp(-t * 6.9 / (3.8 * ln)) / Math.sqrt(rate / 400), pan = R() * 2 - 1, i0 = Math.round(t * sr);
        let ph = R() * 6.28; const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
        for (let j = 0; j < L && i0 + j < out[0].length; j++) { ph += 2 * Math.PI * f / sr; const v = a * Math.sin(ph) * Math.sin(Math.PI * j / L) ** 2; out[0][i0 + j] += v * gl; out[1][i0 + j] += v * gr; }
      }
      tail(out, T, 0.25, (t) => Math.min(1, t / (0.5 * ln)), 0.1, 0.004);
      break;
    }
    case 'unterwasser': {   // under water: the highs gone at once, the lows ringing on in slow beats
      T = [6, 4.5, 2.6, 1.0, 0.35, 0.15, 0.08]; out = mk(6.5 * ln);
      tail(out, T, 1, (t) => Math.min(1, t / 0.05), 0.4, 0.02);
      for (let k = 0; k < 9; k++) ring(out, 55 * Math.pow(7, R()), 0.02 + 0.08 * R(), 0.05, (2 + 4 * R()) * ln, R() * 2 - 1, 1 + 0.004 * (R() - 0.5));
      break;
    }
    case 'eis': {   // an ice crystal: the lows short, the highs ringing long, sparkling pings
      T = [0.5, 0.6, 0.8, 1.6, 3.2, 5, 6]; out = mk(6.5 * ln);
      tail(out, T, 0.6, (t) => Math.min(1, t / 0.01), 0.05, 0.003);
      for (let k = 0; k < 70; k++) { const t0 = 0.01 + 4.5 * ln * Math.pow(R(), 1.6); ring(out, 2500 * Math.pow(3.5, R()), t0, 0.12 * Math.exp(-t0 / (2.5 * ln)), (0.15 + 0.6 * R()) * ln, R() * 2 - 1, 0); }
      break;
    }
    case 'spiegel': {   // a hall of mirrors: two pairs of parallel walls flutter, metallic, the highs lost bounce by bounce
      T = [3, 3, 3, 2.8, 2.4, 1.8, 1.2]; out = mk(3.4 * ln);
      for (const [p, pan] of [[0.0071, -0.5], [0.0093, 0.5]]) {
        let lp = 1;
        for (let r = 1; r * p < 3.2 * ln; r++) { const t = r * p, a = 0.6 * Math.exp(-t * 6.9 / (2.6 * ln)), i = Math.round(t * sr); lp *= 0.985; for (let j = 0; j < 6; j++) { if (i + j >= out[0].length) break; const v = a * lp * (j === 0 ? 1 : (1 - lp) * Math.exp(-j)); out[pan < 0 ? 0 : 1][i + j] += v; out[pan < 0 ? 1 : 0][i + j] += v * 0.35; } }
      }
      tail(out, T, 0.12, (t) => Math.min(1, t / 0.05), 0.2, 0.005);
      break;
    }
    case 'sterne': {   // stardust: far pings in the dark, sparse and long, a faint wash
      T = [4, 4, 4.5, 5, 5, 4.5, 4]; out = mk(9 * ln);
      tail(out, T, 0.15, (t) => Math.min(1, t / 0.3), 0.05, 0.02);
      for (let k = 0; k < 140; k++) { const t0 = 0.03 + 8 * ln * Math.pow(R(), 1.3); ring(out, 1200 * Math.pow(6, R()), t0, 0.08 * Math.exp(-t0 / (4 * ln)), (0.3 + 1.2 * R()) * ln, R() * 2 - 1, 0); }
      break;
    }
    case 'rohr': {   // a giant pipe, 40 m: the sound runs to its end and back, darker each time, a hollow whoosh
      T = [6, 5.5, 5, 4, 3, 2, 1.2]; out = mk(5.5 * ln);
      const rt = 2 * 40 / 343;
      for (let r = 1; r * rt < 5 * ln; r++) { const t = r * rt, a = 0.5 * Math.exp(-t * 6.9 / (4 * ln)), w = Math.round((0.002 + 0.006 * r) * sr), i = Math.round(t * sr); for (let j = 0; j < w; j++) { if (i + j >= out[0].length) break; const v = a * gauss() * Math.sin(Math.PI * j / w) * Math.sqrt(2 / w) * 6; out[0][i + j] += v; out[1][i + j] += v * (0.7 + 0.3 * gauss()); } }
      tail(out, T, 0.18, (t) => Math.min(1, t / 0.1), 0.6, 0.01);
      for (let n = 1; n <= 12; n++) ring(out, n * 343 / 80, 0.01, 0.04 / n, 3 * ln, 0, 0);
      break;
    }
    case 'unendlich': {   // endless: a hall that hardly ends, soft and a little dark
      T = [30, 30, 28, 24, 18, 12, 8]; out = mk(Math.min(40, 32 * ln));
      tail(out, T, 1, (t) => Math.min(1, t / 0.15), 0.15, 0.01);
      break;
    }
    case 'glocke': {   // a bell's chamber: the room rings in the key (the root's bell partials), over a stone hall
      T = [3.5, 3.5, 3.2, 2.8, 2.2, 1.6, 1.0]; out = mk(9 * ln);
      tail(out, T, 0.7, (t) => Math.min(1, t / 0.01), 0.2, 0.005);
      for (const [r, a, d] of [[0.5, 0.25, 9], [1, 0.3, 7], [1.19, 0.16, 5], [1.5, 0.2, 5], [2, 0.18, 4], [2.5, 0.1, 3], [2.66, 0.09, 3], [3, 0.08, 2.5], [4, 0.05, 2]]) for (const pan of [-0.4, 0.4]) ring(out, root * r * (1 + 0.0007 * pan), 0.008, a * 0.09, d * ln, pan, 0);
      break;
    }
    case 'tropfstein': {   // a dripstone cave: a long damp hall, drops falling into it here and there
      T = [3.2, 3.4, 3.2, 2.6, 1.9, 1.3, 0.8]; out = mk(5 * ln);
      tail(out, T, 1, (t) => Math.min(1, t / 0.02), 0.25, 0.008);
      for (let k = 0; k < 26; k++) { const t0 = 0.3 + 4 * ln * R(); ring(out, 900 * Math.pow(3, R()), t0, 0.05 * Math.exp(-t0 / (3 * ln)), 0.12 + 0.2 * R(), R() * 2 - 1, 1.6); }
      break;
    }
    case 'nebelbank': {   // a fog bank: the hall rises slowly, as if far away, and lingers
      T = [12, 12, 11, 9, 7, 5, 3]; out = mk(14 * ln);
      tail(out, T, 1, (t) => Math.min(1, Math.pow(t / (1.8 * ln), 1.5)), 0.1, 0.02);
      break;
    }
    case 'krypta': {   // church and crypt: a bright room at once, a dark long one below it (two slopes)
      T = [2, 2, 1.8, 1.5, 1.2, 0.9, 0.6]; out = mk(9 * ln);
      tail(out, T, 1, (t) => Math.min(1, t / 0.01), 0.2, 0.004);
      tail(out, [8, 8, 7, 5, 3, 1.6, 0.8], 0.18, (t) => Math.min(1, t / 0.3), 0.3, 0.06);
      break;
    }
    default: { T = [2, 2, 2, 2, 2, 2, 2]; out = mk(2.5); tail(out, T, 1, one, 0.15, 0); }
  }
  let pk = 0; for (const c of out) for (let i = 0; i < c.length; i++) pk = Math.max(pk, Math.abs(c[i]));
  if (pk > 0) for (const c of out) for (let i = 0; i < c.length; i++) c[i] /= pk;
  return { L: out[0], R: out[1], T };
}
/* ---------- a response made ready for the hall (worker): the direct sound taken out (the hall is a send – the dry is
   the channel's own), Abstand (0 … 1, ½ as measured): nearer – the early reflections stronger, the tail weaker; farther –
   the other way and the air takes the highs; Länge (× 0.5 … 1.5): the tail decays faster or slower (its own broadband
   time, from the backwards-integrated energy); its energy as Nebel's of the same length would have (e, per channel). ---------- */
function genShape(L, R, sr, o) {
  const ch = [Float32Array.from(L), Float32Array.from(R)], n = ch[0].length;
  let pk = 0, i0 = 0; for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i])); if (a > pk) pk = a; }
  for (let i = 0; i < n; i++) if (Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i])) > 0.1 * pk) { i0 = i; break; }
  if (o.direct) { const e = i0 + Math.round(0.0015 * sr), f = Math.round(0.001 * sr); for (const c of ch) for (let i = 0; i < Math.min(n, e + f); i++) c[i] *= i < e ? 0 : (i - e) / f; }
  // its broadband time: −5 … −25 dB of the backwards integral (T20 × 3)
  const E = new Float64Array(n); let s = 0; for (let i = n - 1; i >= 0; i--) { s += ch[0][i] * ch[0][i] + ch[1][i] * ch[1][i]; E[i] = s; }
  let a5 = -1, a25 = -1; for (let i = i0; i < n; i++) { const d = 10 * Math.log10(E[i] / E[i0] + 1e-30); if (a5 < 0 && d <= -5) a5 = i; if (d <= -25) { a25 = i; break; } }
  const T = a5 > 0 && a25 > a5 ? 3 * (a25 - a5) / sr : 1;
  const d = o.dist != null ? o.dist : 0.5, len = o.len || 1, iE = i0 + Math.round(0.08 * sr), X = Math.round(0.01 * sr);
  const gE = Math.pow(10, ((0.5 - d) * 12) / 20), gL = Math.pow(10, ((d - 0.5) * 6) / 20), k = len === 1 ? 0 : (6.9078 / (T * sr)) * (1 - 1 / len);
  const air = d > 0.5 ? 1 - Math.exp(-2 * Math.PI * (20000 - 28000 * (d - 0.5)) / sr) : 1;
  for (const c of ch) {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const w = i < iE - X ? 0 : i >= iE ? 1 : (i - iE + X) / X, g = gE * (1 - w) + gL * w * Math.exp(k * Math.max(0, i - iE));
      let v = c[i] * g; if (air < 1) { lp += air * (v - lp); v = lp; } c[i] = v;
    }
  }
  let e = 0; for (const c of ch) for (let i = 0; i < n; i++) e += c[i] * c[i];
  const want = (o.e || 990) * Math.min(8, Math.max(0.6, T * len)), g = Math.sqrt(want / Math.max(1e-30, e / 2));
  for (const c of ch) for (let i = 0; i < n; i++) c[i] *= g;
  return { L: ch[0], R: ch[1], T: T * len };
}
