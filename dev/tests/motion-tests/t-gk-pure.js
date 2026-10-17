// The pure gesture recogniser (GK-PURE block of index.html), without a browser: synthetic traces in, axes and events
// out. Tilt in every pose, the iOS-mirrored stream, 50–200 Hz, jitter/duplicates/bundles, no gyroscope, a turned
// screen, Schütteln vs walking vs knocks, Wenden, Ruhe, Bebung, Drehen, Ladung, a 10-minute play+walk trace without a
// single false Wenden or Schütteln, and the cost per sample.   node t-gk-pure.js
const L = require('./gk-lib');
const { trace, run, ok, smooth } = L;
const G = L.loadPure();
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const cnt = (evs, type, on = true) => evs.filter((e) => e.type === type && e.on === on).length;
const maxDiff = (a, b, keys, from = 0, every = 50) => {
  let m = 0, at = null, n = 0;
  for (const [t, x] of a.steps) {
    if (t < from || t % every) continue;
    const y = b.steps.get(t);
    if (!y) continue;
    n++;
    for (const k of keys) { const d = Math.abs(x[k] - y[k]); if (d > m) { m = d; at = t + ':' + k; } }
  }
  if (n < 20) return { m: Infinity, at: 'only ' + n + ' common steps' };
  return { m, at };
};

// ---------- tilt in three poses ----------
for (const beta of [0, 45, 90]) {
  const tr = trace(10, (t) => ({ beta: beta - 22 * smooth(6, 7, t) + 22 * smooth(8.5, 9.5, t), roll: 40 * smooth(0.5, 1.5, t) - 80 * smooth(2.5, 3.5, t) + 40 * smooth(4.5, 5.5, t) }));
  const r = run(G, tr), at = (ms) => r.steps.get(ms);
  ok(at(2000).tiltX > 0.97 && Math.abs(at(2000).tiltY) < 0.06, 'pose ' + beta + '°: right edge down 40° → Neigen ↔ full right (' + at(2000).tiltX.toFixed(3) + ', ↕ ' + at(2000).tiltY.toFixed(3) + ')');
  ok(at(4000).tiltX < -0.97 && Math.abs(at(4000).tiltY) < 0.06, 'pose ' + beta + '°: left edge down 40° → full left (' + at(4000).tiltX.toFixed(3) + ')');
  ok(Math.abs(at(6000).tiltX) < 0.01 && Math.abs(at(6000).tiltY) < 0.01, 'pose ' + beta + '°: back in the zero pose → 0');
  ok(at(8000).tiltY > 0.75 && Math.abs(at(8000).tiltX) < 0.05, 'pose ' + beta + '°: top edge away 22° → Neigen ↕ positive (' + at(8000).tiltY.toFixed(3) + ')');
}
{ // dead zone, soft knee, Weite
  const ramp = trace(9, (t) => ({ beta: 45, roll: t < 8 ? t * 6 : 48 }));
  const r = run(G, ramp), x = (deg) => r.steps.get(Math.round((deg / 6) * 1000 / 10) * 10 + 200).tiltX;   // ≈ 200 ms of filter lag
  ok(x(3) === 0 && x(3.8) === 0, 'Ruhezone: 3–3.8° give exactly 0');
  ok(x(5) > 0 && x(5) < 0.03, 'soft knee: just past the Ruhezone the value rises gently (' + x(5).toFixed(4) + ')');
  ok(Math.abs(x(18) - 0.638) < 0.04, 'linear part: 18° ≈ 0.64 at Weite 30 (' + x(18).toFixed(3) + ')');
  ok(x(29) > 0.97 && x(29) <= 1 && x(40) === 1, 'full scale at the Weite, never beyond 1 (' + x(29).toFixed(3) + ')');
  const r20 = run(G, ramp, { weite: 20 }), r45 = run(G, ramp, { weite: 45 }), v = (rr, deg) => rr.steps.get(Math.round((deg / 6) * 100) * 10 + 200).tiltX;
  ok(v(r20, 15) > v(r, 15) && v(r, 15) > v(r45, 15) && v(r20, 21) > 0.97 && v(r45, 30) < 0.8, 'Weite 20/30/45: the same tilt goes further on a smaller Weite');
}

