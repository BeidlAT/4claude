// ---- following the key (SPEC §10.4): a scale or root change while loops with notes play is an announced action –
// „Schleifen folgen ab Takt 9 · ✕“: the field and the loops change on the same bar line (hx.tonartAmTakt; off: the field
// at once, the loops fall silent until their new pass is there). Every loop that follows gets that pass rendered in the
// new key from its start and heard from the bar line – it must come: if it is late the loop is silent there, never in
// the old key. ----
const hxWFolgt = (L) => !L.bew && L.state !== 'weg' && (L.ton || 'diatonisch') !== 'fest' && L.sch.some((id) => hxWCan(HX.sch.get(id)));   // (hxWTonOff: whether its key is another now)
// the time a pass takes to render here (the guard's prediction: the sources' measured cost × CAL.unit × duration)
function hxWPredict(L, S, dur) {
  const W = S.wn; if (!W) return 0;
  const q = Number(hxWQ(L)) || 3, u = CAL.unit || 0.0012;
  let vs = 0; for (const n of W.n) { const e = hxWEng(L, n), c = (HX_WRT[e] || HX_WRT.def)[q - 1] || 2; vs += c * Math.min(dur, (n.d != null ? n.d : 1) * (W.u === 'b' ? 60 / tgBpm(hxNowT()) : 1) + 3); }
  const B = HX_WBASE[q] || HX_WBASE[3];
  return (u * vs + (B.perS * u * dur) + B.perRender / 1000) * (hxEigN(L) >= 2 ? 1.75 : 1);   // (Etappe 3: a varied pass may hold up to 1.75 × the notes – hxVOk)
}
// (the key the field plays in: HX.tonP – set when buildNotes applies it; the parameters may already say another)
const hxWKeySame = (o) => !!o && String(o.root) === String(P['t.root']) && o.scale === P['t.scale'];
function hxWTonHold(id) {
  if (HX.tonGo || !A.ctx || !HX.node || !P['hx.tonartAmTakt'] || !HX.tonP) return false;
  const key = hxWKeyNow();
  if (HX.folge) {   // another change before the bar: the same bar line, the newest key (or none, changed back)
    if (hxWKeySame(HX.tonP)) { hxWTonAb(true, true); return true; }
    HX.folge.key = key; hxWTonSlots(HX.folge); for (const k of HX.folge.loops) { const L = hxByKey(k); if (L) hxWUpdate(L, { key, f: Math.round(hxF(HX.folge.t)) }); }
    hxRailDirty(); return true;
  }
  if (hxWKeySame(HX.tonP)) return false;
  const list = hxLoopsLive().filter(hxWFolgt);
  if (!list.length) return false;
  const now = hxNowT();
  let lead = 0.6;
  for (const L of list) for (const sid of L.sch) { const S = HX.sch.get(sid); if (hxWCan(S)) lead = Math.max(lead, 1.6 * hxWPredict(L, S, hxLen(L) + 2) + 0.35); }
  const t = HX.tonAt != null && HX.tonAt > now + 0.3 ? HX.tonAt : hxGrid() ? tgBar(now + lead) : now + lead, b = hxGrid() ? Math.round(tgBeat(t)) : null;   // (step 4: a Treffen's planned key lands with it)
  HX.folge = { t, b, key, old: { 't.root': HX.tonP.root, 't.scale': HX.tonP.scale }, loops: list.map((L) => L.key) };
  hxWTonSlots(HX.folge);
  for (const L of list) hxWUpdate(L, { key, f: Math.round(hxF(t)) });
  const lab = b != null ? 'ab Takt ' + hxBarNo(b) : 'gleich';
  HX.folge.p = hxPendAdd({ kind: 'folge', t: t + 0.01, b, label: 'Schleifen folgen ' + lab, cancel: () => hxWTonAb(true), done: () => {} });
  HX.chips = { kind: 'folge', until: performance.now() + Math.max(HX_CHIP_S, (t - now + 1) * 1000) };
  hxSay('Schleifen folgen ' + lab); hxRailDirty(); hxCardDirty();
  return true;
}
// the pass of each following Schicht that holds the bar line, in the new key, from its start, heard from the bar line
function hxWTonSlots(F) {
  const f = Math.round(hxF(F.t));
  for (const k of F.loops) {
    const L = hxByKey(k); if (!L) continue;
    // (owner, 26.10.2026: Schleifen fell silent for many seconds after a key change – a preset loaded) a Treu loop does not
    // stream the pass with the change: that stream renders in real time (up to a whole pass, 40 s and more) and holds up
    // the realm its whole new version waits for; that version renders in a moment and comes in at the bar line (hxWUpdate
    // with F's frame; late: as soon as it is there)
    if (!hxWLebt(L)) continue;
    const kk = hxPassK(L, f);
    for (const id of L.sch) { const S = HX.sch.get(id); if (!hxWCan(S)) continue; hxWSlot(L, S, kk, { at: f, must: true, key: F.key, treu: !hxWLebt(L) }); S.wk = Math.max(S.wk == null ? -1 : S.wk, kk); }
  }
}
function hxWKeyBuilt() {
  const o = HX.tonP, k = { root: P['t.root'], scale: P['t.scale'] };
  HX.tonP = k;
  if (!o || HX.tonGo || !A.ctx || !HX.node || (String(o.root) === String(k.root) && o.scale === k.scale)) return;
  const list = hxLoopsLive().filter(hxWFolgt); if (!list.length) return;
  const F = { t: hxNowT() + 0.03, key: hxWKeyNow(), loops: list.map((L) => L.key) };
  hxWTonSlots(F); for (const L of list) hxWUpdate(L, { f: Math.round(hxF(F.t)) });
}
// at the bar line (a little before it: the Puls's notes after it are scheduled in the new key) the field changes
function hxWTonGo() {
  const F = HX.folge; if (!F) return;
  HX.folge = null; if (F.p) hxPendDrop(F.p);
  HX.tonGo = true;
  try { onParamChanged('t.root'); } finally { HX.tonGo = false; }
  if (HX.chips && HX.chips.kind === 'folge') HX.chips = null;
  hxSay('Tonart gewechselt'); hxRailDirty(); hxCardDirty();
}
// ✕ on the announcement: the change does not happen – the field keeps its key, the loops theirs (back: the parameters
// already say it – a change made back before the bar)
function hxWTonAb(quiet, back) {
  const F = HX.folge; if (!F) return;
  HX.folge = null; if (F.p) hxPendDrop(F.p);
  for (const k of F.loops) { const L = hxByKey(k); if (L) for (const id of L.sch) { const S = HX.sch.get(id); if (S) { hxWStop(S); S.wk = null; } } }
  if (!back) { HX.tonGo = true; try { for (const id of ['t.root', 't.scale']) if (String(P[id]) !== String(F.old[id])) setParam(id, F.old[id]); } finally { HX.tonGo = false; } }
  for (const k of F.loops) { const L = hxByKey(k); if (L) hxWUpdate(L, { re: true, f: Math.round(hxF(hxNowT() + 0.06)) }); }
  if (HX.chips && HX.chips.kind === 'folge') HX.chips = null;
  if (!quiet) hxSay('Tonartwechsel abgebrochen');
  hxRailDirty(); hxCardDirty();
}

