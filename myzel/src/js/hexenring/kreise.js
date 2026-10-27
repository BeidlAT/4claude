// ---- (owner, 26.10.2026: „die Leiste mit den Loops speichern können, mit Ladefunktion – jederzeit laden, unabhängig
// vom restlichen Projekt“) Kreise: the whole Ringleiste kept under a name – every Schleife with its Schichten' audio,
// its Pigment, level, balance, notes and tools, and the Takt they were made in. A library on this device (IndexedDB
// „kreise“ for the records, „kreissegs“ for the audio in 4-s segments, written while the page idles, so the playing
// never stutters), apart from patches and presets. „Laden“ replaces the Leiste (one ↶ brings the old one back), the
// Kreis's Takt is set and its Schleifen begin together on the next 1; „Dazulegen“ puts them into the free places
// (same tempo). A Kreis also goes out as a file (.myzelkreis) and comes back in from one – on another computer too.
// A Kreis's Schleifen are made like the ones after a reload (hxRecBuild), with new keys: one Kreis may come twice. ----
// (owner, 27.10.2026: „dass presets automatisch die schleifen mitspeichern. und dass VERLÄSSLICH nie mehr was verloren
// geht“) Two more kinds: a user preset's own Kreis (meta.preset – presets.js keeps its id), and the automatic ones
// (meta.auto): before Schleifen leave the Leiste – deleted, „Alle leeren“, a Kreis or a preset loaded over them – the
// ones not yet kept anywhere become a Kreis by themselves. Their records in „rings“ are deleted only once that Kreis is
// written (HXKR.hold), so a tab closed meanwhile brings them back as after any reload.
const HXKR = { list: null, busy: null, reading: false, el: null, file: null, q: [], safe: new Map(), hold: new Set(), later: new Set(), wait: new Map(), auf: false };
const HX_KR_EXT = '.myzelkreis';
hxKrSafeLoad();
const hxKrOk = () => IDB.ok && !!IDB.db && IDB.db.objectStoreNames.contains('kreise');
const hxKrRange = (id, sk) => (sk ? IDBKeyRange.bound([id, sk, 0], [id, sk, Number.MAX_SAFE_INTEGER]) : IDBKeyRange.bound([id, '', 0], [id, '￿', Number.MAX_SAFE_INTEGER]));
// what the Leiste holds now: the records (as a reload keeps them) and the audio to write beside them
function hxKrCollect(loops) {
  const recs = [], parts = [];
  let skipped = 0;
  for (const L of (loops || hxLoopsLive()).slice().sort((a, b) => a.slot - b.slot)) {
    hxPig(L);   // (its Pigment chosen, if it was not yet)
    const r = hxRecOf(L), live = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
    if (L.bew && !live.length) { recs.push(r); continue; }
    const sch = [];
    r.sch.forEach((s, i) => {
      const S = live[i];
      if (!S || !S.aud) return;   // (still filling: not yet a Schicht to keep)
      const sr = S.sr || SR, segs = (n) => Math.ceil(n / (HX_SEG * sr)), part = (k, src, n) => parts.push({ sk: r.id + '/' + k, src, n, sr });
      const wu = S.wu && S.wu.aud ? { n: S.wu.n, len: S.wu.len, sig: S.wu.sig, seed: S.wu.seed } : null;
      const anc = S.anc && S.anc.aud ? { n: S.anc.n, len: S.anc.len, sig: S.anc.sig, seed: S.anc.seed, br: S.anc.br != null ? S.anc.br : null, vn: S.anc.vn || null } : null;
      sch.push(Object.assign({}, s, { saved: 1, segs: segs(S.n), bakd: !!S.bak, wu, anc }));
      part(s.key, S.aud, S.n);
      if (S.bak) part(s.key + '~b', S.bak, S.n);
      if (wu) part(s.key + '~w', S.wu.aud, S.wu.n);
      if (anc) part(s.key + '~x', S.anc.aud, S.anc.n);
    });
    if (!sch.length) { skipped++; continue; }
    r.sch = sch; recs.push(r);
  }
  return { recs, parts, skipped };
}
const hxKrPig = (r) => { const p = hxPigOf(r.col || r.colA); return p ? p.c : HX_PIG[8].c; };
// what a Schleife is now, for „already kept?“: its record without what moves by itself (position, state, tempo), as
// a hash – remembered across reloads (myzel.hx.krsafe), so Schleifen brought back by one count as kept as before
function hxKrSig(L) {
  const r = hxRecOf(L);
  delete r.b0; delete r.state; delete r.bpm; delete r.made; delete r.nudge;
  r.sch = r.sch.map((x) => [x.key, x.n, x.len, x.cut, x.aus, x.gain, x.mute, x.chain]);
  const t = JSON.stringify(r);
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x5bd1e995); }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36) + t.length.toString(36);
}
function hxKrSafeLoad() { try { const o = JSON.parse(store.get('myzel.hx.krsafe') || '{}'); for (const k in o) HXKR.safe.set(k, o[k]); } catch (e) {} }
function hxKrSafeSave() {
  const live = new Set(hxLoopsLive().map((L) => L.key)), o = {};
  for (const [k, v] of HXKR.safe) if (live.has(k)) o[k] = v;
  store.set('myzel.hx.krsafe', JSON.stringify(o));
}
const hxKrMarkSafe = (loops) => { for (const L of loops) HXKR.safe.set(L.key, hxKrSig(L)); hxKrSafeSave(); };
const hxKrIsSafe = (L) => HXKR.safe.get(L.key) === hxKrSig(L);
// keep Schleifen as a Kreis (o.loops, else the whole Leiste): the records at once (in memory), the audio a segment per
// idle moment, the Kreis listed once all of it is written. o.now: what is there right now, without waiting for one
// still filling (the Schleifen are about to go); o.auto / o.preset mark the kind; o.done(id) once it is written.
// Returns the Kreis's id (null: nothing to keep). Saves run one after another (HXKR.q).
function hxKrSave(name, o = {}, tries = 0) {
  if (!hxKrOk()) { if (!o.quiet) toast('Dieser Browser kann hier nichts sichern.', 3500); return null; }
  if (!o.now && !o.auto && !tries && HXKR.waiting) { toast('Ein Kreis wird gerade noch gesichert.', 2500); return null; }
  const loops = o.loops || hxLoopsLive();
  const { recs, parts, skipped } = hxKrCollect(loops);
  if (skipped && !o.now && tries < 160) {   // a Schleife still filling (its window still sounding): kept once it is there, up to 40 s
    if (!tries) { toast('Gleich – eine Schleife füllt sich noch, dann wird die Leiste gesichert.', 2500); HXKR.waiting = true; hxCardDirty(); }
    setTimeout(() => hxKrSave(name, o, tries + 1), 250);
    return 'wartet';
  }
  if (HXKR.waiting && !o.now) { HXKR.waiting = false; hxCardDirty(); }
  if (!recs.length) { if (!o.quiet) toast(skipped ? 'Die Schleifen füllen sich noch – gleich noch einmal.' : 'Die Leiste ist leer – es gibt nichts zu sichern.', 3000); if (o.done) o.done(null); return null; }
  const id = 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), now = new Date();
  const nm = (name || '').trim() || 'Kreis vom ' + now.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const tk = recs.some((r) => r.lock === 'takt');
  let bytes = 0; for (const p of parts) bytes += p.n * 8;
  const meta = { id, name: nm, t: Date.now(), v: 1, bpm: tk ? (TG.hxOn ? TG.hx : tgBpm(hxNowT())) : 0, keep: !!TG.keep, sr: SR, n: recs.length, bytes, cols: recs.map(hxKrPig), recs, done: false, auto: o.auto || null, preset: o.preset || null };
  const kept = loops.filter((L) => recs.some((r) => r.id === L.key));
  hxKrMarkSafe(kept);
  const keys = kept.map((L) => L.key);
  for (const k of keys) HXKR.hold.add(k);   // (their records stay in „rings“ until this Kreis is written)
  let res; HXKR.wait.set(id, new Promise((r) => (res = r)));
  HXKR.q.push({ id, meta, parts, keys, o, nm, skipped, res });
  hxKrRun();
  return id;
}
function hxKrRun() {
  if (HXKR.busy || !HXKR.q.length) return;
  const J = HXKR.q.shift(), { id, meta, parts, keys, o, nm, skipped } = J;
  const jobs = [];
  for (const p of parts) { const seg = HX_SEG * p.sr; for (let i = 0; i < p.n; i += seg) jobs.push({ p, i: i / seg, a: i, b: Math.min(p.n, i + seg) }); }
  const B = (HXKR.busy = { id, name: nm, done: 0, tot: jobs.length, auto: !!(o.auto || o.preset) });
  hxCardDirty();
  const end = (ok) => {
    HXKR.busy = null; HXKR.wait.delete(id); J.res(ok);
    for (const k of keys) { HXKR.hold.delete(k); if (HXKR.later.has(k) && !HXKR.q.some((x) => x.keys.includes(k))) { HXKR.later.delete(k); hxDbDel(k); } }
    if (o.done) o.done(ok ? id : null);
    hxCardDirty(); hxKrRun();
  };
  const fail = () => { hxKrDel(id, true); toast('Der Gerätespeicher ist voll – ' + (o.auto ? 'die Schleifen ließen sich nicht automatisch sichern; sie bleiben bis zum Neuladen unter „Gelöscht“.' : 'der Kreis „' + nm + '“ ließ sich nicht sichern.'), 8000); end(false); };
  const next = () => {
    const j = jobs.shift();
    if (!j) {
      meta.done = true;
      hxDbPut('kreise', meta).then((ok) => {
        if (!ok) { fail(); return; }
        HXKR.list = null;
        if (!o.auto && !o.quiet) { hxSay('Kreis „' + nm + '“ gesichert'); toast('Kreis „' + nm + '“ gesichert: ' + meta.n + (meta.n === 1 ? ' Schleife' : ' Schleifen') + (skipped ? ' (' + skipped + ' noch nicht fertig gefüllt, ohne sie)' : '') + '.', 4000); }
        end(true);
      });
      return;
    }
    const n = j.b - j.a, Lb = new Float32Array(n), Rb = new Float32Array(n), src = j.p.src;
    for (let i = 0; i < n; i++) { const x = j.a + i, c = src[Math.floor(x / HX_CH)], k = x % HX_CH; if (c) { Lb[i] = c[0][k]; Rb[i] = c[1][k]; } }
    hxDbPut('kreissegs', { kreis: id, schicht: j.p.sk, i: j.i, L: Lb.buffer, R: Rb.buffer, sr: j.p.sr }).then((ok) => {
      if (!ok) { fail(); return; }
      B.done++; if (B.done % 8 === 0) hxCardDirty();
      if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 300 }); else setTimeout(next, 20);
    });
  };
  hxDbPut('kreise', meta).then((ok) => (ok ? next() : fail()));   // (listed only once done: a Kreis cut off by a closed tab is cleared later)
}
// before Schleifen leave the Leiste: the ones not kept anywhere yet (unchanged since a Kreis held them) become an
// automatic Kreis – why says what happened („gelöscht“, „Leiste geleert“ …)
function hxKrSecure(why, loops) {
  const un = (loops || hxLoopsLive()).filter((L) => L.slot != null && !hxKrIsSafe(L));
  if (!un.length || !hxKrOk()) return null;
  const now = new Date(), when = now.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return hxKrSave(why + ' – ' + when, { loops: un, now: true, auto: why, quiet: true });
}
async function hxKrList() {
  if (!hxKrOk()) { HXKR.list = []; return HXKR.list; }
  if (HXKR.reading) return HXKR.list || [];
  HXKR.reading = true;
  const all = (await idbDo('kreise', 'readonly', (st) => st.getAll())) || [];
  HXKR.reading = false;
  for (const k of all) if (!k.done && (!HXKR.busy || HXKR.busy.id !== k.id) && Date.now() - k.t > 600000) hxKrDel(k.id, true);   // (one left half-written)
  HXKR.list = all.filter((k) => k.done).sort((a, b) => b.t - a.t);
  hxCardDirty();
  return HXKR.list;
}
function hxKrDel(id, quiet) {
  if (!hxKrOk()) return;
  idbDo('kreise', 'readwrite', (st) => st.delete(id));
  idbDo('kreissegs', 'readwrite', (st) => st.delete(hxKrRange(id)));
  if (!quiet) { HXKR.list = (HXKR.list || []).filter((k) => k.id !== id); hxCardDirty(); }
}
function hxKrRename(id, name) {
  const k = (HXKR.list || []).find((x) => x.id === id), nm = (name || '').trim();
  if (!k || !nm || nm === k.name) return;
  k.name = nm; hxDbPut('kreise', k);
}
// load a Kreis: mode 'neu' replaces the Leiste (one ↶ for all of it), 'dazu' adds into the free places
async function hxKrLoad(id, mode = 'neu') {
  if (!A.started || !HX.node) { toast('Erst „Klang starten“ – dann lädt der Kreis.', 3000); return null; }
  if (HXKR.loading) return null;
  if (HXKR.wait.has(id)) { toast('Die Schleifen werden noch gesichert – gleich geht es los.', 2500); await HXKR.wait.get(id); }   // (one still being written: loaded once it is)
  const K = await idbDo('kreise', 'readonly', (st) => st.get(id));
  if (!K || !K.done) { toast('Diesen Kreis gibt es nicht mehr.', 2500); return null; }
  const live = hxLoopsLive(), tk = K.recs.some((r) => r.lock === 'takt') && K.bpm > 0;
  if (mode === 'dazu') {
    if (tk && live.some((L) => hxTakt(L)) && Math.abs(tgBpm(hxNowT()) - K.bpm) > 0.05) { toast('„' + K.name + '“ hat ' + dec(K.bpm.toFixed(1)) + ' BPM, die Leiste ' + dec(tgBpm(hxNowT()).toFixed(1)) + ' – dazulegen geht nur im selben Tempo. „Laden“ ersetzt die Leiste.', 6000); return null; }
    const free = HX.slot.filter((x) => !x).length;
    if (free < K.n) { toast('Nur ' + free + ' Plätze frei – „' + K.name + '“ hat ' + K.n + ' Schleifen.', 4000); return null; }
    if (!hxMemOk(Math.ceil(K.bytes / 8))) return null;
  }
  HXKR.loading = true; hxCardDirty();
  try {
    const n0 = HX.hist.length, wasBpm = TG.hxOn ? TG.hx : null;
    if (mode !== 'dazu' && live.length) {   // the Leiste as it was: one step, as „Alle leeren“
      if (HX.rec) hxRecCancel(true);
      if (HX.punch) hxPunchEnd(hxHeard());
      HX.pend = [];
      hxKrSecure('Leiste vor „' + K.name + '“', live);   // (what is not kept anywhere yet: an automatic Kreis first)
      const snaps = live.map(hxSnap);
      for (const L of live) hxDrop(L, 0.04);
      hxHist({ kind: 'leeren', label: 'Leiste geleert', undo() { for (const sn of snaps) hxRebuild(sn, { fokus: false }); }, redo() { for (const sn of snaps) { const X = hxByKey(sn.key); if (X) hxDrop(X, 0.04); } } });
    }
    const setT = tk && !SEQ.ext && (mode !== 'dazu' || !live.some((L) => hxTakt(L)));
    if (setT) { hxTempo(K.bpm); TG.keep = !!K.keep; }
    const made = [], lost = { n: 0 };
    for (const r of K.recs.slice().sort((a, b) => a.slot - b.slot)) {
      const segsOf = (key) => idbDo('kreissegs', 'readonly', (st) => st.getAll(hxKrRange(K.id, r.id + '/' + key)));
      const L = await hxRecBuild(r, segsOf, { fresh: true, lost });
      if (L) made.push([L, r.state]);
    }
    const keys = made.map(([L]) => L.key);
    hxKrMarkSafe(made.map(([L]) => L));   // (as the Kreis holds them: kept)
    let snaps = null;
    hxHist({ kind: 'kreis', label: 'Kreis „' + K.name + '“ geladen',
      undo() { snaps = keys.map(hxByKey).filter(Boolean).map((X) => { const sn = hxSnap(X); hxDrop(X, 0.04); return sn; }); if (setT && wasBpm) hxTempo(wasBpm); },
      redo() { if (setT) hxTempo(K.bpm); for (const sn of snaps || []) hxRebuild(sn, { fokus: false, state: 'angehalten' }); hxReenter(keys.map(hxByKey).filter(Boolean)); } });
    hxHistGroup(n0, 'Kreis „' + K.name + '“ geladen');
    // together on the next 1: the ones that played when it was kept (the others wait, angehalten – a tap starts them)
    const go = made.filter(([, st]) => st === 'spielt' || st === 'stumm').map(([L]) => L);
    if (go.length) hxReenter(go);
    HX.ruht = false;
    hxSay('Kreis „' + K.name + '“ geladen');
    toast('Kreis „' + K.name + '“: ' + made.length + (made.length === 1 ? ' Schleife' : ' Schleifen') + (go.length ? ', sie beginnen auf der nächsten Eins' : '') + '.' + (lost.n ? ' ' + lost.n + ' Schicht(en) in anderer Abtastrate ließen sich nicht umrechnen.' : ''), 5000, { label: 'Rückgängig', fn: hxUndoStep });
    hxRailDirty(); hxStripSync();
    return made.map(([L]) => L);
  } finally { HXKR.loading = false; hxCardDirty(); }
}

