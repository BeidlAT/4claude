/* ---------- MIDI: keyboards and controllers play the field like fingers ---------- */
// Every message is handled the moment it arrives – no queue, no look-ahead – and the note starts at the audio clock's
// current time, so the only delay left is the output buffer (Gerät → Latenz) plus the device itself.
// Sources: each transport registers its inputs with midiSource() (Web MIDI below, Bluetooth LE MIDI adds its own) and
// hands complete messages to midiIn(src, bytes, timeStamp). State lives per source and channel, so two keyboards on
// channel 1 neither end each other's notes nor bend or brighten each other's sound.
const MIDI = { access: null, state: 'idle', srcs: new Map(), outs: new Map(), ports: new Map(), notes: new Map(), buses: [], zv: 1, flash: 0, hinted: false, tap: null, take: null, route: null, watch: 0, expr: 1, exprSrc: null };
// a note's finger carries its source: the same key on two devices is two fingers ('midi-' marks every MIDI touch)
const midiId = (src, ch, note) => 'midi-' + src.key + '-' + ch + '-' + note;
const isMidi = (id) => typeof id === 'string' && id.startsWith('midi-');
// Chromium asks once for MIDI access; Firefox needs an add-on prompt, so there only the button asks
const MIDI_AUTO = !MOBILE && !!(navigator.userAgentData && navigator.userAgentData.brands);
// second ports of multi-port controllers (DAW, Mackie, editor, DIN thru …) repeat or remap what the main port sends:
// off until the user switches them on
const MIDI_SECONDARY = /\b(DAW|MCU|HUI|Mackie|ALV|Plugin|Software Control|Editor|DIN|Thru|Through)\b|MIDI(IN|OUT) ?[2-9]\b|\b(Port|Anschluss|Puerto|Porto) [2-9]\b|#[2-9]$|daw control/i;
// (owner, 26.10.2026 and again 30.10.2026 – lost in the reset of 27.10.: „das Edirol PCR-M50 hängt am MIDI-Eingang
// eines Steinberg-Interfaces und taucht nicht auf“) the MIDI ports of audio interfaces: the instrument hangs on their
// DIN input, the port carries the interface's name (Windows „Steinberg UR22C-1“, „Yamaha Steinberg USB MIDI“, a Mac
// „UR22mkII MIDI“ / „… Port1“). Every such port is a real input – never a second port to switch on first – and names no
// instrument: the player says which one plays through it (geraet.js kcModelSel), the Gerätebild never draws the box
const MIDI_IFACE = /steinberg|\bUR[-\s]?(\d|RT|C\b|M\b)|focusrite|scarlett|clarett|\bum-?one\b|midisport|\bmio\d*\b|midi ?interface|usb[- ]?midi ?(cable|interface)|\bmotu\b|presonus|audient|komplete audio|\bumc\s?\d|\bum-?\d|\bua-?\d{1,3}\b|rubix|babyface|fireface|tascam|\bssl ?[2+]|\bid(4|14|22|44)\b|\bevo ?(4|8|16)\b|\bvolt ?\d|minifuse|audiofuse|yamaha ag\d/i;
// (review 30.10.2026) the makers' controllers that carry the same name – not interfaces: their own Gerätebild, their
// second port stays a second port. A brand matches as a whole and only these are taken out: an interface missing from
// the list would lose the player's keyboard behind it, a controller missing here only its picture until a model is chosen
const MIDI_CTRL = /\batom\b|faderport|presonus fp ?\d|io ?station|\bcmc-|\bcc121\b|\bci2\b|us-?2400/i;
const midiIface = (n) => MIDI_IFACE.test(n || '') && !MIDI_CTRL.test(n || '');
// one device seen through two names (Windows "MIDIIN2 (…)", "2- …" for a second unit, " Bluetooth" on a Mac …)
const devName = (n) => String(n || '').toLowerCase().replace(/^\d+-\s*/, '').replace(/^midi(in|out)\s*\d*\s*\((.*)\)$/, '$2').trim();
// the name to show where room is short: without the port's function ("nanoKEY Studio KEYBOARD/CTRL" → "nanoKEY Studio")
const devShort = (n) => String(n || '').replace(/\s+(KEYBOARD\/CTRL|CTRL|MIDI( ?\d+)?|Port ?\d*)$/i, '') || String(n || '');
const sameDev = (a, b) => { a = devName(a); b = devName(b); return !!a && !!b && (a.includes(b) || b.includes(a)); };

