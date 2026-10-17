const { open, ok, close, gestikOn } = require('./gk-h');
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
  await page.waitForTimeout(800);
  const a = await page.evaluate(() => [...document.querySelectorAll('.gk-card details')].map((d) => d.className + ':' + d.open + ':' + d.querySelector('summary').textContent.slice(0, 20)));
  console.log(a);
  await page.click('.gk-card details.gk-mehr > summary');
  await page.waitForTimeout(200);
  console.log(await page.evaluate(() => [...document.querySelectorAll('.gk-card details')].map((d) => d.className + ':' + d.open)));
  await page.click('.gk-card details summary:has-text("Messen")');
  await page.waitForTimeout(400);
  console.log(await page.evaluate(() => [...document.querySelectorAll('.gk-card details')].map((d) => d.className + ':' + d.open)), await page.evaluate(() => document.querySelector('.gk-mess').innerHTML.slice(0, 200)));
  console.log(errors);
  await close();
})();
