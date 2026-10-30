// (owner, 26./30.10.2026: „das Edirol PCR-M50 hängt am MIDI-Eingang eines Steinberg-Interfaces und taucht nicht auf …
// das Gerätebild des Interfaces streichen“) the ports of Steinberg interfaces as Windows and macOS name them: each is a
// card that plays at once (never a second port switched off), asks which instrument hangs on it and offers no
// Gerätebild of the interface – not on the card, not in the Gerätebild's device list; a keyboard on its own USB port
// keeps its picture; chosen, the PCR-M50 shows up in both.                 node t-iface2.js   (env URL: the test page)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const URL = process.env.URL || 'http://127.0.0.1:8790/new-inst/index.html';
const NAMES = ['Steinberg UR22C-1', 'UR22mkII MIDI', 'Yamaha Steinberg USB MIDI', 'Steinberg UR44C MIDI 2', 'UR-RT2 DIN'];
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((names) => {
    const inputs = new Map(names.concat(['nanoKEY2 KEYBOARD']).map((n, i) => ['i' + i, { id: 'i' + i, name: n, manufacturer: 'Yamaha', state: 'connected', onmidimessage: null }]));
    window.__send = (k, bytes) => { const i = inputs.get(k); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs, outputs: new Map(), onstatechange: null });
  }, NAMES);
  await page.goto(URL); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(900);
  await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(600);
  const look = () => page.evaluate((names) => {
    const M = window.__M, cards = [...document.querySelectorAll('.kc-dev')];
    const one = (n) => { const c = cards.find((e) => e.getAttribute('aria-label') === n); const s = [...M.MIDI.srcs.values()].find((x) => x.name === n); return c ? { on: !!(s && s.enabled), sec: !!(s && s.secondary), sel: !!c.querySelector('.kc-msel'), bild: !!c.querySelector('[data-kc$=":bild"]'), text: (c.querySelector('.kc-prof') || {}).textContent || '' } : null; };
    M.cbOpen(); const list = [...document.querySelectorAll('.cb-dev option')].map((o) => o.textContent), dn = (document.querySelector('.cb-dn') || {}).textContent || ''; M.cbClose();
    return { ifs: names.map(one), nk: one('nanoKEY2 KEYBOARD'), list, dn };
  }, NAMES);
  const a = await look();
  // a note through the interface port plays (the keyboard on its DIN input)
  const played = await page.evaluate(async () => { const M = window.__M, s = [...M.MIDI.srcs.values()].find((x) => x.name === 'Steinberg UR22C-1'), n0 = M.MIDI.notes.size; window.__send('i0', [0x90, 60, 100]); await new Promise((r) => setTimeout(r, 120)); const n1 = M.MIDI.notes.size, act = s.lastIn; window.__send('i0', [0x80, 60, 0]); return n1 > n0 && act > 0; });
  // the PCR-M50 chosen on the first port
  await page.selectOption('.kc-dev[aria-label="Steinberg UR22C-1"] .kc-msel', 'pcrm50'); await page.waitForTimeout(400);
  const b = await look();
  console.log(JSON.stringify({ a, b, played }, null, 1).slice(0, 2500));
  ok(a.ifs.every((x) => x && x.on && !x.sec), `every interface port a card that plays (${a.ifs.map((x) => x ? (x.on ? 'an' : 'aus') : 'fehlt').join(', ')})`);
  ok(a.ifs.every((x) => x && x.sel && !x.bild && /Audio-Interface/.test(x.text)), 'each asks which instrument hangs on it – no Gerätebild of the interface');
  ok(a.nk && !a.nk.sel && a.nk.bild, 'a keyboard on its own USB port: no question, its Gerätebild');
  ok(!a.list.some((t) => /Steinberg|UR/.test(t)) && !/Steinberg|UR/.test(a.dn), `the Gerätebild lists no interface (${a.list.join(' | ') || a.dn})`);
  ok(played, 'a note through the interface port plays');
  ok(b.ifs[0].bild && /PCR-M50/.test(b.ifs[0].text) && b.list.some((t) => /UR22C-1 · PCR-M50/.test(t)), `chosen: the card names the PCR-M50, the Gerätebild lists „${b.list.find((t) => /UR22C/.test(t))}“`);
  ok(b.ifs.slice(1).every((x) => x.sel && !x.bild), 'the other ports still ask');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
