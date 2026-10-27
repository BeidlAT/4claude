/* ---------- Web MIDI ---------- */
function midiBoot() {
  if (!navigator.requestMIDIAccess) { MIDI.state = 'unsupported'; return; }
  if (!navigator.permissions || !navigator.permissions.query) return;
  try {   // a browser that does not know the 'midi' permission may throw instead of rejecting
    Promise.resolve(navigator.permissions.query({ name: 'midi', sysex: false })).then((st) => {
      if (st && st.state === 'granted') midiInit(false);
      else if (st && st.state === 'denied') { MIDI.state = 'blocked'; updDevUI(); }
    }, () => {});
  } catch (e) {}
}
async function midiInit(userAsked) {
  if (!navigator.requestMIDIAccess) { MIDI.state = 'unsupported'; updDevUI(); return; }
  if (MIDI.access || MIDI.state === 'asking') return;
  MIDI.state = 'asking'; updDevUI();
  try {
    midiUse(await navigator.requestMIDIAccess({ sysex: false }));
    // the Gerät panel shows (or is about to show, after "Mit Keyboard starten") what to do: one short line, not over it
    const panel = UI.panel === 'dev' || userAsked === 'keys';
    if (userAsked && !MIDI.ports.size) toast(panel ? (bleOk() ? 'Noch kein Keyboard – tippe auf „Bluetooth-Keyboard koppeln“.' : 'Noch kein Keyboard – einstecken genügt.')
      : bleOk() ? 'MIDI ist bereit, aber noch kein Keyboard da. Ein Bluetooth-Keyboard verbindest du unter „Gerät“ mit „Bluetooth-Keyboard koppeln“.' : 'MIDI ist bereit. Schließe ein Keyboard an – es wird sofort erkannt.', panel ? 3000 : 5000);
  } catch (e) {
    MIDI.state = 'blocked';
    // on Android a Bluetooth keyboard needs no MIDI permission: the panel offers it, no alarm here
    if (userAsked && !(ANDROID && bleOk())) toast(inViewer ? 'In dieser Ansicht ist MIDI gesperrt. Öffne Myzel als App: ' + APP_URL : 'Der Browser hat den MIDI-Zugriff abgelehnt. Erlaube ihn in den Website-Einstellungen.', 6000);
  }
  updDevUI();
}
// a MIDIAccess from the browser or a polyfill (the iOS app "Web MIDI Browser" injects one): watch it for ports coming
// and going – one without statechange events is looked at every two seconds
const portsOf = (m) => { try { return !m ? [] : typeof m.values === 'function' ? Array.from(m.values()) : Array.from(m); } catch (e) { return []; } };
const portKey = (p) => String(p.id != null && p.id !== '' ? p.id : p.name || 'midi');
function midiUse(acc) {
  const old = MIDI.access;
  if (old && old !== acc) {
    try { old.onstatechange = null; } catch (e) {}
    for (const i of portsOf(old.inputs)) { try { i.onmidimessage = null; } catch (e) {} }
  }
  MIDI.access = acc; MIDI.state = 'ready'; MIDI.scanSig = '';
  const events = 'onstatechange' in acc;   // ask before setting it, which would create the property
  try { acc.onstatechange = () => midiScan(); } catch (e) {}
  clearInterval(MIDI.poll);
  if (!events) MIDI.poll = setInterval(midiScan, 2000);
  midiScan();
}
// keeps one handler on every connected input, lists the outputs (for the clock), announces keyboards that come and go
function midiScan() {
  const acc = MIDI.access;
  if (!acc) return;
  const seen = new Set(), added = [], gone = [];
  for (const inp of portsOf(acc.inputs)) {
    if (!inp || inp.state === 'disconnected') continue;
    const key = portKey(inp), had = MIDI.srcs.has(key), src = midiSource(key, inp.name, 'webmidi', inp);
    seen.add(key);
    if (!src.onMsg) src.onMsg = (e) => onMidi(e, src);
    if (inp.onmidimessage !== src.onMsg) inp.onmidimessage = src.onMsg;   // binding also opens the port
    if (!had) added.push(src);
  }
  for (const src of Array.from(MIDI.srcs.values())) if (src.kind === 'webmidi' && !seen.has(src.key)) { midiDrop(src); gone.push(src); }
  const oseen = new Set();
  for (const out of portsOf(acc.outputs)) {
    if (!out || out.state === 'disconnected' || typeof out.send !== 'function') continue;
    const key = portKey(out);
    let o = MIDI.outs.get(key);
    if (!o) MIDI.outs.set(key, (o = { key, dir: 'out', kind: 'webmidi' }));
    o.name = out.name || 'MIDI-Ausgang'; o.port = out; o.clock = !!portPref(o).clock;
    oseen.add(key);
  }
  for (const o of Array.from(MIDI.outs.values())) if (o.kind === 'webmidi' && !oseen.has(o.key)) MIDI.outs.delete(o.key);
  // a poll that found what the last one did changes nothing
  let sig = '';
  for (const m of [MIDI.srcs, MIDI.outs]) for (const x of m.values()) if (x.kind === 'webmidi') sig += x.dir + x.key + '\u0001' + x.name + '\u0002';
  if (sig === MIDI.scanSig && !added.length && !gone.length) return;
  MIDI.scanSig = sig;
  midiSync(added, gone);
  apcScan();   // (the APC40 MK2: its lights)
}
// "Neu suchen": ask again (after a refusal the user may have allowed MIDI in the site settings meanwhile), or fetch a
// fresh port list – Windows and some polyfills do not always report a newly connected keyboard on their own
async function midiRescan() {
  if (!navigator.requestMIDIAccess) return;
  if (MIDI.state === 'asking') return;
  if (MIDI.state !== 'ready') { MIDI.access = null; MIDI.state = 'idle'; await midiInit(true); return; }
  try { midiUse(await navigator.requestMIDIAccess({ sysex: false })); } catch (e) { midiScan(); }
  toast(MIDI.ports.size ? 'Gefunden: ' + [...MIDI.ports.values()].join(', ') + '.' : 'Kein Keyboard gefunden. Prüfe Kabel oder Verbindung und tippe noch einmal auf „Neu suchen“.' + (bleOk() ? ' Bluetooth-Keyboards: „Bluetooth-Keyboard koppeln“.' : ''), 4500);
}
// Web MIDI hands over one message per event (real-time bytes on their own); timeStamp is when it reached the system
function onMidi(e, src) { midiIn(src || midiSource('x', 'MIDI', 'webmidi'), e.data, e.timeStamp); }

