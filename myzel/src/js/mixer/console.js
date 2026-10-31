/* =====================================================================
   The console ("Pult")
   ===================================================================== */
MXV.views.pult = { label: 'Pult', build: mxBuildPult, open: () => { MX.dirtyStatic = true; }, close: () => {}, frame: mxPultFrame, select: mxPultSelect, pulse: (k) => { if (MX.ch[k].g) mxSpawn(MXK[k].i, true); } };
function mxCapSvg(master) {
  const W = master ? 62 : 46, H = master ? 34 : 28, rim = master ? 23 : 19, cx = W / 2, n = master ? 17 : 13;
  let gills = '';
  for (let i = 0; i < n; i++) { const x = 5 + i * (W - 10) / (n - 1); gills += '<line x1="' + x.toFixed(1) + '" y1="' + (rim + 0.8) + '" x2="' + (cx + (x - cx) * 0.5).toFixed(1) + '" y2="' + (H - 1) + '"/>'; }
  const dome = 'M2 ' + rim + ' C2 ' + (rim * 0.42).toFixed(1) + ' ' + (W * 0.26).toFixed(1) + ' 2 ' + cx + ' 2 C' + (W * 0.74).toFixed(1) + ' 2 ' + (W - 2) + ' ' + (rim * 0.42).toFixed(1) + ' ' + (W - 2) + ' ' + rim + ' Q' + cx + ' ' + (rim + 3) + ' 2 ' + rim + ' Z';
  const warts = master ? '<circle cx="' + (cx - 13) + '" cy="10" r="1.4"/><circle cx="' + (cx + 9) + '" cy="7" r="1.1"/><circle cx="' + (cx + 2) + '" cy="14" r="1"/>' : '<circle cx="' + (cx - 8) + '" cy="8" r="1.1"/><circle cx="' + (cx + 6) + '" cy="6.5" r=".9"/>';
  // the parts carry classes, so a channel whose source is off can show an empty cap (outline only, no gill light)
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' +
    '<g class="cg" stroke="var(--c)" stroke-opacity=".5" stroke-width=".8" stroke-linecap="round">' + gills + '</g>' +
    '<ellipse class="ce" cx="' + cx + '" cy="' + (H - 1) + '" rx="' + (master ? 6 : 4.5) + '" ry="1.6" fill="var(--c)" fill-opacity=".55"/>' +
    '<path class="cd" d="' + dome + '" fill="url(#mxCap)" stroke="var(--c)" stroke-opacity=".85" stroke-width="1.2"/>' +
    '<path class="ch" d="' + dome + '" fill="url(#mxCapHi)"/><g class="cw" fill="#f0e6d8" fill-opacity=".2">' + warts + '</g>' +
    '<line class="cr" x1="-3" y1="' + rim + '" x2="' + (W + 3) + '" y2="' + rim + '" stroke="#f0e6d8" stroke-width="1.1" stroke-opacity=".95"/></svg>';
}
function mxSrcText(k) {
  const c = MXK[k];
  // a keyboard's expression (CC 11) below full: said where the sound would be missed
  const ex = MIDI.expr < 0.995 ? 'Ausdruck ' + Math.round(Math.sqrt(MIDI.expr) * 100) + ' %' : '';
  if (k === 'fin') return ex || engLabel(P['v.eng']) || '';
  if (EB_OF[k]) return !ENGINES[P[EB_OF[k].eng]] ? 'aus' : ex || engLabel(P[EB_OF[k].eng]);   // (Ebene 2–8)
  if (k === 'rgn') return rgOn() ? (GK.p.rgArt === 'harfe' ? 'Harfe · ' : '') + rgName() : 'aus';   // Sporenregen: its strike, or silent
  if (k === 'hxr') return hxSrcText();   // Hexenring: its Schleifen
  if (c.kind === 'lane') return P['l' + c.lane + '.on'] ? engLabel(P['l' + c.lane + '.eng']) : 'aus';
  if (k === 'bor') return P['bor.on'] ? fmt(PD['bor.wave'], P['bor.wave']) + ' ' + (MX_BOR[P['bor.int']] || '') : 'aus';
  if (k === 'gsp') return !gspInUse() ? 'aus' : DSP.state === 'kein' || A.workletBroken.has('gsp') ? 'kein Netz' : (P['gsp.saiten'] === 'zwei' ? 'zwei Oktaven' : 'eine Oktave');   // (the web's own channel)
  // the app writes a dotted value as "1/8 ·", which reads like a dangling separator here: "1/8." as in a score
  if (k === 'dly') return P['dly.sync'] ? fmt(PD['dly.div'], P['dly.div']).replace(' ·', '.') : fmt(PD['dly.ms'], P['dly.ms']);
  if (k === 'rev') return P['rev.typ'] !== 'nebel' && RAUM_BY[P['rev.typ']] ? RAUM_BY[P['rev.typ']].name : fmt(PD['rev.size'], P['rev.size']);   // (a room: its name)
  if (c.kind === 'ret') return fxType(k).name;   // (an effect return: the effect it plays)
  if (k === 'puls') return mxPulsOff() ? 'alle aus' : SEQ.on ? (SEQ.ext ? 'EXT ' + dec(SEQ.ext.bpm.toFixed(1)) : TG.hxOn ? dec(TG.hx.toFixed(1)) : Math.round(P['seq.bpm'])) + ' BPM' : 'steht';
  return (A.monoChk ? 'mono' : 'stereo') + (A.dim ? ' · ' + MX_MINUS + '20 dB' : '');
}
const mxPulsOff = () => !P['l0.on'] && !P['l1.on'] && !P['l2.on'] && !P['l3.on'];
const MX_SRC_IDS = [...EB.map((e) => e.eng), 'bor.on', 'bor.wave', 'bor.int', 'gsp.saiten', 'dly.sync', 'dly.div', 'dly.ms', 'rev.size', 'rev.typ', ...FX_RETS.map((x) => x[0] + '.typ'), 'seq.bpm', 'l0.on', 'l0.eng', 'l1.on', 'l1.eng', 'l2.on', 'l2.eng', 'l3.on', 'l3.eng'];
// A channel whose source plays nothing (an Ebene, a lane or the Bordun switched off; the Puls group with all four
// lanes off) is an empty mushroom in the Pult and a hollow spore in the Geflecht – one rule, kept in S.srcoff.
function mxSrcAll() {
  for (const c of MXC) {
    const S = MX.ch[c.k], t = mxSrcText(c.k);
    const off = (t === 'aus' && (c.kind === 'src' || c.kind === 'lane')) || (c.kind === 'puls' && t === 'alle aus');
    if (S.srcEl && S.srcEl.textContent !== t) {
      S.srcEl.textContent = t;
      S.head.setAttribute('aria-label', c.name + ', ' + t + (MXV.detail ? ' – Einzelheiten öffnen' : ' – auswählen'));
    }
    if (S.srcoff !== off) { S.srcoff = off; MX.dirtyStatic = true; }
    if (S.el) S.el.classList.toggle('srcoff', off);
    if (S.pb && S.pb.src.textContent !== t) S.pb.src.textContent = t;
    if (S.pb) S.pb.el.classList.toggle('srcoff', off);
    if (MXG.cols.length) mxgTag(MXG.cols[c.i], t, off);
  }
}

