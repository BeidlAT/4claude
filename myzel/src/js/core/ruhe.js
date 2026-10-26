/* ---------- Ruhe: the graph unplugged while nothing sounds ---------- */
// Chromium skips the work of a node whose inputs are silent – but a cycle (the echo's ping-pong) and a worklet's output
// (the Hexenring's processor) never are, so everything after them ran on at idle: the echo, its strip, the hall, the
// master, and the shared LFOs' work on every filter and delay they move – most of the audio thread's load with nothing
// playing (measured: dev/tests/perf). Once no source has sounded for a while and the echo's loop, the hall's input and
// the master's input have been exactly zero long enough for every state after them to be exactly zero, their links are
// taken out: the parts after them stop, frozen at zero, as Chromium freezes any node whose input stays silent. Every
// sound plugs them in again before it starts (idleWake: a voice, the Bordun, a new Schleife), so the next note meets the
// zero states it would have met anyway – the same samples. What must not stop keeps running: the shared LFOs (their
// phases – the Hexenring's bake follows them), the Gespinst's web and the Hexenring's processor are pulled by a keeper
// (a silent gain whose gain they feed); the processor records the silence; the compressor's detector decays as before
// (its mono mix is never silent).
// Two parts keep running, because a pause would move where their rounding falls: the echo – a delay whose time moves
// (Leiern) reads between its samples at a position Chromium computes in single precision from its own write count,
// so after a pause the same echo comes out up to −57 dB different, sample for sample – and the hall – a convolver works
// in blocks of up to 16384 frames, their borders where its own count puts them (−99 dB; exactly 0 after a pause of whole
// blocks). Both are pulled by the keeper; the hall is fed the zeros it was fed before (the echo's return used to send
// them). Live, these grids already fall wherever the session's start and the notes' moments put them – playing a
// phrase 1 ms later moves them the same way – but a render of the same notes could tell: so they sleep only as the
// owner says (20.10.2026): the hall sleeps (IDLE.hall – of 26 % of a core at idle on the desktop it saves 13 points,
// in the Android emulation 21 → 8 %; after a pause its tail differs by −99 … −103 dB), the echo runs on (IDLE.echo –
// 2 points more, but up to −57 dB with Leiern; dev/tests/perf).
const IDLE = { on: false, ctx: null, keeper: null, feed: null, taps: null, tapOn: false, tapT: 0, autoT: 0, cut: [], qT: 0, z: null, pT: -1, auto: false, late: 0, n: 0, echo: false, hall: true };
const IDLE_FFT = 4096;
// Hexenring (phone report 22.10.2026): the copy of the live chain on the processor's out 1 rests while nothing plays
// through it (hxF1Tick); p: its params – a move of one of them puts it back first (the hook below), autoT: when the
// last such move ends
let hxF1On = false;   // (true while such a copy exists: the hook's one check otherwise)
const HXF1 = { c: null, off: false, p: new Set(), autoT: 0, useT: 0, taps: null, tapOn: false, tapT: 0, z: null, pT: -1, n: 0 };
// A param keeps its time only where the render pulls it: Chromium moves a setTarget or a ramp one sample after the other
// while its node is processed, and a node taken out of the render holds where it stood (measured: a knob turned in a
// silence would only start to glide when the next note woke the graph). So every automation wakes the graph first,
// and the graph falls asleep only after the last scheduled move has ended (IDLE.autoT; a setTarget reaches its target
// exactly after 10 time constants, Chromium snaps it there). Any param's: it costs a comparison.
(function idleHook() {
  if (typeof AudioParam === 'undefined') return;
  // (each wrapper with the method's own arguments – no rest array, no apply: the mod layer calls these dozens of times a
  // frame; measured 4× throttled, a call 2.71 µs through the generic wrapper, 2.27 µs through these, 2.2–2.5 bare)
  const P = AudioParam.prototype, end = (t, p) => { if (IDLE.on) idleWake(); if (t > IDLE.autoT) IDLE.autoT = t; if (hxF1On && HXF1.p.has(p)) { if (t > HXF1.autoT) HXF1.autoT = t; if (HXF1.off) hxF1Wake(); } };
  const has = (k) => typeof P[k] === 'function';
  if (has('setValueAtTime')) { const f = P.setValueAtTime; P.setValueAtTime = function (v, t) { end(+t || 0, this); return f.call(this, v, t); }; }
  if (has('linearRampToValueAtTime')) { const f = P.linearRampToValueAtTime; P.linearRampToValueAtTime = function (v, t) { end(+t || 0, this); return f.call(this, v, t); }; }
  if (has('exponentialRampToValueAtTime')) { const f = P.exponentialRampToValueAtTime; P.exponentialRampToValueAtTime = function (v, t) { end(+t || 0, this); return f.call(this, v, t); }; }
  if (has('setTargetAtTime')) { const f = P.setTargetAtTime; P.setTargetAtTime = function (v, t, c) { end((+t || 0) + 10 * (+c || 0) + 0.02, this); return f.call(this, v, t, c); }; }
  if (has('setValueCurveAtTime')) { const f = P.setValueCurveAtTime; P.setValueCurveAtTime = function (v, t, d) { end((+t || 0) + (+d || 0), this); return f.call(this, v, t, d); }; }
  if (has('cancelScheduledValues')) { const f = P.cancelScheduledValues; P.cancelScheduledValues = function (t) { end(+t || 0, this); return f.call(this, t); }; }
  if (has('cancelAndHoldAtTime')) { const f = P.cancelAndHoldAtTime; P.cancelAndHoldAtTime = function (t) { end(+t || 0, this); return f.call(this, t); }; }
  const d = Object.getOwnPropertyDescriptor(P, 'value');
  if (d && d.set) Object.defineProperty(P, 'value', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { end(0, this); d.set.call(this, v); } });
})();
function idleBuild() {
  const ctx = A.ctx;
  // (25.10.2026) not in Firefox: Ruhe rests on Chromium's rules, measured there (what a silent node does, how a link taken
  // out comes back); in Firefox the owner's keyboard once fell silent after a long session (MIDI arrived, no sound, until
  // the browser restarted) – the graph stays plugged in there: the same sound, only more work in the pauses
  Object.assign(IDLE, { on: false, ctx, cut: [], qT: ctx.currentTime, z: null, pT: -1, auto: hxLive() && !FIREFOX, tapOn: false, autoT: 0 });
  IDLE.keeper = G(0); IDLE.keeper.connect(ctx.destination);
  for (const o of [A.rngOsc, A.fltLfo, A.phaLfo, A.choL1, A.choL2, A.panLfo, A.wowLfo, A.flutLfo]) o.connect(IDLE.keeper.gain);
  A.revRet.connect(IDLE.keeper.gain); A.dlyRet.connect(IDLE.keeper.gain);   // (the hall and the echo: pulled while the master sleeps)
  // zeros that are not silence: a constant source at 0 whose offset has an input computes them every quantum – in two
  // channels, as the hall's input always had (a convolver fed one channel works another way)
  // (each node held: one that nothing references and nothing feeds is switched off by the browser)
  const cs = (IDLE.cs = ctx.createConstantSource()); cs.offset.value = 0; IDLE.csIn = G(0); IDLE.csIn.connect(cs.offset); cs.start();
  IDLE.feed = G(1); IDLE.feed.channelCount = 2; IDLE.feed.channelCountMode = 'explicit'; IDLE.feed.channelInterpretation = 'speakers'; cs.connect(IDLE.feed);
  // the taps: the echo's loop (both delay inputs: everything it holds passes them), the hall's input, the master's input –
  // each channel apart (a downmix could cancel to zero); plugged in only for the quiet after the last sound (idleTaps)
  const an = () => { const a = ctx.createAnalyser(); a.fftSize = IDLE_FFT; return a; };
  const two = (src) => { const s = ctx.createChannelSplitter(2), L = an(), R = an(); s.connect(L, 0); s.connect(R, 1); return [s, L, R]; };
  const e0 = an(), e1 = an(), [sR, r0, r1] = two(A.revIn), [sM, m0, m1] = two(A.masterIn);
  const links = [[A.dSumL, e0], [A.dSumR, e1], [A.revIn, sR], [A.masterIn, sM]];
  IDLE.taps = { links, g: [[e0, e1], [r0, r1], [m0, m1]], buf: new Float32Array(IDLE_FFT) };
}
// what can sound: a voice, a held finger, the Bordun, a frozen echo, the Puls, the rain, a Schleife, a web that rings
// (Leistung, 23.10.2026: a Schleife that is halted or muted sounds no more – a loop played again wakes the graph first,
// hxPost with a state „spielt“; its stop's Ausklang still ringing keeps the taps from seeing zeros)
const idleSrc = () => !!(A.voices.size || A.grainVoices.size || touches.size || A.bor || A.frozen || SEQ.on || rgSounds() || hxSounds() || HXN.webs.size || (HXN.feed && HXN.feed.size) || HX.ws || (typeof preview !== 'undefined' && preview) || (typeof HXE !== 'undefined' && !!HXE.pv) ||
  (A.gsp && A.gsp.active) || RHZ.vs.size || RHZ.q.length || (A.revWant && !A.revActive));
