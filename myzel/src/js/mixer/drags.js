/* ---------- drags and the floating value tip ---------- */
// Relative drags for faders and knobs: they never jump to the finger. On touch the first pixels decide the axis –
// across it the gesture belongs to the scroller (rack or panel). Holding still for 0.4 s switches to fine (×0.2)
// until release, shown as "fein" in the value tip; Shift does the same with a mouse. axis 'xy' (the EQ's Mitten)
// moves both ways at once: get() / set() / span() then carry [x, y] pairs. axis may be a function of the pointer event,
// asked at the start of each gesture (the detail's knobs turn sideways on phones, where the detail scrolls up and
// down); 'none' lets a touch through to the scroller. el.mxDragAt notes when a drag last began (see mxDbl).
function mxDrag(el, o) {
  let d = null;
  const anchor = (x, y) => { d.x = x; d.y = y; d.n = o.get(); };
  const show = () => mxTip(o.host(), o.anchor ? o.anchor() : el, o.tip(), d.fine || d.shift);
  const begin = () => {
    d.on = true;
    el.mxDragAt = performance.now();
    try { el.setPointerCapture(d.id); } catch (e) {}
    el.classList.add('drag');
    if (!d.touch && o.focus) o.focus.focus({ preventScroll: true });
    if (o.start) o.start();
    show();
  };
  const still = () => {
    clearTimeout(d.st);
    d.st = setTimeout(() => {
      if (!d || d.fine) return;
      d.fine = true; anchor(d.lx, d.ly); mxBuzz();
      if (!d.on) begin(); else show();
    }, 420);
  };
  const end = () => {
    if (!d) return;
    clearTimeout(d.st);
    if (d.on) { el.classList.remove('drag'); if (o.end) o.end(); mxTipHide(o.host()); }
    d = null;
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || d || (o.ok && !o.ok()) || (o.skip && o.skip(e))) return;
    const ax = typeof o.axis === 'function' ? o.axis(e) : o.axis;
    if (ax === 'none') return;
    d = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, n: o.get(), on: false, fine: false, wf: false, touch: e.pointerType === 'touch', ax };
    if (!d.touch) { e.preventDefault(); begin(); }
    still();
  });
  el.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    if (Math.abs(e.clientX - d.lx) + Math.abs(e.clientY - d.ly) > 2) { d.lx = e.clientX; d.ly = e.clientY; still(); }
    if (!d.on) {
      const ax = Math.abs(e.clientX - d.x), ay = Math.abs(e.clientY - d.y);
      if (ax < 6 && ay < 6) return;
      if (d.ax !== 'xy' && (d.ax === 'x' ? ay : ax) > (d.ax === 'x' ? ax : ay)) { end(); return; }
      anchor(e.clientX, e.clientY); begin();
      return;
    }
    const fine = d.fine || e.shiftKey, f = fine ? 0.2 : 1;
    if (fine !== d.wf) { d.wf = fine; d.shift = e.shiftKey; anchor(e.clientX, e.clientY); }
    if (d.ax === 'xy') {
      const sp = o.span(), want = [clamp(d.n[0] + (e.clientX - d.x) / Math.max(40, sp[0]) * f, 0, 1), clamp(d.n[1] + (d.y - e.clientY) / Math.max(40, sp[1]) * f, 0, 1)];
      o.set(want, fine);
      const got = o.get();
      if (Math.abs(got[0] - want[0]) > 0.02 || Math.abs(got[1] - want[1]) > 0.02) anchor(e.clientX, e.clientY);
      show();
      return;
    }
    const want = clamp(d.n + (d.ax === 'x' ? e.clientX - d.x : d.y - e.clientY) / Math.max(40, o.span()) * f, 0, 1);
    o.set(want, fine);
    // pushed past a limit: start again from here, so turning back responds at once
    if (Math.abs(o.get() - want) > 0.02) anchor(e.clientX, e.clientY);
    show();
  });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // a child that held the touch's implicit capture also reports losing it – only our own loss ends the drag
  el.addEventListener('lostpointercapture', (e) => { if (d && d.on && e.pointerId === d.id && e.target === el) end(); });
}
// A double tap that is really one: two short touches that did not move (< 6 px, < 300 ms each, no drag begun), close
// together (24 px, 300 ms) – two quick nudges of a fader never count. A mouse uses dblclick. zone(e): only presses
// there count (a readout drawn on a fader's own canvas – a button laid over the fader would draw the browser's touch
// adjustment and steal the fader's nudges).
function mxDbl(el, fn, zone) {
  let t0 = 0, x0 = 0, y0 = 0, mv = 0, last = 0, lx = 0, ly = 0, id = -1, touch = false;
  // browsers also make a dblclick of two touch taps – those are judged by the rule below instead
  el.addEventListener('dblclick', (e) => { if (!touch && (!zone || zone(e))) fn(e); });
  el.addEventListener('pointerdown', (e) => { touch = e.pointerType === 'touch'; if (!touch) return; if (zone && !zone(e)) { id = -1; last = 0; return; } id = e.pointerId; t0 = performance.now(); x0 = e.clientX; y0 = e.clientY; mv = 0; });
  el.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; mv = Math.max(mv, Math.hypot(e.clientX - x0, e.clientY - y0)); if (mv >= 6) last = 0; });
  el.addEventListener('pointercancel', () => { id = -1; last = 0; });
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch' || e.pointerId !== id) return;
    id = -1;
    const now = performance.now();
    if (mv >= 6 || now - t0 > 300 || (el.mxDragAt || 0) >= t0) { last = 0; return; }
    if (last && now - last < 300 && Math.hypot(x0 - lx, y0 - ly) < 24) { last = 0; fn(e); return; }
    last = now; lx = x0; ly = y0;
  });
}
// one floating tip per host (the mixer, the Puls block): name, value in the channel colour, "fein"
function mxTip(host, anchor, txt, fine) {
  if (!host) return;
  let t = host.mxTipEl;
  if (!t) { t = host.mxTipEl = h('div', { class: 'mx-tip', 'aria-hidden': 'true' }, h('span'), h('b'), h('em', null, 'fein')); host.append(t); }
  t.children[0].textContent = txt.n; t.children[1].textContent = txt.v;
  t.style.setProperty('--c', txt.c || COL.lumen);
  t.classList.toggle('fine', !!fine);
  // above the control, kept inside the host; below it when there is no room above
  const hr = host.getBoundingClientRect(), r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
  const tw = t.offsetWidth, th = t.offsetHeight;
  const x = clamp(r.left + r.width / 2 - hr.left, tw / 2 + 4, Math.max(tw / 2 + 4, hr.width - tw / 2 - 4));
  let y = r.top - hr.top - 4;
  if (y - th < 4) y = r.top - hr.top + (r.height || 0) + th + 8;
  t.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  clearTimeout(t.tm);
  t.classList.add('show');
}
function mxTipHide(host, ms = 350) {
  const t = host && host.mxTipEl;
  if (!t) return;
  clearTimeout(t.tm); t.tm = setTimeout(() => t.classList.remove('show'), ms);
}
function mxTipFlash(host, anchor, txt) { mxTip(host, anchor, txt, false); mxTipHide(host, 900); }

