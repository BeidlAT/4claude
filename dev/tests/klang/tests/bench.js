// Offline render bench for the worklet engines (klang SPEC §7.1 + the acceptance rows of §3 and the check files).
// Renders the real app (slot kd-inst, built by run-all.sh) in OfflineAudioContexts with the engine module loaded, pulls
// the samples into Node and measures there.   node bench.js [hlm|rnk ...]   → PASS/FAIL lines, out/<key>/report.json,
// demo WAVs and spectrogram PNGs in out/<key>/. Exit code = number of failures.
process.env.SEED_BLOBS = '';   // the module must load unchanged (the seed shim is for workers)
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const fs = require('fs'), path = require('path');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html';
const KEYS = process.argv.slice(2).length ? process.argv.slice(2) : ['hlm', 'rnk'];
const OUT = path.join(__dirname, 'out');
const SR = 48000;
const DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 };

async function setup(page) {
  await page.evaluate(() => {
    const M = window.__M;
    // a fresh offline context with the defaults + params, the engine module loaded when one is selected
    window.__ctx = async (dur, params, q = '1') => {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params));
      M.getQ().budget = 1e4; M.applyQuality && 0;
      window.__dspOk = await M.ensureDSP(ctx);
      return ctx;
    };
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.__ret = (b) => ({ L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), sr: b.sampleRate });
    // the standard phrase (snd/render.js): one note every `step` s across the field, held `hold` s (or Puls hits)
    window.__phr = async (ctx, dur, eng, opts = {}) => {
      const sr = ctx.sampleRate, step = opts.step || 0.5, hold = opts.hold || 0.4, all = [];
      for (let j = 0; (j + 1) * step < dur - 2.5; j++) {
        const t = 0.1 + j * step;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05);
          const y = opts.y != null ? opts.y : 0.3 + 0.5 * ((j * 0.61) % 1);
          const v = opts.burst ? M.hit(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2, gate: opts.gate || 0.2 }) : M.playNote(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2 });
          if (v && M.ENGINES[eng].sustain && !opts.burst) { v._rel = now + hold; all.push(v); }
          if (eng === 'kor') M.grainTick(now + step + 0.05);
          ctx.resume();
        });
        // offline, port messages (a worklet voice's release) reach the processor only at the next suspend
        ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume());
      }
      return ctx.startRendering();
    };
  });
}
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)), sr: r.sr });
function stats(x, from = 0.2) {
  const a = Math.floor(from * x.sr); let pk = 0, ss = 0, n = 0, nan = 0, dc = 0;
  for (let i = a; i < x.L.length; i++) { const l = x.L[i], r = x.R[i]; if (!Number.isFinite(l) || !Number.isFinite(r)) { nan++; continue; } pk = Math.max(pk, Math.abs(l), Math.abs(r)); ss += (l * l + r * r) / 2; dc += (l + r) / 2; n++; }
  return { rms: +(10 * Math.log10(ss / Math.max(1, n) + 1e-20)).toFixed(2), peak: +L.db(pk).toFixed(2), nan, dc: +(dc / Math.max(1, n)).toFixed(5) };
}
const mono = (x) => { const m = new Float32Array(x.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (x.L[i] + x.R[i]); return m; };

// a single voice: play at 0.05 s, optional moves [[t, fn-name, arg]], release at `rel` (null = held)
async function one(page, o) {
  return pull(await page.evaluate(async (o) => {
    const M = window.__M, ctx = await window.__ctx(o.dur, Object.assign({ 'v.eng': o.eng }, o.params || {}), o.q || '1');
    if (o.cents) { const c = ctx.createConstantSource(); c.offset.value = o.cents; c.connect(M.A.pitchMod); c.start(); }
    let v = null;
    ctx.suspend(19 / 375).then(() => { v = o.burst ? M.hit(o.eng, ctx.currentTime, o.f, o.y, o.vel || 0.75, { gate: o.gate }) : M.playNote(o.eng, ctx.currentTime, o.f, o.y, o.vel || 0.75, {}); window.__v = v; ctx.resume(); });
    const q = (t) => Math.round(t * 375) / 375, kick = (t) => ctx.suspend(q(t) + 1 / 375).then(() => ctx.resume());   // deliver port messages (offline: only at a suspend)
    for (const [t, what, arg] of o.moves || []) { ctx.suspend(q(t)).then(() => { if (v && v.alive) { if (what === 'setY') v.setY(arg); else if (what === 'setF') v.setF(arg, 0.1); else if (what === 'hammer') M.wkShake({ v: arg }); } ctx.resume(); }); if (what === 'hammer') kick(t); }
    if (o.rel != null) { ctx.suspend(q(o.rel)).then(() => { if (v && v.release) v.release(); ctx.resume(); }); kick(o.rel); }
    const b = await ctx.startRendering();
    window.__lastV = v;
    return window.__ret(b);
  }, o));
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  await setup(page);
  const ref = {};
  // references: the standard phrase, dry, level 1
  for (const k of ['neb', 'glo', 'mem']) ref[k] = stats(pull(await page.evaluate(async (k) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': k }, { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 })), 10, k)), k)));
  const refMean = 10 * Math.log10((Math.pow(10, ref.neb.rms / 10) + Math.pow(10, ref.glo.rms / 10) + Math.pow(10, ref.mem.rms / 10)) / 3);
  console.log('references (phrase RMS dBFS): neb ' + ref.neb.rms + ', glo ' + ref.glo.rms + ', mem ' + ref.mem.rms + ' → mean ' + refMean.toFixed(2));
  // the contract's own price: an empty processor voice (SPEC §8 step 1 gate ≈ 0.06 + 3 × 0.03)
  { const { execFileSync } = require('child_process');
    const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), '6'], { env: Object.assign({}, process.env, { ENGS: 'null1,hau1,obt1,neb3' }), encoding: 'utf8', timeout: 900000 }).trim().split('\n').pop());
    L.ok(c.null1 * c.scale < 0.25, `contract: an empty worklet voice costs ${(c.null1 * c.scale).toFixed(3)} Nebel units (raw ${c.null1}; node + 3 params ≈ 0.15)`); }
  let fails = 0;
  const T = {
    hlm: { f0: [110, 220, 440, 880, 1760, 2500], ys: [0.45, 0.6, 0.8], tol: 5, costMax: 0.55 },
    rnk: { f0: [55, 110, 220, 440, 880, 1760], ys: [0.2, 0.5, 0.8], tol: 1, costMax: 0.5 },
  };
  for (const key of KEYS) {
    const tc = T[key], dir = path.join(OUT, key), rep = { key };
    fs.mkdirSync(dir, { recursive: true });
    console.log('\n=== ' + key + ' ===');
    const ok = (c, m) => { const r = L.ok(c, key + ': ' + m); if (!r) fails++; return r; };
    // -- health: the module loads in an offline context, a voice plays its own processor
    const health = await page.evaluate(async (key) => { const M = window.__M; const ctx = await window.__ctx(1, { 'v.eng': key }); const v = M.playNote(key, 0.05, 220, 0.6, 0.7, {}); await ctx.startRendering(); return { ok: window.__dspOk, as: v && v.as, wk: !!(v && v.wk), want: M.dspWanted() }; }, key);
    ok(health.ok && health.as === key && health.wk, 'module loads in the offline context, the voice runs its own processor ' + JSON.stringify(health));
    // -- loudness: the standard phrase, L1 and L3, Puls bursts
    const loud = {};
    for (const [name, q, burst] of [['L1', '1', false], ['L3', '3', false], ['burst', '1', true]]) {
      const x = pull(await page.evaluate(async ([key, q, burst]) => window.__ret(await window.__phr(await window.__ctx(10, { 'v.eng': key, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, q), 10, key, { burst })), [key, q, burst]));
      loud[name] = stats(x);
      if (name === 'L1') { L.wav(path.join(dir, 'phrase-L1.wav'), x.L, x.R, SR); }
    }
    rep.loud = loud; rep.ref = ref;
    ok(Math.abs(loud.L1.rms - refMean) <= 2, `loudness L1 ${loud.L1.rms} dB vs references' mean ${refMean.toFixed(2)} (±2 dB; neb ${ref.neb.rms}, glo ${ref.glo.rms}, mem ${ref.mem.rms})`);
    ok(Math.abs(loud.L3.rms - loud.L1.rms) <= 1.5, `level 3 ${loud.L3.rms} within ±1.5 dB of level 1 ${loud.L1.rms}`);
    ok(Math.max(loud.L1.peak, loud.L3.peak, loud.burst.peak) <= -1, `peak ≤ −1 dBFS (L1 ${loud.L1.peak}, L3 ${loud.L3.peak}, burst ${loud.burst.peak})`);
    ok(!loud.L1.nan && !loud.L3.nan && !loud.burst.nan, 'no NaN');
    ok(Math.max(Math.abs(loud.L1.dc), Math.abs(loud.L3.dc), Math.abs(loud.burst.dc)) < 0.01, `no DC (|dc| < 0.01: ${loud.L1.dc}, ${loud.L3.dc}, ${loud.burst.dc})`);
    ok(loud.burst.rms >= loud.L1.rms - 12, `Puls bursts audible: phrase of 0.2-s hits ${loud.burst.rms} dB vs held phrase ${loud.L1.rms}`);
    // -- timbre vs height: one note at 220 Hz, centroid 0.3–0.4 s
    const yc = {};
    for (const y of [0, 0.5, 1]) { const x = await one(page, { eng: key, f: 220, y, dur: 1, params: DRY }); yc[y] = Math.round(L.centroid(mono(x), SR, 0.3, 4096)); }
    rep.yCentroidHz = yc;
    ok(yc[0] < yc[0.5] && yc[0.5] < yc[1], `centroid rises with Höhe: y 0 ${yc[0]} Hz, 0.5 ${yc[0.5]} Hz, 1 ${yc[1]} Hz`);
    // -- pitch: the grid at 0.6 s (reed: YIN + phase refinement; ring: comb of harmonics with their sidebands)
    const pit = [];
    for (const f of tc.f0) for (const y of tc.ys) {
      const x = await one(page, { eng: key, f, y, dur: 2.2, params: DRY }); const m = mono(x);
      const fm = L.combPitch(m, SR, f, 0.6, key === 'rnk' ? 32768 : 16384);   // (power-weighted harmonic comb: exact on the reed; the ring's sidebands need the longer window)
      pit.push([f, y, +L.cents(fm, f).toFixed(2)]);
    }
    rep.f0 = pit;
    const worst = pit.reduce((a, b) => (Math.abs(b[2]) > Math.abs(a[2]) ? b : a));
    ok(Math.abs(worst[2]) <= tc.tol, `f0 within ${tc.tol} ct on ${pit.length} notes ${tc.f0[0]}–${tc.f0[tc.f0.length - 1]} Hz (worst ${worst[2]} ct at ${worst[0]} Hz, y ${worst[1]})`);
    // -- Bebung: the pitch bus +50 ct moves the note by 50 ct
    { const f = 220, x = await one(page, { eng: key, f, y: 0.6, dur: 2.2, params: DRY, cents: 50 }); const m = mono(x);
      const fm = L.combPitch(m, SR, f * Math.pow(2, 50 / 1200), 0.6, 16384);
      const c = L.cents(fm, f); rep.bebung = +c.toFixed(2); ok(Math.abs(c - 50) <= 5, `Bebung: pitch bus +50 ct → ${c.toFixed(2)} ct`); }
    // -- glide: setF moves the pitch (k-rate freq through glideTo)
    { const x = await one(page, { eng: key, f: 220, y: 0.6, dur: 2.5, params: DRY, moves: [[1.0, 'setF', 330]] }); const m = mono(x);
      const fm = L.combPitch(m, SR, 330, 1.6, 16384);
      ok(Math.abs(L.cents(fm, 330)) <= tc.tol + 1, `setF 220 → 330 Hz lands at ${fm.toFixed(2)} Hz`); }
    // -- held: Höhe moves the timbre on a sounding voice (Gestik's Höhe arrives through setY)
    if (key === 'hlm') { const x = await one(page, { eng: key, f: 220, y: 0.4, dur: 3, params: DRY, moves: [[1.0, 'setY', 0.85]] }); const m = mono(x);
      const mc = (t0, t1) => { let s = 0, n = 0; for (let t = t0; t < t1; t += 0.05) { s += L.centroid(m, SR, t, 4096); n++; } return s / n; };
      const a = mc(0.5, 0.9), b = mc(1.5, 2.8); rep.setY = [Math.round(a), Math.round(b)];
      ok(b > a * 1.1, `setY 0.4 → 0.85 on a held voice: centroid ${Math.round(a)} → ${Math.round(b)} Hz`); }
    else {   // Ranke: Höhe sets the width of the stroking taps and the push, and the damping – the held tone follows
      const mc = async (moves) => { const x = mono(await one(page, { eng: key, f: 220, y: 0.2, dur: 4, params: DRY, moves })); let s = 0, n = 0; for (let t = 1.5; t < 3.7; t += 0.1) { s += L.centroid(x, SR, t, 4096); n++; } return s / n; };
      const c = [await mc([]), await mc([[1.0, 'setY', 0.95]])];
      rep.setY = c.map(Math.round);
      ok(c[1] > c[0] * 1.15, `setY 0.2 → 0.95 on a held ring: mean centroid 1.5–3.7 s ${Math.round(c[0])} → ${Math.round(c[1])} Hz`); }
    // -- release: the voice ends, nothing left
    { const x = await one(page, { eng: key, f: 440, y: 0.6, dur: 3, params: DRY, rel: 1.0 }); const m = mono(x);
      const held = L.rms(m, 0.6 * SR, 0.95 * SR), e = L.env(m, SR, 0.005); let t60 = Infinity; for (let i = 200; i < e.length; i++) if (e[i] < held * 0.001) { t60 = (i - 200) * 5; break; }
      rep.release60ms = t60;
      if (key === 'hlm') ok(t60 <= 60, `decay after release to −60 dB in ${t60} ms (≤ 60)`);
      else ok(t60 < 2500, `release reaches −60 dB in ${t60} ms`);
      const tail = L.env(m, SR, 0.1).slice(10); let worstUp = 0; for (let i = 1; i < tail.length; i++) if (tail[i] > 1e-5) worstUp = Math.max(worstUp, L.db(tail[i]) - L.db(tail[i - 1]));
      rep.tailRise = +worstUp.toFixed(2);
      ok(worstUp <= 1, `release tail monotone (largest rise between 100-ms windows ${worstUp.toFixed(2)} dB, no pumping)`);
      ok(L.rms(m, 2.6 * SR, 3 * SR) < 1e-5, 'silent after the release'); }
    // -- Puls: hit() with short gates – audible inside the gate, the voice finishes
    { const held = await one(page, { eng: key, f: 440, y: 0.6, dur: 1.2, params: DRY }); const hRms = L.rms(mono(held), 0.6 * SR, 1.1 * SR);
      const bl = [];
      for (const g of [0.06, 0.112, 0.22, 0.5]) {
        const x = await one(page, { eng: key, f: 440, y: 0.6, dur: 1.6, params: DRY, burst: true, gate: g }); const m = mono(x);
        const e = L.env(m.subarray(0.05 * SR, (0.05 + g) * SR), SR, 0.02); const mx = Math.max(...e);
        bl.push([g, +(L.db(mx) - L.db(hRms)).toFixed(1), L.rms(m, 1.3 * SR, 1.6 * SR) < 1e-5]);
      }
      const fin = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 900)); return !window.__lastV || !window.__lastV.alive; });
      rep.burst = bl;
      ok(bl.every((b) => b[1] >= -20), 'burst level inside the gate ≥ −20 dB vs held: ' + bl.map((b) => b[0] * 1000 + ' ms ' + b[1] + ' dB').join(', '));
      ok(bl.every((b) => b[2]) && fin, 'burst voices end (silent after the gate + release, voice freed)'); }
    // -- lane: 8 hits/s for 3 s, gate 0.11 – voices and budget stay bounded
    { const r = await page.evaluate(async (key) => {
        const M = window.__M, ctx = await window.__ctx(4, { 'v.eng': key, 'rev.mix': 0, 'dly.mix': 0 });
        M.applyQuality(); let maxV = 0, maxL = 0; const vb = M.getBudget ? M.getBudget()[0] : 14;
        for (let j = 0; j < 24; j++) ctx.suspend(Math.round((0.1 + j / 8) * 375) / 375).then(() => { M.hit(key, ctx.currentTime, M.noteAt((j * 0.37) % 1).f, 0.6, 0.7, { gate: 0.11 }); let n = 0; for (const v of M.A.voices) if (v.alive && ctx.currentTime < v.endAt) n++; maxV = Math.max(maxV, n); maxL = Math.max(maxL, M.voiceLoad()); ctx.resume(); });
        const b = await ctx.startRendering(); return { maxV, maxL, vb, st: window.__stats(b, 0.2) };
      }, key);
      rep.lane = r;
      ok(r.maxL <= r.vb && r.st.nan === 0 && r.st.rms > -60, `Puls lane 8 hits/s: at most ${r.maxV} sounding voices, load ${r.maxL.toFixed(2)} ≤ budget ${r.vb}, RMS ${r.st.rms} dB`); }
    // -- cost: cost.js (24 voices vs 24 Nebel, interleaved rounds), scaled to the VCOST table by the native engines
    { const { execFileSync } = require('child_process');
      const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '4'], { env: Object.assign({}, process.env, { ENGS: key + '1,' + key + '3,hau1,hau3,obt1,obt3,neb3' }), encoding: 'utf8', timeout: 900000 }).trim().split('\n').pop());
      const c1 = c[key + '1'] * c.scale, c3 = c[key + '3'] * c.scale;
      rep.cost = { raw: [c[key + '1'], c[key + '3']], scale: c.scale, L1: +c1.toFixed(3), L3: +c3.toFixed(3), table: await page.evaluate((k) => [window.__M.VCOST1[k], window.__M.VCOST3[k]], key) };
      // (repeated runs on this machine scatter by ±10 %: the target holds within that)
      ok(c1 <= tc.costMax * 1.1, `cost level 1: ${c1.toFixed(3)} Nebel units (raw ${c[key + '1']} × table scale ${c.scale}; target ${tc.costMax}, ±10 % run-to-run)`);
      ok(c3 <= 2.3 * c1, `cost level 3: ${c3.toFixed(3)} = ${(c3 / c1).toFixed(2)}× level 1 (richer at ≈ 2×)`);
      ok(rep.cost.table[0] >= c1 && rep.cost.table[1] >= c3, `VCOST entries cover the measurement: ${rep.cost.table} ≥ ${c1.toFixed(2)}, ${c3.toFixed(2)}`); }
    // -- engine-specific acceptance rows
    if (key === 'hlm') {
      const lv = {};
      for (const y of [0, 0.2, 0.35, 0.6]) for (const f of [110, 440]) { const x = await one(page, { eng: key, f, y, dur: 1.2, params: DRY }); lv[f + '@' + y] = L.db(L.rms(mono(x), 0.7 * SR, 1.15 * SR)); }
      rep.levels = lv;
      for (const f of [110, 440]) ok(lv[f + '@0.35'] - lv[f + '@0.2'] >= 20, `threshold between y 0.2 and 0.35 at ${f} Hz: ${lv[f + '@0.2'].toFixed(1)} → ${lv[f + '@0.35'].toFixed(1)} dB (jump ≥ 20 dB)`);
      for (const f of [110, 440]) ok(lv[f + '@0'] - lv[f + '@0.6'] >= -40 && lv[f + '@0'] - lv[f + '@0.6'] < -6, `air at y 0, ${f} Hz: ${(lv[f + '@0'] - lv[f + '@0.6']).toFixed(1)} dB vs the tone at y 0.6 (≥ −40)`);
      const on = [];
      for (const [f, lim] of [[110, 250], [440, 100]]) { const x = await one(page, { eng: key, f, y: 0.6, dur: 1.4, params: DRY }); const m = mono(x); const t = L.t90(m, SR, 0.05, L.rms(m, 0.9 * SR, 1.3 * SR)); on.push([f, Math.round(t * 1000)]); ok(t * 1000 <= lim, `onset t90 at ${f} Hz, y 0.6: ${Math.round(t * 1000)} ms (≤ ${lim})`); }
      rep.t90 = on;
      const hh = [];
      for (const f of [110, 220, 440, 880]) for (const y of [0.45, 0.7]) { const x = await one(page, { eng: key, f, y, dur: 1.4, params: DRY }); const sp = L.spectrum(mono(x), SR, 0.8, 16384); hh.push([f, y, +(L.harm(sp, f, 2) - L.harm(sp, f, 3)).toFixed(1)]); }
      rep.h2h3 = hh;
      ok(hh.every((h) => h[2] <= -20), 'odd harmonics dominate (h2 ≤ h3 − 20 dB): ' + hh.map((h) => h[0] + '/' + h[1] + ' ' + h[2]).join(', '));
      // the top: squeezed but sounding most of the time
      { const x = await one(page, { eng: key, f: 220, y: 1, dur: 3, params: DRY }); const e = L.env(mono(x), SR, 0.05).slice(10); const on2 = e.filter((v) => L.db(v) > -30).length / e.length; rep.top = +on2.toFixed(2); ok(on2 > 0.6, `y 1 (Quietschen): sounding ${(on2 * 100).toFixed(0)} % of the time (chokes, comes back)`); }
    }
    if (key === 'rnk') {
      const sh = [];
      for (const f of [500, 880, 1760]) { const x = await one(page, { eng: key, f, y: 0.5, dur: 1.5, params: DRY }); const n = Math.ceil(f / 400); sh.push([f, n, +L.subharm(L.spectrum(mono(x), SR, 0.4, 32768), f, n).toFixed(1)]); }
      rep.updateArtefacts = sh;
      ok(sh.every((s) => s[2] <= -40), 'no update sidebands > −40 dB (lines at (m + j/n)·f): ' + sh.map((s) => s[0] + ' Hz/n' + s[1] + ' ' + s[2] + ' dB').join(', '));
      { const x = await one(page, { eng: key, f: 220, y: 0.5, dur: 10.6, params: DRY }); const m = mono(x);
        const cs = [0.05, 0.5, 1, 2, 3].map((t) => L.centroid(m, SR, t, 4096)); const drift = Math.max(...cs.map((c) => Math.abs(c / cs[0] - 1)));
        const e = L.env(m, SR, 0.5); const first = Math.max(...e.slice(0, 2)), low = Math.min(...e.slice(0, 20));
        rep.held = { centroid: cs.map(Math.round), envDb: e.map((v) => +L.db(v).toFixed(1)), dc: +L.mean(m).toFixed(5) };
        ok(drift >= 0.15, `held: centroid drifts ${(drift * 100).toFixed(0)} % within 3 s (${cs.map(Math.round).join(' → ')} Hz)`);
        ok(L.db(low) - L.db(first) >= -30, `held: stays ≥ −30 dB for 10 s (lowest 0.5-s window ${(L.db(low) - L.db(first)).toFixed(1)} dB)`);
        ok(Math.abs(L.mean(m)) < 0.005, `DC ${L.mean(m).toFixed(5)} (< 0.005)`);
        L.wav(path.join(dir, 'held-10s.wav'), x.L, x.R, SR); rep.pngHeld = L.spectro(path.join(dir, 'held-10s.wav')); }
      { const c = []; for (const y of [0.2, 0.9]) { const x = await one(page, { eng: key, f: 220, y, dur: 0.6, params: DRY }); c.push(L.centroid(mono(x), SR, 0.06, 2048)); }
        rep.hammer = c.map(Math.round); ok(c[1] / c[0] - 1 >= 0.3, `hammer at y 0.2 vs 0.9: centroid ${Math.round(c[0])} → ${Math.round(c[1])} Hz (+${((c[1] / c[0] - 1) * 100).toFixed(0)} %, ≥ 30 %)`); }
      { const x = await one(page, { eng: key, f: 220, y: 0.5, dur: 2.5, params: DRY, moves: [[1.0, 'hammer', 1], [1.25, 'hammer', 1]] }); const m = mono(x);
        const a = L.rms(m, 0.8 * SR, 0.98 * SR), b = L.rms(m, 1.02 * SR, 1.2 * SR); rep.shake = +(L.db(b) - L.db(a)).toFixed(1);
        ok(b > a * 1.2, `Gestik shake = an extra hammer: +${(L.db(b) - L.db(a)).toFixed(1)} dB right after it`); }
    }
    // -- demos for listening and the spectrogram: level 3, default effects (12-s phrase), and a held gesture
    { const x = pull(await page.evaluate(async (key) => window.__ret(await window.__phr(await window.__ctx(12, { 'v.eng': key }, '3'), 12, key, { step: 0.7, hold: 0.6 })), key));
      L.wav(path.join(dir, 'demo-L3.wav'), x.L, x.R, SR); rep.pngDemo = L.spectro(path.join(dir, 'demo-L3.wav')); rep.demo = stats(x); }
    { const moves = []; for (let i = 0; i <= 40; i++) moves.push([0.5 + i * 0.1, 'setY', i <= 20 ? i / 20 : (40 - i) / 20]);
      const x = await one(page, { eng: key, f: 147, y: 0, dur: 6, params: Object.assign({}, DRY, { 'rev.mix': 0.3 }), moves, rel: 4.8 });
      L.wav(path.join(dir, 'gesture-y-sweep.wav'), x.L, x.R, SR); rep.pngGesture = L.spectro(path.join(dir, 'gesture-y-sweep.wav')); }
    { const x = pull(await page.evaluate(async (key) => window.__ret(await window.__phr(await window.__ctx(8, { 'v.eng': key, 'rev.mix': 0.2 }, '1'), 8, key, { burst: true, step: 0.25, gate: 0.11 })), key));
      L.wav(path.join(dir, 'puls.wav'), x.L, x.R, SR); rep.pngPuls = L.spectro(path.join(dir, 'puls.wav')); }
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(rep, null, 1));
    console.log('spectrograms: ' + [rep.pngDemo, rep.pngGesture, rep.pngPuls, rep.pngHeld].filter(Boolean).join(' '));
  }
  // -- fallback: no module in this context → the stand-in plays, the key stays
  { const r = await page.evaluate(async () => {
      const M = window.__M; const ctx = await window.__off(48000, 1, { 'v.eng': 'neb', 'rev.mix': 0 });   // nothing loaded
      const a = M.playNote('hlm', 0.05, 220, 0.6, 0.7, {}), b = M.playNote('rnk', 0.05, 330, 0.6, 0.7, {});
      const st = window.__stats(await ctx.startRendering(), 0.1);
      return { a: a && [a.eng, a.as], b: b && [b.eng, b.as], st, plays: [M.wkPlays('hlm'), M.wkPlays('rnk')], dsp: !!ctx.__dsp };
    });
    const pass = L.ok(r.a[0] === 'hlm' && r.a[1] === 'hau' && r.b[1] === 'neb' && r.st.rms > -50 && !r.dsp, 'fallback without the module: Halm plays as Hauch, Ranke as Nebel, the key stays (' + JSON.stringify(r) + ')');
    if (!pass) fails++; }
  const errs = errors.filter((e) => !/Failed to load resource|fonts\.g|myzel-dsp\.js/.test(e));
  if (!L.ok(!errs.length, 'no console errors ' + errs.join(' | '))) fails++;
  await browser.close();
  L.summary();
  process.exit(Math.min(fails, 100));
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
