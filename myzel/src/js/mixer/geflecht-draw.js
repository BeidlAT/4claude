/* ---------- the still layer: ground, scale, soil ---------- */
function mxgStatic() {
  const G = MXG, w = G.w, hh = G.h, sy = G.soilY, c = mxFit(G.cvS, w, hh);
  G.dirty = false;
  c.clearRect(0, 0, w, hh);
  c.fillStyle = '#130e0b'; c.fillRect(0, 0, w, hh);
  // warm light rising from the root, a cool breath up left
  let g = c.createRadialGradient(G.rootX, G.rootY, 0, G.rootX, G.rootY, Math.max(w, hh) * 0.85);
  g.addColorStop(0, 'rgba(255,179,92,.11)'); g.addColorStop(0.4, 'rgba(255,179,92,.03)'); g.addColorStop(1, 'rgba(255,179,92,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, hh);
  g = c.createRadialGradient(w * 0.08, 0, 0, w * 0.08, 0, w * 0.6);
  g.addColorStop(0, 'rgba(134,240,208,.035)'); g.addColorStop(1, 'rgba(134,240,208,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, hh);
  // quiet background mycelium: fine threads growing out of the soil, the same every time
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const walk = (x, y, a, n, wd, al) => {
    c.beginPath(); c.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      a += (rnd() - 0.5) * 0.55; x += Math.cos(a) * 4; y += Math.sin(a) * 4;
      c.lineTo(x, y);
      if (rnd() < 0.035 && n > 12) { c.strokeStyle = 'rgba(240,230,216,' + al + ')'; c.lineWidth = wd; c.stroke(); walk(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), (n - i) * 0.6, wd * 0.8, al * 0.85); c.beginPath(); c.moveTo(x, y); }
    }
    c.strokeStyle = 'rgba(240,230,216,' + al + ')'; c.lineWidth = wd; c.stroke();
  };
  c.lineCap = 'round';
  for (let i = 0, nW = Math.round(w / 16); i < nW; i++) walk(rnd() * w, sy + 4 + rnd() * 20, -Math.PI / 2 + (rnd() - 0.5) * 1.3, 14 + rnd() * 44, 0.6, 0.028);
  // the columns: a dotted thread where each light rises, and the Puls group's bracket over its four lanes
  c.setLineDash([1, 5]); c.lineWidth = 1; c.strokeStyle = 'rgba(240,230,216,.05)';
  c.beginPath();
  for (const C of G.cols) { if (C.hid) continue; const x = Math.round(C.cx) + 0.5; c.moveTo(x, G.yTop - 4); c.lineTo(x, sy - 2); }
  c.stroke(); c.setLineDash([]);
  // the scale: labels in the gutter, lines across the columns; 0 dB in spore light like the stems
  const marks = G.span > 330 ? [6, 0, -6, -12, -18, -24, -36, -48] : G.span > 230 ? [6, 0, -6, -12, -18, -24, -48] : [6, 0, -6, -12, -24, -48];
  c.font = '400 ' + (G.wide ? 9 : 8.5) + 'px ' + COL.fontNum; c.textAlign = 'right'; c.textBaseline = 'middle';
  let last = -99;
  for (const m of marks) {
    const y = Math.round(sy - mxPos(m) * G.span) + 0.5;
    c.strokeStyle = m === 0 ? 'rgba(255,179,92,.2)' : m === MXG_DET ? 'rgba(255,143,158,.12)' : 'rgba(240,230,216,.06)';
    c.setLineDash(m === 0 ? [] : m === MXG_DET ? [1, 3] : [2, 5]);
    c.beginPath(); c.moveTo(G.x0 - 2, y); c.lineTo(G.x1, y); c.stroke();
    if (Math.abs(y - last) < 11 || (G.short && m === 6)) continue;
    last = y;
    c.fillStyle = m === 0 ? 'rgba(255,179,92,.9)' : m === MXG_DET ? 'rgba(255,143,158,.6)' : 'rgba(168,153,138,.7)';
    c.fillText(m > 0 ? '+' + m : m === 0 ? '0' : MX_MINUS + -m, G.x0 - (G.wide ? 5 : 4), y);
  }
  c.setLineDash([]);
  const pc = G.cols[MXK.puls.i], l0 = G.cols[MXK.l0.i];
  c.strokeStyle = 'rgba(242,207,134,.32)'; c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(l0.cx, sy - 3.5); c.lineTo(pc.cx, sy - 3.5); c.stroke(); c.setLineDash([]);
  for (let i = 0; i < 4; i++) { const x = G.cols[MXK['l' + i].i].cx; c.beginPath(); c.moveTo(x, sy - 6); c.lineTo(x, sy - 1); c.stroke(); }
  // the soil
  g = c.createLinearGradient(0, sy - 10, 0, hh);
  g.addColorStop(0, 'rgba(46,32,22,0)'); g.addColorStop(0.18, 'rgba(46,32,22,.5)'); g.addColorStop(1, 'rgba(24,16,11,.92)');
  c.fillStyle = g; c.fillRect(0, sy - 10, w, hh - sy + 10);
  for (let i = 0, nS = w * 0.8; i < nS; i++) { c.fillStyle = 'rgba(240,230,216,' + (0.02 + rnd() * 0.05).toFixed(3) + ')'; c.fillRect(rnd() * w, sy + rnd() * (hh - sy), 1, 1); }
  for (let i = 0; i < 18; i++) walk(rnd() * w, sy + 6 + rnd() * (hh - sy - 6), (rnd() - 0.5) * 0.6 + (rnd() < 0.5 ? 0 : Math.PI), 8 + rnd() * 18, 0.5, 0.045);
  c.beginPath();
  for (let x = 0; x <= w; x += 4) { const y = sy + Math.sin(x * 0.045) * 1.2 + Math.sin(x * 0.13 + 1) * 0.6; x ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = 'rgba(240,230,216,.17)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(168,153,138,.55)'; c.textAlign = 'right'; c.fillText(MX_MINUS + '∞', G.x0 - 5, sy);
  // roots under the Summe, and what the knot is
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 6)), L = G.rootR * (1.1 + rnd() * 0.5);
    c.beginPath(); c.moveTo(G.rootX + Math.cos(a) * G.rootR * 0.8, G.rootY + Math.sin(a) * G.rootR * 0.8);
    c.quadraticCurveTo(G.rootX + Math.cos(a) * L, G.rootY + Math.sin(a) * L * 0.6 + 4, G.rootX + Math.cos(a) * L * 1.15, hh);
    c.strokeStyle = 'rgba(255,214,170,.07)'; c.lineWidth = 0.8; c.stroke();
  }
  const disp = getComputedStyle(MX.root).getPropertyValue('--font-display');
  c.font = '400 ' + (G.wide ? 10 : 9) + 'px ' + disp; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  if (!G.short) { c.fillStyle = 'rgba(255,179,92,.72)'; c.fillText('kette', G.kx + (G.wide ? 13 : 10), G.ky - (G.wide ? 9 : 7)); }
  if (G.wide && !G.short) { c.fillStyle = 'rgba(240,230,216,.4)'; c.fillText('direkt', G.kx + (G.wide ? 13 : 10), G.dyy + (G.wide ? 15 : 12)); }
}

