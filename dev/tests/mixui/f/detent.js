const { launch, page, start, touchDrag, line, ok } = require('./lib.js');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, 'phone');
  await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(600);
  await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(700);
  const C = await pg.evaluate(() => { const G = window.__MX.MXG, r = G.field.getBoundingClientRect(), c = G.cols[3]; return { x: r.left + c.cx, y: r.top + c.y }; });
  for (const [label, n, ms] of [['fast (8 steps, ~0,2 s)', 8, 4], ['slow (24 steps, ~1 s)', 24, 30]]) {
    await pg.evaluate(() => window.__M.setParam('xl1.vol', -12)); await pg.waitForTimeout(200);
    const t0 = Date.now();
    await touchDrag(pg, line(C.x, C.y + 20, C.x, C.y + 600, n), { stepMs: ms });
    console.log('info', label, 'took', Date.now() - t0, 'ms → vol', await pg.evaluate(() => window.__M.P['xl1.vol']));
  }
  await ctx.close(); await b.close();
})();
