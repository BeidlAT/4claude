// KORG microKEY Air / microKEY2: keys, joystick (X bend, +Y CC 1 brighter, −Y CC 2 darker), joystick press CC 67 (soft
// pedal, momentary or toggling), SUSTAIN CC 64, learned override of CC 67 and "Profil wiederherstellen"; the same
// over Bluetooth LE MIDI (fake Web Bluetooth).   node t-map-mk.js   (slot 'mm')
const H = require('./hm');
const B = require('./hb');
const { ok } = H;
(async () => {
  const { page, errors } = await H.open({ cfg: { ins: [['k1', 'microKEY Air-25'], ['k2', 'microKEY2-37']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  let r = await ev(() => { const M = window.__M; return [M.profText(M.MIDI.srcs.get('k1')), M.profText(M.MIDI.srcs.get('k2'))]; });
  ok(/^KORG microKEY erkannt – Tasten, Joystick, Sustain$/.test(r[0]) && /^KORG microKEY erkannt/.test(r[1]), 'microKEY Air and microKEY2 recognised: ' + r[0]);

  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), id = 'midi-k1-0-60', o = {};
    S([0x90, 60, 100]);
    const tt = () => M.touches.get(id);
    o.y0 = tt().y;
    S([0xe0, 0x7f, 0x7f]); o.bendUp = M.A.bendCents; S([0xe0, 0, 0]); o.bendDn = M.A.bendCents; S([0xe0, 0, 64]); o.bend0 = M.A.bendCents;
    S([0xb0, 1, 127]); o.yUp = tt().y; S([0xb0, 1, 0]);
    S([0xb0, 2, 127]); o.yDn = tt().y; S([0xb0, 2, 0]); o.yBack = tt().y;
    S([0x80, 60, 0]);
    return o;
  });
  ok(Math.abs(r.bendUp - 200) < 1 && Math.abs(r.bendDn + 200) < 1 && r.bend0 === 0, 'joystick X = pitch bend ±2 HT (' + Math.round(r.bendUp) + ' / ' + Math.round(r.bendDn) + ' ct)');
  ok(r.yUp > r.y0 + 0.3 && r.yDn < r.y0 - 0.3 && Math.abs(r.yBack - r.y0) < 0.01, 'joystick +Y (CC 1) brighter, −Y (CC 2) darker: ' + [r.yDn, r.y0, r.yUp].map((x) => x.toFixed(2)).join(' < '));

  // joystick press CC 67: soft pedal while held (momentary), and as a toggle (127 on one press, 0 on the next)
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), o = {};
    S([0x90, 62, 100]); o.v0 = M.touches.get('midi-k1-0-62').vel; o.yh0 = M.touches.get('midi-k1-0-62').y; S([0x80, 62, 0]);
    S([0x90, 64, 100]);
    S([0xb0, 67, 127]);
    S([0x90, 62, 100]); o.v1 = M.touches.get('midi-k1-0-62').vel; S([0x80, 62, 0]);
    o.held = M.touches.get('midi-k1-0-64').y;
    S([0xb0, 67, 0]);
    o.back = M.touches.get('midi-k1-0-64').y;
    S([0x80, 64, 0]);
    return o;
  });
  ok(Math.abs(r.v1 - r.v0 * 0.6) < 1e-6, 'CC 67 (joystick press) plays softer while held (' + r.v0.toFixed(2) + ' → ' + r.v1.toFixed(2) + ')');
  ok(r.back - r.held > 0.1, 'and darker, back when released');

  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), o = {};
    S([0xb0, 64, 127]); S([0x90, 65, 90]); S([0x80, 65, 0]); o.held = M.touches.has('midi-k1-0-65'); S([0xb0, 64, 0]); o.rel = !M.touches.has('midi-k1-0-65');
    // arpeggiator: the key and the arp on the same note – one finger until both let go
    S([0x90, 67, 90]); S([0x90, 67, 80]); S([0x80, 67, 0]); o.arp = M.touches.has('midi-k1-0-67'); S([0x80, 67, 0]); o.arpEnd = !M.touches.has('midi-k1-0-67');
    return o;
  });
  ok(r.held && r.rel, 'SUSTAIN (CC 64) holds');
  ok(r.arp && r.arpEnd, 'arpeggiator notes are notes (counted with the keys)');

  // learn: the joystick press as Freeze instead of the soft pedal; then "Profil wiederherstellen"
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), src = M.MIDI.srcs.get('k1'), o = {};
    M.midiLearn(true);
    S([0xb0, 67, 127]); S([0xb0, 67, 0]);
    o.cap = M.LEARN.cap && M.LEARN.cap.num;
    o.b = M.learnPick('freeze') && M.MAP.user.find((b) => b.num === 67);
    M.midiLearn(false);
    await new Promise((res) => setTimeout(res, 700));
    const f0 = M.A.frozen;
    S([0x90, 62, 100]); const v0 = M.touches.get('midi-k1-0-62').vel; S([0x80, 62, 0]);
    S([0xb0, 67, 127]);
    S([0x90, 62, 100]); o.vSame = M.touches.get('midi-k1-0-62').vel === v0; S([0x80, 62, 0]);
    S([0xb0, 67, 0]);
    o.frz = M.A.frozen !== f0;
    S([0xb0, 67, 127]); S([0xb0, 67, 0]); o.frzBack = M.A.frozen === f0;
    M.mapRestore(src);
    o.left = M.MAP.user.filter((b) => b.num === 67).length;
    S([0xb0, 67, 127]); S([0x90, 62, 100]); o.vSoft = M.touches.get('midi-k1-0-62').vel; S([0x80, 62, 0]); S([0xb0, 67, 0]);
    o.v0 = v0; o.frozenNow = M.A.frozen;
    return o;
  });
  ok(r.cap === 67 && r.b && r.b.mode === 'toggle' && r.b.target === 'freeze', 'learn: joystick press (127, 0) → Freeze as a toggle');
  ok(r.vSame && r.frz && r.frzBack, 'the learned binding overrides the soft pedal: press toggles Freeze, notes stay loud');
  ok(r.left === 0 && Math.abs(r.vSoft - r.v0 * 0.6) < 1e-6 && r.frozenNow === r.frozenNow, '"Profil wiederherstellen" drops the override: soft pedal again');
  ok(!errors.length, 'no page errors (Web MIDI)' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();

  // the same keyboard over Bluetooth LE MIDI, paired in the page
  const b = await B.open({ cfg: { ins: [] }, bt: {} });
  await B.pair(b.page, { id: 'dev1', name: 'microKEY Air-25' });
  r = await b.page.evaluate(async () => {
    const M = window.__M, d = window.__bt.dev('dev1'), o = {};
    const src = [...M.MIDI.srcs.values()].find((s) => s.kind === 'ble');
    o.kind = src && src.kind; o.prof = src && M.profText(src);
    const id = 'midi-' + src.key + '-0-60';
    d.send([0x80, 0x80, 0x90, 60, 100]); await new Promise((res) => setTimeout(res, 20));
    o.note = M.touches.has(id);
    const y0 = M.touches.get(id).y;
    d.send([0x80, 0x81, 0xb0, 1, 127]); await new Promise((res) => setTimeout(res, 20));
    o.up = M.touches.get(id).y - y0;
    d.send([0x80, 0x82, 0xb0, 1, 0, 0x82, 0xb0, 67, 127, 0x83, 0x90, 62, 100]); await new Promise((res) => setTimeout(res, 20));
    const t2 = M.touches.get('midi-' + src.key + '-0-62');
    o.soft = t2 && t2.vel;
    o.v = M.touches.get(id).vel;
    d.send([0x80, 0x84, 0xb0, 67, 0, 0x84, 0x80, 62, 0, 0x84, 0x80, 60, 0]); await new Promise((res) => setTimeout(res, 20));
    o.off = !M.touches.has(id);
    return o;
  });
  B.ok(r.kind === 'ble' && /^KORG microKEY erkannt/.test(r.prof), 'over Bluetooth direct: profile recognised by the Bluetooth name');
  B.ok(r.note && r.up > 0.3 && r.off, 'Bluetooth: keys and joystick (CC 1) play');
  B.ok(Math.abs(r.soft - r.v * 0.6) < 1e-6, 'Bluetooth: joystick press (CC 67) = soft pedal');
  B.ok(!b.errors.length, 'no page errors (Bluetooth)' + (b.errors.length ? ': ' + b.errors.join(' | ') : ''));
  await B.close();
})().catch((e) => { console.error(e); process.exitCode = 1; H.close(); B.close(); });
