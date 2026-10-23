/* =====================================================================
   The head: fruiting body, loudness, snapshots, second knob
   ===================================================================== */
function mxBuildBand() {
  const band = MX.band = h('div', { class: 'mx-band' });
  // the fruiting body: radial gill spectrum coloured by origin, goniometer in the middle, correlation in the gap
  const co = h('canvas', { 'aria-hidden': 'true' });
  const fk = h('button', { type: 'button', class: 'mx-fk', 'aria-label': 'Summe: Spektrum, nach Herkunft gefärbt, und Stereobild – Einzelheiten der Summe', onclick: () => { selectChannel('sum'); openDetail('sum'); } }, co);
  MX.fk = { el: fk, co, size: 0, n: 0, gs: 1, hold: null, col: null };
  fk.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') mxFkHover(e); });
  fk.addEventListener('pointerleave', () => mxTipHide(MX.root, 0));
  // loudness
  const L = MX.L = {};
  L.S = h('b', null, MX_MINUS + '∞'); L.M = h('b'); L.I = h('b'); L.LRA = h('b'); L.PK = h('b');
  L.tgt = h('button', { type: 'button', class: 'mx-tgt', onclick: () => { const T = [-14, -16, -23, -10]; MX.tgt = T[(T.indexOf(MX.tgt) + 1) % T.length]; store.set('myzel.mixtarget', String(MX.tgt)); mxTgtSync(); } });
  L.rst = h('button', { type: 'button', class: 'mx-rst', 'aria-label': 'Lautheitsmessung neu beginnen (integriert, LRA, Spitze)', title: 'Messung neu beginnen', onclick: mxLoudReset, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>' });
  L.hist = h('canvas', { class: 'mx-hist', 'aria-hidden': 'true' });
  const loud = h('div', { class: 'mx-loud', role: 'group', 'aria-label': 'Lautheit der Summe' },
    h('div', { class: 'mx-lh' }, h('span', { class: 'mx-lbl' }, 'lautheit')),
    h('div', { class: 'mx-big' }, L.S, h('span', { class: 'mx-bl' }, h('em', null, 'lufs kurz'), L.tgt)),
    h('div', { class: 'mx-stats' }, h('span', null, 'M ', L.M), h('span', null, 'I ', L.I), L.rst, h('span', { class: 'lra' }, 'LRA ', L.LRA), h('span', { class: 'spk' }, 'Spitze ', L.PK)),
    L.hist);
  MXL.el = loud;
  // snapshots A / B and the morph between them
  const snap = mxBuildSnap();
  mxBuildReg();
  // a solo somewhere: a rose lamp that cannot be missed, in every view – a tap lifts all solos (with an undo)
  MX.soloL = mxSoloLamp('mx-solo');
  // meter bridge (only while the rack scrolls)
  const brCv = h('canvas', { 'aria-hidden': 'true' });
  const br = h('div', { class: 'mx-br', role: 'slider', tabindex: '0', 'aria-label': 'Übersicht aller Kanäle – tippen oder ziehen blättert das Pult', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, brCv);
  MX.br = { el: br, cv: brCv, w: 0, h: 0 };
  let on = false;
  const go = (e, smooth) => { const r = br.getBoundingClientRect(); mxBridgeGo(clamp((e.clientX - r.left - 4) / (r.width - 8), 0, 0.999) * mxVis().length, smooth); };
  br.addEventListener('pointerdown', (e) => { on = true; try { br.setPointerCapture(e.pointerId); } catch (er) {} go(e, true); });
  br.addEventListener('pointermove', (e) => { if (on) go(e, false); });
  br.addEventListener('pointerup', () => { on = false; });
  br.addEventListener('pointercancel', () => { on = false; });
  br.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault(); MX.scroll.scrollBy({ left: d * (MX.ch.fin.el.offsetWidth || 88), behavior: REDUCED ? 'auto' : 'smooth' });
  });
  MX.scrollAria = () => {
    const m = MX.scroll.scrollWidth - MX.scroll.clientWidth, W = mxBridgeWin(), V = mxVis(), a = V[Math.floor(W[0])], b = V[Math.max(0, Math.ceil(W[1]) - 1)];
    br.setAttribute('aria-valuenow', String(m > 0 ? Math.round(MX.scroll.scrollLeft / m * 100) : 0));
    br.setAttribute('aria-valuetext', 'zu sehen: ' + (a ? a.name : '') + ' bis ' + (b ? b.name : '') + ' und die Summe');
  };
  // stereo image, in words (wide band): correlation, balance of the sum, compressor reduction
  MX.img = { C: h('b'), B: h('b'), G: h('b') };
  const img = h('div', { class: 'mx-img', role: 'group', 'aria-label': 'Stereobild und Verdichtung der Summe' },
    h('span', null, 'Korrelation ', MX.img.C), h('span', null, 'Balance ', MX.img.B), h('span', null, 'Verdichtung ', MX.img.G));
  band.append(fk, loud, snap, img, br, MX.soloL.el);
  mxTgtSync();
  return band;
}
// "2. Regler" – what the second knob of every strip controls. It lives in the sheet's head beside the view switch
// (it sets how the Pult looks, as the switch does): four chips where the head has room, else one chip that steps on.
function mxBuildReg() {
  const reg = MX.regBox = h('div', { class: 'mx-reg', role: 'radiogroup', 'aria-label': 'Zweiter Regler jedes Kanals', hidden: true }, h('span', { class: 'mx-regl', 'aria-hidden': 'true' }, '2. regler'));
  MX.regBtns = MX_LAYERS.map(([l, lab, , col]) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(MX.layer === l), tabindex: MX.layer === l ? '0' : '-1', style: '--lc:' + col, 'data-l': l, onclick: () => mxSetLayer(l) }, h('span', null, h('i'), lab));
    reg.append(b);
    return b;
  });
  reg.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = MX_LAYERS.findIndex((x) => x[0] === MX.layer), n = MX_LAYERS[(i + d + 4) % 4][0];
    mxSetLayer(n); MX.regBtns.find((b) => b.dataset.l === n).focus();
  });
  // the compact one: a plain button, "2· Echo", a tap moves on to the next layer (announced)
  const C = MX.regC = { t: h('span') };
  C.el = h('button', { type: 'button', class: 'mx-regc', hidden: true, onclick: () => { const i = MX_LAYERS.findIndex((x) => x[0] === MX.layer); mxSetLayer(MX_LAYERS[(i + 1) % 4][0], true); } },
    h('span', null, h('small', { 'aria-hidden': 'true' }, '2'), h('i', { 'aria-hidden': 'true' }), C.t));
}
// which of the two shows (none in the Geflecht or under a detail): the chips when nothing in the head is squeezed
function mxRegPlace() {
  const F = MX.regBox, C = MX.regC;
  if (!F || !MX.open || !F.isConnected) return;
  F.hidden = C.el.hidden = true;
  if (MX.view !== 'pult' || MX.detailK) return;
  const head = F.parentNode;
  F.hidden = false;
  const titleShown = getComputedStyle(sheetTitle).position !== 'absolute';
  if (head.scrollWidth > head.clientWidth + 1 || (titleShown && sheetTitle.clientWidth < 86)) { F.hidden = true; C.el.hidden = false; }
}
function mxSoloLamp(cls) {
  const L = { lab: h('span', null, 'solo') };
  L.el = h('button', { type: 'button', class: 'mx-sololamp ' + cls, hidden: true, onclick: mxSoloClear }, h('i', { 'aria-hidden': 'true' }), L.lab);
  (MX.soloLamps || (MX.soloLamps = [])).push(L);
  return L;
}
// every lamp follows the solos; called when they change
function mxSoloSync() {
  const who = STRIPS.filter((st) => P['x' + st.k + '.solo']).map((st) => st.name);
  for (const L of MX.soloLamps || []) {
    L.el.hidden = !who.length;
    L.el.setAttribute('aria-label', who.length ? 'Solo aktiv: ' + who.join(', ') + ' – tippen hebt alle Solos auf' : 'Kein Solo');
    L.el.title = who.length ? 'Solo: ' + who.join(', ') + ' – tippen hebt alle auf' : '';
  }
  if (MX.root) MX.root.dataset.solo = who.length ? '1' : '';
}
function mxSoloClear() {
  const prev = STRIPS.filter((st) => P['x' + st.k + '.solo']).map((st) => st.k);
  if (!prev.length) return;
  for (const k of prev) setParam('x' + k + '.solo', false);
  mxBuzz();
  toast('Kein Solo mehr', 4000, { label: 'Rückgängig', fn: () => { for (const k of prev) setParam('x' + k + '.solo', true); } });
}
// the fruiting body's canvas at a size: the band's emblem, or the Summe's root in the Geflecht (one drawing, two homes)
function mxFkSize(s) {
  const F = MX.fk;
  if (!s || s === F.size) return;
  F.size = s; F.n = s >= 112 ? 96 : s > 70 ? 72 : 48;
  mxFit(F.co, s, s); F.gp = null; F.gpv = false;
  F.hold = new Float32Array(F.n); F.val = new Float32Array(F.n);
  F.col = new Float32Array(F.n * 3).fill(200); F.wcol = new Float32Array(F.n * 3).fill(200); F.wet = new Float32Array(F.n); F.band = null;
  F.cs = null;
}
function mxBandLayout() {
  const F = MX.fk;
  mxFkSize(Math.round(F.el.clientWidth));
  const hr = MX.L.hist.getBoundingClientRect();
  MXL.hw = hr.width; MXL.hh = hr.height; MXL.key = '';
  const br = MX.br.el.getBoundingClientRect();
  MX.br.w = br.width; MX.br.h = br.height;
  mxMorphLayout();
}

