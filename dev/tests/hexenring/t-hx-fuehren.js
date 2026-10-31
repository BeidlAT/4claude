// Hexenring – Führen (owner, 31.10.2026: „das, was ich spiele, erklingt dann in der Schleife – aber ihre MIDI-Noten bleiben
// als Basis“; „alle vier Optionen in Myzel zum Einstellen“): a Schleife of four Glocken notes, led from the field –
//  1 Tonhöhe: a note held two steps above its first note – its first note sounds as the one held, all move with it; the
//    field's own note is silent (Spielfeld stumm); let go: as it was
//  2 Auslösen: no hand – silent; a hand – it sounds
//  3 Klang & Ausdruck: its notes with the field's instrument and the hand's Höhe
//  4 aus: it plays for itself again; the editor's row shows the five choices
//                                                                                        node t-hx-fuehren.js
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
    const ref = S.wn.n.reduce((a, x) => (x.t < a.t ? x : a), S.wn.n[0]).f, ri = M.hxFuIdx(ref);
    M.hxEdOpen(L); await sl(300);
    o.chips = [...document.querySelectorAll('.hx-ed-furow .chip')].map((b) => b.textContent);
    const log = (t0) => M.HX.fuLog.filter((x) => x.t >= t0);
    const pass = () => 4 * beat + 0.4;
    const press = (idx, y) => { let x = 0; for (let k = 0; k <= 1000; k++) { const n = M.noteAt(k / 1000); if (n.idx === idx) { x = k / 1000; break; } } M.onDown({ pointerId: 77, pt: { x, y, px: 0, py: 0 }, note: M.noteAt(x) }); return M.touches.get(77); };
    // 1 Tonhöhe
    [...document.querySelectorAll('.hx-ed-furow .chip')].find((b) => b.textContent === 'Tonhöhe').click(); await sl(pass() * 1000 + 300);
    let t = A.ctx.currentTime; await sl(pass() * 1000); o.free = log(t).map((x) => +(x.f / x.nf).toFixed(3));
    const tt = press(ri + 2, 0.5); o.silent = !!tt.fu && tt.voices.length === 0; o.held = tt.f;
    await sl(300); t = A.ctx.currentTime + 0.2; await sl(pass() * 1000); const lg = log(t);
    o.firstAs = lg.filter((x) => Math.abs(x.nf / ref - 1) < 0.01).map((x) => +(x.f / tt.f).toFixed(3));
    o.moved = lg.map((x) => +(x.f / x.nf).toFixed(3));
    await sl(pass() * 1000); const K1 = L.wwhy && L.wwhy.fuKeep; o.keep1 = K1 ? K1.wn.n.map((x) => +(x.f / tt.f).toFixed(3)) : null;
    M.onUp({ pointerId: 77 }); await sl(300); t = A.ctx.currentTime + 0.2; await sl(pass() * 1000); o.back = log(t).map((x) => +(x.f / x.nf).toFixed(3));
    // 2 Auslösen
    M.hxFuSet(L, 'ausl'); t = A.ctx.currentTime + 0.2; await sl(pass() * 1000); o.noHand = log(t).length;
    press(ri, 0.5); await sl(200); t = A.ctx.currentTime + 0.2; await sl(pass() * 1000); o.hand = log(t).length; M.onUp({ pointerId: 77 });
    // 3 Klang & Ausdruck
    M.setParam('v.eng', 'mem'); M.hxFuSet(L, 'klang'); press(ri, 0.85); await sl(200); t = A.ctx.currentTime + 0.2; await sl(pass() * 1000);
    const lk = log(t); o.kEng = [...new Set(lk.map((x) => x.eng))]; o.kY = [...new Set(lk.map((x) => +x.y.toFixed(2)))]; o.kTt = +(M.touches.get(77).my ?? M.touches.get(77).y).toFixed(2); await sl(pass() * 1000); M.onUp({ pointerId: 77 });   // (a whole pass under the hand)
    // 4 aus
    [...document.querySelectorAll('.hx-ed-furow .chip')].find((b) => b.textContent === 'aus').click(); await sl(pass() * 1000 + 300);
    t = A.ctx.currentTime; await sl(pass() * 1000); o.off = log(t).length; o.offL = L.fuehr; o.lm = !!S.lm;
    // what was led stays: its notes are the loop's now (stored with it), ↶ gives the old ones back
    o.kept = { eng: [...new Set(S.wn.n.map((x) => x.eng))], y: [...new Set(S.wn.n.map((x) => +x.y0.toFixed(2)))], n: S.wn.n.length, keepGone: !(L.wwhy && L.wwhy.fuKeep), wahl: !!L.wwhy.wahl, hist: M.HX.hist[M.HX.hist.length - 1].label };
    const KW = S.wn; M.hxUndoStep(); await sl(300); o.undoEng = [...new Set(S.wn.n.map((x) => x.eng))];
    // a reload while it was led: the kept pass comes in by itself at the next start
    L.wwhy = Object.assign({}, L.wwhy, { fuKeep: { sk: S.key, wn: KW } }); L.fuehr = null; await sl(400);
    o.reload = [...new Set(S.wn.n.map((x) => x.eng))]; o.reloadGone = !L.wwhy.fuKeep;
    return o;
  }, BPM);
  ok(r.chips.join('|').startsWith('aus|Tonhöhe|Klang & Ausdruck|Auslösen|Tonhöhe + Ausdruck'), `the editor: Führen ${r.chips.join(' · ')}`);
  ok(r.free.length >= 4 && r.free.every((x) => x === 1), `Tonhöhe, no hand: it plays as it was, note by note live (${r.free})`);
  ok(r.silent, 'the field\'s own note is silent – it sounds in the Schleife');
  ok(r.firstAs.length && r.firstAs.every((x) => Math.abs(x - 1) < 0.01) && r.moved.some((x) => x > 1.05), `a note held two steps up: its first note sounds as it (${r.firstAs}), all moved (${r.moved})`);
  ok(r.back.length >= 4 && r.back.every((x) => x === 1), `let go: as it was (${r.back})`);
  ok(r.noHand === 0 && r.hand >= 4, `Auslösen: silent without a hand (${r.noHand}), sounding with one (${r.hand})`);
  ok(r.kEng.length === 1 && r.kEng[0] === 'mem' && r.kY.length === 1 && Math.abs(r.kY[0] - r.kTt) < 0.02, `Klang & Ausdruck: the field's instrument (${r.kEng}) and the hand's Höhe (${r.kY} = ${r.kTt})`);
  ok(r.off === 0 && !r.offL && !r.lm, `aus: it plays for itself again (${r.off} led notes)`);
  ok(r.keep1 && r.keep1[0] === 1, `a whole pass led: kept with the loop at once, as heard (first note = the hand's: ${r.keep1 && r.keep1.join(',')})`);
  ok(r.kept.eng.join() === 'mem' && r.kept.y.join() === '0.85' && r.kept.keepGone && r.kept.wahl && /Geführt übernommen/.test(r.kept.hist), `aus: the last pass led is the loop's now (${r.kept.n} notes, ${r.kept.eng}, Höhe ${r.kept.y}; „${r.kept.hist}“)`);
  ok(r.undoEng.join() === 'glo', `↶: its own notes again (${r.undoEng})`);
  ok(r.reload.join() === 'mem' && r.reloadGone, 'a reload while it was led: what was led comes in by itself');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
