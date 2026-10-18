// Zapfen: the Rast steps in Node – Höhe 0.3 → 1 in 7 s; the largest 10-ms moment within 150 ms of each step vs the
// running RMS of the 250 ms before it, and the same away from the steps.   env F='220,880', B, SUBS, PRM
const L = require('./dsplib'), Z = require('./zsrc'), ZL = require('./zpflib');
const SR = 48000, D = Z.load(SR), body = process.env.B || 'zapfen', PRM = JSON.parse(process.env.PRM || '{}');
for (const f of (process.env.F || '220,880').split(',').map(Number)) {
  const yAt = (t) => (t < 0.5 ? 0.3 : Math.min(1, 0.3 + 0.7 * (t - 0.5) / 7));
  const r = L.render(D, { name: 'myzel-scrape', po: { prm: Object.assign({ koerper: body }, PRM), seed: 3 }, ch: 1, dur: 8, params: (t) => ({ freq: f, hoehe: yAt(t) }), msgs: [[0.05, { on: 0.05, f, y: 0.3, vel: 0.75, seed: 77 }]] });
  const m = r.L, e = L.env(m, SR, 0.01), ys = []; for (let t = 0; t < 8; t += 0.005) ys.push(yAt(t));
  const steps = ZL.rastSteps(f, ys, 0.005, PRM.rast != null ? PRM.rast : 0.7), run = (t) => L.rms(m, Math.round((t - 0.27) * SR), Math.round((t - 0.02) * SR));
  const pk = (t) => { let x = 0; for (let i = Math.round((t - 0.02) / 0.01); i < Math.round((t + 0.15) / 0.01); i++) x = Math.max(x, e[i] || 0); return x; };
  const at = steps.filter((s) => s[0] > 0.8 && s[0] < 7.7).map((s) => s[0].toFixed(2) + ' ' + s[1] + '→' + s[2] + ' ' + (L.db(pk(s[0])) - L.db(run(s[0]))).toFixed(1));
  const away = []; for (let t = 0.9; t < 7.6; t += 0.17) if (steps.every((s) => Math.abs(s[0] - t) > 0.3)) away.push(L.db(pk(t)) - L.db(run(t)));
  console.log(`${f} Hz: steps ${at.join(', ')}  | away max ${Math.max(...away).toFixed(1)} median ${away.sort((a, b) => a - b)[away.length >> 1].toFixed(1)}  | env per 0.5 s: ${L.env(m, SR, 0.5).map((v) => L.db(v).toFixed(0)).join(' ')}`);
  L.wav(require('path').join(__dirname, '..', 'demo', `rast-${body}-${f}.wav`), m, m, SR);
}
