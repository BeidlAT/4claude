/* ---------- Klangwelten: every preset drawn ---------- */
// (owner, 26.10.2026: „die einzelnen Presets schön grafisch ausarbeiten, ihnen Charakter geben – eine besonders schöne
// Lösung, so wie beim Mixer“) Each preset card wears a small picture of its world: its own motif and colours (the
// bells of the Tempelglocken, the curtains of the Nordlicht, the attractor itself, the cassette of the Kassettendeck)
// above the soil all of them grow from – the Myzel's hyphae, tinted by the world. Below it a line read like the
// mixer's labels: the scale as a ring of twelve (its root lit), the Puls's lanes as rows of their steps in the lanes'
// own colours, the tempo. A picture is drawn once when its card comes into view; the card under the pointer (or
// focused) and the one playing move – the one under the pointer at full rate, the playing one gently – and only while
// the panel is open. A player's own presets get a picture made from their values.
const KB = { cards: [], hov: null, io: null, ro: null, grain: null, t0: performance.now(), last: 0 };
const KB_TAU = Math.PI * 2;
const kbHash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
function kbRng(seed) { let a = (seed >>> 0) || 0x9e3779b9; return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; }
const kbRgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const kbA = (hex, a) => { const [r, g, b] = kbRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
const kbMix = (h1, h2, t) => { const a = kbRgb(h1), b = kbRgb(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const kbHsl = (hh, s, l) => { const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
// a soft light: a radial gradient disc
function kbGlow(c, x, y, r, col, a) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, kbA(col, a)); g.addColorStop(0.4, kbA(col, a * 0.35)); g.addColorStop(1, kbA(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, KB_TAU); c.fill();
}
// a sun or moon: a disc lit a little from above left, its halo around it
function kbSun(c, x, y, r, col, a = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  kbGlow(c, x, y, r * 4.4, col, 0.2 * a); kbGlow(c, x, y, r * 2.1, col, 0.3 * a);
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
  g.addColorStop(0, kbMix(col, '#fffaf0', 0.8)); g.addColorStop(0.65, kbMix(col, '#fff0d0', 0.4)); g.addColorStop(1, kbMix(col, '#3a1a08', 0.12));
  c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, KB_TAU); c.fill();
  c.restore();
}
function kbDot(c, x, y, r, col, a) { c.fillStyle = kbA(col, a); c.beginPath(); c.arc(x, y, r, 0, KB_TAU); c.fill(); }
function kbLine(c, pts, col, a, lw) { if (pts.length < 2) return; c.strokeStyle = kbA(col, a); c.lineWidth = lw; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
function kbRing(c, x, y, r, col, a, lw) { if (r <= 0) return; c.strokeStyle = kbA(col, a); c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, KB_TAU); c.stroke(); }
// eased pulse 0..1 for a beat phase (a strike, then decay)
const kbHit = (ph) => { const f = ph - Math.floor(ph); return Math.exp(-f * 5); };

// ---- what a preset is, read for its picture ----
function kbSpec(p) {
  const v = (typeof engKeysIn === 'function' ? engKeysIn(p.v || {}) : p.v) || {};
  const val = (id) => (Object.prototype.hasOwnProperty.call(v, id) ? v[id] : PD[id] ? PD[id].d : undefined);
  const eng = val('v.eng'), meta = ENG_META[eng] || {}, sk = val('t.scale'), sc = SCALES[sk] || SCALES.mpent, root = Number(val('t.root')) || 0;
  const semis = sc.free ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : sc.s ? sc.s : sc.r ? sc.r.map((r) => Math.round(12 * Math.log2(r))) : [0];
  const pcs = [...new Set(semis.map((s) => (((Math.round(s) + root) % 12) + 12) % 12))];
  const lanes = [0, 1, 2, 3].map((i) => { const q = 'l' + i + '.'; return { i, on: !!val(q + 'on'), steps: Math.max(1, val(q + 'steps') | 0), puls: val(q + 'puls') | 0, rot: val(q + 'rot') | 0, div: divBeats(val(q + 'div')), eng: val(q + 'eng'), col: (COL.lanes && COL.lanes[i]) || ['#ffb35c', '#86f0d0', '#c9b6ff', '#ff8fa6'][i] }; });
  const art = Object.assign({}, kbDerive(p, meta), KB_ART[p.key] || {});
  return {
    key: p.key || 'u:' + p.name, name: p.name, seed: kbHash(p.key || p.name), eng, meta, scale: sc.n, sk, root, pcs, nNotes: semis.length,
    bpm: +val('seq.bpm') || 84, lanes, on: lanes.filter((l) => l.on),
    bor: val('bor.on') ? Number(val('bor.int')) || 1.5 : 0, room: Math.max(0, Math.min(1, ((+val('rev.size') || 0) / 12) * (+val('rev.mix') || 0) * 1.8)),
    echo: (+val('dly.mix') || 0) * (0.5 + (+val('dly.fb') || 0)), layer: val('v.layer'), drive: (+val('drv.mix') || 0) * (+val('drv.amt') || 0),
    a: art.a, b: art.b, sky: art.sky, m: art.m, va: art.v || '', hz: art.hz != null ? art.hz : 0.8, soil: art.soil !== false,
  };
}
// a picture for a preset this table does not know (a player's own): its source's family chooses the motif, its name the hue
function kbDerive(p, meta) {
  const hue = kbHash(p.name || p.key || '') % 360, a = kbHsl(hue, 0.75, 0.66), b = kbHsl((hue + 50) % 360, 0.7, 0.62), sky = kbHsl(hue, 0.5, 0.07);
  const m = { luft: 'wind', dunst: 'nordlicht', holz: 'kristall', erz: 'glocken', erde: 'regen', strom: 'kassette' }[meta.fam] || 'sporen';
  return { m, a, b, sky };
}

// ---- the picture: sky, its room's light, the motif, the soil with its hyphae, grain and vignette ----
function kbDraw(c, w, h, S, t) {
  const L = kbLayers(S, w, h, c.getTransform ? c.getTransform().a : 1);
  c.save();
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.drawImage(L.bg, 0, 0, w, h);
  const M = KB_M[S.m] || KB_M.sporen;
  c.save(); M(c, w, h, S, t, kbRng(S.seed)); c.restore();
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  if (S.bor) kbDrone(c, w, h, S, t);
  if (L.soil) { c.drawImage(L.soil, 0, 0, w, h); kbSpores(c, S, t); }
  c.drawImage(L.top, 0, 0, w, h);
  c.restore();
}
// what does not move, drawn once per size: the sky with its room's light, the soil with its hyphae, grain and vignette
function kbLayers(S, w, h, dpr) {
  const k = w + 'x' + h + '@' + dpr;
  if (S.L && S.L.k === k) return S.L;
  const mk = (fn) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr)); const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); fn(x); return cv; };
  const L = { k };
  L.bg = mk((c) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, S.sky); bg.addColorStop(0.62, kbMix(S.sky, '#0e0a08', 0.55)); bg.addColorStop(1, '#0b0806');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    // the room: a breath of the world's colour behind everything – as wide as its Hall
    c.globalCompositeOperation = 'lighter';
    kbGlow(c, w * 0.5, h * 0.46, w * (0.42 + 0.5 * S.room), S.a, 0.1 + 0.16 * S.room);
  });
  L.soil = S.soil ? mk((c) => kbSoil(c, w, h, S)) : null;
  L.top = mk((c) => {
    if (!KB.grain) KB.grain = kbGrain();
    c.globalAlpha = 0.05; c.fillStyle = c.createPattern(KB.grain, 'repeat'); c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    const vg = c.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,4,3,0.62)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  });
  S.L = L;
  return L;
}
// the Bordun, in the mixer's colour for it: a line breathing just above the horizon – a second one for its interval
function kbDrone(c, w, h, S, t) {
  const y = (S.soil ? S.hz : 0.96) * h - 3, ys = S.bor === 1 ? [y] : [y, y - 2 - 4 / S.bor];
  c.save(); c.globalCompositeOperation = 'lighter';
  ys.forEach((yy, k) => { const g = c.createLinearGradient(0, 0, w, 0), br = 0.55 + 0.25 * Math.sin(t * 0.8 + k * 1.3); g.addColorStop(0, 'rgba(90,124,255,0)'); g.addColorStop(0.5, kbA('#5a7cff', br)); g.addColorStop(1, 'rgba(90,124,255,0)'); c.strokeStyle = g; c.lineWidth = 1; c.beginPath(); c.moveTo(w * 0.04, yy); c.lineTo(w * 0.96, yy); c.stroke(); });
  c.restore();
}
function kbGrain() {
  const g = document.createElement('canvas'); g.width = g.height = 96;
  const x = g.getContext('2d'), d = x.createImageData(96, 96), R = kbRng(7);
  for (let i = 0; i < d.data.length; i += 4) { const v = R() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  return g;
}
// the soil every world grows from: a dark band under its horizon, hyphae reaching into it, spores at their tips
function kbSoil(c, w, h, S) {
  const hz = S.hz * h;
  const g = c.createLinearGradient(0, hz, 0, h);
  g.addColorStop(0, kbA(kbMix(S.a, '#2a1a10', 0.82), 0.92)); g.addColorStop(0.25, 'rgba(18,12,9,0.96)'); g.addColorStop(1, 'rgba(10,7,5,1)');
  c.fillStyle = g; c.fillRect(0, hz, w, h - hz);
  c.fillStyle = kbA(S.a, 0.28); c.fillRect(0, hz, w, 0.7);
  const key = w + 'x' + h;
  if (!S.hy || S.hyK !== key) { S.hy = kbHyphae(S, w, h); S.hyK = key; }
  const ink = kbMix(S.a, '#f0e6d8', 0.45);
  c.lineCap = 'round';
  for (const [x0, y0, x1, y1, d] of S.hy.segs) { c.strokeStyle = kbA(ink, 0.34 - d * 0.07); c.lineWidth = Math.max(0.35, 0.95 - d * 0.18); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
}
// the spores at the hyphae's tips, twinkling (drawn every frame, over the soil)
function kbSpores(c, S, t) {
  if (!S.hy) return;
  c.globalCompositeOperation = 'lighter';
  S.hy.tips.forEach(([x, y], i) => { const tw = 0.45 + 0.55 * Math.sin(t * 1.3 + i * 2.1) ** 2; kbGlow(c, x, y, 3.2, S.a, 0.55 * tw); kbDot(c, x, y, 0.7, '#fff6e8', 0.6 * tw); });
  c.globalCompositeOperation = 'source-over';
}
function kbHyphae(S, w, h) {
  const R = kbRng(S.seed ^ 0x51ed27), hz = S.hz * h, segs = [], tips = [], room = h - hz;
  const grow = (x, y, a, len, d) => {
    const x1 = x + Math.cos(a) * len, y1 = Math.min(h - 1, y + Math.sin(a) * len * 0.75);
    segs.push([x, y, x1, y1, d]);
    if (d >= 3 || len < 3) { tips.push([x1, y1]); return; }
    const n = R() < 0.7 ? 2 : 1;
    for (let k = 0; k < n; k++) grow(x1, y1, a + (k ? 1 : -1) * (0.35 + R() * 0.55) + (R() - 0.5) * 0.3, len * (0.62 + R() * 0.2), d + 1);
  };
  const n = 4 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) grow(w * (0.06 + 0.88 * (i + R() * 0.8) / n), hz + 0.5, Math.PI / 2 + (R() - 0.5) * 1.3, room * (0.32 + 0.22 * R()), 0);
  return { segs, tips: tips.filter(() => R() < 0.6) };
}

// ---- the card ----
function kbTonring(S) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('class', 'kb-ton'); svg.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * KB_TAU, pc = (S.root + k) % 12, inS = S.pcs.includes(pc), d = document.createElementNS(NS, 'circle');
    d.setAttribute('cx', (10 + 7.4 * Math.cos(a)).toFixed(2)); d.setAttribute('cy', (10 + 7.4 * Math.sin(a)).toFixed(2));
    d.setAttribute('r', k === 0 ? 2.1 : inS ? 1.5 : 0.8);
    d.setAttribute('fill', k === 0 ? S.a : inS ? '#f0e6d8' : 'rgba(240,230,216,.22)');
    svg.append(d);
  }
  return svg;
}
// the Puls's lanes as rows of their steps (pulses in the lane's colour) – what plays, read at a glance
function kbPulsRows(S) {
  const on = S.on;
  if (!on.length) return null;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), cols = 16, gap = 3.6, row = 4.2;
  svg.setAttribute('viewBox', '0 0 ' + (cols * gap) + ' ' + (on.length * row)); svg.setAttribute('class', 'kb-puls'); svg.setAttribute('aria-hidden', 'true');
  svg.style.width = (cols * gap) + 'px'; svg.style.height = (on.length * row) + 'px';
  on.forEach((L, r) => {
    const pat = euclid(L.steps, L.puls, L.rot), n = Math.min(cols, L.steps), step = L.steps > cols ? L.steps / cols : 1;
    for (let k = 0; k < n; k++) {
      const hitK = pat[Math.floor(k * step)], d = document.createElementNS(NS, 'circle');
      d.setAttribute('cx', (gap / 2 + k * gap).toFixed(2)); d.setAttribute('cy', (row / 2 + r * row).toFixed(2));
      d.setAttribute('r', hitK ? 1.35 : 0.7); d.setAttribute('fill', hitK ? L.col : 'rgba(240,230,216,.18)');
      svg.append(d);
    }
  });
  return svg;
}
function kbCard(p, i, onClick) {
  const S = kbSpec(p);
  const cv = h('canvas', { class: 'kb-art', 'aria-hidden': 'true' });
  const sub = h('span', { class: 'kb-sc' }, NOTE_NAMES[S.root] + ' · ' + S.scale);
  const foot = h('span', { class: 'kb-foot' }, kbTonring(S), sub, h('span', { class: 'kb-sp' }), ...(S.on.length ? [kbPulsRows(S), h('span', { class: 'kb-bpm' }, String(Math.round(S.bpm)))] : []));
  const el = h('button', { type: 'button', class: 'pcard kb', 'aria-current': 'false', style: '--a:' + S.a + ';--b:' + S.b, onclick: onClick },
    h('span', { class: 'kb-frame' }, cv, h('span', { class: 'kb-nr', 'aria-hidden': 'true' }, i != null ? String(i).padStart(2, '0') : '')),
    h('b', null, p.name), h('span', { class: 'tags' }, p.tags || ''), p.desc ? h('small', null, p.desc) : null, foot);
  el.dataset.key = p.key;
  const C = { el, cv, S, drawn: false, vis: false, w: 0 };
  el.addEventListener('pointerenter', () => { KB.hov = C; });
  el.addEventListener('pointerleave', () => { if (KB.hov === C) KB.hov = null; });
  el.addEventListener('focus', () => { KB.hov = C; });
  el.addEventListener('blur', () => { if (KB.hov === C) KB.hov = null; });
  KB.cards.push(C);
  if (KB.io) KB.io.observe(el);
  return el;
}
// a small picture for a player's own preset (its row in „Eigene Presets“)
function kbMini(p) {
  const now = performance.now(), C = { cv: h('canvas', { class: 'kb-mini', 'aria-hidden': 'true' }), S: kbSpec(p), drawn: false, vis: true, mini: true, t0: now };
  KB.cards = KB.cards.filter((x) => !x.mini || x.cv.isConnected || now - x.t0 < 2000);   // (the rows of a list rebuilt: their old pictures go)
  KB.cards.push(C);
  return C.cv;   // (painted by kbFrame once it is laid out)
}
function kbPaint(C, t) {
  const r = C.cv.getBoundingClientRect(), w = Math.round(r.width), hh = Math.round(r.height);
  if (w < 4 || hh < 4) return false;
  const c = mxFit(C.cv, w, hh);
  kbDraw(c, w, hh, C.S, t);
  C.drawn = true; C.w = w;
  return true;
}
// the panel's grid: pictures drawn as they come into view, again when the width changes
function kbWatch(root) {
  if (KB.io) KB.io.disconnect();
  if (KB.ro) KB.ro.disconnect();
  KB.cards = KB.cards.filter((C) => C.mini ? C.cv.isConnected : C.el.isConnected);
  if ('IntersectionObserver' in window) {
    KB.io = new IntersectionObserver((ents) => { for (const e of ents) { const C = KB.cards.find((x) => x.el === e.target); if (!C) continue; C.vis = e.isIntersecting; if (C.vis && !C.drawn) kbPaint(C, KB_STILL); } }, { root: null, rootMargin: '120px' });
    for (const C of KB.cards) if (C.el) KB.io.observe(C.el);
  } else for (const C of KB.cards) { C.vis = true; }
  if ('ResizeObserver' in window && root) {
    KB.ro = new ResizeObserver(() => { for (const C of KB.cards) if (C.el && C.drawn && Math.abs(C.cv.getBoundingClientRect().width - C.w) > 1) { C.drawn = false; if (C.vis) kbPaint(C, KB_STILL); } });
    KB.ro.observe(root);
  }
}
const KB_STILL = 2.4;   // (the moment a still picture shows: every motif has begun)
// every frame while the panel is open: the card under the pointer moves at full rate, the playing one at a calm 20/s
function kbFrame() {
  const now = performance.now(), t = (now - KB.t0) / 1000;
  for (const C of KB.cards) if (!C.drawn && (C.mini ? C.cv.isConnected : C.el && C.vis)) kbPaint(C, KB_STILL);
  if (REDUCED) return;
  const H = KB.hov && KB.hov.el && KB.hov.el.isConnected ? KB.hov : null;
  if (H && now - (KB.lastH || 0) >= 32) { KB.lastH = now; kbPaint(H, KB_STILL + t); }
  const cur = KB.cards.find((C) => C.el && C.vis && C.el.getAttribute('aria-current') === 'true');
  if (cur && cur !== H && now - KB.last > 50) { KB.last = now; kbPaint(cur, KB_STILL + t); }
}
