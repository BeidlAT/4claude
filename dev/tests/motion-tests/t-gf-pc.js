// Fährte on a computer without motion sensors (slot gf; node t-gf-pc.js): a fake KORG nanoKEY Studio – its X-Y pad as a
// finger is written down as the finger's height and loops onto the held notes' Höhe; its knob 1 (Filter, a patch
// parameter) is written down and loops as Formen · Filter relative to where the knob was left, without writing the
// patch; the bar's button with a real mouse (tap, hold, double tap); a pad learned to "Fährte" in Zuweisen acts on press
// and release (tap, hold, double tap); the Gerät panel's Fährte section says what is written down and what runs.
const H = require('./gf-h');
const { ok, model } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// wait until a whole bar has been heard since now (the tap then takes it)
async function aBar(page) {
  const b1 = await page.evaluate(() => { const M = window.__M, b = M.faeHeard(performance.now()); return M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4) + 4.4; });
  await page.waitForFunction((b) => window.__M.faeHeard(performance.now()) >= b, b1, { timeout: 9000 });
}
(async () => {
  const { page, errors } = await H.open({ cfg: { noMotion: true, ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL'], ['p2', 'Pad Box']] } });
  const s0 = await page.evaluate(() => ({ ex: typeof window.DeviceMotionEvent, gk: window.__M.GK.on, btn: document.getElementById('btnFae').hidden, prof: window.__M.mapOf(window.__M.MIDI.srcs.values().next().value) && [...window.__M.MIDI.srcs.values()].map((s) => s.prof && s.prof.id) }));
  ok(s0.ex === 'undefined' && !s0.gk, 'a computer: no motion API at all, Gestik off');
  await sleep(400);
  ok(await page.evaluate(() => !document.getElementById('btnFae').hidden), 'with a keyboard connected the bar shows the Fährte button');
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.len = 1; M.FA.p.fade = 1; });
  // ---- the X-Y pad as a finger: touch, then Y sweeps (the nanoKEY sends CC 16/17/18)
  await page.evaluate(() => {
    window.__send([0xb0, 16, 64], 'k1'); window.__send([0xb0, 17, 64], 'k1'); window.__send([0xb0, 18, 127], 'k1');
    const t0 = performance.now();
    window.__xy = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__send([0xb0, 17, Math.round(127 * (0.5 + 0.35 * Math.sin((2 * Math.PI * t) / 0.9)))], 'k1'); }, 20);
  });
  await sleep(200);
  const xy = await page.evaluate(() => [...window.__M.touches.keys()].filter((k) => String(k).startsWith('midi-xy')).length);
  ok(xy === 1, 'the X-Y pad plays as a finger');
  await aBar(page);
  ok(await page.evaluate(() => window.__M.FA.lanes.has('y')), 'its height is written down (lane y – the newest note\'s height against its start)');
  // a real click on the bar's button: a tap
  await page.click('#btnFae');
  ok(await page.evaluate(() => window.__M.faeState() === 'pend'), 'a click on the button: the tap waits for a second one (double tap) …');
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  await page.evaluate(() => { clearInterval(window.__xy); window.__send([0xb0, 18, 0], 'k1'); });
  const L = await page.evaluate(() => window.__loop());
  ok(L && L.lanes.length === 1 && L.lanes[0].k === 'hoehe' && L.lanes[0].src === 'y', '… then the last bar loops: the X-Y pad\'s height on Höhe');
  const amp = Math.max(...L.lanes[0].v.map(Math.abs));
  ok(amp > 0.4 && amp <= 1, 'with the movement in it (peak ' + amp.toFixed(2) + ' of a ±0.7 sweep × 2)');
  await sleep(300);
  // a key held now: its height follows the loop (Höhe = the loop × half the field)
  await page.evaluate(() => window.__send([0x90, 60, 100], 'k1'));
  await sleep(120);
  const ys = [];
  for (let i = 0; i < 25; i++) {
    ys.push(await page.evaluate(() => { const M = window.__M, tt = [...M.touches.values()].find((x) => x.name); const t = M.A.ctx.currentTime; return [t, M.modY(tt) - tt.y, tt.y]; }));
    await sleep(60);
  }
  await page.evaluate(() => window.__send([0x80, 60, 0], 'k1'));
  const L2 = await page.evaluate(() => window.__loop());
  let err = 0, mv = 0;
  for (const [t, d, y] of ys) { const e = Math.max(-y, Math.min(1 - y, model(L2, t) * 0.5)); err = Math.max(err, Math.abs(d - e)); mv = Math.max(mv, Math.abs(d)); }
  ok(mv > 0.1 && err < 0.02, 'a key held later: its timbre follows the looped pad (deflection up to ' + mv.toFixed(2) + ', off by ' + err.toFixed(4) + ')');
  const sec = await page.evaluate(() => { const M = window.__M; M.openPanel('dev'); M.faeUI(); return document.querySelector('.fae-sec .fae-st').textContent; });
  ok(/Fährte läuft · 1 Takt · ewig/.test(sec), 'the Gerät panel says so: „' + sec + '“');
  await page.evaluate(() => window.__M.closePanel());
  // ---- double click on the button: cleared
  await page.click('#btnFae'); await sleep(90); await page.click('#btnFae');
  await sleep(500);
  ok(await page.evaluate(() => !window.__M.FA.loop && window.__M.faeState() === ''), 'two clicks within 400 ms clear the Fährte (no loop left behind by the first)');
  // ---- knob 1 (Filter): a patch parameter, looped as Formen · Filter relative to where it was left
  await page.evaluate(async () => {
    for (let v = 0; v <= 127; v += 4) { window.__send([0xb0, 20, v], 'k1'); await window.__sleep(8); }   // soft takeover: the knob meets the Filter first
    const t0 = performance.now();
    window.__kn = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__send([0xb0, 20, Math.round(70 + 14 * Math.sin((2 * Math.PI * t) / 1.1))], 'k1'); }, 20);
  });
  await sleep(150);
  await aBar(page);
  await page.click('#btnFae');
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  await page.evaluate(() => clearInterval(window.__kn));
  const K = await page.evaluate(() => window.__loop());
  ok(K.lanes.length === 1 && K.lanes[0].k === 'flt' && K.lanes[0].src === 'p:flt.freq', 'the knob\'s Filter is written down and loops as Formen · Filter (lane p:flt.freq)');
  ok(Math.abs(K.lanes[0].v[K.lanes[0].v.length - 1]) < 0.02, 'relative to where the knob was left: the loop\'s last value is its rest (' + K.lanes[0].v[K.lanes[0].v.length - 1].toFixed(4) + ')');
  await sleep(200);
  const p0 = await page.evaluate(() => ({ f: window.__M.P['flt.freq'], d: window.__M.UI.preset }));
  await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
  const tk = await page.evaluate(() => window.__M.A.ctx.currentTime);
  await sleep(1800);
  const p1 = await page.evaluate(() => ({ f: window.__M.P['flt.freq'], d: window.__M.UI.preset }));
  const K2 = await page.evaluate(() => window.__loop());
  const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])), tk + 0.05);
  let e2 = 0, rng = 0;
  for (const [T, v] of pts) { e2 = Math.max(e2, Math.abs(v / 2400 - model(K2, T))); rng = Math.max(rng, Math.abs(v)); }
  ok(p0.f === p1.f, 'while it loops the patch stays where the knob left it (Filter ' + Math.round(p1.f) + ' Hz)');
  ok(rng > 300 && e2 < 0.002, 'and the Filter sweeps as the knob did, on top of it (±' + Math.round(rng) + ' cents, off by ' + (e2 * 2400).toFixed(1) + ' cents)');
  // turning the knob now moves the whole loop (live on top: its rest is the knob)
  await page.evaluate(() => window.__send([0xb0, 20, 100], 'k1'));
  await sleep(150);
  ok(await page.evaluate(() => !!window.__M.FA.loop), 'turning the knob again: the loop keeps playing around the new position');
  await page.evaluate(() => window.__M.faeClear(false));
  // ---- hold the button (mouse down 600 ms): records from the next bar line
  const bb = await page.$('#btnFae').then((e) => e.boundingBox());
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down(); await sleep(600);
  const hs = await page.evaluate(() => ({ st: window.__M.faeState(), w: window.__M.FA.win && window.__M.FA.win.b - window.__M.FA.win.a }));
  await page.mouse.up();
  ok((hs.st === 'arm' || hs.st === 'rec') && hs.w === 192, 'holding the button: recording from the bar line (' + hs.st + ', 1 bar)');
  await sleep(50);
  ok(await page.evaluate(() => !!window.__M.FA.win), 'letting go does not stop it (the hand is free to play)');
  await page.click('#btnFae');   // a tap now cancels it
  await sleep(100);
  ok(await page.evaluate(() => !window.__M.FA.win && window.__M.faeState() === 'pend'), 'a tap during the recording cancels it');
  await sleep(500);
  // ---- a pad learned to "Fährte": tap, hold and double tap from the pad
  await page.evaluate(() => window.__M.midiLearn(true));
  await sleep(100);
  await page.evaluate(() => { window.__send([0x99, 40, 100], 'p2'); });
  await sleep(60);
  await page.evaluate(() => { window.__send([0x89, 40, 0], 'p2'); });
  await sleep(100);
  await page.click('#btnFae');   // in Zuweisen a tap on the button picks it as the target
  await sleep(700);
  const b = await page.evaluate(() => { const M = window.__M; M.midiLearn(false); const x = M.MAP.user.find((u) => u.target === 'fae'); return x && { mode: x.mode, type: x.type, num: x.num }; });
  ok(b && b.mode === 'momentary' && b.type === 'note' && b.num === 40, 'Zuweisen: a pad and a tap on the Fährte button – learned as "momentary" (press and release both count)');
  await page.evaluate(() => { const M = window.__M; M.faeClear(false); M.modSet('map:test:9', 'pan', 0.6); });
  await aBar(page);
  await page.evaluate(() => { window.__send([0x99, 40, 100], 'p2'); });
  await sleep(80);
  await page.evaluate(() => { window.__send([0x89, 40, 0], 'p2'); });
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  ok(await page.evaluate(() => window.__loop().lanes[0].k === 'pan'), 'the pad tapped: the last bar loops');
  await page.evaluate(() => window.__M.modSet('map:test:9', 'pan', 0));
  await page.evaluate(() => { window.__send([0x99, 40, 100], 'p2'); });
  await sleep(600);
  ok(await page.evaluate(() => !!window.__M.FA.win && window.__M.FA.win.od), 'the pad held while it loops: a pass over it is armed');
  await page.evaluate(() => { window.__send([0x89, 40, 0], 'p2'); });
  await sleep(100);
  await page.evaluate(async () => { window.__send([0x99, 40, 100], 'p2'); await window.__sleep(40); window.__send([0x89, 40, 0], 'p2'); });   // cancels the pass
  await sleep(120);
  await page.evaluate(async () => { window.__send([0x99, 40, 100], 'p2'); await window.__sleep(40); window.__send([0x89, 40, 0], 'p2'); });   // … and the second tap clears
  await sleep(600);
  ok(await page.evaluate(() => !window.__M.FA.loop && !window.__M.FA.win), 'the pad double-tapped: cleared');
  const notes = await page.evaluate(() => window.__M.touches.size);
  ok(notes === 0, 'the pad played no note meanwhile');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
