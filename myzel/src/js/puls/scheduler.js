/* =====================================================================
   Scheduler: sequencer, rolls, grains
   ===================================================================== */
// All lanes share one beat clock, so polymeters stay locked when tempo or Raster changes.
// ext: { bpm, name } while a device's MIDI clock leads the tempo
// (Hexenring: anchorT/anchorB/bpm are the Taktgeber's – accessors, set up in its section)
const SEQ = { on: false, ext: null, anchorT: 0, anchorB: 0, bpm: 84, lanes: [0, 1, 2, 3].map(() => ({ n: 0, div: 0, walk: 0, cur: -1 })) };
const beatAt = (t) => tgBeat(t);   // Hexenring: the Taktgeber's musical beat – one map that never jumps
const timeAt = (b) => tgTime(b);
const seqBpm = () => (SEQ.ext ? SEQ.ext.bpm : TG.hxOn ? TG.hx : P['seq.bpm']);   // (Hexenring: a Schleife's exact tempo)
function seqRetempo() {
  // (while it stands its clock runs on – Sporenregen's Keime and the Rassel count in it: the beat never jumps)
  tgRetempo(seqBpm());   // Hexenring: a new slope just ahead
  barRecue();
  if (CAP.bar && CAP.state === 'rec' && Math.abs(P['seq.bpm'] - CAP.bar.bpm) > 0.01 && !CAP.bar.tempoHinted) {
    CAP.bar.tempoHinted = true;
    toast('Die laufende Schleife behält ihr Tempo (' + Math.round(CAP.bar.bpm) + ' BPM); das neue gilt ab der nächsten Aufnahme.', 4500);
  }
}
function euclid(steps, pulses, rot) {
  steps = Math.max(1, steps | 0); pulses = clamp(pulses | 0, 0, steps);
  const p = [];
  for (let i = 0; i < steps; i++) p.push(pulses > 0 && (i * pulses) % steps < pulses);
  const r = ((rot % steps) + steps) % steps;
  return p.map((_, i) => p[(i - r + steps) % steps]);
}
function laneNote(i) {
  const L = SEQ.lanes[i], pre = 'l' + i + '.';
  const walk = P[pre + 'walk'];
  if (walk > 0 && Math.random() < walk) L.walk += pick([-2, -1, 1, 2]);
  if (Math.random() < 0.08) L.walk = Math.round(L.walk * 0.5);
  const len = N.free ? 12 * P['t.range'] + 1 : N.notes.length;
  const idx = clamp(P[pre + 'deg'] + L.walk, 0, len - 1);
  L.walk = idx - P[pre + 'deg'];
  const f = N.free ? N.base * ratioForSemi(idx) : N.notes[idx].f;
  return { f: f * Math.pow(2, P[pre + 'oct']), x: noteX(idx) };
}
function visPush(ev) { if (!document.hidden && VIS.events.length < 400) VIS.events.push(ev); }
function seqTick(horizon) {
  if (!SEQ.on) return;
  const now = A.ctx.currentTime;
  if (!SEQ.ext && seqBpm() !== TG.want) seqRetempo();   // (Hexenring: a patch written directly)
  // Schlafen: the Puls ends with its bar – nothing from the next downbeat on
  if (SEQ.stopB != null) { const te = timeAt(SEQ.stopB); if (now >= te) { seqStop(); return; } if (horizon > te) horizon = te; }
  for (let i = 0; i < 4; i++) {
    const L = SEQ.lanes[i], pre = 'l' + i + '.', lon = SEQ.tk ? SEQ.tk[i] : P[pre + 'on'];   // the Ladung's Tank may add lanes
    const steps = P[pre + 'steps'], div = divBeats(P[pre + 'div']);
    if (L.div !== div) { L.n = Math.ceil(beatAt(Math.max(now, L.last || 0) + 0.001) / div - 1e-9); L.div = div; }
    if (timeAt(L.n * div) < now - 0.25) L.n = Math.ceil(beatAt(now) / div);   // after a stall, skip instead of bursting
    const pat = euclid(steps, P[pre + 'puls'], P[pre + 'rot']);
    const stepDur = div * 60 / SEQ.bpm;
    let t;
    while ((t = timeAt(L.n * div)) < horizon) {
      const s = ((L.n % steps) + steps) % steps;
      if (L.n % 2 === 1) t += P['seq.swing'] * stepDur * 0.5;
      // Formen · Puls-Dichte: below rest fewer hits, above it more – up to every step of the pattern, and quiet ghost
      // hits between its steps; Puls-Helligkeit lifts or darkens the hits
      const dn = MOD.t.pulsD.s.size ? modVal('pulsD', t) : 0, pr = dn > 0 ? P[pre + 'prob'] + (1 - P[pre + 'prob']) * dn : dn < 0 ? P[pre + 'prob'] * (1 + dn) : P[pre + 'prob'];
      const ghost = dn > 0 && lon && !pat[s] && Math.random() < dn * 0.3;
      if ((lon && pat[s] && Math.random() < pr) || ghost) {
        const nt = laneNote(i), br = MOD.t.pulsH.s.size ? clamp(P[pre + 'bright'] + 0.5 * modVal('pulsH', t), 0, 1) : P[pre + 'bright'];
        const vel = P[pre + 'vol'] * (1 - P['v.human'] * 0.3 * Math.random()) * (ghost ? 0.45 : 1);
        const jit = P['v.human'] * 0.008 * Math.random();
        hit(P[pre + 'eng'], t + jit, nt.f, br, vel, { pan: P[pre + 'pan'], gate: stepDur * 0.9, bus: stripIn('l' + i) });
        if (P['mix.duckSrc'] === String(i)) duckHit(t + jit, i);
        noteEvent(t);
        visPush({ t, kind: 'hit', x: nt.x, y: 0.15 + br * 0.7, lane: i, s: vel });
        if (RG.ps) rgPuls(t, nt.f, nt.x, 0.15 + br * 0.7);   // Sporenregen: "Puls sät mit"
      }
      visPush({ t, kind: 'step', lane: i, step: s });
      L.last = t;
      L.n++;
    }
  }
}
// b0: the beat to start from (MIDI Continue / Song Position); t0: when that beat sounds (a device's clock pulse)
// Hexenring: a device's Start says where its beat b0 is (the Taktgeber's origin moves there); with a Schleife the Puls
// joins the Taktgeber's grid at its next bar line (it counts from 0 there – the origin moves by whole bars); without one
// it starts at once, as before (nothing depends on the grid)
function seqStart(b0 = 0, t0) {
  if (!A.started) return;
  ensureRunning();
  const now = A.ctx.currentTime, join = t0 == null && HX.loops.size > 0;
  if (t0 == null) { t0 = join ? tgBar(now + 0.06) : now + 0.06; if (join) b0 = 0; }
  if (Math.abs(seqBpm() - TG.want) > 1e-9) tgRetempo(seqBpm(), t0 > now ? t0 : undefined);
  rgRebase(tgRebase(b0, t0));   // Sporenregen counts in this clock
  SEQ.lanes.forEach((L, i) => { L.div = divBeats(P['l' + i + '.div']); L.n = b0 ? Math.ceil(b0 / L.div - 1e-9) : 0; L.walk = 0; L.cur = -1; L.last = 0; });
  SEQ.on = true; SEQ.stopB = null;
  barRecue();
  keepAwake();
  updPulsUI();
  clkOutStart(b0);
}
function seqStop() { SEQ.on = false; SEQ.stopB = null; SEQ.lanes.forEach((L) => (L.cur = -1)); barRecue(); updPulsUI(); clkOutStop(); }

