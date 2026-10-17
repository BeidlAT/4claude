// MPE: zones from MCM (Auto), Ein/Aus, per-note bend via setF, member pressure and CC 74, manager bend/pedal/PC,
// RPN 0 per zone, overlapping zones, struck engines take the bend at the strike.   node t-mpe.js
const { open, ok, close } = require('./h');
(async () => {
  // s1: an MPE controller without a profile (a known one – Seaboard, LUMI … – assumes the lower zone in Auto: t-fix.js)
  const { page, errors } = await open({ cfg: { ins: [['s1', 'MPE Surface'], ['k1', 'Testkeyboard']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => {
    const M = window.__M;
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); M.setParam('midi.map', 'chrom');
    // record the frequency each engine starts with and every setF on the voices it builds
    window.__starts = []; window.__setF = [];
    for (const k of ['neb', 'glo']) {
      const E = M.ENGINES[k], orig = E.start;
      E.start = function (v, t, f, y, vel, o) {
        orig.call(this, v, t, f, y, vel, o);
        window.__starts.push({ eng: k, f });
        if (v.setF) { const sf = v.setF; v.setF = (nf, g) => { window.__setF.push({ v, nf, g }); return sf(nf, g); }; }
      };
    }
    window.__mcm = (ch, n, id = 's1') => { window.__send([0xb0 | ch, 101, 0], id); window.__send([0xb0 | ch, 100, 6], id); window.__send([0xb0 | ch, 6, n], id); };
  });

  // Auto, no MCM: channels are independent, not MPE
  let r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 's1');
    S([0xe1, 0, 0x60]); S([0x91, 60, 100]);
    const tt = M.touches.get('midi-s1-1-60'), cs = M.chState(M.MIDI.srcs.get('s1'), 1);
    const res = { mpe: !!tt.mpe, mb: tt.mb, own: !!cs.bus };
    S([0x81, 60, 0]); S([0xe1, 0, 0x40]);
    return res;
  });
  ok(!r.mpe && r.mb === 0 && r.own, 'Auto without MCM: a channel is a normal channel with its own bend bus');

  // MCM: lower zone with 15 members
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 's1'), src = M.MIDI.srcs.get('s1');
    window.__mcm(0, 15);
    const z = src.mcm && src.mcm.lo;
    // member ch 2: initial bend, pressure and CC 74 come before the note-on (MPE spec)
    window.__starts.length = 0;
    S([0xe1, 0x00, 0x48]); S([0xd1, 64]); S([0xb1, 74, 100]); S([0x91, 60, 100]);
    const tt = M.touches.get('midi-s1-1-60'), f0 = window.__starts[0].f;
    const res = { z: z && z.n, mgrR: z && z.mgrR, memR: z && z.memR, mpe: tt.mpe, mb: tt.mb, pp: tt.pp, y: tt.y, f0, f: tt.f };
    // a second note on ch 3, different bend
    S([0xe2, 0, 0x40]); S([0x92, 64, 100]);
    window.__setF.length = 0;
    S([0xe1, 0x00, 0x50]); await window.__sleep(30); S([0xe1, 0x00, 0x50]);
    const t2 = M.touches.get('midi-s1-2-64');
    res.calls = window.__setF.filter((c) => tt.voices.some((x) => x.v === c.v)).map((c) => c.nf);
    res.other = window.__setF.some((c) => t2.voices.some((x) => x.v === c.v));
    res.mb1 = tt.mb; res.mb2 = t2.mb; res.glide = window.__setF.every((c) => c.g === 0);
    // member pressure / CC 74 move only this note
    const y2 = t2.y;
    S([0xd1, 127]); res.pp1 = tt.pp; S([0xb1, 74, 20]); res.y74 = tt.y; res.y2same = t2.y === y2;
    S([0xa1, 60, 0]); res.ppPoly = tt.pp;   // poly pressure on a member channel: ignored
    // pedal on a member channel is ignored, on the manager it holds the zone
    S([0xb1, 64, 127]); S([0x81, 60, 0]); res.memSus = M.touches.has('midi-s1-1-60');
    S([0xb0, 64, 127]); S([0x82, 64, 0]); res.mgrSus = M.touches.has('midi-s1-2-64');
    // after its note-off a note keeps its pitch
    window.__setF.length = 0; S([0xe2, 0, 0x7f]); res.afterOff = window.__setF.length;
    S([0xb0, 64, 0]); res.released = !M.touches.has('midi-s1-2-64');
    return res;
  });
  ok(r.z === 15 && r.mgrR === 2 && r.memR === 48, 'MCM on ch 1 makes a lower zone (15 members, ranges 2/48)');
  ok(r.mpe && Math.abs(r.mb - 48 * (0x48 * 128 - 8192) / 8192) < 1e-9, 'member note starts with its own bend (' + r.mb.toFixed(2) + ' HT)');
  ok(Math.abs(r.f0 - r.f * Math.pow(2, r.mb / 12)) < 1e-6, 'sustained voice starts at the bent pitch');
  ok(Math.abs(r.pp - 64 / 127) < 1e-9 && Math.abs(r.y - Math.min(1, 100 / 127 + 0.15 * (100 / 127 - 0.6) + 0.3 * 64 / 127)) < 1e-6, 'member pressure and absolute CC 74 set that note (y ' + r.y.toFixed(3) + ')');
  ok(r.calls.length >= 1 && r.glide && Math.abs(r.calls[r.calls.length - 1] - r.f * Math.pow(2, r.mb1 / 12)) < 1e-6, 'member bend glides the note via setF (glide 0)');
  ok(!r.other && r.mb2 === 0, 'a bend on ch 2 leaves the note on ch 3 alone');
  ok(Math.abs(r.pp1 - 1) < 1e-9 && r.y74 < r.y - 0.3 && r.y2same, 'member pressure / CC 74 change only their note');
  ok(r.ppPoly === r.pp1, 'poly pressure on a member channel is ignored');
  ok(!r.memSus && r.mgrSus && r.released, 'sustain on a member channel is ignored, on the manager it holds the zone');
  ok(r.afterOff === 0, 'after note-off the member bend no longer moves the note');

  // manager bend: zone-wide, range 2; RPN 0 on a member sets the shared member range
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 's1'), src = M.MIDI.srcs.get('s1'), A = M.A;
    S([0x93, 67, 100]);
    const mgr = M.chState(src, 0), v = M.touches.get('midi-s1-3-67').voices[0].v;
    S([0xe0, 0x7f, 0x7f]); await window.__sleep(80);
    const res = { onMgrBus: v.bend === mgr.bus, cents: mgr.bus.cents };
    S([0xe0, 0, 0x40]);
    S([0xb4, 101, 0]); S([0xb4, 100, 0]); S([0xb4, 6, 24]);   // RPN 0 = 24 on member ch 5
    res.memR = src.mcm.lo.memR;
    window.__setF.length = 0; S([0xe3, 0x7f, 0x7f]);
    res.mb = M.touches.get('midi-s1-3-67').mb;
    S([0x83, 67, 0]); S([0xe3, 0, 0x40]);
    // relative CC 74: the sender starts each note at 64
    S([0xb5, 74, 64]); S([0x95, 62, 100]);
    const t = M.touches.get('midi-s1-5-62'), y0 = t.y; S([0xb5, 74, 80]);
    res.rel = t.rel74; res.dy = t.y - y0; S([0x85, 62, 0]);
    // program change: from a member ignored, from the manager it loads
    const before = M.UI.preset; S([0xc3, 4]); await window.__sleep(100); res.pcMem = M.UI.preset === before;
    S([0xc0, 4]); await window.__sleep(100); res.pcMgr = M.UI.preset === M.PRESETS[4].key;
    return res;
  });
  ok(r.onMgrBus && Math.abs(r.cents - 200 * 8191 / 8192) < 0.1, 'manager bend moves the zone on its bus with range ±2');
  ok(r.memR === 24 && Math.abs(r.mb - 24 * 8191 / 8192) < 1e-9, 'RPN 0 on a member sets the range for all members');
  ok(r.rel && Math.abs(r.dy - 16 / 127) < 1e-6, 'relative CC 74 (64 at note-on) moves around the touch-down height');
  ok(r.pcMem && r.pcMgr, 'program change only from the manager channel');

  // the struck engines take the bend at the strike
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 's1');
    M.setParam('v.eng', 'glo'); M.setParam('v.layer', 'off');
    window.__starts.length = 0;
    S([0xe6, 0, 0x60]); S([0x96, 60, 100]);
    const tt = M.touches.get('midi-s1-6-60'), st = window.__starts.find((x) => x.eng === 'glo');
    const res = { f: st && st.f, want: tt.f * Math.pow(2, tt.mb / 12), mb: tt.mb };
    S([0x86, 60, 0]); S([0xe6, 0, 0x40]);
    M.setParam('v.eng', 'neb');
    return res;
  });
  ok(r.mb > 10 && Math.abs(r.f - r.want) < 1e-6, 'struck engine (Glocke) is hit at the bent pitch');

  // overlapping zones: the newest wins; mm = 0 ends a zone; plain keyboard unaffected
  r = await ev(() => {
    const M = window.__M, src = M.MIDI.srcs.get('s1'), S = window.__send;
    window.__mcm(15, 4);   // upper zone with 4 members (ch 12–15) → lower shrinks to 10
    const a = { lo: src.mcm.lo && src.mcm.lo.n, hi: src.mcm.hi && src.mcm.hi.n };
    S([0x9b, 60, 100], 's1');   // ch 12 = member of the upper zone
    a.upper = !!M.touches.get('midi-s1-11-60').mpe; S([0x8b, 60, 0], 's1');
    window.__mcm(0, 15);   // lower zone takes everything → upper ends
    a.hi2 = src.mcm.hi; a.lo2 = src.mcm.lo.n;
    window.__mcm(0, 0);   // zone off
    S([0x91, 60, 100], 's1'); a.off = !M.touches.get('midi-s1-1-60').mpe; S([0x81, 60, 0], 's1');
    S([0x91, 60, 100], 'k1'); a.kb = !M.touches.get('midi-k1-1-60').mpe; S([0x81, 60, 0], 'k1');
    return a;
  });
  ok(r.lo === 10 && r.hi === 4 && r.upper, 'upper zone MCM shrinks the lower zone; its members play MPE');
  ok(r.hi2 === null && r.lo2 === 15, 'a lower zone of 15 ends the upper zone');
  ok(r.off && r.kb, 'MCM 0 ends the zone; other devices are never MPE because of it');

  // MPE "Ein" without MCM, and "Aus" ignores MCM
  r = await ev(() => {
    const M = window.__M, S = (b) => window.__send(b, 'k1'), res = {};
    M.setParam('midi.mpe', 'on');
    S([0x92, 60, 100]); res.on = !!M.touches.get('midi-k1-2-60').mpe; S([0x82, 60, 0]);
    S([0x90, 61, 100]); res.mgr = !M.touches.get('midi-k1-0-61').mpe; S([0x80, 61, 0]);
    M.setParam('midi.mpe', 'off');
    window.__mcm(0, 15, 'k1');
    S([0x92, 60, 100]); res.off = !M.touches.get('midi-k1-2-60').mpe && !M.MIDI.srcs.get('k1').mcm; S([0x82, 60, 0]);
    M.setParam('midi.mpe', 'auto');
    return res;
  });
  ok(r.on && r.mgr, 'MPE "Ein": lower zone assumed without MCM (ch 1 manager)');
  ok(r.off, 'MPE "Aus": MCM ignored');

  // a dense stream of member bends is merged (at most one setF per 8 ms, the last value applied by the frame loop)
  r = await ev(async () => {
    const M = window.__M, S = (b) => window.__send(b, 's1');
    window.__mcm(0, 15);
    S([0x91, 60, 100]);
    const tt = M.touches.get('midi-s1-1-60');
    window.__setF.length = 0;
    for (let i = 0; i < 40; i++) S([0xe1, 0, 0x40 + i]);
    const n = window.__setF.length;
    await window.__sleep(60);
    const last = window.__setF[window.__setF.length - 1].nf, want = tt.f * Math.pow(2, 48 * (((0x40 + 39) << 7) - 8192) / 8192 / 12);
    S([0x81, 60, 0]);
    return { n, last, want };
  });
  ok(r.n <= 5 && Math.abs(r.last - r.want) < 1e-6, 'bend floods are merged (' + r.n + ' immediate setF for 40 bends), last value lands');

  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  ok(!errors.length, 'no console errors');
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
