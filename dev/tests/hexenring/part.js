// HX_PART (SPEC §12.3, Klangverwandtschaft): each source's ten strongest partials, measured once – a 220-Hz note
// (y 0.5, velocity 0.8, held 1.15 s) rendered at level 3 in the Werk-Rahmen exactly as a Wuchs pass is, its spectrum
// over 0.15 … 0.95 s (Hann, 2^16-point FFT); a partial = a local maximum ≥ −50 dB under the strongest, ≥ 15 Hz from a
// stronger one, between 0.4 × and 12 kHz; ratio to the measured fundamental (the strongest peak within a semitone of
// 220 Hz, else 220), amplitude re the strongest. Prints the table for index.html (HX_PART).
//   node part.js [eng …]
const H = require('./hx-h');
const ALL = ['hau', 'obt', 'stm', 'hlm', 'boe', 'elm', 'khl', 'neb', 'kor', 'swm', 'amo', 'hrz', 'shn', 'zpf', 'rnk', 'sai', 'jrg', 'glo', 'sch', 'gng', 'klb', 'gsp', 'tie', 'glt', 'mem', 'trp', 'mdr', 'rhz'];
const ENGS = process.argv.length > 2 ? process.argv.slice(2) : ALL;
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
(async () => {
  const { page } = await H.open({});
  await page.evaluate(async () => { await window.__M.hxWerk(); });
  const out = {};
  for (const k of ENGS) {
    const r = await page.evaluate(async (k) => {
      const M = window.__M, SR = M.A.ctx.sampleRate, E = M.ENGINES[k];
      const p = {}; for (const id in M.PD) if (!M.PD[id].dev) p[id] = M.PD[id].d; p['mov.drift'] = 0; p['mov.vib'] = 0; p['v.human'] = 0;
      const job = { sr: SR, dur: 1.6, body: 1.6, notes: [{ t0: 0.05, t1: 1.2, eng: k, f: 220, y0: 0.5, vel: 0.8, pan: 0, src: 'fin', burst: false, gate: null, hold: !!(E && E.sustain), curves: { y: [], f: [] } }], prm: [], P: p, q: '3', seed: 7, chain: null, mask: ['fin', 'eb2', 'rgn', 'gsp'], jrg: { age: 0, season: 1 } };
      const m = await M.hxwCall('wuchs', job);
      if (!m || !m.L) return null;
      const a = Math.round(0.15 * SR), b = Math.round(0.95 * SR), x = []; for (let i = a; i < b; i++) x.push(0.5 * (m.L[i] + m.R[i]));
      return { x, SR };
    }, k);
    if (!r) { console.log('INFO', k, 'no render'); continue; }
    const N = 65536, re = new Float64Array(N), im = new Float64Array(N), n = r.x.length;
    for (let i = 0; i < n; i++) re[i] = r.x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / n));
    fft(re, im);
    const bin = r.SR / N, mag = new Float64Array(N / 2); for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
    let f0 = 220, best = 0; for (let i = Math.floor(207.7 / bin); i <= Math.ceil(233.1 / bin); i++) if (mag[i] > best && mag[i] >= mag[i - 1] && mag[i] >= mag[i + 1]) { best = mag[i]; f0 = i * bin; }
    let mx = 0; for (let i = Math.floor((0.4 * f0) / bin); i < 12000 / bin; i++) mx = Math.max(mx, mag[i]);
    if (!best || best < mx * 0.003) f0 = 220;   // (no peak near the note: the note's own pitch)
    const peaks = [];
    for (let i = Math.floor((0.4 * f0) / bin) + 1; i < 12000 / bin; i++) if (mag[i] > mag[i - 1] && mag[i] >= mag[i + 1] && mag[i] > mx * 0.00316) { const y0 = mag[i - 1], y1 = mag[i], y2 = mag[i + 1], d = (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2 || 1); peaks.push([(i + d) * bin, y1]); }
    peaks.sort((p, q) => q[1] - p[1]);
    const sel = []; for (const p of peaks) { if (sel.every((s) => Math.abs(s[0] - p[0]) >= 15)) sel.push(p); if (sel.length >= 10) break; }
    const top = sel.length ? sel[0][1] : 1;
    out[k] = sel.sort((p, q) => p[0] - q[0]).map(([f, a]) => [Math.round((f / f0) * 1000) / 1000, Math.round((a / top) * 1000) / 1000]);
    console.log('INFO', k, 'f0', f0.toFixed(1), JSON.stringify(out[k]));
  }
  console.log('HX_PART = ' + JSON.stringify(out));
  await H.close();
  process.exit(0);
})();
