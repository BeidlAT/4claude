// Note-off am Zeitstempel, every held sound source at its own (default) attack: a key let go 150 ms after its note-on
// under Gleichmäßig – the note's level, recorded off v.out, has no dropout before its release and no early end; with
// FF=1 as in Firefox (no cancelAndHoldAtTime: holdParam's fallback). Chromium only.   FF=1 node t-midi-off2.js
const H = require('./hx-h');
const { ok } = H;
const FF = !!process.env.FF;
(async () => {
  const { page, errors } = await H.open({ w: 1200, h: 800, init: FF ? 'delete AudioParam.prototype.cancelAndHoldAtTime;' : undefined });
  const r = await page.evaluate(async (FF) => {
    const M = window.__M, A = M.A, sl = window.__sleep, ctx = A.ctx, SR = ctx.sampleRate;
    await ctx.audioWorklet.addModule(window.__testUrl);
    M.setParam('v.layer', 'off'); M.setParam('midi.zeit', 'gleich'); M.setParam('rev.mix', 0); M.setParam('dly.mix', 0);
    const src = M.midiSource('x', 'Test', 'webmidi'), out = { ff: FF && !AudioParam.prototype.cancelAndHoldAtTime, e: {} };
    const engs = Object.keys(M.ENGINES).filter((k) => M.ENGINES[k].sustain);
    for (const eng of engs) {
      M.setParam('v.eng', eng); await sl(250);
      const note = 60, ts0 = performance.now();
      M.midiIn(src, new Uint8Array([0x90, note, 100]), ts0);
      const v = [...A.voices].pop();
      if (!v || v.eng !== eng && !v.out) { out.e[eng] = { skip: 1 }; continue; }
      const rec = new AudioWorkletNode(ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0;
      v.out.connect(rec); rec.connect(z).connect(ctx.destination);
      await sl(150);
      const nowR = ctx.currentTime;
      M.midiIn(src, new Uint8Array([0x80, note, 64]), performance.now() - 3);
      const relAt = v.relAt, tA = v.tA != null ? v.tA : v.t0;
      await sl(250);
      const d = await new Promise((res) => { rec.port.onmessage = (e) => { const d = e.data, L = new Float32Array(d.n); let o = 0; for (const c of d.L) { L.set(c, o); o += c.length; } res({ L, f0: d.f0 }); }; rec.port.postMessage(1); });
      try { v.out.disconnect(rec); } catch (e) {} rec.disconnect();
      // 1-ms levels from 20 ms before the note-off's handler to the release's moment (the time a release ahead waits –
      // where a dropped attack ramp left the note at 0, 6 ms of −180 dB in Firefox before this fix)
      const t0 = d.f0 / SR, W = Math.round(0.001 * SR), db = (x) => 20 * Math.log10(x + 1e-9);
      const lvl = (t) => { const i = Math.round((t - t0) * SR); let s = 0; for (let j = i; j < i + W; j++) { const x = d.L[j] || 0; s += x * x; } return db(Math.sqrt(s / W)); };
      const pre = [], win = [];
      for (let t = nowR - 0.02; t < nowR - 0.001; t += 0.001) pre.push(lvl(t));
      for (let t = nowR - 0.001; t <= relAt; t += 0.001) win.push(lvl(t));
      pre.sort((a, b) => a - b);
      const before = pre[pre.length >> 1], mn = Math.min(...win);
      out.e[eng] = { wait: +((relAt - nowR) * 1000).toFixed(1), before: +before.toFixed(1), minPre: +mn.toFixed(1), dip: +(mn - before).toFixed(1), gate: +((relAt - tA) * 1000).toFixed(1) };
      M.midiIn(src, new Uint8Array([0x80, note, 0]), performance.now());
      await sl(300);
    }
    return out;
  }, FF);
  console.log(JSON.stringify(r));
  if (FF) ok(r.ff, 'Firefox simulated: no cancelAndHoldAtTime');
  for (const eng in r.e) {
    const x = r.e[eng];
    if (x.skip) continue;
    if (x.before < -70) { console.log('  (' + eng + ': too quiet to judge, ' + x.before + ' dB)'); continue; }
    ok(x.dip > -30 && x.wait > 0, `${eng}: no dropout while the release waits for its moment (${x.wait} ms; lowest 1-ms level ${x.dip} dB against the median before)`);
  }
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
