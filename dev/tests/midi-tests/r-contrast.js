// Review probe: text contrast of the keyboard sections (WCAG ratio against the nearest solid background) and focus
// rings on the tiles and the binding edit buttons.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close, pair } = require('./hb');
(async () => {
  const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL'], ['k2', 'MPK mini IV DAW Port']] } });
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(150);
  await pair(page, { id: 'air', name: 'microKEY Air-25' });
  await page.evaluate(() => { for (const b of document.querySelectorAll('.fold-b')) if (b.getAttribute('aria-expanded') !== 'true') b.click(); for (const d of document.querySelectorAll('#sheetBody details')) d.open = true; });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; } } let base = { r: 17, g: 13, b: 11 }; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
    const out = [];
    for (const sel of ['.kc-status', '.kc-prof', '.kc-hint', '.kc-last.idle', '.kc-last', '.kc-badge', '.kc-badge.bt', '.kc-diag', '.kc-bc', '.kc-bt em', '.kc-mon .t', '.kc-mon .x i', 'details.kc-more > summary', '.kc-tools .btn', '.kc-go::after', '.kc-dev.off .kc-dn', '.kc-sub', '.kc-ctrls dd', '.kc-dev .note', '.sec.fold .sec-h p']) {
      const el = document.querySelector(sel.replace('::after', '')); if (!el || !el.offsetParent) { out.push(sel + ': n/a'); continue; }
      const cs = getComputedStyle(el, sel.includes('::after') ? '::after' : null), c = rgb(cs.color), bg = bgOf(el);
      const L1 = lum(c), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      out.push(sel + ': ' + ratio.toFixed(2) + ' (' + cs.fontSize + ' ' + cs.fontWeight + ')');
    }
    return out;
  });
  console.log(r.join('\n'));
  // focus rings
  const f = await page.evaluate(() => { const o = {}; for (const sel of ['[data-ble="ask"]', '.kc-be', '.sw.kc-tog', '.fold-b']) { const el = document.querySelector(sel); if (!el) { o[sel] = 'n/a'; continue; } o[sel] = el; } return Object.keys(o); });
  for (const sel of ['[data-ble="ask"]', '.kc-be', 'details.kc-bd > summary', '.ml-q']) {
    await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'center' }); }, sel);
    const el = await page.$(sel); if (!el) { console.log(sel, 'n/a'); continue; }
    await el.focus(); await page.keyboard.press('Shift'); 
    const st = await page.evaluate((s) => { const e = document.querySelector(s), cs = getComputedStyle(e); return { fv: e.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow }; }, sel);
    console.log('focus', sel, JSON.stringify(st));
  }
  await close();
})();
