/* ---------- Wege durch einzelne Effekte (owner, 31.10.2026) ---------- */
// „Eine Schleife geht nur durch einen Effekt, wenn man das möchte – das soll unten im Pult alles zu setzen sein, ohne dass
// es umständlich wird … das Design so behalten (die Punkte, die Animation), mit den Neuerungen.“ (dev/klang/routing-konzept.md)
// Every channel on „Kette“ goes through a set of the chain's five effects (x<k>.fxm, a mask in MX_FX's order: 1 V, 2 R,
// 4 F, 8 P, 16 S – 31 the whole chain, as before). The Pult keeps its rails and knots: a knot switches Kette ↔ Direkt; the
// beads V R F P S on the chain rail are the switches of the channel being worked on (selected in the mixer, or a
// Schleife's strip or knot touched) – lit in its colour where it goes through, its name under them. A knot that goes
// through only some effects wears a fine ring of five ticks; its spores hop under the beads it skips and light the ones
// it goes through. The Schleifen of the Hexenring have knots of their own under their strips (hexenring/weg.js).

// ---- the sound: a chain per set of effects, shared by the channels that use it ----
const wfxOf = (k) => { if (!PD['x' + k + '.route'] || P['x' + k + '.route'] === 'dir') return 0; const m = Math.round(P['x' + k + '.fxm'] != null ? P['x' + k + '.fxm'] : FXM_ALL) & FXM_ALL; return m; };
const wfxNames = (m) => MX_FX.filter((_, j) => m & (1 << j)).map((f) => f[1]);
const wfxWords = (m) => (m < 0 ? 'die Spuren gehen verschiedene Wege' : !m ? 'direkt in die Summe' : m === FXM_ALL ? 'durch die ganze Effektkette' : 'nur durch ' + wfxNames(m).join(' → '));
const wfxText = (v) => { const m = Math.round(v) & FXM_ALL; return m === FXM_ALL ? 'alle' : m ? wfxNames(m).join(', ') : 'keiner'; };
// where a channel's dry path goes for a set of effects
function wfxIn(m) { return !m ? A.masterSum : m === FXM_ALL ? A.voiceBus : wfxChain(m).in; }
function wfxChain(m) {
  A.fxm = A.fxm || {};
  let c = A.fxm[m];
  if (c && c.in.context === A.ctx) return c;
  c = makeChain(m);
  updDrive(c); updRing(c); updFilter(c); updPhaser(c); updChorus(c);
  c.out.connect(A.masterSum);
  // what it sends to Echo, Hall and the returns: its own output, as the whole chain's does – while the sends run plain
  c.from = {};
  for (const fx in A.send || {}) { const S = A.send[fx], g = G(S.mode === 'copy' ? 0 : 1); c.out.connect(g).connect(S.target); c.from[fx] = g; }
  A.fxm[m] = c;
  wfxGc();
  return c;
}
// chains no channel uses any more go after a while (each costs what the chain costs)
function wfxGc() {
  clearTimeout(A.fxmGcT);
  A.fxmGcT = setTimeout(() => {
    if (!A.fxm) return;
    const used = new Set(MIX.src.map((st) => wfxOf(st.k)));
    for (const m in A.fxm) if (!used.has(+m)) { const c = A.fxm[m]; try { c.out.disconnect(); } catch (e) {} A.chains = A.chains.filter((x) => x !== c); delete A.fxm[m]; }
  }, 4000);
}

// ---- the channels the Pult routes: its own (x<k>.route, x<k>.fxm) and the Schleifen ('hl:' + key) ----
const wfxLoop = (k) => (k.startsWith('hl:') ? hxByKey(k.slice(3)) : null);
// the Puls: its four Spuren as one – their common set, or -1 while they differ
const WFX_LANES = ['l0', 'l1', 'l2', 'l3'];
function wfxPulsGet() { const ms = WFX_LANES.map((l) => wfxOf(l)); return ms.every((m) => m === ms[0]) ? ms[0] : -1; }
function wfxGet(k) {
  if (k === 'puls') return wfxPulsGet(); const L = k.startsWith('hl:') ? wfxLoop(k) : null; return L ? hxWegM(L) : k === 'hxr' ? (P['xhxr.route'] === 'dir' ? 0 : Math.round(P['xhxr.fxm']) & FXM_ALL) : wfxOf(k); }
