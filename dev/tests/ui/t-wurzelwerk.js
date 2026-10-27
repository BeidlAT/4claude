// (owner, 27.10.2026) Wurzelwerk: tempo and key in the bar („frei“ before a tempo), the drawer, Säen (a tap sows, never
// changes the value; the spore at its home), the tempo's tools.   node t-wurzelwerk.js <outdir>  (server: setup-tests, slot hx)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
  await p.goto('http://127.0.0.1:8790/hx-inst/index.html'); await p.waitForFunction(() => !!window.__M);
  await p.click('#btnStart'); await p.waitForTimeout(1500);
  const o = {};
  o.tk0 = await p.textContent('.ww-tk');
  await p.screenshot({ path: (process.argv[2] || ".") + '/ww-bar.png', clip: { x: 0, y: 0, width: 1440, height: 60 } });
  await p.click('.ww-btn'); await p.waitForTimeout(400);
  o.open = await p.evaluate(() => !document.getElementById('ww').hidden);
  await p.screenshot({ path: (process.argv[2] || ".") + '/ww-open.png' });
  // sow: the tool, the Klang panel, a tap on Hall
  await p.click('.ww-saen'); await p.waitForTimeout(200);
  o.ban = await p.evaluate(() => !document.querySelector('.ww-ban').hidden);
  await p.evaluate(() => window.__M.openPanel('klang')); await p.waitForTimeout(400);
  const pid = await p.evaluate(() => { const w = [...document.querySelectorAll('#sheetBody [data-ww]')].find((x) => x.offsetParent && x.querySelector('input[type=range]')); return w && w.dataset.ww; });
  o.pid = pid;
  const rev0 = await p.evaluate((id) => window.__M.P[id], pid);
  const el = await p.$('#sheetBody [data-ww="' + pid + '"]');
  o.found = !!el;
  if (el) { await el.scrollIntoViewIfNeeded(); await p.screenshot({ path: (process.argv[2] || ".") + '/ww-saen.png' }); await el.click(); }
  await p.waitForTimeout(800);
  o.val = (await p.evaluate((id) => window.__M.P[id], pid)) === rev0;
  o.set = await p.evaluate(() => JSON.parse(localStorage.getItem('myzel.ww.v1') || '[]'));
  o.mark = await p.evaluate(() => !!document.querySelector('#sheetBody .ww-gesaet'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  o.reopen = await p.evaluate(() => !document.getElementById('ww').hidden);
  await p.screenshot({ path: (process.argv[2] || ".") + '/ww-gesaet.png' });
  // tempo: the Puls gives one
  await p.evaluate(() => { window.__M.setParam('seq.bpm', 92); window.__M.seqStart(); }); await p.waitForTimeout(600);
  o.tk1 = await p.textContent('.ww-tk');
  await p.click('.ww-tk'); await p.waitForTimeout(300);
  await p.screenshot({ path: (process.argv[2] || ".") + '/ww-pop.png', clip: { x: 300, y: 0, width: 840, height: 260 } });
  await p.click('.ww-pop .chip:text("2×")'); await p.waitForTimeout(500);
  o.tk2 = await p.textContent('.ww-tk');
  o.err = err;
  console.log(JSON.stringify(o, null, 1));
  const ok = (c, t) => console.log((c ? 'PASS ' : 'FAIL ') + t);
  ok(/frei/.test(o.tk0), 'no tempo yet: „frei“ in the bar');
  ok(o.open, 'the knot opens the Wurzelwerk');
  ok(o.ban && o.found && o.val && o.set.includes(o.pid) && o.mark, 'Säen: a tap sows ' + o.pid + ', its value untouched, a spore at its home');
  ok(o.reopen, 'Esc ends Säen and shows what was sown');
  ok(/92,0/.test(o.tk1) && /184,0/.test(o.tk2), 'the Puls gives the tempo; 2× doubles it');
  ok(!o.err.length, 'no page errors ' + o.err.join(' | '));
  await b.close();
})();
