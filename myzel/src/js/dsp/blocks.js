  const SR = sampleRate;
  // ---- tables (SR-independent where possible; everything that depends on SR reads sampleRate) ----
  const TANH = new Float32Array(2050);   // tanh(x), x in [-8, 8], 128 steps per unit
  for (let i = 0; i < 2050; i++) TANH[i] = Math.tanh(i / 128 - 8);
  const tanh = (x) => { if (x >= 8) return 1; if (!(x > -8)) return x === x ? -1 : 0; const p = (x + 8) * 128, i = p | 0; return TANH[i] + (p - i) * (TANH[i + 1] - TANH[i]); };
  const EXP2 = new Float32Array(1202);   // 2^(c/1200), c in [-600, 600] cents
  for (let i = 0; i < 1202; i++) EXP2[i] = Math.pow(2, (i - 600) / 1200);
  const cents = (c) => { if (c > -600 && c < 600) { const p = c + 600, i = p | 0; return EXP2[i] + (p - i) * (EXP2[i + 1] - EXP2[i]); } return Math.pow(2, c / 1200); };
  const SIN = new Float32Array(4097);    // one period, phase in [0, 1)
  for (let i = 0; i < 4097; i++) SIN[i] = Math.sin(2 * Math.PI * i / 4096);
  const NOISE = new Float32Array(65536);  // white, ±1, xorshift32
  { let s = 0x9E3779B9 | 0; for (let i = 0; i < 65536; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; NOISE[i] = s / 2147483648; } }
  // ---- building blocks (state in fields: for block-rate use; inner loops copy into locals – 8× faster, bench) ----
  class PRNG { constructor(seed) { this.s = (seed | 0) || 0x2545F491; } next() { let s = this.s; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.s = s; return (s >>> 0) / 4294967296; } }
  class OnePole { constructor(c = 1) { this.c = c; this.y = 0; } set(c) { this.c = c; } tick(x) { return (this.y += this.c * (x - this.y)); } }
  class DcBlock { constructor(hz = 20) { this.r = 1 - 2 * Math.PI * hz / SR; this.x1 = 0; this.y1 = 0; } tick(x) { const y = x - this.x1 + this.r * this.y1; this.x1 = x; this.y1 = y; return y; } }
  class Allpass1 { constructor(a = 0) { this.a = a; this.x1 = 0; this.y1 = 0; } set(a) { this.a = a; } tick(x) { const y = -this.a * x + this.x1 + this.a * this.y1; this.x1 = x; this.y1 = y; return y; } }
  class FracDelay {   // ring buffer; d = delay in samples (1 = the sample written last)
    constructor(maxLen) { let n = 8; while (n < maxLen + 4) n <<= 1; this.b = new Float32Array(n); this.m = n - 1; this.w = 0; }
    write(x) { this.b[this.w] = x; this.w = (this.w + 1) & this.m; }
    readL(d) { const i = d | 0, f = d - i, b = this.b, m = this.m, w = this.w; const a = b[(w - i) & m]; return a + f * (b[(w - i - 1) & m] - a); }
    read3(d) {   // Lagrange 3rd order, centred (d ≥ 2)
      const i = d | 0, p = d - i + 1, b = this.b, m = this.m, w = this.w + 1 - i;
      return -(p - 1) * (p - 2) * (p - 3) / 6 * b[w & m] + p * (p - 2) * (p - 3) / 2 * b[(w - 1) & m] - p * (p - 1) * (p - 3) / 2 * b[(w - 2) & m] + p * (p - 1) * (p - 2) / 6 * b[(w - 3) & m];
    }
  }
  class Reso {   // complex rotation: a decaying sinusoid at f, excited by x
    constructor() { this.re = 0; this.im = 0; this.c = 1; this.s = 0; }
    set(f, t60) { const r = Math.pow(0.001, 1 / (Math.max(1e-3, t60) * SR)), w = 2 * Math.PI * f / SR; this.c = r * Math.cos(w); this.s = r * Math.sin(w); }
    tick(x) { const re = this.re * this.c - this.im * this.s + x; this.im = this.re * this.s + this.im * this.c; this.re = re; return this.im; }
  }
  class Biquad {   // direct form II transposed
    constructor() { this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = 0; this.z1 = this.z2 = 0; }
    bp(f, q) { const w = 2 * Math.PI * Math.min(f, 0.45 * SR) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; this.b0 = al / a0; this.b1 = 0; this.b2 = -al / a0; this.a1 = -2 * Math.cos(w) / a0; this.a2 = (1 - al) / a0; return this; }
    peak(f, q, db) { const A = Math.pow(10, db / 40), w = 2 * Math.PI * Math.min(f, 0.45 * SR) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al / A; this.b0 = (1 + al * A) / a0; this.b1 = -2 * Math.cos(w) / a0; this.b2 = (1 - al * A) / a0; this.a1 = this.b1; this.a2 = (1 - al / A) / a0; return this; }
    tick(x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; }
  }
  const flush = (x) => (x < 1e-18 && x > -1e-18 ? 0 : x);
  const pd1 = (c, f) => { const p = 1 - c, w = 2 * Math.PI * f / SR; return Math.atan2(p * Math.sin(w), 1 - p * Math.cos(w)) / w; };   // phase delay (samples) of y += c·(x − y) at f

  // (Leistung, 24./25.10.2026) a WebAssembly module's bytes from base64 (the AudioWorklet scope may lack atob)
  function wasmBytes(s) {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', t = s.replace(/=+$/, ''), b = new Uint8Array(Math.floor(t.length * 3 / 4));
    for (let i = 0, j = 0, v = 0, q = 0; i < t.length; i++) { v = (v << 6) | A.indexOf(t[i]); q += 6; if (q >= 8) { q -= 8; b[j++] = (v >> q) & 255; } }
    return b;
  }
