// Screenshots of the Gestik card: phone portrait/landscape, desktop, iPad-like (no MIDI), learn mode.   node shot-gk.js
const { open, close, gestikOn } = require('./gk-h');
(async () => {
  for (const [nm, o] of [['phone', { mobile: true, cfg: { perm: 'gesture' } }], ['desk', { cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } }], ['ipad', { cfg: { noMidi: true, perm: 'gesture' } }]]) {
    const { page } = await open(o);
    if (nm === 'ipad') await page.setViewportSize({ width: 820, height: 1180 });
    await gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    await page.evaluate(() => window.__setPose({ beta: 30, roll: 14 }));
    await page.waitForTimeout(600);
    await page.evaluate(() => { const c = document.querySelector('.gk-card'); c.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/gk-' + nm + '.png' });
    if (nm === 'phone') {
      await page.evaluate(() => { document.querySelector('.gk-card details').open = true; document.querySelector('.gk-card details').dispatchEvent(new Event('toggle')); });
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('.gk-card details').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'shots/gk-phone-mess.png' });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelector('.gk-card').scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: 'shots/gk-phone-land.png' });
    }
    if (nm === 'desk') {
      await page.click('.kc-learn');
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelector('.gk-card').scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: 'shots/gk-desk-learn.png' });
    }
    await page.context().close();
  }
  await close();
})();
