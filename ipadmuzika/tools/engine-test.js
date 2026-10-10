// Prüft die Klangmaschine: Pegel, NaN, Tonhöhen, Halten mit Mikrofon, Aufnahme, Rechenzeit.
// Aufruf: node tools/engine-test.js [--wav]
'use strict';
const path = require('path');
const { loadEngine, build, run, stats, db, writeWav } = require('./engine-harness.js');

const WAV = process.argv.includes('--wav');
const OUT = path.join(require('os').tmpdir(), 'sphaerenwerk-test');
if (WAV) require('fs').mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FEHL ') + msg); if (!ok) fails++; };

const DEFAULT_MODS = [
  { type: 'altar' }, { type: 'stimmen' }, { type: 'schlagwerk' }, { type: 'atem' }, { type: 'resonator' },
  { type: 'bandschleife' }, { type: 'kathedrale' }, { type: 'gezeiten' }, { type: 'planeten' }, { type: 'uhrwerk' },
];
const DEFAULT_CABLES = [
  ['stimmen.out', 'bandschleife.in'], ['schlagwerk.out', 'bandschleife.in'], ['atem.out', 'resonator.in'],
  ['resonator.out', 'kathedrale.in'], ['bandschleife.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
  ['gezeiten.I', 'stimmen.filter', 0.25], ['gezeiten.II', 'kathedrale.schimmer', 0.3],
  ['planeten.noten', 'stimmen.noten'], ['uhrwerk.I', 'schlagwerk.schlag'], ['uhrwerk.II', 'schlagwerk.schlag'], ['uhrwerk.III', 'schlagwerk.schlag'],
];

function hz2(sk, oct, step) { const n = sk.n, o = Math.floor(step / n), i = step - o * n; return sk.root0 * Math.pow(2, oct + o + sk.cents[i] / 1200); }

// Grundfrequenz per Autokorrelation (grob, für Prüfzwecke)
function f0(x, sr, from, len) {
  const lo = Math.floor(sr / 1000), hi = Math.ceil(sr / 50), rs = new Float64Array(hi + 2);
  let bv = -1;
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < len; i++) { const a = x[from + i], b = x[from + i + lag]; s += a * b; e1 += a * a; e2 += b * b; }
    rs[lag] = s / Math.sqrt(e1 * e2 + 1e-12);
    if (rs[lag] > bv) bv = rs[lag];
  }
  for (let lag = lo + 1; lag < hi; lag++) {
    if (rs[lag] >= 0.9 * bv && rs[lag] >= rs[lag - 1] && rs[lag] >= rs[lag + 1]) {
      const a = rs[lag - 1], b = rs[lag], c = rs[lag + 1], d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0;
      return sr / (lag + off);
    }
  }
  return 0;
}
// stärkste Spektrallinie zwischen lo und hi Hz (naive DFT, 1-Hz-Raster)
function peakHz(x, sr, from, len, lo, hi) {
  let best = 0, bm = -1;
  for (let f = lo; f <= hi; f += 1) {
    let re = 0, im = 0; const w = 2 * Math.PI * f / sr;
    for (let i = 0; i < len; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / len), v = x[from + i] * h; re += v * Math.cos(w * i); im += v * Math.sin(w * i); }
    const m = re * re + im * im; if (m > bm) { bm = m; best = f; }
  }
  return best;
}

