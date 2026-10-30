/* =====================================================================
   UI: the Effekte page as a chain of modules (owner, 30.10.2026: „Die Effekt-Seite … sieht sehr basic aus, im Vergleich
   zum Mixer oder Arp ziemlich mau … mach Myzel zu einem Gesamtkunstwerk“) – dev/klang/design-konzept.md.
   Each effect is a module card (its colour, glyph, a small picture of what it does, its share as a badge); above them
   the Faden: the signal path as a thread of nodes, tap one to go there. The pictures are drawn only when a knob of
   theirs moved and the card is in view – nothing runs per frame.
   ===================================================================== */
// k: the params' prefix; t: the card's title; s: the node's short name; c: its colour (the returns' as in the mixer);
// row: a = in series, b = in parallel (sends), s = the Summe
const FXM_DEF = [
  { k: 'drv', t: 'Verzerrung', s: 'Verzerrung', c: '#ff8a5b', row: 'a' },
  { k: 'rng', t: 'Ringmodulator', s: 'Ring', c: '#ff8f9e', row: 'a' },
  { k: 'flt', t: 'Filter', s: 'Filter', c: '#ffb35c', row: 'a' },
  { k: 'pha', t: 'Phaser', s: 'Phaser', c: '#c4a8ff', row: 'a' },
  { k: 'cho', t: 'Schweben', s: 'Schweben', c: '#86f0d0', row: 'a' },
  { k: 'mov', t: 'Bewegung', s: 'Kreisen', c: '#e8d27a', row: 'a' },
  { k: 'dly', t: 'Echo', s: 'Echo', c: '#6cc9ef', row: 'b' },
  { k: 'rev', t: 'Hall', s: 'Hall', c: '#d6cbff', row: 'b' },
  ...FX_RETS.map(([r, name, c]) => ({ k: r, t: name, s: name, c, row: 'b' })),
  { k: 'mst', t: 'Summe', s: 'Summe', c: '#f0e6d8', row: 's' },
];
const FXM = { m: {}, raf: 0, io: null, ro: null, strip: null, mini: null, cur: null };
const fxmSvg = (d, extra = '') => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + extra + '</svg>';
// each module's glyph: what it does to a wave, in one stroke
const FXM_ICO = {
  drv: fxmSvg('<path d="M2.5 13.5c1.6-6 3.4-7.5 5-7.5h2.4c1.5 0 2 2.8 2.6 6 .6 3.2 1.1 6 2.6 6h2.4c1.6 0 3.4-1.5 5-7.5"/>'),
  rng: fxmSvg('<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'),
  flt: fxmSvg('<path d="M2.5 9.5h9c2.5 0 3.4-2.6 4.4-2.6 1.2 0 1.8 4.4 5.6 12.6"/>'),
  pha: fxmSvg('<path d="M2.5 8c2 0 2.6 9 4.4 9S9.4 8 11.4 8s2.4 9 4.2 9 2.4-9 4.4-9h1.5"/>'),
  cho: fxmSvg('<path d="M2.5 12c2.5-6 5-6 7.5 0s5 6 7.5 0c1.2-2.9 2.4-4.4 4-4.5"/><path d="M2.5 15c2.5-6 5-6 7.5 0s5 6 7.5 0" opacity=".5"/>'),
  mov: fxmSvg('<ellipse cx="12" cy="12" rx="9" ry="4.5"/><circle cx="18.6" cy="9" r="1.8" fill="currentColor" stroke="none"/>'),
  dly: fxmSvg('<path d="M4 6v12"/><path d="M9.5 8v8" opacity=".75"/><path d="M14.5 9.5v5" opacity=".5"/><path d="M19 11v2" opacity=".3"/>'),
  rev: fxmSvg('<path d="M4 19V11a8 8 0 0 1 16 0v8"/><path d="M8 19v-7a4 4 0 0 1 8 0v7" opacity=".55"/>'),
  fx: fxmSvg('<circle cx="8" cy="9" r="2.6"/><circle cx="15.5" cy="7.5" r="1.8"/><circle cx="14" cy="15" r="3.2"/><circle cx="6.5" cy="16.5" r="1.3"/>'),
  fx2: fxmSvg('<circle cx="16" cy="9" r="2.6"/><circle cx="8.5" cy="7.5" r="1.8"/><circle cx="10" cy="15" r="3.2"/><circle cx="17.5" cy="16.5" r="1.3"/>'),
  mst: fxmSvg('<path d="M3 6c5 0 6 6 9 6M3 18c5 0 6-6 9-6h9"/><path d="M18 9l3 3-3 3"/>'),
};
// how strongly a module acts (0…1) – its node's glow, the card's light – and what its badge says
function fxmAmt(k) {
  const n = (id) => clamp(toNorm(PD[id], P[id]), 0, 1);
  switch (k) {
    case 'flt': { const t = P['flt.type'], f = n('flt.freq'); return Math.max(t === 'lowpass' ? Math.pow(1 - f, 0.7) : t === 'highpass' ? Math.pow(f, 0.7) : 1, Math.min(1, P['flt.lfoDepth'] / 2) * 0.6); }
    case 'mov': return Math.max(P['mov.pan'], P['mov.vib'] / 30, P['mov.drift'] / 40) > 0 ? clamp(Math.max(P['mov.pan'], P['mov.vib'] / 30, P['mov.drift'] / 40), 0.15, 1) : 0;
    case 'mst': return 1;
    default: return P[k + '.mix'] > 0 ? clamp(0.18 + P[k + '.mix'] * 0.82, 0, 1) : 0;
  }
}
function fxmBadge(k) {
  if (k === 'flt') return { t: fmt(PD['flt.freq'], P['flt.freq']), on: true };
  if (k === 'mov') return { t: 'Kreisen ' + fmt(PD['mov.pan'], P['mov.pan']), on: fxmAmt('mov') > 0 };
  if (k === 'mst') return { t: fmt(PD['mst.vol'], P['mst.vol']), on: true };
  const v = P[k + '.mix'];
  return { t: v > 0 ? fmt(PD[k + '.mix'], v) : 'aus', on: v > 0 };
}
// a module card: section() with its glyph, badge and picture; kids as section()'s
function modul(k, sub, ...kids) {
  const D = FXM_DEF.find((d) => d.k === k);
  const cv = h('canvas', { class: 'mod-cv', 'aria-hidden': 'true' }), cap = h('span', { class: 'mod-cap', 'aria-hidden': 'true' });
  const s = section(D.t, sub, h('div', { class: 'mod-vis' }, cv, cap), ...kids);
  s.classList.add('modul'); s.dataset.fx = k; s.style.setProperty('--ac', D.c); s.id = 'fxm-' + k;
  const head = s.firstChild, badge = h('span', { class: 'mod-amt' });
  head.prepend(h('span', { class: 'mod-ico', html: FXM_ICO[k] }));
  head.append(badge);
  const M = FXM.m[k] = { k, D, s, cv, cap, badge, seen: false, dirty: true, w: 0, hgt: 0, nodes: [] };
  for (const box of [FXM.strip, FXM.mini]) if (box) M.nodes.push(...box.querySelectorAll('.fxf-n[data-fx="' + k + '"]'));   // (the Faden is built first)
  const ids = Object.keys(PD).filter((id) => id.startsWith(k + '.'));
  if (k === 'dly') ids.push('seq.bpm');
  for (const id of ids) bindCtl(id, () => fxmDirty(M));
  return s;
}
function fxmDirty(M) {
  M.dirty = true;
  if (!FXM.raf) FXM.raf = requestAnimationFrame(fxmFlush);
}
function fxmFlush() {
  FXM.raf = 0;
  for (const k in FXM.m) {
    const M = FXM.m[k];
    if (!M.dirty) continue;
    fxmState(M);
    if (M.seen) { M.dirty = false; fxmDraw(M); }
  }
}
// the light of a module: its badge, its card, its nodes in the Faden
function fxmState(M) {
  const a = fxmAmt(M.k), b = fxmBadge(M.k);
  if (M.a !== a) {
    M.a = a; M.s.style.setProperty('--a', a.toFixed(3));
    M.s.classList.toggle('ruht', !b.on);
    for (const n of M.nodes) { n.style.setProperty('--a', a.toFixed(3)); n.classList.toggle('ruht', !b.on); }
  }
  if (M.badge.textContent !== b.t) { M.badge.textContent = b.t; for (const n of M.nodes) if (n.dataset.lab) n.setAttribute('aria-label', n.dataset.lab + ' – ' + b.t); }
}

