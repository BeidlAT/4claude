/* ---------- the Gestik card ---------- */
// One card among the keyboards, in the order of play: the Lebenszeichen (rate and jitter, or plainly what is wrong, and
// in a word what Gestik does now), the Wasserwaage (a spore in a ring: the inner circle is the Ruhezone, the ring the
// Weite; drag the spore to tilt without a sensor – a computer, the claude.ai view – double-tap for a new zero) beside
// the axes and events (while "Zuweisen" is on, a tap picks one); what tilt shapes; Ladung and Schlafen; Fährte and
// Nullpunkt; then the finer settings, Zuweisen, the Funkstrecke, Messen and Hinweise.
const GK_CLUTCH_TXT = { toene: 'Wirkt, solange ein Ton klingt – Finger, Taste oder ein vom Haltepedal gehaltener Ton. Der Nullpunkt ist deine Haltung beim ersten Anschlag; loslassen führt zurück. Festhalten friert die Form ein: ein zugewiesenes Pad „Gestik festhalten“ – oder, wenn unten eingeschaltet, das Haltepedal.',
  immer: 'Wirkt immer. Nullpunkt beim Einschalten oder mit einem Doppeltipp auf die Wasserwaage.', taste: 'Wirkt nur, solange ein zugewiesenes Pad „Gestik-Taste“ gehalten wird.' };
