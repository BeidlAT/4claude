// Presets on the keys (owner, 30.10.2026): F1–F10 load the first ten presets of the list; with a Touché (its Spielweisen
// on F1–F12) Strg+F1–F10 does, F3 alone goes to the Spielweise; the Touché's two buttons (Program Change up / down)
// browse the presets. A mock Touché on the Web-MIDI mock (as t-fstep).                        node t-fkeys.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const inputs = new Map();
    window.__midi = { inputs, access: { inputs, outputs: new Map(), onstatechange: null } };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__midi.access);
    window.__plug = (id, name) => { inputs.set(id, { id, name, manufacturer: 'x', state: 'connected', onmidimessage: null }); if (window.__midi.access.onstatechange) window.__midi.access.onstatechange({ port: inputs.get(id) }); };
    window.__send = (id, bytes) => { const i = inputs.get(id); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const cur = () => page.evaluate(() => window.__M.UI.preset);
  const key = async (k, mods = []) => { for (const m of mods) await page.keyboard.down(m); await page.keyboard.press(k); for (const m of mods) await page.keyboard.up(m); await page.waitForTimeout(500); };
  const names = await page.evaluate(() => window.__M.PRESETS.slice(0, 10).map((p) => p.key));
  // without a Touché: F3, F10
  await key('F3'); const a = await cur(); await key('F10'); const b = await cur();
  ok(a === names[2] && b === names[9], `F3 → ${a}, F10 → ${b} (the list's 3rd and 10th)`);
  // a Touché: F3 is its Spielweise, Strg+F3 the preset
  await page.evaluate(() => window.__plug('t1', 'Touché SE')); await page.waitForTimeout(800);
  const live = await page.evaluate(() => !!window.__M.TCH.live);
  await key('F1'); await key('F3'); const w = await page.evaluate(() => window.__M.P['midi.tch']); const c = await cur();
  await key('F5', ['Control']); const d = await cur();
  ok(live && w === 'raum' && c === b && d === names[4], `with a Touché (${live}): F3 is Spielweise ${w}, the preset stays ${c}; Strg+F5 → ${d}`);
  // its buttons: Program Change up, up, down
  const pc = async (n) => { await page.evaluate((n) => window.__send('t1', [0xc0, n]), n); await page.waitForTimeout(500); };
  await pc(3); const e0 = await cur(); await pc(4); const e1 = await cur(); await pc(5); const e2 = await cur(); await pc(4); const e3 = await cur();
  const idx = (k) => names.indexOf(k);
  ok(e0 === d && idx(e1) === idx(e0) + 1 && idx(e2) === idx(e1) + 1 && e3 === e1, `the buttons: the first PC only arms (${e0}), up → ${e1}, up → ${e2}, down → ${e3}`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
