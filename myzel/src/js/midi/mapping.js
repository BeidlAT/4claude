/* ---------- controller mapping: what knobs, faders, pads and buttons do ---------- */
// Three layers decide; the first with a binding for a message wins: what the player assigned ("Zuweisen", stored per
// device), the device's profile (recognised by its port name, never by an exact one), and – only for what the message
// layer itself leaves unused – the General MIDI defaults ("Standard-Zuordnungen": CC 7 level, CC 91 hall …).
// midiTake(src, ev) runs before the built-in handling, so a binding can claim a message the instrument would otherwise
// read: the nanoKONTROL2's fader 1 sends CC 0, which must not pick a preset bank, and pads set to "Auslöser" must not
// play notes. midiRoute(src, ev) gets what the built-in layer has no use for: knob CCs, CC 74 outside MPE, NRPNs and
// other RPNs, program changes while they do not load presets.
// ev = { type: on|off|cc|bend|press|poly|pc|rpn|nrpn|start|cont|stop|spp|sys, ch (0–15, −1 for system), num, val
// (bend 0–16383, rpn/nrpn 14 bit), t: performance.now() time of arrival }. MIDI.tap(src, ev), if set, sees everything
// except clock and active sensing (the monitor); MIDI.take / MIDI.route are plug-in slots ahead of the layers.
function midiTake(src, ev) {
  if (ev.ch === 15 && gkrTake(src, ev)) return true;   // channel 16: a phone's Gestik over the Funkstrecke (only with its signature)
  if (CB.on && cbIn(src, ev)) return true;   // (26.10.2026: the Gerätebild – lights its controls; while calibrating it takes them)
  if (APC.src && apcIn(src, ev)) return true;   // (26.10.2026: the APC40 MK2's pads in one of its five modes)
  if (MIDI.take && MIDI.take(src, ev) === true) return true;
  if (LEARN.on && learnIn(src, ev)) return true;
  return mapTake(src, ev);
}
function midiRoute(src, ev) {
  if (MIDI.route) MIDI.route(src, ev);
  // RPN and NRPN values are made by the message layer, so they reach learn and the bindings only here
  if (ev.type === 'rpn' || ev.type === 'nrpn') { if ((LEARN.on && learnIn(src, ev)) || mapTake(src, ev)) return; }
  mapStd(src, ev);
}

