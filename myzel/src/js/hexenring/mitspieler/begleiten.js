// ---- Klangverwandtschaft (SPEC §12.3): Sethares's roughness over the partials of the sources really playing. HX_PART:
// each source's ten strongest partials (ratio to the fundamental, amplitude re the strongest), measured once from the
// Werk-Rahmen's level-3 render of a 220-Hz note (dev/tests/hexenring/part.js) ----
const HX_PART = {"hau":[[3.2,0.639],[3.365,0.712],[3.493,0.807],[3.602,0.958],[3.697,0.917],[3.87,1],[4.029,0.775],[4.193,0.841],[4.292,0.621],[4.449,0.734]],"obt":[[1,0.307],[1.989,0.62],[2.991,0.579],[3.988,0.581],[4.961,0.509],[5.982,0.381],[6.945,0.282],[7.937,0.207],[9.921,1],[14.956,0.496]],"stm":[[0.999,0.281],[1.994,0.636],[2.994,0.994],[3.362,0.112],[3.697,0.117],[3.85,0.125],[3.99,1],[4.987,0.852],[5.986,0.284],[6.983,0.215]],"hlm":[[1,0.99],[2.99,1],[4.96,0.681],[6.944,0.379],[8.969,0.208],[10.912,0.116],[12.956,0.067],[14.88,0.037],[14.949,0.042],[16.942,0.025]],"boe":[[4.013,0.161],[4.606,0.138],[4.783,0.145],[4.857,0.195],[4.931,0.219],[5.015,1],[5.085,0.162],[5.185,0.235],[5.266,0.15],[5.34,0.179]],"elm":[[0.5,1],[1,0.84],[1.5,0.116],[2,0.442],[3,0.193],[4,0.23],[4.999,0.107],[6,0.11],[8.001,0.159],[11.982,0.107]],"khl":[[0.854,0.003],[0.929,0.009],[1.001,1],[1.076,0.009],[2.003,0.013],[3.004,0.037],[4.006,0.007],[5.009,0.007]],"neb":[[0.501,1],[0.999,0.433],[2,0.222],[2.991,0.17],[4.018,0.142],[5.029,0.133],[6.034,0.108],[7.034,0.069],[9.057,0.06],[10.061,0.059]],"kor":[[0.908,0.01],[1,1],[1.106,0.011],[1.499,0.194],[1.98,0.214],[2.491,0.069],[3.004,0.3],[4.018,0.099],[5.009,0.018],[6.001,0.019]],"swm":[[0.999,1],[1.971,0.215],[2.067,0.143],[2.955,0.343],[3.063,0.092],[3.175,0.047],[3.884,0.069],[3.955,0.22],[4.04,0.071],[4.945,0.056]],"amo":[[1.001,1],[2.009,0.835],[3.006,0.416],[4.005,0.182],[5.024,0.099],[6.007,0.114],[7.033,0.123],[8.009,0.078],[9.01,0.067],[11.012,0.041]],"hrz":[[1,1],[1.997,0.018],[2.318,0.01],[2.998,0.032],[3.997,0.029],[4.253,0.005],[4.997,0.014],[6.996,0.006],[7.994,0.008],[8.995,0.005]],"shn":[[1,0.932],[2,0.938],[2.996,1],[4.01,0.755],[4.997,0.219],[7.029,0.117],[8.012,0.219],[9.052,0.148],[10.032,0.154],[11.046,0.065]],"zpf":[[0.426,0.091],[0.501,1],[0.626,0.121],[0.925,0.149],[1.001,0.637],[1.092,0.137],[1.175,0.112],[2.514,0.139],[2.639,0.17],[4.644,0.15]],"rnk":[[1.949,1],[2.051,0.997],[3.904,0.327],[4,0.133],[4.096,0.331],[5.862,0.034],[6,0.054],[6.139,0.037],[7.818,0.022],[8.182,0.022]],"sai":[[1,1],[2,0.811],[2.994,0.426],[4.006,0.264],[4.991,0.238],[6.009,0.172],[6.987,0.087],[8.012,0.396],[8.983,0.036],[10.016,0.103]],"jrg":[[1,0.464],[3.291,1],[7.165,0.6],[12.186,0.141],[18.375,0.067],[25.781,0.047],[25.871,0.046]],"glo":[[1.001,0.55],[2.489,0.853],[4.489,1],[5.976,0.414],[7.959,0.294],[9.485,0.095],[11.443,0.092],[12.979,0.023],[14.972,0.024],[18.467,0.005]],"sch":[[1,1],[2.709,0.337],[5.156,0.115],[8.437,0.043],[12.287,0.017],[16.909,0.007]],"gng":[[0.999,1],[1.506,0.064],[1.755,0.252],[2.379,0.106],[2.755,0.073],[3.255,0.05],[3.936,0.037],[4.008,0.022],[4.127,0.023],[4.525,0.023]],"klb":[[1,1],[2,0.078],[2.999,0.024]],"gsp":[[1,0.985],[1.998,1],[2.994,0.503],[3.992,0.356],[4.991,0.235],[5.988,0.189],[6.987,0.093],[7.985,0.508],[8.983,0.04],[9.981,0.118]],"tie":[[0.5,1],[0.75,0.288],[1,0.77],[1.25,0.19],[1.5,0.25],[1.75,0.22],[2,0.118],[2.25,0.112],[2.499,0.088],[2.749,0.06]],"glt":[[1.001,1],[2.99,0.05],[4.98,0.004]],"mem":[[1,1]],"trp":[[0.86,0.029],[1,1],[1.066,0.056],[1.134,0.067],[1.202,0.079],[1.268,0.09],[1.345,0.096],[1.425,0.097],[1.554,0.265],[1.787,0.026]],"mdr":[[1,1],[1.794,0.998],[2.52,0.677],[2.99,0.557],[3.785,0.442],[4.499,0.397],[5.399,0.339],[6.799,0.276],[8.098,0.221],[9.598,0.186]],"rhz":[[0.891,0.777],[1,0.688],[1.337,0.03],[1.501,0.016],[1.781,0.817],[2,0.573],[2.378,1],[2.673,0.044],[3,0.022],[3.567,0.098]]};   // (part.js, measured once on the build machine)
const HX_PARTH = [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25], [5, 0.2], [6, 0.17], [7, 0.14], [8, 0.12]];   // (a harmonic tone: for what was not measured)
const hxPart = (k) => HX_PART[k] || HX_PARTH;
function hxRough(f1, p1, f2, p2) {
  let d = 0;
  for (const [ra, aa] of p1) for (const [rb, ab] of p2) {
    const fa = f1 * ra, fb = f2 * rb, lo = Math.min(fa, fb), df = Math.abs(fa - fb), s = 0.24 / (0.0207 * lo + 18.96);
    d += Math.min(aa, ab) * (Math.exp(-3.5 * s * df) - Math.exp(-5.75 * s * df));
  }
  return d;
}

