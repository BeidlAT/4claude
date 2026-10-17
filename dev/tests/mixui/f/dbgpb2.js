const { launch, page, start, touchDrag, line, tap, ok } = require('./lib.js');
(async () => {
  const b = await launch();
  const { ctx, pg } = await page(b, 'phone');
  await start(pg);
  await pg.click('#tab-puls'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2)'); e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => { window.__log = []; for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'dblclick', 'click']) document.addEventListener(t, (e) => window.__log.push(t + ':' + e.pointerType + ':' + (e.target.className || e.target.tagName) + ':' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true);
    const sp = window.__M.setParam; });
  await pg.evaluate(() => window.__M.setParam('xl1.vol', -20));
  const fd = await (await pg.$('.mxp-row:nth-child(2) .mxp-fd')).boundingBox();
  console.log('fd', JSON.stringify(fd));
  await touchDrag(pg, line(fd.x + fd.width * 0.4, fd.y + 30, fd.x + fd.width * 0.4 + 12, fd.y + 30, 3), { stepMs: 10, after: 20 });
  console.log('after nudge', await pg.evaluate(() => window.__M.P['xl1.vol']));
  console.log((await pg.evaluate(() => window.__log)).join('\n'));
  const fd2 = await (await pg.$('.mxp-row:nth-child(2) .mxp-fd')).boundingBox();
  console.log('fd after', JSON.stringify(fd2));
  await ctx.close(); await b.close();
})();
