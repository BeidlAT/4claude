const { launch, page } = require('./lib.js');
(async () => {
  const b = await launch();
  for (const w of [{ ...require('./lib.js').VP.phone }, { ...require('./lib.js').VP.d1280, reduced: true }]) {
    const { ctx, pg } = await page(b, w);
    await pg.evaluate(() => { const s = document.querySelector('#start'); if (s) s.hidden = true; window.__MX.openPanel('mix'); }); await pg.waitForTimeout(1200);
    for (const k of ['fin', 'sum', 'puls', 'l2']) { await pg.evaluate((k) => window.__MX.openDetail(k), k); await pg.waitForTimeout(300); }
    await pg.evaluate(() => window.__MX.closeDetail()); await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(500);
    await pg.evaluate(() => window.__MX.mxSetView('pult')); await pg.waitForTimeout(500);
    await pg.screenshot({ path: 's/' + (w.reduced ? 'd1280-reduced-nosound' : 'phone-nosound') + '.png' });
    console.log(w.width, w.reduced ? 'reduced' : '', 'errors', pg.errors);
    await ctx.close();
  }
  await b.close();
})();
