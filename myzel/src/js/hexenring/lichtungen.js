// ---- Lichtungen (KONZEPT §4.2): which Schleifen sound, with level and Eigensinn – and, when asked, a mixer scene and the
// Puls on or off; each switches by its own rule (at the next bar line, or where the longest Schleife ends its pass) ----
const HX_LICH_MAX = 8, HX_REGEL = { takt: 'am Takt', ende: 'am Schleifenende' };
Object.assign(HX, { lich: [], lichN: 0, lichCur: null, lichGo: null, kernBack: null, luecke: null, schluss: null, slp: null, wake: null, seedN: 0 });
const hxLichOf = (id) => (id && id.loops ? id : HX.lich.find((x) => x.id === id) || null);
// what sounds now, as a Lichtung holds it (by the loops' keys): on, level, Eigensinn
function hxLichNow() {
  const o = {};
  for (const L of hxLoopsLive()) o[L.key] = { on: (L.pendTo || L.state) === 'spielt', g: L.gain, e: L.eig || 'treu' };
  return o;
}
function hxLichMerken() {
  if (!hxLoopsLive().length) { toast('Noch keine Schleife – eine Lichtung merkt sich, welche Schleifen klingen.', 3000); return null; }
  if (HX.lich.length >= HX_LICH_MAX) { toast('Acht Lichtungen sind gemerkt – lösche eine in der Karte.', 3500); return null; }
  let n = 1; while (HX.lich.some((x) => x.name === 'Lichtung ' + n)) n++;
  const Li = { id: 'l' + (++HX.lichN) + Date.now().toString(36), name: 'Lichtung ' + n, loops: hxLichNow(), rule: P['hx.regel'], mix: P['hx.lichMix'] ? mxSnapTake() : null, puls: P['hx.lichPuls'] ? !!SEQ.on : null, kern: false };
  HX.lich.push(Li); HX.lichCur = Li.id;
  hxSay(Li.name + ' gemerkt'); toast(Li.name + ' gemerkt.', 1800);
  hxFormSave(); hxRailDirty(); hxCardDirty();
  return Li;
}
function hxLichDel(Li) {
  const i = HX.lich.indexOf(Li); if (i < 0) return;
  HX.lich.splice(i, 1);
  if (HX.lichCur === Li.id) HX.lichCur = null;
  hxFormSave(); hxCardDirty(); hxRailDirty();
  toast(Li.name + ' gelöscht.', 4000, { label: 'Rückgängig', fn: () => { HX.lich.splice(Math.min(i, HX.lich.length), 0, Li); hxFormSave(); hxCardDirty(); hxRailDirty(); } });
}
// where a switch by `rule` lands: the next bar line (≥ the lead), or the next seam of the longest Schleife; without a
// Takt and with only free loops: at once
function hxLichT(rule) {
  const now = hxNowT(), live = hxLoopsLive();
  if (rule === 'ende') {
    let M = null; for (const L of live) if (!M || hxLen(L) > hxLen(M)) M = L;
    if (M) { const sw = hxNextSeam(M); return { t: hxT(sw.f), b: hxTakt(M) ? Math.round(hxBeatAtF(sw.f) - TG.o) : null }; }
  }
  if (!hxGrid() && !live.some(hxTakt)) return { t: now + HX_LEAD, b: null };
  const nb = Math.ceil(tgBeat(now + HX_LEAD) / 4 - 1e-9) * 4;
  return { t: tgTime(nb), b: nb };
}
// a Lichtung from its moment: the states and levels go now (frames of that moment), the Puls and the mixer when it comes
function hxLichGo(Li, o = {}) {
  Li = hxLichOf(Li); if (!Li) return null;
  const old = HX.pend.find((p) => p.kind === 'licht'); if (old) { hxPendDrop(old); old.cancel(); }
  const W = o.at || hxLichT(o.rule || Li.rule), at = W.t, undo = [];
  for (const L of hxLoopsLive()) {
    const w = Li.loops[L.key] || { on: false, g: L.gain, e: L.eig }, was = { st: L.pendTo || L.state, g: L.gain, L };
    if (w.on && L.state === 'angehalten') { hxReenterAt([L], W.b, at, true); was.re = true; }
    else if ((w.on ? 'spielt' : 'stumm') !== (L.pendTo || L.state) && L.state !== 'angehalten') { const to = w.on ? 'spielt' : 'stumm'; hxState(L.id, to, at, { X: 0.02 }); L.pendTo = to; was.ch = true; }
    if (Math.abs(w.g - L.gain) > 1e-6) { hxGain(L.id, w.g, at, 0.02); L.gain = w.g; was.gch = true; }
    if (w.e) hxEigSet(L, w.e);
    undo.push(was);
  }
  HX.lichGo = { id: Li.id, t: at, b: W.b, puls: Li.puls, mix: Li.mix, did: false, pulsDid: false };
  if (Li.puls === false && SEQ.on && W.b != null) SEQ.stopB = W.b;
  const label = (Li.name || 'Lichtung') + (W.b != null ? ' ab Takt ' + hxBarNo(W.b) : ' gleich');
  hxPendAdd({ kind: 'licht', t: at, label, lich: Li.id,
    cancel: () => {
      for (const u of undo) {
        const L = u.L; if (!HX.loops.has(L.id) || L.state === 'weg') continue;
        if (u.re) hxState(L.id, 'angehalten', at); else if (u.ch) hxState(L.id, u.st, at, { X: 0.02 });
        L.pendTo = null;
        if (u.gch) { hxGain(L.id, u.g, at, 0.02); L.gain = u.g; }
      }
      if (Li.puls === false && SEQ.stopB === W.b) SEQ.stopB = null;
      HX.lichGo = null; if (o.kern === 'hin') HX.kernBack = null; else if (o.kern === 'zurück' && o.back) HX.kernBack = o.back;
      hxRailDirty();
    },
    done: () => { for (const u of undo) u.L.pendTo = null; if (!Li.tmp) HX.lichCur = Li.id; hxFormSave(); hxCardDirty(); } });
  hxSay(label); hxRailDirty();
  return at;
}
// at its moment: the Puls (it joins the grid on that bar line – started just ahead) and the mixer scene
function hxFormTick(now) {
  const G = HX.lichGo;
  if (G) {
    if (G.puls === true && !G.pulsDid && !SEQ.on && G.t - now < 0.3) { G.pulsDid = true; if (G.t - now >= 0.065) seqStart(); else setTimeout(() => { if (!SEQ.on) seqStart(); }, 0); }
    if (G.mix && !G.did && now >= G.t - 0.02) { G.did = true; for (const id of mxSnapIds()) if (G.mix[id] !== undefined && P[id] !== G.mix[id]) setParam(id, G.mix[id]); }
    if (now > G.t + 0.5) HX.lichGo = null;
  }
  const S = HX.schluss;
  if (S && now > S.end + 0.05) { HX.schluss = null; for (const [L] of S.stops) if (L.pendTo === 'angehalten') L.pendTo = null; HX.ruht = hxLoopsLive().some((L) => L.state === 'angehalten'); hxSay('Schluss'); hxRailDirty(); hxCardDirty(); }
  if (HX.wake && heardT() > HX.wake.t + 0.1) HX.wake = null;
  hxFolgeTick(now);   // (step 2b)
  hxGuardTick();
}
// the form button: a tap = the next Lichtung at the next 1 (a second tap while it waits cancels it)
function hxFormTap() {
  const p = HX.pend.find((x) => x.kind === 'licht');
  if (p) { hxPendDrop(p); p.cancel(); hxSay('Lichtung abgebrochen'); return 'ab'; }
  if (!HX.lich.length) { hxFormRow(); hxSay('Noch keine Lichtung – „merken“ hält fest, was jetzt klingt'); return 'row'; }
  const i = HX.lich.findIndex((x) => x.id === HX.lichCur), next = HX.lich[(i + 1) % HX.lich.length];
  hxLichGo(next);
  return 'go';
}
// held: the row in the Ringleiste where the rings are (8 s after the last touch, or ✕)
function hxFormRow() { HX.chips = { kind: 'form', until: performance.now() + HX_CHIP_S * 1000 }; HXU.sig = ''; hxRailDirty(); hxSay('Form: Lichtungen, merken, Kern, Lücke, Schluss'); }
function hxLichStep(d) {
  if (!HX.lich.length) return;
  const i = HX.lich.findIndex((x) => x.id === HX.lichCur), n = HX.lich.length;
  hxLichGo(HX.lich[i < 0 ? (d > 0 ? 0 : n - 1) : (((i + d) % n) + n) % n]);
}
// Kern: a Lichtung marked as Kern – the same gesture goes there and back, on the 1
function hxKern() {
  const K = HX.lich.find((x) => x.kern);
  if (!K) { toast('Noch kein Kern – markiere eine Lichtung in der Karte als Kern.', 3500); hxSay('Kein Kern markiert'); return null; }
  const p = HX.pend.find((x) => x.kind === 'licht'); if (p) { hxPendDrop(p); p.cancel(); }
  if (HX.kernBack) { const back = HX.kernBack; HX.kernBack = null; return hxLichGo(back, { rule: 'takt', kern: 'zurück', back }); }
  HX.kernBack = { id: 'kern-zurück', name: 'Zurück vom Kern', loops: hxLichNow(), rule: 'takt', mix: null, puls: null, tmp: true, was: HX.lichCur };
  return hxLichGo(K, { rule: 'takt', kern: 'hin' });
}
// Lücke: every Schleife out for the last beat (or bar) before the next 1, back on it – hard, with 3-ms fades
function hxLuecke(beats) {
  beats = beats || (P['hx.lueckeT'] === 'takt' ? 4 : 1);
  const live = hxLoopsLive().filter((L) => (L.pendTo || L.state) === 'spielt');
  if (!live.length) { hxSay('Keine Schleife spielt'); return null; }
  const now = hxNowT(), r = 0.003;
  let nb = Math.ceil(tgBeat(now + HX_LEAD) / 4 - 1e-9) * 4;
  if (tgTime(nb - beats) - r < now + HX_LEAD) nb += 4;   // (inside it already: the next bar's)
  const t0 = tgTime(nb - beats), t1 = tgTime(nb), gs = live.map((L) => [L, L.gain]);
  for (const [L, g] of gs) { hxGain(L.id, 0, t0 - r, r); hxGain(L.id, g, t1 - r, r); }
  HX.luecke = { t0, t1 };
  hxPendAdd({ kind: 'luecke', t: t0, label: 'Lücke vor Takt ' + hxBarNo(nb), cancel: () => { for (const [L, g] of gs) if (HX.loops.has(L.id)) hxGain(L.id, g, t0 - r, r); HX.luecke = null; }, done: () => {} });
  hxSay('Lücke vor Takt ' + hxBarNo(nb)); hxRailDirty();
  return { t0, t1 };
}
// Schluss, three ways: ende – each Schleife stops at its end and its Ausklang rings; welkend – over hx.welk bars the
// gain, the brightness (a one-pole low pass in the processor) and slices (seeded drop-outs) fall away; abbauend – one
// Schleife less every pass of the longest, the youngest first. Pending, cancellable (↶, or Schluss again).
function hxSchluss(kind) {
  kind = kind || P['hx.schluss'];
  if (HX.schluss) { hxSchlussAb(); return null; }
  const live = hxLoopsLive().filter((L) => (L.pendTo || L.state) === 'spielt');
  if (!live.length) { hxSay('Keine Schleife spielt'); return null; }
  const now = hxNowT(), stops = [];
  let end = now;
  if (kind === 'welkend') {
    const W = hxLichT('takt'), bars = P['hx.welk'], t1 = W.b != null ? tgTime(W.b + 4 * bars) : W.t + bars * hxBar(), f0 = Math.round(hxF(W.t)), f1 = Math.round(hxF(t1));
    const sl = Math.round((hxGrid() ? 15 / tgBpm(now) : 0.125) * SR);   // (a sixteenth's slices)
    for (const L of live) { const seed = ((++HX.seedN * 2654435761) ^ (L.id * 40503)) | 0; hxPost({ wilt: { loop: L.id, f0, f1, sl, seed, lo: 250, hi: 16000 } }); stops.push([L, 'wilt', f1]); }
    end = t1;
  } else {
    let order = live.slice();
    if (kind === 'abbauend') order.sort((a, b) => b.made - a.made);
    const M = live.reduce((a, b) => (hxLen(b) > hxLen(a) ? b : a)), mk = hxNextSeam(M).k;
    order.forEach((L, i) => {
      let f;
      if (kind === 'abbauend') { const Fi = hxPassF(M, mk + i); f = hxPassF(L, hxPassK(L, Fi - 1) + 1); }
      else f = hxNextSeam(L).f;
      hxState(L.id, 'angehalten', hxT(f)); L.pendTo = 'angehalten'; stops.push([L, 'st', f]);
      end = Math.max(end, hxT(f));
    });
  }
  HX.schluss = { kind, end, stops };
  const what = { ende: 'Schluss am Ende', welkend: 'Schluss: welkend über ' + P['hx.welk'] + ' Takte', abbauend: 'Schluss: abbauend' }[kind];
  hxPendAdd({ kind: 'schluss', t: end, label: what, cancel: () => hxSchlussAb(true), done: () => {} });
  hxSay(what); hxRailDirty();
  return HX.schluss;
}
function hxSchlussAb(fromPend) {
  const S = HX.schluss; if (!S) return;
  HX.schluss = null;
  if (!fromPend) { const p = HX.pend.find((x) => x.kind === 'schluss'); if (p) hxPendDrop(p); }
  const fNow = Math.round(hxF(hxNowT() + 0.03));
  for (const [L, how, f] of S.stops) {
    if (!HX.loops.has(L.id) || L.state === 'weg') continue;
    L.pendTo = null;
    if (how === 'wilt') hxPost({ wilt: { loop: L.id, off: 1, f: fNow } });
    else if (f > fNow) { hxState(L.id, 'spielt', hxT(f)); }
  }
  hxSay('Schluss abgebrochen'); hxRailDirty();
}

