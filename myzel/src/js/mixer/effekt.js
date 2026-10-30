/* ---------- Der Rückweg „Effekt“ (owner, 29.10.2026: „eine Effektseite … damit die Klänge noch vielschichtiger und
   kreativer werden“): a third return beside echo and hall – every channel sends into it (x…fx, its share; fx.mix the
   master), and it plays the effect chosen (fx.typ – dsp/effekte.js): Resonanz-Netz, Wolke, Spektral-Nebel, Oktav-Echo,
   Vokal-Filter. Its processor is made the first time it is wanted (Anteil above 0) and replaced with a crossfade when
   another is chosen; the scale and the Puls's beat go to it as they change. Without AudioWorklet it stays silent.
   (owner, 30.10.2026: „wir brauchen nur einen davon“) One return, „Wandel“ (FX_RETS, params.js – 29.10. there were two,
   „Effekt“ and „Effekt 2“; old patches' fx2 keys are ignored); a channel can take it into itself as its Einschub (x…ins,
   x…insmix – mixer/processing.js): a processor of its own with the return's settings, mixed with the channel's sound.
   Its way (fx.weg): straight into the sum, or „Durch die Kette“ – a copy of the chain (fxKetteIn) so filter, phaser,
   drive and all shape the wet sound. The Flechtwerk (dsp/effekte.js Flecht) gets the Taktgeber's grid (fxGrid). ---------- */
