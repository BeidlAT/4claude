const { open, close } = require('./gk-h');
(async () => {
  for (const [nm, o] of [['iphone', { mobile: true, cfg: { noMidi: true, perm: 'gesture' } }], ['android', { mobile: true, cfg: {} }]]) {
    const { page } = await open(o);
    if (nm === 'iphone') await page.evaluate(() => { try { delete Navigator.prototype.bluetooth; } catch (e) {} window.__M.updDevUI(); });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/tile-' + nm + '.png' });
    await page.context().close();
  }
  await close();
})();
