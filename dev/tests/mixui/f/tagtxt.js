const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { ctx, pg } = await L.page(b, 'd1280');
  await L.start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(800);
  await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(800);
  console.log(await pg.evaluate(() => [...document.querySelectorAll('.mxg-tag')].map((t) => t.textContent + ' | font ' + getComputedStyle(t.lastChild).fontSize).join('\n')));
  await ctx.close(); await b.close();
})();
