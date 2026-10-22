// E2b: does a heavy OfflineAudioContext render (with its own worklet) disturb a live AudioContext's worklet thread?
// The live worklet records the wall-clock gaps between its process() calls (Date.now) and how far its frame count falls
// behind wall time. Run: live alone, then live while a heavy offline render runs (four times in a row).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  const r = await page.evaluate(async () => {
    const src = `
      class Probe extends AudioWorkletProcessor {
        constructor(o) { super(); this.k = o.processorOptions.k; this.last = 0; this.gaps = []; this.port.onmessage = () => { this.port.postMessage(this.gaps); this.gaps = []; }; }
        process(i, out) {
          const now = Date.now(); if (this.last) this.gaps.push(now - this.last); this.last = now;
          const L = out[0][0]; let x = 0; for (let s = 0; s < L.length; s++) { for (let j = 0; j < this.k; j++) x += Math.sin(j + s); L[s] = 0; }
          this.d = x; return true;
        }
      }
      registerProcessor('e2-probe', Probe);`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const live = new AudioContext({ latencyHint: 'interactive' });
    await live.audioWorklet.addModule(url);
    const probe = new AudioWorkletNode(live, 'e2-probe', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { k: 25 } });
    probe.connect(live.destination);
    await live.resume();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const grab = () => new Promise((res) => { probe.port.onmessage = (e) => res(e.data); probe.port.postMessage(0); });
    const summ = (g, t0w, t0a) => { const s = g.slice().sort((a, b) => a - b); return { n: g.length, p50: s[s.length >> 1], p99: s[Math.floor(s.length * 0.99)], max: s[s.length - 1], over10ms: g.filter((x) => x > 10).length }; };
    await sleep(500); await grab();
    const w0 = performance.now(), a0 = live.currentTime;
    await sleep(3000);
    const alone = summ(await grab()); alone.lagMs = Math.round((performance.now() - w0) - (live.currentTime - a0) * 1000);
    // heavy offline renders in a row: 4 × 8 s of audio, each with a worklet burning far more than the live one
    const w1 = performance.now(), a1 = live.currentTime; let offMs = 0;
    for (let k = 0; k < 4; k++) {
      const off = new OfflineAudioContext(1, 48000 * 8, 48000);
      await off.audioWorklet.addModule(url);
      const b = new AudioWorkletNode(off, 'e2-probe', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { k: 120 } }); b.connect(off.destination);
      const t = performance.now(); await off.startRendering(); offMs += performance.now() - t;
    }
    const during = summ(await grab()); during.lagMs = Math.round((performance.now() - w1) - (live.currentTime - a1) * 1000); during.offlineRenderMs = Math.round(offMs);
    return { sampleRate: live.sampleRate, baseLatency: live.baseLatency, outputLatency: live.outputLatency, alone, during };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
