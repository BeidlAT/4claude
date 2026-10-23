/* ---------- MIDI clock: follow a device's tempo and transport, send ours to arpeggiators ---------- */
// Receive: a delay-locked loop (as in Ardour's MIDI clock slave) smooths the 24 pulses per quarter – wide at first to
// lock quickly, then narrow against USB and Bluetooth jitter. The Puls runs on the device's tempo, fractional BPM
// included: SEQ.ext bypasses the whole-number tempo parameter, which keeps its value. Start/Continue begin on the next
// pulse; without pulses for half a second the Puls goes back to its own tempo.
// pend: a Start waiting for its first pulse; late: a Start whose pulse did not come in time (the Puls started anyway)
const CLK = { src: null, n: 0, t0: 0, t1: 0, e2: 0, tr: 0, last: 0, pos: 0, next: 0, run: false, pend: null, late: null, shown: 0, ut: 0, pendT: 0 };
// our own clock coming back through a device (sent to its output, echoed on its input) must never be followed
function clkLoops(src) { for (const o of MIDI.outs.values()) if (o.clock && sameDev(o.name, src.name)) return true; return false; }
function clkPulse(src, t) {
  if (P['midi.clock'] !== 'follow' || clkLoops(src)) return;
  const C = CLK;
  if (C.src !== src) { if (C.src && t - C.last < 500) return; C.src = src; C.n = 0; }   // one device leads at a time
  C.last = t; midiWatchOn();
  // a second pulse stamped like the first (a Bluetooth sender whose clock stands, before that is noticed) holds no
  // tempo: the lock starts afresh with the next one
  if (C.n === 1 && t - C.tr < 1) C.n = 0;
  else {
    if (!C.n) { C.t0 = C.t1 = t; C.e2 = 0; }
    else if (C.n === 1) { C.e2 = clamp(t - C.tr, 2.5, 125); C.t0 = t; C.t1 = t + C.e2; }   // 1000 … 20 BPM
    else {
      const e = t - C.t1;
      if (Math.abs(e) > Math.max(1.5 * C.e2, 25)) { C.e2 = clamp(t - C.tr, 2.5, 125); C.t0 = t; C.t1 = t + C.e2; C.n = 1; }   // a jump: lock again
      else {
        const w = 2 * Math.PI * (C.n < 24 ? 2 : C.n < 96 ? 1 : 0.4) * C.e2 / 1000;   // loop bandwidth 2 → 1 → 0.4 Hz
        C.t0 = C.t1; C.t1 += Math.SQRT2 * w * e + C.e2; C.e2 = clamp(C.e2 + w * w * e, 2.5, 125);
      }
    }
    C.tr = t; C.n++;
  }
  if (C.pend) {   // Start / Continue: this pulse is the downbeat (or the position to go on from)
    C.pos = C.pend.pos; C.pend = null; C.run = true; clearTimeout(C.pendT);
    seqStart(C.pos / 24, ctxAt(C.n > 2 ? C.t0 : t));
    if (A.ctx && A.ctx.state === 'running') seqTick(A.ctx.currentTime + 0.1);
  } else if (C.late) {   // a master that waits a pulse after Start (slow tempos): it is the downbeat after all – lock to it
    const L = C.late;
    C.late = null;
    if (t - L.at < 150 && SEQ.on && !C.run) { C.pos = L.pos; C.run = true; rgRebase(tgRebase(C.pos / 24, ctxAt(t))); }   // (Hexenring: the device owns its downbeat)
  } else if (C.run) C.pos++;
  if (C.n > 2) clkFollow();
}
function clkFollow() {
  const C = CLK, bpm = 60000 / (24 * C.e2);
  if (!SEQ.ext) { SEQ.ext = { bpm, name: C.src.name }; extUI(); } else SEQ.ext.bpm = bpm;
  // Hexenring: the Taktgeber follows – phase-locked by slews into the future over at least a beat (never re-anchored
  // at a past pulse), or the tempo alone while the transport stands
  if (A.ctx) {
    ctxSync();
    const moved = C.offRef != null && Math.abs(A.ctxOff - C.offRef) > 0.25; C.offRef = A.ctxOff;   // (Hexenring: our clock moved, not the device)
    if (SEQ.on && C.run) tgFollow(ctxAt(C.t0), C.pos / 24, bpm, moved); else if (Math.abs(bpm - TG.want) > 0.01) tgRetempo(bpm);
  }
  else tgRetempo(bpm);
  // what reads the tempo seldom (echo time, bar recording, the ring) follows when it changed noticeably
  if (Math.abs(bpm - C.shown) >= 0.1 && !C.ut) C.ut = setTimeout(() => { C.ut = 0; C.shown = SEQ.ext ? SEQ.ext.bpm : 0; updDelay(); barRecue(); }, 250);
}
function clkLost() {
  CLK.src = null; CLK.n = 0; CLK.run = false; CLK.pend = CLK.late = null;
  if (!SEQ.ext) return;
  SEQ.ext = null; extUI();
  seqRetempo(); updDelay();
}
// the tempo slider has no say while a device leads
function extUI() { for (const w of CTLWRAP['seq.bpm'] || []) w.classList.toggle('inactive', !!SEQ.ext); }
function clkStart(src, cont) {
  if (!P['midi.transport']) return;
  if (!A.started) { midiHint(); return; }
  const pos = cont ? CLK.next : 0, loop = clkLoops(src);
  CLK.late = null;
  if (P['midi.clock'] === 'follow' && !loop && (!CLK.src || CLK.src === src)) {
    // start on the next pulse; a device that sends no clock (transport buttons only) starts at once – and if its first
    // pulse comes a little later after all, the Puls locks to it then (CLK.late)
    CLK.pend = { pos }; CLK.run = false;
    clearTimeout(CLK.pendT);
    CLK.pendT = setTimeout(() => { if (CLK.pend) { CLK.pend = null; seqStart(pos / 24); CLK.late = { pos, at: performance.now() }; } }, CLK.src === src ? 150 : 40);
  } else if (!loop || !SEQ.on) seqStart(pos / 24);   // a device we send our clock to: its Start counts while the Puls stands
}
function clkStop() {
  if (!P['midi.transport']) return;
  if (CLK.run) CLK.next = CLK.pos + 1;
  CLK.run = false; CLK.pend = CLK.late = null;
  if (SEQ.on) seqStop();
}
// performance.now() ↔ audio clock: currentTime advances in whole render blocks, so the smallest offset seen in the last
// second (two half-second buckets) is the true one – when that minimum rises, the audio clock really fell behind (an
// underrun). The estimate walks there in small steps – timestamps derived from it must not jump – except after a
// suspended context or a long stall.
function ctxSync() {
  if (!A.ctx) return;
  const now = performance.now(), s = now - A.ctx.currentTime * 1000;
  const W = A.ctxW && A.ctxW.ctx === A.ctx ? A.ctxW : (A.ctxW = { ctx: A.ctx, prev: s, cur: s, t: now });
  if (now - W.t >= 500) { W.prev = W.cur; W.cur = s; W.t = now; } else if (s < W.cur) W.cur = s;
  const floor = Math.min(W.prev, W.cur), d = floor - (A.ctxOff == null ? Infinity : A.ctxOff);
  const dt = W.lw != null ? clamp(now - W.lw, 0, 40) : 0; W.lw = now;
  // (Hexenring step 1b: a stall under 100 ms is walked as well – a receiver of our clock sees no jump; the Taktgeber
  // follows a moving mapping within ¼ beat, see tgFollow)
  if (!(Math.abs(d) < 100)) { if (A.ctxOff != null) A.ctxJump = true; A.ctxOff = floor; }
  else { const k = Math.min(0.4, 0.015 * dt); A.ctxOff += clamp(d, -k, k); }   // walked at ≤ 1.5 % of the time passing
  // and ≤ 0.4 ms a call, however often it is called: a clock pulse's gap moves by well under a USB MIDI frame (per call
  // it was up to 1 ms, two calls between two pulses: 2 ms) – a 15-ms stall is walked in a second
}
const perfAt = (t) => t * 1000 + A.ctxOff;
const ctxAt = (ms) => { if (A.ctxOff == null) ctxSync(); return (ms - A.ctxOff) / 1000; };
// Send: the Puls's beat as 24 pulses per quarter to the chosen outputs, Start/Stop with the Puls – the arpeggiators
// of the nanoKEY Studio and microKEY follow it over USB (over Bluetooth KORG ignores clock). Pulses are stamped ahead from
// the audio clock (as far as the Puls looks ahead), so the main thread's timer jitter never reaches them; a pulse that
// is late after a stall still goes – a receiver counts them. While the Puls stands the clock keeps running at its
// tempo, so an arpeggiator follows Myzel's tempo anyway.
// sent: when each transport byte last went out (its echo is ignored)
const CLKO = { k: 0, t: 0, last: 0, sent: {} };
function midiSend(o, bytes, ts) { try { if (ts != null) o.port.send(bytes, ts); else o.port.send(bytes); } catch (e) {} }
function clkOuts() { const a = []; for (const o of MIDI.outs.values()) if (o.clock && o.port) a.push(o); return a; }
function clkOutTick(horizon) {
  const outs = clkOuts();
  if (!outs.length) return;
  // look-ahead: as far as the Puls schedules (0.12–0.35 s, more after stalls) while it runs; 50 ms while it stands –
  // less than the 60 ms seqStart leaves before beat 0, so no pulse of the free-running grid lands after a Start; none
  // while a device leads (its Start comes any moment)
  const now = A.ctx.currentTime, pnow = performance.now(), until = SEQ.on ? Math.max(horizon || 0, now + 0.12) : now + (SEQ.ext ? 0 : 0.05);
  for (let guard = 0; guard < 64; guard++) {
    // (Hexenring: on the Taktgeber's beat, running or standing – a receiver keeps the loops' grid)
    let t = timeAt(CLKO.k / 24);
    // a receiver counts pulses: late ones still go (at once) – only after a gap (a second running, 30 ms standing) or a
    // jump, go on from now
    if (t < now - (SEQ.on ? 1 : 0.03) || (CLKO.last && t <= CLKO.last - 1e-6 && !SEQ.on)) { CLKO.k = Math.ceil(beatAt(Math.max(now, CLKO.last + 1e-4)) * 24 - 1e-6); continue; }
    if (t >= until) break;
    const ts = Math.max(pnow, perfAt(t));
    for (const o of outs) midiSend(o, [0xf8], ts);
    CLKO.last = t;
    CLKO.k++;
  }
}
// the Puls starts: Start (or Song Position + Continue) right before its first pulse
function clkOutStart(b0) {
  CLKO.k = Math.round(b0 * 24);
  const outs = clkOuts();
  if (!outs.length || !A.ctx) return;
  ctxSync();
  const ts = Math.max(performance.now(), perfAt(SEQ.anchorT) - 1), spp = Math.round(b0 * 4), now = performance.now();
  for (const o of outs) {
    if (spp) { midiSend(o, [0xf2, spp & 127, (spp >> 7) & 127], ts); midiSend(o, [0xfb], ts); }
    else midiSend(o, [0xfa], ts);
  }
  if (spp) CLKO.sent[0xf2] = CLKO.sent[0xfb] = now; else CLKO.sent[0xfa] = now;
  clkOutTick();   // the downbeat's pulse right behind it
}
function clkOutStop() {
  const outs = clkOuts();
  if (!outs.length) return;
  for (const o of outs) midiSend(o, [0xfc]);
  CLKO.sent[0xfc] = performance.now();
}
// Which note a key plays. "Skala": every key snaps to the nearest note of the scale, so pitches stay where the keys are
// and nothing sounds out of key. "Weiße Tasten": from the C of the base octave each white key is the next column of the
// field, a black key repeats the white key below. "Chromatisch": every key its own pitch in the current tuning.
const WHITE_OF = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
function scaleSteps() {
  const sc = SCALES[P['t.scale']] || SCALES.mpent;
  if (sc.free) return null;
  return sc.r ? sc.r.map((r) => 12 * Math.log2(r)) : sc.s;
}
function degNote(d) {
  const sc = SCALES[P['t.scale']] || SCALES.mpent, n = sc.r ? sc.r.length : sc.s.length;
  const o = Math.floor(d / n), k = d - o * n;
  if (sc.r) return { f: N.base * Math.pow(2, o) * sc.r[k], name: sc.lab[k] + (o ? '·' + (o + 1) : '') };
  const midi = 12 * (P['t.oct'] + 1) + Number(P['t.root']) + 12 * o + sc.s[k];
  return { f: N.base * Math.pow(2, o) * ratioForSemi(sc.s[k]), name: NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1) };
}
function midiNote(m) {
  const baseMidi = 12 * (P['t.oct'] + 1) + Number(P['t.root']);
  const steps = scaleSteps(), len = N.notes.length;
  const edge = (i) => (i < 0 ? 0.004 : 0.996);
  if (P['midi.map'] === 'chrom' || !steps) {
    const s = m - baseMidi;
    let idx;
    if (N.free) idx = s;
    else { idx = 0; let bd = Infinity; N.notes.forEach((nt, i) => { const dd = Math.abs(nt.semi - s); if (dd < bd) { bd = dd; idx = i; } }); }
    const total = N.free ? 12 * P['t.range'] : len - 1;
    const inside = s >= 0 && s <= 12 * P['t.range'];
    return { f: clamp(N.base * ratioForSemi(s), 16, 14000), idx, name: NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1), x: inside ? noteX(clamp(idx, 0, total)) : edge(s) };
  }
  const n = steps.length;
  let d;
  if (P['midi.map'] === 'white') {
    const rel = m - 12 * (P['t.oct'] + 1), o = Math.floor(rel / 12);
    d = o * 7 + WHITE_OF[rel - o * 12];
  } else {
    const s = m - baseMidi, o = Math.floor(s / 12), r = s - o * 12;
    let best = 0, bd = Infinity;
    for (let k = 0; k <= n; k++) { const dd = Math.abs(r - (k < n ? steps[k] : 12)); if (dd < bd - 1e-9) { bd = dd; best = k; } }
    d = o * n + best;
  }
  const nt = degNote(d);
  return { f: clamp(nt.f, 16, 14000), idx: d, name: nt.name, x: d >= 0 && d < len ? noteX(d) : edge(d) };
}

