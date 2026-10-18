// Böe: the caught string's steadiness – with the lock-in (as built) against SPEC's noise drive alone (AEOL_GROW 0 and the
// natural loss), and other constants by source replacement. For a held note at a string's centre (Böen 0: no gusts),
// per variant: the caught string's amplitude envelope (|z| per block) over 20 s: its spread, the share of time
// 10 dB under its mean, the rise of the capture (dB in the first 150 ms after it caught).
//   node lock-boe.js 'name|from|to;…' …        env F, Y (default 0.36 → string 3), PRM
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
const F = +(process.env.F || 220), Y = +(process.env.Y || 0.36), PRM = Object.assign({ boeen: 0 }, JSON.parse(process.env.PRM || '{}'));
const variants = process.argv.slice(2).length ? process.argv.slice(2) : [''];
for (const v of variants) {
  let src = base;
  for (const rep of v.split(';;').filter(Boolean)) { const [, from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src), C = D.procs['myzel-aeol'];
  const res = [];
  for (const seed of [11, 22, 33, 44]) {
    const node = new C({ processorOptions: { prm: PRM, seed } });
    node.port.onmessage({ data: { on: 0, f: F, y: Y, vel: 0.75, seed } });
    const P = { freq: [F], detune: [0], hoehe: [Y] }, env = [], capAt = [];
    let k0 = 0;
    for (let f0 = 0, b = 0; f0 < 20 * SR; f0 += 128, b++) {
      D.scope.currentTime = f0 / SR;
      node.process([], [[new Float32Array(128)]], P);
      if (node.cap && !k0) { k0 = node.cap; capAt.push(b); }
      if (b > 375 * 3 && node.cap === k0) env.push(L.db(Math.hypot(node.re[k0 - 1], node.im[k0 - 1])));
      if (capAt.length === 1 && b === capAt[0] + 56) capAt.push(L.db(Math.hypot(node.re[k0 - 1], node.im[k0 - 1])));
    }
    const pw = env.map((d) => Math.pow(10, d / 10)), mean = 10 * Math.log10(pw.reduce((a, b) => a + b, 0) / pw.length);
    const s = env.slice().sort((a, b) => a - b), p5 = s[Math.floor(0.05 * s.length)], p95 = s[Math.floor(0.95 * s.length)];
    const low = env.filter((d) => d < mean - 10).length / env.length;
    res.push({ k: k0, mean: mean.toFixed(1), p5_95: (p5 - mean).toFixed(1) + '/' + (p95 - mean).toFixed(1), low10: (100 * low).toFixed(1) + '%', rise150: capAt[1] != null ? capAt[1].toFixed(1) : '-' });
  }
  console.log('## ' + (v || 'as built'));
  for (const r of res) console.log('  ' + JSON.stringify(r));
}
