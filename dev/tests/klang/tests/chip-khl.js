process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'); const SR = 48000;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => { window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }; });
  for (const vib of [true, false]) {
  const r = await page.evaluate(async (vib) => {
    const M = window.__M; M.P['dev.q'] = '1';
    const ctx = await window.__off(48000, 0.6, Object.assign({ 'v.eng': 'khl', 'khl.silbe': 'chip', 'khl.rauheit': 0, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, vib ? {} : { 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 }));
    M.getQ().budget = 1e4; await M.ensureDSP(ctx);
    ctx.suspend(19 / 375).then(() => { M.playNote('khl', ctx.currentTime, 2000, 0.6, 0.75, {}); ctx.resume(); });
    const b = await ctx.startRendering(); return window.__b64(b.getChannelData(0));
  }, vib);
  const x = new Float32Array(Buffer.from(r, 'base64').buffer.slice(0)), T0 = 19 / 375;
  const bpf = (x, f) => { const w = 2 * Math.PI * f / SR, al = Math.sin(w) / 2, a0 = 1 + al, b0 = al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const zc = (x0, a, b, f) => { const x = bpf(x0, f); a = Math.round((T0 + a) * SR); b = Math.round((T0 + b) * SR); const c = []; let l = x[a]; for (let i = a + 1; i < b; i++) { if (l < 0 && x[i] >= 0) c.push(i - x[i] / (x[i] - l)); l = x[i]; } return c.length > 2 ? SR * (c.length - 1) / (c[c.length - 1] - c[0]) : 0; };
  console.log(vib ? 'default movement' : 'no vib/drift', [[0, 0.006], [0.006, 0.014], [0.014, 0.03], [0.03, 0.06], [0.06, 0.1], [0.2, 0.4]].map(([a, b]) => L.cents(zc(x, a, b, 2000), 2000).toFixed(0)).join(' '), ' env', L.env(x.subarray(Math.round(T0 * SR)), SR, 0.004).slice(0, 8).map((v) => L.db(v).toFixed(0)).join(' '));
  }
  await browser.close();
})();
