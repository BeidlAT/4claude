// Hexenring – Original und sofort hören (owner, 31.10.2026: „sind diese langen Wartezeiten unvermeidlich?“ und „wenn ich
// mich in den Schleifen-Einstellungen zu viel spiele, komme ich nicht mehr auf den Original-Zustand zurück“):
//  1 another instrument chosen for a long Schleife (8 s a pass): heard within ~1 s of the render, not at the next seam
//  2 played with a lot – an instrument, Klang verwandeln, Band rückwärts, a pass led and kept – „Original“: all of it back
//    as harvested (its notes, its own sound, Abdruck, no Klangfarbe), one step; ↶ brings all of it back
//                                                                                        node t-hx-original.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const r = await page.evaluate(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 16; i++) list.push([M.tgTime(B0) + i * beat, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 16) + 0.04); M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]); M.hxWNotesAll(L);
    for (let i = 0; i < 300 && !(S.aud && (S.baked || !S.chain) && S.wn); i++) { await sl(100); M.hxWNotesAll(L); }
    o.len = +M.hxLen(L).toFixed(1); const wn0 = S.wn;
    M.hxEdOpen(L); await sl(300);
    // 1 an instrument: from the render's end to the swap
    const sel = document.querySelector('.hx-ed-instrow select'); sel.value = 'hau'; sel.dispatchEvent(new Event('change'));
    let tR = null; for (let i = 0; i < 600; i++) { await sl(50); if (!S.wBusy && S.wu && S.wu.aud) { tR = A.ctx.currentTime; break; } }
    o.swapIn = S.swapF != null ? +(M.hxT(S.swapF) - tR).toFixed(2) : null; o.play = S.play;
    // 2 a lot more
    await M.hxRxLayer(L, { pitch: -3, ct: 4, verw: null, farb: 'licht' }); await sl(300);
    M.hxRev(L); await sl(300);
    const K = { sk: S.key, wn: Object.assign({}, S.wn, { n: S.wn.n.map((x) => Object.assign({}, x, { f: x.f * 1.5, eng: 'mem' })) }) };
    L.wwhy = Object.assign({}, L.wwhy, { fuKeep: K }); await sl(400);   // (a pass led and kept – laid in by the tick)
    o.before = { klang: L.klang, rx: M.hxRxOn(M.hxRxOf(L)), rev: !!L.rev, eng: S.wn.n[0].eng, wahl: !!L.wwhy.wahl };
    const h0 = M.HX.hist.length;
    [...document.querySelectorAll('.hx-ed-hb .btn')].find((x) => x.textContent === 'Original').click();
    for (let i = 0; i < 100 && L.rxBusy; i++) await sl(50); await sl(600);
    o.after = { klang: L.klang || 'eigen', rx: M.hxRxOn(M.hxRxOf(L)), rev: !!L.rev, wn: S.wn === wn0, wahl: !!(L.wwhy && L.wwhy.wahl), aktiv: M.hxWAktiv(L), steps: M.HX.hist.length - h0, last: M.HX.hist[M.HX.hist.length - 1].label };
    M.hxUndoStep(); for (let i = 0; i < 100 && L.rxBusy; i++) await sl(50); await sl(600);
    o.undo = { klang: L.klang, rx: M.hxRxOn(M.hxRxOf(L)), rev: !!L.rev, eng: S.wn.n[0].eng };
    return o;
  }, BPM);
  ok(r.swapIn != null && r.swapIn < 1 && r.swapIn < r.len / 2, `an instrument chosen in a ${r.len} s Schleife: heard ${r.swapIn} s after its render (no wait for the seam)`);
  ok(r.before.klang === 'eigen' && r.before.rx && r.before.rev && r.before.eng === 'mem' && r.before.wahl, `played with a lot: a pass led and laid in, Klangfarbe, rückwärts (${JSON.stringify(r.before)})`);
  ok(r.after.klang === 'eigen' && !r.after.rx && !r.after.rev && r.after.wn && !r.after.wahl && !r.after.aktiv && r.after.steps === 1 && /Original/.test(r.after.last), `Original: all of it back as harvested, one step (${JSON.stringify(r.after)})`);
  ok(r.undo.rx && r.undo.rev && r.undo.eng === 'mem', `↶: all of it again (${JSON.stringify(r.undo)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
