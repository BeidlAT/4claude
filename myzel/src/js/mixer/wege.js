/* ---------- Wege: level, balance, mute/solo, sends, route ---------- */
function mxdBuildWege() {
  const W = MXD.wg = {};
  W.fd = mxdFader('h');
  W.bal = mxdKnob('bal');
  W.mb = h('button', { type: 'button', class: 'mx-m mxd-ms', 'aria-pressed': 'false', onclick: () => { const id = mxMuteId(MXD.k); if (id) setParam(id, !P[id]); } }, h('span', null, 'M'));
  W.sb = h('button', { type: 'button', class: 'mx-s mxd-ms', 'aria-pressed': 'false', title: 'Solo – halten oder Alt-Klick: nur dieser Kanal' }, h('span', null, 'S'));
  mxSoloBtn(W.sb, () => MXD.k);
  mPid(W.mb, () => mxMuteId(MXD.k)); mPid(W.sb, () => mxSoloId(MXD.k));
  W.slots = [0, 1, 2, 3].map(() => {   // (echo, hall, the effect returns – a return: its Anteil and its way into the hall)
    const S = { K: mxdKnob('snd'), t1: h('span'), t2: h('b'), bar: h('i') };
    S.el = h('div', { class: 'mxd-snd' }, S.K.box, h('div', { class: 'mxd-sx' }, S.t1, h('span', { class: 'mxd-eff', 'aria-hidden': 'true' }, S.bar), S.t2));
    return S;
  });
  const opt = (v, t, d) => h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-v': v, onclick: () => { const id = 'x' + MXD.k + '.route'; if (PD[id]) setParam(id, v); } }, h('b', null, t), h('small', null, d));
  W.rFx = opt('fx', 'Kette', ''); W.rDir = opt('dir', 'Direkt', 'an der Kette vorbei');
  W.rDir.title = 'Direkt in die Summe – Echo und Hall bekommen den Kanal trocken';
  W.route = h('div', { class: 'mxd-route', role: 'radiogroup', 'aria-label': 'Weg in die Summe' }, W.rFx, W.rDir);
  W.route.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const id = 'x' + MXD.k + '.route';
    if (!PD[id]) return;
    e.preventDefault(); setParam(id, P[id] === 'dir' ? 'fx' : 'dir'); (P[id] === 'dir' ? W.rDir : W.rFx).focus();
  });
  W.ret = h('p', { class: 'mxd-note' });
  W.grpV = h('b');
  W.grp = h('button', { type: 'button', class: 'mxd-grp', title: 'Die Spur läuft über den Regler „Puls gesamt“', onclick: () => openDetail('puls') }, h('i', { class: 'mx-dot4', 'aria-hidden': 'true' }, h('b'), h('b'), h('b'), h('b')), h('span', null, 'Puls'), W.grpV, h('em', { 'aria-hidden': 'true' }, '›'));
  for (const id of ['dly.mix', 'rev.mix', ...FX_RETS.map((x) => x[0] + '.mix'), 'mix.pulsVol', 'mix.pulsMute', 'drv.mix', 'rng.mix', 'pha.mix', 'cho.mix']) mxdWatch(id);
  return h('section', { class: 'mxd-sec mxd-wg', 'aria-label': 'Wege' }, mxdSh('Wege', 'Pegel · Balance · Sends · Weg'),
    W.fd.box,
    // balance left, M / S right under the value box; a lane's group link between them
    h('div', { class: 'mxd-wrow' }, h('div', { class: 'mxd-balw' }, W.bal.box), W.grp, h('div', { class: 'mxd-msw' }, W.mb, W.sb)),
    h('div', { class: 'mxd-snds' }, ...W.slots.map((S) => S.el)),
    W.route, W.ret);
}
function mxdWegeAim(k) {
  const W = MXD.wg, c = MXK[k];
  W.fd.set(k);
  mxdAim(W.bal, k, 'x' + k + '.pan', 'Balance', 'Balance', c.col);
  mxdWatch('x' + k + '.mute', 'x' + k + '.solo', 'x' + k + '.route', 'x' + k + '.dly', 'x' + k + '.rev', ...FX_RETS.map(([r]) => 'x' + k + '.' + r));
  // (30.10.2026) the Hexenring's way means its Schleifen's: Kette – all follow the live chain; Direkt – each as set (burnt in)
  const hx = k === 'hxr';
  W.rFx.querySelector('small').textContent = hx ? 'alle Schleifen folgen ihr' : ''; W.rDir.querySelector('small').textContent = hx ? 'jede wie eingestellt' : 'an der Kette vorbei';
  W.rFx.title = hx ? 'Kette: jede Schleife folgt der Effektkette – Regler und Presets wirken auf sie' : ''; W.rDir.title = hx ? 'Direkt: jede Schleife wie in ihrem Kanal eingestellt (K) – eingebrannt klingt sie wie aufgenommen' : 'Direkt in die Summe – Echo und Hall bekommen den Kanal trocken';
  const [s0, s1, ...sx] = W.slots;
  if (c.kind === 'ret') {
    mxdAim(s0.K, k, k + '.mix', 'Anteil', 'Anteil – wie viel alle Kanäle hineinschicken', c.col);
    if (k !== 'rev') mxdAim(s1.K, k, 'x' + k + '.rev', 'Hall', 'in den Hall', '#d6cbff');
  } else {
    mxdAim(s0.K, k, 'x' + k + '.dly', 'Echo', 'Echo-Send', '#6cc9ef');
    mxdAim(s1.K, k, 'x' + k + '.rev', 'Hall', 'Hall-Send', '#d6cbff');
    FX_RETS.forEach(([r, name, col], i) => mxdAim(sx[i].K, k, 'x' + k + '.' + r, name, name + '-Send', col));
  }
  s1.el.hidden = k === 'rev';
  for (const S of sx) S.el.hidden = c.kind === 'ret';
  W.route.hidden = c.kind === 'ret'; W.ret.hidden = c.kind !== 'ret'; W.grp.hidden = c.kind !== 'lane';
  W.mb.setAttribute('aria-label', c.name + ' stumm'); W.sb.setAttribute('aria-label', c.name + ' solo');
}
// the texts of the Wege: what a send really is ("140 % von 35 % Echo-Anteil = 49 %"), which way the channel takes
function mxdWegeText(k) {
  const W = MXD.wg, c = MXK[k], silent = MX.ch[k].dorm, [s0, s1, ...sx] = W.slots;
  W.mb.setAttribute('aria-pressed', String(!!P['x' + k + '.mute'])); W.sb.setAttribute('aria-pressed', String(!!P['x' + k + '.solo']));
  const send = (S, v, mix, what, scale) => {
    const eff = v * mix * (scale || 1);
    S.t1.textContent = mxPct(v) + ' von ' + mxPct(mix) + ' ' + what;
    S.t2.textContent = silent ? 'still' : '= ' + mxPct(eff);
    S.bar.style.transform = 'scaleX(' + clamp(eff, 0, 1).toFixed(3) + ')';
    S.el.classList.toggle('zero', eff < 0.005 || silent);
  };
  if (c.kind === 'ret') {
    const mix = P[k + '.mix'];
    s0.t1.textContent = 'gilt für alle Sends'; s0.t2.textContent = mxPct(mix); s0.bar.style.transform = 'scaleX(' + mix.toFixed(3) + ')'; s0.el.classList.remove('zero');
    if (k !== 'rev') {
      // a return feeds the hall directly, past the hall's own Anteil (the echo: 100 % = 0,3)
      const v = P['x' + k + '.rev'], g = k === 'dly' ? 0.3 : 1;
      s1.t1.textContent = c.name + ' → Hall, am Hall-Anteil vorbei'; s1.t2.textContent = silent ? 'still' : '= ' + mxPct(v * g);
      s1.bar.style.transform = 'scaleX(' + clamp(v * g, 0, 1).toFixed(3) + ')'; s1.el.classList.toggle('zero', v < 0.005 || silent);
    }
    W.ret.textContent = k === 'dly' ? 'Rückweg: das Echo kommt hinter der Effektkette zurück und geht direkt in die Summe.' : k === 'rev' ? 'Rückweg: der Hall geht direkt in die Summe. Echo und Effekte speisen ihn zusätzlich.' : 'Rückweg: ' + fxType(k).name + ' – geht direkt in die Summe und, wenn du willst, in den Hall.';
  } else {
    // a non-breaking hyphen: "Echo-" never stands alone at a line's end
    send(s0, P['x' + k + '.dly'], P['dly.mix'], 'Echo‑Anteil');
    send(s1, P['x' + k + '.rev'], P['rev.mix'], 'Hall‑Anteil');
    FX_RETS.forEach(([r, name], i) => send(sx[i], P['x' + k + '.' + r], P[r + '.mix'], name.replace(' ', '\u00a0') + '‑Anteil'));
    const r = P['x' + k + '.route'];
    W.rFx.setAttribute('aria-checked', String(r !== 'dir')); W.rDir.setAttribute('aria-checked', String(r === 'dir'));
    W.rFx.tabIndex = r !== 'dir' ? 0 : -1; W.rDir.tabIndex = r === 'dir' ? 0 : -1;
    const fx = [['drv.mix', 'Verzerrung'], ['rng.mix', 'Ring'], [null, 'Filter'], ['pha.mix', 'Phaser'], ['cho.mix', 'Schweben']].filter(([id]) => !id || P[id] > 0).map((x) => x[1]);
    W.rFx.lastChild.textContent = fx.length > 3 ? 'durch ' + fx.length + ' Effekte' : 'durch ' + fx.join(', ');
    W.rFx.title = 'Durch die Effektkette: ' + fx.join(', ');
  }
  if (c.kind === 'lane') { W.grpV.textContent = P['mix.pulsMute'] ? 'stumm' : mxDbTxt(P['mix.pulsVol']) + ' dB'; W.grp.setAttribute('aria-label', 'über Puls gesamt: ' + W.grpV.textContent + ' – öffnen'); }
}

