// The final calibration (quiet machine): every new source's voice cost at level 1 and 3, in Nebel units scaled by the
// reference engines (as bench.js does), two runs each, the highest kept – every body, bridge, pipe and syllable, the
// native stand-ins, Gespinst's web (24 webs against 24 Nebel voices), Rhizom's base and per-ping share.
//   node recal.js [rounds]   → out/recal.json      (≈ 3 h; nothing else may run on the machine)
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const R = process.argv[2] || '6', REF = 'hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3';
const P = (o) => ({ PARAMS: JSON.stringify(o) });
// [key, env, name, the table entry it belongs to]
const C = [
  ['hlm', {}, 'hlm rohrblatt'], ['hlm', P({ 'hlm.rohr': 'floete' }), 'hlm floete'], ['hlm', P({ 'hlm.rohr': 'flamme' }), 'hlm flamme'],
  ['rnk', {}], ['elm', {}], ['boe', {}], ['amo', {}],
  ...['glas', 'schale', 'stab', 'zunge', 'teich'].map((b) => ['hrz', P({ 'hrz.koerper': b }), 'hrz ' + b, 'hrz']),
  ...['sommer', 'winter'].map((j) => ['jrg', Object.assign({ DUR: '2' }, P({ 'jrg.holz': 1, 'jrg.jahreszeit': j })), 'jrg ' + j, 'jrg']),
  ...['glocke', 'holz', 'knochen'].map((b) => ['mdr', Object.assign({ DUR: '4' }, P({ 'mdr.koerper': b })), 'mdr ' + b, 'mdr']),
  ['gsp', { DUR: '2' }, 'gsp voice', 'gsp', true],
  ...['flach', 'jawari'].map((b) => ['shn', P({ 'shn.steg': b }), 'shn ' + b, 'shn plucked']),
  ...['flach', 'jawari'].map((b) => ['shn', Object.assign({ Y: '0.9' }, P({ 'shn.steg': b })), 'shn ' + b + ' ebow', 'shn ebow']),
  ...['zapfen', 'holz', 'panzer', 'kuerbis', 'fels'].flatMap((b) => [['zpf', P({ 'zpf.koerper': b }), 'zpf ' + b, 'zpf worklet'], ['zpfN', P({ 'zpf.koerper': b }), 'zpf ' + b + ' native', 'zpf native']]),
  ['glt', {}, 'glt worklet'], ['gltN', {}, 'glt native'],
  ...['chip', 'triller'].map((x) => ['khl', P({ 'khl.silbe': x }), 'khl ' + x, 'khl']),
];
const cost = (engs, env) => JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), R], { env: Object.assign({}, process.env, { ENGS: engs }, env), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
const pings = (env) => JSON.parse(execFileSync('node', [path.join(__dirname, 'rhz-pings.js'), '2'], { env: Object.assign({}, process.env, env), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
const out = {}, push = (name, l1, l3) => { const o = out[name] || (out[name] = { l1: [], l3: [] }); o.l1.push(+l1.toFixed(3)); o.l3.push(+l3.toFixed(3)); };
for (const [k, env, name = k, entry = name, web] of C) {
  for (let rep = 0; rep < 2; rep++) {
    let c; try { c = cost(k + '1,' + k + '3,' + (web ? 'web1,web3,' : '') + REF, env); } catch (e) { console.log('ERR', name, String(e).slice(0, 200)); continue; }
    const nv = 24, l1 = (c[k + '1'] - (web ? c.web1 / nv : 0)) * c.scale, l3 = (c[k + '3'] - (web ? c.web3 / nv : 0)) * c.scale;   // (Gespinst's voices share one web: its 1/NV taken off)
    push(name, l1, l3); if (entry !== name) push(entry, l1, l3);
    console.log(name, 'run', rep + 1, 'L1', l1.toFixed(3), 'L3', l3.toFixed(3), 'scale', c.scale);
  }
}
// Gespinst's web: 24 of them against 24 Nebel voices (one web alone carries the worklet's fixed share of the render ×24)
for (let rep = 0; rep < 3; rep++) { const c = cost('web1,web3,' + REF, { NW: '24' }); push('gsp web', c.web1 * c.scale, c.web3 * c.scale); console.log('gsp web run', rep + 1, (c.web1 * c.scale).toFixed(3), (c.web3 * c.scale).toFixed(3)); }
// Rhizom: a voice with one ping (Reiz 0, a long Glimmen: alive the whole window) and one with many (Reiz 1, Erholung 0.1,
// four voices so the net is not exhausted) at the same NV – level 3's graph share cancels in the difference
// (superseded in the final pass by rhz-fit.js: five settings, both nets, a Glimmen term – RHZ_COST as entered now)
{ const ONE = { 'rhz.reiz': 0, 'rhz.glimmen': 0.6 }, MANY = { 'rhz.reiz': 1, 'rhz.erholung': 0.1, 'rhz.glimmen': 0.6 }, D = { DUR: '1.5' };
  const n = {}; for (const [nm, p, y] of [['one', ONE, '0.6'], ['many', MANY, '1']]) for (const q of ['1', '3']) n[nm + q] = pings(Object.assign({ NV: '4', Y: y, Q: q }, D, P(p))).ringingPerVoice;
  const sl = { l1: [], l3: [] };
  for (let rep = 0; rep < 2; rep++) {
    const one = cost('rhz1,rhz3,' + REF, Object.assign({}, D, P(ONE))); push('rhz one ping', one.rhz1 * one.scale, one.rhz3 * one.scale);
    const a = cost('rhz1,rhz3,' + REF, Object.assign({ NV: '4' }, D, P(ONE))), b = cost('rhz1,rhz3,' + REF, Object.assign({ NV: '4', Y: '1' }, D, P(MANY)));
    sl.l1.push((b.rhz1 * b.scale - a.rhz1 * a.scale) / (n.many1 - n.one1)); sl.l3.push((b.rhz3 * b.scale - a.rhz3 * a.scale) / (n.many3 - n.one3));
    console.log('rhz run', rep + 1, 'one ping', (one.rhz1 * one.scale).toFixed(3), (one.rhz3 * one.scale).toFixed(3), 'per ping', sl.l1[rep].toFixed(3), sl.l3[rep].toFixed(3));
  }
  const m = (a) => a.reduce((s, x) => s + x, 0) / a.length, o1 = Math.max(...out['rhz one ping'].l1) * 1.15, o3 = Math.max(...out['rhz one ping'].l3) * 1.15, p1 = m(sl.l1) * 1.15, p3 = m(sl.l3) * 1.15;
  out['rhz split'] = { pings: n, perPing: sl, entry: { VCOST: [+o1.toFixed(2), +o3.toFixed(2)], base: [+(o1 - p1).toFixed(2), +(o3 - p3).toFixed(2)], ping: [+p1.toFixed(2), +p3.toFixed(2)] } };
  console.log('RHZ_COST', JSON.stringify(out['rhz split'].entry)); }
fs.writeFileSync(path.join(__dirname, 'out', 'recal.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) if (v.l1) console.log('MAX', k, Math.max(...v.l1).toFixed(3), Math.max(...v.l3).toFixed(3), '→ +15 %', (1.15 * Math.max(...v.l1)).toFixed(2), (1.15 * Math.max(...v.l3)).toFixed(2));