console.log('1) Stimmen allein: Akkord, dann loslassen');
{
  const E = loadEngine();
  const { sk } = build(E, [{ type: 'altar' }, { type: 'stimmen' }], [['stimmen.out', 'altar.in']]);
  const notes = [hz2(sk, 3, 0), hz2(sk, 3, 2), hz2(sk, 3, 4)];
  notes.forEach((hz, i) => E.send({ t: 'on', n: i + 1, hz, y: 0.5, v: 0.8 }));
  const a = run(E, 2.0);
  notes.forEach((hz, i) => E.send({ t: 'off', n: i + 1 }));
  const b = run(E, 4.0);
  const sa = stats(a.L), sb = stats(b.L.subarray(b.L.length - 4800));
  console.log(`   Spitze ${db(sa.peak)} dB, RMS ${db(sa.rms)} dB, Rest nach Ausklang ${db(sb.rms)} dB, Block ${a.avgMs.toFixed(3)} ms (max ${a.maxMs.toFixed(3)})`);
  check(sa.nan === 0 && sa.peak > 0.05 && sa.peak < 1, 'hörbar, ohne NaN, unter 0 dBFS');
  check(sb.rms < 0.002, 'klingt nach dem Loslassen aus');
  const E2 = loadEngine();
  build(E2, [{ type: 'altar' }, { type: 'stimmen', vals: { drift: 0, schwebung: 0, form: 0, glanz: 0 } }], [['stimmen.out', 'altar.in']]);
  E2.send({ t: 'on', n: 1, hz: 220, y: 0.5, v: 0.8 });
  const c = run(E2, 1.0);
  const fe = f0(c.L, 48000, 30000, 4000);
  console.log(`   Grundton gemessen ${fe.toFixed(1)} Hz (soll 220)`);
  check(Math.abs(fe - 220) < 2, 'Tonhöhe stimmt');
  if (WAV) writeWav(path.join(OUT, '1-stimmen.wav'), Float32Array.from([...a.L, ...b.L]), Float32Array.from([...a.R, ...b.R]), 48000);
}

console.log('2) Schlagwerk: alle Materialien');
{
  for (let mat = 0; mat < 8; mat++) {
    const E = loadEngine();
    build(E, [{ type: 'altar' }, { type: 'schlagwerk', vals: { material: mat, zufall: 0, lage: 0 } }], [['schlagwerk.out', 'altar.in']]);
    E.send({ t: 'trig', id: 2, port: 0, hz: 330, vel: 0.9, dur: 1 });
    const a = run(E, 3);
    const s = stats(a.L);
    const pk = mat === 6 ? 0 : peakHz(a.L, 48000, mat === 5 ? 12000 : 1200, 9600, 100, 1200);
    console.log(`   Material ${mat}: Spitze ${db(s.peak)} dB${pk ? ', stärkste Linie ' + pk + ' Hz' : ''}`);
    if (pk && mat !== 3) check(Math.abs(pk - 330) < 4, `Material ${mat} steht auf dem angeschlagenen Ton (330 Hz)`);
    check(s.nan === 0 && s.peak > 0.02 && s.peak < 1.0, `Material ${mat} klingt im Rahmen`);
    if (WAV) writeWav(path.join(OUT, `2-schlag-${mat}.wav`), a.L, a.R, 48000);
  }
}

console.log('3) Kathedrale: Nachhall und Ewigkeit');
{
  const E = loadEngine();
  build(E, [{ type: 'altar' }, { type: 'schlagwerk', vals: { material: 1, schichtung: 0 } }, { type: 'kathedrale', vals: { mischung: 1, schimmer: 0.4 } }],
    [['schlagwerk.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in']]);
  E.send({ t: 'trig', id: 2, port: 0, hz: 440, vel: 0.9, dur: 1 });
  const a = run(E, 1.0);
  E.send({ t: 'p', id: 3, k: 'ewigkeit', v: 1 });
  const b = run(E, 6.0);
  const late1 = stats(b.L.subarray(48000 * 2, 48000 * 3)), late2 = stats(b.L.subarray(48000 * 5, 48000 * 6));
  console.log(`   eingefroren: Sekunde 3 ${db(late1.rms)} dB, Sekunde 6 ${db(late2.rms)} dB`);
  check(late2.rms > 0.003 && late2.rms > late1.rms * 0.5 && stats(b.L).nan === 0, 'Ewigkeit hält den Raum stehend');
  E.send({ t: 'p', id: 3, k: 'ewigkeit', v: 0 });
  const c = run(E, 12.0);
  const tail = stats(c.L.subarray(c.L.length - 48000));
  console.log(`   nach dem Lösen, letzte Sekunde ${db(tail.rms)} dB`);
  check(tail.rms < late2.rms * 0.1, 'klingt nach dem Lösen aus');
  if (WAV) writeWav(path.join(OUT, '3-kathedrale.wav'), Float32Array.from([...a.L, ...b.L, ...c.L]), Float32Array.from([...a.R, ...b.R, ...c.R]), 48000);
}