// ---------- the iOS-mirrored stream ----------
function richMotion(t) {   // a minute with everything: tilts, vibrato, a turn, a shake, a flip, lying still, pickup
  const m = { beta: 45, roll: 0, yaw: 0, lin: [0, 0, 0] };
  m.roll = 25 * Math.sin(t * 0.7) * smooth(1, 2, t) * (1 - smooth(14, 15, t));
  m.beta = 45 + 15 * Math.sin(t * 0.43) * (1 - smooth(14, 15, t));
  if (t > 5 && t < 8) m.roll += 4 * Math.sin(2 * Math.PI * 5.5 * t);
  if (t > 9 && t < 12) m.yaw = -70 * smooth(9, 9.4, t);
  if (t > 16 && t < 18) m.lin = [15 * Math.sin(2 * Math.PI * 5 * t), 4 * Math.sin(2 * Math.PI * 5 * t + 1), 0];
  if (t > 20 && t < 30) m.beta = 45 + 135 * smooth(20, 21, t) - 135 * smooth(26, 27, t);
  if (t > 32 && t < 45) { m.beta = 45 - 45 * smooth(32, 33, t); m.lin = [0, 0, 0]; }
  if (t >= 45) m.beta = 45 * smooth(45, 46, t) + 0 - 0;
  return m;
}
{
  // (deviceorientation comes with it, as on every device that mirrors: it tells the sign within 10 samples)
  const tr = trace(55, richMotion, { round: true, og: true }), mir = L.mirror(tr);
  const a = run(G, tr), b = run(G, mir);
  let same = true, worst = 0;
  for (const [t, x] of a.steps) { const y = b.steps.get(t); for (const k in x) { const d = Math.abs(x[k] - y[k]); worst = Math.max(worst, d); if (d > 1e-9) same = false; } }
  ok(same, 'iOS-mirrored acceleration (g and a negated, rates not): identical axes at every step (worst ' + worst.toExponential(1) + ')');
  const nosg = (l) => JSON.stringify(l.filter((e) => e.type !== 'sign'));
  ok(nosg(a.events) === nosg(b.events) && a.events.length > 5, 'mirrored: identical events (' + a.events.map((e) => e.type + (e.on === false ? '-' : '')).join(' ') + ')');
  ok(a.st.sign === 1 && b.st.sign === -1 && a.st.signK === 'ori' && b.st.signK === 'ori', 'the sign is checked against deviceorientation: spec +1, mirrored −1');
  // without deviceorientation the spec's sign holds – until 10 s of play in the mirror image of the usual pose
  const nm = run(G, L.mirror(trace(55, richMotion, { round: true }))), sg = nm.events.find((e) => e.type === 'sign');
  ok(nm.st.sign === -1 && sg && sg.how === 'pose' && sg.t > 9000 && sg.t < 15000, 'mirrored, no deviceorientation: 10 s of play at 45° turn the sign (' + (sg && sg.t) + ' ms)');
  ok(run(G, trace(55, richMotion, { round: true })).st.sign === 1, '… and the spec stream keeps +1');
  ok(cnt(a.events, 'wenden') === 1 && cnt(a.events, 'schuetteln') === 1 && cnt(a.events, 'ruhe') >= 1, 'rich trace: one Wenden, one Schütteln, Ruhe');
}

