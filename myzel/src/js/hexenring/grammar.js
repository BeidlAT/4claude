// ---- the Hauptknopf: a tap starts (at the bar line, the first note, or at once) and closes; held ≥ 0.5 s (and a beat)
// it records while held. Mode „dieselbe Schleife“ punches the Fokus instead. After Stille it is ▶ Weiter. ----
function hxHaupt(e, slot) {
  if (!A.started || !HX.node) return;
  const T = hxHeard(e);
  if (HX.punch) { hxPunchEnd(T); return; }
  if (HX.rec) {
    if (HX.rec.phase !== 'rec') { hxRecCancel(); return; }   // waiting or listening: a tap cancels
    hxRecClose(T); return;
  }
  if (slot == null && HX.ruht && hxLoopsLive().some((L) => L.state === 'angehalten')) { hxWeiter(); return; }
  if (slot == null && P['hx.modus'] === 'dieselbe' && hxFok()) { hxPunchStart(hxFok(), T, e); return; }
  hxRecStart(T, slot, e);
}
function hxHauptUp(e) {
  const r = HX.rec || HX.punch, h = r && r.hold;
  if (!h || (e && h.pid !== e.pointerId)) return;
  r.hold = null;
  const T = hxHeard(e), held = T - h.T;
  if (held < HX_HOLD || held < 60 / tgBpm(hxNowT()) || !h.ptt) return;   // a tap (or a nervous short press): it goes on
  if (HX.punch) hxPunchEnd(T); else if (HX.rec.phase === 'rec') hxRecClose(T, true); else hxRecCancel();
}
function hxBase() {
  if (P['hx.laenge'] === 'fest') return 4 * P['hx.festT'];
  const L1 = hxLoopsLive().filter((L) => hxTakt(L)).sort((a, b) => a.made - b.made)[0];
  return L1 ? L1.d.beats : 0;
}
function hxRecStart(T, slot, e) {
  if (slot == null) slot = hxZiel();
  if (slot < 0) { toast('Alle ' + HX_SLOTS + ' Plätze sind belegt.'); return; }
  if (!hxMemOk(Math.round(8 * SR))) return;
  const grid = hxGrid(), st = P['hx.start'], R = { slot, phase: 'rec', t0: T, grid, mult: 1, base: grid ? hxBase() : 0, hold: e ? { pid: e.pointerId, T, ptt: true } : null, made: hxNowT() };
  if (grid) {
    if (st === 'ton') { R.phase = 'listen'; }
    else if (st === 'sofort') { const b = Math.floor(tgBeat(T) / 4 + 1e-9) * 4; R.b0 = b; R.t0 = tgTime(b); }
    else { const B = hxBarOf(T, HX_GRACE); R.b0 = B.b; R.t0 = B.t; if (!B.now) R.phase = 'wait'; }
  } else if (st === 'ton') R.phase = 'listen';
  HX.rec = R;
  if (R.base && R.phase !== 'listen') hxRecAuto();
  hxSay(R.phase === 'wait' ? 'Aufnahme beginnt mit Takt ' + hxBarNo(R.b0) : R.phase === 'listen' ? 'Aufnahme wartet auf deinen ersten Ton' : 'Aufnahme läuft');
  hxCoachDone();
  hxRailDirty();
}
// with a base length the end is known at the start: the Schleife is made now and enters at that bar line (its audio
// fills as you play); ×2/×4 or a tap before the end make it again, shorter or longer, before it sounds
function hxRecAuto() {
  const R = HX.rec;
  if (!R || R.b0 == null) return;
  if (R.loopKey) { hxUnmake(hxByKey(R.loopKey)); R.loopKey = null; }
  const beats = R.close != null ? R.close - R.b0 : R.base * R.mult;
  if (beats < 1) return;
  const w0 = tgTime(R.b0), w1 = tgTime(R.b0 + beats);
  const plan = { kind: 'grid', in: hxInp(), w0, w1, b0: R.b0 + beats, beats, bars: beats / 4, lock: 'takt', entry: { b: R.b0 + beats, t: w1, now: false } };   // (step 4: or the Mikro)
  const L = hxHarvest(plan, { slot: R.slot, T: w1, kind: 'aufnahme' });
  HX.pend = HX.pend.filter((p) => !(p.kind === 'ernte' && p.loop === (L && L.id)));   // (the recording itself shows it)
  if (L) { R.loopKey = L.key; R.w1 = w1; }
  HX.chips = HX.rec && R.base ? { kind: 'mult', until: Infinity } : null;   // (×1 ×2 ×4 while it waits and records)
}
function hxRecCancel(quiet) {
  const R = HX.rec; if (!R) return;
  if (R.loopKey) hxUnmake(hxByKey(R.loopKey));
  HX.rec = null;
  if (HX.chips && HX.chips.kind === 'mult') HX.chips = null;
  if (!quiet) hxSay('Aufnahme abgebrochen');
  hxRailDirty();
}
function hxRecNote(t) {   // „beim ersten Ton“: the first note of a captured source starts it (with a Takt: on its bar line)
  const R = HX.rec;
  if (!R || R.phase !== 'listen') return;
  if (R.grid) { const b = tgBeat(t), n = Math.round(b / 4) * 4, bb = Math.abs(tgTime(n) - t) <= Math.min(hxBar() / 8, HX_GRACE) ? n : Math.floor(b / 4 + 1e-9) * 4; R.b0 = bb; R.t0 = tgTime(bb); R.phase = tgTime(bb) > hxNowT() ? 'wait' : 'rec'; if (R.base) hxRecAuto(); }
  else { R.t0 = t - 0.02; R.phase = 'rec'; }
  hxSay('Aufnahme läuft'); hxRailDirty();
}
function hxRecClose(T, ptt) {
  const R = HX.rec; if (!R) return;
  if (R.grid) {
    let e;
    if (ptt) { const b = tgBeat(T), p = Math.floor(b / 4 + 1e-9) * 4; e = b - p < 2 ? p : p + 4; }   // released: the nearest bar line
    else e = hxBarOf(T, HX_GRACE).b;   // a tap: this bar line (just passed) or the next
    if (e <= R.b0) e = R.b0 + 4;   // (at least a bar)
    if (R.loopKey && R.close == null && Math.abs(e - (R.b0 + R.base * R.mult)) < 1e-6) { HX.rec = null; hxRailDirty(); return; }   // (it closes there anyway)
    R.close = e; hxRecAuto();
    HX.rec = null;
    if (HX.chips && HX.chips.kind === 'mult') HX.chips = null;
    const L = R.loopKey && hxByKey(R.loopKey);
    if (L) hxSay(hxName(L) + ' schließt mit Takt ' + hxBarNo(e));
  } else {
    HX.rec = null;
    // (the window starts with the first note after the press – a player starts a moment after tapping; its attack's
    // lead-in is in the margin)
    const inp = hxInp(), first = inp === 3 ? null : hxNotes(R.t0 - 0.05, Math.min(T, R.t0 + 1.5), 0, false)[0];   // (step 4: the Mikro has no notes: from the press)
    const now = hxNowT(), w0 = first ? Math.max(R.t0 - 0.05, first.t0) : R.t0, w1 = Math.max(w0 + 0.25, T);
    const ons = hxOnsets(hxNotes(w0 - 0.03, w1, 0, true).filter((x) => x.t0 >= w0 - 0.03)).map((x) => Object.assign({}, x, { t: x.t - w0 }));
    const tk = hxTaktFinden(ons, w1 - w0), top = tk.cands[0], takt = hxTaktOk(tk), Lr = takt ? hxTaktLen(ons, w1 - w0, top) : w1 - w0;
    hxHarvest({ kind: 'aufnahme', in: inp, w0, w1: w0 + Lr, lock: takt ? 'takt' : 'frei', tk, top, bars: takt ? top.bars : 0, beats: takt ? top.n : 0, bpb: takt ? top.m : 4, bpm: takt ? (60 * top.n) / Lr : 0,
      entry: { t: now + HX_LEAD, now: false, start: true } }, { slot: R.slot, T: now, kind: 'aufnahme' });
  }
  hxRailDirty();
}
// auto-close (hx.autoclose): a free recording closes once you repeat its beginning – at the seam where the repetition ends
function hxRecAutoClose() {
  const R = HX.rec;
  if (!R || R.phase !== 'rec' || R.grid || !P['hx.autoclose'] || hxInp() === 3) return;   // (step 4: it hears notes – the Mikro has none)
  const ons = hxOnsets(hxNotes(R.t0 - 0.03, hxNowT() + 1, 0, false));
  const rep = hxWiederholung(ons, true);
  if (!rep) return;
  HX.rec = null;
  const w0 = ons[0].t, p = rep.p, rel = ons.filter((x) => x.t < w0 + p - 0.03).map((x) => Object.assign({}, x, { t: x.t - w0 }));
  const tk = hxTaktFinden(rel, p), top = tk.cands[0], takt = hxTaktOk(tk), Lr = takt ? hxTaktLen(rel, p, top) : p;
  hxHarvest({ kind: 'rep', in: 0, w0: rep.c0, w1: rep.c0 + Lr, lock: takt ? 'takt' : 'frei', tk, top, bars: takt ? top.bars : 0, beats: takt ? top.n : 0, bpb: takt ? top.m : 4, bpm: takt ? (60 * top.n) / Lr : 0,
    entry: { t: Math.max(rep.c0 + Lr, hxNowT() + HX_LEAD), now: false, seam: true } }, { slot: R.slot, kind: 'aufnahme' });
  hxSay('Wiederholung erkannt – die Schleife schließt sich');
}

