// ---- (owner, 28.10.2026: „ein direktes bearbeiten der schleifen … abschnitte löschen (ohne dass sich dadurch die länge
// der schleife ändert). abschnitte gegeneinander auswechseln. die schleife stellenweise mit neuem input füttern (der user
// spielt etwas und dieses spiel wird in die bestehende schleife an jener stelle eingebaut). abschnitte der schleife in der
// tonart ändern (transpose, detune)“) Direkt – in the editor's „Abschnitt bearbeiten“:
//   Löschen     – the stretch silent, the loop as long as before (op 'loeschen')
//   Merken      – a stretch kept (HXE.mark); then, on another stretch of the same loop, Tauschen (the two change places)
//                 or Einsetzen (the kept one's frames over this one) – a stretch of another length is cut or ends in
//                 silence (5-ms fades), the loop's length never changes
//   Einspielen  – armed on the stretch: the next time it comes round (at least 1.2 s ahead) what is played is caught and
//                 built into the loop's first Schicht there – „ersetzen“ empties the stretch first (heard at once: play
//                 into the gap), „dazu“ lays it over; dry where the Schicht is dry, burnt through the chain as it was
//                 heard where the Schicht is baked; its level as played (the Schicht's own level taken out)
//   Tonhöhe     – semitones, Verstimmen – cents: grains read faster or slower, the length kept (verwandeln.js) ----
// why a loop plays its notes anew (Wuchs) – said in the editor before it is frozen for an edit
const hxWWhy = (L) => { const w = L.wwhy || {}, r = []; if (hxWTonOff(L)) r.push('sie folgt der Tonart'); if (w.tempo) r.push('sie folgt dem Tempo'); if (hxKlangOf(L) !== 'eigen') r.push('ein anderer Klang'); if (w.wahl) r.push('Wiedergabe „Wuchs“'); if (hxEigN(L) >= 1) r.push('Eigensinn'); if (hxNtOn(L)) r.push('Noten-Werkzeuge'); if (w.ausl) r.push('Auslese'); return r.join(', '); };
const hxRxPitchName = (v) => (Math.abs(v - Math.round(v)) < 1e-6 ? 'Tonhöhe ' + (v > 0 ? '+' : '−') + Math.abs(Math.round(v)) : 'verstimmt ' + (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' ct');
// a take laid over the stretch: frame i of the stretch plus frame i of the take (where it has one)
const hxRxAdd = (ch, r0, seg) => { const get = hxRxGet(ch), n = seg[0].length; return (i) => { const s = get(r0 + i); return i < n ? [s[0] + seg[0][i], s[1] + seg[1][i]] : s; }; };
// the frames of [q0, q1) into [r0, r1) (Einsetzen), and the other way round too (Tauschen) – each read from the audio
// before; a shorter source ends in a 5-ms fade to silence
function hxRxMove(ch, r0, r1, [q0, q1], op) {
  const get = hxRxGet(ch), from = (s0, s1) => { const m = s1 - s0, X = Math.min(HX_RX, m >> 2); return (i) => { if (i >= m) return [0, 0]; const s = get(s0 + i), w = X && i > m - X ? (m - i) / X : 1; return [s[0] * w, s[1] * w]; }; };
  const dst = hxRxApply(ch, r0, r1, from(q0, q1));
  if (op !== 'swap') return dst;
  // (the second half reads the audio before – the first write is not read again)
  const out = from(r0, r1), N = q1 - q0, X = Math.min(HX_RX, Math.floor(N / 4)), g2 = hxRxGet(ch);
  for (let i = 0; i < N; i++) { const o = out(i), w = X ? Math.min(1, Math.min(i, N - 1 - i) / X) : 1, e = Math.sin(0.5 * Math.PI * w), q = Math.cos(0.5 * Math.PI * w), v = g2(q0 + i); hxRxSet(dst, q0 + i, o[0] * e + v[0] * q, o[1] * e + v[1] * q); }
  return dst;
}
// ---- Merken, Tauschen, Einsetzen ----
function hxRxMark(L, a, b) { HXE.mark = { key: L.key, a, b }; HXE.wsig = ''; hxSay('Abschnitt gemerkt'); toast('Gemerkt: ' + hxRxName(L, a, b) + '. Jetzt einen anderen Teil wählen – dann „Tauschen“ oder „Einsetzen“.', 4000); hxEdRender(); }
function hxRxMarkOk(L, a, b) { const m = HXE.mark; return !!(m && m.key === L.key && (b <= m.a + 1e-9 || a >= m.b - 1e-9)); }
function hxRxMoveGo(L, a, b, op) {
  const m = HXE.mark;
  if (!m || m.key !== L.key) { toast('Zuerst einen Abschnitt dieser Schleife merken.', 3000); return; }
  if (!hxRxMarkOk(L, a, b)) { toast('Die Auswahl überschneidet den gemerkten Abschnitt – wähle einen anderen Teil.', 3500); return; }
  hxRegionEdit(L, a, b, op, { a2: m.a, b2: m.b });
  if (op === 'swap') { HXE.mark = { key: L.key, a, b }; HXE.wsig = ''; }   // (the kept one is where it went – a second Tauschen swaps back)
}
// ---- Einspielen ----
// the next time the stretch comes round, at least 1.2 s from now: its frames in that pass
function hxTakeAt(L, a, b) {
  const now = Math.round(hxF(hxNowT())); let k = hxPassK(L, now);
  for (let i = 0; i < 64; i++, k++) { const p0 = hxPassF(L, k), p1 = hxPassF(L, k + 1), fa = p0 + Math.round(a * (p1 - p0)), fb = p0 + Math.round(b * (p1 - p0)); if (fa >= now + 1.2 * SR) return { k, fa, fb }; }
  return null;
}
function hxTakeArm(L, a, b, mode) {
  if (!L || L.bew || !A.ctx) return;
  if (HX.take) { hxTakeStop(); return; }
  if (hxWAktiv(L)) { hxRxFreeze(L, () => hxTakeArm(L, a, b, mode)); return; }   // (frozen first, as for every edit – abschnitt.js)
  if ((L.sp || 1) !== 1 || hxBandSliceOf(L)) { toast('Einspielen geht, wenn das Band auf ×1 läuft und nichts weggelassen oder getauscht ist.', 4500); return; }
  if (L.state !== 'spielt') { toast('Die Schleife muss spielen – dann hörst du, wo du einsetzt.', 3500); return; }
  if (!hxMicOk(true)) return;
  const sch = hxBandReady(L); if (!sch || !sch.length) return;
  hxPvStop();   // (the loop itself is heard: the context to play into)
  if (mode === 'ersetzen') hxRegionWrite(L, a, b, 'loeschen', 0, [], 1);   // (the gap at once – one step of its own)
  const at = hxTakeAt(L, a, b); if (!at) return;
  const inp = hxInp();
  HX.take = { key: L.key, a, b, mode, k: at.k, fa: at.fa, fb: at.fb, inp, sh: inp === 3 ? hxMicRt() : 0, st: 'wartet' };
  hxSay('Einspielen bereit – ' + hxName(L)); HXE.wsig = ''; hxEdRender();
}
function hxTakeStop(say) { if (!HX.take) return; HX.take = null; HXE.wsig = ''; if (say !== false) hxSay('Einspielen abgebrochen'); hxEdRender(); }
// what it says in the editor
function hxTakeText() {
  const T = HX.take; if (!T) return '';
  const now = hxF(hxNowT()), s = (T.fa - now) / SR;
  if (T.st === 'wartet') return 'Einspielen: gleich – spiel in ' + Math.max(0, Math.ceil(s)) + ' s, wenn der rote Teil kommt' + (T.mode === 'ersetzen' ? ' (er ist schon leer)' : '') + '.';
  if (T.st === 'nimmt') return '● Nimmt auf – spiel jetzt …';
  return 'Wird eingebaut …';
}
// every 100 ms: the take's turn – waiting, catching, then built in
async function hxTakeTick() {
  const T = HX.take; if (!T) return;
  const L = hxByKey(T.key); if (!L || L.state === 'weg') { HX.take = null; return; }
  const now = hxF(hxNowT());
  if (T.st === 'wartet' && now >= T.fa) { T.st = 'nimmt'; HXE.wsig = ''; hxSay('Nimmt auf'); }
  if (T.st === 'nimmt' && now >= T.fb + Math.round(0.3 * SR)) { T.st = 'baut'; HXE.wsig = ''; await hxTakeBuild(L, T); if (HX.take === T) HX.take = null; HXE.wsig = ''; hxEdRender(); }
  if (HXE.takeEl) { const t = hxTakeText(); if (HXE.takeEl.textContent !== t) HXE.takeEl.textContent = t; }
}
async function hxTakeBuild(L, T) {
  const g = await hxGrab({ in: T.inp, f0: T.fa + T.sh, f1: T.fb + T.sh });
  if (!g || !g.chunks) { toast('Das Gespielte ließ sich nicht holen – bitte noch einmal.', 3500); return false; }
  const sch = hxBandReady(L); if (!sch || !sch.length) return false;
  const S = sch[0], [r0, r1] = hxRxFrames(S, T.a, T.b), N = r1 - r0, n = g.n;
  if (Math.abs(N - n) > 0.01 * N + 64) { toast('Das Tempo hat sich beim Einspielen geändert – bitte noch einmal.', 4000); return false; }
  const m = Math.min(N, n), gi = 1 / Math.max(0.25, S.gain || 1), l = new Float32Array(m), r = new Float32Array(m);
  for (let i = 0; i < m; i++) { const c = g.chunks[Math.floor(i / HX_CH)], j = i % HX_CH; if (c) { l[i] = c[0][j] * gi; r[i] = c[1][j] * gi; } }
  // a played take: anything at all? (a silent one is not built in)
  let e = 0; for (let i = 0; i < m; i += 4) e = Math.max(e, Math.abs(l[i]), Math.abs(r[i]));
  if (e < 1e-4) { toast('Nichts gehört – es wurde nichts eingebaut.', 3500); return false; }
  // burnt through the chain as it was heard, where the Schicht plays baked
  let wet = null;
  if (S.bak && S.chain && !L.folgt && HXW.st !== 'kein') {
    const lb = l.slice(), rb = r.slice(), ta = hxT(T.fa + T.sh);
    const k = await hxwCall('bake', { sr: SR, n: m, L: lb, R: rb, chain: hxChainRec(ta, ta + m / SR) }, [lb.buffer, rb.buffer]);
    if (k && !k.err && k.L) wet = [k.L, k.R];
  }
  return hxRegionEdit(L, T.a, T.b, 'take', { key: S.key, mode: T.mode, dry: [l, r], wet });
}
if (!HXW.on) setInterval(() => { try { hxTakeTick(); } catch (e) { console.warn(e); } }, 100);
