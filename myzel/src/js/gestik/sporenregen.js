/* ---------- Sporenregen: deine Töne werden Gelände ---------- */
// "Neigen formt: Sporenregen". Every note played – a finger on the field, a key of the computer, a MIDI or Bluetooth
// keyboard, the X-Y pad; the Puls's notes only with "Puls sät mit" – leaves a glowing Keim where it sounds on the field:
// a held note's while it sounds, a played one's for 2, 4 or 8 bars more. Tilting rolls 8–16 spores downhill over the
// field, and a spore running into a Keim plays its note with a strike of its own (Tropfen, Kalimba, Glocke, Schale,
// Membran, Saite): leaning right they cascade up through your notes, left down, toward you they fall through the Höhe
// (the strikes brighter or darker); steeper is faster and denser; level again they slow down and settle in hollows –
// silence. Hold a chord on a keyboard and lean: it arpeggiates the way you lean.
// Timing: the simulation runs in the scheduler (every 25 ms, in steps of 10 ms) up to its horizon, ahead of what sounds.
// A spore that reaches a Keim there is a hit PREDICTED for a moment still to come: it lands, waits (dimmed) and pops
// exactly on the next point of the grid – 1/16 up to 100 BPM, 1/8 above, or 1/8, 1/16, 1/8T, frei – its strike
// scheduled before it is due, so neither the sensor's delay nor a stalling page moves it. The grid is the Puls's (its
// swing included); while the Puls stands, its clock runs on. Limits: one hit per Keim and grid point, three per grid
// point, about twelve a second, and the voices – the rain makes room only from its own strikes, never from a held note.
// The slope reaches the rain through the mod layer (targets "Sporenregen: Neigung ↔ / ↕"): the Fährte records it and
// plays it back – the rain plays itself – and any control can lean it (a knob, the X-Y pad, the dragged Wasserwaage on
// a computer). Sporenregen needs no clutch: the pose when it is chosen is level, a double tap on the Wasserwaage sets it
// anew, and leaned against a stand it keeps raining (Ruhe does not stop it). Ladung's shaking sprinkles new spores,
// Schlafen lets them seep away while the sound freezes. "Harfe": a quarter of the spores, and every column they cross
// plays its note – a glissando through the scale. The strikes play on a channel of their own in the mixer, "Regen".
// The picture: Keime glow where the notes were, the spores are drawn where they are at the moment that sounds, each
// strike blooms; the Geflecht's own spores follow the slope instead of rising and its hyphae lean with it.
const RG_SMAX = 24, RG_KMAX = 24, RG_VMAX = 8, RG_HPS = 12, RG_PER = 3, RG_DT = 0.01, RG_RV = 0.11, RG_COL = '#ee82d9', RG_HUE = 308;
// t: how far the simulation ran (audio time); sp: the spores { u, v (across the field 0 … 1, up 0 … 1), vu, vv, d (its
// drag), nu, nv (its wander), in (the Keime it is inside), col (Harfe: its column), w (landed: { tg, vu, vv }), wl (when it
// waited), x (sprinkled: gone at that time), h (where it was at the end of each tick: [t, u, v, wrapped at]) };
// k: Keime { id, tt (the note while held), u, v, f, hue, w (its velocity), t0 (from when), end (until which beat; null
// while held), g (the grid point it last sounded on), hitT }; vs: the rain's voices; bk: strikes booked [time, key];
// log: the last strikes; n: how many so far; fade: the spores seep away asleep; ps: "Puls sät mit" acts; gx, gy: the
// slope as the picture shows it
// pq: strikes booked but not yet handed to the engine (their grid point beyond the scheduler's horizon – a tempo change
// or a clock still moves them); hz: this tick's horizon; mute: catching up after a stall, in silence; lk, lkT: the Keim
// struck last and when (the arpeggio's order)
const RG = { on: false, t: 0, sp: [], sn: 0, k: [], kn: 0, vs: [], bk: [], pq: [], hz: 0, mute: false, lk: null, lkT: -9, log: [], n: 0, fade: 1, ps: false, gx: 0, gy: 0, spr: {} };
const rgOn = () => GK.on && GK.p.neigen === 'regen';
const rgName = () => (RG_S.find((x) => x[0] === GK.p.rgS) || RG_S[0])[1];
// a Keim's zone: an ellipse about a column wide and ±0.11 of the field high
const rgRu = () => clamp(0.42 / Math.max(1, N.free ? 12 * P['t.range'] + 1 : N.notes.length), 0.012, 0.08);
const rgCol = (u) => noteAt(clamp(u, 0, 0.9999)).idx;
// Zähigkeit: from ice (fast, slow to settle) to honey (slow, at once at its speed); Ordnung: grooves that lead the spores
// along your Keime, and less wander
function rgPhys() {
  const z = GK.p.rgZ, o = GK.p.rgO, vmax = 1.1 - 0.8 * z, k = 1.5 + 5 * z;
  return { vmax, k, G: vmax * k, nz: (1 - o) * 0.7 * vmax * k, gr: 8 * o * vmax * k, hol: 0.06 * vmax * k, ru: rgRu(), cols: N.free ? 12 * P['t.range'] + 1 : N.notes.length, vmin2: 0.04 * 0.04 };
}
// the slope (its targets on the mod layer, so a Fährte or a control leans it too)
gkRoute('regen.x', { axis: 'tiltX', target: 'rgx', on: rgOn });
gkRoute('regen.y', { axis: 'tiltY', target: 'rgy', on: rgOn });
// a spore resting somewhere on the field (x: sprinkled – gone at that time)
function rgSpawn(t, x) {
  const s = { id: ++RG.sn, lap: 0, u: Math.random(), v: 0.06 + 0.88 * Math.random(), vu: 0, vv: 0, d: 1 + (1 - GK.p.rgO) * 0.8 * (Math.random() - 0.5), nu: 0, nv: 0, in: [], col: -1, w: null, wl: [], x: x || 0, h: [], j: 0 };
  s.col = rgCol(s.u);
  s.h.push([t, s.u, s.v, 0]);
  return s;
}
function rgStart(now) {
  Object.assign(RG, { on: true, t: now, sp: [], k: [], bk: [], pq: [], fade: 1 });
  VIS.rg = true;
  for (const tt of touches.values()) rgNote(tt, true);   // notes already sounding count
  if (GK.p.rgS === 'sai') warmKS();
}
function rgStop() {
  Object.assign(RG, { on: false, sp: [], k: [], bk: [], pq: [], ps: false, gx: 0, gy: 0 });
  VIS.rg = false; VIS.lx = VIS.ly = 0;
}
// "Stille": the Keime are gone (the strikes with every voice), the spores stay
function rgPanic() {
  RG.k = []; RG.bk = []; RG.pq = []; RG.vs = [];
  for (const s of RG.sp) { s.in.length = 0; s.w = null; }
}
// Keime: a note started (held: it stays while it sounds) or ended (from now its bars run)
function rgNote(tt, down) {
  if (!A.ctx) return;
  if (down) rgSeed({ tt, u: clamp(tt.x, 0, 1), v: clamp(tt.y, 0, 1), f: tt.f, t0: A.ctx.currentTime, end: null, hue: tt.hue, w: noteVel(tt) });
  else for (const k of RG.k) if (k.tt === tt) rgLet(k);
}
function rgLet(k) { k.tt = null; k.end = beatAt(A.ctx.currentTime) + 4 * GK.p.rgK; }
// a Puls note (with "Puls sät mit"): a Keim from the moment it sounds
function rgPuls(t, f, x, y) { rgSeed({ tt: null, u: clamp(x, 0, 1), v: clamp(y, 0, 1), f, t0: t, end: beatAt(t) + 4 * GK.p.rgK, hue: VIS.hueAt(x), w: 0.7 }); }
function rgSeed(o) {
  const ru = rgRu();
  // the same note again (its column, about its height): that Keim takes it – none beside it
  let k = RG.k.find((x) => !x.tt && Math.abs(x.u - o.u) < ru && Math.abs(x.v - o.v) < RG_RV);
  if (k) { Object.assign(k, o); return k; }
  k = Object.assign({ id: ++RG.kn, g: -1, hitT: -9 }, o);
  RG.k.push(k);
  while (RG.k.length > RG_KMAX) { const i = RG.k.findIndex((x) => !x.tt); rgDrop(i < 0 ? 0 : i); }
  return k;
}
function rgDrop(i) {
  const id = RG.k[i].id;
  RG.k.splice(i, 1);
  for (const s of RG.sp) { const j = s.in.indexOf(id); if (j >= 0) s.in.splice(j, 1); }
}
// Shaking (Ladung) sprinkles new spores – for 8 s, up to 24 in all
function rgSprinkle(v) {
  const ph = rgPhys(), n = 1 + Math.round(2 * clamp(v, 0, 1));
  for (let i = 0; i < n && RG.sp.length < RG_SMAX; i++) {
    const s = rgSpawn(RG.t, RG.t + 8), a = Math.random() * 2 * Math.PI;
    s.vu = Math.cos(a) * 0.4 * ph.vmax; s.vv = Math.sin(a) * 0.4 * ph.vmax;
    RG.sp.push(s);
    visPush({ t: A.ctx.currentTime, kind: 'hit', x: s.u, y: s.v, s: 0.25, hue: RG_HUE, n: 3 });
  }
}
// The scheduler's part (every 25 ms): the Keime, the spores' number, then the simulation up to the horizon
function rgTick(horizon) {
  if (!rgOn() || !A.started) { if (RG.on) rgStop(); return; }
  const now = A.ctx.currentTime;
  if (!RG.on) rgStart(now);
  RG.ps = GK.p.rgP;
  if (RG.t < now - 0.25 || RG.t > now + 1) { RG.t = now; RG.pq = []; for (const s of RG.sp) s.w = null; }   // after a long stall: on from now
  const b = beatAt(RG.t), harfe = GK.p.rgArt === 'harfe';
  for (let i = RG.k.length - 1; i >= 0; i--) {
    const k = RG.k[i];
    if (k.tt) { if (touches.get(k.tt.id) === k.tt) { k.u = clamp(k.tt.x, 0, 1); k.v = clamp(k.tt.y, 0, 1); k.f = k.tt.f; } else rgLet(k); }   // it follows a sliding finger
    if (k.end != null && b >= k.end) rgDrop(i);
  }
  // asleep the spores seep away within 2 s; awake they come back
  const sleep = SLP.on;
  RG.fade = clamp(RG.fade + ((sleep ? -1 : 1) * Math.max(0, horizon - RG.t)) / 2, 0, 1);
  if (sleep && RG.fade <= 0) RG.sp.length = 0;
  if (RG.sp.some((s) => s.x && s.x <= RG.t)) RG.sp = RG.sp.filter((s) => !s.x || s.x > RG.t);   // sprinkled ones whose time ran out
  if (!sleep) {   // as many as set (Harfe: a quarter)
    const want = harfe ? Math.max(2, Math.round(GK.p.rgN / 4)) : GK.p.rgN;
    let base = 0;
    for (const s of RG.sp) if (!s.x) base++;
    for (; base < want; base++) RG.sp.push(rgSpawn(RG.t));
    for (let i = RG.sp.length - 1; i >= 0 && base > want; i--) if (!RG.sp[i].x) { RG.sp.splice(i, 1); base--; }
  }
  const ph = rgPhys();
  for (const s of RG.sp) { s.nu = 0.85 * s.nu + 0.3 * (Math.random() - 0.5); s.nv = 0.85 * s.nv + 0.3 * (Math.random() - 0.5); }
  if (ph.gr && !harfe) rgGroove(ph);
  rgQueue(now, horizon);
  let t = RG.t;
  // after a short stall the simulation is behind the clock: on to now in silence (a hit there would sound late,
  // bunched and off the grid), then ahead with strikes
  if (t < now) { RG.mute = true; while (t < now - 1e-9) { const dt = Math.min(RG_DT, now - t); rgStep(t, dt, ph, harfe); t += dt; } RG.mute = false; }
  RG.hz = horizon;
  while (t < horizon - 1e-9) { const dt = Math.min(RG_DT, horizon - t); rgStep(t, dt, ph, harfe); t += dt; }
  RG.t = t;
  for (const s of RG.sp) { s.h.push([t, s.u, s.v, s.j]); s.j = 0; while (s.h.length > 2 && s.h[1][0] < now - 0.05) s.h.shift(); }
  if (RG.bk.length && RG.bk[0].tg < now - 1.1) RG.bk = RG.bk.filter((x) => x.tg > now - 1.1 || RG.pq.includes(x));
}
// Ordnung's grooves: the Keim each spore is led toward – the nearest one ahead of it across the fall line (chosen once
// a tick; the steps pull toward it)
function rgGroove(ph) {
  const gx = modVal('rgx', RG.t), gy = modVal('rgy', RG.t), gm = Math.hypot(gx, gy);
  for (const s of RG.sp) {
    s.gk = null;
    if (gm < 0.04) continue;
    const ex = gx / gm, ey = gy / gm;
    let bs = 1e9;
    for (const k of RG.k) {
      const du = k.u - s.u, dv = k.v - s.v, par = du * ex + dv * ey, per = du * -ey + dv * ex;
      if (par < -ph.ru || Math.abs(per) > 0.3) continue;
      const sc = Math.abs(per) + 0.15 * Math.abs(par);
      if (sc < bs) { bs = sc; s.gk = k; }
    }
  }
}
// one step of dt: the slope, the grooves, the wander and the hollows push; the drag holds back; out at the foot of the
// slope, in again at its head (it keeps raining); entering a Keim (Harfe: a column) is a hit
function rgStep(t, dt, ph, harfe) {
  const t1 = t + dt, gx = modVal('rgx', t1), gy = modVal('rgy', t1), gm = Math.hypot(gx, gy);
  const ex = gm > 1e-6 ? gx / gm : 0, ey = gm > 1e-6 ? gy / gm : 0, ru = ph.ru, cols = ph.cols, TAU = 2 * Math.PI;
  for (const s of RG.sp) {
    if (s.w) { if (t1 < s.w.b.tg) continue; s.vu = s.w.vu; s.vv = s.w.vv; s.w = null; }   // its grid point (where its strike went): on it rolls
    let au = ph.G * gx - ph.hol * Math.sin(TAU * s.u * cols), av = ph.G * gy - ph.hol * Math.sin(TAU * (s.v - 0.125) * 4);
    if (gm > 0.04) {
      au += ph.nz * gm * s.nu; av += ph.nz * gm * s.nv;
      const gk = s.gk;
      if (gk && !harfe && gk.t0 <= t1) {   // the groove toward its Keim, across the fall line
        const per = (gk.u - s.u) * -ey + (gk.v - s.v) * ex;
        if (Math.abs(per) < 0.3) { au += ph.gr * gm * per * -ey; av += ph.gr * gm * per * ex; }
      }
    }
    const k = ph.k * s.d * (gm < 0.04 && s.vu * s.vu + s.vv * s.vv < 4e-4 ? 4 : 1);   // nearly still on the level: it settles
    s.vu += (au - k * s.vu) * dt; s.vv += (av - k * s.vv) * dt;
    const u0 = s.u, v0 = s.v;
    s.u += s.vu * dt; s.v += s.vv * dt;
    let wr = false;
    if (s.u < 0 || s.u >= 1) { s.u -= Math.floor(s.u); wr = true; s.v = clamp(s.v + (1 - GK.p.rgO) * 0.3 * (Math.random() - 0.5), 0.02, 0.98); }
    if (s.v < 0 || s.v >= 1) { s.v -= Math.floor(s.v); wr = true; s.u = clamp(s.u + (1 - GK.p.rgO) * 0.3 * (Math.random() - 0.5), 0, 0.9999); }
    const sp2 = s.vu * s.vu + s.vv * s.vv;
    if (wr) { s.in.length = 0; s.j = t1; s.lap++; s.col = rgCol(s.u); continue; }
    if (harfe) {
      const c = rgCol(s.u);
      if (c !== s.col) { const was = s.col; s.col = c; if (was >= 0 && sp2 >= ph.vmin2 && N.notes[c]) rgHit(s, t1, 'c' + c, N.notes[c].f, s.v, null, ph); }
      continue;
    }
    let done = false;
    for (const kk of RG.k) {
      if (kk.t0 > t1) continue;
      const du = (s.u - kk.u) / ru, dv = (s.v - kk.v) / RG_RV, inside = du * du + dv * dv < 1, j = s.in.indexOf(kk.id);
      if (inside === (j >= 0)) continue;
      if (!inside) { s.in.splice(j, 1); continue; }
      s.in.push(kk.id);
      if (done || sp2 < ph.vmin2) continue;
      // when within the step it crossed into the zone (the ellipse's measure before and after, linearly)
      const pu = (u0 - kk.u) / ru, pv = (v0 - kk.v) / RG_RV, q0 = pu * pu + pv * pv, q1 = du * du + dv * dv;
      done = rgHit(s, q0 > 1 ? t + (dt * (q0 - 1)) / (q0 - q1) : t1, kk.id, kk.f, kk.v, kk, ph);
    }
  }
}
// the grid: 1/16 up to 100 BPM, 1/8 above (Auto), or as chosen; 0 = frei
function rgDiv() {
  const q = GK.p.rgQ;
  return q === 'frei' ? 0 : q === '8' ? 0.5 : q === '16' ? 0.25 : q === '8t' ? 1 / 3 : (SEQ.on ? SEQ.bpm : seqBpm()) <= 100 ? 0.25 : 0.5;
}
// Grid point n (of d beats) on the Puls's clock: the odd steps of a straight grid swung as the Puls swings a lane of
// that division; 1/32 sits on the swung 1/16 and halfway between (so a Rassel at 1/32 never flams against the Puls)
function rgAt(n, d) {
  if (d === 0.125) { const m = Math.floor(n / 2), a = rgAt(m, 0.25); return n % 2 === 0 ? a : (a + rgAt(m + 1, 0.25)) / 2; }
  return timeAt(n * d) + (d !== 1 / 3 && Math.abs(n % 2) === 1 ? (P['seq.swing'] * d * 30) / SEQ.bpm : 0);
}
// the first grid point at or after te
function rgNext(te, d) {
  let n = Math.ceil(beatAt(te) / d - 1e-9) - 1;
  while (rgAt(n, d) < te - 1e-9) n++;
  return n;
}
const rgRate = (t) => { let c = 0; for (const b of RG.bk) if (b.tg > t - 1 && b.tg <= t) c++; return c >= RG_HPS; };
// A strike for a hit at te: the next free grid point (at most two further on), never one already due – or none.
// Booked as a grid point (n of d), not as a time: until it is handed to the engine it follows the clock.
function rgBook(te, key) {
  const d = rgDiv(), now = A.ctx.currentTime;
  if (!d) {   // frei: at the hit itself; a Keim at most every 90 ms
    if (te < now + 0.003) return null;
    let near = 0;
    for (const b of RG.bk) { if (b.key === key && Math.abs(b.tg - te) < 0.09) return null; if (Math.abs(b.tg - te) < 0.01) near++; }
    if (near >= RG_PER || rgRate(te)) return null;
    const b = { tg: te, key, n: 0, d: 0 };
    RG.bk.push(b);
    return b;
  }
  let n = rgNext(Math.max(te, now + 0.005), d);
  for (let i = 0; i < 3; i++, n++) {
    const tg = rgAt(n, d);
    let same = 0, mine = false;
    for (const b of RG.bk) if (Math.abs(b.tg - tg) < 1e-4) { same++; if (b.key === key) mine = true; }
    if (mine || same >= RG_PER || rgRate(tg)) continue;
    const b = { tg, key, n, d };
    RG.bk.push(b);
    return b;
  }
  return null;
}
function rgHit(s, te, key, f, y, k, ph) {
  if (RG.mute || SLP.on || RG.fade < 1 || !(f > 0) || !A.ctx || A.ctx.state !== 'running') return false;
  if (k && !rgNextK(k, te)) return false;   // out of the arpeggio's order: this spore rolls through silently
  const b = rgBook(te, key);
  if (!b) return false;
  if (k) { RG.lk = k; RG.lkT = te; }
  const vel = (0.22 + 0.58 * clamp(Math.sqrt(s.vu * s.vu + s.vv * s.vv) / ph.vmax, 0, 1)) * (k ? 0.65 + 0.35 * clamp(k.w, 0, 1) : 0.85);
  Object.assign(b, { te, f, y, vel, pan: clamp((s.u - 0.5) * 1.2, -0.8, 0.8), k, x: s.u, v: s.v, s: s.id, lap: s.lap });
  if (b.tg <= RG.hz) { if (!rgFire(b)) return false; }   // due within this tick: to the engine now
  else RG.pq.push(b);   // further ahead: when the scheduler reaches it, at its grid point then
  // the strike takes some of its momentum; until its grid point it waits where it landed
  const vu = s.vu * 0.6, vv = s.vv * 0.6;
  if (b.tg > te + 1e-4) { s.w = { b, vu, vv }; s.vu = s.vv = 0; s.wl.push([te, b.tg]); if (s.wl.length > 4) s.wl.shift(); }
  else { s.vu = vu; s.vv = vv; }
  return true;
}
// The arpeggio: 8–16 spores roll at their own phases, so what they strike, merged, would come in any order. With
// Ordnung (from a quarter up) the heard strikes follow the fall line: after a Keim only the next one downhill (in
// the slope's direction, round again from the first) may sound – lean right and a held chord climbs, left it falls.
// Nothing struck for a while (no spore where the next one is): any may start it again.
function rgNextK(k, te) {
  if (GK.p.rgO < 0.25 || RG.k.length < 2) return true;
  const gx = modVal('rgx', te), gy = modVal('rgy', te), gm = Math.hypot(gx, gy), L = RG.lk;
  if (gm < 0.04 || !L || !RG.k.includes(L) || te - RG.lkT > Math.max(0.4, 2.5 * (rgDiv() || 0.25) * 60 / SEQ.bpm)) return true;
  const ex = gx / gm, ey = gy / gm, pr = (q) => q.u * ex + q.v * ey, pl = pr(L);
  let nx = null, lo = null;
  for (const q of RG.k) {
    if (q === L || q.t0 > te) continue;
    const pq = pr(q);
    if (pq > pl + 1e-6 && (!nx || pq < pr(nx))) nx = q;
    if (!lo || pq < pr(lo)) lo = q;
  }
  return k === (nx || lo || L);
}
// a booked strike to the engine (its booking goes when there is no voice for it)
function rgFire(b) {
  if (!rgStrike(b.tg, b.f, b.y, b.vel, b.pan, !!(b.k && b.k.hx))) { const i = RG.bk.indexOf(b); if (i >= 0) RG.bk.splice(i, 1); return false; }   // Hexenring: (step 4) a Keim a Schleife planted sounds on its way
  RG.n++;
  RG.log.push({ te: b.te, t: b.tg, key: b.key, f: b.f, y: b.y, vel: b.vel, u: b.x, v: b.v, s: b.s, lap: b.lap });
  if (RG.log.length > 64) RG.log.shift();
  const k = b.k;
  if (k) { k.hitT = b.tg; k.g = b.tg; }
  visPush({ t: b.tg, kind: 'hit', x: b.x, y: k ? k.v : b.v, s: 0.3 + 0.4 * b.vel, hue: k ? k.hue : VIS.hueAt(b.x), n: 4 });   // a brief bloom (the Keim glows up too)
  return true;
}
// Each tick the booked strikes follow the clock – a tempo change, an external clock nudging it, the Puls starting:
// their grid point's time now; one the clock moved into the past takes the next one. Those due within the horizon go
// to the engine.
function rgQueue(now, horizon) {
  if (!RG.pq.length) return;
  const keep = [], d0 = rgDiv();
  for (const b of RG.pq) {
    if (b.d !== d0) {   // the grid was changed meanwhile: onto the new one ("frei": at the hit itself)
      b.d = d0;
      if (!d0) { b.tg = b.te; if (b.tg < now + 0.003) { b.tg = -1; continue; } }
      else b.n = rgNext(Math.max(b.te, now + 0.005), d0);
    }
    if (b.d) { b.tg = rgAt(b.n, b.d); if (b.tg < now + 0.005) { b.n = rgNext(now + 0.005, b.d); b.tg = rgAt(b.n, b.d); } }
    if (b.tg <= horizon) { if (!rgFire(b)) b.tg = -1; }   // (a spore waiting for it rolls on)
    else keep.push(b);
  }
  RG.pq = keep;
}
// The Puls started (its count begins at beat 0 again: the Taktgeber's origin moved by d beats): what counts in its
// beats – the Keime's bars, the booked grid points – carried over to the new count, so nothing jumps
function rgRebase(d) {
  if (!RG.on || !d) return;
  for (const k of RG.k) if (k.end != null) k.end -= d;
  for (const b of RG.pq) if (b.d) { b.n = rgNext(b.tg - 1e-6, b.d); b.tg = rgAt(b.n, b.d); }
}
// the strike, on the "Regen" channel: room only from the rain's own (at most 8 ring at once), never a held note's
function rgStrike(t, f, y, vel, pan, hx) {
  const eng = GK.p.rgS, cost = Q.cost[eng] || 1, full = () => A.voices.size >= MAXV || voiceLoad() + cost > VBUDGET;
  RG.vs = RG.vs.filter((v) => v.alive && A.voices.has(v));
  while (RG.vs.length && (RG.vs.length >= RG_VMAX || full())) { const v = RG.vs.shift(); vFade(v); A.voices.delete(v); }
  // then a fading tail – never a held note: a running Puls keeps the budget full of ringing ones (Kalimbatraum's recipe
  // rained once and fell silent)
  while (full() && steal(true, true));
  if (full()) return false;
  let vo = null;
  try { vo = hit(eng, t, f, y, vel, hx ? { pan, bus: hxFeedBus(), loop: true, hxSrc: 'hxr' } : { pan, bus: stripIn('rgn') }); } catch (e) { console.error(e); }   // never the scheduler's tick with it   // Hexenring: (step 4) a Schleife's Keim – nothing of it is re-captured
  if (!vo) return false;
  RG.vs.push(vo);
  if (!hx) noteEvent(t);   // an armed recording starts with the rain as with any note
  return true;
}
// every Gestik update: shaking sprinkles; Gestik switched off ends the rain
function rgSub(out, raw, evs) {
  if (raw === GK_ZERO) { if (RG.on) rgStop(); return; }
  if (!RG.on || !ladOn() || SLP.on) return;
  for (const e of evs) if (e.type === 'peak') rgSprinkle(e.v);
}
gkSub(rgSub);
gkSub((out, raw, evs) => { if (raw === GK_ZERO || SLP.on || !A.ctx) return; for (const e of evs) if (e.type === 'peak') wkShake(e); });
// where a spore is at audio time t (between the ends of two ticks; not across a wrap): [u, v] or null
function rgPos(s, t) {
  const H = s.h;
  if (!H.length) return null;
  let i = 0;
  while (i < H.length - 1 && H[i + 1][0] <= t) i++;
  const a = H[i], b = H[i + 1];
  if (!b || t <= a[0]) return a;
  if (b[3]) return t < b[3] ? a : b;
  const x = (t - a[0]) / (b[0] - a[0]);
  RG.pp[1] = a[1] + (b[1] - a[1]) * x; RG.pp[2] = a[2] + (b[2] - a[2]) * x;
  return RG.pp;
}
RG.pp = [0, 0, 0, 0];
// a soft light per hue (in steps of 15°) and size, pre-rendered at the size it is drawn: a plain copy on a weak phone
function rgSpr(hue, sz) {
  const i = ((Math.round(hue / 15) % 24) + 24) % 24, key = i * 100 + sz;
  let g = RG.spr[key];
  if (g) return g;
  g = document.createElement('canvas'); g.width = g.height = sz;
  const c = g.getContext('2d'), m = sz / 2, r = c.createRadialGradient(m, m, 0, m, m, m), hh = i * 15;
  r.addColorStop(0, 'hsla(' + hh + ',90%,78%,0.95)'); r.addColorStop(0.28, 'hsla(' + hh + ',90%,66%,0.4)'); r.addColorStop(1, 'hsla(' + hh + ',90%,60%,0)');
  c.fillStyle = r; c.fillRect(0, 0, sz, sz);
  return (RG.spr[key] = g);
}
// once a frame while it rains: the slope as it sounds now (the hyphae lean with it), the Keime, the spores where they
// are at the moment that sounds – landed ones dimmed until they pop
function rgVisFrame(c, w, h) {
  if (!RG.on) { VIS.rg = false; VIS.lx = VIS.ly = 0; return; }
  const now = A.ctx ? A.ctx.currentTime : 0, b = beatAt(now);
  RG.gx += (modVal('rgx', now) - RG.gx) * 0.2; RG.gy += (modVal('rgy', now) - RG.gy) * 0.2;
  VIS.lx = REDUCED ? 0 : RG.gx * 0.6; VIS.ly = REDUCED ? 0 : -RG.gy * 0.6;
  const odd = (RG.fr = (RG.fr || 0) + (VIS.k || 1)) & 1;   // (two steps a drawn frame in the Handy-Modus under load: every Keim each drawn frame)
  for (const k of RG.k) {
    if (k.t0 > now) continue;
    const left = k.end == null ? 1 : clamp((k.end - b) / 4, 0, 1), age = now - k.hitT, lit = age >= 0 && age < 0.35 ? 1 - age / 0.35 : 0;
    if (!lit && odd) continue;   // a resting Keim every other frame: the canvas's trail holds its glow (alpha doubled)
    const sz = lit ? 24 + Math.round(28 * lit) * 2 : k.tt ? 28 : 24, x = Math.round(k.u * w - sz / 2), y = Math.round((1 - k.v) * h - sz / 2);
    c.globalAlpha = Math.min(1, (lit ? 0.3 + 0.55 * lit : 0.55) * (k.tt ? 1 : 0.35 + 0.65 * left));
    if (lit) c.drawImage(rgSpr(k.hue, 32), x, y, sz, sz); else c.drawImage(rgSpr(k.hue, sz), x, y);   // (struck: it blooms)
  }
  const spr = rgSpr(RG_HUE, 12);
  for (const s of RG.sp) {
    const p = rgPos(s, now);
    if (!p) continue;
    let wait = false;
    for (const q of s.wl) if (now >= q[0] && now < q[1]) wait = true;
    c.globalAlpha = (wait ? 0.3 : 0.9) * RG.fade * (s.x ? clamp((s.x - now) / 1.5, 0, 1) : 1);
    c.drawImage(spr, Math.round(p[1] * w) - 6, Math.round((1 - p[2]) * h) - 6);
  }
  c.globalAlpha = 1;
}
// the Geflecht's own spores while it rains: they follow the slope (asleep they sink to the ground)
function rgSpore(s) {
  if (REDUCED) return;
  if (VIS.zz) { if (s.y < 0.995) s.y = Math.min(0.995, s.y + s.v * 0.35); return; }
  s.x += s.v * 4 * RG.gx; s.y -= s.v * 4 * RG.gy;
  if (s.x < -0.02) s.x = 1.02; else if (s.x > 1.02) s.x = -0.02;
  if (s.y < -0.02) s.y = 1.02; else if (s.y > 1.02) s.y = -0.02;
}
// the mixer's "Regen" (its Fruchtkörper: Quelle): what rains, the strike, the way to the settings
function rgQuelle() {
  const txt = h('p', { class: 'note' });
  const ch = kqRow(kqTarget('rgS'), { id: 'mxd-kq-rgS', label: 'Anschlag', where: 'Kanal Regen' });
  const go = h('button', { type: 'button', class: 'btn ghost mxd-link', onclick: () => gkIcoTap() }, 'Sporenregen in Gestik einstellen ›');
  const el = h('div', { class: 'mxd-qbody', 'data-k': 'rgn' }, txt, ch, go);
  el.sync = () => {
    ch.sync();
    const t = rgOn() ? 'Der Sporenregen spielt deine Töne mit ' + rgName() + (GK.p.rgArt === 'harfe' ? ' – als Harfe über die Spalten.' : ', wenn eine Spore einen Keim trifft.') : GK.on ? 'Still: wähle in Gestik „Neigen formt: Sporenregen“.' : 'Still: der Sporenregen klingt, wenn Gestik an ist und „Neigen formt: Sporenregen“ gewählt ist.';
    if (txt.textContent !== t) txt.textContent = t;
  };
  return el;
}

