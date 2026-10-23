/* ---------- device profiles ---------- */
// Matched by port name (Web MIDI and Bluetooth name the same keyboard differently; Windows cuts names to 31
// characters), switchable per device, every binding overridable by "Zuweisen". Channels are "any" unless the device
// gives a role to one, so a changed global channel does not lose the knobs.
const PB = (type, ch, num, target, mode, o) => Object.assign({ type, ch, num, target, mode: mode || 'abs' }, o);
const pcc = (nums, targets, name, o) => nums.map((n, i) => targets[i] && PB('cc', -1, n, targets[i], 'abs', Object.assign({ name: name + ' ' + (i + 1) }, o))).filter(Boolean);
// the eight knobs of a keyboard: Filter, the engine's two macros, Echo, Hall, second layer, the Puls, the A↔B morph
const BANK8 = ['flt.freq', 'macro.a', 'macro.b', 'dly.mix', 'rev.mix', 'v.layerLvl', 'mix.pulsVol', 'morph'];
const BANK8B = ['flt.q', 'v.glide', 'dly.fb', 'cho.mix', 'pha.mix', 'mov.vib', 'mov.pan', 'drv.amt'];
// eight mixer channels in the order of a fader bank
const STRIP8 = ['fin', 'eb2', 'l0', 'l1', 'l2', 'l3', 'bor', 'rev'];
const S8 = (s) => STRIP8.map((k) => 'x' + k + '.' + s);
// pads in pad order: Spur 1–4 strike, then Puls, Bordun, Freeze, Stille, then presets, scenes, root and octave
const PADFN = [['hit.0', 'trigger'], ['hit.1', 'trigger'], ['hit.2', 'trigger'], ['hit.3', 'trigger'], ['puls', 'toggle'], ['bor.on', 'toggle'], ['freeze', 'toggle'], ['stille', 'trigger'],
  ['preset.prev', 'trigger'], ['preset.next', 'trigger'], ['scene.a', 'trigger'], ['scene.b', 'trigger'], ['root.down', 'trigger'], ['root.up', 'trigger'], ['oct.down', 'trigger'], ['oct.up', 'trigger']];
