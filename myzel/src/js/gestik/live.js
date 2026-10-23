/* ---------- Gestik live: sensors, permission, the clutch, the source in Zuweisen ---------- */
// GK: on (switched on), want (it was on: the start tap asks again), perm ('', 'asking', 'granted', 'denied', 'tap'),
// live (plausible sensor values arrived), last (when the last sample came, performance time), R (the recogniser), src
// (Gestik's source for Zuweisen – never a MIDI port), raw (axes as the recogniser gives them), out (after the clutch:
// what bindings and the mod layer get), ev (wenden/ruhe/schuetteln states), engaged (the clutch lets it act), frozen
// (Festhalten), virt ({x, y}: the tilt the dragged Wasserwaage sets), p (the stored settings), subs (listeners:
// fn(out, raw, events, now) – the mod layer subscribes with gkSub).
const GK_KEY = 'myzel.gestik.v1';
const GK_AX = ['tiltX', 'tiltY', 'bebung', 'drehen', 'ladung'], GK_EV = ['wenden', 'ruhe', 'schuetteln'];
const GK_AXN = ['Neigen ↔', 'Neigen ↕', 'Bebung', 'Drehen', 'Ladung'], GK_EVN = ['Wenden', 'Ruhe', 'Schütteln'];
const GK_ZERO = { tiltX: 0, tiltY: 0, bebung: 0, drehen: 0, ladung: 0 };
// Sporenregen's strikes: the engines that strike (their sound as the patch sets them) – all struck sources but those
// whose ENG_META says regen: 0 (Gong: its bloom outlasts the spores)
const RG_S = ENG_OPTS.filter(([k]) => ENGINES[k] && !ENGINES[k].sustain && ENG_META[k].regen !== 0);
const GK = {
  on: false, want: false, perm: '', live: false, last: 0, R: null, src: null, raw: Object.assign({}, GK_ZERO), out: Object.assign({}, GK_ZERO),
  ev: { wenden: false, ruhe: false, schuetteln: false }, engaged: false, frozen: false, susD: false, holdPad: false, key: false, zt: 0,
  mode: 'off', xf: null, held: null, virt: null, drag: false, lockT: 0, subs: [], sent: [0.5, 0.5, 0.5, 0.5, 0], shown: [0.5, 0.5, 0.5, 0.5, 0], tapT: [0, 0, 0, 0, 0],
  smo: new Set(), timer: 0, liveT: 0, dts: [], lastT: 0, lastU: 0, dmSeen: false, ori: null, hist: [], rec: null, kl: null, msgT: '', toastOnce: false, card: null,
  // Funkstrecke: rem (a phone's Gestik arrives over MIDI: { src, zx, zy } – its zero here), remOnly (switched on for it
  // alone), remOff (switched off by hand while that input sent), Rloc (this device's own recogniser meanwhile)
  rem: null, remOnly: false, remOff: null, Rloc: null,
  p: { on: false, weite: 30, clutch: 'toene', haptik: true, entl: 8, lat: null, latS: null, rot: null, halt: true,
    // Anlehnen: what tilt shapes, sideways, several notes, Bebung (null: by the screen), placement, Tragen
    neigen: 'anl', seit: 'ton', viele: 'neu', beb: null, platz: 'hand', tragen: false,
    // Ladung (Rassel-Schläge: sound, grid; Tank; Schwenken), Schlafen (what turning over means)
    lad: true, ras: false, rasS: 'trp', rasQ: '16', tank: false, sw: true, schlaf: true, slArt: 'kadenz',
    // the sustain pedal freezes Gestik too (Festhalten) – off: a keyboard player pedals all the time
    ped: false,
    // Freeze-Kadenz's frozen tail: 'aus' – it dies away after half a minute face down (a set's ending) – or 'halt'
    slTail: 'aus',
    // Funkstrecke: the output (by name) Gestik is sent to as MIDI – '' none
    fs: '',
    // Sporenregen: art (Keime, Harfe), strike, grid, spores, Zähigkeit, Ordnung, how many bars a played Keim stays,
    // the Puls seeds too
    rgArt: 'keime', rgS: 'trp', rgQ: 'auto', rgN: 10, rgZ: 0.4, rgO: 0.5, rgK: 4, rgP: false,
    // Gestik-Rezepte: the presets' recipes act (while Gestik is on); rzK: the preset whose recipe is the current one
    rez: true, rzK: null,
    // the sign of this device's acceleration (−1: mirrored, as iOS sends it), once deviceorientation confirmed it
    sign: null },
  // rz: the recipe acting now – { key, own: the player's own values of what it set }
  rz: null,
};
(() => { try { const o = JSON.parse(store.get(GK_KEY) || 'null'); if (o && typeof o === 'object') for (const k in GK.p) if (k in o) GK.p[k] = o[k]; } catch (e) {} })();
// every setting within its choices (stored ones, and those a user preset brings)
function gkCheck() {
  if (![20, 30, 45].includes(GK.p.weite)) GK.p.weite = 30;
  if (!['toene', 'immer', 'taste'].includes(GK.p.clutch)) GK.p.clutch = 'toene';
  GK.p.entl = clamp(Number(GK.p.entl) || 8, 0.3, 30);
  GK.p.halt = GK.p.halt !== false;
  if (!['ton', 'raum', 'aus'].includes(GK.p.seit)) GK.p.seit = 'ton';
  if (!['neu', 'alle'].includes(GK.p.viele)) GK.p.viele = 'neu';
  if (!['hand', 'oca', 'aus'].includes(GK.p.beb)) GK.p.beb = null;
  if (!['hand', 'arm'].includes(GK.p.platz)) GK.p.platz = 'hand';
  GK.p.tragen = GK.p.tragen === true;
  for (const k of ['lad', 'sw', 'schlaf']) GK.p[k] = GK.p[k] !== false;
  for (const k of ['ras', 'tank', 'ped']) GK.p[k] = GK.p[k] === true;
  if (!['trp', 'mem', 'sch', 'jrg', 'mdr', 'rhz'].includes(GK.p.rasS)) GK.p.rasS = 'trp';
  if (!['16', '32', 'frei'].includes(GK.p.rasQ)) GK.p.rasQ = '16';
  if (!['kadenz', 'stille', 'szene'].includes(GK.p.slArt)) GK.p.slArt = 'kadenz';
  if (!['aus', 'halt'].includes(GK.p.slTail)) GK.p.slTail = 'aus';
  if (typeof GK.p.fs !== 'string') GK.p.fs = '';
  if (!['aus', 'anl', 'regen', 'eigene'].includes(GK.p.neigen)) GK.p.neigen = 'anl';
  if (!['keime', 'harfe'].includes(GK.p.rgArt)) GK.p.rgArt = 'keime';
  if (ENG_ALIAS[GK.p.rgS]) GK.p.rgS = ENG_ALIAS[GK.p.rgS];
  if (!RG_S.some((x) => x[0] === GK.p.rgS)) GK.p.rgS = 'trp';
  if (!['auto', '8', '16', '8t', 'frei'].includes(GK.p.rgQ)) GK.p.rgQ = 'auto';
  GK.p.rgN = clamp(Math.round(Number(GK.p.rgN) || 10), 8, 16);
  for (const k of ['rgZ', 'rgO']) { const v = Number(GK.p[k]); GK.p[k] = Number.isFinite(v) ? clamp(v, 0, 1) : k === 'rgZ' ? 0.4 : 0.5; }
  if (![2, 4, 8].includes(GK.p.rgK)) GK.p.rgK = 4;
  GK.p.rgP = GK.p.rgP === true; GK.p.rez = GK.p.rez !== false;
  if (typeof GK.p.rzK !== 'string') GK.p.rzK = null;
  if (GK.p.sign !== 1 && GK.p.sign !== -1) GK.p.sign = null;
}
gkCheck();
GK.want = !!GK.p.on;
// (a preset's recipe acting: what is stored are the player's own values)
const gkSave = () => store.set(GK_KEY, JSON.stringify(GK.rz ? Object.assign({}, GK.p, GK.rz.own) : GK.p));
// a lean dragged on the Wasserwaage stays after letting go (on top of the sensor) – for Sporenregen
const gkRgLatch = () => GK.p.neigen === 'regen';
// the clutch that acts: Sporenregen always acts ("Immer"), unless only a pad may let it ("Taste")
const gkCl = () => (GK.p.neigen === 'regen' && GK.p.clutch !== 'taste' ? 'immer' : GK.p.clutch);
// a browser that knows motion events at all (whether a sensor answers is checked after switching on)
const gkExists = () => typeof window.DeviceMotionEvent !== 'undefined' || typeof window.DeviceOrientationEvent !== 'undefined';
// "dieses Handy / Tablet / Gerät": by the screen (the iPad's own name only as a word – nothing acts on it)
const gkDevWord = () => (GK.rem ? 'Handy über die Funkstrecke' : IPAD ? 'dieses iPad' : !MOBILE ? 'dieses Gerät' : Math.min(screen.width || 0, screen.height || 0) >= 600 ? 'dieses Tablet' : 'dieses Handy');
// an embedding page that did not delegate the motion sensors (Permissions Policy): the claude.ai view, other frames
const gkPolicyNo = () => { try { const fp = document.permissionsPolicy || document.featurePolicy; return !!(fp && fp.allowsFeature && !fp.allowsFeature('accelerometer')); } catch (e) { return false; } };
const gkBlocked = () => inViewer || gkPolicyNo();
const gkAngle = () => { const o = screen.orientation, a = o && typeof o.angle === 'number' ? o.angle : typeof window.orientation === 'number' ? window.orientation : 0; return ((a % 360) + 360) % 360; };
function gkSub(fn) { GK.subs.push(fn); return () => { GK.subs = GK.subs.filter((f) => f !== fn); }; }
// this device's recogniser: the clutch, Sporenregen (a support's slope is no level), the sign an earlier check found
const gkNew = () => gkMake({ weite: GK.p.weite, entl: GK.p.entl, pickZero: gkCl() === 'immer', restFlat: GK.p.neigen === 'regen', sign: GK.p.sign });

