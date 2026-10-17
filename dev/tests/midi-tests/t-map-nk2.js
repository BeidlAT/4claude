// KORG nanoKONTROL2 → the mixer: faders (CC 0–7, fader law, CC 0 never bank select), knobs → balances, S/M/R,
// transport, scenes, presets; its other buttons never act as pedals or GM sound; the mixer's view follows.
// node t-map-nk2.js   (slot 'mm')
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['n', 'nanoKONTROL2 SLIDER/KNOB'], ['w', 'nanoKONTROL2'], ['k', 'Testkeyboard']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  let r = await ev(() => { const M = window.__M; return [M.profText(M.MIDI.srcs.get('n')), M.profText(M.MIDI.srcs.get('w'))]; });
  ok(r.every((t) => /^KORG nanoKONTROL2 erkannt – Fader, Regler/.test(t)), 'macOS and Windows port names recognised');

  // faders → strip levels on the fader law; fader 1 sends CC 0 – no bank select
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'n'), o = {};
    for (const k of ['fin', 'eb2', 'l0', 'l1', 'l2', 'l3', 'bor', 'rev']) M.setParam('x' + k + '.vol', 0);
    S([0xb0, 0, 102]); S([0xb0, 0, 64]); M.mapFlush();
    o.fin = M.P['xfin.vol']; o.want = M.mxDb(64 / 127);
    o.bank = M.chState(M.MIDI.srcs.get('n'), 0).bank;
    S([0xb0, 7, 102]); S([0xb0, 7, 30]); M.mapFlush(); o.rev = M.P['xrev.vol']; o.wantRev = M.mxDb(30 / 127);
    S([0xb0, 6, 102]); S([0xb0, 6, 127]); M.mapFlush(); o.bor = M.P['xbor.vol'];
    S([0xb0, 2, 101]); S([0xb0, 2, 0]); M.mapFlush(); o.l0 = M.P['xl0.vol'];
    o.others = [M.P['xeb2.vol'], M.P['xl1.vol']];
    return o;
  });
  ok(Math.abs(r.fin - r.want) < 0.06, 'fader 1 (CC 0) → Klang ' + r.fin + ' dB (fader law)');
  ok(r.bank === 0, 'CC 0 from the nanoKONTROL2 is never bank select');
  ok(Math.abs(r.rev - r.wantRev) < 0.06, 'fader 8 (CC 7) → Hall, not the GM volume of Klang');
  ok(r.bor === 6 && r.l0 === -60 && r.others.join() === '0,0', 'fader 7 → Bordun +6 dB, fader 3 → Spur 1 off, others untouched');

  // knobs → balances (soft takeover from the centre)
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'n');
    M.setParam('xfin.pan', 0); M.setParam('xl3.pan', 0);
    S([0xb0, 16, 64]); S([0xb0, 16, 0]); S([0xb0, 21, 64]); S([0xb0, 21, 127]); M.mapFlush();
    return [M.P['xfin.pan'], M.P['xl3.pan']];
  });
  ok(r[0] === -1 && r[1] === 1, 'knob 1 → Klang balance L, knob 6 → Spur 4 balance R');

  // S / M / R buttons (127 on press, 0 on release)
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'n'), btn = (cc) => { S([0xb0, cc, 127]); S([0xb0, cc, 0]); }, o = {};
    btn(32); o.solo = M.P['xfin.solo']; btn(32); o.solo2 = M.P['xfin.solo'];
    btn(50); o.mute = M.P['xl0.mute']; btn(50); o.mute2 = M.P['xl0.mute'];
    const l2 = M.P['l2.on']; btn(68); o.l2 = M.P['l2.on'] !== l2; btn(68);
    const b0 = M.P['bor.on']; btn(70); o.bor = M.P['bor.on'] !== b0; if (M.P['bor.on']) btn(70);
    // R1 (CC 64) and R2 (CC 65) are no pedals, R8 (CC 71) no resonance
    const q = M.P['flt.q']; btn(71); o.q = M.P['flt.q'] === q;
    S([0xb0, 64, 127]); o.sus = M.chState(M.MIDI.srcs.get('n'), 0).sus; S([0xb0, 64, 0]);
    // and a keyboard's sustain is its own
    window.__send([0xb0, 64, 127], 'k'); o.kSus = M.chState(M.MIDI.srcs.get('k'), 0).sus; window.__send([0xb0, 64, 0], 'k');
    return o;
  });
  ok(r.solo === true && r.solo2 === false, 'S1 toggles Klang solo');
  ok(r.mute === true && r.mute2 === false, 'M3 toggles Spur 1 mute');
  ok(r.l2 && r.bor, 'R5 → Spur 3 an/aus, R7 → Bordun an/aus');
  ok(r.q && r.sus === false && r.kSus === true, 'unbound buttons (R1 = CC 64, R8 = CC 71) are neither pedal nor GM sound');

  // transport: Play toggles the Puls, Stop stops, Cycle / Marker switch scenes, Track ◀ ▶ presets
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'n'), btn = (cc) => { S([0xb0, cc, 127]); S([0xb0, cc, 0]); }, o = {};
    if (M.SEQ.on) M.seqStop();
    btn(41); o.play = M.SEQ.on; btn(42); o.stop = !M.SEQ.on; btn(41); btn(41); o.toggle = !M.SEQ.on;
    M.setParam('xfin.vol', 0); M.mxSnapStore('a'); M.setParam('xfin.vol', -20); M.mxSnapStore('b');
    btn(61); o.a = M.P['xfin.vol']; btn(62); o.b = M.P['xfin.vol']; btn(46); o.cyc = M.P['xfin.vol']; btn(46); o.cyc2 = M.P['xfin.vol'];
    M.MX.snap.b = Object.assign({}, M.MX.snap.a);
    M.loadPreset(M.PRESETS[0]);
    btn(59); o.p1 = M.UI.preset; btn(59); o.p2 = M.UI.preset; btn(58); o.p3 = M.UI.preset;
    o.keys = M.PRESETS.slice(0, 3).map((p) => p.key);
    return o;
  });
  ok(r.play && r.stop && r.toggle, 'Play starts / stops the Puls, Stop stops');
  ok(r.a === 0 && r.b === -20 && r.cyc === 0 && r.cyc2 === -20, 'Marker ◀ / ▶ → Szene A / B, Cycle switches A ↔ B');
  ok(r.p1 === r.keys[1] && r.p2 === r.keys[2] && r.p3 === r.keys[1], 'Track ◀ ▶ → preset −/+');

  // Rec → Aufnahme (starts once the recorder is ready)
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'n'), btn = (cc) => { S([0xb0, cc, 127]); S([0xb0, cc, 0]); };
    btn(45);
    for (let i = 0; i < 40 && M.CAP.state === 'idle'; i++) await new Promise((res) => setTimeout(res, 50));
    const on = M.CAP.state;
    btn(45);
    for (let i = 0; i < 60 && M.CAP.state !== 'idle'; i++) await new Promise((res) => setTimeout(res, 50));
    return { on, off: M.CAP.state };
  });
  ok(r.on !== 'idle' && r.off === 'idle', 'Rec starts and ends a recording (' + r.on + ' → ' + r.off + ')');

  // the mixer follows: its stem and M button show what the hardware set
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'n');
    M.openPanel('mix');
    await new Promise((res) => setTimeout(res, 300));
    M.setParam('xeb2.vol', 0);
    S([0xb0, 1, 102]); S([0xb0, 1, 80]); S([0xb0, 49, 127]); S([0xb0, 49, 0]);
    await new Promise((res) => setTimeout(res, 100));
    const cap = document.querySelector('.mx-st[data-k="eb2"] .mx-cap'), mb = document.querySelector('.mx-st[data-k="eb2"] [data-pid="xeb2.mute"]');
    const o = { v: M.P['xeb2.vol'], aria: cap && Number(cap.getAttribute('aria-valuenow')), m: mb && mb.getAttribute('aria-pressed') };
    S([0xb0, 49, 127]); S([0xb0, 49, 0]);
    M.openPanel('mix');
    return o;
  });
  ok(r.aria === r.v && r.m === 'true', 'the open mixer shows it: Ebene 2 cap at ' + r.aria + ' dB, M lit');

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exitCode = 1; close(); });
