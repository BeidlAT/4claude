// Review probe: keyboard-only use of the keyboard sections and of learn (desktop 1280, Windows, nanoKEY Studio on USB).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
const desc = (page) => page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; const n = (a.getAttribute('aria-label') || a.textContent || a.placeholder || a.id || a.className || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 50); return a.tagName.toLowerCase() + (a.dataset.pid ? '[pid=' + a.dataset.pid + ']' : '') + ' "' + n + '"'; });
(async () => {
  const NKS = 'nanoKEY Studio KEYBOARD/CTRL';
  const { page, errors } = await open({ ua: 'windows', bt: {}, cfg: { ins: [['k1', NKS]], outs: [['o1', NKS]] }, start: false });
  await page.focus('#btnStart'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  console.log('after start, focus:', await desc(page));
  // reach the Gerät tab by Tab
  let i = 0, d = '';
  for (; i < 80; i++) { await page.keyboard.press('Tab'); d = await desc(page); if (/Gerät/.test(d) && /button/.test(d)) break; }
  console.log('Tabs to Gerät tab:', i + 1, d);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  console.log('after opening Gerät, focus:', await desc(page));
  // walk the panel: list the order until "Zuweisen"
  const order = [];
  for (i = 0; i < 60; i++) { await page.keyboard.press('Tab'); d = await desc(page); order.push(d); if (/Zuweisen/.test(d)) break; }
  console.log('Tab order in panel up to Zuweisen (' + order.length + '):\n   ' + order.join('\n   '));
  // focus ring on a few new controls
  const rings = await page.evaluate(() => {
    const out = {};
    for (const sel of ['.kc-go', '.sw.kc-tog', '.fold-b', 'details.kc-more > summary', '.kc-be', '.kc-tools .btn', '.kc-learn']) {
      const el = document.querySelector(sel); if (!el || el.closest('[hidden]')) { out[sel] = 'n/a'; continue; }
      el.focus(); const cs = getComputedStyle(el);
      out[sel] = el.matches(':focus-visible') ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' / shadow ' + (cs.boxShadow !== 'none') : 'no :focus-visible (programmatic)';
    }
    return out;
  });
  console.log('focus styles', JSON.stringify(rings, null, 1));
  // learn by keyboard
  await page.evaluate(() => { const b = document.querySelector('.kc-learn'); b.focus(); });
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  console.log('learn on:', await page.evaluate(() => window.__M.LEARN.on), 'focus:', await desc(page));
  await page.evaluate(() => { window.__send([0xb0, 21, 40], 'k1'); window.__send([0xb0, 21, 46], 'k1'); });
  await page.waitForTimeout(100);
  console.log('banner:', await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent));
  // how far is the banner's search?
  for (i = 0; i < 200; i++) { await page.keyboard.press('Tab'); d = await desc(page); if (/Ziel suchen/.test(d)) break; }
  console.log('Tabs from Zuweisen to the banner search:', i + 1);
  await page.keyboard.type('klang pegel'); await page.waitForTimeout(100);
  await page.keyboard.press('Tab'); console.log('Tab after typing →', await desc(page));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const b = await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target));
  console.log('assigned:', JSON.stringify(b), 'focus after pick:', await desc(page));
  ok(b.length === 1, 'keyboard: a knob assigned through the search');
  // now assign to a mixer fader by keyboard: open the mixer, find the fader for the Klang strip
  await page.evaluate(() => { window.__send([0xb0, 22, 40], 'k1'); window.__send([0xb0, 22, 50], 'k1'); });
  await page.waitForTimeout(450);
  await page.evaluate(() => document.querySelector('#tab-mix').focus()); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  const fad = await page.evaluate(() => [...document.querySelectorAll('.mx [data-pid]')].filter((e) => e.getBoundingClientRect().width).map((e) => e.tagName.toLowerCase() + '[' + e.dataset.pid + '] tabindex=' + e.tabIndex + ' role=' + e.getAttribute('role')).slice(0, 14));
  console.log('mixer targets:', fad.join(' | '));
  for (i = 0; i < 120; i++) { await page.keyboard.press('Tab'); d = await desc(page); if (/pid=xfin\.vol|pid=x.*\.vol/.test(d)) break; }
  console.log('Tabs to first fader:', i + 1, d);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  console.log('assigned now:', JSON.stringify(await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target))), 'banner:', await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  console.log('after Escape: learn', await page.evaluate(() => window.__M.LEARN.on), 'panel', await page.evaluate(() => window.__M.UI.panel), 'focus', await desc(page));
  if (errors.length) console.log('errors', errors);
  await close();
})();