/* ---------- Quelle: what makes the sound, per kind of channel ---------- */
function mxdOct(id, who) {
  const d = PD[id], btns = [];
  const box = h('div', { class: 'mxd-seg', role: 'radiogroup', 'aria-label': who + ' Oktave' });
  for (let v = d.min; v <= d.max; v++) { const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-v': v, onclick: () => setParam(id, v) }, fmt(d, v)); btns.push(b); box.append(b); }
  bindCtl(id, (v) => btns.forEach((b) => { const on = Number(b.dataset.v) === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }));
  box.addEventListener('keydown', (e) => {
    const s = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!s) return;
    e.preventDefault(); setParam(id, clamp(P[id] + s, d.min, d.max)); btns[P[id] - d.min].focus();
  });
  return h('div', { class: 'mxd-fld' }, h('span', { class: 'mxd-lab' }, 'Oktave'), box);
}
// a stepper with the note it leads to; ids = what the note depends on
function mxdStep(id, who, lab, txt, note, ids) {
  const nb = h('b');
  const st = mxStepper(id, who + ' ' + lab, lab, txt, note ? nb : null);
  if (note) for (const x of ids.concat(['t.root', 't.scale', 't.oct', 't.range', 't.just', 't.a4'])) bindCtl(x, () => Promise.resolve().then(() => { const t = note(); if (nb.textContent !== t) nb.textContent = t; }));
  return h('div', { class: 'mxd-fld' }, st);
}
function mxdLaneNote(i) {
  const p = 'l' + i + '.', o = P[p + 'oct'], len = N.free ? 12 * P['t.range'] + 1 : N.notes.length;
  if (!len) return '';
  const idx = clamp(P[p + 'deg'], 0, len - 1);
  return mxNoteName((N.free ? N.base * ratioForSemi(idx) : N.notes[idx].f) * Math.pow(2, o));
}
function mxdQuelle(k) {
  if (MXD.qu[k]) return MXD.qu[k];
  const c = MXK[k], C = (id, label) => ctl(id, { prefix: 'mxd-', label });
  let kids;
  if (k === 'fin') kids = [C('v.eng', 'Klang'),
    h('div', { class: 'mxd-pair' }, mxdOct('v.oct', 'Klang'), mxdStep('v.deg', 'Klang', 'Tonstufe', (v) => fmt(PD['v.deg'], v), () => 'Grundton ' + mxNoteName(mxDegF(P['v.deg']) * Math.pow(2, P['v.oct'])), ['v.deg', 'v.oct'])),
    grid(C('v.vel'), C('v.width', 'Breite des Spiels'), C('v.glide'))];
  else if (k === 'eb2') kids = [C('v.layer', 'Klang der zweiten Ebene'),
    h('div', { class: 'mxd-pair' }, mxdStep('v.layerInt', 'Ebene 2', 'Intervall', (v) => fmt(PD['v.layerInt'], v), () => 'Grundton ' + mxNoteName(mxDegF(P['v.layerDeg']) * Math.pow(2, P['v.layerInt'] / 12)), ['v.layerInt', 'v.layerDeg']),
      mxdStep('v.layerDeg', 'Ebene 2', 'Tonstufe', (v) => fmt(PD['v.layerDeg'], v))),
    grid(C('v.layerLvl', 'Anteil'), C('e2.fine'))];
  else if (EB_OF[k]) { const e = EB_OF[k], w = 'Ebene ' + e.n;   // (Ebenen 3–8, 30.10.2026: as Ebene 2)
    kids = [C(e.eng, 'Klang der ' + w),
      h('div', { class: 'mxd-pair' }, mxdStep(e.int, w, 'Intervall', (v) => fmt(PD[e.int], v), () => 'Grundton ' + mxNoteName(mxDegF(P[e.deg]) * Math.pow(2, P[e.int] / 12)), [e.int, e.deg]),
        mxdStep(e.deg, w, 'Tonstufe', (v) => fmt(PD[e.deg], v))),
      grid(C(e.lvl, 'Anteil'), C(e.pre + 'fine'))]; }
  else if (c.kind === 'lane') {
    const i = c.lane, p = 'l' + i + '.';
    kids = [C(p + 'on', 'Spur spielt'), C(p + 'eng', 'Klang'), mxdRhythm(i),
      h('div', { class: 'mxd-pair' }, mxdOct(p + 'oct', c.name), mxdStep(p + 'deg', c.name, 'Tonstufe', (v) => 'Stufe ' + (v + 1), () => 'Start ' + mxdLaneNote(i), [p + 'deg', p + 'oct'])),
      grid(C(p + 'vol', 'Anschlag'), C(p + 'bright'), C(p + 'prob'), C(p + 'walk'))];
  } else if (k === 'bor') kids = [C('bor.on'), grid(C('bor.lvl'), C('bor.oct'), C('bor.cut'), C('bor.breath')), C('bor.wave'), C('bor.int')];
  else if (k === 'gsp') kids = [grid(C('gsp.halo'), C('gsp.kopplung'), C('gsp.nachklang'), C('gsp.steg')), C('gsp.saiten'), h('p', { class: 'note' }, 'Das Netz der Saiten, in das alles spielt, was Gespinst klingt – Finger, Ebene 2, Spuren, Regen.')];
  else if (k === 'rgn') { const q = rgQuelle(); MXD.qu[k] = q; return q; }
  else if (k === 'hxr') kids = [h('p', { class: 'note' }, 'Die Schleifen des Hexenrings – ihre Effektkette ist eingebrannt, Echo und Hall kommen hier dazu.')];   // Hexenring
  else if (FX_RETS.some((x) => x[0] === k)) { const txt = h('p', { class: 'note' }), grids = {}, mk = (t) => (grids[t] = grid(...Object.values(FX_TYPES[t].keys).map((id) => C(k + '.' + id)))), upd = () => { for (const t in grids) grids[t].hidden = t !== P[k + '.typ']; txt.textContent = fxText(k); };
    kids = [C(k + '.typ', 'Effekt'), txt, grid(C(k + '.mix', 'Anteil (Send-Meister)')), ...Object.keys(FX_TYPES).map(mk)]; bindCtl(k + '.typ', upd); upd(); }
  else if (k === 'dly') kids = [grid(C('dly.mix', 'Anteil (Send-Meister)'), C('dly.fb'), C('dly.pp'), C('dly.tone'), C('dly.wow')), C('dly.sync'), C('dly.div'), C('dly.ms')];
  else { const txt = h('p', { class: 'note mxd-raum' }), nb = grid(C('rev.size'), C('rev.damp')), rm = grid(C('rev.dist'), C('rev.len')), upd = () => { const neb = P['rev.typ'] === 'nebel'; nb.hidden = !neb; rm.hidden = neb; txt.textContent = raumText(); }; bindCtl('rev.typ', upd); upd();
    kids = [C('rev.typ', 'Raum'), txt, grid(C('rev.mix', 'Anteil (Send-Meister)'), C('rev.pre')), nb, rm]; }
  const el = h('div', { class: 'mxd-qbody', 'data-k': k }, ...kids);
  MXD.qu[k] = el;
  return el;
}
// a lane's rhythm, live: its ring, the three numbers that make it, the grid it runs on, and the way to the Puls
function mxdRhythm(i) {
  const p = 'l' + i + '.', R = { i, cv: h('canvas', { 'aria-hidden': 'true' }), key: '', s: 0 };
  MXD.rings.push(R); MXD.qring[i] = R;
  const st = (id, lab) => mxStepper(p + id, 'Spur ' + (i + 1) + ' ' + lab, lab, (v) => String(v));
  const go = h('button', { type: 'button', class: 'btn ghost mxd-link', onclick: () => { openPanel('puls'); selectLane(i); } }, 'Im Puls bearbeiten ›');
  return h('div', { class: 'mxd-rh' }, h('div', { class: 'mxd-ring' }, R.cv), h('div', { class: 'mxd-rhc' }, st('steps', 'Schritte'), st('puls', 'Impulse'), st('rot', 'Versatz')), ctl(p + 'div', { prefix: 'mxd-', label: 'Raster' }), go);
}
// every step a faint tick, the impulses as spores, the step that plays now lit, the pattern's numbers inside
function mxdEuc(c, W, H, i) {
  c.clearRect(0, 0, W, H);
  const p = 'l' + i + '.', on = P[p + 'on'], n = P[p + 'steps'], pls = Math.min(P[p + 'puls'], n), pat = euclid(n, pls, P[p + 'rot']), cur = SEQ.on ? SEQ.lanes[i].cur : -1;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - (W < 70 ? 4 : 8), col = mxRgb(COL.lanes[i]);
  c.strokeStyle = on ? mxRgba(col, 0.22) : 'rgba(240,230,216,.08)'; c.lineWidth = 1;
  c.beginPath(); c.arc(cx, cy, R, 0, MX_TAU); c.stroke();
  for (let s = 0; s < n; s++) {
    const a = -Math.PI / 2 + s / n * MX_TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, now = s === cur;
    if (pat[s]) {
      if (now && on) { c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow(COL.lanes[i]), x - 14, y - 14, 28, 28); c.globalCompositeOperation = 'source-over'; }
      c.fillStyle = !on ? 'rgba(240,230,216,.25)' : now ? '#fff6ea' : mxRgba(col, 0.85);
      c.beginPath(); c.arc(x, y, (now ? 4.2 : 3) * (W < 70 ? 0.6 : 1), 0, MX_TAU); c.fill();
    } else {
      c.fillStyle = now ? mxRgba(col, 0.9) : 'rgba(240,230,216,.2)';
      c.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  if (cur >= 0 && on) {   // the hand of the clock
    const a = -Math.PI / 2 + cur / n * MX_TAU;
    const r0 = W < 70 ? 0 : R * 0.6;
    c.strokeStyle = mxRgba(col, 0.35); c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); c.stroke();
  }
  if (W < 70) return;
  c.font = '500 12px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = on ? 'rgba(240,230,216,.9)' : 'rgba(168,153,138,.6)'; c.fillText(pls + '/' + n, cx, cy - 1);
  c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(168,153,138,.7)'; c.fillText(on ? 'E(' + pls + ',' + n + ')' : 'aus', cx, cy + 13);
}

