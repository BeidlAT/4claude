// Hexenring – the processor myzel-ring (SPEC §3, §7; tests §22):
//  1 a Schicht whose samples hold their own index replays bit-exactly at F(k) = round(frameAt(b0 + k·beats)) for an hour
//    with tempo segments and ±0.2 % wander (the port of ideas/engineer-experiments/e4-drift.js); passStart reports agree;
//    a Frei loop at phase0 + k·L
//  2 the chunk pool stays constant over 10 minutes of grabs, Schichten and undos; process() makes no typed array
//  3 the seam law: third-difference peak ≤ 1.5 × mid-pass on the E10 signal set (10 and 40 ms), at entry, mute,
//    undo, stop and swap; on real Gong, Harz and Bordun material too, with the short-term RMS within ±1 dB of the two
//    sides' own levels through every fade
//  4 the Ausklang hook (from the second seam on, never at the first), the stop that lets it ring once
//  5 the resampler (32 taps × 256 phases, Kaiser β 8): pass band, residual at ±1 %
//  6 the page blocked for 2 s: playback goes on without a gap
//   node t-hx-proc.js        env: MIN=60 (the hour), POOLMIN=10
const H = require('./hx-h');
const { ok } = H;
const MIN = +process.env.MIN || 60, POOLMIN = +process.env.POOLMIN || 10;
(async () => {
  const { page, errors } = await H.open({ start: false });
  const ev = (fn, a) => page.evaluate(fn, a);

  // ---------- 1 · exact pass starts for an hour ----------
  {
    const t0 = Date.now();
    const r = await ev(async (MIN) => {
      const SR = 48000, seg = [[0, 0, SR * 60 / 84]];
      const add = (f, fpb) => { const s = seg[seg.length - 1]; seg.push([f, s[1] + (f - s[0]) / s[2], fpb]); };
      add(20 * 60 * SR, SR * 60 / 84.37);
      for (let t = 40 * 60; t < 60 * 60; t += 0.5) add(Math.round(t * SR), SR * 60 / (84.37 * (1 + 0.002 * Math.sin(2 * Math.PI * t / 37))));
      const BODY = 280000, ch = window.__chunks(BODY, (i) => i / 1048576);
      let st = { prev: null, pass: 0, maxE: 0, glitch: 0, gaps: [], starts: [], frames: 0 };
      const reports = [];
      for (let m = 0; m < MIN; m++) {
        const ctx = await window.__ringCtx(SR * 60, SR), fOff = m * 60 * SR;
        const ring = window.__ring(ctx, { fOff, msgs: [{ seg, reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } },
          { schicht: { loop: 1, id: 1, chunks: ch, n: BODY, pre: 0, len: 274286, join: 'cut', fin: 0 } }] });
        const ck = new AudioWorkletNode(ctx, 'hx-check', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', processorOptions: { st, seg, beats: 8, fOff, len: SR * 60 } });
        const got = new Promise((res) => { ck.port.onmessage = (e) => res(e.data); });
        ring.connect(ck, 0); ck.connect(ctx.destination);
        await ctx.startRendering();
        st = await got;
        await window.__sleep(0);
        for (const x of ring.__got) if (x.passStart) reports.push(x.passStart);
      }
      // the processor's own reports against the exact clock
      const fa = (b) => { let i = seg.length - 1; while (i > 0 && seg[i][1] > b) i--; return seg[i][0] + (b - seg[i][1]) * seg[i][2]; };
      let repBad = 0, repN = 0; const seen = new Set();
      for (const p of reports) { if (seen.has(p.k)) continue; seen.add(p.k); repN++; if (p.f !== Math.round(fa(p.k * 8))) repBad++; }
      // in-pass exactness: every frame between two starts ran on by one (glitch = any other jump)
      return { segments: seg.length, passes: st.pass, maxE: st.maxE, glitch: st.glitch, gaps: st.gaps.slice(0, 3), frames: st.frames, repN, repBad };
    }, MIN);
    ok(r.passes >= MIN * 10 && Math.abs(r.maxE) <= 0.5 && r.glitch === 0 && r.frames === MIN * 60 * 48000,
      `${MIN} min, ${r.segments} tempo segments (84 → 84.37 BPM, then ±0.2 % wander): ${r.passes} passes, every start within ${Math.abs(r.maxE).toFixed(3)} frames of round(frameAt(k·beats)), 0 wrong frames inside (${r.glitch}) [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
    ok(r.repN >= MIN * 10 && r.repBad === 0, `  its passStart reports name exactly F(k) (${r.repN} passes, ${r.repBad} off)`);
  }
  // a Frei loop: phase0 + k·L, also told late (it comes in phase-correct, mid-pass)
  {
    const r = await ev(async () => {
      const SR = 48000, L = 100003, BODY = 110000, ch = window.__chunks(BODY, (i) => i / 1048576), ctx = await window.__ringCtx(SR * 20, SR);
      const ring = window.__ring(ctx, { msgs: [{ loop: { id: 3, lock: 'frei', L, ph0: -37 } }, { schicht: { loop: 3, id: 9, chunks: ch, n: BODY, pre: 0, len: L, join: 'cut', fin: 0 } }] });
      const ck = new AudioWorkletNode(ctx, 'hx-check', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', processorOptions: { len: SR * 20 } });
      const got = new Promise((res) => { ck.port.onmessage = (e) => res(e.data); });
      ring.connect(ck, 0); ck.connect(ctx.destination);
      await ctx.startRendering(); const st = await got;
      return { starts: st.starts, glitch: st.glitch, first: st.prev != null };
    });
    ok(r.glitch === 0 && r.starts.length >= 9 && r.starts.every((f, i) => f === -37 + (i + 1) * 100003), `Frei: pass k at phase0 + k·L exactly (${r.starts.length} starts, phase0 −37 – entered mid-pass, in phase)`);
  }

  // ---------- 2 · the pool: constant chunks, no typed array made in process() ----------
  {
    const r = await ev(async (POOLMIN) => {
      const M = window.__M, SR = 48000, D = POOLMIN * 60;
      // the module with an instrumented process(): every typed array made while it runs is counted
      let src = M.MYZEL_DSP_SRC;
      src = src.replace("['myzel-ring', Ring]]) registerProcessor(k, C);", "['myzel-ring', (() => { const p = Ring.prototype.process; Ring.prototype.process = function (i, o) { globalThis.__inP = 1; try { return p.call(this, i, o); } finally { globalThis.__inP = 0; } }; return Ring; })()]]) registerProcessor(k, C);")
        .replace('alloc: this.nA', 'alloc: globalThis.__nA || 0');
      const wrap = "for (const k of ['Float32Array', 'Float64Array', 'Int32Array', 'Uint8Array', 'ArrayBuffer']) { const T = globalThis[k]; globalThis[k] = new Proxy(T, { construct(t, a) { if (globalThis.__inP) globalThis.__nA = (globalThis.__nA || 0) + 1; return Reflect.construct(t, a); } }); }\n";
      const ctx = await window.__ringCtx(SR * D, SR, wrap + src);
      const ring = window.__ring(ctx, { humusS: 64, msgs: [{ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 4, beats: 4 } }] });
      const osc = ctx.createOscillator(), o2 = ctx.createOscillator(); osc.frequency.value = 220; o2.frequency.value = 331; osc.connect(ring, 0, 0); o2.connect(ring, 0, 1); osc.start(); o2.start();
      ring.connect(ctx.destination, 0);
      // the page's chunks: made once – the Humus's two rings and a spare set; then only passed around
      const hN = Math.ceil(64 * SR / 8192), mk = () => [new Float32Array(8192), new Float32Array(8192)];
      const humus = [], tr = []; for (let i = 0; i < 2 * hN; i++) { const c = mk(); humus.push(c); tr.push(c[0].buffer, c[1].buffer); }
      const spare = []; for (let i = 0; i < 64; i++) spare.push(mk());
      const made = 2 * hN + 64;
      ctx.suspend(128 / SR).then(() => { ring.port.postMessage({ pool: humus }, tr); ctx.resume(); });
      let sid = 0, live = null, inflight = 0, steps = 0, bad = [];
      const reps = [];
      for (let t = 5; t < D - 1; t += 1) {
        ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => {
          for (const x of ring.__got.splice(0)) {
            if (x.grabbed) { inflight -= x.grabbed.chunks.length; const id = ++sid; inflight += x.grabbed.chunks.length;
              const trs = []; for (const c of x.grabbed.chunks) trs.push(c[0].buffer, c[1].buffer);
              ring.port.postMessage({ schicht: { loop: 1, id, chunks: x.grabbed.chunks, n: x.grabbed.n, pre: 0, len: 4 * 24000, join: 'xf' } }, trs);
              if (live) ring.port.postMessage({ undo: { schicht: live } });
              live = id; steps++; }
            if (x.freed) { for (const c of x.freed.chunks) spare.push(c); inflight -= x.freed.chunks.length; }
            if (x.report) reps.push(x.report);
          }
          if (t % 4 === 0 && t < D - 12 && spare.length >= 15) {   // a grab of the last 4 s (+0.5 s) into chunks the page had – recycled
            const f1 = Math.round(t * SR) - 2000, f0 = f1 - 4 * 24000 - 24000, n = Math.ceil((f1 - f0) / 8192), dst = spare.splice(0, n), trs = [];
            for (const c of dst) trs.push(c[0].buffer, c[1].buffer);
            inflight += n;
            ring.port.postMessage({ grab: { id: t, in: t % 8 ? 0 : 1, f0, f1, dst } }, trs);
          }
          if (t % 30 === 0 || t === D - 4) ring.port.postMessage({ report: 1 });
          ctx.resume();
        });
      }
      await ctx.startRendering();
      await window.__sleep(50);
      for (const x of ring.__got.splice(0)) if (x.report) reps.push(x.report);
      const sums = reps.map((p) => p.hum + p.schChunks + p.free);
      return { made, hN, steps, reps: reps.length, hum: [...new Set(reps.map((p) => p.hum))], alloc: Math.max(...reps.map((p) => p.alloc)), spare: spare.length, inflight, last: reps[reps.length - 1], sums: [Math.min(...sums), Math.max(...sums)] };
    }, POOLMIN);
    ok(r.steps >= POOLMIN * 10 && r.hum.length === 1 && r.hum[0] === 2 * r.hN && r.alloc === 0,
      `${POOLMIN} min of grabs (both rings), Schichten and undos (${r.steps} cycles): the Humus holds its ${r.hum[0]} chunks, process() made ${r.alloc} typed arrays`);
    ok(r.last && r.last.free === 0 && r.last.schChunks + r.spare + r.hum[0] === r.made && r.inflight === r.last.schChunks, `  every chunk the page made is accounted for (Humus ${r.hum[0]} + Schicht ${r.last && r.last.schChunks} + page ${r.spare} = ${r.made}), none made later`);
  }

  // ---------- 3 · the seam law ----------
  const seam = await ev(async () => {
    const SR = 48000, out = {};
    const P = Math.round(8 * SR * 60 / 84), pre = 2400, post = SR;   // 2 bars at 84 BPM, margins
    const sets = {
      sine: (t) => 0.5 * Math.sin(2 * Math.PI * 441.3 * t) + 0.3 * Math.sin(2 * Math.PI * 30 * t + 1),
      dc: (t) => 0.25 + 0.4 * Math.sin(2 * Math.PI * 441.3 * t) + 0.2 * Math.sin(2 * Math.PI * 30 * t + 1),
      chord: (t) => 0.25 * Math.sin(2 * Math.PI * 261.7 * t) + 0.2 * Math.sin(2 * Math.PI * 329.9 * t + 2) + 0.2 * Math.sin(2 * Math.PI * 392.3 * t + 4) + 0.15 * Math.sin(2 * Math.PI * 55.1 * t),
    };
    const d3 = (y, i) => Math.abs(y[i] - 3 * y[i - 1] + 3 * y[i - 2] - y[i - 3]);
    async function run(fn, X, act) {
      const n = pre + P + post, ch = window.__chunks(n, (i) => fn((i - pre) / SR), (i) => fn((i - pre) / SR + 0.0013)), D = 5 * P / SR + 1.5;
      const ctx = await window.__ringCtx(Math.ceil(D * SR), SR);
      const msgs = [{ seg: [[0, 0, SR * 60 / 84]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: ch, n, pre, len: P, join: 'xf', X, rho: 0, fin: X } }];
      for (const m of act || []) msgs.push(m);
      const ring = window.__ring(ctx, { msgs });
      const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
      ring.connect(rec, 0); rec.connect(ctx.destination);
      await ctx.startRendering();
      return window.__recGet(rec);
    }
    for (const [name, fn] of Object.entries(sets)) for (const X of [480, 1920]) {
      const { L } = await run(fn, X);
      let seamPk = 0, midPk = 0, sigPk = 0;
      for (let k = 1; k <= 4; k++) { const s = k * P; for (let i = s - 144; i < s + 144 + X; i++) seamPk = Math.max(seamPk, d3(L, i)); const m = Math.round((k - 0.5) * P); for (let i = m - 2000; i < m + 2000; i++) midPk = Math.max(midPk, d3(L, i)); }
      let inPk = 0; for (let i = 3; i < X + 144; i++) inPk = Math.max(inPk, d3(L, i));   // the entry: a fade-in from silence
      for (let i = 0; i < L.length; i++) sigPk = Math.max(sigPk, Math.abs(L[i]));
      out[name + ' ' + X / 48 + ' ms'] = { seam: +(seamPk / midPk).toFixed(3), entry: +(inPk / midPk).toFixed(3) };
    }
    // mute (stumm) mid-pass and back, undo mid-pass, stop at the seam (no Ausklang here), a swap at a seam: d3 and the
    // short-term RMS through each fade (it must fall or rise, never bump or dip below the target)
    const fn = sets.chord, at = (b) => Math.round(b * SR * 60 / 84);
    const acts = { stumm: [{ state: { loop: 1, to: 'stumm', f: at(11), X: 480 } }, { state: { loop: 1, to: 'spielt', f: at(13), X: 480 } }],
      undo: [{ undo: { schicht: 1, f: at(19), X: 480 } }],
      halt: [{ state: { loop: 1, to: 'angehalten', f: at(24), X: 480 } }],
      swap: [{ replace: { schicht: 1, chunks: window.__chunks(pre + P + post, (i) => 0.8 * fn((i - pre) / SR)), n: pre + P + post, pre, len: P, f: at(16), X: 480 } }] };
    const sk = (k) => Math.round(k * 8 * SR * 60 / 84), kOf = (F) => { let k = 0; while (sk(k + 1) <= F) k++; return k; };
    for (const [name, a] of Object.entries(acts)) {
      const { L } = await run(fn, 480, a), f = a[0][Object.keys(a[0])[0]].f, k = kOf(f), atSeam = f === sk(k);
      let pk = 0, mid = 0; for (let i = f - 144; i < f + 624; i++) pk = Math.max(pk, d3(L, i)); for (let i = f - 6000; i < f - 2000; i++) mid = Math.max(mid, d3(L, i));
      // through the fade, 2.5-ms windows: the output's RMS against the material going on (a: this pass, or at a seam the
      // pass that ended continuing) and, for a swap, the new version (b) – a fade only falls, a swap stays between them
      const A = (F) => fn((F - sk(atSeam ? k - 1 : k)) / SR), B = (F) => (name === 'swap' && F >= f ? 0.8 * fn((F - sk(k)) / SR) : A(F));
      const w = (i, g) => { let s = 0; for (let j = i; j < i + 120; j++) { const x = g ? g(j) : L[j]; s += x * x; } return Math.sqrt(s / 120); };
      const env = [], lo = [], hi = [];
      for (let i = f - 240; i < f + 720; i += 120) { const o = w(i), ra = w(i, A), rb = w(i, B); env.push(+(20 * Math.log10(o / ra + 1e-12)).toFixed(2)); lo.push(Math.min(ra, rb) > 0 ? 20 * Math.log10(o / Math.min(ra, rb)) : 0); hi.push(20 * Math.log10(o / Math.max(ra, rb) + 1e-12)); }
      out[name] = { d3: +(pk / mid).toFixed(3), env, lo: +Math.min(...lo).toFixed(2), hi: +Math.max(...hi).toFixed(2) };
    }
    return out;
  });
  for (const [k, v] of Object.entries(seam)) {
    if (v.seam != null) ok(v.seam <= 1.5 && v.entry <= 1.5, `seam ${k}: third-difference peak at the seams ${v.seam}× mid-pass, at the entry ${v.entry}× (≤ 1.5)`);
    else ok(v.d3 <= 1.5, `${k}: third-difference peak through the fade ${v.d3}× the material's (≤ 1.5), level ${v.env.join(' ')} dB`);
  }
  const mono = (e) => e.every((x, i) => !i || x <= e[i - 1] + 0.05);
  ok(mono(seam.undo.env) && Math.abs(seam.undo.env[0]) < 0.05 && seam.undo.env[seam.undo.env.length - 1] < -100, `undo: its gain only falls, from 0 dB to silence (${seam.undo.env.join(' ')} dB)`);
  ok(mono(seam.stumm.env) && seam.stumm.env[seam.stumm.env.length - 1] < -100, `stumm: its gain only falls (${seam.stumm.env.join(' ')} dB)`);
  ok(mono(seam.halt.env) && seam.halt.env[seam.halt.env.length - 1] < -100, `angehalten at its seam (no Ausklang): the pass's own continuation fades (${seam.halt.env.join(' ')} dB)`);
  ok(seam.swap.lo >= -1 && seam.swap.hi <= 1, `swap at a seam to a version 2 dB softer: the level stays between the two versions' own (${seam.swap.lo} … ${seam.swap.hi} dB beyond, ±1)`);

  // ---------- 3b · real material: Gong, Harz, Bordun rendered by the app, looped with the seam law ----------
  {
    const r = await ev(async () => {
      const M = window.__M, SR = 48000, BPM = 84, P = 8 * SR * 60 / BPM, Pi = Math.round(P), pre = SR, out = {};
      const d3 = (y, i) => Math.abs(y[i] - 3 * y[i - 1] + 3 * y[i - 2] - y[i - 3]);
      // the material: 10 s of the app (no echo or hall – the loop's material is dry; the bar lines every 2 bars at 1 s + k·P)
      async function material(kind) {
        const prm = { 'dev.q': '2', 'rev.mix': 0, 'dly.mix': 0, 'seq.bpm': BPM, 'v.human': 0, 'mov.vib': 0, 'mov.drift': 0 };
        if (kind === 'bor') Object.assign(prm, { 'bor.on': true, 'bor.lvl': 0.5 });
        if (kind === 'gng') prm['v.eng'] = 'gng'; if (kind === 'hrz') prm['v.eng'] = 'hrz';
        const ctx = await window.__off(SR, 10, prm);
        if (kind === 'hrz') await M.ensureDSP(ctx);
        const beat = 60 / BPM, deg = [0, 2, 4, 1, 3, 5, 2, 0];
        if (kind !== 'bor') for (let j = 0; (j + 0.5) * beat < 9; j++) {
          const t = kind === 'gng' ? 0.2 + (j + 0.5) * beat : 0.2 + j * beat * 1.5, f = M.noteAt(0.15 + 0.07 * deg[j % 8]).f;
          if (t > 9.5) break;
          ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => { const v = M.playNote(kind, ctx.currentTime, f, 0.6, 0.7, {}); if (v && v.release && kind === 'hrz' && ctx.currentTime + beat * 1.9 < 9.9) { const end = ctx.currentTime + beat * 1.9; ctx.suspend(Math.round(end * SR / 128) * 128 / SR).then(() => { if (v.alive) v.release(); ctx.resume(); }); } ctx.resume(); });
        }
        const buf = await ctx.startRendering();
        return [buf.getChannelData(0), buf.getChannelData(1)];
      }
      for (const [kind, Xs] of [['gng', 0.01], ['hrz', 0.04], ['bor', 0.04]]) {
        const [mL, mR] = await material(kind), off = Math.round((kind === 'bor' ? 2.5 : 1.0) * SR) - pre, n = Math.min(mL.length - off, pre + Pi + SR * 2);
        const ch = window.__chunks(n, (i) => mL[off + i], (i) => mR[off + i]), X = Math.round(Xs * SR);
        const rho = M.hxRho(ch, n, pre, Pi, X);
        const D = 5 * P / SR + 0.5, ctx = await window.__ringCtx(Math.ceil(D * SR), SR);
        const ring = window.__ring(ctx, { msgs: [{ seg: [[0, 0, SR * 60 / BPM]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: ch, n, pre, len: Pi, join: 'xf', X, rho, fin: X } }] });
        const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
        ring.connect(rec, 0); rec.connect(ctx.destination);
        await ctx.startRendering();
        const { L } = await window.__recGet(rec), sk = (k) => Math.round(k * P), src = (j) => (j >= 0 && j < n ? mL[off + j] : 0);
        let worst = 0, worstMid = 0, lo = 0, hi = 0, seamPk = 0, midPk = 0;
        for (let k = 1; k <= 4; k++) {
          const s = sk(k), sp = sk(k - 1);
          const A = (F) => src(pre + F - sp), B = (F) => src(pre + F - s);   // the pass that ended going on; the new pass
          let pk = 0, ref = 0;
          for (let i = s - 144; i < s + X + 144; i++) { pk = Math.max(pk, d3(L, i)); const a = Math.abs(A(i) - 3 * A(i - 1) + 3 * A(i - 2) - A(i - 3)), b = Math.abs(B(i) - 3 * B(i - 1) + 3 * B(i - 2) - B(i - 3)); ref = Math.max(ref, a, b); }
          worst = Math.max(worst, pk / ref); seamPk = Math.max(seamPk, pk);
          for (let i = sp + X + 200; i < s - 200; i++) midPk = Math.max(midPk, d3(L, i));
          // short-term RMS (10 ms, hop 2.5 ms) through the fade: within ±1 dB of the two sides' own levels
          const w = (i, g) => { let q = 0; for (let j = i; j < i + 480; j++) { const x = g ? g(j) : L[j]; q += x * x; } return Math.sqrt(q / 480); };
          for (let i = s - 480; i < s + X + 480; i += 120) { const o = w(i), a = w(i, A), b = w(i, B); if (Math.max(a, b) < 1e-5) continue; lo = Math.min(lo, 20 * Math.log10(o / Math.min(a, b))); hi = Math.max(hi, 20 * Math.log10(o / Math.max(a, b))); }
        }
        out[kind] = { X: Xs * 1000, rho: +rho.toFixed(3), local: +worst.toFixed(3), mid: +(seamPk / midPk).toFixed(3), lo: +lo.toFixed(2), hi: +hi.toFixed(2) };
      }
      return out;
    });
    for (const [k, v] of Object.entries(r)) {
      ok(v.local <= 1.5 && v.mid <= 1.5, `${k} (${v.X} ms, rho ${v.rho}): third difference at the seams ${v.local}× the material's own there, ${v.mid}× mid-pass (≤ 1.5)`);
      ok(v.lo >= -1 && v.hi <= 1, `  ${k}: short-term RMS through the seams within ${v.lo} … +${v.hi} dB of the two sides' own (±1)`);
    }
  }

  // ---------- 4 · the Ausklang hook ----------
  {
    const r = await ev(async () => {
      const SR = 48000, P = 48000, pre = 1000, post = 30000, AL = 24000, n = pre + P + post;
      const body = (i) => ((i * 7919) % 1000) / 4000 - 0.125, ch = window.__chunks(n, body);   // a pattern no two neighbours share
      const ctx = await window.__ringCtx(SR * 6, SR);
      const ring = window.__ring(ctx, { msgs: [{ seg: [[0, 0, SR * 60 / 240]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } },
        { schicht: { loop: 1, id: 1, chunks: ch, n, pre, len: P, join: 'ola', ausklang: { off: pre + P, len: AL }, fin: 0 } },
        { state: { loop: 1, to: 'angehalten', f: 4 * P } }] });
      const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
      ring.connect(rec, 0); rec.connect(ctx.destination);
      await ctx.startRendering();
      const { L } = await window.__recGet(rec), f = Math.fround, B = (j) => f(body(pre + j)), Au = (j) => (j < AL ? f(body(pre + P + j)) : 0);
      let first = 0, later = 0, stop = 0, after = 0;
      for (let j = 0; j < P; j++) { if (L[j] !== B(j)) first++; for (const k of [1, 2, 3]) if (L[k * P + j] !== f(B(j) + Au(j))) later++; }
      for (let j = 0; j < AL + 2000; j++) if (L[4 * P + j] !== Au(j)) stop++;
      for (let j = AL + 2000; j < P; j++) if (L[4 * P + j] !== 0) after++;
      return { first, later, stop, after };
    });
    ok(r.first === 0, `first seam: the Schicht alone, no Ausklang (the live voices ring there) – ${r.first} frames differ`);
    ok(r.later === 0, `from the second seam on its Ausklang is overlap-added onto the next pass, sample for sample (${r.later} frames differ in 3 passes)`);
    ok(r.stop === 0 && r.after === 0, `angehalten at its seam: the stored Ausklang rings once, alone, then silence (${r.stop} / ${r.after} frames differ)`);
  }

  // ---------- 5 · the resampler ----------
  {
    const r = await ev(async () => {
      const SR = 48000, out = {}, N = 10 * SR;
      for (const cents of [17, -17]) for (const fq of [1000, 5000, 10000, 16000, 18000, 20000]) {
        const ch = window.__chunks(N, (i) => 0.5 * Math.sin(2 * Math.PI * fq * i / SR)), ctx = await window.__ringCtx(SR * 2, SR);
        const ring = window.__ring(ctx, { msgs: [{ loop: { id: 1, lock: 'frei', L: N, ph0: 0 } }, { schicht: { loop: 1, id: 1, chunks: ch, n: N, pre: 0, len: N, join: 'cut', fin: 0 } }, { rate: { loop: 1, cents } }] });
        const rec = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
        ring.connect(rec, 0); rec.connect(ctx.destination);
        await ctx.startRendering();
        const { L } = await window.__recGet(rec), w = 2 * Math.PI * fq * Math.pow(2, cents / 1200) / SR;
        // least squares at the known output frequency over 0.5–1.5 s (the rate's glide is long over): amplitude, residual
        let ss = 0, cc = 0, sc = 0, ys = 0, yc = 0, a = 0.5 * SR, b = 1.5 * SR, phi = 0;
        // (the read position after the glide: fit with a free phase – sin and cos)
        for (let i = a; i < b; i++) { const s = Math.sin(w * i), c = Math.cos(w * i); ss += s * s; cc += c * c; sc += s * c; ys += L[i] * s; yc += L[i] * c; }
        const det = ss * cc - sc * sc, A = (ys * cc - yc * sc) / det, C = (yc * ss - ys * sc) / det;
        let e = 0, y2 = 0; for (let i = a; i < b; i++) { const fit = A * Math.sin(w * i) + C * Math.cos(w * i), d = L[i] - fit; e += d * d; y2 += fit * fit; }
        out[cents + ' ct ' + fq / 1000 + ' kHz'] = { gain: +(20 * Math.log10(Math.hypot(A, C) / 0.5)).toFixed(3), resid: +(10 * Math.log10(e / y2)).toFixed(1) };
      }
      return out;
    });
    const g = (k) => r[k].gain, res = (k) => r[k].resid;
    const all = Object.keys(r), lowF = all.filter((k) => /( 1| 5| 10) kHz/.test(k)), hiF = all.filter((k) => !lowF.includes(k));
    ok(all.every((k) => Math.abs(g(k)) < 0.01), `resampler ±17 ct (±1 %): flat within 0.01 dB from 1 to 20 kHz (${all.map((k) => k.replace(' ct ', '/') + ' ' + g(k)).join(', ')})`);
    ok(lowF.every((k) => res(k) < -90) && hiF.every((k) => res(k) < -80), `  residual (images, phase steps) ≤ −90 dB to 10 kHz (worst ${Math.max(...lowF.map(res))}), ≤ −80 dB to 20 kHz (worst ${Math.max(...hiF.map(res))})`);
    console.log('INFO resampler', JSON.stringify(r));
  }
  await page.context().close();

  // ---------- 6 · the page blocked for 2 s (live) ----------
  {
    const { page: lp, errors: le } = await H.open({});
    const r = await lp.evaluate(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
      await ctx.audioWorklet.addModule(window.__testUrl);
      const Pf = 2 * SR, BODY = Pf + 4000, ch = window.__chunks(BODY, (i) => i / 1048576);
      const ring = window.__ring(ctx, { msgs: [{ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } }, { schicht: { loop: 1, id: 1, chunks: ch, n: BODY, pre: 0, len: Pf, join: 'cut', fin: 0 } }] });
      const ck = new AudioWorkletNode(ctx, 'hx-check', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit' });
      const z = ctx.createGain(); z.gain.value = 0; ring.connect(ck, 0); ck.connect(z).connect(ctx.destination);
      const ask = () => new Promise((res) => { ck.port.onmessage = (e) => res(e.data); ck.port.postMessage(1); });
      await window.__sleep(2600);
      const before = await ask(), t0 = ctx.currentTime, w = performance.now();
      while (performance.now() - w < 2000) {}   // the page hangs
      const t1 = ctx.currentTime;
      await window.__sleep(2600);
      const after = await ask();
      ring.disconnect(); ck.disconnect();
      return { before: before.frames, after: after.frames, glitch: after.glitch, gaps: after.gaps, starts: after.starts, Pf, stall: t1 - t0, sr: SR };
    });
    const spaced = r.starts.length >= 3 && r.starts.every((f, i) => !i || f - r.starts[i - 1] === r.Pf);
    ok(r.after - r.before > r.sr * 4.5 && r.glitch === 0 && spaced, `page blocked 2 s (the audio clock ran ${r.stall.toFixed(2)} s meanwhile): the loop played on without a gap – ${r.glitch} wrong frames, ${r.starts.length} pass starts exactly ${r.Pf} frames apart`);
    ok(!le.length, 'no page errors (live)' + (le.length ? ': ' + le.join(' | ') : ''));
  }

  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
