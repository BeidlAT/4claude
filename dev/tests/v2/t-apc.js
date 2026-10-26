// APC40 MK2 (26.10.2026): recognised; its Scene buttons choose the five modes; Tonnetz plays fourths; the Zeitreise
// harvests a bar of the Humus; the Raster shows the Schleife in its Pigment and toggles it; the Sequenzer and the
// Myzelnetz sound on the Taktgeber; the lights go out as Note On (after the SysEx that hands them to the computer).
// A simulated device – the real one is untested.   node t-apc.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const inputs = new Map([['a1', { id: 'a1', name: 'APC40 mkII', manufacturer: 'Akai', state: 'connected', onmidimessage: null }]]);
    window.__out = [];
    const outputs = new Map([['o1', { id: 'o1', name: 'APC40 mkII', state: 'connected', send: (b) => window.__out.push(Array.from(b)) }]]);
    window.__midi = { inputs, access: { inputs, outputs, onstatechange: null } };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__midi.access);
    window.__send = (bytes) => { const i = inputs.get('a1'); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  });
  await page.goto('http://127.0.0.1:8790/hx-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {}, A_ = M.APC;
    for (let i = 0; i < 40 && !M.HX.node; i++) await sl(100);
    const pad = (k, down) => window.__send([down ? 0x90 : 0x80, (4 - Math.floor(k / 8)) * 8 + (k % 8), down ? 127 : 0]);
    o.found = !!A_.src && A_.src.name;
    await M.apcSysex(true); await sl(200);
    o.sysex = window.__out.some((b) => b[0] === 0xf0 && b[1] === 0x47 && b[7] === 0x42);
    M.setParam('seq.bpm', 160); await sl(100);
    // Scene 4 → Tonnetz: bottom-left plays the root of the scale's octave, a row up a fourth
    window.__send([0x90, 85, 127]); await sl(50); o.mode4 = A_.mode;
    o.fourth = M.apcTonNote(24) - M.apcTonNote(32);
    const v0 = M.A.voices.size;
    for (let i = 0; i < 12; i++) { const k = [32, 34, 24, 26, 33][i % 5]; pad(k, true); await sl(220); pad(k, false); await sl(60); }
    o.tonVoices = M.A.voices.size - v0 > 0 || M.HX.lvl.some((x) => x && x[1] > 0.002);
    await sl(1600);
    // Scene 2 → Zeitreise: the newest whole bar (bottom right) harvests one bar
    window.__send([0x90, 83, 127]); await sl(300); o.mode2 = A_.mode;
    o.zeitLit = M.apcLights().slice(30).filter((p) => p && p[0]).length;
    const n0 = M.hxLoopsLive().length; pad(39, true); await sl(40); pad(39, false); await sl(200);
    o.harvest = M.hxLoopsLive().length - n0;
    const L = M.hxLoopsLive()[0]; o.bars = L && L.d.beats / 4;
    await sl(3500);
    // Scene 1 → Raster: slot 1 in its Pigment; a tap mutes it at the bar line (blinking while it waits)
    window.__send([0x90, 82, 127]); await sl(200);
    const p0 = M.apcLights()[0]; o.pig = [p0 && p0[0], M.apcVel(M.hxCol(L))];
    pad(0, true); pad(0, false); await sl(80); o.wait = M.HX.pend.some((p) => p.loop === L.id) ? M.apcLights()[0][1] : 13;   // (blinking while it waits for its bar line, if it does)
    await sl(2200); o.after = L.state; o.dim = M.apcLights()[0][0] === M.apcVel(M.hxCol(L), 0.3);
    // Scene 5 → Sequenzer: three steps on lane 1, it runs; the playhead moves
    window.__send([0x90, 86, 127]); await sl(50);
    pad(0, true); pad(0, false); pad(2, true); pad(2, false); pad(36, true); pad(36, false);
    o.seqOn = A_.seq.on; const c0 = A_.seq.cur; await sl(700); o.seqMoves = A_.seq.cur !== c0 && A_.seq.cur >= 0;
    window.__send([0x90, 91, 127]); await sl(50); o.seqStop = !A_.seq.on;
    // Scene 3 → Myzelnetz: a seed grows
    window.__send([0x90, 84, 127]); await sl(50);
    pad(20, true); pad(20, false); await sl(1500);
    o.net = Array.from(A_.net.c).filter((v) => v !== 0).length;
    M.apcNetRun(false);
    // the lights: Note On for the pads, the Scene LED of the mode
    const outs = window.__out.filter((b) => (b[0] & 0xf0) === 0x90);
    o.leds = outs.length; o.sceneLed = outs.some((b) => b[1] === 84 && b[2] === 1);
    // the picture in the Gerätebild
    M.cbOpen(A_.src); await sl(400); o.ui = document.querySelectorAll('.apc-pad').length; o.uiLit = document.querySelectorAll('.apc-pad.lit').length;
    return o;
  });
  console.log(JSON.stringify(r));
  await page.screenshot({ path: 'out/apc.png' });
  ok(r.found && r.sysex, `APC40 mkII recognised; the SysEx hands its lights to Myzel (${r.found})`);
  ok(r.mode4 === 'ton' && r.fourth === 5 && r.tonVoices, `Scene 4: Tonnetz – a row up is a fourth (${r.fourth}), pads sound`);
  ok(r.mode2 === 'zeit' && r.zeitLit > 0 && r.harvest === 1 && r.bars === 1, `Scene 2: Zeitreise – bars lit by their level (${r.zeitLit}), a pad harvests its bar (${r.harvest} Schleife, ${r.bars} Takt)`);
  ok(r.pig[0] === r.pig[1] && r.pig[0] > 0 && r.wait === 13 && r.after === 'stumm' && r.dim, `Raster: slot 1 in its Pigment (velocity ${r.pig.join(' = ')}), a tap: ${r.after}, its pad dimmed`);
  ok(r.seqOn && r.seqMoves && r.seqStop, 'Puls-Sequenzer: steps start it, the playhead moves, Play stops it');
  ok(r.net > 1, `Myzelnetz: a seed grows (${r.net} cells alive or Humus)`);
  ok(r.leds > 40 && r.sceneLed, `lights: ${r.leds} Note On to the device, the mode's Scene LED`);
  ok(r.ui === 40 && r.uiLit > 0, `Gerätebild: the 40 pads as a picture (${r.uiLit} lit)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
