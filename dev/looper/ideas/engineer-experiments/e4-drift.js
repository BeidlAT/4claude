// E4: one hour of a 2-bar loop on a clock with tempo changes – are pass boundaries sample-exact (≤ ½ frame from the
// clock's exact bar line, never accumulating) and is every frame inside a pass the right one? Against a naive
// integer-length counter loop. The hour is rendered in 60 one-minute offline contexts that continue the frame count
// (the processor derives every position from frame + clock, so it needs no state carried over).
// Clock: 0–20 min 84 BPM; 20–40 min 84.37 BPM; 40–60 min an external clock wandering ±0.2 % (a new segment every 0.5 s).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const LOOP = require('./loopproc.js');
const MIN = +process.env.MIN || 60;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8790/eng-inst/index.html');
  const r = await page.evaluate(async ([LOOP, MIN]) => {
    const SR = 48000;
    // ---- the clock (built once, shared by looper and checker) ----
    const seg = [{ f: 0, b: 0, fpb: SR * 60 / 84 }];
    const addSeg = (f, fpb) => { const s = seg[seg.length - 1]; seg.push({ f, b: s.b + (f - s.f) / s.fpb, fpb }); };
    addSeg(20 * 60 * SR, SR * 60 / 84.37);
    for (let t = 40 * 60; t < 60 * 60; t += 0.5) addSeg(Math.round(t * SR), SR * 60 / (84.37 * (1 + 0.002 * Math.sin(2 * Math.PI * t / 37))));
    const CHECK = `
      class Check extends AudioWorkletProcessor {
        constructor(o) { super(); const po = o.processorOptions; this.seg = po.seg; this.fOff = po.fOffset; this.st = po.st; this.beats = po.beats; this.len = po.len;
          this.port.onmessage = () => this.port.postMessage(this.st); }
        frameAt(b) { const s = this.seg; let lo = 0, hi = s.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].b <= b) lo = m; else hi = m - 1; } return s[lo].f + (b - s[lo].b) * s[lo].fpb; }
        process(inp) {
          const a = inp[0]; if (!a || !a.length) return true;
          const L = a[0], R = a[1], n = L.length, F0 = currentFrame + this.fOff, st = this.st;
          for (let k = 0; k < n; k++) {
            const F = F0 + k;
            for (const [ch, key] of [[L, 'loop'], [R, 'naive']]) {
              const x = st[key], idx = Math.round(ch[k] * 1048576);
              if (x.prev != null && idx !== x.prev + 1) {
                if (idx === 0) {   // a new pass: where is it against the clock's exact bar line?
                  x.pass++;
                  const exact = this.frameAt(x.pass * this.beats), e = F - exact;
                  if (Math.abs(e) > Math.abs(x.maxE)) x.maxE = e;
                  if (x.pass % 50 === 0) x.trace.push([Math.round(F / 48000), +e.toFixed(2)]);
                } else x.glitch++;
              }
              x.prev = idx;
            }
          }
          if (currentFrame + n >= this.len && !this.sent) { this.sent = true; this.port.postMessage(st); }
          return true;
        }
      }
      registerProcessor('e4-check', Check);`;
    const url = URL.createObjectURL(new Blob([LOOP + CHECK], { type: 'text/javascript' }));
    const BODY = 280000, buf = new Float32Array(BODY);
    for (let i = 0; i < BODY; i++) buf[i] = i / 1048576;   // the sample's own index, exact in float32
    const st = { loop: { prev: null, pass: 0, maxE: 0, glitch: 0, trace: [] }, naive: { prev: null, pass: 0, maxE: 0, glitch: 0, trace: [] } };
    let renderMs = 0, st2 = st;
    for (let m = 0; m < MIN; m++) {
      const ctx = new OfflineAudioContext(1, SR * 60, SR);
      await ctx.audioWorklet.addModule(url);
      const fOffset = m * 60 * SR;
      const lp = new AudioWorkletNode(ctx, 'myzel-loop-proto', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { fOffset, clock: seg,
        layers: [{ L: buf, R: new Float32Array(1), b0: 0, beats: 8, X: 0, join: 'xf' }] } });
      // the naive layer goes to the right channel: a second processor with only a naive layer, merged
      const nv = new AudioWorkletNode(ctx, 'myzel-loop-proto', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { fOffset, clock: seg, layers: [{ L: buf, naive: true, P: Math.round(8 * SR * 60 / 84), b0: 0, beats: 8 }] } });
      const sp = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(2);
      lp.connect(sp); sp.connect(mg, 0, 0); nv.connect(mg, 0, 1);
      const ck = new AudioWorkletNode(ctx, 'e4-check', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', processorOptions: { seg, fOffset, st: st2, beats: 8, len: SR * 60 } });
      const got = new Promise((res) => { ck.port.onmessage = (e) => res(e.data); });
      mg.connect(ck); ck.connect(ctx.destination);
      const t0 = performance.now(); await ctx.startRendering(); renderMs += performance.now() - t0;
      st2 = await got;
    }
    return { minutes: MIN, renderS: +(renderMs / 1000).toFixed(1), segments: seg.length, loop: st2.loop, naive: st2.naive };
  }, [LOOP, MIN]);
  console.log(JSON.stringify({ minutes: r.minutes, renderS: r.renderS, segments: r.segments }));
  for (const k of ['loop', 'naive']) { const x = r[k]; console.log(k, JSON.stringify({ passes: x.pass, maxStartErrFrames: +x.maxE.toFixed(3), glitches: x.glitch, trace: x.trace })); }
  await browser.close();
})();
