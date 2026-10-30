// ---- the notes Humus (SPEC §5): every voice the player, the Puls, the rain or the Rassel starts, two minutes, the
// objects reused; glides, heights and the release come from the voice's own calls. Probes (the library) and a loop's
// own voices (o.bus = the strip „Hexenring“) are left out, and so is every offline render.
const HX_EV = 32768, HX_EV_S = 900, HX_CV = 256;   // (26.10.2026: as far back as the Humus reaches – 15 min)
// a pitch against the field's scale now: degree, octave above the field's base, alt (semitones off the scale)
function hxDeg(f) {
  const semi = 12 * Math.log2(Math.max(1e-6, f) / N.base);
  if (N.free) { const s = Math.round(semi), o = Math.floor(s / 12); return { deg: s - 12 * o, oct: o, alt: Math.round((semi - s) * 100) / 100, x: clamp(semi / (12 * P['t.range']), 0, 1) }; }
  const per = Math.max(1, Math.round((N.notes.length - 1) / Math.max(1, P['t.range']))), o = Math.floor(semi / 12), r = semi - 12 * o;
  let best = 0, bd = Infinity;
  for (let k = 0; k <= per; k++) { const s = k < per ? N.notes[k].semi : 12, dd = Math.abs(r - s); if (dd < bd) { bd = dd; best = k; } }
  const oc = best === per ? o + 1 : o, dg = best === per ? 0 : best, idx = oc * per + dg;
  return { deg: dg, oct: oc, alt: Math.round((r - (best < per ? N.notes[best].semi : 12)) * 100) / 100, x: idx >= 0 && idx < N.notes.length ? noteX(idx) : null };
}
function hxEvSlot() {
  let e = HX.ev[HX.evI];
  if (!e) e = HX.ev[HX.evI] = { curves: { y: [], f: [], pp: null, mb: null } };
  HX.evI = (HX.evI + 1) % HX_EV;
  e.curves.y.length = 0; e.curves.f.length = 0; e.curves.pp = e.curves.mb = null;
  return e;
}
function hxNote(v, eng, t, f, y, vel, o) {
  if (!v || !A.started || !hxLive()) return;
  const st = o.bus ? MIX.list.find((s) => s.in === o.bus) : MIX.s.fin, src = o.hxSrc || (st ? st.k : 'fin');
  if (src === 'hxr') return;
  if (HX.rec && HX.rec.phase === 'listen' && hxSrcIn(src, 0)) hxRecNote(t);   // (the Hauptknopf listening for the first note)
  const e = hxEvSlot(), id = (e.id = ++HX.evId), n = hxDeg(f);
  e.t0 = t; e.t1 = o.burst ? t + (o.gate != null ? o.gate : 0.22) : null; e.src = src; e.eng = eng; e.f = f; e.deg = n.deg; e.oct = n.oct; e.alt = n.alt; e.x = n.x;
  e.y0 = y; e.vel = vel; e.pan = o.pan || 0; e.layer = EB_OF[src] ? EB_OF[src].n : 1; e.amp = o.amp != null ? o.amp : 1; e.gate = o.gate != null ? o.gate : null; e.burst = !!o.burst; e.probe = false; v.hxE = e;
  e.hold = !!v.release && !o.burst;   // (a voice that can be held; a struck one rings out by itself)
  // a curve as flat [t, x, t, x …], a point at most every 5 ms; a long hold thins to every other point (no voice is kept)
  const pt = (arr, x) => {
    if (e.id !== id) return;
    const t = A.ctx.currentTime, n = arr.length;
    if (n && t - arr[n - 2] < 0.005) { arr[n - 1] = x; return; }
    if (n >= 2 * HX_CV) { let w = 2; for (let r = 4; r < n; r += 4) { arr[w] = arr[r]; arr[w + 1] = arr[r + 1]; w += 2; } arr.length = w; }
    arr.push(t, x);
  };
  if (v.setF) { const sf = v.setF; v.setF = (nf, gl) => { pt(e.curves.f, nf); return sf(nf, gl); }; }
  if (v.setY) { const sy = v.setY; v.setY = (ny) => { pt(e.curves.y, ny); return sy(ny); }; }
  if (v.release) { const rl = v.release; v.release = (k, at) => { if (e.id === id && e.t1 == null) e.t1 = relT(at); return rl(k, at); }; }
}
function hxEvProbe(v) { if (v && v.hxE) v.hxE.probe = true; }
// the Bordun is no voice: its start and end are one event of its own
function hxBor(on, f) {
  if (!A.started || !hxLive()) return;
  if (on) {
    const e = hxEvSlot(), n = hxDeg(f);
    Object.assign(e, { id: ++HX.evId, t0: A.ctx.currentTime, t1: null, src: 'bor', eng: 'bor', f, deg: n.deg, oct: n.oct, alt: n.alt, x: n.x, y0: 0, vel: P['bor.lvl'], pan: 0, layer: 0, amp: 1, gate: null, burst: false, probe: false });
    HX.borE = e;
  } else if (HX.borE) { if (HX.borE.t1 == null) HX.borE.t1 = A.ctx.currentTime; HX.borE = null; }
}
const hxPairs = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
// the notes that sounded in [t0, t1) (started there, or held into it with `held`), oldest first, as plain records
function hxEvents(t0, t1, held) {
  const out = [], old = tgNow() - HX_EV_S;
  for (let i = 0; i < HX_EV; i++) {
    const e = HX.ev[(HX.evI + i) % HX_EV];
    if (!e || e.t0 == null || e.t0 < old || e.probe) continue;
    if (!(e.t0 >= t0 && e.t0 < t1) && !(held && e.t0 < t0 && (e.t1 == null || e.t1 > t0))) continue;
    out.push({ id: e.id, t0: e.t0, t1: e.t1, src: e.src, eng: e.eng, f: e.f, deg: e.deg, oct: e.oct, alt: e.alt, x: e.x, y0: e.y0, vel: e.vel, pan: e.pan, layer: e.layer, amp: e.amp,
      gate: e.gate, burst: e.burst, hold: !!e.hold, curves: { y: hxPairs(e.curves.y), f: hxPairs(e.curves.f), pp: e.curves.pp, mb: e.curves.mb } });
  }
  return out.sort((a, b) => a.t0 - b.t0);
}

