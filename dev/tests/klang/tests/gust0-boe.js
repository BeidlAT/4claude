// Böe: the touch's initial gust – SPEC's (gust = vel added to w) against the built ×0.4: how far it lifts the shedding
// above the finger's string and how long until the finger's own string has caught (vel 0.75, Böen 0, y at string 3)
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
for (const g0 of ['0.4', '1']) {
  const D = L.loadDsp(SR, base.split('AEOL_G0 = 0.4').join('AEOL_G0 = ' + g0)), C = D.procs['myzel-aeol'];
  const y = (3 - 0.7) / 7 / 0.9, node = new C({ processorOptions: { prm: { boeen: 0 }, seed: 5 } });
  node.port.onmessage({ data: { on: 0, f: 220, y, vel: 0.75, seed: 77 } });
  const P = { freq: [220], detune: [0], hoehe: [y] }; let mx = 0, t3 = null; const seen = [];
  for (let b = 0; b < 375 * 3; b++) { D.scope.currentTime = b * 128 / SR; node.process([], [[new Float32Array(128)]], P); mx = Math.max(mx, node.rt); if (node.cap && seen[seen.length - 1] !== node.cap) seen.push(node.cap); if (t3 == null && b > 10 && node.cap === 3) t3 = b * 128 / SR; }
  console.log(`G0 ${g0}: the shedding up to ${mx.toFixed(2)} harmonics (finger at 3), strings caught on the way ${seen.join(' → ')}, the finger's string from ${t3 && t3.toFixed(2)} s`);
}
