// (owner, 26./27.10.2026: „der Sound der Schleife ändert sich, wenn man das Preset wechselt – endgültig beheben“) a
// Schleife keeps its sound whatever the field does: none plays through the live chain (out 1) unless „folgt der
// Effektkette“ – fresh, after a window moved in the Ernte, as a Kreis loaded, after a reload; its audio at the ring's
// output the same before and after a preset with another chain.                                   node t-hx-eigen.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const st = () => page.evaluate(() => window.__M.hxLoopsLive().map((L) => L.sch.map((id) => { const S = window.__M.HX.sch.get(id); return (S.out ? 'live' : 'eigen') + (S.baked ? '/b' : '') + (S.chain ? '' : '/nochain'); }).join('+')));
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(90); await sl(300);
    M.setParam('cho.mix', 0.6); M.setParam('drv.mix', 0.5); M.setParam('flt.freq', 1500); M.setParam('pha.mix', 0.4);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 90, [0, 4, 7, 4], 2, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).baked); i++) await sl(100);
    await sl(2500);
    const outs = (X) => (X || M.hxLoopsLive()).flatMap((L) => L.sch.map((id) => { const S = M.HX.sch.get(id); return [S.out, !!S.baked]; }));
    const settle = async () => { for (let i = 0; i < 150 && M.hxLoopsLive().some((L) => L.sch.some((id) => { const S = M.HX.sch.get(id); return S.chain && !S.baked; })); i++) await sl(100); await sl(2500); };
    o.fresh = outs([L]);
    // trimmed to its second half
    M.hxBandTrimTo(L, 0.5, 0.5); await settle(); o.trim = outs([L]);
    // the window moved a bar later in the Ernte
    const S = M.HX.sch.get(L.sch[0]), W = M.hxHumWin(L, S), barF = Math.round(S.len / L.d.beats * 4);
    if (W) { M.hxHumApply(L, W.w0 - barF, W.w1 - barF, 'test'); await settle(); }
    o.moved = outs([L]);
    // an old window: the chain's record no longer reaches it (stale)
    const S2 = M.HX.sch.get(L.sch[0]); S2.cut = Object.assign({}, S2.cut, { stale: true }); S2.baked = false; S2.bak = null;
    await M.hxAfterFill(S2); await sl(2500); o.stale = outs([L]);
    // a Kreis kept and loaded
    M.hxKrSave('Eigen'); for (let i = 0; i < 100 && M.HXKR.busy; i++) await sl(100);
    const list = await M.hxKrList(); await M.hxKrLoad(list[0].id, 'neu'); await settle(); o.kreis = outs();
    for (const k of list) M.hxKrDel(k.id, true);
    return o;
  });
  console.log(JSON.stringify(r), await st());
  for (const k of ['fresh', 'trim', 'moved', 'stale', 'kreis']) ok(r[k].length && r[k].every((x) => x[0] === 0), `${k}: its own chain, not the live one (${JSON.stringify(r[k])})`);
  // after a reload
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart').catch(() => {}); await page.waitForTimeout(6000);
  const rl = await page.evaluate(() => window.__M.hxLoopsLive().flatMap((L) => L.sch.map((id) => { const S = window.__M.HX.sch.get(id); return [S.out, !!S.baked]; })));
  ok(rl.length && rl.every((x) => x[0] === 0), `after a reload: its own chain (${JSON.stringify(rl)})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
