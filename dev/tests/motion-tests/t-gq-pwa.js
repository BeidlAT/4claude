// Final QA (gq): the installable app built by pwa/build.py (python3 /home/user/4claude/myzel/pwa/build.py ../v2/gqpwa)
// – it loads, its service worker installs, Gestik switches on through the tile with a sensor (phone), and it reloads
// offline from the cache (from review/ir-pwa.js).        node t-gq-pwa.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const v3 = (v, n) => (v ? { [n[0]]: v[0], [n[1]]: v[1], [n[2]]: v[2] } : null);
    window.__dm = (g, r) => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: v3(g, 'xyz'), acceleration: { x: 0, y: 0, z: 0 }, rotationRate: v3(r, ['alpha', 'beta', 'gamma']), interval: 16 }));
  });
  await page.goto('http://127.0.0.1:8790/gqpwa/index.html');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || false, null, { timeout: 15000 }).catch(() => {});
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { reg: !!r, active: !!(r && r.active) }; });
  ok(sw.reg && sw.active, 'the service worker is registered and active');
  await page.click('#btnStart');
  await page.waitForTimeout(500);
  // Gerät → Gestik einschalten (a real tap: the permission inside it)
  await page.click('#tab-dev');
  await page.waitForSelector('[data-gk="on"]', { state: 'visible', timeout: 5000 });
  await page.click('[data-gk="on"]');
  const st = await page.evaluate(async () => {
    const t0 = performance.now();
    const iv = setInterval(() => { const a = (performance.now() - t0) / 1000; window.__dm([-9.81 * Math.sin(0.2 * Math.sin(a)), 6.9, 6.9], [1 + Math.sin(a * 9), 0.5, 0.3]); }, 16);
    await new Promise((r) => setTimeout(r, 1800));
    const card = document.querySelector('.gk-card');
    const life = card && card.querySelector('.gk-life') ? card.querySelector('.gk-life').textContent : '';
    clearInterval(iv);
    return { card: !!card, life };
  });
  ok(st.card && /Hz/.test(st.life), 'Gestik on in the installed app: its card and Lebenszeichen „' + st.life + '“');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('#btnStart', { timeout: 10000 });
  ok(true, 'reloads offline from the cache');
  ok(!errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e)).length, 'no page errors ' + errors.slice(0, 4).join(' | '));
  await b.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; process.exit(1); });
