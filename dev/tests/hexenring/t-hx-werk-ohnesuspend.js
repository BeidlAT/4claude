// (27.10.2026) Firefox has no OfflineAudioContext.suspend: the Werk-Rahmen schedules each block ahead (hxwAhead). This
// renders five sources once with suspend and once without (myzel.test.nosusp) and compares: spectra in 1/3 octaves.
const G = require('./hx-g');
(async () => {
  const { page, errors } = await G.open({ w: 1200, h: 800 });
  const r = await page.evaluate(async () => {
    const M = window.__M, out = {};
    const notes = [];
    const engs = ['klb', 'neb', 'glo', 'atr'];
    for (const eng of engs) {
      const ns = [0, 0.5, 1.0, 1.5].map((t, i) => ({ eng, t0: t + 0.05, t1: t + 0.4, f: 220 * Math.pow(2, [0, 4, 7, 12][i] / 12), vel: 0.8, y0: 0.5 }));
      const job = () => M.hxwCall('tail', { sr: M.A.ctx.sampleRate, P: M.patchValues(), q: 3, dur: 2.5, notes: ns, seed: 7 }, []);
      localStorage.removeItem('myzel.test.nosusp'); const a = await job();
      localStorage.setItem('myzel.test.nosusp', '1'); const b = await job();
      localStorage.removeItem('myzel.test.nosusp');
      if (!a || !b || !a.L || !b.L) { out[eng] = 'kein Ergebnis ' + JSON.stringify(a && a.err) + ' ' + JSON.stringify(b && b.err); continue; }
      let ea = 0, ed = 0; for (let i = 0; i < a.L.length; i++) { ea += a.L[i] * a.L[i]; const d = a.L[i] - b.L[i]; ed += d * d; }
      const seg = (x, a0, a1) => { let e = 0; for (let i = a0; i < a1; i++) e += x[i] * x[i]; return e; };
      const sr = M.A.ctx.sampleRate, win = [];
      for (let t = 0; t < 2.5; t += 0.25) { const a0 = Math.floor(t * sr), a1 = Math.floor((t + 0.25) * sr); let ed2 = 0; for (let i = a0; i < a1; i++) { const d = a.L[i] - b.L[i]; ed2 += d * d; } win.push((10 * Math.log10(ed2 / Math.max(1e-20, seg(a.L, a0, a1)))).toFixed(0) + '/' + (10 * Math.log10(seg(a.L, a0, a1) / seg(b.L, a0, a1))).toFixed(1)); }
      let best = [0, -1]; for (let lag = -600; lag <= 600; lag += 1) { let c = 0; for (let i = 2400; i < 48000; i += 3) c += a.L[i] * b.L[i + lag]; if (c > best[1]) best = [lag, c]; }
      // spectra in bands (1/3 octave, 0.2 s windows): the largest difference in dB where the band holds energy
      const N = 4096, bands = []; for (let f = 60; f < 16000; f *= 1.26) bands.push(f);
      const spec = (x, a0) => { const out2 = new Float64Array(bands.length); for (let bi = 0; bi < bands.length; bi++) { const f = bands[bi]; for (const ff of [f * 0.9, f, f * 1.1]) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N), ph = 2 * Math.PI * ff * i / sr; re += x[a0 + i] * w * Math.cos(ph); im += x[a0 + i] * w * Math.sin(ph); } out2[bi] += re * re + im * im; } } return out2; };
      let worst = 0; const rows = [];
      for (let t = 0.1; t < 2.3; t += 0.3) { const a0 = Math.floor(t * sr), A1 = spec(a.L, a0), B1 = spec(b.L, a0); const mx = Math.max(...A1); let w = 0; for (let i = 0; i < A1.length; i++) if (A1[i] > mx * 1e-3) w = Math.max(w, Math.abs(10 * Math.log10(A1[i] / Math.max(1e-30, B1[i])))); worst = Math.max(worst, w); rows.push(w.toFixed(1)); }
      out[eng + 'spec'] = rows.join(' ') + ' max ' + worst.toFixed(1) + ' dB';
      out[eng] = { rms: Math.sqrt(ea / a.L.length).toFixed(4), diffDb: (10 * Math.log10(ed / Math.max(1e-20, ea))).toFixed(1) };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1), errors.slice(0, 3));
  process.exit(0);
})();
