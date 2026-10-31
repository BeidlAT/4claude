// ---- Führen (owner, 31.10.2026: „das, was ich spiele, erklingt dann in der Schleife – aber ihre MIDI-Noten bleiben als
// Basis“; asked which way: „alle vier Optionen sind in Myzel verfügbar zum Einstellen“) ----
// A Schleife with notes that is led plays them live (real voices, note by note just ahead – as Live does it, but one note
// at a time, so a hand on the field is heard in the very next note), and what is played on the field (the screen, a key,
// the Touché) leads them:
//   ton      Tonhöhe führt – the note held transposes its melody: its first note becomes the one played, every other one
//            moves with it in the key (scale steps; free tuning: semitones); let go and it plays where it was
//   klang    Klang & Ausdruck – its notes sound with the field's instrument and the hand's expression: Höhe/brightness,
//            pressure, the velocity of the key; held voices follow the hand as it moves
//   ausl     Auslösen – it sounds only while a hand is on the field (or a key held), at that hand's strength
//   beides   Tonhöhe + Ausdruck
// With „Spielfeld stumm“ (on by default) the field's own notes are silent while they lead – they sound in the Schleife.
const HX_FU = [['ton', 'Tonhöhe'], ['klang', 'Klang & Ausdruck'], ['ausl', 'Auslösen'], ['beides', 'Tonhöhe + Ausdruck']];
const HX_FUW = Object.fromEntries(HX_FU);
HX.fuLog = [];   // (the last notes a led loop played – what the tests read)
const hxFuCan = (L) => !!L && !L.bew && L.state !== 'weg' && L.sch.some((id) => hxWCan(HX.sch.get(id)));
const hxFuOn = (L) => !!(L && L.fuehr && hxFuCan(L));
function hxFuSet(L, mode) {
  if (!L) return;
  if (mode && !hxFuCan(L)) { hxHint(hxName(L) + ' hat keine Noten – führen lässt sich nur eine Schleife aus gespielten Noten.'); return; }
  L.fuehr = mode || null; if (L.fuStumm == null) L.fuStumm = true;
  for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.fu) { S.lk = Math.max(S.lk, S.fu.k); S.fu = null; } }
  if (!L.fuehr) hxWUpdate(L); else hxWLiveSync(L);
  hxSay(hxName(L) + (L.fuehr ? ': geführt – ' + HX_FUW[L.fuehr] : ': nicht mehr geführt'));
  hxCardDirty(); hxRailDirty();
}
// the field's leading hand: the newest note held (screen, key, Touché) – its pitch index, frequency, expression, strength
function hxFuLead() {
  let tt = null; for (const x of touches.values()) if (!tt || x.t0 > tt.t0) tt = x;
  if (!tt) return null;
  return { f: tt.f, idx: tt.col, y: tt.my != null ? tt.my : tt.y, vel: tt.vel != null ? tt.vel : P['v.vel'] };
}
// a frequency's scale step (degNote's index), the nearest
function hxFuIdx(f) {
  const sc = SCALES[P['t.scale']] || SCALES.mpent, per = sc.r ? sc.r.length : sc.s.length;
  let d = Math.round(Math.log2(Math.max(1e-6, f) / N.base) * per), best = d, bd = Infinity;
  for (let i = d - 3; i <= d + 3; i++) { const e = Math.abs(Math.log2(degNote(i).f / f)); if (e < bd) { bd = e; best = i; } }
  return best;
}
// a note moved by the steps from the loop's first note to the hand's
function hxFuMove(L, S, f, lead) {
  const W = S.wn, ref = W && W.n.length ? W.n.reduce((a, x) => (x.t < a.t ? x : a), W.n[0]).f : f;
  if (N.free) return f * lead.f / ref;
  const sh = lead.idx - hxFuIdx(ref), i = hxFuIdx(f);
  return f * degNote(i + sh).f / degNote(i).f;
}
// the field's own notes are silent while a loop that keeps them silent is led (play/touch.js asks)
function hxFuTake(tt) {
  if (!hxLoopsLive().some((L) => hxFuOn(L) && L.fuStumm !== false && L.state === 'spielt')) return false;
  tt.fu = true; return true;
}
// a led Schicht, note by note up to the horizon (hxWLiveTick hands it here)
function hxFuSched(L, S, now, horizon, out) {
  const fA = hxF(now + 0.005), lead = hxFuLead(), m = L.fuehr;
  const pitch = m === 'ton' || m === 'beides', expr = m === 'klang' || m === 'beides';
  if (!S.fu) S.fu = { k: S.lk, job: null, i: 0, t0: 0 };
  const F = S.fu;
  for (let g = 0; g < 4; g++) {
    if (!F.job) {
      const k = Math.max(F.k + 1, hxPassK(L, Math.round(fA)));
      if (hxT(hxPassF(L, k)) >= horizon) return;
      const job = hxWPass(L, S, k, { live: hxEigN(L) >= 1, tail: 0 }); if (!job) return;
      F.k = k; S.lk = k; F.job = job; F.i = 0; F.t0 = hxT(hxPassF(L, k));
    }
    const ns = F.job.notes;
    while (F.i < ns.length) {
      const n = ns[F.i], t = F.t0 + n.t0;
      if (t >= horizon) return;
      F.i++;
      if (t < now || n.eng === 'bor') continue;
      if (m === 'ausl' && !lead) continue;
      const eng = expr && ENGINES[P['v.eng']] ? P['v.eng'] : n.eng, E = ENGINES[eng]; if (!E) continue;
      const r = pitch && lead ? hxFuMove(L, S, n.f, lead) / n.f : 1, f = n.f * r;
      const y = expr && lead ? lead.y : n.y0 != null ? n.y0 : 0.5;
      const vel = lead && (m === 'ausl' || expr) ? clamp(n.vel * lead.vel / Math.max(0.05, P['v.vel']), 0.02, 1) : n.vel;
      const o = { pan: n.pan || 0, bus: out(), loop: true, hxSrc: 'hxr', amp: n.amp };
      const gt = n.t1 != null ? n.t1 - n.t0 : null;
      const v = n.burst || (E.sustain && gt != null) ? playNote(eng, t, f, y, vel, Object.assign(o, { burst: true, gate: n.burst ? n.gate || 0.22 : gt })) : E.sustain ? playNote(eng, t, f, y, vel, o) : hit(eng, t, f, y, vel, o);
      HX.fuLog.push({ loop: L.id, t, f, nf: n.f, eng, vel, y, m }); if (HX.fuLog.length > 64) HX.fuLog.shift();
      if (!v) continue;
      if (!expr) for (const [tc, yy] of n.curves.y) HX.wLq.push([F.t0 + tc, () => v.alive && v.setY && v.setY(yy)]);
      for (const [tc, ff] of n.curves.f) HX.wLq.push([F.t0 + tc, () => v.alive && v.setF && v.setF(ff * r, P['v.glide'])]);
      if (expr && v.setY) (S.fuVs || (S.fuVs = [])).push(v);
    }
    F.job = null;
  }
}
// held voices of a led loop follow the hand's expression as it moves
function hxFuFollow() {
  const lead = hxFuLead(); if (!lead) return;
  for (const L of hxLoopsLive()) for (const id of L.sch) { const S = HX.sch.get(id); if (!S || !S.fuVs) continue; S.fuVs = S.fuVs.filter((v) => v.alive); for (const v of S.fuVs) v.setY(lead.y); }
}
