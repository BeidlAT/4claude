// Audio-thread garbage per processor: the worklet module run in Node with a stub AudioWorklet scope; V8's sampling
// heap profiler over N blocks of one held note → bytes per second of audio, and the allocating functions.
//   node bench.js [names…]    (DSP=dsp.js, built from hx-inst/index.html)
const inspector = require('node:inspector');
const SR = 48000;
const reg = {};
Object.assign(globalThis, { sampleRate: SR, currentTime: 0, currentFrame: 0, registerProcessor: (k, C) => { reg[k] = C; } });
globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
require(process.env.DSP || './dsp.js')();
const skip = new Set(['myzel-ring', 'myzel-ring-in', 'myzel-wsend', 'myzel-tfx', 'myzel-null', 'myzel-tap', 'hx-tap']);
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(reg).filter((k) => !skip.has(k));
const sess = new inspector.Session(); sess.connect();
const post = (m, p) => new Promise((res, rej) => sess.post(m, p || {}, (e, r) => (e ? rej(e) : res(r))));
(async () => {
  const out = [];
  for (const name of names) {
    const C = reg[name]; if (!C) { console.log('no', name); continue; }
    const mk = () => new C({ numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { on: { on: 0, f: 220, y: 0.6, vel: 0.8, seed: 7 }, seed: 7 } });
    const outs = [[new Float32Array(128), new Float32Array(128)]], ins = [[]], prm = { freq: new Float32Array([220]), detune: new Float32Array([0]), hoehe: new Float32Array([0.6]) };
    const run = (p, nb) => { for (let i = 0; i < nb; i++) { globalThis.currentTime += 128 / SR; globalThis.currentFrame += 128; try { p.process(ins, outs, prm); } catch (e) { return e; } } };
    // several voices, as an arp leaves them sounding; warm up (the optimiser), then sample
    let P = [mk(), mk(), mk()];
    let err = run(P[0], +(process.env.WARM||3000)) || run(P[1], +(process.env.WARM||3000)) || run(P[2], +(process.env.WARM||3000)) || run(P[0], +(process.env.WARM||3000));
    if (err) { out.push([name, 'error ' + err.message]); continue; }
    await post('HeapProfiler.enable');
    await post('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    const NB = 3000;
    for (const p of P) run(p, NB);
    const { profile } = await post('HeapProfiler.stopSampling');
    const agg = new Map(); let tot = 0;
    const walk = (n) => { const f = n.callFrame; if (n.selfSize) { const k = (f.functionName || '(anon)') + ':' + (f.lineNumber + 1); agg.set(k, (agg.get(k) || 0) + n.selfSize); tot += n.selfSize; } n.children.forEach(walk); };
    walk(profile.head);
    const secs = P.length * NB * 128 / SR;   // voice-seconds
    out.push([name, (tot / secs / 1e3).toFixed(1) + ' kB per voice-second', [...agg].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' ' + (v / secs / 1e3).toFixed(1)).join(' | ')]);
  }
  for (const r of out) console.log(r.join('  '));
})();
