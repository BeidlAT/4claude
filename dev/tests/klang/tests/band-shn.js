// energy in bands over time (dB): low (< 3f), mid (3f–2 kHz), high (2–8 kHz); and the centroid – flach vs jawari variants
//   node band-shn.js f 'from|to;...' ...
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
const f = +process.argv[2], variants = process.argv.slice(3);
const PRM = JSON.parse(process.env.PRM || '{}'), vel = +(process.env.VEL || 0.75);
const ts = [0.02, 0.06, 0.12, 0.2, 0.35, 0.5, 0.75, 1, 1.5, 2];
for (const v of [''].concat(variants)) {
  let src = base;
  for (const rep of v.split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src);
  for (const steg of v ? ['jawari'] : ['flach', 'jawari']) {
    const acc = ts.map(() => [0, 0, 0, 0]);
    for (let s = 1; s <= 3; s++) {
      const r = L.render(D, { name: 'myzel-string', po: { seed: s, prm: Object.assign({}, PRM, { steg }) }, dur: 2.2, params: { freq: f, hoehe: 0.5 }, msgs: [[0, { on: 0, f, y: 0.5, vel, seed: 100 + s }]] });
      ts.forEach((t, i) => { const sp = L.spectrum(r.L, SR, t, 2048); let lo = 0, mi = 0, hi = 0; for (let k = 1; k < sp.p.length; k++) { const hz = k * sp.hz; if (hz < 3 * f) lo += sp.p[k]; else if (hz < 2000) mi += sp.p[k]; else if (hz < 8000) hi += sp.p[k]; } acc[i][0] += lo; acc[i][1] += mi; acc[i][2] += hi; acc[i][3] += L.centroid(r.L, SR, t, 2048); });
    }
    const d = (x) => (10 * Math.log10(x + 1e-30)).toFixed(0).padStart(4);
    console.log(`${(v || 'as is').slice(0, 40).padEnd(40)} ${steg.padEnd(6)} hi−lo ${acc.map((a) => d(a[2] / a[0])).join('')}  mid−lo ${acc.map((a) => d(a[1] / a[0])).join('')}  centroid ${acc.map((a) => Math.round(a[3] / 3)).join(' ')}`);
  }
}
