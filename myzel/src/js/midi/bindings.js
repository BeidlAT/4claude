/* ---------- bindings ---------- */
// A binding: { dev (device name; '*' any – learned ones), ch (0–15, −1 any), type: cc|note|pc|bend|press|rpn|nrpn,
// num (−1 for bend and pressure), target, mode, min/max (0..1 of the target's travel), inv, to: false (no soft
// takeover), hires (14 bit: CC num + 32 carries the fine part), edge: 'any' (a button that toggles itself – each message
// is a press), name (the control on the device: "Regler 3"), tent (a profile value not confirmed on hardware), when:
// 'pads' (only while "Pads als Auslöser" is on) }. Modes: abs – the control's position (knobs, faders; soft takeover);
// rel2c / relSB / relBO – relative encoders in two's complement (1 / 127), signed bit (1 / 65) or binary offset
// (65 / 63); toggle – each press flips; momentary – on while held; trigger – each press fires once (hits, presets).
// Gestik adds 'axis' (num 0–4: Neigen ↔, Neigen ↕, Bebung, Drehen, Ladung; val 0..1, rest 0.5 or 0) and 'gest' (num 0–2:
// Wenden, Ruhe, Schütteln – pressed 'gon' with the strength as val, released 'goff'); they come only through midiTake
const KIND = { on: 'note', off: 'note', cc: 'cc', pc: 'pc', bend: 'bend', press: 'press', rpn: 'rpn', nrpn: 'nrpn', axis: 'axis', gon: 'gest', goff: 'gest' };
const MODES = ['abs', 'rel2c', 'relSB', 'relBO', 'toggle', 'momentary', 'trigger'];
const MAP_KEY = 'myzel.midimap.v1';
// v: bumped when bindings or profiles change (each source rebuilds its index); pend: parameter writes for the next
// frame; morphN/morphT: the morph waiting for its turn; taps: tap tempo; pstep: preset steps of an encoder
const MAP = { v: 1, user: [], pend: new Map(), due: 0, now: false, morphN: null, morphT: 0, taps: [], pstep: 0, pT: 0, list: null };
const WHEN = { pads: () => !!P['midi.pads'] };
const relD = (m, v) => (m === 'rel2c' ? (v <= 64 ? v : v - 128) : m === 'relSB' ? (v & 64 ? -(v & 63) : v & 63) : v - 64);
// Coalesced writes: a knob sends up to a few hundred values a second, a parameter changes at most once per frame (the
// frame loop flushes; the timer covers a hidden page, which has no frames). A button's write is at once (MAP.now), so
// it never lands after what the next button does – Bordun on, then Stille.
function mapWrite(id, v) {
  if (MAP.now) { MAP.pend.delete(id); setParam(id, v); return; }
  MAP.pend.set(id, v);
  if (!MAP.due) MAP.due = setTimeout(mapFlush, 40);
}
function mapFlush() {
  clearTimeout(MAP.due); MAP.due = 0;
  if (MAP.pend.size) { const l = Array.from(MAP.pend); MAP.pend.clear(); for (const [id, v] of l) setParam(id, v); }
  if (MAP.morphN != null) {
    const t = performance.now();
    if (t - MAP.morphT >= 40) { const m = MAP.morphN; MAP.morphN = null; MAP.morphT = t; mxMorphApply(m); }
    else MAP.due = setTimeout(mapFlush, 40 - (t - MAP.morphT));
  }
}
function bState(src, b) {
  if (!src.bst) src.bst = new Map();
  let s = src.bst.get(b);
  if (!s) src.bst.set(b, (s = { down: false, prev: null, accT: -1e9, wait: false, at: 0 }));
  return s;
}
// Soft takeover (Mixxx's rule): a knob whose position differs from the value only takes over once it meets it –
// crossing it, or within 3/128 of it – so touching a knob never makes the sound jump. A value within 50 ms of the last
// accepted one passes (a fast turn skips past the window); the first one after binding counts only when already close.
function takeover(st, n, cur, t, TH = 3 / 128) {
  const prev = st.prev;
  st.prev = n;
  if (cur == null) return true;
  if (t - st.accT < 50 || Math.abs(n - cur) < TH || (prev != null && (Math.abs(prev - cur) < TH || (prev - cur) * (n - cur) < 0))) { st.accT = t; return true; }
  return false;
}
// one message through one binding
function mapApply(b, src, ev) {
  const T = mtOf(ev.type === 'axis' ? gkTarget(b.target) : b.target);   // Gestik's axes never write the patch
  if (!T) return false;
  const now = performance.now(), cx = { src, ev, b }, st = bState(src, b), m = b.mode || 'abs';
  st.at = now; src.lastMap = { b, t: now, ev };   // activity: per device and binding (and which message)
  let raw, edge = 0;
  if (ev.type === 'on' || ev.type === 'gon') { raw = ev.type === 'gon' ? ev.val : ev.val / 127; edge = 1; }
  else if (ev.type === 'off' || ev.type === 'goff') { raw = 0; edge = -1; }
  else if (ev.type === 'axis') raw = gkShape(b, st, ev.val, now);
  else if (ev.type === 'pc') { raw = 1; edge = 1; }
  else if (ev.type === 'bend' || ev.type === 'rpn' || ev.type === 'nrpn') raw = ev.val / 16383;
  else if (b.hires) { const c = chState(src, ev.ch).cc; raw = ((c[b.num] << 7) | c[b.num + 32]) / 16383; }
  else raw = ev.val / 127;
  if (m[0] === 'r') {   // relative encoders: steps, never positions
    const d = ev.type === 'cc' ? relD(relFix(b, src, st, m, ev.val), ev.val) : 0;
    if (d) tStep(T, b.inv ? -d : d, cx);
    return true;
  }
  // (owner, 26.10.2026: „Vorige Skala“ on a slider reacted only when it crossed the middle – it pressed once there, the
  // 0.5 edge below; again 30.10.2026, lost in the reset of 27.10.) a fader or knob on a stepping target browses: each
  // sixteenth of its travel one step, up the target's own way, down back; a control that only ever sends 0 and 127 (a
  // button sending CC) still presses. A control known as a fader since it was assigned (b.fad) browses from its first
  // value on – a slider resting at the top that first sends 127 does not press
  if (!edge && m === 'abs' && T.step && !T.cont && ev.type === 'cc' && !b.hires) {
    if (b.fad || (raw > 0.01 && raw < 0.99)) st.fader = true;
    if (st.fader) {
      const x = raw * 16, z0 = st.fz == null ? Math.min(15, Math.floor(x)) : st.fz;
      let z = z0;   // (a sixteenth's zone, left only 1/16 of a zone past its edge: a trembling slider does not flap)
      if (x >= z0 + 1.0625 || x < z0 - 0.0625) z = Math.max(0, Math.min(15, Math.floor(x)));
      const n = z - z0; st.fz = z;
      for (let i = 0; i < Math.abs(n); i++) tStep(T, (b.inv ? -1 : 1) * Math.sign(n), cx);
      return true;
    }
  }
  // values become presses and releases where the mode or the target wants a button
  const btn = m === 'toggle' || m === 'momentary' || m === 'trigger';
  if (!edge && (btn || !T.cont)) {
    if (b.edge === 'any') edge = 1;
    else { const on = raw >= 0.5; if (on === st.down) return true; edge = on ? 1 : -1; }
  }
  if (edge) st.down = edge > 0 && b.edge !== 'any';
  const keeps = !!(T.get || tPid(T));   // the target has a state to flip or hold (else it only fires)
  MAP.now = !!edge;
  try { mapAct(b, T, cx, st, m, raw, edge, keeps, now); } finally { MAP.now = false; }
  return true;
}
// A signed-bit encoder (1 right, 65 left) turned one way only while learning looks like two's complement (1, 2 …) or
// binary offset (65, 66 …). Its first value the learned format cannot send – 65–96 for two's complement (−63…−32), 1–15
// for binary offset (−63…−49) – shows what it is: from then on signed bit, kept for learned bindings, for this device
// otherwise. That value is already read the new way.
function relFix(b, src, st, m, v) {
  if (st.rel) return st.rel;
  if (!((m === 'rel2c' && v >= 65 && v <= 96) || (m === 'relBO' && v >= 1 && v <= 15))) return m;
  st.rel = 'relSB';
  if (MAP.user.includes(b)) { mapEdit(src, b, { mode: 'relSB' }); st.rel = null; }
  return 'relSB';
}
function mapAct(b, T, cx, st, m, raw, edge, keeps, now) {
  const lo = b.min != null ? b.min : 0, hi = b.max != null ? b.max : 1, map = (x) => lo + (hi - lo) * (b.inv ? 1 - x : x);
  if (m === 'abs' && T.cont) {
    if (edge < 0) return;   // a key let go is no position
    const n = map(raw), id = tPid(T), D = id && PD[id];
    // a choice is met anywhere in the knob's share of it (pNorm gives its middle)
    if (b.to !== false && !T.noTake && !takeover(st, n, tGet(T, cx), now, D && D.kind === 'sel' ? 0.5 / D.opts.length : undefined)) { st.wait = true; return; }
    st.wait = false;
    tSet(T, n, cx);
  } else if (m === 'abs') {
    if (keeps) tSet(T, map(raw), cx);
    else if (edge > 0) tPress(T, raw, cx);
    else tRelease(T, cx);
  } else if (edge > 0) {
    if (m === 'toggle' && keeps) tSet(T, tGet(T, cx) >= (lo + hi) / 2 ? lo : hi, cx);
    else if (m === 'momentary' && keeps) tSet(T, hi, cx);
    else if (m === 'trigger' && keeps && !T.hit) tSet(T, hi, cx);
    else tPress(T, raw, cx);
  } else if (m === 'momentary') {
    if (keeps) tSet(T, lo, cx); else tRelease(T, cx);
  }
}

