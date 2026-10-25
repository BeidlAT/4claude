// Expressive E Touché SE (owner, 25.10.2026): recognised by name, its four directions (factory CC 16–19) shape the held
// notes like a finger on the field – away/toward the height, left/right the newest note's pitch (±1 semitone) – through
// Formen, so the preset never changes; back at rest nothing is left.   node t-map-touche.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Touché SE'], ['k2', 'Testkeyboard'], ['k3', 'TOUCHE']] } });
  const r = await page.evaluate(async () => {
    const M = window.__M, T = (b) => window.__send(b, 'k1'), K = (b) => window.__send(b, 'k2'), sl = window.__sleep;
    const o = { txt: M.profText(M.MIDI.srcs.get('k1')), txt2: M.profText(M.MIDI.srcs.get('k3')), kb: M.profText(M.MIDI.srcs.get('k2')) };
    const pv = JSON.stringify(M.patchValues ? M.patchValues() : M.P);
    K([0x90, 60, 100]); await sl(80);
    const tt = M.touches.get('midi-k2-0-60'); o.note = !!tt; const y0 = tt ? tt.y : 0;
    const at = async (msg) => { T(msg); M.mapFlush(); await sl(60); const nw = M.modNewest(); return { h: +M.modVal('hoehe').toFixed(3), b: +M.modVal('bend').toFixed(3), dy: +(M.modY(tt, nw) - y0).toFixed(3), c: Math.round(M.modCents(tt, nw, M.A.ctx.currentTime)) }; };
    o.weg = await at([0xb0, 17, 127]); o.weg0 = await at([0xb0, 17, 0]);
    o.her = await at([0xb0, 16, 127]); o.her0 = await at([0xb0, 16, 0]);
    o.re = await at([0xb0, 19, 127]); o.re0 = await at([0xb0, 19, 0]);
    o.li = await at([0xb0, 18, 127]); o.half = await at([0xb0, 18, 64]); o.li0 = await at([0xb0, 18, 0]);
    o.preset = pv === JSON.stringify(M.patchValues ? M.patchValues() : M.P);
    K([0x80, 60, 0]); await sl(50);
    return o;
  });
  // the held note's glow follows on the field (a picture each: at rest, pushed away and to the right)
  await page.evaluate(async () => { window.__send([0x90, 60, 100], 'k2'); await window.__sleep(400); });
  await page.screenshot({ path: 'out/touche-0.png' });
  await page.evaluate(async () => { window.__send([0xb0, 17, 127], 'k1'); window.__send([0xb0, 19, 127], 'k1'); window.__M.mapFlush(); await window.__sleep(400); });
  await page.screenshot({ path: 'out/touche-1.png' });
  await page.evaluate(async () => { window.__send([0xb0, 17, 0], 'k1'); window.__send([0xb0, 19, 0], 'k1'); window.__send([0x80, 60, 0], 'k2'); await window.__sleep(100); });
  // the Spielweisen (the knob on the device sends nothing): Atem, Raum, Verwandlung – F1–F4, the card's chips
  const w = await page.evaluate(async () => {
    const M = window.__M, T = (b) => window.__send(b, 'k1'), sl = window.__sleep, mv = () => ({ h: +M.modVal('hoehe').toFixed(3), b: +M.modVal('bend').toFixed(3), e: +M.modVal('expr').toFixed(3), f: +M.modVal('flt').toFixed(3), r: +M.modVal('rev').toFixed(3), d: +M.modVal('dly').toFixed(3), p: +M.modVal('pan').toFixed(3), m: +M.modVal('morph').toFixed(3) });
    const key = (k) => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); };
    const o = {};
    window.__send([0x90, 60, 100], 'k2'); await sl(60);
    key('F2'); await sl(60); o.atemW = M.P['midi.tch']; o.atem0 = mv();
    T([0xb0, 17, 127]); M.mapFlush(); await sl(60); o.atemWeg = mv(); T([0xb0, 17, 0]);
    T([0xb0, 16, 127]); M.mapFlush(); await sl(60); o.atemHer = mv(); T([0xb0, 16, 0]);
    T([0xb0, 19, 127]); M.mapFlush(); const bs = []; for (let i = 0; i < 12; i++) { await sl(25); bs.push(M.modVal('bend')); } o.vib = [Math.min(...bs), Math.max(...bs)]; T([0xb0, 19, 0]); M.mapFlush(); await sl(80); o.vib0 = mv();
    key('F3'); await sl(60); o.raum0 = mv();
    T([0xb0, 17, 127]); T([0xb0, 16, 64]); T([0xb0, 18, 127]); M.mapFlush(); await sl(60); o.raum = mv(); T([0xb0, 17, 0]); T([0xb0, 16, 0]); T([0xb0, 18, 0]);
    key('F4'); await sl(60);
    T([0xb0, 17, 127]); T([0xb0, 19, 127]); M.mapFlush(); await sl(60); o.verw = mv(); T([0xb0, 17, 0]); T([0xb0, 19, 0]); M.mapFlush(); await sl(60); o.verw0 = mv();
    // a switch carries what the hand holds over
    key('F1'); T([0xb0, 17, 127]); M.mapFlush(); await sl(40); key('F3'); await sl(60); o.carry = mv(); T([0xb0, 17, 0]); M.mapFlush();
    // the card: a chip per Spielweise
    M.openPanel('dev'); await sl(500);
    const ch = [...document.querySelectorAll('[data-kc$=":tchatem"]')][0]; o.chip = !!ch; if (ch) ch.click(); await sl(300);
    o.chipW = M.P['midi.tch']; o.pressed = [...document.querySelectorAll('[data-kc$=":tchatem"]')].map((b) => b.getAttribute('aria-pressed')).join();
    // unplugged (both Touchés): nothing of it stays, not even Atem's soft rest; F keys free again
    window.__send([0x80, 60, 0], 'k2');
    window.__midi.unplug('k1'); window.__midi.unplug('k3');
    await sl(1500); o.gone = mv(); o.live = M.TCH.live;
    return o;
  });
  ok(w.atemW === 'atem' && w.atem0.e < -0.5 && w.atem0.h === 0, `F2 → Atem: at rest soft (Ausdruck ${w.atem0.e})`);
  ok(w.atemWeg.e > 0.3 && w.atemWeg.h > 0.3, `Atem, away: it swells and brightens (${JSON.stringify(w.atemWeg)})`);
  ok(w.atemHer.f < -0.8 && w.atemHer.e < -0.9, `Atem, toward you: damped dark (${JSON.stringify(w.atemHer)})`);
  ok(w.vib[0] < -0.15 && w.vib[1] > 0.15 && w.vib0.b === 0, `Atem, right: a vibrato (${w.vib.map((x) => x.toFixed(2)).join(' … ')}), gone at rest`);
  ok(w.raum0.e === 0 && w.raum.r === 0.85 && Math.abs(w.raum.d - 0.43) < 0.01 && w.raum.p === -1, `F3 → Raum: Hall, Echo, Panorama; Atem's rest gone (${JSON.stringify(w.raum)})`);
  ok(w.verw.m === 1 && w.verw.f === 1 && w.verw0.m === 0 && w.verw0.f === 0, `F4 → Verwandlung: toward scene B, Filter open (${JSON.stringify(w.verw)})`);
  ok(w.carry.r === 0.85 && w.carry.h === 0, `a switch carries what is held into the new Spielweise (${JSON.stringify(w.carry)})`);
  ok(w.chip && w.chipW === 'atem' && /true/.test(w.pressed), `the device card's chips choose it (${w.chipW}, ${w.pressed})`);
  ok(Object.values(w.gone).every((x) => x === 0) && w.live === false, `unplugged: nothing stays (${JSON.stringify(w.gone)})`);
  ok(/^Expressive E Touché erkannt/.test(r.txt) && /^Expressive E Touché erkannt/.test(r.txt2) && r.kb === '', `recognised by name (${r.txt}; „TOUCHE“ too; a plain keyboard not)`);
  ok(r.note, 'a key held on another keyboard');
  ok(r.weg.h === 1 && r.weg.dy > 0.2, `pushed away: the height goes up (${JSON.stringify(r.weg)})`);
  ok(r.her.h === -1 && r.her.dy < -0.2, `pulled toward you: the height goes down (${JSON.stringify(r.her)})`);
  ok(r.re.b === 0.5 && r.re.c === 100, `right: the note one semitone up (${JSON.stringify(r.re)})`);
  ok(r.li.c === -100 && Math.abs(r.half.c + 50) <= 1, `left: down, half way half a semitone (${r.li.c}, ${r.half.c} cents)`);
  ok([r.weg0, r.her0, r.re0, r.li0].every((x) => x.h === 0 && x.b === 0 && x.dy === 0 && x.c === 0), 'back at rest nothing is left');
  ok(r.preset, 'the preset is untouched (Formen)');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
