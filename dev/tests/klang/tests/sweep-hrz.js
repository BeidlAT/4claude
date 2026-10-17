// Harz: try variants of the processor's constants (by replacing them in the source) on a few notes.
//   node sweep-hrz.js body 'name|from|to;name2|from|to' ...   (each arg after the body = one variant; '' = as is)
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
const body = process.argv[2], variants = process.argv.slice(3);
const rich = process.env.RICH === '1';
const fs = (process.env.F || '110,220,440,880').split(',').map(Number), ys = (process.env.Y || '0,0.45,0.8').split(',').map(Number);
for (const v of variants.length ? variants : ['']) {
  let src = base;
  for (const rep of v.split(';').filter(Boolean)) { const [, from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src);
  const B = { glas: [1, 2.32], schale: [1, 2.986], stab: [1, 2.756], zunge: [1, 6.27], teich: [1, 6.27] }[body];
  const rows = [];
  for (const f of fs) for (const y of ys) {
    const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: Object.assign({ koerper: body }, JSON.parse(process.env.PRM || '{}')), seed: 3 }, ch: rich ? 2 : 1, dur: 2.2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 1234 }]] });
    const m = r.R ? r.L.map((x, i) => 0.5 * (x + r.R[i])) : r.L;
    const chan = r.R ? 10 * Math.log10((Math.pow(L.rms(r.L, 1.4 * SR, 2.1 * SR), 2) + Math.pow(L.rms(r.R, 1.4 * SR, 2.1 * SR), 2)) / 2 + 1e-20) : L.db(L.rms(r.L, 1.4 * SR, 2.1 * SR)) - 3.01;
    const held = L.rms(m, 1.4 * SR, 2.1 * SR), t90 = L.t90(m, SR, 0.05, held), sp = L.spectrum(m, SR, 1.2, 32768);
    const env = L.env(m, SR, 0.1).slice(12, 21).map(L.db), wob = Math.max(...env) - Math.min(...env);
    rows.push(`${f}/${y}: ch ${chan.toFixed(1)} dB t90 ${(t90 * 1000).toFixed(0)} m2 ${(L.harm(sp, f * B[1], 1) - L.harm(sp, f, 1)).toFixed(0)} f0 ${L.cents(L.combPitch(m, SR, f, 1.2, 32768, 1), f).toFixed(1)} wob ${wob.toFixed(1)}`);
  }
  console.log('\n## ' + (v || 'as is'));
  console.log(rows.join('\n'));
}
