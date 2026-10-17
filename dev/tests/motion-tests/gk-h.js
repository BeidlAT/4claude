// Browser helpers for the Gestik suites: the app (slot gk-inst; build: sh ../v2/mk.sh /home/user/4claude/myzel gk), a
// fake Web MIDI (as midi-tests/h.js), and motion: real DeviceMotionEvent / DeviceOrientationEvent dispatched on window,
// mocked permission APIs (iOS-style requestPermission: granted, denied, only inside a tap, never answering), no motion
// API at all, the claude.ai viewer (window.claude.use), and screen.orientation.angle.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8790/gk-inst/index.html';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
let browser = null;
async function launch() { if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); return browser; }
async function close() { if (browser) await browser.close(); browser = null; }
// cfg: { ins: [[id, name]], noMidi, noBt, noVib, seed, storage, perm: 'granted'|'denied'|'gesture'|'hang'|'throw', noMotion, viewer, angle }
async function open(opts = {}) {
  const b = await launch();
  // opts.vp: { width, height, touch, mobile, dsf, ua } – any viewport (part 7's screenshots: phones, iPad, desktop)
  const vp = opts.vp;
  const ctx = await b.newContext(vp ? Object.assign({ viewport: { width: vp.width, height: vp.height } }, vp.touch ? { hasTouch: true, isMobile: !!vp.mobile } : {}, vp.dsf ? { deviceScaleFactor: vp.dsf } : {}, vp.ua ? { userAgent: vp.ua } : {})
    : opts.mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((cfg) => {
    let x = cfg.seed || 12345;
    Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
    if (cfg.storage) for (const k in cfg.storage) localStorage.setItem(k, cfg.storage[k]);
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // ---- motion ----
    const F = (window.__mo = { asked: 0, cfg, angle: cfg.angle || 0 });
    if (cfg.noMotion) { delete window.DeviceMotionEvent; delete window.DeviceOrientationEvent; }
    else if (cfg.perm) {
      const ask = () => {
        F.asked++;
        if (cfg.perm === 'throw') throw Object.assign(new Error('nope'), { name: 'NotAllowedError' });
        if (cfg.perm === 'hang') return new Promise(() => {});
        // WebKit: only while a tap is being handled (processingUserGesture), not seconds later
        if (cfg.perm === 'gesture') return F.tap ? Promise.resolve('granted') : Promise.reject(Object.assign(new Error('Requesting device motion access requires a user gesture to prompt'), { name: 'NotAllowedError' }));
        return Promise.resolve(cfg.perm);
      };
      window.DeviceMotionEvent.requestPermission = ask;
      window.DeviceOrientationEvent.requestPermission = ask;
    }
    for (const t of ['click', 'pointerup', 'touchend', 'keydown']) window.addEventListener(t, () => { F.tap = true; setTimeout(() => { F.tap = false; }, 0); }, true);
    if (cfg.viewer) window.claude = { use: () => Promise.reject(new Error('no')) };
    if (cfg.angle != null) {
      try { Object.defineProperty(screen.orientation, 'angle', { get: () => F.angle, configurable: true }); } catch (e) {}
    }
    window.__turn = (a) => { F.angle = a; try { screen.orientation.dispatchEvent(new Event('change')); } catch (e) {} window.dispatchEvent(new Event('orientationchange')); };
    const v3 = (v, n) => (v ? { [n[0]]: v[0], [n[1]]: v[1], [n[2]]: v[2] } : null);
    window.__dm = (s) => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: v3(s.g, 'xyz'), acceleration: v3(s.a, 'xyz'), rotationRate: v3(s.r, ['alpha', 'beta', 'gamma']), interval: 16 }));
    window.__do = (beta, gamma) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta, gamma, absolute: false }));
    // samples [{ g, a, r }] dispatched in real time at their t (ms from the first)
    window.__dmPlay = (list) => new Promise((done) => {
      const t0 = performance.now(), s0 = list.length ? list[0].t || 0 : 0;
      let i = 0;
      const go = () => {
        const el = performance.now() - t0;
        while (i < list.length && (list[i].t || 0) - s0 <= el) window.__dm(list[i++]);
        if (i < list.length) setTimeout(go, 4); else done(i);
      };
      go();
    });
    // a pose held still for ms (face up = beta 0, 45 = the usual playing pose, 90 upright; roll + = right edge down, about
    // the world's forward axis – as in gk-lib.js)
    window.__pose = (beta, roll, ms = 400, noise = 0.02) => {
      const b = (beta * Math.PI) / 180, c = (roll * Math.PI) / 180, L = [];
      for (let t = 0; t <= ms; t += 1000 / 60) {
        const n = () => (Math.random() - 0.5) * 2 * noise;
        L.push({ t, g: [-9.81 * Math.sin(c) + n(), 9.81 * Math.sin(b) * Math.cos(c) + n(), 9.81 * Math.cos(b) * Math.cos(c) + n()], a: [n(), n(), n()], r: [n() * 10, n() * 10, n() * 10] });
      }
      return window.__dmPlay(L);
    };
    // a running sensor at 60 Hz: the pose __S.p = { beta, roll, yaw?, lin? }; tremor (deg/s of hand tremor in the rates,
    // 0 = lying on a table); __sensor(false) stops it (the Wächter then sees no samples)
    const S = (window.__S = { p: { beta: 45, roll: 0 }, tremor: 3, iv: 0, n: 0 });
    window.__sensor = (on, p, tremor) => {
      if (p) S.p = Object.assign({ beta: 45, roll: 0 }, p);
      if (tremor != null) S.tremor = tremor;
      clearInterval(S.iv); S.iv = 0;
      if (!on) return;
      S.iv = setInterval(() => {
        const b = (S.p.beta * Math.PI) / 180, c = (S.p.roll * Math.PI) / 180, l = S.p.lin || [0, 0, 0], n = (k) => (Math.random() - 0.5) * 2 * k;
        S.n++;
        window.__dm({ g: [-9.81 * Math.sin(c) + l[0] + n(0.02), 9.81 * Math.sin(b) * Math.cos(c) + l[1] + n(0.02), 9.81 * Math.cos(b) * Math.cos(c) + l[2] + n(0.02)], a: [l[0] + n(0.02), l[1] + n(0.02), l[2] + n(0.02)],
          r: [n(S.tremor || 0.1), n(S.tremor || 0.1), n(S.tremor || 0.1)] });
      }, 1000 / 60);
    };
    window.__setPose = (p) => { S.p = Object.assign({ beta: 45, roll: 0 }, p); };
    if (cfg.noBt) { try { delete Navigator.prototype.bluetooth; } catch (e) {} try { Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true }); } catch (e) {} }   // Safari: no Web Bluetooth
    if (cfg.noVib) { try { delete Navigator.prototype.vibrate; } catch (e) {} }   // iOS: no vibration in the browser
    if (cfg.noMidi) { delete Navigator.prototype.requestMIDIAccess; return; }
    // ---- fake Web MIDI (as midi-tests/h.js) ----
    const mkIn = (id, name) => ({ id, name, state: 'connected', onmidimessage: null });
    const inputs = new Map(), outputs = new Map();
    for (const [id, name] of cfg.ins || []) inputs.set(id, mkIn(id, name));
    const M = (window.__midi = { inputs, outputs, asked: 0 });
    M.access = { inputs, outputs, onstatechange: null };
    navigator.requestMIDIAccess = () => { M.asked++; return Promise.resolve(M.access); };
    const q = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (d) => (d && d.name === 'midi' ? Promise.resolve({ state: 'prompt' }) : q(d));
    window.__send = (bytes, id = 'k1') => { const i = inputs.get(id); if (i && i.onmidimessage) i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  }, opts.cfg || {});
  await page.goto(opts.url || BASE);
  if (opts.frame) return { page, errors, ctx };   // a host page with the app in a frame
  await page.waitForFunction(() => !!window.__M);
  if (opts.start !== false) {
    await page.click('#btnStart');
    await page.waitForFunction(() => window.__M.A.started, null, { timeout: 5000 });
    if (opts.cfg && opts.cfg.ins && opts.cfg.ins.length) {
      await page.evaluate(() => window.__M.midiInit(true));
      await page.waitForFunction(() => window.__M.MIDI.state === 'ready', null, { timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(200);
  }
  return { page, errors, ctx };
}
// the Gerät panel, then the Gestik tile (a real click: the permission is asked inside it)
async function gestikOn(page) {
  await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); });
  await page.waitForSelector('[data-gk="on"]', { state: 'visible', timeout: 3000 });
  await page.click('[data-gk="on"]');
}
module.exports = { open, ok, close, gestikOn, BASE };
