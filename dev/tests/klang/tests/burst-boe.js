// Böe: the gust-pluck in Node – level inside the gate (max of 20-ms windows) vs a held note's RMS (0.6–1.1 s), the
// onset (first 10 ms) vs the gate's end, the ring after the gate (time to −40 dB), at a few gates/pitches; the wind's
// share (rauschen 0 vs as is) inside the gate.   node burst-boe.js
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const PRM = JSON.parse(process.env.PRM || '{}');
const one = (f, y, o) => L.render(D, { name: 'myzel-aeol', po: { seed: 5, prm: Object.assign({}, PRM, o.prm || {}) }, dur: o.dur || 3, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 77, burst: !!o.gate, gate: o.gate }]] });
for (const f of [110, 440, 1320]) {
  const h = one(f, 0.6, {}), held = L.rms(h.L, 0.6 * SR, 1.1 * SR), hs = one(f, 0.6, { prm: { rauschen: 0 } }); console.log(`held: strings ${(L.db(L.rms(hs.L, 0.6 * SR, 2.5 * SR)) - L.db(L.rms(h.L, 0.6 * SR, 2.5 * SR))).toFixed(1)} dB of all`);
  const rows = [];
  for (const g of [0.06, 0.112, 0.22, 0.5]) {
    const x = one(f, 0.6, { gate: g }), e = L.env(x.L.subarray(0, g * SR), SR, 0.02), mx = Math.max(...e);
    const on = L.rms(x.L, 0, 0.01 * SR), end = L.rms(x.L, (g - 0.02) * SR, g * SR);
    const e2 = L.env(x.L, SR, 0.01); let t40 = null; for (let i = Math.round(g / 0.01); i < e2.length; i++) if (L.db(e2[i]) < L.db(end) - 40) { t40 = (i * 0.01 - g).toFixed(2); break; }
    const nw = one(f, 0.6, { gate: g, prm: { rauschen: 0 } }), sw = L.rms(nw.L, 0, g * SR), aw = L.rms(x.L, 0, g * SR);
    rows.push(`gate ${g}: max ${(L.db(mx) - L.db(held)).toFixed(1)} dB vs held, onset ${(L.db(on) - L.db(end)).toFixed(1)} vs end, −40 dB ${t40} s after, strings ${(L.db(sw) - L.db(aw)).toFixed(1)} dB of all, peak ${L.db(L.peak(x.L)).toFixed(1)}`);
  }
  console.log(`${f} Hz (held RMS ${L.db(held).toFixed(1)} dB):\n  ` + rows.join('\n  '));
}
