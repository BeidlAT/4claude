// Böe: raw processor time per sample in Node (held notes, both levels, a few heights; best of 3), against Harz's Glas
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const go = (name, rich, y, prm) => { let best = Infinity; for (let i = 0; i < 3; i++) { const r = L.render(D, { name, po: { rich, seed: 5, prm }, ch: rich ? 2 : 1, dur: 4, params: { freq: 220, hoehe: y }, msgs: [[0, { on: 0, f: 220, y, vel: 0.75, seed: 9 }]] }); best = Math.min(best, r.nsPerSample); } return best.toFixed(1); };
for (const rich of [false, true]) console.log((rich ? 'L3' : 'L1') + ': aeol y .2 ' + go('myzel-aeol', rich, 0.2, {}) + ', .5 ' + go('myzel-aeol', rich, 0.5, {}) + ', .9 ' + go('myzel-aeol', rich, 0.9, {}) + ' ns/sample | bow glas ' + go('myzel-bow', rich, 0.5, {}) + ' | null ' + go('myzel-null', rich, 0.5, {}));
