// Hexenring – the resampler in WebAssembly (Leistung, 24.10.2026): in the browser's AudioWorklet the ring processor
// reads through WebAssembly (report rsw 1), and an offline render with Taumeln (de-drifted, summed), a loop rate, a tape
// speed step up (k16, k24) equals the JavaScript resampler's (po.rsJs) sample for sample.
//   node t-hx-rsw.js
const H = require('./hx-h');
const { ok } = H;
(async () => {
  let { page, errors } = await H.open({ start: false });
  const r = await page.evaluate(async () => {
    const SR = 44100, CH = 8192, pre = 22050, len = 176400, n = pre + len + 22050;
    const Sx = (s, x) => 0.2 * Math.sin(2 * Math.PI * (110 + 37 * s) * x / SR + s) + 0.05 * Math.sin(2 * Math.PI * 5274 * x / SR);
    const D = (s) => { const d = new Float32Array(Math.ceil(n / 128) + 1); for (let k = 0; k < d.length; k++) d[k] = 8 * Math.sin(2 * Math.PI * 2.5 * (0.05 + 0.13 * s + k * 128 / SR)); return d; };
    const mkCh = (s) => { const a = []; for (let c = 0; c * CH < n; c++) { const L = new Float32Array(CH), R = new Float32Array(CH); for (let j = 0; j < CH; j++) { const i = c * CH + j; if (i < n) { const v = Sx(s, i); L[j] = v; R[j] = 0.7 * v; } } a.push([L, R]); } return a; };
    async function run(po, extra) {
      const dur = 14, frames = dur * SR, ctx = await window.__ringCtx(frames, SR);
      const msgs = [{ seg: [[0, 0, SR * 60 / 120]], reset: 1 }];
      for (let l = 1; l <= 3; l++) { msgs.push({ loop: { id: l, lock: 'takt', b0: 0, beats: 8 } }); for (let s = 0; s < 2; s++) msgs.push({ schicht: { loop: l, id: 2 * l + s, chunks: mkCh(2 * l + s), n, pre, len, join: 'xf', X: 441, rho: 1, tau: true, dd: 1, dr: D(2 * l + s) } }); }
      msgs.push({ rate: { loop: 3, cents: 17 } });
      msgs.push(...extra);
      const pool = []; for (let i = 0; i < 400; i++) pool.push([new Float32Array(CH), new Float32Array(CH)]); msgs.push({ pool });
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: Object.assign({ humusS: 1, msgs, rid: 90 + Math.floor(Math.random() * 1e6), drift: 1, ddPool: 1, ddBlk: 512 }, po) });
      let rep = null; node.port.onmessage = (e) => { if (e.data && e.data.report) rep = e.data.report; };
      const b = ctx.createBuffer(1, frames, SR), d = b.getChannelData(0); for (let i = 0; i < frames; i++) d[i] = 8 * Math.sin(2 * Math.PI * 2.5 * (i / SR) + 1.1);
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(node, 0, 1); src.start();
      node.connect(ctx.destination, 0); node.connect(ctx.destination, 1);
      ctx.suspend(13.5).then(() => { node.port.postMessage({ report: 1 }); ctx.resume(); });
      const buf = await ctx.startRendering();
      return { L: buf.getChannelData(0).slice(), R: buf.getChannelData(1).slice(), rep };
    }
    const out = {};
    // the tape: loop 2 a fifth up (k16) from 4 s, loop 1 an octave up (k24) from 6 s, loop 3 at 17 ct throughout
    const extra = [{ band: { loop: 2, vs: 1.5, T: 0.3 * SR, f: 4 * SR } }, { band: { loop: 1, vs: 2, T: 0.5 * SR, f: 6 * SR } }];
    const A = await run({}, extra), B = await run({ rsJs: 1 }, extra);
    let diff = 0, pk = 0, nan = 0; for (const c of ['L', 'R']) for (let i = 0; i < A[c].length; i++) { if (!Object.is(A[c][i], B[c][i])) diff++; pk = Math.max(pk, Math.abs(A[c][i])); if (A[c][i] !== A[c][i]) nan++; }
    out.rsw = [A.rep && A.rep.rsw, B.rep && B.rep.rsw]; out.diff = diff; out.pk = pk; out.nan = nan; out.dd = A.rep && A.rep.dd; out.sl = A.rep && A.rep.sl;
    return out;
  });
  console.log(JSON.stringify(r));
  ok(r.rsw[0] === 1 && r.rsw[1] === 0, `the AudioWorklet reads through WebAssembly (rsw ${r.rsw[0]}; po.rsJs ${r.rsw[1]})`);
  ok(r.dd && r.dd.every((x) => x.every((v) => v === 1)) && r.sl && r.sl[0][2] === 2 && r.sl[1][2] === 1.5, `by 13.5 s every Schicht reads de-drifted (summed), loop 1 at ×2, loop 2 at ×1.5 (${JSON.stringify(r.dd)}, ${JSON.stringify(r.sl)})`);
  ok(r.diff === 0 && r.pk > 0.05 && r.nan === 0, `14 s of 3 loops × 2 Schichten with Taumeln, a loop rate, tape speed steps: WebAssembly = JavaScript sample for sample (${r.diff} differing, peak ${r.pk.toFixed(3)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
