// One touch tap, one action (UI audit B1, 24.10.2026): on a phone Chromium follows a touch tap that changed the layout
// with a click of detail 0 – the Ringleiste took it for a key press and acted again (the Korb harvested and cancelled, the
// Hauptknopf closed a loop and began a new recording, ↶ undid two steps). An Android phone emulated, every tap a real
// CDP touch on the real button; window.__M only reads.
//   node t-hx-tap.js        (slot hx: sh ../v2/mk.sh /home/user/4claude/myzel hx – run-all.sh builds it)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const H = require('./hx-h');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const PHONE = { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(600);
  const tap = async (sel) => { const r = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };   // (Playwright's tap: the touch and the click Chromium makes of it)
  await tap('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(1500);
  const s = () => page.evaluate(() => { const M = window.__M; return { loops: M.hxLoopsLive().length, pend: M.HX.pend.length, rec: M.HX.rec ? M.HX.rec.phase : null, hist: M.HX.hist.length, said: (window.__said || []).slice() }; });
  // what the rail announces (each action says itself once)
  await page.evaluate(() => { window.__said = []; const L = document.getElementById('hxLive'); new MutationObserver(() => { if (L.textContent) window.__said.push(L.textContent); }).observe(L, { childList: true, characterData: true, subtree: true }); });
  // the Korb: a phrase, one tap – one Schleife (pending to the seam, then there), never cancelled. The phrase by mouse, as
  // the audit's repro plays it: after it Chromium sends each touch tap's click with detail 0 (the build before: Korb
  // „Ernte abgebrochen“, the Hauptknopf started and cancelled, ↶ two steps)
  const st = await page.locator('#stage').boundingBox();
  for (let k = 0; k < 3; k++) for (const [fx, fy] of [[0.15, 0.5], [0.35, 0.4], [0.55, 0.5], [0.45, 0.6]]) { await page.mouse.move(st.x + fx * st.width, st.y + fy * st.height); await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up(); await page.waitForTimeout(300); }
  const k0 = await s(); await tap('#hxKorb'); await page.waitForTimeout(5000); const k2 = await s(); const ks = k2.said.slice(k0.said.length);
  ok(k2.loops === k0.loops + 1 && ks.filter((x) => /beginnt an der Naht/.test(x)).length === 1 && !ks.some((x) => /abgebrochen/i.test(x)), `Korb: one tap – one Schleife (loops ${k0.loops} → ${k2.loops}), harvested once, not cancelled (${ks.join(' | ')})`);
  // the Hauptknopf: one tap starts a recording (it stays); one tap while it records closes it – no new one begins
  const h0 = await s(); await tap('#hxHaupt'); await page.waitForTimeout(1500); const h1 = await s();
  ok(h0.rec == null && h1.rec != null, `Hauptknopf: one tap – a recording begins and stays (${h0.rec} → ${h1.rec})`);
  await page.waitForFunction(() => window.__M.HX.rec && window.__M.HX.rec.phase === 'rec', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);   // (soon after it began: a recording of fixed length closes itself at its end – a tap after that would rightly begin a new one)
  const h2 = await s(); await tap('#hxHaupt'); await page.waitForTimeout(600); const h3 = await s(); await page.waitForTimeout(3000); const h4 = await s();
  ok(h2.rec === 'rec' && h3.rec == null && h4.rec == null && h4.loops >= 2, `Hauptknopf: one tap while it records – closed (loops ${h4.loops}), no new recording begins (${h3.rec}, ${h4.rec})`);
  // ↶: one tap – one step back
  await page.waitForTimeout(3000);
  const u0 = await s(); await tap('#hxUndo'); await page.waitForTimeout(1500); const u1 = await s(), us = u1.said.slice(u0.said.length);
  ok(u0.hist >= 2 && ((u0.pend === 0 && u1.hist === u0.hist - 1) || (u0.pend > 0 && u1.pend === u0.pend - 1 && u1.hist === u0.hist)) && us.length === 1, `↶: one tap – one step back (history ${u0.hist} → ${u1.hist}, pending ${u0.pend} → ${u1.pend}; said ${us.join(' | ')})`);
  ok(!errors.length, `no error (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
  process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exit(1); });
