// (owner, 28.10.2026) the Werkstatt for „die ganze Leiste“: every loop grows its creations, a choice plays them all, Ja keeps
// a Trieb in each, Original brings all back.   node t-hx-werkstatt-leiste.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    await window.__reset(); window.__grid(120); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('hx.ws.anzahl', '5'); M.setParam('hx.ws.umfang', 'leiste'); M.setParam('hx.ws.klang', false); M.setParam('hx.ws.effekte', false); await sl(500);
    for (const degs of [[0, 2, 4, 7], [7, 4, 2, 0]]) {
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat, degs, 1, { eng: 'klb', dur: beat * 0.6 }); await window.__until(t0 + 4 * beat + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    }
    const [A1, B1] = M.hxLoopsLive();
    await M.hxWsGrow(A1);
    const o = { a: A1.krea.list.filter((x) => x.V).length, b: B1.krea ? B1.krea.list.filter((x) => x.V).length : 0 };
    M.hxWsPlay(A1, 2); await sl(2600);
    o.sel = [A1.krea.sel, B1.krea.sel].join(','); o.play = [A1, B1].map((L) => M.HX.sch.get(L.sch[0]).play).join(',');
    M.hxWsJa(A1); o.tr = [A1.krea.triebe.length, B1.krea.triebe.length].join(',');
    M.hxWsPlay(A1, null); await sl(2600); o.back = [A1, B1].map((L) => M.HX.sch.get(L.sch[0]).play + '/' + L.krea.sel).join(',');
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.a === 5 && r.b === 5, 'both loops grew their 5 creations');
  ok(r.sel === '2,2' && r.play === 'krea,krea', 'a creation chosen: both play it');
  ok(r.tr === '1,1', '„Ja“: a Trieb in each');
  ok(r.back === 'ab/null,ab/null', 'Original: both back');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
