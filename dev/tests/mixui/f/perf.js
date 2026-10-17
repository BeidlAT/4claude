const { launch, page, start, stat } = require('./lib.js');
(async () => {
  const b = await launch();
  for (const w of ['d1280', 'd1440', 'phone']) {
    const { ctx, pg } = await page(b, w);
    await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1500);
    const run = async (label, prep) => {
      await pg.evaluate(prep); await pg.waitForTimeout(800);
      await pg.evaluate(() => { window.__MXT = []; }); await pg.waitForTimeout(4000);
      const t = await pg.evaluate(() => window.__MXT.slice());
      console.log(w, label.padEnd(9), JSON.stringify(stat(t)), 'fps≈' + (t.length / 4).toFixed(0));
    };
    await run('pult', () => {});
    await run('geflecht', () => window.__MX.mxSetView('geflecht'));
    await run('det-l0', () => { window.__MX.mxSetView('pult'); window.__MX.openDetail('l0'); });
    await run('det-sum', () => window.__MX.openDetail('sum'));
    await pg.evaluate(() => window.__MX.closeDetail());
    if (pg.errors.length) console.log(pg.errors);
    await ctx.close();
  }
  await b.close();
})();
