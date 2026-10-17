// fix-phase test helpers: instrumented build (internals on window.__MX), real CDP touch, error capture
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8790/mix-inst/index.html';
const VP = {
  phone: { width: 390, height: 844, mobile: true }, p360: { width: 360, height: 740, mobile: true },
  d1280: { width: 1280, height: 800 }, d1440: { width: 1440, height: 900 }, land: { width: 844, height: 390, mobile: true },
  d1180: { width: 1180, height: 820 }, ipadL: { width: 1180, height: 820, touch: true, coarse: true }, ipadP: { width: 820, height: 1180, touch: true, coarse: true },
  c1440: { width: 1440, height: 900, touch: true, coarse: true }, d1024: { width: 1024, height: 768 },
};
async function launch() { return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
async function page(browser, vp) {
  if (typeof vp === 'string') vp = VP[vp];
  const o = vp.mobile ? { viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr || (vp.touch ? 2 : 1), hasTouch: !!vp.touch, isMobile: false };
  if (vp.reduced) o.reducedMotion = 'reduce';
  const ctx = await browser.newContext(o);
  const pg = await ctx.newPage();
  pg.errors = [];
  pg.on('pageerror', (e) => pg.errors.push('pageerror: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') pg.errors.push(m.type() + ': ' + m.text()); });
  if (vp.coarse) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setEmitTouchEventsForMouse', { enabled: true }); await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); }
  await pg.route(URL, async (route) => {
    const r = await route.fetch(); let body = await r.text();
    body = body.replace('function mixerFrame(dt, ts) {', 'function mixerFrame(dt, ts) { const __t0 = performance.now(); mixerFrame0(dt, ts); const __d = performance.now() - __t0; (window.__MXT || (window.__MXT = [])).push(__d); }\nfunction mixerFrame0(dt, ts) {');
    body = body.replace('\nboot();\nwindow.__M = {', '\nboot();\nwindow.__MX = { MX, MXC, MXK, MXV, MXL, MXG, MXD, MXO, MXPB, selectChannel, mxSetLayer, mxMorphTo, mxMorphApply, mxSnapStore, mxSetView, mxLayout, openDetail, closeDetail, mxLegend, mxPos, mxDb, mxSnapIds, openPanel, closePanel, UI, mxTaps, mxDormant };\nwindow.__M = {');
    route.fulfill({ response: r, body });
  });
  await pg.goto(URL); await pg.waitForFunction(() => !!window.__M && !!window.__MX);
  pg.cdp = await ctx.newCDPSession(pg);
  return { ctx, pg };
}
async function start(pg, puls = true) {
  await pg.evaluate(() => document.querySelector('#btnStart').click()); await pg.waitForTimeout(500);
  if (puls) await pg.evaluate(() => window.__M.seqStart());
}
async function touchDrag(pg, pts, opt = {}) {
  const c = pg.cdp, hold = opt.hold || 0, stepMs = opt.stepMs || 16;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  if (hold) await pg.waitForTimeout(hold);
  for (let i = 1; i < pts.length; i++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts[i][0], y: pts[i][1] }] });
    await pg.waitForTimeout(stepMs);
  }
  if (opt.endHold) await pg.waitForTimeout(opt.endHold);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pg.waitForTimeout(opt.after == null ? 120 : opt.after);
}
function line(x0, y0, x1, y1, n = 12) { const a = []; for (let i = 0; i <= n; i++) a.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); return a; }
async function tap(pg, x, y, ms = 40) {
  await pg.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await pg.waitForTimeout(ms);
  await pg.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const ok = (c, m) => console.log((c ? 'ok   ' : 'FAIL ') + m);
const stat = (t) => { t = t.slice().sort((a, b) => a - b); return { n: t.length, med: +(t[t.length >> 1] || 0).toFixed(2), p95: +(t[Math.floor(t.length * 0.95)] || 0).toFixed(2), max: +(t[t.length - 1] || 0).toFixed(2) }; };
module.exports = { launch, page, start, touchDrag, line, tap, ok, stat, VP, URL };
