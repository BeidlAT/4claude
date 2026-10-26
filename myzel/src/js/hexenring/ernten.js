// ---- cuts: a window of a Humus ring as a Schicht's audio (frames) – its margins (½ bar with a Takt, else 1 s), the
// Ausklang behind it (≤ HX_TAIL s, until the first foreign onset) ----
function hxCut(inp, w0, w1, o = {}) {
  const m = o.margin != null ? o.margin : hxGrid() ? hxBar() / 2 : 1;
  const pre = Math.round(m * SR), post = Math.round(m * SR), tail = Math.round((o.tail != null ? o.tail : HX_TAIL) * SR);
  const sh = (inp | 0) === 3 && (o.f0 == null || o.tl) ? hxMicRt() : 0;   // (step 4: the Mikro's ring – what was sung to the loops arrived its measured round trip later; a re-cut of its own frames is in that time already)
  const f0 = (o.f0 != null ? o.f0 : Math.round(hxF(w0))) + sh, f1 = (o.f1 != null ? o.f1 : Math.round(hxF(w1))) + sh, len = Math.max(1, f1 - f0);
  return { in: inp | 0, w0: f0, w1: f0 + len, f0: f0 - pre, pre, len, post, n: pre + len + Math.max(post, tail), aus: tail ? { off: pre + len, len: tail } : null };
}
const hxOldestF = () => (HX.node ? HX.fR + (hxNowT() - HX.tR) * SR - P['hx.humus'] * SR + 0.5 * SR : 0);   // (the ring's reach, with a little room)
const hxReach = (c) => !!c && !c.stale && (c.f0 >= hxOldestF() || !!hxHumOf(c));   // (a Schleife restored after a reload: its Humus is gone; 26.10.2026: a Schleife's whole Ernte reaches back as far as it holds)
function hxChunks(n) { const a = [], tr = []; for (let i = 0; i < Math.ceil(Math.max(1, n) / HX_CH); i++) { const L = new Float32Array(HX_CH), R = new Float32Array(HX_CH); a.push([L, R]); tr.push(L.buffer, R.buffer); } return [a, tr]; }
function hxCopy(ch) { const a = [], tr = []; for (const c of ch) { const L = c[0].slice(), R = c[1].slice(); a.push([L, R]); tr.push(L.buffer, R.buffer); } return [a, tr]; }
const hxBytes = (n) => Math.ceil(n / HX_CH) * HX_CH * 8;
// a Schicht filled live from the Humus (its window may still be sounding) – or from audio the page holds (aud): the
// processor gets its own copy either way. o: {seamK (enter at that pass's start) | f (frame) | now, fin, gain, mute,
// join, X, rho, gate, kind, group, key}
function hxSchNew(loop, c, o = {}) {
  const L = HX.loops.get(loop);
  if (!L || !HX.node) return 0;
  const id = ++HX.sid, X = Math.round((o.X || 0.01) * SR);
  // (step 1c: a Gespielt Schicht the chain applies to plays dry on out 1 until its baked version comes – o.bak, at once)
  const chain = o.chain != null ? !!o.chain : hxChainFor(c.in, null), bak = chain && o.bak && !L.folgt ? o.bak : null;
  const d = { loop, id, n: c.n, pre: c.pre, len: c.len, ausklang: c.aus ? { off: c.aus.off, len: c.aus.len } : null, gain: o.mute ? 0 : o.gain != null ? o.gain : 1, join: o.join || 'xf', X,
    rho: o.rho || 0, fin: o.fin != null ? Math.round(o.fin * SR) : undefined, seamK: o.seamK, f: o.f, out: chain && !bak ? 1 : 0, zo: o.zo || 0, kc: (bak ? o.kcB : o.kc) || 0 };
  d.dd = chain && !bak && !L.folgt ? 0 : 1;   // (step 1d: the version to de-drift – a dry one waits for its baked version)
  if (d.out) hxOut1();
  let tr;
  d.tau = hxTauOn(L);   // (phone report: unless the guard let Taumeln rest)
  if (o.aud) { const [cp, t1] = hxCopy(bak || o.aud); d.chunks = cp; tr = t1; if (o.dr) { d.dr = Float32Array.from(o.dr); tr.push(d.dr.buffer); } }
  else {
    const [dst, t1] = hxChunks(c.n), [cp, t2] = hxChunks(c.n);
    d.chunks = dst; d.copy = cp; tr = t1.concat(t2);
    d.fill = { in: c.in, f0: c.f0, gate: o.gate || null };
    d.dr = new Float32Array(Math.ceil(c.n / 128) + 1); d.drc = new Float32Array(d.dr.length); tr.push(d.dr.buffer, d.drc.buffer);   // (the drift it is played with, filled along)
  }
  hxPost({ schicht: d }, tr);
  L.sch.push(id);
  if (L.vb != null || L.ab) hxBandApply(L, id);   // (step 2b: Verblassen and Abrieb for it too, by its own age)
  const S = { id, loop, key: o.key || hxKey('s'), len: c.len, pre: c.pre, n: c.n, cut: c, aus: d.ausklang, join: d.join, X, rho: d.rho, gain: o.gain != null ? o.gain : 1, mute: !!o.mute,
    kind: o.kind || 'ernte', group: o.group || 0, sr: o.sr || SR, aud: o.aud || null, made: Date.now(), saved: 0, live: !o.aud,
    chain, out: d.out, bak: chain ? o.bak || null : null, baked: !!bak, zo: o.zo || 0, kc: o.kc || null, kcB: o.kcB || null, dr: o.dr || null, cold: !!o.cold, cutAus: !!o.cutAus, spliced: !!o.spliced };
  HX.sch.set(id, S);
  hxCount();
  if (!o.aud && o.probe !== false) hxProbe(S);
  if (L.sch.length > 1 && !o.key) hxGuardSet(L, o.seamK != null ? o.seamK : hxPassK(L, Math.round(hxF(hxNowT()))));   // (step 1d: §6.4's guard – three passes)
  return id;
}
// ---- Schleifen: a new one in a slot, with its notes, its Bewegung and how it was cut ----
function hxLoopMake(o) {
  const id = hxLoopNew(o.lock === 'frei' ? { lock: 'frei', len: o.Lf, f0: o.ph0, gain: o.gain, pan: o.pan, out: o.out, state: o.state, gap: o.gap } : { lock: 'takt', b0: o.b0, beats: o.beats, gain: o.gain, pan: o.pan, out: o.out, state: o.state });
  const L = HX.loops.get(id);
  Object.assign(L, { slot: o.slot, key: o.key || hxKey('l'), bpb: o.bpb || 4, notes: o.notes || [], mv: o.mv || null, cut: o.cut || null, eng: o.eng || 'neb', setTG: !!o.setTG,
    gain: o.gain != null ? o.gain : 1, pan: o.pan || 0, made: Date.now(), ps: [], src: o.src || 0, bpm: o.bpm || tgBpm(hxNowT()), lv: [0, 0], taumeln: o.taumeln !== false, folgt: !!o.folgt, eig: HX_EIG.includes(o.eig) ? o.eig : 'treu',
    // (step 2a) Wuchs: why it grows (wahl: hx.beginn for a new one), how it follows, the level it was played at, the patch
    wwhy: o.wwhy ? Object.assign({}, o.wwhy) : { wahl: !o.key && o.eng !== 'bew' && P['hx.beginn'] === 'wuchs' }, ton: o.ton || P['hx.folgen'] || 'fest', klang: o.klang || 'eigen', stufe: o.stufe || null, q: o.q || P['dev.q'], P: o.P || (o.key ? null : Object.assign({}, P)), mask: o.mask || [...HX.mask], chainRec: o.chainRec || null, jrg: o.jrg || { age: A.jrgAge || 0, season: A.season || 0 } });   // (jrg: the Jahresring's year as it was played – a Wuchs pass hits that bar, not today's)
  HX.slot[o.slot] = id;
  if (o.eng !== 'bew' && (!HX.fokus || !HX.loops.has(HX.fokus) || HX.loops.get(HX.fokus).bew)) HX.fokus = id;   // Hexenring: (step 1d) never a Schleife of Bewegung
  if (o.fokus !== false && o.eng !== 'bew') HX.fokus = id;
  hxPersistAsk();
  return L;
}
// the notes of a window as the loop holds them: phase 0…1, the field's column and height, the pitch's place in the
// loop's range (the ring's radius), the source
function hxLoopNotes(evs, t0, dur) {
  const fs = evs.map((e) => Math.log2(e.f)), lo = Math.min(...fs), hi = Math.max(...fs);
  return evs.map((e) => ({ ph: clamp((e.t0 - t0) / dur, 0, 0.9999), x: e.x != null ? e.x : 0.5, y: clamp(e.y0 != null ? e.y0 : 0.5, 0, 1), r: hi > lo ? (Math.log2(e.f) - lo) / (hi - lo) : 0.5,
    v: e.vel, d: e.t1 != null ? Math.min(e.t1 - e.t0, dur) : e.burst ? 0.2 : Math.min(dur, 0.6), deg: e.deg, oct: e.oct, src: e.src, eng: e.eng, f: e.f }));
}
const hxMainEng = (evs) => { const c = {}; for (const e of evs) c[e.eng] = (c[e.eng] || 0) + 1; let b = null; for (const k in c) if (!b || c[k] > c[b]) b = k; return b || P['v.eng']; };
const hxName = (L) => 'Schleife ' + (L.slot + 1);
const hxEngName = (L) => (L.bew ? 'Bewegung' : ENG_NAME[L.eng] || '');
function hxLenText(L) {
  if (!hxTakt(L)) return 'frei · ' + dec(hxLen(L).toFixed(1)) + ' s';
  const bt = +L.d.beats.toFixed(4), bars = +(bt / (L.bpb || 4)).toFixed(4);   // (26.10.2026: a trim's 16.000000000000004 Schläge – 4 Takte)
  return (Number.isInteger(bars) ? bars + (bars === 1 ? ' Takt' : ' Takte') : dec(+bt.toFixed(2)) + ' Schläge') + (L.bpb === 3 ? ' (3er)' : '');
}

