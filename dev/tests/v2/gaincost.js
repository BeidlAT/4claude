const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const r = await page.evaluate(async () => {
    const run = async (n, stereo) => {
      let best = Infinity;
      for (let k = 0; k < 5; k++) {
        const c = new OfflineAudioContext(2, 48000 * 20, 48000);
        const o = c.createOscillator(); let node = o;
        if (stereo) { const p = c.createStereoPanner(); o.connect(p); node = p; }
        for (let i = 0; i < n; i++) { const g = c.createGain(); g.gain.value = 1; node.connect(g); node = g; }
        node.connect(c.destination); o.start();
        const t0 = performance.now(); await c.startRendering(); best = Math.min(best, performance.now() - t0);
      }
      return best / 20 / 375;   // ms per 128-frame quantum... per second / 375 quanta
    };
    const out = {};
    for (const st of [false, true]) { const a = await run(0, st), b = await run(200, st); out[st ? 'stereo' : 'mono'] = { base_us: +(a * 1000).toFixed(2), per_gain_us: +(((b - a) / 200) * 1000).toFixed(3) }; }
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
