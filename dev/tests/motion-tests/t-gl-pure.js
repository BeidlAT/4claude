// Ladung and Schwenken in the pure recogniser (no browser): shake peaks stamped at the top of the acceleration, the
// Ladung's charge and discharge (shakes of different strength and length, the Entladung's time constant), walking and
// handling on the table that must not charge, and Schwenken – circles charge it (direction, speed, any rate, iOS signs),
// lines, shakes, walking, no gyroscope or no linear acceleration do not; it drains over ~4 s.   node t-gl-pure.js
const L = require('./gk-lib');
const { trace, run, ok, smooth } = L;
const G = L.loadPure();
const at = (r, ms) => r.steps.get(ms) || r.steps.get(ms - ms % 10);
// a run that also records Schwenken's state per inner step
function runSw(tr, opts) {
  const S = new Map(), events = [];
  const R = G.gkMake(Object.assign({}, opts, { onStep: (t, ax, st) => S.set(Math.round(t), { sw: st.sw, hz: st.swHz, dir: st.swDir, c: st.swC, lad: ax.ladung }) }));
  for (const s of tr) for (const e of R.push(s).events) events.push(e);
  let max = 0; for (const x of S.values()) max = Math.max(max, x.sw);
  return { S, max, R, events };
}
const shake = (dur, amp, hz = 5, t0 = 1) => (t) => ({ beta: 45, roll: 6 * Math.sin(2 * Math.PI * hz * t) * (t > t0 && t < t0 + dur ? 1 : 0), lin: t > t0 && t < t0 + dur ? [amp * Math.sin(2 * Math.PI * hz * (t - t0)), 0.2 * amp * Math.sin(2 * Math.PI * hz * (t - t0)), 0] : [0, 0, 0] });
const circle = (hz, amp, dir = 1, beta = 45, t0 = 0.5, t1 = 4.5) => (t) => ({ beta, lin: t > t0 && t < t1 ? [amp * Math.cos(2 * Math.PI * hz * t), dir * amp * Math.sin(2 * Math.PI * hz * t), 0] : [0, 0, 0] });
const walkM = (t) => ({ beta: 45 + 3 * Math.sin(2 * Math.PI * 0.9 * t), roll: 4 * Math.sin(2 * Math.PI * 0.9 * t + 1), yaw: 10 * Math.sin(t * 0.2),
  lin: [1.2 * Math.sin(2 * Math.PI * 0.9 * t), 0.8 * Math.sin(2 * Math.PI * 1.8 * t), 3.5 * Math.sin(2 * Math.PI * 1.8 * t) + 1.2 * Math.sin(2 * Math.PI * 3.6 * t)] });
// iOS: g and a negated – deviceorientation (og, attached by trace's og option) tells the recogniser the sign
const mirror = L.mirror;

// ---------- peaks: at the top of each swing's acceleration ----------
{
  for (const rate of [50, 60, 100, 200]) {
    const r = run(G, trace(5, shake(2, 16), { rate }));
    const pk = r.events.filter((e) => e.type === 'peak'), on = r.events.find((e) => e.type === 'schuetteln' && e.on);
    // x = 16·sin(2π·5·(t − 1)): tops at 1050 + 100·k ms
    const err = pk.map((e) => { const p = (((e.t - 1050) % 100) + 100) % 100; return Math.min(p, 100 - p); });
    ok(pk.length >= 14 && Math.max(...err) <= 10 && pk.every((e) => e.t >= on.t - 100 && e.i === 0),
      rate + ' Hz: every swing after the shake is recognised is one peak, stamped at its top (' + pk.length + ' peaks, off by ≤ ' + Math.max(...err) + ' ms)');
  }
  const r = run(G, trace(5, shake(2, 16))), m = run(G, mirror(trace(5, shake(2, 16), { og: true })));
  const a = r.events.filter((e) => e.type === 'peak'), b = m.events.filter((e) => e.type === 'peak');
  ok(a.length === b.length && a.every((e, i) => e.t === b[i].t && Math.abs(e.v - b[i].v) < 1e-9), 'iOS-mirrored signs: the same peaks at the same times');
  const soft = run(G, trace(5, shake(2, 10))).events.filter((e) => e.type === 'peak'), hard = run(G, trace(5, shake(2, 28))).events.filter((e) => e.type === 'peak');
  const mean = (l) => l.reduce((s, e) => s + e.v, 0) / l.length;
  ok(soft.length && hard.length && mean(hard) > mean(soft) + 0.2 && hard.every((e) => e.v <= 1), 'a harder shake: stronger peaks (' + mean(soft).toFixed(2) + ' → ' + mean(hard).toFixed(2) + ')');
  const det = (e) => e.t;   // a peak's time never lies after it was reported (the event comes when the swing falls off)
  const tr = trace(5, shake(2, 16));
  const R = G.gkMake({});
  let late = 0, n = 0;
  for (const s of tr) for (const e of R.push(s).events) if (e.type === 'peak') { n++; if (det(e) > R.st.tI || R.st.tI - det(e) > 60) late++; }
  ok(n > 10 && late === 0, 'each peak is reported within 60 ms after its top (' + n + ' peaks)');
  const knocks = run(G, trace(8, (t) => { const p = (t * 1000) % 300; return { beta: 0, lin: [0, 0, p < 12 ? 11 * (p < 6 ? 1 : -1) : 0] }; }));
  ok(!knocks.events.some((e) => e.type === 'peak'), 'knocks on the table: no peaks (no Rassel)');
}