// ---- Ernten (KONZEPT §2.3): what a Korb tap at heard time T takes – and where the Schleife enters ----
const hxZiel = () => HX.slot.findIndex((x) => !x);
const hxFok = () => { const L = HX.loops.get(HX.fokus); return L && L.state !== 'weg' && L.slot != null && !L.bew ? L : null; };   // (step 1d: a Schleife of Bewegung is never the Fokus – nothing is overdubbed into it)
function hxSounding(o, now) { return o.t1 != null ? o.t1 : o.held ? now : o.t + 0.25; }
// the phrase that ends at E: its first onset after ≥ 1 s without a note sounding (−Infinity: it never paused)
function hxPhraseStart(ons, E, now) {
  let till = -Infinity, start = -Infinity;
  for (let i = 0; i < ons.length && ons[i].t < E; i++) {
    if (ons[i].t - till >= 1) start = ons[i].t;
    till = Math.max(till, hxSounding(ons[i], now));
  }
  return start;
}
// where a phrase's sound ends after its last onset: the release of its last notes, then the level falling quiet
function hxRingEnd(ons, inp, now) {
  if (!ons.length) return now;
  let e = 0; for (const o of ons) e = Math.max(e, hxSounding(o, now));
  for (let t = e; t < Math.min(now, e + 4); t += 1 / 15) if (hxLvlAt(t, t + 0.2, inp) < HX_LVL_ON) return Math.min(now, t + 0.1);
  return Math.min(now, e + 4);
}
// grid harvests: 1, 2, 4 or 8 bars ending at bar line Eb, scored by phrase boundary, repetition and a little prior
function hxBarsPick(Eb, ons, rep, now) {
  if (P['hx.laenge'] === 'fest') return P['hx.festT'];
  if (P['hx.laenge'] === 'wie1') { const L1 = hxLoopsLive().filter((L) => hxTakt(L)).sort((a, b) => a.made - b.made)[0]; if (L1) return Math.max(1, Math.round(L1.d.beats / 4)); }
  const bar = hxBar(), E = tgTime(Eb), ps = hxPhraseStart(ons, E, now), old = hxT(hxOldestF());
  let best = 1, bs = -Infinity;
  for (const N of [1, 2, 4, 8]) {
    const ws = tgTime(Eb - 4 * N);
    if (ws - bar / 2 < old) continue;
    let s = N === 2 ? 0.3 : N === 4 ? 0.4 : 0;
    if (!ons.some((o) => o.t >= ws - 0.06 && o.t < E)) s -= 5;
    if (rep) { const nb = rep.p / bar, q = N / nb; if (Math.abs(nb - N) / N < 0.15) s += 3; else if (q > 1 && Math.abs(q - Math.round(q)) < 0.15) s += 1.5; }
    // a boundary at its start: the phrase begins in its first bar – or, in a repetition, a cycle begins there
    const cyc = rep && ws >= rep.anchor - 0.06 && (() => { const x = (((ws - rep.anchor) % rep.p) + rep.p) % rep.p; return Math.min(x, rep.p - x) < 0.06; })();
    if ((ps >= ws - 0.06 && ps < ws + bar) || cyc) s += 2;
    else if (ps > -Infinity && ps < ws - 0.06) s -= 2;
    else if (ps === -Infinity) s -= 0.5;
    s -= 0.25 * Math.log2(N);
    if (s > bs) { bs = s; best = N; }
  }
  return best;
}
// the plan: {kind: grid | rep | phrase | schicht | leer | voll | mem, …window (audio times w0, w1), entry, lock …, label}
function hxKorbPlan(T, o = {}) {
  const now = hxNowT(), dies = P['hx.modus'] === 'dieselbe' && hxFok();
  if (dies && !o.loop) { const r = hxRetroPlan(hxFok(), T); return r || { kind: 'leer', label: 'leer' }; }
  if (!dies && hxZiel() < 0) return { kind: 'voll', label: 'voll' };
  const look = Math.max(4, Math.min(P['hx.humus'] - 2, 60)), inp = hxInp();   // (step 4: or the Mikro, while „Korb: Mikro“)
  const evs = hxNotes(T - look, T + 0.001, inp, true).filter((e) => e.t0 >= T - look);
  const ons = hxOnsets(evs); for (const x of ons) if (x.t1 == null) { const e = evs.find((v) => v.t0 === x.t); x.held = !!(e && e.t1 == null && e.hold); }
  const lvl = hxLvlAt(T - 8, T + 0.05, inp);
  if (!ons.length && lvl < HX_LVL_ON) return (!dies && hxBewPlan(T)) || { kind: 'leer', label: 'leer' };   // (step 1d: only movement – a Schleife of Bewegung)
  let rep = hxWiederholung(ons);
  if (!rep) {   // („… or the start“: the phrase's first events come again – its second cycle runs)
    const ps0 = hxPhraseStart(ons, T, now), sub = ons.filter((x) => x.t >= ps0 - 1e-6), r2 = ps0 > -Infinity && hxWiederholung(sub, true);
    if (r2) { const n2 = sub.length; rep = { p: r2.p, m: r2.m, anchor: sub[0].t, last: sub[n2 - 1].t, next: sub[n2 - r2.m] && sub[n2 - r2.m - 1] ? sub[n2 - r2.m].t - sub[n2 - r2.m - 1].t : r2.p / r2.m, evs: sub, start: true }; }
  }
  const last = ons.length ? ons[ons.length - 1].t : -Infinity;
  const fresh = rep && !hxInLoop(rep);
  if (hxGrid()) {
    const bar = hxBar(), stopped = ons.length && T - hxRingEnd(ons, inp, now) >= Math.max(bar, 2);
    let Eb, entry;
    if (stopped) { Eb = Math.ceil(tgBeat(hxRingEnd(ons, inp, now) - 0.05) / 4 - 1e-9) * 4; const nb = Math.ceil(tgBeat(now + HX_LEAD) / 4 - 1e-9) * 4; entry = { b: nb, t: tgTime(nb), now: false, start: true }; }
    else { const B = hxBarOf(T, HX_GRACE); Eb = B.b; entry = { b: B.b, t: B.t, now: B.now }; }
    if (!ons.length) Eb = Math.floor(tgBeat(T) / 4 + 1e-9) * 4;   // (sound without notes – a drone: the bars up to the last bar line)
    const N = ons.length || P['hx.laenge'] === 'fest' ? hxBarsPick(Eb, ons, rep, now) : Math.min(4, Math.max(1, Math.floor((T - hxT(hxOldestF())) / bar)));   // (a fixed length holds for sound without notes too)
    const w0 = tgTime(Eb - 4 * N), w1 = tgTime(Eb);
    return { kind: 'grid', in: inp, w0, w1, b0: entry.start ? entry.b : Eb, beats: 4 * N, bars: N, lock: 'takt', entry, stopped, rep, fresh, evs,
      label: N + ' T' + (fresh ? ' · ' + dec(Math.round(tgBpm(now))) : ''), light: fresh };
  }
  // no Takt: the repetition's cycle, else the phrase up to the tap
  if (rep) {
    const stopped = T - rep.last > rep.next + Math.max(0.3, 0.25 * rep.p);
    let j = Math.floor(((stopped ? rep.last + 1e-3 : T) - rep.anchor) / rep.p);
    if (stopped) { const evIn = ons.filter((x) => x.t >= rep.anchor + j * rep.p - 0.03 && x.t < rep.anchor + (j + 1) * rep.p - 0.03).length; if (evIn < rep.m - 1 && j > 0) j--; }
    const c0 = rep.anchor + j * rep.p;
    // every repetition folded onto one cycle: more onsets for the Takt (a wrap near the end counts at the start)
    const fold = rep.evs.map((x) => { let t = ((x.t - rep.anchor) % rep.p + rep.p) % rep.p; if (t > rep.p - 0.03) t -= rep.p; return Object.assign({}, x, { t }); }).sort((a, b) => a.t - b.t);
    const tk = hxTaktFinden(fold, rep.p), top = tk.cands[0], takt = hxTaktOk(tk);
    const Lr = takt ? hxTaktLen(fold, rep.p, top) : rep.p;
    const w0 = c0, w1 = c0 + Lr, entry = stopped ? { t: now + HX_LEAD, now: false, start: true } : { t: Math.max(w1, now + HX_LEAD), now: false, seam: true };
    return { kind: 'rep', in: inp, w0, w1, lock: takt ? 'takt' : 'frei', tk, top, bars: takt ? top.bars : 0, beats: takt ? top.n : 0, bpb: takt ? top.m : 4, bpm: takt ? (60 * top.n) / Lr : 0, entry, stopped, rep, fresh, evs,
      label: takt ? top.bars + ' T · ' + dec(Math.round((60 * top.n) / Lr)) : 'frei · ' + dec((Lr).toFixed(1)) + ' s', light: fresh };
  }
  const ring = hxRingEnd(ons, inp, now), stopped = ons.length && T - ring >= 2;
  let ps = hxPhraseStart(ons, T, now);
  if (ps === -Infinity) ps = ons.length ? Math.max(ons[0].t, T - look) : T - 8;
  if (!ons.length) { let a = T; while (a > T - 30 && hxLvlAt(a - 1, a, inp) >= HX_LVL_ON) a -= 1; ps = Math.max(a, T - 30); }
  const end = stopped ? ring : T, L0 = Math.max(0.25, end - ps);
  const rel = ons.filter((x) => x.t >= ps - 0.03 && x.t < end).map((x) => Object.assign({}, x, { t: x.t - ps }));
  const tk = hxTaktFinden(rel, L0), top = tk.cands[0], takt = hxTaktOk(tk);
  const Lr = takt ? hxTaktLen(rel, L0, top) : L0;
  return { kind: 'phrase', in: inp, w0: ps, w1: ps + Lr, lock: takt ? 'takt' : 'frei', tk, top, bars: takt ? top.bars : 0, beats: takt ? top.n : 0, bpb: takt ? top.m : 4, bpm: takt ? (60 * top.n) / Lr : 0,
    entry: { t: now + HX_LEAD, now: false, start: true }, stopped, evs, label: takt ? top.bars + ' T · ' + dec(Math.round((60 * top.n) / Lr)) : 'frei · ' + dec(Math.round(Lr)) + ' s', light: false };
}
// is this repetition already in a Schleife? (its degrees, as a cycle, in a loop's notes – or harvested since)
function hxInLoop(rep) {
  const seq = rep.evs.slice(-rep.m).map((x) => x.d[0]), rot = (a) => a.map((_, i) => a.slice(i).concat(a.slice(0, i)).join(','));
  for (const L of hxLoopsLive()) {
    if (L.cut && hxT(L.cut.w1) >= rep.anchor - 0.1) return true;   // harvested from this very playing
    const ls = L.notes.slice().sort((a, b) => a.ph - b.ph).map((n) => n.oct * 64 + n.deg);
    if (ls.length === seq.length && rot(ls).includes(seq.join(','))) return true;
  }
  return false;
}
// the retro Schicht (KONZEPT §2.4): decided in the last ¼ of a pass → this pass, entering at its end (pending); else the
// pass just completed, entering now. Always from the Gespielt ring.
function hxRetroPlan(L, T) {
  if (L.bew) return null;   // Hexenring: (step 1d) a Schleife of Bewegung takes no sound
  const fT = Math.round(hxF(T)), k = hxPassK(L, fT), a = hxPassF(L, k), b = hxPassF(L, k + 1), late = (fT - a) / Math.max(1, b - a) >= 0.75;
  const kk = late ? k : k - 1, f0 = hxPassF(L, kk), f1 = hxPassF(L, kk + 1), c = hxCut(hxInp(), 0, 0, { f0, f1, tl: 1 });   // (step 4: from the Mikro, its round trip later)
  if (!hxReach(c)) return null;
  return { kind: 'schicht', loop: L.id, k: kk, cut: c, pend: late, seamK: late ? k + 1 : null, label: '→ ' + (L.slot + 1), w0: hxT(f0), w1: hxT(f1) };
}

