// (owner, 29.10.2026: „wenn ich auf Abdruck klicke kommt zwar eine Rückmeldung …, aber es bleibt auf Wuchs (gelbe
// Markierung); dadurch lässt sich auch kein Klang verwandeln“)
//  1 „Instrument des Presets“ (ui.instrument preset): a new loop plays as played until the field's sound changes, then
//    it grows (it plays the preset's instrument);
//    Abdruck makes it an Abdruck – its own sound and key over the general rule – ↶/↷ take that back and forth, a key
//    change leaves it, Wuchs chosen for it ends it
//  2 „Schleifen folgen dem Preset“ (ui.tonart schleifen, the default): after a key change the loop grows in the new key;
//    an edit in Ansehen und Bearbeiten freezes it first (Erstarren) – and then it stays frozen (its key too), the edit is
//    written, no „ließ sich nicht festhalten“
//   node t-hx-abdruck.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const rec = async (inst) => page.evaluate(async (inst) => {
    const M = window.__M, A = M.A, sl = window.__sleep; await window.__reset();
    M.setParam('ui.instrument', inst); M.setParam('ui.tonart', 'schleifen'); window.__grid(96); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 96, [0, 4, 7, 4], 2, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive().slice(-1)[0];
    for (let i = 0; i < 100 && !(L && L.sch.length && M.HX.sch.get(L.sch[0]).aud); i++) await sl(100);
    window.__L = L; return !!L;
  }, inst);
  const st = () => page.evaluate(() => window.__M.hxWAktiv(window.__L));
  // ---------- 1 ----------
  ok(await rec('preset'), 'a loop recorded (Instrument des Presets)');
  const s = { neu: await st() };
  // (owner, 29.10.2026: „Silbenregen … klingt verzerrt und nicht wie gespielt“) while the field sounds as when it was made, a
  // new loop plays its recording; a change of the sound makes it take the field's
  await page.evaluate(() => window.__M.setParam('klb.decay', window.__M.P['klb.decay'] * 0.8)); await page.waitForTimeout(900); s.feld = await st();
  await page.evaluate(() => window.__M.hxAbdruck(window.__L)); await page.waitForTimeout(300); s.abdr = await st();
  await page.evaluate(() => window.__M.hxUndoStep()); await page.waitForTimeout(300); s.undo = await st();
  await page.evaluate(() => window.__M.hxRedoStep()); await page.waitForTimeout(300); s.redo = await st();
  await page.evaluate(() => window.__M.setParam('t.root', String((+window.__M.P['t.root'] + 2) % 12))); await page.waitForTimeout(600); s.key = await st();
  await page.evaluate(() => window.__M.hxWSet(window.__L, 'wahl', true)); await page.waitForTimeout(300); s.wuchs = await st();
  ok(!s.neu && s.feld, `with the preset's instrument a new loop plays as played (Wuchs ${s.neu}) until the field's sound changes (${s.feld})`);
  ok(!s.abdr, `Abdruck makes it an Abdruck (Wuchs ${s.abdr})`);
  ok(s.undo && !s.redo, `↶ takes the Abdruck back (Wuchs ${s.undo}), ↷ brings it again (Wuchs ${s.redo})`);
  ok(!s.key && s.wuchs, `a key change leaves the Abdruck (Wuchs ${s.key}); Wuchs chosen for it grows it again (${s.wuchs})`);
  // ---------- 2 ----------
  ok(await rec('eigen'), 'a loop recorded (its own instrument, loops follow the preset\'s key)');
  const r = await page.evaluate(async () => {
    const M = window.__M, L = window.__L, sl = window.__sleep, o = { before: M.hxWAktiv(L) }, toasts = [];
    const t0 = window.toast; window.toast = (m, ...a) => { toasts.push(String(m)); return t0 && t0(m, ...a); };
    M.setParam('t.root', String((+M.P['t.root'] + 3) % 12)); await sl(800); o.key = M.hxWAktiv(L);
    // (the grown version is rendered first – Erstarren keeps the pass that sounds)
    for (let i = 0; i < 200 && !L.sch.every((id) => { const S = M.HX.sch.get(id); return S && S.play === 'wu'; }); i++) await sl(100);
    o.wu = L.sch.map((id) => M.HX.sch.get(id).play).join();
    const h0 = M.HX.hist.length;
    o.edit = M.hxRegionEdit(L, 0.25, 0.5, 'gain', 0);
    for (let i = 0; i < 100 && M.HX.hist.length < h0 + 2; i++) await sl(100);
    await sl(500);
    o.after = M.hxWAktiv(L); o.steps = M.HX.hist.length - h0; o.fail = toasts.some((t) => /nicht festhalten/.test(t));
    M.setParam('t.root', String((+M.P['t.root'] + 2) % 12)); await sl(800); o.key2 = M.hxWAktiv(L);
    return o;
  });
  ok(!r.before && r.key && /wu/.test(r.wu), `after a key change the loop grows in the new key (Wuchs ${r.before} → ${r.key}, plays ${r.wu})`);
  ok(r.edit && !r.fail && !r.after && r.steps >= 2, `an edit freezes it first and is written: ${r.steps} steps, no „ließ sich nicht festhalten“ (${!r.fail}), frozen (Wuchs ${r.after})`);
  ok(!r.key2, `frozen it keeps its key through the next change too (Wuchs ${r.key2})`);
  ok(!errors.length, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  process.exit(H.summary() ? 1 : 0);
})();