// notes → pad functions; ch: 9 (channel 10) or −1, when: 'pads' or none (pad controllers: always)
const ppads = (notes, ch, when, first = 0) => notes.map((n, i) => PB('note', ch, n, PADFN[(first + i) % 16][0], PADFN[(first + i) % 16][1], { name: 'Pad ' + (first + i + 1), when }));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const MPROF = [
  { id: 'nks', name: 'KORG nanoKEY Studio', re: /nano\s*KEY\s*Studio/i, what: 'Regler, X-Y-Pad, Pads, Pitch/Mod', clock: 1,
    hint: 'Pads und Tasten teilen sich Kanal 1 (Noten 48–50). Stellst du im KORG KONTROL Editor den Kanal der Pads auf 10, sind die Pads immer Auslöser und alle Tasten bleiben Töne.',
    binds: [
      ...pcc(range(20, 27), BANK8, 'Regler'),
      PB('cc', -1, 16, 'xy.x', 'abs', { name: 'X-Y-Pad X' }), PB('cc', -1, 17, 'xy.y', 'abs', { name: 'X-Y-Pad Y' }), PB('cc', -1, 18, 'xy.gate', 'momentary', { name: 'X-Y-Pad Berührung' }),
      PB('cc', -1, 19, 'up', 'abs', { name: 'Touch Scale Y', tent: 1 }),
      // scenes 2 and 3 as one source reported them (unconfirmed): the strips' faders, then their balances
      ...pcc([28, 29, 30, 31, 33, 34, 35, 36], S8('vol'), 'Szene 2 · Regler', { tent: 1 }),
      ...pcc(range(37, 44), S8('pan'), 'Szene 3 · Regler', { tent: 1 }),
      // pads: on channel 10 always triggers; on the keys' channel only with "Pads als Auslöser" (they share 48–50
      // with the keys) – top row Spur 1–4, bottom row Puls, Bordun, Freeze, Stille
      ...ppads([43, 48, 50, 49, 36, 38, 42, 46], 9), ...ppads([43, 48, 50, 49, 36, 38, 42, 46], -1, 'pads'),
    ],
    ctrls: [['Regler 1–8 (CC 20–27)', 'Filter, Klang-Makro A, Klang-Makro B, Echo, Hall, Ebene 2, Puls gesamt, Morph A↔B'], ['X-Y-Pad (CC 16/17/18)', 'ein Finger auf der Spielfläche'],
      ['Pitch/Mod', 'Tonhöhe und Klangfarbe'], ['Touch Scale', 'spielt Töne, Y (CC 19) macht die Klangfarbe heller'], ['Pads', 'spielen Töne – mit „Pads als Auslöser“ Spur 1–4, Puls, Bordun, Freeze, Stille'],
      ['Arpeggiator, Chord Pad, Easy Scale', 'spielen Töne wie die Tasten'], ['Sustain', 'Haltepedal'], ['Bluetooth', 'Schalter auf Battery; in Stellung USB: Shift + Pad 4']],
    count: 1 },
  { id: 'mk', name: 'KORG microKEY', re: /micro\s*KEY/i, what: 'Tasten, Joystick, Sustain', clock: 1, count: 1,
    binds: [],   // joystick X = bend, +Y CC 1 brighter, −Y CC 2 darker, press CC 67 softer, SUSTAIN CC 64: the message layer does all of it
    ctrls: [['Joystick ←→', 'Tonhöhe'], ['Joystick ↑ (CC 1)', 'heller'], ['Joystick ↓ (CC 2)', 'dunkler'], ['Joystick drücken (CC 67)', 'leiser und dunkler, solange gedrückt'], ['SUSTAIN (CC 64)', 'Haltepedal'],
      ['Arpeggiator', 'spielt Töne wie die Tasten'], ['Pedal (CC 64) / Mod-Rad (CC 1)', 'Haltepedal / heller']] },
  { id: 'nk2', name: 'KORG nanoKONTROL2', re: /nano\s*KONTROL\s*2/i, what: 'Fader, Regler, S/M/R und Transport für den Mixer', own: 1,
    hint: 'Im CC-Modus: beim Einschalten SET MARKER und CYCLE gedrückt halten.',
    binds: [
      ...pcc(range(0, 7), S8('vol'), 'Fader'), ...pcc(range(16, 23), S8('pan'), 'Regler'),
      ...range(32, 39).map((n, i) => PB('cc', -1, n, 'x' + STRIP8[i] + '.solo', 'toggle', { name: 'S ' + (i + 1) })),
      ...range(48, 55).map((n, i) => PB('cc', -1, n, 'x' + STRIP8[i] + '.mute', 'toggle', { name: 'M ' + (i + 1) })),
      ...[[66, 'l0.on'], [67, 'l1.on'], [68, 'l2.on'], [69, 'l3.on'], [70, 'bor.on']].map(([n, t]) => PB('cc', -1, n, t, 'toggle', { name: 'R ' + (n - 63) })),
      PB('cc', -1, 41, 'puls', 'toggle', { name: 'Play' }), PB('cc', -1, 42, 'puls.stop', 'trigger', { name: 'Stop' }), PB('cc', -1, 45, 'rec', 'toggle', { name: 'Rec' }),
      PB('cc', -1, 46, 'scene.ab', 'trigger', { name: 'Cycle' }), PB('cc', -1, 61, 'scene.a', 'trigger', { name: 'Marker ◀' }), PB('cc', -1, 62, 'scene.b', 'trigger', { name: 'Marker ▶' }),
      PB('cc', -1, 58, 'preset.prev', 'trigger', { name: 'Track ◀' }), PB('cc', -1, 59, 'preset.next', 'trigger', { name: 'Track ▶' }),
      PB('cc', -1, 60, 'hx.nkset', 'trigger', { name: 'Set' }),   // Hexenring: SET switches to its page and back
    ],
    ctrls: [['Fader 1–8', 'Pegel: Klang, Ebene 2, Spur 1–4, Bordun, Hall'], ['Regler 1–8', 'Balance derselben'], ['S / M', 'Solo / Stumm'], ['R 3–7', 'Spur 1–4 an/aus, Bordun'],
      ['Play / Stop / Rec', 'Puls, Aufnahme'], ['Cycle, Marker ◀ ▶', 'Szene A/B'], ['Track ◀ ▶', 'Preset'],
      ['Set', 'Seite Hexenring: Fader Pegel, Regler Eigensinn, S Solo, M stumm am Takt, R aufnehmen/schließen/überspielen, Cycle Korb, ◀◀ ▶▶ Zurück/Wiederholen, Marker Lichtung ◀ ▶, ■ ▶ alle enden/beginnen am Takt, Track ✕/✓ – Set noch einmal: Mixer'],
      ['Betriebsart', 'CC-Modus (SET MARKER + CYCLE beim Einschalten)']] },
  { id: 'np2', name: 'KORG nanoPAD2', re: /nano\s*PAD/i, what: 'Pads als Auslöser; X-Y-Pad zuweisbar',
    binds: [...ppads(range(0, 7).map((i) => 36 + 2 * i), -1), ...ppads(range(0, 7).map((i) => 37 + 2 * i), -1, undefined, 8)],
    ctrls: [['Pads', 'Spur 1–4, Puls, Bordun, Freeze, Stille, Presets, Szenen, Grundton, Oktave'], ['X-Y-Pad', 'unter „Zuweisen“: X, Y und Berührung zu „X-Y-Pad als Finger“']] },
  { id: 'mpk', name: 'Akai MPK mini', re: /MPK\s*mini/i, what: 'Regler, Pads, Joystick, Transport', clock: 1,
    binds: [...pcc(range(70, 77), BANK8, 'Regler'), ...ppads(range(36, 51), 9, 'pads'),
      PB('cc', -1, 115, 'preset.prev', 'trigger', { name: '◀◀' }), PB('cc', -1, 116, 'preset.next', 'trigger', { name: '▶▶' }), PB('cc', -1, 117, 'puls.stop', 'trigger', { name: 'Stop' }),
      PB('cc', -1, 118, 'puls', 'toggle', { name: 'Play' }), PB('cc', -1, 119, 'rec', 'toggle', { name: 'Rec' })] },
  { id: 'mpd', name: 'Akai MPD218', re: /MPD\s*218/i, what: 'Pads als Auslöser, Regler',
    binds: [...pcc([3, 9, 12, 13, 14, 15], BANK8, 'Regler'), ...pcc(range(16, 21), S8('vol'), 'Bank B · Regler'), ...pcc(range(22, 27), S8('pan'), 'Bank C · Regler'),
      ...ppads(range(36, 51), 9), ...ppads(range(52, 67), 9), ...ppads(range(68, 83), 9)] },
  { id: 'lpd', name: 'Akai LPD8', re: /LPD\s*8/i, what: 'Pads als Auslöser, Regler',
    binds: [...pcc(range(1, 8), BANK8, 'Regler'), ...pcc(range(70, 77), BANK8, 'Regler'), ...ppads(range(36, 43), -1)] },
  { id: 'ml3', name: 'Arturia MiniLab 3', re: /mini\s*lab\s*3|minilab37/i, what: 'Regler, Fader, Pads, Transport',
    binds: [...pcc([74, 71, 76, 77, 93, 18, 19, 16], BANK8, 'Regler'), ...pcc([86, 87, 89, 90, 110, 111, 116, 117], BANK8, 'Regler'),
      ...pcc([82, 83, 85, 17], ['xfin.vol', 'xeb2.vol', 'xbor.vol', 'mix.pulsVol'], 'Fader'), ...pcc([14, 15, 30, 31], ['xfin.vol', 'xeb2.vol', 'xbor.vol', 'mix.pulsVol'], 'Fader'),
      ...ppads(range(36, 51), 9, 'pads'), PB('cc', -1, 28, 'preset.next', 'relBO', { name: 'Drehregler' }),
      PB('cc', -1, 105, 'scene.ab', 'trigger', { name: 'Loop' }), PB('cc', -1, 106, 'puls.stop', 'trigger', { name: 'Stop' }), PB('cc', -1, 107, 'puls', 'toggle', { name: 'Play' }),
      PB('cc', -1, 108, 'rec', 'toggle', { name: 'Record' }), PB('cc', -1, 109, 'tap', 'trigger', { name: 'Tap' })] },
  { id: 'ks', name: 'Arturia KeyStep', re: /KeyStep/i, what: 'Regler, Touch-Streifen', clock: 1, binds: pcc([74, 71, 76, 77], BANK8, 'Regler') },
  { id: 'lk3', name: 'Novation Launchkey Mini mk3', re: /Launchkey(\s*Mini)?\s*MK3/i, what: 'Regler (Custom), Pads, Transport',
    binds: [...pcc(range(21, 28), BANK8, 'Regler'), ...ppads(range(36, 51), 9, 'pads'), PB('cc', 15, 115, 'puls', 'toggle', { name: 'Play' }), PB('cc', 15, 117, 'rec', 'toggle', { name: 'Record' })] },
  { id: 'lk4', name: 'Novation Launchkey mk4', re: /Launchkey.*MK4/i, what: 'Regler, Fader, Pads, Transport',
    binds: [...pcc(range(21, 28), BANK8, 'Regler'), ...pcc(range(29, 36), BANK8B, 'Regler Seite 2'), ...pcc(range(71, 79), S8('vol').concat('mst.vol'), 'Fader'),
      ...range(11, 18).map((n, i) => PB('cc', 15, n, 'x' + STRIP8[i] + '.mute', 'toggle', { name: 'Fader-Taste ' + (i + 1) })),
      ...ppads(range(36, 51), 9, 'pads'), PB('cc', 15, 117, 'rec', 'toggle', { name: 'Record' })] },
  { id: 'nlx', name: 'Nektar Impact', re: /Impact\s*(LX|GX)/i, what: 'Fader, Regler, Tasten (Kanal 16)',
    binds: [...range(12, 19).map((n, i) => PB('cc', 15, n, S8('vol')[i], 'abs', { name: 'Fader ' + (i + 1) })), PB('cc', 15, 20, 'mst.vol', 'abs', { name: 'Master' }),
      ...range(21, 28).map((n, i) => PB('cc', 15, n, 'x' + STRIP8[i] + '.mute', 'toggle', { name: 'Taste ' + (i + 1) })),
      ...range(30, 37).map((n, i) => PB('cc', 15, n, BANK8[i], 'abs', { name: 'Regler ' + (i + 1) }))] },
  // MPE controllers that do not announce their zone (the RISE gets its MCM from the DAW): with MPE on Auto they play in
  // the usual lower zone (members 2–16, range 48) – an MCM still overrides, and in single-channel mode (all on channel 1,
  // the manager) nothing changes
  { id: 'rise', name: 'ROLI Seaboard RISE', re: /Seaboard\s*RISE/i, what: 'MPE, Schieberegler', mpe: 1,
    binds: pcc([107, 109, 111], ['macro.a', 'macro.b', 'rev.mix'], 'Schieberegler') },
  { id: 'mpe', name: 'MPE-Controller', re: /Seaboard|LUMI|Lightpad|LinnStrument|Osmose|\bMorph\b|Continuum/i, what: 'MPE – jeder Ton biegt, drückt und färbt sich für sich', mpe: 1, binds: [] },
];
function profOf(src) { if (src.gkr) return GKF_PROF; for (const p of MPROF) if (p.re.test(src.name)) return p; return null; }
// a profile binding taken from a single unconfirmed source
const TENT_TXT = 'vermutet – bei Abweichung zuweisen';
// a binding's life on one device: at (last use, for the activity light), wait (a knob not yet picked up), down
const mapState = (src, b) => (src.bst && src.bst.get(b)) || null;
const profOn = (src) => portPref(src).prof !== false;
// "KORG nanoKEY Studio erkannt – Regler, X-Y-Pad, Pads, Pitch/Mod"
const profText = (src) => { mapOf(src); return src.prof ? src.prof.name + ' erkannt – ' + src.prof.what + (profOn(src) ? '' : ' (Profil aus)') : ''; };
// General MIDI defaults for every source, for what no learned or profile binding claims (CC 1, 2, 64, 66, 67 are the
// message layer's own: heights and pedals per channel)
const STD = {};
for (const [n, t] of [[7, 'xfin.vol'], [10, 'xfin.pan'], [11, 'expr'], [71, 'flt.q'], [74, 'flt.freq'], [91, 'rev.mix'], [93, 'cho.mix'], [95, 'pha.mix'], [5, 'v.glide']]) STD[n] = PB('cc', -1, n, t, 'abs', { name: 'CC ' + n, std: 1 });