// ---- as a file: „MYZK“, the header's length (4 bytes), the header (JSON: the Kreis and where each segment sits),
// then every segment's left and right channel, Float32 ----
async function hxKrExport(id) {
  const K = await idbDo('kreise', 'readonly', (st) => st.get(id));
  if (!K) return;
  const segs = ((await idbDo('kreissegs', 'readonly', (st) => st.getAll(hxKrRange(id)))) || []);
  const meta = Object.assign({}, K); delete meta.done;
  const head = new TextEncoder().encode(JSON.stringify({ myzel: 'kreis', v: 1, kreis: meta, segs: segs.map((g) => ({ s: g.schicht, i: g.i, n: g.L.byteLength / 4, sr: g.sr })) }));
  const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, head.length, true);
  const blob = new Blob([new TextEncoder().encode('MYZK'), len, head, ...segs.flatMap((g) => [g.L, g.R])], { type: 'application/octet-stream' });
  const fn = K.name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) + HX_KR_EXT;
  if (typeof offerFile === 'function' && inViewer) offerFile(fn, blob); else anchorSave(blob, fn);
}
async function hxKrImport(file) {
  if (!file || !hxKrOk()) return;
  try {
    const buf = await file.arrayBuffer(), u8 = new Uint8Array(buf);
    if (new TextDecoder().decode(u8.subarray(0, 4)) !== 'MYZK') throw new Error('kein Kreis');
    const hl = new DataView(buf, 4, 4).getUint32(0, true), H = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + hl)));
    if (!H || H.myzel !== 'kreis' || !H.kreis || !Array.isArray(H.kreis.recs) || !Array.isArray(H.segs)) throw new Error('kein Kreis');
    const id = 'k' + Date.now().toString(36), K = Object.assign({}, H.kreis, { id, t: Date.now(), done: false });
    let o = 8 + hl;
    await hxDbPut('kreise', K);
    for (const g of H.segs) {
      const nb = g.n * 4, L = buf.slice(o, o + nb), R = buf.slice(o + nb, o + 2 * nb); o += 2 * nb;
      if (R.byteLength !== nb) throw new Error('unvollständig');
      if (!(await hxDbPut('kreissegs', { kreis: id, schicht: g.s, i: g.i, L, R, sr: g.sr }))) { hxKrDel(id, true); toast('Der Gerätespeicher ist voll – der Kreis passt nicht mehr hinein.', 5000); return; }
    }
    K.done = true; await hxDbPut('kreise', K);
    HXKR.list = null; hxCardDirty();
    toast('Kreis „' + K.name + '“ aufgenommen – „Laden“ legt ihn in die Leiste.', 4000);
  } catch (e) { toast('Diese Datei ist kein Myzel-Kreis (' + HX_KR_EXT + ').', 4000); }
}

