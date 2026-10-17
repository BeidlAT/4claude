// the rest of the Puls panel's block on the phone (its sheet shows two rows at a time)
const L = require('./lib.js');
(async () => {
  const b = await L.launch();
  const { ctx, pg } = await L.page(b, 'phone');
  await L.start(pg); await pg.click('#tab-puls'); await pg.waitForTimeout(900);
  await pg.evaluate(() => document.querySelector('.mxp').scrollIntoView({ block: 'end' })); await pg.waitForTimeout(1200);
  await pg.screenshot({ path: __dirname + '/../final/phone-6-puls-block-p2.png' });
  console.log(pg.errors.length ? pg.errors : 'no errors');
  await ctx.close(); await b.close();
})();
