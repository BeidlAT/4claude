// Sphärenwerk – die Werkbank. Organe sind Messingplatten mit Drehreglern und Buchsen; Kabel hängen mit
// Schwerkraft dazwischen und leuchten mit dem Signal. Umbau: am Namensschild ziehen (Neuanordnung),
// umdrehen (Rückseite mit weiteren Reglern), in leere Felder neue Organe einsetzen (Erweiterung).
'use strict';

const ICONS = {
  altar: 'M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1 M8.4 12a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0',
  stimmen: 'M3 8.5c3-4 6 4 9 0s6-4 9 0 M3 13.5c3-4 6 4 9 0s6-4 9 0 M3 18.5c3-4 6 4 9 0s6-4 9 0',
  schlagwerk: 'M3.5 17.5h17 M6 20.5h12 M14.2 4.6l-6 9 M17.2 3.4a2.2 2.2 0 1 1 -3.1 3.1a2.2 2.2 0 1 1 3.1 -3.1',
  atem: 'M12 3.5l8.5 16H3.5Z M6.6 14.2h10.8',
  spiegel: 'M12 3v18 M9 6.5c-4.4 2.4-4.4 8.6 0 11 M15 6.5c4.4 2.4 4.4 8.6 0 11',
  resonator: 'M4 20.5c4-10 11-15 16.5-16.5 M7.5 18.5V9.5 M11 15.8V7.4 M14.5 12.6V5.8 M18 9.4V4.6',
  bandschleife: 'M3.2 11.5a4.3 4.3 0 1 0 8.6 0a4.3 4.3 0 1 0 -8.6 0 M12.2 11.5a4.3 4.3 0 1 0 8.6 0a4.3 4.3 0 1 0 -8.6 0 M7.5 15.8h9 M7.5 11.5h0.01 M16.5 11.5h0.01',
  kathedrale: 'M5 21V11a7 7 0 0 1 14 0v10 M9 21v-6.6a3 3 0 0 1 6 0V21 M12 4V2.4 M3.5 21h17',
  nebel: 'M3 7.5h11 M7 11.5h14 M3 15.5h12 M8 19.5h10',
  gezeiten: 'M3 17c3-3 6 3 9 0s6-3 9 0 M14.6 3.5a5.2 5.2 0 1 0 5.2 7.2a4.2 4.2 0 1 1 -5.2 -7.2Z',
  irrlicht: 'M12 3c3.2 4.2 5.2 6.4 5.2 10.2a5.2 5.2 0 0 1 -10.4 0c0-2.1 1-4 2.1-5.2 0 2.1 1 3.1 2.1 3.1 0-3.1-1-5.2 1-8.1Z',
  uhrwerk: 'M7.4 12a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0 -9.2 0 M12 2.4v3.2 M12 18.4v3.2 M2.4 12h3.2 M18.4 12h3.2 M5.2 5.2l2.3 2.3 M16.5 16.5l2.3 2.3 M5.2 18.8l2.3-2.3 M16.5 7.5l2.3-2.3',
  planeten: 'M2.8 12a9.2 4.2 0 1 0 18.4 0a9.2 4.2 0 1 0 -18.4 0 M9.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0 M18.6 8.2a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0',
  lot: 'M12 2.5v9 M7.5 11.5h9L12 21Z',
};
const KIND_COL = {
  audio: ['#e3963f', '#ffd9a1', '#4a2408'],
  mod: ['#43b99c', '#b5f3e2', '#0b3d32'],
  trig: ['#9b7ef3', '#ddd0ff', '#281861'],
};
const KIND_NAME = { audio: 'Klang', mod: 'Modulation', trig: 'Auslöser' };

/* ---------- Drehregler ---------- */

