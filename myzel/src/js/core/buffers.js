/* ---------- heavy buffers (reverb IR, grain textures) are rendered off the main thread ---------- */
function genIR(sec, damp, sr, nch) {
  const len = Math.max(256, Math.floor(sec * sr));
  const tau = sec / 6.9, fadeIn = Math.floor(sr * 0.004);
  const c0 = 0.97, c1 = 0.03 + (1 - damp) * 0.85;
  const out = [];
  for (let ch = 0; ch < (nch || 2); ch++) {
    const d = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const a = c0 + (c1 - c0) * Math.min(1, (t / sec) * (0.6 + damp * 1.4));
      lp += a * ((Math.random() * 2 - 1) - lp);
      let e = Math.exp(-t / tau);
      if (i < fadeIn) e *= i / fadeIn;
      d[i] = lp * e;
    }
    for (let k = 0; k < 12; k++) {
      const idx = Math.floor((0.003 + Math.random() * 0.07) * sr);
      if (idx < len) d[idx] += (Math.random() * 2 - 1) * 0.5 * (1 - k / 14);
    }
    out.push(d);
  }
  return out;
}
function genTexture(kind, sr, F) {
  const dur = 3.2, len = Math.floor(sr * dur);
  const Lc = new Float32Array(len), Rc = new Float32Array(len);
  const TAU = Math.PI * 2;
  if (kind === 'glas') {
    const parts = [[1, 1], [1.5, 0.55], [2, 0.42], [3, 0.22], [4.01, 0.12], [2.5, 0.16]];
    parts.forEach(([r, a], k) => {
      for (let c = 0; c < 2; c++) {
        const d = c ? Rc : Lc, fr = F * r * (c ? 1.0009 : 0.9991);
        let ph = Math.random() * TAU;
        const inc = TAU * fr / sr, sw = 0.25 + k * 0.07;
        for (let i = 0; i < len; i++) { ph += inc; d[i] += a * (0.65 + 0.35 * Math.sin(TAU * sw * i / sr + k)) * Math.sin(ph); }
      }
    });
  } else if (kind === 'chor') {
    const vowels = [[800, 1150, 2900], [400, 800, 2600], [350, 600, 2700], [270, 2140, 2950], [800, 1150, 2900]];
    const H = Math.floor(4200 / F), block = 256, amp = new Float32Array(H + 1);
    for (const det of [-9, 0, 8]) {
      const ph = new Float64Array(H + 1).map(() => Math.random() * TAU);
      const pan = det / 12;
      for (let b = 0; b < len; b += block) {
        const p = (b / len) * (vowels.length - 1), vi = Math.floor(p), vf = p - vi;
        const Fm = [0, 1, 2].map((j) => vowels[vi][j] * (1 - vf) + vowels[Math.min(vi + 1, vowels.length - 1)][j] * vf);
        for (let n = 1; n <= H; n++) {
          const fr = F * n;
          let w = 0;
          Fm.forEach((fc, j) => { const bw = 80 + j * 60; w += [1, 0.6, 0.25][j] * Math.exp(-Math.pow((fr - fc) / bw, 2)); });
          amp[n] = (w + 0.02) / Math.sqrt(n);
        }
        const vib = 1 + 0.006 * Math.sin(TAU * 5.1 * b / sr + det);
        const end = Math.min(len, b + block);
        for (let n = 1; n <= H; n++) {
          const inc = TAU * F * n * Math.pow(2, det / 1200) * vib / sr, a = amp[n];
          if (a < 0.002) { ph[n] += inc * (end - b); continue; }
          let p0 = ph[n];
          for (let i = b; i < end; i++) { p0 += inc; const s = a * Math.sin(p0); Lc[i] += s * (1 - pan); Rc[i] += s * (1 + pan); }
          ph[n] = p0;
        }
      }
    }
  } else if (kind === 'metall') {
    const ratios = [1, 2.32, 3.17, 4.53, 5.91, 7.2, 9.1];
    [0, 0.83, 1.71, 2.38].forEach((ht, hk) => {
      const st = Math.floor(ht * sr);
      ratios.forEach((r, k) => {
        const fr = F * r * (1 + hk * 0.003), dcy = 1.6 / (1 + k * 0.6), a = 0.8 / (1 + k * 0.5);
        for (let c = 0; c < 2; c++) {
          const d = c ? Rc : Lc, inc = TAU * fr * (c ? 1.002 : 0.998) / sr;
          let ph = Math.random() * TAU;
          for (let i = st; i < len; i++) { ph += inc; d[i] += a * Math.exp(-(i - st) / sr / dcy * 3) * Math.sin(ph); }
        }
      });
    });
  } else if (kind === 'fluestern') {
    // Flüstern: two voices whispering syllables into each ear – breath noise through gliding formant resonators,
    // the vowels faintly combed on F so they carry a pitch. Dark "hu, fo, wau" at the start (finger low)
    // turn into bright, hissing "si, tschi, kiss, pssst" towards the end (finger high).
    const D = sr / F, RN = 2 ** Math.ceil(Math.log2(D + 2)), g = 0.65, cg = Math.sqrt(1 - g * g);
    const hiss = (t, dur, bands, voiced, amp, pan, att, rel) => {
      // noise (the voiced share of it through a comb on F) into band-pass resonators gliding from fa to fb; bands: [fa, fb, bw, gain]
      const st = Math.max(0, Math.floor(t * sr)), n = Math.min(len - st, Math.floor(dur * sr));
      const ring = new Float32Array(RN), z = bands.map(() => [0, 0, 0, 0, 0, 0, 0]);   // x1 x2 y1 y2 b0 a1 a2
      const gL = amp * Math.cos(pan * Math.PI / 2), gR = amp * Math.sin(pan * Math.PI / 2), na = Math.max(1, att * sr), nr = Math.max(1, rel * sr);
      for (let i = 0; i < n; i++) {
        if ((i & 15) === 0) bands.forEach(([fa, fb, bw], k) => {
          const f = fa * Math.pow(fb / fa, i / n), w = TAU * f / sr, al = Math.sin(w) * bw / (2 * f), a0 = 1 + al;
          z[k][4] = al / a0 * Math.sqrt(1000 / bw); z[k][5] = -2 * Math.cos(w) / a0; z[k][6] = (1 - al) / a0;
        });
        const w0 = Math.random() * 2 - 1, rd = i - D, j = Math.floor(rd), fr = rd - j;
        const c = w0 + (j >= 0 ? g * (ring[j & (RN - 1)] * (1 - fr) + ring[(j + 1) & (RN - 1)] * fr) : 0);
        ring[i & (RN - 1)] = c;
        const x = voiced * cg * c + (1 - voiced) * w0;
        let y = 0;
        for (let k = 0; k < bands.length; k++) {
          const s = z[k], o = s[4] * (x - s[1]) - s[5] * s[2] - s[6] * s[3];
          s[1] = s[0]; s[0] = x; s[3] = s[2]; s[2] = o; y += bands[k][3] * o;
        }
        const e = Math.sin(Math.PI / 2 * Math.min(1, i / na, (n - i) / nr)) ** 2;
        Lc[st + i] += gL * e * y; Rc[st + i] += gR * e * y;
      }
    };
    const V = { u: [330, 800, 2300], o: [470, 880, 2600], a: [820, 1300, 2700], e: [450, 2050, 2850], i: [330, 2350, 3150] };
    const VOW = ['u', 'u', 'o', 'au', 'a', 'oi', 'ai', 'e', 'i', 'i'];   // dark → bright; diphthongs glide from the first vowel to the second
    const FR = {   // fricatives as noise bands
      f: [[2600, 3000, 3500, 0.35]], w: [[1200, 1600, 1800, 0.35]], ch: [[3900, 4300, 1700, 0.7]],
      sch: [[2700, 2900, 1300, 0.8], [5500, 5500, 3000, 0.25]], s: [[6200, 6600, 2600, 0.6]],
    };
    const PL = { p: [[950, 850, 1500, 1]], k: [[2300, 1900, 900, 1]], t: [[4600, 4600, 3000, 0.8]] };   // plosive bursts
    const ONS = ['h', 'w', 'h', 'f', 'p', 'k', 'ch', 't', 'sch', 's', 'ts'];   // dark → bright
    const pk = (a, q) => a[Math.min(a.length - 1, Math.max(0, Math.floor((q + (Math.random() - 0.5) * 0.35) * a.length)))];
    const formants = (a, b, sc) => [0, 1, 2].map((k) => [V[a][k] * sc, V[b][k] * sc, [140, 180, 260][k], [0.7, 0.8, 0.35][k]]);
    const syll = (t, q, pan, sc) => {   // one syllable starting at t, returns its end
      const vw = pk(VOW, q), va = vw[0], vb = vw[1] || vw[0], on = pk(ONS, q);
      let tv = t;
      if (on === 'h') { hiss(t, 0.08, formants(va, va, sc), 0, 0.5, pan, 0.03, 0.04); tv += 0.05; }
      else if (PL[on] || on === 'ts') {   // plosive: a short burst, then a breath into the vowel
        hiss(t, 0.02, PL[on] || PL.t, 0, 1.4, pan, 0.001, 0.016);
        if (on === 'ts') { hiss(t + 0.012, 0.09, FR.s, 0, 1, pan, 0.01, 0.03); tv += 0.08; } else tv += 0.03;
      } else { const d = 0.06 + Math.random() * 0.06; hiss(t, d, FR[on], 0, 1, pan, 0.02, 0.03); tv += d - 0.025; }
      const dv = 0.11 + Math.random() * 0.12;
      hiss(tv, dv, formants(va, vb, sc), 0.6, 1, pan, 0.025, 0.06);
      let te = tv + dv;
      if (Math.random() < 0.1 + 0.6 * q) {   // a closing consonant, more often on the bright side
        const cd = pk(['ch', 't', 's', 'sch', 's'], q);
        if (cd === 't') hiss(te - 0.02, 0.02, PL.t, 0, 1.2, pan, 0.001, 0.016);
        else hiss(te - 0.04, 0.08 + Math.random() * 0.06, FR[cd], 0, 1, pan, 0.02, 0.04);
        te += 0.05;
      }
      return te;
    };
    // the second voice is a little smaller (higher formants) and starts a moment later; each word drifts a bit in space
    for (const [pan, t0, sc] of [[0.2, 0, 1], [0.8, 0.1 + Math.random() * 0.15, 1.12]]) {
      let t = t0;
      while (t < 3.2) {
        const q = t / 3.2, wp = pan + (Math.random() - 0.5) * 0.2;
        if (q > 0.6 && Math.random() < 0.2) {   // a long "pssst" or "schhh"
          hiss(t, 0.02, PL.p, 0, 1.2, wp, 0.001, 0.016);
          hiss(t + 0.015, 0.25 + Math.random() * 0.2, Math.random() < 0.5 ? FR.s : FR.sch, 0, 1, wp, 0.03, 0.08);
          t += 0.5;
        } else for (let k = 1 + Math.floor(Math.random() * 3); k > 0 && t < 3.2; k--) t = syll(t, q, wp, sc) + 0.01;
        const b = 0.06 + Math.random() * 0.12;   // a soft breath between words
        hiss(t - 0.02, b + 0.06, formants('a', 'e', sc), 0, 0.3, wp, b * 0.6, 0.04);
        t += b;
      }
    }
    // lift out the rumble below the voices, compress where both whisper at once and round off the rare sharpest peaks,
    // so the quiet breaths survive the peak normalisation
    const kh = 1 - Math.exp(-TAU * 160 / sr), pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.006));
    let h1L = 0, h2L = 0, h1R = 0, h2R = 0, e = 0, mp = 0;
    for (let i = 0; i < len; i++) {
      h1L += kh * (Lc[i] - h1L); h2L += kh * (Lc[i] - h1L - h2L); Lc[i] -= h1L + h2L;
      h1R += kh * (Rc[i] - h1R); h2R += kh * (Rc[i] - h1R - h2R); Rc[i] -= h1R + h2R;
      pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    }
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = 1.2 * mp / len, c2 = 4 * thr;
    for (let i = 0; i < len; i++) {
      const gc = pw[i] > thr ? Math.pow(thr / pw[i], 0.45) : 1, l = Lc[i] * gc, r = Rc[i] * gc;
      Lc[i] = l / Math.sqrt(1 + l * l / c2); Rc[i] = r / Math.sqrt(1 + r * r / c2);
    }
  } else if (kind === 'funk') {
    // Kurzwelle: a shortwave dial at night. Under crackling static a carrier whistles on F; the dial sweeps past
    // stations whose beat notes swoop in and settle on harmonics of F, a far voice babbles, an interval signal chimes
    // and morse stations key away. Far and murky at the start (finger low), crisp and busy at the end (finger high).
    const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
    const fade = (t, a, b) => 0.5 + 0.5 * Math.sin(TAU * a * t + b) * Math.sin(TAU * a * 0.37 * t + 2 * b);   // slow QSB fading, 0..1
    const strength = new Float32Array(len);   // how strongly the receiver hears a station: the AGC lifts the static when it fades
    // tone(st, dur, path, env, amp, pan): a sine with a touch of its octave, path(t) in Hz and env(t) 0..1, t in seconds
    const tone = (st, dur, path, env, amp, pan) => {
      const n = Math.min(len - st, Math.floor(dur * sr)), gL = amp * Math.cos(pan * Math.PI / 2), gR = amp * Math.sin(pan * Math.PI / 2);
      let ph = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        const t = i / sr, f = path(t), e = env(t) * Math.min(1, f / 300);   // the receiver's audio band thins out the lowest beats
        ph += TAU * f / sr;
        const s = e * (Math.sin(ph) + 0.15 * Math.sin(2 * ph));
        Lc[st + i] += gL * s; Rc[st + i] += gR * s; strength[st + i] += 0.5 * e;
      }
    };
    const ramp = (dur, a, r) => (t) => Math.min(1, t / a, Math.max(0, (dur - t) / r));
    // the carrier: a beat note on F with some hum on 2F and 3F, drifting by a few cents and fluttering a little;
    // each side listens through its own antenna, so it fades in and out independently left and right
    const qa = [rnd(0.3, 0.45), rnd(0.3, 0.45)], qb = [rnd(0, TAU), rnd(0, TAU)], fl = rnd(6, 9);
    let cph = Math.random() * TAU;
    for (let i = 0; i < len; i++) {
      const t = i / sr, p = i / len, qL = 0.3 + 0.7 * fade(t, qa[0], qb[0]), qR = 0.3 + 0.7 * fade(t, qa[1], qb[1]);
      cph += TAU * F * (1 + 0.0012 * Math.sin(TAU * 0.23 * t + qb[0])) / sr;
      const s = (0.5 - 0.15 * p) * (1 - 0.15 * (1 + Math.sin(TAU * fl * t))) * (Math.sin(cph) + (0.4 - 0.3 * p) * Math.sin(2 * cph) + 0.15 * Math.sin(3 * cph));
      Lc[i] += 0.7 * qL * s; Rc[i] += 0.7 * qR * s; strength[i] += 0.5 * (qL + qR);
    }
    // tuning: the dial sweeps past stations. Most beat notes swoop in from far off and settle on a harmonic of F,
    // some race down through zero beat and back up again; low, slow sweeps at the start, high, quick ones at the end
    for (let k = 0; k < 8; k++) {
      const p = (k + Math.random()) / 8, st = Math.floor(Math.max(0, p - 0.08) * len), dur = rnd(0.35, 0.7), pan = rnd(0.15, 0.85);
      if (Math.random() < 0.7) {
        const fh = F * pick(p < 0.3 ? [1, 2, 2] : p < 0.65 ? [2, 3, 4] : [4, 5, 6, 8]), r0 = Math.random() < 0.6 ? rnd(2.5, 5) : rnd(0.15, 0.4), tg = rnd(0.05, 0.14);
        tone(st, dur, (t) => fh * (1 + (r0 - 1) * Math.exp(-t / tg)), ramp(dur, 0.03, 0.08), rnd(0.4, 0.6), pan);
      } else {
        const v = rnd(3500, 6000) * (0.6 + 0.8 * p) * (Math.random() < 0.5 ? 1 : -1), t0 = dur * rnd(0.35, 0.65);
        tone(st, dur, (t) => 20 + Math.abs(v * (t - t0)), ramp(dur, 0.02, 0.05), rnd(0.25, 0.4), pan);
      }
    }
    // a far voice on a single-sideband station: a buzz on F through a vowel formant that jumps from syllable to syllable
    {
      const st = Math.floor(rnd(0.22, 0.3) * len), n = Math.min(len - st, Math.floor(rnd(0.9, 1.2) * sr));
      const gL = 0.45, gR = 0.75;
      let th = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, a1 = 0, a2 = 0, g = 0, fc = 900, sEnd = 0, sLen = 1, on = 1;
      for (let i = 0; i < n; i++) {
        if (i >= sEnd) { sLen = Math.floor(rnd(0.09, 0.22) * sr); sEnd = i + sLen; on = Math.random() < 0.8 ? rnd(0.6, 1) : 0; fc = rnd(450, 2400); }
        if ((i & 31) === 0) { const w = TAU * fc / sr, r = Math.exp(-w / 8); a1 = 2 * r * Math.cos(w); a2 = -r * r; g = 1 - r; }
        th += TAU * F * (1 + 0.01 * Math.sin(TAU * 3 * i / sr)) / sr;
        const x = Math.atan2(0.85 * Math.sin(th), 1 - 0.85 * Math.cos(th)), y = g * (x - x2) + a1 * y1 + a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        const u = 1 - (sEnd - i) / sLen, e = on * Math.sin(Math.PI * Math.min(1, u)) * Math.min(1, (n - i) / (0.03 * sr)) * (0.75 + 0.25 * Math.sin(TAU * 7 * i / sr)), s = 2.5 * e * y;
        Lc[st + i] += gL * s; Rc[st + i] += gR * s; strength[st + i] += 0.5 * e;
      }
    }
    // an interval signal between broadcasts: a little music-box tune on harmonics of F, fluttering on its way
    {
      const st = Math.floor(rnd(0.42, 0.52) * len), tune = pick([[4, 5, 6, 4, 8, 6], [6, 5, 4, 5, 6, 6], [3, 4, 5, 6, 5, 4]]), d = rnd(0.13, 0.17);
      tune.forEach((h, k) => {
        const at = st + Math.floor(k * d * sr);
        if (at < len) tone(at, d * 2.2, () => F * h, (t) => ramp(d * 2.2, 0.004, 0.03)(t) * Math.exp(-t / (d * 0.6)) * (0.7 + 0.3 * Math.sin(TAU * 8 * t)), 0.5, 0.3);
      });
    }
    // morse: stations calling on harmonics of F, keyed with soft edges and a little chirp at each key-down
    const CODE = { C: '-.-.', Q: '--.-', D: '-..', E: '.', K: '-.-', R: '.-.', T: '-', A: '.-', N: '-.', M: '--', S: '...', O: '---', '5': '.....' };
    const morse = (st, h, u, text, amp, pan) => {
      const keys = [];
      let t = 0;
      for (const ch of text) {
        if (ch === ' ') { t += 4 * u; continue; }
        for (const el of CODE[ch]) { const dd = el === '-' ? 3 * u : u; keys.push([t, t + dd]); t += dd + u; }
        t += 2 * u;
      }
      const n = Math.min(len - st, Math.floor(t * sr)), w = TAU * F * h / sr, gL = amp * Math.cos(pan * Math.PI / 2), gR = amp * Math.sin(pan * Math.PI / 2);
      const qa = rnd(0.4, 0.7), qb = rnd(0, TAU);
      let k = 0, ph = 0;
      for (let i = 0; i < n; i++) {
        const tt = i / sr;
        while (k < keys.length - 1 && tt > keys[k][1] + 0.005) k++;
        const [a, b] = keys[k], e = Math.sin(Math.PI / 2 * Math.min(1, Math.max(0, (tt - a) / 0.005), Math.max(0, (b - tt) / 0.005))) ** 2;
        ph += w * (1 - 0.004 * Math.exp(-Math.max(0, tt - a) / 0.012));
        const s = e * (0.4 + 0.6 * fade(tt, qa, qb)) * Math.sin(ph);
        Lc[st + i] += gL * s; Rc[st + i] += gR * s; strength[st + i] += 0.6 * e;
      }
    };
    const call = () => pick(['CQ CQ DE ', 'CQ DE ', 'QRK ', 'TEST ']) + pick(['DK', 'OE', 'SM', 'RA']) + pick(['5', 'K', 'A', 'T']) + pick(['CQ', 'RN', 'ET', 'OS']) + ' K';
    morse(Math.floor(rnd(0.5, 0.58) * len), pick([4, 5]), rnd(0.045, 0.06), call(), 0.55, 0.25);
    morse(Math.floor(rnd(0.68, 0.76) * len), pick([6, 8]), rnd(0.035, 0.045), call(), 0.35, 0.8);
    morse(Math.floor(rnd(0.3, 0.36) * len), 3, rnd(0.06, 0.07), 'CQ CQ', 0.25, 0.6);
    // static: two independent noise bands that open up along the buffer, which the receiver's AGC lifts while the
    // stations fade, and sharp crackles of distant lightning, more and brighter towards the end
    for (let c = 0; c < 2; c++) {
      const d = c ? Rc : Lc;
      let l1 = 0, l2 = 0, lo = 0, ck = 0, cr1 = 0, cr2 = 0;
      for (let i = 0; i < len; i++) {
        const p = i / len, k = 0.06 + 0.3 * p;
        l1 += k * ((Math.random() * 2 - 1) - l1); l2 += k * (l1 - l2); lo += 0.02 * (l2 - lo);
        if (Math.random() < (20 + 140 * p) / sr) ck = rnd(0.5, 2.5) * (Math.random() < 0.5 ? -1 : 1);
        const kc = 0.15 + 0.3 * p;
        cr1 += kc * (ck * (Math.random() * 2 - 1) - cr1); cr2 += kc * (cr1 - cr2); ck *= 0.985;
        d[i] += 0.9 * Math.max(0.3, 1.3 - 0.6 * strength[i]) * (l2 - lo) + 1.5 * cr2;
      }
    }
    // the receiver: a soft detector bend, an even level so faint stations survive the peak normalisation, no offset
    const pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.015)), kh = 1 - Math.exp(-TAU * 60 / sr);
    let e = 0, mp = 0, hL = 0, hR = 0;
    for (let i = 0; i < len; i++) pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = mp / len, c2 = 6 * thr, round = (x) => x / Math.sqrt(1 + x * x / c2);
    for (let i = 0; i < len; i++) {
      const g = Math.min(2, Math.pow(thr / pw[i], 0.35)), l = round(Lc[i] * g), r = round(Rc[i] * g);
      hL += kh * (l - hL); hR += kh * (r - hR);
      Lc[i] = l - hL; Rc[i] = r - hR;
    }
  } else if (kind === 'orgel') {
    // Harmonium: a reed organ holding a chord on F while the bellows are pumped. Every note speaks on a middle reed
    // and a celeste reed tuned a little sharp on the left and a little flat on the right, so the chord beats slowly and
    // the beating wanders across the stereo field; each pedal stroke swells loudness, brightness and breath together.
    // From a soft, dark 16' and 8' (start, finger low) the stops open up to a full, bright chord (end, finger high).
    const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const notes = [   // ratio to F, stop weight along the buffer (p = 0..1)
      [0.5, (p) => 0.6 - 0.35 * p],
      [1, () => 1],
      [1.5, (p) => 0.75 * smooth(0.1, 0.35, p)],
      [2, (p) => 0.65 * smooth(0.25, 0.5, p)],
      [2.5, (p) => 0.5 * smooth(0.4, 0.65, p)],
      [3, (p) => 0.4 * smooth(0.6, 0.85, p)],
    ].map(([m, w]) => ({
      m, w, beat: 0.5 + Math.random() * 0.9,
      // [detune in beats, gain left, gain right]: the middle reed on both sides, the sharp celeste left, the flat one right;
      // each reed turns as a phasor (c, s), advanced by (dc, ds) per sample
      reeds: [[0, 0.7, 0.7], [1, 1, 0], [-0.8, 0, 1]].map(([b, gl, gr]) => {
        const th = Math.random() * TAU;
        return { b, gl, gr, c: Math.cos(th), s: Math.sin(th), dc: 1, ds: 0 };
      }),
    }));
    // bellows: two pedals in turn, each stroke a quick push of air that sags until the next one; a slower swell on top
    const T = 0.62 + Math.random() * 0.12, sw = Math.random() * TAU;
    const pressure = (t) => { const u = (t / T) % 1; return 0.55 + 0.3 * (1 - Math.exp(-u * 9)) * Math.exp(-u * 1.4) + 0.15 * Math.sin(TAU * 0.31 * t + sw); };
    const nz = [[0, 0, 0], [0, 0, 0]];   // breath noise per side: two low-pass poles, minus a slower one for a band around 1–5 kHz
    const fm = [0, 0, 0, 0, 0, 0, 0, 0];   // nasal formant band-pass state: x1 x2 y1 y2 for left, then right
    let pr = 0, amp = 0, a1 = 0, a2 = 0, g = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      if ((i & 63) === 0) {
        // every 64 samples: pressure, stops, brightness (rising with pressure and along the buffer, higher notes darker,
        // like real reeds) and the reed pitches, which sag a little under pressure
        pr = pressure(i / sr);
        const base = 0.72 + 0.16 * pr + 0.1 * p;
        let ws = 0;
        for (const nt of notes) {
          nt.W = nt.w(p); ws += nt.W * nt.W;
          nt.r = Math.pow(base, Math.sqrt(nt.m));
          for (const q of nt.reeds) {
            const w = TAU * (F * nt.m * (1 - 0.003 * pr) + q.b * nt.beat) / sr, k = 1 / Math.hypot(q.c, q.s);
            q.dc = Math.cos(w); q.ds = Math.sin(w); q.c *= k; q.s *= k;
          }
        }
        amp = (0.45 + 0.55 * pr) / Math.sqrt(ws);
        const w = TAU * 1150 * (0.85 + 0.4 * pr) / sr, r = Math.exp(-w / 3);   // the formant opens a little with the pressure
        a1 = 2 * r * Math.cos(w); a2 = -r * r; g = 1 - r;
      }
      // each reed a rounded sawtooth: harmonics falling off as r^n / n, summed in closed form from its turning phasor
      let l = 0, r = 0;
      for (const nt of notes) {
        if (nt.W < 0.001) continue;
        for (const q of nt.reeds) {
          const c = q.c * q.dc - q.s * q.ds;
          q.s = q.s * q.dc + q.c * q.ds; q.c = c;
          const v = nt.W * Math.atan2(nt.r * q.s, 1 - nt.r * c);
          l += q.gl * v; r += q.gr * v;
        }
      }
      l *= amp; r *= amp;
      const yl = g * (l - fm[1]) + a1 * fm[2] + a2 * fm[3], yr = g * (r - fm[5]) + a1 * fm[6] + a2 * fm[7];
      fm[1] = fm[0]; fm[0] = l; fm[3] = fm[2]; fm[2] = yl; fm[5] = fm[4]; fm[4] = r; fm[7] = fm[6]; fm[6] = yr;
      // breath: wind noise through the reed slots, pulsing with the middle reeds and growing with the pressure
      for (let c = 0; c < 2; c++) { const z = nz[c]; z[0] += 0.45 * ((Math.random() * 2 - 1) - z[0]); z[1] += 0.45 * (z[0] - z[1]); z[2] += 0.15 * (z[1] - z[2]); }
      const air = (1.4 + 0.8 * p) * pr * pr * (0.3 + Math.max(0, (l + r) * 0.3));
      Lc[i] = l + 1.5 * yl + air * (nz[0][1] - nz[0][2]); Rc[i] = r + 1.5 * yr + air * (nz[1][1] - nz[1][2]);
    }
    // even out the swell a little and round off the rare peaks where many reeds meet, so the chord survives the peak
    // normalisation; then block the slight offset that rounding the lopsided reed pulses leaves behind
    const pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.02)), kh = 1 - Math.exp(-TAU * 30 / sr);
    let e = 0, mp = 0, hL = 0, hR = 0;
    for (let i = 0; i < len; i++) pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = mp / len, c2 = 4 * thr, round = (x) => x / Math.sqrt(1 + x * x / c2);
    for (let i = 0; i < len; i++) {
      const g = Math.min(2, Math.pow(thr / pw[i], 0.3)), l = round(Lc[i] * g), r = round(Rc[i] * g);
      hL += kh * (l - hL); hR += kh * (r - hR);
      Lc[i] = l - hL; Rc[i] = r - hR;
    }
  } else if (kind === 'voegel') {
    // Vögel: a small dawn chorus of sine notes that sweep onto multiples of F, so grains still sing the played pitch.
    // From cooing doves (start, finger low) via whistled phrases and chirps to fast high trills (end, finger high).
    const note = (st, dur, h, from, tg, fall, vr, vd, amp, pan, h2) => {
      // the pitch slides from F·h·from onto F·h (time constant tg) and bends by the factor fall towards the end,
      // with vibrato or a fast warble (rate vr, depth vd); a quieter copy answers from the other side of the clearing
      const n = Math.min(len - st, Math.floor(dur * sr)), w = TAU * F * h / sr, kg = Math.exp(-1 / (sr * tg)), lf = Math.log(fall);
      const na = Math.max(1, Math.min(0.012, dur * 0.3) * sr), nr = Math.max(1, Math.min(0.03, dur * 0.4) * sr);
      const gL = amp * Math.cos(pan * Math.PI / 2), gR = amp * Math.sin(pan * Math.PI / 2), dl = Math.floor((0.06 + 0.06 * pan) * sr);
      let ph = 0, lg = Math.log(from);
      for (let i = 0; i < n; i++) {
        const x = i / n;
        ph += w * Math.exp(lg + lf * x * x * x) * (1 + vd * Math.sin(TAU * vr * i / sr)); lg *= kg;
        const e = Math.sin(Math.PI / 2 * Math.min(1, i / na, (n - i) / nr)) ** 2, s = e * (Math.sin(ph) + h2 * Math.sin(2 * ph));
        Lc[st + i] += gL * s; Rc[st + i] += gR * s;
        if (st + i + dl < len) { Lc[st + i + dl] += 0.22 * gR * s; Rc[st + i + dl] += 0.22 * gL * s; }
      }
    };
    const pk = (a) => a[Math.floor(Math.random() * a.length)], after = (st, t) => st + Math.floor(t * sr);
    const bird = (st, r, pan) => {
      if (r < 0.22) {          // dove: a soft, hollow "hu-huu-hu" on 2F or 3F
        const h = pk([2, 2, 3]);
        [[0, 0.16], [0.22, 0.36], [0.64, 0.18]].forEach(([o, d]) => note(after(st, o), d, h, 0.94, 0.05, 0.97, 4, 0.004, 0.45, pan, 0.25));
      } else if (r < 0.45) {   // blackbird: a fluted phrase stepping between harmonics, each note slurred on and bent off
        let t = 0;
        for (let k = 0, cnt = 3 + Math.floor(Math.random() * 3); k < cnt; k++) {
          const d = 0.07 + Math.random() * 0.13;
          note(after(st, t), d, pk([4, 5, 6, 6, 8]), 0.85 + Math.random() * 0.3, 0.015, pk([0.8, 0.9, 1, 1.12]), 6, 0.008, 0.55, pan, 0.08);
          t += d + 0.015 + Math.random() * 0.04;
        }
      } else if (r < 0.62) {   // canary: a rolling warble that ends in a short flourish a fifth up
        const d = 0.22 + Math.random() * 0.25, h = pk([6, 8, 10]);
        note(st, d, h, 1.08, 0.05, 1, 18 + Math.random() * 14, 0.05 + Math.random() * 0.05, 0.45, pan, 0.05);
        note(after(st, d + 0.03), 0.09, h * 1.5, 0.75, 0.02, 0.9, 0, 0, 0.4, pan, 0.05);
      } else if (r < 0.8) {    // sparrow: a few quick "tschilp" sweeps, down onto the note and flicked up
        const h = pk([8, 10, 12]);
        for (let k = 0, cnt = 3 + Math.floor(Math.random() * 4); k < cnt; k++) note(after(st, k * 0.09), 0.055, h, 1.45, 0.01, 1.15, 0, 0, 0.7, pan, 0.08);
      } else {                 // wren: a rapid, accelerating trill of tiny down-sweeps
        const h = pk([8, 10, 12]), cnt = 12 + Math.floor(Math.random() * 10);
        let t = 0, gap = 0.065;
        for (let k = 0; k < cnt; k++) {
          note(after(st, t), 0.038, h, 1.3, 0.008, 1, 0, 0, 0.8 * Math.sin(Math.PI * (k + 0.5) / cnt), pan, 0.05);
          t += gap; gap = Math.max(0.035, gap * 0.95);
        }
      }
    };
    // calls spread evenly along the buffer; the kind of bird follows the position, with some overlap
    for (let k = 0; k < 24; k++) {
      const p = (k + Math.random()) / 24;
      bird(Math.floor(Math.max(0, p - 0.06) * len), p + (Math.random() - 0.5) * 0.25, 0.1 + 0.8 * Math.random());
    }
    // even out where several birds sing at once and round off the peaks where their notes meet in phase,
    // so the lone ones survive the peak normalisation
    const pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.01));
    let e = 0, mp = 0;
    for (let i = 0; i < len; i++) pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = mp / len, c2 = 16 * thr;
    for (let i = 0; i < len; i++) {
      const g = pw[i] > thr ? Math.pow(thr / pw[i], 0.35) : 1, l = Lc[i] * g, r = Rc[i] * g;
      Lc[i] = l / Math.sqrt(1 + l * l / c2); Rc[i] = r / Math.sqrt(1 + r * r / c2);
    }
  } else if (kind === 'wasser') {
    // Wasser: a soft stream, babbling small bubbles and pitched drops on F and its harmonics.
    // The buffer runs from deep, slow gurgling (start, finger low) to bright drips with cave echoes (end, finger high).
    const bubble = (st, h, dcy, rise, amp, pan) => {
      // a bubble rings as a sine whose pitch rises into F·h while it shrinks (Minnaert resonance)
      const n = Math.min(len - st, Math.floor(dcy * 7 * sr)), w = TAU * F * h / sr;
      const kg = Math.exp(-1 / (sr * dcy * 0.35)), ke = Math.exp(-1 / (sr * dcy)), ka = Math.exp(-F * h / (sr * 0.4));
      const gL = amp * Math.cos(pan * Math.PI / 2), gR = amp * Math.sin(pan * Math.PI / 2);
      let ph = 0, dev = rise, e = 1, a = 1;
      for (let i = 0; i < n; i++) {
        ph += w * (1 - dev); dev *= kg; e *= ke; a *= ka;
        const s = (1 - a) * e * Math.sin(ph);
        Lc[st + i] += gL * s; Rc[st + i] += gR * s;
      }
    };
    const HS = [1, 1, 2, 2, 3, 4, 6, 8];   // the harmonic choice slides up this list along the buffer
    // stream bed: two independent noise channels, a soft rush that gets brighter towards the end and surges slowly
    const khp = 1 - Math.exp(-TAU * 300 / sr);
    for (let c = 0; c < 2; c++) {
      const d = c ? Rc : Lc, r1 = 0.6 + Math.random(), r2 = 2.3 + Math.random();
      let l1 = 0, l2 = 0, hp = 0;
      for (let i = 0; i < len; i++) {
        const k = 1 - Math.exp(-TAU * (1000 + 2500 * i / len) / sr);
        l1 += k * ((Math.random() * 2 - 1) - l1); l2 += k * (l1 - l2); hp += khp * (l2 - hp);
        d[i] += 0.35 * (l2 - hp) * (0.7 + 0.2 * Math.sin(TAU * r1 * i / sr + c * 2) + 0.1 * Math.sin(TAU * r2 * i / sr));
      }
    }
    // babble: many tiny, quick bubbles on the upper harmonics, reaching higher towards the end
    for (let k = 0; k < 340; k++) {
      const p = Math.random();
      bubble(Math.floor(p * len), 3 + Math.floor(Math.random() * (5 + 9 * p)), 0.006 + Math.random() * 0.016, 0.2, 0.05 + Math.random() * 0.1, Math.random());
    }
    // main bubbles, spread evenly: large and slow at the start, smaller and higher towards the end;
    // short ones get more amplitude so every bubble carries about the same energy
    for (let k = 0; k < 56; k++) {
      const p = (k + Math.random()) / 56, h = HS[Math.floor(Math.random() * 4 + p * 4)];
      const dcy = (0.045 + 0.12 * (1 - p)) * (0.6 + Math.random() * 0.8), amp = (0.45 + 0.4 * Math.random()) * Math.sqrt(0.06 / dcy) / Math.pow(h, 0.3);
      bubble(Math.floor(p * len), h, dcy, 0.12 + 0.3 * (1 - p) * Math.random(), amp, Math.random());
    }
    // drips with cave echoes that answer from the other side, mostly towards the end
    for (let k = 0; k < 18; k++) {
      const st = Math.floor(Math.sqrt(Math.random()) * len), h = HS[4 + Math.floor(Math.random() * 4)];
      const pan = Math.random() < 0.5 ? 0.15 : 0.85, gap = Math.floor((0.09 + Math.random() * 0.12) * sr);
      for (let j = 0; j < 3 && st + j * gap < len; j++) bubble(st + j * gap, h, 0.03, 0.3, 0.6 * Math.pow(0.4, j), j % 2 ? 1 - pan : pan);
    }
    // block the slow drift that hundreds of one-sided bubble onsets leave behind
    const kh = 1 - Math.exp(-TAU * 50 / sr);
    let hL = 0, hR = 0;
    for (let i = 0; i < len; i++) { hL += kh * (Lc[i] - hL); hR += kh * (Rc[i] - hR); Lc[i] -= hL; Rc[i] -= hR; }
    // gently compress where bubbles pile up, then round off the rare sharpest peaks,
    // so the quiet drips survive the peak normalisation
    const pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.006));
    let e = 0, mp = 0;
    for (let i = 0; i < len; i++) pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = 1.5 * mp / len, c2 = 8 * thr;
    for (let i = 0; i < len; i++) {
      const g = pw[i] > thr ? Math.pow(thr / pw[i], 0.35) : 1, l = Lc[i] * g, r = Rc[i] * g;
      Lc[i] = l / Math.sqrt(1 + l * l / c2); Rc[i] = r / Math.sqrt(1 + r * r / c2);
    }
  } else if (kind === 'zikaden') {
    // Zikaden: a cicada choir. Each insect's tymbals click F times a second, so its buzz lies on the harmonics of F,
    // and two body resonances lift a band of high harmonics out of it.
    // From a far, softly swelling dusk choir (start, finger low) to close singers with fast, sharp rhythms (end, finger high).
    const cicada = (st, dur, h, q, det, glide, amp, pan, song) => {
      // song(t, x) is the drive at t seconds into the phrase (x = 0..1 of it); glide lets the resonance sink at the end (wee-oo);
      // a phrase may start before the buffer (st < 0), so the low end is already in full song
      const n = Math.min(len - st, Math.floor(dur * sr)), inc = F * Math.pow(2, det / 1200) / sr;
      const near = pan < 0.5 ? Lc : Rc, far = pan < 0.5 ? Rc : Lc, dl = Math.round(Math.abs(pan - 0.5) * 2 * 0.0007 * sr);
      const gN = amp * Math.cos(Math.min(pan, 1 - pan) * Math.PI / 2), gF = amp * Math.sin(Math.min(pan, 1 - pan) * Math.PI / 2);
      let ph = Math.random(), carry = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
      let a1 = 0, a2 = 0, g1 = 0, b1 = 0, b2 = 0, g2 = 0;
      for (let i = 0; i < n; i++) {
        if ((i & 63) === 0) {   // band-pass resonators (zeros at DC and Nyquist) on F·h and F·h·1.5
          const hh = h * (1 - glide * Math.max(0, i / n - 0.55) / 0.45);
          let w = TAU * F * hh / sr, r = Math.exp(-w / (2 * q));
          a1 = 2 * r * Math.cos(w); a2 = -r * r; g1 = 1 - r;
          w *= 1.5; r = Math.exp(-w / (1.4 * q));
          b1 = 2 * r * Math.cos(w); b2 = -r * r; g2 = 1 - r;
        }
        // tymbal clicks, placed between samples so the pulse rate stays exactly on F; all alike, since any click-to-click
        // difference (a weaker second tymbal) would repeat only every 2/F and add a buzz an octave down
        let x = carry; carry = 0;
        ph += inc;
        if (ph >= 1) { ph -= 1; const e = song(i / sr, i / n), fr = ph / inc; x += e * fr; carry = e * (1 - fr); }
        const y = g1 * (x - x2) + a1 * y1 + a2 * y2, z = g2 * (x - x2) + b1 * z1 + b2 * z2;
        x2 = x1; x1 = x; y2 = y1; y1 = y; z2 = z1; z1 = z;
        const s = y + 0.5 * z, j = st + i;
        if (j >= 0) near[j] += gN * s;
        if (j + dl >= 0 && j + dl < len) far[j + dl] += gF * s;
      }
    };
    const rnd = (a, b) => a + Math.random() * (b - a), env = (x) => Math.sin(Math.PI * Math.min(1, x)) ** 0.7;
    // the far choir: the whole buffer long, swelling together in slow waves that roll across the field
    const wave = rnd(0.5, 0.7);
    for (let k = 0; k < 6; k++) {
      const pan = (k + 0.5) / 6, tr = rnd(28, 40);
      cicada(0, len / sr, 7 + k * 0.8 + rnd(0, 1), rnd(20, 30), rnd(-9, 9), 0, 0.65, pan,
        (t) => (0.1 + 0.9 * (0.5 + 0.5 * Math.sin(TAU * (wave * t - pan * 0.3))) ** 2) * (0.85 + 0.15 * Math.sin(TAU * tr * t)));
    }
    // close singers along the buffer: long rasping swells low down, pulsed calls in the middle, quick ticking trills at the top
    const N = 18;
    for (let k = 0; k < N; k++) {
      const p = (k + Math.random()) / N, r = p + rnd(-0.15, 0.15), pan = rnd(0.1, 0.9), h = Math.round(6 + 11 * p + rnd(0, 3));
      if (r < 0.38) {
        const dur = rnd(0.9, 1.6), tr = rnd(18, 34), dp = rnd(0.3, 0.7);
        cicada(Math.floor((p - 0.12) * len), dur, h, 16, rnd(-6, 6), 0.25, 1, pan,
          (t, x) => env(x) * (1 - dp * (0.5 + 0.5 * Math.sin(TAU * tr * t))));
      } else if (r < 0.7) {
        const dur = rnd(0.6, 1.2), cr = rnd(4, 8), duty = rnd(0.4, 0.6);
        cicada(Math.floor((p - 0.08) * len), dur, h, 12, rnd(-6, 6), 0.12, 1, pan,
          (t, x) => { const u = (t * cr) % 1; return u < duty ? env(x) * Math.sin(Math.PI * u / duty) ** 2 : 0; });
      } else {
        const dur = rnd(0.4, 0.9), cr = rnd(14, 22), duty = rnd(0.3, 0.45);
        cicada(Math.floor((p - 0.05) * len), dur, h, 9, rnd(-6, 6), 0, 0.9, pan,
          (t, x) => { const u = (t * cr) % 1; return u < duty ? env(x) * Math.sin(Math.PI * u / duty) : 0; });
      }
    }
    // even out where several singers overlap or pause, so the lone ones survive the peak normalisation; round off the
    // sharpest clicks, then block the slow offset that rounding their lopsided ringing leaves behind
    const pw = new Float32Array(len), kp = 1 - Math.exp(-1 / (sr * 0.01)), kh = 1 - Math.exp(-TAU * 70 / sr);
    let e = 0, mp = 0, hL = 0, hR = 0;
    for (let i = 0; i < len; i++) pw[i] = e += kp * (Lc[i] * Lc[i] + Rc[i] * Rc[i] - e);
    for (let i = len - 1; i >= 0; i--) { pw[i] = e += kp * (pw[i] - e); mp += e; }
    const thr = mp / len, c2 = 2.5 * thr, round = (x) => x / Math.sqrt(1 + x * x / c2);
    for (let i = 0; i < len; i++) {
      const g = Math.min(1.6, Math.sqrt(thr / pw[i])), l = round(Lc[i] * g), r = round(Rc[i] * g);
      hL += kh * (l - hL); hR += kh * (r - hR);
      Lc[i] = l - hL; Rc[i] = r - hR;
    }
  } else {
    let lpL = 0, lpR = 0;
    for (let i = 0; i < len; i++) {
      lpL += 0.08 * ((Math.random() * 2 - 1) - lpL); lpR += 0.08 * ((Math.random() * 2 - 1) - lpR);
      Lc[i] += lpL * 0.6; Rc[i] += lpR * 0.6;
    }
    for (let k = 0; k < 140; k++) {
      const st = Math.floor(Math.random() * (len - 4000)), fr = F * (2 + Math.random() * 22), dcy = 0.002 + Math.random() * 0.028, a = 0.2 + Math.random() * 0.8, pan = Math.random();
      let ph = 0;
      for (let i = 0; i < 4000; i++) { ph += TAU * fr / sr; const s = a * Math.exp(-i / sr / dcy) * Math.sin(ph); Lc[st + i] += s * (1 - pan); Rc[st + i] += s * pan; }
    }
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(Lc[i]), Math.abs(Rc[i]));
  const g = peak > 0 ? 0.8 / peak : 1, fade = Math.floor(sr * 0.02);
  for (let i = 0; i < len; i++) {
    let e = g;
    if (i < fade) e *= i / fade; else if (i > len - fade) e *= (len - i) / fade;
    Lc[i] *= e; Rc[i] *= e;
  }
  return [Lc, Rc];
}
const IR4_GAIN = Math.SQRT2;   // a true-stereo IR sums two uncorrelated paths per side at half gain: −3 dB to make up
const DSPW = { w: null, seq: 0, wait: new Map(), broken: false };
// (29.10.2026, owner: „iPad wird immer wichtig bleiben, ebenso Chrome“) a grain read faster than its material folds in
// Chrome and Safari (their buffer sources interpolate linearly, no low pass): the material low-passed below the new
// Nyquist, once per octave of speed, for the grains to read (Körner – grains/mic.js). An 8th-order Butterworth run
// forwards and backwards (no shift in time: a grain finds its place), at 0.45·SR/r.
function genLP(L, R, r) {
  const q = [0.51, 0.6, 0.9, 2.56], w = 2 * Math.PI * 0.45 / r, cs = Math.cos(w), sn = Math.sin(w), out = [];
  for (const x of [L, R]) {
    const y = Float32Array.from(x);
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < 4; k++) {
      const al = sn / (2 * q[k]), a0 = 1 + al, b0 = (1 - cs) / 2 / a0, b1 = (1 - cs) / a0, a1 = -2 * cs / a0, a2 = (1 - al) / a0, n = y.length;
      let z1 = 0, z2 = 0;
      for (let j = 0; j < n; j++) { const i = pass ? n - 1 - j : j, v = y[i], o = b0 * v + z1; z1 = b1 * v - a1 * o + z2; z2 = b0 * v - a2 * o; y[i] = o; }
    }
    out.push(y);
  }
  return out;
}
const DSP_FN = { ir: (...a) => genIR(...a), tex: (...a) => genTexture(...a), ks: (...a) => [genKS(...a)], lp: (...a) => genLP(...a), room: (o, sr) => { const r = genRoom(o, sr); return [r.L, r.R]; }, special: (k, o, sr) => { const r = genSpecial(k, o, sr); return [r.L, r.R]; }, shape: (L, R, sr, o) => { const r = genShape(L, R, sr, o); return [r.L, r.R]; } };
function dspJob(type, args) {
  const run = () => DSP_FN[type](...args);
  if (!DSPW.broken && !DSPW.w) {
    try {
      const src = [genIR, genTexture, genKS, genLP, genRoom, genSpecial, genShape].map((f) => f.toString()).join('\n') +
        '\nvar F={ir:genIR,tex:genTexture,ks:function(){return [genKS.apply(null,arguments)];},lp:genLP,room:function(o,sr){var r=genRoom(o,sr);return [r.L,r.R];},special:function(k,o,sr){var r=genSpecial(k,o,sr);return [r.L,r.R];},shape:function(L,R,sr,o){var r=genShape(L,R,sr,o);return [r.L,r.R];}};' +
        'onmessage=function(e){var d=e.data;var r=F[d.type].apply(null,d.args);postMessage({id:d.id,r:r},r.map(function(a){return a.buffer;}));};';
      DSPW.w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      DSPW.w.onmessage = (e) => { const j = DSPW.wait.get(e.data.id); if (j) { DSPW.wait.delete(e.data.id); j.resolve(e.data.r); } };
      DSPW.w.onerror = () => { DSPW.broken = true; DSPW.w = null; for (const j of DSPW.wait.values()) j.resolve(j.run()); DSPW.wait.clear(); };
    } catch (e) { DSPW.broken = true; DSPW.w = null; }
  }
  if (!DSPW.w) return Promise.resolve(run());
  return new Promise((resolve) => {
    const id = ++DSPW.seq;
    DSPW.wait.set(id, { resolve, run });
    DSPW.w.postMessage({ id, type, args });
  });
}
function toBuffer(chans) {
  const buf = A.ctx.createBuffer(chans.length, chans[0].length, SR);
  chans.forEach((c, i) => buf.getChannelData(i).set(c));
  return buf;
}

