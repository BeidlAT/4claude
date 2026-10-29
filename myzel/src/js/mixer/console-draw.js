/* ---------- static layer: stems, scale, soil, rails ---------- */
function mxStatic() {
  MX.dirtyStatic = false;
  const W = MX.rowW, H = MX.rowH;
  if (!W || !H) return;
  mxPaths();
  const c = mxFit(MX.cvs, W, H - MX.top, MX.top);
  c.clearRect(0, MX.top, W, H - MX.top);
  const soilY = H - MX.soil, yK = MX.yK, yD = MX.yD, xe = MX.railEnd;
  const sg = c.createLinearGradient(0, soilY - 18, 0, H);
  sg.addColorStop(0, 'rgba(10,7,6,0)'); sg.addColorStop(0.4, 'rgba(10,7,6,.5)'); sg.addColorStop(1, 'rgba(10,7,6,.8)');
  c.fillStyle = sg; c.fillRect(0, soilY - 18, W, H - soilY + 18);
  if (MX.soil < 20) { for (const cc of MXC) if (cc.kind !== 'sum' && !MX.ch[cc.k].gone) mxStemBody(c, MX.ch[cc.k].g, cc, false, MX.ch[cc.k].srcoff); mxStaticSum(); return; }
  // the two rails, named where they begin – left of the first strip, clear of the Summe's root – and running from
  // there to the Summe; a name that does not fit beside the first hypha stands above its rail
  const disp = getComputedStyle(MX.root).getPropertyValue('--font-display'), fx0 = MX.ch.fin.g.cx - 7;
  c.font = '400 ' + (MX.wide ? 9 : 8.5) + 'px ' + disp; c.textBaseline = 'middle'; c.textAlign = 'left';
  const inline = 5 + c.measureText('direkt').width + 5 < fx0;
  for (const [name, y, col, line] of [['kette', yK, 'rgba(255,179,92,.78)', 'rgba(255,179,92,.16)'], ['direkt', yD, 'rgba(240,230,216,.52)', 'rgba(240,230,216,.15)']]) {
    const tw = c.measureText(name).width;
    c.fillStyle = col; c.fillText(name, 5, inline ? y + 0.5 : y - 6);
    c.strokeStyle = line; c.lineWidth = 1; c.setLineDash([1.5, 4]);
    c.beginPath(); c.moveTo(inline ? 5 + tw + 5 : 4, y + 0.5); c.lineTo(xe, y + 0.5); c.stroke(); c.setLineDash([]);
  }
  // effect beads on the chain rail, under the returns: Verzerrung, Ring, Filter, Phaser, Schweben – lit while
  // active, their initials inside where the soil has room, their names under the mouse
  const bx0 = MX.ch.dly.g.cx - 22, bx1 = MX.ch.rev.g.cx + 22, big = MX.soil >= 44, br = big ? 6.5 : 6;
  c.font = '600 7.5px ' + COL.fontNum; c.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    const x = bx0 + (bx1 - bx0) * i / 4, on = mxFxOn(i);
    c.fillStyle = on ? 'rgba(255,179,92,.16)' : 'rgba(255,179,92,.05)'; c.beginPath(); c.arc(x, yK, br + 2, 0, MX_TAU); c.fill();
    c.fillStyle = '#17110e'; c.beginPath(); c.arc(x, yK, big ? br : 2.6, 0, MX_TAU); c.fill();
    c.strokeStyle = on ? 'rgba(255,179,92,.8)' : 'rgba(255,179,92,.3)'; c.lineWidth = 1; c.stroke();
    if (big) { c.fillStyle = on ? 'rgba(255,200,140,.95)' : 'rgba(168,153,138,.6)'; c.fillText(MX_FX[i][2], x, yK + 0.5); }
    const b = MX.beads && MX.beads[i];
    if (b) { b.style.transform = 'translate(' + (x - 9).toFixed(1) + 'px,' + (yK - 9).toFixed(1) + 'px)'; b.title = MX_FX[i][1] + (on ? ' – an' : ' – aus') + ' (Effektkette)'; }
  }
  // hyphae: from the base of each stem down to its rail; returns always go straight in
  c.lineCap = 'round';
  for (const cc of MXC) {
    if (cc.kind === 'sum' || cc.kind === 'puls' || MX.ch[cc.k].gone) continue;
    const S = MX.ch[cc.k], g = S.g, dir = cc.kind === 'ret' || P['x' + cc.k + '.route'] === 'dir', ry = dir ? yD : yK;
    const y0 = g.yb + 9, a = S.dorm || S.srcoff ? 0.1 : 0.34;
    c.strokeStyle = mxRgba(cc.rgb, a); c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(g.cx, y0); c.bezierCurveTo(g.cx - 2, y0 + (ry - y0) * 0.4, g.cx + 2, y0 + (ry - y0) * 0.7, g.cx, ry); c.stroke();
    // root fibres
    c.strokeStyle = mxRgba(cc.rgb, a * 0.5); c.lineWidth = 0.6;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(g.cx, ry); c.quadraticCurveTo(g.cx + s * 5, ry + 2, g.cx + s * 9, ry + 5); c.stroke(); }
    if (cc.kind !== 'ret') { c.strokeStyle = 'rgba(240,230,216,.22)'; c.lineWidth = 1; c.beginPath(); c.arc(g.cx, dir ? yK : yD, 3.2, 0, MX_TAU); c.stroke(); }
    // the knot: the channel's colour; hollow when its source is off, grey when it is still
    c.fillStyle = S.dorm ? 'rgba(118,106,97,.9)' : S.srcoff ? '#17110e' : mxRgba(cc.rgb, 1); c.beginPath(); c.arc(g.cx, ry, 3.8, 0, MX_TAU); c.fill();
    c.strokeStyle = S.srcoff && !S.dorm ? mxRgba(cc.rgb, 0.6) : '#140f0c'; c.lineWidth = 1.2; c.stroke();
  }
  // the Puls group is a VCA: a bracket over its four lanes
  const pg = MX.ch.puls.g, l0 = MX.ch.l0.g, by = soilY + 3;
  c.strokeStyle = 'rgba(242,207,134,.4)'; c.lineWidth = 1; c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(l0.cx, by); c.lineTo(pg.cx, by); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.moveTo(pg.cx, pg.yb + 9); c.lineTo(pg.cx, by); c.stroke();
  for (let i = 0; i < 4; i++) { const g = MX.ch['l' + i].g; c.beginPath(); c.moveTo(g.cx, by - 2); c.lineTo(g.cx, by + 2); c.stroke(); }
  c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(242,207,134,.6)'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText('vca', pg.cx, by + 9);
  for (const cc of MXC) if (cc.kind !== 'sum' && !MX.ch[cc.k].gone) mxStemBody(c, MX.ch[cc.k].g, cc, false, MX.ch[cc.k].srcoff);
  mxStaticSum();
}
// the stem: a translucent, fibrous capsule with a bulb at the base, and its scale on the left. off: the source
// plays nothing – the stem says so ("aus", faint, along it)
function mxStemBody(c, g, cc, master, off) {
  const sw = g.sw, x0 = g.cx - sw / 2, cx = g.cx, yt = g.yt, yb = g.yb;
  c.font = '400 8px ' + COL.fontNum; c.textBaseline = 'middle'; c.textAlign = 'right';
  const placed = [];
  // the Summe's finer marks only where the stem is long enough to keep them apart
  const order = master && g.span >= 200 ? [0, -12, -24, -48, 6, -6, -36, -18, 3, -3, -9] : [0, -12, -24, -48, 6, -6, -36, -18];
  for (const m of order) {
    const y = yb - mxPos(m) * g.span;
    if (!placed.every((p) => Math.abs(p - y) >= 12.5)) continue;
    const lab = m > 0 ? '+' + m : m === 0 ? '0' : MX_MINUS + Math.abs(m);
    if (c.measureText(lab).width > g.lx - g.x - 1) continue;
    placed.push(y);
    const zero = m === 0;
    c.fillStyle = zero ? 'rgba(255,179,92,.9)' : 'rgba(168,153,138,.66)';
    c.fillText(lab, g.lx, y + 0.5);
  }
  for (const m of [6, 3, 0, -3, -6, -9, -12, -18, -24, -36, -48]) {
    if ((!master || g.span < 200) && (m === 3 || m === -3 || m === -9)) continue;
    const y = Math.round(yb - mxPos(m) * g.span) + 0.5;
    c.strokeStyle = m === 0 ? 'rgba(255,179,92,.65)' : 'rgba(240,230,216,.17)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 - (m === 0 ? 7 : 5), y); c.lineTo(x0 - 1.5, y); c.stroke();
  }
  c.fillStyle = 'rgba(168,153,138,.42)'; c.fillText('∞', g.lx, yb);
  const body = new Path2D(), bulb = sw * 0.7, top = yt - 4;
  body.moveTo(x0, top);
  body.arcTo(x0, top - sw / 2, cx, top - sw / 2, sw / 2);
  body.arcTo(x0 + sw, top - sw / 2, x0 + sw, top, sw / 2);
  body.lineTo(x0 + sw, yb - 6);
  body.bezierCurveTo(x0 + sw, yb + 2, x0 + sw + bulb * 0.35, yb + 4, cx + sw * 0.2, yb + 9);
  body.lineTo(cx - sw * 0.2, yb + 9);
  body.bezierCurveTo(x0 - bulb * 0.35, yb + 4, x0, yb + 2, x0, yb - 6);
  body.closePath();
  const gx = c.createLinearGradient(x0, 0, x0 + sw, 0);
  gx.addColorStop(0, 'rgba(240,230,216,.05)'); gx.addColorStop(0.35, 'rgba(240,230,216,.09)'); gx.addColorStop(0.7, 'rgba(240,230,216,.04)'); gx.addColorStop(1, 'rgba(240,230,216,.02)');
  c.fillStyle = '#0d0a08'; c.fill(body);
  c.fillStyle = gx; c.fill(body);
  // fibres, the same every time for the same channel
  let seed = cc.i * 97 + 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  c.save(); c.clip(body);
  c.strokeStyle = 'rgba(240,230,216,.05)'; c.lineWidth = 0.7;
  for (let i = 0; i < (master ? 7 : 4); i++) {
    let x = x0 + 2 + rnd() * (sw - 4);
    c.beginPath(); c.moveTo(x, top - 8);
    for (let y = yt; y <= yb + 9; y += 14) { x += (rnd() - 0.5) * 1.6; c.lineTo(clamp(x, x0 + 1, x0 + sw - 1), y); }
    c.stroke();
  }
  c.restore();
  c.strokeStyle = 'rgba(240,230,216,.14)'; c.lineWidth = 1; c.stroke(body);
  c.beginPath(); c.ellipse(cx, yt - 9, sw / 2 + 3, 2.4, 0, 0, MX_TAU);
  c.fillStyle = '#1a1310'; c.fill(); c.strokeStyle = 'rgba(240,230,216,.24)'; c.stroke();
  if (off) {
    c.save(); c.translate(cx, yb - g.span * 0.32); c.rotate(-Math.PI / 2);
    c.font = '500 8.5px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(168,153,138,.62)';
    c.fillText('aus', 0, 0.5);
    c.restore();
  }
}
// the Summe's root: under its stem – or, when Mono and −20 dB stand under the slim one, down in the soil
const mxSumRootY = () => (MX.root.dataset.sumslim === '1' ? MX.rowH - MX.soil + 4 : MX.ch.sum.g.yb + 12);
// the Summe column: its stem, the scale on both sides and the root where the rails arrive
function mxStaticSum() {
  const S = MX.ch.sum, g = S.g, W = MX.sumWd, H = MX.sumH;
  if (!g || !W) return;
  const c = mxFit(MX.cvsumS, W, H - MX.top, MX.top);
  c.clearRect(0, MX.top, W, H - MX.top);
  mxStemBody(c, g, MXK.sum, true);
  const yK = MX.yK, yD = MX.yD, rx = g.cx, ry = mxSumRootY();
  if (MX.soil < 20) return;
  c.lineCap = 'round';
  // both rails bend up into the root (they are named where they begin, at the rack's left end)
  for (const [y, a] of [[yK, 'rgba(255,179,92,.42)'], [yD, 'rgba(240,230,216,.32)']]) {
    c.strokeStyle = a; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(rx * 0.55, y, rx - 4, y - 2, rx, ry); c.stroke();
  }
  const gl = c.createRadialGradient(rx, ry + 6, 0, rx, ry + 6, 26);
  gl.addColorStop(0, 'rgba(255,240,222,.3)'); gl.addColorStop(1, 'rgba(255,240,222,0)');
  c.fillStyle = gl; c.beginPath(); c.arc(rx, ry + 6, 26, 0, MX_TAU); c.fill();
}

