
/* ---------- Bluetooth LE MIDI straight from the page (Web Bluetooth) ---------- */
// Chrome on Android lists only the MIDI devices Android itself opened – a keyboard paired in the Bluetooth settings
// never becomes one – and Windows needs a driver for Bluetooth MIDI. So Myzel speaks BLE-MIDI (MMA/AMEI RP-052) itself:
// the keyboard is picked in the browser's chooser, each packet is decoded here and its messages go to midiIn like Web
// MIDI's. Everything is feature-detected: iOS browsers that bring Web Bluetooth (Bluefy) lack some methods.
const BLE_SVC = '03b80e5a-ede8-4b33-a751-6ce34ec4c700', BLE_CHR = '7772e5db-3868-4112-a1a9-f2669d106bf3';
// keyboards that advertise their name but not the MIDI service (or only in the scan response) are found by name
const BLE_NAMES = ['microKEY', 'nanoKEY', 'nanoKONTROL', 'nanoPAD', 'KORG', 'Xkey', 'WIDI', 'MD-BT01', 'UD-BT01', 'Seaboard', 'Lightpad', 'LUMI',
  'Chorda', 'Orba', 'SMK', 'M-VAVE', 'LPK25', 'OP-Z', 'BLE-MIDI', 'BLE MIDI', 'BLE_MIDI', 'MIDI', 'Bluetooth MIDI'];
// KORG ignores clock over Bluetooth (its arpeggiators follow it over USB only): no clock output offered there
const BLE_NOCLOCK = /korg|nano\s*(key|kontrol|pad)|micro\s*key/i;
// devs: one record per keyboard picked in this session (it outlives its links); last: the keyboard of the last session;
// known: devices the browser still allows without a chooser (getDevices, where it exists); wait0/waitMax: reconnect
// backoff 1 s … 30 s
const BLE = { devs: new Map(), avail: null, known: [], asking: false, last: null, wait0: 1000, waitMax: 30000 };
const bleOk = () => !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function' && !inViewer && BLE.avail !== false;
function bleOn(t, type, fn) { if (t && typeof t.addEventListener === 'function') t.addEventListener(type, fn); else if (t) t['on' + type] = fn; }
function bleBoot() {
  try { BLE.last = JSON.parse(store.get('myzel.ble.v1') || 'null'); } catch (e) {}
  const bt = navigator.bluetooth;
  if (!bt || inViewer) return;
  // a computer without Bluetooth says so here: then no button at all
  try { if (typeof bt.getAvailability === 'function') bt.getAvailability().then((a) => { BLE.avail = !!a; updDevUI(); }, () => {}); } catch (e) {}
  try { bleOn(bt, 'availabilitychanged', (e) => { BLE.avail = e && e.value != null ? !!e.value : BLE.avail; updDevUI(); }); } catch (e) {}
  try { if (typeof bt.getDevices === 'function') bt.getDevices().then((l) => { BLE.known = Array.from(l || []); updDevUI(); }, () => {}); } catch (e) {}
}