console.log('4) Atem: gesungener Ton, Halten fängt ihn ein');
{
  const E = loadEngine();
  const { sk } = build(E, [{ type: 'altar' }, { type: 'atem', vals: { direkt: 0.5, einstimmen: 1 } }], [['atem.out', 'altar.in']], { mode: 'dur', root: 0 });
  E.send({ t: 'mic', on: true });
  E.send({ t: 'hold', on: true });
  const sr = 48000;
  // „Stimme“: 207 Hz (zwischen Gis und A), Obertöne, leichtes Vibrato, Einsatz nach 0,3 s, Ende nach 2,2 s
  let ph = 0;
  const voice = (t) => {
    const s = t / sr;
    if (s < 0.3 || s > 2.2) return (Math.random() - 0.5) * 0.0005;
    const f = 207 * Math.pow(2, Math.sin(TAU * 5 * s) * 0.15 / 12);
    ph += f / sr;
    const env = Math.min(1, (s - 0.3) * 20) * Math.min(1, (2.2 - s) * 20);
    return 0.05 * env * (Math.sin(TAU * ph) + 0.5 * Math.sin(2 * TAU * ph) + 0.25 * Math.sin(3 * TAU * ph) + 0.12 * Math.sin(4 * TAU * ph));
  };
  const TAU = Math.PI * 2;
  const a = run(E, 4.0, { mic: voice });
  const adds = E.posted.filter((m) => m.t === 'lyr+');
  console.log(`   eingefangene Schichten: ${adds.length}`, adds.map((m) => `f0 ${m.f0.toFixed(1)} Hz → ${m.hz.toFixed(1)} Hz`).join('; '));
  check(adds.length === 1, 'genau eine Schicht');
  check(adds.length && Math.abs(adds[0].f0 - 207) < 4, 'Tonhöhe erkannt');
  const target = 207.65; // Gis3 liegt nicht in C-Dur → nächster Ton ist A3 (220) oder G3 (196)
  const nearest = [196, 220].reduce((p, c) => (Math.abs(Math.log(c / 207)) < Math.abs(Math.log(p / 207)) ? c : p));
  check(adds.length && Math.abs(adds[0].hz - nearest) < 1.5, `auf die Tonleiter gestimmt (${nearest} Hz)`);
  const tail = stats(a.L.subarray(sr * 3, sr * 4));
  const fe = f0(a.L, sr, sr * 3, 4000);
  console.log(`   nach dem Singen: ${db(tail.rms)} dB, Grundton ${fe.toFixed(1)} Hz`);
  check(tail.rms > 0.01, 'die Schicht klingt weiter, nachdem die Stimme verstummt ist');
  check(Math.abs(fe - nearest) < 4 || Math.abs(fe - nearest / 2) < 3, 'die gehaltene Schicht steht auf dem Rasterton');
  E.send({ t: 'hold', on: false });
  const b = run(E, 3.0);
  const gone = E.posted.filter((m) => m.t === 'lyr-').length;
  check(gone === 1 && stats(b.L.subarray(b.L.length - 4800)).rms < 0.001, 'Halten aus löst die Schicht');
  if (WAV) writeWav(path.join(OUT, '4-atem.wav'), Float32Array.from([...a.L, ...b.L]), Float32Array.from([...a.R, ...b.R]), sr);
}