// ---- in the card: „Leiste sichern“ with a name, the Kreise as small rings of their Pigmente ----
function hxKrRing(cols) {
  const n = cols.length, R = 13, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 36 36'); svg.setAttribute('class', 'hx-kr-ring'); svg.setAttribute('aria-hidden', 'true');
  const c0 = document.createElementNS(svg.namespaceURI, 'circle'); c0.setAttribute('cx', 18); c0.setAttribute('cy', 18); c0.setAttribute('r', R); c0.setAttribute('class', 'hx-kr-c'); svg.append(c0);
  cols.forEach((c, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2, d = document.createElementNS(svg.namespaceURI, 'circle');
    d.setAttribute('cx', (18 + R * Math.cos(a)).toFixed(2)); d.setAttribute('cy', (18 + R * Math.sin(a)).toFixed(2)); d.setAttribute('r', n > 12 ? 2.2 : 3); d.setAttribute('fill', c);
    svg.append(d);
  });
  return svg;
}
function hxKrRender(btn) {
  const box = HXK.kreise; if (!box) return;
  if (!hxKrOk()) { box.replaceChildren(); return; }
  if (!HXKR.list) hxKrList();
  // the save row is made once (a re-render must not take the name being typed); the rest only when it changed
  if (!HXKR.head || !box.contains(HXKR.head)) {
    HXKR.nm = h('input', { type: 'text', class: 'hx-kr-name', placeholder: 'Name (frei lassen: Datum und Uhrzeit)', 'aria-label': 'Name des Kreises', maxlength: 80 });
    HXKR.save = btn('Leiste sichern', () => { hxKrSave(HXKR.nm.value); HXKR.nm.value = ''; }, { cls: 'primary', aria: 'Die ganze Leiste als Kreis sichern' });
    HXKR.nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); HXKR.save.click(); } });
    if (!HXKR.file) { HXKR.file = h('input', { type: 'file', accept: HX_KR_EXT + ',application/octet-stream', hidden: true }); HXKR.file.addEventListener('change', () => { const f = HXKR.file.files[0]; HXKR.file.value = ''; hxKrImport(f); }); document.body.append(HXKR.file); }
    const imp = btn('Datei öffnen …', () => HXKR.file.click(), { cls: 'ghost', aria: 'Einen Kreis aus einer Datei aufnehmen (' + HX_KR_EXT + ')' });
    HXKR.head = h('div', { class: 'hx-row hx-kr-save' }, HXKR.nm, HXKR.save, imp);
    HXKR.rows = h('div', { class: 'hx-kr-list' });
    box.replaceChildren(h('div', { class: 'lab hx-sub' }, 'Kreise – die Leiste sichern und laden'), HXKR.head, HXKR.rows);
    HXKR.sig = null;
  }
  HXKR.save.textContent = HXKR.waiting ? 'Wartet …' : HXKR.busy && !HXKR.busy.auto ? 'Sichere … ' + Math.round((100 * HXKR.busy.done) / Math.max(1, HXKR.busy.tot)) + ' %' : 'Leiste sichern';
  HXKR.save.disabled = !!(HXKR.busy && !HXKR.busy.auto) || !!HXKR.waiting || !hxLoopsLive().length;
  const sig = (HXKR.list || []).map((K) => K.id + K.name).join('|') + '/' + !!HXKR.loading + '/' + (HXKR.ask || '') + '/' + HXKR.auf;
  if (sig === HXKR.sig) return;
  HXKR.sig = sig;
  const row = (K) => {
    const date = new Date(K.t), when = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: '2-digit' }) + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const name = h('input', { type: 'text', class: 'hx-kr-n', value: K.name, 'aria-label': 'Name des Kreises', maxlength: 80 });
    name.addEventListener('change', () => hxKrRename(K.id, name.value));
    const meta = (K.preset ? 'Preset „' + K.preset + '“ · ' : '') + K.n + (K.n === 1 ? ' Schleife' : ' Schleifen') + (K.bpm ? ' · ' + dec(K.bpm.toFixed(1)) + ' BPM' : '') + ' · ' + Math.max(1, Math.round(K.bytes / 1048576)) + ' MB · ' + when;
    const del = btn(HXKR.ask === K.id ? (K.preset ? 'Schleifen des Presets löschen?' : 'Wirklich löschen?') : '✕', () => { if (HXKR.ask === K.id) { HXKR.ask = null; hxKrDel(K.id); hxSay('Kreis „' + K.name + '“ gelöscht'); } else { HXKR.ask = K.id; hxCardDirty(); setTimeout(() => { if (HXKR.ask === K.id) { HXKR.ask = null; hxCardDirty(); } }, 3000); } }, { cls: 'ghost danger', aria: 'Kreis „' + K.name + '“ löschen' });
    return h('div', { class: 'hx-kr' }, hxKrRing(K.cols || []), h('div', { class: 'hx-kr-t' }, name, h('span', { class: 'hx-kr-m' }, meta)),
      h('div', { class: 'hx-kr-b' }, btn('Laden', () => hxKrLoad(K.id, 'neu'), { cls: 'primary', dis: !!HXKR.loading, aria: '„' + K.name + '“ laden – ersetzt die Leiste (↶ bringt sie zurück)' }),
        btn('Dazulegen', () => hxKrLoad(K.id, 'dazu'), { dis: !!HXKR.loading, aria: '„' + K.name + '“ in die freien Plätze legen' }),
        btn('Datei', () => hxKrExport(K.id), { cls: 'ghost', aria: '„' + K.name + '“ als Datei sichern' }), del));
  };
  const all = HXKR.list || [], own = all.filter((K) => !K.auto), auto = all.filter((K) => K.auto);
  const rows = own.map(row);
  if (!rows.length) rows.push(h('p', { class: 'note' }, 'Noch kein Kreis. „Leiste sichern“ hält alle Schleifen fest – mit Klang, Farbe, Pegel und Takt – und du lädst sie jederzeit wieder, unabhängig vom übrigen Projekt. Eigene Presets sichern ihre Leiste von selbst mit.'));
  if (auto.length) {
    rows.push(h('div', { class: 'hx-row hx-kr-auto' }, btn((HXKR.auf ? '▾ ' : '▸ ') + 'Automatisch gesichert (' + auto.length + ')', () => { HXKR.auf = !HXKR.auf; hxCardDirty(); }, { cls: 'ghost', aria: 'Schleifen, die beim Löschen, Leeren oder Laden aus der Leiste gingen' })));
    if (HXKR.auf) { rows.push(h('p', { class: 'note' }, 'Was die Leiste verlassen hat – gelöscht, geleert oder durch Laden ersetzt – liegt hier, bis du es selbst entfernst.')); rows.push(...auto.map(row)); }
  }
  HXKR.rows.replaceChildren(...rows);
}

