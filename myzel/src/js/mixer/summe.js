/* ---------- the Summe: who fills it, its EQ, compressor, width, loudness ---------- */
// Colour by origin: every column of the spectrum glows in the colour of the channel that fills most of it – read
// from the strip analysers ten times a second; the column's height is the Summe's own spectrum, ~30 times a second.
const MXO = { n: 0, sr: 0, t: 0, mt: 0, hl: null, hover: -1, none: { rgb: MX_DORM } };
function mxoLayout(E) {
  const n = clamp(Math.floor(E.pw / 4), 40, 160);
  if (n === MXO.n && MXO.sr === SR) return;
  MXO.n = n; MXO.sr = 0;
  MXO.pw = new Float32Array(MXC.length * n); MXO.lv = new Float32Array(n).fill(-160); MXO.dom = new Int8Array(n).fill(-1); MXO.share = new Float32Array(n);
  MXO.fc = new Float32Array(n);
  for (let i = 0; i < n; i++) MXO.fc[i] = MXE_FMIN * Math.pow(MXE_FMAX / MXE_FMIN, (i + 0.5) / n);
}
function mxoBins() {
  const n = MXO.n, sr = A.ctx.sampleRate, h1 = sr / 1024, h2 = sr / 2048;
  MXO.sr = sr; MXO.s0 = new Int16Array(n); MXO.s1 = new Int16Array(n); MXO.m0 = new Int16Array(n); MXO.m1 = new Int16Array(n);
  MXO.fft = new Float32Array(1024);
  for (let i = 0; i < n; i++) {
    const fa = MXE_FMIN * Math.pow(MXE_FMAX / MXE_FMIN, i / n), fb = MXE_FMIN * Math.pow(MXE_FMAX / MXE_FMIN, (i + 1) / n), fc = MXO.fc[i];
    MXO.s0[i] = clamp(Math.ceil(fa / h1), 1, 511); MXO.s1[i] = clamp(Math.floor(fb / h1), 1, 511);
    if (MXO.s1[i] < MXO.s0[i]) MXO.s0[i] = MXO.s1[i] = clamp(Math.round(fc / h1), 1, 511);
    MXO.m0[i] = clamp(Math.ceil(fa / h2), 1, 1023); MXO.m1[i] = clamp(Math.floor(fb / h2), 1, 1023);
    if (MXO.m1[i] < MXO.m0[i]) MXO.m0[i] = MXO.m1[i] = clamp(Math.round(fc / h2), 1, 1023);
  }
}
function mxoTick(E, t) {
  if (!A.ctx || !MIX.meter || !A.analyser) return false;
  if (MXO.sr !== A.ctx.sampleRate) mxoBins();
  const n = MXO.n, E2 = 0.2302585;
  let ch = false;
  if (t - MXO.t > 0.1) {
    MXO.t = t; ch = true;
    for (const cc of MXC) {
      if (cc.kind !== 'src' && cc.kind !== 'lane' && cc.kind !== 'ret') continue;
      const S = MX.ch[cc.k], st = MIX.s[cc.k], m = st && st.m, row = cc.i * n;
      if (!m || S.dorm || S.lv.lvl < 0.01) { for (let i = 0; i < n; i++) MXO.pw[row + i] *= 0.5; continue; }
      m.L.getFloatFrequencyData(MXE_BUF.L); m.R.getFloatFrequencyData(MXE_BUF.R);
      for (let i = 0; i < n; i++) {
        let p = 0;
        for (let b = MXO.s0[i]; b <= MXO.s1[i]; b++) p += Math.exp(MXE_BUF.L[b] * E2) + Math.exp(MXE_BUF.R[b] * E2);
        p /= MXO.s1[i] - MXO.s0[i] + 1;
        MXO.pw[row + i] = MXO.pw[row + i] * 0.5 + p * 0.5;
      }
    }
    for (let i = 0; i < n; i++) {
      let best = -1, bp = 0, tot = 0;
      for (const cc of MXC) { const p = MXO.pw[cc.i * n + i]; if (p > 0) { tot += p; if (p > bp) { bp = p; best = cc.i; } } }
      MXO.dom[i] = tot > 1e-13 ? best : -1; MXO.share[i] = tot > 0 ? bp / tot : 0;
    }
  }
  if (t - MXO.mt > 0.033) {
    MXO.mt = t; ch = true;
    A.analyser.getFloatFrequencyData(MXO.fft);
    for (let i = 0; i < n; i++) {
      let v = -200;
      for (let b = MXO.m0[i]; b <= MXO.m1[i]; b++) if (MXO.fft[b] > v) v = MXO.fft[b];
      if (!(v > -200)) v = -200;
      MXO.lv[i] += (v - MXO.lv[i]) * (v > MXO.lv[i] ? 0.55 : 0.18);
    }
  }
  return ch;
}
// the room's stipple: Echo and Hall fill their columns with dots of their colour, so dry sound and room stay apart
// even where their hues are near (made once per colour)
function mxoPat(c, cc) {
  if (cc.pat) return cc.pat;
  const t = document.createElement('canvas'), q = t.getContext('2d');
  t.width = t.height = 12;   // device pixels: round dots, staggered
  q.fillStyle = cc.col;
  for (const [x, y] of [[3, 3], [9, 9]]) { q.beginPath(); q.arc(x, y, 2.1, 0, MX_TAU); q.fill(); }
  const pat = c.createPattern(t, 'repeat');
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / mxDpr()));
  return (cc.pat = pat);
}
function mxoDraw(E, c) {
  const n = MXO.n;
  if (!n) return;
  const bot = E.py + E.ph, top = E.py + 4, bw = E.pw / n;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const v = clamp((MXO.lv[i] + 3 * Math.log2(MXO.fc[i] / 1000) + 100) / 74, 0, 1);
    if (v < 0.01) continue;
    const d = MXO.dom[i], cc = d >= 0 ? MXC[d] : MXO.none, y = bot - v * (bot - top), x = E.px + i * bw;
    const a = d >= 0 ? 0.22 + 0.5 * MXO.share[i] : 0.15, sty = cc.al || (cc.al = Array.from({ length: 11 }, (_, j) => mxRgba(cc.rgb, j / 10)));
    if (cc.kind === 'ret') { c.globalAlpha = Math.min(1, (MXO.hover === i ? a + 0.3 : a) * 1.5); c.fillStyle = mxoPat(c, cc); c.fillRect(x + 0.5, y, Math.max(1, bw - 1), bot - y); c.globalAlpha = 1; }
    else { c.fillStyle = sty[Math.min(10, Math.round((MXO.hover === i ? a + 0.3 : a) * 10))]; c.fillRect(x + 0.5, y, Math.max(1, bw - 1), bot - y); }
    c.fillStyle = sty[d >= 0 ? 10 : 4]; c.fillRect(x + 0.5, y - 1, Math.max(1, bw - 1), 2);
  }
  c.globalCompositeOperation = 'source-over';
  // the chosen channel's own share, outlined
  const hc = MXO.hl && MXK[MXO.hl];
  if (hc) {
    const row = hc.i * n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const p = MXO.pw[row + i], v = p > 0 ? clamp((10 * Math.log10(p) + 3 * Math.log2(MXO.fc[i] / 1000) + 100) / 74, 0, 1) : 0, x = E.px + (i + 0.5) * bw, y = bot - v * (bot - top);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = hc.c1; c.lineWidth = 1.4; c.stroke();
  }
  if (MXO.hover >= 0) { const x = E.px + (MXO.hover + 0.5) * bw; c.fillStyle = 'rgba(240,230,216,.5)'; c.fillRect(Math.round(x), top - 4, 1, bot - top + 4); }
}
// who fills a frequency: "162 Hz · Klang 75 %, Echo 12 %"
function mxoWho(i) {
  const n = MXO.n, parts = [];
  let tot = 0;
  for (const cc of MXC) { const p = MXO.pw[cc.i * n + i]; if (p > 0) { parts.push([cc.name, p]); tot += p; } }
  parts.sort((a, b) => b[1] - a[1]);
  const top = parts.filter((p) => p[1] / tot >= 0.02).slice(0, 4);
  return { n: mxHz(MXO.fc[i]), v: tot > 1e-13 && top.length ? top.map(([nm, p]) => nm + ' ' + Math.round(p / tot * 100) + ' %').join(', ') : 'Stille', c: COL.hypha };
}
function mxoPoint(E, e, touch) {
  if (!MXO.n) return;
  const r = E.box.getBoundingClientRect(), i = clamp(Math.floor((e.clientX - r.left - E.px) / E.pw * MXO.n), 0, MXO.n - 1);
  MXO.hover = i; E.dirty = true;
  mxTip(MX.detailHost, { left: e.clientX - 1, top: r.top + 8, width: 2, height: 2 }, mxoWho(i), false);
  if (touch) { clearTimeout(MXO.tm); MXO.tm = setTimeout(() => { MXO.hover = -1; E.dirty = true; mxTipHide(MX.detailHost, 0); }, 2600); }
}
function mxdBuildSum() {
  const Z = MXD.su = { gr: mxTrace(150, 50) };
  const E = Z.eq = mxEq(MXE_SUM, true);
  E.cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') mxoPoint(E, e, false); });
  E.cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { MXO.hover = -1; E.dirty = true; mxTipHide(MX.detailHost, 0); } });
  E.cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') mxoPoint(E, e, true); });
  // the channels' shares of the sound (averaged over the spectrum); a tap outlines that channel in it
  Z.share = h('div', { class: 'mxo-share', role: 'group', 'aria-label': 'Anteile am Klangbild – tippen hebt einen Kanal hervor' });
  Z.sh = [];
  for (const cc of MXC) {
    if (cc.kind !== 'src' && cc.kind !== 'lane' && cc.kind !== 'ret') continue;
    const v = h('b'), bar = h('i', { class: 'mxo-bar' });
    const b = h('button', { type: 'button', class: cc.kind === 'ret' ? 'ret' : null, 'aria-pressed': 'false', style: '--c:' + cc.col, onclick: () => { MXO.hl = MXO.hl === cc.k ? null : cc.k; E.dirty = true; for (const s of Z.sh) s.b.setAttribute('aria-pressed', String(MXO.hl === s.k)); } }, h('i', { class: 'dot', 'aria-hidden': 'true' }), cc.name, v, bar);
    Z.sh.push({ k: cc.k, i: cc.i, b, v, bar, last: '' });
    Z.share.append(b);
  }
  Z.comp = mxdKnob('', { gr: () => MX.ch.sum.lv.gr });
  Z.wid = mxdKnob();
  Z.grCv = h('canvas', { 'aria-hidden': 'true' }); Z.widCv = h('canvas', { 'aria-hidden': 'true' });
  Z.grT = h('small'); Z.widT = h('small');
  Z.fd = mxdFader('h');
  Z.mono = h('button', { type: 'button', class: 'mx-m mx-mon mxd-ms mxd-mw', 'aria-pressed': 'false', 'aria-label': 'Summe mono abhören', onclick: () => { if (A.ctx) { setMonMono(!A.monoChk); mxMonSync(); } } }, h('span', null, 'Mono'));
  Z.dim = h('button', { type: 'button', class: 'mx-s mx-mon mxd-ms mxd-mw', 'aria-pressed': 'false', 'aria-label': 'Abhöre um 20 Dezibel leiser', onclick: () => { if (A.ctx) { setMonDim(!A.dim); mxMonSync(); } } }, h('span', null, MX_MINUS + '20 dB'));
  // loudness, for phones (on wide screens the head shows it)
  const L = Z.L = {}, cell = (lab, el, cls) => h('div', { class: 'mxd-lc ' + (cls || '') }, h('span', null, lab), el);
  for (const x of ['S', 'M', 'I', 'LRA', 'PK', 'C']) L[x] = h('b');
  L.tgt = h('button', { type: 'button', class: 'mx-tgt', onclick: () => MX.L.tgt.click() });
  Z.loud = h('section', { class: 'mxd-sec mxd-loud', 'aria-label': 'Lautheit' }, mxdSh('Lautheit', L.tgt),
    h('div', { class: 'mxd-lg' }, cell('kurz', L.S, 'big'), cell('momentan', L.M), cell('integriert', L.I), cell('lra', L.LRA), cell('spitze', L.PK), cell('korrelation', L.C)),
    h('button', { type: 'button', class: 'btn ghost mxd-link', onclick: mxLoudReset }, 'Messung neu beginnen'));
  mxdWatch('mst.vol', 'mst.comp', 'mst.wid', 'mst.low', 'mst.high');
  return h('div', { class: 'mxd-page', 'data-p': 'sum' },
    h('section', { class: 'mxd-sec mxd-or', 'aria-label': 'Herkunft und Klangbild der Summe' }, mxdSh('Herkunft', 'Farbe = der Kanal, der die Frequenz füllt'), E.box, E.cells, Z.share),
    h('section', { class: 'mxd-sec mxd-sf', 'aria-label': 'Formen der Summe' }, mxdSh('Formen', 'Verdichtung · Breite'),
      h('div', { class: 'mxd-cards two' },
        mxdCard('mxd-gr', 'Verdichtung', Z.grT, h('div', { class: 'mxd-cvb' }, Z.grCv), h('div', { class: 'mxd-kr' }, Z.comp.box)),
        mxdCard('mxd-wid', 'Breite', Z.widT, h('div', { class: 'mxd-cvb' }, Z.widCv), h('div', { class: 'mxd-kr' }, Z.wid.box)))),
    h('section', { class: 'mxd-sec mxd-sp', 'aria-label': 'Pegel und Abhöre' }, mxdSh('Pegel', 'Abhöre: nur was du hörst, nicht die Aufnahme'), Z.fd.box, h('div', { class: 'mxd-wrow' }, Z.mono, Z.dim)),
    Z.loud);
}
function mxdSumAim() {
  const Z = MXD.su;
  mxeAim(Z.eq, 'sum');
  Z.fd.set('sum');
  mxdAim(Z.comp, 'sum', 'mst.comp', 'Menge', 'Verdichtung', '#ff8f9e');
  mxdAim(Z.wid, 'sum', 'mst.wid', 'Breite', 'Breite', MXK.sum.col);
  Z.gr.b.fill(0);
}
function mxdSumText(t) {
  const Z = MXD.su, gr = MX.ch.sum.lv.gr, w = P['mst.wid'];
  Z.grT.textContent = gr > 0.05 ? MX_MINUS + dec(gr.toFixed(1)) + ' dB' : 'ruhig';
  Z.widT.textContent = w < 0.005 ? 'Mono' : mxPct(w);
  Z.mono.setAttribute('aria-pressed', String(!!A.monoChk)); Z.dim.setAttribute('aria-pressed', String(!!A.dim));
  Z.mono.disabled = Z.dim.disabled = !A.ctx;
  // shares: each channel's mean part of the spectrum's columns
  if (MXO.n && t - (Z.shT || 0) > 0.25) {
    Z.shT = t;
    const n = MXO.n;
    let tot = 0;
    const part = Z.part || (Z.part = new Float32Array(MXC.length));
    part.fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const sh of Z.sh) s += MXO.pw[sh.i * n + i];
      if (s <= 1e-13) continue;
      tot++;
      for (const sh of Z.sh) part[sh.i] += MXO.pw[sh.i * n + i] / s;
    }
    for (const sh of Z.sh) {
      const p = tot ? part[sh.i] / tot : 0, txt = p >= 0.005 ? Math.round(p * 100) + ' %' : '–';
      if (sh.last !== txt) { sh.last = txt; sh.v.textContent = txt; sh.bar.style.transform = 'scaleX(' + p.toFixed(3) + ')'; sh.b.classList.toggle('none', p < 0.005); }
    }
  }
  if (!MX.detCover) return;
  const Lz = A.lufs, L = Z.L, set = (el, txt, cls) => { if (el.textContent !== txt) el.textContent = txt; const c2 = cls || ''; if (el.className !== c2) el.className = c2; };
  const s = Lz ? Lz.s : -Infinity, m = Lz ? Lz.m : -Infinity, i = Lz ? Lz.i : -Infinity, pk = MX.ch.sum.lv.max, pdb = pk > 0.001 ? 20 * Math.log10(pk) : -Infinity, cr = Lz ? Lz.corr : 1;
  set(L.S, mxLufsTxt(s), mxLoudCls(s)); set(L.M, mxLufsTxt(m), mxLoudCls(m)); set(L.I, mxLufsTxt(i), mxLoudCls(i));
  set(L.LRA, dec(MXL.lra.toFixed(1)) + ' LU'); set(L.PK, pk > 0.001 ? mxDbTxt(pdb) + ' dB' : MX_MINUS + '∞', pdb >= -0.1 ? 'over' : pdb > -1 ? 'hot' : '');
  const crr = mxCorr(cr, s);
  set(L.C, crr.t, crr.cls);
  const tg = 'ziel ' + MX_MINUS + Math.abs(MX.tgt) + ' lufs';
  if (L.tgt.textContent !== tg) { L.tgt.textContent = tg; L.tgt.setAttribute('aria-label', 'Ziel-Lautheit ' + MX_MINUS + Math.abs(MX.tgt) + ' LUFS – tippen wechselt'); }
}
// the compressor's reduction over the last 3 s
function mxdGrDraw(cv, w, hh, T) { mxdPumpDraw(cv, w, hh, T, -1, false, '#ff8f9e'); }