const FX_TYPES = {
  netz: { proc: 'myzel-netz', name: 'Resonanz-Netz', i: 'Saiten, Glocken oder Holz auf der Tonleiter schwingen mit', keys: { art: 'art', klang: 'klang', hell: 'hell', breite: 'breite', ton: 'ton' } },
  wolke: { proc: 'myzel-wolke', name: 'Wolke', i: 'Körner des Gespielten kehren im Takt zurück', keys: { dichte: 'dichte', zeit: 'zeit', hoehe: 'hoehe', rueck: 'rueck', streu: 'streu', nach: 'nach' } },
  spektral: { proc: 'myzel-spek', name: 'Spektral-Nebel', i: 'Der Klang zerfließt zur stehenden Fläche', keys: { zeit: 'szeit', hell: 'shell', halten: 'halten' } },
  oktav: { proc: 'myzel-oktav', name: 'Oktav-Echo', i: 'Ein Echo, das sich im Takt hochschraubt', keys: { zeit: 'ozeit', nach: 'onach', schritt: 'schritt', hell: 'ohell' } },
  // (30.10.2026) Flechtwerk: a rhythmic weave – a Euclidean pattern on the Takt gates the sound and runs a filter through it
  flecht: { proc: 'myzel-flecht', name: 'Flechtwerk', i: 'Ein Muster im Takt webt den Klang: Tore, Filterlauf, Seiten', keys: { steps: 'fsteps', schl: 'fschl', dreh: 'fdreh', raster: 'fraster', tiefe: 'ftiefe', filt: 'ffilt', weich: 'fweich', seite: 'fseite' } },
  harmo: { proc: 'myzel-harmo', name: 'Harmonizer', i: 'Bis zu drei Stimmen in der Tonart oder in Halbtönen', keys: { v1: 'hv1', v2: 'hv2', v3: 'hv3', modus: 'hmod', form: 'hform', breite: 'hbreit', schimmer: 'hschim' } },
  vokal: { proc: 'myzel-vokal', name: 'Vokal-Filter', i: 'Der Klang spricht: a, e, i, o, u', keys: { vokal: 'vokal', bewegung: 'beweg', resonanz: 'reso', stimme: 'stimme' } },
};
// T.keys: the processor's knob → the parameter's name after the return's prefix (r + '.')
const fxSet = (T, r) => { const o = {}; for (const k in T.keys) { const v = P[r + '.' + T.keys[k]]; o[k] = v === 'ton' ? 1 : v === 'halb' ? 0 : +v; } return o; };   // (the Harmonizer's „Stimmen in“: Tonart 1, Halbtöne 0)
const fxFreqs = () => [...new Set((N.notes || []).map((n) => +n.f.toFixed(2)))].slice(0, 12);
const fxBeat = () => 60 / Math.max(20, P['seq.bpm'] || 90);
// (30.10.2026) the Takt for the Flechtwerk: the frame of beat 0 and the frames per beat (none without a Takt: it runs free)
const fxGrid = () => (A.ctx && typeof hxGrid === 'function' && hxGrid() && typeof tgTime === 'function' ? { f0: tgTime(0) * SR, fpb: (60 / tgBpm(A.ctx.currentTime)) * SR } : { f0: 0, fpb: 0 });
const fxType = (r) => FX_TYPES[P[r + '.typ']] || FX_TYPES.netz;
// a processor of the return r's effect (null without AudioWorklet)
function fxNode(r) {
  if (!A.ctx.__dspOK) return null;
  const T = fxType(r);
  try { return new AudioWorkletNode(A.ctx, T.proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { set: fxSet(T, r), beat: fxBeat(), freqs: fxFreqs(), grid: fxGrid() } }); } catch (e) { return null; }
}
// a slot (a return's, or a channel's Einschub) moves to a new processor: the new one fades in, the old one out and goes
function fxSwap(S, from, to, typ) {
  const node = fxNode(S.r);
  if (!node) return;
  const t = A.ctx.currentTime + 0.01, g = G(0), old = S.cur;
  from.connect(node).connect(g).connect(to);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.2);
  if (old) fxDrop(from, old, t);
  S.cur = { typ, node, g };
}
function fxDrop(from, old, t) {
  holdParam(old.g.gain, t); old.g.gain.linearRampToValueAtTime(0, t + 0.2);
  setTimeout(() => { try { from.disconnect(old.node); old.node.disconnect(); old.g.disconnect(); old.node.port.postMessage({ kill: 1 }); } catch (e) {} }, 500);
}
// the return r (all of them without r): its master, its processor, and the Einschübe that play its effect
function fxUpd(r, force) {
  if (!A.ctx || !A.fxR) return;
  if (!r) { for (const [k] of FX_RETS) fxUpd(k); return; }
  const S = A.fxR[r];
  setP(S.send.gain, P[r + '.mix']);
  const typ = P[r + '.typ'];
  if (S.cur && S.cur.typ === typ) S.cur.node.port.postMessage({ set: fxSet(fxType(r), r) });
  else if ((P[r + '.mix'] > 0 || force || MOD.t[r].cs) && A.ctx.__dspOK) fxSwap(S, S.in, S.ret, typ);
  for (const st of MIX.src) if (st.proc && st.proc.ins && st.proc.ins.r === r) fxInsUpd(st);
}
// the scale and the beat, as they change (notes.js, the Puls) – to the returns and the Einschübe
function fxTune() {
  const m = { freqs: fxFreqs(), beat: fxBeat(), grid: fxGrid() };
  for (const S of Object.values(A.fxR || {})) if (S.cur) S.cur.node.port.postMessage(m);
  for (const st of MIX.src) if (st.proc && st.proc.ins && st.proc.ins.cur) st.proc.ins.cur.node.port.postMessage(m);
}
// (30.10.2026: „auch durch den Filter und andere Bereiche jagen“) the return's way through a copy of the chain (the same
// settings and modulators – makeChain lists it in A.chains, so every knob moves it too), ending in the sum
function fxKetteIn() {
  if (A.fxKette && A.fxKette.ctx === A.ctx) return A.fxKette.in;
  const c = makeChain(); c.ctx = A.ctx;
  updDrive(c); updRing(c); updFilter(c); updPhaser(c); updChorus(c);
  c.out.connect(A.masterSum);
  return (A.fxKette = c).in;
}
// what its details say: the effect's own sentence
const fxText = (r = 'fx') => fxType(r).i;
// A channel's Einschub (makeProc's x.ins: the slot between its Transienten-Former and its output): which return's
// effect it plays and how much of it – equal power, so the middle is as loud as either end. „Keiner“ fades the
// processor out and lets it go.
function fxInsUpd(st, inst) {
  const x = st.proc, I = x && x.ins;
  if (!I) return;
  const p = 'x' + st.k + '.', r = P[p + 'ins'], on = r !== '0' && !!A.fxR[r], m = on ? mp(p + 'insmix') : 0;
  const set = inst ? setNow : (q, v) => setP(q, v, 0.02);
  set(I.dry.gain, Math.cos(m * Math.PI / 2)); set(I.wet.gain, Math.sin(m * Math.PI / 2));
  if (!on) { if (I.cur) { fxDrop(I.from, I.cur, A.ctx.currentTime + 0.01); I.cur = null; } I.r = null; return; }
  const typ = P[r + '.typ'];
  if (I.r === r && I.cur && I.cur.typ === typ) { I.cur.node.port.postMessage({ set: fxSet(fxType(r), r) }); return; }
  I.r = r; fxSwap(I, I.from, I.wet, typ);
}
// What the mixer's own processors cost (units of a Nebel voice, as VCOST – dev/tests/klang/tests/cost.js, candidates fx…;
// see FX_COST's note) – counted in voiceLoad() beside the voices, so the budget knows them: the returns' effects and the
// Einschübe while they exist, a channel's Sättigung and Transienten-Former while they work (at 0 they pass the sound
// through and cost next to nothing), the Begrenzer always
// (29.10.2026: NV 16 of each fed by noise, two runs on this machine after the processors were made faster, the higher
// + 15 %; Resonanz-Netz per Art – Saiten, Glocken, Holzkörper; Wolke at full density, the Begrenzer pressed)
const FX_COST = { netz: [1.37, 1.58, 0.85], wolke: 4.52, spektral: 6.29, oktav: 1.05, vokal: 1.32, harmo: 7.5, trans: 0.47, sat: 1.41, lim: 1.23, komp: 1.1, flecht: 1.1 };   // (flecht 30.10.2026: fxflecht1 1.02 − hxz1 0.075 = 0.95, one run of 4 rounds + 15 %; two state-variable filters and a pow per sample)   // (komp 30.10.2026: fxkomp1 1.03 − hxz1 0.09 = 0.94, one run of 4 rounds + 15 %; a log and a pow per sample)
function fxLoad() {
  if (!A.fxR) return 0;
  const cost = (typ, r) => { const c = FX_COST[typ]; return Array.isArray(c) ? c[Math.round(+P[r + '.art']) || 0] || c[0] : c || 0; };
  let c = A.lim ? FX_COST.lim : 0;
  for (const r in A.fxR) { const S = A.fxR[r]; if (S.cur) c += cost(S.cur.typ, r); }
  for (const st of MIX.list) {
    const x = st.proc;
    if (!x) continue;
    if (x.satW && P['x' + st.k + '.sat'] > 0) c += FX_COST.sat;
    if (x.tr && (P['x' + st.k + '.att'] || P['x' + st.k + '.aus'])) c += FX_COST.trans;
    if (x.kp && P['x' + st.k + '.krat'] > 1.05) c += FX_COST.komp;
    if (x.ins && x.ins.cur) c += cost(x.ins.cur.typ, x.ins.r);
  }
  return c;
}
