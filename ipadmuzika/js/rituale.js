// Sphärenwerk – Rituale: fertig eingerichtete Maschinen. Werte in echten Einheiten, Kabel als 'name.buchse'.
'use strict';

const RITUALE = [
  FIRST_RITUAL,
  {
    id: 'flughafen', name: 'Flughafen für Planeten',
    text: 'Sieben Planeten kreisen in krummen Verhältnissen und spielen sich selbst. Du kannst dazu spielen oder einfach zuhören.',
    skala: { root: 5, mode: 'lydisch' }, tempo: 60, pad: { from: 2, oct: 3, magnet: 0.85 },
    mods: [
      { type: 'planeten', c: 0, r: 0, vals: { umlauf: 21, planeten: 7, streuung: 0.8, lage: 4, dauer: 7, zufall: 0.25, anschlag: 0.85, lauf: 1 } },
      { type: 'stimmen', c: 1, r: 0, vals: { form: 0.12, schwebung: 7, glanz: 0.45, filter: 1500, anstieg: 1.4, ausklang: 8, drift: 0.4, pegel: 0.75 } },
      { type: 'gezeiten', c: 2, r: 0, vals: { periode: 30, tiefe: 0.6 } },
      { type: 'kathedrale', c: 3, r: 0, vals: { raum: 0.86, daempfung: 0.45, schimmer: 0.3, mischung: 0.55, vordelay: 0.06 } },
      { type: 'schlagwerk', c: 0, r: 1, vals: { material: 1, haerte: 0.3, nachklang: 4, lage: 1, schichtung: 0.25, pegel: 0.55 } },
      { type: 'bandschleife', c: 1, r: 1, vals: { zeit: 0.67, rueckkopplung: 0.5, leiern: 0.2, mischung: 0.28 } },
      { type: 'atem', c: 2, r: 1 },
      { type: 'altar', c: 3, r: 1 },
    ],
    cables: [
      ['planeten.noten', 'stimmen.noten'], ['stimmen.out', 'bandschleife.in'], ['schlagwerk.out', 'kathedrale.in'],
      ['bandschleife.out', 'kathedrale.in'], ['atem.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
      ['gezeiten.I', 'stimmen.filter', 0.2], ['gezeiten.II', 'stimmen.glanz', 0.25], ['gezeiten.III', 'kathedrale.schimmer', 0.2],
    ],
  },
  {
    id: 'atemorgel', name: 'Atemorgel',
    text: 'Sing hinein. Der Spiegel legt zwei Harmonien darüber, die Saiten klingen mit, und HALTEN macht jeden Ton zu einem stehenden Klang.',
    skala: { root: 9, mode: 'pentamoll' }, tempo: 72, pad: { from: 2, oct: 3, magnet: 0.9 },
    mods: [
      { type: 'atem', c: 0, r: 0, vals: { direkt: 0.55, frost: 0.85, laenge: 1.3, einstimmen: 1, textur: 0.16, streuung: 0.45 } },
      { type: 'spiegel', c: 1, r: 0, vals: { stufe1: 2, stufe2: -3, pegel1: 0.65, pegel2: 0.5, einstimmen: 0.7, mischung: 0.65 } },
      { type: 'resonator', c: 2, r: 0, vals: { lage: 2, saiten: 9, klingen: 6, helligkeit: 5200, anregung: -10, mischung: 0.5 } },
      { type: 'kathedrale', c: 3, r: 0, vals: { raum: 0.82, schimmer: 0.45, mischung: 0.48 } },
      { type: 'stimmen', c: 0, r: 1, vals: { form: 0.35, glanz: 0.2, filter: 700, anstieg: 0.9, ausklang: 4, pegel: 0.5 } },
      { type: 'gezeiten', c: 1, r: 1, vals: { periode: 18 } },
      { type: 'bandschleife', c: 2, r: 1, vals: { zeit: 0.78, rueckkopplung: 0.4, mischung: 0.22 } },
      { type: 'altar', c: 3, r: 1 },
    ],
    cables: [
      ['atem.out', 'spiegel.in'], ['spiegel.out', 'resonator.in'], ['resonator.out', 'kathedrale.in'], ['atem.out', 'bandschleife.in'],
      ['stimmen.out', 'kathedrale.in'], ['bandschleife.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
      ['atem.huelle', 'resonator.anregung', 0.25], ['gezeiten.I', 'stimmen.filter', 0.2],
    ],
  },
  {
    id: 'nebeluhr', name: 'Uhrwerk im Nebel',
    text: 'Drei Ringe schlagen Holz und Fell, eine Bandschleife wirft den Takt zurück, und der Nebel singt dazwischen.',
    skala: { root: 4, mode: 'phrygisch' }, tempo: 96, pad: { from: 2, oct: 3, magnet: 0.75 },
    mods: [
      { type: 'uhrwerk', name: 'uhr', c: 0, r: 0, vals: { teilung: 2, swing: 0.18, lauf: 1, r1s: 16, r1k: 5, r1o: 0, r1d: 0, r1h: 3, r2s: 12, r2k: 7, r2o: 3, r2d: 4, r2h: 4, r3s: 7, r3k: 3, r3o: 1, r3d: 2, r3h: 5, r3p: 0.6 } },
      { type: 'schlagwerk', name: 'holz', c: 1, r: 0, vals: { material: 0, haerte: 0.55, nachklang: 0.9, schichtung: 0.1, pegel: 0.8 } },
      { type: 'schlagwerk', name: 'fell', c: 2, r: 0, vals: { material: 5, haerte: 0.5, nachklang: 0.7, lage: -1, schichtung: 0.3, pegel: 0.8 } },
      { type: 'bandschleife', c: 3, r: 0, vals: { zeit: 0.23, rueckkopplung: 0.55, leiern: 0.3, ton: 2800, mischung: 0.35 } },
      { type: 'nebel', c: 0, r: 1, vals: { farbe: 0.6, wind: 0.08, singen: 0.75, lage: 4, dichte: 0.3, pegel: 0.4 } },
      { type: 'stimmen', c: 1, r: 1, vals: { form: 0.62, filter: 600, resonanz: 2, anstieg: 0.6, ausklang: 3, pegel: 0.55 } },
      { type: 'kathedrale', c: 2, r: 1, vals: { raum: 0.7, mischung: 0.38 } },
      { type: 'altar', c: 3, r: 1 },
    ],
    cables: [
      ['uhr.I', 'fell.schlag'], ['uhr.II', 'holz.schlag'], ['uhr.III', 'holz.schlag'],
      ['holz.out', 'bandschleife.in'], ['fell.out', 'bandschleife.in'], ['bandschleife.out', 'kathedrale.in'],
      ['nebel.out', 'kathedrale.in'], ['stimmen.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
    ],
  },
  {
    id: 'glaskathedrale', name: 'Kathedrale aus Glas',
    text: 'Jede Berührung läutet eine Glocke, der Schimmer trägt sie Oktave um Oktave nach oben.',
    skala: { root: 0, mode: 'lydisch' }, tempo: 70, pad: { from: 3, oct: 3, magnet: 0.95 },
    mods: [
      { type: 'stimmen', c: 0, r: 0, vals: { form: 0, schwebung: 5, glanz: 0.85, filter: 3200, anstieg: 0.05, ausklang: 6, pegel: 0.55, hoehe: 0.4 } },
      { type: 'schlagwerk', c: 1, r: 0, vals: { material: 3, haerte: 0.55, nachklang: 5, lage: 0, schichtung: 0.8, pegel: 0.75 } },
      { type: 'kathedrale', c: 2, r: 0, vals: { raum: 0.9, daempfung: 0.25, schimmer: 0.62, mischung: 0.6, vordelay: 0.04 } },
      { type: 'gezeiten', c: 0, r: 1, vals: { periode: 24, tiefe: 0.5 } },
      { type: 'atem', c: 1, r: 1 },
      { type: 'altar', c: 2, r: 1, vals: { waerme: -0.1 } },
    ],
    cables: [
      ['stimmen.out', 'kathedrale.in'], ['schlagwerk.out', 'kathedrale.in'], ['atem.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
      ['gezeiten.I', 'kathedrale.schimmer', 0.25],
    ],
  },
  {
    id: 'tiefsee', name: 'Tiefsee',
    text: 'Langsame Strömungen bewegen Filter und Band. Halte tiefe Töne und lass sie wandern.',
    skala: { root: 9, mode: 'pentamoll' }, tempo: 50, pad: { from: 1, oct: 3, magnet: 0.6 },
    mods: [
      { type: 'stimmen', c: 0, r: 0, vals: { form: 0.82, schwebung: 22, glanz: 0.1, filter: 320, resonanz: 3.2, anstieg: 2.5, ausklang: 9, drift: 0.7, pegel: 0.8, oktave: -1, atem: 0.2 } },
      { type: 'gezeiten', c: 1, r: 0, vals: { periode: 42, tiefe: 0.8, form: 0.3, verhaeltnis: 1.41 } },
      { type: 'bandschleife', c: 2, r: 0, vals: { zeit: 0.9, rueckkopplung: 0.7, leiern: 0.6, ton: 1600, saettigung: 0.5, mischung: 0.35 } },
      { type: 'nebel', c: 0, r: 1, vals: { farbe: 0.85, wind: 0.05, singen: 0.4, lage: 2, dichte: 0.05, pegel: 0.35 } },
      { type: 'kathedrale', c: 1, r: 1, vals: { raum: 0.88, daempfung: 0.8, schimmer: 0.05, mischung: 0.5, groesse: 1.5 } },
      { type: 'altar', c: 2, r: 1, vals: { waerme: 0.5 } },
    ],
    cables: [
      ['stimmen.out', 'bandschleife.in'], ['nebel.out', 'kathedrale.in'], ['bandschleife.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
      ['gezeiten.I', 'stimmen.filter', 0.45], ['gezeiten.II', 'bandschleife.leiern', 0.35], ['gezeiten.III', 'nebel.singen', 0.4],
    ],
  },
  {
    id: 'obertonraum', name: 'Obertonraum',
    text: 'Die Töne 8 bis 15 der Obertonreihe über einem Grundton, rein gestimmt. Alles schwebt ohne Reibung; das Irrlicht streut Funken.',
    skala: { root: 0, mode: 'obertoene' }, tempo: 66, pad: { from: 3, oct: 2, magnet: 1 },
    mods: [
      { type: 'stimmen', c: 0, r: 0, vals: { form: 0.05, schwebung: 2, glanz: 0.6, filter: 2600, anstieg: 0.8, ausklang: 7, drift: 0.15, pegel: 0.45 } },
      { type: 'resonator', c: 1, r: 0, vals: { lage: 2, saiten: 12, klingen: 8, helligkeit: 6000, anregung: -22, mischung: 0.4 } },
      { type: 'irrlicht', c: 2, r: 0, vals: { rate: 0.4, glaette: 0.7, funken: 0.45, lage: 5, weite: 8 } },
      { type: 'nebel', c: 0, r: 1, vals: { farbe: 0.3, wind: 0.1, singen: 0.92, lage: 5, dichte: 0.1, pegel: 0.3 } },
      { type: 'kathedrale', c: 1, r: 1, vals: { raum: 0.84, schimmer: 0.35, mischung: 0.5 } },
      { type: 'altar', c: 2, r: 1 },
    ],
    cables: [
      ['stimmen.out', 'resonator.in'], ['resonator.out', 'kathedrale.in'], ['nebel.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
      ['irrlicht.funken', 'stimmen.noten'], ['irrlicht.zufall', 'resonator.helligkeit', 0.25],
    ],
  },
  {
    id: 'raga', name: 'Raga der Maschine',
    text: 'Eine Hidschas-Leiter über einem liegenden Grundton. Das Fell spricht wie eine Tabla, die Ringe zählen in Sieben.',
    skala: { root: 2, mode: 'hidschas' }, tempo: 90, pad: { from: 2, oct: 3, magnet: 0.55 },
    mods: [
      { type: 'stimmen', c: 0, r: 0, vals: { form: 0.58, schwebung: 9, glanz: 0.35, filter: 1100, anstieg: 0.25, ausklang: 3, vibrato: 0.25, gleiten: 0.12, pegel: 0.65 } },
      { type: 'uhrwerk', c: 1, r: 0, vals: { teilung: 2, lauf: 1, r1s: 7, r1k: 3, r1d: 0, r1h: 3, r2s: 14, r2k: 5, r2o: 2, r2d: 4, r2h: 4, r3s: 16, r3k: 3, r3o: 5, r3d: 7, r3h: 4, r3p: 0.5 } },
      { type: 'schlagwerk', c: 2, r: 0, vals: { material: 5, haerte: 0.6, nachklang: 0.8, lage: 0, schichtung: 0.15, pegel: 0.85 } },
      { type: 'resonator', c: 0, r: 1, vals: { lage: 3, saiten: 7, klingen: 5, mischung: 0.4, anregung: -12 } },
      { type: 'kathedrale', c: 1, r: 1, vals: { raum: 0.66, mischung: 0.34 } },
      { type: 'altar', c: 2, r: 1 },
    ],
    cables: [
      ['uhrwerk.I', 'schlagwerk.schlag'], ['uhrwerk.II', 'schlagwerk.schlag'], ['uhrwerk.III', 'schlagwerk.schlag'],
      ['stimmen.out', 'resonator.in'], ['schlagwerk.out', 'resonator.in'], ['resonator.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
    ],
  },
];
