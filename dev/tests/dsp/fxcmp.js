// Node-Prüfstand der Worklet-Prozessoren: node fxcmp.js <processor> [opts] [msg] [s] (alt = ./old/myzel/src, z. B. git archive HEAD myzel/src | tar -x -C old) · node harmo.js (Harmonizer)
// old against new: the same input (noise with bursts) through a processor of each tree – largest difference and time
const ENV = (k) => (process.env.QUIET ? ((k % 24000) < 6000 ? 0.5 : 0.1) : (k % 24000) < 6000 ? 0.9 : 0.15);
const load = require('./harness');
const [OLD, NEW] = [__dirname + '/old/myzel/src', '/home/user/4claude/myzel/src'];
const name = process.argv[2], opts = JSON.parse(process.argv[3] || '{}'), msg = JSON.parse(process.argv[4] || 'null'), secs = +(process.argv[5] || 10);
function run(SRC) {
  const P = load(SRC), C = P[name], nd = new C({ processorOptions: opts });
  if (msg && nd.port.onmessage) nd.port.onmessage({ data: msg });
  let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
  const n = 128, blocks = Math.round(secs * 48000 / n), oL = new Float32Array(blocks * n), oR = new Float32Array(blocks * n);
  const iL = new Float32Array(n), iR = new Float32Array(n), O = [new Float32Array(n), new Float32Array(n)];
  let t = 0;
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < n; i++) { const k = b * n + i, env = ENV(k); iL[i] = rnd() * env * 0.6 + Math.sin(k * 0.05) * env * 0.4; iR[i] = rnd() * env * 0.6 + Math.sin(k * 0.031) * env * 0.4; }
    const t0 = process.hrtime.bigint(); nd.process([[iL, iR]], [O], {}); t += Number(process.hrtime.bigint() - t0);
    oL.set(O[0], b * n); oR.set(O[1], b * n);
  }
  return { oL, oR, ms: t / 1e6 };
}
const a = run(OLD), b = run(NEW);
let d = 0, pk = 0; for (let i = 0; i < a.oL.length; i++) { d = Math.max(d, Math.abs(a.oL[i] - b.oL[i]), Math.abs(a.oR[i] - b.oR[i])); pk = Math.max(pk, Math.abs(a.oL[i])); }
console.log(name, JSON.stringify(opts), 'diff', d === 0 ? 'bitgleich' : (20 * Math.log10(d / pk)).toFixed(1) + ' dB re peak', 'peak', pk.toFixed(3), 'time old', a.ms.toFixed(0), 'new', b.ms.toFixed(0), 'ms ×' + (a.ms / b.ms).toFixed(2));
