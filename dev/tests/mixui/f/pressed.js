const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { ctx, pg } = await L.page(b, 'p360');
  await L.start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { const M = window.__M; M.setParam('xfin.mute', true); M.setParam('xeb2.solo', true); });
  await pg.waitForTimeout(700);
  console.log(await pg.evaluate(() => ['fin', 'eb2'].map((k) => { const st = document.querySelector('.mx-st[data-k="' + k + '"]'); return k + ' M ' + getComputedStyle(st.querySelector('.mx-m span')).backgroundColor + ' / S ' + getComputedStyle(st.querySelector('.mx-s span')).backgroundColor; }).join('\n')));
  await pg.screenshot({ path: '../qa/p360-pressed.png', clip: { x: 0, y: 560, width: 360, height: 120 } });
  console.log(pg.errors.length ? pg.errors : 'no errors');
  await ctx.close(); await b.close();
})();
