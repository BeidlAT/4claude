// jawari bloom: the centroid track (mean of 3 plucks, 2048-pt windows every 50 ms), its peak time, rise duration, level
//   node bloom-shn.js 'from|to;...' ...      env F=110,220,440
const L = require('./dsplib'); const SR = 48000, base = L.dspSource();
const fs = (process.env.F || '110,220,440').split(',').map(Number), PRM = JSON.parse(process.env.PRM || '{}'), vel = +(process.env.VEL || 0.75), Y = +(process.env.Y || 0.5);
const ts = []; for (let t = 0.02; t < 2.5; t += 0.05) ts.push(t);
const pw = (x, a, b) => { const r = L.rms(x, Math.round(a * SR), Math.round(b * SR)); return r * r; };
for (const v of [''].concat(process.argv.slice(2))) {
  let src = base;
  if (v) for (const rep of v.split(';;')) { const [from, to] = rep.split('=>'); if (!src.includes(from)) { console.log('!! ' + from); process.exit(1); } src = src.split(from).join(to); }
  const D = L.loadDsp(SR, src); const out = [];
  for (const f of fs) {
    const c = ts.map(() => 0); let l0 = 0, l1 = 0, l2 = 0, fl = 0;
    for (let s = 1; s <= 3; s++) {
      const r = L.render(D, { name: 'myzel-string', po: { seed: s, prm: Object.assign({ steg: 'jawari' }, PRM) }, dur: 2.6, params: { freq: f, hoehe: Y }, msgs: [[0, { on: 0, f, y: Y, vel, seed: 100 + s }]] });
      ts.forEach((t, i) => { c[i] += L.centroid(r.L, SR, t, 2048) / 3; });
      l0 += pw(r.L, 0, 0.1); l1 += pw(r.L, 0.5, 0.6); l2 += pw(r.L, 1.5, 1.6);
      const fr = L.render(D, { name: 'myzel-string', po: { seed: s, prm: Object.assign({}, PRM, { steg: 'flach' }) }, dur: 0.2, params: { freq: f, hoehe: Y }, msgs: [[0, { on: 0, f, y: Y, vel, seed: 100 + s }]] }); fl += pw(fr.L, 0, 0.1);
    }
    let pk = 0; for (let i = 1; i < c.length; i++) if (c[i] > c[pk]) pk = i;
    let rise = 0; for (let i = 1; i <= pk; i++) if (c[i] >= c[i - 1] * 0.97) rise = ts[i] - ts[0]; else break;
    const d = (x) => (10 * Math.log10(x + 1e-30)).toFixed(1);
    out.push(`${f}: c ${[0, 1, 2, 4, 6, 10, 15, 20, 30, 40].map((i) => Math.round(c[i])).join(' ')}  peak ${Math.round(c[pk])} at ${ts[pk].toFixed(2)} s, rising ${rise.toFixed(2)} s  lvl 0/.5/1.5 ${d(l0 / 3)} ${d(l1 / 3)} ${d(l2 / 3)} (flach 0 ${d(fl / 3)})`);
  }
  console.log('\n## ' + (v || 'as is')); console.log(out.join('\n'));
}
