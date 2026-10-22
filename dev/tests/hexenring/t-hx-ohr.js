// Hexenring – the Ohr's basics (SPEC §12.1 a/b; tests §22):
//  a) Takt finden on synthetic phrases at 60–180 BPM (1, 2, 4 bars; quarters, eighths, syncopes, sixteenths, sparse;
//     a waltz), every onset humanised by ±25 ms, the window's end off by up to ±40 ms (a tap is no metronome):
//     top-1 and top-3 rates, octave errors (half / double tempo) counted, the length fitted back to the bars;
//     rubato (random onsets) reads as low pulse clarity → frei; (step 1c) the margin: a reading of another pulse
//     scoring nearly as well → frei – short free phrases of 2–6 notes rarely find a chance grid, the phrases above keep
//     theirs
//  b) Wiederholung: a figure repeated (same degrees, or transposed: the same intervals), IOIs within ±15 %, at least 5
//     events and 1 s; not for a figure whose rhythm changes by 25 %, a random line, or too few events; „the start“
//  c) (step 1d) Auslese, Etappe 1: k ≥ 3 repetitions aligned by DTW on (onset, degree) – the consensus (clusters in
//     ≥ ⌈k/2⌉ of them, median timing), the agreement p (mean F-measure), the REAL repetition closest to it; a wrong note
//     or a sloppy cycle is not the one chosen, a missing note does not leave the consensus, unrelated cycles agree too
//     little, two are too few. Live: four repetitions played, the last one sloppy – the Korb takes it, the chip
//     „Auslese aus 4 · p %“ offers an earlier one (never by itself); tapped, that repetition's audio becomes the
//     Schicht at the next seam; ↶ brings the harvest back. A line that never repeats: no chip.
//   node t-hx-ohr.js
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
(async () => {
  const { page, errors } = await H.open({ start: false });
  const r = await page.evaluate(() => {
    const M = window.__M;
    let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const PAT = { quarters: [[0, 1, 2, 3], 4], eighths: [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 4], syncope: [[0, 0.75, 1.5, 2, 3, 3.5], 4], sparse: [[0, 1.5, 2, 3], 4], sixteenths: [[0, 0.25, 0.5, 1, 1.75, 2, 2.5, 3, 3.25], 4], waltz: [[0, 1, 2], 3] };
    const out = { n: 0, top1: 0, top3: 0, oct: 0, len: [], miss: [], byBpm: {} };
    for (const bpm of [60, 72, 84, 96, 108, 120, 135, 150, 165, 180]) for (const name in PAT) for (const bars of [1, 2, 4]) for (let rep = 0; rep < 2; rep++) {
      const [pat, m] = PAT[name], T = 60 / bpm, ons = [];
      for (let b = 0; b < bars; b++) pat.forEach((x, i) => {
        if (b === bars - 1 && i === pat.length - 1 && pat.length > 3 && rep) return;   // (a phrase ends a little different)
        const t = (b * m + x) * T + (rnd() * 2 - 1) * 0.025, down = x === 0, low = down && b % 2 === 0;
        ons.push({ t: Math.max(0, t), v: down ? 0.9 : 0.55 + 0.2 * rnd(), f: low ? 110 : 220 * (1 + rnd()), d: [i] });
      });
      ons.sort((a, b) => a.t - b.t);
      const Ltrue = bars * m * T, L = Ltrue + (rnd() * 2 - 1) * 0.04;
      const res = M.hxTaktFinden(ons, L), c = res.cands, want = bars * m;
      const hit = (x) => x && x.n === want && x.m === m;
      out.n++;
      if (res.clarity >= 0.55) { out.clr = (out.clr || 0) + 1; if (M.hxTaktOk(res)) out.kept = (out.kept || 0) + 1; }
      const k = c.findIndex(hit);
      if (k === 0) out.top1++; else out.miss.push([bpm, name, bars, c[0] && c[0].n + '/' + c[0].m + ' ' + c[0].bpm.toFixed(0), k]);
      if (k >= 0 && k < 3) out.top3++;
      if (c[0] && c[0].m === m && (c[0].n === want * 2 || c[0].n * 2 === want)) out.oct++;
      if (k === 0) out.len.push(Math.abs(M.hxTaktLen(ons, L, c[0]) - Ltrue) * 1000);
      const B = (out.byBpm[bpm] = out.byBpm[bpm] || [0, 0]); B[0]++; if (k === 0) B[1]++;
    }
    // rubato: onsets at random times – low clarity
    let rub = 0, rubN = 0;
    for (let i = 0; i < 40; i++) {
      const L = 3 + rnd() * 5, ons = []; for (let j = 0; j < 6 + Math.floor(rnd() * 8); j++) ons.push({ t: rnd() * (L - 0.1), v: 0.6, f: 220, d: [j] });
      ons.sort((a, b) => a.t - b.t);
      rubN++; if (!M.hxTaktOk(M.hxTaktFinden(ons, L))) rub++;
    }
    // short free phrases: 2–6 notes, every IOI free (0.12–1.2 s), the tap 0.3–1.5 s after the last – a grid only by chance
    const fr = { n: 0, cl: 0, takt: 0, byK: {} }; seed = 1234;
    for (let i = 0; i < 2000; i++) {
      const k = 2 + Math.floor(rnd() * 5), ons = []; let t = 0;
      for (let j = 0; j < k; j++) { ons.push({ t, v: 0.5 + 0.4 * rnd(), f: 110 * Math.pow(2, rnd() * 3), d: [j] }); t += 0.12 * Math.pow(10, rnd()); }
      const res = M.hxTaktFinden(ons, ons[k - 1].t + 0.3 + rnd() * 1.2), B = (fr.byK[k] = fr.byK[k] || [0, 0]);
      fr.n++; B[0]++;
      if (res.clarity >= 0.55) fr.cl++;
      if (M.hxTaktOk(res)) { fr.takt++; B[1]++; }
    }
    out.fr = fr;
    // the metric phrases above read clear
    let clr = 0; seed = 99;
    for (let i = 0; i < 40; i++) { const bpm = 70 + rnd() * 100, T = 60 / bpm, ons = []; for (let b = 0; b < 8; b++) ons.push({ t: b * T + (rnd() * 2 - 1) * 0.025, v: 0.7, f: 220, d: [b] }); if (M.hxTaktOk(M.hxTaktFinden(ons, 8 * T))) clr++; }
    // ---- b) Wiederholung ----
    const mk = (degs, iois, reps, o = {}) => { const a = []; let t = 0; for (let r = 0; r < reps; r++) degs.forEach((d, i) => { a.push({ t, d: [d + (o.tr && r ? o.tr : 0)], v: 0.7, f: 220 }); t += iois[i] * (o.stretch && r === reps - 1 ? o.stretch : 1) * (1 + (o.jit ? (rnd() * 2 - 1) * o.jit : 0)); }); return a; };
    const W = (a) => M.hxWiederholung(a);
    const fig = [0, 4, 2, 5, 4, 7], io = [0.25, 0.25, 0.5, 0.25, 0.25, 0.5];   // 2 s
    const b = {};
    b.same = W(mk(fig, io, 3));
    b.trans = W(mk(fig, io, 3, { tr: 2 }));
    b.jit = W(mk(fig, io, 3, { jit: 0.1 }));
    b.slow = W(mk(fig, io, 3, { stretch: 1.25 }));
    b.random = W(mk([0, 5, 2, 9, 1, 7, 3, 8, 4, 6, 11, 10, 2, 7, 5, 0, 9, 3], [0.3, 0.2, 0.45, 0.25, 0.35, 0.3, 0.2, 0.4, 0.3, 0.25, 0.35, 0.2, 0.3, 0.45, 0.25, 0.3, 0.2, 0.4], 1));
    b.short = W(mk([0, 4, 2], [0.1, 0.1, 0.1], 3));   // 3 events, 0.3 s: too small a figure – its repetition is found only as a multiple ≥ 1 s
    b.start = M.hxWiederholung(mk(fig, io, 2).slice(0, 11), true);   // (five events of the second cycle)
    return { a: out, rub, rubN, clr, b };
  });
  const a = r.a, pc = (x) => ((100 * x) / a.n).toFixed(1) + ' %';
  console.log('INFO Takt finden by tempo (top-1 of n):', JSON.stringify(a.byBpm));
  console.log('INFO misses (bpm, pattern, bars, top-1 n/m bpm, rank of the truth):', JSON.stringify(a.miss.slice(0, 30)));
  ok(a.top1 / a.n >= 0.8, `Takt finden, ${a.n} phrases at 60–180 BPM (±25 ms, the end ±40 ms): top-1 ${pc(a.top1)} (≥ 80 %)`);
  ok(a.top3 / a.n >= 0.95, `  top-3 ${pc(a.top3)} (≥ 95 %) – the corrections offer the next readings`);
  ok(a.oct / a.n <= 0.2, `  octave errors (top-1 at half or double tempo – an even line of eighths at 60 is a line of quarters at 120): ${pc(a.oct)} (≤ 20 %; „Tempo ½ · ×2“ fixes them in one tap, the truth is always among the first three)`);
  const lm = a.len.reduce((x, y) => x + y, 0) / a.len.length, lx = Math.max(...a.len);
  ok(lm < 15 && lx < 60, `  the length fitted from the onsets: mean ${lm.toFixed(1)} ms, max ${lx.toFixed(1)} ms off the true bars (the window's end was up to 40 ms off)`);
  ok(r.rub / r.rubN >= 0.85 && r.clr / 40 >= 0.9, `pulse clarity: rubato (random onsets) reads frei ${r.rub}/${r.rubN}, a steady line clear ${r.clr}/40`);
  const f = a.fr;
  console.log('INFO free phrases reading a Takt, by notes [n, takt]:', JSON.stringify(f.byK));
  ok(a.kept >= a.clr - 2, `the margin (a rival reading of another pulse within ${'0.8'}): the clear phrases above keep their Takt – ${a.kept} of ${a.clr}`);
  ok(f.takt / f.n <= 0.13 && f.takt < 0.5 * f.cl, `  ${f.n} short free phrases (2–6 notes): a chance grid ${f.takt} times (${(100 * f.takt / f.n).toFixed(1)} %; by clarity alone ${f.cl}) – the rest stays frei`);
  const b = r.b;
  ok(b.same && Math.abs(b.same.p - 2) < 0.01 && b.same.m === 6, `Wiederholung: a 6-note figure of 2 s, three times → cycle ${b.same && b.same.p.toFixed(3)} s, ${b.same && b.same.m} events`);
  ok(b.trans && Math.abs(b.trans.p - 2) < 0.01, '  transposed (the same intervals) – found');
  ok(b.jit && Math.abs(b.jit.p - 2) < 0.15, `  every IOI ±10 % – found (${b.jit && b.jit.p.toFixed(3)} s)`);
  ok(!b.slow || b.slow.p < 1.9, `  the last cycle 25 % slower – not a repetition of it (${b.slow ? 'found ' + b.slow.p.toFixed(2) + ' s' : 'none'})`);
  ok(!b.random, '  a line that never repeats – none');
  ok(!b.short || b.short.p >= 1, `  a figure under 1 s counts only as a multiple of ≥ 1 s (${b.short ? b.short.p.toFixed(2) + ' s' : 'none'})`);
  ok(b.start && Math.abs(b.start.p - 2) < 0.01, `  „the start“ (auto-close): the take's first events come again after ${b.start && b.start.p.toFixed(3)} s`);
  // ---- c) Auslese (pure) ----
  const c = await page.evaluate(() => {
    const M = window.__M;
    let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const FIG = [0, 2, 4, 5, 7, 5, 4, 2], cyc = (o = {}) => FIG.map((d, i) => ({ t: i * 0.25 + (o.late && i % 2 ? o.late : 0) + (rnd() - 0.5) * 0.01, d: o.wrong === i ? d + 1 : d, v: 0.7 })).filter((_, i) => o.miss !== i);
    const out = {};
    const a = M.hxAuslese([cyc(), cyc(), cyc({ wrong: 3 }), cyc({ late: 0.03 })]);
    out.a = a && { k: a.k, p: a.p, best: a.best, cons: a.cons.map((e) => e.d).join(','), dt: Math.max(...a.cons.map((e, i) => Math.abs(e.t - i * 0.25))) };
    const b = M.hxAuslese([cyc(), cyc({ miss: 5 }), cyc(), cyc()]);
    out.b = b && { k: b.k, p: b.p, best: b.best, n: b.cons.length };
    const rl = () => Array.from({ length: 6 + Math.floor(rnd() * 4) }, (_, i) => ({ t: i * 0.2 + rnd() * 0.15, d: Math.floor(rnd() * 12), v: 0.7 }));
    out.c = []; for (let i = 0; i < 20; i++) { const r = M.hxAuslese([rl(), rl(), rl(), rl()]); out.c.push(r ? r.p : 0); }
    out.d = M.hxAuslese([cyc(), cyc()]);
    const x = cyc(), y = M.hxDtw(x, x);
    out.e = { cost: y.cost, n: y.pairs.length };
    return out;
  });
  ok(c.e.cost === 0 && c.e.n === 8, `Auslese: DTW of a cycle with itself – cost 0, all 8 events paired`);
  ok(c.a && c.a.k === 4 && c.a.p >= 80 && c.a.cons === '0,2,4,5,7,5,4,2' && c.a.dt < 0.01 && c.a.best <= 1, `  4 repetitions, one with a wrong note, one sloppy (+30 ms): the consensus is the figure (median timing within ${c.a && (c.a.dt * 1000).toFixed(1)} ms), p = ${c.a && c.a.p} %, the closest real one is a clean one (#${c.a && c.a.best + 1})`);
  ok(c.b && c.b.n === 8 && c.b.best !== 1, `  a missing note: the consensus keeps it (${c.b && c.b.n} events), the one without it is not chosen (#${c.b && c.b.best + 1}, p = ${c.b && c.b.p} %)`);
  ok(c.c.every((p) => p < 80), `  unrelated cycles agree too little: p ≤ ${Math.max(...c.c)} % in 20 sets (offered from 80 %)`);
  ok(c.d === null, '  two repetitions are too few (k ≥ 3)');
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  // ---- c) Auslese, live: four repetitions, the last one sloppy ----
  {
    const BPM = 120;
    const { page, errors } = await G.open({ w: 1280, h: 800 });
    await page.evaluate(async (BPM) => { await window.__reset(); window.__grid(BPM); await window.__sleep(400); }, BPM);
    const play = (late, fig) => page.evaluate(async ([BPM, late, fig]) => {
      const M = window.__M, A = M.A, beat = 60 / BPM;
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, list = [];
      for (let c = 0; c < 4; c++) for (let i = 0; i < 8; i++) list.push([M.tgTime(B0 + 4 * c) + i * beat / 2 + (c === 3 && i % 2 ? late : 0), fig[c][i], i ? 0.6 : 0.9, 0.18]);
      window.__play(list, { eng: 'klb' });
      await window.__until(M.tgTime(B0 + 16) + 0.06);
      const n = M.hxLoopsLive().length;
      M.hxKorb(null);
      await window.__sleep(900);
      const L = M.hxLoopsLive().length > n ? M.hxLoopsLive().sort((a, b) => b.made - a.made)[0] : null, S = L && M.HX.sch.get(L.sch[0]);
      const chip = [...document.querySelectorAll('.hx-chip')].map((b) => b.textContent).find((t) => /^Auslese/.test(t)) || null;
      return { slot: L ? L.slot : -1, ausl: L && L.ausl, rep: !!(L && (L.rep || L.ausl)), w0: S && M.hxT(S.cut.w0), bar0: M.tgTime(B0 + 12), bars: [0, 1, 2].map((c) => M.tgTime(B0 + 4 * c)), chip };
    }, [BPM, late, fig]);
    const F = [0, 2, 4, 5, 7, 5, 4, 2];
    let r = await play(0.03, [F, F, F, F]);
    const a = r.ausl;
    ok(r.slot >= 0 && Math.abs(r.w0 - r.bar0) < 0.03, `Auslese live: four repetitions of a bar, the last one sloppy (every second note 30 ms late) – the Korb takes the last bar`);
    ok(a && a.k === 4 && a.p >= 80 && r.bars.some((t) => Math.abs(a.w0 - t) < 0.03) && r.chip === 'Auslese aus ' + a.k + ' · ' + a.p + ' %', `  the chip „${r.chip}“ offers an earlier, clean repetition (bar ${a ? r.bars.findIndex((t) => Math.abs(a.w0 - t) < 0.03) + 1 : '–'} of 4)`);
    ok(Math.abs(r.w0 - r.bar0) < 0.03, '  never by itself: the Schicht is still the harvested bar');
    const slot = r.slot, w0h = r.w0;
    r = await page.evaluate(async (slot) => {
      const M = window.__M, L = M.HX.loops.get(M.HX.slot[slot]), w = L.ausl && L.ausl.w0;
      const b = [...document.querySelectorAll('.hx-chip')].find((x) => /^Auslese/.test(x.textContent));
      if (b) b.click();
      await window.__sleep(2600);   // (swapped at the next seam)
      const S = M.HX.sch.get(L.sch[0]), o = { w, now: M.hxT(S.cut.w0), gone: !L.ausl };
      M.hxUndoStep(); await window.__sleep(2600);
      o.back = M.hxT(M.HX.sch.get(L.sch[0]).cut.w0);
      return o;
    }, slot);
    ok(r.w != null && Math.abs(r.now - r.w) < 0.005 && r.gone, `  tapped: that repetition's audio is the Schicht (from the Humus, at the next seam)`);
    ok(Math.abs(r.back - w0h) < 0.002, '  ↶: the harvested bar is back');
    // a line that never repeats: nothing to offer
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(2500); });
    r = await play(0, [[0, 3, 1, 4, 2, 6, 5, 7], [7, 2, 9, 1, 4, 4, 0, 3], [5, 1, 8, 2, 6, 0, 3, 9], [2, 7, 4, 9, 1, 5, 8, 0]]);
    ok(r.slot >= 0 && !r.ausl && !r.chip, '  a line that never repeats: no Auslese offered');
    ok(!errors.length, 'no page errors (live)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await H.close();
  }
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
