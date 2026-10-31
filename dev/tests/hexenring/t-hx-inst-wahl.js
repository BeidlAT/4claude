// Hexenring – Bearbeiten aus dem Mixer, Instrument je Schleife (owner, 31.10.2026: „wenn man eine Schleife im Mixer anklickt,
// kommt das Bearbeiten-Fenster abgeschnitten – mach es so, wie es sonst erscheint“ und „einzelnen Schleifen ein Instrument
// zuweisen – der Sound ist dann der vom gewählten Instrument“):
//  1 with the Mixer open the field is narrow: the editor reaches over the panel, as wide as over a free field
//  2 its Instrument row: another source chosen – the loop plays anew with it (rendered), its name in the editor and on its
//    channel; „wie aufgenommen“ brings its own back; ↶ undoes
//                                                                                        node t-hx-inst-wahl.js
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
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]);
    M.openPanel('mix'); await sl(700);
    const st = document.getElementById('stage').getBoundingClientRect();
    M.hxEdOpen(L); await sl(400);
    const ed = document.querySelector('.hx-ed'), eb = ed.getBoundingClientRect();
    o.stageW = Math.round(st.width); o.edW = Math.round(eb.width); o.edR = Math.round(eb.right); o.winW = innerWidth;
    o.row = !!ed.querySelector('.hx-ed-instrow select');
    o.own = L.eng; const pick = M.ENG_OPTS.map((x) => x[0]).find((k) => k !== L.eng && k === 'glas') || M.ENG_OPTS.map((x) => x[0]).find((k) => k !== L.eng);
    const sel = ed.querySelector('.hx-ed-instrow select'); sel.value = pick; sel.dispatchEvent(new Event('change')); o.pick = pick; o.pickName = M.ENG_OPTS.find((x) => x[0] === pick)[1];
    const w0 = S.wu && S.wu.sig; let done = false;
    for (let i = 0; i < 600; i++) { await sl(100); if (!S.wBusy && !S.wAgain && S.wu && S.wu.sig !== w0) { done = true; break; } }
    o.rendered = done; o.klang = L.klang; await sl(600);
    o.meta = (document.querySelector('.hx-ed .meta') || {}).textContent || '';
    o.chosen = (document.querySelector('.hx-ed-instrow select') || {}).value;
    o.chan = ([...document.querySelectorAll('#sheet *')].find((e) => !e.children.length && e.textContent.startsWith(o.pickName + ' ·')) || {}).textContent || '';
    M.hxUndoStep(); await sl(400); o.undo = L.klang || 'eigen';
    return o;
  }, BPM);
  ok(r.stageW < 640 && r.edW >= Math.min(1000, r.winW - 40) - 40 && r.edR <= r.winW, `the Mixer open (field ${r.stageW} px): the editor ${r.edW} px wide, inside the window (${r.edR}/${r.winW})`);
  ok(r.row, 'its Instrument row is there');
  ok(r.rendered && r.klang === r.pick && r.chosen === r.pick, `another instrument (${r.own} → ${r.pick}): the loop rendered anew with it`);
  ok(r.meta.startsWith(r.pickName) && r.chan.indexOf(r.pickName) >= 0, `its name in the editor and on its channel: „${r.meta.slice(0, 50)}“`);
  ok(r.undo === 'eigen', `↶: its own again (${r.undo})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
