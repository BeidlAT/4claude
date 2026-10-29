/* ---------- head, pages, life ---------- */
function mxdSh(title, sub) { return h('div', { class: 'mxd-sh' }, h('h3', null, title), sub == null ? null : typeof sub === 'string' ? h('p', null, sub) : sub); }
function mxdBuild(host) {
  const B = MXD.back = { cv: h('canvas', { 'aria-hidden': 'true' }), s: 0 };
  B.el = h('button', { type: 'button', class: 'mxd-back', 'aria-label': 'Zurück zum Pult', title: 'Zurück zum Pult (Esc)', onclick: closeDetail }, B.cv);
  MXD.capI = h('span', { class: 'mxd-capi', 'aria-hidden': 'true' });
  MXD.nm = h('h3', { id: 'mxdTitle' }); MXD.src = h('small');
  const nav = (d, lab, path) => h('button', { type: 'button', class: 'mxd-nav', 'aria-label': lab, title: lab, onclick: () => mxdGo(d), html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>' });
  // its own solo lamp: on phones the detail covers the band's
  MXD.soloL = mxSoloLamp('mxd-solo');
  MXD.head = h('div', { class: 'mxd-head' }, B.el, h('div', { class: 'mxd-id' }, MXD.capI, h('div', { class: 'mxd-idt' }, MXD.nm, MXD.src)), MXD.soloL.el, nav(-1, 'Voriger Kanal', 'M14.5 6 8.5 12l6 6'), nav(1, 'Nächster Kanal', 'M9.5 6l6 6-6 6'));
  // the channel page: Klangbild and Formen on one side, Wege and Quelle on the other (one column on phones, Wege first)
  MXD.eqc = mxEq(MXE_CH, false);
  MXD.eqState = h('span', { class: 'mxe-st' });
  // "aktiv" while the EQ shapes the sound; the button puts every band back (with an undo)
  MXD.eqNeutral = h('button', { type: 'button', class: 'mxe-neu', onclick: () => {
    const E = MXD.eqc, ids = [];
    for (const B of MXE_CH) for (const id of [B.gid && B.gid(E.k), B.fid && B.fid(E.k)]) if (id) ids.push(id);
    const prev = ids.map((id) => [id, P[id]]);
    for (const B of MXE_CH) mxeReset(E, B);
    toast('Klangbild von ' + mxdName(E.k) + ' zurückgesetzt', 4500, { label: 'Rückgängig', fn: () => { for (const [id, v] of prev) setParam(id, v); } });
  } }, 'Zurücksetzen');
  const kb = h('section', { class: 'mxd-sec mxd-kb', 'aria-label': 'Klangbild' }, mxdSh('Klangbild', h('div', { class: 'mxe-tools' }, MXD.eqState, MXD.eqNeutral)), MXD.eqc.box, MXD.eqc.cells);
  MXD.quSec = h('section', { class: 'mxd-sec mxd-qu', 'aria-label': 'Quelle' }, mxdSh('Quelle', MXD.quSub = h('p')));
  MXD.wgSec = mxdBuildWege();
  MXD.ca = h('div', { class: 'mxd-ca' }, kb, mxdBuildFormen());
  MXD.cb = h('div', { class: 'mxd-cb' }, MXD.wgSec, MXD.quSec);
  MXD.pages = {
    ch: h('div', { class: 'mxd-page', 'data-p': 'ch' }, MXD.ca, MXD.cb),
    puls: mxdBuildPuls(),
    sum: mxdBuildSum(),
  };
  MXD.stem = mxdFader('v');
  MXD.body = h('div', { class: 'mxd-body' }, h('div', { class: 'mxd-stem' }, MXD.stem.box), MXD.pages.ch, MXD.pages.puls, MXD.pages.sum);
  MXD.el = h('div', { class: 'mxd', role: 'region', 'aria-labelledby': 'mxdTitle' }, MXD.head, MXD.body);
  MXD.body.addEventListener('scroll', mxeDisarm, { passive: true });
  host.append(MXD.el);
  // the stems, the EQ and the cards change size with the columns, not only with the panel
  if (window.ResizeObserver) { MXD.ro = new ResizeObserver(() => { if (MX.detailK) mxdLayout(); }); for (const el of [MXD.body, MXD.eqc.box, MXD.su.eq.box, MXD.fo.pmpCv.parentNode]) MXD.ro.observe(el); }
  // M and S from the keyboard anywhere in the detail (not while typing or on a slider that uses letters)
  host.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !MXD.k || e.target.closest('input, select, textarea')) return;
    const key = e.key.toLowerCase(), mid = mxMuteId(MXD.k), sid = mxSoloId(MXD.k);
    if (key === 'm' && mid) { setParam(mid, !P[mid]); e.preventDefault(); }
    else if (key === 's' && sid) { setParam(sid, !P[sid]); e.preventDefault(); }
  });
  mxSoloSync();
}
function mxdGo(d) {
  const n = MXC.length, k = MXC[(MXK[MXD.k].i + d + n) % n].k;
  selectChannel(k); openDetail(k);
}
function mxdOpen(k, first) {
  const c = MXK[k], page = k === 'sum' ? 'sum' : k === 'puls' ? 'puls' : 'ch', same = MXD.k === k;
  MXD.k = k;
  for (const p in MXD.pages) MXD.pages[p].hidden = p !== page;
  MXD.page = page;
  MXD.el.dataset.kind = c.kind; MXD.el.dataset.k = k;
  MXD.el.style.setProperty('--c', c.col);
  MXD.nm.textContent = mxdName(k);
  MXD.capI.innerHTML = mxCapSvg(k === 'sum');
  MXD.stem.set(k);
  if (page === 'ch') {
    mxeAim(MXD.eqc, k);
    mxdWegeAim(k);
    mxdFormenAim(k);
    const q = mxdQuelle(k);
    if (q.parentNode !== MXD.quSec) { const old = MXD.quSec.querySelector('.mxd-qbody'); if (old) old.remove(); MXD.quSec.append(q); }
    if (q.sync) q.sync();
    MXD.quSub.textContent = { fin: 'was die Spielfläche spielt', eb2: 'der zweite Klang auf jedem Finger', rgn: 'der Sporenregen aus deinen Tönen', bor: 'der liegende Grundton', dly: 'das Bandecho', rev: 'der erzeugte Raum', fx: 'der Effekt-Rückweg', fx2: 'der zweite Effekt-Rückweg' }[k] || 'Rhythmus und Ton der Spur';
  } else if (page === 'puls') { MXD.pu.fd.set('puls'); mxdAim(MXD.pu.rel, 'puls', 'mix.duckRel', 'Rückkehr', 'Pumpen: Rückkehr, für alle Kanäle', '#ff8f9e'); }
  else mxdSumAim();
  MXD.dirty = true;
  mxdLayout();
  if (!same) { MXD.body.scrollTop = 0; for (const el of MXD.body.querySelectorAll('.mxd-ca, .mxd-cb')) el.scrollTop = 0; mxeDisarm(); }
  if (first) {
    if (!REDUCED) { MXD.el.classList.remove('in'); void MXD.el.offsetWidth; MXD.el.classList.add('in'); }
    MXD.back.el.focus({ preventScroll: true });
  }
  mxdAnnounce();
}
function mxdClose() { mxTipHide(MX.detailHost, 0); MXO.hover = -1; MXD.k = null; }
function mxdAnnounce() { MX.root.setAttribute('aria-label', 'Mixer – Fruchtkörper ' + mxdName(MXD.k)); }
// which parts lie under the detail: on phones all of the mixer, on wide screens the rack except the Summe
function mxdCover(on) {
  const cover = !MX.wide || MX.root.dataset.short === '1', host = MX.detailHost;
  MX.detCover = cover;
  MX.root.dataset.cover = cover ? '1' : '';
  // wide: while a detail is open the head slims to one row (loudness and A/B stay); the rack and the head then
  // need a new layout, which the caller does (mxLayout)
  const slim = !!(on && !cover);
  if ((MX.root.dataset.slim === '1') !== slim) { MX.root.dataset.slim = slim ? '1' : ''; MX.relayout = true; }
  const v = MXV.views[MX.view], pult = MX.view === 'pult' && MX.sumGrp;
  host.style.top = (on && !cover ? MX.band.offsetHeight : 0) + 'px';
  host.style.right = (on && !cover && pult ? MX.sumGrp.offsetWidth : 0) + 'px';
  MX.band.inert = !!(on && cover);
  // phones read top to bottom with Wege first (level, sends); wide screens keep it beside the Klangbild – the node
  // itself moves, so what is seen and what a screen reader reads stay in the same order
  if (MXD.wgSec) { if (cover && MXD.wgSec.parentNode !== MXD.pages.ch) MXD.pages.ch.prepend(MXD.wgSec); else if (!cover && MXD.wgSec.parentNode !== MXD.cb) MXD.cb.prepend(MXD.wgSec); }
  if (v && v.host) {
    // what lies under it can't be reached by Tab or a screen reader; on wide screens the Summe stays usable
    const keepSum = on && !cover && pult;
    v.host.inert = !!(on && !keepSum);
    if (pult) for (const el of v.host.querySelectorAll('.mx-grp:not(.mx-g-sum), .mx-node')) el.inert = !!keepSum;
  }
}
function mxdLayout() {
  if (!MXD.el || !MX.detailK) return;
  mxdCover(true);
  mxSprites();
  for (const F of MXD.fd) if (F.el.offsetParent) mxdFaderLayout(F); else F.w = 0;
  for (const K of MXD.kn) { const s = Math.round(K.cv.clientWidth); if (s !== K.size) { K.size = s; K.key = ''; mxKnobRender(K); } }
  for (const E of MXD.eq) if (E.box.offsetParent) mxeLayout(E); else E.w = 0;
  const sz = (cv) => { const r = cv.parentNode.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const F = MXD.fo; [F.sw, F.sh] = sz(F.satCv); [F.ww, F.wh] = sz(F.widCv); [F.pw, F.ph] = sz(F.pmpCv);
  const G = MXD.pu; [G.w, G.h] = sz(G.cv);
  const Z = MXD.su; [Z.gw, Z.gh] = sz(Z.grCv); [Z.ww, Z.wh] = sz(Z.widCv);
  for (const R of MXD.rings) { const r = R.cv.getBoundingClientRect(); R.w = Math.round(r.width); R.h = Math.round(r.height); R.key = ''; }
  const b = MXD.back.cv.getBoundingClientRect(); MXD.back.s = Math.round(b.width);
  MXD.dirty = true;
}
function mxdRefresh() {
  const k = MXD.k, c = MXK[k];
  let src = mxSrcText(k);
  if (c.kind === 'src' || c.kind === 'lane' || c.kind === 'ret') {
    const p = 'x' + k + '.', st = P[p + 'mute'] ? 'stumm' : P[p + 'solo'] ? 'Solo' : MX.ch[k].dorm ? 'still durch ein Solo' : c.st.info;
    // the returns name what they are first ("1/8 ·" ends in a dot of its own)
    src = c.kind === 'ret' ? st + ' · ' + src : src + ' · ' + st;
  } else if (k === 'puls') src += ' · ' + (P['mix.pulsMute'] ? 'stumm' : 'Gruppe aus Spur 1–4');
  else src += ' · Verdichtung ' + mxPct(P['mst.comp']);
  if (MXD.src.textContent !== src) MXD.src.textContent = src;
  MXD.el.classList.toggle('dormant', MX.ch[k].dorm);
  for (const F of MXD.fd) mxdFaderSync(F);
  if (MXD.page === 'ch') {
    mxdWegeText(k); mxdFormenText(k);
    const flat = mxeNeutral(MXD.eqc);
    MXD.eqState.textContent = flat ? '' : 'aktiv';
    MXD.eqState.classList.toggle('on', !flat);
    MXD.eqNeutral.disabled = mxeAtRest(MXD.eqc);
  } else if (MXD.page === 'puls') mxdPulsText();
}
function mxdFrame(dt, ts) {
  const k = MXD.k, t = ts / 1000;
  if (!k) return;
  // the rack's Summe column stays live beside the detail
  if (!MX.detCover && MX.view === 'pult' && MX.ch.sum.g) {
    if (MX.dirtyStatic) mxStatic();
    mxDrawSum();
    if (t - (MX.stripT || 0) > 0.125) { MX.stripT = t; mxPeakText('sum'); mxKnobRender(MX.ch.sum.k1); }
  }
  if (MXD.dirty) { MXD.dirty = false; mxdRefresh(); }
  if (t - MXD.backT > 0.05) { MXD.backT = t; mxdBackDraw(); }
  const slow = t - MXD.slowT > 0.125;
  if (slow) MXD.slowT = t;
  if (MXD.stem.w) { mxdFaderDraw(MXD.stem); if (slow) mxPeakText(MXD.stem.k, MXD.stem.pk, MXD.stem); }
  const now = A.ctx ? A.ctx.currentTime : 0, st = MIX.s[k];
  if (MXD.page === 'ch') {
    const W = MXD.wg, F = MXD.fo;
    if (W.fd.w) mxdFaderDraw(W.fd);
    mxeDraw(MXD.eqc, t);
    // the cards ~30 times a second each, never two in the same frame
    const d = st && A.ctx ? duckDepth(st, now) : 0, ta = F.ta || (F.ta = [0, 0.011, 0.022]);
    mxTracePush(F.pump, d > 0.001 ? -20 * Math.log10(1 - d) : 0, dt);
    const j = mxdTurn(ta, dt);
    if (j === 0 && F.sw) mxdSatDraw(F, k, F.sw, F.sh);
    else if (j === 1 && F.ww) mxdWidDraw(F.widCv, F.ww, F.wh, k, st && st.m, P['x' + k + '.wid'], P['x' + k + '.pan']);
    else if (j === 2 && F.pw) mxdPumpDraw(F.pmpCv, F.pw, F.ph, F.pump, Number(P['mix.duckSrc']), mxdIsTakt(k) || !P['x' + k + '.duck']);
    if (slow) mxdFormenText(k);
    if (MXK[k].kind === 'lane' && MXD.qring[MXK[k].lane]) mxdRing(MXD.qring[MXK[k].lane]);
  } else if (MXD.page === 'puls') {
    const G = MXD.pu;
    if (G.fd.w) mxdFaderDraw(G.fd);
    for (const R of G.rows) if (R.fd.w) mxdFaderDraw(R.fd);
    for (const R of G.rows) mxdRing(R);
    mxTracePush(G.trace, mxdPulsDepth(), dt);
    G.acc = (G.acc || 0) + dt;
    if (G.acc >= 0.033 && G.w) { G.acc = 0; mxdPumpDraw(G.cv, G.w, G.h, G.trace, Number(P['mix.duckSrc']), false); }
    if (slow) mxdPulsText();
  } else {
    const Z = MXD.su;
    if (Z.fd.w) mxdFaderDraw(Z.fd);
    mxeDraw(Z.eq, t);
    mxTracePush(Z.gr, MX.ch.sum.lv.gr, dt);
    const j = mxdTurn(Z.ta || (Z.ta = [0.005, 0.02]), dt);
    if (j === 0 && Z.gw) mxdGrDraw(Z.grCv, Z.gw, Z.gh, Z.gr);
    else if (j === 1 && Z.ww) mxdWidDraw(Z.widCv, Z.ww, Z.wh, 'sum', A.mm, P['mst.wid'], 0);
    if (slow) { mxdSumText(t); mxKnobRender(Z.comp); }
  }
}
// The small pictures take turns: at most one per frame, the one that has waited longest once it is due (~30 Hz each
// at 60 fps) – so they never pile up in one frame, and on a slow phone none of them starves.
function mxdTurn(ta, dt) {
  let best = -1;
  for (let j = 0; j < ta.length; j++) { ta[j] += dt; if (ta[j] >= 0.033 && (best < 0 || ta[j] > ta[best])) best = j; }
  if (best >= 0) ta[best] = 0;
  return best;
}
// a lane's ring, redrawn only when a step moves
function mxdRing(R) {
  if (!R.w) return;
  const p = 'l' + R.i + '.', key = R.w + ':' + (SEQ.on ? SEQ.lanes[R.i].cur : -1) + P[p + 'on'] + P[p + 'steps'] + P[p + 'puls'] + P[p + 'rot'];
  if (key === R.key) return;
  R.key = key;
  mxdEuc(mxFit(R.cv, R.w, R.h), R.w, R.h, R.i);
}
// The way back is a live fruiting body in miniature: one gill per channel round the ring, as long as that channel
// is loud, the open one lit – so you see the whole mix while you work on one part of it.
function mxdBackDraw() {
  const B = MXD.back, s = B.s;
  if (!s) return;
  const c = mxFit(B.cv, s, s), cx = s / 2, cy = s / 2, R = s / 2 - 2, n = MXC.length, span = 300 * Math.PI / 180, a0 = Math.PI / 2 + (MX_TAU - span) / 2;
  c.clearRect(0, 0, s, s);
  c.fillStyle = '#140f0c'; c.beginPath(); c.arc(cx, cy, R, 0, MX_TAU); c.fill();
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const cc = MXC[i], S = MX.ch[cc.k], a = a0 + i / (n - 1) * span, ca = Math.cos(a), sa = Math.sin(a), me = cc.k === MXD.k;
    const v = Math.max(S.lv.rms[0], S.lv.rms[1]), r1 = R * 0.56, r2 = r1 + (R - 1.5 - r1) * (0.18 + 0.82 * v);
    const col = cc.kind === 'puls' ? MXK['l' + S.lv.dom] : cc;
    c.strokeStyle = S.dorm ? 'rgba(118,106,97,.6)' : mxRgba(col.rgb, me ? 1 : 0.5); c.lineWidth = me ? 2.6 : 1.4;
    c.beginPath(); c.moveTo(cx + ca * r1, cy + sa * r1); c.lineTo(cx + ca * r2, cy + sa * r2); c.stroke();
  }
  c.strokeStyle = 'rgba(240,230,216,.92)'; c.lineWidth = 1.8; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(cx + 2, cy - 5); c.lineTo(cx - 3, cy); c.lineTo(cx + 2, cy + 5); c.stroke();
}

