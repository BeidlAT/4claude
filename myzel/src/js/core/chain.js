/* ---------- insert chain ---------- */
// the Vokal's formants at rest (Hz: the centre of the vowel space, between a, e, o) and how far its directions move them
// (cents at ±1: F1 300 … 750 Hz for i/u … a, F2 800 … 2300 Hz for u … i, F3 a little with F2); the wet path's level
const VOK_F = [470, 1350, 2550], VOK_C = [800, 910, 150], VOK_MAKEUP = 3.2;
// a Formen source on the Vokal (live: its ConstantSource; a bake: the recorded line): 'vok' opens the mouth (wet up, dry
// down to 8 %), 'vokO' the jaw (F1), 'vokV' front–back (F2, F3 a little)
function vokConnect(c, k, src) {
  if (!c.vokOn) { c.vokOn = true; for (const b of c.vokF) c.flt.connect(b); }
  if (k === 'vok') { src.connect(c.vokWet.gain); src.connect(G(-0.92)).connect(c.vokDry.gain); }
  else if (k === 'vokO') src.connect(c.vokF[0].detune);
  else if (k === 'vokV') { src.connect(c.vokF[1].detune); src.connect(G(VOK_C[2] / VOK_C[1])).connect(c.vokF[2].detune); }
}
function makeChain() {
  const ctx = A.ctx, c = { in: G(1) };
  // drive: one shaper whose curve already contains the dry/wet blend
  // (owner, 30.10.2026: „Handpan-Kreis immer noch verzerrt“, „Kurzwellenritual von Haus aus verzerrt – der Effekt Verzerrung
  // hat keinen Einfluss“) a WaveShaper clamps what lies beyond ±1 to its curve's ends: everything played into the chain
  // above 0 dBFS was cut off hard here, whatever the drive was set to (measured at this input, played densely: Kurzwelle
  // +5.3 dBFS, 9618 samples cut; Kalimbatraum +1.3; Handpan −3.8 – little room). Now the shaper works DRV_H times lower
  // (its curve spans ±DRV_H, driveCurve) and the level is made up after it: below 0 dBFS the same curve on the same
  // points, above it room up to +19 dB; the Begrenzer at the end catches the peaks
  c.drvPre = G(1 / DRV_H); c.drv = ctx.createWaveShaper(); c.drvOut = G(DRV_H);
  c.in.connect(c.drvPre).connect(c.drv).connect(c.drvOut);
  // ring modulator
  c.rngDry = G(1); c.rngWet = G(0); c.rngVca = G(0); c.rngOut = G(1);
  c.drvOut.connect(c.rngDry).connect(c.rngOut);
  c.drvOut.connect(c.rngVca).connect(c.rngWet).connect(c.rngOut);
  A.rngOsc.connect(c.rngVca.gain);
  // filter + LFO
  c.flt = BQ(P['flt.type'], P['flt.freq'], P['flt.q']);
  A.fltLfoG.connect(c.flt.detune);
  c.rngOut.connect(c.flt);
  // phaser: six swept allpass stages summed with the dry signal (no feedback loop: a loop would need a 128-frame delay = static comb)
  // (25.10.2026, the Touché's Vokal) a mouth after the filter: three formants (F1 opens with the jaw, F2 moves front–back,
  // F3 the singer's ring) in parallel with the dry path. Until the Vokal is first used its formants are not even fed; at
  // rest the wet path is ×0 and the dry ×1 – exactly the chain as before; only Formen · Vokal (and its two directions)
  // open it, glide the formants by detune, and bake into a loop
  c.vokDry = G(1); c.vokWet = G(0); c.vokOut = G(1);
  c.vokF = [[VOK_F[0], 9, 1], [VOK_F[1], 13, 0.7], [VOK_F[2], 16, 0.4]].map(([f, q, g]) => { const b = BQ('bandpass', f, q); b.connect(G(g * VOK_MAKEUP)).connect(c.vokWet); return b; });   // (fed only once the Vokal is first used: vokConnect – until then they cost nothing)
  c.flt.connect(c.vokDry).connect(c.vokOut); c.vokWet.connect(c.vokOut);
  c.phaDry = G(1); c.phaWet = G(0); c.phaOut = G(1);
  c.phaAps = [180, 360, 720, 1440, 2600, 4200].map((f) => BQ('allpass', f, 0.6));
  c.vokOut.connect(c.phaDry).connect(c.phaOut);
  let node = c.vokOut;
  for (const ap of c.phaAps) { node.connect(ap); node = ap; A.phaLfoG.connect(ap.detune); }
  node.connect(c.phaWet).connect(c.phaOut);
  // chorus
  c.choDry = G(1); c.choWet = G(0); c.choOut = G(1);
  c.choD1 = ctx.createDelay(0.1); c.choD1.delayTime.value = 0.014;
  c.choD2 = ctx.createDelay(0.1); c.choD2.delayTime.value = 0.021;
  A.choG1.connect(c.choD1.delayTime); A.choG2.connect(c.choD2.delayTime);
  c.phaOut.connect(c.choDry).connect(c.choOut);
  c.phaOut.connect(c.choD1).connect(PAN(-0.85)).connect(c.choWet);
  c.phaOut.connect(c.choD2).connect(PAN(0.85)).connect(c.choWet);
  c.choWet.connect(c.choOut);
  // auto-pan
  c.apan = PAN(0);
  if (c.apan.pan) A.panLfoG.connect(c.apan.pan);
  c.choOut.connect(c.apan);
  c.out = c.apan;
  A.chains.push(c);
  modChain(c);
  return c;
}
// every chain follows the same settings; a chain built just now takes them at once instead of gliding there
const setNow = (param, v) => { try { param.cancelScheduledValues(0); } catch (e) {} param.value = v; };
const chainsOf = (only) => (only ? [[only, setNow]] : (A.chains || []).map((c) => [c, setP]));

