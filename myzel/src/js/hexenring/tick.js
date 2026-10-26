// ---- memory: one cap (hx.mem) for takes and the Hexenring – the processor's copy, the page's copy, the graveyard, the
// history; at the cap the oldest history states give their audio back first, then the player decides (never silent) ----
function hxMemUsed() {
  const seen = new Set();
  let b = 0;
  const one = (aud, n) => { if (aud && !seen.has(aud)) { seen.add(aud); b += hxBytes(n); } };
  const wv = (s) => { if (s.wu) one(s.wu.aud, s.wu.n); if (s.anc) one(s.anc.aud, s.anc.n); };   // (step 2a: its Treu render and its anchor)
  for (const S of HX.sch.values()) { b += hxBytes(S.n); if (S.aud) one(S.aud, S.n); else if (S.live) b += hxBytes(S.n); one(S.bak, S.n); wv(S); if (S.wLive) b += 3 * hxBytes(Math.round((hxWTailEst(S) + 4) * SR)); }   // (step 1c: a baked version beside the dry one; step 2a: a living Schicht's passes in the processor, about three at a time)
  const hum = (H) => { if (H) for (const ch of H.aud) if (ch && !seen.has(ch)) { seen.add(ch); b += HX_CH * 8; } };   // (26.10.2026: the Ernten – each shared chunk once)
  for (const L of HX.loops.values()) hum(L.hum);
  for (const g of HX.grave) { hum(g.snap.hum); for (const s of g.snap.sch) { one(s.aud, s.n); one(s.bak, s.n); wv(s); } }
  for (const st of HX.hist.concat(HX.redo)) for (const sn of st.snaps || []) { if (sn) hum(sn.hum); for (const s of sn.sch || [sn]) if (s) { one(s.aud, s.n); one(s.bak, s.n); wv(s); } }
  for (const tk of takes) if (tk.L) b += tk.frames * 8;
  if (HX.node) b += 3 * Math.ceil((P['hx.humus'] * SR) / HX_CH) * HX_CH * 8;   // (step 2b: the Puls's ring)
  if (HX.node && HX.mic.ring) b += (HX.mic.ringN || 0) * HX_CH * 8;   // (step 4: the Mikro's ring)
  for (const S of HX.sch.values()) if (S.zr) { const Z = S.zr; if (Z.base) b += Z.base.Lf * 8; if (Z.cur) b += Z.cur.L.length * 8; if (S.zrV && Z.base) b += 2 * Z.base.Lf * 8; }   // (step 4: Zersetzung – the steady pass, its roots, the version playing in the processor and the page's)
  return b;
}
function hxMemOk(n) {
  const cap = P['hx.mem'] * 1048576, need = 2 * hxBytes(n);
  if (hxMemUsed() + need <= cap) return true;
  for (const st of HX.hist) {   // (the oldest states: a step whose audio is gone is gone)
    if (hxMemUsed() + need <= cap) break;
    if (st.snaps && st.snaps.some((sn) => (sn.sch || [sn]).some((s) => s && s.aud))) st.dead = true;
    if (st.dead) for (const sn of st.snaps) for (const s of sn.sch || [sn]) if (s) { s.aud = null; s.bak = null; s.wu = null; s.anc = null; }
  }
  HX.hist = HX.hist.filter((st) => !st.dead);
  if (hxMemUsed() + need <= cap) return true;
  if (!(HX.memToastT > performance.now())) {   // (once in 30 s: Wuchs and Zersetzung ask again every tick)
    HX.memToastT = performance.now() + 30000;
    toast('Speichergrenze erreicht (' + P['hx.mem'] + ' MB): lege Schichten zusammen oder entferne Gelöschte.', 7000, { label: 'Aufräumen', fn: () => hxCardOpen() });
    hxSay('Speicher voll');
  }
  HX.memFull = true; hxRailDirty();
  return false;
}
function hxGraveClear() { HX.grave = []; HX.memFull = false; hxCardDirty(); hxSay('Gelöschte entfernt'); }

