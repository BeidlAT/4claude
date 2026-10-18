// Amöbe (myzel-gendy) in Node: quick measurements while tuning.   MYZEL_SRC=… node proto-amo.js [what]
const L = require('./dsplib');
const SR = 48000;
const D = L.loadDsp(SR);
const R = (o) => L.render(D, o);
const note = (f, y, o = {}) => R({ name: 'myzel-gendy', po: Object.assign({ rich: !!o.rich, lite: o.lite ? 1 : 0, prm: o.prm }, o.po), ch: o.rich ? 2 : 1, dur: o.dur || 2, params: o.params || { freq: f, hoehe: y },
  msgs: [[0, { on: 0, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234, rel: o.rel }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });
const what = process.argv[2] || 'basic';
const mono = (r) => { if (!r.R) return r.L; const m = new Float32Array(r.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (r.L[i] + r.R[i]); return m; };
// alias lines: SR − n·f etc. (frozen-ish polygon) relative to the strongest harmonic
function alias(sig, f, at = 0.5, N = 32768) {
  const sp = L.spectrum(sig, SR, at, N); let top = 0;
  for (let h = 1; h * f < SR / 2; h++) { const k = Math.round(h * f / sp.hz); for (let j = k - 2; j <= k + 2; j++) top = Math.max(top, sp.p[j] || 0); }
  let worst = 0, wf = 0;
  for (let h = 1; h * f < 8 * SR; h++) {
    let fa = (h * f) % SR; if (fa > SR / 2) fa = SR - fa;
    if (h * f < SR / 2) continue;
    const hn = Math.round(fa / f); if (Math.abs(fa - hn * f) < 4 * sp.hz) continue;   // (lands on a harmonic: not separable)
    const k = Math.round(fa / sp.hz); let m = 0; for (let j = k - 1; j <= k + 1; j++) m = Math.max(m, sp.p[j] || 0);
    if (m > worst) { worst = m; wf = fa; }
  }
  return [10 * Math.log10(worst / top + 1e-30), Math.round(wf)];
}
if (what === 'basic') {
  for (const f of [55, 110, 220, 440, 880, 1760]) for (const y of [0, 0.3, 0.6, 1]) {
    const r = note(f, y, { dur: 2, prm: { zeit: 0 } }), m = r.L;
    const c = L.cents(L.combPitch(m, SR, f, 1.0, 16384), f);
    console.log(`f ${f} y ${y}: rms ${L.db(L.rms(m, 0.5 * SR, 2 * SR)).toFixed(1)} dB peak ${L.db(L.peak(m)).toFixed(1)} dc ${L.mean(m, 0.5 * SR).toFixed(5)} cent ${c.toFixed(2)} centroid ${L.centroid(m, SR, 1.0, 8192).toFixed(0)} ns/s ${r.nsPerSample.toFixed(1)}`);
  }
}
if (what === 'inh') {
  const src0 = L.dspSource();
  for (const bl of ['1', '0']) {
    const DD = L.loadDsp(SR, src0.replace('AMO_BLAMP = 1', 'AMO_BLAMP = ' + bl));
    for (const rich of [false, true]) for (const f of [523, 1013, 1511, 2011, 2503, 3001, 4001]) for (const y of [0, 0.5]) {
      const r = L.render(DD, { name: 'myzel-gendy', po: { rich, prm: { zeit: 0 } }, ch: rich ? 2 : 1, dur: 1.5, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 77 }]] });
      const sp = L.spectrum(r.L, SR, 0.6, 32768); let top = 0, off = 0, offF = 0;
      for (let k = Math.round(40 / sp.hz); k * sp.hz < 23000; k++) { const hz = k * sp.hz, d = Math.abs(hz - Math.round(hz / f) * f); if (d <= 6 * sp.hz) top = Math.max(top, sp.p[k]); else if (sp.p[k] > off) { off = sp.p[k]; offF = hz; } }
      console.log(`blamp ${bl} ${rich ? 'L3' : 'L1'} f ${f} y ${y}: strongest off-harmonic line ${(10 * Math.log10(off / top)).toFixed(1)} dB at ${Math.round(offF)} Hz`);
    }
  }
}
if (what === 'fold') {
  for (const blamp of [1]) for (const f of [500, 1013, 1500, 2011, 3001]) for (const y of [0, 0.3]) {
    const r = note(f, y, { dur: 1.5, prm: { zeit: 0 } });
    const [a, af] = alias(r.L, f);
    console.log(`f ${f} y ${y}: worst alias line ${a.toFixed(1)} dB at ${af} Hz`);
  }
}
if (what === 'cost') {
  for (const rich of [false, true]) { let t = 0; for (let i = 0; i < 3; i++) { const r = note(110, 0.5, { dur: 4, rich }); t += r.nsPerSample; } console.log((rich ? 'L3' : 'L1') + ' ns/sample ' + (t / 3).toFixed(1)); }
}
if (what === 'wav') {
  const moves = (t) => ({ freq: 82.4, hoehe: t < 1 ? 0 : t < 7 ? (t - 1) / 6 : 1 - (t - 7) / 2 });
  for (const rich of [false, true]) {
    const r = note(82.4, 0, { dur: 10, rich, params: moves });
    L.wav('/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad/k-amo/demo/node-ysweep-' + (rich ? 'L3' : 'L1') + '.wav', r.L, r.R, SR);
  }
}
