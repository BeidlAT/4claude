// Amöbe: render time per sample in Node against the other processors (relative cost while tuning)
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const one = (name, rich, f = 110, prm) => { const r = L.render(D, { name, po: { rich, prm }, ch: rich ? 2 : 1, dur: 6, params: { freq: f, hoehe: 0.5 }, msgs: [[0, { on: 0, f, y: 0.5, vel: 0.75, seed: 9 }]] }); return r.nsPerSample; };
for (let round = 0; round < 2; round++) {
  const out = [];
  for (const [n, rich, f] of [['myzel-null', false], ['myzel-blow', false], ['myzel-bow', false], ['myzel-gendy', false, 55], ['myzel-gendy', false, 110], ['myzel-gendy', false, 440], ['myzel-gendy', true, 110], ['myzel-gendy', true, 440]]) {
    let best = Infinity; for (let i = 0; i < 3; i++) best = Math.min(best, one(n, rich, f));
    out.push(`${n}${rich ? ' L3' : ''}${f ? ' ' + f : ''}: ${best.toFixed(1)}`);
  }
  console.log(out.join(' | '));
}