// ---- following the tempo: a Takt loop with notes whose pass no longer fits its audio grows in the new tempo – the pass
// that holds the change rendered from its start through the new beat map and heard from where it is ready (pre-rolled),
// the passes after it Treu (or living); back at its own tempo it plays its Abdruck again ----
function hxWTempo() { if (!HX.node || !A.ctx) return; HX.wTempo = { due: hxNowT() + 0.12, t: hxNowT() }; hxTempoAudio(); }   // (step 2b: audio loops – a Fläche runs frei from now)
function hxWTempoGo() {
  const T = HX.wTempo; HX.wTempo = null;
  const now = hxNowT(), f = Math.round(hxF(now));
  for (const L of hxLoopsLive()) {
    if (L.bew || !hxTakt(L) || L.state === 'weg') continue;
    const sch = L.sch.map((id) => HX.sch.get(id)).filter(hxWCan); if (!sch.length) continue;
    // (the pass that holds the change, and the one after it – the loop's tempo from now on: back at its own, the pass
    // with the change still grows, the Abdruck from the next seam)
    const k = hxPassK(L, f), lenF = hxPassF(L, k + 1) - hxPassF(L, k), lenN = hxPassF(L, k + 2) - hxPassF(L, k + 1);
    const offK = sch.some((S) => Math.abs(lenF - S.len) > Math.max(2, 0.0015 * S.len)), off = sch.some((S) => Math.abs(lenN - S.len) > Math.max(2, 0.0015 * S.len));
    const was = !!(L.wwhy && L.wwhy.tempo);
    if (offK && !off) L.wwhy = Object.assign(L.wwhy || {}, { tempo: true });   // (aktiv for the pass with the change)
    if (!off && !offK && !was) continue;
    let slot = false;
    if (offK && hxWAktiv(L) && L.state === 'spielt' && (hxPassF(L, k + 1) - f) / SR > 0.8) {
      const at = Math.round(hxF(now + 0.25)) + Math.round(0.3 * hxWPredict(L, sch[0], (hxPassF(L, k + 1) - hxPassF(L, k)) / SR) * SR);
      for (const S of sch) { hxWSlot(L, S, k, { at, treu: !hxWLebt(L) }); S.wk = Math.max(S.wk == null ? -1 : S.wk, k); }
      slot = true;
    }
    L.wwhy = Object.assign(L.wwhy || {}, { tempo: off });
    if (slot && !off && !hxWAktiv(L)) {   // (back at its own tempo: the pass with the change grown, the Abdruck from its seam on – its stream not stopped)
      const fN = hxPassF(L, k + 1);
      for (const S of sch) if (S.play && S.play !== 'ab') { S.play = 'ab'; hxSchPlay(S, !!(S.bak && S.chain && !L.folgt), fN); }
      hxCardDirty(); hxRailDirty();
      continue;
    }
    hxWUpdate(L);
  }
}

