// ---- §13 Folge: Lichtungen in an order with pass counts (of the longest loop playing), on request in a circle ----
function hxFolgeSet(items, loop) { HX.fl = { items: items.filter((x) => hxLichOf(x.lich)), loop: !!loop, on: false, i: 0 }; hxFormSave(); hxCardDirty(); }
function hxFolgeStart() {
  const F = HX.fl; if (!F || !F.items.length) { toast('Die Folge ist leer – füge Lichtungen hinzu.'); return false; }
  F.on = true; F.i = 0; F.next = null;
  const at = hxLichGo(hxLichOf(F.items[0].lich));
  F.t0 = at; hxFolgeArm(); hxSay('Folge läuft'); hxRailDirty(); hxCardDirty();
  return true;
}
function hxFolgeStop(quiet) { const F = HX.fl; if (!F) return; F.on = false; F.next = null; if (!quiet) hxSay('Folge angehalten'); hxRailDirty(); hxCardDirty(); }
// the moment the current entry ends: its passes of the longest loop from where it began (bar lines in a Takt)
function hxFolgeArm() {
  const F = HX.fl; if (!F || !F.on) return;
  const it = F.items[F.i]; if (!it) { hxFolgeStop(true); return; }
  let M = null; for (const L of hxLoopsLive()) if (!L.bew && (!M || hxLen(L) > hxLen(M))) M = L;
  if (!M) { F.end = null; return; }
  if (hxTakt(M)) { const b = Math.round(tgBeat(F.t0)), e = b + it.n * M.d.beats; F.end = { t: tgTime(e), b: e }; }
  else F.end = { t: F.t0 + it.n * hxLen(M), b: null };
}
function hxFolgeTick(now) {
  const F = HX.fl; if (!F || !F.on || !F.end) return;
  if (F.next && now > F.next.t + 0.05) { F.t0 = F.next.t; F.next = null; hxFolgeArm(); return; }
  if (!F.next && F.end.t - now < 0.6) {
    let j = F.i + 1;
    if (j >= F.items.length) { if (!F.loop) { F.on = false; hxSay('Folge zu Ende'); hxCardDirty(); return; } j = 0; }
    const Li = hxLichOf(F.items[j].lich); if (!Li) { F.on = false; return; }
    F.i = j; F.next = F.end; hxLichGo(Li, { at: F.end });
  }
}

// ---- §16 Bühnenansicht and Setliste: big rings, a pedal legend, only the toasts that matter, the sheet on a long
// press; the Setliste – presets with their tempo and Lichtungen; „nächstes Lied“ puts the Schleifen in the graveyard
// (with the song: back with it later) and loads the next ----
function hxBuehne() { return !!P['hx.buehne']; }
function hxSetGet() { if (!HX.set) { try { HX.set = JSON.parse(localStorage.getItem('myzel.hx.set.v1') || 'null') || { list: [], cur: -1 }; } catch (e) { HX.set = { list: [], cur: -1 }; } } return HX.set; }
function hxSetSave() { try { localStorage.setItem('myzel.hx.set.v1', JSON.stringify({ list: HX.set.list.map((x) => Object.assign({}, x, { grave: undefined })), cur: HX.set.cur })); } catch (e) {} }
function hxSetAdd() {
  const S = hxSetGet(), pr = (UI && UI.lastPreset) || null;
  const e = { name: 'Lied ' + (S.list.length + 1), preset: pr && pr.key ? pr.key : null, P: pr && pr.key ? null : patchValues(), bpm: Math.round(tgBpm(hxNowT()) * 10) / 10, lich: HX.lich.map((Li) => ({ name: Li.name, rule: Li.rule, kern: !!Li.kern })) };
  S.list.push(e); S.cur = S.list.length - 1; hxSetSave(); hxCardDirty(); hxSay(e.name + ' in der Setliste');
  return e;
}
function hxSetGo(i) {
  const S = hxSetGet(), e = S.list[i]; if (!e) return false;
  const cur = S.list[S.cur];
  // what plays goes to the graveyard with its song (back with it)
  const live = hxLoopsLive();
  if (live.length) { const snaps = live.map(hxSnap); for (const sn of snaps) HX.grave.unshift({ snap: sn, t: Date.now(), song: cur ? cur.name : null }); for (const L of live) hxDrop(L, 0.04); if (cur) cur.lichSaved = HX.lich.slice(); }
  HX.lich = (e.lichSaved || e.lich.map((x) => ({ id: 'l' + (++HX.lichN) + Date.now().toString(36), name: x.name, loops: {}, rule: x.rule, mix: null, puls: null, kern: x.kern }))).slice(); HX.lichCur = null; HX.fl = null;
  const pr = e.preset ? PRESETS.find((p) => p.key === e.preset) : null;
  if (pr) loadPreset(pr); else if (e.P) loadValues(e.P);
  if (e.bpm && !SEQ.ext) setParam('seq.bpm', e.bpm);
  S.cur = i; hxSetSave(); hxFormSave(); hxCardDirty(); hxRailDirty();
  const back = HX.grave.filter((g) => g.song === e.name);
  hxSay(e.name); toast(e.name + (back.length ? ' – ' + back.length + ' Schleifen von früher' : ''), 3000, back.length ? { label: 'Zurückholen', fn: () => { for (const g of back) { HX.grave = HX.grave.filter((x) => x !== g); hxRebuild(g.snap, { fokus: false }); } } } : null);
  return true;
}
function hxSetNext() { const S = hxSetGet(); if (!S.list.length) { toast('Die Setliste ist leer – füge in der Karte Lieder hinzu.', 3000); return false; } return hxSetGo((S.cur + 1) % S.list.length); }

