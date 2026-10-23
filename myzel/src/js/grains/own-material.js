/* ---------- own material for the grains: an audio file or a take, kept on the device ---------- */
const USER_MAX_S = 30;
const USER_MAX_BYTES = 25 * 1024 * 1024;   // whole-file decoding only below this (a long file decodes to hundreds of MB)
// Only the first ~35 s are needed. Streams that decode from their beginning (MP3, OGG, FLAC, ADTS-AAC) are cut after
// a generous byte budget; a WAV gets a header patched to its shortened data. Other formats (M4A …) return null.
async function leadingSlice(file) {
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const str = (o, n) => String.fromCharCode(...head.subarray(o, o + n));
  if (str(0, 4) === 'RIFF' && str(8, 4) === 'WAVE') {
    const dv = new DataView(head.buffer);
    let o = 12, rate = 0;
    while (o + 8 <= head.length) {
      const id = str(o, 4), size = dv.getUint32(o + 4, true);
      if (id === 'fmt ') rate = dv.getUint32(o + 16, true);   // bytes per second
      if (id === 'data') {
        if (!rate) return null;
        const want = Math.min(size, Math.ceil(35 * rate / 4) * 4), total = o + 8 + want;
        if (want >= size) return file.arrayBuffer();
        const ab = await file.slice(0, total).arrayBuffer(), d = new DataView(ab);
        d.setUint32(4, total - 8, true); d.setUint32(o + 4, want, true);
        return ab;
      }
      o += 8 + size + (size & 1);
    }
    return null;
  }
  let skip = 0;
  if (str(0, 3) === 'ID3') skip = 10 + ((head[6] & 127) << 21 | (head[7] & 127) << 14 | (head[8] & 127) << 7 | (head[9] & 127));   // tag with cover art
  const sync = skip > 0 || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);   // MP3 (ID3 tag or frames) or ADTS AAC
  const budget = str(0, 4) === 'fLaC' ? 8e6 : str(0, 4) === 'OggS' || sync ? 2.5e6 : 0;
  if (!budget) return null;
  return file.size <= skip + budget ? file.arrayBuffer() : file.slice(0, skip + budget).arrayBuffer();
}
const USERTEX = { pending: null, name: '' };
async function loadUserFile(file) {
  if (!file) return;
  toast('„' + file.name + '“ wird gelesen …', 2500);
  try {
    const dctx = A.ctx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 1, 48000);
    const decode = (ab) => new Promise((res, rej) => { const pr = dctx.decodeAudioData(ab, res, rej); if (pr && pr.then) pr.then(res, rej); });
    const head = await leadingSlice(file);
    let dec = null;
    if (head) { try { dec = await decode(head); } catch (e) { dec = null; } }
    if (!dec) {
      if (file.size > USER_MAX_BYTES) { toast('Diese Datei ist zu groß. Kürze sie auf ein paar Minuten (oder nimm WAV, MP3, OGG oder FLAC).', 6000); return; }
      dec = await decode(await file.arrayBuffer());
    }
    const n = Math.min(dec.length, Math.floor(USER_MAX_S * dec.sampleRate));
    const L = dec.getChannelData(0).slice(0, n), R = (dec.numberOfChannels > 1 ? dec.getChannelData(1) : dec.getChannelData(0)).slice(0, n);
    useUserMaterial({ L, R, sr: dec.sampleRate, name: file.name.replace(/\.[^.]+$/, '') }, dec.length > n);
  } catch (e) { console.warn(e); toast('Diese Datei kann der Browser nicht lesen. WAV, MP3, M4A oder OGG gehen meistens.', 5000); }
}
async function takeToGrains(tk) {
  if (!(await ensureTakeData(tk))) { toast('Die Daten dieser Aufnahme sind nicht mehr vorhanden.'); return; }
  const n = Math.min(tk.frames, Math.floor(USER_MAX_S * tk.sr));
  const L = headF32(tk.L, n), R = headF32(tk.R, n);
  useUserMaterial({ L, R, sr: tk.sr, name: tk.name }, tk.frames > n);
}
function headF32(list, n) {
  const out = new Float32Array(n);
  let o = 0;
  for (const a of list) { if (o >= n) break; const k = Math.min(a.length, n - o); out.set(k === a.length ? a : a.subarray(0, k), o); o += k; }
  return out;
}
// normalise, fade the ends, guess a pitch, keep it on the device and switch the grains to it
function useUserMaterial(d, cut) {
  let pk = 0;
  for (const a of [d.L, d.R]) for (let i = 0; i < a.length; i++) { const x = a[i] < 0 ? -a[i] : a[i]; if (x > pk) pk = x; }
  if (pk < 1e-4) { toast('Die Datei ist (fast) still.'); return; }
  const g = 0.8 / pk, fade = Math.min(Math.floor(d.sr * 0.01), d.L.length >> 2), n = d.L.length;
  for (let i = 0; i < n; i++) { let e = g; if (i < fade) e *= i / fade; else if (i > n - fade) e *= (n - i) / fade; d.L[i] *= e; d.R[i] *= e; }
  d.ref = guessPitch(d.L, d.sr) || TEX_F;
  setUserTex(d);
  idbDo('segs', 'readwrite', (st) => st.put({ take: 'usertex', i: 0, L: d.L.buffer, R: d.R.buffer, sr: d.sr, name: d.name, ref: d.ref }));
  if (P['kor.src'] !== 'datei') setParam('kor.src', 'datei');
  toast('Körner spielen jetzt „' + d.name + '“' + (cut ? ' (die ersten ' + USER_MAX_S + ' Sekunden)' : '') + (d.ref !== TEX_F ? ' – Grundton erkannt, die Spielfläche spielt es in Tonhöhe.' : '.'), 5500);
}
function setUserTex(d) {
  USERTEX.name = d.name; USERTEX.info = d;
  if (!A.ctx) { USERTEX.pending = d; updUserTexUI(); return; }
  USERTEX.pending = null;
  const buf = A.ctx.createBuffer(2, d.L.length, d.sr);
  buf.getChannelData(0).set(d.L); buf.getChannelData(1).set(d.R);
  A.userTex = { buf, rev: reversed(buf), ref: d.ref };
  for (const v of A.grainVoices) if (P['kor.src'] === 'datei') { v.kor.buf = null; }   // running fingers pick it up
  updUserTexUI();
}
async function restoreUserTex() {
  const rec = await idbDo('segs', 'readonly', (st) => st.get(['usertex', 0]));
  if (rec && rec.L) setUserTex({ L: new Float32Array(rec.L), R: new Float32Array(rec.R), sr: rec.sr, name: rec.name, ref: rec.ref || TEX_F });
}
// autocorrelation on the loudest 85 ms: a clear period between 55 and 1100 Hz becomes the reference pitch
function guessPitch(x, sr) {
  const win = Math.floor(sr * 0.085);
  if (x.length < win * 2) return 0;
  let best = 0, at = 0;
  for (let i = 0; i + win < x.length; i += win >> 1) { let e = 0; for (let k = i; k < i + win; k += 4) e += x[k] * x[k]; if (e > best) { best = e; at = i; } }
  const lo = Math.floor(sr / 1100), hi = Math.floor(sr / 55);
  let e0 = 0; for (let k = 0; k < win; k++) e0 += x[at + k] * x[at + k];
  const cs = [];
  let top = 0;
  for (let lag = lo; lag <= hi && at + win + lag < x.length; lag++) {
    let c = 0; for (let k = 0; k < win; k++) c += x[at + k] * x[at + k + lag];
    c /= e0 || 1; cs.push(c); if (c > top) top = c;
  }
  if (top < 0.75) return 0;
  // the shortest period that correlates almost as well as the best one (multiples of the period correlate too)
  for (let i = 1; i < cs.length - 1; i++) {
    if (cs[i] < 0.92 * top || cs[i] < cs[i - 1] || cs[i] < cs[i + 1]) continue;
    const den = cs[i - 1] - 2 * cs[i] + cs[i + 1], d = den ? 0.5 * (cs[i - 1] - cs[i + 1]) / den : 0;   // parabolic peak between lags
    return sr / (lo + i + clamp(d, -0.5, 0.5));
  }
  return 0;
}
let userTexEl = null;
function updUserTexUI() {
  if (!userTexEl) return;
  userTexEl.textContent = USERTEX.name ? 'Geladen: „' + USERTEX.name + '“' + (USERTEX.info && USERTEX.info.ref !== TEX_F ? ' · Grundton ' + Math.round(USERTEX.info.ref) + ' Hz' : ' · ohne festen Grundton') : 'Noch keine eigene Datei. Bis zu ' + USER_MAX_S + ' Sekunden werden verwendet und auf diesem Gerät gespeichert.';
}

