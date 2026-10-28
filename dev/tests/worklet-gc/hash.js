// the processors' output, hashed: a note held 1.5 s, let go, 0.5 s on – to prove a change bit-identical.  DSP=… node hash.js
const SR = 48000, reg = {};
Object.assign(globalThis, { sampleRate: SR, currentTime: 0, currentFrame: 0, registerProcessor: (k, C) => { reg[k] = C; } });
globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
let seed = 1; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
require(process.env.DSP || './dsp.js')();
const skip = new Set(['myzel-ring', 'myzel-ring-in', 'myzel-wsend', 'myzel-tfx', 'myzel-null']);
const out = {};
for (const name of Object.keys(reg).filter((k) => !skip.has(k))) {
  seed = 1; globalThis.currentTime = 0; globalThis.currentFrame = 0;
  for (const [f, y] of [[220, 0.6], [880, 0.2], [110, 0.9]]) {
    const C = reg[name], p = new C({ processorOptions: { on: { on: 0, f, y, vel: 0.8, seed: 7 }, seed: 7, rich: f === 880 } });
    const L = new Float32Array(128), R = new Float32Array(128), outs = [[L, R]], prm = { freq: [f], detune: [0], hoehe: [y] };
    let h = 2166136261;
    const u = new Uint32Array(L.buffer), w = new Uint32Array(R.buffer);
    for (let b = 0; b < 750; b++) {
      if (b === 560) p.port.onmessage && p.port.onmessage({ data: { off: globalThis.currentTime, k: 1 } });
      if (b === 300) p.port.onmessage && p.port.onmessage({ data: { set: { tiefe: 0.7, farbe: 0.3 } } });
      L.fill(0); R.fill(0);
      try { p.process([[]], outs, prm); } catch (e) { h = 'err ' + e.message; break; }
      globalThis.currentTime += 128 / SR; globalThis.currentFrame += 128;
      for (let i = 0; i < 128; i++) { h = Math.imul(h ^ u[i], 16777619); h = Math.imul(h ^ w[i], 16777619); }
    }
    out[name] = (out[name] || '') + (typeof h === 'number' ? (h >>> 0).toString(16) : h) + ' ';
  }
}
console.log(JSON.stringify(out));
