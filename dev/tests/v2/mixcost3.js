const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const res = {};
  for (const round of [0, 1, 2]) for (const [url, variant] of [['mbase-inst', ''], ['mnew-inst', ''], ['mnew-inst', 'finbypass']]) {
    const X = await openInst(browser, 'http://127.0.0.1:8790/' + url + '/index.html');
    const r = await X.page.evaluate(async (variant) => {
      const M = window.__M, out = {};
      for (const [name, extra] of [['30glo', {}], ['30glo dry', { 'dly.mix': 0, 'rev.mix': 0 }]]) {
        let best = Infinity;
        for (let k = 0; k < 3; k++) {
          const sr = 48000, dur = 6;
          const ctx = await window.__off(sr, dur, Object.assign({ 'dev.q': '2', 'dev.lat': 'std', 'glo.decay': 12 }, extra));
          if (variant === 'finbypass') M.MIX.s.fin.in = M.A.voiceBus;
          for (let i = 0; i < 30; i++) M.playNote('glo', 0.01 + i * 0.002, 110 * Math.pow(2, (i % 12) / 12), 0.5, 0.5, { pan: (i % 5 - 2) * 0.2 });
          const t0 = performance.now(); await ctx.startRendering(); best = Math.min(best, performance.now() - t0);
        }
        out[name] = +(best / 6 / 10).toFixed(2);
      }
      return out;
    }, variant);
    const key = url + (variant ? ':' + variant : '');
    res[key] = (res[key] || []).concat([r]);
    await X.page.context().close();
  }
  for (const k in res) console.log(k.padEnd(24), ['30glo', '30glo dry'].map((n) => n + ' ' + Math.min(...res[k].map((r) => r[n])).toFixed(2)).join('  '));
  await browser.close();
})();
