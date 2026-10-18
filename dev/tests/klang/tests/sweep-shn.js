// Sehne: variants of the processor's constants (by replacing them in the source) on a measurement.
//   node sweep-shn.js <measure> 'from=>to;;from2=>to2' ...      measure: ebow | jawari | flag | palm
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
const what = process.argv[2], variants = process.argv.slice(3);
const PRM = JSON.parse(process.env.PRM || '{}');
const pw = (x, a, b) => { const r = L.rms(x, Math.round(a * SR), Math.round(b * SR)); return r * r; };
const db = (p) => (10 * Math.log10(p + 1e-30)).toFixed(1);
const gz = (x, a, b, fq) => { a = Math.round(a); b = Math.round(b); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return 2 * Math.hypot(re, im) / Math.max(1, b - a); };
for (const v of variants.length ? variants : ['']) {
  let src = base;
  for (const rep of v.split(';;').filter(Boolean)) { const [from, to] = rep.split('=>'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src);
  const R = (f, y, o = {}) => L.render(D, { name: 'myzel-string', po: { seed: o.s || 1, rich: !!o.rich, prm: Object.assign({}, PRM, o.prm || {}) }, ch: o.rich ? 2 : 1, dur: o.dur || 4.2, params: o.params || { freq: f, hoehe: y }, msgs: [[0.0, { on: 0.0, f, y, vel: o.vel || 0.75, seed: 100 + (o.s || 1) }]].concat(o.off ? [[o.off, { off: o.off }]] : []) });
  const rows = [];
  if (what === 'ebow') {
    for (const f of [110, 220, 880]) for (const y of [0.88, 0.92, 1]) {
      const r = R(f, y, { dur: 5.2, off: 4.5 }); const t = [0.05, 0.3, 0.6, 1, 1.5, 2, 3, 4.3, 4.6, 4.9].map((t) => db(pw(r.L, t, t + 0.1)));
      const sp = L.spectrum(r.L, SR, 3.5, 16384);
      rows.push(`${f}/${y}: ${t.join(' ')}  h1..5 ${[1, 2, 3, 4, 5].map((h) => L.harm(sp, f, h).toFixed(0)).join(' ')}`);
    }
  } else if (what === 'jawari') {
    for (const f of (process.env.F || '110,220,440').split(',').map(Number)) {
      const cs = [], lv = [];
      for (const steg of ['flach', 'jawari']) {
        let acc = null;
        for (let s = 1; s <= 3; s++) { const r = R(f, 0.5, { s, dur: 3.2, prm: { steg } }); const c = [0.03, 0.1, 0.2, 0.35, 0.5, 0.75, 1, 1.5, 2, 2.5].map((t) => L.centroid(r.L, SR, t, 2048)); acc = acc ? acc.map((x, i) => x + c[i]) : c; if (s === 1) lv.push([0.05, 0.5, 1, 2].map((t) => db(pw(r.L, t, t + 0.1))).join(' ')); }
        cs.push(steg + ' ' + acc.map((x) => Math.round(x / 3)).join(' '));
      }
      rows.push(`${f}: ${cs.join('  |  ')}   lvl flach/jawari ${lv.join(' / ')}`);
    }
  } else if (what === 'flag') {
    for (const f of [110, 220, 440]) { const o = []; for (const y of [0.5, 0.74, 0.79, 0.83]) { let a = 0; for (let s = 1; s <= 4; s++) { const r = R(f, y, { s, dur: 0.5 }); a += pw(r.L, 0.05, 0.45); } o.push(db(a / 4)); } rows.push(`${f}: open ${o[0]}  ½ ${o[1]}  ⅓ ${o[2]}  ¼ ${o[3]}`); }
  }
  console.log('\n## ' + (v || 'as is')); console.log(rows.join('\n'));
}
