/* ---------- Gerätebild: the controller drawn, its bindings at every control, live ---------- */
// (owner, 26.10.2026: „eine Übersicht über die Belegungen – ein eigener Bereich, grafisch; der Oberhammer, wenn die App
// das Keyboard-Modell erkennt und es mitsamt Beschriftungen darstellt; dort auch alles manuell einstellen“ – „zahlreiche
// MIDI-Geräte, sonst aus einer langen Liste wählen“ – „automatisch logisch: Drehknöpfe für Sachen wie Filter, Fader für
// den Mixer, Fader 1 = erstes Element im Mixer“). A catalogue of controllers (recognised by the port name, else chosen),
// each drawn from a few rows of controls; „Einmessen“ asks for every control in turn and keeps which message it sends
// (factory maps differ and are user-editable on most of them – moving it once is certain); „Logisch belegen“ gives
// knobs the sound and its effects, faders the mixer's channels in the Pult's order, buttons the transport; a click on a
// control chooses its target. The bindings are the ordinary learned ones (MAP.user, per device) – the profile and the
// General MIDI defaults stay below them.
const CB = { on: false, el: null, src: null, model: null, cal: null, step: -1, steps: [], sel: null, q: '', live: new Map(), lastKey: '', raf: 0, wait: null };
const CB_KEY = 'myzel.gbild.v1';
// a row of controls: kind (knob · fader · button · pad · enc · wheel · cross), n, the printed labels (prefix + number or
// a list), and for a known factory map the message of each (m(i) → {type, ch, num})
const cbR = (kind, n, lab, o = {}) => Object.assign({ kind, n, lab }, o);
const cbCC = (a, ch = 0) => (i) => ({ type: 'cc', ch, num: a + i });
const cbNt = (a, ch = 0) => (i) => ({ type: 'note', ch, num: a + i });
// sections left to right; each a column of rows; keys: the keyboard below (0: none). A row's options: sz [w, h] of its
// items, gap, cols (or grid [cols, rows]), same (on the line of the row before), deco (drawn, no message: a function key,
// the name, a display)
const PCRM_SEC = [[cbR('wheel', 1, ['Bender/Mod'], { sz: [58, 96] }), cbR('button', 6, ['', '', '', '', '', ''], { cols: 3, sz: [26, 26], gap: 6, deco: true })],
  [cbR('logo', 1, ['EDIROL'], { sz: [120, 70], deco: true })],
  [cbR('knob', 8, 'R', { sz: [44, 62], gap: 8 }), cbR('button', 4, ['', '', '', ''], { sz: [30, 34], gap: 4, deco: true }), cbR('button', 6, 'B', { sz: [30, 34], gap: 4, same: true })],
  [cbR('display', 1, [''], { sz: [60, 44], deco: true })],
  [cbR('fader', 8, 'S', { sz: [34, 104], gap: 8 })]];
