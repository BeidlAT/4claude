// Sphärenwerk – die kleinen Anzeigen auf den Organen (Glasfenster in den Messingplatten).
'use strict';

const PAL = {};
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['night', 'night-2', 'brass', 'brass-hi', 'ivory', 'mist', 'amber', 'verdigris', 'violet', 'cinnabar', 'glass']) PAL[k] = cs.getPropertyValue('--' + k).trim() || '#888';
}

function hexA(hex, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

const Displays = {
  visible(v) {
    const s = Werk.s, x = v.x * s + Werk.tx, y = v.y * s + Werk.ty;
    return x < Werk.W && x + 248 * s > 0 && y < Werk.H && y + 328 * s > 0 && !v.flipped;
  },
  prep(v) {
    const cv = v.cv, w = cv.clientWidth, hh = cv.clientHeight;
    const k = Math.min(2, window.devicePixelRatio || 1) * Math.max(1, Math.min(1.6, Werk.s));
    const W = Math.round(w * k), H = Math.round(hh * k);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    return { ctx, w, h: hh };
  },
  draw(v, t) {
    const fn = this[v.def.display];
    if (!fn || !v.cv.clientWidth) return;
    const c = this.prep(v);
    fn.call(this, c.ctx, c.w, c.h, v, VIS.mods.get(v.id), t / 1000, Machine.mod(v.id));
  },
  sk() { if (!this._skv || this._skv !== Machine.st.skala) { this._sk = Skala.build(Machine.st.skala); this._skv = Machine.st.skala; } return this._sk; },
  // x-Position eines Tons auf einer logarithmischen Achse über okt Oktaven ab Grundton in Oktave o0
  lx(hz, w, o0, okt) { const sk = this.sk(); return Math.log2(hz / (sk.root0 * Math.pow(2, o0))) / okt * w; },
  grid(ctx, w, y0, y1, o0, okt, alpha) {
    const sk = this.sk();
    for (const l of Skala.lines(sk, sk.root0 * Math.pow(2, o0), sk.root0 * Math.pow(2, o0 + okt))) {
      const x = this.lx(l.hz, w, o0, okt);
      ctx.strokeStyle = hexA(Skala.degree(l.deg).color, (l.root ? 0.55 : 0.22) * alpha);
      ctx.lineWidth = l.root ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }
  },
  // weicher Lichtfleck aus einem vorgerenderten Bild (keine neuen Verläufe pro Bild)
  glow(ctx, x, y, r, col, a) {
    if (!(a > 0.003) || !(r > 0.5)) return;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(Pad.sprite(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = prev;
  },
  label(ctx, text, x, y, align, col) {
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = col || hexA(PAL.ivory, 0.62);
    ctx.fillText(text, x, y);
  },

  sphere(ctx, w, h, v, vs) {
    const d = vs ? vs.dv : null, L = d ? d[0] : 0, R = d ? d[1] : 0, gr = d ? d[2] : 1;
    const cx = w / 2, cy = h / 2, lv = Math.max(L, R), r0 = h * 0.3;
    this.glow(ctx, cx, cy, r0 * (1.6 + lv * 1.6), PAL.amber, 0.12 + lv * 0.5);
    const g = ctx.createRadialGradient(cx - r0 * 0.3, cy - r0 * 0.35, r0 * 0.1, cx, cy, r0);
    g.addColorStop(0, '#fff3d0'); g.addColorStop(0.35, hexA(PAL.amber, 0.9)); g.addColorStop(1, hexA('#7a3d10', 0.85));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r0 * (0.86 + lv * 0.18), 0, TAU); ctx.fill();
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [lvl, a0, dir] of [[L, Math.PI * 0.62, 1], [R, Math.PI * 0.38, -1]]) {
      ctx.strokeStyle = hexA(PAL.brass, 0.25); ctx.beginPath(); ctx.arc(cx, cy, r0 + 9, a0, a0 + dir * Math.PI * 0.8 * 1, dir < 0); ctx.stroke();
      ctx.strokeStyle = lvl > 0.9 ? PAL.cinnabar : PAL['brass-hi'];
      ctx.beginPath(); ctx.arc(cx, cy, r0 + 9, a0, a0 + dir * Math.PI * 0.8 * Math.min(1, lvl), dir < 0); ctx.stroke();
    }
    const grDb = gr < 0.999 ? 20 * Math.log10(gr) : 0;
    this.label(ctx, lv > 0.0005 ? fnum1(20 * Math.log10(lv), 1).replace('-', '−') + ' dB' : '— dB', 8, 7);
    if (grDb < -0.3) this.label(ctx, 'Wächter ' + fnum1(grDb, 1).replace('-', '−') + ' dB', w - 8, 7, 'right', PAL.cinnabar);
  },

  hits(ctx, w, h, v, vs, t, m) {
    const o0 = 1, okt = 6;
    this.grid(ctx, w, h - 10, h - 2, o0, okt, 1);
    const d = vs ? vs.dv : null;
    if (d) {
      const n = d[0];
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const hz = d[1 + i * 2], lv = d[2 + i * 2];
        const x = this.lx(hz, w, o0, okt), sk = this.sk();
        const deg = this.degreeOf(hz);
        const col = Skala.degree(deg).color;
        const hh = (h - 22) * Math.min(1, 0.25 + lv);
        const g = ctx.createLinearGradient(0, h - 12 - hh, 0, h - 12);
        g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, 0.9));
        ctx.fillStyle = g; ctx.fillRect(x - 1.6, h - 12 - hh, 3.2, hh);
        this.glow(ctx, x, h - 12, 9 + lv * 10, col, 0.5);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    this.label(ctx, MATERIALS[Param.fromNorm(ORGANE.schlagwerk.pmap.get('material'), m.vals.material)], 8, 7);
  },
  degreeOf(hz) {
    const sk = this.sk();
    let c = 1200 * Math.log2(hz / sk.root0); c = ((c % 1200) + 1200) % 1200;
    let best = 0, bd = 1e9;
    for (let i = 0; i < sk.n; i++) { const d = Math.min(Math.abs(c - sk.cents[i]), 1200 - Math.abs(c - sk.cents[i])); if (d < bd) { bd = d; best = i; } }
    return best;
  },

  mic(ctx, w, h, v, vs) {
    const d = vs ? vs.dv : null;
    const db = d ? d[0] : -120, hz = d ? d[1] : 0, snd = d ? d[3] : 0;
    const m = Machine.mod(v.id), thr = Param.fromNorm(ORGANE.atem.pmap.get('schwelle'), m.vals.schwelle);
    const bw = w - 92, x0 = 8, y0 = 8;
    ctx.fillStyle = hexA(PAL.night, 0.6); ctx.fillRect(x0, y0, bw, 6);
    const f = clamp((db + 72) / 72, 0, 1);
    ctx.fillStyle = snd ? PAL.amber : hexA(PAL.ivory, 0.35); ctx.fillRect(x0, y0, bw * f, 6);
    const tx = x0 + bw * clamp((thr + 72) / 72, 0, 1);
    ctx.fillStyle = PAL.cinnabar; ctx.fillRect(tx - 1, y0 - 3, 2, 12);
    // Tonhöhe auf dem Raster (Oktave 2 bis 6)
    const o0 = 2, okt = 4, gy0 = 24, gy1 = h - 6;
    ctx.save(); ctx.beginPath(); ctx.rect(0, gy0, w - 84, gy1 - gy0); ctx.clip();
    this.grid(ctx, w - 84, gy0, gy1, o0, okt, 0.9);
    for (const l of VIS.layers) {
      if (!(l.hz > 0)) continue;
      const x = this.lx(l.hz, w - 84, o0, okt);
      this.glow(ctx, x, gy1 - 8, 10, PAL.verdigris, 0.35 + l.lvl * 0.5);
    }
    if (hz > 0) {
      const x = this.lx(hz, w - 84, o0, okt), col = Skala.degree(this.degreeOf(hz)).color;
      this.glow(ctx, x, (gy0 + gy1) / 2, 16, col, 0.7);
      ctx.fillStyle = col; ctx.fillRect(x - 1, gy0, 2, gy1 - gy0);
    }
    ctx.restore();
    if (!Audio.micOn) this.label(ctx, 'Mikro aus', 8, gy0 + 4, 'left', hexA(PAL.ivory, 0.5));
    else if (hz > 0) { const n = Skala.noteName(hz, Machine.st.skala.a4); this.label(ctx, n.name + ' ' + (n.dev >= 0 ? '+' : '−') + Math.abs(n.dev) + ' Cent', 8, gy0 + 4); }
  },

  strings(ctx, w, h, v, vs, t) {
    const d = vs ? vs.dv : null;
    const m = Machine.mod(v.id), ns = Param.fromNorm(ORGANE.resonator.pmap.get('saiten'), m.vals.saiten);
    const n = d ? d[0] : ns, pad = 14, gap = (w - pad * 2) / Math.max(1, n - 1);
    for (let k = 0; k < n; k++) {
      const x = pad + k * gap, e = d ? d[2 + k * 2] : 0, hz = d ? d[1 + k * 2] : 0;
      const col = Skala.degree(k % this.sk().n).color;
      ctx.strokeStyle = hexA(col, 0.35 + e * 0.65); ctx.lineWidth = 1.2 + e * 1.5;
      ctx.beginPath();
      for (let y = 6; y <= h - 6; y += 3) {
        const u = (y - 6) / (h - 12), amp = Math.sin(Math.PI * u) * e * 6;
        const xx = x + Math.sin(t * (20 + (hz % 50)) + u * 9) * amp;
        if (y === 6) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
      }
      ctx.stroke();
      if (e > 0.05) this.glow(ctx, x, h / 2, 12 + e * 12, col, e * 0.4);
    }
  },

  reels(ctx, w, h, v, vs, t, m) {
    const d = vs ? vs.dv : null, ph = d ? d[0] : 0, sec = d ? d[1] : 0, fb = d ? d[2] : 0;
    const r = h * 0.34, y = h * 0.48;
    for (const [x, dir] of [[w * 0.27, 1], [w * 0.73, 1.2]]) {
      ctx.strokeStyle = hexA(PAL.brass, 0.8); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = hexA(PAL.night, 0.85); ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const a = ph * TAU * dir + k * TAU / 3;
        ctx.strokeStyle = hexA(PAL.ivory, 0.55); ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); ctx.stroke();
      }
      ctx.fillStyle = PAL.brass; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = hexA(PAL.amber, 0.35 + fb * 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.27, y + r); ctx.lineTo(w * 0.73, y + r); ctx.stroke();
    if (fb > 0.6) this.glow(ctx, w / 2, y + r, 30 * fb, PAL.amber, (fb - 0.6) * 0.9);
    this.label(ctx, Param.format(ORGANE.bandschleife.pmap.get('zeit'), m.vals.zeit, m.vals), w / 2, h - 13, 'center');
  },

  rose(ctx, w, h, v, vs, t, m) {
    const d = vs ? vs.dv : null, lv = d ? d[0] : 0, fz = d ? d[1] : 0;
    const cx = w / 2, cy = h / 2 + 2, r = h * 0.42;
    const col = fz > 0.5 ? '#bfe6ff' : PAL.amber;
    this.glow(ctx, cx, cy, r * 1.5, col, 0.08 + lv * 0.4);
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      const a = k * TAU / 12 + t * 0.03;
      ctx.strokeStyle = hexA(col, 0.25 + lv * 0.6);
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.5, r * 0.18, a, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = hexA(PAL.brass, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, TAU); ctx.stroke();
    if (fz > 0.5) this.label(ctx, 'Ewigkeit', 8, 7, 'left', '#bfe6ff');
  },

  fog(ctx, w, h, v, vs, t) {
    const d = vs ? vs.dv : null, sing = d ? d[1] : 0;
    if (!v.fog) v.fog = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 0.2 + Math.random() * 0.4, s: 0.01 + Math.random() * 0.03 }));
    for (const p of v.fog) {
      const x = ((p.x + t * p.s) % 1.2 - 0.1) * w, y = p.y * h;
      this.glow(ctx, x, y, p.r * h, PAL.ivory, 0.07);
    }
    if (d) for (let k = 0; k < 4; k++) {
      const hz = d[2 + k], x = this.lx(hz, w, 2, 7), col = Skala.degree(this.degreeOf(hz)).color;
      ctx.strokeStyle = hexA(col, 0.15 + sing * 0.7); ctx.lineWidth = 1 + sing * 1.5;
      ctx.beginPath(); ctx.moveTo(x, h * 0.2); ctx.lineTo(x, h * 0.8); ctx.stroke();
    }
  },

  moons(ctx, w, h, v, vs) {
    const d = vs ? vs.dv : null;
    for (let k = 0; k < 3; k++) {
      const cx = w * (0.2 + k * 0.3), cy = h * 0.42, r = h * 0.24;
      const ph = d ? d[k] : 0, val = d ? d[3 + k] : 0;
      ctx.fillStyle = hexA(PAL.night, 0.9); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      // beleuchtet: zunehmend die rechte, abnehmend die linke Hälfte; dazu eine Ellipse als Lichtgrenze
      const cs = Math.cos(ph * TAU), wax = ph < 0.5, lit = '#e8edf7', dark = hexA(PAL.night, 1);
      ctx.fillStyle = lit;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !wax); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cs > 0 ? dark : lit;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.01, Math.abs(cs) * r), r, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(PAL.brass, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      const by = h - 12, bw = w * 0.22;
      ctx.fillStyle = hexA(PAL.ivory, 0.15); ctx.fillRect(cx - bw / 2, by, bw, 3);
      ctx.fillStyle = PAL.verdigris; ctx.fillRect(cx, by - 1, (val / 1) * bw / 2, 5);
      this.label(ctx, ['I', 'II', 'III'][k], cx - r - 2, 4, 'right');
    }
  },

  wisp(ctx, w, h, v, vs) {
    const d = vs ? vs.dv : null, cur = d ? d[0] : 0, step = d ? d[1] : 0, sp = d ? d[2] : 0;
    if (!v.trail) v.trail = [];
    v.trail.push(cur); if (v.trail.length > 60) v.trail.shift();
    ctx.strokeStyle = hexA(PAL.verdigris, 0.25); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    const sy = h / 2 - step * h * 0.36;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath();
    v.trail.forEach((c, i) => { const x = w * i / 60, y = h / 2 - c * h * 0.36; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.strokeStyle = hexA('#d8ffb0', 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    const x = w * (v.trail.length - 1) / 60, y = h / 2 - cur * h * 0.36;
    this.glow(ctx, x, y, 14 + sp * 18, '#d8ffb0', 0.75);
  },

  rings(ctx, w, h, v, vs, t, m) {
    const d = vs ? vs.dv : null, cx = w / 2, cy = h / 2, R = h * 0.46;
    const sel = m.ring || 1, run = m.vals.lauf >= 0.5;
    const cols = [PAL.amber, PAL.violet, PAL.verdigris];
    for (let r = 1; r <= 3; r++) {
      const P = (id) => Param.fromNorm(ORGANE.uhrwerk.pmap.get('r' + r + id), m.vals['r' + r + id]);
      const n = Math.max(1, P('s')), k = Math.min(n, P('k')), rot = P('o');
      const rad = R * [1, 0.7, 0.42][r - 1];
      ctx.strokeStyle = hexA(r === sel ? PAL['brass-hi'] : PAL.brass, r === sel ? 0.7 : 0.3); ctx.lineWidth = r === sel ? 1.5 : 1;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke();
      const pos = d ? d[r - 1] : 0, fl = d ? d[2 + r] : 0;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * TAU / n, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        const hit = k > 0 && ((i + rot) * k) % n < k, now = run && Math.round(pos * n) % n === i;
        ctx.fillStyle = hit ? cols[r - 1] : hexA(PAL.ivory, 0.25);
        ctx.beginPath(); ctx.arc(x, y, hit ? 3.2 : 1.6, 0, TAU); ctx.fill();
        if (now) this.glow(ctx, x, y, 9 + (hit ? fl * 10 : 0), hit ? cols[r - 1] : PAL.ivory, hit ? 0.9 : 0.4);
      }
    }
    this.label(ctx, 'Ring ' + ['I', 'II', 'III'][sel - 1], 8, 7, 'left', PAL['brass-hi']);
  },

  orrery(ctx, w, h, v, vs, t, m) {
    const d = vs ? vs.dv : null, cx = w / 2, cy = h / 2 + 2, R = h * 0.44;
    const np = Param.fromNorm(ORGANE.planeten.pmap.get('planeten'), m.vals.planeten);
    ctx.strokeStyle = hexA(PAL.brass, 0.5); ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, 2); ctx.stroke(); ctx.setLineDash([]);
    this.glow(ctx, cx, cy, 16, PAL.amber, 0.8);
    ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU); ctx.fill();
    const steps = [0, 4, 2, 7, 5, 9, 3], sk = this.sk();
    for (let k = 0; k < np; k++) {
      const rad = R * (0.3 + 0.7 * (k + 1) / 7), rx = rad * (w / h) * 0.85;
      ctx.strokeStyle = hexA(PAL.ivory, 0.13); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, rad, 0, 0, TAU); ctx.stroke();
      const ph = d ? d[1 + k] : 0, fl = d ? d[8 + k] : 0;
      const a = -Math.PI / 2 + ph * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * rad;
      const col = Skala.degree(((steps[k] % sk.n) + sk.n) % sk.n).color;
      if (fl > 0.02) this.glow(ctx, x, y, 8 + fl * 16, col, fl * 0.9);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
    }
  },

  level(ctx, w, h, v, vs) {
    const d = vs ? vs.dv : null, x = d ? d[0] : 0, y = d ? d[1] : 0;
    const cx = w * 0.32, cy = h / 2, r = h * 0.4;
    ctx.strokeStyle = hexA(PAL.brass, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA(PAL.brass, 0.35); ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
    this.glow(ctx, cx + x * r * 0.85, cy + y * r * 0.85, 12, '#d8ffb0', 0.8);
    if (!Audio.tilt.on) this.label(ctx, 'schläft', cx + r + 10, cy - 6);
  },
};
