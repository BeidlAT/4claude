// ---- the realms ----
function hxwRealm(i) { if (!i) return HXW; return HXW.pool[i - 1] || (HXW.pool[i - 1] = { i, st: '', p: null, frame: null, port: null, wait: new Map(), id: 0, ms: [], n: 0, why: '' }); }
// a realm for a living pass: an idle one of the pool, else one more booted while the pool has room, else the least busy
function hxwPick() {
  let idle = null, fresh = null, least = null;
  for (let i = 1; i <= HX_WPOOL; i++) {
    const R = hxwRealm(i);
    if (R.st === 'kein' || R.old) continue;   // (Leistung: one being renewed takes no new pass)
    if (R.st === 'ok' && !R.n) { idle = R; break; }
    if (!R.st && !fresh) fresh = R;
    if (!least || R.n < least.n) least = R;
  }
  return idle || fresh || least || HXW;
}
// myzel-ring's frame for a realm's pacing: a port of its own, from the ring (every 0.1 s)
function hxwWport(R) {
  if (!HX.node || !R.port || R.st !== 'ok') return;
  const ch = new MessageChannel();
  R.wid = (HXW.widN = (HXW.widN || 0) + 1);
  hxPost({ wport: ch.port1, wid: R.wid }, [ch.port1]);
  try { R.port.postMessage({ job: 'wport', port: ch.port2 }, [ch.port2]); } catch (e) {}
}
function hxwWportAll() { for (const R of [HXW, ...HXW.pool]) if (R.st === 'ok') hxwWport(R); }
// realms booted before they are needed (a realm loads a second copy of the app and builds its shared state – seconds a
// pass cannot wait): as many as the living Schichten keep busy, two each, within the pool
function hxwWarm(n) { for (let i = 1; i <= Math.min(HX_WPOOL, n); i++) { const R = hxwRealm(i); if (!R.st) hxwCall('warm', { sr: SR }, [], R); } }

// ---- a Schicht's notes for Wuchs (once its window has sounded, from the Humus): the notes begun in its window, and the
// ones held into it from before; times in beats from its start (a Takt loop: the tempo can change) or seconds (frei);
// the key they were played in, the spread of the timing around the grid (the breath of Lebendig) ----
// a key: its root, its degrees' ratios within the octave (the tuning as the field plays it: ratio tables, or the semitones
// equal or just), how many degrees an octave has
function hxWScale(root, scale) {
  const sc = SCALES[scale] || SCALES.mpent, rat = sc.free ? null : sc.r ? sc.r.slice() : sc.s.map((x) => ratioForSemi(x));
  return { root: Number(root) || 0, rat, per: sc.free ? 12 : rat.length, free: !!sc.free, id: String(root), scale: SCALES[scale] ? scale : 'mpent' };
}
// (step 2a) the engines' own movement in a window (the Bewegung lanes of a source's knobs – Körner's density and scatter,
// Tropfen's rain): what the player turned while playing drives the notes when they grow again. Points where a lane
// changes, in the Schicht's units (beats from its start, or seconds); a lane that changed fewer than twice is no gesture
const HX_WLANE = (id) => /^(kor|trp)\./.test(id);
function hxWLanes(w0, w1, u) {
  const mv = hxMv(w0, w1), out = [];
  for (const ln of mv.lanes) {
    if (ln.kind !== 'p' || !HX_WLANE(ln.src)) continue;
    const pts = []; let last = null, ch = 0;
    for (let i = 0; i < ln.v.length; i++) { const v = ln.v[i]; if (last === null || Math.abs(v - last) > 1e-6 * Math.max(1, Math.abs(v))) { if (last !== null) ch++; pts.push([u(faeT((mv.a + i) / FA_R)), v]); last = v; } }
    if (ch >= 2) out.push({ id: ln.src, pts });
  }
  return out;
}
function hxWNotesOf(S, L) {
  if (S.wn && S.wn.gesang) return S.wn;   // (step 4: a voice's notes – Gesang als Noten)
  const c = S.cut; if (!c || c.stale || !hxReach(c) || c.in === 1 || c.in === 3) return null;   // (step 2b: the Puls's ring too – Puls ernten)
  const w0 = hxT(c.w0), w1 = hxT(c.w1), g = S.gate;
  const ga = g ? hxT(g.a) : -Infinity, gb = g && g.b != null ? hxT(g.b) : Infinity;
  const evs = hxNotes(w0 - Math.min(4, (w1 - w0) / 2), w1, c.in, true).filter((e) => (ENGINES[e.eng] || e.eng === 'bor') && !e.probe &&
    (e.t0 >= w0 - 0.03 ? e.t0 < w1 - 0.01 : e.hold && (e.t1 == null || e.t1 > w0 + 0.01)) && e.t0 >= ga - 0.01 && e.t0 < gb);
  return hxWNotesMk(L, S, w0, w1, evs);
}
// (step 2b) the record from events in a window [w0, w1) – the Humus's, or the Auslese's consensus laid into it
function hxWNotesMk(L, S, w0, w1, evs) {
  const c = S.cut, takt = hxTakt(L), b0 = takt ? tgBeat(w0) : 0;
  const u = (t) => (takt ? tgBeat(t) - b0 : t - w0);
  const kp = HX.tonP || { root: P['t.root'], scale: P['t.scale'] }, k = { base: N.base, ...hxWScale(kp.root, kp.scale) };   // (the key the field played in: an announced one is not yet)
  // the timing's spread around the grid (sixteenths of the Takt): ⅓ of it is how far Lebendig breathes
  let sd = 0;
  if (takt && evs.length > 2) { const spb = 60 / tgBpm(w0), dv = evs.filter((e) => e.t0 >= w0 - 0.03).map((e) => { const x = u(e.t0) * 4; return (x - Math.round(x)) * spb / 4; }); const m = dv.reduce((a, b) => a + b, 0) / dv.length; sd = Math.sqrt(dv.reduce((a, b) => a + (b - m) * (b - m), 0) / dv.length); }
  return { u: takt ? 'b' : 's', len: takt ? L.d.beats : c.len / SR, key: k, sd, lanes: hxWLanes(w0, w1, u), n: evs.map((e) => {
    const t = u(e.t0), rel = (p) => p.map(([tt, v]) => [u(tt) - t, v]);
    return { t, held: e.t0 < w0 - 0.03, d: e.t1 != null ? u(e.t1) - t : null, eng: e.eng, f: e.f, deg: e.deg, oct: e.oct, alt: e.alt, y0: e.y0, vel: e.vel, pan: e.pan, src: e.src === 'ras' ? 'fin' : e.src, burst: e.burst, gate: e.gate, hold: e.hold, cy: rel(e.curves.y), cf: rel(e.curves.f) };
  }) };
}
// which Schichten can grow: Gespielt, with notes (Alles holds the loops and the echo – it stays an Abdruck)
const hxWCan = (S) => !!(S && S.wn && S.wn.n.length && S.kind !== 'auftakt' && (!S.cut || S.cut.in !== 1));   // (step 2b: a Puls harvest grows too)
function hxWNotesAll(L) { let any = false; for (const id of L.sch) { const S = HX.sch.get(id); if (S && !S.wn && S.aud) { const w = hxWNotesOf(S, L); if (w) { S.wn = w; any = true; } } } return any; }