/* ---------- targets ---------- */
// One registry of everything a controller can drive. Every parameter is a target by its id – on its own curve, the
// mixer's levels on the console's fader law, so a hardware fader reads like the one on screen; actions, scenes, the
// X-Y finger, heights, pedals and the engine macros register here. A target: { key, label, group, cont (a knob makes
// sense: soft takeover, relative steps), noTake, bool (has an on/off state), hit, get(cx) → 0..1, set(n, cx),
// press(v, cx), release(cx), step(d, cx), pidf() (a parameter chosen at the moment) } or just run(v) for a button
// action (1 pressed, 0 released). cx = { src, ev } of the message.
const MTARGETS = new Map();
function midiTarget(key, label, run, o = {}) { MTARGETS.set(key, Object.assign({ key, label, run }, o)); }
// any parameter on its own curve, at once – not device settings, not recording settings
function midiParam(id, n) {
  const d = PD[id];
  if (!d || d.rec || d.dev) return;
  if (d.kind === 'num') { setParam(id, fromNorm(d, n)); return; }
  if (d.kind === 'bool') { setParam(id, n >= 0.5); return; }
  const v = d.opts[Math.min(d.opts.length - 1, Math.floor(clamp(n, 0, 1) * d.opts.length))][0];
  if (noTap(id, v)) return;
  setParam(id, v);
}
const noTap = (id, v) => id === 'kor.src' && (v === 'datei' || v === 'mikro');   // the file picker and the microphone need a tap
const isVolId = (id) => /^x\w+\.vol$/.test(id) || id === 'mix.pulsVol' || id === 'mst.vol';
const MT_P = new Map();
function mtParam(id) {
  if (MT_P.has(id)) return MT_P.get(id);
  const d = Object.prototype.hasOwnProperty.call(PD, id) ? PD[id] : null;   // an imported "constructor" is no parameter
  const T = d && (!d.rec || /^xhxr\.(vol|pan|mute|solo)$/.test(id)) && !d.dev ?   // (26.10.2026: the Hexenring's channel is no part of a patch, but a fader steers it)
    { key: id, pid: id, label: d.label, group: groupOf(id), cont: d.kind !== 'bool', bool: d.kind === 'bool' } : null;
  MT_P.set(id, T);
  return T;
}
const mtOf = (key) => (typeof key !== 'string' ? null : MTARGETS.get(key) || mtParam(key));
const tPid = (T) => (T.pidf ? T.pidf() : T.pid);
// a parameter's place 0..1 as a controller sees it; a value still waiting for the next frame counts
function pNorm(id) {
  const d = PD[id], v = MAP.pend.has(id) ? MAP.pend.get(id) : P[id];
  if (isVolId(id)) return mxPos(v);
  if (d.kind === 'num') return clamp(toNorm(d, v), 0, 1);
  if (d.kind === 'bool') return v ? 1 : 0;
  // a choice sits in the middle of its share of the knob's travel (pSet picks by share), so soft takeover meets it
  // wherever the knob already selects it
  return (Math.max(0, d.opts.findIndex((o) => o[0] === v)) + 0.5) / d.opts.length;
}
function pSet(id, n, fine) {
  const d = PD[id];
  n = clamp(n, 0, 1);
  let v;
  if (isVolId(id)) { const db = mxDb(n); v = db <= -59.6 ? d.min : Math.abs(db) < 0.4 && !fine ? 0 : clamp(Math.round(db * 10) / 10, d.min, d.max); }   // 0 dB catches a fader, as on screen
  else if (d.kind === 'num') v = fromNorm(d, n);
  else if (d.kind === 'bool') v = n >= 0.5;
  else v = d.opts[Math.min(d.opts.length - 1, Math.floor(n * d.opts.length))][0];
  if (!noTap(id, v)) mapWrite(id, v);
}
// d ticks of a relative encoder: one step of a stepped param per tick (Tempo 1 BPM, a balance 1 %), a choice one
// option, everything else 1 % of its travel
function pStep(id, d) {
  const D = PD[id], v = MAP.pend.has(id) ? MAP.pend.get(id) : P[id];
  if (D.kind === 'bool') { mapWrite(id, d > 0); return; }
  if (D.kind === 'sel') { selStep(id, Math.sign(d), false); return; }
  if (!isVolId(id) && D.step && (D.max - D.min) / D.step <= 400) { mapWrite(id, clamp(v + d * D.step, D.min, D.max)); return; }
  pSet(id, pNorm(id) + d / 100, true);
}
function selStep(id, d, wrap) {
  const D = PD[id], v = MAP.pend.has(id) ? MAP.pend.get(id) : P[id], n = D.opts.length, i = D.opts.findIndex((o) => o[0] === v) + d;
  const nv = D.opts[wrap ? ((i % n) + n) % n : clamp(i, 0, n - 1)][0];
  if (!noTap(id, nv)) mapWrite(id, nv);
}
const tGet = (T, cx) => (T.get ? T.get(cx) : tPid(T) ? pNorm(tPid(T)) : null);
function tSet(T, n, cx) { if (T.set) T.set(n, cx); else if (tPid(T)) pSet(tPid(T), n); else if (n >= 0.5) tPress(T, 1, cx); }
function tPress(T, v, cx) { if (T.press) T.press(v, cx); else if (T.run) T.run(1, cx); else tSet(T, 1, cx); }
function tRelease(T, cx) { if (T.release) T.release(cx); else if (T.run) T.run(0, cx); }
function tStep(T, d, cx) {
  if (T.step) T.step(d, cx);
  else if (tPid(T)) pStep(tPid(T), d);
  else if (T.bool) tSet(T, d > 0 ? 1 : 0, cx);
  else if (T.get) tSet(T, clamp(T.get(cx) + d / 100, 0, 1), cx);
  else if (d > 0) tPress(T, 1, cx);
}
// what the player reads: "Kanal Spur 1 · Pegel", "Klang-Makro A (Nebel: Frequenz)"
function tName(T) {
  if (T.mod) return 'Formen · ' + T.label;
  if (T.pidf) { const id = T.pidf(); return T.label + ' (' + (ENG_NAME[P['v.eng']] || '') + ': ' + PD[id].label + ')'; }
  return (T.group && T.pid ? T.group + ' · ' : '') + T.label;
}

