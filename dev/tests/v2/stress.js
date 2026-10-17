// Real-time stress: level 3, Puls + Bordun + layer, MIDI chords and runs for 12 s; then panic; then level switches.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const inp = { id: 'k', name: 'Stress', state: 'connected', onmidimessage: null };
    const acc = { inputs: new Map([['k', inp]]), outputs: new Map(), onstatechange: null };
    navigator.requestMIDIAccess = () => Promise.resolve(acc);
    window.__send = (b) => inp.onmidimessage && inp.onmidimessage({ data: new Uint8Array(b) });
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(400);
  await page.evaluate(() => { const M = window.__M; M.setParam('dev.q', '3'); M.setParam('v.layer', 'sch'); M.setParam('bor.on', true); M.seqStart(); M.setParam('l2.on', true); M.setParam('l3.on', true); });
  await page.waitForFunction(() => !window.__M.CAL.running && window.__M.CAL.unit > 0, null, { timeout: 20000 });
  const r = await page.evaluate(async () => {
    const M = window.__M, engs = ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch'];
    let maxV = 0, maxLoad = 0, maxGr = 0, lag = 0;
    const t0 = performance.now();
    for (let k = 0; performance.now() - t0 < 12000; k++) {
      if (k % 40 === 0) M.setParam('v.eng', engs[(k / 40) % engs.length]);
      const root = 40 + ((k * 5) % 36);
      const a = performance.now();
      window.__send([0x90, root, 100]); window.__send([0x90, root + 7, 80]); window.__send([0x90, root + 12, 60]);
      lag = Math.max(lag, performance.now() - a);
      if (k % 4 === 0) window.__send([0xb0, 64, k % 8 ? 0 : 127]);
      window.__send([0xb0, 1, (k * 9) % 128]); window.__send([0xe0, 0, 64 + ((k * 3) % 32) - 16]); window.__send([0xd0, (k * 13) % 128]);
      await new Promise((r) => setTimeout(r, 40));
      window.__send([0x80, root, 0]); window.__send([0x80, root + 7, 0]); window.__send([0x80, root + 12, 0]);
      maxV = Math.max(maxV, M.A.voices.size); maxLoad = Math.max(maxLoad, M.voiceLoad()); maxGr = Math.max(maxGr, M.A.grains);
    }
    window.__send([0xb0, 64, 0]);
    const heldMidi = [...M.touches.keys()].filter((id) => String(id).startsWith('midi-')).length;
    M.panic();
    await new Promise((r) => setTimeout(r, 400));
    const afterPanic = M.A.voices.size;
    for (const q of ['1', '2', '3', '1']) { M.setParam('dev.q', q); await new Promise((r) => setTimeout(r, 200)); }
    const [B, MX] = M.getBudget();
    return { maxV, maxLoad: +maxLoad.toFixed(1), maxGr, B, MX, heldMidi, afterPanic, lagMs: +lag.toFixed(2), unit: M.CAL.unit, bor: !!M.A.bor };
  });
  console.log(JSON.stringify(r));
  ok(r.heldMidi === 0, 'no MIDI notes left hanging after the run');
  ok(r.afterPanic === 0, 'panic silences everything');
  ok(r.lagMs < 30, 'three note-ons handled in ' + r.lagMs + ' ms (main thread, level 3)');
  ok(!errors.length, 'no errors ' + errors.slice(0, 5).join(' | '));
  await browser.close();
})();