// ---- Bewegung (SPEC §5): the Fährte's lanes, always written, are the Humus's movement ring – on the Taktgeber's
// continuous beat (faeB), two minutes at any tempo (FA_RING), a knob in its absolute value (never clamped to Formen's
// ±1). A patch written at once (loadValues: presets, undo, Mutieren, Würfeln) reaches the knob lanes at that moment:
// before, a lane kept the old value until the next touch and a 3 % nudge looped as a jump (Fährte defect D).
function hxMvSync(was) { if (A.started && A.ctx) for (const id in FAE_PAR) if (was[id] !== P[id]) faeP(id, was[id], P[id]); }
// the movement in [t0, t1) as the Bewegung layer of a Schleife will hold it: per lane its steps (FA_R per beat) in
// absolute values – a knob in its own unit (Hz, a share), a Formen source as its deflection
function hxMv(t0, t1) {
  const a = Math.floor(faeB(t0) * FA_R), b = Math.ceil(faeB(t1) * FA_R), lanes = [];
  if (b - a > FA_RING || b <= a) return { a, b, lanes };
  for (const L of FA.lanes.values()) {
    if (L.s == null || L.kind === 'd') continue;
    const d = L.kind === 'p' ? FAE_PAR[L.src] : null, log = d && d[1] === 'log', v = new Float32Array(b - a);
    for (let i = 0; i < b - a; i++) { const x = faeAt(L, a + i); v[i] = log ? Math.pow(2, x) : x; }
    lanes.push({ key: L.key, kind: L.kind, k: L.k, src: L.src, abs: L.kind === 'p', v });
  }
  return { a, b, lanes };
}