// actions with a state of their own (the Puls runs or not): a press flips it, a switch that holds sets it
function onOff(key, label, group, get, set) {
  midiTarget(key, label, (v) => { if (v >= 0.5) set(!get()); }, { group, button: true, bool: true, get: () => (get() ? 1 : 0), set: (n) => { if ((n >= 0.5) !== !!get()) set(n >= 0.5); } });
}
onOff('puls', 'Puls starten/anhalten', 'Puls', () => SEQ.on, (on) => { if (!A.started) midiHint(); else if (on) { if (!SEQ.on) pulsGo(); } else seqStop(); });
midiTarget('puls.start', 'Puls starten', (v) => { if (v >= 0.5 && A.started && !SEQ.on) pulsGo(); }, { group: 'Puls', button: true });
midiTarget('puls.stop', 'Puls anhalten', (v) => { if (v >= 0.5 && SEQ.on) seqStop(); }, { group: 'Puls', button: true });
// pairs that step through a list: a button steps its way, a relative encoder either way
function stepPair(up, down, lu, ld, group, fn, tick) {
  midiTarget(up, lu, (v) => { if (v >= 0.5) fn(1); }, { group, button: true, step: (d) => (tick || fn)(Math.sign(d)) });
  midiTarget(down, ld, (v) => { if (v >= 0.5) fn(-1); }, { group, button: true, step: (d) => (tick || fn)(-Math.sign(d)) });
}
// an encoder browsing presets loads the one it rests on, not every one it passes
function presetTick(d) {
  MAP.pstep += d; clearTimeout(MAP.pT);
  MAP.pT = setTimeout(() => { const n = MAP.pstep; MAP.pstep = 0; if (n) presetStep(n); }, 150);
}
stepPair('preset.next', 'preset.prev', 'Nächstes Preset', 'Voriges Preset', 'Presets', (d) => presetStep(d), presetTick);
onOff('freeze', 'Echo einfrieren', 'Echo', () => A.frozen, (on) => { if (A.started) setFreeze(on); });
onOff('rec', 'Aufnahme starten/beenden', 'Aufnahme', () => CAP.state !== 'idle', () => recToggle());
midiTarget('stille', 'Stille (alles stoppen)', (v) => { if (v >= 0.5) panic(); }, { group: 'Spielweise', button: true });
midiTarget('tap', 'Tempo tippen', (v) => { if (v >= 0.5) tapTempo(); }, { group: 'Puls', button: true });
stepPair('root.up', 'root.down', 'Grundton höher', 'Grundton tiefer', 'Stimmung', (d) => selStep('t.root', d, true));
stepPair('scale.up', 'scale.down', 'Nächste Skala', 'Vorige Skala', 'Stimmung', (d) => selStep('t.scale', d, true));
stepPair('oct.up', 'oct.down', 'Oktave höher', 'Oktave tiefer', 'Spielweise', (d) => pStep('v.oct', d));
stepPair('deg.up', 'deg.down', 'Tonstufe höher', 'Tonstufe tiefer', 'Spielweise', (d) => pStep('v.deg', d));
for (let i = 0; i < 4; i++) midiTarget('hit.' + i, 'Spur ' + (i + 1) + ' anschlagen', (v) => { if (v > 0) laneHit(i, 1); }, { group: 'Puls', button: true, hit: true, press: (v) => laneHit(i, v) });
// scenes are the mixer's snapshots A and B; the morph blends them
midiTarget('scene.a', 'Szene A', (v) => { if (v >= 0.5) sceneGo(0); }, { group: 'Mixer', button: true });
midiTarget('scene.b', 'Szene B', (v) => { if (v >= 0.5) sceneGo(1); }, { group: 'Mixer', button: true });
midiTarget('scene.ab', 'Szene A/B wechseln', (v) => { if (v >= 0.5) sceneGo(MX.mUI < 0.5 ? 1 : 0); }, { group: 'Mixer', button: true });
midiTarget('morph', 'Morph A↔B', null, { group: 'Mixer', cont: true, get: () => (MAP.morphN != null ? MAP.morphN : MX.mUI), set: (n) => morphSet(n) });
// the active engine's two most expressive parameters, whichever engine plays
const MACRO = { neb: ['neb.cut', 'neb.res'], kor: ['kor.dens', 'kor.size'], hau: ['hau.color', 'hau.q'], glo: ['glo.index', 'glo.ratio'], mem: ['mem.drop', 'mem.decay'],
  sai: ['sai.bright', 'sai.decay'], sch: ['sch.bright', 'sch.beat'], gng: ['gng.bloom', 'gng.bright'], klb: ['klb.over', 'klb.buzz'], obt: ['obt.focus', 'obt.wander'],
  stm: ['stm.vib', 'stm.choir'], swm: ['swm.chaos', 'swm.unrest'], tie: ['tie.drive', 'tie.drop'], trp: ['trp.chirp', 'trp.rain'],
  nrd: ['nrd.vorhang', 'nrd.schimmer'], sht: ['sht.schimmer', 'sht.raum'], ond: ['ond.vibrato', 'ond.palme'], wal: ['wal.bogen', 'wal.knarren'], stp: ['stp.tempo', 'stp.spanne'], atr: ['atr.mischung', 'atr.farbe'], tnl: ['tnl.tempo', 'tnl.tiefe'], wkg: ['wkg.faltung', 'wkg.fm'], bnt: ['bnt.sprung', 'bnt.stottern'], kas: ['kas.alter', 'kas.waerme'], bit: ['bit.arpeggio', 'bit.leben'], gbs: ['gbs.gleiten', 'gbs.knack'], hht: ['hht.ton', 'hht.wirbel'], vox: ['vox.konsonant', 'vox.groesse'], spu: ['spu.glanz', 'spu.uhrwerk'], kto: ['kto.druck', 'kto.nagel'], hng: ['hng.glanz', 'hng.nachklang'], gml: ['gml.ombak', 'gml.schlegel'], sit: ['sit.jawari', 'sit.tarab'], tbl: ['tbl.syahi', 'tbl.gamak'], did: ['did.knurren', 'did.rohr'], mtr: ['mtr.mund', 'mtr.zupfen'],
  hlm: ['hlm.atem', 'hlm.blatt'], rnk: ['rnk.feder', 'rnk.daempfung'], elm: ['elm.spannung', 'elm.knistern'], jrg: ['jrg.schnitt', 'jrg.holz'], hrz: ['hrz.druck', 'hrz.harz'], shn: ['shn.ebow', 'shn.daempfung'], zpf: ['zpf.rast', 'zpf.klang'], glt: ['glt.gluehen', 'glt.hitze'], mdr: ['mdr.pilz', 'mdr.knistern'], boe: ['boe.wind', 'boe.fang'], amo: ['amo.zeit', 'amo.punkte'], gsp: ['gsp.kopplung', 'gsp.nachklang'], rhz: ['rhz.reiz', 'rhz.weg'], khl: ['khl.druck', 'khl.rauheit'] };
