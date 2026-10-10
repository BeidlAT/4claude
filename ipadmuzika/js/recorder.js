// Sphärenwerk – Aufnahme vom Altar, taktgenau für Loopy Pro: Einzähler, genaue Schleifenlänge und auf Wunsch
// der Nachklang (Hall, Echo) in den Anfang gefaltet, damit die Schleife ohne Naht weiterklingt.
'use strict';

/* ---------- WAV- und ZIP-Schreiber (aus Myzel übernommen) ---------- */
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crcUpdate(c, u) { for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return c; }
const FMT_INFO = { f32: { bps: 4, label: '32-Bit-Float', tag: '32bit-float' }, s24: { bps: 3, label: '24-Bit', tag: '24bit' }, s16: { bps: 2, label: '16-Bit', tag: '16bit' } };
const yieldUI = () => new Promise((r) => setTimeout(r, 0));

async function encodeWav(tk, fmt, normalize, onProgress) {
  const ch = 2, bps = FMT_INFO[fmt].bps, isF = fmt === 'f32';
  const block = ch * bps, frames = tk.frames, dataBytes = frames * block;
  const enc = new TextEncoder();
  const infoItems = [['INAM', tk.name], ['ISFT', 'Sphärenwerk (Web Audio)'], ['ICRD', isoDate(new Date(tk.date))], ['ICMT', tk.mode === 'takt' ? tk.bars + ' Takte bei ' + tk.bpm + ' BPM' : 'freie Aufnahme']].map(([id, str]) => {
    let b = enc.encode(str + '\0'); if (b.length % 2) { const p = new Uint8Array(b.length + 1); p.set(b); b = p; }
    return [id, b];
  });
  const infoSize = 4 + infoItems.reduce((a, [, b]) => a + 8 + b.length, 0);
  const fmtSize = isF ? 18 : 16;
  const headSize = 12 + 8 + fmtSize + (isF ? 12 : 0) + 8 + infoSize + 8;
  const hb = new ArrayBuffer(headSize), dv = new DataView(hb), u8 = new Uint8Array(hb);
  let o = 0;
  const str = (x) => { for (let i = 0; i < 4; i++) dv.setUint8(o++, x.charCodeAt(i)); };
  const u32 = (v) => { dv.setUint32(o, v, true); o += 4; };
  const u16 = (v) => { dv.setUint16(o, v, true); o += 2; };
  str('RIFF'); u32(headSize - 8 + dataBytes); str('WAVE');
  str('fmt '); u32(fmtSize); u16(isF ? 3 : 1); u16(ch); u32(tk.sr); u32(tk.sr * block); u16(block); u16(bps * 8);
  if (isF) { u16(0); str('fact'); u32(4); u32(frames); }
  str('LIST'); u32(infoSize); str('INFO');
  for (const [id, b] of infoItems) { str(id); u32(b.length); u8.set(b, o); o += b.length; }
  str('data'); u32(dataBytes);
  let crc = crcUpdate(0xFFFFFFFF, u8);
  const gain = normalize && tk.peak > 0 ? Math.pow(10, -1 / 20) / tk.peak : 1;
  const blobs = [new Blob([hb])];
  let pending = [], pendingBytes = 0, k = 0, done = 0;
  for (let c = 0; c < tk.L.length; c++) {
    const L = tk.L[c], R = tk.R[c], m = L.length;
    let bytes;
    if (isF) {
      const out = new Float32Array(m * 2);
      for (let i = 0, j = 0; i < m; i++, j += 2) { out[j] = L[i] * gain; out[j + 1] = R[i] * gain; }
      bytes = new Uint8Array(out.buffer);
      if (!LITTLE) { const d = new DataView(out.buffer); for (let q = 0; q < out.length; q++) d.setFloat32(q * 4, out[q], true); }
    } else if (fmt === 's24') {
      bytes = new Uint8Array(m * 6);
      let q = 0;
      for (let i = 0; i < m; i++) {
        for (let s = 0; s < 2; s++) {
          const x = clamp((s ? R[i] : L[i]) * gain, -1, 1);
          const v = clamp(Math.round(x * 8388607 + (Math.random() - Math.random())), -8388608, 8388607);
          bytes[q++] = v & 255; bytes[q++] = (v >> 8) & 255; bytes[q++] = (v >> 16) & 255;
        }
      }
    } else {
      const ab = new ArrayBuffer(m * 4), d = new DataView(ab);
      for (let i = 0, q = 0; i < m; i++, q += 4) {
        d.setInt16(q, clamp(Math.round(clamp(L[i] * gain, -1, 1) * 32767 + (Math.random() - Math.random())), -32768, 32767), true);
        d.setInt16(q + 2, clamp(Math.round(clamp(R[i] * gain, -1, 1) * 32767 + (Math.random() - Math.random())), -32768, 32767), true);
      }
      bytes = new Uint8Array(ab);
    }
    crc = crcUpdate(crc, bytes);
    pending.push(bytes); pendingBytes += bytes.length; done += m;
    if (pendingBytes > 4 * 1048576) { blobs.push(new Blob(pending)); pending = []; pendingBytes = 0; }
    if (++k % 4 === 0) { if (onProgress) onProgress(done / frames); await yieldUI(); }
  }
  if (pending.length) blobs.push(new Blob(pending));
  return { blob: new Blob(blobs, { type: 'audio/wav' }), crc: (crc ^ 0xFFFFFFFF) >>> 0, size: headSize + dataBytes };
}
function zipEntry(name, bytesOrBlob) {
  if (bytesOrBlob instanceof Uint8Array) return { name, blob: new Blob([bytesOrBlob]), crc: (crcUpdate(0xFFFFFFFF, bytesOrBlob) ^ 0xFFFFFFFF) >>> 0, size: bytesOrBlob.length };
  return Object.assign({ name }, bytesOrBlob);
}
function buildZip(entries, date) {
  const enc = new TextEncoder();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const out = [], central = [];
  let offset = 0;
  for (const f of entries) {
    const name = enc.encode(f.name);
    const lh = new DataView(new ArrayBuffer(30 + name.length));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, day, true); lh.setUint32(14, f.crc, true);
    lh.setUint32(18, f.size, true); lh.setUint32(22, f.size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    new Uint8Array(lh.buffer).set(name, 30);
    out.push(lh.buffer, f.blob);
    const cd = new DataView(new ArrayBuffer(46 + name.length));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true); cd.setUint16(12, time, true); cd.setUint16(14, day, true); cd.setUint32(16, f.crc, true);
    cd.setUint32(20, f.size, true); cd.setUint32(24, f.size, true); cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    new Uint8Array(cd.buffer).set(name, 46);
    central.push(cd.buffer);
    offset += 30 + name.length + f.size;
  }
  const cdSize = central.reduce((a, b) => a + b.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...out, ...central, end.buffer], { type: 'application/zip' });
}

