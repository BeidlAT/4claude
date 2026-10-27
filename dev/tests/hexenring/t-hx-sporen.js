// (owner, 27.10.2026: „die erste Schleife wird optisch nicht richtig dargestellt – sie scheint leer, hat aber Inhalt“)
// a Schleife's ring shows its notes after every change: harvested, trimmed, its window moved in the Ernte, back
// „wie geerntet“, as a Kreis loaded, after a reload.                                              node t-hx-sporen.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(90); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 90, [0, 4, 7, 4, 2, 5, 9, 5], 3, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 24) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0], n = () => (M.hxLoopsLive()[0] || {}).notes ? M.hxLoopsLive()[0].notes.length : -1;
    for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).aud); i++) await sl(100);
    for (let i = 0; i < 100 && !L.hum; i++) await sl(100);
    await sl(1500); o.harvest = n();
    M.hxBandTrimTo(L, 0.5, 0.5); await sl(1500); o.trim = n();
    const S = M.HX.sch.get(L.sch[0]), W = M.hxHumWin(L, S), barF = Math.round(S.len / L.d.beats * 4);
    o.win = !!W;
    if (W) { M.hxHumApply(L, W.w0 - barF, W.w1 - barF, 'test'); await sl(2500); }
    o.moved = n();
    M.hxHumReset(L); await sl(2500); o.reset = n();
    M.hxKrSave('Sporen'); for (let i = 0; i < 100 && M.HXKR.busy; i++) await sl(100);
    const list = await M.hxKrList(); await M.hxKrLoad(list[0].id, 'neu'); await sl(2500); o.kreis = n();
    for (const k of list) M.hxKrDel(k.id, true);
    return o;
  });
  console.log(JSON.stringify(r));
  for (const k of ['harvest', 'trim', 'moved', 'reset', 'kreis']) ok(r[k] > 0, `${k}: its ring shows ${r[k]} notes`);
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart').catch(() => {}); await page.waitForTimeout(5000);
  const rl = await page.evaluate(() => window.__M.hxLoopsLive().map((L) => L.notes.length));
  ok(rl.length && rl.every((x) => x > 0), `after a reload: ${rl.join(', ')} notes`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
