/* ---------- voice allocation ---------- */
// Steal the voice that has faded furthest: released voices by the share of their release already elapsed,
// held voices only when nothing is releasing (oldest first). soft: faded out in ~25 ms (vFade) – kill() can cut a struck
// voice's decay at once, a click (Gestik's rain and rattle make room this way).
function steal(fadingOnly, soft, loopOnly) {
  const now = A.ctx.currentTime;
  let best = null, bestScore = -Infinity;
  for (const v of A.voices) {
    let score;
    if (loopOnly && !v.loop) continue;   // Hexenring: (step 2a) a loop's voice never takes a live one
    if (v.loop) score = 3e6 + (now - v.t0);   // Hexenring: (step 2a, Live mode) the loops' voices give way before any live one
    else if (v.released) {
      const from = v.relAt != null ? v.relAt : v.t0;
      score = 1e6 + (now - from) / Math.max(0.05, v.endAt - from);
    } else if (fadingOnly) continue;
    else score = now - v.t0;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  if (best) { if (soft) vFade(best); else best.kill(); A.voices.delete(best); }
  return !!best;
}
function voiceLoad() { let c = (A.gsp && A.gsp.active ? A.gsp.cost : 0) + hxLoad(); for (const v of A.voices) c += v.cost; return c; }   // (Gespinst's web counts while it rings; Hexenring: its processor and Schichten)
function playNote(eng, t, f, y, vel, o = {}) {
  if (!A.ctx || !ENGINES[eng]) return null;
  const as = ENGINES[eng].needs ? wkPlays(eng) : eng;   // a worklet engine without its module: its stand-in
  const cost = Q.cost[as] || 1;
  while (A.voices.size && (A.voices.size >= MAXV || voiceLoad() + cost > VBUDGET)) if (!steal(false, false, !!o.loop)) { if (o.loop) return null; break; }   // Hexenring: (step 2a) a loop's note that does not fit is not played
  const v = new Voice(eng);
  v.cost = cost; v.bend = o.bend || false; v.as = as; if (o.loop) v.loop = true;
  const pan = v.n(PAN(o.pan || 0));
  v.out.connect(pan); pan.connect(o.bus || stripIn('fin'));
  A.voices.add(v);
  try { ENGINES[as].start(v, t, f, clamp(y, 0, 1), vel, o); }
  catch (e) { console.error(e); v.cleanup(); return null; }
  hxNote(v, eng, t, f, y, vel, o);   // Hexenring: the notes Humus
  return v;
}

