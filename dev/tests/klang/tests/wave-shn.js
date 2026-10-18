// the wave at the bridge, one period at a few passes (ASCII: 24 points), and its h1..h12 (dB re h1)
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
const f = +(process.argv[2] || 220); let src = base;
for (const rep of (process.argv[3] || '').split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! ' + from); process.exit(1); } src = src.split(from).join(to); }
const D = L.loadDsp(SR, src);
const r = L.render(D, { name: 'myzel-string', po: { seed: 1, prm: Object.assign({ steg: 'jawari' }, JSON.parse(process.env.PRM || '{}')) }, dur: 1.2, params: { freq: f, hoehe: 0.5 }, msgs: [[0, { on: 0, f, y: 0.5, vel: 0.75, seed: 101 }]] });
const P = Math.round(SR / f);
for (const pass of [2, 5, 10, 20, 40, 80, 160]) {
  const a = pass * P, seg = r.L.slice(a, a + P); let mx = 0; for (const x of seg) mx = Math.max(mx, Math.abs(x));
  const pts = []; for (let i = 0; i < 24; i++) pts.push(Math.round(9 * seg[Math.floor(i * P / 24)] / mx));
  const rep = new Float32Array(8192); for (let i = 0; i < 8192; i++) rep[i] = seg[i % P];
  const sp = L.spectrum(rep, SR, 0, 8192); const h1 = L.harm(sp, SR / P, 1);
  console.log(`pass ${String(pass).padStart(3)} max ${mx.toFixed(3)}: ${pts.map((v) => String(v).padStart(3)).join('')}   h2..12 ${[2, 3, 4, 5, 6, 8, 10, 12].map((h) => (L.harm(sp, SR / P, h) - h1).toFixed(0)).join(' ')}`);
}
