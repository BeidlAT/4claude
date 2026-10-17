// Regression checks for the review findings.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const inp = { id: 'k', name: 'T', state: 'connected', onmidimessage: null };
    window.__acc = { inputs: new Map([['k', inp]]), outputs: new Map(), onstatechange: null };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__acc);
    window.__send = (b) => inp.onmidimessage && inp.onmidimessage({ data: new Uint8Array(b) });
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(500);
  let r = await page.evaluate(() => { const M = window.__M; window.__send([0xb0, 64, 127]); window.__send([0x90, 60, 100]); window.__send([0x80, 60, 0]); const a = M.touches.has('midi-k-0-60'); window.__send([0xb0, 121, 0]); return { a, b: M.touches.has('midi-k-0-60'), sus: M.MIDI.sus }; });
  ok(r.a && !r.b && !r.sus, 'CC121 releases notes held by the pedal');
  r = await page.evaluate(async () => { const M = window.__M; window.__send([0xe0, 0x7f, 0x7f]); await new Promise((r) => setTimeout(r, 80)); const b1 = M.A.bendCents; M.panic(); await new Promise((r) => setTimeout(r, 80)); return { b1, b2: M.A.bendCents, off: M.A.bendSrc.offset.value }; });
  ok(r.b1 > 100 && r.b2 === 0 && Math.abs(r.off) < 5, 'panic centres the pitch wheel');
  r = await page.evaluate(async () => {
    const M = window.__M; M.setParam('v.eng', 'neb'); M.setParam('dev.q', '2');
    for (let n = 40; n < 70; n++) window.__send([0x90, n, 90]);   // 30 held Nebel notes
    const held = [...M.A.voices].filter((v) => !v.released).length;
    M.A.budgetScale = 0.3; M.applyQuality();
    const after = [...M.A.voices].filter((v) => !v.released).length;
    for (let n = 40; n < 70; n++) window.__send([0x80, n, 0]);
    M.A.budgetScale = 1; M.applyQuality();
    return { held, after };
  });
  ok(r.held >= 20 && r.after === r.held, 'lowering the budget keeps held notes (' + r.after + '/' + r.held + ')');
  r = await page.evaluate(async () => {
    const M = window.__M; M.setParam('dev.q', '3'); await new Promise((r) => setTimeout(r, 300)); M.setParam('dev.q', '1');
    await new Promise((r) => setTimeout(r, 2500)); return { want: M.A.revWant, ch: M.A.revActive && M.A.revActive.conv.buffer.numberOfChannels };
  });
  ok(r.want === 2 && r.ch === 2, 'quick 1→3→1 ends with a stereo IR (' + r.ch + ' channels)');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await browser.close();
})();