/* ---------- the pictures ---------- */
function fxmDraw(M) {
  const r = M.cv.getBoundingClientRect();
  if (!r.width) { M.dirty = true; return; }
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (M.cv.width !== W || M.cv.height !== H) { M.cv.width = W; M.cv.height = H; }
  const c = M.cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, r.width, r.height);
  const col = M.D.c, k = M.k;
  let cap = '';
  try { cap = (FXM_PIC[k] || FXM_PIC[k.replace(/\d+$/, '')] || FXM_PIC.fx)(c, r.width, r.height, col, k) || ''; } catch (e) { cap = ''; }
  if (M.cap.textContent !== cap) M.cap.textContent = cap;
}
const fxmA = (col, a) => { const n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
// a line through y(x) for x in 0…W, glowing in the module's colour; fill: down to the base line yb
function fxmLine(c, W, f, col, o = {}) {
  c.beginPath();
  for (let x = 0; x <= W; x += 1.5) { const y = f(x); if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  if (o.fill != null) {
    c.save(); c.lineTo(W, o.fill); c.lineTo(0, o.fill); c.closePath();
    const g = c.createLinearGradient(0, 0, 0, o.fill); g.addColorStop(0, fxmA(col, o.fa || 0.22)); g.addColorStop(1, fxmA(col, 0));
    c.fillStyle = g; c.fill(); c.restore();
    c.beginPath(); for (let x = 0; x <= W; x += 1.5) { const y = f(x); if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  }
  c.lineWidth = o.w || 1.6; c.strokeStyle = o.dim ? fxmA(col, o.dim) : col;
  if (!o.dim) { c.shadowColor = fxmA(col, 0.55); c.shadowBlur = 6; }
  c.stroke(); c.shadowBlur = 0;
}
function fxmBase(c, W, y, a = 0.07) { c.fillStyle = 'rgba(240,230,216,' + a + ')'; c.fillRect(0, Math.round(y), W, 1); }
// the frequency axis (20 Hz … 20 kHz, log) with faint decades
const fxmFx = (W, f) => (Math.log(f / 20) / Math.log(1000)) * W;
const fxmXf = (W, x) => 20 * Math.pow(1000, x / W);
function fxmDecades(c, W, H) { c.fillStyle = 'rgba(240,230,216,0.05)'; for (const f of [100, 1000, 10000]) c.fillRect(Math.round(fxmFx(W, f)), 0, 1, H); }
// a biquad's response as Web Audio computes it (its spec's formulas; Q of low- and highpass in dB) – complex [re, im]
const FXM_FS = 48000;
function fxmBq(type, f0, Q, f, gain = 0) {
  const w0 = 2 * Math.PI * clamp(f0, 1, FXM_FS / 2 - 1) / FXM_FS, cw = Math.cos(w0), sw = Math.sin(w0);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass' || type === 'highpass') {
    const al = sw / (2 * Math.pow(10, Q / 20));
    if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; } else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if (type === 'lowshelf' || type === 'highshelf') {
    const A = Math.pow(10, gain / 40), al = sw / 2 * Math.SQRT2, s = 2 * Math.sqrt(A) * al, lo = type === 'lowshelf' ? 1 : -1;
    b0 = A * ((A + 1) - lo * (A - 1) * cw + s); b1 = lo * 2 * A * ((A - 1) - lo * (A + 1) * cw); b2 = A * ((A + 1) - lo * (A - 1) * cw - s);
    a0 = (A + 1) + lo * (A - 1) * cw + s; a1 = -lo * 2 * ((A - 1) + lo * (A + 1) * cw); a2 = (A + 1) + lo * (A - 1) * cw - s;
  } else {
    const al = sw / (2 * Q);
    if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; } else if (type === 'notch') { b0 = 1; b1 = -2 * cw; b2 = 1; } else { b0 = 1 - al; b1 = -2 * cw; b2 = 1 + al; }
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  }
  const w = 2 * Math.PI * f / FXM_FS, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2), dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2), dd = dr * dr + di * di;
  return [(nr * dr + ni * di) / dd, (ni * dr - nr * di) / dd];
}
const fxmDb = (z) => 10 * Math.log10(Math.max(1e-12, z[0] * z[0] + z[1] * z[1]));
// a fixed scatter (the same each time it is drawn)
const fxmRnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const FXM_PIC = {
  // the wave through the shaper (driveCurve's shapes, blended by the share)
  drv(c, W, H, col) {
    const type = P['drv.type'], amt = P['drv.amt'], mix = P['drv.mix'], cy = H / 2, A = H * 0.36;
    let shape;
    if (type === 'fold') { const g = 1 + amt * 7; shape = (x) => Math.sin(x * g * Math.PI / 2) * 0.5; }
    else if (type === 'crush') { const steps = Math.pow(2, 16 - amt * 14) / 2; shape = (x) => Math.round(x * steps) / steps; }
    else { const k = 1 + amt * 30, nrm = 0.25 / Math.tanh(k * 0.25); shape = (x) => Math.tanh(k * x) * nrm; }
    const inp = (x) => 0.5 * Math.sin(x / W * Math.PI * 4);
    let pk = 1e-6; for (let x = 0; x <= W; x += 2) pk = Math.max(pk, Math.abs((1 - mix) * inp(x) + mix * shape(inp(x))));
    fxmBase(c, W, cy);
    fxmLine(c, W, (x) => cy - inp(x) / 0.5 * A, col, { dim: 0.22, w: 1 });
    fxmLine(c, W, (x) => cy - ((1 - mix) * inp(x) + mix * shape(inp(x))) / pk * A, col);
    return { tube: 'Röhre', fold: 'Falter', crush: 'Bitbrecher' }[type] + ' · ' + Math.round(amt * 100) + ' %';
  },
  // a slow wave times the carrier: the sidebands' beating
  rng(c, W, H, col) {
    const f = P['rng.freq'], mix = P['rng.mix'], cy = H / 2, A = H * 0.36;
    const cyc = clamp(Math.log2(f / 0.5) * 4.2, 0.6, 70);
    const inp = (x) => Math.sin(x / W * Math.PI * 3);
    fxmBase(c, W, cy);
    fxmLine(c, W, (x) => cy - inp(x) * A, col, { dim: 0.22, w: 1 });
    fxmLine(c, W, (x) => cy - inp(x) * ((1 - mix) + mix * Math.sin(x / W * Math.PI * 2 * cyc)) * A, col, { w: cyc > 30 ? 1.1 : 1.5 });
    return fmt(PD['rng.freq'], f) + (f < 20 ? ' · Zittern' : '');
  },
  // the response, and the band the slow wave sweeps it through
  flt(c, W, H, col) {
    const t = P['flt.type'], f0 = P['flt.freq'], q = P['flt.q'], d = P['flt.lfoDepth'];
    const y = (db) => H * 0.46 - db * H / 64;
    fxmDecades(c, W, H); fxmBase(c, W, y(0));
    const lo = f0 * Math.pow(2, -d), hi = f0 * Math.pow(2, d);
    if (d > 0.01) {
      const x0 = fxmFx(W, lo), x1 = fxmFx(W, hi), g = c.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, fxmA(col, 0)); g.addColorStop(0.5, fxmA(col, 0.13)); g.addColorStop(1, fxmA(col, 0));
      c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, H);
      for (const fe of [lo, hi]) fxmLine(c, W, (x) => clamp(y(fxmDb(fxmBq(t, fe, q, fxmXf(W, x)))), 2, H + 2), col, { dim: 0.28, w: 1 });
    }
    fxmLine(c, W, (x) => clamp(y(fxmDb(fxmBq(t, f0, q, fxmXf(W, x)))), 2, H + 2), col, { fill: H });
    return { lowpass: 'Tiefpass', bandpass: 'Bandpass', highpass: 'Hochpass', notch: 'Kerbe' }[t] + (d > 0.01 ? ' · Welle ' + dec(P['flt.lfoRate'] < 1 ? P['flt.lfoRate'].toFixed(2) : P['flt.lfoRate'].toFixed(1)) + ' Hz' : '');
  },
  // six allpasses (chain.js) beside the dry signal: the notches, at the sweep's middle and its two ends
  pha(c, W, H, col) {
    const mix = P['pha.mix'], q = 0.5 + P['pha.fb'] * 10, oct = P['pha.depth'] * 2, F = [180, 360, 720, 1440, 2600, 4200];
    const resp = (sh, f) => {
      let re = 1, im = 0;
      for (const fa of F) { const z = fxmBq('allpass', fa * sh, q, f); const r2 = re * z[0] - im * z[1]; im = re * z[1] + im * z[0]; re = r2; }
      return fxmDb([(1 - mix * 0.5) + mix * 0.5 * re, mix * 0.5 * im]);
    };
    let lo = -3; for (let x = 0; x <= W; x += 6) lo = Math.min(lo, resp(1, fxmXf(W, x)));
    const top = 12, y = (db) => top + (-db) / Math.min(40, -lo) * (H - top - 6);
    fxmDecades(c, W, H); fxmBase(c, W, y(0));
    if (oct > 0.01) for (const sh of [Math.pow(2, -oct), Math.pow(2, oct)]) fxmLine(c, W, (x) => clamp(y(resp(sh, fxmXf(W, x))), 2, H + 2), col, { dim: 0.25, w: 1 });
    fxmLine(c, W, (x) => clamp(y(resp(1, fxmXf(W, x))), 2, H + 2), col, { fill: H, fa: 0.16 });
    return dec(P['pha.rate'] < 1 ? P['pha.rate'].toFixed(2) : P['pha.rate'].toFixed(1)) + ' Hz';
  },
  // two voices a little apart: their beating, as deep as the depth, as fast as the tempo
  cho(c, W, H, col) {
    const mix = P['cho.mix'], dep = P['cho.depth'], beats = clamp(1 + Math.log2(P['cho.rate'] / 0.03) * 0.9, 1, 9), cy = H / 2, A = H * 0.38;
    fxmBase(c, W, cy);
    const env = (x) => 1 - dep * mix * 0.85 * (0.5 - 0.5 * Math.cos(x / W * Math.PI * 2 * beats));
    fxmLine(c, W, (x) => cy - env(x) * A, col, { dim: 0.3, w: 1 });
    fxmLine(c, W, (x) => cy + env(x) * A, col, { dim: 0.3, w: 1 });
    fxmLine(c, W, (x) => cy - env(x) * A * Math.sin(x / W * Math.PI * 2 * 9), col, { w: 1.2 });
    return dec(P['cho.rate'] < 1 ? P['cho.rate'].toFixed(2) : P['cho.rate'].toFixed(1)) + ' Hz';
  },
  // the pitch trembling (Vibrato, Taumeln) on the left; on the right the voices circling between left and right
  mov(c, W, H, col) {
    const cy = H / 2, w1 = W * 0.62, vib = Math.sqrt(P['mov.vib'] / 60), dr = Math.sqrt(P['mov.drift'] / 80), cyc = clamp(P['mov.vibRate'] * 2.2, 1, 22), dc = clamp(P['mov.driftRate'] * 3, 0.4, 6);
    c.save(); c.beginPath(); c.rect(0, 0, w1, H); c.clip();
    fxmBase(c, w1, cy);
    fxmLine(c, w1, (x) => cy - (Math.sin(x / w1 * Math.PI * 2 * cyc) * vib * 0.6 + Math.sin(x / w1 * Math.PI * 2 * dc + 1.3) * dr * 0.8) * H * 0.42, col);
    c.restore();
    const ox = w1 + (W - w1) / 2, rx = (W - w1) * 0.36, ry = H * 0.22, pan = P['mov.pan'];
    c.strokeStyle = 'rgba(240,230,216,0.12)'; c.lineWidth = 1; c.beginPath(); c.ellipse(ox, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(240,230,216,0.4)'; c.font = '500 8px ' + (COL.fontNum || 'monospace'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('L', ox - rx - 7, cy + 8); c.fillText('R', ox + rx + 7, cy + 8);
    if (pan > 0.005) {
      c.strokeStyle = col; c.lineWidth = 1.6; c.shadowColor = fxmA(col, 0.55); c.shadowBlur = 6;
      c.beginPath(); c.ellipse(ox, cy, rx * pan, ry * Math.max(0.25, pan), 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.shadowBlur = 0;
      c.fillStyle = col; c.beginPath(); c.arc(ox + Math.cos(Math.PI * 1.95) * rx * pan, cy + Math.sin(Math.PI * 1.95) * ry * Math.max(0.25, pan), 2.6, 0, Math.PI * 2); c.fill();
    } else { c.fillStyle = col; c.beginPath(); c.arc(ox, cy, 2.4, 0, Math.PI * 2); c.fill(); }
    return 'Vibrato ' + fmt(PD['mov.vib'], P['mov.vib']);
  },
  // the taps: up the left, down the right (Ping-Pong), each as loud as the feedback leaves it
  dly(c, W, H, col) {
    let t; try { t = dlyTime(); } catch (e) { t = P['dly.ms'] / 1000; }
    const fb = P['dly.fb'], pp = P['dly.pp'], mix = P['dly.mix'], cy = H / 2, A = H * 0.4;
    let nt = 1; for (let a = 1; a > 0.05 && nt < 14; nt++) a *= Math.max(0.01, fb);
    const win = t * (Math.max(4, nt) + 0.6), bw = 2.4 + (1 - toNorm(PD['dly.tone'], P['dly.tone'])) * 3;
    fxmBase(c, W, cy);
    c.fillStyle = 'rgba(240,230,216,0.75)'; c.fillRect(6, cy - A, 2, A * 2);
    let a = 1;
    for (let n = 1; n <= Math.max(4, nt); n++) {
      if (n > 1) a *= fb;
      const v = Math.min(1, a);
      if (v < 0.03) break;
      const x = 7 + n * t / win * (W - 14) + Math.sin(n * 2.1) * P['dly.wow'] * 3;
      const l = n % 2 ? 1 : 1 - pp, r = n % 2 ? 1 - pp : 1;
      c.fillStyle = col; c.shadowColor = fxmA(col, 0.7); c.shadowBlur = 6; c.globalAlpha = 0.5 + 0.5 * v;
      c.fillRect(x - bw / 2, cy - v * l * A, bw, v * l * A); c.fillRect(x - bw / 2, cy, bw, v * r * A);
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
    return Math.round(t * 1000) + ' ms' + (P['dly.sync'] ? ' · ' + (PD['dly.div'].opts.find((o) => o[0] === P['dly.div']) || ['', ''])[1] : '') + (fb >= 1 ? ' · schwillt an' : '');
  },
  // the room's decay after the pre-delay, as a cloud of spores thinning out; damping darkens the tail
  rev(c, W, H, col) {
    const R = (typeof RAUM_LISTE !== 'undefined' && RAUM_LISTE.find((x) => x.id === P['rev.typ'])) || null;
    const T = R && R.t ? R.t * P['rev.len'] : P['rev.size'], pre = P['rev.pre'], win = clamp(T * 1.08 + pre, 0.6, 18), damp = P['rev.damp'];
    const x0 = 6 + pre / win * (W - 12), env = (x) => (x < x0 ? 0 : Math.max(0, 1 - ((x - x0) / (W - 12) * win) / T));
    const yb = H - 4, A = H - 10;
    const g = c.createLinearGradient(x0, 0, W, 0); g.addColorStop(0, fxmA(col, 0.32)); g.addColorStop(1, damp > 0.5 ? 'rgba(120,96,80,0.06)' : fxmA(col, 0.08));
    c.fillStyle = 'rgba(240,230,216,0.75)'; c.fillRect(5, yb - A, 2, A);
    c.beginPath(); c.moveTo(x0, yb); for (let x = x0; x <= W; x += 2) c.lineTo(x, yb - env(x) * A); c.lineTo(W, yb); c.closePath(); c.fillStyle = g; c.fill();
    fxmLine(c, W, (x) => (x < x0 ? yb : yb - env(x) * A), col, { w: 1.2 });
    for (let i = 0; i < 150; i++) {
      const x = x0 + fxmRnd(i) * (W - x0), e = env(x), yy = yb - fxmRnd(i + 500) * e * A;
      if (fxmRnd(i + 900) > e * 1.4 + 0.08) continue;
      c.fillStyle = fxmA(col, 0.25 + 0.6 * e * (1 - damp * (x - x0) / W)); c.fillRect(x, yy, 1.4, 1.4);
    }
    return (R ? R.name : 'Nebel') + ' · ' + dec(T.toFixed(1)) + ' s';
  },
  // the returns' effects, each its own way
  fx(c, W, H, col, r) {
    const p = (k) => P[r + '.' + k], typ = p('typ'), cy = H / 2;
    fxmBase(c, W, cy, 0.05);
    if (typ === 'netz') {   // strings, bells, wood: resonances on the scale, ringing as long as the Nachklang
      const n = 13, br = p('hell');
      for (let i = 0; i < n; i++) {
        const x = 8 + i / (n - 1) * (W - 16), hh = (0.3 + 0.7 * fxmRnd(i + 3)) * (0.35 + 0.65 * p('klang')) * H * 0.42 * (1 - (1 - br) * i / n);
        c.fillStyle = fxmA(col, 0.18); c.fillRect(x - 3, cy - hh, 6, hh * 2);
        c.fillStyle = col; c.fillRect(x - 0.6, cy - hh, 1.2, hh * 2);
      }
    } else if (typ === 'wolke') {   // grains scattered over the beats, some backwards, some leaping
      const n = Math.round(14 + p('dichte') * 70), sp = p('streu');
      for (let i = 0; i < n; i++) {
        const x = 6 + fxmRnd(i) * (W - 12), yy = cy + (fxmRnd(i + 77) - 0.5) * H * (0.25 + sp * 0.65), r0 = 1 + fxmRnd(i + 31) * 2.4, back = fxmRnd(i + 13) < p('rueck');
        c.fillStyle = fxmA(col, 0.25 + 0.6 * fxmRnd(i + 5)); c.beginPath(); c.arc(x, yy, r0, 0, Math.PI * 2); c.fill();
        if (back) { c.strokeStyle = fxmA(col, 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(x, yy); c.lineTo(x - 7, yy); c.stroke(); }
      }
    } else if (typ === 'spektral') {   // a standing surface of partials
      const n = 48, hl = p('shell'), hold = p('halten');
      for (let i = 0; i < n; i++) {
        const x = 6 + i / (n - 1) * (W - 12), e = Math.exp(-i / n * (4.2 - hl * 3)) * (0.55 + 0.45 * fxmRnd(i + 11));
        c.fillStyle = fxmA(col, hold ? 0.85 : 0.25 + 0.5 * e); c.fillRect(x, H - 4 - e * (H - 10), 2.4, e * (H - 10));
      }
    } else if (typ === 'oktav') {   // an echo climbing (or falling) with each repeat
      const st = [-12, 5, 7, 12, 19][+p('schritt')] || 12, n = 2 + Math.round(p('onach') * 7), dir = st < 0 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const x = 10 + i / Math.max(1, n - 1) * (W - 24), yy = cy + dir * (0.5 - i / Math.max(1, n - 1)) * H * 0.62, a = Math.pow(0.8, i);
        c.fillStyle = fxmA(col, 0.3 + 0.6 * a); c.shadowColor = fxmA(col, 0.6); c.shadowBlur = 6;
        c.beginPath(); c.arc(x, yy, 2 + 2.4 * a, 0, Math.PI * 2); c.fill();
      }
      c.shadowBlur = 0;
    } else if (typ === 'vokal') {   // three formants (a e i o u – ranges after Peterson & Barney, men's)
      const V = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240]], v = p('vokal') * 4, i0 = Math.min(3, Math.floor(v)), fr = v - i0;
      const F = V[i0].map((f, j) => f + (V[Math.min(4, i0 + 1)][j] - f) * fr), q = 2 + p('reso') * 10;
      fxmDecades(c, W, H);
      fxmLine(c, W, (x) => { const f = fxmXf(W, x); let s = 0; for (const fo of F) s += 1 / (1 + Math.pow((f - fo) / (fo / q), 2)); return H - 4 - Math.min(1, s) * (H - 10); }, col, { fill: H, fa: 0.2 });
      return ['a', 'e', 'i', 'o', 'u'][Math.min(4, Math.round(p('vokal') * 4))];
    } else if (typ === 'harmo') {   // the voices above and below the played one
      fxmLine(c, W, () => cy, col, { dim: 0.45, w: 1.2 });
      for (const v of ['hv1', 'hv2', 'hv3']) {
        const n = Math.round(p(v)); if (!n) continue;
        const yy = cy - clamp(n / (p('hmod') === 'ton' ? 7 : 12), -1, 1) * H * 0.42;   // (an octave reaches the edge)
        fxmLine(c, W, (x) => yy + Math.sin(x / W * Math.PI * 6 + n) * p('hschim') * 2, col, { w: 1.4 });
      }
      return fmt(PD[r + '.hv1'], p('hv1')) + ' · ' + fmt(PD[r + '.hv2'], p('hv2')) + ' · ' + fmt(PD[r + '.hv3'], p('hv3'));
    }
    return '';
  },
  // the Summe's tone (two shelves at 120 Hz and 6,5 kHz) and its level
  mst(c, W, H, col) {
    const W1 = W - H - 10, y = (db) => H / 2 - db * H / 34;
    c.save(); c.beginPath(); c.rect(0, 0, W1, H); c.clip();
    fxmDecades(c, W1, H); fxmBase(c, W1, y(0));
    fxmLine(c, W1, (x) => { const f = fxmXf(W1, x); return y(fxmDb(fxmBq('lowshelf', 120, 0, f, P['mst.low'])) + fxmDb(fxmBq('highshelf', 6500, 0, f, P['mst.high']))); }, col, { fill: H, fa: 0.14 });
    c.restore();
    // beside it the Verdichtung: level in → level out, its knee bending lower the more it presses (a picture, not the curve)
    const x0 = W1 + 6, sz = H - 12, cmp = P['mst.comp'], th = 0.62 - cmp * 0.3, ra = 1 + cmp * 5;
    c.fillStyle = 'rgba(240,230,216,0.05)'; c.fillRect(W1 + 2, 4, 1, H - 8);
    c.strokeStyle = 'rgba(240,230,216,0.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, 6 + sz); c.lineTo(x0 + sz, 6); c.stroke();
    c.save(); c.translate(x0, 6);
    fxmLine(c, sz, (x) => { const u = x / sz, o = u < th ? u : th + (u - th) / ra; return sz - o * sz; }, col, { w: 1.4 });
    c.restore();
    return '';
  },
};

