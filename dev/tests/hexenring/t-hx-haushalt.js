// Hexenring – the Pegelhaushalt (haushalt.js, 30.10.2026): a Schleife plays; the sum is driven into the Begrenzer (its
// strip and the Summe +6 dB, a loud live note on top) – within a few seconds the strip „Hexenring“ gives way (HXH.db
// below 0, the Begrenzer's reduction eases), its text says so; driven no longer, it comes back after the quiet time;
// with hx.haushalt off it never moves. The Begrenzer's reduction is read from its own report (A.limRed).
//                                                                                           node t-hx-haushalt.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 16; i++) list.push([M.tgTime(B0) + i * beat / 4, [0, 2, 4, 7][i % 4], 1, 0.25]);
    window.__play(list, { eng: 'glo' });
    await window.__until(M.tgTime(B0 + 4) + 0.04);
    M.hxKorb(null); await sl(600);
    o.n = M.hxLoopsLive().length; o.lim = !!A.lim;
    // the Begrenzer's deepest reduction over ms (dB, positive)
    const red = async (ms) => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { m = Math.max(m, -(A.limRed || 0)); await sl(30); } return +m.toFixed(1); };
    // a loud live drone on top (held notes, let go at the end)
    const drone = () => { const vs = []; for (const d of [0, 2, 4, 6]) { const nt = M.N.notes[Math.min(d, M.N.notes.length - 1)]; const v = M.playNote('neb', A.ctx.currentTime, nt.f, 0.5, 1, { bus: M.stripIn('fin') }); if (v) vs.push(v); } return vs; };
    await sl(800); o.hr0 = M.HXHR.db; o.red0 = await red(1500);
    // pressed into the Verdichtung a little (+6 dB on the strip, the drone): its own work – the Haushalt stays
    let vs = drone();   // (the Schleife as it is, a drone on top)
    await sl(4000); o.hrSoft = +M.HXHR.db.toFixed(2); o.redSoft = await red(1000); o.glue = +M.mxGR().toFixed(1);
    // … slammed (the Summe +6 dB on top: the Verdichtung holds more than 10 dB): it counts as pressing
    M.setParam('xhxr.vol', 6); M.setParam('mst.vol', 6); let gmax = 0; for (let i = 0; i < 40; i++) { await sl(100); gmax = Math.max(gmax, M.mxGR()); } o.hrSlam = +M.HXHR.db.toFixed(2); o.glueSlam = +gmax.toFixed(1);   // (the Verdichtung's deepest hold over 4 s)
    // driven into the Begrenzer: without the Verdichtung
    M.setParam('mst.comp', 0);
    await sl(600); o.redHot = await red(1500);
    await sl(6000); o.hrHot = +M.HXHR.db.toFixed(2); o.redLater = await red(1500); o.txt = M.hxSrcText(); o.need = M.HXHR.need;
    for (const v of vs) if (v.release) v.release();
    // back: nothing drives any more – after the quiet time it comes back
    M.setParam('xhxr.vol', 0); M.setParam('mst.vol', 2); M.setParam('mst.comp', 0.35);
    const t1 = performance.now(); while (performance.now() - t1 < 24000 && M.HXHR.db < -0.05) await sl(250);
    o.hrBack = +M.HXHR.db.toFixed(2); o.tBack = Math.round((performance.now() - t1) / 1000);
    // off: it never moves
    M.setParam('hx.haushalt', false); M.setParam('xhxr.vol', 6); M.setParam('mst.vol', 6); M.setParam('mst.comp', 0); vs = drone();
    await sl(5000); o.hrOff = M.HXHR.db; o.redOff = await red(1000);
    for (const v of vs) if (v.release) v.release();
    M.setParam('hx.haushalt', true); M.setParam('xhxr.vol', 0); M.setParam('mst.vol', 2); M.setParam('mst.comp', 0.35); M.hxStille();
    return o;
  }, BPM);
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.lim && r.hr0 === 0 && r.red0 < 1.5, `a Schleife plays, the Begrenzer is there and idle (${r.red0} dB), the Haushalt at 0`);
  ok(r.hrSoft === 0 && r.redSoft < 1.5 && r.glue > 2 && r.glue < 10, `pressed into the Verdichtung a little (${r.glue} dB, the Begrenzer ${r.redSoft} dB): the Haushalt stays at 0 (${r.hrSoft}) – that is the Verdichtung's own work`);
  ok(r.glueSlam > 10 && r.hrSlam < -1, `slammed (the Verdichtung holds ${r.glueSlam} dB): the strip gives way (${r.hrSlam} dB)`);
  ok(r.redHot > 1.5 && r.hrHot <= -2 && r.hrHot >= -6, `driven into the Begrenzer (${r.redHot} dB reduction): within 6 s the strip gave way to ${r.hrHot} dB (need ${r.need})`);
  ok(r.redLater < r.redHot && /Spielraum/.test(r.txt), `the Begrenzer has less to do (${r.redLater} dB), the strip says „${r.txt}“`);
  ok(r.hrBack > -0.1 && r.tBack <= 24, `driven no longer: back at 0 after ${r.tBack} s`);
  ok(r.hrOff === 0 && r.redOff > 1.5, `hx.haushalt off: the Begrenzer works (${r.redOff} dB), the strip stays (${r.hrOff})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