function panic() {
  kqHoldEnd(); kqProbeEnd();
  A.jrgAge = 0;
  slpPanic(); rgPanic();
  releaseAllTouches(); midiAllOff();
  seqStop();
  if (A.ctx) stopBordun(true);
  if (P['bor.on']) setParam('bor.on', false);
  const hxN = hxPanic();   // Hexenring: every Schleife halts, its buffers stay
  if (A.ctx) {
    for (const v of Array.from(A.voices)) v.kill();
    gspClear(); rhzClear();
    if (A.frozen) setFreeze(false);
    const t = A.ctx.currentTime;
    // flush echo and reverb: mute their returns and loops long enough for every stored sample to pass, then restore
    A.flushing = true;
    for (const g of [A.dStrL, A.dCrsL, A.dStrR, A.dCrsR, A.dlyRet, A.revRet]) { holdParam(g.gain, t); g.gain.linearRampToValueAtTime(0, t + 0.04); }
    regenIR(true);
    clearTimeout(A.flushTimer);
    A.flushTimer = setTimeout(() => {
      A.flushing = false;
      setP(A.dlyRet.gain, 1, 0.02); setP(A.revRet.gain, 1.25, 0.02);
      updDelay();
    }, Math.max(dlyTime(), 0.6) * 1000 + 250);
  }
  if (hxN) toast(hxN + (hxN === 1 ? ' Schleife angehalten' : ' Schleifen angehalten') + ' – Töne, Bordun, Echo, Hall und Puls sind gestoppt.', 8000, [{ label: 'Weiter', fn: hxWeiter }, { label: 'Leeren', fn: hxLeeren }]);   // Hexenring
  else toast('Stille: Töne, Bordun, Echo, Hall und Puls sind gestoppt.');
}
function setFreeze(on) {
  A.frozen = !!on;
  $('#btnFreeze').setAttribute('aria-pressed', String(A.frozen));
  if (A.ctx) updDelay();
}

