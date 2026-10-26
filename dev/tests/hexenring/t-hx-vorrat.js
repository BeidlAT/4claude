// (owner, 26.10.2026) the whole Ernte kept with a Schleife: after a harvest the Humus it held is beside the loop
// (L.hum); the window moves in it (same length: at once, from the Ernte – never a live fill), grows by a bar (from the
// next seam, 4 beats more), ↶ gives the window back, Grundeinstellung the window as harvested; the audio played is the
// Ernte's sample for sample; the editor shows the row „Ganze Ernte“.             node t-hx-vorrat.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(110); await sl(300);
    // 8 bars of a figure, then the Korb takes 2 of them – the Ernte holds the rest
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 7, 4, 2, 5, 9, 5, 0, 7, 4, 9, 2, 9, 5, 4], 2, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 32) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0]; o.made = !!L;
    for (let i = 0; i < 120 && !(L && L.hum); i++) await sl(100);
    const S = M.HX.sch.get(L.sch[0]), Hm = L.hum;
    o.hum = !!Hm; if (!Hm) return o;
    o.humS = +(Hm.n / 48000).toFixed(1); o.winS = +(S.cut.len / 48000).toFixed(2); o.beats0 = L.d.beats;
    o.inside = S.cut.w0 > Hm.f0 && S.cut.w1 <= Hm.f0 + Hm.n;
    // the audio a window plays = the Ernte's frames (frame 1000 of its window)
    const at = (S2, k) => { const i = S2.pre + k, ch = S2.aud[Math.floor(i / M.HX_CH)]; return ch ? ch[0][i % M.HX_CH] : NaN; };
    const humAt = (f) => { const i = f - Hm.f0, ch = Hm.aud[Math.floor(i / M.HX_CH)]; return ch ? ch[0][i % M.HX_CH] : NaN; };
    // A. one bar earlier (same length – at once, from the Ernte)
    const barF = (S.cut.len / L.d.beats) * 4, w0 = S.cut.w0, w1 = S.cut.w1;
    o.A = { applied: M.hxHumApply(L, w0 - barF, w1 - barF, 'test früher') };
    o.A.live = S.live; o.A.w0 = S.cut.w0 === Math.round(w0 - barF); o.A.same = Math.abs(at(S, 1000) - humAt(S.cut.w0 + 1000)) < 1e-7 && Math.abs(at(S, 30000) - humAt(S.cut.w0 + 30000)) < 1e-7;
    await sl(500);
    // B. a bar longer at the front (from the next seam: 12 beats)
    o.B = { applied: M.hxHumApply(L, S.cut.w0 - barF, S.cut.w1, 'test länger') }; await sl(4600);
    o.B.beats = L.d.beats; o.B.same = Math.abs(at(S, 2000) - humAt(S.cut.w0 + 2000)) < 1e-7;
    // C. ↶ ↶: the window and the length as harvested
    M.hxUndoStep(); await sl(300); M.hxUndoStep(); await sl(4600);
    o.C = { w0: S.cut.w0 === w0, w1: S.cut.w1 === w1, beats: L.d.beats };
    // D. moved again, then Grundeinstellung: as harvested
    M.hxHumApply(L, w0 + barF, w1 + barF > Hm.f0 + Hm.n - S.cut.post ? w1 : w1 + barF, 'test später'); await sl(300);
    M.hxHumApply(L, S.cut.w0 - 2 * barF, S.cut.w1 - 2 * barF, 'test früher 2'); await sl(300);
    M.hxDefaults(L); await sl(4600);
    o.D = { w0: S.cut.w0 === w0, w1: S.cut.w1 === w1, beats: L.d.beats };
    // E. the editor's row
    M.hxEdOpen(L); await sl(800);
    o.E = { row: !!document.querySelector('.hx-ed-hum canvas'), btns: document.querySelectorAll('.hx-ed-humft .btn').length };
    // F. the memory counts it
    o.F = M.hxMemUsed() > Hm.n * 8;
    // H. (owner) Abdruck after another sound and the key followed: marked, and the Wuchs is gone
    M.hxWSet(L, 'klang', 'feld'); await sl(300); const onW = M.hxWAktiv(L);
    M.hxAbdruck(L); await sl(300);
    o.H = { wasW: onW, abdruck: !M.hxWAktiv(L), klang: L.klang || 'eigen' };
    // I. (owner) a second harvest shares the store: its Ernte refers to the same chunks where they overlap, the memory
    // grows by its new part only
    const mem0 = M.hxMemUsed(), B1 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B1), 60 / 110, [7, 4, 0, 4, 7, 9, 7, 4], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B1 + 8) + 0.06);
    M.hxKorb(null); await sl(300);
    const L2 = M.hxLoopsLive().find((X) => X !== L);
    for (let i = 0; i < 120 && !(L2 && L2.hum); i++) await sl(100);
    const H2 = L2 && L2.hum; let shared = 0;
    if (H2) { const set = new Set(Hm.aud); for (const ch of H2.aud) if (set.has(ch)) shared++; }
    o.I = { hum2: !!H2, shared, n2: H2 ? H2.aud.length : 0, grewMB: +((M.hxMemUsed() - mem0) / 1048576).toFixed(1), fullMB: H2 ? +(H2.aud.length * M.HX_CH * 8 / 1048576).toFixed(1) : 0 };
    // G. 128 bars can be chosen
    M.hxLenSet(128); o.G = M.P['hx.festT'] === 128;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.made && r.hum && r.inside && r.humS > r.winS * 3, `after a harvest the whole Ernte is kept beside the loop (${r.humS} s around a window of ${r.winS} s)`);
  ok(r.A && r.A.applied && !r.A.live && r.A.w0 && r.A.same, `the window one bar earlier: at once, from the Ernte, sample for sample (${JSON.stringify(r.A)})`);
  ok(r.B && r.B.applied && r.B.beats === r.beats0 + 4 && r.B.same, `a bar longer at the front: ${r.beats0} → ${r.B && r.B.beats} beats from the next seam (${JSON.stringify(r.B)})`);
  ok(r.C && r.C.w0 && r.C.w1 && r.C.beats === r.beats0, `↶ ↶: window and length as before (${JSON.stringify(r.C)})`);
  ok(r.D && r.D.w0 && r.D.w1 && r.D.beats === r.beats0, `Grundeinstellung: the window as harvested (${JSON.stringify(r.D)})`);
  ok(r.E && r.E.row && r.E.btns >= 5, `the editor shows „Ganze Ernte“ with its buttons (${JSON.stringify(r.E)})`);
  ok(r.F, 'the Ernte counts against the Speichergrenze');
  ok(r.H && r.H.wasW && r.H.abdruck && r.H.klang === 'eigen', `Abdruck after „Klang: Spielfeld“: the loop plays as recorded again (${JSON.stringify(r.H)})`);
  ok(r.I && r.I.hum2 && r.I.shared > r.I.n2 * 0.8 && r.I.grewMB < r.I.fullMB * 0.5, `a second Ernte shares the store: ${r.I && r.I.shared} of ${r.I && r.I.n2} chunks the same, memory +${r.I && r.I.grewMB} MB instead of ${r.I && r.I.fullMB} MB`);
  ok(r.G, '128 bars can be set as the length of new loops');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
