// the real worklet processors in Node: myzel-dsp.js with its @includes from a source tree (SRC), stubs for the scope
const fs = require('fs'), path = require('path');
module.exports = function load(SRC, sr = 48000) {
  const exp = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\s*\/\/ @include (\S+)\s*$/gm, (_, p) => exp(p));
  const src = exp('js/dsp/myzel-dsp.js');
  const procs = {};
  class AWP { constructor() { this.port = { postMessage: () => {}, onmessage: null }; } }
  const fn = new Function('sampleRate', 'AudioWorkletProcessor', 'registerProcessor', 'currentTime', 'currentFrame', src + '\nreturn myzelDsp;');
  const my = fn(sr, AWP, (k, C) => { procs[k] = C; }, 0, 0);
  my();
  return procs;
};
