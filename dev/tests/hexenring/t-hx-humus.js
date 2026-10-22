// Hexenring – the Humus of notes and Bewegung (SPEC §5): every voice the player (MIDI, the field's layers), the Puls,
// the Bordun start, with t0/t1, degree and octave against the field's scale, its glides and heights; library probes
// and a loop's own voices are not in it. The movement ring: the Fährte's lanes on the Taktgeber's beat, knobs in
// absolute values (a sweep to 150 Hz stays 150 Hz – defect G) and a preset, undo, Mutieren or Würfeln written into
// the lanes at once (a 3 % nudge after a preset is a 3 % nudge – defect D).   node t-hx-humus.js
const H = require('./hx-h'), MH = require('../midi-tests/h');
const { ok } = H;
(async () => {
  const { page, errors } = await MH.open({ url: H.URL_HX, cfg: { ins: [['k1', 'Testkeyboard']] } });
  await H.tools(page); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  // ---- notes ----
  let r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = window.__sleep, o = {};
    M.setParam('v.layer', 'glo'); M.setParam('v.human', 0); M.setParam('seq.bpm', 120);
    const t0 = ctx.currentTime;
    // MIDI: two notes, the second released later (the field's layer and Ebene 2 each make a voice)
    window.__send([0x90, 60, 100]); await sl(250); window.__send([0x90, 64, 90]); await sl(300); window.__send([0x80, 60, 0]); await sl(300); window.__send([0x80, 64, 0]);
    // the field's notes by degree (as a finger's layer plays them), a glide and a height on the held one
    const want = [];
    for (const i of [0, 3, 7]) { const v = M.playNote('obt', ctx.currentTime + 0.01, M.N.notes[i].f, 0.4, 0.7, { bus: M.stripIn('fin') }); want.push(i); if (i === 7) { v.setY(0.8); v.setF(M.N.notes[8].f, 0.05); await sl(100); v.release(); } await sl(120); }
    // the Puls: lane 1 for a bar
    for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
    M.setParam('l0.on', true); M.setParam('l0.eng', 'mem'); M.setParam('l0.steps', 8); M.setParam('l0.puls', 8); M.setParam('l0.prob', 1); M.setParam('l0.div', '0.5');
    M.seqStart(); await sl(2100); M.seqStop();
    // a library probe; a loop's own voice (on the strip „Hexenring“); the Bordun
    M.openPanel('klang'); const T = M.kqTarget('v.eng'); M.kqHear(T, 'glo'); M.closePanel && M.closePanel();
    M.playNote('glo', ctx.currentTime + 0.01, 440, 0.5, 0.5, { bus: M.stripIn('hxr') });
    M.setParam('bor.on', true); await sl(300); M.setParam('bor.on', false); await sl(200);
    const ev = M.hxEvents(t0 - 0.01, ctx.currentTime + 1);
    o.srcs = [...new Set(ev.map((e) => e.src))].join(' ');
    o.midi = ev.filter((e) => e.src === 'fin' && e.eng === M.P['v.eng']).slice(0, 2).map((e) => [+(e.t1 - e.t0).toFixed(2)]);
    o.eb2 = ev.filter((e) => e.src === 'eb2').length;
    const fin = ev.filter((e) => e.eng === 'obt');
    o.deg = fin.map((e) => [e.deg, e.oct, e.alt]);
    o.per = Math.round((M.N.notes.length - 1) / M.P['t.range']);
    o.curves = fin[2] ? { y: fin[2].curves.y.length, f: fin[2].curves.f.length, t1: fin[2].t1 != null } : null;
    o.puls = ev.filter((e) => e.src === 'l0').length; o.pulsBurst = ev.filter((e) => e.src === 'l0').every((e) => e.gate > 0.2 && e.gate < 0.25);
    o.probe = ev.some((e) => e.eng === 'glo' && e.f === 440) || ev.some((e) => e.src === 'hxr');
    o.bor = ev.filter((e) => e.src === 'bor').map((e) => e.t1 != null);
    o.order = ev.every((e, i) => !i || e.t0 >= ev[i - 1].t0);
    return o;
  });
  ok(/fin/.test(r.srcs) && /eb2/.test(r.srcs) && /l0/.test(r.srcs) && /bor/.test(r.srcs), `the notes Humus holds the field, Ebene 2, the Puls and the Bordun (sources ${r.srcs})`);
  ok(r.midi.length === 2 && r.midi[0][0] > 0.4 && r.midi[1][0] > 0.4 && r.eb2 >= 2, `MIDI notes with their start and release (held ${r.midi.map((x) => x[0]).join(', ')} s), and Ebene 2's voices (${r.eb2})`);
  ok(JSON.stringify(r.deg) === JSON.stringify([[0, 0, 0], [3, 0, 0], [7 % r.per, Math.floor(7 / r.per), 0]]), `degrees and octaves against the field's scale: ${JSON.stringify(r.deg)} (${r.per} per octave)`);
  ok(r.curves && r.curves.y >= 1 && r.curves.f >= 1 && r.curves.t1, `a held note's height, glide and release come along (${JSON.stringify(r.curves)})`);
  ok(r.puls >= 3 && r.pulsBurst, `the Puls's notes with src l0 and their step's gate (${r.puls})`);
  ok(!r.probe, 'no library probe, no voice of a loop (bus „Hexenring“)');
  ok(r.bor.length === 1 && r.bor[0] && r.order, 'the Bordun as one event with its end; the events in time order');
  // ---- Bewegung: D and G ----
  r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = window.__sleep, o = {};
    M.setParam('flt.freq', 700); await sl(400);
    const tA = ctx.currentTime;
    const p = M.PRESETS.find((x) => x.v && x.v['flt.freq'] && Math.abs(x.v['flt.freq'] - 700) > 1000) || M.PRESETS[1];
    M.loadPreset(p); const loaded = M.P['flt.freq']; await sl(900);
    const tB = ctx.currentTime;
    M.setParam('flt.freq', loaded * 1.03); await sl(400);
    const tC = ctx.currentTime;
    const mv = M.hxMv(tA, tC), L = mv.lanes.find((x) => x.key === 'p|flt.freq');
    // between the load and the nudge the lane holds the preset's value, not the old 700 Hz
    const mid = [], R = M.FA_R;
    for (let t = tA + 0.15; t < tB - 0.1; t += 0.05) mid.push(L.v[Math.floor(M.faeB(t) * R) - mv.a]);
    o.loaded = loaded; o.mid = [Math.min(...mid), Math.max(...mid)]; o.end = L.v[L.v.length - 1]; o.abs = L.abs;
    // G: a sweep 8000 → 150 → 8000 Hz comes back whole
    const t0 = ctx.currentTime;
    for (let i = 0; i <= 20; i++) { M.setParam('flt.freq', 8000 * Math.pow(150 / 8000, 1 - Math.abs(i - 10) / 10)); await sl(40); }
    await sl(300);
    const mv2 = M.hxMv(t0, ctx.currentTime), L2 = mv2.lanes.find((x) => x.key === 'p|flt.freq');
    o.sweep = [Math.min(...L2.v), Math.max(...L2.v)];
    o.ring = M.FA_RING / M.FA_R;
    return o;
  });
  ok(r.abs && r.mid[0] > r.loaded * 0.999 && r.mid[1] < r.loaded * 1.001 && Math.abs(r.end - r.loaded * 1.03) < 1, `a preset reaches the knob lanes at once: between the load and a 3 % nudge the lane holds ${r.mid.map((x) => Math.round(x)).join('–')} Hz (the preset's ${Math.round(r.loaded)}), then ${Math.round(r.end)} Hz – never the old 700 Hz (defect D)`);
  ok(r.sweep[0] < 151 && r.sweep[1] > 7990, `a sweep 8000 → 150 → 8000 Hz is kept whole, in Hz (${Math.round(r.sweep[0])}–${Math.round(r.sweep[1])} Hz – defect G, nothing clamped)`);
  ok(r.ring >= 400, `the movement ring holds ${r.ring} beats (two minutes at 200 BPM)`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await MH.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await MH.close(); process.exit(1); });
