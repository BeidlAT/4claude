// Listening demos of Harz for the owner: the real app rendered offline with its default effects, level 3 (desktop) and
// level 1 (phone); per body a little piece: a held note whose Höhe rises and falls (flautando → grain → tearing), a
// slide to the next note, a two-note chord, then four Puls strokes.   node listen-hrz.js OUTDIR
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2], SR = 48000;
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => {
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.__ret = (b) => ({ L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), sr: b.sampleRate });
  });
  for (const q of ['3', '1']) for (const body of ['glas', 'schale', 'stab', 'zunge', 'teich']) {
    const r = await page.evaluate(async ([body, q]) => {
      const M = window.__M; M.P['dev.q'] = q;
      const ctx = await window.__off(48000, 16, { 'v.eng': 'hrz', 'hrz.koerper': body, 'dev.lat': 'std' });
      M.getQ().budget = 1e4; await M.ensureDSP(ctx);
      const at = (t, fn) => ctx.suspend(Math.round(t * 375) / 375).then(() => { fn(ctx.currentTime); ctx.resume(); });
      const n = (x) => M.noteAt(x).f;
      let a = null, b = null, c = null;
      // 1. a held note, Höhe 0.15 → 1 → 0.3 over 6 s
      at(0.2, (t) => { a = M.playNote('hrz', t, n(0.35), 0.15, 0.75, { pan: -0.15 }); });
      for (let i = 0; i <= 50; i++) at(0.5 + i * 0.1, () => { if (a) a.setY(i <= 30 ? 0.15 + 0.85 * i / 30 : 1 - 0.7 * (i - 30) / 20); });
      // 2. slide to the next column, let go
      at(5.8, () => { if (a) a.setF(n(0.5), 0.25); });
      at(6.9, () => { if (a) a.release(); });
      // 3. a two-note chord, mid height
      at(7.6, (t) => { b = M.playNote('hrz', t, n(0.2), 0.5, 0.7, { pan: -0.4 }); c = M.playNote('hrz', t + 0.08, n(0.6), 0.55, 0.7, { pan: 0.4 }); });
      at(10.4, () => { if (b) b.release(); if (c) c.release(); });
      // 4. Puls strokes: two of 0.11 s, two of 0.4 s
      [[11.6, 0.11, 0.7], [12.0, 0.11, 0.45], [12.5, 0.4, 0.8], [13.2, 0.4, 0.3]].forEach(([tt, g, x]) => at(tt, (t) => M.hit('hrz', t, n(x), 0.6, 0.75, { gate: g, pan: (x - 0.5) })));
      for (let t = 0.3; t < 15.9; t += 0.37) ctx.suspend(Math.round(t * 375) / 375).then(() => ctx.resume());   // (port messages reach the processors at a suspend)
      const out = await ctx.startRendering();
      M.P['dev.q'] = '1';
      return window.__ret(out);
    }, [body, q]);
    const x = { L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) };
    const file = path.join(OUT, `harz-${body}-stufe${q}.wav`);
    L.wav(file, x.L, x.R, SR);
    console.log(file, 'peak', L.db(Math.max(L.peak(x.L), L.peak(x.R))).toFixed(1), 'dBFS, rms', L.db(L.rms(x.L)).toFixed(1));
  }
  await browser.close();
})();
