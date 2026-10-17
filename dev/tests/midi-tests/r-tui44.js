// Review probe: replays t-ui.js's "≥ 44 px" check step by step to see why it passes while chips measure 34 px.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close, pair } = require('./hb');
(async () => {
  const NKS = 'nanoKEY Studio KEYBOARD/CTRL';
  const { page } = await open({ bt: {}, ua: 'android', vp: [390, 844], touch: true, cfg: { ins: [['k1', NKS]], outs: [['o1', NKS]] } });
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(150);
  await pair(page, { id: 'air', name: 'microKEY Air-25' });
  const before = await page.evaluate(() => [...document.querySelectorAll('.fold-b')].map((b) => b.textContent + ':' + b.getAttribute('aria-expanded')));
  await page.evaluate(() => { for (const b of document.querySelectorAll('.fold-b')) b.click(); for (const d of document.querySelectorAll('#sheetBody details')) d.open = true; window.__M.midiLearn(false); });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ secs: [...document.querySelectorAll('#sheetBody .sec')].slice(0, 4).map((s) => s.querySelector('h3').textContent + (s.hidden ? '[hidden]' : '') + (s.querySelector('.fold-body') ? (s.querySelector('.fold-body').hidden ? ' body-hidden' : ' body-open') : '')), folds: [...document.querySelectorAll('.fold-b')].map((b) => b.textContent + ':' + b.getAttribute('aria-expanded')) }));
  console.log('before', before, '\nafter', JSON.stringify(r));
  await close();
})();
