/* =====================================================================
   Worklet engines – one shared AudioWorklet module (klang SPEC §2)
   ===================================================================== */
// Everything inside myzelDsp() runs in the AudioWorklet scope: it is copied by toString() into one Blob module (as
// genTexture goes into the worker), so it must not touch anything outside itself. One scope per audio context: the
// tables are built once and shared by every voice. A processor is exciter + resonator only – envelopes, pan and bus
// stay native on the voice (v.out), so stealing, vFade, the mixer and recordings treat these voices like any other.
function myzelDsp() {
  // @include js/dsp/blocks.js
  // @include js/dsp/rs-wasm.js
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
  // @include js/dsp/ring.js
  // @include js/dsp/touche-fx.js
  // @include js/dsp/handpan.js
  // @include js/dsp/gamelan.js
  // @include js/dsp/sitar.js
  // @include js/dsp/tabla.js
  // @include js/dsp/didgeridoo.js
  // @include js/dsp/maultrommel.js
  // @include js/dsp/aetherwelle.js
  // @include js/dsp/nordlicht.js
  // @include js/dsp/schimmer.js
  // @include js/dsp/walgesang.js
  // @include js/dsp/endlostreppe.js
  // @include js/dsp/attraktor.js
  // @include js/dsp/tunnel.js
  // @include js/dsp/westkueste.js
  // @include js/dsp/schaltkreis.js
  // @include js/dsp/kassette.js
  // @include js/dsp/achtbit.js
  // @include js/dsp/gleitbass.js
  // @include js/dsp/zischel.js
  // @include js/dsp/silbe.js
  // @include js/dsp/spieluhr.js
  // @include js/dsp/koto.js
  // @include js/dsp/saettigung.js
  // @include js/dsp/kompressor.js
  // @include js/dsp/begrenzer.js
  // @include js/dsp/effekte.js
  // @include js/dsp/harmonizer.js
  // an empty voice: the per-node price of the contract (SPEC §8 step 1 gate, ≈ 0.06 + 0.03 per param)
  class Null extends MyzelProc { render(L, R, a, b) { for (let i = a; i < b; i++) L[i] = 0; } }
  for (const [k, C] of [['myzel-blow', Blow], ['myzel-scan', Scan], ['myzel-bow', Bow], ['myzel-rot', Rot], ['myzel-aeol', Aeol], ['myzel-gendy', Gendy], ['myzel-web', Web], ['myzel-string', Strg], ['myzel-syrinx', Syrinx], ['myzel-scrape', Scrape], ['myzel-ember', Ember], ['myzel-null', Null], ['myzel-ring', Ring], ['myzel-ring-in', RingIn], ['myzel-wsend', WSend], ['myzel-tfx', Tfx], ['myzel-hng', Hng], ['myzel-gml', Gml], ['myzel-sit', Sit], ['myzel-tbl', Tbl], ['myzel-did', Did], ['myzel-mtr', Mtr], ['myzel-nrd', Nrd], ['myzel-sht', Sht], ['myzel-ond', Ond], ['myzel-wal', Wal], ['myzel-stp', Stp], ['myzel-atr', Atr], ['myzel-tnl', Tnl], ['myzel-wkg', Wkg], ['myzel-bnt', Bnt], ['myzel-kas', Kas], ['myzel-bit', Bit], ['myzel-gbs', Gbs], ['myzel-hht', Hht], ['myzel-vox', Vox], ['myzel-spu', Spu], ['myzel-kto', Kto], ['myzel-sat', Sat], ['myzel-komp', Komp], ['myzel-lim', Lim], ['myzel-netz', Netz], ['myzel-wolke', Wolke], ['myzel-spek', Spektral], ['myzel-oktav', Oktav], ['myzel-vokal', Vokal], ['myzel-flecht', Flecht], ['myzel-trans', Trans], ['myzel-harmo', Harmo]]) registerProcessor(k, C);
  return { SIN, NOISE, Reso, Biquad, Allpass1, OnePole, DcBlock, FracDelay, PRNG };   // (for later processors; unused here)
}
// end myzelDsp
