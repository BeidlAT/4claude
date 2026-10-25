// Harz in WebAssembly (Leistung, 25.10.2026): in the browser's AudioWorklet the bowed bands' loop runs in WebAssembly and
// equals the JavaScript loop (po.bowJs) sample for sample – every body, level 1 and 3, a glide, the bow lifted; many
// voices at once and one after another (the slots: given back and taken again, the memory growing on the way).
//   node t-bow-wasm.js
const H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await H.open({ start: false });
  const r = await page.evaluate(async () => {
    const SR = 48000, dur = 4;
    // (each voice into a channel pair of its own – Chromium sums three or more signals in a varying order; two voices
    // share a pair at most, one after the other: the first batch is killed – its slots free – before the second starts)
    const W = [];
    async function run(js) {
      const ctx = new OfflineAudioContext(32, dur * SR, SR); await window.__M.ensureDSP(ctx);
      const mg = ctx.createChannelMerger(32); mg.connect(ctx.destination);
      const bodies = ['glas', 'schale', 'stab', 'zunge', 'teich'];
      for (let k = 0; k < 30; k++) {
        const body = bodies[k % 5], rich = k % 2 === 1, b2 = k >= 15, t0 = (k % 15) * 0.04 + (b2 ? 1.6 : 0), f = 110 * Math.pow(2, (k % 12) / 6);
        const node = new AudioWorkletNode(ctx, 'myzel-bow', { numberOfInputs: 0, outputChannelCount: [2], parameterData: { freq: f, hoehe: 0.3 + 0.6 * ((k * 0.37) % 1) },
          processorOptions: { rich, seed: 7 + k, bowJs: js ? 1 : 0, tellW: k === 20 ? 1 : 0, prm: { koerper: body, druck: (k * 0.29) % 1, bogen: 0.5, daempfung: 0.4, schwebung: 0.6, harz: 0.5 }, on: { on: t0, f, y: 0.6, vel: 0.8, seed: 3 + k } } });
        if (k === 20) node.port.onmessage = (e) => { if (e.data && e.data.bowW != null) W.push(e.data.bowW); };
        node.parameters.get('freq').setValueAtTime(f, t0 + 0.3); node.parameters.get('freq').linearRampToValueAtTime(f * 1.3, t0 + 0.6);
        const sp = ctx.createChannelSplitter(2); node.connect(sp); sp.connect(mg, 0, 2 * (k % 15)); sp.connect(mg, 1, 2 * (k % 15) + 1);
        ctx.suspend(Math.round((t0 + 0.7) * SR / 128) * 128 / SR).then(() => { node.port.postMessage({ off: t0 + 0.7 }); ctx.resume(); });
        if (!b2) ctx.suspend(Math.round(1.5 * SR / 128) * 128 / SR + 128 * (k + 1) / SR).then(() => { node.port.postMessage({ kill: 1 }); ctx.resume(); });
      }
      const b = await ctx.startRendering(), o = [];
      for (let c = 0; c < 32; c++) o.push(b.getChannelData(c).slice());
      return o;
    }
    const A = await run(false), B = await run(true);
    let d = 0, pk = 0; for (let c = 0; c < 32; c++) for (let i = 0; i < A[c].length; i++) { if (!Object.is(A[c][i], B[c][i])) d++; pk = Math.max(pk, Math.abs(A[c][i])); }
    return { d, pk, W };
  });
  ok(r.d === 0 && r.pk > 0.05, `30 Harz voices (five bodies, levels 1 and 3, glides, the bow lifted), 15 at a time, the first 15 killed before the next 15 take their slots: WebAssembly = JavaScript sample for sample (${r.d} differing, peak ${r.pk.toFixed(3)})`);
  ok(r.W.length === 2 && r.W[0] === 1 && r.W[1] === 0, `the AudioWorklet runs the loop in WebAssembly (default ${r.W[0]}, po.bowJs ${r.W[1]})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
