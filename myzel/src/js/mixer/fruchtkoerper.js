/* =====================================================================
   Fruchtkörper – the detail view of one channel
   ===================================================================== */
// Opened from a strip head, the Geflecht, the fruiting body (Summe) or the Puls block. On phones it covers the whole
// mixer; on wide screens it covers the rack below the head – loudness and A/B stay in view, the Summe column stays live
// beside it, and the channel's own stem stands at its left edge.
// bindCtl listeners can't be removed, so nothing is rebuilt per channel: the parts are built once and re-aimed at the
// channel on open; only "Quelle" differs per channel and is built the first time that channel opens, then kept.
MXV.detail = { build: mxdBuild, open: mxdOpen, close: mxdClose, frame: mxdFrame, layout: mxdLayout };
const MXD = { k: null, page: '', kn: [], fd: [], eq: [], rings: [], qring: [], qu: {}, seen: new Set(), dirty: true, el: null, slowT: 0, backT: 0 };
const mxdName = (k) => (k === 'sum' ? 'Summe' : MXK[k].name);
const mxdHost = () => MX.detailHost;
const mxHz = (f) => (f >= 1000 ? dec((f / 1000).toFixed(f >= 10000 ? 1 : 2)) + ' kHz' : Math.round(f) + ' Hz');
const mxPct = (v) => Math.round(v * 100) + ' %';
// one listener per parameter, whichever channel is shown: knobs aimed at it redraw, texts follow in the next frame
function mxdWatch(...ids) {
  for (const id of ids) {
    if (!id || MXD.seen.has(id) || !PD[id]) continue;
    MXD.seen.add(id);
    bindCtl(id, () => { for (const K of MXD.kn) if (K.id === id) mxKnobRender(K); MXD.dirty = true; for (const E of MXD.eq) E.dirty = true; });
  }
}
// a gill knob of the detail, aimed at a parameter on open
function mxdKnob(cls, o) { const K = mxKnob(Object.assign({ ch: 'fin', cls: 'mxd-k' + (cls ? ' ' + cls : ''), host: mxdHost, axis: () => (MX.detCover ? 'x' : 'y') }, o)); MXD.kn.push(K); return K; }
function mxdAim(K, k, id, name, label, col) { K.o.ch = k; mxdWatch(id); K.key = ''; K.set(id, name, label, col || MXK[k].col); }
// the pitch of scale degree d above the root of the play field (semitones in the free scale), and its name
function mxDegF(d) { return N.free ? N.base * ratioForSemi(d) : degNote(d).f; }
function mxNoteName(f) { if (!(f > 0)) return ''; const m = Math.round(69 + 12 * Math.log2(f / P['t.a4'])); return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
// The keys of every level control: arrows ±0,5 dB (Shift ±3), Bild ±6, Pos1 or 0 → 0 dB. Silencing a channel takes
// Shift+Ende – a single stray key never empties a channel during a performance (announced via aria-keyshortcuts).
const MX_VOLKEYS = 'Home 0 Shift+End';
function mxVolKey(e, id) {
  const d = PD[id], v = P[id], b = v > FADER_OFF ? v : d.min;
  let n = null;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = b + (e.shiftKey ? 3 : 0.5);
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = b - (e.shiftKey ? 3 : 0.5);
  else if (e.key === 'PageUp') n = b + 6;
  else if (e.key === 'PageDown') n = b - 6;
  else if (e.key === 'Home' || e.key === '0') n = 0;
  else if (e.key === 'End' && e.shiftKey) n = d.min;
  if (n == null) return false;
  e.preventDefault();
  setParam(id, clamp(Math.round(n * 10) / 10, d.min, d.max));
  return true;
}
// a short rolling record of a value (Pumpen, Verdichtung), sampled at a fixed rate
function mxTrace(n, rate) { return { b: new Float32Array(n), i: 0, acc: 0, rate }; }
function mxTracePush(T, v, dt) { T.acc += dt; while (T.acc >= 1 / T.rate) { T.acc -= 1 / T.rate; T.b[T.i] = v; T.i = (T.i + 1) % T.b.length; } }

/* ---------- level: a standing stem (wide screens) or a lying one ---------- */
// The standing one is the console's stem itself (mxStemBody + mxMeter on a stand-in strip), so a level reads the same
// in both places; the lying one is the Puls block's stem with a scale. Both drag relatively and hold still for fine.
function mxdFader(dir, small) {
  const F = { dir, small: !!small, k: 'fin', w: 0, h: 0, span: 160, bg: null, bgKey: '', pkT: '', gk: '', S: { g: null, lv: null, dorm: false, capPos: 0, grad: null, gradKey: '' } };
  const vid = () => mxVolId(F.k);
  F.cv = h('canvas', { 'aria-hidden': 'true' });
  F.el = h('div', { class: 'mxd-fd', role: 'slider', tabindex: '0', 'aria-orientation': dir === 'v' ? 'vertical' : 'horizontal', 'aria-keyshortcuts': MX_VOLKEYS }, F.cv);
  F.val = h('button', { type: 'button', class: 'mxd-val', tabindex: '-1' }, h('span'));
  if (dir === 'v') {
    F.cap = h('div', { class: 'mxd-cap', 'aria-hidden': 'true' });
    F.pk = h('button', { type: 'button', class: 'mxd-pk', onclick: () => { mxPeakReset(F.k); F.pkT = ''; } }, h('span'));
    F.el.append(F.cap);
  }
  F.box = h('div', { class: 'mxd-fb mxd-fb-' + dir + (small ? ' small' : '') }, F.pk, F.el, small ? null : F.val);
  mPid(F.el, vid);
  F.anchor = () => {
    if (F.cap) return F.cap;
    const r = F.cv.getBoundingClientRect(), x = r.left + 10 + mxPos(P[vid()]) * Math.max(1, r.width - 22);
    return { left: x - 1, top: r.top, width: 2, height: r.height };
  };
  const flash = () => mxTipFlash(MX.detailHost, F.anchor(), mxTipVol(F.k));
  mxDrag(F.el, { axis: dir === 'v' ? 'y' : 'x', host: mxdHost, span: () => F.span, get: () => mxPos(P[vid()]), set: (n, fine) => mxFader(F.k, mxDb(n), fine), tip: () => mxTipVol(F.k), focus: F.el, anchor: F.anchor });
  F.el.addEventListener('keydown', (e) => { if (mxVolKey(e, vid())) flash(); });
  F.el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    const id = vid(), d = PD[id], v = P[id], b = v > FADER_OFF ? v : d.min;
    setParam(id, clamp(Math.round((b + (e.deltaY < 0 ? 0.5 : -0.5)) * 10) / 10, d.min, d.max));
    flash();
  }, { passive: false });
  mxDbl(F.val, () => { setParam(vid(), 0); flash(); });
  F.set = (k) => {
    F.k = k; F.bgKey = ''; F.S.gradKey = ''; F.pkT = ''; F.gk = '';
    const d = PD[mxVolId(k)];
    F.el.setAttribute('aria-label', mxdName(k) + ' Pegel');
    F.el.setAttribute('aria-valuemin', String(d.min)); F.el.setAttribute('aria-valuemax', String(d.max));
    F.box.style.setProperty('--c', MXK[k].col);
    if (F.cap) F.cap.innerHTML = mxCapSvg(k === 'sum');
    mxdWatch(mxVolId(k));
    mxdFaderSync(F);
  };
  MXD.fd.push(F);
  return F;
}
function mxdFaderSync(F) {
  const v = P[mxVolId(F.k)], txt = v > FADER_OFF ? mxDbTxt(v) + ' dB' : 'aus';
  F.el.setAttribute('aria-valuenow', String(v)); F.el.setAttribute('aria-valuetext', mxDbAria(v));
  const s = F.val.firstChild;
  if (s.textContent !== txt) { s.textContent = txt; F.val.setAttribute('aria-label', mxdName(F.k) + ' Pegel ' + txt + ' – doppeltippen setzt 0 dB'); }
  const g = F.S.g;
  if (F.cap && g) F.cap.style.transform = 'translate(-50%,' + (g.yb - mxPos(v) * g.span - 22).toFixed(1) + 'px)';
  F.box.classList.toggle('dormant', MX.ch[F.k].dorm);
}
function mxdFaderLayout(F) {
  F.w = F.el.clientWidth; F.h = F.el.clientHeight; F.bgKey = ''; F.S.gradKey = ''; F.gk = '';
  if (!F.w || !F.h) { F.w = 0; return; }
  if (F.dir === 'h') { F.span = Math.max(40, F.w - 22); return; }
  // the stem sits right, its scale left of the cap, like a strip
  const master = F.k === 'sum', capW = master ? 52 : 44, cx = Math.round(F.w - capW / 2 - 8);
  const g = F.S.g = { x: 0, y: 0, w: F.w, h: F.h, sw: master ? 20 : 16, capW, cx, lx: cx - capW / 2 - 3, yt: 18, yb: F.h - 12 };
  g.span = F.span = Math.max(20, g.yb - g.yt);
  F.cap.style.left = cx + 'px'; F.cap.style.width = (capW + 2) + 'px';
  if (F.cap.firstChild) F.cap.firstChild.style.top = (22 - (master ? 23 * capW / 62 : 19 * capW / 46)).toFixed(1) + 'px';
  mxdFaderSync(F);
}
function mxdFaderDraw(F) {
  if (!F.w) return;
  if (MOBILE && F.dir === 'h') { F.odd = !F.odd; if (F.odd) return; }
  if (F.dir === 'v') {
    const cc = MXK[F.k], dpr = MX_LDPR(), key = F.k + ':' + F.w + 'x' + F.h + ':' + dpr;
    if (F.bgKey !== key) {
      F.bgKey = key; F.bg = F.bg || document.createElement('canvas');
      const b = mxFit(F.bg, F.w, F.h, 0, dpr);
      b.clearRect(0, 0, F.w, F.h); mxStemBody(b, F.S.g, cc, cc.kind === 'sum');
    }
    const c = mxFit(F.cv, F.w, F.h, 0, dpr), S = MX.ch[F.k];
    c.clearRect(0, 0, F.w, F.h); c.drawImage(F.bg, 0, 0, F.w, F.h);
    F.S.lv = S.lv; F.S.dorm = S.dorm; F.S.capPos = mxPos(P[mxVolId(F.k)]);
    mxMeter(c, F.S, cc);
    return;
  }
  mxdFaderDrawH(F);
}
// the lying stem: two lines of light in it, the cap rides on it (dome towards louder), its scale below. The stem and
// its scale are a still layer of their own; each frame only the light and the cap are drawn over it.
function mxdFaderDrawH(F) {
  const w = F.w, hh = F.h, dpr = MX_LDPR(), S = MX.ch[F.k], L = S.lv, dorm = S.dorm, cc = MXK[F.k];
  const src = cc.kind === 'puls' ? MXK['l' + L.dom] : cc, rgb = dorm ? MX_DORM : src.rgb;
  const x0 = 10, x1 = w - 12, span = x1 - x0, th = F.small ? 9 : 12, y = F.small ? Math.round(hh * 0.58) : Math.round(hh * 0.36);
  const bk = w + 'x' + hh + ':' + dpr;
  if (F.bgKey !== bk) {
    F.bgKey = bk; F.bg = F.bg || document.createElement('canvas');
    const b = mxFit(F.bg, w, hh, 0, dpr);
    b.clearRect(0, 0, w, hh);
    b.fillStyle = '#0d0a08'; b.beginPath(); b.roundRect(x0 - 6, y - th / 2, span + 12, th, th / 2); b.fill();
    b.strokeStyle = 'rgba(240,230,216,.14)'; b.lineWidth = 1; b.stroke();
    b.font = '400 8px ' + COL.fontNum; b.textAlign = 'center'; b.textBaseline = 'top';
    for (const m of [-48, -36, -24, -18, -12, -6, 0, 6]) {
      const x = Math.round(x0 + mxPos(m) * span) + 0.5;
      b.fillStyle = m === 0 ? 'rgba(255,179,92,.75)' : 'rgba(240,230,216,.2)';
      b.fillRect(x - 0.5, y + th / 2 + 2, 1, m === 0 ? 5 : 3);
      if (!F.small && m !== -36 && m !== -18) { b.fillStyle = m === 0 ? 'rgba(255,179,92,.9)' : 'rgba(168,153,138,.7)'; b.fillText(m > 0 ? '+' + m : m ? MX_MINUS + -m : '0', x, y + th / 2 + 8); }
    }
  }
  const c = mxFit(F.cv, w, hh, 0, dpr);
  c.clearRect(0, 0, w, hh); c.drawImage(F.bg, 0, 0, w, hh);
  const key = (dorm ? 'd' : src.k) + w;
  if (F.gk !== key) {
    F.gk = key;
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, mxRgba(rgb, 0.16)); g.addColorStop(0.45, mxRgba(rgb, dorm ? 0.25 : 0.5)); g.addColorStop(0.76, mxRgba(rgb, dorm ? 0.3 : 0.85));
    g.addColorStop(0.8, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,240,222,.94)'); g.addColorStop(0.87, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,179,92,.96)'); g.addColorStop(1, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,91,77,1)');
    F.grad = g;
  }
  c.globalCompositeOperation = 'lighter';
  const lh = (th - 5) / 2;
  for (let s = 0; s < 2; s++) {
    const yy = y - th / 2 + 2 + s * (lh + 1), xr = x0 + L.rms[s] * span, xp = x0 + L.pk[s] * span;
    if (L.rms[s] > 0.004) { c.fillStyle = F.grad; c.fillRect(x0 - 3, yy, xr - x0 + 3, lh); }
    if (L.pk[s] > 0.004) { c.fillStyle = dorm ? 'rgba(160,150,140,.6)' : L.pk[s] > 0.8 ? '#ff7b6b' : 'rgba(255,248,236,.92)'; c.fillRect(xp - 0.6, yy - 0.5, 1.3, lh + 1); }
    if (L.hp[s] > 0.01) { c.fillStyle = L.hp[s] > 0.8 ? '#ff5b4d' : 'rgba(255,248,236,.85)'; c.fillRect(x0 + L.hp[s] * span - 0.5, yy, 1, lh); }
  }
  c.globalCompositeOperation = 'source-over';
  if (L.gr > 0.2) {   // Pumpen: rose, hanging left from 0 dB
    const z = x0 + 0.8 * span, len = Math.min(1, L.gr / 24) * span * 0.45;
    c.fillStyle = 'rgba(255,143,158,.9)'; c.fillRect(z - len, y - th / 2 - 4, len, 2);
  }
  if (L.clip) { c.fillStyle = '#ff5b4d'; c.beginPath(); c.arc(x1 + 4, y - th / 2 - 3, 2.6, 0, MX_TAU); c.fill(); }
  if (MX.ghost) {
    const gh = mxGhostN(mxVolId(F.k));
    if (gh) for (let j = 0; j < 2; j++) {
      const x = x0 + mxPos((j ? MX.snap.b : MX.snap.a)[mxVolId(F.k)]) * span;
      c.fillStyle = j ? '#86f0d0' : '#ffb35c'; c.fillRect(x - 1, y - th / 2 - 7, 2, 5);
    }
  }
  const v = P[mxVolId(F.k)], cx = x0 + mxPos(v) * span, col = dorm ? 'rgb(118,106,97)' : cc.kind === 'puls' ? cc.col : src.col, ch = F.small ? 10 : 13;
  if (L.lvl > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 * L.lvl * (dorm ? 0.3 : 1); c.drawImage(mxGlow(dorm ? '#766a61' : src.col), cx - 28, y - 24, 56, 48); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  // the cap, drawn at the origin so its shading is made once
  if (!F.capG) { F.capG = c.createLinearGradient(0, 0, ch, 0); F.capG.addColorStop(0, '#4b3b2f'); F.capG.addColorStop(1, '#1c150f'); }
  c.save(); c.translate(cx, y);
  c.beginPath(); c.moveTo(0, -ch); c.bezierCurveTo(ch * 0.8, -ch, ch, -ch * 0.3, ch, 0); c.bezierCurveTo(ch, ch * 0.3, ch * 0.8, ch, 0, ch); c.closePath();
  c.fillStyle = F.capG; c.fill(); c.strokeStyle = col; c.globalAlpha = 0.9; c.lineWidth = 1.1; c.stroke(); c.globalAlpha = 1;
  c.strokeStyle = 'rgba(240,230,216,.35)'; c.lineWidth = 0.7; c.beginPath();
  for (let j = -3; j <= 3; j++) { c.moveTo(-1, j * ch / 4.3); c.lineTo(-5, j * ch / 8); }
  c.stroke();
  c.strokeStyle = '#f0e6d8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -ch - 2); c.lineTo(0, ch + 2); c.stroke();
  c.restore();
  if (F.small) {   // the rows have no room for a readout of their own: the value rides above the far end
    c.font = '500 9.5px ' + COL.fontNum; c.textBaseline = 'alphabetic'; c.textAlign = cx > w - 64 ? 'left' : 'right';
    c.fillStyle = dorm ? 'rgba(168,153,138,.7)' : 'rgba(240,230,216,.88)';
    c.fillText(v > FADER_OFF ? mxDbTxt(v) : MX_MINUS + '∞', cx > w - 64 ? x0 : x1 + 4, 9);
  }
}

