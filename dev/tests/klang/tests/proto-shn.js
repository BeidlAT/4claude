// Sehne (myzel-string) prototype measurements in Node: level, pitch, decay, partial stretch per pitch / height.
//   node proto-shn.js [what ...]   what: pitch | zones | ebow | jawari | glide | all     env: RICH=1, PRM='{"steg":"jawari"}', SRC=variant file
const L = require('./dsplib');
const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const rich = process.env.RICH === '1';
const PRM = JSON.parse(process.env.PRM || '{}');
const note = (f, y, o = {}) => L.render(D, { name: 'myzel-string', po: { rich, prm: Object.assign({}, PRM, o.prm || {}), seed: o.pseed || 3 }, ch: rich ? 2 : 1, dur: o.dur || 2, params: o.params || { freq: f, hoehe: y },
  msgs: [[0.05, { on: 0.05, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });
const mono = (r) => { if (!r.R) return r.L; const m = new Float32Array(r.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (r.L[i] + r.R[i]); return m; };
const r2 = (x) => Math.round(x * 100) / 100;
function peakHz(sig, f, at, N) {
  const { p, hz } = L.spectrum(sig, SR, at, N); let b = Math.round(f / hz);
  for (let k = Math.floor(f * 0.97 / hz); k <= Math.ceil(f * 1.03 / hz); k++) if (p[k] > p[b]) b = k;
  const a = 10 * Math.log10(p[b - 1] + 1e-30), c = 10 * Math.log10(p[b] + 1e-30), d = 10 * Math.log10(p[b + 1] + 1e-30);
  return (b + 0.5 * (a - d) / (a - 2 * c + d)) * hz;
}
const T60 = (m, from, held) => { const e = L.env(m, SR, 0.005), a = Math.round(from / 0.005); const ref = held != null ? held : e[a]; for (let i = a; i < e.length; i++) if (e[i] < ref * 0.001) return (i - a) * 0.005; let i = a + 1; while (i < e.length && e[i] > ref * 0.1) i++; return i < e.length ? 3 * (i - a) * 0.005 : Infinity; };
const what = process.argv.slice(2).length ? process.argv.slice(2) : ['pitch'];
const all = what.includes('all');
if (all || what.includes('pitch')) {
  console.log('== pitch / level / T60 (y 0.5)');
  for (const f of [55, 110, 220, 440, 880, 1320, 2000, 3000, 5000, 8000]) {
    const r = note(f, 0.5, { dur: 2 }), m = mono(r);
    const fm = peakHz(m, f, 0.4, 32768), st = [2, 5, 10].map((h) => h * f < 20000 ? r2(L.cents(peakHz(m, h * f * Math.pow(2, 0.0) * (1 + (h > 5 ? 0.003 : 0)), 0.4, 32768), h * fm)) : null);
    console.log(`f ${String(f).padStart(5)}: f0 ${L.cents(fm, f).toFixed(2).padStart(6)} ct  stretch h2/h5/h10 ${st.join('/')} ct  rms0.1 ${L.db(L.rms(m, 0.1 * SR, 0.3 * SR)).toFixed(1)}  rms1 ${L.db(L.rms(m, 1 * SR, 1.2 * SR)).toFixed(1)} pk ${L.db(L.peak(m)).toFixed(1)}  ${r.nsPerSample.toFixed(0)} ns/s nan ${L.nanCount(m)}`);
  }
}
if (all || what.includes('zones')) {
  console.log('== zones at 220 Hz (level 0.2–0.5 s, T60, h1/h2/h3 at 0.4 s)');
  for (const y of [0, 0.15, 0.3, 0.5, 0.72, 0.75, 0.78, 0.83, 0.9, 0.95, 0.98, 1]) {
    const r = note(220, y, { dur: 5 }), m = mono(r), sp = L.spectrum(m, SR, 0.4, 16384);
    const h = [1, 2, 3, 4].map((k) => L.harm(sp, 220, k).toFixed(1));
    const lv = [0.2, 1, 2, 4].map((t) => L.db(L.rms(m, Math.round(t * SR), Math.round((t + 0.2) * SR))).toFixed(1));
    console.log(`y ${y.toFixed(2)}: lvl@.2/1/2/4 ${lv.join(' ')}  T60 ${T60(m, 0.1).toFixed(2)} s  h1..h4 ${h.join(' ')}  centroid ${Math.round(L.centroid(m, SR, 0.3, 4096))}`);
  }
}
if (all || what.includes('ebow')) {
  console.log('== E-Bow: level over time (220 Hz), release at 4.5 s');
  for (const y of [0.88, 0.95, 1]) for (const f of [110, 220, 880]) {
    const r = note(f, y, { dur: 6, off: 4.5 }), m = mono(r);
    const lv = [0.1, 0.3, 0.6, 1, 2, 3, 4, 4.4, 4.6, 4.8, 5].map((t) => L.db(L.rms(m, Math.round(t * SR), Math.round((t + 0.1) * SR))).toFixed(1));
    const sp = L.spectrum(m, SR, 3, 16384);
    console.log(`y ${y} f ${f}: ${lv.join(' ')}  h1 ${L.harm(sp, f, 1).toFixed(1)} h2 ${L.harm(sp, f, 2).toFixed(1)} h3 ${L.harm(sp, f, 3).toFixed(1)}  pk ${L.db(L.peak(m)).toFixed(1)}`);
  }
}
if (all || what.includes('jawari')) {
  console.log('== centroid track 0.05–3 s (flach vs jawari), 110/220 Hz, y 0.5');
  for (const steg of ['flach', 'jawari']) for (const f of [110, 220, 440]) {
    const m = mono(note(f, 0.5, { dur: 3.2, prm: { steg } }));
    const cs = [0.06, 0.15, 0.3, 0.5, 0.75, 1, 1.5, 2, 2.5].map((t) => Math.round(L.centroid(m, SR, t, 4096)));
    const lv = [0.1, 0.5, 1, 2].map((t) => L.db(L.rms(m, Math.round(t * SR), Math.round((t + 0.1) * SR))).toFixed(1));
    console.log(`${steg.padEnd(6)} ${f}: centroid ${cs.join(' ')}  lvl ${lv.join(' ')}  f0 ${L.cents(peakHz(m, f, 1, 32768), f).toFixed(1)} ct`);
  }
}
