// What the player is told when Bluetooth goes wrong: links that end within seconds (pairing hint per platform),
// the chooser closing at once on Android (Nearby devices / Location), a cancel, Bluetooth off, failed pairing on
// Windows, a device without BLE-MIDI, a page without user gesture.   node t-ble-errors.js
const { open, ok, close, pair, showDev, summary } = require('./hb');
const toastOf = (page) => page.evaluate(() => document.querySelector('#toastMsg').textContent);
(async () => {
  // ---------- short links → pairing hint (Windows wording), still trying ----------
  for (const ua of ['windows', 'android']) {
    const { page, errors } = await open({ bt: {}, ua, mobile: ua === 'android' });
    await page.evaluate(() => { window.__M.BLE.wait0 = 50; window.__M.BLE.waitMax = 200; });
    await pair(page, { id: 's1', name: 'microKEY Air-49', o: { dropAfter: 150 } });
    await page.waitForFunction(() => window.__bt.dev('s1').links >= 3, null, { timeout: 4000 });
    const r = await page.evaluate(() => {
      const b = [...window.__M.BLE.devs.values()][0];
      return { why: b.why, err: b.err, short: b.short, warn: document.querySelector('.bledev .note.warn').textContent, line: document.querySelector('.bledev .note').textContent };
    });
    const t = await toastOf(page);
    if (ua === 'windows') ok(/will gekoppelt werden/.test(r.why) && /Windows-Einstellungen/.test(r.why) && /enable-web-bluetooth-confirm-pairing-support/.test(r.why) && /KORG-BLE-MIDI-Treiber/.test(r.why), 'Windows: two links under 10 s → pair in Windows Settings or the Chrome flag; KORG driver warning');
    else ok(/will gekoppelt werden/.test(r.why) && /Kopplungsanfrage von Android/.test(r.why), 'Android: two short links → confirm Android\'s pairing request / unpair and reconnect');
    if (!(r.short >= 2 && /gekoppelt/.test(t) && r.warn === r.why && /zuletzt: trennt nach Sekunden/.test(r.line))) console.log(JSON.stringify(r), t);
    ok(r.short >= 2 && /gekoppelt/.test(t) && r.warn === r.why && /zuletzt: trennt nach Sekunden/.test(r.line), 'the hint shows as toast and in the device line; Myzel keeps trying (' + r.short + ' short links)');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- chooser failures on Android ----------
  {
    const { page, errors } = await open({ bt: {}, ua: 'android', mobile: true });
    await showDev(page);
    const ask = async (rej, after) => {
      await page.evaluate(() => { document.querySelector('#toastMsg').textContent = '-'; });
      await page.evaluate(([r, a]) => { window.__bt.next = { reject: r, after: a }; }, [rej, after]);
      await page.click('[data-ble="ask"]');
      await page.waitForTimeout((after || 0) + 150);
      // the explanation stays under the Bluetooth button (no toast over it)
      const w = await page.evaluate(() => { const E = window.__M.getDevEls(); return E.bleWhy.hidden ? '' : E.bleWhy.textContent; });
      return w || toastOf(page);
    };
    let t = await ask(['NotFoundError', 'User denied the browser permission to scan for Bluetooth devices.'], 0);
    ok(/Geräte in der Nähe/.test(t) && /Standort/.test(t) && /Android-Einstellungen/.test(t), 'Android, permission denied: explains Nearby devices (12+) / Location (older)');
    t = await ask(['NotFoundError', 'User cancelled the requestDevice() chooser.'], 10);
    ok(/Geräte in der Nähe/.test(t), 'Android, chooser closed at once (no person is that fast): the same permission hint');
    t = await ask(['NotFoundError', 'User cancelled the requestDevice() chooser.'], 900);
    ok(t === '-', 'a real cancel says nothing');
    t = await ask(['NotFoundError', 'Bluetooth adapter not available.'], 0);
    ok(/Bluetooth ist ausgeschaltet/.test(t), 'Bluetooth off: ' + t);
    t = await ask(['NotFoundError', 'Web Bluetooth API globally disabled.'], 0);
    ok(/im Browser abgeschaltet/.test(t), 'Web Bluetooth switched off in the browser: ' + t);
    // a first read that waits for the person (Android's pairing prompt): a hint after 1,5 s, then it links
    await page.evaluate(() => { window.__bt.next = { id: 'slow', name: 'microKEY Air-25', o: { readDelay: 2200 } }; });
    await page.click('[data-ble="ask"]');
    await page.waitForTimeout(1900);
    t = await toastOf(page);
    ok(/Kopplungsanfrage von Android/.test(t) && /Benachrichtigung/.test(t), 'a slow first read: ' + t);
    await page.waitForFunction(() => { const b = [...window.__M.BLE.devs.values()].find((x) => x.id === 'slow'); return b && b.state === 'on'; }, null, { timeout: 4000 });
    ok(true, 'and links once the read answers');
    const busy = await page.evaluate(() => document.querySelector('[data-ble="ask"]').disabled);
    ok(!busy, 'the button is usable again after a failure');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- desktop: blocked permission, pairing failure, no MIDI service, no gesture ----------
  {
    const { page, errors } = await open({ bt: {}, ua: 'windows' });
    await showDev(page);
    await page.evaluate(() => { window.__bt.next = { reject: ['NotFoundError', 'Bluetooth permission has been blocked.'] }; });
    await page.click('[data-ble="ask"]'); await page.waitForTimeout(150);
    ok(/Website-Einstellungen/.test(await page.evaluate(() => window.__M.getDevEls().bleWhy.textContent)), 'desktop, blocked: points to the site settings');
    await pair(page, { id: 'a1', name: 'microKEY Air-25', o: { connectFail: 'Authentication failed.' } }, false);
    await page.waitForFunction(() => window.__M.BLE.devs.size && [...window.__M.BLE.devs.values()][0].state === 'err');
    let r = await page.evaluate(() => { const b = [...window.__M.BLE.devs.values()][0]; return { why: b.why, err: b.err, raw: b.raw, links: window.__bt.dev('a1').log.filter((x) => x === 'connect').length, src: window.__M.MIDI.srcs.size }; });
    ok(/Kopplung mit dem Keyboard ist gescheitert/.test(r.why) && /Windows-Einstellungen/.test(r.why) && r.err === 'Kopplung gescheitert' && /Authentication failed/.test(r.raw), 'Windows, "Authentication failed.": pairing explained, raw error kept for diagnostics');
    await page.waitForTimeout(1500);
    r = await page.evaluate(() => ({ n: window.__bt.dev('a1').log.filter((x) => x === 'connect').length, txt: document.querySelector('.bledev').textContent, again: !!document.querySelector('.bledev [data-ble="on"]') }));
    ok(r.n === 1 && r.again && /nicht verbunden/.test(r.txt), 'a first link that fails waits for the user (no retry loop) and offers „Wieder verbinden“');
    // notifications refused for lack of authorization
    await pair(page, { id: 'a2', name: 'nanoKEY Studio', o: { notifyFail: 'GATT operation not authorized.', notifyFailName: 'SecurityError' } }, false);
    await page.waitForFunction(() => { const b = [...window.__M.BLE.devs.values()].find((x) => x.id === 'a2'); return b && b.state === 'err'; });
    r = await page.evaluate(() => [...window.__M.BLE.devs.values()].find((x) => x.id === 'a2').err);
    ok(r === 'Kopplung gescheitert', 'notifications refused (not authorized) → pairing hint');
    await pair(page, { id: 'h1', name: 'Kopfhörer', o: { noSvc: true } }, false);
    await page.waitForFunction(() => { const b = [...window.__M.BLE.devs.values()].find((x) => x.id === 'h1'); return b && b.state === 'err'; });
    r = await page.evaluate(() => [...window.__M.BLE.devs.values()].find((x) => x.id === 'h1').why);
    ok(/kein Bluetooth-MIDI/.test(r), 'a device without the MIDI service: ' + r);
    await pair(page, { id: 'u1', name: 'microKEY Air-61', o: { connectFail: 'Connection failed for unknown reason.' } }, false);
    await page.waitForFunction(() => { const b = [...window.__M.BLE.devs.values()].find((x) => x.id === 'u1'); return b && b.state === 'err'; });
    r = await page.evaluate(() => [...window.__M.BLE.devs.values()].find((x) => x.id === 'u1').why);
    ok(/anderes Gerät/.test(r) && /KORG-Treiber/.test(r), 'unknown failure: switched on, near, not held by another host: ' + r);
    // without a tap the browser refuses: the app never calls it that way, but says what to do
    r = await page.evaluate(() => window.__M.bleWhy(Object.assign(new Error('Must be handling a user gesture to show a permission request.'), { name: 'SecurityError' }), 'ask', 5));
    ok(/Tippe noch einmal/.test(r), 'no user gesture → tap again');
    r = await page.evaluate(() => ['Short', 'pair', 'nomidi', 'TimeoutError'].map((n) => window.__M.bleKind({ name: n === 'pair' ? 'NetworkError' : n, message: n === 'pair' ? 'Authentication failed.' : n === 'nomidi' ? 'No Services matching UUID found in Device.' : '' })).join());
    ok(r === 'short,pair,nomidi,timeout', 'error kinds: ' + r);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
