// (owner, 30.10.2026: „eine Übergabe der Schleifen darf man nicht merken … in Chrome muss es reibungslos gehen“) a
// version for the processor goes in portions: no message to the processor carries more than 8 chunks (16 buffers) –
// the version's chunks go ahead (stg), the replace names them; what comes back comes in portions of 8 too, joined on
// the page (the Vorrat gets all of it back). The loop sounds its new version after it.   node t-hx-portion.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); M.loadPreset(M.PRESET_LEER); window.__grid(60); await sl(500);   // (a sound of its own: the last run's preset is not the one loaded below)
    M.setParam('ui.instrument', 'preset'); M.setParam('ui.tonart', 'preset');
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4); M.setParam('v.eng', 'glo');
    const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
    window.__riff(t0, beat, [0, 2, 4, 7], 4, { eng: 'glo', dur: beat * 0.6 });
    await window.__until(t0 + 16 * beat + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
    const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    await sl(3000);
    const port = M.HX.node.port, post = port.postMessage.bind(port), out = [], back = [];
    port.postMessage = (m, tr) => { out.push([Object.keys(m).join(','), (tr || []).length]); return post(m, tr); };
    const lis = (e) => { const f = e.data && e.data.freed; if (f) back.push([f.part != null ? 'part' : f.pid != null ? 'joined' : 'whole', (f.chunks || []).length]); };   // (a listener hears it after the page joined it: a joined one counts by its portions)
    port.addEventListener('message', lis);
    const pr = { name: 'Anderes Instrument', v: Object.assign(M.patchValues(), { 'v.eng': 'mem', 'flt.freq': 1400, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false }) };
    M.loadPreset(pr);
    for (let i = 0; i < 300 && !(S.play === 'wu' && !S.wBusy && !S.wAgain); i++) await sl(100);
    await sl(20000);   // (the old version plays out and goes back)
    port.postMessage = post; port.removeEventListener('message', lis);
    o.play = S.play; o.n = S.wu ? Math.ceil(S.wu.n / 8192) : 0;
    o.maxOut = Math.max(0, ...out.map((x) => x[1])); o.stg = out.filter((x) => x[0] === 'stg').length; o.rep = out.filter((x) => /replace/.test(x[0])).length;
    o.maxBack = Math.max(0, ...back.filter((x) => x[0] !== 'joined').map((x) => x[1])); o.joined = back.filter((x) => x[0] === 'joined').length; o.parts = back.filter((x) => x[0] === 'part').length; o.backN = back.reduce((a, x) => a + x[1], 0);
    o.frP = M.HX.frP.size;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.play === 'wu' && r.rep >= 1 && r.stg >= Math.ceil(r.n / 8), `the new version went ahead in ${r.stg} portions (${r.n} chunks), then its replace (${r.play})`);
  ok(r.maxOut <= 16, `no message to the processor carried more than 8 chunks (at most ${r.maxOut} buffers)`);
  ok(r.parts >= 1 && r.joined >= 1 && r.maxBack <= 8 && r.frP === 0, `what came back came in portions of ≤ 8 chunks (${r.parts} parts, ${r.joined} joined, ${r.backN} chunks; a whole message at most ${r.maxBack}), all joined (${r.frP} open)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
