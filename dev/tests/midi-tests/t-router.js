// Message layer: sources, note ids, ref counting, per-(source, channel) state, pedals, curves, RPN/NRPN, routing hooks,
// channel mode, program change, active sensing, port loss.   node t-router.js
const { open, ok, close } = require('./h');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard'], ['k2', 'Zweites Keyboard']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // two devices on channel 1, same key: two fingers; one device's note-off ends only its own
  let r = await ev(() => {
    const M = window.__M, S = window.__send;
    M.setParam('v.eng', 'neb');
    S([0x90, 60, 100], 'k1'); S([0x90, 60, 90], 'k2');
    const a = M.touches.has('midi-k1-0-60') && M.touches.has('midi-k2-0-60');
    S([0x80, 60, 0], 'k1');
    const b = !M.touches.has('midi-k1-0-60') && M.touches.has('midi-k2-0-60');
    S([0x80, 60, 0], 'k2');
    return { a, b, c: !M.touches.has('midi-k2-0-60'), ports: M.MIDI.ports.size };
  });
  ok(r.ports === 2, 'two inputs are two sources');
  ok(r.a && r.b && r.c, 'two devices on ch 1 do not collide (ids midi-<src>-<ch>-<note>)');

  // reference counting: key + arpeggiator on the same note; every note-on strikes anew. A device without a counting
  // profile ends a doubled note with the first note-off – until it sends the second note-off itself (then it counts)
  r = await ev(() => {
    const M = window.__M, S = window.__send, id = 'midi-k1-0-62';
    S([0x90, 61, 100]); S([0x90, 61, 90]); S([0x80, 61, 0]); S([0x80, 61, 0]);   // shows it counts
    S([0x90, 62, 100]); const t1 = M.touches.get(id);
    S([0x90, 62, 80]); const t2 = M.touches.get(id);
    S([0x80, 62, 0]); const still = M.touches.has(id);
    S([0x80, 62, 0]); const gone = !M.touches.has(id);
    S([0x80, 62, 0]);   // a stray extra note-off is harmless
    S([0x90, 62, 70]); const again = M.touches.has(id); S([0x80, 62, 0]);
    return { retrig: t1 !== t2 && t1.voices.every((x) => x.v.released), still, gone, again, left: M.touches.has(id) };
  });
  ok(r.retrig, 'a second note-on on a held id strikes again');
  ok(r.still && r.gone, 'arp + key: the note ends with the last note-off (ref count)');
  ok(r.again && !r.left, 'stray note-off does not break later notes');

  // sustain is per source
  r = await ev(() => {
    const M = window.__M, S = window.__send;
    S([0xb0, 64, 127], 'k1');
    S([0x90, 64, 100], 'k1'); S([0x80, 64, 0], 'k1');
    S([0x90, 65, 100], 'k2'); S([0x80, 65, 0], 'k2');
    const a = M.touches.has('midi-k1-0-64'), b = M.touches.has('midi-k2-0-65');
    S([0x90, 64, 90], 'k1'); S([0x80, 64, 0], 'k1');   // re-struck while held, released again → still held
    const c = M.touches.has('midi-k1-0-64');
    S([0xb0, 64, 0], 'k1');
    return { a, b, c, d: M.touches.has('midi-k1-0-64') };
  });
  ok(r.a && !r.b, 'sustain on device A does not hold device B');
  ok(r.c && !r.d, 'sustain holds a re-struck note until the pedal is up');

  // sostenuto holds only what is down when pressed; with sustain as well
  r = await ev(() => {
    const M = window.__M, S = window.__send, id = (n) => M.touches.has('midi-k1-0-' + n);
    S([0x90, 67, 100]); S([0xb0, 66, 127]); S([0x80, 67, 0]);
    S([0x90, 69, 100]); S([0x80, 69, 0]);
    const a = id(67), b = id(69);
    S([0xb0, 64, 127]); S([0xb0, 66, 0]);   // sostenuto up while sustain down: the note stays (sustain)
    const c = id(67);
    S([0xb0, 64, 0]);
    return { a, b, c, d: id(67) };
  });
  ok(r.a && !r.b, 'sostenuto (CC 66) holds the notes that were down');
  ok(r.c && !r.d, 'sostenuto release hands over to sustain, then ends');

  // soft pedal: quieter and darker; CC 2 darker
  r = await ev(() => {
    const M = window.__M, S = window.__send;
    S([0x90, 60, 100]); const n = M.touches.get('midi-k1-0-60'), v0 = n.vel, y0 = n.y; S([0x80, 60, 0]);
    S([0x90, 62, 100]);
    S([0xb0, 67, 127]); S([0x90, 60, 100]); const s = M.touches.get('midi-k1-0-60'); const yHeld = M.touches.get('midi-k1-0-62').y;
    const r1 = { v0, y0, v1: s.vel, y1: s.y };
    S([0xb0, 67, 0]); const yBack = M.touches.get('midi-k1-0-62').y;
    S([0xb0, 2, 127]); const yDark = M.touches.get('midi-k1-0-62').y; S([0xb0, 2, 0]);
    S([0x80, 60, 0]); S([0x80, 62, 0]);
    return Object.assign(r1, { yHeld, yBack, yDark });
  });
  ok(Math.abs(r.v1 - r.v0 * 0.6) < 1e-9 && Math.abs(r.y0 - r.y1 - 0.12) < 1e-9, 'soft pedal (CC 67): 0.6× velocity, darker (' + r.v0.toFixed(3) + '→' + r.v1.toFixed(3) + ')');
  ok(r.yBack - r.yHeld > 0.1, 'soft pedal darkens held notes while down');
  ok(r.yDark < r.yBack - 0.3, 'CC 2 darkens (' + r.yBack.toFixed(2) + '→' + r.yDark.toFixed(2) + ')');

  // wheel and pressure per (source, channel)
  r = await ev(() => {
    const M = window.__M, S = window.__send;
    S([0x90, 60, 100], 'k1'); S([0x90, 60, 100], 'k2'); S([0x91, 62, 100], 'k1');
    const y = () => [M.touches.get('midi-k1-0-60').y, M.touches.get('midi-k2-0-60').y, M.touches.get('midi-k1-1-62').y];
    const y0 = y(); S([0xb0, 1, 127], 'k1'); const y1 = y(); S([0xb0, 1, 0], 'k1');
    S([0xd1, 127], 'k1'); const y2 = y(); S([0xd1, 0], 'k1');
    S([0xa0, 60, 127], 'k2'); const y3 = y(); S([0xa0, 60, 0], 'k2');
    S([0x80, 60, 0], 'k1'); S([0x80, 60, 0], 'k2'); S([0x81, 62, 0], 'k1');
    return { y0, y1, y2, y3 };
  });
  ok(r.y1[0] > r.y0[0] + 0.3 && r.y1[1] === r.y0[1] && r.y1[2] === r.y0[2], 'CC 1 on device A ch 1 brightens only those notes');
  ok(r.y2[2] > r.y0[2] + 0.2 && r.y2[0] === r.y0[0] && r.y2[1] === r.y0[1], 'channel pressure stays on its channel');
  ok(r.y3[1] > r.y0[1] + 0.2 && r.y3[0] === r.y0[0], 'poly aftertouch moves its own note');

  // bend per source: the first channel gets the app's bus, the second its own
  r = await ev(async () => {
    const M = window.__M, S = window.__send, A = M.A;
    M.midiAllOff();
    S([0x90, 60, 100], 'k1'); S([0x90, 64, 100], 'k2');
    const s1 = M.MIDI.srcs.get('k1'), s2 = M.MIDI.srcs.get('k2'), b1 = M.chState(s1, 0).bus, b2 = M.chState(s2, 0).bus;
    const v1 = M.touches.get('midi-k1-0-60').voices[0].v, v2 = M.touches.get('midi-k2-0-64').voices[0].v;
    S([0xe0, 0x7f, 0x7f], 'k1'); await window.__sleep(100);
    const a = { g: A.bendSrc.offset.value, bc: A.bendCents, b2: b2.cents, b2v: b2.src.offset.value };
    S([0xe0, 0, 0], 'k2'); await window.__sleep(100);
    const b = { g: A.bendSrc.offset.value, b2: b2.cents, b2v: b2.src.offset.value };
    S([0xe0, 0, 0x40], 'k1'); S([0xe0, 0, 0x40], 'k2'); S([0x80, 60, 0], 'k1'); S([0x80, 64, 0], 'k2');
    return { global: !!b1.global, own: !b2.global && !!b2.src, v1: v1.bend === b1, v2: v2.bend === b2, a, b, buses: M.MIDI.buses.length };
  });
  ok(r.global && r.own && r.v1 && r.v2, 'first device on the app bend bus, second on its own; voices follow their bus');
  ok(r.a.g > 190 && r.a.bc > 199 && r.a.b2 === 0 && Math.abs(r.a.b2v) < 1, 'device A bends only its notes (+' + r.a.g.toFixed(0) + ' ct)');
  ok(r.b.b2 === -200 && r.b.b2v < -190 && r.b.g > 190, 'device B bends on its own bus (' + r.b.b2v.toFixed(0) + ' ct)');

  // velocity curves
  r = await ev(() => {
    const M = window.__M, S = window.__send, out = {};
    for (const c of ['soft', 'lin', 'mid', 'hard', 'fix']) {
      M.setParam('midi.curve', c);
      for (const v of [32, 64, 127]) { S([0x90, 60, v]); out[c + v] = M.touches.get('midi-k1-0-60').vel; S([0x80, 60, 0]); }
    }
    M.setParam('midi.fix', 40); S([0x90, 60, 127]); out.fix40 = M.touches.get('midi-k1-0-60').vel; S([0x80, 60, 0]);
    M.setParam('midi.curve', 'mid'); M.setParam('midi.fix', 100);
    out.vv = M.P['v.vel'];
    return out;
  });
  {
    const want = (e, v) => Math.min(1, Math.max(0.02, r.vv * 1.33 * Math.pow(v / 127, e)));
    const close = (a, b) => Math.abs(a - b) < 1e-9;
    ok(close(r.mid64, want(1.6, 64)) && close(r.soft64, want(0.6, 64)) && close(r.lin64, want(1, 64)) && close(r.hard64, want(2.4, 64)), 'curves Weich/Linear/Mittel/Hart (64 → ' + [r.soft64, r.lin64, r.mid64, r.hard64].map((x) => x.toFixed(3)).join(' / ') + ')');
    ok(r.soft32 > r.lin32 && r.lin32 > r.mid32 && r.mid32 > r.hard32, 'curves ordered soft > linear > medium > hard');
    ok(r.fix32 === r.fix127 && close(r.fix32, want(1.6, 100)) && close(r.fix40, want(1.6, 40)), 'Fest plays one velocity (value adjustable)');
  }

  // release velocity: ignored while constant 64, used once a device sends real values
  r = await ev(() => {
    const M = window.__M, S = window.__send, A = M.A, rel = M.P['neb.rel'];
    const end = (rv, n) => { S([0x90, n, 100], 'k2'); const v = M.touches.get('midi-k2-0-' + n).voices[0].v; S([0x80, n, rv], 'k2'); return v.endAt - A.ctx.currentTime; };
    const e64 = end(64, 70), relVel0 = M.MIDI.srcs.get('k2').relVel;
    const e127 = end(127, 71), e10 = end(10, 72), e64b = end(64, 73);
    return { rel, e64, e127, e10, e64b, relVel0 };
  });
  ok(!r.relVel0 && r.e64 > r.rel * 1.3 && r.e64 < r.rel * 1.3 + 0.15, 'constant release velocity 64 is ignored (' + r.e64.toFixed(2) + ' s)');
  ok(r.e127 < r.e64 * 0.5 && r.e10 > r.e64 * 1.2 && Math.abs(r.e64b - r.e64) < 0.03, 'real release velocity shortens/lengthens the release (' + [r.e127, r.e64b, r.e10].map((x) => x.toFixed(2)).join(' / ') + ' s)');

  // RPN 0 bend range, RPN null, NRPN and other CCs to the mapping hook; MIDI.take overrides built-ins
  r = await ev(async () => {
    const M = window.__M, S = window.__send, A = M.A, routed = [];
    M.MIDI.route = (src, e) => routed.push(Object.assign({ src: src.key }, e));
    S([0x90, 60, 100]);
    S([0xb0, 101, 0]); S([0xb0, 100, 0]); S([0xb0, 6, 12]); S([0xb0, 38, 0]);
    S([0xe0, 0x7f, 0x7f]); await window.__sleep(80);
    const r12 = A.bendCents;
    S([0xb0, 101, 127]); S([0xb0, 100, 127]); S([0xb0, 6, 33]);   // after the null RPN, CC 6 is just a controller
    S([0xb0, 99, 1]); S([0xb0, 98, 2]); S([0xb0, 6, 64]); S([0xb0, 38, 16]); S([0xb0, 96, 0]);
    S([0xb0, 101, 127]); S([0xb0, 100, 127]);
    S([0xb0, 20, 99]); S([0xb0, 74, 50]); S([0xb0, 0, 1]);
    M.MIDI.take = (src, e) => e.type === 'cc' && e.num === 1;
    const y0 = M.touches.get('midi-k1-0-60').y; S([0xb0, 1, 127]); const y1 = M.touches.get('midi-k1-0-60').y;
    M.MIDI.take = null;
    S([0xe0, 0, 0x40]); S([0x80, 60, 0]);
    S([0xb0, 101, 0]); S([0xb0, 100, 0]); S([0xb0, 6, 2]);   // back to ±2
    M.setParam('midi.bend', 3); const rng = M.chState(M.MIDI.srcs.get('k1'), 0).range;
    M.setParam('midi.bend', 2);
    M.MIDI.route = null;
    return { r12, routed, y0, y1, rng };
  });
  const rt = r.routed.map((e) => e.type + ':' + e.num + ':' + e.val).join(' ');
  ok(Math.abs(r.r12 - 1200 * 8191 / 8192) < 0.5, 'RPN 0 sets the bend range (±12 → ' + r.r12.toFixed(1) + ' ct)');
  ok(/cc:6:33/.test(rt), 'after a null RPN, CC 6 is routed as a plain controller');
  // the first MSB of a parameter whose LSB never came yet is scaled as 7 bit (64 → 8256), then 14 bit
  ok(/nrpn:130:8256 nrpn:130:8208 nrpn:130:8320/.test(rt), 'NRPN 1/2: MSB, LSB and increment routed as 14-bit values');
  ok(/cc:20:99/.test(rt) && /cc:74:50/.test(rt) && !/cc:0:/.test(rt) && !/cc:101|cc:100|cc:99|cc:98|cc:38/.test(rt), 'unmapped CCs (20, 74) go to midiRoute; bank select and RPN plumbing do not');
  ok(r.y0 === r.y1, 'MIDI.take can claim a message before the built-in handling');
  ok(r.rng === null, 'changing the wheel setting overrides a device range');

  // channel mode messages per source; CC 121 resets
  r = await ev(() => {
    const M = window.__M, S = window.__send, res = {};
    // per channel (MIDI 1.0): the same source's other channel plays on
    for (const cc of [120, 123, 124, 125, 126, 127]) {
      S([0x90, 60, 100], 'k1'); S([0x95, 60, 100], 'k1'); S([0x90, 60, 100], 'k2');
      S([0xb0, cc, 0], 'k1');
      res[cc] = !M.touches.has('midi-k1-0-60') && M.touches.has('midi-k1-5-60') && M.touches.has('midi-k2-0-60');
      S([0x80, 60, 0], 'k2'); S([0x85, 60, 0], 'k1');
    }
    S([0xb0, 64, 127]); S([0xb0, 1, 90]); S([0x90, 60, 100]); S([0x80, 60, 0]);
    const held = M.touches.has('midi-k1-0-60');
    S([0xb0, 121, 0]);
    const cs = M.chState(M.MIDI.srcs.get('k1'), 0);
    res.reset = held && !M.touches.has('midi-k1-0-60') && !cs.sus && cs.wheel === 0;
    return res;
  });
  ok([120, 123, 124, 125, 126, 127].every((c) => r[c]), 'CC 120/123/124–127 silence only that source’s channel');
  ok(r.reset, 'CC 121 resets that source’s controllers (pedal-held notes end)');

  // program change → presets
  r = await ev(async () => {
    const M = window.__M, S = window.__send, out = {};
    S([0xb0, 0, 0]);   // bank 0 (an earlier step selected bank 1, which sticks as in MIDI)
    S([0xc0, 3]); await window.__sleep(120); out.p3 = M.UI.preset === M.PRESETS[3].key;
    S([0xc0, 20]); await window.__sleep(120); out.wrap = M.UI.preset === M.PRESETS[20 % M.PRESETS.length].key;
    S([0xc0, 1]); S([0xc0, 2]); S([0xc0, 7]); await window.__sleep(120); out.last = M.UI.preset === M.PRESETS[7].key;
    localStorage.setItem('myzel.user.v1', JSON.stringify([{ name: 'Mein Klang', v: { 'v.eng': 'glo' } }]));
    S([0xb0, 0, 1]); S([0xc0, 0]); await window.__sleep(120);
    out.user = /Mein Klang/.test(document.querySelector('#toastMsg').textContent) && M.P['v.eng'] === 'glo';
    S([0xb0, 0, 0]);
    const routed = []; M.MIDI.route = (s, e) => routed.push(e.type);
    M.setParam('midi.pc', false); const before = M.UI.preset; S([0xc0, 5]); await window.__sleep(120);
    out.off = M.UI.preset === before && routed.includes('pc');
    M.setParam('midi.pc', true); M.MIDI.route = null;
    return out;
  });
  ok(r.p3 && r.wrap, 'Program Change n loads factory preset n (mod count)');
  ok(r.last, 'a burst of program changes loads only the last');
  ok(r.user, 'Bank Select MSB 1 + Program Change loads a user preset');
  ok(r.off, '"Programmwechsel lädt Presets" off: nothing loads, the PC is routed');

  // active sensing: silence after 330 ms ends that source's notes only; steady FE keeps them
  r = await ev(async () => {
    const M = window.__M, S = window.__send;
    S([0xfe], 'k1'); S([0x90, 60, 100], 'k1'); S([0x90, 61, 100], 'k2');
    for (let i = 0; i < 4; i++) { await window.__sleep(150); S([0xfe], 'k1'); }
    const alive = M.touches.has('midi-k1-0-60');
    await window.__sleep(500);
    const res = { alive, gone: !M.touches.has('midi-k1-0-60'), other: M.touches.has('midi-k2-0-61') };
    S([0x80, 61, 0], 'k2');
    // without FE ever seen: no timeout
    S([0x90, 62, 100], 'k2'); await window.__sleep(500); res.noAS = M.touches.has('midi-k2-0-62'); S([0x80, 62, 0], 'k2');
    return res;
  });
  ok(r.alive && r.gone && r.other, 'active sensing: notes released 330 ms after the last byte, other source untouched');
  ok(r.noAS, 'no active sensing seen: no timeout');

  // several messages and running status in one event (polyfills), data bytes without status ignored
  r = await ev(() => {
    const M = window.__M, S = window.__send;
    S([0x90, 60, 100, 64, 100, 0xf8, 67, 100]);
    const a = ['60', '64', '67'].every((n) => M.touches.has('midi-k1-0-' + n));
    S([0x80, 60, 0, 64, 0, 67, 0]);
    S([60, 100, 1]);
    S([0x90, 70, 100], 'k1', false);   // no timeStamp at all
    const b = M.touches.has('midi-k1-0-70'); S([0x80, 70, 0]);
    return { a, b, none: ![...M.touches.keys()].some((k) => /^midi-k1/.test(k)) };
  });
  ok(r.a && r.none, 'running status and several messages per event are parsed');
  ok(r.b, 'events without timeStamp play');

  // port loss: only that device's notes end
  r = await ev(() => {
    const M = window.__M, S = window.__send;
    S([0x90, 60, 100], 'k1'); S([0xb0, 64, 127], 'k2'); S([0x90, 62, 100], 'k2'); S([0x80, 62, 0], 'k2');
    window.__midi.unplug('k2');
    const res = { a: M.touches.has('midi-k1-0-60'), b: !M.touches.has('midi-k2-0-62'), src: M.MIDI.srcs.has('k2'), n: M.MIDI.ports.size, toast: document.querySelector('#toastMsg').textContent };
    S([0x80, 60, 0], 'k1');
    return res;
  });
  ok(r.a && r.b && !r.src && r.n === 1 && /getrennt/.test(r.toast), 'unplugging device B releases only B (A keeps playing)');

  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  ok(!errors.length, 'no console errors');
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
