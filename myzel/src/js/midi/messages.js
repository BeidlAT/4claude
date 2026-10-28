/* ---------- the message layer: one entry for every transport ---------- */
// Running status and several messages in one call are tolerated (some polyfills deliver them that way); SysEx is never
// requested and skipped if it comes anyway.
const MLEN = (s) => (s < 0xf0 ? ((s & 0xe0) === 0xc0 ? 2 : 3) : s === 0xf1 || s === 0xf3 ? 2 : s === 0xf2 ? 3 : 1);
function midiIn(src, d, ts) {
  if (!src || !d || !d.length) return;
  const now = performance.now();
  if (!(ts > 0) || Math.abs(ts - now) > 1000) ts = now;   // a polyfill's clock may be missing or on another base
  src.lastIn = now;
  if (d.length === MLEN(d[0]) && d[0] & 0x80 && d[0] !== 0xf0) { midiMsg(src, d[0], d.length > 1 ? d[1] : 0, d.length > 2 ? d[2] : 0, ts); return; }
  for (let i = 0, st = 0; i < d.length;) {
    let b = d[i];
    if (b >= 0xf8) { midiMsg(src, b, 0, 0, ts); i++; continue; }
    if (b === 0xf0) { while (i < d.length && d[i] !== 0xf7) i++; i++; st = 0; continue; }
    if (b & 0x80) { i++; st = b < 0xf0 ? b : 0; } else if (st) b = st; else { i++; continue; }
    const n = MLEN(b) - 1;
    if (i + n > d.length) break;
    midiMsg(src, b, n > 0 ? d[i] : 0, n > 1 ? d[i + 1] : 0, ts);
    i += n;
  }
}
// one complete message → an event { type, ch, num, val, t } for the mapping layer, then the built-in handling
const MTYPE = { 0x80: 'off', 0x90: 'on', 0xa0: 'poly', 0xb0: 'cc', 0xc0: 'pc', 0xd0: 'press', 0xe0: 'bend' };
function midiMsg(src, st, d1, d2, ts) {
  if (!src.enabled || src.dup) return;
  if (st >= 0xf0) { midiSys(src, st, d1, d2, ts); return; }
  const type = st & 0xf0, ch = st & 15, two = type === 0xc0 || type === 0xd0;
  const ev = { type: type === 0x90 && !d2 ? 'off' : MTYPE[type], ch, num: two ? -1 : d1, val: type === 0xe0 ? (d2 << 7) | d1 : two ? d1 : d2, t: ts };
  if (type === 0xc0) ev.num = d1;
  src.act = ts; src.last = ev;
  if (MIDI.tap) MIDI.tap(src, ev);
  if (midiTake(src, ev)) return;
  const cs = chState(src, ch);
  switch (type) {
    case 0x90: if (d2) { mpeSeen(cs, ts); midiNoteOn(cs, d1, d2, ts); break; }   // velocity 0 is a note-off
    // falls through
    case 0x80: midiNoteOff(cs, d1, type === 0x80 ? d2 : 0, ts); break;
    case 0xb0: midiCC(cs, d1, d2, ev); break;
    case 0xe0: cs.bend = (((d2 << 7) | d1) - 8192) / 8192; cs.pre = ts; if (chRole(cs).mem) mpeBend(cs, false); else applyBendCs(cs); break;
    case 0xd0:
      cs.press = d1 / 127; cs.pre = ts;
      if (chRole(cs).mem) { for (const tt of touches.values()) if (tt.cs === cs) { tt.pp = cs.press; midiRecolor(tt); } }   // MPE: this note's pressure
      else midiRecolor(null, cs);
      break;
    case 0xa0: {
      if (chRole(cs).mem) break;   // the MPE spec forbids poly pressure on member channels
      const tt = touches.get(midiId(src, ch, d1));
      if (tt) { tt.pp = d2 / 127; midiRecolor(tt); }
      break;
    }
    case 0xc0: midiPC(cs, d1, ev); break;
  }
}