// ---------- rate independence ----------
const smoothMotion = (t) => ({ beta: 45 + 18 * Math.sin(t * 1.3), roll: 30 * Math.sin(t * 0.9) + (t > 4 && t < 6 ? 4 * Math.sin(2 * Math.PI * 5 * t) : 0), yaw: t > 7 && t < 8 ? -60 * smooth(7, 7.4, t) : 0,
  lin: t > 9 && t < 10.5 ? [6 * Math.sin(2 * Math.PI * 4 * t), 0, 0] : [0, 0, 0] });
{
  const ref = run(G, trace(12, smoothMotion, { rate: 100, noise: { g: 0, r: 0 } }));
  const keys = ['tiltX', 'tiltY', 'drehen', 'ladung'];
  for (const rate of [50, 60, 200]) {
    const r = run(G, trace(12, smoothMotion, { rate, noise: { g: 0, r: 0 } })), d = maxDiff(ref, r, keys, 300);
    ok(d.m <= 0.02, rate + ' Hz vs 100 Hz: Neigen, Drehen, Ladung differ by ≤ 2 % (max ' + (d.m * 100).toFixed(2) + ' % at ' + d.at + ')');
  }
  // the sensor's own clock and the browser's 60 Hz pump: samples are delayed by up to ±8 ms, doubled, skipped, bundled
  const base = trace(12, smoothMotion, { rate: 60, noise: { g: 0, r: 0 } }), R = L.rng(99);
  const jit = base.map((s) => Object.assign({}, s, { t: s.t + (R() * 16 - 8) })).sort((x, y) => x.t - y.t);
  const r1 = run(G, jit), d1 = maxDiff(ref, r1, keys, 300);
  ok(d1.m <= 0.02, '±8 ms jitter: ≤ 2 % (max ' + (d1.m * 100).toFixed(2) + ' %)');
  // a 50 Hz sensor read by Chrome's 60 Hz pump: every sixth reading is the previous one again (a value skipped)
  const dup = base.map((s, i) => (i % 6 === 5 ? Object.assign({}, base[i - 1], { t: s.t }) : s));
  const r2 = run(G, dup), d2 = maxDiff(ref, r2, keys, 300);
  ok(d2.m <= 0.02, 'every sixth sample a duplicate of the one before: ≤ 2 % (max ' + (d2.m * 100).toFixed(2) + ' %)');
  // two samples dispatched together (main thread busy): both stamped between their true times, each ≤ 8 ms off
  const bun = base.map((s, i) => Object.assign({}, s, { t: i % 2 ? s.t - 8.3 + 0.1 : s.t + 8.3 }));
  const r3 = run(G, bun), d3 = maxDiff(ref, r3, keys, 300);
  ok(d3.m <= 0.02, 'bundles of two samples at once (main thread busy): ≤ 2 % (max ' + (d3.m * 100).toFixed(2) + ' %)');
  // Bebung: its strength over the vibrato, not its phase
  const amp = (rr) => { let s = 0, n = 0; for (const [t, x] of rr.steps) if (t > 4300 && t < 5900) { s += x.bebung * x.bebung; n++; } return Math.sqrt(s / n); };
  const aRef = amp(ref);
  for (const [nm, rr] of [['50 Hz', run(G, trace(12, smoothMotion, { rate: 50, noise: { g: 0, r: 0 } }))], ['200 Hz', run(G, trace(12, smoothMotion, { rate: 200, noise: { g: 0, r: 0 } }))], ['jitter', r1], ['doubled', r2]]) {
    const a2 = amp(rr);
    ok(Math.abs(a2 - aRef) <= 0.02, 'Bebung strength ' + nm + ': ' + a2.toFixed(3) + ' vs ' + aRef.toFixed(3) + ' (≤ 0.02)');
  }
}