/* ---------- the live layer ---------- */
const MXG_NP = MOBILE ? 110 : 200;
const MXGP = { k: new Int8Array(MXG_NP).fill(-1), d: new Float32Array(MXG_NP), v: new Float32Array(MXG_NP), s: new Float32Array(MXG_NP), f: new Uint8Array(MXG_NP) };
function mxgSpawn(i, pulse) {
  for (let j = 0; j < MXG_NP; j++) {
    if (MXGP.k[j] >= 0) continue;
    MXGP.k[j] = i; MXGP.d[j] = 0; MXGP.f[j] = pulse ? 1 : 0;
    MXGP.v[j] = pulse ? 240 : 40 + Math.random() * 34; MXGP.s[j] = pulse ? 1.6 : 0.7 + Math.random() * 0.6;
    return;
  }
}
// spore dust: a few motes rise from a spore when its lane strikes (a small fixed pool, nothing allocated per frame)
const MXG_ND = 48;
const MXGD = { i: new Int8Array(MXG_ND).fill(-1), x: new Float32Array(MXG_ND), y: new Float32Array(MXG_ND), vx: new Float32Array(MXG_ND), vy: new Float32Array(MXG_ND), t: new Float32Array(MXG_ND), s: new Float32Array(MXG_ND) };
// a Puls hit: a pulse of light runs down the lane's hypha, a ring leaves its spore, dust rises from it
function mxgPulse(k) {
  const C = mxgCol(k);
  if (!C || !C.fn) return;
  mxgSpawn(C.i, true);
  if (MXG.rip.length < 12) MXG.rip.push({ i: C.i, t: 0 });
  for (let n = 0, j = 0; n < 3 && j < MXG_ND; j++) {
    if (MXGD.i[j] >= 0) continue;
    MXGD.i[j] = C.i; MXGD.x[j] = C.x; MXGD.y[j] = C.y; MXGD.vx[j] = (Math.random() - 0.5) * 24; MXGD.vy[j] = -12 - Math.random() * 22;
    MXGD.t[j] = 0; MXGD.s[j] = 1.2 + Math.random() * 1.4; n++;
  }
}
function mxgFrame(dt, ts) {
  const G = MXG;
  if (!G.w) { mxgLayout(); if (!G.w) return; }
  if (G.geo) mxgGeo();
  if (G.dirty) mxgStatic();
  const t = ts / 1000;
  mxgDraw(dt, t);
  if (t - G.numT > 0.125) { G.numT = t; mxgNumbers(t); mxgBar(); }
}
function mxgDraw(dt, t) {
  const G = MXG, w = G.w, hh = G.h, sy = G.soilY, c = mxFit(G.cvL, w, hh, 0, MX_LDPR()), sel = MX.sel, hov = G.hov;
  c.clearRect(0, 0, w, hh);
  c.lineCap = 'round';
  // the chosen column (and the one under the mouse) stands out a little
  mxgLight(c, sel, 1);
  if (hov && hov !== sel) mxgLight(c, hov, 0.55);
  if (G.grab && G.grab.k !== sel && G.grab.k !== hov) mxgLight(c, G.grab.k, 0.8);
  mxgSoil(c, t);
  // signal: spores of light flow down every hypha with the level, Puls hits run as bright pulses
  if (!REDUCED) {
    for (const C of G.cols) {
      if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
      if (C.c.kind === 'puls' || !C.fn) continue;
      const S = MX.ch[C.k];
      if (!S.dorm && Math.random() < S.lv.lvl * dt * (G.wide ? 8 : 6)) mxgSpawn(C.i, false);
    }
    c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < MXG_NP; j++) {
      const i = MXGP.k[j];
      if (i < 0) continue;
      const C = G.cols[i];
      MXGP.d[j] += MXGP.v[j] * dt;
      const p = (MXGP.d[j] / MXG_STEP) | 0;
      if (p >= C.fn) { MXGP.k[j] = -1; continue; }
      const x = C.flow[2 * p], y = C.flow[2 * p + 1], left = (C.fn - p) * MXG_STEP, f = MXGP.f[j];
      const s = f ? 12 : MXGP.s[j] > 1 ? 5.5 : 4.2;
      c.globalAlpha = Math.min(1, MXGP.d[j] / 10, left / 24) * (f ? 1 : 0.8);
      c.drawImage(mxGlow(f ? '#fff0de' : C.c.col), x - s, y - s, s * 2, s * 2);
      c.fillStyle = f ? '#fff6ea' : C.c.c1;
      c.fillRect(x - MXGP.s[j] * 0.6, y - MXGP.s[j] * 0.6, MXGP.s[j] * 1.2, MXGP.s[j] * 1.2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  mxgRoot(c);
  mxgAir(c, dt, t);
}
function mxgLight(c, k, a) {
  const G = MXG, C = MXK[k] && mxgCol(k);
  if (!C) return;
  c.fillStyle = C.hl; c.globalAlpha = a;
  c.fillRect(C.cx - C.cw / 2 + 1, G.yTop - 10, C.cw - 2, G.tagEnd - G.yTop + 10);
  c.globalAlpha = 1;
}
// underground: hyphae, the chain's trunk, send threads, the knot, Echo's rings and Hall's cloud
function mxgSoil(c, t) {
  const G = MXG, sy = G.soilY, sel = MX.sel, hov = G.hov;
  let chain = 0;
  for (const C of G.cols) if (!C.hid && C.fx && !MX.ch[C.k].dorm) chain = Math.max(chain, MX.ch[C.k].lv.lvl);
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = mxgA(MXG_WARM, 0.05 + 0.1 * chain); c.lineWidth = 4 + 7 * chain; c.stroke(G.trunk);
  c.strokeStyle = mxgA(MXG_WARM, 0.25 + 0.45 * chain); c.lineWidth = 1.1 + 2 * chain; c.stroke(G.trunk);
  for (const C of G.cols) {
    if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
    if (C.c.kind === 'puls') continue;
    const S = MX.ch[C.k], L = S.lv, lv = L.lvl;
    if (S.dorm) {
      c.globalCompositeOperation = 'source-over'; c.setLineDash([2, 4]);
      c.strokeStyle = 'rgba(168,153,138,.2)'; c.lineWidth = 0.8; c.stroke(C.hy);
      c.setLineDash([]); c.globalCompositeOperation = 'lighter';
      continue;
    }
    // Pumpen squeezes the hypha: thinner while its channel is pulled down, a rose ring where it pinches
    const d = L.gr > 0.05 ? 1 - Math.pow(10, -L.gr / 20) : 0, sq = 1 - 0.8 * d, foc = C.k === sel || C.k === hov;
    c.strokeStyle = mxgA(C.al, 0.04 + 0.1 * lv); c.lineWidth = (4 + 7 * lv) * sq; c.stroke(C.hy);
    c.strokeStyle = mxgA(C.al, 0.28 + 0.45 * lv + (foc ? 0.12 : 0)); c.lineWidth = (0.8 + 1.8 * lv) * sq + 0.3; c.stroke(C.hy);
  }
  // send threads: dashed and as thick as send × level; bright only for the chosen (or hovered) channel
  for (const C of G.cols) {
    if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
    if (!C.snd || MX.ch[C.k].dorm) continue;
    const lv = MX.ch[C.k].lv.lvl, foc = C.k === sel || C.k === hov;
    for (let j = 0; j < MXG_SND.length; j++) {
      const fx = MXG_SND[j], amt = P[C.sid[j]] * P[fx + '.mix'];
      if (amt < 0.01 || MX.ch[fx].dorm) continue;
      const a = Math.min(1, amt);
      c.setLineDash(MXG_DASH[j] || MXG_DASH[0]); c.lineDashOffset = REDUCED ? 0 : -t * (10 + 24 * lv);
      c.strokeStyle = mxgA(C.al, foc ? 0.32 + 0.5 * a : 0.05 + 0.1 * a);
      c.lineWidth = 0.5 + 2.4 * Math.min(1, amt * (0.25 + 0.75 * lv)) * (foc ? 1 : 0.7);
      c.stroke(C.snd[j]);
    }
  }
  // the returns into the hall: Echo at 0,3 of its knob, an effect at all of it (while anything is sent into it)
  for (const r in G.toH) {
    const eh = r === 'dly' ? P['xdly.rev'] * 0.3 : P[r + '.mix'] > 0 ? P['x' + r + '.rev'] : 0;
    if (eh > 0.005 && !MX.ch[r].dorm && !MX.ch.rev.dorm) { c.setLineDash([3, 4]); c.lineDashOffset = REDUCED ? 0 : -t * 14; c.strokeStyle = mxgA(G.cols[MXK[r].i].al, 0.12 + 0.5 * Math.min(1, eh)); c.lineWidth = 0.6 + 1.6 * Math.min(1, eh); c.stroke(G.toH[r]); }
  }
  c.setLineDash([]); c.lineDashOffset = 0;
  // the knot: five beads for Verzerrung, Ring, Filter, Phaser, Schweben – lit while they work
  const ks = (G.wide ? 14 : 10) + (G.wide ? 20 : 13) * chain;
  c.globalAlpha = 0.4 + 0.6 * chain; c.drawImage(mxGlow('#ffd9a8'), G.kx - ks, G.ky - ks, ks * 2, ks * 2); c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  const on = [P['drv.mix'] > 0, P['rng.mix'] > 0, true, P['pha.mix'] > 0, P['cho.mix'] > 0], br = G.wide ? 7 : 5.2;
  for (let j = 0; j < 5; j++) {
    const a = -Math.PI / 2 + j * MX_TAU / 5, x = G.kx + Math.cos(a) * br, y = G.ky + Math.sin(a) * br;
    c.fillStyle = '#17110e'; c.beginPath(); c.arc(x, y, G.wide ? 2.6 : 2.1, 0, MX_TAU); c.fill();
    c.strokeStyle = on[j] ? 'rgba(255,179,92,.9)' : 'rgba(255,179,92,.3)'; c.lineWidth = 1; c.stroke();
  }
  c.fillStyle = mxgA(MXG_WARM, 0.5 + 0.5 * chain); c.beginPath(); c.arc(G.kx, G.ky, 1.6, 0, MX_TAU); c.fill();
  // Echo: rings running outwards; Hall: a slow cloud
  c.globalCompositeOperation = 'lighter';
  const E = MX.ch.dly, EC = G.cols[MXK.dly.i], elv = E.lv.lvl, ph = REDUCED ? 0.5 : (t * 0.9) % 1, sc = G.wide ? 1 : 0.72;
  c.globalAlpha = E.dorm ? 0.12 : 0.3 + 0.6 * elv; c.drawImage(mxGlow(EC.c.col), G.ex - 22 * sc, G.ey - 22 * sc, 44 * sc, 44 * sc);
  c.lineWidth = 1; c.strokeStyle = EC.c.col;
  for (let k = 0; k < 3; k++) {
    const q = (k + ph) / 3;
    c.globalAlpha = (E.dorm ? 0.18 : 0.28 + 0.6 * elv) * (1 - q);
    c.beginPath(); c.arc(G.ex, G.ey, (3 + q * 13) * sc + 1, 0, MX_TAU); c.stroke();
  }
  c.globalAlpha = 1; c.fillStyle = EC.c.col; c.beginPath(); c.arc(G.ex, G.ey, 2, 0, MX_TAU); c.fill();
  const H = MX.ch.rev, HC = G.cols[MXK.rev.i], hlv = H.lv.lvl, spr = mxGlow(HC.c.col), hs = G.wide ? 1 : 0.85;
  c.globalAlpha = H.dorm ? 0.12 : 0.3 + 0.6 * hlv; c.drawImage(spr, G.hx - 22 * sc, G.hy - 22 * sc, 44 * sc, 44 * sc);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996 + (REDUCED ? 0 : t * (0.12 + (i % 3) * 0.05)), rad = (2.5 + ((i * 37) % 11) * (1 + hlv * 0.25)) * hs, x = G.hx + Math.cos(a) * rad, y = G.hy + Math.sin(a) * rad * 0.8, s = (2 + (i % 4) * 0.7) * hs;
    c.globalAlpha = (H.dorm ? 0.15 : 0.35 + 0.6 * hlv) * (0.55 + 0.45 * Math.sin(i + t * 0.7));
    c.drawImage(spr, x - s * 1.8, y - s * 1.8, s * 3.6, s * 3.6);
    c.fillStyle = HC.c.c1; c.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
  }
  // the effect returns: a sprouting star each – rays that grow with its level and turn slowly, a bright seed
  FX_RETS.forEach(([r], j) => {
    const X = MX.ch[r], XC = G.cols[MXK[r].i], lv = X.lv.lvl, [x, y] = G.nd[r], n = j ? 5 : 6, rot = REDUCED ? 0 : t * (j ? -0.25 : 0.2);
    c.globalAlpha = X.dorm ? 0.12 : 0.25 + 0.6 * lv; c.drawImage(mxGlow(XC.c.col), x - 20 * sc, y - 20 * sc, 40 * sc, 40 * sc);
    c.strokeStyle = XC.c.col; c.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const a = rot + i * MX_TAU / n, L = (4 + (6 + 5 * Math.sin(i * 1.7 + t * 1.3 * !REDUCED)) * (0.35 + 0.65 * lv)) * sc;
      c.globalAlpha = X.dorm ? 0.16 : 0.3 + 0.6 * lv;
      c.beginPath(); c.moveTo(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5); c.lineTo(x + Math.cos(a) * (2.5 + L), y + Math.sin(a) * (2.5 + L)); c.stroke();
      c.fillStyle = XC.c.col; c.beginPath(); c.arc(x + Math.cos(a) * (2.5 + L), y + Math.sin(a) * (2.5 + L), 1.1, 0, MX_TAU); c.fill();
    }
    c.globalAlpha = 1; c.fillStyle = XC.c.col; c.beginPath(); c.arc(x, y, 2, 0, MX_TAU); c.fill();
  });
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
const MXG_DASH = [[1.5, 4], [4, 4], [6, 3, 1, 3], [2, 2, 2, 5]];   // a send thread's dash, per return (MXG_SND)
// the root: a dark hollow where the hyphae end; the fruiting body glows in it (its canvas lies on top)
function mxgRoot(c) {
  const G = MXG, x = G.rootX, y = G.rootY, R = G.rootR, L = MX.ch.sum.lv;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.6 * L.lvl;
  c.drawImage(mxGlow('#ffd9a8'), x - R * 1.7, y - R * 1.7, R * 3.4, R * 3.4);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#110c0a'; c.beginPath(); c.arc(x, y, R + 1, 0, MX_TAU); c.fill();
  c.strokeStyle = 'rgba(255,214,170,.14)'; c.lineWidth = 1; c.stroke();
}
// where the fruiting body's canvas belongs now: the band while it shows it, else the Geflecht's root
function mxgRootHome() {
  const G = MXG, F = MX.fk, inField = MX.open && MX.view === 'geflecht' && G.w && !F.el.clientWidth;
  if (inField) { if (F.co.parentNode !== G.root) G.root.append(F.co); mxFkSize(G.rootD); }
  else if (F.co.parentNode !== F.el) { F.el.append(F.co); mxFkSize(Math.round(F.el.clientWidth)); }
}
// above the soil: each column's stem, its light, its spore
function mxgAir(c, dt, t) {
  const G = MXG, sy = G.soilY, span = G.span, sel = MX.sel, hov = G.hov, pd = G.pd;
  // stems first, then the light, then the spores, so nothing of a neighbour ever covers a spore
  for (const C of G.cols) {
    if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
    const S = MX.ch[C.k], L = S.lv;
    if (C.off) continue;
    c.strokeStyle = L.clip ? 'rgba(255,91,77,.85)' : S.dorm ? 'rgba(168,153,138,.28)' : mxgA(C.al, 0.24 + 0.3 * L.lvl + (C.k === sel ? 0.18 : 0));
    c.lineWidth = L.clip ? 1.7 : C.k === sel ? 1.3 : 1;
    if (S.dorm && !L.clip) c.setLineDash([2, 3]);
    c.stroke(C.stem);
    c.setLineDash([]);
    // Pumpen pulls the channel down: its stem blushes rose (the bar beside its light follows below)
    const d = C.c.kind !== 'sum' && L.gr > 0.05 && !S.dorm ? 1 - Math.pow(10, -L.gr / 20) : 0;
    if (d > 0.03) { c.strokeStyle = mxgA(MXG_ROSE, Math.min(0.6, d)); c.lineWidth = 1.2; c.stroke(C.stem); }
  }
  c.globalCompositeOperation = 'lighter';
  for (const C of G.cols) {
    if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
    const S = MX.ch[C.k], L = S.lv, dorm = S.dorm, kind = C.c.kind;
    const src = kind === 'puls' ? G.cols[MXK['l' + L.dom].i] : C, bw = kind === 'sum' ? G.bwS : G.bw, gap = G.gap, x0 = C.cx - bw - gap / 2;
    let top = sy;
    for (let s = 0; s < 2; s++) {
      const lx = x0 + s * (bw + gap), yr = sy - L.rms[s] * span, yp = sy - L.pk[s] * span;
      if (L.rms[s] > 0.004) { c.fillStyle = dorm ? G.gradD : src.grad; c.fillRect(lx, yr, bw, sy - yr); if (yr < top) top = yr; }
      if (L.pk[s] > 0.004) {
        if (yp < yr - 1) { c.fillStyle = dorm ? 'rgba(150,138,128,.3)' : src.c.c55; c.fillRect(lx + bw / 2 - 0.5, yp, 1, yr - yp); }
        c.fillStyle = dorm ? 'rgba(160,150,140,.6)' : L.pk[s] > 0.8 ? '#ff7b6b' : 'rgba(255,248,236,.95)';
        c.fillRect(lx - 0.5, yp - 0.6, bw + 1, 1.2);
      }
      if (L.hp[s] > 0.01) {
        c.fillStyle = dorm ? 'rgba(170,160,150,.7)' : L.hp[s] > 0.8 ? '#ff5b4d' : 'rgba(255,248,236,.9)';
        c.beginPath(); c.arc(lx + bw / 2, sy - L.hp[s] * span, kind === 'sum' ? 1.7 : 1.3, 0, MX_TAU); c.fill();
      }
    }
    if (top < sy - 3 && !dorm) { const s = G.wide ? 34 : 24; c.globalAlpha = 0.7; c.drawImage(mxGlow(src.c.col), C.cx - s / 2, top - s / 2, s, s); c.globalAlpha = 1; }
    // Pumpen (or the Summe's compressor): a rose bar hanging from 0 dB beside the light, as on the Pult's stems
    if (L.gr > 0.2 && !dorm) {
      const y0 = sy - 0.8 * span, len = Math.min(1, L.gr / 24) * span * 0.45, x = C.cx + bw + gap / 2 + 3;
      c.fillStyle = 'rgba(255,143,158,.2)'; c.fillRect(x - 1, y0, 4, len);
      c.fillStyle = 'rgba(255,143,158,.92)'; c.fillRect(x, y0, 2, len);
    }
  }
  c.globalCompositeOperation = 'source-over';
  // a/b while the morph is in use: where A and B put each spore (strong for the chosen one)
  if (MX.ghost) mxgGhosts(c);
  for (const C of G.cols) if (!C.hid) mxgSpore(c, C, C.k === sel, C.k === hov || C === G.grab, t);
  // dust rising from the struck spores
  if (!REDUCED) {
    c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < MXG_ND; j++) {
      const i = MXGD.i[j];
      if (i < 0) continue;
      MXGD.t[j] += dt;
      if (MXGD.t[j] > 1.4) { MXGD.i[j] = -1; continue; }
      MXGD.x[j] += MXGD.vx[j] * dt; MXGD.y[j] += MXGD.vy[j] * dt; MXGD.vx[j] *= 0.985; MXGD.vy[j] -= 5 * dt;
      const sz = MXGD.s[j], C = G.cols[i];
      c.globalAlpha = (1 - MXGD.t[j] / 1.4) * 0.8;
      c.drawImage(mxGlow(C.c.col), MXGD.x[j] - sz * 2.5, MXGD.y[j] - sz * 2.5, sz * 5, sz * 5);
      c.fillStyle = C.c.c1; c.fillRect(MXGD.x[j] - sz * 0.4, MXGD.y[j] - sz * 0.4, sz * 0.8, sz * 0.8);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  // ripples of the Puls hits
  if (G.rip.length) {
    c.lineWidth = 1.2;
    for (let i = G.rip.length - 1; i >= 0; i--) {
      const q = G.rip[i], C = G.cols[q.i];
      q.t += dt;
      if (q.t > 0.75) { G.rip.splice(i, 1); continue; }
      const k = q.t / 0.75;
      c.strokeStyle = mxgA(C.al, (1 - k) * 0.42);
      c.beginPath(); c.arc(C.x, C.y, C.r + 4 + (G.wide && !G.short ? 20 : 12) * (1 - Math.pow(1 - k, 2.4)), 0, MX_TAU); c.stroke();
    }
  }
  // the chosen spore: a thread to the scale, its level in the gutter, its balance under it
  const C = mxgCol(sel);
  if (C) {
    const y = C.y, dragged = pd && pd.on && pd.C === C;
    c.strokeStyle = mxgA(C.al, dragged ? 0.6 : 0.35); c.lineWidth = 1; c.setLineDash([1.5, 3]);
    c.beginPath(); c.moveTo(G.x0 - 2, y); c.lineTo(C.x - C.r - 7, y); c.stroke(); c.setLineDash([]);
    const txt = C.off ? MX_MINUS + '∞' : mxDbTxt(P[mxVolId(C.k)]);
    c.font = G.fTag; c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText(txt).width + 8, tx = Math.max(1, G.x0 - 3 - tw);
    c.fillStyle = C.c.col; c.beginPath(); c.roundRect(tx, y - 7.5, tw, 15, 7.5); c.fill();
    c.fillStyle = '#140f0c'; c.fillText(txt, tx + tw / 2, y + 0.5);
    if (C.pr && !C.off) {
      const ry = y + C.r + (G.wide ? 9 : 7);
      c.strokeStyle = mxgA(C.al, 0.45); c.beginPath(); c.moveTo(C.cx - C.pr, ry); c.lineTo(C.cx + C.pr, ry); c.moveTo(C.cx, ry - 2.5); c.lineTo(C.cx, ry + 2.5); c.stroke();
      c.fillStyle = C.c.col; c.beginPath(); c.arc(C.x, ry, 1.8, 0, MX_TAU); c.fill();
    }
  }
  // resting on the soil's edge: the ring fills while the finger holds, then the spore sinks in
  if (pd && pd.push) {
    const q = clamp((performance.now() - pd.push) / 560, 0, 1), P2 = pd.C;
    c.strokeStyle = 'rgba(255,143,158,.9)'; c.lineWidth = 2;
    c.beginPath(); c.arc(P2.x, P2.y, P2.r + 8, -Math.PI / 2, -Math.PI / 2 + q * MX_TAU); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.5 * q;
    c.drawImage(mxGlow('#ff8f9e'), P2.cx - 30, sy - 12, 60, 24);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
}
function mxgSpore(c, C, isSel, isHov, t) {
  const G = MXG, S = MX.ch[C.k], L = S.lv, lv = L.lvl, dorm = S.dorm, kind = C.c.kind, sy = G.soilY;
  const big = G.wide && !G.short, r = C.r = (big ? 7.4 : 4.6) * (kind === 'sum' ? 1.3 : 1) + (REDUCED ? 0.5 : 1) * (big ? 4.6 : 3) * lv;
  const x = C.x, y = C.y;
  if (C.off) { c.save(); c.beginPath(); c.rect(C.cx - C.cw / 2, 0, C.cw, sy - 0.5); c.clip(); }
  if (dorm) {
    c.fillStyle = '#2a221d'; c.beginPath(); c.arc(x, y, r, 0, MX_TAU); c.fill();
    c.strokeStyle = 'rgba(168,153,138,.6)'; c.lineWidth = 1.2; c.setLineDash([2, 2.5]);
    c.beginPath(); c.arc(x, y, r + 1.5, 0, MX_TAU); c.stroke(); c.setLineDash([]);
  } else if (C.srcoff && kind !== 'ret') {
    // its source plays nothing (Ebene 2, a lane or the Bordun switched off): a hollow spore
    c.fillStyle = '#17110e'; c.beginPath(); c.arc(x, y, r, 0, MX_TAU); c.fill();
    c.strokeStyle = mxgA(C.al, 0.75); c.lineWidth = 1.3; c.stroke();
  } else {
    const gs = (big ? 22 : 12) + (big ? 40 : 22) * lv;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 + 0.7 * lv;
    c.drawImage(mxGlow(C.c.col), x - gs, y - gs, gs * 2, gs * 2);
    c.globalAlpha = 1;
    c.drawImage(mxgCore(C.c.col), x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = mxgA(C.al, 0.55); c.lineWidth = 1; c.beginPath(); c.arc(x, y, r + 3, 0, MX_TAU); c.stroke();
  }
  // the Puls group: a little fairy ring of its four lanes, each lighting on its own beat
  if (kind === 'puls') {
    const rr = r + (G.wide ? 6 : 4.5);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 2 + (REDUCED ? 0 : t * 0.25), fl = MX.flash[i], q = G.cols[MXK['l' + i].i];
      c.fillStyle = dorm ? 'rgba(168,153,138,.5)' : mxgA(q.al, 0.55 + 0.45 * fl);
      c.beginPath(); c.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, (G.wide ? 2.2 : 1.7) + fl * 1.4, 0, MX_TAU); c.fill();
    }
  }
  if (C.off) c.restore();
  // latched clip: a red halo until the column is tapped
  if (L.clip) {
    c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow('#ff5b4d'), x - r - 14, y - r - 14, (r + 14) * 2, (r + 14) * 2); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#ff5b4d'; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r + 5.5, 0, MX_TAU); c.stroke();
  }
  if (isSel) {
    c.strokeStyle = mxgA(C.al, 0.75); c.lineWidth = 1; c.setLineDash([1.5, 3]);
    c.beginPath(); c.arc(x, y, r + (kind === 'puls' ? 11 : 8) + (REDUCED ? 0 : Math.sin(t * 2.4) * 1.1), 0, MX_TAU); c.stroke(); c.setLineDash([]);
  } else if (isHov) {
    c.strokeStyle = mxgA(C.al, 0.4); c.lineWidth = 1; c.beginPath(); c.arc(x, y, r + 7, 0, MX_TAU); c.stroke();
  }
}
// snapshot ghosts in the field: a and b and the way between, strong only for the chosen (or hovered) spore
function mxgGhosts(c) {
  const G = MXG, a = MX.snap.a, b = MX.snap.b, sy = G.soilY;
  c.font = G.fGhost; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const C of G.cols) {
    if (C.hid) continue;   // (an Ebene the Pult does not show – mxgLayout)
    const vid = mxVolId(C.k), pid = C.pid, hp = mxgHasPan(C);
    if (a[vid] === b[vid] && (!hp || a[pid] === b[pid])) continue;
    const xa = C.cx + (hp ? a[pid] : 0) * C.pr, ya = sy - mxPos(a[vid]) * G.span, xb = C.cx + (hp ? b[pid] : 0) * C.pr, yb = sy - mxPos(b[vid]) * G.span;
    c.globalAlpha = C.k === MX.sel || C.k === G.hov ? 1 : 0.3;
    c.strokeStyle = mxgA(C.al, 0.6); c.lineWidth = 1; c.setLineDash([1.5, 3.5]);
    c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#ffb35c'; c.beginPath(); c.arc(xa, ya, 3.5, 0, MX_TAU); c.stroke();
    c.fillStyle = '#86f0d0'; c.beginPath(); c.arc(xb, yb, 2.8, 0, MX_TAU); c.fill();
    c.fillStyle = '#ffb35c'; c.fillText('a', xa + 8, ya - 6);
    c.fillStyle = '#86f0d0'; c.fillText('b', xb + 8, yb - 6);
  }
  c.globalAlpha = 1;
}

