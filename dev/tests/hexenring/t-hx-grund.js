// „Grundeinstellung“ of a loop (owner, 26.10.2026: „funktioniert nicht immer“): whatever was edited – stretches on
// their own (written into the audio), rückwärts, trimmed, the tape, gaps, ageing, the notes – one press gives the
// loop as recorded back: the pass it plays is the same sample for sample as before any edit; ↶ brings the edits back,
// and a second press works again. Also with stretches edited while reversed or trimmed, and with a change still
// waiting for its seam.                                              node t-hx-grund.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(async () => {
    const M = window.__M, A = M.A;
    await window.__reset(); window.__grid(110); await window.__sleep(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null); await window.__sleep(7000); M.HX.chips = null; M.setParam('hx.laenge', 'auto');
    M.hxEdOpen(M.hxLoopsLive()[0]); await window.__sleep(600);
    window.__rw = async () => { await window.__sleep(200); for (let i = 0; i < 150 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && !M.HXE.rw.none && M.HXE.rw.buf); i++) await window.__sleep(100); const r = M.HXE.rw; if (!r || !r.buf) return null; const d = r.buf.getChannelData(0); let h = 0; for (let i = 0; i < d.length; i += 31) h = (h * 31 + Math.round(d[i] * 1e6)) | 0; return h + ':' + d.length; };
  });
  const r = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {}, sl = window.__sleep, base = await window.__rw();
    const def = async () => { M.hxDefaults(L); await sl(400); return await window.__rw(); };
    // A. stretches only
    M.hxRegionEdit(L, 0, 0.25, 'band', 2); await sl(200); M.hxRegionEdit(L, 0.5, 0.75, 'gain', 0); await sl(200);
    const ed = await window.__rw(); o.A = { edited: ed !== base, back: (await def()) === base };
    M.hxUndoStep(); await sl(400); o.A.undo = (await window.__rw()) === ed;
    o.A.again = (await def()) === base;
    // B. everything at once
    M.hxRegionEdit(L, 0.25, 0.5, 'rev', 0); await sl(150); M.hxBandTrim(L, 'h'); await sl(150); M.hxRev(L); await sl(150); M.hxSpeed(L, 0.5); await sl(150);
    M.hxSlcSet(L, 'pd', 0.3); M.hxSlcSet(L, 'pw', 0.3); M.hxVbSet(L, 0.75); M.hxAbSet(L, 0.25); M.hxNtSet(L, 'umk'); await sl(2500);
    o.B = (await def()) === base;
    // C. a stretch edited while reversed
    M.hxRev(L); await sl(200); M.hxRegionEdit(L, 0, 0.5, 'gain', 0.5); await sl(200); o.C = (await def()) === base;
    // D. a stretch edited while trimmed
    M.hxBandTrim(L, 'h'); await sl(200); M.hxRegionEdit(L, 0.5, 1, 'weg', 0.5); await sl(200); o.D = (await def()) === base;
    // E. a change still waiting for its seam
    M.hxRegionEdit(L, 0, 0.5, 'band', 0.5); await sl(150); M.hxSpeed(L, 2); await sl(100); o.E = { wait: !!L.prev, back: (await def()) === base };
    // F. both stretches edited, then ↶ ↶ – defaults still finds the audio as recorded
    M.hxRegionEdit(L, 0, 0.25, 'rev', 0); await sl(150); M.hxRegionEdit(L, 0.25, 0.5, 'rev', 0); await sl(150); M.hxUndoStep(); await sl(300); o.F = (await def()) === base;
    o.beats = L.d.beats;
    return o;
  });
  ok(r.A.edited && r.A.back && r.A.undo && r.A.again, `stretches edited on their own: Grundeinstellung gives the recording back sample for sample, ↶ the edits, a second press again (${JSON.stringify(r.A)})`);
  ok(r.B && r.beats === 8, `everything at once (a stretch, trimmed, rückwärts, Band ½, gaps, Verblassen, Abrieb, Umkehrung): back exactly, its length too (${r.B}, ${r.beats} beats)`);
  ok(r.C && r.D, `a stretch edited while reversed (${r.C}) or while trimmed (${r.D}): back exactly`);
  ok(r.E.wait && r.E.back, `a change still waiting for its seam: back exactly (${JSON.stringify(r.E)})`);
  ok(r.F, `edits partly undone first: back exactly (${r.F})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
