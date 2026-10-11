// Myzel – Abgriff des Summenausgangs für Aufnahme und Echo-Körner.
// Sammelt 2048 Frames pro Kanal und schickt sie bitgenau an den Hauptthread, zusammen mit der Position (f) des ersten
// Frames im Takt der Audio-Uhr – so kann eine Aufnahme auf das Sample genau an einer Taktgrenze beginnen und enden.
// Die Position wird selbst mitgezählt: currentFrame bleibt in Chromium manchmal einige Aufrufe lang stehen. Der Bezug
// zur Audio-Uhr ist das Maximum von (currentFrame − bisher gezählte Frames) – veraltete Werte sind nie zu groß.
// Springt dieser Bezug vor (am Anfang, oder wenn process() wirklich ausgelassen wurde), geht der angefangene Block
// vorher raus: Jeder Block ist in sich lückenlos, Lücken sieht der Hauptthread an der Position.
// Blöcke, die der Hauptthread nicht behält, kommen zurück und werden wiederverwendet (keine Speicherbereinigung
// auf dem Audio-Thread). Die Nachricht 'flush' liefert den angefangenen Block sofort (beim Beenden einer Aufnahme).
class MyzelTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.n = 2048;
    this.pool = [];
    this.l = new Float32Array(this.n);
    this.r = new Float32Array(this.n);
    this.i = 0;
    this.f0 = 0;
    this.done = 0;
    this.base = -Infinity;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d === 'flush') {
        const l = this.l.slice(0, this.i), r = this.r.slice(0, this.i);
        this.i = 0;
        this.port.postMessage({ l, r, f: this.f0, flush: true }, [l.buffer, r.buffer]);
      } else if (d && d.back && d.back[0].length === this.n && this.pool.length < 8) {
        this.pool.push(d.back);
      }
    };
  }
  process(inputs) {
    const inp = inputs[0];
    const L = inp && inp[0];
    const R = inp && (inp[1] || inp[0]);
    const len = L ? L.length : 128;
    const est = currentFrame - this.done;
    if (est > this.base) {
      if (this.i > 0) {
        const l = this.l.slice(0, this.i), r = this.r.slice(0, this.i);
        this.port.postMessage({ l, r, f: this.f0 }, [l.buffer, r.buffer]);
        this.i = 0;
      }
      this.base = est;
    }
    const fq = this.base + this.done;
    for (let k = 0; k < len; k++) {
      if (this.i === 0) this.f0 = fq + k;
      this.l[this.i] = L ? L[k] : 0;
      this.r[this.i] = R ? R[k] : 0;
      if (++this.i === this.n) {
        this.port.postMessage({ l: this.l, r: this.r, f: this.f0 }, [this.l.buffer, this.r.buffer]);
        const p = this.pool.pop();
        if (p) { this.l = p[0]; this.r = p[1]; } else { this.l = new Float32Array(this.n); this.r = new Float32Array(this.n); }
        this.i = 0;
      }
    }
    this.done += len;
    return true;
  }
}
registerProcessor('myzel-tap', MyzelTap);
