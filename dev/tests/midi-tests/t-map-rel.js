// Relative encoders (two's complement, signed bit, binary offset) on params, counts, choices and step actions; their
// detection in learn (and knobs, buttons, 14-bit pairs); other built-in profiles (MPK mini, MiniLab 3, Launchkey,
// KeyStep, LPD8, nanoPAD2); the General MIDI defaults and their switch; 14-bit, bend and program-change bindings.
// node t-map-rel.js   (slot 'mm')
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['e', 'Encoder Box'], ['mpk', 'MPK mini 3'], ['ml', 'Minilab3 MIDI'], ['lk', 'Launchkey Mini MK4 25 MIDI'], ['ks', 'Arturia KeyStep 37'],
    ['lpd', 'LPD8'], ['np', 'nanoPAD2'], ['g', 'USB Keyboard'], ['mpe', 'Seaboard Block']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // relative bindings (as a file would bring them)
  let r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'e'), o = {};
    o.n = M.mapImport(JSON.stringify({ binds: [
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 10, target: 'dly.mix', mode: 'rel2c' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 11, target: 'rev.mix', mode: 'relSB' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 12, target: 'pha.mix', mode: 'relBO' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 13, target: 'seq.bpm', mode: 'rel2c' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 14, target: 't.scale', mode: 'relBO' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 15, target: 'root.up', mode: 'rel2c' },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 16, target: 'cho.mix', mode: 'rel2c', inv: true },
      { dev: 'Encoder Box', ch: 0, type: 'cc', num: 17, target: 'xfin.vol', mode: 'relBO' },
    ] }));
    M.setParam('dly.mix', 0.5); M.setParam('rev.mix', 0.5); M.setParam('pha.mix', 0.5); M.setParam('seq.bpm', 100); M.setParam('t.scale', 'mpent'); M.setParam('t.root', '2'); M.setParam('cho.mix', 0.5); M.setParam('xfin.vol', 0);
    for (let i = 0; i < 5; i++) S([0xb0, 10, 1]); M.mapFlush(); o.d1 = M.P['dly.mix'];
    S([0xb0, 10, 127]); S([0xb0, 10, 126]); M.mapFlush(); o.d2 = M.P['dly.mix'];
    S([0xb0, 11, 1]); S([0xb0, 11, 1]); S([0xb0, 11, 65]); M.mapFlush(); o.r1 = M.P['rev.mix'];
    S([0xb0, 11, 67]); M.mapFlush(); o.r2 = M.P['rev.mix'];
    S([0xb0, 12, 65]); S([0xb0, 12, 65]); S([0xb0, 12, 66]); M.mapFlush(); o.p1 = M.P['pha.mix'];
    S([0xb0, 12, 63]); M.mapFlush(); o.p2 = M.P['pha.mix'];
    S([0xb0, 13, 1]); S([0xb0, 13, 1]); S([0xb0, 13, 1]); M.mapFlush(); o.bpm = M.P['seq.bpm'];
    S([0xb0, 13, 127]); M.mapFlush(); o.bpm2 = M.P['seq.bpm'];
    const sc = M.PD['t.scale'].opts.map((x) => x[0]);
    S([0xb0, 14, 65]); M.mapFlush(); o.sc1 = sc.indexOf(M.P['t.scale']);
    S([0xb0, 14, 63]); S([0xb0, 14, 63]); M.mapFlush(); o.sc2 = sc.indexOf(M.P['t.scale']);
    S([0xb0, 15, 1]); S([0xb0, 15, 1]); M.mapFlush(); o.root1 = M.P['t.root'];
    for (let i = 0; i < 4; i++) S([0xb0, 15, 127]); M.mapFlush(); o.root2 = M.P['t.root'];
    S([0xb0, 16, 3]); M.mapFlush(); o.inv = M.P['cho.mix'];
    S([0xb0, 17, 63]); S([0xb0, 17, 63]); M.mapFlush(); o.vol = M.P['xfin.vol']; o.wantVol = M.mxDb(0.78);
    return o;
  });
  ok(r.n === 8, 'a bindings file imports (8)');
  ok(Math.abs(r.d1 - 0.55) < 1e-6 && Math.abs(r.d2 - 0.52) < 1e-6, "two's complement: 5×(1) → +5 %, 127 / 126 → −1 / −2 %");
  ok(Math.abs(r.r1 - 0.51) < 1e-6 && Math.abs(r.r2 - 0.48) < 1e-6, 'signed bit: 1, 1, 65 → +1 %; 67 → −3 %');
  ok(Math.abs(r.p1 - 0.54) < 1e-6 && Math.abs(r.p2 - 0.53) < 1e-6, 'binary offset: 65, 65, 66 → +4 %; 63 → −1 %');
  ok(r.bpm === 103 && r.bpm2 === 102, 'whole-number params step by one per tick (Tempo 100 → 103 → 102)');
  ok(r.sc1 === 1 && r.sc2 === 0, 'choices step one option per tick (Skala)');
  ok(r.root1 === '4' && r.root2 === '0', 'step action pair: Grundton +2, then −4 (wraps around)');
  ok(Math.abs(r.inv - 0.47) < 1e-6, 'invert turns the direction round');
  ok(Math.abs(r.vol - r.wantVol) < 0.15, 'a level on the fader law in relative steps (' + r.vol + ' dB)');

  // an encoder browsing presets loads the one it rests on
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'ml');
    M.loadPreset(M.PRESETS[0]);
    let loads = 0; const k0 = M.UI.preset;
    S([0xb0, 28, 65]); S([0xb0, 28, 65]); S([0xb0, 28, 65]);
    const mid = M.UI.preset;
    await new Promise((res) => setTimeout(res, 250));
    return { k0, mid, k1: M.UI.preset, want: M.PRESETS[3].key };
  });
  ok(r.mid === r.k0 && r.k1 === r.want, 'MiniLab 3 main encoder (CC 28, binary offset): 3 ticks → one load, 3 presets on');

  // learn detects the control from the gesture
  const det = async (msgs, target) => ev(async ([msgs, target]) => {
    const M = window.__M, S = (b) => window.__send(b, 'e');
    M.midiLearn(true); M.learnPick(target);
    for (const m of msgs) S(m);
    await new Promise((res) => setTimeout(res, 450));
    const b = M.MAP.user[M.MAP.user.length - 1];
    M.midiLearn(false);
    return b && b.target === target ? [b.mode, !!b.hires, b.num] : null;
  }, [msgs, target]);
  const cc = (n, vals) => vals.map((v) => [0xb0, n, v]);
  ok(String(await det(cc(30, [1, 1, 1, 2]), 'flt.q')) === 'rel2c,false,30', "learn: 1, 1, 1, 2 → two's complement");
  ok(String(await det(cc(31, [127, 127, 126]), 'flt.q')) === 'rel2c,false,31', "learn: 127, 127, 126 → two's complement");
  ok(String(await det(cc(32, [65, 65, 65]), 'flt.q')) === 'relBO,false,32', 'learn: 65, 65, 65 → binary offset');
  ok(String(await det(cc(33, [63, 63, 62]), 'flt.q')) === 'relBO,false,33', 'learn: 63, 63, 62 → binary offset');
  ok(String(await det(cc(34, [1, 1, 65, 65]), 'flt.q')) === 'relSB,false,34', 'learn: 1, 1, 65, 65 → signed bit');
  ok(String(await det(cc(35, [40, 41, 43, 46, 50]), 'flt.q')) === 'abs,false,35', 'learn: 40 … 50 → absolute knob');
  ok(String(await det(cc(36, [127, 0]), 'xfin.mute')) === 'toggle,false,36', 'learn: 127, 0 on a switch → toggle');
  ok(String(await det(cc(37, [127, 0]), 'stille')) === 'trigger,false,37', 'learn: a button on an action → trigger');
  ok(String(await det([[0xb0, 7, 64], [0xb0, 39, 10], [0xb0, 7, 65], [0xb0, 39, 90], [0xb0, 7, 66], [0xb0, 39, 3]], 'flt.freq')) === 'abs,true,7', 'learn: CC 7 + CC 39 pairs → 14 bit');
  ok(String(await det([[0x90, 40, 100], [0x80, 40, 0]], 'hit.2')) === 'trigger,false,40', 'learn: a pad on "Spur 3 anschlagen" → trigger');

  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'e');
    const f = (n) => 40 * Math.pow(450, n);
    M.setParam('flt.freq', f(8192 / 16383));
    S([0xb0, 7, 64]); S([0xb0, 39, 0]); M.mapFlush(); const a = M.P['flt.freq'];
    S([0xb0, 39, 127]); M.mapFlush(); const b = M.P['flt.freq'];
    return { a, b, want: f(8192 / 16383), want2: f((8192 + 127) / 16383), coarse: f(8320 / 16383) };
  });
  ok(Math.abs(r.a - r.want) < 0.01 && Math.abs(r.b - r.want2) < 0.01 && r.b < r.coarse, '14-bit binding: the fine part (CC 39) moves Filter in 1/16383 steps (' + r.a.toFixed(2) + ' → ' + r.b.toFixed(2) + ' Hz)');

  // bend, program change and pressure as bindings
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'e');
    M.mapImport(JSON.stringify({ binds: [{ dev: 'Encoder Box', ch: 1, type: 'bend', num: -1, target: 'v.width', mode: 'abs', to: false },
      { dev: 'Encoder Box', ch: 0, type: 'pc', num: 5, target: 'freeze', mode: 'toggle' }] }));
    S([0xe1, 0, 96]); M.mapFlush();
    const w = M.P['v.width'], cents = M.A.bendCents;
    const f0 = M.A.frozen; S([0xc0, 5]); const f1 = M.A.frozen; S([0xc0, 5]);
    return { w, cents, f0, f1, f2: M.A.frozen };
  });
  ok(Math.abs(r.w - 96 / 128) < 0.01 && !r.cents, 'a pitch wheel bound to a param moves it and bends nothing');
  ok(r.f1 !== r.f0 && r.f2 === r.f0, 'program change 6 bound to Freeze toggles it (and loads no preset)');

  // MPK mini: knobs CC 70–77, pads on channel 10 (notes or triggers), transport CC 115–119
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'mpk'), o = {};
    o.prof = M.profText(M.MIDI.srcs.get('mpk'));
    M.setParam('flt.freq', 9000);
    S([0xb0, 70, 115]); S([0xb0, 70, 30]); M.mapFlush(); o.f = M.P['flt.freq'];
    M.setParam('midi.pads', false);
    S([0x99, 36, 100]); o.note = M.touches.has('midi-mpk-9-36'); S([0x89, 36, 0]);
    M.setParam('midi.pads', true);
    const v = M.VIS.events.length;
    S([0x99, 37, 100]); S([0x89, 37, 0]); o.hit = M.VIS.events.slice(v).some((e) => e.kind === 'hit' && e.lane === 1); o.note2 = M.touches.has('midi-mpk-9-37');
    M.setParam('midi.pads', false);
    if (M.SEQ.on) M.seqStop();
    S([0xb0, 118, 127]); S([0xb0, 118, 0]); o.play = M.SEQ.on; S([0xb0, 117, 127]); S([0xb0, 117, 0]); o.stop = !M.SEQ.on;
    return o;
  });
  ok(/^Akai MPK mini erkannt/.test(r.prof) && Math.abs(r.f - 40 * Math.pow(450, 30 / 127)) < 1, 'MPK mini: knob 1 (CC 70) → Filter');
  ok(r.note && r.hit && !r.note2, 'MPK mini pads (ch 10): notes, or with "Pads als Auslöser" Spur 2 strikes');
  ok(r.play && r.stop, 'MPK mini Plus transport: Play (CC 118) / Stop (CC 117)');

  // MiniLab 3, Launchkey mk4, KeyStep: their knobs, not the GM meaning of the same CC numbers
  r = await ev(() => {
    const M = window.__M, o = {}, cc = (k, n, a, b) => { window.__send([0xb0, n, a], k); window.__send([0xb0, n, b], k); };
    M.setParam('flt.freq', 9000); M.setParam('rev.mix', 0.45); M.setParam('cho.mix', 0.3); M.setParam('flt.q', 0.9); M.setParam('xfin.vol', 0); M.setParam('mix.pulsVol', 0);
    cc('ml', 93, 57, 100); M.mapFlush(); o.mlHall = M.P['rev.mix']; o.cho = M.P['cho.mix'];
    cc('ml', 17, 102, 50); M.mapFlush(); o.mlPuls = M.P['mix.pulsVol']; o.mlWant = M.mxDb(50 / 127);
    cc('lk', 71, 102, 50); M.mapFlush(); o.lkFin = M.P['xfin.vol']; o.q = M.P['flt.q'];
    M.setParam('dly.mix', 0.35);
    cc('ks', 77, 44, 100); M.mapFlush(); o.ksEcho = M.P['dly.mix'];
    o.prof = ['ml', 'lk', 'ks'].map((k) => M.profText(M.MIDI.srcs.get(k)).split(' erkannt')[0]);
    return o;
  });
  ok(Math.abs(r.mlHall - 100 / 127) < 0.01 && r.cho === 0.3, 'MiniLab 3: knob 5 (CC 93) → Hall, not GM "Schweben"');
  ok(Math.abs(r.mlPuls - r.mlWant) < 0.06, 'MiniLab 3: fader 4 (CC 17) → Puls gesamt (' + r.mlPuls + ' dB)');
  ok(r.lkFin < -10 && r.q === 0.9, 'Launchkey mk4: fader 1 (CC 71) → Klang level, not GM resonance');
  ok(Math.abs(r.ksEcho - 100 / 127) < 0.01, 'KeyStep: knob 4 (CC 77) → Echo');
  ok(r.prof.join() === 'Arturia MiniLab 3,Novation Launchkey mk4,Arturia KeyStep', 'profiles: ' + r.prof.join(', '));

  // pad controllers: pads are triggers without the option; nanoPAD2's two rows
  r = await ev(() => {
    const M = window.__M, o = {}, hitOf = (k, n) => { const v = M.VIS.events.length; window.__send([0x90, n, 100], k); window.__send([0x80, n, 0], k); return M.VIS.events.slice(v).filter((e) => e.kind === 'hit').map((e) => e.lane).join(); };
    M.setParam('midi.pads', false);
    o.lpd = hitOf('lpd', 36); o.np = [hitOf('np', 36), hitOf('np', 38), hitOf('np', 40), hitOf('np', 42)].join('|');
    if (M.SEQ.on) M.seqStop();
    hitOf('np', 44); o.npPuls = M.SEQ.on; hitOf('np', 44);
    o.npTop = M.PD ? (() => { const k0 = M.UI.preset; M.loadPreset(M.PRESETS[0]); hitOf('np', 39); return M.UI.preset; })() : null;
    o.want = M.PRESETS[1].key;
    o.noNote = !M.touches.has('midi-np-0-36');
    return o;
  });
  ok(r.lpd === '0' && r.np === '0|1|2|3' && r.noNote, 'LPD8 / nanoPAD2 pads strike Spur 1–4 without the option');
  ok(r.npPuls && r.npTop === r.want, 'nanoPAD2: bottom pad 5 → Puls, top row pad 10 (note 39) → next preset');

  // General MIDI defaults for a keyboard without a profile, and their switch
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'g'), o = {}, two = (n, a, b) => { S([0xb0, n, a]); S([0xb0, n, b]); };
    M.setParam('midi.std', true);
    const base = { 'xfin.vol': 0, 'xfin.pan': 0, 'flt.q': 0.9, 'flt.freq': 9000, 'rev.mix': 0.45, 'cho.mix': 0.3, 'pha.mix': 0.25, 'v.glide': 0.08 };
    for (const k in base) M.setParam(k, base[k]);
    two(7, 102, 60); two(10, 64, 0); two(71, 10, 127); two(74, 113, 20); two(91, 57, 127); two(93, 38, 0); two(95, 32, 127); two(5, 30, 0);
    M.mapFlush();
    o.v = Object.keys(base).map((k) => M.P[k]);
    S([0xb0, 11, 64]); o.expr = M.MIDI.expr; S([0xb0, 11, 127]); o.expr2 = M.MIDI.expr;
    S([0xb0, 11, 30]); S([0xb0, 121, 0]); o.exprReset = M.MIDI.expr;
    M.setParam('midi.std', false);
    for (const k in base) M.setParam(k, base[k]);
    two(7, 102, 60); two(91, 57, 127); M.mapFlush();
    o.off = [M.P['xfin.vol'], M.P['rev.mix']];
    M.setParam('midi.std', true);
    return o;
  });
  ok(Math.abs(r.v[0] - (-13)) < 0.1 && r.v[1] === -1 && r.v[2] === 18 && Math.abs(r.v[3] - 40 * Math.pow(450, 20 / 127)) < 0.1 && r.v[4] === 1 && r.v[5] === 0 && r.v[6] === 1 && r.v[7] === 0,
    'GM: CC 7 level, 10 balance, 71 resonance, 74 filter, 91 hall, 93 chorus, 95 phaser, 5 glide → ' + r.v.map((x) => +(+x).toFixed(2)).join(' '));
  ok(Math.abs(r.expr - (64 / 127) ** 2) < 1e-6 && r.expr2 === 1 && r.exprReset === 1, 'CC 11 expression scales the Klang level (gain ' + r.expr.toFixed(2) + '); CC 121 resets it');
  ok(r.off[0] === 0 && r.off[1] === 0.45, '"Standard-Zuordnungen" off: CC 7 / 91 do nothing');

  // MPE: CC 74 on a member channel is the note's height, not the filter
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'mpe');
    M.setParam('midi.mpe', 'on'); M.setParam('flt.freq', 9000);
    S([0x91, 60, 100]); const y0 = M.touches.get('midi-mpe-1-60').y;
    S([0xb1, 74, 127]); const y1 = M.touches.get('midi-mpe-1-60').y; S([0x81, 60, 0]);
    const f = M.P['flt.freq'];
    S([0xb0, 74, 113]); S([0xb0, 74, 0]); M.mapFlush(); const f2 = M.P['flt.freq'];
    M.setParam('midi.mpe', 'auto');
    return { y0, y1, f, f2 };
  });
  ok(r.y1 > r.y0 && r.f === 9000 && r.f2 < 100, 'MPE member CC 74 → note height; on the manager channel → Filter');

  // the target list and its search
  r = await ev(() => {
    const M = window.__M, all = M.mapTargets(), s = (q) => M.mapSearch(q).map((t) => t.key);
    return { n: all.length, acts: ['puls', 'freeze', 'rec', 'stille', 'preset.next', 'bor.on', 'l0.on', 'xl0.mute', 'hit.0', 'scene.a', 'scene.b', 'morph', 'root.up', 'scale.down', 'oct.up', 'deg.down', 'xy.x', 'xy.y', 'xy.gate', 'up', 'dark', 'macro.a', 'macro.b', 'soft', 'sus', 'expr', 'tap'].filter((k) => !M.mtOf(k)),
      hall: s('hall anteil'), dev: all.some((t) => t.key.startsWith('dev.') || t.key.startsWith('midi.') || t.key.startsWith('rec.')), spur: s('spur 2 anschlagen'), umlaut: s('klangfarbe heller') };
  });
  ok(r.acts.length === 0, 'every action of the spec is a target' + (r.acts.length ? ' (missing ' + r.acts.join() + ')' : ''));
  ok(r.n > 300 && !r.dev && r.hall.includes('rev.mix') && r.spur[0] === 'hit.1' && r.umlaut.includes('up'), 'searchable list: ' + r.n + ' targets, no device settings; "hall anteil", "klangfarbe heller" found');

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exitCode = 1; close(); });
