const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8790/new/index.html');
  const r = await page.evaluate(async () => {
    const CMP_SPAN = 256, CMP_DB = 64, CMP_KNEE = 10, CMP_DET = 1.25;
    const ABS_CURVE = (() => { const n = 2049, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.abs((i / (n - 1)) * 2 - 1); return c; })();
    function cmpOverCurve() { const n = 32769, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; if (x <= 0) continue; const d = 20 * Math.log10(x * CMP_SPAN); const over = d <= -CMP_KNEE / 2 ? 0 : d >= CMP_KNEE / 2 ? d : Math.pow(d + CMP_KNEE / 2, 2) / (2 * CMP_KNEE); c[i] = Math.min(1, over / CMP_DB); } return c; }
    function cmpGainCurve() { const n = 4097, c = new Float32Array(n); for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * 2 - 1; c[i] = u <= 0 ? 1 : Math.pow(10, -CMP_DB * u / 20); } return c; }
    const sr = 48000, out = {};
    async function stage(k) {
      const ctx = new OfflineAudioContext(1, sr * 2, sr);
      const G = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
      const BQ = (f) => { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = -3; return b; };
      const sh = (c) => { const w = ctx.createWaveShaper(); w.curve = c; return w; };
      const o = ctx.createOscillator(); o.frequency.value = 220; o.start();
      const det = G(0.25); o.connect(det);
      const mono = G(1); mono.channelCount = 1; mono.channelCountMode = 'explicit'; mono.channelInterpretation = 'speakers';
      det.connect(sh(ABS_CURVE)).connect(mono);
      const f1 = BQ(28), f2 = BQ(28); const a = Math.exp(-1 / (0.23 * sr)); const sl = ctx.createIIRFilter([1 - a], [1, -a]); mono.connect(f1).connect(f2); mono.connect(sl);
      const half = G(0.5), diff = G(1), neg = G(-1), halfD = G(0.5);
      f2.connect(half); sl.connect(half); f2.connect(diff); sl.connect(neg).connect(diff);
      const thr = G(4 * CMP_DET / Math.pow(10, -36 / 20) / CMP_SPAN), rat = G(1 - 1 / 7.5);
      half.connect(thr); diff.connect(sh(ABS_CURVE)).connect(halfD).connect(thr);
      const ws1 = sh(cmpOverCurve()), ws2 = sh(cmpGainCurve());
      thr.connect(ws1).connect(rat).connect(ws2);
      const taps = { mono, f2, sl, half, halfD, thr, ws1, rat, ws2 };
      taps[k].connect(ctx.destination);
      const b = await ctx.startRendering(); const d = b.getChannelData(0); let s = 0, n = 0; for (let i = sr * 1.5; i < d.length; i++) { s += d[i]; n++; } return +(s / n).toFixed(5);
    }
    for (const k of ['mono', 'f2', 'sl', 'half', 'halfD', 'thr', 'ws1', 'rat', 'ws2']) out[k] = await stage(k);
    return out;
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
