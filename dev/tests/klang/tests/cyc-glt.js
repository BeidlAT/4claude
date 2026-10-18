// Chromium: what delay does a native cycle really have? a comb (delay → gain 0.9 → delay) rung by a click; its spacing = 1 / total delay (Glut native: +128 frames)
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html', false);
  for (const d of [128, 129, 200, 255, 256, 300, 500, 1000]) {
    const r = await page.evaluate(async (d) => {
      const ctx = new OfflineAudioContext(1, 48000, 48000);
      const dl = ctx.createDelay(1), g = ctx.createGain(); g.gain.value = 0.9; dl.delayTime.value = d / 48000;
      dl.connect(g).connect(dl); dl.connect(ctx.destination);
      const b0 = ctx.createBuffer(1, 4, 48000); b0.getChannelData(0)[0] = 1; const s = ctx.createBufferSource(); s.buffer = b0; s.connect(dl); s.start(0);
      const b = await ctx.startRendering(); const x = b.getChannelData(0); const ix = []; for (let i = 0; i < x.length && ix.length < 4; i++) if (Math.abs(x[i]) > 0.05) ix.push(i); return ix;
    }, d);
    console.log(`delayTime ${d} samples: impulses at ${r.join(', ')} → spacing ${r.length > 1 ? r[1] - r[0] : '?'}`);
  }
  await browser.close();
})();
