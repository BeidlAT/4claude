// What Sporenregen costs on a weak phone (CPU throttled 4×, slot gs; node t-gs-cost.js): the scheduler's part at its
// worst (24 Keime, 16 spores, steep: every 25 ms tick simulates 5 steps and predicts the hits), the picture of a frame
// (Keime, spores, the Geflecht's spores following the slope), and the frames of the running app with the rain against
// without. Budget: < 0.5 ms a tick, < 0.3 ms of drawing a frame, the frame rate as without.
const { open, ok, close, rain } = require('./gs-h');
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { seed: 21 } });
  await page.evaluate(() => { const M = window.__M; for (const [k, v] of [['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['v.eng', 'neb'], ['v.layer', 'off'], ['seq.bpm', 96]]) M.setParam(k, v); M.seqStart(); });
  const fps = (ms) => page.evaluate(async (ms) => {
    const L = [];
    let last = 0;
    await new Promise((res) => { const t0 = performance.now(); const f = (ts) => { if (last) L.push(ts - last); last = ts; if (ts - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    L.sort((a, b) => a - b);
    return { med: L[L.length >> 1], p95: L[Math.floor(L.length * 0.95)], n: L.length, o20: L.filter((x) => x > 20).length / L.length };
  }, ms);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const base = await fps(4000);
  // for comparison: the Puls striking about as often as the rain will (four lanes of Tropfen, ≈ 12 a second)
  await page.evaluate(() => { const M = window.__M; for (let i = 0; i < 4; i++) for (const [k, v] of [['on', true], ['eng', 'trp'], ['div', '0.25'], ['steps', 8], ['puls', 3], ['prob', 1]]) M.setParam('l' + i + '.' + k, v); M.setParam('seq.bpm', 120); });
  await page.waitForTimeout(1000);
  const puls = await fps(4000);
  await page.evaluate(() => { const M = window.__M; for (let i = 0; i < 4; i++) M.setParam('l' + i + '.on', false); M.setParam('seq.bpm', 96); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await rain(page, { rgN: 16, rgZ: 0, rgO: 0.5, rgK: 8 });
  await page.evaluate(async () => {
    const M = window.__M;
    for (let i = 0; i < 24; i++) { const x = 0.04 + (i % 8) * 0.12, y = 0.2 + Math.floor(i / 8) * 0.3; window.__key(x, y, 'k' + i); window.__up('k' + i); }
    window.__tilt(0.9, 0.3);
    await window.__sleep(500);
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(2000);   // under way (the first seconds compile the rain's code)
  const withRain = await fps(4000);
  const r = await page.evaluate(async () => {
    const M = window.__M, med = (L) => L.slice().sort((a, b) => a - b)[L.length >> 1];
    const k = M.RG.k.length, sp = M.RG.sp.length, n0 = M.RG.n;
    // the scheduler's part: a tick of 25 ms (5 steps), as the clock calls it
    const T = [];
    for (let b = 0; b < 15; b++) {
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) { const h = M.A.ctx.currentTime + 0.12; M.RG.t = h - 0.025; M.rgTick(h); }
      T.push((performance.now() - t0) / 20);
      await window.__sleep(30);
    }
    // the picture: the rain's own drawing and the Geflecht's spores following the slope, once in each of 240 frames
    // (as the app draws it – a batch drawn at once would measure the canvas's backlog, not the drawing)
    const V = [], c = M.fctx;
    await new Promise((res) => {
      let i = 0;
      const f = () => { const t0 = performance.now(); M.rgVisFrame(c, M.VIS.w, M.VIS.h); for (const s of M.VIS.spores) M.rgSpore(s); V.push(performance.now() - t0); if (++i < 240) requestAnimationFrame(f); else res(); };
      requestAnimationFrame(f);
    });
    V.sort((a, b) => a - b);
    return { k, sp, tick: med(T), tickW: Math.max(...T), vis: V[V.length >> 1], visW: V[Math.floor(V.length * 0.95)], struck: M.RG.n - n0 };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const f = (x) => x.toFixed(3);
  ok(r.k === 24 && r.sp === 16, 'the worst case: 24 Keime, 16 spores, steep');
  ok(r.tick < 0.5, 'CPU 4× slower: the scheduler\'s part ' + f(r.tick) + ' ms a tick (worst block ' + f(r.tickW) + ' ms, < 0.5 ms; a tick every 25 ms)');
  ok(r.vis < 0.3, 'the rain\'s drawing: ' + f(r.vis) + ' ms a frame (median of 240 frames; 95 %: ' + f(r.visW) + ' ms; < 0.3 ms)');
  // (p95 of frames swings with whatever else the machine does; the share of slow frames (> 20 ms) against the same
  // comparisons is the steadier measure – either passing is a pass)
  const slow = withRain.o20 <= Math.max(base.o20, puls.o20) + 0.05;
  ok(withRain.med <= base.med * 1.15 + 1 && (withRain.p95 <= Math.max(base.p95, puls.p95) + 1 || slow), 'the frames of the running app: ' + f(withRain.med) + ' ms with the rain, ' + f(base.med) + ' ms without (median; 95 %: ' + f(withRain.p95) + ' / ' + f(base.p95) + ' – the Puls striking as often: ' + f(puls.p95) + '; frames over 20 ms ' + Math.round(withRain.o20 * 100) + ' % / ' + Math.round(base.o20 * 100) + ' % / ' + Math.round(puls.o20 * 100) + ' %)');
  ok(errors.length === 0, 'no errors ' + errors.join(' | '));
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
