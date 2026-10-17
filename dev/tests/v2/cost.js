// Render time old vs new, level 1, same phrase (interleaved rounds, medians): does the new master cost more?
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const B = await openInst(browser, 'http://127.0.0.1:8790/base-inst/index.html');
  const N = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html');
  const res = { old: { idle: [], play: [] }, new: { idle: [], play: [] } };
  for (let r = 0; r < 5; r++) for (const [name, X] of (r % 2 ? [['new', N], ['old', B]] : [['old', B], ['new', N]])) {
    const t = await X.page.evaluate(async () => {
      const sr = 48000, dur = 6, out = {};
      let ctx = await window.__off(sr, dur, { 'dev.q': '1', 'dev.lat': 'std' });
      let t0 = performance.now(); await ctx.startRendering(); out.idle = performance.now() - t0;
      ctx = await window.__off(sr, dur, { 'dev.q': '1', 'dev.lat': 'std', 'v.eng': 'neb' });
      t0 = performance.now(); await window.__phrase(ctx, sr, dur, { step: 0.15, hold: 0.5 }); out.play = performance.now() - t0;
      return out;
    });
    res[name].idle.push(t.idle); res[name].play.push(t.play);
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(0);
  for (const k of ['old', 'new']) console.log(k, 'idle ms/6s', med(res[k].idle), ' play ms/6s', med(res[k].play));
  await browser.close();
})();