/* ---------- live layer: meters, light, spores ---------- */
const MX_NP = MOBILE ? 90 : 160;
const MXP = { k: new Int8Array(MX_NP).fill(-1), d: new Float32Array(MX_NP), v: new Float32Array(MX_NP), s: new Float32Array(MX_NP), f: new Uint8Array(MX_NP) };
function mxSpawn(i, pulse) {
  for (let j = 0; j < MX_NP; j++) {
    if (MXP.k[j] >= 0) continue;
    MXP.k[j] = i; MXP.d[j] = 0; MXP.f[j] = pulse ? 1 : 0;
    MXP.v[j] = pulse ? 230 : 42 + Math.random() * 34; MXP.s[j] = pulse ? 1.6 : 0.7 + Math.random() * 0.6;
    return;
  }
}
function mxPulse(k) { const v = MXV.views[MX.view]; if (v && v.pulse) v.pulse(k); }
// the path of a channel's spores: down its hypha to the rail, then along the rail towards the sum
// [x, top, rail y, length down, length along], kept per channel and renewed with the static layer
const MX_PATHS = [];
function mxPaths() {
  for (const cc of MXC) {
    const g = MX.ch[cc.k].g, p = MX_PATHS[cc.i] || (MX_PATHS[cc.i] = new Float32Array(5));
    if (!g || MX.ch[cc.k].gone) continue;
    const ry = cc.kind === 'ret' || P['x' + cc.k + '.route'] === 'dir' ? MX.yD : MX.yK, y0 = g.yb + 9;
    p[0] = g.cx; p[1] = y0; p[2] = ry; p[3] = ry - y0; p[4] = MX.railEnd - g.cx;
  }
}
function mxPultFrame(dt, ts) {
  if (!MX.ch.sum.g) return;
  if (MX.dirtyStatic) mxStatic();
  mxDrawRack(dt);
  mxDrawSum();
  if (MX.scrollable && (!MOBILE || ts - (MX.brT || 0) > 45)) { MX.brT = ts; mxDrawBridge(); }
  mxRings();
  if (typeof hxmPultFrame === 'function') hxmPultFrame(dt);
  // the numbers on the strips: peak readouts eight times a second, the compressor arc with them
  const t = ts / 1000;
  if (t - (MX.stripT || 0) > 0.125) {
    MX.stripT = t;
    for (const c of MXC) mxPeakText(c.k);
    mxKnobRender(MX.ch.sum.k1);
    if (MX.ch.puls.srcEl.textContent !== mxSrcText('puls')) mxSrcAll();
  }
}
// the held sample peak over a stem: el = its button (the strip's, or the detail's), o keeps what it shows
function mxPeakText(k, el, o) {
  const S = MX.ch[k], L = S.lv, clip = L.clip;
  el = el || S.pk; o = o || S;
  const t = clip ? 'CLIP' : L.max > 0.001 ? mxDbTxt(20 * Math.log10(L.max)) : MX_MINUS + '∞';
  const cls = clip ? 'clip' : L.max > 0.708 ? 'hot' : '';
  if (o.pkT === t + cls) return;
  o.pkT = t + cls;
  el.firstChild.textContent = t;
  el.classList.toggle('clip', cls === 'clip'); el.classList.toggle('hot', cls === 'hot');
  const db = L.max > 0.001 ? mxDbTxt(20 * Math.log10(L.max)) + ' dB' : 'kein Signal';
  el.setAttribute('aria-label', 'Spitze ' + (k === 'sum' ? 'Summe' : MXK[k].name) + ' ' + db + (clip ? ', übersteuert' : '') + ' – tippen setzt zurück');
}
function mxDrawRack(dt) {
  // what is in view: the Summe column covers the right end of the rack while it scrolls
  const c = mxFit(MX.cvd, MX.rowW, MX.rowH - MX.top, MX.top, MX_LDPR()), sl = MX.scroll.scrollLeft, x0 = sl - 60, x1 = sl + MX.vw - MX.sumW + 60;
  c.clearRect(Math.max(0, x0), MX.top, x1 - x0, MX.rowH - MX.top);
  for (const cc of MXC) {
    if (cc.kind === 'sum') continue;
    const S = MX.ch[cc.k], g = S.g;
    if (S.gone || g.x + g.w < x0 || g.x > x1) continue;
    mxMeter(c, S, cc);
  }
  // knots light up with each Puls hit
  for (let i = 0; i < 4; i++) {
    if (MX.flash[i] <= 0) continue;
    const g = MX.ch['l' + i].g, ry = P['xl' + i + '.route'] === 'dir' ? MX.yD : MX.yK;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = MX.flash[i];
    c.drawImage(MXK['l' + i].spr.knot, g.cx - 16, ry - 16, 32, 32);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  if (MX.soil < 20) return;
  mxSends(c);
  if (REDUCED) return;
  // spores flow down each hypha and along the rails, as many as there is signal
  for (const cc of MXC) {
    if (cc.kind === 'sum' || cc.kind === 'puls') continue;
    const S = MX.ch[cc.k];
    if (S.gone || S.dorm || S.srcoff || S.g.x + S.g.w < x0 || S.g.x > x1) continue;
    if (Math.random() < S.lv.lvl * dt * 9) mxSpawn(cc.i, false);
  }
  c.globalCompositeOperation = 'lighter';
  for (let j = 0; j < MX_NP; j++) {
    const i = MXP.k[j];
    if (i < 0) continue;
    const cc = MXC[i], p = MX_PATHS[i];
    if (!p) { MXP.k[j] = -1; continue; }
    const L = p[3] + p[4];
    MXP.d[j] += MXP.v[j] * dt;
    if (MXP.d[j] >= L) { MXP.k[j] = -1; continue; }
    const d = MXP.d[j], x = d < p[3] ? p[0] : p[0] + d - p[3], y = d < p[3] ? p[1] + d : p[2];
    if (x < x0 || x > x1) continue;
    const a = Math.min(1, d / 10, (L - d) / 30) * (MXP.f[j] ? 1 : 0.85), big = MXP.s[j] > 1, s = MXP.f[j] ? 14 : big ? 6 : 4.5;
    c.globalAlpha = a;
    c.drawImage(MXP.f[j] ? cc.spr.pulse : big ? cc.spr.p2 : cc.spr.p1, x - s, y - s, s * 2, s * 2);
    c.fillStyle = MXP.f[j] ? '#fff6ea' : cc.c1;
    c.fillRect(x - MXP.s[j] * 0.6, y - MXP.s[j] * 0.6, MXP.s[j] * 1.2, MXP.s[j] * 1.2);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
// Send threads of the selected (or hovered) channel: hyphae from its knot that dip below both rails and come up
// under Echo and Hall, as thick as what it sends. They fade towards their middle and are at full strength only for a
// moment after the selection changed or while the mouse rests on the strip; otherwise a faint trace keeps the soil calm.
const MX_SENDG = {};
function mxSends(c) {
  const k = MX.hov || MX.sel, cc = MXK[k];
  if (!cc || (cc.kind !== 'src' && cc.kind !== 'lane') || MX.ch[k].dorm || MX.ch[k].srcoff) return;
  const fresh = MX.hov === k ? 1 : clamp(1 - (performance.now() - (MX.sendT || 0) - 1400) / 900, 0, 1);
  const g = MX.ch[k].g, ry = P['x' + k + '.route'] === 'dir' ? MX.yD : MX.yK, bot = MX.rowH - 3;
  for (const fx of ['dly', 'rev', ...FX_RETS.map((x) => x[0])]) {
    const amt = P['x' + k + '.' + fx] * P[fx + '.mix'];
    if (amt < 0.01 || MX.ch[fx].dorm) continue;
    const t = MX.ch[fx].g, a = Math.min(1, amt), dip = fx === 'dly' ? bot - 6 : bot, key = k + ':' + g.cx + ':' + t.cx;
    let G = MX_SENDG[fx];
    if (!G || G.key !== key) {
      const gr = c.createLinearGradient(g.cx, 0, t.cx, 0), rgb = MXK[fx].rgb;
      gr.addColorStop(0, mxRgba(rgb, 1)); gr.addColorStop(0.18, mxRgba(rgb, 0.7)); gr.addColorStop(0.5, mxRgba(rgb, 0.12)); gr.addColorStop(0.82, mxRgba(rgb, 0.7)); gr.addColorStop(1, mxRgba(rgb, 1));
      G = MX_SENDG[fx] = { key, gr };
    }
    c.globalAlpha = (0.22 + 0.78 * fresh) * (0.45 + 0.55 * a);
    c.strokeStyle = G.gr; c.lineWidth = 0.7 + 1.5 * a;
    c.beginPath(); c.moveTo(g.cx, ry); c.bezierCurveTo(g.cx, dip, t.cx, dip, t.cx, MX.yD); c.stroke();
  }
  c.globalAlpha = 1;
}
function mxMeter(c, S, cc) {
  const g = S.g, L = S.lv, sw = g.sw, x0 = g.cx - sw / 2, span = g.span, yb = g.yb, dorm = S.dorm, master = cc.kind === 'sum';
  // an empty mushroom (its source is off): no light in the stem, none on the cap – only the morph's marks
  if (S.srcoff && !master) { if (MX.ghost) mxGhostMarks(c, cc, x0 + sw, yb, span); return; }
  const src = cc.kind === 'puls' ? MXK['l' + L.dom] : cc, colHex = dorm ? '#766a61' : src.col;
  const key = (dorm ? 'd' : src.k) + g.yb + g.span;
  if (S.gradKey !== key) { S.gradKey = key; S.grad = mxGrad(c, g, dorm ? MX_DORM : src.rgb, dorm); }
  const lw = (sw - (master ? 7 : 5)) / 2;
  let top = yb;
  c.globalCompositeOperation = 'lighter';
  for (let s = 0; s < 2; s++) {
    const lx = x0 + (master ? 3 : 2) + s * (lw + (master ? 1.5 : 1)), yr = yb - L.rms[s] * span, yp = yb - L.pk[s] * span;
    if (L.rms[s] > 0.004) { c.fillStyle = S.grad; c.fillRect(lx, yr, lw, yb - yr + 6); if (yr < top) top = yr; }
    if (L.pk[s] > 0.004) {
      if (yp < yr - 1) { c.fillStyle = dorm ? 'rgba(150,138,128,.3)' : src.c55; c.fillRect(lx + lw / 2 - 0.6, yp, 1.2, yr - yp); }
      c.fillStyle = dorm ? 'rgba(160,150,140,.6)' : L.pk[s] > 0.8 ? '#ff7b6b' : 'rgba(255,248,236,.95)';
      c.fillRect(lx, yp - 0.6, lw, 1.3);
    }
    if (L.hp[s] > 0.01) {
      const yh = yb - L.hp[s] * span;
      c.fillStyle = dorm ? 'rgba(170,160,150,.7)' : L.hp[s] > 0.8 ? '#ff5b4d' : 'rgba(255,248,236,.92)';
      c.beginPath(); c.arc(lx + lw / 2, yh, master ? 1.9 : 1.6, 0, MX_TAU); c.fill();
    }
  }
  // the cap is lit from below by what flows through the stem; the tip of the level glows
  const capY = yb - (S.capPos || 0) * span, sp = dorm ? (master ? MX_SPR.dormM : MX_SPR.dorm) : src.spr;
  if (L.lvl > 0.02) { const s = master ? 120 : 92; c.globalAlpha = (dorm ? 0.22 : 0.72) * L.lvl; c.drawImage(sp.cap, g.cx - s / 2, capY - s * 0.42, s, s * 0.8); }
  if (top < yb - 3) { const s = master ? 62 : 44; c.globalAlpha = dorm ? 0.35 : 0.85; c.drawImage(sp.tip, g.cx - s / 2, top - s / 2, s, s); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // Pumpen (or the Summe's compressor): a rose bar hanging from 0 dB, 24 dB long at most
  if (L.gr > 0.2) {
    const y0 = yb - 0.8 * span, len = Math.min(1, L.gr / 24) * span * 0.45, x = x0 + sw + 3;
    c.fillStyle = 'rgba(255,143,158,.22)'; c.fillRect(x - 1, y0, 4, len);
    c.fillStyle = 'rgba(255,143,158,.92)'; c.fillRect(x, y0, 2, len);
  }
  // the ring at the top of the stem (drawn unlit with the stem): red and latched after a clip, until the readout is tapped
  if (L.clip) {
    const yr = g.yt - 9;
    c.beginPath(); c.ellipse(g.cx, yr, sw / 2 + 3, 2.4, 0, 0, MX_TAU);
    c.fillStyle = 'rgba(255,91,77,.95)'; c.fill(); c.strokeStyle = '#ff5b4d'; c.lineWidth = 1; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.drawImage(MX_SPR.clip, g.cx - 22, yr - 22, 44, 44); c.globalCompositeOperation = 'source-over';
  }
  if (MX.ghost) mxGhostMarks(c, cc, x0 + sw, yb, span);
}
// snapshot ghosts while the morph is in use: where A and B put this fader – right of the stem, where no scale stands
function mxGhostMarks(c, cc, x, yb, span) {
  const gh = mxGhostN(mxVolId(cc.k));
  if (!gh) return;
  c.font = '500 8px ' + COL.fontNum; c.textAlign = 'left'; c.textBaseline = 'middle';
  for (let j = 0; j < 2; j++) {
    const y = yb - mxPos(mxGhostDb(cc.k, j)) * span;
    c.fillStyle = j ? '#86f0d0' : '#ffb35c';
    c.fillRect(x + 2, y - 1, 7, 2);
    c.fillText(j ? 'b' : 'a', x + 11, y);
  }
}
const mxGhostDb = (k, j) => (j ? MX.snap.b : MX.snap.a)[mxVolId(k)];
function mxDrawSum() {
  const S = MX.ch.sum, T = MX.top, c = mxFit(MX.cvsum, MX.sumLW, MX.sumH - T, T, MX_LDPR());
  c.translate(-MX.sumX, 0);
  c.clearRect(MX.sumX, T, MX.sumLW, MX.sumH - T);
  mxMeter(c, S, MXK.sum);
  // the root takes in what arrives on the rails
  const L = S.lv;
  if (L.lvl > 0.02) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.6 * L.lvl;
    c.drawImage(mxGlow('#fff0de'), S.g.cx - 24, mxSumRootY() + 6 - 24, 48, 48);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
}
// the four rhythm rings in the Puls group strip, redrawn only when a step moves
function mxRings() {
  const S = MX.ch.puls, cv = S.ringCv;
  if (!cv || !MX.ringW || MX.layer === 'duck') return;
  let key = MX.ringW + ':' + MX.ringH;
  for (let i = 0; i < 4; i++) key += ',' + (SEQ.on ? SEQ.lanes[i].cur : -1) + (MX.flash[i] > 0.5 ? '*' : '') + P['l' + i + '.on'] + P['l' + i + '.steps'] + P['l' + i + '.puls'] + P['l' + i + '.rot'];
  if (key === MX.ringsKey) return;
  MX.ringsKey = key;
  mxRingDraw(mxFit(cv, MX.ringW, MX.ringH), MX.ringW, MX.ringH, [0, 1, 2, 3]);
}
// euclidean rings (from the Puls panel's picture): one ring per lane, its current step lit
function mxRingDraw(c, W, H, lanes) {
  c.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 2, n = lanes.length;
  lanes.forEach((i, j) => {
    const p = 'l' + i + '.', on = P[p + 'on'], steps = P[p + 'steps'], pat = euclid(steps, P[p + 'puls'], P[p + 'rot']);
    const r = n === 1 ? R * 0.78 : R * (0.92 - j * 0.22), col = mxRgb(COL.lanes[i]), cur = SEQ.on ? SEQ.lanes[i].cur : -1;
    c.strokeStyle = on ? mxRgba(col, 0.22) : 'rgba(240,230,216,.08)'; c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, r, 0, MX_TAU); c.stroke();
    const dot = Math.min(n === 1 ? 2.6 : 1.9, Math.PI * r / steps * 0.5);
    for (let s = 0; s < steps; s++) {
      if (!pat[s] && s !== cur) continue;
      const a = -Math.PI / 2 + s / steps * MX_TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      c.fillStyle = !on ? 'rgba(240,230,216,.18)' : s === cur ? (pat[s] ? '#fff6ea' : mxRgba(col, 0.5)) : mxRgba(col, 0.75);
      c.beginPath(); c.arc(x, y, s === cur && pat[s] ? dot * 1.6 : dot, 0, MX_TAU); c.fill();
    }
    if (MX.flash[i] > 0.05 && on) { c.globalAlpha = MX.flash[i] * 0.7; c.drawImage(mxGlow(COL.lanes[i]), cx - r, cy - r, r * 2, r * 2); c.globalAlpha = 1; }
  });
}
// phone: the meter bridge – every channel a tiny glowing stem, the window shows which part of the rack is in view
function mxDrawBridge() {
  const B = MX.br;
  if (!B || !B.w) return;
  const V = mxVis(), c = mxFit(B.cv, B.w, B.h), w = B.w, hh = B.h, n = V.length, bw = (w - 8) / n, top = 6, bot = hh - 6;
  c.clearRect(0, 0, w, hh);
  c.fillStyle = 'rgba(240,230,216,.035)'; c.beginPath(); c.roundRect(0, 0, w, hh, 9); c.fill();
  const W2 = mxBridgeWin(), a = W2[0], b = W2[1];
  c.fillStyle = 'rgba(240,230,216,.07)'; c.strokeStyle = 'rgba(240,230,216,.22)'; c.lineWidth = 1;
  c.beginPath(); c.roundRect(4 + a * bw - 1, 1.5, (b - a) * bw + 2, hh - 3, 7); c.fill(); c.stroke();
  for (let i = 0; i < n; i++) {
    const cc = V[i], S = MX.ch[cc.k], L = S.lv, x = 4 + i * bw + bw / 2, sw = cc.kind === 'sum' ? 4 : 2.6;
    const p = Math.max(L.pk[0], L.pk[1]), y = bot - p * (bot - top);
    // the chosen channel's stem stands brighter
    c.fillStyle = cc.k === MX.sel ? 'rgba(240,230,216,.2)' : 'rgba(240,230,216,.08)'; c.fillRect(x - sw / 2, top, sw, bot - top);
    const col = cc.kind === 'puls' ? MXK['l' + L.dom] : cc;
    c.fillStyle = S.dorm ? 'rgba(118,106,97,.7)' : mxRgba(col.rgb, 0.9);
    if (p > 0.004) c.fillRect(x - sw / 2, y, sw, bot - y);
    if (!S.dorm && p > 0.05) { c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow(col.col), x - 7, y - 7, 14, 14); c.globalCompositeOperation = 'source-over'; }
    if (L.clip) { c.fillStyle = '#ff5b4d'; c.beginPath(); c.arc(x, top - 2.5, 1.8, 0, MX_TAU); c.fill(); }
    // under each stem: a lumen dot for a solo, a rose one for a mute – the forgotten solo is seen from anywhere
    const mid = mxMuteId(cc.k), sid = mxSoloId(cc.k), so = sid && P[sid], mu = mid && P[mid];
    if (so || mu) { c.fillStyle = so ? '#86f0d0' : '#ff8f9e'; c.beginPath(); c.arc(x, bot + 3.2, 1.9, 0, MX_TAU); c.fill(); }
  }
}
// the visible part of the rack in channel slots (the Summe column is always in view)
const MX_WIN = [0, 0];
function mxBridgeWin() {
  const sl = MX.scroll.scrollLeft, vr = sl + MX.vw - MX.sumW, V = mxVis();
  let a = -1, b = 0;
  for (let i = 0; i < V.length; i++) {
    const cc = V[i];
    if (cc.kind === 'sum') continue;
    const g = MX.ch[cc.k].g, f0 = clamp((sl - g.x) / g.w, 0, 1), f1 = clamp((vr - g.x) / g.w, 0, 1);
    if (f1 > f0) { if (a < 0) a = i + f0; b = i + f1; }
  }
  MX_WIN[0] = a < 0 ? 0 : a; MX_WIN[1] = b;
  return MX_WIN;
}
function mxBridgeGo(slot, smooth) {
  const V = mxVis(), i = clamp(Math.floor(slot), 0, V.length - 2), S = MX.ch[V[i].k];
  const x = S.g.x + S.g.w * (slot - i) - (MX.vw - MX.sumW) / 2;
  MX.scroll.scrollTo({ left: x, behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
}
// the channels the Pult shows ("Regen" only while it can sound or was set – see mxRgnSync)
const mxVis = () => MX.vis || MXC;
// "Regen" stands in the Pult only while it can sound (Gestik on, Neigen formt Sporenregen) or when the player set
// anything of it: a console that never rains keeps its eleven strips – they fit 1280 px and an iPad as before
const mxTouched = (k) => Object.keys(PD).some((id) => id.startsWith('x' + k + '.') && P[id] !== PD[id].d);
// (Hexenring: its strip likewise, from the first Schleife on)
function mxRgnSync() {
  let ch = false;
  for (const [k, gone] of [['rgn', !(GK.on && GK.p.neigen === 'regen') && !mxTouched('rgn')], ['hxr', !HX.loops.size && !mxTouched('hxr')]]) {
    const S = MX.ch[k];
    if (!S || !S.el || !!S.gone === gone) continue;
    S.gone = gone; S.el.classList.toggle('gone', gone); ch = true;
    if (gone && MX.sel === k) selectChannel('fin');
  }
  if (!ch) return;
  MX.vis = MXC.filter((c) => !MX.ch[c.k].gone);
  MX.dirtyStatic = true;
  if (MX.open) mxLayout();
}
function mxPultSelect(k) {
  for (const c of MXC) { const S = MX.ch[c.k]; if (S.el) S.el.classList.toggle('sel', c.k === k); }
}
// scroll a strip into view (when it was chosen elsewhere, e.g. from the Puls panel or the bridge)
function mxScrollTo(k, smooth) {
  const S = MX.ch[k];
  if (!S || !S.g || k === 'sum' || !MX.scroll) return;
  const sl = MX.scroll.scrollLeft, vis = MX.vw - MX.sumW, x = S.el.getBoundingClientRect().left - MX.row.getBoundingClientRect().left, w = S.el.offsetWidth;
  if (x >= sl && x + w <= sl + vis) return;
  MX.scroll.scrollTo({ left: x - (vis - w) / 2, behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
}