// ---------- no gyroscope, deviceorientation only ----------
{
  const m = (t) => ({ beta: 45 + (t > 2 && t < 4 ? -25 * smooth(2, 2.5, t) : 0), roll: t < 2 ? 30 * smooth(0.5, 1, t) : 0, yaw: t > 4 && t < 6 ? -80 * smooth(4, 4.4, t) : 0,
    lin: t > 6.5 && t < 8 ? [14 * Math.sin(2 * Math.PI * 5 * t), 0, 0] : [0, 0, 0], ...(t > 9 && t < 11 ? { beta: 180 } : {}) });
  for (const [nm, o] of [['rotationRate null', { noGyro: true }], ['rotationRate all zero', { zeroGyro: true }], ['no gyro, no linear acceleration', { noGyro: true, noLin: true }]]) {
    const r = run(G, trace(14, m, o)), s = (ms) => r.steps.get(ms);
    let bz = true; for (const x of r.steps.values()) if (x.bebung || x.drehen) bz = false;
    ok(!r.st.gyro && bz, nm + ': no gyroscope → Bebung and Drehen stay 0, flagged unavailable');
    ok(s(1800).tiltX > 0.9 && s(3500).tiltY > 0.8, nm + ': tilt still works (' + s(1800).tiltX.toFixed(2) + ', ' + s(3500).tiltY.toFixed(2) + ')');
    ok(cnt(r.events, 'schuetteln') === 1 && cnt(r.events, 'wenden') === 1, nm + ': Schütteln and Wenden still work');
  }
  let worst = 0;
  for (const [b, gm] of [[0, 0], [45, 0], [90, 0], [30, 20], [60, -40], [10, 80]]) {
    const g = G.gkOriG(b, gm), up = L.mv(L.T(L.mul(L.Rx(b), L.Ry(gm))), [0, 0, 1]);   // Z-X'-Y'' (alpha does not matter)
    for (let i = 0; i < 3; i++) worst = Math.max(worst, Math.abs(g[i] / 9.81 - up[i]));
  }
  ok(worst < 1e-9, 'deviceorientation fallback: beta/gamma → the same gravity vector as devicemotion');
}

// ---------- the screen turned to landscape ----------
{
  const m = (t) => ({ beta: 45 - 20 * smooth(3, 4, t), roll: 35 * smooth(0.5, 1.5, t) - 35 * smooth(2, 2.5, t) + (t > 5 && t < 7 ? 4 * Math.sin(2 * Math.PI * 5 * t) : 0), yaw: t > 7.5 ? -50 * smooth(7.5, 7.8, t) : 0 });
  const ref = run(G, trace(9, m, { noise: { g: 0, r: 0 } }));
  for (const o of [90, 270, 180]) {
    const r = run(G, trace(9, m, { orient: o, noise: { g: 0, r: 0 } })), d = maxDiff(ref, r, ['tiltX', 'tiltY', 'bebung', 'drehen'], 0, 10);
    ok(d.m < 1e-6, 'screen at ' + o + '°: the same gesture in screen axes gives the same values (max diff ' + d.m.toExponential(1) + ')');
  }
  // turning the screen mid-play: a new zero in the new frame
  const tr = trace(4, (t) => ({ beta: 45, roll: 10 })).map((s) => (s.t > 2000 ? Object.assign({}, s, { orient: 90 }) : s));
  const r = run(G, tr);
  ok(r.events.some((e) => e.type === 'zero' && e.why === 'orient') && Math.abs(r.steps.get(3000).tiltX) < 0.01, 'orientation change → re-zero ("zero" event, tilt back to 0)');
}

