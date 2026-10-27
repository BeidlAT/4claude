// (owner, 27.10.2026, screenshot: Schleife 2 – Obertöne, 17 Schläge, getrimmt – „spielt“, but no level in the mixer; it
// sounds only from the editor's „Abspielen“, not from the Leiste) a Schleife trimmed and its window changed by a beat
// (an odd length) sounds from the Leiste, its strip shows its level.                             node t-hx-trimspiel.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = { steps: [] };
    await window.__reset(); window.__grid(88); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 88, [0, 4, 7, 4], 4, { eng: 'obt', dur: 0.6 }); await window.__until(M.tgTime(B0 + 16) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).aud); i++) await sl(100);
    for (let i = 0; i < 100 && !L.hum; i++) await sl(100);
    await sl(1500);
    const lv = async () => { let mx = 0; for (let i = 0; i < 40; i++) { const m = (M.HX.meter || []).find((x) => x[0] === L.id); if (m) mx = Math.max(mx, m[1]); await sl(60); } return +mx.toFixed(4); };
    const step = async (name) => { await sl(2500); o.steps.push([name, L.state, L.d.beats, await lv(), M.HX.sch.get(L.sch[0]).out]); };
    await step('geerntet');
    M.hxBandTrimTo(L, 0.5, 0.5); await step('getrimmt');
    const S = M.HX.sch.get(L.sch[0]), W = M.hxHumWin(L, S), beatF = Math.round(S.len / L.d.beats);
    M.hxHumApply(L, W.w0 - beatF, W.w1, 'Anfang −1 Schlag'); await step('17 Schläge');
    // stop it, play it from the Leiste
    M.hxState(L.id, 'angehalten'); await step('angehalten');
    M.hxState(L.id, 'spielt'); await sl(6000); await step('aus der Leiste');
    // the editor listens to it (its „Abspielen“): the loop stands aside, its strip shows what is heard; started from the
    // Leiste, the listening ends and the Schleife itself sounds
    M.hxEdOpen(L); await sl(1500); M.hxPvToggle(); for (let i = 0; i < 50 && !M.HXE.pv; i++) await sl(100); await sl(800);
    o.pv = { mute: !!L.pvMute, an: !!(M.HXE.pv && M.HXE.pv.out.an), lv: M.HXE.pv && M.HXE.pv.out.an ? +M.hxmPvLv(M.HXE.pv.out.an, L.id)[1].toFixed(4) : 0 };
    M.hxState(L.id, 'stumm'); await sl(300); M.hxState(L.id, 'spielt'); await sl(500);
    o.after = { pv: !!M.HXE.pv, mute: !!L.pvMute };
    await step('Leiste während Vorhören');
    M.hxEdClose();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.pv.mute && r.pv.an && r.pv.lv > 0.002, `the editor listens: the loop stands aside, the strip shows the listening's level (${r.pv.lv})`);
  ok(!r.after.pv && !r.after.mute, 'started from the Leiste: the listening ends, the loop is no longer held silent');
  for (const s of r.steps) ok(s[0] === 'angehalten' ? s[3] < 0.002 : s[3] > 0.002, `${s[0]}: ${s[1]}, ${s[2]} Schläge, level ${s[3]}`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