/* ---------- fruiting body ---------- */
const MX_FMIN = 30, MX_FMAX = 16000;
function mxFkBands() {
  const F = MX.fk, n = F.n, sr = A.ctx.sampleRate;
  F.band = { lo: new Int16Array(n), hi: new Int16Array(n), lo2: new Int16Array(n), hi2: new Int16Array(n), f: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    const f0 = MX_FMIN * Math.pow(MX_FMAX / MX_FMIN, (i - 0.5) / (n - 1)), f1 = MX_FMIN * Math.pow(MX_FMAX / MX_FMIN, (i + 0.5) / (n - 1));
    F.band.f[i] = MX_FMIN * Math.pow(MX_FMAX / MX_FMIN, i / (n - 1));
    F.band.lo[i] = Math.round(f0 / (sr / 2048)); F.band.hi[i] = Math.max(F.band.lo[i], Math.round(f1 / (sr / 2048)));
    F.band.lo2[i] = Math.round(f0 / (sr / 1024)); F.band.hi2[i] = Math.max(F.band.lo2[i], Math.round(f1 / (sr / 1024)));
  }
  F.fft = new Float32Array(1024); F.sL = new Float32Array(512); F.sR = new Float32Array(512);
  F.pw = new Float32Array(MXC.length * n); F.acc = new Float32Array(n * 8);
  F.sr = sr;
}
// Colour by origin, ~12 times a second: each band glows in the colours of the sources that fill it; what Echo and
// Hall add (the room) is kept apart – its colour and its share – and drawn stippled at the gill's tip, so dry sound
// and room never melt into one hue.
function mxFkOrigin() {
  const F = MX.fk, B = F.band, n = F.n, acc = F.acc, E = 0.2302585;
  acc.fill(0); F.pw.fill(0);
  for (const cc of MXC) {
    if (cc.kind !== 'src' && cc.kind !== 'lane' && cc.kind !== 'ret') continue;
    const S = MX.ch[cc.k], st = MIX.s[cc.k], m = st && st.m;
    if (!m || S.dorm || S.lv.lvl < 0.02) continue;
    m.L.getFloatFrequencyData(F.sL); m.R.getFloatFrequencyData(F.sR);
    const row = cc.i * n, o = cc.kind === 'ret' ? 4 : 0;
    for (let i = 0; i < n; i++) {
      let p = 0;
      for (let b = B.lo2[i]; b <= B.hi2[i]; b++) p += Math.exp(F.sL[b] * E) + Math.exp(F.sR[b] * E);
      F.pw[row + i] = p;
      const j = i * 8 + o;
      acc[j] += p * cc.rgb[0]; acc[j + 1] += p * cc.rgb[1]; acc[j + 2] += p * cc.rgb[2]; acc[j + 3] += p;
    }
  }
  for (let i = 0; i < n; i++) {
    const j = i * 8, wd = acc[j + 3], ww = acc[j + 7], tot = wd + ww;
    // dry colour (cream when only the room sounds there), room colour, and the room's share of the band
    const r = wd > 1e-14 ? acc[j] / wd : 240, g = wd > 1e-14 ? acc[j + 1] / wd : 230, b = wd > 1e-14 ? acc[j + 2] / wd : 216;
    F.col[i * 3] += (r - F.col[i * 3]) * 0.5; F.col[i * 3 + 1] += (g - F.col[i * 3 + 1]) * 0.5; F.col[i * 3 + 2] += (b - F.col[i * 3 + 2]) * 0.5;
    if (ww > 1e-14) { F.wcol[i * 3] += (acc[j + 4] / ww - F.wcol[i * 3]) * 0.5; F.wcol[i * 3 + 1] += (acc[j + 5] / ww - F.wcol[i * 3 + 1]) * 0.5; F.wcol[i * 3 + 2] += (acc[j + 6] / ww - F.wcol[i * 3 + 2]) * 0.5; }
    F.wet[i] += ((tot > 1e-14 ? ww / tot : 0) - F.wet[i]) * 0.5;
  }
}
function mxFkDraw(dt) {
  const F = MX.fk, D = F.size;
  if (!D) return;
  // phones: 30 times a second is plenty for this little display
  if (MOBILE) { F.skip = !F.skip; F.dt = (F.dt || 0) + dt; if (F.skip) return; dt = F.dt; F.dt = 0; }
  const live = !!(A.ctx && MIX.meter && A.mm), cx = D / 2, cy = D / 2, R0 = D / 2 - 1, ri = R0 * 0.58, big = D >= 112;
  if (live && (!F.band || F.sr !== A.ctx.sampleRate)) mxFkBands();
  // overlay: the unchanging parts (axes, resting gills, the correlation track) come from a cached layer
  const c = F.co.getContext('2d');
  const n = F.n, span = 300 * Math.PI / 180, a0 = Math.PI / 2 + (MX_TAU - span) / 2, rIn = R0 * 0.64, rLen = R0 - rIn - 1;
  if (!F.bg || F.bgKey !== D + ':' + n) mxFkBg(D, n);
  c.clearRect(0, 0, D, D);
  c.drawImage(F.bg, 0, 0, D, D);
  // goniometer: the newest samples of the sum as a glowing filament; the previous frame's stays as a faint
  // afterglow (kept as points, so no second buffer has to be flushed every frame)
  if (live) {
    const bl = A.mm.bl, br = A.mm.br, N = bl.length, step = big ? 3 : 6, M = Math.floor(N / step);
    let pk = 0;
    for (let i = 0; i < N; i += 4) { const a = Math.abs(bl[i] + br[i]), b = Math.abs(bl[i] - br[i]); if (a > pk) pk = a; if (b > pk) pk = b; }
    F.gs += (0.8 / Math.max(0.04, pk * 0.7071) - F.gs) * (pk * 0.7071 * F.gs > 0.95 ? 0.5 : 0.05);
    const sc = ri * F.gs * 0.7071;
    if (!F.gp || F.gp.length !== M * 4) F.gp = new Float32Array(M * 4);
    const gp = F.gp, cur = F.gpi ? 2 * M : 0, prev = 2 * M - cur;
    F.gpi = !F.gpi;
    for (let j = 0, i = 0; j < M; j++, i += step) { const l = bl[i], r = br[i]; gp[cur + 2 * j] = cx + (r - l) * sc; gp[cur + 2 * j + 1] = cy - (l + r) * sc; }
    c.save(); c.beginPath(); c.arc(cx, cy, ri, 0, MX_TAU); c.clip();
    c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    for (const [o, a, w] of REDUCED || !F.gpv ? [[cur, 0.3, 0.85]] : [[prev, 0.12, 0.8], [cur, 0.3, 0.85]]) {
      c.beginPath(); c.moveTo(gp[o], gp[o + 1]);
      for (let j = 1; j < M; j++) c.lineTo(gp[o + 2 * j], gp[o + 2 * j + 1]);
      if (big && a > 0.2) { c.strokeStyle = 'rgba(134,240,208,.07)'; c.lineWidth = 3; c.stroke(); }
      c.strokeStyle = 'rgba(255,236,214,' + a + ')'; c.lineWidth = w; c.stroke();
    }
    F.gpv = true;
    c.restore();
  }
  if (live) {
    F.oT = (F.oT || 0) + dt;
    if (F.oT > 0.08) { F.oT = 0; mxFkOrigin(); }
    A.analyser.getFloatFrequencyData(F.fft);
  }
  c.lineCap = 'round';
  const B = F.band, rs = F.rs || (F.rs = new Float32Array(96));
  let wetAny = false;
  for (let i = 0; i < n; i++) {
    let v = 0;
    if (live) {
      let m = -200;
      for (let b = B.lo[i]; b <= B.hi[i]; b++) if (F.fft[b] > m) m = F.fft[b];
      // a gentle tilt (+3 dB per octave) so a balanced mix reads level across the ring
      v = clamp((m + 3 * Math.log2(B.f[i] / 1000) + 92) / 66, 0, 1);
    }
    F.val[i] += (v - F.val[i]) * (v > F.val[i] ? 0.6 : 0.25);
    v = F.val[i];
    F.hold[i] = Math.max(v, F.hold[i] - dt * 0.35);
    const ca = F.cos[i], sa = F.sin[i];
    rs[i] = 0;
    if (v <= 0.01 && F.hold[i] <= 0.03) continue;
    const col = 'rgba(' + (F.col[i * 3] | 0) + ',' + (F.col[i * 3 + 1] | 0) + ',' + (F.col[i * 3 + 2] | 0) + ',';
    if (v > 0.01) {
      // the dry part solid from the inside; the room's share is left for the stippled tip
      const wet = live ? F.wet[i] : 0, r2 = rIn + v * rLen * (wet > 0.04 ? 1 - wet : 1);
      if (wet > 0.04) { rs[i] = r2; wetAny = true; }
      if (r2 > rIn + 0.5) {
        c.strokeStyle = col + (0.3 + 0.7 * v).toFixed(2) + ')'; c.lineWidth = big ? 1.7 : 1.35;
        c.beginPath(); c.moveTo(cx + ca * rIn, cy + sa * rIn); c.lineTo(cx + ca * r2, cy + sa * r2); c.stroke();
      }
    }
    if (F.hold[i] > 0.03) { const rh = rIn + F.hold[i] * rLen; c.fillStyle = col + '.85)'; c.beginPath(); c.arc(cx + ca * rh, cy + sa * rh, big ? 1.1 : 0.85, 0, MX_TAU); c.fill(); }
  }
  // the room (Echo, Hall): round dots in their colour, continuing each gill to its full length
  if (wetAny) {
    c.setLineDash([0.01, big ? 2.9 : 2.5]); c.lineWidth = big ? 1.9 : 1.5;
    for (let i = 0; i < n; i++) {
      if (!rs[i]) continue;
      const v = F.val[i], r1 = rs[i] + 1.4, r2 = rIn + v * rLen, ca = F.cos[i], sa = F.sin[i];
      if (r2 <= r1) continue;
      c.strokeStyle = 'rgba(' + (F.wcol[i * 3] | 0) + ',' + (F.wcol[i * 3 + 1] | 0) + ',' + (F.wcol[i * 3 + 2] | 0) + ',' + (0.45 + 0.55 * v).toFixed(2) + ')';
      c.beginPath(); c.moveTo(cx + ca * r1, cy + sa * r1); c.lineTo(cx + ca * r2, cy + sa * r2); c.stroke();
    }
    c.setLineDash([]);
  }
  // the selected channel's own spectrum, outlined
  const sc = MXK[MX.sel];
  if (live && sc && sc.kind !== 'sum' && sc.kind !== 'puls' && !MX.ch[sc.k].dorm) {
    const row = sc.i * n;
    c.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      const p = F.pw[row + i];
      const v = p > 0 ? clamp((10 * Math.log10(p) + 3 * Math.log2(B.f[i] / 1000) + 92) / 66, 0, 1) : 0;
      const A2 = a0 + i / (n - 1) * span, r = rIn + v * rLen + 1.5;
      started ? c.lineTo(cx + Math.cos(A2) * r, cy + Math.sin(A2) * r) : (c.moveTo(cx + Math.cos(A2) * r, cy + Math.sin(A2) * r), started = true);
    }
    c.strokeStyle = mxRgba(sc.rgb, 0.8); c.lineWidth = 1; c.stroke();
  }
  // a faint ring of light, brighter as it gets louder
  const Lz = A.lufs, ls = Lz && Lz.s > -70 ? Lz.s : -70;
  c.save(); c.globalCompositeOperation = 'lighter';
  const gg = c.createRadialGradient(cx, cy, rIn, cx, cy, R0 + 3);
  gg.addColorStop(0, 'rgba(255,200,140,0)'); gg.addColorStop(0.5, 'rgba(255,200,140,' + (0.03 + clamp(ls + 34, 0, 26) / 320).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(255,200,140,0)');
  c.fillStyle = gg; c.beginPath(); c.arc(cx, cy, R0 + 3, 0, MX_TAU); c.fill(); c.restore();
  // correlation: a dot on an arc in the gap at the bottom, −1 left … +1 right (no glow while nothing sounds)
  const corr = Lz ? Lz.corr : 1, gap = MX_TAU - span, rc = R0 * 0.9, cr = mxCorr(corr, Lz ? Lz.s : -Infinity);
  const b0 = Math.PI / 2 + gap / 2 - 0.08, b1 = Math.PI / 2 - gap / 2 + 0.08;
  const ang = b0 + (b1 - b0) * (cr.cls === 'q' ? 1 : (corr + 1) / 2);
  const px = cx + Math.cos(ang) * rc, py = cy + Math.sin(ang) * rc;
  if (cr.cls !== 'q') { c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow(cr.col), px - 10, py - 10, 20, 20); c.globalCompositeOperation = 'source-over'; }
  c.fillStyle = cr.col; c.beginPath(); c.arc(px, py, big ? 3 : 2.3, 0, MX_TAU); c.fill();
}
function mxFkBg(D, n) {
  const F = MX.fk, bg = F.bg || (F.bg = document.createElement('canvas'));
  F.bgKey = D + ':' + n;
  const c = mxFit(bg, D, D), cx = D / 2, cy = D / 2, R0 = D / 2 - 1, ri = R0 * 0.58, big = D >= 112;
  const span = 300 * Math.PI / 180, a0 = Math.PI / 2 + (MX_TAU - span) / 2, rIn = R0 * 0.64, rLen = R0 - rIn - 1;
  c.clearRect(0, 0, D, D);
  c.strokeStyle = 'rgba(240,230,216,.07)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - ri * 0.7, cy - ri * 0.7); c.lineTo(cx + ri * 0.7, cy + ri * 0.7); c.moveTo(cx + ri * 0.7, cy - ri * 0.7); c.lineTo(cx - ri * 0.7, cy + ri * 0.7); c.moveTo(cx, cy - ri); c.lineTo(cx, cy + ri * 0.3); c.stroke();
  c.beginPath(); c.arc(cx, cy, ri, 0, MX_TAU); c.strokeStyle = 'rgba(240,230,216,.15)'; c.stroke();
  if (big) {
    c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(168,153,138,.6)'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('L', cx - ri * 0.5, cy - ri * 0.56); c.fillText('R', cx + ri * 0.5, cy - ri * 0.56); c.fillText('M', cx, cy - ri * 0.82);
  }
  F.cos = new Float32Array(n); F.sin = new Float32Array(n);
  c.strokeStyle = 'rgba(240,230,216,.07)'; c.lineWidth = 1; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const A2 = a0 + i / (n - 1) * span, ca = Math.cos(A2), sa = Math.sin(A2), r1 = rIn + (i % 2 ? rLen * 0.2 : 0);
    F.cos[i] = ca; F.sin[i] = sa;
    c.moveTo(cx + ca * r1, cy + sa * r1); c.lineTo(cx + ca * R0, cy + sa * R0);
  }
  c.stroke();
  const gap = MX_TAU - span, rc = R0 * 0.9;
  c.strokeStyle = 'rgba(240,230,216,.16)'; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, rc, Math.PI / 2 - gap / 2 + 0.08, Math.PI / 2 + gap / 2 - 0.08); c.stroke();
}
// hovering the fruiting body names who fills a frequency: "162 Hz · Klang 75 %, Echo 12 %"
function mxFkHover(e, rect) {
  const F = MX.fk;
  if (!F.band || !F.size) return;
  const r = rect || F.el.getBoundingClientRect(), x = e.clientX - r.left - F.size / 2, y = e.clientY - r.top - F.size / 2;
  const span = 300 * Math.PI / 180, a0 = Math.PI / 2 + (MX_TAU - span) / 2;
  if (Math.hypot(x, y) < F.size * 0.3) { const cr = mxCorr(A.lufs ? A.lufs.corr : 1, A.lufs ? A.lufs.s : -Infinity); mxTip(MX.root, r, { n: 'Korrelation', v: cr.t, c: cr.col }, false); return; }
  let a = Math.atan2(y, x) - a0;
  while (a < 0) a += MX_TAU;
  if (a > span) { mxTipHide(MX.root, 0); return; }
  const i = Math.round(a / span * (F.n - 1)), f = F.band.f[i];
  let tot = 0;
  const parts = [];
  for (const cc of MXC) { const p = F.pw[cc.i * F.n + i]; if (p > 0) { parts.push([cc.name, p]); tot += p; } }
  parts.sort((p, q) => q[1] - p[1]);
  const fs = f >= 1000 ? dec((f / 1000).toFixed(f >= 10000 ? 0 : 1)) + ' kHz' : Math.round(f) + ' Hz';
  mxTip(MX.root, { left: e.clientX - 1, top: e.clientY - 8, width: 2, height: 2 }, { n: fs, v: tot > 0 ? parts.slice(0, 3).map(([nm, p]) => nm + ' ' + Math.round(p / tot * 100) + ' %').join(', ') : 'Stille', c: COL.hypha }, false);
}

