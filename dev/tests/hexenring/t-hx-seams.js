// Hexenring – seams, complete (SPEC §7; tests §22):
//  1 the time-local level: Gong, Harz, Bordun and Böe material rendered by the app (10 random runs each), looped by the
//    processor with the seam's own gain curve (hxSeamK, as the page computes it): third difference ≤ 1.5 × the
//    material's own there (× the curve's largest gain: a level held through an anti-correlated fade lifts both sides –
//    a slow gain, no click) and mid-pass, the short-term level (10 ms, the stereo power) within ±1 dB of the two sides
//    through every seam, every run
//  2 cold and warm: a window that starts quiet takes its Ausklang overlap-added ('ola'), one that starts ringing the
//    crossfade ('xf', 40 ms for sustained sound); the first-pass rule – no Ausklang at the first seam, from the second on
//  3 the Ausklang until the first foreign onset: cut 5 ms before it (30-ms fade), then the rest rendered from the notes in
//    the Werk-Rahmen behind a 30-ms crossfade – its level continuous, ringing on; without notes the cut's fade only
//  4 the Auftakt: a pick-up before the 1 (after a rest) is laid onto the loop's end when the end holds no onset; with
//    onsets at the end it is offered as a chip „Auftakt anfügen“
//  5 Nahtwahl: inside a repetition the seam moves off an onset at the bar line (outside every onset's zone); a window
//    that does not repeat keeps its seam on the bar line
//  6 stop: a loop angehalten at its seam plays its stored Ausklang once
//   node t-hx-seams.js        env: RUNS=10, KINDS=gng,hrz,bor,boe, PARTS=123456, DBG=1 (the page's console)
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const RUNS = +process.env.RUNS || 10, KINDS = (process.env.KINDS || 'gng,hrz,bor,boe').split(','), PARTS = (process.env.PARTS || '123456').split('');
(async () => {
  const { page, errors } = await G.open({});
  const ev = (fn, a) => page.evaluate(fn, a);
  if (process.env.DBG) { page.on('console', (m) => console.log('  page:', m.text())); await ev(() => { window.__dbg = 1; }); }

  // ---------- 1 · the time-local level on real material ----------
  // (a page of its own: __off rebuilds the app's graph offline – the live parts run on the first page)
  const P1 = PARTS.includes('1') ? await G.open({}) : null;
  const mat = !P1 ? {} : await P1.page.evaluate(async ({ RUNS, KINDS }) => {
    const M = window.__M, SR = 48000, BPM = 84, P = 8 * SR * 60 / BPM, Pi = Math.round(P), pre = SR, out = {};
    const d3 = (y, i) => Math.abs(y[i] - 3 * y[i - 1] + 3 * y[i - 2] - y[i - 3]);
    let sx = 1; const rnd = () => { sx ^= sx << 13; sx ^= sx >>> 17; sx ^= sx << 5; return (sx >>> 0) / 4294967296; };
    async function material(kind, run) {
      sx = 7919 * (run + 1) + kind.charCodeAt(0);
      const prm = { 'dev.q': run % 2 ? '3' : '2', 'rev.mix': 0, 'dly.mix': 0, 'seq.bpm': BPM, 'v.human': 0, 'mov.vib': 0, 'mov.drift': 0 };
      if (kind === 'bor') Object.assign(prm, { 'bor.on': true, 'bor.lvl': 0.5, 'bor.oct': [2, 3][run % 2], 'bor.wave': ['sawtooth', 'sine', 'triangle', 'organ', 'glass'][run % 5], 't.root': String(Math.floor(rnd() * 12)) });
      else prm['v.eng'] = kind;
      const ctx = await window.__off(SR, 10, prm);
      if (M.WORKLET_ENGINES.has(kind)) await M.ensureDSP(ctx);
      const beat = 60 / BPM, degs = Array.from({ length: 16 }, () => Math.floor(rnd() * 8));
      // (one suspend per render quantum: a strike and a release in the same one share it)
      const at = new Map(), add = (t, fn) => { const q = Math.round(t * SR / 128); if (!at.has(q)) at.set(q, []); at.get(q).push(fn); };
      if (kind !== 'bor') for (let j = 0; ; j++) {
        const t = kind === 'gng' ? 0.2 + (j + 0.5) * beat * (0.6 + 0.8 * rnd()) : 0.2 + j * beat * 1.5;
        if (t > 9.4) break;
        const f = M.noteAt(0.12 + 0.07 * degs[j % 16]).f, y = 0.3 + 0.5 * rnd(), vel = 0.5 + 0.4 * rnd(), held = kind === 'gng' ? 0 : beat * (1.2 + 0.7 * rnd()), h = {};
        add(t, () => { h.v = M.playNote(kind, ctx.currentTime, f, y, vel, {}); });
        if (held && t + held < 9.9) add(t + held, () => { if (h.v && h.v.release && h.v.alive) h.v.release(); });
      }
      for (const [q, fns] of at) ctx.suspend(q * 128 / SR).then(() => { for (const fn of fns) fn(); ctx.resume(); });
      const buf = await ctx.startRendering();
      return [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()];
    }
    for (const kind of KINDS) {
      const rows = [];
      for (let run = 0; run < RUNS; run++) {
        const [mL, mR] = await material(kind, run), off = Math.round((kind === 'bor' ? 2.5 : 0.9 + 1.2 * rnd()) * SR) - pre, n = Math.min(mL.length - off, pre + Pi + SR * 2);
        const ch = window.__chunks(n, (i) => mL[off + i], (i) => mR[off + i]);
        // the page's seam: X by the probe's rule (sustained: 40 ms), its gain curve from both sides, rho beside it
        let st = 0; for (let i = 0; i < 0.04 * SR; i++) st += mL[off + pre + i] ** 2 + mR[off + pre + i] ** 2;
        const X = Math.round((Math.sqrt(st / (0.08 * SR)) > 0.02 && kind !== 'gng' ? 0.04 : 0.01) * SR);
        const rho = M.hxRho(ch, n, pre, Pi, X), kc = M.hxSeamK((j) => window.__read(ch, pre + Pi + j), (j) => window.__read(ch, pre + j), X);
        const kx = Math.max(1, ...kc), D = 5 * P / SR + 0.5, ctx = await window.__ringCtx(Math.ceil(D * SR), SR);
        const ring = window.__ring(ctx, { msgs: [{ seg: [[0, 0, SR * 60 / BPM]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: ch, n, pre, len: Pi, join: 'xf', X, rho, kc, fin: X } }] });
        const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
        ring.connect(rec); rec.connect(ctx.destination);
        await ctx.startRendering();
        const { L, R } = await window.__recGet(rec), sk = (k) => Math.round(k * P), src = (j, c) => (j >= 0 && j < n ? (c ? mR : mL)[off + j] : 0);
        let worst = 0, lo = 0, hi = 0, seamPk = 0, midPk = 0;
        for (let k = 1; k <= 4; k++) {
          const s = sk(k), sp = sk(k - 1);
          const A = (F, c) => src(pre + F - sp, c), B = (F, c) => src(pre + F - s, c);   // the pass that ended going on; the new pass
          for (const [Y, c] of [[L, 0], [R, 1]]) {   // the third difference per channel
            let pk = 0, ref = 0;
            for (let i = s - 144; i < s + X + 144; i++) { pk = Math.max(pk, d3(Y, i)); ref = Math.max(ref, Math.abs(A(i, c) - 3 * A(i - 1, c) + 3 * A(i - 2, c) - A(i - 3, c)), Math.abs(B(i, c) - 3 * B(i - 1, c) + 3 * B(i - 2, c) - B(i - 3, c))); }
            worst = Math.max(worst, pk / (ref * kx)); seamPk = Math.max(seamPk, pk / kx);
            for (let i = sp + X + 200; i < s - 200; i++) midPk = Math.max(midPk, d3(Y, i));
          }
          // the level: the stereo power over 10 ms, hop 2.5 ms
          const w = (i, g) => { let q = 0; for (let j = i; j < i + 480; j++) { const l = g ? g(j, 0) : L[j], r = g ? g(j, 1) : R[j]; q += l * l + r * r; } return Math.sqrt(q / 960); };
          for (let i = s - 480; i < s + X + 480; i += 120) { const o = w(i), a = w(i, A), b = w(i, B); if (Math.max(a, b) < 1e-5) continue; lo = Math.min(lo, 20 * Math.log10(o / Math.min(a, b))); hi = Math.max(hi, 20 * Math.log10(o / Math.max(a, b))); }
        }
        rows.push({ X: X / 48, rho: +rho.toFixed(2), kx: +kx.toFixed(2), local: +worst.toFixed(2), mid: +(seamPk / midPk).toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2) });
      }
      out[kind] = rows;
    }
    return out;
  }, { RUNS, KINDS });
  if (P1) { errors.push(...P1.errors); await P1.ctx.close(); }
  for (const [k, rows] of Object.entries(mat)) {
    const bad = rows.filter((v) => !(v.local <= 1.5 && v.mid <= 1.5 && v.lo >= -1 && v.hi <= 1));
    console.log(`INFO ${k}: ` + rows.map((v) => `[${v.X} ms ρ ${v.rho} k ${v.kx} d3 ${v.local}/${v.mid} RMS ${v.lo}…+${v.hi}]`).join(' '));
    ok(!bad.length, `${k}, ${rows.length} random runs: every seam's third difference ≤ 1.5× the material's (worst ${Math.max(...rows.map((v) => v.local))}) and mid-pass (worst ${Math.max(...rows.map((v) => v.mid))}), short-term RMS within ${Math.min(...rows.map((v) => v.lo))} … +${Math.max(...rows.map((v) => v.hi))} dB of the two sides (±1)`);
  }


  // the live parts: helpers in the page – a frame-aligned recorder of both processor outputs, a version's sample
  await ev(async () => {
    const M = window.__M, ctx = M.A.ctx;
    await ctx.audioWorklet.addModule(window.__testUrl);
    await M.hxWerk();
    window.__recBoth = () => { const r = new AudioWorkletNode(ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; M.HX.node.connect(r, 0); M.HX.node.connect(r, 1); r.connect(z).connect(ctx.destination); return r; };
    window.__stop = async (r) => { const g = await window.__recGet(r); try { M.HX.node.disconnect(r); } catch (e) {} return g; };
    window.__at = (ch, i) => window.__read(ch, i)[0];
    window.__setup = (o) => { for (const [k, v] of Object.entries(Object.assign({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'hx.laenge': 'fest', 'hx.festT': 1, 'v.human': 0 }, o || {}))) M.setParam(k, v); };
  });

  let r;
  // ---------- 2 · cold and warm; the first-pass rule ----------
  if (PARTS.includes('2')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, out = {};
      window.__setup({ 'hx.festT': 2 });
      window.__grid(120);
      await window.__sleep(1300);
      // cold: the window starts quiet (the first strike half a beat in), its last strikes ring past its end
      const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.3) / 4) * 4, T = (b) => M.tgTime(b0 + b);
      window.__play([[T(0.5), 2, 0.8], [T(2), 4, 0.7], [T(4), 3, 0.8], [T(6.5), 5, 0.9]], { eng: 'gng' });
      await window.__until(T(8) + 0.02);
      const rec = window.__recBoth();   // (from before the harvest: its first pass, entered in phase, is heard too)
      await window.__until(T(8) + 0.06);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
      M.hxFolgt(L, true);   // (dry on out 1 throughout: the passes compare with its own audio)
      const k0 = L.k; for (let i = 0; i < 300 && !(L.k >= k0 + 3); i++) await window.__sleep(30);
      console.log('cold', L.k, k0, S.join, S.aus && S.aus.len);
      await window.__sleep(300);
      const g = await window.__stop(rec);
      out.cold = { join: S.join, X: S.X, aus: S.aus && S.aus.len, cutAus: !!S.cutAus };
      // the first pass (its seam is the window's end, where the live voices still ring on): the start alone – heard from
      // 150 ms in, the harvest came a moment after its seam; the second: the start + the Ausklang, sample for sample
      const pass = (k) => M.hxPassF(L, k) - g.f0, n = Math.round(0.5 * ctx.sampleRate), j0 = Math.round(0.15 * ctx.sampleRate), at = window.__at, ver = S.aud;
      const firstK = L.ps.map(([k]) => k)[0];
      let e1 = 0, e2 = 0, e2no = 0, pk = 0;
      for (let j = j0; j < j0 + n; j++) {
        const s1 = pass(0) + j, s2 = pass(1) + j, st = at(ver, S.pre + j), au = at(ver, S.aus.off + j);
        e1 = Math.max(e1, s1 >= 0 ? Math.abs(g.L[s1] - st) : 1);
        e2 = Math.max(e2, Math.abs(g.L[s2] - (st + au))); e2no = Math.max(e2no, Math.abs(g.L[s2] - st)); pk = Math.max(pk, Math.abs(au));
      }
      out.first = { firstK, e1, e2, e2no, pk };
      await window.__reset();
      // warm: a held chord rings through the window and on past its end
      window.__setup({ 'hx.festT': 1, 'neb.att': 0.05 });
      const c0 = M.tgTime(Math.ceil(M.tgBeat(ctx.currentTime + 0.5) / 4) * 4);
      const vs = [0, 2, 4].map((d) => M.playNote('neb', c0 - 1, M.N.notes[3 + d].f, 0.5, 0.7, { bus: M.stripIn('fin') }));
      await window.__until(c0 + 2 + 0.06);
      const L2 = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S2 = L2 && M.HX.sch.get(L2.sch[0]);
      await window.__sleep(1400);
      for (const v of vs) if (v && v.release) v.release();
      out.warm = { join: S2.join, X: S2.X, sr: ctx.sampleRate };
      await window.__reset();
      return out;
    });
    ok(r.cold.join === 'ola', `a window that starts quiet (its first strike half a beat in) under the Ausklang of its end: cold – the Ausklang overlap-added (join ${r.cold.join}, ${(r.cold.aus / 44.1).toFixed(0)} ms of it)`);
    ok(r.first.firstK === 0 && r.first.e1 < 1e-6 && r.first.e2 < 1e-6 && r.first.pk > 0.01 && r.first.e2no > 0.005, `the first-pass rule: the first pass (its seam at the window's end, the live voices ringing on) plays the start alone (${r.first.e1.toExponential(1)}), the second the start + its Ausklang (${r.first.e2.toExponential(1)}; the Ausklang's peak there ${r.first.pk.toFixed(3)})`);
    ok(r.warm.join === 'xf' && Math.abs(r.warm.X - 0.04 * r.warm.sr) < 2, `a window that starts ringing (a held chord): warm – the crossfade, ${(r.warm.X / r.warm.sr * 1000).toFixed(0)} ms for sustained sound`);
  }

  // ---------- 3 · the Ausklang until the first foreign onset, the rest rendered ----------
  if (PARTS.includes('3')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, out = {};
      window.__setup({ 'hx.festT': 1, 'gng.decay': 6 });
      window.__grid(120);
      await window.__sleep(1300);
      const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.3) / 4) * 4, T = (b) => M.tgTime(b0 + b);
      window.__play([[T(0.5), 2, 0.7], [T(2.5), 4, 0.9]], { eng: 'gng' });
      await window.__until(T(4) + 0.06);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
      window.__play([[T(4) + 0.35, 6, 0.8]], { eng: 'gng' });   // the foreign onset: 350 ms after the window's end
      for (let i = 0; i < 100 && !S.spliced; i++) await window.__sleep(100);
      const cut = Math.round((0.35 - 0.005) * SR), xf = Math.round(0.03 * SR), at = (i) => { const c = S.aud[Math.floor(i / 8192)], j = i % 8192; return c ? Math.hypot(c[0][j], c[1][j]) : 0; };
      const rms = (a, n) => { let q = 0; for (let i = a; i < a + n; i++) q += at(i) ** 2; return Math.sqrt(q / n); };
      const o = S.aus.off, w = Math.round(0.02 * SR);
      out.cutAus = !!S.cutAus; out.spliced = !!S.spliced; out.len = S.aus.len / SR; out.cutAt = cut / SR;
      out.before = 20 * Math.log10(rms(o + cut - xf - w, w)); out.mid = 20 * Math.log10(rms(o + cut - Math.round(xf / 2 + w / 2), w)); out.after = 20 * Math.log10(rms(o + cut, w));
      out.later = 20 * Math.log10(rms(o + cut + Math.round(0.6 * SR), w) + 1e-9);
      out.tails = M.HX.tails || 0;
      await window.__reset();
      // without notes: sound alone (an oscillator on the field's strip), a foreign onset in the audio after the window
      for (const e of M.HX.ev) if (e) e.probe = true;   // (the notes before are forgotten: this window is sound alone)
      const tone = (t, d, f) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.005); g.gain.setTargetAtTime(0, t + d, 0.25); os.connect(g).connect(M.stripIn('fin')); os.start(t); os.stop(t + d + 2); };
      const c0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.3) / 4) * 4, U = (b) => M.tgTime(c0 + b);
      tone(U(-1), 4.4, 330);
      await window.__until(U(4) + 0.06);
      const L2 = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S2 = L2 && M.HX.sch.get(L2.sch[0]), gap = U(4) + 0.6 - M.hxT(S2.cut.w1);   // (no grid: the phrase up to the tap)
      tone(U(4) + 0.6, 0.5, 990);   // its foreign onset (no note names it)
      await window.__sleep(2500);
      out.noNotes = { gap, notes: L2.notes.length, len: S2.aus && S2.aus.len / SR, cutAus: !!S2.cutAus, spliced: !!S2.spliced, fade: S2.aus && S2.aus.fade / SR };
      await window.__reset();
      return out;
    });
    ok(r.cutAus && Math.abs(r.cutAt - 0.345) < 0.01, `a foreign note 350 ms after the window's end cuts the Humus's Ausklang 5 ms before it`);
    ok(r.spliced && r.len > 1.5 && r.tails > 0, `…and the rest is rendered from the window's notes in the Werk-Rahmen: the Ausklang now rings ${r.len.toFixed(2)} s`);
    ok(Math.abs(r.after - r.before) < 2 && Math.abs(r.mid - (r.before + r.after) / 2) < 1.5 && r.later > r.after - 30, `…behind a 30-ms crossfade, its level continuous (${r.before.toFixed(1)} → ${r.mid.toFixed(1)} → ${r.after.toFixed(1)} dBFS), ringing on (0.6 s later ${r.later.toFixed(1)} dBFS)`);
    ok(r.noNotes.notes === 0 && r.noNotes.cutAus && Math.abs(r.noNotes.len - (r.noNotes.gap - 0.005)) < 0.015 && !r.noNotes.spliced && Math.abs(r.noNotes.fade - 0.03) < 0.002, `a window without notes: an onset in the audio ${(r.noNotes.gap * 1000).toFixed(0)} ms after its end cuts its Ausklang there (${r.noNotes.len && (r.noNotes.len * 1000).toFixed(0)} ms), a 30-ms fade, nothing rendered`);
  }

  // ---------- 4 · the Auftakt ----------
  if (PARTS.includes('4')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, out = {};
      window.__setup({ 'hx.festT': 1 });
      window.__grid(120);
      await window.__sleep(1300);
      for (const withEnd of [false, true]) {
        window.__setup({ 'hx.festT': 1 }); window.__grid(120);   // (again after each __reset)
        const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 1.2) / 4) * 4, T = (b) => M.tgTime(b0 + b);
        // a pick-up half a beat before the 1 (after a rest), notes in the bar's first half; with withEnd one more in its second
        window.__play([[T(-0.5), 4, 0.8, 0.15], [T(0), 0, 0.9, 0.2], [T(0.5), 2, 0.7, 0.2], [T(1), 3, 0.7, 0.2]].concat(withEnd ? [[T(3), 5, 0.7, 0.15]] : []), { eng: 'mem' });
        await window.__until(T(4) + 0.06);
        const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
        await window.__sleep(900);
        const kinds = L.sch.map((id) => M.HX.sch.get(id).kind);
        out[withEnd ? 'chip' : 'auto'] = { kinds, auf: !!L.auf, notes: L.notes.length, chip: !!(M.HX.chips && M.HX.chips.auf) };
        await window.__reset();
      }
      return out;
    });
    ok(r.auto.kinds.includes('auftakt') && !r.auto.auf && r.auto.notes === 4, `a pick-up before the 1 and an end without onsets: laid onto the loop's end – a Schicht of its own (${r.auto.kinds.join(', ')}), its note among the loop's (${r.auto.notes})`);
    ok(!r.chip.kinds.includes('auftakt') && r.chip.auf && r.chip.chip, `with a note at the end: not laid on – the chip „Auftakt anfügen“ offers it (${r.chip.kinds.join(', ')})`);
  }

  // ---------- 5 · Nahtwahl ----------
  if (PARTS.includes('5')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, out = {};
      window.__setup({ 'hx.festT': 1 });
      window.__grid(120);
      await window.__sleep(1300);
      for (const rep of [true, false]) {
        window.__setup({ 'hx.festT': 1 }); window.__grid(120);
        const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 1.2) / 4) * 4, T = (b) => M.tgTime(b0 + b);
        // a one-bar figure with a strike on every bar line; repeated: it goes on after the window, else other notes follow
        const fig = [0, 4, 2, 5], list = [];
        for (let k = -2; k < 2; k++) fig.forEach((d, i) => { const later = k >= 0; list.push([T(4 * k + i), later && !rep ? (d + 3) % 8 : d, i === 0 ? 0.95 : 0.6, 0.12]); });
        window.__play(list, { eng: 'glo' });
        await window.__until(T(0) + 0.06);
        const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
        await window.__sleep(2600);
        const w0 = M.hxT(S.cut.w0), w1 = M.hxT(S.cut.w1), z = (S.zo || 0) / SR, X = S.X / SR;
        const ons = M.hxNotes(w0 - 0.05, w1 + 1, 0, false).map((e) => e.t0);
        const near = ons.flatMap((t) => [t - w0, t - w1]).filter((d) => d > -0.05 && d < 1);
        const clear = near.every((d) => d - 0.005 >= z + X || d + 0.06 <= z);
        out[rep ? 'rep' : 'other'] = { zo: z, X, join: S.join, clear, near: near.map((d) => +d.toFixed(3)).join(' ') };
        await window.__reset();
      }
      return out;
    });
    ok(r.rep.join === 'xf' && r.rep.zo > 0.06 && r.rep.clear, `inside a repetition (a strike on every bar line): the seam moves off it – ${(r.rep.zo * 1000).toFixed(0)} ms after the bar line, its ${(r.rep.X * 1000).toFixed(0)}-ms fade clear of every onset's zone (5 ms before to 60 ms after)`);
    ok(r.other.zo === 0, `a window that does not repeat (other notes after it): its seam stays on the bar line (${r.other.zo})`);
  }

  // ---------- 6 · stop: the stored Ausklang once ----------
  if (PARTS.includes('6')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
      window.__setup({ 'hx.festT': 1, 'gng.decay': 4 });
      window.__grid(120);
      await window.__sleep(1300);
      const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.3) / 4) * 4, T = (b) => M.tgTime(b0 + b);
      window.__play([[T(0.5), 2, 0.7], [T(2.5), 4, 0.9]], { eng: 'gng' });
      await window.__until(T(4) + 0.06);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = L && M.HX.sch.get(L.sch[0]);
      M.hxFolgt(L, true);
      await window.__sleep(3300);
      const rec = window.__recBoth();
      const sk = M.hxNextSeam(L), fS = sk.f;
      M.hxState(L.id, 'angehalten', M.hxT(fS));
      await window.__sleep((M.hxT(fS) - ctx.currentTime) * 1000 + 2500);
      const g = await window.__stop(rec), s = fS - g.f0, len = S.aus.len, fd = S.aus.fade, P = fS - M.hxPassF(L, sk.k - 1), n = Math.min(len, g.L.length - s - 10);
      // after the stop: its Ausklang from the seam on, and those of the passes before, still ringing (each started at a
      // seam from the second on – seams 1 … k), each with the cut's fade at its end – nothing else
      const au = (p) => (p >= len ? 0 : p < len - fd ? window.__at(S.aud, S.aus.off + p) : window.__at(S.aud, S.aus.off + p) * Math.cos(Math.PI / 2 * (0.5 - 0.5 * Math.cos(Math.PI * (p - len + fd + 0.5) / fd))));
      let e = 0, pk = 0, after = 0;
      for (let j = 0; j < n; j++) { let x = 0; for (let m = 0; m <= sk.k - 1; m++) x += au(j + m * P); e = Math.max(e, Math.abs(g.L[s + j] - x)); pk = Math.max(pk, Math.abs(x)); }
      for (let j = len + 200; j < Math.min(g.L.length - s, len + SR / 2); j++) after = Math.max(after, Math.abs(g.L[s + j]));
      return { join: S.join, e, pk, after, len: len / SR, k: sk.k };
    });
    ok(r.join === 'ola' && r.e < 1e-5 && r.pk > 0.01 && r.after < 1e-6, `angehalten at its seam (pass ${r.k}): its stored Ausklang (${r.len.toFixed(2)} s) rings once – the earlier passes' ring out with it, none cut (${r.e.toExponential(1)} from them, peak ${r.pk.toFixed(3)}) – then silence (${r.after.toExponential(1)})`);
  }

  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
