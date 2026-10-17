// the other states and views: detail pages, Geflecht, legend, solo/mute, empty lanes, menu, morph
const { launch, page, start, VP } = require('./lib.js');
const which = process.argv[2] || 'phone', what = (process.argv[3] || 'det,g,leg,states,empty').split(',');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, which);
  await start(pg);
  await pg.click('#tab-mix'); await pg.waitForTimeout(1500);
  const S = (id, v) => pg.evaluate(([i, v]) => window.__M.setParam(i, v), [id, v]);
  const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: 's/' + which + '-' + n + '.png' }); };
  if (what.includes('det')) for (const k of ['fin', 'l0', 'sum', 'puls', 'dly']) {
    await pg.evaluate((k) => window.__MX.openDetail(k), k); await shot('det-' + k);
    if (VP[which].mobile && which !== 'land') { await pg.evaluate(() => { document.querySelector('.mxd-body').scrollTop = 420; }); await shot('det-' + k + '-2'); await pg.evaluate(() => { document.querySelector('.mxd-body').scrollTop = 900; }); await shot('det-' + k + '-3'); }
    await pg.evaluate(() => window.__MX.closeDetail());
  }
  if (what.includes('g')) { await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await shot('g'); await pg.evaluate(() => window.__MX.mxSetView('pult')); }
  if (what.includes('leg')) { await pg.evaluate(() => window.__MX.mxLegend(true)); await shot('leg'); await pg.evaluate(() => window.__MX.mxLegend(false)); }
  if (what.includes('states')) {
    await S('xl0.mute', true); await S('xl1.solo', true); await S('xl1.vol', 6); await S('xdly.solo', false);
    await shot('states');
    await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await shot('g-states'); await pg.evaluate(() => window.__MX.mxSetView('pult'));
    await S('xl0.mute', false); await S('xl1.solo', false); await S('xl1.vol', 0);
  }
  if (what.includes('empty')) {
    for (let i = 0; i < 4; i++) await S('l' + i + '.on', false);
    await shot('empty');
    await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await shot('g-empty'); await pg.evaluate(() => window.__MX.mxSetView('pult'));
    for (let i = 0; i < 2; i++) await S('l' + i + '.on', true);
  }
  if (what.includes('menu')) { await pg.click('.mx-store'); await shot('menu'); await pg.keyboard.press('Escape'); }
  console.log(which, pg.errors.length ? pg.errors : 'no errors');
  await ctx.close(); await b.close();
})();