function wfxSet(k, m) {
  m &= FXM_ALL;
  if (k === 'puls') { for (const l of WFX_LANES) wfxSet(l, m); return; }
  if (k.startsWith('hl:')) { const L = wfxLoop(k); if (L) hxWegSet(L, m ? 'fx' : 'dir', m || null); return; }
  if (m) setParam('x' + k + '.fxm', m);
  setParam('x' + k + '.route', m ? 'fx' : 'dir');
  MX.dirtyStatic = true;
}
const wfxName = (k) => (k.startsWith('hl:') ? (wfxLoop(k) ? hxName(wfxLoop(k)) : 'Schleife') : MXK[k] ? MXK[k].name : k);
function wfxSay(k) { const m = wfxGet(k); return wfxName(k) + ': ' + (k === 'hxr' ? 'alle Schleifen ' : k === 'puls' && m >= 0 ? 'alle vier Spuren ' : '') + wfxWords(m); }

// one effect on or off for a channel (the Puls: for each of its Spuren, the rest of each kept)
function wfxBit(k, b, on) { if (k === 'puls') { for (const l of WFX_LANES) wfxBit(l, b, on); return; } const m = wfxGet(k); if (!!(m & b) !== on) wfxSet(k, on ? m | b : m & ~b); }
const wfxHas = (k, b) => (k === 'puls' ? WFX_LANES.every((l) => wfxOf(l) & b) : !!(wfxGet(k) & b));
// ---- the beads are the switches (owner, 31.10.2026: „es macht keinen Unterschied, ob F angeklickt wurde … mehrere
// aktivieren oder deaktivieren“): V R F P S on the chain rail show and switch the effects of the channel being worked on –
// the one selected in the mixer (a strip, the Puls, the Hexenring), or a Schleife whose strip or knot was touched. Lit in its
// colour: it goes through that effect. A tap switches one, as many as wanted; Alt: only this one; held with Umschalt:
// only while held. A channel on Direkt that gets an effect goes on Kette with just it; the last one off: Direkt. The knots
// keep Kette ↔ Direkt – and keep the choice of effects for the way back.
const WFX = { t: 'fin', hold: null };
const wfxCan = (k) => !!k && (k.startsWith('hl:') ? !!wfxLoop(k) : k === 'puls' || (MXK[k] && (MXK[k].kind === 'src' || MXK[k].kind === 'lane') && !!PD['x' + k + '.route']));
const wfxTarget = () => (wfxCan(WFX.t) ? WFX.t : 'fin');
// the channel the beads work on (quiet: no word – a selection in the mixer)
function wfxAim(k, quiet) {
  if (!wfxCan(k)) return false;
  if (WFX.t !== k) { WFX.t = k; MX.dirtyStatic = true; wfxBeadsSay(); }
  if (!quiet && MX.root && MX.beads) mxTipFlash(MX.root, MX.beads[2], { n: wfxName(k), v: 'die Effekte darunter gelten jetzt für ' + (k === 'puls' ? 'alle vier Spuren' : k === 'hxr' ? 'alle Schleifen' : 'diese Spur') });
  return true;
}
const wfxCol = (k) => (k.startsWith('hl:') ? (FXL.geo.find((G2) => G2.k === k) || {}).col || '#e9a35e' : MXK[k] ? MXK[k].col : '#ffb35c');
function wfxBeadsSay() {
  if (!MX.beads) return;
  const t = wfxTarget();
  MX.beads.forEach((B, j) => { const on = wfxHas(t, 1 << j), off = !mxFxOn(j); B.setAttribute('aria-pressed', String(on)); B.title = wfxName(t) + ' · ' + MX_FX[j][1] + (on ? ': an – die Spur geht hindurch' : ': aus') + (off ? ' (der Effekt steht auf 0 % – unter „Effekte“ aufdrehen)' : '') + ' · tippen: an/aus · Alt: nur dieser · Umschalt halten: nur solange'; B.setAttribute('aria-label', B.title); });
}
// a bead pressed: that effect on or off for the channel worked on
function wfxBead(j, e) {
  const t = wfxTarget(), b = 1 << j, was = wfxGet(t);
  if (e && e.altKey) { if (t === 'puls') for (const l of WFX_LANES) wfxSet(l, b); else wfxSet(t, b); }
  else {
    const on = !wfxHas(t, b);
    if (e && e.shiftKey) WFX.hold = { k: t, ms: t === 'puls' ? WFX_LANES.map((l) => [l, wfxGet(l)]) : [[t, was]] };
    if (on && was <= 0 && t !== 'puls') wfxSet(t, b);   // (from Direkt: on Kette with just this one)
    else wfxBit(t, b, on);
  }
  MX.dirtyStatic = true; wfxBeadsSay();
  const on = wfxHas(t, b);
  if (MX.root && MX.beads) mxTipFlash(MX.root, MX.beads[j], { n: wfxName(t), v: MX_FX[j][1] + (on ? ' an' : ' aus') + (on && !mxFxOn(j) ? ' – steht auf 0 %, unter „Effekte“ aufdrehen' : '') + ' · ' + wfxWords(wfxGet(t)), c: wfxCol(t) });
}
function wfxRelease() { if (WFX.hold) { const H = WFX.hold; WFX.hold = null; for (const [kk, mm] of H.ms) wfxSet(kk, mm); MX.dirtyStatic = true; wfxBeadsSay(); } }
// a knot pressed: Kette ↔ Direkt (its choice of effects kept for the way back), and it becomes the one the beads work on
function wfxRoute(k, on) {
  if (k === 'puls') { for (const l of WFX_LANES) wfxRoute(l, on); return; }
  if (k.startsWith('hl:')) { const L = wfxLoop(k); if (L) hxWegSet(L, on ? 'fx' : 'dir'); return; }
  if (on && !(Math.round(P['x' + k + '.fxm']) & FXM_ALL)) setParam('x' + k + '.fxm', FXM_ALL);
  setParam('x' + k + '.route', on ? 'fx' : 'dir');
}
function wfxPress(k) {
  wfxAim(k, true);
  wfxRoute(k, !wfxGet(k));
  MX.dirtyStatic = true; wfxBeadsSay(); wfxTell(k);
}
function wfxTell(k) { const B = wfxNode(k); if (B) { B.title = wfxSay(k); B.setAttribute('aria-label', wfxSay(k)); } if (MX.root) mxTipFlash(MX.root, B, { n: wfxName(k), v: wfxWords(wfxGet(k)) + ' · die Effekte darunter: V R F P S' }); }
// every channel with a knot, in Pult order
function wfxKeys() { const ks = MXC.filter((c) => c.kind !== 'sum' && c.kind !== 'ret' && !MX.ch[c.k].gone).map((c) => c.k); for (const S of (typeof HXMP !== 'undefined' && !HXMP.fold && HXMP.st) || []) ks.push('hl:' + S.key); return ks; }
const wfxNode = (k) => (k.startsWith('hl:') ? FXL.nodes.get(k) : MX.ch[k] && MX.ch[k].node);
function wfxWire(row) {
  window.addEventListener('pointerup', wfxRelease); window.addEventListener('pointercancel', wfxRelease); window.addEventListener('keyup', (e) => { if (e.key === 'Shift') wfxRelease(); });
  // a Schleife's strip touched in the Pult: the beads work on it
  row.addEventListener('pointerdown', (e) => { if (typeof HXMP === 'undefined') return; const S = HXMP.st.find((x) => x.el && x.el.contains(e.target)); if (S) wfxAim('hl:' + S.key, true); }, true);
}

