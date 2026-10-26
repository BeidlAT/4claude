/* =====================================================================
   Parameters — one schema drives UI, presets, storage and audio
   ===================================================================== */
const PD = {};
const def = (id, o) => (PD[id] = Object.assign({ id }, o));
const NUM = (id, label, min, max, d, unit = '', o = {}) => def(id, Object.assign({ kind: 'num', label, min, max, d, unit, curve: 'lin' }, o));
const SEL = (id, label, opts, d, o = {}) => def(id, Object.assign({ kind: 'sel', label, opts, d }, o));
const BOOL = (id, label, d, o = {}) => def(id, Object.assign({ kind: 'bool', label, d }, o));

// Klangquellen. The library's axis is the world a sound comes from (FAM: Luft … Erde); how it plays (hält = sounds while
// the finger lies, schlägt = struck at the touch, beides = struck and held) is a word on its tile. ENG_META holds one
// line per source that this version has – n (name), fam, art ('haelt' | 'schlaegt' | 'beides'), i (the sentence: ≤ 52
// characters, the point first – a row on a 360 px phone shows about 40), tags (search, German and English), hoehe
// (what the field's height plays, shown in its section), regen: 0 (never strikes in the Sporenregen), hear.gate (the
// library's short probe), rich (what level 3 adds). Its order within a family is the order of ‹ ›, of the MIDI
// stepping and of the library. A new source = one line here + its ENGINES entry + its glyph #g-<key> in the sprite.
const FAM = [['luft', 'Luft', 'Atem, Wind, Stimmen, Funken'], ['dunst', 'Dunst', 'Wolken aus Teilchen und Zufall'],
  ['holz', 'Holz', 'Saiten, Stäbe, Bogen'], ['erz', 'Erz', 'Metall, das nachklingt'], ['erde', 'Erde', 'Felle, Tiefe, Fäulnis, Wasser'],
  ['strom', 'Strom', 'Schaltungen, Band, Maschinen']];
