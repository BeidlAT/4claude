/* ---------- Raum: rooms computed, not recorded (owner, 29.10.2026: „wie baust du echte Räume?“ – dev/klang/effektseite.md) ----------
   A room's impulse response for the convolver, made from its geometry: a box of W × D × H metres, its six surfaces of a
   material each (absorption per octave, 125 Hz … 8 kHz), the source and a stereo pair of microphones (ORTF: two
   cardioids 17 cm apart, 110° between them) at their places in it.
   – the early part: image sources up to the 3rd order – each reflection when it arrives (343 m/s), from where (the
     cardioids weigh it), how much each wall it met took per octave, what the air took over the way; the higher orders
     a little smeared by the walls' roughness (scattering)
   – the tail: from the mixing time on (≈ √V ms) dense, decaying per octave with the room's own time (Eyring, from its
     volume, its surfaces and the air), its echo density growing in, left and right as alike as the room makes them
   – both in seven octave bands (zero-phase), summed; the tail joins the reflections at their own level.
   genRoom runs in the DSP worker (copied by toString – nothing from outside) and returns [L, R] at sr. */
function genRoom(o, sr) {
  const C = 343, F = [125, 250, 500, 1000, 2000, 4000, 8000], NB = 7;
  const AIR = [0.0004, 0.001, 0.0019, 0.0037, 0.0097, 0.033, 0.118];   // dB per metre (20 °C, 50 %)
  const [W, D, H] = o.dim, sc = o.scat || 0.3;
  const S = [D * H, D * H, W * H, W * H, W * D, W * D], V = W * D * H, ST = 2 * (W * D + W * H + D * H);
  // (a room of its kind: o.T, the reverberation per octave real rooms of that kind have – the surfaces' materials keep
  // their differences, scaled per band so that the room as a whole absorbs what that takes (Eyring backwards))
  let mat = o.mat;
  if (o.T) mat = mat.map((m) => m.slice());
  if (o.T) for (let b = 0; b < NB; b++) {
    const m4 = 4 * (AIR[b] / 4.343) * V, want = 1 - Math.exp(-Math.max(1e-4, 0.161 * V / o.T[b] - m4) / ST);
    let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b];
    const k = want / Math.max(1e-6, a / ST); for (let s = 0; s < 6; s++) mat[s][b] = Math.min(0.95, Math.max(0.002, mat[s][b] * k));
  }
  // Eyring per band, the air's absorption in it (4mV)
  const T = F.map((f, b) => { let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b]; const al = Math.min(0.99, a / ST), m = (AIR[b] / 4.343); return 0.161 * V / (-ST * Math.log(1 - al) + 4 * m * V); });
  const len = Math.min(Math.round((Math.max(...T) * 1.05 + 0.1) * sr), Math.round((o.maxLen || 14) * sr));
  let N = 1; while (N < 2 * len) N <<= 1;
  const bands = [0, 1].map(() => F.map(() => new Float64Array(N)));
  // the pair: ORTF at the listener's place, facing the source (its axes ±55° in the horizontal)
  const [sx, sy, sz] = o.src, [lx, ly, lz] = o.mic, face = Math.atan2(sy - ly, sx - lx), half = (o.wide != null ? o.wide : 55) * Math.PI / 180, gap = o.gap != null ? o.gap : 0.17;
  const mics = [1, -1].map((side) => { const ax = face + side * half, px = lx - Math.sin(face) * gap / 2 * side, py = ly + Math.cos(face) * gap / 2 * side; return { x: px, y: py, z: lz, ux: Math.cos(ax), uy: Math.sin(ax) }; });
  let seed = (o.seed || 1) >>> 0; const R = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const ORD = o.order || 3, d0 = Math.hypot(sx - lx, sy - ly, sz - lz);
  // image sources: the room mirrored nx, ny, nz times; the walls met on the way (x low/high, y low/high, z low/high)
  for (let nx = -ORD; nx <= ORD; nx++) for (let ny = -ORD; ny <= ORD; ny++) for (let nz = -ORD; nz <= ORD; nz++) {
    const ord = Math.abs(nx) + Math.abs(ny) + Math.abs(nz); if (ord > ORD) continue;
    const im = [nx & 1 ? nx * W + (W - sx) : nx * W + sx, ny & 1 ? ny * D + (D - sy) : ny * D + sy, nz & 1 ? nz * H + (H - sz) : nz * H + sz];
    // the walls met: |n| crossings in each axis, half on each side of it
    const hits = [[Math.floor(Math.abs(nx) / 2) + (nx < 0 ? Math.abs(nx) % 2 : 0), Math.floor(Math.abs(nx) / 2) + (nx > 0 ? Math.abs(nx) % 2 : 0)], [Math.floor(Math.abs(ny) / 2) + (ny < 0 ? Math.abs(ny) % 2 : 0), Math.floor(Math.abs(ny) / 2) + (ny > 0 ? Math.abs(ny) % 2 : 0)], [Math.floor(Math.abs(nz) / 2) + (nz < 0 ? Math.abs(nz) % 2 : 0), Math.floor(Math.abs(nz) / 2) + (nz > 0 ? Math.abs(nz) % 2 : 0)]];
    const refl = F.map((_, b) => { let g = 1; for (let a = 0; a < 3; a++) for (let s = 0; s < 2; s++) g *= Math.pow(Math.sqrt(1 - mat[2 * a + s][b]), hits[a][s]); return g; });
    for (let c = 0; c < 2; c++) {
      const M = mics[c], dx = im[0] - M.x, dy = im[1] - M.y, dz = im[2] - M.z, d = Math.hypot(dx, dy, dz), t = d / C * sr;
      const cosA = (dx * -M.ux + dy * -M.uy) / d;   // (towards the source: the arrival comes from -direction)
      const card = 0.5 + 0.5 * -cosA, g0 = card * d0 / Math.max(d, 0.1);
      // the specular part, and the scattered share of the higher orders spread over a few ms
      const spec = ord < 2 ? 1 : Math.pow(1 - sc, ord - 1), sm = Math.round((0.0004 + 0.0012 * ord) * sr);
      for (let b = 0; b < NB; b++) {
        const g = g0 * refl[b] * Math.pow(10, -AIR[b] * d / 20), B = bands[c][b], i = Math.floor(t), fr = t - i;
        if (i + 1 >= len) continue;
        B[i] += g * spec * (1 - fr); B[i + 1] += g * spec * fr;
        if (spec < 1) { const k = 6, e = g * Math.sqrt((1 - spec * spec) / k); for (let q = 0; q < k; q++) { const j = i + Math.floor(R() * sm); if (j < len) B[j] += e * (R() < 0.5 ? -1 : 1); } }
      }
    }
  }
  // the tail: from the mixing time, per band its decay. Its level from the diffuse field: the reverberant energy against
  // the direct sound's is 16π·r²/A (A the room's absorption area in that band; a cardioid takes a third of a diffuse
  // field) – what the reflections already brought of it is taken off
  const tMix = Math.min(0.5, Math.max(0.02, Math.sqrt(V) / 1000)), iMix = Math.round(tMix * sr), coh = o.coh != null ? o.coh : 0.15;
  const iDir = Math.round(d0 / C * sr) + 2;
  for (let b = 0; b < NB; b++) {
    const k = 6.9078 / (T[b] * sr);   // ln(1000): −60 dB over T
    let a = 0; for (let s = 0; s < 6; s++) a += S[s] * mat[s][b];
    const A = -ST * Math.log(1 - Math.min(0.99, a / ST)) + 4 * (AIR[b] / 4.343) * V, want = 16 * Math.PI * d0 * d0 / (3 * A);
    let eImg = 0; for (let c = 0; c < 2; c++) for (let i = iDir; i < len; i++) eImg += bands[c][b][i] * bands[c][b][i];
    eImg /= 2;
    let eEnv = 0; for (let i = Math.floor(iMix * 0.4); i < len; i++) { const gr = i < iMix ? Math.pow((i - iMix * 0.4) / (iMix * 0.6), 2) : 1; eEnv += gr * gr * Math.exp(-2 * k * (i - iMix)); }
    const amp = Math.sqrt(Math.max(0.25 * want, want - eImg) / Math.max(1e-30, eEnv));
    const sh = Math.sqrt(coh), ind = Math.sqrt(1 - coh);
    for (let i = Math.floor(iMix * 0.4); i < len; i++) {
      const env = amp * Math.exp(-k * (i - iMix)), grow = i < iMix ? Math.pow((i - iMix * 0.4) / (iMix * 0.6), 2) : 1;
      // dense noise: a shared part and one of each side (their correlation the room's)
      const g = (R() + R() + R() - 1.5) * 2, nl = (R() + R() + R() - 1.5) * 2, nr = (R() + R() + R() - 1.5) * 2;
      bands[0][b][i] += env * grow * (sh * g + ind * nl); bands[1][b][i] += env * grow * (sh * g + ind * nr);
    }
  }
  // seven octave bands, zero-phase (each band's own filter on its own impulses), summed
  const fft = (re, im, inv) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bb = n >> 1; for (; j & bb; bb >>= 1) j ^= bb; j ^= bb; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let L = 2; L <= n; L <<= 1) { const a = (inv ? 2 : -2) * Math.PI / L, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += L) { let cr = 1, ci = 0; for (let j = 0; j < L / 2; j++) { const u = i + j, v = u + L / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  const out = [new Float32Array(len), new Float32Array(len)];
  // band shapes that sum to one at every frequency (raised-cosine crossovers on a log axis between the centres)
  const wts = (f, b) => { const x = Math.log2(Math.max(f, 1) / F[b]); if (b === 0 && x < 0) return 1; if (b === NB - 1 && x > 0) return 1; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x); };
  for (let c = 0; c < 2; c++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let b = 0; b < NB; b++) {
      const r2 = new Float64Array(N), i2 = new Float64Array(N); r2.set(bands[c][b]); fft(r2, i2, false);
      for (let k = 0; k <= N / 2; k++) { const w = wts(k * sr / N, b); re[k] += r2[k] * w; im[k] += i2[k] * w; if (k > 0 && k < N / 2) { re[N - k] += r2[N - k] * w; im[N - k] += i2[N - k] * w; } }
      bands[c][b] = null;
    }
    fft(re, im, true);
    for (let i = 0; i < len; i++) out[c][i] = re[i];
  }
  // the direct sound is the convolver's dry path's business: the response starts with it at 1 (the mixer sets dry and wet)
  let pk = 0; for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[c][i]));
  if (o.noDirect) { const i0 = Math.round(d0 / C * sr) + 2; for (let c = 0; c < 2; c++) for (let i = 0; i < Math.min(len, i0); i++) out[c][i] = 0; }
  if (pk > 0) for (let c = 0; c < 2; c++) for (let i = 0; i < len; i++) out[c][i] /= pk;
  return { L: out[0], R: out[1], T };
}