/* ---------- Speichern und Teilen ---------- */
const Files = {
  dl: null, checked: false,
  init() {
    if (IN_VIEWER) {
      try { window.claude.use('downloads').then((d) => { this.dl = d; this.checked = true; }, () => { this.checked = true; }); } catch (e) { this.checked = true; }
    } else this.checked = true;
  },
  canSave() { return !!this.dl || !IN_VIEWER; },
  // liefert 'saved' | 'shared' | 'declined' | 'error'
  async offer(filename, blob, mime) {
    if (this.dl) {
      try { await this.dl.save({ filename, data: blob }); return 'saved'; }
      catch (e) { return e && e.code === 'declined' ? 'declined' : 'error'; }
    }
    if (IN_VIEWER) return 'error';
    const file = new File([blob], filename, { type: mime || blob.type });
    if (navigator.canShare && navigator.share) {
      try { if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return 'shared'; } }
      catch (e) { if (e && e.name === 'AbortError') return 'declined'; }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'saved';
  },
};

/* ---------- Aufnahmen im Browser behalten (IndexedDB) ---------- */
const TakeDB = {
  db: null,
  open() {
    return new Promise((res) => {
      try {
        const rq = indexedDB.open('sphaerenwerk', 1);
        rq.onupgradeneeded = () => { const db = rq.result; db.createObjectStore('takes', { keyPath: 'id' }); db.createObjectStore('segs', { keyPath: ['take', 'i'] }); };
        rq.onsuccess = () => { this.db = rq.result; res(true); };
        rq.onerror = () => res(false); rq.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  },
  tx(store, mode, fn) {
    return new Promise((res) => {
      if (!this.db) { res(null); return; }
      try {
        const tx = this.db.transaction(store, mode), rq = fn(tx.objectStore(store));
        tx.oncomplete = () => res(rq && 'result' in rq ? rq.result : true);
        tx.onerror = tx.onabort = () => res(null);
      } catch (e) { res(null); }
    });
  },
  async put(tk) {
    const meta = Object.assign({}, tk); delete meta.L; delete meta.R; meta.segs = tk.L.length;
    await this.tx('takes', 'readwrite', (s) => s.put(meta));
    for (let i = 0; i < tk.L.length; i++) await this.tx('segs', 'readwrite', (s) => s.put({ take: tk.id, i, L: tk.L[i], R: tk.R[i] }));
  },
  async all() { return (await this.tx('takes', 'readonly', (s) => s.getAll())) || []; },
  async load(tk) {
    const L = [], R = [];
    for (let i = 0; i < tk.segs; i++) {
      const seg = await this.tx('segs', 'readonly', (s) => s.get([tk.id, i]));
      if (!seg) return false;
      L.push(seg.L); R.push(seg.R);
    }
    tk.L = L; tk.R = R; return true;
  },
  async del(tk) {
    await this.tx('takes', 'readwrite', (s) => s.delete(tk.id));
    await this.tx('segs', 'readwrite', (s) => s.delete(IDBKeyRange.bound([tk.id, 0], [tk.id, Number.MAX_SAFE_INTEGER])));
  },
};

/* ---------- Der Rekorder ---------- */
const SEG = 1 << 20;

const Recorder = {
  takes: [], state: 'idle', cur: null, player: null, playing: null, n: 0,
  async init() {
    Files.init();
    Audio.on('rec', (m) => { if (this.cur) { this.cur.L.push(m.l); this.cur.R.push(m.r); } });
    Audio.on('recDone', (m) => this.done(m));
    if (await TakeDB.open()) {
      const list = await TakeDB.all();
      list.sort((a, b) => a.date - b.date);
      this.takes = list; this.n = list.length;
    }
  },
  opts() {
    return {
      mode: Settings.get('recMode'), bars: Settings.get('recBars'), count: Settings.get('recCount'),
      fold: Settings.get('recFold'), tail: Settings.get('recTail'), click: Settings.get('recClick'),
    };
  },
  toggle() {
    if (!Audio.ready) { App.awaken(); return; }
    if (this.state === 'idle') this.arm();
    else this.stop();
  },
  arm() {
    const o = this.opts();
    this.cur = { L: [], R: [], mode: o.mode, bars: o.bars, bpm: Machine.st.tempo, fold: o.fold, date: Date.now() };
    if (o.mode === 'takt') {
      Audio.send({ t: 'rec', op: 'arm', bars: o.bars, countIn: o.count ? 1 : 0, tail: o.fold ? o.tail * 4 : 0, click: Settings.get('metronom') ? 2 : o.click ? 1 : 0 });
      this.state = o.count ? 'count' : 'rec';
    } else {
      Audio.send({ t: 'rec', op: 'free' });
      this.state = 'rec';
    }
    App.recState();
  },
  stop() {
    if (this.state === 'idle') return;
    if (this.cur && this.cur.mode === 'takt' && this.state !== 'count') this.cur.early = true;
    Audio.send({ t: 'rec', op: 'stop' });
  },
  async done(m) {
    const cur = this.cur; this.cur = null; this.state = 'idle'; App.recState();
    if (!cur || m.cancel) { toast('Aufnahme abgebrochen.'); return; }
    let total = 0; for (const c of cur.L) total += c.length;
    if (total < Audio.sr * 0.2) { toast('Die Aufnahme war zu kurz.'); return; }
    const takt = cur.mode === 'takt' && !cur.early;
    const loop = takt ? Math.min(m.loop, total) : total;
    // zusammensetzen, Nachklang in den Anfang falten
    const L = new Float32Array(loop), R = new Float32Array(loop);
    let pos = 0;
    for (let i = 0; i < cur.L.length; i++) {
      const cl = cur.L[i], cr = cur.R[i];
      for (let j = 0; j < cl.length; j++, pos++) {
        if (pos < loop) { L[pos] += cl[j]; R[pos] += cr[j]; }
        else if (takt && cur.fold) { const q = (pos - loop) % loop; L[q] += cl[j]; R[q] += cr[j]; }
      }
    }
    let peak = 0;
    for (let i = 0; i < loop; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > peak) peak = a; if (b > peak) peak = b; }
    const segL = [], segR = [];
    for (let i = 0; i < loop; i += SEG) { segL.push(L.slice(i, Math.min(loop, i + SEG))); segR.push(R.slice(i, Math.min(loop, i + SEG))); }
    const n = ++this.n;
    const tk = {
      id: 'take-' + cur.date, name: 'Aufnahme ' + n, date: cur.date, sr: Audio.sr, bpm: cur.bpm, bars: takt ? cur.bars : 0,
      mode: takt ? 'takt' : 'frei', fold: takt && cur.fold, frames: loop, peak, L: segL, R: segR,
    };
    this.takes.push(tk);
    TakeDB.put(tk);
    const dur = fnum1(loop / Audio.sr, 1) + ' s';
    toast(takt ? `Schleife fertig: ${tk.bars} ${tk.bars === 1 ? 'Takt' : 'Takte'} bei ${tk.bpm} BPM (${dur}).` : `Aufnahme fertig (${dur}).`, 5000, { label: 'Ansehen', fn: () => this.sheet() });
    if (peak > 0.99) setTimeout(() => toast('Hinweis: Die Aufnahme ist sehr laut. Am Altar den Pegel etwas senken.'), 5200);
  },
  label(tk) {
    const dur = fnum1(tk.frames / tk.sr, 1).replace('.', ',') + ' s';
    return tk.mode === 'takt' ? `${tk.bars} ${tk.bars === 1 ? 'Takt' : 'Takte'} · ${tk.bpm} BPM · ${dur}` : `frei · ${dur}`;
  },
  async play(tk, btn) {
    if (this.player) { try { this.player.stop(); } catch (e) { /* egal */ } this.player = null; if (this.playing === tk) { this.playing = null; this.sheet(); return; } }
    if (!tk.L && !(await TakeDB.load(tk))) { toast('Die Daten dieser Aufnahme sind nicht mehr da.'); return; }
    const ctx = Audio.ctx, buf = ctx.createBuffer(2, tk.frames, tk.sr);
    let o = 0;
    for (let i = 0; i < tk.L.length; i++) { buf.getChannelData(0).set(tk.L[i], o); buf.getChannelData(1).set(tk.R[i], o); o += tk.L[i].length; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = tk.mode === 'takt';
    src.connect(ctx.destination); src.start();
    src.onended = () => { if (this.player === src) { this.player = null; this.playing = null; } };
    this.player = src; this.playing = tk;
    this.sheet();
  },
  filename(tk, fmt, ext) {
    const base = 'sphaerenwerk-' + slug(tk.name) + (tk.mode === 'takt' ? '-' + tk.bpm + 'bpm-' + tk.bars + 'takte' : '-' + stamp(new Date(tk.date)));
    return base + '-' + FMT_INFO[fmt].tag + '.' + ext;
  },
  async prepare(tk, btn) {
    if (!tk.L && !(await TakeDB.load(tk))) { toast('Die Daten dieser Aufnahme sind nicht mehr da.'); return; }
    const fmt = Settings.get('recFmt');
    btn.disabled = true;
    const label = btn.textContent;
    const wav = await encodeWav(tk, fmt, Settings.get('recNorm'), (f) => { btn.textContent = 'Wird vorbereitet … ' + Math.round(f * 100) + ' %'; });
    btn.disabled = false;
    let blob = wav.blob, name = this.filename(tk, fmt, 'wav'), mime = 'audio/wav';
    if (IN_VIEWER) {
      const readme = [
        'Sphärenwerk – ' + tk.name, '',
        'Datei: ' + name, 'Format: WAV, ' + tk.sr + ' Hz, ' + FMT_INFO[fmt].label + ', Stereo',
        tk.mode === 'takt' ? 'Schleife: ' + tk.bars + ' Takte bei ' + tk.bpm + ' BPM' + (tk.fold ? ', Nachklang in den Anfang gefaltet' : '') : 'Freie Aufnahme',
        '', 'In Loopy Pro: Datei in der Dateien-App entpacken und in einen Clip importieren.',
      ].join('\r\n');
      blob = buildZip([zipEntry(name, wav), zipEntry('LIESMICH.txt', new TextEncoder().encode(readme))], new Date());
      name = name.replace(/\.wav$/, '.zip'); mime = 'application/zip';
    }
    // Teilen braucht eine frische Berührung: der Knopf wird zum Teilen-Knopf
    btn.textContent = IN_VIEWER ? 'ZIP sichern' : 'Teilen oder sichern';
    btn.classList.add('ready');
    btn.onclick = async () => {
      const r = await Files.offer(name, blob, mime);
      if (r === 'saved' || r === 'shared') { tk.saved = true; toast(r === 'shared' ? 'Übergeben.' : 'Gespeichert: ' + name); }
      else if (r === 'error') toast('Speichern ist hier gerade nicht möglich.');
      btn.textContent = label; btn.classList.remove('ready');
      btn.onclick = () => this.prepare(tk, btn);
    };
  },
  async remove(tk) {
    if (this.playing === tk) this.play(tk);
    this.takes = this.takes.filter((x) => x !== tk);
    await TakeDB.del(tk);
    this.sheet();
  },

  /* --- Blatt: Einstellungen und Aufnahmen --- */
  sheet() {
    const o = this.opts();
    const body = h('div', { class: 'recsheet' });
    body.append(
      h('p', { class: 'sheet-note' }, 'Für Loopy Pro: Stell hier dasselbe Tempo ein wie dort. Eine Takt-Aufnahme hat dann genau die Länge einer Schleife; die WAV-Datei importierst du in Loopy Pro in einen Clip.'),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Art'), chips([{ id: 'takt', label: 'Im Takt' }, { id: 'frei', label: 'Frei' }], o.mode, (v) => { Settings.set('recMode', v); this.sheet(); })),
    );
    if (o.mode === 'takt') {
      body.append(
        h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Länge'), chips([1, 2, 4, 8, 16].map((b) => ({ id: b, label: b + (b === 1 ? ' Takt' : ' Takte') })), o.bars, (v) => Settings.set('recBars', v))),
        h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Einzähler'), chips([{ id: true, label: '1 Takt' }, { id: false, label: 'ohne' }], o.count, (v) => Settings.set('recCount', v))),
        h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Nahtlos'), chips([{ id: true, label: 'Nachklang einfalten' }, { id: false, label: 'hart schneiden' }], o.fold, (v) => Settings.set('recFold', v))),
        h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Nachklang'), chips([1, 2, 4].map((b) => ({ id: b, label: b + (b === 1 ? ' Takt' : ' Takte') })), o.tail, (v) => Settings.set('recTail', v))),
        h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Klick'), chips([{ id: true, label: 'im Einzähler' }, { id: false, label: 'still' }], o.click, (v) => { Settings.set('recClick', v); Audio.send({ t: 'click', mode: Audio.clickMode() }); })),
      );
    }
    body.append(h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Format'), chips(['s24', 's16', 'f32'].map((f) => ({ id: f, label: 'WAV ' + FMT_INFO[f].label })), Settings.get('recFmt'), (v) => Settings.set('recFmt', v))));
    const list = h('div', { class: 'takes' });
    if (!this.takes.length) list.append(h('p', { class: 'empty' }, 'Noch keine Aufnahmen. Tippe oben auf AUFNAHME; im Takt-Modus zählt die Maschine einen Takt ein und hört nach der gewählten Länge selbst auf.'));
    for (const tk of this.takes.slice().reverse()) {
      const playB = h('button', { type: 'button', class: 'btn small', onclick: () => this.play(tk) }, this.playing === tk ? 'Anhalten' : (tk.mode === 'takt' ? 'Als Schleife hören' : 'Anhören'));
      const saveB = h('button', { type: 'button', class: 'btn small primary' }, 'WAV sichern');
      saveB.onclick = () => this.prepare(tk, saveB);
      list.append(h('div', { class: 'take' },
        h('div', { class: 'take-n' }, tk.name, tk.saved ? h('span', { class: 'saved' }, ' · gesichert') : null),
        h('div', { class: 'take-m' }, this.label(tk)),
        h('div', { class: 'take-a' }, playB, saveB, confirmButton('Löschen', 'Wirklich löschen?', () => this.remove(tk), 'small warn'))));
    }
    body.append(h('h3', { class: 'sub' }, 'Aufnahmen'), list);
    if (!Files.canSave() && Files.checked) body.append(h('p', { class: 'sheet-note' }, 'In dieser Ansicht kann die Seite keine Dateien übergeben.'));
    Sheet.open('Aufnahme', body, { wide: true });
  },
};