// One notification → complete MIDI messages. A packet is a header byte (bit 7 set, bits 5–0 the high part of the
// sender's 13-bit millisecond clock), then timestamp bytes (bit 7 + the low 7 bits) and messages. High bytes alternate:
// right after a timestamp comes a status, otherwise it is a timestamp; a smaller low part than before wrapped (at most
// once per packet). Only SysEx spans packets – a continuation has no timestamp after the header. Lenient like Android's
// decoder: running status survives the packet end (the spec forbids it, cheap devices do it, and a lost note-off would
// hang). Never throws; SysEx is capped at 4 KB like BlueZ. D = { sx: open SysEx, run: running status }.
function bleDecode(D, dv, emit) {
  const n = dv.byteLength;
  if (n < 2) return;   // the empty answer to the first read, or junk
  const hdr = dv.getUint8(0);
  if (!(hdr & 0x80)) return;   // bit 6 is reserved and ignored
  let hi = hdr & 0x3f, low0 = -1, ts = -1, afterTs = false, msg = null, need = 0;
  // data right after the header continues a SysEx; with none open it is a lost fragment, never running status
  let skip = !(dv.getUint8(1) & 0x80) && !D.sx;
  for (let i = 1; i < n; i++) {
    const b = dv.getUint8(i);
    if (b & 0x80) {
      if (!afterTs) {
        const low = b & 0x7f;
        if (low0 >= 0 && low < low0) hi = (hi + 1) & 0x3f;
        low0 = low; ts = (hi << 7) | low; afterTs = true; skip = false; continue;
      }
      afterTs = false;
      if (b >= 0xf8) { emit(Uint8Array.of(b), ts); continue; }   // real-time: anywhere, even inside SysEx; cancels nothing
      if (b === 0xf7) { if (D.sx && !D.sx.big) { D.sx.push(0xf7); emit(Uint8Array.from(D.sx), ts); } D.sx = null; continue; }
      D.sx = null; msg = null;   // any other status ends an unfinished message or SysEx
      if (b === 0xf0) { D.sx = [0xf0]; D.run = 0; continue; }
      const len = MLEN(b);
      if (len === 1) { if (b === 0xf6) emit(Uint8Array.of(b), ts); continue; }   // F4/F5 are undefined
      msg = [b]; need = len - 1;
      if (b < 0xf0) D.run = b;   // System Common keeps the running status
    } else {
      afterTs = false;
      if (D.sx) { if (D.sx.length < 4096) D.sx.push(b); else D.sx.big = true; continue; }
      if (skip) continue;
      if (!msg) { if (!D.run) continue; msg = [D.run]; need = MLEN(D.run) - 1; }
      msg.push(b);
      if (--need === 0) { emit(Uint8Array.from(msg), ts); msg = null; }
    }
  }
}
// Messages → packets of at most 20 bytes (the smallest MTU minus 3; a page never learns the real one): one shared
// timestamp, no running status, a message never split – except SysEx, which goes in packets of its own.
function bleEncode(msgs, ms, max = 20) {
  const t = Math.floor(ms) & 0x1fff, H = 0x80 | (t >> 7), T = 0x80 | (t & 0x7f), out = [];
  let p = [H];
  const flush = () => { if (p.length > 1) out.push(Uint8Array.from(p)); p = [H]; };
  for (const m of msgs) {
    if (m[0] === 0xf0) {
      flush(); p.push(T, 0xf0);
      for (let i = 1; i < m.length - 1; i++) { if (p.length >= max) flush(); p.push(m[i]); }
      if (p.length + 2 > max) flush();
      p.push(T, 0xf7); flush();
    } else { if (p.length + 1 + m.length > max) flush(); p.push(T, ...m); }
  }
  flush();
  return out;
}
// The sender's timestamps → this page's clock (the method of Windows' BLE-MIDI transport): unwrap the 13-bit times and
// take as offset the smallest arrival delay over the last 5 s – the packet that waited least for its connection event
// (at least 16 samples, so a pause does not empty the window). A gap longer than one wrap starts afresh; a sender whose
// clock never moves (some cheap controllers) is timed by arrival until it moves again. Mapped times are ≤ arrival.
const bleClockNew = () => ({ ts: -1, arr: 0, sender: 0, win: [], frozen: 0 });
function bleClock(C, ts, arr) {
  if (ts < 0) return arr;
  const gap = arr - C.arr;
  let d = (ts - C.ts) & 0x1fff;
  if (C.ts < 0 || gap > 8192 || (d > 0 && C.frozen >= 3)) { C.ts = ts; C.arr = arr; C.sender = 0; C.win = [[arr, arr]]; C.frozen = 0; return arr; }
  if (d > gap + 1000) d = 0;   // stepped back a little: the same moment
  if (d === 0 && gap > 100) { if (++C.frozen >= 3) { C.ts = ts; C.arr = arr; return arr; } }
  else if (d > 0) C.frozen = 0;
  C.sender += d; C.ts = ts; C.arr = arr;
  C.win.push([arr, arr - C.sender]);
  while (C.win.length > 512 || (C.win.length > 16 && C.win[0][0] < arr - 5000)) C.win.shift();
  let off = Infinity;
  for (const s of C.win) if (s[1] < off) off = s[1];
  return C.sender + off;
}