// ---- ✓ ✕ ⚓ (KONZEPT §5.2/§5.4): for a living loop – the Fokus, else the newest that lives ----
function hxWTarget() { const F = hxFok(); if (F && hxWLebt(F)) return F; return hxLoopsLive().filter((L) => hxWLebt(L) || (hxEigN(L) >= 1 && hxWAktiv(L))).sort((a, b) => b.made - a.made)[0] || (F && hxWAktiv(F) ? F : null); }
// ✓: the pass that sounds now becomes the anchor – its audio (the realm that rendered it kept it), as it sounded
async function hxWLob(L) {
  L = L || hxWTarget();
  if (!L || !hxWAktiv(L)) { hxHint('Nichts zu entscheiden'); return; }
  const k = hxPassK(L, Math.round(hxF(hxHeard()))), sig0 = {}, lobOps = new Set();
  let n = 0;
  const before = L.sch.map((id) => { const S = HX.sch.get(id); return S ? [S.key, S.anc] : null; }).filter(Boolean);
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!hxWCan(S)) continue;
    const seed = S.wSeeds && S.wSeeds[k];
    let V = null;
    if (seed != null && S.wRe && S.wRe[k]) {
      const m = await hxwCall('keep', { key: S.key + ':' + k }, [], S.wRe[k]);   // (queued after its render: it waits for the pass to be whole)
      if (m && m.L) { const len = hxPassF(L, k + 1) - hxPassF(L, k), nn = Math.max(len, Math.min(m.L.length, m.n || m.L.length)), [aud] = hxChunks(nn); for (let i = 0; i < nn; i++) { const c = aud[Math.floor(i / HX_CH)], j = i % HX_CH; c[0][j] = m.L[i] || 0; c[1][j] = m.R[i] || 0; } V = { aud, n: nn, len, seed, br: k }; }   // (exactly what was streamed: its end and fade as the sink made them)
    }
    if (!V && S.play === 'wu' && S.wu) V = Object.assign({}, S.wu);
    if (!V) continue;
    const vr = hxEigN(L) >= 2 && S.vc && S.vc.m.get(k);   // (Etappe 3: a varied pass kept – its notes are the anchor's, the next passes vary from them)
    if (vr && vr.n && !(vr.ops.length === 1 && vr.ops[0] === 'nein')) { V.vn = vr.n.map((x) => Object.assign({}, x)); for (const op of vr.ops) if (HX_VW[op]) lobOps.add(op); }
    V.sig = null; S.anc = V; V.sig = hxWSig(L, S); S.ancSaved = 0; hxSaveSch(S, 'x'); n++; sig0[S.key] = V.sig;
  }
  if (!n) { hxHint('Dieser Durchgang ist schon vorbei'); return; }
  for (const op of lobOps) HX.vw[op] = clamp((HX.vw[op] != null ? HX.vw[op] : 1) * 1.15, 0.05, 2);   // (✓ raises the operators it kept, for the session)
  const lk = L.key, after = L.sch.map((id) => { const S = HX.sch.get(id); return S ? [S.key, S.anc] : null; }).filter(Boolean);
  hxHist({ kind: 'wuchs', label: 'Durchgang behalten (' + hxName(L) + ')', undo() { for (const [sk, a] of before) { const S = hxSchByKey(sk); if (S) S.anc = a; } const X = hxByKey(lk); if (X) hxWUpdate(X); }, redo() { for (const [sk, a] of after) { const S = hxSchByKey(sk); if (S) S.anc = a; } const X = hxByKey(lk); if (X) hxWUpdate(X); } });
  hxSay(hxName(L) + ': Durchgang behalten – neuer Anker'); toast(hxName(L) + ': dieser Durchgang ist der Anker.', 2200);
  hxSaveMeta(L.id); hxCardDirty(); hxRailDirty();
}
// ✕: the next pass plays the anchor (or the Treu throw); twice within four bars: Treu for eight bars
function hxWNein(L) {
  L = L || hxWTarget();
  if (!L || !hxWLebt(L)) { hxHint('Nichts zu entscheiden'); return; }
  // (at the next bar line: inside the pass the anchor takes over there, at the same place – the next pass lives again;
  // a bar line that is the seam: the anchor plays that pass)
  const now = hxNowT(), b = tgBeat(now), sw = hxNextSeam(L), nk = sw.k, fb = hxGrid() ? Math.round(hxF(tgBar(now + 0.06))) : sw.f, mid = fb < sw.f - 1;
  L.nein = { k: mid ? nk - 1 : nk };
  if (hxEigN(L) >= 2) L.neinOps = hxVarNein(L, hxPassK(L, Math.round(hxF(hxHeard()))), mid ? nk : nk + 1);   // (Etappe 3: the operators refused count half; the chain begins at the anchor)
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!hxWCan(S)) continue;
    if (!S.anc && S.wu) S.anc = Object.assign({}, S.wu);
    if (!S.anc) continue;
    if (mid) hxWPlay(S, 'anc', fb, true);
    else if (S.wk != null && S.wk >= nk) { hxWStop(S); S.wk = nk; hxWPlay(S, 'anc', sw.f); }
  }
  const t = (L.neinT || []).filter((x) => b - x < 16); t.push(b); L.neinT = t;
  if (t.length >= 2) { L.treuBis = Math.ceil(b / 4) * 4 + 32; L.neinT = []; hxSay(hxName(L) + ': acht Takte Treu'); toast(hxName(L) + ': acht Takte Treu.', 2200); }
  else hxSay(hxName(L) + ': zurück zum Anker');
  hxRailDirty(); hxCardDirty();
}
// ⚓: back to the original at once – the anchor forgotten, Treu, the Abdruck where it may (else its own throw, in the key)
function hxWAnker(L) {
  L = L || hxFok();
  if (!L || !hxWAktiv(L)) { hxHint('Nichts zu entscheiden'); return; }
  const lk = L.key, was = { eig: L.eig, wwhy: Object.assign({}, L.wwhy), anc: L.sch.map((id) => { const S = HX.sch.get(id); return S ? [S.key, S.anc] : null; }).filter(Boolean) };
  const go = (X, w) => { X.eig = w.eig; X.wwhy = Object.assign({}, w.wwhy); for (const [sk, a] of w.anc) { const S = hxSchByKey(sk); if (S) S.anc = a; } const f = Math.round(hxF(hxNowT() + 0.06)); hxWUpdate(X, { f, re: true }); hxSaveMeta(X.id); hxCardDirty(); };
  const to = { eig: 'treu', wwhy: Object.assign({}, L.wwhy, { wahl: false }), anc: was.anc.map(([k]) => [k, null]) };
  go(L, to);
  hxHist({ kind: 'wuchs', label: 'Anker (' + hxName(L) + ')', undo() { const X = hxByKey(lk); if (X) go(X, was); }, redo() { const X = hxByKey(lk); if (X) go(X, to); } });
  hxSay(hxName(L) + ': zurück zum Original');
}