// ---- punch overdub into the Fokus (mode „dieselbe Schleife“): from the press frame out of the Humus, 10-ms fades,
// one Schicht per pass (a group): each enters at the start of the pass after the one it was played in ----
function hxPunchStart(L, T, e) {
  if (L.bew) return;   // Hexenring: (step 1d) a Schleife of Bewegung takes no sound
  if (!hxMicOk(true)) return;   // (step 4: Bluetooth – no overdub with the microphone)
  if (!hxMemOk(L.d.lock === 'takt' ? Math.round(hxLen(L) * SR) * 2 : L.d.L * 2)) return;
  const P0 = { loop: L.id, lk: L.key, group: ++HX.groupN, a: Math.round(hxF(T)), sks: [], k: null, hold: e ? { pid: e.pointerId, T, ptt: true } : null };
  if (P['hx.runde']) { const k = hxPassK(L, P0.a); P0.end = P0.a + (hxPassF(L, k + 1) - hxPassF(L, k)); }   // (step 1d: „eine Runde“ – it ends one pass after the press)
  HX.punch = P0;
  hxPunchPass(hxPassK(L, P0.a), true);
  hxSay('Überspielen ' + hxName(L)); hxRailDirty();
}
function hxPunchPass(k, first) {
  const P0 = HX.punch, L = P0 && HX.loops.get(P0.loop); if (!L) return;
  const inp = hxInp(), sh = inp === 3 ? hxMicRt() : 0, a = hxPassF(L, k), b = hxPassF(L, k + 1), X = Math.round(0.01 * SR);   // (step 4: the Mikro – its round trip later)
  const c = { in: inp, w0: a + sh, w1: b + sh, f0: a + sh, pre: 0, len: b - a, post: 0, n: b - a, aus: null };
  const sid = hxSchNew(L.id, c, { seamK: k + 1, fin: 0, join: 'cut', kind: 'punch', group: P0.group, gate: { a: (first ? P0.a : a - X) + sh, X }, probe: false });
  P0.k = k; P0.cur = sid; P0.sks.push(HX.sch.get(sid).key); P0.b = b;
  const S0 = HX.sch.get(sid); if (S0) S0.gate = { a: first ? P0.a : a, b: null };   // (step 2a: what it lets through – its notes for Wuchs)
}
function hxPunchTick() {
  const P0 = HX.punch; if (!P0) return;
  const L = HX.loops.get(P0.loop);
  if (!L || L.state === 'weg') { HX.punch = null; return; }
  if (P0.end != null && hxF(hxNowT() + 0.03) >= P0.end) { hxPunchEnd(hxT(P0.end)); return; }   // (step 1d: „eine Runde“ – told ahead, at its frame)
  if (hxF(hxNowT()) >= P0.b) hxPunchPass(P0.k + 1, false);
}
function hxPunchEnd(T) {
  const P0 = HX.punch; if (!P0) return;
  HX.punch = null;
  const f = Math.round(hxF(T)), L = HX.loops.get(P0.loop);
  // the Schicht whose pass holds the end gets it; a pass begun after the end holds nothing and goes
  for (const k of P0.sks.slice()) {
    const S = hxSchByKey(k); if (!S) continue;
    if (S.cut.w0 >= f) { hxUndo(S.id); P0.sks = P0.sks.filter((x) => x !== k); continue; }
    if (S.cut.w1 > f) { hxPost({ gate: { schicht: S.id, b: f } }); if (S.gate) S.gate.b = f; }
  }
  if (L && P0.sks.length) { hxHist(hxSchStep(L.key, P0.sks.slice(), (P0.sks.length > 1 ? P0.sks.length + ' Schichten' : 'Schicht') + ' in ' + hxName(L))); HX.fokus = L.id; }
  hxSay('Überspielen beendet'); hxRailDirty(); hxCardDirty();
}

