// ---- Variieren and Wandern (SPEC §12.2): operators on the weak positions – the strong ones (the 1, the middle of the
// bar, a note held in from before, a chord) stay. Per pass 16 candidates of one to three operators, scored by
// consistency with the anchor, novelty against the last passes, fit (leaps, density) and a penalty for repeating;
// picked by a softmax whose temperature rises with the step; an elastic pull back to the anchor grows with the distance.
// Every draw is the pass's own seed: the same anchor, seed and weights give the same pass. ----
const HX_VOPS = ['nb', 'eu', 'th', 'fi', 'ok', 'orn', 'sw'];   // Nachbarstufe, euklidisch, dünner, Füllung, Oktave, Verzierung, Halbtakt-Tausch
const HX_VOPW = { nb: 'Nachbarstufen', eu: 'Rhythmus', th: 'dünner', fi: 'Durchgänge', ok: 'Oktaven', orn: 'Verzierungen', sw: 'Halbtakte', ret: 'zurück zum Anker' };
const HX_VW = { nb: 1, eu: 0.55, th: 0.65, fi: 0.7, ok: 0.45, orn: 0.5, sw: 1.1 };
HX.vw = {};   // (the session's operator weights: ✕ halves the ones it refused, ✓ raises the ones it kept; the Handschrift seeds them)
// the step's own character: α (consistency against novelty), temperature, the chance a pass stays as it was, the pull back
const HX_VLV = { 2: { a: 0.65, T: 0.08, stay: 0.3, s: 0.5, ops: 2 }, 3: { a: 0.45, T: 0.15, stay: 0.15, s: 0.75, ops: 3 } };
function hxVOp(op, W, n, o, R) {
  const per = hxVPer(W), I = (x) => hxVIdx(W, x), eps = W.u === 'b' ? 0.02 : 0.02, bpb = o.bpb || 4;
  const chord = (i) => n.some((y, j) => j !== i && Math.abs(y.t - n[i].t) < eps);
  const strong = (x) => x.held || (W.u === 'b' ? hxVMet(x.t, bpb) >= 0.9 : x.t <= o.t0 + 1e-6);
  const free = n.map((x, i) => i).filter((i) => !strong(n[i]) && !chord(i));
  const pick = (a) => a[Math.floor(R() * a.length)];
  const single = (i) => !chord(i);
  if (op === 'nb') {   // a neighbour degree, ±1 or ±2, its contour to both neighbours kept
    if (!free.length) return null;
    const i = pick(free), x = n[i], Ix = I(x);
    let pv = null, nx = null;
    for (let j = i - 1; j >= 0; j--) if (n[j].t < x.t - eps && single(j)) { pv = n[j]; break; }
    for (let j = i + 1; j < n.length; j++) if (n[j].t > x.t + eps && single(j)) { nx = n[j]; break; }
    for (const s of R() < 0.5 ? [1, -1, 2, -2] : [-1, 1, -2, 2]) {
      const J = Ix + s;
      if (pv && Math.sign(J - I(pv)) !== Math.sign(Ix - I(pv))) continue;
      if (nx && Math.sign(I(nx) - J) !== Math.sign(I(nx) - Ix)) continue;
      if (J < o.lo - 2 || J > o.hi + 2) continue;
      const m = n.slice(); m[i] = hxVPitch(W, x, J); return m;
    }
    return null;
  }
  if (op === 'eu') {   // the weak onsets of one bar redistributed evenly (Toussaint), their count and pitches kept
    if (W.u !== 'b') return null;
    const bars = Math.max(1, Math.round(o.U / bpb)), b = Math.floor(R() * bars), a0 = b * bpb, a1 = a0 + bpb;
    const ins = free.filter((i) => n[i].t >= a0 - 1e-6 && n[i].t < a1 - 1e-6).sort((p, q) => n[p].t - n[q].t);
    if (ins.length < 2) return null;
    const res = ins.every((i) => Math.abs(n[i].t * 2 - Math.round(n[i].t * 2)) < 0.05) ? 2 : 4, slots = bpb * res;
    const busy = new Set(n.filter((x, i) => !ins.includes(i) && x.t >= a0 - 1e-6 && x.t < a1 - 1e-6).map((x) => Math.round((x.t - a0) * res)));
    const av = []; for (let s = 1; s < slots; s++) if (!busy.has(s) && !(bpb === 4 && s === bpb * res / 2)) av.push(s);   // (the 1 and the middle stay the strong notes' own)
    if (av.length <= ins.length) return null;
    const pat = euclid(av.length, ins.length, Math.floor(R() * av.length)), pos = av.filter((_, j) => pat[j]);
    const m = n.slice(); let moved = false;
    ins.forEach((i, q) => { const x = n[i], off = x.t - Math.round(x.t * res) / res, t = a0 + pos[q] / res + off; if (Math.abs(t - x.t) > 1e-6) moved = true; m[i] = Object.assign({}, x, { t, d: x.d != null ? Math.min(x.d, Math.max(0.05, a1 - t)) : null }); });
    return moved ? m : null;
  }
  if (op === 'th') {   // thinner: the weakest (metric weight × velocity) goes – never below 60 % of the anchor (40 % while making room)
    const minN = Math.max(2, Math.ceil(o.A * (o.gd < -0.3 ? 0.4 : 0.6)));
    if (n.length <= minN || !free.length) return null;
    const w = free.map((i) => [(W.u === 'b' ? hxVMet(n[i].t, bpb) : 0.5) * (0.3 + (n[i].vel || 0.5)) + 0.04 * R(), i]).sort((p, q) => p[0] - q[0]);
    const m = n.slice(); m.splice(w[0][1], 1); return m;
  }
  if (op === 'fi') {   // a passing tone in a gap between notes a third or more apart, on the grid, in the scale
    const maxN = Math.ceil(o.A * (o.gd > 0.3 ? 1.75 : 1.5));
    if (n.length >= maxN) return null;
    const q = W.u === 'b' ? 0.25 : o.U / 16, s = n.map((x, i) => i).filter((i) => single(i) && !n[i].held), gaps = [];
    for (let j = 0; j + 1 < s.length; j++) { const a = n[s[j]], b = n[s[j + 1]]; if (b.t - a.t >= 2 * q - 1e-6 && Math.abs(I(b) - I(a)) >= 2) gaps.push([a, b]); }
    if (!gaps.length) return null;
    const [a, b] = pick(gaps), t = Math.round((a.t + (b.t - a.t) / 2) / q) * q;
    if (t <= a.t + 1e-6 || t >= b.t - 1e-6) return null;
    if (W.u === 'b' && n.filter((x) => Math.floor(x.t) === Math.floor(t)).length >= 4) return null;   // (never more than four in a beat)
    const D = I(b) - I(a), J = I(a) + Math.sign(D) * Math.ceil(Math.abs(D) / 2);
    const x = hxVPitch(W, Object.assign({}, a, { t, held: false, d: a.d != null ? Math.min(a.d, (b.t - t) * 0.9) : null, vel: 0.75 * Math.min(a.vel || 0.6, b.vel || 0.6), cy: [], cf: [] }), J);
    return n.concat([x]);
  }
  if (op === 'ok') {   // an octave up or down, inside the loop's range widened to an octave around its middle
    if (!free.length) return null;
    const i = pick(free), x = n[i], J = I(x) + (R() < 0.5 ? per : -per), mid = (o.lo + o.hi) / 2;
    if (J < Math.min(o.lo, mid - per) || J > Math.max(o.hi, mid + per)) return null;
    const y = hxVPitch(W, x, J); if (!(y.f >= 30 && y.f <= 4200)) return null;
    const m = n.slice(); m[i] = y; return m;
  }
  if (op === 'orn') {   // a grace note (the upper or lower neighbour, a 32nd before) or a Wirbel (three strokes) on a weak note
    const g = W.u === 'b' ? 0.125 : 0.06, cand = n.map((x, i) => i).filter((i) => single(i) && !n[i].held);
    if (!cand.length) return null;
    const i = pick(cand), x = n[i];
    if (R() < 0.6 || !free.includes(i)) {
      const t = x.t - g; if (t < 0 || n.some((y) => y.t > t - g && y.t < x.t - 1e-6)) return null;
      return n.concat([hxVPitch(W, Object.assign({}, x, { t, held: false, d: x.d != null ? g * 0.8 : null, vel: (x.vel || 0.6) * 0.55, cy: [], cf: [] }), I(x) + (R() < 0.7 ? 1 : -1))]);
    }
    const nx = n.find((y) => y.t > x.t + eps), q = Math.min(nx ? nx.t - x.t : o.U - x.t, W.u === 'b' ? 0.5 : 0.3);
    if (q < (W.u === 'b' ? 0.25 : 0.15)) return null;
    const m = n.slice(); m.splice(i, 1, ...[0, 1, 2].map((k) => Object.assign({}, x, { t: x.t + (k * q) / 3, d: x.d != null || k ? (q / 3) * 0.85 : null, vel: (x.vel || 0.6) * [1, 0.7, 0.55][k], cy: k ? [] : x.cy, cf: k ? [] : x.cf })));
    return m;
  }
  if (op === 'sw') {   // Wandern: a half bar swapped for another (this loop's, or the session's) with the same first and last degree
    if (W.u !== 'b') return null;
    const half = bpb === 4 ? 2 : bpb, H = Math.floor(o.U / half + 1e-6);
    const seg = (list, a, b) => { const s = list.filter((x) => !x.held && x.t >= a - 1e-6 && x.t < b - 1e-6).sort((p, q) => p.t - q.t); return s.length ? { s, f: I(s[0]), l: I(s[s.length - 1]) } : null; };
    const own = []; for (let h = 0; h < H; h++) { const s = seg(n, h * half, (h + 1) * half); if (s) own.push(Object.assign(s, { h })); }
    if (!own.length) return null;
    const tg = pick(own), mod = (v) => ((v % per) + per) % per;
    const src = own.filter((s) => s.h !== tg.h).map((s) => ({ f: s.f, l: s.l, ns: s.s.map((x) => Object.assign({}, x, { t: x.t - s.h * half })) })).concat(o.segs || []);
    const ok = src.filter((s) => mod(s.f) === mod(tg.f) && mod(s.l) === mod(tg.l) && (s.ns.length !== tg.s.length || s.ns.some((x, j) => Math.abs(x.t - (tg.s[j].t - tg.h * half)) > 1e-6 || hxVIdx(W, x) - s.f !== I(tg.s[j]) - tg.f)));
    if (!ok.length) return null;
    const s = pick(ok), sh = tg.f - s.f, a = tg.h * half;
    const keep = n.filter((x) => x.held || x.t < a - 1e-6 || x.t >= a + half - 1e-6);
    return keep.concat(s.ns.map((x) => hxVPitch(W, Object.assign({}, x, { t: a + x.t, held: false }), hxVIdx(W, x) + sh)));
  }
  return null;
}
// the hard limits of a pass: between 40 % (60 % unless making room) and 150 % (175 % when filling) of the anchor's notes,
// never more than four in a beat
function hxVOk(W, n, A, gd) {
  if (n.length < Math.max(Math.min(2, A), Math.ceil(A * (gd < -0.3 ? 0.4 : 0.6))) || n.length > Math.ceil(A * (gd > 0.3 ? 1.75 : 1.5))) return false;
  if (W.u === 'b') { const c = {}; for (const x of n) { const b = Math.floor(x.t + 1e-6); if ((c[b] = (c[b] || 0) + 1) > 4) return false; } }
  return true;
}
// how well a candidate sits: no leaps beyond an octave and a step, never more than four notes in a beat, its count near
// the anchor's
function hxVFit(W, n, A) {
  let f = 1; const per = hxVPer(W), s = n.slice().sort((a, b) => a.t - b.t);
  for (let i = 1; i < s.length; i++) if (s[i].t - s[i - 1].t > 0.02 && Math.abs(hxVIdx(W, s[i]) - hxVIdx(W, s[i - 1])) > per + 1) f -= 0.2;
  if (W.u === 'b') { const c = {}; for (const x of n) { const b = Math.floor(x.t + 1e-6); c[b] = (c[b] || 0) + 1; } if (Object.values(c).some((v) => v > 4)) f -= 0.4; }
  if (n.length < 0.5 * A || n.length > 1.75 * A) f -= 0.5;
  return f;
}
// one pass from the one before: o = {seed, lvl 2|3, wts, gd (the Gärtner's density: −1 thinner … +1 fuller), guard,
// segs (Wandern: the session's half bars), bpb}. → {n, ops, chg (the notes that are new against the pass before), d}
function hxVarStep(W, A, prev, o) {
  const R = hxRng(o.seed), lv0 = HX_VLV[o.lvl >= 3 ? 3 : 2], hist = prev.hist || [], ld = clamp(o.lad || 0, 0, 1);
  const lv = ld > 0 ? Object.assign({}, lv0, { stay: lv0.stay * (1 - 0.85 * ld), ops: lv0.ops + Math.round(2 * ld), T: lv0.T * (1 + ld), s: lv0.s + (0.95 - lv0.s) * 0.6 * ld }) : lv0;   // (step 4: Ladung – less staying, more operators, a hotter choice, a weaker pull back)
  const keep = (ops) => ({ n: prev.n, ops, chg: [], d: hxVDist(W, A, prev.n), hist: [prev.n].concat(hist).slice(0, 4) });
  if (o.guard) return keep([]);   // (§6.4: three passes after a new Schicht nothing changes)
  const ids = A.map((x) => hxVIdx(W, x)), lo = Math.min(...ids), hi = Math.max(...ids), t0 = Math.min(...A.map((x) => x.t));
  const ctx = { A: A.length, lo, hi, t0, U: W.len, bpb: o.bpb || 4, gd: o.gd || 0, segs: o.lvl >= 3 ? o.segs || [] : [] };
  const fin = (n, ops) => { hxVSort(n); const pk = new Set(prev.n.map((x) => hxVKey(W, x))); return { n, ops, chg: n.filter((x) => !pk.has(hxVKey(W, x))), d: hxVDist(W, A, n), hist: [prev.n].concat(hist).slice(0, 4) }; };
  // the elastic pull: back toward the anchor with a chance that grows with the distance (less with Wandern)
  const dPrev = hxVDist(W, A, prev.n);
  if (dPrev > 0 && R() < clamp(dPrev * (1 - lv.s) * 1.6, 0, 0.85)) {
    const half = W.u === 'b' ? ((o.bpb || 4) === 4 ? 2 : o.bpb || 4) : W.len, H = Math.max(1, Math.floor(W.len / half + 1e-6)), h = Math.floor(R() * H), a = h * half, b = a + half;
    const inW = (x) => x.held || (x.t >= a - 1e-6 && x.t < b - 1e-6);
    const n = prev.n.filter((x) => !inW(x)).concat(A.filter(inW).map((x) => Object.assign({}, x)));
    if (hxVDist(W, A, n) < dPrev) return fin(n, ['ret']);
    return fin(A.map((x) => Object.assign({}, x)), ['ret']);
  }
  if (R() < lv.stay) return keep([]);   // (a pass that stays: the loop breathes, it does not chatter)
  const ops = HX_VOPS.filter((k) => (k !== 'sw' || o.lvl >= 3) && (k !== 'eu' || W.u === 'b'));
  const dens = (k) => (k === 'th' ? (ctx.gd < 0 ? 1 + 2 * -ctx.gd : 1 - 0.8 * ctx.gd) : k === 'fi' ? (ctx.gd > 0 ? 1 + 2 * ctx.gd : 1 + 0.8 * ctx.gd) : 1);
  const w = ops.map((k) => Math.max(0, HX_VW[k] * (o.wts && o.wts[k] != null ? o.wts[k] : 1) * dens(k))), tw = w.reduce((a, b) => a + b, 0);
  if (!(tw > 0)) return keep([]);
  const draw = () => { let r = R() * tw; for (let i = 0; i < ops.length; i++) { r -= w[i]; if (r <= 0) return ops[i]; } return ops[ops.length - 1]; };
  const cands = [];
  for (let c = 0; c < 16; c++) {
    let m = prev.n.map((x) => Object.assign({}, x)); hxVSort(m);
    const used = [], k = 1 + Math.floor(R() * lv.ops);
    for (let j = 0; j < k; j++) { const op = draw(), r = hxVOp(op, W, m, ctx, R); if (r) { m = hxVSort(r); used.push(op); } }
    if (used.length && hxVOk(W, m, A.length, ctx.gd)) cands.push({ n: m, ops: used });
  }
  if (!cands.length) return keep([]);
  const past = [prev.n].concat(hist).slice(0, 4);
  const sc = cands.map((c) => {
    const cons = 1 - hxVDist(W, A, c.n), nov = past.reduce((a, p) => a + hxVDist(W, p, c.n), 0) / past.length, rep = past.some((p) => hxVDist(W, p, c.n) < 1e-9) ? 1 : 0;
    return lv.a * cons + (1 - lv.a) * nov + 0.5 * hxVFit(W, c.n, A.length) - rep;
  });
  const mx = Math.max(...sc), ex = sc.map((s) => Math.exp((s - mx) / lv.T)), es = ex.reduce((a, b) => a + b, 0);
  let r = R() * es, pi = 0; for (; pi < ex.length - 1; pi++) { r -= ex[pi]; if (r <= 0) break; }
  return fin(cands[pi].n, cands[pi].ops);
}
// the session's half bars for Wandern: the other loops' notes in the same scale size (degrees, as they were played)
function hxVSegs(L, W) {
  const per = hxVPer(W), out = [], half = (L.bpb || 4) === 4 ? 2 : L.bpb || 4;
  for (const X of hxLoopsLive()) {
    if (X === L || X.bew) continue;
    for (const id of X.sch) {
      const S = HX.sch.get(id), V = S && S.wn; if (!V || V.u !== 'b' || hxVPer(V) !== per) continue;
      for (let h = 0; h * half < V.len - 1e-6 && out.length < 64; h++) { const s = V.n.filter((x) => !x.held && x.t >= h * half - 1e-6 && x.t < (h + 1) * half - 1e-6).sort((a, b) => a.t - b.t); if (s.length) out.push({ f: hxVIdx(V, s[0]), l: hxVIdx(V, s[s.length - 1]), ns: s.map((x) => Object.assign({}, x, { t: x.t - h * half })) }); }
    }
  }
  return out;
}
// a Schicht's notes as pass k plays them at Variieren or Wandern: the chain of passes from its anchor (each from the one
// before, cached; one not known is grown from the nearest known before it, or from the anchor)
function hxVarW(L, S, k, W0) {
  let C = S.vc; if (!C || C.src !== W0.n) C = S.vc = { src: W0.n, m: new Map() };
  const hit = C.m.get(k); if (hit) return hit.W;
  let j = k - 1; while (j >= k - 32 && !C.m.has(j)) j--;
  let prev = j >= k - 32 ? C.m.get(j) : null;
  if (!prev) { j = k - 1; prev = { n: W0.n, hist: [] }; }
  for (let q = j + 1; q <= k; q++) {
    const r = hxVarStep(W0, W0.n, prev, { seed: hxWSeedK(S, q) ^ 0x51ed27, lvl: hxEigN(L), wts: HX.vw, gd: L.gdv || 0, guard: L.guardK != null && q < L.guardK, segs: hxEigN(L) >= 3 ? hxVSegs(L, W0) : [], bpb: L.bpb || 4, lad: hxLadOf(L) });   // (step 4: Ladung – it varies more)
    r.W = Object.assign({}, W0, { n: r.n }); C.m.set(q, r); prev = r;
  }
  for (const x of C.m.keys()) if (x < k - 40) C.m.delete(x);
  return C.m.get(k).W;
}
// the notes a pass grows from: the Schicht's (its tools applied) – or the anchor's, when ✓ kept a varied pass
function hxWBase(L, S) { const W = hxWNotesT(L, S); if (!W) return W; const a = S.anc; return a && a.vn && a.vn.length ? Object.assign({}, W, { n: a.vn }) : W; }
// ✕ on a varied pass: the operators that made it count half for the rest of the session, the chain begins at the anchor
function hxVarNein(L, kHeard, kFrom) {
  const ops = new Set();
  for (const id of L.sch) { const S = HX.sch.get(id), C = S && S.vc; if (!C) continue; const r = C.m.get(kHeard); if (r) for (const op of r.ops) if (op !== 'ret') ops.add(op); for (const x of [...C.m.keys()]) if (x >= kFrom) C.m.delete(x); C.m.set(kFrom, { n: C.src, ops: ['nein'], chg: [], d: 0, hist: [], W: null }); C.m.get(kFrom).W = null; }
  for (const op of ops) HX.vw[op] = clamp((HX.vw[op] != null ? HX.vw[op] : 1) * 0.5, 0.05, 2);
  for (const id of L.sch) { const S = HX.sch.get(id), C = S && S.vc, r = C && C.m.get(kFrom); if (r) { const W0 = hxWBase(L, S); r.W = W0 ? Object.assign({}, W0, { n: C.src }) : null; if (!r.W) C.m.delete(kFrom); } }
  return [...ops];
}