// ---------- Schütteln vs walking vs knocks ----------
{
  const shake = run(G, trace(6, (t) => ({ beta: 45, roll: 10 * Math.sin(2 * Math.PI * 5 * t) * (t > 1 && t < 3 ? 1 : 0), lin: t > 1 && t < 3 ? [16 * Math.sin(2 * Math.PI * 5 * t), 3 * Math.sin(2 * Math.PI * 5 * t), 0] : [0, 0, 0] })));
  const on = shake.events.find((e) => e.type === 'schuetteln' && e.on);
  ok(cnt(shake.events, 'schuetteln') === 1 && cnt(shake.events, 'schuetteln', false) === 1, 'shake 2 s → one Schütteln (on … off)');
  ok(on && on.t > 1100 && on.t < 1700 && on.v > 0.2 && on.v <= 1, 'Schütteln comes within the first reversals, with a strength (' + (on && on.t) + ' ms, ' + (on && on.v.toFixed(2)) + ')');
  ok(shake.events.filter((e) => e.type === 'peak').length >= 8, 'every swing of the shake is a peak (' + shake.events.filter((e) => e.type === 'peak').length + ')');
  ok(shake.steps.get(3000).ladung > 0.6, 'two seconds of shaking charge the Ladung (' + shake.steps.get(3000).ladung.toFixed(2) + ')');
  const R = L.rng(5);
  const walk = run(G, trace(90, (t) => ({ beta: 45 + 3 * Math.sin(2 * Math.PI * 0.9 * t), roll: 4 * Math.sin(2 * Math.PI * 0.9 * t + 1), yaw: 10 * Math.sin(t * 0.2),
    lin: [1.2 * Math.sin(2 * Math.PI * 0.9 * t), 0.8 * Math.sin(2 * Math.PI * 1.8 * t), 3.5 * Math.sin(2 * Math.PI * 1.8 * t) + 1.2 * Math.sin(2 * Math.PI * 3.6 * t)] })));
  let lmax = 0; for (const x of walk.steps.values()) lmax = Math.max(lmax, x.ladung);
  ok(cnt(walk.events, 'schuetteln') === 0 && cnt(walk.events, 'wenden') === 0, '90 s walking with the phone in hand: no Schütteln, no Wenden');
  ok(lmax < 0.08, 'walking does not charge the Ladung (max ' + lmax.toFixed(3) + ')');
  const knock = (t, every, amp) => { const p = (t * 1000) % every; return p < 12 ? amp * (p < 6 ? 1 : -1) : 0; };
  const knocks = run(G, trace(12, (t) => ({ beta: 0, lin: [0, 0, knock(t, 300, 11)] })));
  ok(cnt(knocks.events, 'schuetteln') === 0, 'knocks on the table every 300 ms (11 m/s² spikes): no Schütteln');
  const taps = run(G, trace(12, (t) => { const p = (t * 1000) % 250; return { beta: 45, lin: [p < 40 ? 12 * Math.sin(p / 40 * 2 * Math.PI) : 0, 0, p < 40 ? 9 : 0], lock: p < 100 }; }));
  ok(cnt(taps.events, 'schuetteln') === 0 && cnt(taps.events, 'wenden') === 0, 'taps on the field (lockout flag set for 100 ms): Schütteln and Wenden blind');
  const lift = run(G, trace(5, (t) => ({ beta: 45 * smooth(1, 1.8, t), lin: [0, 1.5 * Math.sin(Math.PI * (t - 1) / 0.8) * (t > 1 && t < 1.8 ? 1 : 0), 3 * Math.sin(Math.PI * (t - 1) / 0.8) * (t > 1 && t < 1.8 ? 1 : 0)] })));
  let lm = 0; for (const x of lift.steps.values()) lm = Math.max(lm, x.ladung);
  ok(lm < 0.05, 'lifting the phone from the table does not charge (max ' + lm.toFixed(3) + ')');
  for (const [entl, test] of [[0.3, (r) => r.steps.get(3500).ladung < 0.05], [30, (r) => r.steps.get(8000).ladung > 0.3]]) {
    const r = run(G, trace(9, (t) => ({ beta: 45, lin: t > 1 && t < 3 ? [16 * Math.sin(2 * Math.PI * 5 * t), 0, 0] : [0, 0, 0] })), { entl });
    ok(test(r), 'Entladung ' + entl + ' s: ' + (entl < 1 ? 'a rattle – empty 0.5 s after the shake (' + r.steps.get(3500).ladung.toFixed(3) + ')' : 'a capacitor – still charged 5 s later (' + r.steps.get(8000).ladung.toFixed(2) + ')'));
  }
}

