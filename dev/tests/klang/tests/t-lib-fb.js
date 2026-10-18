// Klangquellen: without AudioWorklet the worklet sources say „⌁ spielt als …“ (row, tile, bar chip, engine section) and
// stay choosable; with it, the module loads on the first probe (the glyph pulses meanwhile). The help texts come from
// the families, not from lists of sources.   node t-lib-fb.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib'), K = require('./klh');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let { page, errors, ctx } = await K.open(browser, { w: 390, h: 844, init: () => { delete window.AudioWorkletNode; Object.defineProperty(BaseAudioContext.prototype, 'audioWorklet', { get: () => undefined }); } });
  const M = (fn, a) => page.evaluate(fn, a);
  let r = await M(async () => {
    const M = window.__M; M.openPanel('klang'); M.setParam('v.eng', 'hlm'); await window.__sleep(200);
    const row = document.querySelector('#p-v-eng');
    const o = { st: M.DSP.state, info: row.querySelector('.kq-i').textContent, lab: row.querySelector('.kq-name').getAttribute('aria-label'), dot: !!document.querySelector('#engChip .fbdot:not([hidden])'), chip: document.querySelector('#engChip').getAttribute('aria-label') };
    row.querySelector('.kq-name').click(); await window.__sleep(100);
    document.querySelector('.kq-fams .chip[data-fam="holz"]').click(); await window.__sleep(50);
    o.tile = document.querySelector('.kq-tile[data-k="rnk"] .kq-i').textContent;
    document.querySelector('.kq-tile[data-k="rnk"] .kq-pick').click(); await window.__sleep(80);
    o.pr = [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.eng + '/' + v.as).join();
    o.eng = M.P['v.eng']; M.kqClose(); M.setParam('v.eng', 'neb');
    return o;
  });
  L.ok(r.st === 'kein' && /^⌁ spielt als Hauch · Rohrblatt/.test(r.info) && /spielt als Hauch/.test(r.lab), 'no worklet: the row says „' + r.info + '“');
  L.ok(r.dot && /vereinfacht/.test(r.chip), 'the bar chip shows the rose dot, its label says „vereinfacht“');
  L.ok(/^⌁ spielt als Nebel · Ein Ring/.test(r.tile) && r.eng === 'rnk' && r.pr === 'rnk/neb', 'the tile: „' + r.tile + '“; still choosable, the probe plays the stand-in (' + r.pr + ')');
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close();
  // with the worklet: the module is loaded on the first probe of a worklet source; the glyph pulses meanwhile
  ({ page, errors, ctx } = await K.open(browser, { w: 390, h: 844 }));
  r = await page.evaluate(async () => {
    const M = window.__M; M.openPanel('klang'); const T = M.kqTarget('v.eng');
    const st0 = M.DSP.state; M.kqOpen(T); document.querySelector('.kq-fams .chip[data-fam="luft"]').click();
    M.kqHear(T, 'hlm'); const st1 = M.DSP.state; const pulse = document.querySelector('.kq-tile[data-k="hlm"] .kq-g').classList.contains('loading');
    for (let i = 0; i < 100 && M.DSP.state !== 'ok'; i++) await window.__sleep(20);
    await window.__sleep(30);
    const o = { st0, st1, pulse, st2: M.DSP.state, after: document.querySelector('.kq-tile[data-k="hlm"] .kq-g').classList.contains('loading'), fb: !!document.querySelector('.kq-tile[data-k="hlm"] .kq-fb') };
    M.kqHear(T, 'hlm'); await window.__sleep(60); o.as = [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.as).join(); M.kqClose();
    return o;
  });
  L.ok(r.st0 === '' && r.st1 === 'laden' && r.pulse && r.st2 === 'ok' && !r.after && !r.fb && r.as === 'hlm', 'first probe of Halm loads the module (' + r.st0 + ' → ' + r.st1 + ' → ' + r.st2 + '), the glyph pulses meanwhile; then Halm itself plays (' + r.as + ')');
  // the texts: from the families
  r = await page.evaluate(() => {
    const M = window.__M; M.openPanel('presets');
    const li = [...document.querySelectorAll('.help li')].map((l) => l.textContent);
    const o = { help: li.filter((t) => /^(Klangquelle|Halten|Tippen)/.test(t)), start: document.querySelector('#startFingerLine').textContent };
    M.openPanel('dev'); o.dev = (document.body.textContent.match(/leichtere Klänge wie [^.]*/) || [''])[0];
    return o;
  });
  L.ok(/^Klangquelle: 22 Quellen in 5 Familien – Luft, Dunst, Holz, Erz und Erde\./.test(r.help[0]) && /^Halten: Die Quellen aus Luft und Dunst klingen/.test(r.help[1]) && /^Tippen und Wischen: Die Quellen aus Holz, Erz und Erde schlagen/.test(r.help[2]), 'Spielhilfe from the families: ' + r.help.map((t) => '„' + t.slice(0, 60) + '…“').join(' '));
  L.ok(r.start === 'Mehrere gleichzeitig; Wischen schlägt Holz, Erz und Erde an' && /leichtere Klänge wie Hauch, Saite oder Membran/.test(r.dev), 'start screen „' + r.start + '“; Gerät „' + r.dev + '“');
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close(); await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
