// Harz: Puls strokes (burst with gate) – the level inside the gate vs held, the ring after; release T60 vs Dämpfung
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const hrzT60 = (v) => 0.4 + 6 * (1 - v) * (1 - v), ring = { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 };
for (const body of ['glas', 'schale', 'stab', 'zunge', 'teich']) {
  const f = 440, y = 0.6;
  const held = L.render(D, { name: 'myzel-bow', po: { prm: { koerper: body }, seed: 3 }, dur: 1.5, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 7 }]] });
  const hr = L.rms(held.L, 0.9 * SR, 1.4 * SR);
  const row = [];
  for (const g of [0.06, 0.112, 0.22, 0.5]) {
    const r = L.render(D, { name: 'myzel-bow', po: { prm: { koerper: body }, seed: 3 }, dur: 1.5, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, burst: true, gate: g, seed: 7 }]] });
    const e = L.env(r.L.subarray(0.05 * SR, (0.05 + g) * SR), SR, 0.02); const mx = Math.max(...e);
    row.push(`${g * 1000}ms ${(L.db(mx) - L.db(hr)).toFixed(1)} dB`);
  }
  // release: the ring's T60 on mode 1 after the bow lifts at 1.0 s (daempfung 0.6 and 0.2)
  const rel = [];
  for (const dmp of [0.6, 0.2]) {
    const r = L.render(D, { name: "myzel-bow", po: { prm: { koerper: body, daempfung: dmp }, seed: 3 }, dur: 14, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 7 }], [1.0, { off: 1.0 }]] });
    const e = L.env(r.L, SR, 0.01).map(L.db), a = 105; // 1.05 s
    let t20 = null; for (let i = a; i < e.length; i++) if (e[i] < e[a] - 20) { t20 = (i - a) * 0.01; break; }
    rel.push(`dmp ${dmp}: T60 ≈ ${t20 == null ? '>8' : (3 * t20).toFixed(2)} s (map ${(hrzT60(dmp) * ring[body]).toFixed(2)})${r.alive ? '' : ' done ' + (r.done).toFixed(2)}`);
  }
  console.log(body.padEnd(7), row.join('  '), '|', rel.join('  '));
}
