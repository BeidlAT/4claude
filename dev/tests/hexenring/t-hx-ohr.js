// Hexenring – the Ohr's basics (SPEC §12.1 a/b; tests §22):
//  a) Takt finden on synthetic phrases at 60–180 BPM (1, 2, 4 bars; quarters, eighths, syncopes, sixteenths, sparse;
//     a waltz), every onset humanised by ±25 ms, the window's end off by up to ±40 ms (a tap is no metronome):
//     top-1 and top-3 rates, octave errors (half / double tempo) counted, the length fitted back to the bars;
//     rubato (random onsets) reads as low pulse clarity → frei
//  b) Wiederholung: a figure repeated (same degrees, or transposed: the same intervals), IOIs within ±15 %, at least 5
//     events and 1 s; not for a figure whose rhythm changes by 25 %, a random line, or too few events; „the start“
//   node t-hx-ohr.js
const H = require('./hx-h');
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
      rubN++; if (M.hxTaktFinden(ons, L).clarity < 0.55) rub++;
    }
    // the metric phrases above read clear
    let clr = 0; seed = 99;
    for (let i = 0; i < 40; i++) { const bpm = 70 + rnd() * 100, T = 60 / bpm, ons = []; for (let b = 0; b < 8; b++) ons.push({ t: b * T + (rnd() * 2 - 1) * 0.025, v: 0.7, f: 220, d: [b] }); if (M.hxTaktFinden(ons, 8 * T).clarity >= 0.55) clr++; }
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
  const b = r.b;
  ok(b.same && Math.abs(b.same.p - 2) < 0.01 && b.same.m === 6, `Wiederholung: a 6-note figure of 2 s, three times → cycle ${b.same && b.same.p.toFixed(3)} s, ${b.same && b.same.m} events`);
  ok(b.trans && Math.abs(b.trans.p - 2) < 0.01, '  transposed (the same intervals) – found');
  ok(b.jit && Math.abs(b.jit.p - 2) < 0.15, `  every IOI ±10 % – found (${b.jit && b.jit.p.toFixed(3)} s)`);
  ok(!b.slow || b.slow.p < 1.9, `  the last cycle 25 % slower – not a repetition of it (${b.slow ? 'found ' + b.slow.p.toFixed(2) + ' s' : 'none'})`);
  ok(!b.random, '  a line that never repeats – none');
  ok(!b.short || b.short.p >= 1, `  a figure under 1 s counts only as a multiple of ≥ 1 s (${b.short ? b.short.p.toFixed(2) + ' s' : 'none'})`);
  ok(b.start && Math.abs(b.start.p - 2) < 0.01, `  „the start“ (auto-close): the take's first events come again after ${b.start && b.start.p.toFixed(3)} s`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
