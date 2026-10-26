/* =====================================================================
   Audio core
   ===================================================================== */
const A = { ctx: null, started: false, voices: new Set(), grainVoices: new Set(), tex: {}, texWait: {}, frozen: false, revActive: null, irJob: 0, grains: 0, flushing: false };
let SR = 48000;
// Polyphony is limited by cost, not by count: one unit ≈ one Nebel voice at level 1. Cheap engines get more voices.
// Level 1 keeps phones safe, level 2 plays more at once, level 3 gives every voice more oscillators, partials and
// modes and fills a desktop core up to a budget measured on this device (see calibrate()).
// The new engines (hlm … khl): the final calibration on a quiet machine (klang bench recal.js, 18.10.2026) – cost.js, 24
// voices against 24 Nebel voices offline, scaled to this table by the native engines measured alongside (Hauch, Obertöne,
// Tiefe, Stimme, Schwarm, Nebel L3: the median), two runs each and every body, bridge and syllable – the highest + 15 %
// (elm with its arc built, jrg while its modes ring, mdr its first 4 s with the crackle, boe held at y 0.6, amo across
// the field at y 0.6; all with their full planned sound, the owner's rule is best sound first)
const VCOST1 = { neb: 1, kor: 0.6, hau: 0.3, glo: 0.7, mem: 0.4, sai: 0.35, sch: 0.9, gng: 1.55, klb: 1.25, obt: 0.75, stm: 1.05, swm: 1.2, tie: 0.75, trp: 0.7, hlm: 0.68, rnk: 0.63, elm: 1.09, jrg: 1.13, hrz: 1.71, mdr: 0.84, boe: 0.69, amo: 0.47, gsp: 0.34, rhz: 1.08, shn: 0.78, khl: 0.84, hng: 1.33, gml: 0.54, sit: 0.96, tbl: 0.7, did: 0.91, mtr: 0.91, nrd: 2.25, sht: 1.54, ond: 1.08, wal: 1.69, stp: 1.08, atr: 0.67, tnl: 0.74, wkg: 1.07, bnt: 0.67, kas: 0.82, bit: 0.82, gbs: 0.93, hht: 0.66, vox: 0.82, spu: 0.76, kto: 0.56 };
const VCOST3 = { neb: 1.9, kor: 1.1, hau: 0.75, glo: 1.4, mem: 0.75, sai: 1.2, sch: 2, gng: 2.8, klb: 2.2, obt: 1.85, stm: 2.4, swm: 2.7, tie: 1.5, trp: 1.5, hlm: 1.15, rnk: 1.07, elm: 2.51, jrg: 2.67, hrz: 3.85, mdr: 1.67, boe: 1.11, amo: 1.34, gsp: 1.01, rhz: 2.82, shn: 1.49, khl: 1.53, hng: 2.12, gml: 1.07, sit: 1.42, tbl: 0.92, did: 1.43, mtr: 1.36, nrd: 3.02, sht: 2.18, ond: 1.82, wal: 2.24, stp: 1.68, atr: 1.13, tnl: 1.37, wkg: 1.57, bnt: 1.08, kas: 1.14, bit: 1.19, gbs: 1.67, hht: 1.17, vox: 1.7, spu: 1.03, kto: 0.98 };   // measured: level-1 cost × (level 3 / level 1)
// Sehne: the table holds the plucked string (jawari the dearer bridge: 0.68 / 1.29 measured at the most); under the
// E-Bow (its pickup, limiter, band and push) a voice costs 0.94 / 1.84 with the jawari (flat 0.75 / 1.49) – it is
// priced so while its hand is in the E-Bow's zone
const SHN_EBOW_COST = [1.08, 2.11];
// Halm's pipes cost what they compute: the flute's frequency-locked bore above the reed (0.77 / 1.38 against 0.59 / 1.0
// measured), the flame's tube (four waves, the lag line, King's law, the fire beside it) about 2.4 reeds – a voice is
// priced by the pipe chosen when it starts
const HLM_COST = { rohrblatt: [0.68, 1.15], floete: [0.88, 1.59], flamme: [1.63, 2.93] };
for (const [i, T] of [[0, VCOST1], [1, VCOST3]]) Object.defineProperty(T, 'hlm', { get: () => (HLM_COST[P['hlm.rohr']] || HLM_COST.rohrblatt)[i], enumerable: true });
// Zapfen costs what it plays: the processor, or – without AudioWorklet – its native stand-in (≈ 24 nodes; the same voice
// at both levels, its level-3 figure is what the method measures there). The final calibration, all five bodies:
// processor 0.65–0.76 / 1.06–1.30 (Holz the dearest), native 1.05–1.20 / 1.51–1.74 – the highest + 15 %
const ZPF_COST = { wk: [0.88, 1.49], nat: [1.38, 2] };
for (const [i, T] of [[0, VCOST1], [1, VCOST3]]) Object.defineProperty(T, 'zpf', { get: () => (wkReady('zpf') ? ZPF_COST.wk : ZPF_COST.nat)[i], enumerable: true });
// Glut: the worklet loop, or – without AudioWorklet (and while the module loads) – its own native loop, priced as such
// (the final calibration, the highest + 15 %: the loop 0.68–0.75 / 1.34–1.38, level 3 two loops; the native loop's 26
// nodes 0.89–0.97 / 1.70–1.79; re-measured in the final pass, three runs of cost.js: the loop 0.76–0.83 / 1.42–1.52,
// the native loop 1.22–1.28 / 1.81–1.86 – bench.js had measured the native loop at 1.22–1.29 against 1.12)
const GLT_COST = { wk: [0.96, 1.74], nat: [1.48, 2.13] };
for (const [i, T] of [[0, VCOST1], [1, VCOST3]]) Object.defineProperty(T, 'glt', { get: () => (A.ctx && gltNat() ? GLT_COST.nat : GLT_COST.wk)[i], enumerable: true });
const QP = {
  1: { budget: MOBILE ? 14 : 22, maxv: 32, grainMax: MOBILE ? 80 : 128, overlap: MOBILE ? 16 : 24, os: MOBILE ? '2x' : '4x', rich: false, korDens: 1, cost: VCOST1 },
  2: { base: MOBILE ? 24 : 40, budget: MOBILE ? 24 : 40, maxv: 64, grainMax: MOBILE ? 128 : 224, overlap: 24, os: '4x', rich: false, korDens: 1, cost: VCOST1 },
  3: { budget: 48, maxv: 96, grainMax: 640, overlap: 40, os: '4x', rich: true, korDens: 1.75, cost: VCOST3 },
};
let Q = QP[1], VBUDGET = Q.budget, MAXV = Q.maxv;

