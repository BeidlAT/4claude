// (owner, 26.10.2026) a keyboard on the MIDI input of an audio interface (Steinberg UR22C): the port names the interface,
// so the card asks which instrument hangs on it (no picture of the interface itself); chosen – the PCR-M50 – the card
// names it, the Gerätebild draws it, the choice stays after a reload.          node t-iface.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    const inputs = new Map([['i1', { id: 'i1', name: 'Steinberg UR22C-1', manufacturer: 'Yamaha', state: 'connected', onmidimessage: null }]]);
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs, outputs: new Map(), onstatechange: null });
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const open = async () => { await page.waitForFunction(() => !!window.__M); await page.click('#btnStart'); await page.waitForTimeout(900); await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(500); };
  const card = () => page.evaluate(() => { const c = [...document.querySelectorAll('.kc-dev')].find((e) => /Steinberg/.test(e.textContent)); return c ? { text: c.querySelector('.kc-prof').textContent, bild: !!c.querySelector('[data-kc$=":bild"]'), sel: !!c.querySelector('.kc-msel') } : null; });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html'); await open();
  const a = await card();
  await page.selectOption('.kc-msel', 'pcrm50'); await page.waitForTimeout(400);
  const b = await card();
  const model = await page.evaluate(async () => { const M = window.__M; M.cbOpen([...M.MIDI.srcs.values()][0]); await new Promise((r) => setTimeout(r, 300)); const v = document.querySelector('.cb-model').value, n = document.querySelectorAll('.cb-c').length; M.cbClose(); return v + '/' + n; });
  await page.reload(); await open();
  const c = await card();
  console.log(JSON.stringify({ a, b, model, c }));
  ok(a && /Audio-Interface/.test(a.text) && !a.bild && a.sel, `interface port: asks which instrument hangs on it, no picture of the interface („${a && a.text.slice(0, 60)}…“)`);
  ok(b && /PCR-M50/.test(b.text) && b.bild, `chosen: „${b && b.text.slice(0, 50)}…“, Gerätebild offered`);
  ok(/^pcrm50\/\d+/.test(model) && +model.split('/')[1] > 20, `the Gerätebild draws the PCR-M50 (${model})`);
  ok(c && /PCR-M50/.test(c.text), 'the choice stays after a reload');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
