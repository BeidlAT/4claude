// (owner, 26.10.2026) Klangwelten: every preset card wears its picture (drawn, not empty); the one under the pointer
// moves, the playing one too; a click loads it and marks it; Myzel opens with Leere Erde (dry, no Puls lane) – with
// „Beim Öffnen mit Leerer Erde beginnen“ off it opens with the last sound.        node t-kb.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { window.__leer = true; });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  const start = await page.evaluate(() => { const M = window.__M; return { rev: M.P['rev.mix'], dly: M.P['dly.mix'], lanes: [0, 1, 2, 3].map((i) => M.P['l' + i + '.on']).filter(Boolean).length, leer: M.P['ui.leer'] }; });
  await page.click('#btnStart'); await page.waitForTimeout(900);
  await page.evaluate(() => window.__M.openPanel('presets')); await page.waitForTimeout(900);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    const cards = [...document.querySelectorAll('.pcard.kb')]; o.n = cards.length;
    // the first rows are in view: their pictures drawn (pixels not all the same)
    const drawn = (cv) => { const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); } return cv.width > 10 && mx - mn > 60; };
    o.drawn = cards.slice(0, 6).filter((c) => drawn(c.querySelector('.kb-art'))).length;
    o.cur0 = cards[0].getAttribute('aria-current') + ':' + cards[0].querySelector('b').textContent;
    o.foot = cards[1].querySelector('.kb-foot').textContent;
    o.puls = !!cards[3].querySelector('.kb-puls');
    // every motif draws without an error, the whole collection
    o.all = 0; for (const p of [M.PRESET_LEER].concat(M.PRESETS)) { const cv = document.createElement('canvas'); cv.width = 200; cv.height = 125; try { M.kbDraw(cv.getContext('2d'), 200, 125, M.kbSpec(p), 3); o.all++; } catch (e) { o.err = p.key + ': ' + e.message; } }
    return o;
  });
  // hover moves; a click loads
  const cards = await page.$$('.pcard.kb');
  const box = await cards[4].boundingBox(); await page.mouse.move(box.x + 30, box.y + 30);
  const sig = (i) => page.evaluate((i) => document.querySelectorAll('.kb-art')[i].toDataURL().length, i);
  const h1 = await sig(4); await page.waitForTimeout(600); const h2 = await sig(4);
  await cards[2].click(); await page.waitForTimeout(500);
  const after = await page.evaluate(() => { const M = window.__M, c = document.querySelectorAll('.pcard.kb'); return { cur: c[2].getAttribute('aria-current'), first: c[0].getAttribute('aria-current'), preset: M.UI ? M.UI.preset : null, rev: M.P['rev.mix'] }; });
  // the switch off: the next opening brings the last sound back
  await page.evaluate(() => { window.__M.setParam('ui.leer', false); window.__M.saveState && window.__M.saveState(); });
  await page.waitForTimeout(300);
  await page.reload(); await page.waitForFunction(() => !!window.__M);
  const back = await page.evaluate(() => ({ rev: window.__M.P['rev.mix'], leer: window.__M.P['ui.leer'] }));
  console.log(JSON.stringify({ start, r, h: [h1, h2], after, back }));
  ok(start.leer === true && start.rev === 0 && start.dly === 0 && start.lanes === 0, `opens with Leere Erde: Hall ${start.rev}, Echo ${start.dly}, ${start.lanes} Puls lanes`);
  ok(r.n === 48 && r.drawn === 6 && r.all === 48, `48 cards, the visible ones drawn (${r.drawn}/6), every motif draws (${r.all}/48)${r.err ? ' – ' + r.err : ''}`);
  ok(r.cur0 === 'true:Leere Erde' && /Hira/.test(r.foot) && /58/.test(r.foot) && r.puls, `Leere Erde marked; a card's line: „${r.foot}“, Puls rows shown`);
  ok(h1 !== h2, 'the card under the pointer moves');
  ok(after.cur === 'true' && after.first === 'false' && after.rev > 0.3, `a click loads Tempelglocken and marks it (Hall ${after.rev})`);
  ok(back.leer === false && back.rev > 0.3, `switch off: the last sound comes back after a reload (Hall ${back.rev})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
