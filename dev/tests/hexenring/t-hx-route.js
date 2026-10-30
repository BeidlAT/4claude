// Hexenring – the way of the strip and of each Schleife (owner, 30.10.2026: „das Aufgenommene klingt erst gleich, wenn
// ich von Kette auf Direkt schalte … jede Schleife routen“):
//  1 the strip „Hexenring“ goes straight to the master whatever its Weg says (never the baked audio through a copy of
//    the chain – the effects came twice): with a hot drive and hall the sum's level is the same on „Kette“ and „Direkt“
//  2 „Kette“ makes every Schleife follow the live chain (dry through out 1), „Direkt“ lets each play as set (baked)
//  3 the Schleife's own switch „K“ in the Hexenring mixer; a new Schleife takes the strip's way
//                                                                                              node t-hx-route.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('xhxr.route', 'dir'); M.setParam('drv.mix', 0.8); M.setParam('drv.amt', 0.9); M.setParam('rev.mix', 0.6); M.setParam('dly.mix', 0);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const mk = async () => {
      const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
      for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
      window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(800);
      const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0], S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 300 && !(S.aud && (S.baked || !S.chain || L.folgt)); i++) await sl(100);
      return [L, S];
    };
    const [L, S] = await mk();
    o.n = M.hxLoopsLive().length; o.chain = !!S.chain; o.baked0 = !!S.baked; o.folgt0 = !!L.folgt; o.out0 = S.out;
    // the sum's level over ms (A.analyser, RMS dB)
    const lvl = async (ms) => { const b = new Float32Array(2048); let s = 0, k = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { A.analyser.getFloatTimeDomainData(b); let q = 0; for (const x of b) q += x * x; s += q / b.length; k++; await sl(40); } return +(10 * Math.log10(s / k + 1e-20)).toFixed(1); };
    const st = M.MIX.s.hxr, gM = M.hxGateM();
    await sl(1000); o.dirLvl = await lvl(2500); o.dirTo = st.dTo === gM;
    M.setParam('xhxr.route', 'fx'); await sl(400);
    for (let i = 0; i < 100 && S.out !== 1; i++) await sl(100);
    o.fxFolgt = !!L.folgt; o.fxOut = S.out; o.fxBaked = !!S.baked; o.fxTo = st.dTo === gM; o.fxChainIn = st.dTo === (M.HX.fx && M.HX.fx.in);
    await sl(hxLenMs(L) + 600); o.fxLvl = await lvl(2500);
    function hxLenMs(X) { return Math.round(M.hxLen(X) * 1000); }
    // a new Schleife while the strip says Kette: it follows from the start
    const [L2, S2] = await mk(); o.newFolgt = !!L2.folgt; o.newOut = S2.out;
    // back to Direkt: each burnt in again
    M.setParam('xhxr.route', 'dir'); await sl(400);
    for (let i = 0; i < 300 && !(S.baked && S2.baked); i++) await sl(100);
    o.backBaked = [!!S.baked, !!S2.baked]; o.backFolgt = [!!L.folgt, !!L2.folgt]; o.backTo = st.dTo === gM;
    // the Schleife's own switch in the Hexenring mixer
    M.openPanel('mix'); await sl(400); if (M.mxSetView) M.mxSetView('schleifen'); await sl(500); M.hxmSync(); await sl(300);
    const btn = () => { const S0 = M.HXM.st.find((x) => x.key === L.key); return S0 && S0.wb; };
    o.btn = !!btn(); if (btn()) { btn().click(); await sl(600); o.kOn = { folgt: !!L.folgt, lit: btn().getAttribute('aria-pressed') }; btn().click(); await sl(600); o.kOff = { folgt: !!L.folgt, lit: btn().getAttribute('aria-pressed') }; }
    M.closePanel(); M.setParam('drv.mix', 0); M.setParam('drv.amt', 0.35); M.setParam('rev.mix', 0.3); M.hxStille();
    return o;
  }, BPM);
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.chain && r.baked0 && !r.folgt0 && r.out0 === 0 && r.dirTo, `a Schleife through the chain, burnt in (baked ${r.baked0}, out ${r.out0}); the strip straight to the master`);
  ok(r.fxFolgt && r.fxOut === 1 && !r.fxBaked && r.fxTo && !r.fxChainIn, `„Kette“: the Schleife follows the live chain (out ${r.fxOut}, baked ${r.fxBaked}), the strip still straight (${r.fxTo}, not into the chain's copy)`);
  ok(Math.abs(r.fxLvl - r.dirLvl) < 1.5, `the same sound both ways: Direkt ${r.dirLvl} dB, Kette ${r.fxLvl} dB (hot drive and hall – the copy would have added them twice)`);
  ok(r.newFolgt && r.newOut === 1, `a new Schleife takes the strip's way (folgt ${r.newFolgt}, out ${r.newOut})`);
  ok(r.backBaked[0] && r.backBaked[1] && !r.backFolgt[0] && !r.backFolgt[1] && r.backTo, `„Direkt“: both burnt in again (${r.backBaked})`);
  ok(r.btn && r.kOn && r.kOn.folgt && r.kOn.lit === 'true' && !r.kOff.folgt && r.kOff.lit === 'false', `the Schleife's own switch K: ${JSON.stringify(r.kOn)} → ${JSON.stringify(r.kOff)}`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
