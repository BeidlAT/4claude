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
    st.in.connect(st.byp).connect(st.mBy).connect(st.duck).connect(st.dry);
    st.wet.connect(st.mBy); st.mWet.connect(st.duck);
    if (!st.ret) { st.eS = G(1); st.duck.connect(st.eS); }
    if (d.k !== 'rev') { st.hS = G(1); st.duck.connect(st.hS); }
    MIX.s[d.k] = st; MIX.list.push(st); if (!st.ret) MIX.src.push(st);
  }
}
const faderGain = (db) => (db <= FADER_OFF ? 0 : dbToGain(db));
function stripGain(st, eg = MOD.eg) {
  const g = faderGain(mp('x' + st.k + '.vol')) * (st.k === 'fin' || st.k === 'eb2' ? MIDI.expr * eg : 1);   // expression pedal (CC 11), Formen · Ausdruck
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
  if (key === 'route' || key === 'dly' || key === 'rev') updSends();
}
// Solo: a soloed channel silences the other channels (dry and sends); echo and hall stay open so it keeps its space.
// A soloed return plays only the effect: the channels go on feeding it, but their dry sound is muted.
function updSolo(inst) {
  if (!A.ctx) return;
  const anySrc = MIX.src.some((st) => P['x' + st.k + '.solo']), anyRet = MIX.list.some((st) => st.ret && P['x' + st.k + '.solo']);
  for (const st of MIX.list) {
    const p = 'x' + st.k + '.', solo = P[p + 'solo'];
    let on = !mp(p + 'mute'), dry = true;
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
}
// dry path: through the insert chain or straight into the sum; a move fades the channel out and back in
function wireStrip(st) {
  const want = () => (st.k === 'hxr' ? hxRoute() : !st.ret && P['x' + st.k + '.route'] !== 'dir' ? A.voiceBus : A.masterSum);   // Hexenring: never into A.masterSum
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
  for (const fx of ['dly', 'rev']) {
    const S = A.send[fx], node = (st) => (fx === 'dly' ? st.eS : st.hS);
    const viaFx = (st) => st.k !== 'hxr' && P['x' + st.k + '.route'] !== 'dir';   // (Hexenring: its sends take its own signal)
    const copy = MIX.src.some((st) => viaFx(st) && (mp('x' + st.k + '.' + fx) !== 1 || st.dryOff));
    if (copy && !S.copy) {
      S.copy = makeChain();
      updDrive(S.copy); updRing(S.copy); updFilter(S.copy); updPhaser(S.copy); updChorus(S.copy);
      S.fromCopy = G(0); S.copy.out.connect(S.fromCopy).connect(S.target);
    }
    for (const st of MIX.src) sendTo(st, fx, node(st), !viaFx(st) ? S.target : copy ? S.copy.in : null);
    if (copy !== (S.mode === 'copy')) {
      S.mode = copy ? 'copy' : 'fx';
      const set = inst ? setNow : (q, v) => setP(q, v, 0.01);
      set(S.fromFx.gain, copy ? 0 : 1); set(S.fromCopy.gain, copy ? 1 : 0);
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
