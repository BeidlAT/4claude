// Hexenring – Etappe 4, the ecology (SPEC §15, §22 t-hx-oeko's rows for Etappe 4):
//  A offline (the processor and the voices' inputs):
//    gap – a pass plays its window once, then its own ring-out, then silence; a shorter pass lets the rest ring on over
//    the seam; a fractional free length's pass starts at round(ph0 + k·L) exactly; Schleife in Schleife –
//    y(x) = A(x − L_B) + fb·y(x − L_B) to float rounding (either loop first), the soft ceiling, Festhalten keeps the
//    tape, the copy job; the slices' stutter (and nothing at 0); Sehne and Glut fed: on their note against 6 % off it,
//    and without an input bit for bit the voice they were
//  B live: Nähren Rhizom and Regen (each loop note, the Hexenring's way, never in the Humus), the Höfe of Glut and
//    Sehne (fed, tuned, retuned, priced, never re-captured), Treffen (5, 7 and 8 bars meet every 280 bars; free loops;
//    pairs), Treffen setzen (they meet exactly once at T, no pair before; Fruchten: the key lands at T, the webs bloom),
//    the Sammelschleife (records its source, Festhalten, back after a reload), Einwurzeln follows a scale change,
//    Abrieb nach Moder (crumbles above a falling cutoff, periodic, seeded), Zersetzung live (a version per pass, the
//    clean Schicht kept, off: back)
//   node t-hx-oeko2.js        env: PARTS=A,B (default both)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const PARTS = (process.env.PARTS || 'A,B').split(',');
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  if (PARTS.includes('A')) {
    // ---------- A1 · gap ----------
    let r = await ev(async () => {
      const SR = 48000, pre = Math.round(0.2 * SR), len = 2 * SR, ausN = Math.round(0.5 * SR), n = pre + len + ausN + 1000;
      const sig = (i) => { const j = i - pre; if (j >= 0 && j < 0.8 * SR) return 0.3 * Math.sin(2 * Math.PI * 440 * j / SR); if (j >= len && j < len + 0.3 * SR) return 0.1 * Math.sin(2 * Math.PI * 660 * j / SR) * (1 - (j - len) / (0.3 * SR)); if (j < 0) return 0.05 * Math.sin(2 * Math.PI * 220 * j / SR); return 0; };
      const ch = window.__chunks(n, sig);
      const run = async (Lsec, join) => {
        const Lf = Math.round(Lsec * SR), ctx = await window.__ringCtx(SR * 7, SR);
        const ring = window.__ring(ctx, { msgs: [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gap: 1 } }, { schicht: { loop: 1, id: 1, chunks: ch, n, pre, len, ausklang: { off: pre + len, len: ausN, fade: 480 }, join, X: 480, fin: 0 } }] });
        ring.connect(ctx.destination, 0);
        const buf = await ctx.startRendering(), L = buf.getChannelData(0);
        const rms = (a, b) => { let s = 0; for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) s += L[i] * L[i]; return Math.sqrt(s / Math.max(1, Math.round((b - a) * SR))); };
        let jump = 0; for (let i = 1; i < L.length; i++) jump = Math.max(jump, Math.abs(L[i] - L[i - 1]));
        return { Lsec, tone: rms(0.02, 0.78), sil: rms(0.85, 1.95), ring: rms(2.02, 2.25), after: Lsec > 2.4 ? rms(2.35, Lsec - 0.01) : null, tone2: rms(Lsec + 0.02, Lsec + 0.78), ring2: rms(Lsec + 0.81, Lsec + 1.1), jump, nan: ring.__got.filter((x) => x.nan).length };
      };
      return { long: await run(3.1, 'ola'), short: await run(1.2, 'ola'), warm: await run(3.1, 'xf') };
    });
    ok(r.long.tone > 0.2 && r.long.sil === 0 && r.long.ring > 0.03 && r.long.after === 0 && r.long.tone2 > 0.2, `gap, a pass of 3.1 s on a window of 2 s: the phrase once (${r.long.tone.toFixed(3)}), its silence, its own ring-out at 2.0 s (${r.long.ring.toFixed(3)}), then silence to the seam (${r.long.after}) – nothing stretched`);
    ok(r.short.tone > 0.2 && r.short.tone2 > 0.2 && r.short.ring2 > 0.02 && r.short.nan === 0, `  a pass of 1.2 s (≥ the phrase): the phrase every 1.2 s, the window's rest rings on over the seam – its ring-out 2.0 s after the phrase began (${r.short.ring2.toFixed(3)} into the next pass)`);
    ok(r.warm.tone > 0.2 && r.warm.sil === 0 && r.warm.jump < 0.05, `  a warm window (it began in sound) enters each pass with a short fade – the largest step ${r.warm.jump.toFixed(4)} (the tone's own ≤ 0.017)`);
    // ---------- A2 · a fractional free length ----------
    r = await ev(async () => {
      const SR = 48000, L = 100003.37, BODY = 110000, ch = window.__chunks(BODY, (i) => i / 1048576), ctx = await window.__ringCtx(SR * 30, SR);
      const ring = window.__ring(ctx, { msgs: [{ loop: { id: 3, lock: 'frei', L, ph0: 11.5, fr: 1 } }, { schicht: { loop: 3, id: 9, chunks: ch, n: BODY, pre: 0, len: 100003, join: 'cut', fin: 0 } }] });
      ring.connect(ctx.destination, 0);
      await ctx.startRendering(); await window.__sleep(0);
      const ps = ring.__got.filter((x) => x.passStart).map((x) => x.passStart);
      return { n: ps.length, bad: ps.filter((p) => p.f !== Math.round(11.5 + p.k * L)).length };
    });
    ok(r.n >= 13 && r.bad === 0, `a fractional free length (100003.37 frames): every pass start at round(ph0 + k·L) (${r.n} passes, ${r.bad} off) – a Treffen lands within a frame`);
    // ---------- A3 · Schleife in Schleife ----------
    r = await ev(async () => {
      const SR = 48000, LA = Math.round(0.5 * SR), LB = Math.round(0.75 * SR);
      const mk = (amp) => window.__chunks(LA + 1000, (i) => (i < 480 ? amp * Math.sin(2 * Math.PI * 1000 * i / SR) : 0));
      const run = async (order, fb, amp, offAt) => {
        const ctx = await window.__ringCtx(SR * 6, SR);
        const lA = { loop: { id: 1, lock: 'frei', L: LA, ph0: 0, out: 1 } }, sA = { schicht: { loop: 1, id: 1, chunks: mk(amp), n: LA + 1000, pre: 0, len: LA, join: 'cut', fin: 0 } };
        const lB = { loop: { id: 2, lock: 'frei', L: LB, ph0: 0 } }, sB = { schicht: { loop: 2, id: 2, chunks: window.__chunks(LB + 1000, () => 0), n: LB + 1000, pre: 0, len: LB, join: 'cut', fin: 0 } };
        const msgs = order ? [lA, sA, lB, sB] : [lB, sB, lA, sA];
        msgs.push({ acc: { loop: 2, src: [1], fb, gi: 1 } });
        const ring = window.__ring(ctx, { msgs });
        if (offAt) ctx.suspend(offAt).then(() => { ring.port.postMessage({ acc: { loop: 2, off: 1 } }); ctx.resume(); });
        const mB = ctx.createChannelSplitter(2), mA = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(2);
        ring.connect(mB, 0); ring.connect(mA, 1); mB.connect(mg, 0, 0); mA.connect(mg, 0, 1); mg.connect(ctx.destination);
        const buf = await ctx.startRendering(), B = buf.getChannelData(0), A = buf.getChannelData(1);
        let maxd = 0, maxy = 0, pre = 0, per = 0;
        const end = offAt ? Math.round(offAt * SR) : B.length;
        for (let x = LB; x < end; x++) { const e = A[x - LB] + fb * B[x - LB]; maxd = Math.max(maxd, Math.abs(B[x] - e)); }
        for (let x = 0; x < B.length; x++) maxy = Math.max(maxy, Math.abs(B[x]));
        for (let x = 0; x < LB; x++) pre = Math.max(pre, Math.abs(B[x]));
        if (offAt) { const o = Math.round(offAt * SR) + 2 * LB; for (let x = o; x < B.length; x++) per = Math.max(per, Math.abs(B[x] - B[x - LB])); }
        return { maxd, maxy, pre, per };
      };
      return { a: await run(true, 0.5, 0.4), b: await run(false, 0.5, 0.4), loud: await run(true, 0.95, 0.9), off: await run(true, 0.7, 0.4, 3.0) };
    });
    ok(r.a.maxd < 1e-6 && r.b.maxd < 1e-6 && r.a.pre === 0, `Schleife in Schleife: B = A one pass of B later + 0,5 × B a pass ago – to float rounding (${r.a.maxd.toExponential(1)}, the other loop first ${r.b.maxd.toExponential(1)}), silent through its first pass`);
    ok(r.loud.maxy <= 1 && r.loud.maxy > 0.6, `  fed hard (0,9 at fb 0,95): the soft ceiling holds it (peak ${r.loud.maxy.toFixed(3)} ≤ 1)`);
    ok(r.off.maxd < 1e-6 && r.off.per === 0, `  Festhalten (the recording off): the tape stays as it is – every pass after it the same, sample for sample`);
    r = await ev(async () => {
      const SR = 48000, LB = Math.round(0.6 * SR), n = LB + 1000, ctx = await window.__ringCtx(SR * 3, SR);
      const src = window.__chunks(n, (i) => Math.sin(i / 37) * 0.25), keep = src.map((c) => [c[0].slice(), c[1].slice()]);
      const dst = window.__chunks(n, () => 0);
      const ring = window.__ring(ctx, { msgs: [{ loop: { id: 2, lock: 'frei', L: LB, ph0: 0 } }, { schicht: { loop: 2, id: 2, chunks: src, n, pre: 0, len: LB, join: 'cut', fin: 0 } }] });
      ctx.suspend(0.5).then(() => { ring.port.postMessage({ accCopy: { schicht: 2, dst } }); ctx.resume(); });
      ring.connect(ctx.destination, 0); await ctx.startRendering(); await window.__sleep(20);
      const m = ring.__got.find((x) => x.accCopied); if (!m) return { got: false };
      let d = 0; for (let c = 0; c < keep.length; c++) for (let j = 0; j < 8192; j++) d = Math.max(d, Math.abs(m.accCopied.chunks[c][0][j] - keep[c][0][j]));
      return { got: true, d, n: m.accCopied.n };
    });
    ok(r.got && r.d === 0, `  its tape copied out for the page (to be kept): exactly (${r.n} frames, max |d| ${r.d})`);
    // ---------- A4 · the slices' stutter ----------
    r = await ev(async () => {
      const SR = 48000, Lf = SR * 2, n = Lf + 4000, ctx = await window.__ringCtx(SR * 8, SR), u = Array.from({ length: 16 }, (_, i) => i / 16);
      const ch = window.__chunks(n, (i) => (i % 7919) / 7919 - 0.5);   // (a ramp whose period is no slice's length: each slice its own)
      const run = async (sl) => {
        const c2 = await window.__ringCtx(SR * 6, SR);
        const ring = window.__ring(c2, { msgs: [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0 } }, { schicht: { loop: 1, id: 1, chunks: ch.map((c) => [c[0].slice(), c[1].slice()]), n, pre: 0, len: Lf, join: 'cut', fin: 0 } }].concat(sl ? [{ slice: Object.assign({ loop: 1, u }, sl) }] : []) });
        ring.connect(c2.destination, 0); const b = await c2.startRendering(); return b.getChannelData(0);
      };
      const ref = await run(null), zero = await run({ pd: 0, pw: 0, ps: 0, seed: 3 }), st = await run({ ps: 0.5, seed: 3 });
      let dz = 0, dS = 0, rep = 0; for (let i = 0; i < ref.length; i++) { dz = Math.max(dz, Math.abs(zero[i] - ref[i])); dS = Math.max(dS, Math.abs(st[i] - ref[i])); }
      // a stutter: a slice that plays what the slice before it played (its first samples equal those of the slice before)
      const sl = Lf / 16; for (let k = 0; k < 3; k++) for (let i = 1; i < 16; i++) { const a = k * Lf + i * sl + 600, b = a - sl; if (a + 100 < st.length && Math.abs(st[a] - ref[b]) < 1e-6 && Math.abs(st[a + 50] - ref[b + 50]) < 1e-6 && Math.abs(st[a] - ref[a]) > 1e-3) rep++; }
      return { dz, dS, rep };
    });
    ok(r.dz === 0, `the slices with nothing to do (Ladung at 0): the tape exactly (max |d| ${r.dz})`);
    ok(r.dS > 0.1 && r.rep >= 5, `  a stutter (Ladung): ${r.rep} slices of 45 played what the one before them played`);
    // ---------- A5 · Sehne and Glut fed ----------
    r = await ev(async () => {
      const SR = 48000, dur = 4;
      const run = async (proc, f, fin, inj, y, inputs, on) => {
        const ctx = await window.__ringCtx(SR * dur, SR);
        const node = new AudioWorkletNode(ctx, proc, { numberOfInputs: inputs, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', processorOptions: { rich: false, lite: 0, prm: {}, seed: 5, inj, on: on || { on: 0, f, y, vel: proc === 'myzel-ember' ? 0 : 0.5, silent: 1, seed: 5 } } });
        node.parameters.get('freq').value = f; node.parameters.get('hoehe').value = y;
        if (fin) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = fin; g.gain.value = 0.1; o.connect(g).connect(node); o.start(0); }
        node.connect(ctx.destination);
        const b = await ctx.startRendering(); return b.getChannelData(0);
      };
      const db = (L) => { let s = 0; for (let i = SR * 2; i < SR * dur; i++) s += L[i] * L[i]; return 20 * Math.log10(Math.sqrt(s / (SR * (dur - 2))) + 1e-12); };
      const o = {};
      for (const [k, proc, y, inj] of [['shn', 'myzel-string', 0.5, 0.06], ['glt', 'myzel-ember', 0.22, 0.05]]) {
        o[k] = { on: db(await run(proc, 220, 220, inj, y, 1)), off: db(await run(proc, 220, 233.2, inj, y, 1)) };
        // a played note: one input and no injection against no input at all
        const note = { on: 0, f: 330, y: 0.6, vel: 0.8, seed: 9 }, a = await run(proc, 330, 0, 0, 0.6, 0, note), b = await run(proc, 330, 0, 0, 0.6, 1, note), c = await run(proc, 330, 330, 0, 0.6, 1, note);
        let d1 = 0, d2 = 0; for (let i = 0; i < a.length; i++) { d1 = Math.max(d1, Math.abs(a[i] - b[i])); d2 = Math.max(d2, Math.abs(a[i] - c[i])); }
        o[k].d1 = d1; o[k].d2 = d2;
      }
      return o;
    });
    for (const [k, nm] of [['shn', 'Sehne'], ['glt', 'Glut']]) {
      ok(r[k].on > -30 && r[k].on - r[k].off > 20, `${nm} fed (a sine of −23 dBFS): on its note ${r[k].on.toFixed(1)} dBFS, 6 % off it ${r[k].off.toFixed(1)} – it rings with what falls on its modes`);
      ok(r[k].d1 === 0 && r[k].d2 === 0, `  a played ${nm} note with an input but no injection (connected or not) is the voice it was, bit for bit`);
    }
  }
  if (PARTS.includes('B')) {
    await ev(async () => { await window.__reset(); window.__grid(120); await window.__sleep(400); });
    const setupB = () => ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx;
      const REC = `class HxRecG2 extends AudioWorkletProcessor { constructor() { super(); this.b = []; this.port.onmessage = () => { this.port.postMessage(this.b); this.b = []; }; } process(inp) { const a = inp[0]; this.b.push(a && a[0] ? a[0].slice() : new Float32Array(128)); return true; } } registerProcessor('hx-recg2', HxRecG2);`;
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'text/javascript' })));
      window.__rmsOf = (node, ms, out = 0) => new Promise((res) => {
        const r = new AudioWorkletNode(ctx, 'hx-recg2', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain();
        z.gain.value = 0; node.connect(r, out); r.connect(z).connect(ctx.destination);
        setTimeout(() => { r.port.onmessage = (e) => { try { node.disconnect(r); r.disconnect(); } catch (x) {} let s = 0, n = 0; for (const l of e.data) for (const x of l) { s += x * x; n++; } res(n ? Math.sqrt(s / n) : -1); }; r.port.postMessage(1); }, ms);
      });
      window.__gespielt = async (s) => { const t1 = A.ctx.currentTime - 0.1, g = await M.hxGrab({ t0: t1 - s, t1, in: 0 }); if (!g) return -1; let q = 0, n = 0; for (let i = 0; i < g.n; i++) { const c = g.chunks[Math.floor(i / M.HX_CH)]; if (!c) continue; const a = c[0][i % M.HX_CH], b = c[1][i % M.HX_CH]; q += a * a + b * b; n += 2; } return n ? Math.sqrt(q / n) : -1; };
      window.__mk = async (bars, degs, eng, o = {}) => {
        M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', bars);
        const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, beat = 60 / M.tgBpm(A.ctx.currentTime);
        const list = []; for (let i = 0; i < 4 * bars; i++) if (degs[i % degs.length] != null) list.push([M.tgTime(B0) + i * beat, degs[i % degs.length], i % 4 ? 0.6 : 0.95, 0.25]);
        window.__play(list, { eng: eng || 'klb' });
        await window.__until(M.tgTime(B0 + 4 * bars) + 0.04);
        const n = M.hxLoopsLive().length;
        M.hxKorb(null);
        await window.__sleep(150);
        return M.hxLoopsLive().length > n ? M.hxLoopsLive().sort((a, b) => b.made - a.made)[0].key : null;
      };
      window.__L = (k) => M.hxLoopsLive().find((L) => L.key === k);
    });
    await setupB();
    // ---------- B1 · Nähren Rhizom ----------
    let r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      const k = await window.__mk(2, [0, 2, 4, 2, 5, 4, 2, 1], 'klb'); o.k = !!k;
      await window.__sleep(4300);
      const L = window.__L(k); o.notes = L.notes.length;
      M.HX.rhzLog = [];
      M.hxNaehr(L, 'rhz', true);
      const len = M.hxLen(L), k0 = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + 1, a = M.hxT(M.hxPassF(L, k0)), b = M.hxT(M.hxPassF(L, k0 + 2));
      while (A.ctx.currentTime < b + 0.4) await window.__sleep(100);
      const seen = M.HX.rhzLog, two = seen.filter((x) => x.t >= a - 1e-6 && x.t < b - 1e-6);
      o.n = two.length; o.seen = seen.length; o.loop = seen.every((x) => !x.v || x.loop); o.bus = seen.every((x) => x.bus === M.hxChain('fx1').in);
      o.humus = M.hxEvents(0, A.ctx.currentTime + 1, true).filter((e) => e.eng === 'rhz').length;
      o.gesp = await window.__gespielt(2.5);
      M.hxNaehr(L, 'rhz', false);
      o.on = !!L.naehrt.rhz; o.len = len;
      return o;
    });
    ok(r.k && r.n === 2 * r.notes, `Nähren · Rhizom: every loop note strikes the net – ${r.n} strikes in two passes of ${r.notes} notes`);
    ok(r.loop && r.bus && r.humus === 0, '  on the Hexenring\'s way (the chain\'s copy into the strip „Hexenring“), loop voices that give way, never in the notes Humus');
    ok(r.gesp >= 0 && r.gesp < 1e-5, `  never re-captured: „Gespielt“ heard nothing of them (RMS ${r.gesp.toExponential(1)})`);
    // ---------- B2 · Nähren Regen ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {}, L = M.hxLoopsLive()[0];
      const gk0 = M.GK.on, ng0 = M.GK.p.neigen; M.GK.on = true; M.gkSet('neigen', 'regen'); await window.__sleep(300); if (!M.RG.on) M.rgStart(A.ctx.currentTime);
      M.hxNaehr(L, 'rgn', true);
      await window.__sleep(M.hxLen(L) * 1000 + 400);
      const ks = M.RG.k.filter((x) => x.hx === L.key); o.keime = ks.length; o.notes = L.notes.length;
      // a spore striking one of them: its strike goes the Hexenring's way
      const before = new Set(A.voices);
      M.rgFire({ tg: A.ctx.currentTime + 0.05, f: ks[0] ? ks[0].f : 440, y: 0.5, vel: 0.6, pan: 0, k: ks[0], key: 'x', x: 0.5, v: 0.5 });
      const nv = [...A.voices].filter((v) => !before.has(v)); await window.__sleep(200);
      o.route = nv.length === 1 && nv[0].loop === true && !nv[0].hxE;   // (a loop voice; hxE: it would be in the notes Humus)
      M.hxNaehr(L, 'rgn', false); M.gkSet('neigen', ng0); M.GK.on = gk0; M.rgStop();
      return o;
    });
    ok(r.keime >= 3 && r.keime <= r.notes, `Nähren · Regen: the loop's notes plant Keime (${r.keime} of its ${r.notes} notes, one per column and height)`);
    ok(r.route, '  a spore striking a Keim the Schleife planted sounds on the Hexenring\'s way (loop voice, never re-captured)');
    // ---------- B3 · the Höfe of Glut and Sehne ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {}, L = M.hxLoopsLive()[0];
      for (const kind of ['shn', 'glt']) {
        M.hxNaehr(L, kind, true);
        const F = M.HXN.feed.get(L.id + ':' + kind); o[kind] = { made: !!F, n: F ? F.vs.length : 0 };
        if (!F) continue;
        await window.__sleep(2500);
        o[kind].hof = await window.__rmsOf(F.out, 2000); o[kind].loop = await window.__rmsOf(M.HX.node, 2000, 0);
        o[kind].idx = F.vs.map((v) => v.I); o[kind].want = M.hxFeedIdx(L, kind);
        o[kind].cost = F.cost; o[kind].vc = M.getQ().cost[kind];
      }
      o.load = M.hxFeedCost();
      o.gesp = await window.__gespielt(2.5);
      // a new scale: they glide to their degrees there
      const F = M.HXN.feed.get(L.id + ':shn'), f0 = F.vs.map((v) => v.pf.value), sc = M.P['t.scale'], alt = Object.keys(M.SCALES).find((k) => k !== sc && !M.SCALES[k].free && (M.SCALES[k].s || M.SCALES[k].r).length === (M.SCALES[sc].s || M.SCALES[sc].r).length);
      M.setParam('t.scale', alt); for (let i = 0; i < 100 && M.HX.folge; i++) await window.__sleep(50);
      await window.__sleep(900);
      o.ret = F.vs.map((v, i) => [+f0[i].toFixed(1), +v.pf.value.toFixed(1), +M.hxIdxF(v.I).toFixed(1)]);
      M.setParam('t.scale', sc); for (let i = 0; i < 100 && M.HX.folge; i++) await window.__sleep(50);
      M.hxNaehr(L, 'shn', false); M.hxNaehr(L, 'glt', false);
      o.offA = M.HXN.feed.size; await window.__sleep(3300); o.offB = M.HXN.feed.size; o.loadOff = M.hxFeedCost();
      return o;
    });
    for (const [k, nm] of [['shn', 'Sehne'], ['glt', 'Glut']]) {
      const d = r[k] && 20 * Math.log10(r[k].hof / r[k].loop);
      ok(r[k] && r[k].made && r[k].hof > 1e-4 && d > -24 && d < -3, `Nähren · ${nm}: a Hof of ${r[k].n} held voices fed by the Schleife, ${d.toFixed(1)} dB under it (the loop ${(20 * Math.log10(r[k].loop)).toFixed(1)} dBFS)`);
      ok(r[k] && JSON.stringify(r[k].idx) === JSON.stringify(r[k].want) && Math.abs(r[k].cost - r[k].n * r[k].vc) < 1e-9, `  tuned to the loop's most played degrees (${r[k].idx.join(', ')}); priced as ${r[k].n} voices (${r[k].cost.toFixed(2)} Einheiten)`);
    }
    ok(Math.abs(r.load - r.shn.cost - r.glt.cost) < 1e-9 && r.loadOff === 0, `  counted in voiceLoad() while they ring (${r.load.toFixed(2)}), nothing once off`);
    ok(r.gesp >= 0 && r.gesp < 1e-5, `  never re-captured: „Gespielt“ silent while the Höfe sound (RMS ${r.gesp.toExponential(1)})`);
    ok(r.ret.every(([a, b, c]) => Math.abs(b - c) / c < 0.01) && r.ret.some(([a, b]) => Math.abs(a - b) > 0.5), `  a new scale: the strings glide to their degrees there (${r.ret.map((x) => x[0] + '→' + x[1]).join(', ')} Hz)`);
    ok(r.offA === 0 && r.offB === 0, '  off: the Hof rings out and goes');
    // ---------- B4 · Treffen ----------
    r = await ev(async () => {
      const M = window.__M, o = {};
      o.crt = M.hxCrt([[0, 20 * 48], [0, 28 * 48], [0, 32 * 48]], 1);
      o.crt2 = M.hxCrt([[4, 6], [1, 9]], 0);   // (x ≡ 4 mod 6, x ≡ 1 mod 9: 10)
      o.none = M.hxCrt([[1, 4], [2, 6]], 0);   // (no solution)
      return o;
    });
    ok(r.crt === 280 * 4 * 48 && r.crt2 === 10 && r.none === null, `Treffen: the remainder theorem – 5, 7 and 8 bars meet after 280 bars (${r.crt / 192} bars), x ≡ 4 (6) ∧ x ≡ 1 (9) → 10, no solution: none`);
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset(); window.__grid(120); await window.__sleep(300);
      const now = A.ctx.currentTime, b = Math.ceil(M.tgBeat(now + 0.5) / 4) * 4;
      // three Takt loops of 5, 7 and 8 bars, all from the same bar line
      for (const [slot, bars] of [[0, 5], [1, 7], [2, 8]]) {
        const L = M.hxLoopMake({ slot, lock: 'takt', b0: b, beats: 4 * bars, bpb: 4, gain: 0.001, eng: 'klb' });
        const n = Math.round(M.hxLen(L) * M.A.ctx.sampleRate) + 4000, [aud] = (() => { const a = []; for (let i = 0; i < Math.ceil(n / M.HX_CH); i++) a.push([new Float32Array(M.HX_CH), new Float32Array(M.HX_CH)]); return [a]; })();
        M.hxSchNew(L.id, { in: 0, w0: 0, w1: n - 4000, f0: 0, pre: 0, len: n - 4000, post: 4000, n, aus: null, stale: true }, { aud, join: 'cut', fin: 0, probe: false, chain: false });
      }
      await window.__sleep(300);
      M.HX.trefC = null; const T0 = M.hxTreffen(); o.first = T0.all && Math.round(T0.all.b - b);   // (they start together at b: that is their first meeting)
      const list = M.hxTrefLoops(), t1 = M.tgTime(b) + 0.2, all = M.hxTreffenOf(list, t1);
      o.all = all; o.bAll = all && all.b; o.b = b; o.pairs = [];
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const T = M.hxTreffenOf([list[i], list[j]], t1); o.pairs.push([list[i].slot, list[j].slot, T ? Math.round(T.b - b) : -1]); }
      return o;
    });
    ok(r.first === 0 && r.all && Math.round(r.bAll - r.b) === 280 * 4, `  live: Takt loops of 5, 7 and 8 bars, begun on one bar line, meet there and next ${(r.bAll - r.b) / 4} bars later; pairs at ${r.pairs.map((p) => (p[0] + 1) + '·' + (p[1] + 1) + ' ' + p[2] / 4 + ' Takte').join(', ')}`);
    ok(r.pairs.length === 3 && r.pairs.some((p) => p[2] === 35 * 4) && r.pairs.some((p) => p[2] === 40 * 4) && r.pairs.some((p) => p[2] === 56 * 4), '  each pair its least common multiple (35, 40, 56 bars)');
    // ---------- B5 · Treffen setzen ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, o = {};
      await window.__reset(); if (M.SEQ.on) M.seqStop(); await window.__sleep(300);
      // four free loops: a tone and its silence (phrase 0.5–0.9 s), started at different moments
      const mk = (slot, Ls, ph, f) => {
        const Lf = Math.round(Ls * SR), n = Lf + 4000, a = []; for (let i = 0; i < Math.ceil(n / M.HX_CH); i++) a.push([new Float32Array(M.HX_CH), new Float32Array(M.HX_CH)]);
        for (let i = 0; i < Math.round(ph * SR); i++) { const c = a[Math.floor(i / M.HX_CH)], v = 0.05 * Math.sin(2 * Math.PI * f * i / SR) * Math.min(1, (ph * SR - i) / 2000); c[0][i % M.HX_CH] = v; c[1][i % M.HX_CH] = v; }
        const L = M.hxLoopMake({ slot, lock: 'frei', Lf, ph0: Math.round(M.hxF(A.ctx.currentTime + 0.2)), gain: 1, eng: 'klb' });
        M.hxSchNew(L.id, { in: 0, w0: 0, w1: Lf, f0: 0, pre: 0, len: Lf, post: 4000, n, aus: null, stale: true }, { aud: a, join: 'cut', fin: 0, probe: false, chain: false });
        return L;
      };
      const Ls = [];
      for (const [slot, len, ph, f, wait] of [[0, 3.1, 0.6, 330, 0], [1, 2.3, 0.5, 440, 700], [2, 4.2, 0.9, 550, 1300], [3, 2.9, 0.7, 660, 400]]) { await window.__sleep(wait); Ls.push(mk(slot, len, ph, f)); }
      await window.__sleep(600);
      const T = A.ctx.currentTime + 30, ps = [];
      const mOn = M.hxMsg; M.HX.__ps = ps;
      const port = M.HX.node.port, prev = port.onmessage; port.onmessage = (e) => { if (e.data && e.data.passStart) ps.push([e.data.passStart.loop, e.data.passStart.f]); prev(e); };
      const plan = M.hxTreffenSetzen(T, { bluehen: true, ton: { scale: Object.keys(M.SCALES).find((k) => k !== M.P['t.scale'] && !M.SCALES[k].free), root: M.P['t.root'] } });
      o.plan = !!plan; o.primes = plan && plan.items.map((x) => x.k); o.lens = plan && plan.items.map((x) => +(x.Lf / SR).toFixed(3));
      o.ph = plan && plan.items.map((x) => +x.ph.toFixed(2));
      o.T = M.hxF(plan.T); const TT = plan.T;
      while (A.ctx.currentTime < TT + 1.5) await window.__sleep(200);
      port.onmessage = prev;
      const tol = 0.03 * SR, f0 = Math.min(...plan.items.map((x) => x.f)), byL = {};
      for (const [id, f] of ps) (byL[id] = byL[id] || new Set()).add(f);
      const ids = Ls.map((L) => L.id), starts = ids.map((id) => [...(byL[id] || [])].filter((f) => f >= f0).sort((a, b) => a - b));
      o.atT = starts.map((s) => Math.min(...s.map((f) => Math.abs(f - o.T))));
      o.before = 0;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (const a of starts[i]) for (const b of starts[j]) if (a < o.T - tol && Math.abs(a - b) <= tol && !(a === plan.items[i].f && b === plan.items[j].f)) o.before++;
      o.blue = M.HX.blueN || 0; o.folge = M.HX.folge ? +(M.HX.folge.t - TT).toFixed(3) : null; o.tonSeen = M.HX.tref && M.HX.tref.tonGo;
      o.gap = (await M.hxReport()).gap.length;
      return o;
    });
    ok(r.plan && r.atT.every((d) => d <= 1), `Treffen setzen: four free loops (2.3 – 4.2 s, begun apart) get prime counts ${r.primes.join(', ')} → lengths ${r.lens.join(', ')} s; all four start together at T – within ${Math.max(...r.atT)} frames (the processor's pass starts)`);
    ok(r.before === 0, `  no two of them meet before T (${r.before} meetings within 30 ms)`);
    ok(r.lens.every((l, i) => l >= r.ph[i]), `  only the silence changed: every length ≥ its phrase (${r.ph.join(', ')} s), in gap mode (${r.gap} loops)`);
    ok(r.blue >= 1 && r.tonSeen, `  Fruchten: the webs bloomed at T, the planned key was announced for it`);
    // ---------- B6 · the Sammelschleife ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset(); window.__grid(120); await window.__sleep(300);
      const k = await window.__mk(1, [0, null, 4, null], 'klb'); const L = window.__L(k);
      await window.__sleep(2400);
      const B = M.hxAccMake(L, 1.5, 0.7); o.B = !!B;
      await window.__sleep(200);
      let rep = await M.hxReport(); o.acc = rep.acc;
      await window.__sleep(M.hxLen(B) * 1000 * 2 + 500);
      o.meter = (M.HX.meter.find((x) => x[0] === B.id) || [0, 0])[1];
      o.len = +(M.hxLen(B) / M.hxLen(L)).toFixed(3);
      M.hxAccSet(B, 'on', false); await window.__sleep(800);
      rep = await M.hxReport(); o.accOff = rep.acc.length; const S = M.HX.sch.get(B.sch[0]); o.saved = !!(S && S.aud);
      let e = 0; if (S && S.aud) for (const c of S.aud) for (const x of c[0]) e += x * x; o.tape = Math.sqrt(e / (S.aud.length * 8192));
      o.cost = M.hxLoad(); M.hxAccSet(B, 'on', true); o.cost2 = M.hxLoad(); M.hxAccSet(B, 'on', false);
      o.key = B.key;
      return o;
    });
    ok(r.B && r.acc.length === 1 && Math.abs(r.acc[0][2] - 0.7) < 1e-9 && Math.abs(r.len - 1.5) < 0.01, `Schleife in Schleife: a new Sammelschleife, 1½ the length (${r.len}), records its source with feedback 0,7 (the processor's acc)`);
    ok(r.meter > 1e-4 && r.saved && r.tape > 1e-4 && r.accOff === 0, `  it plays what it gathered (meter ${r.meter.toExponential(1)}); Festhalten stops the recording and its tape comes to the page to be kept (RMS ${r.tape.toExponential(1)})`);
    ok(Math.abs(r.cost2 - r.cost - 0.3) < 0.31, `  recording counts in voiceLoad() (${r.cost.toFixed(2)} → ${r.cost2.toFixed(2)})`);
    await page.waitForTimeout(1500);
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await H.tools(page); await G.gtools(page);
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await setupB();
    r = await ev(async (key) => {
      const M = window.__M;
      for (let i = 0; i < 80 && !M.hxLoopsLive().some((L) => L.key === key); i++) await window.__sleep(100);
      await window.__sleep(600);
      const B = M.hxLoopsLive().find((L) => L.key === key), S = B && M.HX.sch.get(B.sch[0]);
      let e = 0; if (S && S.aud) for (const c of S.aud) for (const x of c[0]) e += x * x;
      return { back: !!B, acc: B && B.acc, tape: S && S.aud ? Math.sqrt(e / (S.aud.length * 8192)) : 0 };
    }, r.key);
    ok(r.back && r.acc && r.acc.src && r.tape > 1e-4, `  after a reload it is back with its tape (RMS ${r.tape.toExponential(1)}) and its source`);
    // ---------- B7 · Einwurzeln follows a scale change ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, Lf = Math.round(1.5 * SR), o = {};
      await window.__reset();   // (no loop that follows the key: the field changes at once)
      const band = (V, fs) => {   // the share of the pass's energy (80 Hz – 6 kHz) within ±1.5 % of the given frequencies
        const N = 1 << Math.ceil(Math.log2(Lf)), re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < Lf; i++) re[i] = V.L[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Lf));
        for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
        for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
        let tot = 0, inb = 0; for (let b = 1; b < N / 2; b++) { const f = b * SR / N, e = re[b] * re[b] + im[b] * im[b]; if (f < 80 || f > 6000) continue; tot += e; if (fs.some((x) => Math.abs(f / x - 1) < 0.015)) inb += e; }
        return inb / tot;
      };
      const sc0 = M.P['t.scale'];
      // a loop as played: five plucked notes of Moll-Pentatonik (their partials decaying), one pass of 1.5 s
      M.setParam('t.scale', 'mpent'); await window.__sleep(200);
      const fA = M.gspFreqs(), V0 = { L: new Float32Array(Lf), R: new Float32Array(Lf) };
      for (const [k, t0] of [[0, 0], [2, 0.25], [4, 0.5], [1, 0.75], [3, 1.0]]) { const f = M.N.notes[k + 3].f; for (let i = Math.round(t0 * SR); i < Lf; i++) { const t = i / SR - t0; let x = 0; for (let h = 1; h <= 8; h++) x += Math.sin(2 * Math.PI * f * h * t) / (h * h) * Math.exp(-t * (2 + h)); V0.L[i] += 0.1 * x; V0.R[i] += 0.1 * x; } }
      let s0 = 0; for (let i = 0; i < Lf; i++) s0 += V0.L[i] * V0.L[i] + V0.R[i] * V0.R[i]; const r0 = Math.sqrt(s0 / (2 * Lf)); V0.rms0 = r0;
      let V = V0; o.a0 = band(V, fA);
      for (let g = 0; g < 8; g++) V = await M.hxEinwPass(V, 0.08, g + 1);
      o.a8 = band(V, fA);
      // the scale changes (Dur-Pentatonik: the root and the fifth stay): the roots follow
      M.setParam('t.scale', 'dpent'); await window.__sleep(200);
      const fB = M.gspFreqs(); o.changed = fB.join() !== fA.join(); const onlyA = fA.filter((f) => !fB.some((x) => Math.abs(f / x - 1) < 0.02));
      o.b0 = band(V, fB); o.oa0 = band(V, onlyA);
      for (let g = 0; g < 20; g++) V = await M.hxEinwPass(V, 0.08, g + 9);
      o.b20 = band(V, fB); o.oa20 = band(V, onlyA);
      o.rms = Math.sqrt((V.L.reduce((a, x) => a + x * x, 0) + V.R.reduce((a, x) => a + x * x, 0)) / (2 * Lf)) / r0;
      M.setParam('t.scale', sc0);
      const t0 = performance.now(); await M.hxEinwPass(V0, 0.08, 1); o.ms = performance.now() - t0;
      return o;
    });
    ok(1 - r.a8 < 0.6 * (1 - r.a0), `Einwurzeln: a played loop through the scale's web, 8 passes at depth 0,08 – its energy off the web's tones ${(100 * (1 - r.a0)).toFixed(1)} → ${(100 * (1 - r.a8)).toFixed(1)} %`);
    ok(r.changed && r.b20 > 0.9 && r.b20 > r.b0 + 0.2 && r.oa20 < 0.3 * r.oa0, `  the scale changes, the roots follow: at the new scale's tones ${(100 * r.b0).toFixed(0)} → ${(100 * r.b20).toFixed(0)} % in 20 passes, at the tones only the old one had ${(100 * r.oa0).toFixed(0)} → ${(100 * r.oa20).toFixed(1)} %`);
    ok(Math.abs(r.rms - 1) < 0.02, `  the loudness kept (RMS ×${r.rms.toFixed(3)}); a generation of 1.5 s renders in ${r.ms.toFixed(0)} ms (offline, its own thread)`);
    // ---------- B8 · Abrieb nach Moder ----------
    r = await ev(async () => {
      const M = window.__M, SR = 48000, Lf = SR, o = {};
      const L = new Float32Array(Lf), R = new Float32Array(Lf), f0 = 192;   // (192 Hz: a whole number of periods in the pass)
      for (let i = 0; i < Lf; i++) { let x = 0; for (let h = 1; h <= 30; h++) x += Math.sin(2 * Math.PI * f0 * h * i / SR) / h; L[i] = 0.1 * x; R[i] = 0.1 * x; }
      const spec = (X, lo, hi) => { let e = 0; for (let b = Math.round(lo); b <= hi; b++) { let re = 0, im = 0; for (let i = 0; i < Lf; i += 4) { const a = 2 * Math.PI * b * i / Lf; re += X[i] * Math.cos(a); im -= X[i] * Math.sin(a); } e += re * re + im * im; } return e; };
      const hiE = (X) => spec(X, 3000, 3000 + 192 * 4), loE = (X) => spec(X, 190, 194);
      const a1 = M.hxModerPass(L, R, 1, 0.25, 5, SR), a8 = M.hxModerPass(L, R, 8, 0.25, 5, SR), b8 = M.hxModerPass(L, R, 8, 0.25, 5, SR), c8 = M.hxModerPass(L, R, 8, 0.25, 6, SR);
      o.same = a8[0].every((x, i) => x === b8[0][i]); o.other = a8[0].some((x, i) => x !== c8[0][i]);
      o.hi0 = hiE(L); o.hi1 = hiE(a1[0]); o.hi8 = hiE(a8[0]); o.lo0 = loE(L); o.lo8 = loE(a8[0]);
      // crackle: the high band's energy comes in sparse bursts (its envelope's peak against its mean)
      const env = (X) => { const hp = new Float32Array(Lf); let y = 0, x1 = 0; for (let i = 0; i < Lf; i++) { y = 0.7 * (y + X[i] - x1); x1 = X[i]; hp[i] = y; } const w = 240, e = []; for (let i = 0; i + w < Lf; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += hp[j] * hp[j]; e.push(s); } const m = e.reduce((a, b) => a + b, 0) / e.length; return Math.max(...e) / m; };
      o.cr0 = env(L); o.cr8 = env(a8[0]);
      let d = 0; for (let i = 1; i < 200; i++) d = Math.max(d, Math.abs(a8[0][i] - a8[0][i - 1])); o.wrap = Math.abs(a8[0][0] - a8[0][Lf - 1]); o.step = d;
      const t0 = performance.now(); await M.hxWk('moder', { L, R, age: 4, rate: 0.25, seed: 3, sr: SR }); o.ms = performance.now() - t0;
      return o;
    });
    ok(r.same && r.other, 'Abrieb nach Moder: the same pass, age and seed – the same samples; another seed – another crackle');
    ok(r.hi8 < 0.6 * r.hi0 && r.hi1 > r.hi8 && r.lo8 > r.lo0, `  the upper partials crumble with the age (3–3.8 kHz: ×${(r.hi1 / r.hi0).toFixed(2)} at age 1, ×${(r.hi8 / r.hi0).toFixed(2)} at 8), the low end warms (192 Hz ×${(r.lo8 / r.lo0).toFixed(2)})`);
    ok(r.cr8 > 1.5 * r.cr0, `  crackle at their pitches: the high band comes in sparse bursts (peak/mean ${r.cr0.toFixed(1)} → ${r.cr8.toFixed(1)})`);
    ok(r.wrap < 0.05, `  periodic: its end meets its start (step ${r.wrap.toFixed(4)}); a pass of 1 s in the Worker ${r.ms.toFixed(0)} ms`);
    // ---------- B9 · Zersetzung live ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset(); window.__grid(120); await window.__sleep(300);
      const k = await window.__mk(1, [0, 2, 4, 2], 'klb'); const L = window.__L(k);
      await window.__sleep(3500);
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 120 && !S.aud; i++) await window.__sleep(100);
      const aud0 = S.aud, sum0 = aud0.reduce((a, c) => a + c[0].reduce((x, y) => x + Math.abs(y), 0), 0);
      const sent = [], pp = M.HX.node.port.postMessage.bind(M.HX.node.port);
      M.HX.node.port.postMessage = (m, t) => { if (m && m.replace && m.replace.schicht === S.id) sent.push([m.replace.f, m.replace.len, m.replace.rho]); return pp(m, t); };
      M.hxEinwSet(L, 0.08); M.hxModerSet(L, 0.1);
      await window.__sleep(M.hxLen(L) * 1000 * 5 + 1500);
      o.sent = sent.length; o.atSeams = sent.every(([f]) => { const k = M.hxPassK(L, f); return M.hxPassF(L, k) === f; });
      o.gen = S.zr && S.zr.gen; o.age = S.zr && S.zr.age; o.clean = S.aud === aud0 && Math.abs(aud0.reduce((a, c) => a + c[0].reduce((x, y) => x + Math.abs(y), 0), 0) - sum0) === 0;
      M.hxEinwSet(L, 0); M.hxModerSet(L, 0); await window.__sleep(200);
      o.back = sent.length - o.sent; o.zr = !!S.zr;
      M.HX.node.port.postMessage = pp;
      M.hxCardOpen(L.slot); await window.__sleep(400);
      o.ui = ['Einwurzeln', 'Moder'].every((t) => [...document.querySelectorAll('.hx-card .lab')].some((x) => x.textContent === t));
      return o;
    });
    ok(r.sent >= 3 && r.atSeams && r.gen >= 3 && r.age >= 3, `Zersetzung live (Einwurzeln mittel + Moder): a version of its own for every pass, each at a seam (${r.sent} passes, root generation ${r.gen}, age ${r.age})`);
    ok(r.clean && r.back === 1 && !r.zr, '  the clean Schicht kept untouched; both off – the clean one again from the next seam');
    ok(r.ui, '  the card\'s Verwandeln has „Einwurzeln“ and „Moder“');
  }
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
