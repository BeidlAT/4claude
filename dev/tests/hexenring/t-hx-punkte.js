// Hexenring – the owner's six points of 30.10.2026 (screenshots):
//  1 „Instrument beim Preset-Wechsel“ from behalten to spielen with the same sound: the loop's version keeps its
//    signature – nothing is rendered anew (hxWSig hashes the sound a pass is rendered with)
//  2 the Ernte's „Verschieben“ offers Schlag and Ton beside the raster's step
//  3 the „Neue Schleife“ popover has a Raster row with Achtel and Triole; the raster takes a triplet unit
//  4 Duplizieren from the ring's menu: a copy on a free place with new keys and the same Schichten, ↶ takes it away
//  5 the editor's hint names the notes' tools („Noten-Werkzeuge: Krebs“), no „gewachsen“
//  6 the editor's head names the key: the one harvested in, and the field's when it differs
//                                                                                           node t-hx-punkte.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('ui.instrument', 'eigen'); M.setParam('t.root', 0); M.setParam('t.scale', 'mpent'); M.setParam('hx.ernte', true); M.setParam('hx.folgen', 'fest');
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 4.2) / 4) * 4, list = [];   // (two bars of play before the harvest: the Humus must hold more than the loop and a second)
    for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
    // (a few bars first: the Humus must hold more than the loop and a second for its whole Ernte)
    for (let t = A.ctx.currentTime + 0.2, i = 0; t < M.tgTime(B0) - 0.05; t += beat / 2, i++) list.push([t, [0, 2, 4, 2][i % 4], 0.7, 0.3]);
    window.__play(list, { eng: 'glo' });
    await window.__until(M.tgTime(B0 + 4) + 0.04);
    M.hxKorb(null); await sl(800);
    const L = M.hxLoopsLive()[0]; o.n = M.hxLoopsLive().length;
    for (let i = 0; i < 150 && !L.hum; i++) await sl(100);
    // 1 · the switch with the same sound: the signature stays, no render
    { const S = M.HX.sch.get(L.sch[0]); const sig0 = M.hxWSig(L, S); M.setParam('ui.instrument', 'preset'); await sl(300); const sig1 = M.hxWSig(L, S);
      o.sigSame = sig0 === sig1; o.busy = !!S.wBusy; M.setParam('ui.instrument', 'eigen'); await sl(300); }
    // 2 · Verschieben: Schlag and Ton
    M.hxEdOpen(L); await sl(1200); o.hum = !!L.hum;
    { const rows = [...document.querySelectorAll('.hx-ed-hrow')], v = rows.find((x) => x.textContent.startsWith('Verschieben')); o.versch = v ? [...v.querySelectorAll('button')].map((b) => b.textContent).join(' | ') : '(keine Zeile)'; }
    // 5 · the hint
    M.hxNtSet(L, 'krebs'); await sl(400);
    { M.HXE.sel = { a: 0, b: 0.5 }; M.hxEdRender(); await sl(300); const st = document.querySelector('.hx-ed-part'); o.hint = st ? st.textContent.slice(0, 200) : ''; M.HXE.sel = null; M.hxEdRender(); await sl(200); }   // (the hint stands by the stretch tools – the whole loop's rows are switches now)
    M.hxNtSet(L, 'krebs'); await sl(300);   // (off again)
    // 6 · the head's key
    { const meta = () => (document.querySelector('.hx-ed-h .meta') || {}).textContent || ''; o.key0 = meta(); M.setParam('t.root', 7); M.setParam('t.scale', 'dpent'); await sl(900); o.key1 = meta(); M.setParam('t.root', 0); M.setParam('t.scale', 'mpent'); await sl(600); }
    M.hxEdClose();
    // 3 · the popover's Raster row; a triplet unit
    { M.hxLenOpen(true); await sl(200); const pop = M.HXU.lenPop, row = pop && [...pop.querySelectorAll('.hx-lrw')].find((x) => x.textContent.startsWith('Raster')); o.raster = row ? [...row.querySelectorAll('.chip')].map((b) => b.textContent).join(' ') : '(keine Zeile)'; M.hxLenOpen(false);
      o.tri = M.HX_RASTER.triole; }
    // 4 · Duplizieren
    { const n0 = M.hxLoopsLive().length; const X = M.hxDuplicate(L); await sl(600);
      o.dup = { n: M.hxLoopsLive().length, keyNew: !!X && X.key !== L.key, sch: X ? X.sch.length : 0, schKeys: X ? X.sch.every((id) => !L.sch.includes(id)) : false, beats: X ? X.d.beats === L.d.beats : false, state: X ? X.state : '', hist: M.HX.hist[M.HX.hist.length - 1].label };
      M.hxUndoStep(); await sl(400); o.dupUndo = M.hxLoopsLive().length === n0; }
    M.hxStille();
    return o;
  }, BPM);
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.sigSame && !r.busy, `1 · behalten → spielen with the same sound: the signature stays (${r.sigSame}), nothing renders (${!r.busy})`);
  ok(r.hum && /◀ Schlag/.test(r.versch) && /Schlag ▶/.test(r.versch) && /◀ Ton/.test(r.versch) && /Ton ▶/.test(r.versch) && /wie geerntet/.test(r.versch), `2 · Verschieben: ${r.versch}`);
  ok(/⅛/.test(r.raster) && /Triole/.test(r.raster) && Math.abs(r.tri - 1 / 3) < 1e-9, `3 · „Neue Schleife“ has the Raster row (${r.raster}); the triplet unit is ⅓ beat`);
  ok(r.dup.n === 2 && r.dup.keyNew && r.dup.sch === 1 && r.dup.schKeys && r.dup.beats && r.dup.state === 'spielt' && /dupliziert/.test(r.dup.hist) && r.dupUndo, `4 · Duplizieren: ${JSON.stringify(r.dup)}; ↶ takes it away (${r.dupUndo})`);
  ok(/Noten-Werkzeuge: Krebs/.test(r.hint) && !/gewachsen/.test(r.hint), `5 · the hint: „${r.hint.slice(0, 90)}…“`);
  ok(/· C Moll-Pentatonik ·/.test(r.key0) && /C Moll-Pentatonik \(geerntet; Feld jetzt G Dur-Pentatonik\)/.test(r.key1), `6 · the head: „${r.key0}“ → „${r.key1}“`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