// ---- the Schleifen's knots in the Pult: a button under each loop strip, its place from the strip ----
const FXL = { nodes: new Map(), geo: [] };
function fxlSync() {
  if (typeof HXMP === 'undefined' || !MX.row) return;
  const want = new Set(HXMP.fold || HXMP.grp.hidden ? [] : HXMP.st.map((S) => 'hl:' + S.key));
  for (const [k, b] of FXL.nodes) if (!want.has(k)) { b.remove(); FXL.nodes.delete(k); }
  for (const k of want) if (!FXL.nodes.has(k)) {
    const b = h('button', { type: 'button', class: 'mx-node fxl-node', 'data-fxk': k });
    b.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); wfxPress(k); });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wfxPress(k); } });
    MX.row.append(b); FXL.nodes.set(k, b);
  }
  // the geometry: each loop strip's stem centre and foot, in the row's coordinates (the rails' canvas shares them)
  const rr = MX.row.getBoundingClientRect();
  FXL.geo = [];
  for (const S of want.size ? HXMP.st : []) {
    const k = 'hl:' + S.key, b = FXL.nodes.get(k), L = hxByKey(S.key), r = (S.cv || S.el).getBoundingClientRect();
    if (!b || !L || !r.width) continue;
    const cx = r.left - rr.left + r.width / 2, yb = r.bottom - rr.top;
    Object.assign(b.style, { left: (cx - 22).toFixed(1) + 'px', top: (MX.yK - 22 + MX.top * 0).toFixed(1) + 'px', height: Math.max(30, MX.yD - MX.yK + 44) + 'px' });
    b.title = wfxSay(k); b.setAttribute('aria-label', wfxSay(k));
    FXL.geo.push({ k, cx, yb, col: S.col ? S.col() : '#e9a35e', S, L });
  }
}

