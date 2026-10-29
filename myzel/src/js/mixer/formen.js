/* ---------- Formen: Sättigung, Breite, Pumpen ---------- */
// The saturation as satSet builds it, seen from the input of the shaper (after the fader): half dry, half tanh(g·x)/g,
// levelled to meet the dry line at 0,2 (−14 dBFS) – quiet parts lifted a little, loud ones rounded off.
function mxSatY(a, x) {
  if (a <= 0) return x;
  const g = 1 + 9 * a, mk = 0.2 / (Math.tanh(g * 0.2) / g), m = a / 2;
  return (1 - m) * x + m * mk * Math.tanh(g * x) / g;
}
// where the signal sits on that curve: the meter reads after it, so step back through Pumpen and invert the curve
function mxSatIn(a, y) {
  if (a <= 0 || y <= 0) return y;
  let lo = 0, hi = 4;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (mxSatY(a, m) < y) lo = m; else hi = m; }
  return lo;
}
function mxdDuckChips(cls) {
  const box = h('div', { class: 'mxd-chips ' + (cls || ''), role: 'radiogroup', 'aria-label': 'Pumpen im Takt von – gilt für alle Kanäle' });
  const btns = [0, 1, 2, 3].map((i) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': 'Spur ' + (i + 1), title: 'Spur ' + (i + 1), style: '--lc:' + COL.lanes[i], onclick: () => setParam('mix.duckSrc', String(i)) }, h('span', { 'aria-hidden': 'true' }, String(i + 1)));
    box.append(b);
    return b;
  });
  bindCtl('mix.duckSrc', (v) => btns.forEach((b, i) => { const on = String(i) === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }));
  box.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (Number(P['mix.duckSrc']) + d + 4) % 4;
    setParam('mix.duckSrc', String(n)); btns[n].focus();
  });
  return box;
}
function mxdCard(cls, title, sub, ...kids) {
  return h('div', { class: 'mxd-card ' + cls }, h('div', { class: 'mxd-ch' }, h('b', null, title), sub), ...kids);
}
function mxdBuildFormen() {
  const F = MXD.fo = { pump: mxTrace(150, 50), widPts: 0 };
  F.satCv = h('canvas', { 'aria-hidden': 'true' }); F.widCv = h('canvas', { 'aria-hidden': 'true' }); F.pmpCv = h('canvas', { 'aria-hidden': 'true' });
  F.satK = mxdKnob(); F.widK = mxdKnob(); F.pmpK = mxdKnob('', { off: () => mxdIsTakt(MXD.k), offTxt: 'Takt', offAria: 'gibt den Takt fürs Pumpen' }); F.relK = mxdKnob();
  F.satT = h('small'); F.widT = h('small'); F.pmpT = h('small');
  const sat = mxdCard('mxd-sat', 'Sättigung', F.satT, h('div', { class: 'mxd-cvb' }, F.satCv), h('div', { class: 'mxd-kr' }, F.satK.box));
  F.attK = mxdKnob(); F.ausK = mxdKnob();
  const tra = mxdCard('mxd-tra', 'Anschlag', h('small', null, 'Anfang und Ausklang der Töne'), h('div', { class: 'mxd-kr' }, F.attK.box, F.ausK.box));
  const wid = mxdCard('mxd-wid', 'Breite', F.widT, h('div', { class: 'mxd-cvb' }, F.widCv), h('div', { class: 'mxd-kr' }, F.widK.box));
  F.chips = mxdDuckChips();
  const pmp = mxdCard('mxd-pmp', 'Pumpen', F.pmpT, h('div', { class: 'mxd-cvb' }, F.pmpCv),
    h('div', { class: 'mxd-kr' }, F.pmpK.box, F.relK.box, h('div', { class: 'mxd-src' }, h('span', { class: 'mxd-lab', title: 'Pumpen im Takt von – gilt für alle Kanäle' }, 'Takt', h('em', null, ' · gilt für alle Kanäle')), F.chips)));
  mxdWatch('mix.duckSrc', 'mix.duckRel', 'seq.bpm');
  return h('section', { class: 'mxd-sec mxd-fo', 'aria-label': 'Formen' }, mxdSh('Formen', 'Sättigung · Anschlag · Breite · Pumpen'), h('div', { class: 'mxd-cards' }, sat, tra, wid, pmp));
}
const mxdIsTakt = (k) => MXK[k] && MXK[k].kind === 'lane' && Number(P['mix.duckSrc']) === MXK[k].lane;
function mxdFormenAim(k) {
  const F = MXD.fo, c = MXK[k];
  mxdAim(F.satK, k, 'x' + k + '.sat', 'Menge', 'Sättigung', '#ffb35c');
  mxdAim(F.attK, k, 'x' + k + '.att', 'Anschlag', 'Anschlag: Tonanfänge lauter oder leiser', '#ffd27a');
  mxdAim(F.ausK, k, 'x' + k + '.aus', 'Ausklang', 'Ausklang: länger oder kürzer', '#ffd27a');
  mxdAim(F.widK, k, 'x' + k + '.wid', 'Breite', 'Stereobreite', c.col);
  mxdAim(F.pmpK, k, 'x' + k + '.duck', 'Tiefe', 'Pumpen', '#ff8f9e');
  mxdAim(F.relK, k, 'mix.duckRel', 'Rückkehr', 'Pumpen: Rückkehr, für alle Kanäle', '#ff8f9e');
  F.pump.b.fill(0);
}
function mxdFormenText(k) {
  const F = MXD.fo, a = P['x' + k + '.sat'], w = P['x' + k + '.wid'], d = P['x' + k + '.duck'], src = Number(P['mix.duckSrc']);
  // what the curve does to the peaks right now (from the operating point the picture found)
  const x = F.satX || 0, g = a > 0 && x > 0.003 ? 20 * Math.log10(mxSatY(a, x) / x) : 0;
  F.satT.textContent = !(a > 0) ? 'aus' : x > 0.003 ? 'Spitze ' + (g < 0 ? MX_MINUS : '+') + dec(Math.abs(g).toFixed(1)) + ' dB' : 'still';
  F.widT.textContent = w < 0.005 ? 'Mono' : w > 1.005 ? 'breiter' : w < 0.995 ? 'schmaler' : 'unverändert';
  F.pmpT.textContent = mxdIsTakt(k) ? 'gibt den Takt' : d > 0 ? 'von Spur ' + (src + 1) : 'aus';
}
function mxdSatDraw(F, k, w, hh) {
  const a = P['x' + k + '.sat'], cc = MXK[k], cx = w / 2, cy = hh / 2, s = Math.min(w / 2 - 6, hh / 2 - 6) / 1.25, dpr = mxDpr();
  // the curve changes only with the amount: it lives in a layer of its own
  const key = a + ':' + w + 'x' + hh + ':' + dpr;
  if (F.satKey !== key) {
    F.satKey = key; F.satBg = F.satBg || document.createElement('canvas');
    const b = mxFit(F.satBg, w, hh, 0, dpr);
    b.clearRect(0, 0, w, hh);
    b.strokeStyle = 'rgba(240,230,216,.08)'; b.lineWidth = 1;
    b.beginPath(); b.moveTo(cx - 1.25 * s, cy + 0.5); b.lineTo(cx + 1.25 * s, cy + 0.5); b.moveTo(cx + 0.5, cy - 1.25 * s); b.lineTo(cx + 0.5, cy + 1.25 * s); b.stroke();
    b.strokeStyle = 'rgba(240,230,216,.05)'; b.strokeRect(cx - s + 0.5, cy - s + 0.5, 2 * s, 2 * s);   // ±1 = 0 dBFS
    b.setLineDash([2, 3]); b.strokeStyle = 'rgba(240,230,216,.18)';
    b.beginPath(); b.moveTo(cx - 1.25 * s, cy + 1.25 * s); b.lineTo(cx + 1.25 * s, cy - 1.25 * s); b.stroke(); b.setLineDash([]);
    // where the curve meets the dry line: 0,2 = −14 dBFS
    b.fillStyle = 'rgba(255,179,92,.55)'; b.fillRect(cx + 0.2 * s - 0.5, cy + 3, 1, 4); b.fillRect(cx - 0.2 * s - 0.5, cy - 7, 1, 4);
    b.beginPath();
    for (let i = 0; i <= 64; i++) { const x = -1.25 + i / 64 * 2.5, y = mxSatY(a, x); i ? b.lineTo(cx + x * s, cy - y * s) : b.moveTo(cx + x * s, cy - y * s); }
    b.globalCompositeOperation = 'lighter'; b.strokeStyle = mxRgba([255, 179, 92], a > 0 ? 0.28 : 0.1); b.lineWidth = 5; b.stroke(); b.globalCompositeOperation = 'source-over';
    b.strokeStyle = a > 0 ? '#ffd29a' : 'rgba(240,230,216,.5)'; b.lineWidth = 1.6; b.stroke();
    b.font = '400 9px ' + COL.fontNum; b.fillStyle = 'rgba(168,153,138,.72)'; b.textAlign = 'left'; b.textBaseline = 'top';
    b.fillText('raus', 2, 2); b.textAlign = 'right'; b.textBaseline = 'bottom'; b.fillText('rein', w - 2, hh - 1);
  }
  const c = mxFit(F.satCv, w, hh, 0, dpr);
  c.clearRect(0, 0, w, hh); c.drawImage(F.satBg, 0, 0, w, hh);
  const st = MIX.s[k], m = st && st.m;
  F.satX = 0;
  if (m && MIX.meter) {
    const d = duckDepth(st, A.ctx.currentTime), y = Math.max(m.pk[0], m.pk[1]) / Math.max(0.06, 1 - d), x = Math.min(1.25, mxSatIn(a, y));
    F.satX = x;
    if (x > 0.003) {
      const px = cx + x * s, py = cy - mxSatY(a, x) * s;
      c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow(cc.col), px - 11, py - 11, 22, 22); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff6ea'; c.beginPath(); c.arc(px, py, 2.6, 0, MX_TAU); c.fill();
      c.fillStyle = mxRgba(cc.rgb, 0.5); c.beginPath(); c.arc(cx - x * s, cy + mxSatY(a, x) * s, 1.8, 0, MX_TAU); c.fill();
    }
  }
}
// the stereo fan: every sample as a point at the angle of its side/mid ratio (folded to the front) and the distance
// of its level – a polar vectorscope. The wedge is what Breite sets: a pure L or R signal lands at atan(Breite).
function mxdWidDraw(cv, w, hh, k, m, wid, pan) {
  const c = mxFit(cv, w, hh), cc = MXK[k], cx = w / 2, cy = hh - 7, R = Math.min(hh - 18, w / 2 - 8);   // 4 px more on top: the M stays whole
  c.clearRect(0, 0, w, hh);
  c.strokeStyle = 'rgba(240,230,216,.09)'; c.lineWidth = 1;
  c.beginPath(); c.arc(cx, cy, R, Math.PI, MX_TAU); c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.5, Math.PI, MX_TAU); c.stroke();
  c.beginPath(); c.moveTo(cx - R, cy + 0.5); c.lineTo(cx + R, cy + 0.5); c.moveTo(cx + 0.5, cy); c.lineTo(cx + 0.5, cy - R); c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + s * R * Math.SQRT1_2, cy - R * Math.SQRT1_2); c.stroke(); }
  const half = Math.atan(clamp(wid, 0, 2)), rot = clamp(pan, -1, 1) * Math.PI / 4;
  c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, -Math.PI / 2 + rot - half, -Math.PI / 2 + rot + half); c.closePath();
  c.fillStyle = mxRgba(cc.rgb, 0.12); c.fill(); c.strokeStyle = mxRgba(cc.rgb, half < 0.01 ? 0.8 : 0.45); c.lineWidth = half < 0.01 ? 1.6 : 1; c.stroke();
  if (m && MIX.meter) {
    const bl = m.bl, br = m.br, N = bl.length;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = mxRgba(cc.rgb, 0.65);
    for (let i = 0, st = MOBILE ? 8 : 4; i < N; i += st) {
      const l = bl[i], r = br[i], a = Math.abs(l) + Math.abs(r);
      if (a < 1e-4) continue;
      let md = (l + r) * Math.SQRT1_2, sd = (r - l) * Math.SQRT1_2;
      if (md < 0) { md = -md; sd = -sd; }
      const th = Math.atan2(sd, md), rr = clamp((20 * Math.log10(Math.hypot(l, r)) + 48) / 48, 0, 1) * R;
      c.fillRect(cx + Math.sin(th) * rr - 0.8, cy - Math.cos(th) * rr - 0.8, 1.6, 1.6);
    }
    c.globalCompositeOperation = 'source-over';
  }
  if (R < 30) return;
  c.font = '400 9px ' + COL.fontNum; c.fillStyle = 'rgba(168,153,138,.75)'; c.textBaseline = 'bottom'; c.textAlign = 'center';
  c.fillText('L', cx - R * 0.78, cy - R * 0.62); c.fillText('R', cx + R * 0.78, cy - R * 0.62); c.fillText('M', cx, cy - R - 1);
}
// Pumpen over the last 3 s: how far the channel is pulled down (rose, from the top), and the hits that pull (ticks).
// The trace keeps clear of its numbers: they stand in a gutter on the right (0, −12, −24 dB).
function mxdPumpDraw(cv, w, hh, T, lane, takt, col) {
  const dpr = mxDpr(), n = T.b.length, top = 6, bot = hh - 9, span = bot - top, tw = w - 30, bk = w + 'x' + hh + ':' + dpr;
  if (cv.mxBk !== bk) {
    cv.mxBk = bk; cv.mxBg = cv.mxBg || document.createElement('canvas');
    const b = mxFit(cv.mxBg, w, hh, 0, dpr);
    b.clearRect(0, 0, w, hh);
    b.font = '400 8.5px ' + COL.fontNum; b.textBaseline = 'middle'; b.textAlign = 'right';
    for (const db of [0, 6, 12, 24]) {
      const y = Math.round(top + Math.sqrt(db / 24) * span) + 0.5;
      b.fillStyle = 'rgba(240,230,216,' + (db ? 0.05 : 0.14) + ')'; b.fillRect(0, y, tw, 1);
      if (db === 0 || db === 24 || (db === 12 && span >= 30)) { b.fillStyle = 'rgba(168,153,138,.7)'; b.fillText(db ? MX_MINUS + db : '0 dB', w - 1, y); }
    }
  }
  const c = mxFit(cv, w, hh, 0, dpr);
  c.clearRect(0, 0, w, hh); c.drawImage(cv.mxBg, 0, 0, w, hh);
  if (A.ctx && lane >= 0) {
    const now = A.ctx.currentTime, Tsec = n / T.rate, lc = COL.lanes[lane];
    for (const t of MX.hitLog[lane]) {
      const x = tw - (now - t) / Tsec * tw;
      if (x < 0 || x > tw) continue;
      c.fillStyle = lc; c.fillRect(Math.round(x) - 0.5, bot + 2, 1.5, 6);
    }
  }
  if (takt) return;
  c.beginPath();
  for (let j = 0; j < n; j++) { const v = T.b[(T.i + j) % n], x = j / (n - 1) * tw, y = top + Math.sqrt(clamp(v, 0, 24) / 24) * span; j ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,143,158,.22)'; c.lineWidth = 4; c.stroke(); c.globalCompositeOperation = 'source-over';
  c.strokeStyle = col || '#ff8f9e'; c.lineWidth = 1.4; c.stroke();
}

