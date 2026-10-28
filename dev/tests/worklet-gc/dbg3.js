// as bench.js: three voices of one processor warmed one after another, then all three run (the code V8 ends with)
const SR = 48000, reg = {};
Object.assign(globalThis, { sampleRate: SR, currentTime: 0, currentFrame: 0, registerProcessor: (k, C) => { reg[k] = C; } });
globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
require(process.env.DSP || './dsp.js')();
const C = reg[process.argv[2]];
const mk = () => new C({ numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { on: { on: 0, f: 220, y: 0.6, vel: 0.8, seed: 7 }, seed: 7 } });
const outs = [[new Float32Array(128), new Float32Array(128)]], ins = [[]], prm = { freq: new Float32Array([220]), detune: new Float32Array([0]), hoehe: new Float32Array([0.6]) };
const run = (p, nb) => { for (let i = 0; i < nb; i++) { globalThis.currentTime += 128 / SR; p.process(ins, outs, prm); } };
const P = [mk(), mk(), mk()]; for (const p of P) run(p, 3000); for (const p of P) run(p, 3000);
