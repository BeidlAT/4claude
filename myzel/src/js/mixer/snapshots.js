/* ---------- snapshots and morph ---------- */
// A/B hold every mixer parameter (channels, Puls group, Pumpen, Summe) except the solos – those are for listening.
// The morph blends numbers on each parameter's own scale (levels in dB, frequencies logarithmically), switches and
// choices flip at 50 %; only what differs between A and B is touched, at most ~25 times a second.
let MX_SNAP_IDS = null;
const mxSnapIds = () => MX_SNAP_IDS || (MX_SNAP_IDS = PATCH_IDS.filter((id) => /^(x[a-z0-9]+|mix|mst)\./.test(id) && !id.endsWith('.solo')));
function mxSnapTake() { const o = {}; for (const id of mxSnapIds()) o[id] = P[id]; return o; }
function mxSnapLoad() {
  let s = null;
  try { s = JSON.parse(store.get('myzel.mixsnap.v1') || 'null'); } catch (e) {}
  const cur = mxSnapTake();
  MX.snap.a = Object.assign({}, cur, s && s.a);
  MX.snap.b = Object.assign({}, cur, s && s.b);
  MX.snap.m = MX.mUI = s && typeof s.m === 'number' ? clamp(s.m, 0, 1) : 0;
  MX.snap.fae = s && s.fae && typeof s.fae === 'object' ? s.fae : {};   // the scenes' Fährte loops
  MX.snap.lch = s && s.lch && typeof s.lch === 'object' ? s.lch : {};   // Hexenring: the scenes' Lichtungen
}
function mxSnapSave() { clearTimeout(MX.snapTm); MX.snapTm = setTimeout(() => store.set('myzel.mixsnap.v1', JSON.stringify(MX.snap)), 500); }
function mxMorphApply(m) {
  const a = MX.snap.a, b = MX.snap.b;
  MX.applying = true;
  for (const id of mxSnapIds()) {
    const va = a[id], vb = b[id];
    if (va === vb || va === undefined || vb === undefined) continue;
    const d = PD[id];
    const v = d.kind === 'num' ? fromNorm(d, toNorm(d, va) + (toNorm(d, vb) - toNorm(d, va)) * m) : m < 0.5 ? va : vb;
    if (P[id] !== v) setParam(id, v);
  }
  MX.applying = false;
  const was = MX.snap.m;
  MX.snap.m = m; MX.edits = false;
  mxSnapSave(); mxSnapSync();
  if (was !== m) faeP('morph', was, m);   // the Fährte writes the morph down as the A/B-Morph of Formen
  if (was !== m) hxSceneMorph(was, m);   // Hexenring: a scene's Lichtung – the loops' levels, or a switch half way
  if (was < 0.5 !== m < 0.5) faeScene(m < 0.5 ? 'a' : 'b');   // a scene's Fährte comes with it
}
const mxSnapDiff = () => mxSnapIds().some((id) => MX.snap.a[id] !== MX.snap.b[id]);
function mxMorphTo(m, glide) {
  if (!mxSnapDiff()) { if (!MX.sameHint) { MX.sameHint = true; toast('A und B sind noch gleich – speichere zuerst einen zweiten Mix (⤓ oder B halten).', 4200); } return; }
  if (glide && !REDUCED) { MX.glide = { from: MX.mUI, to: m, t0: performance.now(), dur: 700 }; mxGhostSet(); return; }
  MX.glide = null; MX.mUI = m; MX.morphPend = m; mxMorphDraw();
}
function mxEdited() { if (!MX.edits) { MX.edits = true; mxSnapSync(); } }
// Every way of overwriting a scene or many faders at once offers to take it back for a few seconds.
function mxSnapStore(which) {
  const prev = MX.snap[which], pm = MX.snap.m, pe = MX.edits, pf = faeSceneStore(which), pl = hxSceneStore(which);   // (Hexenring: and its Lichtung)
  MX.snap[which] = mxSnapTake();
  MX.snap.m = MX.mUI = which === 'a' ? 0 : 1;
  MX.edits = false; MX.sameHint = false;
  mxSnapSave(); mxSnapSync(); mxBuzz();
  const li = MX.snap.lch && hxLichOf(MX.snap.lch[which]);
  toast('Jetziger Mix liegt in ' + which.toUpperCase() + (MX.snap.fae && MX.snap.fae[which] ? ', mit der Bewegung' : '') + (li ? ', mit ' + li.name : ''), 4500, { label: 'Rückgängig', fn: () => {
    MX.snap[which] = prev; MX.snap.m = MX.mUI = pm; MX.edits = pe;
    if (pf) MX.snap.fae[which] = pf; else delete MX.snap.fae[which];
    if (pl) MX.snap.lch[which] = pl; else delete MX.snap.lch[which];
    mxSnapSave(); mxSnapSync(); toast('Schnappschuss ' + which.toUpperCase() + ' wie vorher', 1600);
  } });
}
function mxSnapSwap() {
  const t = MX.snap.a; MX.snap.a = MX.snap.b; MX.snap.b = t; MX.snap.m = MX.mUI = 1 - MX.mUI;
  const F = MX.snap.fae || (MX.snap.fae = {}), fa = F.a; if (F.b) F.a = F.b; else delete F.a; if (fa) F.b = fa; else delete F.b;
  const C = MX.snap.lch || (MX.snap.lch = {}), la = C.a; if (C.b) C.a = C.b; else delete C.a; if (la) C.b = la; else delete C.b;   // (Hexenring)
  mxSnapSave(); mxSnapSync();
}
// set many params at once; the toast's undo puts the old values back
function mxBulk(ids, v, msg) {
  const prev = ids.map((id) => [id, P[id]]);
  for (const id of ids) setParam(id, v);
  toast(msg, 4500, { label: 'Rückgängig', fn: () => { for (const [id, o] of prev) setParam(id, o); } });
}
function mxBuildSnap() {
  const S = MX.sn = {};
  // A / B: a tap glides there; holding one second stores the mix – a ring fills meanwhile, letting go before it
  // closes still glides
  const ab = (w) => {
    const b = h('button', { type: 'button', class: 'mx-ab mx-ab-' + w, 'data-act': 'scene.' + w, 'aria-label': 'Schnappschuss ' + w.toUpperCase() + ' – tippen gleitet hin, eine Sekunde halten speichert den jetzigen Mix', 'aria-keyshortcuts': 'Shift+Enter' },
      h('span', null, w), h('i', { class: 'mx-abr', 'aria-hidden': 'true', html: '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" pathLength="100"/></svg>' }));
    let tm = 0, held = false;
    const stop = () => { clearTimeout(tm); b.classList.remove('hold'); };
    b.addEventListener('pointerdown', (e) => { if (e.button > 0) return; held = false; stop(); void b.offsetWidth; b.classList.add('hold'); tm = setTimeout(() => { held = true; b.classList.remove('hold'); mxSnapStore(w); }, 1000); });
    b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('pointerleave', stop);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { if (held) { held = false; return; } if (e.shiftKey) mxSnapStore(w); else mxMorphTo(w === 'a' ? 0 : 1, true); });
    return b;
  };
  S.a = ab('a'); S.b = ab('b');
  S.cv = h('canvas', { 'aria-hidden': 'true' });
  S.mo = h('div', { class: 'mx-morph', role: 'slider', tabindex: '0', 'data-act': 'morph', 'aria-label': 'Mix zwischen A und B überblenden', 'aria-valuemin': '0', 'aria-valuemax': '100' }, S.cv);
  const mo = S.mo;
  const ui = (on) => { MX.morphUI = on; mxGhostSet(); };
  mo.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ui(true); });
  mo.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !MX.mDrag) ui(false); });
  mo.addEventListener('focus', () => ui(true));
  mo.addEventListener('blur', () => ui(false));
  mo.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    try { mo.setPointerCapture(e.pointerId); } catch (er) {}
    MX.mDrag = { x: e.clientX, m: MX.mUI, moved: false, id: e.pointerId };
    MX.glide = null; ui(true); e.preventDefault();
  });
  // only a sideways drag of 6 px or more moves the mix (relative to where it is): a stray touch on the track, on
  // the way to A, B or ⤓, changes nothing – it only shows the a/b marks while it rests there
  mo.addEventListener('pointermove', (e) => {
    const d = MX.mDrag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.abs(e.clientX - d.x) < 6) return;
    if (!d.moved) { d.moved = true; d.x = e.clientX; d.m = MX.mUI; }
    if (!mxSnapDiff()) { mxMorphTo(0); return; }
    const r = mo.getBoundingClientRect();
    MX.mUI = clamp(d.m + (e.clientX - d.x) / (r.width - 28) * (e.shiftKey ? 0.25 : 1), 0, 1);
    MX.morphPend = MX.mUI; mxMorphDraw();
  });
  const up = (e) => {
    const d = MX.mDrag;
    if (!d) return;
    MX.mDrag = null;
    if (d.moved && MX.morphPend != null) { mxMorphApply(MX.morphPend); MX.morphPend = null; }
    if (e.pointerType !== 'mouse') ui(false);
  };
  mo.addEventListener('pointerup', up); mo.addEventListener('pointercancel', up);
  mo.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 0.25 : 0.05, k = e.key;
    let m = null;
    if (k === 'ArrowRight' || k === 'ArrowUp') m = MX.mUI + st;
    else if (k === 'ArrowLeft' || k === 'ArrowDown') m = MX.mUI - st;
    else if (k === 'PageUp') m = MX.mUI + 0.25;
    else if (k === 'PageDown') m = MX.mUI - 0.25;
    else if (k === 'Home' || k === 'End') { e.preventDefault(); mxMorphTo(k === 'Home' ? 0 : 1, true); return; }
    if (m == null) return;
    e.preventDefault(); mxMorphTo(Math.round(clamp(m, 0, 1) * 100) / 100);
  });
  // ⤓ menu
  S.dot = h('i', { class: 'mx-dot', 'aria-hidden': 'true' });
  S.store = h('button', { type: 'button', class: 'mx-store', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Schnappschüsse verwalten', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v10m-4-4 4 4 4-4"/><path d="M5 18.5c2 1.5 4.4 2.2 7 2.2s5-.7 7-2.2"/></svg>' }, S.dot);
  const item = (glyph, cls, text, fn) => h('button', { type: 'button', role: 'menuitem', onclick: () => { mxMenu(false); fn(); } }, h('b', { class: cls, 'aria-hidden': 'true' }, glyph), text);
  S.menu = h('div', { class: 'mx-menu', role: 'menu', 'aria-label': 'Schnappschüsse', hidden: true },
    item('a', '', 'Jetzigen Mix als A speichern', () => mxSnapStore('a')),
    item('b', 'lu', 'Jetzigen Mix als B speichern', () => mxSnapStore('b')),
    item('⇄', '', 'A und B tauschen', () => { mxSnapSwap(); toast('A und B getauscht', 4500, { label: 'Rückgängig', fn: mxSnapSwap }); }),
    h('hr', { 'aria-hidden': 'true' }),
    item('0', '', 'Alle Kanäle auf 0 dB, Mitte', () => mxBulk(STRIPS.map((st) => 'x' + st.k + '.vol').concat(STRIPS.map((st) => 'x' + st.k + '.pan'), ['mix.pulsVol']), 0, 'Alle Kanäle auf 0 dB und in der Mitte')),
    item('s', 'lu', 'Alle Solos aufheben', () => { if (STRIPS.some((st) => P['x' + st.k + '.solo'])) mxSoloClear(); else toast('Es ist kein Solo an', 1600); }));
  S.store.addEventListener('click', (e) => { e.stopPropagation(); mxMenu(S.menu.hidden); });
  S.menu.addEventListener('keydown', (e) => {
    const items = [...S.menu.querySelectorAll('button')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.stopPropagation(); mxMenu(false); S.store.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
  });
  document.addEventListener('pointerdown', (e) => { if (!S.menu.hidden && !S.menu.contains(e.target) && !S.store.contains(e.target)) mxMenu(false); });
  // the edit marker: every change of a mixer parameter that did not come from the morph
  for (const id of mxSnapIds()) bindCtl(id, (v) => { if (!MX.applying && MX.seen[id] !== undefined && MX.seen[id] !== v) mxEdited(); MX.seen[id] = v; });
  return h('div', { class: 'mx-snap' }, S.a, S.mo, S.b, S.store, S.menu);
}
function mxMenu(open) {
  const S = MX.sn;
  S.menu.hidden = !open;
  S.store.setAttribute('aria-expanded', String(!!open));
  if (open) S.menu.querySelector('button').focus();
}
function mxGhostSet() {
  const on = !!(MX.morphUI || MX.glide || MX.mDrag);
  if (on === MX.ghost) return;
  MX.ghost = on;
  for (const c of MXC) { const S = MX.ch[c.k]; if (S.k1 && S.k1.o.ghost) mxKnobRender(S.k1); }
}
function mxSnapSync() {
  const S = MX.sn;
  if (!S) return;
  const m = MX.snap.m;
  S.a.classList.toggle('on', m <= 0.001 && !MX.edits);
  S.b.classList.toggle('on', m >= 0.999 && !MX.edits);
  S.store.classList.toggle('edited', MX.edits);
  S.store.setAttribute('aria-label', 'Schnappschüsse verwalten' + (MX.edits ? ' – von Hand verändert seit dem letzten Speichern' : ''));
  mxMorphDraw();
}
function mxMorphLayout() {
  const S = MX.sn, r = S.mo.getBoundingClientRect();
  S.w = r.width; S.h = r.height;
  mxMorphDraw();
}
// the morph: a hypha from A (spore) to B (lumen); the thumb changes colour along it and shows the share of B
function mxMorphDraw() {
  const S = MX.sn;
  if (!S || !S.w) return;
  const W = S.w, H = S.h, c = mxFit(S.cv, W, H), x0 = 14, x1 = W - 14, y = H / 2 + 4, t = MX.mUI, x = x0 + (x1 - x0) * t;
  c.clearRect(0, 0, W, H);
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,179,92,.6)'); g.addColorStop(1, 'rgba(134,240,208,.6)');
  c.beginPath();
  for (let i = 0; i <= 64; i++) { const u = i / 64, xx = x0 + (x1 - x0) * u, yy = y + Math.sin(u * 9 + 1) * 1.6 * Math.sin(u * Math.PI); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
  c.strokeStyle = g; c.lineWidth = 1.5; c.stroke();
  for (let i = 0; i <= 10; i++) { const xx = Math.round(x0 + (x1 - x0) * i / 10) + 0.5; c.fillStyle = i === 5 ? 'rgba(240,230,216,.42)' : 'rgba(240,230,216,.16)'; c.fillRect(xx - 0.5, y + 6, 1, i % 5 ? 3 : 5); }
  const col = [Math.round(255 + (134 - 255) * t), Math.round(179 + (240 - 179) * t), Math.round(92 + (208 - 92) * t)];
  // the glow takes one of 9 shades on the way, so only a handful of sprites are ever made
  const q = Math.round(t * 8) / 8, gc = [255 + (134 - 255) * q, 179 + (240 - 179) * q, 92 + (208 - 92) * q].map((v) => Math.round(v).toString(16).padStart(2, '0'));
  c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow('#' + gc.join('')), x - 18, y - 18, 36, 36); c.globalCompositeOperation = 'source-over';
  c.beginPath(); c.arc(x, y, 7, 0, MX_TAU); c.fillStyle = mxRgba(col, 1); c.fill();
  c.strokeStyle = 'rgba(17,13,11,.85)'; c.lineWidth = 1.5; c.stroke();
  c.beginPath(); c.arc(x, y, 2.4, 0, MX_TAU); c.fillStyle = 'rgba(20,15,12,.6)'; c.fill();
  if (MX.edits) { c.beginPath(); c.arc(x + 7, y - 7, 3, 0, MX_TAU); c.fillStyle = '#ff8f9e'; c.fill(); c.strokeStyle = '#1d1714'; c.lineWidth = 1.5; c.stroke(); }
  c.font = '500 9px ' + COL.fontNum; c.fillStyle = 'rgba(240,230,216,.85)'; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText(Math.round(t * 100) + ' %', clamp(x, 18, W - 18), y - 10);
  const pct = Math.round(t * 100);
  S.mo.setAttribute('aria-valuenow', String(pct));
  S.mo.setAttribute('aria-valuetext', pct === 0 ? 'ganz A' : pct === 100 ? 'ganz B' : (100 - pct) + ' Prozent A, ' + pct + ' Prozent B' + (MX.edits ? ', von Hand verändert' : ''));
}
// glide and the throttled morph: applied in the frame loop, never more often than every 40 ms
function mxMorphFrame(ts) {
  const G = MX.glide;
  if (G) {
    const u = clamp((performance.now() - G.t0) / G.dur, 0, 1);
    MX.mUI = G.from + (G.to - G.from) * mxEase(u);
    MX.morphPend = MX.mUI;
    if (u >= 1) { MX.glide = null; mxGhostSet(); }
    mxMorphDraw();
  }
  if (MX.morphPend != null && (ts - MX.morphAt >= 40 || (!MX.glide && !MX.mDrag))) {
    mxMorphApply(MX.morphPend); MX.morphPend = null; MX.morphAt = ts;
  }
}

