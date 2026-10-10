// Sphärenwerk – Tonleitern, Stimmungen, Notennamen und die Zeichen der Stufen.
// Jede Stufe trägt das Zeichen und die Farbe eines Himmelskörpers (Sonne, Mond, Merkur …), wie in der alten
// Lehre von der Sphärenmusik, in der die sieben Planeten den sieben Tönen der Tonleiter zugeordnet waren.
// Dieses Raster liegt überall: auf dem Pad, auf den Saiten des Resonators, auf den Planeten und Ringen.
'use strict';

const NOTE_NAMES = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H'];

const SCALES = [
  { id: 'dur', name: 'Dur', st: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'moll', name: 'Moll', st: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorisch', name: 'Dorisch', st: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygisch', name: 'Phrygisch', st: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydisch', name: 'Lydisch', st: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydisch', name: 'Mixolydisch', st: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'pentadur', name: 'Pentatonik Dur', st: [0, 2, 4, 7, 9] },
  { id: 'pentamoll', name: 'Pentatonik Moll', st: [0, 3, 5, 7, 10] },
  { id: 'hirajoshi', name: 'Hirajōshi', st: [0, 2, 3, 7, 8] },
  { id: 'insen', name: 'In-Sen', st: [0, 1, 5, 7, 10] },
  { id: 'hidschas', name: 'Hidschas', st: [0, 1, 4, 5, 7, 8, 10] },
  { id: 'ganzton', name: 'Ganzton', st: [0, 2, 4, 6, 8, 10] },
  { id: 'obertoene', name: 'Obertöne 8–15', ratios: [8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'chromatisch', name: 'Chromatisch', st: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

// reine Stimmung je Halbtonabstand zum Grundton
const JUST = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];

const TUNINGS = [
  { id: 'gleich', name: 'Gleichstufig' },
  { id: 'rein', name: 'Rein' },
];

// Die Himmelskörper der Stufen: Name, Farbe (Metall der Alchemie) und Zeichen (Pfad im 24er-Raster)
const DEGREES = [
  { name: 'Sonne', color: '#f2c35b', path: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M10.6 12a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0' },
  { name: 'Mond', color: '#d3dbeb', path: 'M15.5 4.6A8 8 0 1 0 15.5 19.4A6.4 6.4 0 1 1 15.5 4.6Z' },
  { name: 'Merkur', color: '#7fd6e6', path: 'M7.6 11.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0 M7.8 3.4c1.2 2.6 7.2 2.6 8.4 0 M12 15.9v5.6 M9.2 18.8h5.6' },
  { name: 'Venus', color: '#79d49c', path: 'M6.6 9a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0 M12 14.4v7.2 M8.6 18.2h6.8' },
  { name: 'Mars', color: '#f0715a', path: 'M4.4 14.4a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0 M13.6 10.2l6.2-6.2 M14.4 4h5.4v5.4' },
  { name: 'Jupiter', color: '#8ea2ff', path: 'M5 8.8c0-3 3-5 5.6-3.8s1.8 4.4-1.2 7.4-4.4 4.2-4.4 4.2h13.4 M16.2 4v17' },
  { name: 'Saturn', color: '#bb98f2', path: 'M8 3v4.4 M5.4 5.2h5.2 M8 7.4v13 M8 12.4c2-3.2 7.2-3.2 7.2 0.9s-4 4.2-4 6.8 2 2.2 3.2 1.2' },
  { name: 'Stern', color: '#ff9cc6', path: 'M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9' },
  { name: 'Komet', color: '#ffb070', path: 'M4.4 16.2a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0 M10.9 13.1l8.6-8.6 M9.4 12.2l5.6-8.2 M12 14.8l8.4-5.8' },
  { name: 'Knoten', color: '#c9e46e', path: 'M4.5 17.6a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M14.5 17.6a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M7 15.1v-4.1a5 5 0 0 1 10 0v4.1' },
  { name: 'Spirale', color: '#6fe3d2', path: 'M12 12m-1 0a1 1 0 1 1 2 0a3 3 0 1 1 -6 0a5 5 0 1 1 10 0a7 7 0 1 1 -14 0' },
  { name: 'Dreizack', color: '#d9b8ff', path: 'M12 5.6v15.6 M8.6 18.2h6.8 M5 5c0 5 3 7.2 7 7.2s7-2.2 7-7.2' },
];

const Skala = {
  // Grundton (0 = C … 11 = H), Modus-ID, Stimmung, Kammerton
  cents(scale, tuning) {
    if (scale.ratios) return scale.ratios.map((r) => 1200 * Math.log2(r / scale.ratios[0]));
    if (tuning === 'rein') return scale.st.map((s) => 1200 * Math.log2(JUST[s]));
    return scale.st.map((s) => s * 100);
  },
  byId(id) { return SCALES.find((s) => s.id === id) || SCALES[2]; },
  // Frequenz des Grundtons in Oktave 0 (C0 = 16,35 Hz bei A4 = 440 Hz)
  root0(root, a4) { return a4 * Math.pow(2, (root - 9) / 12 - 4); },
  // vollständige Beschreibung für Pad und Klangmaschine
  build(st) {
    const scale = this.byId(st.mode);
    const cents = this.cents(scale, st.tuning);
    const root0 = this.root0(st.root, st.a4 || 440);
    return { scale, cents, root0, n: cents.length, root: st.root };
  },
  stepHz(sk, oct, step) {
    const n = sk.n, o = Math.floor(step / n), i = step - o * n;
    return sk.root0 * Math.pow(2, oct + o + sk.cents[i] / 1200);
  },
  // Name eines Tons (auch zwischen den Rasterlinien): nächster Halbton, dazu die Abweichung in Cent
  noteName(hz, a4) {
    const midi = 69 + 12 * Math.log2(hz / (a4 || 440));
    const m = Math.round(midi), dev = Math.round((midi - m) * 100);
    const name = NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
    return { name, dev, midi };
  },
  // Name der Stufe innerhalb der Tonleiter (für Tonleitern mit Halbtonraster)
  degreeNoteName(sk, i) {
    if (sk.scale.ratios) return sk.scale.ratios[i] + ':' + sk.scale.ratios[0];
    return NOTE_NAMES[(sk.root + sk.scale.st[i]) % 12];
  },
  // alle Rasterlinien im Bereich [loHz, hiHz]
  lines(sk, loHz, hiHz) {
    const out = [];
    for (let o = 0; o < 11; o++) for (let i = 0; i < sk.n; i++) {
      const hz = sk.root0 * Math.pow(2, o + sk.cents[i] / 1200);
      if (hz >= loHz * 0.999 && hz <= hiHz * 1.001) out.push({ hz, deg: i, oct: o, root: i === 0 });
    }
    return out.sort((a, b) => a.hz - b.hz);
  },
  degree(i) { return DEGREES[i % DEGREES.length]; },
};

const SIGILS = new Map();
function sigilPath(i) {
  if (typeof Path2D === 'undefined') return null;
  if (!SIGILS.has(i)) SIGILS.set(i, new Path2D(DEGREES[i % DEGREES.length].path));
  return SIGILS.get(i);
}

if (typeof module !== 'undefined') module.exports = { SCALES, TUNINGS, DEGREES, NOTE_NAMES, JUST, Skala };