// ---------- Wenden ----------
{
  const flip = (hold, d = 0.4) => (t) => ({ beta: 45 + 135 * smooth(1, 1 + d, t) - 135 * smooth(1 + d + hold, 1 + 2 * d + hold, t) });
  const brief = run(G, trace(4, flip(0.12, 0.1)));
  ok(cnt(brief.events, 'wenden') === 0, 'face down for about 200 ms only: no Wenden');
  const r = run(G, trace(6, flip(2))), on = r.events.find((e) => e.type === 'wenden' && e.on), off = r.events.find((e) => e.type === 'wenden' && !e.on);
  ok(on && on.t >= 1550 && on.t <= 1900, 'face down: Wenden after > 300 ms (' + (on && on.t) + ' ms)');
  ok(off && off.t > 3500 && off.t < 4000, 'turned back: Wenden ends (' + (off && off.t) + ' ms)');
  // hysteresis: from flat (zero face up) to 160° → on; back to 100° → still on; to 50° → off
  const hy = run(G, trace(9, (t) => ({ beta: 160 * smooth(1, 1.5, t) - 60 * smooth(3, 3.5, t) - 50 * smooth(6, 6.5, t) + 0 * t, ...(t < 0.5 ? { beta: 0 } : {}) })));
  const hon = hy.events.filter((e) => e.type === 'wenden');
  ok(hon.length === 2 && hon[0].on && hon[0].t < 2100 && !hon[1].on && hon[1].t > 6000, 'hysteresis: on beyond 150°, still on at 100°, off below 60° (' + hon.map((e) => (e.on ? '+' : '-') + e.t).join(' ') + ')');
  const tilt = run(G, trace(6, (t) => ({ beta: 45 + 95 * smooth(1, 2, t) - 95 * smooth(4, 5, t) })));
  ok(cnt(tilt.events, 'wenden') === 0, 'a big tilt (top edge 95° toward you) is no Wenden');
}

// ---------- Ruhe ----------
{
  const R = L.rng(3);
  // (a hand trembles: the pickup's trace has a hand's noise from the moment it leaves the table)
  const tm = (t) => ({ beta: 45 - 45 * smooth(1, 2, t) + (t > 6 ? 45 * smooth(6, 6.8, t) : 0), lin: t > 6 && t < 6.8 ? [0, 1, 2.5] : [0, 0, 0] });
  const table = run(G, trace(6, tm, { noise: { g: 0.03, r: 0.12 } }).concat(trace(10, tm, { noise: { g: 0.05, r: 1.5 }, seed: 4 }).filter((s) => s.t > 6000)));
  const ron = table.events.find((e) => e.type === 'ruhe' && e.on), roff = table.events.find((e) => e.type === 'ruhe' && !e.on), z = table.events.find((e) => e.type === 'zero' && e.why === 'pickup');
  ok(ron && ron.t > 3300 && ron.t < 4200, 'laid on the table: Ruhe after 1.5 s still (' + (ron && ron.t) + ' ms)');
  ok(roff && roff.t > 6000 && roff.t < 6300, 'picked up: Ruhe ends at once (' + (roff && roff.t) + ' ms)');
  ok(z && z.why === 'pickup' && z.t > 6300 && Math.abs(table.steps.get(8000).tiltY) < 0.05, 'pickup → a new zero once the phone settles in the hand (' + (z && z.t) + ' ms)');
  const hand = run(G, trace(20, (t) => ({ beta: 45 + 0.4 * Math.sin(t * 7.3) + 0.3 * Math.sin(t * 11.1), roll: 0.4 * Math.sin(t * 9.7), lin: [0.05 * Math.sin(t * 40), 0.05 * Math.sin(t * 31), 0.03 * Math.sin(t * 23)] }), { noise: { g: 0.04, r: 1.5 } }));
  ok(cnt(hand.events, 'ruhe') === 0, 'held very still in the hand (tremor): never Ruhe');
  const nudge = run(G, trace(9, (t) => ({ beta: 0 + (t > 4 && t < 4.3 ? 3 : 0), lin: t > 4 && t < 4.15 ? [1.5, 0, 0] : [0, 0, 0] }), { noise: { g: 0.03, r: 0.12 } }));
  ok(cnt(nudge.events, 'ruhe', false) >= 1 && !nudge.events.some((e) => e.type === 'zero'), 'a nudge ends Ruhe but keeps the zero (pose unchanged)');
}