// ---- the processor's replies the grammar needs (hooked in hxMsg) ----
function hxMsg2(m) {
  if (m.passStart) {   // the loop's geometry, re-read from where the processor really placed the pass
    const L = HX.loops.get(m.passStart.loop);
    if (L) {
      const { k, f } = m.passStart;
      L.ps.push([k, f]); if (L.ps.length > 6) L.ps.shift();
      if (L.prev && k >= L.prev.k) L.prev = null;
      const d = L.prev && k < L.prev.k ? L.prev.d : L.d;   // (a pass before a waiting geometry: the old one's)
      if (d.lock === 'takt') d.b0 = hxBeatAtF(f) - k * d.beats; else d.ph0 = f - k * d.L;
      if (L.slot != null) hxRailDirty();
    }
  }
  // (step 1d) a de-drifted version: the processor asks for its chunks, says while it makes one and when it took over
  if (m.ddReq) { const d = m.ddReq; if (HX.sch.has(d.schicht) && HX.node) { const [dst, tr] = hxChunks(d.n * HX_CH); hxPost({ ddGo: { schicht: d.schicht, pv: d.pv, dst } }, tr); } }
  if (m.ddRun) { if (m.ddRun.on) HX.ddRun.add(m.ddRun.schicht); else HX.ddRun.delete(m.ddRun.schicht); hxCount(); }
  if (m.ddAdopt) { const S = HX.sch.get(m.ddAdopt.schicht); if (S) { S.ddOn = true; S.ddZ = !!m.ddAdopt.z; hxCount(); } }
  if (m.filled) {   // a live fill is complete: the page's copy (for storage, undo, re-cuts)
    const d = m.filled, S = HX.sch.get(d.schicht);
    if (S && d.lost >= 0 && (d.v || 0) === (S.ver || 0) && d.chunks) {
      S.aud = d.chunks; S.live = false; S.lost = d.lost; if (d.dr) S.dr = d.dr;
      if (d.n < S.n) { S.n = d.n; S.aud = d.chunks.slice(0, Math.ceil(d.n / HX_CH)); }   // (its Ausklang was cut: no more is kept)
      S.bak = null; S.baked = false;
      hxSaveSch(S);
      hxAfterFill(S);   // (step 1c: the Ausklang's rendered rest, the bake, the drift it was played with)
      hxBandFill(S);   // (step 2b: the loop's kind and onsets – the tape's tools, a tempo change)
      { const L1 = HX.loops.get(S.loop); if (L1 && L1.sch[0] === S.id) hxHumKeep(L1, S); }   // (26.10.2026: the whole Ernte beside it)
      const L2 = HX.loops.get(S.loop);   // (step 2a: its notes for Wuchs – its window has sounded)
      if (L2 && !L2.bew) { if (!S.wn) S.wn = hxWNotesOf(S, L2); if (S.wn && hxWAktiv(L2)) hxWUpdate(L2); }
    }
  }
  if (m.rsd) { const w = HX.wait.get('rs' + m.rsd.id); if (w) { HX.wait.delete('rs' + m.rsd.id); w(m.rsd.chunks); } }
  if (m.accCopied) { const w = HX.wait.get('acc' + m.accCopied.schicht); if (w) { HX.wait.delete('acc' + m.accCopied.schicht); w(m.accCopied); } }   // (step 4: a Sammelschleife's tape)
  if (m.late) { HX.wLate++; const S = HX.sch.get(m.late.schicht); if (S) S.wLate = (S.wLate || 0) + 1; }   // (step 2a: a pass not there in time)
  if (m.bandstopp) hxBandStopped(m.bandstopp.loop);   // (step 2b: a tape stood still)
  if (m.wilted) { const L = HX.loops.get(m.wilted.loop); if (L && L.state !== 'weg') { L.state = 'angehalten'; L.pendTo = null; hxCount(); hxRailDirty(); hxCardDirty(); hxSaveMeta(L.id); } }   // (step 1d: a Schluss „welkend“ ended)
  if (m.meter && m.meter.inp) {   // the rings' input level, 15 per second, two minutes
    HX.lvl[HX.lvlI] = [hxT(m.meter.F), m.meter.inp[0], m.meter.inp[1], m.meter.inp[2] || 0, m.meter.inp[3] || 0];   // (step 4: the Mikro's)
    HX.lvlI = (HX.lvlI + 1) % 13600;   // (15 min, as far as the Humus)
    for (const x of m.meter.loops) { const L = HX.loops.get(x[0]); if (L) L.lv = [x[1], x[2]]; }
  }
}

