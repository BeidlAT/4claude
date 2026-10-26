// (owner, 26.10.2026) Kreise – the Leiste kept and loaded, apart from the project: two Schleifen kept as a Kreis; „Laden“
// replaces the Leiste with them (their audio sample for sample, Pigment, level, Takt), they begin on the next 1; one ↶
// brings the Leiste before back; a page reload keeps the Kreis; as a file it goes out and comes in again; „Dazulegen“
// puts it into the free places.                                                      node t-hx-kreise.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(() => { const c = URL.createObjectURL; URL.createObjectURL = (b) => { if (b && b.size > 1000) window.__blob = b; return c.call(URL, b); }; });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    for (const k of (await M.hxKrList()) || []) M.hxKrDel(k.id, true);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.3, [0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.25 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null); await sl(200);
    window.__riff(M.tgTime(B0 + 4), 0.6, [12, 9, 7, 5], 1, { eng: 'mem', dur: 0.5 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null);
    const done = () => M.hxLoopsLive().every((L) => L.sch.every((id) => M.HX.sch.get(id).aud));
    for (let i = 0; i < 100 && !done(); i++) await sl(100);
    await sl(2500);
    const sig = () => M.hxLoopsLive().sort((a, b) => a.slot - b.slot).map((L) => { const S = M.HX.sch.get(L.sch[0]); let h = 0; for (let i = 0; i < S.n; i += 97) { const c = S.aud[Math.floor(i / M.HX_CH)]; h = (h * 31 + Math.round(c[0][i % M.HX_CH] * 1e6)) | 0; } return [L.slot, S.n, h, M.hxPig(L).k, L.d.beats].join(':'); });
    const L0 = M.hxLoopsLive()[0]; M.hxColSet(L0, 'fliegenpilz'); M.hxLevel(L0, 0.5);
    o.before = sig(); o.keys = M.hxLoopsLive().map((L) => L.key); o.bpm = M.tgBpm(A.ctx.currentTime);
    // keep it
    M.hxKrSave('Test-Kreis');
    for (let i = 0; i < 100 && M.HXKR.busy; i++) await sl(100);
    const list = await M.hxKrList(); o.listed = list.map((k) => k.name + '/' + k.n);
    // change the Leiste: one more loop, another tempo
    window.__riff(M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4), 0.3, [3, 3, 3, 3], 1, { eng: 'klb', dur: 0.2 }); await sl(2600);
    M.hxKorb(null); await sl(300);
    o.n3 = M.hxLoopsLive().length;
    // load it: the Leiste replaced
    const made = await M.hxKrLoad(list[0].id, 'neu');
    o.loaded = made && made.length; o.after = sig(); o.newKeys = M.hxLoopsLive().every((L) => !o.keys.includes(L.key));
    o.lvl = M.hxLoopsLive().sort((a, b) => a.slot - b.slot)[0].gain;
    o.pend = M.HX.pend.filter((p) => p.kind === 'weiter').length;
    await sl(3200);
    o.playing = M.hxLoopsLive().map((L) => L.state);
    o.bpmAfter = M.tgBpm(A.ctx.currentTime);
    // ↶: the Leiste before (three loops)
    M.hxUndoStep(); await sl(400); o.undo = M.hxLoopsLive().length;
    M.hxRedoStep(); await sl(400); o.redo = M.hxLoopsLive().length;
    // the file: out and in again
    await M.hxKrExport(list[0].id); await sl(300);
    o.file = !!window.__blob && window.__blob.size;
    if (window.__blob) { await M.hxKrImport(new File([window.__blob], 'Test-Kreis.myzelkreis')); await sl(200); }
    const l2 = await M.hxKrList(); o.listed2 = l2.length;
    // Dazulegen: the imported one into the free places
    const add = await M.hxKrLoad(l2[0].id, 'dazu'); o.dazu = add && add.length; o.n4 = M.hxLoopsLive().length;
    o.sigAll = sig();
    await sl(1500);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.listed.length === 1 && r.listed[0] === 'Test-Kreis/2', `„Leiste sichern“: one Kreis listed (${r.listed.join(', ')})`);
  ok(r.n3 === 3 && r.loaded === 2 && JSON.stringify(r.after) === JSON.stringify(r.before) && r.newKeys, `„Laden“ replaces 3 Schleifen with the Kreis's 2 – audio, Pigment, length the same, new keys (${r.after.join(' ')})`);
  ok(Math.abs(r.lvl - 0.5) < 1e-6, `  its level kept (${r.lvl})`);
  ok(r.pend === 2 && r.playing.every((s) => s === 'spielt') && Math.abs(r.bpmAfter - r.bpm) < 0.01, `  both begin on the next 1 (${r.playing.join(', ')}), its Takt ${r.bpmAfter.toFixed(1)}`);
  ok(r.undo === 3 && r.redo === 2, `one ↶ brings the Leiste before back (${r.undo}), ↷ the Kreis again (${r.redo})`);
  ok(r.file > 100000 && r.listed2 === 2, `as a file (${Math.round(r.file / 1024)} KB) out and in again: ${r.listed2} Kreise`);
  ok(r.dazu === 2 && r.n4 === 4 && r.sigAll.slice(2).map((s) => s.split(':').slice(1, 3).join(':')).join() === r.before.map((s) => s.split(':').slice(1, 3).join(':')).join(), `„Dazulegen“: into the free places, the file's audio the same (${r.n4} Schleifen)`);
  // a reload: the Kreise are still there (apart from the Leiste's own restore)
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(1500);
  const n = await page.evaluate(async () => ((await window.__M.hxKrList()) || []).map((k) => k.name).join(','));
  ok(/Test-Kreis.*Test-Kreis/.test(n), `after a reload: ${n}`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
