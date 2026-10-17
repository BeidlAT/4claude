// Review probe: the accessibility tree of the keyboard sections (connected: nanoKEY Studio USB + microKEY Air Bluetooth),
// the learn banner, and the editor.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close, pair } = require('./hb');
(async () => {
  const NKS = 'nanoKEY Studio KEYBOARD/CTRL';
  const { page } = await open({ ua: 'android', vp: [390, 844], touch: true, bt: {}, cfg: { ins: [['k1', NKS], ['k2', 'MIDIIN2 (nanoKEY Studio)']], outs: [['o1', NKS]] } });
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(150);
  await pair(page, { id: 'air', name: 'microKEY Air-25' });
  await page.evaluate(() => { window.__send([0xb0, 22, 81], 'k1'); for (const d of document.querySelectorAll('#sheetBody details')) d.open = true; });
  await page.waitForTimeout(300);
  const secs = await page.evaluate(() => { const E = window.__M.getDevEls(); return [E.midiSec, E.mapSec, E.setSec, E.monSec].map((s) => { s.dataset.rv = Math.random().toString(36).slice(2); return s.dataset.rv; }); });
  for (const k of secs.slice(0, 2)) console.log((await page.locator('[data-rv="' + k + '"]').ariaSnapshot()).split('\n').slice(0, 90).join('\n'), '\n-----');
  await page.evaluate(() => { window.__M.midiLearn(true); window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 47], 'k1'); });
  await page.waitForTimeout(100);
  console.log(await page.locator('.mlearn-bar').ariaSnapshot());
  await close();
})();
