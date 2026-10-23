// ---- Knospen (SPEC §12.4): what the machine will change, a bar before it sounds – a bud at the top edge of the column of
// each changed note (it swells and bursts when the note sounds; an answer's buds a chain; a Wiederkehr a ring forming at
// the edge). Drawn on the field's canvas, no pointer events ----
HX.kn = new Map();
function hxKnAdd(id, f, t, t0, kind, prev, slot) {
  if (HX.kn.has(id) || HX.kn.size > 160) return;
  const x = f != null ? hxDeg(f).x : null;
  if (f != null && x == null) return;
  HX.kn.set(id, { x, t, t0, kind, prev, slot });
}
// the changed notes of the varied passes ahead – one bar and a little more – of every loop at Variieren or Wandern
function hxKnTick(now) {
  if (document.hidden) return;
  const ahead = hxGdBarLen() + 0.6;
  for (const L of hxLoopsLive()) {
    if (L.bew || L.state !== 'spielt' || hxEigN(L) < 2 || !(hxWLebt(L) || hxWLm(L))) continue;
    const kNow = hxPassK(L, Math.round(hxF(now)));
    for (let k = kNow; k <= kNow + 4 && hxPassF(L, k) < hxF(now + ahead); k++) {
      if (k === kNow && hxPassF(L, k) < hxF(now)) continue;
      for (const id of L.sch) {
        const S = HX.sch.get(id); if (!hxWCan(S)) continue;
        const W0 = hxWBase(L, S); if (!W0 || !W0.n.length) continue;
        hxVarW(L, S, k, W0);
        const r = S.vc && S.vc.m.get(k); if (!r || !r.chg || !r.chg.length) continue;
        const a = hxPassF(L, k), b = hxPassF(L, k + 1), B0 = L.d.b0 + k * L.d.beats, takt = W0.u === 'b' && hxTakt(L) && (L.sp || 1) === 1, key = hxWKeyNow();
        r.chg.forEach((x, i) => {
          const fr = takt ? hxFrameAt(B0 + Math.max(0, x.t)) : a + (Math.max(0, x.t) / W0.len) * (b - a), t = hxT(fr);
          if (t > now) hxKnAdd('v:' + S.key + ':' + k + ':' + i, hxWF(L, W0, x, key), t, Math.max(now, t - hxGdBarLen()), 'var', null, L.slot);
        });
      }
    }
  }
}
function hxKnFrame(c, w, h, now) {
  if (!HX.kn.size) return;
  const out = [];
  for (const [id, b] of HX.kn) {
    if (now > b.t + 0.35) { HX.kn.delete(id); continue; }
    if (now < b.t0) continue;
    const g = clamp((now - b.t0) / Math.max(0.05, b.t - b.t0), 0, 1), burst = now >= b.t ? (now - b.t) / 0.35 : 0;
    if (b.kind === 'wk') {   // a ring forming at the field's right edge, its loop's number inside
      const x = w - 22, y = 22, r = 6 + 8 * g;
      c.strokeStyle = 'rgba(134,240,208,' + (0.85 * (1 - burst)).toFixed(3) + ')'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g); c.stroke();
      if (b.slot != null) { c.fillStyle = c.strokeStyle; c.font = '600 10px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(b.slot + 1), x, y); }
      continue;
    }
    const x = b.x * w, y = 7, r = burst ? 3 + 9 * burst : 1.5 + 3.5 * g, a = burst ? 0.8 * (1 - burst) : 0.35 + 0.5 * g;
    out.push([b, x]);
    c.fillStyle = 'rgba(134,240,208,' + a.toFixed(3) + ')';
    if (burst) { for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.7, 1.3, 0, Math.PI * 2); c.fill(); } }
    else { c.beginPath(); c.ellipse(x, y + r * 0.2, r * 0.75, r, 0, 0, Math.PI * 2); c.fill(); }
  }
  // an answer's buds are a chain: a thin thread from each to the one before it
  c.strokeStyle = 'rgba(134,240,208,0.35)'; c.lineWidth = 1;
  for (const [b, x] of out) if (b.prev) { const p = HX.kn.get(b.prev); if (p && now >= p.t0 && now < p.t + 0.35) { c.beginPath(); c.moveTo(p.x * w, 7); c.lineTo(x, 7); c.stroke(); } }
}

