// Kehlchen in the app, offline: module loads, a held note, a Puls hit, level phrase; demos
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => { window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }; });
  for (const silbe of ['chip', 'triller', 'ruf', 'aus']) for (const q of ['1', '3']) {
    const r = await page.evaluate(async ([silbe, q]) => {
      const M = window.__M; M.P['dev.q'] = q;
      const ctx = await window.__off(48000, 10, { 'v.eng': 'khl', 'khl.silbe': silbe, 'rev.mix': 0.15, 'dly.mix': 0 }); M.getQ().budget = 1e4; const ok = await M.ensureDSP(ctx);
      const at = (t, fn) => ctx.suspend(Math.round(t * 375) / 375).then(() => { fn(ctx.currentTime); ctx.resume(); });
      let a = null, b = null; const n = (x) => M.noteAt(x).f;
      at(0.2, (t) => { a = M.playNote('khl', t, n(0.6), 0.15, 0.75, {}); });
      for (let i = 0; i <= 40; i++) at(0.4 + i * 0.1, () => { if (a) a.setY(i <= 25 ? 0.15 + 0.85 * i / 25 : 1 - 0.6 * (i - 25) / 15); });
      at(4.6, () => { if (a) a.release(); });
      at(5.0, (t) => { b = M.playNote('khl', t, n(0.75), 0.55, 0.7, {}); });
      at(5.9, (t) => { if (b) b.setF(n(0.85), 0.15); });
      at(6.8, () => { if (b) b.release(); });
      [7.2, 7.45, 7.7, 7.95, 8.2, 8.45].forEach((tt, i) => at(tt, (t) => M.hit('khl', t, n(0.5 + 0.08 * (i % 4)), 0.6, 0.7, { gate: 0.11 })));
      for (let t = 0.3; t < 9.9; t += 0.25) ctx.suspend(Math.round(t * 375) / 375).then(() => ctx.resume());
      const out = await ctx.startRendering(); M.P['dev.q'] = '1';
      return { ok, as: a && a.as, L: window.__b64(out.getChannelData(0)), R: window.__b64(out.getChannelData(1)) };
    }, [silbe, q]);
    const x = { L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) };
    const f = path.join(__dirname, 'out', 'khl', `kehlchen-${silbe}-stufe${q}.wav`); L.wav(f, x.L, x.R, 48000);
    console.log(silbe, 'L' + q, r.ok, r.as, 'peak', L.db(Math.max(L.peak(x.L), L.peak(x.R))).toFixed(1), 'rms', L.db(L.rms(x.L)).toFixed(1), 'nan', L.nanCount(x.L));
  }
  console.log('errors', errors.join(' | '));
  await browser.close();
})();