const CB_MODELS = [
  // (owner's photo, 26.10.2026) left the lever and six small keys, the name, R1–R8 over four function keys and B1–B6,
  // the little display, the short sliders S1–S8, the velocity curves printed at the right
  { id: 'pcrm50', maker: 'Edirol', name: 'PCR-M50', re: /PCR[-\s]*M\s*50|PCR[-\s]*M\s*30\s*\/\s*50|PCR[-\s]*M(?!\s*[38]0\b)|EDIROL\s*PCR(?![-\s]*[358]00)|^\s*PCR\s*(\d|MIDI|IN\b|OUT\b|$)/i, keys: 49, sec: PCRM_SEC, note: 'Einmessen empfohlen: die Werksbelegung des PCR-M ist frei einstellbar.' },
  { id: 'pcrm30', maker: 'Edirol', name: 'PCR-M30', re: /PCR[-\s]*M\s*30/i, keys: 25, sec: PCRM_SEC },
  { id: 'pcrm80', maker: 'Edirol', name: 'PCR-M80', re: /PCR[-\s]*M\s*80/i, keys: 61, sec: PCRM_SEC },
  { id: 'pcr500', maker: 'Edirol', name: 'PCR-300 / 500 / 800', re: /PCR-?\s*[358]00|PCR-?\s*[358]0\b/i, keys: 49, sec: [[cbR('wheel', 1, ['Bender/Mod'])], [cbR('knob', 8, 'R'), cbR('fader', 9, 'S')], [cbR('button', 9, 'B')]] },
  { id: 'apc40mk2', maker: 'Akai', name: 'APC40 MK2', re: /APC\s*40\s*mk\s*II|APC40\s*mkII|APC40\s*MK2/i, keys: 0, grid: [8, 5],
    sec: [[cbR('knob', 8, 'Spur-Regler ', { m: cbCC(48) }), cbR('pad', 40, '', { grid: [8, 5], m: (i) => ({ type: 'note', ch: 0, num: (4 - Math.floor(i / 8)) * 8 + (i % 8) }) }), cbR('button', 8, 'Clip Stop ', { m: (i) => ({ type: 'note', ch: i, num: 52 }) }),
      cbR('button', 8, 'Spur ', { m: (i) => ({ type: 'note', ch: i, num: 51 }) }), cbR('button', 8, 'Aktiv ', { m: (i) => ({ type: 'note', ch: i, num: 50 }) }), cbR('button', 8, 'Solo ', { m: (i) => ({ type: 'note', ch: i, num: 49 }) }),
      cbR('button', 8, 'Rec ', { m: (i) => ({ type: 'note', ch: i, num: 48 }) }), cbR('fader', 8, 'Fader ', { m: (i) => ({ type: 'cc', ch: i, num: 7 }) })],
      [cbR('button', 5, 'Szene ', { m: cbNt(82) }), cbR('knob', 8, 'Device ', { m: cbCC(16), cols: 4 }), cbR('fader', 1, ['Master'], { m: () => ({ type: 'cc', ch: 0, num: 14 }) }), cbR('cross', 1, ['Crossfader'], { m: () => ({ type: 'cc', ch: 0, num: 15 }) })]],
    known: true, note: 'Werksbelegung laut Akai (Generic Mode); die Raster-Modi wählst du unten.' },
  { id: 'apcmini2', maker: 'Akai', name: 'APC mini MK2', re: /APC\s*mini/i, keys: 0, sec: [[cbR('pad', 64, '', { grid: [8, 8], m: (i) => ({ type: 'note', ch: 0, num: (7 - Math.floor(i / 8)) * 8 + (i % 8) }) }), cbR('fader', 9, 'Fader ', { m: cbCC(48) })]], known: true },
  { id: 'mpkmini', maker: 'Akai', name: 'MPK mini (mk3/Plus)', re: /MPK\s*mini/i, keys: 25, sec: [[cbR('wheel', 1, ['Joystick'])], [cbR('pad', 8, 'Pad ', { grid: [4, 2] })], [cbR('knob', 8, 'K', { cols: 4 })]] },
  { id: 'mpk249', maker: 'Akai', name: 'MPK249 / 261', re: /MPK\s*2(49|61)/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('pad', 16, 'Pad ', { grid: [4, 4] })], [cbR('knob', 8, 'K'), cbR('fader', 8, 'F'), cbR('button', 8, 'S')]] },
  { id: 'lpd8', maker: 'Akai', name: 'LPD8', re: /LPD\s*8/i, keys: 0, sec: [[cbR('pad', 8, 'Pad ', { grid: [4, 2] })], [cbR('knob', 8, 'K', { cols: 4 })]] },
  { id: 'mpd218', maker: 'Akai', name: 'MPD218', re: /MPD\s*218/i, keys: 0, sec: [[cbR('knob', 6, 'K', { cols: 2 })], [cbR('pad', 16, 'Pad ', { grid: [4, 4] })]] },
  { id: 'nk2', maker: 'KORG', name: 'nanoKONTROL2', re: /nano\s*KONTROL\s*2/i, keys: 0, sec: [[cbR('button', 6, ['◀◀', '▶▶', 'Stop', 'Play', 'Rec', 'Cycle'], { cols: 3 })], [cbR('knob', 8, 'Regler ', { m: cbCC(16) }), cbR('button', 8, 'S ', { m: cbCC(32) }), cbR('button', 8, 'M ', { m: cbCC(48) }), cbR('button', 8, 'R ', { m: cbCC(64) }), cbR('fader', 8, 'Fader ', { m: cbCC(0) })]], known: true },
  { id: 'nks', maker: 'KORG', name: 'nanoKEY Studio', re: /nano\s*KEY\s*Studio/i, keys: 25, sec: [[cbR('pad', 8, 'Pad ', { grid: [4, 2] })], [cbR('cross', 1, ['X-Y-Pad'])], [cbR('knob', 8, 'Regler ', { cols: 4 })]] },
  { id: 'mk', maker: 'KORG', name: 'microKEY', re: /micro\s*KEY/i, keys: 37, sec: [[cbR('wheel', 1, ['Joystick'])]] },
  { id: 'np2', maker: 'KORG', name: 'nanoPAD2', re: /nano\s*PAD/i, keys: 0, sec: [[cbR('pad', 16, 'Pad ', { grid: [8, 2] })], [cbR('cross', 1, ['X-Y-Pad'])]] },
  { id: 'lk', maker: 'Novation', name: 'Launchkey 49 / 61 (mk3/mk4)', re: /Launchkey\s*(49|61|88)/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('knob', 8, 'Regler '), cbR('pad', 16, 'Pad ', { grid: [8, 2] })], [cbR('fader', 9, 'Fader '), cbR('button', 9, 'Taste ')]] },
  { id: 'lk25', maker: 'Novation', name: 'Launchkey 25 / 37 / Mini', re: /Launchkey/i, keys: 25, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('knob', 8, 'Regler '), cbR('pad', 16, 'Pad ', { grid: [8, 2] })]] },
  { id: 'lcxl', maker: 'Novation', name: 'Launch Control XL', re: /Launch\s*Control\s*XL/i, keys: 0, sec: [[cbR('knob', 24, 'Regler ', { cols: 8 }), cbR('fader', 8, 'Fader '), cbR('button', 16, 'Taste ', { cols: 8 })]] },
  { id: 'lpx', maker: 'Novation', name: 'Launchpad (X / Mini / Pro)', re: /Launchpad/i, keys: 0, sec: [[cbR('pad', 64, '', { grid: [8, 8] })]] },
  { id: 'minilab3', maker: 'Arturia', name: 'MiniLab 3', re: /Mini\s*Lab\s*3/i, keys: 25, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('pad', 8, 'Pad ', { grid: [8, 1] })], [cbR('knob', 8, 'Regler ', { cols: 4 }), cbR('fader', 4, 'Fader ')]] },
  { id: 'minilab', maker: 'Arturia', name: 'MiniLab mkII', re: /Mini\s*Lab/i, keys: 25, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('knob', 16, 'Regler ', { cols: 8 }), cbR('pad', 8, 'Pad ', { grid: [8, 1] })]] },
  { id: 'keylab', maker: 'Arturia', name: 'KeyLab Essential 49 / 61', re: /KeyLab/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('pad', 8, 'Pad ', { grid: [4, 2] })], [cbR('knob', 9, 'Regler '), cbR('fader', 9, 'Fader ')]] },
  { id: 'beatstep', maker: 'Arturia', name: 'BeatStep', re: /BeatStep/i, keys: 0, sec: [[cbR('knob', 16, 'Regler ', { cols: 8 }), cbR('pad', 16, 'Pad ', { grid: [8, 2] })]] },
  { id: 'oxygen', maker: 'M-Audio', name: 'Oxygen 49 / 61 (mk5, Pro)', re: /Oxygen/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('pad', 16, 'Pad ', { grid: [8, 2] })], [cbR('knob', 8, 'Regler '), cbR('fader', 9, 'Fader '), cbR('button', 9, 'Taste ')]] },
  { id: 'keystation', maker: 'M-Audio', name: 'Keystation 49 / 61 / 88', re: /Keystation/i, keys: 61, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('fader', 1, ['Volume'])]] },
  { id: 'xtm', maker: 'Behringer', name: 'X-Touch Mini', re: /X-?TOUCH\s*MINI/i, keys: 0, sec: [[cbR('enc', 8, 'Regler '), cbR('button', 16, 'Taste ', { cols: 8 })], [cbR('fader', 1, ['Fader'])]] },
  { id: 'bcr2000', maker: 'Behringer', name: 'BCR2000', re: /BCR\s*2000/i, keys: 0, sec: [[cbR('enc', 8, 'Push '), cbR('button', 16, 'Taste ', { cols: 8 }), cbR('enc', 24, 'Regler ', { cols: 8 })]] },
  { id: 'lx', maker: 'Nektar', name: 'Impact LX49+ / 61+', re: /Impact\s*LX|Nektar/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('pad', 8, 'Pad ', { grid: [4, 2] })], [cbR('knob', 8, 'Regler '), cbR('fader', 9, 'Fader '), cbR('button', 9, 'Taste ')]] },
  { id: 'v49', maker: 'Alesis', name: 'V49 / VI49', re: /\bV\s*49|VI\s*49|Alesis/i, keys: 49, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('knob', 4, 'Regler ', { cols: 2 }), cbR('pad', 8, 'Pad ', { grid: [4, 2] })]] },
  { id: 'a49', maker: 'Roland', name: 'A-49 / A-500PRO', re: /A-?49|A-?500/i, keys: 49, sec: [[cbR('wheel', 1, ['Bender/Mod'])], [cbR('knob', 8, 'R'), cbR('fader', 9, 'S')]] },
  { id: 'kk', maker: 'Native Instruments', name: 'Komplete Kontrol M32 / A-Serie (MIDI)', re: /Komplete\s*Kontrol|KOMPLETE/i, keys: 32, sec: [[cbR('wheel', 2, ['Pitch', 'Mod'])], [cbR('enc', 8, 'Regler ')]] },
  { id: 'generic', maker: '', name: 'Eigenes Gerät (beim Bewegen gebaut)', re: null, keys: 0, sec: [] },
];
const cbModelOf = (id) => CB_MODELS.find((m) => m.id === id) || null;
// a device's choice and calibration, kept by its name: { model, ctl: { 'k0': {type, ch, num} … }, extra: [ … ] }
function cbStore() { try { return JSON.parse(store.get(CB_KEY) || '{}') || {}; } catch (e) { return {}; } }
function cbSave(name, d) { const all = cbStore(); all[devName(name)] = d; store.set(CB_KEY, JSON.stringify(all)); }
function cbData(src) { const d = cbStore()[devName(src.name)]; return d && typeof d === 'object' ? d : { model: null, ctl: {}, extra: [] }; }
// the controls of a model in drawing order: { id, kind, label, i (in its row), role index, m (factory message) }
function cbCtls(M, d) {
  const out = [];
  if (!M) return out;
  M.sec.forEach((col, ci) => col.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const lab = Array.isArray(r.lab) ? (r.lab[i] != null ? r.lab[i] : r.lab[0] + ' ' + (i + 1)) : r.lab + (i + 1);
      out.push({ id: 's' + ci + 'r' + ri + 'i' + i, kind: r.kind, label: lab.trim(), i, row: r, col: ci, m: r.m ? r.m(i) : null, deco: !!r.deco });
    }
  }));
  if (M.id === 'generic' && d) (d.extra || []).forEach((x, i) => out.push({ id: 'x' + i, kind: x.kind || 'knob', label: x.label || 'Regler ' + (i + 1), i, row: null, col: 0, m: null }));
  return out;
}
// the message a control sends: measured, else the factory's (only for a model whose map is known)
const cbMsg = (C, d, M) => (C.deco ? null : (d.ctl && d.ctl[C.id]) || (M && M.known ? C.m : null));
// (review 30.10.2026) a control that moves through its travel – fader, knob, crossfader (bindings.js: a stepping target
// browses with it from its first value). An unknown device's tiles are all „Regler“, a CC button among them: not known.
const cbTravels = (C, M) => !!C && (C.kind === 'fader' || C.kind === 'cross' || (C.kind === 'knob' && M.id !== 'generic'));
// … and the control of a device that sends this CC, from its Gerätebild (a binding made before b.fad, a profile's)
function cbCcTravels(src, ch, num) {
  const d = cbData(src), M = cbModelFor(src);
  return cbCtls(M, d).some((C) => { const m = cbMsg(C, d, M); return m && m.type === 'cc' && m.num === num && (m.ch == null || m.ch < 0 || m.ch === ch) && cbTravels(C, M); });
}
// the binding that acts for a message now (learned, else the profile's, else General MIDI)
function cbBind(src, msg) {
  if (!msg) return null;
  const M = mapOf(src), e1 = M.get(msg.type + ':' + msg.ch + ':' + msg.num), e2 = M.get(msg.type + ':*:' + msg.num);
  for (const e of [e1, e2]) if (e && e.u.length) return { b: e.u[0], l: 'u' };
  if (profOn(src)) for (const e of [e1, e2]) if (e && e.p.length) return { b: e.p[0], l: 'p' };
  if (msg.type === 'cc' && P['midi.std'] && STD[msg.num]) return { b: STD[msg.num], l: 's' };
  return null;
}
const cbTName = (b) => { if (!b || b.target == null) return b ? '–' : ''; const T = mtOf(b.target); return T ? tName(T) : b.target; };

