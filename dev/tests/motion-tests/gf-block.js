/* ---------- Fährte: Bewegung wird nie vergessen ---------- */
// Myzel always writes down what shapes the sound, on the beat: every live source of the mod layer (Gestik's own
// functions; any control bound to a Formen target – a wheel, a knob, the X-Y pad, Gestik's axes), the height of the
// newest note (a finger sliding, a keyboard's mod wheel, the X-Y pad as a finger) and the parameters that have a
// counterpart in Formen (filter, ring, Bordun, echo, hall, Schweben, grains, Tropfen; the mixer's A/B morph) when a knob
// or a slider moves them. Each is a lane of values on a grid of 48 steps per beat, 8 bars long – the values as they
// reached the sound (after Ruhezone, Glätte, Kurve and the clutch), placed where the player heard the music while
// moving: earlier by the output's delay, for Gestik also by the sensor's (Klopf-Messung, else an estimate of 40 ms),
// plus a ±20 ms trim.
// A tap on "Fährte" makes the LAST 1, 2 or 4 bars a loop (nothing to arm first): the bars up to the bar line before the
// tap (a tap just before a bar line means that one). Holding records from the next bar line (just after one: from
// that one – it is written down already); holding again while a loop runs plays over it for one pass, added. A double
// tap clears. A loop plays on the mod layer as sources of its own ('fae:…'), laid half a second ahead as points the
// scheduler turns into ramps – sample-exact on the audio targets, and a page that stalls keeps playing them. It lives
// in beats, so it follows the tempo and a device's MIDI clock; live movement adds on top. Verblassen: every pass a
// little weaker (×0.85 by default; 1 = for ever) until it is gone.
// The beat: the Puls's while it runs (an external clock included); while it stands, its own, counted on at the Puls's
// tempo – never jumping: when the Puls starts, a running loop moves onto its bar lines once (by at most half a bar).
// The Puls itself knows nothing of it.
const FA_R = 48, FA_RING = 32 * FA_R, FA_AHEAD = 0.5, FA_END = 0.04, FA_KEY = 'myzel.faehrte.v1';
(() => { try { const o = JSON.parse(store.get(FA_KEY) || 'null'); if (o && typeof o === 'object') for (const k in FA.p) if (k in o) FA.p[k] = o[k]; } catch (e) {} })();
if (![1, 2, 4].includes(FA.p.len)) FA.p.len = 2;
FA.p.fade = clamp(Number(FA.p.fade) || 0.85, 0.3, 1);
FA.p.trim = clamp(Math.round(Number(FA.p.trim) || 0), -20, 20);
FA.p.hin = FA.p.hin === true; FA.p.seen = FA.p.seen === true;
const faeSave = () => store.set(FA_KEY, JSON.stringify(FA.p));
const faeMod = (s, n) => ((s % n) + n) % n;
// the Fährte's beat at audio time t, and the time of a beat
const faeB = (t) => FA.b0 + ((t - FA.t0) * FA.bpm) / 60;
const faeT = (b) => FA.t0 + ((b - FA.b0) * 60) / FA.bpm;
const faeNow = () => ctxAt(performance.now());
// what is written down: Gestik's functions and every binding to Formen (Schlafen is a state, not a movement; the
// Fährte's own sources never)
function faeOk(n) { return (n.startsWith('gk:') && n !== 'gk:slp') || n.startsWith('map:'); }
function faeM(n, k, v, o) {
  if (!A.started) return;
  faeIn('m|' + k + '|' + n, o && o.fae && v ? o.fae.v() : v, 'm', k, n, n.startsWith('gk:') || n.startsWith('map:gestik:'), 0);
}
// the clock, at every scheduler tick: the Puls's beat while it runs (at a fixed distance d: a start or a jump of its
// clock moves the bars, not the Fährte's count), its own while it stands
function faeClock(now) {
  if (FA.t0 == null) { FA.t0 = now; FA.b0 = SEQ.on ? beatAt(now) : 0; FA.bpm = SEQ.on ? SEQ.bpm : seqBpm(); FA.pon = SEQ.on; return; }
  let moved = false;
  if (SEQ.on) {
    const cur = faeB(now);
    if (!FA.pon || Math.abs(beatAt(now) - FA.d - cur) > 0.125) {   // the Puls started, or its clock jumped (Start, a song position)
      FA.d = beatAt(now) - cur;
      const ph = faeMod(-FA.d, 4);
      faeAlign(ph - FA.ph);
      FA.ph = ph;
    }
    const b0 = SEQ.anchorB - FA.d;
    if (FA.t0 !== SEQ.anchorT || FA.b0 !== b0 || FA.bpm !== SEQ.bpm) { FA.t0 = SEQ.anchorT; FA.b0 = b0; FA.bpm = SEQ.bpm; moved = true; }
  } else {
    const bpm = seqBpm();
    if (bpm !== FA.bpm) { FA.b0 = faeB(now); FA.t0 = now; FA.bpm = bpm; moved = true; }
  }
  FA.pon = SEQ.on;
  if (moved && FA.loop) FA.loop.re = true;   // the points ahead are laid again on the new clock
}
// new bar lines: a running loop (and a recording on its way) moves onto them – by less than half a bar
function faeAlign(x) {
  const s = Math.round((faeMod(x + 2, 4) - 2) * FA_R);
  if (!s) return;
  if (FA.loop) { FA.loop.a += s; FA.loop.gs += s / FA_R; FA.loop.re = true; }
  if (FA.win) { FA.win.a += s; FA.win.b += s; }
}
// how far back a movement was heard: the output's delay, for Gestik the sensor's too, and the trim
function faeShift(gk) {
  const c = A.ctx, out = (c.baseLatency || 0) + (c.outputLatency || 0) + graphLatency();
  const sens = gk ? (GK.rem && GK.rem.src.gkr && GK.rem.src.gkr.latS != null ? GK.rem.src.gkr.latS : GK.p.latS != null ? GK.p.latS : 40) / 1000 : 0;
  return out + sens + FA.p.trim / 1000;
}
// the beat the player heard at a moment (performance time)
function faeHeard(pt) { const c = A.ctx; return faeB(ctxAt(pt) - (c.baseLatency || 0) - (c.outputLatency || 0) - graphLatency()); }
// one value of a lane: written at its step, held until the next (as the sound holds it); a parameter's lane starts
// from the value it had before (x0), every other one from rest
function faeIn(key, v, kind, k, src, gk, x0) {
  if (!A.ctx || !Number.isFinite(v)) return;
  let L = FA.lanes.get(key);
  if (!L) {
    if (kind !== 'p' && !v) return;
    if (FA.lanes.size >= 48) faeGc(true);
    L = { key, kind, k, src, gk, buf: new Float32Array(FA_RING), s: null, v: kind === 'p' ? x0 : 0, at: 0 };
    if (L.v) L.buf.fill(L.v);
    FA.lanes.set(key, L);
  }
  if (FA.t0 == null) faeClock(A.ctx.currentTime);
  const s = Math.floor(faeB(faeNow() - faeShift(gk)) * FA_R);
  if (L.s == null) L.s = s - 1;
  if (s > L.s) {
    if (s - L.s > FA_RING) L.buf.fill(L.v);
    else for (let i = L.s + 1; i < s; i++) L.buf[faeMod(i, FA_RING)] = L.v;
    L.s = s;
  }
  L.buf[faeMod(s, FA_RING)] = v; L.v = v; L.at = performance.now();
}
const faeAt = (L, i) => (i > L.s ? L.v : L.buf[faeMod(i, FA_RING)]);
// a parameter moved (setParam, the mixer's morph): its lane, in octaves where it is a frequency or a density
function faeP(id, was, v) {
  if (!A.started || !A.ctx) return;
  const d = FAE_PAR[id], x = (y) => (d && d[1] === 'log' ? Math.log2(Math.max(1e-6, y)) : y);
  faeIn('p|' + id, x(v), 'p', d ? d[0] : 'morph', id, false, x(was));
}
// the height of the newest note against its own at the start (a finger's slide, a keyboard's wheel, the X-Y pad)
function faeY() {
  let nw = null;
  for (const tt of touches.values()) if (!nw || (tt.seq || 0) > (nw.seq || 0)) nw = tt;
  let v = 0;
  if (nw) { if (nw.fy0 == null) nw.fy0 = nw.y; v = clamp((nw.y - nw.fy0) * 2, -1, 1); }
  const L = FA.lanes.get('y');
  if (Math.abs(v - (L ? L.v : 0)) > 1e-3 || (!v && L && L.v)) faeIn('y', v, 'y', 'hoehe', 'y', false, 0);
}
// Gestik's tilt as it acted (for the ghost spore in the Wasserwaage); "Hinlegen wird Schleife": Ruhe takes the bars
// before the phone was put down
function faeGk(out, raw, evs, now) {
  if (!A.started) return;
  for (const [key, v] of [['d|tx', out.tiltX], ['d|ty', out.tiltY]]) {
    const L = FA.lanes.get(key);
    if (Math.abs(v - (L ? L.v : 0)) > 2e-3 || (!v && L && L.v)) faeIn(key, v, 'd', null, key.slice(2), true, 0);
  }
  if (FA.p.hin && raw !== GK_ZERO) for (const e of evs) if (e.type === 'ruhe' && e.on && A.ctx) faeTake(faeHeard(now - 2200), 'hin', FA.p.len);
}
gkSub(faeGk);
// lanes nothing wrote to for a whole ring go (a parameter's too: it is constant there)
function faeGc(force) {
  const now = performance.now(), keep = (32 * 60000) / Math.max(20, FA.bpm);
  for (const [key, L] of FA.lanes) if (now - L.at > keep && (L.kind === 'p' || !L.v)) FA.lanes.delete(key);
  if (force && FA.lanes.size >= 48) { let o = null; for (const L of FA.lanes.values()) if (!o || L.at < o.at) o = L; if (o) FA.lanes.delete(o.key); }
}
// the mixer's morph as a deflection from where it stands at the end (toward B +, toward A −, on mp()'s scale)
const faeMorphRel = (x, e) => (x > e ? (e < 0.999 ? (x - e) / (1 - e) : 0) : x < e ? (e > 0.001 ? -(e - x) / e : 0) : 0);
// the steps [a, b) as a loop: every lane that moved (a parameter's relative to its value at the end, so the knob's
// position now is the loop's rest); Gestik's tilt only for the ghost spore. null: nothing moved.
function faeCut(a, b) {
  const n = b - a, lanes = [];
  let disp = null;
  for (const L of FA.lanes.values()) {
    if (L.s == null) continue;
    const v = new Float32Array(n);
    let mx = 0;
    if (L.kind === 'p') {
      const xe = faeAt(L, b - 1), d = FAE_PAR[L.src];
      for (let i = 0; i < n; i++) { const x = faeAt(L, a + i); v[i] = d ? (x - xe) * d[2] : faeMorphRel(x, xe); }
    } else for (let i = 0; i < n; i++) v[i] = faeAt(L, a + i);
    for (let i = 0; i < n; i++) if (Math.abs(v[i]) > mx) mx = Math.abs(v[i]);
    if (mx < 1e-3) continue;
    if (L.kind === 'd') { (disp || (disp = {}))[L.src] = v; continue; }
    lanes.push({ k: L.k, src: L.kind === 'p' ? 'p:' + L.src : L.src, v });
  }
  return lanes.length ? { lanes, disp } : null;
}
// a lane's way of reaching the notes, as its source had it (Höhe's shares, Bebung's cents, Tonhöhe to the neighbour step)
function faeOpts(src) {
  if (!src.startsWith('gk:')) return null;
  const r = GKR.get(src.slice(3)), o = r && r.opts;
  return o ? (o.fae ? { per: o.fae.per } : { per: o.per, older: o.older }) : null;
}
// a loop: position 0 at step a, n steps long; full strength (g0) at beat gs, from there weaker every pass
function faeRun(cut, a, n, gs, g0, why) {
  modClear('fae:*');
  FA.loop = { a, n, len: n / FA_R, gs, g0: g0 == null ? 1 : g0, why, next: null, re: true, t: performance.now(), disp: cut.disp || null,
    lanes: cut.lanes.map((x) => ({ k: x.k, src: x.src, v: x.v, name: 'fae:' + x.k + '|' + x.src, o: Object.assign({ at: 0 }, faeOpts(x.src)) })) };
  if (!FA.p.seen) { FA.p.seen = true; faeSave(); }
  if (A.ctx && A.ctx.state === 'running') faeLay(A.ctx.currentTime, A.ctx.currentTime + FA_AHEAD);
  faeUI();
}
const faeGain = (L, b) => (b <= L.gs ? L.g0 : L.g0 * Math.pow(FA.p.fade, (b - L.gs) / L.len));
// The loop's points from where it stands up to `until` (half a second ahead): one per step and lane, at the time of
// its beat; laid again from now when the clock changed. A loop whose strength fell below 4 % is gone.
function faeLay(now, until) {
  const L = FA.loop, sA = Math.ceil(faeB(now) * FA_R), sB = Math.floor(faeB(until) * FA_R);
  let s = L.re || L.next == null ? sA : Math.max(L.next, sA);
  L.re = false;
  for (; s <= sB; s++) {
    const b = s / FA_R, g = faeGain(L, b);
    if (g < FA_END) { faeEnd(); return; }
    const t = faeT(b), p = faeMod(s - L.a, L.n);
    for (const ln of L.lanes) { ln.o.at = t; modSet(ln.name, ln.k, ln.v[p] * g, ln.o); }
  }
  L.next = s;
  // points behind the clock go (the audio targets drop theirs themselves); the one just before now stays
  for (const ln of L.lanes) { const e = MOD.t[ln.k].s.get(ln.name); if (e && e.p) while (e.p.length > 2 && e.p[1][0] < now - 0.1) e.p.shift(); }
}
function faeEnd() { FA.loop = null; modClear('fae:*'); faeUI(); }
function faeClear(say) {
  const had = !!(FA.loop || FA.win || FA.pend);
  FA.loop = null; FA.win = null; FA.pend = null; FA.tapT = 0; clearTimeout(FA.tapTm);
  modClear('fae:*');
  faeUI();
  if (say && had) toast('Fährte gelöscht.', 1800);
}
// all that is written down has reached `b` (the beat): the slowest lane is Gestik's, behind by the sensor's delay
const faeReady = (b) => faeB(faeNow() - faeShift(true)) >= b - 1e-6;
// The scheduler's part (every 25 ms): the clock, the finger's height, a tap or a recording to finish, the loop's points
function faeTick(horizon) {
  const now = A.ctx.currentTime;
  faeClock(now);
  faeY();
  if (FA.pend && performance.now() >= FA.pend.at && faeReady(FA.pend.e)) faePend();
  if (FA.win && faeReady(FA.win.b / FA_R)) faeWin();
  if (FA.loop) faeLay(now, Math.max(horizon, now + FA_AHEAD));
  const pt = performance.now();
  if (pt - FA.uiT > 250) { FA.uiT = pt; faeUI(); if (FA.lanes.size && pt - FA.gT > 2000) { FA.gT = pt; faeGc(false); } }
}
// a tap (or Hinlegen): the bars before the bar line at the heard beat bh become the loop – once all is written down
function faeTake(bh, why, bars) {
  if (!A.started || !A.ctx) return;
  if (FA.t0 == null) faeClock(A.ctx.currentTime);
  let E = FA.ph + 4 * Math.floor((bh - FA.ph) / 4);
  if (E + 4 - bh < 0.25) E += 4;   // a tap just before a bar line means that one
  FA.pend = { e: E, bars, why, at: 0 };
  faeUI();
}
function faePend() {
  const q = FA.pend, b = Math.round(q.e * FA_R), n = q.bars * 4 * FA_R;
  FA.pend = null;
  const cut = faeCut(b - n, b), one = q.bars === 1;
  if (!cut) { if (q.why !== 'hin') toast('Fährte: ' + (one ? 'im letzten Takt' : 'in den letzten ' + q.bars + ' Takten') + ' hat sich nichts bewegt, was den Klang formt.', 3500); faeUI(); return; }
  faeRun(cut, b - n, n, b / FA_R, 1, q.why);
  const what = one ? 'der letzte Takt läuft' : 'die letzten ' + q.bars + ' Takte laufen';
  toast(q.why === 'hin' ? 'Hingelegt – ' + what + ' als Fährte.' : 'Fährte: ' + what + ' als Schleife.', 2600);
}
// a recording (hold) or a pass over the loop (hold while it runs) is through
function faeWin() {
  const w = FA.win, L = FA.loop;
  FA.win = null;
  const cut = faeCut(w.a, w.b);
  if (w.od && L && L.n === w.b - w.a) {
    if (cut) faeDub(L, cut, w);
    faeUI(); toast(cut ? 'Fährte: darübergespielt.' : 'Fährte: nichts dazugekommen.', 2200);
    return;
  }
  if (!cut) { toast('Fährte: in der Aufnahme hat sich nichts bewegt, was den Klang formt.', 3500); faeUI(); return; }
  faeRun(cut, w.a, w.b - w.a, w.b / FA_R, 1, 'hold');
  toast('Fährte: die Aufnahme läuft als Schleife.', 2200);
}
// over the loop: what played (as strong as it is at the pass's end) plus what came live, full strength from there
function faeDub(L, cut, w) {
  const n = L.n, gE = faeGain(L, w.b / FA_R), off = faeMod(w.a - L.a, n), by = new Map();
  for (const ln of L.lanes) { const v = new Float32Array(n); for (let p = 0; p < n; p++) v[p] = ln.v[p] * gE; ln.v = v; by.set(ln.name, ln); }
  for (const x of cut.lanes) {
    const name = 'fae:' + x.k + '|' + x.src;
    let ln = by.get(name);
    if (!ln) { ln = { k: x.k, src: x.src, v: new Float32Array(n), name, o: Object.assign({ at: 0 }, faeOpts(x.src)) }; L.lanes.push(ln); }
    for (let i = 0; i < n; i++) ln.v[faeMod(off + i, n)] += x.v[i];
  }
  const D = {};
  for (const k of ['tx', 'ty']) {
    const o = L.disp && L.disp[k], c = cut.disp && cut.disp[k];
    if (!o && !c) continue;
    const v = (D[k] = new Float32Array(n));
    for (let p = 0; p < n; p++) v[p] = o ? o[p] * gE : 0;
    if (c) for (let i = 0; i < n; i++) v[faeMod(off + i, n)] += c[i];
  }
  L.disp = Object.keys(D).length ? D : null;
  L.g0 = 1; L.gs = w.b / FA_R; L.re = true; L.why = 'od';
}
// The button (and a learned pad): tap, hold (400 ms), double tap (two presses within 400 ms). A tap waits that long
// before it takes – the second tap of a double one must not leave a loop behind; the bars it takes are the ones heard
// at the press.
function faePress() {
  if (!A.started) return;
  const t = performance.now();
  FA.down = t;
  clearTimeout(FA.holdTm);
  FA.holdTm = setTimeout(() => { if (FA.down !== t) return; FA.down = 0; faeHold(t); }, 400);
}
function faeRelease(cancel) {
  const t = FA.down;
  if (!t) return;   // a hold acted already (or nothing was pressed)
  FA.down = 0; clearTimeout(FA.holdTm);
  if (!cancel) faeTap(t);
}
function faeTap(t) {
  if (!A.ctx) return;
  if (FA.tapT && t - FA.tapT < 400) { FA.tapT = 0; clearTimeout(FA.tapTm); faeClear(true); return; }   // the second tap: clear
  FA.tapT = t;
  clearTimeout(FA.tapTm);
  if (FA.win) { FA.win = null; faeUI(); toast('Fährte: Aufnahme abgebrochen.', 1800); return; }
  const bh = faeHeard(t), bars = FA.p.len;
  FA.tapTm = setTimeout(() => { FA.tapT = 0; faeTake(bh, 'tap', bars); }, 400);
}
// hold: record from the bar line at or after the press (just after one: that one), for the chosen length – or, while a
// loop runs, one pass over it
function faeHold(t) {
  if (!A.started || !A.ctx) return;
  clearTimeout(FA.tapTm); FA.tapT = 0; FA.pend = null;
  if (FA.t0 == null) faeClock(A.ctx.currentTime);
  const bh = faeHeard(t == null ? performance.now() : t), k = Math.floor((bh - FA.ph) / 4);
  const S = bh - (FA.ph + 4 * k) < 0.25 ? FA.ph + 4 * k : FA.ph + 4 * (k + 1);
  const L = FA.loop, a = Math.round(S * FA_R);
  FA.win = { a, b: a + (L ? L.n : FA.p.len * 4 * FA_R), od: !!L };
  faeUI();
}
// Verblassen changed: the loop goes on from the strength it has now
function faeFade(v) {
  const L = FA.loop;
  if (L && A.ctx) { const b = faeB(A.ctx.currentTime); L.g0 = faeGain(L, b); L.gs = b; L.re = true; }
  FA.p.fade = v; faeSave(); faeUI();
}
// what the button and the section say: '' (writes down), pend (a tap is being taken), arm / oda (waits for the bar
// line), rec / od (recording, playing over), play
function faeState() {
  const w = FA.win;
  if (w) { const s = A.ctx ? faeHeard(performance.now()) * FA_R : 0; return s < w.a ? (w.od ? 'oda' : 'arm') : w.od ? 'od' : 'rec'; }
  return FA.pend || FA.tapT ? 'pend' : FA.loop ? 'play' : '';
}
const FAE_ST = { '': 'tippen – die letzten Takte werden zur Schleife; halten – ab dem nächsten Takt aufnehmen; doppelt tippen – löschen', pend: 'nimmt die letzten Takte …',
  arm: 'nimmt ab dem nächsten Takt auf', rec: 'nimmt auf', oda: 'spielt ab dem nächsten Takt darüber', od: 'spielt darüber', play: 'läuft – tippen: neu aus den letzten Takten; halten: darüberspielen; doppelt tippen: löschen' };