// the insert chain's effects, as beads on the chain rail and the Geflecht's knot: [mix param, name, initial]
const MX_FX = [['drv.mix', 'Verzerrung', 'V'], ['rng.mix', 'Ring', 'R'], [null, 'Filter', 'F'], ['pha.mix', 'Phaser', 'P'], ['cho.mix', 'Schweben', 'S']];
const mxFxOn = (j) => !MX_FX[j][0] || P[MX_FX[j][0]] > 0;
function mxBuildPult(host) {
  const scroll = MX.scroll = h('div', { class: 'mx-scroll' });
  const row = MX.row = h('div', { class: 'mx-row' });
  MX.cvs = h('canvas', { class: 'mx-cvs', 'aria-hidden': 'true' });
  MX.cvd = h('canvas', { class: 'mx-cvd', 'aria-hidden': 'true' });
  row.append(MX.cvs, MX.cvd);
  for (const [g, label] of MX_GROUPS) {
    const gs = h('div', { class: 'mx-gs' });
    for (const c of MXC) if (c.g === g) gs.append(mxStrip(c));
    const grp = h('div', { class: 'mx-grp mx-g-' + g, role: 'group', 'aria-label': label, style: 'flex-grow:' + gs.children.length }, h('div', { class: 'mx-gh', 'aria-hidden': 'true' }, g === 'sum' ? null : h('span', null, label)), gs);
    // the Summe column: a still layer (stem, scale, root) and a narrow live one over its meter
    if (g === 'sum') { MX.cvsumS = h('canvas', { class: 'mx-cvsum', 'aria-hidden': 'true' }); MX.cvsum = h('canvas', { class: 'mx-cvsum', 'aria-hidden': 'true' }); grp.prepend(MX.cvsumS, MX.cvsum); MX.sumGrp = grp; }
    row.append(grp);
    if (g === 'spiel' && typeof hxmPultGroup === 'function') row.append(hxmPultGroup());   // (owner, 26.10.2026: the Schleifen one by one, beside the Hexenring)
  }
  // the five beads of the chain rail name themselves under the mouse (they are drawn on the still layer)
  // (31.10.2026) a tap on one: the effect view – which channels go through it (wege-fx.js)
  MX.beads = MX_FX.map(([, name], i) => { const b = h('button', { type: 'button', class: 'mx-bead', 'aria-pressed': 'false', 'aria-label': name + ': welche Kanäle hindurchgehen' }); b.dataset.n = name; b.addEventListener('click', () => fxvSet(i)); row.append(b); return b; });
  fxmWire(row);
  scroll.append(row);
  host.append(scroll);
  // a press inside the rack selects without scrolling – the strip must not slide away under the finger
  scroll.addEventListener('pointerdown', () => { MX.ptrT = performance.now(); }, true);
  // a horizontal wheel or Shift + wheel scrolls the rack, a vertical one belongs to the control under the pointer
  scroll.addEventListener('wheel', (e) => {
    if (!MX.scrollable || !e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); scroll.scrollLeft += e.deltaY;
  }, { passive: false });
}