// ---- the card's choices, each a history step: Wiedergabe, Eigensinn, Folgen, Klang, Stufe, Neuer Wurf ----
function hxWSet(L, what, v) {
  const lk = L.key, snap = (X) => ({ live: !!X.live, wahl: !!(X.wwhy && X.wwhy.wahl), eig: X.eig || 'treu', ton: X.ton || 'diatonisch', klang: X.klang || 'eigen', stufe: X.stufe || null, seeds: X.sch.map((id) => { const S = HX.sch.get(id); return S ? [S.key, S.wseed] : null; }).filter(Boolean) });
  const was = snap(L);
  const put = (X, s) => {
    X.wwhy = Object.assign(X.wwhy || {}, { wahl: s.wahl }); X.ton = s.ton; X.klang = s.klang; X.stufe = s.stufe; X.live = !!s.live;   // (step 4: Live)
    for (const [sk, sd] of s.seeds) { const S = hxSchByKey(sk); if (S && S.wseed !== sd) { S.wseed = sd; S.anc = null; } }
    if (X.eig !== s.eig) { if (!hxEigSet(X, s.eig)) hxSay(hxName(X) + ': Eigensinn nach drei Runden'); }
    hxWUpdate(X); hxSaveMeta(X.id); hxCardDirty(); hxRailDirty();
  };
  const to = Object.assign({}, was);
  if (what === 'wahl') { to.wahl = !!v; to.live = false; }
  else if (what === 'live') to.live = !!v;   // (step 4: „Wiedergabe: Live“ – real voices play its notes)
  else if (what === 'eig') to.eig = v;
  else if (what === 'ton') to.ton = v;
  else if (what === 'klang') to.klang = v;
  else if (what === 'stufe') to.stufe = v;
  else if (what === 'wurf') { to.seeds = was.seeds.map(([k]) => [k, ((Math.random() * 2147483646) | 0) + 1]); to.wahl = to.wahl || !hxWAktiv(L); }
  if (what === 'klang' && v !== 'eigen' && !L.P) L.P = Object.assign({}, P);
  put(L, to);
  const W = { live: ['Wiedergabe', to.live ? 'Live' : to.wahl ? 'Wuchs' : 'Abdruck'], wahl: ['Wiedergabe', to.wahl ? 'Wuchs' : 'Abdruck'], eig: ['Eigensinn', HX_EIGW[to.eig]], ton: ['Folgen', to.ton], klang: ['Klang', to.klang === 'eigen' ? 'eigener' : to.klang === 'feld' ? 'Spielfeld' : ENG_NAME[to.klang]], stufe: ['Stufe', to.stufe || 'wie eingestellt'], wurf: ['Neuer Wurf', ''] }[what];
  hxHist({ kind: 'wuchs', label: W[0] + (W[1] ? ' ' + W[1] : '') + ' (' + hxName(L) + ')', undo() { const X = hxByKey(lk); if (X) put(X, was); }, redo() { const X = hxByKey(lk); if (X) put(X, to); } });
  hxSay(hxName(L) + ': ' + W[0] + (W[1] ? ' ' + W[1] : ''));
}
// (owner, 26.10.2026: „Abdruck wird nicht markiert, es hat keine Auswirkung auf den Sound“) Abdruck: the loop as it was
// played – whatever made it grow is set back in one step (its own sound, the notes no longer following the key,
// Eigensinn treu, the notes' tools, Live); only a new tempo or an Auslese keeps it growing, and then it says why
function hxAbdruck(L) {
  const w = L.wwhy || {};
  if (w.tempo) { hxHint(hxName(L) + ' folgt dem neuen Tempo und wächst deshalb – als Abdruck klingt sie nur im Tempo der Aufnahme.'); return false; }
  if (w.ausl) { hxHint(hxName(L) + ' spielt die Auslese – ↶ nimmt sie zurück, dann ist sie wieder ein Abdruck.'); return false; }
  const n0 = HX.hist.length;
  if ((L.klang || 'eigen') !== 'eigen') hxWSet(L, 'klang', 'eigen');
  if (hxWTonOff(L)) hxWSet(L, 'ton', 'fest');
  if ((L.eigWant || L.eig || 'treu') !== 'treu') hxWSet(L, 'eig', 'treu');
  if (hxNtOn(L)) hxNtSet(L, 'zurueck');
  hxWSet(L, 'wahl', false);
  hxHistGroup(n0, 'Wiedergabe Abdruck (' + hxName(L) + ')');
  hxSay(hxName(L) + ': Abdruck – genau wie gespielt');
  return true;
}
// the loop's word for the card and the rail: what it does now
function hxWWord(L) {
  if (L.bew || !L.sch.some((id) => hxWCan(HX.sch.get(id)))) return '';
  if (L.live) return 'live gespielt';   // (step 4: chosen)
  if (!hxWAktiv(L)) return '';
  if (HXW.st === 'kein') return 'live gespielt';   // (Live mode: no Werk-Rahmen)
  const S = L.sch.map((id) => HX.sch.get(id)).filter(hxWCan), busy = S.some((s) => s.wBusy), ready = S.every((s) => s.play === 'wu' || s.play === 'anc');
  if (hxEigN(L) >= 1) { if (hxWHold(L)) return 'spielt den letzten Durchgang – ' + hxGeraet() + ' ist ausgelastet'; if (HX.wGuard.pause > performance.now() || L.wRefused) return 'lebt, sobald Rechenzeit frei ist'; if (L.wMemT && performance.now() - L.wMemT < 5000) return 'lebt, sobald Speicher frei ist (Speichergrenze)'; if (L.treuBis != null) { const n = Math.max(1, Math.min(8, Math.floor((L.treuBis - tgBeat(hxNowT())) / 4 + 0.01))); return 'Treu noch ' + n + (n === 1 ? ' Takt' : ' Takte'); } return ['', 'lebt', 'variiert', 'wandert'][hxEigN(L)]; }
  return busy ? 'wächst …' : ready ? 'Wuchs' : 'wächst …';
}
// can the device keep this loop living? its passes' predicted render time against what the pool can spend
function hxWCanLive(L) {
  const len = Math.max(0.25, hxLen(L));
  let need = 0; for (const id of L.sch) { const S = HX.sch.get(id); if (hxWCan(S)) need += hxWPredict(L, S, len + 4) / len; }
  for (const X of hxLoopsLive()) if (X !== L && hxWLebt(X)) { const lx = Math.max(0.25, hxLen(X)); for (const id of X.sch) { const S = HX.sch.get(id); if (hxWCan(S)) need += hxWPredict(X, S, lx + 4) / lx; } }
  return need <= 0.6 * Math.max(1, HX_WPOOL);
}