/* ---- Step 1b: the grammar (SPEC §6, KONZEPT §2.2–2.5), the Ohr's basics (§12.1 a/b), the Ringleiste (§16) and
   persistence (§19). Everything the player does acts at the press, in the time they heard (heardT); what has to wait
   for a bar line is pending, visible and cancellable. The processor gets every start, entry and swap as a frame of its
   own clock, so nothing here depends on the main thread being on time. ---- */
// (owner, 26.10.2026) 24 Schleifen on the PC, 8 on touch devices
const HX_SLOTS = MOBILE ? 8 : 24, HX_GRACE = 0.25, HX_RGRACE = 0.15, HX_HOLD = 0.5, HX_CLEAR_HOLD = 1.5, HX_CHIP_S = 8, HX_REDO_S = 8, HX_TAIL = 6, HX_LEAD = 0.04;
Object.assign(HX, { slot: new Array(HX_SLOTS).fill(0), fokus: 0, pend: [], hist: [], redo: [], redoT: 0, grave: [], ruht: false, rec: null, punch: null, chips: null,
  segF: [], lvl: [], lvlI: 0, keyN: 0, groupN: 0, page: 0, korb: null, lastHarvest: null, ear: null, earT: 0, saveQ: [], saveBusy: false, saveFail: false, persistAsked: false, restore: null, used: 0 });
const hxKey = (p) => p + Date.now().toString(36) + (++HX.keyN).toString(36);
const hxNowT = () => (A.ctx ? A.ctx.currentTime : 0);
// the audio time the player heard at an event (the press): its own time stamp, minus what is still on its way out
function hxHeard(e) {
  if (!A.ctx) return 0;
  let t = A.ctx.currentTime;
  if (e && e.timeStamp > 0 && A.ctxOff != null) { const te = ctxAt(e.timeStamp); if (te <= t + 0.005 && te > t - 0.5) t = te; }
  return t - (A.ctx.baseLatency || 0) - (A.ctx.outputLatency || 0);
}
// ---- the processor's segments, mirrored: a pass start computed here is the frame the processor acts on ----
function hxSegMirror(out, reset) {
  const s = reset ? [] : HX.segF;
  if (!out.length) return;
  while (s.length && s[s.length - 1][0] >= out[0][0]) s.pop();
  for (const x of out) s.push(x);
  const old = hxF(hxNowT() - 905); let k = 0;
  while (k < s.length - 2 && s[k + 1][0] < old) k++;
  if (k) s.splice(0, k);
  HX.segF = s;
}
function hxFrameAt(b) {
  const s = HX.segF;
  if (!s.length) return hxF(tgCt(b));
  let lo = 0, hi = s.length - 1;
  if (b >= s[hi][1]) lo = hi; else while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m][1] <= b) lo = m; else hi = m - 1; }
  return s[lo][0] + (b - s[lo][1]) * s[lo][2];
}
function hxBeatAtF(f) {
  const s = HX.segF;
  if (!s.length) return tgCb(hxT(f));
  let lo = 0, hi = s.length - 1;
  if (f >= s[hi][0]) lo = hi; else while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m][0] <= f) lo = m; else hi = m - 1; }
  return s[lo][1] + (f - s[lo][0]) / s[lo][2];
}
const hxTakt = (L) => L.d.lock === 'takt';
// pass k's start frame, exactly as the processor derives it; the pass holding frame f. A new geometry waiting for its
// seam (L.prev: the old one, up to pass k / frame until) leaves the passes before it as they are.
function hxPassF(L, k) {
  const d = L.prev && k < L.prev.k ? L.prev.d : L.d;
  return Math.round(d.lock === 'takt' ? hxFrameAt(d.b0 + k * d.beats) : d.ph0 + k * d.L);   // (step 4: a frei length may be fractional – Treffen setzen; rounded as the processor does)
}
function hxPassK(L, f) {
  const d = L.prev && f < L.prev.until ? L.prev.d : L.d;
  let k = d.lock === 'takt' ? Math.floor((hxBeatAtF(f) - d.b0) / d.beats) : Math.floor((f - d.ph0) / d.L);
  for (let g = 0; g < 4 && hxPassF(L, k) > f; g++) k--;
  for (let g = 0; g < 4 && hxPassF(L, k + 1) <= f; g++) k++;
  return k;
}
// a loop's length in seconds now, and its phase (0…1) at audio time t
function hxLen(L, t) { const k = hxPassK(L, hxF(t != null ? t : hxNowT())); return (hxPassF(L, k + 1) - hxPassF(L, k)) / SR; }
function hxPhase(L, t) { const f = hxF(t), k = hxPassK(L, f), a = hxPassF(L, k), b = hxPassF(L, k + 1); return clamp((f - a) / Math.max(1, b - a), 0, 1); }

