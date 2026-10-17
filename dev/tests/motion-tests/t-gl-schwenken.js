// Schwenken live (slot gl): small circles like a wine glass fill Ladung's second, calm store – held notes swell
// (Ausdruck) and their overtones rise (Höhe, every note), the speed of the circles sets the shimmer (Schweben), the
// direction detunes each note a little (clockwise up, the other way down); shaking, walking, a phone without gyroscope,
// the switch, the Wächter: nothing.   node t-gl-schwenken.js
const { open, ok, close, drivers, M, play, gestik, gestikOn } = require('./gl-h');
const near = (a, b, e) => Math.abs(a - b) <= e;
const state = (page) => page.evaluate(() => {
  const M = window.__M, tt = M.touches.get(77);
  return { glas: M.LAD.go, shim: M.LAD.sh, live: M.LAD.shim, dir: M.LAD.di, lad: M.LAD.ro, expr: M.modVal('expr'), hoehe: M.modVal('hoehe'), cho: M.modVal('cho'), bend: M.modVal('bend'),
    cents: tt && tt.fb ? tt.fb.own : 0, my: tt ? tt.my - tt.y : 0, hz: M.GK.R.st.swHz, vis: M.VIS.glas, ico: document.querySelector('#btnGk').classList.contains('glas') };
});
(async () => {
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await drivers(page);
    await gestik(page);
    // tilt shapes nothing here (Anlehnen off), so only Schwenken moves Höhe and Tonhöhe; a held note
    await page.evaluate(() => { const M = window.__M; M.gkSet('neigen', 'aus'); M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off'); window.__a.note(77, 0.5, 0.4); });
    await play(page, 5, M.circle(4.6, 1.5, 2.5, 1, 0.2));
    let s = await state(page);
    ok(s.glas > 0.85, 'circling for 4.5 s (1.5 Hz) fills Schwenken (' + s.glas.toFixed(2) + ')');
    ok(s.lad < 0.1, '… hardly the Ladung (' + s.lad.toFixed(3) + ')');
    ok(near(s.expr, s.glas * 0.6 + s.lad * 0.35, 0.003) && s.expr > 0.5, 'held notes swell: Ausdruck +' + s.expr.toFixed(2) + ' (0.6 × the store)');
    ok(near(s.hoehe, s.glas * 0.45, 0.002) && s.my > 0.15, 'their overtones rise: Höhe +' + s.hoehe.toFixed(2) + ' on every held note (the note’s height +' + s.my.toFixed(2) + ')');
    ok(near(s.live, 0.2 + 0.5 * Math.min(1, Math.max(0, (s.hz - 0.6) / 2)), 1e-9) && near(s.cho, s.glas * s.shim, 0.002) && near(s.shim, s.live, 0.02), 'the shimmer from the speed (' + s.hz.toFixed(2) + ' Hz): Schweben +' + s.cho.toFixed(2));
    ok(s.dir < -0.9 && near(s.cents, s.glas * s.dir * 12, 0.05) && s.cents < -9, 'counter-clockwise: the note detunes down (' + s.cents.toFixed(1) + ' cents)');
    ok(s.vis > 0.85 && s.ico, 'a ring of light breathes on the field; the symbol in the bar shines lumen');
    // it drains calmly
    await play(page, 4.2, M.hold(45));
    const d = await state(page);
    ok(d.glas < 0.6 * s.glas && d.glas > 0.15, 'stopped: it drains calmly over seconds (' + d.glas.toFixed(2) + ' after 4 s)');
    await play(page, 6, M.hold(45));
    // clockwise, faster: up, more shimmer
    await play(page, 4.5, M.circle(4.2, 2.6, 3, -1, 0.2));
    s = await state(page);
    ok(s.dir > 0.9 && s.cents > 9 && s.hz > 2.3 && s.shim > 0.6, 'clockwise and faster (' + s.hz.toFixed(1) + ' Hz): detuned up (+' + s.cents.toFixed(1) + ' cents), more Schweben (×' + s.shim.toFixed(2) + ')');
    // the Wächter (250 ms without values, then 300 ms to rest)
    await page.waitForTimeout(700);
    const w = await state(page);
    ok(w.glas === 0 && w.expr === 0 && w.cents === 0 && w.hoehe === 0, 'the sensor falls silent: within 0.7 s it is all back at rest (the note’s own pitch exactly)');
    await play(page, 1, M.hold(45));
    await page.evaluate(() => { window.__M.GK.R.st.sw = 0; });   // what is left of the circles: emptied for what follows
    await play(page, 0.5, M.hold(45));
    // what must not fill it: a shake, walking
    await play(page, 3, M.shake(2.4, 16, 5, 0.2));
    s = await state(page);
    ok(s.glas === 0 && s.lad > 0.6, 'a shake: the Ladung (' + s.lad.toFixed(2) + '), not Schwenken');
    await play(page, 10, M.walk());
    s = await state(page);
    ok(s.glas === 0, 'walking for 10 s: no Schwenken');
    // the switch
    await page.evaluate(() => window.__M.gkSet('sw', false));
    await play(page, 4.5, M.circle(4.2, 1.5, 2.5, 1, 0.2));
    s = await state(page);
    ok(s.glas === 0 && s.cents === 0 && s.cho === 0, 'Schwenken switched off: circles do nothing');
    await page.evaluate(() => { window.__M.gkSet('sw', true); window.__a.up(77); });
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // a phone without gyroscope: not available, said so
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await drivers(page);
    await gestikOn(page);
    await play(page, 1.2, M.hold(45), { noGyro: true });
    await page.evaluate(() => window.__a.note(78, 0.5, 0.4));
    await play(page, 5, M.circle(4.6, 1.5, 2.5, 1, 0.2), { noGyro: true });
    const s = await page.evaluate(() => { const M = window.__M, C = M.GK.card; M.gkCardSync(); return { glas: M.LAD.glas, gyro: M.GK.R.st.gyro, dis: C.sw.disabled, txt: C.sTxt.textContent }; });
    ok(!s.gyro && s.glas === 0 && s.dis && /braucht ein Gyroskop/.test(s.txt), 'no gyroscope: Schwenken stays off, its switch is disabled – „' + s.txt + '“');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
