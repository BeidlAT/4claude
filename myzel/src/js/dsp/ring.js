  // ---- Hexenring: myzel-ring – the looper on the audio thread (dev/looper/SPEC.md §3) ----
  // Two Humus rings (input 0 „Gespielt“, input 1 „Alles“) in chunks of 8192 frames that the page made and moved over;
  // Schleifen whose pass k starts at F(k) = round(frameAt(b0 + k·beats)) on the Taktgeber's segments (derived afresh
  // every pass, never counted: nothing drifts, a tempo change moves the next start and no other); Schichten read from
  // chunk lists and joined at every seam, mute, undo and swap by the smooth equal-power law g_in = sin(π/2·s),
  // g_out = cos(π/2·s), s = (1 − cos πx)/2; an Ausklang (the stored continuation behind the window) overlap-added from
  // a Schicht's second seam on; one polyphase windowed-sinc resampler (32 taps × 256 phases, Kaiser β 8) for {rate}.
  // It counts its own frames (currentFrame can stall), reports {frame, t} every 0.25 s, plays on while the page hangs
  // and never allocates a buffer in process(): every buffer comes from the page, the scratch is made here once.
  const RS_T = 32, RS_N = 256, RS_C = RS_T / 2 - 1, HP = Math.PI / 2, RINGS = {};   // (RINGS: the Rings by rid, for myzel-ring-in)
  const HX_TN = 16;   // tail streams a Schicht reads at once (step 2a: a Wuchs pass's tail rings under up to 15 passes after it)
  let RS = null;   // (RS_N + 1) × RS_T: phase p / RS_N of a frame, tap t at offset t − 15 − p / RS_N
  // (step 2b) a tape read faster than its own rate (speed steps up a fifth or an octave, their servo's overshoot) needs
  // the cut-off below the output's Nyquist: kernels for rates to 1.6 and to 2.4, as many taps more as the band is
  // narrower – nothing folds down; up to 1.03 (Taumeln, the clock) the shared one
  let RSK = null;
  // (cut: the pass band as a share of the source's Nyquist; NT taps, Kaiser beta – the defaults are the live resampler's;
  // a sample-rate conversion uses a longer kernel of the same design, see rsJob)
  function rsTable(cut, NT, beta) {
    const C = cut || 1, N = NT || RS_T, CC = N / 2 - 1;
    const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 60; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; if (t < 1e-13 * s) break; } return s; };
    const B = beta || 8, ib = 1 / I0(B), T = new Float32Array((RS_N + 1) * N);
    for (let p = 0; p <= RS_N; p++) {
      let sum = 0;
      const row = new Float64Array(N);
      for (let t = 0; t < N; t++) {
        const d = t - CC - p / RS_N, u = d / (N / 2);   // the cut-off at the source's Nyquist: ±1 % keeps the audio band
        const w = Math.abs(u) >= 1 ? 0 : I0(B * Math.sqrt(1 - u * u)) * ib, s = d === 0 ? 1 : Math.sin(Math.PI * d * C) / (Math.PI * d * C);
        row[t] = s * w; sum += s * w;
      }
      for (let t = 0; t < N; t++) T[p * N + t] = row[t] / sum;   // unit gain at DC in every phase: no ripple at the phase rate
    }
    return T;
  }
  // an envelope: v now; a → b over N frames (i done) by the smooth law – to or from 0 equal-power (sin/cos), else s(x)
  const envNew = (v) => ({ v, a: v, b: v, i: 0, N: 0 });
  const envGo = (E, to, N) => { E.a = E.v; E.b = to; E.i = 0; E.N = Math.max(1, N | 0); };
  class Ring extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      if (!RS) RS = rsTable();
      if (!RSK) RSK = { k16: { T: rsTable(0.97 / 1.6, 56, 8), N: 56, C: 27 }, k24: { T: rsTable(0.97 / 2.4, 80, 8), N: 80, C: 39 } };
      let sh = 0; while ((1 << sh) < (po.chunk || 8192)) sh++;
      this.CH = 1 << sh; this.SH = sh; this.M = this.CH - 1;
      this.hN = Math.max(2, Math.ceil((po.humusS || 64) * SR / this.CH));   // chunks per Humus ring
      this.nR = Math.max(2, po.rings | 0 || 2);   // (step 2b: a third ring – the Puls's lanes, for Puls ernten)
      this.nB = po.mic ? this.nR - 1 : this.nR; this.micOn = false;   // (step 4: with po.mic the last ring is the Mikro's – its chunks come when the microphone is first switched on, {pool, ring})
      this.hum = []; this.h0 = []; this.capF = []; for (let i = 0; i < this.nR; i++) { this.hum.push([]); this.h0.push(-1); this.capF.push(-1); }
      this.hOK = false; this.free = [];
      // „Alles“ hears the master's input, the Schleifen included: that path runs through this node's own output, so it
      // is not this node's input (a cycle would need a delay whose length Chrome makes depend on the graph) – a node
      // of its own downstream of the master's input (myzel-ring-in, rid) writes ring 1, at this node's frame count
      this.lv = [0, 0, 0, 0]; this.lvN = 0; this.ext1 = !!po.rid; this.cfOff = 0;
      // Taumeln (step 1c): with po.drift input 1 carries the shared drift (cents) that bends every live voice – read
      // once a render quantum, as the voices' k-rate detune reads it – kept as long as the Humus (one value per 128
      // frames), so a Schicht knows the drift it was played with, and read now against it
      this.drIn = !!(po.drift && po.rid); this.dv = 0; this.dRN = Math.ceil(this.hN * this.CH / 128) + 2; this.dR = this.drIn ? new Float32Array(this.dRN) : null;
      if (po.rid) RINGS[po.rid] = this;
      this.done = 0; this.base = -Infinity; this.fOff = po.fOff || 0; this.F = 0;
      this.NS = 8192; this.sF = new Float64Array(this.NS); this.sB = new Float64Array(this.NS); this.sP = new Float64Array(this.NS); this.nS = 1;
      this.sP[0] = SR * 60 / 84;
      this.loops = []; this.q = []; this.jobs = []; this.streams = {};
      const S = 2048;   // scratch (a render quantum is 128 frames; never assumed)
      // (step 1c: a Schicht plays out of its own output – out 1 dry through the live chain until its baked version is
      // swapped in on out 0 – so each output has its pair under the state's gain and its free pair: V[out] = [bL, bR, tL, tR])
      this.S = S; this.V = [0, 1].map(() => [new Float32Array(S), new Float32Array(S), new Float32Array(S), new Float32Array(S)]); this.used = 0;
      this.gA = new Float32Array(S); this.gB = new Float32Array(S); this.gC = new Float32Array(S); this.gN = new Float32Array(S); this.gD = new Float32Array(S); this.lA = new Float32Array(S); this.sA = new Float32Array(S);
      // (step 1d) reads at one rate and one phase are summed first and resampled once (the resampler is linear: the same
      // sound): per output pair and class – under the state's gain or free – a scratch chunk of the summed source
      // (≤ S · 1.03 + taps frames) and its members; a Schicht de-drifted (Taumeln) reads at the live drift alone, so the
      // Schichten of a loop share one rate. po.noSum / po.noDD: the step-1c paths (the tests' reference)
      this.gS = [0, 1, 2, 3].map(() => [[new Float32Array(this.CH), new Float32Array(this.CH)]]);
      this.gM = [0, 1, 2, 3].map(() => ({ n: 0, r: 0, p: 0, fr: 0, ch: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], tot: new Float64Array(16), d: new Float64Array(16), g: new Float64Array(16) }));
      this.noSum = !!po.noSum; this.noDD = !!po.noDD; this.noMute = !!po.noMute; this.ddPool = !!po.ddPool; this.gvQ = []; this.dvF = 1; this.ddT = null; this.ddBlk = Math.max(16, po.ddBlk | 0 || 64);
      this.wA = new Float32Array(S); this.wG = new Float32Array(S); this.sgA = new Float32Array(S); this.sndW = false;
      this.bG = new Float32Array(S); this.gSl = new Float32Array(S); this.slQ = new Float64Array(3); this.AB = [new Float32Array(S), new Float32Array(S)];   // (step 2b: a stop's fade, a slice's gains, a worn Schicht's own sum)   // (step 1d: Schluss „welkend“, the sends to the loops' own webs)
      this.rep = 0; this.met = 0; this.nA = 0; this.late = 0; this.wpt = []; this.wrep = 0;   // (step 2a: the Werk-Rahmen's ports – the live frame every 0.1 s)
      this.gW = new WeakMap();   // (step 2b: a chunk given back – by what, at which frame – for the tripwire's report)
      this.port.onmessage = (e) => this.msg(e.data);
      for (const m of po.msgs || []) this.msg(m);   // (offline renders: port messages arrive only at a suspend)
    }
    // ---- messages: what has a frame f is queued and acts at that frame; the rest at once ----
    msg(m) {
      if (!m) return;
      if (m.pool) { const H = m.ring != null ? this.hum[m.ring] : null; for (const c of m.pool) { const h = m.ring != null ? (H && H.length < this.hN ? H : null) : this.hum.find((x, i) => i < this.nB && x.length < this.hN); (h || this.free).push(c); } }
      if (this.hum[this.nB - 1].length === this.hN) this.hOK = true;
      // (step 4) the Mikro's ring records only while the microphone is on – switched on again, it starts afresh (nothing
      // before that moment counts: its frames read as lost)
      if (m.mic) { const r = this.nR - 1; if (this.nB < this.nR && this.hum[r].length === this.hN) { this.micOn = !!m.mic.on; if (this.micOn) { this.h0[r] = -1; this.capF[r] = -1; } } }
      if (m.seg) this.seg(m.seg, m.reset);
      if (m.grab) { const g = m.grab; this.jobs.push({ id: g.id, inp: Math.min(this.nR - 1, g.in | 0), f0: Math.round(g.f0), f1: Math.round(g.f1), x: Math.round(g.f0), dst: g.dst || this.take(Math.ceil((g.f1 - g.f0) / this.CH)), lost: 0, drc: g.dr || null }); }
      if (m.rs) {   // a sample-rate conversion (restore): 160 taps, Kaiser β 10 – flat to ≈ 20 kHz, the band above the lower
        // Nyquist stopped (no folding down, no images up); built here, in the message
        const r = m.rs, ratio = +r.ratio;
        this.jobs.push({ id: r.id, rs: 1, ch: r.ch, tot: r.tot, ratio, x: 0, f0: 0, f1: Math.round(r.n), dst: r.dst, blk: Math.max(128, r.blk | 0 || 512), NT: 160, T: ratio !== 1 ? rsTable(0.955 * Math.min(1, 1 / ratio), 160, 10) : null });
      }
      if (m.gate) this.gateSet(m.gate);
      if (m.aus) {   // the seam's character once the page heard the window's end; the Ausklang cut at the first foreign onset
        // (step 2a: it is the Abdruck's – a Wuchs version playing keeps its own Ausklang and join; an Abdruck swap still
        // waiting in the queue takes it, so the Abdruck that comes back has it)
        const a = m.aus, S0 = this.sch(a.schicht), Ts = [];
        if (S0 && !S0.wu) Ts.push(S0);
        if (S0) for (const e of this.q) if (e.kind === 'replace' && e.S && !e.S.wu && e.d.schicht === a.schicht) Ts.push(e.S);
        for (const S of Ts) {
          if (a.len != null) {
            S.aend = S.ddA && S.ddMap ? this.ddInv(S.ddMap, S.pre, S.aoffS + Math.max(0, Math.round(a.len))) : S.aoff + Math.max(0, Math.round(a.len)); S.afd = Math.max(0, Math.round(a.fade || 0));
            const need = Math.max(S.aend, S.pre + S.len + Math.max(S.X, Math.round(0.05 * SR)));   // (a fill still running needs no more than that)
            for (const J of this.jobs) if (J.S === S) J.f1 = Math.min(J.f1, J.f0 + need);
          }
          if (a.join) S.join = a.join;
          if (a.X) S.X = this.xf(a.X);
          if (a.rho != null) S.rho = Math.max(-1, Math.min(1, +a.rho || 0));
          this.seamSet(S, a);
        }
      }
      if (m.loop) { this.loops.push(this.newLoop(m.loop)); if (this.nAcc) this.accLink(); }
      // (±20 ct ≈ ±1.2 %; a straight glide to it over `ramp` frames, 50 ms unless told – Taumeln sends one ≥ 10 times a second)
      // ({schicht}: that Schicht's own rate on top of its loop's – Taumeln; {loop}: the loop's – MIDI clock nachführen)
      if (m.rate) for (const R of [].concat(m.rate)) { const T = R.schicht != null ? this.sch(R.schicht) : this.lp(R.loop); if (T) { T.rt = Math.pow(2, Math.max(-20, Math.min(20, +R.cents || 0)) / 1200); T.rv = (T.rt - T.r) / Math.max(1, Math.round(R.ramp != null ? R.ramp : 0.05 * SR)); } }
      if (m.wst) this.wsMsg(m.wst, m.wst.port);   // (step 2a: a living Schicht's pass, streamed through its own port)
      if (m.wstop) { const S = this.sch(m.wstop.schicht); if (S) this.wsStop(S); }
      if (m.wport) this.wpt.push(m.wport);   // (step 2a: a Werk-Rahmen's own port – the live frame every 0.1 s, for its pacing)
      if (m.tau) for (const L of this.loops) if (L.id === m.tau.loop) for (const S of L.sch) { S.tau = !!m.tau.on; if (S.tau) this.ddAsk(S); }
      if (m.ddGo) this.ddStart(m.ddGo);   // (step 1d) the page's chunks for a de-drifted version
      // (step 1d) Nähren: a loop's output, post level and state, into its own pair of output 2 (ch: 0…7; −1 off) – the send
      // that feeds its own web (no tap hears output 2); a fade of X frames either way
      if (m.send) for (const d of [].concat(m.send)) { const L = this.lp(d.loop); if (!L) continue; const on = d.ch != null && d.ch >= 0; if (on) L.sendCh = d.ch | 0; envGo(L.sg, on ? (d.g != null ? +d.g : 1) : 0, this.xf(d.X)); }
      // (step 1d) Schluss „welkend“: from frame f0 to f1 the loop's gain falls (equal power), a one-pole low pass closes
      // from no filter to lo Hz, slices of sl frames drop out (seeded, ever more often, 3-ms edges); at f1 it is angehalten
      if (m.wilt) { const d = m.wilt, L = this.lp(d.loop); if (L) { if (d.off) { L.wk = null; L.lpS.fill(0); } else L.wk = { f0: Math.round(d.f0), f1: Math.round(d.f1), sl: Math.max(64, Math.round(d.sl || 0.125 * SR)), seed: d.seed | 0 || 1, lo: +d.lo || 250, hi: Math.min(SR / 2, +d.hi || 16000), j: -1e9, tg: 1, gt: 1, gs: 1 / Math.max(1, Math.round(0.003 * SR)), a: 1, w: 1, p: 0 }; } }
      if (m.report) this.port.postMessage({ report: this.stat() });
      // (step 4) Schleife in Schleife (Riley's time-lag accumulator): loop B records what its sources play – each pass
      // what B held, × fb, plus their output now, through a soft ceiling – into its own Schicht, which it plays as it is
      // written (read before write: one pass later). acc: {loop, src: [loop ids], fb, gi} – or {loop, off}
      if (m.acc) { for (const d of [].concat(m.acc)) { const B = this.lp(d.loop); if (!B) continue; if (d.off) { B.acc = null; continue; } const A = B.acc || { L: new Float32Array(this.S), R: new Float32Array(this.S) }; A.src = (d.src || []).slice(); A.fb = Math.max(0, Math.min(0.99, +d.fb || 0)); A.gi = d.gi != null ? +d.gi : 1; B.acc = A; } this.accLink(); }
      if (m.accCopy) { const d = m.accCopy, S = this.sch(d.schicht); if (S && d.dst) this.jobs.push({ acp: 1, id: d.schicht, S, src: S.ch, dst: d.dst, x: 0, f1: Math.min(S.tot, d.dst.length * this.CH), f0: 0 }); else if (d.dst) { const tr = []; for (const c of d.dst) tr.push(c[0].buffer, c[1].buffer); this.port.postMessage({ accCopied: { schicht: d.schicht, err: 1, chunks: d.dst } }, tr); } }
      // (step 2b) the tape's tools: slices (Schnitt on a tempo change, Auslassen, Würfeln), Verblassen and Abrieb per Schicht
      if (m.slice) for (const d of [].concat(m.slice)) { const L = this.lp(d.loop); if (L) this.slSet(L, d); }
      if (m.vb) for (const d of [].concat(m.vb)) { const S = this.sch(d.schicht) || this.schQ(d.schicht); if (!S) continue; S.fb = Math.max(0, Math.min(1, +d.fb)); if (!(S.fb < 1)) { S.fb = 1; S.age = 0; if (S.vf !== 1) { S.vf = 1; if (!S.dying) envGo(S.e, S.g, this.xf(0.03 * SR)); } } }
      if (m.abr) for (const d of [].concat(m.abr)) { const S = this.sch(d.schicht) || this.schQ(d.schicht); if (S) this.abSet(S, d); }
      for (const k of ['geom', 'band', 'schicht', 'replace', 'state', 'gain', 'undo', 'clear']) if (m[k]) this.at(k, m[k]);   // (geom first: a re-cut swaps its audio at the seam of the new geometry)
    }
    // a punch's end (or start) told late: frames already copied past it are faded now (in the message, not in process())
    gateSet(g) {
      for (const J of this.jobs) {
        if (!J.S || J.S.id !== g.schicht || !J.gate) continue;
        const G = J.gate;
        if (g.a != null) G.a = Math.round(g.a);
        if (g.b != null) {
          G.b = Math.round(g.b);
          J.f1 = Math.min(J.f1, G.b + 1);   // (nothing after it: the rest stays silent)
          for (const D of [J.dst, J.cp]) if (D) for (let x = Math.max(J.f0, G.b - G.X); x < J.x; x++) {
            const d = x - J.f0, c = D[Math.floor(d / this.CH)], j = d % this.CH, w = this.gateW(G, x) / Math.max(1e-9, this.gateW(G, x, true));
            if (c && c[0].buffer.byteLength) { c[0][j] *= w; c[1][j] *= w; }
          }
        }
      }
    }
    // the punch envelope at Humus frame x: the smooth law up from a over X, down to b over X (open: no end yet)
    gateW(G, x, open) {
      if (x < G.a) return 0;
      let w = x < G.a + G.X ? Math.sin(HP * (0.5 - 0.5 * Math.cos(Math.PI * (x - G.a + 0.5) / G.X))) : 1;
      if (!open && G.b != null) { if (x >= G.b) return 0; if (x >= G.b - G.X) w *= Math.cos(HP * (0.5 - 0.5 * Math.cos(Math.PI * (x - G.b + G.X + 0.5) / G.X))); }
      return w;
    }
    take(n) { const a = []; for (let i = 0; i < n && this.free.length; i++) a.push(this.free.pop()); return a.length === n ? a : (this.free.push(...a), null); }
    // the seam of a warm join (step 1c), from the page: zo – where in the pass it lies (Nahtwahl: a rotation inside
    // confirmed repetition, frames after the bar line; until there the pass that ended goes on alone), kc – its gain
    // curve over the fade (the time-local level: K + 1 points over X; 0 = the correlation law of ρ). Both wait for a
    // pass start, so no seam changes while it sounds.
    seamSet(S, a) {
      if (a.zo != null) S.zoN = Math.max(0, Math.round(+a.zo) || 0);
      if (a.kc !== undefined) S.kcN = a.kc && a.kc.length > 1 ? a.kc : 0;
    }
    seamAdopt(S) {
      if (S.zoN != null) { S.zo = S.zoN; S.zoN = null; }
      if (S.kcN != null) { S.kc = S.kcN || null; S.kcN = null; }
    }
    at(kind, d) {
      const f = d.f == null ? -Infinity : Math.round(d.f), e = { f, kind, d, S: null };
      if (kind === 'schicht' || kind === 'replace') {   // (objects are made here, in the message – process() only links them)
        const B = e.S = this.newBuf(d);
        if (kind === 'schicht') Object.assign(B, { id: d.id, f0: 0, e: envNew(0), g: d.gain != null ? +d.gain : 1, fd: d.fin === 0 ? 0 : this.xf(d.fin != null ? d.fin : d.X),
          join: d.join || 'xf', X: this.xf(d.X), rho: Math.max(-1, Math.min(1, +d.rho || 0)), pp: false, dead: false, dying: false, stop: false, old: null, xin: envNew(1), tq: new Float64Array(HX_TN), tb: new Float64Array(HX_TN), tc: new Array(HX_TN).fill(null), tl: new Float64Array(HX_TN), tfr: new Uint8Array(HX_TN), tfN: new Int32Array(HX_TN), tfI: new Int32Array(HX_TN), tsrc: new Uint8Array(HX_TN), tout: new Uint8Array(HX_TN), tsd: new Uint8Array(HX_TN), tst: new Int32Array(HX_TN), gapX: false, tn: 0, pv: 0, ddA: false, dr0: null, ddMap: null, ddN: null, ddReq: -1, ddOk: d.dd !== 0, aoffS: 0,
          zo: 0, zoN: null, kc: null, kcN: null,   // (the seam's place in the pass and its gain curve: Nahtwahl, the time-local level – adopted at a pass start)
          fb: 1, vf: 1, age: 0, ab: null,   // (step 2b: Verblassen – fb per pass of its own age, vf the factor now; Abrieb – its wear)
          r: 1, rt: 1, rv: 0, q: 0, pe: 0,   // (its own read rate – Taumeln: each Schicht against the drift of its own recording – and position)
          k0: d.seamK != null ? Math.round(d.seamK) : null });   // k0: it enters at the start of that pass (a punch, a delayed harvest)
        else B.xo = envNew(1);
        B.out = d.out != null ? (d.out ? 1 : 0) : -1;   // (its output; −1: the loop's)
        B.dr = d.dr && d.dr.length ? d.dr : null; B.tau = d.tau !== false;   // (the drift it was played with; Taumeln on)
        B.wu = !!d.wu; if (B.wu && kind === 'schicht') B.ddA = true;   // (step 2a: a Wuchs version – rendered without the drift: it reads at the live drift alone, as a de-drifted one)
        this.seamSet(B, d);
        if (kind === 'replace' && d.join) Object.assign(B, { join: d.join, X: this.xf(d.X), rho: Math.max(-1, Math.min(1, +d.rho || 0)) });
        // filled live from a Humus ring while it already plays (the window's end may still be sounding): its frames are
        // read a whole pass after they were captured, so the copy is always ahead; cp: a second set returned to the page
        if (d.fill) {
          const F0 = d.fill.f0;
          const g = d.fill.gate ? { a: Math.round(d.fill.gate.a), b: d.fill.gate.b != null ? Math.round(d.fill.gate.b) : null, X: Math.max(1, Math.round(d.fill.gate.X || 0.01 * SR)) } : null;
          this.jobs.push({ id: d.id != null ? d.id : d.schicht, v: d.fill.v || 0, S: B, inp: Math.min(this.nR - 1, d.fill.in | 0), f0: Math.round(F0), x: Math.round(F0), f1: Math.round(F0) + B.tot, dst: B.ch, cp: d.copy || null, gate: g, lost: 0, dr: B.dr, drc: d.drc || null });
        }
      }
      const q = this.q; let i = q.length;
      while (i > 0 && q[i - 1].f > f) i--;
      q.splice(i, 0, e);
    }
    newBuf(d) {
      const ch = d.chunks || [], tot = d.n != null ? d.n : ch.length * this.CH, au = d.ausklang;
      const ac = au && au.chunks ? au.chunks : ch, aoff = au ? (au.off != null ? au.off : (d.pre || 0) + d.len) : 0;
      return { ch, tot, pre: d.pre || 0, len: d.len || 0, ac, aoff, aend: au ? aoff + (au.len || 0) : 0, afd: au && au.fade ? Math.round(au.fade) : 0 };
    }
    // the Taktgeber's segments [f, b, fpb] (frame, continuous beat, frames per beat): a new one replaces those from its frame
    seg(list, reset) {
      if (!list.length) return;
      if (typeof list[0] === 'number') list = [list];
      let n = reset ? 0 : this.nS;
      const f0 = list[0][0];
      while (n > 0 && this.sF[n - 1] >= f0) n--;
      if (n + list.length > this.NS) {   // full: what lies wholly behind the frame now goes
        let k = 0; while (k < n - 1 && this.sF[k + 1] <= this.F) k++;
        this.sF.copyWithin(0, k, n); this.sB.copyWithin(0, k, n); this.sP.copyWithin(0, k, n); n -= k;
        if (n + list.length > this.NS) list = list.slice(n + list.length - this.NS);
      }
      for (const s of list) { this.sF[n] = s[0]; this.sB[n] = s[1]; this.sP[n] = s[2]; n++; }
      this.nS = n;
      for (const L of this.loops) L.re = true;   // the next pass starts are derived again
    }
    frameAt(b) {   // continuous beat → frame (double)
      const B = this.sB; let lo = 0, hi = this.nS - 1;
      if (b >= B[hi]) lo = hi; else while (lo < hi) { const m = (lo + hi + 1) >> 1; if (B[m] <= b) lo = m; else hi = m - 1; }
      return this.sF[lo] + (b - B[lo]) * this.sP[lo];
    }
    beatAtF(f) {
      const A = this.sF; let lo = 0, hi = this.nS - 1;
      if (f >= A[hi]) lo = hi; else while (lo < hi) { const m = (lo + hi + 1) >> 1; if (A[m] <= f) lo = m; else hi = m - 1; }
      return this.sB[lo] + (f - A[lo]) / this.sP[lo];
    }
    // ---- Schleifen ----
    newLoop(d) {
      const L = { id: d.id, takt: d.lock !== 'frei', b0: +d.b0 || 0, beats: +d.beats || 4, Lf: Math.max(1, d.fr ? +d.L || SR : Math.round(d.L || SR)), ph0: d.fr ? +d.ph0 || 0 : Math.round(d.ph0 || 0),   // (step 4: a frei length may be fractional – Treffen setzen; its pass starts are rounded, as a Takt loop's)
        k: -1, s0: 0, s1: 0, pe: 0, q: 0, r: 1, rt: 1, rv: 0, re: true, sch: [], st: envNew(d.state === 'stumm' || d.state === 'angehalten' ? 0 : 1),
        lv: envNew(d.gain != null ? +d.gain : 1), pan: +d.pan || 0, out: d.out ? 1 : 0, state: d.state || 'spielt', dying: false, ms: 0, mp: 0, mn: 0,
        sendCh: -1, sg: envNew(0), wk: null, lpS: new Float32Array(4),   // (step 1d: its send, a Schluss „welkend“ with its filter's state)
        vs: 1, vg: null, sl: null, slA: false,   // (step 2b: the tape's speed and its glide or stop; the slices)
        gap: !!d.gap, ps0: 0, acc: null, accTo: null };   // (step 4: gap – only the silence after the phrase changes (Treffen setzen); the pass start before s0; a Sammelschleife's recording, the ones this loop feeds)
      return L;
    }
    lp(id) { for (const L of this.loops) if (L.id === id) return L; return null; }
    passAt(L, k) { return Math.round(L.takt ? this.frameAt(L.b0 + k * L.beats) : L.ph0 + k * L.Lf); }   // (step 4: a frei length may be fractional – integer ones as before)
    // place a loop at frame x: the pass that holds x (a loop told late comes in phase-correct, mid-pass)
    place(L, x) {
      let k = 0;
      if (this.passAt(L, 0) <= x) {
        k = L.takt ? Math.floor((this.beatAtF(x) - L.b0) / L.beats) : Math.floor((x - L.ph0) / L.Lf);
        while (k > 0 && this.passAt(L, k) > x) k--;
        while (this.passAt(L, k + 1) <= x) k++;
      }
      L.k = k; L.s0 = this.passAt(L, k); L.s1 = this.passAt(L, k + 1); L.q = Math.max(0, x - L.s0); L.pe = 0; L.re = false; L.ps0 = L.s0 - (L.s1 - L.s0);
      for (const S of L.sch) { S.pp = false; S.q = L.q; S.pe = 0; S.gapX = false; this.seamAdopt(S); if (S.k0 != null && S.f0 === Infinity && k >= S.k0) S.f0 = k === S.k0 ? L.s0 : x; }
      this.slPass(L);
      this.port.postMessage({ passStart: { loop: L.id, k, f: L.s0 } });
    }
    // the seam: pass k + 1 begins at s1 – the pass just ended is what the Ausklang and the crossfade continue
    advance(L, x) {
      for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; S.pp = S.f0 < L.s1 && !S.dead; this.seamAdopt(S); }   // it sounded into this seam (entered before it, also mid-pass with its fade-in)
      const slWas = L.slA;   // (step 2b: a pass played in slices – its last slice rings over the seam on its own, no seam continuation)
      if (slWas) for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (S.pp) this.slOver(L, S); S.pp = false; }
      L.ps0 = L.s0; L.pe = L.q; L.k++; L.s0 = L.s1; L.s1 = this.passAt(L, L.k + 1); L.q = Math.max(0, x - L.s0);   // (a late seam: in phase)   // (step 4: ps0 – the pass that ended, for a Sammelschleife's writing)
      if (L.s1 <= L.s0) L.s1 = L.s0 + 1;
      for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; S.pe = S.q; S.q = L.q; }   // (each Schicht's own read position – its Taumeln rate – starts the pass in phase again)
      // (step 2b) Verblassen: a Schicht that played the pass that ended is a pass older – fb^age, from this seam; Abrieb:
      // its wear deepens at the same places
      for (let i = 0; i < L.sch.length; i++) {
        const S = L.sch[i]; if (S.dead || S.dying || !(S.f0 < L.s0)) continue;
        if (S.fb < 1) { S.age++; S.vf = Math.pow(S.fb, S.age); envGo(S.e, S.g * S.vf, this.xf(0.02 * SR)); }
        if (S.ab && S.ab.on) { S.ab.age++; this.abPass(S); }
      }
      this.slPass(L);
      if (slWas && !L.slA) for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; S.xin.v = 0; envGo(S.xin, 1, this.xf()); }   // (back to the tape as it is: it enters with a short fade, the slice rings out)
      for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (S.k0 != null && S.f0 === Infinity && L.k >= S.k0) S.f0 = L.s0; }   // a Schicht waiting for this pass enters at its start
      if (L.stopAt != null && Math.abs(L.s0 - L.stopAt) <= 1) {   // the stop: its Ausklang, once, outside the state's gain
        for (let i = 0; i < L.sch.length; i++) {   // (without an Ausklang: the pass's own continuation, faded over its X)
          const S = L.sch[i];
          for (let t = 0; t < S.tn; t++) S.tfr[t] = 1;   // (step 1c: the Ausklänge of earlier passes still ringing ring out too – never cut at the stop)
          if (!S.stop) continue;
          S.stop = false;
          if (L.gap && !S.wu && !S.ws) { if (!S.gapX) this.gapTail(S, S.pe, 0, true); continue; }   // (step 4: gap – its ring-out already rings, or rings from here)
          if (S.aend > S.aoff) this.tail(S, true, 0, S.aoff, 0); else this.tail(S, true, 1, S.pre + S.pe, S.X);
        }
        L.stopAt = null;
      } else if (L.st.v > 0 || L.st.i < L.st.N) for (let i = 0; i < L.sch.length; i++) {
        const S = L.sch[i]; if (!S.pp) continue;
        if (L.gap && !S.wu && !S.ws) { if (!S.gapX) this.gapTail(S, S.pe, 0); continue; }   // (step 4: gap – what is left rings on)
        const O = S.old && S.old.seam && !S.old.tld ? S.old : null, V = O || S;   // (a version swapped at this seam: its Ausklang)
        if (S.join === 'ola' && V.aend > V.aoff) this.tail(S, false, 0, S.aoff, 0);
        else if (O && O.join === 'xf' && S.join === 'ola') this.tail(S, false, 1, S.pre + S.pe, O.X || S.X);   // (step 2a: a warm Abdruck swapped for a cold Wuchs pass without an Ausklang – the pass that ended fades over its own crossfade)
      }
      for (let i = 0; i < L.sch.length; i++) if (L.sch[i].ws) this.wsSeam(L, L.sch[i], x);   // (step 2a: a living Schicht's next pass)
      if (L.gap) for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (S.wu || S.ws) continue; S.gapX = false; if (S.join === 'xf' && S.pp) { S.xin.v = 0; envGo(S.xin, 1, Math.min(S.X, this.xf(0.005 * SR))); } }   // (step 4: gap – a new pass reads its window again from the start; a warm one enters with a short fade)
      // (step 2a: the version swapped at this seam gave its Ausklang here, once – from the next seam on the one playing gives
      // its own. Before, an old version whose Ausklang outlasted a pass stayed `old` (its tail still read it) and gave its
      // Ausklang at every later seam too: a Treu render's tail never sounded, the Abdruck's did)
      for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (S.old && S.old.seam && !S.old.tld) { S.old.tld = true; S.old.kS = L.k; } }
      for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (S.ddN && !S.old && !S.dead && !S.dying) { if (S.tau) this.ddAdopt(L, S); else { this.ddBack(S.id, S.ddN.dst); S.ddN = null; S.ddReq = -1; } } }   // (step 1d; Taumeln off meanwhile: its own audio stays, bit for bit)
      this.port.postMessage({ passStart: { loop: L.id, k: L.k, f: L.s0 } });
    }
    // a tail stream from the seam on: the Ausklang (src 0) or the Schicht's own audio from base (src 1); free: not under
    // the loop's state (a stop's); fade: frames of a fade-out (0: none)
    uses(S, O) { for (let t = 0; t < S.tn; t++) if (S.tc[t] === O.ch || S.tc[t] === O.ac) return true; return false; }
    // (final pass) a version whose chunks another read of this Schicht still owns – the version playing, the old one, the
    // stream's fallback, a parked one – is not given back now; its owner gives it when it goes (the guard held caught it
    // in the fuzz: a late stream slot fell back to the pass before, whose chunks were the old version being given back)
    sharedV(S, V) {
      const c = V && V.ch; if (!c) return false;
      if (S.ch === c || (S.old && S.old !== V && S.old.ch === c) || (S.ws && S.ws.prev && S.ws.prev !== V && S.ws.prev.ch === c)) return true;
      if (S.park) for (const P of S.park) if (P !== V && P.ch === c) return true;
      return false;
    }
    tail(S, free, src, base, fade, delay, Vv) {
      const t = S.tn, V = Vv || (S.old && S.old.seam && !S.old.tld ? S.old : S);   // (swapped at this seam: the old version's tail)
      if (t >= HX_TN) return;
      S.tq[t] = 0; S.tb[t] = src ? V.pre + base - S.pre : base - S.aoff + V.aoff; S.tc[t] = src ? V.ch : V.ac; S.tl[t] = src ? V.tot : V.aend;
      S.tfr[t] = free ? 1 : 0; S.tfN[t] = fade; S.tfI[t] = -Math.max(0, Math.round(delay || 0)); S.tsrc[t] = src; S.tout[t] = V === S ? S.out : V.out; S.tsd[t] = V.ddA ? 1 : 0; S.tst[t] = 0; S.tn++;   // (tsd: read as de-drifted; step 2b: a fade may begin after `delay` frames – a slice ringing over the seam)
    }
    // (step 4) gap: the Schicht's own continuation from q (its window's position) – the Ausklang to the first foreign onset,
    // its cut faded as stored; without an Ausklang the continuation fades over the seam's X – sk frames into this span
    gapTail(S, q, sk, free) {
      if (S.tn >= HX_TN) return;
      if (S.aend > S.aoff) this.tail(S, !!free, 0, S.aoff + (q - S.len), 0, 0, S);
      else this.tail(S, !!free, 1, S.pre + q, S.X, 0, S);
      S.tst[S.tn - 1] = Math.max(0, sk | 0);
    }
    // ---- (step 1d) a Schicht de-drifted: its own drift taken out once, offline, so it reads at the live drift alone –
    // as every de-drifted Schicht does: the Schichten of a loop share one rate, their reads are summed and resampled once.
    // Its version u ↦ S(φ(u)), φ' = 2^(−d(φ)/1200) (d: the drift it was played with), anchored at the pass start (pre),
    // read through the 160-tap kernel; what plays is the same (the step-1c read: S at φ(u) for the same u). Asked for
    // when a version is complete (its fill done, or the page's audio), the chunks from the page; it takes over at the
    // Schicht's next pass start – the old version goes on as the seam's continuation and in its Ausklänge. ----
    ddAsk(S) {
      if (this.noDD || !this.drIn || !S.tau || S.ddA || S.wu || S.dying || S.dead || !S.ddOk || !S.dr || !S.ch || S.ac !== S.ch || S.ddReq === S.pv) return;
      for (let i = 0; i < this.jobs.length; i++) if (this.jobs[i].S === S) return;   // (still filling: once it is complete)
      S.ddReq = S.pv;
      let z = true; for (let i = 0; i < S.dr.length; i++) if (S.dr[i] !== 0) { z = false; break; }
      if (z) { S.ddA = true; S.dr0 = null; S.ddMap = null; S.aoffS = S.aoff; this.port.postMessage({ ddAdopt: { schicht: S.id, z: 1 } }); return; }   // (played without drift: nothing to take out)
      const n = Math.ceil((S.tot * 1.012 + 1024) / this.CH), dst = this.ddPool ? this.take(n) : null;
      if (dst) this.ddStart({ schicht: S.id, pv: S.pv, dst }); else this.port.postMessage({ ddReq: { schicht: S.id, pv: S.pv, n } });
    }
    ddBack(id, dst) { if (!dst) return; const tr = [], H = this.held([]); dst = dst.filter((c) => !H.has(c[0]) || (this.heldBad({ schicht: id, dd: 1 }, c, H.get(c[0])), false)); for (const c of dst) { tr.push(c[0].buffer, c[1].buffer); this.gW.set(c[0], ['ddBack', id, this.F]); } this.port.postMessage({ freed: { schicht: id, old: 1, chunks: dst } }, tr); }
    ddStart(d) {   // (in a message: everything it needs is made here)
      const S = this.sch(d.schicht), dst = d.dst;
      if (!S || S.pv !== d.pv || S.ddA || S.dying || S.dead || !S.dr || !dst || !dst.length) { this.ddBack(d.schicht, dst); return; }
      if (!this.ddT) this.ddT = rsTable(0.97, 160, 10);
      // (the knots: dd index i0 + 32 k; the anchor – the pass start, index pre – is a knot. A Schicht that enters mid-pass
      // has pre < 0: its anchor lies before its buffer – the knots start at the buffer, integrated forward from the anchor)
      const cap = dst.length * this.CH, pre = S.pre, K0 = Math.ceil(pre / 32), i0 = pre - K0 * 32, kA = Math.max(0, K0), nK = kA + Math.ceil(Math.max(0, cap - Math.max(0, pre)) / 32) + 2;
      const J = { dd: 1, S, pv: S.pv, src: S.ch, stot: S.tot, D: S.dr, pre, dst, cap, map: { x: new Float64Array(nK), n: 0, i0: K0 < 0 ? i0 : pre - K0 * 32 }, K0, k: kA, ph: 0, x: 0, n0: 0,
        dr0: new Float32Array(Math.ceil(cap / 128) + 2), old: { ch: null, tot: 0, pre: 0, len: 0, ac: null, aoff: 0, aend: 0, xo: envNew(0), seam: true, out: 0, end: 0, ddA: false, ddMap: null } };
      if (K0 >= 0) J.map.x[K0] = pre;
      else { let x = pre; for (let k = K0; k < 0; k++) x += 32 * this.ddF(S.dr, x + 16 * this.ddF(S.dr, x)); J.map.x[0] = x; }   // (from the anchor forward to the buffer's first knot)
      this.jobs.push(J);
      this.port.postMessage({ ddRun: { schicht: S.id, on: 1 } });
    }
    // the drift's slope at S-space position x: φ' there
    ddF(D, x) { const u = Math.max(0, Math.min(D.length - 1, x / 128)), i = Math.min(D.length - 2, u | 0), d = D.length > 1 ? D[i] + (u - i) * (D[i + 1] - D[i]) : D[0]; return d === d ? Math.pow(2, -Math.max(-20, Math.min(20, d)) / 1200) : 1; }
    // φ at a de-drifted index j (its knots every 32 frames, straight between)
    ddPhi(map, j) { const u = (j - map.i0) / 32, k = Math.max(0, Math.min(map.n - 2, Math.floor(u))), X = map.x; return X[k] + (u - k) * (X[k + 1] - X[k]); }
    // one block's share: the knots (backward from the anchor, then forward to the source's end – midpoint steps of 32
    // frames), the drift it was played with at every 128th frame of the version, then the frames through the kernel
    ddJob(J) {
      const S = J.S, X = J.map.x, D = J.D;
      if (S.pv !== J.pv || S.dead || S.dying) { J.ph = 9; return; }
      if (J.ph === 0) {
        for (let k = J.K0 - 1; k >= 0; k--) { const x1 = X[k + 1]; X[k] = x1 - 32 * this.ddF(D, x1 - 16 * this.ddF(D, x1)); }
        for (let k = 0; k <= Math.max(0, J.K0); k++) if (!(X[k] === X[k] && Math.abs(X[k]) < 1e12)) { J.ph = 9; return; }   // (never a version that is not finite)
        J.ph = 1; return;
      }
      if (J.ph === 1) {
        const lim = X.length - 1;
        for (let s = 0; s < 4096 && J.k < lim; s++, J.k++) { const x0 = X[J.k]; X[J.k + 1] = x0 + 32 * this.ddF(D, x0 + 16 * this.ddF(D, x0)); if (X[J.k + 1] >= J.stot + 160) { J.k++; break; } }
        if (J.k >= lim || X[J.k] >= J.stot + 160) { J.map.n = J.k + 1; J.n0 = Math.min(J.cap, J.map.i0 + 32 * J.k); J.ph = 2; }
        return;
      }
      if (J.ph === 2) {
        for (let k = 0; k < J.dr0.length; k++) { const j = 128 * k; if (j > J.n0) break; const x = this.ddPhi(J.map, j), u = Math.max(0, Math.min(D.length - 1, x / 128)), i = Math.min(D.length - 2, u | 0); J.dr0[k] = D.length > 1 ? D[i] + (u - i) * (D[i + 1] - D[i]) : D[0]; }
        J.ph = 3; return;
      }
      const T = this.ddT, N = 160, CC = N / 2 - 1, SH = this.SH, M = this.M, ch = J.src, tot = J.stot, e = Math.min(J.n0, J.x + this.ddBlk);
      for (; J.x < e; J.x++) {
        const c = J.dst[J.x >> SH], k = J.x & M, p = this.ddPhi(J.map, J.x), i = Math.floor(p), ph = (p - i) * RS_N, p0 = ph | 0, a = ph - p0, b0 = p0 * N, i0 = i - CC;
        let sl = 0, sr = 0;
        if (i0 >= 0 && i0 + N <= tot && (i0 & M) + N <= M + 1) {   // (all 160 taps in one chunk)
          const s = ch[i0 >> SH], sL = s[0], sR = s[1], j0 = i0 & M;
          for (let t = 0; t < N; t++) { const w = T[b0 + t] + a * (T[b0 + N + t] - T[b0 + t]); sl += w * sL[j0 + t]; sr += w * sR[j0 + t]; }
        } else for (let t = 0, x = i0; t < N; t++, x++) {
          if (x < 0 || x >= tot) continue;
          const s = ch[x >> SH]; if (!s) continue;
          const w = T[b0 + t] + a * (T[b0 + N + t] - T[b0 + t]), q = x & M;
          sl += w * s[0][q]; sr += w * s[1][q];
        }
        if (sl !== sl || sr !== sr) { J.ph = 9; return; }
        c[0][k] = sl; c[1][k] = sr;
      }
      if (J.x >= J.n0) J.ph = 4;
    }
    // at a pass start: the de-drifted version takes over (the old one goes on as the seam's continuation and in the
    // Ausklänge already ringing, read as it was – then back to the page)
    ddAdopt(L, S) {
      const J = S.ddN; S.ddN = null;
      if (J.pv !== S.pv) { this.ddBack(S.id, J.dst); return; }
      const O = J.old;
      if (S.old) { if (S.old.ws || this.uses(S, S.old)) (S.park || (S.park = [])).push(S.old); else if (!this.sharedV(S, S.old)) this.gvQ.push([{ schicht: S.id, old: 1 }, [S.old]]); }   // (final pass: an old version still there was dropped unreturned)
      O.ch = S.ch; O.tot = S.tot; O.pre = S.pre; O.len = S.len; O.ac = S.ac; O.aoff = S.aoff; O.aend = S.aend; O.out = S.out; O.end = L.s0 + S.zo + S.X + 1; O.ddA = false;
      S.old = O; S.aoffS = S.aoff;
      S.ch = J.dst; S.tot = J.n0; S.ac = J.dst; S.aoff = this.ddInv(J.map, S.pre, O.aoff); S.aend = this.ddInv(J.map, S.pre, O.aend);
      S.ddA = true; S.dr0 = J.dr0; S.ddMap = J.map;
      this.port.postMessage({ ddAdopt: { schicht: S.id } });
    }
    // ---- (step 2a) Wuchs streams: a living Schicht's passes, each rendered in the Werk-Rahmen and streamed in blocks
    // (one chunk each, transferred) through a port of its own – a slot {k, len, at, must, ch, got, n}. At its pass start
    // (or from `at`: a follow change, a tempo change's pass rendered from its start and heard from that frame) the slot
    // becomes the Schicht's version – read from its frame 0 (no margin), its tail past len overlap-added under the passes
    // after it (the Ausklang streams). A slot not there in time: the last complete pass plays on at that position – except
    // one that must come (a follow change): then the Schicht falls silent until it arrives, never the old key. ----
    wsMsg(d, port) {
      const S = this.sch(d.schicht);
      if (!S || S.dying || S.dead) { if (port) port.close(); return; }
      const W = S.ws || (S.ws = { slots: [], cur: null, prev: null, hold: false, n: 0 });
      for (let i = 0; i < W.slots.length; i++) { const o = W.slots[i]; if (o.k === d.k && !o.on && o !== W.prev) { this.wsDrop(S, o); W.slots.splice(i--, 1); } }   // (a newer render of the same pass)
      const nC = Math.max(1, Math.ceil((+d.cap || SR) / this.CH));
      const c0 = Math.max(0, Math.min(nC - 1, Math.floor((+d.from || 0) / this.CH)));   // (a pass rendered from its start but heard from a later frame: only its chunks from there come)
      const Z = { k: d.k | 0, len: Math.max(1, Math.round(d.len)), at: d.at != null ? Math.round(d.at) : -Infinity, must: !!d.must, ch: new Array(nC).fill(null), c0, hi: c0, n: Infinity, port: port || null, on: false, dead: false, ver: null };
      W.slots.push(Z);
      if (port) port.onmessage = (e) => this.wsBlock(S, Z, e.data);
      if (Number.isFinite(Z.at)) { const e = { f: Z.at, kind: 'wsat', d: { S, Z }, S: null }, q = this.q; let i = q.length; while (i > 0 && q[i - 1].f > e.f) i--; q.splice(i, 0, e); }
    }
    wsBlock(S, Z, m) {
      if (!m) return;
      if (m.nan) this.port.postMessage({ nan: { ws: S.id, k: Z.k, chunk: m.i, n: m.nan, F: this.F } });   // (step 2b: a render's non-finite samples, scrubbed in the sink)
      if (m.L) {   // chunk i of the pass (8192 frames; the last one padded)
        if (Z.dead || !(m.i >= 0 && m.i < Z.ch.length)) { this.port.postMessage({ freed: { schicht: S.id, old: 1, ws: 1, chunks: [[m.L, m.R]] } }, [m.L.buffer, m.R.buffer]); return; }
        Z.ch[m.i] = [m.L, m.R];
        while (Z.hi < Z.ch.length && Z.ch[Z.hi]) Z.hi++;
      }
      if (m.end != null && !Z.dead) {   // its length, the tail ended (−90 dB): the reads of it stop there
        Z.n = Math.max(1, Math.min(Z.ch.length * this.CH, Math.round(m.end)));
        if (Z.port) { Z.port.close(); Z.port = null; }
        if (S.ch === Z.ch) { S.tot = Z.n; S.aend = Z.n; }
        if (Z.ver) { Z.ver.tot = Z.n; Z.ver.aend = Z.n; }
        for (let t = 0; t < S.tn; t++) if (S.tc[t] === Z.ch) S.tl[t] = Z.n;
      }
    }
    // the slot's frames from 0 are there up to p + need (plus the resampler's taps), or to its end
    wsReady(Z, p, need) { return p - RS_T >= Z.c0 * this.CH - (Z.c0 ? 0 : Infinity) && Z.hi * this.CH >= Math.min(Z.n, Math.ceil(p + need) + RS_T + 2); }
    // a version of the Schicht as it is now (to cross from, or to fall back on)
    wsVer(S) { return { ch: S.ch, tot: S.tot, pre: S.pre, len: S.len, ac: S.ac, aoff: S.aoff, aend: S.aend, join: S.join, X: S.X, rho: S.rho, wu: S.wu, ddA: S.ddA, ddMap: S.ddMap, dr0: S.dr0, out: S.out, zo: S.zo, kc: S.kc, ws: this.wsOwn(S) }; }
    // (step 2b) the slot whose chunks the Schicht reads now – the current one, or a fallback's after a late pass (W.cur is
    // null then): a version taken from it goes with its slot, never given back on its own while the slot is still read
    wsOwn(S) { const W = S.ws; if (!W || !S.ch) return null; if (W.cur && W.cur.ch === S.ch) return W.cur; for (const Z of W.slots) if (Z.ch === S.ch) return Z; return null; }
    // a version becomes the Schicht's: at its seam (the pass that ended goes on in its tail, added by advance), or mid-pass
    // at the same place, crossing over X frames
    // the two versions' correlation over the next n frames from read positions pa, pb (stereo; a chunk not there is silence)
    corr(A, ta, pa, B, tb, pb, n) {
      let ab = 0, aa = 0, bb = 0;
      const at = (ch, t, i) => { if (i < 0 || i >= t) return null; const c = ch[i >> this.SH]; return c && c[0].length ? c : null; };
      for (let j = 0; j < n; j++) {
        const i = Math.floor(pa) + j, k = Math.floor(pb) + j, ca = at(A, ta, i), cb = at(B, tb, k); if (!ca || !cb) continue;
        const x0 = ca[0][i & this.M], x1 = ca[1][i & this.M], y0 = cb[0][k & this.M], y1 = cb[1][k & this.M];
        ab += x0 * y0 + x1 * y1; aa += x0 * x0 + x1 * x1; bb += y0 * y0 + y1 * y1;
      }
      return aa > 1e-20 && bb > 1e-20 ? Math.max(-1, Math.min(1, ab / Math.sqrt(aa * bb))) : 0;
    }
    wsSet(S, V, seam, X) {
      if (!seam) {
        if (S.old) { if (S.old.ws || this.uses(S, S.old)) (S.park || (S.park = [])).push(S.old); else if (S.old.ch !== V.ch && !this.sharedV(S, S.old)) this.gvQ.push([{ schicht: S.id, old: 1 }, [S.old]]); }   // (V may bring the old one's chunks back: the fallback)
        const O = this.wsVer(S); O.xo = envNew(1); envGo(O.xo, 0, X); O.seam = false; O.end = 0;
        S.old = O; S.xin.v = 0; envGo(S.xin, 1, X);
        // (two throws crossing mid-pass – a late pass and its fallback, a pass and the anchor – are partly correlated: the
        // smooth law normalised by it, as at a seam, so the level holds; a sine against itself in another phase dipped)
        S.xrho = this.corr(O.ch, O.tot, O.pre + S.q, V.ch, V.tot, V.pre + S.q, X);
      }
      S.ch = V.ch; S.tot = V.tot; S.pre = V.pre; S.len = V.len; S.ac = V.ac; S.aoff = V.aoff; S.aend = V.aend; S.join = V.join; S.X = V.X || S.X; S.rho = V.rho || 0;
      S.wu = !!V.wu; S.ddA = !!V.ddA; S.ddMap = V.ddMap || null; S.dr0 = V.dr0 || null; S.zo = V.zo || 0; S.kc = V.kc || null; S.zoN = null; S.kcN = null; S.pv++;
      if (S.ddN) { this.ddBack(S.id, S.ddN.dst); S.ddN = null; }
    }
    wsVerOf(Z) { const n = Number.isFinite(Z.n) ? Z.n : Z.ch.length * this.CH; return (Z.ver = { ch: Z.ch, tot: n, pre: 0, len: Z.len, ac: Z.ch, aoff: Z.len, aend: n, join: 'ola', X: this.xf(), rho: 0, wu: true, ddA: true, ddMap: null, dr0: null, ws: Z }); }
    wsTake(S, Z, seam, X) {
      const W = S.ws, was = this.wsVer(S);
      this.wsPrev(S, W.hold || Z.must ? null : was);   // (the last complete pass: the fallback while this one streams – none after a follow change)
      this.wsSet(S, this.wsVerOf(Z), seam, X);
      W.cur = Z; Z.on = true; W.hold = false;
    }
    // the fallback changes: a fixed version no read needs any more goes back to the page (a slot's goes with its slot)
    wsPrev(S, V) {
      const W = S.ws, o = W.prev; W.prev = V;
      if (!o || o.ws || (V && V.ch === o.ch) || S.ch === o.ch || (S.old && S.old.ch === o.ch) || (S.park && S.park.some((p) => p.ch === o.ch))) return;
      if (this.uses(S, o)) (S.park || (S.park = [])).push(o); else this.gvQ.push([{ schicht: S.id, old: 1 }, [o]]);
    }
    // silent from now (a pass that must come is not there): the version crosses to nothing, the tails ringing fade
    wsHold(S, X, seam) {
      const W = S.ws; if (W.hold) return;
      this.wsSet(S, { ch: [], tot: 0, pre: 0, len: S.len, ac: [], aoff: 0, aend: 0, join: 'ola', X: S.X, wu: true, ddA: true }, !!seam, X);
      for (let t = 0; t < S.tn; t++) if (!S.tfN[t]) { S.tfN[t] = X; S.tfI[t] = 0; }
      W.hold = true; this.wsPrev(S, null); W.cur = null;
    }
    // at a pass start: its slot, if it is there; else the version plays on (late – the page hears of it), or, for a pass
    // that must come, silence until it does
    wsSeam(L, S, x) {
      const W = S.ws, k = L.k;
      let Z = null; for (const o of W.slots) if (o.k === k && !o.dead) Z = o;
      if (W.cur && W.cur.hi * this.CH >= W.cur.n && W.prev) this.wsPrev(S, null);   // (complete: no fallback needed)
      if (!Z) { if (W.hold) return; return; }
      if (Z.at > L.s0 + 1) return;   // (its moment comes later in the pass: wsat)
      const ok = this.wsReady(Z, 0, 4 * this.S);
      // (a warm version – an Abdruck, joined by its crossfade – goes on in its Ausklang, or its own continuation fading over
      // its X, under the cold Wuchs pass; a cold one's tail was added by advance)
      if ((ok || Z.must) && S.join !== 'ola' && S.pp && !W.hold) { if (S.aend > S.aoff) this.tail(S, false, 0, S.aoff, 0); else this.tail(S, false, 1, S.pre + S.pe, S.X); }
      if (ok) { this.wsTake(S, Z, !W.hold, this.xf()); return; }
      this.port.postMessage({ late: { loop: L.id, schicht: S.id, k } });
      if (Z.must) this.wsHold(S, this.xf(), true);
    }
    // a slot's own moment (a follow change at the announced bar, a pre-rolled pass at a tempo change)
    wsAt(d, x) {
      const S = d.S, Z = d.Z, L = this.loopOf(S);
      if (!L || Z.dead || Z.on || !S.ws || S.dying || S.dead || L.k !== Z.k) return;
      if (this.wsReady(Z, S.q, 4 * this.S)) { this.wsTake(S, Z, false, this.xf()); return; }   // (the slot's own position: a pass has no margin – S.pre is the version playing now's)
      this.port.postMessage({ late: { loop: L.id, schicht: S.id, k: Z.k } });
      if (Z.must) this.wsHold(S, this.xf());
    }
    // every span, before the reads: a slot of this pass that came late (or after a hold) is taken at the same place; the
    // pass playing whose blocks are late falls back to the last complete pass there (or silence after a follow change)
    wsCheck(L, S, n) {
      const W = S.ws, k = L.k, X = this.xf();
      for (const Z of W.slots) if (Z.k === k && !Z.on && !Z.dead && L.s0 + Math.max(0, S.q) >= Z.at - 1 && this.wsReady(Z, S.q, n * 1.05)) { this.wsTake(S, Z, false, X); return; }
      if (W.cur && S.ch === W.cur.ch && !this.wsReady(W.cur, S.pre + S.q, n * 1.05)) {
        this.port.postMessage({ late: { loop: L.id, schicht: S.id, k } });
        const P2 = W.prev;
        // (the version crossing out is the late slot's: wsSet must see it as the stream's current one, so the slot stays
        // until the crossfade is over – cleared first, its chunks went back while still read: NaN, found by t-hx-wuchs)
        if (P2) { W.prev = null; this.wsSet(S, P2, false, X); W.cur = null; }
        else this.wsHold(S, X, false);
      }
    }
    // slots no read needs any more go back to the page (their tails ended, their pass passed unheard)
    wsGc(L, S) {
      const W = S.ws;
      for (let i = 0; i < W.slots.length; i++) {
        const Z = W.slots[i];
        if (Z === W.cur || (W.prev && W.prev.ws === Z) || (S.old && S.old.ws === Z) || (S.park && S.park.some((v) => v.ws === Z)) || S.ch === Z.ch) continue;
        if (!Z.on && !Z.dead && Z.k >= L.k) continue;   // (still to come)
        let used = false; for (let t = 0; t < S.tn; t++) if (S.tc[t] === Z.ch) { used = true; break; }
        if (used) continue;
        this.wsDrop(S, Z); W.slots.splice(i--, 1);
      }
      if (S.park) for (let i = 0; i < S.park.length; i++) if (S.park[i].ws && !this.uses(S, S.park[i])) S.park.splice(i--, 1);   // (a slot's version: its chunks go with the slot)
    }
    wsDrop(S, Z) {
      Z.dead = true; if (Z.port) { try { Z.port.close(); } catch (e) {} Z.port = null; }
      this.gvQ.push([{ schicht: S.id, old: 1, ws: 1 }, [{ ch: Z.ch }]]);
    }
    // every slot of a Schicht going back to the page (an undo, a clear)
    wsAll(S) { if (!S.ws) return []; const a = []; for (const Z of S.ws.slots) { Z.dead = true; if (Z.port) { try { Z.port.close(); } catch (e) {} Z.port = null; } a.push({ ch: Z.ch }); } S.ws.slots.length = 0; S.ws.cur = S.ws.prev = null; return a; }
    // the page stops a living Schicht's stream (its fixed version comes back): passes not yet heard are dropped
    wsStop(S) {
      const W = S.ws; if (!W) return;
      for (let i = 0; i < W.slots.length; i++) { const Z = W.slots[i]; if (!Z.on && Z !== W.cur) { this.wsDrop(S, Z); W.slots.splice(i--, 1); } }
      if (this.gvQ.length) { for (const g of this.gvQ) this.give(g[0], g[1]); this.gvQ.length = 0; }
    }
    // ---- timed actions (the frame x they act at) ----
    xf(v) { return Math.max(1, Math.round(v != null ? v : 0.01 * SR)); }   // a fade's frames (10 ms unless told)
    act(e, x) {
      const d = e.d;
      if (e.kind === 'schicht') {
        const L = this.lp(d.loop), S = e.S;
        if (!L) { this.give({ schicht: d.id }, [S]); return; }
        S.f0 = Math.max(x, Math.round(d.f != null ? d.f : x));
        if (S.k0 != null) S.f0 = L.k >= S.k0 ? (L.k === S.k0 && x <= L.s0 ? L.s0 : x) : Infinity;   // (waiting for its pass; told late: in phase now)
        if (!S.fd) S.e.v = S.e.a = S.e.b = S.g;   // (else its fade-in starts at its entry frame, in span)
        if (S.out < 0) S.out = L.out;
        S.q = L.q; S.pe = L.pe;
        L.sch.push(S);
        this.ddAsk(S);   // (step 1d: the page's audio is complete – a fill asks when it is)
      } else if (e.kind === 'replace') {
        const S = this.sch(d.schicht), B = e.S, L = S && this.loopOf(S);
        if (!S) { this.give({ schicht: d.schicht }, [B]); return; }
        if (S.old) { if (S.old.ws || this.uses(S, S.old)) (S.park || (S.park = [])).push(S.old); else if (S.old.ch !== B.ch && !this.sharedV(S, S.old)) this.give({ schicht: S.id, old: 1 }, [S.old]); }   // (an Ausklang still reading it keeps it; step 2a: a stream slot's version goes with its slot)
        const O = B.xo, seam = !!(L && L.k >= 0 && Math.abs(x - L.s1) <= 1);   // at its seam: the seam's own crossfade joins the versions
        B.xo = null;
        if (B.zoN != null) S.zoN = B.zoN;
        if (B.kcN != null) S.kcN = B.kcN;
        // (the old version plays out of its own output to its end: a baked one moves from out 1 to out 0 at this seam)
        S.old = { ch: S.ch, tot: S.tot, pre: S.pre, len: S.len, ac: S.ac, aoff: S.aoff, aend: S.aend, xo: O, seam, out: S.out, end: seam ? L.s1 + Math.max(S.zo, S.zoN != null ? S.zoN : 0) + S.X : 0, ddA: S.ddA, ddMap: S.ddMap, join: S.join, X: S.X, ws: S.ws ? S.ws.cur : null };
        if (S.ddN) { this.ddBack(S.id, S.ddN.dst); S.ddN = null; }   // (step 1d: a new version reads as played; its own de-drifted version later)
        S.ddA = false; S.dr0 = null; S.ddMap = null; S.pv++; S.ddReq = -1; S.ddOk = d.dd !== 0;
        S.wu = !!B.wu; if (S.wu) S.ddA = true;   // (step 2a: a Wuchs version reads at the live drift alone)
        if (S.ws) { this.wsPrev(S, null); S.ws.cur = null; S.ws.hold = false; }   // (a fixed version now: the stream's passes, if any, take over again at their pass)
        if (B.out >= 0) S.out = B.out;
        if (seam) { O.v = O.a = O.b = 0; O.i = O.N = 0; } else { O.v = 1; envGo(O, 0, this.xf(d.X)); S.xin.v = 0; envGo(S.xin, 1, this.xf(d.X)); S.xrho = B.wu ? this.corr(S.old.ch, S.old.tot, S.old.pre + S.q, B.ch, B.tot, B.pre + S.q, this.xf(d.X)) : 0; }   // (step 2a: a Wuchs version, normalised as the streams' crossings)
        S.ch = B.ch; S.tot = B.tot; S.pre = B.pre; S.len = B.len; S.ac = B.ac; S.aoff = B.aoff; S.aend = B.aend; S.afd = B.afd || 0;
        if (B.dr) S.dr = B.dr;
        if (B.join) { S.join = B.join; S.X = B.X; S.rho = B.rho; }
        for (const J of this.jobs) if (J.S === B) J.S = S;   // (a version still filling fills the Schicht it became)
        this.ddAsk(S);
      } else if (e.kind === 'geom') {   // a re-cut's new length (or tempo grid): the seam ahead stays where it is
        const L = this.lp(d.loop); if (!L) return;
        // (step 2b, §11) a Fläche at a tempo change: it keeps its length and runs frei from here – the pass that sounds
        // goes on to its own end, the next ones follow at its length
        if (d.lock === 'frei') { if (L.takt) { L.takt = false; L.Lf = Math.max(1, Math.round(d.L)); L.ph0 = L.k >= 0 ? L.s0 - L.k * L.Lf : Math.round(d.ph0 != null ? d.ph0 : x); L.re = true; } return; }
        if (d.gap != null) L.gap = !!d.gap;   // (step 4: Treffen setzen – the pass may be longer or shorter than the phrase: only its silence changes)
        if (L.takt) { if (d.beats) L.beats = +d.beats; L.b0 = L.k >= 0 ? this.beatAtF(L.s1) - (L.k + 1) * L.beats : d.b0 != null ? +d.b0 : L.b0; }
        else { if (d.L) L.Lf = Math.max(1, d.fr ? +d.L : Math.round(d.L)); L.ph0 = L.k >= 0 ? L.s1 - (L.k + 1) * L.Lf : L.ph0; }
        L.re = true;
      } else if (e.kind === 'band') {   // (step 2b) the tape: a speed step at a seam (its servo glide), or a stop
        const L = this.lp(d.loop); if (!L || L.dying) return;
        const r0 = L.vg ? this.vsRate(L.vg, x) : L.vs;
        if (d.stop) L.vg = { f0: x, T: Math.max(1, Math.round(d.T)), r0, r1: 0, stop: 1, back: L.vsT || L.vs };
        else { const r1 = Math.max(0.2, Math.min(4, +d.vs || 1)); L.vsT = r1; L.vg = { f0: x, T: Math.max(1, Math.round(d.T || 1)), r0, r1, stop: 0 }; }
      } else if (e.kind === 'state') {
        const L = this.lp(d.loop); if (!L || L.dying) return;   // (step 1d: a change scheduled before the loop was cleared – a Lichtung's, the Kern's – never brings it back)
        const to = d.to, N = this.xf(d.X);
        if (to !== 'spielt') L.wantIn = 0;   // (a re-entry still to come is off)
        if (to === 'spielt') {
          if (d.b0 != null && L.takt) { L.b0 = +d.b0; L.k = -1; L.st.v = L.st.a = L.st.b = 0; L.st.i = L.st.N = 0; L.wantIn = N; }   // re-enter from its start
          else if (d.ph0 != null && !L.takt) { L.ph0 = Math.round(d.ph0); L.k = -1; L.st.v = L.st.a = L.st.b = 0; L.st.i = L.st.N = 0; L.wantIn = N; }   // (a Frei one: from its start at ph0)
          else envGo(L.st, 1, N);
        } else if (to === 'angehalten' && L.k >= 0 && Math.abs(x - L.s1) <= 1) {   // at its seam: it stops there, its Ausklang rings once
          for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; if (!S.dead && S.f0 <= L.s0) S.stop = true; }
          L.stopAt = L.s1; envGo(L.st, 0, Math.max(1, L.s1 - x));
        } else if (to === 'angehalten' && d.tail > 0 && L.k >= 0) {   // (step 1d) at a bar line inside the pass (Schlafen): what
          // sounds rings on from where it is, free of the state and fading over `tail` frames (the page ends it before the
          // loop's next onset), the Ausklänge still ringing with it; the state is silent at once – the tail takes over
          for (let i = 0; i < L.sch.length; i++) { const S = L.sch[i]; for (let t = 0; t < S.tn; t++) S.tfr[t] = 1; if (!S.dead && S.f0 <= x) this.tail(S, true, 1, S.pre + S.q, Math.max(1, Math.round(d.tail))); }
          L.st.v = L.st.a = L.st.b = 0; L.st.i = L.st.N = 0; L.stopAt = null;
        } else envGo(L.st, 0, N);
        L.state = to;
      } else if (e.kind === 'gain') {
        if (d.schicht == null) { const L = this.lp(d.loop); if (L) { if (d.g != null) envGo(L.lv, +d.g, this.xf(d.ramp)); if (d.pan != null) L.pan = Math.max(-1, Math.min(1, +d.pan)); } }
        else { const S = this.sch(d.schicht); if (S && !S.dying) { S.g = +d.g; S.fd = 0; envGo(S.e, S.g * S.vf, this.xf(d.ramp)); } }   // (step 2b: under its Verblassen)
      } else if (e.kind === 'wsat') { this.wsAt(d, x);
      } else if (e.kind === 'undo') {
        const S = this.sch(d.schicht); if (S && !S.dead) { S.fd = 0; envGo(S.e, 0, this.xf(d.X)); S.dying = true; }
      } else if (e.kind === 'clear') {
        for (let i = 0; i < this.loops.length; i++) {
          const L = this.loops[i]; if (!(d.all || L.id === d.loop)) continue;
          envGo(L.st, 0, this.xf(d.X)); L.dying = true; L.stopAt = null;
          for (let j = 0; j < L.sch.length; j++) { const S = L.sch[j]; for (let t = 0; t < S.tn; t++) S.tfr[t] = 0; }   // (its ringing tails fade with it)
        }
      }
    }
    sch(id) { for (const L of this.loops) for (const S of L.sch) if (S.id === id) return S; return null; }
    schQ(id) { for (const e of this.q) if (e.kind === 'schicht' && e.S && e.S.id === id) return e.S; return null; }   // (step 2b: one still waiting for its frame – its settings go with it)
    loopOf(S) { for (const L of this.loops) if (L.sch.includes(S)) return L; return null; }
    // hand buffers back to the page (undo, clear, a swapped version): transferred, so this thread keeps nothing
    give(what, bufs, Lx) {
      const ch = [], tr = [], seen = new Set(), H = this.held(bufs, Lx);
      for (const B of bufs) for (const list of [B.ch, B.ac]) for (const c of list || []) if (c && c[0].buffer.byteLength && !seen.has(c[0])) { if (H.has(c[0])) { this.heldBad(what, c, H.get(c[0])); continue; } seen.add(c[0]); ch.push(c); tr.push(c[0].buffer, c[1].buffer); this.gW.set(c[0], [what, this.F]); }   // (step 2a: a slot's chunks not yet streamed are null; step 2b: who gave it back, for the tripwire)
      this.port.postMessage({ freed: Object.assign(what, { chunks: ch }) }, tr);
    }
    // (step 2b) the chunks a read still holds – a living Schicht's version, its old one, the parked ones, its stream's
    // fallback, its tails: never transferred (a detached chunk reads as nothing – NaN); what is being given is left out
    held(bufs, Lx) {
      const H = new Map(), add = (V, w) => { if (V && !bufs.includes(V)) for (const list of [V.ch, V.ac]) if (list) for (const c of list) if (c) H.set(c[0], w); };
      for (const L of this.loops) {
        if (L === Lx) continue;   // (a loop going as a whole – by itself, not by its id: a cleared one and its undo share it)
        for (const S of L.sch) {
          if (S.dead) continue;
          add(S, 'ver ' + S.id); add(S.old, 'old ' + S.id); for (const P of S.park || []) add(P, 'park ' + S.id); if (S.ws) add(S.ws.prev, 'prev ' + S.id);
          for (let t = 0; t < S.tn; t++) if (S.tc[t]) for (const c of S.tc[t]) if (c) H.set(c[0], 'tail ' + S.id + ':' + t + (S.tc[t] === S.ch ? '=ver' : S.old && S.tc[t] === S.old.ch ? '=old' : ''));
        }
      }
      return H;
    }
    heldBad(what, c, h) {
      this.heldN = (this.heldN || 0) + 1;
      if (this.F < (this.heldT || 0)) return;
      this.heldT = this.F + SR;
      this.port.postMessage({ nan: { held: this.heldN, what: JSON.stringify(what), h, F: this.F, by: this.gW.get(c[0]) || null, at: String(new Error().stack || '').split('\n').slice(1, 6).join(' | ') } });
    }
    // ---- reading: n frames of a chunk list (tot frames) from position p, step r per frame, × gain (g, or ga per frame) into (oL, oR) at o
    rd(ch, tot, p, r, n, o, g, ga, oL, oR) {
      const SH = this.SH, M = this.M;
      if (r === 1 && p === Math.floor(p)) {   // frame for frame: bit-exact
        let i = p, k = o; const e = o + n;
        while (k < e) {
          if (i < 0) { const s = Math.min(e - k, -i); k += s; i += s; continue; }
          if (i >= tot) break;
          const c = ch[i >> SH]; if (!c) break;
          const L = c[0], R = c[1], m = Math.min(e - k, M + 1 - (i & M), tot - i);
          let j = i & M;
          if (ga) for (let z = 0; z < m; z++, j++, k++) { const w = ga[k]; oL[k] += w * L[j]; oR[k] += w * R[j]; }
          else for (let z = 0; z < m; z++, j++, k++) { oL[k] += g * L[j]; oR[k] += g * R[j]; }
          i += m;
        }
        return;
      }
      // (step 2b: read faster than its own rate – a speed step up – through a kernel whose band ends below the output's
      // Nyquist; the shared one up to 1.03)
      const ar = r < 0 ? -r : r, K = ar > 1.03 ? (ar > 1.6 ? RSK.k24 : RSK.k16) : null, T = K ? K.T : RS, NT = K ? K.N : RS_T, CC = K ? K.C : RS_C;
      for (let k = o; k < o + n; k++, p += r) {
        const i = Math.floor(p), ph = (p - i) * RS_N, p0 = ph | 0, a = ph - p0, c0 = p0 * NT;
        let i0 = i - CC;
        if (i0 + NT <= 0 || i0 >= tot) continue;
        let sl = 0, sr = 0;
        if (i0 >= 0 && i0 + NT <= tot && (i0 & M) + NT <= M + 1) {   // all taps in one chunk
          const c = ch[i0 >> SH]; if (!c) continue;   // (step 2a: a Wuchs pass's chunk not streamed in yet reads as silence – never a throw)
          const L = c[0], R = c[1], j0 = i0 & M;
          for (let t = 0; t < NT; t++) { const w = T[c0 + t] + a * (T[c0 + NT + t] - T[c0 + t]); sl += w * L[j0 + t]; sr += w * R[j0 + t]; }
        } else {
          for (let t = 0; t < NT; t++, i0++) {
            if (i0 < 0 || i0 >= tot) continue;
            const c = ch[i0 >> SH]; if (!c) continue;
            const j = i0 & M, w = T[c0 + t] + a * (T[c0 + NT + t] - T[c0 + t]);
            sl += w * c[0][j]; sr += w * c[1][j];
          }
        }
        const w = ga ? ga[k] : g; oL[k] += w * sl; oR[k] += w * sr;
      }
    }
    // an envelope's gains for n frames into arr[o…]; false while it holds still (then E.v is the gain)
    env(E, arr, o, n) {
      if (E.i >= E.N) return false;
      for (let k = o; k < o + n; k++) {
        if (E.i < E.N) {
          const x = (E.i + 0.5) / E.N, s = 0.5 - 0.5 * Math.cos(Math.PI * x);
          E.v = E.a === 0 ? E.b * Math.sin(HP * s) : E.b === 0 ? E.a * Math.cos(HP * s) : E.a + (E.b - E.a) * s;
          if (++E.i === E.N) E.v = E.b;
        }
        arr[k] = E.v;
      }
      return true;
    }
    // ---- capture: both inputs into their rings at the frame they sound (a gap in the clock becomes silence) ----
    cap(inputs, F, n) {
      for (let r = 0; r < (this.ext1 ? 1 : 2); r++) this.capR(r, inputs[r], F, n);   // (with ext1, ring 1 is written by myzel-ring-in)
      if (this.nB > 2) this.capR(2, inputs[2], F, n);   // (step 2b: the Puls's lanes)
      if (this.micOn) this.capR(this.nR - 1, inputs[this.nR - 1], F, n);   // (step 4: the Mikro)
      this.lvN += n;
    }
    capR(r, inp, F0, n) {
      const CH = this.CH, a = inp && inp[0], b = inp && (inp[1] || inp[0]), H = this.hum[r];
      if (this.h0[r] < 0) this.h0[r] = F0;
      if (this.capF[r] >= 0 && F0 > this.capF[r]) this.zero(r, this.capF[r], Math.min(F0, this.capF[r] + this.hN * CH));
      if (this.capF[r] > F0) return;   // (a block written already)
      let x = F0, k = 0, e = 0;
      while (k < n) {
        const c = Math.floor(x / CH), ch = H[((c % this.hN) + this.hN) % this.hN], j = x - c * CH, m = Math.min(n - k, CH - j), L = ch[0], R = ch[1];
        if (a) for (let z = 0; z < m; z++) { const l = a[k + z], q = b[k + z]; L[j + z] = l; R[j + z] = q; e += l * l + q * q; }
        else { L.fill(0, j, j + m); R.fill(0, j, j + m); }   // (no input – silence, a sleeping graph: the same zeros, written at once)
        k += m; x += m;
      }
      this.lv[r] += e;
      this.capF[r] = F0 + n;
    }
    zero(r, x, e) {
      const CH = this.CH, H = this.hum[r];
      while (x < e) { const c = Math.floor(x / CH), ch = H[((c % this.hN) + this.hN) % this.hN], j = x - c * CH, m = Math.min(e - x, CH - j); ch[0].fill(0, j, j + m); ch[1].fill(0, j, j + m); x += m; }
    }
    // the jobs, two chunks' worth per block, oldest first: a grab (a window of a ring copied into the page's chunks, sent
    // when complete – frames the ring no longer or not yet held count as lost and stay silent), a live fill (a Schicht's
    // own chunks, and a copy for the page, through the punch envelope), a sample-rate conversion. A job whose window has
    // not sounded yet waits without holding up the others.
    grabs(Fe) {
      let budget = 2 * this.CH;
      const CH = this.CH;
      for (let ji = 0; ji < this.jobs.length && budget > 0; ji++) {
        const J = this.jobs[ji];
        if (J.rs) { budget -= this.rsJob(J, budget); if (J.x >= J.f1) { this.jobs.splice(ji--, 1); this.done1(J); } continue; }
        if (J.dd) continue;   // (step 1d: after the others, below)
        if (J.acp) {   // (step 4) a Sammelschleife's tape copied for the page (to be kept): its chunks as they are, two a block
          const e = Math.min(J.f1, J.x + budget), M = this.M, SH = this.SH;
          for (let x = J.x; x < e; ) { const c = J.src[x >> SH], dc = J.dst[x >> SH], j = x & M, k = Math.min(e - x, M + 1 - j); if (c && dc && c[0].length) { dc[0].set(c[0].subarray(j, j + k), j); dc[1].set(c[1].subarray(j, j + k), j); } x += k; }
          budget -= e - J.x; J.x = e;
          if (J.x >= J.f1) { this.jobs.splice(ji--, 1); const tr = []; for (const c of J.dst) tr.push(c[0].buffer, c[1].buffer); this.port.postMessage({ accCopied: { schicht: J.id, n: J.f1, chunks: J.dst } }, tr); }
          continue;
        }
        if (!J.dst || J.dst.length * CH < J.f1 - J.f0) { this.jobs.splice(ji--, 1); this.port.postMessage({ grabbed: { id: J.id, err: 'pool' } }); continue; }
        if (J.S && !J.dst[0][0].buffer.byteLength) { this.jobs.splice(ji--, 1); J.lost = -1; this.done1(J); continue; }   // (its Schicht went back to the page; the copy goes too)
        const H = this.hum[J.inp], Fr = Math.min(Fe, this.capF[J.inp] >= 0 ? this.capF[J.inp] : Fe), h0 = this.h0[J.inp], old = this.hOK && h0 >= 0 ? Math.max(h0, Fr - this.hN * CH) : Infinity;   // (only what its ring holds yet)
        const e = Math.min(J.f1, Fr, J.x + budget), G = J.gate, D2 = J.cp;
        while (J.x < e) {
          const x = J.x, d = x - J.f0, ci = Math.floor(d / CH), dc = J.dst[ci], dj = d % CH, cc = D2 && D2[ci];
          let m = Math.min(e - x, CH - dj);
          if (x < old) {
            m = Math.min(m, old - x);
            dc[0].fill(0, dj, dj + m); dc[1].fill(0, dj, dj + m); if (cc) { cc[0].fill(0, dj, dj + m); cc[1].fill(0, dj, dj + m); }
            J.lost += m;
          } else {
            const c = Math.floor(x / CH), sc = H[c % this.hN], sj = x - c * CH;
            m = Math.min(m, CH - sj);
            const sL = sc[0], sR = sc[1], DL = dc[0], DR = dc[1];
            if (G) for (let z = 0; z < m; z++) { const w = this.gateW(G, x + z, false); DL[dj + z] = w * sL[sj + z]; DR[dj + z] = w * sR[sj + z]; }
            else for (let z = 0; z < m; z++) { DL[dj + z] = sL[sj + z]; DR[dj + z] = sR[sj + z]; }
            if (cc) { const CL = cc[0], CR = cc[1]; for (let z = dj; z < dj + m; z++) { CL[z] = DL[z]; CR[z] = DR[z]; } }
          }
          if (J.dr && this.dR) for (let k = Math.ceil((x - J.f0) / 128); k < J.dr.length && J.f0 + k * 128 < x + m; k++) J.dr[k] = this.drAt(J.f0 + k * 128);   // (the drift along with it: read a pass later)
          J.x += m; budget -= m;
        }
        if (J.x < J.f1) continue;   // (the rest of its window has not sounded yet)
        this.jobs.splice(ji--, 1);
        this.done1(J);
      }
      // (step 1d) one de-drift job a block, after every other job's share
      for (let ji = 0; ji < this.jobs.length; ji++) {
        const J = this.jobs[ji]; if (!J.dd) continue;
        this.ddJob(J);
        if (J.ph >= 4) {
          this.jobs.splice(ji, 1);
          this.port.postMessage({ ddRun: { schicht: J.S.id, on: 0 } });
          if (J.ph === 4 && J.S.pv === J.pv && !J.S.dead && !J.S.dying) { if (J.S.ddN) this.ddBack(J.S.id, J.S.ddN.dst); J.S.ddN = J; } else this.ddBack(J.S.id, J.dst);
        }
        break;
      }
    }
    // the drift its window was played with, one value per 128 frames from its first frame (its arrays came from the page)
    drFill(J) {
      for (const D of [J.dr, J.drc]) if (D) for (let i = 0; i < D.length; i++) D[i] = this.drAt(J.f0 + i * 128);
    }
    done1(J) {
      if (J.dr || J.drc) this.drFill(J);
      if (J.rs) { const tr = []; for (const L of [J.dst, J.ch]) for (const c of L) tr.push(c[0].buffer, c[1].buffer); this.port.postMessage({ rsd: { id: J.id, chunks: J.dst, src: J.ch } }, tr); return; }
      if (J.S) {   // a live fill: the Schicht keeps its chunks, the page gets the copy
        const tr = []; if (J.cp) for (const c of J.cp) { tr.push(c[0].buffer, c[1].buffer); this.gW.set(c[0], ['filled', J.id, this.F]); }
        if (J.drc) tr.push(J.drc.buffer);
        this.port.postMessage({ filled: { schicht: J.id, v: J.v, chunks: J.cp, f0: J.f0, n: J.f1 - J.f0, lost: J.lost, dr: J.drc || null } }, tr);
        if (J.S.id != null && J.lost >= 0) this.ddAsk(J.S);   // (step 1d: complete – its de-drifted version)
        return;
      }
      const tr = []; for (const c of J.dst) { tr.push(c[0].buffer, c[1].buffer); this.gW.set(c[0], ['grabbed', J.id, this.F]); }
      if (J.drc) tr.push(J.drc.buffer);
      this.port.postMessage({ grabbed: { id: J.id, chunks: J.dst, f0: J.f0, n: J.f1 - J.f0, lost: J.lost, dr: J.drc || null } }, tr);
    }
    // a sample-rate conversion: output frame j reads the source at j · ratio through the polyphase resampler
    rsJob(J, budget) {
      const CH = this.CH, SH = this.SH, M = this.M, m0 = Math.min(J.T ? J.blk : budget, J.f1 - J.x), T = J.T, N = J.NT, CC = N / 2 - 1, ch = J.ch, tot = J.tot;
      for (let z = 0; z < m0; z++, J.x++) {
        const c = J.dst[J.x >> SH]; if (!c) { J.x = J.f1; break; }
        const k = J.x & M;
        if (!T) { const s = ch[J.x >> SH]; if (s && J.x < tot) { c[0][k] = s[0][J.x & M]; c[1][k] = s[1][J.x & M]; } continue; }   // (the same rate: a copy)
        const p = J.x * J.ratio, i = Math.floor(p), ph = (p - i) * RS_N, p0 = ph | 0, a = ph - p0, b0 = p0 * N;
        let sl = 0, sr = 0;
        for (let t = 0, i0 = i - CC; t < N; t++, i0++) {
          if (i0 < 0 || i0 >= tot) continue;
          const s = ch[i0 >> SH]; if (!s) continue;
          const w = T[b0 + t] + a * (T[b0 + N + t] - T[b0 + t]), q = i0 & M;
          sl += w * s[0][q]; sr += w * s[1][q];
        }
        c[0][k] = sl; c[1][k] = sr;
      }
      return J.T ? budget : m0;   // (a conversion takes this block's whole share of the jobs: blk frames × 160 taps)
    }
    process(inputs, outputs) {
      const o0 = outputs[0], o1 = outputs[1], n = o0 && o0[0] ? o0[0].length : 128;
      const est = currentFrame - this.done;
      if (est > this.base) this.base = est;
      const F = this.base + this.done + this.fOff;
      this.F = F;
      this.cfOff = F - currentFrame;   // (myzel-ring-in writes ring 1 at currentFrame + this, whichever runs first)
      if (this.drIn) { const di = inputs[1] && inputs[1][0]; this.dv = di ? di[0] : 0; this.dR[Math.floor(F / 128) % this.dRN] = this.dv; this.dvF = this.dv === 0 ? 1 : Math.pow(2, Math.max(-20, Math.min(20, this.dv)) / 1200); }
      if (this.hOK) this.cap(inputs, F, n);
      if (this.jobs.length) this.grabs(F + n);
      const outs = [o0, o1, outputs[2]];
      for (let i = 0; i < 2; i++) { const o = outs[i]; if (o) for (let c = 0; c < o.length; c++) o[c].fill(0); }
      if (outs[2] && this.sndW) { for (let c = 0; c < outs[2].length; c++) outs[2][c].fill(0); this.sndW = false; }   // (step 1d: the sends – only while one sounds)
      // the timed actions split the block at their frames
      let pos = 0;
      while (this.q.length && this.q[0].f < F + n) {
        const e = this.q[0], at = Math.max(pos, e.f - F);
        if (at > pos) { this.play(outs, F, pos, at); pos = at; }
        this.q.shift();
        this.act(e, F + pos);
      }
      if (pos < n) this.play(outs, F, pos, n);
      this.done += n;
      // reports: the clock pair, the meters
      if ((this.rep -= n) <= 0) { this.rep += Math.round(0.25 * SR); this.port.postMessage({ frame: F, t: currentTime }); }
      if (this.wpt.length && (this.wrep -= n) <= 0) { this.wrep += Math.round(0.1 * SR); for (const p of this.wpt) p.postMessage({ fr: F + n }); }
      if ((this.loops.length || this.hOK) && (this.met -= n) <= 0) {   // (and the two rings' input level: what the Humus holds)
        this.met += Math.round(SR / 15);
        const lo = []; for (const L of this.loops) { lo.push([L.id, L.mn ? Math.sqrt(L.ms / L.mn) : 0, L.mp]); L.ms = L.mp = L.mn = 0; }
        const N = Math.max(1, 2 * this.lvN), inp = [Math.sqrt(this.lv[0] / N), Math.sqrt(this.lv[1] / N), Math.sqrt(this.lv[2] / N), Math.sqrt(this.lv[3] / N)];   // (step 2b: and the Puls's ring; step 4: the Mikro's)
        this.lv[0] = this.lv[1] = this.lv[2] = this.lv[3] = 0; this.lvN = 0;
        this.port.postMessage({ meter: { loops: lo, inp, F } });
      }
      return true;
    }
    // the drift at frame f as the ring kept it – 0 before the first frame (a window reaching back past the start: a
    // negative index would read outside the ring, NaN into the Schicht's drift and its read rate; found by t-hx-fuzz)
    drAt(f) { return f < 0 || !this.dR ? 0 : this.dR[Math.floor(f / 128) % this.dRN]; }
    // a Schicht's drift (one value per 128 frames of its buffer) at buffer position pos, straight between
    dAt(D, pos) { const x = Math.max(0, Math.min(D.length - 1, pos / 128)), i = Math.min(D.length - 2, x | 0); return D.length > 1 ? D[i] + (x - i) * (D[i + 1] - D[i]) : D[0]; }
    // (step 1d) a read joins the group of its output and class when it has the group's rate and phase (the same fractional
    // position): the group sums their sources, frame by frame, and resamples the sum once – the resampler being linear,
    // that is the sum of their resampled reads. Its first member sets rate and phase; false: read it on its own
    grp(k, ch, tot, p, r, g) {
      const G = this.gM[k];
      if (!G.n) { G.r = r; G.p = p; G.fr = p - Math.floor(p); }
      else { if (r !== G.r || G.n >= 16) return false; const f = p - Math.floor(p); if (Math.abs(f - G.fr) > 1e-9 && Math.abs(Math.abs(f - G.fr) - 1) > 1e-9) return false; }
      const i = G.n++; G.ch[i] = ch; G.tot[i] = tot; G.d[i] = Math.round(p - G.p); G.g[i] = g;
      return true;
    }
    grpRun(k, n, o, oL, oR) {
      const G = this.gM[k], M = this.M, SH = this.SH;
      if (G.n === 1) { this.rd(G.ch[0], G.tot[0], G.p, G.r, n, o, G.g[0], null, oL, oR); G.ch[0] = null; G.n = 0; return; }
      const ar = G.r < 0 ? -G.r : G.r, NT = ar > 1.6 ? 80 : ar > 1.03 ? 56 : RS_T, CC = NT / 2 - 1;   // (step 2b: the kernel rd will read the sum with)
      const i0 = Math.floor(G.p) - CC, len = Math.min(this.CH, Math.floor(G.p + (n - 1) * G.r) - Math.floor(G.p) + NT + 2), W = this.gS[k], BL = W[0][0], BR = W[0][1];
      BL.fill(0, 0, len); BR.fill(0, 0, len);
      for (let m = 0; m < G.n; m++) {
        const ch = G.ch[m], tot = G.tot[m], g = G.g[m], a = i0 + G.d[m];
        let j = Math.max(0, -a); const je = Math.min(len, tot - a);
        while (j < je) {
          const x = a + j, c = ch[x >> SH]; if (!c) break;
          const cL = c[0], cR = c[1], xm = x & M, e = Math.min(je, j + (M + 1 - xm));
          for (let q = xm; j < e; j++, q++) { BL[j] += g * cL[q]; BR[j] += g * cR[q]; }
        }
        G.ch[m] = null;
      }
      this.rd(W, len, G.p - i0, G.r, n, o, 1, null, oL, oR);
      G.n = 0;
    }
    // a position in a Schicht's own buffer (S-space, from its start) → the de-drifted version's (its map: S-space positions
    // at every 32nd frame of the version, from the anchor pre on both sides)
    ddInv(map, pre, x) {
      if (!map) return x;
      const A = map.x, n = map.n;
      let lo = 0, hi = n - 1;
      if (x <= A[0]) return map.i0 + (x - A[0]);
      if (x >= A[n - 1]) return map.i0 + (n - 1) * 32 + (x - A[n - 1]);
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (A[m] <= x) lo = m; else hi = m; }
      return map.i0 + 32 * (lo + (x - A[lo]) / (A[hi] - A[lo]));
    }
    // every loop, frames [F + a, F + b) of the block (step 1d: one cleared before its first pass – nothing of it sounds yet,
    // its envelopes never step – goes at once; before, it kept its buffers until its entry came, if ever)
    play(outs, F, a, b) {
      for (let s = a; s < b; s += this.S) {
        const e = Math.min(b, s + this.S);
        if (this.nAcc) for (let i = 0; i < this.loops.length; i++) { const A = this.loops[i].acc; if (A) { A.L.fill(0, s, e); A.R.fill(0, s, e); } }   // (step 4: what the Sammelschleifen hear in this span)
        for (let i = 0; i < this.loops.length; i++) {
          const L = this.loops[i];
          this.loopSpan(L, F + s, F + e, s, outs);
          if (L.dying && (L.k < 0 || (L.st.i >= L.st.N && L.st.v === 0))) { this.give({ loop: L.id }, L.sch.filter((S) => !S.dead).concat(L.sch.filter((S) => S.old).map((S) => S.old), ...L.sch.map((S) => S.park || []), L.sch.filter((S) => S.ddN).map((S) => ({ ch: S.ddN.dst })), ...L.sch.map((S) => this.wsAll(S))), L); this.loops.splice(i--, 1); if (this.nAcc) this.accDrop(L); }
        }
        if (this.nAcc) for (let i = 0; i < this.loops.length; i++) { const B = this.loops[i]; if (B.acc && !B.dying) this.accWrite(B, F + s, F + e, s); }   // (after every loop has read this span: read before write)
      }
    }
    // (step 4) who feeds which Sammelschleife (made in a message: nothing allocated while it plays)
    accLink() {
      let n = 0;
      for (const L of this.loops) { if (L.accTo) L.accTo.length = 0; }
      for (const B of this.loops) if (B.acc) { n++; for (const id of B.acc.src) { const A = this.lp(id); if (A && A !== B) (A.accTo || (A.accTo = [])).push(B); } }
      this.nAcc = n;
    }
    accDrop(L) {   // (a loop gone: out of every list, in place)
      for (const X of this.loops) { const T = X.accTo; if (T) { const i = T.indexOf(L); if (i >= 0) T.splice(i, 1); } }
      if (L.acc) { this.nAcc = 0; for (const X of this.loops) if (X.acc) this.nAcc++; }
    }
    // the recording: at each frame of [X, Y) the position B read there – its pass's, or the pass that ended just before –
    // v = fb · v + what the sources played, through a soft ceiling (linear to 0.6, never past 1)
    accWrite(B, X, Y, o) {
      const A = B.acc; if (B.k < 0 || B.state === 'angehalten') return;
      let S = null; for (let i = 0; i < B.sch.length; i++) if (!B.sch[i].dead && !B.sch[i].dying) { S = B.sch[i]; break; }
      if (!S || !S.ch) return;
      const fb = A.fb, gi = A.gi, ch = S.ch, M = this.M, SH = this.SH, tot = S.tot, pre = S.pre, AL = A.L, AR = A.R, s0 = B.s0, p0 = B.ps0;
      for (let x = X, k = o; x < Y; x++, k++) {
        const i = pre + (x >= s0 ? x - s0 : x - p0); if (i < 0 || i >= tot) continue;
        const c = ch[i >> SH]; if (!c || !c[0].length) continue;
        const q = i & M; let l = fb * c[0][q] + gi * AL[k], r = fb * c[1][q] + gi * AR[k];
        if (l > 0.6 || l < -0.6) l = l > 0 ? 0.6 + 0.4 * Math.tanh((l - 0.6) * 2.5) : -0.6 - 0.4 * Math.tanh((-l - 0.6) * 2.5);
        if (r > 0.6 || r < -0.6) r = r > 0 ? 0.6 + 0.4 * Math.tanh((r - 0.6) * 2.5) : -0.6 - 0.4 * Math.tanh((-r - 0.6) * 2.5);
        c[0][q] = l === l ? l : 0; c[1][q] = r === r ? r : 0;
      }
    }
    loopSpan(L, X, Y, off, outs) {
      let x = X;
      if (L.re && L.k >= 0) {   // new segments: the next start derived again (one already passed acts at once)
        L.re = false;
        L.s1 = this.passAt(L, L.k + 1);
        if (L.s1 <= L.s0) L.s1 = L.s0 + 1;
      }
      while (x < Y) {
        if (L.k < 0) {
          const s0 = this.passAt(L, 0);
          if (s0 >= Y) return;
          if (s0 > x) x = s0;
          this.place(L, x);
          if (L.wantIn) { envGo(L.st, 1, L.wantIn); L.wantIn = 0; }
        }
        if (x >= L.s1) { this.advance(L, x); continue; }
        const e = Math.min(Y, L.s1);
        this.span(L, x, e, off + (x - X), outs);
        x = e;
      }
    }
    // frames [X, Y) inside one pass of L, into the outputs at o (each Schicht into its own: V[S.out])
    span(L, X, Y, o, outs) {
      const n = Y - X, V = this.V;
      for (let c = 0; c < 2; c++) { const v = V[c], a = v[0], b = v[1], p = v[2], q = v[3]; for (let k = o; k < o + n; k++) { a[k] = 0; b[k] = 0; p[k] = 0; q[k] = 0; } }
      let used = 0, fu = false;   // (fu: a tail free of the state was read)
      // the read rate glides to its target in a straight line (Taumeln, MIDI clock): one step per span
      if (L.r !== L.rt) { L.r += L.rv * n; if (!(L.rv > 0 ? L.r < L.rt : L.r > L.rt)) L.r = L.rt; }
      // (step 2b) the tape's speed: its mean over these frames, exactly as the glide's position runs (so a step lands in
      // phase); a stop fades over its last fifth and leaves the loop angehalten
      let vsm = L.vs, bgS = null;
      if (L.vg) { const G = L.vg; vsm = (this.vsPos(G, Y) - this.vsPos(G, X)) / n; if (G.stop) bgS = G; }
      const vgEnd = !!(L.vg && Y >= L.vg.f0 + L.vg.T);   // (its end acts after this span is mixed)
      const Lr = vsm === 1 ? L.r : L.r * vsm, slm = L.slA ? L.sl : null;
      const j0 = X - L.s0, q0 = L.q, sum = !this.noSum;
      if (sum) for (let k = 0; k < 4; k++) this.gM[k].n = 0;
      let any = false;
      // (Leistung, 23.10.2026) a loop whose state is a settled silence (angehalten, stumm) is read for nothing: what it
      // reads is multiplied by its state's 0 below. Its Schichten keep their place, their envelopes and their streams;
      // only the reads under the state stop – the Ausklänge free of it (a stop's, a Schlafen's) ring on. The same samples
      // as before (a worn Schicht is read on: its filter follows what it reads). Before, 8 halted loops cost as much on the
      // audio thread as 8 playing ones, and nothing counted them (the owner's phone report A: 8 loops, none playing)
      const mute = L.st.v === 0 && L.st.i >= L.st.N && !this.noMute;   // (po.noMute: read on – the tests' reference)
      for (let si = 0; si < L.sch.length; si++) {
        const S = L.sch[si];
        if (S.dead) continue;
        any = true;
        if (S.ws && !S.dying) this.wsCheck(L, S, Lr > 1 ? Math.ceil(n * Lr) + 48 : n);   // (step 2a: a living Schicht's pass – late, arrived, its moment)
        if (S.r !== S.rt) { S.r += S.rv * n; if (!(S.rv > 0 ? S.r < S.rt : S.r > S.rt)) S.r = S.rt; }
        // Taumeln: read faster or slower by the drift now against the drift there when it was played (step 1c) – or, a
        // de-drifted version (step 1d: its own drift taken out once, offline), by the drift now alone; rX: the other
        // reading's rate, for a continuation or an Ausklang of the version it replaced
        // (step 1d: the drift read at the span's middle – the step-1c read took it at its start and lagged the exact
        // path by up to ½ frame at ±8 ct, 2.5 Hz; at the middle 0.04 frames)
        let tr = 1, tX = 1;
        const c0 = Lr * S.r;
        if (S.ddA) {
          const D = S.dr0;
          if (this.drIn && S.tau) {
            tr = this.dvF;
            if (D) { const dd = this.dv - this.dAt(D, S.pre + S.q + 0.5 * n * c0 * tr); if (dd !== 0 && dd === dd) tX = Math.pow(2, Math.max(-20, Math.min(20, dd)) / 1200); }
          } else if (D) {   // (Taumeln off: its own drift back in)
            const d1 = this.dAt(D, S.pre + S.q), r1 = d1 === d1 ? Math.pow(2, Math.max(-20, Math.min(20, d1)) / 1200) : 1, d0 = this.dAt(D, S.pre + S.q + 0.5 * n * c0 * r1);
            if (d0 !== 0 && d0 === d0) tr = Math.pow(2, Math.max(-20, Math.min(20, d0)) / 1200);
          }
        } else {
          if (S.tau && S.dr && this.drIn) {
            const D = S.dr, d1 = this.dv - this.dAt(D, S.pre + S.q), r1 = d1 === d1 ? Math.pow(2, Math.max(-20, Math.min(20, d1)) / 1200) : 1, dd = this.dv - this.dAt(D, S.pre + S.q + 0.5 * n * c0 * r1);
            if (dd !== 0 && dd === dd) tr = Math.pow(2, Math.max(-20, Math.min(20, dd)) / 1200);   // (a NaN drift – stored before the fix of drAt – reads as none)
          }
          if (this.drIn && S.tau) tX = this.dvF;
        }
        const r = S.r === 1 && tr === 1 ? Lr : Lr * S.r * tr, rX = S.r === 1 && tX === 1 ? Lr : Lr * S.r * tX, sq = S.q;   // (r 1 exactly: frame for frame, bit-exact)
        S.q = sq + n * r;
        const so = S.f0 > X ? S.f0 - X : 0;
        if (so >= n) continue;
        const m = n - so, ko = o + so, qs = sq + so * r, ab = S.ab && S.ab.on && S.ab.age > 0 ? S.ab : null, Vo = ab ? this.AB : V[S.out];   // (step 2b: a worn Schicht is read into its own pair first)
        const skp = mute && !ab;   // (its reads under the state are skipped)
        // (step 4) gap (Treffen setzen): the pass is the phrase and a silence of its own length – the Schicht's window is read
        // once from the pass start, then its Ausklang (its own continuation, to the first foreign onset) rings on as a tail;
        // a pass shorter than the window cuts only its silence, the rest rings on over the seam. Nothing is stretched.
        const gp = L.gap && !S.wu && !S.ws && !slm;
        let mr = m;
        if (gp) { if (S.gapX) mr = 0; else { const left = S.len - qs; if (left <= 0) mr = 0; else if (left < m * r) mr = Math.min(m, Math.ceil(left / r)); if (mr < m) { this.gapTail(S, qs + mr * r, mr); S.gapX = true; } } }
        if (ab) { this.AB[0].fill(0, ko, ko + m); this.AB[1].fill(0, ko, ko + m); }
        used |= 1 << S.out;
        if (S.fd) { envGo(S.e, S.g, S.fd); S.fd = 0; }   // its fade-in, from the first frame it sounds
        const gA = this.gA, gc = !this.env(S.e, gA, ko, m), g = S.e.v;   // (a holding gain: g; else per frame in gA)
        // the seam of a warm join: the pass that just ended goes on under this one's start – from the bar line, or alone
        // up to the seam's place inside the pass (zo: Nahtwahl), then the fade. The smooth equal-power law, normalised
        // by the seam's gain curve kc (the time-local level, measured by the page on both sides) or by their correlation
        // rho, so the level holds through the fade whatever the phases (the gain at most ×2)
        const zA = S.zo, jz = j0 + so, zx = S.join === 'xf' && !gp && S.pp && L.k > 0 && jz < zA + S.X ? Math.min(m, zA + S.X - jz) : 0;
        const xr = !this.env(S.xin, this.gC, ko, m) ? null : this.gC;
        // (step 2a) a mid-pass crossing between Wuchs versions: the equal-power pair normalised by their correlation
        const xn = xr && S.xrho && S.old && !S.old.seam ? this.gN : null;
        if (xn) for (let k = ko; k < ko + m; k++) { const a = xr[k], b = Math.sqrt(Math.max(0, 1 - a * a)); xn[k] = Math.min(2, 1 / Math.sqrt(Math.max(0.25, 1 + 2 * S.xrho * a * b))); xr[k] = a * xn[k]; }
        else if (!xr) S.xrho = 0;
        if (zx || xr) {
          const gB = this.gB, gI = this.gD;
          for (let k = ko; k < ko + m; k++) gB[k] = (gc ? g : gA[k]) * (xr ? xr[k] : 1);
          let mz = 0;   // (frames before the seam's place: the pass that ended alone, the main read starts after them)
          if (zx) {
            const rho = S.rho, kc = S.kc, K = kc ? kc.length - 1 : 0;
            for (let z = 0; z < zx; z++) {
              const k = ko + z, u = jz + z - zA, w = gc ? g : gA[k];
              if (u < 0) { gI[k] = w; gB[k] = 0; mz = z + 1; continue; }
              const x = (u + 0.5) / S.X, s = 0.5 - 0.5 * Math.cos(Math.PI * x), a = Math.sin(HP * s), b = Math.cos(HP * s);
              let nk;
              if (kc) { const p = x * K, i = Math.min(K - 1, p | 0), f = p - i; nk = kc[i] + f * (kc[i + 1] - kc[i]); }
              else nk = Math.min(2, 1 / Math.sqrt(Math.max(0.25, 1 + 2 * rho * a * b)));
              gI[k] = w * b * nk; gB[k] *= a * nk;
            }
            const C = S.old && S.old.seam && (!S.old.tld || S.old.kS === L.k) ? S.old : S, co = C === S ? S.out : C.out, Vc = ab ? Vo : V[co];   // (the pass that ended: the version swapped out at this seam, out of its own output – at that seam only, step 2a)
            used |= 1 << co;
            if (!skp) this.rd(C.ch, C.tot, C.pre + S.pe + qs, !!C.ddA === !!S.ddA ? r : rX, zx, ko, 0, gI, Vc[0], Vc[1]);
          }
          if (skp) { /* (silent: nothing read) */ } else if (mz < mr) { if (slm) this.slRd(L, S, j0 + so + mz, mr - mz, ko + mz, r, 0, gB, Vo); else this.rd(S.ch, S.tot, S.pre + qs + mz * r, r, mr - mz, ko + mz, 0, gB, Vo[0], Vo[1]); }
        } else if (skp) { /* (silent: nothing read) */ } else if (slm) this.slRd(L, S, j0 + so, m, ko, r, g, gc ? null : gA, Vo);   // (step 2b: the pass in slices – Schnitt, Auslassen, Würfeln)
        else if (mr > 0 && !(sum && !ab && gc && mr === n && r !== 1 && this.grp(2 * S.out, S.ch, S.tot, S.pre + qs, r, g))) this.rd(S.ch, S.tot, S.pre + qs, r, mr, ko, g, gc ? null : gA, Vo[0], Vo[1]);
        if (S.old && !S.old.seam) {   // the version being swapped out mid-pass: at the same place, fading
          const O = S.old, gO = this.gB, oc = !this.env(O.xo, gO, ko, m), Vx = ab ? Vo : V[O.out];
          used |= 1 << O.out;
          if (oc) for (let k = ko; k < ko + m; k++) gO[k] = O.xo.v;
          for (let k = ko; k < ko + m; k++) gO[k] *= gc ? g : gA[k];
          if (xn) for (let k = ko; k < ko + m; k++) gO[k] *= xn[k];
          const same = !!O.ddA === !!S.ddA;   // (a de-drifted version crossing a new one mid-pass: at the same place of the music)
          if (skp) { /* (silent: nothing read) */ } else if (slm) this.slRd(L, O, j0 + so, m, ko, same ? r : rX, 0, gO, Vx);
          else this.rd(O.ch, O.tot, same ? O.pre + qs : O.ddA ? this.ddInv(O.ddMap, O.pre, O.pre + qs) : O.pre + qs, same ? r : rX, m, ko, 0, gO, Vx[0], Vx[1]);   // (step 2a: each version from its own start – a Wuchs one has no margin)
        }
        if (ab) this.abApply(S, ab, ko, m, qs, r, V[S.out]);   // (step 2b: its wear, then into its output)
        // the Ausklang streams of earlier passes (free ones – a stop's – are not under the loop's state)
        for (let t = 0; t < S.tn; t++) {
          // (the Ausklang's end may be cut later – at the first foreign onset – with a fade of its own: read it as it is now)
          const fr = S.tfr[t], N = S.tfN[t], ch = S.tc[t], au = S.tsrc[t] === 0 && ch === S.ac && !S.old, lim = au ? S.aend : S.tl[t], fe = au ? S.afd : 0, p0 = S.tb[t] + S.tq[t];
          const rt = S.tsd[t] === (S.ddA ? 1 : 0) ? r : rX;   // (an Ausklang of the version this one replaced reads as that one did)
          const sk = Math.min(m, S.tst[t]), k0 = ko + sk, m2 = m - sk; S.tst[t] = 0;   // (step 4: a tail that begins inside this span – the gap's)
          let ga = gc ? null : gA;
          if (N || (fe && p0 + m2 * rt > lim - fe)) {   // a fade-out of its own (the smooth law), or the cut's
            const gE = this.gB;
            for (let k = k0, i = S.tfI[t], p = p0; k < k0 + m2; k++, i++, p += rt) {
              let w = gc ? g : gA[k];
              if (N) w *= i < 0 ? 1 : i >= N ? 0 : Math.cos(HP * (0.5 - 0.5 * Math.cos(Math.PI * (i + 0.5) / N)));
              if (fe && p > lim - fe) w *= p >= lim ? 0 : Math.cos(HP * (0.5 - 0.5 * Math.cos(Math.PI * (p - lim + fe + 0.5) / fe)));
              gE[k] = w;
            }
            ga = gE; if (N) S.tfI[t] += m2;
          }
          const to = S.tout[t], Vt = V[to];
          used |= 1 << to; if (fr) fu = true;
          if (m2 > 0 && !(skp && !fr) && !(sum && !ga && m2 === n && rt !== 1 && this.grp(2 * to + (fr ? 1 : 0), ch, lim, p0, rt, g))) this.rd(ch, lim, p0, rt, m2, k0, g, ga, fr ? Vt[2] : Vt[0], fr ? Vt[3] : Vt[1]);
          S.tq[t] += m2 * rt;
          if (S.tb[t] + S.tq[t] >= lim + RS_T || (N && S.tfI[t] >= N)) { const e = S.tn - 1; S.tq[t] = S.tq[e]; S.tb[t] = S.tb[e]; S.tc[t] = S.tc[e]; S.tl[t] = S.tl[e]; S.tfr[t] = S.tfr[e]; S.tfN[t] = S.tfN[e]; S.tfI[t] = S.tfI[e]; S.tsrc[t] = S.tsrc[e]; S.tout[t] = S.tout[e]; S.tsd[t] = S.tsd[e]; S.tst[t] = S.tst[e]; S.tc[e] = null; S.tn--; t--; }
        }
        // (what goes back to the page goes once this span's summed reads are done – a read of it may be waiting in a group)
        if (S.old && (S.old.seam ? Y >= S.old.end : S.old.xo.i >= S.old.xo.N) && !this.uses(S, S.old)) { const O = S.old; S.old = null; if (!O.ws && !this.sharedV(S, O)) this.gvQ.push([{ schicht: S.id, old: 1 }, [O]]); }   // (the old version done: back to the page – a stream slot's goes with its slot, the fallback stays)
        if (S.park) for (let i = 0; i < S.park.length; i++) if (!this.uses(S, S.park[i])) { if (!S.park[i].ws && !this.sharedV(S, S.park[i])) this.gvQ.push([{ schicht: S.id, old: 1 }, [S.park[i]]]); S.park.splice(i--, 1); }   // (versions kept for their Ausklänge)
        if (S.ws) this.wsGc(L, S);
        if (S.dying && S.e.i >= S.e.N && S.e.v === 0) { S.dead = true; S.tn = 0; this.gvQ.push([{ schicht: S.id }, (S.old ? [S, S.old] : [S]).concat(S.park || [], S.ddN ? [{ ch: S.ddN.dst }] : [], this.wsAll(S))]); S.old = null; S.park = null; S.ddN = null; L.sch.splice(si--, 1); }
      }
      if (sum) for (let k = 0; k < 4; k++) if (this.gM[k].n) { const Vg = V[k >> 1]; this.grpRun(k, n, o, (k & 1) ? Vg[2] : Vg[0], (k & 1) ? Vg[3] : Vg[1]); }
      if (this.gvQ.length) { for (let i = 0; i < this.gvQ.length; i++) this.give(this.gvQ[i][0], this.gvQ[i][1]); this.gvQ.length = 0; }
      L.q = q0 + n * Lr;
      if (L.wk && X >= L.wk.f1) this.wilted(L);
      if (!any && L.st.i >= L.st.N && L.lv.i >= L.lv.N) { if (vgEnd) this.vsEnd(L); return; }
      // the loop's level and state, its balance – into each output something was read for; then the meter (step 1d: a
      // Schluss „welkend“ shapes it – the low pass and the gain with its drop-outs; the send to its own web takes it all)
      const lc = !this.env(L.lv, this.lA, o, n), sc = !this.env(L.st, this.sA, o, n), lv = L.lv.v, sv = L.st.v;
      const p = L.pan, gl = p > 0 ? 1 - p : 1, gr = p < 0 ? 1 + p : 1, W = L.wk ? this.wilt(L, X, o, n) : false, WA = this.wA, WG = this.wG;
      const O2 = L.sendCh >= 0 && outs[2] && outs[2][2 * L.sendCh + 1] ? outs[2] : null, sgc = O2 ? !this.env(L.sg, this.sgA, o, n) : true, sgv = L.sg.v, SG = this.sgA;
      const SL = O2 ? O2[2 * L.sendCh] : null, SR2 = O2 ? O2[2 * L.sendCh + 1] : null;
      if (O2) this.sndW = true;
      const BG = bgS ? this.bG : null, AT = L.accTo && L.accTo.length ? L.accTo : null;   // (step 4: the Sammelschleifen it feeds)
      if (BG) for (let k = o, F = X; k < o + n; k++, F++) { const x = (F - bgS.f0) / bgS.T; BG[k] = x < 0.8 ? 1 : x >= 1 ? 0 : Math.cos(HP * (0.5 - 0.5 * Math.cos(Math.PI * (x - 0.8) / 0.2))); }   // (step 2b: a stop fades over its last fifth – the tape near standstill only hums)
      let ms = 0, mp = 0;
      const nil = mute && !fu && !W;   // (silent, nothing free of the state rang: every sample below would add an exact 0)
      for (let c = 0; c < 2; c++) {
        if (!(used & (1 << c)) || nil) continue;
        const out = outs[c] || outs[0], v = V[c], bL = v[0], bR = v[1], tL = v[2], tR = v[3], OL = out[0], OR = out[1] || out[0];
        let zl = W ? L.lpS[2 * c] : 0, zr = W ? L.lpS[2 * c + 1] : 0;
        for (let k = o; k < o + n; k++) {
          const l = lc ? lv : this.lA[k], g = l * (sc ? sv : this.sA[k]);
          let yl = gl * (g * bL[k] + l * tL[k]), yr = gr * (g * bR[k] + l * tR[k]);
          if (W) { const a = WA[k]; if (a >= 1) { zl = yl; zr = yr; } else { zl += a * (yl - zl); zr += a * (yr - zr); } const w = WG[k]; yl = zl * w; yr = zr * w; }
          if (BG) { const w = BG[k]; yl *= w; yr *= w; }
          OL[k] += yl; if (OR !== OL) OR[k] += yr;
          if (O2) { const s = sgc ? sgv : SG[k]; SL[k] += s * yl; SR2[k] += s * yr; }
          if (AT) for (let q = 0; q < AT.length; q++) { const A2 = AT[q].acc; if (A2) { A2.L[k] += yl; A2.R[k] += yr; } }
          ms += yl * yl + yr * yr; const a = yl < 0 ? -yl : yl, b2 = yr < 0 ? -yr : yr; if (a > mp) mp = a; if (b2 > mp) mp = b2;
        }
        if (W) { L.lpS[2 * c] = zl; L.lpS[2 * c + 1] = zr; }
      }
      if (O2 && sgc && sgv === 0 && L.sg.b === 0) L.sendCh = -1;   // (a send faded out: off)
      if (!(ms <= 1e30)) this.nanTrip(L, X, o, n, outs, O2);   // (a non-finite sample: one compare per span – scrubbed, reported)
      L.ms += ms / 2; L.mn += n; if (mp > L.mp) L.mp = mp;
      if (vgEnd) this.vsEnd(L);
    }
    // (step 2b) the tripwire: a NaN or an infinity out of a loop would sound as silence or a blast and stay in every
    // filter and the echo behind it – the span's outputs are scrubbed to 0 there, the loop's filter state too, and the
    // first one a second is told to the page with what the loop held (positions, gains, chunks NaN or given back)
    nanTrip(L, X, o, n, outs, O2) {
      let bad = 0;
      for (const O of [outs[0], outs[1], O2]) if (O) for (const c of O) if (c) for (let k = o; k < o + n; k++) { const x = c[k]; if (!(x - x === 0)) { c[k] = 0; bad++; } }
      for (let i = 0; i < 4; i++) if (!(L.lpS[i] - L.lpS[i] === 0)) L.lpS[i] = 0;
      L.ms = L.mp = 0; this.nanN = (this.nanN || 0) + bad;
      if (this.F < (this.nanT || 0)) return;
      this.nanT = this.F + SR;
      const scan = (ch, tot) => { let nan = 0, det = 0, nul = 0, who = null; if (ch) for (const c of ch) { if (!c) { nul++; continue; } if (!c[0].length || !c[1].length) { det++; if (!who) who = this.gW.get(c[0]) || 'page'; continue; } for (const a of c) for (let j = 0; j < a.length; j++) if (!(a[j] - a[j] === 0)) nan++; } return [nan, det, nul, ch ? ch.length : -1, tot, who]; };
      const fin = (x) => (x - x === 0 ? x : String(x));
      const one = (S) => S && { id: S.id, wu: S.wu ? 1 : 0, ws: S.ws ? S.ws.slots.length : 0, out: S.out, r: fin(S.r), q: fin(S.q), pe: fin(S.pe), pre: fin(S.pre), len: fin(S.len), f0: fin(S.f0), ev: S.e ? fin(S.e.v) : null, g: fin(S.g), xin: S.xin ? fin(S.xin.v) : null, xo: S.xo ? fin(S.xo.v) : null, rho: fin(S.rho), xrho: fin(S.xrho || 0),
        kc: S.kc ? S.kc.some((v) => !(v - v === 0)) : null, zo: S.zo, X: S.X, join: S.join, ddA: S.ddA, dr0: S.dr0 ? S.dr0.some((v) => !(v - v === 0)) : null, dr: S.dr ? S.dr.some((v) => !(v - v === 0)) : null, aoff: fin(S.aoff), aend: fin(S.aend),
        tn: S.tn, t: Array.from({ length: S.tn || 0 }, (_, t) => [fin(S.tb[t]), fin(S.tq[t]), fin(S.tl[t]), S.tsrc[t], S.tfN[t], scan(S.tc[t], S.tl[t])]),
        ch: scan(S.ch, S.tot), ac: S.ac !== S.ch ? scan(S.ac, S.aend) : null, seam: S.seam ? 1 : 0 };
      const rep = { F: X, loop: L.id, bad, r: fin(L.r), q: fin(L.q), k: L.k, s0: L.s0, s1: L.s1, lv: fin(L.lv.v), st: fin(L.st.v), sg: fin(L.sg.v), wk: !!L.wk, dv: fin(this.dv), dvF: fin(this.dvF),
        sch: L.sch.map((S) => Object.assign(one(S), { old: one(S.old), park: (S.park || []).map(one), wsl: S.ws ? S.ws.slots.map((Z) => [Z.k, Z.c0, Z.hi, Z.dead ? 1 : 0, scan(Z.ch, Z.n)]) : null })) };
      this.port.postMessage({ nan: rep });
    }
    // (step 2b) the tape's position since a glide began (content frames): a step glides by the servo law g(x) = (1 − x)³ ·
    // (1 − 5x) around its target – its integral is 0, so after the glide the tape stands exactly where a switch at once
    // would have put it (the pass ends at its seam with its last frame; the price: the pitch passes the target by ≈ 22 %
    // of the step and settles); a stop runs down exponentially to standstill (e^−5x, to 0 at its end)
    vsPos(G, F) {
      const u = F - G.f0; if (u <= 0) return G.r0 * u;
      const x = Math.min(1, u / G.T);
      if (G.stop) { const k = 5, ek = Math.exp(-k), c = (G.r0 * G.T) / (1 - ek); return c * ((1 - Math.exp(-k * x)) / k - x * ek); }
      return G.r1 * u + (G.r0 - G.r1) * G.T * (x - 4 * x * x + 6 * x * x * x - 4 * x * x * x * x + x * x * x * x * x);
    }
    vsRate(G, F) { const x = Math.max(0, Math.min(1, (F - G.f0) / G.T)); if (G.stop) { const ek = Math.exp(-5); return G.r0 * (Math.exp(-5 * x) - ek) / (1 - ek); } const y = 1 - x; return G.r1 + (G.r0 - G.r1) * y * y * y * (1 - 5 * x); }
    vsEnd(L) {
      const G = L.vg; L.vg = null;
      if (!G.stop) { L.vs = G.r1; return; }
      L.vs = G.back || 1;   // (its speed again when it re-enters)
      L.st.v = L.st.a = L.st.b = 0; L.st.i = L.st.N = 0; L.state = 'angehalten'; L.wantIn = 0; L.stopAt = null;
      for (const S of L.sch) { for (let t = 0; t < S.tn; t++) S.tc[t] = null; S.tn = 0; }   // (the tape stands: nothing rings on)
      this.port.postMessage({ bandstopp: { loop: L.id } });
    }
    // (step 2b, §11/§14) a loop in slices: its onsets (phases u of the pass) – re-placed on the grid of a new tempo
    // (Schnitt: every slice from its onset, its own decay up to the next onset, never stretched), left out (Auslassen) or
    // thrown (Würfeln) by a seeded hash per pass; a slice enters e frames before its place with the smooth law, the one
    // before crosses out over X. Set now, played from the next pass start
    slSet(L, d) {
      if (d.off || !d.u || !d.u.length) { if (L.sl) L.sl.off = true; return; }
      const n = d.u.length;
      L.sl = { n, u: Float64Array.from(d.u), dst: new Float64Array(n + 1), map: new Int32Array(n), drop: new Uint8Array(n), schnitt: !!d.schnitt, pd: Math.max(0, Math.min(1, +d.pd || 0)), pw: Math.max(0, Math.min(1, +d.pw || 0)), ps: Math.max(0, Math.min(1, +d.ps || 0)),   // (step 4: ps – a stutter, the slice before played again: Ladung)
        seed: d.seed | 0 || 1, X: this.xf(d.X != null ? d.X : 0.008 * SR), e: Math.max(1, Math.round(d.e != null ? d.e : 0.003 * SR)), off: false };
    }
    // a pass's slices: their places, which plays where, which rests; in slices only when it needs them (a tempo not its own,
    // or something left out or thrown) – else the tape as it is, bit for bit
    slPass(L) {
      const T = L.sl; L.slA = false;
      if (!T) return;
      if (T.off) { L.sl = null; return; }
      if (L.k < 0 || L.vs !== 1 || L.vg) return;   // (a tape at another speed plays as it is)
      let S0 = null; for (const S of L.sch) if (!S.dead && !S.dying) { S0 = S; break; }
      const P = L.s1 - L.s0, len = S0 ? S0.len : P, sch = T.schnitt && Math.abs(P - len) > 2;
      if (!sch && !(T.pd > 0) && !(T.pw > 0) && !(T.ps > 0)) return;
      L.slA = true;
      const n = T.n;
      for (let i = 0; i <= n; i++) { const u = i < n ? T.u[i] : 1 + T.u[0]; T.dst[i] = !sch ? u * P : L.takt ? this.frameAt(L.b0 + (L.k + u) * L.beats) - L.s0 : u * P; }
      for (let i = 0; i < n; i++) { T.drop[i] = T.pd > 0 && this.slH(T.seed, L.k, i, 1) < T.pd ? 1 : 0; T.map[i] = T.pw > 0 && this.slH(T.seed, L.k, i, 2) < T.pw ? Math.min(n - 1, Math.floor(this.slH(T.seed, L.k, i, 3) * n)) : i; if (T.ps > 0 && i > 0 && !T.drop[i] && this.slH(T.seed, L.k, i, 4) < T.ps) T.map[i] = T.map[i - 1]; }   // (step 4: a stutter repeats what the slice before played)
    }
    slH(seed, k, i, c) { let h = (seed ^ Math.imul(k + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(c, 0xc2b2ae35)) | 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
    // slot i of the pass for a version V (its own length): where it starts (a), ends (b, pass frames), its source start s0
    // – into this.slQ (nothing made while it plays)
    slSlot(T, V, i, r) {
      const n = T.n, len = V.len, e = T.e, sg = T.map[i], s0 = T.u[sg] * len - e;
      const end = sg < n - 1 ? T.u[sg + 1] * len - e : Math.min(len * (1 + T.u[0]) - e, V.aend > V.aoff ? V.aend - V.pre : Infinity, V.tot - V.pre);   // (the last one rings into its Ausklang, up to the next onset)
      const a = T.dst[i] - e, Q = this.slQ;
      Q[0] = a; Q[1] = Math.min(T.dst[i + 1] + T.X, a + Math.max(0, end - s0) / Math.max(1e-6, Math.abs(r))); Q[2] = s0;
      return Q;
    }
    slRd(L, V, j0, m, ko, r, g, ga, Vo) {
      const T = L.sl, n = T.n, e = T.e, X = T.X, j1 = j0 + m, G = this.gSl;
      for (let i = 0; i < n; i++) {
        if (T.drop[i]) continue;
        if (T.dst[i] - e >= j1) break;
        const Q = this.slSlot(T, V, i, r), a = Q[0], b = Q[1], s0 = Q[2];
        if (b <= j0) continue;
        const fa = Math.max(j0, Math.ceil(a)), fe = Math.min(j1, Math.ceil(b)); if (fe <= fa) continue;
        const k0 = ko + (fa - j0), cnt = fe - fa, fo = b - X;
        for (let z = 0; z < cnt; z++) {
          const j = fa + z, k = k0 + z;
          let w = ga ? ga[k] : g;
          if (j < a + e) w *= Math.sin(HP * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (j - a + 0.5) / e))));
          if (j >= fo) w *= Math.cos(HP * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (j - fo + 0.5) / X))));
          G[k] = w;
        }
        this.rd(V.ch, V.tot, V.pre + s0 + (fa - a) * r, r, cnt, k0, 0, G, Vo[0], Vo[1]);
      }
    }
    // at the seam: a slice still sounding goes on as a tail of its own, its crossfade where it would have had it
    slOver(L, S) {
      const T = L.sl; if (!T || S.dead || S.dying) return;
      const P = L.s1 - L.s0, r = L.r * S.r;
      for (let i = 0; i < T.n; i++) {
        if (T.drop[i]) continue;
        const Q = this.slSlot(T, S, i, r), a = Q[0], b = Q[1], s0 = Q[2];
        if (a < P && b > P) this.tail(S, false, 1, S.pre + s0 + (P - a) * r, Math.max(1, Math.min(T.X, Math.round(b - P))), Math.max(0, b - P - T.X), S);
      }
    }
    // (step 2b) Abrieb: a wear map over the Schicht's pass – seeded spots that wear deeper every pass at the same places:
    // the top dulls (a one-pole low pass falling to 220 Hz), the level sags, where it is worn through it drops out (3-ms
    // edges); the clean audio stays – off, or Auffrischen, and it sounds as it was
    abSet(S, d) {
      if (d.off) { if (S.ab) { S.ab.on = false; if (d.reset) S.ab.age = 0; } return; }
      const M = 24, seed = d.seed | 0 || 1;
      let A = S.ab;
      if (!A || A.seed !== seed) {
        A = { seed, age: 0, p: new Float32Array(M), w: new Float32Array(M), s: new Float32Array(M), tab: new Float32Array(257), z: new Float32Array(2), gt: 1, al: 1, lvl: 0, on: true, rate: 0.1 };
        let h = seed;
        const R = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        for (let i = 0; i < M; i++) { A.p[i] = R(); A.w[i] = 0.006 + 0.03 * R(); const v = R(); A.s[i] = 0.25 + 1.6 * v * v * v; }
      }
      A.rate = Math.max(0.001, +d.rate || 0.1); A.on = true;
      if (d.reset) A.age = 0; if (d.age != null) A.age = Math.max(0, d.age | 0);
      S.ab = A; this.abPass(S);
    }
    abPass(S) {
      const A = S.ab, a = 1 - Math.exp(-A.rate * A.age);
      A.lvl = a;
      for (let i = 0; i <= 256; i++) { const u = i / 256; let w = 0; for (let m = 0; m < A.p.length; m++) { let du = Math.abs(u - A.p[m]); if (du > 0.5) du = 1 - du; const x = du / A.w[m]; if (x < 3) w += A.s[m] * Math.exp(-x * x); } A.tab[i] = Math.min(1, w * a); }
    }
    abApply(S, A, ko, m, qs, r, Vt) {
      const L0 = this.AB[0], R0 = this.AB[1], oL = Vt[0], oR = Vt[1], len = Math.max(1, S.len), gs = 1 / Math.max(1, Math.round(0.003 * SR));
      let zl = A.z[0], zr = A.z[1], al = A.al, gt = A.gt, gn = 1;
      for (let z = 0; z < m; z++) {
        const k = ko + z;
        let u = (qs + z * r) / len; u -= Math.floor(u);
        const p = u * 256, i = p | 0, W = A.tab[i] + (p - i) * (A.tab[i + 1] - A.tab[i]);
        if ((z & 15) === 0) { const fc = 16000 * Math.pow(220 / 16000, Math.min(1, 0.15 * A.lvl + 0.95 * W)); al = 1 - Math.exp((-2 * Math.PI * fc) / SR); gn = (1 - 0.3 * A.lvl) * (1 - 0.45 * W); }
        const tg = W > 0.62 ? 0 : 1;
        if (gt !== tg) { gt += tg > gt ? gs : -gs; if (gt > 1) gt = 1; else if (gt < 0) gt = 0; }
        zl += al * (L0[k] - zl); zr += al * (R0[k] - zr);
        const w = gn * gt; oL[k] += w * zl; oR[k] += w * zr;
      }
      A.z[0] = zl; A.z[1] = zr; A.al = al; A.gt = gt;
    }
    // (step 1d) Schluss „welkend“ over frames [X, X + n) into wA (the low pass's coefficient, from 1 – no filter – toward lo
    // Hz) and wG (the gain × the drop-out gate): the curves are read every 32 frames, the gate per slice by a seeded hash
    wilt(L, X, o, n) {
      const K = L.wk, A = this.wA, G = this.wG, D = Math.max(1, K.f1 - K.f0);
      for (let k = o, F = X; k < o + n; k++, F++) {
        if (F < K.f0) { A[k] = 1; G[k] = 1; continue; }
        if (((F - K.f0) & 31) === 0 || k === o) {
          const x = Math.min(1, (F - K.f0) / D), fc = K.lo * Math.pow(K.hi / K.lo, 1 - x), al = 1 - Math.exp(-2 * Math.PI * fc / SR);
          K.a = 1 - x * (1 - al); K.w = Math.cos(HP * x); K.p = 0.7 * Math.pow(x, 1.3);
        }
        const j = Math.floor((F - K.f0) / K.sl);
        if (j !== K.j) { K.j = j; let h = (K.seed ^ Math.imul(j + 1, 0x9e3779b1)) | 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; K.tg = (h >>> 0) / 4294967296 < K.p ? 0 : 1; }
        if (K.gt !== K.tg) { K.gt += K.tg > K.gt ? K.gs : -K.gs; if (K.gt > 1) K.gt = 1; else if (K.gt < 0) K.gt = 0; }
        A[k] = K.a; G[k] = K.w * K.gt;
      }
      return true;
    }
    wilted(L) {   // the end of a „welkend“: silent, angehalten (the page re-enters it from its start like any other)
      L.wk = null; L.lpS.fill(0);
      L.st.v = L.st.a = L.st.b = 0; L.st.i = L.st.N = 0; L.state = 'angehalten'; L.wantIn = 0;
      this.port.postMessage({ wilted: { loop: L.id } });
    }
    stat() {
      let sc = 0, sn = 0; const seen = new Set();
      for (const L of this.loops) for (const S of L.sch) { sn++; for (const c of S.ch) if (c && !seen.has(c[0])) { seen.add(c[0]); sc++; } }   // (step 2a: a stream's chunk not there yet is null)
      return { F: this.F, hN: this.hN, hum: this.hum.reduce((a, x) => a + x.length, 0), free: this.free.length, schChunks: sc, schichten: sn, loops: this.loops.length,
        jobs: this.jobs.length, q: this.q.length, segs: this.nS, h0: this.h0, alloc: this.nA, capF: this.capF, jx: this.jobs.map((J) => [J.dd ? 'dd' : J.rs ? 'rs' : J.S ? 'fill' : 'grab', J.x - (J.f0 || 0), (J.f1 || 0) - (J.f0 || 0)]), dd: this.loops.map((L) => L.sch.map((S) => (S.ddA ? 1 : S.ddN ? 0.5 : 0))),
        sl: this.loops.map((L) => [L.id, L.slA ? 1 : 0, L.vs, L.takt ? 1 : 0]),   // (step 2b: in slices, the tape's speed)
        acc: this.loops.filter((L) => L.acc).map((L) => [L.id, L.acc.src.join(','), L.acc.fb]), gap: this.loops.filter((L) => L.gap).map((L) => [L.id, L.Lf, L.ph0]), mic: this.micOn ? 1 : 0, rings: this.hum.map((x) => x.length),   // (step 4)
        ws: this.loops.map((L) => L.sch.map((S) => (S.ws ? { n: S.ws.slots.length, cur: S.ws.cur ? S.ws.cur.k : null, hold: S.ws.hold ? 1 : 0, ks: S.ws.slots.map((Z) => [Z.k, Z.c0, Z.hi, Number.isFinite(Z.n) ? Z.n : -1, Z.on ? 1 : 0]) } : { wu: S.wu ? 1 : 0, tn: S.tn }))), wpt: this.wpt.length };   // (step 2a: the streams)   // (step 1d: the jobs' progress, de-drifted Schichten)
    }
  }

  // (step 2a) the Werk-Rahmen's sink: a Wuchs pass rendered offline goes to myzel-ring in chunks of 8192 frames, through a
  // port of its own (transferred: the live thread never allocates them) – from the chunk that holds `from` on (a pass
  // rendered from its start, heard from a later frame); past the pass body the tail is watched, and the stream ends at the
  // first whole chunk 90 dB under the body's peak. A render whose tail is still sounding at its end (its length is the
  // page's estimate of the tail) fades over its last 30 ms – never an edge (the realm measures the tail on its render)
  class WSend extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      this.CH = po.chunk || 8192; this.n = Math.max(1, po.n | 0); this.body = po.body | 0; this.from = Math.floor(Math.max(0, po.from | 0) / this.CH) * this.CH;
      this.F = 0; this.L = null; this.R = null; this.out = null; this.q = []; this.pk = 0; this.cpk = 0; this.done = false;
      this.fN = Math.min(Math.max(1, this.n - this.body), Math.round(0.03 * SR));   // (the last frames: the fade if it gets there)
      this.port.onmessage = (e) => { const d = e.data; if (d && d.port) { this.out = d.port; for (const [m, tr] of this.q) this.out.postMessage(m, tr); this.q = []; } };
    }
    send(m, tr) { if (this.out) this.out.postMessage(m, tr || []); else this.q.push([m, tr || []]); }
    process(inputs) {
      if (this.done) return true;
      const a = inputs[0], l = a && a[0], r = a && (a[1] || a[0]), n = l ? l.length : 128, CH = this.CH;
      let k = 0;
      while (k < n && this.F < this.n && !this.done) {
        const F = this.F, j = F % CH, m = Math.min(n - k, CH - j, this.n - F);
        if (F >= this.from) {
          if (!this.L) { this.L = new Float32Array(CH); this.R = new Float32Array(CH); this.cpk = 0; }
          if (l) {
            const L = this.L, R = this.R, f0 = this.n - this.fN; let p = this.cpk;
            for (let z = 0; z < m; z++) {
              let x = l[k + z], y = r[k + z];
              if (!(x - x === 0) || !(y - y === 0)) { if (!(x - x === 0)) x = 0; if (!(y - y === 0)) y = 0; this.bad = (this.bad || 0) + 1; }   // (step 2b: the tripwire – never a NaN into the live ring)
              if (F + z >= f0) { const w = Math.cos(1.5707963267948966 * (0.5 - 0.5 * Math.cos(Math.PI * (F + z - f0 + 0.5) / this.fN))); x *= w; y *= w; }
              L[j + z] = x; R[j + z] = y; const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y; if (ax > p) p = ax; if (ay > p) p = ay;
            }
            this.cpk = p;
          }
        }
        k += m; this.F += m;
        if (this.F % CH === 0 || this.F >= this.n) {
          const ci = Math.floor((this.F - 1) / CH), st = ci * CH;
          if (this.L) {
            if (st < this.body) this.pk = Math.max(this.pk, this.cpk);
            if (st >= this.body && this.cpk <= this.pk * 3.2e-5) { this.send({ end: st }); this.done = true; this.L = this.R = null; break; }   // (−90 dB)
            if (this.bad && !this.badT) { this.badT = 1; this.send({ nan: this.bad, i: ci }); }
            this.send({ i: ci, L: this.L, R: this.R }, [this.L.buffer, this.R.buffer]); this.L = this.R = null;
          }
          if (this.F >= this.n) { this.send({ end: this.n }); this.done = true; }
        }
      }
      return true;
    }
  }
  // „Alles“ into its Ring's ring 1, at that Ring's frame count (both see the same render quantum)
  class RingIn extends AudioWorkletProcessor {
    constructor(o) { super(); const po = (o && o.processorOptions) || {}; this.rid = po.rid || 0; this.ring = po.ring || 1; }   // (step 2b: ring 2 – the Puls's lanes)
    process(inputs, outputs) {
      const R = RINGS[this.rid], inp = inputs[0], n = inp && inp[0] ? inp[0].length : outputs[0] && outputs[0][0] ? outputs[0][0].length : 128;
      if (R && R.hOK && this.ring < R.nR) R.capR(this.ring, inp, currentFrame + R.cfOff, n);
      return true;
    }
  }
