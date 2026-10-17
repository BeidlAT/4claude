const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const B = await openInst(browser, 'http://127.0.0.1:8790/mbase-inst/index.html');
  const N = await openInst(browser, 'http://127.0.0.1:8790/mnew-inst/index.html');
  const one = (X, name) => X.page.evaluate(async (name) => {
    const M = window.__M, sr = 48000, dur = 8;
    const pre = name === 'tiefsee' ? M.PRESETS.find((p) => p.key === 'tiefsee').v : {};
    const ctx = await window.__off(sr, dur, Object.assign({ 'dev.q': '2', 'dev.lat': 'std', 'glo.decay': 12 }, pre, name === 'bor' ? { 'bor.on': true } : {}));
    const eng = name === 'tiefsee' ? 'neb' : 'glo';
    for (let i = 0; i < 24; i++) M.playNote(eng, 0.01 + i * 0.002, 110 * Math.pow(2, (i % 12) / 12), 0.5, 0.5, { pan: (i % 5 - 2) * 0.2 });
    const t0 = performance.now(); await ctx.startRendering(); return (performance.now() - t0) / dur / 10;
  }, name);
  for (const name of ['glo', 'tiefsee', 'bor']) {
    const b = [], n = [];
    for (let k = 0; k < 8; k++) { b.push(await one(B, name)); n.push(await one(N, name)); }
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    console.log(name.padEnd(8), 'base min/med', Math.min(...b).toFixed(2), med(b).toFixed(2), '  new min/med', Math.min(...n).toFixed(2), med(n).toFixed(2));
  }
  await browser.close();
})();
