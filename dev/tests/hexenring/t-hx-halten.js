// (owner, 28.10.2026: „wie wird der rechtsklick gelöst … mach variante 1“) on the iPad a ring held 0.5 s opens the same
// menu a right click opens (Ansehen und bearbeiten, Karte, Stumm/Solo, Export, Farbe, Löschen) – the loop as it was
// (the press's tap taken back), lifting the finger touches no item, a tap on an item works; the mouse's right click still
// opens it.   node t-hx-halten.js   (iPad size, CDP touch events – Chromium; Safari itself is not here)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const IPAD = { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(IPAD), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(600);
  await H.tools(page); await G.gtools(page);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await page.tap('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(800);
  // a loop with notes
  const slot = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    await window.__reset(); window.__grid(120); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); await sl(500);
    const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
    window.__riff(t0, beat, [0, 2, 4, 7], 1, { eng: 'klb', dur: beat * 0.6 }); await window.__until(t0 + 4 * beat + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); M.HX.chips = null; M.hxRailDirty(); await sl(1500);
    return L.slot;
  });
  const ring = async () => page.evaluate((s) => { const r = window.__M.HXU.rings[s].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, slot);
  const st = () => page.evaluate((s) => { const L = window.__M.hxRingL(s); return L.state + (window.__M.HX.pend.some((p) => p.loop === L.id) ? '+pend' : ''); }, slot);
  const menu = () => page.evaluate(() => { const m = document.querySelector('.hx-cm'); return m ? [...m.querySelectorAll('.hx-cm-i')].map((b) => b.textContent.trim()) : null; });
  const o = {};
  o.st0 = await st();
  // a short tap: no menu, the loop's tap acts (as before)
  let [x, y] = await ring();
  await touch('touchStart', x, y); await page.waitForTimeout(120); await touch('touchEnd'); await page.waitForTimeout(400);
  o.tapMenu = await menu(); o.stTap = await st();
  await touch('touchStart', x, y); await page.waitForTimeout(120); await touch('touchEnd'); await page.waitForTimeout(400);   // (back)
  await page.waitForTimeout(2500); o.st1 = await st();
  // held 0.8 s: the menu, the loop as it was
  [x, y] = await ring();
  await touch('touchStart', x, y); await page.waitForTimeout(800);
  o.menuHeld = await menu();
  await touch('touchEnd'); await page.waitForTimeout(400);
  o.menuAfter = await menu(); o.stHeld = await st();
  o.box = await page.evaluate(() => { const m = document.querySelector('.hx-cm'); if (!m) return null; const r = m.getBoundingClientRect(); return [r.top, r.bottom, Math.min(...[...m.querySelectorAll('.hx-cm-i')].map((b) => b.getBoundingClientRect().height))]; });
  o.fingerY = y;
  await page.screenshot({ path: 'out/halten-menu.png' });
  // a tap on „Ansehen und bearbeiten …“: the editor
  await page.locator('.hx-cm .hx-cm-i', { hasText: 'Ansehen und bearbeiten' }).tap(); await page.waitForTimeout(600);
  o.ed = await page.evaluate(() => { const M = window.__M, e = M.HXE && M.HXE.ed; return !!(e && !e.hidden && e.getClientRects().length); });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // held again → „Karte – alle Einstellungen“: the card
  [x, y] = await ring();
  await touch('touchStart', x, y); await page.waitForTimeout(800); await touch('touchEnd'); await page.waitForTimeout(300);
  await page.locator('.hx-cm .hx-cm-i', { hasText: 'Karte' }).tap(); await page.waitForTimeout(700);
  o.card = await page.evaluate((s) => window.__M.UI.panel === 'rec' && !!document.getElementById('hxc-' + s), slot);
  // a tap outside closes a menu
  [x, y] = await ring();
  await touch('touchStart', x, y); await page.waitForTimeout(800); await touch('touchEnd'); await page.waitForTimeout(300);
  await touch('touchStart', 20, 300); await touch('touchEnd'); await page.waitForTimeout(300);
  o.closed = !(await menu());
  console.log(JSON.stringify(o));
  ok(!o.tapMenu && o.stTap !== o.st0, `a short tap: no menu, the ring acts (${o.st0} → ${o.stTap})`);
  ok(o.menuHeld && o.menuHeld.some((t) => /^Ansehen und bearbeiten/.test(t)) && o.menuHeld.some((t) => /^Karte/.test(t)) && o.menuHeld.some((t) => /Aufnahme \(WAV\)/.test(t)) && o.menuHeld.some((t) => /^Solo/.test(t)), `held: the menu while the finger lies (${(o.menuHeld || []).join(' | ')})`);
  ok(o.menuAfter && o.stHeld === o.st1, `lifting the finger: the menu stays, the loop as it was (${o.st1} → ${o.stHeld})`);
  ok(o.box && o.box[1] <= o.fingerY && o.box[2] >= 43.5, `the menu above the finger, its items finger-sized (${o.box && o.box.map((v) => Math.round(v)).join(', ')}; finger at ${Math.round(o.fingerY)})`);
  ok(o.ed, 'a tap on „Ansehen und bearbeiten“ opens the editor');
  ok(o.card, 'a tap on „Karte“ opens the card');
  ok(o.closed, 'a tap outside closes the menu');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); await browser.close(); process.exit(0);
})();
