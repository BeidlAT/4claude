// ---- the Fährte's retirement (SPEC §18): its button, tag, panel and tap/hold/double-tap paths are gone; its clock is
// the Taktgeber's, its lanes are the Humus's Bewegung. A loop of Bewegung is a Schleife now – one with no audio, only
// lanes (Formen deflections; a knob's lane relative to where it was left; the finger's height; Gestik's functions),
// laid on the mod layer half a second ahead while it plays, in beats, its strength falling by its Verblassen per pass.
// The Korb takes one when the Humus heard nothing but movement; an old preset or scene with a Fährte loop brings one.
// Which lanes replay live: only a Schleife of Bewegung's (moving the instrument is all it is). An audio Schleife never
// moves the live instrument: its voice lanes are in its audio (they drive its notes in Wuchs, 2a), its chain lanes are
// baked into it (or it follows the live chain), echo, hall and the morph act on the whole mix and stay the player's. ----
const hxBewA = (L) => Math.round(L.d.b0 * FA_R);   // (its step 0: the continuous beat of pass 0)
const hxBewGain = (L, b) => { const B = L.bew, n = B.n / FA_R; return b <= B.gs ? B.g0 : B.g0 * Math.pow(B.fade, (b - B.gs) / n); };
// is it sounding at audio time t (its state then – a switch waits for its moment), and how strong the form lets it be
function hxBewOn(L, t) {
  const ev = L.bew.ev; let on = L.bew.on0;
  if (ev) for (const x of ev) { if (x.t > t) break; on = x.on; }
  if (!on) return 0;
  const Lu = HX.luecke; if (Lu && t >= Lu.t0 && t < Lu.t1) return 0;
  const S = HX.schluss; if (S && S.kind === 'welkend' && S.wt) { const x = clamp((t - S.wt[0]) / Math.max(0.01, S.wt[1] - S.wt[0]), 0, 1); return x >= 1 ? 0 : Math.cos(HXP_HP * x); }
  return 1;
}
// (hxState's hook: a Schleife of Bewegung remembers when its state changes, so its points follow the switch's moment –
// in the order of their moments, as the processor applies them)
function hxBewState(L, to, at) {
  const B = L.bew, t = at != null ? at : tgNow(), old = tgNow() - 30;
  B.ev = B.ev.filter((x) => { if (x.t < old) { B.on0 = x.on; return false; } return true; });
  let i = B.ev.length; while (i > 0 && B.ev[i - 1].t > t) i--;
  B.ev.splice(i, 0, { t, on: to === 'spielt' });
  B.re = true;
}
// every scheduler tick: each playing Schleife of Bewegung lays its points up to `until` (again from now when the clock or
// its state moved); a silent one leaves the layer; a strength under 4 % ends it (angehalten)
function hxBewLay(now, until) {
  const re = HX.bewRe; HX.bewRe = false;
  for (const L of HX.loops.values()) {
    const B = L.bew; if (!B || L.state === 'weg') continue;
    const pre = 'hxb' + L.id + ':';
    const sA = Math.ceil(faeB(now) * FA_R), sB = Math.floor(faeB(until) * FA_R), gkOff = !GK.on, a = hxBewA(L);
    // (laid anew from now when its state moved, or when the clock moved the points ahead from where they were laid – a
    // device's clock nudges its tempo with every pulse: while that stays under half a millisecond, they stay)
    let s = B.re || B.next == null || (re && (B.nt == null || Math.abs(faeT(B.next / FA_R) - B.nt) > 5e-4)) ? sA : Math.max(B.next, sA), any = false;
    B.re = false;
    for (; s <= sB; s++) {
      const b = s / FA_R, t = faeT(b), on = hxBewOn(L, t), g = hxBewGain(L, b) * on;
      if (hxBewGain(L, b) < FA_END) { hxState(L.id, 'angehalten', t); HX.ruht = true; hxRailDirty(); break; }
      const p = faeMod(s - a, B.n);
      for (const ln of B.lanes) { if (gkOff && ln.src.startsWith('gk:')) continue; ln.o.at = t; modSet(pre + ln.k + '|' + ln.src, ln.k, ln.v[p] * g, ln.o); }
      if (on) any = true;
    }
    B.next = s; B.nt = faeT(s / FA_R);
    if (!any && L.state !== 'spielt' && B.live && !(B.ev || []).some((x) => x.t > now && x.on)) { modClear(pre + '*'); B.live = false; }
    else if (any) B.live = true;
    // points behind the clock go (the audio targets drop theirs themselves); the one just before now stays
    for (const ln of B.lanes) { const T = MOD.t[ln.k], e = T && T.s.get(pre + ln.k + '|' + ln.src); if (e && e.p) while (e.p.length > 2 && e.p[1][0] < now - 0.1) e.p.shift(); }
  }
}
function hxBewGkOff() { for (const L of HX.loops.values()) if (L.bew) for (const ln of L.bew.lanes) if (ln.src.startsWith('gk:')) modClear('hxb' + L.id + ':' + ln.k + '|' + ln.src); }
const hxBewDisp = () => { let b = null; for (const L of hxLoopsLive()) if (L.bew && L.bew.disp && L.state === 'spielt' && (!b || L.made > b.made)) b = L; return b; };
// a Schleife of Bewegung in a slot: cut = {lanes: [{k, src, v}], disp, n, g}; b0 the musical beat of its pass 0
function hxBewMake(cut, o) {
  const slot = o.slot != null && !HX.slot[o.slot] ? o.slot : hxZiel();
  if (slot < 0) { toast('Alle ' + HX_SLOTS + ' Plätze sind belegt – lösche eine Schleife in ihrer Karte.', 4000); return null; }
  const L = hxLoopMake({ slot, key: o.key, lock: 'takt', b0: o.b0, beats: cut.n / FA_R, bpb: 4, notes: [], mv: null, eng: 'bew', state: o.state || 'spielt', fokus: false, gain: 1, eig: o.eig });
  L.bew = { lanes: cut.lanes.map((x) => ({ k: x.k, src: x.src, v: x.v, o: Object.assign({ at: 0 }, faeOpts(x.src)) })), disp: cut.disp || null, n: cut.n, g0: cut.g != null ? cut.g : 1, gs: o.gs != null ? o.gs : L.d.b0, fade: o.fade != null ? o.fade : 1, why: o.why || 'korb', next: null, re: true, on0: (o.state || 'spielt') === 'spielt', ev: [] };
  HX.bewKey = L.key;
  hxStripSync(); hxRailDirty(); hxCardDirty(); hxSaveMeta(L.id);
  return L;
}
// the Korb with nothing heard but movement: the bars of Bewegung up to the bar line (the Korb's grid rule: within ⅛ bar
// after one, those before it, at once; later, those up to the next one, entering there) – 2 bars, or the set length
function hxBewPlan(T) {
  if (!FA.lanes.size) return null;
  const N = P['hx.laenge'] === 'fest' ? P['hx.festT'] : P['hx.laenge'] === 'wie1' && hxLoopsLive().some(hxTakt) ? Math.max(1, Math.round(hxLoopsLive().filter(hxTakt).sort((a, b) => a.made - b.made)[0].d.beats / 4)) : 2;
  const B = hxBarOf(T, HX_GRACE), E = B.b, a = Math.round((E - 4 * N + TG.o) * FA_R), e = Math.round((E + TG.o) * FA_R);
  const seen = Math.min(e, Math.floor(faeB(faeNow() - faeShift(true)) * FA_R));
  if (seen - a < FA_R || !faeCut(a, seen)) return null;
  return { kind: 'bew', a, e, E, N, entry: { b: E, t: tgTime(E), now: B.now }, label: 'Bewegung · ' + N + ' T', light: false, w0: tgTime(E - 4 * N), w1: tgTime(E) };
}
function hxBewHarvest(plan, o = {}) {
  if (plan.kind !== 'bew') return null;
  const slot = o.slot != null && !HX.slot[o.slot] ? o.slot : hxZiel();
  if (slot < 0) { toast('Alle ' + HX_SLOTS + ' Plätze sind belegt – lösche eine Schleife in ihrer Karte.', 4000); return null; }
  // made at once (its ring and its entry); its lanes once all is written down (Gestik's lanes lag by the sensor's delay)
  const n = plan.e - plan.a, L = hxBewMake({ lanes: [], disp: null, n }, { slot, b0: plan.E, why: o.why || 'korb' }), key = L && L.key;
  if (!L) return null;
  L.step = { kind: 'neu', label: hxName(L) + ' geerntet (Bewegung)', snaps: [], undo() { const X = hxByKey(key); if (X) { this.snaps = [hxSnap(X)]; hxDrop(X); } }, redo() { if (this.snaps[0]) hxRebuild(this.snaps[0]); } };
  hxHist(L.step);
  if (!plan.entry.now && plan.entry.t > hxNowT()) hxPendAdd({ kind: 'ernte', loop: L.id, t: plan.entry.t, b: plan.entry.b, label: 'ab Takt ' + hxBarNo(plan.entry.b), cancel: () => hxUnmake(hxByKey(key)) });
  const fill = () => {
    const X = hxByKey(key); if (!X) return;
    if (!faeReady(plan.e / FA_R)) { setTimeout(fill, 40); return; }
    const cut = faeCut(plan.a, plan.e);
    if (!cut) { hxUnmake(X); toast('In ' + (plan.N === 1 ? 'diesem Takt' : 'diesen ' + plan.N + ' Takten') + ' hat sich nichts bewegt, was den Klang formt.', 3500); return; }
    X.bew.lanes = cut.lanes.map((x) => ({ k: x.k, src: x.src, v: x.v, o: Object.assign({ at: 0 }, faeOpts(x.src)) })); X.bew.disp = cut.disp || null; X.bew.re = true;
    hxSaveMeta(X.id); hxCardDirty(); hxRailDirty();
  };
  fill();
  HX.lastHarvest = { key, w0: plan.w0, w1: plan.w1, t: hxNowT() };
  hxCoachDone();
  hxSay(hxName(L) + ': Bewegung, ' + plan.N + (plan.N === 1 ? ' Takt' : ' Takte') + (plan.entry.now ? '' : ', ab Takt ' + hxBarNo(plan.entry.b)));
  return L;
}
// „nur Bewegung“ (a chip after a harvest whose window holds Bewegung): that window once more as a Schleife of Bewegung,
// in the harvested one's place – a lean, a knob, the finger's height looped onto what is played live, as the Fährte did;
// the sound goes (↶ brings it back). The same window as the sound's (read the Spielverzögerung later, as it was).
function hxBewWin(L) {
  const H = HX.lastHarvest;
  if (!L || L.bew || L.sch.length !== 1 || !H || H.key !== L.key) return null;
  const lat = L.lat || 0, a = Math.round(faeB(H.w0 + lat) * FA_R), e = Math.round(faeB(H.w1 + lat) * FA_R);
  // (its step 0 where the sound's pass 0 began: a Takt one's bar line, a free one's entry – its beats as long as it was)
  return e - a >= FA_R ? { a, e, b0: (hxTakt(L) ? L.d.b0 : faeB(hxT(L.d.ph0))) - TG.o } : null;
}
function hxBewHas(L) { const w = hxBewWin(L), e = w && Math.min(w.e, Math.floor(faeB(faeNow() - faeShift(true)) * FA_R)); return !!(w && e - w.a >= FA_R && faeCut(w.a, e)); }   // (what is written down of its window so far)
function hxBewOnly(L) {
  const w = hxBewWin(L); if (!w) return null;
  const key = L.key;
  if (!faeReady(w.e / FA_R)) { setTimeout(() => { const X = hxByKey(key); if (X) hxBewOnly(X); }, 40); return null; }
  const cut = faeCut(w.a, w.e);
  if (!cut) { toast('In diesen Takten hat sich nichts bewegt, was den Klang formt.', 3500); return null; }
  const snap = hxSnap(L), slot = L.slot, st = L.state, pend = HX.pend.find((p) => p.kind === 'ernte' && p.loop === L.id);
  hxUnmake(L);
  HX.chips = null; HX.keepT = null; TG.keep = false;   // (the sound's Schleife gone, the tempo it gave stays: the Bewegung lives in it)
  const B = hxBewMake(Object.assign(cut, { n: w.e - w.a }), { slot, b0: w.b0, why: 'korb', state: st });
  if (!B) { hxRebuild(snap); return null; }
  const bk = B.key;
  B.step = { kind: 'neu', label: hxName(B) + ': nur Bewegung', snaps: [], undo() { const X = hxByKey(bk); if (X) { this.snaps = [hxSnap(X)]; hxDrop(X, 0.01); } hxRebuild(snap); }, redo() { const X = hxByKey(snap.key); if (X) hxDrop(X, 0.01); if (this.snaps[0]) hxRebuild(this.snaps[0]); } };
  hxHist(B.step);
  if (pend) hxPendAdd({ kind: 'ernte', loop: B.id, t: pend.t, b: pend.b, label: pend.label, cancel: () => hxUnmake(hxByKey(bk)) });
  hxSay(hxName(B) + ': nur die Bewegung, ' + hxBewNames(B).join(', '));
  hxRailDirty(); hxCardDirty();
  return B;
}
// presets, scenes, undo: the Schleife of Bewegung they speak for (the newest) as the Fährte's data, and back – a loaded
// one starts on the current bar, as strong as it was saved, in the place of the one it replaces; null: that one goes
function hxBewExport() {
  const L = hxByKey(HX.bewKey); if (!L || !L.bew || !L.bew.lanes.length) return null;
  const B = L.bew, g = A.ctx ? hxBewGain(L, faeB(A.ctx.currentTime)) : B.g0, disp = {};
  if (B.disp) for (const k in B.disp) disp[k] = faeEnc(B.disp[k]);
  return { v: 1, R: FA_R, n: B.n, g: Math.round(clamp(g, FA_END, 1) * 1000) / 1000, lanes: B.lanes.map((ln) => ({ k: ln.k, s: ln.src, d: faeEnc(ln.v) })), disp };
}
function hxBewImport(o, why) {
  const old = hxByKey(HX.bewKey);
  if (!o) { if (old && old.bew) hxDrop(old, 0.01); return true; }
  const d = faeDecode(o);
  if (!d || !A.ctx || !HX.node) return false;
  const b = Math.floor(tgBeat(A.ctx.currentTime) / 4 + 1e-9) * 4, slot = old && old.bew ? old.slot : null;
  if (old && old.bew) hxDrop(old, 0.01);
  const L = hxBewMake(d, { slot, b0: b, gs: faeB(A.ctx.currentTime), fade: FA.p.fade, why });
  return !!L;
}
// its words in the card: what it moves
const hxBewNames = (L) => [...new Set(L.bew.lanes.map((ln) => (ln.src === 'y' ? 'Fingerhöhe' : ln.src.startsWith('p:') ? (ln.src === 'p:morph' ? 'A/B-Morph' : (PD[ln.src.slice(2)] || {}).label || ln.src) : (MODT[ln.k] ? MODT[ln.k].label.replace(/ \(.*$/, '') : ln.k))))];
// the old bindings of the Fährte's targets become the Hexenring's (SPEC §17): fae, fae.take → Korb; fae.rec → Hauptknopf;
// fae.clear → ↶; and „Hinlegen wird Schleife“ (an old device setting) → a binding of Ruhe to the Korb's „Hinlegen erntet“
function hxHinOn() { return MAP.user.some((b) => b.type === 'gest' && b.num === 1 && b.target === 'hx.hin'); }
function hxHinSet(on) {
  MAP.user = MAP.user.filter((b) => !(b.type === 'gest' && b.num === 1 && b.target === 'hx.hin'));
  if (on) MAP.user.push({ dev: 'Gestik', ch: -1, type: 'gest', num: 1, target: 'hx.hin', mode: 'trigger', name: 'Hinlegen' });
  mapSave(); hxCardDirty();
  hxSay(on ? 'Hinlegen erntet' : 'Hinlegen erntet nicht');
}
if (!HXW.on && FA.p.hin) { if (!hxHinOn()) hxHinSet(true); FA.p.hin = false; faeSave(); }   // (once: the old setting became a binding)
// the Bewegung settings in the card: the Feinregler of the delay (± 20 ms) and „Hinlegen erntet“ where Gestik can be
function hxCardBew() {
  const box = HXK.bew; if (!box) return;
  const tr = h('input', { type: 'range', min: -20, max: 20, step: 1, value: FA.p.trim, 'aria-label': 'Bewegung: Feinregler der Verzögerung, in Millisekunden' }), to = h('span', { class: 'val' });
  const tSync = () => { to.textContent = (FA.p.trim > 0 ? '+' : FA.p.trim < 0 ? '−' : '±') + Math.abs(FA.p.trim) + ' ms'; tr.style.setProperty('--p', ((FA.p.trim + 20) / 40) * 100 + '%'); };
  tr.addEventListener('input', () => { FA.p.trim = +tr.value; faeSave(); tSync(); }); tSync();
  const c = A.ctx, out = c ? Math.round(((c.baseLatency || 0) + (c.outputLatency || 0) + graphLatency()) * 1000) : null;
  const kids = [h('div', { class: 'kc-rng' }, h('span', null, 'Bewegung'), tr, to),
    h('p', { class: 'note' }, 'Der Humus schreibt Bewegung mit (Gestik, Regler auf „Formen“, die Fingerhöhe, Filter, Echo, Hall, der A/B-Morph) – früher gelegt um die Ausgabe' + (out != null ? ' (' + out + ' ms)' : '') + ', bei Gestik auch um den Sensor; der Feinregler gleicht den Rest aus. Hörte der Humus nur Bewegung, erntet der Korb sie als Schleife.')];
  if (gkExists() || GK.on) kids.push(h('div', { class: 'kc-opts' }, kcSwitch('Hinlegen erntet', hxHinOn(), (v) => hxHinSet(v), { aria: 'Hinlegen erntet: legst du das Gerät ab (Ruhe), tippt das den Korb', key: 'hx:hin' })),
    h('p', { class: 'note' }, 'Mit Gestik: legst du das Gerät ab (Ruhe), erntet der Korb, was du davor gespielt hast. Zuerst aus – oft legt man es nur ab, um ans Keyboard zu greifen.'));
  box.replaceChildren(...kids);
}

