// Streaming never touches the patch: 10 s of Gestik at 60 Hz (bindings on Formen targets, one learned on a patch
// parameter – redirected –, one on a parameter without counterpart – ignored –, a route of Gestik's own) and a MIDI
// keyboard sending its mod wheel, a knob on a Formen target and its pitch wheel at 60 Hz, with fingers and keys held:
// the patch values stay, the preset keeps its mark, nothing is saved, no toast, no new hall, strings or drive curve –
// while the sound really moves.   node t-gm-stream.js
const { open, ok, close, probes, gestikOn } = require('./gm-h');
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'microKEY Air']] } });
  await probes(page);
  // a preset with its mark, settled (its own save has run)
  await page.evaluate(async () => {
    const M = window.__M;
    M.loadPreset(M.PRESETS.find((p) => p.key) || M.PRESETS[0]);
    await window.__sleep(800);
  });
  await gestikOn(page);
  await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('clutch', 'immer');
    window.__sensor(true, { beta: 45, roll: 0 });
    await window.__sleep(400);
    // Gestik bindings as learned (one old-style on a patch parameter, one on a parameter with no counterpart) and a knob
    M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 0, target: 'mod.flt', mode: 'abs' }, { dev: 'Gestik', ch: -1, type: 'axis', num: 1, target: 'flt.freq', mode: 'abs' },
      { dev: 'Gestik', ch: -1, type: 'axis', num: 1, target: 'rev.size', mode: 'abs' }, { dev: 'Gestik', ch: -1, type: 'axis', num: 4, target: 'kor.dens', mode: 'abs' },
      { dev: 'microKEY Air', ch: -1, type: 'cc', num: 21, target: 'mod.dly', mode: 'abs' }, { dev: 'microKEY Air', ch: -1, type: 'cc', num: 22, target: 'mod.morph', mode: 'abs' });
    M.MAP.v++;
    M.gkRoute('test', { fn: (out) => out.tiltY, target: 'hoehe', opts: { older: 0.5 } });   // no axis named: a learned binding of Neigen ↕ does not mute it
    // held notes: two fingers, a computer key, two keyboard keys
    M.onDown({ pointerId: 31, pt: { x: 0.2, y: 0.4, px: 80, py: 400 } });
    M.onDown({ pointerId: 32, pt: { x: 0.6, y: 0.6, px: 240, py: 300 } });
    window.__send([0x90, 60, 90]); window.__send([0x90, 64, 90]);
  });
  await page.waitForTimeout(300);
  // (the Hexenring's coach mark goes once per device – after a while, storing that it went: gone before, as on any
  // device that has seen it, so the stream's 20-odd seconds measure the stream alone)
  await page.evaluate(() => { if (window.__M.hxCoachDone) window.__M.hxCoachDone(); });
  const before = await page.evaluate(() => {
    const M = window.__M, W = (window.__w = { set: {}, toast: 0, dirty: 0 });
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { W.set[k] = (W.set[k] || 0) + 1; return si.call(this, k, v); };
    new MutationObserver(() => { if (document.querySelector('#toast').classList.contains('show')) W.toast++; }).observe(document.querySelector('#toast'), { attributes: true, attributeFilter: ['class'] });
    return { P: window.__g.patch(), preset: M.UI.preset, ir: M.A.irJob, ks: M.KS_CACHE.frames, drv: M.A.drvKey, chains: M.A.chains.length };
  });
  // 10 s of stream at 60 Hz – 600 steps a frame apart: tilt sweeps and shakes (sensor), mod wheel, a knob, the pitch
  // wheel. (Counted in steps, the motion on the steps' own clock: on this headless machine a 16.7-ms timer takes 40 ms
  // – the page's frames – while a step's own work takes 0.1 ms, so 10 s of wall time held only 240 steps.)
  const seen = await page.evaluate(async () => {
    const M = window.__M, t0 = performance.now(), seen = { flt: 0, hoehe: 0, dly: 0, korD: 0, my: 0, morph: 0, work: 0 };
    let i = 0;
    while (i < 600) {
      const t = i / 60, w0 = performance.now();
      window.__setPose({ beta: 45 + 20 * Math.sin(t * 1.3), roll: 25 * Math.sin(t * 0.9), lin: t % 4 > 3 ? [12 * Math.sin(t * 60), 0, 0] : [0, 0, 0] });
      const c = Math.round(63.5 + 63.5 * Math.sin(t * 2.1));
      window.__send([0xb0, 1, c]); window.__send([0xb0, 21, 127 - c]); window.__send([0xb0, 22, c]); window.__send([0xe0, 0, Math.round(64 + 40 * Math.sin(t * 1.7))]);
      for (const k of ['flt', 'hoehe', 'dly', 'korD', 'morph']) seen[k] = Math.max(seen[k], Math.abs(M.modVal(k)));
      const tt = M.touches.get(31); if (tt && tt.my != null) seen.my = Math.max(seen.my, Math.abs(tt.my - tt.y));
      i++; seen.work += performance.now() - w0;
      await window.__sleep(1000 / 60);
    }
    seen.n = i; seen.wall = (performance.now() - t0) / 1000; seen.work /= i;
    return seen;
  });
  const after = await page.evaluate(() => {
    const M = window.__M;
    return { P: window.__g.patch(), preset: M.UI.preset, ir: M.A.irJob, ks: M.KS_CACHE.frames, drv: M.A.drvKey, chains: M.A.chains.length, w: window.__w, pend: M.MAP.pend.size };
  });
  console.log('INFO ' + seen.n + ' steps in ' + seen.wall.toFixed(1) + ' s of wall time, ' + seen.work.toFixed(2) + ' ms of work a step');
  ok(seen.n >= 600 && seen.flt > 0.3 && seen.hoehe > 0.2 && seen.dly > 0.5 && seen.korD > 0 && seen.morph > 0.5 && seen.my > 0.05, 'the sound moved all the time: Filter ' + seen.flt.toFixed(2) + ', Höhe ' + seen.hoehe.toFixed(2) + ', Echo-Anteil ' + seen.dly.toFixed(2) + ', Körner-Dichte ' + seen.korD.toFixed(2) + ', A/B-Morph ' + seen.morph.toFixed(2) + ', a held finger\'s height ±' + seen.my.toFixed(2) + ' (' + seen.n + ' steps)');
  ok(after.P === before.P, 'the patch values are exactly as before (' + JSON.parse(after.P)['flt.freq'] + ' Hz, rev.size ' + JSON.parse(after.P)['rev.size'] + ')');
  ok(after.preset === before.preset && !!before.preset, 'the preset keeps its mark ("' + after.preset + '")');
  const saves = Object.keys(after.w.set).filter((k) => k !== 'myzel.gestik.v1');
  ok(!saves.length && !after.pend, 'nothing saved, nothing waiting to be written (' + JSON.stringify(after.w.set) + ')');
  ok(after.w.toast === 0, 'no toast');
  ok(after.ir === before.ir && after.ks === before.ks && after.drv === before.drv && after.chains === before.chains, 'no new hall, strings, drive curve or chain (IR jobs ' + after.ir + ', string frames ' + after.ks + ')');
  // all at rest again: the layer empties
  const rest = await page.evaluate(async () => {
    const M = window.__M;
    window.__send([0xb0, 1, 0]); window.__send([0xb0, 21, 0]); window.__send([0xb0, 22, 0]); window.__send([0xe0, 0, 64]);
    window.__send([0x80, 60, 0]); window.__send([0x80, 64, 0]); M.onUp({ pointerId: 31 }); M.onUp({ pointerId: 32 });
    M.gkRoute('test', null);
    window.__M.gkDisable();
    await window.__sleep(300);
    return { n: M.MOD.n, srcs: Object.values(M.MOD.t).map((T) => [...T.s.keys()]).flat(), mx: M.MOD.mx, eg: M.MOD.eg, P: window.__g.patch() };
  });
  ok(rest.n === 0 && !rest.srcs.length && rest.mx === 0 && rest.eg === 1, 'wheels, knob and Gestik at rest: no source left (' + JSON.stringify(rest.srcs) + ')');
  ok(rest.P === before.P, 'and the patch is still the same');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
