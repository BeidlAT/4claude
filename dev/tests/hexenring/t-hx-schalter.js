// Hexenring – the editor's switches (owner, 30.10.2026: „anklicken, noch einmal klicken nimmt es zurück … für alle
// Einträge“; klangebene.js):
//  1 Verwandeln „Wurzel“ on the whole loop: a layer (L.rx), the Schicht's audio made anew from its base (S.rxB), the
//    chip lit; the same chip again: off, the base audio itself plays again (the very same chunks)
//  2 with the layer on, a Noten tool („dünner“) grows a new Wuchs version – the version carries the layer (V.rxs,
//    V.aud0 beside it), the layer stays on; off again: the version's own render
//  3 Zeit: „−5 ms“ lit once set, the same chip again: back to 0; Noten „Stufe +1“ the same; Trimmen ½ again: ganz
//  4 after a reload the layer and its base come back: the switch still takes it off
//                                                                                           node t-hx-schalter.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('ui.instrument', 'eigen'); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' });
    await window.__until(M.tgTime(B0 + 4) + 0.04);
    M.hxKorb(null); await sl(800);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]); o.n = M.hxLoopsLive().length;
    for (let i = 0; i < 300 && !(S.aud && S.saved >= 1); i++) await sl(100);   // (its audio in from the ring, and stored once)
    o.aud = !!S.aud;
    const idle = async () => { for (let i = 0; i < 200 && (L.rxBusy || S.wBusy); i++) await sl(100); };
    const lit = (t) => { const b = [...document.querySelectorAll('.hx-ed-part .chip, .hx-ed-row .chip')].find((x) => x.textContent === t); return b ? b.getAttribute('aria-pressed') : null; };
    M.hxEdOpen(L); await sl(500);
    // 1 · Wurzel on, off
    const aud0 = S.aud;
    M.hxRxToggle(L, 'verw', 'wurzel'); await idle(); await sl(300);
    o.on = { rx: L.rx && L.rx.verw, base: !!S.rxB && S.rxB.aud === aud0, changed: S.aud !== aud0, lit: lit('Wurzel'), label: M.HX.hist[M.HX.hist.length - 1].label };
    M.hxRxToggle(L, 'verw', 'wurzel'); await idle(); await sl(300);
    o.off = { rx: M.hxRxOn(M.hxRxOf(L)), same: S.aud === aud0, lit: lit('Wurzel') };
    // 2 · the layer and a Noten tool
    M.hxRxToggle(L, 'verw', 'wurzel'); await idle(); await sl(200);
    M.hxNtSet(L, 'dens', -1);
    for (let i = 0; i < 300 && !(S.wu && S.wu.rxs); i++) await sl(100);
    await idle();
    o.wu = { rx: L.rx && L.rx.verw, play: S.play, rxs: S.wu && S.wu.rxs, aud0: !!(S.wu && S.wu.aud0 && S.wu.aud0 !== S.wu.aud), dens: L.nt && L.nt.dens, lit: lit('Wurzel'), dLit: lit('dünner') };
    M.hxRxToggle(L, 'verw', 'wurzel'); await idle(); await sl(300);
    o.wuOff = { rx: M.hxRxOn(M.hxRxOf(L)), own: !!(S.wu && S.wu.aud === S.wu.aud0) };
    M.hxNtSet(L, 'dens', 1); await sl(300); o.densBack = (L.nt && L.nt.dens) || 0;   // (the switch: back to 0)
    // 3 · Zeit, Noten, Trimmen
    const chipOf = (t) => [...document.querySelectorAll('.hx-ed-row .chip')].find((x) => x.textContent === t);
    chipOf('−5 ms').click(); await sl(400); o.z1 = { nudge: +((L.nudge || 0) * 1000).toFixed(1), lit: chipOf('−5 ms').getAttribute('aria-pressed') };
    chipOf('−5 ms').click(); await sl(400); o.z2 = { nudge: +((L.nudge || 0) * 1000).toFixed(1), lit: chipOf('−5 ms').getAttribute('aria-pressed') };
    chipOf('Stufe +1').click(); await sl(600); o.s1 = { tr: L.nt && L.nt.tr, lit: chipOf('Stufe +1').getAttribute('aria-pressed') };
    chipOf('Stufe +1').click(); await sl(600); o.s2 = { tr: (L.nt && L.nt.tr) || 0, lit: chipOf('Stufe +1').getAttribute('aria-pressed') };
    chipOf('½').click(); for (let i = 0; i < 60 && !(L.trim && L.trim.f === 0.5); i++) await sl(100); await sl(300); o.t1 = { f: L.trim && L.trim.f, lit: chipOf('½').getAttribute('aria-pressed') };
    chipOf('½').click(); for (let i = 0; i < 60 && L.trim; i++) await sl(100); await sl(300); o.t2 = { f: L.trim ? L.trim.f : 1, lit: chipOf('½').getAttribute('aria-pressed') };
    // 4 · the layer kept over a reload
    M.hxRxToggle(L, 'farb', 'erde'); await idle(); await sl(300); o.erde = L.rx && L.rx.farb;
    for (let i = 0; i < 200 && !((S.savedR || 0) >= 1 && S.saved >= 1); i++) await sl(100);
    await sl(1500);   // (the meta record after its debounce)
    o.saved = { r: S.savedR || 0, a: S.saved || 0 };
    M.hxEdClose();
    return o;
  }, BPM);
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.on.rx === 'wurzel' && r.on.base && r.on.changed && r.on.lit === 'true' && /Wurzel/.test(r.on.label), `1 · Wurzel on: a layer, the audio anew from its base, the chip lit (${JSON.stringify(r.on)})`);
  ok(!r.off.rx && r.off.same && r.off.lit === 'false', `1 · the same chip again: off, the base audio itself plays (${JSON.stringify(r.off)})`);
  ok(r.wu.rx === 'wurzel' && r.wu.play === 'wu' && r.wu.rxs && r.wu.aud0 && r.wu.dens === -1 && r.wu.lit === 'true' && r.wu.dLit === 'true', `2 · „dünner“ grows a version that carries the layer, the layer stays on (${JSON.stringify(r.wu)})`);
  ok(!r.wuOff.rx && r.wuOff.own && r.densBack === 0, `2 · off again: the version's own render; „dichter“ on „dünner“ is back to 0 (${JSON.stringify(r.wuOff)}, dens ${r.densBack})`);
  ok(r.z1.nudge === -5 && r.z1.lit === 'true' && r.z2.nudge === 0 && r.z2.lit === 'false', `3 · Zeit −5 ms: ${JSON.stringify(r.z1)} → again ${JSON.stringify(r.z2)}`);
  ok(r.s1.tr === 1 && r.s1.lit === 'true' && r.s2.tr === 0 && r.s2.lit === 'false', `3 · Stufe +1: ${JSON.stringify(r.s1)} → again ${JSON.stringify(r.s2)}`);
  ok(r.t1.f === 0.5 && r.t1.lit === 'true' && r.t2.f === 1 && r.t2.lit === 'false', `3 · Trimmen ½: ${JSON.stringify(r.t1)} → again ganz ${JSON.stringify(r.t2)}`);
  ok(r.erde === 'erde' && r.saved.r >= 1, `4 · Färben Erde on, its base stored (~r: ${r.saved.r} segments)`);
  await page.reload(); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.waitForTimeout(2500);
  const r2 = await ev(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), L = M.hxLoopsLive()[0]; if (!L) return { n: 0 };
    const S = M.HX.sch.get(L.sch[0]), o = { n: M.hxLoopsLive().length, rx: L.rx && L.rx.farb, base: !!(S && S.rxB && S.rxB.aud), bn: S && S.rxB ? S.rxB.n === S.n : false };
    if (S && S.rxB) { const b = S.rxB.aud; M.hxRxToggle(L, 'farb', 'erde'); for (let i = 0; i < 200 && L.rxBusy; i++) await sl(100); await sl(300); o.off = !M.hxRxOn(M.hxRxOf(L)) && S.aud === b; }
    return o;
  });
  ok(r2.n === 1 && r2.rx === 'erde' && r2.base && r2.bn && r2.off, `4 · after a reload the layer and its base are back, the switch takes it off (${JSON.stringify(r2)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