// ---- the key, the sound, the level a pass is rendered in ----
// a note's pitch in the key the loop follows now (diatonisch: the same degree in the new scale; transponieren: moved with
// the root; fest: as played) – the nearest way to the new root, never an octave jump; its register stays where it was
function hxWF(L, W, n, key) {
  const t = hxTonOf(L), k0 = W.key;
  if (t === 'fest' || !key) return n.f;
  const sh = ((((key.root - k0.root) % 12) + 18) % 12) - 6;
  if (t === 'transponieren' || key.free || k0.free || n.deg == null) return n.f * Math.pow(2, sh / 12);
  const d = clamp(key.per === k0.per ? n.deg : Math.round((n.deg * key.per) / k0.per), 0, key.per - 1);
  const f = n.f * Math.pow(2, sh / 12) * key.rat[d] / k0.rat[clamp(n.deg, 0, k0.per - 1)];
  return Number.isFinite(f) && f > 0 ? f : n.f * Math.pow(2, sh / 12);   // (a degree the scale does not have – played in another one: moved with the root)
}
// the source a note sounds with: its own, the field's (Spielfeld: the layer it was played on), or one chosen
function hxWEng(L, n) {
  const k = hxKlangOf(L);
  if (k === 'eigen' || (n.src !== 'fin' && n.src !== 'eb2')) return n.eng;
  if (k === 'feld') return n.src === 'eb2' && P['v.layer'] !== 'off' ? P['v.layer'] : P['v.eng'];
  return ENGINES[k] ? k : n.eng;
}
const hxWQ = (L) => { const s = L.stufe || P['hx.stufe'] || '3'; return s === 'gespielt' ? L.q || P['dev.q'] : s; };
const hxWKeyNow = () => { const sig = P['t.root'] + '|' + P['t.scale'] + '|' + P['t.just']; if (HX.wKeyS !== sig) { HX.wKeyS = sig; HX.wKeyV = hxWScale(P['t.root'], P['t.scale']); } return HX.wKeyV; };   // (cached: the rail asks every frame)
// the patch a pass is rendered with: the loop's own (as it was played), or the field's now – never a drift (Taumeln is the
// processor's: a Wuchs version reads at the live drift), never an echo or a hall (they stay live)
function hxWPat(L) { const p = Object.assign({}, hxKlangOf(L) === 'eigen' && L.P ? L.P : P); p['mov.drift'] = 0; return p; }
// a throw: the Schicht's own seed (Treu, the anchor's when it has one), a pass's (Lebendig)
const hxWSeedK = (S, k) => { let h = ((S.wseed | 0) ^ Math.imul(k + 7, 0x9e3779b1)) | 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; return (h >>> 0) % 2147483646 + 1; };
// Voss–McCartney pink noise, seeded: the breath of Lebendig wanders slowly from pass to pass (step n of the loop's notes)
function hxWPink(seed, n) { let s = 0; for (let r = 0; r < 8; r++) { let h = ((seed | 0) ^ Math.imul(r + 1, 0x85ebca6b) ^ Math.imul(Math.floor(n / (1 << r)) + 1, 0xc2b2ae35)) | 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; s += (h >>> 0) / 4294967296 - 0.5; } return s / 2.31; }   // (≈ unit spread)

