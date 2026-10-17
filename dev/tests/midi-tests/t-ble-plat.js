// Platform guidance and when the Bluetooth button shows: Android (promoted when Web MIDI finds nothing; MIDI BLE
// Connect, USB-OTG), Windows, macOS, iPad (Safari, Bluefy, Web MIDI Browser), claude.ai viewer, Firefox (desktop and
// Android), Android WebView, Linux; no Web Bluetooth, no adapter; the start button on BLE-only browsers; polyfills that
// arrive late or throw.   node t-ble-plat.js
const { open, ok, close, showDev, summary } = require('./hb');
const OUT = __dirname + '/out/';
const panel = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s), vis = (e) => !!e && !e.hidden && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  return {
    plat: window.__M.midiPlat(), status: [...document.querySelectorAll('.sec')].find((s) => s.querySelector('h3') && /^(MIDI-Keyboard|Keyboard & Controller)$/.test(s.querySelector('h3').textContent)).querySelector('.note').textContent,
    ble: vis(q('[data-ble="ask"]')), blePrimary: q('[data-ble="ask"]').classList.contains('primary'), all: vis(q('[data-ble="all"]')),
    lead: vis(q('details.plat')?.previousElementSibling) ? q('details.plat').previousElementSibling.textContent : '', leadEl: q('details.plat').previousElementSibling.textContent,
    steps: vis(q('details.plat')) ? q('details.plat').textContent : '', timing: vis(q('[aria-label^="Bluetooth-Timing"]')),
    midiBtn: vis([...document.querySelectorAll('#sheet button')].find((b) => b.textContent === 'MIDI-Keyboard verbinden')),
  };
});
(async () => {
  // ---------- Android: Web MIDI ready but empty → Bluetooth first ----------
  {
    const { page, errors } = await open({ bt: {}, ua: 'android', mobile: true, cfg: { ins: [] }, start: false });
    ok(await page.isVisible('#btnStartKeys'), 'Android start screen: „Mit Keyboard starten“');
    await page.click('#btnStartKeys');
    await page.waitForFunction(() => window.__M.UI.panel === 'dev', null, { timeout: 4000 });
    const t = await page.evaluate(() => document.querySelector('#toastMsg').textContent);
    const p = await panel(page);
    ok(/Bluetooth-Keyboard koppeln/.test(t), 'no keyboard found → Gerät opens, the toast points to Bluetooth: ' + t);
    ok(p.plat === 'android' && p.ble && p.blePrimary && p.all && !p.timing, 'Android: Bluetooth button shown and promoted (primary), „Alle Bluetooth-Geräte zeigen“ (timing chips come with a Bluetooth keyboard)');
    ok(/Bluetooth-Keyboard koppeln/.test(p.status), 'status mentions Bluetooth: ' + p.status);
    ok(/Nur in den Android-Einstellungen gekoppelt reicht nicht/.test(p.lead), 'lead: ' + p.lead);
    ok(['MIDI BLE Connect', 'MIDI+BTLE', 'Start Bluetooth Scan', 'Home-Taste', 'USB-OTG', 'Schalter am KORG-Keyboard auf USB', 'Geräte in der Nähe', 'Standort', 'Nur ein Gerät zur Zeit', 'iPad'].every((w) => p.steps.includes(w)), 'Hilfe: MIDI BLE Connect (Home, not Back), USB-OTG with the KORG switch, permissions, one host at a time');
    await page.screenshot({ path: OUT + 'ble-android-390.png', fullPage: false });
    await page.click('details.plat > summary');
    await page.evaluate(() => document.querySelector('details.plat').scrollIntoView());
    await page.screenshot({ path: OUT + 'ble-android-390-help.png' });
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- desktop platforms ----------
  const desk = [
    ['windows', {}, ['Am einfachsten per USB'], ['KORG-BLE-MIDI-Treiber', 'Windows MIDI Services', 'KORG-BLE-Treiber entfernen', 'enable-web-bluetooth-confirm-pairing-support', 'Connection Type', 'neu laden']],
    ['mac', {}, ['Audio-MIDI-Setup'], ['MIDI-Studio', 'Bluetooth-Symbol', 'nicht schon im Audio-MIDI-Setup']],
    ['linux', {}, ['enable-experimental-web-platform-features'], []],
    ['firefox', { bt: false }, ['Zusatzmodul', 'nur in Chrome oder Edge'], ['Audio-MIDI-Setup']],
  ];
  for (const [ua, o, lead, steps] of desk) {
    const { page, errors } = await open(Object.assign({ bt: {}, ua }, o));
    await showDev(page);
    const p = await panel(page);
    ok(p.plat === ua && lead.every((w) => p.lead.includes(w)) && steps.every((w) => p.steps.includes(w)), ua + ': ' + p.lead + (steps.length ? ' | Hilfe: ' + steps.join(', ') : ''));
    ok(p.ble === (o.bt !== false), ua + ': Bluetooth button ' + (p.ble ? 'shown' : 'hidden'));
    if (ua === 'windows') await page.screenshot({ path: OUT + 'ble-windows-1280.png' });
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- iPad: Safari, Bluefy (Bluetooth only), Web MIDI Browser (MIDI only) ----------
  {
    const { page, errors } = await open({ ua: 'ipad', mobile: true, bt: false, noMidi: true, start: false });
    ok(!(await page.isVisible('#btnStartKeys')), 'iPad Safari: no „Mit Keyboard starten“');
    await page.click('#btnStart'); await page.waitForTimeout(300); await showDev(page);
    const p = await panel(page);
    const spec = 'Safari und alle Browser auf dem iPad können kein MIDI. Möglich (nicht getestet): App „Web MIDI Browser“ (MIDI und Bluetooth-MIDI über iPadOS) oder „Bluefy“ (Bluetooth-Keyboards direkt) – darin beidlat.github.io/4claude öffnen. Auch USB-Keyboards am iPad brauchen eine solche App.';
    ok(p.plat === 'ios' && p.status === spec && !p.lead && !p.ble && !p.midiBtn, 'iPad Safari: the status line is the iOS text (Web MIDI Browser / Bluefy, untested), no buttons');
    await page.screenshot({ path: OUT + 'ble-ipad-safari.png' });
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ ua: 'ipad', mobile: true, bt: { noAvail: true }, noMidi: true, start: false });
    ok(await page.isVisible('#btnStartKeys'), 'Bluefy-like (Web Bluetooth, no Web MIDI): „Mit Keyboard starten“ offered');
    await page.click('#btnStartKeys');
    await page.waitForFunction(() => window.__M.BLE.devs.size && [...window.__M.BLE.devs.values()][0].state === 'on', null, { timeout: 4000 });
    const r = await page.evaluate(() => ({ active: window.__bt.reqs[0].active, started: window.__M.A.started }));
    ok(r.active && r.started, 'one tap starts the sound and opens the Bluetooth chooser (inside the gesture)');
    await showDev(page);
    const p = await panel(page);
    ok(p.plat === 'ioswrap' && /^Verbunden: microKEY Air-25\. Einfach losspielen\.$/.test(p.status) && /nicht getestet/.test(p.leadEl), 'Bluefy-like, connected: ' + p.status + ' | ' + p.leadEl);
    const st2 = await page.evaluate(() => { const M = window.__M; M.bleOff([...M.BLE.devs.values()][0]); return [...document.querySelectorAll('.sec')].find((s) => s.querySelector('h3') && /^(MIDI-Keyboard|Keyboard & Controller)$/.test(s.querySelector('h3').textContent)).querySelector('.note').textContent; });
    ok(/kann kein Web-MIDI – ein Bluetooth-Keyboard verbindest du direkt/.test(st2), 'Bluefy-like, nothing connected: ' + st2);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ ua: 'ipad', mobile: true, bt: false, cfg: { ins: [['k1', 'microKEY Air-25']] } });
    await showDev(page);
    const p = await panel(page);
    ok(p.plat === 'ioswrap' && /Bluetooth-Symbol/.test(p.leadEl) && /„(MIDI-Keyboard verbinden|Neu suchen)“/.test(p.leadEl) && !p.ble, 'Web MIDI Browser-like (Web MIDI on iPadOS): ' + p.leadEl);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- viewer, WebView, Firefox Android, no adapter ----------
  {
    const { page, errors } = await open({ bt: {}, viewer: true, cfg: { denyMidi: true } });
    await page.evaluate(() => window.__M.midiInit(true)); await showDev(page);
    const p = await panel(page);
    ok(p.plat === 'viewer' && !p.ble && !p.all && !p.lead && /claude.ai-Ansicht ist MIDI gesperrt/.test(p.status), 'claude.ai viewer: no Bluetooth button, one line pointing to the app');
    const s = await page.evaluate(() => window.__M.midiHelp().lead);
    ok(/MIDI und Bluetooth gesperrt/.test(s) && /beidlat.github.io\/4claude/.test(s), 'viewer help: ' + s);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  for (const [ua, w] of [['webview', 'eingebauten Browser ohne MIDI und Bluetooth'], ['ffandroid', 'Firefox auf Android kann kein MIDI']]) {
    const { page, errors } = await open({ ua, mobile: true, bt: false, noMidi: true });
    await showDev(page);
    const p = await panel(page);
    ok(p.plat === ua && p.status.includes(w) && /Chrome/.test(p.status) && !p.ble, ua + ': ' + p.status);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ bt: { avail: false } });
    await showDev(page);
    const p = await panel(page);
    ok(!p.ble && !p.all && !p.timing, 'getAvailability() false (no adapter): no Bluetooth button, no timing chips');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- polyfills: permissions.query throwing; requestMIDIAccess arriving after the start ----------
  {
    const { page, errors } = await open({ bt: false, cfg: { permThrow: true, ins: [['k1', 'Testkeyboard']] }, start: false });
    const st = await page.evaluate(() => window.__M.MIDI.state);
    ok(!errors.length && st === 'idle', 'a permissions.query that throws (some polyfills) breaks nothing ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ bt: false, noMidi: true });
    await showDev(page);
    let p = await panel(page);
    ok(!p.midiBtn, 'without Web MIDI: no MIDI button');
    await page.evaluate(() => { navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['p1', { id: 'p1', name: 'microKEY Air-25', state: 'connected' }]]), outputs: new Map() }); window.__M.updDevUI(); });
    p = await panel(page);
    ok(p.midiBtn && (await page.evaluate(() => window.__M.MIDI.state)) === 'idle', 'a Web MIDI polyfill that arrives late is picked up (button appears)');
    await page.click('text=MIDI-Keyboard verbinden'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => [...window.__M.MIDI.ports.values()].join());
    ok(r === 'microKEY Air-25', 'and its keyboard connects (polled, no onstatechange)');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
