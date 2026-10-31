/* ---------- Funkstrecke: das Handy als Sensor für Myzel am Computer ---------- */
// "Gestik als MIDI senden": the phone computes its gestures itself (zero, Bebung, Ladung, Lagen) and sends only what
// comes out of that, on a MIDI output of its choice – a phone in USB-MIDI mode to a computer, or any synth or DAW.
// The numbers are fixed (any music program can use them): MIDI channel 16, NRPN 42/n with 14 bits –
//   42/0 Neigen ↔ in degrees, right edge down + (±180° on 0 … 16383, 8192 = 0°: before Ruhezone and Weite, so the
//        receiver applies its own zero and Weite), 42/1 Neigen ↕ in degrees, top edge away +,
//   42/2 Bebung and 42/3 Drehen (−1 … 1, 8192 = 0), 42/4 Ladung (0 … 1),
//   42/5 Schwenken's store (0 … 1), 42/6 how fast it circles (0 … 4 Hz), 42/7 which way (−1 … 1),
//   42/8 the sensor's delay in ms (Klopf-Messung, once a second while measured),
//   42/127 the signature, ten times a second while the sensor answers: data MSB 71 ("G"), LSB bit 0 gyroscope, bit 1
//          acceleration;
// events as notes on channel 16: 48 Wenden, 49 Ruhe, 50 Schütteln (on while it lasts; velocity = strength),
// 51 each swing of a shake (velocity = strength, off at once), 52 a new zero. An axis goes out only when it changed,
// at most 100 times a second; its newest value always arrives.
// Receiving: any input (Web MIDI or Bluetooth) whose channel 16 carries the signature gets the profile "Gestik
// (Handy)": its NRPNs and notes never reach the standard map, the pedals or the keys – they become Gestik on this
// computer (switched on for as long as they come, with no sensor of its own): Anlehnen, Ladung, Schlafen, Fährte …
// with this computer's notes as the clutch, its own zero (subtracted in degrees) and its own Weite.
// Untested on real phones: whether a phone in USB-MIDI mode gets an output depends on the phone (the card says so).
const GKF = { ch: 15, msb: 42, hb: 127, sig: 71, note: 48, lat: 8, n: 8 };
const GKF_RNG = [[-180, 180], [-180, 180], [-1, 1], [-1, 1], [0, 1], [0, 1], [0, 4], [-1, 1]];
const gkfPack = (i, v) => { const r = GKF_RNG[i]; return clamp(Math.round(r[0] < 0 ? 8192 + (clamp(v, r[0], r[1]) / r[1]) * 8191 : ((clamp(v, r[0], r[1]) - r[0]) / (r[1] - r[0])) * 16383), 0, 16383); };
const gkfUnpack = (i, q) => { const r = GKF_RNG[i]; return r[0] < 0 ? (clamp(q - 8192, -8191, 8191) / 8191) * r[1] : r[0] + (q / 16383) * (r[1] - r[0]); };
const GKF_UNTESTED = 'Ungetestet: ob dein Handy im USB-MIDI-Modus einen Ausgang bekommt, hängt vom Gerät ab. Wenn hier kein Ausgang erscheint, geht es (noch) nicht.';
// the sender: what went out last per axis (q, t), axes waiting for their 10 ms (pend), the signature's last time (hb),
// beats sent (nb), events held on (on), messages counted for the rate
const GKS = { q: new Int32Array(GKF.n).fill(-1), t: new Float64Array(GKF.n), pend: 0, hb: 0, nb: 0, on: [false, false, false], zero: false, n: 0, nT: 0, rate: 0, o: null, oc: null };
// the chosen output (by its name: port ids differ between sessions) – looked up again only when it went
function gkfOut() {
  const nm = GK.p.fs, c = GKS.oc;
  if (!nm) return null;
  if (c && c.port && c.nm === nm && MIDI.outs.get(c.key) === c) return c;
  for (const o of MIDI.outs.values()) if (o.port && (o.name === nm || sameDev(o.name, nm))) { GKS.oc = o; o.nm = nm; return o; }
  return null;
}
const gkfSending = () => !!(GK.p.fs && GK.on && GK.live && !GK.rem && GK.R && !GK.R.rem);
// NRPNs gathered in one buffer and sent at once (one call to the port per update, nothing allocated)
const GKF_BUF = new Uint8Array(12 * (GKF.n + 2));
function gkfPut(k, n, q) {
  const c = 0xb0 | GKF.ch, B = GKF_BUF, o = 12 * k;
  B[o] = c; B[o + 1] = 99; B[o + 2] = GKF.msb; B[o + 3] = c; B[o + 4] = 98; B[o + 5] = n; B[o + 6] = c; B[o + 7] = 6; B[o + 8] = q >> 7; B[o + 9] = c; B[o + 10] = 38; B[o + 11] = q & 127;
  return k + 1;
}
function gkfFlush(o, k) { if (k) { midiSend(o, GKF_BUF.subarray(0, 12 * k)); GKS.n += k; } }
function gkfNote(o, i, on, v) { midiSend(o, on ? [0x90 | GKF.ch, GKF.note + i, clamp(Math.round(1 + 126 * clamp(v == null ? 1 : v, 0, 1)), 1, 127)] : [0x80 | GKF.ch, GKF.note + i, 0]); }
function gkfVal(i) {
  const st = GK.R.st, r = GK.raw;
  return i === 0 ? st.roll : i === 1 ? -st.pitch : i === 2 ? r.bebung : i === 3 ? r.drehen : i === 4 ? r.ladung : i === 5 ? st.sw || 0 : i === 6 ? st.swHz || 0 : st.swDir || 0;
}
// after every Gestik update: the signature first, then what changed, the events
function gkfSub(out, raw, evs, now) {
  if (raw === GK_ZERO || !gkfSending()) return;   // (GK_ZERO: Gestik is being switched off – gkfStop says so)
  const o = gkfOut();
  if (o !== GKS.o) { gkfStop(); GKS.o = o; }
  if (!o) return;
  if (!GKS.hb) gkfBeat(o, now);
  gkfAxes(o, now);
  for (const e of evs) {
    const i = GK_EV.indexOf(e.type);
    if (i >= 0) { if (GKS.on[i] !== e.on) { GKS.on[i] = e.on; gkfNote(o, i, e.on, e.v); } }
    else if (e.type === 'peak') { gkfNote(o, 3, true, e.v); gkfNote(o, 3, false); }
    else if (e.type === 'zero') GKS.zero = true;
  }
  if (GKS.zero) { GKS.zero = false; gkfNote(o, 4, true, 1); gkfNote(o, 4, false); }
}
function gkfAxes(o, now) {
  let k = 0;
  for (let i = 0; i < GKF.n; i++) {
    const q = gkfPack(i, gkfVal(i)), bit = 1 << i;
    if (q === GKS.q[i]) { GKS.pend &= ~bit; continue; }
    if (now - GKS.t[i] >= 10) { k = gkfPut(k, i, q); GKS.q[i] = q; GKS.t[i] = now; GKS.pend &= ~bit; } else GKS.pend |= bit;
  }
  gkfFlush(o, k);
}
// the signature ten times a second (the receiver's sign of life), the sensor's delay once a second, waiting axes
function gkfBeat(o, now) {
  const st = GK.R.st;
  let k = gkfPut(0, GKF.hb, (GKF.sig << 7) | (st.gyro ? 1 : 0) | (GK.dmSeen ? 2 : 0));
  GKS.hb = now;
  if (GK.p.latS != null && GKS.nb++ % 10 === 0) k = gkfPut(k, GKF.lat, clamp(Math.round(GK.p.latS), 0, 16383));
  gkfFlush(o, k);
}
function gkfTick(now) {
  if (!gkfSending() || now - GK.last > 250) return;
  const o = gkfOut();
  if (!o) return;
  if (now - GKS.hb >= 90) gkfBeat(o, now);
  if (GKS.pend) gkfAxes(o, now);
  if (now - GKS.nT >= 1000) { GKS.rate = Math.round((GKS.n * 1000) / Math.max(1, now - GKS.nT)); GKS.n = 0; GKS.nT = now; }
}
// stopping (another output, switched off, Gestik off): what is held on goes off, everything is sent afresh next time
function gkfStop() {
  const o = GKS.o;
  if (o) for (let i = 0; i < 3; i++) if (GKS.on[i]) gkfNote(o, i, false);
  GKS.on = [false, false, false]; GKS.q.fill(-1); GKS.pend = 0; GKS.hb = 0; GKS.nb = 0; GKS.o = null; GKS.rate = 0; GKS.n = 0; GKS.zero = false;
}
function gkfPick(name) {
  gkfStop();
  GK.p.fs = name || ''; gkSave();
  if (!name) gkfDark(false);
  if (GK.card) gkCardSync();
}
// "Nur die Wasserwaage": a phone used as a sensor shows nothing but its Wasserwaage on black (an OLED screen spends
// almost nothing on it; Gestik keeps it awake) and swallows touches; a double tap brings the app back
function gkfDark(on) {
  const D = GK.dark;
  if (!on) { if (D) { cancelAnimationFrame(D.raf); D.el.remove(); GK.dark = null; } return; }
  if (D) return;
  const cv = h('canvas', { 'aria-hidden': 'true' }), t = h('p'), el = h('div', { class: 'gkf-dark', role: 'dialog', 'aria-label': 'Funkstrecke: dieses Gerät sendet seine Bewegung. Zweimal tippen: zurück.' }, cv, t, h('p', { class: 'fine' }, 'Zweimal tippen: zurück'));
  $('#app').append(el);
  const X = (GK.dark = { el, cv, t, raf: 0, last: 0, w: 0 });
  onDoubleTap(el, () => gkfDark(false));   // (it covers the field: no touch reaches a note)
  const draw = (ts) => {
    X.raf = requestAnimationFrame(draw);
    if (ts - X.last < 33) return;
    X.last = ts;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(Math.min(innerWidth, innerHeight) * 0.7);
    if (X.w !== w) { X.w = w; cv.width = cv.height = Math.round(w * dpr); cv.style.width = cv.style.height = w + 'px'; }
    const c = cv.getContext('2d'), st = GK.R && GK.R.st, W = GK.p.weite, R = w / 2 - 10;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, w);
    c.strokeStyle = 'rgba(240,230,216,0.18)'; c.lineWidth = 1.5; c.beginPath(); c.arc(w / 2, w / 2, R, 0, Math.PI * 2); c.stroke();
    let x = GK.live && st ? st.roll / W : 0, y = GK.live && st ? -st.pitch / W : 0;
    const m = Math.hypot(x, y); if (m > 1.12) { x *= 1.12 / m; y *= 1.12 / m; }
    c.fillStyle = gkfSending() ? COL.spore : COL.dim; c.globalAlpha = GK.ev.ruhe ? 0.4 : 0.85;
    c.beginPath(); c.arc(w / 2 + x * R, w / 2 - y * R, 9, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    const o = gkfOut(), txt = !o ? 'Kein Ausgang' : !GK.live ? 'Wartet auf den Sensor' : 'Sendet an ' + devShort(o.name) + ' · ' + (GKS.rate || '…') + ' Nachrichten/s';
    if (t.textContent !== txt) t.textContent = txt;
  };
  X.raf = requestAnimationFrame(draw);
}
gkSub(gkfSub);

