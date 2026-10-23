/* ---------- Hexenring ---------- */
// The looper (dev/looper/SPEC.md, binding; KONZEPT.md for the owner). Step 1a, the engine core: the Taktgeber, the
// processor myzel-ring (its code inside myzelDsp), the taps and the strip „Hexenring“, the Humus of notes and of
// Bewegung, and the calls the next steps build on (hxGrab, hxLoopNew, hxSchichtAdd, hxState, hxGain, hxUndo, hxClear,
// hxRate, hxTempo). No UI yet.

// ---- Taktgeber (SPEC §2): one beat map that never jumps ----
// Segments {t, b, bpm}: audio time, continuous beat, exact tempo. A change appends a segment at a time not before now
// (TG_LEAD ahead: what is scheduled stays where it is, and the processor hears of it before its frame) – only the
// slope changes, the beat runs on. The musical beat (bar lines at its multiples of 4) is the continuous one minus the
// origin o: a fresh Puls start with no Schleife, or a device's Start, moves o – bar lines may move, no counted beat jumps.
const TG_LEAD = 0.03;
const TG = { seg: [{ t: 0, b: 0, bpm: 84 }], o: 0, ver: 0, want: 84, hx: 0, hxOn: false, keep: false, anc: { t: 0, b: 0 } };
Object.defineProperty(TG, 'src', { get: () => (SEQ.ext ? 'ext' : TG.hxOn ? 'hx' : 'seq') });   // who leads: a device, a Schleife, the slider
const tgNow = () => (A.ctx ? A.ctx.currentTime : 0);
function tgIdx(t) {
  const s = TG.seg; let hi = s.length - 1;
  if (t >= s[hi].t) return hi;
  let lo = 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t <= t) lo = m; else hi = m - 1; }
  return lo;
}
const tgCb = (t) => { const s = TG.seg[tgIdx(t)]; return s.b + ((t - s.t) * s.bpm) / 60; };
function tgCt(b) {
  const s = TG.seg; let lo = 0, hi = s.length - 1;
  if (b >= s[hi].b) lo = hi; else while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].b <= b) lo = m; else hi = m - 1; }
  return s[lo].t + ((b - s[lo].b) * 60) / s[lo].bpm;
}
const tgBeat = (t) => tgCb(t) - TG.o, tgTime = (b) => tgCt(b + TG.o);
const tgBpm = (t) => TG.seg[tgIdx(t)].bpm;
const tgBar = (t) => tgTime(Math.ceil(tgBeat(t) / 4 - 1e-9) * 4);   // the first bar line at or after t
function tgReset() { const v = seqBpm(); TG.seg = [{ t: 0, b: 0, bpm: v }]; TG.o = 0; TG.want = v; TG.anc = { t: 0, b: 0 }; TG.ver++; }
// a new slope from time t (the segments after t give way); the past stays as it was played
function tgAdd(t, bpm) {
  const s = TG.seg, b = tgCb(t);
  while (s.length > 1 && s[s.length - 1].t >= t) s.pop();
  if (s[s.length - 1].t >= t) s[s.length - 1] = { t, b, bpm }; else s.push({ t, b, bpm });
  const old = tgNow() - 300; let k = 0;   // five minutes of history (the Humus reads two)
  while (k < s.length - 2 && s[k + 1].t < old) k++;
  if (k) s.splice(0, k);
  TG.ver++; TG.anc = { t, b: b - TG.o };
  hxSeg(s.length - 1);
}
function tgRetempo(bpm, at) {
  TG.want = bpm;
  if (!A.ctx) { TG.seg = [{ t: 0, b: 0, bpm }]; TG.ver++; return; }
  const now = A.ctx.currentTime;
  tgAdd(Math.max(now, at != null ? at : now + TG_LEAD), bpm);
}
// a new origin: musical beat b0 sounds at t0 (a Puls start, a device's Start or Continue); returns the shift of the count
function tgRebase(b0, t0) { const o = TG.o; TG.o = tgCb(t0) - b0; TG.ver++; TG.anc = { t: t0, b: b0 }; return TG.o - o; }
// MIDI clock: the device says its beat bA sounded at tA at its tempo – the Taktgeber slews toward it from a moment ahead
// (never re-anchored at a past pulse: the beat never jumps, a loop's next start moves smoothly). Small errors (the
// lock's own wander) over at least a beat; a large one – after the audio clock stalled, the device's beat moved by the
// stall in audio time – within ¼ beat (as fast as the slope allows: ≥ 50 ms, never below 40 % of the tempo), so the
// Puls stays with the device; a Takt Schleife's next seam then comes that much earlier or later, joined by its crossfade
function tgFollow(tA, bA, bpm, moved) {
  const t1 = A.ctx.currentTime + TG_LEAD, e = bA + ((t1 - tA) * bpm) / 60 - tgBeat(t1), es = (e * 60) / bpm;   // the error at t1 (beats, s)
  if (Math.abs(es) < 0.001) { if (Math.abs(bpm - TG.want) >= 0.01) tgRetempo(bpm); return; }   // within a millisecond (the loop's own noise): the tempo only
  // (moved: the audio↔performance mapping changed since the last pulse – our clock stalled, not the device: fast too,
  // once the error is more than the pulses' own jitter – below 3 ms it slews as any small error)
  const fast = Math.abs(es) > 0.015 || (moved && Math.abs(es) > 0.003);
  const T = fast ? Math.min(15 / bpm, Math.max(0.05, Math.abs(es) / 0.6)) : Math.max(60 / bpm, 10 * Math.abs(es));   // (≤ ¼ beat for a stall; else ≥ 1 beat, the slope at most ±10 %)
  TG.want = bpm;
  tgAdd(t1, bpm + (60 * e) / T);
  tgAdd(t1 + T, bpm);
}
// the Puls's clock is the Taktgeber's: SEQ.anchorT/anchorB name its last re-anchoring (a start, a tempo change),
// SEQ.bpm its tempo (a device's while it leads; a slew's slope is not the tempo); a direct write (older code, tests)
// re-anchors the whole map there, as it used to
function tgLegacy(o) {
  const a = Object.assign({ t: TG.anc.t, b: TG.anc.b, bpm: TG.want }, o);
  TG.seg = [{ t: a.t, b: a.b, bpm: a.bpm }]; TG.o = 0; TG.anc = { t: a.t, b: a.b }; TG.want = a.bpm; TG.ver++;
  hxSeg(0, true);
}
Object.defineProperties(SEQ, {
  anchorT: { get: () => TG.anc.t, set: (v) => tgLegacy({ t: v }), configurable: true },
  anchorB: { get: () => TG.anc.b, set: (v) => tgLegacy({ b: v }), configurable: true },
  bpm: { get: () => (SEQ.ext ? SEQ.ext.bpm : TG.want), set: (v) => tgLegacy({ bpm: v }), configurable: true },
});
// a Schleife gives the tempo (fractional; the slider shows it with one decimal, the patch keeps its own); released
// when the last Schleife goes, unless „Tempo behalten“
function hxTempo(bpm) {
  TG.hxOn = true; TG.hx = clamp(+bpm, 20, 300);
  if (!SEQ.ext) tgRetempo(TG.hx);
  for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null);
  updDelay();
  if (typeof hxWTempo === 'function') hxWTempo();   // (step 2a: loops with notes follow)
}
function hxTempoFree() {
  if (!TG.hxOn || TG.keep) return;
  TG.hxOn = false; seqRetempo(); updDelay();
  for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null);
}

