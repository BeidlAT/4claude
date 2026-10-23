/* ---------- Schlafen: umdrehen, und Myzel schläft ein ---------- */
// Screen down (Wenden) and Myzel falls asleep, the way the card says (any other meaning through Zuweisen – a binding of
// Wenden wins, Schlafen then rests):
// Freeze-Kadenz (default): the echo takes a last deep breath of the sound (its send swells for 0.6 s) and freezes; the
// dry sound fades into that frozen tail over 3 s (equal power; the hall keeps reverberating the tail), the Puls ends
// with its bar, the Geflecht falls asleep. Keys of a keyboard still sound over the frozen tail – freezing and playing
// over it is the point; the field cannot (touches are ignored while the screen lies on the table – a wet table makes
// phantom touches). Stille: everything is quiet at once and the Puls stops. Szene B: the mixer glides to its scene B in
// 2.5 s – through the mod layer's A/B-Morph, so the mixer is never changed – and the Puls plays on (with A and B still
// equal it is the Freeze-Kadenz).
// Turned back and picked up, Myzel wakes with a bloom of spores – exactly as it was: the Puls runs again if it ran (if
// its bar had not ended yet it simply plays on), the echo stays frozen only if the player had frozen it, the mixer
// holds its own values again; none of it was ever in the patch. Face up and still (Ruhe) only pauses the live Gestik:
// the symbol in the bar sleeps.
// down: the screen lies down (touches ignored); on: asleep; art: what it means this time; dk: the dry sound is faded
// (stripGain multiplies by slpK); k: the fade's factor now; open: a keyboard played since – Klang and Ebene 2 are open
// again; mg: the sum's factor (Stille); frzSet: Schlafen froze the echo; pulsWas: the Puls ran when it fell asleep; gE: when the wake's glide back ends (audio time)
const SLP_KAD = 3, SLP_SZ = 2.5;
// kt: the frozen tail's factor (the echo's and hall's returns): it holds 7 s after the fade, then dies away over 20 s
// ("Schweif klingt aus") – unless a key plays over it; tmT: after a long sleep the returns come back once the
// unfrozen echo has died away
const SLP = { down: false, on: false, art: '', dk: false, k: 1, kt: 1, open: false, mg: 1, fade: null, iv: 0, tm: 0, tmM: 0, tmT: 0, frzSet: false, frzWas: false, pulsWas: false, t0: 0, n: 0, gE: 0 };
const SLP_HOLD = 7, SLP_DIE = 20, SLP_LONG = 20000;
const slpK = (st) => (st.ret ? SLP.kt : SLP.open && (st.k === 'fin' || st.k === 'eb2') ? 1 : SLP.k);
// a binding of Wenden ("Eigene") takes the gesture
const GK_OWNE = { v: -1, s: new Set() };
function gkOwnEv(i) {
  if (GK_OWNE.v !== MAP.v) {
    GK_OWNE.v = MAP.v; GK_OWNE.s.clear();
    for (const b of MAP.user) if (b.type === 'gest' && b.target != null && (b.dev === '*' || sameDev(b.dev, 'Gestik'))) GK_OWNE.s.add(b.num);
  }
  return GK_OWNE.s.has(i);
}
function slpEnter() {
  if (SLP.on || !A.started || !A.ctx) return;
  let art = GK.p.slArt;
  if (art === 'szene') { if (!MX.snap.a) mxSnapLoad(); if (!mxSnapDiff()) art = 'kadenz'; }
  // the Puls to restore is the arrangement's – not one the Tank started for its lanes
  clearTimeout(SLP.tmT); SLP.tmT = 0;
  Object.assign(SLP, { on: true, art, open: false, kt: 1, frzSet: false, frzWas: A.frozen, pulsWas: SEQ.on && !LAD.tStart, t0: performance.now(), n: SLP.n + 1 });
  A.jrgAge = 0;   // the bar sleeps itself young
  gspClear();      // (and Gespinst's web falls still,
  rhzClear();      // Rhizom's net rests)
  hxSlpEnter(art);   // Hexenring: the Schleifen halt at their next bar line, their Ausklang into the frozen echo
  const now = A.ctx.currentTime;
  if (art === 'kadenz') {
    if (!A.frozen) {
      modSet('gk:slp', 'dly', 0.5);   // a deep breath into the echo, then it freezes
      SLP.tm = setTimeout(() => { SLP.tm = 0; if (!SLP.on) return; modSet('gk:slp', 'dly', 0); setFreeze(true); SLP.frzSet = true; }, 600);
    }
    if (SEQ.on) SEQ.stopB = Math.ceil(beatAt(now + 0.05) / 4 - 1e-9) * 4;   // the Puls ends with its bar
    SLP.dk = true; SLP.k = 1; SLP.fade = { t0: now, dur: SLP_KAD };
    clearInterval(SLP.iv); SLP.iv = setInterval(slpFade, 100);
  } else if (art === 'stille') {
    if (SEQ.on) seqStop();
    SLP.mg = 0;
    // a 40 ms line from where the sum is (no hold: after the mixer's setTargetAtTime Chromium would start it from 0)
    const p = A.masterVol.gain, v = p.value;
    p.cancelScheduledValues(now); p.setValueAtTime(v, now); p.linearRampToValueAtTime(0, now + 0.04);
  } else {   // from wherever a quick wake left it
    const e = MOD.t.morph.s.get('gk:slp'), v0 = e ? clamp(modPt(e, now), 0, 1) : 0;
    clearTimeout(SLP.tmM);
    modSet('gk:slp', 'morph', v0, { at: now }); modSet('gk:slp', 'morph', 1, { at: now + SLP_SZ * (1 - v0) + 0.01 });
  }
  slpVis(true);
}
// the dry sound into the frozen tail: a step along an equal-power curve every 100 ms (any other setter of the strips'
// gain – Ausdruck, a fader – reads the same factor through stripGain, so nothing jumps back)
function slpFade() {
  const F = SLP.fade;
  if (!F || !A.ctx || !SLP.dk) { clearInterval(SLP.iv); SLP.iv = 0; return; }
  const e = A.ctx.currentTime - F.t0, x = clamp(e / F.dur, 0, 1);
  SLP.k = x >= 1 ? 0 : Math.cos((x * Math.PI) / 2);
  // then the frozen tail: held, or (the default) dying away – face down for half a minute is an ending; a key played
  // over it keeps it where it is
  const hold = GK.p.slTail === 'halt' || SLP.open, y = clamp((e - F.dur - SLP_HOLD) / SLP_DIE, 0, 1);
  if (!hold) SLP.kt = Math.min(SLP.kt, y >= 1 ? 0 : Math.cos((y * Math.PI) / 2));
  for (const st of MIX.list) if (!st.ret || SLP.kt < 1) setP(st.in.gain, stripGain(st), 0.05);
  if (x >= 1 && (hold || SLP.kt <= 0)) { clearInterval(SLP.iv); SLP.iv = 0; SLP.fade = null; }
}
// a key of a keyboard while asleep: Klang and Ebene 2 open again – play over the frozen tail
function slpOpen() {
  if (!SLP.on || SLP.art !== 'kadenz' || SLP.open || !A.ctx) return;
  SLP.open = true;
  for (const k of ['fin', 'eb2']) { const st = MIX.s[k]; if (st) setP(st.in.gain, stripGain(st), 0.01); }
}
function slpWake() {
  if (!SLP.on) return;
  SLP.on = false;
  clearTimeout(SLP.tm); SLP.tm = 0;
  const art = SLP.art, now = A.ctx ? A.ctx.currentTime : 0;
  // after a long sleep (or once the tail had died away) the set had ended: Myzel wakes into silence – the Puls stays
  // stopped (▶ starts it), the frozen tail stays gone; after a short one everything comes back as it was
  const long = art === 'kadenz' && (performance.now() - SLP.t0 > SLP_LONG || SLP.kt < 0.05);
  hxSlpWake(long || performance.now() - SLP.t0 > SLP_LONG);   // Hexenring: „3 · 2 · 1“, back on the next 1 – a long sleep keeps them angehalten
  if (art === 'kadenz') {
    modSet('gk:slp', 'dly', 0);
    if (SLP.frzSet && A.frozen) setFreeze(false);   // only what Schlafen froze
    if (SEQ.stopB != null) { if (!long) SEQ.stopB = null; }   // its bar had not ended yet: the Puls simply plays on (after a long sleep it ends)
    else if (SLP.pulsWas && !SEQ.on && A.started && !long) seqStart();
    clearInterval(SLP.iv); SLP.iv = 0; SLP.fade = null; SLP.k = 1; SLP.open = false;
    if (long) {   // the returns stay closed until the unfrozen echo has died away, then open again
      SLP.kt = 0;
      SLP.tmT = setTimeout(() => { SLP.tmT = 0; if (SLP.on) return; SLP.kt = 1; SLP.dk = false; if (A.ctx) for (const st of MIX.list) if (st.ret) setP(st.in.gain, stripGain(st), 0.3); }, 1500);
      if (SLP.pulsWas && !SEQ.on) toast('Myzel ist wach – ▶ startet den Puls wieder.', 3500);
    } else { SLP.dk = false; SLP.kt = 1; }
    // ≈ 0.6 s back: a glide of the mixer's own kind, set exactly at its end (the last 1 %: inaudible)
    if (A.ctx) { for (const st of MIX.list) if (!st.ret || !long) { const v = stripGain(st); setP(st.in.gain, v, 0.2); st.in.gain.setValueAtTime(v, now + 1.2); } SLP.gE = now + 0.9; }
  } else if (art === 'stille') {
    SLP.mg = 1;
    if (A.ctx) setP(A.masterVol.gain, dbToGain(mp('mst.vol')), 0.04);
    if (SLP.pulsWas && !SEQ.on && A.started) seqStart();
  } else {
    const e = MOD.t.morph.s.get('gk:slp'), v = e ? modPt(e, now) : 0;
    modSet('gk:slp', 'morph', v, { at: now }); modSet('gk:slp', 'morph', 0, { at: now + 0.6 });
    clearTimeout(SLP.tmM); SLP.tmM = setTimeout(() => { if (!SLP.on || SLP.art !== 'szene') modSet('gk:slp', 'morph', 0); }, 700);
  }
  slpVis(false);
  gkBuzz(20);
}
// "Stille" while asleep: nothing comes back on waking
function slpPanic() { SLP.pulsWas = false; if (SEQ.stopB != null) SEQ.stopB = null; }
// the Geflecht falls asleep (the field dims, the spores sink), or wakes with a bloom of spores
function slpVis(on) {
  VIS.zz = on; VIS.gk = true;
  stage.classList.toggle('gk-zz', on);
  if (on || document.visibilityState !== 'visible' || !VIS.w) return;
  const w = VIS.w, h = VIS.h, cx = w / 2, cy = h * 0.55;
  VIS.burst(cx, cy, VIS.hue, 24, 1.3);
  for (let i = 0; i < 6; i++) {   // six arms of hyphae further out, without rings of their own
    const a = (i / 6) * Math.PI * 2, x = cx + Math.cos(a) * w * 0.18, y = cy + Math.sin(a) * h * 0.14;
    for (let j = 0; j < 5 && VIS.hy.length < HY_MAX; j++) VIS.hy.push({ x, y, a: a + rand(-0.6, 0.6), life: rand(0.7, 1), hue: VIS.hue + i * 35 + rand(-20, 20), w: 1 + Math.random(), sp: 1.5 + 2 * Math.random() });
  }
  for (const s of VIS.spores) { s.x = 0.5 + (Math.random() - 0.5) * 0.5; s.y = 0.55 + (Math.random() - 0.5) * 0.35; }
}
// while the screen lies down: a veil over everything that swallows touches (a wet table, the cloth of a bag)
function gkShade(on) {
  let d = GK.shade;
  if (!d && !on) return;
  if (!d) {
    d = GK.shade = h('div', { class: 'gk-shade', 'aria-hidden': 'true' }, h('p', null));
    const eat = (e) => { e.preventDefault(); e.stopPropagation(); };
    for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'contextmenu']) d.addEventListener(t, eat, { passive: false });
    $('#app').append(d);
  }
  d.hidden = !on;
  d.firstChild.textContent = SLP.on ? 'Myzel schläft – zum Wecken umdrehen.' : 'Das Display liegt auf – Berührungen ruhen.';
}
// every Gestik update: Rassel strikes, sleep and wake, the symbol in the bar
function ladSub(out, raw, evs, now) {
  if (raw === GK_ZERO) { ladReset(); return; }
  ladTick(now);
  for (const e of evs) if (e.type === 'peak') ladRassel(e);
  // face down by the sensor – in the background it stays so; a visible page whose sensor fell silent for 2 s lets go
  // (and touches are free again after 1 s of silence: never locked out by a sensor that died)
  const vis = document.visibilityState === 'visible', age = now - GK.last;
  const down = GK.on && GK.live && GK.ev.wenden && (!vis || age < 2000);
  // the veil only over a phone LYING still on its face (phantom touches come from a wet table or cloth, never from a
  // hand): held face down, a finger on the screen wakes it and becomes the zero (gkNote)
  const st = GK.R && !GK.rem ? GK.R.st : null, shade = down && age < 1000 && !!st && (st.ruhe || st.still >= 0.5);
  const want = down && GK.p.schlaf && !gkOwnEv(0);
  if (want && !SLP.on) slpEnter(); else if (!want && SLP.on) slpWake();
  if (shade !== SLP.down || (shade && GK.shade && GK.shade.on !== SLP.on)) { SLP.down = shade; gkShade(shade); if (GK.shade) GK.shade.on = SLP.on; }
  gkIco();
}
gkSub(ladSub);
// Gestik switched off: asleep wakes, the Tank gives the arrangement back, the symbol goes
function ladReset() {
  slpWake();
  SLP.down = false; gkShade(false);
  LAD.lvl = LAD.glas = 0; LAD.tUser = false; LAD.now = -1;
  if (LAD.tk || SEQ.tk) { LAD.tk = 0; SEQ.tk = null; if (LAD.tStart && SEQ.on) seqStop(); }
  LAD.tStart = false;
  VIS.lad = VIS.glas = 0;
  Promise.resolve().then(gkIco);   // once Gestik is really off: the symbol goes
}
// the symbol in the bar: lit while Gestik acts, held, waiting, resting (Ruhe) or asleep; its ring is the Ladung
const GK_ICO_TXT = { live: 'wirkt', hold: 'festgehalten', aus: 'wartet', ruhe: 'ruht – das Gerät liegt still', schlaf: 'Myzel schläft' };
function gkIco() {
  const b = GK.ico || (GK.ico = $('#btnGk'));
  if (!b) return;
  if (b.hidden === GK.on) { b.hidden = !GK.on; b.parentNode.classList.toggle('gk', GK.on); }   // a narrow bar makes room: the logo goes
  if (!GK.on) { b.dataset.st = 'aus'; return; }
  const s = SLP.on ? 'schlaf' : GK.ev.ruhe ? 'ruhe' : GK.mode === 'hold' ? 'hold' : GK.mode.startsWith('live') ? 'live' : 'aus';
  if (b.dataset.st !== s || b.title !== 'Gestik: ' + GK_ICO_TXT[s]) {   // (also the first time: the page's own label names no state)
    const was = b.dataset.st;
    b.dataset.st = s; b.title = 'Gestik: ' + GK_ICO_TXT[s]; b.setAttribute('aria-label', b.title + ' – Einstellungen öffnen');
    const say = s === 'schlaf' ? 'Myzel schläft – zum Wecken umdrehen' : was === 'schlaf' ? 'Myzel ist wach' : s === 'hold' ? 'Gestik festgehalten' : was === 'hold' ? 'Gestik losgelassen' : s === 'ruhe' ? 'Gestik ruht – das Gerät liegt still' : '';
    if (say) gkSay(say);
  }
  const l = Math.round(clamp(LAD.lvl, 0, 1) * 50) * 2, g = LAD.glas > 0.05;
  const t = performance.now();   // the ring at most 20 times a second (and at once when it empties)
  if (b.lv !== l && (t - (b.lt || 0) > 50 || !l)) { b.lv = l; b.lt = t; (b.ring || (b.ring = b.querySelector('.lad'))).setAttribute('stroke-dasharray', l + ' 100'); }
  if (b.gl !== g) { b.gl = g; b.classList.toggle('glas', g); }
}
function gkIcoTap() {
  if (UI.panel !== 'dev') openPanel('dev');
  requestAnimationFrame(() => { if (GK.card && GK.card.el.isConnected) GK.card.el.scrollIntoView({ block: 'start' }); });
}
// the Geflecht, once a frame while Gestik shows anything: asleep it dims and its spores sink to the ground; charged it
// glows – hyphae sprout from the spores, more the fuller the store, the spores rise faster and brighter; Schwenken
// breathes a ring of light. Back at rest it hands the frame back exactly as it was.
function gkVisFrame(c, w, h, dt) {
  const lad = VIS.lad || 0, gl = VIS.glas || 0, zz = !!VIS.zz;
  VIS.sv = zz ? -0.35 : 1 + 2.5 * lad; VIS.sa = zz ? 0.45 : 1 + 1.4 * lad;
  if (zz) { for (const s of VIS.spores) if (s.y > 0.995) s.y = 0.995; }
  else for (let st = 0; st < (VIS.k || 1); st++) if (lad > 0.01 && Math.random() < lad * 0.7 && VIS.hy.length < HY_MAX) {   // (VIS.k: the Handy-Modus under load moves two steps a drawn frame)
    const s = VIS.spores[Math.floor(Math.random() * VIS.spores.length)], x = s.x * w, y = s.y * h;
    for (let i = 0, n = 1 + Math.round(lad * 2); i < n && VIS.hy.length < HY_MAX; i++) VIS.hy.push({ x, y, a: rand(0, Math.PI * 2), life: rand(0.5, 0.9), hue: VIS.hueAt(s.x) + rand(-20, 20), w: 0.6 + lad, sp: 0.8 + 1.6 * lad * Math.random() });
  }
  if (lad > 0.01 && !zz && (VIS.gn = (VIS.gn || 0) + (VIS.k || 1)) % 3 < (VIS.k || 1)) {   // every third frame (the trails keep it): ≈ 0.14 at full charge
    const g = c.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, h * 0.9);
    g.addColorStop(0, 'rgba(255,179,92,' + (0.036 * lad).toFixed(4) + ')'); g.addColorStop(1, 'rgba(255,179,92,0)');
    c.fillStyle = g; c.fillRect(0, h * 0.2, w, h * 0.8);
  }
  if (gl > 0.02 && !zz) {
    const r = Math.min(w, h) * (0.22 + 0.04 * Math.sin(VIS.t / (260 - 120 * LAD.shim)));
    c.strokeStyle = 'rgba(134,240,208,' + (0.22 * gl).toFixed(3) + ')'; c.lineWidth = 1 + 2 * gl;
    c.beginPath(); c.arc(w / 2, h / 2, r, 0, Math.PI * 2); c.stroke();
  }
  if (!zz && lad <= 0.005 && gl <= 0.005) { VIS.gk = false; VIS.sv = VIS.sa = 1; }
}

