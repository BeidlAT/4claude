process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  const r = await page.evaluate(async () => {
    const M = window.__M;
    async function run(eng, q, n, f) {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, 4, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0 });
      await M.ensureDSP(ctx);
      ctx.suspend(19 / 375).then(() => { for (let k = 0; k < n; k++) M.playNote(eng, ctx.currentTime, f * (1 + k * 0.001), 0.6, 0.5, {}); ctx.resume(); });
      const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
    }
    const best = async (...a) => { let b = Infinity; for (let i = 0; i < 4; i++) b = Math.min(b, await run(...a)); return b; };
    const base = await best('neb', '1', 0, 220), neb = (await best('neb', '1', 24, 220)) - base, out = {};
    for (const f of [110, 220, 440]) for (const [e, q] of [['hlm', '1'], ['hlm', '3'], ['rnk', '1'], ['rnk', '3']]) out[e + q + '@' + f] = +(((await best(e, q, 24, f)) - base) / neb).toFixed(3);
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
