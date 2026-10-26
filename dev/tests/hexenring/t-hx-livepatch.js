// (owner, 26.10.2026, iPad: „der Klang der Schleife ändert sich mit dem gewählten Preset“) a Schleife whose notes play
// through real voices (Live – chosen, or without a Werk-Rahmen) keeps its own sound: after a preset with other settings
// of the same source its voices start with the settings it was recorded with.                    node t-hx-livepatch.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(88); await sl(300);
    M.setParam('hng.glanz', 0.1); M.setParam('hng.nachklang', 0.3);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 88, [0, 4, 7, 4], 1, { eng: 'hng', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null); await sl(400);
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 100 && !L.sch.every((id) => M.HX.sch.get(id).aud); i++) await sl(100);
    // its voices' settings at their start
    const E = M.ENGINES.hng, st = E.start, seen = [];
    E.start = function (v, ...a) { if (v.loop) seen.push([M.P['hng.glanz'], M.P['hng.nachklang']]); return st.call(this, v, ...a); };
    M.hxWSet(L, 'live', true); await sl(300);
    M.loadPreset({ name: 'Anders', v: Object.assign(M.patchValues(), { 'hng.glanz': 0.9, 'hng.nachklang': 0.9 }) });
    await sl(6000);
    E.start = st;
    o.seen = seen; o.now = [M.P['hng.glanz'], M.P['hng.nachklang']];
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.seen.length >= 4 && r.seen.every((x) => x[0] === 0.1 && x[1] === 0.3), `its live voices start with its own settings (${r.seen.length} notes, Glanz/Nachklang ${JSON.stringify(r.seen[0])})`);
  ok(r.now[0] === 0.9 && r.now[1] === 0.9, `the field keeps the preset's (${r.now})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
