// Zapfen's measures (bench, t-dsp, the Node tools): the fundamental's spectral line, the teeth counted, the sideband
// floor of the tooth train, the rate transitions' peaks.
const L = require('./dsplib');
// the strongest line within ±4 % of f (Hann, parabolic on dB)
function peakHz(sig, sr, f, at, N = 32768) {
  const { p, hz } = L.spectrum(sig, sr, at, N); let b = Math.round(f / hz);
  for (let k = Math.floor(f * 0.96 / hz); k <= Math.ceil(f * 1.04 / hz); k++) if (p[k] > p[b]) b = k;
  const a = 10 * Math.log10(p[b - 1] + 1e-30), c = 10 * Math.log10(p[b] + 1e-30), d = 10 * Math.log10(p[b + 1] + 1e-30);
  return (b + 0.5 * (a - d) / (a - 2 * c + d)) * hz;
}
// 2nd-order high-pass (RBJ, Q 0.7) applied twice
function hp(x, sr, fc) {
  const w = 2 * Math.PI * fc / sr, al = Math.sin(w) / 1.4, c = Math.cos(w), a0 = 1 + al, b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
  let o = x;
  for (let pass = 0; pass < 2; pass++) {
    const y = new Float32Array(o.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < o.length; i++) { const v = b0 * o[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = o[i]; y2 = y1; y1 = v; y[i] = v; }
    o = y;
  }
  return o;
}
// teeth per second between t0 and t1: onsets in the contact's band (above `band` Hz, 1-ms RMS): a rise of ≥ 8 dB within
// 2 ms to above a quarter of the loudest moment's level, at least `gap` ms after the last onset (the stone: 40 – the
// slips of one rasp are one creak)
function ticks(m, sr, t0, t1, list, gap = 6, band = 2500) {
  const x = hp(m, sr, band), e = L.env(x, sr, 0.001), a = Math.round(t0 * 1000), b = Math.min(e.length, Math.round(t1 * 1000));
  let mx = 0; for (let i = a; i < b; i++) mx = Math.max(mx, e[i]);
  let n = 0, last = -99; const at = [];
  for (let i = Math.max(a, 2); i < b; i++) if (e[i] > 0.25 * mx && e[i] > 2.5 * Math.min(e[i - 1], e[i - 2])) { if (i - last >= gap) { n++; at.push(i / 1000); } last = i; }   // (gap: the stone's rasp is one creak)
  if (list) list.push(...at);
  return n / (t1 - t0);
}
// the sideband floor of a tone at f: the power between the harmonics (the middle half of each gap) relative to the
// power of the harmonics' lines (±2 bins), over the harmonics below 6 kHz – the same at every pitch (a strictly
// periodic tone: the window's leakage, far below −60 dB)
function floor(m, sr, f, at, N = 16384) {
  const { p, hz } = L.spectrum(m, sr, at, N); let P = 0, F = 0;
  for (let k = 1; k * f < Math.min(6000, sr / 2 - f); k++) {
    const c = Math.round(k * f / hz); for (let j = c - 2; j <= c + 2; j++) P += p[j];
    for (let j = Math.round((k + 0.25) * f / hz); j <= Math.round((k + 0.75) * f / hz); j++) F += p[j];
  }
  return 10 * Math.log10((F + 1e-30) / (P + 1e-30));
}
// the Rast's steps for a height that moves: the processor's mapping and hysteresis replayed (y(t) sampled every dt)
function rastSteps(f, ys, dt, rast = 0.7, R0 = 3) {
  const H = Math.log2(1.08), oc = Math.log2(Math.max(f, 1.01 * R0) / R0), yR = 0.6 * (1.3 - rast), out = []; let lock = -1;
  ys.forEach((y, i) => {
    const Lf = (1 - y) * oc, was = lock;
    if (lock < 0) { if (y >= yR + 0.01 && Lf < 4.5 + H) lock = Math.min(4, Math.max(0, Math.round(Lf))); }
    else if (y < yR - 0.01 || Lf > 4.5 + H) lock = -1;
    else if (Math.abs(Lf - lock) > 0.5 + H) lock = Math.min(4, Math.max(0, Math.round(Lf)));
    if (lock !== was) out.push([i * dt, was, lock]);
  });
  return out;
}
module.exports = { peakHz, hp, ticks, floor, rastSteps };