const FAM_NAME = Object.fromEntries(FAM.map((f) => [f[0], f[1]]));
const ENG_META = {
  hau: { n: 'Hauch', fam: 'luft', art: 'haelt', i: 'Gefiltertes Rauschen – von Wind bis Pfeifen', tags: 'rauschen noise wind pfeifen atem breath luft' },
  obt: { n: 'Obertöne', fam: 'luft', art: 'haelt', i: 'Obertongesang – ein Brummen, aus dem einzelne Obertöne pfeifen', tags: 'oberton obertongesang kehlgesang throat singing overtone drone' },
  stm: { n: 'Stimme', fam: 'luft', art: 'haelt', i: 'Vokalchor – die Fingerhöhe formt u, o, a, e, i', tags: 'stimme chor vokal voice choir gesang vowel' },
  hlm: { n: 'Halm', fam: 'luft', art: 'haelt', i: 'Rohrblatt, Flöte, Flamme – der Atem ist die Höhe', tags: 'rohrblatt klarinette flöte flute flamme feuer rijke atem blasen reed wind', hoehe: 'Atemdruck', hear: { gate: 1.0 }, rich: 'Stufe 3: zweites Rohr, ±4 Cent' },
  boe: { n: 'Böe', fam: 'luft', art: 'haelt', i: 'Äolsharfe – Saiten rasten im Wind ein und hängen nach', tags: 'äolsharfe windharfe aeolian harp wind böe gust sturm storm saiten strings obertöne harmonics einrasten lock-in akkord chord', hoehe: 'Windstärke', regen: 0, hear: { gate: 1.0 }, rich: 'Stufe 3: vierzehn Saiten, die ungeraden links, die geraden rechts, ein zweiter Wind' },
  elm: { n: 'Elmsfeuer', fam: 'luft', art: 'beides', i: 'Brummen, Knistern, Lichtbogen – der Zap im Puls', tags: 'elektrisch strom netz brummen knistern funke lichtbogen tesla plasma zap electric arc spark hum crackle', hoehe: 'Spannung', hear: { gate: 0.9 }, rich: 'Stufe 3: Knistern und Lichtbogen auf beiden Seiten' },
  khl: { n: 'Kehlchen', fam: 'luft', art: 'haelt', i: 'Vogelkehle – Lippen, die ab einer Schwelle singen', tags: 'vogel vogelgesang syrinx kehle lippen amsel drossel rotkehlchen rabe zwitschern triller ruf chip pfeifen bird birdsong song trill chirp call whistle', hoehe: 'Kehldruck', regen: 0, hear: { gate: 1.0 }, rich: 'Stufe 3: beide Kehlseiten, links und rechts auf einem Luftsack – zweistimmig, mit Schwebung' },
  mtr: { n: 'Maultrommel', fam: 'luft', art: 'beides', i: 'Stahlzunge im Mund – die Zunge spielt Obertöne', tags: 'maultrommel maultrommel jaw harp jew harp mundharfe khomus kubing doromb morsing oberton overtone twang boing lamelle zunge mund psychedelisch', hoehe: 'Mundresonanz', hear: { gate: 1.2 }, rich: 'Stufe 3: wie Stufe 1 (der Mund ist eine Stimme)' },
  ond: { n: 'Ätherwelle', fam: 'luft', art: 'haelt', i: 'Ondes Martenot – vier Wellen, Palme und Gongfeder', tags: 'ondes martenot theremin ätherwelle elektronisch vintage sci-fi palme diffuseur gong welle sinus vibrato ribbon band sphärisch', hoehe: 'Welle (Onde → Gambe)', regen: 0, hear: { gate: 1.2 }, rich: 'Stufe 3: die Palme-Saiten im Stereo' },
  vox: { n: 'Silbe', fam: 'luft', art: 'beides', i: 'Gesungene Silbe: Konsonant, Vokal, Vocal Chop', tags: 'silbe vox vocal chop chops stimme voice gesang formant vokal konsonant singen choir lofi trap future', hoehe: 'Vokal (u o a e i)', regen: 1, hear: { gate: 0.8 }, rich: 'Stufe 3: zwei Sänger, leicht verschieden' },
  neb: { n: 'Nebel', fam: 'dunst', art: 'haelt', i: 'Schwebende Flächen aus verstimmten Oszillatoren', tags: 'fläche pad drone wolke oszillator verstimmt ambient synth' },
  kor: { n: 'Körner', fam: 'dunst', art: 'haelt', i: 'Granulare Wolken aus winzigen Klangkörnern', tags: 'granular grain körner textur wolke cloud' },
  swm: { n: 'Schwarm', fam: 'dunst', art: 'haelt', i: 'Fremdartiger Insektenschwarm – die Fingerhöhe weckt das Chaos', tags: 'insekten schwarm chaos fm swarm insect' },
  amo: { n: 'Amöbe', fam: 'dunst', art: 'haelt', i: 'Bass aus Zufall – jede Welle anders, der Ton bleibt', tags: 'gendy gendyn xenakis stochastisch zufall vieleck polygon wellenform bass tief stochastic random waveform', hoehe: 'Unruhe', regen: 0, hear: { gate: 1.2 }, rich: 'Stufe 3: zwei Amöben links und rechts, ±3 Cent, feiner gerechnet' },
  nrd: { n: 'Nordlicht', fam: 'dunst', art: 'haelt', i: 'Additive Fläche unter wandernden Lichtvorhängen', tags: 'nordlicht aurora additiv additive teiltöne partials fläche pad drone ambient sphärisch spectral spektral schimmer glas', hoehe: 'Helligkeit', regen: 0, hear: { gate: 1.6 }, rich: 'Stufe 3: 64 Teiltöne, links und rechts verteilt' },
  sht: { n: 'Schimmer', fam: 'dunst', art: 'haelt', i: 'Fläche im eigenen Raum, der in Oktaven aufsteigt', tags: 'shimmer schimmer hall reverb oktave octave pad fläche ambient sphärisch himmel halo kathedrale', hoehe: 'Schimmer', regen: 0, hear: { gate: 2.0 }, rich: 'Stufe 3: wie Stufe 1 (der Raum ist schon stereo)' },
  stp: { n: 'Endlostreppe', fam: 'dunst', art: 'haelt', i: 'Shepard-Glissando – steigt oder fällt ohne Ende', tags: 'shepard risset glissando endlos treppe illusion psychedelisch steigen fallen paradox escher experimentell', hoehe: 'Richtung und Tempo', regen: 0, hear: { gate: 1.6 }, rich: 'Stufe 3: die Stimmen links und rechts verteilt' },
  atr: { n: 'Attraktor', fam: 'dunst', art: 'haelt', i: 'Seltsamer Attraktor – Ton, Verdopplung, Chaos', tags: 'attraktor attractor rössler chaos periodenverdopplung period doubling experimentell avantgarde nichtlinear lorenz', hoehe: 'Chaos', regen: 0, hear: { gate: 1.2 }, rich: 'Stufe 3: die andere Seite des Orbits rechts' },
  tnl: { n: 'Tunnel', fam: 'dunst', art: 'haelt', i: 'Gestimmtes Rohr mit Durchnull-Flanger – Düsenflug', tags: 'tunnel flanger through-zero düse jet psychedelisch sweep rauschen kamm comb rohr wind experimentell', hoehe: 'Sog', regen: 0, hear: { gate: 1.6 }, rich: 'Stufe 3: rechts ein gedrehter Sweep' },
  hrz: { n: 'Harz', fam: 'holz', art: 'haelt', i: 'Gestrichenes Glas, Schale, Stab – Druck ist Höhe', tags: 'gestrichen bogen reiben glas weinglas glasharfe klangschale singing bowl stab daxophon zunge waterphone teich wasser friction bow bowed', hoehe: 'Bogendruck', hear: { gate: 1.2 }, rich: 'Stufe 3: mehr Moden, bei Glas und Schale jede als schwebendes Paar, echtes Stereo, beim Teich ein dritter Stab' },
  shn: { n: 'Sehne', fam: 'holz', art: 'beides', i: 'Lebende Saite – Handkante, Flageolett, E-Bow, Steg', tags: 'saite string lebendig gleiten slide glissando handkante handballen dämpfen palm mute flageolett harmonics ebow e-bow sustain steg bridge jawari tanpura sitar sirren waveguide zupfen pluck', hoehe: 'Hand', hear: { gate: 1.2 }, rich: 'Stufe 3: zwei Saiten links und rechts (±3 Cent) und ein Holzkorpus' },
  zpf: { n: 'Zapfen', fam: 'holz', art: 'beides', i: 'Kratzen, das zum Ton wird – Rhythmus unterm Finger', tags: 'kratzen schaben güiro guiro ratsche schnarre zapfen kiefernzapfen schuppen holz panzer chitin kürbis fels stein knarren stick-slip rhythmus scrape rasp ratchet creak', hoehe: 'Kratzrate', hear: { gate: 1.0 }, rich: 'Stufe 3: sechs Moden statt vier, echtes Stereo' },
  rnk: { n: 'Ranke', fam: 'holz', art: 'beides', i: 'Ein Ring aus Massen, den der Finger anstößt', tags: 'scanned synthesis masse feder hammer ring', hoehe: 'Hammerbreite', hear: { gate: 1.2 }, rich: 'Stufe 3: mehr Massen, zweiter Abtastkopf' },
  sai: { n: 'Saite', fam: 'holz', art: 'schlaegt', i: 'Gezupfte Saiten – leicht, viele Stimmen zugleich', tags: 'saite string karplus zupfen pluck gitarre guitar harfe harp viele stimmen' },
  jrg: { n: 'Jahresring', fam: 'holz', art: 'schlaegt', i: 'Holzstab – wo du triffst, bestimmt den Klang', tags: 'holz stab marimba xylophon schlitztrommel schlägel jahreszeit jahr wood bar mallet season', hoehe: 'Treffpunkt', rich: 'Stufe 3: sechs Moden, zwei Stäbe links und rechts' },
  sit: { n: 'Sitar', fam: 'holz', art: 'schlaegt', i: 'Saite auf Jawari-Steg, Resonanzsaiten singen mit', tags: 'sitar indien raga jawari steg schnarren buzz tarab sympathetic resonanzsaiten chikari mizrab meend psychedelisch', hoehe: 'Steg (klar → Jawari)', regen: 1, hear: { gate: 2.0 }, rich: 'Stufe 3: die Tarab-Saiten im Stereo' },
  kto: { n: 'Koto', fam: 'holz', art: 'beides', i: 'Seidensaite, Elfenbeinnagel, Nachdrücken (Oshide)', tags: 'koto japan japanisch zither seide silk nagel tsume oshide pentatonik saite string zupfen pluck guzheng asien', hoehe: 'Anschlag; gehalten: hoch = Nachdrücken', regen: 1, hear: { gate: 1.6 }, rich: 'Stufe 3: der Korpus im Stereo' },
  glo: { n: 'Glocke', fam: 'erz', art: 'schlaegt', i: 'FM-Glocken mit unharmonischen Obertönen', tags: 'glocke bell fm metall metal' },
  sch: { n: 'Schale', fam: 'erz', art: 'schlaegt', i: 'Klangschalen mit schwebenden Teiltönen', tags: 'klangschale singing bowl schale tibet metall' },
  gng: { n: 'Gong', fam: 'erz', art: 'schlaegt', i: 'Gong und Tamtam – Obertöne blühen nach dem Schlag auf', tags: 'gong tamtam metall metal', regen: 0 },
  klb: { n: 'Kalimba', fam: 'erz', art: 'schlaegt', i: 'Daumenklavier – Metallzungen über einem Holzkasten', tags: 'kalimba mbira daumenklavier thumb piano zunge' },
  gsp: { n: 'Gespinst', fam: 'erz', art: 'schlaegt', i: 'Ein Netz aus Saiten, das Finger und Puls teilen', tags: 'sympathetisch resonanz netz saiten steg sitar ökologie sympathetic strings web halo', hoehe: 'Zupfhelligkeit', regen: 1, rich: 'Stufe 3: zwölf Saiten im Netz, ein Doppelchor am Finger' },
  hng: { n: 'Handpan', fam: 'erz', art: 'schlaegt', i: 'Stahlfelder, harmonisch gestimmt – Daumen bis Spitze', tags: 'handpan hang pantam steel tongue drum stahl pfanne ufo oktave quinte meditation ambient perkussion', hoehe: 'Anschlagstelle', regen: 1, hear: { gate: 2.0 }, rich: 'Stufe 3: die schwebenden Modenpaare im Stereo' },
  gml: { n: 'Gamelan', fam: 'erz', art: 'schlaegt', i: 'Bronzestäbe in Paaren – jede Note schwebt (Ombak)', tags: 'gamelan bali java saron gender metallophon bronze ombak schwebung pelog slendro gong indonesien', hoehe: 'Schlägel', regen: 1, hear: { gate: 1.6 }, rich: 'Stufe 3: das Paar links und rechts' },
  hht: { n: 'Zischel', fam: 'erz', art: 'schlaegt', i: '808-Hi-Hat aus sechs Rechtecken, Wirbel im Puls', tags: 'zischel hihat hi-hat hat 808 trap drill wirbel roll rolls becken cymbal metall perkussion beats', hoehe: 'offen', regen: 1, hear: { gate: 0.6 }, rich: 'Stufe 3: das Metall im Stereo' },
  spu: { n: 'Spieluhr', fam: 'erz', art: 'schlaegt', i: 'Stahlkamm, Walzenstift, müdes Uhrwerk', tags: 'spieluhr music box spieldose kamm comb zunge glockenspiel celesta lofi nostalgie kinder traum uhrwerk', hoehe: 'Aufzug (müde → frisch)', regen: 1, hear: { gate: 1.6 }, rich: 'Stufe 3: Doppelzungen, links und rechts' },
  tie: { n: 'Tiefe', fam: 'erde', art: 'haelt', i: 'Subbass, der in seinen Ton stürzt – vom Dröhnen bis zum 808-Kick', tags: 'bass sub 808 kick drone tief low' },
  glt: { n: 'Glut', fam: 'erde', art: 'haelt', i: 'Gestimmte Rückkopplung, die nachglüht', tags: 'feedback rückkopplung larsen glühen glut schleife loop drone heulen howl verstärker amp', hoehe: 'Gewinn', hear: { gate: 2.0 }, rich: 'Stufe 3: zwei Schleifen links und rechts, leicht verstimmt und gekoppelt' },
  mem: { n: 'Membran', fam: 'erde', art: 'schlaegt', i: 'Trommelfelle mit Tonhöhensprung', tags: 'trommel drum fell membran perkussion percussion tom pauke' },
  trp: { n: 'Tropfen', fam: 'erde', art: 'schlaegt', i: 'Wassertropfen – Luftblasen mit aufsteigendem Ton', tags: 'tropfen wasser drop water blase bubble regen' },
  mdr: { n: 'Moder', fam: 'erde', art: 'schlaegt', i: 'Kompostglocke – Glanz zerfällt zu Knistern, Brummen', tags: 'kompost fäulnis pilz verdauung knistern brummen glocke holz knochen umgekehrt anschwellen perkussion compost rot decay crackle swell reverse bell', hoehe: 'Feuchte', rich: 'Stufe 3: zwölf Teiltöne links und rechts, das Knistern im Raum verteilt' },
  rhz: { n: 'Rhizom', fam: 'erde', art: 'schlaegt', i: 'Ein Schlag läuft durch die Skala – Lawinen im Netz', tags: 'rhizom wurzel netz lawine kaskade ausbreitung erschöpfung neuron welle holz metall glas perkussion marimba avalanche cascade network spread ripple', hoehe: 'Ausbreitung', regen: 1, rich: 'Stufe 3: drei Teiltöne je Ping, die Lawine läuft im Stereo die Tonlage entlang' },
  tbl: { n: 'Tabla', fam: 'erde', art: 'beides', i: 'Dayan singt gestimmt, Bayan steigt unterm Ballen', tags: 'tabla dayan bayan indien trommel drum syahi tun tin na ge ke gamak perkussion raga', hoehe: 'Schlag (Mitte → Rand)', regen: 1, hear: { gate: 1.0 }, rich: 'Stufe 3: wie Stufe 1' },
  did: { n: 'Didgeridoo', fam: 'erde', art: 'haelt', i: 'Lippen im Rohr – die Zunge formt das „wa-yo“', tags: 'didgeridoo yidaki australien drone lippen rohr bordun zirkularatmung knurren growl vokal formant', hoehe: 'Zunge (Vokal)', regen: 0, hear: { gate: 1.6 }, rich: 'Stufe 3: wie Stufe 1' },
  wal: { n: 'Walgesang', fam: 'erde', art: 'haelt', i: 'Walgesang – Bögen, Knarren, Ferne unter Wasser', tags: 'wal whale buckelwal humpback gesang song meer ozean unterwasser underwater tief stöhnen moan ruf call ambient', hoehe: 'Bogen (sinkt → steigt)', regen: 0, hear: { gate: 2.2 }, rich: 'Stufe 3: das Meer antwortet rechts später' },
  wkg: { n: 'Westküste', fam: 'strom', art: 'beides', i: 'Wavefolder und Vaktrol – der Buchla-Bongo', tags: 'westküste west coast buchla wavefolder falter lowpass gate vactrol vaktrol fm complex oscillator bongo modular experimentell', hoehe: 'Faltung', regen: 1, hear: { gate: 1.0 }, rich: 'Stufe 3: wie Stufe 1' },
  bnt: { n: 'Schaltkreis', fam: 'strom', art: 'beides', i: 'Verbogene Schaltung: Sprünge, Stottern, Bits', tags: 'schaltkreis circuit bending bent glitch bitcrush bitcrusher lofi sample rate stotter stutter spielzeug toy noise experimentell kaputt', hoehe: 'Zerstörung', regen: 1, hear: { gate: 1.0 }, rich: 'Stufe 3: wie Stufe 1' },
  kas: { n: 'Kassette', fam: 'strom', art: 'beides', i: 'E-Piano auf altem Band: Leiern, Rauschen, Wärme', tags: 'kassette cassette tape band lofi lo-fi rhodes wurlitzer e-piano epiano electric piano wow flutter leiern hiss chillhop beats', hoehe: 'Anschlag (weich → bellend)', regen: 1, hear: { gate: 1.6 }, rich: 'Stufe 3: wie Stufe 1' },
  bit: { n: 'Achtbit', fam: 'strom', art: 'beides', i: 'Pulswellen-Chip, Arpeggio-Flimmern, 4-Bit-Lautstärke', tags: 'achtbit 8bit 8-bit chiptune chip nes gameboy c64 sid pulse puls rechteck square arpeggio tracker retro game videospiel', hoehe: 'Tastgrad', regen: 1, hear: { gate: 0.8 }, rich: 'Stufe 3: zweiter Kanal, verstimmt, links und rechts' },
  gbs: { n: 'Gleitbass', fam: 'erde', art: 'haelt', i: '808-Bass: Knack, Gleiten, Antrieb – Trap', tags: 'gleitbass 808 bass sub trap drill hiphop glide slide portamento kick distortion verzerrung tief bass', hoehe: 'Antrieb', regen: 0, hear: { gate: 1.2 }, rich: 'Stufe 3: wie Stufe 1' },
};
// sources of later versions (and the reserves): a preset that names one says so once and plays Nebel instead
const ENG_LATER = { unk: 'Unke', fle: 'Flechte', blz: 'Balz' };
// a key that was renamed (old: new), applied before a patch is checked; keys are never reused
const ENG_ALIAS = {};
// the one flat order (‹ ›, MIDI stepping, dice, the mixer's source text): by family, in ENG_META's order within it
const ENG_OPTS = FAM.flatMap(([f]) => Object.keys(ENG_META).filter((k) => ENG_META[k].fam === f).map((k) => [k, ENG_META[k].n]));
const ENG_NAME = Object.fromEntries(ENG_OPTS);
const ENG_INFO = Object.fromEntries(ENG_OPTS.map(([k]) => [k, ENG_META[k].i]));
const ART_WORD = { haelt: 'hält', schlaegt: 'schlägt', beides: 'beides' };
const WAVE_OPTS = [['sine', 'Sinus'], ['triangle', 'Dreieck'], ['sawtooth', 'Säge'], ['square', 'Rechteck'], ['glass', 'Glas'], ['organ', 'Orgel']];
const pctSigned = (v) => (v > 0.005 ? 'R ' : v < -0.005 ? 'L ' : '') + (Math.abs(v) < 0.005 ? 'Mitte' : Math.round(Math.abs(v) * 100) + ' %');

