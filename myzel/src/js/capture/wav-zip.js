/* ---------- WAV + ZIP writers (streamed into Blobs, low memory, non-blocking) ---------- */
const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crcUpdate(c, u) { for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return c; }
const FMT_INFO = { f32: { bps: 4, label: '32-Bit-Float', tag: '32bit-float' }, s24: { bps: 3, label: '24-Bit-PCM', tag: '24bit' }, s16: { bps: 2, label: '16-Bit-PCM', tag: '16bit' } };
const yieldUI = () => new Promise((r) => setTimeout(r, 0));
// Encodes frames [from, to) of a take. Returns { blob, crc, size }.
async function encodeWav(tk, fmt, normalize, from, to, onProgress) {
  const ch = 2, bps = FMT_INFO[fmt].bps, isF = fmt === 'f32';
  const block = ch * bps, frames = to - from, dataBytes = frames * block;
  const enc = new TextEncoder();
  const infoItems = [['INAM', tk.name], ['ISFT', 'Myzel (Web Audio)'], ['ICRD', isoDate(tk.date)]].map(([id, str]) => {
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
  const gain = normalize && tk.peak > 0 ? dbToGain(-1) / tk.peak : 1;
  const fadeIn = Math.min(Math.floor(tk.sr * 0.004), frames >> 2), fadeOut = Math.min(Math.floor(tk.sr * 0.01), frames >> 2);
  const blobs = [new Blob([hb])];
  let pending = [], pendingBytes = 0, pos = 0, k = 0;   // pos = absolute frame index of the current chunk start
  for (let c = 0; c < tk.L.length && pos < to; c++) {
    const L = tk.L[c], R = tk.R[c], n = L.length;
    const a = Math.max(0, from - pos), b = Math.min(n, to - pos);
    if (b > a) {
      const m = b - a;
      const env = (i) => { const fi = pos + i - from; let e = gain; if (fi < fadeIn) e *= fi / fadeIn; const fo = to - (pos + i) - 1; if (fo < fadeOut) e *= fo / fadeOut; return e; };
      const edge = pos + a - from < fadeIn || to - (pos + b) < fadeOut;
      let bytes;
      if (isF) {
        const out = new Float32Array(m * 2);
        for (let i = a, j = 0; i < b; i++, j += 2) { const e = edge ? env(i) : gain; out[j] = L[i] * e; out[j + 1] = R[i] * e; }
        bytes = new Uint8Array(out.buffer);
        if (!LITTLE) { const d = new DataView(out.buffer); for (let q = 0; q < out.length; q++) d.setFloat32(q * 4, out[q], true); }
      } else if (fmt === 's24') {
        bytes = new Uint8Array(m * 6);
        let q = 0;
        for (let i = a; i < b; i++) {
          const e = edge ? env(i) : gain;
          for (let sdx = 0; sdx < 2; sdx++) {
            const x = clamp((sdx ? R[i] : L[i]) * e, -1, 1);
            const v = clamp(Math.round(x * 8388607 + (Math.random() - Math.random())), -8388608, 8388607);
            bytes[q++] = v & 255; bytes[q++] = (v >> 8) & 255; bytes[q++] = (v >> 16) & 255;
          }
        }
      } else {
        const ab = new ArrayBuffer(m * 4), d = new DataView(ab);
        for (let i = a, q = 0; i < b; i++, q += 4) {
          const e = edge ? env(i) : gain;
          d.setInt16(q, clamp(Math.round(clamp(L[i] * e, -1, 1) * 32767 + (Math.random() - Math.random())), -32768, 32767), true);
          d.setInt16(q + 2, clamp(Math.round(clamp(R[i] * e, -1, 1) * 32767 + (Math.random() - Math.random())), -32768, 32767), true);
        }
        bytes = new Uint8Array(ab);
      }
      crc = crcUpdate(crc, bytes);
      pending.push(bytes); pendingBytes += bytes.length;
    }
    pos += n;
    if (pendingBytes > 4 * 1048576) { blobs.push(new Blob(pending)); pending = []; pendingBytes = 0; }
    if (++k % 48 === 0) { if (onProgress) onProgress((pos - from) / frames); await yieldUI(); }
  }
  if (pending.length) blobs.push(new Blob(pending));
  const blob = new Blob(blobs, { type: 'audio/wav' });
  return { blob, crc: (crc ^ 0xFFFFFFFF) >>> 0, size: headSize + dataBytes };
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
function isoDate(d) { const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function stamp(d) { const p = (n) => String(n).padStart(2, '0'); return isoDate(d) + '_' + p(d.getHours()) + p(d.getMinutes()); }
function slug(s) {
  return (s || 'aufnahme').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'aufnahme';
}

