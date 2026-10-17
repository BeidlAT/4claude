const { launch, page, start, touchDrag, line, tap, ok } = require('./lib.js');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, 'phone');
  await start(pg);
  await pg.click('#tab-puls'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2)'); e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(500);
  const fd = await (await pg.$('.mxp-row:nth-child(2) .mxp-fd')).boundingBox();
  console.log(JSON.stringify(fd), await pg.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.className || e.tagName) + ' / ' + (e.closest('.mxp-row') ? e.closest('.mxp-row').getAttribute('aria-label') : ''); }, [fd.x + fd.width * 0.4, fd.y + 30]));
  await pg.screenshot({ path: 's/pb.png' });
  await ctx.close(); await b.close();
})();
