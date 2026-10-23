/* =====================================================================
   The Puls panel's mixing block: "Spuren mischen"
   ===================================================================== */
// One compact row per lane – mini rhythm ring, a lying stem as fader with its meter, M/S, balance, Oktave and
// Tonstufe with the resulting note – plus the Puls group, and a way into the full mixer.
const MXPB = { rows: [], el: null, open: false };
function buildPulsMix() {
  mxInit();
  const rows = h('div', { class: 'mxp-rows' });
  for (const c of MXC) if (c.kind === 'lane' || c.kind === 'puls') { const R = mxPbRow(c); MXPB.rows.push(R); rows.append(R.el); }
  const go = h('button', { type: 'button', class: 'btn mxp-go', onclick: () => { openPanel('mix'); selectChannel('l' + UI.lane); } }, h('span', { html: ICON_MIX, 'aria-hidden': 'true' }), 'Im Mixer öffnen');
  const el = MXPB.el = section('Spuren mischen', 'Pegel, Balance und Tonlage', rows, h('div', { class: 'mxp-foot' }, go));
  el.classList.add('mxp');
  if (window.ResizeObserver) new ResizeObserver(() => { if (MXPB.open) mxPbLayout(); }).observe(rows);
  return el;
}
function mxPbRow(c) {
  const k = c.k, lane = c.kind === 'lane', vid = mxVolId(k), mid = mxMuteId(k), sid = mxSoloId(k), d = PD[vid];
  const R = { c, k };
  const ringCv = h('canvas', { 'aria-hidden': 'true' });
  R.ring = lane ? h('button', { type: 'button', class: 'mxp-ring', 'aria-label': c.name + ' oben bearbeiten', onclick: () => { selectLane(c.lane); } }, ringCv) : h('div', { class: 'mxp-ring' }, ringCv);
  R.ringCv = ringCv;
  R.src = h('small');
  const name = h('button', { type: 'button', class: 'mxp-nm', 'aria-label': (lane ? c.name : 'Puls gesamt') + ' – im Mixer öffnen, mit Klangbild, Formen und Wegen', onclick: () => { openPanel('mix'); selectChannel(k); openDetail(k); } },
    h('b', null, h('i', { 'aria-hidden': 'true' }), lane ? c.name : 'Puls gesamt', h('em', { 'aria-hidden': 'true' }, ' ›')), R.src);
  R.cv = h('canvas', { 'aria-hidden': 'true' });
  R.fd = h('div', { class: 'mxp-fd', role: 'slider', tabindex: '0', 'data-pid': vid, 'aria-label': (lane ? c.name : 'Puls gesamt') + ' Pegel', 'aria-keyshortcuts': MX_VOLKEYS, 'aria-valuemin': String(d.min), 'aria-valuemax': String(d.max) }, R.cv);
  const tip = () => mxTipVol(k);
  mxDrag(R.fd, { axis: 'x', host: () => MXPB.el, span: () => R.span || 200, get: () => mxPos(P[vid]), set: (n, fine) => mxFader(k, mxDb(n), fine), tip, focus: R.fd, anchor: () => R.fd });
  R.fd.addEventListener('keydown', (e) => { if (mxVolKey(e, vid)) mxTipFlash(MXPB.el, R.fd, tip()); });
  // 0 dB: a double tap on the value printed over the fader's end (mxPbDraw keeps its box in R.vz) – as under a
  // strip's stem; the rest of the fader has none, two quick nudges never jump it
  mxDbl(R.fd, () => { setParam(vid, 0); mxTipFlash(MXPB.el, R.fd, tip()); }, (e) => {
    const r = R.fd.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, z = R.vz;
    return !!z && x >= z[0] - 4 && x <= z[1] + 4 && y <= 16;
  });
  bindCtl(vid, (v) => { R.fd.setAttribute('aria-valuenow', String(v)); R.fd.setAttribute('aria-valuetext', mxDbAria(v) + ' – doppeltippen auf die Zahl setzt 0 dB'); });
  R.mb = h('button', { type: 'button', class: 'mx-m', 'aria-pressed': 'false', 'aria-label': (lane ? c.name : 'Puls') + ' stumm', 'data-pid': mid, onclick: () => setParam(mid, !P[mid]) }, h('span', null, 'M'));
  bindCtl(mid, (v) => R.mb.setAttribute('aria-pressed', String(!!v)));
  const top = h('div', { class: 'mxp-a' }, R.ring, name, R.fd, R.mb);
  if (sid) {
    R.sb = h('button', { type: 'button', class: 'mx-s', 'aria-pressed': 'false', 'aria-label': c.name + ' solo', title: 'Solo – halten: nur diese Spur', 'data-pid': sid }, h('span', null, 'S'));
    mxSoloBtn(R.sb, k);
    bindCtl(sid, (v) => R.sb.setAttribute('aria-pressed', String(!!v)));
    top.append(R.sb);
  }
  R.el = h('div', { class: 'mxp-row' + (lane ? '' : ' mxp-grp'), role: 'group', 'aria-label': lane ? c.name : 'Puls gesamt', style: '--c:' + c.col }, top);
  if (lane) {
    const i = c.lane, p = 'l' + i + '.';
    R.bal = mxKnob({ ch: k, id: 'x' + k + '.pan', name: 'Balance', label: 'Balance', axis: 'x', host: () => MXPB.el });
    bindCtl('x' + k + '.pan', () => mxKnobRender(R.bal));
    const oct = mxStepper(p + 'oct', c.name + ' Oktave', 'Oktave', (v) => fmt(PD[p + 'oct'], v));
    oct.classList.add('okt');
    R.note = h('b');
    const deg = mxStepper(p + 'deg', c.name + ' Tonstufe', 'Tonstufe', (v) => 'Stufe ' + (v + 1), R.note);
    for (const id of [p + 'oct', p + 'deg', 't.root', 't.scale', 't.oct', 't.range', 't.just']) bindCtl(id, () => Promise.resolve().then(() => mxPbNote(R)));
    R.el.append(h('div', { class: 'mxp-b' }, R.bal.box, oct, deg));
  }
  MX.ch[k].pb = R;
  return R;
}
function mxStepper(id, aria, lab, txt, extra) {
  const d = PD[id], st = d.step || 1;
  const out = h('output', { class: 'mxp-sv', 'aria-live': 'polite' }, h('span'));
  if (extra) out.append(extra);
  const dn = h('button', { type: 'button', 'aria-label': aria + ' tiefer', onclick: () => setParam(id, P[id] - st) }, h('span', { 'aria-hidden': 'true' }, MX_MINUS));
  const up = h('button', { type: 'button', 'aria-label': aria + ' höher', onclick: () => setParam(id, P[id] + st) }, h('span', { 'aria-hidden': 'true' }, '+'));
  bindCtl(id, (v) => { out.firstChild.textContent = txt(v); dn.disabled = v <= d.min; up.disabled = v >= d.max; });
  return h('div', { class: 'mxp-step', role: 'group', 'aria-label': aria }, h('span', { class: 'mxp-sl', 'aria-hidden': 'true' }, lab), h('div', { class: 'mxp-sr' }, dn, out, up));
}
// the note a lane starts on: its Tonstufe on the play field, moved by its Oktave
function mxPbNote(R) {
  const i = R.c.lane, p = 'l' + i + '.', o = P[p + 'oct'];
  let nm = '';
  if (N.notes.length) {
    const nt = N.notes[clamp(P[p + 'deg'], 0, N.notes.length - 1)];
    const m = /^(.*?)(-?\d+)$/.exec(nt.name);
    nm = m && !nt.name.includes('·') && !N.free ? m[1] + (Number(m[2]) + o) : nt.name + (o ? ' ' + (o > 0 ? '+' : MX_MINUS) + Math.abs(o) + ' Okt' : '');
  }
  if (R.note.textContent !== nm) R.note.textContent = nm;
}
function mxPbLayout() {
  for (const R of MXPB.rows) {
    const r = R.cv.getBoundingClientRect();
    R.w = r.width; R.h = r.height; R.span = r.width - 20;
    const rr = R.ringCv.getBoundingClientRect();
    R.rw = rr.width; R.rh = rr.height; R.rkey = '';
    if (R.bal) { const s = Math.round(R.bal.cv.clientWidth); if (s !== R.bal.size) { R.bal.size = s; R.bal.key = ''; mxKnobRender(R.bal); } }
  }
}
function pulsMixOpen() {
  MXPB.open = true;
  mxTaps('puls', true);
  mxSrcAll();
  mxPbLayout();
  for (const R of MXPB.rows) if (R.note) mxPbNote(R);
}
function pulsMixClose() { MXPB.open = false; mxTaps('puls', false); mxTipHide(MXPB.el, 0); }
function pulsMixFrame(dt) {
  mxMeterFrame(dt);
  if (!MXPB.el || !MXPB.el.offsetParent) return;
  for (const R of MXPB.rows) {
    if (!R.w) { mxPbLayout(); if (!R.w) continue; }
    mxPbDraw(R);
    let key = R.rw + ':' + (SEQ.on ? 1 : 0);
    const lanes = R.c.kind === 'lane' ? [R.c.lane] : [0, 1, 2, 3];
    for (const i of lanes) key += ',' + (SEQ.on ? SEQ.lanes[i].cur : -1) + (MX.flash[i] > 0.5 ? '*' : '') + P['l' + i + '.on'] + P['l' + i + '.steps'] + P['l' + i + '.puls'] + P['l' + i + '.rot'];
    if (key !== R.rkey) { R.rkey = key; mxRingDraw(mxFit(R.ringCv, R.rw, R.rh), R.rw, R.rh, lanes); }
  }
}
// a lying stem: the level glows inside it, the cap rides on it (dome to the right), the value sits above its end
function mxPbDraw(R) {
  const w = R.w, hh = R.h, c = mxFit(R.cv, w, hh), S = MX.ch[R.k], L = S.lv, dorm = S.dorm;
  const src = R.c.kind === 'puls' ? MXK['l' + L.dom] : R.c, rgb = dorm ? MX_DORM : src.rgb;
  const x0 = 10, x1 = w - 10, span = x1 - x0, y = hh * 0.62, th = 10;
  c.clearRect(0, 0, w, hh);
  c.fillStyle = '#0d0a08'; c.beginPath(); c.roundRect(x0 - 5, y - th / 2, span + 10, th, th / 2); c.fill();
  c.strokeStyle = 'rgba(240,230,216,.13)'; c.lineWidth = 1; c.stroke();
  const key = (dorm ? 'd' : src.k) + w;
  if (R.gk !== key) {
    R.gk = key;
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, mxRgba(rgb, 0.16)); g.addColorStop(0.45, mxRgba(rgb, dorm ? 0.25 : 0.5)); g.addColorStop(0.76, mxRgba(rgb, dorm ? 0.3 : 0.85));
    g.addColorStop(0.8, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,240,222,.94)'); g.addColorStop(0.87, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,179,92,.96)'); g.addColorStop(1, dorm ? mxRgba(rgb, 0.35) : 'rgba(255,91,77,1)');
    R.grad = g;
  }
  c.globalCompositeOperation = 'lighter';
  for (let s = 0; s < 2; s++) {
    const yy = y - th / 2 + 2 + s * 3.2, xr = x0 + L.rms[s] * span, xp = x0 + L.pk[s] * span;
    if (L.rms[s] > 0.004) { c.fillStyle = R.grad; c.fillRect(x0 - 3, yy, xr - x0 + 3, 2.6); }
    if (L.pk[s] > 0.004) { c.fillStyle = L.pk[s] > 0.8 ? '#ff7b6b' : 'rgba(255,248,236,.9)'; c.fillRect(xp - 0.6, yy - 0.5, 1.3, 3.6); }
    if (L.hp[s] > 0.01) { c.fillStyle = 'rgba(255,248,236,.85)'; c.fillRect(x0 + L.hp[s] * span - 0.5, yy, 1, 2.6); }
  }
  c.globalCompositeOperation = 'source-over';
  const z = Math.round(x0 + 0.8 * span) + 0.5;
  c.strokeStyle = 'rgba(255,179,92,.6)'; c.beginPath(); c.moveTo(z, y + th / 2 + 1); c.lineTo(z, y + th / 2 + 4); c.stroke();
  // the cap: rim at the level, dome towards louder
  const v = P[mxVolId(R.k)], cx = x0 + mxPos(v) * span, col = dorm ? 'rgb(118,106,97)' : R.c.kind === 'puls' ? R.c.col : src.col;
  if (L.lvl > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 * L.lvl * (dorm ? 0.3 : 1); c.drawImage(mxGlow(dorm ? '#766a61' : src.col), cx - 26, y - 22, 52, 44); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  c.beginPath(); c.moveTo(cx, y - 11); c.bezierCurveTo(cx + 9, y - 11, cx + 11, y - 3, cx + 11, y); c.bezierCurveTo(cx + 11, y + 3, cx + 9, y + 11, cx, y + 11); c.closePath();
  const gc = c.createLinearGradient(cx, 0, cx + 11, 0); gc.addColorStop(0, '#4b3b2f'); gc.addColorStop(1, '#1c150f');
  c.fillStyle = gc; c.fill(); c.strokeStyle = col; c.globalAlpha = 0.9; c.lineWidth = 1.1; c.stroke(); c.globalAlpha = 1;
  c.strokeStyle = 'rgba(240,230,216,.35)'; c.lineWidth = 0.7;
  for (let j = -3; j <= 3; j++) { c.beginPath(); c.moveTo(cx - 1, y + j * 3); c.lineTo(cx - 5, y + j * 1.6); c.stroke(); }
  c.strokeStyle = '#f0e6d8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, y - 13); c.lineTo(cx, y + 13); c.stroke();
  // the value over the far end (over the near end while the cap stands there); its box is the double tap's zone
  c.font = '500 11px ' + COL.fontNum; c.textBaseline = 'alphabetic';
  const t = v > FADER_OFF ? mxDbTxt(v) + ' dB' : 'aus', tw = c.measureText(t).width, lo = cx > w - 70;
  c.textAlign = lo ? 'left' : 'right';
  c.fillStyle = dorm ? 'rgba(168,153,138,.7)' : 'rgba(240,230,216,.92)';
  c.fillText(t, lo ? x0 : x1, 11);
  R.vz = lo ? [x0, x0 + tw] : [x1 - tw, x1];
  if (L.clip) { c.fillStyle = '#ff5b4d'; c.beginPath(); c.arc(lo ? x0 + tw + 8 : x1 - tw - 8, 7, 2.6, 0, MX_TAU); c.fill(); }
}
const panelEls = {};
let userFileIn = null;
const engSecs = {};
// how the new sources play (the older ones share the two general notes)
const ENG_NOTE = {
  amo: 'Ein Bass aus Zufall: Die Welle ist ein Vieleck, das in jeder Periode seine Form ändert – die Tonhöhe bleibt. Die Höhe ist die Unruhe: unten fast ruhig, ein fremder Orgelton; in der Mitte wandern die Obertöne; oben tobt die Welle, rau wie Rauschen, der Ton bleibt. Nach jedem Ausbruch kehrt die Form zurück (Rückkehr): Schütteln (Gestik) bricht sie auf, sie heilt. Im Puls zuckt sie, jeder Stoß anders. Sie lebt unten – am besten eine Oktave tiefer; weiter oben wird die Welle einfacher und dünner.',
  mdr: 'Ein Tipp ist ein Schlag, die Höhe dabei die Feuchte: unten fast eine gewöhnliche Glocke, die langsam dunkler wird; weiter oben frisst der Pilz die hohen Teiltöne – jeder zerbröselt in ein feines Knistern auf seiner eigenen Tonhöhe, während der Grundton anschwillt. Dann bleibt ein rundes Brummen, das zum Ende des Nachklangs knisternd austrocknet. Leise Schläge haben wenig zu verdauen. Im Puls verdaut jeder Schlag umso schneller, je kürzer der Schritt.',
  gsp: 'Ein Tipp zupft eine Saite – und das Netz aus Saiten, gestimmt auf deine Tonleiter, schwingt mit: Oktave und Quinte als Halo. Die Höhe beim Tipp ist die Helligkeit und wie viel ins Netz geht. Alles, was Gespinst spielt – Finger, Ebene 2, die Puls-Spuren, der Sporenregen –, klingt im selben Netz, und gehaltene Töne tauschen über den Steg Energie. Kopplung führt es an die Kante, an der es von selbst singen will; ein Wächter hält es davor. Das Netz hat einen eigenen Kanal im Mixer (Halo).',
  rhz: 'Ein Tipp ist ein Schlag auf einen Knoten im Wurzelnetz: er klopft auf seiner Note – und reicht die Ladung vielleicht weiter, an die Nachbarstufen der Tonleiter, und die wieder an ihre. So antwortet derselbe Tipp mal mit einem Nachbarn, mal läuft eine Lawine über das ganze Feld. Die Höhe beim Tipp ist die Ausbreitung (unten müde, oben reizbar) und die Helligkeit der Knoten; Reiz stellt das Netz insgesamt ein, Weg das Tempo, Erholung, wie lange ein Knoten nach dem Feuern schweigt – ein Netz, das gerade gelaufen ist, ist erschöpft. Finger, Ebene 2, die Puls-Spuren und der Sporenregen spielen im selben Netz.',
  glt: 'Die Höhe ist die Verstärkung der Schleife: unten ein leises Klopfen mit gedämpftem Ping, ab etwa einem Drittel wächst der Ton von selbst – erst ein Pfeifen, dann satt und leicht gesättigt, er pendelt sich ein und atmet (Glimmen). Weiter oben springt er in die Oktave oder Duodezime (Sprung). Loslassen stoppt nichts: der Ton verglüht (Nachglühen). Im Puls zündet jeder Stoß sofort.',
  hrz: 'Die Höhe ist der Bogendruck: unten ein Hauch von Reibung, in der Mitte schwillt der Ton in einer halben Sekunde an und steht, weiter oben wird er körniger und lauter, ganz oben reißt der Bogen (beim Teich schreit der Stab). Glas und Schale singen mit dem kreisenden Finger (das Wah) und schweben; Zunge ist das Daxophon – ein Holz, das spricht und knurrt; Teich das Waterphone mit schwappendem Wasser. Loslassen hebt den Bogen ab, die Moden klingen nach (Dämpfung).',
  hlm: () => ({
    rohrblatt: 'Die Höhe ist der Atem: unten nur Luft, ab etwa einem Viertel spricht das Rohr an, weiter oben lauter und heller, ganz oben würgt das Blatt. Aufsetzen ist ein Zungenstoß, im Puls ein kurzer Stoß.',
    floete: 'Die Höhe ist der Atem: unten hauchig und leise, dann voller und heller, über dem Überblaspunkt (Strahl) springt die Flöte in die Oktave, ganz oben in die Duodezime. Aufsetzen ist ein weicher Zungenstoß, im Puls ein kurzer Ton.',
    flamme: 'Die Höhe ist die Hitze: unten nur Feuer, das rauscht und knackt; an der Schwelle (um ein Drittel) erwacht der Ton im Rohr und kommt in Stößen, darüber singt er, heller mit der Hitze; ganz oben kippt er in die Oktave. Loslassen: der Ton erlischt im Zischen. Im Puls ein Gasstoß mit kurzem Ton.',
  })[P['hlm.rohr']] || '',
  boe: 'Die Höhe ist die Windstärke: je höher der Finger, desto höher der Oberton, den der Wind fängt. Trifft er eine Saite, rastet sie ein und singt; dazwischen streift er nur – die Saiten von vorher klingen nach, so bleibt ein Akkord hängen. Böen und ein langsam wandernder Wind lassen ihn von selbst umspringen. Aufsetzen ist eine Anfangsböe, im Puls ein Böen-Zupf. Loslassen: Der Wind legt sich, die Saiten klingen aus (Nachklang).',
  shn: 'Aufsetzen zupft die Saite, Gleiten zieht sie (ohne neuen Anschlag). Die Höhe ist die Hand: unten dämpft der Handballen – ein kurzer, dumpfer Zupf –, in der Mitte klingt die Saite offen, bei etwa drei Vierteln berührt der Finger einen Knoten (Flageolett: Oktave, Duodezime, Doppeloktave), ganz oben legt ein E-Bow Energie nach – die Saite schwillt wieder an und hält, ganz oben kippt sie in die Oktave. Loslassen dämpft. Steg Jawari: der Zupf blüht nach oben in ein Sirren auf. Im Puls ein Zupf, nach dem Gate gedämpft.',
  khl: 'Zwei Stimmlippen einer Vogelkehle. Die Höhe ist der Druck im Luftsack: unten nur Atem, ab etwa einem Fünftel springen die Lippen an – ein Chip, dann ein klarer Pfiff, oben wird er rau (jede zweite Schwingung mehr Druck: das Krächzen). Silbe formt jeden Einsatz: Chip (ein kurzer Aufwärtsschnipser in den Ton), Triller (Druckstöße, 13–25 je Sekunde), Ruf (ein abwärts geschleifter Ruf, der sich wiederholt, solange du hältst). Ein Sprung der Höhe, ein Schütteln und jeder Puls-Schlag beginnen eine neue Silbe. Druck verschiebt die Schwelle, Spannung macht die Lippen steifer (mehr Obertöne), Schnabel ist die Länge der Luftröhre, Anstieg die Zeit, bis der Druck steht.',
  zpf: 'Die Höhe ist die Kratzrate: unten einzelne Ticks, drei bis zehn in der Sekunde, jeder ein Klopfen mit gestimmtem Nachklang; höher wird das Ticken zum Schnarren, dann rastet die Rate auf Teiler der Note ein (Rast) – ganz oben ist sie der Ton selbst, rau und sägend. Schnelles Auf und Ab kratzt schneller. Fels knarrt wie Gestein und wird oben zum Ton. Im Puls ein Strich: anlaufen, auslaufen, am Ende ein Klopfen.',
  rnk: 'Aufsetzen schlägt den Ring an – unten breit und weich, oben schmal und hell; gehalten hält ein leiser Druck die Form in Bewegung. Im Puls ein Hammerschlag, Schütteln (Gestik) schlägt nach.',
  elm: 'Die Höhe ist die Spannung: unten brummt das Netz (in die Bassoktave gefaltet), darüber knistert die Korona, erst einzeln, dann dicht, oben zündet der Lichtbogen über dem Ton – er lebt vom Knistern und springt selten in Quinten und Oktaven. Aufsetzen ist ein Zündstoß, im Puls ein Zap mit Knisterschweif.',
  jrg: 'Die Höhe ist der Treffpunkt auf dem Stab: unten die Mitte (voll und rund), etwas über der Mitte die Knotenlinie (der Grundton verschwindet, ein hohles Klopfen), oben das Ende (hell). Der Stab lebt in einem Jahr: Frühling dünn und hell, Sommer warm und lang, Herbst mit Laubrascheln, Winter gläsern mit Eisriss. Spielen lässt ihn altern (höchstens 6 Cent tiefer); Verjüngen und Schlafen machen ihn wieder jung.',
};
function buildKlang() {
  const box = h('div');
  // the source: one row (‹ name ›, the library behind the name), the die in the section's head – then pitch
  const eng = ctl('v.eng', { label: 'Für die Spielfläche' });
  eng.classList.add('bare');
  const src = section('Klangquelle', null, eng, grid(ctl('v.oct'), ctl('v.deg')));
  src.firstChild.firstChild.append(h('span', { class: 'mx-sr' }, ' – was ein Finger spielt'));
  src.firstChild.append(eng.dice);
  box.append(src);
  for (const [k, name] of ENG_OPTS) {
    const ids = Object.keys(PD).filter((id) => id.startsWith(k + '.'));
    const s = section(name, ENG_INFO[k], grid(...ctls(ids)));
    s.hidden = true; engSecs[k] = s;
    const M = ENG_META[k];
    s.querySelector('h3').prepend(kqGlyph(k));
    if (M.hoehe) s.firstChild.after(h('p', { class: 'note kq-hoehe' }, 'Höhe: ' + M.hoehe));
    // the two knobs a keyboard's Klang-Makro A and B move
    (MACRO[k] || []).forEach((id, i) => { const w = s.querySelector('[data-pid="' + id + '"] label'); if (w) w.append(h('span', { class: 'kq-ab', title: 'Klang-Makro ' + 'AB'[i] + ' (Keyboard und Controller)', 'aria-hidden': 'true' }, 'AB'[i])); });
    if (k === 'kor') {
      userFileIn = h('input', { type: 'file', accept: 'audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac', hidden: true });
      userFileIn.addEventListener('change', () => { const f = userFileIn.files && userFileIn.files[0]; userFileIn.value = ''; loadUserFile(f); });
      userTexEl = h('p', { class: 'note' });
      s.append(h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { type: 'button', class: 'btn', onclick: () => userFileIn.click() }, 'Audiodatei laden …'), userFileIn), userTexEl);
      s.append(h('p', { class: 'note' }, 'Senkrecht wählst du die Stelle im Klangmaterial, waagrecht die Tonhöhe. „Echo“ körnt die letzten acht Sekunden deines eigenen Spiels, „Eigene Datei“ eine geladene Audiodatei oder Aufnahme, „Mikrofon“ die letzten Sekunden, die das Mikrofon hört.'));
      updUserTexUI();
    }
    if (k === 'jrg') {   // the bar's year and age, live (klangFrame), and the way back to a young bar
      s.jrgNow = h('p', { class: 'note' });
      s.append(h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { type: 'button', class: 'btn', onclick: () => { A.jrgAge = 0; jrgText(); toast('Der Stab ist wieder jung.'); } }, 'Verjüngen')), s.jrgNow);
      jrgText();
    }
    if (ENGINES[k].needs) { s.wkNote = h('p', { class: 'note', hidden: true }); s.append(s.wkNote); }
    if (M.rich) { s.richNote = h('p', { class: 'note', hidden: !Q.rich }, M.rich); s.append(s.richNote); }
    if (ENG_NOTE[k]) s.append(h('p', { class: 'note', id: 'eng-note-' + k }, typeof ENG_NOTE[k] === 'function' ? ENG_NOTE[k]() : ENG_NOTE[k]));
    else if (ENGINES[k].sustain) s.append(h('p', { class: 'note' }, 'Klingt, solange der Finger liegt; Schieben ändert Tonhöhe und Farbe. Im Puls erklingt ein kurzer Stoß.'));
    else s.append(h('p', { class: 'note' }, 'Schlägt beim Berühren an. Mit „Wischen schlägt an“ auch bei jedem Tonwechsel unterwegs, mit „Wirbel“ wiederholt im Tempo des Pulses.'));
    box.append(s);
  }
  wkUiSync();
  box.append(section('Zweite Ebene', 'Ein zweiter Klang auf jedem Finger', grid(ctl('v.layer', { label: 'Ebene' }), ctl('v.layerLvl'), ctl('v.layerInt'), ctl('v.layerDeg')),
    h('p', { class: 'note' }, 'Tonstufe verschiebt um Stufen der Skala – so bleibt jeder Ton in der Tonart. Lautstärke, Klangfarbe und Raum jeder Ebene regelst du im Mixer.')));
  box.append(section('Spielweise', null, grid(ctl('v.roll'), ctl('v.strum'), ctl('v.glide'), ctl('v.vel'), ctl('v.human'), ctl('v.width'))));
  box.append(section('Stimmung', null, grid(ctl('t.root'), ctl('t.scale'), ctl('t.oct'), ctl('t.range'), ctl('t.a4'), ctl('t.just'))));
  return box;
}
// Jahresring's section: „Jetzt: Herbst (3:12 im Jahr) · Ringe: 412“
function jrgText() {
  const el = engSecs.jrg && engSecs.jrg.jrgNow;
  if (!el) return;
  const fix = JRG_FIX[P['jrg.jahreszeit']], se = fix != null ? fix : A.season, yr = P['jrg.jahr'], sec = se * yr * 60;
  const when = fix != null ? 'fest' : !(yr > 0) ? 'Stillstand' : Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0') + ' im Jahr';
  el.textContent = 'Jetzt: ' + JRG_SEASON[Math.round(se * 4) % 4] + ' (' + when + ') · Ringe: ' + A.jrgAge;
}
// the Klang panel's frame: once a second the bar's year, while its section shows
function klangFrame() {
  const now = performance.now();
  if (engSecs.jrg && !engSecs.jrg.hidden && !(now - (klangFrame.t || 0) < 1000)) { klangFrame.t = now; jrgText(); }
}
function refreshEngineUI() {
  const a = P['v.eng'], b = P['v.layer'];
  for (const k in engSecs) engSecs[k].hidden = !(k === a || k === b);
  // keep the active engine's section right below the source chooser, layer engine after it
  const host = engSecs[a] && engSecs[a].parentNode;
  if (host) {
    const first = host.children[0];
    first.after(engSecs[a]);
    if (b !== 'off' && b !== a) engSecs[a].after(engSecs[b]);
  }
  const two = b !== 'off' && b !== a, label = ENG_NAME[a] + (two ? ' + ' + ENG_NAME[b] : '');
  $('#engName').textContent = label;
  const gl = $('#engGlyph'), fb = kqFb(a) || (two && kqFb(b));
  gl.replaceChildren(kqGlyph(a), ...(two ? [kqGlyph(b)] : []));
  let dot = $('#engChip .fbdot');
  if (fb && !dot) { dot = h('span', { class: 'fbdot' }); $('#engChip').append(dot); }
  if (dot) { dot.hidden = !fb; dot.title = fb ? 'spielt als ' + ENG_NAME[kqFb(a) || kqFb(b)] : ''; }
  $('#engChip').setAttribute('aria-label', 'Klangquelle: ' + ENG_NAME[a] + (two ? ', dazu ' + ENG_NAME[b] : '') + (fb ? ' (vereinfacht)' : '') + '. Einstellungen öffnen; lange drücken öffnet die Bibliothek');
  for (const k in engSecs) if (engSecs[k].richNote) engSecs[k].richNote.hidden = !Q.rich;
}