// ---- the logical map: knobs the sound and its effects, faders the mixer's channels in the Pult's order, buttons the
// transport and the Hexenring, pads the Spuren and the Hexenring's places ----
const CB_KNOBS = ['flt.freq', 'flt.q', 'macro.a', 'macro.b', 'dly.mix', 'rev.mix', 'cho.mix', 'pha.mix', 'dly.fb', 'rev.size', 'drv.amt', 'v.layerLvl', 'v.glide', 'mov.vib', 'mov.pan', 'morph'];
const CB_FADERS = ['xfin.vol', 'xeb2.vol', 'xhxr.vol', 'xl0.vol', 'xl1.vol', 'xl2.vol', 'xl3.vol', 'xbor.vol', 'xgsp.vol', 'xdly.vol', 'xrev.vol'];
const CB_BUTTONS = [['puls', 'toggle'], ['rec', 'toggle'], ['hx.korb', 'momentary'], ['hx.haupt', 'momentary'], ['freeze', 'toggle'], ['stille', 'trigger'], ['preset.prev', 'trigger'], ['preset.next', 'trigger'], ['bor.on', 'toggle']];
function cbLogical(src) {
  const d = cbData(src), M = cbModelOf(d.model) || profModel(src), ctl = cbCtls(M, d);
  const byKind = (k) => ctl.filter((C) => C.kind === k && cbMsg(C, d, M));
  const plan = [];
  byKind('knob').concat(byKind('enc')).forEach((C, i) => { if (CB_KNOBS[i]) plan.push([C, CB_KNOBS[i], C.kind === 'enc' ? 'rel2c' : 'abs']); });
  const fad = byKind('fader'), master = fad.find((C) => /master|volume/i.test(C.label));
  fad.filter((C) => C !== master).forEach((C, i) => { if (CB_FADERS[i]) plan.push([C, CB_FADERS[i], 'abs']); });
  if (master) plan.push([master, 'mst.vol', 'abs']);
  byKind('cross').forEach((C) => plan.push([C, 'morph', 'abs']));
  // buttons: under a row of faders the channels' mute (Solo, Rec rows of a mixer controller); else the transport
  const btn = byKind('button'), fadRows = new Set(fad.map((C) => C.row));
  let bi = 0;
  for (const C of btn) {
    const L = (C.label || '').toLowerCase();
    if (fadRows.size && /^(m|aktiv)\b/.test(L) && CB_FADERS[C.i]) plan.push([C, CB_FADERS[C.i].replace('.vol', '.mute'), 'toggle']);
    else if (fadRows.size && /^s(olo)?\b/.test(L) && CB_FADERS[C.i]) plan.push([C, CB_FADERS[C.i].replace('.vol', '.solo'), 'toggle']);
    else if (CB_BUTTONS[bi]) { plan.push([C, CB_BUTTONS[bi][0], CB_BUTTONS[bi][1]]); bi++; }
  }
  byKind('pad').forEach((C, i) => { const f = PADFN[i % 16]; if (f && i < 16) plan.push([C, f[0], f[1]]); });
  // write them as learned bindings of this device (the same controls replaced); a channel only where two controls share
  // a number (a mixer controller's channel per strip)
  const msgs = plan.map(([C]) => cbMsg(C, d, M)), dup = (m) => msgs.filter((x) => x && x.type === m.type && x.num === m.num).length > 1;
  const nb = plan.map(([C, t, mode], k) => { const m = msgs[k]; return mapClean({ dev: src.name, type: m.type, ch: dup(m) ? m.ch : -1, num: m.num, target: t, mode: m.type === 'note' && mode === 'abs' ? 'toggle' : mode, name: C.label, fad: mode === 'abs' && cbTravels(C, M) }); }).filter(Boolean);
  MAP.user = MAP.user.filter((u) => !(sameDev(u.dev, src.name) && nb.some((n) => n.type === u.type && n.num === u.num && (n.ch < 0 || u.ch < 0 || n.ch === u.ch)))).concat(nb);
  mapSave(); MIDI.zv++;
  return nb.length;
}
// a recognised profile's model (the catalogue's by the port name)
// the model of a device: the one chosen in the Gerätebild, else the one its name gives
const cbModelFor = (src) => cbModelOf(cbData(src).model) || profModel(src);
function profModel(src) { for (const M of CB_MODELS) if (M.re && M.re.test(src.name)) return M; return cbModelOf('generic'); }

