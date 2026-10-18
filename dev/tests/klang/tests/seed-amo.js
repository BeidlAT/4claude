// Amöbe: print a voice's seed polygon and the first played polygon   node seed-amo.js [vel] [seed]
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const vel = +(process.argv[2] || 0.75), seed = +(process.argv[3] || 11);
const r = L.render(D, { name: 'myzel-gendy', po: {}, ch: 1, dur: 0.05, params: { freq: 50, hoehe: 0 }, msgs: [[0, { on: 0, f: 50, y: 0, vel, seed }]] });
const G = r.node.G[0];
const f = (a) => [...a].slice(0, G.Kp).map((x) => x.toFixed(2)).join(' ');
console.log('A ' + G.A.toFixed(2) + ' Kp ' + G.Kp + ' K ' + G.K);
console.log('a0  ' + f(G.a0)); console.log('d0  ' + f(G.d0)); console.log('amp ' + f(G.amp)); console.log('dur ' + f(G.dur));
console.log('cum ' + [...G.cum].slice(0, G.K + 1).map((x) => x.toFixed(3)).join(' '));
// one period of the output
const T = SR / 50, s = Math.round(0.02 * SR); let line = ''; for (let i = 0; i < T; i += 24) line += (r.L[s + i] >= 0 ? '+' : '') + r.L[s + i].toFixed(2) + ' '; console.log(line);
