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
    const M = window.__M, T = (b) => window.__send(b, 'k1'), sl = window.__sleep, mv = () => ({ h: +M.modVal('hoehe').toFixed(3), b: +M.modVal('bend').toFixed(3), e: +M.modVal('expr').toFixed(3), f: +M.modVal('flt').toFixed(3), r: +M.modVal('rev').toFixed(3), d: +M.modVal('dly').toFixed(3), p: +M.modVal('pan').toFixed(3), m: +M.modVal('morph').toFixed(3), w: +M.modVal('vok').toFixed(3), o: +M.modVal('vokO').toFixed(3), u: +M.modVal('vokV').toFixed(3) });
    const key = (k, sh) => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: !!sh, bubbles: true, cancelable: true })); };
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
    // einmessen: a side that travels only a quarter of the range covers all of it
    M.tchEinmessen(); T([0xb0, 18, 32]); M.mapFlush(); await sl(30); T([0xb0, 18, 0]); key('F1'); M.mapFlush(); await sl(30);
    T([0xb0, 18, 32]); M.mapFlush(); await sl(60); o.cal = mv(); T([0xb0, 18, 16]); M.mapFlush(); await sl(60); o.cal2 = mv(); T([0xb0, 18, 0]); M.mapFlush();
    T([0xb0, 17, 127]); M.mapFlush(); await sl(30); T([0xb0, 17, 0]); M.mapFlush();
    // a switch carries what the hand holds over
    key('F1'); T([0xb0, 17, 127]); M.mapFlush(); await sl(40); key('F3'); await sl(60); o.carry = mv(); T([0xb0, 17, 0]); M.mapFlush();
    // Gleiten (⇧F1): the newest note a fifth; Streichen (⇧F2): silent at rest, the hand's pressure sets the height; Vokal (⇧F4)
    const tt = M.touches.get('midi-k2-0-60'), cents = () => Math.round(M.modCents(tt, M.modNewest(), M.A.ctx.currentTime)), yy = () => +M.modY(tt, M.modNewest()).toFixed(2);
    key('F1', 1); await sl(40); o.glW = M.P['midi.tch']; T([0xb0, 19, 127]); M.mapFlush(); await sl(60); o.gl = cents(); T([0xb0, 19, 0]); M.mapFlush(); await sl(40); o.gl0 = cents();
    key('F2', 1); await sl(60); o.stW = M.P['midi.tch']; o.st0 = mv();
    T([0xb0, 17, 127]); M.mapFlush(); await sl(60); o.stWeg = mv(); o.stY = yy(); T([0xb0, 17, 0]);
    T([0xb0, 16, 127]); M.mapFlush(); await sl(60); o.stHer = mv(); o.stY2 = yy(); T([0xb0, 16, 0]); M.mapFlush(); await sl(40);
    key('F4', 1); await sl(60); o.voW = M.P['midi.tch']; o.vo0 = mv();
    T([0xb0, 17, 127]); T([0xb0, 18, 127]); M.mapFlush(); await sl(60); o.vo = mv(); T([0xb0, 17, 0]); T([0xb0, 18, 0]); M.mapFlush(); await sl(60); o.vo1 = mv();
    key('F1'); await sl(40);
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
  ok(w.atemW === 'atem' && Object.values(w.atem0).every((x) => x === 0), `F2 → Atem: at rest nothing changes (${JSON.stringify(w.atem0)}) – only the hand on the Touché shapes the sound`);
  ok(w.atemWeg.e === 1 && w.atemWeg.h === 0.5, `Atem, away: it swells and brightens (${JSON.stringify(w.atemWeg)})`);
  ok(w.atemHer.f < -0.8 && w.atemHer.e < -0.5, `Atem, toward you: damped dark (${JSON.stringify(w.atemHer)})`);
  ok(w.vib[0] < -0.15 && w.vib[1] > 0.15 && w.vib0.b === 0, `Atem, right: a vibrato (${w.vib.map((x) => x.toFixed(2)).join(' … ')}), gone at rest`);
  ok(w.raum.r === 0.85 && Math.abs(w.raum.d - 0.43) < 0.01 && w.raum.p === -1, `F3 → Raum: Hall, Echo, Panorama; Atem's rest gone (${JSON.stringify(w.raum)})`);
  ok(w.verw.m === 1 && w.verw.f === 1 && w.verw0.m === 0 && w.verw0.f === 0, `F4 → Verwandlung: toward scene B, Filter open (${JSON.stringify(w.verw)})`);
  ok(w.cal.b === -0.5 && Math.abs(w.cal2.b + 0.25) < 0.01, `einmessen: a side pressed only a quarter of the way bends the whole semitone (${w.cal.b}, half of it ${w.cal2.b})`);
  ok(w.carry.r === 0.85 && w.carry.h === 0, `a switch carries what is held into the new Spielweise (${JSON.stringify(w.carry)})`);
  ok(w.chip && w.chipW === 'atem' && /true/.test(w.pressed), `the device card's chips choose it (${w.chipW}, ${w.pressed})`);
  ok(w.glW === 'gleiten' && w.gl === 700 && w.gl0 === 0, `⇧F1 → Gleiten: right glides the newest note a fifth (${w.gl} cents)`);
  ok(w.stW === 'streichen' && w.st0.e === -1, `⇧F2 → Streichen: without pressure silent (Ausdruck ${w.st0.e})`);
  ok(w.stWeg.e === 0 && w.stY === 1, `Streichen, away: full sound, the height the bow's pressure (${w.stWeg.e}, height ${w.stY})`);
  ok(w.stHer.e === 0 && w.stY2 < 0.15, `Streichen, toward you: sounding, light and airy (height ${w.stY2})`);
  ok(w.voW === 'vokal' && w.vo0.w === 0 && w.vo.w === 1 && w.vo.o === 1 && w.vo.u === -1 && w.vo1.w === 0 && w.vo1.e === 0, `⇧F4 → Vokal: pressure opens the mouth, away the jaw (a), left the tongue back; at rest closed and Streichen's silence gone (${JSON.stringify(w.vo)})`);
  ok(Object.values(w.gone).every((x) => x === 0) && w.live === false, `unplugged: nothing stays (${JSON.stringify(w.gone)})`);
  // Vokal in the insert chain: white noise through a chain – a, i, u put their formants where they belong; at rest flat
  const v = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = window.__sleep;
    const c = M.makeChain(), n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(c.in); src.start();
    const an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0; c.out.connect(an);
    const hz = ctx.sampleRate / an.fftSize;
    const db = async () => { await sl(300); const a = new Float32Array(an.frequencyBinCount), t = new Float32Array(an.frequencyBinCount);
      for (let k = 0; k < 20; k++) { an.getFloatFrequencyData(t); for (let i = 0; i < a.length; i++) a[i] += Math.pow(10, t[i] / 10) / 20; await sl(30); }
      const band = (f) => { let s = 0, k = 0; for (let i = Math.round(f * 0.93 / hz); i < f * 1.07 / hz; i++) { s += a[i]; k++; } return 10 * Math.log10(s / k); };
      return { f300: band(300), f750: band(750), f800: band(800), f1350: band(1350), f2300: band(2300) }; };
    const set = (w, o, u) => { M.modSet('t:w', 'vok', w); M.modSet('t:o', 'vokO', o); M.modSet('t:u', 'vokV', u); };
    const o = { rest: await db() };
    set(1, 1, 0); o.a = await db(); set(1, -1, 1); o.i = await db(); set(1, -1, -1); o.u = await db(); set(0, 0, 0); o.back = await db();
    src.stop(); return o;
  });
  const rd = (x) => Object.values(x).map((y) => y.toFixed(0)).join(' ');
  ok(v.a.f750 - v.a.f300 > 8 && v.a.f1350 - v.a.f2300 > 8, `Vokal a: the energy at 750–1350 Hz (${rd(v.a)} dB at 300/750/800/1350/2300)`);
  ok(v.i.f300 - v.i.f750 > 12 && v.i.f2300 - v.i.f1350 > 12, `Vokal i: 300 and 2300 Hz (${rd(v.i)})`);
  ok(v.u.f300 - v.u.f1350 > 12 && v.u.f800 - v.u.f1350 > 12, `Vokal u: 300 and 800 Hz (${rd(v.u)})`);
  const flat = (x) => Math.max(...Object.values(x)) - Math.min(...Object.values(x));
  ok(flat(v.rest) < 3 && flat(v.back) < 3 && Math.abs(v.back.f800 - v.rest.f800) < 2, `at rest the chain is flat as before, and again after (${rd(v.rest)} → ${rd(v.back)})`);
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
