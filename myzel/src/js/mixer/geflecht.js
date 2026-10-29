/* =====================================================================
   Geflecht – the mix as living mycelium
   ===================================================================== */
// Every channel has a fixed column of its own, in console order, so nothing can ever overlap – not even at the app's
// default where everything sits at 0 dB in the middle. In its column the channel is a glowing spore: its height is the
// fader (the stems' law), its small lean left or right the balance; the light column under it is what really comes
// out (RMS body, peak filament, held peak). Below the soil line the hyphae carry the signal on: through the "kette"
// knot or straight past it into the Summe's root – the fruiting body (spectrum by origin, stereo image) – while send
// threads run underground to Echo (rings), Hall (cloud) and the effect returns (sprouting stars), as thick as the send times
// the level.
// The whole column is the handle: the first pixels decide the axis and then it stays (up/down = level, sideways =
// balance), relative as everywhere, hold still for fine. At −48 dB the fader rests on the soil; holding there sinks it
// in (= aus) – a muted channel instead stays where it is and goes dormant. Tap selects, a second tap opens the
// Fruchtkörper, a long press (or right-click) offers stumm, solo, 0 dB, Mitte.
MXV.views.geflecht = { label: 'Geflecht', build: mxgBuild, open: mxgOpen, close: mxgClose, frame: mxgFrame, select: mxgSelect, layout: mxgLayout, pulse: mxgPulse };
const MXG = { cols: [], kn: [], seen: new Set(), w: 0, h: 0, dirty: true, geo: true, hov: null, pd: null, tapK: null, tapT: 0, menuK: null, numT: 0, ariaT: 0, rip: [], focus: null, rootTip: false };
const MXG_DET = -48;      // the soil's edge: a fader dragged down rests here, holding sinks it in
const MXG_STEP = 3;       // the flow paths are kept as points this far apart
const MXG_SND = ['dly', 'rev', ...FX_RETS.map((x) => x[0])];   // the returns a channel sends into (its send threads, in this order)
const mxgHasPan = (C) => C.c.kind !== 'sum' && C.c.kind !== 'puls';
const mxgCol = (k) => MXG.cols[MXK[k].i];
const mxgName = (k) => (k === 'sum' ? 'Summe' : MXK[k].name);
const mxgA = (al, a) => al[a <= 0 ? 0 : a >= 1 ? 20 : Math.round(a * 20)];   // a colour at one of 21 prepared alphas
const MXG_WARM = Array.from({ length: 21 }, (_, j) => 'rgba(255,217,168,' + j / 20 + ')');
const MXG_ROSE = Array.from({ length: 21 }, (_, j) => 'rgba(255,143,158,' + j / 20 + ')');
// a spore's lit core: white-hot in the middle, the channel's colour at the rim
const MXG_CORE = {};
function mxgCore(col) {
  let g = MXG_CORE[col];
  if (g) return g;
  g = document.createElement('canvas'); g.width = g.height = 48;
  const c = g.getContext('2d'), rgb = mxRgb(col), r = c.createRadialGradient(24, 24, 0, 24, 24, 24);
  r.addColorStop(0, 'rgba(255,252,246,1)'); r.addColorStop(0.3, 'rgba(255,246,232,.95)'); r.addColorStop(0.62, mxRgba(rgb, 1));
  r.addColorStop(0.84, mxRgba(rgb, 0.45)); r.addColorStop(1, mxRgba(rgb, 0));
  c.fillStyle = r; c.fillRect(0, 0, 48, 48);
  return (MXG_CORE[col] = g);
}

