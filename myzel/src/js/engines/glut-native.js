// ---- Glut (klang SPEC §3.3): the envelope both loops share, and the loop in native nodes ----
const GLT_PEAK = 0.42, GLT_NOUT = 0.6;   // v.out peak per velocity; the native loop's output (as myzel-ember's EMB_OUT)
// the worklet loop, or its own native loop: without AudioWorklet, after a processor error, and while the module loads
const gltNat = () => !(A.ctx && A.ctx.__dspOK && !A.workletBroken.has('glt'));
const gltR = (y) => (y < 0.3 ? -6 + 20 * y : y < 0.6 ? (y - 0.3) * 80 / 3 : 8 + (y - 0.6) * 10);   // Höhe → growth (nepers/s) before Glühen (as in myzel-ember)
// held: let go stops nothing – the loop glows on for Nachglühen (its T60) and the native envelope only closes it then;
// Puls: the gate and the afterglow at the peak, the loop decays inside it (SPEC §3.3)
function gltEnv(v, t, vel, o) {
  const peak = vel * GLT_PEAK, ng = P['glt.nachgluehen'];
  if (o.burst) { burstEnv(v, t, peak, 0.003, o.gate + ng * (o.decayMul || 1), 0.3); return; }
  adsrStart(v, t, peak, 0.003);
  v.release = (k) => {
    if (!v.alive || v.released) return;
    const now = A.ctx.currentTime, tg = ng * (k || 1);
    if (v.wk) v.wk.port.postMessage({ off: now, k: k || 1 }); else if (v.glow) v.glow(now, tg);
    v.released = true; v.relAt = now;
    holdParam(v.out.gain, now); v.out.gain.setTargetAtTime(0, now + tg, 0.15);
    v.finish(now + tg + 0.8);
  };
}
// Without AudioWorklet (SPEC §3.3, from the check's Kreislauf): the loop in native nodes – a DelayNode of n periods (a
// cycle's delay is at least one render quantum, and Chromium adds one more on top of delayTime – measured: delayTime
// 200 frames → a period of 328; gltCyc probes it once per sample rate: n = ceil(1.25·(128 + cyc)·f/SR)), the band-pass
// on the mode (Q ≥ 12 and ≥ 2·n·m: the comb's neighbours lie f/n apart), a tanh WaveShaper (never oversampled in a
// cycle: its kernel's latency would detune the loop – the check), a gain per pass for the growth per second σ:
// G = (1 + σ/α)·e^(σT), α = π·F/Q the band's own rate (the group delay a pass takes, lesson 2). The loop's amplitude²:
// the band's output² plus 2 × its Butterworth low-pass at the mode² (−90° and −3 dB there: the quadrature, no delay in
// the gain's path), smoothed at 40 Hz; it drives a second gain that divides out the shaper's describing function (a
// power low-passed at 6 Hz compensated late: the afterglow +50 % long at 880–1760 Hz, measured) and, at 6 Hz, the knee
// σ = r − c·A² as an AGC on the loop's gain (its slope puts the settled level where the worklet has it) – the level the
// same at every pitch (a tanh alone saturates high notes ≈ 10 dB lower). Glimmen from a shared slow walk (gain and
// period); the knock (noise) and an in-band seed (a sine at the mode, charging the loop for one pass and the band's
// time – a noise knock alone hardly rings the band, lesson 1); a −140 dB floor keeps the loop's filters alive (Chromium
// cuts a filter whose input fell silent, lesson 4). Bebung: the pitch bus into the band's and the seed's detune and,
// scaled by −T·ln2/1200, into the delay time. A jump rings the old mode out beside the loop, as the worklet's. Not here:
// the worklet's exact injection of a Puls hit (the seed charges the loop within a pass) and its level-3 pair (one loop
// at every level).
const GLT_N = { walk: null, sq: null, sq2: null, sh: {}, df: {} };
// the delay a cycle adds to delayTime: a click around a delay of 300 frames, in a tiny offline render (Chromium: 128)
const GLT_CYC = { sr: 0, v: 128, busy: false };
function gltCyc() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (GLT_CYC.sr !== SR && !GLT_CYC.busy && OAC) {
    GLT_CYC.busy = true;
    const done = (r) => { GLT_CYC.busy = false; GLT_CYC.sr = SR; if (!r) return; const x = r.getChannelData(0), ix = []; for (let i = 0; i < x.length && ix.length < 2; i++) if (Math.abs(x[i]) > 0.1) ix.push(i); if (ix.length === 2) GLT_CYC.v = clamp(ix[1] - ix[0] - 300, 0, 512); };
    try {
      const c = new OAC(1, 1024, SR), d = c.createDelay(0.1), g = c.createGain(), b = c.createBuffer(1, 1, SR), s = c.createBufferSource();
      b.getChannelData(0)[0] = 1; s.buffer = b; g.gain.value = 0.5; d.delayTime.value = 300 / SR;
      d.connect(g); g.connect(d); d.connect(c.destination); s.connect(d); s.start(0);
      const pr = c.startRendering();
      if (pr && pr.then) pr.then(done, () => done(null)); else c.oncomplete = (e) => done(e.renderedBuffer);
    } catch (e) { done(null); }
  }
  return GLT_CYC.v;
}
function gltWalk() {   // two slow walks (0.2–1 Hz, ≈ ±1 at 2σ) that loop seamlessly: 26 sines of a 32-s period, at 3 kHz
  if (GLT_N.walk && GLT_N.walk.ctx === A.ctx) return GLT_N.walk.buf;
  const sr = 3000, len = 32 * sr, b = A.ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let k = 7; k <= 32; k++) { const w = 2 * Math.PI * k / len, ph = 2 * Math.PI * Math.random(), a = 1 / Math.sqrt(k); for (let i = 0; i < len; i++) d[i] += a * Math.sin(w * i + ph); }
    let s = 0; for (let i = 0; i < len; i++) s += d[i] * d[i];
    const g = 0.5 / Math.sqrt(s / len); for (let i = 0; i < len; i++) d[i] *= g;
  }
  GLT_N.walk = { ctx: A.ctx, buf: b };
  return b;
}
const gltTdf = (a) => { if (a < 1e-4) return 1; let s = 0; for (let k = 0; k < 64; k++) { const sn = Math.sin(Math.PI * (k + 0.5) / 64); s += Math.tanh(a * sn) * sn; } return 2 * s / (64 * a); };   // tanh's describing function
function gltCurves(hk) {
  const key = hk.toFixed(3);
  if (!GLT_N.sq) { GLT_N.sq = makeShaperCurve((x) => x * x, 2049); GLT_N.sq2 = makeShaperCurve((x) => 2 * x * x, 2049); }   // the amplitude²: x² + (√2 · its quadrature)²
  if (!GLT_N.sh[key]) GLT_N.sh[key] = makeShaperCurve((x) => Math.tanh(hk * x) / hk, 4096);
  if (!GLT_N.df[key]) GLT_N.df[key] = makeShaperCurve((u) => 1 / gltTdf(hk * Math.sqrt(Math.max(0, u))) - 1, 1025);   // power → 1/N − 1 (onto a gain of 1)
  return { sq: GLT_N.sq, sq2: GLT_N.sq2, sh: GLT_N.sh[key], df: GLT_N.df[key] };
}
// the per-pass gain for σ, and the σ a clamped gain really gives (bisection on (1 + σ/α)·e^(σT))
const gltG = (sg, T, al) => Math.max(0, 1 + sg / al) * Math.exp(sg * T);
function gltSig(G, T, al) { let lo = -al, hi = 50; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (gltG(m, T, al) < G) lo = m; else hi = m; } return (lo + hi) / 2; }
function gltNative(v, t, f, y, vel, o) {
  const ctx = A.ctx, q = (id) => P['glt.' + id], hit = !!o.burst, cyc = gltCyc() / SR, nOf = (x) => Math.max(1, Math.ceil((128 / SR + cyc) * 1.25 * x));
  const st = { f, y, m: 1, n: nOf(f), rel: false, rl: 0, hk: 0 };
  const dl = v.n(ctx.createDelay(Math.min(2.9, 8 * st.n / f + 0.01))), bq = v.n(BQ('bandpass', f, 12)), sh = v.n(ctx.createWaveShaper());
  const gDF = v.n(G(1)), lg = v.n(G(0)), tap = v.n(G(GLT_NOUT)), sq = v.n(ctx.createWaveShaper()), lq = v.n(BQ('lowpass', f, -3.01)), sq2 = v.n(ctx.createWaveShaper());
  const lpF = v.n(BQ('lowpass', 40, -3.01)), lpP = v.n(BQ('lowpass', 6, -3.01)), kG = v.n(G(0)), dfS = v.n(ctx.createWaveShaper());
  const ns = v.s(noiseSrc()), gN = v.n(G(0)), os = v.s(OSC('sine', f)), gS = v.n(G(0));
  const wk = v.s(ctx.createBufferSource()), sp = v.n(ctx.createChannelSplitter(2)), gWr = v.n(G(0)), gWt = v.n(G(0)), pg = v.n(G(0));
  const kLP = v.n(BQ('lowpass', 4000, -3.01)), kHP = v.n(BQ('highpass', 30, -3.01)), gh = v.n(BQ('bandpass', f, 12)), gG = v.n(G(0));   // (gh: the old mode after a jump)
  sh.oversample = 'none'; KR(lg.gain); KR(gDF.gain);
  wk.buffer = gltWalk(); wk.loop = true;
  v.mod(bq.detune); v.mod(lq.detune); v.mod(os.detune); v.mod(gh.detune); v.lnk(v.bend ? v.bend.node || A.notePitch : A.pitchMod, pg);
  dl.connect(bq); bq.connect(sh); sh.connect(gDF); gDF.connect(lg); lg.connect(dl);
  bq.connect(sq); bq.connect(lq); lq.connect(sq2); sq.connect(lpF); sq2.connect(lpF); lpF.connect(dfS); dfS.connect(gDF.gain); lpF.connect(lpP); lpP.connect(kG); kG.connect(lg.gain);
  ns.connect(gN); gN.connect(dl); gN.connect(tap); os.connect(gS); gS.connect(dl); gS.connect(tap);
  wk.connect(sp); sp.connect(gWr, 0); sp.connect(gWt, 1); gWr.connect(lg.gain); gWt.connect(dl.delayTime); pg.connect(dl.delayTime);
  lg.connect(tap); tap.connect(kLP); kLP.connect(kHP); kHP.connect(v.out); lg.connect(gh); gh.connect(gG); gG.connect(kLP);
  const mode = (x) => { const yy = st.y, s = q('sprung') === '2' ? 2 : 3, m0 = st.m; let m = yy >= 0.92 || (m0 === 3 && yy >= 0.88) ? 3 : yy >= 0.77 || (m0 > 1 && yy >= 0.73) ? s : 1; while (m > 1 && m * x > 0.42 * SR) m--; return m; };
  // a seed at the mode: in band, for one pass and the band's time (the loop adds it up – sounding at its amplitude then)
  const seed = (at, amp, F, T, al) => { os.frequency.setValueAtTime(F, at); const g = gS.gain; g.cancelScheduledValues(at); g.setValueAtTime(0, at); g.linearRampToValueAtTime(amp, at + 0.002); g.setTargetAtTime(0, at + 0.002, T + 1 / al); };
  // everything a height, a note, the knobs set: the gain for σ, the AGC's slope, Glimmen's depth, the band, the box
  const upd = (now, tc = 0.04, burstEnd) => {
    const x = st.f, m = mode(x), F = m * x, n = st.n, T = n / x, Qv = Math.max(12, 8 + 12 * q('hitze'), 2 * n * m), al = Math.PI * F / Qv;
    const gl = 0.5 + q('gluehen'), c = 12 * gl, hk = (1 + 4 * q('hitze')) * 0.5;
    // (the DelayNode interpolates linearly – measured: a quarter frame is 0.75/0.25 – its loss at the mode made up)
    const fr = ((T - cyc) * SR) % 1, w = 2 * Math.PI * F / SR, G0 = 1 / Math.sqrt((1 - fr) * (1 - fr) + fr * fr + 2 * fr * (1 - fr) * Math.cos(w));
    const r = st.rel ? st.rl : hit && !burstEnd ? 10 : gltR(st.y) * gl, Gr = G0 * gltG(Math.max(r, -0.98 * al), T, al);
    // the AGC: through the settled amplitude A² = r/c exactly (σ = 0 there), below the threshold the slope at rest
    const K = st.rel ? 0 : r > 0.05 ? (Gr - G0) * c / r : Gr * c * (T + 1 / (al + Math.max(r, -0.9 * al)));
    const wr = Gr * 1.5 * (T + 1 / (al + Math.max(r, -0.9 * al))) * (st.rel ? 0.053 * Math.abs(r) : 1);   // (let go: ±8 % of the decay, as the worklet's)
    const at = burstEnd || now;
    for (const [pp, val] of [[lg.gain, Gr], [kG.gain, -K], [gWr.gain, wr], [bq.Q, Qv], [pg.gain, -T * Math.LN2 / 1200], [gWt.gain, -T * 2 * Math.LN2 / 1200]]) { if (burstEnd) pp.setTargetAtTime(val, at, 0.01); else setP(pp, val, tc); }
    // a jump (Sprung): the band moves within ≈ 30 ms and a seed charges the new mode as the band arrives (seeded at once,
    // it was gone before the band came: a hole of 21–45 dB, measured); the old mode rings out beside the loop as in the
    // worklet – a band-pass on it, fed by the loop all along (in tune and in phase with it), heard only from the jump on
    let bt = 0.008;
    if (m !== st.m) {
      st.m = m;
      if (st.started) { bt = 0.01; seed(at + 2 * bt, 0.8 * Math.sqrt(Math.max(0, gltR(st.y) * gl) / c), F, T, al); gG.gain.cancelScheduledValues(at); gG.gain.setValueAtTime(1, at); gG.gain.setTargetAtTime(0, at, 0.035); st.ghost = at + 0.2; }
    }
    if (!(st.ghost > at)) { setP(gh.frequency, F, 0.008); setP(gh.Q, Math.max(4, Math.PI * F * 0.035), 0.008); }   // (its ring: τ 35 ms)
    if (burstEnd) { bq.frequency.setTargetAtTime(F, at, bt); lq.frequency.setTargetAtTime(F, at, bt); } else { setP(bq.frequency, F, bt); setP(lq.frequency, F, bt); }
    if (hk !== st.hk) { st.hk = hk; const cv = gltCurves(hk); try { sh.curve = cv.sh; dfS.curve = cv.df; } catch (e) {} }
    const lpf = Math.min(0.45 * SR, Math.max(1500 * Math.pow(16 / 3, q('kasten')), 1.25 * F)); setP(kLP.frequency, lpf, tc); setP(kHP.frequency, Math.min(60, 0.5 * x), tc);
    st.T = T; st.al = al; st.F = F; st.Gr = Gr; st.G0 = G0; st.r = r;
  };
  { const cv = gltCurves(0.5); sq.curve = cv.sq; sq2.curve = cv.sq2; }
  dl.delayTime.setValueAtTime(st.n / f - cyc, t);
  st.m = mode(f); upd(t, 0.001); st.started = true;
  // the onset: the knock (5–20 ms of noise, Zunder) and the seed of the note's own tone; a Puls hit seeds louder
  const z = q('zunder'), kd = 0.005 + 0.015 * Math.random(), fl = 3e-4 * (0.25 + z);
  gN.gain.setValueAtTime(0.35 * (0.2 + 0.8 * z) * vel * (hit ? 0.5 : 1), t); gN.gain.setTargetAtTime(fl, t + 0.0005, kd / 3);
  seed(t, (hit ? 0.5 : 0.25 * (0.5 + 0.5 * z)) * vel, st.F, st.T, st.al);
  ns.start(t, Math.random() * 1.9); os.start(t); wk.start(t, Math.random() * 30);
  // the afterglow: σ = −6.9/T60 (as far as the band lets the loop decay – the rest on the output), the floor at −140 dB
  v.glow = (now, tg, sched) => {
    st.rel = true; st.rl = -6.908 / Math.max(0.05, tg);
    upd(now, 0.01, sched);
    const sa = gltSig(st.Gr / st.G0, st.T, st.al), res = st.rl - sa;   // (what the band would not let the loop lose)
    if (res < -0.05) tap.gain.setTargetAtTime(0, sched || now, -1 / res);
    gN.gain.cancelScheduledValues(sched || now); gN.gain.setTargetAtTime(1e-7, sched || now, 0.02);
  };
  v.setY = (ny) => { st.y = clamp(ny, 0, 1); if (!st.rel && !hit) upd(A.ctx.currentTime); };
  v.setF = (nf, glide) => {
    nf = clamp(nf, 16, 8000); st.f = nf;
    if (nOf(nf) > st.n) st.n = nOf(nf);   // (a bend far up: more periods – a cycle's delay stays above one render quantum)
    glideTo(dl.delayTime, Math.min(dl.delayTime.maxValue || 2.9, st.n / nf - cyc), glide); upd(A.ctx.currentTime);
    glideTo(bq.frequency, st.F, glide); glideTo(lq.frequency, st.F, glide); glideTo(os.frequency, st.F, glide);
  };
  v.upd = () => upd(A.ctx.currentTime);
  if (hit) v.glow(t, P['glt.nachgluehen'], t + o.gate);
  v.gltN = { dl, bq, lg, st, gWr, gWt, kG, gDF, tap, sh };   // (for the tests)
}

