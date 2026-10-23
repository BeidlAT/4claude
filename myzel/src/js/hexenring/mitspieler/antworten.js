// ---- Antworten (SPEC §12.3): the Ohr learns tokens (degree step, duration class, metric class) from everything the
// player plays this session; a variable-order Markov model (orders 1–4, a contour fallback) and beam search write an answer
// as long as the call (±1 bar), from the next beat, ending on a stable degree on a strong beat, never more than six
// tokens copied in a row. Silent below 40 notes (or with the Handschrift's). It yields when the player plays again: the
// sounding note rings out, no new one starts. Real voices (the field's sound, layer 2 or a melody loop's), into the
// Hexenring's strip through the chain's copy – no tap hears them ----
const HXA = { notes: [], tok: [], c: new Map(), sc: new Map(), g7: new Set(), lastId: 0, ph: null, cur: null, n: 0, hsN: 0, t: 0 };
const HX_DC = [0.25, 0.5, 1, 2, 3];   // (a duration class's beats)
const hxDcOf = (ioi) => (ioi <= 0.35 ? 0 : ioi <= 0.7 ? 1 : ioi <= 1.4 ? 2 : ioi <= 2.5 ? 3 : 4);
const hxMcOf = (b) => { const m = hxVMet(b, 4); return m >= 0.9 ? 0 : m >= 0.7 ? 1 : m >= 0.5 ? 2 : 3; };
const hxScPer = () => (N.free ? 12 : Math.max(1, Math.round((N.notes.length - 1) / Math.max(1, P['t.range']))));
// a scale index of the field → its pitch (beyond the field's notes by octaves)
function hxIdxF(I) { const per = hxScPer(); if (N.free) return N.base * ratioForSemi(I); if (I >= 0 && I < N.notes.length) return N.notes[I].f; const d = ((I % per) + per) % per, o = Math.floor(I / per); return N.notes[d].f * Math.pow(2, o); }
// stable degrees: the root, the fifth and the third where the scale has them
function hxStable(I) { const per = hxScPer(), d = ((I % per) + per) % per; if (N.free) return [0, 3, 4, 7].includes(d); if (d === 0) return true; const s = N.notes[d] ? N.notes[d].semi : null; return s != null && [3, 4, 7].some((x) => Math.abs(s - x) < 0.3); }
function hxAntCount(map, ctx, tok, k) { let m = map.get(ctx); if (!m) map.set(ctx, (m = new Map())); m.set(tok, (m.get(tok) || 0) + (k || 1)); }
function hxAntLearn(tok) {
  const T = HXA.tok; T.push(tok);
  for (let o = 0; o <= 4 && o < T.length; o++) { const ctx = T.slice(T.length - 1 - o, T.length - 1).join('|'); hxAntCount(HXA.c, ctx, tok); hxAntCount(HXA.sc, ctx, tok); }
  if (T.length >= 7) HXA.g7.add(T.slice(-7).join('|'));
  if (T.length > 6000) T.splice(0, 1000);
  HXA.n++;
}
// the Ohr's side: new notes of the player into the corpus (a chord's top note is the line), the phrase, the yielding
function hxAntIngest(now) {
  // (the ring's new slots only, from where the last look stopped – never a scan of the whole Humus: this runs ten times
  // a second beside the live playing)
  if (HXA.evI == null) HXA.evI = HX.evI;
  const evs = [];
  while (HXA.evI !== HX.evI) { const e = HX.ev[HXA.evI]; HXA.evI = (HXA.evI + 1) % HX_EV; if (e && e.t0 != null && e.id > HXA.lastId && !e.probe && e.src !== 'bor' && hxSrcIn(e.src, 0)) evs.push(e); }
  const g = hxGrid();
  for (const e of evs) {
    HXA.lastId = Math.max(HXA.lastId, e.id);
    if (e.deg == null) continue;
    const per = hxScPer(), I = e.oct * per + e.deg, b = g ? tgBeat(e.t0) : e.t0 * 2, prv = HXA.notes[HXA.notes.length - 1];
    if (prv && Math.abs(e.t0 - prv.t) < 0.03) { if (I > prv.I) { prv.I = I; prv.f = e.f; } prv.poly = (prv.poly || 1) + 1; continue; }
    const x = { t: e.t0, b, I, f: e.f, vel: e.vel, y: e.y0, eng: e.eng, g };
    if (prv && e.t0 - prv.t < 8) { const ioi = g && prv.g ? b - prv.b : (e.t0 - prv.t) * 2; hxAntLearn(clamp(I - prv.I, -7, 7) + ':' + hxDcOf(ioi) + ':' + (g ? hxMcOf(b) : 0)); x.tok = HXA.tok[HXA.tok.length - 1]; }
    HXA.notes.push(x); if (HXA.notes.length > 2000) HXA.notes.splice(0, 500);
    // the phrase: a new one after a rest; a note while an answer plays – it yields
    if (!HXA.ph || e.t0 - HXA.ph.last > Math.max(0.3, 2 * (HXA.ph.mi || 0.5)) + 0.25) HXA.ph = { t0: e.t0, notes: [], last: e.t0, mi: 0.5, id: e.id, done: false };
    const P0 = HXA.ph; P0.notes.push(x); P0.last = e.t0; if (P0.notes.length > 1) { const io = []; for (let i = 1; i < P0.notes.length; i++) io.push(P0.notes[i].t - P0.notes[i - 1].t); io.sort((a, b) => a - b); P0.mi = io[io.length >> 1]; }
    if (HXA.cur && !HXA.cur.stop && e.t0 >= HXA.cur.t0 - 0.05) hxAntStop('du spielst');
  }
}
// the next tokens after a context: every order that knows it, mixed – the longer the more weight (a player who repeats
// himself leaves one continuation at order 4; the shorter orders keep other ways open, and MaxOrder needs them)
const HX_AW = [0.04, 0.08, 0.16, 0.3, 0.42];
function hxAntDist(ctx) {
  const p = new Map(); let wt = 0, top = -1;
  for (let o = Math.min(4, ctx.length); o >= 0; o--) {
    const m = HXA.c.get(ctx.slice(ctx.length - o).join('|')); if (!m || !m.size) continue;
    let s = 0; for (const v of m.values()) s += v;
    wt += HX_AW[o]; if (top < 0) top = o;
    for (const [k, v] of m) p.set(k, (p.get(k) || 0) + (HX_AW[o] * v) / s);
  }
  return wt ? [...p.entries()].map(([k, v]) => [k, v / wt, top]) : [];
}
// the answer: notes {b (beats from its start), I, d, vel} – o: {call (the phrase's notes), seed, lenB, b0 (the start's beat,
// a musical beat or a pseudo one), strong(b)}
function hxAntGen(o) {
  const R = hxRng(o.seed), call = o.call, per = hxScPer(), ids = call.map((x) => x.I), lo = Math.min(...ids) - Math.ceil(per / 2), hi = Math.max(...ids) + Math.ceil(per / 2);
  const ctx0 = call.map((x) => x.tok).filter(Boolean).slice(-4), lenB = Math.max(1, o.lenB), W = 8;
  let beams = [{ toks: ctx0.slice(), all: ctx0.slice(-6), gen: [], I: ids[ids.length - 1], b: 0, lp: 0 }];
  const done = [];
  for (let step = 0; step < 48 && beams.length; step++) {
    const next = [];
    for (const B of beams) {
      const dist = hxAntDist(B.toks).map(([k, p, ord]) => [k, p, ord, R()]).sort((a, b) => b[1] * (0.75 + 0.5 * b[3]) - a[1] * (0.75 + 0.5 * a[3])).slice(0, 6);
      for (const [tok, p] of dist) {
        const [iv, dc, mc] = tok.split(':').map(Number), first = !B.gen.length;
        let ioi = first ? 0 : HX_DC[dc];
        if (!first) for (const c of [ioi, ioi / 2, ioi * 2]) if (hxMcOf(o.b0 + B.b + c) === mc) { ioi = c; break; }
        const nb = B.b + ioi, I = B.I + iv;
        if (I < lo || I > hi || nb > lenB + 4 + 1e-6) continue;
        const all = B.all.concat([tok]);
        if (all.length >= 7 && HXA.g7.has(all.slice(-7).join('|'))) continue;   // (MaxOrder: never seven tokens as they were played)
        const C = { toks: B.toks.concat([tok]).slice(-4), all: all.slice(-7), gen: B.gen.concat([{ b: nb, I }]), I, b: nb, lp: B.lp + Math.log(Math.max(1e-6, p)) };
        if (nb >= lenB - 4 - 1e-6 && C.gen.length >= 2 && hxStable(I) && o.strong(o.b0 + nb)) done.push(Object.assign(C, { sc: C.lp / C.gen.length + 2 - 0.25 * Math.abs(nb - lenB) / 4 - 0.6 * Math.abs(C.gen.length - call.length) / call.length }));   // (about as many notes as the call)
        else next.push(C);
      }
    }
    beams = next.map((C) => [C, C.lp / C.gen.length + 0.05 * R()]).sort((a, b) => b[1] - a[1]).slice(0, W).map((x) => x[0]);
    if (done.length >= W) break;
  }
  let best = done.sort((a, b) => b.sc - a.sc)[0];
  if (!best) {   // (no ending found: the best line, closed on the nearest stable degree at the next strong beat)
    const B = beams[0] || { gen: [], I: ids[ids.length - 1], b: -1 };
    let b = Math.max(0, Math.ceil(B.b + 0.5)); while (!o.strong(o.b0 + b) && b < B.b + 8) b++;
    let I = B.I; for (let s = 0; s <= per && !hxStable(I); s++) { if (hxStable(B.I - s)) { I = B.I - s; break; } if (hxStable(B.I + s)) { I = B.I + s; break; } }
    best = { gen: B.gen.concat([{ b, I }]) };
  }
  const g = best.gen, vel = call.reduce((a, x) => a + (x.vel || 0.6), 0) / call.length;
  return g.map((x, i) => ({ b: x.b, I: x.I, d: i + 1 < g.length ? clamp((g[i + 1].b - x.b) * 0.9, 0.2, 2) : 1.5, vel: clamp(vel * (i === g.length - 1 ? 0.9 : 0.8 + 0.2 * R()), 0.15, 1) }));
}
// the voice of an answer: the field's sound, its layer 2, or the newest melody loop's
function hxAntVoice() {
  const s = P['hx.gStimme'];
  if (s === 'ebene' && P['v.layer'] && P['v.layer'] !== 'off' && ENGINES[P['v.layer']]) return { eng: P['v.layer'] };
  if (s === 'schleife') { const L = hxLoopsLive().filter((X) => !X.bew && (hxRoleOf(X) || {}).role === 'melodie').sort((a, b) => b.made - a.made)[0]; if (L && ENGINES[L.eng]) return { eng: L.eng, loop: L.key }; }
  return { eng: P['v.eng'] };
}
const hxAntOn = () => !!(HXA.cur && !HXA.cur.stop);
// after a phrase: is it time to answer?
function hxAntMaybe(now) {
  const F = HXA.ph;
  if (!F || F.done || HXA.cur || hxGdStep() < 2 || !P['hx.gAntw'] || HX.rec || HX.punch) return;
  const gap = now - F.last;
  if (gap < Math.max(0.3, 2 * F.mi)) return;
  // LBDM-style: the rest after the last note against the phrase's own pace, a held or louder end
  const s = gap / (gap + F.mi);
  if (s < 0.6 || F.notes.length < 3) { if (gap > 6) F.done = true; return; }
  if (hxNotes(now - 8, now + 0.01, 0, true).some((e) => e.src !== 'bor' && e.hold && e.t1 == null)) return;   // (a note still held: the phrase has not ended)
  F.done = true;
  if (HXA.n + HXA.hsN < 40) { hxSay('Gärtner hört zu – noch zu wenig Material zum Antworten'); return; }
  hxAntStart(F, now);
}
function hxAntStart(F, now) {
  const g = hxGrid(), call = F.notes.filter((x) => x.I != null);
  if (call.length < 3) return null;
  const beatS = g ? 60 / tgBpm(now) : clamp(F.mi, 0.2, 1), callB = g ? call[call.length - 1].b - call[0].b + 1 : (call[call.length - 1].t - call[0].t) / beatS + 1;
  const tS = g ? tgTime(Math.ceil(tgBeat(now + 0.15) - 1e-9)) : now + 0.3, b0 = g ? Math.round(tgBeat(tS)) : 0;
  const strong = (b) => hxVMet(b, 4) >= 0.7, seed = (F.id * 2654435761) >>> 0;
  const gen = hxAntGen({ call: call.map((x) => Object.assign({}, x)), seed, lenB: Math.round(callB), b0, strong });
  if (!gen.length) return null;
  const V = hxAntVoice(), y = call.reduce((a, x) => a + (x.y != null ? x.y : 0.5), 0) / call.length;
  const at = (b) => (g ? tgTime(b0 + b) : tS + b * beatS);
  const notes = gen.map((x) => ({ t: at(x.b), t1: at(x.b + x.d), f: hxIdxF(x.I), I: x.I, vel: x.vel, y, eng: V.eng, done: false }));
  HXA.cur = { notes, i: 0, t0: tS, end: notes[notes.length - 1].t1 + 0.5, stop: false, loop: V.loop || null, eng: V.eng, n: notes.length, call: call.length };
  HXA.last = HXA.cur;
  hxWakeRing();
  for (const [i, x] of notes.entries()) hxKnAdd('ant:' + F.id + ':' + i, x.f, x.t, Math.max(now, x.t - hxGdBarLen()), 'ant', i ? 'ant:' + F.id + ':' + (i - 1) : null);
  if (!HX.chips) HX.chips = { kind: 'ant', until: performance.now() + (HXA.cur.end - now + 1) * 1000 };
  hxSay('Gärtner antwortet: ' + notes.length + ' Töne'); hxRailDirty();
  return HXA.cur;
}
function hxAntStop(why) {
  const C = HXA.cur; if (!C || C.stop) return;
  C.stop = true; for (const [k, b] of HX.kn) if (b.kind === 'ant' && b.t > hxNowT()) HX.kn.delete(k);
  if (HX.chips && HX.chips.kind === 'ant') HX.chips = null;
  if (why) hxSay('Antwort endet – ' + why);
  hxRailDirty();
}
// the answer's notes, scheduled ahead as the Puls's are (real voices, a loop's: they give way before any live note)
function hxAntPlay(now, horizon) {
  const C = HXA.cur; if (!C) return;
  if (C.stop || now > C.end) { if (now > C.end) { HXA.cur = null; if (HX.chips && HX.chips.kind === 'ant') HX.chips = null; hxRailDirty(); } else if (C.stop) HXA.cur = null; return; }
  while (C.i < C.notes.length && C.notes[C.i].t < horizon) {
    const n = C.notes[C.i++]; if (n.t < now - 0.01) continue;
    const E = ENGINES[n.eng]; if (!E) continue;
    hxOut1();
    const o = { pan: 0, bus: hxChain('fx1').in, loop: true, hxSrc: 'hxr' }, gate = Math.max(0.05, n.t1 - n.t);
    n.v = E.sustain ? playNote(n.eng, n.t, n.f, n.y, n.vel, Object.assign(o, { burst: true, gate })) : hit(n.eng, n.t, n.f, n.y, n.vel, o);
  }
}
// Ruhe: the Hexenring's way to the master open before an answer sounds (no Schleife may exist)
function hxWakeRing() { if (IDLE.on) idleWake(); if (IDLE.hxOff) hxGates(true); IDLE.hxT = null; }

