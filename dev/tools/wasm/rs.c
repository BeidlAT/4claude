// Myzel – the Hexenring's live resampler in WebAssembly (SIMD128), built into myzel/src/js/dsp/rs-wasm.js by build.sh.
// The same arithmetic as rd() in myzel/src/js/dsp/ring.js, in the same order per channel – the output is the JS
// resampler's, bit for bit (IEEE doubles; no fused multiply-add, no reassociation: -ffp-contract=off, no fast-math).
// A frame's left and right sums run side by side in one f64x2 lane pair; two frames at a time, so their sums do not
// wait on each other; each tap pair's weights w = T + a·D are computed lane by lane, as JS computes them one by one.
//   s    the source, stereo interleaved floats: frame x of the chunk list is s[x − base], valid for [base, base + tot)
//   p, r the read position (in the chunk list's frames) and its step; the position runs exactly as in JS: p += r
//   T, D a kernel's taps (RS_N + 1 phases × NT, doubles) and each phase's step to the next (RS_N × NT)
//   rsp: the same with each frame's position given (P[k], doubles) – the de-drift job's φ(x) – instead of p += r
//   out  n frames, stereo interleaved doubles: each frame's two sums before its gain. A frame with no tap inside the
//        source reads as −0 (adding −0 leaves any sum as it is: JS skips such a frame)
#include <wasm_simd128.h>

static inline v128_t ld(const float* s, int j) { return wasm_f64x2_promote_low_f32x4(wasm_v128_load64_zero(s + 2 * j)); }

// one frame, taps outside the source skipped (as JS's edge path does)
static inline void one(const float* s, int tot, int i0, double a, int c0, const double* T, const double* D, int NT, double* o) {
  double sl = 0, sr = 0; int any = 0;
  for (int t = 0; t < NT; t++) {
    int x = i0 + t;
    if (x < 0 || x >= tot) continue;
    double w = T[c0 + t] + a * D[c0 + t];
    sl += w * (double)s[2 * x]; sr += w * (double)s[2 * x + 1]; any = 1;
  }
  o[0] = any ? sl : -0.0; o[1] = any ? sr : -0.0;
}

__attribute__((export_name("rs")))
double rs(const float* s, int base, int tot, double p, double r, int n, const double* T, const double* D, int NT, int CC, double* out) {
  int k = 0;
  while (k < n) {
    double fi = __builtin_floor(p), ph = (p - fi) * 256.0;
    int q = (int)ph, c0 = q * NT, i0 = (int)fi - CC - base;
    double a = ph - (double)q;
    if (k + 1 < n) {
      double pb = p + r, fb = __builtin_floor(pb), phb = (pb - fb) * 256.0;
      int qb = (int)phb, c1 = qb * NT, i1 = (int)fb - CC - base;
      double b = phb - (double)qb;
      if (i0 >= 0 && i1 >= 0 && i0 + NT <= tot && i1 + NT <= tot) {
        v128_t u = wasm_f64x2_splat(0.0), v = wasm_f64x2_splat(0.0), va = wasm_f64x2_splat(a), vb = wasm_f64x2_splat(b);
        for (int t = 0; t < NT; t += 2) {   // (NT is even)
          v128_t w = wasm_f64x2_add(wasm_v128_load(T + c0 + t), wasm_f64x2_mul(va, wasm_v128_load(D + c0 + t)));
          v128_t x = wasm_f64x2_add(wasm_v128_load(T + c1 + t), wasm_f64x2_mul(vb, wasm_v128_load(D + c1 + t)));
          u = wasm_f64x2_add(u, wasm_f64x2_mul(wasm_i64x2_shuffle(w, w, 0, 0), ld(s, i0 + t)));
          v = wasm_f64x2_add(v, wasm_f64x2_mul(wasm_i64x2_shuffle(x, x, 0, 0), ld(s, i1 + t)));
          u = wasm_f64x2_add(u, wasm_f64x2_mul(wasm_i64x2_shuffle(w, w, 1, 1), ld(s, i0 + t + 1)));
          v = wasm_f64x2_add(v, wasm_f64x2_mul(wasm_i64x2_shuffle(x, x, 1, 1), ld(s, i1 + t + 1)));
        }
        wasm_v128_store(out + 2 * k, u); wasm_v128_store(out + 2 * k + 2, v);
        k += 2; p = pb + r; continue;
      }
    }
    one(s, tot, i0, a, c0, T, D, NT, out + 2 * k);
    k++; p = p + r;
  }
  return p;
}

__attribute__((export_name("rsp")))
void rsp(const float* s, int base, int tot, const double* P, int n, const double* T, const double* D, int NT, int CC, double* out) {
  int k = 0;
  while (k < n) {
    double p = P[k], fi = __builtin_floor(p), ph = (p - fi) * 256.0;
    int q = (int)ph, c0 = q * NT, i0 = (int)fi - CC - base;
    double a = ph - (double)q;
    if (k + 1 < n) {
      double pb = P[k + 1], fb = __builtin_floor(pb), phb = (pb - fb) * 256.0;
      int qb = (int)phb, c1 = qb * NT, i1 = (int)fb - CC - base;
      double b = phb - (double)qb;
      if (i0 >= 0 && i1 >= 0 && i0 + NT <= tot && i1 + NT <= tot) {
        v128_t u = wasm_f64x2_splat(0.0), v = wasm_f64x2_splat(0.0), va = wasm_f64x2_splat(a), vb = wasm_f64x2_splat(b);
        for (int t = 0; t < NT; t += 2) {
          v128_t w = wasm_f64x2_add(wasm_v128_load(T + c0 + t), wasm_f64x2_mul(va, wasm_v128_load(D + c0 + t)));
          v128_t x = wasm_f64x2_add(wasm_v128_load(T + c1 + t), wasm_f64x2_mul(vb, wasm_v128_load(D + c1 + t)));
          u = wasm_f64x2_add(u, wasm_f64x2_mul(wasm_i64x2_shuffle(w, w, 0, 0), ld(s, i0 + t)));
          v = wasm_f64x2_add(v, wasm_f64x2_mul(wasm_i64x2_shuffle(x, x, 0, 0), ld(s, i1 + t)));
          u = wasm_f64x2_add(u, wasm_f64x2_mul(wasm_i64x2_shuffle(w, w, 1, 1), ld(s, i0 + t + 1)));
          v = wasm_f64x2_add(v, wasm_f64x2_mul(wasm_i64x2_shuffle(x, x, 1, 1), ld(s, i1 + t + 1)));
        }
        wasm_v128_store(out + 2 * k, u); wasm_v128_store(out + 2 * k + 2, v);
        k += 2; continue;
      }
    }
    one(s, tot, i0, a, c0, T, D, NT, out + 2 * k);
    k++;
  }
}
