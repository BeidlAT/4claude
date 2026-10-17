const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  await page.goto('http://127.0.0.1:8790/new/index.html');
  await page.click('#btnStart'); await page.waitForTimeout(400);
  await page.click('#tab-rec'); await page.waitForTimeout(200);
  await page.click('#p-rec-len [data-val="bars"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'out/rec-bars.png' });
  await page.click('#btnRec'); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'out/rec-bars-running.png' });
  await browser.close();
})();
