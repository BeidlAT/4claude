  // ---- the processor contract (SPEC §2.3) ----
  // k-rate params freq, detune (the voice's pitch bus: vibrato, drift, Bebung, wheel, a finger's bend) and hoehe; the
  // note {on:t, f, y, vel, gate, burst, seed} in processorOptions.on (with prm: the engine's knobs); the rest over the
  // port, each message at its frame: {off:t, k} {set:{…}} {clear:t} {lite:0|1} {hammer} (Ranke), and {kill:1} at once
  // (the voice is gone). After `off` (or a burst's gate) the processor reports {done:1} once its output stayed below
  // −100 dB for 8 blocks and returns false (collectable).
  class MyzelProc extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'freq', defaultValue: 220, minValue: 16, maxValue: 8000, automationRate: 'k-rate' },
        { name: 'detune', defaultValue: 0, minValue: -4800, maxValue: 4800, automationRate: 'k-rate' },
        { name: 'hoehe', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      ];
    }
    constructor(o) {
      super();
      this.po = (o && o.processorOptions) || {};
      this.q = []; this.act = false; this.off = false; this.silent = 0; this.dead = false; this.lite = this.po.lite ? 1 : 0;   // lite: after underruns, level 3's second bore/head is left out
      this.f = 220; this.y = 0.5; this.gN = 0; this.gS = 0; this.g = 1;
      this.inj = Math.max(0, +this.po.inj || 0); this.ix = null;   // (Hexenring step 4: Nähren – a Schleife's audio into Sehne's and Glut's loops, × inj; numberOfInputs 1)
      // (a message without a moment – a knob's {set} – goes ahead of a note-off still waiting for its moment (a key's
      // MIDI moment, ≤ 60 ms ahead): the release starts with the new settings, as when the note-off came at once)
      this.port.onmessage = (e) => { const m = e.data; if (!m) return; if (m.kill) { this.dead = true; return; } const q = this.q; let i = q.length; if (m.on == null && m.off == null && m.t == null) while (i > 0 && q[i - 1].off != null && q[i - 1].on == null) i--; q.splice(i, 0, m); };
      if (this.po.on) this.q.push(this.po.on);   // the note itself comes with the node: no port latency (offline renders deliver port messages only at the next suspend)
    }
    process(inputs, outputs, params) {
      if (this.dead) return false;
      const out = outputs[0], L = out && out[0];
      if (!L) return true;
      const R = out.length > 1 ? out[1] : null, n = L.length;   // never assume 128
      const ii = inputs && inputs[0]; this.ix = this.inj > 0 && ii && ii.length && ii[0] ? ii : null;   // (Hexenring step 4: what a feeding Schleife sends; none – nothing changes)
      const fq = params.freq, dt = params.detune, ho = params.hoehe;
      const f = fq[0] * cents(dt[0]);
      this.f = f > 16 ? f : 16; this.y = ho[0];
      let pos = 0;
      const q = this.q;
      while (q.length) {
        const m = q[0], tm = m.on != null ? m.on : m.off != null ? m.off : m.t;
        const at = tm == null ? 0 : Math.round((tm - currentTime) * SR);
        if (at >= n) break;   // later
        if (at > pos) { if (this.act) this.seg(L, R, pos, at); pos = at; }
        q.shift();
        this.msg(m);
      }
      if (this.act && pos < n) this.seg(L, R, pos, n);
      if (!this.act) return true;
      let e = 0;
      for (let i = 0; i < n; i++) e += L[i] * L[i];
      if (!(e < 1e6)) { this.reset(); L.fill(0); if (R) R.fill(0); e = 0; }   // NaN or a blow-up: clear, keep running
      if (this.off) {
        if (e < n * 1e-10) { if (++this.silent > 8) { this.act = false; this.dead = true; this.port.postMessage({ done: 1 }); return false; } }
        else this.silent = 0;
      }
      return true;
    }
    // render [a, b) and apply the 5 ms click ramp (on, clear) on top
    seg(L, R, a, b) {
      this.render(L, R, a, b);
      if (this.gN > 0) {
        let g = this.g, k = this.gS, c = this.gN;
        for (let i = a; i < b; i++) { if (c > 0) { g += k; c--; } L[i] *= g; if (R) R[i] *= g; }
        this.g = g; this.gN = c;
        if (c === 0 && this.clearing) { this.clearing = false; this.reset(); this.act = false; }
      } else if (this.g !== 1) { const g = this.g; for (let i = a; i < b; i++) { L[i] *= g; if (R) R[i] *= g; } }
    }
    ramp(to) { const n = Math.max(1, Math.round(0.005 * SR)); this.gS = (to - this.g) / n; this.gN = n; }
    msg(m) {
      if (m.set) this.set(m.set);
      if (m.lite != null) this.lite = m.lite ? 1 : 0;
      if (m.inj != null) this.inj = Math.max(0, +m.inj || 0);   // (Hexenring step 4: the injection's gain)
      if (m.on != null) { if (this.act) this.ramp(1); else { this.g = 0; this.ramp(1); } this.act = true; this.off = false; this.silent = 0; this.start(m); }
      else if (m.off != null) { this.off = true; this.stop(m); }
      else if (m.clear != null) { if (this.act) { this.clearing = true; this.ramp(0); } }
      else this.extra(m);
    }
    set() {} start() {} stop() {} extra() {} reset() {} render() {}
  }

