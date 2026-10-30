/* ---------- voice allocation ---------- */
// Steal the voice that has faded furthest: released voices by the share of their release already elapsed,
// held voices only when nothing is releasing (oldest first). soft: faded out in ~25 ms (vFade) – kill() can cut a struck
// voice's decay at once, a click (Gestik's rain and rattle make room this way).
// (owner, 30.10.2026: Ebenen) the layers of one note go together: the voice chosen takes the other voices of its strike
// (v.grp) with it – never those of the note being made (keep), whose layers would otherwise take each other's room.
function steal(fadingOnly, soft, loopOnly, keep) {
  const now = A.ctx.currentTime;
  let best = null, bestScore = -Infinity;
  for (const v of A.voices) {
    let score;
    if (loopOnly && !v.loop) continue;   // Hexenring: (step 2a) a loop's voice never takes a live one
    if (keep && v.grp === keep) continue;
    if (v.loop) score = 3e6 + (now - v.t0);   // Hexenring: (step 2a, Live mode) the loops' voices give way before any live one
    else if (v.released) {
      const from = v.relAt != null ? v.relAt : v.t0;
      score = 1e6 + (now - from) / Math.max(0.05, v.endAt - from);
    } else if (fadingOnly) continue;
    else score = now - v.t0;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  if (best) {
    const g = best.grp, out = (v) => { if (soft) vFade(v); else v.kill(); A.voices.delete(v); };
    out(best);
    if (g) for (const v of A.voices) if (v.grp === g) out(v);
  }
  return !!best;
}
// (Leistung, 25.10.2026, owner) after the guard lowered the budget: what is over it fades out (vFade, the voice's own
// release) – voices already fading first, then the loops' Live voices, then the oldest held ones, the higher layers
// before the lower (Ebene 8 … 2 before the first). Returns how many
function vShed() {
  let n = 0;
  const ly = new Map(EB.slice(1).map((e) => [stripIn(e.k), 1e6 + (e.n - 2) * 1e5]));
  while (A.voices.size && voiceLoad() > VBUDGET) {
    if (steal(true, true)) { n++; continue; }
    const now = A.ctx.currentTime;
    let best = null, bs = -Infinity;
    for (const v of A.voices) { const sc = (v.loop ? 2e7 : ly.get(v.bus) || 0) + (now - v.t0); if (sc > bs) { bs = sc; best = v; } }
    if (!best) break;
    vFade(best); A.voices.delete(best); n++;
  }
  return n;
}
function voiceLoad() { let c = (A.gsp && A.gsp.active ? A.gsp.cost : 0) + hxLoad() + fxLoad(); for (const v of A.voices) c += v.cost; return c; }   // (Gespinst's web counts while it rings; Hexenring: its processor and Schichten; the mixer's effects – effekt.js)
function playNote(eng, t, f, y, vel, o = {}) {
  if (!A.ctx || !ENGINES[eng]) return null;
  const as = ENGINES[eng].needs ? wkPlays(eng) : eng;   // a worklet engine without its module: its stand-in
  const cost = Q.cost[as] || 1;
  while (A.voices.size && (A.voices.size >= MAXV || voiceLoad() + cost > VBUDGET)) if (!steal(false, false, !!o.loop, o.grp)) { if (o.loop) return null; break; }   // Hexenring: (step 2a) a loop's note that does not fit is not played
  const v = new Voice(eng);
  v.cost = cost; v.bend = o.bend || false; v.as = as; v.bus = o.bus || null; if (o.loop) v.loop = true; if (o.grp) v.grp = o.grp;
  const pan = v.n(PAN(o.pan || 0));
  // (30.10.2026) a layer's soft edge (touch.js ebZone): a gain of its own between the voice and its pan – only when it is
  // not 1, so a note inside every range is the voice as before
  if (o.amp != null && o.amp !== 1) v.out.connect(v.n(G(o.amp))).connect(pan); else v.out.connect(pan);
  pan.connect(o.bus || stripIn('fin'));
  A.voices.add(v);
  try { ENGINES[as].start(v, t, f, clamp(y, 0, 1), vel, o); }
  catch (e) { console.error(e); v.cleanup(); return null; }
  hxNote(v, eng, t, f, y, vel, o);   // Hexenring: the notes Humus
  return v;
}

