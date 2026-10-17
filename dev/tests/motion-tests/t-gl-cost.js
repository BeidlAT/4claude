// What Ladung and Schlafen cost, on a CPU throttled 4×: sensor samples at 60 Hz through the whole path (recogniser,
// clutch, routes, Schlafen's watch, flush) – shaking (Ladung full) and circling (Schwenken full, two notes held) –
// against the same path with Ladung switched off; the Tank's own update while it holds lanes; a Rassel strike against a
// Puls hit of the same sound (a strike is a note: it costs what a note costs); a frame of the field with the Geflecht
// glowing against a calm one. Budget: < 0.1 ms per sensor sample, the Tank < 0.05 ms an update, a strike ≤ 2 × a
// Puls hit, < 0.3 ms per frame.
//   node t-gl-cost.js      (slot gl)
const { open, ok, close, gestikOn } = require('./gl-h');
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(async () => {
    const M = window.__M;
    M.closePanel();
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); M.setParam('l0.eng', 'trp');
    for (let i = 1; i < 4; i++) { M.setParam('l' + i + '.on', false); M.setParam('l' + i + '.puls', 3); }
    M.seqStart();
    window.__sensor(true, { beta: 45, roll: 0 });
    await window.__sleep(300);
    for (let i = 0; i < 2; i++) M.onDown({ pointerId: 60 + i, pt: { x: 0.3 + i * 0.3, y: 0.4, px: 100 + i * 100, py: 400 } });
    await window.__sleep(300);
    window.__sensor(false);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // 40 frames of 10 samples each (sample times run on across runs); half shaking, half circling
  const run = (p) => page.evaluate(async (p) => {
    const M = window.__M;
    for (const k in p) M.gkSet(k, p[k]);
    let tt = Math.max(performance.now(), window.__tt || 0), k = 0;
    const full = [], seen = { lad: 0, glas: 0, tk: 0 }, h0 = M.LAD.hits.length;
    const sample = (circ) => {
      const t = k++ / 60, b = Math.PI / 4;
      const lin = circ ? [2.5 * Math.cos(2 * Math.PI * 1.5 * t), 2.5 * Math.sin(2 * Math.PI * 1.5 * t) * Math.cos(b), -2.5 * Math.sin(2 * Math.PI * 1.5 * t) * Math.sin(b)] : [16 * Math.sin(2 * Math.PI * 5 * t), 0, 0];
      tt += 1000 / 60;
      return { t: tt, g: [lin[0], 9.81 * Math.sin(b) + lin[1], 9.81 * Math.cos(b) + lin[2]], a: lin, r: [1 + Math.sin(t), 2 * Math.cos(t * 3), 0.5] };
    };
    for (let i = 0; i < 80; i++) {
      await new Promise((res) => requestAnimationFrame(res));
      const t0 = performance.now(), circ = i >= 40;
      for (let j = 0; j < 10; j++) { M.GK.feed(sample(circ)); M.modFlush(); }
      if (i % 40 >= 10) full.push((performance.now() - t0) / 10);
      seen.lad = Math.max(seen.lad, M.LAD.lvl); seen.glas = Math.max(seen.glas, M.LAD.glas); seen.tk = Math.max(seen.tk, M.LAD.tk);
    }
    window.__tt = tt;
    const s = full.slice().sort((x, y) => x - y);
    return { mean: s.reduce((x, y) => x + y, 0) / s.length, p95: s[Math.floor(s.length * 0.95)], sum: full.reduce((x, y) => x + y, 0) * 10, strikes: M.LAD.hits.length - h0, seen };
  }, p);
  // alternating blocks (the machine's own noise hits both alike), the median of their means
  const B = { on: [], off: [], d: [] };
  let on = null;
  for (let i = 0; i < 5; i++) {
    const o = (await run({ lad: false, ras: false, tank: false, sw: false })).mean;
    on = await run({ lad: true, ras: false, tank: false, sw: true });
    B.off.push(o); B.on.push(on.mean); B.d.push(on.mean - o);
  }
  const med = (L) => L.slice().sort((a, b) => a - b)[L.length >> 1], off = { mean: med(B.off) };
  on.mean = off.mean + med(B.d);   // the median of the pairs' differences: drift of the machine hits both halves of a pair
  // the Tank's update while it holds three lanes
  const tank = await page.evaluate(() => {
    const M = window.__M; M.gkSet('tank', true); M.LAD.lvl = 1; M.ladTank();
    const held = M.LAD.tk, t0 = performance.now();
    for (let i = 0; i < 500; i++) M.ladTank();
    const ms = (performance.now() - t0) / 500;
    M.gkSet('tank', false); M.LAD.lvl = 0; M.ladTank();
    return { held, ms };
  });
  // a Rassel strike (free timing, a fresh one each time) and a Puls hit of the same sound (Tropfen), median of 40
  const strike = await page.evaluate(async () => {
    const M = window.__M, med = (L) => L.slice().sort((a, b) => a - b)[L.length >> 1], S = [], H = [];
    M.LAD.n = 0;
    M.gkSet('ras', true); M.gkSet('rasS', 'trp'); M.gkSet('rasQ', 'frei');
    for (let i = 0; i < 40; i++) {
      let t0 = performance.now(); M.ladRassel({ type: 'peak', v: 0.7, t: performance.now(), i: 0 }); S.push(performance.now() - t0);
      t0 = performance.now(); M.laneHit(0, 0.8); H.push(performance.now() - t0);
      await window.__sleep(30);
    }
    M.gkSet('ras', false);
    return { s: med(S), h: med(H), n: M.LAD.n };
  });
  // the Geflecht's own drawing in a frame: glowing (Ladung full – hyphae sprouting, the warm ground – and Schwenken's
  // ring); the hyphae it adds are drawn like any others (capped as for fingers)
  const vis = await page.evaluate(() => {
    const M = window.__M, L = [], c = M.fctx;
    M.VIS.lad = 1; M.VIS.glas = 1; M.VIS.zz = false;
    for (let k = 0; k < 9; k++) {   // blocks of 30 frames (the clock is too coarse for one)
      const t0 = performance.now();
      for (let i = 0; i < 30; i++) { M.gkVisFrame(c, M.VIS.w, M.VIS.h, 1 / 60); M.VIS.hy.length = Math.min(M.VIS.hy.length, 100); }
      L.push((performance.now() - t0) / 30);
    }
    M.VIS.gk = false; M.VIS.lad = M.VIS.glas = 0; M.VIS.sv = M.VIS.sa = 1;
    L.sort((x, y) => x - y);
    return { med: L[4], p95: L[8] };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const f = (x) => x.toFixed(3);
  ok(on.seen.lad > 0.8 && on.seen.glas > 0.5, 'while measuring: Ladung ' + f(on.seen.lad) + ', Schwenken ' + f(on.seen.glas));
  ok(on.mean - off.mean < 0.1, 'CPU 4× slower: one sensor sample to the sound ' + f(on.mean) + ' ms with Ladung and Schwenken acting, ' + f(off.mean) + ' ms without – they cost ' + f(on.mean - off.mean) + ' ms a sample');
  ok(tank.held === 3 && tank.ms < 0.05, 'the Tank’s update while it holds ' + tank.held + ' lanes: ' + f(tank.ms) + ' ms');
  ok(strike.n >= 40 && strike.s <= 2 * strike.h + 0.3, 'a Rassel strike is a note (and makes room among its own voices): ' + f(strike.s) + ' ms against ' + f(strike.h) + ' ms for a Puls hit of the same Tropfen');
  ok(vis.med < 0.3, 'the glowing Geflecht’s own drawing: ' + f(vis.med) + ' ms a frame (median of 9 blocks, worst ' + f(vis.p95) + ', 4× throttled)');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
