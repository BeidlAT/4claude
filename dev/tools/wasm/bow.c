// Myzel – Harz (myzel-bow) in WebAssembly, built into myzel/src/js/dsp/rs-wasm.js by build.sh. Must stay the JS loop in
// myzel/src/js/dsp/harz.js render() operation for operation (no FMA, no reassociation): the output is bit for bit the same.
// Harz's bowed bands (harz.js render, the per-sample loop) – the same doubles in the same order
static inline void lag(int j, const double* D, double* hh, int* di) {
  double d = D[j]; int i = (int)d; double q = d - (double)i + 1.0; int k = 4 * j; di[j] = i;
  hh[k] = -(q - 1.0) * (q - 2.0) * (q - 3.0) / 6.0; hh[k + 1] = q * (q - 2.0) * (q - 3.0) / 2.0;
  hh[k + 2] = -q * (q - 1.0) * (q - 3.0) / 2.0; hh[k + 3] = q * (q - 1.0) * (q - 2.0) / 6.0;
}
// S: in/out scalars [w, vb, kc, ni, gp, fh, rn] and params [vt, gInc, kStep, kt, nAmt, pr, rough, rc, fo, hc, sqw]
__attribute__((export_name("bow")))
void bow(int J, int N, float* buf, double* S, const float* NOISE, int n, int two, int glide, int sq,
         const double* g, const double* pc, const double* wi, double* rr, const double* b0, const double* a1, const double* a2,
         double* z1, double* z2, double* D, const double* dD, double* hh, int* di, const signed char* kd, const signed char* sd,
         const double* oL, const double* oR, double* mL, double* mR, const double* dmL, const double* dmR, const double* qL,
         const double* qR, double* ap, float* Lo, float* Ro) {
  const int M = N - 1;
  int w = (int)S[0], ni = (int)S[3];
  double vb = S[1], kc = S[2], gp = S[4], fh = S[5], rn = S[6];
  const double vt = S[7], gInc = S[8], kStep = S[9], kt = S[10], nAmt = S[11], pr = S[12], rough = S[13], rc = S[14], fo = S[15], hc = S[16], sqw = S[17];
  for (int i = 0; i < n; i++) {
    vb += 0.0005 * (vt - vb); gp += gInc;
    if (kc != kt) { kc += kc < kt ? kStep : -kStep; double e = kc - kt; if ((e < 0 ? -e : e) < kStep) kc = kt; }
    double vc = 0;
    for (int j = 0; j < J; j++) {
      if (glide && dD[j] != 0) { D[j] += dD[j]; lag(j, D, hh, di); }
      const int o = j * N, k = w + 1 - di[j], h4 = 4 * j;
      const double r = g[j] * (hh[h4] * buf[o + (k & M)] + hh[h4 + 1] * buf[o + ((k - 1) & M)] + hh[h4 + 2] * buf[o + ((k - 2) & M)] + hh[h4 + 3] * buf[o + ((k - 3) & M)]);
      rr[j] = r; vc += pc[j] * r;
    }
    ni = (ni + 1) & 65535;
    const double nz = NOISE[ni]; rn += rc * (nz - rn);
    double ps = pr * (1 + rough * 4 * rn); ps = ps < 0.05 ? 0.05 : ps > 0.85 ? 0.85 : ps;
    const double dv = vb + nAmt * nz - vc;
    double t = (dv < 0 ? -dv : dv) * (10 - 9 * ps) + 0.75; t *= t;
    double bt = 1 / (t * t); if (bt > 0.98) bt = 0.98; else if (bt < 0.01) bt = 0.01;
    const double F = dv * bt * kc;
    double yl = 0, yr = 0;
    for (int j = 0; j < J; j++) {
      const double x = F * wi[j] * pc[j] * (j == sq ? sqw : 1) + rr[j];
      const double yo = b0[j] * x + z1[j]; z1[j] = z2[j] - a1[j] * yo; z2[j] = -b0[j] * x - a2[j] * yo;
      buf[j * N + w] = (float)yo;
      if (kd[j] || two) {
        const double q = 0.25 * D[j]; const int qi = (int)q; const double fq = q - qi; const int o = j * N, k = w - qi;
        const double s0 = buf[o + (k & M)], yq = s0 + fq * (buf[o + ((k - 1) & M)] - s0);
        if (kd[j]) { yl += mL[j] * yo + qL[j] * yq; yr += mR[j] * yq + qR[j] * yo; mL[j] += dmL[j]; mR[j] += dmR[j]; }
        else if (sd[j]) { yl += oL[j] * yq; yr += oR[j] * yo; } else { yl += oL[j] * yo; yr += oR[j] * yq; }
      } else yl += oL[j] * yo;
    }
    w = (w + 1) & M;
    fh += hc * (F - fh); const double d0 = fo * (F - fh);
    Lo[i] = (float)(yl + d0);
    if (two) {
      double u = d0, z;
      z = u - 0.7 * ap[1]; u = 0.7 * z + ap[1]; ap[1] = z; z = u + 0.6 * ap[2]; u = -0.6 * z + ap[2]; ap[2] = z; z = u - 0.5 * ap[3]; u = 0.5 * z + ap[3]; ap[3] = z;
      Ro[i] = (float)(yr + u);
    }
  }
  S[0] = w; S[1] = vb; S[2] = kc; S[3] = ni; S[4] = gp; S[5] = fh; S[6] = rn;
}