class Knob {
  constructor(view, pid, ringBound) {
    this.view = view; this.ringBound = ringBound; this.pid = pid;
    this.el = h('div', { class: 'knob' });
    this.build();
  }
  get param() { return this.view.def.pmap.get(this.realId()); }
  realId() { return this.ringBound ? 'r' + Machine.mod(this.view.id).ring + this.pid.slice(1) : this.pid; }
  build() {
    const p = this.param;
    this.el.className = 'knob' + (p.c === 'sw' ? ' sw' : '');
    this.el.dataset.p = this.pid;
    this.el.replaceChildren();
    if (p.c === 'sw') {
      this.lever = h('button', { type: 'button', class: 'lever', 'aria-label': p.label, onclick: () => this.toggle() }, h('i'));
      this.el.append(this.lever, h('div', { class: 'kn-lbl' }, p.label), this.val = h('div', { class: 'kn-val' }));
    } else {
      const steps = Param.steps(p);
      this.dial = h('div', { class: 'kn-dial' + (steps ? ' stepped' : ''), role: 'slider', tabindex: '0', 'aria-label': p.label });
      if (steps && steps <= 24) this.dial.style.setProperty('--steps', steps);
      this.cap = h('div', { class: 'kn-cap' }, h('i', { class: 'kn-ptr' }));
      this.dot = h('i', { class: 'kn-dot' });
      this.dial.append(h('i', { class: 'kn-arc' }), h('i', { class: 'kn-marc' }), this.cap, this.dot);
      if (p.mod && !this.ringBound) {
        this.jack = h('span', { class: 'kjack', 'data-mid': this.view.id, 'data-port': p.id, 'data-dir': 'in', 'data-kind': 'mod', 'aria-label': 'Modulationsbuchse ' + p.label });
        this.dial.append(this.jack);
      }
      this.el.append(this.dial, h('div', { class: 'kn-lbl' }, p.label), this.val = h('div', { class: 'kn-val' }));
      this.bindDrag();
    }
    this.refresh();
  }
  refresh() {
    const m = Machine.mod(this.view.id), p = this.param, v = m.vals[p.id];
    if (p.c === 'sw') { this.lever.setAttribute('aria-pressed', String(v >= 0.5)); this.el.classList.toggle('on', v >= 0.5); }
    else { this.el.style.setProperty('--v', v); this.dial.setAttribute('aria-valuetext', Param.format(p, v, m.vals)); }
    this.val.textContent = Param.format(p, v, m.vals);
  }
  toggle() {
    const m = Machine.mod(this.view.id), p = this.param;
    Machine.checkpoint();
    Machine.setParam(this.view.id, p.id, m.vals[p.id] >= 0.5 ? 0 : 1);
  }
  bindDrag() {
    let v0 = 0, lastTap = 0;
    dragger(this.dial, {
      down: (e) => { if (e.target.classList.contains('kjack')) return false; v0 = Machine.mod(this.view.id).vals[this.param.id]; },
      move: (e, dx, dy, st) => {
        if (!st.cp) { Machine.checkpoint(); st.cp = true; }
        const p = this.param, fine = Math.abs(dx) > 70 ? 6 : 1;
        let v = clamp(v0 - dy / (210 * fine), 0, 1);
        Machine.setParam(this.view.id, p.id, v);
        Werk.showBubble(this.dial, p.label + ' · ' + Param.format(p, Machine.mod(this.view.id).vals[p.id], Machine.mod(this.view.id).vals));
      },
      up: () => Werk.hideBubble(),
      tap: () => {
        const now = performance.now();
        if (now - lastTap < 340) { Machine.checkpoint(); Machine.setParam(this.view.id, this.param.id, Param.defNorm(this.param)); toast(this.param.label + ' zurückgesetzt'); }
        else Werk.showBubble(this.dial, this.param.label + ' · ' + Param.format(this.param, Machine.mod(this.view.id).vals[this.param.id], Machine.mod(this.view.id).vals), 900);
        lastTap = now;
      },
    });
    this.dial.addEventListener('keydown', (e) => {
      const p = this.param, st = Param.steps(p), d = st ? 1 / st : 0.02;
      const v = Machine.mod(this.view.id).vals[p.id];
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { Machine.setParam(this.view.id, p.id, v + d); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { Machine.setParam(this.view.id, p.id, v - d); e.preventDefault(); }
    });
  }
  // Modulationsbereich und aktueller Wert als Bogen und Punkt
  showMod(lo, hi, cur) {
    if (!this.dial) return;
    if (lo == null) { this.el.classList.remove('modded'); return; }
    this.el.classList.add('modded');
    this.el.style.setProperty('--m0', lo); this.el.style.setProperty('--m1', hi); this.el.style.setProperty('--vm', cur);
  }
}

/* ---------- Ein Organ auf der Werkbank ---------- */

class ModView {
  constructor(m) {
    this.id = m.id; this.type = m.type; this.def = ORGANE[m.type];
    this.knobs = []; this.jacks = new Map(); this.joff = new Map();
    this.x = 0; this.y = 0; this.flipped = false;
    this.build();
  }
  build() {
    const def = this.def, m = Machine.mod(this.id);
    const flip = h('button', { type: 'button', class: 'icon-btn flip', 'aria-label': def.name + ' umdrehen', title: 'Umdrehen', onclick: () => this.flip() },
      svgIcon('M4 12a8 8 0 0 1 14-5.3 M18.5 3v4h-4 M20 12a8 8 0 0 1 -14 5.3 M5.5 21v-4h4'));
    this.plate = h('header', { class: 'plate' }, svgIcon(ICONS[this.type], 'mod-ico'), h('h3', null, def.name), flip);
    const front = h('div', { class: 'face front' });
    if (def.display) {
      this.cv = h('canvas', { class: 'disp' + (def.big ? ' big' : '') + (['rings', 'level'].includes(def.display) ? ' disp-hit' : '') });
      this.dispWrap = h('div', { class: 'disp-wrap' + (def.big ? ' big' : '') }, this.cv);
      front.append(this.dispWrap);
      this.addDisplayControls();
    }
    const fk = h('div', { class: 'knobs' + (def.front.length > 6 ? ' many' : '') });
    for (const pid of def.front) { const k = new Knob(this, pid, pid.startsWith('@')); this.knobs.push(k); fk.append(k.el); }
    front.append(fk);
    const back = h('div', { class: 'face back' });
    if (def.back.length) {
      const bk = h('div', { class: 'knobs small' });
      for (const pid of def.back) { const k = new Knob(this, pid, pid.startsWith('@')); this.knobs.push(k); bk.append(k.el); }
      back.append(bk);
    }
    back.append(h('p', { class: 'lore' }, def.lore));
    const acts = h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn small', onclick: () => { Machine.resetMod(this.id); toast(def.name + ': Grundeinstellung'); } }, 'Zurücksetzen'));
    if (!def.fixed) acts.append(confirmButton('Ausbauen', 'Wirklich ausbauen?', () => { Machine.remove(this.id); toast(def.name + ' ausgebaut', 4000, { label: 'Rückgängig', fn: () => Machine.undo() }); }, 'small warn'));
    back.append(acts);
    this.faces = h('div', { class: 'faces' }, front, back);
    const jacks = h('footer', { class: 'jacks' });
    const ins = h('div', { class: 'ins' }), outs = h('div', { class: 'outs' });
    for (const j of def.ins) ins.append(this.jackEl(j, 'in'));
    for (const j of def.outs) outs.append(this.jackEl(j, 'out'));
    jacks.append(ins, outs);
    this.el = h('section', { class: `mod g-${def.group} t-${this.type}`, 'data-id': this.id, 'aria-label': def.name },
      h('div', { class: 'mod-in' }, this.plate, this.faces, jacks),
      h('i', { class: 'screw s1' }), h('i', { class: 'screw s2' }), h('i', { class: 'screw s3' }), h('i', { class: 'screw s4' }));
    this.bindPlate();
    this.place(m.c, m.r, false);
  }
  jackEl(j, dir) {
    const el = h('div', { class: 'jk k-' + j.kind + ' d-' + dir, 'data-mid': this.id, 'data-port': j.id, 'data-dir': dir, 'data-kind': j.kind, title: j.label + ' (' + KIND_NAME[j.kind] + ')' },
      h('span', { class: 'jk-hole' }), h('span', { class: 'jk-lbl' }, j.label));
    this.jacks.set(dir + ':' + j.id, el);
    return el;
  }
  addDisplayControls() {
    const t = this.type, wrap = this.dispWrap;
    if (t === 'uhrwerk' || t === 'planeten') {
      const lv = h('button', { type: 'button', class: 'run', 'aria-label': 'Lauf', onclick: () => {
        const m = Machine.mod(this.id); Machine.setParam(this.id, 'lauf', m.vals.lauf >= 0.5 ? 0 : 1);
      } }, h('i'), h('span', null, 'Lauf'));
      this.runBtn = lv; wrap.append(lv);
    }
    if (t === 'atem') {
      wrap.append(h('div', { class: 'disp-acts' },
        h('button', { type: 'button', class: 'mini', onclick: () => Audio.send({ t: 'cap' }) }, 'Fangen'),
        h('button', { type: 'button', class: 'mini', onclick: () => Audio.send({ t: 'lyr', op: 'all' }) }, 'Lösen')));
    }
    if (t === 'lot') {
      wrap.append(h('div', { class: 'disp-acts' }, h('button', { type: 'button', class: 'mini', onclick: async () => {
        try { await Audio.tiltStart(); Audio.tiltCenter(); toast('Lot geweckt. Die jetzige Haltung ist die Mitte.'); }
        catch (e) { toast(e.code === 'viewer' ? 'Der Neigungssensor geht nur, wenn das Sphärenwerk als eigene Webseite läuft.' : e.code === 'denied' ? 'Der Zugriff auf die Bewegungssensoren wurde abgelehnt.' : 'Dieses Gerät meldet keine Neigung.', 5000); }
      } }, 'Wecken / Mitte')));
    }
    if (t === 'uhrwerk') {
      this.cv.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const r = this.cv.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - cx, e.clientY - cy) / (r.height / 2);
        const ring = d > 0.78 ? 1 : d > 0.5 ? 2 : 3;
        Machine.setRing(this.id, ring);
      });
    }
  }
  refreshAll() { for (const k of this.knobs) k.refresh(); if (this.runBtn) this.runBtn.setAttribute('aria-pressed', String(Machine.mod(this.id).vals.lauf >= 0.5)); }
  rebindRing() { for (const k of this.knobs) if (k.ringBound) k.build(); }
  place(c, r, anim) {
    this.x = c * CELL_W + 8; this.y = r * CELL_H + 8;
    this.el.classList.toggle('anim', !!anim);
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
    if (anim) setTimeout(() => this.el.classList.remove('anim'), 400);
  }
  flip() {
    this.flipped = !this.flipped;
    this.faces.classList.toggle('flipped', this.flipped);
    this.el.classList.toggle('is-flipped', this.flipped);
  }
  measure() {
    const mr = this.el.getBoundingClientRect(), s = Werk.s;
    for (const [k, el] of this.jacks) {
      const r = el.querySelector('.jk-hole').getBoundingClientRect();
      this.joff.set(k, { x: (r.left + r.width / 2 - mr.left) / s, y: (r.top + r.height / 2 - mr.top) / s });
    }
    for (const kn of this.knobs) {
      if (!kn.jack) continue;
      const r = kn.jack.getBoundingClientRect();
      this.joff.set('in:' + kn.param.id, { x: (r.left + r.width / 2 - mr.left) / s, y: (r.top + r.height / 2 - mr.top) / s });
    }
  }
  jackPos(key) {
    const o = this.joff.get(key);
    if (!o) return { x: this.x + 124, y: this.y + 300 };
    return { x: this.x + o.x, y: this.y + o.y };
  }
  bindPlate() {
    let start = null;
    dragger(this.plate, {
      down: (e) => { if (e.target.closest('button')) return false; start = { x: this.x, y: this.y }; },
      move: (e, dx, dy) => {
        this.el.classList.add('lifted');
        this.x = start.x + dx / Werk.s; this.y = start.y + dy / Werk.s;
        this.el.style.transform = `translate(${this.x}px, ${this.y}px) scale(1.03)`;
        Werk.dropTarget(this);
        Werk.wake();
      },
      up: (e, st) => {
        this.el.classList.remove('lifted');
        if (!st.moved) return;
        const c = Math.max(0, Math.round((this.x - 8) / CELL_W)), r = Math.max(0, Math.round((this.y - 8) / CELL_H));
        Werk.dropTarget(null);
        const m = Machine.mod(this.id);
        if (m.c === c && m.r === r) { this.place(c, r, true); Werk.wake(); return; }
        Machine.move(this.id, c, r);
      },
    });
  }
}

