// Render time of busy presets, published build vs mixer build (offline, same notes), best of 3
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const res = {};
  for (const url of ['mbase-inst', 'mnew-inst']) {
    const X = await openInst(browser, 'http://127.0.0.1:8790/' + url + '/index.html');
    res[url] = await X.page.evaluate(async () => {
      const M = window.__M, out = {};
      for (const key of ['pilzregen', 'tiefsee', 'kalimbatraum', 'idle']) {
        let best = Infinity;
        for (let k = 0; k < 3; k++) {
          const sr = 48000, dur = 8;
          const params = Object.assign({ 'dev.q': '2', 'dev.lat': 'std' }, key === 'idle' ? {} : M.PRESETS.find((p) => p.key === key).v);
          const ctx = await window.__off(sr, dur, params);
          if (key !== 'idle') {
            const S = M.SEQ; S.on = true; S.anchorT = 0.05; S.anchorB = 0; S.bpm = M.P['seq.bpm'];
            S.lanes.forEach((L) => { L.n = 0; L.div = 0; L.walk = 0; L.last = 0; });
            for (let t = 0.0371; t < dur - 0.2; t += 0.05) ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.seqTick(ctx.currentTime + 0.07); ctx.resume(); });
          }
          const t0 = performance.now();
          if (key === 'idle') await ctx.startRendering(); else await window.__phrase(ctx, sr, dur, { step: 0.4, hold: 0.8 });
          best = Math.min(best, performance.now() - t0);
          M.SEQ.on = false;
        }
        out[key] = +(best / 8 / 10).toFixed(2);   // % of one core for real time
      }
      return out;
    });
    await X.page.context().close();
  }
  console.log(JSON.stringify(res));
  await browser.close();
})();