// ---- a ring (press-acting): empty → record into it; recording → close; pending → cancel; spielt ⇄ stumm at the bar
// line (≤ ⅛ bar, max 150 ms after it: on that one, now); angehalten → from its start on the next 1 ----
function hxRingTap(slot, e) {
  const id = HX.slot[slot], L = id && HX.loops.get(id), T = hxHeard(e);
  if (HX.rec && HX.rec.slot === slot) { hxHaupt(e); return 'rec'; }
  if (!L) { if (HX.rec) hxRecCancel(true); hxRecStart(T, slot, null); return 'neu'; }
  const pend = HX.pend.find((p) => p.loop === L.id);
  if (pend) { hxPendDrop(pend); pend.cancel(); hxSay(hxName(L) + ': abgebrochen'); return 'ab'; }
  if (L.state === 'spielt' && ((L.gg != null && L.gg !== 1) || L.gdv || (HXG.plan && HXG.plan.items.some((x) => x.key === L.key)))) { hxGdNein(L); return 'gd'; }   // (Etappe 3: a tap takes the Gärtner's change back – at once)
  if (L.state === 'angehalten') { hxReenter([L]); return 'an'; }
  const to = L.state === 'spielt' ? 'stumm' : 'spielt';
  if (!hxTakt(L) && !hxGrid()) { hxState(L.id, to, null, { X: 0.04 }); hxSay(hxName(L) + (to === 'stumm' ? ' stumm' : ' spielt')); return to; }
  const B = hxBarOf(T, HX_RGRACE), X = 0.02;
  if (B.now) { hxState(L.id, to, null, { X }); hxSay(hxName(L) + (to === 'stumm' ? ' stumm' : ' spielt')); return to; }
  const from = L.state;
  hxState(L.id, to, B.t, { X });
  L.pendTo = to;
  hxPendAdd({ kind: 'state', loop: L.id, t: B.t, label: (to === 'stumm' ? 'stumm' : 'an') + ' mit Takt ' + hxBarNo(B.b), cancel: () => { hxState(L.id, from, B.t, { X }); L.pendTo = null; }, done: () => { L.pendTo = null; } });
  hxSay(hxName(L) + (to === 'stumm' ? ' verstummt' : ' kommt') + ' mit Takt ' + hxBarNo(B.b));
  return to;
}
// angehalten → each from its own start on the next 1 (several meet anew); a Frei one too, or at once without a Takt
function hxReenter(list) {
  for (const L of list) L.pendTo = null;
  const grid = hxGrid(), nb = grid ? Math.ceil(tgBeat(hxNowT() + HX_LEAD) / 4 - 1e-9) * 4 : null, t = grid ? tgTime(nb) : hxNowT() + HX_LEAD;
  for (const L of list) {
    if (hxTakt(L)) { hxState(L.id, 'spielt', t, { b0: nb != null ? nb : Math.ceil(tgBeat(t)), X: 0.01 }); L.d.b0 = (nb != null ? nb : Math.ceil(tgBeat(t))) + TG.o; }
    else { const f = Math.round(hxF(t)); hxPost({ state: { loop: L.id, to: 'spielt', f, ph0: f, X: Math.round(0.01 * SR) } }); L.state = 'spielt'; L.d.ph0 = f; hxCount(); }
    hxPendAdd({ kind: 'weiter', loop: L.id, t, label: nb != null ? 'ab Takt ' + hxBarNo(nb) : 'gleich', cancel: () => hxState(L.id, 'angehalten', t), done: () => {} });
  }
  hxSay(list.length > 1 ? list.length + ' Schleifen beginnen' + (nb != null ? ' mit Takt ' + hxBarNo(nb) : '') : hxName(list[0]) + ' beginnt' + (nb != null ? ' mit Takt ' + hxBarNo(nb) : ''));
  hxRailDirty();
}
function hxWeiter() { HX.ruht = false; const l = hxLoopsLive().filter((L) => L.state === 'angehalten'); if (l.length) hxReenter(l); hxRailDirty(); }
// Stille: every Schleife angehalten, recordings and pending actions end; a toast offers Weiter or Leeren
function hxStille() {
  hxAntStop('Stille'); if (HXA.ph) HXA.ph.done = true; if (HXW_K.wk) hxWkNein(); HXG.plan = null;   // (Etappe 3: the Gärtner's answer, Wiederkehr and plan end too)
  if (HX.rec) hxRecCancel(true);
  if (HX.punch) hxPunchEnd(hxHeard());
  if (HX.schluss) hxSchlussAb();   // (step 1d: the form's waits end too)
  for (const p of HX.pend.slice()) if (p.kind === 'licht' || p.kind === 'luecke') { hxPendDrop(p); p.cancel(); }
  HX.slp = null; HX.wake = null;
  for (const p of HX.pend.slice()) { if (p.kind === 'weiter' || p.kind === 'state') { hxPendDrop(p); } }
  let n = 0;
  for (const L of hxLoopsLive()) if (L.state === 'spielt' || L.state === 'stumm') { hxState(L.id, 'angehalten'); n++; L.pendTo = null; }
  if (n) HX.ruht = true;
  HX.pend = HX.pend.filter((p) => p.kind !== 'weiter' && p.kind !== 'state');
  hxRailDirty(); hxSaveAll();
  return n;
}
// ---- deleting: one loop (its card) into the session's graveyard; all of them (↶ held 1.5 s) – both undoable ----
function hxSnapS(S) { return S && { key: S.key, len: S.len, pre: S.pre, n: S.n, cut: S.cut, aus: S.aus ? Object.assign({}, S.aus) : null, join: S.join, X: S.X, rho: S.rho, gain: S.gain, mute: S.mute, kind: S.kind, group: S.group, sr: S.sr, aud: S.aud,
  bak: S.bak, chain: S.chain, zo: S.zo, kc: S.kc, kcB: S.kcB, dr: S.dr, cold: S.cold, cutAus: S.cutAus, spliced: S.spliced, wn: S.wn || null, wseed: S.wseed || 0, wu: S.wu || null, anc: S.anc || null, gate: S.gate || null }; }   // (step 2a: its Wuchs)
