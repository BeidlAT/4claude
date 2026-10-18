// Glut in Node: growth per second across pitches, afterglow T60, pitch, settled level, the knee.   node proto-glt.js [what]
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const note = (f, y, o = {}) => L.render(D, { name: 'myzel-ember', po: { rich: !!o.rich, prm: o.prm, seed: o.seed || 5 }, ch: o.rich ? 2 : 1, dur: o.dur || 3, params: o.params || { freq: f, hoehe: y },
  msgs: [[0, { on: 0, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });
const what = process.argv[2] || 'all';
const envDb = (x, win = 0.01) => L.env(x, SR, win).map((v) => L.db(v));
// slope (dB/s) of the envelope between two levels on its way up (relative to its final level)
function slope(e, win, lo, hi) {
  const fin = Math.max(...e.slice(-20)); let a = -1, b = -1;
  for (let i = 0; i < e.length; i++) { if (a < 0 && e[i] > fin + lo) a = i; if (a >= 0 && e[i] > fin + hi) { b = i; break; } }
  if (a < 0 || b < 0) return [NaN, NaN];
  return [(e[b] - e[a]) / ((b - a) * win), a * win];
}
function peakHz(sig, f, at, N) {
  const { p, hz } = L.spectrum(sig, SR, at, N); let b = Math.round(f / hz);
  for (let k = Math.floor(f * 0.96 / hz); k <= Math.ceil(f * 1.04 / hz); k++) if (p[k] > p[b]) b = k;
  const a = 10 * Math.log10(p[b - 1] + 1e-30), c = 10 * Math.log10(p[b] + 1e-30), d = 10 * Math.log10(p[b + 1] + 1e-30);
  return (b + 0.5 * (a - d) / (a - 2 * c + d)) * hz;
}
if (what === 'all' || what === 'growth') {
  // growth from the floor: seedless? the onset seed starts at −20 dB re the settled level; measure −30…−10 dB below final
  for (const y of [0.45, 0.6, 1]) {
    const row = [];
    for (const f of [55, 110, 220, 440, 880, 1760]) {
      const r = note(f, y, { dur: 4, prm: { zunder: 0 } }); const e = envDb(r.L, 0.01);
      const [sl] = slope(e, 0.01, -25, -8); row.push(f + ':' + sl.toFixed(1) + ' (' + Math.max(...e.slice(-50)).toFixed(1) + ' dB, ' + r.nsPerSample.toFixed(0) + ' ns)');
    }
    console.log('y ' + y + ' growth dB/s: ' + row.join('  '));
  }
}
if (what === 'all' || what === 't60') {
  for (const ng of [0.2, 1.5, 6]) {
    const row = [];
    for (const f of [55, 220, 880, 1760]) {
      const dur = 1.5 + 2.2 * ng, r = note(f, 0.7, { dur, prm: { nachgluehen: ng }, off: 1.2 }); const e = envDb(r.L, 0.005);
      const a = Math.round(1.25 / 0.005), e0 = e[a]; let t1 = null; for (let i = a; i < e.length; i++) if (e[i] < e0 - 30) { t1 = (i - a) * 0.005; break; }
      row.push(f + ':' + (t1 == null ? '–' : (2 * t1).toFixed(2)));
    }
    console.log('nachgluehen ' + ng + ' → T60 (2 × t30): ' + row.join('  '));
  }
}
if (what === 'all' || what === 'pitch') {
  const row = [];
  for (const f of [55, 110, 220, 440, 880, 1760]) for (const y of [0.45, 0.7, 0.85, 1]) {
    const r = note(f, y, { dur: 2.4 }); const m = y >= 0.77 ? 3 : 1; const fm = peakHz(r.L, f * m, 1.4, 32768);
    row.push(f + '@' + y + ':' + L.cents(fm, f * m).toFixed(2));
  }
  console.log('pitch (ct, the line): ' + row.join(' '));
}
if (what === 'all' || what === 'level') {
  const row = [];
  for (const f of [55, 110, 220, 440, 880, 1760]) { const r = note(f, 0.6, { dur: 3 }); row.push(f + ':' + L.db(L.rms(r.L, 2 * SR, 3 * SR)).toFixed(1)); }
  console.log('settled level y 0.6 (dBFS before v.out): ' + row.join('  '));
  const k = []; for (const y of [0, 0.2, 0.32, 0.4, 0.5, 0.6, 0.8, 1]) { const r = note(220, y, { dur: 3 }); k.push(y + ':' + L.db(L.rms(r.L, 2 * SR, 3 * SR)).toFixed(1) + '/' + L.db(L.rms(r.L, 0.05 * SR, 0.5 * SR)).toFixed(1)); }
  console.log('knee at 220 Hz (y: settled 2–3 s / first 0.5 s): ' + k.join('  '));
}
if (what === 'jump') {
  for (const sp of ['3', '2']) for (const f of [110, 440]) {
    const yy = sp === '2' ? 0.82 : 0.85, m = sp === '2' ? 2 : 3;
    const r = note(f, 0.6, { dur: 3, prm: { sprung: sp }, params: (t) => ({ freq: f, hoehe: t < 1 ? 0.6 : yy }) });
    const e = envDb(r.L, 0.01), a = Math.round(0.9 / 0.01), lo = Math.min(...e.slice(a, a + 60)), lv = e[a];
    let tdom = null; for (let t = 1.0; t < 2.5; t += 0.01) { const sp2 = L.spectrum(r.L, SR, t, 2048); if (L.harm(sp2, f, m) > L.harm(sp2, f, 1) + 10) { tdom = t - 1; break; } }
    const sp3 = L.spectrum(r.L, SR, 2.2, 16384);
    console.log(`sprung ${sp} at ${f} Hz: dip ${(lo - lv).toFixed(1)} dB, new mode +10 dB over the old after ${tdom == null ? '–' : (tdom * 1000).toFixed(0)} ms, level ${lv.toFixed(1)} → ${e[Math.round(2.5 / 0.01)].toFixed(1)}, mode ${m} vs 1 at 2.2 s ${(L.harm(sp3, f, m) - L.harm(sp3, f, 1)).toFixed(1)} dB`);
  }
}
if (what === 'burst') {
  for (const f of [55, 220, 880]) for (const g of [0.06, 0.112, 0.5]) {
    const h = note(f, 0.6, { dur: 2 }), hr = L.rms(h.L, 1.5 * SR, 2 * SR);
    const r = note(f, 0.6, { dur: 2.5, burst: true, gate: g }); const e = L.env(r.L.subarray(0, Math.round(g * SR)), SR, 0.02);
    console.log(`burst ${f} Hz gate ${g}: inside ${(L.db(Math.max(...e)) - L.db(hr)).toFixed(1)} dB vs held, first 10 ms ${(L.db(L.rms(r.L, 0, 480)) - L.db(hr)).toFixed(1)} dB, end ${r.alive ? 'alive' : 'done ' + r.done.toFixed(2)}`);
  }
}
if (what === 'stereo') {
  for (const f of [55, 220, 880]) {
    const r = note(f, 0.6, { dur: 4, rich: true }), m = note(f, 0.6, { dur: 4 });
    let sl = 0, sr = 0, sx = 0; for (let i = 2 * SR; i < 4 * SR; i++) { sl += r.L[i] ** 2; sr += r.R[i] ** 2; sx += r.L[i] * r.R[i]; }
    const l1 = L.rms(m.L, 2 * SR, 4 * SR) * Math.SQRT1_2;   // (a mono voice passes its panner at −3 dB per side)
    console.log(`L3 ${f} Hz: L/R corr ${(sx / Math.sqrt(sl * sr)).toFixed(2)}, per side L3 ${L.db(Math.sqrt(sl / 2 / SR)).toFixed(1)}/${L.db(Math.sqrt(sr / 2 / SR)).toFixed(1)} vs L1 ${L.db(l1).toFixed(1)} dB, ns ${r.nsPerSample.toFixed(0)}/${m.nsPerSample.toFixed(0)}`);
  }
}
if (what === 'fold') {
  for (const [f, y, h] of [[1760, 0.6, 0.5], [1760, 0.6, 1], [880, 1, 1], [1760, 1, 1], [3000, 0.6, 1]]) {
    const r = note(f, y, { dur: 2, prm: { hitze: h, kasten: 1 } }); const m = y >= 0.77 ? 3 : 1;
    console.log(`fold ${f} Hz y ${y} hitze ${h}: strongest off-harmonic ${L.inharmonic(L.spectrum(r.L, SR, 1.2, 16384), f * m, 40, 20000).toFixed(1)} dB`);
  }
}
if (what === 'harm') {
  for (const h of [0, 0.5, 1]) { const row = [];
    for (const y of [0.4, 0.6, 1]) { const r = note(220, y, { dur: 2.5, prm: { hitze: h, kasten: 1 } }); const sp = L.spectrum(r.L, SR, 1.8, 16384), m = y >= 0.77 ? 3 : 1, f = 220 * m, h1 = L.harm(sp, f, 1);
      row.push(`y ${y}: h2 ${(L.harm(sp, f, 2) - h1).toFixed(1)} h3 ${(L.harm(sp, f, 3) - h1).toFixed(1)} h5 ${(L.harm(sp, f, 5) - h1).toFixed(1)}`); }
    console.log('hitze ' + h + ' – ' + row.join(' | ')); }
  for (const sp of ['2', '3']) { const r = note(220, 0.6, { dur: 2.5, prm: { sprung: sp } }); const s = L.spectrum(r.L, SR, 1.8, 16384), h1 = L.harm(s, 220, 1); console.log(`sprung ${sp} at y 0.6: h2 ${(L.harm(s, 220, 2) - h1).toFixed(1)} h3 ${(L.harm(s, 220, 3) - h1).toFixed(1)}`); }
  const held = L.rms(note(220, 0.6, { dur: 3 }).L, 2 * SR, 3 * SR);
  for (const z of [0, 0.4, 1]) { const r = note(220, 0, { dur: 1.2, prm: { zunder: z } }); console.log(`y 0 ping, Zunder ${z}: 0–0.5 s ${(L.db(L.rms(r.L, 0, 0.5 * SR)) - L.db(held)).toFixed(1)} dB, 0.5–1 s ${(L.db(L.rms(r.L, 0.5 * SR, SR)) - L.db(held)).toFixed(1)} dB vs held y 0.6; the knock (first 20 ms) ${(L.db(L.rms(r.L, 0, 0.02 * SR)) - L.db(held)).toFixed(1)} dB`); }
}
if (what === 'walk') {
  const r = note(220, 0.6, { dur: 20 }); const e = envDb(r.L, 0.1).slice(30);
  console.log('20 s at y 0.6: level range ' + (Math.max(...e) - Math.min(...e)).toFixed(2) + ' dB');
  const pc = []; for (let t = 3; t < 19; t += 0.5) pc.push(L.cents(peakHz(r.L, 220, t, 16384), 220)); console.log('pitch walk ct: ' + pc.map((c) => c.toFixed(1)).join(' '));
}
