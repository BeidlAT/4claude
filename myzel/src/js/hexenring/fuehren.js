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
  if (!L.fuehr) hxFuCommit(L);   // (what was led stays – fuKeep)
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
// a led Schicht, note by note – only a moment ahead (HX_FU_LA: the hand is heard in the very next note; owner, 31.10.2026:
// „es ist leider laggy“ – before, the whole scheduler horizon), a note a tick came late for played at once
const HX_FU_LA = 0.05;
function hxFuSched(L, S, now, horizon, out) {
  const fA = hxF(now + 0.005), lead = hxFuLead(), m = L.fuehr, lim = Math.min(horizon, now + HX_FU_LA);
  const pitch = m === 'ton' || m === 'beides', expr = m === 'klang' || m === 'beides';
  if (!S.fu) S.fu = { k: S.lk, job: null, i: 0, t0: 0 };
  const F = S.fu;
  for (let g = 0; g < 4; g++) {
    if (!F.job) {
      const k = Math.max(F.k + 1, hxPassK(L, Math.round(fA)));
      if (hxT(hxPassF(L, k)) >= lim) return;
      const job = hxWPass(L, S, k, { live: hxEigN(L) >= 1, tail: 0 }); if (!job) return;
      const b = hxT(hxPassF(L, k + 1));
      F.k = k; S.lk = k; F.job = job; F.i = 0; F.t0 = hxT(hxPassF(L, k)); F.rec = []; F.led = false; F.full = F.t0 >= now - 0.03;
      F.takt = !!(S.wn && S.wn.u === 'b'); F.b0 = F.takt ? tgBeat(F.t0) : 0; const pu = F.takt ? tgBeat(b) - F.b0 : b - F.t0; F.sc = pu > 0 && S.wn ? S.wn.len / pu : 1;
    }
    const ns = F.job.notes;
    while (F.i < ns.length) {
      const n = ns[F.i]; let t = F.t0 + n.t0;
      if (t >= lim) return;
      F.i++;
      if (n.eng === 'bor') continue;
      if (t < now) { if (t < now - 0.03) { F.full = false; continue; } t = now; }   // (a tick late by a hair: at once)
      if (m === 'ausl' && !lead) continue;
      if (lead) F.led = true;
      const eng = expr && ENGINES[P['v.eng']] ? P['v.eng'] : n.eng, E = ENGINES[eng]; if (!E) continue;
      const r = pitch && lead ? hxFuMove(L, S, n.f, lead) / n.f : 1, f = n.f * r;
      const y = expr && lead ? lead.y : n.y0 != null ? n.y0 : 0.5;
      const vel = lead && (m === 'ausl' || expr) ? clamp(n.vel * lead.vel / Math.max(0.05, P['v.vel']), 0.02, 1) : n.vel;
      // (owner, 31.10.2026: „der Sound hat Probleme“ – the budget full, a loop's voice gives way first and a loop's note that
      // does not fit is dropped) a led note is the player's own playing: it takes its place as a live note does
      const o = { pan: n.pan || 0, bus: out(), hxSrc: 'hxr', amp: n.amp };
      const gt = n.t1 != null ? n.t1 - n.t0 : E.sustain ? Math.max(0.05, F.t0 + F.job.len - t) : null;   // (a held note without an end: at the pass's)
      const v = n.burst || (E.sustain && gt != null) ? playNote(eng, t, f, y, vel, Object.assign(o, { burst: true, gate: n.burst ? n.gate || 0.22 : gt })) : E.sustain ? playNote(eng, t, f, y, vel, o) : hit(eng, t, f, y, vel, o);
      HX.fuLog.push({ loop: L.id, t, f, nf: n.f, eng, vel, y, m }); if (HX.fuLog.length > 64) HX.fuLog.shift();
      const rn = hxFuNote(F, t, gt, n, eng, f, y, vel, !expr, r); F.rec.push(rn);
      if (!v) continue;
      if (!expr) for (const [tc, yy] of n.curves.y) HX.wLq.push([F.t0 + tc, () => v.alive && v.setY && v.setY(yy)]);
      for (const [tc, ff] of n.curves.f) HX.wLq.push([F.t0 + tc, () => v.alive && v.setF && v.setF(ff * (v.fuR || r), P['v.glide'])]);
      if (gt == null || gt > 0.08) { (S.fuVs || (S.fuVs = [])).push({ v, nf: n.f, r, y, pitch, expr, rn, u: { takt: F.takt, b0: F.b0, t0: F.t0, sc: F.sc } }); v.fuR = r; }
    }
    F.job = null;
    // (owner, 31.10.2026: „das, was man unter Führen eingespielt hat, ist beim nächsten Start verschwunden – die Schleife muss
    // gesichert werden, der neue Klang zu 100 % erhalten“) a whole pass the hand led: kept as the loop's notes to be (stored
    // with it at once) – laid in when Führen ends, or at the next start
    if (F.led && F.full && F.rec.length) hxFuKeep(L, S, F.rec);
  }
}
// a played note in the record's units (beats of the pass, or seconds) – its pitch, sound and expression as heard
function hxFuNote(F, t, gt, n, eng, f, y, vel, curvesY, r) {
  const u = (tt) => (F.takt ? tgBeat(tt) - F.b0 : tt - F.t0) * F.sc, t0 = u(t), d = hxDeg(f);
  return { t: Math.max(0, t0), held: false, d: gt != null ? Math.max(0.01, u(t + gt) - t0) : null, eng, f, deg: d.deg, oct: d.oct, alt: d.alt, y0: y, vel, pan: n.pan || 0, amp: n.amp, src: n.src || 'fin', burst: n.burst, gate: n.gate, hold: n.hold,
    cy: curvesY ? (n.curves.y || []).map(([tc, yy]) => [u(F.t0 + tc) - t0, yy]) : [], cf: (n.curves.f || []).map(([tc, ff]) => [u(F.t0 + tc) - t0, ff * r]) };
}
function hxFuKeep(L, S, rec) {
  const W = S.wn; if (!W) return;
  const k = { base: N.base, ...hxWScale(P['t.root'], P['t.scale']) };
  L.wwhy = Object.assign({}, L.wwhy || {}, { fuKeep: { sk: S.key, wn: Object.assign({}, W, { n: rec.slice().sort((a, b) => a.t - b.t), key: k, lanes: [] }) } });
  hxSaveMeta(L.id);
}
// the kept pass laid in: its notes become the loop's, it grows from them (Treu – the same throw, so it sounds as led);
// one step for ↶
function hxFuCommit(L) {
  const K = L && L.wwhy && L.wwhy.fuKeep; if (!K) return false;
  const S = hxSchByKey(K.sk); const ww0 = Object.assign({}, L.wwhy); delete ww0.fuKeep;
  if (!S || !S.wn || !HX.node) return false;   // (a reload: its Schicht not back yet – the next tick)
  const lk = L.key, sk = S.key, was = { wn: S.wn, klang: L.klang, eig: L.eig, ww: Object.assign({}, ww0) }, to = { wn: K.wn, klang: 'eigen', eig: 'treu', ww: Object.assign({}, ww0, { wahl: true, abdr: false, erst: false }) };
  const put = (X, s) => { const S2 = hxSchByKey(sk); if (!S2) return; S2.wn = s.wn; S2.wnT = null; X.klang = s.klang; if (X.eig !== s.eig) hxEigSet(X, s.eig); X.wwhy = Object.assign({}, s.ww); hxWUpdate(X); hxSaveMeta(X.id); hxCardDirty(); hxRailDirty(); };
  put(L, to);
  hxHist({ kind: 'wuchs', label: 'Geführt übernommen (' + hxName(L) + ')', undo() { const X = hxByKey(lk); if (X) put(X, was); }, redo() { const X = hxByKey(lk); if (X) put(X, to); } });
  hxSay(hxName(L) + ': das Geführte bleibt');
  return true;
}
// held voices of a led loop follow the hand: its expression, and – Tonhöhe – its pitch (they glide to the new note)
function hxFuFollow() {
  const lead = hxFuLead();
  for (const L of hxLoopsLive()) {
    if (!L.fuehr && L.wwhy && L.wwhy.fuKeep) hxFuCommit(L);   // (a reload: what was led last time is laid in)
    for (const id of L.sch) {
      const S = HX.sch.get(id); if (!S || !S.fuVs) continue;
      S.fuVs = S.fuVs.filter((x) => x.v.alive);
      for (const x of S.fuVs) {
        const at = () => ((x.u.takt ? tgBeat(hxNowT()) - x.u.b0 : hxNowT() - x.u.t0) * x.u.sc) - x.rn.t;   // (what the hand does to a held note goes into the record too)
        if (x.expr && lead && x.v.setY && Math.abs(lead.y - x.y) > 0.002) { x.y = lead.y; x.v.setY(lead.y); if (x.rn.cy.length < 400) x.rn.cy.push([at(), lead.y]); }
        if (x.pitch && L.fuehr && x.v.setF) { const r2 = lead ? hxFuMove(L, S, x.nf, lead) / x.nf : 1; if (Math.abs(r2 / x.r - 1) > 1e-4) { x.r = r2; x.v.fuR = r2; x.v.setF(x.nf * r2, 0.03); if (x.rn.cf.length < 400) x.rn.cf.push([at(), x.nf * r2]); } }
      }
    }
  }
}
