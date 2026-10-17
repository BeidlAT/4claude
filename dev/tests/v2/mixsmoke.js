const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ width: 390, height: 844, mobile: true }, { width: 1280, height: 800 }]) {
    const ctx = await browser.newContext(vp.mobile ? { viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: vp });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(process.env.URL || 'http://127.0.0.1:8790/mix-inst/index.html'); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(600);
    await page.evaluate(() => window.__M.seqStart());
    await page.click('#tab-mix'); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => { const M = window.__M; return { tabs: document.querySelectorAll('.tab').length, meter: M.MIX.meter, l0: M.MIX.s.l0.m && M.MIX.s.l0.m.pk[0], lufs: M.A.lufs && M.A.lufs.s }; });
    console.log(vp.width, JSON.stringify(r), errors);
    await page.screenshot({ path: 'out/mixsmoke-' + vp.width + '.png' });
    await ctx.close();
  }
  await browser.close();
})();
