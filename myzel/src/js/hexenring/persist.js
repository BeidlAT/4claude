// ---- persistence (SPEC §19): IndexedDB myzel v2 – „rings“ (a Schleife's record: geometry, Schichten, notes,
// Bewegung, the Takt) and „ringsegs“ ([ring, schicht, i]: its audio in ≈ 4-s segments, Float32, sample rate kept).
// Written after each Schicht, a segment per idle moment; a reload brings the Schleifen back angehalten (▶ Weiter). ----
const HX_SEG = 4;
function hxPersistAsk() {
  if (HX.persistAsked) return;
  HX.persistAsked = true;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
  hxEstimate();
}
function hxEstimate() { try { if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { HX.est = Math.round((e.usage || 0) / 1048576) + ' von ' + Math.round((e.quota || 0) / 1048576) + ' MB belegt'; }).catch(() => {}); } catch (e) {} }
function hxRecOf(L) {
  const mv = L.mv ? { a: L.mv.a, b: L.mv.b, lanes: L.mv.lanes.map((x) => Object.assign({}, x, { v: Array.from(x.v) })) } : null;
  return { id: L.key, v: 1, col: L.col || null, colA: L.colA || null, slot: L.slot, lock: L.d.lock, b0: L.d.b0 - TG.o, beats: L.d.beats, L: L.d.L, ph0: L.d.ph0, bpb: L.bpb, notes: L.notes, mv, cut: L.cut, eng: L.eng, setTG: L.setTG, gain: L.gain, pan: L.pan || 0, src: L.src,
    bpm: hxTakt(L) ? tgBpm(hxNowT()) : L.bpm, state: L.state, made: L.made, nudge: L.nudge || 0, sr: SR, tk: L.tk || null, plan: L.plan, folgt: !!L.folgt, taumeln: L.taumeln !== false, eig: L.eig || 'treu', naehrt: L.naehrt ? { gsp: !!L.naehrt.gsp, rhz: !!L.naehrt.rhz, rgn: !!L.naehrt.rgn, glt: !!L.naehrt.glt, shn: !!L.naehrt.shn } : null, mi: hxMiSave(L), eco: hxEcoOf(L), gap: !!L.d.gap,   // (step 4: Rhizom, Regen, Glut, Sehne; its ecology; gap – Treffen setzen)
    sch: L.sch.map((id) => HX.sch.get(id)).filter(Boolean).map((S) => ({ key: S.key, len: S.len, pre: S.pre, n: S.n, cut: S.cut, aus: S.aus, join: S.join, X: S.X, rho: S.rho, gain: S.gain, mute: S.mute, kind: S.kind, group: S.group, sr: S.sr, segs: hxSegs(S), saved: S.saved >= hxSegs(S),
      chain: !!S.chain, bakd: !!S.bak && (S.savedB || 0) >= hxSegs(S), zo: S.zo || 0, kc: S.kc ? Array.from(S.kc) : null, kcB: S.kcB ? Array.from(S.kcB) : null, dr: S.dr ? Array.from(S.dr) : null, cold: !!S.cold, cutAus: !!S.cutAus, spliced: !!S.spliced,
      // (step 2a) its notes for Wuchs, its throw, its Treu render and its anchor (audio beside, ~w and ~x), what it played
      wn: S.wn || null, wseed: S.wseed || 0, gate: S.gate || null, play: S.play || 'ab',
      wu: S.wu && (S.savedW || 0) >= hxSegsV(S, 'w') ? { n: S.wu.n, len: S.wu.len, sig: S.wu.sig, seed: S.wu.seed } : null,
      anc: S.anc && (S.savedX || 0) >= hxSegsV(S, 'x') ? { n: S.anc.n, len: S.anc.len, sig: S.anc.sig, seed: S.anc.seed, br: S.anc.br != null ? S.anc.br : null, vn: S.anc.vn || null } : null })),
    wwhy: L.wwhy || {}, ton: hxTon(L), tonV: 1, klang: L.klang || 'eigen', stufe: L.stufe || null, q: L.q || null, P: L.P || null, mask: L.mask || null, chainRec: L.chainRec || null, jrg: L.jrg || null, tb: hxTbOf(L),
    bew: L.bew ? { n: L.bew.n, g0: L.bew.g0, gs: L.bew.gs - L.d.b0, fade: L.bew.fade, why: L.bew.why, lanes: L.bew.lanes.map((ln) => ({ k: ln.k, src: ln.src, d: faeEnc(ln.v) })), disp: L.bew.disp ? Object.fromEntries(Object.entries(L.bew.disp).map(([k, v]) => [k, faeEnc(v)])) : null } : null };   // (step 1d: a Schleife of Bewegung, its lanes as the Fährte kept them)
}
function hxSaveMeta(loopId) {
  const L = HX.loops.get(loopId);
  if (!L || !IDB.ok || !hxLive() || L.slot == null) return;
  clearTimeout(L.saveTm);
  L.saveTm = setTimeout(() => { if (L.slot != null && L.state !== 'weg') hxDbPut('rings', hxRecOf(L)); hxDbPut('rings', hxSessRec()); }, 250);
}
// the session's record: the Takt, the Fokus, the form (step 1d: the Lichtungen, the current one)
const hxSessRec = () => ({ id: '_s', hx: TG.hx, hxOn: TG.hxOn, keep: TG.keep, bpm: tgBpm(hxNowT()), fokus: (hxFok() || {}).key || null, lich: HX.lich, lichCur: HX.lichCur, fl: HX.fl ? { items: HX.fl.items, loop: HX.fl.loop } : null });   // (step 2b: the Folge)
function hxSaveLoop(L) {
  if (!L) return; hxSaveMeta(L.id);
  for (const id of L.sch) { const S = HX.sch.get(id); if (!S) continue; if (S.aud && !S.saved) { hxSaveSch(S); if (S.bak) hxSaveSch(S, 'b'); } else if (S.bak && !((S.savedB || 0) >= hxSegs(S))) hxSaveSch(S, 'b'); if (S.wu && !((S.savedW || 0) >= hxSegsV(S, 'w'))) hxSaveSch(S, 'w'); if (S.anc && !((S.savedX || 0) >= hxSegsV(S, 'x'))) hxSaveSch(S, 'x'); }
}
function hxSaveAll() { for (const L of hxLoopsLive()) hxSaveMeta(L.id); }
// a Schicht's audio, segment by segment, when the page is idle (never all at once: the playing must not stutter)
const hxSegs = (S) => Math.ceil(S.n / (HX_SEG * S.sr));
const hxSegsV = (S, w) => { const V = w === 'w' ? S.wu : w === 'x' ? S.anc : null; return V ? Math.ceil(V.n / (HX_SEG * S.sr)) : hxSegs(S); };   // (step 2a)
// (step 1c: the dry Abdruck – w 'a' – and its baked version beside it under the key …~b – w 'b' –, each counted on its
// own, so a bake that comes later never makes a stored Schicht unstored meanwhile)
const HX_SV = { a: ['saving', 'saved'], b: ['savingB', 'savedB'], w: ['savingW', 'savedW'], x: ['savingX', 'savedX'] };
const hxSrcOf = (S, w) => (w === 'b' ? S.bak : w === 'w' ? S.wu && S.wu.aud : w === 'x' ? S.anc && S.anc.aud : S.aud);
function hxSaveSch(S, w = 'a') {
  const L = HX.loops.get(S.loop);
  if (!L || !hxSrcOf(S, w) || !IDB.ok || !hxLive()) return;
  const seg = HX_SEG * S.sr, nseg = hxSegsV(S, w), k = HX_SV[w][0], n = w === 'w' ? S.wu.n : w === 'x' ? S.anc.n : S.n;
  if (w === 'a') { S.saved = 0; S.savedB = 0; } else S[HX_SV[w][1]] = 0;
  S[k] = (S[k] || 0) + 1;
  const ver = S[k];
  for (let i = 0; i < nseg; i++) HX.saveQ.push({ S, ver, ring: L.key, i, a: i * seg, b: Math.min(n, (i + 1) * seg), w, src: hxSrcOf(S, w) });
  hxSaveMeta(L.id);
  hxSaveNext();
}
function hxSaveNext() {
  if (HX.saveBusy || !HX.saveQ.length) return;
  HX.saveBusy = true;
  const go = () => {
    const j = HX.saveQ.shift();
    if (!j) { HX.saveBusy = false; return; }
    const S = j.S, src = hxSrcOf(S, j.w), vk = HX_SV[j.w][0];
    if (!HX.sch.has(S.id) || S[vk] !== j.ver || !src || src !== j.src) { HX.saveBusy = false; hxSaveNext(); return; }
    const n = j.b - j.a, Lb = new Float32Array(n), Rb = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = j.a + i, c = src[Math.floor(x / HX_CH)], k = x % HX_CH; if (c) { Lb[i] = c[0][k]; Rb[i] = c[1][k]; } }
    hxDbPut('ringsegs', { ring: j.ring, schicht: j.w === 'a' ? S.key : S.key + '~' + j.w, i: j.i, L: Lb.buffer, R: Rb.buffer, sr: S.sr }).then((ok) => {
      HX.saveBusy = false;
      if (!ok) { hxSaveFailed(); HX.saveQ = HX.saveQ.filter((x) => x.S !== S); return; }
      if (S[vk] === j.ver) { const sk = HX_SV[j.w][1]; S[sk] = (S[sk] || 0) + 1; if (S[sk] >= hxSegsV(S, j.w)) hxSaveMeta(S.loop); }
      hxSaveNext();
    });
  };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 500 }); else setTimeout(go, 30);
}
function hxDbPut(store, rec) {
  return new Promise((res) => {
    if (!IDB.ok) { res(false); return; }
    try {
      const tx = IDB.db.transaction(store, 'readwrite');
      tx.objectStore(store).put(rec);
      tx.oncomplete = () => res(true);
      tx.onerror = tx.onabort = (e) => { if (e && e.preventDefault) e.preventDefault(); res(false); };
    } catch (e) { res(false); }
  });
}
function hxSaveFailed() {
  IDB.failed = true;
  if (HX.saveFail) return;
  HX.saveFail = true;
  toast('Der Gerätespeicher ist voll – neue Schichten werden nicht mehr gesichert. Sie spielen weiter.', 7000, { label: 'Aufräumen', fn: () => hxCardOpen() });
  hxCardDirty();
}
function hxDbDel(key) {
  if (!IDB.ok || !hxLive()) return;
  idbDo('rings', 'readwrite', (st) => st.delete(key));
  idbDo('ringsegs', 'readwrite', (st) => st.delete(IDBKeyRange.bound([key, '', 0], [key, '￿', Number.MAX_SAFE_INTEGER])));
}
// after a reload: the records, read at boot; the Schleifen made once the processor runs (sound started)
async function hxRestoreRead() {
  if (!IDB.ok || !IDB.db.objectStoreNames.contains('rings')) return;
  const all = (await idbDo('rings', 'readonly', (st) => st.getAll())) || [];
  HX.restoreS = all.find((r) => r.id === '_s') || null;
  if (HX.restoreS && Array.isArray(HX.restoreS.lich)) { HX.lich = HX.restoreS.lich.filter((x) => x && x.id && x.loops).slice(0, HX_LICH_MAX); HX.lichCur = HX.restoreS.lichCur || null; }   // (step 1d: the form)
  if (HX.restoreS && HX.restoreS.fl && Array.isArray(HX.restoreS.fl.items)) HX.fl = { items: HX.restoreS.fl.items.filter((x) => x && x.lich && x.n > 0), loop: !!HX.restoreS.fl.loop, on: false, i: 0 };   // (step 2b: the Folge)
  const recs = all.filter((r) => r.id !== '_s' && ((r.sch && r.sch.length) || r.bew));
  if (recs.length) { HX.restore = recs; if (HX.state === 'ok' && HX.node) hxRestoreApply(); }
}
async function hxRestoreApply() {
  const recs = HX.restore; HX.restore = null;
  if (!recs || !recs.length) return;
  let n = 0, rsLost = 0;
  // the tempo they were made in (theirs, or the Puls's then): a Takt Schleife's audio fits only that – they give it now
  const tk = recs.find((r) => r.lock === 'takt' && r.sch && r.sch.length), tb = HX.restoreS && HX.restoreS.hxOn ? HX.restoreS.hx : tk ? (HX.restoreS && HX.restoreS.bpm) || tk.bpm : 0;
  if (tb && !SEQ.ext) { TG.hxOn = true; TG.hx = tb; TG.keep = !!(HX.restoreS && HX.restoreS.keep); tgRetempo(TG.hx); for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null); updDelay(); }
  const lost = { n: 0 };
  for (const r of recs.sort((a, b) => a.slot - b.slot)) {
    if (HX.slot[r.slot]) continue;
    const segsOf = (key) => idbDo('ringsegs', 'readonly', (st) => st.getAll(IDBKeyRange.bound([r.id, key, 0], [r.id, key, Number.MAX_SAFE_INTEGER])));
    if (await hxRecBuild(r, segsOf, { lost })) n++;
  }
  rsLost = lost.n;
  if (!n) return;
  if (HX.restoreS && HX.restoreS.fokus) { const F = hxByKey(HX.restoreS.fokus); if (F) HX.fokus = F.id; }
  hxAccRelink();   // (step 4: the Sammelschleifen find their sources)
  HX.ruht = true; HX.persistAsked = false; hxPersistAsk();
  toast('Hexenring wiederhergestellt: ' + n + (n === 1 ? ' Schleife' : ' Schleifen') + ', angehalten.' + (rsLost ? ' ' + rsLost + (rsLost === 1 ? ' Schicht in anderer Abtastrate ließ' : ' Schichten in anderer Abtastrate ließen') + ' sich nicht umrechnen.' : ''), 9000, { label: '▶ Weiter', fn: hxWeiter });
  hxSay('Hexenring wiederhergestellt'); hxRailDirty(); hxCardDirty(); hxStripSync();
}
// one stored Schleife made again: its record r and its audio (segsOf(key) → the segments of one Schicht or version) –
// after a reload from „rings“, from a Kreis (o.fresh: new keys, saved anew as a Schleife of this session)
async function hxRecBuild(r, segsOf, o = {}) {
  if (r.bew && !(r.sch && r.sch.length)) {   // (step 1d: a Schleife of Bewegung – no audio, its lanes)
    const B = r.bew, dec = (x) => faeDec(x, B.n), lanes = (B.lanes || []).map((x) => ({ k: x.k, src: x.src, v: dec(x.d) })).filter((x) => x.v && MODT[x.k]);
    if (!lanes.length) return null;
    const disp = B.disp ? Object.fromEntries(Object.entries(B.disp).map(([k, v]) => [k, dec(v)]).filter(([, v]) => v)) : null;
    const sn = { key: o.fresh ? hxKey('l') : r.id, col: r.col || null, colA: r.colA || null, slot: r.slot, d: { lock: 'takt', b0: r.b0 + TG.o, beats: r.beats }, bpb: 4, notes: [], eng: 'bew', gain: r.gain, state: 'angehalten', eig: r.eig, sch: [], bew: { lanes, disp, n: B.n, g0: B.g0, gs: r.b0 + TG.o + (B.gs || 0), fade: B.fade, why: B.why } };
    const L = hxRebuild(sn, { state: 'angehalten', fokus: false, noSave: true });
    if (L) { L.made = o.fresh ? Date.now() : r.made || Date.now(); hxSaveMeta(L.id); }
    return L;
  }
  const sch = [];
  for (const s of r.sch) {
    if (!s.saved) continue;   // (a Kreis: every Schicht it holds is complete)
    const read = async (key, nn, ns) => {
      const n = nn || s.n, segN = ns || s.segs;
      const segs = ((await segsOf(key)) || []).sort((a, b) => a.i - b.i);
      if (segs.length < segN) return null;
      const [aud] = hxChunks(n);
      let o = 0;
      for (const g of segs) { const L = new Float32Array(g.L), R = new Float32Array(g.R); for (let i = 0; i < L.length && o < n; i++, o++) { const c = aud[Math.floor(o / HX_CH)]; c[0][o % HX_CH] = L[i]; c[1][o % HX_CH] = R[i]; } }
      return aud;
    };
    const aud = await read(s.key);
    if (!aud) continue;
    const bak = s.bakd ? await read(s.key + '~b') : null;   // (the baked version beside it: it plays as baked, exact)
    const f32 = (a) => (a ? Float32Array.from(a) : null), sr = s.sr || r.sr;
    // (step 2a) its Treu render and its anchor, as they were (at another rate: rendered again from the notes)
    const ver = async (V, w) => { if (!V || sr !== SR) return null; const a = await read(s.key + '~' + w, V.n, Math.ceil(V.n / (HX_SEG * sr))); return a ? Object.assign({}, V, { aud: a }) : null; };
    const wu = await ver(s.wu, 'w'), anc = await ver(s.anc, 'x');
    sch.push(Object.assign({}, s, { aud, bak, kc: f32(s.kc), kcB: f32(s.kcB), dr: f32(s.dr), sr, cut: s.cut ? Object.assign({}, s.cut, { stale: true }) : null, wu, anc }));
  }
  if (!sch.length) return null;
  // another sample rate: the processor's resampler, then every frame count scaled (one it could not convert stays out
  // of the loop – never played at the wrong speed – and the toast says so)
  for (const s of sch) if (s.sr !== SR) { s.bak = null; s.kcB = null; s.zo = Math.round((s.zo || 0) * SR / s.sr); }   // (another rate: the dry Abdruck is converted; it plays dry through the live chain)
  for (const s of sch) if (s.sr !== SR) await hxResampleS(s);
  for (let i = sch.length - 1; i >= 0; i--) if (sch[i].sr !== SR) { sch.splice(i, 1); if (o.lost) o.lost.n++; }
  if (!sch.length) return null;
  if (o.fresh) for (const x of sch) x.key = hxKey('s');   // (a Kreis loaded: new keys – it may come twice, beside the Schleifen it was made of)
  const k = r.sr && r.sr !== SR ? SR / r.sr : 1;
  const sn = { key: o.fresh ? hxKey('l') : r.id, col: r.col || null, colA: r.colA || null, slot: r.slot, d: { lock: r.lock, b0: r.b0 + TG.o, beats: r.beats, L: r.L ? (k === 1 ? r.L : r.L * k) : r.L, ph0: 0, gap: !!r.gap }, bpb: r.bpb, eco: r.eco || null, notes: r.notes || [], mv: r.mv, cut: r.cut ? Object.assign({}, r.cut, { stale: true }) : null, eng: r.eng, setTG: r.setTG, gain: r.gain, pan: r.pan || 0, src: r.src, bpm: r.bpm, state: 'angehalten', tk: r.tk, folgt: r.folgt, taumeln: r.taumeln, eig: r.eig, naehrt: r.naehrt || null, sch,
    wwhy: r.wwhy || {}, ton: r.tonV ? r.ton : r.ton === 'diatonisch' ? 'fest' : r.ton, klang: r.klang, stufe: r.stufe, q: r.q, P: r.P, mask: r.mask, chainRec: r.chainRec, jrg: r.jrg, tb: r.tb || null, mi: r.mi || null };   // (step 2a; step 2b: its tools; Etappe 3: role, Gärtner, Wiederkehr)
  const L = hxRebuild(sn, { state: 'angehalten', fokus: false, noSave: true });
  if (L && o.fresh) { L.nudge = r.nudge || 0; L.plan = r.plan; L.made = Date.now(); hxSaveLoop(L); return L; }
  if (L) { L.nudge = r.nudge || 0; L.plan = r.plan; L.made = r.made || Date.now(); for (const id of L.sch) { const S = HX.sch.get(id); if (S) { S.saved = hxSegs(S); if (S.bak) S.savedB = hxSegs(S); if (S.wu) S.savedW = hxSegsV(S, 'w'); if (S.anc) S.savedX = hxSegsV(S, 'x'); } } hxSaveMeta(L.id); }
  return L;
}
// a Schicht stored at another rate: through the processor's resampler (160 taps) in an offline render of its own – on
// its own thread, never the live one (there a conversion took ≈ 0.6 ms of every 2.7-ms block while it ran)
async function hxResampleS(s) {
  const ratio = s.sr / SR, n2 = Math.max(1, Math.floor((s.n - 1) / ratio) + 1), [dst] = hxChunks(n2), blk = 8192;
  let chunks = null;
  try {
    const ctx = new OfflineAudioContext(2, (Math.ceil(n2 / blk) + 4) * 128, SR);
    if (!(await ensureDSP(ctx))) return s;
    const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit',
      processorOptions: { humusS: 2, chunk: HX_CH, msgs: [{ rs: { id: 1, ch: s.aud, tot: s.n, ratio, n: n2, dst, blk } }] } });
    const got = new Promise((res) => { node.port.onmessage = (e) => { if (e.data && e.data.rsd) res(e.data.rsd.chunks); }; });
    node.connect(ctx.destination, 0);
    await ctx.startRendering();
    chunks = await Promise.race([got, new Promise((res) => setTimeout(() => res(null), 3000))]);
  } catch (e) { console.warn('Hexenring: Umrechnung', e); }
  if (!chunks) return s;   // (kept at its rate: hxRestoreApply leaves it out and says so)
  const k = SR / s.sr, sc = (v) => Math.round(v * k);
  return Object.assign(s, { aud: chunks, n: n2, pre: sc(s.pre), len: sc(s.len), X: sc(s.X), aus: s.aus ? { off: sc(s.aus.off), len: Math.min(sc(s.aus.len), n2 - sc(s.aus.off)) } : null, sr: SR,
    cut: s.cut ? Object.assign({}, s.cut, { pre: sc(s.cut.pre), len: sc(s.cut.len), n: n2, f0: 0, w0: 0, w1: 0 }) : null });
}

/* ---- Step 1c: the Werk-Rahmen (SPEC §8), the bake and Taumeln (§9), the seams complete (§7), Spielverzögerung (§2),
   count-in and click (§6.3). The Werk-Rahmen is this page in a hidden frame of itself: a second realm whose every
   singleton (A, RHZ, MOD, KS_CACHE, Q …) is its own, so an offline render there can never touch the live instrument. ---- */

