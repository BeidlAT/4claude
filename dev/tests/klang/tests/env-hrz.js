const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
const [body, f, y] = [process.argv[2], +process.argv[3], +process.argv[4]];
for (const v of process.argv.slice(5).length ? process.argv.slice(5) : ['']) {
  let src = base; for (const rep of v.split(';').filter(Boolean)) { const [, a, b] = rep.split('|'); if (!src.includes(a)) { console.log('!! ' + a); process.exit(1); } src = src.split(a).join(b); }
  const D = L.loadDsp(SR, src);
  const r = L.render(D, { name: 'myzel-bow', po: { prm: Object.assign({ koerper: body }, JSON.parse(process.env.PRM || '{}')), seed: 3 }, dur: 2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 1234 }]] });
  console.log((v || 'as is') + ': ' + L.env(r.L, SR, 0.05).map((x) => L.db(x).toFixed(0)).join(' '));
}
