const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ width: 390, height: 844, mobile: true, n: 'p390' }, { width: 360, height: 740, mobile: true, n: 'p360' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:8790/mix/index.html'); await page.click('#btnStart'); await page.waitForTimeout(600);
    await page.click('#btnPuls'); await page.click('#tab-puls'); await page.waitForTimeout(1500);
    await page.screenshot({ path: 'out/puls-' + vp.n + '.png' });
    // solo is not saved: set solo, reload, check
    await page.click('#tab-mix'); await page.waitForTimeout(800);
    console.log(vp.n, errors);
    await ctx.close();
  }
  await browser.close();
})();