// what is being written down now (moved in the last two bars), in the names of the panel
function faeNames() {
  const now = performance.now(), recent = (8 * 60000) / Math.max(20, FA.bpm), out = [];
  for (const L of FA.lanes.values()) {
    if (L.kind === 'd' || now - L.at > recent) continue;
    const n = L.kind === 'y' ? 'Fingerhöhe' : L.kind === 'p' ? (L.src === 'morph' ? 'A/B-Morph' : PD[L.src].label) : MODT[L.k].label.replace(/ \(.*$/, '');
    if (!out.includes(n)) out.push(n);
  }
  return out;
}
const faeTakte = (n) => n + (n === 1 ? ' Takt' : ' Takte');
function faeText() {
  const st = faeState(), w = FA.win, L = FA.loop;
  if (st === 'arm') return 'Nimmt ab dem nächsten Takt ' + faeTakte((w.b - w.a) / (4 * FA_R)) + ' auf …';
  if (st === 'oda') return 'Spielt ab dem nächsten Takt einen Durchgang darüber …';
  if (st === 'rec' || st === 'od') {
    const n = (w.b - w.a) / (4 * FA_R), k = clamp(1 + Math.floor((faeHeard(performance.now()) * FA_R - w.a) / (4 * FA_R)), 1, n);
    return (st === 'od' ? 'Spielt darüber' : 'Nimmt auf') + ' – Takt ' + k + ' von ' + n;
  }
  if (st === 'pend') return 'Nimmt die letzten ' + faeTakte(FA.p.len) + ' …';
  if (L) return 'Fährte läuft · ' + faeTakte(Math.round(L.len / 4)) + ' · ' + (FA.p.fade >= 1 ? 'ewig' : Math.round(clamp(faeGain(L, faeB(A.ctx.currentTime)), 0, 1) * 100) + ' %') + ' · Live kommt obendrauf';
  const names = faeNames();
  return names.length ? 'Schreibt mit: ' + names.join(', ') : 'Schreibt mit, sobald etwas den Klang formt – Gestik, ein Regler auf „Formen“, die Fingerhöhe, Filter, Echo und Hall.';
}
// the bar's button: shown once there is something to loop with (Gestik, a controller) or it was used; its ring is the
// loop's run through its bars
function faeUI() {
  const b = FA.btn || (FA.btn = $('#btnFae'));
  if (b) {
    const show = !!(A.started && (GK.on || MIDI.ports.size || BLE.devs.size || FA.loop || FA.win || FA.p.seen));
    if (b.hidden === show) { b.hidden = !show; b.parentNode.classList.toggle('fae', show); }
    const st = faeState();
    if (b.dataset.st !== st) { b.dataset.st = st; const t = 'Fährte: ' + FAE_ST[st]; b.title = t; b.setAttribute('aria-label', t); }
  }
  if (FA.sec && FA.sec.el.isConnected) faeSecSync();
  if (GK.card) gkFaeSync(GK.card);
}
function faeFrame(ts) {
  const b = FA.btn, L = FA.loop;
  if (!b || b.hidden || ts - (b.ft || 0) < 50) return;
  b.ft = ts;
  const v = L && A.ctx ? Math.round((faeMod(faeB(A.ctx.currentTime) * FA_R - L.a, L.n) / L.n) * 100) : 0;
  if (b.fv !== v) { b.fv = v; (b.ring || (b.ring = b.querySelector('.ph'))).setAttribute('stroke-dasharray', v + ' 100'); }
}
// press and hold on a button: pointer or keyboard (a long press is a hold, never the context menu)
function faeWire(el) {
  el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (err) {} faePress(); });
  el.addEventListener('pointerup', () => faeRelease(false));
  el.addEventListener('pointercancel', () => faeRelease(true));
  el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); faePress(); } });
  el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); faeRelease(false); } });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
