// Rhizom's price, refit (final pass): a voice's cost = base while it lives + ping per ping ringing + start per ping struck
// in the last second (a short ping costs its start: the default Glimmen rings 1 s, recal.js's 4 s) – over four settings,
// each in the player's net and in nets of their own (Hexenring Nähren „eigen“): one ping long, a long cascade, the default,
// the default high. cost.js (two runs, the higher) and rhz-pings.js per setting and level; least squares, then every
// coefficient scaled so the highest run of every setting is covered + 15 %.
//   node rhz-fit.js [rounds]    → out/rhz-fit.json   (≈ 1 h, nothing else on the machine)
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const R = process.argv[2] || '6', REF = 'hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3', P = (o) => JSON.stringify(o);
const SET = [
  ['one', { NV: '24', Y: '0.6', DUR: '1.5', PARAMS: P({ 'rhz.reiz': 0, 'rhz.glimmen': 0.6 }) }, false],
  ['many', { NV: '4', Y: '1', DUR: '1.5', PARAMS: P({ 'rhz.reiz': 1, 'rhz.erholung': 0.1, 'rhz.glimmen': 0.6 }) }, true],
  ['def', { NV: '24', Y: '0.6', DUR: '3' }, true],
  ['defhi', { NV: '24', Y: '1', DUR: '3' }, true],
  ['short', { NV: '24', Y: '0.6', DUR: '3', PARAMS: P({ 'rhz.glimmen': 0.03 }) }, true],
].filter(([nm]) => !process.env.SETS || process.env.SETS.split(',').includes(nm));
const run = (f, a, env) => JSON.parse(execFileSync('node', [path.join(__dirname, f), a], { env: Object.assign({}, process.env, env), encoding: 'utf8', timeout: 3600000 }).trim().split('\n').pop());
const obs = { 1: [], 3: [] };
for (const [nm, env, own] of SET) {
  const engs = 'rhz1,rhz3,' + (own ? 'rhzo1,rhzo3,' : '') + REF, best = {};
  for (let rep = 0; rep < 2; rep++) { const c = run('cost.js', R, Object.assign({ ENGS: engs }, env)); for (const k of ['rhz1', 'rhz3', 'rhzo1', 'rhzo3']) if (c[k] != null) best[k] = Math.max(best[k] || 0, c[k] * c.scale); console.log(nm, 'run', rep + 1, JSON.stringify(c)); }
  for (const q of ['1', '3']) for (const o of own ? [false, true] : [false]) {
    const pg = run('rhz-pings.js', '3', Object.assign({ Q: q }, env, o ? { OWN: '1' } : {}));
    obs[q].push({ nm: nm + (o ? ' eigen' : ''), c: best[(o ? 'rhzo' : 'rhz') + q], live: pg.live, ring: pg.ringingPerVoice, st: pg.startsPerS });
    console.log(nm, o ? 'eigen' : 'geteilt', 'Q' + q, JSON.stringify(pg), 'cost', best[(o ? 'rhzo' : 'rhz') + q].toFixed(3));
  }
}
// least squares c = b·live + p·ring + s·st (3×3 normal equations), negatives dropped to 0 and refit
function fit(L) {
  const solve = (cols) => { const n = cols.length, A = cols.map((i) => cols.map((j) => L.reduce((s, o) => s + o.x[i] * o.x[j], 0))), y = cols.map((i) => L.reduce((s, o) => s + o.x[i] * o.c, 0));
    for (let i = 0; i < n; i++) { const p = A[i][i]; for (let j = i + 1; j < n; j++) { const f = A[j][i] / p; for (let k = i; k < n; k++) A[j][k] -= f * A[i][k]; y[j] -= f * y[i]; } }
    const x = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k]; x[i] = s / A[i][i]; } const w = [0, 0, 0]; cols.forEach((c, i) => { w[c] = x[i]; }); return w; };
  for (const o of L) o.x = [o.live, o.ring, o.st];
  let cols = [0, 1, 2], w = solve(cols);
  while (w.some((v, i) => cols.includes(i) && v < 0)) { cols = cols.filter((i) => w[i] >= 0); w = solve(cols); }
  const f = Math.max(1, ...L.map((o) => (1.15 * o.c) / (w[0] * o.live + w[1] * o.ring + w[2] * o.st)));
  return { base: +(w[0] * f).toFixed(2), ping: +(w[1] * f).toFixed(2), start: +(w[2] * f).toFixed(2), scaledBy: +f.toFixed(3), fit: w.map((v) => +v.toFixed(3)) };
}
const out = { obs, l1: fit(obs[1]), l3: fit(obs[3]) };
fs.writeFileSync(path.join(__dirname, 'out', 'rhz-fit.json'), JSON.stringify(out, null, 1));
console.log('RHZ_COST', JSON.stringify({ base: [out.l1.base, out.l3.base], ping: [out.l1.ping, out.l3.ping], start: [out.l1.start, out.l3.start] }), 'scaled', out.l1.scaledBy, out.l3.scaledBy);
for (const q of ['1', '3']) for (const o of obs[q]) { const F = out['l' + q]; console.log('Q' + q, o.nm, 'measured', o.c.toFixed(3), 'priced (time average)', (F.base * o.live + F.ping * o.ring + F.start * o.st).toFixed(3)); }
