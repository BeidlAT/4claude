// Hexenring – the taps and the strip (SPEC §4; tests §22): with loops playing (out 0 and out 1) and live sound going
// on, „Gespielt“ holds no loop signal (a marker tone in the loops, measured narrow-band: ≤ −100 dB under the loop's own
// level), while the master carries it; „Gespielt“ is post-mute (a muted strip is not in the Humus); „Alles“ is the
// master's input, the Schleifen included (step 1b: true resampling – a node of its own downstream of A.masterIn,
// myzel-ring-in, writes ring 1 at the processor's frame count: both rings stay aligned to the frame); the strip is hidden in the mixer until the
// first Schleife and its settings are not the patch's. (step 1c) The click (hx.klick, the count-in's hx.ein „ton“) sounds on
// the monitor after the master – no tap hears it (≤ −100 dB); „Klopf mit“ measures the Spielverzögerung from eight taps,
// and a loop harvested against the running Puls reads its window that much later: what was played late sits on the beat.
//   node t-hx-taps.js
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
(async () => {
  const { page, errors } = await H.open({});
  await G.gtools(page);
  if (process.env.DBG) { page.on('console', (m) => console.log('  page:', m.text())); await page.evaluate(() => { window.__dbg = 1; }); }
  const ev = (fn, a) => page.evaluate(fn, a);
  // the graph
  let r = await ev(() => {
    const M = window.__M, A = M.A, st = M.MIX.s.hxr;
    return { route: M.P['xhxr.route'], to: st.dTo === A.masterIn || (!!M.HX.gM && st.dTo === M.HX.gM && M.HX.gM.gain.value === (M.IDLE.hxOff || M.IDLE.on ? 0 : 1)), gate: M.HX.gM ? M.HX.gM.gain.value : null, hxOff: !!M.IDLE.hxOff, mask: [...M.HX.mask].join(' '), taps: M.MIX.src.filter((s) => s.hxT).map((s) => s.k).join(' '), rec: !!M.PD['xhxr.vol'].rec, inPatch: 'xhxr.vol' in M.patchValues() };
  });
  ok(r.route === 'dir' && r.to, `the strip „Hexenring“ goes straight to A.masterIn (route dir; through its gate – Ruhe: ${r.gate}, closed until the first Schleife: ${r.hxOff}), where „Alles“ listens (myzel-ring-in)`);
  ok(r.taps === 'fin eb2 eb3 eb4 eb5 eb6 eb7 eb8 rgn gsp' && r.mask === 'fin eb2 eb3 eb4 eb5 eb6 eb7 eb8 rgn gsp',   // (30.10.2026: every Ebene's strip)
     `„Gespielt“ taps the strips ${r.taps} (after their mute/solo gate); the Puls and the Bordun only by the mask`);
  ok(r.rec && !r.inPatch, 'the strip\'s settings stay out of the patch (a preset never changes the loops)');

  // a marker tone in two loops (out 0 burnt in, out 1 through its own copy of the chain), the Bordun playing live
  // into the Gespielt tap (mask: Bordun mit), echo and hall closed – then the taps, the strip and the master recorded
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, FM = 3137.7;
    M.setParam('rev.mix', 0); M.setParam('dly.mix', 0); M.setParam('xhxr.dly', 0); M.setParam('xhxr.rev', 0);
    M.setParam('bor.wave', 'sine'); M.setParam('bor.oct', 1); M.setParam('bor.on', true);
    M.hxMask(['fin', 'eb2', 'rgn', 'gsp', 'bor']);
    await ctx.audioWorklet.addModule(window.__testUrl);
    const n = 3 * SR, mk = (amp) => window.__chunks(n, (i) => amp * Math.sin(2 * Math.PI * FM * i / SR));
    const l0 = M.hxLoopNew({ beats: 4 }), l1 = M.hxLoopNew({ beats: 4, out: 1 }), len = Math.round(4 * 60 / M.tgBpm(ctx.currentTime) * SR);
    M.hxSchichtAdd(l0, { chunks: mk(0.03), n, pre: 0, len, join: 'xf' }); M.hxSchichtAdd(l1, { chunks: mk(0.03), n, pre: 0, len, join: 'xf' });   // (soft: the master's glue compressor stays out of it)
    // live sound on the field meanwhile (the overdub): low notes
    for (let i = 0; i < 4; i++) setTimeout(() => { const v = M.playNote('glo', ctx.currentTime + 0.01, 110 * (1 + i / 4), 0.3, 0.6, {}); }, 300 + i * 500);
    await window.__sleep(2500);
    const rec = (node) => { const r = new AudioWorkletNode(ctx, 'hx-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }); const z = ctx.createGain(); z.gain.value = 0; node.connect(r); r.connect(z).connect(ctx.destination); return r; };
    const R = { g: rec(A.hxIn0), a: rec(A.masterIn), s: rec(M.MIX.s.hxr.dry), o: rec(A.out) };
    await window.__sleep(2500);
    const got = {}; for (const k in R) got[k] = await window.__recGet(R[k]);
    // narrow band: a Blackman–Harris window, the marker's bin (and the Bordun's level, to show the tap is live)
    const bin = (x, f) => { const N = Math.min(x.length, 2 * SR); let re = 0, im = 0, w0 = 0; for (let i = 0; i < N; i++) { const t = i / (N - 1), w = 0.35875 - 0.48829 * Math.cos(2 * Math.PI * t) + 0.14128 * Math.cos(4 * Math.PI * t) - 0.01168 * Math.cos(6 * Math.PI * t), ph = 2 * Math.PI * f * i / SR; re += w * x[i] * Math.cos(ph); im += w * x[i] * Math.sin(ph); w0 += w; } return 2 * Math.hypot(re, im) / w0; };
    const rms = (x) => { let s = 0; for (const v of x) s += v * v; return Math.sqrt(s / x.length); };
    const out = {}; for (const k in got) out[k] = { m: 20 * Math.log10(bin(got[k].L, FM) + 1e-20), rms: 20 * Math.log10(rms(got[k].L) + 1e-20) };
    M.setParam('bor.on', false); M.setParam('xhxr.dly', 1); M.setParam('xhxr.rev', 1);
    await M.hxClear('all');
    return out;
  });
  const d = (k) => +(r[k].m - r.s.m).toFixed(1);
  ok(r.s.m > -30 && Math.abs(r.o.m - r.s.m) < 3, `the loops sound: the marker in the strip ${r.s.m.toFixed(1)} dBFS, at the master ${r.o.m.toFixed(1)} dBFS`);
  ok(d('g') <= -100 && r.g.rms > -50, `„Gespielt“ tap: the marker ${d('g')} dB under the loops (≤ −100), while the live sound is there (${r.g.rms.toFixed(1)} dBFS)`);
  ok(Math.abs(d('a')) < 1.5 && r.a.rms > -50, `„Alles“ (the master's input) hears the loops: the marker ${d('a')} dB from the strip's (live ${r.a.rms.toFixed(1)} dBFS)`);

  // the two rings aligned to the frame: one signal into both taps – the Gespielt ring and the Alles ring hold it at the
  // same frames (myzel-ring-in writes ring 1 at the processor's frame count – no cycle, no delay), sample for sample
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    M.setParam('rev.mix', 0); M.setParam('dly.mix', 0); await window.__sleep(3000);
    const n = ctx.sampleRate * 2, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); let s = 12345 + c; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; x[i] = 0.2 * (s / 0x7fffffff - 0.5); } }
    const src = ctx.createBufferSource(); src.buffer = b; src.connect(A.hxIn0); src.connect(A.masterSum);
    const t0 = ctx.currentTime + 0.1; src.start(t0);
    await window.__sleep(2600);
    const f0 = Math.round(M.hxF(t0)) + 4800, f1 = f0 + 48000;
    const [g, a] = await Promise.all([M.hxGrab({ in: 0, f0, f1 }), M.hxGrab({ in: 1, f0, f1 })]);
    let diff = 0, pk = 0, best = { lag: 0, c: -1 };
    const at = (G, i) => { const ch = G.chunks[Math.floor(i / 8192)]; return ch ? ch[0][i % 8192] : 0; };
    for (let i = 0; i < 48000; i++) { const x = at(g, i), y = at(a, i); diff = Math.max(diff, Math.abs(x - y)); pk = Math.max(pk, Math.abs(x)); }
    for (let lag = -256; lag <= 256; lag += 1) { let c = 0; for (let i = 300; i < 20000; i += 3) c += at(g, i) * at(a, i + lag); if (c > best.c) best = { lag, c }; }
    return { diff, pk, lag: best.lag };
  });
  // (white noise one frame off would leave a difference as large as the noise itself; what remains is the field's last
  // notes' tail, which reaches the master's input through the insert chain)
  ok(r.lag === 0 && r.pk > 0.05 && r.diff < r.pk * 0.05, `the two rings are aligned to the frame: lag ${r.lag}, largest difference ${r.diff.toExponential(1)} at a peak of ${r.pk.toFixed(2)}`);

  // Gespielt is post-mute: the Bordun muted on its strip is not in the Humus; unmuted it is
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    M.setParam('bor.on', true); await window.__sleep(1500);
    M.setParam('xbor.mute', true); await window.__sleep(300);
    const t0 = ctx.currentTime; await window.__sleep(1200); const t1 = ctx.currentTime;
    M.setParam('xbor.mute', false); await window.__sleep(300);
    const t2 = ctx.currentTime; await window.__sleep(1200); const t3 = ctx.currentTime;
    M.setParam('bor.on', false);
    await window.__sleep(200);
    const lv = async (a, b, inp) => { const g = await M.hxGrab({ in: inp, t0: a, t1: b }); let s = 0, n = 0; for (const [L] of g.chunks) for (const x of L) { s += x * x; n++; } return 10 * Math.log10(s / n + 1e-30); };
    const o = { muted0: await lv(t0, t1, 0), open0: await lv(t2, t3, 0), muted1: await lv(t0, t1, 1) };
    M.hxMask(['fin', 'eb2', 'rgn', 'gsp']);
    return o;
  });
  ok(r.muted0 < -200 && r.open0 > -40, `„Gespielt“ is post-mute: the Bordun muted on its strip leaves the Humus silent (${r.muted0.toFixed(0)} dB), unmuted it is there (${r.open0.toFixed(1)} dB)`);
  ok(r.muted1 < -200, `…and „Alles“ hears the mix as it is: the muted strip is not in it either (${r.muted1.toFixed(0)} dB)`);

  // the click: on every beat while the Puls runs (hx.klick „ein“), and the count-in's (hx.ein „ton“) before a waiting
  // recording's bar – into the monitor after the master: neither Humus tap nor the master's input hears it
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, FC = 1568;
    M.setParam('rev.mix', 0); M.setParam('dly.mix', 0); M.setParam('seq.bpm', 120);
    for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false);
    if (!M.SEQ.on) M.seqStart();
    const rec = (node) => { const r = new AudioWorkletNode(ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }); const z = ctx.createGain(); z.gain.value = 0; node.connect(r); r.connect(z).connect(ctx.destination); return r; };
    // live sound meanwhile: a 100-Hz tone on the field's strip (the taps are listening)
    const os = ctx.createOscillator(), og = ctx.createGain(); os.frequency.value = 100; og.gain.value = 0.1; os.connect(og).connect(M.stripIn('fin')); os.start();
    await window.__sleep(400);
    const R = { g: rec(A.hxIn0), a: rec(A.masterIn), m: rec(A.monSt) };
    M.setParam('hx.klick', 'ein');
    await window.__sleep(2600);
    M.setParam('hx.klick', 'aus');
    await window.__sleep(300);
    const got = {}; for (const k in R) { got[k] = await window.__recGet(R[k]); try { (k === 'g' ? A.hxIn0 : k === 'a' ? A.masterIn : A.monSt).disconnect(R[k]); } catch (e) {} }
    const bin = (x, f) => { const N = Math.min(x.length, 2 * SR); let re = 0, im = 0, w0 = 0; for (let i = 0; i < N; i++) { const t = i / (N - 1), w = 0.35875 - 0.48829 * Math.cos(2 * Math.PI * t) + 0.14128 * Math.cos(4 * Math.PI * t) - 0.01168 * Math.cos(6 * Math.PI * t), ph = 2 * Math.PI * f * i / SR; re += w * x[i] * Math.cos(ph); im += w * x[i] * Math.sin(ph); w0 += w; } return 2 * Math.hypot(re, im) / w0; };
    // the clicks in the monitor: bursts after ≥ 100 ms of quiet in a 1.5-kHz band (the tone is 100 Hz) – their times on the beats
    const clicks = (x, f0) => { const out = []; let last = -1e9; const hp = (i) => x[i] - 2 * x[i - 1] + x[i - 2]; for (let i = 2; i < x.length; i++) if (Math.abs(hp(i)) > 0.002 && i - last > 0.1 * SR) { out.push((f0 + i) / SR); last = i; } else if (Math.abs(hp(i)) > 0.002) last = i; return out; };
    const cm = clicks(got.m.L, got.m.f0), off = cm.map((t) => { const b = M.tgBeat(t); return (b - Math.round(b)) * 60 / M.tgBpm(t) * 1000; });
    const out = { m: 20 * Math.log10(bin(got.m.L, FC) + 1e-20), g: 20 * Math.log10(bin(got.g.L, FC) + 1e-20), a: 20 * Math.log10(bin(got.a.L, FC) + 1e-20), live: 20 * Math.log10(bin(got.g.L, 100) + 1e-20), n: cm.length, off: Math.max(...off.map(Math.abs)) };
    // the count-in: a recording asked for at beat 1.5 of a bar waits for the next – clicks on beats 2 and 3 (aus: none on the others)
    M.setParam('hx.ein', 'ton');
    const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.5) / 4) * 4;
    await window.__until(M.tgTime(b0 + 1.5));
    const R2 = { m: rec(A.monSt), g: rec(A.hxIn0) };
    M.hxRecStart(M.hxHeard(), 0);
    out.wait = M.HX.rec && M.HX.rec.phase; out.rb0 = M.HX.rec && M.HX.rec.b0 - b0;
    await window.__until(M.tgTime(b0 + 6.2));
    M.hxRecCancel(true);
    const g2 = { m: await window.__recGet(R2.m), g: await window.__recGet(R2.g) };
    A.monSt.disconnect(R2.m); A.hxIn0.disconnect(R2.g);
    const c2 = clicks(g2.m.L, g2.m.f0).map((t) => +(M.tgBeat(t) - b0).toFixed(2));
    out.count = c2; out.countTap = 20 * Math.log10(bin(g2.g.L, FC) + 1e-20) - 20 * Math.log10(bin(g2.m.L, FC) + 1e-20);
    M.setParam('hx.ein', 'sicht');
    os.stop(); os.disconnect();
    if (M.SEQ.on) M.seqStop();
    return out;
  });
  ok(r.n >= 4 && r.off < 3, `hx.klick „ein“: the click on every beat in the monitor (${r.n} in 2.6 s, at most ${r.off.toFixed(1)} ms off the beat)`);
  ok(r.g - r.m <= -100 && r.a - r.m <= -100 && r.live > -40, `…on a path no tap hears: „Gespielt“ ${(r.g - r.m).toFixed(0)} dB, the master's input („Alles“) ${(r.a - r.m).toFixed(0)} dB under the monitor's click (≤ −100) – the taps live (the field's tone ${r.live.toFixed(1)} dBFS)`);
  ok(r.wait === 'wait' && r.rb0 === 4 && r.count.length === 2 && Math.abs(r.count[0] - 2) < 0.01 && Math.abs(r.count[1] - 3) < 0.01 && r.countTap <= -100, `hx.ein „ton“: a recording asked for at beat 1.5 counts in on beats ${r.count.join(', ')} before its bar (${r.rb0}) – none after; the Humus does not hear it (${r.countTap.toFixed(0)} dB)`);

  // „Klopf mit“: eight taps 70 ms after their clicks → the Spielverzögerung (the median, stored per device)
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    M.hxKlopfStart();
    const K = M.HX.klopf, n = K.clicks.length;
    for (let i = 2; i < 10; i++) { await window.__until(K.clicks[i] + 0.07); M.hxKlopfTap(null); }
    return { lat: M.hxLat(), dev: M.hxDev().lat, open: !!M.HX.klopf, n };
  });
  ok(Math.abs(r.lat - 0.07) < 0.012 && r.dev === r.lat && !r.open, `„Klopf mit“: eight taps 70 ms after their clicks → Spielverzögerung ${(r.lat * 1000).toFixed(0)} ms, stored for the device`);

  // a loop harvested against the running Puls: its window read that much later – bursts played 70 ms after the beats
  // (as a player hears and answers late) sound on the beats in the loop
  r = await ev(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
    M.hxDev('lat', 0.07);
    M.setParam('seq.bpm', 120); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false);
    if (!M.SEQ.on) M.seqStart();
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('mov.drift', 0); M.setParam('mov.vib', 0);
    for (const e of M.HX.ev) if (e) e.probe = true;   // (the notes of the parts before are forgotten: this bar is sound alone)
    await window.__sleep(600);
    const b0 = Math.ceil(M.tgBeat(ctx.currentTime + 0.4) / 4) * 4, T = (b) => M.tgTime(b0 + b);
    const burst = (t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 2000; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.0005); g.gain.setTargetAtTime(0, t + 0.004, 0.003); o.connect(g).connect(M.stripIn('fin')); o.start(t); o.stop(t + 0.06); };
    for (let k = 0; k < 4; k++) burst(T(k) + 0.07);
    await window.__until(T(4) + 0.09);
    const plan = M.hxKorbPlan(M.hxHeard()), L = M.hxHarvest(plan, {}), S = L && M.HX.sch.get(L.sch[0]);
    const rec = new AudioWorkletNode(ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0;
    M.HX.node.connect(rec, 0); M.HX.node.connect(rec, 1); rec.connect(z).connect(ctx.destination);
    await window.__until(T(8) + 0.2);
    const g = await window.__recGet(rec); M.HX.node.disconnect(rec);
    const on = []; let last = -1e9;
    for (let i = 0; i < g.L.length; i++) if (Math.abs(g.L[i]) > 0.02) { if (i - last > 0.2 * SR) on.push((g.f0 + i) / SR); last = i; }
    const off = on.map((t) => { const b = M.tgBeat(t); return (b - Math.round(b)) * 60 / M.tgBpm(t) * 1000; });
    const o = { lock: L && L.d.lock, nudge: L && L.nudge, shift: S && (S.cut.w0 - Math.round(M.hxF(plan.w0))) / SR, bars: plan.bars, pw0: plan.w0 - T(0), n: on.length, off };
    M.hxDev('lat', 0);
    await window.__reset();
    if (M.SEQ.on) M.seqStop();
    return o;
  });
  ok(r.lock === 'takt' && Math.abs(r.shift - 0.07) < 0.002 && r.n >= 3 && r.off.every((x) => Math.abs(x) < 2), `harvested against the Puls with 70 ms Spielverzögerung: the window read ${(r.shift * 1000).toFixed(1)} ms later, the bursts played late now sound on the beats (${r.off.map((x) => x.toFixed(1)).join(', ')} ms; phase ${(r.nudge * 1000).toFixed(0)} ms; ${r.bars} T)`);

  // the mixer: the strip appears with the first Schleife (and goes with the last)
  r = await ev(async () => {
    const M = window.__M; M.openPanel('mix'); await window.__sleep(800);
    const el = () => document.querySelector('.mx-st[data-k="hxr"]'), gone = () => !!(M.MX.ch.hxr && M.MX.ch.hxr.gone);
    const o = { has: !!el(), gone0: gone() };
    const id = M.hxLoopNew({ beats: 4 }); await window.__sleep(200);
    o.gone1 = gone(); o.src = M.mxSrcText('hxr');
    o.order = [...document.querySelectorAll('.mx-st[data-k]')].map((e) => e.dataset.k).slice(0, 5).join(' ');
    await M.hxClear(id); await window.__sleep(200);
    o.gone2 = gone(); o.src2 = M.mxSrcText('hxr');
    return o;
  });
  ok(r.has && r.gone0 && !r.gone1 && r.gone2, 'the mixer: „Hexenring“ is hidden until the first Schleife, shown with it, hidden again when the last is cleared');
  ok(r.src === '1 Schleife' && r.src2 === 'aus' && r.order === 'fin eb2 rgn hxr l0', `…in the Spiel group after Regen (${r.order}), its source line „${r.src}“ / „${r.src2}“`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
