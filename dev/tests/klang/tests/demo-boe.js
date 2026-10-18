// Böe demos from the processor alone (Node; no effects, no native envelope): WAV + spectrogram in k-boe/demo/
//   sweep: up through the strings in 6 s and back to y 0.3 – the chord of memory; held: 24 s at y 0.45 (walk, gusts);
//   puls: gust-plucks every 0.25 s across the field; dead: the wind between strings 1 and 2.
const L = require('./dsplib'), path = require('path');
const SR = 48000, D = L.loadDsp(SR), OUT = path.join(__dirname, '..', 'demo');
const C = D.procs['myzel-aeol'];
function run(o) {
  const node = new C({ processorOptions: { rich: o.rich !== false, prm: o.prm || {}, seed: 5 } });
  const n = Math.ceil(o.dur * SR / 128), Lo = new Float32Array(n * 128), Ro = new Float32Array(n * 128), P = { freq: [o.f], detune: [0], hoehe: [0] };
  for (const [t, m] of o.msgs) if (t === 0) node.port.onmessage({ data: m });
  for (let b = 0; b < n; b++) {
    const t = b * 128 / SR; D.scope.currentTime = t; P.hoehe[0] = o.yAt(t);
    for (const [tm, m] of o.msgs) if (tm > 0 && tm >= t && tm < t + 128 / SR) node.port.onmessage({ data: m });
    const l = new Float32Array(128), r = new Float32Array(128);
    node.process([], [[l, r]], P); Lo.set(l, b * 128); Ro.set(r, b * 128);
  }
  return { L: Lo, R: Ro };
}
const save = (name, x) => { const f = path.join(OUT, name + '.wav'); L.wav(f, x.L, x.R, SR); console.log(f, L.spectro(f)); };
save('sweep-L3', run({ f: 147, dur: 16, yAt: (t) => (t < 0.5 ? 0.05 : t < 6.5 ? 0.05 + 0.8 * (t - 0.5) / 6 : 0.3), msgs: [[0, { on: 0, f: 147, y: 0.05, vel: 0.75, seed: 31 }], [12, { off: 12 }]] }));
save('held-24s-L3', run({ f: 196, dur: 24, yAt: () => 0.45, msgs: [[0, { on: 0, f: 196, y: 0.45, vel: 0.75, seed: 32 }], [20, { off: 20 }]] }));
save('dead-zone-L3', run({ f: 220, dur: 8, prm: { boeen: 0 }, yAt: () => 0.119, msgs: [[0, { on: 0, f: 220, y: 0.119, vel: 0.75, seed: 33 }]] }));
{ // Puls: separate voices summed
  const dur = 6, Lo = new Float32Array(dur * SR), Ro = new Float32Array(dur * SR);
  for (let j = 0; j < 20; j++) { const t0 = 0.1 + j * 0.25, f = [147, 196, 220, 294, 330][j % 5], y = (j * 0.37) % 1; const x = run({ f, dur: dur - t0, yAt: () => y, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 40 + j, burst: true, gate: 0.11 }]] }); const a = Math.round(t0 * SR); for (let i = 0; i < x.L.length && a + i < Lo.length; i++) { Lo[a + i] += 0.5 * x.L[i]; Ro[a + i] += 0.5 * x.R[i]; } }
  save('puls-L3', { L: Lo, R: Ro });
}