console.log('5) Aufnahme: 1 Takt Einzähler, 2 Takte bei 120 BPM, 1 Takt Nachklang');
{
  const E = loadEngine();
  build(E, [{ type: 'altar' }, { type: 'stimmen' }], [['stimmen.out', 'altar.in']], { bpm: 120 });
  E.send({ t: 'on', n: 1, hz: 220, y: 0.5, v: 0.8 });
  run(E, 0.5);
  E.send({ t: 'rec', op: 'arm', bars: 2, countIn: 1, tail: 4, click: 1 });
  run(E, 8.5);
  const chunks = E.posted.filter((m) => m.t === 'rec');
  const total = chunks.reduce((s, m) => s + m.l.length, 0);
  const done = E.posted.find((m) => m.t === 'recDone');
  console.log(`   Blöcke ${chunks.length}, Samples ${total}, Schleife ${done && done.loop}, gesamt ${done && done.total}`);
  check(done && done.loop === 4 * 48000, 'Schleife ist genau 2 Takte lang (4 s)');
  check(done && done.total === 6 * 48000 && total === done.total, 'Nachklang genau 1 Takt, alle Samples angekommen');
}

console.log('6) Uhrwerk: Schläge über 4 Takte');
{
  const E = loadEngine();
  build(E, [{ type: 'altar' }, { type: 'uhrwerk' }, { type: 'schlagwerk', vals: { schichtung: 0 } }],
    [['uhrwerk.I', 'schlagwerk.schlag'], ['schlagwerk.out', 'altar.in']], { bpm: 120 });
  E.send({ t: 'p', id: 2, k: 'lauf', v: 1 });
  E.send({ t: 'p', id: 2, k: 'r1p', v: 1 });
  let hits = 0;
  run(E, 8.0, { onBlock: () => { const v = E.posted.filter((m) => m.t === 'vis').pop(); } });
  for (const m of E.posted) if (m.t === 'vis') hits += countHits(m.d);
  console.log(`   Schläge gemeldet: ${hits} (Ring I: 4 von 16 je Takt → 16 in 4 Takten)`);
  check(Math.abs(hits - 16) <= 1, 'euklidischer Ring I schlägt richtig');
}

function countHits(d) {
  const nv = d[12]; return d[13 + nv * 4];
}

console.log('7) Volle Maschine: Rechenzeit');
{
  const E = loadEngine();
  const { sk } = build(E, DEFAULT_MODS.concat([{ type: 'nebel' }, { type: 'spiegel' }]), DEFAULT_CABLES.concat([
    ['nebel.out', 'kathedrale.in'], ['atem.out', 'spiegel.in'], ['spiegel.out', 'bandschleife.in'],
  ]));
  E.send({ t: 'quality', q: 2 });
  E.send({ t: 'mic', on: true });
  E.send({ t: 'hold', on: true });
  E.send({ t: 'p', id: 9, k: 'lauf', v: 1 });
  E.send({ t: 'p', id: 10, k: 'lauf', v: 1 });
  for (let i = 0; i < 10; i++) E.send({ t: 'on', n: 100 + i, hz: hz2(sk, 3, i), y: Math.random(), v: 0.7 });
  let ph = 0;
  const TAU = Math.PI * 2, sr = 48000;
  const voice = (t) => { const s = t / sr; const f = 180 * Math.pow(2, Math.floor(s / 0.7) % 5 / 12); ph += f / sr; return 0.06 * Math.sin(TAU * ph) + 0.03 * Math.sin(2 * TAU * ph); };
  const a = run(E, 8.0, { mic: voice });
  const s = stats(a.L);
  const lay = E.posted.filter((m) => m.t === 'lyr+').length;
  console.log(`   Spitze ${db(s.peak)} dB, NaN ${s.nan}, Schichten ${lay}`);
  console.log(`   Rechenzeit pro Block: ${a.avgMs.toFixed(3)} ms im Mittel, ${a.maxMs.toFixed(3)} ms höchstens (Block dauert ${a.blockMs.toFixed(2)} ms)`);
  check(s.nan === 0 && s.peak < 1.0, 'kein NaN, nichts übersteuert');
  check(a.avgMs < a.blockMs * 0.25, 'im Mittel unter 25 % eines Blocks (Node auf diesem Rechner)');
  const errs = E.posted.filter((m) => m.t === 'err');
  check(errs.length === 0, 'keine Fehler gemeldet' + (errs.length ? ': ' + errs[0].msg : ''));
  if (WAV) writeWav(path.join(OUT, '7-voll.wav'), a.L, a.R, 48000);
}

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