// The chooser must open inside the tap (the browser demands a user gesture), so nothing is awaited before it
function bleFilters() {
  const f = [{ services: [BLE_SVC] }].concat(BLE_NAMES.map((n) => ({ namePrefix: n })));
  if (BLE.last && BLE.last.name) f.push({ name: BLE.last.name });   // found by the "all devices" list last time
  return f;
}
function bleAsk(all) {
  const bt = navigator.bluetooth;
  if (!bt || typeof bt.requestDevice !== 'function' || BLE.asking) return;
  const t0 = performance.now(), opt = all ? { acceptAllDevices: true, optionalServices: [BLE_SVC] } : { filters: bleFilters(), optionalServices: [BLE_SVC] };
  let p;
  try { p = bt.requestDevice(opt); } catch (e) { p = Promise.reject(e); }
  BLE.asking = true; updDevUI();
  Promise.resolve(p).catch((e) => {
    // a browser that does not know name filters (some iOS Web Bluetooth browsers): ask by the MIDI service alone
    if (!all && e && e.name === 'TypeError') return bt.requestDevice({ filters: [{ services: [BLE_SVC] }], optionalServices: [BLE_SVC] });
    throw e;
  }).then((dev) => { BLE.asking = false; if (dev) bleAdd(dev); else updDevUI(); }, (e) => {
    BLE.asking = false; updDevUI();
    const why = bleWhy(e, 'ask', performance.now() - t0);
    if (why) toast(why, why.length > 90 ? 12000 : 5000);
  });
}
// "Wieder verbinden" after a reload: a device the browser still allows connects at once, else the chooser opens again
function bleAgainTap() {
  const L = BLE.last, k = L && BLE.known.find((d) => d && ((L.id && d.id === L.id) || (L.name && d.name === L.name)));
  if (k) bleAdd(k); else bleAsk(false);
}
function bleAdd(dev) {
  let B = null;
  for (const b of BLE.devs.values()) if (b.dev === dev || (dev.id && b.id === dev.id)) B = b;
  if (!B) {
    const id = String(dev.id || dev.name || 'ble' + BLE.devs.size);
    B = { id, dev, name: String(dev.name || 'Bluetooth-MIDI-Gerät'), state: 'off', gen: 0, gq: Promise.resolve(), D: { sx: null, run: 0 }, C: bleClockNew(), src: null, ch: null,
      tries: 0, auto: false, short: 0, links: 0, linkT: 0, err: '', why: '', errAt: 0, raw: '', evq: [], evT: 0, evLast: 0, J: 15, lags: [], lagN: 0, gaps: [], rxT: 0, ci: 0,
      pk: 0, tx: [], txBusy: false, txDrop: 0, staleT: 0, dead: null };
    B.onVal = (e) => bleRx(B, e);
    bleOn(dev, 'gattserverdisconnected', () => bleGone(B));
    BLE.devs.set(id, B);
  } else B.dev = dev;
  bleConnect(B);
}
function bleConnect(B) { B.tries = 0; B.state = 'connecting'; bleLink(B); }
// one GATT operation at a time per device: Android fails a second one while the first is pending ("GATT operation
// failed for unknown reason") – and one that hangs must not block the next forever
function bleQ(B, fn, ms = 10000) {
  const run = () => new Promise((res, rej) => {
    const tm = setTimeout(() => rej(Object.assign(new Error('Zeitüberschreitung'), { name: 'TimeoutError' })), ms);
    Promise.resolve().then(fn).then((v) => { clearTimeout(tm); res(v); }, (e) => { clearTimeout(tm); rej(e); });
  });
  const p = B.gq.then(run);
  B.gq = p.catch(() => {});
  return p;
}
// connect → MIDI service → characteristic → listener → read (once more if it fails) → notifications; again after every
// drop, because a new link starts with notifications off
async function bleLink(B) {
  const gen = ++B.gen, dev = B.dev, gone = () => gen !== B.gen;
  clearTimeout(B.retryT);
  B.state = 'connecting'; updDevUI();
  try {
    if (!dev.gatt || typeof dev.gatt.connect !== 'function') throw Object.assign(new Error('gatt'), { name: 'NotSupportedError' });
    const srv = await bleQ(B, () => dev.gatt.connect(), 25000);
    if (gone()) return;
    const svc = await bleQ(B, () => (srv && srv.getPrimaryService ? srv : dev.gatt).getPrimaryService(BLE_SVC));
    const ch = await bleQ(B, () => svc.getCharacteristic(BLE_CHR));
    if (gone()) return;
    if (B.ch && B.ch !== ch) { try { if (B.ch.removeEventListener) B.ch.removeEventListener('characteristicvaluechanged', B.onVal); else B.ch.oncharacteristicvaluechanged = null; } catch (e) {} }
    B.ch = ch; bleOn(ch, 'characteristicvaluechanged', B.onVal);
    B.D = { sx: null, run: 0 }; B.C = bleClockNew();
    if (!B.src) { B.src = midiSource('ble:' + B.id, B.name, 'ble'); B.src.ble = B; }
    // The spec's first read, answered with an empty packet. A keyboard that wants an encrypted link makes Android and
    // macOS pair right here – before subscribing, since a subscription does not survive pairing. Its result is unused.
    if (typeof ch.readValue === 'function') {
      for (let k = 0; k < 2; k++) {
        try { await bleQ(B, () => ch.readValue()); break; }
        catch (e) { B.raw = String(e && e.message || e); if (gone()) return; if (!k) await new Promise((r) => setTimeout(r, 300)); }
      }
    }
    if (gone()) return;
    if (typeof ch.startNotifications !== 'function') throw Object.assign(new Error('notify'), { name: 'NotSupportedError' });
    await bleQ(B, () => ch.startNotifications());
    if (gone()) return;
    const again = B.links > 0;
    B.state = 'on'; B.linkT = performance.now(); B.tries = 0; B.links++; B.auto = true;
    bleOutAdd(B);
    try { BLE.last = { name: B.name, id: B.id }; store.set('myzel.ble.v1', JSON.stringify(BLE.last)); } catch (e) {}
    midiSync(again ? [] : [B.src], []);
    if (B.src && B.src.dup) toast('Bluetooth: ' + B.name + ' ist verbunden, spielt aber über den MIDI-Port „' + B.src.twinName + '“ – dasselbe Keyboard, nur einmal.', 6000);
    else if (again && B.short < 2) toast('Bluetooth: ' + B.name + ' ist wieder verbunden.', 3000);
  } catch (e) {
    if (gone()) return;
    bleDown(B);
    try { dev.gatt.disconnect(); } catch (er) {}   // a half-open link blocks the next attempt
    bleErr(B, e, 'link');
    if (B.auto) bleRetry(B);
    else { B.state = 'err'; updDevUI(); toast(B.why, 12000); }
  }
}
// the link dropped (switched off, out of range, auto power-off, another host took it): its notes end, and Myzel tries
// again – 1 s, 2 s, 4 s … up to every 30 s while the page is open. Links that end within seconds, twice in a row, are
// the sign of a keyboard that wants to be paired first.
function bleGone(B) {
  if (B.state !== 'on') return;   // an attempt that failed handles itself; "Trennen" set 'off' first
  B.short = performance.now() - B.linkT < 10000 ? B.short + 1 : 0;
  bleDown(B);
  if (B.short >= 2) { bleErr(B, { name: 'Short' }, 'link'); if (B.short === 2) toast(B.why, 12000); }
  else toast('Bluetooth: ' + B.name + ' getrennt – Myzel verbindet neu, sobald es wieder da ist.', 4500);
  bleRetry(B);
}
function bleRetry(B) {
  if (B.state === 'off') return;
  const d = Math.min(BLE.waitMax, BLE.wait0 * Math.pow(2, Math.min(B.tries++, 10)));
  B.state = 'wait'; B.nextT = performance.now() + d;
  clearTimeout(B.retryT);
  B.retryT = setTimeout(() => { if (B.state === 'wait') bleLink(B); }, d);
  updDevUI();
}
// a link ends: queued events, decoder and clock start afresh; only this keyboard's notes are released
function bleDown(B) {
  clearTimeout(B.evT); B.evT = 0; B.evq = []; B.evLast = 0; B.staleT = 0;
  B.D = { sx: null, run: 0 }; B.C = bleClockNew(); B.tx = []; B.rxT = 0;
  const s = B.src;
  if (!s) return;
  B.src = null;
  MIDI.outs.delete(s.key);
  midiDrop(s); midiSync();
}
// "Trennen": no reconnecting until the user asks again
function bleOff(B) {
  B.state = 'off'; B.gen++; clearTimeout(B.retryT);
  bleDown(B);
  try { B.dev.gatt.disconnect(); } catch (e) {}
  updDevUI();
}
// "Vergessen": the browser drops its permission too (where it can)
function bleForget(B) {
  bleOff(B);
  try { if (typeof B.dev.forget === 'function') B.dev.forget().catch(() => {}); } catch (e) {}
  BLE.devs.delete(B.id);
  updDevUI();
}

