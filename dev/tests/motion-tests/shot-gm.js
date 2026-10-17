// Screenshots for part 2 (not a test): the Gestik card's options with Fingerhalt (phone), the learn banner refusing a
// patch parameter for a Gestik axis, the search listing Formen, a Gestik binding row.   node shot-gm.js
const { open, close, gestikOn } = require('./gm-h');
(async () => {
  const { page } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(() => { window.__sensor(true, { beta: 45, roll: 0 }); window.__M.gkSet('clutch', 'immer'); });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.gk-card .kc-opts').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/gm-card-opts.png' });
  await page.click('.kc-learn');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__M.learnPick('rev.size'));
  await page.evaluate(async () => { for (let i = 1; i <= 10; i++) { window.__setPose({ beta: 45 - i * 2.5, roll: 0 }); await window.__sleep(50); } });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/gm-learn-refused.png' });
  await page.fill('.mlearn-bar .ml-q', 'formen');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/gm-learn-search.png' });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.mlearn-bar .ml-list button')].find((x) => /Höhe/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(600);
  await page.click('.mlearn-bar .btn:not(.ghost)');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const g = [...document.querySelectorAll('.kc-bg')].find((x) => /Gestik/.test(x.textContent)); if (g) g.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/gm-binding-row.png' });
  await page.context().close();
  await close();
})();
