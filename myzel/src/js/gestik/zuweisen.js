/* ---------- Gestik in Zuweisen ---------- */
// The learn layer gets Gestik's axes before the clutch. The axis that moved furthest wins – deliberately: 40 % of a
// Weite (about 12° of tilt) within 1.5 s, decided once the hand slows down, never during a shake or a flip on its way
// to Wenden. Events (Wenden, Ruhe, Schütteln) are captured like a pad. A tap on an axis in the Gestik card does the
// same without moving the phone. The phone never rests completely (tremor), so after an assignment Gestik is ignored for
// a second, not until it is still.
function gkLearnIn(src, ev) {
  const now = performance.now(), D = LEARN.done;
  if (ev.type === 'goff') return true;
  if (D && D.src === src && now - D.t < 1000) return true;   // just assigned: a second for the hand to come back to rest
  if (ev.type === 'gon') { gkLearnCap(src, 'gest', ev.num, 1); return true; }
  if (LEARN.cap && LEARN.cap.src !== src && now - LEARN.cap.last < 600) return true;
  const C = LEARN.gk || (LEARN.gk = new Map());
  let r = C.get(ev.num);
  if (!r || now - r.t0 > 1500) C.set(ev.num, (r = { lo: ev.lx, hi: ev.lx, t0: now, val: ev.val }));
  r.lo = Math.min(r.lo, ev.lx); r.hi = Math.max(r.hi, ev.lx); r.val = ev.val; r.t = now;
  const st = GK.R && GK.R.st, busy = st && (st.shake || st.ang > 110 || st.exc > 1.2 || Math.sqrt(st.rw2) > 60);
  let best = null;
  for (const [n, x] of C) if (now - x.t0 <= 1500 && x.hi - x.lo >= 0.4 && (!best || x.hi - x.lo > best.hi - best.lo)) best = Object.assign({ n }, x);
  if (best && !busy) gkLearnCap(src, 'axis', best.n, best.val);
  return true;
}
function gkLearnCap(src, kind, num, val) {
  if (LEARN.cap && LEARN.cap.src === src && LEARN.cap.kind === kind && LEARN.cap.num === num) return;
  const now = performance.now();
  LEARN.cap = { src, kind, ch: -1, num, vals: [val], lsb: 0, t0: now, last: now };
  LEARN.cand.clear(); if (LEARN.gk) LEARN.gk.clear(); LEARN.said = ''; LEARN.no = false;
  learnShow();
  if (LEARN.tgt) { clearTimeout(LEARN.tm); LEARN.tm = setTimeout(learnDone, 400); }
}
// a tap on an axis or event in the card while learning: that one
function gkLearnPick(kind, num) {
  if (!LEARN.on || !GK.src) return false;
  gkLearnCap(GK.src, kind, num, kind === 'axis' ? GK.sent[num] : 1);
  return true;
}
// "Bewege einen Regler …" – with Gestik on, the phone is one more way
const gkLearnAsk = () => (!GK.src ? 'bewege einen Regler oder drücke ein Pad am Gerät' : MIDI.ports.size || BLE.devs.size ? 'bewege einen Regler, drücke ein Pad oder neige das Handy' : 'neige oder bewege das Handy – oder tippe in der Gestik-Karte auf eine Achse');
// A binding of an axis: Ruhezone (dz: nothing near rest), Kurve (cv: + fine near rest, − strong), Glätte (sm: a glide
// of up to 0.6 s, which goes on while the phone holds still – the emitter keeps it running)
function gkShape(b, st, v, now) {
  const bi = b.num < 4;
  let x = bi ? v * 2 - 1 : v;
  if (b.dz) { const a = Math.abs(x); x = a <= b.dz ? 0 : Math.sign(x) * ((a - b.dz) / (1 - b.dz)); }
  if (b.cv) x = Math.sign(x) * Math.pow(Math.abs(x), Math.pow(2, b.cv));
  if (b.sm) {
    const dt = st.smT ? Math.min(0.2, (now - st.smT) / 1000) : 0;
    st.smT = now;
    st.smX = st.smX == null ? x : st.smX + (x - st.smX) * (1 - Math.exp(-dt / (b.sm * 0.6)));
    if (Math.abs(st.smX - x) > 0.002) GK.smo.add(b); else { st.smX = x; GK.smo.delete(b); }
    x = st.smX;
  } else GK.smo.delete(b);
  return bi ? (x + 1) / 2 : x;
}
// learnable: Gestik on/off, Festhalten, the clutch key, a new zero
onOff('gk.on', 'Gestik an/aus', 'Gestik', () => GK.on, (on) => (on ? gkEnable(false) : gkDisable()));
midiTarget('gk.hold', 'Gestik festhalten (solange gehalten)', null, { group: 'Gestik', bool: true, get: () => (GK.holdPad ? 1 : 0), set: (n) => gkHoldPad(n >= 0.5) });
midiTarget('gk.taste', 'Gestik-Taste (wirkt, solange gehalten)', null, { group: 'Gestik', bool: true, get: () => (GK.key ? 1 : 0), set: (n) => gkKey(n >= 0.5) });
midiTarget('gk.zero', 'Gestik: Nullpunkt setzen', (v) => { if (v >= 0.5) gkZero(true); }, { group: 'Gestik', button: true });