// receive: decode, map the sender's time, play – at once ("Direkt") or evenly spaced ("Gleichmäßig")
function bleRx(B, e) {
  try {
    let dv = e && e.target && e.target.value;
    if (dv && typeof dv.getUint8 !== 'function') dv = dv instanceof ArrayBuffer ? new DataView(dv) : dv.buffer ? new DataView(dv.buffer, dv.byteOffset || 0, dv.byteLength) : null;
    if (!dv || !B.src) return;
    const arr = performance.now();
    bleGap(B, arr); B.pk++;
    bleDecode(B.D, dv, (bytes, ts) => bleEmit(B, bytes, ts, arr));
  } catch (err) { B.raw = String(err && err.message || err); }   // one bad packet must not break the next
}
function bleEmit(B, bytes, ts, arr) {
  const src = B.src;
  if (!src) return;
  const t = bleClock(B.C, ts, arr);
  bleLag(B, arr - t);
  if (src.dup) bleTwin(B, arr);
  else if (B.dead && (MIDI.srcs.get(B.dead.key) || {}).lastIn > B.dead.at) { B.dead = null; midiSync(); return; }   // the twin plays again
  // Direkt: now, stamped with the sender's time (the clock follower gets even pulses); Gleichmäßig: at that time + J,
  // in order, so the spacing the player made survives the connection events
  if (P['midi.ble'] !== 'even' || src.dup) { midiIn(src, bytes, t); return; }
  const due = Math.max(t + B.J, B.evLast);
  B.evLast = due;
  if (!B.evq.length && due <= performance.now() + 0.5) { midiIn(src, bytes, due); return; }
  B.evq.push([bytes, due]);
  bleArm(B);
}
function bleArm(B) {
  if (B.evT || !B.evq.length) return;
  B.evT = setTimeout(() => bleFire(B), Math.max(0, B.evq[0][1] - performance.now()));
}
function bleFire(B, all) {
  B.evT = 0;
  const now = performance.now() + 0.5;
  while (B.evq.length && (all || B.evq[0][1] <= now)) { const [d, t] = B.evq.shift(); if (B.src) midiIn(B.src, d, Math.min(t, now)); }
  bleArm(B);
}
// switching to "Direkt": what still waits plays now, in order
function bleFlushAll() { for (const B of BLE.devs.values()) { clearTimeout(B.evT); bleFire(B, true); B.evLast = 0; } }
// J: the delay that covers 90 % of recent arrival delays behind the sender's time (5–30 ms)
function bleLag(B, lag) {
  const L = B.lags;
  L.push(lag); if (L.length > 64) L.shift();
  if (L.length < 8 || ++B.lagN % 8 === 0) { const s = L.slice().sort((a, b) => a - b); B.J = clamp(s[Math.floor(s.length * 0.9)], 5, 30); }
}
// connection interval: notifications arrive on the link's connection events, so while playing the gaps between them
// show its grid – the lower quartile of recent gaps of 4–125 ms estimates it
function bleGap(B, arr) {
  const g = arr - B.rxT;
  B.rxT = arr;
  if (!(g >= 4 && g <= 125)) return;
  const G = B.gaps;
  G.push(g); if (G.length > 48) G.shift();
  if (G.length >= 6) { const s = G.slice().sort((a, b) => a - b); B.ci = s[Math.floor(s.length / 4)]; }
}

