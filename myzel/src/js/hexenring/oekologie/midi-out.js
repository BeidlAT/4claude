// ---- MIDI out of loop notes (SPEC §10.6, optional per loop): every MIDI output that is connected hears them, each note
// on a channel of its own (1–16 without 10, in turn) with its pitch bend before it (±2 semitones) – a just or free
// pitch is exact and a chord's notes never share a bend, as the MIDI export writes them ----
HX.mch = 0;
const hxMidiOuts = () => [...MIDI.outs.values()].filter((o) => o.port && o.dir !== 'in');
function hxMidiNote(n, t, t1) {
  const outs = hxMidiOuts(); if (!outs.length || !(n.f > 0)) return;
  const i = HX.mch = (HX.mch + 1) % 15, ch = i < 9 ? i : i + 1, sm = 69 + 12 * Math.log2(n.f / 440), key = clamp(Math.round(sm), 0, 127), bd = clamp(Math.round(8192 + ((sm - key) / 2) * 8192), 0, 16383);
  const ts = Math.max(performance.now(), perfAt(t)), te = Math.max(ts + 5, perfAt(t1 != null ? t1 : t + 0.25)), vel = clamp(Math.round((n.vel != null ? n.vel : 0.7) * 127), 1, 127);
  for (const o of outs) { midiSend(o, [0xe0 | ch, bd & 127, bd >> 7], ts); midiSend(o, [0x90 | ch, key, vel], ts); midiSend(o, [0x80 | ch, key, 0], te); }
  HX.midiN = (HX.midiN || 0) + 1;
}
function hxMidiSet(L, on) { L.midi = !!on; if (L.fd) L.fd.midi = 0; hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': MIDI-Ausgang ' + (on ? 'an' : 'aus')); if (on && !hxMidiOuts().length) toast('Kein MIDI-Ausgang verbunden – die Noten gehen hinaus, sobald einer da ist.', 3500); }

