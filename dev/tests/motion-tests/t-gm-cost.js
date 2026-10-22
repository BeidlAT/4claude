// What the mod layer costs per frame, on a CPU throttled 4× (Chrome DevTools' CPU throttling): 4 fingers held, Gestik
// streaming at 60 Hz with Höhe (newest full, older half), Tonhöhe pro Finger, Filter, Panorama, Ausdruck and
// Körner-Dichte all moving every frame. Measured per animation frame: the sources set (as Gestik's routes and bindings
// do) plus the flush (audio ramps, setY on every held voice, the finger buses). Budget: < 0.2 ms (mean) per frame.
// For information: the whole path from one sensor sample to the sound (recogniser, clutch, bindings, routes, flush).
//   node t-gm-cost.js
const { open, ok, close, gestikOn } = require('./gm-h');
// the reference: the build the budgets were set on (fae609a, the Gestik stages complete; run-all.sh builds slot gmref),
// measured in turns with this one – on a machine where that build itself measures over the budget (this headless one:
// Stimme 0.35–0.43 ms against 0.4), the row asks that this build is no dearer than it (+ 10 %)
const URL_REF = process.env.GMREF || 'http://127.0.0.1:8790/gmref-inst/index.html';
async function measure(eng, url) {
  const { page, errors } = await open(Object.assign({ mobile: true, cfg: { perm: 'granted' } }, url ? { url } : {}));
  await gestikOn(page);
  await page.evaluate(async (eng) => {
    const M = window.__M;
    M.closePanel();
    M.setParam('v.eng', eng); M.setParam('v.layer', 'off');
    M.gkSet('clutch', 'immer');
    window.__sensor(true, { beta: 45, roll: 0 });
    await window.__sleep(300);
    for (let i = 0; i < 4; i++) M.onDown({ pointerId: 50 + i, pt: { x: 0.15 + i * 0.2, y: 0.3 + i * 0.1, px: 60 + i * 80, py: 500 - i * 50 } });
    await window.__sleep(300);
  }, eng);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(async () => {
    const M = window.__M, set = [], flush = [];
    const o1 = { older: 0.5 };
    window.__sensor(false);   // the values come from here, one change per frame
    // the page's clock ticks in 0.1 ms steps (no cross-origin isolation): each frame does a frame's work K times over,
    // with fresh values each time, and divides
    const K = 20;
    let k = 0;
    const setAll = () => {
      const t = k++ / 60, a = Math.sin(t * 2.3), b = Math.sin(t * 1.7);
      M.modSet('gk:hoehe', 'hoehe', a * 0.8, o1); M.modSet('gk:bend', 'bend', b * 0.5); M.modSet('map:gestik:1', 'flt', b); M.modSet('map:gestik:2', 'pan', a);
      M.modSet('gk:expr', 'expr', -Math.abs(a) * 0.5); M.modSet('gk:korD', 'korD', Math.abs(b));
    };
    for (let i = 0; i < 90; i++) {
      await new Promise((res) => requestAnimationFrame(res));
      let ts = 0, tf = 0;
      for (let j = 0; j < K; j++) { const t0 = performance.now(); setAll(); const t1 = performance.now(); M.modFlush(); const t2 = performance.now(); ts += t1 - t0; tf += t2 - t1; }
      if (i >= 15) { set.push(ts / K); flush.push(tf / K); }
    }
    const stat = (L) => { const s = L.slice().sort((x, y) => x - y); return { mean: s.reduce((x, y) => x + y, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] }; };
    const sum = set.map((x, i) => x + flush[i]);
    // the whole path from a sensor sample (recogniser, clutch, the bindings and routes) to the flush
    M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 0, target: 'mod.flt', mode: 'abs' }, { dev: 'Gestik', ch: -1, type: 'axis', num: 1, target: 'mod.pan', mode: 'abs' }); M.MAP.v++;
    M.gkRoute('h', { axis: 'tiltY', target: 'hoehe', opts: o1 }); M.gkRoute('b', { axis: 'tiltX', target: 'bend' }); M.gkRoute('l', { axis: 'ladung', target: 'korD' });
    const full = [];
    let tt = performance.now();
    for (let i = 0; i < 60; i++) {
      await new Promise((res) => requestAnimationFrame(res));
      const t0 = performance.now();
      for (let j = 0; j < 10; j++) {
        const t = k++ / 60, beta = 45 + 15 * Math.sin(t * 2.3), roll = 20 * Math.sin(t * 1.7), bb = (beta * Math.PI) / 180, c = (roll * Math.PI) / 180;
        tt += 1000 / 60;
        M.GK.feed({ t: tt, g: [-9.81 * Math.sin(c), 9.81 * Math.sin(bb) * Math.cos(c), 9.81 * Math.cos(bb) * Math.cos(c)], a: [0, 0, 0], r: [2, 1, 0.5] });
        M.modFlush();
      }
      if (i >= 10) full.push((performance.now() - t0) / 10);
    }
    const voices = [...M.touches.values()].reduce((n, tt) => n + tt.voices.length, 0);
    return { set: stat(set), flush: stat(flush), sum: stat(sum), full: stat(full), voices, fbs: M.MOD.fbs.size, moved: Math.abs(M.modVal('hoehe')) + Math.abs(M.modVal('flt')) };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.context().close();
  return Object.assign(r, { errors });
}
(async () => {
  const f = (x) => x.toFixed(3), med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  for (const eng of ['neb', 'stm']) {
    // three rounds, this build and the reference in turns; each figure the median of its rounds' means
    const runs = [], refs = [];
    for (let i = 0; i < 3; i++) { runs.push(await measure(eng)); refs.push(await measure(eng, URL_REF)); }
    const r = runs.slice().sort((a, b) => a.sum.mean - b.sum.mean)[1], ref = med(refs.map((x) => x.sum.mean)), lim = eng === 'neb' ? 0.2 : 0.4;
    r.errors = runs.flatMap((x) => x.errors);
    const line = 'set ' + f(r.set.mean) + ' + flush ' + f(r.flush.mean) + ' = ' + f(r.sum.mean) + ' ms mean (the median of 3 rounds: ' + runs.map((x) => f(x.sum.mean)).join(', ') + '), p95 ' + f(r.sum.p95) + ' ms; 4 fingers, ' + r.voices + ' voices, ' + r.fbs + ' finger bus (the newest bends); the reference build ' + f(ref) + ' ms (' + refs.map((x) => f(x.sum.mean)).join(', ') + ')';
    const fits = r.sum.mean < lim || r.sum.mean <= 1.1 * ref;
    if (eng === 'neb') ok(fits && r.voices === 4 && r.fbs === 1, 'Nebel, CPU 4× slower: the mod layer per frame (< 0.2 ms, or no dearer than the reference + 10 %) ' + line);
    else ok(fits, 'Stimme (the heaviest height: formants), CPU 4× slower (< 0.4 ms, or no dearer than the reference + 10 %): ' + line);
    console.log('INFO ' + eng + ': one sensor sample all the way to the sound (recogniser, clutch, bindings, routes, flush): ' + f(r.full.mean) + ' ms mean, p95 ' + f(r.full.p95) + ' ms');
    ok(!r.errors.length, 'no errors ' + r.errors.join(' | '));
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