/* ---------- the Puls group ---------- */
function mxdBuildPuls() {
  const G = MXD.pu = { trace: mxTrace(150, 50) };
  G.fd = mxdFader('h');
  G.mb = h('button', { type: 'button', class: 'mx-m mxd-ms mxd-mw', 'aria-pressed': 'false', 'aria-label': 'Puls stumm (alle vier Spuren)', 'data-pid': 'mix.pulsMute', onclick: () => setParam('mix.pulsMute', !P['mix.pulsMute']) }, h('span', null, 'Stumm'));
  bindCtl('mix.pulsMute', (v) => G.mb.setAttribute('aria-pressed', String(!!v)));
  G.rows = [0, 1, 2, 3].map((i) => {
    const k = 'l' + i, c = MXK[k], fd = mxdFader('h', true), R = { i, k, fd, cv: h('canvas', { 'aria-hidden': 'true' }), key: '', s: 0, src: h('small') };
    fd.set(k);
    MXD.rings.push(R);
    const mb = h('button', { type: 'button', class: 'mx-m mxd-ms', 'aria-pressed': 'false', 'aria-label': c.name + ' stumm', 'data-pid': 'x' + k + '.mute', onclick: () => setParam('x' + k + '.mute', !P['x' + k + '.mute']) }, h('span', null, 'M'));
    const sb = h('button', { type: 'button', class: 'mx-s mxd-ms', 'aria-pressed': 'false', 'aria-label': c.name + ' solo', title: 'Solo – halten: nur diese Spur', 'data-pid': 'x' + k + '.solo' }, h('span', null, 'S'));
    mxSoloBtn(sb, k);
    bindCtl('x' + k + '.mute', (v) => mb.setAttribute('aria-pressed', String(!!v)));
    bindCtl('x' + k + '.solo', (v) => sb.setAttribute('aria-pressed', String(!!v)));
    const go = h('button', { type: 'button', class: 'mxd-lgo', 'aria-label': c.name + ' – Einzelheiten öffnen', onclick: () => { selectChannel(k); openDetail(k); } }, h('span', { class: 'mxd-ring', 'aria-hidden': 'true' }, R.cv), h('span', { class: 'mxd-ln' }, h('b', null, c.name), R.src));
    R.el = h('div', { class: 'mxd-lr', style: '--c:' + c.col }, go, fd.box, mb, sb);
    return R;
  });
  G.chips = mxdDuckChips();
  G.rel = mxdKnob();
  G.cv = h('canvas', { 'aria-hidden': 'true' });
  G.who = h('p', { class: 'mxd-note' });
  mxdWatch('mix.pulsVol', 'mix.duckSrc', 'mix.duckRel', 'seq.bpm');
  for (const st of STRIPS) mxdWatch('x' + st.k + '.duck');
  return h('div', { class: 'mxd-page', 'data-p': 'puls' },
    h('section', { class: 'mxd-sec', 'aria-label': 'Puls gesamt' }, mxdSh('Puls gesamt', 'ein Regler über alle vier Spuren'), G.fd.box,
      h('div', { class: 'mxd-wrow' }, G.mb, h('p', { class: 'mxd-note' }, 'Wirkt wie ein VCA: Er verschiebt Spur 1–4 gemeinsam und lässt ihr Verhältnis stehen. Die Anzeige zeigt die lauteste Spur, die du hörst, in ihrer Farbe.'))),
    h('section', { class: 'mxd-sec', 'aria-label': 'Spuren' }, mxdSh('Spuren', 'Pegel, Stumm, Solo – tippe den Namen für alles Weitere'), h('div', { class: 'mxd-lrs' }, G.rows.map((R) => R.el))),
    h('section', { class: 'mxd-sec', 'aria-label': 'Pumpen' }, mxdSh('Pumpen', 'gilt für alle Kanäle'),
      h('div', { class: 'mxd-cvb mxd-pl' }, G.cv),
      h('div', { class: 'mxd-kr' }, G.rel.box, h('div', { class: 'mxd-src' }, h('span', { class: 'mxd-lab' }, 'im Takt von'), G.chips)), G.who,
      h('button', { type: 'button', class: 'btn ghost mxd-link', onclick: () => openPanel('puls') }, 'Puls öffnen ›')));
}
function mxdPulsText() {
  const G = MXD.pu, src = Number(P['mix.duckSrc']);
  const who = STRIPS.filter((st) => P['x' + st.k + '.duck'] > 0 && st.lane !== src).map((st) => st.name + ' ' + mxPct(P['x' + st.k + '.duck']));
  G.who.textContent = who.length ? 'Es pumpen: ' + who.join(', ') + '.' : 'Noch pumpt kein Kanal – drehe im Fruchtkörper eines Kanals „Pumpen“ auf.';
  for (const R of G.rows) { const t = mxSrcText(R.k); if (R.src.textContent !== t) R.src.textContent = t; R.el.classList.toggle('dormant', MX.ch[R.k].dorm); R.el.classList.toggle('srcoff', !!MX.ch[R.k].srcoff); }
}
// the Puls page's trace: the deepest Pumpen of any channel, with the beat's hits
function mxdPulsDepth() {
  if (!A.ctx) return 0;
  let d = 0;
  const now = A.ctx.currentTime;
  for (const st of STRIPS) { const s = MIX.s[st.k]; if (s) d = Math.max(d, duckDepth(s, now)); }
  return d > 0.001 ? -20 * Math.log10(1 - d) : 0;
}

