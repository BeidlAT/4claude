/* ---------- Der Rückweg „Effekt“ (owner, 29.10.2026: „eine Effektseite … damit die Klänge noch vielschichtiger und
   kreativer werden“): a third return beside echo and hall – every channel sends into it (x…fx, its share; fx.mix the
   master), and it plays the effect chosen (fx.typ – dsp/effekte.js): Resonanz-Netz, Wolke, Spektral-Nebel, Oktav-Echo,
   Vokal-Filter. Its processor is made the first time it is wanted (Anteil above 0) and replaced with a crossfade when
   another is chosen; the scale and the Puls's beat go to it as they change. Without AudioWorklet it stays silent. ---------- */
const FX_TYPES = {
  netz: { proc: 'myzel-netz', name: 'Resonanz-Netz', i: 'Saiten, Glocken oder ein Holzkörper, auf die Tonleiter gestimmt, schwingen mit allem mit, was hineinklingt', keys: { art: 'fx.art', klang: 'fx.klang', hell: 'fx.hell', breite: 'fx.breite', ton: 'fx.ton' } },
  wolke: { proc: 'myzel-wolke', name: 'Wolke', i: 'Körner des eben Gespielten kommen im Takt zurück – oktaviert, rückwärts, weit verstreut', keys: { dichte: 'fx.dichte', zeit: 'fx.zeit', hoehe: 'fx.hoehe', rueck: 'fx.rueck', streu: 'fx.streu', nach: 'fx.nach' } },
  spektral: { proc: 'myzel-spek', name: 'Spektral-Nebel', i: 'Der Klang zerfließt in eine stehende Fläche – „Halten“ friert sie ein', keys: { zeit: 'fx.szeit', hell: 'fx.shell', halten: 'fx.halten' } },
  oktav: { proc: 'myzel-oktav', name: 'Oktav-Echo', i: 'Ein Echo im Takt, das sich mit jeder Wiederholung hochschraubt (oder hinab)', keys: { zeit: 'fx.ozeit', nach: 'fx.onach', schritt: 'fx.schritt', hell: 'fx.ohell' } },
  vokal: { proc: 'myzel-vokal', name: 'Vokal-Filter', i: 'Der Klang spricht: drei Formanten gleiten durch a, e, i, o, u', keys: { vokal: 'fx.vokal', bewegung: 'fx.beweg', resonanz: 'fx.reso', stimme: 'fx.stimme' } },
};
const fxSet = (T) => { const o = {}; for (const k in T.keys) o[k] = +P[T.keys[k]]; return o; };
const fxFreqs = () => [...new Set((N.notes || []).map((n) => +n.f.toFixed(2)))].slice(0, 12);
const fxBeat = () => 60 / Math.max(20, P['seq.bpm'] || 90);
function fxUpd() {
  if (!A.ctx || !A.fxSend) return;
  setP(A.fxSend.gain, P['fx.mix']);
  const T = FX_TYPES[P['fx.typ']] || FX_TYPES.netz;
  if (A.fx && A.fx.typ === P['fx.typ']) { A.fx.node.port.postMessage({ set: fxSet(T) }); return; }
  if (!(P['fx.mix'] > 0) || !A.ctx.__dspOK) return;
  let node; try { node = new AudioWorkletNode(A.ctx, T.proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { set: fxSet(T), beat: fxBeat(), freqs: fxFreqs() } }); } catch (e) { return; }
  const t = A.ctx.currentTime + 0.01, g = G(0), old = A.fx;
  A.fxIn.connect(node).connect(g).connect(A.fxRet);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.2);
  if (old) { holdParam(old.g.gain, t); old.g.gain.linearRampToValueAtTime(0, t + 0.2); setTimeout(() => { try { A.fxIn.disconnect(old.node); old.node.disconnect(); old.g.disconnect(); old.node.port.postMessage({ kill: 1 }); } catch (e) {} }, 500); }
  A.fx = { typ: P['fx.typ'], node, g };
}
// the scale and the beat, as they change (notes.js, the Puls)
function fxTune() { if (A.fx) A.fx.node.port.postMessage({ freqs: fxFreqs(), beat: fxBeat() }); }
// what its details say: the effect's own sentence
const fxText = () => (FX_TYPES[P['fx.typ']] || FX_TYPES.netz).i;
