// (owner, 28.10.2026, iPad: „der hinweistext wird halb verschluckt … färben und verwandeln sollten schon in der
// hauptansicht der schleife gehen … zuerst erstarren oder noten wie gespielt – sollte man dies nicht an ort und stelle
// ändern können“) a hint lies above the editor; without a selection the editor offers the colours, the pitch and
// Einspielen for the whole loop; a loop that plays its notes anew is frozen by the first edit (said in the editor
// before), the edit follows – two steps.   node t-hx-direkt2.js   (Chromium)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(110); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, degs = [0, 4, 7, 4, 2, 5, 9, 5];
    window.__riff(M.tgTime(B0), 60 / 110, degs, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null); await sl(5000); M.HX.chips = null; M.setParam('hx.laenge', 'auto'); M.hxRailDirty(); await sl(300);
    const L = M.hxLoopsLive()[0], S = () => M.HX.sch.get(L.sch[0]); M.hxEdOpen(L); await sl(800);
    const rw = async () => { await sl(150); for (let i = 0; i < 150 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && M.HXE.rw.buf); i++) await sl(100); return M.HXE.rw && M.HXE.rw.buf; };
    // 1. a hint above the editor
    M.toast('Probe'); await sl(300);
    const t = document.querySelector('.toast.show') || document.querySelector('.toast'), ed = document.querySelector('.hx-ed');
    o.z = [+getComputedStyle(t).zIndex, +getComputedStyle(ed).zIndex];
    t.style.pointerEvents = 'auto';   // (elementFromPoint skips what takes no pointer)
    const tr = t.getBoundingClientRect(); const ep = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2); o.top = !!(ep && ep.closest('.toast')); t.style.pointerEvents = '';
    // 2. no selection: the whole loop's colours
    M.HXE.sel = null; M.hxEdRender(); await sl(300);
    const part = document.querySelector('.hx-ed-part');
    o.rows = part ? [...part.querySelectorAll('.hx-ed-row > .lab')].map((x) => x.textContent) : [];
    const base = await rw(), len0 = M.hxLen(L);
    [...part.querySelectorAll('.chip')].find((b) => b.textContent === 'Erde').click(); await sl(50); await M.HX.rxQ; const b = await rw();
    const hi = (buf) => { const N = 16384, re = new Float64Array(N), im = new Float64Array(N), x = buf.getChannelData(0); for (let i = 0; i < N; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)); M.hxFFT(re, im); let h = 0, a = 0; for (let k = 1; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; a += p; if ((k * A.ctx.sampleRate) / N > 1500) h += p; } return 10 * Math.log10(h / a); };
    o.whole = { hi0: +hi(base).toFixed(1), hi1: +hi(b).toFixed(1), len: +(M.hxLen(L) - len0).toFixed(6), step: M.HX.hist[M.HX.hist.length - 1].label, pv: !!M.HXE.pv };
    M.hxUndoStep(); await sl(300); M.hxPvStop();
    // 3. a loop that plays its notes anew: the editor says so; the first edit freezes it, then edits
    M.hxWSet(L, 'wahl', true);
    for (let i = 0; i < 120 && S().play !== 'wu'; i++) await sl(100);
    o.wu = S().play; await sl(2500); M.hxEdRender(); await sl(200);
    o.note = (document.querySelector('.hx-ed-frz') || {}).textContent || '';
    const n0 = M.HX.hist.length;
    M.HXE.sel = { a: 0.25, b: 0.5 }; M.hxRegionEdit(L, 0.25, 0.5, 'gain', 0);
    for (let i = 0; i < 100 && M.HX.hist.length < n0 + 2; i++) await sl(100);
    await M.HX.rxQ; await sl(200);
    o.frz = { steps: M.HX.hist.slice(n0).map((x) => x.label), aktiv: M.hxWAktiv(L), play: S().play };
    const t2 = document.querySelector('.toast'); o.said = t2 ? t2.textContent : '';
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.z[0] > r.z[1] && r.top, `a hint lies above the editor (z ${r.z[0]} over ${r.z[1]}), nothing covers it`);
  ok(['Einspielen', 'Tonhöhe', 'Verstimmen', 'Verwandeln', 'Färben'].every((x) => r.rows.includes(x)) && !r.rows.includes('Direkt'), `no selection: the whole loop's tools (${r.rows.join(', ')})`);
  ok(r.whole.hi1 < r.whole.hi0 - 15 && r.whole.len === 0 && /Erde/.test(r.whole.step) && r.whole.pv, `Erde on the whole loop: darker (${r.whole.hi0} → ${r.whole.hi1} dB above 1.5 kHz), as long, heard at once`);
  ok(r.wu === 'wu' && /neu gewachsene Noten/.test(r.note) && /Erstarren/.test(r.note), `a loop playing its notes anew: the editor says what the first edit will do („${r.note.slice(0, 90)}…“)`);
  ok(r.frz.steps.length === 2 && /erstarrt/.test(r.frz.steps[0]) && /stumm|Abschnitt/.test(r.frz.steps[1]) && !r.frz.aktiv && r.frz.play === 'ab', `the first edit freezes it, then edits – two steps (${r.frz.steps.join(' / ')})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
