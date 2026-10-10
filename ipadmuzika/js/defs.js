// Sphärenwerk – Bauplan der Organe: Regler mit Bereichen und Kurven, Buchsen, Anzeigen und Texte.
// Der Hauptthread baut daraus die Bedienfelder und schickt die Bereiche beim Einsetzen an die Klangmaschine.
'use strict';

const CURVE = { lin: 0, exp: 1, int: 2, gain: 3, sw: 4 };

const fnum = (v, d) => {
  const s = Math.abs(v).toFixed(d).replace('.', ',');
  return (v < 0 && Number(Math.abs(v).toFixed(d)) !== 0 ? '−' : '') + s;
};
const FMT = {
  hz: (v) => (v >= 1000 ? fnum(v / 1000, v >= 10000 ? 1 : 2) + ' kHz' : v >= 10 ? Math.round(v) + ' Hz' : fnum(v, v < 1 ? 2 : 1) + ' Hz'),
  sec: (v) => (v < 1 ? Math.round(v * 1000) + ' ms' : fnum(v, v < 10 ? 2 : 1) + ' s'),
  db: (v) => (v > 0.05 ? '+' : '') + fnum(v, Math.abs(v) < 10 ? 1 : 0) + ' dB',
  gain: (v) => (v < 0.0005 ? 'aus' : FMT.db(20 * Math.log10(v))),
  pct: (v) => Math.round(v * 100) + ' %',
  cent: (v) => Math.round(v) + ' Cent',
  okt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + ' Okt.',
  lage: (v) => 'Oktave ' + v,
  stufen: (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + (Math.abs(v) === 1 ? ' Stufe' : ' Stufen'),
  sw: (v) => (v >= 0.5 ? 'an' : 'aus'),
};

function P(id, label, min, max, def, c, o) {
  return Object.assign({ id, label, min, max, def, c, mod: c !== 'int' && c !== 'sw' }, o || {});
}
const J = (id, kind, label, uni) => ({ id, kind, label, uni: !!uni });

const WAVES = ['Sinus', 'Dreieck', 'Säge', 'Rechteck'];
const MATERIALS = ['Holz', 'Glas', 'Metall', 'Glocke', 'Schale', 'Fell', 'Tropfen', 'Stein'];
const DIVISIONS = ['1/16', '1/8', '1/8 punktiert', '1/4', '1/4 punktiert', '1/2', '1/2 punktiert', '1 Takt', '2 Takte', '4 Takte'];
const TEILUNG = ['Viertel', 'Achtel', 'Sechzehntel', 'Triolen'];

function blendName(names, v) {
  const seg = v * (names.length - 1), i = Math.min(names.length - 2, Math.floor(seg)), f = seg - i;
  if (f < 0.12) return names[i];
  if (f > 0.88) return names[i + 1];
  return names[i].slice(0, 5) + '›' + names[i + 1].slice(0, 5);
}

const ORGANE = {
  altar: {
    name: 'Altar', group: 'herz', max: 1, fixed: true, display: 'sphere',
    text: 'Hier fließt alles zusammen und wird hörbar.',
    lore: 'Der Altar hütet den Pegel. Ein Wächter hält jede Spitze unter der Grenze, damit die Maschine nie übersteuert.',
    params: [
      P('pegel', 'Pegel', 0, 1.4, 0.85, 'gain', { f: FMT.gain }),
      P('breite', 'Breite', 0, 2, 1.15, 'lin', { f: FMT.pct }),
      P('waerme', 'Wärme', -1, 1, 0.12, 'lin', { f: (v) => (Math.abs(v) < 0.04 ? 'neutral' : (v < 0 ? 'hell ' : 'warm ') + Math.round(Math.abs(v) * 100) + ' %') }),
      P('grenze', 'Grenze', -18, 0, -1.5, 'lin', { f: FMT.db }),
    ],
    front: ['pegel', 'breite', 'waerme', 'grenze'], back: [],
    ins: [J('in', 'audio', 'Eingang')], outs: [J('puls', 'mod', 'Puls', true)],
  },
  stimmen: {
    name: 'Stimmen', group: 'quelle', max: 2,
    text: 'Der Chor der Sphären. Spielt die Töne des Pads und der Planeten.',
    lore: 'Drei Oszillatoren je Stimme schweben gegeneinander, ein Filter öffnet sich mit der Höhe deines Fingers.',
    params: [
      P('form', 'Form', 0, 1, 0.55, 'lin', { f: (v) => blendName(WAVES, v) }),
      P('schwebung', 'Schwebung', 0, 40, 12, 'lin', { f: FMT.cent }),
      P('glanz', 'Glanz', 0, 1, 0.3, 'lin', { f: FMT.pct }),
      P('filter', 'Filter', 70, 14000, 900, 'exp', { f: FMT.hz }),
      P('resonanz', 'Resonanz', 0.6, 9, 1.1, 'exp', { f: (v) => 'Q ' + fnum(v, 1) }),
      P('anstieg', 'Anstieg', 0.004, 8, 0.35, 'exp', { f: FMT.sec }),
      P('ausklang', 'Ausklang', 0.05, 20, 2.2, 'exp', { f: FMT.sec }),
      P('drift', 'Drift', 0, 1, 0.35, 'lin', { f: FMT.pct }),
      P('pegel', 'Pegel', 0, 1.2, 0.7, 'gain', { f: FMT.gain }),
      P('atem', 'Hauch', 0, 1, 0.08, 'lin', { f: FMT.pct }),
      P('vibrato', 'Vibrato', 0, 1, 0, 'lin', { f: FMT.pct }),
      P('gleiten', 'Gleiten', 0.002, 1.5, 0.03, 'exp', { f: FMT.sec }),
      P('oktave', 'Oktave', -2, 2, 0, 'int', { f: FMT.okt }),
      P('stimmen', 'Stimmen', 2, 16, 12, 'int', { f: (v) => v + ' Stimmen' }),
      P('breite', 'Breite', 0, 1, 0.7, 'lin', { f: FMT.pct }),
      P('hoehe', 'Fingerhöhe', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('hand', 'Vom Pad', 0, 1, 1, 'sw', { f: FMT.sw }),
    ],
    front: ['form', 'schwebung', 'glanz', 'filter', 'resonanz', 'anstieg', 'ausklang', 'drift', 'pegel'],
    back: ['atem', 'vibrato', 'gleiten', 'oktave', 'stimmen', 'breite', 'hoehe', 'hand'],
    ins: [J('noten', 'trig', 'Noten')], outs: [J('out', 'audio', 'Klang'), J('hand', 'mod', 'Hand', true)],
  },
  schlagwerk: {
    name: 'Schlagwerk', group: 'quelle', max: 3, display: 'hits',
    text: 'Gestimmte Klangkörper aus Holz, Glas, Metall, Fell und Wasser.',
    lore: 'Jeder Anschlag regt die Eigentöne eines Körpers an. Mit Schichtung klingt bei jeder Berührung des Pads ein Schlag mit.',
    params: [
      P('material', 'Material', 0, 7, 4, 'int', { labels: MATERIALS }),
      P('haerte', 'Härte', 0, 1, 0.45, 'lin', { f: FMT.pct }),
      P('nachklang', 'Nachklang', 0.06, 12, 1.6, 'exp', { f: FMT.sec }),
      P('lage', 'Lage', -3, 2, 0, 'int', { f: FMT.okt }),
      P('schichtung', 'Schichtung', 0, 1, 0.35, 'lin', { f: FMT.pct }),
      P('pegel', 'Pegel', 0, 1.2, 0.75, 'gain', { f: FMT.gain }),
      P('zufall', 'Zufall', 0, 1, 0.2, 'lin', { f: FMT.pct }),
      P('raum', 'Streuung', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('stimmen', 'Stimmen', 2, 16, 10, 'int', { f: (v) => v + ' Stimmen' }),
      P('anschlag', 'Rauschen', 0, 1, 0.3, 'lin', { f: FMT.pct }),
      P('yhaerte', 'Höhe → Härte', 0, 1, 0.5, 'lin', { f: FMT.pct }),
    ],
    front: ['material', 'haerte', 'nachklang', 'lage', 'schichtung', 'pegel'],
    back: ['zufall', 'raum', 'stimmen', 'anschlag', 'yhaerte'],
    ins: [J('schlag', 'trig', 'Schlag')], outs: [J('out', 'audio', 'Klang')],
  },
  atem: {
    name: 'Atem', group: 'quelle', max: 1, display: 'mic',
    text: 'Das Mikrofon. Deine Stimme läuft durch die Maschine und lässt sich halten.',
    lore: 'Bei gedrücktem HALTEN wird jeder gesungene Ton eingefangen und als stehender Klang weitergesponnen, gestimmt auf die Tonleiter.',
    params: [
      P('eingang', 'Eingang', -12, 36, 12, 'lin', { f: FMT.db }),
      P('schwelle', 'Schwelle', -72, -24, -50, 'lin', { f: FMT.db }),
      P('direkt', 'Direkt', 0, 1.2, 0.5, 'gain', { f: FMT.gain }),
      P('frost', 'Gehalten', 0, 1.4, 0.8, 'gain', { f: FMT.gain }),
      P('laenge', 'Länge', 0.25, 2.5, 0.8, 'exp', { f: FMT.sec }),
      P('einstimmen', 'Einstimmen', 0, 1, 0.85, 'lin', { f: FMT.pct }),
      P('textur', 'Korngröße', 0.04, 0.4, 0.12, 'exp', { f: FMT.sec }),
      P('streuung', 'Streuung', 0, 1, 0.35, 'lin', { f: FMT.pct }),
      P('schichten', 'Schichten', 1, 8, 6, 'int', { f: (v) => v + (v === 1 ? ' Schicht' : ' Schichten') }),
      P('echo', 'Echo-Schutz', 0, 1, 0, 'sw', { f: FMT.sw }),
      P('halten', 'Halten fängt', 0, 1, 1, 'sw', { f: FMT.sw }),
    ],
    front: ['eingang', 'schwelle', 'direkt', 'frost', 'laenge', 'einstimmen'],
    back: ['textur', 'streuung', 'schichten', 'echo', 'halten'],
    ins: [], outs: [J('out', 'audio', 'Klang'), J('huelle', 'mod', 'Hülle', true), J('hoehe', 'mod', 'Tonhöhe', true)],
  },
  spiegel: {
    name: 'Spiegel', group: 'wandler', max: 2,
    text: 'Spiegelt den Eingang in Stufen der Tonleiter: ein Chor aus einer Stimme.',
    lore: 'Er hört die Tonhöhe, rückt sie auf Wunsch ins Raster und legt zwei Harmonien darüber.',
    params: [
      P('stufe1', 'Stufe I', -7, 7, 2, 'int', { f: FMT.stufen }),
      P('stufe2', 'Stufe II', -7, 7, 4, 'int', { f: FMT.stufen }),
      P('pegel1', 'Pegel I', 0, 1.2, 0.7, 'gain', { f: FMT.gain }),
      P('pegel2', 'Pegel II', 0, 1.2, 0.55, 'gain', { f: FMT.gain }),
      P('einstimmen', 'Einstimmen', 0, 1, 0.4, 'lin', { f: FMT.pct }),
      P('mischung', 'Mischung', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('fenster', 'Fenster', 0.02, 0.15, 0.055, 'exp', { f: FMT.sec }),
      P('breite', 'Breite', 0, 1, 0.7, 'lin', { f: FMT.pct }),
    ],
    front: ['stufe1', 'stufe2', 'pegel1', 'pegel2', 'einstimmen', 'mischung'], back: ['fenster', 'breite'],
    ins: [J('in', 'audio', 'Eingang')], outs: [J('out', 'audio', 'Klang')],
  },
  resonator: {
    name: 'Resonator', group: 'wandler', max: 2, display: 'strings',
    text: 'Saiten, gestimmt auf die Tonleiter. Alles, was hineinfällt, klingt mit.',
    lore: 'Wie die Resonanzsaiten einer Sitar: Sing hinein, und die Maschine antwortet in deiner Tonart.',
    params: [
      P('lage', 'Lage', 1, 6, 3, 'int', { f: FMT.lage }),
      P('saiten', 'Saiten', 3, 12, 7, 'int', { f: (v) => v + ' Saiten' }),
      P('klingen', 'Klingen', 0.2, 25, 3.5, 'exp', { f: FMT.sec }),
      P('helligkeit', 'Helligkeit', 500, 16000, 4500, 'exp', { f: FMT.hz }),
      P('anregung', 'Anregung', -30, 6, -8, 'lin', { f: FMT.db }),
      P('mischung', 'Mischung', 0, 1, 0.55, 'lin', { f: FMT.pct }),
      P('streuung', 'Verstimmung', 0, 1, 0.15, 'lin', { f: FMT.pct }),
      P('breite', 'Breite', 0, 1, 0.8, 'lin', { f: FMT.pct }),
    ],
    front: ['lage', 'saiten', 'klingen', 'helligkeit', 'anregung', 'mischung'], back: ['streuung', 'breite'],
    ins: [J('in', 'audio', 'Eingang')], outs: [J('out', 'audio', 'Klang')],
  },
  bandschleife: {
    name: 'Bandschleife', group: 'wandler', max: 2, display: 'reels',
    text: 'Ein Bandecho mit Leiern. Bei voller Rückkopplung kreist der Klang endlos.',
    lore: 'Die Zeit rastet im Takt ein. Dreht man an ihr, zieht das Band die Tonhöhe mit.',
    params: [
      P('zeit', 'Zeit', 0, 1, 0.45, 'lin', { ctx: true }),
      P('rueckkopplung', 'Rückkopplung', 0, 1, 0.45, 'lin', { f: FMT.pct }),
      P('leiern', 'Leiern', 0, 1, 0.25, 'lin', { f: FMT.pct }),
      P('ton', 'Ton', 400, 14000, 3800, 'exp', { f: FMT.hz }),
      P('saettigung', 'Sättigung', 0, 1, 0.3, 'lin', { f: FMT.pct }),
      P('mischung', 'Mischung', 0, 1, 0.32, 'lin', { f: FMT.pct }),
      P('takt', 'Im Takt', 0, 1, 1, 'sw', { f: FMT.sw }),
      P('pingpong', 'Pingpong', 0, 1, 0.5, 'lin', { f: FMT.pct }),
      P('alter', 'Bandrauschen', 0, 1, 0.12, 'lin', { f: FMT.pct }),
      P('breite', 'Breite', 0, 1, 0.8, 'lin', { f: FMT.pct }),
    ],
    front: ['zeit', 'rueckkopplung', 'leiern', 'ton', 'saettigung', 'mischung'], back: ['takt', 'pingpong', 'alter', 'breite'],
    ins: [J('in', 'audio', 'Eingang')], outs: [J('out', 'audio', 'Klang')],
  },
  kathedrale: {
    name: 'Kathedrale', group: 'wandler', max: 2, display: 'rose',
    text: 'Ein großer Hallraum mit Schimmer und Ewigkeit.',
    lore: 'Schimmer schickt den Nachhall eine Oktave höher zurück in den Raum. Ewigkeit friert ihn ein.',
    params: [
      P('raum', 'Raum', 0, 1, 0.72, 'lin', { f: FMT.pct }),
      P('daempfung', 'Dämpfung', 0, 1, 0.4, 'lin', { f: FMT.pct }),
      P('schimmer', 'Schimmer', 0, 1, 0.2, 'lin', { f: FMT.pct }),
      P('vordelay', 'Abstand', 0.001, 0.3, 0.02, 'exp', { f: FMT.sec }),
      P('mischung', 'Mischung', 0, 1, 0.42, 'lin', { f: FMT.pct }),
      P('ewigkeit', 'Ewigkeit', 0, 1, 0, 'sw', { f: FMT.sw }),
      P('groesse', 'Größe', 0.6, 1.6, 1, 'lin', { f: FMT.pct }),
      P('modulation', 'Bewegung', 0, 1, 0.35, 'lin', { f: FMT.pct }),
      P('breite', 'Breite', 0, 1, 0.9, 'lin', { f: FMT.pct }),
    ],
    front: ['raum', 'daempfung', 'schimmer', 'vordelay', 'mischung', 'ewigkeit'], back: ['groesse', 'modulation', 'breite'],
    ins: [J('in', 'audio', 'Eingang')], outs: [J('out', 'audio', 'Klang')],
  },
  nebel: {
    name: 'Nebel', group: 'quelle', max: 2, display: 'fog',
    text: 'Rauschen und Wind. Mit Singen rasten die Filter auf Tönen der Tonleiter ein.',
    lore: 'Staub streut kurze gestimmte Funken in den Raum.',
    params: [
      P('farbe', 'Farbe', 0, 1, 0.45, 'lin', { f: (v) => blendName(['Weiß', 'Rosa', 'Braun'], v) }),
      P('wind', 'Wind', 0.02, 2, 0.12, 'exp', { f: FMT.hz }),
      P('singen', 'Singen', 0, 1, 0.5, 'lin', { f: FMT.pct }),
      P('lage', 'Lage', 1, 6, 4, 'int', { f: FMT.lage }),
      P('dichte', 'Staub', 0, 1, 0.15, 'lin', { f: FMT.pct }),
      P('pegel', 'Pegel', 0, 1, 0.45, 'gain', { f: FMT.gain }),
      P('breite', 'Breite', 0, 1, 0.85, 'lin', { f: FMT.pct }),
    ],
    front: ['farbe', 'wind', 'singen', 'lage', 'dichte', 'pegel'], back: ['breite'],
    ins: [], outs: [J('out', 'audio', 'Klang')],
  },
  gezeiten: {
    name: 'Gezeiten', group: 'puls', max: 2, display: 'moons',
    text: 'Drei langsame Monde zum Modulieren, jeder in seinem eigenen Verhältnis.',
    lore: 'Steck ein Kabel von einem Mond an einen Regler, und er bewegt sich wie Ebbe und Flut.',
    params: [
      P('periode', 'Periode', 2, 180, 14, 'exp', { f: FMT.sec }),
      P('tiefe', 'Tiefe', 0, 1, 0.7, 'lin', { f: FMT.pct }),
      P('form', 'Form', 0, 1, 0, 'lin', { f: (v) => blendName(['Sinus', 'Dreieck', 'Zufall'], v) }),
      P('verhaeltnis', 'Verhältnis', 1, 2.5, 1.618, 'lin', { f: (v) => '1 : ' + fnum(v, 2) }),
    ],
    front: ['periode', 'tiefe', 'form', 'verhaeltnis'], back: [],
    ins: [], outs: [J('I', 'mod', 'Mond I'), J('II', 'mod', 'Mond II'), J('III', 'mod', 'Mond III')],
  },
  irrlicht: {
    name: 'Irrlicht', group: 'puls', max: 2, display: 'wisp',
    text: 'Zufall: weich wandernd, gestuft, und dazu einzelne Funken als Töne.',
    lore: 'Ein Licht über dem Moor. Man weiß nie genau, wohin es führt.',
    params: [
      P('rate', 'Rate', 0.05, 12, 0.6, 'exp', { f: FMT.hz }),
      P('glaette', 'Glätte', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('funken', 'Funken', 0, 1, 0.35, 'lin', { f: FMT.pct }),
      P('lage', 'Lage', 1, 6, 4, 'int', { f: FMT.lage }),
      P('weite', 'Weite', 1, 14, 7, 'int', { f: (v) => v + ' Stufen' }),
    ],
    front: ['rate', 'glaette', 'funken', 'lage', 'weite'], back: [],
    ins: [], outs: [J('zufall', 'mod', 'Weich'), J('stufen', 'mod', 'Stufen'), J('funken', 'trig', 'Funken')],
  },
  uhrwerk: {
    name: 'Uhrwerk', group: 'puls', max: 2, display: 'rings', big: true,
    text: 'Drei euklidische Ringe im Takt. Sie schlagen das Schlagwerk an.',
    lore: 'Jeder Ring verteilt seine Schläge so gleichmäßig wie möglich über seine Schritte.',
    params: [
      P('teilung', 'Teilung', 0, 3, 2, 'int', { labels: TEILUNG }),
      P('swing', 'Swing', 0, 1, 0, 'lin', { f: FMT.pct }),
      P('lauf', 'Lauf', 0, 1, 0, 'sw', { f: FMT.sw }),
    ],
    front: ['@s', '@k', '@o', '@d', 'teilung', 'swing'], back: ['@v', '@p', '@h'],
    ins: [], outs: [J('I', 'trig', 'Ring I'), J('II', 'trig', 'Ring II'), J('III', 'trig', 'Ring III')],
  },
  planeten: {
    name: 'Planeten', group: 'puls', max: 2, display: 'orrery', big: true,
    text: 'Planeten umkreisen eine Sonne. Wer den Meridian kreuzt, singt seinen Ton.',
    lore: 'Die Umläufe stehen in krummen Verhältnissen, darum kehrt das Muster fast nie wieder, wie bei Brian Enos Tonbandschleifen.',
    params: [
      P('umlauf', 'Umlauf', 3, 120, 16, 'exp', { f: FMT.sec }),
      P('planeten', 'Planeten', 1, 7, 5, 'int', { f: (v) => v + (v === 1 ? ' Planet' : ' Planeten') }),
      P('streuung', 'Streuung', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('lage', 'Lage', 1, 6, 4, 'int', { f: FMT.lage }),
      P('dauer', 'Dauer', 0.3, 20, 3, 'exp', { f: FMT.sec }),
      P('zufall', 'Zufall', 0, 1, 0.15, 'lin', { f: FMT.pct }),
      P('anschlag', 'Anschlag', 0, 1, 0.7, 'lin', { f: FMT.pct }),
      P('lauf', 'Lauf', 0, 1, 0, 'sw', { f: FMT.sw }),
    ],
    front: ['umlauf', 'planeten', 'streuung', 'lage', 'dauer', 'zufall'], back: ['anschlag'],
    ins: [], outs: [J('noten', 'trig', 'Noten')],
  },
  lot: {
    name: 'Lot', group: 'puls', max: 1, display: 'level',
    text: 'Die Neigung des iPads als Modulation.',
    lore: 'Kipp das Gerät, und die Maschine neigt sich mit.',
    params: [
      P('empfindlichkeit', 'Empfindlichkeit', 0, 1, 0.6, 'lin', { f: FMT.pct }),
      P('glaette', 'Glätte', 0, 1, 0.5, 'lin', { f: FMT.pct }),
    ],
    front: ['empfindlichkeit', 'glaette'], back: [],
    ins: [], outs: [J('x', 'mod', 'Seitlich'), J('y', 'mod', 'Vorwärts')],
  },
};

// Ringparameter des Uhrwerks (drei Ringe); in der Oberfläche als „@s“ usw. an den gewählten Ring gebunden
const RING_DEF = [
  { s: 16, k: 4, o: 0, d: 0, v: 0.85, p: 1, h: 3 },
  { s: 12, k: 5, o: 2, d: 4, v: 0.6, p: 0.85, h: 4 },
  { s: 7, k: 3, o: 1, d: 2, v: 0.55, p: 0.7, h: 5 },
];
for (let r = 1; r <= 3; r++) {
  const d = RING_DEF[r - 1];
  ORGANE.uhrwerk.params.push(
    P('r' + r + 's', 'Schritte', 1, 16, d.s, 'int', { f: (v) => v + ' Schritte', ring: r }),
    P('r' + r + 'k', 'Schläge', 0, 16, d.k, 'int', { f: (v) => v + (v === 1 ? ' Schlag' : ' Schläge'), ring: r }),
    P('r' + r + 'o', 'Versatz', 0, 15, d.o, 'int', { f: (v) => '+' + v, ring: r }),
    P('r' + r + 'd', 'Stufe', -7, 14, d.d, 'int', { f: FMT.stufen, ring: r }),
    P('r' + r + 'v', 'Anschlag', 0, 1, d.v, 'lin', { f: FMT.pct, ring: r }),
    P('r' + r + 'p', 'Chance', 0, 1, d.p, 'lin', { f: FMT.pct, ring: r }),
    P('r' + r + 'h', 'Oktave', 1, 6, d.h, 'int', { f: FMT.lage, ring: r }),
  );
}

// Nachschlagen und Umrechnen
for (const [type, o] of Object.entries(ORGANE)) {
  o.type = type;
  o.pmap = new Map(o.params.map((p) => [p.id, p]));
  const idx = (list, kind) => list.filter((j) => j.kind === kind);
  o.audioIn = idx(o.ins, 'audio'); o.audioOut = idx(o.outs, 'audio');
  o.modOut = idx(o.outs, 'mod'); o.trigIn = idx(o.ins, 'trig'); o.trigOut = idx(o.outs, 'trig');
}

const Param = {
  toNorm(p, val) {
    switch (p.c) {
      case 'exp': return Math.log(val / p.min) / Math.log(p.max / p.min);
      case 'gain': return Math.cbrt(Math.max(0, val) / p.max);
      case 'sw': return val ? 1 : 0;
      default: return (val - p.min) / (p.max - p.min);
    }
  },
  fromNorm(p, v) {
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    switch (p.c) {
      case 'exp': return p.min * Math.pow(p.max / p.min, v);
      case 'int': return Math.round(p.min + (p.max - p.min) * v);
      case 'gain': return p.max * v * v * v;
      case 'sw': return v >= 0.5 ? 1 : 0;
      default: return p.min + (p.max - p.min) * v;
    }
  },
  // Normwert eines ganzzahligen Reglers auf die nächste Stufe rücken
  snap(p, v) {
    if (p.c === 'int') return (Math.round(p.min + (p.max - p.min) * v) - p.min) / (p.max - p.min);
    if (p.c === 'sw') return v >= 0.5 ? 1 : 0;
    return v;
  },
  defNorm(p) { return Param.toNorm(p, p.def); },
  format(p, v, vals) {
    const val = Param.fromNorm(p, v);
    if (p.labels) return p.labels[Math.max(0, Math.min(p.labels.length - 1, val))];
    if (p.id === 'zeit' && vals) {
      const takt = vals.takt == null ? 1 : vals.takt;
      if (takt >= 0.5) return DIVISIONS[Math.round(v * 9)];
      return FMT.sec(0.03 * Math.pow(8 / 0.03, v));
    }
    return p.f ? p.f(val) : fnum(val, 2);
  },
  steps(p) { return p.c === 'int' ? p.max - p.min : p.c === 'sw' ? 1 : 0; },
};

// Bereiche für die Klangmaschine: { name: [min, max, kurve, normwert] }
function engineSpec(type, vals) {
  const o = ORGANE[type], out = {};
  for (const p of o.params) out[p.id] = [p.min, p.max, CURVE[p.c], vals && vals[p.id] != null ? vals[p.id] : Param.defNorm(p)];
  if (type === 'bandschleife') out.zeit[2] = 0;
  return out;
}

if (typeof module !== 'undefined') module.exports = { ORGANE, Param, CURVE, engineSpec, FMT, MATERIALS, DIVISIONS, TEILUNG };
