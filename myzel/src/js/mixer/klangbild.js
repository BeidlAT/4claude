/* ---------- Klangbild: the EQ, drawn with the audio's own maths ---------- */
// The channel EQ is makeProc's: low cut = two highpass biquads (Q −5,33 dB and 2,32 dB = Butterworth, 24 dB/Okt),
// shelves at 150 Hz and 6 kHz, a peaking Mitten (Q 0,9), high cut = one lowpass (Q −3 dB ≈ 0,707). The Summe has
// shelves at 120 Hz and 6,5 kHz. Coefficients as the Web Audio spec defines them (Chromium computes exactly these):
// highpass/lowpass read Q in dB, peaking a linear Q, the shelves a fixed slope S = 1.
const MX_LCQ = [-5.33, 2.32], MX_HCQ = -3;
function mxBq(type, f, q, g, sr) {
  const nf = Math.min(1, f / (sr / 2)), w = Math.PI * nf, cw = Math.cos(w), sw = Math.sin(w), A = Math.pow(10, g / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'highpass' || type === 'lowpass') {
    if (type === 'highpass' ? nf <= 0 : nf >= 1) return null;     // the browser lets everything through
    const al = sw / (2 * Math.pow(10, q / 20));
    if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; } else { b0 = (1 + cw) / 2; b1 = -(1 + cw); }
    b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if (type === 'peaking') {
    const al = sw / (2 * q);
    b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A;
  } else {
    const al = sw / 2 * Math.SQRT2, k2 = 2 * Math.sqrt(A) * al, ap = A + 1, am = A - 1;
    if (type === 'lowshelf') { b0 = A * (ap - am * cw + k2); b1 = 2 * A * (am - ap * cw); b2 = A * (ap - am * cw - k2); a0 = ap + am * cw + k2; a1 = -2 * (am + ap * cw); a2 = ap + am * cw - k2; }
    else { b0 = A * (ap + am * cw + k2); b1 = -2 * A * (am + ap * cw); b2 = A * (ap + am * cw - k2); a0 = ap - am * cw + k2; a1 = 2 * (am - ap * cw); a2 = ap - am * cw - k2; }
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
// |H(e^jω)| in dB
function mxBqDb(c, f, sr) {
  const w = MX_TAU * f / sr, c1 = Math.cos(w), c2 = Math.cos(2 * w);
  const num = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] + 2 * (c[0] * c[1] + c[1] * c[2]) * c1 + 2 * c[0] * c[2] * c2;
  const den = 1 + c[3] * c[3] + c[4] * c[4] + 2 * (c[3] + c[3] * c[4]) * c1 + 2 * c[4] * c2;
  return 10 * Math.log10(Math.max(1e-30, num) / Math.max(1e-30, den));
}
const MXE_NP = 240, MXE_FMIN = 20, MXE_FMAX = 20000, MXE_TOP = 18, MXE_BOT = -24;
const MXE_FQ = new Float32Array(MXE_NP), MXE_TILT = new Float32Array(MXE_NP);
for (let i = 0; i < MXE_NP; i++) { MXE_FQ[i] = MXE_FMIN * Math.pow(MXE_FMAX / MXE_FMIN, i / (MXE_NP - 1)); MXE_TILT[i] = 3 * Math.log2(MXE_FQ[i] / 1000); }
const mxeX = (E, f) => E.px + Math.log(f / MXE_FMIN) / Math.log(MXE_FMAX / MXE_FMIN) * E.pw;
const mxeY = (E, db) => E.py + (MXE_TOP - db) / (MXE_TOP - MXE_BOT) * E.ph;
// the bands: gid/fid name the gain / frequency parameter, ax how the handle moves
const MXE_CH = [
  { b: 'lc', l: 'TS', n: 'T-Schnitt', c: '#e9dccb', ax: 'x', fid: (k) => 'x' + k + '.lc', off: LC_OFF, sub: '24 dB/Okt' },
  { b: 'lo', l: 'T', n: 'Tiefen', c: '#ffb35c', ax: 'y', gid: (k) => 'x' + k + '.lo', type: 'lowshelf', f: 150, sub: '150 Hz' },
  { b: 'mid', l: 'M', n: 'Mitten', c: '#c4a8ff', ax: 'xy', gid: (k) => 'x' + k + '.mid', fid: (k) => 'x' + k + '.midf', type: 'peaking', q: 0.9 },
  { b: 'hi', l: 'H', n: 'Höhen', c: '#86f0d0', ax: 'y', gid: (k) => 'x' + k + '.hi', type: 'highshelf', f: 6000, sub: '6 kHz' },
  { b: 'hc', l: 'HS', n: 'H-Schnitt', c: '#e9dccb', ax: 'x', fid: (k) => 'x' + k + '.hc', off: HC_OFF, sub: '12 dB/Okt' },
];
const MXE_SUM = [
  { b: 'lo', l: 'T', n: 'Tiefen', c: '#ffb35c', ax: 'y', gid: () => 'mst.low', type: 'lowshelf', f: 120, sub: '120 Hz' },
  { b: 'hi', l: 'H', n: 'Höhen', c: '#86f0d0', ax: 'y', gid: () => 'mst.high', type: 'highshelf', f: 6500, sub: '6,5 kHz' },
];
function mxEq(bands, sum) {
  const E = { bands, sum, k: sum ? 'sum' : 'fin', sel: sum ? 'lo' : 'mid', key: '', dirty: true, w: 0, h: 0, px: 0, py: 0, pw: 1, ph: 1, sr: 0,
    db: {}, act: {}, tot: new Float32Array(MXE_NP), xs: new Float32Array(MXE_NP), spec: new Float32Array(MXE_NP).fill(-160), specOn: false, sT: 0, hd: {}, hp: {}, cell: {}, hkey: '' };
  for (const B of bands) E.db[B.b] = new Float32Array(MXE_NP);
  E.cv = h('canvas', { 'aria-hidden': 'true' });
  E.box = h('div', { class: 'mxe' + (sum ? ' mxe-sum' : '') }, E.cv);
  E.cells = h('div', { class: 'mxe-cells', style: 'grid-template-columns:repeat(' + bands.length + ',minmax(0,1fr))' });
  for (const B of bands) mxeBandUI(E, B);
  // a tap in the field picks the nearest band (the Summe's field tells who fills a frequency instead)
  E.cv.addEventListener('pointerdown', (e) => {
    if (sum) return;
    const r = E.box.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 1e9;
    for (const B of bands) { const p = E.hp[B.b]; if (!p) continue; const d = Math.hypot(p[0] - x, (p[1] - y) * 0.6); if (d < bd) { bd = d; best = B; } }
    if (best) mxeSel(E, best.b);
  });
  MXD.eq.push(E);
  return E;
}
function mxeBandUI(E, B) {
  const hd = h('div', { class: 'mxe-h', role: 'slider', tabindex: '0', 'data-b': B.b, style: '--bc:' + B.c }, h('span', { 'aria-hidden': 'true' }, B.l));
  E.box.append(hd); E.hd[B.b] = hd;
  mPid(hd, () => (B.gid ? B.gid(E.k) : B.fid(E.k)));
  const gid = () => B.gid(E.k), fid = () => B.fid(E.k);
  const tip = () => ({ n: B.n, v: mxeVal(E, B), c: B.c });
  // the drag spans are the handle's own travel on the plot, so the handle stays under the finger
  const fSpan = () => E.pw * Math.log(PD[fid()].max / PD[fid()].min) / Math.log(MXE_FMAX / MXE_FMIN);
  const gSpan = () => E.ph * (PD[gid()].max - PD[gid()].min) / (MXE_TOP - MXE_BOT);
  const setG = (n, fine) => { const id = gid(); let v = fromNorm(PD[id], n); if (!fine && Math.abs(v) < 0.35) v = 0; setParam(id, v); };
  const setF = (n) => setParam(fid(), fromNorm(PD[fid()], n));
  // On phones the detail is one column that scrolls up and down, and at rest the handles sit across the thumb's
  // path: a handle that is not chosen lets a touch through to the scroll (touch-action pan-y, set in mxeHandles) –
  // a tap chooses it, then it drags. The cuts only move sideways, so they drag at once and still let vertical swipes by.
  const ax = (e) => (e && e.pointerType === 'touch' && MX.detCover && E.sel !== B.b && B.ax !== 'x' ? 'none' : B.ax);
  const o = { host: mxdHost, tip, focus: hd, anchor: () => hd, start: () => mxeSel(E, B.b), axis: ax };
  if (B.ax === 'x') mxDrag(hd, Object.assign({ span: fSpan, get: () => toNorm(PD[fid()], P[fid()]), set: setF }, o));
  else if (B.ax === 'y') mxDrag(hd, Object.assign({ span: gSpan, get: () => toNorm(PD[gid()], P[gid()]), set: setG }, o));
  else mxDrag(hd, Object.assign({ span: () => [fSpan(), gSpan()], get: () => [toNorm(PD[fid()], P[fid()]), toNorm(PD[gid()], P[gid()])], set: (n, fine) => { setF(n[0]); setG(n[1], fine); } }, o));
  // a tap (not a swipe) chooses the band; the browser focuses on a tap only, so a scroll passing over leaves it be
  hd.addEventListener('click', () => mxeSel(E, B.b));
  const nudge = (df, dg) => {
    if (df && B.fid) { const id = fid(); setParam(id, P[id] * Math.pow(2, df)); }
    if (dg && B.gid) { const id = gid(); setParam(id, P[id] + dg); }
    mxTipFlash(MX.detailHost, hd, tip());
  };
  hd.addEventListener('keydown', (e) => {
    const k = e.key, f = e.shiftKey ? 1 / 24 : 1 / 6, g = e.shiftKey ? 0.1 : 0.5;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { if (B.fid) nudge(k === 'ArrowRight' ? f : -f, 0); else return; }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { const s = k === 'ArrowUp' ? 1 : -1; if (B.gid) nudge(0, s * g); else nudge(s * f, 0); }
    else if (k === 'Home' || k === 'Delete' || k === 'Backspace') mxeReset(E, B);
    else return;
    e.preventDefault();
  });
  hd.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    const s = e.deltaY < 0 ? 1 : -1;
    if (B.gid) nudge(0, s * (e.shiftKey ? 0.1 : 0.5)); else nudge(s / (e.shiftKey ? 48 : 12), 0);
  }, { passive: false });
  hd.addEventListener('focus', () => mxeSel(E, B.b));
  mxDbl(hd, () => mxeReset(E, B));
  const cell = h('button', { type: 'button', class: 'mxe-cell', style: '--bc:' + B.c, 'aria-pressed': 'false', title: 'Doppeltippen setzt das Band zurück', onclick: () => { mxeSel(E, B.b); hd.focus({ preventScroll: true }); } },
    h('b', null, h('i', { 'aria-hidden': 'true' }), B.n), h('span'), h('small'));
  mxDbl(cell, () => mxeReset(E, B));
  E.cells.append(cell); E.cell[B.b] = cell;
}
function mxeVal(E, B) {
  if (B.ax === 'x') return fmt(PD[B.fid(E.k)], P[B.fid(E.k)]);
  const g = mxDbTxt(P[B.gid(E.k)]) + ' dB';
  return B.ax === 'xy' ? g + ' · ' + mxHz(P[B.fid(E.k)]) : g;
}
function mxeSel(E, b) { if (E.sel === b) return; E.sel = b; E.dirty = true; E.hkey = ''; }
// phones: no band is armed when a channel opens, and scrolling the detail disarms the one chosen – a swipe that
// starts on a handle always scrolls unless that handle was just tapped (see mxeBandUI)
function mxeDisarm() { if (MX.detCover) for (const E of MXD.eq) if (E.sel) mxeSel(E, null); }
function mxeReset(E, B) { for (const id of [B.gid && B.gid(E.k), B.fid && B.fid(E.k)]) if (id) setParam(id, PD[id].d); }
// flat: the curve does nothing (what the audio checks too); at rest: every value at its default (what "Neutral" sets)
function mxeNeutral(E) { return E.bands.every((B) => (!B.gid || P[B.gid(E.k)] === PD[B.gid(E.k)].d) && (!B.off || B.off(P[B.fid(E.k)]))); }
function mxeAtRest(E) { return E.bands.every((B) => (!B.gid || P[B.gid(E.k)] === PD[B.gid(E.k)].d) && (!B.fid || P[B.fid(E.k)] === PD[B.fid(E.k)].d)); }
function mxeAim(E, k) {
  E.k = k; E.key = ''; E.dirty = true; E.hkey = ''; E.spec.fill(-160); E.specOn = false; E.sg = null;
  for (const B of E.bands) mxdWatch(B.gid && B.gid(k), B.fid && B.fid(k));
}
// each band's response on the plot's frequency grid, and their sum – recomputed only when a value changes
function mxeCalc(E) {
  let key = SR + ':';
  for (const B of E.bands) key += (B.gid ? P[B.gid(E.k)] : '') + '/' + (B.fid ? P[B.fid(E.k)] : '') + ',';
  if (key === E.key) return;
  E.key = key; E.tot.fill(0); E.dirty = true; E.hkey = '';
  for (const B of E.bands) {
    const out = E.db[B.b];
    out.fill(0);
    let cs = null;
    if (B.ax === 'x') { const f = P[B.fid(E.k)]; if (!B.off(f)) cs = B.b === 'lc' ? MX_LCQ.map((q) => mxBq('highpass', f, q, 0, SR)) : [mxBq('lowpass', f, MX_HCQ, 0, SR)]; }
    else if (P[B.gid(E.k)]) cs = [mxBq(B.type, B.fid ? P[B.fid(E.k)] : B.f, B.q || 1, P[B.gid(E.k)], SR)];
    E.act[B.b] = !!cs;
    if (cs) for (const c of cs) if (c) for (let i = 0; i < MXE_NP; i++) out[i] += mxBqDb(c, MXE_FQ[i], SR);
    for (let i = 0; i < MXE_NP; i++) E.tot[i] += out[i];
  }
}
function mxeTotAt(E, f) { const u = clamp(Math.log(f / MXE_FMIN) / Math.log(MXE_FMAX / MXE_FMIN), 0, 1) * (MXE_NP - 1), i = Math.min(MXE_NP - 2, Math.floor(u)); return E.tot[i] + (E.tot[i + 1] - E.tot[i]) * (u - i); }
function mxeLayout(E) {
  const w = E.box.clientWidth, hh = E.box.clientHeight;
  if (!w || !hh) { E.w = 0; return; }
  if (w === E.w && hh === E.h) return;
  // the plot leaves a 28 px gutter on the right for its dB numbers – no curve or handle ever covers them
  E.w = w; E.h = hh; E.px = 0; E.pw = w - 28; E.py = 10; E.ph = hh - 10 - 17;
  for (let i = 0; i < MXE_NP; i++) E.xs[i] = E.px + i / (MXE_NP - 1) * E.pw;
  E.bgKey = ''; E.sg = null; E.dirty = true; E.hkey = '';
  if (E.sum) mxoLayout(E);
}
// grid and numbers, kept in a layer of their own
function mxeBg(E, dpr) {
  E.bgKey = E.w + 'x' + E.h + ':' + dpr;
  const b = E.bg || (E.bg = document.createElement('canvas')), c = mxFit(b, E.w, E.h, 0, dpr), w = E.w, hh = E.h;
  c.clearRect(0, 0, w, hh);
  c.fillStyle = '#100c0a'; c.beginPath(); c.roundRect(0, 0, w, hh, 12); c.fill();
  c.font = '400 8.5px ' + COL.fontNum; c.textBaseline = 'alphabetic';
  for (const f of [30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 20000]) {
    const x = Math.round(mxeX(E, f)) + 0.5, major = f === 100 || f === 1000 || f === 10000, lab = [50, 100, 200, 500, 1000, 2000, 5000, 10000].includes(f);
    c.fillStyle = major ? 'rgba(240,230,216,.09)' : lab ? 'rgba(240,230,216,.055)' : 'rgba(240,230,216,.03)'; c.fillRect(x - 0.5, E.py, 1, E.ph);
    if (lab) { c.fillStyle = 'rgba(168,153,138,.75)'; c.textAlign = 'center'; c.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x, hh - 5); }
  }
  c.textAlign = 'right'; c.textBaseline = 'middle';
  const pr = E.px + E.pw;
  c.fillStyle = 'rgba(240,230,216,.06)'; c.fillRect(pr, E.py, 1, E.ph);
  for (const g of [12, 6, 0, -6, -12, -18]) {
    const y = Math.round(mxeY(E, g)) + 0.5;
    c.fillStyle = g === 0 ? 'rgba(240,230,216,.16)' : 'rgba(240,230,216,.05)'; c.fillRect(0, y - 0.5, pr, 1);
    c.fillStyle = g === 0 ? 'rgba(240,230,216,.7)' : 'rgba(168,153,138,.7)';
    c.fillText(g > 0 ? '+' + g : g === 0 ? '0' : MX_MINUS + -g, w - 5, y);
  }
  c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(168,153,138,.6)'; c.fillText('dB', w - 5, hh - 5);
}
// the channel's live spectrum (its strip analysers, after the EQ), read ~30 times a second onto the plot's grid
const MXE_BUF = { L: new Float32Array(512), R: new Float32Array(512) };
function mxeSpecRead(E, t) {
  if (t - E.sT < 0.033) return false;
  E.sT = t;
  const st = MIX.s[E.k], m = st && st.m;
  if (!m || !MIX.meter || !A.ctx) { if (E.specOn) { E.specOn = false; E.spec.fill(-160); return true; } return false; }
  if (E.sr !== A.ctx.sampleRate) {
    // which analyser bins feed each point: one bin interpolated where bins are sparse (the bass), the loudest of
    // several where they are dense
    E.sr = A.ctx.sampleRate;
    const hz = E.sr / 1024, r = Math.pow(MXE_FMAX / MXE_FMIN, 0.5 / (MXE_NP - 1));
    E.b0 = new Int16Array(MXE_NP); E.b1 = new Int16Array(MXE_NP); E.fr = new Float32Array(MXE_NP);
    for (let i = 0; i < MXE_NP; i++) {
      const f = MXE_FQ[i], lo = Math.ceil(f / r / hz), hi = Math.floor(f * r / hz);
      if (hi > lo) { E.b0[i] = Math.min(511, lo); E.b1[i] = Math.min(511, hi); }
      else { const b = f / hz; E.b0[i] = Math.min(510, Math.floor(b)); E.b1[i] = -1; E.fr[i] = b - Math.floor(b); }
    }
  }
  m.L.getFloatFrequencyData(MXE_BUF.L); m.R.getFloatFrequencyData(MXE_BUF.R);
  const L = MXE_BUF.L, R = MXE_BUF.R;
  for (let i = 0; i < MXE_NP; i++) {
    let v;
    if (E.b1[i] < 0) { const b = E.b0[i], a0 = Math.max(L[b], R[b]), a1 = Math.max(L[b + 1], R[b + 1]); v = a0 + (a1 - a0) * E.fr[i]; }
    else { v = -200; for (let b = E.b0[i]; b <= E.b1[i]; b++) { const q = L[b] > R[b] ? L[b] : R[b]; if (q > v) v = q; } }
    if (!(v > -200)) v = -200;
    E.spec[i] += (v - E.spec[i]) * (v > E.spec[i] ? 0.55 : 0.16);
  }
  E.specOn = true;
  return true;
}
function mxeSpecDraw(E, c) {
  if (!E.specOn) return;
  const cc = MXK[E.k], rgb = MX.ch[E.k].dorm ? MX_DORM : cc.rgb, bot = E.py + E.ph, top = E.py + 4;
  const Y = (i) => bot - clamp((E.spec[i] + MXE_TILT[i] + 100) / 74, 0, 1) * (bot - top);
  if (!E.sg) { E.sg = c.createLinearGradient(0, top, 0, bot); E.sg.addColorStop(0, mxRgba(rgb, 0.34)); E.sg.addColorStop(1, mxRgba(rgb, 0.03)); }
  c.beginPath(); c.moveTo(E.px, bot);
  for (let i = 0; i < MXE_NP; i++) c.lineTo(E.xs[i], Y(i));
  c.lineTo(E.px + E.pw, bot); c.closePath();
  c.fillStyle = E.sg; c.fill();
  c.beginPath();
  for (let i = 0; i < MXE_NP; i++) i ? c.lineTo(E.xs[i], Y(i)) : c.moveTo(E.xs[i], Y(i));
  c.strokeStyle = mxRgba(rgb, 0.6); c.lineWidth = 1; c.stroke();
}
function mxeDraw(E, t) {
  if (!E.w) return;
  const live = E.sum ? mxoTick(E, t) : mxeSpecRead(E, t);
  mxeCalc(E);
  if (!E.dirty && !live) return;
  E.dirty = false;
  const dpr = mxDpr(), w = E.w, hh = E.h, c = mxFit(E.cv, w, hh, 0, dpr);
  if (E.bgKey !== w + 'x' + hh + ':' + dpr) mxeBg(E, dpr);
  c.clearRect(0, 0, w, hh); c.drawImage(E.bg, 0, 0, w, hh);
  c.save(); c.beginPath(); c.roundRect(0, 0, E.px + E.pw, hh, [12, 0, 0, 12]); c.clip();
  if (E.sum) mxoDraw(E, c); else mxeSpecDraw(E, c);
  // the curve: filled towards 0 dB in the channel's colour, the chosen band's own share dashed, a glowing line on top
  const cc = MXK[E.k], rgb = cc.rgb, y0 = mxeY(E, 0), lo = E.py - 3, hi = E.py + E.ph + 3, flat = mxeNeutral(E);
  const yc = (v) => clamp(mxeY(E, v), lo, hi);
  c.beginPath(); c.moveTo(E.xs[0], y0);
  for (let i = 0; i < MXE_NP; i++) c.lineTo(E.xs[i], yc(E.tot[i]));
  c.lineTo(E.xs[MXE_NP - 1], y0); c.closePath();
  c.fillStyle = mxRgba(rgb, 0.12); c.fill();
  const S = E.bands.find((B) => B.b === E.sel);
  if (S && E.act[S.b] && E.bands.length > 1) {
    const a = E.db[S.b];
    c.beginPath();
    for (let i = 0; i < MXE_NP; i++) i ? c.lineTo(E.xs[i], yc(a[i])) : c.moveTo(E.xs[i], yc(a[i]));
    c.setLineDash([3, 3]); c.strokeStyle = mxRgba(mxRgb(S.c), 0.75); c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
  }
  c.beginPath();
  for (let i = 0; i < MXE_NP; i++) i ? c.lineTo(E.xs[i], yc(E.tot[i])) : c.moveTo(E.xs[i], yc(E.tot[i]));
  if (!flat) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = mxRgba(rgb, 0.22); c.lineWidth = 7; c.stroke(); c.globalCompositeOperation = 'source-over'; }
  c.strokeStyle = flat ? 'rgba(240,230,216,.42)' : '#f6eee2'; c.lineWidth = flat ? 1.2 : 1.8; c.stroke();
  // a shelf's handle stands at its full gain: a thin thread down to where the curve crosses its frequency
  for (const B of E.bands) {
    if (B.ax !== 'y' || !E.act[B.b] || !E.hp[B.b]) continue;
    const x = E.hp[B.b][0], yh = E.hp[B.b][1], ycv = yc(mxeTotAt(E, B.f));
    c.strokeStyle = mxRgba(mxRgb(B.c), 0.4); c.lineWidth = 1; c.setLineDash([2, 2]);
    c.beginPath(); c.moveTo(x, yh); c.lineTo(x, ycv); c.stroke(); c.setLineDash([]);
  }
  c.restore();
  if (E.hkey !== E.key + E.sel) mxeHandles(E);
}
// handles and the value cells follow the values
function mxeHandles(E) {
  E.hkey = E.key + E.sel;
  for (const B of E.bands) {
    const hd = E.hd[B.b], on = E.act[B.b];
    let f, db;
    if (B.ax === 'x') { f = on ? P[B.fid(E.k)] : B.b === 'lc' ? MXE_FMIN : MXE_FMAX; db = on ? mxeTotAt(E, f) : 0; }
    else { f = B.fid ? P[B.fid(E.k)] : B.f; db = P[B.gid(E.k)]; }
    // a cut that is off waits in its bottom corner (it only moves sideways; drag it in to switch it on)
    const x = clamp(mxeX(E, f), 13, E.px + E.pw - 13), y = B.ax === 'x' && !on ? E.py + E.ph - 13 : clamp(mxeY(E, db), 13, E.py + E.ph - 2);
    E.hp[B.b] = [x, y];
    hd.style.transform = 'translate(' + (x - 22).toFixed(1) + 'px,' + (y - 22).toFixed(1) + 'px)';
    hd.classList.toggle('neutral', !on); hd.classList.toggle('sel', E.sel === B.b);
    // on phones only the chosen band holds on to a touch (see mxeBandUI)
    hd.style.touchAction = MX.detCover ? (B.ax === 'x' || E.sel !== B.b ? 'pan-y' : 'none') : '';
    const v = mxeVal(E, B), cell = E.cell[B.b], sp = cell.children[1], sm = cell.children[2];
    hd.setAttribute('aria-label', (E.sum ? 'Summe ' : '') + B.n + (B.ax === 'xy' ? ' – links/rechts Frequenz, hoch/runter Verstärkung' : ''));
    hd.setAttribute('aria-valuetext', B.ax === 'x' ? v : v + (B.ax === 'y' ? ' bei ' + B.sub : ''));
    hd.setAttribute('aria-valuenow', String(B.gid ? P[B.gid(E.k)] : P[B.fid(E.k)]));
    const main = B.ax === 'xy' ? mxDbTxt(P[B.gid(E.k)]) + ' dB' : v, sub = B.ax === 'xy' ? mxHz(P[B.fid(E.k)]) : B.sub;
    if (sp.textContent !== main) sp.textContent = main;
    if (sm.textContent !== sub) sm.textContent = sub;
    cell.classList.toggle('neutral', !on);
    cell.setAttribute('aria-pressed', String(E.sel === B.b));
    cell.setAttribute('aria-label', B.n + ': ' + v + (B.sub && B.ax !== 'x' ? ' bei ' + B.sub : '') + (on ? '' : ', neutral') + ' – Band wählen');
  }
}

