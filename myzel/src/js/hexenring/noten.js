// ---- §14 the notes' tools (Wuchs) and §12.1d the groove: every tool works on the notes as played (S.wn) through L.nt,
// applied when a pass is made – Stufen (degrees in the key it was played in), dünner (the weakest notes – metric
// weight × velocity – go) or dichter (passing tones between notes a third or more apart, on the weak sixteenths between
// them, seeded), straffen or lockern toward the player's own groove, Krebs, Umkehrung in the scale ----
const hxNtOn = (L) => !!(L && L.nt && (L.nt.tr || L.nt.dens || L.nt.gq || L.nt.krebs || L.nt.umk));
const hxMetric = (t) => { const p = ((Math.round(t * 4) % 16) + 16) % 16; return p === 0 ? 1 : p % 4 === 0 ? 0.8 : p % 2 === 0 ? 0.55 : 0.3; };
// a note's pitch moved to another place of the key it was played in (index = octave · degrees + degree); its own
// inflection (alt) kept as the ratio to its degree
function hxNtPitch(W, n, I) {
  const k = W.key, per = k.free ? 12 : k.per, d = ((I % per) + per) % per, o = Math.floor(I / per);
  if (k.free || !k.rat || n.deg == null) return Object.assign(n, { deg: d, oct: o, f: n.f * Math.pow(2, (I - (n.oct * per + (n.deg || 0))) / 12) });
  const r0 = k.rat[clamp(n.deg, 0, per - 1)] * Math.pow(2, n.oct), r1 = k.rat[d] * Math.pow(2, o), f = (n.f * r1) / r0;
  return Object.assign(n, { deg: d, oct: o, f: Number.isFinite(f) && f > 0 ? f : n.f });
}
// the groove of a note list in beats (§12.1d): per sixteenth of the bar its mean offset, velocity and spread; the swing
// of the off-beat eighths and sixteenths as the delay in beats
function hxGrooveOf(W, bpb) {
  if (!W || W.u !== 'b' || W.n.length < 3) return null;
  const P16 = 4 * (bpb || 4), G = Array.from({ length: P16 }, () => ({ n: 0, d: 0, d2: 0, v: 0 }));
  for (const x of W.n) { if (x.held) continue; const g = Math.round(x.t * 4), p = ((g % P16) + P16) % P16, d = x.t - g / 4, c = G[p]; c.n++; c.d += d; c.d2 += d * d; c.v += x.vel || 0; }
  const T = G.map((c) => (c.n ? { n: c.n, d: c.d / c.n, sd: Math.sqrt(Math.max(0, c.d2 / c.n - (c.d / c.n) * (c.d / c.n))), v: c.v / c.n } : null));
  // (the feel: per sixteenth within the beat – on the beat, e, &, a – pooled over every beat of the loop)
  const C = [0, 1, 2, 3].map((q) => { let n = 0, d = 0; T.forEach((c, p) => { if (c && p % 4 === q) { n += c.n; d += c.d * c.n; } }); return n ? d / n : 0; });
  const mean = (f) => { let s = 0, n = 0; T.forEach((c, p) => { if (c && f(p)) { s += c.d * c.n; n += c.n; } }); return n ? s / n : null; };
  const on = mean((p) => p % 4 === 0), e8 = mean((p) => p % 4 === 2), s16 = mean((p) => p % 2 === 1);
  return { T, C, sw8: e8 != null && on != null ? e8 - on : null, sw16: s16 != null ? s16 - (mean((p) => p % 2 === 0) || 0) : null };
}
function hxWNotesT(L, S) {
  const W = S && S.wn; if (!W || !hxNtOn(L)) return W;
  const sig = JSON.stringify(L.nt);
  if (S.wnT && S.wnT.src === W && S.wnT.sig === sig) return S.wnT.W;
  const T = L.nt, per = W.key.free ? 12 : W.key.per, U = W.len, idx = (x) => x.oct * per + (x.deg || 0);
  let n = W.n.map((x) => Object.assign({}, x));
  // (the seed of the fills: the Schicht's own throw – the same fills every pass and after a reload)
  let h = (S.wseed | 0) || 7; const R = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  if (T.gq && W.u === 'b') {   // straffen: toward the grid plus the player's own template; lockern: the deviations from it larger
    const G = hxGrooveOf(W, L.bpb), q = clamp(Math.abs(T.gq), 0, 1);
    for (const x of n) { if (x.held) continue; const g = Math.round(x.t * 4), tp = G ? G.C[((g % 4) + 4) % 4] : 0, d = x.t - g / 4; x.t = g / 4 + (T.gq > 0 ? (1 - q) * d + q * tp : tp + (1 + q) * (d - tp)); }
  }
  if (T.dens < 0 && n.length > 1) {   // dünner: the weakest share goes (a quarter per step), never the last note
    const k = Math.min(n.length - 1, Math.round(n.length * Math.min(0.75, 0.25 * -T.dens)));
    const w = n.map((x, i) => [(W.u === 'b' ? hxMetric(x.t) : 0.6) * (0.3 + (x.vel || 0.5)), i]).sort((a, b) => a[0] - b[0]).slice(0, k).map((x) => x[1]);
    const drop = new Set(w); n = n.filter((_, i) => !drop.has(i));
  }
  if (T.dens > 0) {   // dichter: a passing tone in a share of the gaps between notes a third or more apart
    const s = n.filter((x) => !x.held).sort((a, b) => a.t - b.t), add = [], share = Math.min(1, 0.4 * T.dens), q16 = W.u === 'b' ? 0.25 : U / 16, gaps = [];
    for (let i = 0; i + 1 < s.length; i++) { const a = s[i], b = s[i + 1], I0 = idx(a), I1 = idx(b); if (b.t - a.t >= 2 * q16 && Math.abs(I1 - I0) >= 2) gaps.push([Math.abs(I1 - I0) + 0.01 * R(), a, b, I0, I1]); }
    gaps.sort((p, q) => q[0] - p[0]);   // (the widest leaps first – a seeded hair decides between equal ones)
    for (const [, a, b, I0, I1] of gaps.slice(0, Math.max(1, Math.round(share * gaps.length)))) {
      const t = Math.round((a.t + (b.t - a.t) / 2) / q16) * q16; if (t <= a.t + 1e-6 || t >= b.t - 1e-6) continue;
      const x = Object.assign({}, a, { t, d: a.d != null ? Math.min(a.d, (b.t - t) * 0.9) : null, vel: 0.7 * Math.min(a.vel || 0.6, b.vel || 0.6), held: false, cy: [], cf: [] });
      add.push(hxNtPitch(W, x, Math.round((I0 + I1) / 2)));
    }
    n = n.concat(add);
  }
  const mv = (x, J) => { const f0 = x.f; hxNtPitch(W, x, J); const r = x.f / f0; if (r !== 1 && x.cf && x.cf.length) x.cf = x.cf.map(([dt, v]) => [dt, v * r]); };   // (Etappe 3: a glide curve holds Hz – it moves with its note)
  if (T.tr) for (const x of n) mv(x, idx(x) + T.tr);
  if (T.umk && n.length) { const I = n.map(idx).sort((a, b) => a - b), pv = I[I.length >> 1]; for (const x of n) mv(x, 2 * pv - idx(x)); }
  if (T.krebs) for (const x of n) {   // the end of each note is where its mirror starts (a struck one: its onset mirrored)
    const d = x.d != null ? x.d : 0, t = U - x.t - d;
    x.t = ((t % U) + U) % U; x.held = false;
    if (d) { x.cy = (x.cy || []).map(([dt, v]) => [d - dt, v]).reverse(); x.cf = (x.cf || []).map(([dt, v]) => [d - dt, v]).reverse(); }
  }
  n.sort((a, b) => a.t - b.t);
  const W2 = Object.assign({}, W, { n });
  S.wnT = { src: W, sig, W: W2 };
  return W2;
}
function hxNtSet(L, k, v) {
  const was = Object.assign({ tr: 0, dens: 0, gq: 0, krebs: false, umk: false }, L.nt || {}), to = Object.assign({}, was);
  if (k === 'tr') to.tr = clamp(was.tr + v, -14, 14); else if (k === 'dens') to.dens = clamp(was.dens + v, -3, 2); else if (k === 'gq') to.gq = clamp(Math.round((was.gq + v) * 2) / 2, -1, 1);
  else if (k === 'krebs' || k === 'umk') to[k] = !was[k]; else if (k === 'zurueck') Object.assign(to, { tr: 0, dens: 0, gq: 0, krebs: false, umk: false });
  const lk = L.key, put = (X, s) => { X.nt = Object.assign({}, s); X.wwhy = Object.assign(X.wwhy || {}, { nt: hxNtOn(X) }); hxWUpdate(X, { now: 1 }); hxSaveMeta(X.id); hxCardDirty(); hxRailDirty(); };
  put(L, to);
  const lab = k === 'tr' ? 'Stufe ' + (to.tr > 0 ? '+' : '') + to.tr : k === 'dens' ? (to.dens < 0 ? 'dünner ' + -to.dens : to.dens > 0 ? 'dichter ' + to.dens : 'Dichte wie gespielt') : k === 'gq' ? (to.gq > 0 ? 'straffer' : to.gq < 0 ? 'lockerer' : 'Groove wie gespielt') : k === 'krebs' ? (to.krebs ? 'Krebs' : 'vorwärts') : k === 'umk' ? (to.umk ? 'Umkehrung' : 'nicht umgekehrt') : 'Noten wie gespielt';
  hxHist({ kind: 'wuchs', label: hxName(L) + ': ' + lab, undo() { const X = hxByKey(lk); if (X) put(X, was); }, redo() { const X = hxByKey(lk); if (X) put(X, to); } });
  hxSay(hxName(L) + ': ' + lab);
}
// „Puls übernimmt Groove“: the Puls's swing from the loop's own off-beats (sixteenths where it plays them, else eighths)
function hxGroovePuls(L) {
  const S = HX.sch.get(L.sch[0]), G = S && hxGrooveOf(S.wn, L.bpb);
  if (!G || (G.sw16 == null && G.sw8 == null)) { toast('In dieser Schleife ist kein Groove zu lesen.'); return null; }
  const sw = G.sw16 != null && Math.abs(G.sw16) > 1e-4 ? clamp((2 * G.sw16) / 0.25, 0, 0.6) : clamp((2 * (G.sw8 || 0)) / 0.5, 0, 0.6);
  setParam('seq.swing', Math.round(sw * 100) / 100);
  hxSay('Puls übernimmt den Groove: Swing ' + Math.round(sw * 100) + ' %'); toast('Der Puls swingt jetzt wie ' + hxName(L) + ' (' + Math.round(sw * 100) + ' %).', 2500);
  return sw;
}
// Erstarren: the Wuchs pass that sounds becomes the Schicht's new Abdruck (its audio exactly – the realm kept it); the
// loop plays its Abdruck again, the notes' tools and the key it froze in become its own (↶ back)
async function hxErstarren(L) {
  if (!L || !hxWAktiv(L)) { hxHint('Nichts zu erstarren – die Schleife spielt ihren Abdruck'); return false; }
  const k = hxPassK(L, Math.round(hxF(hxHeard()))), got = [];
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!hxWCan(S)) continue;
    let V = null;
    if (S.wRe && S.wRe[k] && S.wSeeds && S.wSeeds[k] != null) {
      const m = await hxwCall('keep', { key: S.key + ':' + k }, [], S.wRe[k]);
      if (m && m.L) { const len = hxPassF(L, k + 1) - hxPassF(L, k), nn = Math.max(len, Math.min(m.L.length, m.n || m.L.length)), [aud] = hxChunks(nn); for (let i = 0; i < nn; i++) { const c = aud[Math.floor(i / HX_CH)], j = i % HX_CH; c[0][j] = m.L[i] || 0; c[1][j] = m.R[i] || 0; } V = { aud, n: nn, len }; }
    }
    if (!V) V = S.play === 'anc' && S.anc ? S.anc : S.wu && S.play === 'wu' ? S.wu : null;
    if (V && V.aud) got.push([S, V]);
  }
  if (!got.length) { hxHint('Dieser Durchgang ist schon vorbei'); return false; }
  const before = hxGeo(L), was = { wwhy: Object.assign({}, L.wwhy || {}), eig: L.eig, nt: L.nt || null, klang: L.klang, ton: L.ton }, sw = hxNextSeam(L), lk = L.key, key = hxWKeyNow();
  for (const [S, V] of got) {
    const pre = V.pre || 0, c = Object.assign({}, S.cut, { pre, len: V.len, post: V.n - pre - V.len, n: V.n, aus: V.rev ? null : { off: pre + V.len, len: Math.max(0, V.n - pre - V.len) }, stale: true });
    S.play = 'ab'; S.wu = null; S.anc = null; hxWStop(S);
    hxSchSwap(S, c, { aud: V.aud, f: sw.f, join: V.rev ? 'xf' : 'ola', X: Math.round(0.01 * SR), rho: 0, zo: 0, kc: V.rev ? hxSeamOf({ pre, len: V.len, X: Math.round(0.01 * SR), zo: 0 }, V.aud) : null, fade: V.rev ? 0 : Math.min(Math.round(0.03 * SR), Math.max(0, V.n - pre - V.len)) });
    S.chain = false; S.bak = null; S.baked = false; S.out = L.folgt ? 1 : 0; S.dr = null;
    // (its notes are now what it froze: the tools applied, in the key it sounds in)
    const W = hxWNotesT(L, S); if (W) { const n = W.n.map((x) => { const f = hxWF(L, W, x, key); const y = Object.assign({}, x, { f }); const d = hxDeg(f); return Object.assign(y, { deg: d.deg, oct: d.oct, alt: d.alt }); }); S.wn = Object.assign({}, W, { key: { base: N.base, ...key }, n }); S.wnT = null; }
  }
  L.nt = null; L.eig = 'treu'; L.klang = 'eigen'; L.P = Object.assign({}, hxWPat(L)); L.wwhy = { wahl: false, erst: true };   // (erst: it plays as it sounded – „Instrument beim Preset-Wechsel“ no longer re-plays it, hxKlangOf)
  const key2 = L.key;
  hxHist({ kind: 'wuchs', label: hxName(L) + ' erstarrt', undo() { const X = hxByKey(key2); if (X) { hxGeoBack(X, before); Object.assign(X, { wwhy: was.wwhy, eig: was.eig, nt: was.nt, klang: was.klang, ton: was.ton }); hxWUpdate(X); } }, redo() {} });
  hxSay(hxName(L) + ' erstarrt – ein neuer Abdruck'); toast(hxName(L) + ': dieser Durchgang ist jetzt ihr Abdruck.', 2400);
  hxSaveLoop(L); hxCardDirty(); hxRailDirty();
  return hxByKey(lk) === L;
}
// §12.1c in 2b: the Auslese's consensus itself – the notes every repetition agrees on (median timing and velocity, the
// most typical instance's sound and curves) – grows as the loop's Wuchs (Treu); ↶ back to what was harvested
function hxAusleseWuchs(L) {
  const A0 = L && L.ausl, S = L && HX.sch.get(L.sch[0]);
  if (!A0 || !A0.cons || !S || !S.wn) return false;
  const was = S.wn, lk = L.key, sk = S.key, W = A0.cons;
  const put = (X, Sx, w, on) => { Sx.wn = w; Sx.wnT = null; X.wwhy = Object.assign(X.wwhy || {}, { ausl: on }); hxWUpdate(X); hxSaveMeta(X.id); hxCardDirty(); hxRailDirty(); };
  put(L, S, W, true); L.ausl = null;
  hxHist({ kind: 'wuchs', label: hxName(L) + ': Auslese aus ' + A0.k + ' (Wuchs)', undo() { const X = hxByKey(lk), Y = hxSchByKey(sk); if (X && Y) { put(X, Y, was, false); X.ausl = A0; } }, redo() { const X = hxByKey(lk), Y = hxSchByKey(sk); if (X && Y) put(X, Y, W, true); } });
  hxSay(hxName(L) + ': Auslese aus ' + A0.k + ' – die gemeinte Fassung wächst');
  return true;
}
// the consensus as a Wuchs record: the cycles' full note records, each cluster from its most typical member moved to
// the cluster's median time and velocity (chord notes with it), laid into the harvest's window
function hxAusleseCons(L, S, cycles, r, starts, P0) {
  if (!r || !r.cl || !S) return null;
  const c = S.cut, w0 = hxT(c.w0), evs = [];
  for (const cl of r.cl) {
    const tm = r.med(cl.map((e) => e.t)), vm = r.med(cl.map((e) => e.v));
    let m = cl[0]; for (const e of cl) if (Math.abs(e.t - tm) < Math.abs(m.t - tm)) m = e;
    for (const e of m.evs) {
      const sh = w0 + tm - (m.a0 + m.t), x = Object.assign({}, e, { t0: e.t0 + sh, t1: e.t1 != null ? e.t1 + sh : null, vel: clamp((e.vel || 0.6) * (vm / Math.max(0.05, m.v)), 0.05, 1),
        curves: { y: (e.curves.y || []).map(([t, v]) => [t + sh, v]), f: (e.curves.f || []).map(([t, v]) => [t + sh, v]), pp: null, mb: null } });
      evs.push(x);
    }
  }
  if (!evs.length) return null;
  evs.sort((a, b) => a.t0 - b.t0);
  return hxWNotesMk(L, S, w0, hxT(c.w1), evs);
}

