// Klangquellen library: screenshots at five sizes (phone 390×844 and 360×740, landscape 844×390, iPad 1180×820,
// desktop 1280×800) of every place a source is chosen, the library open on each, search and favourites – into
// klang/shots/lib/ – and the measurements (section heights, field left playable, family row).
//   node t-lib-shots.js   (slot kl-inst, built by run-all.sh; KL_URL overrides)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib');
const OUT = __dirname + '/../shots/lib/';
const URL_ = process.env.KL_URL || 'http://127.0.0.1:8790/kl-inst/index.html';
const VPS = [
  { n: 'p390', w: 390, h: 844, m: true }, { n: 'p360', w: 360, h: 740, m: true }, { n: 'l844', w: 844, h: 390, m: true },
  { n: 'ipad', w: 1180, h: 820, m: true }, { n: 'd1280', w: 1280, h: 800, m: false },
];
const ONLY = process.env.VP ? process.env.VP.split(',') : null;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const res = {};
  for (const vp of VPS) {
    if (ONLY && !ONLY.includes(vp.n)) continue;
    const ctx = await browser.newContext(Object.assign({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 }, vp.m ? { isMobile: true, hasTouch: true } : {}));
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.setItem('myzel.klang.v1', JSON.stringify({ fav: ['hlm', 'glo', 'neb'], recent: ['sch', 'rnk', 'neb', 'tie'] })); } catch (e) {} });
    await page.goto(URL_); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(600);
    const shot = (name) => page.screenshot({ path: OUT + name + '-' + vp.n + '.png' });
    const wait = (ms) => page.waitForTimeout(ms);
    const r = {};
    await page.evaluate(() => window.__M.openPanel('klang')); await wait(350);
    r.klang = await page.evaluate(() => {
      const box = (e) => { const q = e.getBoundingClientRect(); return { y: Math.round(q.y), h: Math.round(q.height) }; };
      const sec = document.querySelector('#p-v-eng').closest('.sec'), sh = sec.querySelector('.sec-h'), row = document.querySelector('#p-v-eng'), g = sec.querySelector('.grid');
      return { sec: box(sec), head: box(sh), row: box(row), grid: box(g), body: box(document.querySelector('#sheetBody')), info: getComputedStyle(row.querySelector('.kq-i')).width };
    });
    await shot('klang');
    // the library from the field's row
    await page.click('#p-v-eng .kq-name'); await wait(400);
    r.lib = await page.evaluate(() => {
      const box = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; };
      const fams = document.querySelector('.kq-fams'), fr = fams.getBoundingClientRect();
      const vis = [...fams.querySelectorAll('.chip')].filter((c) => { const q = c.getBoundingClientRect(); return q.right <= fr.right + 0.5 && q.left >= fr.left - 0.5; }).map((c) => c.dataset.fam);
      const list = document.querySelector('.kq-list'), lr = list.getBoundingClientRect();
      const tiles = [...list.querySelectorAll('.kq-tile')].filter((t) => t.getBoundingClientRect().bottom <= lr.bottom + 0.5).length;
      return { stage: box(document.querySelector('#stage')), sheet: box(document.querySelector('#sheet')), lib: box(document.querySelector('#kqLib')), list: box(list), famsVisible: vis, tilesVisible: tiles, tiles: list.querySelectorAll('.kq-tile').length, quick: getComputedStyle(document.querySelector('#quick')).display, focus: document.activeElement && (document.activeElement.className || document.activeElement.id) };
    });
    await shot('lib');
    // all families, scrolled a little
    await page.click('.kq-fams .chip[data-fam="alle"]'); await wait(200);
    await page.evaluate(() => { document.querySelector('.kq-list').scrollTop = 420; }); await wait(150);
    await shot('lib-alle');
    await page.click('.kq-fams .chip[data-fam="fav"]'); await wait(200);
    await shot('lib-fav');
    await page.fill('#kqSearch', 'glas'); await wait(200);
    await page.fill('#kqSearch', 'bogen'); await wait(200);
    await shot('lib-search-empty');
    await page.fill('#kqSearch', 'atem'); await wait(200);
    await shot('lib-search');
    await page.click('.kq-done'); await wait(250);
    // the second layer (Aus) and its library
    await page.evaluate(() => { document.querySelector('#p-v-layer').scrollIntoView({ block: 'center' }); }); await wait(200);
    await shot('layer');
    await page.click('#p-v-layer .kq-name'); await wait(350);
    await shot('lib-layer');
    await page.click('.kq-done'); await wait(200);
    // a Puls lane
    await page.evaluate(() => window.__M.openPanel('puls')); await wait(350);
    await page.evaluate(() => { document.querySelector('#p-l0-eng').scrollIntoView({ block: 'end' }); }); await wait(200);
    r.lane = await page.evaluate(() => { const q = document.querySelector('#p-l0-eng').getBoundingClientRect(), hd = document.querySelector('.lanehead').getBoundingClientRect(); return { y: Math.round(q.y), h: Math.round(q.height), under: q.top < hd.bottom }; });
    await shot('lane');
    await page.click('#p-l0-eng .kq-name'); await wait(350);
    await shot('lib-lane');
    await page.click('.kq-done'); await wait(200);
    // the mixer's Fruchtkörper: Quelle of the channel Spur 2
    await page.evaluate(() => window.__M.openPanel('mix')); await wait(900);
    await page.evaluate(() => { const b = document.querySelector('.mx-st[data-k="l1"] .mx-sh'); if (b) b.click(); }); await wait(800);
    r.mixRow = await page.evaluate(() => { const e = document.querySelector('#mxd-p-l1-eng'); if (!e) return null; const q = e.getBoundingClientRect(); return { y: Math.round(q.y), h: Math.round(q.height), vis: q.height > 0 }; });
    await page.evaluate(() => { const e = document.querySelector('#mxd-p-l1-eng'); if (e) e.scrollIntoView({ block: 'center' }); }); await wait(200);
    await shot('mixer');
    if (r.mixRow && r.mixRow.vis) { await page.click('#mxd-p-l1-eng .kq-name'); await wait(400); await shot('lib-mixer'); r.mixTitle = await page.evaluate(() => document.querySelector('#kqTitle').textContent); await page.keyboard.press('Escape'); await wait(200); }
    r.mixAfterEsc = await page.evaluate(() => ({ lib: !document.querySelector('#kqLib').hidden, detail: !!window.__M.MX.detailK, panel: window.__M.UI.panel }));
    await page.evaluate(() => window.__M.closePanel()); await wait(200);
    // Sporenregen in the Gestik card
    await page.evaluate(async () => { const M = window.__M; M.gkSet('neigen', 'regen'); M.openPanel('dev'); await new Promise((r) => setTimeout(r, 300)); });
    await page.evaluate(async () => {
      const M = window.__M; M.gkEnable && M.gkEnable(true); await new Promise((r) => setTimeout(r, 500));
      const d = document.querySelector('details.gk-rg'); if (d) d.open = true; M.gkCardSync && M.gkCardSync();
      await new Promise((r) => setTimeout(r, 200));
      const e = document.querySelector('#gk-kq-rgS'); if (e) e.scrollIntoView({ block: 'center' });
    }); await wait(300);
    r.rain = await page.evaluate(() => { const e = document.querySelector('#gk-kq-rgS'); return e ? { vis: e.getClientRects().length > 0 } : null; });
    await shot('rain');
    if (r.rain && r.rain.vis) { await page.click('#gk-kq-rgS .kq-name'); await wait(350); await page.click('.kq-fams .chip[data-fam="alle"]'); await wait(200); await shot('lib-rain'); await page.click('.kq-done'); }
    // the bar's chip with a layer
    await page.evaluate(() => { const M = window.__M; M.closePanel(); M.setParam('v.eng', 'hlm'); M.setParam('v.layer', 'glo'); }); await wait(300);
    await page.screenshot({ path: OUT + 'bar-' + vp.n + '.png', clip: { x: 0, y: 0, width: vp.w, height: 60 } });
    r.errors = errors;
    res[vp.n] = r;
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1));
  for (const n in res) L.ok(!res[n].errors.length, n + ': no console errors (' + res[n].errors.slice(0, 2).join(' | ') + ')');
  if (res.p360) {
    L.ok(res.p360.klang.sec.h <= 160, 'p360: the section „Klangquelle“ is ' + res.p360.klang.sec.h + ' px high (row ' + res.p360.klang.row.h + ', was 355)');
    L.ok(res.p360.lib.stage.h >= 118 && res.p360.lib.quick === 'none', 'p360: the library leaves ' + res.p360.lib.stage.h + ' px of field, quick strip hidden');
    L.ok(res.p360.lib.tilesVisible >= Math.min(7, res.p360.lib.tiles), 'p360: every tile of the family in view without scrolling (' + res.p360.lib.tilesVisible + '/' + res.p360.lib.tiles + ')');
  }
  await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
