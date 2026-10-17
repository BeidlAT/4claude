const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const res = {};
  for (const round of [0, 1]) for (const url of ['mbase-inst', 'mnew-inst']) {
    const X = await openInst(browser, 'http://127.0.0.1:8790/' + url + '/index.html');
    const r = await X.page.evaluate(async () => {
      const M = window.__M, out = {};
      for (const [name, n, bor] of [['idle', 0, false], ['10neb', 10, false], ['10neb+bor', 10, true], ['30glo', 30, false]]) {
        let best = Infinity;
        for (let k = 0; k < 4; k++) {
          const sr = 48000, dur = 6;
          const ctx = await window.__off(sr, dur, { 'dev.q': '2', 'dev.lat': 'std', 'bor.on': bor, 'glo.decay': 12 });
          for (let i = 0; i < n; i++) M.playNote(name.includes('glo') ? 'glo' : 'neb', 0.01 + i * 0.002, 110 * Math.pow(2, (i % 12) / 12), 0.5, 0.5, { pan: (i % 5 - 2) * 0.2 });
          const t0 = performance.now(); await ctx.startRendering(); best = Math.min(best, performance.now() - t0);
        }
        out[name] = +(best / 6 / 10).toFixed(2);
      }
      return out;
    });
    res[url + round] = r;
    await X.page.context().close();
  }
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
