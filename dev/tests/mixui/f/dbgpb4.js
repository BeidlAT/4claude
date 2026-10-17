const { launch, page, start } = require('./lib.js');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, 'phone');
  await start(pg);
  await pg.click('#tab-puls'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2)'); e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => window.__M.setParam('xl1.vol', -20)); await pg.waitForTimeout(100);
  console.log(await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2) .mxp-val'), r = e.getBoundingClientRect(), f = document.querySelector('.mxp-row:nth-child(2) .mxp-fd').getBoundingClientRect(); const hit = document.elementFromPoint(f.left + f.width * 0.4, f.top + 30); return JSON.stringify({ cls: e.className, r: [r.left, r.top, r.width, r.height], f: [f.left, f.top, f.width, f.height], hit: hit.className, txt: e.textContent }); }));
  await ctx.close(); await b.close();
})();
