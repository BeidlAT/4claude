// Böe in the app (slot kd-boe-inst): the capture event as bench.js measures it, repeated over seeds – the wind moved
// from string k−1 to 0.3 harmonics past string k; string k's energy within 150 ms of the crossing.   node cap-boe.js [reps]
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const SR = 48000, URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-boe-inst/index.html', REPS = +process.argv[2] || 3;
const DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 };
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) });
const mono = (x) => x.L.map((v, i) => 0.5 * (v + x.R[i]));
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, URL_, false);
  await page.evaluate(() => {
    const M = window.__M;
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.__one = async (o) => {
      M.P['dev.q'] = '1'; const ctx = await window.__off(48000, o.dur, Object.assign({ 'dev.lat': 'std', 'v.eng': 'boe' }, o.params)); M.getQ().budget = 1e4; await M.ensureDSP(ctx);
      { let x = o.rseed; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
      let v; ctx.suspend(19 / 375).then(() => { v = M.playNote('boe', ctx.currentTime, o.f, o.y, o.vel, {}); ctx.resume(); });
      for (const [t, y] of o.moves) ctx.suspend(Math.round(t * 375) / 375).then(() => { v.setY(y); ctx.resume(); });
      const b = await ctx.startRendering(); return { L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)) };
    };
  });
  const yOf = (r) => (r - 0.7) / 7 / 0.9;
  const band = (m, f, k, t, N = 2048) => { const sp = L.spectrum(m, SR, t, N); let e = 0; for (let i = Math.round((k - 0.25) * f / sp.hz); i <= Math.round((k + 0.25) * f / sp.hz); i++) e += sp.p[i]; return 10 * Math.log10(e + 1e-30); };
  const rise = (m, f, k, t0, win, tb = t0) => { const b = [], a = []; for (let t = tb - 0.15; t + 2048 / SR <= tb; t += 0.01) b.push(Math.pow(10, band(m, f, k, t) / 10)); for (let t = t0; t + 2048 / SR <= t0 + win; t += 0.01) a.push(band(m, f, k, t)); return Math.max(...a) - 10 * Math.log10(b.reduce((x, y) => x + y, 0) / b.length); };
  if (process.env.DBG) { const k = 3, m = mono(pull(await page.evaluate((o) => window.__one(o), { f: 220, y: yOf(k - 1), vel: 0.05, dur: 2.2, rseed: 500 + 37 + k, params: Object.assign({}, DRY, { "boe.boeen": 0, "boe.rauschen": 0 }), moves: [[1.5, yOf(k + 0.3)]] }))); const row = []; for (let t = 0.2; t < 1.9; t += 0.05) row.push(t.toFixed(2) + ":" + [1, 2, 3, 4].map((j) => band(m, 220, j, t).toFixed(0)).join("/")); console.log(row.join(" ")); await browser.close(); return; }
  for (let r = 0; r < REPS; r++) {
    const cp = {};
    for (const k of [2, 3, 4, 5, 6]) { const m = mono(pull(await page.evaluate((o) => window.__one(o), { f: 220, y: yOf(k - 1), vel: 0.05, dur: 2.2, rseed: 500 + 37 * r + k, params: Object.assign({}, DRY, { 'boe.boeen': 0, 'boe.rauschen': 0 }), moves: [[1.5, yOf(k + 0.3)]] }))); cp[k] = +rise(m, 220, k, 1.5 + 0.04 * Math.log(1.3 / 0.3), 0.15, 1.5).toFixed(1); }
    console.log(JSON.stringify(cp));
  }
  await browser.close();
})();
