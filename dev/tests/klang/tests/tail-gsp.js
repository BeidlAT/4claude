process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'); const SR = 48000;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => {
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  });
  const R = async (params) => { const r = await page.evaluate(async (params) => {
    const M = window.__M; M.P['dev.q'] = params.q || '1';
    const ctx = await window.__off(48000, 9, Object.assign({ 'v.eng': 'gsp', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 't.scale': 'dpent', 't.root': 9, 't.oct': 3 }, params));
    M.getQ().budget = 1e4; await M.ensureDSP(ctx);
    const q = (t) => Math.round(t * 375) / 375;
    [[0.1, 0], [0.12, 2], [0.14, 3]].forEach(([t, d]) => ctx.suspend(q(t)).then(() => { M.playNote('gsp', ctx.currentTime, M.N.notes[d].f, 0.6, 0.9, {}); ctx.resume(); }));
    for (let t = 0.2; t < 8.9; t += 0.25) ctx.suspend(q(t)).then(() => ctx.resume());
    const b = await ctx.startRendering(); return { x: window.__b64(b.getChannelData(0)), fr: M.gspFreqs(), lite: M.A.lite };
  }, params); return { x: new Float32Array(Buffer.from(r.x, 'base64').buffer.slice(0)), fr: r.fr, lite: r.lite }; };
  for (const kop of [1]) for (const qq of ['1','3']) {
    const w = await R({ 'gsp.kopplung': kop, 'gsp.halo': 0, q: qq }), d = await R({ 'gsp.kopplung': kop, 'gsp.halo': 0, 'xgsp.mute': true, q: qq });
    const web = w.x.map((v, i) => v - d.x[i]);
    const lv = (x, a) => L.db(L.rms(x, Math.round(a * SR), Math.round((a + 0.5) * SR))).toFixed(1);
    console.log('kop', kop, 'freqs', w.fr.map(Math.round).join(' '), 'lite', w.lite);
    for (const t of [0.5, 1, 2, 3, 4, 5, 6, 7, 8]) console.log('  t', t, 'total', lv(w.x, t), 'direct', lv(d.x, t), 'web', lv(web, t));
  }
  await browser.close();
})();
