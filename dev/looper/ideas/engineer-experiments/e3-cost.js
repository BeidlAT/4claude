// E3: what does the looper processor cost on the audio thread, in Nebel units (the cost.js method: render time of
// 24 level-1 Nebel voices per voice-second, offline, in the same page)? Cases: capture only (9 stereo inputs into the
// ring), + 4 / 16 stereo layers playing (half overlap-add seams, half crossfades; 2-bar bodies + 2 s continuation).
process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const LOOP = require('./loopproc.js');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/eng-inst/index.html', false);
  const r = await page.evaluate(async (LOOP) => {
    const M = window.__M, SR = 48000, D = 20;
    const url = URL.createObjectURL(new Blob([LOOP], { type: 'text/javascript' }));
    async function nebUnit() {
      M.P['dev.q'] = '1'; const DU = 4;
      const c0 = await window.__off(SR, DU, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0 }); let t0 = performance.now(); await c0.startRendering(); const b = performance.now() - t0;
      const c = await window.__off(SR, DU, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0 });
      c.suspend(19 / 375).then(() => { for (let k = 0; k < 24; k++) M.playNote('neb', c.currentTime, M.noteAt((k * 0.37) % 1).f, 0.6, 0.5, {}); c.resume(); });
      t0 = performance.now(); await c.startRendering(); return (performance.now() - t0 - b) / 24 / DU;
    }
    const noise = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return a; };
    const body = Math.round(8 * SR * 60 / 84) + 2 * SR;
    const bufs = Array.from({ length: 16 }, () => [noise(body), noise(body)]);
    async function run(nLayers, withLoop) {
      const ctx = new OfflineAudioContext(2, SR * D, SR);
      await ctx.audioWorklet.addModule(url);
      const srcs = [];
      for (let i = 0; i < 9; i++) { const b = ctx.createBuffer(2, SR, SR); b.getChannelData(0).set(noise(SR)); b.getChannelData(1).set(noise(SR)); const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.start(); srcs.push(s); }
      if (withLoop) {
        const layers = []; for (let i = 0; i < nLayers; i++) layers.push({ L: bufs[i][0], R: bufs[i][1], b0: i * 0.25, beats: 8, X: 480, join: i % 2 ? 'xf' : 'ola', gain: 0.1 });
        const lp = new AudioWorkletNode(ctx, 'myzel-loop-proto', { numberOfInputs: 9, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { nIn: 9, mask: 0x1ff, ringFrames: SR * 64, layers } });
        srcs.forEach((s, i) => s.connect(lp, 0, i)); lp.connect(ctx.destination);
      } else { const g = ctx.createGain(); g.gain.value = 0; srcs.forEach((s) => s.connect(g)); g.connect(ctx.destination); }
      const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
    }
    const best = {}; const keep = (k, v) => { best[k] = Math.min(best[k] == null ? Infinity : best[k], v); };
    for (let i = 0; i < 4; i++) {
      keep('unit', await nebUnit());
      keep('base', await run(0, false)); keep('cap', await run(0, true)); keep('l4', await run(4, true)); keep('l16', await run(16, true));
    }
    const u = (k) => +((best[k] - best.base) / D / best.unit).toFixed(2);
    return { unitMsPerVoiceS: +best.unit.toFixed(2), baseMs: Math.round(best.base), captureOnly: u('cap'), layers4: u('l4'), layers16: u('l16'), perLayer: +(((best.l16 - best.cap) / 16) / D / best.unit).toFixed(3) };
  }, LOOP);
  console.log(JSON.stringify(r));
  await browser.close();
})();