// a pad is learned for "Gestik-Taste" (without one, "Taste" could never act)
const gkHasTaste = () => MAP.user.some((b) => b.target === 'gk.taste') || [...MIDI.srcs.values()].some((s) => s.prof && s.prof.binds && s.prof.binds.some((b) => b.target === 'gk.taste'));
const gkCanLock = () => MOBILE && !inViewer && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && !!screen.orientation && typeof screen.orientation.lock === 'function';
// Entladung on a log scale: 0.3 s (a rattle) … 30 s (a capacitor)
const gkEntl = (x) => Math.round(0.3 * Math.pow(100, x / 100) * 10) / 10, gkEntlX = (s) => Math.round((100 * Math.log(s / 0.3)) / Math.log(100));
function gkChips(label, opts, get, set) {
  const box = h('div', { class: 'chips small', role: 'radiogroup', 'aria-label': label });
  const bs = opts.map(([v, t]) => { const b = h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': 'false', onclick: () => { set(v); sync(); } }, t); b.dataset.v = v; box.append(b); return b; });
  const sync = () => { for (const b of bs) { const on = String(get()) === b.dataset.v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; } };
  box.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    let i = bs.findIndex((b) => b.dataset.v === String(get()));
    for (let n = 0; n < bs.length; n++) { i = (i + d + bs.length) % bs.length; if (!bs[i].disabled) break; }   // (a chip that cannot be chosen now is passed)
    bs[i].click(); bs[i].focus();
  });
  sync(); box.sync = sync;
  return box;
}
function gkCard(it) {
  const C = { it, gk: true, lit: false, t: 0, st: 0 };
  const row = (lab, el) => h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, lab), el), sub = (t) => h('h4', { class: 'kc-sub' }, t);
  C.led = h('i', { class: 'kc-led', 'aria-hidden': 'true' });
  C.badge = h('span', { class: 'kc-badge gk' }, 'Sensor');
  const head = h('div', { class: 'kc-dh' }, C.led, h('span', { class: 'kc-dn' }, 'Gestik · ' + gkDevWord()), C.badge,
    kcSwitch('Gestik', true, (v) => { if (!v) gkDisable(); }, { bare: true, cls: 'kc-tog', aria: 'Gestik an', title: 'Ausschalten', key: it.key + ':on' }));
  // the Lebenszeichen: rate and jitter (or what is wrong), and in a word what Gestik does right now
  C.stat = h('span', { class: 'gk-stat' }); C.mode = h('span', { class: 'gk-mode' });
  C.life = h('p', { class: 'kc-last gk-life' }, C.stat, h('span', { class: 'mx-sr' }, ' · '), C.mode);   // (the separator: a screen reader would run "ms" and the word together)
  C.hint = h('p', { class: 'note gk-hint', hidden: true });
  C.app = h('div', { class: 'row kc-app', hidden: true }, h('a', { href: 'https://' + APP_URL + '/', target: '_blank', rel: 'noopener' }, APP_URL));
  // the Wasserwaage: its size follows the card (ResizeObserver), its picture is drawn in gkCardFrame
  C.wwD = h('span', { class: 'mx-sr', id: 'gk-ww-d' });
  C.cv = h('canvas', { class: 'gk-ww', tabindex: '0', role: 'img', 'aria-describedby': 'gk-ww-d', 'aria-label': 'Wasserwaage: die Spore zeigt die Neigung, der innere Kreis die Ruhezone, der Ring die Weite. Ziehen oder Pfeiltasten: Neigung ohne Sensor. Doppeltipp, 0 oder Eingabe: neuer Nullpunkt. Escape: zurück zum Sensor.' });
  C.dpr = Math.min(2, window.devicePixelRatio || 1);
  C.ctx = C.cv.getContext('2d');
  const size = (w) => { w = Math.round(w); if (!w || w === C.w) return; C.w = w; C.cv.width = C.cv.height = Math.round(w * C.dpr); C.ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); C.t = 0; };
  size(140);
  if (window.ResizeObserver) new ResizeObserver((l) => size(l[l.length - 1].contentRect.width)).observe(C.cv);
  let drag = null;
  const at = (e) => {
    const r = C.cv.getBoundingClientRect(), R = r.width / 2 - 8;
    let x = (e.clientX - r.left - r.width / 2) / R, y = -(e.clientY - r.top - r.height / 2) / R;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    GK.virt = { x, y }; gkUpdate(performance.now(), []);
  };
  C.cv.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; try { C.cv.setPointerCapture(e.pointerId); } catch (err) {} });
  C.cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;   // a tap is no drag
    drag.moved = true; GK.drag = true; GK.latch = false; at(e);
  });
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (drag.moved) {
      GK.drag = false;
      // Sporenregen: the lean set by hand stays – on top of the sensor (an iPad on its stand rains on with both hands
      // free) – until a double tap, Escape or "Nullpunkt setzen"; otherwise the sensor takes over again
      if (GK.live && gkRgLatch()) { GK.virt = { x: GK.virt.x - GK.raw.tiltX, y: GK.virt.y - GK.raw.tiltY }; GK.latch = true; gkSay('Neigung von Hand bleibt – Doppeltipp: zurück zum Sensor'); }
      else if (GK.live) { GK.virt = null; GK.latch = false; }
      gkUpdate(performance.now(), []);
    }
    drag = null;
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) C.cv.addEventListener(t, end);
  const zero = () => { if (GK.latch) { GK.virt = null; GK.latch = false; } if (GK.live) gkZero(true, true); else GK.virt = null; C.flash = performance.now(); gkUpdate(performance.now(), []); gkSay('Neuer Nullpunkt'); };
  onDoubleTap(C.cv, zero);
  C.cv.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (e.key === '0' || e.key === 'Enter') { e.preventDefault(); zero(); return; }
    if (e.key === 'Escape' && GK.virt && GK.live) { e.preventDefault(); GK.virt = null; GK.latch = false; gkUpdate(performance.now(), []); return; }
    if (!d) return;
    e.preventDefault();
    if (GK.live && gkRgLatch()) GK.latch = true;   // (with the sensor: a lean added on top of it)
    const v = GK.virt || { x: 0, y: 0 };
    GK.virt = { x: clamp(v.x + d[0] * 0.1, -1, 1), y: clamp(v.y + d[1] * 0.1, -1, 1) }; gkUpdate(performance.now(), []);
    clearTimeout(C.sayT); C.sayT = setTimeout(() => gkSay(C.wwD.textContent), 350);   // a screen reader hears where it went (once the keys rest)
  });
  // the axes and events: live bars and lamps; in Zuweisen a tap picks one
  C.ax = GK_AXN.map((n, i) => {
    const bar = h('i'), b = h('button', { type: 'button', class: 'gk-ax', 'data-gk': 'axis:' + i, 'aria-label': n + ' – in „Zuweisen“ antippen, um es zuzuweisen' }, h('span', null, n), h('span', { class: 'gk-bar' }, bar));
    b.addEventListener('click', () => { if (gkLearnPick('axis', i)) { b.classList.add('ml-ok'); setTimeout(() => b.classList.remove('ml-ok'), 700); } });
    b.bar = bar;
    return b;
  });
  C.ev = GK_EVN.map((n, i) => {
    const b = h('button', { type: 'button', class: 'gk-ev', 'data-gk': 'ev:' + i, 'aria-label': n + ' – in „Zuweisen“ antippen, um es zuzuweisen' }, n);
    b.addEventListener('click', () => { if (gkLearnPick('gest', i)) { b.classList.add('ml-ok'); setTimeout(() => b.classList.remove('ml-ok'), 700); } });
    return b;
  });
  const main = h('div', { class: 'gk-main' }, h('div', { class: 'gk-wwb' }, C.cv, C.wwD), h('div', { class: 'gk-axes' }, ...C.ax), h('div', { class: 'gk-evs' }, ...C.ev));
  C.fae = h('p', { class: 'note gk-fae', hidden: true });
  // what tilt shapes, and its own settings folded below (Anlehnen or Sporenregen)
  C.neigen = gkChips('Neigen formt', [['aus', 'Aus'], ['anl', 'Anlehnen'], ['regen', 'Sporenregen'], ['eigene', 'Eigene']], () => GK.p.neigen, (v) => { gkSet('neigen', v); gkCardSync(); });
  C.neTxt = h('p', { class: 'note' });
  C.ga = gaCardUI(C, it); C.rg = rgCardUI(C, it);
  // Ladung and Schlafen: a switch each, its settings folded right below it (the Entladung is Ladung's)
  C.lad = ladCardUI(C, it); C.slp = slpCardUI(C);
  C.ladSw = kcSwitch('Ladung', GK.p.lad, (v) => { gkSet('lad', v); gkCardSync(); }, { aria: 'Ladung: Schütteln lädt das Myzel auf', key: it.key + ':lad' });
  C.slpSw = kcSwitch('Schlafen', GK.p.schlaf, (v) => { gkSet('schlaf', v); gkCardSync(); }, { aria: 'Schlafen: Display nach unten lässt Myzel einschlafen', key: it.key + ':slp' });
  // the hands' buttons: a new zero, the rotation lock (the Fährte's button is gone – the Korb takes Bewegung, SPEC §18)
  const btns = h('div', { class: 'row gk-btns' }, h('button', { type: 'button', class: 'btn ghost', onclick: zero }, 'Nullpunkt setzen'));
  if (gkCanLock()) btns.append(h('button', { type: 'button', class: 'btn ghost', onclick: gkLock }, 'Vollbild mit Drehsperre'));
  // the finer settings
  C.weite = gkChips('Weite', [[20, 'klein 20°'], [30, 'mittel 30°'], [45, 'groß 45°']], () => GK.p.weite, (v) => gkSet('weite', +v));
  C.clutch = gkChips('Wann Gestik wirkt', [['toene', 'Mit Tönen'], ['immer', 'Immer'], ['taste', 'Taste']], () => GK.p.clutch, (v) => { gkSet('clutch', v); gkCardSync(); });
  C.clTxt = h('p', { class: 'note' });
  const opts = h('div', { class: 'kc-opts' });
  // Fingerhalt only where a finger plays on the moving glass; Haptik only where the browser can vibrate (not iOS)
  if (MOBILE || navigator.maxTouchPoints > 0) opts.append(kcSwitch('Fingerhalt', GK.p.halt, (v) => gkSet('halt', v), { aria: 'Fingerhalt: Ein Finger, unter dem sich beim Neigen das Glas wegdreht, behält seinen Ton', title: 'Neigst du das Handy, dreht sich das Glas unter dem Finger weg. Fingerhalt hält dann Spalte und Ton; bewusstes Gleiten wirkt weiter. Aus: der Ton gleitet mit.', key: it.key + ':halt' }));
  if (MOBILE && typeof navigator.vibrate === 'function') opts.append(kcSwitch('Haptik', GK.p.haptik, (v) => gkSet('haptik', v), { aria: 'Haptik: ein feiner Vibrationstick beim Einrasten und beim Nullpunkt', key: it.key + ':hap' }));
  opts.append(kcSwitch('Haltepedal hält fest', GK.p.ped, (v) => gkSet('ped', v), { aria: 'Haltepedal hält Gestik fest: solange das Pedal eines Keyboards unten ist, bleibt die Form, wie sie ist', title: 'Aus: das Haltepedal hält nur die Töne, Anlehnen wirkt weiter. An: das Pedal friert auch die Gestik ein (Festhalten).', key: it.key + ':ped' }));
  const optTxt = opts.childNodes.length ? h('p', { class: 'note' }, (opts.querySelector('[data-kc$=":halt"]') ? 'Fingerhalt: dreht sich beim Neigen das Glas unter dem Finger weg, bleibt der Ton in seiner Spalte – bewusstes Gleiten wirkt weiter. ' : '') + (opts.querySelector('[data-kc$=":hap"]') ? 'Haptik: ein feiner Tick beim Einrasten.' : '')) : null;
  // Gestik-Rezepte: a preset's recipe acts while Gestik is on (switched off here, the own settings stay)
  C.rez = kcSwitch('Rezepte der Presets', GK.p.rez, (v) => { gkSet('rez', v); rzSync(); gkCardSync(); }, { aria: 'Rezepte der Presets: ein Preset bringt seine Gestik-Einstellungen mit', title: 'Lädst du ein Preset mit Gestik-Rezept, stellt es Gestik passend ein – solange Gestik an ist. Deine Zuweisungen und was du selbst änderst, gehen vor.', key: it.key + ':rez' });
  C.rzTxt = h('p', { class: 'note gk-rz' });
  // Zuweisen: the same way as with a keyboard
  const zw = h('div', { class: 'gk-zw' }, h('button', { type: 'button', class: 'btn ghost', onclick: learnBtn }, 'Zuweisen'),
    h('p', { class: 'note' }, 'Wie bei deinen Keyboards: „Zuweisen“ antippen, ' + (gkBig() || !MOBILE ? 'das Gerät' : 'das Handy') + ' bewegen (oder oben eine Achse antippen), dann das Ziel antippen.'));
  // Messen
  C.mess = h('dl', { class: 'kc-ctrls gk-mess' });
  C.klBtn = h('button', { type: 'button', class: 'btn ghost', onclick: gkKlopf }, 'Klopf-Messung');
  C.recBtn = h('button', { type: 'button', class: 'btn ghost', onclick: gkRec }, 'Spur aufnehmen');
  C.klTxt = h('p', { class: 'note' });
  C.messD = h('details', { class: 'kc-more', open: KC.open.gkm || null, ontoggle: (e) => { kcKeep('gkm', e.target.open); gkCardSync(); } }, h('summary', null, 'Messen'), C.mess,
    h('div', { class: 'row' }, C.klBtn, C.recBtn), C.klTxt,
    h('p', { class: 'note' }, '„Spur aufnehmen“ schreibt 30 s lang die rohen Sensorwerte mit und bietet sie als Datei an – für Fragen und Fehlerberichte.'));
  C.help = h('ul', { class: 'help' });
  const help = h('details', { class: 'kc-more', open: KC.open.gkh || null, ontoggle: (e) => kcKeep('gkh', e.target.open) }, h('summary', null, 'Hinweise'), C.help);
  gkHelp(C);
  C.el = h('div', { class: 'kc-dev gk-card', role: 'group', 'aria-label': 'Gestik' }, head, C.life, C.hint, C.app, main, C.fae,
    row('Neigen formt', C.neigen), C.neTxt, C.ga, C.rg,
    sub('schütteln und umdrehen'), h('div', { class: 'gk-pair' }, h('div', { class: 'kc-opts' }, C.ladSw), C.lad), h('div', { class: 'gk-pair' }, h('div', { class: 'kc-opts' }, C.slpSw), C.slp), btns,
    // the rest under one fold: the card stays about two screens long on a phone
    h('details', { class: 'kc-more gk-mehr', open: KC.open.gkx || null, ontoggle: (e) => { kcKeep('gkx', e.target.open); gkCardSync(); } }, h('summary', null, 'Mehr: Feinheiten und Werkzeuge'),
      sub('feinheiten'), row('Weite', C.weite), (C.clRow = row('Wann Gestik wirkt', C.clutch)), C.clTxt, opts, optTxt,
      h('div', { class: 'kc-opts' }, C.rez), C.rzTxt, zw, gkfCardUI(C), C.messD, help));
  GK.card = C;
  gkCardSync();
  return C;
}
// "Hinweise": the system's rotation, gestures it cannot catch, the screen – and honestly where Gestik is at home
function gkHelp(C) {
  const li = (b, t) => h('li', null, h('b', null, b + ': '), t);
  const l = [li('Ansicht dreht sich mit', 'Starkes seitliches Neigen dreht die Oberfläche. Schalte die Drehsperre des Geräts ein (Kontrollzentrum bzw. Schnelleinstellungen)' + (gkCanLock() ? ' oder nutze „Vollbild mit Drehsperre“.' : '.')),
    li('Systemgesten', 'Manche Geräte reagieren selbst auf Bewegung – etwa „zweimal hacken = Taschenlampe“ oder „Schütteln zum Widerrufen“ nach dem Tippen von Text. Das kann Myzel nicht abfangen; schalte es bei Bedarf in den Einstellungen des Geräts ab.'),
    li('Bildschirm', 'Bewegungssensoren laufen nur bei eingeschaltetem Bildschirm und offener App. Myzel hält ihn wach, solange Gestik an ist; das kostet Akku.'),
    li('Ehrlich gesagt', GK_HONEST),
    li('Ohne Bewegung', 'Alles geht auch ohne: die Spore in der Wasserwaage ziehen, Regler zuweisen, ihre Bewegung mit dem Korb als Schleife ernten. Der Schalter oben schaltet Gestik ganz ab.')];
  if (gkBig()) l.splice(3, 0, li('Großes Gerät', 'Zu schwer für Ausdruck aus dem Handgelenk: Bebung ist zuerst aus. Neigen, Schlafen und der Sporenregen gehen gut – auf dem Schoß oder angelehnt an einen Ständer (dort regnet es weiter).'));
  C.help.replaceChildren(...l);
}
const GK_HONEST = 'Gestik ist vor allem eine Handy-Sache. Ein Tablet ist zu schwer für Ausdruck aus dem Handgelenk, ein Computer hat meist keine Sensoren, und in der claude.ai-Ansicht ist Bewegung gesperrt. Dort ziehst du die Spore in der Wasserwaage, erntest Regler-Bewegung mit dem Korb – oder holst die Bewegung eines Handys per Funkstrecke (USB-Kabel) an den Computer.';
// the texts and switches of the card (on changes, and four times a second while it shows)
function gkCardSync() {
  const C = GK.card;
  if (!C || !C.el.isConnected) return;
  const st = GK.R && GK.R.st, virt = !!GK.virt && (GK.drag || !GK.live), tx = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  tx(C.stat, GK.msgT || '');
  C.stat.classList.toggle('warn', !!GK.msgW); C.life.classList.toggle('warn', !!GK.msgW);
  const mw = gkModeWord();
  tx(C.mode, mw[1]);
  if (C.mode.dataset.m !== mw[0]) C.mode.dataset.m = mw[0];
  C.app.hidden = !(GK.msgW && gkBlocked());
  // a second line where the first cannot say enough: what to do after a refusal, honestly where Gestik is at home
  const hint = GK.perm === 'denied' ? ''   // (the status line says it for both kinds of phones)
    : GK.msgW && GK.checked && !GK.live && !GK.rem ? (gkBlocked() ? 'Auch hier gehen die gezogene Wasserwaage, der Sporenregen und Schleifen aus Bewegung – nur die Sensoren nicht.' : 'Gestik ist vor allem eine Handy-Sache. Am Computer: Spore ziehen, Regler-Bewegung mit dem Korb ernten – oder die Bewegung eines Handys per Funkstrecke holen (siehe „Hinweise“).') : '';
  tx(C.hint, hint); C.hint.hidden = !hint;
  // the Wasserwaage for screen readers: the lean in degrees (in steps of 5°) and what Gestik does
  const W = GK.p.weite, dx = virt ? GK.virt.x * W : GK.live && st ? st.roll : 0, dy = virt ? GK.virt.y * W : GK.live && st ? -st.pitch : 0, r5 = (v) => Math.round(Math.abs(v) / 5) * 5;
  tx(C.wwD, (r5(dx) || r5(dy) ? 'Neigung: ' + (r5(dx) ? r5(dx) + '° nach ' + (dx > 0 ? 'rechts' : 'links') : '') + (r5(dx) && r5(dy) ? ', ' : '') + (r5(dy) ? 'Oberkante ' + r5(dy) + '° ' + (dy > 0 ? 'von dir weg' : 'zu dir') : '') : 'Keine Neigung') + (virt ? ' (von Hand)' : '') + (mw[1] ? ' – Gestik ' + mw[1] : '') + '.' +
    GK_EV.map((k, i) => (GK.ev[k] ? ' ' + GK_EVN[i] + '.' : '')).join(''));
  const bd = GK.rem ? 'Funkstrecke' : GK.live ? 'Sensor' : virt || GK.checked ? 'ohne Sensor' : 'Sensor';
  if (C.badge.textContent !== bd) C.badge.textContent = bd;
  C.weite.sync(); C.clutch.sync();
  // the bars and lamps are buttons only in Zuweisen (a tap there picks one); otherwise they only show
  const lrn = !!LEARN.on;
  if (C.lrn !== lrn) { C.lrn = lrn; for (const b of C.ax.concat(C.ev)) { b.tabIndex = lrn ? 0 : -1; if (lrn) b.removeAttribute('aria-hidden'); else b.setAttribute('aria-hidden', 'true'); } }
  const tb = C.clutch.querySelector('[data-v="taste"]'), noT = GK.p.clutch !== 'taste' && !gkHasTaste();   // "Taste" needs a learned pad
  if (tb && tb.disabled !== noT) { tb.disabled = noT; tb.title = noT ? 'Erst ein Pad als „Gestik-Taste“ zuweisen (Zuweisen, Pad drücken, Ziel „Gestik-Taste“)' : ''; }
  const rg = GK.p.neigen === 'regen' && GK.p.clutch !== 'taste', clt = rg ? RG_CL_TXT : GK_CLUTCH_TXT[GK.p.clutch];
  C.clRow.hidden = rg;   // Sporenregen always acts
  if (C.clTxt.textContent !== clt) C.clTxt.textContent = clt;
  const noGyro = GK.live && st && !st.gyro;
  gaCardSync(C, noGyro); rgCardSync(C); rzCardSync(C);
  ladCardSync(C, noGyro);
  gkfCardSync(C); gkFaeSync(C);
  for (const i of [2, 3]) {   // no gyroscope: said where the bar would be, and to the screen reader
    if (C.ax[i].classList.contains('na') === !!noGyro) continue;
    C.ax[i].classList.toggle('na', !!noGyro); C.ax[i].title = noGyro ? 'braucht Gyroskop – dieses Gerät hat keins' : '';
    C.ax[i].setAttribute('aria-label', GK_AXN[i] + (noGyro ? ' – braucht ein Gyroskop, dieses Gerät hat keins' : ' – in „Zuweisen“ antippen, um es zuzuweisen'));
  }
  C.klBtn.textContent = GK.kl ? 'Klopf-Messung abbrechen' : 'Klopf-Messung';
  C.recBtn.textContent = GK.rec ? 'Spur speichern (' + Math.round((performance.now() - GK.rec.at) / 1000) + ' s)' : 'Spur aufnehmen';
  const kt = GK.kl ? GK.kl.msg : GK.klMsg || (GK.p.lat ? 'Zuletzt gemessen: ' + GK.p.lat + ' ms von der Bewegung bis zum Klang.' : 'Klopf-Messung: misst mit dem Mikrofon, wie lange eine Bewegung bis zum Klang braucht (8 Klopfer neben dem Handy).');
  if (C.klTxt.textContent !== kt) C.klTxt.textContent = kt;
  if (C.messD.open && GK.rem) {   // a phone over the Funkstrecke: it measures for itself
    const G = GK.rem.src.gkr, rows = [['Rate', gkRemText()], ['Gyroskop', !GK.live ? '–' : st.gyro ? 'ja' : 'nein – Bebung und Drehen brauchen eines'],
      ['Neigung', GK.live ? '↔ ' + Math.round(st.roll) + '° · ↕ ' + Math.round(-st.pitch) + '° vom Nullpunkt' : '–'],
      ['Verzögerung', G.latS != null ? G.latS + ' ms am Handy gemessen, dazu die Leitung' : 'am Handy nicht gemessen (Klopf-Messung dort)'], ['Vorzeichen, Bass-Schutz', 'prüft das Handy selbst']];
    const sig = rows.map((r) => r[1]).join('|');
    if (sig !== C.messSig) { C.messSig = sig; C.mess.replaceChildren(...rows.flatMap(([a, b]) => [h('dt', null, a), h('dd', null, b)])); }
  } else if (C.messD.open) {
    const W = GK.p.weite, rows = [
      ['Rate', GK.live ? gkRateText() : '–'],
      ['Gyroskop', !GK.live ? '–' : st.gyro ? 'ja' : 'nein – Bebung und Drehen brauchen eines'],
      ['Vorzeichen', GK.live ? gkSignText() : '–'],
      ['Neigung', GK.live && st.u ? '↔ ' + Math.round(st.roll) + '° · ↕ ' + Math.round(-st.pitch) + '° vom Nullpunkt · ' + Math.round(Math.acos(clamp(st.sign * st.u[2], -1, 1)) * 180 / Math.PI) + '° aus der Waagerechten' : '–'],
      ['Ansicht dreht', GK.p.rot ? 'bei ' + GK.p.rot + '° Neigung zur Seite' + (GK.p.rot <= W + 4 ? ' – kleinere Weite wählen' : '') : 'noch nicht beobachtet'],
      ['Verzögerung', GK.p.lat ? GK.p.lat + ' ms gemessen' : 'geschätzt 40–100 ms (Klopf-Messung misst sie)'],
      ['Bass-Schutz', !GK.live || !st.gyro ? '–' : st.guard ? 'greift – lauter Bass rüttelt das Gyroskop, die Bebung ruht' : 'bereit'],
    ];
    const sig = rows.map((r) => r[1]).join('|');
    if (sig !== C.messSig) { C.messSig = sig; C.mess.replaceChildren(...rows.flatMap(([a, b]) => [h('dt', null, a), h('dd', null, b)])); }
  }
}
// Anlehnen in the card: sideways, several notes, Bebung, placement, Tragen – folded under "Neigen formt: Anlehnen"
// (the one line D4 asked for; the limits under it, small)
const GA_TRAGEN_TXT = 'Tragen: Finger heben, während das Handy geneigt ist – der Ton klingt weiter und folgt der Neigung. Zurück in die Mitte legt ihn ab.', GA_TRAGEN_LIM = 'Höchstens 2 getragene Töne; nach 20 s oder mit „Stille“ enden sie.';
function gaCardUI(C, it) {
  const row = (lab, el) => h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, lab), el);
  const set = (k) => (v) => { gkSet(k, v); gkCardSync(); };
  C.seit = gkChips('Seitlich neigen', [['ton', 'Tonhöhe'], ['raum', 'Raum'], ['aus', 'nichts']], () => GK.p.seit, set('seit'));
  C.viele = gkChips('Mehrere Töne', [['neu', 'Neuester voll'], ['alle', 'Alle gleich']], () => GK.p.viele, set('viele'));
  C.beb = gkChips('Bebung', [['hand', 'Hand'], ['oca', 'Ocarina'], ['aus', 'Aus']], gaBeb, set('beb'));
  C.platz = gkChips('Platzierung', [['hand', 'Hand'], ['arm', 'Unterarm']], () => GK.p.platz, set('platz'));
  C.seitRow = row('Seitlich neigen', C.seit);
  C.vTxt = h('p', { class: 'note' }); C.bTxt = h('p', { class: 'note' }); C.gaSum = h('span', { class: 'gk-sum' });
  C.tragen = kcSwitch('Tragen', GK.p.tragen, (v) => gkSet('tragen', v), { aria: 'Tragen: ein Ton bleibt nach dem Loslassen, solange das Handy geneigt ist', key: it.key + ':tragen' });
  return h('details', { class: 'kc-more gk-anl', open: KC.open.gka || null, ontoggle: (e) => kcKeep('gka', e.target.open) }, h('summary', null, 'Anlehnen einstellen', C.gaSum),
    C.seitRow, row('Mehrere Töne', C.viele), C.vTxt, row('Bebung', C.beb), C.bTxt, row('Platzierung', C.platz),
    h('div', { class: 'kc-opts' }, C.tragen), h('p', { class: 'note' }, GA_TRAGEN_TXT), h('p', { class: 'note gk-fine' }, GA_TRAGEN_LIM));
}
function gaCardSync(C, noGyro) {
  const p = GK.p, arm = p.platz === 'arm', beb = gaBeb(), seit = gaSeit();
  C.neigen.sync(); C.seit.sync(); C.viele.sync(); C.beb.sync(); C.platz.sync();
  C.ga.hidden = p.neigen !== 'anl'; C.seitRow.hidden = arm;
  const ne = p.neigen === 'aus' ? 'Neigen formt nichts – Ladung, Wenden, Ruhe und Schütteln wirken weiter.'
    : p.neigen === 'regen' ? (p.rgArt === 'harfe' ? 'Harfe: neigen lässt wenige Sporen über die Spalten gleiten – jede Spalte, die sie kreuzen, klingt, als Glissando durch die Skala.' : 'Jeder Ton, den du spielst, hinterlässt einen leuchtenden Keim. Neigen lässt Sporen bergab rollen; trifft eine einen Keim, klingt sein Ton – rechts aufwärts, links abwärts, im Raster des Pulses. Waagerecht wird es still.')
    : p.neigen === 'eigene' ? 'Neigen wirkt nur über deine Zuweisungen (Zuweisen antippen, Handy neigen, Regler antippen).'
    : arm ? 'Am Unterarm (Handy längs auf dem Unterarm): Rollen des Unterarms formt die Klangfarbe der gehaltenen Töne, die Hand bleibt frei auf den Tasten.'
    : 'Vor/zurück neigen formt die Klangfarbe der gehaltenen Töne (Höhe). Seitlich neigen ' + (seit === 'ton' ? 'biegt den neuesten Ton zur Nachbarstufe der Skala – rechts hinauf, links hinab; ab 80 % rastet er ein.' : seit === 'raum' ? 'lenkt den Klang in den Raum: Panorama und Echo.' : 'tut nichts.');
  if (C.neTxt.textContent !== ne) C.neTxt.textContent = ne;
  const vt = p.viele === 'alle' ? 'Jeder gehaltene Ton bekommt die volle Wirkung' + (seit === 'ton' ? ' und biegt zu seiner eigenen Nachbarstufe – der Akkord bleibt in der Tonart.' : '.') : 'Der zuletzt gespielte Ton bekommt die volle Wirkung, ältere die halbe' + (seit === 'ton' ? ' und keine Biegung.' : '.');
  if (C.vTxt.textContent !== vt) C.vTxt.textContent = vt;
  const hb = C.beb.querySelector('[data-v="hand"]');
  if (hb) { hb.disabled = !!noGyro; hb.title = noGyro ? 'braucht Gyroskop – dieses Gerät hat keins' : ''; }
  const bt = beb === 'hand' ? (noGyro ? 'Bebung braucht ein Gyroskop – dieses Gerät hat keins. Ocarina geht auch ohne.' : 'Schnelles Wackeln aus dem Handgelenk wird Vibrato – Tempo und Tiefe macht deine Hand.' + (gkBig() ? ' Auf großen Geräten ist das meist zu schwer.' : ''))
    : beb === 'oca' ? 'Ein gleichmäßiges Vibrato wie bei der Ocarina: je weiter du ' + (arm ? 'den Unterarm rollst' : 'nach vorn neigst') + ', desto tiefer und etwas schneller.' : 'Kein Vibrato aus der Bewegung.' + (p.beb == null && gkBig() ? ' (Auf großen Geräten ist Bebung zuerst aus.)' : '');
  if (C.bTxt.textContent !== bt) C.bTxt.textContent = bt;
  const sum = ' · ' + (arm ? 'Unterarm' : { ton: 'Tonhöhe', raum: 'Raum', aus: 'nur Höhe' }[seit]) + ' · Bebung ' + { hand: noGyro ? 'braucht Gyroskop' : 'Hand', oca: 'Ocarina', aus: 'aus' }[beb] + (p.tragen ? ' · Tragen' : '');
  if (C.gaSum.textContent !== sum) C.gaSum.textContent = sum;
  if (C.tragen.getAttribute('aria-checked') !== String(p.tragen)) C.tragen.setAttribute('aria-checked', String(p.tragen));
}
// Sporenregen in the card: art, strike, grid, how many spores, Zähigkeit, Ordnung, how long Keime stay, the Puls
const RG_CL_TXT = 'Sporenregen wirkt immer: die Haltung beim Wählen gilt als waagerecht, ein Doppeltipp auf die Wasserwaage setzt sie neu. Angelehnt an einen Ständer regnet es weiter.';
function rgCardUI(C, it) {
  const row = (lab, el) => h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, lab), el);
  const set = (k) => (v) => { gkSet(k, v); gkCardSync(); };
  C.rgArt = gkChips('Art des Sporenregens', [['keime', 'Keime'], ['harfe', 'Harfe']], () => GK.p.rgArt, set('rgArt'));
  C.rgS = kqRow(kqTarget('rgS'), { id: 'gk-kq-rgS', label: 'Anschlag' });
  C.rgQ = gkChips('Raster des Regens', [['auto', 'Auto'], ['8', '1/8'], ['16', '1/16'], ['8t', '1/8T'], ['frei', 'frei']], () => GK.p.rgQ, set('rgQ'));
  C.rgK = gkChips('Keime bleiben', [[2, '2 Takte'], [4, '4 Takte'], [8, '8 Takte']], () => GK.p.rgK, (v) => { gkSet('rgK', +v); gkCardSync(); });
  const sl = (k, lab, min, max, step, txt, aria) => {
    const r = h('input', { type: 'range', min, max, step, value: GK.p[k], 'aria-label': aria }), o = h('span', { class: 'val' });
    const sy = () => { if (+r.value !== GK.p[k]) r.value = GK.p[k]; o.textContent = txt(GK.p[k]); r.style.setProperty('--p', ((GK.p[k] - min) / (max - min)) * 100 + '%'); };
    r.addEventListener('input', () => { gkSet(k, +r.value); sy(); });
    sy(); C.rgSl.push(sy);
    return h('div', { class: 'kc-rng gk-rng' }, h('span', null, lab), r, o);
  };
  C.rgSl = [];
  const pct = (v) => Math.round(v * 100) + ' %';
  C.rgPs = kcSwitch('Puls sät mit', GK.p.rgP, set('rgP'), { aria: 'Puls sät mit: auch die Töne der Puls-Spuren hinterlassen Keime', key: it.key + ':rgp' });
  C.rgTxt = h('p', { class: 'note' }); C.rgQTxt = h('p', { class: 'note' }); C.rgSum = h('span', { class: 'gk-sum' });
  C.rgNRow = sl('rgN', 'Sporen', 8, 16, 1, (v) => String(GK.p.rgArt === 'harfe' ? Math.max(2, Math.round(v / 4)) : v), 'Wie viele Sporen rollen');
  return h('details', { class: 'kc-more gk-anl gk-rg', open: KC.open.gkr || null, ontoggle: (e) => { kcKeep('gkr', e.target.open); gkCardSync(); } }, h('summary', null, 'Sporenregen einstellen', C.rgSum),
    row('Art', C.rgArt), C.rgTxt, C.rgS, row('Raster', C.rgQ), C.rgQTxt,
    C.rgNRow, sl('rgZ', 'Zähigkeit', 0, 1, 0.05, pct, 'Zähigkeit: wie träge die Sporen rollen'), sl('rgO', 'Ordnung', 0, 1, 0.05, pct, 'Ordnung: wie streng Rinnen die Sporen an deinen Keimen entlangführen'),
    h('p', { class: 'note' }, 'Zähigkeit: von Eis (schnell, rollt lange nach) bis Honig (langsam, gleichmäßig). Ordnung: Rinnen führen die Sporen an deinen Keimen entlang – wenig Ordnung lässt sie streuen.'),
    row('Keime bleiben', C.rgK), h('div', { class: 'kc-opts' }, C.rgPs),
    h('p', { class: 'note' }, 'Gehaltene Töne bleiben Keime, solange sie klingen; gespielte so viele Takte. Schütteln (Ladung) streut neue Sporen ein, Umdrehen (Schlafen) lässt sie versickern, das Haltepedal hält die Neigung fest – leg das Handy ab, es regnet weiter wie eben. Ohne Sensor ziehst du die Spore in der Wasserwaage. Der Regen klingt über seinen eigenen Kanal „Regen“ im Mixer und kommt mit in jede Aufnahme.'));
}
function rgCardSync(C) {
  const p = GK.p, tx = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  C.rg.hidden = p.neigen !== 'regen';
  if (C.rg.hidden) return;
  C.rgArt.sync(); C.rgS.sync(); C.rgQ.sync(); C.rgK.sync();
  for (const f of C.rgSl) f();
  if (C.rgPs.getAttribute('aria-checked') !== String(p.rgP)) C.rgPs.setAttribute('aria-checked', String(p.rgP));
  tx(C.rgTxt, p.rgArt === 'harfe' ? 'Harfe: ein Viertel der Sporen; jede Spalte, die eine kreuzt, klingt – ein Glissando durch die Skala, ganz ohne Keime.' : 'Keime: deine Töne werden Gelände – die Sporen spielen sie, wenn sie darüberrollen. Halte einen Akkord und neige: er arpeggiert in die Richtung, in die du dich lehnst.');
  const d = rgDiv(), bpm = Math.round(SEQ.on ? SEQ.bpm : seqBpm()), g = d === 0.25 ? '1/16' : d === 0.5 ? '1/8' : d ? '1/8T' : '';
  tx(C.rgQTxt, d ? 'Treffer warten gedimmt und ploppen genau auf die nächste ' + g + ' des Pulses' + (p.rgQ === 'auto' ? ' (Auto: bis 100 BPM 1/16, darüber 1/8; jetzt ' + bpm + ' BPM).' : '.') : 'Frei: jeder Treffer klingt, sobald die Spore den Keim erreicht – ohne Raster.');
  tx(C.rgSum, ' · ' + (p.rgArt === 'harfe' ? 'Harfe' : 'Keime') + ' · ' + rgName() + ' · ' + (g || 'frei') + (RG.on && p.rgArt !== 'harfe' ? ' · ' + RG.k.length + (RG.k.length === 1 ? ' Keim' : ' Keime') : ''));
}
// every frame while the panel shows (at most 30 times a second): the spore, the bars, the lamps. The Wasserwaage: the
// ring is the Weite (ticks like a spirit level), the faint inner circle the Ruhezone; while Gestik acts a hypha runs
// from the middle to the spore; Ladung warms the ground amber; the Fährte's ghost spore shows the lean its loop plays
function gkCardFrame(C, ts) {
  if (ts - C.t < 33) return;
  C.t = ts;
  if (ts - C.st > 250) { C.st = ts; gkStatus(); }
  const c = C.ctx, w = C.w, R = w / 2 - 8, cx = w / 2, cy = w / 2, st = GK.R && GK.R.st, W = GK.p.weite;
  const act = GK.mode.startsWith('live'), hold = GK.mode === 'hold', lad = clamp(LAD.lvl || 0, 0, 1);
  c.clearRect(0, 0, w, w);
  if (lad > 0.01) {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255,179,92,' + (0.26 * lad).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,179,92,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  }
  c.lineWidth = 1.5; c.strokeStyle = act ? 'rgba(255,179,92,.42)' : hold ? 'rgba(134,240,208,.42)' : 'rgba(240,230,216,.2)';
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a); c.moveTo(cx + ca * (R + 2), cy + sa * (R + 2)); c.lineTo(cx + ca * (R + 6), cy + sa * (R + 6)); }
  c.strokeStyle = 'rgba(240,230,216,.3)'; c.lineWidth = 1.2; c.stroke();
  c.lineWidth = 1; c.strokeStyle = 'rgba(240,230,216,0.16)';
  c.beginPath(); c.arc(cx, cy, Math.max(3, (R * (GK.R ? GK.R.opts.dz : 4)) / W), 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.strokeStyle = 'rgba(240,230,216,0.06)'; c.stroke();
  const virt = !!GK.virt && (GK.drag || !GK.live);
  let x = 0, y = 0;
  if (virt) { x = GK.virt.x; y = GK.virt.y; }
  else if (GK.live && st) { x = st.roll / W; y = -st.pitch / W; }
  const m = Math.hypot(x, y); if (m > 1.12) { x *= 1.12 / m; y *= 1.12 / m; }
  const px = cx + x * R, py = cy - y * R, rest = GK.ev.ruhe || GK.ev.wenden || SLP.on;
  const col = hold ? COL.lumen : act ? COL.spore : COL.dim, rr = act || hold ? 9 : 6;
  if ((act || hold) && !rest && Math.hypot(px - cx, py - cy) > 4) {   // the hypha: a slight bend, like a thread that grew
    const mx = (cx + px) / 2 - (py - cy) * 0.14, my = (cy + py) / 2 + (px - cx) * 0.14;
    c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my, px, py); c.stroke();
    c.globalAlpha = 1;
  }
  const g = c.createRadialGradient(px, py, 0, px, py, rr * 2.4);
  g.addColorStop(0, col); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = rest ? 0.35 : 1;
  c.fillStyle = g; c.beginPath(); c.arc(px, py, rr * 2.4, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  const HL = hxBewDisp(), L = HL && HL.bew;
  if (L && L.disp && A.ctx) {   // the ghost spore of a Schleife of Bewegung (the Fährte's): the lean it plays now
    const s = Math.floor(faeB(A.ctx.currentTime) * FA_R), p = faeMod(s - hxBewA(HL), L.n), g = clamp(hxBewGain(HL, s / FA_R), 0, 1);
    let gx = (L.disp.tx ? L.disp.tx[p] : 0) * g, gy = (L.disp.ty ? L.disp.ty[p] : 0) * g;
    const gm = Math.hypot(gx, gy); if (gm > 1.12) { gx *= 1.12 / gm; gy *= 1.12 / gm; }
    c.globalAlpha = 0.25 + 0.5 * g; c.strokeStyle = COL.lumen; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx + gx * R, cy - gy * R, 7, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
  // a new zero: a ring flashes from the middle (still, with reduced motion)
  if (C.flash && ts - C.flash < 500) { c.strokeStyle = COL.lumen; c.globalAlpha = 1 - (ts - C.flash) / 500; c.beginPath(); c.arc(cx, cy, REDUCED ? 12 : 6 + (ts - C.flash) / 12, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  // the bars show what acts (after the clutch); Ladung fills from the left
  for (let i = 0; i < 5; i++) {
    const v = GK.out[GK_AX[i]], b = C.ax[i].bar, l = i < 4 ? 50 + Math.min(0, v) * 50 : 0, wd = i < 4 ? Math.abs(v) * 50 : v * 100, k = Math.round(l) + ':' + Math.round(wd);
    if (b.k !== k) { b.k = k; b.style.setProperty('--l', l + '%'); b.style.setProperty('--w', wd + '%'); }
  }
  for (let i = 0; i < 3; i++) { const on = !!GK.ev[GK_EV[i]]; if (C.ev[i].on !== on) { C.ev[i].on = on; C.ev[i].classList.toggle('on', on); } }
}
// Android: fullscreen, then the current orientation locked (only possible in fullscreen); elsewhere the system's lock
async function gkLock() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen());
    await screen.orientation.lock(screen.orientation.type);
    toast('Vollbild: Die Ansicht dreht sich nicht mehr mit. Zurück mit der Zurück-Geste.', 4000);
  } catch (e) { toast('Die Ausrichtung lässt sich hier nicht sperren – schalte die Drehsperre des Geräts ein.', 5000); }
}
// the Bluetooth lines: state, connection interval, smoothing delay, last error; the pairing hint stays while links keep
// ending within seconds, until one lasts
function kcBleLines() {
  for (const C of KC.cards.values()) {
    const B = C.it.B;
    if (!B || !C.line) continue;
    const t = bleLine(B), w = B.state === 'err' || (B.short >= 2 && !(B.state === 'on' && performance.now() - B.linkT > 10000)) ? B.why : '';
    if (C.line.textContent !== t) C.line.textContent = t;
    if (C.warn.textContent !== w) C.warn.textContent = w;
    const d = (B.links === 1 ? '1 Verbindung' : B.links + ' Verbindungen') + ' · ' + B.pk + (B.pk === 1 ? ' Paket' : ' Pakete') + (B.ci ? ' · Intervall ≈ ' + dec(B.ci.toFixed(B.ci < 10 ? 1 : 0)) + ' ms' : '') +
      ' · Timing ' + (P['midi.ble'] === 'even' ? 'gleichmäßig, Ausgleich ' + Math.round(B.J) + ' ms' : 'direkt') + (B.txDrop ? ' · ' + B.txDrop + ' Sendungen verworfen' : '') + (B.raw ? ' · Browser: ' + B.raw : '');
    if (C.diag.textContent !== d) C.diag.textContent = d;
  }
}
function bleLine(B) {
  const s = B.src, now = performance.now();
  let t = B.state === 'connecting' ? 'verbindet …' : B.state === 'on' ? 'verbunden'
    : B.state === 'wait' ? 'getrennt – neuer Versuch ' + (B.nextT > now ? 'in ' + Math.ceil((B.nextT - now) / 1000) + ' s' : 'läuft') : 'nicht verbunden';
  if (B.state === 'on' && s) {
    if (s.dup) t += ' – spielt über den MIDI-Port „' + s.twinName + '“ (dasselbe Keyboard)';
    else if (!s.enabled) t += ' – ausgeschaltet';
    B.ci = bleCI(B);   // shown under "Diagnose", with the smoothing delay
    if (B.C.frozen >= 3) t += ' · Gerät sendet keine Zeitstempel';
  }
  if (B.err) t += ' · zuletzt: ' + B.err;
  return t;
}
// what a message is, in words: "Taste C4 · 100", "CC 21 = 64", "Tonhöhenrad +2048"
const kcNote = (n) => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
function kcEvText(ev) {
  switch (ev.type) {
    case 'axis': return GK_AXN[ev.num] + ' ' + dec((ev.num < 4 ? ev.val * 2 - 1 : ev.val).toFixed(2));
    case 'gon': return GK_EVN[ev.num];
    case 'goff': return GK_EVN[ev.num] + ' vorbei';
    case 'on': return 'Taste ' + kcNote(ev.num) + ' · ' + ev.val;
    case 'off': return 'Taste ' + kcNote(ev.num) + ' los';
    case 'cc': return 'CC ' + ev.num + ' = ' + ev.val;
    case 'pc': return 'Programm ' + (ev.num + 1);
    case 'bend': { const v = ev.val - 8192; return 'Tonhöhenrad ' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v); }
    case 'press': return 'Druck ' + ev.val;
    case 'poly': return 'Druck ' + kcNote(ev.num) + ' = ' + ev.val;
    case 'start': return 'Start';
    case 'cont': return 'Weiter';
    case 'stop': return 'Stopp';
    case 'spp': return 'Songposition ' + ev.val;
  }
  return 'System ' + Number(ev.num).toString(16).toUpperCase();
}
// and what it does here – a binding, or the instrument's own handling; '' for nothing
function kcWhat(src, ev) {
  const k = KIND[ev.type];
  if (k) {
    const M = mapOf(src), num = k === 'bend' || k === 'press' ? -1 : ev.num, e1 = M.get(k + ':' + ev.ch + ':' + num), e2 = M.get(k + ':*:' + num);
    const l = e1 || e2 ? mapLayer(e1, e2, 'u') || mapLayer(e1, e2, 'p') : null;
    if (l && !(ev.type === 'off' && MIDI.notes.has(midiId(src, ev.ch, ev.num)))) {
      const T = l[0].target != null && mtOf(l[0].target);
      if (ev.type === 'off' && T && l[0].mode !== 'momentary' && !(l[0].mode === 'abs' && T.cont)) return '';   // a pad let go: nothing
      return T ? tName(T) : 'nichts (abgeschaltet)';
    }
    if (k === 'cc' && src.prof && src.prof.own && profOn(src)) return '';
    if (k === 'axis' || k === 'gest') return '';   // Gestik does nothing by itself
  }
  const mem = ev.ch >= 0 && chRole(chState(src, ev.ch)).mem;
  switch (ev.type) {
    case 'on': return 'Ton auf der Spielfläche';
    case 'cc': {
      const n = ev.num;
      if (n === 1) return 'Klangfarbe heller';
      if (n === 2) return 'Klangfarbe dunkler';
      if (n === 64) return 'Haltepedal';
      if (n === 66) return 'Sostenuto-Pedal';
      if (n === 67) return 'Leisepedal';
      if (n === 120 || n === 123 || n >= 124) return 'alle Töne aus';
      if (n === 121) return 'Regler zurückgesetzt';
      if (n === 0 || n === 32) return 'Bank für den Programmwechsel';
      if (n === 6 || n === 38 || (n >= 96 && n <= 101)) return 'RPN/NRPN';
      if (n === 74 && mem) return 'Klangfarbe dieses Tons (MPE)';
      const b = P['midi.std'] && STD[n], T = b && mtOf(b.target);
      return T ? tName(T) + ' (Standard)' : '';
    }
    case 'pc': return P['midi.pc'] ? 'Preset laden' : '';
    case 'bend': return mem ? 'Tonhöhe dieses Tons (MPE)' : 'Tonhöhe';
    case 'press': return mem ? 'Klangfarbe dieses Tons (MPE)' : 'Klangfarbe heller (Druck)';
    case 'poly': return mem ? '' : 'Klangfarbe dieses Tons (Druck)';
    case 'start': case 'cont': case 'stop': return P['midi.transport'] ? 'Puls' : '';
    case 'spp': return P['midi.transport'] ? 'Puls-Position' : '';
  }
  return '';
}
// a card's last line: the binding that acted ("Regler 3 · CC 22 → Echo · Anteil 64 %"), else the message itself
function kcLastText(s) {
  if (!s || !s.last) return '';
  const L = s.lastMap;
  if (L && L.ev === s.last) return mapLine(s);
  const w = kcWhat(s, s.last);
  return kcEvText(s.last) + (s.last.ch >= 0 ? ' · Kanal ' + (s.last.ch + 1) : '') + (w ? ' → ' + w : '');
}
// every frame while the panel is open: the activity lights; ten times a second: the last lines, the bindings' lights,
// bindings learned meanwhile, the monitor
function devFrame(dt, ts) {
  if (!devEls) return;
  const now = performance.now();
  for (const C of KC.cards.values()) {
    const s = C.it.B ? C.it.B.src : C.it.src, act = !!s && s.enabled && !s.dup && now - (s.act || -1e9) < 140;
    if (act !== C.lit) { C.lit = act; C.led.classList.toggle('on', act); }
    const ok = C.it.B ? C.it.B.state === 'on' && !!s : !!s && s.enabled && !s.dup && (s.kind !== 'motion' || GK.live || !!GK.virt), err = !!C.it.B && C.it.B.state === 'err';
    if (ok !== C.ok) { C.ok = ok; C.led.classList.toggle('ok', ok); }
    if (err !== C.err) { C.err = err; C.led.classList.toggle('err', err); }
    if (C.gk) gkCardFrame(C, ts);
  }
  if (ts - KC.liveT < 100) return;
  KC.liveT = ts;
  for (const C of KC.cards.values()) {
    if (!C.last) continue;
    const s = C.it.B ? C.it.B.src : C.it.src, t = kcLastText(s) || 'Noch nichts empfangen – spiel eine Taste oder bewege einen Regler.';
    if (C.lastT && s && s.last && s.last.type === 'off' && !(s.lastMap && s.lastMap.ev === s.last)) continue;   // a key let go: its strike says more
    if (t !== C.lastT) { C.lastT = t; C.last.textContent = t; C.last.classList.toggle('idle', !s || !s.last); }
  }
  for (const R of KC.rows) {
    const st = R.s && mapState(R.s, R.b), on = !!st && now - st.at < 160;
    if (on !== R.lit) { R.lit = on; R.led.classList.toggle('on', on); }
  }
  if (KC.bmv !== MAP.v && !KC.ed && !devEls.mapSec.hidden) kcBindsUI();
  if (KCM.dirty) kcMonUI();
}

