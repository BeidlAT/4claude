// Note-off am Zeitstempel: Gleichmäßig ends a key's note at the same distance from the key's release as its start –
// a handler that ran late moves the release not at all, the gate is as long as the key was held; Sofort: at once.
// Engines: Nebel (sustainRelease), Glut (own release), Amöbe (worklet + sustainRelease).   node t-midi-off.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = { e: {} };
    M.setParam('v.layer', 'off'); M.setParam('neb.att', 0.003);   // (a slow attack: a quick tap's release starts 30 ms on – relAt)
    const src = M.midiSource('x', 'Test', 'webmidi');
    const lead = (A.ctx.baseLatency || 128 / A.ctx.sampleRate) + 0.005;
    o.lead = +(lead * 1000).toFixed(1);
    for (const eng of ['neb', 'glt', 'amo']) {
      M.setParam('v.eng', eng); await sl(300);
      const L = (o.e[eng] = []);
      for (const mode of ['gleich', 'sofort']) {
        M.setParam('midi.zeit', mode); M.ctxSync();
        for (const late of [0, 3, 6]) {   // (less late than the lead: later ones start as soon as possible)
          await sl(120);
          const note = 50 + late + (mode === 'sofort' ? 20 : 0), ts0 = performance.now();
          M.midiIn(src, new Uint8Array([0x90, note, 100]), ts0);
          const v = [...A.voices].pop();
          await sl(80);
          const ts1 = performance.now() - late, now0 = A.ctx.currentTime;
          M.midiIn(src, new Uint8Array([0x80, note, 64]), ts1);
          L.push({ mode, late, rel: !!v.released, d: +((v.relAt - M.ctxAt(ts1)) * 1000).toFixed(1), afterNow: v.relAt >= now0 - 1e-6, fromNow: +((v.relAt - now0) * 1000).toFixed(1), gate: +((v.relAt - v.tA) * 1000 - (ts1 - ts0)).toFixed(1) });
        }
      }
    }
    // a key struck again while its note sounds: the old note ends where the new one starts (not before)
    M.setParam('v.eng', 'neb'); M.setParam('midi.zeit', 'gleich'); await sl(200);
    M.midiIn(src, new Uint8Array([0x90, 72, 100]), performance.now()); const v1 = [...A.voices].pop();
    await sl(60); M.midiIn(src, new Uint8Array([0x90, 72, 100]), performance.now() - 6); const v2 = [...A.voices].pop();
    o.again = { d: +((v1.relAt - v2.tA) * 1000).toFixed(2), two: v1 !== v2 };
    M.midiIn(src, new Uint8Array([0x80, 72, 0]), performance.now());
    return o;
  });
  console.log(JSON.stringify(r));
  const tol = 1.5;
  for (const eng in r.e) {
    const g = r.e[eng].filter((x) => x.mode === 'gleich'), s = r.e[eng].filter((x) => x.mode === 'sofort');
    ok(g.every((x) => x.rel && Math.abs(x.d - r.lead) < tol && x.afterNow), `${eng} Gleichmäßig: note-off ${r.lead} ms after the key let go, handler 0/3/6 ms late (${g.map((x) => x.late + '→' + x.d).join(', ')} ms)`);
    const gates = g.map((x) => x.gate);
    ok(gates.every((x) => Math.abs(x) < tol), `${eng} Gleichmäßig: the gate is the key's length (gate − key: ${gates.join(', ')} ms)`);
    ok(s.every((x) => x.rel && x.fromNow >= -0.01 && x.fromNow < 3.5), `${eng} Sofort: note-off at once, within a render quantum (${s.map((x) => x.fromNow).join(', ')} ms after now)`);
  }
  ok(r.again.two && r.again.d >= -0.01 && r.again.d < 1, `a key struck again: the old note ends where the new one starts (${r.again.d} ms)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
