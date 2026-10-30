// (owner, 30.10.2026: „2 Schleifen mit aktiviertem Arp aufgenommen – wenn ich den Arp deaktiviere, wird fälschlicherweise
// der Klang der Schleifen neu berechnet … keine Neuberechnung der Schleifen, nur weil das Sporenwerk an- oder ausgeht“)
// ui.instrument / ui.tonart „preset“, two loops played with the Sporenwerk on: switching it off and on again (and its
// other knobs) starts no Treu render; a real sound change still does.   node t-hx-arpklang.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); M.loadPreset(M.PRESET_LEER); window.__grid(100); await sl(400);
    M.setParam('ui.instrument', 'preset'); M.setParam('ui.tonart', 'preset'); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    M.setParam('arp.on', true); await sl(200);
    const beat = 60 / M.tgBpm(A.ctx.currentTime);
    for (const degs of [[0, 2, 4, 7], [4, 2, 0, 2]]) {
      const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat, degs, 1, { eng: M.P['v.eng'], dur: beat * 0.6 });
      await window.__until(t0 + 4 * beat + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    }
    await sl(3000);
    // count Treu renders from here (HX.wRen goes up when one starts)
    let n = 0; const w0 = M.HX.wSt.n; const busy = () => M.hxLoopsLive().some((L) => L.sch.some((id) => { const S = M.HX.sch.get(id); return S && (S.wBusy || S.wAgain); }));
    const watch = setInterval(() => { if (busy()) n++; }, 20);
    M.setParam('arp.on', false); await sl(2500); o.off = { n, jobs: M.HX.wSt.n - w0 };
    M.setParam('arp.on', true); await sl(2500); o.on = { n, jobs: M.HX.wSt.n - w0 };
    for (const id of ['arp.form', 'arp.rate', 'arp.okt', 'arp.gate']) if (M.PD[id]) { const d = M.PD[id]; M.setParam(id, d.kind === 'sel' ? d.opts[d.opts.length - 1][0] : d.max); }
    await sl(2500); o.knobs = { n, jobs: M.HX.wSt.n - w0 };
    clearInterval(watch);
    // a real change of the field's sound: the loops follow
    let m = 0; const w1 = M.HX.wSt.n; const watch2 = setInterval(() => { if (busy()) m++; }, 20);
    M.setParam('v.eng', M.P['v.eng'] === 'glo' ? 'klb' : 'glo'); await sl(4000); clearInterval(watch2);
    o.sound = { m, jobs: M.HX.wSt.n - w1 };
    M.setParam('arp.on', false);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.off.n === 0 && r.off.jobs === 0, `Sporenwerk off: no render (${JSON.stringify(r.off)})`);
  ok(r.on.n === 0 && r.on.jobs === 0, `on again: no render (${JSON.stringify(r.on)})`);
  ok(r.knobs.n === 0 && r.knobs.jobs === 0, `its other knobs: no render (${JSON.stringify(r.knobs)})`);
  ok(r.sound.m > 0 || r.sound.jobs > 0, `a real sound change still makes the loops follow (${JSON.stringify(r.sound)})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
