// Fix phase (gx): the recogniser findings, pure (GK-PURE block, no browser).   node t-gx-pure.js
// The sign belongs to the device (deviceorientation, a stored check, long mirrored play – never a zero pose), Wenden
// from overhead poses, the orientation turn while face down, the stand nudge, a flat table is level, a support's slope
// for Sporenregen, Bebung under taps and tonal bass, Schütteln in any direction.
const L = require('./gk-lib');
const { trace, run, ok, smooth, mirror } = L;
const G = L.loadPure();
const cnt = (evs, type, on = true) => evs.filter((e) => e.type === type && e.on === on).length;
const at = (r, ms) => r.steps.get(ms) || r.steps.get(ms - (ms % 10));
const maxAbs = (r, k, a, b) => { let m = 0; for (const [t, x] of r.steps) if (t >= a && t < b) m = Math.max(m, Math.abs(x[k])); return m; };
// run with zero calls at given times: [ms, hand, restFlat]
function runZ(tr, opts, zs) {
  const steps = new Map(), events = [];
  const R = G.gkMake(Object.assign({}, opts, { onStep: (t, ax, st) => steps.set(Math.round(t), Object.assign({ wenden: st.wenden, sign: st.sign }, ax)) }));
  const q = (zs || []).slice();
  for (const s of tr) {
    for (const e of R.push(s).events) events.push(e);
    while (q.length && s.t >= q[0][0]) { const z = q.shift(); events.push({ type: 'zeroCall', ok: R.zero(z[1], z[2]), t: s.t, wenden: R.st.wenden }); }
  }
  return { R, steps, events, st: R.st };
}
const wenWhile = (r, a, b) => { let n = 0, m = 0; for (const [t, x] of r.steps) if (t >= a && t < b) { m++; if (x.wenden) n++; } return n / Math.max(1, m); };
const evs = (r) => r.events.filter((e) => ['wenden', 'zero', 'ruhe', 'sign', 'zeroCall'].includes(e.type)).map((e) => e.type + (e.on === false ? '-' : e.on ? '+' : '') + (e.why ? '(' + e.why + ')' : '') + (e.how ? '(' + e.how + ')' : '') + (e.type === 'zeroCall' ? '(' + e.ok + ')' : '') + '@' + Math.round(e.t)).join(' ');
const HAND = { noise: { g: 0.05, r: 1.5 } };   // a hand trembles
const TABLE = { noise: { g: 0.03, r: 0.12 } };

