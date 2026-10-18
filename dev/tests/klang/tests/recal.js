// The final calibration (quiet machine): every new source's voice cost at level 1 and 3, in Nebel units scaled by the
// reference engines (as bench.js does), two runs each, the highest kept.   node recal.js [rounds]   → recal.json
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const R = process.argv[2] || '6', REF = 'hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3';
const C = [
  ['hlm', {}, 'hlm rohrblatt'], ['hlm', { PARAMS: '{"hlm.rohr":"floete"}' }, 'hlm floete'], ['hlm', { PARAMS: '{"hlm.rohr":"flamme"}' }, 'hlm flamme'],
  ['rnk', {}], ['hrz', {}], ['elm', {}], ['jrg', { DUR: '2', PARAMS: '{"jrg.holz":1,"jrg.jahreszeit":"sommer"}' }],
  ['mdr', { DUR: '4' }], ['boe', {}], ['amo', {}], ['gsp', { DUR: '2' }, 'gsp voice', true], ['shn', {}, 'shn plucked'], ['shn', { Y: '0.9' }, 'shn ebow'],
  ['zpf', {}, 'zpf worklet'], ['zpfN', {}, 'zpf native'], ['glt', {}, 'glt worklet'], ['gltN', {}, 'glt native'], ['khl', {}], ['rhz', { DUR: '3' }],
];
const out = {};
for (const [k, env, name, web] of C) {
  for (let rep = 0; rep < 2; rep++) {
    let c; try { c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), R], { env: Object.assign({}, process.env, { ENGS: k + '1,' + k + '3,' + (web ? 'web1,web3,' : '') + REF }, env), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop()); }
    catch (e) { console.log('ERR', name || k, String(e).slice(0, 200)); continue; }
    const nv = 24, l1 = (c[k + '1'] - (web ? c.web1 / nv : 0)) * c.scale, l3 = (c[k + '3'] - (web ? c.web3 / nv : 0)) * c.scale;
    const o = out[name || k] || (out[name || k] = { l1: [], l3: [] }); o.l1.push(+l1.toFixed(3)); o.l3.push(+l3.toFixed(3));
    if (web) { const w = out['gsp web'] || (out['gsp web'] = { l1: [], l3: [] }); w.l1.push(+(c.web1 * c.scale).toFixed(3)); w.l3.push(+(c.web3 * c.scale).toFixed(3)); }
    console.log(name || k, 'run', rep + 1, 'L1', l1.toFixed(3), 'L3', l3.toFixed(3), 'scale', c.scale);
  }
}
fs.writeFileSync(path.join(__dirname, 'out', 'recal.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log('MAX', k, Math.max(...v.l1).toFixed(3), Math.max(...v.l3).toFixed(3), '→ +15 %', (1.15 * Math.max(...v.l1)).toFixed(2), (1.15 * Math.max(...v.l3)).toFixed(2));