function mxgBuild(host) {
  const G = MXG;
  G.host = host;
  G.cvS = h('canvas', { class: 'mxg-cv', 'aria-hidden': 'true' });
  G.cvL = h('canvas', { class: 'mxg-cv', 'aria-hidden': 'true' });
  // the Summe's root holds the band's fruiting-body canvas itself while the band does not show it: one drawing, and the
  // browser composites it as it does in the band (drawing it into the field each frame would cost a flush per frame)
  G.root = h('div', { class: 'mxg-root', 'aria-hidden': 'true' });
  G.field = h('div', { class: 'mxg-f' }, G.cvS, G.cvL, G.root);
  // the four corners: loudness, the Summe, integrated with peak, correlation – big enough to read while playing
  const ro = (cls, lab) => { const R = { b: h('b'), l: h('span', null, lab), s: h('em'), v: h('i') }; R.el = h('div', { class: 'mxg-ro ' + cls }, R.b, h('small', null, R.l, R.s, R.v)); return R; };
  G.ro = { tl: ro('tl', 'kurz'), tr: ro('tr', 'summe'), bl: ro('bl', 'integriert'), br: ro('br', 'korrelation') };
  G.roBox = h('div', { class: 'mxg-ros', role: 'group', 'aria-label': 'Lautheit der Summe' }, G.ro.tl.el, G.ro.tr.el, G.ro.bl.el, G.ro.br.el);
  // the spores are sliders for keyboards and screen readers, in channel order; the pointer is the field's
  const sps = h('div', { class: 'mxg-sps', role: 'group', 'aria-label': 'Kanäle als Sporen: die Höhe ist der Pegel, der Versatz die Balance' });
  const tags = h('div', { class: 'mxg-tags', 'aria-hidden': 'true' });
  for (const c of MXC) {
    const d = PD[mxVolId(c.k)];
    const C = { c, k: c.k, i: c.i, cx: 0, cw: 0, pr: 0, x: 0, y: 0, r: 5, pan: 0, off: false, fx: true, aria: '', flow: null, fn: 0, al: [], sid: MXG_SND.map((r) => 'x' + c.k + '.' + r), pid: 'x' + c.k + '.pan' };
    for (let j = 0; j <= 20; j++) C.al.push(mxRgba(c.rgb, j / 20));
    C.el = h('div', { class: 'mxg-sp', role: 'slider', tabindex: '0', 'data-pid': mxVolId(c.k), 'aria-orientation': 'vertical', 'aria-valuemin': String(d.min), 'aria-valuemax': String(d.max), style: '--c:' + c.col,
      'aria-label': mxgName(c.k) + (mxgHasPan(C) ? ' – hoch und runter der Pegel, links und rechts die Balance' : ' – Pegel'), 'aria-keyshortcuts': MX_VOLKEYS + ' Enter M S' });
    mxgKeys(C);
    C.tag = h('span', { class: 'mxg-tag' + (c.kind === 'sum' ? ' sum' : ''), style: '--c:' + c.col }, h('b', null, c.kind === 'sum' ? 'summe' : c.name), h('small'));
    sps.append(C.el); tags.append(C.tag);
    G.cols.push(C);
  }
  G.field.append(tags, G.roBox, sps);
  mxgPointer(G.field);
  if (window.ResizeObserver) new ResizeObserver(() => { if (MX.view === 'geflecht') mxgLayout(); }).observe(G.field);
  G.bar = mxgBuildBar();
  G.menu = h('div', { class: 'mxg-menu', role: 'menu', hidden: true });
  G.menu.addEventListener('keydown', (e) => {
    const items = [...G.menu.querySelectorAll('button')], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
    else if (e.key === 'Tab') mxgMenu(null);
  });
  document.addEventListener('pointerdown', (e) => { if (G.menuK != null && !G.menu.contains(e.target)) mxgMenu(null); }, true);
  G.live = h('div', { class: 'mx-sr', 'aria-live': 'polite' });
  host.append(G.field, G.bar.el, G.menu, G.live);
  // what moves a spore or a hypha: its fader, balance, route, sends, mute and solo – the picture follows in the next frame
  const geo = () => { G.geo = true; };
  for (const st of STRIPS) for (const s of ['vol', 'pan', 'route', 'mute', 'solo']) if (PD['x' + st.k + '.' + s]) bindCtl('x' + st.k + '.' + s, geo);
  for (const id of ['mix.pulsVol', 'mix.pulsMute', 'mst.vol']) bindCtl(id, geo);
}

