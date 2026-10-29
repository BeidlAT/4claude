/* ---------- Formen in Zuweisen ---------- */
// Every target is learnable by Gestik and by any controller, as its own group. A binding's rest is where its control
// rests: the middle for Gestik's tilt, Bebung and Drehen and a pitch wheel, the bottom for everything else (a knob, the
// mod wheel, Ladung, a pad) – so a wheel at rest deflects nothing. "von/bis" scale it, "Umkehren" turns its direction.
// A pad is pressed first, then its target tapped (while a Formen target waits, keys play on, as for any knob's
// target); it then acts while held.
const MOD_GROUP = 'Formen (ohne Preset zu ändern)';
const MOD_BID = new WeakMap();
let modBidN = 0;
const modName = (cx, k) => 'map:' + cx.src.key + ':' + (cx.b ? MOD_BID.get(cx.b) || (MOD_BID.set(cx.b, ++modBidN), modBidN) : k);
function modBip(ev) { return !!ev && (ev.type === 'bend' || (ev.type === 'axis' && ev.num < 4)); }
function modBind(k, n, cx) {
  const b = cx.b, bip = modBip(cx.ev), lo = b && b.min != null ? b.min : 0, hi = b && b.max != null ? b.max : 1;
  const r = cx.ev && cx.ev.type === 'bend' ? 8192 / 16383 : bip ? 0.5 : 0, rest = lo + (hi - lo) * (b && b.inv ? 1 - r : r), name = modName(cx, k);   // a wheel's centre is 8192
  MOD.bn.set(name, n);
  if (b) MOD.bs.set(name, { b, src: cx.src, k });
  modSet(name, k, (n - rest) * (bip ? 2 : 1));
}
function modBindGet(k, cx) {
  const n = MOD.bn.get(modName(cx, k));
  return n != null ? n : modBip(cx.ev) ? 0.5 : 0;
}
// bindings that went (deleted, edited, their device gone or off) leave the layer
function modBindCheck() {
  MOD.mapV = MAP.v;
  for (const [name, x] of MOD.bs) {
    const s = x.src, tk = x.b.type === 'axis' ? gkTarget(x.b.target) : x.b.target;
    const live = MIDI.srcs.get(s.key) === s && s.enabled && !s.dup && tk === 'mod.' + x.k && (MAP.user.includes(x.b) || (!!s.prof && profOn(s) && s.prof.binds.includes(x.b)));
    if (!live) { MOD.bs.delete(name); MOD.bn.delete(name); modClear(name); }
  }
}
for (const k in MODT) midiTarget('mod.' + k, MODT[k].label, null, { group: MOD_GROUP, mod: k, cont: true, noTake: true, get: (cx) => modBindGet(k, cx), set: (n, cx) => modBind(k, n, cx) });
// Gestik's axes never write the patch: a parameter with a counterpart in Formen becomes that one, anything else that
// would change the preset (parameters, the engine macros, steps of octave, tuning and tempo, the mixer's scenes) is
// refused. Gestik's events (Wenden, Ruhe, Schütteln) are deliberate presses, like a pad.
const MOD_EQ = { 'flt.freq': 'mod.flt', 'rng.freq': 'mod.rng', 'dly.wow': 'mod.wow', 'dly.mix': 'mod.dly', 'rev.mix': 'mod.rev', 'fx.mix': 'mod.fx', 'fx2.mix': 'mod.fx2', 'cho.mix': 'mod.cho', 'bor.cut': 'mod.bor',
  'kor.dens': 'mod.korD', 'kor.scat': 'mod.korS', 'trp.rain': 'mod.trp', 'gsp.kopplung': 'mod.gspK', 'rhz.reiz': 'mod.rhzR', morph: 'mod.morph', expr: 'expr' };
const MOD_WRITES = new Set(['macro.a', 'macro.b', 'oct.up', 'oct.down', 'deg.up', 'deg.down', 'root.up', 'root.down', 'scale.up', 'scale.down', 'tap', 'scene.a', 'scene.b', 'scene.ab']);
function gkTarget(key) {
  if (key == null) return null;
  if (MOD_EQ[key]) return MOD_EQ[key];
  const T = mtOf(key);
  return !T || T.pid || T.pidf || MOD_WRITES.has(key) ? null : key;
}

