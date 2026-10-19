// Fix phase (gx), live in the app (slot gx: sh ../v2/mk.sh /home/user/4claude/myzel gx):   node t-gx-live.js
// lying on the back with the phone overhead (no veil while held, a finger wakes it and plays), the veil over a phone
// lying still on its face, the sign from deviceorientation stored per device, the dragged lean that stays for
// Sporenregen, the mixer's "Regen" strip only while it can rain, the bass guard's nodes made once, a Schleife of
// Bewegung's Gestik lanes resting while Gestik is off, ↶ for a deleted one and for a user preset's Gestik settings, a knob
// winning learn over a swaying phone, the sustain pedal, "Taste" without a pad, chords from a keyboard, the rest
// detent of Tonhöhe, Fingerhalt, Ladung in a sound without grains, Schlafen's tail and the long sleep, the ring
// of a Schleife of Bewegung (once the Fährte's tag), a recording that ends while only the rain plays.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/gx-inst/index.html';
const H = require('./gk-h');
const L = require('./gk-lib');
const { ok, gestikOn } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOB = { width: 390, height: 844, touch: true, mobile: true, dsf: 2 };
const play = (page, tr) => page.evaluate((l) => window.__dmPlay(l), tr.map((s) => ({ t: s.t, g: s.g, a: s.a, r: s.r })));
const HAND = { noise: { g: 0.05, r: 1.5 } }, TABLE = { noise: { g: 0.02, r: 0.1 } };
async function finger(page, xr = 0.5, yr = 0.6) {
  const cdp = await page.context().newCDPSession(page);
  const box = await page.evaluate(([xr, yr]) => { const r = document.querySelector('#stage').getBoundingClientRect(); return { x: r.x + r.width * xr, y: r.y + r.height * yr }; }, [xr, yr]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y, id: 1 }] });
  await sleep(120);
  const n = await page.evaluate(() => window.__M.touches.size);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(80);
  return n;
}
const st = (page) => page.evaluate(() => { const M = window.__M, sh = document.querySelector('.gk-shade'); return { w: M.GK.ev.wenden, slp: M.SLP.on, veil: !!(sh && !sh.hidden), sign: M.GK.R && M.GK.R.st.sign, signK: M.GK.R && M.GK.R.st.signK, mode: M.GK.mode }; });