function rollInterval() { return (4 / Number(P['v.roll'])) * 60 / seqBpm(); }
function rollTick(horizon) {
  if (P['v.roll'] === 'off') return;
  const now = A.ctx.currentTime;
  for (const tt of touches.values()) {
    if (tt.rollNext == null) continue;
    if (tt.rollNext < now - 0.05) tt.rollNext = now + 0.005;
    while (tt.rollNext < horizon) {
      triggerPerc(tt, tt.rollNext, true);
      tt.rollNext += rollInterval();
    }
  }
}
function grainTick(horizon) {
  const now = A.ctx.currentTime;
  for (const v of A.grainVoices) {
    if (!v.alive || now > v.endAt) { A.grainVoices.delete(v); continue; }
    const k = v.kor;
    if (!k.buf) { const src = korSource(); if (!src) continue; k.buf = src.buf; k.rev = src.rev; k.ref = src.ref; }
    if (k.next < now) k.next = now + 0.004;
    const step = Math.max(1 / (P['kor.dens'] * Q.korDens * (MOD.t.korD.s.size ? modKorD(k.next) : 1)), P['kor.size'] / Q.overlap);   // cap overlapping grains per finger
    while (k.next < horizon && k.next < v.endAt) { spawnGrain(v, k.next); k.next += step * rand(0.6, 1.4); }
  }
}
// a part of the tick or of the frame that throws: said once per part (not 40 times a second), the others go on
const TICK_ERR = new Set();
function tickTry(k, fn) { try { fn(); } catch (e) { if (!TICK_ERR.has(k)) { TICK_ERR.add(k); console.error(e); } } }
function tick() {
  const nowW = performance.now();
  // track the worst recent gap between ticks (decays over ~10 s) and look further ahead after main-thread stalls,
  // so a late tick never leaves a hole in the Puls, Wirbel or grain stream
  if (A.lastTick) A.jitter = Math.max((nowW - A.lastTick) / 1000, (A.jitter || 0.025) * 0.993);
  A.lastTick = nowW;
  if (!A.ctx || A.ctx.state !== 'running') return;
  const horizon = A.ctx.currentTime + clamp(0.07 + 2 * (A.jitter || 0.025), 0.12, 0.35);
  // (Hexenring: after a stall the Taktgeber follows the device before the Puls schedules)
  // each part on its own (phone report 22.10.2026): one that throws must not take the others with it – a Puls, a
  // Hexenring wait (its count-in, a recording that starts on the 1), Ruhe and the recorder's preview run on
  const T = tickTry;
  T(0, () => { ctxSync(); if (A.ctxJump) { A.ctxJump = false; if (SEQ.ext && CLK.run && CLK.n > 2) clkFollow(); } }); T(1, jrgClock); T(2, () => seqTick(horizon)); T(3, () => clkOutTick(horizon)); T(4, () => rollTick(horizon));
  T(5, () => grainTick(horizon)); T(6, () => previewTick(horizon)); T(7, () => faeTick(horizon)); if (GK.on || RG.on) T(8, () => rgTick(horizon)); if (MOD.tm) T(9, () => modFlush(true)); if (A.gsp) T(10, gspTick);
  if (RHZ.vs.size || RHZ.q.length) T(11, () => rhzRun(horizon)); T(12, () => hxTick(horizon)); T(13, idleTick);   // (Hexenring: its waits, the Ohr, the field's rings)
}
function startClock() {
  const fallback = () => { if (!A.clockId) A.clockId = setInterval(tick, 25); };
  const src = 'let id=null;onmessage=function(e){clearInterval(id);if(e.data==="start")id=setInterval(function(){postMessage(0)},25)}';
  try {
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = tick; w.onerror = fallback; w.postMessage('start'); A.clock = w;
  } catch (e) { fallback(); }
  // watchdog: if the worker never ticks (blocked or throttled), the main-thread timer takes over
  setTimeout(() => { if (!A.lastTick || performance.now() - A.lastTick > 400) fallback(); }, 700);
}

