// Gestik: switching on and the permission paths, the 1.2 s liveness check and its German messages, the Wächter on a
// hidden page, the start tap when Gestik was on, the viewer and a cross-origin frame, no sensor, no motion API.
// Real DeviceMotionEvents are dispatched on window.   node t-gk-perm.js   (slot gk: sh ../v2/mk.sh /home/user/4claude/myzel gk)
const { open, ok, close, gestikOn } = require('./gk-h');
const st = (page) => page.evaluate(() => { const G = window.__M.GK; return { on: G.on, live: G.live, perm: G.perm, msg: G.msgT, warn: !!G.msgW, src: !!G.src, ports: window.__M.MIDI.ports.size, asked: window.__mo.asked, tile: !document.querySelector('[data-gk="on"]').hidden, tileTxt: document.querySelector('[data-gk="on"]').textContent, toast: document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '' }; });
(async () => {
  // 1. iOS-style permission, granted inside the tap
  {
    const { page, errors } = await open({ cfg: { perm: 'gesture' } });
    await gestikOn(page);
    await page.evaluate(() => window.__pose(45, 0, 500));
    const s = await st(page);
    ok(s.on && s.perm === 'granted' && s.live && s.asked === 1, 'iOS-style: the tile asks inside the tap → granted, values arrive (asked ' + s.asked + '×)');
    ok(/^\d+ Hz · ±\d+ ms/.test(s.msg), 'Lebenszeichen: rate and jitter ("' + s.msg + '")');
    ok(s.src && s.ports === 0 && !s.toast, 'Gestik is a source, no MIDI port, no toast');
    ok(!s.tile, 'the tile gives way to the card');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 1b. iOS reports acceleration mirrored (face up z ≈ −9.81): tilting the right edge down must still be "right"
  {
    const { page, errors } = await open({ cfg: { perm: 'gesture', storage: { 'myzel.gestik.v1': JSON.stringify({ clutch: 'immer' }) } } });
    await gestikOn(page);
    const mir = await page.evaluate(async () => {
      const b = (45 * Math.PI) / 180, pose = (roll, ms) => { const c = (roll * Math.PI) / 180, L = []; for (let t = 0; t <= ms; t += 1000 / 60) L.push({ t, g: [9.81 * Math.cos(b) * Math.sin(c), -9.81 * Math.sin(b), -9.81 * Math.cos(b) * Math.cos(c)], a: [0, 0, 0], r: [0, 0, 0] }); return L; };
      await window.__dmPlay(pose(0, 400));
      await window.__dmPlay(pose(25, 600));
      do window.__do(45, 25); while (0);
      await window.__sleep(50);
      return { x: window.__M.GK.out.tiltX, sign: window.__M.GK.R.st.sign, sgn: window.__M.gkSignText() };
    });
    ok(mir.x > 0.6 && mir.sign === -1, 'iOS-mirrored acceleration: right edge down is still Neigen ↔ positive (' + mir.x.toFixed(2) + ', sign ' + mir.sign + ')');
    ok(/gespiegelt/.test(mir.sgn), 'Messen names the mirrored sign, checked against deviceorientation ("' + mir.sgn + '")');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 2. no permission API (Android before Chrome 151, desktop): listen and verify
  {
    const { page, errors } = await open({});
    await gestikOn(page);
    await page.evaluate(() => window.__pose(45, 0, 400));
    const s = await st(page);
    ok(s.perm === 'granted' && s.live, 'no requestPermission: listens at once, values arrive');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 3. denied
  {
    const { page } = await open({ cfg: { perm: 'denied' } });
    await gestikOn(page);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__pose(45, 0, 300));
    const s = await st(page);
    ok(s.perm === 'denied' && !s.live && s.warn, 'denied: no values taken');
    ok(/^Zugriff abgelehnt\. Android: Website-Einstellungen → Bewegungssensoren erlauben, dann neu laden\. iPhone\/iPad: Safari ganz schließen/.test(s.msg), 'denied: one line for both kinds of phones – "' + s.msg + '"');
    ok(s.tile && /Erlaubnis/.test(s.tileTxt), 'denied: the tile stays to ask again ("' + s.tileTxt.trim() + '")');
    await page.context().close();
  }
  // 4. asked outside a tap (a pad on a keyboard, a script): NotAllowedError → "noch einmal tippen"; the tile then works
  {
    const { page } = await open({ cfg: { perm: 'gesture' } });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.evaluate(() => window.__M.MTARGETS.get('gk.on').run(1));
    await page.waitForTimeout(100);
    let s = await st(page);
    ok(s.on && s.perm === 'tap' && /noch einmal auf „Gestik einschalten“ tippen/.test(s.msg), 'outside a tap: "' + s.msg + '"');
    ok(s.tile && /Erlaubnis/.test(s.tileTxt), 'the tile offers the tap');
    await page.click('[data-gk="on"]');
    await page.evaluate(() => window.__pose(45, 0, 400));
    s = await st(page);
    ok(s.perm === 'granted' && s.live && s.asked === 2 && !s.tile, 'then the tap: granted and live');
    await page.context().close();
  }
  // 5. Gestik was on: the start tap asks again (iOS may forget between sessions)
  {
    const { page, errors } = await open({ start: false, cfg: { perm: 'gesture', storage: { 'myzel.gestik.v1': JSON.stringify({ on: true, weite: 45, clutch: 'immer' }) } } });
    let s = await page.evaluate(() => ({ on: window.__M.GK.on, asked: window.__mo.asked }));
    ok(!s.on && s.asked === 0, 'before the start tap: nothing asked, nothing listening');
    await page.click('#btnStart');
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__pose(45, 0, 400));
    s = await st(page);
    const p = await page.evaluate(() => window.__M.GK.p);
    ok(s.on && s.perm === 'granted' && s.live && s.asked === 1, 'the start tap asks and Gestik runs');
    ok(p.weite === 45 && p.clutch === 'immer', 'its settings came back from myzel.gestik.v1');
    const patch = await page.evaluate(() => localStorage.getItem('myzel.patch.v1') || '');
    ok(!/gestik|weite|clutch/i.test(patch), 'nothing of it in the patch');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 6. the start tap without a gesture-capable permission (denied there): one toast, the card keeps saying it
  {
    const { page } = await open({ start: false, cfg: { perm: 'denied', storage: { 'myzel.gestik.v1': JSON.stringify({ on: true }) } } });
    await page.click('#btnStart');
    await page.waitForTimeout(300);
    const s = await st(page);
    ok(s.perm === 'denied' && /^Gestik: Zugriff abgelehnt/.test(s.toast), 'start tap, denied: said once in a toast ("' + s.toast.slice(0, 40) + '…")');
    await page.context().close();
  }
  // 7. no sensor (a computer): after 1.2 s the message; the Wasserwaage drives the tilt instead
  {
    const { page, errors } = await open({});
    await gestikOn(page);
    let s = await st(page);
    ok(/Prüft den Bewegungssensor/.test(s.msg), 'within 1.2 s: "' + s.msg + '"');
    await page.evaluate(() => window.__dm({ g: null, a: null, r: null }));   // desktop Chrome: events with nothing in them
    await page.waitForTimeout(1350);
    s = await st(page);
    ok(!s.live && /^Kein Bewegungssensor gefunden – ziehe die Spore in der Wasserwaage/.test(s.msg), 'after 1.2 s: "' + s.msg + '"');
    const box = await page.locator('.gk-ww').boundingBox();
    await page.mouse.move(box.x + 70, box.y + 70); await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 50, { steps: 4 }); await page.mouse.move(box.x + 112, box.y + 40, { steps: 4 });
    await page.mouse.up();
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    await page.waitForTimeout(150);
    const v = await page.evaluate(() => ({ virt: window.__M.GK.virt, out: window.__M.GK.out, badge: document.querySelector('.kc-badge.gk').textContent }));
    ok(v.virt && v.virt.x > 0.5 && v.virt.y > 0.3 && v.out.tiltX > 0.5 && v.out.tiltY > 0.3, 'dragging the spore sets the tilt (' + v.out.tiltX.toFixed(2) + ', ' + v.out.tiltY.toFixed(2) + ') and it stays');
    ok(v.badge === 'ohne Sensor', 'the badge says "ohne Sensor"');
    await page.dblclick('.gk-ww');
    await page.waitForTimeout(400);
    const z = await page.evaluate(() => window.__M.GK.out.tiltX);
    ok(Math.abs(z) < 0.01, 'double click: back to the middle');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 8. no motion API at all
  {
    const { page, errors } = await open({ cfg: { noMotion: true } });
    await gestikOn(page);
    await page.waitForTimeout(1350);
    const s = await st(page);
    ok(s.on && !s.live && /^Kein Bewegungssensor gefunden/.test(s.msg), 'no DeviceMotionEvent at all: switches on, says so');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 8b. only deviceorientation (no devicemotion): gravity from beta/gamma, held while the phone is still
  {
    const { page, errors } = await open({ cfg: { perm: 'granted', storage: { 'myzel.gestik.v1': JSON.stringify({ clutch: 'immer' }) } } });
    await gestikOn(page);
    await page.evaluate(() => window.__do(45, 0));
    await page.waitForTimeout(800);
    let s = await page.evaluate(() => ({ live: window.__M.GK.live, mode: window.__M.GK.mode, gyro: window.__M.GK.R.st.gyro }));
    ok(s.live && s.mode === 'live' && !s.gyro, 'deviceorientation only: live, acting, no gyroscope – and a still phone is not "paused"');
    await page.evaluate(() => window.__do(45, 25));
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ x: window.__M.GK.out.tiltX, msg: window.__M.GK.msgT }));
    ok(s.x > 0.6 && !/pausiert/.test(s.msg), 'deviceorientation only: tilt from beta/gamma (' + s.x.toFixed(2) + ', "' + s.msg + '")');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 9. the claude.ai viewer: denied there (Safari) – or simply nothing (Chrome)
  for (const perm of ['denied', undefined]) {
    const { page, errors } = await open({ cfg: { viewer: true, perm } });
    await gestikOn(page);
    await page.waitForTimeout(1350);
    const s = await st(page);
    const link = await page.evaluate(() => { const r = document.querySelector('.gk-card .kc-app'); return r && !r.hidden ? r.textContent : ''; });
    ok(s.msg === 'In dieser Ansicht gesperrt – öffne Myzel als App:' && /beidlat\.github\.io\/4claude/.test(link), 'viewer (' + (perm || 'no events') + '): "' + s.msg + '" + link (the address once, as the link)');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 10. a cross-origin frame without allow="accelerometer": blocked by the embedding page
  {
    const { page, errors } = await open({ url: 'http://localhost:8790/gkframe.html', frame: true });
    const f = page.frame({ url: /gk-inst/ });
    await f.waitForFunction(() => !!window.__M);
    await f.click('#btnStart');
    await f.evaluate(() => window.__M.openPanel('dev'));
    await f.click('[data-gk="on"]');
    await page.waitForTimeout(1350);
    const s = await f.evaluate(() => ({ msg: window.__M.GK.msgT, live: window.__M.GK.live }));
    ok(!s.live && /In dieser Ansicht gesperrt/.test(s.msg), 'cross-origin frame: "' + s.msg + '"');
    const er = errors.filter((e) => !/screen-wake-lock/.test(e));   // the wake lock's complaint in a frame is the app's since before Gestik
    ok(!er.length, 'no errors (and no sensor listener the frame may not have) ' + er.join(' | '));
    await page.context().close();
  }
  // 11. the page goes to the background: the Wächter glides everything to rest, says "pausiert", comes back
  {
    const { page, errors } = await open({ cfg: { perm: 'granted' } });
    await gestikOn(page);
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    await page.evaluate(() => window.__pose(45, 0, 300));
    await page.evaluate(() => window.__pose(45, 28, 500));
    const a = await page.evaluate(() => window.__M.GK.out.tiltX);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => window.__M.GK.out.tiltX);
    await page.waitForTimeout(450);
    const s = await page.evaluate(() => ({ x: window.__M.GK.out.tiltX, msg: window.__M.GK.msgT, mode: window.__M.GK.mode }));
    ok(a > 0.9 && mid > 0.05 && mid < a && Math.abs(s.x) < 1e-6 && s.mode === 'off', 'hidden: glides to rest (' + a.toFixed(2) + ' → ' + mid.toFixed(2) + ' → ' + s.x + ')');
    ok(s.msg === 'Bildschirm aus oder App im Hintergrund – Gestik pausiert', 'hidden: "' + s.msg + '"');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.evaluate(() => window.__pose(45, 28, 400));
    const b = await page.evaluate(() => ({ x: window.__M.GK.out.tiltX, msg: window.__M.GK.msgT, n: window.__M.GK.R.st.n }));
    ok(b.x > 0.9 && /Hz/.test(b.msg), 'back: values again (' + b.x.toFixed(2) + '), filters restarted after the gap');
    // no samples while visible (the sensor stalls): the Wächter acts after 250 ms, the glide takes 300 ms more
    await page.waitForTimeout(900);
    const w = await page.evaluate(() => ({ x: window.__M.GK.out.tiltX, mode: window.__M.GK.mode }));
    ok(Math.abs(w.x) < 1e-6 && w.mode === 'off', 'no samples for 250 ms: the Wächter rests everything');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 12. a turned screen: re-zero, the turning angle remembered under Messen
  {
    const { page, errors } = await open({ cfg: { angle: 0 } });
    await gestikOn(page);
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    await page.evaluate(() => window.__pose(90, 0, 300));
    await page.evaluate(() => window.__pose(90, 50, 400));
    await page.evaluate(() => window.__turn(90));
    const r = await page.evaluate(async () => { await window.__pose(90, 50, 300); return { rot: window.__M.GK.p.rot, x: window.__M.GK.raw.tiltX }; });
    ok(r.rot >= 45 && r.rot <= 55, 'the view turned at ~50°: remembered (' + r.rot + '°)');
    ok(Math.abs(r.x) < 0.05, 'after the turn: a new zero in the new frame (' + r.x.toFixed(3) + ')');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // 13. switching off: listeners go, the source goes, the tile comes back, the choice is stored
  {
    const { page, errors } = await open({ cfg: { perm: 'granted' } });
    await gestikOn(page);
    await page.evaluate(() => window.__pose(45, 0, 300));
    await page.click('.gk-card .kc-tog');
    await page.evaluate(() => window.__pose(45, 20, 300));
    const s = await page.evaluate(() => ({ on: window.__M.GK.on, src: window.__M.MIDI.srcs.has('gestik'), card: !!document.querySelector('.gk-card'), tile: !document.querySelector('[data-gk="on"]').hidden, store: JSON.parse(localStorage.getItem('myzel.gestik.v1')).on, n: window.__M.GK.R.st.n }));
    ok(!s.on && !s.src && !s.card && s.tile && s.store === false, 'off: no source, no card, the tile again, stored off');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
