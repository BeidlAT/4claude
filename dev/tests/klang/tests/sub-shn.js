// energy below 20 Hz vs at the fundamental over time (dB), for variants – the contact's slow offset
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
const f = +(process.argv[2] || 220);
for (const v of [''].concat(process.argv.slice(3))) {
  let src = base;
  for (const rep of v.split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src);
  for (const steg of ['flach', 'jawari']) {
    const r = L.render(D, { name: 'myzel-string', po: { seed: 1, prm: { steg } }, dur: 2.2, params: { freq: f, hoehe: 0.5 }, msgs: [[0, { on: 0, f, y: 0.5, vel: 0.75, seed: 101 }]] });
    const row = [0.1, 0.3, 1, 2].map((t) => { const sp = L.spectrum(r.L, SR, t, 8192); let a = 0, b = 0; for (let k = 0; k * sp.hz < 20; k++) a += sp.p[k]; for (let k = Math.round(f * 0.9 / sp.hz); k < f * 1.1 / sp.hz; k++) b += sp.p[k]; return (10 * Math.log10((a + 1e-30) / (b + 1e-30))).toFixed(0); });
    console.log(`${(v || 'as is').slice(0, 50).padEnd(50)} ${steg}: sub-20 vs f ${row.join(' ')}`);
  }
}
