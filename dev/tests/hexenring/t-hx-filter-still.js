// Hexenring – Effekte stellen rechnet keine Schleife neu (owner, 31.10.2026: „immer noch der Fehler, dass Schleifen neu
// berechnet werden, obwohl ich z. B. nur den Filter einstelle“): with „Schleifen spielen mit dem Instrument des Presets“
// and a Schleife in the Leiste –
//  1 the insert effects (Filter, Verzerrung, Ring, Phaser, Chorus), the sends and the Bordun are no part of the loop's
//    sound signature: turned, no render starts (they act on it live, through its way in the mixer)
//  2 nor do a knob of the instrument or the Klangquelle (owner, 31.10.2026) – only a preset loaded gives them its sound
//                                                                                     node t-hx-filter-still.js
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
    for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(800);
    M.setParam('ui.instrument', 'preset');
    const busy = () => M.hxLoopsLive().some((L) => L.sch.some((id) => { const S = M.HX.sch.get(id); return S && (S.wBusy || S.wAgain); }));
    for (let i = 0; i < 400 && (busy() || M.HX.wFeld); i++) await sl(100);   // (switching the instrument over may render once)
    o.n = M.hxLoopsLive().length; o.calm = !busy() && !M.HX.wFeld;
    const ids = ['flt.freq', 'flt.q', 'drv.amt', 'drv.mix', 'rng.mix', 'pha.mix', 'cho.mix', 'rev.mix', 'dly.mix', 'bor.lvl', 'drv.farbe'];
    o.inSig = ids.filter((id) => M.PD[id] && M.hxWPIn(id));
    let seen = false; const watch = setInterval(() => { if (busy() || M.HX.wFeld) seen = true; }, 20);
    for (const id of ids) { const d = M.PD[id]; if (!d || d.kind !== 'num') continue; M.setParam(id, d.min + (d.max - d.min) * 0.37); await sl(120); }
    await sl(2500); clearInterval(watch); o.fx = seen;
    // (owner, 31.10.2026: „wenn ich die Klangquelle ändere, ändern sich auch die Schleifen – das soll weg; nur beim
    // Preset-Wechsel mit der Option“) a knob of the instrument, the Klangquelle itself: no render either
    const own = Object.keys(M.PD).find((id) => /^v\./.test(id) && M.PD[id].kind === 'num' && M.hxWPIn(id));
    o.own = own; seen = false; const w2 = setInterval(() => { if (busy() || M.HX.wFeld) seen = true; }, 20);
    M.setParam(own, M.PD[own].min + (M.PD[own].max - M.PD[own].min) * 0.61); await sl(300);
    M.setParam('v.eng', M.P['v.eng'] === 'mem' ? 'glas' : 'mem'); await sl(3000); clearInterval(w2); o.knob = seen;
    // a preset loaded: they take it – as it was loaded
    const S = M.HX.sch.get(M.hxLoopsLive()[0].sch[0]), w0 = S.wu && S.wu.sig;
    M.loadPreset(M.PRESETS.find((p) => p.name === 'Tiefsee')); M.seqStop();
    let took = false; for (let i = 0; i < 400; i++) { await sl(100); if (!busy() && S.wu && S.wu.sig !== w0) { took = true; break; } }
    o.took = took;
    // and after it, a knob turned: they keep the preset's sound
    seen = false; const w3 = setInterval(() => { if (busy()) seen = true; }, 20);
    M.setParam('v.eng', 'glas'); await sl(3000); clearInterval(w3); o.after = seen;
    return o;
  }, BPM);
  ok(r.n >= 1 && r.calm, `a Schleife, calm, playing with the preset's instrument (${r.n})`);
  ok(!r.inSig.length && !r.fx, `Filter, Verzerrung, Ring, Phaser, Chorus, Hall, Echo, Bordun turned: no render (${r.inSig.join(',') || 'none in its signature'})`);
  ok(!r.knob, `a knob of the instrument (${r.own}) and the Klangquelle changed: no render`);
  ok(r.took, 'a preset loaded (Instrument beim Preset-Wechsel on): the loop takes its sound');
  ok(!r.after, 'after it the Klangquelle changed again: the loop keeps the preset\'s sound');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