// The same keyboard may also reach Myzel through Web MIDI – a helper app on Android, a driver on Windows, or its USB
// cable at the same time. Only one plays: the Web MIDI port (Android serves it with a faster link). The panel names it.
function bleDedupe() {
  for (const s of MIDI.srcs.values()) {
    if (s.kind !== 'ble') continue;
    const dead = s.ble && s.ble.dead;
    let tw = null;
    for (const w of MIDI.srcs.values()) {
      if (w.kind === 'webmidi' && w.enabled && sameDev(w.name, s.name) && !(dead && dead.key === w.key && w.lastIn <= dead.at)) { tw = w; break; }
    }
    s.twin = tw ? tw.key : null; s.twinName = tw ? tw.name : '';
    if (!!tw !== s.dup) { s.dup = !!tw; if (s.dup) midiSrcOff(s); }
  }
}
// Windows can keep the port of a Bluetooth keyboard that is long gone: a twin that stays silent while this keyboard is
// played for 0.4 s is dead, and the Bluetooth link plays
function bleTwin(B, now) {
  const w = MIDI.srcs.get(B.src.twin);
  if (!w || now - w.lastIn < 1500 || (B.staleT && w.lastIn >= B.staleT)) { B.staleT = 0; return; }
  if (!B.staleT) { B.staleT = now; return; }
  if (now - B.staleT < 400) return;
  B.dead = { key: w.key, at: now }; B.staleT = 0;
  midiSync();
  toast('Bluetooth: ' + B.name + ' spielt jetzt direkt – der MIDI-Port „' + w.name + '“ blieb stumm.', 5000);
}