function mxStrip(c) {
  const k = c.k, S = MX.ch[k], sum = c.kind === 'sum', puls = c.kind === 'puls', vid = mxVolId(k), mid = mxMuteId(k), sid = mxSoloId(k);
  const el = S.el = h('div', { class: 'mx-st mx-' + c.kind, role: 'group', 'aria-label': sum ? 'Summe' : c.name, style: '--c:' + c.col, 'data-k': k });
  // head: colour, name, source; a tap selects the channel and opens its details
  const dot = puls ? h('i', { class: 'mx-dot4', 'aria-hidden': 'true' }, h('b'), h('b'), h('b'), h('b')) : h('i', { 'aria-hidden': 'true' });
  S.srcEl = h('span', { class: 'mx-src' });
  S.head = h('button', { type: 'button', class: 'mx-sh', onclick: () => { selectChannel(k); openDetail(k); } }, h('span', { class: 'mx-nm' }, dot, h('span', null, sum ? 'summe' : c.name)), S.srcEl);
  el.append(S.head);
  // knobs and buttons
  if (sum) {
    S.k1 = mxKnob({ ch: k, id: 'mst.comp', name: 'Verdichtung', label: 'Verdichtung', gr: () => MX.ch.sum.lv.gr, cls: 'k1' });
    S.k2 = mxKnob({ ch: k, id: 'mst.wid', name: 'Breite', label: 'Breite', cls: 'k2' });
    S.x1 = mxKnob({ ch: k, id: 'mst.low', name: 'Tiefen', label: 'Tiefen, 120 Hertz', col: '#ffb35c', cls: 'x1' });
    S.x2 = mxKnob({ ch: k, id: 'mst.high', name: 'Höhen', label: 'Höhen, 6,5 Kilohertz', col: '#86f0d0', cls: 'x2' });
    for (const K of [S.k1, S.k2, S.x1, S.x2]) bindCtl(K.id, () => mxKnobRender(K));
    // monitoring only: what you hear changes, recordings and meters stay as they are
    S.mb = h('button', { type: 'button', class: 'mx-m mx-mon', 'aria-pressed': 'false', 'aria-label': 'Summe mono abhören', title: 'Mono abhören (nur Abhöre)', onclick: () => { if (A.ctx) { setMonMono(!A.monoChk); mxMonSync(); } } }, h('span', null, 'Mono'));
    S.sb = h('button', { type: 'button', class: 'mx-s mx-mon', 'aria-pressed': 'false', 'aria-label': 'Abhöre um 20 Dezibel leiser', title: 'Abhöre 20 dB leiser (nur Abhöre)', onclick: () => { if (A.ctx) { setMonDim(!A.dim); mxMonSync(); } } }, h('span', null, MX_MINUS + '20 dB'));
    el.append(S.k1.box, S.k2.box, S.mb, S.sb);
  } else if (puls) {
    // the Puls group: its knob row shows the four rhythm rings – or, while the second knob is "Pumpen", the lane that
    // gives the beat and how fast the others swell back
    S.ringCv = h('canvas', { 'aria-hidden': 'true' });
    S.rings = h('button', { type: 'button', class: 'mx-rings', 'aria-label': 'Rhythmus der vier Spuren – Puls öffnen', onclick: () => openPanel('puls') }, S.ringCv);
    S.k1 = mxKnob({ ch: k, id: 'mix.duckRel', name: 'Rückkehr', label: 'Pumpen: Rückkehr', col: '#ff8f9e', cls: 'k1 duckonly' });
    bindCtl('mix.duckRel', () => mxKnobRender(S.k1));
    S.taktB = h('b');
    S.takt = h('button', { type: 'button', class: 'mx-takt duckonly', 'data-pid': 'mix.duckSrc', onclick: () => setParam('mix.duckSrc', String((Number(P['mix.duckSrc']) + 1) % 4)) }, h('span', { class: 'mx-tk' }, S.taktB), h('span', { class: 'mx-kl' }, 'Takt'));
    bindCtl('mix.duckSrc', (v) => {
      const i = Number(v);
      S.takt.style.setProperty('--tc', COL.lanes[i]);
      S.taktB.textContent = 'Spur ' + (i + 1);
      S.takt.setAttribute('aria-label', 'Pumpen im Takt von Spur ' + (i + 1) + ' – tippen für die nächste Spur');
      for (const cc of MXC) if (cc.kind === 'lane' && MX.ch[cc.k].k2) mxKnobRender(MX.ch[cc.k].k2);
      MX.ringsKey = '';
    });
    S.mb = h('button', { type: 'button', class: 'mx-m mx-wide', 'aria-pressed': 'false', 'aria-label': 'Puls stumm (alle vier Spuren)', 'data-pid': mid, onclick: () => setParam(mid, !P[mid]) }, h('span', null, 'M'));
    el.append(S.rings, S.k1.box, S.takt, S.mb);
  } else {
    S.k1 = mxKnob({ ch: k, id: 'x' + k + '.pan', name: 'Balance', label: 'Balance', cls: 'k1', ghost: () => mxGhostN('x' + k + '.pan') });
    bindCtl('x' + k + '.pan', () => mxKnobRender(S.k1));
    S.k2 = mxKnob({ ch: k, cls: 'k2', off: () => c.kind === 'lane' && MX.layer === 'duck' && Number(P['mix.duckSrc']) === c.lane, offTxt: 'Takt', offAria: 'gibt den Takt fürs Pumpen' });
    const cand = c.kind === 'ret' ? [k + '.mix', 'x' + k + '.duck', 'x' + k + '.wid'].concat(k !== 'rev' ? ['x' + k + '.rev'] : []) : ['dly', 'rev', ...FX_RETS.map((x) => x[0]), 'duck', 'wid'].map((s) => 'x' + k + '.' + s);
    for (const id of cand) bindCtl(id, () => { if (S.k2.id === id) mxKnobRender(S.k2); });
    mxK2Bind(S);
    S.mb = h('button', { type: 'button', class: 'mx-m', 'aria-pressed': 'false', 'aria-label': c.name + ' stumm', 'data-pid': mid, onclick: () => setParam(mid, !P[mid]) }, h('span', null, 'M'));
    S.sb = h('button', { type: 'button', class: 'mx-s', 'aria-pressed': 'false', 'aria-label': c.name + ' solo', title: 'Solo – halten oder Alt-Klick: nur dieser Kanal', 'data-pid': sid }, h('span', null, 'S'));
    mxSoloBtn(S.sb, k);
    bindCtl(sid, (v) => S.sb.setAttribute('aria-pressed', String(!!v)));
    el.append(S.k1.box, S.k2.box, S.mb, S.sb);
  }
  if (mid) bindCtl(mid, (v) => { S.mb.setAttribute('aria-pressed', String(!!v)); MX.dirtyStatic = true; });
  // the stem: canvas meter behind it (drawn by the rack), the cap, the peak readout on top
  // the peak readout and the value are pointer shortcuts; from the keyboard the cap does both (R, 0)
  S.stem = h('div', { class: 'mx-stem', 'data-pid': vid });
  S.pk = h('button', { type: 'button', class: 'mx-pk', tabindex: '-1', onclick: () => mxPeakReset(k) }, h('span', null, MX_MINUS + '∞'));
  const d = PD[vid];
  S.cap = h('div', { class: 'mx-cap', role: 'slider', tabindex: '0', 'aria-orientation': 'vertical', 'aria-label': (sum ? 'Summe' : c.name) + ' Pegel', 'aria-keyshortcuts': MX_VOLKEYS + ' R', 'aria-valuemin': String(d.min), 'aria-valuemax': String(d.max), html: mxCapSvg(sum) });
  S.stem.append(S.pk, S.cap);
  if (sum) S.stem.append(h('div', { class: 'mx-xk' }, S.x1.box, S.x2.box));
  S.val = h('button', { type: 'button', class: 'mx-val', tabindex: '-1' }, h('span'));
  el.append(S.stem, S.val);
  mxDrag(S.stem, {
    axis: 'y', host: () => MX.root, span: () => (S.g ? S.g.span : 160), get: () => mxPos(P[vid]), focus: S.cap, anchor: () => S.cap,
    set: (n, fine) => mxFader(k, mxDb(n), fine), tip: () => mxTipVol(k), skip: (e) => !!e.target.closest('.mx-pk, .mx-xk'),
  });
  S.cap.addEventListener('keydown', (e) => {
    if (mxVolKey(e, vid)) mxTipFlash(MX.root, S.cap, mxTipVol(k));
    else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) { mxPeakReset(k); mxTipFlash(MX.root, S.cap, { n: (sum ? 'Summe' : c.name) + ' · Spitze', v: 'zurückgesetzt', c: c.col }); e.preventDefault(); e.stopPropagation(); }
  });
  S.stem.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey && MX.scrollable) return;
    e.preventDefault();
    const v = P[vid], b = v > FADER_OFF ? v : d.min;
    setParam(vid, clamp(Math.round((b + (e.deltaY < 0 ? 0.5 : -0.5)) * 10) / 10, d.min, d.max));
    mxTipFlash(MX.root, S.cap, mxTipVol(k));
  }, { passive: false });
  // 0 dB only by a double tap on the number below the stem – never on the stem itself
  mxDbl(S.val, () => { setParam(vid, 0); mxTipFlash(MX.root, S.cap, mxTipVol(k)); });
  bindCtl(vid, () => mxCapPlace(k));
  // M and S also from the keyboard, anywhere in the strip
  el.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'm' && mid) { setParam(mid, !P[mid]); e.preventDefault(); }
    else if (key === 's' && sid) { setParam(sid, !P[sid]); e.preventDefault(); }
  });
  el.addEventListener('focusin', () => { if (MX.sel !== k) selectChannel(k); });
  // the route node stands in the soil under the strip but belongs to it: Tab reaches it after S, a screen reader
  // finds it in the channel's group
  if (c.kind === 'src' || c.kind === 'lane') el.append(mxNode(c));
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { MX.hov = k; MX.sendT = performance.now(); } });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && MX.hov === k) MX.hov = null; });
  return el;
}
// Solo: a tap toggles; holding it (or Alt / Shift with a mouse) solos this channel alone. k may be a function
// (the detail's S button follows whichever channel is open).
function mxSoloBtn(b, k) {
  let tm = 0, held = false;
  const ch = () => (typeof k === 'function' ? k() : k);
  b.addEventListener('pointerdown', () => { held = false; clearTimeout(tm); tm = setTimeout(() => { held = true; mxBuzz(); mxSolo(ch(), true); }, 520); });
  const stop = () => clearTimeout(tm);
  b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('pointerleave', stop);
  b.addEventListener('click', (e) => { if (held) { held = false; return; } mxSolo(ch(), e.altKey || e.shiftKey); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
function mxSolo(k, only) {
  const id = mxSoloId(k);
  if (!id) return;
  if (only) {
    for (const st of STRIPS) { const o = 'x' + st.k + '.solo'; if (o !== id && P[o]) setParam(o, false); }
    setParam(id, true);
    toast('Nur ' + MXK[k].name + ' im Solo', 1600);
  } else setParam(id, !P[id]);
}
function mxMonSync() {
  const S = MX.ch.sum;
  if (!S.mb) return;
  S.mb.setAttribute('aria-pressed', String(!!A.monoChk)); S.sb.setAttribute('aria-pressed', String(!!A.dim));
  S.mb.disabled = S.sb.disabled = !A.ctx;
  mxSrcAll();
}
// the second knob of a strip follows the layer chosen in the head; the returns show their own amount (the send
// master) while the layer is a send
function mxK2Bind(S) {
  const c = S.c, l = MX.layer, L = MX_LAYERS.find((x) => x[0] === l);
  if (c.kind === 'ret' && l !== 'duck' && l !== 'wid') S.k2.set(c.k + '.mix', 'Anteil', 'Anteil (wie viel alle Kanäle hineinschicken)', c.col);
  else S.k2.set('x' + c.k + '.' + l, L[2], MX_LAYER_ARIA[l], L[3]);
}
function mxSetLayer(l, say) {
  if (!MX_LAYERS.some((x) => x[0] === l)) return;
  MX.layer = l;
  store.set('myzel.mixlayer', l);
  if (MX.root) MX.root.dataset.layer = l;
  for (const b of MX.regBtns || []) { const on = b.dataset.l === l; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
  const C = MX.regC, L = MX_LAYERS.find((x) => x[0] === l), N = MX_LAYERS[(MX_LAYERS.indexOf(L) + 1) % MX_LAYERS.length];
  if (C) {
    C.el.style.setProperty('--lc', L[3]); C.t.textContent = L[1];
    C.el.setAttribute('aria-label', 'Zweiter Regler jedes Kanals: ' + L[1] + ' – tippen wechselt zu ' + N[1]);
    C.el.title = '2. Regler: ' + L[1] + ' – tippen für ' + N[1];
  }
  if (say) mxSay('Zweiter Regler: ' + L[1]);
  for (const c of MXC) { const S = MX.ch[c.k]; if (S.k2 && c.kind !== 'sum') mxK2Bind(S); }
  MX.ringsKey = '';
}
// a polite announcement for screen readers (one live region for the whole mixer)
function mxSay(txt) {
  if (!MX.live) return;
  clearTimeout(MX.sayTm);
  MX.sayTm = setTimeout(() => { MX.live.textContent = txt; }, 120);
}
function mxFader(k, db, fine) {
  const id = mxVolId(k), d = PD[id];
  if (!fine && Math.abs(db) < 0.4) db = 0;
  if (db <= -59.6) db = -60;
  setParam(id, clamp(Math.round(db * 10) / 10, d.min, d.max));
}
const mxTipVol = (k) => ({ n: MXK[k].kind === 'sum' ? 'Summe' : MXK[k].name, v: P[mxVolId(k)] > FADER_OFF ? mxDbTxt(P[mxVolId(k)]) + ' dB' : 'aus', c: MXK[k].col });
// the cap rides on the stem; its rim marks the level
function mxCapPlace(k) {
  const S = MX.ch[k], id = mxVolId(k), v = P[id], t = mxDbTxt(v);
  S.capPos = mxPos(v);
  if (S.g) S.cap.style.transform = 'translate(-50%,' + (S.g.yb - S.capPos * S.g.span - S.g.y - 22).toFixed(1) + 'px)';
  S.cap.setAttribute('aria-valuenow', String(v));
  S.cap.setAttribute('aria-valuetext', mxDbAria(v));
  const vs = S.val.firstChild;
  if (vs.textContent !== t) vs.textContent = t;
  S.val.setAttribute('aria-label', (k === 'sum' ? 'Summe' : MXK[k].name) + ' Pegel ' + (v > FADER_OFF ? t + ' dB' : 'aus') + ' – doppeltippen setzt 0 dB');
}
// route node in the soil: tap to switch between the insert chain and straight into the sum
function mxNode(c) {
  const k = c.k, id = 'x' + k + '.route';
  // (31.10.2026) pressed: the whole chain on or off – in the effect view that one effect (wege-fx.js); a stroke paints
  const b = h('button', { type: 'button', class: 'mx-node', role: 'switch', 'data-pid': id, 'data-fxk': k });
  b.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); fxmPress(k, e); });
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fxmPress(k, e); fxmRelease(); } });
  if (PD['x' + k + '.fxm']) bindCtl('x' + k + '.fxm', () => { MX.dirtyStatic = true; b.title = fxmSay(k); });
  bindCtl(id, (v) => {
    b.setAttribute('aria-checked', String(v === 'dir'));
    b.setAttribute('aria-label', c.name + ': direkt in die Summe, an der Effektkette vorbei');
    b.title = fxmSay(k) + ' – tippen zum Umschalten; ein Effekt rechts (V R F P S) wählt ihn einzeln';
    MX.dirtyStatic = true;
  });
  MX.ch[k].node = b;
  return b;
}
// a/b ghosts of a parameter while the morph is in use: [norm A, norm B] or null when both are the same
function mxGhostN(id) {
  const a = MX.snap.a && MX.snap.a[id], b = MX.snap.b && MX.snap.b[id], d = PD[id];
  if (a === undefined || b === undefined || a === b) return null;
  return [clamp(toNorm(d, a), 0, 1), clamp(toNorm(d, b), 0, 1)];
}

