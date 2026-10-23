/* =====================================================================
   Gestik: the phone's motion as one more controller
   ===================================================================== */
/* GK-PURE-BEGIN */
// The recogniser: sensor samples in, five axes and three events out. A pure function of what it is fed – no browser,
// no clock of its own – so a recorded trace replays identically in the tests (they cut this block out and run it).
// It works on a fixed inner step of 10 ms and interpolates between samples: 50 or 200 Hz, doubled, bundled or
// jittered samples give the same result (event.interval is never read – Chrome gives ms, iOS seconds).
// A sample: { t (ms), g: [x, y, z] accelerationIncludingGravity, a: [x, y, z] linear acceleration or null, r: [alpha,
// beta, gamma] rotation rate in deg/s about x, y, z or null (no gyroscope), orient: the screen's angle (0/90/180/270),
// lock: a tap on the field or the vibration motor shakes the phone right now (Schütteln and Wenden are blind then),
// bass: 0..1 how loud the output is below 120 Hz (the phone's own speaker can shake the gyroscope), og: the gravity
// deviceorientation's beta/gamma give right now (device axes, spec sign) or null }.
// Tilt is the rotation of the gravity vector away from the zero pose, split along the screen's axes – never Euler
// angles, which fall apart with the phone held upright. iOS reports acceleration with the opposite sign. The rotation
// from the zero pose to now is the same either way; only "which edge went down" needs to know where up is. That sign
// belongs to the device, never to a pose (a zero taken overhead or with the top edge down must not flip it): checked
// against deviceorientation (its angles are never mirrored – every browser that mirrors sends them), else the spec's
// sign (opts.sign: what an earlier check on this device found), turned only by 10 s of play in the mirror image of the
// usual pose (screen and top edge both pointing down). A mirrored stream with its orientation gives identical results.
// Axes: tiltX (Neigen ↔: right edge down +), tiltY (Neigen ↕: top edge away from you +), bebung (the wrist's fast
// wobble about the sideways axis, signed), drehen (turned like a knob about the vertical, clockwise +, springs back),
// all −1..1; ladung 0..1 (motion energy above the personal handling floor, discharging over "entl" seconds).
// Schwenken (no axis – Ladung's second, calm store, in the state): sw 0..1, swHz (how fast the circles go), swDir (+1
// clockwise seen from above, −1 the other way), swC (how circular the motion is now, 0..1).
// Events: { type: 'wenden' | 'ruhe' | 'schuetteln', on, v (strength) }, { type: 'peak', v, t, i } (each swing of a
// shake, stamped at the top of its acceleration – not at the reversal),
// { type: 'zero', why } (a new zero pose: 'orient', 'pickup', 'flat' – lying flat is level –, 'rest' – a support's
// slope is not level: Sporenregen on a stand –), { type: 'sign', v, how } (the sign became known: 'ori', 'pose').
// opts: weite, dz (Ruhezone), entl, pickZero (the clutch "Immer": picked up, the hand's pose is the new zero; lying
// flat is level), restFlat (Sporenregen: a pose resting on a support is measured from the flat), sign (+1/−1 stored).
const GK_DT = 0.01;
function gkMake(opts) {
  const O = Object.assign({ weite: 30, dz: 4, entl: 8, pickZero: true, restFlat: false, sign: 0, onStep: null }, opts || {});
  const R2D = 180 / Math.PI, D2R = Math.PI / 180;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = (a) => { const l = Math.sqrt(dot(a, a)); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : null; };
  const angle = (a, b) => Math.atan2(Math.sqrt(dot(cross(a, b), cross(a, b))), dot(a, b)) * R2D;
  const lerp = (a, b, k) => (a && b ? [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] : b || a);
  // the pump read the sensor again before it had a new value: exactly the same numbers (once – a phone lying still
  // may send equal rounded values for a long time, and those must keep the time running)
  const same = (a, b) => ['inc', 'la', 'r'].every((k) => (!a[k] && !b[k]) || (a[k] && b[k] && a[k][0] === b[k][0] && a[k][1] === b[k][1] && a[k][2] === b[k][2]));
  // across a skipped reading: a parabola through the two samples before and the one after it (a straight line would
  // cut the tops off a fast wobble)
  const quad = (p, a, b, x, k) => {
    if (!p || !p[k] || !a[k] || !b[k]) return lerp(a[k], b[k], (x - a.t) / (b.t - a.t));
    const t0 = p.t, t1 = a.t, t2 = b.t, l0 = ((x - t1) * (x - t2)) / ((t0 - t1) * (t0 - t2)), l1 = ((x - t0) * (x - t2)) / ((t1 - t0) * (t1 - t2)), l2 = ((x - t0) * (x - t1)) / ((t2 - t0) * (t2 - t1));
    return [0, 1, 2].map((i) => p[k][i] * l0 + a[k][i] * l1 + b[k][i] * l2);
  };
  const vec = (v) => (v && v.length === 3 && Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]) ? v : null);
  // the screen's frame: x/y turned by the screen angle (Chromium's own formula for referenceFrame 'screen')
  const scr = (v, deg) => { if (!v || !deg) return v; const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
  const k1 = (tau) => 1 - Math.exp(-GK_DT / tau);   // a one-pole's step for a time constant in s
  const K = { gl: k1(0.06), uf: k1(0.03), r: k1(0.08), rf: k1(0.025), exc: k1(0.12), sw: k1(0.5), benv: k1(0.15), batt: k1(0.04), brel: k1(0.15),
    bh: (1 / (2 * Math.PI * 2.5)) / (1 / (2 * Math.PI * 2.5) + GK_DT), henv: k1(0.3), bl: k1(1 / (2 * Math.PI * 10)), bleak: Math.exp(-GK_DT / 0.12), dleak: Math.exp(-GK_DT / 1) };
  const SWL = Math.exp(-GK_DT / 4);   // Schwenken drains over 4 s
  const sm = (a, b, x) => { const k = cl((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  let LK = 0, LD = 0, TE = 1;
  function setO(o) { Object.assign(O, o || {}); TE = Math.max(0.05, O.entl / 3); LK = Math.exp(-GK_DT / TE); LD = Math.max(0.8, 0.7 / TE); }
  setO();
  // the 1€ filter (Casiez, Roussel & Vogel 2012): smooths hard at rest, hardly lags when the hand moves fast
  function euro(minC, beta, dC) {
    const a = (fc) => 1 / (1 + 1 / (2 * Math.PI * fc) / GK_DT), f = { x: null, dx: 0 };
    f.step = (x) => {
      if (f.x == null) { f.x = x; f.dx = 0; return x; }
      f.dx += a(dC) * ((x - f.x) / GK_DT - f.dx);
      f.x += a(minC + beta * Math.abs(f.dx)) * (x - f.x);
      return f.x;
    };
    f.reset = (x) => { f.x = x; f.dx = 0; };
    return f;
  }
  // a personal floor: a quantile of the last 30 s (one value per 100 ms), refreshed once a second – thresholds sit
  // above it, so a shaky hand, a bus ride or a noisy sensor do not trigger what a calm one would not
  function qfloor(q, init, cap) {
    const F = { b: new Float32Array(300), n: 0, i: 0, v: init };
    F.push = (x) => { F.b[F.i] = x; F.i = (F.i + 1) % 300; if (F.n < 300) F.n++; };
    F.calc = () => { if (F.n >= 20) { const s = Array.from(F.b.subarray(0, F.n)).sort((x, y) => x - y); F.v = Math.min(cap, s[Math.floor(q * (F.n - 1))]); } return F.v; };
    return F;
  }
  const FL = qfloor(0.75, 0.2, 0.5), FS = qfloor(0.9, 2.5, 5.2), FB = qfloor(0.2, 2, 10);
  const E = { roll: euro(1.2, 0.02, 1), pitch: euro(1.2, 0.02, 1) };
  const AX = { tiltX: 0, tiltY: 0, bebung: 0, drehen: 0, ladung: 0 };
  const st = {
    tI: null, prev: null, orient: null, n: 0, gl: null, u: null, uf: null, uh: [], uh2: [], z: null, X: null, R: null, zN: 0, zWhy: '', zfu: 0,
    sign: O.sign === -1 ? -1 : 1, signK: O.sign === 1 || O.sign === -1 ? 'stored' : '', ogN: 0, ogS: 0, sv: 0,
    roll: 0, pitch: 0, ang: 0, gyro: false, bh0: 0, bx0: 0, bh: 0, bx: 0, bl: 0, bang: 0, benv: 0, bg: 0, henv: 0, bass: 0, guard: false, drh: 0, lad: 0, exc2: 0, exc: 0,
    sx: { cv: null, lv: null, dur: 0, done: false, pk: 0, pkT: 0, rv: false, em: false }, rev: [], shake: false, shPk: 0, shLast: 0,
    sw: 0, swHz: 0, swDir: 0, swC: 0, swP: 0, swX: 0, swD: 0, swA: 0, swh: false, swH: [0, 0, 0], swT: 0,
    rw2: 0, ra2: 0, rwF2: 0, raF2: 0, still: 0, tight: 0, ruhe: false, rPose: null, pick: 0, calm: 0, wenden: false, wT: 0, wF: false, B: { lad: 0, shk: 0, beb: 0 },
    floors: { lad: FL, shk: FS, beb: FB }, axes: AX,
  };
  let evs = [];
  // Ruhezone, Weite and a soft knee: nothing inside the dead zone, a ramp whose start is rounded (no kink), linear,
  // then easing into full scale exactly at the Weite
  function shape(deg) {
    const W = O.weite, dz = O.dz, kw = 3, A = 0.6, s = 2 / (1 + A);
    let e = Math.abs(deg) - dz;
    if (e <= 0) return 0;
    e = e < kw ? (e * e) / (2 * kw) : e - kw / 2;
    const x = e / Math.max(1, W - dz - kw / 2), y = x >= 1 ? 1 : x <= A ? s * x : s * (x - ((x - A) * (x - A)) / (2 * (1 - A)));
    return deg < 0 ? -y : y;
  }
  // the zero pose: its gravity, the screen's x without its share along it (forward/back axis), and the sideways axis
  // (up × x: a positive turn about it lowers the right edge). The sign is the device's – a zero never changes it.
  function frame() {
    const z = st.z, up0 = [z[0] * st.sign, z[1] * st.sign, z[2] * st.sign];
    let X = [1 - z[0] * z[0], -z[0] * z[1], -z[0] * z[2]];
    X = Math.sqrt(dot(X, X)) > 0.25 ? nrm(X) : nrm(cross([0, 1, 0], up0));   // standing on its long edge: any sane axis
    st.X = X; st.R = nrm(cross(up0, X));
  }
  function zeroAt(u, why) {
    st.z = nrm(u) || u.slice(); frame(); st.zN = st.n; st.zWhy = why || ''; st.zfu = 0;
    E.roll.reset(0); E.pitch.reset(0); st.roll = st.pitch = 0;
  }
  // lying flat, screen up (the true level: what a table says)
  const flatU = () => [0, 0, st.sign];
  const isFlat = (u) => u[2] * st.sign > 0.99;   // within 8° of flat
  // the sign became known (or was wrong): what was measured against the old one turns with it
  function setSign(s, how) {
    st.signK = how; st.sv = 0;
    if (s === st.sign) return;
    st.sign = s;
    if (st.z) frame();
    if (E.roll.x != null) { E.roll.x = -E.roll.x; E.roll.dx = -E.roll.dx; }
    for (const k of ['roll', 'drh', 'swDir', 'swX', 'bh0', 'bx', 'bh', 'bx0', 'bl', 'bang']) st[k] = -st[k];
    AX.tiltX = shape(st.roll); if (st.gyro) { AX.bebung = cl((st.bang * st.bg) / 5, -1, 1); AX.drehen = Math.tanh(st.drh / 60); }
    evs.push({ type: 'sign', v: s, how, t: st.tI });
  }
  // The sign against deviceorientation: its gravity and the accelerometer's, both in the device's own axes (before the
  // screen's turn), the phone not shaking (then they could point apart). Unknown, one clear vote decides; to turn a
  // sign checked before (or stored) it takes ten in a row.
  function ogVote(og) {
    const g0 = st.g0, gm = Math.sqrt(dot(g0, g0)), om = Math.sqrt(dot(og, og));
    const d = gm > 7 && gm < 12.5 && om > 1 ? dot(g0, og) / (gm * om) : 0;
    if (Math.abs(d) < 0.7) return;
    const v = d > 0 ? 1 : -1;
    if (st.signK !== 'ori' && st.signK !== 'stored') { setSign(v, 'ori'); return; }
    if (v === st.sign) { st.ogN = 0; st.signK = 'ori'; return; }
    if (v === st.ogS) st.ogN++; else { st.ogS = v; st.ogN = 1; }
    if (st.ogN >= 10) setSign(v, 'ori');
  }
  // a whole frame (zero pose, Ruhe pose) carried into the axes of a screen turned by d degrees – exact: the turn is
  // about the screen's normal
  function turnFrame(d) {
    if (st.z) { st.z = scr(st.z, d); st.X = scr(st.X, d); st.R = scr(st.R, d); }
    if (st.rPose) st.rPose = scr(st.rPose, d);
  }
  // a swing's top: the first moment its acceleration has clearly fallen from the peak (or the swing ends) – the peak
  // event carries the peak's own time, so Rassel-Schläge sit where the hand's stroke was hardest
  function top(S, i, thrS) { if (S.done && S.rv && !S.em && st.shake) { S.em = true; evs.push({ type: 'peak', v: cl(S.pk / (3 * thrS), 0, 1), t: S.pkT, i }); } }
  function step(inc, la, r, lock, bass) {
    st.n++;
    let g, lin;
    if (la) { g = [inc[0] - la[0], inc[1] - la[1], inc[2] - la[2]]; lin = la; }
    else {   // no linear acceleration given: gravity is the accelerometer's slow part
      const gl = st.gl || (st.gl = inc.slice());
      for (let i = 0; i < 3; i++) gl[i] += K.gl * (inc[i] - gl[i]);
      g = gl; lin = [inc[0] - gl[0], inc[1] - gl[1], inc[2] - gl[2]];
    }
    const u = nrm(g);
    if (!u) return;
    st.u = u;
    if (!st.uf) st.uf = u.slice();
    for (let i = 0; i < 3; i++) st.uf[i] += K.uf * (u[i] - st.uf[i]);
    if (!st.z) zeroAt(u, 'first');
    if (r && (r[0] || r[1] || r[2])) st.gyro = true;   // a phone without gyroscope sends null or zeros
    const gy = st.gyro && !!r;
    // the sign without deviceorientation: the spec's, unless the hand plays for 10 s in the mirror image of the usual
    // pose (screen and top edge both down – overhead in bed only has the screen down, carried at the side only the edge)
    if (st.signK === '' || st.signK === 'pose') {
      const ys = u[1] * st.sign, zs = u[2] * st.sign;
      if (!st.ruhe && st.still < 0.3) { if (ys < -0.3 && zs < -0.3) st.sv += GK_DT; else if (ys > 0.3 && zs > 0.3) st.sv = Math.max(0, st.sv - 2 * GK_DT); }
      if (st.sv >= 10) setSign(-st.sign, 'pose');
    }
    const up = [u[0] * st.sign, u[1] * st.sign, u[2] * st.sign];
    // tilt: the rotation from the zero pose (exponential coordinates, split along the sideways and forward axes)
    const k = cross(st.z, u), sn = Math.sqrt(dot(k, k)), th = Math.atan2(sn, dot(st.z, u));
    st.ang = th * R2D;
    let roll = 0, pitch = 0;
    if (sn > 1e-9) { const f = (-th / sn) * R2D; roll = f * dot(k, st.R); pitch = f * dot(k, st.X); }
    st.roll = E.roll.step(roll); st.pitch = E.pitch.step(pitch);
    AX.tiltX = shape(st.roll); AX.tiltY = shape(-st.pitch);
    // Bebung and Drehen need the gyroscope
    const wr2 = gy ? dot(r, r) : 0;
    let env = 0;
    if (gy) {
      const w = dot(r, st.R);   // how fast the wrist turns about the sideways axis, deg/s
      st.bh0 = K.bh * (st.bh0 + w - st.bx); st.bx = w; st.bh = K.bh * (st.bh + st.bh0 - st.bx0); st.bx0 = st.bh0;   // 2.5 Hz high-pass, two poles: the lean itself – and a slow 1 Hz sway – stays out
      st.bl += K.bl * (st.bh - st.bl);   // 10 Hz low-pass
      st.bang = st.bang * K.bleak + st.bl * GK_DT;   // the angle the wobble sweeps (leaky: it cannot drift)
      st.benv += K.benv * (st.bl * st.bl - st.benv);
      env = Math.sqrt(st.benv);
      // Bass guard: loud low notes from the phone's own speaker shake the gyroscope – that shows as energy above 10 Hz
      // (a wrist cannot wobble that fast; at 60 Hz sampling the speaker's frequencies fold down there). Loud bass and
      // as much energy above the band as in it: no Bebung.
      st.henv += K.henv * ((st.bh - st.bl) * (st.bh - st.bl) - st.henv);
      st.guard = bass > 0.5 && Math.sqrt(st.henv) > 0.6 * env;
      // a gate above the resting tremor – twice as high under loud bass: a held low TONE folds into one frequency inside
      // the band (57 Hz at 60 Hz sampling → 3 Hz) and has nothing above it for the test above to see
      const thr = Math.max(12, 3 * FB.v) * (bass > 0.5 ? 2 : 1);
      let gt = st.guard ? 0 : cl((env - thr) / thr, 0, 1);
      st.lk = lock ? 0.25 : Math.max(0, (st.lk || 0) - GK_DT);
      if (st.lk > 0 && gt > st.bg) gt = st.bg;   // a tap tips the phone about this very axis: a trill must not open the gate (a sounding wobble goes on)
      st.bg += (gt > st.bg ? K.batt : K.brel) * (gt - st.bg);
      AX.bebung = cl((st.bang * st.bg) / 5, -1, 1);
      // a knob turned about the vertical (with the phone flat that is the screen's own axis; held upright, turning
      // about the screen's axis is already sideways tilt) – a spring brings it back within about 3 s
      let wv = dot(r, up);
      wv = wv > 1.5 ? wv - 1.5 : wv < -1.5 ? wv + 1.5 : 0;
      st.drh = st.drh * K.dleak - wv * GK_DT;
      AX.drehen = Math.tanh(st.drh / 60);
    } else { AX.bebung = 0; AX.drehen = 0; st.bg = 0; }
    // Ladung: motion energy above the handling floor fills a store that leaks over the Entladung
    const la2 = dot(lin, lin), e2 = gy ? wr2 / 62500 + la2 / 64 : la2 / 36;
    st.exc2 += K.exc * (e2 - st.exc2);
    st.exc = Math.sqrt(st.exc2);
    const ex = Math.max(0, st.exc - Math.max(0.6, 1.5 * FL.v));
    st.lad = cl(st.lad * LK + ex * LD * GK_DT, 0, 1);
    AX.ladung = st.lad;
    // Schwenken: the phone circled like a wine glass. The linear acceleration across gravity then turns steadily one
    // way: how fast it turns (the area it sweeps, signed) against how fast it changes at all is 1 for a circle, 0 for
    // a line (shaking to and fro), and about 0 for walking's figure of eight. Needs the fused linear acceleration of a
    // phone with gyroscope. 0.6 s of steady circles before it counts, then 2.5 s fill this second, calm store; it
    // drains over 4 s. Never while shaking or lying still.
    if (gy && la) {   // (in plain numbers: 100 steps a second must leave no garbage)
      const lu = dot(lin, u), H = st.swH, x0 = lin[0] - lu * u[0], y0 = lin[1] - lu * u[1], z0 = lin[2] - lu * u[2];
      if (st.swh) {
        const px = H[0], py = H[1], pz = H[2];
        H[0] += K.uf * (x0 - px); H[1] += K.uf * (y0 - py); H[2] += K.uf * (z0 - pz);   // lightly smoothed: the sensor's noise would read as speed
        const dx = (H[0] - px) / GK_DT, dy = (H[1] - py) / GK_DT, dz = (H[2] - pz) / GK_DT;
        const cx = py * H[2] - pz * H[1], cy = pz * H[0] - px * H[2], cz = px * H[1] - py * H[0];
        st.swP += K.sw * (H[0] * H[0] + H[1] * H[1] + H[2] * H[2] - st.swP);
        st.swX += K.sw * ((cx * up[0] + cy * up[1] + cz * up[2]) / GK_DT - st.swX);
        st.swD += K.sw * (dx * dx + dy * dy + dz * dz - st.swD);
      } else { H[0] = x0; H[1] = y0; H[2] = z0; st.swh = true; }
      st.swA += K.exc * (H[0] * H[0] + H[1] * H[1] + H[2] * H[2] - st.swA);   // how strong it moves right now (stops count at once)
    } else { st.swh = false; st.swP = st.swX = st.swD = st.swA = 0; }
    const sp = st.swP, wt = sp > 0.01 ? Math.sqrt(st.swD / sp) : 0, wc = sp > 0.01 ? st.swX / sp : 0, fq = wt / (2 * Math.PI);
    st.swC = wt > 0 ? Math.min(1, Math.abs(wc) / wt) : 0;
    let sg = !st.shake && !st.ruhe && fq > 0.4 && fq < 4 ? sm(0.55, 0.8, st.swC) * sm(0.5, 1.2, Math.sqrt(Math.min(sp, st.swA))) : 0;
    st.swT = sg > 0.2 ? st.swT + GK_DT : 0;
    if (st.swT < 0.6) sg = 0;
    st.sw = cl(st.sw * (1 - (1 - sg) * (1 - SWL)) + (sg * GK_DT) / 2.5, 0, 1);
    if (sg > 0.2) { st.swHz += 0.05 * (fq - st.swHz); st.swDir += 0.05 * ((wc < 0 ? 1 : -1) - st.swDir); }
    // Schütteln: at least 3 strong reversals within 600 ms; each swing must last 30 ms (a knock's spike does not), and
    // the threshold sits above the personal handling floor. A swing is a stretch of strong acceleration in ANY
    // direction (an egg shaker is not aligned to the phone: along an axis or diagonally, the same strength counts); it
    // reverses the one before when it points the other way (more than 120° from it – a circle never does)
    const thrS = cl(2.5 * FS.v, 7, 13), tS = st.tI, S = st.sx;
    if (lock) { st.rev.length = 0; S.cv = S.lv = null; S.done = false; }
    else {
      const am = Math.sqrt(la2);
      if (am > thrS) {
        if (!S.cv) { S.cv = lin.slice(); S.dur = 0; S.done = false; S.pk = 0; S.rv = false; S.em = false; }
        S.dur += GK_DT;
        if (am > S.pk) { S.pk = am; S.pkT = tS; S.cv = lin.slice(); }   // the swing's direction: at its top
        if (!S.done && S.dur >= 0.03) {
          S.done = true;
          if (S.lv && dot(S.cv, S.lv) < -0.5 * Math.sqrt(dot(S.cv, S.cv) * dot(S.lv, S.lv))) { st.rev.push({ t: tS, pk: S.pk }); S.rv = true; if (st.shake) st.shLast = tS; }
          S.lv = S.cv.slice();
        }
        if (am < 0.8 * S.pk) top(S, 0, thrS);
      } else { top(S, 0, thrS); if (S.cv && S.done) S.lv = S.cv.slice(); S.cv = null; }
      while (st.rev.length && tS - st.rev[0].t > 600) st.rev.shift();
      if (!st.shake && st.rev.length >= 3) {
        let pk = 0;
        for (const x of st.rev) pk = Math.max(pk, x.pk);
        st.shake = true; st.shLast = tS; st.shPk = pk; evs.push({ type: 'schuetteln', on: true, v: cl(pk / (3 * thrS), 0.1, 1), t: tS });
      }
    }
    if (st.shake && tS - st.shLast > 500) { st.shake = false; evs.push({ type: 'schuetteln', on: false, t: tS }); }
    // Stillness at Ruhe's very tight limits (a hand is never that still): the slow measure for Ruhe, a fast one that
    // knows within 0.2 s that a nudged phone is at rest again
    st.rw2 += K.r * (wr2 - st.rw2); st.ra2 += K.r * (la2 - st.ra2); st.rwF2 += K.rf * (wr2 - st.rwF2); st.raF2 += K.rf * (la2 - st.raF2);
    const rw = Math.sqrt(st.rw2), ra = Math.sqrt(st.ra2), raL = gy ? 0.2 : 0.12;
    const still = (!gy || rw < 0.8) && ra < raL && st.uh.length > 4 && angle(st.uf, st.uh[0]) < 1;   // and not turned in 0.5 s
    st.still = still ? st.still + GK_DT : 0;
    const rest = st.ruhe || st.still >= 0.5;
    // Wenden: screen down – 150° away from the zero pose or facing the floor – for 300 ms, and either flipped on purpose
    // (100° within 1.2 s) or lying still: drifting into it slowly with a trembling hand (lying down to play overhead) is
    // no Wenden. Back below 60° (or facing up). A zero taken with the screen facing down is the player's own pose (lying
    // on your back, phone overhead – a finger on the screen took it): from there only a phone lying still on its face
    // is Wenden, and picking it up ends it. Facing up is never Wenden.
    // (a zero taken facing down is stale once the phone has faced up for a second since: sat up again, no note played)
    const fz = up[2];
    st.zfu = fz > 0.3 ? st.zfu + GK_DT : st.zfu > 0 && st.zfu < 1 ? 0 : st.zfu;
    const zUp = st.z[2] * st.sign > -0.3, stale = !zUp && st.zfu >= 1;
    const down = zUp ? (st.ang > 150 && fz < 0.5) || fz < -0.87 : fz < -0.87 && (rest || stale);
    if (!st.wenden) {
      if (!lock && down) {
        if (!st.wF) for (const h of st.uh2) if (angle(st.uf, h) >= 100) { st.wF = true; break; }
        st.wT += GK_DT;
        if (st.wT >= 0.3 - 1e-9 && (st.wF || rest)) { st.wenden = true; evs.push({ type: 'wenden', on: true, t: tS }); }
      } else { st.wT = 0; st.wF = false; }
    } else if (zUp ? st.ang < 60 || fz > 0.5 : fz > -0.5 || (!rest && !stale)) { st.wenden = false; st.wT = 0; st.wF = false; evs.push({ type: 'wenden', on: false, t: tS }); }
    // Ruhe: lying still for 1.5 s. Picking it up ends it; once the phone settles in a hand in the new pose that becomes
    // the zero – unless it is back where it lay (a nudge) or comes to rest again on its support (a stand, a cushion:
    // the slope stays what it was, so the Sporenregen rains on)
    if (!st.ruhe) {
      if (st.still >= 1.5 - 1e-9) {
        st.ruhe = true; st.rPose = u.slice(); st.pick = 0; evs.push({ type: 'ruhe', on: true, t: tS });
        // "Immer": lying flat is level (the rain goes quiet on the table); Sporenregen resting on a support since its
        // zero was taken (switched on with the iPad on its stand) measures from the flat – its own slope is not level
        if (O.pickZero && !st.wenden) {
          if (isFlat(u)) { if (angle(st.z, u) > 1) { zeroAt(u, 'flat'); evs.push({ type: 'zero', why: 'flat', t: tS }); } }
          else if (O.restFlat && st.zN >= st.n - 210 && angle(st.z, flatU()) > 1) { zeroAt(flatU(), 'rest'); evs.push({ type: 'zero', why: 'rest', t: tS }); }
        }
      }
    } else if ((gy && rw > 10) || ra > 0.6 || angle(u, st.rPose) > 4) {
      st.ruhe = false; st.still = 0; st.pick = 1.5; st.calm = 0; st.tight = 0;
      evs.push({ type: 'ruhe', on: false, t: tS });
    }
    if (st.pick > 0) {
      st.pick -= GK_DT;
      st.calm = (!gy || rw < 25) && ra < 1.2 ? st.calm + GK_DT : 0;
      const tight = (!gy || Math.sqrt(st.rwF2) < 0.8) && Math.sqrt(st.raF2) < raL && (!st.uh.length || angle(st.uf, st.uh[st.uh.length - 1]) < 0.5);
      st.tight = tight ? st.tight + GK_DT : 0;
      if (st.tight >= 0.2) st.pick = 0;   // at rest again on its support: the zero stays
      else if (st.calm >= 0.35 || st.pick <= 0) {
        st.pick = 0;
        if (O.pickZero && !st.wenden && angle(u, st.rPose) > 8) { zeroAt(st.uf, 'pickup'); evs.push({ type: 'zero', why: 'pickup', t: tS }); }
      }
    }
    // the floors learn from 100 ms blocks (not while shaking: a shake is no handling)
    const B = st.B;
    B.lad = Math.max(B.lad, st.exc); B.shk = Math.max(B.shk, Math.sqrt(la2)); B.beb += env;
    if (st.n % 10 === 0) {
      st.uh.push(st.uf.slice()); if (st.uh.length > 5) st.uh.shift();
      st.uh2.push(st.uh[st.uh.length - 1]); if (st.uh2.length > 13) st.uh2.shift();
      if (!st.shake) { FL.push(B.lad); FS.push(B.shk); }
      FB.push(B.beb / 10);
      B.lad = B.shk = B.beb = 0;
    }
    if (st.n % 100 === 0) { FL.calc(); FS.calc(); FB.calc(); }
  }
  // a fresh start after a gap (screen off, app in the background) or a turned screen: the filters begin again from
  // the next value, what holds over time (Ladung, Drehen) decays for as long as the gap was
  function restart(gap) {
    st.prev = st.pp = null; st.gl = null; st.uf = null; st.uh.length = 0; st.uh2.length = 0;
    E.roll.reset(null); E.pitch.reset(null);
    st.bh0 = st.bx0 = st.bh = st.bx = st.bl = st.bang = st.benv = st.bg = st.henv = 0;
    st.rev.length = 0; st.sx.cv = st.sx.lv = null;
    st.still = 0; st.wT = 0; st.wF = false;
    st.swh = false; st.swP = st.swX = st.swD = st.swA = 0; st.swT = 0;
    if (gap > 0) { st.lad *= Math.exp(-gap / 1000 / TE); st.drh *= Math.exp(-gap / 1000); st.sw *= Math.exp(-gap / 4000); }
  }
  function push(s) {
    evs = [];
    const inc = s && vec(s.g);
    if (!inc || !Number.isFinite(s.t)) return { t: st.tI, axes: Object.assign({}, AX), events: evs, state: st };
    const ang = Number(s.orient) || 0, la0 = vec(s.a), og = vec(s.og);
    st.g0 = la0 ? [inc[0] - la0[0], inc[1] - la0[1], inc[2] - la0[2]] : inc; st.g0t = s.t;   // gravity in the device's own axes
    if (og) ogVote(og);
    const cur = { t: s.t, inc: scr(inc, ang), la: scr(la0, ang), r: scr(vec(s.r), ang), lock: !!s.lock };
    st.bass = Number(s.bass) || 0;
    let rz = false;
    if (st.orient != null && ang !== st.orient) {
      // the screen turned: the zero (and the Ruhe pose) in the new axes – exactly the same pose. Held in a hand with the
      // screen up, the new view is a new way to hold it: a new zero there (below). Face down it is not (Android turns
      // the view after the phone already lies on its face): the frame is only carried over.
      turnFrame(ang - st.orient); restart(0);
      const g0 = cur.la ? [cur.inc[0] - cur.la[0], cur.inc[1] - cur.la[1], cur.inc[2] - cur.la[2]] : cur.inc, u0 = nrm(g0);
      rz = !!u0 && !st.wenden && u0[2] * st.sign >= 0;
    }
    st.orient = ang;
    const a = st.prev;
    if (a && !a.dup && cur.t - a.t < 40 && same(a, cur)) { a.dup = true; return { t: st.tI, axes: Object.assign({}, AX), events: evs, state: st }; }
    if (!a || cur.t - a.t > 150) {   // the first sample, or one after a gap
      if (a) restart(cur.t - a.t);
      st.prev = cur; st.tI = Math.floor(cur.t / 10) * 10;   // on the 10 ms grid, so runs compare step by step
      if (rz) zeroAt(nrm(cur.la ? [cur.inc[0] - cur.la[0], cur.inc[1] - cur.la[1], cur.inc[2] - cur.la[2]] : cur.inc), 'orient');
      step(cur.inc, cur.la, cur.r, cur.lock, st.bass);
      if (O.onStep) O.onStep(st.tI, AX, st);
    } else if (cur.t <= a.t) st.prev = Object.assign(cur, { t: a.t });   // the same instant again: the newest wins
    else {
      const span = cur.t - a.t, p = a.dup && st.pp && a.t - st.pp.t < 40 && a.t - st.pp.t > 2 ? st.pp : null;
      while (st.tI + 10 <= cur.t) {
        st.tI += 10;
        const k = (st.tI - a.t) / span;
        if (p) step(quad(p, a, cur, st.tI, 'inc'), quad(p, a, cur, st.tI, 'la'), quad(p, a, cur, st.tI, 'r'), a.lock || cur.lock, st.bass);
        else step(lerp(a.inc, cur.inc, k), lerp(a.la, cur.la, k), lerp(a.r, cur.r, k), a.lock || cur.lock, st.bass);
        if (O.onStep) O.onStep(st.tI, AX, st);
      }
      st.pp = a; st.prev = cur;
    }
    if (rz) evs.push({ type: 'zero', why: 'orient', t: st.tI });
    return { t: st.tI, axes: Object.assign({}, AX), events: evs, state: st };
  }
  return {
    push, st, opts: O, shape,
    set: setO,
    // a new zero pose: the current one (lightly smoothed, so the jolt of a tap is not it). Not while Wenden – a key
    // played over a phone lying on its face must leave it asleep – unless a finger on the screen of a phone held in the
    // hand asks (hand): the screen faces the player then, whatever gravity says (lying on your back, phone overhead) –
    // that ends Wenden. restFlat (Sporenregen): resting on a support, the flat is level, not the support's slope.
    zero(hand, restFlat) {
      if (!st.uf) return false;
      const rest = st.ruhe || st.still >= 0.5;
      if (st.wenden && (!hand || rest)) return false;
      // a key or a pad never takes a face-down zero: played during the flip it would follow the phone over, and a phone
      // held on its face would then never sleep (only a finger on the screen says "I play it overhead")
      if (!hand && st.uf[2] * st.sign < -0.3) return false;
      if (restFlat && rest && !isFlat(st.uf)) zeroAt(flatU(), 'rest'); else zeroAt(st.uf, hand ? 'hand' : 'manual');
      if (st.wenden) { st.wenden = false; st.wT = 0; st.wF = false; }
      return true;
    },
    restart() { restart(0); },
    // a deviceorientation event between motion samples: one more vote on the sign (with the last sample's gravity, if
    // it is fresh) – returns the 'sign' event when the sign turned
    ori(og, t) {
      evs = [];
      if (st.g0 && vec(og) && Math.abs(t - st.g0t) < 150) ogVote(og);
      return evs;
    },
  };
}
// Devices that only report deviceorientation: beta/gamma give the gravity vector (spec sign, m/s²), alpha is not needed
function gkOriG(beta, gamma) {
  const b = (beta * Math.PI) / 180, c = (gamma * Math.PI) / 180;
  return [-9.81 * Math.cos(b) * Math.sin(c), 9.81 * Math.sin(b), 9.81 * Math.cos(b) * Math.cos(c)];
}
/* GK-PURE-END */

