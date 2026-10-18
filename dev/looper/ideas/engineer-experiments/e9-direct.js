// E9: can an offline render context hand its blocks *directly* to the live context's processor (a MessageChannel whose
// ends are transferred into both worklets), so the main thread is not on the path? The main thread is blocked for
// 600 ms while the offline render streams; do the blocks still arrive in the live processor during the block?
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  await page.evaluate((f) => { window.__FREE = f; }, !!process.env.FREE);
  const r = await page.evaluate(async () => {
    const src = `
      class Src extends AudioWorkletProcessor {   // offline: sends every 2048 frames of its input down the channel
        constructor() { super(); this.p = null; this.acc = new Float32Array(2048); this.i = 0; this.port.onmessage = (e) => { this.p = e.data.port; this.burn = e.data.burn; }; }
        process(inp) { const a = inp[0] && inp[0][0]; if (!a || !this.p) return true; if (this.burn) { let x = 0; for (let j = 0; j < 128 * this.burn; j++) x += Math.sin(j); this.d = x; }
          for (let k = 0; k < a.length; k++) { this.acc[this.i++] = a[k]; if (this.i === 2048) { this.p.postMessage({ f: currentFrame + k - 2047, d: this.acc }, [this.acc.buffer]); this.acc = new Float32Array(2048); this.i = 0; } }
          return true; } }
      class Dst extends AudioWorkletProcessor {   // live: counts what arrives, with its own frame clock at arrival
        constructor() { super(); this.got = 0; this.log = []; this.port.onmessage = (e) => { if (e.data.port) { e.data.port.onmessage = (m) => { this.got++; this.log.push(currentFrame); }; } else this.port.postMessage({ got: this.got, log: this.log }); }; }
        process() { return true; } }
      registerProcessor('e9-src', Src); registerProcessor('e9-dst', Dst);`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const live = new AudioContext(); await live.audioWorklet.addModule(url); await live.resume();
    const dst = new AudioWorkletNode(live, 'e9-dst', { numberOfInputs: 0, numberOfOutputs: 1 }); dst.connect(live.destination);
    const off = new OfflineAudioContext(1, 48000 * 30, 48000); await off.audioWorklet.addModule(url);
    const osc = off.createOscillator(); const s = new AudioWorkletNode(off, 'e9-src', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    osc.connect(s); s.connect(off.destination); osc.start();
    const ch = new MessageChannel();
    dst.port.postMessage({ port: ch.port2 }, [ch.port2]);
    off.suspend(128 / 48000).then(() => { s.port.postMessage({ port: ch.port1, burn: window.__FREE ? 60 : 0 }, [ch.port1]); off.resume(); });
    // pace the offline render: about 1 s ahead of wall time, with suspends every 0.25 s
    const t0 = performance.now();
    if (!window.__FREE) for (let k = 1; k < 120; k++) off.suspend(k * 0.25).then(async () => { const ahead = off.currentTime - (performance.now() - t0) / 1000; if (ahead > 1) await new Promise((r) => setTimeout(r, (ahead - 1) * 1000)); off.resume(); });
    const done = off.startRendering();
    await new Promise((r) => setTimeout(r, window.__FREE ? 800 : 3000));
    const ask = () => new Promise((res) => { dst.port.onmessage = (e) => res(e.data); dst.port.postMessage({}); });
    const before = await ask();
    // block the main thread for 600 ms
    const fa = live.currentTime * live.sampleRate; const b0 = performance.now(); while (performance.now() - b0 < 600) {}
    const after = await ask(); const fb = fa + 0.6 * live.sampleRate;
    const inStall = after.log.filter((f) => f > fa + 2048 && f < fb).length;
    off.suspend; // (rendering goes on)
    await done;
    const end = await ask();
    return { arrivedDuringStall: inStall, blocksBeforeStall: before.got, blocksAfterStall: after.got, blocksTotal: end.got, expected: Math.floor(48000 * 30 / 2048) };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})();
