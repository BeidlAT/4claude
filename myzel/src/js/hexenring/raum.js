// ---- (owner, 27.10.2026: „der Inhalt der Schleife muss unbedingt immer 1:1 original bleiben – keinerlei Veränderung beim
// Preset-Wechsel, außer man stellt es bewusst ein“) the Raum der Schleifen: the Hexenring channel's echo and hall are its
// own – a copy of the echo (the same tape: ping-pong, tone, saturation, wow and flutter) and of the hall (its own IR),
// with the settings of when the Leiste's first Schleife was made (HXR.v; kept on the device and in a Kreis). A preset
// changes the field's echo and hall, never these. „Effekte des Presets wirken auf die Schleifen“ (hx.fx) sends the
// channel to the field's as before, and every loop dry through the live chain (hxFxSet). Their returns go straight into the sum – the console's echo and hall returns are
// the preset's (their levels, their sends) – and the echo feeds the loops' hall, as the field's echo feeds the field's. ----
const HXR_IDS = ['dly.sync', 'dly.div', 'dly.ms', 'dly.fb', 'dly.pp', 'dly.tone', 'dly.wow', 'dly.mix', 'rev.size', 'rev.damp', 'rev.pre', 'rev.mix', 'rev.raum'];
const HXR = { v: null, u: null, job: 0, nch: 0, act: null };
const hxrV = (id) => (HXR.v && HXR.v[id] != null ? HXR.v[id] : P[id]);
(() => { try { const v = JSON.parse(localStorage.getItem('myzel.hxRaum') || 'null'); if (v && typeof v === 'object') HXR.v = v; } catch (e) {} })();
function hxrSave() { try { localStorage.setItem('myzel.hxRaum', JSON.stringify(HXR.v)); } catch (e) {} }
// the room as the field has it now becomes the loops' room (the Leiste's first Schleife; „jetzt übernehmen“)
function hxrTake() { const o = {}; for (const id of HXR_IDS) o[id] = P[id]; HXR.v = o; hxrSave(); hxrApply(true); }
function hxrSet(v) { if (!v) return; HXR.v = Object.assign({}, v); hxrSave(); hxrApply(true); }
// built with the graph (initAudio); never in the Werk-Rahmen (it renders without echo and hall)
function hxrBuild() {
  if (HXW.on || !A.ctx) return;
  const ctx = A.ctx, U = { ctx };
  U.dlySend = G(0); U.dlyIn = G(1); U.dlySend.connect(U.dlyIn);
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
  U.wowG = G(0); U.flutG = G(0); A.wowLfo.connect(U.wowG); A.flutLfo.connect(U.flutG);   // (the tape's own LFOs, as the field's echo)
  for (const g of [U.wowG, U.flutG]) { g.connect(U.dL.delayTime); g.connect(U.dR.delayTime); }
  U.revSend = G(0); U.revIn = G(1); U.revPre = ctx.createDelay(1); U.revRet = G(1.25);
  U.revSend.connect(U.revIn); U.revIn.connect(U.revPre); U.revRet.connect(A.masterSum);
  U.dlyToRev = G(0.3); U.dlyRet.connect(U.dlyToRev).connect(U.revIn);   // (the echo into the hall, as the echo return's Hall send at 100 %)
  HXR.u = U; HXR.nch = 0; HXR.act = null; HXR.key = null;
  hxrApply(true);
}
// the settings onto the copy; the IR again when the hall's own settings (or the level's channels) changed
function hxrApply(ir, noSends) {
  const U = HXR.u; if (!U || U.ctx !== A.ctx) return;
  const sync = hxrV('dly.sync'), t = clamp(sync ? divBeats(hxrV('dly.div')) * 60 / seqBpm() : hxrV('dly.ms') / 1000, 0.01, 3.9);
  setP(U.dL.delayTime, t, 0.09); setP(U.dR.delayTime, t, 0.09);
  const pp = hxrV('dly.pp'), fb = hxrV('dly.fb');
  setP(U.dStrL.gain, fb * (1 - pp)); setP(U.dCrsL.gain, fb * pp); setP(U.dStrR.gain, fb * (1 - pp)); setP(U.dCrsR.gain, fb * pp);
  setP(U.dInR.gain, 1 - pp); setP(U.dInRL.gain, pp);
  setP(U.dToneL.frequency, hxrV('dly.tone')); setP(U.dToneR.frequency, hxrV('dly.tone'));
  setP(U.wowG.gain, hxrV('dly.wow') * 0.004); setP(U.flutG.gain, hxrV('dly.wow') * 0.0006);
  setP(U.dlySend.gain, hxrV('dly.mix'));
  setP(U.revSend.gain, hxrV('rev.mix')); setP(U.revPre.delayTime, hxrV('rev.pre'), 0.05);
  const nch = Q.rich ? 4 : 2, key = [hxrV('rev.size'), hxrV('rev.damp'), hxrV('rev.raum'), nch].join('|');
  if ((ir || HXR.nch !== nch) && HXR.key !== key) hxrIR(nch, key);
  if (!noSends && typeof updSends === 'function') updSends();
}
function hxrIR(nch, key) {
  const U = HXR.u; if (!U) return;
  const job = ++HXR.job; HXR.nch = nch; HXR.key = key;
  dspJob('ir', [hxrV('rev.size'), hxrV('rev.damp'), SR, nch, hxrV('rev.raum')]).then((ch) => {
    if (job !== HXR.job || HXR.u !== U || !A.ctx || U.ctx !== A.ctx) return;
    const conv = A.ctx.createConvolver(); conv.buffer = toBuffer(ch);
    const g = G(0), t = A.ctx.currentTime;
    U.revPre.connect(conv).connect(g).connect(U.revRet);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(nch === 4 ? IR4_GAIN : 1, t + 0.25);
    const old = HXR.act;
    if (old) { holdParam(old.g.gain, t); old.g.gain.linearRampToValueAtTime(0, t + 0.25); setTimeout(() => { try { U.revPre.disconnect(old.conv); old.conv.disconnect(); old.g.disconnect(); } catch (e) {} }, 600); }
    HXR.act = { conv, g };
  });
}
// where the Hexenring channel's sends go: its own room (or, „folgt dem Preset“, the field's)
const hxrTarget = (fx) => (!P['hx.fx'] && HXR.u && HXR.u.ctx === A.ctx ? (fx === 'dly' ? HXR.u.dlySend : HXR.u.revSend) : null);
// (owner, 27.10.2026: „ein Schalter, der die Effekte für Schleifen aktiviert oder deaktiviert … wenn die Schleifen erst
// einmal stehen, darf kein Effekt mehr darauf wirken, außer der User möchte das“) the switch for the whole Leiste: on –
// every Schleife plays dry through the live chain (its folgt, from its next seam) into the field's echo and hall; off –
// each its baked version (the chain as it was played) into its own room. One switch, never twice: a loop that follows is
// never also baked. A new Schleife takes it (ernten.js).
function hxFxSet(on) {
  for (const L of hxLoopsLive()) if (!L.bew && !!L.folgt !== !!on) hxFolgt(L, !!on, true);
  updSends(); hxSay(on ? 'Schleifen: Effekte des Presets wirken (live)' : 'Schleifen: klingen wie aufgenommen'); hxCardDirty();
}
