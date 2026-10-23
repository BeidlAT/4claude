function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Web Audio fehlt');
  // Android: the smallest ("interactive") buffer is often 192 frames against 128-frame render blocks, which leaves
  // only ~70 % of real time per callback, so Android defaults to "Sicher" ("balanced", ≈20 ms).
  // "Minimal" asks for the smallest buffer the system allows (often 128 frames instead of 10 ms); iOS ignores the hint.
  const L = P['dev.lat'] === 'min' ? 0 : P['dev.lat'] === 'safe' ? 'balanced' : 'interactive';
  let ctx = HXW.ctx;   // Hexenring: the Werk-Rahmen builds the graph into its offline context
  if (!ctx) try { ctx = new AC({ latencyHint: L }); } catch (e) { ctx = new AC({ latencyHint: 'interactive' }); }
  A.ctx = ctx; SR = ctx.sampleRate; A.latMode = P['dev.lat'];
  tgReset();   // Hexenring: the Taktgeber starts with this context's clock

  // shared buffers & waves
  A.noise = ctx.createBuffer(1, Math.floor(SR * 2), SR);
  { const d = A.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  A.waves = {};
  {
    const n = 24, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = k % 2 ? 1 / Math.pow(k, 1.5) : 0.08 / k;
    A.waves.glass = ctx.createPeriodicWave(re, im);
    const re2 = new Float32Array(n), im2 = new Float32Array(n);
    [[1, 1], [2, 0.7], [3, 0.5], [4, 0.35], [6, 0.25], [8, 0.2], [10, 0.08]].forEach(([k, a]) => (im2[k] = a));
    A.waves.organ = ctx.createPeriodicWave(re2, im2);
  }
  A.driftBuf = ctx.createBuffer(1, Math.floor(SR * 8), SR);
  {
    const d = A.driftBuf.getChannelData(0), pts = 32, v = [];
    for (let i = 0; i < pts; i++) v.push(Math.random() * 2 - 1);
    v.push(v[0]);
    const seg = d.length / pts;
    for (let i = 0; i < d.length; i++) {
      const p = i / seg, k = Math.floor(p), f = p - k, m = (1 - Math.cos(f * Math.PI)) / 2;
      d[i] = v[k] * (1 - m) + v[k + 1] * m;
    }
  }

  // ---- pitch modulation bus (cents) ----
  A.pitchMod = G(1);
  A.vibLfo = OSC('sine', P['mov.vibRate']); A.vibG = G(P['mov.vib']); A.vibLfo.connect(A.vibG).connect(A.pitchMod);
  A.driftSrc = ctx.createBufferSource(); A.driftSrc.buffer = A.driftBuf; A.driftSrc.loop = true;
  A.driftG = G(P['mov.drift']); A.driftSrc.connect(A.driftG).connect(A.pitchMod);
  // MIDI pitch wheel (cents) on top, only for voices played from a keyboard
  A.notePitch = G(1); A.pitchMod.connect(A.notePitch);
  A.bendSrc = ctx.createConstantSource ? ctx.createConstantSource() : null;
  if (A.bendSrc) { A.bendSrc.offset.value = 0; A.bendSrc.connect(A.notePitch); }
  // level 3: four slow, independent wanderings (cents) so unison oscillators drift apart like separate players
  A.uniLfo = [0.11, 0.17, 0.23, 0.31].map((r) => OSC('sine', r));
  A.uni = A.uniLfo.map((o) => { const g = G(3.5); o.connect(g); return g; });

  // ---- insert chain: drive → ring → filter → phaser → chorus → auto-pan ----
  // The modulators are shared, so a copy of the chain (built when channels send different amounts, see updSends)
  // moves in lockstep with the one everything plays through.
  A.rngOsc = OSC('sine', P['rng.freq']);
  A.fltLfo = OSC('sine', P['flt.lfoRate']); A.fltLfoG = G(0); A.fltLfo.connect(A.fltLfoG);
  A.phaLfo = OSC('sine', P['pha.rate']); A.phaLfoG = G(0); A.phaLfo.connect(A.phaLfoG);
  A.choL1 = OSC('sine', P['cho.rate']); A.choL2 = OSC('sine', P['cho.rate'] * 1.13);
  A.choG1 = G(0); A.choG2 = G(0); A.choL1.connect(A.choG1); A.choL2.connect(A.choG2);
  A.panLfo = OSC('sine', P['mov.panRate']); A.panLfoG = G(0); A.panLfo.connect(A.panLfoG);
  A.chains = [];
  const fx = makeChain();
  A.voiceBus = fx.in; A.insertOut = fx.out; A.drvShaper = fx.drv;

  // ---- sends ----
  A.masterSum = G(1);
  A.insertOut.connect(A.masterSum);
  // delay (stereo ping-pong tape). Loop gain = feedback exactly: unity-slope saturator, non-resonant filters.
  A.dlySend = G(0); A.dlyIn = G(1);
  A.dlySend.connect(A.dlyIn);
  // channel strips (Mischpult): every sound layer has its own before it joins the insert chain
  buildStrips();
  hxGraph();   // Hexenring: the Gespielt taps
  const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
  A.dlyIn.connect(split);
  A.dSumL = G(1); A.dSumR = G(1);
  A.dInR = G(1); A.dInRL = G(0);
  split.connect(A.dSumL, 0); split.connect(A.dInR, 1); split.connect(A.dInRL, 1);
  A.dInR.connect(A.dSumR); A.dInRL.connect(A.dSumL);
  A.dL = ctx.createDelay(4); A.dR = ctx.createDelay(4);
  // lowpass/highpass Q is in dB: −3 dB gives a Butterworth response without a resonant bump
  A.dToneL = BQ('lowpass', P['dly.tone'], -3); A.dToneR = BQ('lowpass', P['dly.tone'], -3);
  A.dHpL = BQ('highpass', 90, -3); A.dHpR = BQ('highpass', 90, -3);
  const sat = makeShaperCurve((x) => Math.tanh(x * 1.5) / 1.5, 2048);
  A.dSatL = ctx.createWaveShaper(); A.dSatL.curve = sat;
  A.dSatR = ctx.createWaveShaper(); A.dSatR.curve = sat;
  A.dStrL = G(0); A.dCrsL = G(0); A.dStrR = G(0); A.dCrsR = G(0);
  A.dSumL.connect(A.dL).connect(A.dToneL).connect(A.dHpL).connect(A.dSatL);
  A.dSumR.connect(A.dR).connect(A.dToneR).connect(A.dHpR).connect(A.dSatR);
  A.dSatL.connect(A.dStrL).connect(A.dSumL); A.dSatL.connect(A.dCrsL).connect(A.dSumR);
  A.dSatR.connect(A.dStrR).connect(A.dSumR); A.dSatR.connect(A.dCrsR).connect(A.dSumL);
  A.dSatL.connect(merge, 0, 0); A.dSatR.connect(merge, 0, 1);
  A.dlyRet = G(1); merge.connect(A.dlyRet).connect(MIX.s.dly.in);
  A.wowLfo = OSC('sine', 0.55); A.flutLfo = OSC('sine', 6.3); A.wowG = G(0); A.flutG = G(0);
  A.wowLfo.connect(A.wowG); A.flutLfo.connect(A.flutG);
  for (const g of [A.wowG, A.flutG]) { g.connect(A.dL.delayTime); g.connect(A.dR.delayTime); }
  // reverb
  A.revSend = G(0); A.revIn = G(1); A.revPre = ctx.createDelay(1); A.revRet = G(1.25);
  A.revSend.connect(A.revIn);
  A.revIn.connect(A.revPre);
  A.revRet.connect(MIX.s.rev.in);
  // what the insert chain sends to echo and hall; a copy of the chain takes over when channels send different amounts
  A.send = {};
  for (const [k, target] of [['dly', A.dlySend], ['rev', A.revSend]]) {
    const fromFx = G(1); A.insertOut.connect(fromFx).connect(target);
    A.send[k] = { target, fromFx, fromCopy: null, copy: null, mode: 'fx' };
  }
  // the echo return feeds the hall (its "Hall" send, 0.3 at 100 %)
  MIX.s.dly.hS.connect(A.revIn);

  // ---- master: EQ → level → glue compressor → soft saturating ceiling, all without look-ahead latency ----
  A.lowSh = BQ('lowshelf', 120); A.highSh = BQ('highshelf', 6500);
  A.masterVol = G(dbToGain(P['mst.vol']));
  // Glue compressor from native nodes, without look-ahead (the browser's DynamicsCompressor delays everything by 6 ms).
  // Detector: mean absolute level of both channels, smoothed fast (≈6 ms, 4th order so bass ripple stays out of the
  // gain) and slow (≈230 ms); the larger one wins, max(a, b) = (a + b + |a − b|) / 2, so attacks are quick and
  // sustained passages release slowly. No makeup gain: quiet passages keep their level.
  A.cmpVca = G(0);
  const shaper = (curve) => { const w = ctx.createWaveShaper(); w.curve = curve; return w; };
  A.cmpDet = G(0.25);                                         // ±4 (+12 dBFS) fits the shaper's ±1 range
  const mono = G(1); mono.channelCount = 1; mono.channelCountMode = 'explicit'; mono.channelInterpretation = 'speakers';
  const fast1 = BQ('lowpass', 28, -3), fast2 = BQ('lowpass', 28, -3);
  // a biquad this slow loses its precision; a one-pole IIR (computed in double precision) does not
  const ap = Math.exp(-1 / (0.23 * SR));
  const slow = ctx.createIIRFilter ? ctx.createIIRFilter([1 - ap], [1, -ap]) : BQ('lowpass', 2.5, -3);
  A.cmpDet.connect(shaper(ABS_CURVE)).connect(mono);
  mono.connect(fast1).connect(fast2); mono.connect(slow);
  const half = G(0.5), diff = G(1), neg = G(-1), halfD = G(0.5);
  fast2.connect(half); slow.connect(half);
  fast2.connect(diff); slow.connect(neg).connect(diff);
  A.cmpThr = G(1); A.cmpRatio = G(0.5);
  half.connect(A.cmpThr); diff.connect(shaper(ABS_CURVE)).connect(halfD).connect(A.cmpThr);
  A.cmpThr.connect(shaper(cmpOverCurve())).connect(A.cmpRatio).connect(shaper(cmpGainCurve())).connect(A.cmpVca.gain);
  A.clipPre = G(0.5);
  A.clip = ctx.createWaveShaper();
  // linear up to −2.5 dBFS, then a tanh knee that never exceeds 0.98 (−0.2 dBFS); inputs up to +6 dBFS stay smooth
  A.clip.curve = makeShaperCurve((u) => {
    const x = 2 * u, ax = Math.abs(x), T = 0.75, C = 0.98;
    const y = ax <= T ? ax : T + (C - T) * Math.tanh((ax - T) / (C - T));
    return Math.sign(x) * y;
  }, 8192);
  A.clip.oversample = 'none';
  A.out = G(1);
  // stereo width of the sum: switched in only while it is not 100 %
  A.mwBy = G(1); A.mwWet = G(0);
  A.masterIn = G(1); A.masterSum.connect(A.masterIn);   // Hexenring: the master's input – the strip „Hexenring“ joins here, behind the „Alles“ tap
  A.masterIn.connect(A.lowSh).connect(A.highSh).connect(A.mwBy).connect(A.masterVol).connect(A.cmpVca).connect(A.clipPre).connect(A.clip).connect(A.out);
  A.mwWet.connect(A.masterVol);
  A.masterVol.connect(A.cmpDet);
  // monitoring only (what you hear, not what is recorded): dim and mono check
  A.monSt = G(1); A.monMo = null;
  A.out.connect(A.monSt).connect(ctx.destination);
  A.analyser = ctx.createAnalyser(); A.analyser.fftSize = 2048; A.analyser.smoothingTimeConstant = 0.6;
  A.out.connect(A.analyser);
  A.scopeBuf = new Float32Array(A.analyser.fftSize);
  idleBuild();   // Ruhe: the keeper and the taps

  // start free-running modulators – live a moment ahead, at a known time (Hexenring: the chain's LFOs and the drift are
  // followed from it, so a loop's bake and its Taumeln know their phase at any moment; offline at 0, as ever)
  A.lfoT0 = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext ? 0 : ctx.currentTime + 0.05;
  for (const o of [A.vibLfo, A.driftSrc, A.rngOsc, A.fltLfo, A.phaLfo, A.choL1, A.choL2, A.panLfo, A.wowLfo, A.flutLfo, ...A.uniLfo]) o.start(A.lfoT0);
  hxPrmInit();
  A.monoChk = A.dim = false;
  if (A.bendSrc) A.bendSrc.start();

  applyAll(true);
  A.started = true;
  dspMaybe();   // a worklet engine is selected (restored patch): its module now, before the first note
}

