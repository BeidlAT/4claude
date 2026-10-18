// Klangquellen: keyboard only and screen reader – roles and labels, the row by Tab and arrows, the library as a modal
// dialog (focus trap, Esc, focus back), the family radiogroup and the tile radiogroup with roving tabindex (↑ ↓ Home End,
// a letter jumps, Space/Enter choose, f ★, h ▶, Shift+Space holds), live words, 44 px targets, reduced motion.
//   node t-lib-a11y.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib'), K = require('./klh');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors, ctx } = await K.open(browser, { mobile: false, reduced: true });
  const M = (fn, a) => page.evaluate(fn, a);
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) await page.keyboard.press(k); await page.waitForTimeout(40); };
  const foc = () => M(() => { const a = document.activeElement; if (!a) return ''; const t = a.closest('.kq-tile'); if (t) return 'tile:' + t.dataset.k + (a.classList.contains('kq-pick') ? '' : ':' + a.className); if (a.closest('.kq-fams')) return 'fam:' + a.dataset.fam; return a.id || a.className || a.tagName; });
  await M(() => window.__M.openPanel('klang')); await page.waitForTimeout(200);
  // Tab reaches the row: ‹ name › in this order, after the die in the head
  await M(() => document.querySelector('#sheetTitle').closest('.sheet-head').querySelector('button').focus());
  const order = [];
  for (let i = 0; i < 8; i++) { await key('Tab'); order.push(await M(() => { const a = document.activeElement; return a.classList.contains('kq-dice') ? 'dice' : a.classList.contains('kq-step') ? (a.getAttribute('aria-label').startsWith('Vorige') ? 'prev' : 'next') : a.classList.contains('kq-name') ? 'name' : a.id || a.tagName; })); }
  const seq = order.join(' ');
  L.ok(/dice prev name next/.test(seq), 'Tab order in the section: ' + seq);
  // the prev button is disabled at Hauch (no tab stop) – here Nebel: all three
  await M(() => document.querySelector('#p-v-eng .kq-name').focus());
  await key('Enter'); await page.waitForTimeout(150);
  let r = await M(() => {
    const d = document.querySelector('#kqLib'), t = document.querySelector('#kqTitle');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), lb: d.getAttribute('aria-labelledby') === t.id, fams: document.querySelector('.kq-fams').getAttribute('role'), famL: document.querySelector('.kq-fams').getAttribute('aria-label'), list: document.querySelector('.kq-list').getAttribute('role'), desc: document.querySelector('#' + document.querySelector('.kq-list').getAttribute('aria-describedby')).textContent,
      radios: [...document.querySelectorAll('.kq-pick')].every((p) => p.getAttribute('role') === 'radio'), tabs: [...document.querySelectorAll('.kq-pick')].filter((p) => p.tabIndex === 0).length, side: [...document.querySelectorAll('.kq-fav, .kq-hear')].every((b) => b.tabIndex === -1 && b.getAttribute('aria-label')),
      live: document.querySelector('.kq-live').getAttribute('aria-live'), lab: document.querySelector('.kq-pick[aria-checked="true"]').getAttribute('aria-label'), anim: getComputedStyle(d).animationName,
      small: [...d.querySelectorAll('button, input')].filter((b) => b.getClientRects().length && (b.getBoundingClientRect().height < 40 || b.getBoundingClientRect().width < 40)).map((b) => b.className || b.id) };
  });
  L.ok(r.role === 'dialog' && r.modal === 'true' && r.lb && r.fams === 'radiogroup' && r.famL === 'Familie' && r.list === 'radiogroup' && /Pfeiltasten/.test(r.desc), 'dialog (aria-modal, labelled by its title); radiogroups „Familie“ and „Klangquelle“ described by the keys');
  L.ok(r.radios && r.tabs === 1 && r.side && r.live === 'polite', 'tiles are radios with one tab stop; ★ and ▶ have labels and no tab stop; a polite live line');
  L.ok(/^Nebel, Dunst, hält, Kosten mittel, etwa \d+ Stimmen\. Schwebende Flächen/.test(r.lab), 'tile label: „' + r.lab + '“');
  L.ok(r.anim === 'none' && !r.small.length, 'reduced motion: no slide-in; every target ≥ 40 px (' + r.small.join() + ')');
  L.ok((await foc()) === 'kqSearch', 'with a fine pointer the search has the focus');
  // ↓ from the search to the checked tile; ↓ ↑ End Home; a letter jumps
  await key('ArrowDown'); let f1 = await foc();
  await key('ArrowDown'); let f2 = await foc(); await key('End'); const f3 = await foc(); await key('Home'); const f4 = await foc();
  await key('s'); const f5 = await foc();
  L.ok(f1 === 'tile:neb' && f2 === 'tile:kor' && f3 === 'tile:swm' && f4 === 'tile:neb' && f5 === 'tile:swm', 'search ↓ Nebel, ↓ Körner, End Schwarm, Home Nebel, „s“ Schwarm');
  r = await M(() => [...document.querySelectorAll('.kq-pick')].map((p) => p.tabIndex).join());
  L.ok(r === '-1,-1,0', 'roving tabindex follows the focus (' + r + ')');
  // Space chooses and probes; stays open, focus stays
  await key('Space');
  r = await M(() => ({ eng: window.__M.P['v.eng'], pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.eng), live: document.querySelector('.kq-live').textContent }));
  f1 = await foc();
  L.ok(r.eng === 'swm' && r.pr.includes('swm') && f1 === 'tile:swm' && /Schwarm gewählt/.test(r.live), 'Space chooses Schwarm, plays it, the focus stays, „' + r.live + '“');
  await key('ArrowUp'); await key('h');
  r = await M(() => ({ eng: window.__M.P['v.eng'], pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.eng) }));
  L.ok(r.eng === 'swm' && r.pr.join() === 'kor', 'h hears Körner without choosing it');
  await key('f');
  r = await M(() => ({ fav: JSON.parse(localStorage.getItem('myzel.klang.v1') || '{}').fav, pr: document.querySelector('.kq-tile[data-k="kor"] .kq-fav').getAttribute('aria-pressed'), live: document.querySelector('.kq-live').textContent }));
  L.ok(r.fav && r.fav.includes('kor') && r.pr === 'true' && /Körner ist jetzt Favorit/.test(r.live) && (await foc()) === 'tile:kor', 'f: Körner a favourite (aria-pressed, stored, said), focus stays');
  await page.keyboard.down('Shift'); await page.keyboard.press('Space'); await page.keyboard.up('Shift'); await page.waitForTimeout(300);
  r = await M(() => [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd && !v.released).map((v) => v.eng));
  await page.waitForTimeout(1100);
  const r2 = await M(() => [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd && !v.released).length);
  L.ok(r.join() === 'kor' && r2 === 0, 'Shift+Space holds Körner for 1.2 s (' + r + '), then lets go');
  // the family radiogroup by keyboard: Tab back to it, → moves and filters
  await key('Shift+Tab');
  f1 = await foc();
  await key('ArrowRight'); f2 = await foc();
  r = await M(() => [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k).join());
  L.ok(f1 === 'fam:dunst' && f2 === 'fam:holz' && r === 'hrz,rnk,sai,jrg', 'Shift+Tab to the checked family (Dunst); → Holz filters to ' + r);
  // the trap: Tab cycles inside
  const seen = new Set();
  for (let i = 0; i < 9; i++) { await key('Tab'); seen.add(await M(() => document.querySelector('#kqLib').contains(document.activeElement))); }
  L.ok(seen.size === 1 && seen.has(true), 'Tab never leaves the dialog');
  // Escape: a search with text clears first, then closes; focus back to the name
  await page.focus('#kqSearch'); await page.keyboard.type('glocke'); await page.waitForTimeout(60);
  r = await M(() => [...document.querySelectorAll('.kq-tile')].map((t) => t.dataset.k).join());
  await key('Escape');
  const r3 = await M(() => ({ v: document.querySelector('#kqSearch').value, open: !document.querySelector('#kqLib').hidden }));
  await key('Escape');
  const r4 = await M(() => ({ open: !document.querySelector('#kqLib').hidden, panel: window.__M.UI.panel, f: document.activeElement === document.querySelector('#p-v-eng .kq-name') }));
  L.ok(r === 'glo,mdr' && r3.v === '' && r3.open && !r4.open && r4.panel === 'klang' && r4.f, 'typing „glocke“ finds Glocke (and the Kompostglocke, Moder); Esc clears the search, Esc again closes (the panel stays), focus on the name');
  // the row's live word when closed; the field's row label for a layer „Aus“
  await key('ArrowRight');
  r = await M(() => ({ say: document.querySelector('#kqSay').textContent, live: document.querySelector('#kqSay').getAttribute('aria-live'), lab: document.querySelector('#p-v-layer .kq-name').getAttribute('aria-label'), grp: document.querySelector('#' + document.querySelector('#p-v-layer').getAttribute('aria-labelledby')).textContent }));
  L.ok(/gewählt für die Spielfläche/.test(r.say) && r.live === 'polite', '→ on the name, the hidden live region says „' + r.say + '“');
  L.ok(r.lab === 'Klangquelle für die zweite Ebene: aus. Bibliothek öffnen' && r.grp === 'Ebene', 'layer row: „' + r.lab + '“, group labelled „' + r.grp + '“');
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close(); await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