// a loop's notes and Bewegung from its window – again once a window that was still sounding has sounded
function hxNotesRefresh(L) {
  const c = L.cut; if (!c || c.stale) return;
  const w0 = hxT(c.w0), w1 = hxT(c.w1), evs = hxNotes(w0 - 0.03, w1, c.in, true).filter((e) => e.t0 >= w0 - 0.03 && e.t0 < w1 - 0.01);
  L.notes = hxLoopNotes(evs, w0, w1 - w0); if (evs.length) L.eng = hxMainEng(evs);
  L.mv = hxMv(w0, w1); L.notesDue = 0;
  if (L.rep) hxAusleseFor(L, L.rep);   // (step 1d)
  if (!L.chainRec && L.sch.length && hxChainFor(c.in, evs)) L.chainRec = hxChainRec(w0, w1);   // (step 2a: the chain as played – a Wuchs pass is burnt in with it)
  for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.cut === c) S.wn = hxWNotesOf(S, L); }
  hxWUpdate(L);
  hxRailDirty(); hxSaveMeta(L.id);
}
// ---- every scheduler tick: what waits for its moment, the Ohr (4 per second), the field's fairy rings ahead ----
function hxTick(horizon) {
  if (!HX.node || HX.ctx !== A.ctx) return;
  const now = hxNowT(), pnow = performance.now();
  hxPendTick(now);
  const R = HX.rec;
  if (R && R.phase === 'wait' && now >= R.t0) { R.phase = 'rec'; hxSay('Aufnahme läuft'); hxRailDirty(); }
  hxF1Tick(now);   // (the chain copy on out 1 rests while nothing plays through it)
  if (HXK.cost && pnow - (HXK.costT || 0) > 1000 && HXK.cost.isConnected) { HXK.costT = pnow; hxCardSub(); }   // (Leistung: the loops' share, as it changes)
  if (R && R.loopKey && R.w1 && now >= R.w1) { HX.rec = null; if (HX.chips && HX.chips.kind === 'mult') HX.chips = null; hxRailDirty(); }   // (an auto-length recording closed at its end)
  hxPunchTick();
  hxAusWatch();
  hxClickTick(now, horizon); hxVibTick(now);   // (step 1c)
  if (HX.klopf && now > HX.klopf.end) hxKlopfDone();
  for (const L of HX.loops.values()) if (L.notesDue && now > L.notesDue + 0.05) hxNotesRefresh(L);
  hxTempoTick(now);
  hxFormTick(now);   // (step 1d)
  hxWTick(now, horizon);   // (step 2a: Wuchs – the living passes, the key's bar line, the tempo)
  hxGdTick(now, horizon);   // (Etappe 3: the Gärtner, answers, Wiederkehr, Knospen)
  hxEcoTick(now, horizon);   // (step 4: Nähren, MIDI out, Ladung, Treffen, Zersetzung, the Sammelschleifen's tapes)
  if (HX.chips && pnow > HX.chips.until) { HX.chips = null; hxRailDirty(); }
  if (HX.redoT && pnow > HX.redoT) { HX.redoT = 0; hxRailDirty(); }
  if (pnow - HX.earT > 250) {   // the Korb's word and light: what a tap would take now
    HX.earT = pnow;
    const k0 = HX.korb;
    try { HX.korb = hxKorbPlan(heardT()); } catch (e) { console.warn(e); HX.korb = null; }
    hxRecAutoClose();
    const k1 = HX.korb;   // (the rail's words only when the Korb's changed – a layout pass reads the buttons' boxes)
    if (!k0 || !k1 || k0.label !== k1.label || !!k0.light !== !!k1.light) hxRailDirty();
  }
  hxVisAhead(now, horizon);
}
// loop notes on the field (a visPush kind of their own): dotted fairy rings with the loop's number, as they sound
function hxVisAhead(now, horizon) {
  if (document.hidden) return;
  for (const L of hxLoopsLive()) {
    if (L.state !== 'spielt' || !L.notes.length) continue;
    const f1 = hxF(horizon), from = Math.max(L.visF || 0, hxF(now));
    let k = hxPassK(L, Math.round(from));
    for (let g = 0; g < 3; g++, k++) {
      const a = hxPassF(L, k), b = hxPassF(L, k + 1);
      if (a >= f1) break;
      for (const n of L.notes) {
        const f = a + n.ph * (b - a);
        if (f >= from && f < f1) visPush({ t: hxT(f), kind: 'hx', x: n.x, y: n.y, n: L.slot + 1, v: n.v });
      }
    }
    L.visF = f1;
  }
}
const HXV = { rings: [] };
function hxVisAdd(ev) { if (HXV.rings.length < 60) HXV.rings.push({ x: ev.x, y: ev.y, n: ev.n, life: 1, v: ev.v || 0.6 }); }
// drawn every frame on the field (no pointer events): fading dotted rings, the count-in number in the centre
function hxVisFrame(c, w, h) {
  c.save(); c.globalCompositeOperation = 'source-over';
  if (HXV.rings.length) {
    const keep = [];
    c.font = '600 10px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const r of HXV.rings) {
      r.life -= 0.016 * (VIS.k || 1);   // (the Handy-Modus under load: two steps a drawn frame)
      if (r.life <= 0) continue;
      keep.push(r);
      const x = r.x * w, y = (1 - r.y) * h, rad = 9 + (1 - r.life) * 10, a = 0.75 * r.life;
      c.fillStyle = 'rgba(240,230,216,' + a.toFixed(3) + ')';
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, 1.3, 0, Math.PI * 2); c.fill(); }
      c.fillText(String(r.n), x, y);
    }
    HXV.rings = keep;
  }
  if (A.ctx) hxKnFrame(c, w, h, heardT());   // (Etappe 3: the Knospen)
  const R = HX.rec, Wk = HX.wake;
  if (Wk && A.ctx) {   // (step 1d) waking: „3 · 2 · 1“ on the three beats before the 1 the Schleifen come back on
    const left = Math.ceil((Wk.t - heardT()) * tgBpm(hxNowT()) / 60 - 1e-6);
    if (left >= 1 && left <= 3) {
      c.font = '300 ' + Math.round(Math.min(w, h) * 0.32) + 'px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,179,92,0.26)'; c.fillText(String(left), w / 2, h / 2);
    }
  }
  if (R && R.phase === 'wait' && A.ctx && P['hx.ein'] !== 'aus') {   // the count-in: beats left, big and faint (hx.ein: also with a buzz or a click)
    const left = Math.max(1, Math.ceil((R.t0 - heardT()) * tgBpm(hxNowT()) / 60 - 1e-6));
    c.font = '300 ' + Math.round(Math.min(w, h) * 0.32) + 'px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,91,77,0.22)'; c.fillText(String(left), w / 2, h / 2);
    c.font = '500 13px ' + CSSV('--font-ui'); c.fillStyle = 'rgba(240,230,216,0.6)';
    c.fillText('Schleife ' + (R.slot + 1) + ' beginnt mit Takt ' + hxBarNo(R.b0), w / 2, h / 2 + Math.min(w, h) * 0.2);
  }
  c.restore();
  hxPosDraw(c, w, h);   // (owner, 25.10.2026: where you are while you play a loop in – laenge.js)
}

