// Halm's flute and flame in Node: per height – level, pitch vs the note (and which register), envelope wobble
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const rohr = process.argv[2] || 'floete', rich = process.env.RICH === '1';
const fs = (process.env.F || '110,220,440,880,1320').split(',').map(Number), ys = (process.env.Y || '0,0.2,0.3,0.4,0.6,0.8,0.9,0.97').split(',').map(Number);
for (const f of fs) {
  const rows = [];
  for (const y of ys) {
    const r = L.render(D, { name: 'myzel-blow', po: { rich, prm: Object.assign({ rohr }, JSON.parse(process.env.PRM || '{}')), seed: 3 }, ch: rich ? 2 : 1, dur: 2.2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 1234 }]] });
    const m = r.L, seg = m.subarray(1.2 * SR, 2.1 * SR);
    const fo = L.yin(seg.subarray(0, 16384), SR, 40, 6000);
    const e = L.env(m, SR, 0.05).slice(24, 42).map(L.db), wob = Math.max(...e) - Math.min(...e);
    const ct = fo ? 1200 * Math.log2(fo / f) : NaN, reg = fo ? Math.round(fo / f) : 0;
    rows.push(`y ${y.toFixed(2)}: ${L.db(L.rms(seg)).toFixed(1).padStart(6)} dB  ${fo ? (fo.toFixed(1) + ' Hz = ' + (fo / f).toFixed(3) + '·f').padEnd(22) : '—'.padEnd(22)} wob ${wob.toFixed(1)}  t90 ${(1000 * L.t90(m, SR, 0.05, L.rms(seg))).toFixed(0)} ms  ${r.nsPerSample.toFixed(0)} ns`);
  }
  console.log('== ' + rohr + ' ' + f + ' Hz' + (rich ? ' L3' : '') + '\n' + rows.join('\n'));
}
