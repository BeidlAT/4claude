// ---- the chain's modulators and the drift, followed: each tracked AudioParam's automation as the app sets it (setP:
// a setTargetAtTime from the value it has), from the moment the modulators started – its value and its integral at any
// audio time: an LFO's phase in cycles ----
const HXP = {};
const HX_LFO = { rng: 'rngOsc', flt: 'fltLfo', pha: 'phaLfo', cho1: 'choL1', cho2: 'choL2', pan: 'panLfo' };
function hxPrmInit() {
  for (const k in HXP) delete HXP[k];
  if (HXW.on || !hxLive()) return;
  const t0 = A.lfoT0 || 0, track = (key, p) => { p._hx = key; HXP[key] = { t0, b: { t: 0, v: p.value, cum: 0, tg: p.value, tc: 1 }, ev: [] }; };
  for (const k in HX_LFO) track(k, A[HX_LFO[k]].frequency);
}
function hxPrm(key, t, v, tc) {
  const R = HXP[key]; if (!R) return;
  const e = R.ev;
  while (e.length && e[e.length - 1][0] >= t) e.pop();   // (cancelScheduledValues(t): what was set from t on is gone)
  e.push([t, v, tc]);
  if (e.length > 800) { const T = e[400][0], x = hxPrmAt(key, T, true); R.b = x; e.splice(0, 400); }   // (the oldest folded into a base)
}
// → {v, cum, tg, tc} at audio time T: the value, its integral since the start t0, the target it is gliding to
function hxPrmAt(key, T, base) {
  const R = HXP[key]; if (!R) return { t: T, v: 0, cum: 0, tg: 0, tc: 1 };
  let t = R.b.t, v = R.b.v, cum = R.b.cum, tg = R.b.tg, tc = R.b.tc;
  const go = (t2) => {   // from t to t2 on the glide toward tg
    if (t2 <= t) return;
    const a = Math.max(t, R.t0);
    if (t2 > a) { const va = tg + (v - tg) * Math.exp(-(a - t) / tc); cum += tg * (t2 - a) + (va - tg) * tc * (1 - Math.exp(-(t2 - a) / tc)); }
    v = tg + (v - tg) * Math.exp(-(t2 - t) / tc); t = t2;
  };
  for (const [te, vt, tce] of R.ev) { if (te > T) break; go(te); tg = vt; tc = Math.max(1e-4, tce); }
  go(T);
  return { t: T, v, cum, tg, tc };
}
// ---- the chain's state written down (in the Humus's timebase): every change of drive, ring, filter, phaser, chorus and
// Kreisen as a snapshot of their settings, and the mod layer's deflections of them as lines – three minutes ----
const HX_CHAIN = ['drv.type', 'drv.amt', 'drv.mix', 'rng.freq', 'rng.mix', 'flt.type', 'flt.freq', 'flt.q', 'flt.lfoRate', 'flt.lfoDepth', 'pha.mix', 'pha.fb', 'pha.rate', 'pha.depth', 'cho.rate', 'cho.depth', 'cho.mix', 'mov.pan', 'mov.panRate', 'dev.lat'];
const HXL = { ev: [], mod: {} };
function hxChainLog() {
  if (HXW.on || !A.ctx || !hxLive()) return;
  const t = A.ctx.currentTime, v = HX_CHAIN.map((id) => P[id]), os = Q.os, lite = !!A.lite, e = HXL.ev, last = e[e.length - 1];
  if (last && last[2] === os && last[3] === lite && last[1].every((x, i) => x === v[i])) return;
  if (last && last[0] >= t) e.pop();
  e.push([t, v, os, lite]);
  hxTrim(e, t);
}
// 180 s are kept (the Humus); the old part goes in one cut once 20 s more have gathered – a cut every call would copy the
// whole list each time (a Gestik binding writes the chain every frame)
function hxTrim(e, t) {
  if (!(e.length > 2 && e[1][0] < t - 200)) return;
  let k = 1; while (k < e.length - 2 && e[k + 1][0] < t - 180) k++;
  e.splice(0, k);
}
const hxPoly = (p, t) => { if (!p || !p.length || t <= p[0][0]) return p && p.length ? p[0][1] : 0; let i = p.length - 1; while (i > 0 && p[i][0] > t) i--; const a = p[i], b = p[i + 1]; return b ? a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]) : a[1]; };
function hxModRamp(k, now, v, t1) {
  if (HXW.on || !hxLive()) return;
  const p = HXL.mod[k] || (HXL.mod[k] = []), v0 = hxPoly(p, now);
  while (p.length && p[p.length - 1][0] > now) p.pop();   // (a ramp from now: what was laid ahead is gone, the value held)
  p.push([now, v0], [t1, v]);
  hxTrim(p, now);
}
function hxModPt(k, t, v) { if (HXW.on || !hxLive()) return; const p = HXL.mod[k] || (HXL.mod[k] = []); while (p.length && p[p.length - 1][0] >= t) p.pop(); p.push([t, v]); hxTrim(p, t); }
// what a bake of the window [ta, tb) (audio times) needs: the settings at ta and their changes after it (times from ta),
// each chain LFO's phase, rate and pending glide at ta, the deflections' lines
function hxChainRec(ta, tb) {
  const e = HXL.ev; let i = e.length - 1;
  while (i > 0 && e[i][0] > ta) i--;
  const s0 = e[i] && e[i][0] <= ta ? e[i] : [ta, HX_CHAIN.map((id) => P[id]), Q.os, !!A.lite];
  const ev = e.filter((x) => x[0] > ta && x[0] < tb).map((x) => [x[0] - ta, x[1], x[2], x[3]]);
  const lfo = {}; for (const k in HX_LFO) { const x = hxPrmAt(k, ta); lfo[k] = [x.cum, x.v, x.tg, x.tc]; }
  const mod = {};
  for (const k in HXL.mod) {
    const p = HXL.mod[k]; if (!p.length || hxPoly(p, tb) === 0 && hxPoly(p, ta) === 0 && !p.some((q) => q[0] > ta && q[0] < tb)) continue;
    mod[k] = [[0, hxPoly(p, ta)]].concat(p.filter((q) => q[0] > ta && q[0] < tb).map((q) => [q[0] - ta, q[1]]));
  }
  return { ids: HX_CHAIN, snap: s0[1], os: s0[2], lite: s0[3], ev, lfo, mod };
}

