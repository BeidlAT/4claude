// screenshots of the default mix on the given viewports (+ measurements), e.g. node shots.js phone p360 d1280
const { launch, page, start, VP } = require('./lib.js');
const which = process.argv.slice(2).length ? process.argv.slice(2) : ['phone', 'p360', 'd1280', 'd1440', 'land'];
const tag = process.env.TAG || '';
(async () => {
  const b = await launch();
  for (const w of which) {
    const { ctx, pg } = await page(b, w);
    await start(pg);
    await pg.click('#tab-mix'); await pg.waitForTimeout(2200);
    const r = await pg.evaluate(() => {
      const M = window.__MX.MX, q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
      return { strip: M.strip, travel: M.ch.fin.g && +M.ch.fin.g.span.toFixed(1), sumTravel: M.ch.sum.g && +M.ch.sum.g.span.toFixed(1), sumW: M.sumW, band: q('.mx-band'), reg: q('.mx-reg:not([hidden])'), regc: q('.mx-regc:not([hidden])'), head: q('.sheet-head'), soil: M.soil, scroll: M.scrollable };
    });
    console.log(w, JSON.stringify(r), pg.errors.length ? pg.errors : '');
    await pg.screenshot({ path: 's/' + w + tag + '.png' });
    await ctx.close();
  }
  await b.close();
})();
