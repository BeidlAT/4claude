// Review probe: what an Android player sees when the Bluetooth chooser fails (permission missing, Bluetooth off) or the
// keyboard wants pairing – where the explanation shows, for how long, and whether it stays in the panel.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  const cases = {
    perm: { reject: ['NotFoundError', 'User cancelled the requestDevice() chooser.'], after: 80 },
    off: { reject: ['NotFoundError', 'Bluetooth adapter not available.'], after: 50 },
    pair: { id: 'air', name: 'microKEY Air-25', o: { connectFail: 'Authentication failed.', connectFailName: 'NetworkError' } },
  };
  for (const [nm, pick] of Object.entries(cases)) {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(100);
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.evaluate((p) => { window.__bt.next = p; }, pick);
    await page.click('[data-ble="ask"]');
    await page.waitForTimeout(nm === 'pair' ? 1500 : 400);
    const r = await page.evaluate(() => ({ toast: document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '', panel: [...document.querySelectorAll('#sheetBody .note, #sheetBody .kc-dev')].filter((e) => e.offsetParent && /Geräte in der Nähe|ausgeschaltet|Kopplung|gekoppelt/.test(e.textContent)).map((e) => e.className + ': ' + e.textContent.slice(0, 160)) }));
    console.log('== ' + nm + '\n  toast (' + r.toast.length + ' chars): ' + r.toast + '\n  in the panel: ' + JSON.stringify(r.panel));
    await page.screenshot({ path: OUT + 'err-' + nm + '.png' });
    await page.waitForTimeout(12500);
    const still = await page.evaluate(() => document.querySelector('#toast').classList.contains('show'));
    console.log('  toast still showing after 12,5 s:', still);
    await close();
  }
})();
