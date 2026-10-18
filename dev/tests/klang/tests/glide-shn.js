// Sehne glide: 220 → 330 Hz linear over 0.2 s (k-rate freq, 128-sample blocks). A length set once per block jumps the
// read point at every block boundary (here ≈ 0.6 samples, 9.4 ct of pitch a block): a click train at the block rate,
// heard as zipper noise. Measured: the energy above 12 kHz (4th-order high-pass; the string itself has almost nothing
// there) during the glide vs the same note held, and its share at the block rate (375 Hz comb) – per-sample lengths vs
// a variant that sets the length once per block.
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
function hp(x, fc) {
  const w = 2 * Math.PI * fc / SR, al = Math.sin(w) / (2 * 0.7071), c = Math.cos(w), a0 = 1 + al, b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, o = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, v1 = 0, v2 = 0;
  for (let i = 0; i < x.length; i++) { const u = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = u; const v = b0 * u + b1 * z1 + b0 * z2 - a1 * v1 - a2 * v2; z2 = z1; z1 = u; v2 = v1; v1 = v; o[i] = v; }
  return o;
}
function glide(src, o = {}) {
  const D = L.loadDsp(SR, src), f0 = o.f0 || 220, f1 = o.f1 || 330, T0 = 0.5, dur = o.dur || 0.2;
  const fAt = (t) => (t < T0 ? f0 : t < T0 + dur ? f0 + (f1 - f0) * (t - T0) / dur : f1);
  const run = (glide) => L.render(D, { name: 'myzel-string', po: { seed: 1, prm: o.prm || {} }, dur: T0 + dur + 0.2, params: (t) => ({ freq: glide ? fAt(t) : f0, hoehe: 0.5 }), msgs: [[0, { on: 0, f: f0, y: 0.5, vel: 0.75, seed: 101 }]] }).L;
  const g = hp(run(true), 12000), h = hp(run(false), 12000);
  const a = Math.round(T0 * SR), b = Math.round((T0 + dur) * SR);
  return L.db(L.rms(g, a, b)) - L.db(L.rms(h, a, b));   // dB more above 12 kHz while gliding than held
}
const stairs = base.replace('let w = S.w, Lh = S.Lh; const dLh = (S.LhT - Lh) / n;', 'let w = S.w, Lh = S.LhT; const dLh = 0;');
if (stairs === base) { console.log('!! variant anchor not found'); process.exit(1); }
if (require.main === module) {
  for (const o of [{}, { f0: 880, f1: 1320 }, { prm: { steg: 'jawari' } }]) {
    const a = glide(base, o), b = glide(stairs, o);
    console.log(`${JSON.stringify(o)}: above 12 kHz while gliding vs held: per sample ${a.toFixed(1)} dB, per block (stairs) ${b.toFixed(1)} dB`);
  }
}
module.exports = { glide, stairs, base };
