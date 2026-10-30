// The Formen's processors of a mixer channel (30.10.2026): the Verdichter (myzel-komp – dsp/kompressor.js) and the
// Transienten-Former (myzel-trans – dsp/effekte.js), each fed by a known signal, its output recorded at the frame:
//  1 Verdichter at Ratio 1: the input itself, sample for sample
//  2 Schwelle −30 dB, 1:20, hard knee: a −10 dBFS sine comes out at ≈ −29 dBFS, the reduction reported ≈ 19 dB
//  3 Anteil 50 %: half dry, half pressed
//  4 in the mixer: Ratio above 1 makes the channel's block and the processor, back to 1 lets it go; the detail shows it
//  5 Transienten-Former: Anschlag +100 % lifts a burst's first 10 ms, Ausklang −100 % shortens its tail; both 0: bit-exact
//  6 the mixer's detail (Fruchtkörper): the card „Verdichter“ with its seven knobs, its text says what it does
//                                                                                              node t-formen-dsp.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = process.env.URL || 'http://127.0.0.1:8790/new-inst/index.html';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.ctx && window.__M.A.ctx.__dspOK, null, { timeout: 15000 }); await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = (ms) => new Promise((r) => setTimeout(r, ms));
    const REC = `class FRec extends AudioWorkletProcessor { constructor() { super(); this.b = []; this.port.onmessage = () => { this.port.postMessage(this.b); this.b = []; }; }
      process(inp) { const a = inp[0]; this.b.push([currentFrame, a && a[0] ? a[0].slice() : new Float32Array(128)]); return true; } }
      registerProcessor('f-rec', FRec);`;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'text/javascript' })));
    const rec = (src) => { const r = new AudioWorkletNode(ctx, 'f-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; src.connect(r); r.connect(z).connect(ctx.destination); return r; };
    const stop = (r) => new Promise((res) => { r.port.onmessage = (e) => { const b = e.data, f0 = b[0][0], out = new Float32Array(b[b.length - 1][0] + 128 - f0); for (const [f, d] of b) out.set(d, f - f0); res({ d: out, f0 }); }; r.port.postMessage(1); });
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200), rms = (d, a, b) => { let s = 0, n = 0; for (let i = Math.max(0, a); i < Math.min(d.length, b); i++) { s += d[i] * d[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
    const SR = ctx.sampleRate, o = {};
    // a steady sine at −10 dBFS, and a burst (1-ms attack, 400-ms decay) – both from buffers, so every run is the same
    const sine = ctx.createBuffer(2, SR, SR), burst = ctx.createBuffer(2, SR, SR);
    for (let c = 0; c < 2; c++) { const s = sine.getChannelData(c), bu = burst.getChannelData(c); for (let i = 0; i < SR; i++) { s[i] = 0.316 * Math.sin(2 * Math.PI * 440 * i / SR); const t = i / SR; bu[i] = 0.5 * Math.sin(2 * Math.PI * 330 * i / SR) * Math.min(1, t / 0.001) * Math.exp(-t / 0.4); } }
    // run: the buffer through a processor (made with msg) – its output and the input recorded over ms; a node's reported red
    const run = async (buf, proc, msg, ms, loop) => {
      const node = new AudioWorkletNode(ctx, proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
      let red = 0; node.port.onmessage = (e) => { if (e.data && e.data.red != null) red = Math.min(red, e.data.red); };
      if (msg) node.port.postMessage(msg);
      await sl(60);   // (the message lands, the processor's blend settles)
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = !!loop;
      const rIn = rec(src), rOut = rec(node); src.connect(node);
      const t0 = ctx.currentTime + 0.05; src.start(t0);
      await sl(ms + 80);
      const [I, O] = await Promise.all([stop(rIn), stop(rOut)]);
      try { src.stop(); src.disconnect(); node.disconnect(); } catch (e) {}
      // aligned at the start: the input's first non-zero sample
      let i0 = 0; while (i0 < I.d.length && I.d[i0] === 0) i0++;
      const sh = O.f0 - I.f0;   // (both recorders see the same frames)
      return { inp: I.d.subarray(i0), out: O.d.subarray(i0 + sh), red: -red };
    };
    // 1 · Ratio 1: the input itself
    { const r = await run(sine, 'myzel-komp', { ratio: 1 }, 400, true); let mx = 0; const n = Math.min(r.inp.length, r.out.length, SR * 0.3); for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(r.inp[i] - r.out[i])); o.exact = mx; }
    // 2 · −30 dB, 1:20, hard knee, fast: a −10 dBFS sine → ≈ −29 dBFS
    { const r = await run(sine, 'myzel-komp', { ratio: 20, thr: -30, att: 0.0001, rel: 0.01, knee: 0, mk: 0, mix: 1 }, 600, true); const a = Math.round(0.3 * SR), b = Math.round(0.5 * SR); o.press = +db(rms(r.out, a, b) * Math.SQRT2).toFixed(1); o.pressIn = +db(rms(r.inp, a, b) * Math.SQRT2).toFixed(1); o.red = +r.red.toFixed(1); }
    // 3 · Anteil 50 %
    { const r = await run(sine, 'myzel-komp', { ratio: 20, thr: -30, att: 0.0001, rel: 0.01, knee: 0, mk: 0, mix: 0.5 }, 600, true); const a = Math.round(0.3 * SR), b = Math.round(0.5 * SR); o.half = +db(rms(r.out, a, b) * Math.SQRT2).toFixed(1); }
    // 4 · in the mixer
    { const st = M.MIX.s.fin; M.setParam('xfin.krat', 4); await sl(60); o.mixOn = !!(st.proc && st.proc.kp) && st.procOn;
      M.setParam('v.eng', 'neb'); M.setParam('xfin.kthr', -40); M.onDown({ pointerId: 'k', pt: { x: 0.5, y: 0.5, px: 400, py: 200 } }); await sl(500); o.kred = st.proc.kred || 0; M.onUp({ pointerId: 'k' }); await sl(300);
      M.setParam('xfin.krat', 1); M.setParam('xfin.kthr', -18); await sl(300); o.mixOff = !st.procOn; }
    // 5 · Transienten-Former
    { const z = await run(burst, 'myzel-trans', { a: 0, s: 0 }, 500), p = await run(burst, 'myzel-trans', { a: 1, s: 0 }, 500), q = await run(burst, 'myzel-trans', { a: 0, s: -1 }, 500);
      let mx = 0; const n = Math.min(z.inp.length, z.out.length, SR * 0.4); for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(z.inp[i] - z.out[i])); o.trExact = mx;
      const w = (r, a, b) => db(rms(r.out, Math.round(a * SR), Math.round(b * SR)));
      o.trAtt = +(w(p, 0.001, 0.01) - w(z, 0.001, 0.01)).toFixed(1); o.trAttTail = +(w(p, 0.25, 0.3) - w(z, 0.25, 0.3)).toFixed(1);
      o.trTail = +(w(q, 0.25, 0.3) - w(z, 0.25, 0.3)).toFixed(1); o.trTailAtt = +(w(q, 0.001, 0.01) - w(z, 0.001, 0.01)).toFixed(1); }
    // 6 · the detail's card
    { M.openPanel('mix'); await sl(400); const head = document.querySelector('.mx-st[data-k="fin"] .mx-sh'); if (head) head.click(); await sl(500);
      const card = document.querySelector('.mxd-kmp'); o.card = !!card && card.offsetParent !== null; o.knobs = card ? card.querySelectorAll('.mxd-k').length : 0;
      o.txtOff = card ? card.querySelector('small').textContent : '';
      M.setParam('xfin.krat', 3); M.setParam('xfin.kthr', -40); M.onDown({ pointerId: 'k2', pt: { x: 0.5, y: 0.5, px: 400, py: 200 } }); await sl(900); o.txtOn = card ? card.querySelector('small').textContent : ''; M.onUp({ pointerId: 'k2' });
      M.setParam('xfin.krat', 1); M.setParam('xfin.kthr', -18); await sl(300); M.closePanel(); }
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.exact === 0, `Verdichter at Ratio 1: the input itself, sample for sample (largest difference ${r.exact})`);
  ok(Math.abs(r.pressIn + 10) < 0.5 && Math.abs(r.press + 29) < 0.7 && Math.abs(r.red - 19) < 1.5, `Schwelle −30 dB, 1:20: a ${r.pressIn} dBFS sine comes out at ${r.press} dBFS (≈ −29), reduction reported ${r.red} dB (≈ 19)`);
  ok(Math.abs(r.half + 15.1) < 0.7, `Anteil 50 %: half dry, half pressed – ${r.half} dBFS (≈ −15.1)`);
  ok(r.mixOn && r.kred > 3 && r.mixOff, `in the mixer: Ratio 4 makes the channel's processor (${r.mixOn}), a loud note is pressed (${r.kred.toFixed(1)} dB reported), Ratio 1 lets the block go (${r.mixOff})`);
  ok(r.trExact === 0 && r.trAtt > 3 && Math.abs(r.trAttTail) < 1 && r.trTail < -3 && Math.abs(r.trTailAtt) < 1, `Transienten-Former: at 0 bit-exact (${r.trExact}); Anschlag +100 % lifts the first 10 ms by ${r.trAtt} dB (tail ${r.trAttTail}); Ausklang −100 % lowers the tail by ${r.trTail} dB (attack ${r.trTailAtt})`);
  ok(r.card && r.knobs === 7 && r.txtOff === 'aus' && /dB/.test(r.txtOn), `the detail's card „Verdichter“: ${r.knobs} knobs, says „${r.txtOff}“ at 1:1 and „${r.txtOn}“ while pressing`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
