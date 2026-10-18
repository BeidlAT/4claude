// Moder in Node: one hit of myzel-rot, measured – the swell of the fundamental, the upper modes' fall, the end, the
// crackle (events, concentration within ±5 % of the modes), levels.   node proto-mdr.js '{"y":0.7}' [ '{"prm":{…}}' …]
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const RAT = { glocke: [1, 1.794, 2.52, 2.991, 3.786, 4.5, 5.4, 6.8, 8.1, 9.6, 11.2, 13], holz: [1, 2.572, 4.644, 6.984, 9.723, 12, 14.5, 17, 20, 23.5, 27, 31], knochen: [1, 2.756, 5.404, 8.933, 12.9, 17.6, 22.5, 28, 34, 40.5, 47.5, 55] };
function hit(o) {
  const f = o.f || 220, y = o.y != null ? o.y : 0.7, vel = o.vel != null ? o.vel : 0.8, prm = Object.assign({}, o.prm || {});
  const life = o.life || prm.nachklang || 5;
  return L.render(D, { name: 'myzel-rot', po: { rich: !!o.rich, prm, seed: 5 }, ch: o.rich ? 2 : 1, dur: o.dur || life * 1.4 + 0.3, params: { freq: f, hoehe: y },
    msgs: [[0, { on: 0, f, y, vel, life: o.life, sc: o.sc, seed: o.seed || 1234 }]] });
}
// level of a spectral line (dB) at time t: Goertzel-like single-bin on a Hann window of N samples
function line(x, f, t, N = 4096) { const a = Math.floor(t * SR - N / 2); let re = 0, im = 0; for (let i = 0; i < N; i++) { const s = (x[a + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)), w = 2 * Math.PI * f * (a + i) / SR; re += s * Math.cos(w); im -= s * Math.sin(w); } return 10 * Math.log10((re * re + im * im) / (N * N / 16) + 1e-30); }
function measure(o) {
  const body = (o.prm && o.prm.koerper) || 'glocke', f = o.f || 220, r = hit(o), x = r.L;
  const life = o.life || (o.prm && o.prm.nachklang) || 5;
  const f1 = (t) => line(x, f, t);
  let pk = -999, tp = 0; for (let t = 0.2; t <= Math.min(life, 3); t += 0.02) { const v = f1(t); if (v > pk) { pk = v; tp = t; } }
  const swell = Math.max(...[1.0, 1.2, 1.4, 1.6, 1.8].map(f1)) - f1(0.1);
  const fall = [4, 5, 6, 7].map((k) => +(line(x, f * RAT[body][k], 1.5, 2048) - line(x, f * RAT[body][k], 0.04, 2048)).toFixed(1));
  const done = r.posted.find((p) => p[1].done);
  return { swell: +swell.toFixed(1), peakAt: +tp.toFixed(2), fall, done: done ? +done[0].toFixed(2) : null, ev: r.node.nev, peak: +L.db(L.peak(x)).toFixed(1), rms01: +L.db(L.rms(x, 0, 0.1 * SR)).toFixed(1), rms13: +L.db(L.rms(x, 1 * SR, 3 * SR)).toFixed(1), ns: +r.nsPerSample.toFixed(0), stem: [0.1, 0.5, 1, 2, 3, 4, 4.5].map((t) => +f1(t * life / 5).toFixed(1)) };
}
module.exports = { hit, line, measure, RAT };
if (require.main === module) {
  const base = JSON.parse(process.argv[2] || '{}');
  const list = process.argv.slice(3).map((a) => JSON.parse(a));
  for (const c of list.length ? list : [{}]) { const o = Object.assign({}, base, c, { prm: Object.assign({}, base.prm || {}, c.prm || {}) }); console.log(JSON.stringify(c), JSON.stringify(measure(o))); }
}