// each source's bindings by message: 'cc:0:21' (channel 1) and 'cc:*:21' (any), each { u: learned, p: profile }
const bKeys = (b) => { const c = b.ch < 0 ? '*' : b.ch, k = [b.type + ':' + c + ':' + b.num]; if (b.hires && b.type === 'cc') k.push('cc:' + c + ':' + (b.num + 32)); return k; };
function mapOf(src) {
  if (src.mapV === MAP.v) return src.map;
  const M = new Map(), add = (l, b) => { for (const k of bKeys(b)) { let e = M.get(k); if (!e) M.set(k, (e = { u: [], p: [] })); e[l].push(b); } };
  for (const b of MAP.user) if (b.dev === '*' || sameDev(b.dev, src.name)) add('u', b);
  src.prof = profOf(src);
  if (src.prof && profOn(src)) for (const b of hxProfBinds(src, src.prof)) add('p', b);   // (Hexenring: the nanoKONTROL2's page, the nanoKEY's pads)
  src.map = M; src.mapV = MAP.v;
  return M;
}
// the bindings of one layer that apply now: the exact channel's before "any channel"
function mapLayer(e1, e2, l) {
  for (const e of [e1, e2]) {
    const L = e && e[l];
    if (!L || !L.length) continue;
    const r = L.filter((b) => !b.when || WHEN[b.when]());
    if (r.length) return r;
  }
  return null;
}
function mapTake(src, ev) {
  const k = KIND[ev.type];
  if (!k) return false;
  if (k === 'cc') chState(src, ev.ch).cc[ev.num] = ev.val;   // also for claimed CCs: 14-bit pairs, the monitor
  const M = mapOf(src);
  // a controller made only for the mixer (own): its other buttons send CC 64, 65, 71 … – never as pedals or GM sound
  const own = k === 'cc' && src.prof && src.prof.own && profOn(src);
  if (!M.size) return own;
  const num = k === 'bend' || k === 'press' ? -1 : ev.num, e1 = M.get(k + ':' + ev.ch + ':' + num), e2 = M.get(k + ':*:' + num);
  if (!e1 && !e2) return own;
  const l = mapLayer(e1, e2, 'u') || mapLayer(e1, e2, 'p');
  if (!l) return own;
  // a key let go that still sounds (pads became "Auslöser" while one was held) ends as a note
  if (ev.type === 'off' && MIDI.notes.has(midiId(src, ev.ch, ev.num))) return false;
  let took = false;
  for (const b of l) if (b.target != null && mapApply(b, src, ev)) took = true;   // a learned "nothing" leaves it to the instrument
  return took;
}
function mapStd(src, ev) {
  if (ev.type !== 'cc' || !P['midi.std']) return;
  const b = STD[ev.num];
  if (!b) return;
  const M = mapOf(src);
  if (M.has('cc:' + ev.ch + ':' + ev.num) || M.has('cc:*:' + ev.num)) return;   // assigned to nothing, or a pad set that is off
  mapApply(b, src, ev);
}

