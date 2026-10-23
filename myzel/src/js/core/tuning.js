/* =====================================================================
   Tuning
   ===================================================================== */
const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B', 'H'];
const JUST = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
const SCALES = {
  mpent: { n: 'Moll-Pentatonik', s: [0, 3, 5, 7, 10] },
  dpent: { n: 'Dur-Pentatonik', s: [0, 2, 4, 7, 9] },
  hira: { n: 'Hirajōshi', s: [0, 2, 3, 7, 8] },
  insen: { n: 'In-Sen', s: [0, 1, 5, 7, 10] },
  akebono: { n: 'Akebono', s: [0, 2, 3, 7, 9] },
  pelog: { n: 'Pelog', s: [0, 1, 3, 7, 8] },
  phrdom: { n: 'Phrygisch-dominant', s: [0, 1, 4, 5, 7, 8, 10] },
  bhairav: { n: 'Raga Bhairav', s: [0, 1, 4, 5, 7, 8, 11] },
  dor: { n: 'Dorisch', s: [0, 2, 3, 5, 7, 9, 10] },
  lyd: { n: 'Lydisch', s: [0, 2, 4, 6, 7, 9, 11] },
  whole: { n: 'Ganzton', s: [0, 2, 4, 6, 8, 10] },
  harm: { n: 'Obertonreihe 8–15', r: [8, 9, 10, 11, 12, 13, 14, 15].map((x) => x / 8), lab: ['8', '9', '10', '11', '12', '13', '14', '15'] },
  chrom: { n: 'Chromatisch', s: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  free: { n: 'Stufenlos', free: true },
};