// ---- the CPU guard (SPEC §10.5, owner rule): an underrun while Wuchs works first holds the living passes, then lets
// fewer render at once – the live budget and A.lite are never touched for it. → true when the Wuchs took the blame ----
// The hold (Leistung, 23.10.2026 – the owner's report A; since the desktop report 24.10.2026 on every device: the pause
// before switched each living Schicht back to its Treu version at once – a burst of whole versions to the processor while
// it was already late – and stayed, re-armed by every later underrun): a living loop plays its last complete pass on, pass
// after pass, as a Treu loop would (its stream stays, no render starts – not even a Treu one), and the passes not yet heard
// stop rendering at once; it lasts while the device keeps dropping audio (30 s after the last underrun, twice as long when
// it comes back within two minutes, at most four) – then the loop lives again from its next pass.
const HX_PHONE = MOBILE && !HX_TABLET, hxGeraet = () => (HX_PHONE ? 'das Handy' : 'das Gerät');
function hxWGuard() {
  const now = performance.now(), ran = HX.wJobs > 0 || HX.wRen > 0 || (HX.wLast > 0 && now - HX.wLast < 8000);   // (wLast 0: none yet – before, the first 8 s after loading counted as Wuchs work)
  if (!ran) return false;
  const G = HX.wGuard, lebt = hxLoopsLive().some((L) => hxEigN(L) >= 1 && hxWAktiv(L));
  if (lebt && !(G.pause > now)) {
    G.n++;
    G.hold = true; G.span = now - (G.end || -1e9) < 120000 ? Math.min(240000, 2 * (G.span || 30000)) : 30000; G.pause = now + G.span;
    for (const S of HX.sch.values()) if (S.wLive) hxWStop(S);   // (the passes not yet heard: dropped, their renders stopped – the one playing stays)
    hxGuardLog('lebendig', Math.round(G.span / 1000));
    hxSay('Lebendige Schleifen spielen ihren letzten Durchgang weiter – ' + hxGeraet() + ' ist ausgelastet');
    hxCardDirty();
  } else { G.max = Math.max(1, Math.min(G.max === Infinity ? HX_WPOOL : G.max, HX.wJobs || 1) - 1 || 1); hxGuardLog('weniger', G.max); }
  G.t = now;
  return true;
}
// while the hold lasts, every second with underruns keeps it: the loops live again only once the device has
// been clean for the pause's span
function hxWHoldKeep(now) { const G = HX.wGuard; if (G.hold && G.pause > now) G.pause = Math.max(G.pause, now + (G.span || 30000)); }
// a living loop the guard holds: it plays its last complete pass on, no render starts
const hxWHold = (L) => !!HX.wGuard.hold && HX.wGuard.pause > performance.now() && L.state === 'spielt' && hxEigN(L) >= 1 && !L.revW && !L.live && hxWAktiv(L) && !L.wRefused;
// the guard's steps, kept for „Leistung messen“ (which, when, the underruns of that second)
function hxGuardLog(step, v) { lmEv('guard:' + step); const a = HX.gLog || (HX.gLog = []); a.push({ t: performance.now(), step, v: v != null ? v : '' }); if (a.length > 200) a.shift(); }
// (phone) the device drops audio while loops sound and their steps are taken: the live budget and A.lite stay – the
// loops are what costs, and the owner's rule is that they give way, never the live playing. Said once
function hxGuardGrenze() {
  if (!HX_PHONE || !(hxBusy() || (HX.wLast > 0 && performance.now() - HX.wLast < 60000))) return false;
  hxGuardLog('grenze');
  if (!HX.grenzeSaid) { HX.grenzeSaid = true; hxCardDirty(); toast('Das Handy ist mit den Schleifen ausgelastet. Dein Live-Spiel behält alle Stimmen; hältst du eine Schleife an oder schaltest sie stumm, wird es wieder flüssig.', 8000); }
  return true;
}