// ---- Begleiten (SPEC §12.3): from a melody loop, a Viterbi path over „Klangfelder“ (2–4 tones of the scale) per bar –
// melody tones in the field on strong beats, little roughness against the melody's own partials, smooth voice leading,
// fifths and the player's own progressions (Handschrift), the root at the end. Bass (roots on 1 and 3, an approach note
// before a change) and chords (voice-led, held), rendered in the Werk-Rahmen, offered as dashed, silent suggestions ----
const HX_BEGL_CH = ['boe', 'neb', 'stm', 'hrz', 'obt', 'glt', 'hlm', 'sai', 'klb'];
function hxBeglFields(per) {
  const F = [], seen = new Set();
  for (let r = 0; r < per; r++) for (const sh of [[0, 2, 4], [0, 4], [0, 2, 4, 6]]) {
    const pcs = [...new Set(sh.map((x) => (r + x) % per))]; if (pcs.length < 2) continue;
    const k = r + ':' + pcs.slice().sort((a, b) => a - b).join(','); if (seen.has(k)) continue; seen.add(k);
    F.push({ r, pcs, n: sh.length });
  }
  return F;
}
// a pitch of degree d of key K (its own ratios) in the octave nearest f
function hxKeyF(K, d, near) {
  const per = K.free ? 12 : K.per, dd = ((d % per) + per) % per, base = 261.63 * Math.pow(2, (K.root || 0) / 12) / 2;
  const r = K.free || !K.rat ? Math.pow(2, dd / 12) : K.rat[dd], f0 = base * r, o = Math.round(Math.log2(near / f0));
  return f0 * Math.pow(2, o);
}
// the plan: W the melody's notes (beats), its key; → {fields per bar, chEng, bassEng}
function hxBeglPlan(W, o = {}) {
  const K = W.key, per = K.free ? 12 : K.per, bpb = o.bpb || 4, bars = Math.max(1, Math.round(W.len / bpb)), F = hxBeglFields(per);
  const mel = W.n.map((x) => ({ t: ((x.t % W.len) + W.len) % W.len, d: x.d != null ? x.d : 0.5, pc: (((x.deg || 0) % per) + per) % per, f: x.f, eng: x.eng }));
  const mEng = (() => { const c = {}; for (const x of mel) c[x.eng] = (c[x.eng] || 0) + 1; return Object.keys(c).sort((a, b) => c[b] - c[a])[0]; })();
  const chE = o.chEng ? [o.chEng] : HX_BEGL_CH.filter((k) => ENGINES[k] && k !== mEng);
  const vc = new Map(), voice = (fl) => { let v = vc.get(fl); if (!v) vc.set(fl, (v = fl.pcs.map((pc) => hxKeyF(K, pc, 262)))); return v; };
  // roughness of a field (voiced around 262 Hz) against the bar's melody notes, by the sources' partials
  const rough = (fl, b, eng) => { let s = 0; const vs = voice(fl), pe = hxPart(eng); for (const x of mel) if (x.t >= b * bpb && x.t < (b + 1) * bpb) { const px = hxPart(x.eng); for (const f of vs) s += Math.min(2, x.d) * hxRough(x.f, px, f, pe); } return s; };
  const hp = o.prog || {};
  const best = { tot: Infinity };
  for (const ce of chE) {
    // emission per bar and field
    const em = []; let rmax = 1e-9; const rs = [];
    for (let b = 0; b < bars; b++) { rs.push(F.map((fl) => rough(fl, b, ce))); rmax = Math.max(rmax, ...rs[b]); }
    for (let b = 0; b < bars; b++) em.push(F.map((fl, j) => {
      let s = 0, w = 0; for (const x of mel) if (x.t >= b * bpb - 1e-6 && x.t < (b + 1) * bpb - 1e-6) { const st = hxVMet(x.t, bpb) >= 0.7, ww = Math.min(2, x.d) * (st ? 2 : 1); w += ww; s += fl.pcs.includes(x.pc) ? ww : st ? -0.7 * ww : -0.1 * ww; }
      return (w ? s / w : 0) - 0.6 * (rs[b][j] / rmax) + (fl.n === 3 ? 0.05 : 0);
    }));
    const semi = (pc) => (K.free || !K.rat ? pc : 12 * Math.log2(K.rat[pc]));
    const trC = new Map(), tr = (a, c) => { const k = F.indexOf(a) * 64 + F.indexOf(c); let v = trC.get(k); if (v == null) trC.set(k, (v = tr0(a, c))); return v; };
    const tr0 = (a, c) => {
      const va = voice(a), vc2 = voice(c); let mv = 0; for (const f of vc2) mv += Math.min(...va.map((g) => Math.abs(12 * Math.log2(f / g))));
      const dr = ((Math.round(semi(c.r) - semi(a.r)) % 12) + 12) % 12, common = c.pcs.filter((p) => a.pcs.includes(p)).length;
      const hs = hp[a.r + '>' + c.r] || 0, ht = Object.values(hp).reduce((x, y) => x + y, 0);
      return -0.06 * mv + 0.15 * common + (dr === 5 || dr === 7 ? 0.4 : dr === 0 ? 0.1 : dr === 2 || dr === 10 ? 0.15 : 0) + (ht ? 0.3 * Math.log((hs + 1) / (ht + per)) : 0);
    };
    // Viterbi
    let V = F.map((fl, j) => em[0][j] + (fl.r === 0 ? 0.3 : 0)), bp = [];
    for (let b = 1; b < bars; b++) {
      const nV = [], nb = [];
      for (let j = 0; j < F.length; j++) { let bv = -Infinity, bi = 0; for (let i = 0; i < F.length; i++) { const v = V[i] + tr(F[i], F[j]); if (v > bv) { bv = v; bi = i; } } nV.push(bv + em[b][j] + (b === bars - 1 && F[j].r === 0 ? 0.8 : 0)); nb.push(bi); }
      V = nV; bp.push(nb);
    }
    if (bars === 1) V = V.map((v, j) => v + (F[j].r === 0 ? 0.5 : 0));
    let j = V.indexOf(Math.max(...V)); const path = [j]; for (let b = bars - 2; b >= 0; b--) { j = bp[b][j]; path.unshift(j); }
    const totR = path.reduce((a, jj, b) => a + rs[b][jj], 0), score = Math.max(...V);
    // (the source: the one whose chords stand quietest against the melody – a roughness of the whole path, the score's own)
    const key = totR - 0.02 * score;
    if (key < best.tot) Object.assign(best, { tot: key, fields: path.map((jj) => F[jj]), chEng: ce, rough: totR });
  }
  return Object.assign(best, { per, bars, bpb, mEng });
}
// the plan over the candidate sources, one at a time between tasks (each a few ms; together they would hold the main
// thread longer than a decision may)
async function hxBeglBest(W, o) {
  if (o.chEng) return hxBeglPlan(W, o);
  let best = null;
  for (const ce of HX_BEGL_CH) { if (!ENGINES[ce]) continue; const p = hxBeglPlan(W, Object.assign({}, o, { chEng: ce })); if (p.chEng !== p.mEng && (!best || p.tot < best.tot)) best = p; await new Promise((r) => setTimeout(r, 0)); }
  return best || hxBeglPlan(W, o);
}
// the parts: bass notes and chord notes in beats (W's own records: deg/oct in its key, f)
function hxBeglNotes(W, plan) {
  const K = W.key, per = plan.per, bpb = plan.bpb, mk = (t, d, pc, near, vel, eng) => { const f = hxKeyF(K, pc, near); return { t, d, eng, f, deg: pc, oct: Math.round(Math.log2(f / hxKeyF(K, pc, 262))), alt: 0, y0: 0.45, vel, pan: 0, src: 'fin', burst: false, gate: null, hold: !!(ENGINES[eng] && ENGINES[eng].sustain), cy: [], cf: [], held: false }; };
  const bass = [], ch = []; let prevV = null;
  plan.fields.forEach((fl, b) => {
    const a = b * bpb, nx = plan.fields[(b + 1) % plan.fields.length];
    bass.push(mk(a, bpb === 4 ? 1.8 : bpb - 0.2, fl.r, 70, 0.75, plan.bassEng));
    if (bpb === 4) bass.push(mk(a + 2, nx.r !== fl.r ? 1.3 : 1.8, fl.r, 70, 0.6, plan.bassEng));
    if (bpb === 4 && nx.r !== fl.r) { const up = ((nx.r - fl.r + per) % per) <= per / 2, pc = (nx.r + (up ? -1 : 1) + per) % per; bass.push(mk(a + 3.5, 0.45, pc, 70, 0.55, plan.bassEng)); }
    // chords: each tone placed nearest the voice it follows (the first chord around middle C)
    const fs = fl.pcs.map((pc, i) => { const near = prevV ? prevV[Math.min(i, prevV.length - 1)] : 262 * Math.pow(2, i * 0.25); return [pc, hxKeyF(K, pc, near)]; });
    prevV = fs.map(([, f]) => f).sort((x, y) => x - y);
    for (const [pc, f] of fs) ch.push(Object.assign(mk(a, bpb - 0.08, pc, f, 0.5, plan.chEng), { pan: 0 }));
  });
  return { bass, ch };
}
// render a note list (beats over the loop's pass) in the Werk-Rahmen, as a Wuchs pass is – the loop's tempo and key
async function hxBeglRender(Lm, notes, lenB, seed) {
  const k = hxPassK(Lm, Math.round(hxF(hxNowT()))), lenF = hxPassF(Lm, k + 1) - hxPassF(Lm, k), sec = (b) => (b / lenB) * (lenF / SR);
  const p = Object.assign({}, P, { 'mov.drift': 0 }), q = hxWQ(Lm);
  const ns = notes.map((n) => ({ t0: sec(n.t), t1: n.d != null ? sec(n.t + n.d) : null, eng: n.eng, f: n.f, y0: n.y0, vel: n.vel, pan: n.pan || 0, src: 'fin', burst: false, gate: null, hold: n.hold, curves: { y: [], f: [] } }));
  const m = await hxwCall('wuchs', { sr: SR, dur: lenF / SR + HX_WTAIL, body: lenF / SR, notes: ns, prm: [], P: p, q, seed, chain: null, mask: [...EB_K, 'rgn', 'gsp'], jrg: { age: A.jrgAge || 0, season: A.season || 0 } });
  if (!m || m.err || !m.L) return null;
  const n = hxWTrim(m.L, m.R, lenF), [aud] = hxChunks(n);
  for (let i = 0; i < n; i++) { const c = aud[Math.floor(i / HX_CH)], j = i % HX_CH; c[0][j] = m.L[i]; c[1][j] = m.R[i]; }
  if (n >= m.L.length) hxWFadeEnd(aud, n, lenF);
  return { aud, n, len: lenF };
}
// offer the accompaniment of a melody loop: two silent, dashed suggestions (bass, chords) in free places – one tap on a
// ring plays it; „Verwerfen“ in its card or ↶ takes it away
async function hxBegleiten(Lm, o = {}) {
  if (!Lm || Lm.bew || !hxTakt(Lm)) { if (!o.quiet) toast('Begleiten braucht eine Schleife im Takt mit Noten.'); return null; }
  const S = Lm.sch.map((id) => HX.sch.get(id)).find((x) => hxWCan(x));
  const W = S && hxWBase(Lm, S);
  if (!W || W.u !== 'b' || W.n.length < 2) { if (!o.quiet) toast('Diese Schleife hat keine Melodie, zu der der Gärtner begleiten kann.'); return null; }
  if (!hxwOk()) { if (!o.quiet) toast('Begleiten braucht den Werk-Rahmen – in dieser Ansicht gibt es ihn nicht.'); return null; }
  const free = []; for (let i = 0; i < HX_SLOTS && free.length < 2; i++) if (!HX.slot[i] && !(HX.rec && HX.rec.slot === i)) free.push(i);
  if (free.length < 2) { if (!o.quiet) toast('Für die Begleitung braucht es zwei freie Plätze.'); return null; }
  const mi = hxMi(Lm); if (mi.beglBusy) return null; mi.beglBusy = true;
  try {
    const bassL = hxLoopsLive().find((X) => X !== Lm && (hxRoleOf(X) || {}).role === 'bass' && ENGINES[X.eng]);
    const chL = hxLoopsLive().find((X) => X !== Lm && ['akkorde', 'flaeche'].includes((hxRoleOf(X) || {}).role) && ENGINES[X.eng]);
    const plan = await hxBeglBest(W, { bpb: Lm.bpb || 4, chEng: o.chEng || (chL ? chL.eng : null), prog: HX.hs && P['hx.hand'] === 'an' ? HX.hs.prog : null });
    if (hxByKey(Lm.key) !== Lm) return null;
    plan.bassEng = o.bassEng || (bassL ? bassL.eng : ENGINES.amo ? 'amo' : P['v.eng']);
    const parts = hxBeglNotes(W, plan), seed = ((Math.random() * 2147483646) | 0) + 1, lenB = Lm.d.beats;
    hxSay('Gärtner schreibt eine Begleitung …');
    const [rb, rc] = await Promise.all([hxBeglRender(Lm, parts.bass, lenB, seed), hxBeglRender(Lm, parts.ch, lenB, seed + 1)]);
    if (!rb || !rc || hxByKey(Lm.key) !== Lm) { if (!o.quiet) toast('Die Begleitung ließ sich nicht spielen.'); return null; }
    for (const p of [rb, rc]) if (!hxMemOk(p.n)) return null;
    const made = [];
    for (const [i, part, r, kind, eng] of [[0, parts.bass, rb, 'bass', plan.bassEng], [1, parts.ch, rc, 'akkorde', plan.chEng]]) {
      const slot = free[i]; if (HX.slot[slot]) continue;
      const fs = part.map((x) => Math.log2(x.f)), lo = Math.min(...fs), hi = Math.max(...fs);
      const notesR = part.map((x) => ({ ph: clamp(x.t / lenB, 0, 0.9999), x: (hxDeg(x.f).x != null ? hxDeg(x.f).x : 0.5), y: 0.45, r: hi > lo ? (Math.log2(x.f) - lo) / (hi - lo) : 0.5, v: x.vel, d: x.d, deg: x.deg, oct: x.oct, src: 'fin', eng: x.eng, f: x.f }));
      const wn = { u: 'b', len: lenB, key: W.key, sd: 0, lanes: [], n: part };
      const sn = { key: hxKey('l'), slot, d: { lock: 'takt', b0: Lm.d.b0, beats: Lm.d.beats, L: r.len, ph0: 0 }, bpb: Lm.bpb || 4, notes: notesR, eng, gain: kind === 'bass' ? 0.9 : 0.7, src: 0, bpm: Lm.bpm, state: 'stumm', folgt: true, taumeln: true, eig: 'treu',
        sch: [{ key: hxKey('s'), len: r.len, pre: 0, n: r.n, cut: null, aus: { off: r.len, len: Math.max(0, r.n - r.len) }, join: 'ola', X: Math.round(0.01 * SR), rho: 0, gain: 1, mute: false, kind: 'begleit', group: 0, sr: SR, aud: r.aud, chain: false, wn, wseed: seed + i }],
        wwhy: {}, ton: 'diatonisch', klang: 'eigen', mi: { sugg: kind, from: Lm.key, rolle: kind } };
      const L = hxRebuild(sn, { state: 'stumm', fokus: false });
      if (L) made.push(L.key);
    }
    if (!made.length) return null;
    mi.begl = true;
    hxHist({ kind: 'neu', label: 'Begleitung zu ' + hxName(Lm), snaps: [], undo() { this.snaps = []; for (const k of made) { const X = hxByKey(k); if (X) { this.snaps.push(hxSnap(X)); hxDrop(X); } } }, redo() { for (const s of this.snaps) hxRebuild(s, { state: 'stumm', fokus: false }); } });
    if (P['hx.hand'] === 'an') for (let b = 1; b < plan.fields.length; b++) { const k = plan.fields[b - 1].r + '>' + plan.fields[b].r; HXH.prog[k] = (HXH.prog[k] || 0) + 1; }
    hxSay('Begleitung vorgeschlagen: ' + made.length + ' Schleifen, stumm – tippe ihren Ring');
    toast('Begleitung zu ' + hxName(Lm) + ': Bass (' + (ENG_NAME[plan.bassEng] || plan.bassEng) + ') und Akkorde (' + (ENG_NAME[plan.chEng] || plan.chEng) + '), stumm. Ein Tipp auf einen Ring spielt ihn.', 4500, { label: 'Verwerfen', fn: () => { for (const k of made) { const X = hxByKey(k); if (X && hxMi(X).sugg) hxDrop(X); } } });
    hxCardDirty(); hxRailDirty();
    return { made, plan };
  } finally { mi.beglBusy = false; }
}
// at „antwortet“: a melody loop that has played two passes gets its accompaniment offered once (free places permitting)
function hxBeglAuto() {
  if (!P['hx.gBegl'] || !hxwOk()) return;
  for (const L of hxLoopsLive()) {
    const mi = hxMi(L);
    if (mi.begl || mi.sugg || mi.beglBusy || L.bew || L.state !== 'spielt' || !hxTakt(L) || L.k < 2) continue;
    const r = hxRoleOf(L); if (!r || r.role !== 'melodie') continue;
    if (HX.slot.filter((x) => !x).length < 2) return;
    mi.begl = true; hxBegleiten(L, { quiet: true });
    return;
  }
}
// a suggestion taken: it is a loop like any other from now on
function hxSuggTake(L) { const mi = hxMi(L); if (!mi.sugg) return; mi.sugg = null; hxSaveMeta(L.id); hxSay(hxName(L) + ': Vorschlag übernommen'); hxRailDirty(); hxCardDirty(); }