(async () => {
  // ---- 1. lying down with the phone overhead; face down on the table ----
  {
    const { page, errors } = await H.open({ vp: MOB, cfg: { perm: 'granted', noMidi: true } });
    await gestikOn(page);
    await page.waitForFunction(() => window.__M.GK.perm === 'granted');
    await play(page, L.trace(1.5, () => ({ beta: 45 }), HAND));
    const n0 = await finger(page);
    // lying back over 3 s, the phone held overhead (a trembling hand)
    await play(page, L.trace(3, (t) => ({ beta: 45 + 125 * L.smooth(0, 3, t) }), HAND));
    const p = play(page, L.trace(2.5, () => ({ beta: 170, roll: 3 }), HAND));
    await sleep(800);
    const a = await st(page), n1 = await finger(page);
    await p;
    ok(n0 === 1 && !a.w && !a.slp && !a.veil && n1 === 1, 'lying back slowly, phone overhead: no Wenden, no veil, a finger plays (' + JSON.stringify(a) + ', notes ' + n0 + '/' + n1 + ')');
    // turned over fast in the hand: Wenden (an in-hand flip) – but no veil while held, and a finger wakes it and plays
    await play(page, L.trace(1.2, () => ({ beta: 45 }), HAND));
    await play(page, L.trace(0.6, (t) => ({ beta: 45 + 125 * L.smooth(0, 0.5, t) }), HAND));
    const p2 = play(page, L.trace(2.5, () => ({ beta: 170 }), HAND));
    await sleep(900);
    const b = await st(page), n2 = await finger(page), b2 = await st(page);
    await p2;
    ok(b.w && !b.veil && n2 === 1 && !b2.w && !b2.slp, 'flipped in the hand: Wenden, no veil; a finger plays and wakes it (' + JSON.stringify(b) + ' → ' + JSON.stringify(b2) + ')');
    // laid face down on the table: asleep, and once it lies still the veil swallows touches
    await play(page, L.trace(1.2, () => ({ beta: 45 }), HAND));
    await play(page, L.trace(0.8, (t) => ({ beta: 45 + 135 * L.smooth(0, 0.6, t) }), HAND));
    const p3 = play(page, L.trace(3, () => ({ beta: 180 }), TABLE));
    await sleep(1800);
    const c = await st(page), n3 = await finger(page);
    await p3;
    ok(c.w && c.slp && c.veil && n3 === 0, 'face down on the table: asleep, the veil swallows touches (' + JSON.stringify(c) + ', note ' + n3 + ')');
    await page.evaluate(() => window.__M.gkSet('schlaf', false));
    const p4 = play(page, L.trace(1.5, () => ({ beta: 180 }), TABLE));
    await sleep(600);
    const d = await st(page);
    await p4;
    ok(d.w && !d.slp && d.veil, 'Schlafen off: lying on its face still keeps the veil (phantom touches), nothing sleeps (' + JSON.stringify(d) + ')');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- 2. the sign: deviceorientation tells it (iOS mirrored), stored for the next session ----
  {
    const { page, errors, ctx } = await H.open({ vp: MOB, cfg: { perm: 'granted', noMidi: true } });
    await gestikOn(page);
    await page.waitForFunction(() => window.__M.GK.perm === 'granted');
    const tr = L.mirror(L.trace(1.2, () => ({ beta: 90, roll: 90 }), HAND));   // landscape with portrait lock: the pose says nothing
    const p = play(page, tr);
    for (let i = 0; i < 6; i++) { await sleep(120); await page.evaluate(() => window.__do(0, 90)); }
    await p;
    const a = await page.evaluate(() => ({ sign: window.__M.GK.R.st.sign, k: window.__M.GK.R.st.signK, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1')).sign, txt: window.__M.gkSignText() }));
    ok(a.sign === -1 && a.k === 'ori' && a.stored === -1 && /gespiegelt \(an der Lage geprüft\)/.test(a.txt), 'iOS mirrored: deviceorientation tells the sign, stored for this device (' + JSON.stringify(a) + ')');
    // laid face up: no Wenden
    await play(page, L.mirror(L.trace(3, (t) => ({ beta: 90 - 90 * L.smooth(0, 1, t), roll: 90 - 90 * L.smooth(0, 1, t) }), TABLE)));
    const b = await st(page);
    ok(!b.w && !b.slp, 'then laid face up: no Wenden (' + JSON.stringify(b) + ')');
    // Gestik off and on again: the stored sign is there from the first sample
    await page.evaluate(() => window.__M.gkDisable());
    await gestikOn(page);
    await play(page, L.mirror(L.trace(0.5, () => ({ beta: 0 }), TABLE)));
    const c = await page.evaluate(() => ({ sign: window.__M.GK.R.st.sign, k: window.__M.GK.R.st.signK }));
    ok(c.sign === -1 && c.k === 'stored', 'switched on again: the stored sign from the first sample (' + JSON.stringify(c) + ')');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- 3. Sporenregen: the dragged lean stays; the mixer's Regen strip ----
  {
    const { page, errors } = await H.open({ vp: { width: 1180, height: 820, touch: true, mobile: true }, cfg: { perm: 'granted', noMidi: true } });
    const vis0 = await page.evaluate(() => { const M = window.__M; M.openPanel('mix'); return new Promise((r) => setTimeout(() => r(!M.MX.ch.rgn.el.classList.contains('gone')), 300)); });
    ok(!vis0, 'Gestik off: the mixer has no "Regen" strip (eleven strips as before)');
    await page.evaluate(() => window.__M.closePanel());
    await gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 70, roll: 0 }, 0.05));   // an iPad on its stand
    await sleep(800);
    await page.evaluate(() => window.__M.gkSet('neigen', 'regen'));
    await sleep(2500);
    // (the simulated stand leans the device about its own x – in this landscape view that is sideways)
    const a = await page.evaluate(() => ({ s: Math.hypot(window.__M.GK.out.tiltX, window.__M.GK.out.tiltY), ruhe: window.__M.GK.ev.ruhe }));
    ok(a.s > 0.9, 'Sporenregen on an iPad already on its stand: measured from the flat, it rains (slope ' + a.s.toFixed(2) + ')');
    // the Wasserwaage dragged and let go: the lean stays on top of the sensor
    await page.evaluate(() => { const M = window.__M; if (M.UI.panel !== 'dev') M.openPanel('dev'); });
    await page.waitForSelector('.gk-ww', { state: 'visible' });
    await page.evaluate(() => document.querySelector('.gk-ww').scrollIntoView({ block: 'center' }));
    const box = await page.evaluate(() => { const r = document.querySelector('.gk-ww').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + box.w * 0.3, box.y, { steps: 6 }); await page.mouse.up();
    await sleep(300);
    const b = await page.evaluate(() => ({ latch: window.__M.GK.latch, v: window.__M.GK.virt, word: window.__M.gkModeWord()[1] }));
    ok(b.latch && b.v && Math.abs(b.v.x) > 0.2 && /von Hand/.test(b.word), 'dragged and let go: the lean stays on top of the sensor (offset ' + JSON.stringify(b.v) + ', "' + b.word + '")');
    await page.dblclick('.gk-ww');
    await sleep(300);
    const c = await page.evaluate(() => ({ latch: window.__M.GK.latch, virt: window.__M.GK.virt }));
    ok(!c.latch && !c.virt, 'a double tap gives it back to the sensor');
    const vis1 = await page.evaluate(() => { const M = window.__M; M.openPanel('mix'); return new Promise((r) => setTimeout(() => r(!M.MX.ch.rgn.el.classList.contains('gone')), 300)); });
    ok(vis1, 'Gestik on with Sporenregen: the mixer shows "Regen"');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- 4. the bass guard's nodes; a Schleife of Bewegung's Gestik lanes and its undo; preset undo; learn; pedal; Taste ----
  {
    const { page, errors } = await H.open({ vp: MOB, cfg: { perm: 'granted', ins: [['k1', 'microKEY Air']] } });
    await gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45 }, 2));
    await sleep(600);
    const nodes = await page.evaluate(async () => {
      const M = window.__M, seen = new Set();
      for (let i = 0; i < 6; i++) { M.gkBass(); seen.add(M.A.gkB); M.gkBassOff(); M.GK.bass = null; }
      return seen.size;
    });
    ok(nodes === 1, 'the bass guard: one low-pass and analyser per audio context, however often Gestik comes on (' + nodes + ')');
    // a Schleife of Bewegung with a Gestik lane and a knob lane (what a knob and Anlehnen did, taken by the Korb – once a
    // Fährte's tap), then Gestik off
    const fl = await page.evaluate(async () => {
      const M = window.__M;
      for (let i = 0; i < 100 && M.HX.state !== 'ok'; i++) await new Promise((r) => setTimeout(r, 50));
      M.modSet('gk:anl.h', 'hoehe', 0.4); M.modSet('map:knob', 'flt', 0.5);
      for (let i = 0; i < 40; i++) { M.modSet('gk:anl.h', 'hoehe', 0.4 * Math.sin(i / 3)); M.modSet('map:knob', 'flt', 0.5 * Math.cos(i / 4)); await new Promise((r) => setTimeout(r, 60)); }
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      M.hxKorb(null);
      let L = null;
      for (let i = 0; i < 120 && !(L && L.bew.lanes.length); i++) { await new Promise((r) => setTimeout(r, 50)); L = M.hxLoopsLive().find((x) => x.bew); }
      await new Promise((r) => setTimeout(r, 300));
      return { loop: !!L, lanes: L ? L.bew.lanes.map((l) => l.src) : [] };
    });
    if (fl.loop && fl.lanes.some((s) => s.startsWith('gk:'))) {
      const off = await page.evaluate(async () => {
        const M = window.__M;
        M.gkDisable();
        await new Promise((r) => setTimeout(r, 500));
        const ks = Object.values(M.MOD.t).flatMap((T) => [...T.s.keys()]);
        return { gk: ks.filter((k) => k.startsWith('hxb') && k.includes('|gk:')), map: ks.filter((k) => k.startsWith('hxb') && k.includes('|map:')) };
      });
      ok(!off.gk.length && off.map.length > 0, 'Gestik off: the Schleife\'s Gestik lanes rest, a knob\'s lane plays on (' + JSON.stringify(off) + ')');
      await gestikOn(page);
      await sleep(600);
      const on = await page.evaluate(() => Object.values(window.__M.MOD.t).flatMap((T) => [...T.s.keys()]).filter((k) => k.startsWith('hxb') && k.includes('|gk:')).length);
      ok(on > 0, 'Gestik on again: they play again (' + on + ')');
      // deleted (its card) – ↶ brings it back
      const u = await page.evaluate(async () => {
        const M = window.__M;
        M.hxDelete(M.hxLoopsLive().find((x) => x.bew));
        const gone = !M.hxLoopsLive().some((x) => x.bew);
        M.hxUndoStep();
        await new Promise((r) => setTimeout(r, 200));
        return { gone, back: M.hxLoopsLive().some((x) => x.bew && x.state === 'spielt') };
      });
      ok(u.gone && u.back, 'the Schleife of Bewegung deleted – ↶ brings it back, it plays again');
      await page.evaluate(() => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDrop(L); M.setParam('hx.laenge', 'auto'); });
    } else ok(false, 'a Schleife of Bewegung with a Gestik lane was made (' + JSON.stringify(fl) + ')');
    // a user preset (format 2) with Gestik settings, then Rückgängig: the own settings come back
    const pr = await page.evaluate(async () => {
      const M = window.__M;
      M.gkSet('neigen', 'anl'); M.gkSet('lad', true); M.gkSet('entl', 8);
      M.loadPreset({ name: 'T', fmt: 2, v: M.patchValues(), gk: { neigen: 'regen', lad: false, entl: 0.5 } });
      const mid = { n: M.GK.p.neigen, l: M.GK.p.lad };
      M.undo();
      return { mid, back: { n: M.GK.p.neigen, l: M.GK.p.lad, e: M.GK.p.entl }, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1')).neigen };
    });
    ok(pr.mid.n === 'regen' && pr.back.n === 'anl' && pr.back.l === true && pr.back.e === 8 && pr.stored === 'anl', 'a user preset\'s Gestik settings, then Rückgängig: the own come back (' + JSON.stringify(pr) + ')');
    // learn: the phone sways, a knob is turned – the knob is learned
    const ln = await page.evaluate(async () => {
      const M = window.__M;
      M.midiLearn(true);   // (no target yet: what is captured stays to be seen)
      const t0 = performance.now();
      let i = 0;
      const iv = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__setPose({ beta: 45 + 4 * Math.sin(t * 5), roll: 7 * Math.sin(t * 4.2) }); }, 30);
      await new Promise((r) => setTimeout(r, 1500));
      for (let v = 20; v < 90; v += 5) { window.__send([0xb0, 21, v]); await new Promise((r) => setTimeout(r, 30)); }
      await new Promise((r) => setTimeout(r, 200));
      clearInterval(iv);
      const c = M.LEARN.cap;
      return { kind: c && c.kind, num: c && c.num };
    });
    ok(ln.kind === 'cc' && ln.num === 21, 'learn while the phone sways: the knob turned on the keyboard is taken (' + JSON.stringify(ln) + ')');
    await page.evaluate(() => { const M = window.__M; if (M.LEARN.on) M.midiLearn(false); window.__setPose({ beta: 45, roll: 0 }); });
    // the pedal: by default it holds only the notes; with the switch on it freezes Gestik too
    const ped = await page.evaluate(async () => {
      const M = window.__M, w = (ms) => new Promise((r) => setTimeout(r, ms));
      M.gkSet('neigen', 'anl');
      window.__send([0x90, 60, 100]); await w(150);
      window.__send([0xb0, 64, 127]); await w(200);
      const a = M.GK.mode;
      M.gkSet('ped', true); window.__send([0xb0, 64, 0]); await w(100); window.__send([0xb0, 64, 127]); await w(200);
      const b = M.GK.mode;
      window.__send([0xb0, 64, 0]); window.__send([0x80, 60, 0]); M.gkSet('ped', false);
      return { a, b };
    });
    ok(ped.a.startsWith('live') && ped.b === 'hold', 'the sustain pedal: Gestik acts on (' + ped.a + '); "Haltepedal hält fest" on: it holds (' + ped.b + ')');
    const ta = await page.evaluate(async () => { const M = window.__M; if (M.UI.panel !== 'dev') M.openPanel('dev'); await new Promise((r) => setTimeout(r, 300)); M.gkCardSync(); const b = M.GK.card.clutch.querySelector('[data-v="taste"]'); return { dis: b.disabled, title: b.title }; });
    ok(ta.dis && /Gestik-Taste/.test(ta.title), '"Taste" cannot be chosen without a pad for it (' + ta.title + ')');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- 5. chords, the rest detent, Fingerhalt ----
  {
    const { page, errors } = await H.open({ vp: MOB, cfg: { perm: 'granted', ins: [['k1', 'microKEY Air']] } });
    await gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45 }, 2));
    await sleep(600);
    const ch = await page.evaluate(async () => {
      const M = window.__M, w = (ms) => new Promise((r) => setTimeout(r, ms)), out = [];
      for (const order of [[60, 64, 67], [67, 60, 64], [64, 67, 60]]) {
        window.__setPose({ beta: 45, roll: 0 }); await w(300);
        for (const n of order) { window.__send([0x90, n, 100]); await w(2); }
        await w(300);
        window.__setPose({ beta: 45, roll: 22 }); await w(900);
        const ts = [...M.touches.values()].map((tt) => ({ f: tt.f, c: tt.ga ? Math.round(tt.ga.c) : 0 })).sort((a, b) => a.f - b.f);
        out.push(ts.map((x) => x.c).join('/'));
        for (const n of order) window.__send([0x80, n, 0]);
        window.__setPose({ beta: 45, roll: 0 }); await w(400);
      }
      return out;
    });
    ok(ch.every((s) => /^0\/0\/[1-9]\d*$/.test(s)), 'a chord from the keyboard, any arrival order: the top note bends, the others stay (' + ch.join(' · ') + ')');
    const dr = await page.evaluate(async () => {
      const M = window.__M, w = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
      window.__setPose({ beta: 45, roll: 0 }); await w(300);
      window.__send([0x90, 62, 100]); await w(300);
      for (const deg of [4, 6, 8, 10, 14]) { window.__setPose({ beta: 45, roll: deg }); await w(700); const tt = [...M.touches.values()][0]; out[deg] = tt && tt.ga ? Math.round(tt.ga.c) : 0; }
      window.__send([0x80, 62, 0]); window.__setPose({ beta: 45, roll: 0 });
      return out;
    });
    ok(dr[4] === 0 && dr[6] === 0 && dr[8] === 0 && dr[14] > 0, 'Tonhöhe has a rest of its own: a hand drifting up to 8° leaves the note in tune (' + JSON.stringify(dr) + ' cents)');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- 6. Ladung in a sound without grains; Schlafen's long sleep; a Schleife of Bewegung's ring; a recording with only rain ----
  {
    const { page, errors } = await H.open({ vp: MOB, cfg: { perm: 'granted', noMidi: true } });
    await gestikOn(page);
    await page.evaluate(() => { window.__M.setParam('v.eng', 'neb'); window.__M.setParam('v.layer', 'off'); if (window.__M.SEQ.on) window.__M.seqStop(); });
    await play(page, L.trace(1, () => ({ beta: 45 }), HAND));
    await play(page, L.trace(2.4, (t) => ({ beta: 45, lin: [16 * Math.sin(2 * Math.PI * 5 * t), 3 * Math.sin(2 * Math.PI * 5 * t), 0] }), HAND));
    const ld = await page.evaluate(() => { const M = window.__M; return { lvl: M.LAD.lvl, dry: M.ladDry(), h: M.MOD.t.hoehe.s.has('gk:lad.fh'), d: M.MOD.t.dly.s.has('gk:lad.fd'), c: M.MOD.t.cho.s.has('gk:lad.fc') }; });
    ok(ld.lvl > 0.2 && ld.dry && ld.h && ld.d && ld.c, 'Ladung in Nebel with the Puls stopped: brighter, more echo and shimmer (' + JSON.stringify(ld) + ')');
    const sl = await page.evaluate(async () => {
      const M = window.__M, w = (ms) => new Promise((r) => setTimeout(r, ms));
      M.seqStart(); await w(300);
      window.__sensor(true, { beta: 45 }, 2); await w(500);
      window.__setPose({ beta: 180 }); window.__S.tremor = 0.05; await w(1500);   // turned onto its screen, lying there
      const asleep = M.SLP.on;
      M.SLP.t0 -= 25000;   // as if face down for 25 s
      window.__setPose({ beta: 45 }); window.__S.tremor = 2; await w(700);   // picked up
      const r = { asleep, seq: M.SEQ.on && M.SEQ.stopB == null, kt: M.SLP.kt, on: M.SLP.on };   // (a bar not yet ended still ends)
      await w(1700);
      r.kt2 = M.SLP.kt; r.dk = M.SLP.dk;
      return r;
    });
    ok(sl.asleep && !sl.on && !sl.seq && sl.kt === 0 && sl.kt2 === 1 && !sl.dk, 'woken after a long sleep: into silence – the Puls stays stopped, the echo and hall come back after 1.5 s (' + JSON.stringify(sl) + ')');
    // (the Fährte's tag on the field is retired: a Schleife of Bewegung shows as a ring of the Ringleiste)
    const tg = await page.evaluate(async () => {
      const M = window.__M;
      M.hxRailShow && M.hxRailShow(true);
      for (let i = 0; i < 30; i++) { M.modSet('map:knob', 'flt', 0.5 * Math.sin(i / 3)); await new Promise((r) => setTimeout(r, 60)); }
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      M.hxKorb(null);
      let L = null;
      for (let i = 0; i < 120 && !(L && L.bew.lanes.length); i++) { await new Promise((r) => setTimeout(r, 50)); L = M.hxLoopsLive().find((x) => x.bew); }
      await new Promise((r) => setTimeout(r, 300));
      const b = L && document.querySelectorAll('.hx-ring')[L.slot];
      return { loop: !!L, aria: b ? b.getAttribute('aria-label') : '' };
    });
    ok(tg.loop && /^Schleife \d, Bewegung, 1 Takt, spielt/.test(tg.aria), 'a Schleife of Bewegung plays: its ring says so ("' + tg.aria + '")');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  await H.close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await H.close(); });
