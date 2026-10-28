// (28.10.2026) Wurzelwerk, Etappe 2: Suche – „/“ opens the Wurzelwerk with the search field focused; a word finds the
// settings (name, group, choices; umlauts and ß either way) and the actions; a found control sets its param; the spore
// sows it; Esc clears the search, then closes.   node t-ww-suche.js <outdir>  (server: setup-tests, slot hx)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
  await p.goto('http://127.0.0.1:8790/hx-inst/index.html'); await p.waitForFunction(() => !!window.__M);
  await p.click('#btnStart'); await p.waitForTimeout(1500);
  await p.evaluate(() => { localStorage.setItem('myzel.ww.v1', '["ui.tonart"]'); window.__M.WW.set = new Set(['ui.tonart']); });
  const o = {}, ids = () => p.evaluate(() => [...document.querySelectorAll('#ww .ww-res [data-ww], #ww .ww-res .ww-act')].map((x) => x.dataset.ww || 'a'));
  await p.mouse.click(700, 500); await p.keyboard.press('Escape');
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('/'); await p.waitForTimeout(400);
  o.open = await p.evaluate(() => !document.getElementById('ww').hidden && document.activeElement && document.activeElement.classList.contains('ww-q'));
  await p.keyboard.type('hall'); await p.waitForTimeout(300);
  o.hall = await ids();
  o.groupsHidden = await p.evaluate(() => document.querySelector('#ww .ww-grid').hidden);
  await p.screenshot({ path: (process.argv[2] || '.') + '/ww-suche.png' });
  await p.fill('.ww-q', 'warme'); await p.waitForTimeout(300); o.umlaut = await ids();   // (Wärme without the umlaut)
  await p.fill('.ww-q', 'filter frequenz'); await p.waitForTimeout(300); o.two = await ids();
  await p.fill('.ww-q', 'instrument'); await p.waitForTimeout(300); o.instr = await ids();
  await p.fill('.ww-q', 'zzqx'); await p.waitForTimeout(300); o.none = await p.evaluate(() => document.querySelector('#ww .ww-res').textContent);
  // a found control sets its param: Echo-Anteil via its slider
  await p.fill('.ww-q', 'echo anteil'); await p.waitForTimeout(300);
  o.echo = await ids();
  o.set = await p.evaluate(() => { const inp = document.querySelector('#ww .ww-res [data-ww="dly.mix"] input[type=range]'); if (!inp) return null; inp.value = inp.max; inp.dispatchEvent(new Event('input', { bubbles: true })); return window.__M.P['dly.mix']; });
  // the spore sows it
  await p.click('#ww .ww-res .ww-qt:has([data-ww="dly.mix"]) .ww-qs'); await p.waitForTimeout(300);
  o.sown = await p.evaluate(() => JSON.parse(localStorage.getItem('myzel.ww.v1') || '[]'));
  // Esc: first the search, then the drawer
  await p.focus('.ww-q'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  o.cleared = await p.evaluate(() => document.querySelector('.ww-q').value === '' && !document.querySelector('#ww .ww-grid').hidden && document.getElementById('ww').hidden === false);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  o.closed = await p.evaluate(() => document.getElementById('ww').hidden);
  console.log(JSON.stringify(o));
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
  ok(o.open, '„/“ opens the Wurzelwerk, the search field focused');
  ok(o.hall.includes('rev.mix') && o.groupsHidden, 'hall: the Hall settings found, the groups give way (' + o.hall.slice(0, 5).join(', ') + ')');
  ok(o.umlaut.length > 0, 'warme finds Wärme (' + o.umlaut.slice(0, 4).join(', ') + ')');
  ok(o.two[0] === 'flt.freq', 'two words: Filter Frequenz first (' + o.two.slice(0, 3).join(', ') + ')');
  ok(o.instr.includes('ui.instrument'), 'instrument: the new switch is found');
  ok(/Nichts gefunden/.test(o.none), 'nothing found: said so');
  ok(o.echo.includes('dly.mix') && o.set > 0.9, 'a found slider sets its param (Echo Anteil ' + o.set + ')');
  ok(o.sown.includes('dly.mix'), 'its spore sows it into the Wurzelwerk');
  ok(o.cleared && o.closed, 'Esc clears the search, then closes');
  ok(!err.length, 'no page errors ' + err.slice(0, 3).join(' | '));
  console.log(`== ${pass} passed, ${fail} failed`);
  await b.close(); process.exit(0);
})();
