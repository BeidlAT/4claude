// Schlafen (slot gl): turned onto its screen, Myzel falls asleep – Freeze-Kadenz (the echo breathes in and freezes,
// the dry sound fades into the frozen tail over 3 s, the Puls ends with its bar, the Geflecht sleeps), Stille, Szene B
// (the mixer glides to B without being changed; A = B falls back to the Kadenz); touches are ignored while the screen
// lies down, a keyboard plays over the tail; turned back it wakes with a bloom – exactly as it was (the Puls, the
// freeze the player had, the mixer, the strips' gains); the switch, a binding of Wenden, Ruhe's sleeping symbol,
// Gestik off and Stille while asleep, a sensor that dies or a page in the background.   node t-gl-schlafen.js
const { open, ok, close, probes, drivers, M, play, gestik } = require('./gl-h');
const near = (a, b, e) => Math.abs(a - b) <= e;
const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
// a phrase in the page: the Puls (lane 1, a Membran on each quarter, 120 BPM) and steady test tones into the Bordun's
// and the Klang's strips (their sends feed echo and hall), a dry, measurable mix
async function setup(page, o = {}) {
  await probes(page); await drivers(page);
  await page.evaluate((o) => {
    const M = window.__M, set = (k, v) => M.setParam(k, v);
    set('seq.bpm', o.bpm || 120); set('seq.swing', 0); set('v.human', 0); set('bor.on', false);
    for (let i = 1; i < 4; i++) set('l' + i + '.on', false);
    set('l0.on', true); set('l0.eng', 'mem'); set('l0.steps', 4); set('l0.puls', 4); set('l0.div', '1'); set('l0.prob', 1); set('l0.walk', 0);
    set('dly.mix', 0.3); set('dly.fb', 0.4); set('dly.wow', 0); set('rev.mix', 0.2);
    window.__g.tone(220, M.MIX.s.bor.in, 0.2); window.__g.tone(330, M.MIX.s.fin.in, 0.2);
  }, o);
}
const snap = (page) => page.evaluate(() => {
  const M = window.__M, b = document.querySelector('#btnGk');
  return { on: M.SLP.on, art: M.SLP.art, down: M.SLP.down, frozen: M.A.frozen, seq: M.SEQ.on, stopB: M.SEQ.stopB, dly: M.modVal('dly'), mx: M.MOD.mx, k: M.SLP.k, dk: M.SLP.dk, open: M.SLP.open,
    shade: !!(M.GK.shade && !M.GK.shade.hidden), shadeTxt: M.GK.shade ? M.GK.shade.textContent : '', ico: b.dataset.st, zz: M.VIS.zz, stage: document.querySelector('#stage').classList.contains('gk-zz'), anchor: M.SEQ.anchorT, wenden: M.GK.ev.wenden };
});
const rms = (page, k, reads = 2) => page.evaluate(([k, reads]) => window.__g.rms(k === 'dlyret' ? window.__M.MIX.s.dly.dry : k === 'out' ? window.__M.A.out : window.__M.MIX.s[k].dry, reads), [k, reads]);
// the whole output with the Puls in it: reads every 60 ms over 2 s – four of its beats, so a level does not depend on
// whether a 170-ms read caught a hit (two reads scattered by ±3 dB on the same steady sound)
// (the phone held meanwhile: the sensor keeps streaming, as in a hand)
const rmsOut = async (page) => (await Promise.all([rms(page, 'out', 34), play(page, 2.4, M.hold(45))]))[0];
(async () => {
  // ================= Freeze-Kadenz =================
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await setup(page);
    await page.evaluate(() => window.__M.seqStart());
    await play(page, 1.5, M.hold(45));
    const P0 = await page.evaluate(() => window.__g.patch());
    const r0 = { bor: await rms(page, 'bor'), fin: await rms(page, 'fin') };
    ok(await page.evaluate(() => window.__M.GK.p.schlaf && window.__M.GK.p.slArt === 'kadenz'), 'Schlafen is on while Gestik is on, Freeze-Kadenz by default');
    // a sampler: the Kadenz over time, and every Puls hit
    await page.evaluate(() => {
      const M = window.__M; window.__k = []; window.__hits = new Map();
      window.__ki = setInterval(() => {
        window.__k.push({ t: M.A.ctx.currentTime, on: M.SLP.on, frozen: M.A.frozen, dly: M.modVal('dly'), seq: M.SEQ.on, k: M.SLP.k, stopB: M.SEQ.stopB });
        for (const e of M.VIS.events) if (e.kind === 'hit' && e.lane === 0) window.__hits.set(e.t.toFixed(5), e.t);
      }, 25);
    });
    await play(page, 2, M.faceDown(45));
    const s0 = await snap(page);
    // (the veil waits until the phone lies still – about a second after it landed: held face down in a hand, a
    // finger on the screen must still reach it)
    await play(page, 0.8, M.hold(180));
    const s1 = await snap(page);
    ok(s0.on && s0.art === 'kadenz' && s0.wenden, 'turned onto its screen: Myzel falls asleep (Freeze-Kadenz)');
    ok(s1.shade && /schläft/.test(s1.shadeTxt) && s1.ico === 'schlaf' && s1.zz && s1.stage, 'lying still on its screen: a veil swallows touches, the symbol sleeps, the Geflecht dims');
    await play(page, 2.8, M.hold(180));
    const K = await page.evaluate(() => { clearInterval(window.__ki); return { k: window.__k, hits: [...window.__hits.values()].sort((a, b) => a - b), stopT: window.__M.timeAt(window.__k.find((x) => x.stopB != null).stopB) }; });
    const t0 = K.k.find((x) => x.on).t, fz = K.k.find((x) => x.frozen), swell = K.k.filter((x) => x.on && !x.frozen).map((x) => x.dly);
    ok(fz && near(fz.t - t0, 0.6, 0.08), 'the echo freezes 0.6 s after falling asleep (' + Math.round((fz.t - t0) * 1000) + ' ms)');
    ok(swell.length && Math.max(...swell) === 0.5 && K.k.filter((x) => x.frozen).every((x) => x.dly === 0), 'before, it takes a deep breath: the echo send swells by +0.5 (the mod layer), and lets go once frozen');
    const stopB = K.k.find((x) => x.stopB != null).stopB, lastOn = K.k.filter((x) => x.seq).pop();
    ok(stopB % 4 === 0 && K.stopT > t0 && K.stopT - t0 <= 2.05, 'the Puls is told to end with its bar (beat ' + stopB + ', ' + (K.stopT - t0).toFixed(2) + ' s later)');
    ok(K.hits.length && K.hits.every((t) => t < K.stopT - 1e-6) && K.hits.some((t) => t > t0) && !K.k[K.k.length - 1].seq && lastOn.t < K.stopT + 0.06, 'it plays to the end of the bar and not a note further (' + K.hits.filter((t) => t > t0).length + ' hits after falling asleep, the last ' + ((K.stopT - K.hits[K.hits.length - 1]) * 1000).toFixed(0) + ' ms before the downbeat), then stops');
    const mid = K.k.find((x) => x.t > t0 + 1.5);
    ok(mid && mid.k > 0.5 && mid.k < 0.85 && K.k[K.k.length - 1].k === 0, 'the dry sound fades along an equal-power curve (' + mid.k.toFixed(2) + ' at 1.5 s, 0 after 3 s)');
    const r1 = { bor: await rms(page, 'bor'), fin: await rms(page, 'fin'), ret: await rms(page, 'dlyret') };
    ok(db(r1.bor) - db(r0.bor) < -50 && db(r1.fin) - db(r0.fin) < -50, 'after the Kadenz the dry sound is gone (Bordun ' + (db(r1.bor) - db(r0.bor)).toFixed(0) + ' dB, Klang ' + (db(r1.fin) - db(r0.fin)).toFixed(0) + ' dB)');
    ok(db(r1.ret) > -40, 'the frozen echo tail sounds on (' + db(r1.ret).toFixed(0) + ' dBFS)');
    // touches are ignored while the screen lies down; a keyboard plays over the tail
    const box = await page.locator('#cvFx').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    const tch = await page.evaluate(() => { const M = window.__M; M.onDown({ pointerId: 501, pointerType: 'touch', pt: { x: 0.5, y: 0.5, px: 100, py: 100 } }); return M.touches.size; });
    ok(tch === 0, 'a tap on the glass (a wet table, phantom touches) plays nothing – through the veil or straight onto the field');
    await page.evaluate(() => window.__a.note(502, 0.5, 0.5));
    const kb = await snap(page), r2 = await rms(page, 'fin');
    ok(kb.open && near(db(r2), db(r0.fin), 1.5) && await page.evaluate(() => window.__M.touches.size === 1), 'a key of a keyboard plays over the frozen tail: Klang opens again (' + (db(r2) - db(r0.fin)).toFixed(1) + ' dB)');
    await page.evaluate(() => window.__a.up(502));
    // wake
    await page.evaluate(() => { const M = window.__M; window.__hy = []; window.__hi = setInterval(() => window.__hy.push([M.SLP.on, M.VIS.hy.length]), 20); });
    await play(page, 1.6, M.faceUp(45));
    const s2 = await snap(page), hyl = await page.evaluate(() => { clearInterval(window.__hi); return window.__hy; });
    const iw = hyl.findIndex((x) => !x[0]), hy0 = iw > 0 ? hyl[iw - 1][1] : 0, hy1 = Math.max(...hyl.slice(iw, iw + 5).map((x) => x[1]));
    ok(!s2.on && !s2.frozen && s2.seq && !s2.shade && !s2.zz && !s2.stage && s2.ico !== 'schlaf', 'turned back: it wakes – the echo thaws, the Puls runs again, the veil and the dimming go');
    ok(hy1 >= hy0 + 30, 'with a bloom of spores (' + (hy1 - hy0) + ' new hyphae)');
    await play(page, 1, M.hold(45));
    const r3 = { bor: await rms(page, 'bor'), fin: await rms(page, 'fin') };
    const g = await page.evaluate(() => { const M = window.__M; return M.MIX.src.map((st) => [st.k, st.in.gain.value, M.stripGain(st)]); });
    ok(near(db(r3.bor), db(r0.bor), 0.3) && near(db(r3.fin), db(r0.fin), 0.3), 'the dry sound is back at its level (Bordun ' + (db(r3.bor) - db(r0.bor)).toFixed(2) + ' dB, Klang ' + (db(r3.fin) - db(r0.fin)).toFixed(2) + ' dB)');
    ok(g.filter(([k]) => k === 'bor' || k === 'fin').every(([, v, w]) => Math.abs(v - w) < 1e-6), 'the strips hold exactly their own gain again (' + g.filter(([k]) => k === 'bor' || k === 'fin').map(([k, v]) => k + ' ' + v.toFixed(4)).join(', ') + ')');
    ok(await page.evaluate(() => window.__M.modVal('dly') === 0 && !window.__M.MOD.t.dly.s.has('gk:slp') && !window.__M.SLP.dk), 'nothing of it is left on the mod layer');
    ok(await page.evaluate(() => window.__g.patch()) === P0, 'the patch never changed');
    // woken before the bar ended: the Puls simply plays on
    await page.evaluate(() => { window.__M.setParam('seq.bpm', 40); window.__M.seqStart(); });
    await play(page, 0.3, M.hold(45));
    const a0 = await page.evaluate(() => window.__M.SEQ.anchorT);
    await play(page, 1.5, M.faceDown(45));
    const mid2 = await snap(page);
    await play(page, 1.4, M.faceUp(45));
    const s3 = await snap(page);
    if (!(mid2.on && mid2.stopB != null && !s3.on && s3.seq && s3.stopB == null && s3.anchor === a0)) console.log('    ', a0, JSON.stringify(mid2), JSON.stringify(s3));
    ok(mid2.on && mid2.stopB != null && !s3.on && s3.seq && s3.stopB == null && s3.anchor === a0, 'woken before the bar ended (40 BPM): the Puls never stopped – the same clock, nothing restarted');
    await page.evaluate(() => window.__M.setParam('seq.bpm', 120));
    // the player had frozen the echo before: it stays frozen, nothing breathes in
    await page.evaluate(() => document.querySelector('#btnFreeze').click());
    await play(page, 0.5, M.hold(45));
    await play(page, 2.2, M.faceDown(45));
    const f1 = await snap(page);
    await play(page, 1.6, M.faceUp(45));
    const f2 = await snap(page);
    ok(f1.on && f1.frozen && f1.dly === 0 && f2.frozen && !f2.on, 'the echo frozen by the player before: no breath, and still frozen after waking');
    await page.evaluate(() => document.querySelector('#btnFreeze').click());
    // the Puls stopped before: still stopped after waking
    await page.evaluate(() => window.__M.seqStop());
    await play(page, 2.6, M.faceDown(45));
    await play(page, 1.6, M.faceUp(45));
    ok(!(await snap(page)).seq, 'the Puls was stopped before: it stays stopped after waking');
    // Stille (the button or a pad) while asleep: nothing comes back on waking
    await page.evaluate(() => window.__M.seqStart());
    await play(page, 2.6, M.faceDown(45));
    await page.evaluate(() => window.__M.panic());
    await play(page, 1.6, M.faceUp(45));
    const pn = await snap(page);
    ok(!pn.on && !pn.seq && !pn.frozen, 'Stille while asleep: on waking the Puls does not come back');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ================= Stille =================
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await setup(page);
    await page.evaluate(() => { const M = window.__M; M.gkSet('slArt', 'stille'); M.seqStart(); });
    await play(page, 3, M.hold(45));   // (the echo and the hall in their steady state, as they are when it wakes)
    const o0 = await rmsOut(page);
    await play(page, 1.4, M.faceDown(45));
    const s = await snap(page), o1 = await rms(page, 'out');
    ok(s.on && s.art === 'stille' && !s.seq && db(o1) < -90, 'Stille: silence at once (' + db(o1).toFixed(0) + ' dBFS), the Puls stops');
    await page.evaluate(() => window.__a.note(601, 0.5, 0.5));
    const o2 = await rms(page, 'out');
    ok(db(o2) < -90, 'keys stay silent too – harte Stille');
    await page.evaluate(() => window.__a.up(601));
    await play(page, 1.6, M.faceUp(45));
    await play(page, 0.5, M.hold(45));
    const w = await snap(page), o3 = await rmsOut(page), mv = await page.evaluate(() => { const M = window.__M; return [M.A.masterVol.gain.value, M.SLP.mg]; });
    ok(!w.on && w.seq && near(db(o3), db(o0), 2) && mv[1] === 1, 'woken: the sound and the Puls are back (' + (db(o3) - db(o0)).toFixed(1) + ' dB)');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ================= Szene B =================
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await setup(page);
    // A and B equal: the Kadenz
    await page.evaluate(() => { const M = window.__M; M.gkSet('slArt', 'szene'); M.mxSnapLoad(); M.MX.snap.b = Object.assign({}, M.MX.snap.a); M.seqStart(); });
    await play(page, 2.4, M.faceDown(45));
    const eq = await snap(page);
    await play(page, 1.6, M.faceUp(45));
    ok(eq.on && eq.art === 'kadenz', 'Szene B while A and B are still equal: it freezes instead (Freeze-Kadenz)');
    await play(page, 1, M.hold(45));
    // B: the Bordun 24 dB down
    await page.evaluate(() => { const M = window.__M; M.MX.snap.b = Object.assign({}, M.MX.snap.a, { 'xbor.vol': -24 }); M.gkCardSync(); });
    const P0 = await page.evaluate(() => window.__g.patch()), b0 = await rms(page, 'bor');
    await play(page, 1.4, M.faceDown(45));
    const m1 = await snap(page);
    await play(page, 3, M.hold(180));
    const m2 = await snap(page), b1 = await rms(page, 'bor'), vol = await page.evaluate(() => [window.__M.P['xbor.vol'], window.__M.mp('xbor.vol')]);
    ok(m1.on && m1.art === 'szene' && m1.mx > 0 && m1.mx < 1, 'Szene B: the mixer glides toward B (' + m1.mx.toFixed(2) + ' on the way)');
    ok(m2.mx === 1 && near(db(b1) - db(b0), -24, 0.6) && vol[0] === 0 && vol[1] === -24, 'there after 2.5 s: the Bordun 24 dB down (' + (db(b1) - db(b0)).toFixed(1) + ' dB) – the patch still says ' + vol[0] + ' dB');
    ok(m2.seq && !m2.frozen && !m2.dk, 'the Puls plays on, nothing freezes or fades');
    await play(page, 1.6, M.faceUp(45));
    await play(page, 1, M.hold(45));
    const m3 = await snap(page), b2 = await rms(page, 'bor');
    ok(!m3.on && m3.mx === 0 && near(db(b2), db(b0), 0.3) && await page.evaluate(() => !window.__M.MOD.t.morph.s.has('gk:slp')), 'woken: back to the mixer’s own values (' + (db(b2) - db(b0)).toFixed(2) + ' dB), nothing left on the mod layer');
    ok(await page.evaluate(() => window.__g.patch()) === P0, 'the patch never changed');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ================= switch, Eigene, Ruhe, Gestik off, a dying sensor, the background =================
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await setup(page);
    await page.evaluate(() => window.__M.seqStart());
    // Schlafen off: no sleep – but touches are still ignored while the screen lies down
    await page.evaluate(() => window.__M.gkSet('schlaf', false));
    await play(page, 2.4, M.faceDown(45));
    const o = await snap(page);
    const tch = await page.evaluate(() => { const M = window.__M; M.onDown({ pointerId: 701, pointerType: 'touch', pt: { x: 0.5, y: 0.5, px: 100, py: 100 } }); return M.touches.size; });
    ok(!o.on && o.seq && o.shade && /liegt auf/.test(o.shadeTxt) && tch === 0, 'Schlafen off: nothing sleeps – but the screen lying down still ignores touches (' + o.shadeTxt + ')');
    await play(page, 1.6, M.faceUp(45));
    ok(!(await snap(page)).shade, 'turned back: touches count again');
    await page.evaluate(() => window.__M.gkSet('schlaf', true));
    // a binding of Wenden wins
    await page.evaluate(() => { const M = window.__M; M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'gest', num: 0, target: 'freeze', mode: 'momentary' }); M.MAP.v++; });
    await play(page, 2.4, M.faceDown(45));
    const e = await snap(page);
    await play(page, 1.6, M.faceUp(45));
    ok(!e.on && e.seq, 'Wenden assigned in Zuweisen (Eigene): the assignment acts, Schlafen rests');
    await page.evaluate(() => { const M = window.__M; M.MAP.user.length = 0; M.MAP.v++; if (M.A.frozen) M.setFreeze(false); });
    // Ruhe: face up and still – the symbol sleeps
    await play(page, 3.2, (t) => ({ beta: 45 * (1 - L_s(0.1, 0.8, t)) }), { noise: { g: 0.005, r: 0.02 } });
    const ru = await page.evaluate(() => ({ ruhe: window.__M.GK.ev.ruhe, st: document.querySelector('#btnGk').dataset.st, t: document.querySelector('#btnGk').title }));
    ok(ru.ruhe && ru.st === 'ruhe' && /ruht/.test(ru.t), 'face up and still (Ruhe): the live Gestik pauses, the symbol sleeps – „' + ru.t + '“');
    await play(page, 1.5, M.hold(45));
    // Gestik switched off while asleep: everything back
    await play(page, 2.6, M.faceDown(45));
    await page.waitForTimeout(800);
    const b4 = await snap(page);
    await page.evaluate(() => window.__M.gkDisable());
    await page.waitForTimeout(1400);   // (the strips glide back over about a second, exact at 1.2 s)
    const off = await snap(page), g = await page.evaluate(() => { const M = window.__M; return M.MIX.src.filter((st) => st.k === 'bor').map((st) => [st.in.gain.value, M.stripGain(st)])[0]; });
    ok(b4.on && b4.frozen && !off.on && !off.frozen && off.seq && !off.shade && Math.abs(g[0] - g[1]) < 1e-6 && off.ico !== 'schlaf', 'Gestik switched off while asleep: it wakes – the echo thaws, the Puls runs, the strips are back');
    await page.context().close();
    ok(!errors.length, 'no errors ' + errors.join(' | '));
  }
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await setup(page);
    await page.evaluate(() => window.__M.seqStart());
    // the sensor dies while the screen lies down (the page stays visible): touches after 1 s, awake after 2 s
    await play(page, 2.4, M.faceDown(45));
    await page.waitForTimeout(1300);
    const d1 = await snap(page);
    await page.waitForTimeout(1000);
    const d2 = await snap(page);
    ok(d1.on && !d1.shade && !d2.on, 'the sensor falls silent while it lies down: touches are free again after 1 s, it wakes after 2 s – never locked out');
    // the page goes to the background while asleep: it stays asleep, and wakes when turned back
    await play(page, 2.4, M.faceDown(45));
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(2600);
    const h1 = await snap(page);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await play(page, 1.8, M.faceUp(45));
    const h2 = await snap(page);
    ok(h1.on && !h2.on && h2.seq, 'in the background it sleeps on (no sensor there); back and turned over, it wakes');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
function L_s(a, b, x) { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }
