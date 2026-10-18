// Amöbe: variants of the processor's constants (by replacing them in the source), measured against Höhe.
//   F=55,110,220 Y=0,0.5,1 PRM='{}' node sweep-amo.js 'from|to;from2|to2' ...   ('' = as is)
// Per note (3 seeds averaged): noise = energy off the harmonics (> f/4 away) vs on them, 20 Hz–8 kHz; bands = share of
// the energy above 1, 2, 4 kHz; wander = std (dB) of h2–h12 over 85-ms windows in 0.5–2.5 s; flux = mean change of the
// waveform from one period to the next (rms, relative) – the per-period unrest
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
const variants = process.argv.slice(2);
const rich = process.env.RICH === '1';
const fs = (process.env.F || '55,110,220').split(',').map(Number), ys = (process.env.Y || '0,0.5,1').split(',').map(Number);
const prm = JSON.parse(process.env.PRM || '{}'), seeds = (process.env.SEEDS || '11,22,33').split(',').map(Number);
function measure(m, f) {
  const sp = L.spectrum(m, SR, 0.6, 32768); let on = 0, off = 0; const b = [0, 0, 0, 0];
  for (let k = 1; k * sp.hz < 8000; k++) { const hz = k * sp.hz, d = Math.abs(hz - Math.round(hz / f) * f); if (d > f / 4) off += sp.p[k]; else on += sp.p[k]; b[0] += sp.p[k]; if (hz > 1000) b[1] += sp.p[k]; if (hz > 2000) b[2] += sp.p[k]; if (hz > 4000) b[3] += sp.p[k]; }
  const wl = [];
  for (let h = 2; h <= 12; h++) { const lv = []; for (let t = 0.5; t < 2.4; t += 0.05) lv.push(L.harm(L.spectrum(m, SR, t, 4096), f, h)); const mu = L.mean(lv); wl.push(Math.sqrt(lv.reduce((a, x) => a + (x - mu) ** 2, 0) / lv.length)); }
  const T = SR / f; let fl = 0, fn = 0; const fa = [], fm = [];
  if (Math.abs(T - Math.round(T)) < 1e-6) { const Ti = Math.round(T); for (let s = Math.round(0.5 * SR); s + 2 * Ti < 2.5 * SR; s += Ti) { let dd = 0, ee = 0, mx = 0; for (let i = 0; i < Ti; i++) { const q = m[s + i + Ti] - m[s + i]; dd += q * q; ee += m[s + i] ** 2; if (Math.abs(q) > mx) mx = Math.abs(q); } fm.push(mx / Math.sqrt(ee / Ti)); fl += Math.sqrt(dd / ee); fa.push(Math.sqrt(dd / ee)); fn++; } }
  fa.sort((x, y) => x - y); fm.sort((x, y) => x - y); const pk99 = fm.length ? fm[Math.floor(0.99 * fm.length)] / fm[Math.floor(0.5 * fm.length)] : NaN;
  const spike = fa.length ? fa[Math.floor(0.99 * fa.length)] / fa[Math.floor(0.5 * fa.length)] : NaN;
  const h1 = L.harm(sp, f, 1); const hh = {}; for (const h of [2, 4, 8, 16, 32]) hh['h' + h] = h * f < 20000 ? L.harm(sp, f, h) - h1 : NaN;
  return { ...hh, noise: 10 * Math.log10(off / on), b1: 10 * Math.log10(b[1] / b[0]), b2: 10 * Math.log10(b[2] / b[0]), b4: 10 * Math.log10(b[3] / b[0]), wander: L.mean(wl), flux: fn ? fl / fn : NaN, spike, pk99, cen: L.centroid(m, SR, 1, 8192) };
}
for (const v of variants.length ? variants : ['']) {
  let src = base;
  for (const rep of v.split(';').filter(Boolean)) { const [from, to] = rep.split('|'); if (!src.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src);
  console.log('\n## ' + (v || 'as is'));
  for (const f of fs) for (const y of ys) {
    const acc = {};
    for (const seed of seeds) {
      const r = L.render(D, { name: 'myzel-gendy', po: { rich, prm }, ch: rich ? 2 : 1, dur: 2.6, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: +(process.env.VEL || 0.75), seed }]] });
      const mm = measure(process.env.CH === "R" ? r.R : r.L, f); for (const k in mm) acc[k] = (acc[k] || 0) + mm[k] / seeds.length;
    }
    console.log(`${f}/${y}: noise ${acc.noise.toFixed(1)} dB | >1k ${acc.b1.toFixed(1)} >2k ${acc.b2.toFixed(1)} >4k ${acc.b4.toFixed(1)} | wander ${acc.wander.toFixed(2)} dB | flux ${acc.flux.toFixed(3)} spike ${acc.spike.toFixed(1)} pk ${acc.pk99.toFixed(1)} | centroid ${acc.cen.toFixed(0)} | h2/4/8/16/32 ${[2, 4, 8, 16, 32].map((h) => acc['h' + h].toFixed(0)).join('/')}`);
  }
}
