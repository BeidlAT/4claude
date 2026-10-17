const { launch, page, start } = require('./lib.js');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, 'phone');
  await start(pg);
  await pg.click('#tab-puls'); await pg.waitForTimeout(800);
  console.log(await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2) .mxp-val'); const cs = getComputedStyle(e), r = e.getBoundingClientRect(), a = getComputedStyle(e, '::after'); return JSON.stringify({ pos: cs.position, w: r.width, h: r.height, l: r.left, t: r.top, after: [a.position, a.top, a.bottom, a.left, a.right, a.content] }); }));
  await ctx.close(); await b.close();
})();