// ---------- Ladung: charge and discharge ----------
{
  const lv = (dur, amp) => { const r = run(G, trace(dur + 2, shake(dur, amp))); return at(r, Math.round((1 + dur) * 100) * 10).ladung; };
  const a = lv(0.5, 16), b = lv(1, 16), c = lv(2, 16), soft = lv(1, 10), hard = lv(1, 26);
  ok(a < b && b < c && c > 0.6, 'a longer shake charges more: 0.5 s ' + a.toFixed(2) + ', 1 s ' + b.toFixed(2) + ', 2 s ' + c.toFixed(2));
  ok(soft < b && b < hard, 'a harder shake charges more: soft ' + soft.toFixed(2) + ', medium ' + b.toFixed(2) + ', hard ' + hard.toFixed(2));
  ok(soft > 0.05, 'gentle shaking is enough to charge (' + soft.toFixed(2) + ')');
  // the store decays with time constant entl/3 once the shake is over (e^-3 ≈ 5 % left after the Entladung)
  for (const entl of [0.3, 3, 8, 30]) {
    const r = run(G, trace(4 + Math.min(entl, 10), shake(2, 16)), { entl });
    const t0 = 3200, L0 = at(r, t0).ladung, tau = entl / 3, t1 = t0 + Math.round(Math.min(tau, 3) * 100) * 10, L1 = at(r, t1).ladung;
    const k = L1 / L0, want = Math.exp(-(t1 - t0) / 1000 / tau);
    ok(L0 > 0 && Math.abs(k - want) < 0.03 + 0.02 * want, 'Entladung ' + entl + ' s: after ' + (t1 - t0) + ' ms ' + (k * 100).toFixed(1) + ' % of the charge is left (expected ' + (want * 100).toFixed(1) + ' %)');
  }
  const r2 = run(G, trace(8, shake(2, 16)), { entl: 0.3 });
  ok(at(r2, 3500).ladung < 0.02, 'Entladung 0.3 s: a rattle – empty half a second after the shake (' + at(r2, 3500).ladung.toFixed(3) + ')');
  // what must not charge: walking, the table, lifting and putting down, sliding it over the table, typing on it
  const cases = [
    ['90 s of walking with the phone in hand', trace(90, walkM)],
    ['picked up and put down 10 times', trace(30, (t) => { const p = t % 3; return { beta: 45 * smooth(0.2, 0.9, p) * (1 - smooth(1.8, 2.5, p)), lin: [0, 1.2 * Math.sin(Math.PI * p / 0.7) * (p < 0.7 ? 1 : 0), 2.5 * Math.sin(Math.PI * p / 0.7) * (p < 0.7 ? 1 : 0) - 2.5 * Math.sin(Math.PI * (p - 1.8) / 0.7) * (p > 1.8 && p < 2.5 ? 1 : 0)] }; })],
    ['slid over the table', trace(20, (t) => ({ beta: 0, yaw: 30 * Math.sin(t * 0.7), lin: [1.5 * Math.sin(2 * Math.PI * 0.6 * t), 0.8 * Math.cos(2 * Math.PI * 0.4 * t), 0] }))],
    ['taps on the field while held (lockout)', trace(20, (t) => { const p = (t * 1000) % 300; return { beta: 45, lin: [p < 40 ? 6 * Math.sin(p / 40 * 2 * Math.PI) : 0, 0, p < 40 ? 7 : 0], lock: p < 100 }; })],
    ['the hand leaning while playing', trace(30, (t) => ({ beta: 45 + 15 * Math.sin(t * 0.7), roll: 20 * Math.sin(t * 0.5), lin: [0.4 * Math.sin(t * 3), 0.3 * Math.sin(t * 2.3), 0.5 * Math.sin(t * 4.1)] }))],
  ];
  for (const [nm, tr] of cases) { const r = run(G, tr); let m = 0; for (const x of r.steps.values()) m = Math.max(m, x.ladung); ok(m < 0.08, nm + ': no charge (max ' + m.toFixed(3) + ')'); }
}