/* ---------- Kabel mit Schwerkraft ---------- */

class CableView {
  constructor(c) {
    this.c = c; this.n = 16;
    this.p = new Float32Array(this.n * 2); this.o = new Float32Array(this.n * 2);
    this.init = false; this.e = 1; this.ax = 0; this.ay = 0; this.bx = 0; this.by = 0;
    let hsh = 0; for (const ch of c.id || 'x') hsh = (hsh * 31 + ch.charCodeAt(0)) | 0;
    this.tint = ((hsh >>> 0) % 1000) / 1000;
    this.flow = Math.random();
  }
  step(ax, ay, bx, by) {
    const n = this.n, p = this.p, o = this.o;
    const moved = Math.abs(ax - this.ax) + Math.abs(ay - this.ay) + Math.abs(bx - this.bx) + Math.abs(by - this.by) > 0.01;
    this.ax = ax; this.ay = ay; this.bx = bx; this.by = by;
    const dist = Math.hypot(bx - ax, by - ay);
    const L = Math.max(dist * 1.07, dist + 46) / (n - 1);
    if (!this.init) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), sag = Math.sin(Math.PI * t) * (24 + dist * 0.14);
        p[i * 2] = o[i * 2] = ax + (bx - ax) * t; p[i * 2 + 1] = o[i * 2 + 1] = ay + (by - ay) * t + sag;
      }
      this.init = true; this.e = 1;
    }
    if (!moved && this.e < 0.02) return false;
    let e = 0;
    for (let i = 1; i < n - 1; i++) {
      const x = p[i * 2], y = p[i * 2 + 1];
      const vx = (x - o[i * 2]) * 0.94, vy = (y - o[i * 2 + 1]) * 0.94;
      o[i * 2] = x; o[i * 2 + 1] = y;
      p[i * 2] = x + vx; p[i * 2 + 1] = y + vy + 0.55;
      e += Math.abs(vx) + Math.abs(vy);
    }
    p[0] = ax; p[1] = ay; p[(n - 1) * 2] = bx; p[(n - 1) * 2 + 1] = by;
    for (let it = 0; it < 5; it++) {
      for (let i = 0; i < n - 1; i++) {
        const x1 = p[i * 2], y1 = p[i * 2 + 1], x2 = p[i * 2 + 2], y2 = p[i * 2 + 3];
        const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 0.0001;
        if (d <= L) continue;
        const k = (d - L) / d * 0.5;
        if (i > 0) { p[i * 2] += dx * k; p[i * 2 + 1] += dy * k; }
        if (i + 1 < n - 1) { p[i * 2 + 2] -= dx * k; p[i * 2 + 3] -= dy * k; }
      }
      p[0] = ax; p[1] = ay; p[(n - 1) * 2] = bx; p[(n - 1) * 2 + 1] = by;
    }
    this.e = e / n;
    return true;
  }
  path(ctx) {
    const p = this.p, n = this.n;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 1; i < n - 1; i++) { const mx = (p[i * 2] + p[i * 2 + 2]) / 2, my = (p[i * 2 + 1] + p[i * 2 + 3]) / 2; ctx.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx, my); }
    ctx.lineTo(p[(n - 1) * 2], p[(n - 1) * 2 + 1]);
  }
  pointAt(t) {
    const n = this.n, f = t * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i, p = this.p;
    return [p[i * 2] + (p[i * 2 + 2] - p[i * 2]) * u, p[i * 2 + 1] + (p[i * 2 + 3] - p[i * 2 + 1]) * u];
  }
  dist(x, y) {
    let best = 1e9; const p = this.p;
    for (let i = 0; i < this.n - 1; i++) {
      const x1 = p[i * 2], y1 = p[i * 2 + 1], x2 = p[i * 2 + 2], y2 = p[i * 2 + 3];
      const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
      const t = clamp(((x - x1) * dx + (y - y1) * dy) / l, 0, 1);
      best = Math.min(best, Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t)));
    }
    return best;
  }
}

