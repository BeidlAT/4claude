// What each always-on part costs at idle: the app's graph built into an OfflineAudioContext (the build's own initAudio,
// the Hexenring's processor and its input node added as at sound start), nothing played, rendered 30 s – the time after
// the first 8 s per second of audio (ms), the median of interleaved rounds – with one part taken out at a time.
//   node attrib.js <slot> [rounds]   env PARAMS='{"…":…}' (a patch), NOHX=1 (without the processor)
// Offline the render runs on the page's own thread and the convolver's tail on it too (live it has a thread of its own),
// so the figures add the convolver's whole work; live per-thread figures come from perf.js.
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const slot = process.argv[2] || 'perfcur-inst', ROUNDS = +(process.argv[3] || 5);
// each part: JS run on the built graph (M, A, ctx) that takes it out of the render
const PARTS = [
  ['(everything)', ''],
  ['echo loop and everything after it (its return cut)', 'A.dlyRet.disconnect()'],
  ['hall convolver (its input cut)', 'A.revPre.disconnect()'],
  ['compressor detector (unpulled)', 'A.cmpRatio.disconnect()'],
  ['field scope analyser', 'A.out.disconnect(A.analyser)'],
  ['shared LFOs (8 stopped: ring, filter, phaser, chorus ×2, pan, wow, flutter)', 'for (const o of [A.rngOsc, A.fltLfo, A.phaLfo, A.choL1, A.choL2, A.panLfo, A.wowLfo, A.flutLfo]) o.stop(); if (M.IDLE && M.IDLE.keeper) M.IDLE.keeper.disconnect()'],
  ['channel strips (12, unpulled)', 'for (const st of M.MIX.list) { for (const n of [st.dry, st.eS, st.hS, st.hxT]) if (n) n.disconnect(); }'],
  ['insert chain (main, unpulled)', 'A.insertOut.disconnect()'],
  ['Hexenring processor + its input node (removed)', 'if (M.HX.node) { M.HX.node.disconnect(); for (const n of [M.A.hxIn0, M.A.driftG]) try { n.disconnect(M.HX.node); } catch (e) {} } if (M.HX.rin) { M.HX.rin.disconnect(); A.masterIn.disconnect(M.HX.rin); }'],
  ['Hexenring strip path (processor out gated off)', 'if (M.HX.g0) { M.HX.g0.gain.value = 0; } else if (M.HX.node) M.HX.node.disconnect(M.stripIn("hxr"))'],
  ['Ruhe engaged (the graph asleep: idleEnter)', 'if (M.idleEnter) M.idleEnter()'],
  ['Ruhe taps plugged in (6 analysers – only in the quiet after a sound: a negative share is their cost)', 'if (M.idleTaps) M.idleTaps(true)'],
];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(b, 'http://127.0.0.1:8790/' + slot + '/index.html', false);
  await page.click('#btnStart'); await page.waitForTimeout(800);
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
  const parts = PARTS.filter((p, i) => !only || only.includes(i));
  const res = parts.map(() => []);
  for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < parts.length; i++) {
    const t = await page.evaluate(async ([js, params, nohx]) => {
      const M = window.__M, dur = 30, W = 8;
      const ctx = await window.__off(44100, dur, JSON.parse(params || '{}'));
      const A = M.A;
      if (!nohx && M.ensureDSP && M.hxNode) { await M.ensureDSP(ctx, true); M.hxNode(); ctx.suspend(0.01).then(() => ctx.resume()); }
      await (new Function('M', 'A', 'ctx', 'return (async () => {' + js + '})()'))(M, A, ctx);
      let t0 = 0; ctx.suspend(W).then(() => { t0 = performance.now(); ctx.resume(); });
      await ctx.startRendering();
      return (performance.now() - t0) / (dur - W);
    }, [parts[i][1], process.env.PARAMS || '', !!process.env.NOHX]);
    res[i].push(t);
  }
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const all = med(res[0]);
  console.log(`== ${slot}: idle graph offline, ms of render per s of audio (median of ${ROUNDS}); the part's share = everything − without it`);
  parts.forEach(([n], i) => { const m = med(res[i]); console.log(m.toFixed(2).padStart(7), i ? ('−' + (all - m).toFixed(2)).padStart(8) : '        ', ' ', n, ' [' + res[i].map((x) => x.toFixed(1)).join(' ') + ']'); });
  if (errors.length) console.log('errors', errors.slice(0, 3));
  await b.close();
})();