/* ---------- Gestik's own functions on the layer ---------- */
// Anlehnen, Ladung, Sporenregen … (the later parts register them with gkRoute) reach the layer without a binding: a
// route takes one axis of what Gestik gives after the clutch – times amt – or fn(out, raw, now) of all of it, to a
// target as the source 'gk:<id>', while on() says so. A learned binding of the same axis ("Eigene") always wins: the
// route rests meanwhile.
// r: { axis: 'tiltY', target: 'hoehe', amt: 1, on: () => bool, fn: (out, raw, now) → v, opts: { older, per } }
const GKR = new Map();
function gkRoute(id, r) {
  if (r) GKR.set(id, r); else GKR.delete(id);
  modClear('gk:' + id);
}
const GK_OWN = { v: -1, s: new Set() };
function gkOwn(axis) {
  if (GK_OWN.v !== MAP.v) {
    GK_OWN.v = MAP.v; GK_OWN.s.clear();
    for (const b of MAP.user) if (b.type === 'axis' && b.target != null && (b.dev === '*' || sameDev(b.dev, 'Gestik'))) GK_OWN.s.add(GK_AX[b.num]);
  }
  return GK_OWN.s.has(axis);
}
function gkRoutes(out, raw, evs, now) {
  for (const [id, r] of GKR) {
    const on = GK.on && (!r.on || r.on()) && !(r.axis && gkOwn(r.axis));
    const v = on ? (r.fn ? r.fn(out, raw, now) : out[r.axis] * (r.amt != null ? r.amt : 1)) : 0;
    modSet('gk:' + id, r.target, v || 0, r.opts);
  }
}
gkSub(gkRoutes);

/* ---------- Fingerhalt ---------- */
// Holding the phone in one hand and playing with the other, the glass turns under a finger that holds still. While
// Gestik acts, a slide of less than FH_PX keeps the finger's column and pitch (its height still follows – Höhe adds to
// it); a deliberate glide goes on as always, and once the finger has stayed within 3 px for 300 ms it is held again from
// where it rests (a slow glide keeps moving more than that and is not caught). Only fingers and pens on the glass – a
// mouse, keys, keyboards and the X-Y pad do not turn with the phone. "Fingerhalt" off in the Gestik card lets the tilt
// glide under the finger, as an effect.
// It holds only what the phone's turn can explain: while the phone has not turned 4° since the stroke the finger is
// free (a slide to the next column, a vibrato in the free field) and the hold sits wherever it is; turned, the glass
// slips about 2 px per degree under a finger held still – a slide wider than that (at least 0.4 of a column, at most
// FH_PX) is deliberate.
const FH_PX = 36;
function fhX(tt, pt) {
  if ((tt.ptype !== 'touch' && tt.ptype !== 'pen') || !GK.on || GK.mode === 'off' || !GK.p.halt) { tt.fh = null; return pt.x; }
  const now = performance.now(), st = GK.R && !GK.rem ? GK.R.st : null, u = st && st.uf;
  let H = tt.fh;
  if (!H) H = tt.fh = { px: tt.px, x: tt.x, free: false, rx: 0, rt: 0, u0: tt.fu0 || (u ? u.slice() : null) };
  let turned = 90;
  if (u && H.u0) {
    const m = Math.hypot(u[0], u[1], u[2]) * Math.hypot(H.u0[0], H.u0[1], H.u0[2]), d = m > 0 ? (u[0] * H.u0[0] + u[1] * H.u0[1] + u[2] * H.u0[2]) / m : 1;
    turned = Math.acos(Math.min(1, d)) * 180 / Math.PI;
    if (turned < 4) { H.free = false; H.px = pt.px; H.x = pt.x; return pt.x; }   // not turned: nothing to hold
  }
  const cols = N.free ? 12 * P['t.range'] + 1 : Math.max(1, N.notes.length), lim = Math.min(FH_PX, Math.max(0.4 * (VIS.w || stage.clientWidth || 360) / cols, 2 * turned));
  if (H.free && now - H.rt > 300) { H.free = false; H.px = tt.px; H.x = tt.x; }   // it rested: held from there
  if (!H.free && Math.abs(pt.px - H.px) > lim) { H.free = true; H.rx = pt.px; H.rt = now; }
  if (!H.free) return H.x;
  if (Math.abs(pt.px - H.rx) > 3) { H.rx = pt.px; H.rt = now; }
  return pt.x;
}
MOD.set = modSet; MOD.clear = modClear; MOD.val = modVal; MOD.route = gkRoute;

