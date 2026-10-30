// Ebenen (owner, 30.10.2026: „bis zu 8 Ebenen pro Klang … alles pro Ebene einstellbar … Presets, die es schon gibt,
// bleiben vorerst so“) – params.js EB, play/touch.js layers()/ebZone, voices/alloc.js (steal by note, the soft edge's
// gain), mixer strips eb3–eb8, the Hexenring's Gespielt taps, the Sporenwerk, the Werk-Rahmen, the Klang page.
//  1 the old ids are Ebene 2 (v.layer → strip eb2), Ebenen 3–8 off; an old patch without e*-keys loads unchanged
//  2 eight layers on: every strip carries its own sound (one note), each voice on its own strip
//  3 Tonbereich and Anschlags-Bereich gate a layer, the soft edge is a gain of the voice (equal power) and goes into the
//    Humus (amp) – and the Werk-Rahmen renders it there; Mute and Solo (among the layers) play no voice
//  4 voice stealing takes all layers of a note together, never the note being made
//  5 Hexenring: Gespielt taps eb3–eb8 and hears a note played on Ebene 5 alone
//  6 Sporenwerk: an arpeggiated note plays every layer
//  7 the Werk-Rahmen renders a note through its layer's strip (eb6 muted in the patch → silent; amp 0.5 → −6 dB)
//  8 the Klang page's Ebenen rows; the mixer shows Ebenen 3–8 only once used (Pult and Geflecht)
//  9 MIDI: note-off and the sustain pedal end every layer of the note
//   node t-ebenen.js       env: HX_URL (default the slot hx)
const H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await H.open({});
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    const M = window.__M;
    // the RMS of a node's output over ms (an analyser on it, taken away after)
    window.__rmsOf = async (nodes, ms) => {
      const A = M.A, an = nodes.map((n) => { const a = A.ctx.createAnalyser(); a.fftSize = 2048; n.connect(a); return a; }), acc = nodes.map(() => 0), buf = new Float32Array(2048);
      let k = 0; const t0 = performance.now();
      while (performance.now() - t0 < ms) { await window.__sleep(40); an.forEach((a, i) => { a.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; acc[i] += s / buf.length; }); k++; }
      an.forEach((a, i) => { try { nodes[i].disconnect(a); } catch (e) {} });
      return acc.map((s) => +(10 * Math.log10(s / Math.max(1, k) + 1e-20)).toFixed(1));
    };
    window.__pt = (x, y) => ({ x, y, px: x * 800, py: (1 - y) * 400 });
    const Q = M.getQ(); Q.budget = 1e4; M.budgetApply();   // (no stealing but the test's own)
  });

  // ---------- 1 · ids, defaults, old patches ----------
  let r = await ev(() => {
    const M = window.__M, P = M.P;
    M.setParam('v.layer', 'glo'); M.setParam('v.layerInt', 7); M.setParam('v.layerLvl', 0.4);
    const ly = M.layers(), l2 = ly[1];
    const off = M.EB.slice(2).every((e) => P[e.eng] === 'off' && P[e.lvl] === 0.5 && P[e.int] === 0);
    const strips = M.EB_K.every((k) => !!M.MIX.s[k]);
    // an old stored patch (myzel.patch.v1 as written before the Ebenen): no e*-keys
    const old = Object.fromEntries(Object.entries(M.patchValues()).filter(([id]) => !/^e\d\./.test(id)));
    M.EB.slice(2).forEach((e) => { P[e.eng] = 'neb'; });   // (as if a layer had been set) – the old patch takes it back to off
    M.loadValues(old);
    const after = M.EB.slice(2).every((e) => P[e.eng] === 'off') && P['v.layer'] === 'glo' && P['v.layerInt'] === 7;
    return { n: ly.length, eng: l2.eng, ratio: l2.ratio, lvl: l2.lvl, bus: l2.bus === M.stripIn('eb2'), amp: l2.amp, off, strips, after, nEB: M.EB.length };
  });
  ok(r.nEB === 8 && r.n === 2 && r.eng === 'glo' && Math.abs(r.ratio - Math.pow(2, 7 / 12)) < 1e-12 && r.lvl === 0.4 && r.bus && r.amp === 1, `v.layer, v.layerInt, v.layerLvl are Ebene 2 (on strip eb2, ratio ${r.ratio.toFixed(4)}, gain 1); two layers sound, of eight`);
  ok(r.off && r.strips, 'Ebenen 3–8 start off (Pegel 50 %, Intervall 0); every layer has its strip fin, eb2 … eb8');
  ok(r.after, 'an old patch without e*-keys loads unchanged: Ebenen 3–8 off, Ebene 2 as stored');

  // ---------- 2 · eight layers, each on its strip ----------
  const ENG8 = ['neb', 'hau', 'obt', 'stm', 'tie', 'neb', 'hau', 'obt'];
  r = await ev(async (ENG8) => {
    const M = window.__M, A = M.A;
    M.setParam('rev.mix', 0); M.setParam('dly.mix', 0);
    M.setParam('v.eng', ENG8[0]); M.setParam('v.layer', ENG8[1]); M.setParam('v.layerLvl', 0.7);
    M.EB.slice(2).forEach((e, i) => { M.setParam(e.eng, ENG8[i + 2]); M.setParam(e.lvl, 0.7); M.setParam(e.int, [-12, 7, 12, -5, 19, 24][i]); });
    await window.__sleep(300);
    const quiet = await window.__rmsOf(M.EB_K.map((k) => M.MIX.s[k].dry), 300);
    M.onDown({ pointerId: 'eb8', pt: window.__pt(0.45, 0.5) });
    await window.__sleep(500);
    const tt = M.touches.get('eb8'), buses = tt.voices.map(({ v }) => M.EB_K.find((k) => M.stripIn(k) === v.bus));
    const lv = await window.__rmsOf(M.EB_K.map((k) => M.MIX.s[k].dry), 600);
    const load = M.voiceLoad();
    M.onUp({ pointerId: 'eb8' });
    await window.__sleep(200);
    return { quiet, lv, buses: buses.join(' '), n: tt.voices.length, load: +load.toFixed(2), rel: tt.voices.every(({ v }) => v.released || !v.alive) };
  }, ENG8);
  ok(r.n === 8 && r.buses === 'fin eb2 eb3 eb4 eb5 eb6 eb7 eb8', `one note plays eight voices, one per strip: ${r.buses} (voiceLoad ${r.load})`);
  ok(r.lv.every((x) => x > -60) && r.quiet.every((x) => x < -100), `every strip carries its layer: ${r.lv.join(' / ')} dBFS (before the note ${Math.max(...r.quiet)} dBFS)`);
  ok(r.rel, 'the release reaches all eight voices of the note');

  // ---------- 3 · ranges, the soft edge, Mute/Solo ----------
  r = await ev(async () => {
    const M = window.__M, P = M.P, e3 = M.EB[2], out = {};
    // the gain law: inside 1, the edge a quarter sine, beyond 0; equal power where two edges meet
    M.setParam('e3.lo', 60); M.setParam('e3.hi', 72); M.setParam('e3.rand', 6);
    const f = (m) => P['t.a4'] * Math.pow(2, (m - 69) / 12);
    out.law = [M.ebZone(e3, f(66)), M.ebZone(e3, f(72.5)), M.ebZone(e3, f(75.5)), M.ebZone(e3, f(78.5)), M.ebZone(e3, f(80))].map((x) => +x.toFixed(4));
    M.setParam('e4.lo', 0); M.setParam('e4.hi', 72); M.setParam('e4.rand', 0);
    M.setParam('e4.lo', 79); M.setParam('e4.hi', 127); M.setParam('e4.rand', 6);   // (Ebene 4 fades in where Ebene 3 fades out)
    const g3 = M.ebZone(e3, f(75.5)), g4 = M.ebZone(M.EB[3], f(75.5)); out.pow = +(g3 * g3 + g4 * g4).toFixed(4);
    M.setParam('e3.rand', 0); M.setParam('e4.lo', 0); M.setParam('e4.hi', 127); M.setParam('e4.rand', 0);
    // a note outside the range: no voice on eb3; inside: one; on the edge: a gain of its own, in the Humus
    out.lyOut = M.layers(f(80), 0.75).map((l) => l.n).join(','); out.lyIn = M.layers(f(66), 0.75).map((l) => l.n).join(',');
    M.setParam('e3.rand', 6);
    const le = M.layers(f(75.5), 0.75).find((l) => l.n === 3), amp = le ? le.amp : -1; out.amp = +amp.toFixed(4);
    // velocity: Ebene 5 only above 60 %, a soft edge of 20 %
    M.setParam('e5.vlo', 0.6); M.setParam('e5.vrand', 0.2);
    out.vel = [0.3, 0.5, 0.7].map((v) => { const l = M.layers(f(66), v).find((x) => x.n === 5); return l ? +l.amp.toFixed(3) : 0; });
    M.setParam('e5.vlo', 0); M.setParam('e5.vrand', 0);
    // played: the edge's voice through a gain, recorded in the Humus with it
    const t0 = M.A.ctx.currentTime;
    M.onDown({ pointerId: 'edge', note: { f: f(75.5), idx: 0, name: 'x' }, pt: window.__pt(0.5, 0.5), vel: 0.75 });
    await window.__sleep(150);
    const tt = M.touches.get('edge'), v3 = tt.voices.find(({ ly }) => ly.n === 3);
    out.node = v3 ? v3.v.nodes.some((n) => n.gain && Math.abs(n.gain.value - amp) < 1e-6) : false;
    M.onUp({ pointerId: 'edge' });
    const evs = M.hxEvents(t0 - 0.01, t0 + 1, false).filter((e) => e.src === 'eb3');
    out.hum = evs.length ? +evs[0].amp.toFixed(4) : null; out.humL = evs.length ? evs[0].layer : null;
    const evs1 = M.hxEvents(t0 - 0.01, t0 + 1, false).filter((e) => e.src === 'fin');
    out.hum1 = evs1.length ? evs1[0].amp : null;
    M.setParam('e3.lo', 0); M.setParam('e3.hi', 127); M.setParam('e3.rand', 0);
    // Mute (the strip's M) and Solo among the layers
    M.setParam('xeb3.mute', true);
    out.mute = M.layers(f(66), 0.75).map((l) => l.n).join(',');
    out.muteStrip = M.MIX.s.eb3.silent;
    M.setParam('xeb3.mute', false);
    M.setParam('e4.solo', true); M.setParam('e7.solo', true);
    out.solo = M.layers(f(66), 0.75).map((l) => l.n).join(',');
    out.soloStrips = M.EB_K.filter((k) => M.MIX.s[k].silent).join(' ');
    out.rgnOpen = !M.MIX.s.rgn.silent && !M.MIX.s.l0.silent;
    out.inPatch = 'e4.solo' in M.patchValues();
    M.setParam('e4.solo', false); M.setParam('e7.solo', false);
    out.back = M.EB_K.filter((k) => M.MIX.s[k].silent).length;
    return out;
  });
  ok(r.law[0] === 1 && Math.abs(r.law[1] - 1) < 1e-9 && Math.abs(r.law[2] - Math.SQRT1_2) < 1e-3 && r.law[3] < 0.01 + 1e-9 && r.law[4] === 0, `Tonbereich C4–C5 with a soft edge of 6 HT: inside 1, at the key's half step ${r.law[1]}, mid-edge ${r.law[2]} (√½), at the end ${r.law[3]}, beyond ${r.law[4]}`);
  ok(Math.abs(r.pow - 1) < 1e-3, `two layers fading across the same edge keep the power (g₃² + g₄² = ${r.pow})`);
  ok(!/\b3\b/.test(r.lyOut) && /\b3\b/.test(r.lyIn), `a note outside the range plays no voice on Ebene 3 (${r.lyOut}), inside it does (${r.lyIn})`);
  ok(r.vel[0] === 0 && r.vel[1] > 0 && r.vel[1] < 1 && r.vel[2] === 1, `Anschlags-Bereich from 60 % with a soft edge of 20 %: at 30 % ${r.vel[0]}, at 50 % ${r.vel[1]}, at 70 % ${r.vel[2]}`);
  ok(r.node && r.hum === r.amp && r.humL === 3 && r.hum1 === 1, `on the edge the voice gets a gain of its own (${r.amp}), the Humus keeps it (amp ${r.hum}, layer ${r.humL}; Ebene 1 amp ${r.hum1})`);
  ok(r.mute === '1,2,4,5,6,7,8' && r.muteStrip, `Mute (the strip's M): no voice on Ebene 3 (${r.mute}), its strip closed`);
  ok(r.solo === '4,7' && r.soloStrips === 'fin eb2 eb3 eb5 eb6 eb8' && r.rgnOpen && !r.inPatch && r.back === 0, `Solo among the layers: only Ebenen ${r.solo} play, the others' strips close (${r.soloStrips}), Regen and the Puls stay open; never in the patch`);

  // ---------- 4 · stealing by note ----------
  r = await ev(async () => {
    const M = window.__M, A = M.A;
    M.panic(); await window.__sleep(300);
    M.onDown({ pointerId: 's1', pt: window.__pt(0.3, 0.5) }); await window.__sleep(30);
    M.onDown({ pointerId: 's2', pt: window.__pt(0.6, 0.5) }); await window.__sleep(30);
    const t1 = M.touches.get('s1'), t2 = M.touches.get('s2'), n0 = A.voices.size;
    M.steal(false, false);
    const g1 = t1.voices.filter(({ v }) => A.voices.has(v)).length, g2 = t2.voices.filter(({ v }) => A.voices.has(v)).length;
    // the note being made never takes its own layers: steal with keep = its group passes them by
    M.onDown({ pointerId: 's3', pt: window.__pt(0.8, 0.5) }); await window.__sleep(30);
    const t3 = M.touches.get('s3');
    const kept = (() => { const before = t3.voices.filter(({ v }) => A.voices.has(v)).length; M.steal(false, false, false, t3); return t3.voices.filter(({ v }) => A.voices.has(v)).length === before; })();
    const g2b = t2.voices.filter(({ v }) => A.voices.has(v)).length;
    for (const id of ['s1', 's2', 's3']) M.onUp({ pointerId: id });
    return { n0, g1, g2, kept, g2b };
  });
  ok(r.n0 === 16 && r.g1 === 0 && r.g2 === 8, `stealing takes the oldest note with all its eight layers (${r.n0} voices → note 1: ${r.g1} left, note 2: ${r.g2})`);
  ok(r.kept && r.g2b === 0, 'a note being made never steals its own layers (keep): the next note goes instead');
  // (review 30.10.2026) a struck layer is released at its start: stolen as a fading voice (steal(true, …) – Ladung,
  // Sporenregen, vShed), it never takes its sustained sibling, whose finger is still down
  r = await ev(async () => {
    const M = window.__M, A = M.A;
    M.panic(); await window.__sleep(300);
    const was = M.EB.map((e) => M.P[e.eng]);
    M.EB.slice(2).forEach((e) => M.setParam(e.eng, 'off'));
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'glo');
    M.onDown({ pointerId: 'h1', pt: window.__pt(0.4, 0.5) }); await window.__sleep(30);
    const t1 = M.touches.get('h1'), held = t1.voices.map(({ v }) => v), all = [...A.voices];
    const struck = all.filter((v) => v.grp === t1 && v.released).length;
    const took = M.steal(true, true);
    const heldLeft = held.filter((v) => A.voices.has(v)).length, struckLeft = [...A.voices].filter((v) => v.grp === t1 && v.released).length;
    M.onUp({ pointerId: 'h1' });
    M.EB.forEach((e, i) => M.setParam(e.eng, was[i])); M.panic(); await window.__sleep(300);   // (the eight layers again, for what follows)
    return { held: held.length, struck, took, heldLeft, struckLeft };
  });
  ok(r.held === 1 && r.struck === 1 && r.took && r.heldLeft === 1 && r.struckLeft === 0, `a fading struck layer goes alone: the held layer of the same note stays (held ${r.heldLeft}/${r.held}, struck ${r.struckLeft}/${r.struck})`);

  // ---------- 5 · Hexenring: the Gespielt taps ----------
  r = await ev(async () => {
    const M = window.__M, A = M.A;
    M.panic(); await window.__sleep(300);
    const taps = M.MIX.src.filter((s) => s.hxT).map((s) => s.k).join(' '), mask = [...M.HX.mask].join(' ');
    M.setParam('e5.solo', true);
    const quiet = (await window.__rmsOf([A.hxIn0], 300))[0];
    M.onDown({ pointerId: 'hx', pt: window.__pt(0.5, 0.5) }); await window.__sleep(300);
    const tt = M.touches.get('hx'), only = tt.voices.map(({ ly }) => ly.n).join(',');
    const lv = (await window.__rmsOf([A.hxIn0, M.MIX.s.eb5.dry], 500));
    M.onUp({ pointerId: 'hx' }); M.setParam('e5.solo', false);
    return { taps, mask, quiet, lv, only };
  });
  ok(r.taps === 'fin eb2 eb3 eb4 eb5 eb6 eb7 eb8 rgn gsp' && /eb8/.test(r.mask), `„Gespielt“ taps every layer strip: ${r.taps}`);
  ok(r.only === '5' && r.lv[0] > -60 && Math.abs(r.lv[0] - r.lv[1]) < 1.5, `a note on Ebene 5 alone reaches the Gespielt ring: ${r.lv[0]} dBFS (its strip ${r.lv[1]}, before ${r.quiet})`);

  // ---------- 6 · Sporenwerk ----------
  r = await ev(async () => {
    const M = window.__M, A = M.A;
    M.panic(); await window.__sleep(300);
    M.setParam('arp.on', true);
    M.onDown({ pointerId: 'arp1', pt: window.__pt(0.4, 0.5) }); M.onDown({ pointerId: 'arp2', pt: window.__pt(0.55, 0.5) });
    const seen = new Set(), t0 = performance.now();
    while (performance.now() - t0 < 1500) { for (const v of A.voices) { const k = M.EB_K.find((x) => M.stripIn(x) === v.bus); if (k) seen.add(k); } await window.__sleep(20); }
    M.onUp({ pointerId: 'arp1' }); M.onUp({ pointerId: 'arp2' }); M.setParam('arp.on', false);
    return { seen: M.EB_K.filter((k) => seen.has(k)).join(' ') };
  });
  ok(r.seen === 'fin eb2 eb3 eb4 eb5 eb6 eb7 eb8', `the Sporenwerk plays every layer of its notes: ${r.seen}`);

  // ---------- 7 · the Werk-Rahmen renders through the layer's strip ----------
  r = await ev(async () => {
    const M = window.__M, SR = M.A.ctx.sampleRate;
    const job = (src, amp, pp) => M.hxwCall('wuchs', { sr: SR, dur: 1.5, notes: [{ t0: 0.05, t1: 1.0, eng: 'neb', f: 220, y0: 0.5, vel: 0.8, pan: 0, amp, src, burst: false, hold: true, curves: { y: [], f: [] } }], P: Object.assign({}, M.P, pp || {}), q: '3', seed: 3 });
    const pk = (a) => { if (!a || !a.L) return 0; let p = 0; for (let i = 0; i < a.L.length; i++) p = Math.max(p, Math.abs(a.L[i]), Math.abs(a.R[i])); return p; };
    const a = await job('eb6', 1), b = await job('eb6', 1, { 'xeb6.mute': true }), c = await job('eb6', 0.5), d = await job('eb6', 1, { 'xeb6.vol': -12 });
    return { a: pk(a), b: pk(b), c: pk(c), d: pk(d), err: (a && a.err) || null };
  });
  const db = (x) => 20 * Math.log10(x + 1e-20);
  ok(!r.err && r.a > 0.01 && db(r.b) < -100, `the Werk-Rahmen renders a note of Ebene 6 through strip eb6: ${db(r.a).toFixed(1)} dBFS, with eb6 muted ${db(r.b).toFixed(1)} dBFS`);
  ok(Math.abs(db(r.c) - db(r.a) + 6.02) < 0.3 && Math.abs(db(r.d) - db(r.a) + 12) < 0.3, `there the soft edge (amp 0.5) is ${(db(r.c) - db(r.a)).toFixed(2)} dB, the strip's fader −12 dB is ${(db(r.d) - db(r.a)).toFixed(2)} dB`);

  // ---------- 8 · the Klang page and the mixer ----------
  r = await ev(async () => {
    const M = window.__M, P = M.P, out = {};
    M.openPanel('klang'); await window.__sleep(250);
    const rows = () => [...document.querySelectorAll('.eb-row')].filter((x) => !x.hidden).map((x) => x.dataset.eb).join(',');
    out.rows8 = rows();
    M.EB.slice(2).forEach((e) => M.setParam(e.eng, 'off'));
    await window.__sleep(50); out.rows2 = rows();
    out.layerRow = !!document.querySelector('#p-v-layer') && !!document.querySelector('.eb-row[data-eb="2"] #p-v-layer');
    const add = [...document.querySelectorAll('.eb-row ~ .row .btn')].find((b) => /Ebene/.test(b.textContent));
    add.click(); await window.__sleep(50); out.rowsAdd = rows();
    const r3 = document.querySelector('.eb-row[data-eb="3"]'), tog = [...r3.querySelectorAll('.chip')].find((b) => b.textContent === 'Einstellen');
    tog.click(); out.det = !!r3.querySelector('#p-e3-lo') && r3.querySelector('#p-e3-lo').offsetParent !== null;
    M.setParam('e3.eng', 'glo'); M.setParam('e3.lo', 48); M.setParam('e3.hi', 60); await window.__sleep(50);
    out.sum = r3.querySelector('.note').textContent;
    const mb = [...r3.querySelectorAll('.chip')].find((b) => b.textContent === 'M'); mb.click(); out.mute = P['xeb3.mute']; mb.click();
    // the mixer: eb3 stands (it has a sound), eb4–eb8 not – in the Pult and the Geflecht
    M.openPanel('mix'); await window.__sleep(400);
    out.pult = [...document.querySelectorAll('.mx-st')].filter((x) => x.offsetParent !== null && /^eb|fin/.test(x.dataset.k)).map((x) => x.dataset.k).join(' ');
    if (M.mxSetView) { M.mxSetView('geflecht'); await window.__sleep(300); }
    out.gef = M.MXG.vis ? M.MXG.vis.filter((C) => /^eb|fin/.test(C.k)).map((C) => C.k).join(' ') : '(not laid out)';
    out.gefHid = M.MXG.cols.filter((C) => C.hid).map((C) => C.k).join(' ');
    if (M.mxSetView) { M.mxSetView('pult'); await window.__sleep(200); }
    M.setParam('e8.eng', 'neb'); await window.__sleep(100);
    out.pult8 = [...document.querySelectorAll('.mx-st')].filter((x) => x.offsetParent !== null && /^eb/.test(x.dataset.k)).map((x) => x.dataset.k).join(' ');
    M.setParam('e8.eng', 'off'); M.setParam('e3.eng', 'off'); M.setParam('e3.lo', 0); M.setParam('e3.hi', 127);
    M.closePanel(); await window.__sleep(100);
    return out;
  });
  ok(r.rows8 === '1,2,3,4,5,6,7,8' && r.rows2 === '1,2' && r.layerRow, `the Klang page: a row per layer with a sound (${r.rows8}; with two: ${r.rows2}), Ebene 2 keeps #p-v-layer`);
  ok(r.rowsAdd === '1,2,3' && r.det, `„+ Ebene“ opens the next row (${r.rowsAdd}); „Einstellen“ shows its ranges`);
  ok(/−12 HT/.test(r.sum) && /C3–C4/.test(r.sum) && r.mute === true, `the row says what it plays (its sound in its row): „${r.sum}“; its M is the strip's mute`);
  ok(r.pult === 'fin eb2 eb3' && r.pult8 === 'eb2 eb3 eb8' && r.gef === 'fin eb2 eb3' && r.gefHid === 'eb4 eb5 eb6 eb7 eb8', `the mixer shows Ebenen 3–8 once used: Pult ${r.pult} → ${r.pult8}; Geflecht ${r.gef} (hidden ${r.gefHid})`);

  // ---------- 9 · MIDI note-off and the pedal end every layer ----------
  r = await ev(async () => {
    const M = window.__M, A = M.A;
    M.panic(); await window.__sleep(200);
    M.EB.slice(2, 5).forEach((e) => M.setParam(e.eng, 'neb'));
    const src = M.midiSource('t-eb', 'Test', 'webmidi');
    const send = (d) => M.midiIn(src, new Uint8Array(d), performance.now());
    send([0x90, 60, 100]); await window.__sleep(150);
    const tt = [...M.touches.values()][0], n = tt ? tt.voices.length : 0;
    send([0x80, 60, 0]); await window.__sleep(100);
    const offAll = tt ? tt.voices.every(({ v }) => v.released || !v.alive) : false;
    send([0xB0, 64, 127]); send([0x90, 62, 100]); await window.__sleep(100); send([0x80, 62, 0]); await window.__sleep(100);
    const t2 = [...M.touches.values()][0], held = t2 ? t2.voices.filter(({ v }) => !v.released).length : 0;
    send([0xB0, 64, 0]); await window.__sleep(150);
    const relAll = t2 ? t2.voices.every(({ v }) => v.released || !v.alive) : false;
    M.EB.slice(2, 5).forEach((e) => M.setParam(e.eng, 'off'));
    return { n, offAll, held, relAll };
  });
  ok(r.n === 5 && r.offAll, `a MIDI note plays its five layers (${r.n}); its note-off releases all of them`);
  ok(r.held === 5 && r.relAll, `the sustain pedal holds all ${r.held} layers of a released note and lets them go together`);

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const f = H.summary(); await H.close(); process.exit(f ? 1 : 0);
})();