// ---- the page ----
function cbOpen(src) {
  CB.src = src || cbSources()[0] || null;
  if (!CB.el) cbBuild();
  CB.on = true; CB.el.hidden = false; CB.step = -1; CB.sel = null;
  cbRender();
  if (!CB.raf) CB.raf = requestAnimationFrame(cbFrame);
}
function cbClose() { CB.on = false; CB.step = -1; CB.wait = null; if (CB.el) CB.el.hidden = true; if (CB.raf) cancelAnimationFrame(CB.raf); CB.raf = 0; }
// (an interface's MIDI port only once the player said which instrument hangs on it – geraet.js kcModelSel; owner,
// 30.10.2026: „das Gerätebild des Interfaces streichen“)
const cbSources = () => [...MIDI.srcs.values()].filter((s) => s.kind !== 'motion' && s.kind !== 'ble' && s.enabled && !s.secondary && !(midiIface(s.name) && !cbModelOf(cbData(s).model))).concat([...BLE.devs.values()].map((B) => B.src).filter(Boolean));
function cbBuild() {
  CB.el = h('div', { class: 'cb', hidden: true, role: 'dialog', 'aria-label': 'Gerätebild' });
  CB.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (CB.step >= 0) cbCalStop(); else if (CB.sel) { CB.sel = null; cbRender(); } else cbClose(); } });
  document.body.append(CB.el);
}
function cbRender() {
  const el = CB.el, src = CB.src; if (!el) return;
  const btn = (t, fn, tip, cls) => { const b = h('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), title: tip || '' }, t); b.addEventListener('click', fn); return b; };
  const head = h('div', { class: 'cb-h' }, h('h2', null, 'Gerätebild'));
  const srcs = cbSources();
  if (srcs.length > 1) { const sel = h('select', { class: 'cb-dev', 'aria-label': 'Gerät' }, ...srcs.map((s) => { const m = cbModelOf(cbData(s).model); return h('option', { value: s.key, selected: s === src ? '' : null }, s.name + (m && m.id !== 'generic' && !(m.re && m.re.test(s.name)) ? ' · ' + m.name : '')); })); sel.addEventListener('change', () => { CB.src = srcs.find((s) => s.key === sel.value) || null; CB.sel = null; cbRender(); }); head.append(sel); }
  else head.append(h('span', { class: 'cb-dn' }, src ? src.name : 'kein Gerät verbunden'));
  const x = btn('✕', cbClose, 'Schließen (Esc)', 'ghost cb-x'); x.setAttribute('aria-label', 'Schließen'); head.append(h('span', { class: 'cb-sp' }), x);
  if (!src) { el.replaceChildren(head, h('p', { class: 'cb-note' }, 'Schließe einen MIDI-Controller an (USB oder Bluetooth) – dann zeigt Myzel ihn hier mit allen Belegungen.')); return; }
  const d = cbData(src), auto = profModel(src), M = cbModelOf(d.model) || auto, ctl = cbCtls(M, d);
  // the model: recognised or chosen from the catalogue
  const msel = h('select', { class: 'cb-model', 'aria-label': 'Modell' }, ...CB_MODELS.map((m) => h('option', { value: m.id, selected: m === M ? '' : null }, (m.maker ? m.maker + ' ' : '') + m.name + (m === auto && m.re ? ' (erkannt)' : ''))));
  msel.addEventListener('change', () => { const nd = cbData(src); nd.model = msel.value; cbSave(src.name, nd); CB.sel = null; cbRender(); });
  const n = ctl.filter((C) => cbMsg(C, d, M)).length, nAll = ctl.filter((C) => !C.deco && C.kind !== 'wheel').length;
  const tools = h('div', { class: 'cb-tools' }, h('label', { class: 'cb-ml' }, 'Modell ', msel),
    btn(CB.step >= 0 ? 'Einmessen beenden' : 'Einmessen', () => (CB.step >= 0 ? cbCalStop() : cbCalStart()), 'Myzel fragt jeden Regler, jeden Fader und jede Taste der Reihe nach ab – du bewegst ihn einmal, Myzel merkt sich, was er sendet.', CB.step >= 0 ? 'primary' : ''),
    btn('Logisch belegen', () => { const k = cbLogical(src); toast(k ? k + ' Bedienelemente belegt: Drehregler – Klang und Effekte, Fader – Mixer in Pult-Reihenfolge, Tasten – Transport und Hexenring. ↶ über „Zuordnungen“.' : 'Erst einmessen – dann weiß Myzel, was jedes Element sendet.', 6000); cbRender(); }, 'Drehregler: Filter, Klang, Echo, Hall …; Fader: Mixer in der Reihenfolge des Pults (Fader 1 = erster Kanal); Tasten: Puls, Aufnahme, Korb, Hauptknopf …'),
    btn('Werkszustand', () => { mapRestore(src); MIDI.zv++; cbRender(); }, 'Alles für dieses Gerät Zugewiesene löschen – das Profil und die üblichen Regler wirken wieder', 'ghost'));
  const info = h('p', { class: 'cb-note' }, (M.id === 'generic' ? 'Unbekanntes Gerät: bewege einen Regler – er erscheint als Kachel und lässt sich belegen.' : n + ' von ' + nAll + ' Elementen ' + (M.known && !Object.keys(d.ctl || {}).length ? 'nach Werksbelegung bekannt' : 'eingemessen') + (M.note ? ' · ' + M.note : '')));
  // the calibration's prompt
  let prompt = null;
  if (CB.step >= 0) {
    const C = CB.steps[CB.step];
    prompt = h('div', { class: 'cb-cal', 'aria-live': 'polite' }, h('b', null, (CB.step + 1) + ' / ' + CB.steps.length), ' ', C ? (C.kind === 'button' || C.kind === 'pad' ? 'Drück ' : C.kind === 'fader' || C.kind === 'cross' ? 'Schieb ' : 'Dreh ') + '„' + C.label + '“' : 'Fertig',
      btn('Zurück', () => { CB.step = Math.max(0, CB.step - 1); cbRender(); }, '', 'ghost'), btn('Überspringen', () => cbCalNext(), 'Dieses Element hat das Gerät nicht oder es sendet nichts', 'ghost'));
  }
  CB.svgBox = h('div', { class: 'cb-svg' });
  CB.svgBox.append(cbDraw(M, ctl, d, src));
  const side = cbSide(src, M, ctl, d);
  el.replaceChildren(head, tools, info, ...(prompt ? [prompt] : []), h('div', { class: 'cb-main' }, CB.svgBox, side));
  if (M.id === 'apc40mk2' && typeof apcModesRow === 'function') el.append(apcModesRow(src));
}
// the side: the selected control's binding, its target chosen from the search
function cbSide(src, M, ctl, d) {
  const C = CB.sel && ctl.find((x) => x.id === CB.sel);
  if (!C) return h('div', { class: 'cb-side' }, h('p', { class: 'cb-note' }, 'Klick auf ein Bedienelement: dort siehst und änderst du seine Belegung. Bewegst du am Gerät etwas, leuchtet es hier auf.'));
  const msg = cbMsg(C, d, M), cur = cbBind(src, msg);
  const box = h('div', { class: 'cb-side' }, h('h3', null, C.label), h('p', { class: 'cb-note' }, msg ? ctlDesc(msg) + (msg.ch >= 0 ? ' · Kanal ' + (msg.ch + 1) : '') : 'Noch nicht eingemessen'));
  if (!msg) {
    const b = h('button', { type: 'button', class: 'btn primary' }, CB.wait === C.id ? 'Bewege es jetzt am Gerät …' : 'Jetzt am Gerät bewegen');
    b.addEventListener('click', () => { CB.wait = C.id; cbRender(); });
    box.append(b); return box;
  }
  box.append(h('p', null, h('span', { class: 'lab' }, 'Steuert: '), h('b', null, cur ? cbTName(cur.b) : 'nichts'), cur && cur.l !== 'u' ? h('span', { class: 'cb-note' }, cur.l === 'p' ? ' (Profil)' : ' (üblich)') : null));
  const q = h('input', { type: 'search', class: 'cb-q', placeholder: 'Ziel suchen: Filter, Hall, Spur 2 Pegel, Schleife 3 …', 'aria-label': 'Ziel suchen', value: CB.q || '' });
  const list = h('div', { class: 'cb-list' });
  const fill = () => {
    list.replaceChildren(...mapSearch(q.value || '', 30).map((t) => {
      const it = h('button', { type: 'button', class: 'cb-it' }, h('b', null, t.label), h('span', null, t.group));
      it.addEventListener('click', () => {
        const T = mtOf(t.key), mode = T && (T.hit || (T.bool && !T.cont)) ? (msg.type === 'note' ? 'toggle' : 'trigger') : 'abs';
        const nb = mapClean({ dev: src.name, type: msg.type, ch: -1, num: msg.num, target: t.key, mode, name: C.label, fad: mode === 'abs' && cbTravels(C, M) });
        MAP.user = MAP.user.filter((u) => !(sameDev(u.dev, src.name) && u.type === nb.type && u.num === nb.num)).concat(nb); mapSave(); MIDI.zv++;
        toast(C.label + ' → ' + t.label); cbRender();
      });
      return it;
    }));
  };
  q.addEventListener('input', () => { CB.q = q.value; fill(); });
  fill();
  const del = h('button', { type: 'button', class: 'btn ghost' }, 'Nichts steuern');
  del.addEventListener('click', () => { const nb = mapClean({ dev: src.name, type: msg.type, ch: -1, num: msg.num, target: null, name: C.label }); MAP.user = MAP.user.filter((u) => !(sameDev(u.dev, src.name) && u.type === nb.type && u.num === nb.num)).concat(nb); mapSave(); MIDI.zv++; cbRender(); });
  box.append(q, list, del);
  setTimeout(() => q.focus({ preventScroll: true }), 0);
  return box;
}
// ---- the drawing: the device's body, its controls in their rows, the keyboard below; under each control its label and
// what it steers ----
const cbSv = (t, a = {}, ...kids) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); for (const c of kids) if (c != null) e.append(typeof c === 'string' ? document.createTextNode(c) : c); return e; };
const CB_SZ = { knob: [46, 64], enc: [46, 64], fader: [46, 150], button: [46, 44], pad: [46, 46], wheel: [56, 130], cross: [150, 60] };
function cbDraw(M, ctl, d, src) {
  // lay out: each section a column of rows; a row's items in `cols` per line (a grid: its own)
  const pos = new Map(); let x = 24, H = 0;
  const secs = M.sec.length ? M.sec : [[]];
  secs.forEach((col, ci) => {
    let y = 24, wMax = 0;
    let lx = x, ly = y, lh = 0;
    col.forEach((r, ri) => {
      const [w, hh] = r.sz || CB_SZ[r.kind] || [46, 46], cols = r.grid ? r.grid[0] : r.cols || r.n, rows = Math.ceil(r.n / cols), gap = r.gap != null ? r.gap : r.kind === 'pad' ? 6 : 10, lab = r.deco ? 6 : 22;
      const x0 = r.same ? lx : x, y0 = r.same ? ly : y;
      for (let i = 0; i < r.n; i++) { const cx = i % cols, cy = Math.floor(i / cols); pos.set('s' + ci + 'r' + ri + 'i' + i, { x: x0 + cx * (w + gap), y: y0 + cy * (hh + lab), w, h: hh }); }
      lx = x0 + cols * (w + gap) + (r.same ? 0 : 10); ly = y0; lh = Math.max(r.same ? lh : 0, rows * (hh + lab));
      wMax = Math.max(wMax, lx - x); y = y0 + lh + 12;
    });
    if (M.id === 'generic') ctl.forEach((C, i) => pos.set(C.id, { x: x + (i % 8) * 56, y: 24 + Math.floor(i / 8) * 90, w: 46, h: 64 }));
    if (M.id === 'generic') { wMax = Math.max(wMax, Math.min(8, ctl.length || 1) * 56); y = 24 + Math.ceil(Math.max(1, ctl.length) / 8) * 90; }
    x += wMax + 28; H = Math.max(H, y);
  });
  const W = Math.max(x, M.keys ? M.keys * 8.6 + 48 : 0), KH = M.keys ? 120 : 0, TH = H + KH + 20;
  const svg = cbSv('svg', { viewBox: '0 0 ' + Math.round(W) + ' ' + Math.round(TH), class: 'cb-dev-svg', role: 'img', 'aria-label': (M.maker ? M.maker + ' ' : '') + M.name });
  svg.append(cbSv('rect', { x: 4, y: 4, width: W - 8, height: TH - 8, rx: 14, class: 'cb-body' }), cbSv('text', { x: W - 18, y: 20, class: 'cb-brand', 'text-anchor': 'end' }, (M.maker ? M.maker + ' ' : '') + M.name));
  CB.ui = new Map();
  for (const C of ctl) {
    const p = pos.get(C.id); if (!p) continue;
    const msg = cbMsg(C, d, M), cur = msg ? cbBind(src, msg) : null, g = cbSv('g', { class: 'cb-c cb-' + C.kind + (msg ? '' : ' cb-unk') + (CB.sel === C.id ? ' cb-sel' : '') + (CB.step >= 0 && CB.steps[CB.step] === C ? ' cb-ask' : ''), tabindex: '0', role: 'button', 'aria-label': C.label + (cur ? ': ' + cbTName(cur.b) : '') });
    const U = { g, kind: C.kind, p, msg, v: null, t: 0 };
    if (C.kind === 'knob' || C.kind === 'enc') {
      const r = 17, cx = p.x + p.w / 2, cy = p.y + 22;
      g.append(cbSv('circle', { cx, cy, r, class: 'cb-kb' }));
      U.arc = cbSv('path', { class: 'cb-arc', d: '' }); U.ind = cbSv('line', { x1: cx, y1: cy, x2: cx, y2: cy - r + 3, class: 'cb-ind' });
      g.append(U.arc, U.ind); U.c = [cx, cy, r];
    } else if (C.kind === 'fader') {
      const cx = p.x + p.w / 2, y0 = p.y + 6, y1 = p.y + p.h - 34;
      g.append(cbSv('rect', { x: cx - 3, y: y0, width: 6, height: y1 - y0, rx: 3, class: 'cb-slot' }));
      U.cap = cbSv('rect', { x: cx - 13, y: y1 - 10, width: 26, height: 16, rx: 3, class: 'cb-cap' }); U.f = [y0, y1]; g.append(U.cap);
    } else if (C.kind === 'cross') {
      const y = p.y + 22; g.append(cbSv('rect', { x: p.x, y: y - 3, width: p.w, height: 6, rx: 3, class: 'cb-slot' }));
      U.cap = cbSv('rect', { x: p.x + p.w / 2 - 10, y: y - 9, width: 20, height: 18, rx: 3, class: 'cb-cap' }); U.xf = [p.x, p.x + p.w]; g.append(U.cap);
    } else if (C.kind === 'logo') {
      g.append(cbSv('text', { x: p.x + p.w / 2, y: p.y + 30, class: 'cb-logo', 'text-anchor': 'middle' }, C.label), cbSv('text', { x: p.x + p.w / 2, y: p.y + 48, class: 'cb-logo2', 'text-anchor': 'middle' }, 'MIDI KEYBOARD CONTROLLER'));
    } else if (C.kind === 'display') {
      g.append(cbSv('rect', { x: p.x + 4, y: p.y + 4, width: p.w - 8, height: p.h - 8, rx: 4, class: 'cb-disp' }), cbSv('text', { x: p.x + p.w / 2, y: p.y + p.h / 2 + 5, class: 'cb-disp-t', 'text-anchor': 'middle' }, '- -'));
    } else if (C.kind === 'wheel') {
      g.append(cbSv('rect', { x: p.x + 8, y: p.y + 4, width: p.w - 16, height: p.h - 40, rx: 8, class: 'cb-wheel' }));
    } else {
      U.led = cbSv('rect', { x: p.x + 3, y: p.y + 3, width: p.w - 6, height: (C.kind === 'pad' || (C.row && C.row.sz) ? p.h : p.h - 18) - 6, rx: C.kind === 'pad' ? 6 : 5, class: 'cb-btn' }); g.append(U.led);
    }
    const ly = C.kind === 'fader' ? p.y + p.h - 18 : C.kind === 'pad' || (C.kind === 'button' && C.row && C.row.sz) ? p.y + p.h + 11 : p.y + p.h - 4;
    if (C.label && C.kind !== 'logo') g.append(cbSv('text', { x: p.x + p.w / 2, y: ly, class: 'cb-lab', 'text-anchor': 'middle' }, C.label.length > 11 ? C.label.slice(0, 11) : C.label));
    if (cur && cur.b.target != null) g.append(cbSv('text', { x: p.x + p.w / 2, y: ly + 11 + (p.w < 50 && C.i % 2 ? 10 : 0), class: 'cb-tgt' + (cur.l === 'u' ? '' : ' cb-tgt-p'), 'text-anchor': 'middle' }, cbShort(cur.b)));
    if (C.deco) { g.classList.add('cb-deco'); g.removeAttribute('tabindex'); g.removeAttribute('role'); svg.append(g); continue; }
    g.addEventListener('click', () => { CB.sel = C.id; CB.q = ''; cbRender(); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); CB.sel = C.id; cbRender(); } });
    svg.append(g); CB.ui.set(C.id, U);
  }
  // the keyboard: white keys, the black ones on top
  if (M.keys) {
    const k0 = 24, ky = H + 8, nW = Math.round(M.keys * 7 / 12) + (M.keys % 12 ? 1 : 0), kw = (W - 48) / nW;
    for (let i = 0; i < nW; i++) svg.append(cbSv('rect', { x: k0 + i * kw, y: ky, width: kw - 1.5, height: KH - 8, rx: 2, class: 'cb-wk' }));
    for (let i = 0; i < nW - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) svg.append(cbSv('rect', { x: k0 + (i + 0.68) * kw, y: ky, width: kw * 0.62, height: (KH - 8) * 0.6, rx: 2, class: 'cb-bk' }));
  }
  return svg;
}
// a target's short name under a control
function cbShort(b) {
  const T = mtOf(b.target); if (!T) return b.target;
  const sm = T.pid && /^x(.+)\.(vol|mute|solo|pan)$/.exec(T.pid), st = sm && STRIPS.find((x) => x.k === sm[1]);
  // a channel's control: its name (the fader), with M / S / Bal.; a parameter called just „Anteil“, „Frequenz“ …: its group's name first
  let s = st ? st.name + (sm[2] === 'vol' ? '' : ' ' + ({ mute: 'M', solo: 'S', pan: 'Bal.' })[sm[2]]) : T.label;
  if (!st && T.group && /^(Anteil|Frequenz|Resonanz|Pegel|Tiefe|Tempo|Stärke|Rückkopplung|Nachhallzeit)$/.test(T.label)) s = String(T.group).split(' · ').pop() + ' ' + ({ Anteil: '', Frequenz: 'Frq.', Resonanz: 'Res.', Rückkopplung: 'Fb.', Nachhallzeit: 'Zeit' }[T.label] != null ? { Anteil: '', Frequenz: 'Frq.', Resonanz: 'Res.', Rückkopplung: 'Fb.', Nachhallzeit: 'Zeit' }[T.label] : T.label);
  if (b.target === 'mst.vol') s = 'Summe';
  s = s.trim(); return s.length > 12 ? s.slice(0, 11) + '…' : s;
}
// ---- live: every message of the shown device lights its control; while calibrating, it is taken ----
function cbIn(src, ev) {
  if (!CB.on || src !== CB.src) return false;
  const t = ev.type === 'on' || ev.type === 'off' ? 'note' : ev.type;
  if (t !== 'cc' && t !== 'note' && t !== 'pc') return false;
  const v = t === 'cc' ? ev.val / 127 : ev.type === 'on' ? Math.max(0.05, ev.val / 127) : 0;
  const d = cbData(src), M = cbModelOf(d.model) || profModel(src);
  // calibrating: the asked control takes the first message no other control has (a note-off of the last key is no answer)
  if (CB.step >= 0 || CB.wait) {
    if (ev.type === 'off') return true;
    const C = CB.wait ? cbCtls(M, d).find((x) => x.id === CB.wait) : CB.steps[CB.step];
    const key = t + ':' + ev.num + ':' + ev.ch;
    if (C && key !== CB.lastKey) {
      const taken = Object.entries(d.ctl || {}).find(([id, m]) => id !== C.id && m.type === t && m.num === ev.num && m.ch === ev.ch);
      if (!taken) {
        d.ctl = d.ctl || {}; d.ctl[C.id] = { type: t, ch: ev.ch, num: ev.num }; if (!d.model) d.model = M.id; cbSave(src.name, d);
        CB.lastKey = key; CB.lastT = performance.now();
        if (CB.wait) { CB.wait = null; cbRender(); } else setTimeout(() => cbCalNext(), 260);
      }
    }
    return true;
  }
  // an unknown device's new control: a tile of its own
  if (M.id === 'generic' && ev.type !== 'off') {
    const known = Object.values(d.ctl || {}).some((m) => m.type === t && m.num === ev.num && m.ch === ev.ch);
    if (!known && t !== 'pc') { d.extra = d.extra || []; const i = d.extra.length; d.extra.push({ kind: t === 'note' ? 'pad' : 'knob', label: (t === 'note' ? 'Taste ' : 'Regler ') + (i + 1) }); d.ctl = d.ctl || {}; d.ctl['x' + i] = { type: t, ch: ev.ch, num: ev.num }; d.model = 'generic'; cbSave(src.name, d); cbRender(); }
  }
  for (const [id, U] of CB.ui || []) { const m = U.msg; if (m && m.type === t && m.num === ev.num && (m.ch === ev.ch || m.ch < 0)) { U.v = v; U.t = performance.now(); } }
  return false;
}
function cbCalStart() {
  const src = CB.src; if (!src) return;
  const d = cbData(src), M = cbModelOf(d.model) || profModel(src);
  if (!d.model) { d.model = M.id; cbSave(src.name, d); }
  CB.steps = cbCtls(M, d).filter((C) => C.kind !== 'wheel' && !C.deco); CB.step = CB.steps.length ? 0 : -1; CB.lastKey = '';
  cbRender();
}
function cbCalNext() { if (CB.step < 0) return; CB.step++; if (CB.step >= CB.steps.length) { cbCalStop(true); return; } cbRender(); }
function cbCalStop(done) { CB.step = -1; cbRender(); if (done) toast('Eingemessen. „Logisch belegen“ gibt den Reglern ihre Aufgaben – oder klick ein Element an.', 5000); }
// every frame while open: the values the controls last sent, a short glow when they move
function cbFrame() {
  CB.raf = 0; if (!CB.on) return;
  const now = performance.now();
  for (const U of (CB.ui || new Map()).values()) {
    const lit = now - U.t < 380; U.g.classList.toggle('cb-lit', lit);
    if (U.v == null) continue;
    if (U.c) { const [cx, cy, r] = U.c, a0 = -0.75 * Math.PI - Math.PI / 2, a = a0 + U.v * 1.5 * Math.PI, sx = cx + r * Math.cos(a0), sy = cy + r * Math.sin(a0), ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a);
      U.arc.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (U.v > 2 / 3 ? 1 : 0) + ' 1 ' + ex.toFixed(1) + ' ' + ey.toFixed(1));
      U.ind.setAttribute('x2', (cx + (r - 3) * Math.cos(a)).toFixed(1)); U.ind.setAttribute('y2', (cy + (r - 3) * Math.sin(a)).toFixed(1)); }
    else if (U.f) U.cap.setAttribute('y', (U.f[1] - 10 - U.v * (U.f[1] - U.f[0])).toFixed(1));
    else if (U.xf) U.cap.setAttribute('x', (U.xf[0] + U.v * (U.xf[1] - U.xf[0]) - 10).toFixed(1));
    else if (U.led) U.led.classList.toggle('cb-on', U.v > 0);
  }
  CB.raf = requestAnimationFrame(cbFrame);
}
