// is the soak's first long task the forced GC itself?
const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { ctx, pg } = await L.page(b, 'phone');
  await L.start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window.__LT = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__LT.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); });
  await pg.waitForTimeout(3000);
  console.log('3 s idle, mixer open: longtasks', JSON.stringify(await pg.evaluate(() => window.__LT.splice(0))));
  await pg.cdp.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(1000);
  console.log('after forced GC: longtasks', JSON.stringify(await pg.evaluate(() => window.__LT.splice(0))));
  await pg.cdp.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(1000);
  console.log('after 2nd forced GC: longtasks', JSON.stringify(await pg.evaluate(() => window.__LT.splice(0))));
  await ctx.close(); await b.close();
})();
