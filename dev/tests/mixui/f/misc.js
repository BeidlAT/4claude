const { launch, page, start } = require('./lib.js');
(async () => {
  const b = await launch();
  let { ctx, pg } = await page(b, 'phone');
  await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.__M.setParam('xl1.solo', true));
  await pg.evaluate(() => window.__MX.openDetail('fin')); await pg.waitForTimeout(800);
  await pg.screenshot({ path: 's/phone-det-solo.png' });
  await pg.evaluate(() => window.__MX.closeDetail()); await pg.waitForTimeout(400);
  await pg.screenshot({ path: 's/phone-solo.png' });
  await pg.evaluate(() => window.__M.setParam('xl1.solo', false));
  await pg.click('.mx-store'); await pg.waitForTimeout(400); await pg.screenshot({ path: 's/phone-menu.png' }); await pg.keyboard.press('Escape');
  // Puls panel block
  await pg.click('#tab-puls'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { document.querySelector('.mxp').scrollIntoView({ block: 'start' }); }); await pg.waitForTimeout(600);
  await pg.screenshot({ path: 's/phone-pulsblock.png' });
  console.log('phone', pg.errors);
  await ctx.close();
  ({ ctx, pg } = await page(b, 'd1280'));
  await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1200);
  await pg.focus('.mx-store'); await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Tab'); await pg.waitForTimeout(200);
  await pg.screenshot({ path: 's/d1280-focus.png', clip: { x: 840, y: 110, width: 440, height: 120 } });
  await pg.click('.mx-store'); await pg.waitForTimeout(300); await pg.screenshot({ path: 's/d1280-menu.png' }); await pg.keyboard.press('Escape');
  await pg.evaluate(() => window.__MX.openDetail('puls')); await pg.waitForTimeout(900); await pg.screenshot({ path: 's/d1280-det-puls.png' });
  await pg.evaluate(() => window.__MX.openDetail('dly')); await pg.waitForTimeout(900); await pg.screenshot({ path: 's/d1280-det-dly.png' });
  console.log('desk', pg.errors);
  await ctx.close();
  for (const w of ['p360', 'land']) {
    ({ ctx, pg } = await page(b, w));
    await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1200);
    await pg.evaluate(() => window.__MX.openDetail('l0')); await pg.waitForTimeout(900); await pg.screenshot({ path: 's/' + w + '-det-l0.png' });
    await pg.evaluate(() => window.__MX.closeDetail()); await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(900); await pg.screenshot({ path: 's/' + w + '-g.png' });
    console.log(w, pg.errors);
    await ctx.close();
  }
  await b.close();
})();
