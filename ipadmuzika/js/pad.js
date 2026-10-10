// Sphärenwerk – das Pad: ein Monochord aus Licht. Waagrecht die Tonhöhe im Raster der Tonleiter,
// senkrecht die Klangfarbe. Gehaltene Töne werden zu Kugeln, die man verschieben oder antippen (lösen) kann.
// Die Stimme aus dem Mikrofon erscheint als Leuchtspur; eingefangene Stimmtöne sind eigene Kugeln.
'use strict';

const Pad = {
  cv: null, ctx: null, dpr: 1, W: 0, H: 0, mode: 'mini', host: null,
  sk: null, lines: [], rows: 1,
  touches: new Map(), orbs: [], ripples: [], sparks: [], micTrail: [],
  nextNote: 1, lastHit: 0, bg: null, sprites: new Map(), lastT: 0,

  init() {
    this.cv = h('canvas', { id: 'padcv', 'aria-label': 'Spielfläche' });
    this.ctx = this.cv.getContext('2d');
    this.bind();
    Machine.on((ev) => {
      if (ev.k === 'skala' || ev.k === 'pad' || ev.k === 'all') this.layout();
      if ((ev.k === 'del' || ev.k === 'all') && !Machine.st.mods.some((m) => m.type === 'atem')) this.orbs = this.orbs.filter((o) => o.kind !== 'layer');
    });
    Audio.on('layer', (op, m) => this.onLayer(op, m));
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(document.body);
  },
  attach(host, mode) {
    this.host = host; this.mode = mode; this.shownAt = performance.now();
    host.append(this.cv);
    this.resize();
  },
  resize() {
    if (!this.host) return;
    const r = this.host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const q = Settings.get('grafik') === 'sparsam' ? 1 : 1.5;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mode === 'full' ? q : 2);
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
    this.makeBg();
    this.layout();
  },
  layout() {
    if (!Machine.st) return;
    this.sk = Skala.build(Machine.st.skala);
    const pd = Machine.st.pad;
    this.rows = this.mode === 'mini' ? 1 : clamp(pd.rows | 0, 1, 4);
    this.from = pd.from; this.oct = pd.oct;
    // jede Reihe liegt eine Oktave über der vorigen: Linien für den ganzen Umfang aller Reihen
    const lo = this.sk.root0 * Math.pow(2, this.from), hi = this.sk.root0 * Math.pow(2, this.from + this.oct + this.rows - 1);
    this.lines = Skala.lines(this.sk, lo, hi).map((l) => ({ ...l, c: 1200 * Math.log2(l.hz / this.sk.root0), e: 0 }));
    for (const o of this.orbs) o.x = this.c2x(o.c, o.row || 0);
  },
  makeBg() {
    const w = Math.max(2, Math.round(this.W / 2)), hh = Math.max(2, Math.round(this.H / 2));
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, '#0d1224'); g.addColorStop(0.55, '#0a0d19'); g.addColorStop(1, '#07080f');
    x.fillStyle = g; x.fillRect(0, 0, w, hh);
    // Nebel und Sternstaub
    for (let i = 0; i < 14; i++) {
      const px = Math.random() * w, py = Math.random() * hh * 0.8, r = (0.15 + Math.random() * 0.3) * Math.max(w, hh);
      const cols = ['#3a2a6e', '#1d4a5c', '#5a2f4f', '#2b3a6b'];
      const rg = x.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, hexA(cols[i % 4], 0.16)); rg.addColorStop(1, hexA(cols[i % 4], 0));
      x.fillStyle = rg; x.fillRect(0, 0, w, hh);
    }
    for (let i = 0; i < w * hh / 900; i++) {
      x.fillStyle = `rgba(230,225,255,${Math.random() * 0.35})`;
      x.fillRect(Math.random() * w, Math.random() * hh, Math.random() < 0.1 ? 1.5 : 0.8, Math.random() < 0.1 ? 1.5 : 0.8);
    }
    this.bg = c;
  },
  sprite(col) {
    let s = this.sprites.get(col);
    if (!s) {
      s = document.createElement('canvas'); s.width = s.height = 128;
      const x = s.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, hexA(col, 1)); g.addColorStop(0.22, hexA(col, 0.55)); g.addColorStop(0.55, hexA(col, 0.14)); g.addColorStop(1, hexA(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      this.sprites.set(col, s);
    }
    return s;
  },

  /* --- Geometrie --- */
  rowH() { return this.H / this.rows; },
  rowOf(py) { return clamp(this.rows - 1 - Math.floor(py / this.rowH()), 0, this.rows - 1); },
  x2c(x, row) { return (this.from + (row || 0) + x * this.oct) * 1200; },
  c2x(c, row) { return (c / 1200 - this.from - (row || 0)) / this.oct; },
  hz(c) { return this.sk.root0 * Math.pow(2, c / 1200); },
  snap(c) {
    const n = this.sk.n, cents = this.sk.cents;
    const o = Math.floor(c / 1200), w = c - o * 1200;
    let best = 0, bd = 1e9;
    for (let i = 0; i <= n; i++) { const t = i < n ? cents[i] : 1200; const d = Math.abs(w - t); if (d < bd) { bd = d; best = t; } }
    return o * 1200 + best;
  },
  // Fingerposition → x (0…1), y (0…1 innerhalb der Reihe, oben = hell), Reihe
  pos(e) {
    const r = this.cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const row = this.rowOf(py), rh = this.rowH();
    const yIn = 1 - ((py - (this.rows - 1 - row) * rh) / rh);
    return { x: clamp(px / r.width, 0, 1), y: clamp(yIn, 0, 1), row, px, py };
  },
  orbScreen(o) {
    const rh = this.rowH();
    return { x: o.x * this.W, y: (this.rows - 1 - (o.row || 0)) * rh + (1 - o.y) * rh };
  },

  /* --- Spielen --- */
  bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.down(e));
    cv.addEventListener('pointermove', (e) => this.move(e));
    cv.addEventListener('pointerup', (e) => this.up(e));
    cv.addEventListener('pointercancel', (e) => this.up(e, true));
    cv.addEventListener('lostpointercapture', (e) => { if (this.touches.has(e.pointerId)) this.up(e, true); });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS: keine Lupe, kein Doppeltipp-Zoom
    cv.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  },
  magnet() { return Machine.st.pad.magnet; },
  down(e) {
    e.preventDefault();
    if (!Audio.ready) { App.awaken(); return; }
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    const p = this.pos(e), now = performance.now();
    // Kugel getroffen?
    let hit = null, hd = this.mode === 'mini' ? 22 : 34;
    for (const o of this.orbs) {
      const s = this.orbScreen(o), d = Math.hypot(s.x - p.px, s.y - p.py);
      if (d < hd) { hd = d; hit = o; }
    }
    if (hit) {
      this.touches.set(e.pointerId, { kind: 'orb', orb: hit, downT: now, moved: false, sx: p.px, sy: p.py, cBase: hit.c, sBase: this.x2c(p.x, hit.row), lastMove: now });
      hit.grab = true;
      return;
    }
    const m = this.magnet(), s = this.x2c(p.x, p.row), sn = this.snap(s);
    const c = m >= 0.99 ? sn : s + (sn - s) * m;
    let vel = 0.78, y = p.y;
    if (e.pointerType === 'pen') { vel = 0.3 + 0.7 * (e.pressure || 0.5); }
    const note = this.nextNote++;
    const t = { kind: 'note', note, c, cBase: c, sBase: s, x: p.x, y, row: p.row, vel, lastMove: now, sent: c, sentY: y, pen: e.pointerType === 'pen' };
    this.touches.set(e.pointerId, t);
    Audio.noteOn(note, this.hz(c), y, vel);
    Ghost.capture('on', note, c, y, vel, p.row);
    this.ripples.push({ x: this.c2x(c, p.row), y: p.y, row: p.row, t: now, col: Skala.degree(this.degOf(c)).color, big: false });
  },
  move(e) {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    const ev = evs && evs.length ? evs[evs.length - 1] : e;
    const p = this.pos(ev), now = performance.now();
    if (t.kind === 'orb') {
      const o = t.orb;
      if (!t.moved && Math.hypot(p.px - t.sx, p.py - t.sy) < 7) return;
      t.moved = true; t.lastMove = now;
      const s = this.x2c(p.x, o.row || 0), m = this.magnet();
      o.c = m >= 0.99 ? this.snap(s) : t.cBase + (s - t.sBase);
      o.y = this.mode === 'mini' ? o.y : p.y;
      o.x = this.c2x(o.c, o.row || 0);
      this.sendOrb(o);
      return;
    }
    const m = this.magnet(), s = this.x2c(p.x, t.row);
    t.c = m >= 0.99 ? this.snap(s) : t.cBase + (s - t.sBase);
    t.x = p.x; t.y = p.y; t.lastMove = now;
    if (t.pen) t.y = clamp(p.y + ((e.pressure || 0.5) - 0.5) * 0.3, 0, 1);
    this.sendTouch(t);
  },
  sendTouch(t) {
    if (Math.abs(t.c - t.sent) > 0.3 || Math.abs(t.y - t.sentY) > 0.003) {
      Audio.noteMove(t.note, this.hz(t.c), t.y);
      Ghost.capture('mv', t.note, t.c, t.y, 0, t.row);
      t.sent = t.c; t.sentY = t.y;
    }
  },
  sendOrb(o) {
    if (o.kind === 'note') Audio.noteMove(o.note, this.hz(o.c), o.y);
    else {
      const hzNow = this.hz(o.c);
      const ratio = o.f0 > 0 ? hzNow / o.f0 : o.rate0 * Math.pow(2, (o.c - o.c0) / 1200);
      Audio.send({ t: 'lyr', op: 'mv', id: o.id, ratio, vol: 0.25 + o.y * 1.1 });
    }
  },
  up(e, cancel) {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    this.touches.delete(e.pointerId);
    if (t.kind === 'orb') {
      const o = t.orb; o.grab = false;
      if (!t.moved && performance.now() - t.downT < 350 && !cancel) this.releaseOrb(o);
      return;
    }
    if (App.hold) {
      this.orbs.push({ kind: 'note', note: t.note, c: t.c, x: this.c2x(t.c, t.row), y: t.y, row: t.row, born: performance.now() });
      Ghost.capture('hold', t.note, t.c, t.y, 0, t.row);
    } else {
      Audio.noteOff(t.note);
      Ghost.capture('off', t.note, t.c, t.y, 0, t.row);
    }
  },
  releaseOrb(o) {
    if (o.kind === 'note') Audio.noteOff(o.note);
    else Audio.send({ t: 'lyr', op: 'off', id: o.id });
    o.dying = performance.now();
  },
  releaseAll() {
    for (const o of this.orbs) if (o.kind === 'note' && !o.dying) { Audio.noteOff(o.note); o.dying = performance.now(); }
  },
  onHold(on) {
    if (on) {
      // laufende Finger werden beim Loslassen zu Kugeln; nichts weiter zu tun
    } else this.releaseAll();
  },
  onLayer(op, m) {
    if (op === 'add') {
      const known = this.orbs.filter((o) => o.kind === 'layer').length;
      const hz = m.hz > 0 ? m.hz : this.sk.root0 * Math.pow(2, this.from + this.oct / 2);
      const c = 1200 * Math.log2(hz / this.sk.root0);
      const o = { kind: 'layer', id: m.id, f0: m.f0, c, c0: c, rate0: m.f0 > 0 ? m.hz / m.f0 : 1, row: 0, y: 0.16 + (known % 5) * 0.09, born: performance.now(), x: 0 };
      o.x = this.c2x(c, 0);
      this.orbs.push(o);
      this.ripples.push({ x: o.x, y: o.y, row: 0, t: performance.now(), col: PAL.verdigris || '#43b99c', big: true });
    } else {
      const o = this.orbs.find((x) => x.kind === 'layer' && x.id === m.id);
      if (o && !o.dying) o.dying = performance.now();
    }
  },
  degOf(c) {
    const n = this.sk.n, w = ((c % 1200) + 1200) % 1200;
    let best = 0, bd = 1e9;
    for (let i = 0; i < n; i++) { const d = Math.min(Math.abs(w - this.sk.cents[i]), 1200 - Math.abs(w - this.sk.cents[i])); if (d < bd) { bd = d; best = i; } }
    return best;
  },

  /* --- Einrasten: ruhende Finger gleiten auf den nächsten Ton --- */
  settle(dt) {
    const m = this.magnet();
    if (m <= 0.001 || m >= 0.99) return;
    const now = performance.now(), tau = 0.05 + (1 - m) * 0.9, k = 1 - Math.exp(-dt / tau);
    for (const t of this.touches.values()) {
      const tgtObj = t.kind === 'orb' ? t.orb : t;
      if (t.kind === 'orb' && !t.moved) continue;
      if (now - t.lastMove < 110) continue;
      const target = this.snap(tgtObj.c), d = target - tgtObj.c;
      if (Math.abs(d) < 0.4) { if (d !== 0) { tgtObj.c = target; if (t.kind === 'orb') { tgtObj.x = this.c2x(tgtObj.c, tgtObj.row || 0); this.sendOrb(tgtObj); } else this.sendTouch(t); } continue; }
      tgtObj.c += d * k;
      t.cBase = tgtObj.c; t.sBase = this.x2c(t.kind === 'orb' ? tgtObj.x : t.x, tgtObj.row || 0);
      if (t.kind === 'orb') { tgtObj.x = this.c2x(tgtObj.c, tgtObj.row || 0); this.sendOrb(tgtObj); } else this.sendTouch(t);
    }
  },

  /* --- Zeichnen --- */
  frame(tms) {
    if (!this.host || !this.W) return;
    const now = performance.now(), dt = Math.min(0.05, (now - (this.lastT || now)) / 1000); this.lastT = now;
    this.settle(dt);
    Ghost.tick();
    const ctx = this.ctx, W = this.W, H = this.H, rh = this.rowH();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H); else { ctx.fillStyle = '#080a12'; ctx.fillRect(0, 0, W, H); }
    // Energie je Rasterlinie aus den klingenden Stimmen
    for (const l of this.lines) l.e *= 0.86;
    for (const v of VIS.voices) {
      if (!(v.hz > 0)) continue;
      const c = 1200 * Math.log2(v.hz / this.sk.root0);
      for (const l of this.lines) { const d = Math.abs(l.c - c); if (d < 60) l.e = Math.max(l.e, v.lvl * (1 - d / 60)); }
    }
    for (const r of this.ripples) if (now - r.t < 60) for (const l of this.lines) { const x = this.c2x(l.c, r.row); if (Math.abs(x - r.x) < 0.004) l.e = Math.max(l.e, 0.9); }
    for (let row = 0; row < this.rows; row++) this.drawRow(ctx, row, (this.rows - 1 - row) * rh, rh, now);
    this.drawHits(now);
    this.drawRipples(ctx, now, rh);
    this.drawMic(ctx, now, rh);
    this.drawSparks(ctx, now, rh);
    this.drawOrbs(ctx, now, rh);
    this.drawTouches(ctx, now, rh);
    Ghost.draw(ctx, now, rh);
    // kurzer Hinweis beim Öffnen des großen Pads, solange noch nichts gespielt wird
    const age = now - this.shownAt;
    if (this.mode === 'full' && age < 9000 && !this.touches.size && !this.orbs.length) {
      ctx.globalAlpha = Math.min(1, (9000 - age) / 1500) * 0.75;
      ctx.font = 'italic 19px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#efe7d6';
      ctx.fillText('Waagrecht die Tonhöhe, senkrecht die Klangfarbe.', W / 2, H * 0.4);
      ctx.fillText('HALTEN lässt jeden Ton als Kugel stehen.', W / 2, H * 0.4 + 30);
      ctx.globalAlpha = 1;
    }
    if (!Audio.ready) {
      ctx.fillStyle = 'rgba(8,10,18,0.55)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '500 15px "Alegreya Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(239,231,214,0.8)'; ctx.fillText('Tippe, um die Maschine zu erwecken', W / 2, H / 2);
    }
  },
  drawRow(ctx, row, y0, rh, now) {
    const W = this.W, mini = this.mode === 'mini';
    if (row < this.rows - 1) { ctx.fillStyle = 'rgba(201,163,91,0.18)'; ctx.fillRect(0, y0 + rh - 1, W, 1); }
    const labH = mini ? 18 : 44;
    // Oktavbänder
    for (let o = 0; o < this.oct; o++) {
      if (o % 2) { ctx.fillStyle = 'rgba(255,255,255,0.018)'; ctx.fillRect(o / this.oct * W, y0, W / this.oct, rh); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.lines) {
      const x = this.c2x(l.c, row) * W;
      if (x < -2 || x > W + 2) continue;
      const col = Skala.degree(l.deg).color, e = l.e;
      const base = l.root ? 0.42 : 0.2;
      ctx.strokeStyle = hexA(col, Math.min(1, base + e * 0.8));
      ctx.lineWidth = (l.root ? 1.8 : 1.1) + e * 2.2;
      if (e > 0.05 && !REDUCED_MOTION) {
        ctx.beginPath();
        const amp = e * (mini ? 2.5 : 5), f = 0.035 + (l.deg % 3) * 0.01;
        for (let y = y0; y <= y0 + rh - labH; y += 6) { const xx = x + Math.sin(y * f + now * 0.025) * amp * Math.sin(Math.PI * (y - y0) / (rh - labH)); if (y === y0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
        ctx.stroke();
        const sp = this.sprite(col), r = 20 + e * 40;
        ctx.globalAlpha = Math.min(1, e * 0.8); ctx.drawImage(sp, x - r, y0 + rh * 0.45 - r * 2, r * 2, r * 4); ctx.globalAlpha = 1;
      } else { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + rh - labH); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over';
    // Beschriftung: Zeichen über dem Notennamen; ist das Raster zu eng, bleibt nur das Zeichen
    const lab = Settings.get('beschriftung');
    const sk = this.sk, xs = this.lines.map((l) => this.c2x(l.c, row) * W);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this.lines.forEach((l, i) => {
      const x = xs[i];
      if (x < 6 || x > W - 6) return;
      const gap = Math.min(i > 0 ? x - xs[i - 1] : 99, i < xs.length - 1 ? xs[i + 1] - x : 99);
      const col = Skala.degree(l.deg).color;
      const showSig = lab !== 'noten' && !mini, showName = (lab !== 'zeichen' || mini) && (gap >= 22 || l.root);
      if (showSig) {
        const p = sigilPath(l.deg), sz = gap < 18 ? 11 : 14;
        if (p) { ctx.save(); ctx.translate(x - sz / 2, y0 + rh - (showName ? 38 : 28)); ctx.scale(sz / 24, sz / 24); ctx.strokeStyle = hexA(col, l.root ? 1 : 0.85); ctx.lineWidth = 2.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); ctx.restore(); }
      }
      if (showName) {
        ctx.font = (l.root ? '700 ' : '500 ') + (mini ? 10 : 12) + 'px "Alegreya Sans", system-ui, sans-serif';
        ctx.fillStyle = hexA(col, l.root ? 0.95 : 0.72);
        const nm = Skala.degreeNoteName(sk, l.deg) + (l.root && !mini ? l.oct : '');
        ctx.fillText(nm, x, y0 + rh - (mini ? 9 : 12));
      }
    });
  },
  drawHits(now) {
    for (const hit of VIS.hits) {
      if (hit.t <= this.lastHit) continue;
      const c = 1200 * Math.log2(hit.hz / this.sk.root0);
      let row = 0;
      for (let r = 0; r < this.rows; r++) { const x = this.c2x(c, r); if (x >= 0 && x <= 1) { row = r; break; } }
      const x = this.c2x(c, row);
      if (x < -0.05 || x > 1.05) continue;
      let y = 0.55;
      for (const t of this.touches.values()) if (t.kind === 'note' && Math.abs(this.c2x(t.c, t.row) - x) < 0.02) y = t.y;
      if (y === 0.55) y = 0.3 + ((hit.hz * 7.3) % 1) * 0.5;
      this.ripples.push({ x, y, row, t: hit.t, col: Skala.degree(this.degOf(c)).color, big: hit.vel > 0.7 });
    }
    if (VIS.hits.length) this.lastHit = VIS.hits[VIS.hits.length - 1].t;
  },
  drawRipples(ctx, now, rh) {
    const W = this.W;
    this.ripples = this.ripples.filter((r) => now - r.t < 1600);
    ctx.lineWidth = 1.5;
    for (const r of this.ripples) {
      const age = (now - r.t) / 1600, x = r.x * W, y = (this.rows - 1 - r.row) * rh + (1 - r.y) * rh;
      const rad = (r.big ? 26 : 16) + age * (this.mode === 'mini' ? 50 : 120);
      ctx.strokeStyle = hexA(r.col, (1 - age) * 0.6);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke();
    }
  },
  drawMic(ctx, now, rh) {
    if (!Audio.micOn) { this.micTrail.length = 0; return; }
    const hz = VIS.micHz;
    if (hz > 0) this.micTrail.push({ c: 1200 * Math.log2(hz / this.sk.root0), t: now });
    this.micTrail = this.micTrail.filter((p) => now - p.t < 900);
    if (!this.micTrail.length) return;
    const W = this.W, row = 0, y0 = (this.rows - 1) * rh;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.micTrail) {
      const x = this.c2x(p.c, row) * W, a = 1 - (now - p.t) / 900;
      const sp = this.sprite('#bff7e6');
      ctx.globalAlpha = a * 0.35; ctx.drawImage(sp, x - 10, y0 + rh * 0.08, 20, rh * 0.84);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (hz > 0) {
      const last = this.micTrail[this.micTrail.length - 1], x = this.c2x(last.c, row) * W;
      ctx.fillStyle = '#d8fff2'; ctx.fillRect(x - 1, y0 + 6, 2, rh - (this.mode === 'mini' ? 26 : 40));
      const n = Skala.noteName(hz, Machine.st.skala.a4);
      ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(216,255,242,0.9)';
      ctx.fillText('Stimme ' + n.name + ' ' + (n.dev >= 0 ? '+' : '−') + Math.abs(n.dev), clamp(x, 60, W - 60), y0 + 8);
    }
  },
  drawSparks(ctx, now, rh) {
    // Töne der Planeten und anderer Taktgeber: Funken an ihrer Tonhöhe
    for (const v of VIS.voices) {
      if (v.note >= 0 || !(v.hz > 0)) continue;
      const c = 1200 * Math.log2(v.hz / this.sk.root0);
      let row = -1;
      for (let r = 0; r < this.rows; r++) { const x = this.c2x(c, r); if (x >= 0 && x <= 1) { row = r; break; } }
      if (row < 0) continue;
      const x = this.c2x(c, row) * this.W, y = (this.rows - 1 - row) * rh + (1 - v.y) * rh;
      const col = Skala.degree(this.degOf(c)).color, r = 10 + v.lvl * 26;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, v.lvl * 1.2);
      ctx.drawImage(this.sprite(col), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  },
  voiceLvl(note) { let l = 0; for (const v of VIS.voices) if (v.note === note) l = Math.max(l, v.lvl); return l; },
  drawOrbs(ctx, now, rh) {
    this.orbs = this.orbs.filter((o) => !o.dying || now - o.dying < 1400);
    for (const o of this.orbs) {
      const s = this.orbScreen(o), col = o.kind === 'layer' ? '#9ff5dc' : Skala.degree(this.degOf(o.c)).color;
      let lv = o.kind === 'note' ? this.voiceLvl(o.note) : (VIS.layers.find((l) => l.id === o.id) || { lvl: 0.6 }).lvl;
      const fade = o.dying ? Math.max(0, 1 - (now - o.dying) / 1400) : Math.min(1, (now - o.born) / 300);
      const breathe = 1 + Math.sin(now * 0.002 + o.c * 0.01) * 0.08;
      const R = (this.mode === 'mini' ? 12 : 22) * breathe * (o.grab ? 1.25 : 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (0.35 + lv * 0.65);
      const sp = this.sprite(col), g = R * 3.2;
      ctx.drawImage(sp, s.x - g, s.y - g, g * 2, g * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = hexA(col, 0.9 * fade); ctx.lineWidth = o.kind === 'layer' ? 2 : 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.stroke();
      if (o.kind === 'layer') {
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(s.x, s.y, R + 6, now * 0.0006, now * 0.0006 + TAU); ctx.stroke(); ctx.setLineDash([]);
      } else { ctx.fillStyle = hexA(col, 0.85 * fade); ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.28, 0, TAU); ctx.fill(); }
      if (this.mode === 'full' && o.grab) this.noteTag(ctx, s.x, s.y - R - 16, this.hz(o.c));
    }
  },
  drawTouches(ctx, now, rh) {
    for (const t of this.touches.values()) {
      if (t.kind !== 'note') continue;
      const x = this.c2x(t.c, t.row) * this.W, y = (this.rows - 1 - t.row) * rh + (1 - t.y) * rh;
      const col = Skala.degree(this.degOf(t.c)).color, lv = this.voiceLvl(t.note);
      const R = (this.mode === 'mini' ? 14 : 26) * (1 + lv * 0.35);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + lv * 0.45;
      const sp = this.sprite(col), g = R * 3.4;
      ctx.drawImage(sp, x - g, y - g, g * 2, g * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = hexA('#fff6e2', 0.9); ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, TAU); ctx.fill();
      // Finger und Ton weichen ab, solange er noch einrastet: dünne Linie
      const fx = t.x * this.W;
      if (Math.abs(fx - x) > 3) { ctx.strokeStyle = hexA(col, 0.4); ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(x, y); ctx.stroke(); }
      if (this.mode === 'full') this.noteTag(ctx, x, y - R - 18, this.hz(t.c));
    }
  },
  noteTag(ctx, x, y, hz) {
    const n = Skala.noteName(hz, Machine.st.skala.a4);
    const s = n.name + (Math.abs(n.dev) >= 1 ? ' ' + (n.dev > 0 ? '+' : '−') + Math.abs(n.dev) : '');
    ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 12;
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(x - w / 2, y - 9, w, 18);
    ctx.fillStyle = '#efe7d6'; ctx.fillText(s, x, y);
  },
};

/* ---------- Geisterhand: Gesten als Schleife im Takt ---------- */

const Ghost = {
  layers: [], rec: null, max: 3, idBase: 1000000,
  now() { return Audio.ctx ? Audio.ctx.currentTime : performance.now() / 1000; },
  barSec() { return 4 * 60 / Machine.st.tempo; },
  // aktuelle Taktposition aus der Klangmaschine, fortgeschrieben seit der letzten Meldung
  beatNow() { return VIS.beat + (performance.now() - VIS.t) / 1000 * (VIS.bpm || Machine.st.tempo) / 60; },
  start() {
    if (this.rec) { this.finish(true); return; }
    if (this.layers.length >= this.max) { toast('Drei Geister spielen schon. Lange drücken räumt sie weg.'); return; }
    const bars = Settings.get('geistTakte') || 2;
    const b = this.beatNow(), next = Math.ceil(b / 4 + 0.0001) * 4;
    const wait = (next - b) * 60 / Machine.st.tempo;
    this.rec = { t0: this.now() + wait, len: bars * this.barSec(), ev: [], bars, notes: new Map() };
    App.ghostState();
  },
  capture(type, note, c, y, vel, row) {
    const r = this.rec;
    if (!r) return;
    const t = this.now() - r.t0;
    if (t < 0 || t >= r.len) return;
    r.ev.push({ t, type, note, c, y, vel, row });
    if (type === 'on') r.notes.set(note, true);
  },
  finish(cancel) {
    const r = this.rec; this.rec = null;
    if (cancel || !r || !r.ev.length) { App.ghostState(); if (!cancel) toast('Der Geist blieb leer. Spiel während der Aufnahme auf dem Pad.'); return; }
    // offene Töne am Schleifenende schließen
    // gehaltene Töne klingen bis ans Ende der Schleife
    const open = new Set();
    for (const e of r.ev) { if (e.type === 'on') open.add(e.note); if (e.type === 'off') open.delete(e.note); }
    r.ev = r.ev.filter((e) => e.type !== 'hold');
    for (const n of open) r.ev.push({ t: r.len - 0.02, type: 'off', note: n, c: 0, y: 0, vel: 0, row: 0 });
    r.ev.sort((a, b) => a.t - b.t);
    const L = { ev: r.ev, len: r.len, t0: r.t0, cycle: -1, idx: 0, id: this.layers.length, live: new Map(), base: this.idBase + this.layers.length * 10000 + Math.floor(Math.random() * 5000) };
    this.layers.push(L);
    App.ghostState();
    toast('Geist ' + this.layers.length + ' spielt: ' + r.bars + (r.bars === 1 ? ' Takt' : ' Takte') + ' in Schleife.');
  },
  clear() {
    for (const L of this.layers) for (const n of L.live.keys()) Audio.noteOff(L.base + n % 10000);
    this.layers = []; this.rec = null;
    App.ghostState();
  },
  tick() {
    const now = this.now();
    if (this.rec && now - this.rec.t0 >= this.rec.len) this.finish(false);
    for (const L of this.layers) {
      const pos = now - L.t0;
      if (pos < 0) continue;
      const cyc = Math.floor(pos / L.len), tin = pos - cyc * L.len;
      if (cyc !== L.cycle) {
        if (L.cycle >= 0) { while (L.idx < L.ev.length) this.fire(L, L.ev[L.idx++]); }
        L.cycle = cyc; L.idx = 0;
        if (L.cycle === 0 && tin > 0.5) { L.idx = L.ev.findIndex((e) => e.t >= tin); if (L.idx < 0) L.idx = L.ev.length; }
      }
      while (L.idx < L.ev.length && L.ev[L.idx].t <= tin + 0.012) this.fire(L, L.ev[L.idx++]);
    }
  },
  fire(L, e) {
    const n = L.base + (e.note % 10000);
    const hz = Pad.hz(e.c);
    if (e.type === 'on') { Audio.noteOn(n, hz, e.y, e.vel); L.live.set(e.note, { c: e.c, y: e.y, row: e.row }); }
    else if (e.type === 'mv') { Audio.noteMove(n, hz, e.y); const l = L.live.get(e.note); if (l) { l.c = e.c; l.y = e.y; } }
    else { Audio.noteOff(n); L.live.delete(e.note); }
  },
  draw(ctx, now, rh) {
    const W = Pad.W;
    for (const L of this.layers) {
      for (const l of L.live.values()) {
        const x = Pad.c2x(l.c, l.row || 0) * W, y = (Pad.rows - 1 - (l.row || 0)) * rh + (1 - l.y) * rh;
        if (x < -20 || x > W + 20) continue;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
        const r = Pad.mode === 'mini' ? 26 : 50;
        ctx.drawImage(Pad.sprite('#c9d2ff'), x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(201,210,255,0.55)'; ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.arc(x, y, Pad.mode === 'mini' ? 11 : 20, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (this.rec) {
      const p = clamp((this.now() - this.rec.t0) / this.rec.len, 0, 1);
      ctx.fillStyle = this.now() < this.rec.t0 ? 'rgba(201,210,255,0.35)' : 'rgba(201,210,255,0.8)';
      ctx.fillRect(0, 0, Pad.W * p, 3);
    }
  },
};