/* ---------- the selected channel's row: name, value, route, M / S ---------- */
function mxgBuildBar() {
  const B = { k: null };
  B.name = h('b'); B.src = h('small');
  B.nm = h('button', { type: 'button', class: 'mxg-nm', onclick: () => openDetail(MX.sel) }, h('i', { 'aria-hidden': 'true' }), h('span', null, B.name, B.src), h('em', { 'aria-hidden': 'true' }, '›'));
  B.val = h('b'); B.sub = h('small');
  B.rt = h('button', { type: 'button', class: 'mxg-rt', role: 'switch', 'aria-checked': 'false', onclick: () => { const id = 'x' + MX.sel + '.route'; if (PD[id]) setParam(id, P[id] === 'dir' ? 'fx' : 'dir'); mxgBar(); } }, h('i', { 'aria-hidden': 'true' }), h('span'));
  B.mb = h('button', { type: 'button', class: 'mx-m', 'aria-pressed': 'false', onclick: () => {
    const k = MX.sel;
    if (k === 'sum') { if (A.ctx) { setMonMono(!A.monoChk); mxMonSync(); } } else { const id = mxMuteId(k); if (id) setParam(id, !P[id]); }
    mxgBar();
  } }, h('span', null, 'M'));
  B.sb = h('button', { type: 'button', class: 'mx-s', 'aria-pressed': 'false', title: 'Solo – halten oder Alt-Klick: nur dieser Kanal' }, h('span', null, 'S'));
  mxSoloBtn(B.sb, () => MX.sel);
  mPid(B.rt, () => 'x' + MX.sel + '.route'); mPid(B.mb, () => mxMuteId(MX.sel)); mPid(B.sb, () => mxSoloId(MX.sel));
  B.sb.addEventListener('click', () => { if (MX.sel === 'sum' && A.ctx) { setMonDim(!A.dim); mxMonSync(); } mxgBar(); });
  // wide screens: the chosen channel's balance and sends as gill knobs, right here
  B.kn = ['k1', 'k2', 'k3'].map((cls) => { const K = mxKnob({ ch: 'fin', cls: 'mxg-k ' + cls }); MXG.kn.push(K); return K; });
  B.el = h('div', { class: 'mxg-bar', role: 'group', 'aria-label': 'Gewählter Kanal' }, B.nm, h('div', { class: 'mxg-kns' }, B.kn.map((K) => K.box)), h('div', { class: 'mxg-v', 'aria-hidden': 'true' }, B.val, B.sub), B.rt, B.mb, B.sb);
  return B;
}
// one listener per parameter, whichever channel the knobs show
function mxgWatch(id) {
  const G = MXG;
  if (G.seen.has(id)) return;
  G.seen.add(id);
  bindCtl(id, () => { for (const K of G.kn) if (K.id === id) mxKnobRender(K); });
}
function mxgAimKnobs(k) {
  const c = MXK[k], [K1, K2, K3] = MXG.bar.kn;
  const aim = (K, id, name, label, col) => {
    K.box.hidden = !id;
    if (!id) return;
    K.o.ch = k; K.o.gr = id === 'mst.comp' ? () => MX.ch.sum.lv.gr : null;
    mxgWatch(id);
    const sz = Math.round(K.cv.clientWidth);
    if (sz) K.size = sz;
    K.key = ''; K.set(id, name, label, col);
  };
  if (c.kind === 'src' || c.kind === 'lane') { aim(K1, 'x' + k + '.pan', 'Balance', 'Balance', c.col); aim(K2, 'x' + k + '.dly', 'Echo', 'Echo-Send', '#6cc9ef'); aim(K3, 'x' + k + '.rev', 'Hall', 'Hall-Send', '#d6cbff'); }
  else if (c.kind === 'ret') { aim(K1, 'x' + k + '.pan', 'Balance', 'Balance', c.col); aim(K2, k + '.mix', 'Anteil', 'Anteil – wie viel alle Kanäle hineinschicken', c.col); aim(K3, k !== 'rev' ? 'x' + k + '.rev' : null, 'Hall', 'in den Hall', '#d6cbff'); }
  else if (k === 'sum') { aim(K1, 'mst.comp', 'Verdichtung', 'Verdichtung', '#ff8f9e'); aim(K2, 'mst.wid', 'Breite', 'Breite', c.col); aim(K3, null); }
  else { aim(K1, null); aim(K2, null); aim(K3, null); }
}
function mxgSet(el, txt, cls) {
  if (el.textContent !== txt) el.textContent = txt;
  if (cls != null && el.className !== cls) el.className = cls;
}
function mxgBar() {
  const B = MXG.bar, k = MX.sel, c = MXK[k];
  if (!B || !c) return;
  const sum = k === 'sum', v = P[mxVolId(k)], C = mxgCol(k), name = mxgName(k), src = mxSrcText(k), rid = 'x' + k + '.route', sid = mxSoloId(k), mid = mxMuteId(k);
  if (B.k !== k) {
    B.k = k; B.el.style.setProperty('--c', c.col); B.el.dataset.kind = c.kind;
    B.name.textContent = name;
    B.mb.firstChild.textContent = sum ? 'Mono' : 'M'; B.sb.firstChild.textContent = sum ? MX_MINUS + '20 dB' : 'S';
    B.mb.setAttribute('aria-label', sum ? 'Summe mono abhören' : k === 'puls' ? 'Puls stumm (alle vier Spuren)' : name + ' stumm');
    B.sb.setAttribute('aria-label', sum ? 'Abhöre um 20 Dezibel leiser' : name + ' solo');
    B.sb.hidden = !sid && !sum; B.rt.hidden = !PD[rid];
    B.rt.setAttribute('aria-label', name + ': direkt in die Summe, an der Effektkette vorbei');
    mxgAimKnobs(k);
  }
  if (k === 'sum') mxKnobRender(B.kn[0]);   // the compressor's arc moves with the music
  mxgSet(B.src, src);
  mxgSet(B.val, v > FADER_OFF ? mxDbTxt(v) + ' dB' : 'aus');
  mxgSet(B.sub, mxgHasPan(C) ? 'Balance ' + mxPanTxt(P['x' + k + '.pan']) : sum ? 'Pegel' : 'Gruppe');
  const lab = name + ', ' + src + ' – Einzelheiten öffnen';
  if (B.nm.getAttribute('aria-label') !== lab) B.nm.setAttribute('aria-label', lab);
  if (PD[rid]) { const dir = P[rid] === 'dir'; mxgSet(B.rt.lastChild, dir ? 'direkt' : 'kette'); B.rt.setAttribute('aria-checked', String(dir)); B.rt.classList.toggle('dir', dir); }
  B.mb.setAttribute('aria-pressed', String(!!(sum ? A.monoChk : mid && P[mid])));
  B.sb.setAttribute('aria-pressed', String(!!(sum ? A.dim : sid && P[sid])));
  B.mb.disabled = B.sb.disabled = sum && !A.ctx;
  B.el.classList.toggle('dormant', MX.ch[k].dorm);
}