// ---- the grid: a Takt exists while the Puls runs, a device leads, a Takt Schleife plays, or a kept tempo stays ----
const hxLoopsLive = () => [...HX.loops.values()].filter((L) => L.state !== 'weg' && L.slot != null);
function hxGrid() { return !!(SEQ.on || (SEQ.ext && CLK.run) || hxLoopsLive().some((L) => hxTakt(L)) || (TG.hxOn && TG.keep)); }
const hxBar = () => (4 * 60) / tgBpm(hxNowT());   // a bar's length now (the global clock stays 4/4)
const hxBarNo = (b) => Math.floor(b / 4 + 1e-6) + 1;   // a musical beat's bar, counted from 1
// the bar line a press at heard time T means: the one just passed when it came within ⅛ bar (≤ grace s), else the next
function hxBarOf(T, grace) {
  const b = tgBeat(T), prev = Math.floor(b / 4 + 1e-9) * 4, tp = tgTime(prev);
  return T - tp <= Math.min(hxBar() / 8, grace) ? { b: prev, t: tp, now: true } : { b: prev + 4, t: tgTime(prev + 4), now: false };
}

// ---- what the Humus holds: the notes of the captured sources, the input level ----
// a source's notes count when its sound is in the ring: the Gespielt mask (the Rassel plays on the field's strip)
const hxSrcIn = (src, inp) => inp === 1 || (inp === 3 ? false : inp === 2 ? /^l\d$/.test(src) : HX.mask.has(src) || (src === 'ras' && HX.mask.has('fin')));   // (step 2b: ring 2 – the Puls's lanes; step 4: ring 3 – the Mikro, it holds no notes)
function hxNotes(t0, t1, inp, held) { return hxEvents(t0, t1, held).filter((e) => hxSrcIn(e.src, inp)); }
// onsets merged into events (a chord within 30 ms is one): {t, d: [degree indices], v, f}
function hxOnsets(evs) {
  const out = [];
  for (const e of evs) {
    const di = e.oct * 64 + e.deg, last = out[out.length - 1];
    if (last && e.t0 - last.t < 0.03) { if (!last.d.includes(di)) last.d.push(di); last.v = Math.max(last.v, e.vel); last.f = Math.min(last.f, e.f); continue; }
    out.push({ t: e.t0, d: [di], v: e.vel, f: e.f, t1: e.t1 });
  }
  for (const o of out) o.d.sort((a, b) => a - b);
  return out;
}
// the input level history (15 per second from the processor): is there sound in [t0, t1)?
function hxLvlAt(t0, t1, inp) {
  let pk = 0;
  if ((inp | 0) === 3) { const d = hxMicRt() / SR; t0 += d; t1 += d; }   // (step 4: the Mikro's ring hears a sound its round trip later)
  for (const x of HX.lvl) if (x && x[0] >= t0 && x[0] < t1) pk = Math.max(pk, x[1 + (inp | 0)] || 0);   // (step 2b: ring 2 – the Puls's)
  return pk;
}
const HX_LVL_ON = 0.0018;   // ≈ −55 dBFS RMS: something sounds