// pass k of a Schicht as the Werk-Rahmen renders it: times in seconds from the pass's start through the beat map as it is
// (a tempo change inside it included), the key and the sound as the loop follows them; a note begun before the window
// sounds at the end of the pass before it (it rings over the seam – as the original did), one held over the whole loop is
// struck anew each pass (documented limit); Lebendig: each note a little early or late, by the breath
function hxWPass(L, S, k, o = {}) {
  const W0 = o.W || hxWBase(L, S); if (!W0 || !W0.n.length) return null;   // (step 2b: the notes' tools applied; Etappe 3: a kept varied pass's notes; 28.10.2026: o.W – a Werkstatt creation's)
  const W = !o.W && (o.live && o.br == null && hxEigN(L) >= 2) ? hxVarW(L, S, k, W0) : W0;   // (Etappe 3: Variieren, Wandern – this pass's own notes)
  // (step 2b: a tape at another speed reads the version at that speed – it is rendered as long as it reads)
  const sp = L.sp || 1, a = hxPassF(L, k), b = hxPassF(L, k + 1), lenF = Math.max(1, Math.round((b - a) * sp)), len = lenF / SR, takt = W.u === 'b' && hxTakt(L) && sp === 1;
  const B0 = takt ? L.d.b0 + k * L.d.beats : 0, U = W.len;
  const sec = takt ? (x) => (hxFrameAt(B0 + x) - a) / SR : L.gap && W.u === 's' ? (x) => x : (x) => x * (len / U);   // (step 4: gap – a phrase keeps its time, only the silence after it changes)
  // (the breath: a living pass's own; o.br – a kept pass's, so its anchor re-rendered in another key breathes as it did)
  const key = o.key || hxWKeyNow(), live = !!o.live || o.br != null, ld = o.br == null ? hxLadOf(L) : 0, sd = live ? Math.min(0.03 + 0.03 * ld, ((W.sd || 0) / 3) * (1 + 2 * ld) + 0.012 * ld) : 0, kb = o.br != null ? o.br : k;   // (step 4: Ladung – a living pass breathes wider)
  const notes = [];
  W.n.forEach((n, i) => {
    let t = n.t;
    // (held into the window: at the end of the pass before it – here, its own last part; a note struck a hair before the
    // seam – the 30 ms the window takes early, or a rounding under zero – is the pass's first, never a pass late)
    const held = n.held != null ? n.held : t < -0.035 * (U / len);
    if (t < 0) t = held && t + U >= 0 ? t + U : 0;
    let d = n.d != null ? n.d : U - Math.max(0, n.t);
    d = Math.max(0, Math.min(d, U));
    const t0 = sec(t), t1 = n.burst || (n.d == null && !n.hold) ? null : sec(t + d);
    const br = sd ? clamp(sd * hxWPink(S.wseed, kb * W.n.length + i), -2 * sd, 2 * sd) : 0;
    const f = hxWF(L, W, n, key), rf = f / n.f, eng = hxWEng(L, n), tt = Math.max(0, t0 + br);
    const cv = (p, map) => p.map(([dt, v]) => [Math.max(tt, sec(t + dt) + br), map(v)]).filter(([x]) => x < len + HX_WTAIL);
    notes.push({ t0: tt, t1: t1 != null ? Math.max(tt + 0.005, t1 + br) : null, eng, f, y0: n.y0, vel: n.vel, pan: n.pan, src: n.src, burst: n.burst, gate: n.gate, hold: n.hold,
      curves: { y: cv(n.cy || [], (v) => v), f: cv(n.cf || [], (v) => v * rf) } });
  });
  const prm = []; for (const ln of W.lanes || []) for (const [x, v] of ln.pts) { const t = x <= 0 ? 0 : sec(x); if (t < len) prm.push([t, ln.id, v]); }
  return { notes, prm, key, lenF, len, dur: len + (o.tail != null ? o.tail : HX_WTAIL), body: len };
}
// how long a pass's tail rings (until −90 dB under its body): the longest of this Schicht's last renders, with room – a
// render is that much longer than its pass (an offline render cannot end early; 12 s for every pass of a short loop was
// most of the Werk-Rahmen's work). Unknown yet: the 12 s. A tail that still sounded at a render's end (cut – faded over
// 30 ms, never an edge) counts double, so the next render is longer.
function hxWTailEst(S) {
  const a = S.wTails || [];
  if (!a.length) return HX_WTAIL;
  return clamp(1.3 * Math.max(...a) + 0.75, 1, HX_WTAIL);
}
function hxWTailAdd(S, sec, cut) { const a = S.wTails || (S.wTails = []); a.push(cut ? Math.min(HX_WTAIL, 2 * sec + 1) : sec); if (a.length > 6) a.shift(); }
// a render's parameters: the patch, the level, the chain (burnt in unless the loop follows the live chain), the mask
function hxWJob(L, S, job, seed) {
  // (the key it sounds in: the sources tuned by the scale – Gespinst's strings, Rhizom's avalanches, the Bordun – follow it
  // as the notes do; transponieren keeps the scale it was played in, fest the key)
  const p = hxWPat(L), t = hxTonOf(L), k = job.key;
  if (t !== 'fest' && k && k.id != null) { p['t.root'] = k.id; if (t === 'diatonisch') p['t.scale'] = k.scale; }
  return { sr: SR, dur: job.dur, body: job.body, notes: job.notes, prm: job.prm, P: p, q: hxWQ(L), seed, chain: L.folgt || !L.chainRec ? null : L.chainRec, mask: L.mask || [...HX.mask], jrg: L.jrg || { age: A.jrgAge || 0, season: A.season || 0 } };
}
// what a Treu version is made for: the pass's frames (the tempo), the key it follows, the sources, the level, the
// throw, the chain – a version made for something else is made again (Treu: once per change)
function hxWSig(L, S, key) {
  const W = S.wn, k = key || hxWKeyNow(), f = hxNextSeam(L), lenF = hxPassF(L, f.k + 1) - hxPassF(L, f.k);
  const keyS = hxTonOf(L) === 'fest' ? '-' : (hxTonOf(L) === 'transponieren' ? k.root : k.root + ':' + (k.rat || []).map((x) => x.toFixed(6)).join(','));
  const engs = [...new Set(W.n.map((n) => hxWEng(L, n)))].join(',');
  return [Math.round((lenF * (L.sp || 1)) / 8), hxTonOf(L), keyS, engs, hxWQ(L), S.anc ? S.anc.seed + ':' + (S.anc.br != null ? S.anc.br : '') + (S.anc.vn ? ':v' + S.anc.vn.length + ':' + Math.round(S.anc.vn.reduce((a, x) => a + x.t * 97 + x.f, 0)) : '') : S.wseed, L.folgt ? 1 : 0, hxKlangOf(L) === 'eigen' ? 'e' : hxWPHash(),
    hxNtOn(L) ? JSON.stringify(L.nt) : '', L.revW ? 'r' : '', S.wn.n.length + ':' + Math.round(S.wn.len * 1000)].join('|');   // (step 2b: the notes' tools, mirrored, a record trimmed, doubled or the Auslese's)   // (a pass's length within 8 frames is the same: a fractional tempo alternates ±1 frame)
}
function hxWPHash() { let h = 7; for (const id in P) if (PD[id] && !PD[id].rec && !PD[id].dev && !id.startsWith('x') && !/^(rev|dly|mst|seq|l\d|rec|hx|mix)\./.test(id)) { const v = String(P[id]); for (let i = 0; i < v.length; i++) h = (Math.imul(h, 31) + v.charCodeAt(i)) | 0; } return h; }