console.log('---- the sign belongs to the device ----');
{ // iOS (mirrored, with deviceorientation): landscape with portrait lock at the start (no clue in the pose), later face up
  const m = (t) => (t < 4 ? { beta: 90, roll: 90 } : { beta: 90 - 90 * smooth(4, 5, t), roll: 90 - 90 * smooth(4, 5, t) });
  const ios = runZ(mirror(trace(10, m, { og: true })), { pickZero: false }, [[500, true]]);
  const sg = ios.events.find((e) => e.type === 'sign');
  ok(ios.st.sign === -1 && sg && sg.how === 'ori' && sg.t < 300, 'iOS, landscape-locked start: deviceorientation tells the sign within 10 samples (' + evs(ios) + ')');
  ok(cnt(ios.events, 'wenden') === 0, 'iOS: laid face up later → no Wenden');
  const st = runZ(mirror(trace(10, m)), { pickZero: false, sign: -1 }, []);
  ok(st.st.sign === -1 && st.st.signK === 'stored' && cnt(st.events, 'wenden') === 0, 'iOS with the sign stored from an earlier session, no deviceorientation: right from the first sample, no Wenden face up');
}
{ // Android, "Immer": lying face up, carried hanging top-edge-down while walking (a pickup zero there), laid face up again
  const walk = (t) => [1.2 * Math.sin(2 * Math.PI * 0.9 * t), 0.8 * Math.sin(2 * Math.PI * 1.8 * t), 3 * Math.sin(2 * Math.PI * 1.8 * t)];
  const m = (t) => (t < 4 ? { beta: 0 } : t < 4.6 ? { beta: -100 * smooth(4, 4.6, t) } : t < 8 ? { beta: -100 + 5 * Math.sin(2 * Math.PI * 0.9 * t), lin: walk(t) } : { beta: -100 + 100 * smooth(8, 8.8, t) });
  const r = runZ(trace(16, m, { noise: { g: 0.03, r: 0.12 } }), { pickZero: true });
  ok(r.st.sign === 1 && cnt(r.events, 'wenden') === 0, 'Android: a pickup zero while carried top-edge-down keeps the sign; face up again → no Wenden (' + evs(r) + ')');
  // even carried that way for a minute: the sign holds (only screen AND top edge down vote against it)
  const long = runZ(trace(70, (t) => ({ beta: -100 + 5 * Math.sin(2 * Math.PI * 0.9 * t), lin: walk(t) }), HAND), { pickZero: true });
  ok(long.st.sign === 1, 'Android carried top-edge-down for 70 s: sign stays +1');
}
{ // a Nullpunkt with the screen turned away (top edge down), then normal play and face up on the table
  const m = (t) => ({ beta: t < 2 ? 45 : t < 3 ? 45 - 145 * smooth(2, 2.6, t) : t < 5 ? -100 : t < 6 ? -100 + 145 * smooth(5, 5.6, t) : t < 9 ? 45 : 45 - 45 * smooth(9, 9.6, t) });
  const r = runZ(trace(14, m, HAND), { pickZero: false }, [[4000, false]]);
  ok(r.st.sign === 1 && cnt(r.events, 'wenden') === 0, 'a zero taken top-edge-down keeps the sign; later face up → no Wenden (' + evs(r) + ')');
}
{ // switched on overhead (lying on the back), later sitting up and laying it face up
  const m = (t) => ({ beta: t < 4 ? 170 : t < 5 ? 170 - 125 * smooth(4, 4.8, t) : t < 8 ? 45 : 45 - 45 * smooth(8, 8.6, t) });
  const r = runZ(trace(13, m, HAND), { pickZero: false });
  ok(r.st.sign === 1 && cnt(r.events, 'wenden') === 0, 'switched on overhead: sign +1, never Wenden (' + evs(r) + ')');
}

console.log('---- lying on the back, phone overhead ----');
{ // sitting (zero at 45°), lying down over 3 s with a trembling hand, playing overhead with leans
  const m = (t) => ({ beta: t < 2 ? 45 : 45 + 125 * smooth(2, 5, t), roll: t > 7 && t < 10 ? 15 * Math.sin(t) : 0 });
  const r = runZ(trace(12, m, HAND), { pickZero: false }, [[1000, true]]);
  ok(wenWhile(r, 2000, 12000) === 0, 'lying down slowly (3 s) with the phone held overhead: no Wenden (' + evs(r) + ')');
}
{ // lying down fast (1 s): an in-hand flip – Wenden, but the veil's condition (lying still) is not met and a finger on
  // the screen takes the zero there and ends Wenden; a key (hand = false) cannot
  const m = (t) => ({ beta: t < 2 ? 45 : 45 + 125 * smooth(2, 3, t), roll: t > 6 && t < 9 ? 15 * Math.sin(t) : 0 });
  const r = runZ(trace(10, m, HAND), { pickZero: false }, [[1000, true], [4000, false], [4500, true]]);
  const z = r.events.filter((e) => e.type === 'zeroCall');
  ok(z[1] && !z[1].ok && z[1].wenden, 'overhead after a fast flip: a key / pad cannot take the zero (Wenden stays)');
  ok(z[2] && z[2].ok && !z[2].wenden && wenWhile(r, 4600, 10000) === 0, 'a finger on the screen there takes the zero and ends Wenden; playing overhead afterwards: no Wenden (' + evs(r) + ')');
  ok(r.st.still < 0.5 && !r.st.ruhe, '… held in a trembling hand it is never "lying still" (no veil)');
  // from that overhead zero: turned to the ceiling (face up) is no Wenden; laid face down on the bed, still, is
  const m2 = (t) => (t < 10 ? m(t) : t < 13 ? { beta: 170 - 170 * smooth(10, 11, t) } : { beta: 180 * smooth(13, 14, t) });
  const tr2 = trace(10, m2, HAND).concat(trace(18, m2, TABLE, 9).filter((s) => s.t > 10000));
  const r2 = runZ(tr2, { pickZero: false }, [[1000, true], [4500, true]]);
  ok(wenWhile(r2, 10500, 13000) === 0 && wenWhile(r2, 15500, 18000) > 0.9, 'overhead zero: face up → no Wenden; laid face down and still → Wenden (' + evs(r2) + ')');
}
{ // the phone laid face down on a table (sleeping) still sleeps; a deliberate flip in the hand still sleeps
  const table = runZ(trace(8, (t) => ({ beta: 45 + 135 * smooth(2, 2.5, t) }), TABLE), {}, [[1000, true], [5000, true]]);
  const zc = table.events.filter((e) => e.type === 'zeroCall');
  ok(wenWhile(table, 3000, 8000) > 0.95 && zc[1] && !zc[1].ok, 'face down on the table: Wenden; a (phantom) touch there cannot end it (' + evs(table) + ')');
  const slowTable = runZ(trace(9, (t) => ({ beta: 45 + 135 * smooth(2, 5, t) }), TABLE), {});
  const on = slowTable.events.find((e) => e.type === 'wenden' && e.on);
  ok(on && on.t > 4800 && on.t < 6300, 'laid face down slowly (3 s): Wenden once it lies still (' + (on && on.t) + ' ms)');
  const flip = runZ(trace(6, (t) => ({ beta: 45 + 135 * smooth(2, 2.5, t) - 135 * smooth(4, 4.5, t) }), HAND), {});
  ok(cnt(flip.events, 'wenden') === 1 && wenWhile(flip, 2900, 4000) > 0.9, 'turned over in the hand (0.5 s): Wenden (' + evs(flip) + ')');
}

