/* =====================================================================
   Worklet engines – one shared AudioWorklet module (klang SPEC §2)
   ===================================================================== */
// Everything inside myzelDsp() runs in the AudioWorklet scope: it is copied by toString() into one Blob module (as
// genTexture goes into the worker), so it must not touch anything outside itself. One scope per audio context: the
// tables are built once and shared by every voice. A processor is exciter + resonator only – envelopes, pan and bus
// stay native on the voice (v.out), so stealing, vFade, the mixer and recordings treat these voices like any other.
function myzelDsp() {
  // @include js/dsp/blocks.js
  // @include js/dsp/contract.js
  // @include js/dsp/halm.js
  // @include js/dsp/ranke.js
  // @include js/dsp/harz.js
  // @include js/dsp/moder.js
  // @include js/dsp/boee.js
  // @include js/dsp/amoebe.js
  // @include js/dsp/gespinst.js
  // @include js/dsp/sehne.js
  // @include js/dsp/kehlchen.js
  // @include js/dsp/zapfen.js
  // @include js/dsp/glut.js
  // @include js/dsp/rs-wasm.js
  // @include js/dsp/ring.js
  // an empty voice: the per-node price of the contract (SPEC §8 step 1 gate, ≈ 0.06 + 0.03 per param)
  class Null extends MyzelProc { render(L, R, a, b) { for (let i = a; i < b; i++) L[i] = 0; } }
  for (const [k, C] of [['myzel-blow', Blow], ['myzel-scan', Scan], ['myzel-bow', Bow], ['myzel-rot', Rot], ['myzel-aeol', Aeol], ['myzel-gendy', Gendy], ['myzel-web', Web], ['myzel-string', Strg], ['myzel-syrinx', Syrinx], ['myzel-scrape', Scrape], ['myzel-ember', Ember], ['myzel-null', Null], ['myzel-ring', Ring], ['myzel-ring-in', RingIn], ['myzel-wsend', WSend]]) registerProcessor(k, C);
  return { SIN, NOISE, Reso, Biquad, Allpass1, OnePole, DcBlock, FracDelay, PRNG };   // (for later processors; unused here)
}
// end myzelDsp