const macroId = (k) => (MACRO[P['v.eng']] || MACRO.neb)[k];
midiTarget('macro.a', 'Klang-Makro A', null, { group: 'Klang', cont: true, pidf: () => macroId(0) });
midiTarget('macro.b', 'Klang-Makro B', null, { group: 'Klang', cont: true, pidf: () => macroId(1) });
// the colour of the device's notes – their height on the field, not their pitch (like the modulation wheel and CC 2,
// but from any control and channel)
midiTarget('up', 'Klangfarbe heller (Höhe auf der Spielfläche)', null, { group: 'Spielweise', cont: true, noTake: true, get: (cx) => cx.src.up || 0, set: (n, cx) => { if (cx.src.up !== n) { cx.src.up = n; midiRecolor(); } } });
midiTarget('dark', 'Klangfarbe dunkler', null, { group: 'Spielweise', cont: true, noTake: true, get: (cx) => cx.src.dark || 0, set: (n, cx) => { if (cx.src.dark !== n) { cx.src.dark = n; midiRecolor(); } } });
midiTarget('hold', 'Halten (losgelassene Töne klingen weiter)', null, { group: 'Spielweise', bool: true, get: () => (HOLD.on ? 1 : 0), set: (n) => holdSet(n >= 0.5) });   // (25.10.2026)
// pedals from any control: they hold the notes of the whole device
for (const [key, cc, label] of [['sus', 64, 'Haltepedal'], ['sost', 66, 'Sostenuto-Pedal'], ['soft', 67, 'Leisepedal (leiser und dunkler)']]) {
  midiTarget(key, label, null, { group: 'Spielweise', bool: true, get: (cx) => { const cs = chState(cx.src, Math.max(0, cx.ev.ch)); return (cc === 64 ? cs.sus : cc === 66 ? cs.sost : cs.soft) ? 1 : 0; }, set: (n, cx) => srcPedal(cx.src, cc, n >= 0.5, cx.ev.ch) });
}
// expression (CC 11): a share of the level of Klang and Ebene 2, on top of their faders
midiTarget('expr', 'Ausdruck (Klang und Ebene 2)', null, { group: 'Mixer', cont: true, noTake: true, get: () => Math.sqrt(MIDI.expr), set: (n, cx) => exprSet(n * n, cx.src) });
midiTarget('xy.x', 'X-Y-Pad als Finger: X (Tonhöhe)', null, { group: 'Spielweise', cont: true, noTake: true, get: (cx) => xyOf(cx.src).x, set: (n, cx) => xyIn(cx.src, 'x', n) });
midiTarget('xy.y', 'X-Y-Pad als Finger: Y (Klangfarbe)', null, { group: 'Spielweise', cont: true, noTake: true, get: (cx) => xyOf(cx.src).y, set: (n, cx) => xyIn(cx.src, 'y', n) });
midiTarget('xy.gate', 'X-Y-Pad als Finger: Berührung', null, { group: 'Spielweise', bool: true, get: (cx) => (xyOf(cx.src).gate ? 1 : 0), set: (n, cx) => xyGate(cx.src, n >= 0.5) });

