/* =====================================================================
   Leistung: „Leistung messen“ and the Handy-Modus (Gerät)
   ===================================================================== */
// The owner's phone report (23.10.2026): on his phone the app runs at its limit, the three quality levels all alike – a
// constant load, not the voices. An emulation keeps missing what a real phone does, so the phone measures itself: 20 s
// while the player plays as always, then a short German summary and a compact text report to copy and send (nothing is
// sent anywhere by the page). While it runs LM counts each part of the frame and of the tick (tickTry's keys), the
// frame intervals and the drawn frames' time, the tick's gaps, long tasks and long animation frames, touch → sound, the
// device's underruns (playbackStats / playoutStats, else the audio clock against the page's), the render capacity where
// the browser reports it, the voices' load and the Hexenring's state. Off, it costs one test of LM.on per part.
const LM_SECS = 20;
// tickTry's keys: the tick's parts 0–13, the frame 20 and its parts 21–26, the whole tick 30, the processor's messages 31,
// a touch's handler 32
const LM_PART = { 0: 'takt', 1: 'jahresring', 2: 'puls', 3: 'clockOut', 4: 'wirbel', 5: 'koerner', 6: 'vorschau', 7: 'faehrte', 8: 'regen', 9: 'mod', 10: 'gespinst', 11: 'rhizom', 12: 'hxTick', 13: 'ruhe',
  20: 'frame', 21: 'hxFeld', 22: 'meter', 23: 'panel', 24: 'ctl', 25: 'devLive', 26: 'rail', 27: 'hxEdit', 30: 'tick', 31: 'hxMsg', 32: 'onDown' };
const LM = { on: false, t0: 0, pMs: new Float64Array(40), pN: new Uint32Array(40), pMax: new Float64Array(40), raf: new Float32Array(4096), nR: 0, fb: new Float32Array(2048), nF: 0,
  gap: new Float32Array(2048), nG: 0, lastT: 0, ev: [], ul: [], up: {}, ut: 0, tch: [], lt: null, loaf: null, ps0: null, ck: null, rc: null, smp: null, timer: 0, res: null, txt: '', sum: null, ui: null, obs: [] };