// Switching on: the permission is asked synchronously inside the tap (iOS needs it, Chrome 151+ asks too and normally
// allows at once), then Myzel listens and checks for 1.2 s that real values arrive.
function gkEnable(tap) {
  GK.remOff = null;   // switched on by hand: a phone sending over the Funkstrecke is welcome again
  if (GK.on && (GK.perm === 'granted' || GK.perm === 'asking')) return;
  if (GK.remOnly) { GK.remOnly = false; GK.Rloc = gkNew(); }   // it ran for a phone: now for this device too
  const D = window.DeviceMotionEvent, O = window.DeviceOrientationEvent;
  const ask = D && typeof D.requestPermission === 'function' ? D : O && typeof O.requestPermission === 'function' ? O : null;
  let p;
  try { p = ask ? Promise.resolve(ask.requestPermission()) : Promise.resolve('granted'); } catch (e) { p = Promise.reject(e); }   // first, before anything awaits
  if (!GK.on) {
    GK.on = true; GK.live = false; GK.dts = []; GK.lastT = 0; GK.dmSeen = false; GK.ori = null; GK.engaged = false; GK.mode = 'off'; GK.xf = null; GK.toastOnce = false; GK.checked = false;
    GK.R = gkNew();
    GK.rem = null; GK.Rloc = null;
    gkSrc(true);
    clearInterval(GK.timer); GK.timer = setInterval(gkTick, 50);
    keepAwake();
  }
  GK.want = GK.p.on = true; gkSave();
  rzSync();   // the current preset's Gestik recipe acts now
  GK.perm = 'asking'; GK.tap = !!tap;
  p.then((st) => gkPerm(st === 'granted' ? 'granted' : 'denied'), (e) => gkPerm(e && e.name === 'NotAllowedError' ? 'tap' : 'denied'));
  gkStatus();
}
function gkPerm(st) {
  if (!GK.on) return;
  GK.perm = st;
  updDevUI();
  if (st === 'granted') {
    if (!gkPolicyNo()) { window.addEventListener('devicemotion', gkMotion); window.addEventListener('deviceorientation', gkOrient); }   // a frame that may not: no listener
    clearTimeout(GK.liveT); GK.liveT = setTimeout(() => { GK.checked = true; gkStatus(); }, 1200);
  }
  gkStatus();
}
function gkDisable() {
  if (!GK.on) return;
  const ro = GK.remOnly, w = GK.p.on;
  if (GK.rem) { GK.remOff = GK.rem.src.key; GK.rem = null; KC.sig = ''; }   // switched off by hand while a phone sends: it stays off
  gkfStop(); gkfDark(false);
  window.removeEventListener('devicemotion', gkMotion);
  window.removeEventListener('deviceorientation', gkOrient);
  clearInterval(GK.timer); clearTimeout(GK.liveT); clearTimeout(GK.zt);
  gkKlopfStop(); gkRecStop(false); gkBassOff();
  // what it drove comes to rest
  GK.out = Object.assign({}, GK_ZERO); gkEmit(performance.now(), true);
  for (const k of GK_EV) if (GK.ev[k]) { GK.ev[k] = false; gkEvTake(GK_EV.indexOf(k), false, 1); }
  for (const f of GK.subs) { try { f(GK.out, GK_ZERO, [], performance.now()); } catch (e) { console.error(e); } }
  modClear('gk:*');
  hxBewGkOff();   // the Gestik lanes of the Schleifen of Bewegung rest while it is off
  GK.on = false; GK.live = false; GK.perm = ''; GK.virt = null; GK.latch = false; GK.drag = false; GK.checked = false; GK.remOnly = false; GK.Rloc = null;
  GK.want = GK.p.on = ro ? w : false; gkSave();   // Gestik that only ran for a phone leaves the own switch as it was
  rzSync();   // a recipe gives the player's own settings back
  gkSrc(false);
}
// Gestik as a source like a keyboard: in Zuweisen, the cards, the bindings – but not in MIDI.ports (no "verbunden",
// no extra strings, no MIDI light, no status line)
function gkSrc(on) {
  if (on && !GK.src) {
    GK.src = midiSource('gestik', 'Gestik', 'motion');
    GK.src.enabled = true; GK.src.secondary = false;
    GK.sent = [0.5, 0.5, 0.5, 0.5, 0];
    midiSync();
  } else if (!on && GK.src) {
    midiDrop(GK.src); GK.src = null; GK.smo.clear();
    midiSync();
  }
  if (MX.root) mxRgnSync();   // the mixer's "Regen" stands there only while it can rain
}
// the sensor events: the browser's own timestamp (never event.interval), the values as they come
function gkMotion(e) {
  const ag = e.accelerationIncludingGravity, al = e.acceleration, rr = e.rotationRate, ok3 = (x, y, z) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
  if (!ag || !ok3(ag.x, ag.y, ag.z)) return;   // a computer without sensors may send events with nothing in them
  const t = e.timeStamp > 0 ? e.timeStamp : performance.now();
  GK.dmSeen = true;
  const o = GK.ori, og = o && Math.abs(t - o.t) < 150 ? gkOriG(o.beta, o.gamma) : null;   // the sign check: deviceorientation's gravity alongside
  gkSample({ t, g: [ag.x, ag.y, ag.z], a: al && ok3(al.x, al.y, al.z) ? [al.x, al.y, al.z] : null, r: rr && ok3(rr.alpha, rr.beta, rr.gamma) ? [rr.alpha, rr.beta, rr.gamma] : null, orient: gkAngle(), og });
}
// deviceorientation: the sign check under "Messen", and the gravity for devices that send nothing else
function gkOrient(e) {
  if (!Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return;
  const t = e.timeStamp > 0 ? e.timeStamp : performance.now();
  GK.ori = { beta: e.beta, gamma: e.gamma, t };
  if (!GK.dmSeen) { const g = gkOriG(e.beta, e.gamma); gkSample({ t, g, a: null, r: null, orient: gkAngle(), ori: true, og: g }); }
  else if (GK.on && GK.R && !GK.rem) {   // the sign: checked against the last motion sample too
    const ev = GK.R.ori(gkOriG(e.beta, e.gamma), t), st = GK.R.st;
    if (st.signK === 'ori' && GK.p.sign !== st.sign) { GK.p.sign = st.sign; gkSave(); }
    if (ev.length) { Object.assign(GK.raw, st.axes); gkUpdate(performance.now(), ev); }
  }
}
// one sample from any source (the sensors, a test, a recorded trace)
function gkSample(s) {
  if (!GK.on || !GK.R || GK.rem) return;   // a phone over the Funkstrecke speaks instead
  const now = performance.now(), g = s.g;
  if (!g) return;
  if (!GK.live) {
    const m = Math.hypot(g[0], g[1], g[2]);
    if (!(m > 4 && m < 16) && !(s.r && (s.r[0] || s.r[1] || s.r[2]))) return;   // zeros: no sensor behind it
    GK.live = true; GK.checked = true; clearTimeout(GK.liveT);
    if (gkCl() === 'immer') GK.engaged = true;
  }
  if (s.orient == null) s.orient = gkAngle();
  s.lock = now < GK.lockT;
  if (s.bass == null) s.bass = GK.bassLvl || 0;
  if (!s.held) { if (GK.lastT) { GK.dts.push(s.t - GK.lastT); if (GK.dts.length > 120) GK.dts.shift(); } GK.lastT = s.t; }   // the rate of real events only
  if (GK.rec) gkRecPush(s);
  if (GK.kl) gkKlopfAcc(s);
  GK.R.opts.pickZero = gkCl() === 'immer'; GK.R.opts.restFlat = GK.p.neigen === 'regen';
  const o = GK.R.push(s);
  GK.last = now;
  if (GK.R.st.signK === 'ori' && GK.p.sign !== GK.R.st.sign) { GK.p.sign = GK.R.st.sign; gkSave(); }   // the next session starts right
  Object.assign(GK.raw, o.axes);
  // the angle of the screen's up against gravity, for "the view turned at …"
  const st = GK.R.st;
  if (st.u && !s.ori) { GK.hist.push({ t: now, a: Math.atan2(-st.sign * st.u[0], st.sign * st.u[1]) * 180 / Math.PI }); while (GK.hist.length && now - GK.hist[0].t > 900) GK.hist.shift(); }
  // the recogniser takes every sample (its 10 ms grid needs them); what it drives – the bindings, the mod layer, six
  // listeners – at most every 7 ms: a phone sending 200 Hz costs no more than one sending 120 (events never wait)
  if (o.events.length || now - GK.lastU >= 7 || s.held) { GK.lastU = now; gkUpdate(now, o.events); }
}
// the timer (20 Hz while Gestik is on): the Wächter, the dragged Wasserwaage without sensor, glides, smoothing
function gkTick() {
  const now = performance.now();
  if (GK.rem) gkRemCheck(now);
  gkfTick(now);
  if (GK.live && GK.R.st.gyro && A.ctx && !GK.rem) gkBass();
  // only deviceorientation (never a devicemotion with values): it fires on change only, so a still phone is held from
  // here – the Wächter would rest it otherwise
  const o = GK.ori;
  if (o && !GK.dmSeen && GK.live && now - GK.last > 40 && document.visibilityState === 'visible') { const g = gkOriG(o.beta, o.gamma); gkSample({ t: now, g, a: null, r: null, orient: gkAngle(), ori: true, held: true, og: g }); }
  if (!GK.live || now - GK.last > 60) gkUpdate(now, []);
}
// how loud the output is below 120 Hz, for the recogniser's bass guard: a low-pass and a small analyser on the sum,
// read ten times a second. Made once per audio context (Chrome never releases a node's handler, so making them anew
// for every switch-on would leave two behind each time); only the sum's tap is connected while Gestik is on.
function gkBass() {
  let B = GK.bass;
  if (!B || B.ctx !== A.ctx) {
    if (!A.gkB || A.gkB.ctx !== A.ctx) {
      const lp = A.ctx.createBiquadFilter(), an = A.ctx.createAnalyser();
      lp.type = 'lowpass'; lp.frequency.value = 120; lp.Q.value = 0.7; an.fftSize = 512;
      lp.connect(an);
      A.gkB = { ctx: A.ctx, lp, an, buf: new Float32Array(512) };
    }
    B = GK.bass = Object.assign(A.gkB, { t: 0 });
    A.out.connect(B.lp);
  }
  const now = performance.now();
  if (now - B.t < 100) return;
  B.t = now;
  B.an.getFloatTimeDomainData(B.buf);
  let ss = 0;
  for (let i = 0; i < 512; i++) ss += B.buf[i] * B.buf[i];
  GK.bassLvl = clamp((10 * Math.log10(ss / 512 + 1e-12) + 26) / 12, 0, 1);   // −26 dBFS → 0, −14 dBFS → 1
}
function gkBassOff() {
  const B = GK.bass;
  GK.bass = null; GK.bassLvl = 0;
  if (B && B.ctx === A.ctx) { try { A.out.disconnect(B.lp); } catch (e) {} }   // the nodes stay for the next switch-on
}
// Festhalten from the sustain pedal of any keyboard – only when the card's switch says so (legato pedalling would
// freeze Anlehnen all the time)
function gkSus() {
  if (!GK.p.ped) return false;
  for (const s of MIDI.srcs.values()) if (s.enabled && !s.dup) for (const cs of s.chs) if (cs && cs.sus) return true;
  return false;
}
// The clutch and the output: 'live' (acts), 'hold' (Festhalten keeps the values), 'off' (rests at neutral). Every change
// of state glides: 300 ms to rest, out of a hold or back from the dragged Wasserwaage to the sensor; 80 ms into play (the
// zero was just taken, values start near 0) and into a drag.
function gkUpdate(now, evs) {
  const p = GK.p, st = GK.R ? GK.R.st : null;
  const fresh = GK.live && now - GK.last < 250 && document.visibilityState === 'visible';   // the Wächter: 250 ms without values
  const virt = !!GK.virt && !GK.latch && (GK.drag || !fresh);
  for (const e of evs) gkEvent(e, now);
  const sus = gkSus();
  // the pedal (or a learned pad) going down freezes the shape only while there is one
  if (sus !== GK.susD) { GK.susD = sus; if (sus && GK.mode.startsWith('live')) GK.frozen = 'sus'; else if (!sus && GK.frozen === 'sus') GK.frozen = false; }
  const cl = gkCl(), engaged = cl === 'immer' || (GK.engaged && (cl === 'toene' ? touches.size > 0 : GK.key));
  const rest = (st && st.wenden) || (GK.ev.ruhe && cl !== 'immer');
  const mode = GK.frozen ? 'hold' : (fresh || virt) && engaged && !rest ? (virt ? 'live-v' : 'live') : 'off';
  if (mode !== GK.mode) {
    GK.xf = { from: Object.assign({}, GK.out), t0: now, dur: mode === 'live-v' || (mode === 'live' && GK.mode === 'off') ? 80 : 300 };   // a drag answers at once
    if (mode === 'hold') GK.held = Object.assign({}, GK.out);
    GK.mode = mode;
  }
  if (GK.latch && (!GK.virt || !gkRgLatch())) { GK.latch = false; if (!GK.drag && fresh) GK.virt = null; }   // (Sporenregen left: the hand's lean goes with it)
  const lat = GK.latch && !virt && fresh;
  const src = virt ? Object.assign({}, fresh ? GK.raw : GK_ZERO, { tiltX: GK.virt.x, tiltY: GK.virt.y })
    : lat ? Object.assign({}, GK.raw, { tiltX: clamp(GK.raw.tiltX + GK.virt.x, -1, 1), tiltY: clamp(GK.raw.tiltY + GK.virt.y, -1, 1) }) : GK.raw;
  const tgt = mode === 'hold' ? GK.held : mode === 'off' ? GK_ZERO : src;
  const k = GK.xf ? Math.min(1, (now - GK.xf.t0) / GK.xf.dur) : 1;
  if (k >= 1) GK.xf = null;
  for (let i = 0; i < 4; i++) { const a = GK_AX[i]; GK.out[a] = k < 1 ? GK.xf.from[a] + (tgt[a] - GK.xf.from[a]) * k : tgt[a]; }
  if (p.neigen === 'aus') GK.out.tiltX = GK.out.tiltY = 0;   // "Neigen formt: Aus" – tilt shapes nothing, assignments included
  // Ladung needs no clutch (its own handling threshold); only the Wächter lets it go
  const lt = fresh ? GK.raw.ladung : 0;
  GK.out.ladung = fresh ? lt : Math.max(0, GK.out.ladung - (now - (GK.lu || now)) / 300);
  GK.lu = now;
  gkEmit(now, false);
  for (const f of GK.subs) { try { f(GK.out, GK.raw, evs, now); } catch (e) { console.error(e); } }
}
// recogniser events: their state, a button press for Zuweisen
function gkEvent(e, now) {
  const i = GK_EV.indexOf(e.type);
  if (i >= 0) {
    if (GK.ev[e.type] === e.on) return;
    GK.ev[e.type] = e.on;
    gkEvTake(i, e.on, e.v);
  }
}
function gkEvTake(i, on, v) {
  const src = GK.src;
  if (!src) return;
  const ev = { type: on ? 'gon' : 'goff', ch: 0, num: i, val: on ? clamp(v == null ? 1 : v, 0, 1) : 0, t: performance.now() };
  src.act = ev.t; src.last = ev;
  if (MIDI.tap) MIDI.tap(src, ev);
  midiTake(src, ev);
}
// Each axis goes to the bindings when it moved (a 2000th of its range); the device light and the monitor only for a
// clear move, at most four times a second per axis – Gestik must not flood them like a knob turned for ever.
function gkEmit(now, force) {
  const src = GK.src;
  if (!src) return;
  const learn = LEARN.on, M = mapOf(src);
  if (!force && !learn && !M.size && !KCM.on && !GK.smo.size) return;
  const st = GK.R && GK.R.st;
  for (let i = 0; i < 5; i++) {
    const a = GK_AX[i];
    // while learning: the axes before the clutch (nothing plays then), plus how far each moved in comparable units
    let v = learn && st && GK.live ? GK.raw[a] : GK.out[a];
    if (learn && GK.virt && (GK.drag || !GK.live) && i < 2) v = i ? GK.virt.y : GK.virt.x;
    const n = i < 4 ? (v + 1) / 2 : v;
    if (Math.abs(n - GK.sent[i]) < 5e-4 && !force) continue;
    GK.sent[i] = n;
    const ev = { type: 'axis', ch: 0, num: i, val: n, t: now };
    if (learn) ev.lx = gkLx(i, v);
    if (Math.abs(n - GK.shown[i]) > 0.03 && now - GK.tapT[i] > 250) {
      GK.shown[i] = n; GK.tapT[i] = now;
      src.act = now; src.last = ev;
      if (MIDI.tap) MIDI.tap(src, ev);
    }
    midiTake(src, ev);
  }
  // bindings with Glätte keep gliding after the axis stopped
  if (!learn) for (const b of Array.from(GK.smo)) mapApply(b, src, { type: 'axis', ch: 0, num: b.num, val: GK.sent[b.num], t: now });
}
// how far an axis is from rest, in comparable units (1 ≈ a full Weite of tilt), for learn
function gkLx(i, v) {
  const st = GK.R && GK.R.st, W = GK.p.weite;
  if (GK.virt && (GK.drag || !GK.live) && i < 2) return v;
  if (!st) return 0;
  return i === 0 ? st.roll / W : i === 1 ? -st.pitch / W : i === 3 ? st.drh / 60 : v;
}
// Notes from anywhere – fingers, keys of the computer, MIDI and Bluetooth keyboards, the X-Y pad – all live in
// touches: "Mit Tönen" acts while one sounds. The zero is the pose 80 ms after the first note after silence, so the
// jolt of the tap is never the zero. A tap on the field also blinds Schütteln and Wenden for 100 ms.
function gkNote(tt, down, e) {
  const now = performance.now(), hand = !!(e && e.pointerType);
  if (RG.on) rgNote(tt, down);   // Sporenregen: every note leaves a Keim
  if (down && SLP.on && !hand) slpOpen();
  if (hand) GK.lockT = Math.max(GK.lockT, now + 100);
  // Fingerhalt measures the turn from the stroke (not from the finger's first move: the glass may turn under a still
  // finger first and slip only afterwards)
  if (down && hand && GK.R && !GK.rem && GK.R.st.uf) tt.fu0 = GK.R.st.uf.slice();
  // a finger on the screen of a phone held face down (lying on your back, the phone overhead – the veil only covers a
  // phone lying still): the screen faces the player, whatever gravity says. That pose is the zero now, Wenden ends.
  if (down && hand && GK.ev.wenden && GK.R && !GK.rem) gkZero(false, true);
  if (gkCl() !== 'toene') return;
  if (down && touches.size === 1) { GK.engaged = false; GK.zHand = hand; clearTimeout(GK.zt); GK.zt = setTimeout(gkZeroNote, 80); }
  else if (!down && !touches.size) { clearTimeout(GK.zt); GK.engaged = false; gkUpdate(now, []); }
}
function gkZeroNote() {
  const want = gkCl() === 'toene' ? touches.size > 0 : GK.key;
  if (!GK.on || !want) return;
  if (GK.R && GK.live) gkZero(false, GK.zHand);
  GK.engaged = true;
  gkUpdate(performance.now(), []);
}
// a new zero: the clutch, the double tap on the Wasserwaage, a pad. hand: a finger on the screen asks (it may end
// Wenden – never a key or a pad); auto: not asked for (Sporenregen chosen, the clutch switched) – an iPad resting on
// its stand then measures from the flat, its stand's slope is no level
function gkZero(buzz, hand, auto) {
  if (!GK.R) return;
  const w = GK.R.st.wenden;
  if (GK.R.zero(!!hand, !!auto && GK.p.neigen === 'regen')) {
    Object.assign(GK.raw, GK.R.st.axes); GK.raw.tiltX = GK.raw.tiltY = 0; GKS.zero = true;   // (sent over the Funkstrecke with the next update)
    if (w && !GK.R.st.wenden) gkUpdate(performance.now(), [{ type: 'wenden', on: false, t: performance.now() }]);
  }
  if (buzz) gkBuzz(10);
}
// "Taste": acts only while a learned pad is held (the zero again 80 ms after it went down)
function gkKey(on) {
  if (on === GK.key) return;
  GK.key = on;
  if (gkCl() !== 'taste') return;
  clearTimeout(GK.zt); GK.engaged = false;
  if (on) GK.zt = setTimeout(gkZeroNote, 80);
  gkUpdate(performance.now(), []);
}
function gkHoldPad(on) {
  GK.holdPad = on;
  if (on) GK.frozen = 'pad'; else if (GK.frozen === 'pad') GK.frozen = GK.susD ? 'sus' : false;
  gkUpdate(performance.now(), []);
}
function gkSet(k, v) {
  if (GK.rz && k in GK.rz.own) delete GK.rz.own[k];   // a preset's recipe set it: changed by hand, it is the player's own now
  const was = GK.p.neigen;
  GK.p[k] = v; gkSave();
  if (GK.R && (k === 'weite' || k === 'entl')) GK.R.set({ [k]: v });
  if (k === 'clutch') { clearTimeout(GK.zt); GK.engaged = gkCl() === 'immer'; if (GK.engaged) gkZero(false, false, true); }
  if (k === 'neigen') gkNeigen(was);
  if (GK.on) gkUpdate(performance.now(), []);
  if ((k === 'neigen' || k === 'rgS') && MX.root) { mxSrcAll(); mxRgnSync(); }   // the mixer's "Regen" says what rains (and stands there only while it can)
  if ((k === 'rasS' || k === 'rgS') && WORKLET_ENGINES.has(v)) dspMaybe();   // a worklet source to rattle or rain with (Moder): its module now, before the first strike
}
// what tilt shapes changed: it comes in (or goes) gently; Sporenregen takes the pose now as level
function gkNeigen(was) {
  if (GK.p.neigen === was || !GK.on) return;
  GK.xf = { from: Object.assign({}, GK.out), t0: performance.now(), dur: 300 };
  if (GK.p.neigen === 'regen' && gkCl() === 'immer') { clearTimeout(GK.zt); GK.engaged = true; gkZero(false, false, true); }
  else if (was === 'regen' && GK.p.clutch === 'toene') { clearTimeout(GK.zt); GK.engaged = false; if (touches.size) GK.zt = setTimeout(gkZeroNote, 80); }   // back to "Mit Tönen": a zero from the notes held now
}
// Android vibrates (iOS has no vibration in the browser); the motor shakes the sensors, so Schütteln and Wenden are
// blind while it runs
function gkBuzz(ms) {
  if (!GK.p.haptik) return;
  try { if (navigator.vibrate && navigator.vibrate(ms)) GK.lockT = Math.max(GK.lockT, performance.now() + ms + 60); } catch (e) {}
}
// the page went to the background or came back: the Wächter handles the values, the filters restart by themselves
function gkVis() { if (document.visibilityState === 'visible') keepAwake(); gkUpdate(performance.now(), []); gkStatus(); }
// the view turned: remember at which angle (shown under "Messen"); the recogniser takes a new zero from the samples
function gkTurned() {
  if (!GK.on) return;
  let m = 0;
  for (const h of GK.hist) if (Math.abs(h.a) > Math.abs(m)) m = h.a;
  if (Math.abs(m) > 20) { GK.p.rot = Math.round(Math.abs(m)); gkSave(); }
}
// what Gestik does right now, in a word beside the Lebenszeichen: [key for the colour, word]
function gkModeWord() {
  if (!GK.on) return ['', ''];
  if (SLP.on) return ['zz', 'schläft'];
  if (GK.mode === 'hold') return ['hold', 'festgehalten'];
  if (GK.mode === 'live-v') return ['live', 'wirkt · von Hand'];
  if (GK.mode === 'live' && GK.latch) return ['live', 'wirkt · Neigung von Hand'];
  if ((!GK.live && !GK.rem) || GK.msgW) return ['', ''];
  if (GK.ev.wenden) return ['zz', 'gewendet'];
  if (GK.ev.ruhe && gkCl() !== 'immer') return ['zz', 'ruht'];
  if (GK.mode === 'live') return ['live', 'wirkt'];
  const cl = gkCl();
  return cl === 'toene' ? ['wait', 'wartet auf einen Ton'] : cl === 'taste' ? ['wait', 'wartet auf die Taste'] : ['', ''];
}
// screen readers hear Gestik's state changes (asleep, held, resting, a new zero, what went wrong) – never every note
function gkSay(t) {
  let el = GK.sayEl;
  if (!el) { el = GK.sayEl = h('p', { class: 'gk-say', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.textContent = '';
  clearTimeout(GK.sayT); GK.sayT = setTimeout(() => { el.textContent = t; }, 60);   // emptied first: the same words twice are said twice
}
// what the card says: one line, plain German
function gkStatus() {
  let t = '', warn = false;
  const now = performance.now();
  if (!GK.on) t = '';
  else if (GK.rem) t = gkRemText();
  else if (GK.live && document.visibilityState === 'visible' && now - GK.last < 1000) t = gkRateText();
  else if (document.visibilityState !== 'visible' || (GK.live && now - GK.last >= 250)) t = 'Bildschirm aus oder App im Hintergrund – Gestik pausiert';
  else if (GK.perm === 'asking') t = 'Warte auf die Erlaubnis …';
  else if (GK.perm === 'tap') { t = 'Für die Erlaubnis noch einmal auf „Gestik einschalten“ tippen.'; warn = true; }
  else if (GK.perm === 'denied') { t = gkBlocked() ? 'In dieser Ansicht gesperrt – öffne Myzel als App:' : 'Zugriff abgelehnt. Android: Website-Einstellungen → Bewegungssensoren erlauben, dann neu laden. iPhone/iPad: Safari ganz schließen, neu öffnen und hier noch einmal einschalten.'; warn = true; }
  else if (!GK.checked) t = 'Prüft den Bewegungssensor …';
  else if (gkBlocked()) { t = 'In dieser Ansicht gesperrt – öffne Myzel als App:'; warn = true; }   // (the card's link below names the address)
  else { t = 'Kein Bewegungssensor gefunden – ziehe die Spore in der Wasserwaage, dann wirkt Gestik auch so.'; warn = true; }
  if (t !== GK.msgT && GK.on && (warn || /pausiert/.test(t)) && UI.panel === 'dev') gkSay('Gestik: ' + t);
  GK.msgT = t; GK.msgW = warn;
  // switched on from the start tap: a problem is said once, the card says it always
  if (warn && GK.on && UI.panel !== 'dev' && !GK.toastOnce && (GK.checked || GK.perm === 'denied' || GK.perm === 'tap')) { GK.toastOnce = true; toast('Gestik: ' + (/:$/.test(t) ? t + ' ' + APP_URL : t), 6000); }
  if (GK.card) gkCardSync();
}
// "60 Hz · ±3 ms": the rate from the median interval, the jitter as the 95th percentile of the deviation
function gkRateText() {
  const d = GK.dts.filter((x) => x > 0.5 && x < 200).sort((a, b) => a - b);
  if (d.length < 10) return 'Sensor antwortet …';
  const med = d[d.length >> 1], dev = d.map((x) => Math.abs(x - med)).sort((a, b) => a - b), j = dev[Math.floor(dev.length * 0.95)];
  return Math.round(1000 / med) + ' Hz · ±' + Math.max(1, Math.round(j)) + ' ms' + (GK.R && !GK.R.st.gyro ? ' · ohne Gyroskop' : '');
}

