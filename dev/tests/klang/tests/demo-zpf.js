// Zapfen demos in Node (the processor alone): a held y-sweep 0 → 1 → 0 per body, the top tone's harmonics, a stroke.
//   node demo-zpf.js [body ...]   env: F=220, RICH=1, SUB='from|to;…', OUT=dir
const L = require('./dsplib');
const fs = require('fs'), path = require('path');
const SR = 48000;
let src = L.dspSource();
for (const rep of (process.env.SUB || '').split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
const D = L.loadDsp(SR, src);
const OUT = process.env.OUT || path.join(__dirname, '..', 'demo');
fs.mkdirSync(OUT, { recursive: true });
const bodies = process.argv.slice(2).length ? process.argv.slice(2) : ['zapfen', 'holz', 'panzer', 'kuerbis', 'fels'];
const rich = process.env.RICH === '1', F = +(process.env.F || 220);
const PRM = JSON.parse(process.env.PRM || '{}');
for (const body of bodies) {
  const prm = Object.assign({ koerper: body }, PRM);
  // the sweep: 0 → 1 over 5 s, hold 1 s, 1 → 0 over 3 s, let go at 9.5 s
  const sw = L.render(D, { name: 'myzel-scrape', po: { rich, prm, seed: 3 }, ch: rich ? 2 : 1, dur: 10.5, params: (t) => ({ freq: F, hoehe: t < 0.3 ? 0 : t < 5.3 ? (t - 0.3) / 5 : t < 6.3 ? 1 : t < 9.3 ? 1 - (t - 6.3) / 3 : 0 }), msgs: [[0.05, { on: 0.05, f: F, y: 0, vel: 0.75, seed: 77 }], [9.5, { off: 9.5 }]] });
  const fn = path.join(OUT, `sweep-${body}-${F}${rich ? '-L3' : ''}.wav`);
  L.wav(fn, sw.L, sw.R || sw.L, SR); L.spectro(fn);
  // the top: harmonic levels re the fundamental
  const top = L.render(D, { name: 'myzel-scrape', po: { rich, prm, seed: 3 }, ch: 1, dur: 2, params: { freq: F, hoehe: 1 }, msgs: [[0.05, { on: 0.05, f: F, y: 1, vel: 0.75, seed: 77 }]] });
  const sp = L.spectrum(top.L, SR, 1.0, 16384), h1 = L.harm(sp, F, 1), hs = [];
  for (let k = 2; k <= 16; k++) hs.push((L.harm(sp, F, k) - h1).toFixed(0));
  const env = L.env(sw.L, SR, 0.25).map((v) => L.db(v).toFixed(0));
  console.log(`${body} ${F} Hz: top h2…h16 re h1: ${hs.join(' ')}   sweep RMS per 0.25 s: ${env.join(' ')}`);
  // a stroke of 0.112 s and one of 0.5 s at y 0.6
  for (const g of [0.112, 0.5]) {
    const st = L.render(D, { name: 'myzel-scrape', po: { rich, prm, seed: 3 }, ch: 1, dur: 1.2, params: { freq: F, hoehe: 0.6 }, msgs: [[0.05, { on: 0.05, f: F, y: 0.6, vel: 0.75, burst: true, gate: g, seed: 77 }]] });
    const f2 = path.join(OUT, `stroke-${body}-${g}.wav`); L.wav(f2, st.L, st.L, SR);
  }
}
