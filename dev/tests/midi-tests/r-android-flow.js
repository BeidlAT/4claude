// Review probe: microKEY Air over Bluetooth on Android from the start screen (390×844, 360×740). Prints PASS/FAIL + values.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  for (const [w, hgt] of [[390, 844], [360, 740]]) {
    const { page, errors } = await open({ vp: [w, hgt], touch: true, ua: 'android', bt: {}, cfg: { ins: [] }, start: false });
    const sk = await page.$('#btnStartKeys');
    const vis = sk && await sk.isVisible();
    ok(vis, w + ': start screen shows "Mit Keyboard starten"');
    const bb = vis ? await sk.boundingBox() : null;
    console.log('  start keys box', JSON.stringify(bb), 'viewport h', hgt);
    ok(bb && bb.y + bb.height <= hgt, w + ': start keys button is above the fold');
    await page.screenshot({ path: OUT + 'a-start-' + w + '.png' });
    let taps = 0;
    await page.click('#btnStartKeys'); taps++;
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ panel: window.__M.UI.panel, midi: window.__M.MIDI.state, asked: window.__midi.asked, focus: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) }));
    console.log('  after tap 1', JSON.stringify(st));
    ok(st.panel === 'dev', w + ': Gerät panel opened after "Mit Keyboard starten" with no keyboard');
    const ble = await page.$('[data-ble="ask"]');
    const bb2 = await ble.boundingBox();
    const cls = await ble.getAttribute('class');
    console.log('  BLE tile', JSON.stringify(bb2), cls);
    ok(bb2 && bb2.y >= 0 && bb2.y + bb2.height <= hgt - 110, w + ': Bluetooth tile visible in viewport (not under quick bar/tabs)');
    ok(/primary/.test(cls), w + ': Bluetooth tile promoted');
    const toast = await page.evaluate(() => document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '');
    console.log('  toast:', toast);
    await page.screenshot({ path: OUT + 'a-after1-' + w + '.png' });
    await page.evaluate(() => { window.__bt.next = { id: 'air', name: 'microKEY Air-25' }; });
    await page.click('[data-ble="ask"]'); taps++;
    await page.waitForFunction(() => { const B = [...window.__M.BLE.devs.values()][0]; return B && B.state === 'on'; }, null, { timeout: 5000 }).catch(() => {});
    const on = await page.evaluate(() => { const B = [...window.__M.BLE.devs.values()][0]; return B && B.state; });
    ok(on === 'on', w + ': connected after ' + taps + ' taps in the page (+ browser chooser)');
    // play a note over BLE
    const played = await page.evaluate(async () => {
      const d = window.__bt.dev('air');
      d.send([0x80, 0x80, 0x90, 60, 100]); await window.__sleep(60);
      const n = window.__M.MIDI.notes.size, t = [...window.__M.touches.keys()].filter((k) => String(k).startsWith('midi-')).length;
      d.send([0x80, 0x81, 0x80, 60, 0]);
      return { n, t };
    });
    ok(played.t > 0, w + ': a key over Bluetooth plays (touches ' + played.t + ')');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + 'a-conn-' + w + '.png' });
    const t2 = await page.evaluate(() => document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '');
    console.log('  toast after connect:', t2);
    console.log('  status:', await page.evaluate(() => document.querySelector('.kc-status').textContent));
    ok(!errors.length, w + ': no page errors ' + errors.join(' | '));
    await close();
  }
  // the other path: "Klang starten" (the big primary), then look for the keyboard
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [] }, start: false });
    await page.click('#btnStart'); await page.waitForTimeout(500);
    const toast = await page.evaluate(() => document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '');
    console.log('  Klang starten → toast:', JSON.stringify(toast), 'midi', await page.evaluate(() => window.__M.MIDI.state));
    const tab = await page.$('#tab-dev');
    console.log('  Gerät tab', JSON.stringify(await tab.boundingBox()), await tab.getAttribute('aria-label'), await tab.textContent());
    await page.click('#tab-dev'); await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + 'a-klangstart-dev-390.png' });
    console.log('  status:', await page.evaluate(() => document.querySelector('.kc-status').textContent));
    console.log('  tiles:', await page.evaluate(() => [...document.querySelectorAll('.kc-go')].filter((b) => !b.hidden).map((b) => b.textContent + (b.classList.contains('primary') ? ' [primary]' : '')).join(' | ')));
    const blebb = await (await page.$('[data-ble="ask"]')).boundingBox();
    console.log('  BLE tile box in this path', JSON.stringify(blebb));
    await close();
  }
})();