// Send over Bluetooth (a feature that outputs MIDI to a non-KORG device): Web MIDI's send(data, timestamp) on a port
// object, so the clock output treats it like any other. Packets of ≤ 20 bytes through the device's GATT queue, write
// without response; at most 32 waiting, the oldest dropped – late MIDI is worse than lost MIDI.
function bleOutAdd(B) {
  const s = B.src;
  if (!s) return;
  const o = { key: s.key, dir: 'out', kind: 'ble', name: B.name, ble: B, noClock: BLE_NOCLOCK.test(B.name), port: { send: (d, ts) => bleSend(B, d, ts) } };
  o.clock = !o.noClock && !!portPref(o).clock;
  MIDI.outs.set(o.key, o);
}
function bleSend(B, data, ts) {
  const msgs = [], d = Array.from(data || []);
  for (let i = 0; i < d.length;) {
    const s = d[i];
    if (!(s & 0x80)) { i++; continue; }
    const n = s === 0xf0 ? d.indexOf(0xf7, i) + 1 - i : MLEN(s);
    if (n <= 0 || i + n > d.length) break;
    msgs.push(d.slice(i, i + n)); i += n;
  }
  if (!msgs.length) return;
  const now = performance.now();
  if (ts > now + 2) { setTimeout(() => bleSend(B, [].concat(...msgs)), ts - now); return; }   // the spec allows no future timestamps
  for (const p of bleEncode(msgs, now)) { B.tx.push(p); if (B.tx.length > 32) { B.tx.shift(); B.txDrop++; } }
  blePump(B);
}
async function blePump(B) {
  if (B.txBusy) return;
  B.txBusy = true;
  while (B.tx.length && B.ch && B.state === 'on') {
    const p = B.tx.shift(), ch = B.ch;
    try { await bleQ(B, () => (typeof ch.writeValueWithoutResponse === 'function' ? ch.writeValueWithoutResponse(p) : ch.writeValue(p)), 3000); }
    catch (e) { B.raw = String(e && e.message || e); }
  }
  B.txBusy = false;
}

