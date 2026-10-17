const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
for (const seed of [1234, 77, 9]) {
  const r = L.render(D, { name: 'myzel-bow', po: { prm: { koerper: 'teich' }, seed: 3 }, dur: 6, params: { freq: 220, hoehe: 0.5 }, msgs: [[0.05, { on: 0.05, f: 220, y: 0.5, vel: 0.75, seed }]] });
  const pc = []; for (let t = 1; t < 5.6; t += 0.25) pc.push(L.cents(L.combPitch(r.L, SR, 220, t, 16384, 1), 220));
  console.log(seed, pc.map((c) => c.toFixed(1)).join(' '), ' range', (Math.max(...pc) - Math.min(...pc)).toFixed(1));
}
