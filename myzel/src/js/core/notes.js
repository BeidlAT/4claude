/* =====================================================================
   Notes on the play field
   ===================================================================== */
const N = { notes: [], free: false, lo: 110, hi: 440, base: 110 };
function rootFreqAt(oct) {
  const midi = 12 * (oct + 1) + Number(P['t.root']);
  return P['t.a4'] * Math.pow(2, (midi - 69) / 12);
}
function ratioForSemi(s) {
  if (!P['t.just']) return Math.pow(2, s / 12);
  const o = Math.floor(s / 12), k = ((s % 12) + 12) % 12;
  return Math.pow(2, o) * JUST[k];
}
function buildNotes() {
  const root = Number(P['t.root']), oct = P['t.oct'], range = P['t.range'];
  const sc = SCALES[P['t.scale']] || SCALES.mpent;
  const base = rootFreqAt(oct);
  N.base = base; N.lo = base; N.hi = base * Math.pow(2, range); N.free = !!sc.free;
  const notes = [];
  if (sc.free) {
    for (let s = 0; s <= 12 * range; s++) {
      const pc = (root + s) % 12, midi = 12 * (oct + 1) + root + s;
      notes.push({ f: base * ratioForSemi(s), name: NOTE_NAMES[pc] + (Math.floor(midi / 12) - 1), root: s % 12 === 0, semi: s });
    }
  } else {
    for (let o = 0; o < range; o++) {
      const steps = sc.r ? sc.r.length : sc.s.length;
      for (let k = 0; k < steps; k++) {
        let f, name, semi;
        if (sc.r) {
          f = base * Math.pow(2, o) * sc.r[k];
          semi = o * 12 + 12 * Math.log2(sc.r[k]);
          name = sc.lab[k] + (o ? '·' + (o + 1) : '');
        } else {
          const s = sc.s[k];
          f = base * Math.pow(2, o) * ratioForSemi(s);
          semi = o * 12 + s;
          const midi = 12 * (oct + 1) + root + semi;
          name = NOTE_NAMES[(root + s) % 12] + (Math.floor(midi / 12) - 1);
        }
        notes.push({ f, name, root: k === 0, semi });
      }
    }
    const topMidi = 12 * (oct + 1) + root + 12 * range;
    notes.push({ f: base * Math.pow(2, range), name: sc.r ? '16' : NOTE_NAMES[root] + (Math.floor(topMidi / 12) - 1), root: true, semi: 12 * range });
  }
  N.notes = notes;
  hxWKeyBuilt();   // Hexenring: (step 2a) the field's key applied – loops that follow, if it changed outside an announcement
  if (typeof fxTune === 'function') fxTune();
  if (P['rev.typ'] === 's-glocke' && A.ctx && N.notes.length && Math.abs((A.bellRoot || 0) - N.notes[0].f) > 0.01) { A.bellRoot = N.notes[0].f; regenIR(); }   // (the bell's chamber rings in the key – raum-app.js)
}
function noteAt(x) {
  if (N.free) {
    const semi = clamp(x, 0, 1) * 12 * P['t.range'];
    const idx = Math.round(semi);
    return { f: N.base * ratioForSemi(0) * Math.pow(2, semi / 12), idx, name: (N.notes[idx] || N.notes[0]).name };
  }
  const n = N.notes.length;
  const idx = clamp(Math.floor(x * n), 0, n - 1);
  return { f: N.notes[idx].f, idx, name: N.notes[idx].name };
}
function noteX(idx) {
  if (N.free) return idx / (12 * P['t.range']);
  return (idx + 0.5) / N.notes.length;
}

