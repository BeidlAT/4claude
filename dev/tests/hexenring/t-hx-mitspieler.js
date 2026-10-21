// Hexenring – Mitspieler I (SPEC §12.2, §12.4, §12.5, §22 t-hx-ki): Variieren and Wandern, the Knospen, persistence.
//  op       the operators one by one: the neighbour keeps its contour, fills are passing tones in the scale, thinning and
//           filling keep their limits, the Euclidean move keeps the count, Wandern swaps only half bars with equal edges
//  engine   determinism per seed (the same chain twice, another seed another chain), every note in the scale, the strong
//           positions (the 1, the middle of the bar) never change, density within its limits over 400 passes, the
//           elastic pull keeps the loop near its anchor (Variieren nearer than Wandern), the guard, ✕'s weights
//  live     a loop at Variieren in the Werk-Rahmen: every pass rendered from its own varied notes, the strong notes in
//           every pass, the changed ones shown as Knospen a bar before they sound; ✓ keeps the varied pass (its notes the
//           anchor's), ✕ back to the anchor (the chain begins there, the operators refused count half), ⚓ the original;
//           the Gärtner's density reaches the passes not yet rendered
//  persist  the anchor's notes, the role, the Gärtner's and Wiederkehr's marks in the loop's record and its snapshot (↶)
//   node t-hx-mitspieler.js      env: PARTS=op,engine,live,persist
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const PARTS = (process.env.PARTS || 'op,engine,live,persist').split(',');
const has = (p) => PARTS.includes(p);

