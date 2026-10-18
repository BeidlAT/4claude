// E5: a note started "now" from the main thread (start(ctx.currentTime), as onDown does) – where does it really begin
// in the rendered stream, against round(currentTime·SR)? And a note scheduled 50 ms ahead (as the Puls does)?
// A live context; a detector worklet reports the frame of every onset it sees.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  const r = await page.evaluate(async () => {
    const src = `class Det extends AudioWorkletProcessor { constructor() { super(); this.on = false; }
      process(inp) { const a = inp[0] && inp[0][0]; if (!a) { this.on = false; return true; }
        for (let k = 0; k < a.length; k++) { const x = a[k] !== 0; if (x && !this.on) this.port.postMessage(currentFrame + k); this.on = x; } return true; } }
      registerProcessor('e5-det', Det);`;
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const det = new AudioWorkletNode(ctx, 'e5-det', { numberOfInputs: 1, numberOfOutputs: 0 });
    await ctx.resume();
    const SR = ctx.sampleRate, onsets = [];
    det.port.onmessage = (e) => onsets.push(e.data);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(300);
    const res = { now: [], ahead: [] };
    for (const mode of ['now', 'ahead']) {
      for (let i = 0; i < 60; i++) {
        await sleep(30 + Math.random() * 40);
        const t = ctx.currentTime + (mode === 'ahead' ? 0.05 : 0);
        const c = ctx.createConstantSource(); c.offset.value = 1; c.connect(det); c.start(t); c.stop(t + 0.01);
        const n0 = onsets.length; await sleep(mode === 'ahead' ? 90 : 40);
        if (onsets.length > n0) res[mode].push(onsets[n0] - Math.round(t * SR));
      }
    }
    const sum = (a) => { const s = a.slice().sort((x, y) => x - y); return { n: a.length, exact: a.filter((x) => x === 0).length, late: a.filter((x) => x > 0), min: s[0], p50: s[s.length >> 1], p90: s[Math.floor(s.length * 0.9)], max: s[s.length - 1] }; };
    return { SR, baseLatency: ctx.baseLatency, now: sum(res.now), ahead: sum(res.ahead) };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