/* ---------- Die Werkbank ---------- */

const Werk = {
  el: null, bench: null, cv: null, cx: null, dpr: 1, W: 0, H: 0,
  tx: 16, ty: 16, s: 1,
  views: new Map(), cviews: new Map(), slots: [],
  loose: null, ptrs: new Map(), pinch: null, awake: 60, shown: true,
  bubbleEl: null,

  init() {
    this.el = $('#werk'); this.bench = $('#bench'); this.cv = $('#cables'); this.cx = this.cv.getContext('2d');
    this.bubbleEl = $('#bubble');
    Machine.on((ev) => this.onMachine(ev));
    this.bindBench();
    // Fokus auf einem Regler darf die Werkbank nicht verschieben (sie bewegt sich nur per Transform)
    this.el.addEventListener('scroll', () => { this.el.scrollTop = 0; this.el.scrollLeft = 0; });
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.el);
    this.build();
    this.resize();
    requestAnimationFrame(() => this.fit(true));
  },
  build() {
    this.bench.replaceChildren();
    this.views.clear(); this.cviews.clear();
    for (const m of Machine.st.mods) this.addView(m);
    this.buildSlots();
    requestAnimationFrame(() => { this.measureAll(); this.syncCables(); this.refreshMods(); this.wake(); });
  },
  addView(m) {
    const v = new ModView(m);
    this.views.set(m.id, v);
    this.bench.append(v.el);
    return v;
  },
  measureAll() { for (const v of this.views.values()) v.measure(); },
  onMachine(ev) {
    switch (ev.k) {
      case 'all': this.build(); break;
      case 'add': { const v = this.addView(ev.m); v.el.classList.add('arrive'); this.buildSlots(); requestAnimationFrame(() => { v.measure(); this.syncCables(); this.wake(); }); break; }
      case 'del': { const v = this.views.get(ev.id); if (v) { v.el.remove(); this.views.delete(ev.id); } this.buildSlots(); this.syncCables(); break; }
      case 'move': {
        for (const id of [ev.id, ev.other]) { if (!id) continue; const v = this.views.get(id), m = Machine.mod(id); if (v && m) v.place(m.c, m.r, true); }
        this.buildSlots(); this.wake(); break;
      }
      case 'param': { const v = this.views.get(ev.id); if (v) { for (const k of v.knobs) if (k.param.id === ev.p) k.refresh(); if (ev.p === 'takt') for (const k of v.knobs) if (k.param.id === 'zeit') k.refresh(); if (ev.p === 'lauf' && v.runBtn) v.runBtn.setAttribute('aria-pressed', String(ev.v >= 0.5)); } break; }
      case 'ring': { const v = this.views.get(ev.id); if (v) v.rebindRing(); break; }
      case 'cables': this.syncCables(); this.refreshMods(); break;
      case 'tempo': for (const v of this.views.values()) if (v.type === 'bandschleife') for (const k of v.knobs) if (k.param.id === 'zeit') k.refresh(); break;
    }
  },
  refreshMods() {
    for (const v of this.views.values()) {
      v.refreshAll();
      for (const [k, el] of v.jacks) {
        const [dir, port] = k.split(':');
        el.classList.toggle('plugged', Machine.cablesAt(v.id, port, dir).length > 0);
      }
      for (const kn of v.knobs) if (kn.jack) kn.jack.classList.toggle('plugged', Machine.cablesAt(v.id, kn.param.id, 'in').length > 0);
    }
  },
  syncCables() {
    const ids = new Set(Machine.st.cables.map((c) => c.id));
    for (const id of this.cviews.keys()) if (!ids.has(id)) this.cviews.delete(id);
    for (const c of Machine.st.cables) {
      const cv = this.cviews.get(c.id);
      if (cv) cv.c = c; else this.cviews.set(c.id, new CableView(c));
    }
    this.wake();
  },
  ends(c) {
    const s = this.views.get(c.from.m), d = this.views.get(c.to.m);
    if (!s || !d) return null;
    const a = s.jackPos('out:' + c.from.p), b = d.jackPos('in:' + c.to.p);
    return [a.x, a.y, b.x, b.y];
  },

  /* --- leere Felder zum Einsetzen --- */
  buildSlots() {
    for (const el of this.slots) el.remove();
    this.slots = [];
    const mods = Machine.st.mods;
    let mc = 0, mr = 0;
    for (const m of mods) { mc = Math.max(mc, m.c); mr = Math.max(mr, m.r); }
    if (mods.length >= 18) return;
    for (let r = 0; r <= mr + 1; r++) for (let c = 0; c <= mc + 1; c++) {
      if (Machine.at(c, r)) continue;
      const near = mods.some((m) => Math.abs(m.c - c) + Math.abs(m.r - r) === 1);
      if (!near) continue;
      const el = h('button', { type: 'button', class: 'slot', 'aria-label': 'Organ einsetzen', onclick: () => this.cabinet(c, r) },
        h('span', { class: 'slot-plus' }, '+'), h('span', { class: 'slot-t' }, 'Organ einsetzen'));
      el.style.transform = `translate(${c * CELL_W + 8}px, ${r * CELL_H + 8}px)`;
      this.bench.prepend(el);
      this.slots.push(el);
    }
  },
  dropTarget(view) {
    let g = $('#droptarget');
    if (!view) { if (g) g.hidden = true; return; }
    if (!g) { g = h('div', { id: 'droptarget' }); this.bench.prepend(g); }
    const c = Math.max(0, Math.round((view.x - 8) / CELL_W)), r = Math.max(0, Math.round((view.y - 8) / CELL_H));
    g.hidden = false; g.style.transform = `translate(${c * CELL_W + 8}px, ${r * CELL_H + 8}px)`;
  },

  /* --- Kammer der Organe --- */
  cabinet(c, r) {
    const list = h('div', { class: 'cab' });
    const auto = h('input', { type: 'checkbox', id: 'cab-auto', checked: true });
    const groups = [['quelle', 'Klangquellen'], ['wandler', 'Wandler'], ['puls', 'Taktgeber und Modulation']];
    for (const [g, gname] of groups) {
      list.append(h('h3', { class: 'cab-h' }, gname));
      for (const [type, def] of Object.entries(ORGANE)) {
        if (def.group !== g) continue;
        const n = Machine.count(type), ok = Machine.canAdd(type);
        list.append(h('button', { type: 'button', class: 'cab-item g-' + g, disabled: !ok, onclick: () => {
          const m = Machine.add(type, c, r);
          if (!m) return;
          if (auto.checked) this.autoPatch(m);
          Sheet.close();
          toast(def.name + ' eingesetzt');
        } }, svgIcon(ICONS[type], 'cab-ico'), h('span', { class: 'cab-n' }, def.name), h('span', { class: 'cab-t' }, def.text),
          h('span', { class: 'cab-c' }, ok ? (n ? n + ' von ' + def.max + ' eingesetzt' : 'frei') : 'alle eingesetzt')));
      }
    }
    Sheet.open('Kammer der Organe', h('div', null,
      h('p', { class: 'sheet-note' }, 'Wähle ein Organ für das freie Feld. Kabel steckst du danach selbst, oder du lässt sie passend legen.'),
      h('label', { class: 'check', for: 'cab-auto' }, auto, h('span', null, 'Gleich sinnvoll verkabeln')),
      list), { wide: true });
  },
  autoPatch(m) {
    const st = Machine.st, find = (t) => st.mods.find((x) => x.type === t && x.id !== m.id);
    const sink = find('kathedrale') || find('bandschleife') || find('altar');
    const altar = find('altar');
    const con = (a, ap, b, bp, kind, d) => { if (a && b) Machine.connect({ m: a.id, p: ap }, { m: b.id, p: bp }, kind, d); };
    switch (m.type) {
      case 'stimmen': case 'schlagwerk': case 'nebel': con(m, 'out', sink, 'in', 'audio'); break;
      case 'spiegel': case 'resonator': con(find('atem'), 'out', m, 'in', 'audio'); con(m, 'out', sink, 'in', 'audio'); break;
      case 'bandschleife': case 'kathedrale': con(m, 'out', altar, 'in', 'audio'); break;
      case 'atem': con(m, 'out', sink, 'in', 'audio'); break;
      case 'uhrwerk': con(m, 'I', find('schlagwerk'), 'schlag', 'trig'); break;
      case 'planeten': con(m, 'noten', find('stimmen'), 'noten', 'trig'); break;
      case 'irrlicht': con(m, 'funken', find('schlagwerk'), 'schlag', 'trig'); break;
    }
  },

  /* --- Ansicht: Verschieben und Zoomen --- */
  resize() {
    const r = this.el.getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.max(1, Math.round(r.width * this.dpr)); this.cv.height = Math.max(1, Math.round(r.height * this.dpr));
    this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
    this.wake();
  },
  apply() {
    this.bench.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.s})`;
    this.wake();
  },
  bounds() {
    let mc = 0, mr = 0;
    for (const m of Machine.st.mods) { mc = Math.max(mc, m.c); mr = Math.max(mr, m.r); }
    return { w: (mc + 1) * CELL_W + 16, h: (mr + 1) * CELL_H + 16 };
  },
  // initial: in der Breite passend, nicht kleiner als bedienbar (nach unten schiebt man); sonst alles zeigen
  fit(initial) {
    const b = this.bounds(), pad = 20, tools = 56;
    const sw = (this.W - pad * 2 - tools) / b.w, sh = (this.H - pad * 2) / b.h;
    let s = clamp(Math.min(sw, sh), 0.36, 1.15);
    if (initial && sh < sw * 0.85) s = clamp(Math.min(sw, 1), Math.min(sw, 0.72), 1.1);
    this.s = s;
    this.tx = Math.max(pad, (this.W - tools - b.w * s) / 2);
    this.ty = b.h * s > this.H - pad ? pad * 0.8 : Math.max(pad * 0.6, (this.H - b.h * s) / 2);
    if (b.w * s > this.W - tools) this.tx = pad;
    this.apply();
  },
  zoomAt(f, cx, cy) {
    const s2 = clamp(this.s * f, 0.38, 1.7);
    const k = s2 / this.s;
    this.tx = cx - (cx - this.tx) * k; this.ty = cy - (cy - this.ty) * k; this.s = s2;
    this.apply();
  },
  toBench(clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    return { x: (clientX - r.left - this.tx) / this.s, y: (clientY - r.top - this.ty) / this.s };
  },
  bindBench() {
    const el = this.el;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.knob, .jk, .kjack, button, .plate, .disp-hit, input, select, a')) return;
      const r = el.getBoundingClientRect();
      this.ptrs.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top, x0: e.clientX, y0: e.clientY, t: performance.now() });
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.ptrs.get(e.pointerId);
      if (!p) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (this.ptrs.size === 1) { this.tx += x - p.x; this.ty += y - p.y; this.apply(); }
      p.x = x; p.y = y;
      if (this.ptrs.size === 2 && this.pinch) {
        const [a, b] = [...this.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        this.tx += cx - this.pinch.cx; this.ty += cy - this.pinch.cy;
        this.zoomAt(d / this.pinch.d, cx, cy);
        this.pinch = { d, cx, cy };
      }
    });
    const end = (e) => {
      const p = this.ptrs.get(e.pointerId);
      if (!p) return;
      this.ptrs.delete(e.pointerId);
      if (this.ptrs.size < 2) this.pinch = null;
      if (e.type === 'pointerup' && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6 && performance.now() - p.t < 400) this.tapBench(e);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey) this.zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      else { this.tx -= e.deltaX; this.ty -= e.deltaY; this.apply(); }
    }, { passive: false });
    // Kabel ziehen an Buchsen (auch an den kleinen Buchsen der Regler)
    el.addEventListener('pointerdown', (e) => {
      const j = e.target.closest('.jk, .kjack');
      if (!j) return;
      e.stopPropagation(); e.preventDefault();
      this.jackDown(e, j);
    }, true);
  },
  tapBench(e) {
    const p = this.toBench(e.clientX, e.clientY);
    let best = null, bd = 16 / this.s;
    for (const cv of this.cviews.values()) { const d = cv.dist(p.x, p.y); if (d < bd) { bd = d; best = cv; } }
    if (best) this.cableMenu([best.c], e.clientX, e.clientY);
  },

  /* --- Kabel stecken --- */
  jackInfo(el) { return { mid: el.dataset.mid, port: el.dataset.port, dir: el.dataset.dir, kind: el.dataset.kind }; },
  jackDown(e, el) {
    const info = this.jackInfo(el);
    const st = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    const existing = info.dir === 'in' ? Machine.cablesAt(info.mid, info.port, 'in') : [];
    const mv = (ev) => {
      if (ev.pointerId !== st.id) return;
      if (!st.moved && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 8) { st.moved = true; this.beginLoose(info, existing); }
      if (st.moved && this.loose) { const p = this.toBench(ev.clientX, ev.clientY); this.loose.fx = p.x; this.loose.fy = p.y; this.loose.cx = ev.clientX; this.loose.cy = ev.clientY; this.wake(); }
    };
    const up = (ev) => {
      if (ev.pointerId !== st.id) return;
      window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true);
      if (!st.moved) { this.jackTap(info, ev); return; }
      this.endLoose(ev);
    };
    window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
  },
  beginLoose(info, existing) {
    let fixed = info, picked = null;
    if (existing.length) {
      // gesteckte Eingangsbuchse: das jüngste Kabel aufnehmen und umstecken
      picked = existing[existing.length - 1];
      Machine.disconnect(picked.id);
      fixed = { mid: picked.from.m, port: picked.from.p, dir: 'out', kind: picked.kind };
    }
    const v = this.views.get(fixed.mid);
    const a = v.jackPos(fixed.dir + ':' + fixed.port);
    const cv = new CableView({ id: 'loose', kind: fixed.kind });
    this.loose = { fixed, picked, cv, ax: a.x, ay: a.y, fx: a.x, fy: a.y, cx: 0, cy: 0 };
    // passende Ziele markieren
    this.targets = [];
    for (const j of this.el.querySelectorAll('.jk, .kjack')) {
      const t = this.jackInfo(j);
      const ok = t.kind === fixed.kind && t.dir !== fixed.dir;
      j.classList.toggle('target', ok); j.classList.toggle('dim', !ok);
      if (ok) { const r = j.getBoundingClientRect(); this.targets.push({ info: t, x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
    }
    this.el.classList.add('patching');
  },
  endLoose(ev) {
    const L = this.loose;
    this.loose = null;
    this.el.classList.remove('patching');
    for (const j of this.el.querySelectorAll('.target, .dim')) j.classList.remove('target', 'dim');
    if (!L) return;
    let best = null, bd = 46;
    for (const t of this.targets || []) { const d = Math.hypot(t.x - ev.clientX, t.y - ev.clientY); if (d < bd) { bd = d; best = t.info; } }
    if (best) {
      const out = L.fixed.dir === 'out' ? L.fixed : best, inp = L.fixed.dir === 'out' ? best : L.fixed;
      const c = Machine.connect({ m: out.mid, p: out.port }, { m: inp.mid, p: inp.port }, L.fixed.kind, L.picked && L.picked.depth != null ? L.picked.depth : undefined);
      if (!c && !L.picked) toast('Diese Verbindung gibt es schon.');
    } else if (L.picked) toast('Kabel gelöst', 3500, { label: 'Rückgängig', fn: () => Machine.undo() });
    this.wake();
  },
  jackTap(info, ev) {
    const cabs = info.dir === 'out' ? Machine.cablesAt(info.mid, info.port, 'out') : Machine.cablesAt(info.mid, info.port, 'in');
    if (!cabs.length) {
      const def = ORGANE[Machine.mod(info.mid).type];
      const j = info.kind === 'mod' && info.dir === 'in' ? def.pmap.get(info.port) : (info.dir === 'in' ? def.ins : def.outs).find((x) => x.id === info.port);
      toast((j ? j.label : '') + ': Zieh von hier ein Kabel zu einer passenden Buchse (' + KIND_NAME[info.kind] + ').', 3800);
      return;
    }
    this.cableMenu(cabs, ev.clientX, ev.clientY);
  },
  cableName(c) {
    const s = Machine.mod(c.from.m), d = Machine.mod(c.to.m), sd = ORGANE[s.type], dd = ORGANE[d.type];
    const sj = sd.outs.find((j) => j.id === c.from.p);
    const dj = c.kind === 'mod' ? dd.pmap.get(c.to.p) : dd.ins.find((j) => j.id === c.to.p);
    return sd.name + ' · ' + (sj ? sj.label : c.from.p) + '  →  ' + dd.name + ' · ' + (dj ? dj.label : c.to.p);
  },
  cableMenu(cabs, x, y) {
    const box = h('div', { class: 'cmenu' });
    for (const c of cabs) {
      const row = h('div', { class: 'cm-row k-' + c.kind }, h('div', { class: 'cm-name' }, this.cableName(c)));
      if (c.kind === 'mod') {
        const id = 'depth-' + c.id;
        row.append(sliderRow(id, 'Tiefe', -100, 100, 1, Math.round(c.depth * 100), (v) => (v > 0 ? '+' : '') + Math.round(v) + ' %', (v) => Machine.setDepth(c.id, v / 100)));
      }
      row.append(h('button', { type: 'button', class: 'btn small warn', onclick: () => { Machine.disconnect(c.id); Pop.close(); toast('Kabel gelöst', 3500, { label: 'Rückgängig', fn: () => Machine.undo() }); } }, 'Kabel lösen'));
      box.append(row);
    }
    Pop.open(x, y, box);
  },

  /* --- Wertanzeige beim Drehen --- */
  showBubble(el, text, ms) {
    const b = this.bubbleEl, r = el.getBoundingClientRect();
    b.textContent = text; b.hidden = false;
    const bw = b.offsetWidth;
    b.style.left = clamp(r.left + r.width / 2 - bw / 2, 6, window.innerWidth - bw - 6) + 'px';
    b.style.top = Math.max(6, r.top - 38) + 'px';
    clearTimeout(this.bt);
    if (ms) this.bt = setTimeout(() => this.hideBubble(), ms);
  },
  hideBubble() { clearTimeout(this.bt); this.bt = setTimeout(() => { this.bubbleEl.hidden = true; }, 500); },

  /* --- Zeichnen --- */
  wake() { this.awake = 90; },
  frame(t) {
    if (!this.shown) return;
    const ctx = this.cx, dpr = this.dpr;
    // Kabel laufen auch ohne Bewegung, solange Signal fließt (Licht auf den Leitungen)
    const flowing = VIS.t > 0 && performance.now() - VIS.t < 500;
    if (this.awake <= 0 && !flowing) return;
    this.fc = (this.fc || 0) + 1;
    if (this.awake <= 0 && (this.fc & 1)) return;
    this.awake--;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr * this.s, 0, 0, dpr * this.s, dpr * this.tx, dpr * this.ty);
    const now = performance.now();
    for (const cv of this.cviews.values()) {
      const e = this.ends(cv.c);
      if (!e) continue;
      if (cv.step(e[0], e[1], e[2], e[3])) this.awake = Math.max(this.awake, 2);
      this.drawCable(ctx, cv, cv.c.kind, this.signal(cv.c, now), now);
    }
    if (this.loose) {
      const L = this.loose;
      L.cv.step(L.ax, L.ay, L.fx, L.fy);
      this.drawCable(ctx, L.cv, L.fixed.kind, 0.4, now);
      this.awake = Math.max(this.awake, 2);
    }
  },
  signal(c, now) {
    const vs = VIS.mods.get(c.from.m);
    if (!vs) return 0;
    const s = Machine.mod(c.from.m); if (!s) return 0;
    const def = ORGANE[s.type];
    if (c.kind === 'audio') { const i = def.audioOut.findIndex((j) => j.id === c.from.p); return i >= 0 && vs.lv[i] ? Math.min(1, vs.lv[i] * 2.5) : 0; }
    if (c.kind === 'mod') { const i = def.modOut.findIndex((j) => j.id === c.from.p); return i >= 0 ? Math.min(1, Math.abs(vs.mo[i] || 0)) : 0; }
    const i = def.trigOut.findIndex((j) => j.id === c.from.p);
    let pulse = 0;
    for (const ev of VIS.trig) if (ev.id === c.from.m && ev.port === i) pulse = Math.max(pulse, 1 - (now - ev.t) / 600);
    return Math.max(0, pulse);
  },
  drawCable(ctx, cv, kind, sig, now) {
    const col = KIND_COL[kind] || KIND_COL.audio;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    cv.path(ctx);
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = col[2]; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = col[0]; ctx.globalAlpha = 0.86 + cv.tint * 0.14; ctx.lineWidth = 5; ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = col[1]; ctx.lineWidth = 1.4;
    ctx.save(); ctx.translate(-0.8, -1.2); cv.path(ctx); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = 1;
    // Licht auf der Leitung
    if (sig > 0.02 && !REDUCED_MOTION) {
      ctx.globalCompositeOperation = 'lighter';
      const k = kind === 'trig' ? 1 : 3;
      cv.flow = (cv.flow + (kind === 'mod' ? 0.004 : 0.012)) % 1;
      const sp = Pad.sprite(col[1]);
      for (let i = 0; i < k; i++) {
        const t = kind === 'trig' ? 1 - sig : (cv.flow + i / k) % 1;
        const [x, y] = cv.pointAt(t);
        const r = 9 + sig * 11;
        ctx.globalAlpha = Math.min(1, sig * 1.2);
        ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // Stecker
    for (const [x, y] of [[cv.p[0], cv.p[1]], [cv.p[cv.n * 2 - 2], cv.p[cv.n * 2 - 1]]]) {
      ctx.fillStyle = col[2]; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fill();
      ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(x, y, 5.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e6cf9a'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
    }
  },
  // Modulationsbögen an den Reglern und Anzeigen der Organe (etwa 30-mal pro Sekunde)
  slow(t) {
    if (!this.shown) return;
    const cabs = Machine.st.cables;
    const mods = new Map();
    for (const c of cabs) {
      if (c.kind !== 'mod') continue;
      const s = Machine.mod(c.from.m); if (!s) continue;
      const j = ORGANE[s.type].modOut.find((x) => x.id === c.from.p);
      const vs = VIS.mods.get(c.from.m), i = ORGANE[s.type].modOut.indexOf(j);
      const cur = vs && vs.mo ? vs.mo[i] || 0 : 0;
      const key = c.to.m + '|' + c.to.p;
      const o = mods.get(key) || { lo: 0, hi: 0, cur: 0 };
      const a = j && j.uni ? 0 : -1;
      o.lo += Math.min(a * c.depth, c.depth); o.hi += Math.max(a * c.depth, c.depth); o.cur += cur * c.depth;
      mods.set(key, o);
    }
    for (const v of this.views.values()) {
      const m = Machine.mod(v.id); if (!m) continue;
      for (const k of v.knobs) {
        if (!k.dial) continue;
        const o = mods.get(v.id + '|' + k.param.id);
        if (!o) { k.showMod(null); continue; }
        const base = m.vals[k.param.id];
        k.showMod(clamp(base + o.lo, 0, 1), clamp(base + o.hi, 0, 1), clamp(base + o.cur, 0, 1));
      }
      if (v.cv && Displays.visible(v)) Displays.draw(v, t);
    }
  },
};
