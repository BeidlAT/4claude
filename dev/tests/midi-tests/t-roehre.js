// Verzerrung: Vorstufe, Endstufe, Übertrager, Tonband (owner, 31.10.2026: „hochwertige Röhrensimulationen, auch Richtung
// Vintage … eigener Code, im Myzel-Stil“) – the processor myzel-roehre in the chain, played and measured:
//  1 each type: a sine into Klang – sound (as loud as the input, ±4 dB: the make-up), its harmonic character (Vorstufe and
//    Übertrager even-led, Endstufe and Tonband odd-led), never NaN
//  2 back to Röhre: the shaper again, the processor out of the graph; Anteil 0: the input clean
//  3 Farbe shows only for the four; the processor also runs in an OfflineAudioContext (the Hexenring bakes there)
//                                                          node t-roehre.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({});
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    for (const id of ['rev.mix', 'dly.mix', 'rng.mix', 'pha.mix', 'cho.mix']) M.setParam(id, 0);
    M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 20000);
    const osc = A.ctx.createOscillator(), g = A.ctx.createGain(); osc.frequency.value = 187.5; g.gain.value = 0.08; osc.connect(g).connect(M.stripIn('fin')); osc.start();
    const f = new Float32Array(A.analyser.frequencyBinCount), bin = A.ctx.sampleRate / A.analyser.fftSize;
    const meas = async () => { A.analyser.smoothingTimeConstant = 0; await sl(700); const hs = [0, 0, 0, 0]; for (let n = 0; n < 8; n++) { A.analyser.getFloatFrequencyData(f); for (let k = 1; k <= 3; k++) { const i = Math.round(187.5 * k / bin); hs[k] = Math.max(hs[k] || -999, f[i - 1], f[i], f[i + 1]); } await sl(50); } A.analyser.smoothingTimeConstant = 0.6; return hs.slice(1).map((v) => +v.toFixed(1)); };
    M.setParam('drv.mix', 0); o.dry = await meas();
    M.setParam('drv.mix', 1); M.setParam('drv.amt', 0.6); M.setParam('drv.farbe', 0.5);
    for (const t of ['vorstufe', 'endstufe', 'pult', 'band']) { M.setParam('drv.type', t); o[t] = await meas(); o[t + 'Vt'] = !!A.chains[0].vt && A.chains[0].vtIn; }
    o.farbeShown = !document.querySelector('[data-ww="drv.farbe"]') || !document.querySelector('[data-ww="drv.farbe"]').hidden;
    M.setParam('drv.mix', 0); o.mix0 = await meas(); M.setParam('drv.mix', 1);
    M.setParam('drv.type', 'tube'); await sl(300); o.backS = A.chains[0].gS.gain.value; o.backOut = !A.chains[0].vtIn; o.tube = await meas();
    o.farbeHidden = !document.querySelector('[data-ww="drv.farbe"]') || document.querySelector('[data-ww="drv.farbe"]').hidden;
    osc.stop();
    // offline: the processor in an OfflineAudioContext
    const oc = new OfflineAudioContext(2, 48000, 48000); await M.ensureDSP(oc);
    const n = new AudioWorkletNode(oc, 'myzel-roehre', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { type: 'vorstufe', s: 0.6, f: 0.5, mix: 1 } });
    const so = oc.createOscillator(); so.frequency.value = 220; const sg = oc.createGain(); sg.gain.value = 0.2; so.connect(sg).connect(n).connect(oc.destination); so.start();
    const buf = await oc.startRendering(), d = buf.getChannelData(0); let q = 0, bad = false; for (let i = 24000; i < 48000; i++) { q += d[i] * d[i]; if (!Number.isFinite(d[i])) bad = true; }
    o.off = { rms: +(10 * Math.log10(q / 24000)).toFixed(1), bad };
    M.setParam('drv.amt', 0.12); M.setParam('drv.mix', 0.35);
    return o;
  });
  console.log(JSON.stringify(r));
  const lvl = (h) => h[0] - r.dry[0], d2 = (h) => h[1] - h[0], d3 = (h) => h[2] - h[0];
  for (const t of ['vorstufe', 'endstufe', 'pult', 'band']) ok(r[t + 'Vt'] && Math.abs(lvl(r[t])) < 4, `${t}: its processor in the chain, as loud as the input (${lvl(r[t]).toFixed(1)} dB)`);
  ok(d2(r.vorstufe) > d3(r.vorstufe) && d2(r.vorstufe) > -35, `Vorstufe: the 2nd harmonic leads (${d2(r.vorstufe).toFixed(1)} / ${d3(r.vorstufe).toFixed(1)} dB)`);
  ok(d3(r.endstufe) > d2(r.endstufe) + 10, `Endstufe: odd harmonics (${d2(r.endstufe).toFixed(1)} / ${d3(r.endstufe).toFixed(1)} dB)`);
  ok(d3(r.band) > d2(r.band) + 10, `Tonband: symmetric, odd (${d2(r.band).toFixed(1)} / ${d3(r.band).toFixed(1)} dB)`);
  ok(d2(r.pult) > -60 && d3(r.pult) > -60, `Übertrager: 2nd and 3rd present (${d2(r.pult).toFixed(1)} / ${d3(r.pult).toFixed(1)} dB)`);
  ok(d3(r.mix0) < -60 && d2(r.mix0) < -60, `Anteil 0: the input clean (${d2(r.mix0).toFixed(1)} / ${d3(r.mix0).toFixed(1)} dB)`);
  ok(r.backS > 0.99 && r.backOut, 'back to Röhre: the shaper again, the processor out of the graph');
  ok(r.farbeShown && r.farbeHidden, 'Farbe shows for the four, not for Röhre');
  ok(!r.off.bad && r.off.rms > -30, `in an OfflineAudioContext too (${r.off.rms} dB)`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