function presetStep(dir) {
  const i = PRESETS.findIndex((p) => p.key === UI.preset), n = PRESETS.length;
  loadPreset(PRESETS[i < 0 ? (dir > 0 ? 0 : n - 1) : (((i + dir) % n) + n) % n]);
}
// "Tempo tippen": the Puls takes the tempo of the last taps (two or more, each within two seconds of the one before)
function tapTempo() {
  const t = performance.now(), T = MAP.taps;
  if (T.length && t - T[T.length - 1] > 2000) T.length = 0;
  T.push(t);
  if (T.length > 5) T.shift();
  if (T.length < 2 || SEQ.ext) return;
  const d = PD['seq.bpm'];
  setParam('seq.bpm', clamp(Math.round(60000 * (T.length - 1) / (T[T.length - 1] - T[0])), d.min, d.max));
}
// a pad strikes a Puls lane the way the Puls does on a step – its sound, pitch, brightness, Pumpen – as hard as the pad
function laneHit(i, v) {
  MIDI.flash = performance.now();
  if (!A.started || !A.ctx) { midiHint(); return; }
  ensureRunning();
  const t = A.ctx.currentTime, pre = 'l' + i + '.', nt = laneNote(i), k = P['midi.vel'] ? clamp(1.33 * Math.pow(clamp(v, 0, 1), 1.6), 0.05, 1) : 1, vel = P[pre + 'vol'] * k;
  const br = MOD.t.pulsH.s.size ? clamp(P[pre + 'bright'] + 0.5 * modVal('pulsH', t), 0, 1) : P[pre + 'bright'];   // Formen · Puls-Helligkeit
  hit(P[pre + 'eng'], t, nt.f, br, vel, { pan: P[pre + 'pan'], gate: divBeats(P[pre + 'div']) * 54 / seqBpm(), bus: stripIn('l' + i) });
  if (P['mix.duckSrc'] === String(i)) duckHit(t, i);
  noteEvent(t);
  visPush({ t, kind: 'hit', x: nt.x, y: 0.15 + br * 0.7, lane: i, s: vel });
  if (RG.ps) rgPuls(t, nt.f, nt.x, 0.15 + br * 0.7);
}
function srcPedal(src, cc, on, ch) {
  chState(src, Math.max(0, ch));
  for (const cs of src.chs) if (cs && !chRole(cs).mem) midiPedal(cs, cc, on);
}
function exprSet(g, src) {
  if (g === MIDI.expr) return;
  MIDI.expr = g; MIDI.exprSrc = src;
  if (A.ctx) for (const k of EB_K) if (MIX.s[k]) setP(MIX.s[k].in.gain, stripGain(MIX.s[k]), 0.012);
  // the mixer says it (once a frame at most – a pedal sends many values)
  if (MX.root && !MIDI.exprUI) MIDI.exprUI = requestAnimationFrame(() => { MIDI.exprUI = 0; mxSrcAll(); });
}
// A and B: the open mixer glides there as from its own buttons; closed, it is there at once
function sceneGo(m) {
  if (!MX.snap.a) return;
  if (MX.open || !mxSnapDiff()) { mxMorphTo(m, true); return; }   // equal A and B: the mixer's own hint
  MAP.morphN = null; MX.glide = null; MX.mUI = m; mxMorphApply(m);
}
// the morph from a fader: the open mixer applies it in its frame, otherwise here – at most every 40 ms either way
function morphSet(n) {
  if (!MX.snap.a) return;
  if (!mxSnapDiff()) { mxMorphTo(n); return; }
  MX.glide = null; MX.mUI = n;
  if (MX.open) { MX.morphPend = n; mxMorphDraw(); return; }
  MAP.morphN = n;
  if (!MAP.due) MAP.due = setTimeout(mapFlush, 40);
}