// Modulated params are evaluated once per 128-frame block instead of per sample ('k-rate'): inaudible for
// LFOs and vibrato, but 2–4× cheaper for oscillators and biquads. Frequencies used for FM and gains stay a-rate.
const KR = (p) => { try { if (p && p.automationRate === 'a-rate') p.automationRate = 'k-rate'; } catch (e) {} return p; };
const G = (v = 1) => { const g = A.ctx.createGain(); g.gain.value = v; return g; };
const BQ = (type, f, q) => {
  const b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q;
  KR(b.frequency); KR(b.Q); KR(b.gain); KR(b.detune);
  return b;
};
const PAN = (v = 0) => {
  if (A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); p.pan.value = clamp(v, -1, 1); KR(p.pan); return p; }
  return A.ctx.createGain();
};
function OSC(type, f) {
  const o = A.ctx.createOscillator();
  if (A.waves && A.waves[type]) o.setPeriodicWave(A.waves[type]); else o.type = type || 'sine';
  o.frequency.value = f;
  KR(o.detune);
  return o;
}
function setP(param, v, tc = 0.03) {
  if (!A.ctx) return;
  if (HXW.now) { setNow(param, v); return; }   // Hexenring: the Werk-Rahmen sets a recorded state at once …
  const t = HXW.t != null ? HXW.t : A.ctx.currentTime;   // … or a recorded change at its own moment
  if (param._hx) hxPrm(param._hx, t, v, tc);   // Hexenring: the chain's modulators and the drift, followed for their phases
  try { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, tc); } catch (e) { param.value = v; }
}
function holdParam(param, t) {
  if (param.cancelAndHoldAtTime) { param.cancelAndHoldAtTime(t); return; }
  const v = param.value;
  param.cancelScheduledValues(t);
  param.setValueAtTime(v, t);
}
// A ramp on a param only Gestik moves (the mod layer's sources, a finger's bend, the Ocarina's depth): from where it
// is now. Inside a running ramp it is held there; after the last ramp ended it starts from that ramp's known end – a
// linear ramp after an ended automation would otherwise start back at that old event and make most of its move in the
// first sample (a zipper when frames come slower than the ramp). Never on a param the app's setP drives too: in
// Chromium a hold after a setTargetAtTime makes the next ramp start from 0 (a dropout) – those take setP only.
function rampP(p, v, dur, now) {
  if (p._e > now) holdParam(p, now);
  else { p.cancelScheduledValues(now); p.setValueAtTime(p._v != null ? p._v : p.value, now); }
  p.linearRampToValueAtTime(v, now + dur); p._v = v; p._e = now + dur;
}
// a struck voice that must make room (Sporenregen, Rassel): out within ~25 ms from wherever its envelope is – never a
// hold (a setTarget decay would drop to 0 at once in Chromium) and never a ramp anchored in the past
function vFade(v) {
  if (!v.alive) return;
  const t = A.ctx.currentTime, g = v.out.gain, x = g.value;
  g.cancelScheduledValues(t); g.setValueAtTime(x, t); g.setTargetAtTime(0, t, 0.008);
  v.released = true;
  v.finish(t + 0.06);
}
function glideTo(param, v, glide) {
  const t = A.ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setTargetAtTime(v, t, Math.max(0.004, glide / 3));
}
function noiseSrc() { const s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true; return s; }

