// (review 30.10.2026) which MIDI port names count as an audio interface (midi.js MIDI_IFACE minus MIDI_CTRL): the makers'
// interfaces as a whole brand, their controllers of the same name not. Reads the source – no browser.
//                                                                             node t-iface-namen.js [path to myzel/src]
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(process.argv[2] || path.join(__dirname, '../../../myzel/src'), 'js/midi/midi.js'), 'utf8');
const re = (name) => eval(src.match(new RegExp('const ' + name + ' = (\\/.*\\/i);'))[1]);
const IF = re('MIDI_IFACE'), CT = re('MIDI_CTRL'), iface = (n) => IF.test(n) && !CT.test(n);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
const yes = ['Steinberg UR22C-1', 'Yamaha Steinberg USB MIDI', 'UR22mkII MIDI', 'Steinberg UR-RT2', 'TASCAM US-144MKII', 'TASCAM US-122MKII', 'TASCAM US-122L', 'TASCAM US-1800', 'TASCAM US-2x2', 'MIDIIN2 (TASCAM US-144MKII)', 'PreSonus FireBox', 'PreSonus AudioBox USB 96', 'PreSonus Studio 24c', 'Focusrite Scarlett 2i2', 'MOTU M4', 'Roland UM-ONE'];
const no = ['PreSonus ATOM', 'PreSonus ATOM SQ', 'PreSonus FaderPort', 'PreSonus FP2', 'PreSonus ioStation 24c', 'Steinberg CMC-QC', 'Steinberg CC121', 'Steinberg CI2+', 'TASCAM US-2400', 'Edirol PCR-M50', 'Arturia KeyLab Essential 49', 'nanoKONTROL2'];
const y = yes.filter((n) => !iface(n)), n = no.filter((x) => iface(x));
ok(!y.length, `interfaces count as interfaces (${yes.length})` + (y.length ? ': missed ' + y.join(', ') : ''));
ok(!n.length, `controllers and keyboards do not (${no.length})` + (n.length ? ': wrongly ' + n.join(', ') : ''));
process.exit(bad ? 1 : 0);
