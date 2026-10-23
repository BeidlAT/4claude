// ---- Ohr a) Takt finden (research/intelligence.md §5.1a): a window of length L with its onsets → candidates
// {n beats, m meter, bars, bpm, S, fit}, best first; clarity = how well the best grid holds the onsets ----
function hxTaktFinden(ons, L) {
  const pts = ons.filter((o) => o.t >= -0.03 && o.t < L - 0.02);
  if (pts.length < 3 || L < 0.6) return { cands: [], clarity: 0 };
  const sig = 0.025, w = pts.map((o) => 0.4 + 0.6 * clamp(o.v, 0, 1)), W = w.reduce((a, b) => a + b, 0), TP0 = hxTempoPrior();
  const lowF = pts.map((o) => o.f).sort((a, b) => a - b)[Math.floor(pts.length / 2)];
  const acc = pts.map((o, i) => w[i] + (o.f < lowF ? 0.15 : 0));
  const accMean = acc.reduce((a, b) => a + b, 0) / acc.length;
  const ioi = []; for (let i = 1; i < pts.length; i++) { const d = pts[i].t - pts[i - 1].t; if (d > 0.06 && d < 2.5) ioi.push(d); }
  const near = (t, g) => { const k = Math.round(t / g); return t - k * g; };
  const out = [];
  for (const m of [4, 3]) for (let n = m; n <= 64; n += m) {
    const bpm = (60 * n) / L;
    if (bpm < 40 || bpm > 220) continue;
    const T = L / n, bars = n / m;
    // onsets near the beat or its subdivisions (÷2, ÷3, ÷4 weigh less)
    let fit = 0, fitB = 0;
    pts.forEach((o, i) => {
      let best = 0;
      for (const [d, c] of [[1, 1], [2, 0.8], [4, 0.55], [3, 0.5]]) { if (T / d < 0.07) continue; const e = near(o.t, T / d), s = c * Math.exp(-(e * e) / (2 * sig * sig)); if (s > best) best = s; }
      const eb = near(o.t, T); fitB += w[i] * Math.exp(-(eb * eb) / (2 * sig * sig));
      fit += w[i] * best;
    });
    fit /= W; fitB /= W;
    // the IOIs agree with T, T/2, 2T
    let ia = 0;
    for (const d of ioi) { let b = 0; for (const [k, c] of [[1, 1], [0.5, 0.8], [2, 0.7], [0.25, 0.5], [1.5, 0.4]]) { const r = Math.log(d / (k * T)); b = Math.max(b, c * Math.exp(-(r * r) / (2 * 0.08 * 0.08))); } ia += b; }
    ia = ioi.length ? ia / ioi.length : 0;
    // accents (loud, low) on the downbeats
    let ad = 0, an = 0;
    pts.forEach((o, i) => { const e = near(o.t, m * T); if (Math.abs(e) < 0.06) { ad += acc[i]; an++; } });
    const accent = an ? ad / an - accMean : -0.2;
    const tp = -Math.pow(Math.log(bpm / TP0), 2) / (2 * 0.45 * 0.45);   // (Etappe 3: the Handschrift's tempo, else 100)
    const bp = ([1, 2, 4, 8].includes(bars) ? 0 : [3, 6, 16].includes(bars) ? -0.7 : -1.5) + (m === 3 ? -0.4 : 0);
    const S = 3 * fit + 0.6 * fitB + 1.5 * ia + 4 * accent + 0.3 * tp + 0.6 * bp;   // (accents decide most octave doubts; the tempo prior only leans – weights fitted on t-hx-ohr's phrases)
    out.push({ n, m, bars, bpm, S, fit, fitB });
  }
  out.sort((a, b) => b.S - a.S);
  const top = out[0];
  // (step 1c) the margin: how far the best reading stands above the next one of another pulse – the same grid at half
  // or double tempo, or in another metre, is no rival (the corrections offer it); a few free notes fit many grids alike
  const rival = top && out.find((c) => { const l = Math.log2(c.n / top.n); return Math.abs(l - Math.round(l)) > 1e-6; });
  return { cands: out, clarity: top ? 0.5 * top.fit + 0.5 * top.fitB : 0, margin: top ? (rival ? top.S - rival.S : Infinity) : 0 };
}
// the best candidate's exact length: the onsets near beats and half beats fitted through the window's start
function hxTaktLen(ons, L, c) {
  const T0 = L / c.n, h = T0 / 2;
  let num = 0, den = 0;
  for (const o of ons) { if (o.t < -0.03) continue; const k = Math.round(o.t / h); if (k <= 0 || Math.abs(o.t - k * h) > 0.06) continue; num += o.t * k; den += k * k; }
  const T = den ? (2 * num) / den : T0;
  return clamp(T * c.n, L * 0.92, L * 1.08);
}
const HX_CLEAR = 0.55, HX_MARGIN = 0.8;   // pulse clarity below this, or a rival reading this close: the loop runs frei
// (the margin fitted on t-hx-ohr's 360 phrases – it keeps 291 of the 292 clear ones – and 2000 free phrases of 3–6
// notes: a chance grid 548 → 232 times; 3 notes stay the hardest – a bar of three quarters must still read)
const hxTaktOk = (tk) => !!tk.cands[0] && tk.clarity >= HX_CLEAR && tk.margin >= HX_MARGIN;

