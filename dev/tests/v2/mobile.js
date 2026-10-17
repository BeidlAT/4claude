const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, mode] of [[320, 'grant'], [390, 'none'], [390, 'deny'], [390, 'viewer-deny']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 760 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript((mode) => {
      window.__asked = 0;
      if (mode === 'none') { delete Navigator.prototype.requestMIDIAccess; return; }
      const acc = { inputs: new Map([['a', { id: 'a', name: 'USB Keys', state: 'connected', onmidimessage: null }]]), outputs: new Map(), onstatechange: null };
      navigator.requestMIDIAccess = () => { window.__asked++; return mode.endsWith('deny') ? Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })) : Promise.resolve(acc); };
      if (mode === 'viewer-deny') window.claude = { use: () => Promise.resolve(null) };
    }, mode);
    await page.goto('http://127.0.0.1:8790/new/index.html');
    await page.waitForTimeout(400);
    if (w === 320) await page.screenshot({ path: 'out/m-start-320.png' });
    await page.click('#btnStart'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => window.__asked === 0), w + '/' + mode + ': phones do not ask at start');
    await page.click('#tab-dev'); await page.waitForTimeout(300);
    const btnVisible = await page.evaluate(() => [...document.querySelectorAll('#sheetBody button')].some((b) => b.textContent === 'MIDI-Keyboard verbinden' && !b.hidden));
    if (mode !== 'none') {
      ok(btnVisible, w + '/' + mode + ': connect button shown');
      await page.evaluate(() => [...document.querySelectorAll('#sheetBody button')].find((b) => b.textContent === 'MIDI-Keyboard verbinden').click());
      await page.waitForTimeout(300);
    } else ok(!btnVisible, 'no button without Web MIDI');
    const txt = await page.evaluate(() => document.querySelector('#sheetBody').innerText);
    const midiLine = txt.split('\n').find((l) => /MIDI|Keyboard|Verbunden|Safari|Browser/.test(l) && l.length > 30);
    console.log('   ', midiLine);
    if (mode === 'grant') ok(/Verbunden: USB Keys/.test(txt), 'granted: keyboard listed');
    if (mode === 'deny') ok(/blockiert/.test(txt), 'denied: explains site settings');
    if (mode === 'viewer-deny') ok(/claude\.ai-Ansicht/.test(txt), 'viewer: points to the app');
    if (mode === 'none') ok(/kein Web-MIDI/.test(txt), 'unsupported: says so');
    ok(await page.evaluate(() => { const b = document.body; return document.documentElement.scrollWidth <= innerWidth; }), w + ': no horizontal overflow');
    await page.screenshot({ path: `out/m-dev-${w}-${mode}.png` });
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
})();
