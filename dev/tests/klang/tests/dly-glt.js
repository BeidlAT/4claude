// Chromium: how does a DelayNode interpolate a fractional delay? an impulse through 300.25 / 300.5 frames (Glut native: linear)
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html', false);
  for (const d of [300.25, 300.5]) {
    const r = await page.evaluate(async (d) => {
      const ctx = new OfflineAudioContext(1, 1024, 48000), dl = ctx.createDelay(0.1); dl.delayTime.value = d / 48000;
      const b = ctx.createBuffer(1, 1, 48000); b.getChannelData(0)[0] = 1; const s = ctx.createBufferSource(); s.buffer = b; s.connect(dl).connect(ctx.destination); s.start(0);
      const out = await ctx.startRendering(); const x = out.getChannelData(0), nz = []; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 1e-6) nz.push(i + ':' + x[i].toFixed(4)); return nz;
    }, d);
    console.log('delay ' + d + ' → ' + r.join(' '));
  }
  await browser.close();
})();