// ---- the guard's second step (phone report 22.10.2026; every device since the desktop report 24.10.2026): the device
// still drops audio while loops play and the Wuchs is not (or no longer) to blame – Taumeln rests: every Schicht is read
// as recorded, frame for frame, instead of through the resampler (its 32 taps per frame and Schicht are the dearest part
// of a loop on the audio thread: measured 0.8 % of a desktop core per loop, on a phone four to six times that; offline, 6
// loops of 2 Schichten: 0.45 → 0.08 ms of the processor per quantum). The loops keep the tuning they were played in (a few
// cents against a live note that drifts); said once, shown in the card; a tap on „mit“ there brings it back for all of
// them (and the guard may step again). On a computer or an iPad it also comes back by itself once the device has been
// clean for the span (30 s, doubled when it returns within two minutes, ≤ 4 min – hxTauBack); on a phone it stays. ----
function hxTauGuard() {
  if (HX.tauRest || !(P['mov.drift'] > 0)) return false;
  const list = hxLoopsLive().filter((L) => !L.bew && L.taumeln !== false);
  if (!list.some((L) => L.state === 'spielt')) return false;
  HX.tauRest = true; hxGuardLog('taumeln');
  for (const L of list) { hxPost({ tau: { loop: L.id, on: false } }); hxTauOrig(L); }
  hxCount(); hxCardDirty();
  const T = HX.tauG || (HX.tauG = { span: 0, end: -1e9 }), now = performance.now();
  if (!HX_PHONE) T.span = now - T.end < 120000 ? Math.min(240000, 2 * (T.span || 30000)) : 30000;
  hxSay('Schleifen bleiben in ihrer Stimmung – ' + hxGeraet() + ' ist ausgelastet');
  if (HX_PHONE || !HX.tauSaid) { HX.tauSaid = true; toast((HX_PHONE ? 'Das Handy' : 'Das Gerät') + ' kam beim Abspielen der Schleifen an seine Grenze: Sie bleiben ' + (HX_PHONE ? 'jetzt' : 'eine Weile') + ' in ihrer Stimmung (Taumeln ruht). In der Karte unter „Aufnahme“ holt „mit“ es zurück.', 7000); }
  return true;
}
// (a computer or an iPad) Taumeln back by itself once the device has been clean for the span – as „mit“ does it
function hxTauBack(now) {
  if (HX_PHONE || !HX.tauRest || !HX.tauG || now - GD.uT < HX.tauG.span) return;
  HX.tauRest = false; HX.tauG.end = now; hxGuardLog('taumelt');
  for (const X of hxLoopsLive()) if (!X.bew && X.taumeln !== false) hxPost({ tau: { loop: X.id, on: true } });
  hxCount(); hxCardDirty();
}
const hxTauOn = (L) => L.taumeln !== false && !HX.tauRest;   // (what the processor is told: the loop's choice, unless the guard let it rest)

