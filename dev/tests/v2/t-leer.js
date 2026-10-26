// (owner, 26.10.2026) „Leere Erde“: the first card loads a plain, dry sound (no Hall, Echo, Puls lane, layer, Bordun);
// the program numbers stay those of the other presets; the Spielhilfe folds, without the Gestik line.   node t-leer.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    M.openPanel('presets'); await sl(400);
    const first = document.querySelector('.pcard'); o.first = first && first.querySelector('b').textContent;
    first.click(); await sl(300);
    o.v = ['rev.mix', 'dly.mix', 'v.layer', 'bor.on', 'l0.on', 'l1.on', 'flt.freq'].map((k) => M.P[k]);
    o.cur = first.getAttribute('aria-current');
    o.pc0 = M.PRESETS[0].key !== 'leer';
    const fb = [...document.querySelectorAll('.fold-b')].find((b) => /Spielhilfe/.test(b.textContent));
    o.fold = !!fb; o.closed = fb && fb.getAttribute('aria-expanded');
    if (fb) { fb.click(); await sl(100); o.open = fb.getAttribute('aria-expanded'); }
    const help = document.querySelector('ul.help'); o.items = help ? help.children.length : 0; o.gestik = help ? /Gestik:/.test(help.textContent) : null;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.first === 'Leere Erde' && r.cur === 'true', `the first card: ${r.first}, marked current`);
  ok(JSON.stringify(r.v) === JSON.stringify([0, 0, 'off', false, false, false, 18000]), `dry and plain: ${r.v.join(', ')}`);
  ok(r.pc0, 'the program numbers stay those of the other presets');
  ok(r.fold && r.closed === 'false' && r.open === 'true' && r.items > 5 && r.gestik === false, `Spielhilfe folds (closed at first), ${r.items} points, no Gestik line`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
