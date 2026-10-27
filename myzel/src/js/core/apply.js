/* ---------- live parameter application ---------- */
function updDrive(only) {
  if (!A.ctx) return;
  const type = P['drv.type'], amt = P['drv.amt'], mix = P['drv.mix'];
  const key = type + ':' + amt.toFixed(3) + ':' + mix.toFixed(3) + ':' + Q.os + ':' + !!A.lite;
  if (!only && A.drvKey === key) return;
  if (!only) A.drvKey = key;
  const curve = driveCurve(type, amt, mix);
  // the oversampling follows the quality level in every latency mode (owner, 24.10.2026: the full sound, and the 2–4 ms it
  // adds – 2x 128, 4x 192 frames – in „Minimal“ too). Hexenring: a loop recorded before that, in „Minimal“, renders as it
  // was recorded – without (HXW.latOld: its chain record still carries dev.lat)
  const os = mix < 0.001 || type === 'crush' || (HXW.latOld && P['dev.lat'] === 'min') ? 'none' : A.lite ? '2x' : Q.os;
  for (const [c] of chainsOf(only)) {
    c.drv.curve = curve;
    if (c.drv.oversample !== os) c.drv.oversample = os;
  }
  if (!only) hxChainLog();   // Hexenring: the chain's state, written down for a loop's bake
}
function updRing(only) {
  if (!A.ctx) return;
  if (!only) setP(A.rngOsc.frequency, P['rng.freq'], 0.02);
  for (const [c, set] of chainsOf(only)) { set(c.rngDry.gain, 1 - P['rng.mix']); set(c.rngWet.gain, P['rng.mix']); }
  if (!only) hxChainLog();
}
function updFilter(only) {
  if (!A.ctx) return;
  for (const [c, set] of chainsOf(only)) {
    if (c.flt.type !== P['flt.type']) c.flt.type = P['flt.type'];
    set(c.flt.frequency, P['flt.freq'], 0.03); set(c.flt.Q, P['flt.q'], 0.03);
  }
  if (!only) { setP(A.fltLfo.frequency, P['flt.lfoRate']); setP(A.fltLfoG.gain, P['flt.lfoDepth'] * 1200); hxChainLog(); }
}
function updPhaser(only) {
  if (!A.ctx) return;
  const mix = P['pha.mix'], q = 0.5 + P['pha.fb'] * 10;
  if (!only) { setP(A.phaLfo.frequency, P['pha.rate']); setP(A.phaLfoG.gain, P['pha.depth'] * 2400); }
  for (const [c, set] of chainsOf(only)) {
    for (const ap of c.phaAps) set(ap.Q, q, 0.05);
    set(c.phaDry.gain, 1 - mix * 0.5); set(c.phaWet.gain, mix * 0.5);
  }
  if (!only) hxChainLog();
}
function updChorus(only) {
  if (!A.ctx) return;
  if (!only) {
    setP(A.choL1.frequency, P['cho.rate']); setP(A.choL2.frequency, P['cho.rate'] * 1.13);
    setP(A.choG1.gain, P['cho.depth'] * 0.0045); setP(A.choG2.gain, P['cho.depth'] * 0.0045);
  }
  for (const [c, set] of chainsOf(only)) { set(c.choDry.gain, 1 - P['cho.mix'] * 0.4); set(c.choWet.gain, P['cho.mix'] * 0.7); }
  if (!only) hxChainLog();
}
function dlyTime() {
  const t = P['dly.sync'] ? divBeats(P['dly.div']) * 60 / seqBpm() : P['dly.ms'] / 1000;
  return clamp(t, 0.01, 3.9);
}
function updDelay() {
  if (!A.ctx || A.flushing) return;
  const t = dlyTime();
  setP(A.dL.delayTime, t, 0.09); setP(A.dR.delayTime, t, 0.09);
  // frozen: each channel loops on itself at unity gain, so the held sound neither fades nor loses its stereo image
  const pp = A.frozen ? 0 : P['dly.pp'], fb = A.frozen ? 1 : P['dly.fb'];
  setP(A.dStrL.gain, fb * (1 - pp)); setP(A.dCrsL.gain, fb * pp);
  setP(A.dStrR.gain, fb * (1 - pp)); setP(A.dCrsR.gain, fb * pp);
  setP(A.dInR.gain, 1 - pp); setP(A.dInRL.gain, pp);
  const tone = A.frozen ? 20000 : P['dly.tone'];
  setP(A.dToneL.frequency, tone); setP(A.dToneR.frequency, tone);
  setP(A.dHpL.frequency, A.frozen ? 20 : 90); setP(A.dHpR.frequency, A.frozen ? 20 : 90);
  setP(A.wowG.gain, P['dly.wow'] * 0.004); setP(A.flutG.gain, P['dly.wow'] * 0.0006);
  setP(A.dlySend.gain, P['dly.mix']);
  setP(A.dlyIn.gain, A.frozen ? 0 : 1, 0.02);
  if (HXR.u) hxrApply(false, true);   // (the loops' echo: its sync time follows the tempo)
}
function updReverbMix() {
  if (!A.ctx) return;
  setP(A.revSend.gain, P['rev.mix']); setP(A.revPre.delayTime, P['rev.pre'], 0.05);
}
function regenIR(now) {
  if (!A.ctx || HXW.on) return;   // (Hexenring: the Werk-Rahmen renders without the hall)
  if (HXR.u) hxrApply(false, true);   // (the loops' hall: again only when the level's channels changed)
  clearTimeout(A.irTimer);
  A.irTimer = setTimeout(() => {
    const job = ++A.irJob;
    // level 3: four channels = "true stereo" (each side also reverberates into the other)
    const nch = Q.rich ? 4 : 2;
    A.revWant = nch;
    dspJob('ir', [P['rev.size'], P['rev.damp'], SR, nch, P['rev.raum']]).then((ch) => {
      if (job !== A.irJob || !A.ctx) return;   // a newer request superseded this one
      const conv = A.ctx.createConvolver();
      conv.buffer = toBuffer(ch);
      const g = G(0);
      A.revPre.connect(conv).connect(g).connect(A.revRet);
      const t = A.ctx.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(nch === 4 ? IR4_GAIN : 1, t + 0.25);
      const old = A.revActive;
      if (old) {
        holdParam(old.g.gain, t); old.g.gain.linearRampToValueAtTime(0, t + 0.25);
        setTimeout(() => { try { A.revPre.disconnect(old.conv); old.conv.disconnect(); old.g.disconnect(); } catch (e) {} }, 600);
      }
      A.revActive = { conv, g };
    });
  }, now ? 0 : 250);
}
function updMove() {
  if (!A.ctx) return;
  setP(A.vibLfo.frequency, P['mov.vibRate']); setP(A.vibG.gain, P['mov.vib']);
  setP(A.driftSrc.playbackRate, P['mov.driftRate'] / 4, 0.1); setP(A.driftG.gain, P['mov.drift']);
  setP(A.panLfo.frequency, P['mov.panRate']); setP(A.panLfoG.gain, P['mov.pan']);
  hxChainLog();
}
function updMaster() {
  if (!A.ctx) return;
  setP(A.lowSh.gain, mp('mst.low')); setP(A.highSh.gain, mp('mst.high'));
  const c = mp('mst.comp');
  const thr = dbToGain(-6 - c * 30), ratio = 1.5 + c * 6;
  setP(A.cmpThr.gain, 4 * CMP_DET / thr / CMP_SPAN, 0.05); setP(A.cmpRatio.gain, 1 - 1 / ratio, 0.05);
  setP(A.masterVol.gain, SLP.mg === 1 ? dbToGain(mp('mst.vol')) : 0, 0.03);   // Schlafen · Stille
  updMasterWidth();
}
function applyAll(firstIR) {
  if (!A.ctx) return;
  A.drvKey = null;
  updDrive(); updRing(); updFilter(); updPhaser(); updChorus(); updDelay(); updReverbMix(); updMove(); updMaster();
  updMix(!!firstIR);
  regenIR(!!firstIR);
  updBordun();
}

