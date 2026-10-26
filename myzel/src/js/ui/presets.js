/* ---------- presets ---------- */
const PRESETS = [
  { key: 'tiefsee', name: 'Tiefsee', tags: 'Ambient · Drone', desc: 'Dunkle Flächen, ferne Schalen, ein langsamer Herzschlag.', v: {
    'v.eng': 'neb', 'v.layer': 'sch', 'v.layerLvl': 0.3, 'v.layerInt': 12, 't.root': '2', 't.scale': 'hira', 't.oct': 2, 't.range': 3,
    'neb.wave': 'sawtooth', 'neb.spread': 18, 'neb.sub': 0.5, 'neb.breath': 0.3, 'neb.cut': 480, 'neb.res': 4, 'neb.ymod': 3.5, 'neb.att': 1.2, 'neb.rel': 5,
    'sch.decay': 14, 'sch.beat': 1.1, 'flt.freq': 7000, 'flt.lfoRate': 0.04, 'flt.lfoDepth': 1.1, 'cho.mix': 0.45,
    'dly.div': '1.5', 'dly.fb': 0.55, 'dly.mix': 0.35, 'dly.tone': 2400, 'dly.wow': 0.35, 'rev.size': 11, 'rev.damp': 0.6, 'rev.mix': 0.6,
    'mov.drift': 14, 'mov.pan': 0.4, 'seq.bpm': 58, 'l0.on': true, 'l0.eng': 'mem', 'l0.steps': 16, 'l0.puls': 3, 'l0.oct': -1, 'l0.vol': 0.6, 'l0.bright': 0.2,
    'l1.on': false, 'l3.on': true, 'l3.eng': 'sch', 'l3.steps': 13, 'l3.puls': 2, 'l3.div': '1', 'l3.deg': 4, 'l3.vol': 0.45,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.35, 'bor.int': '1.5', 'bor.cut': 380 } },
  { key: 'tempel', name: 'Tempelglocken', tags: 'Perkussiv · Raum', desc: 'Unharmonische FM-Glocken, die im Ping-Pong-Echo wandern.', v: {
    'v.eng': 'glo', 't.root': '9', 't.scale': 'akebono', 't.oct': 3, 't.range': 3,
    'glo.ratio': 1.41, 'glo.index': 5, 'glo.decay': 6, 'glo.bright': 0.25, 'glo.beat': 1.8, 'glo.click': 0.25,
    'dly.div': '0.75', 'dly.fb': 0.5, 'dly.pp': 1, 'dly.mix': 0.4, 'rev.size': 8, 'rev.mix': 0.55, 'pha.mix': 0.2, 'seq.bpm': 72,
    'l0.on': false, 'l1.on': false, 'l2.on': true, 'l2.eng': 'glo', 'l2.steps': 7, 'l2.puls': 3, 'l2.div': '0.5', 'l2.walk': 0.6, 'l2.vol': 0.45,
    'l3.on': true, 'l3.eng': 'sch', 'l3.steps': 11, 'l3.puls': 2, 'l3.div': '1', 'l3.vol': 0.4 } },
  { key: 'pilzregen', name: 'Pilzregen', tags: 'Perkussiv · Polyrhythmus', desc: 'Vier Spuren aus Fellen, Tropfen und Saiten, gegeneinander verschoben.', v: {
    'v.eng': 'mem', 't.root': '4', 't.scale': 'pelog', 't.oct': 2, 't.range': 3,
    'mem.drop': 14, 'mem.dropT': 0.05, 'mem.decay': 0.6, 'mem.mode2': 0.4, 'mem.noise': 0.3, 'mem.tone': 5, 'hau.color': 2, 'hau.q': 4, 'hau.burst': 0.08,
    'drv.type': 'tube', 'drv.amt': 0.3, 'drv.mix': 0.6, 'pha.mix': 0.35, 'pha.rate': 0.2, 'dly.div': '0.75', 'dly.fb': 0.45, 'dly.mix': 0.3, 'rev.size': 4, 'rev.mix': 0.35,
    'seq.bpm': 96, 'seq.swing': 0.18,
    'l0.on': true, 'l0.eng': 'mem', 'l0.steps': 16, 'l0.puls': 5, 'l0.oct': -1, 'l0.vol': 0.85, 'l0.bright': 0.35,
    'l1.on': true, 'l1.eng': 'hau', 'l1.steps': 12, 'l1.puls': 7, 'l1.rot': 2, 'l1.oct': 1, 'l1.vol': 0.3, 'l1.bright': 0.8, 'l1.prob': 0.8,
    'l2.on': true, 'l2.eng': 'sai', 'l2.steps': 7, 'l2.puls': 3, 'l2.div': '0.5', 'l2.deg': 5, 'l2.walk': 0.5, 'l2.vol': 0.5,
    'l3.on': true, 'l3.eng': 'mem', 'l3.steps': 9, 'l3.puls': 4, 'l3.deg': 3, 'l3.oct': 0, 'l3.vol': 0.5, 'l3.bright': 0.6, 'l3.prob': 0.85 } },
  { key: 'kristall', name: 'Kristallhöhle', tags: 'Ambient · Saiten', desc: 'Gezupfte Saiten mit Glockenschimmer in einem hellen, langen Raum.', v: {
    'v.eng': 'sai', 'v.layer': 'glo', 'v.layerLvl': 0.25, 'v.layerInt': 12, 't.root': '7', 't.scale': 'lyd', 't.oct': 3, 't.range': 3,
    'sai.decay': 4, 'sai.bright': 0.7, 'sai.damp': 0.3, 'sai.pos': 0.12, 'glo.ratio': 3.5, 'glo.index': 2, 'glo.decay': 3,
    'pha.mix': 0.4, 'pha.rate': 0.08, 'pha.depth': 0.7, 'cho.mix': 0.4, 'dly.div': '0.75', 'dly.fb': 0.5, 'dly.mix': 0.4, 'dly.tone': 6000,
    'rev.size': 9, 'rev.damp': 0.3, 'rev.mix': 0.6, 'seq.bpm': 80,
    'l0.on': false, 'l1.on': false, 'l2.on': true, 'l2.eng': 'sai', 'l2.steps': 10, 'l2.puls': 4, 'l2.div': '0.25', 'l2.walk': 0.7, 'l2.deg': 7, 'l2.vol': 0.4, 'l3.on': false } },
  { key: 'sporen', name: 'Sporenwolke', tags: 'Granular · Psychedelisch', desc: 'Ein Chor zerfällt in Körner, gestimmt nach der Obertonreihe.', v: {
    'v.eng': 'kor', 't.root': '0', 't.scale': 'harm', 't.oct': 2, 't.range': 3,
    'kor.src': 'chor', 'kor.dens': 35, 'kor.size': 0.22, 'kor.scat': 0.4, 'kor.pjit': 12, 'kor.oct': 0.15, 'kor.rev': 0.3, 'kor.att': 0.8, 'kor.rel': 3,
    'cho.mix': 0.5, 'rev.size': 12, 'rev.mix': 0.65, 'dly.fb': 0.4, 'dly.mix': 0.25, 'mov.pan': 0.5, 'mov.drift': 10,
    'bor.on': true, 'bor.oct': 2, 'bor.int': '1.75', 'bor.lvl': 0.3, 'bor.wave': 'glass', 'seq.bpm': 66,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false } },
  { key: 'ritual', name: 'Klangschalen-Ritual', tags: 'Ambient · Rein gestimmt', desc: 'Schwebende Schalen über einem Quintbordun, rein gestimmt.', v: {
    'v.eng': 'sch', 't.root': '5', 't.scale': 'insen', 't.oct': 3, 't.range': 2, 't.just': true,
    'sch.decay': 16, 'sch.beat': 2.2, 'sch.bright': 0.6, 'sch.mallet': 0.3, 'rev.size': 10, 'rev.mix': 0.55, 'dly.mix': 0.2, 'dly.fb': 0.4, 'mov.drift': 4,
    'bor.on': true, 'bor.oct': 1, 'bor.int': '1.5', 'bor.lvl': 0.4, 'bor.wave': 'triangle', 'bor.cut': 600, 'seq.bpm': 48,
    'l0.on': true, 'l0.eng': 'mem', 'l0.steps': 8, 'l0.puls': 1, 'l0.oct': -1, 'l0.vol': 0.55, 'l0.bright': 0.15, 'l0.div': '1',
    'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'sch', 'l3.steps': 9, 'l3.puls': 2, 'l3.div': '1', 'l3.walk': 0.4, 'l3.vol': 0.5 } },
  { key: 'maschine', name: 'Maschinenträume', tags: 'Experimentell · Rhythmus', desc: 'Zerbrochene Rhythmen, Ringmodulation und leierndes Bandecho.', v: {
    'v.eng': 'mem', 'v.layer': 'glo', 'v.layerLvl': 0.35, 'v.layerInt': 19, 'v.roll': '16', 't.root': '1', 't.scale': 'phrdom', 't.oct': 2, 't.range': 3,
    'mem.drop': 24, 'mem.dropT': 0.03, 'mem.decay': 0.35, 'mem.noise': 0.45, 'mem.tone': 8, 'glo.ratio': 7.1, 'glo.index': 6, 'glo.decay': 0.8,
    'drv.type': 'crush', 'drv.amt': 0.65, 'drv.mix': 0.45, 'rng.freq': 180, 'rng.mix': 0.3,
    'flt.type': 'bandpass', 'flt.freq': 1400, 'flt.q': 1.2, 'flt.lfoRate': 0.3, 'flt.lfoDepth': 1.6,
    'dly.div': '0.25', 'dly.fb': 0.68, 'dly.wow': 0.6, 'dly.mix': 0.35, 'rev.size': 3, 'rev.mix': 0.3, 'seq.bpm': 128, 'seq.swing': 0.05,
    'l0.on': true, 'l0.eng': 'mem', 'l0.steps': 16, 'l0.puls': 7, 'l0.oct': -1, 'l0.vol': 0.8,
    'l1.on': true, 'l1.eng': 'hau', 'l1.steps': 16, 'l1.puls': 9, 'l1.div': '0.125', 'l1.vol': 0.3, 'l1.bright': 0.9,
    'l2.on': true, 'l2.eng': 'glo', 'l2.steps': 5, 'l2.puls': 3, 'l2.div': '0.25', 'l2.walk': 0.8, 'l2.vol': 0.4,
    'l3.on': true, 'l3.eng': 'mem', 'l3.steps': 11, 'l3.puls': 4, 'l3.deg': 4, 'l3.oct': 0, 'l3.vol': 0.5, 'l3.bright': 0.7 } },
  { key: 'sonnenwind', name: 'Sonnenwind', tags: 'Ambient · Wind', desc: 'Pfeifender Wind über einer warmen Fläche, die im Raum kreist.', v: {
    'v.eng': 'hau', 'v.layer': 'neb', 'v.layerLvl': 0.4, 'v.layerInt': -12, 't.root': '2', 't.scale': 'dor', 't.oct': 3, 't.range': 2,
    'hau.color': 0, 'hau.q': 28, 'hau.sweep': 1.5, 'hau.att': 0.6, 'hau.rel': 2.5, 'neb.wave': 'triangle', 'neb.cut': 900, 'neb.att': 1, 'neb.rel': 3,
    'flt.lfoRate': 0.06, 'flt.lfoDepth': 1, 'mov.pan': 0.7, 'mov.panRate': 0.05, 'cho.mix': 0.35, 'dly.div': '0.5', 'dly.fb': 0.5, 'dly.mix': 0.3, 'rev.size': 7, 'rev.mix': 0.55,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'hau', 'l1.steps': 12, 'l1.puls': 5, 'l1.vol': 0.25, 'l2.on': false, 'l3.on': false, 'seq.bpm': 70 } },
  { key: 'obertonhoehle', name: 'Obertonhöhle', tags: 'Drone · Obertöne', desc: 'Ein brummender Grundton, aus dem einzelne Obertöne pfeifen; tief darunter pocht der Subbass.', v: {
    'v.eng': 'obt', 't.root': '2', 't.scale': 'dpent', 't.oct': 2, 't.range': 2,
    'obt.top': 16, 'obt.focus': 0.75, 'obt.body': 0.6, 'obt.wander': 0.55, 'obt.att': 0.6, 'obt.rel': 4,
    'flt.freq': 12000, 'cho.mix': 0.2, 'dly.div': '1.5', 'dly.fb': 0.45, 'dly.mix': 0.25, 'dly.tone': 3000, 'rev.size': 10, 'rev.damp': 0.4, 'rev.mix': 0.6,
    'mov.drift': 5, 'mov.vib': 2, 'mst.comp': 0.4, 'seq.bpm': 54,
    'l0.on': true, 'l0.eng': 'tie', 'l0.steps': 16, 'l0.puls': 2, 'l0.div': '0.25', 'l0.oct': -1, 'l0.vol': 0.7, 'l0.bright': 0.25,
    'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'gng', 'l3.steps': 13, 'l3.puls': 1, 'l3.div': '1', 'l3.deg': 0, 'l3.vol': 0.35, 'l3.bright': 0.3,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.3, 'bor.int': '2', 'bor.cut': 260, 'bor.breath': 0.3 } },
  { key: 'geisterchor', name: 'Geisterchor', tags: 'Ambient · Stimmen', desc: 'Ein schwebender Chor, der mit der Fingerhöhe die Vokale wechselt – über fernen Schalen.', v: {
    'v.eng': 'stm', 'v.layer': 'sch', 'v.layerLvl': 0.18, 'v.layerInt': 12, 't.root': '9', 't.scale': 'dor', 't.oct': 3, 't.range': 2,
    'stm.choir': 20, 'stm.vib': 16, 'stm.breath': 0.35, 'stm.shift': 0, 'stm.att': 1.4, 'stm.rel': 5,
    'sch.decay': 16, 'sch.bright': 0.4, 'cho.mix': 0.4, 'cho.depth': 0.6, 'dly.div': '2', 'dly.fb': 0.45, 'dly.mix': 0.25, 'dly.tone': 2600,
    'rev.size': 12, 'rev.damp': 0.55, 'rev.mix': 0.65, 'mov.drift': 8, 'mov.pan': 0.3, 'seq.bpm': 60,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'sch', 'l3.steps': 11, 'l3.puls': 2, 'l3.div': '1', 'l3.deg': 7, 'l3.vol': 0.35 } },
  { key: 'regenwald', name: 'Regenwald', tags: 'Perkussiv · Natur', desc: 'Tropfen, Kalimbas und körnige Vogelstimmen in verschobenen Kreisen; ein Schwarm summt darüber.', v: {
    'v.eng': 'trp', 't.root': '7', 't.scale': 'mpent', 't.oct': 3, 't.range': 3,
    'trp.chirp': 1.2, 'trp.decay': 0.6, 'trp.rain': 0.4, 'kor.src': 'voegel', 'kor.dens': 14, 'kor.size': 0.18, 'kor.scat': 0.5, 'kor.att': 0.05, 'kor.rel': 1.2,
    'klb.decay': 1.8, 'klb.buzz': 0.1, 'swm.chaos': 0.35, 'swm.chirp': 0.6,
    'dly.div': '0.75', 'dly.fb': 0.4, 'dly.mix': 0.3, 'rev.size': 3.5, 'rev.mix': 0.4, 'mov.pan': 0.35, 'seq.bpm': 96, 'seq.swing': 0.15,
    'l0.on': true, 'l0.eng': 'trp', 'l0.steps': 16, 'l0.puls': 7, 'l0.div': '0.25', 'l0.deg': 5, 'l0.oct': 0, 'l0.walk': 0.6, 'l0.prob': 0.7, 'l0.vol': 0.55, 'l0.bright': 0.6, 'l0.pan': -0.3,
    'l1.on': true, 'l1.eng': 'klb', 'l1.steps': 12, 'l1.puls': 5, 'l1.div': '0.25', 'l1.deg': 2, 'l1.walk': 0.4, 'l1.prob': 0.85, 'l1.vol': 0.5, 'l1.bright': 0.5, 'l1.pan': 0.35,
    'l2.on': true, 'l2.eng': 'kor', 'l2.steps': 9, 'l2.puls': 2, 'l2.div': '0.5', 'l2.deg': 8, 'l2.oct': 1, 'l2.vol': 0.35, 'l2.bright': 0.75, 'l2.pan': 0.6,
    'l3.on': true, 'l3.eng': 'swm', 'l3.steps': 7, 'l3.puls': 1, 'l3.div': '1', 'l3.deg': 0, 'l3.vol': 0.25, 'l3.bright': 0.4 } },
  { key: 'kalimbatraum', name: 'Kalimbatraum', tags: 'Perkussiv · Polyrhythmus', desc: 'Zwei Kalimbas im Fünf-gegen-Sieben über einem weichen Subbass, Tropfen fallen dazwischen.', v: {
    'v.eng': 'klb', 't.root': '4', 't.scale': 'akebono', 't.oct': 3, 't.range': 3,
    'klb.decay': 2.6, 'klb.over': 0.55, 'klb.thumb': 0.4, 'klb.body': 0.6, 'klb.buzz': 0.2, 'tie.drive': 0.35, 'tie.rel': 0.4,
    'dly.div': '0.75', 'dly.fb': 0.45, 'dly.pp': 0.9, 'dly.mix': 0.35, 'rev.size': 4, 'rev.mix': 0.35, 'seq.bpm': 104,
    'l0.on': true, 'l0.eng': 'klb', 'l0.steps': 8, 'l0.puls': 5, 'l0.div': '0.25', 'l0.deg': 0, 'l0.walk': 0.5, 'l0.vol': 0.6, 'l0.bright': 0.5, 'l0.pan': -0.4,
    'l1.on': true, 'l1.eng': 'klb', 'l1.steps': 12, 'l1.puls': 7, 'l1.div': '0.25', 'l1.deg': 4, 'l1.oct': 1, 'l1.walk': 0.3, 'l1.prob': 0.9, 'l1.vol': 0.45, 'l1.bright': 0.6, 'l1.pan': 0.45,
    'l2.on': true, 'l2.eng': 'tie', 'l2.steps': 16, 'l2.puls': 3, 'l2.div': '0.25', 'l2.deg': 0, 'l2.oct': -1, 'l2.vol': 0.7, 'l2.bright': 0.3,
    'l3.on': true, 'l3.eng': 'trp', 'l3.steps': 11, 'l3.puls': 2, 'l3.div': '0.25', 'l3.deg': 9, 'l3.walk': 0.6, 'l3.vol': 0.3, 'l3.bright': 0.5, 'l3.pan': 0.2 } },
  { key: 'kurzwelle', name: 'Kurzwellenritual', tags: 'Experimentell · Funk', desc: 'Gekörntes Rauschen fremder Sender über einem Subbass; Insekten, Trommeln und ein leierndes Echo.', v: {
    'v.eng': 'kor', 'v.layer': 'tie', 'v.layerLvl': 0.45, 'v.layerInt': -12, 't.root': '4', 't.scale': 'phrdom', 't.oct': 3, 't.range': 2,
    'kor.src': 'funk', 'kor.dens': 30, 'kor.size': 0.18, 'kor.scat': 0.6, 'kor.pjit': 20, 'kor.oct': 0.2, 'kor.rev': 0.3, 'kor.att': 0.3, 'kor.rel': 2,
    'tie.drive': 0.6, 'swm.chaos': 0.7, 'drv.amt': 0.35, 'drv.mix': 0.4, 'rng.freq': 87, 'rng.mix': 0.2, 'pha.mix': 0.5, 'pha.rate': 0.09,
    'dly.div': '0.75', 'dly.fb': 0.6, 'dly.wow': 0.6, 'dly.mix': 0.4, 'rev.size': 6, 'rev.mix': 0.45, 'seq.bpm': 78,
    'l0.on': true, 'l0.eng': 'mem', 'l0.steps': 16, 'l0.puls': 5, 'l0.oct': -1, 'l0.vol': 0.7, 'l0.bright': 0.3,
    'l1.on': true, 'l1.eng': 'swm', 'l1.steps': 10, 'l1.puls': 3, 'l1.div': '0.5', 'l1.deg': 3, 'l1.vol': 0.35, 'l1.bright': 0.7, 'l1.pan': 0.5,
    'l2.on': true, 'l2.eng': 'tie', 'l2.steps': 8, 'l2.puls': 1, 'l2.div': '0.5', 'l2.oct': -1, 'l2.vol': 0.6, 'l2.bright': 0.5,
    'l3.on': false } },
  { key: 'zikadennacht', name: 'Zikadennacht', tags: 'Ambient · Nacht', desc: 'Ein Zikadenchor aus Körnern über tiefem Bordun, ab und zu fällt ein Tropfen.', v: {
    'v.eng': 'kor', 'v.layer': 'hau', 'v.layerLvl': 0.25, 'v.layerInt': 12, 't.root': '1', 't.scale': 'insen', 't.oct': 3, 't.range': 2,
    'kor.src': 'zikaden', 'kor.dens': 40, 'kor.size': 0.09, 'kor.scat': 0.5, 'kor.pjit': 10, 'kor.att': 1.2, 'kor.rel': 3,
    'hau.q': 24, 'hau.att': 1, 'hau.rel': 3, 'cho.mix': 0.3, 'dly.div': '1', 'dly.fb': 0.4, 'dly.mix': 0.25, 'rev.size': 9, 'rev.mix': 0.55,
    'mov.pan': 0.5, 'mov.panRate': 0.04, 'seq.bpm': 66,
    'l0.on': true, 'l0.eng': 'tie', 'l0.steps': 16, 'l0.puls': 4, 'l0.div': '0.25', 'l0.oct': -1, 'l0.vol': 0.45, 'l0.bright': 0.3,
    'l1.on': true, 'l1.eng': 'trp', 'l1.steps': 12, 'l1.puls': 3, 'l1.div': '0.5', 'l1.deg': 6, 'l1.walk': 0.5, 'l1.prob': 0.6, 'l1.vol': 0.3, 'l1.bright': 0.6,
    'l2.on': false, 'l3.on': false,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.3, 'bor.int': '1.5', 'bor.cut': 300, 'bor.wave': 'triangle' } },
  { key: 'gongbad', name: 'Gongbad', tags: 'Meditation · Gong', desc: 'Große Gongs, deren Obertöne nach dem Schlag aufblühen, über einem singenden Oberton-Bordun.', v: {
    'v.eng': 'gng', 'v.layer': 'obt', 'v.layerLvl': 0.3, 'v.layerInt': 12, 't.root': '2', 't.scale': 'hira', 't.oct': 2, 't.range': 3,
    'gng.decay': 18, 'gng.bloom': 1.4, 'gng.bright': 0.6, 'gng.glide': -60, 'gng.beat': 0.6, 'gng.shimmer': 0.5,
    'obt.focus': 0.7, 'obt.body': 0.3, 'obt.wander': 0.6, 'obt.att': 2, 'obt.rel': 6,
    'flt.freq': 9000, 'flt.lfoRate': 0.03, 'flt.lfoDepth': 0.8, 'dly.mix': 0.15, 'rev.size': 14, 'rev.damp': 0.5, 'rev.mix': 0.6, 'mov.drift': 6, 'seq.bpm': 50,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'gng', 'l3.steps': 9, 'l3.puls': 1, 'l3.div': '1', 'l3.deg': 0, 'l3.oct': -1, 'l3.vol': 0.45, 'l3.bright': 0.4,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.25, 'bor.int': '2', 'bor.cut': 220 } },
  { key: 'glaswiese', name: 'Glaswiese', tags: 'Ambient · Reibung', desc: 'Ein gestrichenes Glas über einer Äolsharfe, darunter zerfallende Kompostglocken im Puls.', v: {
    'v.eng': 'hrz', 'hrz.koerper': 'glas', 'hrz.druck': 0.45, 'hrz.harz': 0.25, 'v.layer': 'boe', 'v.layerLvl': 0.3, 'v.layerInt': 12, 'boe.wind': 0.35,
    't.root': '4', 't.scale': 'hira', 't.oct': 3, 't.range': 3,
    'l0.on': true, 'l0.eng': 'mdr', 'l0.steps': 16, 'l0.puls': 3, 'l0.div': '1', 'l0.bright': 0.6, 'l0.vol': 0.5, 'l1.on': false, 'l2.on': false, 'l3.on': false,
    'rev.mix': 0.5, 'rev.size': 10, 'dly.mix': 0.25, 'bor.on': true, 'bor.int': '1.5', 'bor.lvl': 0.25, 'seq.bpm': 60 } },
  { key: 'gespinstgarten', name: 'Gespinstgarten', tags: 'Experimentell · Ökologie', desc: 'Ein Netz aus Saiten, in das Finger und drei Spuren zupfen – lebende Saite und Ranke schwingen mit.', v: {
    'v.eng': 'gsp', 'gsp.kopplung': 0.55, 'gsp.nachklang': 3, 'gsp.saiten': 'zwei', 'gsp.halo': -6, 't.root': '9', 't.scale': 'dpent', 't.oct': 3, 't.range': 3, 'seq.bpm': 84,
    'l0.on': true, 'l0.eng': 'gsp', 'l0.steps': 16, 'l0.puls': 5, 'l0.bright': 0.5,
    'l1.on': true, 'l1.eng': 'shn', 'l1.steps': 12, 'l1.puls': 4, 'l1.oct': -1, 'l1.bright': 0.3, 'l1.vol': 0.45,
    'l2.on': true, 'l2.eng': 'rnk', 'l2.steps': 7, 'l2.puls': 2, 'l2.div': '1', 'l2.bright': 0.7, 'l2.vol': 0.4, 'l3.on': false,
    'rev.mix': 0.45, 'rev.size': 9, 'cho.mix': 0.2 } },
  { key: 'kompostgarten', name: 'Kompostgarten', tags: 'Perkussiv · Polyrhythmus', desc: 'Ein Holzstab im Herbst, darum zerfallende Kompostglocken, ein kratzender Zapfen und ein Netz aus Saiten – vier Spuren gegeneinander.', v: {
    'v.eng': 'jrg', 'jrg.jahreszeit': 'herbst', 'jrg.laub': 0.5, 't.root': '4', 't.scale': 'pelog', 't.oct': 3, 't.range': 3, 'seq.bpm': 92, 'seq.swing': 0.14,
    'l0.on': true, 'l0.eng': 'mdr', 'l0.steps': 16, 'l0.puls': 5, 'l0.oct': -1, 'l0.bright': 0.7,
    'l1.on': true, 'l1.eng': 'zpf', 'l1.steps': 12, 'l1.puls': 7, 'l1.bright': 0.35, 'l1.vol': 0.4,
    'l2.on': true, 'l2.eng': 'jrg', 'l2.steps': 7, 'l2.puls': 3, 'l2.div': '0.5', 'l2.walk': 0.5,
    'l3.on': true, 'l3.eng': 'gsp', 'l3.steps': 11, 'l3.puls': 2, 'l3.div': '1', 'gsp.kopplung': 0.5, 'drv.amt': 0.2, 'drv.mix': 0.35, 'rev.mix': 0.35 } },
  { key: 'atemrohr', name: 'Atemrohr', tags: 'Experimentell · Atem', desc: 'Ein Rohrblatt, darunter eine Oktave tiefer eine Rückkopplung, die nachglüht; eine Spur bläst kurze Stöße ins Echo.', v: {
    'v.eng': 'hlm', 'hlm.rohr': 'rohrblatt', 'hlm.luft': 0.5, 'v.layer': 'glt', 'v.layerInt': -12, 'v.layerLvl': 0.35, 'glt.gluehen': 0.45, 'glt.nachgluehen': 2.5,
    't.root': '2', 't.scale': 'dor', 't.oct': 3, 't.range': 2, 'v.glide': 0.15,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'hlm', 'l1.steps': 8, 'l1.puls': 3, 'l1.div': '0.5', 'l1.bright': 0.75, 'l1.vol': 0.35, 'l2.on': false, 'l3.on': false,
    'dly.div': '0.75', 'dly.fb': 0.4, 'dly.mix': 0.3, 'rev.mix': 0.4, 'seq.bpm': 76 } },
  { key: 'hochspannung', name: 'Hochspannung', tags: 'Psychedelisch · Elektrisch', desc: 'Brummen, Korona und Lichtbogen über einem Bass aus Zufall, dazu Zaps und kreischender Fels im Puls.', v: {
    'v.eng': 'elm', 'elm.spannung': 0.55, 'elm.bogen': 0.6, 'v.layer': 'amo', 'v.layerInt': -12, 'v.layerLvl': 0.45, 'amo.zeit': 0.2, 'v.oct': -1,
    't.root': '4', 't.scale': 'phrdom', 't.oct': 3, 't.range': 2,
    'l0.on': true, 'l0.eng': 'elm', 'l0.steps': 16, 'l0.puls': 7, 'l0.div': '0.25', 'l0.bright': 0.9, 'l0.vol': 0.5, 'l1.on': false,
    'l2.on': true, 'l2.eng': 'zpf', 'l2.steps': 9, 'l2.puls': 4, 'l2.bright': 0.95, 'zpf.koerper': 'fels', 'l3.on': false,
    'drv.type': 'fold', 'drv.amt': 0.35, 'drv.mix': 0.35, 'flt.type': 'lowpass', 'flt.freq': 5000, 'flt.lfoDepth': 0.8, 'rev.mix': 0.3, 'seq.bpm': 110 } },
  { key: 'wurzelnetz', name: 'Wurzelnetz', tags: 'Perkussiv · Generativ', desc: 'Jeder Schlag läuft als Lawine durch die Tonleiter – Finger und zwei Spuren laden und erschöpfen dasselbe Netz.', v: {
    'v.eng': 'rhz', 'rhz.knoten': 'holz', 'rhz.reiz': 0.55, 'rhz.erholung': 0.8, 'rhz.weg': 45, 'rhz.glimmen': 0.14, 'rhz.streuung': 0.35,
    't.root': '2', 't.scale': 'mpent', 't.oct': 3, 't.range': 3, 'seq.bpm': 88,
    'l0.on': true, 'l0.eng': 'rhz', 'l0.steps': 16, 'l0.puls': 5, 'l0.bright': 0.35, 'l0.vol': 0.55,
    'l1.on': true, 'l1.eng': 'rhz', 'l1.steps': 12, 'l1.puls': 3, 'l1.oct': 1, 'l1.bright': 0.2, 'l1.vol': 0.4,
    'l2.on': true, 'l2.eng': 'mem', 'l2.steps': 8, 'l2.puls': 3, 'l2.oct': -1, 'l2.vol': 0.45, 'l3.on': false,
    'rev.mix': 0.35, 'rev.size': 7, 'dly.div': '0.75', 'dly.fb': 0.35, 'dly.mix': 0.2 } },
  { key: 'vogelhain', name: 'Vogelhain', tags: 'Natur · Atem', desc: 'Eine Vogelkehle unter dem Finger – Chips, Pfiffe, oben rau –, dazu zwitschernde Spuren und Tropfen.', v: {
    'v.eng': 'khl', 'khl.silbe': 'chip', 'khl.rauheit': 0.25, 'khl.schnabel': 0.6, 'khl.anstieg': 0.25,
    't.root': '7', 't.scale': 'mpent', 't.oct': 4, 't.range': 2, 'seq.bpm': 96, 'v.glide': 0.08,
    'l0.on': true, 'l0.eng': 'khl', 'l0.steps': 16, 'l0.puls': 6, 'l0.bright': 0.6, 'l0.vol': 0.4,
    'l1.on': true, 'l1.eng': 'khl', 'l1.steps': 7, 'l1.puls': 2, 'l1.div': '0.5', 'l1.oct': 1, 'l1.bright': 0.8, 'l1.vol': 0.3,
    'l2.on': true, 'l2.eng': 'trp', 'l2.steps': 11, 'l2.puls': 3, 'l2.oct': -1, 'l2.vol': 0.35, 'l3.on': false,
    'rev.mix': 0.45, 'rev.size': 9, 'dly.div': '0.75', 'dly.fb': 0.3, 'dly.mix': 0.25 } },
  // the demo of Gestik's signature: its recipe is Sporenregen with Kalimba, and it brings a Fährte that leans the rain
  { key: 'sporenfaehrte', name: 'Sporenregen + Bewegung', tags: 'Gestik · Generativ', desc: 'Gestik einschalten, ein paar Töne spielen: eine Schleife aus Bewegung neigt den Kalimba-Regen hin und her, er spielt deine Töne von selbst.', fmt: 2, fae: rzDemoFae(), v: {
    'v.eng': 'klb', 'v.layer': 'glo', 'v.layerLvl': 0.15, 'v.layerInt': 12, 't.root': '2', 't.scale': 'mpent', 't.oct': 3, 't.range': 3,
    'klb.decay': 2.2, 'klb.over': 0.5, 'klb.thumb': 0.35, 'klb.body': 0.6, 'klb.buzz': 0.12, 'glo.ratio': 3.5, 'glo.index': 2, 'glo.decay': 3,
    'dly.div': '0.75', 'dly.fb': 0.45, 'dly.pp': 0.8, 'dly.mix': 0.3, 'rev.size': 6, 'rev.mix': 0.45, 'mov.pan': 0.3, 'seq.bpm': 84,
    'l0.on': true, 'l0.eng': 'tie', 'l0.steps': 16, 'l0.puls': 3, 'l0.div': '0.25', 'l0.deg': 0, 'l0.oct': -1, 'l0.vol': 0.55, 'l0.bright': 0.3,
    'l1.on': false, 'l2.on': false, 'l3.on': false,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.2, 'bor.int': '1.5', 'bor.cut': 420 } },  // ---- Klangbibliothek II (26.10.2026): 24 Presets für die 22 neuen Quellen, auch gemischt mit den alten ----
  // Welt
  { key: 'ganges', name: 'Ganges-Dämmerung', tags: 'Welt · Raga', desc: 'Sitar mit Tarab-Saiten über einem Tanpura-Bordun, Tabla im Teental.', v: {
    'v.eng': 'sit', 't.root': '1', 't.scale': 'bhairav', 't.oct': 3, 't.range': 2, 'v.glide': 0.12,
    'sit.jawari': 0.7, 'sit.tarab': 0.7, 'sit.chikari': 0.4, 'sit.nachklang': 0.6, 'tbl.syahi': 0.7, 'tbl.gamak': 0.7, 'tbl.nachklang': 0.45,
    'bor.on': true, 'bor.oct': 2, 'bor.lvl': 0.3, 'bor.int': '1.5', 'bor.wave': 'sawtooth', 'bor.cut': 900, 'bor.breath': 0.5,
    'rev.size': 4.5, 'rev.damp': 0.55, 'rev.mix': 0.35, 'dly.mix': 0.12, 'dly.fb': 0.3, 'mov.vib': 0, 'seq.bpm': 80, 'seq.swing': 0.08,
    'l0.on': true, 'l0.eng': 'tbl', 'l0.steps': 16, 'l0.puls': 7, 'l0.rot': 1, 'l0.div': '0.25', 'l0.deg': 0, 'l0.oct': 0, 'l0.vol': 0.55, 'l0.bright': 0.6, 'l0.prob': 0.85,
    'l1.on': true, 'l1.eng': 'tbl', 'l1.steps': 8, 'l1.puls': 3, 'l1.div': '0.5', 'l1.oct': -1, 'l1.vol': 0.5, 'l1.bright': 0.15, 'l1.prob': 0.9, 'l2.on': false, 'l3.on': false } },
  { key: 'balinacht', name: 'Bali-Nacht', tags: 'Welt · Gamelan', desc: 'Schwebende Bronzepaare im Pelog, eine Handpan antwortet, Zikaden-Echo.', v: {
    'v.eng': 'gml', 't.root': '3', 't.scale': 'pelog', 't.oct': 3, 't.range': 2,
    'gml.ombak': 0.75, 'gml.schlegel': 0.55, 'gml.nachklang': 0.6, 'gml.daempfen': 0.5, 'hng.glanz': 0.55, 'hng.nachklang': 0.6, 'hng.schweben': 0.5,
    'dly.div': '0.3333', 'dly.fb': 0.45, 'dly.pp': 0.9, 'dly.mix': 0.3, 'dly.tone': 4200, 'rev.size': 6, 'rev.mix': 0.45, 'seq.bpm': 92,
    'l0.on': true, 'l0.eng': 'gml', 'l0.steps': 16, 'l0.puls': 9, 'l0.div': '0.25', 'l0.walk': 0.5, 'l0.oct': 1, 'l0.vol': 0.4, 'l0.bright': 0.7,
    'l1.on': true, 'l1.eng': 'hng', 'l1.steps': 12, 'l1.puls': 5, 'l1.div': '0.5', 'l1.deg': 2, 'l1.vol': 0.45, 'l1.bright': 0.3,
    'l2.on': true, 'l2.eng': 'gml', 'l2.steps': 8, 'l2.puls': 2, 'l2.div': '1', 'l2.oct': -1, 'l2.vol': 0.5, 'l2.bright': 0.2, 'l3.on': false } },
  { key: 'traumzeit', name: 'Traumzeit', tags: 'Welt · Drone', desc: 'Didgeridoo mit Zirkularatmung und Knurren, Klangstäbe im Kreis.', v: {
    'v.eng': 'did', 't.root': '2', 't.scale': 'mpent', 't.oct': 1, 't.range': 2,
    'did.rohr': 0.7, 'did.knurren': 0.35, 'did.atem': 0.7, 'did.rauheit': 0.35, 'jrg.holz': 0.6,
    'rev.size': 3.5, 'rev.damp': 0.6, 'rev.mix': 0.3, 'dly.div': '0.5', 'dly.fb': 0.3, 'dly.mix': 0.15, 'seq.bpm': 104, 'seq.swing': 0.12,
    'l0.on': true, 'l0.eng': 'jrg', 'l0.steps': 16, 'l0.puls': 6, 'l0.div': '0.25', 'l0.oct': 2, 'l0.vol': 0.4, 'l0.bright': 0.8, 'l0.prob': 0.9,
    'l1.on': true, 'l1.eng': 'mem', 'l1.steps': 8, 'l1.puls': 3, 'l1.oct': 0, 'l1.vol': 0.45, 'l1.bright': 0.25, 'l2.on': false, 'l3.on': false } },
  { key: 'steppenwind', name: 'Steppenwind', tags: 'Welt · Obertöne', desc: 'Maultrommel singt Obertonmelodien über einem Kehlgesang-Bordun, Wind dazu.', v: {
    'v.eng': 'mtr', 't.root': '9', 't.scale': 'harm', 't.oct': 2, 't.range': 2,
    'mtr.zupfen': 0.45, 'mtr.mund': 0.75, 'mtr.atem': 0.4, 'mtr.klang': 0.6,
    'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.3, 'bor.int': '1', 'bor.wave': 'organ', 'bor.cut': 700, 'bor.breath': 0.6,
    'rev.size': 7, 'rev.mix': 0.4, 'dly.div': '0.75', 'dly.fb': 0.35, 'dly.mix': 0.2, 'seq.bpm': 96,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'hau', 'l1.steps': 12, 'l1.puls': 3, 'l1.oct': 1, 'l1.vol': 0.2, 'l1.bright': 0.7, 'l2.on': false, 'l3.on': false } },
  { key: 'kirschbluete', name: 'Kirschblüte', tags: 'Welt · Japan', desc: 'Koto im Hirajōshi – schieb den Finger hoch, die Hand drückt hinter dem Steg nach.', v: {
    'v.eng': 'kto', 't.root': '4', 't.scale': 'hira', 't.oct': 3, 't.range': 2,
    'kto.nagel': 0.7, 'kto.seide': 0.55, 'kto.nachklang': 0.6, 'kto.druck': 0.8, 'hng.glanz': 0.4,
    'rev.size': 5, 'rev.damp': 0.4, 'rev.mix': 0.4, 'dly.div': '0.75', 'dly.fb': 0.35, 'dly.mix': 0.22, 'seq.bpm': 70,
    'l0.on': false, 'l1.on': false, 'l2.on': true, 'l2.eng': 'kto', 'l2.steps': 9, 'l2.puls': 4, 'l2.div': '0.5', 'l2.walk': 0.6, 'l2.vol': 0.35, 'l2.bright': 0.45,
    'l3.on': true, 'l3.eng': 'hng', 'l3.steps': 13, 'l3.puls': 3, 'l3.div': '1', 'l3.oct': -1, 'l3.vol': 0.35, 'l3.bright': 0.2 } },
  { key: 'handpankreis', name: 'Handpan-Kreis', tags: 'Welt · Meditation', desc: 'Ein Stahlfeld unter der Hand, ein zweites spielt Kreise im Akebono, unter einer Steinkuppel.', v: { 'drv.mix': 0,
    'v.eng': 'hng', 't.root': '2', 't.scale': 'akebono', 't.oct': 3, 't.range': 2,
    'hng.glanz': 0.5, 'hng.nachklang': 0.7, 'hng.koerper': 0.65, 'hng.schweben': 0.55,
    // (Handpan-Pilot) a real room, a stone dome; the steel without the app's default motion (no vibrato, drift, phaser,
    // circling, chorus – a handpan has none)
    'rev.raum': 'stein', 'rev.size': 4.5, 'rev.damp': 0.45, 'rev.pre': 0.018, 'rev.mix': 0.42, 'cho.mix': 0, 'pha.mix': 0, 'flt.lfoDepth': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0,
    'dly.div': '0.75', 'dly.fb': 0.3, 'dly.mix': 0.18, 'seq.bpm': 76,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'hng', 'l1.steps': 11, 'l1.puls': 4, 'l1.div': '0.5', 'l1.walk': 0.7, 'l1.vol': 0.4, 'l1.bright': 0.35, 'l2.on': false, 'l3.on': false } },
  // Sphäre
  { key: 'nordlichtfeld', name: 'Nordlichtfeld', tags: 'Ambient · Spektral', desc: 'Lichtvorhänge wandern über 48 Teiltöne, ein Glockenschimmer fällt hinein.', v: {
    'v.eng': 'nrd', 'v.layer': 'glo', 'v.layerLvl': 0.12, 'v.layerInt': 24, 't.root': '7', 't.scale': 'lyd', 't.oct': 2, 't.range': 3,
    'nrd.vorhang': 0.6, 'nrd.schimmer': 0.55, 'nrd.anstieg': 0.6, 'glo.ratio': 3.5, 'glo.index': 1.5, 'glo.decay': 5,
    'cho.mix': 0.25, 'dly.div': '1.5', 'dly.fb': 0.55, 'dly.mix': 0.3, 'dly.tone': 5000, 'rev.size': 12, 'rev.damp': 0.35, 'rev.mix': 0.6, 'seq.bpm': 60,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': true, 'bor.oct': 1, 'bor.lvl': 0.2, 'bor.int': '1.5', 'bor.cut': 400 } },
  { key: 'schimmerdom', name: 'Schimmerdom', tags: 'Ambient · Shimmer', desc: 'Ein Raum, der jede Note eine Oktave höher zurückwirft – er wächst nach oben.', v: {
    'v.eng': 'sht', 't.root': '0', 't.scale': 'dpent', 't.oct': 3, 't.range': 2,
    'sht.schimmer': 0.75, 'sht.raum': 0.8, 'sht.quinte': 0.3, 'sht.farbe': 0.45,
    'rev.size': 9, 'rev.mix': 0.35, 'dly.mix': 0.1, 'cho.mix': 0.2, 'mov.drift': 8, 'seq.bpm': 56,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'sht', 'l3.steps': 13, 'l3.puls': 2, 'l3.div': '1', 'l3.oct': -1, 'l3.vol': 0.35, 'l3.bright': 0.3 } },
  { key: 'aetherfunk', name: 'Ätherfunk', tags: 'Sphärisch · Retro', desc: 'Ondes Martenot mit Palme-Diffuseur, gleitend, Vibrato aus der Hand.', v: {
    'v.eng': 'ond', 't.root': '9', 't.scale': 'free', 't.oct': 3, 't.range': 2, 'v.glide': 0.25,
    'ond.palme': 0.65, 'ond.metall': 0.2, 'ond.vibrato': 0.5, 'ond.klang': 0.3,
    'rev.size': 6, 'rev.mix': 0.45, 'dly.div': '1', 'dly.fb': 0.4, 'dly.mix': 0.25, 'dly.wow': 0.3, 'seq.bpm': 66,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false } },
  { key: 'tiefseegesang', name: 'Tiefseegesang', tags: 'Ambient · Natur', desc: 'Wale rufen aus der Ferne, gedämpft vom Wasser; ein Herzschlag aus der Tiefe.', v: {
    'v.eng': 'wal', 't.root': '2', 't.scale': 'dor', 't.oct': 2, 't.range': 3,
    'wal.bogen': 0.7, 'wal.dauer': 0.6, 'wal.knarren': 0.35, 'wal.tiefe': 0.75,
    'rev.size': 13, 'rev.damp': 0.7, 'rev.mix': 0.6, 'dly.div': '1.5', 'dly.fb': 0.5, 'dly.mix': 0.25, 'dly.tone': 1600, 'seq.bpm': 52,
    'l0.on': true, 'l0.eng': 'tie', 'l0.steps': 16, 'l0.puls': 2, 'l0.div': '0.5', 'l0.oct': -1, 'l0.vol': 0.45, 'l0.bright': 0.15,
    'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'trp', 'l3.steps': 11, 'l3.puls': 2, 'l3.div': '1', 'l3.oct': 1, 'l3.vol': 0.25, 'l3.bright': 0.4 } },
  // Psyche
  { key: 'endlosetreppe', name: 'Endlose Treppe', tags: 'Psychedelisch · Illusion', desc: 'Shepard-Glissando: es steigt und steigt und kommt nie an. Unten fällt es.', v: {
    'v.eng': 'stp', 't.root': '0', 't.scale': 'whole', 't.oct': 2, 't.range': 2,
    'stp.tempo': 0.45, 'stp.spanne': 0.7, 'stp.atmen': 0.5, 'stp.ruhe': 0.3,
    'pha.mix': 0.3, 'pha.rate': 0.05, 'rev.size': 8, 'rev.mix': 0.5, 'dly.div': '0.75', 'dly.fb': 0.5, 'dly.mix': 0.3, 'seq.bpm': 60,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false } },
  { key: 'seltsamerattraktor', name: 'Seltsamer Attraktor', tags: 'Experimentell · Chaos', desc: 'Ein Rössler-System auf der Note: unten ein Ton, nach oben Periodenverdopplung bis ins Chaos.', v: {
    'v.eng': 'atr', 't.root': '5', 't.scale': 'phrdom', 't.oct': 2, 't.range': 2,
    'atr.mischung': 0.45, 'atr.farbe': 0.6, 'atr.drift': 0.4, 'atr.tiefe': 0.5,
    'drv.type': 'fold', 'drv.amt': 0.25, 'drv.mix': 0.3, 'flt.lfoRate': 0.11, 'flt.lfoDepth': 1.4, 'rev.size': 5, 'rev.mix': 0.4, 'dly.div': '0.3333', 'dly.fb': 0.6, 'dly.mix': 0.3, 'seq.bpm': 90,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'bnt', 'l1.steps': 16, 'l1.puls': 5, 'l1.div': '0.25', 'l1.oct': 1, 'l1.vol': 0.3, 'l1.bright': 0.7, 'l2.on': false, 'l3.on': false } },
  { key: 'tunnelblick', name: 'Tunnelblick', tags: 'Psychedelisch · Flanger', desc: 'Ein Düsenstrahl durch die gestimmte Röhre – nach oben saugt der Tunnel.', v: {
    'v.eng': 'tnl', 't.root': '7', 't.scale': 'mpent', 't.oct': 2, 't.range': 3,
    'tnl.tempo': 0.25, 'tnl.tiefe': 0.85, 'tnl.rauschen': 0.5, 'tnl.breite': 0.7,
    'rev.size': 7, 'rev.mix': 0.45, 'dly.div': '0.75', 'dly.fb': 0.55, 'dly.mix': 0.3, 'dly.wow': 0.4, 'mov.pan': 0.5, 'seq.bpm': 72,
    'l0.on': true, 'l0.eng': 'gbs', 'l0.steps': 16, 'l0.puls': 3, 'l0.div': '0.5', 'l0.oct': -1, 'l0.vol': 0.45, 'l0.bright': 0.3, 'l1.on': false, 'l2.on': false, 'l3.on': false } },
  { key: 'zeitlupe', name: 'Zeitlupe', tags: 'Ambient · Psychedelisch', desc: 'Schimmer und Nordlicht ineinander, alles in halber Geschwindigkeit, leierndes Band.', v: {
    'v.eng': 'sht', 'v.layer': 'nrd', 'v.layerLvl': 0.4, 'v.layerInt': -12, 't.root': '2', 't.scale': 'hira', 't.oct': 3, 't.range': 2,
    'sht.schimmer': 0.55, 'sht.raum': 0.7, 'sht.farbe': 0.35, 'nrd.vorhang': 0.3, 'nrd.anstieg': 0.8,
    'dly.div': '2', 'dly.fb': 0.6, 'dly.mix': 0.35, 'dly.wow': 0.7, 'dly.tone': 2200, 'rev.size': 11, 'rev.mix': 0.55, 'cho.mix': 0.35, 'cho.rate': 0.1, 'seq.bpm': 40,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false } },
  // Strom, LoFi, Trap
  { key: 'westkuestenbongos', name: 'Westküsten-Bongos', tags: 'Experimentell · Modular', desc: 'Gefaltete FM-Pings durch das Lowpass-Gate, polyrhythmisch – der Buchla-Bongo.', v: {
    'v.eng': 'wkg', 't.root': '0', 't.scale': 'dor', 't.oct': 3, 't.range': 3,
    'wkg.faltung': 0.5, 'wkg.fm': 0.4, 'wkg.verhaeltnis': 0.5, 'wkg.vaktrol': 0.35,
    'dly.div': '0.3333', 'dly.fb': 0.45, 'dly.pp': 1, 'dly.mix': 0.3, 'rev.size': 4, 'rev.mix': 0.35, 'seq.bpm': 112,
    'l0.on': true, 'l0.eng': 'wkg', 'l0.steps': 16, 'l0.puls': 7, 'l0.div': '0.25', 'l0.walk': 0.6, 'l0.vol': 0.45, 'l0.bright': 0.5,
    'l1.on': true, 'l1.eng': 'wkg', 'l1.steps': 12, 'l1.puls': 5, 'l1.div': '0.25', 'l1.oct': -1, 'l1.vol': 0.45, 'l1.bright': 0.2,
    'l2.on': true, 'l2.eng': 'wkg', 'l2.steps': 9, 'l2.puls': 4, 'l2.div': '0.5', 'l2.oct': 1, 'l2.vol': 0.3, 'l2.bright': 0.9, 'l3.on': false } },
  { key: 'kurzschluss', name: 'Kurzschluss', tags: 'Glitch · Experimentell', desc: 'Ein verbogenes Spielzeug springt, stottert und zerbröselt, dazu Chip-Funken.', v: {
    'v.eng': 'bnt', 't.root': '6', 't.scale': 'chrom', 't.oct': 3, 't.range': 2,
    'bnt.bits': 0.55, 'bnt.sprung': 0.6, 'bnt.stottern': 0.55, 'bnt.kreuz': 0.5, 'bit.arpeggio': 0.6,
    'dly.div': '0.25', 'dly.fb': 0.5, 'dly.mix': 0.25, 'rev.size': 2, 'rev.mix': 0.25, 'seq.bpm': 140,
    'l0.on': true, 'l0.eng': 'bit', 'l0.steps': 16, 'l0.puls': 9, 'l0.div': '0.125', 'l0.oct': 1, 'l0.vol': 0.25, 'l0.bright': 0.8, 'l0.prob': 0.6,
    'l1.on': true, 'l1.eng': 'bnt', 'l1.steps': 7, 'l1.puls': 3, 'l1.div': '0.25', 'l1.vol': 0.4, 'l1.bright': 0.9, 'l2.on': false, 'l3.on': false } },
  { key: 'kassettendeck', name: 'Kassettendeck', tags: 'LoFi · Beats', desc: 'E-Piano auf ausgeleiertem Band, Hi-Hats im Swing, ein weicher 808 darunter.', v: {
    'v.eng': 'kas', 't.root': '5', 't.scale': 'dor', 't.oct': 3, 't.range': 2,
    'kas.alter': 0.6, 'kas.glocke': 0.35, 'kas.nachklang': 0.55, 'kas.waerme': 0.6, 'hht.ton': 0.3, 'hht.rauschen': 0.4, 'gbs.knack': 0.3, 'gbs.ausklang': 0.4, 'gbs.ton': 0.3,
    'flt.freq': 6500, 'cho.mix': 0.25, 'dly.div': '0.75', 'dly.fb': 0.3, 'dly.mix': 0.15, 'dly.wow': 0.5, 'rev.size': 2.5, 'rev.mix': 0.25, 'seq.bpm': 82, 'seq.swing': 0.32,
    'l0.on': true, 'l0.eng': 'hht', 'l0.steps': 16, 'l0.puls': 8, 'l0.div': '0.25', 'l0.vol': 0.3, 'l0.bright': 0.25, 'l0.prob': 0.9,
    'l1.on': true, 'l1.eng': 'gbs', 'l1.steps': 16, 'l1.puls': 3, 'l1.div': '0.25', 'l1.oct': -2, 'l1.vol': 0.5, 'l1.bright': 0.2, 'l2.on': false, 'l3.on': false } },
  { key: 'achtbithimmel', name: 'Achtbit-Himmel', tags: 'Chiptune · Retro', desc: 'Pulswellen-Arpeggios flimmern über einem Dreiecksbass, Tracker-Echo.', v: {
    'v.eng': 'bit', 't.root': '0', 't.scale': 'lyd', 't.oct': 3, 't.range': 2,
    'bit.arpeggio': 0.55, 'bit.leben': 0.45, 'bit.dreieck': 0.5, 'bit.abklingen': 0.35,
    'dly.div': '0.75', 'dly.fb': 0.4, 'dly.pp': 0.8, 'dly.mix': 0.25, 'rev.size': 2.5, 'rev.mix': 0.25, 'seq.bpm': 128,
    'l0.on': true, 'l0.eng': 'bit', 'l0.steps': 16, 'l0.puls': 6, 'l0.div': '0.25', 'l0.walk': 0.7, 'l0.oct': 1, 'l0.vol': 0.3, 'l0.bright': 0.8,
    'l1.on': true, 'l1.eng': 'bit', 'l1.steps': 8, 'l1.puls': 3, 'l1.div': '0.5', 'l1.oct': -1, 'l1.vol': 0.35, 'l1.bright': 0.1, 'l2.on': false, 'l3.on': false } },
  { key: 'mitternachtstrap', name: 'Mitternachtstrap', tags: 'Trap · Dunkel', desc: 'Gleitender 808 mit Knurren, Hi-Hat-Wirbel, dunkle Glocke im Phrygischen.', v: {
    'v.eng': 'gbs', 't.root': '1', 't.scale': 'phrdom', 't.oct': 1, 't.range': 2,
    'gbs.knack': 0.55, 'gbs.ausklang': 0.65, 'gbs.gleiten': 0.5, 'gbs.ton': 0.55, 'hht.ton': 0.55, 'hht.wirbel': 0.8, 'hht.rauschen': 0.2, 'hht.abwuergen': 1,
    'rev.size': 3, 'rev.mix': 0.2, 'dly.div': '0.75', 'dly.fb': 0.3, 'dly.mix': 0.12, 'seq.bpm': 140, 'seq.swing': 0.04,
    'l0.on': true, 'l0.eng': 'hht', 'l0.steps': 16, 'l0.puls': 11, 'l0.div': '0.25', 'l0.oct': 2, 'l0.vol': 0.35, 'l0.bright': 0.2, 'l0.prob': 0.85,
    'l1.on': true, 'l1.eng': 'hht', 'l1.steps': 32, 'l1.puls': 3, 'l1.rot': 7, 'l1.div': '0.125', 'l1.oct': 2, 'l1.vol': 0.25, 'l1.bright': 0.8,
    'l2.on': true, 'l2.eng': 'glo', 'l2.steps': 16, 'l2.puls': 2, 'l2.div': '0.5', 'l2.deg': 4, 'l2.oct': 1, 'l2.vol': 0.25, 'l2.bright': 0.3, 'l3.on': false } },
  { key: 'silbenregen', name: 'Silbenregen', tags: 'Vocal Chops · Future', desc: 'Gehackte Silben auf dem Puls, die Höhe wählt den Vokal – ta, ka, si, cho.', v: {
    'v.eng': 'vox', 't.root': '9', 't.scale': 'mpent', 't.oct': 3, 't.range': 2,
    'vox.konsonant': 0.45, 'vox.hauch': 0.3, 'vox.groesse': 0.65, 'vox.vibrato': 0.35,
    'cho.mix': 0.3, 'dly.div': '0.3333', 'dly.fb': 0.5, 'dly.pp': 1, 'dly.mix': 0.3, 'rev.size': 4, 'rev.mix': 0.4, 'seq.bpm': 100, 'seq.swing': 0.15,
    'l0.on': true, 'l0.eng': 'vox', 'l0.steps': 16, 'l0.puls': 7, 'l0.div': '0.25', 'l0.walk': 0.6, 'l0.vol': 0.35, 'l0.bright': 0.6,
    'l1.on': true, 'l1.eng': 'gbs', 'l1.steps': 8, 'l1.puls': 3, 'l1.oct': -2, 'l1.vol': 0.4, 'l1.bright': 0.15, 'l2.on': false, 'l3.on': false } },
  { key: 'spieluhrtraum', name: 'Spieluhrtraum', tags: 'LoFi · Nostalgie', desc: 'Eine Spieluhr, deren Feder abläuft – auf leierndem Band, im großen Raum.', v: {
    'v.eng': 'spu', 't.root': '4', 't.scale': 'dpent', 't.oct': 4, 't.range': 2,
    'spu.glanz': 0.5, 'spu.nachklang': 0.6, 'spu.uhrwerk': 0.45, 'spu.kasten': 0.55,
    'dly.div': '1.5', 'dly.fb': 0.45, 'dly.mix': 0.25, 'dly.wow': 0.65, 'dly.tone': 2800, 'rev.size': 8, 'rev.mix': 0.5, 'seq.bpm': 66,
    'l0.on': false, 'l1.on': false, 'l2.on': true, 'l2.eng': 'spu', 'l2.steps': 12, 'l2.puls': 5, 'l2.div': '0.5', 'l2.walk': 0.7, 'l2.vol': 0.35, 'l2.bright': 0.3, 'l3.on': false } },
  { key: 'chillhopabend', name: 'Chillhop-Abend', tags: 'LoFi · Jazz', desc: 'Weiches E-Piano mit Bellen oben, Koto-Tupfer, Hi-Hats und Gleitbass im Swing.', v: {
    'v.eng': 'kas', 't.root': '2', 't.scale': 'dor', 't.oct': 3, 't.range': 2,
    'kas.alter': 0.4, 'kas.glocke': 0.5, 'kas.nachklang': 0.6, 'kas.waerme': 0.45, 'kto.nagel': 0.4, 'gbs.knack': 0.25, 'gbs.ausklang': 0.35, 'gbs.ton': 0.25, 'hht.ton': 0.25,
    'cho.mix': 0.3, 'dly.div': '0.75', 'dly.fb': 0.25, 'dly.mix': 0.15, 'dly.wow': 0.35, 'rev.size': 2.2, 'rev.mix': 0.25, 'seq.bpm': 86, 'seq.swing': 0.28,
    'l0.on': true, 'l0.eng': 'hht', 'l0.steps': 16, 'l0.puls': 6, 'l0.div': '0.25', 'l0.vol': 0.25, 'l0.bright': 0.4,
    'l1.on': true, 'l1.eng': 'gbs', 'l1.steps': 16, 'l1.puls': 4, 'l1.div': '0.25', 'l1.oct': -2, 'l1.vol': 0.45, 'l1.bright': 0.1,
    'l2.on': true, 'l2.eng': 'kto', 'l2.steps': 7, 'l2.puls': 2, 'l2.div': '0.5', 'l2.deg': 4, 'l2.oct': 1, 'l2.vol': 0.3, 'l2.bright': 0.5, 'l3.on': false } },
  // Mischungen mit den alten Quellen
  { key: 'pilzorakel', name: 'Pilzorakel', tags: 'Psychedelisch · Ritual', desc: 'Der Attraktor raunt unter Gamelan-Paaren, Moder gärt, alles kreist im Raum.', v: {
    'v.eng': 'atr', 'v.layer': 'gml', 'v.layerLvl': 0.3, 'v.layerInt': 12, 't.root': '3', 't.scale': 'pelog', 't.oct': 2, 't.range': 2,
    'atr.mischung': 0.25, 'atr.farbe': 0.45, 'atr.drift': 0.5, 'gml.ombak': 0.8, 'gml.nachklang': 0.7,
    'mov.pan': 0.6, 'mov.panRate': 0.09, 'pha.mix': 0.35, 'pha.rate': 0.07, 'rev.size': 10, 'rev.mix': 0.55, 'dly.div': '1.5', 'dly.fb': 0.5, 'dly.mix': 0.3, 'seq.bpm': 64,
    'l0.on': false, 'l1.on': true, 'l1.eng': 'mdr', 'l1.steps': 11, 'l1.puls': 3, 'l1.div': '0.5', 'l1.vol': 0.35, 'l1.bright': 0.6, 'l2.on': false, 'l3.on': false } },
  { key: 'polarfunk', name: 'Polarfunk', tags: 'Ambient · Experimentell', desc: 'Ätherwelle über dem Nordlicht, Schaltkreis-Störungen wie Funk aus dem Eis.', v: {
    'v.eng': 'ond', 'v.layer': 'nrd', 'v.layerLvl': 0.35, 'v.layerInt': -12, 't.root': '11', 't.scale': 'lyd', 't.oct': 3, 't.range': 2, 'v.glide': 0.3,
    'ond.palme': 0.5, 'ond.metall': 0.35, 'ond.vibrato': 0.45, 'nrd.vorhang': 0.5, 'bnt.bits': 0.7, 'bnt.sprung': 0.3, 'bnt.stottern': 0.5,
    'rev.size': 12, 'rev.mix': 0.55, 'dly.div': '1', 'dly.fb': 0.5, 'dly.mix': 0.3, 'dly.wow': 0.4, 'seq.bpm': 58,
    'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': true, 'l3.eng': 'bnt', 'l3.steps': 13, 'l3.puls': 3, 'l3.div': '0.25', 'l3.oct': 1, 'l3.vol': 0.2, 'l3.bright': 0.5, 'l3.prob': 0.5 } },
];
let presetCards = [], userListEl, undoBtn, installBtn, installEvt = null, mutAmt = 0.35;
async function installApp() {
  if (!installEvt) return;
  const e = installEvt; installEvt = null;
  if (installBtn) installBtn.hidden = true;
  try { e.prompt(); await e.userChoice; } catch (err) {}
}
function userPresets() {
  try {
    const a = JSON.parse(store.get('myzel.user.v1') || '[]');
    return Array.isArray(a) ? a.filter((p) => p && typeof p.name === 'string' && p.v && typeof p.v === 'object') : [];
  } catch (e) { return []; }
}
function setUserPresets(a) { return store.set('myzel.user.v1', JSON.stringify(a)); }

/* ---------- undo for preset loads, mutation and dice ---------- */
const HIST = [];
function remember() { HIST.push({ v: patchValues(), preset: UI.preset, rzK: GK.p.rzK }); if (HIST.length > 30) HIST.shift(); updUndo(); }
function undo() {
  const prev = HIST.pop();
  if (!prev) return;
  UI.loading = true; loadValues(prev.v, false); UI.loading = false;
  if (prev.fae !== undefined) faeImport(prev.fae, 'undo');
  UI.preset = prev.preset; markPresetCards(); updUndo();
  if (prev.rzK !== undefined) rzPreset({ key: prev.rzK });   // the Gestik recipe it had
  if (prev.gk) gkOwnSet(prev.gk);   // and the player's own Gestik settings a user preset had replaced
  toast('Vorheriger Klang wiederhergestellt.');
}
function updUndo() { if (undoBtn) undoBtn.disabled = !HIST.length; }
const UNDO = { label: 'Rückgängig', fn: () => undo() };

function loadPreset(p) {
  remember();
  if (p.fmt >= 2) HIST[HIST.length - 1].fae = faeExport();   // "Rückgängig" brings back the Fährte it replaces
  if (p.fmt >= 2 && p.gk && GK.on && GK.p.rez !== false) HIST[HIST.length - 1].gk = gkOwnGet();   // … and the player's own Gestik settings
  UI.loading = true; loadValues(p.v, false); UI.loading = false;
  UI.preset = p.key || null;
  rzPreset(p);   // its Gestik recipe (none: the player's own settings) – before a user preset's own Gestik settings
  presetExtraLoad(p);
  markPresetCards();
  kqUsed(P['v.eng']);
  const miss = engMissSay();
  toast('„' + p.name + '“ geladen.' + rzSay() + (miss ? ' ' + miss : ''), miss ? 8000 : 4500, UNDO);
}
// (owner, 26.10.2026: „mit einem leeren Preset beginnen können“) Leere Erde: every setting at its plain start, the
// effects dry, no second layer, no Bordun, no Puls lane, no Fährte – a sound to build from. Apart from PRESETS, whose
// order is the program numbers a device sends.
const PRESET_LEER = { key: 'leer', name: 'Leere Erde', tags: 'Neutral · Anfang', desc: 'Alles auf Anfang: ein schlichter Klang, trocken – kein Hall, kein Echo, kein Puls. Zum Selberbauen.', fmt: 2, fae: null,
  v: { 'rev.mix': 0, 'dly.mix': 0, 'cho.mix': 0, 'drv.mix': 0, 'flt.freq': 18000, 'flt.lfoDepth': 0, 'v.layer': 'off', 'bor.on': false, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'mst.comp': 0 } };
function markPresetCards() { for (const c of presetCards) c.setAttribute('aria-current', String(c.dataset.key === UI.preset)); }
function markPresetDirty() { if (UI.preset && !UI.loading) { UI.preset = null; markPresetCards(); } }
function buildPresets() {
  const box = h('div');
  const g = h('div', { class: 'pgrid' });
  KB.cards = [];   // (the Klangwelten's pictures – klangwelten.js)
  presetCards = [PRESET_LEER].concat(PRESETS).map((p, i) => { const c = kbCard(p, i, () => loadPreset(p)); g.append(c); return c; });
  requestAnimationFrame(() => kbWatch(g));
  undoBtn = h('button', { type: 'button', class: 'btn', disabled: true, onclick: undo }, 'Rückgängig');
  installBtn = h('button', { type: 'button', class: 'btn primary', hidden: !installEvt, onclick: installApp }, 'Als App installieren');
  box.append(section('Klangwelten', 'Laden ersetzt alle Klangeinstellungen', g, h('div', { class: 'row', style: 'margin-top:10px' }, undoBtn, installBtn), h('div', { class: 'pleer' }, ctl('ui.leer'))));
  const mut = h('input', { type: 'range', id: 'mutAmt', min: 0, max: 100, step: 1, value: Math.round(mutAmt * 100), 'aria-label': 'Stärke der Mutation' });
  const mutVal = h('span', { class: 'val' }, Math.round(mutAmt * 100) + ' %');
  mut.style.setProperty('--p', mut.value + '%');
  mut.addEventListener('input', () => { mutAmt = mut.value / 100; mutVal.textContent = mut.value + ' %'; mut.style.setProperty('--p', mut.value + '%'); });
  box.append(section('Mutation', 'Zufällige Verwandlung des aktuellen Klangs',
    h('div', { class: 'ctl' }, h('div', { class: 'ctl-row' }, h('label', { for: 'mutAmt' }, 'Stärke'), mutVal), mut),
    h('div', { class: 'row', style: 'margin:10px 0 6px' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => mutate(mutAmt) }, 'Mutieren'),
      h('button', { type: 'button', class: 'btn', onclick: dice }, 'Ganz neu würfeln'))));
  const nameIn = h('input', { type: 'text', id: 'presetName', placeholder: 'Name, z. B. Nachtfalter', maxlength: '40', 'aria-label': 'Name für das eigene Preset' });
  userListEl = h('div');
  const file = h('input', { type: 'file', id: 'presetFile', accept: '.json,application/json', hidden: true });
  file.addEventListener('change', () => importPreset(file));
  box.append(section('Eigene Presets', 'Auf diesem Gerät gespeichert',
    h('div', { class: 'row', style: 'margin-bottom:8px' }, nameIn, h('button', { type: 'button', class: 'btn primary', onclick: () => {
      const name = nameIn.value.trim() || 'Eigenes ' + (userPresets().length + 1);
      const list = userPresets().filter((p) => p.name !== name);
      list.unshift(Object.assign({ name, v: patchValues() }, presetExtra()));   // format 2: with the Fährte and Gestik's settings
      if (!setUserPresets(list.slice(0, 50))) { toast('Diese Ansicht kann nichts dauerhaft speichern. Nutze „Klang als Datei exportieren“.', 5000); return; }
      nameIn.value = ''; renderUserPresets(); toast('Preset „' + name + '“ gespeichert.');
    } }, 'Speichern')),
    userListEl,
    h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { type: 'button', class: 'btn', onclick: exportPreset }, 'Klang als Datei exportieren'),
      h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Datei importieren'), file)));
  // (owner, 26.10.2026: „den Text bei Spielhilfe zum Einklappen“; the phone's Gestik line left out – it is being rebuilt)
  box.append(foldSec('hilfe', 'Spielhilfe', [h('ul', { class: 'help' },
    h('li', null, h('b', null, 'Klangquelle: '), ENG_OPTS.length + ' Quellen in ' + FAM.length + ' Familien – ' + listDe(FAM.map((f) => f[1])) + '. ‹ › wechseln zur Nachbarin und spielen sie kurz an, Tippen auf den Namen öffnet die Bibliothek mit Suche, ★ Favoriten und ▶ Anhören; der Würfel überrascht.'),
    h('li', null, h('b', null, 'Halten: '), 'Die Quellen aus ' + listDe(famPlay().hold) + ' klingen, solange der Finger liegt – wie jede, auf deren Kachel „hält“ steht. Schieben ändert Tonhöhe und Farbe.'),
    h('li', null, h('b', null, 'Tippen und Wischen: '), 'Die Quellen aus ' + listDe(famPlay().strike) + ' schlagen beim Berühren an (auf der Kachel: „schlägt“ oder „beides“) – mit „Wischen schlägt an“ auch bei jedem Tonwechsel unterwegs.'),
    h('li', null, h('b', null, 'Wirbel: '), 'Unter „Klang → Spielweise“ wiederholt ein gehaltener Finger seinen Ton im Tempo des Pulses.'),
    h('li', null, h('b', null, 'Einfrieren: '), 'Die Schneeflocke hält die Echoschleife endlos fest. Darüber kannst du weiterspielen.'),
    h('li', null, h('b', null, 'Stille: '), 'Stoppt sofort alle Töne, den Bordun, Echo, Hall und den Puls.'),
    h('li', null, h('b', null, 'Doppeltippen '), 'auf den Namen eines Reglers setzt ihn zurück.'),
    h('li', null, h('b', null, 'Keyboard und Controller: '), 'per USB einstecken und losspielen; ein Bluetooth-Keyboard wie das microKEY Air unter „Gerät“ mit „Bluetooth-Keyboard koppeln“ verbinden – in Chrome oder Edge, auch auf Android. Regler, Fader und Pads legst du dort mit „Zuweisen“ auf jedes Ziel, auch im Mixer. iPhone und iPad brauchen dafür eine App wie „Web MIDI Browser“.'),
    h('li', null, h('b', null, 'Gerät: '), 'Qualitätsstufe, Latenz und wie die Tasten spielen findest du ebenfalls dort.'),
    h('li', null, h('b', null, 'iPhone: '), 'Bleibt es still, den Stummschalter an der Seite ausschalten. Das iPhone erkennt höchstens fünf Finger gleichzeitig.'),
    h('li', null, h('b', null, 'Als App, auch offline: '), 'beidlat.github.io/4claude im Browser öffnen, dann „Teilen → Zum Home-Bildschirm“ (iPhone) bzw. „App installieren“ (Android).'))]));
  renderUserPresets(); markPresetCards(); updUndo();
  return box;
}
function renderUserPresets() {
  if (!userListEl) return;
  const list = userPresets();
  userListEl.replaceChildren();
  if (!list.length) { userListEl.append(h('p', { class: 'note' }, 'Noch keine eigenen Presets. Gib oben einen Namen ein und tippe auf „Speichern“.')); return; }
  for (const p of list) {
    const del = h('button', { type: 'button', class: 'btn ghost danger' }, 'Löschen');
    del.addEventListener('click', () => {
      if (!del.dataset.confirm) { del.dataset.confirm = '1'; del.textContent = 'Wirklich?'; setTimeout(() => { if (del.isConnected) { delete del.dataset.confirm; del.textContent = 'Löschen'; } }, 3000); return; }
      setUserPresets(userPresets().filter((x) => x.name !== p.name)); renderUserPresets();
    });
    userListEl.append(h('div', { class: 'urow' }, kbMini(p), h('span', null, p.name), h('button', { type: 'button', class: 'btn', onclick: () => loadPreset(p) }, 'Laden'), del));
  }
}
function exportPreset() {
  const name = UI.preset ? (PRESETS.concat([PRESET_LEER]).find((p) => p.key === UI.preset) || {}).name : 'Mein Klang';
  const x = presetExtra();   // version 2: the Fährte and Gestik's settings ride along (version 1 files still load)
  const json = JSON.stringify({ app: 'Myzel', version: 2, name: name || 'Mein Klang', values: patchValues(), faehrte: x.fae, gestik: x.gk }, null, 2);
  offerFile('myzel-klang-' + slug(name) + '.json', new Blob([json], { type: 'application/json' }));
}
function importPreset(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      const vals = data && (data.values || data);
      if (!vals || typeof vals !== 'object' || !Object.keys(vals).some((k) => PD[k])) throw new Error('keine Myzel-Datei');
      loadPreset(Object.assign({ name: data.name || f.name, v: vals }, data.version >= 2 ? { fmt: 2, fae: data.faehrte || null, gk: data.gestik } : null));
    } catch (e) { toast('Diese Datei enthält keine Myzel-Klangeinstellungen.'); }
    input.value = '';
  };
  r.readAsText(f);
}

/* ---------- mutation & dice, kept inside audible, musical ranges ---------- */
const MUT_SKIP = new Set(['mst.vol', 'mst.comp', 'mst.low', 'mst.high', 'mst.wid', 'seq.bpm', 't.a4', 't.oct', 't.range', 't.root', 'v.eng', 'v.layer', 'bor.on', 'v.vel', 'v.oct', 'v.deg', 'v.layerDeg']);
const mutSkip = (id) => MUT_SKIP.has(id) || id[0] === 'x' || id.startsWith('mix.');
function safeify(vals) {
  const lim = (id, lo, hi) => { vals[id] = sanitize(PD[id], clamp(vals[id], lo, hi)); };
  lim('dly.fb', 0, Math.max(0.85, Math.min(P['dly.fb'], 1.05)));
  lim('rev.mix', 0, 0.8); lim('rng.mix', 0, 0.7); lim('drv.amt', 0, 0.8);
  if (vals['flt.type'] === 'lowpass') lim('flt.freq', 600, 18000);
  else if (vals['flt.type'] === 'highpass') lim('flt.freq', 40, 1500);
  else { lim('flt.freq', 300, 5000); lim('flt.q', 0.3, 6); }
  lim('neb.cut', 250, 12000); lim('hau.q', 0.3, 40); lim('kor.size', 0.03, 0.6); lim('bor.cut', 150, 4000);
  lim('mdr.nachklang', 1, 8);
  lim('shn.ebow', 0, 0.8);   // (Sehne: a die-thrown E-Bow holds every note at its full level – SPEC §5)
  lim('glt.gluehen', 0, 0.8); lim('gsp.kopplung', 0, 0.7); lim('hrz.druck', 0, 0.85); lim('boe.nachklang', 0.5, 5);   // (klang SPEC §5: a dice patch never howls, sings by itself or rings on and on)
  lim('amo.zeit', 0, 0.5);   // (Amöbe: wilder durations blur the pitch – klang SPEC §5)   // (klang SPEC §5: a dice patch's Kompostglocke rings at most 8 s)
  for (let i = 0; i < 4; i++) { lim('l' + i + '.vol', 0.2, 1); lim('l' + i + '.prob', 0.35, 1); }
  return vals;
}
function mutate(amount) {
  remember();
  const vals = patchValues();
  for (const id of PATCH_IDS) {
    if (mutSkip(id) || /^l\d\.on$/.test(id)) continue;
    const d = PD[id];
    if (d.kind === 'num') vals[id] = fromNorm(d, toNorm(d, P[id]) + gauss() * amount * 0.22);
    else if (d.kind === 'sel' && Math.random() < amount * 0.15) vals[id] = pick(d.opts)[0];
    else if (d.kind === 'bool' && Math.random() < amount * 0.06) vals[id] = !P[id];
  }
  if (LIVE_SRC.has(vals['kor.src']) && vals['kor.src'] !== P['kor.src']) vals['kor.src'] = P['kor.src'];
  UI.loading = true; loadValues(safeify(vals), true); UI.loading = false;
  UI.preset = null; markPresetCards();
  toast('Klang mutiert.', 4500, UNDO);
}
// A fresh random patch: every value drawn from the middle of its range, then made safe.
function dice() {
  remember();
  const vals = {};
  const r = (id, lo = 0.1, hi = 0.9) => { vals[id] = fromNorm(PD[id], rand(lo, hi)); };
  for (const id of PATCH_IDS) {
    const d = PD[id];
    if (mutSkip(id)) { vals[id] = P[id]; continue; }
    if (d.kind === 'num') r(id);
    else if (d.kind === 'sel') vals[id] = pick(d.opts)[0];
    else vals[id] = Math.random() < 0.5;
  }
  vals['v.eng'] = pick(ENG_OPTS)[0];
  vals['v.layer'] = Math.random() < 0.35 ? pick(ENG_OPTS)[0] : 'off';
  vals['t.root'] = String((Math.random() * 12) | 0);
  vals['t.scale'] = pick(Object.keys(SCALES).filter((k) => k !== 'chrom'));
  vals['kor.src'] = pick(PD['kor.src'].opts.map((o) => o[0]).filter((k) => !LIVE_SRC.has(k)));
  vals['flt.type'] = Math.random() < 0.7 ? 'lowpass' : pick(['bandpass', 'highpass', 'notch']);
  if (vals['flt.type'] === 'lowpass') vals['flt.freq'] = fromNorm(PD['flt.freq'], rand(0.6, 1));
  r('drv.mix', 0, 0.6); r('drv.amt', 0, 0.5); r('rng.mix', 0, 0.35); r('pha.mix', 0, 0.6); r('cho.mix', 0, 0.6);
  r('dly.mix', 0.1, 0.5); r('dly.fb', 0.1, 0.7); r('rev.mix', 0.2, 0.65); r('mov.vib', 0, 0.25); r('mov.drift', 0, 0.35);
  r('v.glide', 0, 0.4); r('v.human', 0, 0.5); r('v.width', 0.3, 1); r('seq.swing', 0, 0.4); vals['seq.bpm'] = Math.round(rand(60, 124));
  vals['v.strum'] = true; vals['bor.on'] = Math.random() < 0.3; vals['t.just'] = Math.random() < 0.25;
  const on = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 2 + ((Math.random() * 2) | 0));
  for (let i = 0; i < 4; i++) {
    const p = 'l' + i + '.';
    vals[p + 'on'] = on.includes(i);
    vals[p + 'steps'] = 5 + ((Math.random() * 12) | 0);
    vals[p + 'puls'] = 1 + ((Math.random() * Math.min(7, vals[p + 'steps'] - 1)) | 0);
    vals[p + 'oct'] = i === 0 ? -1 : pick([-1, 0, 0, 1]);
    r(p + 'vol', 0.35, 0.85); r(p + 'prob', 0.55, 1); r(p + 'pan', 0.2, 0.8);
  }
  UI.loading = true; loadValues(safeify(vals), true); UI.loading = false;
  UI.preset = null; markPresetCards();
  toast('Neuer Klang gewürfelt.', 4500, UNDO);
}