// The receiver. The profile "Gestik (Handy)" (never by a port's name – by the signature on channel 16)
const GKF_PROF = { id: 'gkr', name: 'Gestik (Handy)', re: /(?!)/, what: 'die Bewegung eines Handys über die Funkstrecke', own: 1, binds: [],
  ctrls: [['Neigen, Bebung, Drehen, Ladung', 'Gestik auf diesem Gerät: Anlehnen, Ladung, Schlafen, Bewegung im Hexenring – wie am Handy'], ['Kanal 16', 'NRPN 42/0–8 und Noten 48–52 – nie Tasten, Pedale oder Standard-Zuordnungen']] };
const gkrOn = (src) => !!src.gkr && profOn(src);
// channel 16 of every input passes here first (midiTake): NRPN parts are followed for the signature; once it was
// seen, they and the event notes are Gestik's – and nothing else's
function gkrTake(src, ev) {
  if (ev.type === 'cc') {
    const n = ev.num;
    if (n !== 99 && n !== 98 && n !== 6 && n !== 38) return false;
    const q = src.gkq || (src.gkq = { pm: -1, pl: -1, vm: -1 });
    if (n === 99) { q.pm = ev.val; q.pl = q.vm = -1; }
    else if (n === 98) { q.pl = ev.val; q.vm = -1; }
    else if (n === 6) q.vm = ev.val;
    else if (q.pm === GKF.msb && q.pl >= 0 && q.vm >= 0) gkrVal(src, q.pl, (q.vm << 7) | ev.val);
    return q.pm === GKF.msb && gkrOn(src);
  }
  if ((ev.type === 'on' || ev.type === 'off') && ev.num >= GKF.note && ev.num <= GKF.note + 4 && gkrOn(src)) { gkrNote(src, ev); return true; }
  return false;
}
function gkrVal(src, n, val) {
  if (n === GKF.hb) { if (val >> 7 === GKF.sig) gkrSeen(src, val & 127); return; }
  const R = src.gkr;
  if (!R || !profOn(src)) return;
  if (n < GKF.n) { R.v[n] = gkfUnpack(n, val); R.t = performance.now(); gkrDue(src); }
  else if (n === GKF.lat) R.latS = val;
}
function gkrSeen(src, flags) {
  if (gkfSending()) return;   // sending ourselves: our own signature come back through a loop
  const now = performance.now();
  let R = src.gkr;
  if (!R) {
    R = src.gkr = { t: now, flags, latS: null, v: new Float64Array(GKF.n), ev: [], due: false, n: 0, rn: 0, rt: now, rate: 0 };
    MAP.v++;   // the profile changes (mapOf, the card)
    if (profOn(src)) toast('Gestik (Handy) erkannt: ' + devShort(src.name) + ' – die Bewegung des Handys wirkt jetzt hier.', 5000);
    updDevUI();
  }
  R.t = now; R.flags = flags;
  if (!profOn(src)) return;
  if (!GK.rem) gkRemOn(src);
  if (GK.rem && GK.rem.src === src) { GK.last = now; GK.dmSeen = !!(flags & 2); if (GK.R && GK.R.rem) GK.R.st.gyro = !!(flags & 1); }
}
function gkrNote(src, ev) {
  const R = src.gkr, i = ev.num - GKF.note, on = ev.type === 'on' && ev.val > 0;
  if (i < 3) R.ev.push({ type: GK_EV[i], on, v: on ? ev.val / 127 : 0 });
  else if (i === 3 && on) R.ev.push({ type: 'peak', v: ev.val / 127, t: performance.now(), i: 0 });
  else if (i === 4 && on) R.ev.push({ type: 'zero', why: 'remote' });
  R.t = performance.now();
  gkrDue(src);
}
// a burst (one sensor frame: several axes, maybe an event) becomes one Gestik update
function gkrDue(src) {
  const R = src.gkr;
  if (R.due) return;
  R.due = true;
  Promise.resolve().then(() => { R.due = false; gkRemIn(src); });
}
// Gestik from the phone: switched on for it (without touching "Gestik" as it was set here), the recogniser replaced by
// one that only holds the received values; Gestik's own sensor here (if any) rests meanwhile
function gkRemOn(src) {
  if (GK.rem || GK.remOff === src.key) return;
  const loc = GK.on;
  if (!loc) {
    GK.on = true; GK.remOnly = true; GK.live = false; GK.dts = []; GK.lastT = 0; GK.dmSeen = false; GK.ori = null; GK.engaged = false; GK.mode = 'off'; GK.xf = null; GK.toastOnce = true; GK.checked = true; GK.perm = 'remote';
    gkSrc(true);
    clearInterval(GK.timer); GK.timer = setInterval(gkTick, 50);
  }
  GK.Rloc = loc ? GK.R : null;
  GK.R = gkRemR();
  GK.rem = { src, zx: 0, zy: 0, t: performance.now() };
  GK.live = false;
  KC.sig = '';   // the cards: "Gestik · Handy über …"
  gkStatus(); updDevUI();
}
function gkRemR() {
  const R = gkMake({ weite: GK.p.weite, entl: GK.p.entl, pickZero: false }), st = R.st;
  st.z = [0, 0, 1]; st.u = [0, 0, 1]; st.uf = [0, 0, 1]; st.sign = 1; st.drh = 0;
  R.rem = true;
  // a new zero here: the phone's angles from now on less these (in degrees – then shaped by this Weite)
  R.zero = () => { const m = GK.rem; if (!m || st.wenden) return false; m.zx += st.roll; m.zy += st.pitch; st.z = [0, 0, 1]; gkRemAx(R); return true; };
  R.push = () => ({ t: 0, axes: Object.assign({}, st.axes), events: [], state: st });
  R.restart = () => {};
  return R;
}
function gkRemAx(R) {
  const m = GK.rem, V = m.src.gkr.v, st = R.st, X = st.axes;
  st.roll = V[0] - m.zx; st.pitch = -V[1] - m.zy;
  X.tiltX = R.shape(st.roll); X.tiltY = R.shape(-st.pitch);
  X.bebung = V[2]; X.drehen = V[3]; X.ladung = V[4];
  st.lad = V[4]; st.sw = V[5]; st.swHz = V[6]; st.swDir = V[7];
  st.drh = 60 * Math.atanh(clamp(V[3], -0.999, 0.999));
  st.ang = Math.hypot(st.roll, st.pitch);
  st.gyro = !!(m.src.gkr.flags & 1);
}
function gkRemIn(src) {
  const m = GK.rem, G = src.gkr;
  if (!m || m.src !== src || !GK.on || !GK.R || !GK.R.rem) { G.ev.length = 0; return; }
  const R = GK.R, st = R.st, evs = G.ev.splice(0), now = performance.now();
  for (const e of evs) {
    if (e.type === 'wenden') st.wenden = e.on; else if (e.type === 'ruhe') st.ruhe = e.on; else if (e.type === 'schuetteln') st.shake = e.on;
    else if (e.type === 'zero') { m.zx = 0; m.zy = 0; st.z = [0, 0, 1]; }   // the phone took a new zero: its angles start from it
  }
  gkRemAx(R);
  if (!GK.live) { GK.live = true; GK.checked = true; if (gkCl() === 'immer') GK.engaged = true; }
  GK.last = now; m.t = now;
  G.n++; if (now - G.rt >= 1000) { G.rate = Math.round(((G.n - G.rn) * 1000) / (now - G.rt)); G.rn = G.n; G.rt = now; }
  Object.assign(GK.raw, st.axes);
  gkUpdate(now, evs);
}
// the phone went quiet for 10 s, its input went or its profile was switched off: Gestik here as it was before
function gkRemEnd() {
  const m = GK.rem;
  if (!m) return;
  GK.rem = null;
  KC.sig = '';
  if (GK.remOnly) { gkDisable(); return; }
  GK.R = GK.Rloc || gkNew();
  GK.Rloc = null; GK.live = false; GK.checked = false;
  clearTimeout(GK.liveT); GK.liveT = setTimeout(() => { GK.checked = true; gkStatus(); }, 1200);
  gkUpdate(performance.now(), []); gkStatus(); updDevUI();
}
function gkRemCheck(now) {
  const m = GK.rem, s = m.src;
  if (s.syn) { if (!s.syn()) gkRemEnd(); return; }   // (the Touché as a phone – touche-gestik.js: it ends itself)
  if (now - s.gkr.t > 10000 || MIDI.srcs.get(s.key) !== s || !s.enabled || s.dup || !profOn(s)) gkRemEnd();
}
const gkRemText = () => { const G = GK.rem.src.gkr, live = performance.now() - GK.last < 250; if (GK.rem.src.syn) return 'Touché als Handy (Spielweise „Gestik“)' + (live ? ' · ' + (G.rate || '…') + ' Werte/s' : ''); return 'Funkstrecke: ' + devShort(GK.rem.src.name) + (live ? ' · ' + (G.rate || '…') + ' Werte/s' : ' – wartet auf das Handy'); };

