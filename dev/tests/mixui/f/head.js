const { launch, page, start } = require('../t/lib.js');
(async () => {
  const b = await launch();
  for (const vp of [{ width: 390, height: 844, mobile: true }, { width: 360, height: 740, mobile: true }, { width: 844, height: 390, mobile: true }]) {
    const { ctx, pg } = await page(b, vp);
    await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(900);
    const r = await pg.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), Math.round(r.height)]; };
      return { head: box('.sheet-head'), title: box('#sheetTitle'), vsw: box('.mx-vsw'), panic: box('#btnPanic'), close: box('.sheet-head .iconbtn, .sheet-head button:last-child'), band: box('.mx-band'), reg: box('.mx-reg'), snap: box('.mx-snap'), morph: box('.mx-morph'), fk: box('.mx-fk'), loud: box('.mx-loud'), br: box('.mx-br'), scroll: box('.mx-scroll') };
    });
    console.log(vp.width, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
