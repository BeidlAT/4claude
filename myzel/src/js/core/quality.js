/* ---------- quality levels ---------- */
// Myzel measures this device: how much of real time one level-1 Nebel voice takes when rendered offline. Level 3
// then fills a share of one core (the browser renders all audio on a single real-time thread) and leaves the rest for
// effects, timing jitter and the screen; level 2 is capped by the same measure on slow machines. Underruns reported
// by the browser lower the budget further.
const CAL = { unit: Number(store.get('myzel.cal.v1')) || 0, running: false };
// (31.10.2026, owner: „die Qualitätsstufen sind nicht nachvollziehbar und verhalten sich widersprüchlich“) the three
// budgets, in level-1 Nebel voices' worth of the core, from one measure and in order: a higher level never gets less of the
// core than the one below (unmeasured, level 3 had 48 – 25 Nebel voices against level 2's 40; on a slower machine level 2
// fell to 14 under level 1's fixed 22, level 3 stood at a floor of 24 above it). Level 3's voices are richer, so the same
// share holds fewer of them – said so on the card, with all three counts.
function qBudgets() {
  // (the smallest buffer leaves less slack per callback: 40 % of the core instead of 50 – the context's own buffer, which a
  // new setting changes only at the next sound start)
  const cap = CAL.unit ? Math.floor(((A.ctx ? A.latMode : P['dev.lat']) === 'min' ? 0.4 : 0.5) / CAL.unit) : 0;
  const b1 = cap ? clamp(cap, 8, QP[1].base) : QP[1].base, b2 = cap ? clamp(cap, b1, QP[2].base) : QP[2].base;
  return { 1: b1, 2: b2, 3: cap ? clamp(cap, b2, 360) : Math.round(QP[2].base * VCOST3.neb), cap };
}
function applyQuality() {
  Q = QP[P['dev.q']] || QP[1];
  const B = qBudgets();
  Q.budget = B[P['dev.q']] || B[1];
  if (Q === QP[3]) {
    Q.maxv = clamp(Math.round(Q.budget * 1.5), 64, 400); Q.grainMax = clamp(Q.budget * 8, 320, 1600);
  }
  VBUDGET = Math.max(6, Math.round(Q.budget * (A.budgetScale || 1))); MAXV = Q.maxv;
  if (!A.ctx) return;
  // a lower budget frees what is already fading; held notes keep sounding, new notes respect the new limit
  while (A.voices.size && (A.voices.size > MAXV || voiceLoad() > VBUDGET) && steal(true));
  A.drvKey = null; updDrive();
  if (A.revWant && A.revWant !== (Q.rich ? 4 : 2)) regenIR();
  if (A.bor && A.bor.rich !== Q.rich) { stopBordun(); startBordun(); }
  if (A.gsp) { if (A.gsp.rich !== !!Q.rich) gspDrop(); else A.gsp.node.port.postMessage({ lite: A.lite ? 1 : 0 }); }   // (the web: rebuilt at the next note with 8 or 12 strings)
}
// the live budget alone (the guard's voice limit and its way back): nothing in the chains is rebuilt and nothing that
// sounds is cut – new notes respect it (playNote steals a fading voice first)
function budgetApply() { VBUDGET = Math.max(6, Math.round(Q.budget * (A.budgetScale || 1))); }
async function calibrate() {
  if (CAL.running || !A.ctx || typeof OfflineAudioContext === 'undefined') return;
  CAL.running = true;
  try {
    let best = Infinity;
    for (let run = 0; run < 2; run++) {
      const units = 24, dur = 1, c = new OfflineAudioContext(2, Math.round(SR * dur), SR);
      // build real Nebel voices into the offline context: swap the context and the shared modulation for a moment
      const keepA = { ctx: A.ctx, pitchMod: A.pitchMod, notePitch: A.notePitch }, keepQ = Q, keepP = {};
      for (const id in PD) if (id.startsWith('neb.')) { keepP[id] = P[id]; P[id] = PD[id].d; }
      try {
        A.ctx = c; Q = QP[1];
        A.pitchMod = A.notePitch = c.createGain();
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 4.5; lg.gain.value = 4;
        lfo.connect(lg).connect(A.pitchMod); lfo.start();
        for (let i = 0; i < units; i++) {
          const v = new Voice('neb'), pan = PAN(rand(-0.6, 0.6));
          v.out.connect(pan).connect(c.destination);
          ENGINES.neb.start(v, 0, 98 * Math.pow(2, (i % 15) / 7), (i % 5) / 4, 0.7, {});
        }
      } finally { Object.assign(A, keepA); Object.assign(P, keepP); Q = keepQ; }
      const t0 = performance.now();
      await c.startRendering();
      best = Math.min(best, (performance.now() - t0) / 1000 / dur / units);
    }
    if (Number.isFinite(best) && best > 0) { CAL.unit = best; CAL.fresh = true; store.set('myzel.cal.v1', String(best)); }
  } catch (e) { console.warn(e); }
  CAL.running = false;
  applyQuality();
  updDevUI();
}
function hit(eng, t, f, y, vel, o = {}) {
  const E = ENGINES[eng];
  if (!E) return null;
  if (E.sustain) return playNote(eng, t, f, y, vel, Object.assign({ burst: true, gate: 0.22 }, o));
  return playNote(eng, t, f, y, vel, o);
}

