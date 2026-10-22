// E7: what does starting a fresh offline render context cost (new OfflineAudioContext + adding the engine module)?
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html'); await page.waitForFunction(() => !!window.__M);
  const r = await page.evaluate(async () => {
    const M = window.__M, url = URL.createObjectURL(new Blob([M.MYZEL_DSP_SRC], { type: 'text/javascript' })), t = [];
    for (let i = 0; i < 8; i++) { const t0 = performance.now(); const c = new OfflineAudioContext(2, 48000 * 8, 48000); await c.audioWorklet.addModule(url); new AudioWorkletNode(c, 'myzel-tap'); t.push(+(performance.now() - t0).toFixed(1)); }
    return { moduleKB: Math.round(M.MYZEL_DSP_SRC.length / 1024), ms: t };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