(async () => {
  const { page, errors } = await G.open({});
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    const M = window.__M;
    // a synthetic loop's notes: two bars of eighths (pentatonic, its own ratios), the 1 and the middle strong
    window.__W = (degs, o = {}) => {
      const rat = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], key = { root: 0, rat, per: 5, free: false, id: '0', scale: 'mpent' };
      const n = (degs || [0, 2, 4, 1, 3, 2, 0, 4, 1, 2, 3, 0, 4, 2, 1, 0]).map((d, i) => { const oct = 1 + Math.floor(d / 5), dd = ((d % 5) + 5) % 5; return { t: i * (o.step || 0.5), d: 0.4, deg: dd, oct, f: 110 * Math.pow(2, oct) * rat[dd], vel: 0.7, eng: 'glo', cy: [], cf: [] }; });
      return { u: 'b', len: o.len || 8, key, sd: 0, lanes: [], n };
    };
    window.__inScale = (W, x) => { const r = W.key.rat[x.deg], f = 110 * Math.pow(2, x.oct) * r; return Math.abs(x.f / f - 1) < 1e-9 && x.deg >= 0 && x.deg < W.key.per; };
    window.__chain = (W, seed0, lvl, n, o = {}) => { let prev = { n: W.n, hist: [] }; const out = []; for (let k = 0; k < n; k++) { const r = M.hxVarStep(W, W.n, prev, Object.assign({ seed: seed0 + k * 7919, lvl, wts: {}, gd: 0, bpb: 4, segs: [] }, o)); out.push(r); prev = r; } return out; };
  });
  let r;

  // ---------- op ----------
  if (has('op')) {
    r = await ev(() => {
      const M = window.__M, W = window.__W(), out = { nb: 0, nbBad: 0, fi: 0, fiBad: 0, th: 0, thMin: 99, eu: 0, euBad: 0, sw: 0, swBad: 0, okBad: 0, ok: 0 };
      const We = window.__W([0, 2, 4, 1, 0, 3, 2, 4], { step: 1 }), Ws = window.__W([0, 2, 1, 3, 0, 4, 2, 3, 0, 1, 4, 3, 0, 2, 4, 0]);
      We.n.forEach((x, i) => { x.t = [0, 0.75, 1.5, 3, 4, 4.75, 6, 7.5][i]; });
      const I = (x) => M.hxVIdx(W, x), ctxE = { A: 8, lo: 5, hi: 9, t0: 0, U: 8, bpb: 4, gd: 0, segs: [] }, ctx = { A: W.n.length, lo: Math.min(...W.n.map(I)), hi: Math.max(...W.n.map(I)), t0: 0, U: W.len, bpb: 4, gd: 0, segs: [] };
      for (let s = 1; s <= 300; s++) {
        const R = M.hxRng(s);
        let m = M.hxVOp('nb', W, W.n.map((x) => Object.assign({}, x)), ctx, R);
        if (m) { out.nb++; const i = m.findIndex((x, j) => I(x) !== I(W.n[j])), x = m[i]; const sg = (a, b) => Math.sign(b - a); if (i < 0 || (i > 0 && sg(I(m[i - 1]), I(x)) !== sg(I(W.n[i - 1]), I(W.n[i]))) || (i + 1 < m.length && sg(I(x), I(m[i + 1])) !== sg(I(W.n[i]), I(W.n[i + 1]))) || !window.__inScale(W, x) || M.hxVMet(x.t, 4) >= 0.9) out.nbBad++; }
        m = M.hxVOp('fi', W, W.n.map((x) => Object.assign({}, x)), ctx, M.hxRng(s));
        if (m) { out.fi++; const add = m[m.length - 1], s2 = m.slice(0, -1).sort((a, b) => a.t - b.t), a = s2.filter((x) => x.t < add.t).pop(), b = s2.find((x) => x.t > add.t); if (!a || !b || !window.__inScale(W, add) || !(Math.min(I(a), I(b)) < I(add) && I(add) < Math.max(I(a), I(b)))) out.fiBad++; }
        m = M.hxVOp('th', W, W.n.map((x) => Object.assign({}, x)), ctx, M.hxRng(s));
        if (m) { out.th++; const gone = W.n.filter((x) => !m.some((y) => y.t === x.t && I(y) === I(x))); if (gone.some((x) => M.hxVMet(x.t, 4) >= 0.9)) out.thMin = -1; }
        m = M.hxVOp('eu', We, We.n.map((x) => Object.assign({}, x)), ctxE, M.hxRng(s));   // (a bar with room: the onsets of a dotted figure)
        if (m) { out.eu++; if (m.length !== We.n.length || We.n.some((x) => M.hxVMet(x.t, 4) >= 0.9 && !m.some((y) => Math.abs(y.t - x.t) < 1e-9 && I(y) === I(x))) || m.some((y) => Math.abs(y.t * 4 - Math.round(y.t * 4)) > 1e-6)) out.euBad++; }
        m = M.hxVOp('ok', W, W.n.map((x) => Object.assign({}, x)), ctx, M.hxRng(s));
        if (m) { out.ok++; const i = m.findIndex((x, j) => I(x) !== I(W.n[j])); if (i < 0 || Math.abs(I(m[i]) - I(W.n[i])) !== 5 || !window.__inScale(W, m[i])) out.okBad++; }
        m = M.hxVOp('sw', Ws, Ws.n.map((x) => Object.assign({}, x)), Object.assign({}, ctx, { segs: [] }), M.hxRng(s));
        if (m) { out.sw++; const W = Ws; const per = 5, mod = (v) => ((v % per) + per) % per; for (let h = 0; h < 4; h++) { const a = W.n.filter((x) => x.t >= 2 * h && x.t < 2 * h + 2), b = m.filter((x) => x.t >= 2 * h - 1e-9 && x.t < 2 * h + 2 - 1e-9).sort((p, q) => p.t - q.t); if (a.length && b.length && (mod(I(a[0])) !== mod(I(b[0])) || mod(I(a[a.length - 1])) !== mod(I(b[b.length - 1])))) out.swBad++; } }
      }
      // thinning never below 60 % of the anchor
      let n = W.n.map((x) => Object.assign({}, x)); for (let s = 0; s < 40; s++) { const m = M.hxVOp('th', W, n, ctx, M.hxRng(s + 5)); if (m) n = m; } out.thMin = Math.min(out.thMin, n.length);
      let f = W.n.map((x) => Object.assign({}, x)); for (let s = 0; s < 60; s++) { const m = M.hxVOp('fi', W, f, ctx, M.hxRng(s + 9)); if (m) f = m.sort((a, b) => a.t - b.t); } out.fiMax = f.length;
      return out;
    });
    ok(r.nb > 100 && r.nbBad === 0, `neighbour degree: ${r.nb} moves, each a weak note, in the scale, its contour to both neighbours kept (${r.nbBad} not)`);
    ok(r.fi > 100 && r.fiBad === 0, `passing tones: ${r.fi} fills, each between its neighbours and in the scale (${r.fiBad} not)`);
    ok(r.th > 100 && r.thMin >= 10, `thinning: ${r.th} times only weak notes went; after 40 steps ${r.thMin} of 16 notes are left (≥ 60 %)`);
    ok(r.fiMax <= 24, `filling stops at 1.5 × the anchor: ${r.fiMax} of at most 24`);
    ok(r.eu > 50 && r.euBad === 0, `Euclidean redistribution: ${r.eu} times, the count kept and the strong notes in place (${r.euBad} not)`);
    ok(r.ok > 30 && r.okBad === 0, `octave displacement: ${r.ok} times exactly one octave, in the scale (${r.okBad} not)`);
    ok(r.sw > 30 && r.swBad === 0, `Wandern: ${r.sw} half-bar swaps, each half bar's first and last degree as before (${r.swBad} not)`);
  }

  // ---------- engine ----------
  if (has('engine')) {
    r = await ev(() => {
      const M = window.__M, W = window.__W(), out = {};
      const a = window.__chain(W, 11, 2, 60), b = window.__chain(W, 11, 2, 60), c = window.__chain(W, 12, 2, 60);
      const sig = (ch) => ch.map((x) => x.n.map((y) => M.hxVKey(W, y)).join(',')).join('|');
      out.same = sig(a) === sig(b); out.other = sig(a) !== sig(c);
      const strong = W.n.filter((x) => M.hxVMet(x.t, 4) >= 0.9).map((x) => M.hxVKey(W, x));
      for (const lvl of [2, 3]) {
        const ch = window.__chain(W, 101 + lvl, lvl, 400);
        let bad = 0, sk = 0, dmax = 0, dsum = 0, minN = 99, maxN = 0, perBeat = 0, changed = 0;
        for (const x of ch) {
          if (!x.n.every((y) => window.__inScale(W, y))) bad++;
          const ks = new Set(x.n.map((y) => M.hxVKey(W, y))); if (!strong.every((k) => ks.has(k))) sk++;
          dmax = Math.max(dmax, x.d); dsum += x.d; minN = Math.min(minN, x.n.length); maxN = Math.max(maxN, x.n.length);
          const cb = {}; for (const y of x.n) { const bb = Math.floor(y.t + 1e-6); cb[bb] = (cb[bb] || 0) + 1; } perBeat = Math.max(perBeat, ...Object.values(cb));
          if (x.ops.length) changed++;
        }
        out['l' + lvl] = { bad, sk, dmax, dmean: dsum / ch.length, minN, maxN, perBeat, changed };
      }
      // the guard: nothing changes
      out.guard = window.__chain(W, 5, 3, 20, { guard: true }).every((x) => x.n === W.n && !x.ops.length);
      // a Platz-machen density: thinner on average than the plain chain
      const thin = window.__chain(W, 77, 2, 200, { gd: -1 }), full = window.__chain(W, 77, 2, 200, { gd: 1 });
      out.thin = thin.reduce((s, x) => s + x.n.length, 0) / thin.length; out.full = full.reduce((s, x) => s + x.n.length, 0) / full.length;
      // ✕'s weights: the refused operators at half for the session
      M.HX.vw = {};
      const S = { vc: { src: W.n, m: new Map([[5, { n: W.n, ops: ['nb', 'fi'], chg: [] }]]) } }, L = { sch: [1], eig: 'variieren' };
      const keep = M.HX.sch.get(1); M.HX.sch.set(1, S);
      try { out.nein = M.hxVarNein(L, 5, 6); } catch (e) { out.nein = String(e); } finally { if (keep) M.HX.sch.set(1, keep); else M.HX.sch.delete(1); }
      out.vw = Object.assign({}, M.HX.vw); M.HX.vw = {};
      return out;
    });
    ok(r.same && r.other, `determinism: the same anchor and seeds give the same 60 passes (${r.same}); another seed another chain (${r.other})`);
    for (const lv of [2, 3]) {
      const x = r['l' + lv], name = lv === 2 ? 'Variieren' : 'Wandern';
      ok(x.bad === 0 && x.sk === 0, `${name}, 400 passes: every note in the scale (${x.bad} passes not), the 1 and the middle of each bar unchanged (${x.sk} not)`);
      ok(x.minN >= 10 && x.maxN <= 28 && x.perBeat <= 4, `${name}: density within its limits – ${x.minN}…${x.maxN} notes (anchor 16), at most ${x.perBeat} in a beat`);
      ok(x.changed > 150 && x.changed < 400, `${name}: ${x.changed} of 400 passes changed (it breathes, it does not chatter every pass)`);
    }
    ok(r.l2.dmean < 0.45 && r.l2.dmean < r.l3.dmean + 0.02 && r.l3.dmean < 0.6, `the elastic pull: mean distance to the anchor Variieren ${r.l2.dmean.toFixed(2)}, Wandern ${r.l3.dmean.toFixed(2)} (max ${r.l2.dmax.toFixed(2)} / ${r.l3.dmax.toFixed(2)}; 0 = the anchor, 1 = nothing alike)`);
    ok(r.guard, `the guard (§6.4): no pass changes during it`);
    ok(r.thin < r.full - 1, `the Gärtner's density: making room ${r.thin.toFixed(1)} notes per pass, filling ${r.full.toFixed(1)}`);
    ok(Array.isArray(r.nein) && r.vw.nb === 0.5 && r.vw.fi === 0.5 && r.vw.th == null, `✕: the operators of the refused pass count half (${JSON.stringify(r.vw)})`);
  }

  // ---------- live ----------
  if (has('live')) {
    await ev(async () => { const M = window.__M; await M.hxWerk(); });
    r = await ev(async () => {
      const M = window.__M, A = M.A, out = {};
      for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'v.human': 0 })) M.setParam(k, v);
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
      window.__grid(120); await window.__sleep(700);
      const beat = 0.5, t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat / 2, [5, 7, 9, 6, 8, 7, 5, 9, 6, 7, 8, 5, 9, 7, 6, 5], 1, { eng: 'glo', dur: 0.2 });
      await window.__until(t0 + 8 * beat + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      out.notes = S.wn ? S.wn.n.length : 0;
      // the passes the realms render: their notes, by pass
      const jobs = new Map(), pick = (R) => { if (!R || !R.port || R.__p) return; R.__p = true; const post = R.port.postMessage.bind(R.port); R.port.postMessage = (m, tr) => { if (m && m.job === 'wuchs' && m.port && m.keep) jobs.set(+m.keep.split(':').pop(), m.notes.map((n) => [n.t0, n.f])); return post(m, tr); }; };
      const tap = () => { pick(M.HXW); for (const R of M.HXW.pool) pick(R); };
      tap();
      M.hxWSet(L, 'eig', 'variieren');
      for (let i = 0; i < 260 && jobs.size < 5; i++) { tap(); await window.__sleep(100); }
      out.eig = L.eig; out.word = M.hxWWord(L); out.jobs = jobs.size;
      const ks = [...jobs.keys()].sort((a, b) => a - b), seq = ks.map((k) => jobs.get(k));
      // strong notes (on the 1 and the middle) in every pass: their times and pitches
      const strongOf = (ns) => ns.filter(([t]) => { const b = t / beat, p = Math.round(b * 4) % 16; return Math.abs(b * 4 - Math.round(b * 4)) < 0.2 && (p === 0 || p === 8); }).map(([t, f]) => Math.round(t * 1000) + ':' + f.toFixed(2)).sort().join(',');
      out.strong = seq.map(strongOf); out.distinct = new Set(seq.map((x) => JSON.stringify(x.map(([t, f]) => [t.toFixed(4), f.toFixed(2)])))).size;
      // every pitch one of the field's scale (any octave)
      const pcs = M.N.notes.map((n) => n.f); out.offScale = seq.flat().filter(([, f]) => !pcs.some((g) => Math.abs(1200 * Math.log2(f / g)) % 1200 < 1 || Math.abs(1200 * Math.log2(f / g)) % 1200 > 1199)).length;
      // Knospen: changed notes shown before they sound
      let kn = 0, lead = Infinity;
      for (let i = 0; i < 40; i++) { for (const b of M.HX.kn.values()) if (b.kind === 'var' && !b.__seen) { b.__seen = true; kn++; lead = Math.min(lead, b.t - Math.max(b.t0, A.ctx.currentTime)); } await window.__sleep(100); }
      out.kn = kn; out.knLead = lead;
      // ✓: the sounding varied pass becomes the anchor – its notes
      const vcK = () => { const C = S.vc; return C ? [...C.m.keys()] : []; };
      out.vc = vcK().length;
      await M.hxWLob(L);
      out.vn = S.anc && S.anc.vn ? S.anc.vn.length : 0; out.sigV = !!(S.anc && /:v\d+/.test(S.anc.sig || ''));
      // ✕: back to the anchor, the chain begins at it
      await window.__sleep(1500);
      M.HX.vw = {};
      const kH = M.hxPassK(L, Math.round(M.hxF(M.hxHeard())));
      const r0 = S.vc && S.vc.m.get(kH); out.ops = r0 ? r0.ops.slice() : [];
      M.hxWNein(L);
      out.neinK = L.nein && L.nein.k; const rn = S.vc && S.vc.m.get(L.nein.k + 1 === undefined ? 0 : (L.neinOps ? L.nein.k + 1 : -1));
      out.reset = !!(S.vc && [...S.vc.m.entries()].some(([k, v]) => k > kH && v.ops[0] === 'nein'));
      out.vw = Object.assign({}, M.HX.vw);
      // the Gärtner's density reaches the passes not yet rendered
      L.gdv = -1; for (const id of L.sch) { const X = M.HX.sch.get(id); if (X && X.vc) for (const k of [...X.vc.m.keys()]) if (k > kH + 2) X.vc.m.delete(k); }
      const W0 = M.hxWBase(L, S), n0 = W0.n.length; let sum = 0, cnt = 0; for (let k = kH + 3; k < kH + 23; k++) { sum += M.hxVarW(L, S, k, W0).n.length; cnt++; } out.thinMean = sum / cnt; out.n0 = n0; L.gdv = 0;
      // ⚓: the original, Treu
      M.hxWAnker(L); await window.__sleep(300);
      out.anker = L.eig; out.ancAfter = S.anc;
      out.errs = (M.HX.nan || []).length;
      await window.__reset();
      return out;
    });
    ok(r.notes >= 12 && r.eig === 'variieren' && r.jobs >= 5, `a loop of ${r.notes} notes at Variieren: its passes rendered one by one (${r.jobs} passes, „${r.word}“)`);
    ok(r.distinct >= 3, `…the passes differ (${r.distinct} different of ${r.jobs})`);
    ok(r.strong.every((s) => s === r.strong[0]) && r.strong[0].length > 0, `…the notes on the 1 and the middle of each bar are the same in every rendered pass`);
    ok(r.offScale === 0, `…every rendered pitch is one of the field's scale (${r.offScale} not)`);
    ok(r.kn > 0 && r.knLead > 0.5, `Knospen: ${r.kn} changed notes shown before they sound (the shortest at least ${r.knLead.toFixed(2)} s ahead – a bar is 2 s)`);
    ok(r.vn > 0 && r.sigV, `✓: the varied pass that sounded is the anchor – its ${r.vn} notes, the anchor's version made for them`);
    ok(r.reset && r.neinK != null, `✕: back to the anchor at the next bar line, the chain of passes begins at the anchor`);
    ok(r.ops.length === 0 || Object.keys(r.vw).length > 0, `…the operators of the refused pass (${r.ops.join('+') || 'none – the pass had stayed'}) count half: ${JSON.stringify(r.vw)}`);
    ok(r.thinMean < r.n0, `the Gärtner's density (−1, making room) reaches the passes not yet rendered: ${r.thinMean.toFixed(1)} notes per pass against ${r.n0}`);
    ok(r.anker === 'treu' && !r.ancAfter, `⚓: back to the original at once (Treu, no anchor)`);
    ok(r.errs === 0, `no tripwire reports (${r.errs})`);
  }

  // ---------- persist ----------
  if (has('persist')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, out = {};
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      window.__grid(120); await window.__sleep(600);
      const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, 0.5, [5, 7, 9, 6], 1, { eng: 'glo', dur: 0.3 });
      await window.__until(t0 + 2.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 60 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      const mi = M.hxMi(L); mi.rolle = 'bass'; mi.wk = true; mi.gOff = true;
      S.anc = { aud: null, n: 0, len: 0, seed: 5, vn: S.wn.n.slice(0, 2) }; S.savedX = 99;
      const rec = M.hxRecOf(L), sn = M.hxSnap(L);
      out.rec = rec.mi; out.recVn = rec.sch[0].anc ? (rec.sch[0].anc.vn || []).length : -1; out.sn = sn.mi;
      S.anc = null;
      M.hxDelete(L); await window.__sleep(200);
      M.hxUndoStep(); await window.__sleep(300);
      const X = M.hxByKey(L.key); out.back = X ? Object.assign({}, X.mi) : null;
      await window.__reset();
      return out;
    });
    ok(r.rec && r.rec.rolle === 'bass' && r.rec.wk && r.rec.gOff && r.recVn === 2, `the loop's record keeps its role, „darf wiederkehren“, „Gärtner: nicht“ and the anchor's notes (${JSON.stringify(r.rec)}, ${r.recVn} notes)`);
    ok(r.back && r.back.rolle === 'bass' && r.back.wk && r.back.gOff, `deleted and brought back with ↶: the marks come back (${JSON.stringify(r.back)})`);
  }

  ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  const f = H.summary();
  await H.close();
  process.exit(f ? 1 : 0);
})();
