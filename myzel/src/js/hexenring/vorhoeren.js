// ---- (owner, 26.10.2026: „in der Schleifen-Ansicht auch ein Play und Stopp – und dass man auf eine beliebige Stelle
// klickt und es dort weiterspielt; bei längeren Schleifen muss man sonst immer alles durchlaufen lassen“) Vorhören: the
// editor plays the loop as it sounds with every change – the pass it renders for its waveform (hxEdRenderPass) – from
// any place, at once; the running loop is silent meanwhile (the others play on), a chosen stretch repeats. A change
// while it plays: the new render takes over at the same place, crossfaded. Space plays and stops (the focus in the
// editor), a click into the waveform plays from there. ----
const HXPV_X = 0.03;   // the crossfade between renders, at a jump, at the stop (s)
// where it plays: a share of the pass (stopped: its mark)
function hxPvPos() {
  const P = HXE.pv; if (!P || !A.ctx) return HXE.pvAt || 0;
  let el = P.off + Math.max(0, A.ctx.currentTime - P.t0);
  if (el >= P.b) el = P.a + ((el - P.b) % Math.max(1e-3, P.b - P.a));
  return clamp(el / P.dur, 0, 1);
}
// what repeats: the chosen stretch (unless „Auswahl wiederholen“ is off), else the whole pass – in seconds of the buffer
const hxPvRange = (dur) => (HXE.sel && HXE.pvRep !== false ? [HXE.sel.a * dur, Math.max(HXE.sel.a * dur + 0.02, HXE.sel.b * dur)] : [0, dur]);
const hxPvLvl = (L) => L.gain * (L.gg != null ? L.gg : 1);   // (the rendered pass holds each Schicht's level – the loop's own and its pan come here)
const hxPvBuf = () => (HXE.rw && HXE.rw.sig === HXE.rsig && HXE.rw.buf ? HXE.rw.buf : null);
function hxPvPlay(u) {
  const L = hxEdL(); if (!L || !A.ctx) return;
  if (u != null) HXE.pvAt = clamp(u, 0, 0.9999);
  const buf = hxPvBuf();
  if (!buf) { HXE.pvWant = true; hxEdRenderKick(L); return; }   // (it starts when the pass is rendered)
  HXE.pvWant = false;
  hxPvSrc(L, buf, HXE.pv ? (u != null ? HXE.pvAt : hxPvPos()) : HXE.pvAt || 0);
}
function hxPvSrc(L, buf, u) {
  const ctx = A.ctx, t = ctx.currentTime + 0.02, dur = buf.duration, old = HXE.pv && HXE.pv.key === L.key ? HXE.pv : null;
  if (HXE.pv && !old) hxPvStop();
  let out = old ? old.out : null;
  if (!out) { const g = ctx.createGain(), p = ctx.createStereoPanner(); g.gain.value = hxPvLvl(L); p.pan.value = L.pan || 0; g.connect(p).connect(stripIn('hxr')); out = { g, p }; }
  const [a, b] = hxPvRange(dur); let off = clamp(u * dur, 0, dur - 1e-3); if (off < a || off >= b) off = a;
  const src = ctx.createBufferSource(), x = ctx.createGain();
  src.buffer = buf; src.loop = true; src.loopStart = a; src.loopEnd = b; src.connect(x).connect(out.g);
  x.gain.setValueAtTime(0, t); x.gain.linearRampToValueAtTime(1, t + HXPV_X);
  src.start(t, off);
  if (old) hxPvFade(old, t);
  HXE.pv = { key: L.key, src, x, out, buf, t0: t, off, a, b, dur };
  if (!old) { L.pvMute = true; hxGain(L.id, 0, null, 0.03); if (IDLE.on) idleWake(); hxSay(hxName(L) + ': Vorhören'); }
}
function hxPvFade(P, t) { try { P.x.gain.cancelScheduledValues(t); P.x.gain.setValueAtTime(P.x.gain.value, t); P.x.gain.linearRampToValueAtTime(0, t + HXPV_X); P.src.stop(t + HXPV_X + 0.02); } catch (e) {} }
function hxPvStop() {
  const P = HXE.pv; HXE.pvWant = false; if (!P) return;
  HXE.pvAt = hxPvPos(); HXE.pv = null;
  const t = A.ctx.currentTime; hxPvFade(P, t);
  setTimeout(() => { try { P.out.g.disconnect(); P.out.p.disconnect(); } catch (e) {} }, (HXPV_X + 0.1) * 1000);
  const L = hxByKey(P.key); if (L) { L.pvMute = false; if (L.state !== 'weg') hxGain(L.id, L.gain, null, 0.03); }   // (the loop as it runs, at its own place)
  HXE.wsig = '';
}
function hxPvToggle() { if (HXE.pv || HXE.pvWant) hxPvStop(); else hxPvPlay(); }
// a jump: playing – from there at once; stopped – the mark moves
function hxPvJump(u) { u = clamp(u, 0, 0.9999); if (HXE.pv) hxPvPlay(u); else { HXE.pvAt = u; HXE.wsig = ''; } }
// every frame (the editor's): the render waited for starts it, a new render takes over where it plays, the stretch
// that repeats follows the selection, the button and the clock
function hxPvFrame(L) {
  const P = HXE.pv, buf = hxPvBuf();
  if (HXE.pvWant && buf) hxPvPlay();
  else if (P && buf && P.buf !== buf) hxPvSrc(L, buf, hxPvPos());
  else if (P) { const [a, b] = hxPvRange(P.dur); if (Math.abs(a - P.a) > 1e-6 || Math.abs(b - P.b) > 1e-6) hxPvSrc(L, P.buf, hxPvPos()); }
  if (HXE.pv) { const g = hxPvLvl(L), pn = L.pan || 0, o = HXE.pv.out; if (Math.abs(o.g.gain.value - g) > 1e-4) o.g.gain.setTargetAtTime(g, A.ctx.currentTime, 0.02); if (Math.abs(o.p.pan.value - pn) > 1e-3) o.p.pan.setTargetAtTime(pn, A.ctx.currentTime, 0.02); }
  const b = HXE.pvBtn; if (b) { const tx = HXE.pv ? '■ Stopp' : HXE.pvWant ? '… wird berechnet' : '▶ Abspielen'; if (b.textContent !== tx) { b.textContent = tx; b.setAttribute('aria-pressed', HXE.pv ? 'true' : 'false'); } }
  if (HXE.tEl) { const tx = hxPvTime(L, hxPvPos()); if (HXE.tEl.textContent !== tx) HXE.tEl.textContent = tx; }
  // (zoomed in: the view follows what plays)
  if (HXE.pv && HXE.zv) { const p = hxPvPos(), [v0, v1] = HXE.zv, s = v1 - v0; if (p < v0 || p > v1) { const n0 = clamp(p - 0.02 * s, 0, 1 - s); HXE.zv = [n0, n0 + s]; } }
}
// the place in words: Takt and Schlag on the Takt, and the seconds of the pass
function hxPvTime(L, u) {
  const T = HXE.pv ? HXE.pv.dur : hxPvBuf() ? hxPvBuf().duration : hxLen(L), s = u * T, mm = (x) => Math.floor(x / 60) + ':' + dec((x % 60).toFixed(1)).padStart(4, '0');
  let w = '';
  if (hxTakt(L)) { const B = L.d.beats, bpb = L.bpb || 4, be = Math.min(B - 1e-9, u * B); w = 'Takt ' + (Math.floor(be / bpb) + 1) + ' · Schlag ' + (Math.floor(be % bpb) + 1) + ' · '; }
  return w + mm(s) + ' / ' + mm(T);
}
// the waveform's view (a share of the pass): zoomed around a place, moved, whole again
function hxEdZoom(f, u) {
  const L = hxEdL(); if (!L) return;
  const [v0, v1] = HXE.zv || [0, 1], s0 = v1 - v0, T = Math.max(0.05, hxLen(L)), min = Math.max(1 / 512, 0.2 / T), s = clamp(s0 * f, min, 1);
  const was = !!HXE.zv;
  if (s >= 1 - 1e-9) HXE.zv = null;
  else { const c = u != null ? u : HXE.pv ? hxPvPos() : HXE.sel ? (HXE.sel.a + HXE.sel.b) / 2 : (v0 + v1) / 2, p = (c - v0) / s0, n0 = clamp(c - p * s, 0, 1 - s); HXE.zv = [n0, n0 + s]; }
  HXE.wsig = ''; if (was !== !!HXE.zv) hxEdRender();   // (its „ganz“ comes and goes)
}
function hxEdZoomTo(a, b) { const was = !!HXE.zv, s = Math.max(b - a, 1 / 512), m = s * 0.04; if (s + 2 * m >= 1 - 1e-9) HXE.zv = null; else { const n0 = clamp(a - m, 0, 1 - (s + 2 * m)); HXE.zv = [n0, n0 + s + 2 * m]; } HXE.wsig = ''; if (was !== !!HXE.zv) hxEdRender(); }
function hxEdPan(d) { if (!HXE.zv) return; const [v0, v1] = HXE.zv, s = v1 - v0, n0 = clamp(v0 + d * s, 0, 1 - s); HXE.zv = [n0, n0 + s]; HXE.wsig = ''; }
// the peaks of a stretch [v0, v1) of the rendered pass, W columns
function hxEdPkBuf(buf, v0, v1, W) {
  const a = buf.getChannelData(0), b = buf.getChannelData(1), n = a.length, mn = new Float32Array(W), mx = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const i0 = Math.floor((v0 + (x / W) * (v1 - v0)) * n), i1 = Math.min(n, Math.max(i0 + 1, Math.floor((v0 + ((x + 1) / W) * (v1 - v0)) * n)));
    let lo = 0, hi = 0; for (let i = i0; i < i1; i++) { const v = 0.5 * (a[i] + b[i]); if (v < lo) lo = v; else if (v > hi) hi = v; }
    mn[x] = lo; mx[x] = hi;
  }
  return { mn, mx };
}