function hxSnap(L) {
  return { key: L.key, slot: L.slot, d: Object.assign({}, L.d), bpb: L.bpb, notes: L.notes, mv: L.mv, cut: L.cut, eng: L.eng, setTG: L.setTG, gain: L.gain, src: L.src, bpm: L.bpm, state: L.state, tk: L.tk,
    folgt: !!L.folgt, taumeln: L.taumeln !== false, nudge: L.nudge || 0, eig: L.eig, sch: L.sch.map((id) => hxSnapS(HX.sch.get(id))).filter(Boolean),
    wwhy: Object.assign({}, L.wwhy || {}), ton: L.ton, klang: L.klang, stufe: L.stufe, q: L.q, P: L.P, mask: L.mask, chainRec: L.chainRec, jrg: L.jrg, tb: hxTbOf(L), tr0: L.tr0 || null,   // (step 2a; step 2b: its tools)
    bew: L.bew ? { lanes: L.bew.lanes.map((ln) => ({ k: ln.k, src: ln.src, v: ln.v })), disp: L.bew.disp, n: L.bew.n, g0: L.bew.g0, gs: L.bew.gs, fade: L.bew.fade, why: L.bew.why } : null, naehrt: L.naehrt || null, mi: hxMiSave(L), eco: hxEcoOf(L) };   // (step 4: its ecology)
}
const hxMiSave = (L) => { const m = L.mi; if (!m) return null; const o = {}; for (const k of ['rolle', 'wk', 'gOff', 'sugg', 'from', 'begl']) if (m[k] != null && m[k] !== false) o[k] = m[k]; return Object.keys(o).length ? o : null; };   // (Etappe 3: role, Gärtner, Wiederkehr, a suggestion)
function hxSchRebuild(loop, s, o = {}) {
  const c = { in: s.cut ? s.cut.in : 0, w0: s.cut ? s.cut.w0 : 0, w1: s.cut ? s.cut.w1 : 0, f0: s.cut ? s.cut.f0 : 0, pre: s.pre, len: s.len, post: s.cut ? s.cut.post : 0, n: s.n, aus: s.aus };
  if (!s.aud && !(s.cut && hxReach(s.cut))) return 0;
  const id = hxSchNew(loop, s.aud ? c : s.cut, { aud: s.aud, bak: s.bak, chain: s.chain, zo: s.zo, kc: s.kc, kcB: s.kcB, dr: s.dr, cold: s.cold, cutAus: s.cutAus, spliced: s.spliced, key: s.key, gain: s.gain, mute: s.mute, join: s.join, X: s.X / SR, rho: s.rho, kind: s.kind, group: s.group, sr: s.sr, fin: o.fin != null ? o.fin : 0.01, seamK: o.seamK, probe: false });
  const S = HX.sch.get(id);
  if (S && S.aud && S.chain && !S.bak && !(HX.loops.get(loop) || {}).folgt) hxAfterFill(S);   // (a dry one: baked again)
  if (S) { S.wn = s.wn || null; S.wseed = s.wseed || 0; S.wu = s.wu || null; S.anc = s.anc || null; S.gate = s.gate || null; }   // (step 2a: its Wuchs – played once the loop is made: hxRebuild)
  return id;
}
// a loop back from a snapshot: phase-correct where it would be (its geometry is its own beat or frame), fading in
function hxRebuild(sn, o = {}) {
  const slot = sn.slot != null && !HX.slot[sn.slot] ? sn.slot : hxZiel();
  if (slot < 0) { toast('Kein freier Platz für ' + 'Schleife ' + ((sn.slot || 0) + 1) + '.'); return null; }
  const L = hxLoopMake({ slot, key: sn.key, lock: sn.d.lock, b0: sn.d.b0 - TG.o, beats: sn.d.beats, Lf: sn.d.L, ph0: sn.d.ph0, gap: !!sn.d.gap, gain: sn.gain, bpb: sn.bpb, notes: sn.notes, mv: sn.mv, cut: sn.cut, eng: sn.eng, setTG: sn.setTG, src: sn.src, bpm: sn.bpm, state: o.state || (sn.state === 'stumm' ? 'stumm' : 'spielt'), fokus: o.fokus, eig: sn.eig,
    wwhy: sn.wwhy || {}, ton: sn.ton, klang: sn.klang, stufe: sn.stufe, q: sn.q, P: sn.P, mask: sn.mask, chainRec: sn.chainRec, jrg: sn.jrg });   // (step 2a: its Wuchs)
  L.tk = sn.tk; L.folgt = !!sn.folgt; L.taumeln = sn.taumeln !== false; if (sn.nudge) L.nudge = sn.nudge;
  if (sn.mi) L.mi = Object.assign({}, sn.mi);   // (Etappe 3)
  if (sn.tb) { Object.assign(L, sn.tb); if (sn.tr0) L.tr0 = sn.tr0; }   // (step 2b: its tools – sent once its Schichten are there)
  if (sn.bew) { const B = sn.bew; L.bew = { lanes: B.lanes.map((x) => ({ k: x.k, src: x.src, v: x.v, o: Object.assign({ at: 0 }, faeOpts(x.src)) })), disp: B.disp || null, n: B.n, g0: B.g0, gs: B.gs, fade: B.fade, why: B.why, next: null, re: true, on0: L.state === 'spielt', ev: [] }; HX.bewKey = L.key; }
  if (sn.setTG && !TG.hxOn && !SEQ.ext) { TG.hxOn = true; TG.hx = sn.bpm; tgRetempo(sn.bpm); for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null); }
  for (const s of sn.sch) hxSchRebuild(L.id, s, o);
  if (sn.naehrt && sn.naehrt.gsp && !L.bew) setTimeout(() => { if (hxByKey(L.key) === L) hxNaehrGsp(L, true); }, 0);   // (step 1d: its web again)
  if (sn.eco) hxEcoSet(L, sn.eco);
  if (sn.naehrt && !L.bew) for (const k of ['rhz', 'rgn', 'glt', 'shn']) if (sn.naehrt[k]) setTimeout(() => { if (hxByKey(L.key) === L) hxNaehr(L, k, true, true); }, 0);   // (step 4: Rhizom, Regen, its Höfe)
  if (sn.tb) hxTbSend(L);   // (step 2b)
  if (hxWAktiv(L)) hxWUpdate(L, { f: Math.round(hxF(hxNowT() + 0.06)) });   // (step 2a: it grew – its Wuchs again, at once)
  hxStripSync(); hxCardDirty(); if (!o.noSave) hxSaveLoop(L);
  return L;
}
// a loop out of the processor and its slot (the graveyard and the history keep its snapshot)
function hxDrop(L, X) {
  if (!L || L.state === 'weg') return;
  const slot = L.slot;
  if (HX.slot[slot] === L.id) HX.slot[slot] = 0;
  if (HX.fokus === L.id) HX.fokus = 0;
  HX.pend = HX.pend.filter((p) => p.loop !== L.id);
  hxTempoHold(hxLoopsLive().filter((x) => x !== L).length);
  hxDbDel(L.key);
  hxClear(L.id, null, X != null ? X : 0.02);
  if (L.bew) modClear('hxb' + L.id + ':*');   // (step 1d: a Schleife of Bewegung leaves the mod layer)
  if (HXN.webs.has(L.id)) hxWebDrop(L.id, true);   // (its own web rings out and goes)
  for (const k of ['glt', 'shn']) if (HXN.feed.has(L.id + ':' + k)) hxFeedDrop(L.id, k, true);   // (step 4: its Höfe too)
  hxRhzNetDrop(L);   // (its own Rhizom net; its last charges ring out on it)
  L.slot = null;
  if (!HX.fokus) { const n = hxLoopsLive().filter((x) => !x.bew).sort((a, b) => b.made - a.made)[0]; if (n) HX.fokus = n.id; }
  hxRailDirty(); hxCardDirty(); hxStripSync();
}
function hxDelete(L) {
  const sn = hxSnap(L);
  HX.grave.unshift({ snap: sn, t: Date.now() });
  hxDrop(L, 0.04);
  const key = sn.key;
  hxHist({ kind: 'del', label: hxName(L) + ' gelöscht', undo() { HX.grave = HX.grave.filter((g) => g.snap !== sn); hxRebuild(sn); }, redo() { const X = hxByKey(key); if (X) { HX.grave.unshift({ snap: hxSnap(X), t: Date.now() }); hxDrop(X, 0.04); } } });
  hxSay(hxName(L) + ' gelöscht'); hxCardDirty();
}
function hxLeeren() {
  if (HX.rec) hxRecCancel(true);
  if (HX.punch) hxPunchEnd(hxHeard());
  HX.pend = [];
  const all = hxLoopsLive();
  if (!all.length) { hxSay('Keine Schleife da'); return; }
  const snaps = all.map(hxSnap);
  for (const sn of snaps) HX.grave.unshift({ snap: sn, t: Date.now() });
  for (const L of all) hxDrop(L, 0.04);
  HX.ruht = false;
  hxHist({ kind: 'leeren', label: 'alle ' + all.length + ' Schleifen geleert', undo() { HX.grave = HX.grave.filter((g) => !snaps.includes(g.snap)); for (const sn of snaps) hxRebuild(sn, { fokus: false }); },
    redo() { for (const sn of snaps) { const X = hxByKey(sn.key); if (X) { HX.grave.unshift({ snap: hxSnap(X), t: Date.now() }); hxDrop(X, 0.04); } } } });
  hxSay('Alle Schleifen geleert'); toast('Alle Schleifen geleert.', 5000, { label: 'Rückgängig', fn: hxUndoStep });
}
// the last Schleife gone while a Schleife gave the tempo: it is held for 8 s with a chip „Tempo behalten · 91“
function hxTempoHold(left) {
  if (!TG.hxOn || TG.keep || left > 0) return;
  TG.keep = true; HX.keepT = { bpm: TG.hx, until: hxNowT() + HX_CHIP_S };
  HX.chips = { kind: 'tempo', until: performance.now() + HX_CHIP_S * 1000 };
  hxRailDirty();
}
function hxTempoTick(now) {
  const k = HX.keepT; if (!k) return;
  if (hxLoopsLive().length) { HX.keepT = null; TG.keep = false; return; }
  if (now > k.until) { HX.keepT = null; TG.keep = false; hxTempoFree(); hxRailDirty(); }
}
function hxTempoKeep() { HX.keepT = null; TG.keep = true; HX.chips = null; hxSay('Tempo ' + dec(TG.hx.toFixed(1)) + ' bleibt'); hxRailDirty(); }