// ---- Schlafen and Wenden (SPEC §13): the Schleifen are angehalten at their next bar line, their Ausklang ringing into
// the frozen echo (a seam there: the stored Ausklang; inside a pass: what sounds rings on from where it is, until just
// before the loop's next onset); on waking the field counts „3 · 2 · 1“ and they come back on the next 1; after a long
// sleep (SLP_LONG) they only stay angehalten (▶ Weiter). The scene art (the mixer glides, the Puls plays on) leaves them.
function hxSlpTail(L, f) {
  const k = hxPassK(L, f), a = hxPassF(L, k), b = hxPassF(L, k + 1), len = (b - a) / SR, ph = (f - a) / Math.max(1, b - a);
  if (!L.notes.length) return 1.5;
  const nx = L.notes.map((n) => n.ph).filter((p) => p > ph + 1e-4).sort((x, y) => x - y)[0];
  const dt = nx != null ? (nx - ph) * len : (1 - ph + Math.min(...L.notes.map((n) => n.ph))) * len;
  return clamp(dt - 0.005, 0.15, 2.5);
}
function hxSlpEnter(art) {
  hxAntStop('Schlafen'); if (HXA.ph) HXA.ph.done = true;   // (Etappe 3: no answer into the sleep)
  if (art === 'szene' || !HX.node) return 0;
  const live = hxLoopsLive().filter((L) => L.state === 'spielt' || L.state === 'stumm');
  if (!live.length) return 0;
  if (HX.rec) hxRecCancel(true);
  if (HX.punch) hxPunchEnd(hxHeard());
  if (HX.schluss) hxSchlussAb();
  for (const p of HX.pend.slice()) if (p.kind === 'licht' || p.kind === 'state' || p.kind === 'weiter' || p.kind === 'luecke') { hxPendDrop(p); p.cancel(); }
  const now = hxNowT(), nb = Math.ceil(tgBeat(now + HX_LEAD) / 4 - 1e-9) * 4, t = tgTime(nb), f = Math.round(hxF(t));
  HX.slp = { loops: live.map((L) => [L.key, (L.pendTo || L.state) === 'spielt']), t };
  for (const L of live) {
    const sf = hxPassF(L, hxPassK(L, f - 1) + 1);
    if (Math.abs(sf - f) <= 1 || L.bew) hxState(L.id, 'angehalten', t);   // its seam is there: the stored Ausklang rings once (Bewegung: it rests)
    else { hxPost({ state: { loop: L.id, to: 'angehalten', f, tail: Math.round(hxSlpTail(L, f) * SR) } }); L.state = 'angehalten'; }
    L.pendTo = null;
  }
  hxCount(); hxRailDirty(); hxCardDirty();
  hxSay(live.length === 1 ? 'Die Schleife hält mit Takt ' + hxBarNo(nb) + ' an' : 'Die Schleifen halten mit Takt ' + hxBarNo(nb) + ' an');
  return live.length;
}
function hxSlpWake(long) {
  const S = HX.slp; HX.slp = null;
  if (!S || !HX.node) return 0;
  const ls = S.loops.map(([k, on]) => [hxByKey(k), on]).filter(([L]) => L && L.state === 'angehalten');
  if (!ls.length) return 0;
  if (long) { HX.ruht = true; hxSay('Langer Schlaf: die Schleifen bleiben angehalten – ▶ Weiter'); hxRailDirty(); hxCardDirty(); return 0; }
  const now = hxNowT(), beat = 60 / tgBpm(now), nb = Math.ceil(tgBeat(now + HX_LEAD + 3 * beat) / 4 - 1e-9) * 4;   // (room for the count's three beats)
  const on = ls.filter(([, o]) => o).map(([L]) => L);
  if (on.length) hxReenterAt(on, nb, tgTime(nb));
  for (const [L, o] of ls) if (!o) hxState(L.id, 'stumm');
  HX.wake = { nb, t: tgTime(nb) };
  hxRailDirty();
  return on.length;
}
// angehalten → each from its own start at bar nb (time at; nb null: a free one without a Takt, at `at`) – several meet
function hxReenterAt(list, nb, at, quiet) {
  for (const L of list) {
    if (hxTakt(L)) { const b = nb != null ? nb : Math.ceil(tgBeat(at)); hxState(L.id, 'spielt', at, { b0: b, X: 0.01 }); L.d.b0 = b + TG.o; }
    else { const f = Math.round(hxF(at)); hxPost({ state: { loop: L.id, to: 'spielt', f, ph0: f, X: Math.round(0.01 * SR) } }); L.state = 'spielt'; L.d.ph0 = f; hxCount(); }
  }
  if (!quiet) hxPendAdd({ kind: 'weiter', loop: list.length === 1 ? list[0].id : null, t: at, label: nb != null ? 'ab Takt ' + hxBarNo(nb) : 'gleich', cancel: () => { for (const L of list) hxState(L.id, 'angehalten', at); }, done: () => {} });
}

