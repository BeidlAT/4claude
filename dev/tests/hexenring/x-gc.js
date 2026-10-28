// Hauptthread-Müll: allocation sites while Polarfunk plays an arp from MIDI (8 notes/s) for SEC seconds.   node x-gc.js
const H = require('./hx-h');
const SEC = +(process.env.SEC || 10);
(async () => {
  const { page } = await H.open({ w: 1440, h: 900, init: 'window.__X=' + JSON.stringify(process.env.X || '') });
  await page.evaluate(async () => { const M = window.__M; M.loadPreset(M.PRESETS ? M.PRESETS.find((p) => p.key === 'polarfunk') : 'polarfunk'); await window.__sleep(2500); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  const t0 = Date.now();
  await page.evaluate(async (sec) => {
    const M = window.__M, src = M.midiSource('x', 'Test', 'webmidi'), sl = window.__sleep, notes = [48, 55, 60, 64, 67, 72, 67, 64];
    const end = performance.now() + sec * 1000; let i = 0;
    while (performance.now() < end) { const n = notes[i++ % 8]; M.midiIn(src, new Uint8Array([0x90, n, 90]), performance.now()); await sl(100); M.midiIn(src, new Uint8Array([0x80, n, 64]), performance.now()); await sl(25); }
  }, SEC);
  const dur = (Date.now() - t0) / 1000;
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  const agg = new Map(); let tot = 0;
  const walk = (n, stack) => {
    const f = n.callFrame, name = (f.functionName || '(anon)') + ':' + (f.lineNumber + 1) + ':' + (f.columnNumber + 1) + (f.url && !/index\.html/.test(f.url) ? ' ' + f.url.slice(-30) : '');
    tot += n.selfSize;
    if (n.selfSize) { const k = name; const a = agg.get(k) || { s: 0, p: stack.slice(-3).join(' < ') }; a.s += n.selfSize; agg.set(k, a); }
    for (const c of n.children) walk(c, stack.concat((f.functionName || '(anon)')));
  };
  walk(profile.head, []);
  console.log('total', (tot / 1e6).toFixed(1), 'MB in', dur.toFixed(1), 's =', (tot / 1e6 / dur).toFixed(2), 'MB/s');
  for (const [k, a] of [...agg].sort((x, y) => y[1].s - x[1].s).slice(0, +(process.env.TOP || 30))) console.log(((a.s / 1e6) / dur).toFixed(3), 'MB/s', k, ' <', a.p);
  await H.close(); process.exit(0);
})();
