/* ---------- drone ---------- */
function borFreqs() {
  const r = rootFreqAt(P['bor.oct']);
  return [r, r * Number(P['bor.int'])];
}
function updBordun() {
  if (!A.ctx) return;
  if (P['bor.on']) { if (!A.bor) startBordun(); else retuneBordun(); }
  else if (A.bor) stopBordun();
}
function startBordun() {
  if (IDLE.on) idleWake();   // Ruhe
  const t = A.ctx.currentTime;
  const g = G(0), filt = BQ('lowpass', P['bor.cut'], 2.5);
  filt.connect(g).connect(stripIn('bor'));
  const lfo = OSC('sine', 0.045), lg = G(P['bor.breath'] * 1500);
  lfo.connect(lg).connect(filt.detune); lfo.start(t);
  const [f1, f2] = borFreqs();
  const oscs = [];
  const parts = [[0, -6, -0.55, 0.22], [0, 6, 0.55, 0.22], [1, -4, -0.3, 0.16], [1, 5, 0.3, 0.16]];
  // level 3: every oscillator doubled, a few cents apart, each pair drifting on its own
  const list = Q.rich ? parts.flatMap(([w, dt, pn, lvl]) => [[w, dt - 3, pn * 1.25, lvl * 0.72], [w, dt + 3.5, pn * 0.6, lvl * 0.72]]) : parts;
  list.forEach(([which, dt, pn, lvl], i) => {
    const o = OSC(P['bor.wave'], which ? f2 : f1);
    o.detune.value = dt;
    A.pitchMod.connect(o.detune);
    const u = Q.rich ? A.uni[i % 4] : null;
    if (u) u.connect(o.detune);
    const og = G(lvl), p = PAN(pn);
    o.connect(og).connect(p).connect(filt);
    o.start(t);
    oscs.push({ o, which, og, p, u });
  });
  g.gain.setTargetAtTime(P['bor.lvl'] * 0.5, t, 1.2);
  A.bor = { g, filt, lfo, lg, oscs, wave: P['bor.wave'], rich: Q.rich };
  if (MOD.t.bor.cs && MOD.ctx === A.ctx) MOD.t.bor.cs.connect(filt.detune);   // Formen · Bordun öffnen
  noteEvent();
  hxBor(true, f1);   // Hexenring: the Bordun as an event of the notes Humus
}
function retuneBordun() {
  const b = A.bor; if (!b) return;
  const [f1, f2] = borFreqs();
  for (const x of b.oscs) {
    glideTo(x.o.frequency, x.which ? f2 : f1, 0.6);
    if (b.wave !== P['bor.wave']) { if (A.waves[P['bor.wave']]) x.o.setPeriodicWave(A.waves[P['bor.wave']]); else x.o.type = P['bor.wave']; }
  }
  b.wave = P['bor.wave'];
  setP(b.filt.frequency, P['bor.cut'], 0.1);
  setP(b.lg.gain, P['bor.breath'] * 1500, 0.2);
  setP(b.g.gain, P['bor.lvl'] * 0.5, 0.3);
}
function stopBordun(fast) {
  const b = A.bor; if (!b) return;
  hxBor(false);   // Hexenring
  A.bor = null;
  const t = A.ctx.currentTime;
  holdParam(b.g.gain, t);
  b.g.gain.setTargetAtTime(0, t, fast ? 0.02 : 0.6);
  const end = t + (fast ? 0.15 : 4);
  for (const x of b.oscs) x.o.stop(end);
  b.lfo.stop(end);
  setTimeout(() => {
    for (const x of b.oscs) { try { A.pitchMod.disconnect(x.o.detune); if (x.u) x.u.disconnect(x.o.detune); x.o.disconnect(); x.og.disconnect(); x.p.disconnect(); } catch (e) {} }
    try { b.lfo.disconnect(); b.lg.disconnect(); b.filt.disconnect(); b.g.disconnect(); } catch (e) {}
    const bc = MOD.t.bor.cs;
    if (bc) { try { bc.disconnect(b.filt.detune); } catch (e) {} }
  }, (end - t) * 1000 + 200);
}

