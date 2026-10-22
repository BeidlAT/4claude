// C3: cost of many suspend/resume round trips in one offline pass (continuous Höhe/glide curves replayed at suspends):
// a 6-s render with an oscillator, 0 / 40 / 400 / 2000 suspends; and the same while the main thread is busy 50 % (a
// 8-ms burn every 16 ms, like a UI frame).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/crit-inst/index.html');
  const r = await page.evaluate(async () => {
    const SR = 48000, D = 6, out = {};
    async function run(n, busy) {
      const ctx = new OfflineAudioContext(1, SR * D, SR), o = ctx.createOscillator(); o.connect(ctx.destination); o.start();
      for (let k = 1; k <= n; k++) { const t = Math.round(k * D / (n + 1) * SR / 128) * 128 / SR; ctx.suspend(t).then(() => { o.frequency.setValueAtTime(200 + k, ctx.currentTime); ctx.resume(); }); }
      let stop = false; if (busy) (function burn() { if (stop) return; const t0 = performance.now(); while (performance.now() - t0 < 8) {} setTimeout(burn, 8); })();
      const t0 = performance.now(); await ctx.startRendering(); stop = true; return +(performance.now() - t0).toFixed(0);
    }
    for (const n of [0, 40, 400, 2000]) { let a = Infinity, b = Infinity; for (let i = 0; i < 3; i++) { a = Math.min(a, await run(n, false)); b = Math.min(b, await run(n, true)); } out['susp' + n] = { idleMainMs: a, busyMainMs: b }; }
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
