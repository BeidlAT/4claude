/* =====================================================================
   Mod-Schicht: Formen, ohne das Patch zu ändern
   ===================================================================== */
// Gestik, the Fährte, preset recipes and a controller's "Formen" targets never write the patch. They deflect: every
// target sums what its named sources give – MOD.set(src, target, v, opts), v −1 … 1, 0 = rest – clamps it and moves its
// sound from there: audio params in short linear ramps (once a frame, and from the scheduler for points set ahead with
// opts.at), held notes through their engines' setY and their own bend bus, the Puls and the grains by values read where
// they are scheduled. No setParam, no "Preset geändert", no save, no new hall or strings. Each target builds its audio
// node only when something first moves it, so a sound nothing deflected plays exactly as before; and once every source
// is back at rest the graph holds exactly the patch's values again (a ramp ends on its value, x + 0 is x).
// Never targets (expensive or destructive): Hallgröße and -dämpfung, the distortion curve, tuning and scale, the strings'
// pre-render, engine and octave.
// A target: label, lo/hi (the clamp of the sum; Leiern only goes up), u(v) → the audio node's value (dests: see modNode).
const MOD_HSPAN = 0.5, MOD_BSPAN = 200;   // Höhe: ±half the field; Tonhöhe: ±2 semitones (a source's per() may give cents)
const mixRel = (id) => (v) => clamp(P[id] + v, 0, 1) - P[id];   // a share of the patch's own amount, kept within 0 … 100 %
const MODT = {
  hoehe: { label: 'Höhe (Klangfarbe der gehaltenen Töne)', notes: 1 },
  bend: { label: 'Tonhöhe des neuesten Tons (±2 Halbtöne)', notes: 1 },
  flt: { label: 'Filter', u: (v) => v * 2400 },
  pha: { label: 'Phaser', u: (v) => v * 2400 },
  rng: { label: 'Ring-Frequenz', u: (v) => v * 2400 },
  pan: { label: 'Panorama', u: (v) => v * 0.9 },
  wow: { label: 'Leiern (Echo)', lo: 0, u: (v) => v * 0.004 },
  dly: { label: 'Echo-Anteil', u: mixRel('dly.mix') },
  rev: { label: 'Hall-Anteil', u: mixRel('rev.mix') },
  cho: { label: 'Schweben-Anteil', u: mixRel('cho.mix') },
  bor: { label: 'Bordun öffnen', u: (v) => v * 2400 },
  korD: { label: 'Körner-Dichte', js: 1 },
  korS: { label: 'Körner-Streuung', js: 1 },
  trp: { label: 'Tropfen-Regen', js: 1 },
  pulsD: { label: 'Puls-Dichte', js: 1 },
  pulsH: { label: 'Puls-Helligkeit', js: 1 },
  expr: { label: 'Ausdruck (Klang und Ebene 2)', js: 1 },
  morph: { label: 'A/B-Morph (Mixer, ohne ihn zu verstellen)', js: 1 },
  rgx: { label: 'Sporenregen: Neigung ↔', js: 1 },
  rgy: { label: 'Sporenregen: Neigung ↕', js: 1 },
  gspK: { label: 'Gespinst-Kopplung', js: 1 },
  vok: { label: 'Vokal: Mund öffnen (Formanten)', lo: 0, u: (v) => v },   // (25.10.2026, the Touché's Vokal – js/core/chain.js)
  vokO: { label: 'Vokal: Kiefer (i/u ↔ a)', u: (v) => v * VOK_C[0] },
  vokV: { label: 'Vokal: Zunge (u/o ↔ e/i)', u: (v) => v * VOK_C[1] },
  rhzR: { label: 'Rhizom-Reiz', js: 1 },
};
// t: per target { s: Map(source → { v (live) | p: [[audio time, v] …] (set ahead), o: opts }), cs (its ConstantSource,
// once needed), last (what the node got) }; n: targets with a source; eg: Ausdruck's gain on Klang and Ebene 2; mx: the
// A/B-Morph's deflection applied to the mixer's sound; fbs: the finger buses (Tonhöhe pro Finger); seq: notes counted, so
// the newest is known; bs/bn: the bindings that feed the layer (to forget them when they go) and their last value
const MOD = { t: {}, n: 0, due: 0, ctx: null, eg: 1, mx: 0, mxT: 0, mxIds: null, fbs: new Set(), seq: 0, stkN: 0, stkT: -1e9, fr: 0, bs: new Map(), bn: new Map(), mapV: 0, sweep: 0, tm: 0 };
for (const k in MODT) MOD.t[k] = { k, d: MODT[k], s: new Map(), cs: null, x: null, last: 0, was: false, pv: 0, sch: null, hx: ['flt', 'pha', 'rng', 'pan', 'cho', 'vok', 'vokO', 'vokV'].includes(k) };   // (hx: a deflection of the insert chain – Hexenring bakes it)
// The Fährte (see there) writes down what reaches this layer – declared here, since the layer reports to it from the
// start: its clock (t0/b0/bpm; d: its distance to the Puls's beat, ph: where its bars begin), the lanes it writes, the
// loop that plays, a recording window, a tap waiting to be taken, the gesture on its button, the stored settings
const FA = { t0: null, b0: 0, bpm: 84, d: 0, ph: 0, pon: false, lanes: new Map(), uiT: 0, gT: 0,
  p: { len: 2, fade: 0.85, trim: 0, hin: false, seen: false } };
