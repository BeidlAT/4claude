// Fix phase screenshots (not a test): the Gerät panel on a phone (Android, idle → Bluetooth first; the chooser's error
// kept in the panel; a connected microKEY Air), on the desktop (Windows, nanoKEY Studio over USB + clock), the mixer's
// „MIDI“ button (portrait, landscape), the learn banner beside the open mixer in landscape, the start screen with the
// keyboard of last time. Writes shots-mf/fix-*.png.   node shot-fix.js   (BASE: the 'mf' slot)
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mf-inst/index.html';
const { open, close, pair, showDev } = require('./hb');
const OUT = __dirname + '/shots-mf/';
const hideToast = (page) => page.evaluate(() => document.querySelector('#toast').classList.remove('show'));
const shot = async (page, name, keepToast) => { if (!keepToast) await hideToast(page); await page.waitForTimeout(300); await page.screenshot({ path: OUT + 'fix-' + name + '.png' }); };
(async () => {
  const LAST = { 'myzel.ble.v1': JSON.stringify({ name: 'microKEY Air-25', id: 'air' }) };
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { perm: 'granted' }, storage: LAST, start: false });
    await page.waitForTimeout(400);
    await shot(page, 'start-last-390');
    await page.context().close();
  }
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [] } });
    await showDev(page);
    await shot(page, 'dev-idle-390');
    await page.evaluate(() => { window.__bt.next = { reject: ['NotFoundError', 'User cancelled the requestDevice() chooser.'], after: 60 }; });
    await page.click('[data-ble="ask"]'); await page.waitForTimeout(400);
    await shot(page, 'dev-askerr-390', true);
    await pair(page, { id: 'air', name: 'microKEY Air-25' });
    await page.evaluate(async () => { const d = window.__bt.dev('air'); for (let i = 0; i < 12; i++) { d.send([0x80, 0x80 + i, 0x90, 60 + (i % 5), 90]); await window.__sleep(20); d.send([0x80, 0x81 + i, 0x80, 60 + (i % 5), 0]); } d.send([0x80, 0x90, 0xb0, 2, 90]); });
    await page.waitForTimeout(700);
    await shot(page, 'dev-conn-390');
    await page.evaluate(() => { for (const d of document.querySelectorAll('.kc-dev details')) d.open = true; });
    await shot(page, 'dev-conn-open-390');
    await page.evaluate(() => window.__M.openPanel('mix')); await page.waitForTimeout(500);
    await shot(page, 'mix-390');
    await page.context().close();
  }
  {
    const NKS = [['k1', 'nanoKEY Studio KEYBOARD/CTRL']];
    const { page } = await open({ vp: [1280, 800], ua: 'windows', bt: {}, cfg: { ins: NKS, outs: NKS }, storage: { 'myzel.kcui.v1': JSON.stringify({ mon: true, set: true }) } });
    await page.waitForTimeout(300);
    await showDev(page);
    await page.evaluate(async () => { const S = window.__send; S([0xb0, 22, 81], 'k1'); S([0x90, 60, 90], 'k1'); S([0x80, 60, 0], 'k1'); S([0xb0, 1, 70], 'k1'); S([0xb0, 11, 40], 'k1'); await window.__sleep(400); });
    await shot(page, 'dev-d1280');
    await page.evaluate(() => { const E = window.__M.getDevEls(); E.monSec.scrollIntoView(); });
    await shot(page, 'dev-mon-d1280');
    await page.evaluate(() => window.__M.openPanel('mix')); await page.waitForTimeout(500);
    await shot(page, 'mix-d1280');
    await page.context().close();
  }
  for (const vp of [[844, 390], [740, 360]]) {
    const { page } = await open({ vp, touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('mix')); await page.waitForTimeout(500);
    await shot(page, 'mix-land-' + vp[0]);
    await page.evaluate(() => window.__M.midiLearn(true)); await page.waitForTimeout(300);
    await shot(page, 'learn-mix-land-' + vp[0]);
    const r = await page.evaluate(() => { const b = document.querySelector('.mlearn-bar').getBoundingClientRect(), s = document.querySelector('#sheet').getBoundingClientRect(), m = document.querySelector('.mx-ml'), mr = m.getBoundingClientRect(); return { bar: [b.left, b.right], sheet: s.left, overlap: Math.max(0, b.right - s.left), mx: { vis: !!m.offsetParent, w: Math.round(mr.width), h: Math.round(mr.height) } }; });
    console.log(vp.join('×'), JSON.stringify(r));
    await page.context().close();
  }
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
