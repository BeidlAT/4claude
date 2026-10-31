// Hexenring – Einspielen (owner, 31.10.2026: „wenn das aktiviert ist, kann ich am Spielfeld was spielen – Bildschirm oder
// MIDI – und das Gespielte wird in die Schleife transformiert“): a Schleife of four Glocken notes, Einspielen on, three notes
// played on the field with another instrument during one of its passes –
//  1 at the pass's end they are in its notes, at their places in the pass, in its own instrument (Glocke)
//  2 it plays anew with them (Wuchs, rendered); the editor's switch is lit, its channel says it
//  3 ↶ takes the pass back; a pass with nothing played changes nothing; off: the field's notes stay out
//                                                                                      node t-hx-einspielen.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const r = await page.evaluate(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 4; i++) list.push([M.tgTime(B0) + i * beat, [0, 2, 4, 2][i], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]); M.hxWNotesAll(L);
    for (let i = 0; i < 50 && !(S.wn && S.wn.n.length); i++) { await sl(100); M.hxWNotesAll(L); }
    o.n0 = S.wn.n.length; o.own = L.eng;
    M.hxEdOpen(L); await sl(300);
    document.querySelector('.hx-ed .hx-ein').click(); await sl(200);
    o.on = !!L.ein; o.lit = document.querySelector('.hx-ed .hx-ein').getAttribute('aria-pressed');
    // the next pass: three notes, on beats 0.5, 1.5 and 3 of it, with the Membran
    const kN = M.hxPassK(L, M.hxF(A.ctx.currentTime)) + 1, a = M.hxT(M.hxPassF(L, kN)), b = M.hxT(M.hxPassF(L, kN + 1));
    const pl = [[a + 0.5 * beat, 6, 0.6, 0.2], [a + 1.5 * beat, 7, 0.6, 0.2], [a + 3 * beat, 5, 0.6, 0.2]];
    window.__play(pl, { eng: 'mem' }); await window.__until(b + 0.4);
    o.n1 = S.wn.n.length; const neu = S.wn.n.filter((x) => x.ein);
    o.t = neu.map((x) => +x.t.toFixed(2)); o.eng = [...new Set(neu.map((x) => x.eng))]; o.wahl = !!(L.wwhy && L.wwhy.wahl);
    o.hist = M.HX.hist.length ? M.HX.hist[M.HX.hist.length - 1].label : '';
    const w0 = S.wu && S.wu.sig; let ren = false; for (let i = 0; i < 400; i++) { await sl(100); if (!S.wBusy && !S.wAgain && S.wu && S.wu.aud) { ren = true; break; } }
    o.ren = ren; o.play = S.play;
    o.chan = [...document.querySelectorAll('*')].some((e) => !e.children.length && /Einspielen/.test(e.textContent) && /spielt/.test(e.textContent));
    // a pass with nothing played
    const kE = M.hxPassK(L, M.hxF(A.ctx.currentTime)) + 1; await window.__until(M.hxT(M.hxPassF(L, kE + 1)) + 0.4); o.n2 = S.wn.n.length;
    M.hxUndoStep(); await sl(300); o.undo = S.wn.n.length;
    // off: played notes stay out
    document.querySelector('.hx-ed .hx-ein').click(); await sl(200); o.off = !L.ein;
    const kF = M.hxPassK(L, M.hxF(A.ctx.currentTime)) + 1, aF = M.hxT(M.hxPassF(L, kF));
    window.__play([[aF + 0.5 * beat, 6, 0.6, 0.2]], { eng: 'mem' }); await window.__until(M.hxT(M.hxPassF(L, kF + 1)) + 0.4); o.n3 = S.wn.n.length;
    return o;
  }, BPM);
  ok(r.n0 === 4 && r.on && r.lit === 'true', `a Schleife of ${r.n0} notes; ● Einspielen lit`);
  ok(r.n1 === 7 && JSON.stringify(r.t) === '[0.5,1.5,3]' && r.eng.length === 1 && r.eng[0] === r.own, `three notes played: in its notes at their places (${r.t}), in its own instrument (${r.eng} = ${r.own})`);
  ok(r.wahl && r.ren && r.hist.indexOf('eingespielt') >= 0, `it plays anew with them (Wuchs, rendered, ${r.play}); ↶ says „${r.hist}“`);
  ok(r.chan, 'its channel says „Einspielen“');
  ok(r.n2 === 7, `a pass with nothing played: nothing changes (${r.n2})`);
  ok(r.undo === 4, `↶: the notes it had (${r.undo})`);
  ok(r.off && r.n3 === 4, `off: what the field plays stays out (${r.n3})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