// ---- (step 2a) Live mode (SPEC §10.6) – only where there is no Werk-Rahmen (a sandbox without frames): a loop that must
// grow plays its notes through real voices, scheduled ahead in the scheduler's tick as the Puls's are, into the live
// chain's copy and the strip „Hexenring“ (no tap hears them). Its Abdruck rests meanwhile. They cost what voices cost and
// give way before any live note – a loop's note that does not fit the budget is not played (owner: never the live ones).
// Lebendig: every pass its own randomness (the voices' own) and its breath; ✓ ✕ ⚓ need rendered passes (Werk-Rahmen). ----
const hxWLm = (L) => !L.bew && L.state !== 'weg' && (L.live ? L.sch.some((id) => hxWCan(HX.sch.get(id))) : HXW.st === 'kein' && hxWAktiv(L));   // (step 4: or chosen – „Wiedergabe: Live“)
function hxWLiveSync(L) {
  const on = hxWLm(L) && L.state === 'spielt', sw = hxNextSeam(L);
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!hxWCan(S)) continue;
    if (on && !S.lm) { S.lm = true; S.lk = sw.k - 1; hxGain({ schicht: S.id }, 0, hxT(sw.f), 0.01); }
    else if (!on && S.lm) { S.lm = false; hxGain({ schicht: S.id }, S.mute ? 0 : S.gain, hxT(sw.f), 0.01); }
  }
}
function hxWLiveTick(now, horizon) {
  const fA = hxF(now + 0.005), fB = hxF(horizon), out = () => (hxOut1(), hxChain('fx1').in);
  for (const L of hxLoopsLive()) {
    if (L.bew) continue;
    if (!!hxWLm(L) !== L.sch.some((id) => { const S = HX.sch.get(id); return S && S.lm; })) hxWLiveSync(L);
    for (const id of L.sch) {
      const S = HX.sch.get(id); if (!S || !S.lm || L.state !== 'spielt') continue;
      if (S.mute) { S.lk = Math.max(S.lk, hxPassK(L, Math.round(fB))); continue; }
      for (let k = Math.max(S.lk + 1, hxPassK(L, Math.round(fA))); hxPassF(L, k) < fB; k++) {
        const job = hxWPass(L, S, k, { live: hxEigN(L) >= 1, tail: 0 }); S.lk = k;
        if (!job) break;
        const t0 = hxT(hxPassF(L, k));
        for (const n of job.notes) {
          const t = t0 + n.t0; if (t < now || n.eng === 'bor') continue;
          const o = { pan: n.pan || 0, bus: out(), loop: true, hxSrc: 'hxr' }, E = ENGINES[n.eng]; if (!E) continue;   // (step 4: hxSrc – before, the chain's copy was no strip, so they counted as the field's notes in the Humus)
          // (a held note's length as the engine's own gate – it lets go on time; struck ones ring)
          // (owner, 26.10.2026: „der Klang der Schleife ändert sich mit dem gewählten Preset“) a loop in its own sound plays
          // its notes with the source's settings it was recorded with, not the preset's now (P borrowed for the start)
          const own = (L.klang || 'eigen') === 'eigen' && L.P ? hxWOwnP(L.P, n.eng) : null;
          const g = n.t1 != null ? n.t1 - n.t0 : null, v = own ? hxWWithP(own, () => hxWLiveNote(n, E, t, o, g)) : hxWLiveNote(n, E, t, o, g);
          if (!v) continue;
          if ((L.klang || 'eigen') === 'eigen') v.hxOwn = true;   // (a knob turned now does not reach it: controls.js)
          for (const [tc, y] of n.curves.y) HX.wLq.push([t0 + tc, () => v.alive && v.setY && v.setY(y)]);
          for (const [tc, f] of n.curves.f) HX.wLq.push([t0 + tc, () => v.alive && v.setF && v.setF(f, P['v.glide'])]);
        }
      }
    }
  }
  if (HX.wLq.length) { const due = HX.wLq.filter((x) => x[0] <= now + 0.012); if (due.length) { HX.wLq = HX.wLq.filter((x) => x[0] > now + 0.012); for (const [, fn] of due) try { fn(); } catch (e) {} } }
}
// the settings of a source (its own parameters: 'hng.glanz' …) from a loop's patch, where they differ from now
function hxWOwnP(LP, eng) { const o = {}, pre = eng + '.'; let n = 0; for (const id in LP) if (id.startsWith(pre) && PD[id] && LP[id] !== P[id]) { o[id] = LP[id]; n++; } return n ? o : null; }
function hxWWithP(o, fn) { const keep = {}; for (const id in o) { keep[id] = P[id]; P[id] = o[id]; } try { return fn(); } finally { for (const id in keep) P[id] = keep[id]; } }
function hxWLiveNote(n, E, t, o, g) {
  return n.burst || (E.sustain && g != null) ? playNote(n.eng, t, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, Object.assign(o, { burst: true, gate: n.burst ? n.gate || 0.22 : g })) : E.sustain ? playNote(n.eng, t, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, o) : hit(n.eng, t, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, o);
}
HX.wLq = [];
// the Bühnenansicht's rail: big rings, the pedals' legend on the Taktlinie (what each switch does, from the profile learned)
function hxBuehneSync() {
  if (!HXU.rail) return;
  const on = !!P['hx.buehne'];
  if (HXU.rail.dataset.buehne !== (on ? '1' : '0')) { HXU.rail.dataset.buehne = on ? '1' : '0'; HXU.w = 0; hxRailDirty(); }
  if (!HXU.leg) { HXU.leg = h('span', { class: 'hx-leg', 'aria-hidden': 'true' }); HXU.rail.append(HXU.leg); }
  const o = on ? hxPedGet() : null, pr = o && HX_PEDP[o.prof], t = pr ? pr.sw.map((x) => x[0] + ' ' + x[3].split(' · ')[0]).join(' · ') : on ? 'Pedale: in der Karte zuweisen' : '';
  if (HXU.leg.textContent !== t) HXU.leg.textContent = t;
}
function hxBuehneHint(b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 600); }

