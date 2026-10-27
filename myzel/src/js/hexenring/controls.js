// ---- controls (SPEC §17): everything a controller, a pedal or a key can do here is a target of the one registry; a
// control's press acts at its arrival time (heard time, as a finger's press) ----
const hxEvOf = (cx, k) => ({ pointerId: 'c:' + k + ':' + (cx && cx.src ? cx.src.key : 'k'), timeStamp: (cx && cx.ev && cx.ev.t) || performance.now() });
const HXKB = { h: null, s: null, b: null, d: null };
// the Korb as a switch: a tap harvests at the press; held 0.5 s – only while what the tap did is silent or still waits
// (the pedal rule) – it takes that back and layers what you play into the Fokus while held, from the press on
function hxKorbPress(e) {
  if (!A.started || !HX.node) { midiHint(); return; }
  if (HXKB.h) hxKorbRelease(e);
  const T = hxHeard(e), n = HX.hist.length, F0 = hxFok();   // (the Fokus before the press: a harvest makes its own the Fokus)
  hxKorb(e);
  const made = HX.hist.length > n, p = made ? HX.pend.find((x) => x.kind === 'ernte' || x.kind === 'schicht') : null;
  const H = (HXKB.h = { T, pid: e.pointerId, silent: !made || !!p, p, step: made ? HX.hist[HX.hist.length - 1] : null });
  H.tm = setTimeout(() => {
    if (HXKB.h !== H || !H.silent || HX.rec || HX.punch) return;
    if (H.p && HX.pend.includes(H.p)) { hxPendDrop(H.p); H.p.cancel(); }
    const F = F0 && F0.state !== 'weg' && F0.slot != null ? F0 : hxFok();
    if (!F) return;
    HX.fokus = F.id;
    hxPunchStart(F, H.T, { pointerId: H.pid });
    if (HX.punch) HX.punch.korb = true;
  }, HX_HOLD * 1000);
}
function hxKorbRelease(e) {
  const H = HXKB.h; HXKB.h = null;
  if (H) clearTimeout(H.tm);
  if (HX.punch && HX.punch.korb) hxPunchEnd(hxHeard(e));
}
// a retro Schicht into the Fokus: the pass decided at the press (KONZEPT §2.4), committed at the release – silent till then
function hxSchichtAt(T) {
  const F = hxFok();
  if (!F) { toast('Keine Schleife im Fokus.', 2000); return null; }
  const plan = hxRetroPlan(F, T);
  if (!plan) { toast('So weit reicht der Humus nicht zurück.'); return null; }
  return hxRetroDo(plan);
}
// pedal B (two switches): a tap = the pass becomes a Schicht in the Fokus (at the release); held 0.5 s = ↶, each further
// hold one step deeper
function hxPedB(down, e) {
  if (down) { const B = (HXKB.b = { T: hxHeard(e), held: false }); B.tm = setTimeout(() => { if (HXKB.b === B) { B.held = true; hxUndoStep(); } }, HX_HOLD * 1000); return; }
  const B = HXKB.b; HXKB.b = null;
  if (!B) return;
  clearTimeout(B.tm);
  if (!B.held) hxSchichtAt(B.T);
}
// pedal D (three, four switches): a tap = the next Lichtung (it waits for the 1 – silent); held 1.5 s = Schluss instead
function hxPedD(down) {
  if (down) { const did = hxFormTap(), D = (HXKB.d = { did }); D.tm = setTimeout(() => { if (HXKB.d !== D) return; D.held = true; if (D.did === 'go') { const p = HX.pend.find((x) => x.kind === 'licht'); if (p) { hxPendDrop(p); p.cancel(); } } hxSchluss(); }, HX_CLEAR_HOLD * 1000); return; }
  const D = HXKB.d; HXKB.d = null;
  if (D) clearTimeout(D.tm);
}
// a loop's ring as a switch of a controller: R on the nanoKONTROL2 – empty: record, recording: close, playing: overdub on
// or off (a punch into it, from the press)
function hxRingRec(slot, e) {
  const L = HX.loops.get(HX.slot[slot]);
  if (HX.punch) { const was = HX.punch.loop; hxPunchEnd(hxHeard(e)); if (L && was === L.id) return; }
  if (!L || (HX.rec && HX.rec.slot === slot)) { hxRingTap(slot, e); return; }
  if (L.state === 'spielt' && !L.bew) { HX.fokus = L.id; hxPunchStart(L, hxHeard(e), null); hxRailDirty(); }
  else hxRingTap(slot, e);
}
// solo: the others stumm at the bar line; again: they come back (the states before it)
function hxRingSolo(slot, e) {
  const L = HX.loops.get(HX.slot[slot]); if (!L) return;
  if (HX.solo && HX.solo.id === L.id) { const S = HX.solo; HX.solo = null; for (const [k, st] of S.was) { const X = hxByKey(k); if (X && X.id !== L.id && st === 'spielt' && X.state === 'stumm') hxRingTap(X.slot, e); } hxSay(hxName(L) + ': Solo aus'); return; }
  HX.solo = { id: L.id, was: hxLoopsLive().map((X) => [X.key, X.pendTo || X.state]) };
  for (const X of hxLoopsLive()) { const st = X.pendTo || X.state; if (X === L ? st === 'stumm' : st === 'spielt') hxRingTap(X.slot, e); }
  hxSay(hxName(L) + ' solo');
}
// ■ / ▶ of a transport: every Schleife ends at its next bar line (its Ausklang rings) / every angehalten one begins on the next 1
function hxAlleEnde() {
  const live = hxLoopsLive().filter((L) => (L.pendTo || L.state) === 'spielt' || L.state === 'stumm');
  if (!live.length) return;
  const W = hxLichT('takt'), f = Math.round(hxF(W.t));
  for (const L of live) { const sf = hxPassF(L, hxPassK(L, f - 1) + 1); if (Math.abs(sf - f) <= 1 || L.state === 'stumm' || L.bew) hxState(L.id, 'angehalten', W.t); else { hxPost({ state: { loop: L.id, to: 'angehalten', f, tail: Math.round(hxSlpTail(L, f) * SR) } }); L.state = 'angehalten'; hxCount(); } L.pendTo = null; }
  HX.ruht = true; hxSay('Alle Schleifen enden' + (W.b != null ? ' mit Takt ' + hxBarNo(W.b) : '')); hxRailDirty(); hxCardDirty();
}
const hxLvlN = (g) => (g <= 0 ? 0 : mxPos(gainToDb(g)));   // (a loop's level on the console's fader law, as a hardware fader reads it)
const hxLvlG = (n) => { const db = mxDb(n); return db <= -59.6 ? 0 : dbToGain(db); };
const hxRingL = (i) => HX.loops.get(HX.slot[i]) || null;
const hxHint = (t) => { hxSay(t); toast(t, 2000); };
{
  const G = 'Hexenring', btn = (fn) => (v) => { if (v >= 0.5 && A.started && HX.node) fn(); };
  midiTarget('hx.korb', 'Korb: ernten (halten: Schichten, solange gehalten)', null, { group: G, press: (v, cx) => hxKorbPress(hxEvOf(cx, 'korb')), release: (cx) => hxKorbRelease(hxEvOf(cx, 'korb')) });
  midiTarget('hx.haupt', 'Hauptknopf (halten: aufnehmen, solange gehalten)', null, { group: G, press: (v, cx) => { if (A.started && HX.node) hxHaupt(hxEvOf(cx, 'haupt')); }, release: (cx) => hxHauptUp(hxEvOf(cx, 'haupt')) });
  midiTarget('hx.schicht', 'Durchgang als Schicht in den Fokus (beim Loslassen)', null, { group: G, press: (v, cx) => { if (!A.started || !HX.node) return; const T = hxHeard(hxEvOf(cx, 'schicht')); if (cx && cx.b && cx.b.mode === 'trigger') hxSchichtAt(T); else HXKB.s = T; }, release: () => { const T = HXKB.s; HXKB.s = null; if (T != null) hxSchichtAt(T); } });
  midiTarget('hx.pedb', 'Pedal B: tippen Schicht, halten Zurück', null, { group: G, press: (v, cx) => { if (A.started && HX.node) hxPedB(true, hxEvOf(cx, 'pedb')); }, release: () => hxPedB(false) });
  midiTarget('hx.pedd', 'Pedal D: tippen nächste Lichtung, lange halten Schluss', null, { group: G, press: () => { if (A.started && HX.node) hxPedD(true); }, release: () => hxPedD(false) });
  midiTarget('hx.zurueck', 'Hexenring: Zurück (↶)', btn(hxUndoStep), { group: G, button: true });
  midiTarget('hx.wieder', 'Hexenring: Wiederholen (↷)', btn(hxRedoStep), { group: G, button: true });
  midiTarget('hx.leeren', 'Hexenring: alle Schleifen leeren', btn(hxLeeren), { group: G, button: true });
  midiTarget('hx.form', 'Nächste Lichtung (an der nächsten Eins)', btn(hxFormTap), { group: G, button: true });
  midiTarget('hx.licht.prev', 'Vorige Lichtung', btn(() => hxLichStep(-1)), { group: G, button: true, step: (d) => hxLichStep(-Math.sign(d)) });
  midiTarget('hx.licht.next', 'Nächste Lichtung', btn(() => hxLichStep(1)), { group: G, button: true, step: (d) => hxLichStep(Math.sign(d)) });
  midiTarget('hx.merken', 'Lichtung merken (welche Schleifen jetzt klingen)', btn(hxLichMerken), { group: G, button: true });   // (27.10.2026: sown into the Wurzelwerk, also for MIDI)
  midiTarget('hx.luecke4', 'Takt-Lücke vor der nächsten Eins', btn(() => hxLuecke(4)), { group: G, button: true });
  midiTarget('hx.kern', 'Kern (hin und zurück, auf der Eins)', btn(hxKern), { group: G, button: true });
  midiTarget('hx.luecke', 'Lücke vor der nächsten Eins', btn(() => hxLuecke()), { group: G, button: true });
  midiTarget('hx.schluss', 'Schluss', btn(() => hxSchluss()), { group: G, button: true });
  midiTarget('hx.alle.ende', 'Alle Schleifen enden am Takt', btn(hxAlleEnde), { group: G, button: true });
  midiTarget('hx.alle.an', 'Alle Schleifen beginnen am Takt (Weiter)', btn(hxWeiter), { group: G, button: true });
  // ✓ ✕ ⚓ answer what the machine plans (Knospen, Etappe 3); until then there is nothing to decide
  midiTarget('hx.lob', 'Behalten (✓)', btn(() => { if (!hxMachLob()) hxWLob(); }), { group: G, button: true });   // (step 2a: a living loop's pass; Etappe 3: first what the Gärtner plans)
  midiTarget('hx.nein', 'Ablehnen (✕)', btn(() => (HX.folge ? hxWTonAb() : hxMachNein() || hxWNein())), { group: G, button: true });
  midiTarget('hx.anker', 'Zurück zum Anker (⚓)', btn(() => hxWAnker()), { group: G, button: true });
  // (step 2b) the tape and the stage
  midiTarget('hx.bandstopp', 'Bandstopp (alle Schleifen laufen aus)', btn(() => hxBandstopp()), { group: G, button: true });
  midiTarget('hx.erstarren', 'Erstarren (Wuchs-Durchgang wird Abdruck)', btn(() => hxErstarren(hxFok())), { group: G, button: true });
  midiTarget('hx.folge', 'Folge starten / anhalten', btn(() => (HX.fl && HX.fl.on ? hxFolgeStop() : hxFolgeStart())), { group: G, button: true });
  midiTarget('hx.puls.ernten', 'Puls ernten (zwei Takte)', btn(() => hxPulsErnten(2, P['hx.pulsStumm'])), { group: G, button: true });
  midiTarget('hx.lied', 'Setliste: nächstes Lied', btn(hxSetNext), { group: G, button: true });
  midiTarget('hx.buehne', 'Bühnenansicht an / aus', btn(() => setParam('hx.buehne', !P['hx.buehne'])), { group: G, button: true });
  midiTarget('hx.gaertner', 'Gärtner (schaut zu · pflegt · antwortet)', null, { group: G, cont: true, get: () => hxGdStep() / 2, set: (n) => { const g = HX_GST[Math.min(2, Math.floor(clamp(n, 0, 1) * 3))]; if (g !== P['hx.gaertner']) setParam('hx.gaertner', g); } });   // (Etappe 3: the parameter itself)
  midiTarget('hx.hin', 'Hinlegen erntet (Gestik: Ruhe)', btn(() => { hxKorb(hxEvOf(null, 'hin')); }), { group: G, button: true });
  midiTarget('hx.nkset', 'nanoKONTROL2: Seite Hexenring', null, { group: G, button: true, press: (v, cx) => { if (cx && cx.src) hxNkPage(cx.src, !cx.src.nkHx); } });
  for (let i = 0; i < HX_SLOTS; i++) {
    const n = i + 1;
    midiTarget('hx.ring.' + n, 'Schleife ' + n + ' (tippen wie ihr Ring)', null, { group: G, button: true, press: (v, cx) => { if (A.started && HX.node) hxRingTap(i, hxEvOf(cx, 'r' + n)); } });
    midiTarget('hx.ring.' + n + '.rec', 'Schleife ' + n + ': aufnehmen, schließen, überspielen', null, { group: G, button: true, press: (v, cx) => { if (A.started && HX.node) hxRingRec(i, hxEvOf(cx, 'R' + n)); } });
    midiTarget('hx.ring.' + n + '.stumm', 'Schleife ' + n + ': stumm (sofort)', null, { group: G, button: true, press: () => { const L = hxRingL(i); if (L && A.started && HX.node) hxmMute(L, L.state !== 'stumm'); } });   // (25.10.2026: the loop mixer)
    midiTarget('hx.ring.' + n + '.balance', 'Schleife ' + n + ': Balance', null, { group: G, cont: true, get: () => { const L = hxRingL(i); return L ? ((L.pan || 0) + 1) / 2 : null; }, set: (n2) => { const L = hxRingL(i); if (L) hxPan(L, clamp(n2, 0, 1) * 2 - 1); } });
    midiTarget('hx.ring.' + n + '.solo', 'Schleife ' + n + ': Solo', null, { group: G, button: true, press: (v, cx) => { if (A.started && HX.node) hxRingSolo(i, hxEvOf(cx, 'S' + n)); } });
    midiTarget('hx.ring.' + n + '.pegel', 'Schleife ' + n + ': Pegel', null, { group: G, cont: true, get: () => { const L = hxRingL(i); return L ? hxLvlN(L.gain) : null; }, set: (n2) => { const L = hxRingL(i); if (L) { hxLevel(L, hxLvlG(n2)); L.lvT = performance.now(); hxRailDirty(); } } });
    midiTarget('hx.ring.' + n + '.eigensinn', 'Schleife ' + n + ': Eigensinn', null, { group: G, cont: true, get: () => { const L = hxRingL(i); return L ? Math.max(0, HX_EIG.indexOf(L.eig || 'treu')) / (HX_EIG.length - 1) : null; }, set: (n2) => { const L = hxRingL(i); if (L) { const e = HX_EIG[Math.min(HX_EIG.length - 1, Math.floor(clamp(n2, 0, 1) * HX_EIG.length))]; if (e !== (L.eigWant || L.eig || 'treu')) { hxEigSet(L, e); hxSay(hxName(L) + ': Eigensinn ' + HX_EIGW[e] + (L.eigWant ? ' (nach drei Runden)' : '')); } } } });
  }
}
// the targets that need a control's release (learnDone's momentary exception, SPEC §17)
const HX_MOMENT = new Set(['hx.korb', 'hx.haupt', 'hx.schicht', 'hx.pedb', 'hx.pedd']);

