// ---- the calls (times are audio seconds of A.ctx; the processor gets frames). Musical beats: bar lines at 0, 4, 8 … ----
// hxGrab({in: 0 Gespielt | 1 Alles, t0, t1 | f0, f1, pre, post, tail}) → Promise<{id, chunks: [[L, R]…], f0, n, pre,
// len, post, tail, lost, in}>: the window [t0 − pre, t1 + post + tail) copied out of a Humus ring (waits until it has
// sounded); the chunks are made here and come back filled
function hxGrab(w = {}) {
  if (!HX.node) return Promise.resolve(null);
  const inp = w.in | 0, pre = Math.round((w.pre || 0) * SR), post = Math.round((w.post || 0) * SR), tail = Math.round((w.tail || 0) * SR);
  const fa = w.f0 != null ? Math.round(w.f0) : Math.round(hxF(w.t0)), fb = w.f1 != null ? Math.round(w.f1) : Math.round(hxF(w.t1));
  const f0 = fa - pre, f1 = fb + post + tail, nc = Math.ceil(Math.max(1, f1 - f0) / HX_CH), dst = [], tr = [], id = ++HX.gid;
  for (let i = 0; i < nc; i++) { const L = new Float32Array(HX_CH), R = new Float32Array(HX_CH); dst.push([L, R]); tr.push(L.buffer, R.buffer); }
  const dr = w.dr ? new Float32Array(Math.ceil((f1 - f0) / 128) + 1) : null; if (dr) tr.push(dr.buffer);   // (step 1c: the drift it was played with)
  return new Promise((res) => {
    HX.wait.set('g' + id, (g) => res(g.err ? null : { id, chunks: g.chunks, f0: g.f0, n: g.n, pre, len: fb - fa, post, tail, lost: g.lost, in: inp, dr: g.dr || null }));
    if (!hxPost({ grab: { id, in: inp, f0, f1, dst, dr } }, tr)) { HX.wait.delete('g' + id); res(null); }
  });
}
// hxLoopNew({lock: 'takt' | 'frei', b0 (musical beat of pass 0, default the next bar line), beats | bars, len (frames,
// frei), t0 (frei: its pass 0), gain, pan, out: 0 burnt in | 1 follows the chain, state}) → id
function hxLoopNew(o = {}) {
  const id = ++HX.lid, takt = o.lock !== 'frei', now = tgNow(), beats = o.beats || 4 * (o.bars || 1);
  const b0 = o.b0 != null ? o.b0 : Math.ceil(tgBeat(now + 0.1) / 4 - 1e-9) * 4;
  const fr = o.len != null && Math.abs(o.len - Math.round(o.len)) > 1e-9;   // (step 4: a fractional free length – Treffen setzen)
  const d = { id, lock: takt ? 'takt' : 'frei', b0: b0 + TG.o, beats, L: o.len != null ? (fr ? +o.len : Math.round(o.len)) : Math.round(((beats * 60) / tgBpm(now)) * SR), fr: fr ? 1 : 0, gap: o.gap ? 1 : 0,
    ph0: o.f0 != null ? Math.round(o.f0) : Math.round(hxF(o.t0 != null ? o.t0 : now + 0.1)), gain: o.gain != null ? o.gain : 1, pan: o.pan || 0, out: o.out ? 1 : 0, state: o.state || 'spielt' };
  HX.loops.set(id, { id, d, sch: [], state: d.state, rate: 0, k: -1, f: null, t: null, ps: [], notes: [], lv: [0, 0] });
  if (d.out) hxOut1();
  hxPost({ loop: d });
  hxCount(); hxStripSync();
  return id;
}
// hxSchichtAdd(loop, {chunks, n, pre, len, ausklang: {off, len} | {chunks, off, len}, gain, at | f (its entry; default
// now), join: 'xf' (warm: crossfade X) | 'ola' (cold: Ausklang overlap-added from its second seam) | 'cut', X (s, 0.01),
// rho ('auto': measured; 0 equal power … 1 equal gain), fin (s, its fade-in; default X, 0 none)}) → id; the chunks move to the processor
function hxSchichtAdd(loop, o = {}) {
  const L = HX.loops.get(loop);
  if (!L || !o.chunks || !HX.node) return 0;
  const id = ++HX.sid, tr = [], seen = new Set(), fr = (s) => (s != null ? Math.round(s * SR) : undefined);
  for (const list of [o.chunks, o.ausklang && o.ausklang.chunks]) for (const c of list || []) if (!seen.has(c[0])) { seen.add(c[0]); tr.push(c[0].buffer, c[1].buffer); }
  const join = o.join || 'xf', X = fr(o.X) || Math.round(0.01 * SR), rho = o.rho == null || o.rho === 'auto' ? (join === 'xf' ? hxRho(o.chunks, o.n, o.pre || 0, o.len, X) : 0) : +o.rho;
  const d = { loop, id, chunks: o.chunks, n: o.n, pre: o.pre || 0, len: o.len, ausklang: o.ausklang || null, gain: o.gain != null ? o.gain : 1,
    f: o.f != null ? Math.round(o.f) : o.at != null ? Math.round(hxF(o.at)) : undefined, join, X, rho, fin: fr(o.fin) };
  hxPost({ schicht: d }, tr);
  L.sch.push(id); HX.sch.set(id, { id, loop, len: o.len, pre: o.pre || 0, n: o.n });
  hxCount();
  return id;
}
// the correlation of a Schicht's seam: what follows its end (the pass going on) against its start, over the fade
function hxRho(ch, n, pre, len, X) {
  const at = (i) => { const c = ch[Math.floor(i / HX_CH)]; return c ? [c[0][i % HX_CH], c[1][i % HX_CH]] : [0, 0]; };
  let ab = 0, aa = 0, bb = 0;
  for (let j = 0; j < X; j++) {
    if (pre + len + j >= (n != null ? n : ch.length * HX_CH)) break;
    const a = at(pre + len + j), b = at(pre + j);
    ab += a[0] * b[0] + a[1] * b[1]; aa += a[0] * a[0] + a[1] * a[1]; bb += b[0] * b[0] + b[1] * b[1];
  }
  return aa > 1e-20 && bb > 1e-20 ? clamp(ab / Math.sqrt(aa * bb), -1, 1) : 0;
}
const hxAt = (at) => (at != null ? Math.round(hxF(at)) : undefined);
// a Schleife's state at a moment: 'spielt' · 'stumm' (its phase runs on) · 'angehalten' (at its seam: its Ausklang rings
// once; b0 with 'spielt': it comes back from its start at that musical beat); X: the fade (s)
// (owner, 27.10.2026: „sie spielt nur über Abspielen, nicht wenn ich in der Loopleiste auf Play gehe“) started by the
// player (its ring, its card, ▶ Weiter) while the editor listens to it: the listening ends – the Schleife itself sounds.
// Only there: what starts it by itself (Wiederkehr, a Lichtung, the form) leaves the listening alone.
// (… also one still being rendered – it would start after the player's start and silence the loop again)
function hxPvEnd(L, to = 'spielt') { if (to === 'spielt' && ((HXE.pv && HXE.pv.key === L.key) || (HXE.pvWant && HXE.key === L.key))) hxPvStop(); }
function hxState(loop, to, at, o = {}) {
  const L = HX.loops.get(loop); if (!L) return false;
  L.state = to; hxCount();
  if (!L.bew && typeof hxMi === 'function') { if (to !== 'spielt' && !HX.gdAct) hxMi(L).uMute = A.ctx ? tgBeat(hxNowT()) : 0; if (to === 'spielt' && L.mi && L.mi.sugg && !HX.gdAct) hxSuggTake(L); }   // (Etappe 3: Wiederkehr never brings back what the player muted; a suggestion played is taken)
  if (L.bew) hxBewState(L, to, at);   // (step 1d: a Schleife of Bewegung follows on the mod layer)
  return hxPost({ state: { loop, to, f: hxAt(at), X: o.X != null ? Math.round(o.X * SR) : undefined, b0: o.b0 != null ? o.b0 + TG.o : undefined, over: o.over || undefined } });
}
// a level (a loop's, or a Schicht's: {schicht: id}), with a smooth ramp (s); pan for a loop
function hxGain(target, g, at, ramp, pan) {
  const t = typeof target === 'object' ? target : { loop: target };
  if (t.schicht == null && g != null) { const L = HX.loops.get(t.loop); if (L && L.gg != null) g *= L.gg; if (L && L.pvMute) { g = 0; if (at != null) L.pvLate = Math.max(L.pvLate || 0, at); } }   // (a level for later while silenced – a Lichtung's: hxPvStop sends it again then)   // (owner, 26.10.2026: silent while the editor plays it – Vorhören)   // (Etappe 3: under the Gärtner's factor – the player's level stays his own)
  return hxPost({ gain: Object.assign({}, t, { g, f: hxAt(at), ramp: ramp != null ? Math.round(ramp * SR) : undefined, pan }) });
}
// a Schicht out (its seam fade), a loop or all out; → Promise of the chunks the processor hands back
function hxUndo(schicht, at, X) {
  const S = HX.sch.get(schicht); if (!S) return Promise.resolve(null);
  if (S.wRe) hxWStop(S, true);   // (step 2a: its living passes no longer render)
  const L = HX.loops.get(S.loop); if (L) L.sch = L.sch.filter((id) => id !== schicht);
  hxCount();
  return new Promise((res) => { HX.wait.set('s' + schicht, res); if (!hxPost({ undo: { schicht, f: hxAt(at), X: X != null ? Math.round(X * SR) : undefined } })) { HX.wait.delete('s' + schicht); res(null); } });
}
function hxClear(loop, at, X) {
  const all = loop === 'all', ids = all ? [...HX.loops.keys()] : [loop];
  const ps = ids.map((id) => new Promise((res) => HX.wait.set('l' + id, res)));
  for (const id of ids) { const L = HX.loops.get(id); if (L) { L.state = 'weg'; for (const sid of L.sch) { const S = HX.sch.get(sid); if (S && S.wRe) hxWStop(S, true); } } }   // (step 2a: its living passes no longer render)
  hxCount();
  if (!hxPost({ clear: { loop: all ? null : loop, all, f: hxAt(at), X: X != null ? Math.round(X * SR) : undefined } })) { for (const id of ids) { HX.wait.delete('l' + id); HX.loops.delete(id); } return Promise.resolve([]); }
  if (all || [...HX.loops.values()].every((L) => L.state === 'weg')) hxTempoFree();   // the last Schleife gone: the tempo goes back to the slider
  return Promise.all(ps);
}
// Taumeln compensation, MIDI clock nachführen (SPEC §9): the loop read faster or slower by `cents` (±20), resampled
function hxRate(loop, cents) { const L = HX.loops.get(loop); if (!L) return false; L.rate = +cents || 0; hxCount(); return hxPost({ rate: { loop, cents: L.rate } }); }
// what plays, for the budget – one loop's parts (Leistung, 23.10.2026: the same count per loop, for the card and
// „Leistung messen“; a loop that does not play costs nothing – the processor reads nothing of it)
function hxCountL(L, bpm, dr) {
  const o = { p: 0, r: 0, o1: 0, ws: 0, bd: 0, sl: 0, ab: 0 };
  if (L.state !== 'spielt') return o;
  let g = 0;   // (step 1d: the reads of a loop at one rate are resampled once per output – a de-drifted Schicht, or the loop's own rate; one still read against its own drift alone)
  for (const id of L.sch) {
    o.p++; const S = HX.sch.get(id); if (!S) continue;
    if (S.out) o.o1 = 1;
    const tau = dr && S.dr && hxTauOn(L);
    if (!(L.rate || S.rc || tau)) continue;
    if (!tau || S.ddOn) g |= 1 << (S.out ? 1 : 0); else o.r++;
  }
  o.r += (g & 1) + (g >> 1);
  if (hxEigN(L) >= 1) for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.wLive) o.ws++; }   // (step 2a: the living Schichten's streams)
  // (step 2b) the tape: a loop at another speed reads through the wider kernel (once per output, as its rate's resampling);
  // a Schicht in slices (Schnitt at another tempo, Auslassen, Würfeln) reads each slice on its own; a worn one is filtered
  if (!L.bew) {
    const sp = L.sp || 1, n = L.sch.length;
    if (sp !== 1) o.bd = sp > 1.6 ? HX_COST.k24 : sp > 1.03 ? HX_COST.k16 : HX_COST.rs;
    else if ((L.slc && (L.slc.pd > 0 || L.slc.pw > 0)) || (L.ladung && L.ladQ > 0 && !hxWAktiv(L)) || (typeof hxSchnitt === 'function' && hxSchnitt(L) && hxTakt(L) && L.bpm && Math.abs(bpm / L.bpm - 1) > 1e-4)) o.sl = n;   // (step 4: Ladung's slices)
    if (L.ab && L.ab.rate > 0) o.ab = n;
  }
  return o;
}
const hxCostL = (o) => o.p * HX_COST.schicht + o.r * HX_COST.rs + o.ws * HX_COST.stream + o.bd + o.sl * HX_COST.slice + o.ab * HX_COST.abr;
// one loop's share of the budget (units), as hxCount counts it
function hxCostOf(L) { return hxCostL(hxCountL(L, A.ctx ? tgBpm(hxNowT()) : 0, A.ctx && P['mov.drift'] > 0)); }
function hxCount() {
  let p = 0, r = 0, o1 = 0, ws = 0, bd = 0, sl = 0, ab = 0;
  const dr = A.ctx && P['mov.drift'] > 0, bpm = A.ctx ? tgBpm(hxNowT()) : 0;   // (Taumeln resamples while there is a drift to follow)
  for (const L of HX.loops.values()) { const o = hxCountL(L, bpm, dr); p += o.p; r += o.r; o1 |= o.o1; ws += o.ws; bd += o.bd; sl += o.sl; ab += o.ab; }
  let acN = 0; for (const L of HX.loops.values()) if (L.acc && L.acc.on && L.state !== 'weg') acN++;   // (step 4: a Sammelschleife records every frame, playing or not)
  HX.play = p; HX.rs = r; HX.o1 = o1; HX.dd = HX.ddRun.size ? 1 : 0; HX.ws = ws; HX.bd = bd; HX.sl = sl; HX.ab = ab; HX.acN = acN;   // (one de-drift job works at a time, the others wait)
}
const hxLoad = () => (HX.node ? (hxCount(), 0) + HX_COST.capture + HX.play * HX_COST.schicht + HX.rs * HX_COST.rs + HX.dd * HX_COST.dd + (HX.o1 ? HX_COST.fx1 : 0) + (HX.ws || 0) * HX_COST.stream + (HX.bd || 0) + (HX.sl || 0) * HX_COST.slice + (HX.ab || 0) * HX_COST.abr + hxWebsCost() + hxFeedCost() + (HX.acN || 0) * HX_COST.acc + (HX.mic && HX.mic.on ? HX_COST.mic : 0) : 0);   // (step 4: the Höfe of Glut and Sehne, the Sammelschleifen's recording, the Mikro's ring)   // (step 2b: the tape's speed, slices, wear)   // (step 1d: each loop's own web, GSP_COST, while it rings)   // (fx1: the live chain's copy while a dry Schicht plays through it)
const hxBusy = () => [...HX.loops.values()].some((L) => L.state === 'spielt');
// Stille: every Schleife halts (its buffers stay); the grammar's toast and „Weiter“ come with the Ringleiste
function hxPanic() { return hxStille(); }