// ---------- Schwenken ----------
{
  const ccw = runSw(trace(9, circle(1.5, 2.5, 1))), cw = runSw(trace(9, circle(1.5, 2.5, -1)));
  const s3 = ccw.S.get(3000), s45 = ccw.S.get(4500);
  ok(s3.sw > 0.4 && s45.sw > 0.85, 'circles like a wine glass (1.5 Hz, 2.5 m/s²) fill the store: ' + s3.sw.toFixed(2) + ' after 2.5 s, ' + s45.sw.toFixed(2) + ' after 4 s');
  ok(Math.abs(s45.hz - 1.5) < 0.1, 'the speed of the circles is measured (' + s45.hz.toFixed(2) + ' Hz)');
  ok(s45.dir < -0.9 && cw.S.get(4500).dir > 0.9, 'the direction: counter-clockwise from above −, clockwise + (' + s45.dir.toFixed(2) + ' / ' + cw.S.get(4500).dir.toFixed(2) + ')');
  const k = ccw.S.get(8500).sw / ccw.S.get(5500).sw;
  ok(ccw.S.get(5500).sw < ccw.S.get(4500).sw && Math.abs(k - Math.exp(-3 / 4)) < 0.03, 'it drains calmly once the circles stop: over 3 s to ' + (k * 100).toFixed(0) + ' % (e^−¾ ≈ 47 %)');
  ok(ccw.S.get(1000).sw === 0, 'the first half second of circling does not count yet (a steady circle, not a moment of one)');
  const fast = runSw(trace(7, circle(2.5, 3))), slow = runSw(trace(7, circle(0.8, 1.2)));
  ok(fast.S.get(4400).sw > 0.8 && Math.abs(fast.S.get(4400).hz - 2.5) < 0.15 && slow.S.get(4400).sw > 0.5 && Math.abs(slow.S.get(4400).hz - 0.8) < 0.1,
    'faster (2.5 Hz) and slower, smaller (0.8 Hz, 1.2 m/s²) circles count too, each with its speed (' + fast.S.get(4400).hz.toFixed(2) + ' / ' + slow.S.get(4400).hz.toFixed(2) + ' Hz)');
  const flat = runSw(trace(7, circle(1.5, 2.5, 1, 0))), up = runSw(trace(7, circle(1.5, 2.5, 1, 80)));
  ok(flat.S.get(4400).sw > 0.8 && up.S.get(4400).sw > 0.8, 'held flat or upright: circles across gravity count the same');
  const mir = runSw(mirror(trace(9, circle(1.5, 2.5, 1), { og: true })));
  let d = 0; for (const [t, x] of ccw.S) { const y = mir.S.get(t); if (y) d = Math.max(d, Math.abs(x.sw - y.sw), Math.abs(x.dir - y.dir)); }
  ok(d < 1e-9, 'iOS-mirrored signs: identical store and direction (max difference ' + d.toExponential(1) + ')');
  for (const rate of [30, 50, 100, 200]) {
    const r = runSw(trace(9, circle(1.5, 2.5, 1), { rate })), x = r.S.get(4500).sw;
    ok(Math.abs(x - s45.sw) < 0.05, rate + ' Hz instead of 60: the same store (' + x.toFixed(3) + ' vs ' + s45.sw.toFixed(3) + ')');
  }
  ok(runSw(trace(9, circle(1.5, 2.5, 1), { noGyro: true })).max === 0, 'no gyroscope: Schwenken stays 0 (it needs the fused linear acceleration)');
  ok(runSw(trace(9, circle(1.5, 2.5, 1), { noLin: true })).max === 0, 'no linear acceleration reported: Schwenken stays 0');
  const line = runSw(trace(9, (t) => ({ beta: 45, lin: t > 0.5 && t < 4.5 ? [2.5 * Math.cos(2 * Math.PI * 1.5 * t), 0.6 * Math.cos(2 * Math.PI * 1.5 * t), 0] : [0, 0, 0] })));
  ok(line.max === 0, 'to and fro along a line (shaking slowly): no Schwenken');
  const sh = runSw(trace(6, shake(2, 16)));
  ok(sh.max === 0 && sh.S.get(3000).lad > 0.6, 'a shake charges the Ladung (' + sh.S.get(3000).lad.toFixed(2) + '), not Schwenken');
  const circLad = ccw.S.get(4500).lad;
  ok(circLad < 0.1, 'circles charge Schwenken, hardly the Ladung (' + circLad.toFixed(3) + ')');
  const vert = runSw(trace(9, (t) => ({ beta: 80, lin: t > 0.5 && t < 4.5 ? [2.5 * Math.cos(9.4 * t), 0, 2.5 * Math.sin(9.4 * t)] : [0, 0, 0] })));
  ok(vert.max === 0, 'circles in the vertical plane (drawing in the air): no Schwenken');
  const w = runSw(trace(90, walkM));
  ok(w.max < 0.02, '90 s of walking: no Schwenken (max ' + w.max.toFixed(3) + ')');
  const turnWalk = runSw(trace(60, (t) => ({ beta: 45, yaw: 40 * t, lin: [1.5 * Math.sin(2 * Math.PI * 0.9 * t), 1.2 * Math.sin(2 * Math.PI * 1.8 * t + 0.7), 3.5 * Math.sin(2 * Math.PI * 1.8 * t)] })));
  ok(turnWalk.max < 0.02, 'walking in circles round a room, phone in hand: no Schwenken (max ' + turnWalk.max.toFixed(3) + ')');
  const still = runSw(trace(9, (t) => ({ beta: 0, lin: t > 0.5 && t < 4.5 ? [2.5 * Math.cos(9.4 * t), 2.5 * Math.sin(9.4 * t), 0] : [0, 0, 0] }), { noise: { g: 0.01, r: 0.02 } }));
  ok(still.S.get(4400).sw > 0.8, 'circling on the table (it does not count as lying still while it moves)');
}

