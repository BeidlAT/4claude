// What Anlehnen costs, on a CPU throttled 4× (Chrome DevTools' CPU throttling): 4 fingers held (Nebel), "Alle gleich"
// so every note bends (Höhe, Tonhöhe to its own neighbour with the snap, Bebung on all), samples fed at 60 Hz through
// the whole path (recogniser, clutch, routes with Anlehnen's update, flush) – against the same path with "Neigen formt:
// Eigene" (Anlehnen resting). Budget: Anlehnen adds < 0.1 ms per sensor sample (4× throttled), its update alone
// < 0.05 ms.   node t-ga-cost.js      (slot ga)
const { open, ok, close, gestikOn } = require('./ga-h');
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(async () => {
    const M = window.__M;
    M.closePanel();
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off');
    M.gkSet('clutch', 'immer'); M.gkSet('viele', 'alle'); M.gkSet('beb', 'hand');
    window.__sensor(true, { beta: 45, roll: 0 });
    await window.__sleep(300);
    for (let i = 0; i < 4; i++) M.onDown({ pointerId: 50 + i, pt: { x: 0.15 + i * 0.2, y: 0.3 + i * 0.1, px: 60 + i * 80, py: 500 - i * 50 } });
    await window.__sleep(300);
    window.__sensor(false);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const run = (neigen) => page.evaluate(async (neigen) => {
    const M = window.__M;
    M.gkSet('neigen', neigen);
    let tt = performance.now(), k = 0;
    const full = [], upd = [];
    let bent = 0;
    const sample = () => {
      const t = k++ / 60, beta = 45 + 15 * Math.sin(t * 2.3), roll = 22 * Math.sin(t * 1.1), bb = (beta * Math.PI) / 180, c = (roll * Math.PI) / 180, w = 40 * Math.sin(t * 2 * Math.PI * 6);
      tt += 1000 / 60;
      return { t: tt, g: [-9.81 * Math.sin(c), 9.81 * Math.sin(bb) * Math.cos(c), 9.81 * Math.cos(bb) * Math.cos(c)], a: [0, 0, 0], r: [2, w, 0.5] };
    };
    for (let i = 0; i < 70; i++) {
      await new Promise((res) => requestAnimationFrame(res));
      const t0 = performance.now();
      for (let j = 0; j < 10; j++) { M.GK.feed(sample()); M.modFlush(); }
      if (i >= 10) full.push((performance.now() - t0) / 10);
      bent = Math.max(bent, [...M.touches.values()].filter((t) => t.fb && Math.abs(t.fb.own) > 1).length);
      // Anlehnen's own update, 20 times with fresh times
      const t1 = performance.now();
      for (let j = 0; j < 20; j++) M.gaTick(M.GK.out, t1 + j * 0.01);
      if (i >= 10) upd.push((performance.now() - t1) / 20);
    }
    const stat = (L) => { const s = L.slice().sort((x, y) => x - y); return { mean: s.reduce((x, y) => x + y, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] }; };
    return { full: stat(full), upd: stat(upd), bent, mode: M.GK.mode };
  }, neigen);
  const off = await run('eigene'), on = await run('anl');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const f = (x) => x.toFixed(3);
  ok(on.bent >= 3 && on.mode.startsWith('live'), 'Anlehnen wirkt beim Messen: bis zu ' + on.bent + ' von 4 Tönen zugleich gebogen (' + on.mode + ')');
  ok(on.full.mean - off.full.mean < 0.1, 'CPU 4× langsamer: ein Sensorwert bis zum Klang ' + f(on.full.mean) + ' ms (p95 ' + f(on.full.p95) + ') mit Anlehnen, ' + f(off.full.mean) + ' ms ohne – Anlehnen kostet ' + f(on.full.mean - off.full.mean) + ' ms je Wert');
  ok(on.upd.mean < 0.05, 'Anlehnens eigene Rechnung je Wert (4 Töne, alle biegen): ' + f(on.upd.mean) + ' ms (p95 ' + f(on.upd.p95) + ')');
  ok(!errors.length, 'keine Fehler ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
