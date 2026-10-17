// Shared helpers for the Gestik tests: the pure recogniser cut out of index.html, and a synthetic motion generator.
// World frame: x right, y away from the player, z up. Device pose R = Rz(yaw)·Ry(roll)·Rx(beta): beta 0 = lying face up
// (top edge away), 90 = upright facing the player, 180 = face down; roll + = right edge down; yaw + = counter-clockwise
// seen from above. Samples are what Android/spec report: accelerationIncludingGravity = linear + 9.81·up (device frame),
// rotationRate = the device's angular velocity in its own frame (deg/s about x, y, z).
const fs = require('fs');
const FILE = process.env.APP || '/home/user/4claude/myzel/index.html';
function loadPure(file = FILE) {
  const s = fs.readFileSync(file, 'utf8'), a = s.indexOf('/* GK-PURE-BEGIN */'), b = s.indexOf('/* GK-PURE-END */');
  if (a < 0 || b < 0) throw new Error('GK-PURE markers missing');
  return new Function(s.slice(a, b) + '\nreturn { gkMake, gkOriG, GK_DT };')();
}
const D2R = Math.PI / 180;
const mul = (A, B) => A.map((r, i) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const T = (A) => [0, 1, 2].map((i) => [A[0][i], A[1][i], A[2][i]]);
const mv = (A, v) => A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const Rx = (d) => { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const Ry = (d) => { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const Rz = (d) => { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const pose = (m) => mul(Rz(m.yaw || 0), mul(Ry(m.roll || 0), Rx(m.beta == null ? 45 : m.beta)));
// angular velocity in the device frame from two poses h seconds apart (deg/s)
function omega(R0, R1, h) {
  const D = mul(T(R0), R1), c = Math.min(1, Math.max(-1, (D[0][0] + D[1][1] + D[2][2] - 1) / 2)), th = Math.acos(c);
  const v = [D[2][1] - D[1][2], D[0][2] - D[2][0], D[1][0] - D[0][1]];
  const k = th < 1e-9 ? 0.5 : th / (2 * Math.sin(th));
  return v.map((x) => (x * k) / h / D2R);
}
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// motion(t s) → { beta, roll, yaw, lin: world linear acceleration m/s², lock }
// opts: rate (Hz), noise: { g, r } std, seed, noGyro, noLin, zeroGyro, round (spec 0.1 rounding), orient (screen
// angle: the motion is meant in screen axes and converted to device axes), t0 (ms), og (attach deviceorientation's
// gravity to every sample, as the live layer does)
function trace(dur, motion, o = {}) {
  const rate = o.rate || 60, n = Math.floor(dur * rate), out = [], R = rng(o.seed || 7), h = 0.001;
  const ng = o.noise ? o.noise.g : 0.04, nr = o.noise ? o.noise.r : 0.25;
  const rot = (v) => { if (!o.orient) return v; const a = -o.orient * D2R, c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
  const rd = (v) => (o.round ? v.map((x) => Math.round(x * 10) / 10) : v);
  for (let i = 0; i <= n; i++) {
    const t = i / rate, m = motion(t), P = pose(m), m2 = motion(t + h), P2 = pose(m2);
    const up = mv(T(P), [0, 0, 1]), lin = mv(T(P), m.lin || [0, 0, 0]);
    const g = [0, 1, 2].map((k) => 9.81 * up[k] + lin[k] + ng * gauss(R)), a = lin.map((x) => x + ng * gauss(R));
    let r = omega(P, P2, h).map((x) => x + nr * gauss(R));
    if (o.zeroGyro) r = [0, 0, 0];
    const smp = { t: (o.t0 || 0) + t * 1000, g: rd(rot(g)), a: o.noLin ? null : rd(rot(a)), r: o.noGyro ? null : rd(rot(r)), orient: o.orient || 0, lock: !!m.lock };
    if (o.og) smp.og = rot(up.map((x) => 9.81 * x));   // deviceorientation's gravity (spec sign, never mirrored)
    out.push(smp);
  }
  return out;
}
// run a trace through a fresh recogniser; record every inner step and all events
function run(G, tr, opts = {}) {
  const steps = new Map(), events = [];
  const R = G.gkMake(Object.assign({}, opts, { onStep: (t, ax) => steps.set(Math.round(t), Object.assign({}, ax)) }));
  for (const s of tr) { const o = R.push(s); for (const e of o.events) events.push(e); }
  return { R, steps, events, st: R.st };
}
// iOS: acceleration (g and a) negated, rotation rates and deviceorientation (og) not
const mirror = (tr) => tr.map((s) => Object.assign({}, s, { g: s.g.map((x) => -x), a: s.a && s.a.map((x) => -x) }));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
module.exports = { loadPure, trace, run, ok, mirror, smooth, rng, gauss, pose, mv, T, mul, Rx, Ry, Rz };