// ---- doing it: a plan becomes a Schleife or a Schicht, with its history step, its pending entry and its chips ----
const hxByKey = (k) => { for (const L of HX.loops.values()) if (L.key === k && L.state !== 'weg') return L; return null; };
const hxSchByKey = (k) => { for (const S of HX.sch.values()) if (S.key === k) return S; return null; };
// a Schleife gives the Takt from audio time t: its exact tempo, the bar line at t (the origin moves – nothing hangs on it yet)
function hxTaktSet(bpm, t) {
  TG.hxOn = true; TG.hx = clamp(+bpm, 20, 300); TG.keep = false;
  if (!SEQ.ext) tgRetempo(TG.hx, Math.max(hxNowT() + TG_LEAD, t));
  if (!SEQ.on && !SEQ.ext) rgRebase(tgRebase(Math.ceil(tgBeat(t) / 4 - 1e-9) * 4, t));
  for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null);
  updDelay();
}
function hxHarvest(plan, o = {}) {
  if (!HX.node || HX.state !== 'ok') { toast('Der Hexenring ist noch nicht bereit.'); return null; }
  if (plan.kind === 'leer') { toast('Im Humus liegt noch nichts – spiel etwas, dann tippe den Korb.', 3500); hxSay('Nichts zu ernten'); return null; }
  if (plan.kind === 'voll') { toast('Alle ' + HX_SLOTS + ' Plätze sind belegt – lösche eine Schleife in ihrer Karte.', 4000); return null; }
  if (plan.kind === 'schicht') return hxRetroDo(plan, o);
  if (plan.kind === 'bew') return hxBewHarvest(plan, o);   // (step 1d)
  // (step 1c: against a running grid – the Puls, a device's clock – the window is read the Spielverzögerung later: the
  // loop sits where you meant to play; its phase shows it)
  const lat = plan.lock === 'takt' && plan.kind === 'grid' && (SEQ.on || (SEQ.ext && CLK.run)) ? hxLat() : 0, pw0 = plan.w0 + lat, pw1 = plan.w1 + lat;
  const c = hxCut(plan.in, pw0, pw1);
  if (!hxReach(c)) { toast('So weit reicht der Humus nicht zurück.'); return null; }
  if (!hxMemOk(c.n)) return null;
  const slot = o.slot != null && !HX.slot[o.slot] ? o.slot : hxZiel(), now = hxNowT();
  let L;
  const evs = (plan.evs || hxNotes(pw0 - 0.03, pw1, plan.in, true)).filter((e) => e.t0 >= pw0 - 0.03 && e.t0 < pw1 - 0.01);
  const base = { slot, cut: c, notes: hxLoopNotes(evs, pw0, pw1 - pw0), eng: hxMainEng(evs), mv: hxMv(pw0, pw1), src: plan.in, plan: plan.kind };
  if (plan.lock === 'takt' && plan.kind !== 'grid') {   // the first Schleife sets the Takt: the bar line at its entry
    hxTaktSet(plan.bpm, plan.entry.t);
    L = hxLoopMake(Object.assign(base, { lock: 'takt', b0: Math.round(tgBeat(plan.entry.t) / 4) * 4, beats: plan.beats, bpb: plan.bpb, setTG: true, bpm: plan.bpm }));
  } else if (plan.lock === 'takt') L = hxLoopMake(Object.assign(base, { lock: 'takt', b0: plan.b0, beats: plan.beats, bpb: 4 }));
  else L = hxLoopMake(Object.assign(base, { lock: 'frei', Lf: c.len, ph0: Math.round(hxF(plan.entry.t)) }));
  L.tk = plan.tk ? plan.tk.cands.slice(0, 6) : null; L.T = o.T != null ? o.T : now;
  if (lat) { L.nudge = -lat; L.lat = lat; }
  if (pw1 > now - 0.05) L.notesDue = pw1;   // (its window still sounding: its notes once it has)
  L.rep = plan.rep || null;   // (step 1d: its repetitions – the Auslese, once the window has sounded)
  const chain = hxChainFor(plan.in, evs);
  const sid = hxSchNew(L.id, c, plan.entry.now ? { fin: 0.01, kind: o.kind || 'ernte', chain } : { seamK: 0, fin: 0, kind: o.kind || 'ernte', chain });
  hxAuftaktLater(L, c, plan.in);
  if (!HXW.p) setTimeout(hxWerk, 0);   // (the Werk-Rahmen boots at the first harvest)
  const key = L.key;
  L.step = { kind: 'neu', label: hxName(L) + ' geerntet', snaps: [], undo() { const X = hxByKey(key); if (X) { this.snaps = [hxSnap(X)]; hxDrop(X); } }, redo() { if (this.snaps[0]) hxRebuild(this.snaps[0]); } };
  hxHist(L.step);
  if (!plan.entry.now && plan.entry.t > now) hxPendAdd({ kind: 'ernte', loop: L.id, t: plan.entry.t, b: plan.entry.b, label: plan.entry.b != null ? 'ab Takt ' + hxBarNo(plan.entry.b) : 'an der Naht',
    cancel: () => hxUnmake(hxByKey(key)) });
  HX.lastHarvest = { key, w0: plan.w0, w1: plan.w1, t: now };
  hxChipsAfter(L, plan, o.T != null ? o.T : now);
  if (L.rep && !L.notesDue) hxAusleseFor(L, L.rep);
  hxCoachDone();
  hxSay(hxName(L) + (plan.entry.now ? ' spielt, ' : ' beginnt ' + (plan.entry.b != null ? 'mit Takt ' + hxBarNo(plan.entry.b) : 'an der Naht') + ', ') + hxLenText(L));
  hxStripSync(); hxCardDirty();
  return L;
}
function hxRetroDo(plan, o = {}) {
  const L = HX.loops.get(plan.loop);
  if (!L) return null;
  if (plan.cut && plan.cut.in === 3 && !hxMicOk(true)) return null;   // (step 4: Bluetooth – no overdub with the microphone)
  if (!hxMemOk(plan.cut.n)) return null;
  const sid = hxSchNew(L.id, plan.cut, plan.pend ? { seamK: plan.seamK, fin: 0, kind: 'retro' } : { fin: 0.01, kind: 'retro' });
  const S = HX.sch.get(sid), lk = L.key, sk = S.key;
  HX.fokus = L.id;
  hxHist(hxSchStep(lk, [sk], 'Schicht in ' + hxName(L)));
  if (plan.pend) hxPendAdd({ kind: 'schicht', loop: L.id, t: hxT(hxPassF(L, plan.seamK)), label: 'am Ende der Runde', cancel: () => { const X = hxSchByKey(sk); if (X) { HX.hist = HX.hist.filter((s) => !(s.sks && s.sks.includes(sk))); hxUndo(X.id); hxSaveMeta(X.loop); } } });
  hxSay('Schicht für ' + hxName(L) + (plan.pend ? ' am Ende der Runde' : ''));
  hxCardDirty();
  return L;
}
// a Schleife that never was: out, and its history step with it (a cancelled wait, a recording made again, a chip)
function hxUnmake(L) { if (!L) return; HX.hist = HX.hist.filter((s) => s !== L.step); hxDrop(L, 0.01); }
// a history step for Schichten added to a loop (one, or a punch's group): undo takes them out at once, redo puts them back
function hxSchStep(lk, sks, label) {
  return { kind: 'schicht', label, sks, snaps: [], undo() { this.snaps = []; for (const k of sks) { const S = hxSchByKey(k); if (S) { this.snaps.push(hxSnapS(S)); hxUndo(S.id); hxSaveMeta(S.loop); } } },
    redo() { const L = hxByKey(lk); if (L) for (const s of this.snaps) hxSchRebuild(L.id, s); } };
}
// ---- pending actions (visible, cancellable by a second tap or ↶) ----
let hxPendN = 0;
function hxPendAdd(p) { p.id = ++hxPendN; HX.pend.push(p); hxRailDirty(); return p; }
function hxPendDrop(p) { HX.pend = HX.pend.filter((x) => x !== p); hxRailDirty(); }
function hxPendTick(now) { const due = HX.pend.filter((p) => p.t <= now); if (due.length) { HX.pend = HX.pend.filter((p) => p.t > now); for (const p of due) if (p.done) p.done(); hxRailDirty(); } }

// ---- the Korb (press-acting): replaces a recording or a wait; a second tap on a pending harvest cancels it, one over
// the same window is a re-cut (never a second loop) ----
function hxKorb(e) {
  if (!A.started || !HX.node) return;
  const T = hxHeard(e), now = hxNowT();
  const pend = HX.pend.find((p) => p.kind === 'ernte');
  if (pend) { hxPendDrop(pend); pend.cancel(); hxSay('Ernte abgebrochen'); return; }
  if (HX.rec) hxRecCancel(true);
  const plan = hxKorbPlan(T), lh = HX.lastHarvest, LL = lh && hxByKey(lh.key);
  if (LL && plan.kind !== 'schicht' && Math.abs(plan.w1 - lh.w1) < 0.06 && now - lh.t < 20) {
    if (Math.abs(plan.w0 - lh.w0) < 0.06) { hxSay(hxName(LL) + ' ist schon geerntet'); toast('Das ist schon ' + hxName(LL) + '.', 1800); return; }
    if (LL.sch.length === 1) { hxRecut(LL, { kind: 'len', w0: plan.w0, w1: plan.w1, beats: plan.beats || undefined, label: 'neu geschnitten' }); return; }
  }
  hxHarvest(plan, { T });
}