function lmPart(k, ms) {
  LM.pMs[k] += ms; LM.pN[k]++; if (ms > LM.pMax[k]) LM.pMax[k] = ms;
  if (k === 20 && FR.drew && LM.nF < LM.fb.length) LM.fb[LM.nF++] = ms;   // (a drawn frame's own time)
}
// (desktop report 24.10.2026) what happened when the sound dropped: the underruns' moments (polled every 100 ms while
// measuring) beside the moments of what could cause one – Ruhe and the chain copy waking or resting (links in the graph),
// the Hexenring's gates, big messages to the processor (a version, a Schicht; Taumeln on/off), a living pass begun, the
// guard's steps, the main thread's long tasks and its garbage collections (the heap falling)
function lmEv(k) { if (LM.on && LM.ev.length < 4000) LM.ev.push([performance.now(), k]); }
function lmUPoll() {
  const ps = A.ctx && (A.ctx.playbackStats || A.ctx.playoutStats); if (!ps) return;
  const u = (ps.underrunEvents != null ? ps.underrunEvents : ps.fallbackFramesEvents) || 0, d = ps.underrunDuration != null ? ps.underrunDuration * 1000 : ps.fallbackFramesDuration != null ? ps.fallbackFramesDuration : null, U = LM.up;
  if (U.u != null && u > U.u && LM.ul.length < 400) LM.ul.push([performance.now(), u - U.u, d != null && U.d != null ? Math.max(0, d - U.d) : null]);
  U.u = u; U.d = d;
  const m = performance.memory; if (m) { const h = m.usedJSHeapSize; if (U.h && h < U.h - 2e6) lmEv('gc:' + Math.round((U.h - h) / 1e6)); U.h = h; }
}
function lmUlog(R0) {
  return LM.ul.slice(0, 24).map(([t, n, ms]) => {
    const near = new Map(); for (const [te, k] of LM.ev) if (te >= t - 1100 && te <= t + 100) { const kk = k.replace(/:[\d.]+(MB)?$/, (x) => (/MB/.test(x) ? x : '')); near.set(kk, (near.get(kk) || 0) + 1); }
    return '+' + ((t - LM.t0) / 1000).toFixed(1) + (n > 1 ? 'x' + n : '') + (ms != null ? '/' + r1(ms) + 'ms' : '') + '[' + ([...near].map(([k, c]) => k + (c > 1 ? '*' + c : '')).join(',') || '-') + ']';
  });
}
function lmGap(t) { if (LM.lastT && LM.nG < LM.gap.length) LM.gap[LM.nG++] = t - LM.lastT; LM.lastT = t; }
// a touch: its wait in the queue (the event's time → its handler), the handler, and when the voice it started reaches the
// speaker – the audio clock's frame at the handler's end, mapped by getOutputTimestamp (else the reported latencies)
function lmTouch(e, t0) {
  const t1 = performance.now(), ts = e.timeStamp, c = A.ctx;
  lmPart(32, t1 - t0);
  if (!(ts > 0) || !c || LM.tch.length >= 400) return;
  let out = null;
  try { const o = c.getOutputTimestamp && c.getOutputTimestamp(); if (o && o.performanceTime > 0) out = o.performanceTime + (c.currentTime - o.contextTime) * 1000 + 128000 / SR - ts; } catch (err) {}
  if (out == null || !(out > 0) || out > 2000) out = t1 - ts + ((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000 + 128000 / SR;
  LM.tch.push([t0 - ts, t1 - t0, out]);
}
// the browser's own figures of the output (Chrome: playbackStats, or the experimental playoutStats): every number it has
function lmStats() {
  const ps = A.ctx && (A.ctx.playbackStats || A.ctx.playoutStats);
  if (!ps) return null;
  const o = { kind: A.ctx.playbackStats ? 'playbackStats' : 'playoutStats' };
  for (const k in ps) { try { const v = ps[k]; if (typeof v === 'number') o[k] = v; } catch (e) {} }
  return o;
}
// the audio clock against the page's: a render that falls behind lets the context's time run slower (as watchUnderruns)
function lmClock() {
  const c = A.ctx; let p = performance.now(), t = c.currentTime;
  try { const o = c.getOutputTimestamp && c.getOutputTimestamp(); if (o && o.performanceTime > 0) { p = o.performanceTime; t = o.contextTime; } } catch (e) {}
  const K = LM.ck;
  if (!K.p0) { K.p0 = K.p = p; K.c0 = K.c = t; return; }
  if (p - K.p < 900) return;
  const lag = (p - K.p) / 1000 - (t - K.c);
  if (lag >= 0.025) K.n++;
  K.lagMs += Math.max(0, lag) * 1000; K.p = p; K.c = t; K.p1 = p; K.c1 = t;
}
function lmObserve(on) {
  for (const o of LM.obs) try { o.disconnect(); } catch (e) {}
  LM.obs = [];
  if (!on || !window.PerformanceObserver) return;
  const sup = PerformanceObserver.supportedEntryTypes || [];
  if (sup.includes('longtask')) { const o = new PerformanceObserver((l) => { for (const e of l.getEntries()) { lmEv('lang:' + Math.round(e.duration)); const L = LM.lt; L.n++; L.ms += e.duration; if (e.duration > L.max) L.max = e.duration; } }); o.observe({ type: 'longtask' }); LM.obs.push(o); LM.lt.ok = true; }
  // a long animation frame (≥ 50 ms): how much was rendering (style, layout, paint, the canvases' hand-over) and which
  // scripts ran in it
  if (sup.includes('long-animation-frame')) {
    const o = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const F = LM.loaf, end = e.startTime + e.duration;
        F.n++; F.ms += e.duration; F.block += e.blockingDuration || 0;
        if (e.renderStart) F.render += end - e.renderStart;
        if (e.styleAndLayoutStart) F.style += end - e.styleAndLayoutStart;
        for (const s of e.scripts || []) { const k = (s.invokerType || '') + ':' + (s.sourceFunctionName || s.invoker || '?'); F.inv.set(k, (F.inv.get(k) || 0) + s.duration); }
      }
    });
    o.observe({ type: 'long-animation-frame' }); LM.obs.push(o); LM.loaf.ok = true;
  }
}
function lmStart() {
  if (LM.on || !A.ctx || A.ctx.state !== 'running') { if (!LM.on) toast('Erst den Klang starten, dann messen.', 3000); return; }
  LM.pMs.fill(0); LM.pN.fill(0); LM.pMax.fill(0); LM.nR = LM.nF = LM.nG = 0; LM.lastT = 0; LM.tch = [];
  LM.lt = { n: 0, ms: 0, max: 0, ok: false }; LM.loaf = { n: 0, ms: 0, block: 0, render: 0, style: 0, inv: new Map(), ok: false };
  LM.ck = { p0: 0, c0: 0, p: 0, c: 0, p1: 0, c1: 0, n: 0, lagMs: 0 };
  LM.smp = { n: 0, load: 0, loadMax: 0, vMax: 0, gr: 0, idle: 0, panel: new Map(), hid: 0, loops: 0, spielt: 0, sch: 0, leb: 0, phLoad: 0 };
  LM.ps0 = lmStats(); LM.u0 = A.underruns || 0; LM.res = null;
  // (the audio side in detail – 23.10.2026, after report A: each loop's share of the budget, the Werk-Rahmen's work, the
  // guard's steps, the latency the context reports against the one asked for)
  LM.why = new Map(); LM.lp = new Map(); LM.lsum = { n: 0, loops: 0, max: 0, hx: 0, cap: 0 }; LM.lat = { n: 0, out: 0, outMin: Infinity, outMax: 0, base: 0 };
  if (typeof HX !== 'undefined' && HX.wSt) { HX.wSt.q = HX.wJobs || 0; LM.w0 = Object.assign({}, HX.wSt); }
  LM.gT = performance.now();
  LM.rc = null;
  const rc = A.ctx.renderCapacity;
  if (rc && rc.start) try { LM.rc = { n: 0, avg: 0, peak: 0, und: 0 }; rc.onupdate = (e) => { const R = LM.rc; if (!R) return; R.n++; R.avg += e.averageLoad || 0; R.peak = Math.max(R.peak, e.peakLoad || 0); R.und = Math.max(R.und, e.underrunRatio || 0); }; rc.start({ updateInterval: 1 }); } catch (e) { LM.rc = null; }
  lmObserve(true);
  LM.ev = []; LM.ul = []; LM.up = {};
  LM.t0 = performance.now(); LM.on = true;
  lmUPoll(); LM.ut = setInterval(lmUPoll, 100);
  lmClock();
  LM.timer = setInterval(lmSample, 250);
  toast('Leistung messen: spiel jetzt ' + LM_SECS + ' Sekunden wie immer – das Panel darf zu.', 5000);
  lmUI();
}
function lmSample() {
  const S = LM.smp, el = performance.now() - LM.t0;
  if (el >= LM_SECS * 1000) { lmStop(); return; }
  S.n++;
  const ld = voiceLoad() / Math.max(1, VBUDGET); S.load += ld; S.loadMax = Math.max(S.loadMax, ld);
  S.vMax = Math.max(S.vMax, A.voices.size); S.gr = Math.max(S.gr, A.grains || 0);
  if (IDLE.on) S.idle++;
  if (PH.load) S.phLoad++;
  const pk = UI.panel || '-'; S.panel.set(pk, (S.panel.get(pk) || 0) + 1);
  if (document.visibilityState !== 'visible') S.hid++;
  const live = hxLoopsLive();
  S.loops = Math.max(S.loops, live.length); S.spielt = Math.max(S.spielt, live.filter((L) => L.state === 'spielt').length); S.sch = Math.max(S.sch, HX.sch.size);
  S.leb = Math.max(S.leb, live.filter((L) => hxWAktiv(L)).length);
  lmLoops(live);
  const c = A.ctx, La = LM.lat, o = (c.outputLatency || 0) * 1000; La.n++; La.out += o; La.base += (c.baseLatency || 0) * 1000; if (o < La.outMin) La.outMin = o; if (o > La.outMax) La.outMax = o;
  lmClock();
  if (S.n % 4 === 0) lmUI();
}
// each loop's share of the budget (hxCostOf – what voiceLoad counts for it) and what it did: played, lived, held by the
// guard, rested its Taumeln, played through the chain's copy on out 1
function lmLoops(live) {
  if (!HX.node) return;
  const Z = LM.lsum; let sum = 0;
  for (const L of live) {
    const c = hxCostOf(L); sum += c;
    let e = LM.lp.get(L.key); if (!e) LM.lp.set(L.key, (e = { slot: L.slot, n: 0, c: 0, max: 0, sp: 0, leb: 0, hold: 0, tau: 0, o1: 0 }));
    e.n++; e.c += c; if (c > e.max) e.max = c;
    if (L.state === 'spielt') e.sp++;
    if (hxWLebt(L) && L.state === 'spielt') e.leb++;
    else if (hxEigN(L) >= 1 && hxWAktiv(L) && L.state === 'spielt') { const w = hxWHold(L) ? 'hold' : HX.wGuard.pause > performance.now() ? 'pause' : L.wRefused ? 'refused' : L.wMemT ? 'mem' : L.treuBis != null ? 'treu8' : L.revW ? 'rev' : L.live ? 'live' : '?'; LM.why.set(w, (LM.why.get(w) || 0) + 1); }
    if (hxWHold(L)) e.hold++;
    if (!L.bew && !hxTauOn(L)) e.tau++;
    if (L.sch.some((id) => { const S = HX.sch.get(id); return S && S.out; })) e.o1++;
  }
  const hx = hxLoad(); Z.n++; Z.loops += sum; if (sum > Z.max) Z.max = sum; Z.hx += hx;
}
function lmLoopsRes() {
  const Z = LM.lsum, n = Math.max(1, Z.n), r2 = (x) => Math.round(x * 100) / 100;
  const each = [...LM.lp.values()].sort((a, b) => a.slot - b.slot).map((e) => {
    const f = [e.sp * 2 > e.n ? 'spielt' : e.sp ? 'teils' : 'halt', e.leb * 2 > e.n ? 'leb' : '', e.hold ? 'hold' : '', e.tau * 2 > e.n ? 'tau-ruht' : '', e.o1 * 2 > e.n ? 'out1' : ''].filter(Boolean).join(',');
    return 'S' + (e.slot + 1) + '=' + r2(e.c / Math.max(1, e.n)) + '(' + f + ')';
  });
  return { sum: { loops: r2(Z.loops / n), max: r2(Z.max), hx: r2(Z.hx / n), rest: r2((Z.hx - Z.loops) / n), budget: VBUDGET, f1: HX.node && HX.o1 ? HX_COST.fx1 : 0 }, each };
}
// the Werk-Rahmen in the window: renders begun (living passes and Treu), done, stopped; their own render time (the offline
// context's) per second of audio, the wait from the request, the most waiting at once
function lmWerk(secs) {
  const W = HX.wSt, W0 = LM.w0 || W, d = (k) => (W[k] || 0) - (W0[k] || 0), done = d('done');
  const rs = [HXW, ...(HXW.pool || [])].map((R) => (R.st === 'ok' ? (R.old ? 'o' : R.n ? 'r' : 'i') : R.st === 'laden' ? 'l' : R.st === 'kein' ? 'x' : '-')).join('');   // (each realm: i idle, r rendering, o being renewed, l loading, x none, - not booted)
  return { st: HXW.st || '-', realms: rs, pool: (HXW.pool || []).filter((R) => R.st === 'ok').length, n: d('n'), perS: r1(d('n') / Math.max(1, secs)), done, stop: d('stop'), ms: done ? Math.round(d('ms') / done) : 0, wait: done ? Math.round(d('wall') / done) : 0,
    xRT: d('audio') > 0 ? +(d('ms') / 1000 / d('audio')).toFixed(3) : 0, q: W.q || 0, jobs: HX.wJobs || 0 };
}
// the guard's steps in the window (which, at which second), and where it stands at the end
function lmGuard() {
  const steps = (HX.gLog || []).filter((e) => e.t >= LM.gT).map((e) => e.step + (e.v !== '' ? ':' + e.v : '') + '@' + r1((e.t - LM.t0) / 1000));
  const G = HX.wGuard || {}, now = performance.now();
  return { steps, now: { pause: G.pause > now ? Math.round((G.pause - now) / 1000) : 0, hold: !!(G.hold && G.pause > now), max: G.max === Infinity ? '-' : G.max, tau: !!HX.tauRest, lite: !!A.lite, scale: Math.round(100 * (A.budgetScale || 1)) / 100, budget: VBUDGET } };
}
function lmStop() {
  if (!LM.on) return;
  lmUPoll(); LM.on = false; clearInterval(LM.timer); clearInterval(LM.ut); lmObserve(false);
  lmClock();
  try { if (A.ctx.renderCapacity && LM.rc) A.ctx.renderCapacity.stop(); } catch (e) {}
  LM.res = lmResult(performance.now() - LM.t0);
  LM.txt = lmText(LM.res); LM.sum = lmSummary(LM.res);
  // (27.10.2026) what the processor itself holds of the loops, added once it answers
  if (HX.node) Promise.race([hxReport(), new Promise((r) => setTimeout(() => r(null), 1500))]).then((rep) => { if (rep && rep.lp && LM.res) { LM.txt += '\nproc ' + JSON.stringify(rep.lp); lmUI(); } });
  toast('Leistung gemessen – das Ergebnis steht unter „Gerät“ → „Leistung“.', 7000, { label: 'Zeigen', fn: () => { openPanel('dev'); setTimeout(() => { if (LM.ui) LM.ui.sec.scrollIntoView({ block: 'start' }); }, 60); } });
  lmUI();
}
const lmQ = (a, n, p) => { if (!n) return 0; const s = Array.from(a.subarray(0, n)).sort((x, y) => x - y); return s[Math.min(n - 1, Math.floor(p * n))]; };
const lmQa = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => Math.round(x * 10) / 10;
function lmResult(ms) {
  const secs = ms / 1000, c = A.ctx, S = LM.smp, R = {};
  R.secs = r1(secs);
  // frames: the display's interval (its rate), how many came late (over 1.5 × the usual), the drawn frames and their time
  const med = lmQ(LM.raf, LM.nR, 0.5);
  let late = 0; for (let i = 0; i < LM.nR; i++) if (LM.raf[i] > 1.5 * med) late++;
  R.hz = med ? Math.round(1000 / med) : 0; R.raf = { n: LM.nR, p50: r1(med), p95: r1(lmQ(LM.raf, LM.nR, 0.95)), max: r1(lmQ(LM.raf, LM.nR, 1)), late: LM.nR ? Math.round(100 * late / LM.nR) : 0 };
  R.draw = { fps: r1(LM.nF / secs), p50: r1(lmQ(LM.fb, LM.nF, 0.5)), p95: r1(lmQ(LM.fb, LM.nF, 0.95)), max: r1(lmQ(LM.fb, LM.nF, 1)) };
  R.tick = { n: LM.pN[30], gapP95: r1(lmQ(LM.gap, LM.nG, 0.95)), gapMax: r1(lmQ(LM.gap, LM.nG, 1)) };
  // each part's main-thread time per second (the field's own: the frame without its parts)
  const per = (k) => LM.pMs[k] / secs;
  R.parts = {};
  for (const k in LM_PART) if (LM.pN[k]) R.parts[LM_PART[k]] = r1(per(k));
  R.parts.feld = r1(per(20) - per(21) - per(22) - per(23) - per(24) - per(25) - per(26));
  R.lt = LM.lt.ok ? { n: LM.lt.n, ms: Math.round(LM.lt.ms), max: Math.round(LM.lt.max) } : null;
  const F = LM.loaf;
  R.loaf = F.ok ? { n: F.n, ms: Math.round(F.ms), block: Math.round(F.block), render: Math.round(F.render), style: Math.round(F.style), top: [...F.inv].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k.slice(0, 40) + '=' + Math.round(v)) } : null;
  const T = LM.tch;
  R.touch = T.length ? { n: T.length, queue: r1(lmQa(T.map((x) => x[0]), 0.5)), queueMax: r1(lmQa(T.map((x) => x[0]), 1)), hd: r1(lmQa(T.map((x) => x[1]), 0.5)), ton: Math.round(lmQa(T.map((x) => x[2]), 0.5)), tonP95: Math.round(lmQa(T.map((x) => x[2]), 0.95)) } : null;
  // underruns: the browser's figures (their change in the window), the page's own count, the audio clock
  const p0 = LM.ps0, p1 = lmStats();
  if (p0 && p1) { R.ps = { kind: p1.kind }; for (const k in p1) if (k !== 'kind' && typeof p1[k] === 'number') R.ps[k] = /latency/i.test(k) ? r1(p1[k] * (p1[k] < 10 ? 1000 : 1)) : r1(p1[k] - (p0[k] || 0)); }
  const K = LM.ck;
  R.clock = { lagN: K.n, speed: K.p1 > K.p0 ? +((K.c1 - K.c0) / ((K.p1 - K.p0) / 1000)).toFixed(4) : null };
  R.under = R.ps ? (R.ps.underrunEvents != null ? R.ps.underrunEvents : R.ps.fallbackFramesEvents != null ? R.ps.fallbackFramesEvents : null) : null;
  if (R.under == null) R.under = K.n;
  R.rc = LM.rc && LM.rc.n ? { avg: Math.round(100 * LM.rc.avg / LM.rc.n), peak: Math.round(100 * LM.rc.peak), und: r1(100 * LM.rc.und) } : null;
  R.audio = { sr: c.sampleRate, base: r1((c.baseLatency || 0) * 1000), out: r1((c.outputLatency || 0) * 1000), lat: P['dev.lat'], latCtx: A.latMode, q: P['dev.q'], budget: VBUDGET, scale: A.budgetScale || 1, lite: !!A.lite };
  R.voices = { load: S.n ? Math.round(100 * S.load / S.n) : 0, loadMax: Math.round(100 * S.loadMax), max: S.vMax, grains: S.gr, idle: S.n ? Math.round(100 * S.idle / S.n) : 0 };
  R.hx = { loops: S.loops, spielt: S.spielt, sch: S.sch, leb: S.leb, tau: !!HX.tauRest, f1: HXF1.off ? 'ruht' : 'an', werk: HXW.st || '-', wg: HX.wGuard ? HX.wGuard.n || 0 : 0, state: HX.state, nichtLeb: [...LM.why].map(([k, v]) => k + ':' + Math.round(100 * v / Math.max(1, LM.lsum.n)) + '%').join(',') || '-' };
  R.lp = lmLoopsRes(); R.werk = lmWerk(secs); R.guard = lmGuard(); R.ulog = lmUlog();
  const La = LM.lat, hint = A.latMode === 'min' ? '0' : A.latMode === 'safe' ? 'balanced' : 'interactive';
  R.lat = { set: P['dev.lat'], ctx: A.latMode, own: LAT.own ? 1 : 0, step: LAT.auto || '-', hint, base: La.n ? r1(La.base / La.n) : 0, out: La.n ? r1(La.out / La.n) : 0, outMin: La.n ? r1(La.outMin) : 0, outMax: r1(La.outMax), buf: Math.round((c.baseLatency || 0) * c.sampleRate), avg: R.ps && R.ps.averageLatency != null ? R.ps.averageLatency : null };
  const nav = navigator, ua = nav.userAgent || '';
  const os = (ua.match(/Android [\d.]+/) || ua.match(/(iPhone|iPad|Mac) OS [\d_]+/) || [ANDROID ? 'Android' : IOS ? 'iOS' : 'Desktop'])[0].replace(/_/g, '.');
  const br = (ua.match(/(Chrome|CriOS|Firefox|FxiOS|Version)\/(\d+)/) || [])[0] || '?';
  R.dev = { os, br, cores: nav.hardwareConcurrency || 0, mem: nav.deviceMemory || 0, dpr: r1(window.devicePixelRatio || 1), scr: (screen.width || 0) + 'x' + (screen.height || 0), vp: innerWidth + 'x' + innerHeight, mobile: MOBILE, tablet: HX_TABLET };
  const cvs = [...document.querySelectorAll('canvas')].filter((x) => x.width && x.offsetParent);
  R.cv = { fx: cvFx.width + 'x' + cvFx.height, dpr: VIS.dpr, n: cvs.length, mpx: r1(cvs.reduce((s, x) => s + x.width * x.height, 0) / 1e6) };
  R.ph = { on: PH.on, set: PH.set, load: S.n ? Math.round(100 * S.phLoad / S.n) : 0 };
  R.panel = [...S.panel].map(([k, v]) => k + ':' + Math.round(100 * v / S.n)).join(',');
  R.hid = S.hid; R.gk = !!GK.on; R.puls = !!SEQ.on; R.midi = MIDI.ports.size;
  R.build = (window.MYZEL_BUILD && window.MYZEL_BUILD.version ? String(window.MYZEL_BUILD.version) : 'dev').slice(0, 12);
  return R;
}
// the compact text to send: one topic per line, short keys (read by whoever helps – no names of devices)
function lmText(R) {
  const kv = (o) => Object.entries(o).map(([k, v]) => k + '=' + v).join(' ');
  const L = [];
  L.push('Myzel Leistung ' + R.build + ' · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' + R.secs + ' s');
  L.push('dev ' + kv(R.dev));
  L.push('handy ' + kv(R.ph) + ' · panel ' + R.panel + (R.hid ? ' hidden=' + R.hid : '') + ' gk=' + R.gk + ' puls=' + R.puls + ' midi=' + R.midi);
  L.push('audio ' + kv(R.audio));
  L.push('under ' + R.under + ' · ' + (R.ps ? kv(R.ps) : 'stats=none') + ' · clock ' + kv(R.clock) + (R.rc ? ' · rc ' + kv(R.rc) : ' · rc=none'));
  L.push('raf hz=' + R.hz + ' ' + kv(R.raf) + ' · draw ' + kv(R.draw) + ' · cv ' + kv(R.cv));
  L.push('main ms/s ' + kv(R.parts));
  L.push('tick ' + kv(R.tick) + ' · lt ' + (R.lt ? kv(R.lt) : 'none') + ' · loaf ' + (R.loaf ? kv(Object.assign({}, R.loaf, { top: R.loaf.top.join(',') || '-' })) : 'none'));
  L.push('touch ' + (R.touch ? kv(R.touch) : 'none'));
  L.push('voices ' + kv(R.voices) + ' · hx ' + kv(R.hx));
  L.push('loops ' + kv(Object.assign({}, R.lp.sum, { rs: HX.rsw ? 'wasm' : HX.rsw === 0 ? 'js' : '-' })) + (R.lp.each.length ? ' · ' + R.lp.each.join(' ') : ''));
  L.push('werk ' + kv(R.werk));
  L.push('hxstate ' + lmHxState());   // (27.10.2026: Schleifen, die „spielt“ zeigen und stumm sind – der Weg vom Prozessor bis zum Ausgang)
  L.push('ev ' + (LM.ev.length ? LM.ev.slice(-40).map(([t, k]) => Math.round((t - LM.t0) / 100) / 10 + ':' + k).join(' ') : 'none'));
  L.push('ulog ' + (R.ulog.length ? R.ulog.join(' ') : 'none'));
  L.push('guard ' + (R.guard.steps.length ? R.guard.steps.join(' ') : 'none') + ' · ' + kv(R.guard.now));
  L.push('latency ' + kv(R.lat));
  return L.join('\n');
}
// every gate and level between the Hexenring's processor and the output, each Schleife and Schicht with its route
function lmHxState() {
  const g = (n) => (n && n.gain ? +n.gain.value.toFixed(3) : '-'), st = MIX.s.hxr, m = new Map((HX.meter || []).map((x) => [x[0], x[1]]));
  const o = ['ctx=' + (A.ctx ? A.ctx.state : '-'), 'node=' + (HX.node ? (HX.ctx === A.ctx ? 'ok' : 'alt') : 'kein'), 'g0=' + g(HX.g0), 'g1=' + g(HX.g1), 'gM=' + g(HX.gM), 'out1=' + !!HX.out1, 'f1=' + (HXF1.off ? 'ruht' : 'an'), 'idle=' + !!IDLE.on, 'hxOff=' + !!IDLE.hxOff, 'ruht=' + !!HX.ruht,
    'route=' + P['xhxr.route'], 'vol=' + P['xhxr.vol'], 'mute=' + P['xhxr.mute'], 'strip=' + (st ? g(st.in) + '/' + g(st.gate || st.mute || null) : '-'), 'pend=' + HX.pend.map((p) => p.kind).join(',')];
  for (const L of hxLoopsLive()) o.push('[' + (L.slot + 1) + ' ' + L.state + (L.pendTo ? '>' + L.pendTo : '') + ' g' + (+L.gain || 0).toFixed(2) + ' m' + (m.has(L.id) ? (+m.get(L.id)).toFixed(3) : '-') + ' ' + L.sch.map((id) => { const S = HX.sch.get(id); return S ? (S.out ? 'o1' : 'o0') + (S.bak ? 'b' : '') + (S.mute ? 'M' : '') + (S.aud ? '' : '?') : 'x'; }).join(',') + ']');
  return o.join(' ');
}
// the short German summary: what was measured, then where the limit lies
function lmSummary(R) {
  const S = [], d = (x) => dec(String(x));
  const slow = R.raf.late >= 10 || (R.lt && R.lt.n >= 5) || (R.loaf && R.loaf.n >= 10);
  S.push('Bild: ' + d(R.draw.fps) + ' Bilder pro Sekunde gezeichnet (Bildschirm ' + R.hz + ' Hz), ' + R.raf.late + ' % der Bilder kamen zu spät' + (R.lt ? ', ' + R.lt.n + ' lange Aufgaben über 50 ms' : '') + '.');
  S.push(R.touch ? 'Vom Antippen bis zum Ton: etwa ' + R.touch.ton + ' ms (bei jedem zwanzigsten bis ' + R.touch.tonP95 + ' ms; davon Warten auf den Hauptthread ' + d(R.touch.queue) + ' ms).' : 'Kein Antippen gemessen – beim nächsten Mal während der Messung auf dem Feld spielen.');
  S.push(R.under ? 'Klang: ' + R.under + ' Aussetzer in ' + Math.round(R.secs) + ' s' + (R.rc ? ' (Audio-Kern im Mittel ' + R.rc.avg + ' %, Spitze ' + R.rc.peak + ' %)' : '') + '.' : 'Klang: keine Aussetzer gemessen' + (R.rc ? ' (Audio-Kern im Mittel ' + R.rc.avg + ' %, Spitze ' + R.rc.peak + ' %)' : '') + '.');
  S.push(R.under && slow ? 'Ergebnis: Klang und Oberfläche sind beide ausgelastet.' : R.under ? 'Ergebnis: Der Klang setzt aus, obwohl die Oberfläche flüssig läuft – der Audio-Kern ist am Limit.'
    : slow ? 'Ergebnis: Die Oberfläche ist ausgelastet (Zeichnen und Rechnen auf dem Hauptthread); der Klang läuft sauber.' : 'Ergebnis: kein Engpass gemessen.');
  if (R.hx.loops) S.push('Schleifen: ' + R.hx.loops + ', davon ' + R.hx.spielt + ' spielend – sie belegen im Mittel ' + d(R.lp.sum.loops) + ' von ' + R.lp.sum.budget + ' Einheiten (mit Humus und Effektkette ' + d(R.lp.sum.hx) + '); angehaltene kosten nichts.');
  if (R.werk.n) S.push('Lebendige Schleifen: ' + R.werk.n + ' Durchgänge neu gerechnet, jeder etwa ' + R.werk.ms + ' ms (' + d(R.werk.xRT) + ' × Echtzeit).');
  const GW = { lebendig: 'Lebendig hält an', weniger: 'weniger auf einmal gerechnet', taumeln: 'Taumeln ruht', grenze: 'Live-Spiel geschützt', lite: 'weniger Live-Stimmen', stimmen: 'kurz weniger Live-Stimmen', mehr: 'Stimmen wieder frei', taumelt: 'Taumeln wieder an', zurueck: 'Lebendig wieder an', latenz: 'Latenz ab dem nächsten Start zurückgestellt' };
  if (R.guard.steps.length) S.push('Myzel hat entlastet: ' + [...new Set(R.guard.steps.map((x) => GW[x.split(/[:@]/)[0]] || x))].join(', ') + '.');
  S.push('Latenz: eingestellt „' + (LAT_NAME[R.lat.set] || R.lat.set) + '“' + (R.lat.ctx !== R.lat.set ? ' (gemessen mit „' + (LAT_NAME[R.lat.ctx] || R.lat.ctx) + '“ – das neue gilt nach einem Neustart)' : '') + ' – das Gerät meldet ' + d(R.lat.base) + ' ms Puffer und ' + d(R.lat.out) + ' ms Ausgabe.');
  const tip = latHint(R.lat.base + R.lat.out); if (tip) S.push('Tipp: ' + tip);
  S.push('Handy-Modus war ' + (PH.on ? 'an' : 'aus') + (R.ph.load ? ' (davon ' + R.ph.load + ' % der Zeit mit 30 Bildern pro Sekunde)' : '') + '. „Kopieren“ und den Bericht an Claude schicken.');
  return S;
}

