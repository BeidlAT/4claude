// Moder demos (the processor alone, level 3 stereo, no effects): single hits dry → wet, the three bodies, a long
// Nachklang, Knistern 1, a fast Puls lane – WAV + spectrogram in ../demo/.   node demo-mdr.js
const L = require('./dsplib');
const path = require('path');
const SR = 48000, D = L.loadDsp(SR), C = D.procs['myzel-rot'], OUT = path.join(__dirname, '..', 'demo');
// hits: [t, f, y, vel, prm, life, sc]; each its own node, summed (as the app's voices)
function scene(name, dur, hits) {
  const n = Math.ceil(dur * SR / 128) * 128, Lo = new Float32Array(n), Ro = new Float32Array(n);
  for (const [t0, f, y, vel, prm, life, sc] of hits) {
    const node = new C({ processorOptions: { rich: true, prm: prm || {}, seed: (t0 * 1000) | 1, on: { on: 0, f, y, vel, life, sc, seed: ((t0 * 7919) | 0) + 1 } } });
    const P = { freq: [f], detune: [0], hoehe: [y] };
    for (let b = Math.round(t0 * SR / 128) * 128; b < n; b += 128) {
      D.scope.currentTime = 0; const Lb = new Float32Array(128), Rb = new Float32Array(128);
      if (!node.process([], [[Lb, Rb]], P)) break;
      for (let i = 0; i < 128; i++) { Lo[b + i] += 0.45 * Lb[i]; Ro[b + i] += 0.45 * Rb[i]; }
    }
  }
  const f = path.join(OUT, name + '.wav'); L.wav(f, Lo, Ro, SR); L.spectro(f);
  console.log(name, 'peak', L.db(Math.max(L.peak(Lo), L.peak(Ro))).toFixed(1), 'dBFS');
}
scene('hit-dry-y0', 6, [[0.1, 196, 0, 0.8]]);
scene('hit-wet-y07', 6, [[0.1, 196, 0.7, 0.8]]);
scene('hit-soaked-y1', 6, [[0.1, 196, 1, 0.9, { schwellen: 0.9 }]]);
scene('bodies-glocke-holz-knochen', 16, [[0.1, 220, 0.7, 0.8, { koerper: 'glocke' }], [5.4, 220, 0.7, 0.8, { koerper: 'holz' }], [10.7, 220, 0.7, 0.8, { koerper: 'knochen' }]]);
scene('nachklang-12s', 13, [[0.1, 147, 0.75, 0.8, { nachklang: 12 }]]);
scene('knistern-1', 6, [[0.1, 262, 0.8, 0.8, { knistern: 1 }]]);
const lane = []; for (let j = 0; j < 32; j++) lane.push([0.1 + j * 0.125, [196, 220, 262, 294, 330][(j * 3) % 5], 0.6, 0.7, {}, 1.25, 6]);
scene('lane-8-per-s', 6, lane);
