/* ---------- Touché: die Gestik des Handys (owner, 31.10.2026) ---------- */
// „Überleg dir, wie man mit dem Touché die Gestik des Handys vollständig nachmachen könnte – als weitere Spielweise.“ The
// Spielweise „Gestik“ makes the Touché a phone: the hand on the skin becomes the phone's motion, handed to Gestik exactly
// where a phone's arrives over the Funkstrecke (gestik/funkstrecke.js: gkRemOn, the values of NRPN 42/0–7, the event notes)
// – so everything Gestik does plays as with the phone, with all of its settings: Anlehnen (Höhe, Tonhöhe zum Nachbarton,
// Raum, Okarina), Bebung, Ladung (Körner, Tropfen, Puls, Rassel …), Schwenken, Schlafen, Sporenregen, the presets' Rezepte,
// „Zuweisen“ of its axes and events, the clutch (Kupplung) and Festhalten.
//   Neigen ↔ / ↕      links/rechts, weg/heran – the skin's way is the phone's tilt (full pressure: a little past the Weite)
//   Bebung            a trembling hand on the skin (2.5 … 10 Hz in the pressure, either axis) – as the wrist's tremor
//   Drehen            circling on the skin (weg → rechts → heran → links: clockwise +), a spring brings it back in ~1 s
//   Schwenken         steady circles (0.4 … 4 a second) for 0.6 s fill its calm store, as circling the wine glass
//   Ladung            quick movement of the hand fills it, the Entladung drains it – as shaking the phone does
//   Schütteln         at least 3 strong reversals within 600 ms (a quick to-and-fro on the skin); each swing a peak (Rassel)
//   Wenden (Schlafen) a double flick toward you (heran, twice within 450 ms) – and again to wake
//   Ruhe              the hand off the skin for 1.5 s – as the phone lying still
// Rest stays the zero (the Touché springs back: no new zero from the pose a note starts in). Sampled at ~100 Hz while chosen (the real step time).
const TCHG = { src: null, tm: 0, said: false };
function tchGestik(on, v) {
  TCHG.v = v;
  if (on && !TCHG.tm) tchGestikOn();
  else if (!on && TCHG.tm) tchGestikOff();
}
function tchGestikOn() {
  if (GK.rem && (!TCHG.src || GK.rem.src !== TCHG.src)) {   // a phone sends already: it stays Gestik's
    if (!TCHG.said) { TCHG.said = true; toast('Touché-Gestik: ein Handy sendet schon über die Funkstrecke – es bleibt die Gestik.', 5000); }
    return;
  }
  const now = performance.now();
  const S = TCHG.src = { key: 'tch:gestik', name: 'Touché', enabled: true, syn: () => !!TCHG.tm,
    gkr: { t: now, flags: 3, latS: 6, v: new Float64Array(GKF.n), ev: [], due: false, n: 0, rn: 0, rt: now, rate: 0 } };
  if (GK.remOff === S.key) { toast('Touché-Gestik: Gestik wurde ausgeschaltet – schalte sie unter „Gerät → Gestik“ wieder ein.', 5000); return; }
  gkRemOn(S);
  if (!GK.rem || GK.rem.src !== S) return;
  const R = GK.R; R.zero = () => { gkRemAx(R); return true; };   // (rest is the zero – the skin springs back)
  TCHG.st = { x: 0, y: 0, bx: [0, 0, 0, 0, 0, 0], beb: 0, benv: 0, bg: 0, th: null, drh: 0, swS: 0, swHz: 0, swDir: 0, swT: 0, sw: 0, lad: 0, exc: 0,
    sh: { dir: null, t0: 0, pk: 0, revs: [], on: false, last: 0, sw: false }, fl: { up: false, ts: [] }, wend: false, rest: 0, ruhe: false };
  TCHG.tm = setInterval(tchGestikTick, 10);
  toast('Touché als Handy: Neigen, Bebung, Drehen, Ladung, Schütteln – Schlafen mit zweimal kurz heran.', 4200);
}
function tchGestikOff() {
  clearInterval(TCHG.tm); TCHG.tm = 0;
  if (GK.rem && GK.rem.src === TCHG.src) gkRemEnd();
  TCHG.src = null;
}
// one step: the hand → the phone's eight values and its events (gkRemIn takes them as one frame)
function tchGestikTick() {
  const S = TCHG.src, G = S && S.gkr;
  if (!G || !GK.rem || GK.rem.src !== S) { if (TCHG.tm) { clearInterval(TCHG.tm); TCHG.tm = 0; } return; }
  const st = TCHG.st, v = TCHG.v || { weg: 0, her: 0, li: 0, re: 0 }, now = performance.now(), dt = clamp((now - (st.t || now - 10)) / 1000, 0.002, 0.05);
  st.t = now;
  // the hand lightly smoothed (20 ms): the Touché sends in steps, and a step's slope would read as a jolt
  const k = 1 - Math.exp(-dt / 0.02), x = st.x + k * (v.re - v.li - st.x), y = st.y + k * (v.weg - v.her - st.y), dx = (x - st.x) / dt, dy = (y - st.y) / dt, p = Math.max(v.weg, v.her, v.li, v.re), ev = G.ev;
  st.x = x; st.y = y;
  const W = (GK.p.weite || 30) * 1.15;
  // Bebung: the pressure's tremor, 2.5 … 10 Hz (two high-pass poles, one low-pass), its swept way leaky, gated above a
  // resting tremor – the hand's wobble on either axis (the sideways one is the Touché's natural vibrato)
  const hp = (1 / (2 * Math.PI * 2.5)) / (1 / (2 * Math.PI * 2.5) + dt), lpk = 1 - Math.exp(-dt * 2 * Math.PI * 10), b = st.bx, w = (dx + dy) * W;   // (deg/s of the 'phone')
  b[0] = hp * (b[0] + w - b[1]); b[1] = w; b[2] = hp * (b[2] + b[0] - b[3]); b[3] = b[0]; b[4] += lpk * (b[2] - b[4]);
  st.beb = st.beb * Math.exp(-dt / 0.12) + b[4] * dt; st.benv += (1 - Math.exp(-dt / 0.15)) * (b[4] * b[4] - st.benv);
  const env = Math.sqrt(st.benv), gt = clamp((env - 12) / 12, 0, 1); st.bg += (gt > st.bg ? 0.2 : 0.02) * (gt - st.bg);
  const beb = clamp((st.beb * st.bg) / 5, -1, 1);
  // Drehen and Schwenken: circling the pressure round the centre (clockwise seen from above: weg → rechts → heran → links)
  const r = Math.hypot(x, y), th = r > 0.15 ? Math.atan2(x, y) : null;
  let wdeg = 0;
  if (th != null && st.th != null) { let d = th - st.th; if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI; wdeg = (d * 180 / Math.PI) / dt; }
  st.th = th;
  st.wd = (st.wd || 0) + (1 - Math.exp(-dt / 0.15)) * (wdeg - (st.wd || 0));   // (the turning rate smoothed: its frequency steady)
  const wv = Math.abs(wdeg) > 6 ? wdeg * 0.25 : 0;   // (a quarter of the angle: one circle turns the knob 90°)
  st.drh = st.drh * Math.exp(-dt / 1) + wv * dt;
  const fq = Math.abs(st.wd) / 360, circ = th != null && fq > 0.4 && fq < 4 && r > 0.25;
  st.swT = circ ? st.swT + dt : 0;
  const sg = st.swT >= 0.6 ? Math.min(1, r * 1.2) : 0;
  st.sw = clamp(st.sw * (1 - (1 - sg) * (1 - Math.exp(-dt / 4))) + (sg * dt) / 2.5, 0, 1);
  if (sg > 0.2) { st.swHz += 0.05 * (fq - st.swHz); st.swDir += 0.05 * ((st.wd > 0 ? 1 : -1) - st.swDir); }
  // Ladung: quick movement of the hand above a floor fills it, the Entladung drains it (the phone's own law)
  const TE = Math.max(0.05, (GK.p.entl || 8) / 3), e2 = (dx * dx + dy * dy) / 100;   // (a brisk to-and-fro, ~20 units/s, as a shaken phone: ≈ 2)
  st.exc += (1 - Math.exp(-dt / 0.15)) * (e2 - st.exc);
  st.lad = clamp(st.lad * Math.exp(-dt / TE) + Math.max(0, Math.sqrt(Math.max(0, st.exc)) - 0.6) * Math.max(0.8, 0.7 / TE) * dt, 0, 1);
  // Schütteln: a swing is a stretch of fast movement (≥ 3 units/s) for 30 ms; a reversal is the next swing more than
  // 120° away; 3 within 600 ms shake, 500 ms without one end it; each swing's peak a 'peak' (the Rassel)
  // (a quick to-and-fro never slows below the threshold at its turn: a swing also ends where the movement turns round)
  const sh = st.sh, sp = Math.hypot(dx, dy), ang = (p1, p2) => { let d = Math.abs(p1 - p2); return d > Math.PI ? 2 * Math.PI - d : d; };
  const end = () => { sh.sw = false; if (sh.cnt && sh.on) ev.push({ type: 'peak', v: clamp(sh.pk / 12, 0, 1), t: now, i: 0 }); sh.cnt = false; };
  if (sp > 3) {
    const a = Math.atan2(dy, dx);
    if (sh.sw && ang(a, sh.a) > (2 * Math.PI) / 3) end();
    if (!sh.sw) { sh.sw = true; sh.t0 = now; sh.pk = 0; sh.a = a; }
    sh.pk = Math.max(sh.pk, sp);
    if (now - sh.t0 >= 30 && !sh.cnt) {
      sh.cnt = true;
      if (sh.dir != null && ang(sh.a, sh.dir) > (2 * Math.PI) / 3) { sh.revs.push(now); sh.last = now; }
      sh.dir = sh.a;
    }
  } else if (sh.sw) end();
  while (sh.revs.length && now - sh.revs[0] > 600) sh.revs.shift();
  if (!sh.on && sh.revs.length >= 3) { sh.on = true; ev.push({ type: 'schuetteln', on: true, v: clamp(sh.pk / 12, 0, 1) }); }
  else if (sh.on && now - sh.last > 500) { sh.on = false; ev.push({ type: 'schuetteln', on: false, v: 0 }); }
  // Wenden: two short flicks toward you within 450 ms turn the 'phone' over (Schlafen) – and back
  const fl = st.fl;
  if (!fl.up && v.her > 0.6 && v.weg < 0.2) { fl.up = true; fl.t = now; }
  else if (fl.up && v.her < 0.25) { fl.up = false; if (now - fl.t < 250) { fl.ts.push(now); while (fl.ts.length && now - fl.ts[0] > 450) fl.ts.shift(); if (fl.ts.length >= 2) { fl.ts.length = 0; st.wend = !st.wend; ev.push({ type: 'wenden', on: st.wend, v: 1 }); } } }
  // Ruhe: the hand off the skin for 1.5 s – the phone lying still
  if (p < 0.02) { st.rest += dt; if (!st.ruhe && st.rest >= 1.5) { st.ruhe = true; ev.push({ type: 'ruhe', on: true, v: 1 }); } }
  else if (p > 0.05) { st.rest = 0; if (st.ruhe) { st.ruhe = false; ev.push({ type: 'ruhe', on: false, v: 0 }); } }
  // the frame: the phone's eight values (tilt in degrees as the phone sends them)
  const V = G.v;
  V[0] = x * W; V[1] = y * W; V[2] = beb; V[3] = Math.tanh(st.drh / 60); V[4] = st.lad; V[5] = st.sw; V[6] = clamp(st.swHz, 0, 4); V[7] = clamp(st.swDir, -1, 1);
  G.t = now; GK.dmSeen = true;
  gkrDue(S);
}