// ---- the nanoKONTROL2's Hexenring page (SPEC §17): SET switches the profile between the mixer and this set; its LED
// says which (via MIDI out where there is one), and so does the field ----
const HX_NK2 = (() => {
  const R = (n, i, t, m, name) => PB('cc', -1, n, t, m, { name });
  const b = [];
  for (let i = 0; i < 8; i++) {
    b.push(R(i, i, 'hx.ring.' + (i + 1) + '.pegel', 'abs', 'Fader ' + (i + 1)), R(16 + i, i, 'hx.ring.' + (i + 1) + '.eigensinn', 'abs', 'Regler ' + (i + 1)));
    b.push(R(32 + i, i, 'hx.ring.' + (i + 1) + '.solo', 'trigger', 'S ' + (i + 1)), R(48 + i, i, 'hx.ring.' + (i + 1), 'trigger', 'M ' + (i + 1)), R(64 + i, i, 'hx.ring.' + (i + 1) + '.rec', 'trigger', 'R ' + (i + 1)));
  }
  b.push(PB('cc', -1, 46, 'hx.korb', 'momentary', { name: 'Cycle' }), PB('cc', -1, 43, 'hx.zurueck', 'trigger', { name: '◀◀' }), PB('cc', -1, 44, 'hx.wieder', 'trigger', { name: '▶▶' }),
    PB('cc', -1, 61, 'hx.licht.prev', 'trigger', { name: 'Marker ◀' }), PB('cc', -1, 62, 'hx.licht.next', 'trigger', { name: 'Marker ▶' }),
    PB('cc', -1, 42, 'hx.alle.ende', 'trigger', { name: 'Stop' }), PB('cc', -1, 41, 'hx.alle.an', 'trigger', { name: 'Play' }), PB('cc', -1, 45, 'rec', 'toggle', { name: 'Rec' }),
    PB('cc', -1, 58, 'hx.nein', 'trigger', { name: 'Track ◀' }), PB('cc', -1, 59, 'hx.lob', 'trigger', { name: 'Track ▶' }), PB('cc', -1, 60, 'hx.nkset', 'trigger', { name: 'Set' }));
  return b;
})();
function hxNkPage(src, on) {
  src.nkHx = !!on; MAP.v++;
  hxNkLed(src);
  hxTagSync();
  hxSay(on ? 'nanoKONTROL2: Seite Hexenring' : 'nanoKONTROL2: Seite Mixer');
  if (typeof updDevUI === 'function') updDevUI();
}
function hxNkLed(src) { const o = kcOut(src); if (o && o.port) midiSend(o, [0xb0, 60, src.nkHx ? 127 : 0]); }
// the nanoKEY Studio's pads (a chip on its card): Spuren (Spur 1–4, Puls, Bordun, Freeze, Stille) or Hexenring (Schleife
// 1–4, Korb, ↶, nächste Lichtung, Stille – pad 8 stays Stille)
const HX_PADFN = [['hx.ring.1', 'trigger'], ['hx.ring.2', 'trigger'], ['hx.ring.3', 'trigger'], ['hx.ring.4', 'trigger'], ['hx.korb', 'momentary'], ['hx.zurueck', 'trigger'], ['hx.form', 'trigger'], ['stille', 'trigger']];
const hxPadsHx = (src) => portPref(src).pads === 'hx';
function hxPadsSet(src, hx) { setPortPref(src, { pads: hx ? 'hx' : 'spuren' }); MAP.v++; hxSay('Pads: ' + (hx ? 'Hexenring' : 'Spuren')); if (typeof updDevUI === 'function') updDevUI(); }
// a profile's bindings as they act now (mapOf): the nanoKONTROL2 on its Hexenring page, the nanoKEY's pads on theirs
function hxProfBinds(src, p) {
  if (p.id === 'nk2') return src.nkHx ? HX_NK2 : p.binds;
  if (p.id === 'nks' && hxPadsHx(src)) return p.hxb || (p.hxb = p.binds.map((b) => { const m = b.type === 'note' && /^Pad (\d)$/.exec(b.name || ''); return m ? Object.assign({}, b, { target: HX_PADFN[+m[1] - 1][0], mode: HX_PADFN[+m[1] - 1][1] }) : b; }));
  return p.binds;
}
// ---- pedals (KONZEPT §8): a profile by the number of switches; the learn step tests hold – a press held 0.6 s must
// arrive as down … up (page-turners often send both at once, or repeat): if a switch cannot hold, the tap-only profile is
// offered and the card says what is lost. Learned keys are taken before any focused control (a page-turner's arrows
// must not step a mixer knob); MIDI pedals become ordinary bindings. Stored per device (myzel.hx.dev.v1). ----
// [switch, target with hold, tap-only target, what it does, what is lost without hold]
const HX_PEDP = {
  korb: { name: 'Korb', sw: [['A', 'hx.korb', 'hx.korb', 'Korb', 'halten nimmt als Schichten auf, was du spielst']] },
  haupt: { name: 'Aufnahme', sw: [['A', 'hx.haupt', 'hx.haupt', 'Hauptknopf', 'aufnehmen, solange gehalten']] },
  zwei: { name: 'zwei', sw: [['A', 'hx.korb', 'hx.korb', 'Korb', 'halten nimmt als Schichten auf'], ['B', 'hx.pedb', 'hx.schicht', 'Durchgang als Schicht · halten: Zurück', 'Zurück durch Halten (↶ in der Ringleiste bleibt)']] },
  drei: { name: 'drei', sw: [['A', 'hx.korb', 'hx.korb', 'Korb', 'halten nimmt als Schichten auf'], ['B', 'hx.pedb', 'hx.schicht', 'Schicht · halten: Zurück', 'Zurück durch Halten'], ['C', 'hx.haupt', 'hx.haupt', 'Hauptknopf', 'aufnehmen, solange gehalten']] },
  vier: { name: 'vier', sw: [['A', 'hx.korb', 'hx.korb', 'Korb', 'halten nimmt als Schichten auf'], ['B', 'hx.pedb', 'hx.schicht', 'Schicht · halten: Zurück', 'Zurück durch Halten'], ['C', 'hx.haupt', 'hx.haupt', 'Hauptknopf', 'aufnehmen, solange gehalten'], ['D', 'hx.pedd', 'hx.form', 'nächste Lichtung · lange halten: Schluss', 'Schluss durch langes Halten (in der Form-Zeile bleibt er)']] },
};
const HX_HOLDT = 600;   // ms: a press this long must come as down … up
const HXPED = { learn: null, map: null, down: new Set(), src: { key: 'keys', name: 'Tastatur', kind: 'keys' } };
const hxPedGet = () => { const o = hxDev().ped; return o && HX_PEDP[o.prof] && Array.isArray(o.sw) ? o : null; };
// the learned keys: code → {fn, mode}
function hxPedMap() {
  if (HXPED.map) return HXPED.map;
  const m = new Map(), o = hxPedGet();
  if (o) for (const s of o.sw) if (s.via === 'key' && s.code) m.set(s.code, { fn: s.fn, mode: s.mode });
  return (HXPED.map = m);
}
const hxPedSame = (a, b) => a.via === b.via && (a.via === 'key' ? a.code === b.code : a.dev === b.dev && a.type === b.type && a.num === b.num && a.ch === b.ch);
const hxCtlName = (c) => (c.via === 'key' ? 'Taste ' + (c.name && c.name.length === 1 ? c.name.toUpperCase() : c.name || c.code) : devShort(c.dev) + ' · ' + (c.type === 'cc' ? 'CC ' : 'Note ') + c.num);
function hxPedLearn(prof) {
  if (!HX_PEDP[prof]) return;
  hxPedStop(true);
  HXPED.learn = { prof, i: 0, stage: 'press', got: [], cur: null, hd: null, n: 0, tm: 0, take: MIDI.take };
  MIDI.take = hxPedMidi;   // (MIDI pedals: the learn takes their messages while it runs)
  hxPedSay();
}
function hxPedStop(quiet) {
  const L = HXPED.learn; if (!L) return;
  clearTimeout(L.tm); HXPED.learn = null;
  if (MIDI.take === hxPedMidi) MIDI.take = L.take || null;
  if (!quiet) { hxSay('Pedale: abgebrochen'); hxCardDirty(); }
}
function hxPedSay() {
  const L = HXPED.learn; if (!L) return;
  const sw = HX_PEDP[L.prof].sw[L.i];
  L.say = L.stage === 'press' ? 'Tritt Schalter ' + sw[0] + ' (' + sw[3] + ') einmal.' : L.stage === 'up' ? 'Lass ihn los …' : L.stage === 'hold' ? 'Jetzt halte Schalter ' + sw[0] + ' eine Sekunde lang, dann loslassen.' : L.say;
  hxSay(L.say); hxCardDirty();
}
// a switch's press or release during the learn (a key, or a MIDI note or CC)
function hxPedIn(c, down, e) {
  const L = HXPED.learn; if (!L || L.stage === 'offer') return;
  const now = e && e.timeStamp > 0 ? e.timeStamp : performance.now();
  if (L.stage === 'press') { if (!down) return; L.cur = c; L.stage = 'up'; hxPedSay(); return; }
  if (!hxPedSame(L.cur, c)) return;
  if (L.stage === 'up') { if (!down) { L.stage = 'hold'; L.hd = null; L.n = 0; hxPedSay(); } return; }
  if (down) {
    if (e && e.repeat) return;   // (the key's own repeat while held: still one press)
    if (L.hd == null) { L.hd = now; L.n = 0; clearTimeout(L.tm); L.tm = setTimeout(() => hxPedHeld(false), 3000); } else L.n++;   // (a second press while held: it repeats presses)
    return;
  }
  if (L.hd == null) return;
  clearTimeout(L.tm);
  hxPedHeld(now - L.hd >= HX_HOLDT && !L.n);
}
function hxPedHeld(ok) {
  const L = HXPED.learn; if (!L) return;
  L.got.push({ c: L.cur, hold: !!ok });
  L.i++; L.cur = null; L.hd = null;
  if (L.i < HX_PEDP[L.prof].sw.length) { L.stage = 'press'; hxPedSay(); return; }
  if (L.got.every((g) => g.hold)) { hxPedSave(true); return; }
  const P0 = HX_PEDP[L.prof], lost = P0.sw.map((s) => s[0] + ': ' + s[4]);
  L.stage = 'offer';
  L.say = 'Dieses Pedal kann nicht halten (Drücken und Loslassen kommen auf einmal). Nur mit Tippen fehlt: ' + lost.join('; ') + '.';
  hxSay(L.say); hxCardDirty();
}
// keep the learned profile: with hold (momentary) or tap-only (trigger)
function hxPedSave(hold) {
  const L = HXPED.learn; if (!L) return;
  const P0 = HX_PEDP[L.prof], sw = [];
  P0.sw.forEach((s, i) => {
    const g = L.got[i]; if (!g) return;
    const fn = hold ? s[1] : s[2], mode = hold ? 'momentary' : 'trigger';
    if (g.c.via === 'key') sw.push({ id: s[0], via: 'key', code: g.c.code, name: g.c.name, fn, mode });
    else {
      const b = { dev: g.c.dev, ch: g.c.ch, type: g.c.type, num: g.c.num, target: fn, mode, name: 'Pedal ' + s[0] };
      MAP.user = MAP.user.filter((u) => !sameCtl(u, b)).concat(b); mapSave();
      sw.push({ id: s[0], via: 'midi', dev: g.c.dev, ch: g.c.ch, type: g.c.type, num: g.c.num, fn, mode });
    }
  });
  hxPedStop(true);
  hxDev('ped', { prof: L.prof, hold: !!hold, sw }); HXPED.map = null;
  hxSay('Pedale gelernt: ' + sw.map((s) => s.id + ' ' + hxCtlName(s)).join(', ')); toast('Pedale gelernt' + (hold ? '' : ' – nur mit Tippen') + '.', 2500);
  hxCardDirty();
}
function hxPedClear() {
  const o = hxPedGet();
  if (o) { MAP.user = MAP.user.filter((u) => !o.sw.some((s) => s.via === 'midi' && sameCtl(u, { dev: s.dev, ch: s.ch, type: s.type, num: s.num }))); mapSave(); }
  hxDev('ped', null); HXPED.map = null; hxSay('Pedale gelöscht'); hxCardDirty();
}
// MIDI during the learn: a note or a CC switch (≥ 64 pressed, below released) – taken, so it plays nothing meanwhile
function hxPedMidi(src, ev) {
  const L = HXPED.learn; if (!L) return false;
  if (ev.type !== 'on' && ev.type !== 'off' && ev.type !== 'cc') return false;
  const c = { via: 'midi', dev: src.name, type: ev.type === 'cc' ? 'cc' : 'note', num: ev.num, ch: ev.ch };
  const down = ev.type === 'cc' ? ev.val >= 64 : ev.type === 'on' && ev.val > 0;
  hxPedIn(c, down, { timeStamp: ev.t });
  return true;
}
// keys (capture phase on window): the learn, learned pedal keys (before any focused control – never in a text field),
// and the computer's defaults: Space = Hauptknopf (held: push-to-talk), E = Korb, 1–8 = the rings, Ctrl+Z / Ctrl+Shift+Z
// = ↶ ↷. Space only where no control takes it (the page, the field); E and 1–8 also in the Ringleiste. The note row
// (A S D F … on the field) plays on.
const hxTyping = (t) => !!t && t.nodeType === 1 && (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|reset|color)$/i.test(t.type || '')));
const hxKeyFree = (t) => !t || t === document.body || t === document.documentElement || t === document || (typeof cvFx !== 'undefined' && t === cvFx);
const hxKeyEv = (e) => ({ pointerId: 'key-' + e.code, timeStamp: e.timeStamp });
const hxKeyCx = (e, m) => ({ src: HXPED.src, ev: { type: 'key', t: e.timeStamp, ch: 0 }, b: { mode: m.mode } });
function hxKeyDown(e) {
  if (HXW.on || hxTyping(e.target) || LEARN.on) return;
  if (HXPED.learn) { if (e.key === 'Escape') { hxPedStop(); return; } e.preventDefault(); e.stopPropagation(); hxPedIn({ via: 'key', code: e.code, name: e.key }, true, e); return; }
  const m = hxPedMap().get(e.code);
  if (m) { e.preventDefault(); e.stopPropagation(); if (!e.repeat && A.started) { HXPED.down.add(e.code); const T = mtOf(m.fn); if (T) tPress(T, 1, hxKeyCx(e, m)); } return; }
  if (!A.started || !HX.node || e.metaKey || e.altKey) return;
  if (e.ctrlKey) {
    if (e.code === 'KeyZ' || e.code === 'KeyY') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) (e.shiftKey || e.code === 'KeyY' ? hxRedoStep : hxUndoStep)(); }
    return;
  }
  if (e.code === 'Space' && !e.shiftKey && HXE.ed && !HXE.ed.hidden && HXE.ed.contains(e.target)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) hxPvToggle(); return; }   // (owner, 26.10.2026: in the editor – Vorhören)
  const free = hxKeyFree(e.target), rail = !!(HXU.rail && HXU.rail.contains(e.target)), dg = /^Digit([1-8])$/.exec(e.code);
  if (e.code === 'Space' && free) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { HXPED.down.add('Space'); hxHaupt(hxKeyEv(e)); } return; }
  if (e.shiftKey && dg && (free || rail)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { const L = hxRingL(+dg[1] - 1); if (L) hxEdOpen(L); } return; }   // (owner, 25.10.2026: Umschalt+1…8 – the loop's editor)
  if (e.shiftKey || !(free || rail)) return;
  if (e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { HXPED.down.add('KeyE'); hxKorbPress(hxKeyEv(e)); } return; }
  if (dg) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) hxRingTap(+dg[1] - 1, hxKeyEv(e)); }
}
function hxKeyUp(e) {
  if (HXW.on || hxTyping(e.target)) return;
  if (HXPED.learn) { e.preventDefault(); e.stopPropagation(); hxPedIn({ via: 'key', code: e.code, name: e.key }, false, e); return; }
  const m = hxPedMap().get(e.code);
  if (m) { e.preventDefault(); e.stopPropagation(); if (HXPED.down.delete(e.code) && m.mode === 'momentary') { const T = mtOf(m.fn); if (T) tRelease(T, hxKeyCx(e, m)); } return; }
  if (!HXPED.down.delete(e.code)) return;
  e.preventDefault(); e.stopPropagation();
  if (e.code === 'Space') hxHauptUp(hxKeyEv(e)); else if (e.code === 'KeyE') hxKorbRelease(hxKeyEv(e));
}
if (!HXW.on) { window.addEventListener('keydown', hxKeyDown, true); window.addEventListener('keyup', hxKeyUp, true); }
// the pedals in the card's settings: the profile, the learn (its words, the tap-only offer), what is learned
function hxCardPed() {
  const box = HXK.ped; if (!box) return;
  const o = hxPedGet(), L = HXPED.learn, chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  const want = HXK.pedP || (o ? o.prof : 'zwei');
  const kids = [h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Pedale'), h('div', { class: 'chips small' }, ...Object.entries(HX_PEDP).map(([k, P0]) => chip(P0.name, want === k, () => { HXK.pedP = k; hxCardPed(); }, 'Pedale: ' + (P0.sw.length === 1 ? 'ein Schalter, ' + P0.name : P0.name + ' Schalter')))))];
  kids.push(h('p', { class: 'note' }, HX_PEDP[want].sw.map((s) => s[0] + ': ' + s[3]).join(' · ')));
  if (L) {
    kids.push(h('p', { class: 'note hx-pedsay', role: 'status' }, L.say || ''));
    const row = h('div', { class: 'hx-kb' });
    if (L.stage === 'offer') row.append(h('button', { type: 'button', class: 'btn primary', onclick: () => hxPedSave(false) }, 'Nur tippen übernehmen'), h('button', { type: 'button', class: 'btn', onclick: () => hxPedLearn(L.prof) }, 'Noch einmal'));
    row.append(h('button', { type: 'button', class: 'btn ghost', onclick: () => hxPedStop() }, 'Abbrechen'));
    kids.push(row);
  } else {
    if (o) kids.push(h('p', { class: 'note' }, 'Gelernt (' + HX_PEDP[o.prof].name + (o.hold ? '' : ', nur tippen') + '): ' + o.sw.map((s) => s.id + ' ' + hxCtlName(s)).join(' · ')));
    kids.push(h('div', { class: 'hx-kb' }, h('button', { type: 'button', class: 'btn', onclick: () => hxPedLearn(want) }, o ? 'Neu einlernen' : 'Einlernen'), o ? h('button', { type: 'button', class: 'btn ghost', onclick: hxPedClear }, 'Löschen') : null));
    kids.push(h('p', { class: 'note' }, 'Ein Blätterpedal ist für die Seite eine Tastatur; seine Tasten nimmt Myzel vor jedem Regler. Am Computer: Leertaste = Hauptknopf, E = Korb, 1–8 = Schleifen, Strg+Z / Strg+Umschalt+Z = Zurück / Wiederholen.'));
  }
  box.replaceChildren(...kids);
}

