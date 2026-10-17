const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/new/index.html');
  await page.click('#btnStart'); await page.waitForTimeout(400);
  await page.click('#tab-klang'); await page.waitForTimeout(200);
  const pickEng = async (k) => { await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="alle"]'); await page.click(`.kq-tile[data-k="${k}"] .kq-pick`); await page.click('.kq-done'); };   // (stage 1b: the chips became the row + library)
  await pickEng('kor'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'out/klang-new.png' });
  await pickEng('stm'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'out/klang-stm.png' });
  await page.click('#tab-presets'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#sheetBody').scrollTop = 900);
  await page.screenshot({ path: 'out/presets-new.png' });
  console.log('errors', errors);
  await browser.close();
})();
