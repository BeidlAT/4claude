// which of t-dsp's 40 random string configurations do not end (same generator, same order)
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const R = (o) => L.render(D, o);
const note = (name, f, y, o = {}) => R({ name, po: Object.assign({ rich: !!o.rich, prm: o.prm, seed: 5 }, o.po), ch: o.rich ? 2 : 1, dur: o.dur || 1.2, params: o.params || { freq: f, hoehe: y },
  msgs: (o.on === false ? [] : [[o.at || 0, { on: o.at || 0, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]]).concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });
let x = 99; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
// replay the generator through the three processors before (they draw from the same rnd)
for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-string']) {
  const keys = name === 'myzel-blow' ? ['atem', 'mund', 'blatt', 'luft', 'zunge'] : name === 'myzel-bow' ? ['druck', 'bogen', 'daempfung', 'schwebung', 'harz'] : name === 'myzel-string' ? ['daempfung', 'steifheit', 'zupfort', 'hand', 'ebow'] : ['masse', 'feder', 'mitte', 'daempfung', 'hammer', 'holz'];
  for (let i = 0; i < 40; i++) {
    const prm = {}; for (const k of keys) prm[k] = i < 4 ? [0, 1, 0, 1][i] : rnd() < 0.3 ? Math.round(rnd()) : rnd();
    if (name === 'myzel-bow') prm.koerper = ['glas', 'schale', 'stab', 'zunge', 'teich'][i % 5];
    if (name === 'myzel-blow') prm.rohr = ['rohrblatt', 'floete', 'flamme'][i % 3];
    if (name === 'myzel-string') { prm.steg = (i >> 1) % 2 ? 'jawari' : 'flach'; prm.daempfung = 0.3 * Math.pow(8 / 0.3, prm.daempfung); prm.zupfort = 0.05 + 0.45 * prm.zupfort; }
    const f = [16, 30, 55, 220, 1000, 3000, 8000][i % 7] * (0.9 + 0.2 * rnd()), y = i % 5 === 0 ? 1 : i % 5 === 1 ? 0 : rnd(), rich = i % 2 === 1, burst = i % 3 === 0;
    const gate = burst ? 0.02 + rnd() : 0, vel = rnd();
    if (name !== 'myzel-string') continue;
    const r = note(name, f, y, { prm, rich, burst, gate, off: burst ? null : 1.0, dur: 4, vel });
    if (r.alive) { const e = L.env(r.L, SR, 0.25).map((v) => L.db(v).toFixed(0)); console.log(`#${i} f ${f.toFixed(1)} y ${y.toFixed(2)} rich ${rich} burst ${burst} gate ${gate.toFixed(2)} vel ${vel.toFixed(2)} ${JSON.stringify(prm)}\n   env 0.25 s: ${e.join(' ')}`); }
  }
}