// ---- Ohr b) Wiederholung: the newest events repeat the cycle before them (same degrees or same intervals, every
// IOI within ±15 %), over ≥ 5 events and ≥ 1 s. → {p (s), m (events), c0 (start of the running cycle), c1 (its end
// if complete), evs} or null. `ref`: compare with the start of a take instead (auto-close) ----
function hxWiederholung(ons, ref) {
  const n = ons.length;
  if (n < 6) return null;
  const same = (a, b, A, B) => {
    if (a.d.length !== b.d.length) return false;
    if (a.d.every((x, i) => x === b.d[i])) return true;
    const ia = a.d[0] - A.d[0], ib = b.d[0] - B.d[0];   // the same interval from the event before (transposed)
    return ia === ib && a.d.every((x, i) => x - a.d[0] === b.d[i] - b.d[0]);
  };
  const ioiOk = (x, y) => { const r = x / y; return r > 0.85 && r < 1.0 / 0.85; };
  if (ref) {   // the take's start: does the suffix repeat its first events?
    for (let k = Math.min(n - 1, 24); k >= 5; k--) {
      const s0 = n - k;
      if (s0 < k) continue;
      let okk = true;
      for (let i = 0; i < k && okk; i++) { const a = ons[s0 + i], b = ons[i]; okk = a.d.length === b.d.length && (i === 0 ? a.d.every((x, j) => x - a.d[0] === b.d[j] - b.d[0]) : same(a, b, ons[s0 + i - 1], ons[i - 1]) && ioiOk(a.t - ons[s0 + i - 1].t, b.t - ons[i - 1].t)); }
      if (okk && ons[n - 1].t - ons[s0].t >= 1) return { p: ons[s0].t - ons[0].t, m: s0, c0: ons[s0].t, c1: null, ref: true };
    }
    return null;
  }
  for (let m = 1; m <= Math.min(48, n - 2); m++) {
    const k = Math.max(m, 5);
    if (n - k - m - 1 < 0) continue;
    const pair = (i) => same(ons[i], ons[i - m], ons[i - 1], ons[i - m - 1]) && ioiOk(ons[i].t - ons[i - 1].t, ons[i - m].t - ons[i - m - 1].t);
    let okk = true;
    for (let i = n - k; i < n && okk; i++) okk = pair(i);
    if (!okk || ons[n - 1].t - ons[n - k].t < 1) continue;
    const p0 = ons[n - 1].t - ons[n - 1 - m].t;
    if (p0 < 1 || p0 > 40) continue;
    // the repetition reaches back as far as each event matches the one a cycle later: its first event is the anchor
    // (the first note of the first repetition – the cycle's musical start); the period is the mean over the region
    let a = n - k - m;
    while (a - 1 >= 1 && a - 1 + m < n && pair(a - 1 + m)) a--;
    if (a >= 1 && ons[a - 1].d.join() === ons[a - 1 + m].d.join()) a--;   // (the first event's interval before it is the rest before the figure: its degree decides)
    let ps = 0, pn = 0; for (let i = a; i + m < n; i++) { ps += ons[i + m].t - ons[i].t; pn++; }
    const p = pn ? ps / pn : p0, last = ons[n - 1];
    // the gap expected after the newest event (as a cycle before): a rest much longer than it means the player stopped
    const nx = ons[n - m] && ons[n - m - 1] ? ons[n - m].t - ons[n - m - 1].t : p / m;
    return { p, m, anchor: ons[a].t, last: last.t, next: nx, evs: ons.slice(a) };
  }
  return null;
}