// per-port choices (on/off, clock out …) remembered by port id while the name still matches, else by name: ids change
// between sessions on some systems, names are what the user recognises
const PORTPREF = (() => { try { const o = JSON.parse(store.get('myzel.midiports.v1') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } })();
const prefKeys = (p) => [(p.dir || 'in') + '#' + p.key, (p.dir || 'in') + ':' + p.name];
function portPref(p) {
  const [a, b] = prefKeys(p), r = PORTPREF[a];
  return r && r.name === p.name ? r : PORTPREF[b] || {};
}
function setPortPref(p, patch) {
  const v = Object.assign({}, portPref(p), patch, { name: p.name }), [a, b] = prefKeys(p);
  PORTPREF[a] = PORTPREF[b] = v;
  store.set('myzel.midiports.v1', JSON.stringify(PORTPREF));
  return v;
}

/* sources: { key, name, kind: 'webmidi'|'ble', port, enabled, secondary, dup (another transport plays this device and
   this one stays quiet), chs: per-channel state, act / last (activity, last event), … }. A transport calls midiSource()
   when an input appears, midiDrop() when it goes, and midiSync(added, gone) after a batch of changes. */
function midiSource(key, name, kind, port) {
  key = String(key);
  let src = MIDI.srcs.get(key);
  if (!src) MIDI.srcs.set(key, (src = { key, dir: 'in', chs: [], mcm: null, mzOn: null, sense: false, lastIn: 0, act: 0, last: null, relVel: false, dup: false }));
  src.name = name || 'MIDI-Gerät'; src.kind = kind; src.port = port || null;
  src.secondary = MIDI_SECONDARY.test(src.name) && !midiIface(src.name);   // (an interface's „MIDI 2“, „DIN“: a real input)
  const pr = portPref(src);
  src.enabled = pr.on != null ? !!pr.on : !src.secondary;
  return src;
}
// a port that went away (unplugged, Bluetooth dropped): only its own notes end
function midiDrop(src) {
  midiSrcOff(src);
  for (const cs of src.chs) if (cs && cs.bus) { busSet(cs.bus, 0); cs.bus.cs = null; cs.bus = null; }
  if (CLK.src === src) clkLost();
  MIDI.srcs.delete(src.key);
}
function midiSetPort(src, on) { setPortPref(src, { on: !!on }); src.enabled = !!on; if (!on) midiSrcOff(src); midiSync(); }
function midiSetClockOut(o, on) { setPortPref(o, { clock: !!on }); o.clock = !!on; if (!on) midiSend(o, [0xfc]); updDevUI(); }
// after ports came or went: the list of playing devices, a short note to the player, the panel
function midiSync(added = [], gone = []) {
  bleDedupe();
  // a new, renamed, switched or silenced port: its profile and learned bindings are looked up again (only then – a
  // polyfill's poll every 2 s must not rebuild the open panel's lists)
  let sig = '';
  for (const s of MIDI.srcs.values()) sig += s.key + '\u0001' + s.name + (s.enabled ? 1 : 0) + (s.dup ? 'd' : '') + '\u0002';
  if (sig !== MIDI.mapSig) { MIDI.mapSig = sig; MAP.v++; }
  MIDI.ports = new Map();
  for (const s of MIDI.srcs.values()) if (s.enabled && !s.dup && s.kind !== 'motion') MIDI.ports.set(s.key, s.name);   // Gestik is a source, no port
  const on = (l) => l.filter((s) => s.enabled && !s.dup).map((s) => s.name), an = on(added), gn = on(gone);
  if (an.length) warmKS();
  if (an.length) toast('MIDI: ' + an.join(', ') + (A.started ? ' verbunden – einfach losspielen.' : ' erkannt. Tippe auf „Klang starten“, dann spielt es sofort.'), 4500);
  else if (gn.length) toast('MIDI: ' + gn.join(', ') + ' getrennt.', 3000);
  updDevUI();
  // a device that just came: its card into view (on a phone it lies below the connect buttons)
  const nw = added.find((s) => s.enabled && !s.dup), C = nw && UI.panel === 'dev' && KC.cards.get(nw.key);
  if (C && C.el.isConnected) C.el.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
}

