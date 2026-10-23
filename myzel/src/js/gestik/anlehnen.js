/* ---------- Anlehnen: der Finger wählt den Ton, das Handgelenk formt ihn ---------- */
// While notes sound (the clutch "Mit Tönen"), the hand's lean shapes them – through the mod layer, never the patch.
// Forward/back is Höhe, the timbre each engine makes its own (the newest note full, older ones half – or all alike).
// Sideways bends the newest note toward the next step of the CURRENT scale and tuning (right up, left down):
// continuous up to 80 % of the way, then it snaps magnetically onto the exact step and stays there until the lean falls
// below 65 % (no chatter at the edge), with a tick – a short vibration where the browser has one (Android), a flash on
// the field everywhere (iOS has none). Each note bends from the pose it started bending in (a zero per stroke), so a
// note struck while leaning sounds as struck, and a note that is no longer the newest glides back to its own pitch:
// half a step on an older note would be out of tune. "Alle gleich": every held note bends to its OWN neighbour – a
// diatonic shift that stays in key. Instead of Tonhöhe, "Raum" leans the sound into the room (pan and echo).
// Bebung: the wrist's fast wobble (the recogniser's 2.5–10 Hz band of the same axis) is a vibrato whose rate and depth
// are the hand's own; "Ocarina" is the calmer kind – a steady LFO whose depth follows the forward lean (no gyroscope
// needed). "Unterarm": strapped along the forearm, its roll is Höhe and nothing bends (moving along the keys tilts it).
// Tragen (off by default): a finger lifted while the phone leans more than 12° leaves its note sounding, carried by the
// lean, until the lean comes back to rest – at most 2, for 20 s, and Stille ends them. MPE notes bring their own bend
// and height: Anlehnen leaves them alone.
const GA_BEB = 70;   // Bebung: cents at the recogniser's full scale (a wobble of about ±5°)
const GA_OCA = 45;   // Ocarina: cents at a full forward lean
const GA_REST = 0.2;   // Tonhöhe's own rest: a fifth of the way to the Weite
const GA_TOL = Math.pow(2, 30 / 1200);   // a neighbour is at least 30 cents away: a note between steps (the free field, a chromatic key) goes to the next real one
// now: the update done (once per Gestik update, whichever route asks first); car: carried notes, oldest first;
// bv: what the Tonhöhe source says (any bend at all); lfo: Ocarina's oscillator; vis: the field shows the lean
const GA = { now: -1, nk: '', zr: null, car: [], carN: 2, carT: 20000, cn: 0, buzzT: 0, bv: 0, lfo: null, oca: false, vis: false };
// "dieses Tablet": Bebung is off by default on a big screen – too heavy to wobble from the wrist (by size, never by name)
const gkBig = () => Math.min(screen.width || 0, screen.height || 0) >= 600;
const gaBeb = () => GK.p.beb || (gkBig() ? 'aus' : 'hand');
const gaOn = () => GK.on && GK.p.neigen === 'anl';
const gaHAx = () => (GK.p.platz === 'arm' ? 'tiltX' : 'tiltY');
const gaSeit = () => (GK.p.platz === 'arm' ? 'aus' : GK.p.seit);
// a note's share: the newest (and a carried one) full, older ones half – or all alike
const gaW = (tt, nw) => (GK.p.viele === 'alle' || nw || tt.carry ? 1 : 0.5);
// any degree of the current scale, also beyond the field (the free field: the semitones of the tuning)
function gaDeg(d) {
  if (!N.free) return degNote(d);
  const midi = 12 * (P['t.oct'] + 1) + Number(P['t.root']) + d;
  return { f: N.base * ratioForSemi(d), name: NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1) };
}
// the step of the scale next to f, up (dir 1) or down (−1): from a degree safely below (above) upward (downward)
// the pitch a note's main voice sounds: the Klang's Tonstufe moves it along the scale, so its neighbour steps are
// measured from there (its octave does not matter – a scale repeats). Ebene 2 rides the same bend bus: with a Tonstufe
// of its own it moves in parallel by the main voice's interval.
const gaF0 = (tt) => (P['v.deg'] && tt.col != null ? lyF({ ratio: 1, deg: P['v.deg'] }, tt.f, tt.col) : tt.f);
function gaStep(f, dir) {
  if (!(f > 0) || !(N.base > 0)) return null;
  const sc = SCALES[P['t.scale']] || SCALES.mpent, n = N.free ? 12 : sc.r ? sc.r.length : sc.s.length, lim = dir > 0 ? f * GA_TOL : f / GA_TOL;
  let d = Math.floor(n * Math.log2(f / N.base)) + (dir > 0 ? -2 : 3);
  for (let i = 0; i < 4 * n + 8; i++, d += dir) { const s = gaDeg(d); if (dir > 0 ? s.f > lim : s.f < lim) return s; }
  return null;
}
// Once per Gestik update: the bends of the notes, Ocarina's depths, the carried notes
function gaTick(o, now) {
  if (GA.now === now) return;
  const dt = GA.now > 0 ? Math.min(0.2, Math.max(0, now - GA.now) / 1000) : 0;
  GA.now = now;
  const on = gaOn(), mode = GK.mode, live = on && mode.startsWith('live');
  GA.vis = on && mode !== 'off' && touches.size > 0;
  // Tragen: a carried note is laid down when the lean is back at rest (Festhalten keeps it), after 20 s, or when
  // Anlehnen stops – after this update (a note's end runs the clutch, which runs this update)
  if (GA.car.length) {
    const m = Math.hypot(o.tiltX, o.tiltY);
    for (const tt of GA.car.slice()) if (!on || !GK.p.tragen || touches.get(tt.id) !== tt || (mode !== 'hold' && m < 0.04) || now - tt.carry > GA.carT) gaDrop(tt);
  }
  const nw = touches.size ? modNewest() : null, x = o.tiltX;
  // a new zero pose (the screen turned, "Nullpunkt setzen", picked up again): every note starts again from it
  const zr = GK.R ? GK.R.st.z : null;
  if (zr !== GA.zr) { GA.zr = zr; for (const tt of touches.values()) if (tt.ga) { tt.ga.z = null; tt.ga.snap = 0; } }
  // Tonhöhe
  const ton = on && gaSeit() === 'ton' && !gkOwn('tiltX'), alle = GK.p.viele === 'alle';
  GA.nk = '|' + N.base + '|' + P['t.scale'] + '|' + P['t.just'];
  let bv = 0;
  for (const tt of touches.values()) {
    const bend = ton && !tt.mpe && (alle || tt === nw || !!tt.carry);
    let g = tt.ga;
    if (!g) { if (!bend) continue; g = tt.ga = { on: false, z: null, t0: now, c: 0, snap: 0, k: '', up: null, dn: null, tn: '' }; }
    if (bend !== g.on) { g.on = bend; g.t0 = now; g.z = null; g.snap = 0; }   // starts (again) or stops bending: a new zero
    if (mode === 'hold' && g.z != null) { bv += Math.abs(g.c); continue; }   // Festhalten: the bend stays as it is
    // the note's zero, 80 ms after it started bending (the jolt of the stroke is past): the lean then if Gestik already
    // acted, else the clutch's own rest (it engages now, or a drag of the Wasserwaage starts later)
    if (g.on && g.z == null && now - g.t0 >= 80) g.z = live && !GK.xf ? x : 0;
    // not bending, the clutch resting, or no zero yet: back to the note's own pitch – exactly
    if (!g.on || !live || g.z == null) {
      g.snap = 0;
      if (g.c) { g.c *= Math.exp(-dt / 0.05); if (Math.abs(g.c) < 0.3) g.c = 0; }   // a quick glide (≈ 0.3 s to exactly 0)
      bv += Math.abs(g.c);
      continue;
    }
    // a rest of its own around the note's zero, a fifth of the way (≈ 9° at Weite 30°): a hand drifting a few degrees
    // must not detune a held note – with a soft start, so leaving it never jumps. The snap stays where the lean is at
    // 80 % of the way (and lets go below 65 %).
    const r = x - g.z, dir = r > 0 ? 1 : -1, ar = Math.abs(r), e = ar - GA_REST, p = e <= 0 ? 0 : Math.min(1, (e < 0.1 ? (e * e) / 0.2 : e - 0.05) / (0.95 - GA_REST));
    if (g.snap && (g.snap !== dir || ar < 0.65)) g.snap = 0;
    const f0 = gaF0(tt), key = f0 + GA.nk;
    if (g.k !== key) {
      g.k = key; g.up = gaStep(f0, 1); g.dn = gaStep(f0, -1);
      g.upF = P['v.deg'] && tt.col != null ? gaStep(tt.f, 1) : g.up; g.dnF = P['v.deg'] && tt.col != null ? gaStep(tt.f, -1) : g.dn;   // (named as the field names its notes)
    }
    const s = dir > 0 ? g.up : g.dn;
    if (!s || !p) { g.c = 0; g.snap = 0; continue; }
    if (!g.snap && ar >= 0.8) { g.snap = dir; gaSnapTick(tt); }
    const I = 1200 * Math.log2(s.f / f0);
    g.c = g.snap ? I : p * I;
    const sn = dir > 0 ? g.upF : g.dnF;
    g.tn = sn ? sn.name : s.name;
    bv += Math.abs(g.c);
  }
  GA.bv = bv;
  // Ocarina: depth from the forward lean (Höhe's axis), its rate rising a little with it
  const oca = on && gaBeb() === 'oca' && !gkOwn(gaHAx());
  if (oca || GA.oca) {
    const lean = oca && mode !== 'off' ? Math.max(0, o[gaHAx()]) : 0;
    let any = false;
    for (const tt of touches.values()) if (!tt.mpe && gaOca(tt, lean * GA_OCA * gaW(tt, tt === nw))) any = true;
    GA.oca = any;
    if (GA.lfo && A.ctx === GA.lfo.ctx) GA.lfo.o.frequency.setTargetAtTime(4.6 + 1.6 * lean, A.ctx.currentTime, 0.1);
  }
}
// Gestik switching off calls every listener once with the rest values (GK_ZERO): notes keep nothing of Anlehnen
const gaSub = (out, raw, evs, now) => (raw === GK_ZERO ? gaReset() : gaTick(out, now));
function gaReset() {
  for (const tt of touches.values()) { if (tt.ga) tt.ga = null; if (tt.fb && tt.fb.lg) gaOca(tt, 0); }
  for (const tt of GA.car.slice()) gaDrop(tt);
  GA.vis = false; GA.bv = 0; GA.oca = false; GA.now = -1;
}
// the snap: a short vibration (Android; the motor blinds Schütteln and Wenden meanwhile), a flash at the finger
function gaSnapTick(tt) {
  const t = performance.now();
  if (t - GA.buzzT > 60) { GA.buzzT = t; gkBuzz(8); }
  tt.gaT = t;
  if (document.visibilityState === 'visible') VIS.burst(tt.px, tt.py, tt.hue, 5, 0.9);
}
// Ocarina's LFO into a note's own bend bus (made on its first vibrato): one shared oscillator, a depth per note
function gaOca(tt, ct) {
  const c = A.ctx;
  if (!c || !A.started) return false;
  let fb = tt.fb;
  if (!fb) { if (ct < 0.05 || !(fb = modFinger(tt))) return false; }
  if (!GA.lfo || GA.lfo.ctx !== c) { const lo = c.createOscillator(); lo.frequency.value = 4.6; lo.start(); GA.lfo = { ctx: c, o: lo }; }
  if (!fb.lg) {
    if (ct < 0.05) return false;
    const L = GA.lfo, g = c.createGain();
    g.gain.value = 0; L.o.connect(g); g.connect(fb.node);
    fb.lg = g; fb.lgv = 0;
    fb.off = () => { try { L.o.disconnect(g); g.disconnect(); } catch (e) {} };
  }
  if (Math.abs(ct - fb.lgv) < 0.05 && (ct || !fb.lgv)) return fb.lgv > 0;
  fb.lgv = ct < 0.05 ? 0 : ct;
  rampP(fb.lg.gain, fb.lgv, 0.05, c.currentTime);
  return fb.lgv > 0;
}
// Tragen: the finger lifts while the phone leans more than 12° – the note stays, under a name of its own (a new
// finger may get the old pointer id), its glow leaves the finger and follows the lean
function gaCarry(tt, e) {
  if (e.type !== 'pointerup' || !e.pointerType || tt.mpe || tt.carry || !gaOn() || !GK.mode.startsWith('live')) return false;
  if (!tt.voices.some(({ v }) => v.alive)) return false;   // a struck sound has nothing to carry
  if (Math.hypot(GK.out.tiltX, GK.out.tiltY) < (GK.R ? GK.R.shape(12) : 0.3)) return false;
  const now = performance.now();
  touches.delete(tt.id);
  tt.id = 'carry-' + ++GA.cn; tt.carry = now;
  touches.set(tt.id, tt);
  GA.car.push(tt);
  GK.lockT = Math.max(GK.lockT, now + 100);   // the lift jolts the phone too
  if (VIS.rip.length < 150) VIS.rip.push({ x: tt.px, y: tt.py, r: 10, v: 1.2, life: 0.8, hue: tt.hue });
  while (GA.car.length > GA.carN) gaDrop(GA.car[0]);
  modTouch();
  return true;
}
function gaDrop(tt) {
  const i = GA.car.indexOf(tt);
  if (i >= 0) GA.car.splice(i, 1);
  Promise.resolve().then(() => { if (touches.get(tt.id) === tt) onUp({ pointerId: tt.id }); });
}
// where the field draws a shaped note's glow: leaning with the hand – a carried note further, it hangs on the lean
function gaGlow(tt, nw) {
  const k = tt.carry ? 34 : GK.p.viele === 'alle' || tt === nw ? 12 : 5, o = GK.out;
  return [tt.px + o.tiltX * k, tt.py - o.tiltY * k];
}
// The Fährte keeps Tonhöhe as how far the newest note leans toward its neighbour step (±1: snapped onto it) and plays
// it back the same way onto whatever note is newest then – to that note's own neighbour, so a looped lean stays in
// key (a note's bend in cents would be out of tune on any other note)
function gaFaeV() {
  const nw = modNewest(), g = nw && nw.ga;
  if (!g || !g.c) return 0;
  if (g.snap) return g.snap;
  const s = g.c > 0 ? g.up : g.dn, f0 = gaF0(nw), I = s && f0 > 0 ? 1200 * Math.log2(s.f / f0) : 0;
  return I ? Math.sign(g.c) * clamp(g.c / I, 0, 0.999) : 0;
}
function gaFaePer(tt, v, nw) {
  if (tt.mpe || !v || !(GK.p.viele === 'alle' || nw || tt.carry)) return 0;
  const f0 = gaF0(tt), key = f0 + '|' + N.base + '|' + P['t.scale'] + '|' + P['t.just'];
  const F = tt.gaF && tt.gaF.k === key ? tt.gaF : (tt.gaF = { k: key, up: gaStep(f0, 1), dn: gaStep(f0, -1) });
  const s = v > 0 ? F.up : F.dn;
  if (!s) return 0;
  const I = 1200 * Math.log2(s.f / f0), a = Math.abs(v);
  return a >= 0.999 ? I : a * I;
}
// Höhe, Tonhöhe, Bebung, Raum: routes on the mod layer (a learned binding of the same axis – "Eigene" – wins)
gkRoute('anl.h', { get axis() { return gaHAx(); }, target: 'hoehe', on: gaOn, fn: (o, raw, now) => (gaTick(o, now), o[gaHAx()]), opts: { per: (tt, v, nw) => (tt.mpe ? 0 : v * gaW(tt, nw)) } });
gkRoute('anl.t', { axis: 'tiltX', target: 'bend', on: () => gaOn() && gaSeit() === 'ton', fn: (o, raw, now) => (gaTick(o, now), Math.min(1, GA.bv / 200)), opts: { per: (tt) => (tt.ga && !tt.mpe ? tt.ga.c : 0), fae: { v: gaFaeV, per: gaFaePer } } });
gkRoute('anl.b', { axis: 'bebung', target: 'bend', on: () => gaOn() && gaBeb() === 'hand', fn: (o, raw, now) => (gaTick(o, now), o.bebung), opts: { per: (tt, v, nw) => (tt.mpe ? 0 : v * GA_BEB * gaW(tt, nw)) } });
gkRoute('anl.pan', { axis: 'tiltX', target: 'pan', on: () => gaOn() && gaSeit() === 'raum', fn: (o, raw, now) => (gaTick(o, now), o.tiltX) });
gkRoute('anl.dly', { axis: 'tiltX', target: 'dly', on: () => gaOn() && gaSeit() === 'raum', fn: (o) => Math.abs(o.tiltX) * 0.4 });
gkSub(gaSub);

