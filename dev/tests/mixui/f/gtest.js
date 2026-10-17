const { launch, page, start, touchDrag, line, tap, ok } = require('./lib.js');
(async () => {
  const b = await launch();
  for (const w of ['phone', 'p360']) {
    const { ctx, pg } = await page(b, w);
    await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(700);
    await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(800);
    const P = (id) => pg.evaluate((i) => window.__M.P[i], id), S = (id, v) => pg.evaluate(([i, v]) => window.__M.setParam(i, v), [id, v]);
    const G = await pg.evaluate(() => { const G = window.__MX.MXG, r = G.field.getBoundingClientRect(); return { x0: r.left + G.x0, top: r.top, u: G.u, soil: r.top + G.soilY }; });
    // boundary between Spur 2 (index 3) and Spur 3 (index 4), 2 px inside Spur 3
    const bx = G.x0 + 4 * G.u + 2, by = G.soil - 120;
    for (const id of ['xl1.vol', 'xl2.vol']) await S(id, -12);
    await pg.evaluate(() => window.__MX.selectChannel('l1'));
    await pg.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx, y: by }] }); await pg.waitForTimeout(60);
    const grab = await pg.evaluate(() => { const e = document.querySelector('.mxg-tag.grab'); return e && e.textContent; });
    await pg.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(200);
    ok(/Spur 2/.test(grab || ''), w + ' press near the boundary lights the chosen Spur 2 at once: ' + grab);
    await touchDrag(pg, line(bx, by, bx, by - 40, 10));
    ok(await P('xl1.vol') > -12 && await P('xl2.vol') === -12, w + ' near the boundary the chosen channel is taken: l1 ' + await P('xl1.vol') + ' l2 ' + await P('xl2.vol'));
    await S('xl1.vol', -12); await pg.evaluate(() => window.__MX.selectChannel('fin'));
    await touchDrag(pg, line(bx, by, bx, by - 40, 10));
    ok(await P('xl2.vol') > -12 && await P('xl1.vol') === -12, w + ' otherwise the column it landed in: l2 ' + await P('xl2.vol'));
    console.log(w, 'column width', G.u.toFixed(1), pg.errors);
    await ctx.close();
  }
  await b.close();
})();