// ---- history (content steps only; mute, level are performance): ↶ cancels the player's own newest pending action
// first, else undoes the last step; ↷ for 8 s. Depth is limited only by the memory cap (the oldest go first). ----
function hxHist(step) { step.t = Date.now(); HX.hist.push(step); HX.redo.length = 0; HX.redoT = 0; if (HX.hist.length > 200) HX.hist.shift(); hxRailDirty(); hxCardDirty(); }
function hxUndoStep() {
  const p = HX.pend[HX.pend.length - 1];
  if (p) { hxPendDrop(p); p.cancel(); hxSay('Abgebrochen: ' + p.label); return; }
  if (HX.rec) { hxRecCancel(); return; }
  const s = HX.hist.pop();
  if (!s) { toast('Im Hexenring gibt es nichts zurückzunehmen.', 2000); return; }
  s.undo();
  HX.redo.push(s); HX.redoT = performance.now() + HX_REDO_S * 1000;
  toast('Schleife: ' + s.label + ' – zurückgenommen.', 2600);
  hxSay('Zurückgenommen: ' + s.label); hxRailDirty(); hxCardDirty(); hxSaveAll();
}
function hxRedoStep() {
  const s = HX.redo.pop(); if (!s) return;
  s.redo(); HX.hist.push(s);
  HX.redoT = HX.redo.length ? performance.now() + HX_REDO_S * 1000 : 0;
  toast('Schleife: ' + s.label + ' – wiederhergestellt.', 2200);
  hxSay('Wiederholt: ' + s.label); hxRailDirty(); hxCardDirty(); hxSaveAll();
}