/* ---------- the Faden: the signal path, tap a node to go to its card ---------- */
function fxmNode(D, mini) {
  const b = h('button', { type: 'button', class: 'fxf-n', 'data-fx': D.k, style: '--ac:' + D.c, onclick: () => fxmGo(D.k) },
    h('i', { class: 'fxf-o', html: FXM_ICO[D.k] }), mini ? null : h('span', null, D.s));
  b.dataset.lab = 'Zu ' + D.t + ' springen';
  if (mini) b.tabIndex = -1;
  return b;
}
function fxmStrip() {
  const row = (r, mini) => FXM_DEF.filter((d) => d.row === r).map((d) => fxmNode(d, mini));
  const wire = document.createElementNS(SVGNS, 'svg'); wire.setAttribute('class', 'fxf-w'); wire.setAttribute('aria-hidden', 'true');
  const pod = h('div', { class: 'fxf-pod' }, h('em', null, 'parallel'), ...row('b'));
  const el = h('nav', { class: 'fxf', 'aria-label': 'Signalweg: Verzerrung, Ringmodulator, Filter, Phaser, Schweben und Kreisen in Reihe, dann parallel Echo, Hall, Effekt und Effekt 2 in die Summe. Tippen springt zum Effekt.' },
    wire, h('div', { class: 'fxf-a' }, ...row('a')), h('div', { class: 'fxf-b' }, pod, ...row('s')));
  // the same thread, small, held at the top once the big one has scrolled away
  const mini = h('div', { class: 'fxf-mini', 'aria-hidden': 'true' }, h('div', { class: 'fxf-mi' }, h('b', { class: 'fxf-cur' }), ...row('a', true), h('i', { class: 'fxf-gap' }), ...row('b', true), ...row('s', true)));
  FXM.strip = el; FXM.mini = mini; FXM.wire = wire; FXM.pod = pod;
  return [mini, el];
}
// the hyphae between the nodes: in series a thread, then one down to the Summe and one into the parallel pod, out of it into the Summe
function fxmWire() {
  const el = FXM.strip, svg = FXM.wire;
  if (!el || !el.offsetWidth) return;
  const R = el.getBoundingClientRect(), at = (n) => { const r = n.querySelector('.fxf-o').getBoundingClientRect(), l = n.querySelector('span'); return { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top, r: r.width / 2, lb: (l ? l.getBoundingClientRect().bottom : r.bottom) - R.top }; };
  const A = [...el.querySelectorAll('.fxf-a .fxf-n')].map(at), S = at(el.querySelector('.fxf-b > .fxf-n'));
  const pr = FXM.pod.getBoundingClientRect(), pod = { l: pr.left - R.left, r: pr.right - R.left, t: pr.top - R.top, b: pr.bottom - R.top };
  svg.setAttribute('viewBox', '0 0 ' + R.width + ' ' + R.height); svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
  let d = '';
  for (let i = 1; i < A.length; i++) { const p = A[i - 1], q = A[i], mx = (p.x + q.x) / 2, sag = i % 2 ? 2.5 : -2.5; d += 'M' + (p.x + p.r) + ' ' + p.y + 'Q' + mx + ' ' + (p.y + sag) + ' ' + (q.x - q.r) + ' ' + q.y; }
  const L = A[A.length - 1];
  const yb = L.lb + 3, dry = 'M' + L.x + ' ' + yb + 'L' + S.x + ' ' + (S.y - S.r);
  const tx = Math.min(pod.r - 18, L.x - 30), send = 'M' + L.x + ' ' + yb + 'C' + L.x + ' ' + (pod.t - 1) + ' ' + (tx + 20) + ' ' + (pod.t - 4) + ' ' + tx + ' ' + pod.t;
  const ret = 'M' + pod.r + ' ' + S.y + 'L' + (S.x - S.r) + ' ' + S.y;
  svg.innerHTML = '<path class="fxf-th" d="' + d + dry + '"/><path class="fxf-th send" d="' + send + '"/><path class="fxf-th" d="' + ret + '"/>';
}
function fxmGo(k) {
  const M = FXM.m[k]; if (!M) return;
  const top = sheetBody.scrollTop + M.s.getBoundingClientRect().top - sheetBody.getBoundingClientRect().top - 42 - 8;   // (below the small thread, 42 px)
  sheetBody.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? 'auto' : 'smooth' });
  M.s.classList.remove('hit'); void M.s.offsetWidth; M.s.classList.add('hit');
  const f = M.s.querySelector('input, button.chip, select, button.sw'); if (f) setTimeout(() => f.focus({ preventScroll: true }), REDUCED ? 0 : 420);
}
// which card is in view (the nodes say it), which pictures may draw, when the small thread shows
function fxmWatch(box) {
  if (typeof IntersectionObserver === 'undefined') { for (const k in FXM.m) FXM.m[k].seen = true; return; }
  FXM.io = new IntersectionObserver((es) => {
    for (const e of es) {
      const M = FXM.m[e.target.dataset.fx];
      if (M) { M.seen = e.isIntersecting; if (M.seen && M.dirty) fxmDirty(M); }
    }
    fxmCur();
  }, { root: sheetBody, rootMargin: '60px 0px 60px 0px' });
  for (const k in FXM.m) FXM.io.observe(FXM.m[k].s);
  new IntersectionObserver((es) => { for (const e of es) FXM.mini.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds ? e.rootBounds.top : 0)); }, { root: sheetBody }).observe(FXM.strip);
  if (typeof ResizeObserver !== 'undefined') {
    FXM.ro = new ResizeObserver(() => { fxmWire(); for (const k in FXM.m) fxmDirty(FXM.m[k]); });
    FXM.ro.observe(FXM.strip);
  }
  sheetBody.addEventListener('scroll', () => { if (UI.panel === 'fx' && !FXM.sT) FXM.sT = setTimeout(() => { FXM.sT = 0; fxmCur(); }, 120); }, { passive: true });
}
// the card under the top of the view is the current one
function fxmCur() {
  if (UI.panel !== 'fx') return;
  const top = sheetBody.getBoundingClientRect().top + (FXM.mini ? FXM.mini.offsetHeight : 0) + 40;
  let cur = null;
  for (const k in FXM.m) { const r = FXM.m[k].s.getBoundingClientRect(); if (r.top <= top + 40 && r.bottom > top) cur = k; }
  if (!cur) { const first = FXM_DEF.find((d) => FXM.m[d.k] && FXM.m[d.k].seen); cur = first ? first.k : null; }
  if (FXM.cur === cur) return;
  FXM.cur = cur;
  for (const k in FXM.m) for (const n of FXM.m[k].nodes) { if (k === cur) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current'); }
  const c = FXM.mini && FXM.mini.querySelector('.fxf-cur'); if (c) { c.textContent = cur ? FXM.m[cur].D.t : ''; c.style.color = cur ? FXM.m[cur].D.c : ''; }
}
function fxmOpen() { requestAnimationFrame(() => { fxmWire(); for (const k in FXM.m) { FXM.m[k].dirty = true; } fxmFlush(); FXM.cur = null; fxmCur(); }); }
// a group's heading between the cards, in the mixer's manner
const fxmGroup = (t, sub) => h('div', { class: 'mod-grp' }, h('span', null, t), sub ? h('small', null, sub) : null);