/* ---------- layout ---------- */
function mxgLayout() {
  const G = MXG, f = G.field;
  if (!f || MX.view !== 'geflecht' || !MX.open) return;
  const w = f.clientWidth, hh = f.clientHeight;
  if (!w || !hh) { G.w = 0; return; }
  G.w = w; G.h = hh;
  const wide = G.wide = w >= 560, short = G.short = MX.root.dataset.short === '1' || hh < 240, n = MXC.length - 1;
  f.dataset.wide = wide ? '1' : ''; f.dataset.short = short ? '1' : '';
  // the dB gutter is as narrow as its numbers allow on phones: every pixel goes to the columns (the touch targets)
  const gl = wide ? 38 : 24, gr = wide ? 12 : 3, sumU = wide ? 1.6 : 1.4, u = G.u = (w - gl - gr) / (n + sumU);
  G.x0 = gl; G.x1 = w - gr;
  G.tH = short ? 18 : wide ? 60 : 44;
  G.yTop = G.tH + (short ? 6 : 8);
  const sH = short ? clamp(hh * 0.3, 52, 66) : wide ? clamp(hh * 0.31, 140, 190) : clamp(hh * 0.3, 116, 148);
  G.soilY = Math.round(hh - sH); G.span = G.soilY - G.yTop;
  // names stand like plant markers just under the soil line, in two staggered rows where columns are narrow
  G.rows = wide || short ? 1 : 2; G.tagH = wide && !short ? 27 : 13;
  G.tagY = G.soilY + 5; G.tagEnd = G.tagY + G.rows * G.tagH + 2;
  G.bw = wide ? 3 : 2; G.bwS = wide ? 4 : 3; G.gap = wide ? 1.5 : 1;
  G.panSpan = wide ? 220 : 170;   // px of sideways drag from hard left to hard right
  G.fTag = '500 ' + (wide ? 10 : 9) + 'px ' + COL.fontNum; G.fGhost = '500 8px ' + COL.fontNum;
  f.dataset.rows = String(G.rows);
  for (const C of G.cols) {
    const sum = C.c.kind === 'sum';
    C.cw = sum ? sumU * u : u;
    C.cx = sum ? gl + n * u + C.cw / 2 : gl + (C.i + 0.5) * u;
    C.pr = mxgHasPan(C) ? Math.max(3, C.cw / 2 - (wide ? 15 : 7)) : 0;
    const row = G.rows === 2 ? (sum ? 1 - (n - 1) % 2 : C.i % 2) : 0;   // (the Summe in the row its neighbour leaves free)
    C.tag.style.transform = 'translate(' + C.cx.toFixed(1) + 'px,' + (G.tagY + row * G.tagH) + 'px) translateX(-50%)';
    C.tag.style.maxWidth = Math.floor(G.rows === 2 ? 2 * u - 4 : C.cw - 4) + 'px';
  }
  // the root: the Summe's fruiting body, as large as the soil allows
  const sc = G.cols[n];
  G.rootR = Math.round(short ? clamp(sH * 0.27, 14, 18) : wide ? clamp(Math.min(sH * 0.34, sc.cw * 0.62), 40, 62) : clamp(sH * 0.25, 26, 34));
  G.rootD = 2 * G.rootR;
  G.rootX = Math.min(sc.cx, w - G.rootR - 4); G.rootY = hh - G.rootR - (short ? 4 : 8);
  // the chain's knot between the Puls lanes and the rest; the returns' nodes under their own columns
  G.kx = gl + 6 * u; G.ky = Math.round(G.tagEnd + (G.rootY - G.tagEnd) * 0.5);
  G.dyy = G.ky + (short ? 8 : wide ? 22 : 15);
  const E = G.cols[MXK.dly.i], H = G.cols[MXK.rev.i];
  G.ex = E.cx; G.ey = G.tagEnd + (short ? 6 : wide ? 16 : 10); G.hx = H.cx; G.hy = G.ey + (wide || short ? 0 : 12);
  // every return's node: under its column, staggered like Echo and Hall where the columns are narrow
  G.nd = {}; MXG_SND.forEach((r, j) => { G.nd[r] = [G.cols[MXK[r].i].cx, j % 2 ? G.hy : G.ey]; });
  // underground ways that only depend on the layout: the chain's trunk, the send threads, echo into hall
  G.trunk = new Path2D(); G.trunkP = [];
  mxgBz(G.trunk, G.trunkP, G.kx, G.ky, G.kx + (G.rootX - G.kx) * 0.35, G.ky + 2, G.rootX - G.rootR - (wide ? 30 : 16), G.rootY - 2, G.rootX, G.rootY);
  for (const C of G.cols) {
    C.snd = null;
    if (C.c.kind !== 'src' && C.c.kind !== 'lane') continue;
    C.snd = MXG_SND.map((r, j) => [...G.nd[r], [0.07, 0.1, 0.085, 0.115][j] || 0.1]).map(([nx, ny, s]) => {
      const p = new Path2D(), y0 = G.tagEnd, sag = 4 + Math.abs(nx - C.cx) * s;
      mxgBz(p, null, C.cx, y0, C.cx + (nx - C.cx) * 0.25, y0 + sag, nx - (nx - C.cx) * 0.15, ny + sag * 0.5, nx, ny);
      return p;
    });
  }
  // a return's way into the hall (Echo, and the effects – their „Hall“): from its node over to the cloud
  G.toH = {};
  for (const r of MXG_SND) if (r !== 'rev') { const [x, y] = G.nd[r], p = G.toH[r] = new Path2D(), s = x < G.hx ? 1 : -1; mxgBz(p, null, x, y, x + 6 * s, y + 14, G.hx - 6 * s, G.hy + 14, G.hx, G.hy); }
  G.bar.el.dataset.wide = wide && !short ? '1' : '';
  for (const K of G.kn) { const sz = Math.round(K.cv.clientWidth); if (sz && sz !== K.size) { K.size = sz; K.key = ''; mxKnobRender(K); } }
  // the corner readouts keep clear of the root
  G.ro.br.el.style.right = Math.max(8, w - (G.rootX - G.rootR - (wide ? 14 : 8))) + 'px';
  // the fruiting body lives in the root while the band does not show it
  mxgRootHome();
  Object.assign(G.root.style, { left: (G.rootX - G.rootR) + 'px', top: (G.rootY - G.rootR) + 'px', width: G.rootD + 'px', height: G.rootD + 'px' });
  // each column's light: its colour from the soil up, warm white near 0 dB, red above
  const lc = mxFit(G.cvL, w, hh, 0, MX_LDPR()), gg = { yb: G.soilY, yt: G.yTop };
  for (const C of G.cols) {
    C.grad = mxGrad(lc, gg, C.c.rgb, false);
    C.hl = lc.createLinearGradient(0, G.yTop - 10, 0, G.tagEnd);
    C.hl.addColorStop(0, mxRgba(C.c.rgb, 0)); C.hl.addColorStop(0.55, mxRgba(C.c.rgb, 0.035)); C.hl.addColorStop(1, mxRgba(C.c.rgb, 0.09));
  }
  G.gradD = mxGrad(lc, gg, MX_DORM, true);
  G.dirty = true; G.geo = true;
  mxgGeo();
}
// a cubic Bézier: into a Path2D (if given) and, sampled, onto a point list (if given) for the flow
function mxgBz(p2, pts, x0, y0, x1, y1, x2, y2, x3, y3) {
  if (p2) { p2.moveTo(x0, y0); p2.bezierCurveTo(x1, y1, x2, y2, x3, y3); }
  if (!pts) return;
  for (let i = pts.length ? 1 : 0; i <= 16; i++) {
    const u = i / 16, v = 1 - u, a = v * v * v, b = 3 * v * v * u, q = 3 * v * u * u, d = u * u * u;
    pts.push(a * x0 + b * x1 + q * x2 + d * x3, a * y0 + b * y1 + q * y2 + d * y3);
  }
}
// the point list at even steps, so a particle's distance maps straight to a point
function mxgEven(pts) {
  const out = [pts[0], pts[1]];
  let carry = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2], ay = pts[i - 1], dx = pts[i] - ax, dy = pts[i + 1] - ay, L = Math.hypot(dx, dy);
    let s = MXG_STEP - carry;
    for (; s <= L; s += MXG_STEP) out.push(ax + dx * s / L, ay + dy * s / L);
    carry = L - (s - MXG_STEP);
  }
  return new Float32Array(out);
}
// where every spore stands and how its hyphae run – after any change of a fader, balance, route, mute or solo
function mxgGeo() {
  const G = MXG, sy = G.soilY;
  G.geo = false;
  if (!G.w) return;
  for (const C of G.cols) {
    const k = C.k, kind = C.c.kind, v = P[mxVolId(k)];
    C.off = !(v > FADER_OFF);
    C.y = C.off ? sy : sy - mxPos(v) * G.span;
    C.pan = mxgHasPan(C) ? P['x' + k + '.pan'] : 0;
    C.x = C.cx + C.pan * C.pr;
    C.fx = (kind === 'src' || kind === 'lane') && P['x' + k + '.route'] !== 'dir';
    const t = mxgAria(C);
    if (t !== C.aria) { C.aria = t; C.el.setAttribute('aria-valuetext', t); C.el.setAttribute('aria-valuenow', String(v)); }
    C.el.style.transform = 'translate(' + C.x.toFixed(1) + 'px,' + C.y.toFixed(1) + 'px)';
    // the stem bends from the spore down into the middle of its column; under the soil the hypha takes its way
    const pts = [], dy = sy - C.y;
    C.stem = new Path2D(); C.hy = new Path2D();
    if (kind === 'sum') {
      // the Summe grows out of its root: from the root up to its spore
      mxgBz(C.hy, pts, G.rootX, G.rootY - G.rootR, G.rootX, G.rootY - G.rootR - 8, C.cx, sy + 8, C.cx, sy);
      mxgBz(C.stem, pts, C.cx, sy, C.cx, sy - dy * 0.3, C.x, C.y + dy * 0.5, C.x, C.y);
    } else {
      mxgBz(C.stem, pts, C.x, C.y, C.x, C.y + dy * 0.5, C.cx, sy - dy * 0.3, C.cx, sy);
      if (kind === 'ret') {
        const ny = G.nd[k][1];
        mxgBz(C.hy, pts, C.cx, sy, C.cx, sy + 6, C.cx, ny - 6, C.cx, ny);
        mxgBz(C.hy, pts, C.cx, ny, C.cx + 6, ny + 16, G.rootX - G.rootR * 0.9, G.rootY - G.rootR - 4, G.rootX, G.rootY);
      } else if (C.fx) {
        mxgBz(C.hy, pts, C.cx, sy, C.cx, sy + (G.ky - sy) * 0.7, G.kx + (C.cx - G.kx) * 0.4, G.ky, G.kx, G.ky);
        for (let j = 2; j < G.trunkP.length; j++) pts.push(G.trunkP[j]);
      } else if (kind !== 'puls') {
        // direkt: deeper, under the knot, straight into the root
        mxgBz(C.hy, pts, C.cx, sy, C.cx, G.dyy, G.rootX - G.rootR - (G.wide ? 34 : 20), G.dyy + 6, G.rootX, G.rootY);
      }
    }
    C.flow = mxgEven(pts); C.fn = C.flow.length >> 1;
  }
}
// what a screen reader hears on a spore: level, balance, and whether it sounds
function mxgAria(C) {
  const k = C.k, v = P[mxVolId(k)], mid = mxMuteId(k), sid = mxSoloId(k);
  let t = mxDbAria(v) + (mxgHasPan(C) ? ', Balance ' + mxPanAria(P['x' + k + '.pan']) : '');
  if (mid && P[mid]) t += ', stumm';
  else if (MX.ch[k].dorm) t += C.c.kind === 'lane' && P['mix.pulsMute'] ? ', still, Puls stumm' : k === 'puls' ? ', alle Spuren still' : ', still durch ein Solo';
  if (sid && P[sid]) t += ', Solo';
  if (MX.ch[k].srcoff) t += ', ' + (k === 'puls' ? 'alle Spuren aus' : 'Klangquelle aus');
  return t;
}
function mxgTag(C, t, off) {
  const s = C.tag.lastChild;
  if (s.textContent !== t) s.textContent = t;
  C.tag.classList.toggle('srcoff', !!off);
  if (C.srcoff !== !!off) MXG.geo = true;   // its spoken value says so too
  C.srcoff = !!off;
}

