// The mod layer's targets: each one moves the audio param (or the per-note / per-grain / per-hit value) it names, the
// sources sum and clamp, and when every source is back at rest the sound is exactly the patch's again – measured on
// the running graph with test tones and analysers (filter, phaser, ring, panorama, Leiern, echo/hall/chorus shares,
// Bordun, Ausdruck, A/B-Morph), on held notes (Höhe via setY, Tonhöhe pro Finger via the finger bus, pitch measured),
// on grains (Dichte, Streuung), on drops (Tropfen-Regen) and on the Puls (Dichte, Helligkeit). The patch never changes.
//   node t-gm-targets.js
const { open, ok, close, probes } = require('./gm-h');
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-9);
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } });
  await probes(page);
  await page.evaluate(() => { window.__g.quiet(); });
  await page.waitForTimeout(400);
  const P0 = await page.evaluate(() => window.__g.patch());

  // ---- insert chain: filter, phaser, ring, panorama ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, o = {};
      M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 800);
      const P1 = G.patch();
      G.tone(2000, A.voiceBus);
      await window.__sleep(400);
      const base = await G.rms(A.insertOut);
      M.modSet('a', 'flt', 0.5); M.modSet('b', 'flt', 0.5); await G.flush(200);   // two sources: +1 → ×4
      o.up = (await G.rms(A.insertOut)) / base;
      o.offUp = M.MOD.t.flt.cs.offset.value;
      M.modSet('a', 'flt', -1); M.modSet('b', 'flt', -1); await G.flush(200);     // −2 clamps to −1 → ÷4
      o.dn = (await G.rms(A.insertOut)) / base; o.offDn = M.MOD.t.flt.cs.offset.value;
      M.modClear('a'); M.modSet('b', 'flt', 0); await G.flush(200);
      o.back = (await G.rms(A.insertOut)) / base; o.off0 = M.MOD.t.flt.cs.offset.value;
      o.same = G.patch() === P1; o.freq = M.P['flt.freq'];
      // a copy of the chain (one channel sends less to the echo) follows too
      M.setParam('xfin.dly', 0.5); await window.__sleep(150);
      o.chains = A.chains.length;
      M.modSet('a', 'flt', 1); await G.flush(200);
      const an = A.chains[A.chains.length - 1];
      const g2 = A.ctx.createGain(); g2.gain.value = 1; G.tone(2000, an.in);
      o.copy = (await G.rms(an.out)) ;
      M.modSet('a', 'flt', 0); await G.flush(200);
      o.copy0 = await G.rms(an.out);
      M.setParam('xfin.dly', 1);
      G.untone();
      return o;
    });
    ok(r.up > 3 && near(r.offUp, 2400, 1e-6), 'Filter: two sources +0.5 each lift the cutoff two octaves (level ×' + r.up.toFixed(2) + ', +' + r.offUp + ' cents)');
    ok(r.dn < 0.3 && near(r.offDn, -2400, 1e-6), 'Filter: the sum clamps at −1 (−2400 cents, level ×' + r.dn.toFixed(3) + ')');
    ok(r.off0 === 0 && near(r.back, 1, 0.002), 'Filter: back at rest – offset exactly 0, the level exactly as before (×' + r.back.toFixed(5) + ')');
    ok(r.same && r.freq === 800, 'Filter: the patch stays as it was (flt.freq ' + r.freq + ')');
    ok(r.chains >= 2 && r.copy > r.copy0 * 3, 'Filter: the chain copy made for the sends follows (' + r.chains + ' chains, ' + r.copy.toFixed(3) + ' vs ' + r.copy0.toFixed(3) + ')');
  }
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, o = {};
      M.setParam('flt.freq', 18000); M.setParam('pha.mix', 1); M.setParam('pha.fb', 0.4);
      // the comb of dry + allpass chain at three tones: some move a lot, some little – the largest change counts
      o.mv = 1; o.back = 1;
      for (const hz of [400, 1000, 2500]) {
        G.tone(hz, A.voiceBus);
        await window.__sleep(300);
        const base = await G.rms(A.insertOut);
        M.modSet('a', 'pha', 1); await G.flush(200); const mv = (await G.rms(A.insertOut)) / base; o.off = M.MOD.t.pha.cs.offset.value;
        M.modSet('a', 'pha', 0); await G.flush(200); const back = (await G.rms(A.insertOut)) / base; o.off0 = M.MOD.t.pha.cs.offset.value;
        if (Math.abs(mv - 1) > Math.abs(o.mv - 1)) o.mv = mv;
        if (Math.abs(back - 1) > Math.abs(o.back - 1)) o.back = back;
        G.untone();
      }
      M.setParam('pha.mix', 0);
      // ring: 1000 Hz × 220 Hz → 780/1220; detuned two octaves up (880 Hz) → 120/1880
      M.setParam('rng.mix', 1); M.setParam('rng.freq', 220);
      G.tone(1000, A.voiceBus);
      await window.__sleep(400);
      const [b1880, b1220] = await G.spec(A.insertOut, [1880, 1220]);
      M.modSet('a', 'rng', 1); await G.flush(250);
      const [u1880, u1220] = await G.spec(A.insertOut, [1880, 1220]);
      o.rngOff = M.MOD.t.rng.cs.offset.value;
      M.modSet('a', 'rng', 0); await G.flush(250);
      const [z1880, z1220] = await G.spec(A.insertOut, [1880, 1220]);
      o.rng = { b1880, b1220, u1880, u1220, z1880, z1220 }; o.rng0 = M.MOD.t.rng.cs.offset.value;
      G.untone(); M.setParam('rng.mix', 0);
      // panorama: a centred tone, left and right
      const sp = A.ctx.createChannelSplitter(2); A.insertOut.connect(sp);
      const L = A.ctx.createGain(), R = A.ctx.createGain(); sp.connect(L, 0); sp.connect(R, 1);
      G.tone(500, A.voiceBus);
      await window.__sleep(300);
      const l0 = await G.rms(L), r0 = await G.rms(R);
      M.modSet('a', 'pan', 1); await G.flush(200);
      const l1 = await G.rms(L), r1 = await G.rms(R);
      M.modSet('a', 'pan', 0); await G.flush(200);
      const l2 = await G.rms(L), r2 = await G.rms(R);
      o.pan = { l0, r0, l1, r1, l2, r2, off: M.MOD.t.pan.cs.offset.value };
      G.untone(); A.insertOut.disconnect(sp);
      return o;
    });
    ok(Math.abs(r.mv - 1) > 0.05 && near(r.off, 2400, 1e-6), 'Phaser: the sweep moves (level up to ×' + r.mv.toFixed(3) + ' at 0.4/1/2.5 kHz, +' + r.off + ' cents on every allpass)');
    ok(r.off0 === 0 && near(r.back, 1, 0.002), 'Phaser: back exactly (×' + r.back.toFixed(5) + ')');
    const g = r.rng;
    ok(g.u1880 - g.b1880 > 25 && g.b1220 - g.u1220 > 25, 'Ring: two octaves up – the sidebands move from 780/1220 to 120/1880 Hz (1880: ' + g.b1880.toFixed(0) + ' → ' + g.u1880.toFixed(0) + ' dB)');
    ok(r.rng0 === 0 && g.z1880 < g.z1220 - 60 && Math.abs(g.z1220 - g.b1220) < 0.5, 'Ring: back where it was (' + g.z1220.toFixed(1) + ' / ' + g.b1220.toFixed(1) + ' dB at 1220 Hz, nothing at 1880 Hz)');
    const p = r.pan;
    ok(near(p.l0, p.r0, 0.01) && p.r1 > p.l1 * 4, 'Panorama: centred, then to the right (L ' + p.l1.toFixed(3) + ', R ' + p.r1.toFixed(3) + ')');
    ok(p.off === 0 && near(p.l2, p.l0, 0.002) && near(p.r2, p.r0, 0.002), 'Panorama: back in the middle exactly');
  }

  // ---- echo and hall: Leiern, Echo-Anteil, Hall-Anteil; Schweben-Anteil ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, o = {};
      M.setParam('dly.mix', 0.5); M.setParam('rev.mix', 0.5); M.setParam('dly.fb', 0); M.setParam('dly.sync', false); M.setParam('dly.ms', 200);
      G.tone(1000, A.voiceBus);
      await window.__sleep(500);
      const d0 = await G.rms(A.dlySend), h0 = await G.rms(A.revSend);
      M.modSet('a', 'dly', 0.5); M.modSet('a', 'rev', -1); await G.flush(200);
      o.d1 = (await G.rms(A.dlySend)) / d0; o.h1 = (await G.rms(A.revSend)) / h0;
      M.modSet('a', 'dly', 0.9); await G.flush(200);   // 0.5 + 0.9 stays at 100 %
      o.d2 = (await G.rms(A.dlySend)) / d0;
      M.modClear('a'); await G.flush(200);
      o.d3 = (await G.rms(A.dlySend)) / d0; o.h3 = (await G.rms(A.revSend)) / h0;
      o.offs = [M.MOD.t.dly.cs.offset.value, M.MOD.t.rev.cs.offset.value];
      // Leiern: the wow LFO made fast for the test, so the frequency modulation shows as a weaker carrier
      const wf = A.wowLfo.frequency.value; A.wowLfo.frequency.value = 40;
      await window.__sleep(300);
      const [c0] = await G.spec(A.dlyRet, [1000]);
      M.modSet('a', 'wow', 0.1); await G.flush(400);
      const [c1] = await G.spec(A.dlyRet, [1000]);
      o.wowOff = M.MOD.t.wow.cs.offset.value;
      M.modSet('a', 'wow', -1); await G.flush(400);   // Leiern only goes up: below rest is rest
      o.wowNeg = M.MOD.t.wow.cs.offset.value;
      const [c2] = await G.spec(A.dlyRet, [1000]);
      A.wowLfo.frequency.value = wf;
      o.wow = { c0, c1, c2 };
      M.modClear('a'); await G.flush(150);
      G.untone();
      // Schweben-Anteil: the chorus's wet and dry gains of the chain
      M.setParam('cho.mix', 0.3);
      const c = A.chains[0];
      G.tone(700, A.voiceBus);
      await window.__sleep(400);
      const w0 = await G.rms(c.choWet), y0 = await G.rms(c.choDry);
      M.modSet('a', 'cho', 0.5); await G.flush(200);
      o.cw = (await G.rms(c.choWet)) / w0; o.cd = (await G.rms(c.choDry)) / y0;
      M.modSet('a', 'cho', 0); await G.flush(200);
      o.cw0 = (await G.rms(c.choWet)) / w0; o.cd0 = (await G.rms(c.choDry)) / y0; o.choOff = M.MOD.t.cho.cs.offset.value;
      G.untone(); M.setParam('cho.mix', 0);
      return o;
    });
    ok(near(r.d1, 2, 0.03) && r.h1 < 0.01, 'Echo-Anteil +0.5 doubles the echo send (×' + r.d1.toFixed(3) + '), Hall-Anteil −1 closes the hall send (×' + r.h1.toFixed(4) + ')');
    ok(near(r.d2, 2, 0.03), 'Echo-Anteil stays within 100 % of the send (×' + r.d2.toFixed(3) + ')');
    // (exactly: the sources' offsets are 0 again; the level through the wobbling delay is only a rough check – under load
    // the analyser's short windows read a few % apart)
    ok(near(r.d3, 1, 0.03) && near(r.h3, 1, 0.03) && r.offs[0] === 0 && r.offs[1] === 0, 'Echo and hall shares back exactly (offsets ' + r.offs.join(', ') + '; ×' + r.d3.toFixed(5) + ', ×' + r.h3.toFixed(5) + ')');
    ok(r.wow.c0 - r.wow.c1 > 6 && near(r.wowOff, 0.0004, 1e-6), 'Leiern: the echo wobbles (carrier ' + r.wow.c0.toFixed(1) + ' → ' + r.wow.c1.toFixed(1) + ' dB)');
    ok(r.wowNeg === 0 && Math.abs(r.wow.c2 - r.wow.c0) < 0.5, 'Leiern below rest is rest (offset ' + r.wowNeg + ', carrier ' + r.wow.c2.toFixed(1) + ' dB)');
    ok(near(r.cw, 0.8 / 0.3, 0.01) && near(r.cd, 0.68 / 0.88, 0.01), 'Schweben-Anteil 30 → 80 %: wet ×' + r.cw.toFixed(3) + ', dry ×' + r.cd.toFixed(3) + ' (as the knob would)');
    ok(near(r.cw0, 1, 0.002) && near(r.cd0, 1, 0.002) && r.choOff === 0, 'Schweben-Anteil back exactly');
  }

  // ---- Bordun öffnen ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g;
      M.setParam('bor.cut', 300); M.setParam('bor.on', true);
      await window.__sleep(600);
      // the drone's detuned oscillators beat: three readings, averaged
      const hf = async () => { let x = 0; for (let k = 0; k < 3; k++) x += (await G.band(A.bor.filt, 900, 3000)) - (await G.band(A.bor.filt, 60, 250)); return x / 3; };
      const h0 = await hf();
      M.modSet('a', 'bor', 1); await G.flush(400);
      const h1 = await hf();
      M.modSet('a', 'bor', 0); await G.flush(400);
      const h2 = await hf();
      const off = M.MOD.t.bor.cs.offset.value;
      // a new drone takes the deflection too
      M.modSet('a', 'bor', 1); await G.flush(200);
      M.setParam('bor.on', false); await window.__sleep(100); M.setParam('bor.on', true); await window.__sleep(500);
      const h3 = await hf();
      M.modSet('a', 'bor', 0); await G.flush(300);
      M.setParam('bor.on', false);
      return { h0, h1, h2, h3, off };
    });
    ok(r.h1 - r.h0 > 10 && Math.abs(r.h2 - r.h0) < 4 && r.off === 0, 'Bordun öffnen: the drone\'s filter opens (0.9–3 kHz against 60–250 Hz: ' + r.h0.toFixed(1) + ' → ' + r.h1.toFixed(1) + ' → ' + r.h2.toFixed(1) + ' dB)');
    ok(r.h3 - r.h0 > 10, 'Bordun öffnen: a drone started while deflected opens too (' + r.h3.toFixed(1) + ' dB)');
  }

  // ---- Ausdruck and the A/B-Morph: the strip gains ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, st = M.MIX.s.fin, o = {};
      G.tone(600, st.in, 0.1);
      await window.__sleep(300);
      const e0 = await G.rms(st.in);
      M.modSet('a', 'expr', -0.5); await G.flush(150); o.e1 = (await G.rms(st.in)) / e0;
      M.modSet('a', 'expr', 1); await G.flush(150); o.e2 = (await G.rms(st.in)) / e0;
      M.exprSet(0.25, null); await window.__sleep(150); o.e3 = (await G.rms(st.in)) / e0;   // the pedal and Ausdruck multiply
      M.exprSet(1, null); M.modSet('a', 'expr', 0); await G.flush(200); o.e4 = (await G.rms(st.in)) / e0; o.eg = M.MOD.eg;
      // the morph: scene B has Klang at −12 dB and panned; the patch keeps 0 dB
      const cur = {}; for (const id of M.mxSnapIds()) cur[id] = M.P[id];
      M.MX.snap.a = Object.assign({}, cur); M.MX.snap.b = Object.assign({}, cur, { 'xfin.vol': -12, 'xeb2.mute': true });
      const before = G.patch(), snapB = JSON.stringify(M.MX.snap.b);
      M.modSet('a', 'morph', 1); await G.flush(200); o.m1 = (await G.rms(st.in)) / e0;
      o.mute = M.MIX.s.eb2.dry.gain.value;
      M.modSet('a', 'morph', 0.5); await window.__sleep(60); await G.flush(200); o.m2 = (await G.rms(st.in)) / e0;
      M.modSet('a', 'morph', -1); await window.__sleep(60); await G.flush(200); o.m3 = (await G.rms(st.in)) / e0;   // toward A (= the patch)
      M.modSet('a', 'morph', 0); await G.flush(250); o.m4 = (await G.rms(st.in)) / e0;
      o.mute0 = M.MIX.s.eb2.dry.gain.value;
      o.same = G.patch() === before && JSON.stringify(M.MX.snap.b) === snapB && M.P['xfin.vol'] === 0;
      o.mx = M.MOD.mx;
      G.untone();
      return o;
    });
    ok(near(r.e1, 0.25, 0.01) && near(r.e2, 1.41, 0.01), 'Ausdruck: −0.5 → ×' + r.e1.toFixed(3) + ' (a quarter), +1 → ×' + r.e2.toFixed(3) + ' (+3 dB)');
    ok(near(r.e3, 0.25 * 1.41, 0.01), 'Ausdruck multiplies with the expression pedal (×' + r.e3.toFixed(3) + ')');
    ok(near(r.e4, 1, 0.002) && r.eg === 1, 'Ausdruck back exactly (×' + r.e4.toFixed(5) + ')');
    ok(near(r.m1, Math.pow(10, -12 / 20), 0.01) && r.mute < 0.01, 'A/B-Morph +1: Klang at −12 dB as in scene B (×' + r.m1.toFixed(3) + '), Ebene 2 muted as in B');
    ok(near(r.m2, Math.pow(10, -6 / 20), 0.01), 'A/B-Morph +0.5: half way on the fader\'s own scale (×' + r.m2.toFixed(3) + ')');
    ok(near(r.m3, 1, 0.002), 'A/B-Morph −1: toward scene A, which is the patch here (×' + r.m3.toFixed(4) + ')');
    ok(near(r.m4, 1, 0.002) && r.mute0 > 0.99 && r.mx === 0, 'A/B-Morph back at rest exactly (×' + r.m4.toFixed(5) + ')');
    ok(r.same, 'A/B-Morph never wrote the patch nor the scenes');
  }

  // ---- held notes: Höhe (setY), struck notes at the strike, Tonhöhe pro Finger ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, o = {};
      M.setParam('v.eng', 'kor');
      await window.__sleep(200);
      M.onDown({ pointerId: 7, pt: { x: 0.3, y: 0.4, px: 100, py: 300 } });
      const tt = M.touches.get(7), v = tt.voices[0].v;
      M.modSet('a', 'hoehe', 0.5); M.modSet('b', 'hoehe', 0.1); await G.flush(50);
      o.y1 = [tt.y, tt.my, v.kor.y];
      M.modSet('b', 'hoehe', 0.9); await G.flush(50);   // 1.4 clamps at +1 → +0.5 of the field
      o.y2 = [tt.my, v.kor.y];
      M.modClear('a'); M.modClear('b'); await G.flush(50);
      o.y3 = [tt.y, tt.my, v.kor.y];
      M.onUp({ pointerId: 7 });
      // a struck sound takes the height at its strike
      M.setParam('v.eng', 'glo');
      const st = M.ENGINES.glo.start, ys = [];
      M.ENGINES.glo.start = function (vv, t, f, y, ...rest) { ys.push(y); return st.call(this, vv, t, f, y, ...rest); };
      M.onDown({ pointerId: 8, pt: { x: 0.5, y: 0.3, px: 200, py: 300 } }); M.onUp({ pointerId: 8 });
      M.modSet('a', 'hoehe', -0.4); await G.flush(20);
      M.onDown({ pointerId: 8, pt: { x: 0.5, y: 0.3, px: 200, py: 300 } }); M.onUp({ pointerId: 8 });
      M.modSet('a', 'hoehe', 0); await G.flush(20);
      M.onDown({ pointerId: 8, pt: { x: 0.5, y: 0.3, px: 200, py: 300 } }); M.onUp({ pointerId: 8 });
      M.ENGINES.glo.start = st;
      o.ys = ys;
      return o;
    });
    ok(r.y1[0] === 0.4 && near(r.y1[1], 0.4 + 0.3, 1e-9) && r.y1[2] === r.y1[1], 'Höhe: two sources add to the finger\'s own height (0.4 + (0.5 + 0.1) × 0.5 = ' + r.y1[1] + '), Körner scrub there');
    ok(near(r.y2[0], 0.9, 1e-9), 'Höhe: the sum clamps at +1 (half the field: ' + r.y2[0] + ')');
    ok(r.y3[0] === 0.4 && r.y3[1] === 0.4 && r.y3[2] === 0.4, 'Höhe: back exactly to the finger\'s height (' + r.y3.join(', ') + ')');
    ok(r.ys.length === 3 && r.ys[0] === 0.3 && near(r.ys[1], 0.1, 1e-9) && r.ys[2] === 0.3, 'Höhe on a struck sound: at the strike (' + r.ys.map((x) => x.toFixed(3)).join(', ') + ')');
  }
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g, o = {};
      M.setParam('v.eng', 'obt'); M.setParam('v.glide', 0);
      await window.__sleep(150);
      M.onDown({ pointerId: 9, pt: { x: 0.45, y: 0.2, px: 150, py: 400 } });
      const tt = M.touches.get(9);
      await window.__sleep(700);
      const F = tt.f, pk = () => G.peak(A.insertOut, F * 0.97, F * 1.09);
      const f0 = await pk();
      M.modSet('a', 'bend', 0.5); await G.flush(150);   // the newest note: +100 cents
      const fb = tt.fb;
      o.fb = !!fb && fb.own === 100 && fb.cents === 100 && tt.voices.every((x) => x.v.bend === fb);
      const f1 = await pk();
      // a second note is the newest now: the first one rests (older notes: share 0)
      M.onDown({ pointerId: 10, pt: { x: 0.8, y: 0.2, px: 300, py: 400 } });
      await G.flush(100);
      o.two = [tt.fb.own, M.touches.get(10).fb && M.touches.get(10).fb.own];
      M.onUp({ pointerId: 10 });
      await G.flush(100);
      o.one = tt.fb.own;
      M.modSet('a', 'bend', 0); await G.flush(150);
      o.zero = tt.fb.own;
      const f2 = await pk();
      // a finger gliding while bent: the bend stays (it is not a frequency the finger sets)
      M.modSet('a', 'bend', -0.5); await G.flush(100);
      M.moveTouch(tt, { x: 0.6, y: 0.25, px: 200, py: 380 });
      await G.flush(60);
      o.glide = tt.fb.own;
      // per(): a source may give each note its own cents (the scale step); older: a share for the others
      M.onDown({ pointerId: 11, pt: { x: 0.1, y: 0.2, px: 40, py: 400 } });
      M.modSet('a', 'bend', 0.5, { per: (t, v, nw) => (nw ? 300 * v : 0), older: 0 });
      M.modSet('b', 'bend', 0.5, { older: 0.5 });
      await G.flush(80);
      o.per = [M.touches.get(11).fb.own, tt.fb.own];
      M.modClear('a'); M.modClear('b'); await G.flush(80);
      o.per0 = [M.touches.get(11).fb.own, tt.fb.own];
      M.releaseAllTouches ? M.releaseAllTouches() : null;
      for (const id of [9, 11]) M.onUp({ pointerId: id });
      return Object.assign(o, { f0, f1, f2 });
    });
    ok(r.fb, 'Tonhöhe: the bent note got a finger bus of its own (+100 cents, every held voice on it)');
    ok(near(r.f1 / r.f0, Math.pow(2, 100 / 1200), 0.002), 'Tonhöhe: the pitch rises a semitone (' + r.f0.toFixed(1) + ' → ' + r.f1.toFixed(1) + ' Hz)');
    ok(r.two[0] === 0 && r.two[1] === 100 && r.one === 100, 'Tonhöhe: only the newest note bends; when it ends, the remaining one is the newest again (' + JSON.stringify(r.two) + ', ' + r.one + ')');
    ok(r.zero === 0 && near(r.f2, r.f0, 0.0005), 'Tonhöhe: back exactly (' + r.f2.toFixed(2) + ' Hz)');
    ok(r.glide === -100, 'Tonhöhe: a gliding finger keeps its bend (' + r.glide + ' cents)');
    ok(r.per[0] === 150 + 100 && r.per[1] === 50, 'Tonhöhe: per-note cents and the older notes\' share sum (' + JSON.stringify(r.per) + ')');
    ok(r.per0[0] === 0 && r.per0[1] === 0, 'Tonhöhe: all back at 0');
  }
  // a keyboard note: its channel's wheel and its own bend add up
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, G = window.__g;
      M.setParam('v.eng', 'neb');
      window.__send([0xe0, 0x00, 0x60]);   // wheel up: (0x60 << 7) → +0.5 of the range
      window.__send([0x90, 60, 100]);
      await window.__sleep(30);
      const tt = [...M.touches.values()].find((t) => String(t.id).startsWith('midi-'));
      M.modSet('a', 'bend', 0.25); await G.flush(60);
      const fb = tt.fb, out = { own: fb.own, cents: fb.cents, chan: tt.bend.cents, from: fb.from === tt.bend.node };
      window.__send([0x80, 60, 0]); window.__send([0xe0, 0x00, 0x40]);
      M.modClear('a'); await G.flush(60);
      return out;
    });
    ok(r.from && r.own === 50 && near(r.cents, r.chan + 50, 1e-9) && r.chan > 0, 'Tonhöhe on a keyboard note: fed by its channel\'s bend bus, cents add (' + r.chan + ' + ' + r.own + ' = ' + r.cents + ')');
  }

  // ---- grains: Dichte, Streuung ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g;
      M.setParam('v.eng', 'kor'); M.setParam('kor.dens', 20); M.setParam('kor.scat', 0.2);
      M.preloadTextures();
      for (let i = 0; i < 200 && !Object.keys(A.tex).length; i++) await window.__sleep(20);
      const starts = [], orig = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (when, off, ...r) { if (this.buffer && this.buffer.duration > 0.5) starts.push(off || 0); return orig.call(this, when, off, ...r); };
      M.onDown({ pointerId: 12, pt: { x: 0.5, y: 0.5, px: 200, py: 300 } });
      const win = async () => { starts.length = 0; await window.__sleep(1500); const n = starts.length, m = starts.reduce((a, b) => a + b, 0) / Math.max(1, n); return { n, sd: Math.sqrt(starts.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, n)) }; };
      await window.__sleep(300);
      const a = await win();
      M.modSet('a', 'korD', 1); M.modSet('a', 'korS', 1);
      const b = await win();
      M.modClear('a');
      const c = await win();
      M.onUp({ pointerId: 12 });
      AudioBufferSourceNode.prototype.start = orig;
      return { a, b, c };
    });
    ok(r.b.n > r.a.n * 2, 'Körner-Dichte +1: about ×2.8 the grains (' + r.a.n + ' → ' + r.b.n + ' in 1.5 s)');
    ok(r.b.sd > r.a.sd * 1.8, 'Körner-Streuung +1: the grains spread wider in the material (sd ' + r.a.sd.toFixed(3) + ' → ' + r.b.sd.toFixed(3) + ' s)');
    ok(Math.abs(r.c.n - r.a.n) <= Math.max(4, r.a.n * 0.15) && r.c.sd < r.a.sd * 1.4, 'Körner back at the patch\'s density and spread (' + r.c.n + ' grains, sd ' + r.c.sd.toFixed(3) + ')');
  }

  // ---- Tropfen-Regen ----
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, G = window.__g;
      M.setParam('trp.rain', 0.35);
      let n = 0;
      const orig = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...a) { n++; return orig.apply(this, a); };
      const drops = async () => { n = 0; for (let i = 0; i < 30; i++) M.hit('trp', A.ctx.currentTime + 0.05, 440, 0.5, 0.8); return n / 30; };
      const a = await drops();
      M.modSet('a', 'trp', 1);
      const b = await drops();
      M.modSet('a', 'trp', -1);
      const c = await drops();
      M.modClear('a');
      const d = await drops();
      OscillatorNode.prototype.start = orig;
      M.panic();
      return { a, b, c, d };
    });
    ok(r.b > r.a * 1.8 && r.c < r.a, 'Tropfen-Regen: more droplets per drop above rest, fewer below (' + r.a.toFixed(1) + ' → ' + r.b.toFixed(1) + ' / ' + r.c.toFixed(1) + ' oscillators per hit)');
    ok(Math.abs(r.d - r.a) < r.a * 0.25, 'Tropfen-Regen back (' + r.d.toFixed(1) + ')');
  }

  // ---- the Puls: Dichte, Helligkeit (read at each scheduled hit) ----
  // chance 100 %: at rest exactly the pattern's steps sound, so ghost hits and lost steps show by step number
  {
    const r = await page.evaluate(async () => {
      const M = window.__M, G = window.__g;
      for (const [k, v] of [['l0.on', true], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['l0.eng', 'glo'], ['l0.steps', 8], ['l0.puls', 3], ['l0.rot', 0], ['l0.prob', 1], ['l0.bright', 0.3], ['l0.div', '0.25'], ['seq.bpm', 140], ['seq.swing', 0]]) M.setParam(k, v);
      const st = M.ENGINES.glo.start, hs = [];
      M.ENGINES.glo.start = function (vv, t, f, y, ...rest) { hs.push([((Math.round(M.beatAt(t) / 0.25) % 8) + 8) % 8, +y.toFixed(4)]); return st.call(this, vv, t, f, y, ...rest); };
      const run = async (ms = 2400) => { hs.length = 0; await window.__sleep(ms); return { n: hs.length, steps: [...new Set(hs.map((h) => h[0]))].sort(), y: [...new Set(hs.map((h) => h[1]))] }; };
      M.seqStart();
      await window.__sleep(400);
      const a = await run();
      M.modSet('a', 'pulsD', -1);
      const b = await run();
      M.modSet('a', 'pulsD', -0.5);
      const h = await run(7200);   // (long enough that chance cannot make half look like more)
      M.modSet('a', 'pulsD', 1); M.modSet('a', 'pulsH', 0.5);
      const c = await run(3600);
      M.modClear('a');
      await window.__sleep(400);
      const d = await run();
      M.seqStop();
      M.ENGINES.glo.start = st;
      return { a, b, c, d, h };
    });
    const pat = r.a.steps, inPat = (x) => x.steps.every((s) => pat.includes(s));
    ok(pat.length === 3 && r.a.y.join() === '0.3', 'Puls at rest: the pattern\'s 3 steps, all at the lane\'s brightness (steps ' + pat.join() + ')');
    ok(r.b.n === 0, 'Puls-Dichte −1: the lane falls silent (' + r.a.n + ' → ' + r.b.n + ' hits)');
    ok(r.h.n > 0 && r.h.n < r.a.n * 3 * 0.75 && inPat(r.h), 'Puls-Dichte −0.5: about half the pattern\'s hits (' + r.h.n + ' in 7.2 s against ' + r.a.n + ' in 2.4 s)');
    ok(r.c.steps.length > 3 && pat.every((s) => r.c.steps.includes(s)), 'Puls-Dichte +1: every step of the pattern and ghost hits between (steps ' + r.c.steps.join() + ')');
    ok(r.c.y.includes(0.55) && r.c.y.every((y) => y === 0.55), 'Puls-Helligkeit +0.5: the hits are struck brighter (' + r.a.y.join() + ' → ' + r.c.y.join() + ')');
    ok(inPat(r.d) && r.d.y.join() === '0.3' && Math.abs(r.d.n - r.a.n) <= 1, 'Puls back at the patch\'s pattern and brightness (' + r.d.n + ' hits on steps ' + r.d.steps.join() + ')');
  }

  // ---- nothing was written ----
  {
    const r = await page.evaluate((P0) => {
      const M = window.__M;
      return { n: M.MOD.n, srcs: Object.values(M.MOD.t).reduce((a, T) => a + T.s.size, 0) };
    }, P0);
    ok(r.n === 0 && r.srcs === 0, 'every source gone: the layer is empty');
  }
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