// learnable: the button itself (tap, hold, double tap on a pad), and its three actions on their own
midiTarget('fae', 'Fährte (tippen: letzte Takte · halten: aufnehmen · doppelt: löschen)', null, { group: 'Fährte', press: () => faePress(), release: () => faeRelease(false) });
midiTarget('fae.take', 'Fährte: die letzten Takte als Schleife', (v) => { if (v >= 0.5 && A.ctx) faeTake(faeHeard(performance.now()), 'pad', FA.p.len); }, { group: 'Fährte', button: true });
midiTarget('fae.rec', 'Fährte: ab dem nächsten Takt aufnehmen', (v) => { if (v >= 0.5) faeHold(); }, { group: 'Fährte', button: true });
midiTarget('fae.clear', 'Fährte löschen', (v) => { if (v >= 0.5) faeClear(true); }, { group: 'Fährte', button: true });

/* ---------- Fährte in presets and scenes ---------- */
// A loop as data: its lanes as 16-bit values (±8 in steps of 1/4096) in base64, the length, how strong it was. A loaded
// loop starts on the current bar, as strong as it was saved.
function faeEnc(v) {
  const q = new Int16Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.round(clamp(v[i], -7.99, 7.99) * 4096);
  const u = new Uint8Array(q.buffer);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function faeDec(s, n) {
  try {
    const b = atob(String(s));
    if (b.length !== 2 * n) return null;
    const u = new Uint8Array(2 * n);
    for (let i = 0; i < u.length; i++) u[i] = b.charCodeAt(i);
    const q = new Int16Array(u.buffer), v = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = q[i] / 4096;
    return v;
  } catch (e) { return null; }
}
function faeExport() {
  const L = FA.loop;
  if (!L) return null;
  const g = A.ctx ? faeGain(L, faeB(A.ctx.currentTime)) : L.g0, disp = {};
  if (L.disp) for (const k in L.disp) disp[k] = faeEnc(L.disp[k]);
  return { v: 1, R: FA_R, n: L.n, g: Math.round(clamp(g, FA_END, 1) * 1000) / 1000, lanes: L.lanes.map((ln) => ({ k: ln.k, s: ln.src, d: faeEnc(ln.v) })), disp };
}
function faeDecode(o) {
  if (!o || typeof o !== 'object' || o.v !== 1 || o.R !== FA_R || !Number.isInteger(o.n) || o.n < FA_R || o.n > 64 * FA_R || !Array.isArray(o.lanes)) return null;
  const lanes = [];
  for (const l of o.lanes) {
    if (!l || !MODT[l.k] || typeof l.s !== 'string') continue;
    const v = faeDec(l.d, o.n);
    if (v) lanes.push({ k: l.k, src: l.s, v });
  }
  if (!lanes.length) return null;
  let disp = null;
  if (o.disp && typeof o.disp === 'object') for (const k of ['tx', 'ty']) { const v = o.disp[k] && faeDec(o.disp[k], o.n); if (v) (disp || (disp = {}))[k] = v; }
  return { lanes, disp, n: o.n, g: clamp(Number(o.g) || 1, FA_END, 1) };
}
// a saved loop plays (null: none – the running one stops)
function faeImport(o, why) {
  if (!o) { faeClear(false); return true; }
  const d = faeDecode(o);
  if (!d || !A.ctx) return false;
  if (FA.t0 == null) faeClock(A.ctx.currentTime);
  const b = faeB(A.ctx.currentTime), bar = FA.ph + 4 * Math.floor((b - FA.ph) / 4);
  FA.win = FA.pend = null;
  faeRun(d, Math.round(bar * FA_R), d.n, b, d.g, why);
  return true;
}
// User presets (format 2) keep the loop and Gestik's settings. Loading one: its loop (or none) plays; its Gestik
// settings act while Gestik is on (the user's opt-in; "Rezepte der Presets" off keeps the own). Presets of format 1
// and the built-in ones know nothing of either: what runs goes on.
const GK_PRESET = ['neigen', 'seit', 'viele', 'beb', 'platz', 'tragen', 'lad', 'entl', 'ras', 'rasS', 'rasQ', 'tank', 'sw', 'schlaf', 'slArt'];
function presetExtra() {
  const gk = {};
  for (const k of GK_PRESET) gk[k] = GK.p[k];
  return { fmt: 2, fae: faeExport(), gk };
}
function presetExtraLoad(p) {
  if (!p || !(p.fmt >= 2)) return;
  if ('fae' in p) faeImport(p.fae, 'preset');
  if (p.gk && typeof p.gk === 'object' && GK.on && GK.p.rez !== false) {
    for (const k of GK_PRESET) if (k in p.gk) GK.p[k] = p.gk[k];
    gkCheck(); gkSave();
    if (GK.R) GK.R.set({ entl: GK.p.entl });
    gkUpdate(performance.now(), []);
    gkCardSync();
  }
}
// The mixer's scenes: storing A or B while a loop runs keeps it with the scene; going to that scene (its side of the
// morph, as every choice flips at half way) brings it back. A scene stored without a loop leaves the Fährte alone.
function faeSceneStore(which) {
  const F = MX.snap.fae || (MX.snap.fae = {});
  const prev = F[which];
  if (FA.loop) F[which] = faeExport(); else delete F[which];
  return prev;
}
function faeScene(which) {
  const o = MX.snap.fae && MX.snap.fae[which];
  if (o && faeImport(o, 'scene')) toast('Szene ' + which.toUpperCase() + ' bringt ihre Fährte mit.', 2400);
}

/* ---------- Funkstrecke: das Handy als Sensor für Myzel am Computer ---------- */
// "Gestik als MIDI senden": the phone computes its gestures itself (zero, Bebung, Ladung, Lagen) and sends only what
// comes out of that, on a MIDI output of its choice – a phone in USB-MIDI mode to a computer, or any synth or DAW.
// The numbers are fixed (any music program can use them): MIDI channel 16, NRPN 42/n with 14 bits –
//   42/0 Neigen ↔ in degrees, right edge down + (±180° on 0 … 16383, 8192 = 0°: before Ruhezone and Weite, so the
//        receiver applies its own zero and Weite), 42/1 Neigen ↕ in degrees, top edge away +,
//   42/2 Bebung and 42/3 Drehen (−1 … 1, 8192 = 0), 42/4 Ladung (0 … 1),
//   42/5 Schwenken's store (0 … 1), 42/6 how fast it circles (0 … 4 Hz), 42/7 which way (−1 … 1),
//   42/8 the sensor's delay in ms (Klopf-Messung, once a second while measured),
//   42/127 the signature, ten times a second while the sensor answers: data MSB 71 ("G"), LSB bit 0 gyroscope, bit 1
//          acceleration;
// events as notes on channel 16: 48 Wenden, 49 Ruhe, 50 Schütteln (on while it lasts; velocity = strength),
// 51 each swing of a shake (velocity = strength, off at once), 52 a new zero. An axis goes out only when it changed,
// at most 100 times a second; its newest value always arrives.
// Receiving: any input (Web MIDI or Bluetooth) whose channel 16 carries the signature gets the profile "Gestik
// (Handy)": its NRPNs and notes never reach the standard map, the pedals or the keys – they become Gestik on this
// computer (switched on for as long as they come, with no sensor of its own): Anlehnen, Ladung, Schlafen, Fährte …
// with this computer's notes as the clutch, its own zero (subtracted in degrees) and its own Weite.
// Untested on real phones: whether a phone in USB-MIDI mode gets an output depends on the phone (the card says so).
const GKF = { ch: 15, msb: 42, hb: 127, sig: 71, note: 48, lat: 8, n: 8 };
const GKF_RNG = [[-180, 180], [-180, 180], [-1, 1], [-1, 1], [0, 1], [0, 1], [0, 4], [-1, 1]];
const gkfPack = (i, v) => { const r = GKF_RNG[i]; return clamp(Math.round(r[0] < 0 ? 8192 + (clamp(v, r[0], r[1]) / r[1]) * 8191 : ((clamp(v, r[0], r[1]) - r[0]) / (r[1] - r[0])) * 16383), 0, 16383); };
const gkfUnpack = (i, q) => { const r = GKF_RNG[i]; return r[0] < 0 ? (clamp(q - 8192, -8191, 8191) / 8191) * r[1] : r[0] + (q / 16383) * (r[1] - r[0]); };
const GKF_UNTESTED = 'Ungetestet: ob dein Handy im USB-MIDI-Modus einen Ausgang bekommt, hängt vom Gerät ab. Wenn hier kein Ausgang erscheint, geht es (noch) nicht.';
// the sender: what went out last per axis (q, t), axes waiting for their 10 ms (pend), the signature's last time (hb),
// beats sent (nb), events held on (on), messages counted for the rate
const GKS = { q: new Int32Array(GKF.n).fill(-1), t: new Float64Array(GKF.n), pend: 0, hb: 0, nb: 0, on: [false, false, false], zero: false, n: 0, nT: 0, rate: 0, o: null };
// the chosen output (by its name: port ids differ between sessions)
function gkfOut() {
  const nm = GK.p.fs;
  if (!nm) return null;
  for (const o of MIDI.outs.values()) if (o.port && (o.name === nm || sameDev(o.name, nm))) return o;
  return null;
}
const gkfSending = () => !!(GK.p.fs && GK.on && GK.live && !GK.rem && GK.R && !GK.R.rem);
function gkfMsg(o, n, q) {
  const c = 0xb0 | GKF.ch;
  midiSend(o, [c, 99, GKF.msb, c, 98, n, c, 6, q >> 7, c, 38, q & 127]);
  GKS.n++;
}
function gkfNote(o, i, on, v) { midiSend(o, on ? [0x90 | GKF.ch, GKF.note + i, clamp(Math.round(1 + 126 * clamp(v == null ? 1 : v, 0, 1)), 1, 127)] : [0x80 | GKF.ch, GKF.note + i, 0]); }
function gkfVals() {
  const st = GK.R.st, r = GK.raw;
  return [st.roll, -st.pitch, r.bebung, r.drehen, r.ladung, st.sw || 0, st.swHz || 0, st.swDir || 0];
}
// after every Gestik update: the signature first, then what changed, the events
function gkfSub(out, raw, evs, now) {
  if (!gkfSending()) return;
  const o = gkfOut();
  if (o !== GKS.o) { gkfStop(); GKS.o = o; }
  if (!o) return;
  if (!GKS.hb) gkfBeat(o, now);
  gkfAxes(o, now);
  for (const e of evs) {
    const i = GK_EV.indexOf(e.type);
    if (i >= 0) { if (GKS.on[i] !== e.on) { GKS.on[i] = e.on; gkfNote(o, i, e.on, e.v); } }
    else if (e.type === 'peak') { gkfNote(o, 3, true, e.v); gkfNote(o, 3, false); }
    else if (e.type === 'zero') GKS.zero = true;
  }
  if (GKS.zero) { GKS.zero = false; gkfNote(o, 4, true, 1); gkfNote(o, 4, false); }
}
function gkfAxes(o, now) {
  const v = gkfVals();
  for (let i = 0; i < GKF.n; i++) {
    const q = gkfPack(i, v[i]), bit = 1 << i;
    if (q === GKS.q[i]) { GKS.pend &= ~bit; continue; }
    if (now - GKS.t[i] >= 10) { gkfMsg(o, i, q); GKS.q[i] = q; GKS.t[i] = now; GKS.pend &= ~bit; } else GKS.pend |= bit;
  }
}
// the signature ten times a second (the receiver's sign of life), the sensor's delay once a second, waiting axes
function gkfBeat(o, now) {
  const st = GK.R.st;
  gkfMsg(o, GKF.hb, (GKF.sig << 7) | (st.gyro ? 1 : 0) | (GK.dmSeen ? 2 : 0));
  GKS.hb = now;
  if (GK.p.latS != null && GKS.nb++ % 10 === 0) gkfMsg(o, GKF.lat, clamp(Math.round(GK.p.latS), 0, 16383));
}
function gkfTick(now) {
  if (!gkfSending() || now - GK.last > 250) return;
  const o = gkfOut();
  if (!o) return;
  if (now - GKS.hb >= 90) gkfBeat(o, now);
  if (GKS.pend) gkfAxes(o, now);
  if (now - GKS.nT >= 1000) { GKS.rate = Math.round((GKS.n * 1000) / Math.max(1, now - GKS.nT)); GKS.n = 0; GKS.nT = now; }
}
// stopping (another output, switched off, Gestik off): what is held on goes off, everything is sent afresh next time
function gkfStop() {
  const o = GKS.o;
  if (o) for (let i = 0; i < 3; i++) if (GKS.on[i]) gkfNote(o, i, false);
  GKS.on = [false, false, false]; GKS.q.fill(-1); GKS.pend = 0; GKS.hb = 0; GKS.nb = 0; GKS.o = null; GKS.rate = 0; GKS.n = 0;
}
function gkfPick(name) {
  gkfStop();
  GK.p.fs = name || ''; gkSave();
  if (GK.card) gkCardSync();
}
gkSub(gkfSub);

// The receiver. The profile "Gestik (Handy)" (never by a port's name – by the signature on channel 16)
const GKF_PROF = { id: 'gkr', name: 'Gestik (Handy)', re: /(?!)/, what: 'die Bewegung eines Handys über die Funkstrecke', own: 1, binds: [],
  ctrls: [['Neigen, Bebung, Drehen, Ladung', 'Gestik auf diesem Gerät: Anlehnen, Ladung, Schlafen, Fährte – wie am Handy'], ['Kanal 16', 'NRPN 42/0–8 und Noten 48–52 – nie Tasten, Pedale oder Standard-Zuordnungen']] };
const gkrOn = (src) => !!src.gkr && profOn(src);
// channel 16 of every input passes here first (midiTake): NRPN parts are followed for the signature; once it was
// seen, they and the event notes are Gestik's – and nothing else's
function gkrTake(src, ev) {
  if (ev.type === 'cc') {
    const n = ev.num;
    if (n !== 99 && n !== 98 && n !== 6 && n !== 38) return false;
    const q = src.gkq || (src.gkq = { pm: -1, pl: -1, vm: -1 });
    if (n === 99) { q.pm = ev.val; q.pl = q.vm = -1; }
    else if (n === 98) { q.pl = ev.val; q.vm = -1; }
    else if (n === 6) q.vm = ev.val;
    else if (q.pm === GKF.msb && q.pl >= 0 && q.vm >= 0) gkrVal(src, q.pl, (q.vm << 7) | ev.val);
    return q.pm === GKF.msb && gkrOn(src);
  }
  if ((ev.type === 'on' || ev.type === 'off') && ev.num >= GKF.note && ev.num <= GKF.note + 4 && gkrOn(src)) { gkrNote(src, ev); return true; }
  return false;
}
function gkrVal(src, n, val) {
  if (n === GKF.hb) { if (val >> 7 === GKF.sig) gkrSeen(src, val & 127); return; }
  const R = src.gkr;
  if (!R || !profOn(src)) return;
  if (n < GKF.n) { R.v[n] = gkfUnpack(n, val); R.t = performance.now(); gkrDue(src); }
  else if (n === GKF.lat) R.latS = val;
}
function gkrSeen(src, flags) {
  if (gkfSending()) return;   // sending ourselves: our own signature come back through a loop
  const now = performance.now();
  let R = src.gkr;
  if (!R) {
    R = src.gkr = { t: now, flags, latS: null, v: new Float64Array(GKF.n), ev: [], due: false, n: 0, rn: 0, rt: now, rate: 0 };
    MAP.v++;   // the profile changes (mapOf, the card)
    if (profOn(src)) toast('Gestik (Handy) erkannt: ' + devShort(src.name) + ' – die Bewegung des Handys wirkt jetzt hier.', 5000);
    updDevUI();
  }
  R.t = now; R.flags = flags;
  if (!profOn(src)) return;
  if (!GK.rem) gkRemOn(src);
  if (GK.rem && GK.rem.src === src) { GK.last = now; GK.dmSeen = !!(flags & 2); if (GK.R && GK.R.rem) GK.R.st.gyro = !!(flags & 1); }
}
function gkrNote(src, ev) {
  const R = src.gkr, i = ev.num - GKF.note, on = ev.type === 'on' && ev.val > 0;
  if (i < 3) R.ev.push({ type: GK_EV[i], on, v: on ? ev.val / 127 : 0 });
  else if (i === 3 && on) R.ev.push({ type: 'peak', v: ev.val / 127, t: performance.now(), i: 0 });
  else if (i === 4 && on) R.ev.push({ type: 'zero', why: 'remote' });
  R.t = performance.now();
  gkrDue(src);
}
// a burst (one sensor frame: several axes, maybe an event) becomes one Gestik update
function gkrDue(src) {
  const R = src.gkr;
  if (R.due) return;
  R.due = true;
  Promise.resolve().then(() => { R.due = false; gkRemIn(src); });
}
// Gestik from the phone: switched on for it (without touching "Gestik" as it was set here), the recogniser replaced by
// one that only holds the received values; Gestik's own sensor here (if any) rests meanwhile
function gkRemOn(src) {
  if (GK.rem || GK.remOff === src.key) return;
  const loc = GK.on;
  if (!loc) {
    GK.on = true; GK.remOnly = true; GK.live = false; GK.dts = []; GK.lastT = 0; GK.dmSeen = false; GK.ori = null; GK.engaged = false; GK.mode = 'off'; GK.xf = null; GK.toastOnce = true; GK.checked = true; GK.perm = 'remote';
    gkSrc(true);
    clearInterval(GK.timer); GK.timer = setInterval(gkTick, 50);
  }
  GK.Rloc = loc ? GK.R : null;
  GK.R = gkRemR();
  GK.rem = { src, zx: 0, zy: 0, t: performance.now() };
  GK.live = false;
  KC.sig = '';   // the cards: "Gestik · Handy über …"
  gkStatus(); updDevUI();
}
function gkRemR() {
  const R = gkMake({ weite: GK.p.weite, entl: GK.p.entl, pickZero: false }), st = R.st;
  st.z = [0, 0, 1]; st.u = [0, 0, 1]; st.uf = [0, 0, 1]; st.sign = 1; st.drh = 0;
  R.rem = true;
  // a new zero here: the phone's angles from now on less these (in degrees – then shaped by this Weite)
  R.zero = () => { const m = GK.rem; if (!m || st.wenden) return false; m.zx += st.roll; m.zy += st.pitch; st.z = [0, 0, 1]; gkRemAx(R); return true; };
  R.push = () => ({ t: 0, axes: Object.assign({}, st.axes), events: [], state: st });
  R.restart = () => {};
  return R;
}
function gkRemAx(R) {
  const m = GK.rem, V = m.src.gkr.v, st = R.st, X = st.axes;
  st.roll = V[0] - m.zx; st.pitch = -V[1] - m.zy;
  X.tiltX = R.shape(st.roll); X.tiltY = R.shape(-st.pitch);
  X.bebung = V[2]; X.drehen = V[3]; X.ladung = V[4];
  st.lad = V[4]; st.sw = V[5]; st.swHz = V[6]; st.swDir = V[7];
  st.drh = 60 * Math.atanh(clamp(V[3], -0.999, 0.999));
  st.ang = Math.hypot(st.roll, st.pitch);
  st.gyro = !!(m.src.gkr.flags & 1);
}
function gkRemIn(src) {
  const m = GK.rem, G = src.gkr;
  if (!m || m.src !== src || !GK.on || !GK.R || !GK.R.rem) { G.ev.length = 0; return; }
  const R = GK.R, st = R.st, evs = G.ev.splice(0), now = performance.now();
  for (const e of evs) {
    if (e.type === 'wenden') st.wenden = e.on; else if (e.type === 'ruhe') st.ruhe = e.on; else if (e.type === 'schuetteln') st.shake = e.on;
    else if (e.type === 'zero') { m.zx = 0; m.zy = 0; st.z = [0, 0, 1]; }   // the phone took a new zero: its angles start from it
  }
  gkRemAx(R);
  if (!GK.live) { GK.live = true; GK.checked = true; if (GK.p.clutch === 'immer') GK.engaged = true; }
  GK.last = now; m.t = now;
  G.n++; if (now - G.rt >= 1000) { G.rate = Math.round(((G.n - G.rn) * 1000) / (now - G.rt)); G.rn = G.n; G.rt = now; }
  Object.assign(GK.raw, st.axes);
  gkUpdate(now, evs);
}
// the phone went quiet for 10 s, its input went or its profile was switched off: Gestik here as it was before
function gkRemEnd() {
  const m = GK.rem;
  if (!m) return;
  GK.rem = null;
  KC.sig = '';
  if (GK.remOnly) { gkDisable(); return; }
  GK.R = GK.Rloc || gkMake({ weite: GK.p.weite, entl: GK.p.entl, pickZero: GK.p.clutch === 'immer' });
  GK.Rloc = null; GK.live = false; GK.checked = false;
  clearTimeout(GK.liveT); GK.liveT = setTimeout(() => { GK.checked = true; gkStatus(); }, 1200);
  gkUpdate(performance.now(), []); gkStatus(); updDevUI();
}
function gkRemCheck(now) {
  const m = GK.rem, s = m.src;
  if (now - s.gkr.t > 10000 || MIDI.srcs.get(s.key) !== s || !s.enabled || s.dup || !profOn(s)) gkRemEnd();
}
const gkRemText = () => { const G = GK.rem.src.gkr, live = performance.now() - GK.last < 250; return 'Funkstrecke: ' + devShort(GK.rem.src.name) + (live ? ' · ' + (G.rate || '…') + ' Werte/s' : ' – wartet auf das Handy'); };

