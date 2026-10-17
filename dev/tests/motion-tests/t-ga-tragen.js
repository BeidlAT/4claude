// Anlehnen · Tragen and Fingerhalt with real pointer events. Tragen (off by default): a finger lifted while the phone
// leans more than 12° leaves its note sounding, carried by the lean (it keeps bending and colouring, its glow leaves the
// finger); back at rest lays it down; at most 2 (the oldest goes), 20 s at most, Stille ends them, Festhalten keeps
// them; a reused pointer id, a cancelled pointer, keyboard keys and struck sounds are never carried; switching Tragen
// off lets them go. On a phone with the real sensor: 8° does not carry, 16° does; and Fingerhalt still holds a finger
// whose glass turns under it while Anlehnen bends.
//   node t-ga-tragen.js      (slot ga)
const { open, ok, close, probes, gestikOn, drivers } = require('./ga-h');
(async () => {
  // ================= desktop: the mouse, the dragged Wasserwaage =================
  {
    const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'microKEY Air']] } });
    await probes(page); await drivers(page);
    await gestikOn(page);
    await page.evaluate(() => { const M = window.__M; M.closePanel(); window.__g.quiet(); M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); M.setParam('v.glide', 0); });
    const r = await page.evaluate(() => document.querySelector('#cvFx').getBoundingClientRect().toJSON());
    const at = (fx, fy = 0.5) => [r.left + r.width * fx, r.top + r.height * fy];
    const press = async (fx, fy) => { const [x, y] = at(fx, fy); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(160); };
    const lift = async () => { await page.mouse.up(); await page.waitForTimeout(60); };
    const tilt = (x, y = 0) => page.evaluate(([x, y]) => window.__a.tilt(x, y), [x, y]);
    const state = () => page.evaluate(() => {
      const M = window.__M, c = [...M.touches.values()];
      return { ids: c.map((t) => String(t.id)), car: M.GA.car.map((t) => t.id), mode: M.GK.mode, alive: c.map((t) => t.voices.filter(({ v }) => v.alive && !v.released).length),
        bend: c.map((t) => (t.fb ? t.fb.own : 0)), my: c.map((t) => t.my), y: c.map((t) => t.y), glow: c.map((t) => { const q = M.gaGlow(t, M.modNewest()); return [q[0] - t.px, q[1] - t.py]; }) };
    });
    // the voices of the notes held now, and how many of them have been let go since
    const grab = () => page.evaluate(() => { window.__vs = [...window.__M.touches.values()].flatMap((t) => t.voices.map((x) => x.v)); return window.__vs.length; });
    const relN = () => page.evaluate(() => window.__vs.filter((v) => v.released || !v.alive).length);

    // ---- off by default ----
    await press(0.3); await tilt(0.6); await page.waitForTimeout(150);
    const nv = await grab();
    await lift();
    let s = await state();
    ok(s.ids.length === 0 && nv > 0 && (await relN()) === nv, 'Tragen ist zuerst aus: Finger heben beendet den Ton wie immer');
    await tilt(0); await page.evaluate(() => window.__a.virtOff()); await page.waitForTimeout(150);

    await page.evaluate(() => window.__M.gkSet('tragen', true));
    // ---- carried ----
    await press(0.3); await tilt(0.6, 0.3); await page.waitForTimeout(200);
    const pre = await state();
    await lift();
    s = await state();
    ok(s.ids.length === 1 && /^carry-/.test(s.ids[0]) && s.car.length === 1 && s.alive[0] > 0, 'Finger heben bei 60 % Neigung: der Ton klingt weiter, getragen (' + s.ids[0] + ', ' + s.alive[0] + ' Stimmen)');
    ok(s.mode.startsWith('live'), 'Gestik wirkt weiter, ohne Finger (' + s.mode + ')');
    ok(Math.abs(s.glow[0][0] - 0.6 * 34) < 1e-6 && Math.abs(s.glow[0][1] + 0.3 * 34) < 1e-6 && Math.abs(pre.glow[0][0] - 0.6 * 12) < 1e-6, 'sein Leuchten löst sich vom Finger und hängt an der Neigung (' + s.glow[0].map((x) => x.toFixed(1)).join(', ') + ' px statt ' + pre.glow[0].map((x) => x.toFixed(1)).join(', ') + ')');
    const b1 = s.bend[0];
    await tilt(0.95, 0.6); await page.waitForTimeout(200);
    s = await state();
    ok(s.bend[0] > b1 && s.my[0] > pre.my[0], 'die Neigung formt ihn weiter: Biegung ' + b1.toFixed(1) + ' → ' + s.bend[0].toFixed(1) + ' ct, Höhe ' + pre.my[0].toFixed(3) + ' → ' + s.my[0].toFixed(3));
    const nv2 = await grab(), r0 = await relN();
    await tilt(0.02, 0); await page.waitForTimeout(200);
    s = await state();
    ok(s.ids.length === 0 && r0 === 0 && nv2 > 0 && (await relN()) === nv2, 'zurück in die Mitte: abgelegt – der Ton endet mit seinem Ausklang');
    await page.waitForTimeout(200);
    s = await state();
    ok(s.mode === 'off', '   … und Gestik ruht wieder (' + s.mode + ')');

    // ---- a small lean does not carry ----
    await press(0.3); await tilt(0.2); await page.waitForTimeout(150); await lift();
    s = await state();
    ok(s.ids.length === 0, 'Finger heben bei 20 % (unter 12°): kein Tragen');
    await tilt(0); await page.waitForTimeout(150);

    // ---- at most 2: the oldest goes ----
    for (const fx of [0.2, 0.45, 0.7]) { await press(fx); await tilt(0.7); await page.waitForTimeout(120); await lift(); }
    s = await state();
    const firstGone = await page.evaluate(() => window.__M.GA.car.map((t) => t.col));
    ok(s.ids.length === 2 && s.car.length === 2, 'drei Töne getragen: höchstens 2 bleiben, der älteste endet (' + s.ids.join(', ') + ')');
    // a new finger (the mouse always has the same pointer id) leaves the carried notes alone
    await press(0.9); await page.waitForTimeout(100);
    s = await state();
    ok(s.ids.length === 3 && s.car.length === 2, 'ein neuer Finger mit derselben Zeiger-Nummer: die getragenen bleiben (' + s.ids.join(', ') + ')');
    await page.evaluate(() => window.__M.gkSet('tragen', false)); await page.waitForTimeout(150);
    s = await state();
    ok(s.car.length === 0 && s.ids.length === 1, 'Tragen ausgeschaltet: die getragenen enden, der gehaltene Finger bleibt');
    await lift(); await page.evaluate(() => window.__M.gkSet('tragen', true));

    // ---- Stille ends them; Festhalten keeps them; 20 s ----
    await press(0.3); await tilt(0.7); await page.waitForTimeout(120); await lift();
    await page.evaluate(() => window.__M.panic()); await page.waitForTimeout(150);
    s = await state();
    ok(s.ids.length === 0 && s.car.length === 0, '„Stille“ beendet getragene Töne');
    await page.waitForTimeout(300);
    await press(0.3); await tilt(0.7); await page.waitForTimeout(120); await lift();
    await page.evaluate(() => { window.__M.gkSet('ped', true); window.__send([0xb0, 64, 127]); }); await page.waitForTimeout(120);
    await tilt(0); await page.waitForTimeout(300);
    s = await state();
    ok(s.ids.length === 1 && s.mode === 'hold', 'Haltepedal (Festhalten): zurück in die Mitte legt ihn nicht ab (' + s.mode + ')');
    await page.evaluate(() => { window.__send([0xb0, 64, 0]); window.__M.gkSet('ped', false); }); await page.waitForTimeout(500);
    s = await state();
    ok(s.ids.length === 0, '   … Pedal los, die Neigung ist in der Mitte: abgelegt');
    await page.evaluate(() => { window.__M.GA.carT = 1500; });
    await press(0.3); await tilt(0.7); await page.waitForTimeout(120); await lift();
    await page.waitForTimeout(900);
    const mid = (await state()).ids.length;
    await page.waitForTimeout(900);
    s = await state();
    ok(mid === 1 && s.ids.length === 0, 'nach der Höchstzeit (hier 1,5 s statt 20 s) endet ein getragener Ton von selbst');
    await page.evaluate(() => { window.__M.GA.carT = 20000; });
    await tilt(0); await page.waitForTimeout(150);

    // ---- never carried: a cancelled pointer, a keyboard key, a struck sound ----
    const nc = await page.evaluate(async () => {
      const M = window.__M, W = window.__a, r = {};
      W.tilt(0.7);
      M.onDown({ pointerId: 77, pointerType: 'touch', pt: { x: 0.4, y: 0.5, px: 100, py: 100 } }); await window.__sleep(150);
      M.onUp({ pointerId: 77, pointerType: 'touch', type: 'pointercancel' }); await window.__sleep(50);
      r.cancel = M.touches.size;
      window.__send([0x90, 60, 100]); await window.__sleep(150); window.__send([0x80, 60, 0]); await window.__sleep(50);
      r.key = M.touches.size;
      M.setParam('v.eng', 'glo');
      M.onDown({ pointerId: 78, pointerType: 'touch', pt: { x: 0.4, y: 0.5, px: 100, py: 100 } }); await window.__sleep(150);
      M.onUp({ pointerId: 78, pointerType: 'touch', type: 'pointerup' }); await window.__sleep(50);
      r.struck = M.touches.size;
      M.setParam('v.eng', 'neb'); W.tilt(0); W.virtOff(); await window.__sleep(100);
      return r;
    });
    ok(nc.cancel === 0 && nc.key === 0 && nc.struck === 0, 'nie getragen: ein vom System abgebrochener Finger, eine Keyboard-Taste, ein angeschlagener Klang');
    // Gestik switched off: carried notes end, held notes keep nothing of Anlehnen
    await press(0.3); await tilt(0.9); await page.waitForTimeout(150); await lift();
    await press(0.6); await page.waitForTimeout(100);
    const g0 = await page.evaluate(async () => {
      const M = window.__M;
      const held = [...M.touches.values()].find((t) => !t.carry);
      M.gkDisable(); await window.__sleep(150);
      return { ids: [...M.touches.keys()].map(String), ga: held.ga, vis: M.GA.vis, n: M.MOD.n, own: held.fb ? held.fb.own : 0 };
    });
    ok(g0.ids.length === 1 && !/^carry/.test(g0.ids[0]) && !g0.ga && !g0.vis && g0.n === 0 && g0.own === 0, 'Gestik aus: der getragene Ton endet, der gehaltene behält nichts von Anlehnen (' + g0.ids.join(', ') + ')');
    await lift();
    ok(errors.length === 0, 'keine Fehler im Browser' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    await page.context().close();
  }

  // ================= phone: real touches, the real sensor =================
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted', angle: 0 } });
    await probes(page); await drivers(page);
    await gestikOn(page);
    await page.evaluate(async () => {
      const M = window.__M;
      M.closePanel(); window.__g.quiet(); M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); M.setParam('v.glide', 0.05); M.setParam('v.strum', true);
      M.gkSet('tragen', true);
      window.__sensor(true, { beta: 45, roll: 0 }, 3);
      await window.__sleep(500);
    });
    const geo = await page.evaluate(() => { const M = window.__M, r = document.querySelector('#cvFx').getBoundingClientRect(), n = M.N.notes.length, k = Math.floor(n / 2); return { x: r.left + (r.width * k) / n - 8, y: r.top + r.height * 0.5 }; });
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
    const roll = (deg) => page.evaluate(async (deg) => { const p = window.__S.p.roll, n = 8; for (let i = 1; i <= n; i++) { window.__setPose({ beta: 45, roll: p + ((deg - p) * i) / n }); await window.__sleep(25); } await window.__sleep(350); }, deg);
    const st = () => page.evaluate(() => { const M = window.__M, c = [...M.touches.values()]; return { ids: c.map((t) => String(t.id)), col: c.map((t) => t.col), f: c.map((t) => t.f), bend: c.map((t) => (t.fb ? t.fb.own : 0)), mode: M.GK.mode, roll: M.GK.R.st.roll }; });
    // Fingerhalt: the glass turns under a still finger while Anlehnen bends
    await touch('touchStart', geo.x, geo.y); await page.waitForTimeout(250);
    const f0 = await st();
    await page.evaluate(async () => { for (let i = 1; i <= 8; i++) { window.__setPose({ beta: 45, roll: i * 2 }); await window.__sleep(30); } });
    for (let i = 1; i <= 5; i++) { await touch('touchMove', geo.x + i * 4, geo.y); await page.waitForTimeout(30); }
    await page.waitForTimeout(300);
    const f1 = await st();
    ok(f1.col[0] === f0.col[0] && f1.f[0] === f0.f[0] && f1.bend[0] > 20, 'Fingerhalt: 16° zur Seite, das Glas dreht sich 20 px unter dem Finger weg – Spalte und Ton bleiben (' + f0.col[0] + ' → ' + f1.col[0] + '), Anlehnen biegt (' + f1.bend[0].toFixed(1) + ' ct)');
    // Tragen at 16°: carried
    await touch('touchEnd'); await page.waitForTimeout(100);
    const t1 = await st();
    ok(t1.ids.length === 1 && /^carry-/.test(t1.ids[0]), 'mit dem Sensor: Finger heben bei ' + t1.roll.toFixed(0) + '° → getragen');
    await roll(0); await page.waitForTimeout(400);
    const t2 = await st();
    ok(t2.ids.length === 0, '   … Handy zurück in die Mitte: abgelegt');
    // at 8°: not carried
    await touch('touchStart', geo.x, geo.y); await page.waitForTimeout(250);
    await roll(8);
    await touch('touchEnd'); await page.waitForTimeout(100);
    const t3 = await st();
    ok(t3.ids.length === 0, 'Finger heben bei ' + t3.roll.toFixed(0) + '° (unter 12°): nicht getragen');
    await roll(0);
    // a new zero while a note is bent (the screen turns): it starts again from there – back to its pitch, never the
    // other way
    // a second finger struck while leaning 10° has its zero there; leaning on to 24° bends it
    await page.evaluate(() => window.__M.gkSet('tragen', false));
    const two = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 3, radiusY: 3, force: 1 })) });
    const g2 = [geo.x + 120, geo.y + 60];
    const newest = () => page.evaluate(() => { const t = window.__M.modNewest(); return { bend: t && t.fb ? t.fb.own : 0, z: t && t.ga ? t.ga.z : null }; });
    for (const [what, act, undo] of [['Bildschirm gedreht', () => window.__turn(90), () => window.__turn(0)], ['„Nullpunkt setzen“', () => window.__M.gkZero(false), null]]) {
      await two('touchStart', [[geo.x, geo.y, 1]]); await page.waitForTimeout(250);
      await roll(10);
      await two('touchStart', [[geo.x, geo.y, 1], [g2[0], g2[1], 2]]); await page.waitForTimeout(250);
      await roll(24);
      const zb = await newest();
      await page.evaluate(act); await page.waitForTimeout(600);
      const za = await newest();
      ok(zb.bend > 40 && zb.z > 0.2 && Math.abs(za.bend) < 1, 'neuer Nullpunkt (' + what + '), der neueste Ton war ab ' + (zb.z * 100).toFixed(0) + ' % Neigung gebogen: er kehrt auf seine Tonhöhe zurück statt nach unten zu biegen (' + zb.bend.toFixed(0) + ' → ' + za.bend.toFixed(1) + ' ct)');
      await two('touchEnd', []); await page.waitForTimeout(100);
      if (undo) { await page.evaluate(undo); await page.waitForTimeout(300); }
      await roll(0); await page.waitForTimeout(300);
    }
    await page.evaluate(() => window.__sensor(false));
    ok(errors.length === 0, 'keine Fehler im Browser (Handy)' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  }
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