/* ---------- learned bindings: stored per device name ---------- */
const KIND_T = { cc: 1, note: 1, pc: 1, bend: 1, press: 1, rpn: 1, nrpn: 1, axis: 1, gest: 1 };
const FAE_TO_HX = { fae: 'hx.korb', 'fae.take': 'hx.korb', 'fae.rec': 'hx.haupt', 'fae.clear': 'hx.zurueck' };   // (the retired Fährte's bindings, migrated as they load)
function mapClean(b) {
  if (!b || typeof b !== 'object' || !Object.prototype.hasOwnProperty.call(KIND_T, b.type)) return null;
  const nonum = b.type === 'bend' || b.type === 'press', num = nonum ? -1 : Number(b.num), ch = Number.isInteger(b.ch) && b.ch >= -1 && b.ch <= 15 ? b.ch : -1;
  if (!Number.isInteger(num) || num < -1 || num > (b.type === 'rpn' || b.type === 'nrpn' ? 16383 : 127)) return null;
  const o = { dev: typeof b.dev === 'string' && b.dev ? b.dev.slice(0, 64) : '*', ch, type: b.type, num, target: typeof b.target === 'string' ? b.target.slice(0, 40) : null, mode: MODES.includes(b.mode) ? b.mode : 'abs' };
  if (o.target && FAE_TO_HX[o.target]) o.target = FAE_TO_HX[o.target];   // Hexenring (SPEC §17): the Fährte's targets are the Hexenring's
  if (typeof b.min === 'number' && b.min > 0) o.min = clamp(b.min, 0, 1);
  if (typeof b.max === 'number' && b.max < 1) o.max = clamp(b.max, 0, 1);
  if (b.inv === true) o.inv = true;
  if (b.to === false) o.to = false;
  if (b.hires === true && b.type === 'cc' && num < 32) o.hires = true;
  if (b.edge === 'any') o.edge = 'any';
  if (b.when === 'pads') o.when = 'pads';
  if (b.type === 'axis') {   // Gestik: Ruhezone, Glätte, Kurve
    if (typeof b.dz === 'number' && b.dz > 0) o.dz = clamp(b.dz, 0, 0.5);
    if (typeof b.sm === 'number' && b.sm > 0) o.sm = clamp(b.sm, 0, 1);
    if (typeof b.cv === 'number' && b.cv) o.cv = clamp(b.cv, -1, 1);
  }
  if (typeof b.name === 'string' && b.name) o.name = b.name.slice(0, 40);
  return o;
}
function mapLoad() {
  let o = null;
  try { o = JSON.parse(store.get(MAP_KEY) || 'null'); } catch (e) {}
  MAP.user = o && Array.isArray(o.binds) ? o.binds.map(mapClean).filter(Boolean) : [];
  MAP.v++;
}
function mapSave() { store.set(MAP_KEY, JSON.stringify({ v: 1, binds: MAP.user })); MAP.v++; }
const sameCtl = (a, b) => a.type === b.type && a.num === b.num && a.ch === b.ch && devName(a.dev) === devName(b.dev);
// the bindings that act for a device now, for its card: learned, then the profile's (shadowed ones marked), with
// the General MIDI defaults last
function mapList(src) {
  mapOf(src);
  const mine = MAP.user.filter((b) => b.dev === '*' || sameDev(b.dev, src.name)), out = mine.map((b) => ({ b, layer: 'u' }));
  const over = (b) => mine.some((u) => u.type === b.type && u.num === b.num && (b.ch < 0 || u.ch < 0 || u.ch === b.ch));
  if (src.prof) for (const b of hxProfBinds(src, src.prof)) out.push({ b, layer: 'p', off: !profOn(src) || over(b), note: b.tent ? TENT_TXT : '' });
  if (P['midi.std'] && src.kind !== 'motion') for (const n in STD) out.push({ b: STD[n], layer: 's', off: over(STD[n]) || (!!src.prof && profOn(src) && src.prof.binds.some((p) => p.type === 'cc' && p.num === +n)) });
  return out;
}
// change or delete one: a profile's binding is shadowed by a learned copy (or by a learned "nothing")
function mapEdit(src, b, patch) {
  let u = MAP.user.includes(b) ? b : null;
  if (!u) {
    u = mapClean(Object.assign({}, b, { dev: src.name }));
    if (!u) return null;
    MAP.user = MAP.user.filter((x) => !sameCtl(x, u)).concat(u);
  }
  if (patch === null) u.target = null;
  else {
    const n = mapClean(Object.assign({}, u, patch));   // defaults (no invert, full range) are absent keys: replace, never merge
    if (n) { for (const k of Object.keys(u)) delete u[k]; Object.assign(u, n); }
  }
  mapSave();
  return u;
}
// delete: a learned binding goes (what it covered – a profile's binding – acts again); a profile's or a General MIDI
// binding is silenced by a learned "nothing"
function mapDel(src, b) {
  if (MAP.user.includes(b)) { MAP.user = MAP.user.filter((x) => x !== b); mapSave(); return; }
  mapEdit(src, b, null);
}
// "Profil wiederherstellen": the device as shipped – its profile on, everything learned for it dropped
function mapRestore(src) {
  MAP.user = MAP.user.filter((u) => u.dev === '*' || !sameDev(u.dev, src.name));
  setPortPref(src, { prof: true });
  mapSave();
}
function midiSetProfile(src, on) { setPortPref(src, { prof: !!on }); MAP.v++; MIDI.zv++; updDevUI(); }   // an MPE profile decides the zone
const mapExport = () => JSON.stringify({ app: 'myzel', kind: 'midimap', v: 1, binds: MAP.user }, null, 1);
// a file of bindings: added (the same controls replaced) or, with replace, instead of all; → how many, −1 unreadable
function mapImport(txt, replace) {
  let o;
  try { o = JSON.parse(txt); } catch (e) { return -1; }
  const l = (o && Array.isArray(o.binds) ? o.binds : Array.isArray(o) ? o : []).map(mapClean).filter(Boolean);
  if (!l.length) return 0;
  MAP.user = (replace ? [] : MAP.user.filter((u) => !l.some((n) => sameCtl(u, n)))).concat(l);
  mapSave();
  return l.length;
}
// "Regler 3 · CC 22 → Hall · Anteil 64 %": what a device's control did last
const ctlDesc = (b) => (b.type === 'axis' ? GK_AXN[b.num] || 'Achse' : b.type === 'gest' ? GK_EVN[b.num] || 'Ereignis' : b.type === 'cc' ? 'CC ' + b.num : b.type === 'note' ? 'Note ' + b.num : b.type === 'pc' ? 'Programm ' + (b.num + 1) : b.type === 'bend' ? 'Tonhöhenrad' : b.type === 'press' ? 'Druck' : b.type.toUpperCase() + ' ' + b.num);
function tValue(T, src) {
  if (T.mod) { const v = modVal(T.mod); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.round(Math.abs(v) * 100) + ' %'; }   // the sum of what deflects it
  const id = tPid(T);
  if (id) return fmt(PD[id], P[id]);
  return T.get ? Math.round(T.get({ src, ev: { ch: 0 } }) * 100) + ' %' : '';
}
function mapLine(src) {
  const L = src.lastMap, T = L && mtOf(L.ev && L.ev.type === 'axis' ? gkTarget(L.b.target) : L.b.target);
  if (!T) return '';
  return (L.b.name && L.b.name !== ctlDesc(L.b) ? L.b.name + ' · ' : '') + ctlDesc(L.b) + ' → ' + tName(T) + (T.hit || T.run && !T.get ? '' : ' ' + tValue(T, src));
}

