const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch();
  const X = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html', false);
  const r = await X.page.evaluate(async () => {
    const M = window.__M, sr = 48000, out = {};
    for (const q of ['1', '3']) for (const f of [110, 220, 440]) {
      M.P['dev.q'] = q;
      const ctx = await window.__off(sr, 2, { 'v.eng': 'mem', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'drv.mix': 0, 'cho.mix': 0, 'pha.mix': 0 });
      M.playNote('mem', 0.05, f, 0.5, 0.75, {});
      const buf = await ctx.startRendering();
      out[q + '/' + f] = window.__stats(buf, 0);
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 0));
  await browser.close();
})();