// parameters with a counterpart in Formen: written down as they change (a knob, a slider), played back as that
// counterpart's deflection – [target, scale ('log': in octaves), units of the target per unit]
const FAE_PAR = { 'flt.freq': ['flt', 'log', 0.5], 'rng.freq': ['rng', 'log', 0.5], 'bor.cut': ['bor', 'log', 0.5], 'kor.dens': ['korD', 'log', 1 / 1.5],
  'kor.scat': ['korS', 'lin', 2], 'trp.rain': ['trp', 'lin', 1 / 0.65], 'dly.mix': ['dly', 'lin', 1], 'rev.mix': ['rev', 'lin', 1], 'cho.mix': ['cho', 'lin', 1] };
// Körner-Dichte: ×0.35 … ×2.8 of the patch's grains per second
const modKorD = (t) => Math.pow(2, 1.5 * modVal('korD', t));
// one source's value at audio time t: a live one is constant; one set ahead runs linearly from point to point (0 before
// the first)
function modPt(e, t) {
  const p = e.p;
  if (!p) return e.v;
  if (!p.length || t < p[0][0]) return 0;
  let i = p.length - 1;
  while (i > 0 && p[i][0] > t) i--;
  const a = p[i], b = p[i + 1];
  return b ? a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]) : a[1];
}
// the sum at audio time t (now when left out), clamped to the target's range
function modVal(k, t) {
  const T = MOD.t[k];
  if (!T.s.size) return 0;
  if (t == null) t = A.ctx ? A.ctx.currentTime : 0;
  let s = 0;
  for (const e of T.s.values()) s += modPt(e, t);
  return clamp(s, T.d.lo != null ? T.d.lo : -1, T.d.hi != null ? T.d.hi : 1);
}
// src: a name ('gk:anlehnen', 'faehrte', 'rezept', 'map:<device>:<n>' …); v 0 = rest (a live source at rest leaves);
// opts: at (audio time: a point ahead – Fährte, Sporenregen), older (Höhe, Tonhöhe: the share of the notes before the
// newest; Höhe 1, Tonhöhe 0 by default), per(tt, v, newest) (a value per note: Höhe in field units, Tonhöhe in cents)
function modSet(src, k, v, o) {
  const T = MOD.t[k];
  if (!T || typeof v !== 'number' || !Number.isFinite(v)) return;
  let e = T.s.get(src);
  const at = o && o.at != null ? o.at : null;
  if (at == null) {
    if (v === 0 || Math.abs(v) < 1e-9) { if (e) { modDrop(T, src); modDue(); if (faeOk(src)) faeM(src, k, 0, null); } return; }
    if (e && !e.p && e.v === v && e.o === (o || null)) { if (o && o.fae && faeOk(src)) faeM(src, k, v, o); return; }   // (what the Fährte keeps of it may move on)
    if (!e) { e = { v, p: null, o: null }; modAdd(T, src, e); }
    e.v = v; e.p = null;
  } else {
    if (!e) { e = { v: 0, p: [], o: null }; modAdd(T, src, e); }
    if (!e.p) { e.p = []; T.pv++; }
    if (e.p.length && e.p[e.p.length - 1][0] >= at) { T.pv++; while (e.p.length && e.p[e.p.length - 1][0] >= at) e.p.pop(); }   // laid anew: scheduled anew
    e.p.push([at, v]);
    MOD.tm = 1;
  }
  e.o = o || null;
  modDue();
  if (at == null && faeOk(src)) faeM(src, k, v, o);   // the Fährte writes down every live source
}
function modAdd(T, src, e) { if (!T.s.size) MOD.n++; T.s.set(src, e); T.pv++; }
function modDrop(T, src) { if (T.s.delete(src)) { T.pv++; if (!T.s.size) MOD.n--; } }
// a source leaves every target (src ending in '*': every source starting so)
function modClear(src) {
  const pre = src.endsWith('*') ? src.slice(0, -1) : null;
  let any = false;
  for (const k in MOD.t) {
    const T = MOD.t[k];
    for (const n of Array.from(T.s.keys())) if (pre != null ? n.startsWith(pre) : n === src) { modDrop(T, n); any = true; if (faeOk(n)) faeM(n, k, 0, null); }
  }
  if (any) modDue();
}
// the frame applies it; a timer where a hidden page has no frames (a keyboard plays on in the background)
function modDue() { if (!MOD.due) MOD.due = setTimeout(modFlush, 40); }
// a new audio context (a test's offline render): the nodes of the old one are gone with it
function modCtx() {
  if (MOD.ctx === A.ctx) return;
  MOD.ctx = A.ctx;
  for (const k in MOD.t) { const T = MOD.t[k]; T.cs = null; T.x = null; T.last = 0; T.sch = null; }
  MOD.fbs.clear(); MOD.mx = 0; MOD.mxIds = null; MOD.eg = 1;
}
// Once a frame (and from the scheduler while points lie ahead): the audio targets ramp to their sums, held notes take
// Höhe and Tonhöhe, Ausdruck and the A/B-Morph reach the mixer. Nothing to do costs a few comparisons.
function modFlush(fromTick) {
  if (fromTick !== true) { clearTimeout(MOD.due); MOD.due = 0; }
  if (!A.ctx || !A.started) return;
  modCtx();
  const now = A.ctx.currentTime;
  if (MOD.mapV !== MAP.v) modBindCheck();
  let tm = 0;
  for (const k in MOD.t) {
    const T = MOD.t[k];
    if (T.d.u && (T.s.size || T.cs)) tm |= modParam(T, now);
  }
  // Tonhöhe, Ausdruck, Höhe and the Morph with points set ahead (a Fährte plays them back): the scheduler lays them,
  // at its pace – independent of frames, in the background too. Tonhöhe and Ausdruck go onto their params ahead
  // (sample-exact, a stall cannot stop them); Höhe (its engines' own glides) and the Morph (the whole mixer) are set
  // from the scheduler, Höhe aimed 40 ms ahead – as long as its engines take to glide there.
  const ah = (modFut(MOD.t.bend, now) ? 1 : 0) | (modFut(MOD.t.expr, now) ? 2 : 0) | (modFut(MOD.t.hoehe, now) ? 4 : 0) | (modFut(MOD.t.morph, now) ? 8 : 0);
  MOD.ah = ah; MOD.tm = tm | (ah ? 1 : 0);
  if (fromTick === true) {
    if (ah & 1) modBendAhead(now);
    if (ah & 2) modExprAhead(now);
    if (ah & 4) modNotes(now, true);
    if (ah & 8) modMorph();
    return;
  }
  if ((MOD.t.expr.s.size || MOD.eg !== 1 || MOD.exL) && !(ah & 2)) modExpr(now);
  if (MOD.t.morph.s.size || MOD.mx) modMorph();
  modNotes(now);
  if (MOD.fbs.size && performance.now() - MOD.sweep > 1000) modSweep();
}
// a source of the target has points still to come
const modFut = (T, now) => { if (T.s.size) for (const e of T.s.values()) if (e.p && e.p.length && e.p[e.p.length - 1][0] > now) return true; return false; };
// the set-ahead points of a target within the look-ahead (after now + a), in order
function modTimes(T, now, a) {
  const L = [];
  for (const e of T.s.values()) if (e.p) for (const q of e.p) if (q[0] > now + a && q[0] <= now + 0.4) L.push(q[0]);
  return L.sort((x, y) => x - y);
}
// what the live sources (not set ahead) of a target add up to: when it moved, a line laid ahead is laid anew
const modLive = (T) => { let v = 0; for (const e of T.s.values()) if (!e.p) v += e.v; return v; };
// Tonhöhe set ahead: each held note's bend bus gets its line up to the horizon, point to point (only new points
// appended while nothing else changed – laid anew from now each time would cut every corner)
function modBendAhead(now) {
  const B = MOD.t.bend, R = 0.025, timed = modTimes(B, now, R), live = modLive(B), nw = touches.size ? modNewest() : null;
  for (const tt of touches.values()) {
    if (tt.mpe) continue;
    let fb = tt.fb;
    const c0 = modCents(tt, nw, now + R);
    if (!fb) { if (!c0 && !timed.some((t) => modCents(tt, nw, t))) continue; if (!(fb = modFinger(tt))) continue; }
    const p = fb.src.offset, S = fb.sch;
    fb.own = NaN;   // the frame leaves this line alone; once the points end it takes over from wherever it is
    if (S && S.pv === B.pv && S.live === live && S.nw === nw && S.end > now + R) {
      for (const t of timed) if (t > S.end + 1e-4) { const c = modCents(tt, nw, t); p.linearRampToValueAtTime(c, t); S.end = p._e = t; p._v = c; }
      continue;
    }
    rampP(p, c0, R, now);
    let prev = now + R;
    for (const t of timed) if (t > prev + 1e-4) { const c = modCents(tt, nw, t); p.linearRampToValueAtTime(c, t); prev = p._e = t; p._v = c; }
    fb.sch = { pv: B.pv, live, nw, end: prev };
  }
}
// Ausdruck set ahead: its points on Klang's and Ebene 2's input gains – as setTargetAtTime, the kind every other
// setter of these gains uses (faders, the pedal, Schlafen's fade; in Chromium a ramp after a hold there drops to 0)
function modExprAhead(now) {
  const T = MOD.t.expr, timed = modTimes(T, now, 0.012), live = modLive(T);
  MOD.eg = modExprG(modVal('expr', now)); MOD.exL = true;   // (when the points end, the frame sets the gain anew)
  for (const k of ['fin', 'eb2']) {
    const st = MIX.s[k];
    if (!st) continue;
    const p = st.in.gain, base = stripGain(st, 1), S = st.exS;
    const at = (t) => stripGain(st, modExprG(modVal('expr', t)));
    if (S && S.pv === T.pv && S.live === live && S.base === base && S.end > now + 0.012) {
      for (const t of timed) if (t > S.end + 0.004) { p.setTargetAtTime(at(t), t - 0.006, 0.006); S.end = t; }
      continue;
    }
    p.cancelScheduledValues(now); p.setTargetAtTime(at(now + 0.012), now, 0.006);
    let prev = now;
    for (const t of timed) if (t > prev + 0.004) { p.setTargetAtTime(at(t), t - 0.006, 0.006); prev = t; }
    st.exS = { pv: T.pv, live, base, end: prev };
  }
}
// an audio target: hold where the param is, ramp to the sum in 25 ms; points set ahead are scheduled up to the
// scheduler's horizon as ramps from point to point (so they play sample-exact even when the page stalls)
function modParam(T, now) {
  const R = 0.025, u = T.d.u, timed = [];
  let fut = 0, live = 0;
  for (const [n, e] of T.s) {
    if (!e.p) { live += e.v; continue; }
    while (e.p.length > 1 && e.p[1][0] <= now) e.p.shift();   // the point before now stays: the line runs from it
    if (e.p.length === 1 && e.p[0][0] < now - 0.05 && e.p[0][1] === 0) { modDrop(T, n); continue; }   // ran out at rest
    for (const q of e.p) if (q[0] > now) { fut = 1; if (q[0] > now + R && q[0] <= now + 0.4) timed.push(q[0]); }
  }
  // Only new points ahead, the ones scheduled before unchanged and no live source moved: they are added after the
  // scheduled ones – the line then runs through every point exactly (laying it all anew from now would cut 25 ms off
  // each corner, every frame)
  const S = T.sch;
  if (timed.length && S && T.cs && S.pv === T.pv && S.live === live && S.end > now + R) {
    timed.sort((a, b) => a - b);
    const p = T.cs.offset;
    for (const t of timed) if (t > S.end + 1e-4) { const x = u(modVal(T.k, t)); p.linearRampToValueAtTime(x, t); S.end = p._e = t; p._v = x; if (T.hx) hxModPt(T.k, t, x); }
    return fut;
  }
  T.sch = null;
  const v = u(modVal(T.k, now + R));
  if (!T.cs && ((v === 0 && !timed.length) || !modNode(T))) return fut;
  if (!timed.length && v === T.last) return fut;
  const p = T.cs.offset;
  rampP(p, v, R, now);
  if (T.hx) hxModRamp(T.k, now, v, now + R);   // Hexenring: the chain's deflections, written down for a loop's bake
  T.last = v;
  if (timed.length) {
    timed.sort((a, b) => a - b);
    let prev = now + R;
    for (const t of timed) if (t > prev + 1e-4) { const x = u(modVal(T.k, t)); p.linearRampToValueAtTime(x, t); prev = p._e = t; p._v = x; if (T.hx) hxModPt(T.k, t, x); }
    T.last = NaN;   // scheduled ahead: the next tick schedules again
    T.sch = { pv: T.pv, live, end: prev };
  }
  return fut;
}
// The node a target moves: a ConstantSource whose value adds to the params it reaches – the insert chain's filter and
// phaser detune and auto-pan position (every copy of the chain too, see modChain), the ring oscillator's detune, the
// Bordun's filter detune, the echo's and hall's input level, the chorus's wet and dry gains; Leiern drives a gain of
// its own on the echo's wow and flutter LFOs into the delay times.
function modNode(T) {
  const c = A.ctx;
  if (!c.createConstantSource) return false;
  const cs = c.createConstantSource();
  cs.offset.value = 0; cs.start();
  T.cs = cs; T.last = 0;
  if (T.k === 'rng') cs.connect(A.rngOsc.detune);
  else if (T.k === 'dly') cs.connect(A.dlySend.gain);
  else if (T.k === 'rev') cs.connect(A.revSend.gain);
  else if (T.k === 'bor') { if (A.bor) cs.connect(A.bor.filt.detune); }
  else if (T.k === 'wow') {
    const w = G(0), f = G(0), s = G(0.15);   // flutter: 0.0006 for every 0.004 of wow, as updDelay
    A.wowLfo.connect(w); A.flutLfo.connect(f); cs.connect(w.gain); cs.connect(s).connect(f.gain);
    for (const g of [w, f]) { g.connect(A.dL.delayTime); g.connect(A.dR.delayTime); }
    T.x = [w, f, s];
  } else if (T.k === 'cho') { T.x = [G(0.7), G(-0.4)]; cs.connect(T.x[0]); cs.connect(T.x[1]); }   // as updChorus: wet 0.7·mix, dry 1 − 0.4·mix
  for (const ch of A.chains || []) modChain(ch, T);
  return true;
}
// a chain (new, or a copy for the sends) gets what the targets already move
function modChain(c, only) {
  if (MOD.ctx !== A.ctx) { modCtx(); return; }
  for (const T of only ? [only] : Object.values(MOD.t)) {
    if (!T.cs) continue;
    if (T.k === 'flt') T.cs.connect(c.flt.detune);
    else if (T.k === 'pha') for (const ap of c.phaAps) T.cs.connect(ap.detune);
    else if (T.k === 'pan') { if (c.apan.pan) T.cs.connect(c.apan.pan); }
    else if (T.k === 'cho') { T.x[0].connect(c.choWet.gain); T.x[1].connect(c.choDry.gain); }
    else if (T.k.startsWith('vok') && c.vokWet) vokConnect(c, T.k, T.cs);
  }
}
// Ausdruck: quieter down to silence below rest, up to +3 dB above, on top of the expression pedal. The strip's input
// gain is the mixer's (faders, the pedal, Schlafen's fade set it with setP): a glide of the same kind, never a hold
const modExprG = (v) => (v < 0 ? (1 + v) * (1 + v) : 1 + 0.41 * v);
function modExpr(now) {
  const g = modExprG(modVal('expr'));
  if (g === MOD.eg && !MOD.exL) return;
  MOD.eg = g; MOD.exL = false;
  const tc = SLP.gE > now ? Math.max(0.008, (SLP.gE - now) / 3) : 0.008;   // waking: Schlafen's glide back is not cut short
  for (const k of ['fin', 'eb2']) { const st = MIX.s[k]; if (st) { st.exS = null; setP(st.in.gain, stripGain(st), tc); } }
}
// the A/B-Morph: at most 25 times a second (the mixer's own morph is no faster), at once back to rest
function modMorph() {
  if (!MX.snap.a) mxSnapLoad();   // the scenes as stored, also before the mixer was ever opened
  const v = modVal('morph'), t = performance.now();
  if (v === MOD.mx || (v && Math.abs(v) < 1 && Math.abs(v - MOD.mx) < 0.003)) return;   // (a scene itself, ±1, is always reached exactly)
  if (v && t - MOD.mxT < 40) { modDue(); return; }
  MOD.mx = v; MOD.mxT = t;
  mxoApply();
}
// The mixer's sound reads its parameters through mp(): the patch's value – or, while the A/B-Morph deflects (MOD.mx
// −1 … 1), a blend from there toward scene A (−) or B (+) on each parameter's own scale, switches flipping at half way.
// Levels, balance, width, sends, EQ, Pumpen depth, mutes, the Puls group and the Summe follow; saturation (a new curve
// per step), routing (it rewires) and the Pumpen source stay as the patch has them.
const mxoOk = (id) => !/\.(sat|route|solo)$/.test(id) && id !== 'mix.duckSrc';
function mp(id) {
  const d = MOD.mx;
  if (!d) return P[id];
  const s = d > 0 ? MX.snap.b : MX.snap.a, v = P[id], to = s ? s[id] : undefined;
  if (to === undefined || to === v || !mxoOk(id)) return v;
  const D = PD[id], a = Math.abs(d);
  return D.kind === 'num' ? fromNorm(D, toNorm(D, v) + (toNorm(D, to) - toNorm(D, v)) * a) : a < 0.5 ? v : to;
}
// what the deflection touches now (or touched before): only those strips, the solo gates, the sends, the Summe
function mxoApply() {
  if (!A.ctx || !MIX.list.length || !MX.snap.a) return;
  const hit = new Set(), all = new Set(MOD.mxIds || []);
  if (MOD.mx) for (const id of mxSnapIds()) if (mxoOk(id) && (MX.snap.a[id] !== P[id] || MX.snap.b[id] !== P[id])) { hit.add(id); all.add(id); }
  MOD.mxIds = MOD.mx ? hit : null;
  const strips = new Set();
  let solo = false, sends = false, mst = false, puls = false;
  for (const id of all) {
    const m = /^x(\w+)\.(\w+)$/.exec(id);
    if (m) { strips.add(m[1]); if (m[2] === 'mute') solo = true; else if (m[2] === 'dly' || m[2] === 'rev') sends = true; }
    else if (id.startsWith('mst.')) mst = true;
    else if (id === 'mix.pulsVol' || id === 'mix.pulsMute') puls = true;
  }
  for (const st of MIX.list) if (strips.has(st.k) || (puls && st.lane != null)) updStrip(st);
  if (solo) updSolo();
  if (sends) updSends();
  if (mst) updMaster();
}
// Notes struck within 40 ms are one stroke – a chord from a keyboard arrives in any order a few ms apart, so "the
// newest note" is the stroke's highest (the melody on top: Tonhöhe bends it, whichever key came first); every note of
// the newest stroke gets Höhe's full share
// (t: when the note arrived – a MIDI event's own time stamp: notes of a chord stay one stroke however late the page gets
// to them; a touch: now)
function modStroke(t) { if (!(t > 0)) t = performance.now(); if (Math.abs(t - MOD.stkT) > 40) MOD.stkN++; MOD.stkT = t; return MOD.stkN; }
function modNewest() {
  let nw = null;
  for (const tt of touches.values()) if (!nw || (tt.stk || 0) > (nw.stk || 0) || ((tt.stk || 0) === (nw.stk || 0) && (tt.f > nw.f || (tt.f === nw.f && (tt.seq || 0) > (nw.seq || 0))))) nw = tt;
  return nw;
}
const modInNw = (tt, nw) => tt === nw || (!!nw && tt.stk != null && tt.stk === nw.stk);
// a note's height: its own (finger, keyboard wheel, pressure) plus what Höhe adds – summed, never overwritten
function modY(tt, nw, at) {
  const T = MOD.t.hoehe;
  if (!T.s.size) return tt.y;
  if (nw === undefined) nw = modNewest();
  const t = at != null ? at : A.ctx ? A.ctx.currentTime : 0;
  let s = 0;
  const inw = modInNw(tt, nw);   // (every note of the newest stroke)
  for (const e of T.s.values()) {
    const v = modPt(e, t), o = e.o;
    s += o && o.per ? o.per(tt, v, inw) : inw || !o || o.older == null ? v : v * o.older;
  }
  return clamp(tt.y + clamp(s, -1, 1) * MOD_HSPAN, 0, 1);
}
// a note's own bend in cents (MPE notes bring theirs)
function modCents(tt, nw, t) {
  const T = MOD.t.bend;
  if (!T.s.size || tt.mpe) return 0;
  let c = 0;
  for (const e of T.s.values()) {
    const v = modPt(e, t), o = e.o;
    c += o && o.per ? o.per(tt, v, tt === nw) : v * MOD_BSPAN * (tt === nw ? 1 : o && o.older != null ? o.older : 0);
  }
  return clamp(c, -2400, 2400);
}
// Höhe and Tonhöhe on the held notes: a height only when it moved (or comes back to exactly the note's own), a bend
// through the note's finger bus – made the first time the note bends. Every engine glides its height over 40–50 ms, so
// each note takes a new one every other frame (half the notes each frame – a formant voice's height is not cheap);
// coming back to rest reaches all at once.
function modNotes(now, tick) {
  const H = MOD.t.hoehe, B = MOD.t.bend, hOn = H.s.size > 0, bOn = B.s.size > 0;
  if (tick) {   // the scheduler: Höhe set ahead, every note, the value 40 ms from now
    const nw = touches.size ? modNewest() : null;
    for (const tt of touches.values()) { const y = modY(tt, nw, now + 0.04), m = tt.my != null ? tt.my : tt.y; if (Math.abs(y - m) > 0.002) { tt.my = y; for (const { v } of tt.voices) if (v.alive && v.setY) v.setY(y); } }
    H.was = hOn;
    return;
  }
  if (!hOn && !H.was && !bOn && !B.was) return;
  const nw = touches.size ? modNewest() : null, fr = ++MOD.fr, hT = MOD.ah & 4, bT = MOD.ah & 1;   // (what the scheduler lays, the frame leaves)
  for (const tt of touches.values()) {
    if (!hT && ((hOn && ((tt.seq || 0) + fr) % 2 === 0) || (!hOn && H.was))) {
      const y = modY(tt, nw), m = tt.my != null ? tt.my : tt.y;
      if (y !== m && (Math.abs(y - m) > 0.002 || y === tt.y)) { tt.my = y; for (const { v } of tt.voices) if (v.alive && v.setY) v.setY(y); }
    }
    if ((bOn || B.was) && !bT) {
      const c = modCents(tt, nw, now);
      let fb = tt.fb;
      if (!fb) { if (!c || !(fb = modFinger(tt))) continue; }
      if (c === fb.own) continue;
      fb.own = c;
      rampP(fb.src.offset, c, 0.02, now);
    }
  }
  H.was = hOn; B.was = bOn;
}
// Tonhöhe pro Finger: a bus of the note's own – what fed its voices' pitch until now (the shared vibrato and drift, or
// its keyboard channel's wheel) plus a constant source of its own – patched in under its held voices the moment it first
// bends; it moves with no glide of the field's finger and no frequency set of its own, so a moving finger and a bend
// never fight. Körner read its cents per grain. After the note is let go it keeps the pitch it had.
function modFinger(tt) {
  if (!A.ctx || !A.ctx.createConstantSource) return null;
  const par = tt.bend && tt.bend.node ? tt.bend : null, from = par ? par.node : tt.bend ? A.notePitch : A.pitchMod;
  const node = A.ctx.createGain(), src = A.ctx.createConstantSource();
  src.offset.value = 0; src.start();
  from.connect(node); src.connect(node);
  const fb = { node, src, from, par, own: 0, tt, vs: [], get cents() { return (this.par ? this.par.cents : this.from === A.notePitch ? A.bendCents || 0 : 0) + this.own; } };
  for (const { v } of tt.voices) {
    if (!v.alive) continue;
    // the new path first, then the old one off: at worst one render quantum hears the vibrato twice, never a gap
    for (const m of v.mods) if (m[0] === from) { try { node.connect(m[1]); from.disconnect(m[1]); m[0] = node; } catch (e) {} }
    v.bend = fb; fb.vs.push(v);
  }
  tt.fb = fb; MOD.fbs.add(fb);
  return fb;
}
// finger buses whose note is gone and whose voices have faded
function modSweep() {
  MOD.sweep = performance.now();
  for (const fb of Array.from(MOD.fbs)) {
    if (touches.get(fb.tt.id) === fb.tt || fb.vs.some((v) => v.alive)) continue;
    MOD.fbs.delete(fb);
    if (fb.off) fb.off();   // what else fed the bus (Anlehnen's Ocarina LFO)
    try { fb.src.stop(); fb.src.disconnect(); fb.from.disconnect(fb.node); fb.node.disconnect(); } catch (e) {}
  }
}
// a note started or ended: the newest changes – Höhe and Tonhöhe weigh again
function modTouch() { if (MOD.t.hoehe.s.size || MOD.t.bend.s.size || MOD.t.hoehe.was || MOD.t.bend.was) modDue(); }