// ---- after a harvest: „→ 1 · → 2 …“ (this harvest as a Schicht of that loop, re-cut to its last pass) and the
// corrections, for 8 s in the Ringleiste where the rings are – never over the field ----
function hxChipsAfter(L, plan, T) {
  const to = hxLoopsLive().filter((x) => x.id !== L.id && x.state === 'spielt' && hxRetroPlan(x, T)).map((x) => x.slot);
  HX.chips = { kind: 'ernte', key: L.key, T, to, until: Infinity, kor: hxCorrs(L), bew: hxBewHas(L) };   // (owner, 25.10.2026: the row after a harvest stays until you close it – ✕ – or the next harvest takes its place)
  hxRailDirty();
}
function hxChipTo(slot) {
  const ch = HX.chips, H = ch && hxByKey(ch.key), tgt = HX.loops.get(HX.slot[slot]);
  if (!H || !tgt) return;
  const plan = hxRetroPlan(tgt, ch.T);
  if (!plan) { toast('So weit reicht der Humus nicht zurück.'); return; }
  HX.pend = HX.pend.filter((p) => p.loop !== H.id);
  hxUnmake(H);
  hxRetroDo(plan);
  HX.chips = null; hxRailDirty();
}
// which corrections a loop offers (KONZEPT §2.3): tempo only for the one that set it; lengths, the 1 and the 3er for a
// Takt loop of one Schicht; the round before while the Humus still holds it
function hxCorrs(L) {
  const one = L.sch.length <= 1, takt = hxTakt(L), own = L.setTG && !SEQ.on && !SEQ.ext;
  const c = L.cut, len = c ? c.len : 0, prev = c && hxReach({ f0: c.f0 - len });
  return { tempo: own, len: takt && one, eins: takt && (one || own), drei: takt && one, davor: !!(one && prev), minus: takt && L.d.beats > (L.bpb || 4) };
}