// ---- drawing (the Pult's still layer and its live one, console-draw.js) ----
// a knot's mark: a fine ring of five ticks when it goes through only some of the effects (the whole chain and Direkt stay
// the plain dots they were); the channel the beads work on wears a soft halo in its colour, at the rail it is on
function mxFxmMark(c, x, yK, yD, fm, rgb, tgt) {
  if (fm > 0 && fm !== FXM_ALL) for (let j = 0; j < 5; j++) {
    const a0 = -Math.PI / 2 + (j / 5) * MX_TAU + 0.2, a1 = -Math.PI / 2 + ((j + 1) / 5) * MX_TAU - 0.2, on = fm & (1 << j);
    c.strokeStyle = on ? mxRgba(rgb, 0.9) : 'rgba(240,230,216,.14)'; c.lineWidth = on ? 1.4 : 1;
    c.beginPath(); c.arc(x, yK, 6.8, a0, a1); c.stroke();
  }
  if (tgt) { const y = fm ? yK : yD; c.fillStyle = mxRgba(rgb, 0.1); c.beginPath(); c.arc(x, y, 10.5, 0, MX_TAU); c.fill(); c.strokeStyle = mxRgba(rgb, 0.55); c.lineWidth = 1; c.beginPath(); c.arc(x, y, 9.5, 0, MX_TAU); c.stroke(); }
}
// a spore on the chain rail at x: under a bead its channel skips it hops (dy > 0); through one it passes it lights it
// (the bead's index, or -1)
function mxFxmSpore(x, fm) {
  const B = MX.bx; if (!B || !fm) return [0, -1];
  for (let j = 0; j < 5; j++) {
    const d = x - B[j];
    if (d > -11 && d < 11) { if (fm & (1 << j)) return [0, j]; const u = Math.cos((Math.PI / 2) * (d / 11)); return [8.5 * u * u, -1]; }
  }
  return [0, -1];
}
// the Schleifen's spores: down from their strip to their rail and on towards the sum, as many as they sound
const FXLP = [];
function mxLoopSpores(c, dt, x0, x1) {
  if (REDUCED || !FXL.geo.length) return;
  for (const G2 of FXL.geo) {
    const lv = G2.S.lv ? G2.S.lv.lvl || 0 : 0;
    if (G2.L.state === 'spielt' && FXLP.length < 60 && Math.random() < lv * dt * 9) FXLP.push({ G: G2, d: 0, v: 42 + Math.random() * 34, s: 0.7 + Math.random() * 0.6 });
  }
  c.globalCompositeOperation = 'lighter';
  for (let i = FXLP.length - 1; i >= 0; i--) {
    const Q = FXLP[i], G2 = Q.G, fm = wfxGet(G2.k), ry = fm ? MX.yK : MX.yD, y0 = G2.yb + 4, dn = ry - y0, L = dn + Math.max(0, MX.railEnd - G2.cx);
    Q.d += Q.v * dt;
    if (Q.d >= L || !FXL.nodes.has(G2.k)) { FXLP.splice(i, 1); continue; }
    const d = Q.d, x = d < dn ? G2.cx : G2.cx + d - dn;
    if (x < x0 || x > x1) continue;
    const [dy, lit] = d < dn ? [0, -1] : fm === FXM_ALL ? [0, -1] : mxFxmSpore(x, fm), y = (d < dn ? y0 + d : ry) + dy, a = Math.min(1, d / 10, (L - d) / 30) * 0.85, g = mxGlow(G2.col);
    c.globalAlpha = a; c.drawImage(g, x - 5, y - 5, 10, 10);
    if (lit >= 0) { c.globalAlpha = a * 0.55; c.drawImage(g, MX.bx[lit] - 11, MX.yK - 11, 22, 22); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