/* ---------- the latency's default on Android, its step back, the hint (24.10.2026) ---------- */
// Chrome on Android opens its fast output only for the numeric hint („Minimal“, latencyHint 0 – measured on the owner's
// phone: 2.7 ms buffer + 64 ms output, touch → sound 125 ms; „Standard“ and „Sicher“ alike there: 128 + 260–300 ms, 400–
// 500 ms). So Android starts in „Minimal“; where the device keeps dropping audio in it, Myzel steps back – „Standard“, then
// „Sicher“ – from the next sound start, and says so once. A choice made in „Gerät“ is never touched.
// myzel.lat.v1 {own, auto}: own – chosen by hand; auto – the step this device took. Before the mark every device setting was
// stored with its default, so a stored „Sicher“ on Android (its default until then, from the start) counts as not chosen,
// anything else as chosen (elsewhere: anything but today's default).
const LAT = { own: false, auto: '', quiet: false, said: false, hits: [], dur: null, t0: 0 };
const latAuto = () => ANDROID && !LAT.own;
const LAT_NAME = { min: 'Minimal', std: 'Standard', safe: 'Sicher' };
function latRestore(dv) {
  let m = null; try { m = JSON.parse(store.get('myzel.lat.v1') || 'null'); } catch (e) {}
  const def = PD['dev.lat'].d, was = dv && dv['dev.lat'];
  if (m && typeof m === 'object') { LAT.own = !!m.own; LAT.auto = m.auto === 'std' || m.auto === 'safe' ? m.auto : ''; }
  else LAT.own = !!was && was !== (ANDROID ? 'safe' : def);
  if (!LAT.own) P['dev.lat'] = (ANDROID && LAT.auto) || def;
  if (!HXW.on) latSave();   // (a Werk-Rahmen boots the same page: it only reads)
}
function latSave() { store.set('myzel.lat.v1', JSON.stringify({ own: LAT.own ? 1 : 0, auto: LAT.auto })); }
function latSet(v) { LAT.quiet = true; try { setParam('dev.lat', v); } finally { LAT.quiet = false; } saveState(); }
// (onDeviceChanged: the chips in „Gerät“)
function latChosen() { if (LAT.quiet) return; LAT.own = true; LAT.auto = ''; latSave(); saveState(); }   // (both at once: a reload right after keeps the pair)
function latAutoAgain() { LAT.own = false; LAT.auto = ''; latSave(); latSet(PD['dev.lat'].d); updDevUI(); }
// lasting: within 30 s, 100 ms of audio missing (where the browser tells the duration) or 12 seconds with new underruns
// (by the audio clock only: 4 seconds, each a lag of 25 ms or more); never in the first 5 s after the start – a few
// tiny events at many voices (that phone in „Minimal“: 8 in 20 s at 28 voices and 80 grains, duration ≈ 0) are not
function latWatch(ps, u, last, now) {
  let d = null;
  if (ps) { const x = ps.underrunDuration != null ? ps.underrunDuration * 1000 : ps.fallbackFramesDuration != null ? ps.fallbackFramesDuration : null; if (x != null) { d = LAT.dur != null ? Math.max(0, x - LAT.dur) : 0; LAT.dur = x; } }
  if (!latAuto() || A.latMode === 'safe' || P['dev.lat'] !== A.latMode || now - LAT.t0 < 5000) return false;
  const H = LAT.hits;
  if (u > last) H.push([now, d]);
  while (H.length && now - H[0][0] > 30000) H.shift();
  const ms = H.reduce((a, x) => a + (x[1] || 0), 0);
  if (!(ms >= 100 || H.length >= (ps ? 12 : 4))) return false;
  const to = A.latMode === 'min' ? 'std' : 'safe';
  H.length = 0; LAT.auto = to; latSave(); latSet(to);
  hxGuardLog('latenz', to);
  if (!LAT.said) { LAT.said = true; toast('Der Klang setzte immer wieder aus – ab dem nächsten Klangstart nimmt Myzel die Latenz „' + LAT_NAME[to] + '“ (mehr Reserve, etwas mehr Verzögerung).', 9000, { label: 'Jetzt neu starten', fn: restartAudio }); }
  updDevUI();
  return true;
}
// over ≈ 100 ms from the context to the speaker: „Minimal“ where it is not set, and on Android Firefox (its output path is
// very short there – but it has no MIDI)
function latHint(ms) {
  if (!(ms > 100)) return '';
  let t = '';
  if (P['dev.lat'] !== 'min') t += 'Stell die Latenz auf „Minimal“' + (ANDROID ? ' – auf vielen Android-Handys öffnet erst sie den schnellen Weg.' : '.');
  if (ANDROID && !/Firefox\//.test(navigator.userAgent || '')) t += (t ? ' ' : '') + 'Sehr kurz ist der Weg auch in Firefox – dort aber ohne MIDI.';
  return t ? 'Über 100 ms bis zum Lautsprecher (' + Math.round(ms) + ' ms). ' + t : '';
}

/* ---------- the Handy-Modus: on phones the drawing gets lighter – never the sound ---------- */
// What it changes (all of it the screen's, none of it the sound's – the engines, the voices and every sample stay as they
// are): the field's canvas at 1.5 × the CSS pixels at most (else 2 ×), and while the page shows load – frames late, long
// tasks, the device dropping audio – the field drawn about 30 times a second with its motion stepped twice (the same
// speed and trails; the Ringleiste, the meters and the open panel's frame go with it). Automatic on phones (a coarse
// pointer, not an iPad-sized screen), never on an iPad or a computer; a switch in „Gerät“ sets it either way.
const PH_DPR = 1.5;
const PH = { set: (() => { const v = store.get('myzel.handy'); return v === 'an' || v === 'aus' ? v : 'auto'; })(), on: false, load: false, until: 0, hold: 15000, calmT: 0, hb: [], lt: [], uh: [], u: 0, from: 0, prevTs: 0, timer: 0, obs: null };
const phAuto = () => MOBILE && !HX_TABLET;
function phApply() {
  const on = PH.set === 'an' || (PH.set === 'auto' && phAuto());
  if (on === PH.on) return;
  PH.on = on;
  if (!on) { PH.load = false; PH.hb.length = PH.lt.length = 0; }
  phWatch();
  if (VIS.w) resize();
}
function phSet(v) { PH.set = v; store.set('myzel.handy', v === 'auto' ? '' : v); phApply(); lmUI(); }
// load: frames late (an interval over 25 ms: a frame shown 1.5 frames of 60 Hz or longer: 8 within 3 s), long tasks (2
// within 3 s), the device's underruns (new ones in 2 seconds within 10 s – one glitch is not a load) – they hold the 30
// frames for 15 s, each return within 2 min of a release twice as long (at most 2 min)
function phFrame(ts) {
  const d = PH.prevTs ? ts - PH.prevTs : 0; PH.prevTs = ts;
  if (!d || d > 1000) return;   // (the page was hidden)
  if (LM.on && LM.nR < LM.raf.length) LM.raf[LM.nR++] = d;
  if (PH.on && d > 25 && PH.from && ts > PH.from) PH.hb.push(ts);
}
function phWatch() {
  if (PH.obs) { try { PH.obs.disconnect(); } catch (e) {} PH.obs = null; }
  clearInterval(PH.timer); PH.timer = 0;
  if (!PH.on) return;
  try { if (window.PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) { PH.obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) PH.lt.push(e.startTime); }); PH.obs.observe({ type: 'longtask' }); } } catch (e) { PH.obs = null; }
  PH.timer = setInterval(phTick, 1000);
}
function phTick() {
  const now = performance.now();
  if (!A.started || !A.ctx || A.ctx.state !== 'running' || document.visibilityState !== 'visible') { PH.from = 0; PH.hb.length = PH.lt.length = 0; return; }
  if (!PH.from) { PH.from = now + 5000; PH.u = A.underruns || 0; PH.uh.length = 0; return; }   // (the first seconds after a start or a return load anyway)
  while (PH.hb.length && now - PH.hb[0] > 3000) PH.hb.shift();
  while (PH.lt.length && (now - PH.lt[0] > 3000 || PH.lt[0] < PH.from)) PH.lt.shift();
  const u = A.underruns || 0;
  if (u > PH.u) PH.uh.push(now);
  PH.u = u;
  while (PH.uh.length && now - PH.uh[0] > 10000) PH.uh.shift();
  const why = PH.hb.length >= 8 ? 'bild' : PH.lt.length >= 2 ? 'lang' : PH.uh.length >= 2 ? 'klang' : '';
  if (why) {
    if (!PH.load) { if (now - PH.calmT > 120000) PH.hold = 15000; else PH.hold = Math.min(120000, PH.hold * 2); PH.load = true; PH.why = why; }
    PH.until = now + PH.hold;
  } else if (PH.load && now > PH.until) { PH.load = false; PH.calmT = now; }
}