// a version whose tail was still sounding at the render's end (12 s, or a living pass's estimate) ends with a 30-ms fade
function hxWFadeEnd(aud, n, len) {
  const N = Math.min(Math.round(0.03 * SR), Math.max(1, n - len));
  for (let i = n - N; i < n; i++) { const w = Math.cos(HP_ * (0.5 - 0.5 * Math.cos(Math.PI * (i - n + N + 0.5) / N))), c = aud[Math.floor(i / HX_CH)], j = i % HX_CH; c[0][j] *= w; c[1][j] *= w; }
}
const HP_ = Math.PI / 2;
// ---- the throw rendered once (Treu, the fallback of Lebendig): a whole pass and its tail, trimmed at −90 dB ----
function hxWTrim(L, R, len) {
  let pk = 0; for (let i = 0; i < Math.min(len, L.length); i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const thr = pk * Math.pow(10, -90 / 20);
  let end = L.length; for (let i = L.length - 1; i > len; i--) if (Math.abs(L[i]) > thr || Math.abs(R[i]) > thr) { end = Math.min(L.length, i + Math.round(0.05 * SR)); break; } else if (i === len + 1) end = len;
  return Math.max(len, end);
}
async function hxWRender(L, S, sig, key) {
  const k = hxNextSeam(L).k, job = hxWPass(L, S, k, { key, br: S.anc && S.anc.br != null ? S.anc.br : null });
  if (!job) return null;
  if (!S.wseed) S.wseed = ((Math.random() * 2147483646) | 0) + 1;   // (never a render without its own throw)
  const seed = S.anc ? S.anc.seed : S.wseed;
  HX.wRen++; HX.wLast = performance.now(); hxCount(); HX.wSt.n++;
  const tw = performance.now(), m = await hxwCall('wuchs', hxWJob(L, S, job, seed));
  HX.wRen--; HX.wLast = performance.now(); hxCount(); hxWStat(m, performance.now() - tw, job.dur);
  if (!m || m.err || !m.L) { if (m && m.err) console.warn('Hexenring: Wuchs', m.err); return null; }
  const n = hxWTrim(m.L, m.R, job.lenF), [aud] = hxChunks(n);
  hxWTailAdd(S, (n - job.lenF) / SR, n >= m.L.length);
  for (let i = 0; i < n; i++) { const ch = aud[Math.floor(i / HX_CH)], j = i % HX_CH; ch[0][j] = m.L[i]; ch[1][j] = m.R[i]; }
  if (n >= m.L.length) hxWFadeEnd(aud, n, job.lenF);
  if (L.revW) return { aud: hxRevArr(aud, n), n, len: job.lenF, pre: n - job.lenF, rev: true, sig, seed, ms: m.rms || m.ms || 0, dur: job.dur };   // (step 2b: a mirrored loop's Treu render, mirrored – its tail before its start)
  return { aud, n, len: job.lenF, sig, seed, ms: m.rms || m.ms || 0, dur: job.dur };
}
// a Schicht's version to the processor at frame f: the Abdruck (dry or baked), its Treu render, or its anchor
function hxWPlay(S, which, f, keepStream, now, VV) {
  const L = HX.loops.get(S.loop); if (!L || !HX.node) return false;
  if (which === 'ab') { S.play = 'ab'; hxWStop(S); return hxSchPlay(S, !!(S.bak && S.chain && !L.folgt), f); }
  const V = VV || (which === 'anc' ? S.anc : S.wu); if (!V || !V.aud) return false;   // (28.10.2026: VV – a Werkstatt creation, which 'krea')
  const [cp, tr] = hxCopy(V.aud), out = L.folgt ? 1 : 0;
  if (out) hxOut1();
  hxPost({ replace: { loop: S.loop, schicht: S.id, chunks: cp, n: V.n, pre: V.pre || 0, len: V.len, ausklang: V.rev ? null : { off: V.len, len: Math.max(0, V.n - V.len) }, f, join: V.rev ? 'xf' : 'ola', X: Math.round(0.01 * SR), XM: now ? HX_XM : undefined, rho: 0, zo: 0, kc: V.rev ? hxSeamOf({ pre: V.pre || 0, len: V.len, X: Math.round(0.01 * SR), zo: 0 }, V.aud) : 0, out, dd: 1, wu: 1 } }, tr);   // (step 2b: a mirrored version: its margin before it, joined warm)
  S.play = which; S.out = out; S.swapF = f; S.ddOn = true; hxCount();
  if (!keepStream && S.wLive) S.wk = Math.max(S.wk == null ? -1 : S.wk, hxPassK(L, f));   // (that pass is this version's)
  return true;
}
// what a loop grows for: chosen (the card, or hx.beginn), the key, the tempo, the sound – or Eigensinn above Treu
function hxWAktiv(L) { const w = L.wwhy || {}; return !L.bew && !!(w.wahl || w.tempo || w.ausl || hxEigN(L) >= 1 || hxKlangOf(L) !== 'eigen' || hxNtOn(L) || hxWTonOff(L)); }   // (step 2b: the notes' tools, the Auslese's consensus)
// it follows the key and the key is not the one it was played in (the parameters' key – an announced one included)
const hxWKeyEq = (a, b) => !!a && !!b && a.root === b.root && !!a.free === !!b.free && (a.rat || []).map((x) => x.toFixed(6)).join() === (b.rat || []).map((x) => x.toFixed(6)).join();
// how a loop follows the key: its own setting – „Schleifen folgen dem Preset“ (ui.tonart) makes a fixed one follow too
// the sound a loop plays with: its own setting – „Instrument folgt dem Preset“ (ui.instrument, owner 28.10.2026) makes its
// own one the field's (the preset's) too, as ui.tonart does it for the key
// (an accompaniment keeps the sources it was made for; an erstarrt loop plays as it sounded – its edits stay; a loop
// without notes – the microphone's – has nothing the preset's instrument could play)
const hxKlangOf = (L) => { const k = L.klang || 'eigen'; return k === 'eigen' && P['ui.instrument'] === 'preset' && !(L.mi && L.mi.from) && !(L.wwhy && L.wwhy.erst) && L.sch.some((id) => hxWCan(HX.sch.get(id))) ? 'feld' : k; };
const hxTonOf = (L) => { const t = L.ton || 'diatonisch'; return t === 'fest' && P['ui.tonart'] === 'schleifen' ? 'diatonisch' : t; };
const hxWTonOff = (L) => { const t = hxTonOf(L); if (t === 'fest') return false; const k = hxWKeyNow(); return L.sch.some((id) => { const S = HX.sch.get(id); return hxWCan(S) && (t === 'transponieren' ? S.wn.key.root !== k.root : !hxWKeyEq(S.wn.key, k)); }); };
const hxWLebt = (L) => hxEigN(L) >= 1 && !L.revW && !L.live && hxWAktiv(L) && !(L.treuBis != null && tgBeat(hxNowT()) < L.treuBis) && !(HX.wGuard.pause > performance.now()) && !L.wRefused;
// the reconciler: what every Schicht of a loop should play now – the Abdruck, the anchor, or a Treu render made for
// what it follows (rendered first when there is none; swapped at the next seam, or at o.f)
function hxWUpdate(L, o = {}) {
  if (!L || L.bew || L.state === 'weg' || !HX.node) return;
  if (L.krea && L.krea.sel != null) { hxCardDirty(); hxRailDirty(); return; }   // (28.10.2026: a Werkstatt creation or a Trieb plays – werkstatt.js)
  hxWNotesAll(L);
  if (HXW.st === 'kein' || L.live) { hxWLiveSync(L); hxCardDirty(); hxRailDirty(); return; }   // (no Werk-Rahmen: Live mode; step 4: or chosen)
  if (L.sch.some((id) => { const S = HX.sch.get(id); return S && S.lm; })) hxWLiveSync(L);   // (back from Live: its versions sound again)
  HX.wFeld = hxLoopsLive().some((X) => hxKlangOf(X) === 'feld' && hxWAktiv(X));
  const on = hxWAktiv(L), F = HX.folge && HX.folge.loops.includes(L.key) ? HX.folge : null;
  // (while a key change is announced, nothing of this loop changes before its bar line)
  // (owner, 26.10.2026: „on the fly“ – o.now: a tool of the notes is heard at once, crossfaded mid-pass)
  const at = () => (o.f != null ? o.f : F ? Math.max(Math.round(hxF(F.t)), hxNextSeam(L).f) : o.now ? hxSwapAt(L).f : hxNextSeam(L).f), nw = () => !!o.now && !F && o.f == null && hxNowOk(L);
  if (F && !o.key) o = Object.assign({}, o, { key: F.key });
  for (const id of L.sch) {
    const S = HX.sch.get(id);
    if (!hxWCan(S)) continue;
    if (!S.wseed) S.wseed = ((Math.random() * 2147483646) | 0) + 1;
    if (!on) { if (S.play && S.play !== 'ab') hxWPlay(S, 'ab', at(), false, nw()); continue; }
    const sig = hxWSig(L, S, o.key);
    if (S.anc && S.anc.sig === sig) { if (S.play !== 'anc') hxWPlay(S, 'anc', at(), false, nw()); continue; }
    if (S.wu && S.wu.sig === sig) { if (S.play !== 'wu' || o.re) hxWPlay(S, 'wu', at(), false, nw()); continue; }
    hxWRenderFor(L, S, sig, Object.assign({}, o, { f: o.f != null ? o.f : F ? Math.round(hxF(F.t)) : null }));
  }
  hxCardDirty(); hxRailDirty();
}
// one Treu render a Schicht at a time; a newer wish waits for it and renders again
function hxWRenderFor(L, S, sig, o = {}) {
  if (S.wBusy) { S.wAgain = o; return; }
  S.wBusy = sig; S.wAgain = null;
  const ver = S.ver || 0, key = L.key;
  hxWRender(L, S, sig, o.key).then((V) => {
    S.wBusy = null;
    const X = hxByKey(key);
    if (!X || !HX.sch.has(S.id) || (S.ver || 0) !== ver) return;
    if (V && V.sig === hxWSig(X, S, o.key) && (S.wu || hxMemOk(V.n))) {   // (final pass: a first Treu version within the Speichergrenze, as every other buffer – else the Abdruck plays on)
      S.wu = V; S.wuSaved = 0;
      if (hxWAktiv(X) && !(S.anc && S.anc.sig === V.sig)) { const now = !!o.now && o.f == null && hxNowOk(X); hxWPlay(S, 'wu', o.f != null && o.f > hxF(hxNowT() + 0.05) ? o.f : now ? hxSwapAt(X).f : hxNextSeam(X).f, false, now); }
      hxSaveSch(S, 'w');
    }
    if (S.wAgain || (V && V.sig !== hxWSig(X, S, o.key))) hxWUpdate(X, S.wAgain || {});
    hxCardDirty(); hxRailDirty();
  });
}

// ---- Lebendig: every pass a new throw, streamed – the page posts the pass's slot to the processor (its port) and the
// render to a realm of the pool (the other end); ✕ makes a pass the anchor's; the guard pauses it ----
function hxWSlot(L, S, k, o = {}) {
  const job = hxWPass(L, S, k, { live: !o.treu, key: o.key, tail: hxWTailEst(S) });
  if (!job) { hxwLog('wuchs:kein-durchgang k' + k + ' (keine Noten)'); return false; }
  const a = hxPassF(L, k), from = o.at != null ? Math.max(0, o.at - a) : 0, ch = new MessageChannel(), R = hxwPick();
  hxPost({ wst: { schicht: S.id, k, len: job.lenF, cap: Math.ceil(job.dur * SR) + HX_CH, at: o.at, must: !!o.must, from, port: ch.port1 } }, [ch.port1]);
  const seed = o.treu ? (S.anc ? S.anc.seed : S.wseed) : hxWSeedK(S, k);
  const d = Object.assign(hxWJob(L, S, job, seed), { port: ch.port2, F0: a, lead: HX_WLEAD, from: from / SR, keep: S.key + ':' + k, feld: hxKlangOf(L) === 'feld' });
  R.n++; HX.wJobs++; HX.wLast = performance.now(); lmEv('durchgang'); hxCount(); HX.wSt.n++; HX.wSt.q = Math.max(HX.wSt.q, HX.wJobs);
  const re = S.wRe || (S.wRe = {}); re[k] = R; for (const x in re) if (+x < k - 12) delete re[x];   // (✓ asks the realm that rendered a pass; it keeps its last ten)
  const t0 = performance.now();
  hxwLog('wuchs:sende k' + k + (o.must ? ' muss' : '') + ' ' + Math.round(job.dur * 10) / 10 + 's');
  (S.wPend || (S.wPend = new Set())).add(k);
  hxwCall('wuchs', d, [ch.port2], R).then((m) => {
    S.wPend.delete(k);
    hxwLog('wuchs:k' + k + ' ' + (!m ? 'nichts' : m.err ? 'FEHLER ' + String(m.err).slice(0, 200) : m.stopped ? 'gestoppt' : 'fertig ' + Math.round(+m.ms || 0) + 'ms'));
    R.n = Math.max(0, R.n - 1); HX.wJobs = Math.max(0, HX.wJobs - 1); HX.wLast = performance.now(); hxCount(); hxWStat(m, performance.now() - t0, job.dur);
    if (!m || m.stopped) return;
    if (m.rms) { S.wMs = m.rms; S.wDur = m.dur; }
    if (m.tail != null) hxWTailAdd(S, m.tail, m.cut);
    if (m.setup != null) HX.wSetup = HX.wSetup ? 0.7 * HX.wSetup + 0.3 * m.setup : m.setup;
    S.wDone = Math.max(S.wDone || -1, k); hxWKeepT(S, k, performance.now() - t0);
  });
  S.wSeeds = Object.assign(S.wSeeds || {}, { [k]: seed });
  return true;
}
// (Leistung, 23.10.2026) the Werk-Rahmen's work, for „Leistung messen“: renders begun and done (stopped ones apart), the
// render's own time (its offline context), the whole wait from the request (setup, the queue of its realm, the pacing),
// the seconds of audio made, the most jobs waiting at once
HX.wSt = { n: 0, done: 0, stop: 0, ms: 0, wall: 0, audio: 0, q: 0 };
function hxWStat(m, wall, dur) { const W = HX.wSt; if (!m || m.err) return; if (m.stopped) { W.stop++; return; } W.done++; W.ms += +m.rms || +m.ms || 0; W.wall += wall; W.audio += +dur || 0; }
// (Leistung, 23.10.2026) a living pass whose time has passed while its render still waits in its realm's queue – the
// device falls behind – is never heard (its slot went at its pass's end): it is dropped before it begins. One that
// began rendering goes on (what it streams may already sound, its Ausklang rings into the next pass)
function hxWDropPast(S, kNow) {
  if (!S.wPend || !S.wPend.size) return;
  const sent = S.wDropS || (S.wDropS = new Set());
  for (const k of S.wPend) if (k < kNow && !sent.has(k)) { sent.add(k); const R = S.wRe && S.wRe[k]; try { if (R && R.port) R.port.postMessage({ job: 'drop', keep: S.key + ':' + k }); } catch (e) {} }
  for (const k of sent) if (!S.wPend.has(k)) sent.delete(k);
}
// a living Schicht's stream stops (its fixed version comes back, or it is gone): the processor drops the passes not yet
// heard, and the realms rendering them stop streaming (all: the pass playing too – an undo, a clear)
function hxWStop(S, all) {
  if (!all) hxPost({ wstop: { schicht: S.id } });
  const L = HX.loops.get(S.loop), kNow = L && !all ? hxPassK(L, Math.round(hxF(hxNowT()))) : -Infinity;
  for (const k in S.wRe || {}) if (+k > kNow) { const R = S.wRe[k]; try { if (R && R.port) R.port.postMessage({ job: 'stop', keep: S.key + ':' + k }); } catch (e) {} delete S.wRe[k]; }
}
// how long before its pass a living pass's render starts: the realms' measured setup (graph, module) with room, ≥ 2.4 s
const hxWStartS = () => Math.max(HX_WSTART, HX_WLEAD + 0.6 + 1.5 * (HX.wSetup || 0));
function hxWKeepT(S, k, ms) { const a = S.wT || (S.wT = []); a.push([k, ms]); if (a.length > 8) a.shift(); }
// every scheduler tick: the next pass of each living Schicht, started HX_WSTART s before it (one job per pass)
function hxWTick(now, horizon) {
  if (!HX.node || HX.ctx !== A.ctx) return;
  hxWLiveTick(now, horizon);   // (Live mode: no Werk-Rahmen, or chosen – step 4)
  if (HX.folge && horizon + 0.04 >= HX.folge.t) hxWTonGo();
  if (HX.wTempo && now >= HX.wTempo.due) hxWTempoGo();
  if (HX.wKlang && performance.now() >= HX.wKlang) { HX.wKlang = 0; for (const L of hxLoopsLive()) if (hxKlangOf(L) === 'feld' && hxWAktiv(L)) hxWUpdate(L); }
  const fNow = hxF(now), pnow = performance.now(), G = HX.wGuard;
  if (G.max < Infinity && pnow - G.t > 60000) { G.t = pnow; G.max = G.max + 1 >= HX_WPOOL ? Infinity : G.max + 1; }   // (a minute without an underrun: one more at once again)
  if (pnow - (HXW.renT || 0) > 1000) { HXW.renT = pnow; hxwRenew(); }   // (Leistung: realms renewed – their renders' memory freed)
  if (G.hold && !(G.pause > pnow)) { G.hold = false; G.end = pnow; hxGuardLog('zurueck'); hxCardDirty(); }   // (the hold's span clean – the loops live again from their next pass)
  for (const L of hxLoopsLive()) {
    if (L.bew || L.state === 'weg') continue;
    if (L.treuBis != null && tgBeat(now) >= L.treuBis) { L.treuBis = null; hxRailDirty(); hxCardDirty(); }
    if (L.wRefused && pnow > (L.wRetry || 0)) { L.wRetry = pnow + 4000; if (hxWCanLive(L)) { L.wRefused = false; hxCardDirty(); } }
    const lebt = hxWLebt(L) && L.state === 'spielt', hold = !lebt && hxWHold(L);   // (phone: the guard holds – the last complete pass plays on)
    const k = hxPassK(L, Math.round(fNow)), k1 = k + 1, a1 = hxPassF(L, k1);
    for (const id of L.sch) {
      const S = HX.sch.get(id);
      if (!hxWCan(S)) continue;
      if (S.wPend && S.wPend.size) hxWDropPast(S, k);
      if (!lebt && !hold) { if (S.wLive) { S.wLive = false; hxWStop(S); hxWUpdate(L, { re: true }); } continue; }
      if (!S.wLive) {
        if (hold) continue; if (!hxMemOk(Math.round(1.5 * (hxWTailEst(S) + 4) * SR))) { L.wMemT = pnow; continue; } L.wMemT = 0; S.wLive = true; S.wk = k; hxwWarm(2 * [...HX.sch.values()].filter((x) => x.wLive).length); }   // (final pass: its passes in the processor counted against the Speichergrenze before they stream)
      if ((S.wk == null ? -1 : S.wk) >= k1 || a1 - fNow > hxWStartS() * SR) continue;
      if (L.nein && L.nein.k === k1 && S.anc) { S.wk = k1; hxWPlay(S, 'anc', a1); continue; }   // (✕: the anchor plays that pass)
      if (L.frucht != null && L.frucht === k1 && (S.anc || S.wu)) { S.wk = k1; hxWPlay(S, S.anc ? 'anc' : 'wu', a1); continue; }   // (step 4: Fruchten – at a Treffen its anchor once)
      if (hold) continue;   // (nothing renders: the processor plays the last complete pass at the seam – no slot comes)
      if (HX.wGuard.max < Infinity && HX.wJobs >= HX.wGuard.max) continue;   // (the guard: fewer at once)
      S.wk = k1;
      const key = HX.folge ? (a1 >= Math.round(hxF(HX.folge.t)) ? HX.folge.key : hxWScale(HX.folge.old['t.root'], HX.folge.old['t.scale'])) : null;   // (an announced key: from its bar line on)
      hxWSlot(L, S, k1, { key });
    }
  }
}

