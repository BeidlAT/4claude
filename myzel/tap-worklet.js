// Myzel – Abgriff des Summenausgangs für Aufnahme und Echo-Körner.
// Sammelt 2048 Frames pro Kanal und schickt sie bitgenau an den Hauptthread.
class MyzelTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.n = 2048;
    this.l = new Float32Array(this.n);
    this.r = new Float32Array(this.n);
    this.i = 0;
  }
  process(inputs) {
    const inp = inputs[0];
    const L = inp && inp[0];
    const R = inp && (inp[1] || inp[0]);
    const len = L ? L.length : 128;
    for (let k = 0; k < len; k++) {
      this.l[this.i] = L ? L[k] : 0;
      this.r[this.i] = R ? R[k] : 0;
      if (++this.i === this.n) {
        this.port.postMessage({ l: this.l, r: this.r }, [this.l.buffer, this.r.buffer]);
        this.l = new Float32Array(this.n);
        this.r = new Float32Array(this.n);
        this.i = 0;
      }
    }
    return true;
  }
}
registerProcessor('myzel-tap', MyzelTap);
