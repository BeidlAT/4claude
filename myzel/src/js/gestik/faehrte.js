/* ---------- Fährte: Bewegung wird nie vergessen ---------- */
// Myzel always writes down what shapes the sound, on the beat: every live source of the mod layer (Gestik's own
// functions; any control bound to a Formen target – a wheel, a knob, the X-Y pad, Gestik's axes), the height of the
// newest note (a finger sliding, a keyboard's mod wheel, the X-Y pad as a finger) and the parameters that have a
// counterpart in Formen (filter, ring, Bordun, echo, hall, Schweben, grains, Tropfen; the mixer's A/B morph) when a knob
// or a slider moves them. Each is a lane of values on a grid of 48 steps per beat, 8 bars long – the values as they
// reached the sound (after Ruhezone, Glätte, Kurve and the clutch), placed where the player heard the music while
// moving: earlier by the output's delay, for Gestik also by the sensor's (Klopf-Messung, else an estimate of 40 ms),
// plus a ±20 ms trim.
// A tap on "Fährte" makes the LAST 1, 2 or 4 bars a loop (nothing to arm first): the bars up to the bar line before the
// tap (a tap just before a bar line means that one). Holding records from the next bar line (just after one: from
// that one – it is written down already); holding again while a loop runs plays over it for one pass, added. A double
// tap clears. A loop plays on the mod layer as sources of its own ('fae:…'), laid half a second ahead as points the
// scheduler turns into ramps – sample-exact on the audio targets, and a page that stalls keeps playing them. It lives
// in beats, so it follows the tempo and a device's MIDI clock; live movement adds on top. Verblassen: every pass a
// little weaker (×0.85 by default; 1 = for ever) until it is gone.
// The beat: the Puls's while it runs (an external clock included); while it stands, its own, counted on at the Puls's
// tempo – never jumping: when the Puls starts, a running loop moves onto its bar lines once (by at most half a bar).
// The Puls itself knows nothing of it.
const FA_R = 48, FA_RING = 400 * FA_R, FA_AHEAD = 0.5, FA_END = 0.04, FA_KEY = 'myzel.faehrte.v1';   // (Hexenring: the ring is the Humus's Bewegung – two minutes at 200 BPM)
(() => { try { const o = JSON.parse(store.get(FA_KEY) || 'null'); if (o && typeof o === 'object') for (const k in FA.p) if (k in o) FA.p[k] = o[k]; } catch (e) {} })();
if (![1, 2, 4].includes(FA.p.len)) FA.p.len = 2;
FA.p.fade = clamp(Number(FA.p.fade) || 0.85, 0.3, 1);
FA.p.trim = clamp(Math.round(Number(FA.p.trim) || 0), -20, 20);
FA.p.hin = FA.p.hin === true; FA.p.seen = FA.p.seen === true;
const faeSave = () => store.set(FA_KEY, JSON.stringify(FA.p));
const faeMod = (s, n) => ((s % n) + n) % n;
// the Fährte's beat at audio time t, and the time of a beat (Hexenring: the Taktgeber's continuous beat)
const faeB = (t) => tgCb(t);
const faeT = (b) => tgCt(b);
const faeNow = () => ctxAt(performance.now());
// what is written down: Gestik's functions and every binding to Formen (Schlafen is a state, not a movement; the
// Fährte's own sources never)
function faeOk(n) { return (n.startsWith('gk:') && n !== 'gk:slp') || n.startsWith('map:'); }
function faeM(n, k, v, o) {
  if (!A.started) return;
  faeIn('m|' + k + '|' + n, o && o.fae && v ? o.fae.v() : v, 'm', k, n, n.startsWith('gk:') || n.startsWith('map:gestik:'), 0);
}
// the clock, at every scheduler tick: the Taktgeber's continuous beat (Hexenring), the bar lines the Puls's while it
// runs (FA.d = its count − the continuous one: a fresh start moves the bars, not the Fährte's count); FA.t0/b0/bpm
// name the segment sounding now
function faeClock(now) {
  const sg = TG.seg[tgIdx(now)];
  if (FA.t0 == null) { FA.t0 = sg.t; FA.b0 = sg.b; FA.bpm = sg.bpm; FA.pon = SEQ.on; FA.ver = TG.ver; FA.d = -TG.o; FA.ph = faeMod(TG.o, 4); return; }
  if (SEQ.on && (!FA.pon || Math.abs(-TG.o - FA.d) > 0.125)) { FA.d = -TG.o; FA.ph = faeMod(-FA.d, 4); }   // the Puls started, or its clock jumped (Start, a song position)
  if (FA.t0 !== sg.t || FA.b0 !== sg.b || FA.bpm !== sg.bpm || FA.ver !== TG.ver) { FA.t0 = sg.t; FA.b0 = sg.b; FA.bpm = sg.bpm; FA.ver = TG.ver; HX.bewRe = true; }   // (the Schleifen of Bewegung lay their points again)
  FA.pon = SEQ.on;
}
// how far back a movement was heard: the output's delay, for Gestik the sensor's too, and the trim
function faeShift(gk) {
  const c = A.ctx, out = (c.baseLatency || 0) + (c.outputLatency || 0) + graphLatency();
  const sens = gk ? (GK.rem && GK.rem.src.gkr && GK.rem.src.gkr.latS != null ? GK.rem.src.gkr.latS : GK.p.latS != null ? GK.p.latS : 40) / 1000 : 0;
  return out + sens + FA.p.trim / 1000;
}
// the beat the player heard at a moment (performance time)
function faeHeard(pt) { const c = A.ctx; return faeB(ctxAt(pt) - (c.baseLatency || 0) - (c.outputLatency || 0) - graphLatency()); }
// one value of a lane: written at its step, held until the next (as the sound holds it); a parameter's lane starts
// from the value it had before (x0), every other one from rest
function faeIn(key, v, kind, k, src, gk, x0) {
  if (!A.ctx || !Number.isFinite(v)) return;
  let L = FA.lanes.get(key);
  if (!L) {
    if (kind !== 'p' && !v) return;
    if (FA.lanes.size >= 48) faeGc(true);
    L = { key, kind, k, src, gk, buf: new Float32Array(FA_RING), s: null, v: kind === 'p' ? x0 : 0, at: 0 };
    if (L.v) L.buf.fill(L.v);
    FA.lanes.set(key, L);
  }
  if (FA.t0 == null) faeClock(A.ctx.currentTime);
  const s = Math.floor(faeB(faeNow() - faeShift(gk)) * FA_R);
  if (L.s == null) L.s = s - 1;
  if (s > L.s) {
    if (s - L.s > FA_RING) L.buf.fill(L.v);
    else for (let i = L.s + 1; i < s; i++) L.buf[faeMod(i, FA_RING)] = L.v;
    L.s = s;
  }
  L.buf[faeMod(s, FA_RING)] = v; L.v = v; L.at = performance.now();
}
const faeAt = (L, i) => (i > L.s ? L.v : L.buf[faeMod(i, FA_RING)]);
// a parameter moved (setParam, the mixer's morph): its lane, in octaves where it is a frequency or a density
function faeP(id, was, v) {
  if (!A.started || !A.ctx) return;
  const d = FAE_PAR[id], x = (y) => (d && d[1] === 'log' ? Math.log2(Math.max(1e-6, y)) : y);
  faeIn('p|' + id, x(v), 'p', d ? d[0] : 'morph', id, false, x(was));
}
// the height of the newest note against its own at the start (a finger's slide, a keyboard's wheel, the X-Y pad)
function faeY() {
  let nw = null;
  for (const tt of touches.values()) if (!nw || (tt.seq || 0) > (nw.seq || 0)) nw = tt;
  let v = 0;
  if (nw) { if (nw.fy0 == null) nw.fy0 = nw.y; v = clamp((nw.y - nw.fy0) * 2, -1, 1); }
  const L = FA.lanes.get('y');
  if (Math.abs(v - (L ? L.v : 0)) > 1e-3 || (!v && L && L.v)) faeIn('y', v, 'y', 'hoehe', 'y', false, 0);
}
// Gestik's tilt as it acted (for the ghost spore in the Wasserwaage). („Hinlegen wird Schleife“ is a binding of Ruhe to
// the Korb now – hx.hin, opt-in in the Hexenring's card)
function faeGk(out, raw, evs, now) {
  if (!A.started) return;
  for (const [key, v] of [['d|tx', out.tiltX], ['d|ty', out.tiltY]]) {
    const L = FA.lanes.get(key);
    if (Math.abs(v - (L ? L.v : 0)) > 2e-3 || (!v && L && L.v)) faeIn(key, v, 'd', null, key.slice(2), true, 0);
  }
}
gkSub(faeGk);
// lanes nothing wrote to for a whole ring go (a parameter's too: it is constant there)
function faeGc(force) {
  const now = performance.now(), keep = (32 * 60000) / Math.max(20, FA.bpm);
  for (const [key, L] of FA.lanes) if (now - L.at > keep && (L.kind === 'p' || !L.v)) FA.lanes.delete(key);
  if (force && FA.lanes.size >= 48) { let o = null; for (const L of FA.lanes.values()) if (!o || L.at < o.at) o = L; if (o) FA.lanes.delete(o.key); }
}
// the mixer's morph as a deflection from where it stands at the end (toward B +, toward A −, on mp()'s scale)
const faeMorphRel = (x, e) => (x > e ? (e < 0.999 ? (x - e) / (1 - e) : 0) : x < e ? (e > 0.001 ? -(e - x) / e : 0) : 0);
// the steps [a, b) as a loop: every lane that moved (a parameter's relative to its value at the end, so the knob's
// position now is the loop's rest); Gestik's tilt only for the ghost spore. null: nothing moved. (Hexenring: a lane that
// only jumped once – a preset, a value set – is no movement: a Schleife of Bewegung would replay the jump every pass)
function faeCut(a, b) {
  const n = b - a, lanes = [];
  let disp = null;
  for (const L of FA.lanes.values()) {
    if (L.s == null) continue;
    let moves = 0;
    for (let i = a + 1; i < b && moves < 2; i++) if (Math.abs(faeAt(L, i) - faeAt(L, i - 1)) > 1e-6) moves++;
    if (moves < 2) continue;
    const v = new Float32Array(n);
    let mx = 0;
    if (L.kind === 'p') {
      const xe = faeAt(L, b - 1), d = FAE_PAR[L.src];
      for (let i = 0; i < n; i++) { const x = faeAt(L, a + i); v[i] = d ? (x - xe) * d[2] : faeMorphRel(x, xe); }
    } else for (let i = 0; i < n; i++) v[i] = faeAt(L, a + i);
    for (let i = 0; i < n; i++) if (Math.abs(v[i]) > mx) mx = Math.abs(v[i]);
    if (mx < 1e-3) continue;
    if (L.kind === 'd') { (disp || (disp = {}))[L.src] = v; continue; }
    lanes.push({ k: L.k, src: L.kind === 'p' ? 'p:' + L.src : L.src, v });
  }
  return lanes.length ? { lanes, disp } : null;
}
// a lane's way of reaching the notes, as its source had it (Höhe's shares, Bebung's cents, Tonhöhe to the neighbour step)
function faeOpts(src) {
  if (!src.startsWith('gk:')) return null;
  const r = GKR.get(src.slice(3)), o = r && r.opts;
  return o ? (o.fae ? { per: o.fae.per } : { per: o.per, older: o.older }) : null;
}
// all that is written down has reached `b` (the beat): the slowest lane is Gestik's, behind by the sensor's delay
const faeReady = (b) => faeB(faeNow() - faeShift(true)) >= b - 1e-6;
// The scheduler's part (every 25 ms): the clock, the finger's height; the Schleifen of Bewegung lay their points
// (Hexenring – the Fährte's button, its tap, hold and double tap are retired, SPEC §18: its loop is a Schleife)
function faeTick(horizon) {
  const now = A.ctx.currentTime;
  faeClock(now);
  faeY();
  hxBewLay(now, Math.max(horizon, now + FA_AHEAD));
  const pt = performance.now();
  if (pt - FA.uiT > 250) { FA.uiT = pt; faeUI(); if (FA.lanes.size && pt - FA.gT > 2000) { FA.gT = pt; faeGc(false); } }
}
// what the Gestik card says of it (its ghost spore is in the Wasserwaage)
function faeUI() { if (GK.card) gkFaeSync(GK.card); }

