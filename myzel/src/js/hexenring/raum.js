// ---- (owner, 27.10.2026: „aufgenommene Schleifen werden nicht mehr von Effekten berührt“) the Räume der Schleifen: every
// Schleife plays into the echo and hall it was played in – their settings at its window's start (HXRL, the field's echo
// and hall as they changed, 20 minutes back; L.room, kept with it, in a Kreis), whatever the field does now. Loops played
// in the same room share one copy of it (a key of its settings); a copy is the field's echo (the same tape: ping-pong,
// tone, saturation, wow and flutter on the field's LFOs) and hall (its own IR, genIR/genRoom), its returns straight into
// the sum (the console's echo and hall returns are the preset's). Each loop reaches its room through its send pair on
// the processor's output 2 (post level, balance and state – as Nähren uses it), times the Hexenring channel's fader,
// mute and solo and its Echo/Hall knobs; that channel's own sends stay closed then (never twice). „Effekte des Presets
// wirken auf die Schleifen“ (hx.fx) instead: every loop dry through the live chain into the field's echo and hall. ----
const HXR_IDS = ['dly.sync', 'dly.div', 'dly.ms', 'dly.fb', 'dly.pp', 'dly.tone', 'dly.wow', 'dly.mix', 'rev.size', 'rev.damp', 'rev.pre', 'rev.mix', 'rev.raum'];
const HXR = { v: null, rooms: new Map(), warned: false };
const HXRL = [];   // [time, settings] – a new entry whenever the field's echo or hall changes
// (a Schleife from before 27.10.2026 without a room of its own: its patch, else the room the Leiste had then)
(() => { try { const v = JSON.parse(localStorage.getItem('myzel.hxRaum') || 'null'); if (v && typeof v === 'object') HXR.v = v; } catch (e) {} })();
const hxrNow = () => { const o = {}; for (const id of HXR_IDS) o[id] = P[id]; return o; };
const hxrKey = (v) => HXR_IDS.map((id) => v[id]).join('|');
// the field's echo and hall changed (updDelay, updReverbMix, regenIR call this): logged with the time
function hxrLog() {
  if (!A.ctx || HXW.on) return;
  const t = A.ctx.currentTime, v = hxrNow(), last = HXRL[HXRL.length - 1];
  if (last && hxrKey(last[1]) === hxrKey(v)) return;
  if (last && last[0] >= t - 0.02) HXRL.pop();
  HXRL.push([t, v]);
  while (HXRL.length > 2 && HXRL[1][0] < t - 1200) HXRL.shift();
}
// the field's echo and hall at time t (a window's start); null before the log reaches
function hxrAt(t) {
  if (t == null || !HXRL.length) return null;
  let i = HXRL.length - 1; while (i > 0 && HXRL[i][0] > t) i--;
  return HXRL[i][0] <= t + 0.05 || i === 0 && t > A.ctx.currentTime - 1200 ? Object.assign({}, HXRL[i][1]) : null;
}
function hxrOf(L) {
  const p = (L && (L.room || L.P)) || HXR.v || {}, o = {};
  for (const id of HXR_IDS) o[id] = p[id] != null ? p[id] : PD[id].d;
  return o;
}
// one room: an echo and a hall with the settings v
function hxrUnit(v) {
  const ctx = A.ctx, U = { ctx, v, key: hxrKey(v), n: 0, job: 0, nch: 0, act: null, idle: 0 };
  U.inp = G(1); U.gD = G(0); U.gR = G(0); U.inp.connect(U.gD); U.inp.connect(U.gR);
  U.dlySend = G(0); U.dlyIn = G(1); U.gD.connect(U.dlySend).connect(U.dlyIn);
  const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
  U.dlyIn.connect(split);
  U.dSumL = G(1); U.dSumR = G(1); U.dInR = G(1); U.dInRL = G(0);
  split.connect(U.dSumL, 0); split.connect(U.dInR, 1); split.connect(U.dInRL, 1);
  U.dInR.connect(U.dSumR); U.dInRL.connect(U.dSumL);
  U.dL = ctx.createDelay(4); U.dR = ctx.createDelay(4);
  U.dToneL = BQ('lowpass', 3800, -3); U.dToneR = BQ('lowpass', 3800, -3);
  U.dHpL = BQ('highpass', 90, -3); U.dHpR = BQ('highpass', 90, -3);
  const sat = makeShaperCurve((x) => Math.tanh(x * 1.5) / 1.5, 2048);
  U.dSatL = ctx.createWaveShaper(); U.dSatL.curve = sat; U.dSatR = ctx.createWaveShaper(); U.dSatR.curve = sat;
  U.dStrL = G(0); U.dCrsL = G(0); U.dStrR = G(0); U.dCrsR = G(0);
  U.dSumL.connect(U.dL).connect(U.dToneL).connect(U.dHpL).connect(U.dSatL);
  U.dSumR.connect(U.dR).connect(U.dToneR).connect(U.dHpR).connect(U.dSatR);
  U.dSatL.connect(U.dStrL).connect(U.dSumL); U.dSatL.connect(U.dCrsL).connect(U.dSumR);
  U.dSatR.connect(U.dStrR).connect(U.dSumR); U.dSatR.connect(U.dCrsR).connect(U.dSumL);
  U.dSatL.connect(merge, 0, 0); U.dSatR.connect(merge, 0, 1);
  U.dlyRet = G(1); merge.connect(U.dlyRet).connect(A.masterSum);
  U.wowG = G(0); U.flutG = G(0); A.wowLfo.connect(U.wowG); A.flutLfo.connect(U.flutG);
  for (const g of [U.wowG, U.flutG]) { g.connect(U.dL.delayTime); g.connect(U.dR.delayTime); }
  U.revSend = G(0); U.revIn = G(1); U.revPre = ctx.createDelay(1); U.revRet = G(1.25);
  U.gR.connect(U.revSend).connect(U.revIn); U.revIn.connect(U.revPre); U.revRet.connect(A.masterSum);
  U.dlyToRev = G(0.3); U.dlyRet.connect(U.dlyToRev).connect(U.revIn);   // (the echo into the hall, as the echo return's Hall send at 100 %)
  hxrApply(U, true); hxrLevelsOf(U, setNow);
  return U;
}
function hxrApply(U, ir) {
  if (!U || U.ctx !== A.ctx || U.dead) return;
  const v = U.v, t = clamp(v['dly.sync'] ? divBeats(v['dly.div']) * 60 / seqBpm() : v['dly.ms'] / 1000, 0.01, 3.9);
  setP(U.dL.delayTime, t, 0.09); setP(U.dR.delayTime, t, 0.09);
  const pp = v['dly.pp'], fb = v['dly.fb'];
  setP(U.dStrL.gain, fb * (1 - pp)); setP(U.dCrsL.gain, fb * pp); setP(U.dStrR.gain, fb * (1 - pp)); setP(U.dCrsR.gain, fb * pp);
  setP(U.dInR.gain, 1 - pp); setP(U.dInRL.gain, pp);
  setP(U.dToneL.frequency, v['dly.tone']); setP(U.dToneR.frequency, v['dly.tone']);
  setP(U.wowG.gain, v['dly.wow'] * 0.004); setP(U.flutG.gain, v['dly.wow'] * 0.0006);
  setP(U.dlySend.gain, v['dly.mix']); setP(U.revSend.gain, v['rev.mix']); setP(U.revPre.delayTime, v['rev.pre'], 0.05);
  const nch = Q.rich ? 4 : 2;
  if (ir || U.nch !== nch) hxrIR(U, nch);
}
function hxrIR(U, nch) {
  const job = ++U.job, v = U.v; U.nch = nch;
  dspJob('ir', [v['rev.size'], v['rev.damp'], SR, nch, v['rev.raum']]).then((ch) => {
    if (job !== U.job || !A.ctx || U.ctx !== A.ctx || U.dead) return;
    const conv = A.ctx.createConvolver(); conv.buffer = toBuffer(ch);
    const g = G(0), t = A.ctx.currentTime;
    U.revPre.connect(conv).connect(g).connect(U.revRet);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(nch === 4 ? IR4_GAIN : 1, t + 0.25);
    const old = U.act;
    if (old) { holdParam(old.g.gain, t); old.g.gain.linearRampToValueAtTime(0, t + 0.25); setTimeout(() => { try { U.revPre.disconnect(old.conv); old.conv.disconnect(); old.g.disconnect(); } catch (e) {} }, 600); }
    U.act = { conv, g };
  });
}
// the Hexenring channel as it would send: its fader, mute and solo, its Echo and Hall knobs (strips.js gates)
function hxrLevelsOf(U, set) {
  const st = MIX.s && MIX.s.hxr, on = !!st && !st.silent, g = st ? stripGain(st) : 1;
  set(U.gD.gain, on ? g * mp('xhxr.dly') : 0); set(U.gR.gain, on ? g * mp('xhxr.rev') : 0);
}
function hxrLevels(set) { for (const U of HXR.rooms.values()) if (U.ctx === A.ctx && !U.dead) hxrLevelsOf(U, set || ((q, v) => setP(q, v, 0.012))); }
// the graph built again (initAudio): the rooms of the old context are gone
function hxrBuild() { for (const U of HXR.rooms.values()) U.dead = true; HXR.rooms.clear(); for (const L of HX.loops.values()) L.rm = null; HXRL.length = 0; hxrLog(); }
// every loop to its room (none: hx.fx; a Schleife of Bewegung; gone) – after any loop came, went or changed (hxStripSync)
function hxrSync() {
  if (!A.ctx || !HX.node || HXW.on || !A.masterSum || !A.wowLfo) return;
  const want = !P['hx.fx'], live = new Set();
  for (const L of hxLoopsLive()) {
    if (L.bew || L.state === 'weg') continue;
    live.add(L.id);
    if (want) {
      const v = hxrOf(L), key = hxrKey(v);
      L.roomOn = true; hxSendSync(L);
      const ch = L.sendCh != null ? L.sendCh : -1;
      if (ch < 0) { if (!HXR.warned) { HXR.warned = true; toast('Höchstens ' + HX_SENDS + ' Schleifen haben ihren eigenen Raum – die übrigen klingen ohne Hall und Echo.', 5000); } continue; }
      if (L.rm && (L.rm.key !== key || L.rm.ch !== ch || L.rm.ctx !== A.ctx)) hxrUnlink(L);
      if (!L.rm) {
        let U = HXR.rooms.get(key); if (!U || U.ctx !== A.ctx || U.dead) { U = hxrUnit(v); HXR.rooms.set(key, U); }
        const sp = hxSplit(), mg = A.ctx.createChannelMerger(2);
        sp.connect(mg, 2 * ch, 0); sp.connect(mg, 2 * ch + 1, 1); mg.connect(U.inp);
        U.n++; U.idle = 0; L.rm = { mg, key, ch, ctx: A.ctx, U };
      }
    } else { if (L.rm) hxrUnlink(L); if (L.roomOn) { L.roomOn = false; hxSendSync(L); } }
  }
  for (const L of HX.loops.values()) if (L.rm && !live.has(L.id)) { hxrUnlink(L); L.roomOn = false; }
  // a room nobody plays into rings out, then goes
  for (const [k, U] of HXR.rooms) if (U.n <= 0 && !U.idle) { U.idle = 1; setTimeout(() => { if (U.n <= 0 && HXR.rooms.get(k) === U) { U.dead = true; HXR.rooms.delete(k); try { U.dlyRet.disconnect(); U.revRet.disconnect(); A.wowLfo.disconnect(U.wowG); A.flutLfo.disconnect(U.flutG); } catch (e) {} } }, 15000); }
  if (typeof updSends === 'function') updSends();
}
function hxrUnlink(L) { const r = L.rm; L.rm = null; if (!r) return; try { r.mg.disconnect(); } catch (e) {} if (r.U) r.U.n--; }
// the field's tempo (a synced echo), the level's channels (the hall's IR) – every room again; and the log
function hxrAll() { hxrLog(); for (const U of HXR.rooms.values()) hxrApply(U, false); }
// (owner, 27.10.2026: „ein Schalter, der die Effekte für Schleifen aktiviert oder deaktiviert … wenn die Schleifen erst
// einmal stehen, darf kein Effekt mehr darauf wirken, außer der User möchte das“) the switch for the whole Leiste: on –
// every Schleife plays dry through the live chain (its folgt, from its next seam) into the field's echo and hall; off –
// each its baked version (the chain as it was played) into its own room. One switch, never twice: a loop that follows is
// never also baked. A new Schleife takes it (ernten.js).
function hxFxSet(on) {
  for (const L of hxLoopsLive()) if (!L.bew && !!L.folgt !== !!on) hxFolgt(L, !!on, true);
  hxrSync(); hxSay(on ? 'Schleifen: Effekte des Presets wirken (live)' : 'Schleifen: klingen wie aufgenommen'); hxCardDirty();
}