// Spielweise
SEL('v.eng', 'Klangquelle', ENG_OPTS, 'neb', { lib: 1 });
SEL('v.layer', 'Zweite Ebene', [['off', 'Aus'], ...ENG_OPTS], 'off', { lib: 1 });
NUM('v.layerLvl', 'Lautstärke Ebene', 0, 1, 0.5, '%');
NUM('v.layerInt', 'Intervall Ebene', -24, 24, 12, 'HT', { step: 1 });
SEL('v.roll', 'Wirbel beim Halten (Schlagklänge)', [['off', 'Aus'], ['4', '1/4'], ['8', '1/8'], ['12', '1/8 T'], ['16', '1/16'], ['24', '1/16 T'], ['32', '1/32']], 'off', { chips: 1 });
BOOL('v.strum', 'Wischen schlägt an', true);
NUM('v.glide', 'Gleiten', 0, 1.5, 0.08, 's', { curve: 'sq' });
NUM('v.vel', 'Anschlag', 0.1, 1, 0.75, '%');
NUM('v.human', 'Humanisieren', 0, 1, 0.25, '%');
NUM('v.width', 'Stereobreite', 0, 1, 0.6, '%');
// pitch of each finger layer: whole steps of the scale (semitones in the free scale), then octaves
const fmtOct = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const fmtDeg = (v) => (v ? (v > 0 ? '+' : '−') + Math.abs(v) + (Math.abs(v) === 1 ? ' Stufe' : ' Stufen') : '±0');
NUM('v.oct', 'Oktave', -2, 2, 0, '', { step: 1, fmt: fmtOct });
NUM('v.deg', 'Tonstufe', -7, 7, 0, '', { step: 1, fmt: fmtDeg });
NUM('v.layerDeg', 'Tonstufe Ebene', -7, 7, 0, '', { step: 1, fmt: fmtDeg });
// Stimmung
SEL('t.root', 'Grundton', NOTE_NAMES.map((n, i) => [String(i), n]), '2', { chips: 1, small: 1 });
SEL('t.scale', 'Skala', Object.entries(SCALES).map(([k, s]) => [k, s.n]), 'mpent');
NUM('t.oct', 'Grundoktave', 1, 5, 3, '', { step: 1, fmt: (v) => 'Oktave ' + v });
NUM('t.range', 'Umfang', 1, 4, 2, '', { step: 1, fmt: (v) => v + (v > 1 ? ' Oktaven' : ' Oktave') });
BOOL('t.just', 'Reine Stimmung (5-Limit)', false);
NUM('t.a4', 'Kammerton a¹', 415, 466, 440, 'Hz', { step: 1 });
// Nebel
SEL('neb.wave', 'Wellenform', WAVE_OPTS, 'sawtooth', { chips: 1 });
NUM('neb.spread', 'Verstimmung', 0, 50, 12, 'ct');
NUM('neb.sub', 'Suboktave', 0, 1, 0.35, '%');
NUM('neb.breath', 'Atem (Rauschen)', 0, 1, 0.15, '%');
NUM('neb.cut', 'Tiefpass', 80, 12000, 900, 'Hz', { curve: 'exp' });
NUM('neb.res', 'Resonanz', 0.1, 18, 2, 'dB', { curve: 'exp' });
NUM('neb.ymod', 'Höhe → Tiefpass', 0, 5, 3, 'oct');
NUM('neb.att', 'Einschwingen', 0.005, 6, 0.6, 's', { curve: 'exp' });
NUM('neb.rel', 'Ausklingen', 0.05, 12, 2.5, 's', { curve: 'exp' });
// Körner
SEL('kor.src', 'Quelle', [['glas', 'Glasharfe'], ['chor', 'Chor'], ['metall', 'Metall'], ['staub', 'Staub'], ['wasser', 'Wasser'], ['voegel', 'Vögel'], ['zikaden', 'Zikaden'], ['fluestern', 'Flüstern'], ['orgel', 'Harmonium'], ['funk', 'Kurzwelle'], ['echo', 'Echo (letzte 8 s)'], ['datei', 'Eigene Datei'], ['mikro', 'Mikrofon (live)'], ['schleife', 'Schleife']], 'glas', { chips: 1 });   // (Hexenring: a Schleife nährt die Körner)
NUM('kor.dens', 'Dichte', 2, 90, 22, '/s', { curve: 'exp' });
NUM('kor.size', 'Korngröße', 0.015, 0.6, 0.14, 's', { curve: 'exp' });
NUM('kor.scat', 'Streuung', 0, 1, 0.25, '%');
NUM('kor.pjit', 'Tonhöhen-Streuung', 0, 100, 8, 'ct');
NUM('kor.oct', 'Oktavsprünge', 0, 1, 0.1, '%');
NUM('kor.rev', 'Rückwärts', 0, 1, 0.2, '%');
NUM('kor.att', 'Einschwingen', 0.01, 4, 0.4, 's', { curve: 'exp' });
NUM('kor.rel', 'Ausklingen', 0.05, 8, 1.8, 's', { curve: 'exp' });
// Hauch
NUM('hau.color', 'Farbe', -2, 3, 1, 'oct');
NUM('hau.q', 'Pfeifen (Güte)', 0.3, 60, 6, '', { curve: 'exp', fmt: (v) => 'Q ' + dec(v.toFixed(v < 10 ? 1 : 0)) });
NUM('hau.sweep', 'Höhe → Farbe', 0, 4, 2, 'oct');
NUM('hau.att', 'Einschwingen', 0.005, 4, 0.3, 's', { curve: 'exp' });
NUM('hau.rel', 'Ausklingen', 0.03, 8, 1.2, 's', { curve: 'exp' });
NUM('hau.burst', 'Stoß (Puls/Wischen)', 0.02, 1.5, 0.12, 's', { curve: 'exp' });
// Glocke
NUM('glo.ratio', 'Frequenzverhältnis', 0.5, 8, 3.5, '×', { step: 0.01 });
NUM('glo.index', 'Modulationstiefe', 0, 12, 4, '', { fmt: (v) => 'I ' + dec(v.toFixed(1)) });
NUM('glo.decay', 'Abklingen', 0.1, 12, 3, 's', { curve: 'exp' });
NUM('glo.bright', 'Glanzdauer', 0.02, 1, 0.3, '%');
NUM('glo.beat', 'Schwebung', 0, 8, 1.2, 'Hz');
NUM('glo.click', 'Anschlagsklick', 0, 1, 0.2, '%');
// Membran
NUM('mem.drop', 'Tonhöhensprung', 0, 36, 12, 'HT');
NUM('mem.dropT', 'Sprungzeit', 0.005, 0.4, 0.06, 's', { curve: 'exp' });
NUM('mem.decay', 'Abklingen', 0.04, 4, 0.7, 's', { curve: 'exp' });
NUM('mem.mode2', 'Obermode', 0, 1, 0.35, '%');
NUM('mem.ratio2', 'Mode-Verhältnis', 1.1, 3.2, 1.59, '×');
NUM('mem.noise', 'Fell (Rauschen)', 0, 1, 0.25, '%');
NUM('mem.tone', 'Fellfarbe', 0.5, 14, 4, '×', { curve: 'exp' });
// Saite
NUM('sai.decay', 'Abklingen', 0.2, 10, 3, 's', { curve: 'exp' });
NUM('sai.bright', 'Helligkeit', 0, 1, 0.55, '%');
NUM('sai.damp', 'Höhendämpfung', 0, 1, 0.4, '%');
NUM('sai.pos', 'Anschlagspunkt', 0.02, 0.5, 0.18, '%');
NUM('sai.body', 'Korpus', 0, 1, 0.3, '%');
// Schale
NUM('sch.decay', 'Abklingen', 1, 30, 9, 's', { curve: 'exp' });
NUM('sch.beat', 'Schwebung', 0, 6, 1.5, 'Hz');
NUM('sch.bright', 'Obertöne', 0.1, 1, 0.55, '%');
NUM('sch.stretch', 'Spreizung', -0.3, 0.3, 0, '%');
NUM('sch.mallet', 'Schlägelhärte', 0, 1, 0.4, '%');
// Gong
NUM('gng.decay', 'Abklingen', 2, 30, 12, 's', { curve: 'exp' });
NUM('gng.bloom', 'Aufblühen', 0.05, 4, 0.8, 's', { curve: 'exp' });
NUM('gng.bright', 'Obertöne', 0, 1, 0.6, '%');
NUM('gng.glide', 'Tonhöhengleiten', -150, 150, -40, 'ct', { fmt: (v) => (Math.abs(v) < 0.5 ? 'aus' : (v < 0 ? 'sinkt ' : 'steigt ') + Math.round(Math.abs(v)) + ' ct') });
NUM('gng.beat', 'Schwebung', 0, 4, 0.7, 'Hz');
NUM('gng.shimmer', 'Schimmer', 0, 1, 0.4, '%');
// Kalimba
NUM('klb.decay', 'Abklingen', 0.2, 8, 2.2, 's', { curve: 'exp' });
NUM('klb.over', 'Obertöne', 0, 1, 0.5, '%');
NUM('klb.ratio', 'Oberton-Verhältnis', 3, 9, 5.9, '×', { step: 0.01 });
NUM('klb.thumb', 'Daumen (Klopfen)', 0, 1, 0.45, '%');
NUM('klb.body', 'Holzkasten', 0, 1, 0.5, '%');
NUM('klb.buzz', 'Schnarren', 0, 1, 0.15, '%');
// Obertöne
NUM('obt.top', 'Obertonbereich', 6, 32, 16, '', { step: 1, fmt: (v) => Math.max(2, Math.round(v / 4)) + '.–' + v + '.' });
NUM('obt.focus', 'Schärfe', 0, 1, 0.5, '%');
NUM('obt.body', 'Körper (Grundton)', 0, 1, 0.5, '%');
NUM('obt.wander', 'Wandern', 0, 1, 0.3, '%');
NUM('obt.att', 'Einschwingen', 0.005, 4, 0.15, 's', { curve: 'exp' });
NUM('obt.rel', 'Ausklingen', 0.05, 8, 1.5, 's', { curve: 'exp' });
// Stimme
NUM('stm.choir', 'Chorbreite', 0, 40, 12, 'ct');
NUM('stm.vib', 'Vibrato', 0, 60, 14, 'ct');
NUM('stm.breath', 'Atem', 0, 1, 0.25, '%');
NUM('stm.shift', 'Stimmlage', -12, 12, 0, 'HT', { step: 1 });
NUM('stm.att', 'Einschwingen', 0.005, 6, 0.7, 's', { curve: 'exp' });
NUM('stm.rel', 'Ausklingen', 0.05, 12, 3, 's', { curve: 'exp' });
// Schwarm
NUM('swm.chaos', 'Chaos', 0, 1, 0.5, '%');
NUM('swm.spread', 'Schwarmbreite', 0, 60, 16, 'ct');
NUM('swm.unrest', 'Unruhe', 0, 1, 0.5, '%');
NUM('swm.chirp', 'Zirpen', 0, 1, 0.4, '%');
NUM('swm.att', 'Einschwingen', 0.005, 6, 0.25, 's', { curve: 'exp' });
NUM('swm.rel', 'Ausklingen', 0.05, 12, 1.8, 's', { curve: 'exp' });
// Tiefe
NUM('tie.oct', 'Oktavlage', -3, 0, -2, '', { step: 1, fmt: (v) => (v ? '−' + Math.abs(v) + (v < -1 ? ' Oktaven' : ' Oktave') : 'wie gespielt') });
NUM('tie.drop', 'Tonhöhensprung', 0, 36, 12, 'HT');
NUM('tie.dropT', 'Sprungzeit', 0.005, 1.5, 0.06, 's', { curve: 'exp' });
NUM('tie.drive', 'Sättigung', 0, 1, 0.5, '%');
NUM('tie.click', 'Klick', 0, 1, 0.3, '%');
NUM('tie.rel', 'Ausklingen', 0.05, 8, 0.5, 's', { curve: 'exp' });
// Tropfen
NUM('trp.chirp', 'Aufstieg', 0, 3, 1, 'oct');
NUM('trp.rise', 'Steigzeit', 0.005, 0.6, 0.04, 's', { curve: 'exp' });
NUM('trp.decay', 'Abklingen', 0.03, 3, 0.5, 's', { curve: 'exp' });
NUM('trp.rain', 'Regen', 0, 1, 0.35, '%');
NUM('trp.spread', 'Regendauer', 0.05, 2, 0.3, 's', { curve: 'exp' });
NUM('trp.splash', 'Aufprall', 0, 1, 0.3, '%');
// Halm (worklet: Höhe is the breath – these shape the pipe around it; each pipe names the knobs its own way)
const HLM_LAB = {
  floete: { atem: 'Atem (Druck)', mund: 'Lippe (Helligkeit)', blatt: 'Strahl (Überblasen)', luft: 'Luft (Rauschen)', zunge: 'Zunge (Anstoß)' },
  flamme: { atem: 'Hitze', mund: 'Rohr (Helligkeit)', blatt: 'Flackern', luft: 'Feuer (Knistern)', zunge: 'Zündung' },
};
const hlmLab = (k) => () => (HLM_LAB[P['hlm.rohr']] || {})[k];
SEL('hlm.rohr', 'Rohr', [['rohrblatt', 'Rohrblatt'], ['floete', 'Flöte'], ['flamme', 'Flamme']], 'rohrblatt', { chips: 1 });
NUM('hlm.atem', 'Atem (Druck)', 0, 1, 0.5, '%', { lab: hlmLab('atem') });
NUM('hlm.mund', 'Mund (Helligkeit)', 0, 1, 0.4, '%', { lab: hlmLab('mund') });
NUM('hlm.blatt', 'Blatt (weich)', 0, 1, 0.5, '%', { lab: hlmLab('blatt') });
NUM('hlm.luft', 'Luft (Rauschen)', 0, 1, 0.4, '%', { lab: hlmLab('luft') });
NUM('hlm.zunge', 'Zunge (Anstoß)', 0, 1, 0.5, '%', { lab: hlmLab('zunge') });
// Ranke (worklet: Höhe is the hammer's width)
const rnkT60 = (v) => 8 * Math.pow(0.3 / 8, v);   // Dämpfung → decay of a struck ring (s)
NUM('rnk.masse', 'Masse', 0, 1, 0.5, '%');
NUM('rnk.feder', 'Feder', 0, 1, 0.5, '%');
NUM('rnk.mitte', 'Mitte (Rückstellung)', 0, 1, 0.3, '%');
NUM('rnk.daempfung', 'Dämpfung', 0, 1, 0.4, '', { fmt: (v) => 'Nachklang ' + dec(rnkT60(v).toFixed(1)) + ' s' });
NUM('rnk.hammer', 'Hammerhärte', 0, 1, 0.5, '%');
NUM('rnk.holz', 'Holz (Unregelmäßigkeit)', 0, 1, 0.3, '%');
// Elmsfeuer (native: Höhe is the voltage – hum, corona, arc)
NUM('elm.spannung', 'Spannung', 0, 1, 0.5, '%');
NUM('elm.netz', 'Netz (Brummen gefaltet)', 0, 1, 0.4, '%');
NUM('elm.knistern', 'Knistern', 0, 1, 0.5, '%');
NUM('elm.bogen', 'Bogen', 0, 1, 0.6, '%');
NUM('elm.reichweite', 'Reichweite', 1, 2, 2, '', { step: 1, fmt: (v) => v + (v > 1 ? ' Oktaven' : ' Oktave') + ' über dem Ton' });
NUM('elm.flackern', 'Flackern', 0, 1, 0.5, '%');
// Jahresring (native: Höhe is where the mallet strikes; the bar lives in a year)
const jrgT60 = (v) => 0.4 * Math.pow(7.5, v);   // Holz → the fundamental's ring (s), before the season and the note's height
NUM('jrg.jahr', 'Jahr', 0, 12, 4, '', { step: 0.5, fmt: (v) => (v > 0 ? dec(v) + ' min' : 'Stillstand') });
SEL('jrg.jahreszeit', 'Jahreszeit', [['lauf', 'Läuft'], ['fruehling', 'Frühling'], ['sommer', 'Sommer'], ['herbst', 'Herbst'], ['winter', 'Winter']], 'lauf', { chips: 1 });
NUM('jrg.schnitt', 'Schnitt (frei → Marimba)', 0, 1, 0.5, '%');
NUM('jrg.holz', 'Holz', 0, 1, 0.5, '', { fmt: (v) => 'Nachklang ' + dec(jrgT60(v).toFixed(1)) + ' s' });
NUM('jrg.schlaegel', 'Schlägel (hart)', 0, 1, 0.5, '%');
NUM('jrg.laub', 'Laub und Eis', 0, 1, 0.4, '%');
// Harz (worklet myzel-bow: a bow on banded waveguides; Höhe is the bow's pressure)
const HRZ_PEAK = 1.2;   // v.out peak per velocity (the standard phrase as loud as Nebel/Glocke/Membran, klang/tests/bench.js)
const HRZ_RING = { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 };   // each body's ring × the Dämpfung's (as in the processor)
const hrzT60 = (v) => (0.4 + 6 * (1 - v) * (1 - v)) * (HRZ_RING[P['hrz.koerper']] || 1);   // the fundamental's ring once the bow is lifted (s)
SEL('hrz.koerper', 'Körper', [['glas', 'Glas'], ['schale', 'Schale'], ['stab', 'Stab'], ['zunge', 'Zunge'], ['teich', 'Teich']], 'glas', { chips: 1 });
NUM('hrz.druck', 'Druck', 0, 1, 0.5, '%');
NUM('hrz.bogen', 'Bogen (Tempo)', 0, 1, 0.5, '%');
NUM('hrz.daempfung', 'Dämpfung', 0, 1, 0.6, '', { fmt: (v) => 'Nachklang ' + dec(hrzT60(v).toFixed(1)) + ' s' });
NUM('hrz.schwebung', 'Schwebung', 0, 1, 0.3, '%');
NUM('hrz.harz', 'Harz (Reibung)', 0, 1, 0.3, '%');
// Sehne (worklet myzel-string: a live waveguide string; Höhe is the hand – palm, open, flageolet, E-Bow)
const SHN_PEAK = 1.55;   // v.out peak per velocity (the standard phrase as loud as Nebel/Glocke/Membran, klang/tests/bench.js)
SEL('shn.steg', 'Steg', [['flach', 'Flach'], ['jawari', 'Jawari']], 'flach', { chips: 1 });
NUM('shn.daempfung', 'Nachklang', 0.3, 8, 2.5, 's', { curve: 'exp' });
NUM('shn.steifheit', 'Steifheit', 0, 1, 0.25, '%');
NUM('shn.zupfort', 'Zupfort (vom Steg)', 0.05, 0.5, 0.13, '%');
NUM('shn.hand', 'Hand', 0, 1, 0.5, '%');
NUM('shn.ebow', 'E-Bow', 0, 1, 0.5, '%');
// Zapfen (worklet myzel-scrape – without AudioWorklet its own native stand-in, zpfNative): a stick over the scales of
// a cone; Höhe is the scrape rate (ticks → rasp → Rast → the note)
const ZPF_PEAK = 1.13;   // v.out peak per velocity: the standard phrase as loud as Nebel/Glocke/Membran (klang/tests/bench.js; SPEC's 0.6 left it 5.5 dB under, the processor's tanh only a guard)
const ZPF_RING = { zapfen: 1, holz: 1.3, panzer: 0.5, kuerbis: 1.6, fels: 1.4 };   // each body's ring × Klang's (as in the processor)
const zpfT60 = (v) => (0.05 + 0.35 * v) * (ZPF_RING[P['zpf.koerper']] || 1);   // Klang → a knock's ring on the note (s)
SEL('zpf.koerper', 'Körper', [['zapfen', 'Zapfen'], ['holz', 'Holz'], ['panzer', 'Panzer'], ['kuerbis', 'Kürbis'], ['fels', 'Fels']], 'zapfen', { chips: 1 });
NUM('zpf.schuppen', 'Schuppen (unregelmäßig)', 0, 1, 0.3, '%');
NUM('zpf.rast', 'Rast', 0, 1, 0.7, '', { fmt: (v) => 'rastet ab ' + Math.round(60 * (1.3 - v)) + ' % Höhe' });
NUM('zpf.klang', 'Klang', 0, 1, 0.4, '', { fmt: (v) => 'Nachklang ' + Math.round(1000 * zpfT60(v)) + ' ms' });
NUM('zpf.strich', 'Strich (Puls)', 0, 1, 0.5, '%');
NUM('zpf.kratzen', 'Kratzen', 0, 1, 0.3, '%');
// Moder (worklet myzel-rot: a struck body whose glitter is digested into crackle while its fundamental swells; Höhe at
// the hit is the moisture)
const MDR_PEAK = 0.45;   // v.out gain (the processor's level carries the velocity; the standard phrase as loud as Nebel/Glocke/Membran, klang/tests/bench.js)
SEL('mdr.koerper', 'Körper', [['glocke', 'Glocke'], ['holz', 'Holz'], ['knochen', 'Knochen']], 'glocke', { chips: 1 });
NUM('mdr.pilz', 'Pilz (Verdauung)', 0, 1, 0.5, '%');
NUM('mdr.knistern', 'Knistern', 0, 1, 0.4, '%');
NUM('mdr.schwellen', 'Schwellen', 0, 1, 0.6, '%');
NUM('mdr.nachklang', 'Nachklang', 1, 12, 5, 's', { curve: 'exp' });
NUM('mdr.schlaegel', 'Schlägel (hart)', 0, 1, 0.6, '%');
// Böe (worklet myzel-aeol: an aeolian harp; Höhe is the wind's strength – which string catches it)
const BOE_PEAK = 0.45, BOE_BURST = 2.8;   // v.out peak per velocity (SPEC; the processor's output is set so the standard phrase is as loud as Nebel/Glocke/Membran, klang/tests/bench.js); a Puls gust's × (its phrase of hits as loud as the held phrase)
NUM('boe.wind', 'Wind', 0, 1, 0.4, '%');   // (its reach: Höhe·(0.5 + Wind) – how high up the strings the field goes)
NUM('boe.boeen', 'Böen', 0, 1, 0.4, '%');
NUM('boe.nachklang', 'Nachklang', 0.5, 6, 3, 's', { curve: 'exp' });
NUM('boe.rauschen', 'Rauschen', 0, 1, 0.3, '%');
NUM('boe.fang', 'Fang (Einrasten)', 0, 1, 0.3, '%');
NUM('boe.dunkel', 'Dunkel', 0, 1, 0.3, '%');
// Amöbe (worklet myzel-gendy: Xenakis' GENDY, the pitch held; Höhe is the unrest)
const AMO_PEAK = 0.45;   // v.out peak per velocity (the standard phrase as loud as Nebel/Glocke/Membran, klang/tests/bench.js)
const AMO_REL = 1.25;   // the native release × this, the processor's own fade (τ 0.8·rel) on top: together τ = rel/5
SEL('amo.verteilung', 'Verteilung', [['linear', 'Linear'], ['cauchy', 'Ausreißer'], ['logist', 'Logistisch'], ['sinus', 'Sinus']], 'linear', { chips: 1 });
NUM('amo.punkte', 'Punkte', 3, 24, 12, '', { step: 1, fmt: (v) => Math.round(v) + ' Punkte' });
NUM('amo.zeit', 'Zeit (Dauern wandern)', 0, 1, 0.15, '%');
NUM('amo.rueck', 'Rückkehr', 0, 1, 0.3, '%');
NUM('amo.att', 'Einschwingen', 0.005, 2, 0.02, 's', { curve: 'exp' });
NUM('amo.rel', 'Ausklingen', 0.05, 6, 0.3, 's', { curve: 'exp' });
// Gespinst (a native pluck on the finger; every Gespinst voice also feeds one web of strings on a shared bridge)
SEL('gsp.saiten', 'Saiten', [['oktave', 'Eine Oktave'], ['zwei', 'Zwei Oktaven']], 'oktave', { chips: 1 });
NUM('gsp.kopplung', 'Kopplung', 0, 1, 0.4, '%');
NUM('gsp.nachklang', 'Nachklang', 0.5, 8, 2, 's', { curve: 'exp' });
NUM('gsp.metall', 'Metall', 0, 1, 0.2, '%');
NUM('gsp.steg', 'Steg', 0, 1, 0.5, '%');
NUM('gsp.halo', 'Halo (Netz)', -24, 0, -9, 'dB', { step: 0.5 });
NUM('rhz.reiz', 'Reiz', 0, 1, 0.5, '%');
NUM('rhz.erholung', 'Erholung', 0.1, 2, 0.6, 's', { curve: 'exp' });
NUM('rhz.weg', 'Weg (je Stufe)', 15, 150, 40, 'ms', { curve: 'exp' });
SEL('rhz.knoten', 'Knoten', [['holz', 'Holz'], ['metall', 'Metall'], ['glas', 'Glas']], 'holz', { chips: 1 });
NUM('rhz.glimmen', 'Glimmen', 0.03, 0.6, 0.12, 's', { curve: 'exp' });
NUM('rhz.streuung', 'Streuung', 0, 1, 0.3, '%');
// Kehlchen (worklet myzel-syrinx: a songbird's syrinx; Höhe is the air sac's pressure – breath, chip, tone, rough)
const KHL_PEAK = 0.31;   // v.out peak per velocity (the standard phrase as loud as Nebel/Glocke/Membran, klang/tests/bench.js)
SEL('khl.silbe', 'Silbe', [['aus', 'Aus'], ['chip', 'Chip'], ['triller', 'Triller'], ['ruf', 'Ruf']], 'chip', { chips: 1 });
NUM('khl.druck', 'Druck (Schwelle)', 0, 1, 0.5, '%');
NUM('khl.spannung', 'Spannung', 0, 1, 0.5, '%');
NUM('khl.rauheit', 'Rauheit', 0, 1, 0.3, '%');
NUM('khl.schnabel', 'Schnabel', 0, 1, 0.5, '%');
NUM('khl.anstieg', 'Anstieg', 0, 1, 0.3, '%');
// ---- Klangbibliothek II, Etappe 1 (26.10.2026): Welt – Handpan, Gamelan, Sitar, Tabla, Didgeridoo, Maultrommel ----
// (v.out peaks per velocity: the standard phrase as loud as Nebel/Glocke/Membran – dev/tests/klang/tests/lib2.js)
const HNG_PEAK = 2.82, GML_PEAK = 2.44, SIT_PEAK = 1, TBL_PEAK = 2.65, DID_PEAK = 0.655, MTR_PEAK = 1.58;   // (Tabla 2 dB under the others: its strike's peak stays under −1 dBFS)
NUM('hng.glanz', 'Glanz', 0, 1, 0.5, '%');
NUM('hng.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('hng.koerper', 'Körper (Gu)', 0, 1, 0.5, '%');
NUM('hng.schweben', 'Schweben', 0, 1, 0.4, '%');
NUM('gml.ombak', 'Ombak (Schwebung)', 0, 1, 0.65, '%');
NUM('gml.schlegel', 'Schlägel', 0, 1, 0.5, '%');
NUM('gml.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('gml.daempfen', 'Abdämpfen', 0, 1, 0.6, '%');
NUM('sit.jawari', 'Jawari', 0, 1, 0.6, '%');
NUM('sit.tarab', 'Tarab (Resonanzsaiten)', 0, 1, 0.5, '%');
NUM('sit.chikari', 'Chikari', 0, 1, 0.35, '%');
NUM('sit.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('tbl.syahi', 'Syahi (Singen)', 0, 1, 0.6, '%');
NUM('tbl.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('tbl.bayan', 'Bayan bis', 0, 1, 0.5, '%');
NUM('tbl.gamak', 'Gamak (Ballen)', 0, 1, 0.6, '%');
NUM('did.rohr', 'Rohr', 0, 1, 0.6, '%');
NUM('did.knurren', 'Knurren', 0, 1, 0.25, '%');
NUM('did.atem', 'Zirkularatmung', 0, 1, 0.5, '%');
NUM('did.rauheit', 'Rauheit', 0, 1, 0.3, '%');
NUM('mtr.zupfen', 'Nachzupfen', 0, 1, 0.35, '%');
NUM('mtr.mund', 'Mund (schmal)', 0, 1, 0.6, '%');
NUM('mtr.atem', 'Atem', 0, 1, 0.35, '%');
NUM('mtr.klang', 'Klang', 0, 1, 0.5, '%');
const NRD_PEAK = 2.1;
NUM('nrd.vorhang', 'Vorhang (Bewegung)', 0, 1, 0.4, '%');
NUM('nrd.schimmer', 'Schimmer', 0, 1, 0.4, '%');
NUM('nrd.teiltoene', 'Nur ungerade', 0, 1, 0, '%');
NUM('nrd.anstieg', 'Anstieg', 0, 1, 0.4, '%');
const SHT_PEAK = 1.31;
NUM('sht.schimmer', 'Schimmer', 0, 1, 0.6, '%');
NUM('sht.raum', 'Raum', 0, 1, 0.6, '%');
NUM('sht.quinte', 'Quinte', 0, 1, 0.2, '%');
NUM('sht.farbe', 'Farbe', 0, 1, 0.5, '%');
const OND_PEAK = 1;
NUM('ond.palme', 'Palme', 0, 1, 0.4, '%');
NUM('ond.metall', 'Métallique', 0, 1, 0.15, '%');
NUM('ond.vibrato', 'Vibrato', 0, 1, 0.35, '%');
NUM('ond.klang', 'Klang', 0, 1, 0, '%');
const WAL_PEAK = 1.54;
NUM('wal.bogen', 'Bogen', 0, 1, 0.6, '%');
NUM('wal.dauer', 'Dauer', 0, 1, 0.5, '%');
NUM('wal.knarren', 'Knarren', 0, 1, 0.3, '%');
NUM('wal.tiefe', 'Tiefe (Wasser)', 0, 1, 0.6, '%');
const STP_PEAK = 0.68;
NUM('stp.tempo', 'Tempo', 0, 1, 0.4, '%');
NUM('stp.spanne', 'Spanne', 0, 1, 0.6, '%');
NUM('stp.atmen', 'Atmen', 0, 1, 0.4, '%');
NUM('stp.ruhe', 'Ruhe (Mitte)', 0, 1, 0.3, '%');
const ATR_PEAK = 0.78;
NUM('atr.mischung', 'Mischung (rund → spitz)', 0, 1, 0.3, '%');
NUM('atr.farbe', 'Farbe', 0, 1, 0.6, '%');
NUM('atr.drift', 'Drift', 0, 1, 0.3, '%');
NUM('atr.tiefe', 'Unterseite', 0, 1, 0.4, '%');
const TNL_PEAK = 2.47;
NUM('tnl.tempo', 'Tempo', 0, 1, 0.3, '%');
NUM('tnl.tiefe', 'Tiefe', 0, 1, 0.7, '%');
NUM('tnl.rauschen', 'Rauschen', 0, 1, 0.45, '%');
NUM('tnl.breite', 'Breite', 0, 1, 0.5, '%');
const WKG_PEAK = 0.8;
NUM('wkg.faltung', 'Faltung', 0, 1, 0.4, '%');
NUM('wkg.fm', 'FM', 0, 1, 0.3, '%');
NUM('wkg.verhaeltnis', 'Verhältnis', 0, 1, 0.25, '%');
NUM('wkg.vaktrol', 'Vaktrol', 0, 1, 0.5, '%');
const BNT_PEAK = 0.9;
NUM('bnt.bits', 'Bits', 0, 1, 0.4, '%');
NUM('bnt.sprung', 'Sprung', 0, 1, 0.4, '%');
NUM('bnt.stottern', 'Stottern', 0, 1, 0.3, '%');
NUM('bnt.kreuz', 'Kreuzung', 0, 1, 0.3, '%');
const KAS_PEAK = 0.5;
NUM('kas.alter', 'Bandalter', 0, 1, 0.5, '%');
NUM('kas.glocke', 'Glocke', 0, 1, 0.4, '%');
NUM('kas.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('kas.waerme', 'Wärme', 0, 1, 0.5, '%');
const BIT_PEAK = 2.9;
NUM('bit.arpeggio', 'Arpeggio', 0, 1, 0, '%');
NUM('bit.leben', 'Leben (Vibrato, Breite)', 0, 1, 0.35, '%');
NUM('bit.dreieck', 'Dreieck (Bass)', 0, 1, 0.4, '%');
NUM('bit.abklingen', 'Abklingen', 0, 1, 0.4, '%');
const GBS_PEAK = 0.85;
NUM('gbs.knack', 'Knack', 0, 1, 0.5, '%');
NUM('gbs.ausklang', 'Ausklang', 0, 1, 0.6, '%');
NUM('gbs.gleiten', 'Gleiten', 0, 1, 0.4, '%');
NUM('gbs.ton', 'Ton', 0, 1, 0.6, '%');
const HHT_PEAK = 6;
NUM('hht.ton', 'Ton', 0, 1, 0.5, '%');
NUM('hht.wirbel', 'Wirbel (Puls)', 0, 1, 0.4, '%');
NUM('hht.rauschen', 'Rauschen', 0, 1, 0.25, '%');
NUM('hht.abwuergen', 'Abwürgen', 0, 1, 1, '%');
const VOX_PEAK = 1.57;
NUM('vox.konsonant', 'Konsonant', 0, 1, 0.4, '%');
NUM('vox.hauch', 'Hauch', 0, 1, 0.3, '%');
NUM('vox.groesse', 'Größe', 0, 1, 0.5, '%');
NUM('vox.vibrato', 'Vibrato', 0, 1, 0.4, '%');
const SPU_PEAK = 0.79;
NUM('spu.glanz', 'Glanz', 0, 1, 0.45, '%');
NUM('spu.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('spu.uhrwerk', 'Uhrwerk', 0, 1, 0.3, '%');
NUM('spu.kasten', 'Kasten', 0, 1, 0.5, '%');
const KTO_PEAK = 1.1;
NUM('kto.nagel', 'Nagel', 0, 1, 0.6, '%');
NUM('kto.seide', 'Seide', 0, 1, 0.5, '%');
NUM('kto.nachklang', 'Nachklang', 0, 1, 0.5, '%');
NUM('kto.druck', 'Druck (Oshide)', 0, 1, 0.6, '%');
// Glut (worklet myzel-ember, natively without one: a tuned feedback loop; Höhe is its gain – the growth per second)
SEL('glt.sprung', 'Sprung', [['2', 'Oktave'], ['3', 'Duodezime']], '3', { chips: 1 });
NUM('glt.gluehen', 'Glühen (Wachstum)', 0, 1, 0.5, '%');
NUM('glt.nachgluehen', 'Nachglühen', 0.2, 6, 1.5, 's', { curve: 'exp' });
NUM('glt.zunder', 'Zunder (Klopfen)', 0, 1, 0.4, '%');
NUM('glt.hitze', 'Hitze (Sättigung)', 0, 1, 0.5, '%');
NUM('glt.kasten', 'Kasten (offen)', 0, 1, 0.5, '%');
// Effekte
SEL('drv.type', 'Art', [['tube', 'Röhre'], ['fold', 'Falter'], ['crush', 'Bitbrecher']], 'tube', { chips: 1 });
NUM('drv.amt', 'Stärke', 0, 1, 0.12, '%');
NUM('drv.mix', 'Anteil', 0, 1, 0.35, '%');
NUM('rng.freq', 'Frequenz', 0.5, 3000, 220, 'Hz', { curve: 'exp' });
NUM('rng.mix', 'Anteil', 0, 1, 0, '%');
SEL('flt.type', 'Typ', [['lowpass', 'Tiefpass'], ['bandpass', 'Bandpass'], ['highpass', 'Hochpass'], ['notch', 'Kerbe']], 'lowpass', { chips: 1 });
NUM('flt.freq', 'Frequenz', 40, 18000, 9000, 'Hz', { curve: 'exp' });
NUM('flt.q', 'Resonanz', 0.3, 18, 0.9, '', { curve: 'exp', fmt: (v) => (P['flt.type'] === 'lowpass' || P['flt.type'] === 'highpass' ? dec(v.toFixed(1)) + ' dB' : 'Q ' + dec(v.toFixed(1))) });
NUM('flt.lfoRate', 'Wellen-Tempo', 0.01, 12, 0.08, 'Hz', { curve: 'exp' });
NUM('flt.lfoDepth', 'Wellen-Tiefe', 0, 4, 0.6, 'oct');
NUM('pha.mix', 'Anteil', 0, 1, 0.25, '%');
NUM('pha.rate', 'Tempo', 0.01, 6, 0.15, 'Hz', { curve: 'exp' });
NUM('pha.depth', 'Tiefe', 0, 1, 0.6, '%');
NUM('pha.fb', 'Schärfe', 0, 0.85, 0.4, '%');
NUM('cho.mix', 'Anteil', 0, 1, 0.3, '%');
NUM('cho.rate', 'Tempo', 0.03, 6, 0.4, 'Hz', { curve: 'exp' });
NUM('cho.depth', 'Tiefe', 0, 1, 0.5, '%');
BOOL('dly.sync', 'Im Tempo des Pulses', true);
SEL('dly.div', 'Notenwert', [['0.25', '1/16'], ['0.3333', '1/8 T'], ['0.5', '1/8'], ['0.75', '1/8 ·'], ['1', '1/4'], ['1.5', '1/4 ·'], ['2', '1/2'], ['4', '1 Takt']], '0.75', { chips: 1, small: 1 });
NUM('dly.ms', 'Zeit (frei)', 10, 3500, 450, 'ms', { curve: 'exp' });
NUM('dly.fb', 'Rückkopplung', 0, 1.05, 0.4, '%');
NUM('dly.pp', 'Ping-Pong', 0, 1, 0.7, '%');
NUM('dly.tone', 'Bandfarbe', 300, 18000, 3800, 'Hz', { curve: 'exp' });
NUM('dly.wow', 'Leiern', 0, 1, 0.2, '%');
NUM('dly.mix', 'Anteil', 0, 1, 0.35, '%');
NUM('rev.size', 'Nachhallzeit', 0.3, 14, 5, 's', { curve: 'exp' });
NUM('rev.damp', 'Dämpfung', 0, 1, 0.5, '%');
NUM('rev.pre', 'Vorverzögerung', 0, 0.25, 0.03, 's');
NUM('rev.mix', 'Anteil', 0, 1, 0.45, '%');
NUM('mov.vib', 'Vibrato', 0, 60, 4, 'ct');
NUM('mov.vibRate', 'Vibrato-Tempo', 0.1, 9, 4.5, 'Hz', { curve: 'exp' });
NUM('mov.drift', 'Taumeln', 0, 80, 6, 'ct');
NUM('mov.driftRate', 'Taumel-Tempo', 0.02, 4, 0.2, 'Hz', { curve: 'exp' });
NUM('mov.pan', 'Kreisen', 0, 1, 0.25, '%');
NUM('mov.panRate', 'Kreis-Tempo', 0.01, 4, 0.07, 'Hz', { curve: 'exp' });
NUM('mst.low', 'Tiefen (120 Hz)', -12, 12, 0, 'dB');
NUM('mst.high', 'Höhen (6,5 kHz)', -12, 12, 0, 'dB');
NUM('mst.comp', 'Verdichtung', 0, 1, 0.35, '%');
NUM('mst.vol', 'Pegel', -24, 6, 2, 'dB');
NUM('mst.wid', 'Breite', 0, 2, 1, '%', { step: 0.01, fmt: (v) => (v < 0.005 ? 'Mono' : Math.round(v * 100) + ' %') });
// Puls
NUM('seq.bpm', 'Tempo', 30, 200, 84, 'bpm', { step: 1, fmt: (v) => (TG.hxOn ? dec(TG.hx.toFixed(1)) : Math.round(v)) + ' BPM' });   // Hexenring: a Schleife's exact tempo
NUM('seq.swing', 'Swing', 0, 0.6, 0.1, '%');
const DIV_OPTS = [['1', '1/4'], ['0.5', '1/8'], ['0.3333', '1/8 T'], ['0.25', '1/16'], ['0.1667', '1/16 T'], ['0.125', '1/32']];
const LANE_DEF = [
  { on: true, eng: 'mem', steps: 16, puls: 5, rot: 0, div: '0.25', deg: 0, oct: -1, walk: 0, prob: 1, vol: 0.8, bright: 0.35, pan: 0 },
  { on: true, eng: 'hau', steps: 12, puls: 7, rot: 2, div: '0.25', deg: 4, oct: 1, walk: 0.2, prob: 0.75, vol: 0.35, bright: 0.7, pan: 0.45 },
  { on: false, eng: 'glo', steps: 7, puls: 3, rot: 0, div: '0.5', deg: 2, oct: 0, walk: 0.5, prob: 0.85, vol: 0.5, bright: 0.5, pan: -0.4 },
  { on: false, eng: 'sch', steps: 9, puls: 2, rot: 1, div: '1', deg: 0, oct: 0, walk: 0.3, prob: 0.7, vol: 0.5, bright: 0.4, pan: 0.1 },
];
LANE_DEF.forEach((d, i) => {
  const p = 'l' + i + '.';
  BOOL(p + 'on', 'Spur aktiv', d.on);
  SEL(p + 'eng', 'Klang', ENG_OPTS, d.eng, { lib: 1 });
  NUM(p + 'steps', 'Schritte', 1, 32, d.steps, '', { step: 1, fmt: (v) => String(v) });
  NUM(p + 'puls', 'Impulse', 0, 32, d.puls, '', { step: 1, fmt: (v) => String(v) });
  NUM(p + 'rot', 'Versatz', 0, 31, d.rot, '', { step: 1, fmt: (v) => String(v) });
  SEL(p + 'div', 'Raster', DIV_OPTS, d.div, { chips: 1, small: 1 });
  NUM(p + 'deg', 'Tonstufe', 0, 24, d.deg, '', { step: 1, fmt: (v) => 'Stufe ' + (v + 1) });
  NUM(p + 'oct', 'Oktave', -2, 2, d.oct, '', { step: 1, fmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) });
  NUM(p + 'walk', 'Wandern', 0, 1, d.walk, '%');
  NUM(p + 'prob', 'Chance', 0, 1, d.prob, '%');
  NUM(p + 'vol', 'Lautstärke', 0, 1, d.vol, '%');
  NUM(p + 'bright', 'Helligkeit', 0, 1, d.bright, '%');
  NUM(p + 'pan', 'Panorama', -1, 1, d.pan, '', { fmt: pctSigned });
});
// Mischpult: a channel strip for every sound layer (x<strip>.*), returns for echo and hall, the Puls group, "Pumpen"
const STRIPS = [
  { k: 'fin', name: 'Klang', info: 'Spielfläche und Keyboard' },
  { k: 'eb2', name: 'Ebene 2', info: 'Zweiter Klang auf jedem Finger' },
  { k: 'rgn', name: 'Regen', info: 'Sporenregen (Gestik)' },
  { k: 'hxr', name: 'Hexenring', info: 'Schleifen' },   // Hexenring: its loops (no tap hears it)
  ...LANE_DEF.map((_, i) => ({ k: 'l' + i, name: 'Spur ' + (i + 1), info: 'Puls', lane: i })),
  { k: 'bor', name: 'Bordun', info: 'Liegender Grundton' },
  { k: 'gsp', name: 'Gespinst', info: 'Netz der Saiten' },
  { k: 'dly', name: 'Echo', info: 'Rückweg', ret: true },
  { k: 'rev', name: 'Hall', info: 'Rückweg', ret: true },
];
const FADER_OFF = -59.95;
const fmtFader = (v) => (v <= FADER_OFF ? '−∞ dB' : (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + dec(Math.abs(v).toFixed(1)) + ' dB');
const fmtHzOff = (off) => (v) => (off(v) ? 'aus' : v >= 1000 ? dec((v / 1000).toFixed(v >= 10000 ? 1 : 2)) + ' kHz' : Math.round(v) + ' Hz');
const fmtWidth = (v) => (v < 0.005 ? 'Mono' : Math.round(v * 100) + ' %');
const LC_OFF = (v) => v <= 20.5, HC_OFF = (v) => v >= 19800;
for (const st of STRIPS) {
  const p = 'x' + st.k + '.';
  NUM(p + 'vol', 'Pegel', -60, 6, 0, 'dB', { step: 0.1, fmt: fmtFader });
  NUM(p + 'pan', 'Balance', -1, 1, 0, '', { step: 0.01, fmt: pctSigned });
  BOOL(p + 'mute', 'Stumm', false);
  BOOL(p + 'solo', 'Solo', false, { live: 1 });
  if (!st.ret) {
    SEL(p + 'route', 'Weg', [['fx', 'Durch die Effektkette'], ['dir', 'Direkt in die Summe']], 'fx', { chips: 1, small: 1 });
    NUM(p + 'dly', 'Echo', 0, 2, 1, '%', { step: 0.01 });
  }
  if (st.k !== 'rev') NUM(p + 'rev', 'Hall', 0, 2, 1, '%', { step: 0.01 });
  NUM(p + 'lc', 'Tiefenschnitt', 20, 1000, 20, 'Hz', { curve: 'exp', fmt: fmtHzOff(LC_OFF) });
  NUM(p + 'hc', 'Höhenschnitt', 1000, 20000, 20000, 'Hz', { curve: 'exp', fmt: fmtHzOff(HC_OFF) });
  NUM(p + 'lo', 'Tiefen', -15, 15, 0, 'dB', { step: 0.1 });
  NUM(p + 'mid', 'Mitten', -15, 15, 0, 'dB', { step: 0.1 });
  NUM(p + 'midf', 'Mittenfrequenz', 150, 8000, 1000, 'Hz', { curve: 'exp' });
  NUM(p + 'hi', 'Höhen', -15, 15, 0, 'dB', { step: 0.1 });
  NUM(p + 'sat', 'Sättigung', 0, 1, 0, '%', { step: 0.01 });
  NUM(p + 'wid', 'Breite', 0, 2, 1, '%', { step: 0.01, fmt: fmtWidth });
  NUM(p + 'duck', 'Pumpen', 0, 1, 0, '%', { step: 0.01 });
}
for (const id in PD) if (id.startsWith('xhxr.') && !PD[id].live) PD[id].rec = 1;   // Hexenring: the loops' strip is not the patch's
PD['xhxr.route'].d = 'dir';
// Hexenring (SPEC §20): device-side settings, kept out of patches
NUM('hx.humus', 'Humus-Länge', 16, 300, 64, 's', { step: 1, rec: 1 });
SEL('hx.modus', 'Hauptknopf', [['neu', 'Neue Schleife'], ['dieselbe', 'Dieselbe Schleife']], 'neu', { chips: 1, small: 1, rec: 1 });
SEL('hx.start', 'Aufnahme beginnt', [['takt', 'Am Takt'], ['ton', 'Beim ersten Ton'], ['sofort', 'Sofort']], 'takt', { chips: 1, small: 1, rec: 1 });
SEL('hx.raster', 'Raster', [['frei', 'Frei'], ['takt', 'Takt'], ['halb', '½ Takt'], ['viertel', '¼']], 'frei', { chips: 1, small: 1, rec: 1 });   // (25.10.2026: where a recording by hand begins and ends – grammar.js HX_RASTER)
SEL('hx.laenge', 'Länge', [['auto', 'Automatisch'], ['wie1', 'Wie Schleife 1'], ['fest', 'Fest']], 'auto', { chips: 1, small: 1, rec: 1 });
NUM('hx.festT', 'Feste Länge', 1, 16, 4, '', { step: 1, rec: 1, fmt: (v) => v + (v === 1 ? ' Takt' : ' Takte') });
NUM('hx.mem', 'Speichergrenze', 100, 4000, MOBILE ? (IOS && !/iPhone|iPod/.test(navigator.userAgent) ? 600 : 300) : 1500, 'MB', { step: 50, rec: 1, fmt: (v) => v + ' MB' });
BOOL('hx.autoclose', 'Schließt sich, wenn du den Anfang wiederholst', false, { rec: 1 });
SEL('hx.rail', 'Ringleiste', [['offen', 'Offen'], ['klein', 'Klein']], 'offen', { chips: 1, small: 1, rec: 1 });
SEL('hx.ein', 'Einzählen', [['aus', 'Aus'], ['sicht', 'Sichtbar'], ['vib', 'Vibration'], ['ton', 'Hörbar']], 'sicht', { chips: 1, small: 1, rec: 1 });
SEL('hx.klick', 'Klick', [['aus', 'Aus'], ['zaehl', 'Beim Einzählen'], ['ein', 'Auf den Zählzeiten']], 'aus', { chips: 1, small: 1, rec: 1 });
BOOL('hx.pulsMit', 'Puls mit (Gespielt hört die Spuren)', false, { rec: 1 });
BOOL('hx.borMit', 'Bordun mit (Gespielt hört den Bordun)', false, { rec: 1 });
// (step 1d) the form, „eine Runde“, Hinlegen
SEL('hx.regel', 'Lichtung wechselt', [['takt', 'Am Takt'], ['ende', 'Am Schleifenende']], 'takt', { chips: 1, small: 1, rec: 1 });
BOOL('hx.lichMix', 'Lichtung merkt den Mixer', false, { rec: 1 });
BOOL('hx.lichPuls', 'Lichtung merkt den Puls', false, { rec: 1 });
SEL('hx.lueckeT', 'Lücke', [['schlag', 'Ein Schlag'], ['takt', 'Ein Takt']], 'schlag', { chips: 1, small: 1, rec: 1 });
SEL('hx.schluss', 'Schluss', [['ende', 'Am Ende'], ['welkend', 'Welkend'], ['abbauend', 'Abbauend']], 'ende', { chips: 1, small: 1, rec: 1 });
NUM('hx.welk', 'Welkt über', 4, 16, 8, '', { step: 1, rec: 1, fmt: (v) => v + ' Takte' });
BOOL('hx.runde', 'Überspielen: eine Runde', false, { rec: 1 });
// (step 2a) Wuchs: how a new Schleife begins (exactly as played, or grown anew); the level loops are rendered at (owner: manual,
// the best by default; „wie gespielt“ = the level the loop was played at); the field's key and the loops' on the same bar line
SEL('hx.beginn', 'Neue Schleife', [['abdruck', 'Wie gespielt'], ['wuchs', 'Als Wuchs']], 'abdruck', { chips: 1, small: 1, rec: 1 });
SEL('hx.stufe', 'Klangstufe der Schleifen', [['gespielt', 'Wie gespielt'], ['1', '1'], ['2', '2'], ['3', '3']], '3', { chips: 1, small: 1, rec: 1 });
BOOL('hx.tonartAmTakt', 'Tonart wechselt mit den Schleifen am Takt', true, { rec: 1 });
NUM('hx.traeg', 'Trägheit des Bands', 0.2, 2, 0.5, 's', { step: 0.05, rec: 1, fmt: (v) => dec(v.toFixed(2)) + ' s' });   // (step 2b: §14)
NUM('hx.stopp', 'Bandstopp', 0.3, 2, 0.9, 's', { step: 0.05, rec: 1, fmt: (v) => dec(v.toFixed(2)) + ' s' });
BOOL('hx.buehne', 'Bühnenansicht', false, { rec: 1 });
BOOL('hx.pulsStumm', 'Puls danach stumm', false, { rec: 1 });
// (Etappe 3) the Gärtner – „schaut zu“ by default, every behaviour can be switched off – and the Handschrift (off by default)
SEL('hx.gaertner', 'Gärtner', [['schaut', 'Schaut zu'], ['pflegt', 'Pflegt'], ['antwortet', 'Antwortet']], 'schaut', { chips: 1, small: 1, rec: 1 });
BOOL('hx.gPlatz', 'Platz machen', true, { rec: 1 });
BOOL('hx.gRollen', 'Die anderen spielen', true, { rec: 1 });
BOOL('hx.gAntw', 'Antworten', true, { rec: 1 });
BOOL('hx.gBegl', 'Begleiten vorschlagen', true, { rec: 1 });
BOOL('hx.gWk', 'Wiederkehr', true, { rec: 1 });
SEL('hx.gStimme', 'Antwort mit', [['feld', 'Spielfeld'], ['ebene', 'Ebene 2'], ['schleife', 'Melodie-Schleife']], 'feld', { chips: 1, small: 1, rec: 1 });
SEL('hx.hand', 'Handschrift', [['aus', 'Aus'], ['an', 'An']], 'aus', { chips: 1, small: 1, rec: 1 });
NUM('mix.pulsVol', 'Puls gesamt', -60, 6, 0, 'dB', { step: 0.1, fmt: fmtFader });
BOOL('mix.pulsMute', 'Puls stumm', false);
SEL('mix.duckSrc', 'Pumpen im Takt von', [['0', 'Spur 1'], ['1', 'Spur 2'], ['2', 'Spur 3'], ['3', 'Spur 4']], '0', { chips: 1, small: 1 });
NUM('mix.duckRel', 'Pumpen: Rückkehr', 0.1, 1, 0.5, '', { step: 0.01, fmt: (v) => Math.round(v * 100) + ' % eines Schlags' });
// Bordun
BOOL('bor.on', 'Bordun spielen', false);
NUM('bor.lvl', 'Lautstärke', 0, 1, 0.4, '%');
SEL('bor.int', 'Zweiter Ton', [['1', 'Einklang'], ['1.5', 'Quinte 3:2'], ['1.3333', 'Quarte 4:3'], ['2', 'Oktave'], ['1.75', 'Naturseptime 7:4'], ['1.2', 'Kleine Terz 6:5']], '1.5', { chips: 1, small: 1 });
NUM('bor.oct', 'Oktave', 1, 4, 2, '', { step: 1, fmt: (v) => 'Oktave ' + v });
SEL('bor.wave', 'Wellenform', WAVE_OPTS, 'sawtooth', { chips: 1, small: 1 });
NUM('bor.cut', 'Tiefpass', 60, 4000, 500, 'Hz', { curve: 'exp' });
NUM('bor.breath', 'Atmen', 0, 1, 0.4, '%');
// Aufnahme (nicht Teil der Klang-Presets)
SEL('rec.fmt', 'Format', [['f32', '32-Bit-Float'], ['s24', '24 Bit'], ['s16', '16 Bit']], 'f32', { chips: 1, rec: 1 });
BOOL('rec.norm', 'Beim Speichern auf −1 dBFS normalisieren', false, { rec: 1 });
BOOL('rec.arm', 'Erst mit dem ersten Ton starten', false, { rec: 1 });
BOOL('rec.comp', 'Zusätzlich eine kleine Datei zum Teilen (MP4/WebM)', false, { rec: 1 });
BOOL('rec.tail', 'Nachklang nach dem Stoppen mit aufnehmen', true, { rec: 1 });
SEL('rec.len', 'Länge', [['free', 'Frei'], ['bars', 'In Takten']], 'free', { chips: 1, rec: 1 });
NUM('rec.bars', 'Takte', 1, 64, 8, '', { step: 1, rec: 1, fmt: (v) => v + (v === 1 ? ' Takt' : ' Takte') });
// Gerät: Rechenleistung, Latenz, MIDI-Keyboard (gelten für dieses Gerät, nicht Teil der Klang-Presets)
SEL('dev.q', 'Qualitätsstufe', [['1', '1 · Leicht'], ['2', '2 · Voll'], ['3', '3 · Gewaltig']], MOBILE ? '1' : '2', { chips: 1, dev: 1 });
// (24.10.2026: Android starts in „Minimal“ – Chrome there opens its fast output only for the numeric hint; lasting
// underruns step back by themselves, latStep. iPhone and iPad „Standard“, computers „Minimal“ as before)
SEL('dev.lat', 'Latenz', [['min', 'Minimal'], ['std', 'Standard'], ['safe', 'Sicher']], MOBILE && !ANDROID ? 'std' : 'min', { chips: 1, dev: 1 });
SEL('midi.map', 'Tasten', [['scale', 'Skala'], ['white', 'Weiße Tasten'], ['chrom', 'Chromatisch']], 'scale', { chips: 1, dev: 1 });
NUM('midi.y', 'Höhe auf der Spielfläche', 0, 1, 0.55, '%', { dev: 1 });
BOOL('midi.vel', 'Anschlagdynamik', true, { dev: 1 });
NUM('midi.bend', 'Tonhöhenrad', 0, 12, 2, 'HT', { step: 1, dev: 1, fmt: (v) => (v ? '±' + v + ' HT' : 'aus') });
SEL('midi.curve', 'Anschlag', [['soft', 'Weich'], ['lin', 'Linear'], ['mid', 'Mittel'], ['hard', 'Hart'], ['fix', 'Fest']], 'mid', { chips: 1, dev: 1 });
NUM('midi.fix', 'Fester Anschlag', 1, 127, 100, '', { step: 1, dev: 1, fmt: (v) => String(v) });
SEL('midi.mpe', 'MPE', [['off', 'Aus'], ['auto', 'Auto'], ['on', 'Ein']], 'auto', { chips: 1, dev: 1 });
BOOL('midi.pc', 'Programmwechsel lädt Presets', true, { dev: 1 });
BOOL('midi.transport', 'Start/Stop vom Gerät', true, { dev: 1 });
SEL('midi.clock', 'Tempo vom Gerät (MIDI-Clock)', [['off', 'Aus'], ['follow', 'Folgen']], 'follow', { chips: 1, dev: 1 });
SEL('midi.ble', 'Bluetooth-Timing', [['direct', 'Direkt'], ['even', 'Gleichmäßig']], 'direct', { chips: 1, dev: 1 });
BOOL('midi.pads', 'Pads als Auslöser', false, { dev: 1 });
BOOL('midi.std', 'Standard-Zuordnungen', true, { dev: 1 });
SEL('midi.tch', 'Touché-Spielweise', [['finger', 'Finger'], ['atem', 'Atem'], ['raum', 'Raum'], ['verw', 'Verwandlung'], ['gleiten', 'Gleiten'], ['streichen', 'Streichen'], ['platte', 'Platte'], ['vokal', 'Vokal'], ['koerner', 'Körner'], ['eis', 'Eis'], ['oberton', 'Obertöne'], ['faecher', 'Fächer'], ['ort', 'Ort'], ['stottern', 'Stottern'], ['resonanz', 'Resonanz'], ['arp', 'Arpeggio']], 'finger', { chips: 1, dev: 1 });   // (Expressive E Touché, js/midi/touche.js)

const GROUP = {
  v: 'Spielweise', t: 'Stimmung', neb: 'Nebel', kor: 'Körner', hau: 'Hauch', glo: 'Glocke', mem: 'Membran', sai: 'Saite', sch: 'Schale', gng: "Gong", klb: "Kalimba", obt: "Obertöne", stm: "Stimme", swm: "Schwarm", tie: "Tiefe", trp: "Tropfen", nrd: 'Nordlicht', sht: 'Schimmer', ond: 'Ätherwelle', wal: 'Walgesang', stp: 'Endlostreppe', atr: 'Attraktor', tnl: 'Tunnel', wkg: 'Westküste', bnt: 'Schaltkreis', kas: 'Kassette', bit: 'Achtbit', gbs: 'Gleitbass', hht: 'Zischel', vox: 'Silbe', spu: 'Spieluhr', kto: 'Koto', hlm: 'Halm', rnk: 'Ranke', elm: 'Elmsfeuer', hng: 'Handpan', gml: 'Gamelan', sit: 'Sitar', tbl: 'Tabla', did: 'Didgeridoo', mtr: 'Maultrommel', jrg: 'Jahresring', hrz: 'Harz', shn: 'Sehne', zpf: 'Zapfen', glt: 'Glut', mdr: 'Moder', boe: 'Böe', amo: 'Amöbe', gsp: 'Gespinst', rhz: 'Rhizom', khl: 'Kehlchen',
  drv: 'Verzerrung', rng: 'Ringmodulator', flt: 'Filter', pha: 'Phaser', cho: 'Schweben', dly: 'Echo', rev: 'Hall', mov: 'Bewegung', mst: 'Summe',
  seq: 'Puls', bor: 'Bordun', rec: 'Aufnahme', hx: 'Hexenring', dev: 'Gerät', midi: 'MIDI', l0: 'Spur 1', l1: 'Spur 2', l2: 'Spur 3', l3: 'Spur 4',
};
// the mixer's parts as the panel names them ("Kanal" is the MIDI channel's word here)
for (const st of STRIPS) GROUP['x' + st.k] = 'Mixer · ' + st.name;
GROUP.mix = 'Mixer'; GROUP.mst = 'Mixer · Summe';
const groupOf = (id) => GROUP[id.slice(0, id.indexOf('.'))] || '';
const PATCH_IDS = Object.keys(PD).filter((id) => !PD[id].rec && !PD[id].dev && !PD[id].live);
const P = {};
for (const id in PD) P[id] = PD[id].d;

function sanitize(d, v) {
  if (d.kind === 'num') {
    v = Number(v);
    if (!Number.isFinite(v)) return d.d;
    v = clamp(v, d.min, d.max);
    if (d.step) v = Math.round(v / d.step) * d.step;
    return +v.toFixed(6);
  }
  if (d.kind === 'sel') { v = String(v); return d.opts.some((o) => o[0] === v) ? v : d.d; }
  return !!v;
}
const DIV_EXACT = { '0.3333': 1 / 3, '0.1667': 1 / 6 };
const divBeats = (v) => DIV_EXACT[v] || Number(v);
function toNorm(d, v) {
  if (d.curve === 'exp') return Math.log(v / d.min) / Math.log(d.max / d.min);
  if (d.curve === 'sq') return Math.sqrt((v - d.min) / (d.max - d.min));
  return (v - d.min) / (d.max - d.min);
}
function fromNorm(d, n) {
  n = clamp(n, 0, 1);
  let v = d.curve === 'exp' ? d.min * Math.pow(d.max / d.min, n) : d.curve === 'sq' ? d.min + (d.max - d.min) * n * n : d.min + (d.max - d.min) * n;
  return sanitize(d, v);
}
function fmt(d, v) {
  if (d.kind === 'sel') { const o = d.opts.find((x) => x[0] === v); return o ? o[1] : String(v); }
  if (d.kind === 'bool') return v ? 'an' : 'aus';
  if (d.fmt) return d.fmt(v);
  switch (d.unit) {
    case 'Hz': return v >= 1000 ? dec((v / 1000).toFixed(v >= 10000 ? 1 : 2)) + ' kHz' : v >= 100 ? Math.round(v) + ' Hz' : v >= 10 ? dec(v.toFixed(1)) + ' Hz' : dec(v.toFixed(2)) + ' Hz';
    case 's': return v >= 1 ? dec(v.toFixed(v >= 10 ? 1 : 2)) + ' s' : Math.round(v * 1000) + ' ms';
    case 'ms': return v >= 1000 ? dec((v / 1000).toFixed(2)) + ' s' : Math.round(v) + ' ms';
    case '%': return Math.round(v * 100) + ' %';
    case 'dB': return (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + dec(Math.abs(v).toFixed(1)) + ' dB';
    case 'ct': return Math.round(v) + ' ct';
    case 'HT': return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)) + ' HT';
    case 'oct': return dec(v.toFixed(2)) + ' Okt';
    case '×': return dec(v.toFixed(2)) + '×';
    case '/s': return dec(v.toFixed(v < 10 ? 1 : 0)) + '/s';
    case 'bpm': return Math.round(v) + ' BPM';
    default: return dec(v.toFixed(2));
  }
}

