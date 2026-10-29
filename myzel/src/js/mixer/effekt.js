/* ---------- Der Rückweg „Effekt“ (owner, 29.10.2026: „eine Effektseite … damit die Klänge noch vielschichtiger und
   kreativer werden“): a third return beside echo and hall – every channel sends into it (x…fx, its share; fx.mix the
   master), and it plays the effect chosen (fx.typ – dsp/effekte.js): Resonanz-Netz, Wolke, Spektral-Nebel, Oktav-Echo,
   Vokal-Filter. Its processor is made the first time it is wanted (Anteil above 0) and replaced with a crossfade when
   another is chosen; the scale and the Puls's beat go to it as they change. Without AudioWorklet it stays silent.
   (owner, 29.10.2026: „ja alle 3 offenen Punkte erledigen“) Two of them: „Effekt“ and „Effekt 2“ (FX_RETS, params.js),
   each with its own choice and knobs; and a channel can take either into itself as its Einschub (x…ins, x…insmix –
   mixer/processing.js): a processor of its own with that return's settings, mixed with the channel's sound. ---------- */
const FX_TYPES = {
  netz: { proc: 'myzel-netz', name: 'Resonanz-Netz', i: 'Saiten, Glocken oder ein Holzkörper, auf die Tonleiter gestimmt, schwingen mit allem mit, was hineinklingt', keys: { art: 'art', klang: 'klang', hell: 'hell', breite: 'breite', ton: 'ton' } },
  wolke: { proc: 'myzel-wolke', name: 'Wolke', i: 'Körner des eben Gespielten kommen im Takt zurück – oktaviert, rückwärts, weit verstreut', keys: { dichte: 'dichte', zeit: 'zeit', hoehe: 'hoehe', rueck: 'rueck', streu: 'streu', nach: 'nach' } },
  spektral: { proc: 'myzel-spek', name: 'Spektral-Nebel', i: 'Der Klang zerfließt in eine stehende Fläche – „Halten“ friert sie ein', keys: { zeit: 'szeit', hell: 'shell', halten: 'halten' } },
  oktav: { proc: 'myzel-oktav', name: 'Oktav-Echo', i: 'Ein Echo im Takt, das sich mit jeder Wiederholung hochschraubt (oder hinab)', keys: { zeit: 'ozeit', nach: 'onach', schritt: 'schritt', hell: 'ohell' } },
  vokal: { proc: 'myzel-vokal', name: 'Vokal-Filter', i: 'Der Klang spricht: drei Formanten gleiten durch a, e, i, o, u', keys: { vokal: 'vokal', bewegung: 'beweg', resonanz: 'reso', stimme: 'stimme' } },
};
// T.keys: the processor's knob → the parameter's name after the return's prefix (r + '.')
const fxSet = (T, r) => { const o = {}; for (const k in T.keys) o[k] = +P[r + '.' + T.keys[k]]; return o; };
const fxFreqs = () => [...new Set((N.notes || []).map((n) => +n.f.toFixed(2)))].slice(0, 12);
const fxBeat = () => 60 / Math.max(20, P['seq.bpm'] || 90);
const fxType = (r) => FX_TYPES[P[r + '.typ']] || FX_TYPES.netz;
// a processor of the return r's effect (null without AudioWorklet)
function fxNode(r) {
  if (!A.ctx.__dspOK) return null;
  const T = fxType(r);
  try { return new AudioWorkletNode(A.ctx, T.proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { set: fxSet(T, r), beat: fxBeat(), freqs: fxFreqs() } }); } catch (e) { return null; }
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
  const m = { freqs: fxFreqs(), beat: fxBeat() };
  for (const S of Object.values(A.fxR || {})) if (S.cur) S.cur.node.port.postMessage(m);
  for (const st of MIX.src) if (st.proc && st.proc.ins && st.proc.ins.cur) st.proc.ins.cur.node.port.postMessage(m);
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