console.log('---- the screen turns while the phone lies face down ----');
{
  const m = (t) => ({ beta: 0, roll: 180 * smooth(1, 2.2, t) - 180 * smooth(6, 7.2, t) });
  const r = runZ(trace(10, m).map((s) => (s.t >= 2300 && s.t < 7000 ? Object.assign({}, s, { orient: 90 }) : s)), { pickZero: false });
  ok(wenWhile(r, 3000, 6000) > 0.95 && wenWhile(r, 8000, 10000) === 0 && r.st.sign === 1, 'view turned late while face down: Wenden stays, face up again ends it (' + evs(r) + ')');
  const r2 = runZ(trace(10, m).map((s) => (s.t >= 2300 ? Object.assign({}, s, { orient: 90 }) : s)), { pickZero: false });
  ok(wenWhile(r2, 8000, 10000) === 0, 'the view stays turned: face up again → no Wenden (' + evs(r2) + ')');
  // held in the hand, screen up: a turn of the view is a new way to hold it – a new zero, the tilt starts from 0
  const r3 = runZ(trace(4, () => ({ beta: 45, roll: 10 }), HAND).map((s) => (s.t > 2000 ? Object.assign({}, s, { orient: 90 }) : s)));
  ok(r3.events.some((e) => e.type === 'zero' && e.why === 'orient') && Math.abs(at(r3, 3000).tiltX) < 0.05, 'turned view in the hand: re-zero');
}