// ---- (owner, 27.10.2026) an own preset keeps its Leiste: saving it keeps the Leiste as the preset's Kreis (p.kr; an
// empty Leiste: 'leer'), loading it puts that Kreis into the Leiste (what was there and not kept: an automatic Kreis
// first; ↶ brings it back), and while it is the current one, the Leiste it ends with goes with it when another preset
// comes (UI.upr, its name – kept across reloads). An own preset saved before this has no Leiste: loading it leaves the
// Leiste alone, and the Leiste it ends with becomes its own. ----
// UI.upr: { name, keys } – the own preset now and the Schleifen its Leiste had when it came (or was saved)
UI.upr = (() => { try { const o = JSON.parse(store.get('myzel.upr') || 'null'); return o && o.name ? { name: o.name, keys: Array.isArray(o.keys) ? o.keys : [] } : null; } catch (e) { return null; } })();
function hxUprSet(name, keys) { UI.upr = name ? { name, keys: keys || hxLoopsLive().map((L) => L.key) } : null; store.set('myzel.upr', JSON.stringify(UI.upr)); }
function hxUprKr(name, id) {
  const list = userPresets(), p = list.find((x) => x.name === name);
  if (!p || p.kr === id) return;
  if (id === undefined) delete p.kr; else p.kr = id;
  setUserPresets(list);
}
// the Leiste as preset name's Kreis (now); returns what p.kr becomes (old: nothing could be kept – left as it was).
// The Kreis it had before goes once the new one is written.
function hxUprKeep(name, old) {
  if (HX.restore) return old;   // (its Schleifen not made yet after a reload: they are what it had)
  const live = hxLoopsLive();
  if (!live.length) return 'leer';
  if (!hxKrOk()) return old;
  const id = hxKrSave('Preset „' + name + '“', { loops: live, now: true, preset: name, quiet: true,
    done: (got) => {
      if (!got) { const p = userPresets().find((x) => x.name === name); if (p && p.kr === id) hxUprKr(name, old); return; }   // (not written: the one before stays)
      if (old && old !== 'leer' && old !== got && !userPresets().some((x) => x.kr === old)) hxKrDel(old, true);
      HXKR.list = null; hxCardDirty();
    } });
  return id || old;
}
// leaving the current own preset: the Leiste it ends with goes with it, when that changed since it came (Schleifen that
// left it on the way are in automatic Kreise)
function hxUprLeave() {
  const U = UI.upr; if (!U || U.pend || HX.restore) return;
  const p = userPresets().find((x) => x.name === U.name); if (!p) return;
  const live = hxLoopsLive(), keys = new Set(U.keys);
  if (!live.length) return;   // (an empty Leiste never replaces the preset's own – only „Speichern“ makes it empty)
  const changed = live.length !== keys.size || live.some((L) => !keys.has(L.key) || !hxKrIsSafe(L)) || (p.kr === 'leer' && !U.keys.length);   // (a Leiste it only found when it came is not its own)
  if (!changed) return;
  hxUprKr(U.name, hxUprKeep(U.name, p.kr));
}
// a preset loaded (presets.js): an own one with a Leiste brings it; any other leaves the Leiste as it is
function hxUprEnter(p0, own) {
  const p = own ? userPresets().find((x) => x.name === p0.name) || p0 : p0;   // (as stored now: its Kreis may have just been renewed)
  if (!own || p.kr === undefined) { hxUprSet(own ? p.name : null); return; }
  if (p.kr === 'leer') { if (hxLoopsLive().length) hxLeeren(); hxUprSet(p.name, []); return; }
  hxUprSet(p.name, []); UI.upr.pend = true;   // (until its Kreis is in the Leiste, leaving keeps nothing for it)
  const U = UI.upr;
  hxKrLoad(p.kr, 'neu').then((made) => { if (UI.upr !== U) return; if (made) hxUprSet(p.name, made.map((L) => L.key)); else hxUprSet(null); });   // (not loaded – no sound yet, or gone: the Leiste is not its)
}
// the preset saved under name (presets.js): its Leiste now; returns p.kr
function hxUprSave(name, old) {
  const kr = hxUprKeep(name, old);
  hxUprSet(name, kr === 'leer' ? [] : undefined);
  return kr;
}
// an own preset deleted: its Kreis stays, among the automatic ones
function hxUprGone(p) {
  if (UI.upr && UI.upr.name === p.name) hxUprSet(null);
  if (!p.kr || p.kr === 'leer' || !hxKrOk()) return;
  idbDo('kreise', 'readwrite', (st) => { const rq = st.get(p.kr); rq.onsuccess = () => { const K = rq.result; if (K) { K.auto = 'Preset gelöscht'; K.preset = null; K.name = 'Leiste des gelöschten Presets „' + p.name + '“'; st.put(K); } }; }).then(() => { HXKR.list = null; hxCardDirty(); });
}
