// cost of the first-time builds: mixer open, Geflecht, detail (each kind), legend, Puls panel block
const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  for (const w of [process.argv[2] || 'phone']) {
    const { ctx, pg } = await L.page(b, w);
    await L.start(pg);
    await pg.evaluate(() => { window.__LT = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__LT.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); });
    const time = async (lab, fn, arg) => {
      const r = await pg.evaluate(async ([f, a]) => {
        const t0 = performance.now(); (0, eval)('(' + f + ')')(a); const t1 = performance.now();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return [+(t1 - t0).toFixed(1), +(performance.now() - t0).toFixed(1)];
      }, [fn.toString(), arg]);
      await pg.waitForTimeout(400);
      const lt = await pg.evaluate(() => window.__LT.splice(0));
      console.log(w, lab.padEnd(22), 'sync', r[0], 'ms, to 2nd frame', r[1], 'ms, longtasks', JSON.stringify(lt));
    };
    await time('open mixer (1st)', () => window.__MX.openPanel('mix'));
    await time('geflecht (1st)', () => window.__MX.mxSetView('geflecht'));
    await time('pult again', () => window.__MX.mxSetView('pult'));
    await time('detail fin (1st)', () => window.__MX.openDetail('fin'));
    await time('detail l0 (1st)', () => window.__MX.openDetail('l0'));
    await time('detail l0 (2nd)', () => { window.__MX.closeDetail(); window.__MX.openDetail('l0'); });
    await time('detail sum (1st)', () => window.__MX.openDetail('sum'));
    await time('detail puls (1st)', () => window.__MX.openDetail('puls'));
    await time('close detail', () => window.__MX.closeDetail());
    await time('legend (1st)', () => window.__MX.mxLegend(true));
    await time('legend close', () => window.__MX.mxLegend(false));
    await time('puls panel (1st)', () => window.__MX.openPanel('puls'));
    await time('mixer again', () => window.__MX.openPanel('mix'));
    console.log(w, 'errors', pg.errors.length ? pg.errors : 'none');
    await ctx.close();
  }
  await b.close();
})();
