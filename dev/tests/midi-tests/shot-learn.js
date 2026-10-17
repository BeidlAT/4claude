// screenshots of "Zuweisen" (learn): phone portrait with the mixer, desktop with the Gerät panel
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h, mob, panel] of [[390, 844, true, 'mix'], [1280, 800, false, 'dev'], [844, 390, true, 'klang']]) {
    const ctx = await b.newContext(mob ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['k', { id: 'k', name: 'nanoKEY Studio', state: 'connected', onmidimessage: null }]]), outputs: new Map(), onstatechange: null }); });
    await page.goto('http://127.0.0.1:8790/mm-inst/index.html');
    await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart');
    await page.waitForTimeout(500);
    await page.evaluate(async (p) => { const M = window.__M; if (!M.MIDI.srcs.get('k')) await M.midiInit(false); M.openPanel(p); M.midiLearn(true); M.MIDI.srcs.get('k').onMsg({ data: new Uint8Array([0xb0, 21, 40]), timeStamp: performance.now() }); }, panel);
    await page.waitForTimeout(500);
    await page.fill('.mlearn-bar input', 'hall');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'out/learn-' + w + '.png' });
    await ctx.close();
  }
  await b.close();
})();
