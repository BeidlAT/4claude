// Mixer functions, rendered offline on the new build: fader, mute/solo, routing, sends, EQ, width/balance, Pumpen,
// metering/loudness, pitch of the layers, live switching without NaN or clicks.
const { chromium, openInst } = require('./lib');
const URL = 'http://127.0.0.1:8790/' + (process.argv[2] || 'mnew-inst') + '/index.html';
let fails = 0;
const ok = (c, msg, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const X = await openInst(browser, URL);
  await X.page.evaluate(() => {
    // render: base params + lanes driven by the offline clock; scen(M, ctx) may schedule more; returns L/R arrays
    window.__rend = async (params, opts = {}) => {
      const M = window.__M, sr = 48000, dur = opts.dur || 3;
      const base = { 'dev.q': '1', 'dev.lat': 'std', 'mst.vol': -24, 'drv.mix': 0, 'mst.comp': 0, 'dly.mix': 0, 'rev.mix': 0, 'pha.mix': 0, 'cho.mix': 0, 'mov.pan': 0,
        'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false, 'v.human': 0 };
      let x = 4242; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
      const ctx = await window.__off(sr, dur, Object.assign(base, params));
      // one impulse response for all renders (the worker draws a new one each time)
      const ra = M.A.revActive;
      if (!window.__ir) window.__ir = Array.from({ length: ra.conv.buffer.numberOfChannels }, (_, c) => ra.conv.buffer.getChannelData(c).slice());
      else {
        const b = ctx.createBuffer(window.__ir.length, window.__ir[0].length, sr); window.__ir.forEach((d, c) => b.copyToChannel(d, c));
        const conv = ctx.createConvolver(); conv.buffer = b;
        M.A.revPre.disconnect(ra.conv); ra.conv.disconnect(); M.A.revPre.connect(conv).connect(ra.g); ra.conv = conv;
      }
      if (opts.meter) M.meterTaps(true);
      const S = M.SEQ; S.on = true; S.anchorT = 0.05; S.anchorB = 0; S.bpm = M.P['seq.bpm'];
      S.lanes.forEach((L) => { L.n = 0; L.div = 0; L.walk = 0; L.cur = -1; L.last = 0; });
      const probes = [];
      for (let t = 0.0371; t < dur - 0.2; t += opts.step || 0.05) {
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          M.seqTick(ctx.currentTime + 0.07);
          if (opts.at) for (const a of opts.at) if (!a.done && ctx.currentTime >= a[0]) { a.done = 1; a[1](M, ctx); }
          if (opts.probe) probes.push(opts.probe(M, ctx));
          ctx.resume();
        });
      }
      let buf;
      if (opts.touch) buf = await window.__phrase(ctx, sr, dur, opts.touch);
      else buf = await ctx.startRendering();
      S.on = false;
      return { L: Array.from(buf.getChannelData(0)), R: Array.from(buf.getChannelData(1)), probes };
    };
  });
  const db = (a, from = 0, to) => { let s = 0, n = 0; for (let i = Math.floor(from * 48000); i < (to ? to * 48000 : a.length); i++) { s += a[i] * a[i]; n++; } return 10 * Math.log10(s / Math.max(1, n) + 1e-30); };
  const both = (r, from, to) => 10 * Math.log10((Math.pow(10, db(r.L, from, to) / 10) + Math.pow(10, db(r.R, from, to) / 10)) / 2);
  const diffDb = (a, b) => { let s = 0, d = 0; for (const c of ['L', 'R']) for (let i = 0; i < a[c].length; i++) { s += a[c][i] ** 2; d += (a[c][i] - b[c][i]) ** 2; } return 10 * Math.log10(d / (s + 1e-30) + 1e-30); };
  const finite = (r) => r.L.every(Number.isFinite) && r.R.every(Number.isFinite);
  const R = (params, opts = {}) => {
    const o = Object.assign({}, opts);
    if (o.at) o.at = o.at.map(([t, fn]) => [t, fn.toString()]);
    if (o.probe) o.probe = o.probe.toString();
    return X.page.evaluate(([p, o]) => {
      const fn = (src) => new Function('return (' + src + ')')();
      if (o.at) o.at = o.at.map(([t, f]) => [t, fn(f)]);
      if (o.probe) o.probe = fn(o.probe);
      return window.__rend(p, o);
    }, [params, o]);
  };
  const lane = { 'l0.on': true, 'l0.eng': 'glo', 'l0.steps': 4, 'l0.puls': 4, 'l0.div': '0.5', 'l0.prob': 1, 'l0.walk': 0, 'seq.bpm': 120 };

  // 1 fader
  const a0 = await R(lane), a6 = await R(Object.assign({ 'xl0.vol': -6 }, lane));
  ok(Math.abs(both(a6) - both(a0) + 6) < 0.15, 'fader −6 dB lowers the lane by 6 dB', [both(a0).toFixed(2), both(a6).toFixed(2)]);
  const aOff = await R(Object.assign({ 'xl0.vol': -60 }, lane));
  ok(both(aOff) < -150, 'fader at −∞ is silent', both(aOff).toFixed(1));
  const aGrp = await R(Object.assign({ 'mix.pulsVol': -6 }, lane));
  ok(Math.abs(both(aGrp) - both(a0) + 6) < 0.15, 'Puls group −6 dB', both(aGrp).toFixed(2));
  const aGm = await R(Object.assign({ 'mix.pulsMute': true }, lane));
  ok(both(aGm) < -150, 'Puls group mute', both(aGm).toFixed(1));
  // 2 mute / solo
  const am = await R(Object.assign({ 'xl0.mute': true }, lane));
  ok(both(am) < -150, 'mute silences the lane', both(am).toFixed(1));
  const as = await R(Object.assign({ 'xfin.solo': true }, lane));
  ok(both(as) < -150, 'solo on another channel silences the lane', both(as).toFixed(1));
  const as2 = await R(Object.assign({ 'xl0.solo': true, 'xfin.solo': true }, lane));
  ok(diffDb(as2, a0) < -90, 'soloed lane sounds unchanged', diffDb(as2, a0).toFixed(1));
  const rv = Object.assign({ 'rev.mix': 0.5 }, lane);
  const ar = await R(rv), arS = await R(Object.assign({ 'xrev.solo': true }, rv)), arDry = await R(Object.assign({}, lane));
  ok(both(arS) > both(ar) - 20 && both(arS) < both(ar) - 0.5 && diffDb(arS, ar) > -12, 'soloed hall plays only the reverb', [both(ar).toFixed(1), both(arS).toFixed(1)]);
  const arSl = await R(Object.assign({ 'xrev.solo': true, 'xl0.solo': true }, rv));
  ok(diffDb(arSl, ar) < -60, 'soloed hall + soloed lane = lane with its hall', diffDb(arSl, ar).toFixed(1));
  const arSr = await R(Object.assign({ 'xl0.solo': true }, rv));
  ok(diffDb(arSr, ar) < -60, 'a soloed channel keeps its hall (returns are solo-safe)', diffDb(arSr, ar).toFixed(1));
  // 3 routing
  const drvA = await R(Object.assign({ 'xl0.route': 'dir', 'drv.mix': 1, 'drv.amt': 0.8, 'flt.freq': 300 }, lane));
  const drvB = await R(Object.assign({ 'xl0.route': 'dir', 'drv.mix': 0, 'flt.freq': 18000 }, lane));
  ok(diffDb(drvA, drvB) < -90, '"Direkt" bypasses the insert chain', diffDb(drvA, drvB).toFixed(1));
  const drvC = await R(Object.assign({ 'drv.mix': 1, 'drv.amt': 0.8, 'flt.freq': 300 }, lane));
  ok(diffDb(drvC, drvB) > -20, 'through the chain the drive and filter act', diffDb(drvC, drvB).toFixed(1));
  // 4 sends
  const ec = Object.assign({ 'dly.mix': 0.5, 'dly.fb': 0, 'seq.bpm': 120 }, lane, { 'l0.vol': 0.12 });
  const e1 = await R(ec), e0 = await R(Object.assign({ 'xl0.dly': 0 }, ec)), eNo = await R(Object.assign({}, lane, { 'l0.vol': 0.12, 'dly.mix': 0 }));
  ok(diffDb(e0, eNo) < -80, 'echo send 0 % = no echo for that lane', diffDb(e0, eNo).toFixed(1));
  const e2 = await R(Object.assign({ 'xl0.dly': 2 }, ec));
  const sub = (a, b) => ({ L: a.L.map((x, i) => x - b.L[i]), R: a.R.map((x, i) => x - b.R[i]) });
  const w1 = both(sub(e1, eNo)), w2 = both(sub(e2, eNo));
  ok(Math.abs(w2 - w1 - 6) < 1, 'echo send 200 % doubles the echo', [w1.toFixed(2), w2.toFixed(2)]);
  const eDir0 = await R(Object.assign({ 'xl0.dly': 0, 'xl0.route': 'dir' }, ec)), eDirNo = await R(Object.assign({ 'xl0.route': 'dir' }, lane, { 'l0.vol': 0.12, 'dly.mix': 0 }));
  ok(diffDb(eDir0, eDirNo) < -80, 'direct channel with send 0 % has no echo', diffDb(eDir0, eDirNo).toFixed(1));
  // 5 EQ / low cut
  const sub0 = Object.assign({}, lane, { 'l0.eng': 'tie', 'l0.oct': -1 });
  const t0 = await R(sub0), t1 = await R(Object.assign({ 'xl0.lc': 400 }, sub0));
  ok(both(t1) < both(t0) - 12, 'low cut 400 Hz removes the sub bass', [both(t0).toFixed(1), both(t1).toFixed(1)]);
  const h0 = await R(Object.assign({ 'xl0.lo': 12 }, lane));
  ok(both(h0) > both(a0) + 3, 'bass +12 dB lifts the bell\'s fundamental', [both(a0).toFixed(1), both(h0).toFixed(1)]);
  const sat = await R(Object.assign({ 'xl0.sat': 1 }, lane));
  ok(finite(sat) && Math.abs(both(sat) - both(a0)) < 6, 'saturation stays within 6 dB', both(sat).toFixed(1));
  // 6 width / balance (direct, so the chorus and auto-pan of the chain don't add stereo)
  const m0 = await R(Object.assign({ 'xl0.wid': 0, 'xl0.route': 'dir', 'l0.pan': -0.8 }, lane));
  let mx = 0; for (let i = 0; i < m0.L.length; i++) mx = Math.max(mx, Math.abs(m0.L[i] - m0.R[i]));
  ok(mx < 1e-6 && both(m0) > -60, 'width 0 % = mono', mx);
  const pL = await R(Object.assign({ 'xl0.pan': -1, 'xl0.route': 'dir' }, lane));
  ok(db(pL.R) < -100 && db(pL.L) > -60, 'balance fully left', [db(pL.L).toFixed(1), db(pL.R).toFixed(1)]);
  // 7 Pumpen: a held Nebel on the finger channel, ducked by lane 1
  const duck = await R(Object.assign({}, lane, { 'l0.eng': 'mem', 'xfin.duck': 1, 'mix.duckRel': 0.5 }), {
    at: [[0.3, (M, ctx) => { M.playNote('neb', ctx.currentTime, 220, 0.5, 0.8, {}); }]],
    probe: (M, ctx) => [ctx.currentTime, M.MIX.s.fin.duck.gain.value], step: 0.005,
  });
  const gs = duck.probes.map((p) => p[1]);
  ok(Math.min(...gs) < 0.2 && Math.max(...gs) > 0.9, 'Pumpen pulls the finger channel down on every hit and lets it return', [Math.min(...gs).toFixed(3), Math.max(...gs).toFixed(3)]);
  // 8 meters and loudness: a −20 dBFS 1 kHz sine straight into the output
  const met = await X.page.evaluate(async () => {
    const M = window.__M, sr = 48000, dur = 4;
    const ctx = await window.__off(sr, dur, { 'dev.q': '1', 'dev.lat': 'std' });
    M.meterTaps(true);
    const o = ctx.createOscillator(); o.frequency.value = 997; const g = ctx.createGain(); g.gain.value = 0.1; o.connect(g).connect(M.A.out); o.start(0);
    const res = [];
    for (let t = 0.1; t < dur - 0.1; t += 0.02) ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.mixMeters(0.02); res.push([ctx.currentTime, M.A.mm.pk[0], M.A.mm.rms[0], M.A.lufs.m, M.A.lufs.s, M.A.lufs.i, M.A.lufs.corr]); ctx.resume(); });
    await ctx.startRendering();
    return res[res.length - 1];
  });
  ok(Math.abs(20 * Math.log10(met[1]) + 20) < 0.3 && Math.abs(10 * Math.log10(met[2]) + 23) < 0.5, 'master peak −20 dBFS, RMS −23 dB', met.slice(1, 3).map((x) => x.toFixed(4)));
  // BS.1770: a 997 Hz sine at −20 dBFS in both channels reads about −20 + 0.7 (K-weighting gain at 1 kHz) − 3 + 3 (two channels)
  ok(Math.abs(met[3] + 20.0) < 1.2 && Math.abs(met[4] - met[3]) < 0.5 && Math.abs(met[5] - met[3]) < 0.5, 'loudness ≈ −20 LUFS (momentary, short-term, integrated)', met.slice(3, 6).map((x) => +x.toFixed(2)));
  ok(met[6] > 0.98, 'correlation +1 for a mono signal', met[6]);
  const lm = await X.page.evaluate(async () => {
    const M = window.__M, sr = 48000, dur = 2;
    const ctx = await window.__off(sr, dur, { 'dev.q': '1', 'dev.lat': 'std', 'l0.on': true, 'l0.eng': 'mem', 'l0.puls': 8, 'l0.steps': 8, 'l0.prob': 1, 'seq.bpm': 120 });
    M.meterTaps(true);
    const S = M.SEQ; S.on = true; S.anchorT = 0.05; S.anchorB = 0; S.bpm = 120; S.lanes.forEach((L) => { L.n = 0; L.div = 0; L.walk = 0; L.last = 0; });
    let out = null;
    for (let t = 0.05; t < dur - 0.2; t += 0.05) ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.seqTick(ctx.currentTime + 0.07); M.mixMeters(0.05); out = Object.fromEntries(M.MIX.list.map((st) => [st.k, +Math.max(st.m.pk[0], st.m.pk[1]).toFixed(4)])); ctx.resume(); });
    await ctx.startRendering(); S.on = false;
    return out;
  });
  ok(lm.l0 > 0.01 && lm.fin === 0 && lm.bor === 0, 'strip meters: lane 1 moves, the others stay at zero', lm);
  // 9 pitch of the layers
  const pit = await X.page.evaluate(() => {
    const M = window.__M; M.P['t.scale'] = 'mpent'; M.buildNotes();
    const n = M.noteAt(0.3);
    const f = (deg, ratio = 1) => M.lyF({ deg, ratio }, n.f, n.idx) / n.f;
    return { oct: f(0, 2), d5: f(5), dm5: f(-5), d1: f(1), d2: f(2) };
  });
  ok(Math.abs(pit.oct - 2) < 1e-9 && Math.abs(pit.d5 - 2) < 1e-6 && Math.abs(pit.dm5 - 0.5) < 1e-6 && pit.d1 > 1.05 && pit.d2 > pit.d1, 'Tonstufe moves by scale steps (5 steps = one octave in pentatonic), Oktave doubles', pit);
  const lay = await X.page.evaluate(() => { const M = window.__M; Object.assign(M.P, { 'v.oct': -1, 'v.deg': 2, 'v.layer': 'glo', 'v.layerDeg': 1, 'v.layerInt': 0 }); const ls = M.layers(); Object.assign(M.P, { 'v.oct': 0, 'v.deg': 0, 'v.layer': 'off', 'v.layerDeg': 0, 'v.layerInt': 12 }); return ls.map((l) => [l.ratio, l.deg]); });
  ok(JSON.stringify(lay) === '[[0.5,2],[1,1]]', 'layers carry octave and step of each layer', lay);
  // 10 live switching: EQ, matrix, route, sends and solo while playing – finite, no jumps
  const sw = await R(Object.assign({ 'dly.mix': 0.4, 'rev.mix': 0.3 }, lane), {
    dur: 4, touch: { step: 0.4, hold: 0.6 },
    at: [
      [0.5, (M) => { M.P['xl0.lo'] = 6; M.P['xfin.pan'] = -0.5; M.P['xfin.dly'] = 0.5; M.updMix(); }],
      [1.0, (M) => { M.P['xl0.route'] = 'dir'; M.P['xl0.wid'] = 0; M.updMix(); }],
      [1.5, (M) => { M.P['xl0.lo'] = 0; M.P['xfin.pan'] = 0; M.P['xfin.dly'] = 1; M.updMix(); }],
      [2.0, (M) => { M.P['xl0.route'] = 'fx'; M.P['xl0.wid'] = 1; M.P['xl0.solo'] = true; M.updMix(); }],
      [2.5, (M) => { M.P['xl0.solo'] = false; M.P['xrev.solo'] = true; M.updMix(); }],
      [3.0, (M) => { M.P['xrev.solo'] = false; M.updMix(); }],
    ],
  });
  let jump = 0; for (const c of ['L', 'R']) for (let i = 1; i < sw[c].length; i++) jump = Math.max(jump, Math.abs(sw[c][i] - sw[c][i - 1]));
  ok(finite(sw) && jump < 0.25, 'switching blocks, routes, sends and solo while playing: finite, no jumps', jump.toFixed(3));
  ok(!X.errors.length, 'no errors', X.errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close();
})();