// ---------- Bebung and Drehen ----------
{
  const vib = run(G, trace(8, (t) => ({ beta: 45, roll: (t > 2 && t < 5 ? 4 * Math.sin(2 * Math.PI * 5 * t) : 0) + 10 * smooth(5.5, 7, t) })));
  let pk = 0, rest = 0, lean = 0;
  for (const [t, x] of vib.steps) { if (t > 3000 && t < 5000) pk = Math.max(pk, Math.abs(x.bebung)); if (t < 1900) rest = Math.max(rest, Math.abs(x.bebung)); if (t > 5600) lean = Math.max(lean, Math.abs(x.bebung)); }
  ok(pk > 0.5, 'wrist vibrato ±4° at 5 Hz → Bebung swings (peak ' + pk.toFixed(2) + ')');
  ok(rest === 0 && lean < 0.05, 'at rest and while slowly leaning: no Bebung (' + rest.toFixed(3) + ', ' + lean.toFixed(3) + ')');
  const trem = run(G, trace(15, (t) => ({ beta: 45, roll: 0.25 * Math.sin(2 * Math.PI * 7 * t) + 0.2 * Math.sin(2 * Math.PI * 9.3 * t) }), { noise: { g: 0.04, r: 2 } }));
  let tm = 0; for (const x of trem.steps.values()) tm = Math.max(tm, Math.abs(x.bebung));
  ok(tm < 0.05, 'a trembling hand (rest tremor 7–9 Hz) stays below the gate (max ' + tm.toFixed(3) + ')');
  // the bass guard: the phone's own speaker shakes the gyroscope broadband (it folds into everything at 60 Hz)
  const shaken = trace(6, () => ({ beta: 45 }), { noise: { g: 0.04, r: 60 }, seed: 21 });
  const loud = shaken.map((x) => Object.assign({}, x, { bass: 1 }));
  const bmax = (r) => { let m = 0; for (const [t, x] of r.steps) if (t > 1000) m = Math.max(m, Math.abs(x.bebung)); return m; };
  const qb = run(G, shaken), lb = run(G, loud);
  ok(bmax(qb) > 0.2 && bmax(lb) < 0.02 && lb.st.guard, 'bass guard: the same gyroscope rattle is Bebung when quiet (' + bmax(qb).toFixed(2) + '), nothing with loud bass (' + bmax(lb).toFixed(3) + ')');
  const vibLoud = run(G, trace(8, (t) => ({ beta: 45, roll: t > 2 && t < 5 ? 4 * Math.sin(2 * Math.PI * 5 * t) : 0 })).map((x) => Object.assign({}, x, { bass: 1 })));
  let vl = 0; for (const [t, x] of vibLoud.steps) if (t > 3000 && t < 5000) vl = Math.max(vl, Math.abs(x.bebung));
  ok(vl > 0.5, 'bass guard: a real wrist vibrato still works with loud bass (' + vl.toFixed(2) + ')');
  const turn = run(G, trace(8, (t) => ({ beta: 20, yaw: -60 * smooth(1, 1.5, t) + 120 * smooth(5, 5.4, t) })));
  const d = (ms) => turn.steps.get(ms).drehen;
  ok(d(1600) > 0.45, 'turned clockwise 60° → Drehen positive (' + d(1600).toFixed(2) + ')');
  ok(Math.abs(d(4600)) < 0.05, 'held there: it springs back to the middle within 3 s (' + d(4600).toFixed(3) + ')');
  ok(d(5500) < -0.45, 'turned back counter-clockwise → negative (' + d(5500).toFixed(2) + ')');
  ok(Math.abs(turn.steps.get(1600).tiltX) < 0.05, 'turning about the vertical is not sideways tilt');
  const up = run(G, trace(5, (t) => ({ beta: 90, roll: 30 * smooth(1, 1.5, t) })));
  ok(Math.abs(up.steps.get(1600).drehen) < 0.1 && up.steps.get(2000).tiltX > 0.9, 'phone upright: turning it like a steering wheel is Neigen ↔, not Drehen');
}

