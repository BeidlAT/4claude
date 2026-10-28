// Review of #79–#87 (28.10.2026): (1) with „Instrument beim Preset-Wechsel: Preset“ a loop could not be edited – it
// counted as growing even after Erstarren; now the edit freezes it once and is then written, a second edit needs no
// freezing. (2) Einspielen „ersetzen“ given up (Abbrechen) gives its gap back.   node t-hx-instedit.js   (Chromium)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(110); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 8);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, degs = []; for (let i = 0; i < 32; i++) degs.push([0, 4, 7, 4, 2, 5, 9, 5][i % 8]);
    window.__riff(M.tgTime(B0), 60 / 110, degs, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 32) + 0.06);
    M.hxKorb(null); await sl(9000); M.HX.chips = null; M.setParam('hx.laenge', 'auto'); M.hxRailDirty(); await sl(300);
    const L = M.hxLoopsLive()[0]; M.hxEdOpen(L); await sl(600);
    const rw = async () => { await sl(150); for (let i = 0; i < 150 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && M.HXE.rw.buf); i++) await sl(100); return M.HXE.rw && M.HXE.rw.buf; };
    const seg = (buf, a, b) => { const n = buf.length, i0 = Math.round(a * n), i1 = Math.round(b * n); return [buf.getChannelData(0).slice(i0, i1), buf.getChannelData(1).slice(i0, i1)]; };
    const rms = (s) => { let e = 0; for (const c of s) for (let i = 0; i < c.length; i++) e += c[i] * c[i]; return Math.sqrt(e / (2 * s[0].length)); };
    const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
    const done = async () => { await M.HX.rxQ; await sl(100); };
    M.setParam('ui.instrument', 'preset');
    // (it plays with the preset's instrument once the Werk-Rahmen has rendered its pass – Erstarren keeps that one)
    const wre = () => L.sch.some((id) => { const S = M.HX.sch.get(id); return S && S.wRe && Object.keys(S.wRe).length > 1; });
    for (let i = 0; i < 300 && !wre(); i++) await sl(100);
    o.rendered = wre(); await sl(500);
    o.aktiv0 = M.hxWAktiv(L);
    const base = await rw(), B1 = [0.5, 0.625];
    o.lvl0 = db(rms(seg(base, B1[0] + 0.005, B1[1] - 0.005)));
    const h0 = M.HX.hist.length;
    M.hxRegionEdit(L, ...B1, 'loeschen', 0);
    for (let i = 0; i < 100 && M.HX.hist.length < h0 + 2; i++) await sl(100);
    await done(); let b = await rw();
    o.lvl1 = db(rms(seg(b, B1[0] + 0.005, B1[1] - 0.005)));
    o.aktiv1 = M.hxWAktiv(L); o.steps = M.HX.hist.slice(h0).map((x) => x.label);
    // a second edit: no second Erstarren
    const h1 = M.HX.hist.length; M.hxRegionEdit(L, 0.25, 0.375, 'loeschen', 0); await sl(800); await done();
    o.steps2 = M.HX.hist.slice(h1).map((x) => x.label);
    M.setParam('ui.instrument', 'eigen');
    // Einspielen „ersetzen“, then Abbrechen: the gap comes back
    const T1 = [0.75, 0.875]; b = await rw(); const before = db(rms(seg(b, T1[0] + 0.005, T1[1] - 0.005))), h2 = M.HX.hist.length;
    M.hxTakeArm(L, ...T1, 'ersetzen'); await sl(300);
    o.armed = !!M.HX.take; o.gapStep = M.HX.hist.length - h2;
    M.hxTakeStop(); await sl(300); b = await rw();
    o.gapBack = { steps: M.HX.hist.length - h2, lvl: +(db(rms(seg(b, T1[0] + 0.005, T1[1] - 0.005))) - before).toFixed(1) };
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.aktiv0, 'with „Instrument: Preset“ the loop plays with the preset’s instrument (it grows)');
  ok(r.lvl1 < r.lvl0 - 40 && !r.aktiv1, `an edit freezes it once and is written (${r.lvl0.toFixed(1)} → ${r.lvl1.toFixed(1)} dB; steps: ${r.steps.join(' · ')})`);
  ok(r.steps2.length === 1, `a second edit needs no freezing again (steps: ${r.steps2.join(' · ')})`);
  ok(r.armed && r.gapStep === 1 && r.gapBack.steps === 0 && Math.abs(r.gapBack.lvl) < 1, `„ersetzen“ given up: its gap goes back (steps ${r.gapStep} → ${r.gapBack.steps}, level ${r.gapBack.lvl} dB)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
