/* =====================================================================
   Mischpult: one channel strip per sound layer
   ===================================================================== */
// Pegel (input gain: fader × Puls group) → [Tiefen-/Höhenschnitt, EQ, Sättigung] → [Breite and Balance as one 2×2
// matrix] → Pumpen → into the insert chain or straight into the sum, plus post-fader sends to echo and hall; mute and
// solo close the dry path and the sends. The bracketed blocks are switched in (with a short crossfade) only while they
// do something: at the default settings a strip is five plain gains – exactly transparent, so presets sound as before,
// cheap, and silent when nothing plays (the browser then skips the work).
const MIX = { s: {}, list: [], src: [], meter: false, duckT: [] };
const stripIn = (k) => (MIX.s[k] ? MIX.s[k].in : A.voiceBus);
function buildStrips() {
  MIX.s = {}; MIX.list = []; MIX.src = []; MIX.meter = false; MIX.duckT = [];
  A.mm = A.km = A.mw = A.lufs = null; A.mwOn = false;
  for (const d of STRIPS) {
    const st = { k: d.k, d, ret: !!d.ret, lane: d.lane, proc: null, procOn: false, mat: null, matOn: false, to: {}, dTo: null, duckOn: false };
    st.in = G(1); st.in.channelCount = 2; st.in.channelCountMode = 'explicit'; st.in.channelInterpretation = 'speakers';
    st.byp = G(1); st.wet = G(0); st.mBy = G(1); st.mWet = G(0); st.duck = G(1); st.dry = G(1);
    // (owner, 26.10.2026) Klang and Ebene 2 (30.10.2026: every Ebene): the Touché's insert sits between the input and the strip's blocks – a dry
    // gain at 1 and a wet one at 0 (nothing feeds it): exactly the strip as before until a Spielweise Körner … Arpeggio plays; st.pt is
    // what follows it (the strip's own EQ takes its input there)
    if (d.eb) { st.tD = G(1); st.tW = G(0); st.pt = G(1); st.in.connect(st.tD).connect(st.pt); st.tW.connect(st.pt); } else st.pt = st.in;
    st.pt.connect(st.byp);
    st.byp.connect(st.mBy).connect(st.duck).connect(st.dry);
    st.wet.connect(st.mBy); st.mWet.connect(st.duck);
    if (!st.ret) { st.eS = G(1); st.duck.connect(st.eS); st.fS = {}; for (const [r] of FX_RETS) { st.fS[r] = G(1); st.duck.connect(st.fS[r]); } }
    if (d.k !== 'rev') { st.hS = G(1); st.duck.connect(st.hS); }
    MIX.s[d.k] = st; MIX.list.push(st); if (!st.ret) MIX.src.push(st);
  }
}
const faderGain = (db) => (db <= FADER_OFF ? 0 : dbToGain(db));
function stripGain(st, eg = MOD.eg) {
  const g = faderGain(mp('x' + st.k + '.vol')) * (st.d.eb ? MIDI.expr * eg : 1) * (st.k === 'hxr' && typeof hxHrGain === 'function' ? hxHrGain() : 1);   // expression pedal (CC 11), Formen · Ausdruck – on every Ebene; Hexenring: its Pegelhaushalt (haushalt.js)
  const v = st.lane == null ? g : g * (mp('mix.pulsMute') ? 0 : faderGain(mp('mix.pulsVol')));
  return SLP.dk ? v * slpK(st) : v;   // Schlafen: the dry sound fades into the frozen tail
}
function updMix(inst) {
  if (!A.ctx || !MIX.list.length) return;
  for (const st of MIX.list) updStrip(st, inst);
  updSolo(inst); updSends(inst);
}
function updStrip(st, inst) {
  if (!A.ctx) return;
  const p = 'x' + st.k + '.', set = inst ? setNow : (q, v) => setP(q, v, 0.012);
  set(st.in.gain, stripGain(st)); gspGate(st, set);
  matUpd(st, inst);
  gates(st, set);
  procUpd(st, inst);
  const duck = mp(p + 'duck') > 0;
  if (st.duckOn && !duck) setP(st.duck.gain, 1, 0.02);
  st.duckOn = duck;
  wireStrip(st);
}
function mixParam(st, key) {
  if (!A.ctx) return;
  if (key === 'mute' || key === 'solo') { updSolo(); updSends(); return; }
  updStrip(st);
  if (key === 'route' || key === 'fxm' || key === 'dly' || key === 'rev' || st.fS && st.fS[key]) updSends();
}
// Solo: a soloed channel silences the other channels (dry and sends); echo and hall stay open so it keeps its space.
// A soloed return plays only the effect: the channels go on feeding it, but their dry sound is muted.
// (30.10.2026) Solo among the Ebenen (e<n>.solo, the Klang page): the other layers' strips close as well – everything
// else plays on (a layer's solo is the instrument's, not the mixer's); a new note plays no voice on them (touch.js layers).
function updSolo(inst) {
  if (!A.ctx) return;
  const anySrc = MIX.src.some((st) => P['x' + st.k + '.solo']), anyRet = MIX.list.some((st) => st.ret && P['x' + st.k + '.solo']), anyLy = EB.some((e) => P[e.pre + 'solo']);
  for (const st of MIX.list) {
    const p = 'x' + st.k + '.', solo = P[p + 'solo'];
    let on = !mp(p + 'mute'), dry = true;
    if (anyLy && st.d.eb && !P[EB[st.d.eb - 1].pre + 'solo']) on = false;
    if (st.ret) { if (anyRet && !solo) on = false; }
    else { if (anySrc && !solo) on = false; if (anyRet && !solo) dry = false; }
    st.silent = !on; st.dryOff = !dry;
    gates(st, inst ? setNow : (q, v) => setP(q, v, 0.008));
  }
}
// the dry path and the sends: closed by mute and solo, the dry path also while a route switch moves it
function gates(st, set) {
  const p = 'x' + st.k + '.', on = !st.silent;
  set(st.dry.gain, on && !st.dryOff && !st.switching ? 1 : 0);
  gspGate(st, set);
  if (st.eS) set(st.eS.gain, on ? mp(p + 'dly') : 0);
  if (st.hS) set(st.hS.gain, on ? (st.k === 'dly' ? 0.3 : 1) * mp(p + 'rev') : 0);
  if (st.fS) for (const r in st.fS) set(st.fS[r].gain, on ? mp(p + r) : 0);
}
// dry path: through the insert chain or straight into the sum; a move fades the channel out and back in
function wireStrip(st) {
  // (31.10.2026) a channel on „Kette“ with only some of its effects: into the chain of just those (fxmIn – wege-fx.js)
  const want = () => (st.k === 'hxr' ? hxRoute() : st.k === 'fx' ? (P['fx.weg'] === 'kette' ? fxKetteIn() : A.masterSum) : st.ret ? A.masterSum : fxmIn(fxmOf(st.k)));   // Hexenring: never into A.masterSum; Wandel: its own way (effekt.js)
  if (st.dTo === want()) return;
  if (st.k === 'hxr' && IDLE.hxOff) hxGates(true);   // Ruhe: through the chain's copy, the processor's zeros run as before
  if (!st.dTo) { st.dTo = want(); st.dry.connect(st.dTo); return; }
  if (st.switching) return;
  st.switching = true;
  const t = A.ctx.currentTime;
  holdParam(st.dry.gain, t); st.dry.gain.linearRampToValueAtTime(0, t + 0.015);
  setTimeout(() => {
    st.switching = false;
    if (!A.ctx) return;
    const w = want();
    if (st.dTo !== w) { try { st.dry.disconnect(st.dTo); } catch (e) {} st.dry.connect(w); st.dTo = w; }
    updSolo(); updSends();
  }, 40);
}
// Sends are post-fader and, like before, take the sound after the insert chain. While every channel that goes
// through the chain sends 100 %, that is the chain's own output; as soon as one sends a different amount (or a soloed
// return mutes the dry sound, which also silences the chain), a copy of the chain (same settings, same modulators)
// carries the weighted sum and takes over with a short crossfade. Channels routed straight into the sum send their
// own signal.
function updSends(inst) {
  if (!A.send || !MIX.src.length) return;
  for (const fx of ['dly', 'rev', ...FX_RETS.map((x) => x[0])]) {
    const S = A.send[fx], node = (st) => (fx === 'dly' ? st.eS : fx === 'rev' ? st.hS : st.fS[fx]);
    const viaFx = (st) => st.k !== 'hxr' && fxmOf(st.k) > 0;   // (Hexenring: its sends take its own signal)
    const copy = MIX.src.some((st) => viaFx(st) && (mp('x' + st.k + '.' + fx) !== 1 || st.dryOff));
    // (31.10.2026) a copy per set of effects: a channel through only some of them sends what comes out of just those
    const cp = (m) => {
      S.copies = S.copies || {};
      let C = m === FXM_ALL ? S.copy : S.copies[m];
      if (C && C.in.context === A.ctx) return C;
      C = makeChain(m); updDrive(C); updRing(C); updFilter(C); updPhaser(C); updChorus(C);
      C.from = G(0); C.out.connect(C.from).connect(S.target);
      if (S.mode === 'copy') C.from.gain.value = 1;   // (made while the copies already carry the sends)
      if (m === FXM_ALL) { S.copy = C; S.fromCopy = C.from; } else S.copies[m] = C;
      return C;
    };
    if (copy) for (const st of MIX.src) if (viaFx(st)) cp(fxmOf(st.k));
    for (const st of MIX.src) sendTo(st, fx, node(st), !viaFx(st) ? S.target : copy ? cp(fxmOf(st.k)).in : null);
    if (copy !== (S.mode === 'copy')) {
      S.mode = copy ? 'copy' : 'fx';
      const set = inst ? setNow : (q, v) => setP(q, v, 0.01);
      set(S.fromFx.gain, copy ? 0 : 1); if (S.fromCopy) set(S.fromCopy.gain, copy ? 1 : 0);
      for (const m in S.copies || {}) set(S.copies[m].from.gain, copy ? 1 : 0);
      for (const m in A.fxm || {}) { const g = A.fxm[m].from[fx]; if (g) set(g.gain, copy ? 0 : 1); }
    }
  }
}
function sendTo(st, fx, node, want) {
  const cur = st.to[fx];
  if (cur === want) return;
  if (want) node.connect(want);
  st.to[fx] = want;
  if (!cur) return;
  // leaving the chain copy: keep feeding it until its output has faded out
  if (want) { try { node.disconnect(cur); } catch (e) {} return; }
  setTimeout(() => { if (st.to[fx] !== cur) { try { node.disconnect(cur); } catch (e) {} } }, 90);
}