// ---------- 10 minutes of playing and walking: nothing happens by itself ----------
{
  const R = L.rng(11), segs = [];
  let t0 = 0;
  while (t0 < 600) { const kind = ['play', 'play', 'walk', 'vib', 'table', 'lean'][Math.floor(R() * 6)], len = 8 + R() * 25; segs.push({ kind, a: t0, b: t0 + len, ph: R() * 6, amp: 10 + R() * 20 }); t0 += len; }
  const seg = (t) => segs.find((s) => t >= s.a && t < s.b) || segs[segs.length - 1];
  const m = (t) => {
    const s = seg(t), k = smooth(s.a, s.a + 0.8, t) * (1 - smooth(s.b - 0.8, s.b, t)), out = { beta: 45, roll: 0, yaw: 0, lin: [0, 0, 0] };
    if (s.kind === 'play') { out.roll = s.amp * Math.sin(t * 0.8 + s.ph) * k; out.beta = 45 + 0.6 * s.amp * Math.sin(t * 0.5 + s.ph) * k; out.lin = [0.4 * Math.sin(t * 3), 0.3 * Math.sin(t * 2.3), 0.5 * Math.sin(t * 4.1)]; }
    if (s.kind === 'vib') { out.roll = 4 * Math.sin(2 * Math.PI * 5.5 * t) * k + 6 * Math.sin(t); }
    if (s.kind === 'walk') { out.beta = 45 + 3 * Math.sin(2 * Math.PI * 0.9 * t) * k; out.roll = 4 * Math.sin(2 * Math.PI * 0.9 * t + 1) * k; out.yaw = 15 * Math.sin(t * 0.3) * k;
      out.lin = [1.2 * k * Math.sin(2 * Math.PI * 0.9 * t), 0.8 * k * Math.sin(2 * Math.PI * 1.8 * t), (3.5 * Math.sin(2 * Math.PI * 1.8 * t) + 1.2 * Math.sin(2 * Math.PI * 3.6 * t)) * k]; }
    if (s.kind === 'table') { out.beta = 45 - 45 * k; const p = (t * 1000) % 700; if (p < 10) out.lin = [0, 0, 6]; }
    if (s.kind === 'lean') { out.beta = 45 + 25 * k; out.roll = 12 * k; }
    // taps on the field during play: a jolt with the lockout flag
    const p = (t * 1000) % 430;
    if (s.kind === 'play' && p < 30) { out.lin = [out.lin[0] + 4, out.lin[1], out.lin[2] + 6]; out.lock = true; }
    else if (s.kind === 'play' && p < 100) out.lock = true;
    return out;
  };
  const tr = trace(600, m, { rate: 60, round: true });
  const t1 = process.hrtime.bigint();
  const r = run(G, tr);
  const per = Number(process.hrtime.bigint() - t1) / 1e6 / tr.length;
  ok(cnt(r.events, 'wenden') === 0 && cnt(r.events, 'schuetteln') === 0, '10 min play + walk + table + lean (' + segs.length + ' segments): 0 false Wenden, 0 false Schütteln');
  ok(per < 0.2, 'cost per sample ' + (per * 1000).toFixed(1) + ' µs (< 0.2 ms)');
  console.log('     segments: ' + ['play', 'walk', 'vib', 'table', 'lean'].map((k) => k + ' ' + segs.filter((s) => s.kind === k).length).join(', ') + ' · Ruhe events ' + cnt(r.events, 'ruhe'));
}
