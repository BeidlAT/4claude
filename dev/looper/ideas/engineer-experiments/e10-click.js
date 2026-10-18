// E10: the click detector of the test plan, on the prototype. A loop whose content does not fit its pass (a 441.3 Hz
// sine – a non-integer number of cycles per pass, plus a 30 Hz bass – the worst case for a seam) at 84 BPM, 2 bars,
// joined at each seam by a hard cut (X = 0), or by an equal-power crossfade of 2.5 / 10 / 40 ms over the recorded
// continuation. Metric: the peak of the 3rd difference of the output (an HF transient detector) within ±3 ms of
// each seam, against its peak in the middle of the passes; and in dB against the signal's own peak.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const LOOP = require('./loopproc.js');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  const r = await page.evaluate(async (LOOP) => {
    const SR = 48000, url = URL.createObjectURL(new Blob([LOOP], { type: 'text/javascript' }));
    const P = 8 * SR * 60 / 84, body = Math.ceil(P) + SR;   // the pass + 1 s of continuation (the sine simply goes on)
    const L = new Float32Array(body);
    for (let i = 0; i < body; i++) L[i] = 0.5 * Math.sin(2 * Math.PI * 441.3 * i / SR) + 0.3 * Math.sin(2 * Math.PI * 30 * i / SR + 1);
    const out = {};
    for (const [X, law] of [[0, 'sin'], [120, 'sin'], [480, 'sin'], [1920, 'sin'], [120, 'smooth'], [480, 'smooth'], [1920, 'smooth']]) {
      const D = 6 * P / SR + 1, ctx = new OfflineAudioContext(1, Math.ceil(D * SR), SR);
      await ctx.audioWorklet.addModule(url);
      const lp = new AudioWorkletNode(ctx, 'myzel-loop-proto', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { layers: [{ L, R: L, b0: 0, beats: 8, X, join: 'xf', law }] } });
      lp.connect(ctx.destination);
      const y = (await ctx.startRendering()).getChannelData(0);
      const d3 = (i) => Math.abs(y[i] - 3 * y[i - 1] + 3 * y[i - 2] - y[i - 3]);
      let seamPk = 0, midPk = 0, sigPk = 0;
      for (let k = 1; k <= 5; k++) {
        const s = Math.round(k * P);
        for (let i = s - 144; i < s + 144 + X; i++) seamPk = Math.max(seamPk, d3(i));
        const m = Math.round((k - 0.5) * P); for (let i = m - 2000; i < m + 2000; i++) midPk = Math.max(midPk, d3(i));
      }
      for (let i = 0; i < y.length; i++) sigPk = Math.max(sigPk, Math.abs(y[i]));
      out[law + ' ' + (X / 48).toFixed(1) + ' ms'] = { seamOverMid: +(seamPk / midPk).toFixed(2), seamD3dB: +(20 * Math.log10(seamPk / sigPk)).toFixed(1), midD3dB: +(20 * Math.log10(midPk / sigPk)).toFixed(1) };
    }
    return out;
  }, LOOP);
  for (const k in r) console.log(k.padEnd(14), JSON.stringify(r[k]));
  await browser.close();
})();
