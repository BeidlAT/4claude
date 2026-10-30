/* ---------- knobs: gill fans ---------- */
const MX_KA0 = -0.75 * Math.PI, MX_KA1 = 0.75 * Math.PI;
const mxBip = (id) => /\.pan$/.test(id) || id === 'mst.low' || id === 'mst.high';
const mxMark = (id) => (/^x\w+\.(wid|dly|rev|fx)$/.test(id) || id === 'mst.wid' ? 0.5 : null);
function mxKnobTxt(id, v) {
  const key = id.slice(id.indexOf('.') + 1);
  if (id === 'mix.duckRel') return Math.round(v * 60 / Math.max(30, P['seq.bpm']) * 1000) + ' ms';
  if (key === 'pan') return mxPanTxt(v);
  if (key === 'wid') return v < 0.005 ? 'Mono' : Math.round(v * 100) + ' %';
  if (id === 'mst.low' || id === 'mst.high') return mxDbTxt(v, 1);
  return Math.round(v * 100) + ' %';
}
function mxKnobAria(id, v) {
  const key = id.slice(id.indexOf('.') + 1);
  if (key === 'pan') return mxPanAria(v);
  if (key === 'wid') return v < 0.005 ? 'Mono' : Math.round(v * 100) + ' Prozent';
  if (id === 'mst.low' || id === 'mst.high') return mxDbTxt(v, 1) + ' Dezibel';
  if (id === 'mix.duckRel') return Math.round(v * 100) + ' Prozent eines Schlags, ' + Math.round(v * 60 / Math.max(30, P['seq.bpm']) * 1000) + ' Millisekunden';
  return Math.round(v * 100) + ' Prozent';
}
// A gill knob on a parameter. o: { ch, id, name (printed under it), label (spoken), col, gr(), off(), offTxt, axis }
function mxKnob(o) {
  const el = h('div', { class: 'mx-kn', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': '100' });
  const cv = h('canvas', { 'aria-hidden': 'true' });
  const val = h('span', { class: 'mx-kv', 'aria-hidden': 'true' });
  const nm = h('span', { class: 'mx-kl', 'aria-hidden': 'true' });
  el.append(cv);
  const K = { box: h('div', { class: 'mx-kw' + (o.cls ? ' ' + o.cls : '') }, el, val, nm), el, cv, val, nm, o, id: null, key: '', size: 0, col: o.col || MXK[o.ch].col };
  K.set = (id, name, label, col) => {
    K.id = id; K.d = PD[id]; K.key = ''; K.box.dataset.pid = id;
    if (name != null) { K.name = name; nm.textContent = name; }
    if (label != null) el.setAttribute('aria-label', (o.ch === 'sum' ? 'Summe' : MXK[o.ch].name) + ' ' + label);
    if (col) K.col = col;
    mxKnobRender(K);
  };
  const off = () => !!(o.off && o.off());
  // the neutral point (centre of a balance, 100 % of a send or a width) catches a coarse drag passing over it – on
  // touch that is the way back to it, since a double tap there would be too easy to trigger with two quick nudges
  const setN = (n, fine) => {
    let v = fromNorm(K.d, n);
    const mk = mxBip(K.id) ? 0.5 : mxMark(K.id);
    if (!fine && mk != null && Math.abs(n - mk) < 0.016) v = fromNorm(K.d, mk);
    setParam(K.id, v);
  };
  const tip = () => ({ n: (o.ch === 'sum' ? 'Summe' : MXK[o.ch].name) + ' · ' + K.name, v: mxKnobTxt(K.id, P[K.id]), c: K.col });
  mxDrag(el, { axis: o.axis || 'y', host: o.host || (() => MX.root), span: () => 160, get: () => clamp(toNorm(K.d, P[K.id]), 0, 1), set: setN, tip, ok: () => !!K.id && !off(), focus: el });
  const step = (dir, coarse) => { if (!K.id || off()) return; setN(clamp(toNorm(K.d, P[K.id]) + dir * (coarse ? 0.125 : 0.025), 0, 1), true); mxTipFlash(o.host ? o.host() : MX.root, el, tip()); };
  el.addEventListener('keydown', (e) => {
    if (!K.id || off()) return;
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowRight') step(1, e.shiftKey);
    else if (k === 'ArrowDown' || k === 'ArrowLeft') step(-1, e.shiftKey);
    else if (k === 'PageUp') step(1, true);
    else if (k === 'PageDown') step(-1, true);
    else if (k === 'Home') setParam(K.id, K.d.min);
    else if (k === 'End') setParam(K.id, K.d.max);
    else if (k === 'Delete' || k === 'Backspace' || k === '0') setParam(K.id, K.d.d);
    else return;
    e.preventDefault();
  });
  el.setAttribute('aria-keyshortcuts', 'Home End Delete');
  el.addEventListener('wheel', (e) => {
    if (!K.id || off() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); step(e.deltaY < 0 ? 1 : -1, e.shiftKey);
  }, { passive: false });
  // the default by a double click (mouse) – touch has no double tap on anything that is dragged
  let kTouch = false;
  el.addEventListener('pointerdown', (e) => { kTouch = e.pointerType === 'touch'; });
  el.addEventListener('dblclick', () => { if (!kTouch && K.id && !off()) { setParam(K.id, K.d.d); mxTipFlash(o.host ? o.host() : MX.root, el, tip()); } });
  if (o.id) K.set(o.id, o.name, o.label);
  return K;
}
function mxKnobRender(K) {
  if (!K.id) return;
  const d = K.d, v = P[K.id], off = !!(K.o.off && K.o.off());
  const n = clamp(toNorm(d, v), 0, 1), gr = K.o.gr ? Math.round(K.o.gr() * 4) / 4 : 0;
  const gh = MX.ghost && K.o.ghost ? K.o.ghost() : null;
  const key = K.id + '|' + v + '|' + off + '|' + gr + '|' + (gh ? gh.join() : '') + '|' + K.size + '|' + K.col + (K.id === 'mix.duckRel' ? '|' + P['seq.bpm'] : '');
  if (key === K.key) return;
  const idChanged = !K.key.startsWith(K.id + '|');
  K.key = key;
  const txt = off ? K.o.offTxt || '—' : mxKnobTxt(K.id, v);
  if (K.val.textContent !== txt) K.val.textContent = txt;
  K.box.classList.toggle('off', off);
  K.box.classList.toggle('mod', !off && Math.abs(v - d.d) > 1e-6);
  K.el.setAttribute('aria-valuenow', String(Math.round(n * 100)));
  K.el.setAttribute('aria-valuetext', off ? K.o.offAria || 'nicht verfügbar' : mxKnobAria(K.id, v));
  if (off) K.el.setAttribute('aria-disabled', 'true'); else K.el.removeAttribute('aria-disabled');
  if (idChanged) K.box.style.setProperty('--kc', K.col);
  mxKnobDraw(K, n, off, gr, gh);
}
function mxKnobDraw(K, n, off, gr, gh) {
  const s = K.size;
  if (!s) return;
  const c = mxFit(K.cv, s, s), R = s / 2, cx = R, cy = R, col = mxRgb(K.col);
  c.clearRect(0, 0, s, s);
  const bip = mxBip(K.id), mark = mxMark(K.id);
  const va = MX_KA0 + n * (MX_KA1 - MX_KA0), za = bip ? 0 : mark != null ? MX_KA0 + mark * (MX_KA1 - MX_KA0) : MX_KA0;
  // the cap's underside
  const g = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.92);
  g.addColorStop(0, '#2e241e'); g.addColorStop(1, '#19130f');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 0.9, 0, MX_TAU); c.fill();
  c.strokeStyle = 'rgba(240,230,216,.1)'; c.lineWidth = 1; c.stroke();
  // 25 gills, long and short alternating; lit between the zero point and the value
  const lo = Math.min(za, va), hi = Math.max(za, va), r1 = R * 0.36, r2 = R * 0.8;
  c.lineCap = 'round';
  for (let i = 0; i < 25; i++) {
    const a = MX_KA0 + i / 24 * (MX_KA1 - MX_KA0), sa = Math.sin(a), ca = -Math.cos(a);
    const lit = !off && hi - lo > 0.02 && a >= lo - 1e-6 && a <= hi + 1e-6;
    const q1 = i % 2 ? r1 + R * 0.14 : r1, q2 = lit ? r2 + R * 0.06 : r2;
    c.beginPath(); c.moveTo(cx + sa * q1, cy + ca * q1); c.lineTo(cx + sa * q2, cy + ca * q2);
    if (lit) { const t = 1 - Math.abs(a - va) / Math.max(0.3, hi - lo); c.strokeStyle = mxRgba(col, 0.4 + 0.6 * t); c.lineWidth = 1.5; }
    else { c.strokeStyle = 'rgba(240,230,216,.16)'; c.lineWidth = 1; }
    c.stroke();
  }
  // compressor: the gain reduction as a rose arc on the rim, hanging from the top
  if (gr > 0.1) {
    c.strokeStyle = 'rgba(255,143,158,.92)'; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, R * 0.97, -Math.PI / 2, -Math.PI / 2 + Math.min(1, gr / 12) * 0.75 * Math.PI); c.stroke();
  }
  // snapshot ghosts: where A and B have this knob
  if (gh) for (let j = 0; j < 2; j++) {
    if (gh[j] == null) continue;
    const a = MX_KA0 + gh[j] * (MX_KA1 - MX_KA0), sa = Math.sin(a), ca = -Math.cos(a);
    c.strokeStyle = j ? 'rgba(134,240,208,.95)' : 'rgba(255,179,92,.95)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx + sa * R * 0.86, cy + ca * R * 0.86); c.lineTo(cx + sa * R * 1.0, cy + ca * R * 1.0); c.stroke();
  }
  if (!off) {
    const sa = Math.sin(va), ca = -Math.cos(va);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = mxRgba(col, 0.35); c.lineWidth = 4.5;
    c.beginPath(); c.moveTo(cx + sa * R * 0.22, cy + ca * R * 0.22); c.lineTo(cx + sa * R * 0.86, cy + ca * R * 0.86); c.stroke();
    c.restore();
    c.strokeStyle = '#f6eee2'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(cx + sa * R * 0.22, cy + ca * R * 0.22); c.lineTo(cx + sa * R * 0.86, cy + ca * R * 0.86); c.stroke();
    c.fillStyle = mxRgba(col, 1); c.beginPath(); c.arc(cx + sa * R * 0.9, cy + ca * R * 0.9, Math.max(1.8, R * 0.1), 0, MX_TAU); c.fill();
  }
  if (bip || mark != null) {   // a dot where the neutral setting is
    const a = bip ? 0 : za;
    c.fillStyle = 'rgba(240,230,216,.55)'; c.beginPath(); c.arc(cx + Math.sin(a) * R * 0.99, cy - Math.cos(a) * R * 0.99, 1.1, 0, MX_TAU); c.fill();
  }
  c.fillStyle = '#120d0a'; c.beginPath(); c.arc(cx, cy, R * 0.2, 0, MX_TAU); c.fill();
  c.strokeStyle = off ? 'rgba(240,230,216,.12)' : mxRgba(col, 0.6); c.lineWidth = 1; c.stroke();
}