console.log('---- Ruhe, the stand and the table ----');
{ // zero in the hand, leaned on a stand, nudged 10°: the zero stays (the rain goes on, its direction changes)
  const m = (t) => ({ beta: t < 2 ? 45 : t < 3 ? 45 + 30 * smooth(2, 3, t) : 75, roll: t < 2 ? 0 : t < 3 ? 15 * smooth(2, 3, t) : t < 8 ? 15 : 15 + 10 * smooth(8, 8.15, t), lin: t > 8 && t < 8.1 ? [3, 0, 1] : [0, 0, 0] });
  const tr = trace(3, m, HAND).concat(trace(14, m, TABLE, 9).filter((s) => s.t > 3000));
  const r = runZ(tr, { pickZero: true });
  ok(at(r, 6000).tiltX > 0.4 && at(r, 12000).tiltX > at(r, 6000).tiltX && !r.events.some((e) => e.type === 'zero'), 'stand: a nudge changes the rain, it keeps the zero (' + at(r, 6000).tiltX.toFixed(2) + ' → ' + at(r, 12000).tiltX.toFixed(2) + '; ' + evs(r) + ')');
  // picked up into a trembling hand: a new zero, quickly
  const m2 = (t) => ({ beta: t < 6 ? 0 : 45 * smooth(6, 6.6, t), lin: t > 6 && t < 6.6 ? [0, 1, 2.5] : [0, 0, 0] });
  const r2 = runZ(trace(6, m2, TABLE).concat(trace(10, m2, HAND, 5).filter((s) => s.t > 6000)), { pickZero: true });
  const z = r2.events.find((e) => e.type === 'zero' && e.why === 'pickup');
  ok(z && z.t < 7600 && Math.abs(at(r2, 8500).tiltY) < 0.05, 'picked up into the hand: new zero within 1 s (' + evs(r2) + ')');
}
{ // "Immer" (Sporenregen): zero in the hand at 45°, laid flat on the table → flat is level, the tilt goes to 0
  const m = (t) => ({ beta: t < 3 ? 45 : 45 - 45 * smooth(3, 3.8, t) });
  const r = runZ(trace(3, m, HAND).concat(trace(9, m, TABLE, 3).filter((s) => s.t > 3000)), { pickZero: true });
  ok(r.events.some((e) => e.type === 'zero' && e.why === 'flat') && Math.abs(at(r, 8000).tiltY) < 0.01, 'laid flat: the table is level, the rain goes quiet (tiltY ' + at(r, 5000).tiltY.toFixed(2) + ' → ' + at(r, 8000).tiltY.toFixed(2) + ')');
  const tc = runZ(trace(3, m, HAND).concat(trace(9, m, TABLE, 3).filter((s) => s.t > 3000)), { pickZero: false });
  ok(!tc.events.some((e) => e.type === 'zero'), '"Mit Tönen": lying flat takes no zero (the next note does)');
}
{ // Sporenregen on an iPad already on its stand (70°): measured from the flat, so it rains toward the bottom edge
  const r = runZ(trace(6, () => ({ beta: 70 }), TABLE), { pickZero: true, restFlat: true });
  ok(r.events.some((e) => e.type === 'zero' && e.why === 'rest') && at(r, 5000).tiltY < -0.9, 'on a stand from the start: the flat is level, full slope toward the bottom edge (tiltY ' + at(r, 5000).tiltY.toFixed(2) + ')');
  const n = runZ(trace(6, () => ({ beta: 70 }), TABLE), { pickZero: true, restFlat: false });
  ok(!n.events.some((e) => e.type === 'zero'), 'without Sporenregen: the stand pose stays the zero');
  const z = runZ(trace(6, () => ({ beta: 70 }), TABLE), { pickZero: true }, [[3000, false, true], [4000, true, false]]);
  ok(z.events.filter((e) => e.type === 'zeroCall').every((e) => e.ok) && Math.abs(at(z, 5000).tiltY) < 0.01, 'an explicit Nullpunkt (double tap) there makes the stand level after all');
  const zr = runZ(trace(6, () => ({ beta: 70 }), TABLE), { pickZero: true }, [[3000, false, true]]);
  ok(at(zr, 3500).tiltY < -0.9, 'Sporenregen chosen while it rests on the stand: measured from the flat');
}

