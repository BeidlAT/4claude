// ---- Spielverzögerung (SPEC §2): „Klopf mit“ – eight taps to a click; the median of tap − click on the audio clock is
// how much later than the beat you hear your playing reaches the Humus (output latency + your touch). Stored per device;
// a loop harvested against a running grid (the Puls, a device's clock) reads its window that much later, so it sits
// where you meant to play (its phase shows it). Never applied to the audio relation itself. ----
const HX_KLOPF = 8, HX_KLOPF_BPM = 100;
const hxLat = () => { const v = +hxDev().lat; return Number.isFinite(v) ? clamp(v, 0, 0.4) : 0; };
function hxKlopfStart() {
  if (!A.started || !A.ctx) return;
  const beat = 60 / HX_KLOPF_BPM, t0 = Math.ceil((A.ctx.currentTime + 0.6) / beat) * beat, clicks = [];
  for (let i = 0; i < HX_KLOPF + 4; i++) { const t = t0 + i * beat; clicks.push(t); hxClickAt(t, i % 4 === 0); }
  HX.klopf = { clicks, taps: [], end: t0 + (HX_KLOPF + 4) * beat + 0.3 };
  hxSay('Klopf mit: tippe auf jeden Klick'); hxCardDirty();
}
// a tap of „Klopf mit“ (press-acting): its time on the audio clock, against the nearest click
function hxKlopfTap(e) {
  const K = HX.klopf; if (!K || !A.ctx) return;
  let t = A.ctx.currentTime;
  if (e && e.timeStamp > 0 && A.ctxOff != null) { const te = ctxAt(e.timeStamp); if (te <= t + 0.005 && te > t - 0.5) t = te; }
  const c = K.clicks.reduce((b, x) => (Math.abs(t - x - 0.1) < Math.abs(t - b - 0.1) ? x : b), K.clicks[0]);
  if (t - c > -0.15 && t - c < 0.45) K.taps.push(t - c);
  if (K.taps.length >= HX_KLOPF) hxKlopfDone();
  else hxCardDirty();
}
function hxKlopfDone() {
  const K = HX.klopf; HX.klopf = null;
  if (!K || K.taps.length < HX_KLOPF / 2) { hxSay('Klopf mit: zu wenige Tipper – noch einmal'); toast('Zu wenige Tipper – versuch es noch einmal.', 2500); hxCardDirty(); return; }
  const s = K.taps.slice().sort((a, b) => a - b), med = s[s.length >> 1], lat = clamp(Math.round(med * 1000) / 1000, 0, 0.4);
  hxDev('lat', lat);
  hxSay('Spielverzögerung ' + Math.round(lat * 1000) + ' ms'); toast('Spielverzögerung: ' + Math.round(lat * 1000) + ' ms – Schleifen zum Puls sitzen jetzt, wo du spielen wolltest.', 4000);
  hxCardDirty();
}

// ---- count-in and click (SPEC §6.3): hx.ein – how a waiting recording counts in (aus · sicht: the big number · vib: a
// buzz on each beat, where the device can · ton: a click); hx.klick – aus · zaehl: while counting in · ein: on every
// beat while a Takt runs. The click sounds on a path no tap hears: into the monitor after the master, past both Humus
// rings and the recorder. ----
function hxClickAt(t, one) {
  if (!A.ctx || !A.monSt) return;
  const o = A.ctx.createOscillator(), g = A.ctx.createGain(), f = one ? 2093 : 1568;
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(one ? 0.22 : 0.14, t + 0.0015); g.gain.setTargetAtTime(0, t + 0.0015, 0.012);
  o.connect(g).connect(A.monSt);
  o.start(t); o.stop(t + 0.09);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
}
function hxClickTick(now, horizon) {
  const R = HX.rec, counting = R && R.phase === 'wait' && R.b0 != null, ein = P['hx.ein'], kl = P['hx.klick'];
  const want = (counting && (ein === 'ton' || kl === 'zaehl' || kl === 'ein')) || (kl === 'ein' && hxGrid());
  if (!want) { HX.clickB = null; return; }
  const b0 = Math.ceil(tgBeat(now + 0.01) - 1e-9), b1 = tgBeat(horizon);
  for (let b = Math.max(b0, HX.clickB != null ? HX.clickB + 1 : b0); b <= b1; b++) {
    HX.clickB = b;
    if (!(kl === 'ein' && hxGrid()) && !(counting && b < R.b0)) continue;
    hxClickAt(tgTime(b), ((b % 4) + 4) % 4 === 0);
  }
}
// the buzz of a counted beat, when it is heard (Android; a phone without it shows the number)
function hxVibTick(now) {
  const R = HX.rec;
  if (!R || R.phase !== 'wait' || R.b0 == null || P['hx.ein'] !== 'vib' || !navigator.vibrate) return;
  const lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), b = Math.ceil(tgBeat(now + lat) - 1e-9);
  if (b >= R.b0 || b === HX.vibB) return;
  const t = tgTime(b) + lat - now;
  if (t > 0.06) return;
  HX.vibB = b;
  setTimeout(() => { try { navigator.vibrate(((b % 4) + 4) % 4 === 0 ? 45 : 25); } catch (e) {} }, Math.max(0, t * 1000));
}

/* ---- Step 1d: the form (SPEC §13 – Lichtungen, the form button, Kern, Lücke, Schluss; Schlafen and Wenden), the
   controls (§17 – targets, pedals, keys, the nanoKONTROL2 page, the nanoKEY pads), the Fährte's retirement (§18 – its
   loop is a Schleife of Bewegung), Nähren (§15 – Gespinst, Körner), Auslese (§12.1c), the guard and „eine Runde“
   (§6.4). Form is performance: no history step – what switches goes to the processor as frames of its moment at once
   (exact), pending until then, visible and cancellable. ---- */

// ---- the guard (SPEC §6.4): no Eigensinn or Gärtner change in a loop during the three passes after a Schicht was
// added – the hook (Eigensinn above Treu comes with Wuchs, Etappe 2a; a change asked meanwhile waits for the guard) ----
const HX_EIG = ['treu', 'lebendig', 'variieren', 'wandern'], HX_EIGW = { treu: 'Treu', lebendig: 'Lebendig', variieren: 'Variieren', wandern: 'Wandern' };   // (step 2a: Treu, Lebendig; Etappe 3: Variieren and Wandern – their notes change, §12.2)
const hxGuardOk = (L) => !(L.guardK != null && !(L.k >= L.guardK));
function hxGuardSet(L, k) { if (Number.isFinite(k)) L.guardK = Math.max(L.guardK != null ? L.guardK : -Infinity, k + 3); }
function hxEigSet(L, e) {
  if (!HX_EIG.includes(e) || e === (L.eig || 'treu')) { L.eigWant = null; return true; }
  if (!hxGuardOk(L)) { L.eigWant = e; return false; }
  L.eig = e; L.eigWant = null; hxSaveMeta(L.id); hxCardDirty();
  if (HX_EIG.indexOf(e) >= 1 && !hxWCanLive(L)) { L.wRefused = true; L.wRetry = performance.now() + 4000; }   // (step 2a: the device cannot keep it living now)
  hxWUpdate(L);   // (step 2a: above Treu it grows)
  return true;
}
function hxGuardTick() { for (const L of hxLoopsLive()) if (L.eigWant && hxGuardOk(L)) hxEigSet(L, L.eigWant); }

