// ---- processing block: 24 dB/oct low cut, shelving EQ with a sweepable mid, 12 dB/oct high cut, saturation
const procNeeded = (p) => !LC_OFF(mp(p + 'lc')) || !HC_OFF(mp(p + 'hc')) || mp(p + 'lo') !== 0 || mp(p + 'mid') !== 0 || mp(p + 'hi') !== 0 || P[p + 'sat'] > 0;
function mkWidth() {
  const w = { sp: A.ctx.createChannelSplitter(2), mg: A.ctx.createChannelMerger(2), LL: G(1), RR: G(1), LR: G(0), RL: G(0) };
  w.sp.connect(w.LL, 0); w.sp.connect(w.LR, 0); w.sp.connect(w.RL, 1); w.sp.connect(w.RR, 1);
  w.LL.connect(w.mg, 0, 0); w.RL.connect(w.mg, 0, 0); w.LR.connect(w.mg, 0, 1); w.RR.connect(w.mg, 0, 1);
  return w;
}
// Width and balance as one 2×2 matrix. Width (mid/side): L' = a·L + b·R, R' = b·L + a·R, a = (1 + w) / 2,
// b = (1 − w) / 2. Balance then follows the StereoPanner law for stereo signals: to the left, the right channel moves
// over into the left one (equal power), and the other way round.
function setWidth(w, v, set, pan = 0) {
  const a = (1 + v) / 2, b = (1 - v) / 2;
  let LL, RL, LR, RR;
  if (pan <= 0) {
    const x = (pan + 1) * Math.PI / 2, gl = pan === 0 ? 0 : Math.cos(x), gr = pan === 0 ? 1 : Math.sin(x);
    LL = a + gl * b; RL = b + gl * a; LR = gr * b; RR = gr * a;
  } else {
    const x = pan * Math.PI / 2, gl = Math.cos(x), gr = Math.sin(x);
    LL = gl * a; RL = gl * b; LR = gr * a + b; RR = gr * b + a;
  }
  set(w.LL.gain, LL); set(w.RL.gain, RL); set(w.LR.gain, LR); set(w.RR.gain, RR);
}
function matUpd(st, inst) {
  const p = 'x' + st.k + '.', pan = mp(p + 'pan'), wid = mp(p + 'wid'), on = pan !== 0 || wid !== 1;
  if (on && !st.mat) { st.mat = mkWidth(); st.mat.mg.connect(st.mWet); }
  if (st.mat) setWidth(st.mat, wid, inst || !st.matOn ? setNow : (q, v) => setP(q, v, 0.012), pan);
  if (on === st.matOn) return;
  st.matOn = on;
  clearTimeout(st.matT);
  const set = inst ? setNow : (q, v) => setP(q, v, 0.006);
  if (on) { st.byp.connect(st.mat.sp); st.wet.connect(st.mat.sp); set(st.mBy.gain, 0); set(st.mWet.gain, 1); }
  else {
    set(st.mBy.gain, 1); set(st.mWet.gain, 0);
    st.matT = setTimeout(() => { if (!st.matOn) { try { st.byp.disconnect(st.mat.sp); st.wet.disconnect(st.mat.sp); } catch (e) {} } }, 120);
  }
}
function makeProc() {
  const x = {};
  x.lc1 = BQ('highpass', 0, -5.33); x.lc2 = BQ('highpass', 0, 2.32);   // Butterworth pair (Q 0.54 and 1.31, in dB)
  x.lo = BQ('lowshelf', 150); x.mid = BQ('peaking', 1000, 0.9); x.hi = BQ('highshelf', 6000);
  x.hc = BQ('lowpass', SR / 2, -3);
  x.satPre = G(1); x.sat = A.ctx.createWaveShaper(); x.sat.oversample = 'none';
  x.lc1.connect(x.lc2).connect(x.lo).connect(x.mid).connect(x.hi).connect(x.hc).connect(x.satPre).connect(x.sat);
  return x;
}
// Saturation: half dry, half tanh, matched at −14 dBFS peaks – loud parts are rounded off, quiet ones lifted a little
function satSet(x, a) {
  const key = a.toFixed(3);
  if (x.satKey === key) return;
  x.satKey = key;
  if (a <= 0) { x.sat.curve = null; x.satPre.gain.value = 1; return; }
  const g = 1 + 9 * a, ref = 0.2, mk = ref / (Math.tanh(g * ref) / g), m = a / 2;
  x.satPre.gain.value = 0.25;   // the shaper reads ±4, so hot channels round off instead of clipping at ±1
  x.sat.curve = makeShaperCurve((u) => (1 - m) * 4 * u + m * mk * Math.tanh(g * 4 * u) / g, 4096);
}
function procUpd(st, inst) {
  const p = 'x' + st.k + '.', on = procNeeded(p);
  if (on && !st.proc) st.proc = makeProc();
  const x = st.proc;
  if (x) {
    const set = inst || !st.procOn ? setNow : (q, v) => setP(q, v, 0.02);
    const lc = LC_OFF(mp(p + 'lc')) ? 0 : mp(p + 'lc'), hc = HC_OFF(mp(p + 'hc')) ? SR / 2 : mp(p + 'hc');
    set(x.lc1.frequency, lc); set(x.lc2.frequency, lc); set(x.hc.frequency, hc);
    set(x.lo.gain, mp(p + 'lo')); set(x.mid.gain, mp(p + 'mid')); set(x.mid.frequency, mp(p + 'midf')); set(x.hi.gain, mp(p + 'hi'));
    satSet(x, P[p + 'sat']);
  }
  if (on === st.procOn) return;
  st.procOn = on;
  clearTimeout(st.procT);
  const set = inst ? setNow : (q, v) => setP(q, v, 0.006);
  if (on) {
    st.in.connect(x.lc1); x.sat.connect(st.wet);
    set(st.byp.gain, 0); set(st.wet.gain, 1);
  } else {
    set(st.byp.gain, 1); set(st.wet.gain, 0);
    st.procT = setTimeout(() => { if (!st.procOn) { try { st.in.disconnect(x.lc1); } catch (e) {} } }, 120);
  }
}
// width of the whole sum (Summe → Breite)
function updMasterWidth() {
  if (!A.mwBy) return;
  const v = mp('mst.wid'), on = v !== 1;
  if (on && !A.mw) { A.mw = mkWidth(); A.mw.mg.connect(A.mwWet); }
  if (A.mw) setWidth(A.mw, v, A.mwOn ? setP : setNow);
  if (on === !!A.mwOn) return;
  A.mwOn = on;
  clearTimeout(A.mwT);
  if (on) A.highSh.connect(A.mw.sp);
  else A.mwT = setTimeout(() => { if (!A.mwOn) { try { A.highSh.disconnect(A.mw.sp); } catch (e) {} } }, 120);
  setP(A.mwBy.gain, on ? 0 : 1, 0.006); setP(A.mwWet.gain, on ? 1 : 0, 0.006);
}
// "Pumpen": every hit of the chosen Puls lane pulls the other channels down and lets them swell back – scheduled with
// the hit itself, so it is sample-exact and costs nothing
function duckHit(t, lane) {
  if (!A.ctx || !MIX.list.length) return;
  const rel = Math.max(0.03, mp('mix.duckRel') * 60 / SEQ.bpm);
  let any = false;
  for (const st of MIX.list) {
    const d = mp('x' + st.k + '.duck');
    if (!d || st.lane === lane) continue;
    const g = st.duck.gain;
    g.setTargetAtTime(1 - 0.94 * d, t, 0.0025);
    g.setTargetAtTime(1, t + 0.012, rel / 4);
    any = true;
  }
  if (any) { MIX.duckT.push({ t, rel }); if (MIX.duckT.length > 16) MIX.duckT.shift(); }
}
// how far "Pumpen" holds a channel down right now (for the display), 0 … 1
function duckDepth(st, now) {
  const d = P['x' + st.k + '.duck'];
  if (!d || st.lane === Number(P['mix.duckSrc'])) return 0;
  let e = null;
  for (const x of MIX.duckT) if (x.t <= now) e = x;
  if (!e) return 0;
  const age = now - e.t;
  return 0.94 * d * (age < 0.012 ? 1 : Math.exp(-(age - 0.012) / (e.rel / 4)));
}
// monitoring: dim (−20 dB) and mono check change only what you hear; recordings and meters stay untouched
function updMonitor() {
  if (!A.ctx) return;
  if (A.monoChk && !A.monMo) {
    A.monMo = G(0); A.monMo.channelCount = 1; A.monMo.channelCountMode = 'explicit'; A.monMo.channelInterpretation = 'speakers';
    A.out.connect(A.monMo).connect(A.ctx.destination);
  }
  const g = A.dim ? 0.1 : 1;
  setP(A.monSt.gain, A.monoChk ? 0 : g, 0.01);
  if (A.monMo) setP(A.monMo.gain, A.monoChk ? g : 0, 0.01);
}
function setMonMono(on) { A.monoChk = !!on; updMonitor(); }
function setMonDim(on) { A.dim = !!on; updMonitor(); }