/* ---------- the section in „Gerät“ ---------- */
function lmBuild() {
  const U = (LM.ui = {});
  U.sw = h('button', { type: 'button', class: 'sw', id: 'phSw', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Handy-Modus', onclick: () => phSet(PH.on ? 'aus' : 'an') }, h('span', { class: 'lab' }, 'Handy-Modus'), h('span', { class: 'knob', 'aria-hidden': 'true' }));
  U.phNote = h('p', { class: 'note' });
  U.auto = h('button', { type: 'button', class: 'btn ghost', id: 'phAuto', hidden: true, onclick: () => phSet('auto') }, 'Wieder automatisch');
  U.go = h('button', { type: 'button', class: 'btn primary', id: 'lmGo', onclick: lmStart }, 'Leistung messen');
  U.st = h('p', { class: 'note live', 'aria-live': 'polite' });
  U.hx = h('p', { class: 'note', id: 'lmHx' });
  U.sum = h('ul', { class: 'help lm-sum', hidden: true });
  U.txt = h('textarea', { class: 'lm-txt', readonly: true, rows: 8, spellcheck: 'false', 'aria-label': 'Bericht' });
  U.copy = h('button', { type: 'button', class: 'btn', id: 'lmCopy', onclick: lmCopy }, 'Kopieren');
  U.rep = h('details', { class: 'plat lm-rep', hidden: true }, h('summary', null, 'Bericht (Text)'), U.txt);
  U.sec = section('Leistung', 'Wie flüssig Myzel auf diesem Gerät läuft',
    h('div', { class: 'ctl wide' }, U.sw), U.phNote, h('div', { class: 'row' }, U.auto), U.hx,
    h('p', { class: 'note' }, 'Leistung messen: ' + LM_SECS + ' Sekunden lang, während du ganz normal spielst (das Panel darf dabei zu sein). Danach steht hier, wo es eng wird, und ein kurzer Bericht zum Kopieren – gesendet wird nichts.'),
    h('div', { class: 'row' }, U.go, U.copy), U.st, U.sum, U.rep);
  lmUI();
  return U.sec;
}
function lmUI() {
  const U = LM.ui; if (!U || !U.sec) return;
  U.sw.setAttribute('aria-checked', String(PH.on));
  const t = 'Handy-Modus: ' + (PH.on ? 'an' : 'aus') + (PH.set === 'auto' ? ' (automatisch)' : ' (von dir eingestellt)') + '. ' +
    (PH.on ? 'Das Feld zeichnet mit geringerer Auflösung und, solange das Gerät ausgelastet ist, 30 statt 60 Bilder pro Sekunde' + (PH.load ? ' – gerade jetzt' : '') + '. Der Klang bleibt genau gleich.'
      : 'Auf Handys schaltet er sich selbst ein; er macht nur das Zeichnen leichter, nie den Klang.');
  if (U.phNote.textContent !== t) U.phNote.textContent = t;
  U.auto.hidden = PH.set === 'auto';
  U.go.disabled = LM.on;
  const st = LM.on ? 'Misst … noch ' + Math.max(0, Math.ceil(LM_SECS - (performance.now() - LM.t0) / 1000)) + ' s – spiel wie immer.' : LM.res ? '' : A.ctx ? '' : 'Erst den Klang starten.';
  if (U.st.textContent !== st) U.st.textContent = st;
  U.copy.hidden = !LM.res;
  U.sum.hidden = U.rep.hidden = !LM.res;
  if (LM.res && U.txt.value !== LM.txt) { U.txt.value = LM.txt; U.sum.replaceChildren(...LM.sum.map((x) => h('li', null, x))); }
}
// (Leistung, 23.10.2026) what the loops take now, live: their share of the budget and what the guard has eased
function lmLive() {
  const U = LM.ui; if (!U || !U.hx) return;
  let t = '';
  if (A.ctx && HX.node && hxLoopsLive().length) {
    const live = hxLoopsLive(), sp = live.filter((L) => L.state === 'spielt').length, c = live.reduce((s, L) => s + hxCostOf(L), 0), G = HX.wGuard, now = performance.now();
    t = 'Schleifen: ' + live.length + ', davon ' + sp + ' spielend – sie belegen ' + dec(c.toFixed(1)) + ' von ' + VBUDGET + ' Einheiten (dazu Humus und Effektkette ' + dec((hxLoad() - c).toFixed(1)) + '; angehaltene kosten nichts).' +
      (G.hold && G.pause > now ? ' Lebendige spielen ihren letzten Durchgang, noch ' + Math.ceil((G.pause - now) / 1000) + ' s.' : G.pause > now ? ' Lebendig wartet, bis Rechenzeit frei ist.' : '') + (HX.tauRest ? ' Taumeln ruht.' : '');
  }
  if (U.hx.textContent !== t) U.hx.textContent = t;
  U.hx.hidden = !t;
}
function lmCopy() {
  if (!LM.txt) return;
  const ok = () => toast('Bericht kopiert – füge ihn im Chat ein.', 3500);
  const no = () => { LM.ui.rep.open = true; LM.ui.txt.focus(); LM.ui.txt.select(); toast('Kopieren ging nicht – der Bericht ist markiert: lange drücken und „Kopieren“.', 6000); };
  try { navigator.clipboard.writeText(LM.txt).then(ok, no); } catch (e) { no(); }
}
