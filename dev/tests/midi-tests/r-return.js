// Review probe: the second visit on Android (MIDI already allowed, the microKEY Air used last time over Bluetooth).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  for (const perm of ['granted', 'prompt']) {
    const { page, errors } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [], perm }, storage: { 'myzel.ble.v1': JSON.stringify({ id: 'air', name: 'microKEY Air-25' }) }, start: false });
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({ keys: !document.querySelector('#btnStartKeys').hidden, keysTxt: document.querySelector('#btnStartKeys').textContent, midi: window.__M.MIDI.state, last: window.__M.BLE.last }));
    console.log('== perm ' + perm, JSON.stringify(s));
    await page.screenshot({ path: OUT + 'ret-start-' + perm + '.png' });
    let taps = 0;
    if (s.keys) { await page.click('#btnStartKeys'); taps++; } else { await page.click('#btnStart'); taps++; await page.click('#tab-dev'); taps++; }
    await page.waitForTimeout(600);
    const again = await page.$('[data-ble="again"]');
    const vis = again && await again.isVisible();
    const bb = vis ? await again.boundingBox() : null;
    console.log('  Wieder verbinden visible:', vis, JSON.stringify(bb), vis ? await again.textContent() : '', 'panel', await page.evaluate(() => window.__M.UI.panel));
    await page.screenshot({ path: OUT + 'ret-dev-' + perm + '.png' });
    if (vis) {
      await page.evaluate(() => { window.__bt.next = { id: 'air', name: 'microKEY Air-25' }; });
      await again.click(); taps++;
      await page.waitForFunction(() => { const B = [...window.__M.BLE.devs.values()][0]; return B && B.state === 'on'; }, null, { timeout: 5000 }).catch(() => {});
      ok(await page.evaluate(() => { const B = [...window.__M.BLE.devs.values()][0]; return !!B && B.state === 'on'; }), 'perm ' + perm + ': back on Bluetooth after ' + taps + ' taps in the page (+ chooser)');
    }
    if (errors.length) console.log('errors', errors);
    await close();
  }
})();
