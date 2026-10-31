// ---- Einspielen (owner, 31.10.2026: „Ich dachte, wenn das aktiviert ist, kann ich am Spielfeld was spielen – Bildschirm
// oder MIDI – und dann wird das Gespielte in die Schleife transformiert“) ----
// A Schleife set to Einspielen listens to the field: what is played on it (the screen, a keyboard, the Touché – the
// sources the Korb would take) during one of its passes is laid into its notes at the same place in the pass, and at the
// pass's end it plays anew with them – in its own instrument (or the one chosen for it), in its key, Wuchs. Each pass
// that brought notes is one step of ↶. Nothing played: nothing changes.
const HX_EIN_LEAD = 0.06;   // (a note hit just before the downbeat belongs to it)
function hxEinCan(L) { return !!L && !L.bew && L.state !== 'weg' && L.sch.some((id) => hxWCan(HX.sch.get(id))); }
function hxEinSet(L, on) {
  if (!L) return;
  if (on && !hxEinCan(L)) { hxHint(hxName(L) + ' hat keine Noten – nur eine Schleife aus gespielten Noten kann Neues aufnehmen.'); return; }
  L.ein = !!on; L.einK = null;
  if (on) { const k = hxPassK(L, hxF(hxNowT() - HX_EIN_LEAD)); L.einK = k; }
  hxSay(hxName(L) + (on ? ': Einspielen – spiel auf dem Spielfeld, am Ende jedes Durchgangs kommt es in die Schleife' : ': Einspielen aus'));
  hxCardDirty(); hxRailDirty();
}
// every tick: a pass of an Einspielen loop that ended takes what was played in it
function hxEinTick(now) {
  for (const L of HX.loops.values()) {
    if (!L.ein) continue;
    if (L.state === 'weg' || L.slot == null || !hxEinCan(L)) { L.ein = false; continue; }
    const k = hxPassK(L, hxF(now - HX_EIN_LEAD - 0.05));   // (late: the notes of the pass's last moment are logged)
    if (L.einK == null) { L.einK = k; continue; }
    if (k > L.einK) { const k0 = L.einK; L.einK = k; if (L.state === 'spielt') hxEinTake(L, k0); }
    else if (k < L.einK) L.einK = k;   // (a new geometry: counted afresh)
  }
}
// the notes played in pass k, into the loop's first Schicht with notes
function hxEinTake(L, k) {
  const S = L.sch.map((id) => HX.sch.get(id)).find(hxWCan); if (!S) return false;
  const a = hxT(hxPassF(L, k)), b = hxT(hxPassF(L, k + 1)), w0 = a - HX_EIN_LEAD, w1 = b - HX_EIN_LEAD;
  const evs = hxNotes(w0, w1, 0, false).filter((e) => ENGINES[e.eng] && !e.probe && !e.hx);
  if (!evs.length) return false;
  const W = S.wn, takt = W.u === 'b', b0 = takt ? tgBeat(a) : 0, passU = takt ? tgBeat(b) - b0 : b - a, sc = passU > 0 ? W.len / passU : 1;
  const u = (t) => ((takt ? tgBeat(t) - b0 : t - a) * sc);
  // its own instrument and channel: the ones most of its notes have (a chosen one plays over it – hxWEng)
  const most = (key) => { const c = new Map(); for (const x of W.n) c.set(x[key], (c.get(x[key]) || 0) + 1); let m = null, v = -1; for (const [x, n] of c) if (n > v) { m = x; v = n; } return m; };
  const eng = most('eng') || L.eng, src = most('src') || 'fin';
  const neu = evs.map((e) => {
    const t = clamp(u(e.t0), 0, Math.max(0, W.len - 1e-3)), rel = (p) => (p || []).map(([tt, v]) => [u(tt) - t, v]);
    const d = e.t1 != null ? Math.max(0.01, u(e.t1) - t) : Math.max(0.05, W.len - t);
    return { t, held: false, d, eng, f: e.f, deg: e.deg, oct: e.oct, alt: e.alt, y0: e.y0, vel: e.vel, pan: e.pan, amp: e.amp, src, burst: e.burst, gate: e.gate, hold: e.hold, cy: rel(e.curves.y), cf: rel(e.curves.f), ein: 1 };
  });
  const lk = L.key, sk = S.key, was = W, wasW = Object.assign({}, L.wwhy || {});
  const to = Object.assign({}, W, { n: W.n.concat(neu).sort((x, y) => x.t - y.t) });
  const put = (X, wn, ww) => { const S2 = hxSchByKey(sk); if (!S2) return; S2.wn = wn; S2.wnT = null; X.wwhy = ww; hxWUpdate(X); hxSaveMeta(X.id); hxCardDirty(); hxRailDirty(); };
  const ww = Object.assign({}, wasW, { wahl: true, abdr: false });
  put(L, to, ww);
  hxHist({ kind: 'wuchs', label: neu.length + (neu.length === 1 ? ' Note' : ' Noten') + ' eingespielt (' + hxName(L) + ')', undo() { const X = hxByKey(lk); if (X) put(X, was, wasW); }, redo() { const X = hxByKey(lk); if (X) put(X, to, ww); } });
  hxSay(hxName(L) + ': ' + neu.length + (neu.length === 1 ? ' Note' : ' Noten') + ' eingespielt');
  return true;
}
