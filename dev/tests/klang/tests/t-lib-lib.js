// Klangquellen: the library – opens on the family of the chosen source, in the grown sheet (field still playable, quick
// strip gone); search (ö/oe, tags, German/English), family chips, ★ persisted in myzel.klang.v1, ⟲ the six last without
// the current one, a tap chooses + probes and keeps it open, ▶ hears without choosing, ⚄ from the tiles in view, the
// layer's „Aus“ tile, the rain's held sources grey; Fertig / ‹ / Esc / swipe close, the probe ends, focus returns.
//   node t-lib-lib.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib'), K = require('./klh');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors, ctx } = await K.open(browser, { w: 360, h: 740, store: { 'myzel.klang.v1': JSON.stringify({ fav: ['glo', 'rhz'], recent: [] }) } });
  const M = (fn, a) => page.evaluate(fn, a);
  const st = () => M(() => {
    const lib = document.querySelector('#kqLib');
    return { open: lib && !lib.hidden, fam: [...document.querySelectorAll('.kq-fams .chip')].filter((c) => c.getAttribute('aria-checked') === 'true').map((c) => c.dataset.fam).join(),
      tiles: [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k), on: [...document.querySelectorAll('.kq-pick[aria-checked="true"]')].map((p) => p.closest('.kq-tile').dataset.k).join(),
      live: document.querySelector('.kq-live') && document.querySelector('.kq-live').textContent, focus: document.activeElement && document.activeElement.closest('.kq-tile') ? 'tile:' + document.activeElement.closest('.kq-tile').dataset.k : document.activeElement && (document.activeElement.id || document.activeElement.className) };
  });
  await M(() => { window.__M.setParam('v.eng', 'sch'); window.__M.openPanel('klang'); }); await page.waitForTimeout(250);
  const before = await M(() => ({ stage: Math.round(document.querySelector('#stage').getBoundingClientRect().height), sheet: Math.round(document.querySelector('#sheet').getBoundingClientRect().height) }));
  await page.click('#p-v-eng .kq-name'); await page.waitForTimeout(300);
  let s = await st();
  let r = await M(() => ({ stage: Math.round(document.querySelector('#stage').getBoundingClientRect().height), sheet: Math.round(document.querySelector('#sheet').getBoundingClientRect().height), quick: getComputedStyle(document.querySelector('#quick')).display, exp: document.querySelector('#p-v-eng .kq-name').getAttribute('aria-expanded'), dl: document.querySelector('#sheet').dataset.lib, title: document.querySelector('#kqTitle').textContent }));
  L.ok(s.open && s.fam === 'erz' && s.tiles.join() === 'glo,sch,gng,klb' && s.on === 'sch' && s.focus === 'tile:sch', 'opens on Erz (the family of Schale): ' + s.tiles + ', Schale checked and focused');
  L.ok(r.sheet > before.sheet && r.stage >= 118 && r.quick === 'none' && r.exp === 'true' && r.dl === 'v.eng', 'the sheet grows ' + before.sheet + ' → ' + r.sheet + ' px, ' + r.stage + ' px of field stay, quick strip hidden, aria-expanded');
  L.ok(/Klangquelle für\s*spielfläche/i.test(r.title), 'title „' + r.title + '“');
  // the field stays playable under the open library
  r = await M(async () => { const M = window.__M; M.onDown({ pointerId: 9, pointerType: 'touch', pt: { x: 0.5, y: 0.5, px: 100, py: 60 } }); await window.__sleep(80); const n = [...M.A.voices].filter((v) => v.alive && !v.probe && v.eng === 'sch').length; M.onUp({ pointerId: 9, pointerType: 'touch' }); return n; });
  const fb = await page.locator('#cvFx').boundingBox();
  L.ok(r > 0 && fb.height >= 118, 'a finger on the field (' + Math.round(fb.height) + ' px) plays Schale while the library is open');
  // tap a tile: choose + probe, stays open
  await page.click('.kq-tile[data-k="glo"] .kq-pick'); await page.waitForTimeout(120);
  s = await st(); r = await K.probes(page);
  L.ok(s.open && s.on === 'glo' && (await M(() => window.__M.P['v.eng'])) === 'glo' && r.some((v) => v.eng === 'glo') && /Glocke gewählt für die Spielfläche/.test(s.live), 'a tap chooses Glocke, plays it (' + r.map((v) => v.eng) + '), keeps the library open, says „' + s.live + '“');
  // ▶ hears without choosing
  await page.click('.kq-tile[data-k="klb"] .kq-hear'); await page.waitForTimeout(120);
  r = await K.probes(page);
  L.ok((await M(() => window.__M.P['v.eng'])) === 'glo' && r.length === 1 && r[0].eng === 'klb', '▶ Kalimba: heard (one probe), not chosen');
  // long press on a tile: held probe, vertical drag moves the height
  const tb = await page.locator('.kq-tile[data-k="gng"] .kq-pick').boundingBox();
  await page.mouse.move(tb.x + 60, tb.y + tb.height / 2); await page.mouse.down(); await page.waitForTimeout(500);
  r = await K.probes(page);
  await page.mouse.up(); await page.waitForTimeout(80);
  L.ok(r.some((v) => v.eng === 'gng') && (await M(() => window.__M.P['v.eng'])) === 'glo', 'a long press on Gong plays it held without choosing it');
  // families and search
  await page.click('.kq-fams .chip[data-fam="luft"]'); await page.waitForTimeout(80);
  s = await st();
  L.ok(s.fam === 'luft' && s.tiles.join() === 'hau,obt,stm,hlm,elm', 'Luft: ' + s.tiles);
  await page.click('.kq-fams .chip[data-fam="alle"]'); await page.waitForTimeout(80);
  s = await st();
  r = await M(() => [...document.querySelectorAll('.kq-fh')].map((h) => h.firstChild.textContent));
  L.ok(s.tiles.length === 20 && r.join() === 'Luft,Dunst,Holz,Erz,Erde', 'Alle: 20 tiles under five sticky heads');
  const search = async (q) => { await page.fill('#kqSearch', q); await page.waitForTimeout(60); return (await st()).tiles; };
  r = { oe: await search('koerner'), uml: await search('Körner'), bow: await search('flute'), fam: await search('erz'), art: await search('schlägt'), bass: await search('808'), none: await search('qqq') };
  s = await st();
  L.ok(r.oe.join() === 'kor' && r.uml.join() === 'kor', 'search: „koerner“ = „Körner“ → ' + r.oe);
  L.ok(r.bow.includes('hlm') && r.fam.join() === 'glo,sch,gng,klb' && r.bass.includes('tie') && r.art.length === 9, 'tags in English („flute“ → Halm), family („erz“), „808“ → Tiefe, „schlägt“ → ' + r.art.length);
  r.empty = await M(() => document.querySelector('.kq-empty') && document.querySelector('.kq-empty').textContent);
  L.ok(!r.none.length && /Nichts gefunden/.test(r.empty) && s.fam === '' && /Keine Treffer/.test(s.live), 'nothing found: „' + r.empty.slice(0, 40) + '…“, no family checked');
  await page.fill('#kqSearch', '');
  // favourites: ★ persisted, a key this version lacks stays stored but is not shown
  await page.click('.kq-fams .chip[data-fam="fav"]'); await page.waitForTimeout(60);
  s = await st();
  L.ok(s.tiles.join() === 'glo', '★ Favoriten from myzel.klang.v1: ' + s.tiles + ' (the unknown „rhz“ not shown)');
  await page.click('.kq-fams .chip[data-fam="dunst"]'); await page.waitForTimeout(60);
  await page.click('.kq-tile[data-k="swm"] .kq-fav'); await page.waitForTimeout(60);
  r = await M(() => ({ st: JSON.parse(localStorage.getItem('myzel.klang.v1')), pr: document.querySelector('.kq-tile[data-k="swm"] .kq-fav').getAttribute('aria-pressed') }));
  L.ok(r.pr === 'true' && r.st.fav.join() === 'glo,rhz,swm', '★ on Schwarm: pressed, stored ' + r.st.fav);
  await page.click('.kq-tile[data-k="swm"] .kq-fav'); await page.waitForTimeout(60);
  r = await M(() => JSON.parse(localStorage.getItem('myzel.klang.v1')).fav.join());
  L.ok(r === 'glo,rhz', 'again: no longer a favourite (' + r + ')');
  // recent: chosen across places, ≤ 6, without the current one; hearing adds nothing
  r = await M(async () => {
    const M = window.__M;
    for (const k of ['hau', 'obt', 'stm', 'neb', 'kor', 'swm', 'rnk', 'sai']) M.setParam('v.eng', k);
    M.setParam('l0.eng', 'tie');
    M.kqHear(M.kqTarget('v.eng'), 'trp');
    document.querySelector('.kq-fams .chip[data-fam="recent"]').click(); await window.__sleep(50);
    return { tiles: [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k), st: JSON.parse(localStorage.getItem('myzel.klang.v1')).recent };
  });
  L.ok(r.tiles.join() === 'tie,rnk,swm,kor,neb,stm' && !r.st.includes('trp'), '⟲ Zuletzt: ' + r.tiles + ' – six, without Saite (chosen now), the lane counts, hearing (Tropfen) not');
  // ⚄ in the footer: a visible allowed tile ≠ current
  await page.click('.kq-fams .chip[data-fam="erz"]'); await page.waitForTimeout(60);
  await page.click('.kq-sur'); await page.waitForTimeout(80);
  s = await st(); r = await M(() => window.__M.P['v.eng']);
  L.ok(['glo', 'sch', 'gng', 'klb'].includes(r) && s.on === r && /^Zufall: /.test(s.live), '⚄ picks from the tiles in view: ' + r + ' („' + s.live + '“)');
  // close: Fertig, ‹, Esc, swipe – the probe ends, focus returns to the opener
  for (const how of ['Fertig', 'Zurück', 'Escape', 'swipe']) {
    await page.focus('#p-v-eng .kq-name'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    await M(() => window.__M.kqHear(window.__M.kqTarget('v.eng'), 'neb', true)); await page.waitForTimeout(50);
    if (how === 'Fertig') await page.click('.kq-done');
    else if (how === 'Zurück') await page.click('.kq-back');
    else if (how === 'Escape') await page.keyboard.press('Escape');
    else { const hb = await page.locator('.kq-head h2').boundingBox(); await page.mouse.move(hb.x + 30, hb.y + 10); await page.mouse.down(); await page.mouse.move(hb.x + 30, hb.y + 50, { steps: 4 }); await page.mouse.move(hb.x + 30, hb.y + 90, { steps: 4 }); await page.mouse.up(); }
    await page.waitForTimeout(150);
    r = await M(() => ({ open: !document.querySelector('#kqLib').hidden, dl: document.querySelector('#sheet').dataset.lib, panel: window.__M.UI.panel, pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).length, foc: document.activeElement && document.activeElement.classList.contains('kq-name') && !!document.activeElement.closest('#p-v-eng'), exp: document.querySelector('#p-v-eng .kq-name').getAttribute('aria-expanded') }));
    L.ok(!r.open && !r.dl && r.panel === 'klang' && r.pr === 0 && (how === 'swipe' || r.foc) && r.exp === 'false', how + ' closes it (panel stays, probe ended, focus back on the name)');
  }
  // the probe ends with Stille and with a change of panel
  r = await M(async () => {
    const M = window.__M, T = M.kqTarget('v.eng'); M.kqOpen(T); M.kqHear(T, 'neb', true); await window.__sleep(40);
    document.querySelector('#btnPanic').click(); await window.__sleep(30);
    const a = [...M.A.voices].filter((v) => v.alive && v.probe && !v.released).length;
    M.kqHear(T, 'neb', true); M.openPanel('fx'); await window.__sleep(30);
    return { a, b: [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd && !v.released).length, open: !document.querySelector('#kqLib').hidden };
  });
  L.ok(r.a === 0 && r.b === 0 && !r.open, 'Stille ends a held probe; another panel closes the library and ends it');
  // the second layer: an „Aus“ tile only there, opens on the field's family when off
  r = await M(async () => {
    const M = window.__M; M.setParam('v.eng', 'tie'); M.setParam('v.layer', 'off'); M.openPanel('klang'); await window.__sleep(50);
    document.querySelector('#p-v-layer .kq-name').click(); await window.__sleep(100);
    const o = { tiles: [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k), on: document.querySelector('.kq-pick[aria-checked="true"]').closest('.kq-tile').dataset.k };
    document.querySelector('.kq-tile[data-k="mem"] .kq-pick').click(); await window.__sleep(50); o.layer = M.P['v.layer'];
    document.querySelector('.kq-tile[data-k="off"] .kq-pick').click(); await window.__sleep(50); o.off = M.P['v.layer'];
    M.kqClose(); document.querySelector('#p-v-eng .kq-name').click(); await window.__sleep(80);
    o.fieldOff = !!document.querySelector('.kq-tile[data-k="off"]'); M.kqClose(); M.setParam('v.eng', 'neb');
    return o;
  });
  L.ok(r.tiles.join() === 'off,tie,mem,trp,mdr' && r.on === 'off' && r.layer === 'mem' && r.off === 'off' && !r.fieldOff, 'layer: opens on Erde (the field plays Tiefe) with „Aus“ first and checked; Membran, then Aus again; the field has no „Aus“');
  // the rain: held sources grey with the reason, not chosen by a tap
  r = await M(async () => {
    const M = window.__M; M.gkSet('rgS', 'trp'); const T = M.kqTarget('rgS'); M.kqOpen(T, { where: 'Sporenregen' }); await window.__sleep(80);
    const o = { tiles: [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k + (t.querySelector('.kq-pick').getAttribute('aria-disabled') === 'true' ? '-' : '')), why: document.querySelector('.kq-why') && document.querySelector('.kq-why').textContent };
    document.querySelector('.kq-tile[data-k="tie"] .kq-pick').click(); await window.__sleep(40);
    o.rgS = M.GK.p.rgS; o.live = document.querySelector('.kq-live').textContent;
    document.querySelector('.kq-fams .chip[data-fam="erz"]').click(); await window.__sleep(40);
    o.gng = document.querySelector('.kq-tile[data-k="gng"] .kq-i').textContent;
    document.querySelector('.kq-tile[data-k="klb"] .kq-pick').click(); await window.__sleep(40); o.klb = M.GK.p.rgS;
    o.lab = document.querySelector('.kq-tile[data-k="gng"] .kq-pick').getAttribute('aria-label');
    M.kqClose(); M.gkSet('rgS', 'trp');
    return o;
  });
  L.ok(r.tiles.join() === 'tie-,mem,trp,mdr' && /gehaltene Quellen sind hier grau/.test(r.why) && r.rgS === 'trp' && /Tiefe: hält/.test(r.live), 'rain: Tiefe grey (' + r.tiles + '), the reason in the head, a tap does not choose it („' + r.live + '“)');
  L.ok(/blüht zu lange/i.test(r.gng) && /Nicht für den Sporenregen/.test(r.lab) && r.klb === 'klb', 'Gong grey with its own reason („' + r.gng + '“, ' + r.lab + '); Kalimba chosen (' + r.klb + ')');
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close(); await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
