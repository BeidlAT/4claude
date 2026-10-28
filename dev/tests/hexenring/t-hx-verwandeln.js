// (owner, 28.10.2026: „die änderungen bei der auswahl gleich on the fly hörbar … weitere bearbeitungsoptionen … myzel
// thema“) a stretch's edit is heard at once in the Vorhören (it starts by itself, the quick version within a frame or
// two, the exact render a moment later – the same sound); the new tools Verwandeln (Nebel, Sporen, Keimen, Wurzel,
// Krone) and Färben (Erde, Licht, Welken, Sprießen) each change the stretch only, keep its loudness, one step, ↶ back.
//                                                         node t-hx-verwandeln.js   (Chromium)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = { ops: {} };
    await window.__reset(); window.__grid(110); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 8);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, degs = []; for (let i = 0; i < 32; i++) degs.push([0, 4, 7, 4, 2, 5, 9, 5][i % 8]);
    window.__riff(M.tgTime(B0), 60 / 110, degs, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 32) + 0.06);
    M.hxKorb(null); await sl(9000); M.HX.chips = null; M.setParam('hx.laenge', 'auto'); M.hxRailDirty(); await sl(300);
    const L = M.hxLoopsLive()[0]; M.hxEdOpen(L); await sl(600);
    const A0 = 0.55, B1 = 0.8; M.HXE.sel = { a: A0, b: B1 }; M.hxEdRender();
    const rw = async () => { await sl(150); for (let i = 0; i < 150 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && M.HXE.rw.buf); i++) await sl(100); return M.HXE.rw && M.HXE.rw.buf; };
    const seg = (buf, a, b) => { const n = buf.length, i0 = Math.round(a * n), i1 = Math.round(b * n); return [buf.getChannelData(0).slice(i0, i1), buf.getChannelData(1).slice(i0, i1)]; };
    const rms = (s) => { let e = 0; for (const c of s) for (let i = 0; i < c.length; i++) e += c[i] * c[i]; return Math.sqrt(e / (2 * s[0].length)); };
    const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
    const corr = (x, y) => { let a = 0, b = 0, c = 0; for (let k = 0; k < 2; k++) for (let i = 0; i < Math.min(x[k].length, y[k].length); i++) { a += x[k][i] * y[k][i]; b += x[k][i] * x[k][i]; c += y[k][i] * y[k][i]; } return a / Math.sqrt(b * c + 1e-30); };
    // the strongest partial (Hz) and the centroid of a stretch
    const spec = (s) => { const N = 16384, re = new Float64Array(N), im = new Float64Array(N), m = Math.min(N, s[0].length); for (let i = 0; i < m; i++) re[i] = 0.5 * (s[0][i] + s[1][i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / m)); M.hxFFT(re, im); let pk = 0, pi = 1, sw = 0, sf = 0, hi = 0, lo = 0; for (let k = 2; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k], f = (k * A.ctx.sampleRate) / N; if (p > pk) { pk = p; pi = k; } sw += p; sf += p * f; if (f > 1500) hi += p; if (f < 400) lo += p; } return { peak: (pi * A.ctx.sampleRate) / N, cen: sf / sw, hi: 10 * Math.log10(hi / sw + 1e-12), lo: 10 * Math.log10(lo / sw + 1e-12) }; };
    const base = await rw(); const s0 = seg(base, A0, B1), out0 = seg(base, 0.1, 0.45);
    o.lvl0 = db(rms(s0)); o.sp0 = spec(s0);
    // 1. not playing: an edit starts the Vorhören at once, the stretch already silent in what it plays
    let t0 = performance.now(); M.hxRegionEdit(L, A0, B1, 'gain', 0);
    for (let i = 0; i < 40 && !M.HXE.pv; i++) await sl(10);
    o.startMs = Math.round(performance.now() - t0); o.pvOn = !!M.HXE.pv; o.pvAt = M.HXE.pv ? +(M.HXE.pv.off / M.HXE.pv.dur).toFixed(3) : null;
    o.quickSilent = M.HXE.pv ? db(rms(seg(M.HXE.pv.buf, A0 + 0.01, B1 - 0.01))) : 0;
    o.repeat = M.HXE.pv ? [+(M.HXE.pv.a / M.HXE.pv.dur).toFixed(3), +(M.HXE.pv.b / M.HXE.pv.dur).toFixed(3)] : null;
    await M.HX.rxQ; M.hxUndoStep(); await sl(200); await rw(); await sl(400);
    // 2. playing: Erde – the quick version within a frame or two, the exact render after, the same sound
    const bq = M.HXE.pv.buf; t0 = performance.now(); M.hxRegionEdit(L, A0, B1, 'erde', 0); o.blockMs = Math.round(performance.now() - t0);
    for (let i = 0; i < 40 && M.HXE.pv.buf === bq; i++) await sl(10);
    o.quickMs = Math.round(performance.now() - t0); const quick = M.HXE.pv.buf;
    for (let i = 0; i < 200 && M.HXE.pv.buf === quick; i++) await sl(25);
    o.exactMs = Math.round(performance.now() - t0); o.exactSwap = M.HXE.pv.buf !== quick;
    o.quickVsExact = corr(seg(quick, A0 + 0.01, B1 - 0.01), seg(M.HXE.pv.buf, A0 + 0.01, B1 - 0.01));
    await M.HX.rxQ; M.hxUndoStep(); await sl(200); await rw();
    // 3. every new tool: the stretch changes, the rest stays, the level stays (Welken/Sprießen: quieter on the whole), one step, ↶ back
    for (const op of ['nebel', 'sporen', 'keimen', 'wurzel', 'krone', 'erde', 'licht', 'welken', 'spriessen']) {
      const n0 = M.HX.hist.length, tt = performance.now(); M.hxRegionEdit(L, A0, B1, op, 0); await M.HX.rxQ; const ms = Math.round(performance.now() - tt);
      const b = await rw(), s = seg(b, A0, B1), x = { ms, step: M.HX.hist.length - n0, lvl: +(db(rms(s)) - o.lvl0).toFixed(1), diff: +(1 - corr(s0, s)).toFixed(3), rest: +corr(out0, seg(b, 0.1, 0.45)).toFixed(4), sp: spec(s), nan: s.some((c) => c.some((v) => !Number.isFinite(v))) };
      if (op === 'keimen') { const m = s[0].length, k = Math.floor(m / 8); x.rep = +corr([s[0].slice(0, k), s[1].slice(0, k)], [s[0].slice(k, 2 * k), s[1].slice(k, 2 * k)]).toFixed(3); }
      M.hxUndoStep(); await sl(150); const bb = await rw(); x.back = +corr(s0, seg(bb, A0, B1)).toFixed(4);
      o.ops[op] = x;
    }
    M.hxPvStop();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.pvOn && r.startMs < 150 && Math.abs(r.pvAt - 0.55) < 0.01 && r.repeat && Math.abs(r.repeat[0] - 0.55) < 0.01 && Math.abs(r.repeat[1] - 0.8) < 0.01, `not playing: an edit starts the Vorhören at the stretch, which repeats (${r.startMs} ms, ${r.repeat})`);
  ok(r.quickSilent < -80, `…and it is heard at once: the stretch silent in what plays (${r.quickSilent.toFixed(0)} dB)`);
  ok(r.blockMs < 250 && r.quickMs < 250 && r.exactSwap && r.quickVsExact > 0.95, `playing: Erde heard after ${r.quickMs} ms (the click blocks ${r.blockMs} ms), the exact render after ${r.exactMs} ms – the same sound (correlation ${r.quickVsExact.toFixed(3)})`);
  const O = r.ops, all = Object.keys(O);
  ok(all.every((k) => O[k].step === 1 && !O[k].nan && O[k].back > 0.999), `each tool one step, ↶ gives the stretch back (${all.map((k) => k + ' ' + O[k].back).join(', ')})`);
  ok(all.every((k) => O[k].diff > 0.1 && O[k].rest > 0.999), `each changes the stretch, the rest of the pass stays (${all.map((k) => k + ' ' + O[k].diff + '/' + O[k].rest).join(', ')})`);
  ok(['nebel', 'sporen', 'wurzel', 'krone', 'erde'].every((k) => Math.abs(O[k].lvl) < 3) && O.licht.lvl > -16, `their loudness the stretch's own (${['nebel', 'sporen', 'wurzel', 'krone', 'erde'].map((k) => k + ' ' + O[k].lvl + ' dB').join(', ')}; Licht, its body gone, ${O.licht.lvl} dB)`);
  ok(O.welken.lvl < -2 && O.spriessen.lvl < -2, `Welken and Sprießen quieter on the whole (${O.welken.lvl}, ${O.spriessen.lvl} dB)`);
  ok(Math.abs(O.wurzel.sp.cen / r.sp0.cen - 0.5) < 0.1 && Math.abs(O.krone.sp.cen / r.sp0.cen - 2) < 0.4, `Wurzel an octave down, Krone an octave up (centroid ${r.sp0.cen.toFixed(0)} → ${O.wurzel.sp.cen.toFixed(0)} / ${O.krone.sp.cen.toFixed(0)} Hz)`);
  ok(O.erde.sp.hi < r.sp0.hi - 15 && O.licht.sp.cen > 1.5 * r.sp0.cen, `Erde darker, Licht brighter (share above 1.5 kHz ${r.sp0.hi.toFixed(0)} → ${O.erde.sp.hi.toFixed(0)} dB; centroid ${r.sp0.cen.toFixed(0)} → ${O.licht.sp.cen.toFixed(0)} Hz)`);
  ok(O.keimen.rep > 0.95, `Keimen: its beginning repeats (${O.keimen.rep})`);
  ok(all.every((k) => O[k].ms < 1200), `each computed quickly (${all.map((k) => k + ' ' + O[k].ms + ' ms').join(', ')})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
