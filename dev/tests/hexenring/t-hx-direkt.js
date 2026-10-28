// (owner, 28.10.2026: „direktes bearbeiten der schleifen … abschnitte löschen (ohne dass sich die länge ändert),
// gegeneinander auswechseln, stellenweise mit neuem input füttern, in der tonart ändern (transpose, detune)“) Direkt in
// the editor: Löschen keeps the length; Merken → Tauschen / Einsetzen move frames; Tonhöhe and Verstimmen move the pitch
// at the same length; Einspielen catches what is played the next time the stretch comes round and builds it in there –
// on time.   node t-hx-direkt.js   (Chromium)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {}, SR = A.ctx.sampleRate;
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
    const corr = (x, y) => { let a = 0, b = 0, c = 0; for (let k = 0; k < 2; k++) for (let i = 0; i < Math.min(x[k].length, y[k].length); i++) { a += x[k][i] * y[k][i]; b += x[k][i] * x[k][i]; c += y[k][i] * y[k][i]; } return a / Math.sqrt(b * c + 1e-30); };
    // the strongest partial, parabolic: precise enough for a few cents
    const peak = (s) => { const N = 32768, re = new Float64Array(N), im = new Float64Array(N), m = Math.min(N, s[0].length); for (let i = 0; i < m; i++) re[i] = 0.5 * (s[0][i] + s[1][i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / m)); M.hxFFT(re, im); const P = (k) => Math.log(re[k] * re[k] + im[k] * im[k] + 1e-30); let pk = 2; for (let k = 3; k < N / 4; k++) if (P(k) > P(pk)) pk = k; const d = 0.5 * (P(pk - 1) - P(pk + 1)) / (P(pk - 1) - 2 * P(pk) + P(pk + 1)); return ((pk + d) * SR) / N; };
    const done = async () => { await M.HX.rxQ; await sl(100); };
    const len0 = M.hxLen(L), base = await rw(), A1 = [0.125, 0.25], B1 = [0.5, 0.625];
    const sA = seg(base, ...A1), sB = seg(base, ...B1), rest = seg(base, 0.75, 1);
    // 1. Löschen
    M.hxRegionEdit(L, ...B1, 'loeschen', 0); await done(); let b = await rw();
    o.del = { lvl: db(rms(seg(b, B1[0] + 0.005, B1[1] - 0.005))), len: +(M.hxLen(L) - len0).toFixed(6), rest: +corr(rest, seg(b, 0.75, 1)).toFixed(4) };
    M.hxUndoStep(); await sl(200);
    // 2. Merken A, Tauschen with B
    M.hxRxMark(L, ...A1); M.HXE.sel = { a: B1[0], b: B1[1] };
    o.markOk = M.hxRxMarkOk(L, ...B1);
    M.hxRxMoveGo(L, ...B1, 'swap'); await done(); b = await rw();
    o.swap = { bIsA: +corr(sA, seg(b, ...B1)).toFixed(3), aIsB: +corr(sB, seg(b, ...A1)).toFixed(3), rest: +corr(rest, seg(b, 0.75, 1)).toFixed(4), len: +(M.hxLen(L) - len0).toFixed(6) };
    M.hxUndoStep(); await sl(200); b = await rw(); o.swapBack = +corr(sA, seg(b, ...A1)).toFixed(4);
    // 3. Einsetzen: B gets A, A stays
    M.HXE.mark = { key: L.key, a: A1[0], b: A1[1] };
    M.hxRxMoveGo(L, ...B1, 'paste'); await done(); b = await rw();
    o.paste = { bIsA: +corr(sA, seg(b, ...B1)).toFixed(3), aStays: +corr(sA, seg(b, ...A1)).toFixed(3) };
    M.hxUndoStep(); await sl(200); await rw();
    // 4. Tonhöhe and Verstimmen
    const p0 = peak(sB), pit = {};
    for (const [k, v] of [['+7', 7], ['−12', -12], ['+50 ct', 0.5], ['−20 ct', -0.2]]) { const tq = performance.now(); M.hxRegionEdit(L, ...B1, 'pitch', v); const blk = performance.now() - tq; await done(); (o.pms = o.pms || []).push([Math.round(blk), Math.round(performance.now() - tq)]); b = await rw(); const s = seg(b, ...B1); pit[k] = { ratio: +(peak(s) / p0).toFixed(4), want: +Math.pow(2, v / 12).toFixed(4), lvl: +(db(rms(s)) - db(rms(sB))).toFixed(1) }; M.hxUndoStep(); await sl(200); await rw(); }
    o.pitch = pit; o.p0 = p0;
    // 5. Einspielen „ersetzen“: the stretch empties at once, the next time it comes round a phrase is played into it
    M.hxPvStop(); await sl(300);
    const T1 = [0.5, 0.75];
    M.hxTakeArm(L, ...T1, 'ersetzen'); await sl(200);
    const tk = M.HX.take; o.armed = !!tk && tk.st === 'wartet';
    b = await rw(); o.gap = db(rms(seg(b, T1[0] + 0.005, T1[1] - 0.005)));
    // the phrase: four notes from the stretch's first beat, an octave up in the Glocke
    const t0 = M.hxT(tk.fa), beat = 60 / 110, notes = [t0 + 0.0, t0 + beat, t0 + 2 * beat, t0 + 3 * beat];
    await window.__until(t0 - 0.4); o.wasWaiting = M.HX.take && M.HX.take.st;
    window.__play(notes.map((t, i) => [t, [7, 9, 11, 12][i], 0.9, 0.25]), { eng: 'glo' });
    for (let i = 0; i < 300 && M.HX.take; i++) await sl(50);
    o.built = !M.HX.take; await done(); b = await rw();
    const st = seg(b, ...T1); o.take = { lvl: db(rms(st)), rest: +corr(seg(base, 0.8, 1), seg(b, 0.8, 1)).toFixed(4) };
    // on time: the first onset in the stretch where the first note was played (frames from the stretch's start)
    const env = st[0].map((x, i) => Math.abs(x) + Math.abs(st[1][i])); let mx = 0; for (const x of env) mx = Math.max(mx, x);
    let on = -1; for (let i = 0; i < env.length; i++) if (env[i] > 0.2 * mx) { on = i; break; }
    o.onsetMs = +((on / SR) * 1000).toFixed(1);
    o.steps = M.HX.hist.slice(-2).map((x) => x.label);
    M.hxUndoStep(); await sl(200); M.hxUndoStep(); await sl(200); b = await rw(); o.takeBack = +corr(seg(base, ...T1), seg(b, ...T1)).toFixed(4);
    // 6. „dazu“: what is there stays, the phrase comes on top
    M.hxTakeArm(L, ...T1, 'dazu'); await sl(200);
    const tk2 = M.HX.take, t2 = M.hxT(tk2.fa);
    window.__play([0, 1, 2, 3].map((i) => [t2 + i * beat, [7, 9, 11, 12][i], 0.9, 0.25]), { eng: 'glo' });
    for (let i = 0; i < 300 && M.HX.take; i++) await sl(50);
    await done(); b = await rw(); const s2 = seg(b, ...T1), s0 = seg(base, ...T1);
    o.dazu = { keeps: +corr(s0, s2).toFixed(3), more: +(db(rms(s2)) - db(rms(s0))).toFixed(1) };
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.del.lvl < -80 && r.del.len === 0 && r.del.rest > 0.999, `Löschen: the stretch silent (${r.del.lvl.toFixed(0)} dB), the length the same, the rest as it was`);
  ok(r.markOk && r.swap.bIsA > 0.95 && r.swap.aIsB > 0.95 && r.swap.rest > 0.999 && r.swap.len === 0 && r.swapBack > 0.999, `Tauschen: the two stretches change places (${r.swap.bIsA}, ${r.swap.aIsB}), the rest stays, ↶ back`);
  ok(r.paste.bIsA > 0.95 && r.paste.aStays > 0.999, `Einsetzen: the kept stretch there too, itself unchanged (${r.paste.bIsA}, ${r.paste.aStays})`);
  const P = r.pitch, cents = (k) => Math.round(1200 * Math.log2(P[k].ratio / P[k].want));
  ok(Object.keys(P).every((k) => Math.abs(cents(k)) <= 8), `Tonhöhe and Verstimmen: as asked within 8 cents (${Object.keys(P).map((k) => k + ' ' + P[k].ratio + '/' + P[k].want + ' (' + cents(k) + ' ct)').join(', ')}; partial ${r.p0.toFixed(1)} Hz)`);
  ok(r.pms.every(([a, b]) => a < 700 && b < 2500), `…heard within ${Math.max(...r.pms.map((x) => x[0]))} ms of the click, written within ${Math.max(...r.pms.map((x) => x[1]))} ms (a stretch of 2 bars)`);
  ok(Object.keys(P).every((k) => Math.abs(P[k].lvl) < 2), `…at the stretch's loudness (${Object.keys(P).map((k) => k + ' ' + P[k].lvl + ' dB').join(', ')})`);
  ok(r.armed && r.gap < -80 && r.wasWaiting === 'wartet', `Einspielen „ersetzen“: armed, the stretch empty at once (${r.gap.toFixed(0)} dB) – waiting for it to come round`);
  ok(r.built && r.take.lvl > -45 && r.take.rest > 0.999, `…what was played is built in there (${r.take.lvl.toFixed(1)} dB), the rest stays`);
  ok(Math.abs(r.onsetMs) <= 15, `…on time: the first note ${r.onsetMs} ms after the stretch's start (played on it)`);
  ok(r.takeBack > 0.999, `…two ↶ give the stretch back (${r.steps.join(' / ')})`);
  ok(r.dazu.keeps > 0.3 && r.dazu.more > 1, `„dazu“: what was there stays (correlation ${r.dazu.keeps}), the phrase on top (+${r.dazu.more} dB)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
