// Böe: a screenshot of its engine section (390×844) and the Luft tiles in the library – k-boe/demo/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const URL_ = process.env.KN_URL || 'http://127.0.0.1:8790/kn-boe-inst/index.html', OUT = path.join(__dirname, '..', 'demo');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL_); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__M.setParam('v.eng', 'boe'); window.__M.openPanel('klang'); });
  await page.waitForTimeout(800);
  const sec = await page.evaluate(() => { const s = window.__M.engSecs.boe; s.scrollIntoView(); return s.textContent.replace(/\s+/g, ' ').slice(0, 900); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'section-boe.png') });
  console.log(sec);
  await page.click('#p-v-eng .kq-name'); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'library-luft.png') });
  console.log('errors: ' + errors.join(' | '));
  await browser.close();
})();
