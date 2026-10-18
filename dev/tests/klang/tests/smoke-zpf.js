// Zapfen in the real app (offline contexts): the processor and the native stand-in side by side – level, pitch at the
// top, teeth per second low.   node smoke-zpf.js   env KD_URL, Y='0.2,0.6,1', F=220, PRM='{"zpf.koerper":"fels"}'
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'), Z = require('./zpflib');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-zpf-inst/index.html', SR = 48000;
const ys = (process.env.Y || '0.2,0.6,1').split(',').map(Number), F = +(process.env.F || 220), PRM = JSON.parse(process.env.PRM || '{}');
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  await page.evaluate(() => { window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }; });
  for (const native of [false, true]) for (const y of ys) {
    const r = await page.evaluate(async ([native, y, F, PRM]) => {
      const M = window.__M; M.P['dev.q'] = '1';
      const ctx = await window.__off(48000, 2.2, Object.assign({ 'v.eng': native ? 'neb' : 'zpf', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 }, PRM));
      if (!native) await M.ensureDSP(ctx);
      let v = null; ctx.suspend(19 / 375).then(() => { v = M.playNote('zpf', ctx.currentTime, F, y, 0.75, {}); ctx.resume(); });
      const b = await ctx.startRendering();
      return { L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), as: v && v.as, wk: !!(v && v.wk), cost: v && v.cost };
    }, [native, y, F, PRM]);
    const x = pull(r), m = x.L.map((a, i) => 0.5 * (a + x.R[i]));
    const rms = L.db(L.rms(m, 0.5 * SR, 2.1 * SR)), pk = L.db(L.peak(m));
    let extra = '';
    if (y >= 0.99) extra = ` f0 ${L.cents(Z.peakHz(m, SR, F, 1.0, 32768), F).toFixed(2)} ct floor ${Z.floor(m, SR, F, 1.0).toFixed(1)}`;
    console.log(`${native ? 'native ' : 'worklet'} y ${y}: as ${r.as} wk ${r.wk} cost ${r.cost}  rms ${rms.toFixed(1)} pk ${pk.toFixed(1)} ticks/s ${Z.ticks(m, SR, 0.3, 2.1).toFixed(1)}${extra}`);
  }
  console.log('errors: ' + errors.join(' | '));
  await browser.close();
})().catch((e) => { console.log('FATAL ' + e.stack); process.exit(1); });