/* ---------- rack geometry ---------- */
// Layout decides three things from the space the panel gets: the band (wide: three columns; narrow: two rows;
// short: one slim row), where "2. Regler" goes (see mxRegPlace) and the strips – "classic" with the knobs on top
// while the stems keep ~140 px of travel, "side" with the knobs beside the stem and M/S below, "tight" for landscape
// phones. Under 380 px the Summe slims to stem, Mono and −20 dB (its knobs wait in its Fruchtkörper), so a third
// channel fits beside it.
const MX_PKH = 20;   // above the stem's travel: the held peak, which is also the clip lamp
function mxLayout() {
  const R = MX.root;
  if (!R || !MX.open) return;
  const w = R.clientWidth, hh = R.clientHeight;
  if (!w || !hh) return;
  MX.wide = w >= 620;
  R.dataset.w = MX.wide ? 'wide' : 'narrow';
  R.dataset.short = hh < 360 ? '1' : '';
  R.dataset.mlfit = w >= 520 ? '1' : '';   // the low head has room for the learn button beside the "?"
  R.dataset.sumslim = !MX.wide && w < 380 && hh >= 360 ? '1' : '';
  mxRegPlace();
  mxBandLayout();
  if (MX.view === 'pult' && MX.scroll) {
    // classic needs ~270 px around the stem, side ~170 px (knobs beside it, M/S below), tight ~50 px (no rails, no
    // group labels, compact controls beside the stem – landscape phones)
    const rackH = MX.scroll.clientHeight;
    MX.strip = rackH - 268 >= 140 ? 'classic' : rackH >= 290 ? 'side' : 'tight';
    R.dataset.strip = MX.strip;
    R.dataset.roomy = MX.wide && MX.ch.fin.el.offsetWidth >= 80 ? '1' : '';
    mxGeom();
  } else if (MXV.views[MX.view] && MXV.views[MX.view].layout) MXV.views[MX.view].layout();
  if (MXV.detail && MXV.detail.layout && MX.detailK) MXV.detail.layout();
  // the detail slimmed or widened the head (the panel crossed between phone and wide): lay out once more
  if (MX.relayout) { MX.relayout = false; mxLayout(); }
}
function mxGeom() {
  const row = MX.row, sc = MX.scroll;
  MX.vw = sc.clientWidth;
  const sumW = MX.sumGrp.offsetWidth;
  MX.sumW = sumW;
  MX.scrollable = row.scrollWidth > sc.clientWidth + 2;
  MX.root.dataset.scroll = MX.scrollable ? '1' : '';
  const rr = row.getBoundingClientRect();
  MX.rowW = row.scrollWidth; MX.rowH = row.clientHeight;
  MX.soil = parseFloat(getComputedStyle(row).paddingBottom) || 0;
  const soilY = MX.rowH - MX.soil;
  // the two rails in the upper two thirds of the soil; the send threads dip below them
  MX.yK = soilY + MX.soil * 0.32; MX.yD = soilY + MX.soil * 0.62;
  MX.railEnd = MX.rowW - sumW + 14;
  const side = MX.strip !== 'classic', capW = side || MX.wide ? 40 : 46, slim = MX.root.dataset.sumslim === '1';
  const sg = MX.sumGrp.getBoundingClientRect();
  for (const c of MXC) {
    const S = MX.ch[c.k], r = S.stem.getBoundingClientRect(), sum = c.kind === 'sum';
    const ox = sum ? sg.left : rr.left, oy = sum ? sg.top : rr.top;
    const g = S.g = { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height };
    g.sw = sum ? (slim ? 18 : 22) : side || MX.wide ? 14 : 16;
    g.capW = sum ? (slim ? 44 : 48) : capW;
    // stem a little right of centre: the scale stands left of the cap, the Pumpen bar right of the stem; the
    // Summe keeps a column on the right for Tiefen and Höhen, which its cap never reaches (the slim one has none)
    g.cx = sum ? (slim ? g.x + g.w - g.capW / 2 - 4 : g.x + 48) : side ? g.x + g.w - g.capW / 2 - 2 : g.x + g.w / 2 + Math.min(8, g.w * 0.08);
    g.lx = g.cx - g.capW / 2 - (sum ? 5 : 3);
    g.yt = g.y + MX_PKH; g.yb = g.y + g.h - 11; g.span = Math.max(20, g.yb - g.yt);
    S.cap.style.left = (g.cx - g.x).toFixed(1) + 'px';
    S.pk.style.left = (g.cx - g.x).toFixed(1) + 'px';
    S.cap.style.width = (g.capW + 2) + 'px';
    // the svg scales with the cap; its rim must sit on the level, 22 px down in the cap
    S.cap.firstChild.style.top = (22 - (sum ? 23 * g.capW / 62 : 19 * g.capW / 46)).toFixed(1) + 'px';
    // the value box centres under the stem, not under the strip
    const off = 2 * (g.cx - g.x - g.w / 2);
    S.val.style.paddingLeft = Math.max(0, off).toFixed(1) + 'px'; S.val.style.paddingRight = Math.max(0, -off).toFixed(1) + 'px';
    mxCapPlace(c.k);
    S.grad = null; S.gradKey = '';
    for (const K of [S.k1, S.k2, S.x1, S.x2]) if (K) { const s = Math.round(K.cv.clientWidth); if (s && s !== K.size) { K.size = s; mxKnobRender(K); } }
  }
  // route nodes: in the soil right under their strip (they no longer reach up into the value box)
  for (const c of MXC) {
    const S = MX.ch[c.k];
    if (!S.node) continue;
    const sx = S.el.getBoundingClientRect().left - rr.left;
    Object.assign(S.node.style, { left: (S.g.cx - sx - 22).toFixed(1) + 'px', top: (S.el.offsetHeight + 1) + 'px', height: Math.max(30, MX.soil - 1) + 'px' });
  }
  if (MX.ch.puls.ringCv) { const r = MX.ch.puls.ringCv.getBoundingClientRect(); MX.ringW = r.width; MX.ringH = r.height; MX.ringsKey = ''; }
  let top = MX.rowH;
  for (const c of MXC) top = Math.min(top, MX.ch[c.k].g.yt - 48);
  MX.top = Math.max(0, Math.floor(top));
  for (const cv of [MX.cvs, MX.cvd]) { cv.style.width = MX.rowW + 'px'; cv.style.height = (MX.rowH - MX.top) + 'px'; cv.style.top = MX.top + 'px'; }
  MX.sumH = sg.height; MX.sumWd = sg.width;
  const sgm = MX.ch.sum.g;
  MX.sumX = Math.max(0, Math.floor(sgm.cx - 40)); MX.sumLW = Math.min(sg.width - MX.sumX, 80);
  MX.cvsumS.style.top = MX.top + 'px'; MX.cvsumS.style.height = (sg.height - MX.top) + 'px'; MX.cvsumS.style.width = sg.width + 'px';
  Object.assign(MX.cvsum.style, { top: MX.top + 'px', height: (sg.height - MX.top) + 'px', left: MX.sumX + 'px', width: MX.sumLW + 'px' });
  MX.dirtyStatic = true;
  if (MX.scrollAria) MX.scrollAria();
  mxSprites();
}
function mxGrad(c, g, rgb, dorm) {
  const gr = c.createLinearGradient(0, g.yb, 0, g.yt);
  gr.addColorStop(0, mxRgba(rgb, dorm ? 0.1 : 0.16)); gr.addColorStop(0.45, mxRgba(rgb, dorm ? 0.22 : 0.45));
  gr.addColorStop(0.74, mxRgba(rgb, dorm ? 0.3 : 0.8));
  gr.addColorStop(0.8, dorm ? mxRgba(rgb, 0.36) : 'rgba(255,240,222,.94)');
  gr.addColorStop(0.87, dorm ? mxRgba(rgb, 0.36) : 'rgba(255,179,92,.96)');
  gr.addColorStop(1, dorm ? mxRgba(rgb, 0.36) : 'rgba(255,91,77,1)');
  return gr;
}