// ---- mixer scenes A/B may carry a Lichtung: both carry one – the morph fades only the loops' levels between them (off
// = silent), their states and Eigensinn at its ends; one carries one – crossing half way toward it switches there ----
function hxSceneStore(which) {
  const C = MX.snap.lch || (MX.snap.lch = {}), prev = C[which];
  if (HX.lichCur && hxLichOf(HX.lichCur)) C[which] = HX.lichCur; else delete C[which];
  return prev;
}
function hxSceneMorph(was, m) {
  const C = MX.snap.lch, A0 = C && hxLichOf(C.a), B0 = C && hxLichOf(C.b);
  if (!HX.node || (!A0 && !B0)) return;
  if (A0 && B0) {
    for (const L of hxLoopsLive()) {
      const a = A0.loops[L.key], b = B0.loops[L.key], ga = a && a.on ? a.g : 0, gb = b && b.on ? b.g : 0, g = Math.sqrt((1 - m) * ga * ga + m * gb * gb);
      if (g > 1e-6 && L.state === 'stumm') hxState(L.id, 'spielt', null, { X: 0.02 });
      if (Math.abs(g - L.gain) > 1e-6) { L.gain = g; hxGain(L.id, g, null, 0.04); hxSaveMeta(L.id); }
    }
    if (m === 0 || m === 1) { const Li = m ? B0 : A0; HX.lichCur = Li.id; for (const L of hxLoopsLive()) { const w = Li.loops[L.key]; if ((!w || !w.on) && L.state === 'spielt') hxState(L.id, 'stumm', null, { X: 0.02 }); if (w) hxEigSet(L, w.e); } }
    hxRailDirty();
    return;
  }
  const to = m >= 0.5 ? B0 : A0;
  if (to && (was < 0.5) !== (m < 0.5)) hxLichGo(to);
}
