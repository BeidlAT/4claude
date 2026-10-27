// Hexenring – one resampling per loop (SPEC §9, §21; step 1d): the reads of a loop at one rate and one phase are summed
// and resampled once (the resampler is linear – the same sound); with Taumeln each Schicht is de-drifted once, offline
// (its own drift taken out through the 160-tap kernel), so all of a loop's Schichten read at the live drift alone and share
// that one resampling. Offline, against the step-1c paths (po.noSum, po.noDD) and against the exact path (analytic tones,
// the drift as the processor reads it): the sum equals the separate reads; before it takes over the de-drifted path is
// the step-1c one; after, it is nearer the exact path than the step-1c read (whose drift is now read at the span's
// middle: before, at its start, it lagged by up to ½ frame); no click where it takes over; a new version (a bake) reads as
// played until its own de-drifted one comes. Live: a harvest with Taumeln – the page lends the chunks, the cost counts
// one resampling per loop and output once its Schichten took over (HX.rs), the job's own cost while it runs; Taumeln off:
// each Schicht plays its own audio again from the next seam.
// (offline the jobs run 512 frames a quantum – their pace, not their result; live 64)
//   node t-hx-taumeln.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  let { page, errors } = await H.open({ start: false });
  const r = await page.evaluate(async () => {
    const SR = 44100, CH = 8192, pre = 22050, len = 176400, post = 22050, n = pre + len + post, out = {};
    const TONES = [[[0.2, 220, 0], [0.05, 2637, 1.1], [0.02, 7040, 2.2]], [[0.15, 329.6, 0.3], [0.04, 3520, 0.2]], [[0.1, 493.9, 0.9], [0.03, 5274, 1.7]], [[0.08, 659.3, 0.5], [0.02, 9397, 0.1]]];
    const Sx = (s, x) => { let v = 0; for (const [a, f, p] of TONES[s]) v += a * Math.sin(2 * Math.PI * f * x / SR + p); return v; };
    const D = (s) => { const d = new Float32Array(Math.ceil(n / 128) + 1); for (let k = 0; k < d.length; k++) d[k] = 8 * Math.sin(2 * Math.PI * 2.5 * (0.05 + 0.13 * s + k * 128 / SR)); return d; };
    const Dat = (d, x) => { const u = Math.max(0, Math.min(d.length - 1, x / 128)), i = Math.min(d.length - 2, u | 0); return d[i] + (u - i) * (d[i + 1] - d[i]); };
    const mkCh = (s) => { const a = []; for (let c = 0; c * CH < n; c++) { const L = new Float32Array(CH), R = new Float32Array(CH); for (let j = 0; j < CH; j++) { const i = c * CH + j; if (i < n) { const v = Sx(s, i); L[j] = v; R[j] = 0.9 * v; } } a.push([L, R]); } return a; };
    async function run(po, o) {
      const frames = o.dur * SR, ctx = await window.__ringCtx(frames, SR);
      const msgs = [{ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }];
      if (o.rate) msgs.push({ rate: { loop: 1, cents: o.rate } });
      for (let s = 0; s < o.ns; s++) msgs.push({ schicht: Object.assign({ loop: 1, id: s + 1, chunks: mkCh(s), n, pre: o.pre != null ? o.pre : pre, len, join: 'xf', X: 441, rho: 1, tau: true, dd: 1 }, o.drift ? { dr: D(s) } : {}) });
      if (o.replace) msgs.push({ replace: { loop: 1, schicht: 1, chunks: mkCh(0), n, pre, len, join: 'xf', X: 441, rho: 1, f: o.replace, dd: 1 } });
      const pool = []; for (let i = 0; i < 12 + 60 * o.ns; i++) pool.push([new Float32Array(CH), new Float32Array(CH)]); msgs.push({ pool });
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: Object.assign({ humusS: 1, msgs, rid: 90 + Math.floor(Math.random() * 1e6), drift: o.drift ? 1 : 0, ddPool: 1, ddBlk: 512 }, po) });
      const got = []; node.port.onmessage = (e) => { const d = e.data; if (d.ddAdopt || d.ddRun) got.push(d); };
      if (o.drift) { const b = ctx.createBuffer(1, frames, SR), d = b.getChannelData(0); for (let i = 0; i < frames; i++) d[i] = 8 * Math.sin(2 * Math.PI * 2.5 * (i / SR) + 1.1); const src = ctx.createBufferSource(); src.buffer = b; src.connect(node, 0, 1); src.start(); }
      node.connect(ctx.destination, 0);
      const buf = await ctx.startRendering();
      return { L: buf.getChannelData(0), got };
    }
    const db = (A, B, t0, t1) => { let d = 0, a = 0; for (let i = Math.round(t0 * SR); i < Math.round(t1 * SR); i++) { const e = A[i] - B[i]; d += e * e; a += A[i] * A[i]; } return +(10 * Math.log10(d / a + 1e-30)).toFixed(1); };
    // 1) the loop's own rate (MIDI clock nachführen, 17 ct): four Schichten summed vs read one by one
    let A = await run({ noSum: 1 }, { dur: 10, ns: 4, rate: 17 }), B = await run({}, { dur: 10, ns: 4, rate: 17 });
    out.sum = db(A.L, B.L, 0.05, 9.95);
    // 2) Taumeln, three Schichten: step 1c (no de-drift, no sum) and the new path, against the exact one
    const dur = 22, frames = dur * SR;
    const dvq = (t) => 8 * Math.sin(2 * Math.PI * 2.5 * ((t - (t % 128)) / SR) + 1.1);
    const ref = new Float32Array(frames);
    for (let s = 0; s < 3; s++) { const d = D(s); for (let p0 = 0; p0 < frames; p0 += len) { let q = 0; for (let t = p0; t < Math.min(frames, p0 + len); t++) { ref[t] += Sx(s, pre + q); q += Math.pow(2, (dvq(t) - Dat(d, pre + q)) / 1200); } } }
    const ex = (X, k0) => { let d = 0, a = 0; for (let p0 = k0 * len; p0 < frames; p0 += len) for (let t = p0 + 1323; t < Math.min(frames, p0 + len) - 441; t++) { const e = X[t] - ref[t]; d += e * e; a += ref[t] * ref[t]; } return +(10 * Math.log10(d / a)).toFixed(1); };
    A = await run({ noDD: 1, noSum: 1 }, { dur, ns: 3, drift: 1 }); B = await run({}, { dur, ns: 3, drift: 1 });
    const adopt = B.got.filter((d) => d.ddAdopt).length, runs = B.got.filter((d) => d.ddRun && d.ddRun.on).length;
    out.tau = { before: db(A.L, B.L, 0.05, 3.95), c1: ex(A.L, 1), dd: ex(B.L, 3), adopt, runs };
    // no click where it takes over: the largest step around each pass start, against the step-1c path's
    const step = (X, t0, t1) => { let m = 0; for (let i = Math.round(t0 * SR) + 1; i < Math.round(t1 * SR); i++) m = Math.max(m, Math.abs(X[i] - X[i - 1])); return m; };
    out.click = [4, 8, 12, 16, 20].map((s) => +(step(B.L, s - 0.02, s + 0.03) / step(A.L, s - 0.02, s + 0.03)).toFixed(3));
    // 3) a new version arrives (a bake) after it took over: read as played, its own de-drifted version again later
    const C = await run({}, { dur, ns: 1, drift: 1, replace: 12 * SR });
    const A1 = await run({ noDD: 1, noSum: 1 }, { dur, ns: 1, drift: 1, replace: 12 * SR });
    out.rep = { adopt: C.got.filter((d) => d.ddAdopt).length, after: db(A1.L, C.L, 12.05, 15.95), nan: C.L.some((x) => x !== x) };
    // 4) a Schicht that enters mid-pass (its buffer starts 20 000 frames after the bar line: pre < 0) – found by t-hx-fuzz
    const E1 = await run({}, { dur: 14, ns: 1, drift: 1, pre: -20000 }), E0 = await run({ noDD: 1, noSum: 1 }, { dur: 14, ns: 1, drift: 1, pre: -20000 });
    out.neg = { adopt: E1.got.filter((d) => d.ddAdopt).length, nan: E1.L.some((x) => x !== x), db: db(E0.L, E1.L, 8.5, 11.9) };
    return out;
  });
  ok(r.sum <= -120, `the loop's own rate (17 ct): four Schichten summed, then resampled once = read one by one (${r.sum} dB)`);
  ok(r.tau.before <= -120, `Taumeln, three Schichten: before the de-drifted versions take over the reading is step 1c's (${r.tau.before} dB)`);
  ok(r.tau.runs === 3 && r.tau.adopt === 3, `  each Schicht de-drifted once, offline (${r.tau.runs} jobs), taken over at a pass start (${r.tau.adopt})`);
  ok(r.tau.dd <= r.tau.c1 - 3 && r.tau.dd <= -60, `  against the exact path: the summed de-drifted read ${r.tau.dd} dB, step 1c's read (drift at the span's middle) ${r.tau.c1} dB`);
  ok(r.click.every((x) => x < 1.05), `  no click where it takes over (the largest step around each pass start against step 1c's: ${r.click.join(', ')})`);
  ok(r.rep.adopt === 2 && !r.rep.nan && r.rep.after < -50, `  a new version after it took over (a bake): read as played, then de-drifted again (${r.rep.adopt} take-overs; ${r.rep.after} dB from step 1c's after it)`);
  ok(r.neg.adopt === 1 && !r.neg.nan && r.neg.db < -45, `  a Schicht entering mid-pass (its anchor before its buffer): de-drifted, no NaN, ${r.neg.db} dB from step 1c's read`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors (offline)');
  await H.close();
  // ---- live: a harvest with Taumeln on; the page lends the chunks; the cost ----
  ({ page, errors } = await G.open({ w: 1280, h: 800, init: () => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); }; } }));   // (the underrun guard held back: on a loaded test machine it lets Taumeln rest – t-hx-guard tests it)
  const L = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); window.__grid(120); M.setParam('mov.drift', 8); await window.__sleep(400);
    const run = async (degs) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.25, degs, 1, { eng: 'klb', dur: 0.2 });
      await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null); await window.__sleep(200);
      for (const L of M.hxLoopsLive()) if (!L.taumeln) M.hxTaumelnSet(L, true);   // (since 27.10.2026 Taumeln is a choice, off by default – here it is chosen)
    };
    await run([0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 4, 2, 5, 9, 5]);
    const Lp = M.hxLoopsLive()[0];
    o.rs0 = (M.hxCount(), M.HX.rs);
    M.setParam('hx.modus', 'dieselbe');
    for (const d of [[11, 9, 7, 9, 11, 12, 14, 12, 11, 9, 7, 9, 11, 12, 14, 12], [2, 2, 4, 4, 5, 5, 7, 7, 2, 2, 4, 4, 5, 5, 7, 7]]) { await run(d); }
    M.setParam('hx.modus', 'neu');
    o.sch = Lp.sch.length; M.hxCount(); o.rs1 = M.HX.rs;
    o.dd = []; for (let i = 0; i < 400; i++) { M.hxCount(); o.dd.push(M.HX.dd); const all = Lp.sch.every((id) => M.HX.sch.get(id) && M.HX.sch.get(id).ddOn); if (all) break; await window.__sleep(100); }
    o.on = Lp.sch.map((id) => !!(M.HX.sch.get(id) || {}).ddOn); M.hxCount(); o.rs2 = M.HX.rs; o.ddMax = Math.max(...o.dd);
    o.load = M.hxLoad();
    // Taumeln off: from the next seam each Schicht plays its own audio again (bit for bit, no resampling)
    M.hxTaumelnSet(Lp, false);
    const sw = M.hxNextSeam(Lp); await window.__until(M.hxT(sw.f) + 0.3);
    const rep = await M.hxReport();
    o.offOn = Lp.sch.map((id) => !!(M.HX.sch.get(id) || {}).ddOn); o.offDd = rep && rep.dd ? rep.dd.find((x) => x.length === Lp.sch.length) || null : null; M.hxCount(); o.rsOff = M.HX.rs;   // (dd: its only loop)
    M.hxTaumelnSet(Lp, true);
    M.setParam('mov.drift', 6);
    return o;
  });
  ok(L.sch === 3, `live: a Schleife with three Schichten (Taumeln on, drift 8 ct): ${L.sch}`);
  ok(L.on.every(Boolean), `  every Schicht's de-drifted version took over (the page lent the chunks; ${L.on.filter(Boolean).length}/3)`);
  ok(L.rs1 >= 2 && L.rs2 === 1, `  the cost: ${L.rs1} resamplings while some read against their own drift → ${L.rs2} for the loop once all took over (HX.rs)`);
  ok(L.offOn.every((x) => !x) && L.offDd && L.offDd.length === 3 && L.offDd.every((x) => x === 0) && L.rsOff === 0, `  Taumeln off: from the next seam every Schicht plays its own audio again, as recorded (de-drifted at the processor: ${JSON.stringify(L.offDd)}; resamplings ${L.rsOff})`);
  ok(L.ddMax >= 1, `  while a de-drifted version is made its job is counted (HX.dd up to ${L.ddMax}, HX_COST.dd each)`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors (live)');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
