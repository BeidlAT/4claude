/* ---------- take backup in IndexedDB (survives reloads and tab crashes) ---------- */
const IDB = { db: null, ok: false, failed: false };
function idbOpen() {
  return new Promise((res) => {
    try {
      // version 2 (Hexenring, SPEC §19): its Schleifen and their audio; only the stores missing are made
      const rq = indexedDB.open('myzel', 2);
      rq.onupgradeneeded = () => {
        const db = rq.result, has = (n) => db.objectStoreNames.contains(n);
        if (!has('takes')) db.createObjectStore('takes', { keyPath: 'id' });
        if (!has('segs')) db.createObjectStore('segs', { keyPath: ['take', 'i'] });
        if (!has('rings')) db.createObjectStore('rings', { keyPath: 'id' });
        if (!has('ringsegs')) db.createObjectStore('ringsegs', { keyPath: ['ring', 'schicht', 'i'] });
      };
      rq.onsuccess = () => { IDB.db = rq.result; IDB.ok = true; IDB.db.onversionchange = () => { try { IDB.db.close(); } catch (e) {} IDB.ok = false; toast('Myzel wurde in einem anderen Tab erneuert – lade diese Seite neu, damit weiter gesichert wird.', 8000); }; res(true); };
      rq.onerror = () => res(false);
      rq.onblocked = () => toast('Myzel ist noch in einem anderen Tab offen – schließe ihn, damit Aufnahmen und Schleifen gesichert werden.', 8000);   // (it opens once the other tab lets go)
    } catch (e) { res(false); }
  });
}
function idbDo(store, mode, fn) {
  return new Promise((res) => {
    if (!IDB.ok) { res(null); return; }
    try {
      const tx = IDB.db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req && 'result' in req ? req.result : true);
      tx.onerror = tx.onabort = () => { if (mode === 'readwrite') IDB.failed = true; res(null); };
    } catch (e) { if (mode === 'readwrite') IDB.failed = true; res(null); }
  });
}
const segRange = (id) => IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
function concatF32(list) {
  let n = 0; for (const a of list) n += a.length;
  const out = new Float32Array(n); let o = 0;
  for (const a of list) { out.set(a, o); o += a.length; }
  return out;
}
function backupSegment(rec) {
  if (!IDB.ok || !rec.segFrames) return;
  const from = rec.segChunk, to = rec.L.length;
  const i = rec.segIdx++;
  (rec.segs || (rec.segs = [])).push([i, from, to]);
  rec.segChunk = to; rec.segFrames = 0;
  putSegment(rec, i, from, to);
  idbDo('takes', 'readwrite', (st) => st.put(takeMeta(rec)));
}
function putSegment(rec, i, from, to) {
  const L = concatF32(rec.L.slice(from, to)), R = concatF32(rec.R.slice(from, to));
  idbDo('segs', 'readwrite', (st) => st.put({ take: rec.id, i, L: L.buffer, R: R.buffer }));
}
function takeMeta(t) {
  return { id: t.id, name: t.name, sr: t.sr, frames: t.frames, peak: t.peak, date: t.date.getTime(), patch: t.patch, saved: !!t.saved, done: !!t.done, bars: t.bars || 0, bpm: t.bpm || 0, seamless: !!t.seamless };
}
async function restoreTakes() {
  if (!(await idbOpen())) return;
  const metas = (await idbDo('takes', 'readonly', (st) => st.getAll())) || [];
  metas.sort((a, b) => b.date - a.date);
  for (const m of metas) {
    if (takes.some((t) => t.id === m.id)) continue;
    // an interrupted bar take is just audio: drop a bar count an older version put into its name
    takes.push({ id: m.id, name: m.done ? m.name : m.name.replace(/ · \d+ Takte?( · [\d.,]+ BPM)?/, ''), sr: m.sr, frames: m.frames, peak: m.peak, date: new Date(m.date), patch: m.patch || {}, saved: m.saved, done: true, L: null, R: null, restored: true, recovered: !m.done, comp: null, bars: m.done ? m.bars || 0 : 0, bpm: m.bpm || 0, seamless: !!m.seamless });
  }
  takeCounter = takes.reduce((n, t) => Math.max(n, Number((/^Aufnahme (\d+)/.exec(t.name) || /(\d+)$/.exec(t.name) || [])[1]) || 0), takeCounter);
  renderTakes();
  restoreUserTex();
  if (takes.some((t) => t.recovered)) toast('Eine unterbrochene Aufnahme wurde wiederhergestellt.');
  hxRestoreRead();   // Hexenring: its Schleifen (rings, ringsegs) – made once sound runs
}
async function ensureTakeData(tk) {
  if (tk.L) return true;
  const segs = (await idbDo('segs', 'readonly', (st) => st.getAll(segRange(tk.id)))) || [];
  if (!segs.length) return false;
  segs.sort((a, b) => a.i - b.i);
  tk.L = segs.map((s) => new Float32Array(s.L)); tk.R = segs.map((s) => new Float32Array(s.R));
  tk.frames = tk.L.reduce((n, a) => n + a.length, 0);
  if (!tk.peak) for (const arr of [...tk.L, ...tk.R]) for (let i = 0; i < arr.length; i++) { const x = Math.abs(arr[i]); if (x > tk.peak) tk.peak = x; }
  return true;
}
function forgetTake(tk) {
  idbDo('segs', 'readwrite', (st) => st.delete(segRange(tk.id)));
  idbDo('takes', 'readwrite', (st) => st.delete(tk.id));
}

