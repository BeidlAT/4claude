/* ---------- insert chain ---------- */
function makeChain() {
  const ctx = A.ctx, c = { in: G(1) };
  // drive: one shaper whose curve already contains the dry/wet blend
  c.drv = ctx.createWaveShaper();
  c.in.connect(c.drv);
  // ring modulator
  c.rngDry = G(1); c.rngWet = G(0); c.rngVca = G(0); c.rngOut = G(1);
  c.drv.connect(c.rngDry).connect(c.rngOut);
  c.drv.connect(c.rngVca).connect(c.rngWet).connect(c.rngOut);
  A.rngOsc.connect(c.rngVca.gain);
  // filter + LFO
  c.flt = BQ(P['flt.type'], P['flt.freq'], P['flt.q']);
  A.fltLfoG.connect(c.flt.detune);
  c.rngOut.connect(c.flt);
  // phaser: six swept allpass stages summed with the dry signal (no feedback loop: a loop would need a 128-frame delay = static comb)
  c.phaDry = G(1); c.phaWet = G(0); c.phaOut = G(1);
  c.phaAps = [180, 360, 720, 1440, 2600, 4200].map((f) => BQ('allpass', f, 0.6));
  c.flt.connect(c.phaDry).connect(c.phaOut);
  let node = c.flt;
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

