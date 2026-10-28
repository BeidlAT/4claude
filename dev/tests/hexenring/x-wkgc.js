// Audio-Thread-Müll: V8's --trace-gc (each isolate's collections on the browser's stderr, DEBUG=pw:browser*) while a
// preset plays an arp from MIDI; the isolate whose GCs follow the AudioWorklet is the audio thread's.
//   DEBUG=pw:browser* SEC=10 PRESET=polarfunk node x-wkgc.js 2> gc.log
const { chromium } = require('playwright');
const SEC = +(process.env.SEC || 10), PRESET = process.env.PRESET || 'polarfunk', ENG = process.env.ENG || '';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--js-flags=--trace-gc --trace-gc-nvp'] });
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  if (process.env.NOARP) await page.addInitScript('window.__NOARP = 1');
  await page.goto(process.env.HX_URL); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1500);
  await page.evaluate(async (pr) => { const M = window.__M; if (pr[0] !== 'none') M.loadPreset(M.PRESETS.find((p) => p.key === pr[0])); if (pr[1]) { M.setParam('v.eng', pr[1]); M.setParam('v.layer', 'off'); } await new Promise((r) => setTimeout(r, 2500)); }, [PRESET, ENG]);
  console.error('@@MARK start');
  await page.evaluate(async (sec) => {
    const M = window.__M, src = M.midiSource('x', 'Test', 'webmidi'), sl = (ms) => new Promise((r) => setTimeout(r, ms)), notes = [48, 55, 60, 64, 67, 72, 67, 64];
    const end = performance.now() + sec * 1000; let i = 0;
    if (window.__NOARP) { await sl(sec * 1000); return; }
    while (performance.now() < end) { const n = notes[i++ % 8]; M.midiIn(src, new Uint8Array([0x90, n, 90]), performance.now()); await sl(100); M.midiIn(src, new Uint8Array([0x80, n, 64]), performance.now()); await sl(25); }
  }, SEC);
  console.error('@@MARK end');
  await b.close();
})();
