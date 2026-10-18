// Amöbe: aliasing measured against a 4×-rate reference. The same note (same seed, same points: Punkte ≤ K_eff at
// 48 kHz, no Zucken: vel 0) rendered at 48 kHz and at 192 kHz (decimated by a 255-tap low-pass at 20 kHz); the
// low-pass of the engine bypassed in both (its one-pole differs between the rates). The difference is what folded.
// Exported: aliasAt(f, y, o) → { worst (strongest line of the difference vs the strongest harmonic, dB), total (dB),
// at (Hz) }.   node alias-amo.js  prints a table
const L = require('./dsplib');
function make(src, sr) { return L.loadDsp(sr, src.replace(/const lc = 1 - Math\.exp\(.*?\/ SR\), dcR/, 'const lc = 1, dcR')); }
const FIR = (() => { const N = 255, fc = 20000 / 192000, h = new Float64Array(N); let s = 0; for (let i = 0; i < N; i++) { const k = i - 127, w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (N - 1)); h[i] = (k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k)) * w; s += h[i]; } for (let i = 0; i < N; i++) h[i] /= s; return h; })();
function aliasAt(f, y, o = {}) {
  const src = o.src || L.dspSource(), K = Math.max(3, Math.min(12, Math.floor(48000 / f / 6)));
  const prm = Object.assign({ zeit: 0, punkte: K }, o.prm || {}), dur = 1.2, rich = !!o.rich;
  const run = (sr) => L.render(make(src, sr), { name: 'myzel-gendy', po: { rich, prm }, ch: rich ? 2 : 1, dur, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0, seed: o.seed || 4242 }]] });
  const a = run(48000), b = run(192000), x = a.L, z = b.L;
  // the reference at 48 kHz: low-passed, every 4th sample, aligned (the engine's corner correction reaches one sample
  // back in its own rate: 1/48000 vs 1/192000 s)
  const n0 = Math.round(0.4 * 48000), n1 = Math.round(1.1 * 48000), off = rich ? 0 : 0;
  let best = null;
  for (let lag = rich ? 86 : 120; lag <= (rich ? 100 : 132); lag++) {
    const ref = new Float32Array(n1 - n0), err = new Float32Array(n1 - n0);
    for (let n = n0; n < n1; n++) { const m = 4 * n + lag; let s = 0; for (let k = 0; k < 255; k++) s += FIR[k] * (z[m - k] || 0); ref[n - n0] = s; err[n - n0] = x[n] - s; }
    const e = L.rms(err); if (!best || e < best.e) best = { e, ref, err, lag };
  }
  const N = 16384, sp = L.spectrum(best.ref, 48000, 0, N), se = L.spectrum(best.err, 48000, 0, N);
  let top = 0; for (let k = 1; k < N / 2; k++) top = Math.max(top, sp.p[k]);
  // (only what lies between the harmonics: on a harmonic the difference is the corner correction's own in-band error)
  const fq = rich ? f * Math.pow(2, -3 / 1200) : f;
  let w = 0, wf = 0, ie = 0, se_ = 0; for (let k = Math.round(20 / se.hz); k * se.hz < 20000; k++) { const hz = k * se.hz, d = Math.abs(hz - Math.round(hz / fq) * fq); se_ += sp.p[k]; if (d <= 4 * se.hz) continue; ie += se.p[k]; if (se.p[k] > w) { w = se.p[k]; wf = hz; } }
  return { worst: 10 * Math.log10(w / top), total: 10 * Math.log10(ie / se_), all: L.db(best.e / L.rms(best.ref)), at: Math.round(wf), K, lag: best.lag };
}
module.exports = { aliasAt };
if (require.main === module) {
  const src = L.dspSource();
  for (const v of ['as is', 'no BLAMP']) {
    const s = v === 'as is' ? src : src.replace('AMO_BLAMP = 1', 'AMO_BLAMP = 0');
    for (const f of [261.6, 523, 1013, 1511, 2011]) for (const y of [0, 0.5, 1]) {
      const r = aliasAt(f, y, { src: s });
      console.log(`${v} f ${f} y ${y}: K ${r.K} worst line ${r.worst.toFixed(1)} dB at ${r.at} Hz, between harmonics ${r.total.toFixed(1)} dB, all ${r.all.toFixed(1)} dB`);
    }
  }
}
