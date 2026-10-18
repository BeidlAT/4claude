// Zapfen (myzel-scrape) prototype measurements in Node: level, pitch at the top, ticks low, sideband floor, cost.
//   node proto-zpf.js [body ...]      env: RICH=1, Y=…, F=…, PRM='{"rast":0.7}'
const L = require('./dsplib');
const Z = require('./zpflib');
const SR = 48000;
let src = L.dspSource();
for (const rep of (process.env.SUB || '').split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
const D = L.loadDsp(SR, src);
const bodies = process.argv.slice(2).length ? process.argv.slice(2) : ['zapfen', 'holz', 'panzer', 'kuerbis', 'fels'];
const rich = process.env.RICH === '1';
const note = (body, f, y, o = {}) => L.render(D, { name: 'myzel-scrape', po: { rich, prm: Object.assign({ koerper: body }, JSON.parse(process.env.PRM || '{}'), o.prm || {}), seed: 3 }, ch: rich ? 2 : 1, dur: o.dur || 2, params: o.params || { freq: f, hoehe: y },
  msgs: [[0.05, { on: 0.05, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []) });
const mono = (r) => { if (!r.R) return r.L; const m = new Float32Array(r.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (r.L[i] + r.R[i]); return m; };
const fs = (process.env.F || '110,220,440,880').split(',').map(Number), ys = (process.env.Y || '0,0.2,0.5,0.8,1').split(',').map(Number);
for (const body of bodies) {
  console.log('\n== ' + body + (rich ? ' (L3)' : ' (L1)'));
  for (const f of fs) for (const y of ys) {
    const r = note(body, f, y, { dur: 2.2 }), m = mono(r);
    const rms = L.rms(m, 0.5 * SR, 2.1 * SR), pk = L.peak(m.subarray(0.1 * SR));
    const ticks = Z.ticks(m, SR, 0.3, 2.1);
    let extra = '';
    if (y >= 0.99) { const fm = Z.peakHz(m, SR, f, 1.0, 32768); extra = ` f0 ${L.cents(fm, f).toFixed(2)} ct  floor ${Z.floor(m, SR, f, 1.0).toFixed(1)} dB`; }
    console.log(`f ${String(f).padStart(4)} y ${y.toFixed(2)}: rms ${L.db(rms).toFixed(1).padStart(6)} dB  pk ${L.db(pk).toFixed(1).padStart(6)}  ticks/s ${ticks.toFixed(1).padStart(6)}  centroid ${Math.round(L.centroid(m, SR, 1.0, 8192)).toString().padStart(5)}${extra}  ${r.nsPerSample.toFixed(0)} ns/smp${L.nanCount(m) ? ' NaN!' : ''}`);
  }
}