/* ---------- the X-Y pad as a finger ---------- */
// The pad's two axes and its touch become one more finger on the field: touching strikes, moving glides like a finger
// (with Gleiten), lifting releases. The position may come just before or just after the touch, so a touch waits up to
// 30 ms for it. A pad that never sends its touch plays from the first move and lets go 0,6 s after the last.
const xyOf = (src) => src.xy || (src.xy = { id: 'midi-xy-' + src.key, x: 0.5, y: 0.5, t: 0, gate: false, gated: false, tm: 0 });
function xyIn(src, ax, n) {
  const X = xyOf(src);
  X[ax] = n; X.t = performance.now();
  const tt = touches.get(X.id);
  if (tt) moveTouch(tt, { x: X.x, y: X.y, px: X.x * VIS.w, py: (1 - X.y) * VIS.h });
  else if (X.gate || !X.gated) xyDown(src, X);
  if (!X.gated) { clearTimeout(X.tm); X.tm = setTimeout(() => xyUp(X), 600); }
}
function xyGate(src, on) {
  const X = xyOf(src);
  X.gated = true; X.gate = on; clearTimeout(X.tm);
  if (!on) { xyUp(X); return; }
  if (performance.now() - X.t < 40) xyDown(src, X);
  else X.tm = setTimeout(() => { if (X.gate && !touches.has(X.id)) xyDown(src, X); }, 30);
}
function xyDown(src, X) {
  if (MIDI.srcs.get(src.key) !== src || !src.enabled || src.dup) return;   // the device went while the touch waited
  MIDI.flash = performance.now();
  if (!A.started) { midiHint(); return; }
  onDown({ pointerId: X.id, pt: { x: X.x, y: X.y, px: X.x * VIS.w, py: (1 - X.y) * VIS.h } });
  const tt = touches.get(X.id);
  if (tt) tt.msrc = src;   // so the device's "all notes off" and its disconnect lift it too
}
function xyUp(X) { clearTimeout(X.tm); if (touches.has(X.id)) onUp({ pointerId: X.id }); }

