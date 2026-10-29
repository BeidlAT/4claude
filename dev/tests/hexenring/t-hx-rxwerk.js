// (owner, 29.10.2026: Punkt 3) the stretch edits worked out in Workers: every op gives the same audio to the bit as the
// main thread's own (hxRxApply ∘ hxRxOp), dry and baked; the page answers while a whole-loop Tonhöhe is worked out; ↶
// right after an edit (still in the Worker) writes it at once, the same.   node t-hx-rxwerk.js   (Chromium)
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
    const L = M.hxLoopsLive()[0], S = M.hxBandReady(L)[0];
    const same = (x, y) => { if (x.length !== y.length) return false; for (let k = 0; k < x.length; k++) for (let c = 0; c < 2; c++) { const p = x[k][c], q = y[k][c]; for (let i = 0; i < p.length; i++) if (p[i] !== q[i] && !(p[i] !== p[i] && q[i] !== q[i])) return false; } return true; };
    // 1. every op, Worker vs. here
    const ops = [['pitch', 12], ['pitch', -12], ['pitch', 7], ['pitch', 0.2], ['wurzel', 0], ['krone', 0], ['nebel', 0], ['sporen', 0], ['keimen', 0], ['erde', 0], ['licht', 0], ['welken', 0], ['spriessen', 0], ['band', 2], ['band', 0.5], ['band', 1.5], ['rev', 0], ['weg', 0.5], ['tausch', 0.5], ['gain', 0.5], ['loeschen', 0]];
    const u = M.hxBandU(L).map((p) => (p - 0.25) / 0.5).filter((p) => p >= 0 && p < 1);
    o.ops = {};
    for (const [op, v] of ops) {
      const [r0, r1] = M.hxRxFrames(S, 0.25, 0.75), seed = 12345;
      for (const [k, ch] of [['aud', S.aud], ['bak', S.bak]]) {
        if (!ch) continue;
        const here = M.hxRxApply(ch, r0, r1, M.hxRxOp(ch, r0, r1, op, v, u, seed)), w = M.hxRwPut(ch, r0, await M.hxRw(ch, r0, r1, op, v, u, seed));
        o.ops[op + ' ' + v + ' ' + k] = same(here, w);
      }
    }
    // 1b. (29.10.2026) the edges' crossfade on alike sides (−1 dB): never above both sides (sin/cos rose up to +3 dB)
    { const [r0, r1] = M.hxRxFrames(S, 0.25, 0.75), g = Math.pow(10, -1 / 20), d = M.hxRxApply(S.aud, r0, r1, M.hxRxOp(S.aud, r0, r1, 'gain', g, u, 1)), rd = (ch, f) => { const c = ch[Math.floor(f / 8192)]; return c ? c[0][f % 8192] : 0; };
      let worst = -99; for (const e of [r0, r1]) for (let f = e - 400; f < e + 400; f++) { const a = rd(S.aud, f); if (Math.abs(a) > 1e-3) worst = Math.max(worst, 20 * Math.log10(Math.abs(rd(d, f) / a))); }
      o.edge = +worst.toFixed(2); }
    o.pool = M.HXRW.pool.length; o.broken = M.HXRW.broken;
    // 2. a whole-loop Tonhöhe: the page answers meanwhile
    M.hxEdOpen(L); await sl(600);
    let last = performance.now(), worst = 0; const iv = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last); last = n; }, 10);
    const a0 = M.hxBandReady(L).map((x) => x.aud), t0 = performance.now(); M.hxRegionEdit(L, 0, 1, 'pitch', 12); o.blk = Math.round(performance.now() - t0);
    await M.HX.rxQ; await sl(300); clearInterval(iv); o.worst = Math.round(worst); o.all = Math.round(performance.now() - t0);
    o.changed = M.hxBandReady(L).every((x, i) => x.aud !== a0[i]);
    // 3. ↶ at once after an edit: written here, then taken back
    M.hxUndoStep(); await sl(300);
    o.back = M.hxBandReady(L).every((x, i) => x.aud === a0[i]);
    M.hxRegionEdit(L, 0, 1, 'krone', 0); M.hxUndoStep(); await M.HX.rxQ; await sl(300);
    o.flushBack = M.hxBandReady(L).every((x, i) => x.aud === a0[i]) && !M.HX.rxP.length;
    return o;
  });
  const bad = Object.keys(r.ops).filter((k) => !r.ops[k]);
  ok(!bad.length && Object.keys(r.ops).length >= 21, `every op the same to the bit in the Worker (${Object.keys(r.ops).length} checks${bad.length ? '; differ: ' + bad.join(', ') : ''}; ${r.pool} Worker${r.broken ? ', broken' : ''})`);
  ok(r.pool >= 1 && !r.broken, `Workers running (${r.pool})`);
  ok(r.edge <= 0.05, `a stretch 1 dB softer: its edges never rise above the louder side (${r.edge} dB at most)`);
  ok(r.changed && r.worst < 600, `whole-loop Tonhöhe +12: the page answers meanwhile (longest pause ${r.worst} ms, the call ${r.blk} ms, all ${r.all} ms)`);
  ok(r.back && r.flushBack, `↶ after an edit, also while the Worker still works: the audio as before (${r.back}, ${r.flushBack})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  H.summary(); process.exit(0);
})();
