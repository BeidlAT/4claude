// Fingerhalt: a finger held while the phone tilts slides a little over the glass. While Gestik acts the slide keeps
// the column (no pitch glide, no new strike), the finger's height and Höhe add up; a deliberate 80 px glide still
// glides; after resting, the finger is held again; "Fingerhalt" off and Gestik off slide as before; a mouse is never
// held. A bend through the finger bus survives the finger moving. Real touch events (CDP), pointerType "touch".
//   node t-gm-finger.js
const { open, ok, close, probes, gestikOn } = require('./gm-h');
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await probes(page);
  await gestikOn(page);
  await page.evaluate(async () => {
    const M = window.__M;
    M.closePanel();
    window.__g.quiet();
    for (const [k, v] of [['v.eng', 'neb'], ['v.layer', 'glo'], ['v.layerLvl', 0.4], ['v.strum', true], ['v.glide', 0.05], ['v.roll', 'off']]) M.setParam(k, v);
    const st = M.ENGINES.glo.start;
    window.__strikes = 0;
    M.ENGINES.glo.start = function (...a) { window.__strikes++; return st.apply(this, a); };
    window.__sensor(true, { beta: 45, roll: 0 }, 3);
    M.gkSet('neigen', 'eigene');   // only this suite's own routes act (Anlehnen, on by default, would bend too – t-ga-*)
    M.gkRoute('h', { fn: (out) => out.tiltY, target: 'hoehe' });
    await window.__sleep(400);
  });
  // a point just left of a column boundary in the middle of the field
  const geo = await page.evaluate(() => {
    const M = window.__M, r = document.querySelector('#cvFx').getBoundingClientRect(), n = M.N.notes.length, k = Math.floor(n / 2);
    return { x: r.left + (r.width * k) / n - 8, y: r.top + r.height * 0.5, col: r.width / n, n };
  });
  const state = () => page.evaluate(() => { const M = window.__M, tt = [...M.touches.values()][0]; return tt ? { col: tt.col, f: tt.f, y: tt.y, my: tt.my, x: tt.x, strikes: window.__strikes, mode: M.GK.mode, fh: !!tt.fh, fb: tt.fb ? tt.fb.own : null, ptype: tt.ptype } : null; });
  // one finger on the glass through Chrome's input pipeline (touch → pointer events with pointerType "touch")
  const cdp = await page.context().newCDPSession(page);
  let cur = [0, 0], mouse = false;
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
  const move = (x, y) => (mouse ? page.mouse.move(x, y) : touch('touchMove', x, y));
  const slide = async (dx, dy, steps, ms) => { const p0 = cur.slice(); for (let i = 1; i <= steps; i++) { cur = [p0[0] + (dx * i) / steps, p0[1] + (dy * i) / steps]; await move(cur[0], cur[1]); await page.waitForTimeout(ms); } };
  const press = async (x, y) => { cur = [x, y]; if (mouse) { await page.mouse.move(x, y); await page.mouse.down(); } else await touch('touchStart', x, y); };
  const lift = () => (mouse ? page.mouse.up() : touch('touchEnd'));
  // ---- held, Gestik acts (Mit Tönen: 80 ms after the strike) ----
  await press(geo.x, geo.y);
  await page.waitForTimeout(250);
  const s0 = await state();
  ok(s0 && s0.mode.startsWith('live') && s0.strikes === 1 && s0.ptype === 'touch', 'a finger down: Gestik acts (' + (s0 && s0.mode) + '), one strike, pointer "' + (s0 && s0.ptype) + '"');
  // the phone tilts by 10° while the finger slides 20 px over the boundary and 10 px up
  await page.evaluate(async () => { for (let i = 1; i <= 6; i++) { window.__setPose({ beta: 45 - i * 2, roll: i * 1.6 }); await window.__sleep(30); } });
  await slide(20, -10, 5, 30);
  await page.waitForTimeout(120);
  const s1 = await state();
  ok(s1.col === s0.col && s1.f === s0.f && s1.strikes === 1, 'a 20 px slide over the column boundary while tilting: same column, same pitch, no new strike (col ' + s0.col + ' → ' + s1.col + ')');
  ok(s1.y > s0.y && s1.my !== s1.y && s1.fh, 'the finger\'s height follows and Höhe adds to it (finger ' + s0.y.toFixed(3) + ' → ' + s1.y.toFixed(3) + ', sounding ' + s1.my.toFixed(3) + ')');
  const hv = await page.evaluate(() => { const M = window.__M, tt = [...M.touches.values()][0]; return { my: tt.my, sum: Math.min(1, Math.max(0, tt.y + 0.5 * M.modVal('hoehe'))) }; });
  ok(Math.abs(hv.my - hv.sum) < 0.01, 'sounding height = finger height + Höhe × ½ field (' + hv.my.toFixed(3) + ' ≈ ' + hv.sum.toFixed(3) + ')');
  // a bend through the finger bus, then a deliberate glide: 80 px to the right
  await page.evaluate(async () => { window.__M.gkRoute('b', { fn: () => 0.5, target: 'bend' }); await window.__sleep(100); });
  const sb = await state();
  await slide(80, 0, 8, 25);
  await page.waitForTimeout(150);
  const s2 = await state();
  ok(s2.col > s1.col + 1 && s2.f > s1.f && s2.strikes > 1, 'a deliberate 80 px glide still glides: col ' + s1.col + ' → ' + s2.col + ', strikes on new columns (' + s2.strikes + ')');
  ok(sb.fb === 100 && s2.fb === 100, 'the bend (finger bus, +100 cents) stays while the finger glides (' + sb.fb + ' → ' + s2.fb + ')');
  // resting 400 ms, then another small slide: held again from where it rests
  await page.waitForTimeout(400);
  await slide(-20, 0, 5, 30);
  await page.waitForTimeout(100);
  const s3 = await state();
  ok(s3.col === s2.col && s3.strikes === s2.strikes, 'after resting, a small slide back is held again (col ' + s2.col + ' → ' + s3.col + ')');
  await lift();
  await page.evaluate(() => window.__M.gkRoute('b', null));
  // ---- Fingerhalt off: the slide glides as before ----
  await page.evaluate(() => window.__M.gkSet('halt', false));
  await press(geo.x, geo.y);
  await page.waitForTimeout(250);
  const t0 = await state();
  await slide(20, 0, 5, 30);
  await page.waitForTimeout(100);
  const t1 = await state();
  await lift();
  ok(t1.col !== t0.col && t1.strikes === t0.strikes + 1, 'Fingerhalt off: the same slide crosses into the next column and strikes (' + t0.col + ' → ' + t1.col + ')');
  const stored = await page.evaluate(() => JSON.parse(window.__M.store.get('myzel.gestik.v1')).halt);
  ok(stored === false, 'the setting is stored with Gestik\'s own settings, never in the patch');
  await page.evaluate(() => window.__M.gkSet('halt', true));
  // a mouse does not turn with the phone: never held
  mouse = true;
  await press(geo.x, geo.y);
  await page.waitForTimeout(250);
  const m0 = await state();
  await slide(20, 0, 5, 30);
  await page.waitForTimeout(100);
  const m1 = await state();
  await lift();
  mouse = false;
  ok(m0.mode.startsWith('live') && m1.col !== m0.col && !m1.fh && m0.ptype === 'mouse', 'a mouse while Gestik acts: not held, the slide crosses (' + m0.col + ' → ' + m1.col + ')');
  // ---- Gestik off: the finger behaves exactly as before Gestik ----
  await page.evaluate(() => { window.__M.gkRoute('h', null); window.__M.gkDisable(); });
  await press(geo.x, geo.y);
  await page.waitForTimeout(150);
  const u0 = await state();
  await slide(20, -10, 5, 30);
  await page.waitForTimeout(100);
  const u1 = await state();
  await lift();
  ok(u1.col !== u0.col && !u1.fh && u1.my === u1.y, 'Gestik off: the slide crosses as always, the height is the finger\'s own (' + u0.col + ' → ' + u1.col + ')');
  // ---- a key of the computer and a keyboard note never hold (they do not turn with the phone) ----
  const k = await page.evaluate(() => {
    const M = window.__M;
    M.gkEnable(false);
    return M.fhX({ id: 'key-KeyA', px: 10, x: 0.1, ptype: null }, { px: 30, x: 0.2 }) === 0.2 && M.fhX({ id: 'midi-k1-0-60', px: 10, x: 0.1, ptype: null }, { px: 30, x: 0.2 }) === 0.2;
  });
  ok(k, 'keys and keyboard notes: no Fingerhalt');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