// the taps hear only the quiet after the last sound: while a source sounds nothing is counted, so they rest then (and
// while the graph sleeps); plugged in, they are read once they hold a whole window of what came since
function idleTaps(on) {
  if (!IDLE.taps || IDLE.tapOn === on) return;
  IDLE.tapOn = on;
  for (const [a, b] of IDLE.taps.links) { try { if (on) a.connect(b); else a.disconnect(b); } catch (e) {} }
  if (on) { IDLE.tapT = A.ctx.currentTime; IDLE.z = null; }
}
// since when each tap group has been exactly zero (null: it is not); a gap between two reads longer than a read's
// window starts the count again
function idlePoll(now) {
  const T = IDLE.taps, b = T.buf, gap = now - IDLE.pT > (IDLE_FFT - 256) / SR;
  IDLE.pT = now;
  if (!IDLE.z) IDLE.z = [null, null, null];
  for (let i = 0; i < 3; i++) {
    let zero = true;
    for (const a of T.g[i]) { a.getFloatTimeDomainData(b); for (let k = 0; k < b.length; k++) if (b[k] !== 0) { zero = false; break; } if (!zero) break; }
    if (!zero) IDLE.z[i] = null;
    else if (IDLE.z[i] == null || gap) IDLE.z[i] = now - IDLE_FFT / SR;
  }
}
// (in tick(), live only; an offline render's test drives it at its suspends: force)
function idleTick(force) {
  if (!IDLE.taps || IDLE.ctx !== A.ctx || !(IDLE.auto || force)) return;
  const now = A.ctx.currentTime;
  // the Hexenring's processor without a Schleife (or a web of one) for 20 s: its way to the master, zeros, is closed –
  // its strip and its sends rest then even while other sound plays, where they may (whatever its strip's filters held
  // has died away; hxGates); a new Schleife opens it (hxPost)
  if (HX.g0 && HX.ctx === A.ctx) { if (hxSounds() || HXN.webs.size || (HXN.feed && HXN.feed.size) || hxAntOn() || IDLE.hxT == null) IDLE.hxT = now; else if (!IDLE.hxOff && now - IDLE.hxT >= 20) hxGates(false); }
  if (idleSrc() || now < IDLE.autoT) { IDLE.qT = now; IDLE.z = null; idleTaps(false); if (IDLE.on) idleWake(!!(A.voices.size || A.bor || hxSounds())); return; }   // (those wake it themselves: late)
  if (IDLE.on) return;
  idleTaps(true);
  if (now - IDLE.tapT < (IDLE_FFT + 256) / SR) return;
  idlePoll(now);
  // the loop's delays hold 4 s; the hall's input its whole impulse response (and its pre-delay) back, so that the strip
  // after it has had zeros; the master's filters and the detector's fast path decay within a second or two (a muted
  // strip's own filters, which the master never hears: 3 s since the last source)
  const z = IDLE.z, ok = (i, s) => z[i] != null && now - z[i] >= s, ir = A.revActive && A.revActive.conv.buffer ? A.revActive.conv.buffer.duration : 0;
  if (now - IDLE.qT >= 3 && ok(0, 6) && ok(1, ir + 3) && ok(2, 3)) idleEnter();
}
// the links taken out carry only what a voice or the Bordun plays – each made after its wake, in the same order, so
// the render meets them back no later than the sound (the echo's return even has its delay to spare); the Hexenring's
// processor plays on a message of its own, which the render may act on before it meets a link put back: its way is
// closed by gates (gains: a value, no link), its links stay
function idleEnter() {
  const cut = [], off = (a, b, ...x) => { try { a.disconnect(b, ...x); cut.push([a, b, ...x]); } catch (e) {} };
  off(A.masterSum, A.masterIn);   // the master's input: everything but the Hexenring's strip
  off(A.dlyRet, MIX.s.dly.in);   // the echo's return: its strip rests (the keeper pulls the loop – IDLE.echo: not even that)
  if (IDLE.echo) off(A.dlyRet, IDLE.keeper.gain);
  off(A.dlySend, A.dlyIn);   // and its input: the loop running on pulls nothing before it (the chain, the strips)
  off(A.revSend, A.revIn); off(MIX.s.dly.hS, A.revIn);   // the hall's input: from the feed (IDLE.hall: from nothing)
  if (!IDLE.hall) { IDLE.feed.connect(A.revIn); cut.push([IDLE.feed, A.revIn, 'feed']); } else off(A.revRet, IDLE.keeper.gain);
  if (HX.node && HX.ctx === A.ctx) {   // the processor (no Schleife): its way closed, its Gespielt ring records zeros
    off(A.hxIn0, HX.node, 0, 0);
    if (A.hxIn2) off(A.hxIn2, HX.node, 0, 2);   // (step 2b: the Puls's ring records zeros too)
    hxGates(false);
  }
  idleTaps(false);
  IDLE.cut = cut; IDLE.on = true; IDLE.n++; lmEv('ruhe');
}
// the gates on the Hexenring's way (zeros while no Schleife exists): values, read by the very quantum that plays. At
// the processor's outputs while its strip goes straight to the master and no loop has used out 1 (the strip rests too);
// else at the master's input only (hxGateM): a copy of the chain runs on behind it – its chorus, delays that move,
// would come back with their rounding moved, as the echo's
function hxGates(on) {
  if (IDLE.hxOff === on) lmEv(on ? 'tor-auf' : 'tor-zu');
  IDLE.hxOff = !on;
  const deep = P['xhxr.route'] === 'dir' && !HX.out1;
  for (const g of [HX.g0, HX.g1]) if (g && HX.ctx === A.ctx) g.gain.value = on || !deep ? 1 : 0;
  if (HX.gM && HX.gM.context === A.ctx) HX.gM.gain.value = on ? 1 : 0;
}
// before anything sounds (and before the graph around the cut links changes): every link back, in the order taken
function idleWake(late) {
  if (!IDLE.on) return;
  IDLE.on = false; lmEv('wach');
  for (const [a, b, ...x] of IDLE.cut) { try { if (x[0] === 'feed') a.disconnect(b); else a.connect(b, ...x); } catch (e) {} }
  IDLE.cut = []; IDLE.z = null; IDLE.qT = A.ctx ? A.ctx.currentTime : 0;
  if (late) { IDLE.late++; console.warn('Ruhe: zu spät geweckt'); }
}