function makeShaperCurve(fn, n = 4096) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
  return c;
}
// The dry/wet mix is baked into the curve, so dry and driven signal share one path (no comb filter from oversampling delay).
// Each shape is level-matched at a typical voice level (0.25) so the mix knob changes colour, not loudness.
function driveCurve(type, amt, mix) {
  const REF = 0.25;
  let shape;
  if (type === 'fold') {
    const g = 1 + amt * 7;
    shape = (x) => Math.sin(x * g * Math.PI / 2) * 0.5;
  } else if (type === 'crush') {
    const bits = 16 - amt * 14, steps = Math.pow(2, bits) / 2;
    shape = (x) => Math.round(x * steps) / steps;
  } else {
    const k = 1 + amt * 30, norm = REF / Math.tanh(k * REF);
    shape = (x) => Math.tanh(k * x) * norm;
  }
  return makeShaperCurve((x) => (1 - mix) * x + mix * shape(x), type === 'crush' ? 8192 : 4096);
}
// Glue compressor curves. Stage 1: level relative to the threshold (x = level / threshold / 256) → dB above it with a
// 10 dB soft knee, divided by 64. Stage 2: that amount, scaled by (1 − 1/ratio) → linear gain. Threshold and ratio are
// plain gains in front of each stage, so they glide without rebuilding a curve.
const CMP_SPAN = 256, CMP_DB = 64, CMP_KNEE = 10;
// mean-absolute detector, scaled so playing sounds as loud as with the browser compressor it replaces (all presets
// within about ±1 dB); without look-ahead single attacks come through up to ~3 dB hotter, the soft ceiling takes them
const CMP_DET = 1.7;
const ABS_CURVE = (() => { const n = 2049, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.abs((i / (n - 1)) * 2 - 1); return c; })();
function cmpOverCurve() {
  const n = 32769, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (x <= 0) continue;
    const d = 20 * Math.log10(x * CMP_SPAN);   // dB relative to the threshold
    const over = d <= -CMP_KNEE / 2 ? 0 : d >= CMP_KNEE / 2 ? d : Math.pow(d + CMP_KNEE / 2, 2) / (2 * CMP_KNEE);
    c[i] = Math.min(1, over / CMP_DB);
  }
  return c;
}
function cmpGainCurve() {
  const n = 4097, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * 2 - 1; c[i] = u <= 0 ? 1 : Math.pow(10, -CMP_DB * u / 20); }
  return c;
}

