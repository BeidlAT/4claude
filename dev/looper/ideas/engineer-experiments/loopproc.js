// A prototype of the proposed looper processor ("myzel-loop"), reduced to what the experiments need:
//  - N stereo inputs, a mask of which are captured; capture into an always-on ring (preallocated);
//  - layers playing from buffers; pass boundaries derived from the clock (a piecewise-linear beat map sent from the main
//    thread: segments {f, b, fpb}), never from a running counter – pass k of a layer starts at frame round(F(b0 + k·beats));
//  - at each boundary the continuation of the ending pass is joined to the next pass's start: overlap-add (cold start)
//    or an equal-power crossfade over X frames (warm start);
//  - a "naive" layer type for comparison: an integer-length buffer looped by a counter (what drifts).
// Exported as a string so it can be put in a Blob module.
module.exports = String.raw`
class LoopProc extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const po = o.processorOptions || {};
    this.fOff = po.fOffset || 0; this.nIn = po.nIn || 1; this.mask = po.mask == null ? 1 : po.mask;
    this.ringN = po.ringFrames || 48000 * 60; this.rL = new Float32Array(this.ringN); this.rR = new Float32Array(this.ringN); this.w = 0;
    this.seg = po.clock || [{ f: 0, b: 0, fpb: 48000 * 60 / 84 }];
    this.layers = [];
    this.stat = { blocks: 0 };
    this.port.onmessage = (e) => { const m = e.data; if (m.layer) this.addLayer(m.layer); if (m.clock) this.seg = this.seg.concat(m.clock); if (m.ask) this.port.postMessage({ stat: this.stat, layers: this.layers.map((l) => ({ k: l.k, s0: l.s0, s1: l.s1 })) }); };
    for (const ly of po.layers || []) this.addLayer(ly);
  }
  // beat → frame on the piecewise-linear clock (double precision; segments in increasing f)
  frameAt(b) {
    const s = this.seg; let i = s.length - 1;
    while (i > 0 && s[i].b > b) i--;
    return s[i].f + (b - s[i].b) * s[i].fpb;
  }
  addLayer(ly) {
    // ly: {L, R, body (frames held for one pass incl. continuation: L.length), b0 (beat of pass 0), beats (per pass),
    //      X (crossfade frames), join: 'ola' | 'xf', gain, naive: bool, P (naive: integer period)}
    ly.k = 0; ly.s0 = Math.round(this.frameAt(ly.b0)); ly.s1 = Math.round(this.frameAt(ly.b0 + ly.beats)); ly.prevLen = 0; ly.prevS = 0;
    ly.gain = ly.gain == null ? 1 : ly.gain;
    if (ly.naive) { ly.s0 = Math.round(this.frameAt(ly.b0)); }
    this.layers.push(ly);
  }
  process(inputs, outputs) {
    const out = outputs[0], OL = out[0], OR = out[1] || out[0], n = OL.length, F0 = currentFrame + (this.fOff || 0);
    this.stat.blocks++;
    // ---- capture: the masked inputs summed into the ring ----
    let w = this.w; const rL = this.rL, rR = this.rR, N = this.ringN;
    for (let i = 0; i < this.nIn; i++) {
      if (!(this.mask & (1 << i))) continue;
      const inp = inputs[i]; if (!inp || !inp.length) continue;
      const a = inp[0], b = inp[1] || inp[0];
      let p = w;
      if (i === 0 || !(this.mask & ((1 << i) - 1))) { for (let k = 0; k < n; k++) { rL[p] = a[k]; rR[p] = b[k]; if (++p === N) p = 0; } }
      else { for (let k = 0; k < n; k++) { rL[p] += a[k]; rR[p] += b[k]; if (++p === N) p = 0; } }
    }
    this.w = (w + n) % N;
    // ---- playback ----
    for (let k = 0; k < n; k++) { OL[k] = 0; if (OR !== OL) OR[k] = 0; }
    for (const ly of this.layers) {
      const L = ly.L, R = ly.R || ly.L, g = ly.gain;
      if (ly.naive) {   // counter looping: index = (F − s0) mod P (P integer)
        const P = ly.P;
        let idx = (((F0 - ly.s0) % P) + P) % P;
        for (let k = 0; k < n; k++) { OL[k] += g * L[idx]; if (OR !== OL) OR[k] += g * R[idx]; if (++idx === P) idx = 0; }
        continue;
      }
      let f = F0, k = 0;
      while (k < n) {
        if (f >= ly.s1) {   // a new pass begins at the clock's bar line, re-derived from the beat map (no accumulation)
          ly.prevS = ly.s0; ly.prevLen = ly.s1 - ly.s0; ly.k++; ly.s0 = ly.s1; ly.s1 = Math.round(this.frameAt(ly.b0 + (ly.k + 1) * ly.beats));
          if (ly.onPass) ly.onPass(ly);
        }
        const end = Math.min(n, k + (ly.s1 - f));
        const X = ly.X, join = ly.join, body = L.length;
        for (; k < end; k++, f++) {
          const j = f - ly.s0;                 // position in this pass
          let l = j < body ? L[j] : 0, r = j < body ? R[j] : 0;
          if (ly.k > 0) {
            const c = ly.prevLen + j;          // the continuation of the previous pass at the same moment
            if (join === 'ola') { if (c < body) { l += L[c]; r += R[c]; } }
            else if (j < X) {
              const x0 = (j + 0.5) / X, x = ly.law === 'smooth' ? 0.5 - 0.5 * Math.cos(Math.PI * x0) : x0, gi = Math.sin(0.5 * Math.PI * x), go = Math.cos(0.5 * Math.PI * x);
              l = gi * l + (c < body ? go * L[c] : 0); r = gi * r + (c < body ? go * R[c] : 0);
            }
          }
          OL[k] += g * l; if (OR !== OL) OR[k] += g * r;
        }
      }
    }
    return true;
  }
}
registerProcessor('myzel-loop-proto', LoopProc);
`;
