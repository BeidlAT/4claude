// Screenshots of the Gerät panel's keyboard section with Bluetooth devices in several states (390 px Android, 1280 px
// Windows). Not a test: writes out/ble-shot-*.png.   node shot-ble.js
const { open, close, pair } = require('./hb');
(async () => {
  for (const [ua, mobile, w] of [['android', true, 390], ['windows', false, 1280]]) {
    const { page } = await open({ bt: {}, ua, mobile, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await pair(page, { id: 'a', name: 'microKEY Air-25' });
    await pair(page, { id: 'b', name: 'nanoKEY Studio' });
    await pair(page, { id: 'c', name: 'microKEY Air-49', o: { connectFail: 'Authentication failed.' } }, false);
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      const d = window.__bt.dev('a');
      for (let i = 0; i < 20; i++) { d.send([0x80, 0x80 + i, 0xb0, 1, i]); await window.__sleep(15); }
      window.__M.setParam('midi.ble', 'even');
      document.querySelector('#toast').classList.remove('show');
      [...document.querySelectorAll('.sec')].find((s) => s.querySelector('h3') && s.querySelector('h3').textContent === 'MIDI-Keyboard').scrollIntoView();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: __dirname + '/out/ble-shot-' + ua + '-' + w + '.png' });
    await close();
  }
})();