/* ---------- the corner readouts ---------- */
function mxgNumbers(t) {
  const G = MXG, R = G.ro, Lz = A.lufs, sl = MX.ch.sum.lv, mm = A.mm;
  const s = Lz ? Lz.s : -Infinity, m = Lz ? Lz.m : -Infinity, i = Lz ? Lz.i : -Infinity, cr = Lz ? Lz.corr : 1;
  const pk = sl.max, pdb = pk > 0.001 ? 20 * Math.log10(pk) : -Infinity, v = P['mst.vol'], gr = sl.gr;
  const short = G.short;
  mxgSet(R.tl.b, mxLufsTxt(s), mxLoudCls(s));
  mxgSet(R.tl.s, short ? '' : ' · M ' + mxLufsTxt(m) + ' · Ziel ' + MX_MINUS + Math.abs(MX.tgt));
  mxgSet(R.tr.b, mxDbTxt(v) + (G.wide ? ' dB' : ''));
  mxgSet(R.tr.s, short ? '' : G.wide ? ' · Verdichtung ' : ' · Verd. ');
  mxgSet(R.tr.v, short ? '' : mxGrTxt(gr), mxGrCls(gr));
  mxgSet(R.bl.b, mxLufsTxt(i), mxLoudCls(i));
  mxgSet(R.bl.s, ' · Spitze ');
  mxgSet(R.bl.v, pk > 0.001 ? mxDbTxt(pdb) + ' dB' : MX_MINUS + '∞', pdb >= -0.1 ? 'over' : pdb > -1 ? 'hot' : '');
  const crr = mxCorr(cr, s);
  mxgSet(R.br.b, crr.t, crr.cls);
  if (G.wide) {
    const bal = mm && mm.rms[0] > 1e-8 && mm.rms[1] > 1e-8 ? 10 * Math.log10(mm.rms[0] / mm.rms[1]) : 0;
    mxgSet(R.br.s, ' · Balance ' + (!(s > -70) ? '—' : Math.abs(bal) < 0.3 ? 'Mitte' : (bal > 0 ? 'L ' : 'R ') + dec(Math.abs(bal).toFixed(1)) + ' dB'));
  } else mxgSet(R.br.s, '');
  // the same in words, about once a second, for screen readers
  if (t - G.ariaT > 1) {
    G.ariaT = t;
    G.roBox.setAttribute('aria-label', 'Lautheit kurz ' + mxLufsTxt(s) + ' LUFS, integriert ' + mxLufsTxt(i) + ', Spitze ' + R.bl.v.textContent + ', Korrelation ' + R.br.b.textContent + ', Summe ' + mxDbTxt(v) + ' dB, Verdichtung ' + (gr > 0.05 ? MX_MINUS + dec(gr.toFixed(1)) : '0') + ' dB');
  }
}

