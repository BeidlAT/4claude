// KORG nanoKEY Studio, factory scene 1, as a full simulation: knobs with soft takeover, macros following the engine,
// fader law, morph, coalescing, X-Y pad as a finger, Touch Scale, pads as notes / triggers (ch 1 with the option, ch 10
// always), sustain, pitch/mod, tentative scene banks.   node t-map-nks.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'nanoKEY Studio'], ['k2', 'Testkeyboard']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  let r = await ev(() => {
    const M = window.__M, src = M.MIDI.srcs.get('k1');
    return { txt: M.profText(src), clock: !!(src.prof && src.prof.clock), other: M.profText(M.MIDI.srcs.get('k2')) };
  });
  ok(r.txt === 'KORG nanoKEY Studio erkannt – Regler, X-Y-Pad, Pads, Pitch/Mod', 'profile recognised by name: ' + r.txt);
  ok(r.clock && r.other === '', 'clock out offered for it; a plain keyboard has no profile');

  // knob 1 → Filter with soft takeover: far values wait, crossing takes over, then it follows
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), d = M.PD['flt.freq'];
    M.setParam('flt.freq', Math.sqrt(40 * 18000));
    const v0 = M.P['flt.freq'];
    S([0xb0, 20, 10]); S([0xb0, 20, 20]); S([0xb0, 20, 40]); M.mapFlush();
    const waited = M.P['flt.freq'] === v0;
    S([0xb0, 20, 70]); M.mapFlush();
    const took = M.P['flt.freq'];
    S([0xb0, 20, 100]); M.mapFlush();
    const follow = M.P['flt.freq'];
    return { waited, took, follow, exp70: 40 * Math.pow(18000 / 40, 70 / 127), exp100: 40 * Math.pow(18000 / 40, 100 / 127) };
  });
  ok(r.waited, 'soft takeover: knob far below the value changes nothing');
  ok(Math.abs(r.took - r.exp70) / r.exp70 < 0.01, 'crossing the value takes over (' + Math.round(r.took) + ' Hz)');
  ok(Math.abs(r.follow - r.exp100) / r.exp100 < 0.01, 'then it follows on the param curve (CC 100 → ' + Math.round(r.follow) + ' Hz)');

  // first value close to the value is taken at once; a value set on screen must be met again
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), wait = (ms) => new Promise((res) => setTimeout(res, ms));
    M.setParam('dly.mix', 0.5);
    S([0xb0, 23, 64]); M.mapFlush(); const near = M.P['dly.mix'];
    S([0xb0, 23, 80]); M.mapFlush(); const a = M.P['dly.mix'];
    await wait(70);   // values within 50 ms of an accepted one pass (a fast turn); this is a new touch
    M.setParam('dly.mix', 0.2);   // changed on screen
    S([0xb0, 23, 90]); M.mapFlush(); const b = M.P['dly.mix'];
    S([0xb0, 23, 20]); M.mapFlush(); const c = M.P['dly.mix'];
    return { near, a, b, c };
  });
  ok(Math.abs(r.near - 64 / 127) < 0.01 && Math.abs(r.a - 80 / 127) < 0.01, 'knob 4 → Echo: close first value taken, then follows');
  ok(r.b === 0.2 && Math.abs(r.c - 20 / 127) < 0.01, 'after a change on screen the knob picks the value up again (crossing)');

  // knobs 2/3 = Klang-Makro A/B follow the active engine
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), out = {};
    M.setParam('v.eng', 'neb');
    out.neb = [M.macroId(0), M.macroId(1)];
    const n0 = M.P['neb.cut'], m = Math.round(Math.max(0, Math.min(1, Math.log(n0 / 80) / Math.log(12000 / 80))) * 127);
    S([0xb0, 21, m]); S([0xb0, 21, Math.min(127, m + 20)]); M.mapFlush();
    out.cut = M.P['neb.cut'] !== n0;
    M.setParam('v.eng', 'glo');
    out.glo = [M.macroId(0), M.macroId(1)];
    const g0 = M.P['glo.index'], gm = Math.round(g0 / 12 * 127);
    S([0xb0, 21, gm]); S([0xb0, 21, Math.min(127, gm + 30)]); M.mapFlush();
    out.idx = M.P['glo.index'];
    out.idxWant = M.PD['glo.index'] ? Math.min(127, gm + 30) / 127 * 12 : null;
    out.cutStill = M.P['neb.cut'];
    out.name = M.tName(M.mtOf('macro.a'));
    M.setParam('v.eng', 'neb');
    // every macro param exists
    out.allOk = ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch', 'gng', 'klb', 'obt', 'stm', 'swm', 'tie', 'trp'].every((e) => { M.setParam('v.eng', e); return !!M.PD[M.macroId(0)] && !!M.PD[M.macroId(1)]; });
    M.setParam('v.eng', 'neb');
    return out;
  });
  ok(r.neb.join() === 'neb.cut,neb.res' && r.cut, 'knob 2 = Klang-Makro A moves Nebel Filter');
  ok(r.glo.join() === 'glo.index,glo.ratio' && Math.abs(r.idx - r.idxWant) < 0.15, 'with Glocke the same knob moves its FM index (' + r.idx + '), name: ' + r.name);
  ok(r.allOk, 'all 14 engines have two macro params');

  // knob 7 → Puls gesamt on the console's fader law (0 dB at 80 %, CC 102)
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('mix.pulsVol', 0);
    S([0xb0, 26, 101]); S([0xb0, 26, 102]); M.mapFlush(); const zero = M.P['mix.pulsVol'];
    S([0xb0, 26, 90]); M.mapFlush(); const v90 = M.P['mix.pulsVol'];
    S([0xb0, 26, 60]); M.mapFlush(); const v60 = M.P['mix.pulsVol'];
    S([0xb0, 26, 0]); M.mapFlush(); const v0 = M.P['mix.pulsVol'];
    S([0xb0, 26, 102]); M.mapFlush();
    return { zero, v90, w90: M.mxDb(90 / 127), v60, w60: M.mxDb(60 / 127), v0 };
  });
  ok(r.zero === 0, 'knob 7 at CC 102 = 0 dB (fader law)');
  ok(Math.abs(r.v90 - r.w90) < 0.06 && Math.abs(r.v60 - r.w60) < 0.06 && r.v0 === -60, 'fader law: CC 90 → ' + r.v90 + ' dB, CC 60 → ' + r.v60 + ' dB, CC 0 → off');

  // knob 6 → Ebene 2 level, knob 5 → Hall
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('v.layerLvl', 0.5); M.setParam('rev.mix', 0.45);
    S([0xb0, 25, 64]); S([0xb0, 25, 100]); S([0xb0, 24, 57]); S([0xb0, 24, 30]); M.mapFlush();
    return { lay: M.P['v.layerLvl'], rev: M.P['rev.mix'] };
  });
  ok(Math.abs(r.lay - 100 / 127) < 0.01 && Math.abs(r.rev - 30 / 127) < 0.01, 'knob 6 → Ebene 2, knob 5 → Hall');

  // coalescing: 60 values in one go set the param once per frame
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.mapFlush();
    let n = 0; (M.CTL['rev.mix'] || (M.CTL['rev.mix'] = [])).push(() => n++);
    for (let i = 0; i < 60; i++) S([0xb0, 24, 30 + (i % 40)]);
    const before = n; M.mapFlush(); const after = n;
    M.CTL['rev.mix'].pop();
    return { before, after, v: M.P['rev.mix'] };
  });
  ok(r.before === 0 && r.after === 1, '60 knob values → 1 parameter write per frame (' + r.after + ')');
  await page.waitForTimeout(60);
  r = await ev(() => { const M = window.__M; window.__send([0xb0, 24, 50], 'k1'); return M.MAP.pend.size; });
  await page.waitForTimeout(80);
  r = await ev((n) => ({ n, left: window.__M.MAP.pend.size, v: window.__M.P['rev.mix'] }), r);
  ok(r.n === 1 && r.left === 0 && Math.abs(r.v - 50 / 127) < 0.01, 'the frame loop flushes pending values by itself');

  // knob 8 → Morph A↔B between two stored mixes
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('xfin.vol', 0); M.mxSnapStore('a');
    M.setParam('xfin.vol', -12); M.mxSnapStore('b');
    M.setParam('xfin.vol', 0); M.MX.mUI = 0; M.MX.snap.m = 0;
    S([0xb0, 27, 0]); S([0xb0, 27, 64]); S([0xb0, 27, 127]);
    M.mapFlush();
    await new Promise((res) => setTimeout(res, 120)); M.mapFlush();
    const b = M.P['xfin.vol'], m1 = M.MX.mUI;
    S([0xb0, 27, 64]); await new Promise((res) => setTimeout(res, 120)); M.mapFlush();
    return { b, m1, mid: M.P['xfin.vol'], m2: M.MX.mUI };
  });
  ok(r.m1 === 1 && r.b === -12, 'knob 8 morphs to B (Klang −12 dB)');
  ok(Math.abs(r.m2 - 64 / 127) < 0.01 && r.mid < -3 && r.mid > -9, 'halfway: ' + r.mid + ' dB');
  await ev(() => { const M = window.__M; M.MX.snap.b = Object.assign({}, M.MX.snap.a); M.setParam('xfin.vol', 0); });

  // X-Y pad as a finger: touch (CC 18) strikes, X (CC 16) glides the pitch, Y (CC 17) the height, release ends it
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), id = 'midi-xy-k1';
    M.setParam('v.eng', 'neb'); M.setParam('v.glide', 0.08);
    S([0xb0, 18, 127]); S([0xb0, 16, 20]); S([0xb0, 17, 30]);
    const tt = M.touches.get(id);
    if (!tt) return { down: false };
    const v0 = tt.voices.map((x) => x.v), f0 = tt.f, x0 = tt.x, y0 = tt.y;
    S([0xb0, 16, 100]); S([0xb0, 17, 110]);
    const t2 = M.touches.get(id);
    const out = { down: true, x0, y0, f0, x1: t2.x, y1: t2.y, f1: t2.f, same: t2 === tt && t2.voices.length === v0.length && t2.voices.every((x, i) => x.v === v0[i]), alive: t2.voices.every((x) => x.v.alive) };
    S([0xb0, 18, 0]);
    out.up = !M.touches.has(id) && v0.every((v) => v.released || !v.alive);
    return out;
  });
  ok(r.down, 'X-Y touch + position → a finger on the field (midi-xy-<src>)');
  ok(Math.abs(r.x0 - 20 / 127) < 0.01 && Math.abs(r.y0 - 30 / 127) < 0.01, 'finger starts where the pad is touched');
  ok(r.same && r.alive && r.f1 > r.f0 && Math.abs(r.x1 - 100 / 127) < 0.01 && Math.abs(r.y1 - 110 / 127) < 0.01, 'moving glides the same voices (no new strike): ' + Math.round(r.f0) + ' → ' + Math.round(r.f1) + ' Hz');
  ok(r.up, 'lifting (CC 18 = 0) releases the finger');

  // touch arriving before the position: waits up to 30 ms for it
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), id = 'midi-xy-k1';
    await new Promise((res) => setTimeout(res, 60));
    S([0xb0, 18, 127]);
    const early = M.touches.has(id);
    await new Promise((res) => setTimeout(res, 10));
    S([0xb0, 16, 64]); S([0xb0, 17, 64]);
    const tt = M.touches.get(id), x = tt && tt.x;
    S([0xb0, 18, 0]);
    // position only, touch never sent by this device? no – it did send touch, so a move without touch plays nothing
    S([0xb0, 16, 70]);
    const ghost = M.touches.has(id);
    return { early, x, ghost };
  });
  ok(!r.early && Math.abs(r.x - 64 / 127) < 0.01, 'touch first: the finger starts at the position that follows');
  ok(!r.ghost, 'once the pad sent its touch, a move without touch plays nothing');

  // all-notes-off from the device lifts the X-Y finger
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), id = 'midi-xy-k1';
    S([0xb0, 18, 127]); S([0xb0, 16, 50]); const a = M.touches.has(id);
    S([0xb0, 123, 0]); const b = M.touches.has(id);
    S([0xb0, 18, 0]);
    return { a, b };
  });
  ok(r.a && !r.b, 'CC 123 from the device lifts its X-Y finger');

  // Touch Scale: notes play as notes (fixed velocity), Y (CC 19) raises their height
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    S([0x90, 62, 100]);
    const tt = M.touches.get('midi-k1-0-62'), y0 = tt && tt.y;
    S([0xb0, 19, 127]);
    const y1 = M.touches.get('midi-k1-0-62').y;
    S([0xb0, 19, 0]);
    const y2 = M.touches.get('midi-k1-0-62').y;
    S([0x80, 62, 0]);
    return { has: !!tt, y0, y1, y2, gone: !M.touches.has('midi-k1-0-62') };
  });
  ok(r.has && r.gone, 'Touch Scale / key notes play on the field');
  ok(r.y1 > r.y0 + 0.3 && Math.abs(r.y2 - r.y0) < 0.01, 'Touch Scale Y (CC 19) → Höhe der Töne: ' + r.y0.toFixed(2) + ' → ' + r.y1.toFixed(2));

  // pads: notes by default (ch 1); "Pads als Auslöser": top row strikes Spur 1–4, bottom row Puls/Bordun/Freeze/Stille
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('midi.pads', false);
    S([0x90, 43, 90]); const note = M.touches.has('midi-k1-0-43'); S([0x80, 43, 0]);
    M.setParam('midi.pads', true);
    const ev0 = M.VIS.events.length;
    S([0x90, 43, 100]);
    const hits = M.VIS.events.slice(ev0).filter((e) => e.kind === 'hit' && e.lane === 0);
    const notePlayed = M.touches.has('midi-k1-0-43');
    S([0x80, 43, 0]);
    const ev1 = M.VIS.events.length;
    S([0x90, 48, 127]); S([0x80, 48, 0]); S([0x90, 50, 127]); S([0x80, 50, 0]); S([0x90, 49, 127]); S([0x80, 49, 0]);
    const lanes = M.VIS.events.slice(ev1).filter((e) => e.kind === 'hit').map((e) => e.lane).join();
    return { note, hit: hits.length, s: hits[0] && hits[0].s, notePlayed, lanes };
  });
  ok(r.note, 'pads play notes by default (ch 1, option off)');
  ok(r.hit === 1 && !r.notePlayed, 'with "Pads als Auslöser": pad 1 (note 43) strikes Spur 1, no note');
  ok(r.lanes === '1,2,3', 'pads 2–4 (48, 50, 49) strike Spur 2–4');
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), o = {};
    const v = M.VIS.events.length;
    S([0x90, 43, 30]); const soft = M.VIS.events.slice(v).find((e) => e.kind === 'hit'); S([0x80, 43, 0]);
    const v2 = M.VIS.events.length;
    S([0x90, 43, 127]); const hard = M.VIS.events.slice(v2).find((e) => e.kind === 'hit'); S([0x80, 43, 0]);
    o.vel = [soft && soft.s, hard && hard.s];
    if (M.SEQ.on) M.seqStop();
    S([0x90, 36, 100]); o.puls = M.SEQ.on; S([0x80, 36, 0]); o.pulsAfterRelease = M.SEQ.on;
    S([0x90, 36, 100]); o.pulsOff = !M.SEQ.on; S([0x80, 36, 0]);
    const b0 = M.P['bor.on'];
    S([0x90, 38, 100]); S([0x80, 38, 0]); o.bor = M.P['bor.on'] !== b0;
    S([0x90, 42, 100]); S([0x80, 42, 0]); o.frz = M.A.frozen;
    S([0x90, 42, 100]); S([0x80, 42, 0]); o.frz2 = !M.A.frozen;
    if (!M.P['bor.on']) { S([0x90, 38, 100]); S([0x80, 38, 0]); }
    S([0x90, 36, 100]); S([0x80, 36, 0]);
    S([0x90, 46, 100]); S([0x80, 46, 0]); o.stille = !M.SEQ.on && !M.P['bor.on'];
    return o;
  });
  ok(r.vel[0] < r.vel[1] * 0.5, 'pad velocity sets the hit level (' + r.vel.map((x) => x && x.toFixed(2)).join(' < ') + ')');
  ok(r.puls && r.pulsAfterRelease && r.pulsOff, 'pad 5 (36) starts the Puls on press, stops on the next press');
  ok(r.bor && r.frz && r.frz2, 'pad 6 (38) Bordun an/aus, pad 7 (42) Freeze an/aus ' + JSON.stringify([r.bor, r.frz, r.frz2]));
  ok(r.stille, 'pad 8 (46) Stille stops Puls and Bordun');

  // channel 10: pads are triggers even with the option off; keys on ch 1 stay notes
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('midi.pads', false);
    const v = M.VIS.events.length;
    S([0x99, 43, 100]); const hit = M.VIS.events.slice(v).some((e) => e.kind === 'hit' && e.lane === 0); const note = M.touches.has('midi-k1-9-43'); S([0x89, 43, 0]);
    S([0x90, 48, 100]); const key = M.touches.has('midi-k1-0-48'); S([0x80, 48, 0]);
    // option switched on while a pad-numbered key is held: its release still ends the note
    S([0x90, 50, 100]); M.setParam('midi.pads', true); S([0x80, 50, 0]); const hung = M.touches.has('midi-k1-0-50');
    M.setParam('midi.pads', false);
    return { hit, note, key, hung };
  });
  ok(r.hit && !r.note, 'pads on channel 10 strike even with "Pads als Auslöser" off');
  ok(r.key, 'keys 48–50 on ch 1 stay notes when the option is off');
  ok(!r.hung, 'a key held while the option flips is still released');

  // sustain (CC 64) and Pitch/Mod (bend + CC 1) go through the message layer
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    S([0xb0, 64, 127]); S([0x90, 60, 100]); S([0x80, 60, 0]); const held = M.touches.has('midi-k1-0-60');
    const y0 = M.touches.get('midi-k1-0-60').y;
    S([0xb0, 1, 127]); const y1 = M.touches.get('midi-k1-0-60').y; S([0xb0, 1, 0]);
    S([0xe0, 0, 127]); const bend = M.A.bendCents; S([0xe0, 0, 64]);
    S([0xb0, 64, 0]); const rel = !M.touches.has('midi-k1-0-60');
    return { held, rel, y0, y1, bend };
  });
  ok(r.held && r.rel, 'Sustain (CC 64) holds and releases');
  ok(r.y1 > r.y0 + 0.2 && r.bend > 150, 'Pitch/Mod: CC 1 raises the height, bend bends (' + Math.round(r.bend) + ' ct)');

  // tentative scene 2 / 3 banks: strip faders (fader law) and balances
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1');
    M.setParam('xl0.vol', 0); M.setParam('xbor.pan', 0);
    S([0xb0, 30, 101]); S([0xb0, 30, 60]); S([0xb0, 43, 64]); S([0xb0, 43, 127]); M.mapFlush();
    const b = M.mapList(M.MIDI.srcs.get('k1')).find((x) => x.b.num === 30 && x.b.type === 'cc');
    return { vol: M.P['xl0.vol'], want: M.mxDb(60 / 127), pan: M.P['xbor.pan'], tent: !!(b && b.b.tent), name: b && b.b.name };
  });
  ok(Math.abs(r.vol - r.want) < 0.06 && r.pan === 1, 'scene 2 knob 3 (CC 30) → Spur 1 fader, scene 3 knob 7 (CC 43) → Bordun balance');
  ok(r.tent && r.name === 'Szene 2 · Regler 3', 'scene 2/3 bindings are marked tentative ("' + r.name + '")');

  // the last-event line for the device card
  r = await ev(() => { const M = window.__M; window.__send([0xb0, 23, 81], 'k1'); M.mapFlush(); return M.mapLine(M.MIDI.srcs.get('k1')); });
  ok(/^Regler 4 · CC 23 → Echo · Anteil \d+ %$/.test(r), 'last event line: "' + r + '"');

  // profile off for this device: knobs do nothing; CC 1, keys still play; persisted
  r = await ev(() => {
    const M = window.__M, src = M.MIDI.srcs.get('k1'), S = (b) => window.__send(b, 'k1');
    M.midiSetProfile(src, false);
    M.setParam('flt.freq', 1000);
    S([0xb0, 20, 40]); S([0xb0, 20, 41]); M.mapFlush();
    const off = M.P['flt.freq'] === 1000, txt = M.profText(src);
    const stored = JSON.parse(localStorage.getItem('myzel.midiports.v1'));
    M.midiSetProfile(src, true);
    return { off, txt, stored: Object.values(stored).some((v) => v.name === 'nanoKEY Studio' && v.prof === false) };
  });
  ok(r.off && /Profil aus/.test(r.txt) && r.stored, 'profile switch per device (off → knobs inert), stored in myzel.midiports.v1');

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exitCode = 1; close(); });
