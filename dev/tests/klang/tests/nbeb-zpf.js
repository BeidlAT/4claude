// Zapfen's native stand-in: the knock's pitch low on the field with +50 ct on the pitch bus, several renders (spread)
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'), Z = require('./zpflib');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-zpf-inst/index.html', SR = 48000;
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, URL_, false);
  await page.evaluate(() => { window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }; });
  for (let rep = 0; rep < 6; rep++) {
    const r = await page.evaluate(async () => {
      const M = window.__M; M.P['dev.q'] = '1';
      const ctx = await window.__off(48000, 1, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 });
      const c = ctx.createConstantSource(); c.offset.value = 50; c.connect(M.A.pitchMod); c.start();
      let v; ctx.suspend(19 / 375).then(() => { v = M.playNote('zpf', ctx.currentTime, 440, 0.2, 0.75, {}); ctx.resume(); });
      const b = await ctx.startRendering();
      return { L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), R0: v.zn.st.R };
    });
    const x = pull(r), m = x.L.map((a, i) => 0.5 * (a + x.R[i]));
    const w = [0.06, 0.065, 0.07, 0.08].map((at) => L.cents(Z.peakHz(m, SR, 452.8, at, 4096), 440).toFixed(1));
    const e = L.env(m, SR, 0.005).slice(10, 40).map((v) => L.db(v).toFixed(0));
    console.log('cents at 0.06/0.065/0.07/0.08: ' + w.join(' / ') + '  R ' + r.R0.toFixed(2) + '  env ' + e.join(' '));
  }
  await browser.close();
})();
