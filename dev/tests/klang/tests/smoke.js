const { chromium, openInst } = require('../../v2/lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html');
  const r = await page.evaluate(async () => {
    const M = window.__M, sr = 48000;
    const ctx = await window.__off(sr, 3, { 'v.eng': 'hlm', 'rev.mix': 0, 'dly.mix': 0 });
    const ok = await M.ensureDSP(ctx);
    const v = M.playNote('hlm', 0.05, 220, 0.6, 0.75, {});
    const v2 = M.playNote('rnk', 0.05, 330, 0.6, 0.75, {});
    ctx.suspend(1.5).then(() => { v.release(); v2.release(); ctx.resume(); });
    const b = await ctx.startRendering();
    return { ok, as: v && v.as, as2: v2 && v2.as, st: window.__stats(b, 0.2), late: window.__stats(b, 2.6), voices: M.A.voices.size };
  });
  console.log(JSON.stringify(r), errors);
  await browser.close();
})();
