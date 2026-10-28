// (owner, 28.10.2026: „latenz schwankt auf jeden fall, bis zu 20 ms“) Gleichmäßig: a key's note starts at a fixed distance
// from the key's arrival (the MIDI timestamp) – a handler that ran late (a GC, a long task) moves it not at all, as long as
// it was less than one buffer + 5 ms late; never before now; Sofort: as before, at the earliest moment.   node t-midi-zeit.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); await sl(300);
    const src = M.midiSource('x', 'Test', 'webmidi');
    const play = async (ts, note) => { const n0 = A.voices.size; M.midiIn(src, new Uint8Array([0x90, note, 100]), ts); const v = [...A.voices].pop(); await sl(30); M.midiIn(src, new Uint8Array([0x80, note, 0]), performance.now()); return v; };
    const lead = (A.ctx.baseLatency || 128 / A.ctx.sampleRate) + 0.005;
    o.lead = +(lead * 1000).toFixed(1);
    // Gleichmäßig: three notes whose handler ran 0 / 6 / 12 ms late – each starts lead after its arrival
    M.setParam('midi.zeit', 'gleich'); M.ctxSync();
    const g = [];
    for (const late of [0, 6, 12]) { await sl(150); const ts = performance.now() - late, now0 = A.ctx.currentTime, v = await play(ts, 60 + late); g.push({ late, d: +((v.tA - M.ctxAt(ts)) * 1000).toFixed(1), afterNow: v.tA >= now0 }); }
    o.g = g;
    // never before now: a timestamp from the far past (a stalled handler): as soon as possible
    await sl(150); { const ts = performance.now() - 80, now0 = A.ctx.currentTime, v = await play(ts, 64); o.stale = { d: +((v.tA - now0) * 1000).toFixed(1) }; }
    // at most 60 ms ahead: a timestamp from the future (a clock that drifted)
    await sl(150); { const ts = performance.now() + 500, now0 = A.ctx.currentTime, v = await play(ts, 65); o.future = +((v.tA - now0) * 1000).toFixed(1); }
    // Sofort: at the earliest moment – now
    M.setParam('midi.zeit', 'sofort');
    await sl(150); { const ts = performance.now() - 6, now0 = A.ctx.currentTime, v = await play(ts, 67); o.sofort = +((v.tA - now0) * 1000).toFixed(1); }
    o.noteEv = M.hxNotes ? 1 : 0;
    return o;
  });
  console.log(JSON.stringify(r));
  const tol = 1.5;
  ok(r.g.every((x) => Math.abs(x.d - r.lead) < tol && x.afterNow), `Gleichmäßig: a note starts ${r.lead} ms after its key arrived – whether the handler ran 0, 6 or 12 ms late (${r.g.map((x) => x.late + '→' + x.d).join(', ')} ms)`);
  ok(r.stale.d >= 0 && r.stale.d < 2, `a key from the far past (80 ms): as soon as possible, never before now (${r.stale.d} ms after now)`);
  ok(r.future >= 59 && r.future <= 61, `a key from the future: at most 60 ms ahead (${r.future} ms)`);
  ok(r.sofort >= 0 && r.sofort < 2, `Sofort: at the earliest moment (${r.sofort} ms after now)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
