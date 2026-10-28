/* =====================================================================
   Voices
   ===================================================================== */
class Voice {
  constructor(eng) {
    if (IDLE.on && A.ctx === IDLE.ctx) idleWake();   // Ruhe: the graph plugged in before the voice exists
    this.eng = eng; this.nodes = []; this.srcs = []; this.mods = [];
    this.out = A.ctx.createGain(); this.out.gain.value = 0;
    this.alive = true; this.released = false; this.t0 = A.ctx.currentTime; this.endAt = Infinity; this.relAt = null;
  }
  n(node) { this.nodes.push(node); return node; }
  s(node) { this.srcs.push(node); this.nodes.push(node); return node; }
  // pitch modulation in cents: vibrato and drift for every voice, plus the pitch wheel for voices played over MIDI
  // (bend: true = the app's bend bus, or the bus of the MIDI channel that plays it)
  mod(param) { KR(param); this.lnk(this.bend ? this.bend.node || A.notePitch : A.pitchMod, param); }
  lnk(src, param) { try { src.connect(param); this.mods.push([src, param]); } catch (e) {} }
  finish(at) {
    this.endAt = at;
    // a source may end earlier on its own (_end: inaudible below −60 dB); the last stop() call wins, so keep the earlier one
    for (const s of this.srcs) { try { s.stop(s._end ? Math.min(at, s._end) : at); } catch (e) {} }
    clearTimeout(this.timer);
    if (HXW.dead) { HXW.dead.push(this); return; }   // Hexenring: in a Werk-Rahmen render, after it (a wall-clock timer would cut it short)
    const ms = Math.max(0, (at - A.ctx.currentTime) * 1000) + 150;
    this.timer = setTimeout(() => this.cleanup(), ms);
  }
  cleanup() {
    if (!this.alive) return;
    this.alive = false;
    clearTimeout(this.timer);
    // (by index: a voice ends seldom enough to stay unoptimised, where for…of made an iterator result per node – 0.6 MB/s
    // of the main thread's garbage under an arp, 28.10.2026)
    const M = this.mods, N = this.nodes;
    for (let i = 0; i < M.length; i++) { try { M[i][0].disconnect(M[i][1]); } catch (e) {} }
    for (let i = 0; i < N.length; i++) { try { N[i].disconnect(); } catch (e) {} }
    try { this.out.disconnect(); } catch (e) {}
    if (this.wk) { try { this.wk.port.postMessage({ kill: 1 }); } catch (e) {} }
    A.voices.delete(this); A.grainVoices.delete(this);
  }
  kill() {
    if (!this.alive) return;
    const t = A.ctx.currentTime;
    holdParam(this.out.gain, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.035);
    this.released = true;
    this.finish(t + 0.05);
  }
}
function adsrStart(v, t, peak, att) {
  v.peak = peak; v.att = Math.max(0.003, att); v.tA = t;
  v.out.gain.setValueAtTime(0, t);
  v.out.gain.linearRampToValueAtTime(peak, t + v.att);
}
// a release's moment: at (a key's note-off at its MIDI timestamp, midiAt – the same distance from the key as its
// note-on, so the gate is as long as the key was held), never before now
const relT = (at) => (at > A.ctx.currentTime ? at : A.ctx.currentTime);
// v.out's envelope at t, as adsrStart set it (holdParam's value where cancelAndHoldAtTime is missing)
const envAt = (v, t) => (v.peak ? (t - v.tA < v.att ? v.peak * Math.max(0, t - v.tA) / v.att : v.peak) : null);
// k stretches the release (MIDI release velocity: a quick lift ends sooner)
function sustainRelease(v, rel) {
  return (k, at) => {
    if (!v.alive || v.released) return;
    v.released = true;
    if (k) rel *= k;
    const t = relT(at);
    holdParam(v.out.gain, t, envAt(v, t));
    // a quick tap ends during a slow attack: finish to at least half the peak so short notes stay audible
    let t1 = t;
    if (v.peak && t - v.tA < v.att) {
      const cur = envAt(v, t);
      t1 = t + 0.03;
      v.out.gain.linearRampToValueAtTime(Math.max(cur, v.peak * 0.5), t1);
    }
    v.relAt = t1;
    v.out.gain.setTargetAtTime(0, t1, Math.max(0.01, rel / 5));
    v.finish(t1 + rel * 1.3 + 0.08);
  };
}
function burstEnv(v, t, peak, att, gate, rel) {
  const a = Math.min(Math.max(0.003, att), gate * 0.5);
  v.out.gain.setValueAtTime(0, t);
  v.out.gain.linearRampToValueAtTime(peak, t + a);
  v.out.gain.setTargetAtTime(0, t + Math.max(a, gate), Math.max(0.02, rel / 5));
  v.released = true; v.relAt = t + Math.max(a, gate);
  v.finish(t + Math.max(a, gate) + rel * 1.3 + 0.08);
}

// a note folded up by octaves until it reaches the key's root, taken into [lo, 2·lo): a line wraps at the root, as a
// bass changes register (Tiefe's sub, Elmsfeuer's hum)
function octFold(f, lo) {
  let r = N.base;
  while (r >= 2 * lo) r /= 2;
  while (r < lo) r *= 2;
  while (f < r * 0.999) f *= 2;
  return f;
}
const nebCut = (y) => clamp(P['neb.cut'] * Math.pow(2, y * P['neb.ymod']), 30, 18000);
const hauFreq = (f, y) => clamp(f * Math.pow(2, P['hau.color'] + y * P['hau.sweep']), 40, 16000);
const hauGain = (fc, q) => clamp(26.8 / Math.sqrt(Math.max(8, fc / q)), 0.05, 6);
// an iterative radix-2 FFT in place (re, im: Float64Array of a power-of-two length): X[k] = Σ x[n]·e^(−2πikn/N)
function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j ^= b;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const p = i + k, q = p + h, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