console.log('---- Bebung: taps and tonal bass ----');
{
  const bump = (x, w) => (x >= 0 && x < w ? Math.sin((Math.PI * x) / w) ** 2 : 0);
  for (const [nm, rate, A, alt] of [['trill 8 taps/s, alternating, 2.5°', 8, 2.5, true], ['trill 10 taps/s, 3°', 10, 3, true], ['drumming 6 taps/s, 2°', 6, 2, false]]) {
    const m = (t) => { let roll = 0, lock = false; if (t > 2 && t < 8) { const k = Math.floor(t * rate), x = t - k / rate; roll = (alt && k % 2 ? -1 : 1) * A * bump(x, 0.08); lock = x < 0.1; } return { beta: 45, roll, lock }; };
    const r = run(G, trace(10, m, { noise: { g: 0.04, r: 1 } }));
    ok(maxAbs(r, 'bebung', 2500, 8000) < 0.05, nm + ': no Bebung (max ' + maxAbs(r, 'bebung', 2500, 8000).toFixed(3) + ')');
  }
  const vib = run(G, trace(8, (t) => ({ beta: 45, roll: t > 2 && t < 5 ? 4 * Math.sin(2 * Math.PI * 5 * t) : 0 })));
  ok(maxAbs(vib, 'bebung', 3000, 5000) > 0.5, 'a real wrist vibrato still swings (' + maxAbs(vib, 'bebung', 3000, 5000).toFixed(2) + ')');
  for (const f of [57, 63]) {
    const base = trace(30, () => ({ beta: 45 }), { noise: { g: 0.04, r: 0.5 }, seed: 3 });
    const tr = base.map((s) => Object.assign({}, s, { r: s.r.map((x, i) => x + (s.t > 5000 ? 40 * Math.sin(2 * Math.PI * f * (s.t / 1000) + i) : 0)), bass: s.t > 5000 ? 1 : 0 }));
    const r = run(G, tr);
    ok(maxAbs(r, 'bebung', 5000, 30000) < 0.05, 'a held ' + f + ' Hz tone through the speaker (±40 deg/s, loud bass): no Bebung (max ' + maxAbs(r, 'bebung', 5000, 30000).toFixed(3) + ')');
  }
}

console.log('---- Schütteln in any direction ----');
{
  const minAmp = (dir, beta = 45) => { for (let A = 5; A <= 20; A += 0.5) { const r = run(G, trace(4, (t) => ({ beta, lin: t > 1 && t < 2.5 ? dir.map((d) => d * A * Math.sin(2 * Math.PI * 5 * t)) : [0, 0, 0] }))); if (cnt(r.events, 'schuetteln') > 0) return A; } return Infinity; };
  const a = [minAmp([1, 0, 0]), minAmp([0, 1, 0]), minAmp([0, 0, 1]), minAmp([Math.SQRT1_2, Math.SQRT1_2, 0]), minAmp([1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)])];
  ok(Math.max(...a) <= Math.min(...a) * 1.1, 'the same 5 Hz shake counts from the same strength along x, y, z, xy, xyz (' + a.join(', ') + ' m/s²)');
  const circ = run(G, trace(6, (t) => ({ beta: 45, lin: t > 1 && t < 4 ? [12 * Math.cos(2 * Math.PI * 2 * t), 12 * Math.sin(2 * Math.PI * 2 * t), 0] : [0, 0, 0] })));
  ok(cnt(circ.events, 'schuetteln') === 0, 'strong circles (12 m/s², 2 Hz) are no Schütteln');
}

console.log('---- keys played through a flip (final check) ----');
{ // held at 45° in a trembling hand, a key every 100 ms (each asks for a zero, hand = false) while the phone is turned
  // face down over 0.6 s and then held on its face in the hand: a key must never take a face-down zero, so it sleeps
  const m = (t) => ({ beta: t < 2 ? 45 : 45 + 135 * smooth(2, 2.6, t) });
  const keys = []; for (let ms = 1000; ms < 6000; ms += 100) keys.push([ms, false]);
  const r = runZ(trace(6, m, HAND), { pickZero: false }, keys);
  ok(wenWhile(r, 3500, 6000) > 0.9, 'keys played through the flip, held face down in the hand: Wenden (' + evs(r).slice(0, 200) + ' …)');
  const late = r.events.filter((e) => e.type === 'zeroCall' && e.t > 2600 && e.ok).length;
  ok(late === 0, 'no key zero is taken once the screen faces down (' + late + ')');
  // and on the table: it sleeps as early as without the keys
  const tb = runZ(trace(6, m, TABLE), { pickZero: false }, keys), t0 = runZ(trace(6, m, TABLE), { pickZero: false }, [[1000, false]]);
  const on = (x) => (x.events.find((e) => e.type === 'wenden' && e.on) || { t: Infinity }).t;
  ok(on(tb) <= on(t0) + 50, 'laid face down on the table while keys play: sleeps as early as without them (' + on(tb) + ' vs ' + on(t0) + ' ms)');
}
