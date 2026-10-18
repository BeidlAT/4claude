// Harz (myzel-bow) prototype measurements in Node: onset, pitch, level, mode balance per body / pitch / height.
//   node proto-hrz.js [body ...]      env: RICH=1, Y=…, F=…, PRM='{"druck":0.5}'
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const bodies = process.argv.slice(2).length ? process.argv.slice(2) : ['glas', 'schale', 'stab', 'zunge', 'teich'];
const rich = process.env.RICH === '1';
const note = (body, f, y, o = {}) => L.render(D, { name: 'myzel-bow', po: { rich, prm: Object.assign({ koerper: body }, JSON.parse(process.env.PRM || '{}'), o.prm || {}), seed: 3 }, ch: rich ? 2 : 1, dur: o.dur || 2, params: o.params || { freq: f, hoehe: y },
  msgs: [[0.05, { on: 0.05, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []) });
const mono = (r) => { if (!r.R) return r.L; const m = new Float32Array(r.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (r.L[i] + r.R[i]); return m; };
const fs = (process.env.F || '110,220,440,880,1568').split(',').map(Number), ys = (process.env.Y || '0,0.45,0.8,1').split(',').map(Number);
for (const body of bodies) {
  console.log('\n== ' + body + (rich ? ' (L3)' : ' (L1)'));
  const B = { glas: [1, 2.32, 4.25], schale: [1, 2.986, 5.704], stab: [1, 2.756, 5.404], zunge: [1, 6.27, 17.55], teich: [1, 6.27, 17.55] }[body];
  for (const f of fs) for (const y of ys) {
    const r = note(body, f, y, { dur: 2.2 }), m = mono(r);
    const held = L.rms(m, 1.4 * SR, 2.1 * SR), t90 = L.t90(m, SR, 0.05, held);
    const fm = L.combPitch(m, SR, f, 1.2, 32768, 1);
    const sp = L.spectrum(m, SR, 1.2, 32768);
    const m1 = L.harm(sp, f, 1), m2 = L.harm(sp, f * B[1], 1), h2 = L.harm(sp, f, 2), h3 = L.harm(sp, f, 3);
    console.log(`f ${String(f).padStart(4)} y ${y.toFixed(2)}: rms ${L.db(held).toFixed(1).padStart(6)} dB  pk ${L.db(L.peak(m)).toFixed(1).padStart(6)}  t90 ${(t90 * 1000).toFixed(0).padStart(5)} ms  f0 ${L.cents(fm, f).toFixed(1).padStart(6)} ct  m2 ${(m2 - m1).toFixed(1).padStart(6)}  h2 ${(h2 - m1).toFixed(1).padStart(6)}  h3 ${(h3 - m1).toFixed(1).padStart(6)}  ${(r.nsPerSample).toFixed(0)} ns/smp${L.nanCount(m) ? ' NaN!' : ''}`);
  }
}