/* ---------- loudness ---------- */
// short-term loudness four times a second: the 60 s history and the loudness range (EBU Tech 3342: gated at
// −70 LUFS and 20 LU below the mean, LRA = 95th − 10th percentile), kept as a histogram so nothing is sorted
const MXL = { hist: new Float32Array(240).fill(-99), hi: 0, acc: 0, bins: new Uint32Array(800), pSum: 0, pN: 0, lra: 0, key: '', hw: 0, hh: 0 };
function mxLoudReset() {
  loudReset();
  MXL.bins.fill(0); MXL.pSum = 0; MXL.pN = 0; MXL.lra = 0;
  mxPeakReset('sum');
  toast('Lautheitsmessung beginnt neu', 1600);
}
function mxLoudPush(s) {
  MXL.hist[MXL.hi] = s > -70 ? s : -99; MXL.hi = (MXL.hi + 1) % 240;
  if (s > -70) { MXL.bins[clamp(Math.round((s + 70) * 10), 0, 799)]++; MXL.pSum += Math.pow(10, s / 10); MXL.pN++; }
  if (MXL.pN < 8) { MXL.lra = 0; return; }
  const gate = 10 * Math.log10(MXL.pSum / MXL.pN) - 20, b0 = clamp(Math.ceil((gate + 70) * 10), 0, 799);
  let tot = 0;
  for (let b = b0; b < 800; b++) tot += MXL.bins[b];
  let acc = 0, p10 = null, p95 = null;
  for (let b = b0; b < 800; b++) { acc += MXL.bins[b]; if (p10 == null && acc >= tot * 0.1) p10 = b; if (acc >= tot * 0.95) { p95 = b; break; } }
  MXL.lra = p10 != null && p95 != null ? (p95 - p10) / 10 : 0;
}
// lumen around the target, spore when hot, rec when over
function mxLoudCls(v) { const T = MX.tgt; return !(v > -70) ? 'q' : v > T + 3 ? 'over' : v > T + 1 ? 'hot' : v >= T - 3 ? 'ok' : ''; }
function mxTgtSync() {
  MX.L.tgt.textContent = 'ziel ' + MX_MINUS + Math.abs(MX.tgt);
  MX.L.tgt.setAttribute('aria-label', 'Ziel-Lautheit ' + MX_MINUS + Math.abs(MX.tgt) + ' LUFS – tippen wechselt');
  MXL.key = ''; MX.numT = 0;
}
function mxLoudFrame(dt, t) {
  const Lz = A.lufs, L = MX.L;
  if (Lz && MIX.meter) { MXL.acc += dt; if (MXL.acc >= 0.25) { MXL.acc = 0; mxLoudPush(Lz.s); MXL.key = ''; } }
  if (MXL.key === '') mxHistDraw();
  if (t - MX.numT < 0.125) return;
  MX.numT = t;
  const s = Lz ? Lz.s : -Infinity, m = Lz ? Lz.m : -Infinity, i = Lz ? Lz.i : -Infinity, pk = MX.ch.sum.lv.max;
  const set = (el, txt, cls) => { if (el.textContent !== txt) el.textContent = txt; const c = cls || ''; if (el.className !== c) el.className = c; };
  set(L.S, mxLufsTxt(s), mxLoudCls(s));
  set(L.M, mxLufsTxt(m), mxLoudCls(m));
  set(L.I, mxLufsTxt(i), mxLoudCls(i));
  set(L.LRA, dec(MXL.lra.toFixed(1)) + ' LU');
  const pdb = pk > 0.001 ? 20 * Math.log10(pk) : -Infinity;
  set(L.PK, pk > 0.001 ? mxDbTxt(pdb) + ' dB' : MX_MINUS + '∞', pdb >= -0.1 ? 'over' : pdb > -1 ? 'hot' : '');
  if (MX.wide) {
    const cr = mxCorr(Lz ? Lz.corr : 1, s), mm = A.mm, sl = MX.ch.sum.lv;
    set(MX.img.C, cr.t, cr.cls);
    const bal = mm && mm.rms[0] > 1e-8 && mm.rms[1] > 1e-8 ? 10 * Math.log10(mm.rms[0] / mm.rms[1]) : 0;
    set(MX.img.B, !(s > -70) ? '—' : Math.abs(bal) < 0.3 ? 'Mitte' : (bal > 0 ? 'L ' : 'R ') + dec(Math.abs(bal).toFixed(1)) + ' dB', !(s > -70) ? 'q' : '');
    set(MX.img.G, mxGrTxt(sl.gr), mxGrCls(sl.gr));
  }
  MXL.el.setAttribute('aria-label', 'Lautheit der Summe: kurz ' + mxLufsTxt(s) + ', integriert ' + mxLufsTxt(i) + ' LUFS, Ziel ' + MX_MINUS + Math.abs(MX.tgt));
}
// 60 s of short-term loudness against the target; the fill shows the zones (quiet, in range, hot, over)
function mxHistDraw() {
  const w = MXL.hw, hh = MXL.hh;
  MXL.key = 'x';
  if (!w || !hh) return;
  const c = mxFit(MX.L.hist, w, hh), T = MX.tgt, lo = T - 20, hi = T + 8, Y = (v) => hh - 1 - clamp((v - lo) / (hi - lo), 0, 1) * (hh - 2);
  c.clearRect(0, 0, w, hh);
  c.fillStyle = 'rgba(134,240,208,.06)'; c.fillRect(0, Y(T + 1), w, Y(T - 3) - Y(T + 1));
  c.setLineDash([3, 3]); c.strokeStyle = 'rgba(255,179,92,.55)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, Math.round(Y(T)) + 0.5); c.lineTo(w, Math.round(Y(T)) + 0.5); c.stroke(); c.setLineDash([]);
  const N = 240;
  c.beginPath();
  let st = false, last = 0;
  for (let i = 0; i < N; i++) {
    const v = MXL.hist[(MXL.hi + i) % N];
    if (v < -90) { st = false; continue; }
    const x = i / (N - 1) * w, y = Y(v);
    if (!st) { c.moveTo(x, hh); c.lineTo(x, y); st = true; } else c.lineTo(x, y);
    last = x;
    if (i === N - 1 || MXL.hist[(MXL.hi + i + 1) % N] < -90) { c.lineTo(x, hh); }
  }
  const g = c.createLinearGradient(0, Y(hi), 0, Y(lo));
  g.addColorStop(0, 'rgba(255,91,77,.55)'); g.addColorStop((Y(T + 3) - Y(hi)) / (Y(lo) - Y(hi)), 'rgba(255,91,77,.45)');
  g.addColorStop((Y(T + 2) - Y(hi)) / (Y(lo) - Y(hi)), 'rgba(255,179,92,.45)'); g.addColorStop((Y(T) - Y(hi)) / (Y(lo) - Y(hi)), 'rgba(134,240,208,.4)');
  g.addColorStop((Y(T - 4) - Y(hi)) / (Y(lo) - Y(hi)), 'rgba(134,240,208,.18)'); g.addColorStop(1, 'rgba(240,230,216,.06)');
  c.fillStyle = g; c.fill();
  c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(255,179,92,.8)'; c.textAlign = 'left'; c.textBaseline = 'bottom';
  if (last < w - 30 || hh > 30) c.fillText(MX_MINUS + Math.abs(T), 2, Y(T) - 1.5);
  c.textAlign = 'right'; c.fillStyle = 'rgba(168,153,138,.6)'; c.fillText('60 s', w - 2, hh - 1);
}

