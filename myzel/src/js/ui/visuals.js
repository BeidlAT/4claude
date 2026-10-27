/* =====================================================================
   Visuals
   ===================================================================== */
const cvBg = $('#cvBg'), cvFx = $('#cvFx'), stage = $('#stage');
let midiDot = null;
const bctx = cvBg.getContext('2d'), fctx = cvFx.getContext('2d');
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CSSV = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COL = {};
const HY_MAX = REDUCED ? 120 : MOBILE ? 320 : 520;
const VIS = {
  w: 0, h: 0, dpr: 1, hue: 28, hy: [], rip: [], spores: [], events: [], lvl: 0, t: 0,
  gk: false, lad: 0, glas: 0, zz: false, sv: 1, sa: 1,   // Gestik: the Geflecht glows (Ladung, Schwenken) or sleeps; spore speed, brightness
  rg: false, lx: 0, ly: 0,   // Sporenregen shows; the hyphae's lean (px per frame)
  hueAt(x) { return (this.hue + x * 210) % 360; },
  touchStart(tt) { this.burst(tt.px, tt.py, tt.hue, 8, 1); },
  touchEnd(tt) { if (this.rip.length < 150) this.rip.push({ x: tt.px, y: tt.py, r: 6, v: 1.6, life: 0.6, hue: tt.hue }); },   // a keyboard plays on in a hidden tab, where no frame clears them
  burst(x, y, hue, n, s) {
    const max = HY_MAX;
    for (let i = 0; i < n && this.hy.length < max; i++) {
      this.hy.push({ x, y, a: rand(0, Math.PI * 2), life: rand(0.7, 1), hue: hue + rand(-25, 25), w: 0.6 + s * 1.6 * Math.random(), sp: 1 + s * 2.4 * Math.random() });
    }
    if (this.rip.length < 150) this.rip.push({ x, y, r: 4, v: 2 + s * 3, life: 1, hue });
  },
};
function readColors() {
  for (const k of ['loam', 'loam-2', 'line', 'hypha', 'dim', 'spore', 'lumen', 'lilac', 'rose']) COL[k] = CSSV('--' + k);
  COL.fontNum = CSSV('--font-num');
  COL.lanes = [COL.spore, COL.lumen, COL.lilac, COL.rose];
}
function resize() {
  const r = stage.getBoundingClientRect();
  VIS.w = Math.max(1, r.width); VIS.h = Math.max(1, r.height);
  VIS.dpr = Math.min(PH.on ? PH_DPR : 2, window.devicePixelRatio || 1);   // (the Handy-Modus draws the field at 1.5 × at most: ui/leistung.js)
  for (const c of [cvBg, cvFx]) { c.width = Math.round(VIS.w * VIS.dpr); c.height = Math.round(VIS.h * VIS.dpr); }
  fctx.setTransform(VIS.dpr, 0, 0, VIS.dpr, 0, 0);
  if (!VIS.spores.length) for (let i = 0; i < 36; i++) VIS.spores.push({ x: Math.random(), y: Math.random(), v: rand(0.0003, 0.0012), p: Math.random() * 6 });
  drawBg();
}
function drawBg() {
  const c = bctx, w = VIS.w, h = VIS.h;
  if (!COL.loam) return;
  c.setTransform(VIS.dpr, 0, 0, VIS.dpr, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COL['loam-2']); g.addColorStop(1, COL.loam);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const n = N.notes.length;
  c.font = '500 10px ' + CSSV('--font-num');
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (N.free) {
    const total = 12 * P['t.range'];
    for (let s = 0; s <= total; s++) {
      const x = (s / total) * w, root = s % 12 === 0;
      c.fillStyle = root ? 'rgba(255,179,92,0.32)' : 'rgba(240,230,216,0.07)';
      c.fillRect(Math.round(x) - (root ? 1 : 0), 0, root ? 2 : 1, h);
      if (root) { c.fillStyle = COL.dim; c.fillText(N.notes[s].name, clamp(x, 14, w - 14), h - 10); }
    }
  } else {
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      const x0 = i * cw, nt = N.notes[i];
      if (nt.root) { c.fillStyle = 'rgba(255,179,92,0.075)'; c.fillRect(x0, 0, cw, h); }
      else if (i % 2) { c.fillStyle = 'rgba(240,230,216,0.022)'; c.fillRect(x0, 0, cw, h); }
      if (i) { c.fillStyle = 'rgba(240,230,216,0.08)'; c.fillRect(Math.round(x0), 0, 1, h); }
      // labels: all when columns are wide, staggered on two rows when narrow, roots only when very narrow
      const stagger = cw < 26 && cw * 2 >= 24;
      if (cw >= 26 || stagger || nt.root) {
        c.fillStyle = nt.root ? COL.spore : COL.dim;
        c.font = (cw < 26 ? '500 9px ' : '500 10px ') + COL.fontNum;
        c.fillText(nt.name, clamp(x0 + cw / 2, 12, w - 12), stagger && i % 2 ? h - 22 : h - 10);
      }
    }
  }
  for (const yy of [0.25, 0.5, 0.75]) { c.fillStyle = 'rgba(240,230,216,0.045)'; c.fillRect(0, Math.round(h * yy), w, 1); }
}
// Drawn about 60 times a second at most: a 90- or 120-Hz display calls frame() more often, and the field's motion is
// counted per drawn frame (spores, hyphae, ripples, the fades – made at 60 Hz, they ran faster there) – half the
// drawing for the same picture. What plays (the controllers' values, MPE bends, the mod layer) still runs on every call.
// The Handy-Modus under load (PH.load, ui/leistung.js) draws it about 30 times a second: each drawn frame then moves the
// field two steps (VIS.k) and fades it as two would – the same speed and the same trails, half the drawing.
const FR = { iv: 16.7, prev: 0, acc: 0, drew: false };
const FADE = [null, 'rgba(0,0,0,' + (REDUCED ? 0.4 : 0.085) + ')', 'rgba(0,0,0,' + (1 - Math.pow(1 - (REDUCED ? 0.4 : 0.085), 2)).toFixed(4) + ')'];
function frameCtl() {
  if (MIDI.mbDue) midiFrame();
  if (MAP.due) mapFlush();   // controller values of this frame
  if (MOD.due || MOD.n) modFlush();   // the mod layer: what Gestik and the Formen targets deflect
}
// (phone report 22.10.2026: the next frame is asked for first, and the parts after the field each on their own – one that
// throws can no longer stop the drawing, the meters, the recorder's time or the count-in for good)
function frame(ts) { requestAnimationFrame(frame); if (PH.on || LM.on) phFrame(ts); tickTry(20, () => frameBody(ts)); }
function frameBody(ts) {
  const T = PH.load ? 33.33 : 16.67;   // (the drawing's interval: 60 frames a second, the Handy-Modus under load 30)
  if (FR.prev) { const d = ts - FR.prev; if (d > 2 && d < 40) FR.iv += (d - FR.iv) * 0.1; FR.acc = Math.min(FR.acc + d, T + 33.33); }
  FR.prev = ts;
  FR.drew = false;
  if (FR.iv < T * 0.75 && FR.acc < T - 1.17) { frameCtl(); return; }   // (the display's frame interval, smoothed)
  FR.acc = Math.max(0, FR.acc - T);
  FR.drew = true;
  const k = (VIS.k = T > 20 && FR.iv < 25 ? 2 : 1);   // (steps of the field's motion in this drawn frame)
  const dt = Math.min(0.05, (ts - (VIS.t || ts)) / 1000);
  VIS.t = ts;
  if (!REDUCED) VIS.hue = (VIS.hue + dt * 7) % 360;
  const c = fctx, w = VIS.w, h = VIS.h;
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = FADE[k];
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'lighter';
  const now = A.ctx ? A.ctx.currentTime : 0;
  // scheduled events
  if (VIS.events.length) {
    const keep = [];
    for (const ev of VIS.events) {
      if (ev.t > now) { keep.push(ev); continue; }
      if (ev.kind === 'step') { SEQ.lanes[ev.lane].cur = ev.step; continue; }
      if (ev.kind === 'hx') { if (ev.t >= now - 0.25) hxVisAdd(ev); continue; }   // Hexenring: a loop's note
      if (ev.t < now - 0.25) continue;   // stale (page was hidden): skip the burst
      else VIS.burst(ev.x * w, (1 - ev.y) * h, ev.hue != null ? ev.hue : VIS.hueAt(ev.x), ev.n || (ev.lane != null ? 6 : 9), ev.s || 0.7);   // (n: Sporenregen's small bloom)
    }
    VIS.events = keep;
  }
  if (VIS.gk) gkVisFrame(c, w, h, dt);
  if (VIS.rg) rgVisFrame(c, w, h);   // Sporenregen: Keime, spores, the slope
  // spores
  for (const s of VIS.spores) {
    if (VIS.rg) { rgSpore(s); if (k > 1) rgSpore(s); }   // raining: they follow the slope instead of rising
    else { s.y -= s.v * (REDUCED ? 0 : VIS.sv) * k; if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); } }
    const a = (0.12 + 0.1 * Math.sin(ts / 900 + s.p)) * VIS.sa;
    c.fillStyle = 'hsla(' + ((VIS.hue + s.x * 120) % 360) + ',70%,70%,' + a.toFixed(3) + ')';
    c.fillRect(s.x * w, s.y * h, 1.6, 1.6);
  }
  // touches keep sprouting hyphae; while Anlehnen shapes them their glow leans with the hand (a carried note's hangs
  // on the lean, away from where the finger was)
  // (owner, 25.10.2026: a Touché – any control on Formen · Höhe or Tonhöhe – moves the held note's glow with it: up the
  // field with its height, sideways with its bend)
  const mv = !GA.vis && (MOD.t.hoehe.s.size > 0 || MOD.t.bend.s.size > 0), gnw = GA.vis || mv ? modNewest() : null, mt = mv && A.ctx ? A.ctx.currentTime : 0;
  for (const tt of touches.values()) {
    const q = GA.vis ? gaGlow(tt, gnw) : mv ? [tt.px + (modCents(tt, gnw, mt) / 100) * (w / (12 * P['t.range'])), (1 - modY(tt, gnw, mt)) * h] : null, gx = q ? q[0] : tt.px, gy = q ? q[1] : tt.py;
    for (let i = 0; i < k; i++) if (Math.random() < 0.6) VIS.burst(mv ? gx : tt.px, mv ? gy : tt.py, tt.hue, 1, 0.5);
    const rr = 26 + 6 * Math.sin(ts / 140);
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, rr * 1.8);
    g.addColorStop(0, 'hsla(' + tt.hue + ',90%,72%,0.35)'); g.addColorStop(1, 'hsla(' + tt.hue + ',90%,60%,0)');
    c.fillStyle = g; c.beginPath(); c.arc(gx, gy, rr * 1.8, 0, Math.PI * 2); c.fill();
  }
  // hyphae: segments are grouped by quantised colour, alpha and width, so each group is one path and one stroke (the
  // groups' arrays and the list's second array are kept from frame to frame: no garbage each frame)
  c.lineCap = 'round';
  const buckets = VIS.bk || (VIS.bk = new Map());
  for (const seg of buckets.values()) seg.length = 0;
  let hy = VIS.hy;
  for (let st = 0; st < k; st++) {
    const keepH = VIS.hyB && VIS.hyB !== hy ? VIS.hyB : [];
    keepH.length = 0;
    for (const f of hy) {
      const nx = f.x + Math.cos(f.a) * f.sp + VIS.lx, ny = f.y + Math.sin(f.a) * f.sp + VIS.ly;   // (Sporenregen: they lean with the slope)
      const hue = ((f.hue % 360) + 360) % 360;
      const key = ((hue / 12) | 0) * 100 + Math.min(5, (f.life * 6) | 0) * 10 + (f.w > 1.2 ? 1 : 0);
      let seg = buckets.get(key);
      if (!seg) { seg = []; buckets.set(key, seg); }
      seg.push(f.x, f.y, nx, ny);
      f.x = nx; f.y = ny; f.a += rand(-0.38, 0.38); f.life -= 0.011; f.sp *= 0.995;
      if (f.life > 0.45 && Math.random() < 0.035 && hy.length + keepH.length < HY_MAX) keepH.push({ x: f.x, y: f.y, a: f.a + pick([-0.7, 0.7]), life: f.life * 0.8, hue: f.hue + 8, w: f.w * 0.7, sp: f.sp });
      if (f.life > 0 && f.x > -10 && f.x < w + 10 && f.y > -10 && f.y < h + 10) keepH.push(f);
    }
    VIS.hyB = hy; hy = keepH;
  }
  for (const [key, seg] of buckets) {
    if (!seg.length) continue;
    const hueQ = Math.floor(key / 100) * 12 + 6, life = ((Math.floor(key / 10) % 10) + 0.5) / 6;
    c.strokeStyle = 'hsla(' + hueQ + ',85%,66%,' + (life * 0.55).toFixed(3) + ')';
    c.lineWidth = key % 10 ? 1.8 : 0.9;
    c.beginPath();
    for (let i = 0; i < seg.length; i += 4) { c.moveTo(seg[i], seg[i + 1]); c.lineTo(seg[i + 2], seg[i + 3]); }
    c.stroke();
  }
  VIS.hy = hy;
  // ripples, grouped the same way
  const keepR = VIS.ripB && VIS.ripB !== VIS.rip ? VIS.ripB : [], rb = VIS.rb || (VIS.rb = new Map());
  keepR.length = 0;
  for (const list of rb.values()) list.length = 0;
  for (const r of VIS.rip) {
    r.r += r.v * k; r.life -= 0.022 * k;
    if (r.life <= 0) continue;
    const hue = ((r.hue % 360) + 360) % 360, key = ((hue / 12) | 0) * 10 + Math.min(5, (r.life * 6) | 0);
    let list = rb.get(key);
    if (!list) { list = []; rb.set(key, list); }
    list.push(r);
    keepR.push(r);
  }
  c.lineWidth = 1.2;
  for (const [key, list] of rb) {
    if (!list.length) continue;
    c.strokeStyle = 'hsla(' + (Math.floor(key / 10) * 12 + 6) + ',80%,70%,' + ((((key % 10) + 0.5) / 6) * 0.5).toFixed(3) + ')';
    c.beginPath();
    for (const r of list) { c.moveTo(r.x + r.r, r.y); c.arc(r.x, r.y, r.r, 0, Math.PI * 2); }
    c.stroke();
  }
  VIS.ripB = VIS.rip; VIS.rip = keepR;
  // scope (and the output level for the meters while no recording tap exists)
  if (A.analyser) {
    A.analyser.getFloatTimeDomainData(A.scopeBuf);
    const b = A.scopeBuf;
    let pk = 0; for (let i = 0; i < b.length; i++) { const x = b[i] < 0 ? -b[i] : b[i]; if (x > pk) pk = x; }
    A.anaPeak = Math.max(A.anaPeak || 0, pk);
    if (pk > 0.01) {
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'hsla(' + ((VIS.hue + 180) % 360).toFixed(0) + ',70%,72%,' + Math.min(0.16, pk * 0.5).toFixed(3) + ')';
      c.lineWidth = 1; c.beginPath();
      const step = Math.max(1, Math.floor(b.length / w));
      for (let i = 0, x = 0; i < b.length; i += step, x += w / (b.length / step)) {
        const y = h * 0.5 - b[i] * h * 0.22;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  // labels above active fingers
  c.globalCompositeOperation = 'source-over';
  if (touches.size) {
    c.font = '500 11px ' + COL.fontNum; c.textAlign = 'center';
    for (const tt of touches.values()) {
      // bending: toward which step ("G4 ↗ A4"), lit once it snapped – iOS has no vibration, this is its snap
      const g = tt.ga, bd = g && g.tn && (g.snap || Math.abs(g.c) >= 12), up = g && (g.snap ? g.snap > 0 : g.c > 0);
      const ly = Math.max(16, tt.py - 46), nm = bd ? tt.name + (up ? ' ↗ ' : ' ↘ ') + g.tn : tt.name;
      c.fillStyle = 'rgba(17,13,11,0.7)';
      const tw = c.measureText(nm).width + 12;
      c.fillRect(tt.px - tw / 2, ly - 12, tw, 17);
      c.fillStyle = (tt.gaT && ts - tt.gaT < 250) || (bd && g.snap) ? COL.lumen : COL.hypha; c.fillText(nm, tt.px, ly);
    }
  }
  tickTry(21, () => hxVisFrame(c, w, h)); tickTry(26, () => hxRailFrame(ts)); if (HXE.ed && !HXE.ed.hidden) tickTry(27, hxEdFrame);   // Hexenring: its rings on the field, the Ringleiste
  tickTry(22, () => updateMeters(dt));
  const pan = UI.panel && panelOf(UI.panel);
  if (pan && pan.frame) tickTry(23, () => pan.frame(dt, ts));
  if (midiDot) midiDot.classList.toggle('on', ts - MIDI.flash < 140);
  tickTry(24, frameCtl);
  if (UI.panel === 'dev' && ts - (VIS.devT || 0) > 400) { VIS.devT = ts; tickTry(25, updDevLive); }
}