// ---------- 10 minutes of playing, walking, table: Schwenken and Ladung stay quiet ----------
{
  const R = L.rng(17), segs = [];
  let t0 = 0;
  while (t0 < 600) { const kind = ['play', 'play', 'walk', 'vib', 'table', 'lean'][Math.floor(R() * 6)], len = 8 + R() * 25; segs.push({ kind, a: t0, b: t0 + len, ph: R() * 6, amp: 10 + R() * 20 }); t0 += len; }
  const seg = (t) => segs.find((s) => t >= s.a && t < s.b) || segs[segs.length - 1];
  const m = (t) => {
    const s = seg(t), k = smooth(s.a, s.a + 0.8, t) * (1 - smooth(s.b - 0.8, s.b, t)), out = { beta: 45, roll: 0, yaw: 0, lin: [0, 0, 0] };
    if (s.kind === 'play') { out.roll = s.amp * Math.sin(t * 0.8 + s.ph) * k; out.beta = 45 + 0.6 * s.amp * Math.sin(t * 0.5 + s.ph) * k; out.lin = [0.4 * Math.sin(t * 3), 0.3 * Math.sin(t * 2.3), 0.5 * Math.sin(t * 4.1)]; }
    if (s.kind === 'vib') out.roll = 4 * Math.sin(2 * Math.PI * 5.5 * t) * k + 6 * Math.sin(t);
    if (s.kind === 'walk') { const w = walkM(t); out.beta = 45 + (w.beta - 45) * k; out.roll = w.roll * k; out.yaw = 15 * Math.sin(t * 0.3) * k; out.lin = w.lin.map((x) => x * k); }
    if (s.kind === 'table') { out.beta = 45 - 45 * k; const p = (t * 1000) % 700; if (p < 10) out.lin = [0, 0, 6]; }
    if (s.kind === 'lean') { out.beta = 45 + 25 * k; out.roll = 12 * k; }
    return out;
  };
  const r = runSw(trace(600, m, { rate: 60, round: true }));
  let lad = 0; for (const x of r.S.values()) lad = Math.max(lad, x.lad);
  ok(r.max < 0.03 && lad < 0.08, '10 min play + walk + vibrato + table + lean (' + segs.length + ' segments): no Schwenken (max ' + r.max.toFixed(3) + '), no Ladung (max ' + lad.toFixed(3) + ')');
  ok(!r.events.some((e) => e.type === 'peak'), '… and not a single Rassel peak');
}
