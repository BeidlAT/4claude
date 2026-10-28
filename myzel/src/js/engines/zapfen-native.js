// ---- Zapfen without AudioWorklet: its own native stand-in (SPEC §0.4, §3.8) ----
// The rate as the processor maps it (zpfRate). Low on the field a looped buffer of 64 baked teeth plays at R/ZPF_NR
// (one buffer cannot span nine octaves: slowed down, a tooth turns into a thump; sped up, it is skipped) – each tooth a
// 10-sample Hann bump ±6 % off its place and ±30 % in height, its 2–6-ms burst of noise in channel 2 (Kratzen); the
// stone's buffer holds rasps of slips instead. From ≈ 40 per second up a band-limited saw at R (a PeriodicWave: the
// stick's ride – the processor's integrated teeth –, exact at every pitch, its teeth early and late by low-passed noise
// on a short delay, the scrape's hiss beside it); the two crossfade between 30 and 80 per second. Both knock three
// band-pass modes on the note (gains as in the processor: one knock's ring, the fundamental's build-up at the rate
// taken off) and pass the contact – its click (a band-pass high up) and the wood's box on the saw. Not here: the
// processor's sub-sample teeth drawn fresh each time (the buffer repeats after 64), the stone's rasps tied to the note.
const ZPF_LOW = 3, ZPF_HYS = Math.log2(1.08), ZPF_NR = 13;
const ZPF_NB = {   // the processor's bodies (three modes here): ratios, weights, the click and the box (Hz), the level (the processor's, as loud as it in the standard phrase)
  zapfen: { r: [1, 0.5, 2.572], a: [1, 0.7, 0.55], ck: 2600, bx: 900, lv: 0.79 },
  holz: { r: [1, 2.572, 4.644], a: [1, 0.6, 0.42], ck: 1800, bx: 650, lv: 1.19 },
  panzer: { r: [1, 1.47, 2.09], a: [1, 0.8, 0.6], ck: 3800, bx: 1600, lv: 1.2 },
  kuerbis: { r: [1, 0.7, 2], a: [1, 0.9, 0.5], ck: 1100, bx: 480, lv: 1.11 },
  fels: { r: [1, 2.756, 5.404], a: [1, 0.5, 0.35], ck: 2400, bx: 1300, cy: 1.4, cv: 1, cl: 2, lv: 1.39 },
};
const ZPF_N = { out: 0.2, dir: 0.35, clk: 0.5, saw: 1.85, box: 1.2 };   // the processor's ZPF_OUT, ZPF_DIR, ZPF_CLK, ZPF_SAW, ZPF_BOX
// the rate for a note and a height: on a log scale from ZPF_LOW per second to the note, above the Rast threshold
// 0.6·(1.3 − Rast) the nearest f/2ⁿ (n = 0 … 4) with ±8 % hysteresis (st.lock) – as the processor
const zpfFree = (f, y) => f * Math.pow(2, -(1 - y) * Math.log2(Math.max(f, 1.01 * ZPF_LOW) / ZPF_LOW));
function zpfRate(f, y, st) {
  const oc = Math.log2(Math.max(f, 1.01 * ZPF_LOW) / ZPF_LOW), Lf = (1 - y) * oc, yR = 0.6 * (1.3 - P['zpf.rast']);
  if (st.lock < 0) { if (y >= yR + 0.01 && Lf < 4.5 + ZPF_HYS) st.lock = clamp(Math.round(Lf), 0, 4); }
  else if (y < yR - 0.01 || Lf > 4.5 + ZPF_HYS) st.lock = -1;
  else if (Math.abs(Lf - st.lock) > 0.5 + ZPF_HYS) st.lock = clamp(Math.round(Lf), 0, 4);
  return f * Math.pow(2, st.lock >= 0 ? -st.lock : -Lf);
}
// the baked teeth and the stone's rasps (per sample rate, shared), with a −140 dB trickle under both: Chromium stops a
// band-pass whose input fell silent long before its mode has rung out (see jrgImp)
let ZPF_BUF = null;
function zpfBufs() {
  const sr = A.ctx.sampleRate;
  if (ZPF_BUF && ZPF_BUF.sr === sr) return ZPF_BUF;
  const per = Math.round(sr / ZPF_NR), len = 64 * per;
  const mk = (fill) => {
    const b = A.ctx.createBuffer(2, len, sr), t = b.getChannelData(0), z = b.getChannelData(1);
    for (let i = 0; i < len; i++) { t[i] = (Math.random() * 2 - 1) * 1e-7; z[i] = (Math.random() * 2 - 1) * 1e-7; }
    b._at0 = fill(t, z) / sr; return b;
  };
  const bump = (t, at, area, W) => { const i0 = Math.floor(at - W / 2); for (let j = 0; j <= W + 1; j++) { const u = (i0 + j - (at - W / 2)) / W; if (u > 0 && u < 1) t[(i0 + j + len) % len] += area * (1 - Math.cos(2 * Math.PI * u)) / W; } };
  const burst = (z, at, amp, ms) => { const n = ms * sr / 1000, i0 = Math.round(at); for (let j = 0; j < 4 * n; j++) z[(i0 + j) % len] += amp * (Math.random() * 2 - 1) * Math.exp(-j / n); };
  // (each tooth late of its place rather than early: never before the buffer's start – a voice starts on the first)
  const teeth = mk((t, z) => { let first = 0; for (let i = 0; i < 64; i++) { const at = (i + 0.06 + 0.06 * (2 * Math.random() - 1)) * per + 8, a = 1 + 0.3 * (2 * Math.random() - 1); if (!i) first = at; bump(t, at, a, 10); burst(z, at, a, 0.5 + Math.random()); } return first; });
  // the stone: each event a rasp – the load (1 ± 0.3) given up in slips of 14–32 %, the next sooner the more is left
  // (400/s at the start at this buffer's own rate), until it is below a third
  const creak = mk((t, z) => { let first = 0; for (let i = 0; i < 64; i++) { let at = (i + 0.2 + 0.2 * (2 * Math.random() - 1)) * per + 8, T = 1 + 0.3 * (2 * Math.random() - 1); if (!i) first = at; while (T > 0.32) { const rel = (0.23 + 0.09 * (2 * Math.random() - 1)) * T; T -= rel; const W = Math.round((0.001 + 0.002 * Math.random()) * sr * 0.4); bump(t, at, 4.5 * rel, W); burst(z, at, 3 * rel, W / sr * 500); at += sr / (400 * Math.pow(T, 0.8)); } } return first; });
  return (ZPF_BUF = { sr, teeth, creak });
}
// the stick's ride as a band-limited wave: a saw (harmonic k at 2/(πk), unnormalised: the processor's integrated teeth
// per unit tooth); the stone's with its slip's rounded drop (a half-sine of 12 % of the period)
function zpfWave(kind) {
  const key = 'zpf' + kind;
  if (A.waves[key]) return A.waves[key];
  const n = 64, re = new Float32Array(n), im = new Float32Array(n), w = 0.12;
  for (let k = 1; k < n; k++) { const x = 2 * k * w, h = kind === 'fels' ? (Math.abs(1 - x * x) < 1e-6 ? Math.PI / 4 : Math.cos(Math.PI * k * w) / (1 - x * x)) : 1; im[k] = 2 / (Math.PI * k) * h; }
  return (A.waves[key] = A.ctx.createPeriodicWave(re, im, { disableNormalization: true }));
}
function zpfNative(v, t, f, y, vel, o) {
  const p = (id) => P['zpf.' + id], body = p('koerper'), B = ZPF_NB[body] || ZPF_NB.zapfen, fels = body === 'fels', bufs = zpfBufs(), sr = A.ctx.sampleRate;
  const st = { lock: -1, f, y, at: t, sp: 0, R: 0 };
  // low: the baked teeth (channel 1 the teeth, channel 2 their noise)
  const src = v.s(A.ctx.createBufferSource()), buf = fels ? bufs.creak : bufs.teeth;
  src.buffer = buf; src.loop = true; KR(src.playbackRate); v.mod(src.detune);
  const spl = v.n(A.ctx.createChannelSplitter(2)), gT = v.n(G(0)), gN = v.n(G(0));
  src.connect(spl); spl.connect(gT, 0); spl.connect(gN, 1);
  // high: the saw at R, its teeth early and late (low-passed noise on a short delay: the time jitters, never the
  // pitch – noise on the frequency pulled the tone 9–21 ct flat, measured), and the hiss of the scrape
  const osc = v.s(OSC('sine', 100)); osc.setPeriodicWave(zpfWave(fels ? 'fels' : 'saw')); v.mod(osc.detune);
  const jd = v.n(A.ctx.createDelay(0.02)), gOM = v.n(G(0)), gOD = v.n(G(0)), ns = v.s(noiseSrc()), nLP = v.n(BQ('lowpass', 300, 0)), nJ = v.n(G(0)), nHP = v.n(BQ('highpass', 2500, 0)), nH = v.n(G(0));
  jd.delayTime.value = 0.004;
  osc.connect(jd); jd.connect(gOM); jd.connect(gOD); ns.connect(nLP).connect(nJ).connect(jd.delayTime); ns.connect(nHP).connect(nH);
  // the body: three band-pass modes on the note
  const md = B.r.map((r, k) => { const bq = v.n(BQ('bandpass', f * r, 10)), g = v.n(G(0)); v.mod(bq.detune); gT.connect(bq); gOM.connect(bq); bq.connect(g).connect(v.out); return { bq, g, k }; });
  // the contact: the tick and its noise high-passed, its click high up; the saw and the wood's box on it
  const hp = v.n(BQ('highpass', 700, 0.7)), gD = v.n(G(0)), clk = v.n(BQ('bandpass', B.ck, 7)), gC = v.n(G(0)), box = v.n(BQ('bandpass', B.bx, 1.2)), gB = v.n(G(ZPF_N.box));
  for (const s of [gT, gN, nH]) { s.connect(hp); s.connect(clk); }
  hp.connect(gD).connect(v.out); clk.connect(gC).connect(v.out);
  const sh = v.n(BQ('highpass', clamp(0.35 * f, 30, 400), 0));   // (the saw above the body's lowest modes, as in the processor)
  gOD.connect(sh); sh.connect(v.out); sh.connect(box).connect(gB).connect(v.out);
  v.zn = { src, osc, jd, md, gT, gN, gOD, gOM, nJ, nH, st };
  // every gain for a rate R (and its slew)
  const set = (R, tc, at) => {
    const kl = p('klang'), t60 = zpfT60(kl), kz = p('kratzen') * (0.5 + vel), sch = p('schuppen');
    const r3 = Math.max(1, R / ZPF_LOW), At = Math.pow(r3, -0.15), gd = Math.pow(r3, -0.2), fs = clamp(Math.log2(80 / R) / Math.log2(80 / 30), 0, 1), gs = Math.sqrt(fs), gf = Math.sqrt(1 - fs);
    const gm = 1 - Math.exp(-6.91 / (t60 * R)), O = ZPF_N.out * B.lv, sw = ZPF_N.saw * R * R / (R * R + 2500);   // (the saw from ≈ 50 per second, as in the processor)
    const S = (prm, val) => { if (at) prm.setValueAtTime(val, at); else setP(prm, val, tc); };
    S(src.playbackRate, R / ZPF_NR); S(osc.frequency, R);
    S(gT.gain, At * (R / ZPF_NR) * gs); S(gN.gain, kz * At * gs);   // (a slowed buffer stretches its teeth: area × rate)
    S(gOM.gain, At * gf * Math.PI * f / sr); S(gOD.gain, At * gf * sw / 2 * O);
    S(nJ.gain, Math.min(0.0035, (0.008 + 0.025 * sch) * 7 / R)); S(nH.gain, 0.26 * At * kz * gf);   // (the processor's ±J at the top: the low-passed noise's σ ≈ 0.08)
    S(gD.gain, ZPF_N.dir * (0.4 + 0.6 * vel) * gd * O);
    const ck = Math.min(0.4 * sr, B.ck * Math.pow(2, (B.cy || 0.8) * (st.y - 0.5) + (B.cv || 0.6) * (vel - 0.5))), al = Math.sin(2 * Math.PI * ck / sr) / 14;
    S(clk.frequency, ck); S(gC.gain, ZPF_N.clk * gd * O * (B.cl || 1) * (1 + al) / (2 * al));
    for (const m of md) {   // a mode's ring and its level: one knock of area 1 rings at its weight (a band-pass's impulse is 2α high)
      const r = B.r[m.k], tk = Math.min(2.5, t60 * Math.min(1.6, Math.pow(r, -0.4))), fk = f * r, q = Math.PI * fk * tk / 6.91, a2 = Math.sin(2 * Math.PI * Math.min(fk, 0.45 * sr) / sr) / q;
      S(m.bq.Q, q); S(m.g.gain, B.a[m.k] * gm * O * (1 + a2 / 2) / a2);
    }
    st.R = R;
  };
  v.upd = () => { if (v.alive && !v.released) set(st.R ? zpfRate(st.f, st.y, st) : st.R, 0.03); };
  const go = (tc) => { const R = zpfRate(st.f, st.y, st); set(st.lock < 0 ? R * (1 + Math.min(0.5, st.sp)) : R, tc); };
  src.start(t, Math.max(0, buf._at0 - 0.001)); osc.start(t); ns.start(t, rand(0, 1.9));
  const peak = vel * ZPF_PEAK;
  if (o.burst) {
    // the stroke: the rate swells and falls as sin(πt/gate)^(1 + 2·Strich), passing at least 5 + 25·gate teeth
    const g = Math.max(0.01, o.gate), e = 1 + 2 * p('strich'), N = 48, Rs = new Float32Array(N); let mm = 0;
    for (let i = 0; i < N; i++) { Rs[i] = Math.pow(Math.sin(Math.PI * (i + 0.5) / N), e); mm += Rs[i] / N; }
    const Rmax = Math.min(2500, Math.max(zpfFree(f, y), (5 + 25 * g) / (g * mm)));
    const curves = { rate: [], freq: [], gT: [], gN: [], gOM: [], gOD: [] };
    set(Rmax * mm, 0, t);   // (the modes' level for the stroke's mean rate; the curves below move the rest)
    for (let i = 0; i < N; i++) {
      const R = Math.max(1, Rmax * Rs[i]), r3 = Math.max(1, R / ZPF_LOW), At = Math.pow(r3, -0.15), fs = clamp(Math.log2(80 / R) / Math.log2(80 / 30), 0, 1), gs = Math.sqrt(fs), gf = Math.sqrt(1 - fs), sw = ZPF_N.saw * R * R / (R * R + 2500);
      curves.rate.push(R / ZPF_NR); curves.freq.push(R); curves.gT.push(At * (R / ZPF_NR) * gs); curves.gN.push(p('kratzen') * (0.5 + vel) * At * gs); curves.gOM.push(At * gf * Math.PI * f / sr); curves.gOD.push(At * gf * sw / 2 * ZPF_N.out * B.lv);
    }
    for (const [prm, c] of [[src.playbackRate, curves.rate], [osc.frequency, curves.freq], [gT.gain, curves.gT], [gN.gain, curves.gN], [gOM.gain, curves.gOM], [gOD.gain, curves.gOD]]) { prm.cancelScheduledValues(t); prm.setValueCurveAtTime(Float32Array.from(c), t, g); }
    // the stick leaves: one last, harder knock just before the end
    const tk = v.s(A.ctx.createBufferSource()), tg = v.n(G(1.3 / 0.5)); tk.buffer = jrgImp(); tk.connect(tg);
    for (const m of md) tg.connect(m.bq); tg.connect(hp); tg.connect(clk);
    tk.start(t + 0.92 * g); tk._end = t + 0.92 * g + 0.25;
    burstEnv(v, t, peak, 0.002, g, 0.25 * (o.decayMul || 1));
    return;
  }
  set(zpfRate(f, y, st), 0, t);
  v.setY = (ny) => {   // the finger's speed adds rate below the Rast (dead zone 0.02/s, ≈ 50-ms leak)
    const now = A.ctx.currentTime, dt = Math.max(1e-3, now - st.at), k = 1 - Math.exp(-dt / 0.05);
    st.sp += (Math.max(0, Math.abs(ny - st.y) / dt - 0.02) - st.sp) * k; st.at = now; st.y = clamp(ny, 0, 1); go(0.015);
  };
  v.setF = (nf, glide) => { st.f = nf; for (const m of md) glideTo(m.bq.frequency, nf * B.r[m.k], glide); glideTo(sh.frequency, clamp(0.35 * nf, 30, 400), glide); const R = zpfRate(nf, st.y, st); set(R, Math.max(0.004, glide / 3)); };
  // let go: the stick coasts (R → 0, τ 0.2 s) while the voice fades
  const rel = sustainRelease(v, fels ? 0.5 : 0.3);
  v.release = (k, at) => {
    if (!v.alive || v.released) return;
    if (at > A.ctx.currentTime) { fadeAt(src.playbackRate, at, 0.2); fadeAt(osc.frequency, at, 0.2); }   // (a note-off at its MIDI moment)
    else { setP(src.playbackRate, 0, 0.2); setP(osc.frequency, 0, 0.2); }
    rel(k, at);
  };
  adsrStart(v, t, peak, 0.002);
}

