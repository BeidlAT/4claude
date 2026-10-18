// E2: can an OfflineAudioContext be used as a *streaming* renderer that runs a bounded distance ahead of real time?
// (a) do port messages from a worklet in the offline context reach the main thread while it renders (not only at the
//     end)? (b) suspend/resume every 0.25 s of audio as back-pressure: overhead, and is the ahead-distance held?
// (c) a change made at a suspend (a new frequency) is in the output from that frame on.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  const r = await page.evaluate(async () => {
    const SR = 48000;
    const src = `
      class Sink extends AudioWorkletProcessor {
        constructor() { super(); this.n = 0; this.acc = []; }
        process(inp, out) {
          const L = inp[0] && inp[0][0];
          if (L) { this.acc.push(L.slice()); out[0][0].set(L); }
          this.n += 128;
          if (this.n % 4096 === 0) { this.port.postMessage({ f: currentFrame, blocks: this.acc }); this.acc = []; }
          return true;
        }
      }
      class Burn extends AudioWorkletProcessor {   // a stand-in for expensive voices: k iterations per sample
        constructor(o) { super(); this.k = o.processorOptions.k; this.ph = 0; }
        process(i, out, p) {
          const L = out[0][0]; let x = 0;
          for (let s = 0; s < L.length; s++) { let a = 0; for (let j = 0; j < this.k; j++) a += Math.sin(j * 0.001 + s); x += a; L[s] = 0; }
          this.dummy = x; return true;
        }
      }
      registerProcessor('e2-sink', Sink); registerProcessor('e2-burn', Burn);`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    async function run(mode, burnK, dur) {
      const ctx = new OfflineAudioContext(1, SR * dur, SR);
      await ctx.audioWorklet.addModule(url);
      const osc = ctx.createOscillator(); osc.frequency.value = 440;
      const sink = new AudioWorkletNode(ctx, 'e2-sink', { numberOfOutputs: 1, outputChannelCount: [1] });
      osc.connect(sink); sink.connect(ctx.destination);
      const burn = new AudioWorkletNode(ctx, 'e2-burn', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { k: burnK } }); burn.connect(ctx.destination);
      osc.start();
      const arr = []; let t0 = 0, got = 0;
      sink.port.onmessage = (e) => { arr.push([performance.now() - t0, e.data.f / SR]); got += e.data.blocks.length; };
      const CH = 0.25, AHEAD = 1.0;
      let maxAhead = 0, waits = 0, changedAt = null;
      if (mode !== 'free') {
        for (let k = 1; k * CH < dur; k++) {
          ctx.suspend(k * CH).then(async () => {
            const wall = (performance.now() - t0) / 1000, audio = ctx.currentTime;
            maxAhead = Math.max(maxAhead, audio - wall);
            if (mode === 'paced' && audio - wall > AHEAD) { waits++; await new Promise((r) => setTimeout(r, (audio - wall - AHEAD) * 1000)); }
            if (k === 20) { osc.frequency.setValueAtTime(880, ctx.currentTime); changedAt = ctx.currentTime; }
            ctx.resume();
          });
        }
      }
      t0 = performance.now();
      const buf = await ctx.startRendering();
      const total = performance.now() - t0;
      await new Promise((r) => setTimeout(r, 50));
      // when did the messages arrive, relative to the render's end? (progressive: the first long before the end)
      const firstMsgMs = arr.length ? arr[0][0] : null, lastAudio = arr.length ? arr[arr.length - 1][1] : null;
      const midMsg = arr.find((a) => a[1] >= dur / 2);
      // (c): zero crossings per second before and after the change
      let freqAfter = null;
      if (changedAt != null) { const d = buf.getChannelData(0), a = Math.round((changedAt + 0.1) * SR), b = a + SR / 2; let zc = 0; for (let i = a + 1; i < b; i++) if (d[i - 1] < 0 && d[i] >= 0) zc++; freqAfter = zc * 2; }
      return { mode, burnK, dur, totalMs: Math.round(total), rtFactor: +(total / 1000 / dur).toFixed(3), msgs: arr.length, blocksGot: got, firstMsgMs: firstMsgMs && Math.round(firstMsgMs), midMsgArrivedMs: midMsg && Math.round(midMsg[0]), lastMsgAudioS: lastAudio, maxAheadS: +maxAhead.toFixed(2), waits, freqAfterChange: freqAfter };
    }
    const out = [];
    out.push(await run('free', 0, 10));
    out.push(await run('free', 60, 10));
    out.push(await run('suspends', 60, 10));
    out.push(await run('paced', 0, 10));
    out.push(await run('paced', 60, 10));
    return out;
  });
  for (const x of r) console.log(JSON.stringify(x));
  await browser.close();
})();
