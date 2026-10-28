// bytes a processor allocates when it is made (one note) – its buffers and tables
const inspector = require('node:inspector');
const SR = 48000, reg = {};
Object.assign(globalThis, { sampleRate: SR, currentTime: 0, currentFrame: 0, registerProcessor: (k, C) => { reg[k] = C; } });
globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
require(process.env.DSP || './dsp.js')();
const skip = new Set(['myzel-ring', 'myzel-ring-in', 'myzel-wsend', 'myzel-tfx', 'myzel-null']);
const sess = new inspector.Session(); sess.connect();
const post = (m, p) => new Promise((res) => sess.post(m, p || {}, (e, r) => res(r)));
(async () => {
  const out = [];
  for (const name of Object.keys(reg).filter((k) => !skip.has(k))) {
    const C = reg[name], mk = () => new C({ processorOptions: { on: { on: 0, f: 220, y: 0.6, vel: 0.8, seed: 7 }, seed: 7 } });
    const outs = [[new Float32Array(128), new Float32Array(128)]], prm = { freq: [220], detune: [0], hoehe: [0.6] };
    for (let i = 0; i < 5; i++) { const p = mk(); for (let j = 0; j < 800; j++) p.process([[]], outs, prm); }   // (shared tables built once)
    await post('HeapProfiler.enable'); await post('HeapProfiler.startSampling', { samplingInterval: 512, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true });
    const N = 40; for (let i = 0; i < N; i++) { const p = mk(); p.process([[]], outs, prm); }
    const { profile } = await post('HeapProfiler.stopSampling'); let tot = 0; const w = (n) => { tot += n.selfSize; n.children.forEach(w); }; w(profile.head);
    const agg = new Map(); const w2 = (n) => { if (n.selfSize) { const k = (n.callFrame.functionName || "(anon)") + ":" + (n.callFrame.lineNumber + 1); agg.set(k, (agg.get(k) || 0) + n.selfSize); } n.children.forEach(w2); }; w2(profile.head);
    out.push([name, Math.round(tot / N / 1024), [...agg].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + " " + Math.round(v / N / 1024)).join(" | ")]);
  }
  out.sort((a, b) => b[1] - a[1]); console.log(out.map((x) => x[0] + " " + x[1] + " kB  " + x[2]).join('\n'));
})();
