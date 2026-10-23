// ---- Gesang als Noten (SPEC §15, KONZEPT §12): a Mikro Schleife's voice (one at a time, mono) becomes notes – YIN in the
// Worker, then notes where the voice is periodic and loud enough, split where the pitch moves by a step and stays, or the
// level rises again; each note the median of its pitch, set on the nearest degree of the scale (deg/oct), its glides
// kept as an f curve around it (a vibrato under 20 cents smoothed); velocity from its level. The loop then grows (Wuchs)
// on the field's source – any source by the card's Klang ----
function hxGesangNotes(mono, sr) {
  return hxWk('yin', { x: mono, sr, fmin: 70, fmax: 2800, hop: Math.round(sr * 0.005) }).then((Y) => hxGesangSeg(Y));   // (a bass voice's 70 Hz to a whistle's 2.8 kHz)
}
function hxGesangSeg(Y) {
  if (!Y || !Y.f.length) return [];
  const hs = Y.hop / Y.sr, n = Y.f.length, pk = Math.max(...Y.rms), thr = Math.max(0.004, pk * 0.06);
  const voiced = Y.f.map((f, i) => f > 0 && Y.ap[i] < 0.25 && Y.rms[i] > thr), st = Y.f.map((f) => (f > 0 ? 12 * Math.log2(f / 440) + 69 : 0));
  // a 7-frame median of the pitch (octave slips and single bad frames out)
  const med = st.map((_, i) => { const a = []; for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) if (voiced[j]) a.push(st[j]); a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; });
  const notes = []; let cur = null;
  const close = (i) => { if (cur && (i - cur.i0) * hs >= 0.06) { cur.i1 = i; notes.push(cur); } cur = null; };
  for (let i = 0; i < n; i++) {
    if (!voiced[i] || !med[i]) { close(i); continue; }
    if (cur) {
      const p = cur.p.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, cur.p.length);
      // a step that stays (≥ 0.7 semitone for 40 ms), or the level rising again after a dip (a new syllable): a new note
      const jump = Math.abs(med[i] - p) >= 0.7 && (() => { for (let j = i; j < Math.min(n, i + Math.round(0.04 / hs)); j++) if (!voiced[j] || Math.abs(med[j] - p) < 0.7) return false; return true; })();
      const onset = i > 3 && Y.rms[i] > 1.8 * Math.min(Y.rms[i - 2], Y.rms[i - 3]) && Y.rms[i - 2] < 0.5 * Math.max(...cur.r.slice(-20));
      if (jump || onset) close(i);
    }
    if (!cur) cur = { i0: i, p: [], r: [], m: [], ix: [] };
    cur.p.push(med[i]); cur.r.push(Y.rms[i]); cur.ix.push(i);
  }
  close(n);
  // a short piece an octave (or two) from the note it touches is that note: at a note's start the room still rings
  // with the one before, and the two together can be periodic an octave lower – it is folded into its neighbour
  const mOf = (x) => { const s = x.p.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  for (let j = 0; j < notes.length; j++) {
    const x = notes[j]; if ((x.i1 - x.i0) * hs >= 0.15) continue;
    for (const k of [j + 1, j - 1]) {
      const y = notes[k]; if (!y || (k > j ? y.i0 - x.i1 : x.i0 - y.i1) * hs > 0.03) continue;
      const dm = mOf(y) - mOf(x), m = Math.round(dm / 12); if (!m || Math.abs(m) > 2 || Math.abs(dm - 12 * m) > 0.6) continue;
      const q = x.p.map((v) => v + 12 * m);
      if (k > j) { y.p = q.concat(y.p); y.r = x.r.concat(y.r); y.ix = x.ix.concat(y.ix); y.i0 = x.i0; } else { y.p = y.p.concat(q); y.r = y.r.concat(x.r); y.ix = y.ix.concat(x.ix); y.i1 = x.i1; }
      notes.splice(j, 1); j--; break;
    }
  }
  // each note's octave from all its frames: YIN takes the shortest period that is periodic enough, but while the room
  // still rings with the note before (a formant's partial of it, say), the two together are periodic an octave lower
  // and the note's own period dips only later, once the tail has faded. A note never dips clearly (under 0.05) at an
  // octave above its own pitch – so the highest octave clearly held by a few of its frames (≥ 15 ms) is the note's
  if (Y.c) for (const x of notes) {
    const m = mOf(x), n = x.ix.length;
    for (const k of [2, 1]) {
      const H = m + 12 * k; let cl = 0;
      for (const i of x.ix) { let bd = 1; for (const [f, dd] of Y.c[i] || []) if (Math.abs(12 * Math.log2(f / 440) + 69 - H) < 0.8 && dd < bd) bd = dd; if (bd < 0.05) cl++; }
      if (cl >= Math.max(3, Math.round(0.1 * n))) { x.p = x.p.map((v) => { const o = Math.round((H - v) / 12); return o && Math.abs(v + 12 * o - H) < 1.5 ? v + 12 * o : v; }); break; }
    }
  }
  const rmsPk = Math.max(1e-9, ...notes.map((x) => Math.max(...x.r)));
  return notes.map((x) => {
    const s = x.p.slice().sort((a, b) => a - b), m = s[s.length >> 1], f = 440 * Math.pow(2, (m - 69) / 12);
    const curve = []; let last = null;
    for (let j = 0; j < x.p.length; j += 6) { const c = x.p[j] - m; if (Math.abs(c) >= 0.2 || (last != null && Math.abs(last) >= 0.2)) curve.push([j * hs, c]); last = c; }
    return { t0: x.i0 * hs, t1: x.i1 * hs, f, st: m, vel: clamp(0.35 + 0.65 * Math.sqrt(Math.max(...x.r) / rmsPk), 0.2, 1), cf: curve };
  });
}
// the loop's notes from its voice: a Wuchs record (as hxWNotesMk makes them), every note on its degree
async function hxGesang(L) {
  const S = L && HX.sch.get(L.sch[0]);
  if (!S || !S.aud || !S.cut || S.cut.in !== 3) { toast('Gesang als Noten geht mit einer Mikro-Schleife.'); return false; }
  hxSay('Gesang wird zu Noten …'); L.gesBusy = true; hxCardDirty();
  const n = S.len + Math.min(Math.round(0.3 * SR), Math.max(0, S.n - S.pre - S.len)), mono = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = S.pre + i, c = S.aud[Math.floor(p / HX_CH)]; if (c) mono[i] = 0.5 * (c[0][p % HX_CH] + c[1][p % HX_CH]); }
  const ns = (await hxGesangNotes(mono, SR)).filter((x) => x.t0 < S.len / SR);
  L.gesBusy = false;
  if (!HX.loops.has(L.id)) return false;
  if (!ns.length) { toast('In dieser Schleife war keine Stimme zu hören.', 3500); hxCardDirty(); return false; }
  const takt = hxTakt(L), spb = takt ? (L.d.beats ? (S.len / SR) / L.d.beats : 0.5) : 1, u = (t) => t / spb;
  const kp = HX.tonP || { root: P['t.root'], scale: P['t.scale'] }, key = { base: N.base, ...hxWScale(kp.root, kp.scale) }, eng = P['v.eng'];
  const rec = { u: takt ? 'b' : 's', len: takt ? L.d.beats : S.len / SR, key, sd: 0, lanes: [], gesang: true, n: ns.map((x) => {
    const D = hxDeg(x.f), I = (D.oct || 0) * hxScPer() + D.deg, fs = hxIdxF(I), r = fs / x.f;   // (on its degree: the voice's median there, its glides around it)
    return { t: u(x.t0), held: false, d: u(x.t1) - u(x.t0), eng, f: fs, deg: D.deg, oct: D.oct, alt: 0, y0: 0.5, vel: x.vel, pan: 0, src: 'fin', burst: false, gate: null, hold: true, cy: [], cf: x.cf.map(([t, c]) => [u(t), fs * Math.pow(2, c / 12)]) };
  }) };
  const was = S.wn, lk = L.key, sk = S.key;
  S.wn = rec; L.notes = hxLoopNotes(rec.n.map((x) => ({ t0: x.t * spb, t1: (x.t + x.d) * spb, f: x.f, vel: x.vel, y0: 0.5, x: hxDeg(x.f).x, deg: x.deg, oct: x.oct, src: 'fin', eng })), 0, S.len / SR); L.eng = eng; L.gesang = true;
  hxWSet(L, 'wahl', true);
  hxHist({ kind: 'gesang', label: hxName(L) + ': Gesang als Noten', undo() { const X = hxSchByKey(sk), Y = hxByKey(lk); if (X) X.wn = was; if (Y) { Y.gesang = false; hxWSet(Y, 'wahl', false); } }, redo() { const X = hxSchByKey(sk), Y = hxByKey(lk); if (X) X.wn = rec; if (Y) { Y.gesang = true; hxWSet(Y, 'wahl', true); } } });
  hxSay(hxName(L) + ': ' + ns.length + ' Noten aus dem Gesang'); hxSaveLoop(L); hxCardDirty(); hxRailDirty();
  return ns.length;
}

