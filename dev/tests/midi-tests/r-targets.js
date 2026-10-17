// Review probe: every interactive element of the keyboard sections, the learn banner and the binding editor at
// 390/360/iPad/1280 – sizes below 44 px (touch sizes), sideways overflow, unnamed controls.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close, pair } = require('./hb');
const VP = { p390: { vp: [390, 844], touch: true, ua: 'android' }, p360: { vp: [360, 740], touch: true, ua: 'android' }, ipad: { vp: [1180, 820], touch: true, tablet: true, ua: 'mac' }, d1280: { vp: [1280, 800], ua: 'windows' } };
const NKS = [['k1', 'nanoKEY Studio KEYBOARD/CTRL'], ['k2', 'MPK mini IV DAW Port']];
(async () => {
  for (const [size, o] of Object.entries(VP)) {
    const { page, errors } = await open(Object.assign({ bt: {}, cfg: { ins: NKS, outs: [NKS[0], ['o9', 'Volca Sync']] } }, o));
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(150);
    await pair(page, { id: 'air', name: 'microKEY Air-25' });
    await page.evaluate(async () => {
      const M = window.__M;
      window.__send([0xb0, 22, 81], 'k1');
      M.midiLearn(true); window.__send([0xb0, 20, 60], 'k1'); window.__send([0xb0, 20, 64], 'k1'); M.learnPick('cho.mix'); M.midiLearn(false);
      for (const b of document.querySelectorAll('.fold-b')) if (b.getAttribute('aria-expanded') !== 'true') b.click();
      for (const d of document.querySelectorAll('#sheetBody details')) d.open = true;
    });
    await page.waitForTimeout(300);
    const r = await page.evaluate((touch) => {
      const secs = [...document.querySelectorAll('#sheetBody .sec')].filter((s) => /Keyboard|Zuordnungen|Spielweise|Monitor/.test(s.querySelector('h3') ? s.querySelector('h3').textContent : ''));
      const small = [], noname = [];
      for (const s of secs) for (const el of s.querySelectorAll('button, summary, input, select, [role=switch], a[href], [tabindex]:not([tabindex="-1"])')) {
        if (el.closest('[hidden]') || el.type === 'file') continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const nm = (el.getAttribute('aria-label') || el.textContent || el.title || el.placeholder || '').trim().slice(0, 50);
        if (r.height < 44 || r.width < 44) small.push(nm + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' <' + el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : '') + '>');
        if (!nm && !(el.labels && el.labels.length) && !el.getAttribute('aria-labelledby')) noname.push(el.outerHTML.slice(0, 100));
      }
      const b = document.querySelector('#sheetBody');
      return { small, noname, over: b.scrollWidth - b.clientWidth, docOver: document.documentElement.scrollWidth - innerWidth };
    }, !!(size !== 'd1280'));
    console.log('== ' + size + ': small ' + r.small.length);
    for (const s of r.small) console.log('   ' + s);
    if (r.noname.length) console.log('   unnamed:', r.noname);
    ok(r.over <= 0 && r.docOver <= 0, size + ': no sideways scroll (' + r.over + '/' + r.docOver + ')');
    // the binding editor
    await page.evaluate(() => { const b = document.querySelector('.kc-b .kc-be'); if (b) b.click(); });
    await page.waitForTimeout(200);
    const e = await page.evaluate(() => {
      const ed = document.querySelector('.kc-ed'); if (!ed) return null;
      const small = [];
      for (const el of ed.querySelectorAll('button, summary, input, select, [role=switch]')) { if (el.closest('[hidden]')) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && (r.height < 44 || r.width < 44)) small.push((el.getAttribute('aria-label') || el.textContent || el.placeholder || el.type).trim().slice(0, 40) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
      return small;
    });
    console.log('   editor small:', JSON.stringify(e));
    await page.keyboard.press('Escape');
    // learn banner
    await page.evaluate(() => window.__M.midiLearn(true));
    await page.fill('.ml-q', 'hall'); await page.waitForTimeout(100);
    const l = await page.evaluate(() => {
      const small = [];
      for (const el of document.querySelectorAll('.mlearn-bar button, .mlearn-bar input')) { if (el.closest('[hidden]')) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && (r.height < 44 || r.width < 44)) small.push((el.textContent || el.placeholder).trim().slice(0, 40) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
      const bar = document.querySelector('.mlearn-bar').getBoundingClientRect();
      return { small, bar: [Math.round(bar.top), Math.round(bar.bottom), Math.round(bar.width)], n: document.querySelectorAll('.ml-list button').length };
    });
    console.log('   learn banner', JSON.stringify(l));
    await page.screenshot({ path: __dirname + '/rshots/t-learnsearch-' + size + '.png' });
    const mx = await page.evaluate(() => { const b = document.querySelector('.mx-ml'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.width, r.height]; });
    console.log('   mixer learn button', JSON.stringify(mx));
    if (errors.length) console.log('   errors', errors);
    await close();
  }
})();
