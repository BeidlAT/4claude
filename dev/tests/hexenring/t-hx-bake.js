// Hexenring – the bake (SPEC §9; tests §22): a Gespielt Schicht plays dry through the live chain (out 1) until the
// Werk-Rahmen has burnt the chain into it – the settings, changes and LFO phases of the recording – and its baked
// version is swapped in at a seam (out 0).
//  1 a loop recorded with the filter LFO sweeping an octave: its baked version holds the LFO where it was – its
//    envelope against what was heard then (the Alles ring: the live chain's output) correlates ≥ 0.99 (the dry one
//    does not); the first pass ran on out 1, the baked one on out 0
//  2 baked, the live chain no longer touches it: two passes sample for sample alike while the live filter, ring and
//    drive move (and while a preset loads); „folgt der Effektkette“ – dry through the live chain again: the filter moves it
//  3 the swap at a seam (out 1 → out 0, the processor offline): third difference ≤ 1.5 × mid-pass, short-term RMS
//    within ±1 dB of the two sides; and live, the loop's level through every seam of its first passes steady (±1 dB)
//   node t-hx-bake.js
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ init: () => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); }; } });   // (the underrun guard held back: on a loaded test machine it lets Taumeln rest – t-hx-guard tests it)
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(async () => {
    const M = window.__M;
    await M.hxWerk();
    // a recorder that also knows the frame it started at (the processor's frames ≈ the context's)
    await M.A.ctx.audioWorklet.addModule(window.__testUrl);
    window.__recOn = (node, out) => { const ctx = M.A.ctx, r = new AudioWorkletNode(ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; for (const o of [].concat(out || 0)) node.connect(r, o); r.connect(z).connect(ctx.destination); r.__t0 = ctx.currentTime; return r; };
    window.__db = (e) => e.map((x) => 20 * Math.log10(x + 1e-9));
    window.__env = (x, a, n, w) => { const e = []; for (let i = a; i + w <= a + n; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; e.push(Math.sqrt(s / w)); } return e; };
    window.__corr = (a, b) => { const n = Math.min(a.length, b.length); let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; ab += x * y; aa += x * x; bb += y * y; } return ab / Math.sqrt(aa * bb + 1e-30); };
    window.__flat = (ch, a, n) => { const L = new Float32Array(n), R = new Float32Array(n); for (let i = 0; i < n; i++) { const p = a + i, c = ch[Math.floor(p / 8192)]; if (c) { L[i] = c[0][p % 8192]; R[i] = c[1][p % 8192]; } } return [L, R]; };
  });

  // ---------- 1 · the LFO's phase burnt in ----------
  let r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 500, 'flt.q': 4, 'flt.lfoRate': 0.9, 'flt.lfoDepth': 1, 'drv.mix': 0, 'rng.mix': 0, 'pha.mix': 0, 'cho.mix': 0, 'mov.pan': 0, 'neb.wave': 'sawtooth' })) M.setParam(k, v);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    window.__grid(120);
    await window.__sleep(1500);
    // a held chord on the field (begun a second before), two bars from a bar line
    const t0 = M.tgTime(Math.ceil(M.tgBeat(ctx.currentTime + 1.2) / 4) * 4), vs = [0, 2, 4].map((d) => M.playNote('neb', t0 - 1, M.N.notes[Math.min(M.N.notes.length - 1, 5 + d)].f, 0.55, 0.7, { bus: M.stripIn('fin') }));
    await window.__until(t0 + 4 + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
    const S = L && M.HX.sch.get(L.sch[0]);
    const o = { made: !!S, out0: S && S.out, chain: S && S.chain, bars: L && L.d.beats / 4 };
    // what was heard then: the Alles ring over the window (the live chain's output; nothing else plays)
    const al = await M.hxGrab({ in: 1, f0: S.cut.w0, f1: S.cut.w1 });
    for (let i = 0; i < 160 && !S.baked; i++) await window.__sleep(100);
    for (const v of vs) if (v && v.release) v.release();
    o.baked = !!S.baked; o.out1 = S.out;
    if (!S.bak) return o;
    const n = S.len, [bL] = window.__flat(S.bak, S.pre, n), [dL] = window.__flat(S.aud, S.pre, n), [aL] = window.__flat(al.chunks, 0, n), W = Math.round(0.01 * SR);
    const eb = window.__env(bL, 0, n, W), ed = window.__env(dL, 0, n, W), ea = window.__env(aL, 0, n, W);
    // the chain's own swing (heard − dry, dB) against the bake's (baked − dry): the LFO where it was; half an LFO period
    // off it would be the opposite
    const gH = window.__db(ea).map((x, i) => x - window.__db(ed)[i]), gB = window.__db(eb).map((x, i) => x - window.__db(ed)[i]);
    o.cb = window.__corr(gB.slice(5), gH.slice(5));
    o.cd = Math.max(...[15, 20, 25, 30, 35, 40].map((hp) => window.__corr(gB.slice(5, gB.length - hp), gH.slice(5 + hp))));   // (the LFO 0.15–0.4 s off)
    let d = 0, s = 0; for (let i = 0; i < n; i++) { d += (bL[i] - aL[i]) ** 2; s += aL[i] * aL[i]; }
    o.null = 10 * Math.log10(d / s + 1e-30);
    o.swing = Math.max(...gH.slice(5)) - Math.min(...gH.slice(5));
    o.key = L.key;
    return o;
  });
  ok(r.made && r.chain && r.out0 === 1, `a Gespielt harvest through the chain (${r.bars} bars): its first pass plays dry through the live chain (out ${r.out0})`);
  ok(r.baked && r.out1 === 0, `…baked in the Werk-Rahmen, it plays burnt in from a seam (out ${r.out1})`);
  ok(r.cb >= 0.99 && r.swing > 6 && r.cd < 0.8, `the filter LFO (±1 octave, 0.9 Hz) keeps the recorded phase: the chain's envelope (dB, 10 ms) in the baked version against the one heard then ${r.cb && r.cb.toFixed(4)} (≥ 0.99; it swings ${r.swing && r.swing.toFixed(1)} dB – 0.15 to 0.4 s off it would be ${r.cd && r.cd.toFixed(2)} at best)`);
  console.log(`INFO the baked against the live chain's output, sample for sample: ${r.null && r.null.toFixed(1)} dB`);

  // ---------- 2 · baked: the live chain and presets no longer touch it; „folgt“ follows ----------
  r = await ev(async (key) => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, L = M.hxByKey(key), S = M.HX.sch.get(L.sch[0]), out = {};
    const pass = async (fn) => {   // a whole pass of out 0 (the recorder knows its frames), the changes made in the pass before it
      const k0 = L.k; while (L.k === k0) await window.__sleep(10);
      const rec = window.__recOn(M.HX.node, 0);
      if (fn) fn();
      const kA = L.k; while (L.k === kA) await window.__sleep(10);
      const kB = L.k, fB = M.hxPassF(L, kB), fE = M.hxPassF(L, kB + 1);
      while (L.k === kB) await window.__sleep(10);
      await window.__sleep(150);
      const g = await window.__recGet(rec); M.HX.node.disconnect(rec);
      return { L: g.L, a: fB - g.f0, n: fE - fB };
    };
    const same = (p, q) => { const n = Math.min(p.n, q.n); let d = 0, pk = 0; for (let i = 0; i < n; i++) { d = Math.max(d, Math.abs(p.L[p.a + i] - q.L[q.a + i])); pk = Math.max(pk, Math.abs(p.L[p.a + i])); } return { diff: d, pk, n }; };
    const p1 = await pass(), p2 = await pass(() => { M.setParam('flt.lfoDepth', 0); M.setParam('flt.freq', 300); M.setParam('flt.q', 9); M.setParam('rng.mix', 0.8); M.setParam('rng.freq', 410); M.setParam('drv.mix', 0.7); M.setParam('drv.amt', 0.8); });
    out.chain = same(p1, p2);
    // „folgt der Effektkette“: dry through the live chain – the strip hears it move with the filter
    for (const [k, v] of Object.entries({ 'rng.mix': 0, 'drv.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 400, 'flt.q': 1, 'flt.lfoDepth': 0, 'rev.mix': 0, 'dly.mix': 0, 'mov.vib': 0, 'mov.drift': 0 })) M.setParam(k, v);
    M.hxFolgt(L, true);
    for (let i = 0; i < 80 && S.out !== 1; i++) await window.__sleep(50);
    const cen = async () => {   // the strip's input over 1.5 s: its brightness (the slope's energy against the signal's: ∝ the spectral centroid)
      const rec = window.__recOn(M.MIX.s.hxr.in); await window.__sleep(1500); const g = await window.__recGet(rec); M.MIX.s.hxr.in.disconnect(rec);
      let d = 0, e = 0; for (let i = 1; i < g.L.length; i++) { d += (g.L[i] - g.L[i - 1]) ** 2; e += g.L[i] * g.L[i]; } return { zc: Math.sqrt(d / (e + 1e-30)) * SR / (2 * Math.PI), rms: Math.sqrt(e / g.L.length) };
    };
    await window.__sleep(M.hxLen(L) * 1000 + 300);
    out.f400 = await cen(); M.setParam('flt.freq', 6000); await window.__sleep(200); out.f6k = await cen();
    out.folgt = S.out;
    M.hxFolgt(L, false);
    for (let i = 0; i < 100 && S.out !== 0; i++) await window.__sleep(50);
    out.back = S.out;
    // (the swap back to the baked version sounds at a seam with its crossfade: the passes compared below come after it –
    // „folgt“ switched off just before a seam put the swap on the first one's start, its first X frames the crossfade)
    while (S.swapF != null && M.hxF(ctx.currentTime) < S.swapF + S.X + 128) await window.__sleep(20);
    M.hxTaumelnSet(L, false);   // (a preset may bring its own drift: a loop that taumelt follows it – on purpose)
    M.hxTempo(M.tgBpm(ctx.currentTime));   // (the loop gives the tempo: a preset leaves it – SPEC §2)
    if (M.hxWSet) M.hxWSet(L, 'ton', 'fest');   // (step 2a: a loop with notes follows a preset's key – SPEC §10.4 –; fest: the chain alone is tested here)
    M.setParam('ui.tonart', 'preset');   // (owner, 27.10.2026: by default the loops follow the preset's key – „fest“ then grows them anew in it; here the preset fits itself to the loops)
    const p0 = await pass(), p3 = await pass(() => M.loadPreset(M.PRESETS[3]));
    out.preset = same(p0, p3);
    return out;
  }, r.key);
  ok(r.chain.diff < 1e-6 && r.chain.pk > 0.01, `baked: a pass after the live filter (LFO off, 300 Hz, Q 9), the ring (80 %) and the drive (70 %) moved equals the one before, sample for sample (${r.chain.n} frames, largest difference ${r.chain.diff.toExponential(1)}, peak ${r.chain.pk.toFixed(3)})`);
  ok(r.preset.diff < 1e-6, `…and a pass while a preset loads (${r.preset.diff.toExponential(1)})`);
  ok(r.folgt === 1 && r.f6k.zc > 2 * r.f400.zc, `„folgt der Effektkette“: out ${r.folgt}, dry through the live chain – the filter 400 Hz → 6 kHz moves it (its brightness ${r.f400.zc.toFixed(0)} → ${r.f6k.zc.toFixed(0)} Hz)`);
  ok(r.back === 0, `…and back: burnt in again (out ${r.back})`);
  await ev(async () => { await window.__reset(); });

  // ---------- 3 · the swap at a seam ----------
  // (a) offline: the processor plays a Schicht dry on out 1 through a filter (the chain) and swaps in its filtered
  // version on out 0 at a seam – the sum of both outputs through the swap
  r = await ev(async () => {
    const M = window.__M, SR = 48000, BPM = 90, P = Math.round(8 * SR * 60 / BPM), pre = 4800, post = SR, n = pre + P + post, out = {};
    const d3 = (y, i) => Math.abs(y[i] - 3 * y[i - 1] + 3 * y[i - 2] - y[i - 3]);
    const fn = (t) => 0.3 * Math.sin(2 * Math.PI * 211.3 * t) + 0.2 * Math.sin(2 * Math.PI * 317.1 * t + 1) + 0.15 * Math.sin(2 * Math.PI * 1201.7 * t + 2) + 0.1 * Math.sin(2 * Math.PI * 2903.3 * t);
    const dry = window.__chunks(n, (i) => fn((i - pre) / SR), (i) => fn((i - pre) / SR + 0.0011));
    // the "chain": a low-pass at 900 Hz; the baked version = the dry one through the same filter, offline
    const filt = async (ch) => { const c = new OfflineAudioContext(2, n, SR), b = c.createBuffer(2, n, SR); for (let k = 0; k < 2; k++) { const x = b.getChannelData(k); for (let i = 0; i < n; i++) x[i] = window.__read(ch, i)[k]; } const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.frequency.value = 900; s.connect(f).connect(c.destination); s.start(0); const o = await c.startRendering(); return window.__chunks(n, (i) => o.getChannelData(0)[i], (i) => o.getChannelData(1)[i]); };
    const bak = await filt(dry);
    for (const X of [480, 1920]) {
      const ctx = await window.__ringCtx(Math.ceil(5 * P + SR), SR), at = 2 * P;
      const kc = (ch) => M.hxSeamK((j) => window.__read(ch, pre + P + j), (j) => window.__read(ch, pre + j), X);   // (the app's own: hxSeamOf)
      const ring = window.__ring(ctx, { msgs: [{ seg: [[0, 0, SR * 60 / BPM]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: dry, n, pre, len: P, join: 'xf', X, rho: 0, kc: kc(dry), fin: X, out: 1 } },
        { replace: { loop: 1, schicht: 1, chunks: bak, n, pre, len: P, f: at, join: 'xf', X, rho: 0, kc: kc(bak), out: 0 } }] });
      const f = ctx.createBiquadFilter(); f.frequency.value = 900;
      const sum = ctx.createGain(); ring.connect(sum, 0); ring.connect(f, 1); f.connect(sum);
      const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
      sum.connect(rec); rec.connect(ctx.destination);
      await ctx.startRendering();
      const { L } = await window.__recGet(rec), b = (j) => window.__read(bak, j)[0];
      let pk = 0, mid = 0; for (let i = at - 144; i < at + X + 144; i++) pk = Math.max(pk, d3(L, i)); for (let i = Math.round(1.5 * P) - 4000; i < Math.round(1.5 * P) + 4000; i++) mid = Math.max(mid, d3(L, i));
      const A = (F) => b(pre + F - P), B = (F) => b(pre + F - at);   // the pass that ended going on (through the chain ≈ its baked self), the new pass
      const w = (i, g) => { let q = 0; for (let j = i; j < i + 480; j++) { const x = g ? g(j) : L[j]; q += x * x; } return Math.sqrt(q / 480); };
      let lo = 0, hi = 0; for (let i = at - 480; i < at + X + 480; i += 120) { const o = w(i), a = w(i, A), bb = w(i, B); lo = Math.min(lo, 20 * Math.log10(o / Math.min(a, bb))); hi = Math.max(hi, 20 * Math.log10(o / Math.max(a, bb))); }
      let late = 0; for (let i = at + 4 * X; i < at + 20000; i++) late = Math.max(late, Math.abs(L[i] - b(pre + i - at)));
      out[X / 48 + ' ms'] = { d3: +(pk / mid).toFixed(3), lo: +lo.toFixed(2), hi: +hi.toFixed(2), late };
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) ok(v.d3 <= 1.5 && v.lo >= -1 && v.hi <= 1 && v.late < 1e-5, `the swap out 1 → out 0 at a seam (${k}): third difference ${v.d3}× mid-pass (≤ 1.5), short-term RMS ${v.lo} … +${v.hi} dB of the two sides (±1), then the baked version alone (${v.late.toExponential(1)})`);
  // (b) live: a loop's first passes – dry, the swap, baked: both outputs recorded at the processor's frames; at every warm
  // seam the short-term RMS stays between the two sides' own (the Schicht's audio there: the version each side plays)
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 2500, 'flt.q': 1, 'flt.lfoDepth': 0, 'drv.mix': 0, 'rng.mix': 0, 'neb.wave': 'sawtooth', 'neb.att': 0.05, 'hx.laenge': 'fest', 'hx.festT': 1 })) M.setParam(k, v);
    window.__grid(120);
    await window.__sleep(1200);
    const t0 = M.tgTime(Math.ceil(M.tgBeat(ctx.currentTime + 0.2) / 4) * 4), vs = [0, 2, 4].map((d) => M.playNote('neb', t0 - 1, M.N.notes[4 + d].f, 0.55, 0.7, { bus: M.stripIn('fin') }));
    await window.__until(t0 + 2 + 0.05);
    const rec = window.__recOn(M.HX.node, [0, 1]);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 160 && !S.baked; i++) await window.__sleep(100);
    await window.__sleep(M.hxLen(L) * 1000 * 2.5);
    for (const v of vs) if (v && v.release) v.release();
    const g = await window.__recGet(rec); M.HX.node.disconnect(rec);
    // (both channels: the seam law holds the stereo short-term power – SPEC §7 –, one channel alone dips or bulges with the
    // material's inter-channel correlation; measured: the output equals the law sample for sample, 3e-8)
    const at = (ch, i) => window.__read(ch, i), y = [g.L, g.R], X = S.X, z = S.zo || 0, W = Math.round(0.01 * SR);
    const out = { join: S.join, X, zo: z, baked: !!S.baked, seams: [] };
    const seen = new Set();
    for (const [k, f] of L.ps) {
      if (k < 1 || seen.has(k)) continue; seen.add(k);
      const s = f - g.f0, prev = M.hxPassF(L, k - 1), pe = f - prev;   // (the pass that ended: its read position at its end)
      if (s < 3 * W || s + z + X + 3 * W > y[0].length) continue;
      const swap = S.swapF != null && Math.abs(f - S.swapF) <= 1, before = S.swapF != null && f < S.swapF - 1;
      const vA = swap || before ? S.aud : S.bak, vB = before ? S.aud : S.bak;   // (the side going on, the side coming in)
      const A2 = (j) => at(vA, S.pre + pe + j), B2 = (j) => at(vB, S.pre + j);
      const w = (i, fn) => { let q = 0; for (let j = i; j < i + W; j++) { const x = fn ? fn(j) : [y[0][s + j], y[1][s + j]]; q += x[0] * x[0] + x[1] * x[1]; } return Math.sqrt(q / (2 * W)); };
      let lo = 0, hi = 0;
      for (let i = z - W; i < z + X + W; i += 120) { const o = w(i), ra = w(i, A2), rb = w(i, B2); if (Math.max(ra, rb) < 1e-5) continue; lo = Math.min(lo, 20 * Math.log10(o / Math.min(ra, rb))); hi = Math.max(hi, 20 * Math.log10(o / Math.max(ra, rb))); }
      out.seams.push({ k, swap, lo: +lo.toFixed(2), hi: +hi.toFixed(2) });
    }
    return out;
  });
  const sw = r.seams.filter((x) => x.swap), all = r.seams;
  ok(r.baked && r.join === 'xf' && all.length >= 2 && sw.length === 1 && all.every((x) => x.lo >= -1 && x.hi <= 1), `live: ${all.length} warm seams of a new loop (X ${r.X} frames, zo ${r.zo}; dry, the swap to its baked version, baked) – short-term RMS within ${Math.min(...all.map((x) => x.lo))} … +${Math.max(...all.map((x) => x.hi))} dB of the two sides' own (±1)`);

  // ---------- 4 · Taumeln: a held A4 in a loop against the same note live ----------
  // (a plain sine on the field's strip, bent by the shared drift as every voice is; the drift sped up so it moves several
  // cents within a pass. The beat = the slope of the two tones' phase difference, per second inside each pass.)
  await ev(async () => { await window.__reset(); });
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, out = {};
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 8, 'mov.driftRate': 2.5, 'rev.mix': 0, 'dly.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 18000, 'flt.q': 0.7, 'flt.lfoDepth': 0, 'drv.mix': 0, 'rng.mix': 0, 'pha.mix': 0, 'cho.mix': 0, 'mov.pan': 0, 'hx.laenge': 'fest', 'hx.festT': 2 })) M.setParam(k, v);
    await window.__sleep(400);
    const tone = (dst) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 440; o.detune.automationRate = 'k-rate'; A.pitchMod.connect(o.detune); g.gain.value = 0.2; o.connect(g).connect(dst); o.start(); return o; };
    const src = tone(M.stripIn('fin'));
    window.__grid(120);
    await window.__sleep(4600);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
    if (L) M.hxTaumelnSet(L, true);   // (since 27.10.2026 Taumeln is a choice, off by default – here it is chosen)
    await window.__sleep(300); src.stop(); A.pitchMod.disconnect(src.detune);
    for (let i = 0; i < 160 && !S.baked; i++) await window.__sleep(100);
    const live = ctx.createGain();
    const lt = tone(live);
    const beat = async (sec) => {
      const rl = window.__recOn(M.HX.node, [0, 1]), rv = window.__recOn(live);
      await window.__sleep(sec * 1000);
      const a = await window.__recGet(rl), b = await window.__recGet(rv); M.HX.node.disconnect(rl); live.disconnect(rv);
      const d = b.f0 - a.f0, n = Math.min(a.L.length, b.L.length + d) - 1, w = 2 * Math.PI * 440 / SR, H = Math.round(0.02 * SR);   // (frame a.f0 + k is b's k − d)
      // the phase of each against 440 Hz, every 20 ms (quadrature, a 40-ms Hann), and their difference unwrapped
      const ph = (x, o, i) => { let re = 0, im = 0; for (let j = -H; j < H; j++) { const k = i + j, h = 0.5 + 0.5 * Math.cos(Math.PI * j / H), v = x[o + k] || 0; re += h * v * Math.cos(w * k); im -= h * v * Math.sin(w * k); } return Math.atan2(im, re); };
      const seams = L.ps.map(([, f]) => f - a.f0), pts = [];
      let prev = null, acc = 0;
      for (let i = H + Math.max(0, d); i < n - H; i += H) {
        let dp = ph(a.L, 0, i) - ph(b.L, -d, i);
        if (prev != null) { while (dp - prev > Math.PI) dp -= 2 * Math.PI; while (dp - prev < -Math.PI) dp += 2 * Math.PI; }
        prev = dp; pts.push([i, dp]);
      }
      // the slope inside each second that holds no seam (± 60 ms)
      const slopes = [];
      for (let s0 = 0; s0 + SR <= n; s0 += SR / 2) {
        if (seams.some((f) => f > s0 - 0.06 * SR && f < s0 + SR + 0.06 * SR)) continue;
        const q = pts.filter(([i]) => i >= s0 && i < s0 + SR); if (q.length < 20) continue;
        let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const [i, y] of q) { sx += i; sy += y; sxx += i * i; sxy += i * y; }
        const m = (q.length * sxy - sx * sy) / (q.length * sxx - sx * sx);
        slopes.push(Math.abs(m * SR / (2 * Math.PI)));
      }
      return slopes;
    };
    out.on = await beat(9);
    M.hxTaumelnSet(L, false); await window.__sleep(300);
    out.off = await beat(9);
    lt.stop(); A.pitchMod.disconnect(lt.detune);
    out.drift = [-M.P['mov.drift'], M.P['mov.drift']]; out.rs = M.HX.rs;
    M.setParam('mov.drift', M.PD['mov.drift'].d); M.setParam('mov.driftRate', M.PD['mov.driftRate'].d);
    return out;
  });
  const mx = (a) => (a.length ? Math.max(...a) : NaN);
  ok(r.on.length >= 4 && mx(r.on) < 0.3, `Taumeln on: a held A4 in the loop against the same note live beats ${mx(r.on).toFixed(3)} Hz at most (< 0.3; ${r.on.length} seconds measured, the drift ±${r.drift[1]} ct at 2.5 Hz)`);
  ok(r.off.length >= 4 && mx(r.off) > 0.5, `…Taumeln off: it keeps its recorded tuning – up to ${mx(r.off).toFixed(2)} Hz of beating against the live note`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
