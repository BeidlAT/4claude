/* =====================================================================
   Touch play
   ===================================================================== */
const touches = new Map();
// the layers a note plays (owner, 30.10.2026: „alle Ebenen klingen auf jedem Ton“ – params.js EB): Ebene 1 always,
// 2–8 once a sound is chosen. With the note's pitch f and velocity vel (a played note) each layer is gated by its
// Tonbereich and Anschlags-Bereich – amp, the soft edge's gain, a gain of the voice's own (playNote), never its velocity –
// and a muted layer (its strip's M) or one outside a layer solo plays no voice at all: nothing heard, nothing counted,
// nothing in the Humus. Without f (warming the strings, the library's probe) every layer that has a sound.
function layers(f, vel) {
  const out = [], solo = f != null && EB.some((e) => P[e.pre + 'solo']);
  for (const e of EB) {
    const eng = P[e.eng];
    if (e.n > 1 && !ENGINES[eng]) continue;
    let amp = 1;
    if (f != null) {
      if (P['x' + e.k + '.mute'] || (solo && !P[e.pre + 'solo'])) continue;
      amp = ebZone(e, f, vel); if (amp < 1e-3) continue;
    }
    const r = e.n === 1 ? Math.pow(2, P['v.oct']) : Math.pow(2, P[e.int] / 12), fine = P[e.pre + 'fine'];
    out.push({ eng, ratio: fine ? r * Math.pow(2, fine / 1200) : r, deg: P[e.deg], lvl: P[e.lvl], bus: stripIn(e.k), amp, n: e.n });
  }
  return out;
}
// a layer's gain for a note: 1 inside its Tonbereich (a key counts from half a semitone below to half above) and its
// Anschlags-Bereich, falling to 0 over the soft edge outside them (a quarter sine: two layers fading across the same
// edge keep the power), 0 beyond; a hard edge (0) gates
function ebZone(e, f, vel) {
  const p = e.pre, z = (x, lo, hi, w) => { const d = x < lo ? lo - x : x > hi ? x - hi : 0; return d <= 0 ? 1 : w > 0 && d < w ? Math.sin(Math.PI / 2 * (1 - d / w)) : 0; };
  const key = 69 + 12 * Math.log2(Math.max(1e-6, f) / P['t.a4']);
  return z(key, P[p + 'lo'] - 0.5, P[p + 'hi'] + 0.5, P[p + 'rand']) * z(vel != null ? vel : P['v.vel'], P[p + 'vlo'] - 1e-6, P[p + 'vhi'] + 1e-6, P[p + 'vrand']);
}
// the pitch a layer plays for a note of the field: moved by whole steps of the scale (semitones in the free scale),
// then by its octave or interval
function lyF(ly, f, idx) {
  if (!ly.deg) return f * ly.ratio;
  if (N.free) return f * ly.ratio * Math.pow(2, ly.deg / 12);
  return f * ly.ratio * degNote(idx + ly.deg).f / degNote(idx).f;
}
function touchVel() { return P['v.vel'] * (1 - P['v.human'] * 0.3 * Math.random()); }
// a keyboard brings its own dynamics and timing: no humanizing for MIDI notes
const noteVel = (tt) => (tt.vel != null ? tt.vel : touchVel());
function touchPan(x) { return clamp((x * 2 - 1) * P['v.width'] * 0.8 + rand(-0.15, 0.15) * P['v.width'], -1, 1); }
// lys: the layers struck (default the note's own, tt.layers)
function triggerPerc(tt, t, isRoll, grp, lys) {
  let any = false;
  grp = grp || {};   // (the layers of one strike are stolen together – alloc.js steal)
  for (const ly of lys || tt.layers) {
    if (ENGINES[ly.eng].sustain) continue;
    const jit = tt.vel != null ? 0 : P['v.human'] * 0.01 * Math.random();
    const f = lyF(ly, tt.f, tt.col);
    hit(ly.eng, t + jit, tt.mb ? f * Math.pow(2, tt.mb / 12) : f, modY(tt, touches.get(tt.id) === tt ? undefined : tt), noteVel(tt) * ly.lvl, { pan: touchPan(tt.x), bend: tt.fb || tt.bend, bus: ly.bus, amp: ly.amp, grp });   // a note being struck is the newest
    any = true;
  }
  if (any) visPush({ t, kind: 'hit', x: tt.x, y: tt.y, s: isRoll ? 0.6 : 1, hue: tt.hue });
}
function stagePoint(e) {
  const r = cvFx.getBoundingClientRect();
  return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp(1 - (e.clientY - r.top) / r.height, 0, 1), px: e.clientX - r.left, py: e.clientY - r.top };
}
function onDown(e) {
  if (!A.started) return;
  const lmT = LM.on ? performance.now() : 0;   // („Leistung messen“: from the touch to the voice)
  if (e.preventDefault) e.preventDefault();
  if (e.pointerType && SLP.down) return;   // Gestik: the screen lies on the table – no phantom touches
  if (NA.q.length) noteAfterRun();   // (the last note's own work first: in order)
  ensureRunning();
  if (HOLD.on && holdNew()) holdRelease();   // Halten: a new stroke from an empty hand lets the held ones go
  if (touches.has(e.pointerId)) onUp({ pointerId: e.pointerId, force: true, at: e.at });   // never leave a note hanging on a reused pointer id (a key struck again: the old note ends where the new one starts)
  if (e.pointerType) { try { cvFx.setPointerCapture(e.pointerId); } catch (err) {} }
  const pt = e.pt || stagePoint(e), n = e.note || noteAt(pt.x), now = e.at > A.ctx.currentTime ? e.at : A.ctx.currentTime;   // (a key: at its moment – midiAt)
  const tt = { id: e.pointerId, t0: now, x: pt.x, y: pt.y, px: pt.px, py: pt.py, col: n.idx, f: n.f, name: n.name, layers: layers(n.f, e.vel), voices: [], rollNext: null, hue: VIS.hueAt(pt.x), vel: e.vel, bend: e.bend || false, vn: e.vn, mb: e.mb || 0, mpe: e.mpe, seq: ++MOD.seq, stk: modStroke(e.stkT), ptype: e.pointerType || null };
  const y0 = (tt.my = modY(tt, tt));   // the newest note: Höhe's full share from its first moment
  const arp = typeof arpTake === 'function' && arpTake(tt);   // (the Sporenwerk: the note joins its pool and does not sound itself – arp/sporenwerk.js)
  if (!arp) for (const ly of tt.layers) {
    if (ENGINES[ly.eng].sustain) {
      const f = lyF(ly, n.f, n.idx);   // mb: an MPE note's own bend in semitones
      const v = playNote(ly.eng, now, tt.mb ? f * Math.pow(2, tt.mb / 12) : f, y0, noteVel(tt) * ly.lvl, { pan: touchPan(pt.x), bend: tt.bend, bus: ly.bus, amp: ly.amp, grp: tt });
      if (v) tt.voices.push({ v, ly });
    }
  }
  if (!arp) triggerPerc(tt, now, false, tt);
  if (!arp && P['v.roll'] !== 'off' && tt.layers.some((ly) => !ENGINES[ly.eng].sustain)) tt.rollNext = now + rollInterval();
  touches.set(e.pointerId, tt);
  if (GK.on) gkNote(tt, true, e);
  modTouch();
  // what does not play comes after the note: the recorder's start (its moment taken now) and the screen's burst, in a
  // task of their own – the browser starts a voice once the task that made it has ended; a release or the next press
  // runs them first
  const at = now;
  noteAfter(() => { noteEvent(at); VIS.touchStart(tt); });
  if (lmT) lmTouch(e, lmT);
}
// the work after a note, in a task of its own (a message: the next task, before any timer)
const NA = { q: [], ch: null };
function noteAfter(fn) {
  NA.q.push(fn);
  if (NA.q.length > 1) return;
  if (!NA.ch) { NA.ch = new MessageChannel(); NA.ch.port1.onmessage = noteAfterRun; }
  NA.ch.port2.postMessage(0);
}
function noteAfterRun() { if (!NA.q.length) return; const q = NA.q; NA.q = []; for (const fn of q) { try { fn(); } catch (e) { console.error(e); } } }
function onMove(e) {
  if (NA.q.length) noteAfterRun();
  const tt = touches.get(e.pointerId);
  if (!tt) return;
  e.preventDefault();
  moveTouch(tt, stagePoint(e));
}
// a held finger moves (a pointer, or a controller's X-Y pad): the pitch glides, the height recolours (Höhe adds to it),
// a new column strikes again when "Anreißen" is on – unless Fingerhalt holds the column while Gestik acts
function moveTouch(tt, pt) {
  const x = tt.fh || GK.on ? fhX(tt, pt) : pt.x, n = noteAt(x);
  tt.x = x; tt.y = pt.y; tt.px = pt.px; tt.py = pt.py; tt.f = n.f; tt.name = n.name;
  const y = (tt.my = modY(tt));
  for (const { v, ly } of tt.voices) {
    if (!v.alive) continue;
    if (v.setF) v.setF(lyF(ly, n.f, n.idx), P['v.glide']);
    if (v.setY) v.setY(y);
  }
  if (n.idx !== tt.col) {
    tt.col = n.idx;
    tt.hue = VIS.hueAt(pt.x);
    // (a new strike: the layers of the new pitch – their Tonbereich, mute and solo – not those the finger landed with)
    if (P['v.strum'] && tt.rollNext == null && !tt.arp) triggerPerc(tt, A.ctx.currentTime, false, null, layers(n.f, tt.vel));
  }
}
function onUp(e) {
  if (NA.q.length) noteAfterRun();   // (the press's own work before its release)
  const tt = touches.get(e.pointerId);
  if (!tt) return;
  if (HOLD.on && !e.force) { if (!tt.hold) { tt.hold = true; holdUI(); } return; }   // Halten: it sounds on, the field shows it as held
  if (GK.on && GK.p.tragen && gaCarry(tt, e)) return;   // Tragen: the lean carries the note on
  touches.delete(e.pointerId);
  if (GK.on) gkNote(tt, false, e);
  modTouch();
  // a key's note-off at its MIDI moment (e.at, midiAt); any release never before its own note began (a pedal, Halten or
  // all-notes-off within the lead of a Gleichmäßig note: from its start, not before it – relT makes a past one now)
  const at = Math.max(e.at > 0 ? e.at : 0, tt.t0);
  for (const { v } of tt.voices) if (v.alive && v.release) v.release(e.relK, at);
  VIS.touchEnd(tt);
}
function releaseAllTouches() { for (const id of Array.from(touches.keys())) onUp({ pointerId: id, force: true }); holdUI(); }