// Which platform's words to use – detection only picks the wording, every feature is tested on its own. Evaluated at
// use, because iOS wrapper browsers may add their MIDI or Bluetooth objects after the page started.
function midiPlat() {
  const ua = navigator.userAgent || '';
  if (inViewer) return 'viewer';
  if (IOS) return navigator.requestMIDIAccess || navigator.bluetooth ? 'ioswrap' : 'ios';
  if (/Firefox\//.test(ua)) return ANDROID ? 'ffandroid' : 'firefox';
  if (ANDROID) return /; wv\)|FBA[NV]|Instagram|Line\//.test(ua) ? 'webview' : 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/CrOS/.test(ua)) return 'cros';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  return /Linux/.test(ua) ? 'linux' : 'other';
}
const APP_URL = 'beidlat.github.io/4claude';
// what to do on this platform: one line for the panel, the steps behind "Hilfe"
function midiHelp() {
  const one = ['Nur ein Gerät zur Zeit', 'Ein Bluetooth-Keyboard ist immer nur mit einem Gerät verbunden. Hängt es noch am iPad, Handy oder PC, dort zuerst trennen.'];
  switch (midiPlat()) {
    case 'viewer': return { lead: 'In der claude.ai-Ansicht sind MIDI und Bluetooth gesperrt. Öffne Myzel als App: ' + APP_URL, steps: [] };
    case 'ios': return { lead: 'Safari und alle iOS-Browser können kein MIDI. Möglich (nicht getestet): App „Web MIDI Browser“ (MIDI und Bluetooth-MIDI über iPadOS) oder „Bluefy“ (Bluetooth-Keyboards direkt) – darin ' + APP_URL + ' öffnen. USB-Keyboards am iPad brauchen ebenfalls eine solche App.', steps: [one] };
    case 'ioswrap': return { lead: 'Dieser iOS-Browser bringt ' + (navigator.requestMIDIAccess ? 'MIDI' : 'Bluetooth') + ' mit – mit Myzel nicht getestet. ' + (navigator.requestMIDIAccess ? 'Bluetooth-Keyboards zuerst in der App über deren Bluetooth-MIDI-Dialog verbinden, dann „MIDI-Keyboard verbinden“.' : 'Tippe auf „Bluetooth-Keyboard koppeln“.'), steps: [one] };
    case 'webview': return { lead: 'Diese App zeigt Webseiten in einem eingebauten Browser ohne MIDI und Bluetooth. Öffne ' + APP_URL + ' in Chrome („Im Browser öffnen“).', steps: [] };
    case 'ffandroid': return { lead: 'Firefox auf Android kann kein MIDI und kein Bluetooth. Öffne ' + APP_URL + ' in Chrome oder Samsung Internet.', steps: [] };
    case 'firefox': return { lead: 'Firefox fragt beim ersten Verbinden, ob es ein Zusatzmodul für den MIDI-Zugriff installieren soll – zustimmen. Bluetooth-Keyboards direkt verbinden geht nur in Chrome oder Edge.',
      steps: [['Bluetooth in Firefox', 'Über das System verbinden (Mac: Audio-MIDI-Setup, Windows: KORG-BLE-MIDI-Treiber), dann erscheint es wie ein USB-Keyboard.']] };
    case 'android': return { lead: 'Bluetooth-Keyboard: auf „Bluetooth-Keyboard koppeln“ tippen und es in der Liste wählen. Nur in den Android-Einstellungen gekoppelt reicht nicht – Chrome sieht es dort nicht als MIDI-Gerät.',
      steps: [
        ['Bluetooth direkt', 'Keyboard einschalten (microKEY Air: Schalter auf WIRELESS), „Bluetooth-Keyboard koppeln“, Keyboard wählen. Android fragt beim ersten Mal nach „Geräte in der Nähe“ (ältere Versionen: „Standort“, dann auch den Standort einschalten) und eventuell nach dem Koppeln – beides erlauben.'],
        ['Oder mit der App „MIDI BLE Connect“', 'In der App (heißt dort „MIDI+BTLE“) „Start Bluetooth Scan“ tippen, das Keyboard wählen und die App mit der Home-Taste verlassen, nicht mit „Zurück“. Dann hier „Neu suchen“. Android gibt dieser Verbindung Vorrang; nicht zusätzlich „Bluetooth-Keyboard koppeln“.'],
        ['Oder per USB', 'Mit einem USB-OTG-Adapter anschließen, den Schalter am KORG-Keyboard auf USB stellen, „Neu suchen“.'],
        one] };
    case 'windows': return { lead: 'Am einfachsten per USB: einstecken und losspielen (erscheint es nicht: „Neu suchen“ oder die Seite neu laden).',
      steps: [
        ['USB', 'Keyboard einstecken (KORG: Schalter auf USB). Es geht ohne Treiber.'],
        ['Bluetooth über Windows', 'KORG-BLE-MIDI-Treiber installieren und das Keyboard in den Windows-Einstellungen koppeln. Ist „Windows MIDI Services“ mit Bluetooth installiert, stattdessen damit verbinden und den KORG-BLE-Treiber entfernen – beide zusammen stören sich. Danach die Seite neu laden.'],
        ['Bluetooth direkt in Myzel', '„Bluetooth-Keyboard koppeln“. Will das Keyboard gekoppelt werden, scheitert Chrome unter Windows daran: zuerst in den Windows-Einstellungen koppeln oder chrome://flags/#enable-web-bluetooth-confirm-pairing-support einschalten. Nicht zusammen mit dem KORG-Treiber.'],
        ['microKEY Air', 'Im KORG KONTROL Editor muss „Connection Type“ auf 1 stehen, sonst verbindet es sich nicht mit Windows.'],
        one] };
    case 'mac': return { lead: 'USB: einstecken. Bluetooth: im Audio-MIDI-Setup verbinden oder hier „Bluetooth-Keyboard koppeln“.',
      steps: [
        ['Bluetooth über macOS', 'Audio-MIDI-Setup → Fenster → MIDI-Studio einblenden → Bluetooth-Symbol → beim Keyboard „Verbinden“. Dann „Neu suchen“.'],
        ['Bluetooth direkt', '„Bluetooth-Keyboard koppeln“ – nur, solange es nicht schon im Audio-MIDI-Setup verbunden ist (dann fehlt es in der Liste).'],
        one] };
    case 'cros': return { lead: 'USB: einstecken. Bluetooth: „Bluetooth-Keyboard koppeln“.', steps: [one] };
    case 'linux': return { lead: 'USB: einstecken. Bluetooth direkt geht in Chrome unter Linux nur mit chrome://flags/#enable-experimental-web-platform-features; sonst über BlueZ (MIDI-Port „… Bluetooth“).', steps: [one] };
  }
  return { lead: 'Am besten in Chrome oder Edge: USB-Keyboards einstecken, Bluetooth-Keyboards mit „Bluetooth-Keyboard koppeln“.', steps: [one] };
}
// how to get a keyboard that wants an encrypted link paired, per platform
function blePairFix() {
  switch (midiPlat()) {
    case 'windows': return 'Koppel es zuerst in den Windows-Einstellungen (Bluetooth und Geräte → Gerät hinzufügen) oder schalte in Chrome chrome://flags/#enable-web-bluetooth-confirm-pairing-support ein und lade neu. Ein KORG-BLE-MIDI-Treiber oder Windows-MIDI-Bluetooth darf es nicht gleichzeitig belegen.';
    case 'linux': case 'cros': return 'Koppel es zuerst in den Bluetooth-Einstellungen des Systems oder schalte chrome://flags/#enable-web-bluetooth-confirm-pairing-support ein.';
    case 'android': return 'Bestätige die Kopplungsanfrage von Android. Kommt keine: das Keyboard in den Android-Bluetooth-Einstellungen entfernen („Entkoppeln“) und noch einmal verbinden.';
    case 'mac': return 'Bestätige die Kopplung. Ist es im Audio-MIDI-Setup verbunden, dort trennen.';
  }
  return 'Koppel es in den Bluetooth-Einstellungen des Geräts.';
}
// An error from the chooser ('ask', dt: ms until it failed) or from connecting ('link') → what to do, in words. ''
// for a chooser the user simply closed.
function bleWhy(e, phase, dt) {
  const n = (e && e.name) || '', m = String((e && e.message) || ''), plat = midiPlat();
  if (phase === 'ask') {
    const perm = ANDROID ? 'Chrome darf nicht nach Bluetooth-Geräten suchen. Erlaube es in den Android-Einstellungen → Apps → Chrome (bzw. dein Browser) → Berechtigungen: „Geräte in der Nähe“ (Android 12 und neuer) oder „Standort“ (ältere Versionen, dazu den Standort einschalten). Dann noch einmal tippen.'
      : 'Bluetooth ist für diese Seite blockiert. Erlaube es in den Website-Einstellungen (Symbol links neben der Adresse) und tippe noch einmal.';
    if (/cancel/i.test(m)) return ANDROID && dt < 600 ? perm : '';   // closed at once, without a person: a missing permission
    if (/globally disabled|enterprise|policy has disabled/i.test(m)) return 'Bluetooth ist im Browser abgeschaltet (Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Bluetooth).';
    if (/denied|permission|blocked/i.test(m) || n === 'NotAllowedError') return perm;
    if (/adapter|not available|low energy|unavailable|powered/i.test(m)) return 'Bluetooth ist ausgeschaltet oder fehlt. Schalte es ein und tippe noch einmal.';
    if (n === 'SecurityError') return /gesture|activation/i.test(m) ? 'Tippe noch einmal direkt auf „Bluetooth-Keyboard koppeln“.' : 'In dieser Ansicht ist Bluetooth gesperrt. Öffne Myzel als App: ' + APP_URL;
    if (n === 'NotFoundError' && !m) return '';
    return 'Die Bluetooth-Suche ging nicht' + (m ? ' (' + m + ')' : '') + '.';
  }
  switch (bleKind(e)) {
    case 'short': return 'Das Keyboard trennt die Verbindung nach wenigen Sekunden – es will gekoppelt werden. ' + blePairFix();
    case 'pair': return 'Die Kopplung mit dem Keyboard ist gescheitert. ' + blePairFix();
    case 'nomidi': return 'Dieses Gerät bietet kein Bluetooth-MIDI an. Wähle das Keyboard selbst, nicht z. B. Kopfhörer.';
    case 'api': return 'Dieser Browser kann die Bluetooth-MIDI-Verbindung nicht aufbauen (es fehlt eine Funktion). In Chrome oder Edge geht es.';
    case 'timeout': return 'Keine Antwort vom Keyboard. Ist es eingeschaltet und nicht mit einem anderen Gerät verbunden (iPad, Handy, PC)?';
  }
  return 'Verbindung gescheitert' + (m ? ' (' + m + ')' : '') + '. Keyboard einschalten' + (plat === 'android' ? ' (microKEY Air: Schalter auf WIRELESS)' : '') +
    ', näher heranholen und darauf achten, dass kein anderes Gerät es belegt (iPad, Handy, PC' + (plat === 'windows' ? ', KORG-Treiber' : '') + ').';
}
// a connection error → its kind; a short label of each for the device line
function bleKind(e) {
  const n = (e && e.name) || '', m = String((e && e.message) || '');
  if (n === 'Short') return 'short';
  if (/auth|not paired|not authorized|insufficient|encrypt|pair/i.test(m) || (n === 'SecurityError' && /GATT/i.test(m))) return 'pair';
  if (n === 'NotFoundError' || /no services|no characteristics/i.test(m)) return 'nomidi';
  if (n === 'NotSupportedError') return 'api';
  return n === 'TimeoutError' || /timeout|timed out/i.test(m) ? 'timeout' : 'fail';
}
const BLE_ERR = { short: 'trennt nach Sekunden – will gekoppelt werden', pair: 'Kopplung gescheitert', nomidi: 'kein Bluetooth-MIDI', api: 'Browser kann es nicht', timeout: 'keine Antwort', fail: 'Verbindung gescheitert' };
function bleErr(B, e, phase) {
  B.why = bleWhy(e, phase); B.errAt = Date.now();
  B.raw = ((e && e.name) || '') + (e && e.message ? ': ' + e.message : '');
  B.err = BLE_ERR[bleKind(e)];
}