/* ---------- Halten (owner, 25.10.2026: „unser Baby braucht einen simplen Hold-Knopf“) ----------
   A latch: while it is on, a note let go (finger, key, MIDI) sounds on and the field keeps drawing it as held. Playing
   again from an empty hand – every note that sounds is a held one – lets them go: the new stroke takes their place;
   notes struck while another is still down join the chord. Off lets all go. The button (a fermata) beside Freeze,
   the Enter key, any learned control („Halten“). */
const HOLD = { on: false };
const holdNew = () => { for (const tt of touches.values()) if (!tt.hold) return false; return touches.size > 0; };
function holdRelease() { for (const [id, tt] of Array.from(touches)) if (tt.hold) onUp({ pointerId: id, force: true }); holdUI(); }
function holdSet(on) {
  on = !!on; if (HOLD.on === on) return;
  HOLD.on = on;
  if (!on) holdRelease();
  holdUI();
}
function holdUI() {
  const b = document.getElementById('btnHold'); if (!b) return;
  b.setAttribute('aria-pressed', String(HOLD.on));
  let n = 0; for (const tt of touches.values()) if (tt.hold) n++;
  b.classList.toggle('carries', HOLD.on && n > 0);
  b.setAttribute('aria-label', HOLD.on ? 'Halten an' + (n ? ', ' + n + (n === 1 ? ' Ton klingt' : ' Töne klingen') + ' weiter' : '') : 'Halten');
}

// desktop / hardware keyboard: the home row plays the notes from the left edge
const KEYROW = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash'];
function keyNote(e, down) {
  const i = KEYROW.indexOf(e.code);
  if (i < 0 || e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  const id = 'key-' + e.code;
  if (!down) { onUp({ pointerId: id }); return; }
  if (e.repeat || (touches.has(id) && !touches.get(id).hold) || !A.started) return;   // (a held one is struck anew)
  const len = N.free ? 12 * P['t.range'] + 1 : N.notes.length;
  const x = noteX(Math.min(i, len - 1));
  onDown({ pointerId: id, pt: { x, y: e.shiftKey ? 0.85 : 0.55, px: x * VIS.w, py: (e.shiftKey ? 0.15 : 0.45) * VIS.h } });
}

