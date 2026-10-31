/* ---------- Gerät: keyboards and controllers, quality, latency ---------- */
let devEls = null;
const ICON_USB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5v4M14.5 2.5v4"/><path d="M7 6.5h10v4.5a5 5 0 0 1-10 0z"/><path d="M12 16v5.5"/></svg>';
const ICON_BT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 7.5l11 9-5.5 4.5V3l5.5 4.5-11 9"/></svg>';
const ICON_LEARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="6.5"/><path d="M12 14l3.2-3.2"/><path d="M12 2.5v2.2M3.8 6.3l1.6 1.5M20.2 6.3l-1.6 1.5"/></svg>';
const ICON_TUNE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>';
const ICON_GK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.2" y="3.2" width="7.6" height="14.6" rx="1.8" transform="rotate(16 12 10.5)"/><path d="M3.6 8.8a9.5 9.5 0 0 0 1.6 7.4M20.4 6.4a9.5 9.5 0 0 1-.4 7.6"/><circle cx="12" cy="20.6" r="1" fill="currentColor"/></svg>';
const ICON_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5.5l6.5 6.5L9 18.5"/></svg>';
// the panel's keyboard part: cards (one per device, by key), binding rows (for their lights), the open binding editor,
// which foldable parts are open (remembered on this device) – and the monitor
const KC = { cards: new Map(), sig: '', bsig: '', bmv: -1, rows: [], ed: null, liveT: 0, mx: null, open: (() => { try { const o = JSON.parse(store.get('myzel.kcui.v1') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } })() };
// the monitor: list (newest first, ≤ 30), n (records so far: each gets a number), shown (the newest one on screen), uiT
const KCM = { on: false, hold: false, list: [], t0: 0, dirty: false, n: 0, shown: 0, uiT: 0, vis: true };
const kcKeep = (k, v) => { KC.open[k] = v; store.set('myzel.kcui.v1', JSON.stringify(KC.open)); };
// nothing to connect here: the claude.ai viewer, or a browser with neither Web MIDI nor Web Bluetooth (iPhone Safari)
const kcNoMidi = () => inViewer || (!navigator.requestMIDIAccess && !navigator.bluetooth);
// … and no Gestik either: then there is nothing to assign (an iPad has Gestik, so it gets the Zuordnungen)
const kcNone = () => kcNoMidi() && !gkExists();
// a big tile: icon, what it does, below it how (the second line is CSS, so the button's text stays its name)
function kcTile(label, sub, icon, onclick, attrs) {
  const t = h('span', null, label);
  const b = h('button', Object.assign({ type: 'button', class: 'kc-go', 'data-sub': sub, onclick }, attrs), t);
  b.insertAdjacentHTML('afterbegin', icon);
  b.lab = t;
  return b;
}
// a switch like the app's, for things that are not parameters (a port on, its profile, clock out); bare: only the knob
function kcSwitch(label, on, fn, o = {}) {
  const b = h('button', { type: 'button', class: 'sw' + (o.cls ? ' ' + o.cls : ''), role: 'switch', 'aria-checked': String(!!on), 'aria-label': o.aria || label, title: o.title, 'data-kc': o.key },
    o.bare ? null : h('span', { class: 'lab' }, label), h('span', { class: 'knob', 'aria-hidden': 'true' }));
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); fn(v); });
  return b;
}
// a section whose header opens and closes it; sub (right) summarises what is set while it is closed
function foldSec(key, title, kids, onToggle) {
  const id = 'kc-' + key, body = h('div', { class: 'fold-body', id, hidden: !KC.open[key] }, ...kids);
  const btn = h('button', { type: 'button', class: 'fold-b', 'aria-expanded': String(!!KC.open[key]), 'aria-controls': id, html: ICON_CHEV + '<span>' + title + '</span>' });
  const sub = h('p');
  const sec = h('div', { class: 'sec fold' }, h('div', { class: 'sec-h' }, h('h3', null, btn), sub), body);
  btn.addEventListener('click', () => {
    const on = body.hidden;
    body.hidden = !on; btn.setAttribute('aria-expanded', String(on)); kcKeep(key, on);
    if (onToggle) onToggle(on);
    updDevUI();
  });
  sec.sub = sub; sec.body = body;
  return sec;
}
// a button that asks once more before it acts ("Wirklich?" for three seconds), like deleting a preset
function kcSure(label, fn, cls = 'btn ghost') {
  const b = h('button', { type: 'button', class: cls }, label);
  b.addEventListener('click', () => {
    if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = 'Wirklich?'; setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = label; } }, 3000); return; }
    fn();
  });
  return b;
}
function buildDev() {
  const box = h('div');
  // keyboards first: connecting one is what most visits here are for – and phones ask for MIDI only from here
  box.append(...kcBuild());
  const qInfo = h('p', { class: 'note' }), qLive = h('p', { class: 'note live' });
  box.append(section('Qualität', 'Wie viele und wie reiche Stimmen gleichzeitig', grid(ctl('dev.q', { label: 'Stufe' })), qInfo, qLive));
  const latInfo = h('p', { class: 'note' });
  const latBtn = h('button', { type: 'button', class: 'btn primary', hidden: true, onclick: restartAudio }, 'Klang neu starten');
  const latAutoB = h('button', { type: 'button', class: 'btn ghost', id: 'latAuto', hidden: true, onclick: latAutoAgain }, 'Wieder automatisch');
  box.append(section('Latenz', 'Zeit vom Anschlag bis zum Ton', grid(ctl('dev.lat', { label: 'Ausgabe' })), latInfo, h('div', { class: 'row' }, latBtn, latAutoB)));
  box.append(section('Hintergrund und Akku', 'Wenn Myzel nicht zu sehen ist – und wie sparsam es mit dem Akku umgeht', grid(ctl('dev.bg'), ctl('dev.akku')),
    h('p', { class: 'note' }, 'Im Hintergrund weiterspielen – an: laufen Puls, Schleifen, Bordun, Freeze oder eine Aufnahme, spielt Myzel weiter, wenn du die App wechselst oder den Bildschirm sperrst. Aus: Myzel verstummt, sobald es nicht zu sehen ist oder beendet wird, und spielt weiter, wenn du zurückkommst. Auf iPad und Handy ist es anfangs aus.'),
    h('p', { class: 'note' }, 'Akku schonen – der Klang bleibt genau gleich. Die Spielfläche zeichnet ruhiger (30 statt 60 Bilder in der Sekunde), solange du sie nicht berührst oder spielst; der Bildschirm bleibt nur wach, solange etwas klingt oder du in den letzten drei Minuten etwas getan hast. Auf dem iPad anfangs an.')));
  box.append(lmBuild());   // Leistung: the Handy-Modus and „Leistung messen“ (ui/leistung.js)
  box.append(section('Computertastatur', null, h('p', { class: 'note' }, 'Ohne Keyboard spielen die Tasten A bis Ö (Grundreihe) die ersten Töne der Spielfläche, mit Umschalt weiter oben.')));
  Object.assign(devEls, { qInfo, qLive, latInfo, latBtn, latAuto: latAutoB });
  updDevUI();
  return box;
}
// Keyboard & Controller: connect (USB / the system's MIDI, Bluetooth straight from the page), the devices, their
// bindings, how keys and controls play, and a monitor of what arrives
function kcBuild() {
  const E = devEls = {};
  E.midiStatus = h('p', { class: 'note kc-status' });   // no live region: the toasts announce devices coming and going
  E.midiBtn = kcTile('MIDI-Keyboard verbinden', 'USB-Kabel – oder übers System verbunden', ICON_USB, () => midiInit(true), { 'data-midi': 'ask' });
  // Bluetooth: the chooser opens inside the tap; "all devices" for keyboards the filtered list misses
  E.bleAgain = kcTile('Wieder verbinden', 'Das Keyboard vom letzten Mal', ICON_BT, bleAgainTap, { 'data-ble': 'again', hidden: true });
  E.bleBtn = kcTile('Bluetooth-Keyboard koppeln', 'Direkt im Browser, ohne App', ICON_BT, () => bleAsk(false), { 'data-ble': 'ask', hidden: true });
  // Gestik: the permission is asked inside this tap
  E.gkBtn = kcTile('Gestik einschalten', 'Neigen, schütteln, umdrehen', ICON_GK, () => gkEnable(true), { 'data-gk': 'on' });
  E.midiScanBtn = h('button', { type: 'button', class: 'btn ghost', hidden: true, onclick: midiRescan }, 'Neu suchen');
  E.bleAll = h('button', { type: 'button', class: 'btn ghost', hidden: true, 'data-ble': 'all', onclick: () => bleAsk(true), title: 'Für Keyboards, die in der Bluetooth-Liste fehlen' }, 'Alle Bluetooth-Geräte zeigen');
  E.platLead = h('p', { class: 'note' }); E.platSteps = h('ul', { class: 'help' });
  E.platHelp = h('details', { class: 'plat' }, h('summary', null, 'Hilfe zum Verbinden'), E.platSteps);
  E.devs = h('div', { class: 'kc-devs' });
  E.bleTim = h('div', { class: 'grid', hidden: true }, ctl('midi.ble'),
    h('p', { class: 'note wide' }, 'Direkt: jeder Ton, sobald er ankommt. Gleichmäßig: hält die Abstände der Töne, wie gespielt – Bluetooth bündelt sie sonst alle 7,5 bis 50 ms. Dafür kommen sie etwas später (siehe „Diagnose“).'));
  E.goRow = h('div', { class: 'kc-go-row' }, E.bleAgain, E.midiBtn, E.bleBtn, E.gkBtn); E.tools = h('div', { class: 'kc-tools' }, E.midiScanBtn, E.bleAll);
  E.bleWhy = h('p', { class: 'note warn kc-why', hidden: true });
  // the app's address, for the platforms that must open it elsewhere: a link, and a button that copies it
  const url = 'https://' + APP_URL + '/', copy = h('button', { type: 'button', class: 'btn ghost', onclick: () => {
    const ok = () => toast('Adresse kopiert: ' + APP_URL, 3000), no = () => toast('Kopieren ging nicht – die Adresse: ' + APP_URL, 6000);
    try { navigator.clipboard.writeText(url).then(ok, no); } catch (e) { no(); }
  } }, 'Adresse kopieren');
  E.appRow = h('div', { class: 'row kc-app', hidden: true }, h('a', { href: url, target: '_blank', rel: 'noopener' }, APP_URL), copy);
  E.midiSec = section('Keyboard & Controller', 'USB, Bluetooth, Gestik', E.midiStatus, E.goRow, E.bleWhy, E.tools, E.appRow, E.devs, E.bleTim, E.platLead, E.platHelp);
  // Zuordnungen: "Zuweisen" (learn), every binding of every connected device, a file of them
  E.learnBtn = h('button', { type: 'button', class: 'btn primary kc-learn', 'aria-pressed': 'false', onclick: learnBtn }, 'Zuweisen');
  E.learnBtn.insertAdjacentHTML('afterbegin', ICON_LEARN);
  E.binds = h('div', { class: 'kc-binds' });
  const file = h('input', { type: 'file', id: 'kcMapFile', accept: '.json,application/json', hidden: true });
  file.addEventListener('change', () => kcImport(file));
  E.mapSec = section('Zuordnungen', 'Regler, Fader, Pads und Tasten', h('div', { class: 'kc-learn-row' }, E.learnBtn,
    h('p', { class: 'note' }, 'Bewege am Gerät einen Regler, dann tippe auf das Ziel – in jedem Bereich, auch im Mixer. Oder umgekehrt.')), E.binds,
    h('div', { class: 'row', style: 'margin:12px 0 6px' }, h('button', { type: 'button', class: 'btn ghost', onclick: kcExport }, 'Zuordnungen exportieren'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => file.click() }, 'Importieren'), file));
  // how keys, wheels and pedals play – the device settings, grouped
  const sub = (t) => h('h4', { class: 'kc-sub' }, t);
  E.setSec = foldSec('set', 'Spielweise am Keyboard', [
    sub('tasten & räder'), grid(ctl('midi.map'), ctl('midi.y', { wide: MOBILE }), ctl('midi.bend', { wide: MOBILE })),
    sub('dynamik'), grid(ctl('midi.vel'), ctl('midi.curve'), ctl('midi.fix')),
    sub('zeit'), grid(ctl('midi.zeit')), h('p', { class: 'note' }, 'Gleichmäßig: jede Note beginnt in festem Abstand zu ihrem Tastendruck (ein Ausgabepuffer plus 5 ms) – sample-genau, auch wenn der Rechner gerade zu tun hat; die Latenz schwankt nicht mehr. Sofort: so früh wie möglich, dafür je nach Moment bis zu einem Puffer und einer Rechnerpause später – die Latenz schwankt. Der Klang ist gleich.'),
    sub('ausdruck'), grid(ctl('midi.mpe'), h('p', { class: 'note wide' }, 'Für MPE-Controller (Seaboard, LinnStrument, Osmose …): jeder Ton biegt, drückt und färbt sich für sich. Auto schaltet ein, sobald das Gerät seine MPE-Zone meldet.')),
    sub('steuerung'), grid(ctl('midi.pc'), ctl('midi.transport'), ctl('midi.clock'), ctl('midi.pads'), ctl('midi.std')),
    h('details', { class: 'kc-more' }, h('summary', null, 'Was die Einstellungen bewirken'), h('ul', { class: 'help', style: 'margin-bottom:8px' },
      h('li', null, h('b', null, 'Skala: '), 'jede Taste rastet auf den nächsten Ton der Skala ein – die Tonhöhe bleibt, wo die Taste ist.'),
      h('li', null, h('b', null, 'Weiße Tasten: '), 'ab dem C der Grundoktave ist jede weiße Taste die nächste Spalte der Spielfläche.'),
      h('li', null, h('b', null, 'Chromatisch: '), 'jede Taste ihr eigener Ton, in der eingestellten Stimmung.'),
      h('li', null, h('b', null, 'Anschlag: '), 'wie die Stärke des Tastendrucks zur Lautstärke wird – Weich hebt leise Töne, Hart verlangt festen Druck, Fest spielt jeden Ton gleich laut.'),
      h('li', null, h('b', null, 'Modulationsrad und Druck '), 'machen die Klangfarbe heller, wie ein Finger weiter oben auf der Spielfläche – die Tonhöhe bleibt; CC 2 und das Leisepedal machen sie dunkler. Fester Anschlag färbt etwas heller.'),
      h('li', null, h('b', null, 'Tonhöhenrad und Haltepedal '), 'wirken auf die gespielten Töne, nicht auf Puls und Bordun.'),
      h('li', null, h('b', null, 'Programmwechsel: '), 'Programm 5 lädt das 5. Preset; in Bank 2 (Bank Select 1) die eigenen.'),
      h('li', null, h('b', null, 'Start/Stop und MIDI-Clock: '), 'ein Gerät mit Transport oder Sequenzer startet den Puls und gibt ihm sein Tempo.'),
      h('li', null, h('b', null, 'Pads als Auslöser: '), 'Pads schlagen Spur 1–4 an und schalten Puls, Bordun, Freeze und Stille, statt Töne zu spielen. Pads auf Kanal 10 sind das immer.'),
      h('li', null, h('b', null, 'Standard-Zuordnungen: '), 'übliche Regler ohne eigenes Profil – CC 7 Pegel, 10 Balance, 11 Ausdruck, 71 Resonanz, 74 Filter, 91 Hall, 93 Schweben, 95 Phaser, 5 Gleiten.')))]);
  // the monitor records while it is open
  E.monList = h('ol', { class: 'kc-mon', 'aria-label': 'Letzte MIDI-Nachrichten' });
  E.monClk = h('p', { class: 'kc-clk', hidden: true });
  E.monHold = h('button', { type: 'button', class: 'btn ghost', 'aria-pressed': 'false', onclick: () => { KCM.hold = !KCM.hold; E.monHold.setAttribute('aria-pressed', String(KCM.hold)); E.monHold.textContent = KCM.hold ? 'Weiter' : 'Anhalten'; } }, 'Anhalten');
  E.monSec = foldSec('mon', 'MIDI-Monitor', [h('p', { class: 'note' }, 'Die letzten 30 Nachrichten deiner Geräte und was sie in Myzel bewirken – zum Prüfen, was ein Regler oder Pad wirklich sendet.'),
    h('div', { class: 'row' }, E.monHold, h('button', { type: 'button', class: 'btn ghost', onclick: () => { KCM.list = []; KCM.dirty = true; KCM.uiT = 0; kcMonUI(); } }, 'Leeren')), E.monClk, E.monList], kcMonOn);
  // nothing is drawn while the list is scrolled out of sight
  if (window.IntersectionObserver) new IntersectionObserver((l) => { KCM.vis = l[l.length - 1].isIntersecting; if (KCM.vis) KCM.dirty = true; }).observe(E.monList);
  if (KC.open.mon) kcMonOn(true);
  for (const el of [E.midiSec, E.mapSec, E.setSec, E.monSec]) el.classList.add('kc-sec');
  return [E.midiSec, E.mapSec, E.setSec, E.monSec];   // (the Fährte's section is gone: its Feinregler and „Hinlegen“ are in the Hexenring's card)
}
const msTxt = (sec) => dec((sec * 1000).toFixed(sec < 0.0095 ? 1 : 0)) + ' ms';
function graphLatency() {
  // the oversampled drive is the only part of the playing path with a delay (measured in Chromium: 2x 128, 4x 192 frames)
  // (29.10.2026) and the sum's Begrenzer: 2.1 ms ahead of its peaks
  const lim = A.lim ? A.limLat || 0 : 0;
  if (!A.drvShaper) return lim;
  return lim + (A.drvShaper.oversample === '4x' ? 192 / SR : A.drvShaper.oversample === '2x' ? 128 / SR : 0);
}
function updDevUI() {
  const nm = $('#midiDot');
  if (nm) nm.classList.toggle('conn', MIDI.ports.size > 0);
  if (!A.started) startKeysLine();   // the start screen's button and line
  kcLearnSync();
  if (!devEls || !devEls.qInfo) return;
  // (31.10.2026) what each level is, and – from the same measure – how many Nebel voices each holds on this device, side by
  // side (the level chosen with the guard's lowering, if any): a richer level never gets less of the core
  const lv = P['dev.q'], B = qBudgets(), sc = A.budgetScale || 1;
  const nOf = (q) => Math.floor(Math.max(6, Math.round(B[q] * (q === lv ? sc : 1))) / QP[q].cost.neb);
  const what = lv === '1'
    ? 'Leicht: einfache Stimmen, sparsam – für schwache Geräte und Handys.'
    : lv === '2'
      ? 'Voll: der Klang wie in der ersten Fassung, mit mehr Stimmen gleichzeitig als „Leicht“.'
      : 'Gewaltig: jede Stimme wird reicher – sieben statt drei Oszillatoren im Nebel, Doppelsaiten, zwei Glocken pro Anschlag, mehr Teiltöne und Trommelmoden, doppelt so dichte Körnerwolken und Hall in echtem Stereo. Eine reichere Stimme braucht etwa doppelt so viel Rechenzeit – darum passen in dieselbe Rechenzeit weniger Stimmen.';
  const cnt = (CAL.running ? 'Myzel misst gerade, wie viel dieses Gerät schafft … ' : '') + (CAL.unit ? 'Gemessen auf diesem Gerät' : 'Noch nicht gemessen (das geschieht beim Klangstart), vorläufig') +
    ' – Nebel-Stimmen gleichzeitig: Stufe 1 bis ' + nOf('1') + ' · Stufe 2 bis ' + nOf('2') + ' · Stufe 3 bis ' + nOf('3') + '.' +
    (lv === '3' ? ' Der Browser rechnet allen Klang auf einem Prozessorkern – Stufe 3 nutzt, was er hergibt' + (MOBILE ? '; auf Handys kann es knacken.' : '.') : '');
  devEls.qInfo.textContent = what + ' ' + cnt;
  updDevLive();
  updLatText();
  lmUI();
  kcUI();
}
// the keyboard part: status, which buttons, the platform's help, cards, bindings, what the folded parts hold
function kcUI() {
  const E = devEls;
  midiLate();
  const names = [...MIDI.ports.values()];
  const st = MIDI.state, bt = bleOk(), help = midiHelp(), plat = midiPlat();
  // Android: a Bluetooth keyboard never needs Web MIDI (Android's MIDI lists none), so with nothing playing yet it is
  // the first choice – whether MIDI was asked for, refused or found nothing; elsewhere when Web MIDI cannot help
  const droid = ANDROID && bt && !names.length && st !== 'unsupported';
  // a Bluetooth keyboard plays whatever Web MIDI's state is
  const status = st !== 'ready' && names.length ? 'Verbunden: ' + names.join(', ') + '. Einfach losspielen.' + (st === 'idle' && navigator.requestMIDIAccess ? ' USB-Keyboards: „MIDI-Keyboard verbinden“.' : st === 'blocked' && !inViewer ? ' Der MIDI-Zugriff für USB-Keyboards ist blockiert (Website-Einstellungen).' : '')
    : st === 'unsupported' ? (bt ? 'Dieser Browser kann kein Web-MIDI – ein Bluetooth-Keyboard verbindest du direkt mit „Bluetooth-Keyboard koppeln“.'
      : /^(ios|ioswrap|viewer|webview|ffandroid)$/.test(plat) ? help.lead : 'Dieser Browser kann kein Web-MIDI. Nutze Chrome oder Edge.')
      : st === 'asking' ? 'Warte auf die Erlaubnis des Browsers …'
        : st === 'blocked' ? (inViewer ? 'In der claude.ai-Ansicht ist MIDI gesperrt. In der App geht es: ' + APP_URL
          : droid ? 'MIDI für USB-Keyboards ist blockiert – Bluetooth-Keyboards gehen trotzdem mit „Bluetooth-Keyboard koppeln“.'
            : 'Der MIDI-Zugriff ist blockiert. Erlaube „MIDI-Geräte“ in den Website-Einstellungen (Symbol links neben der Adresse) und lade die Seite neu.')
          : st === 'ready' ? (names.length ? 'Verbunden: ' + names.join(', ') + '. Einfach losspielen.' : ('Bereit – noch kein Keyboard angeschlossen. ' + (bt ? 'USB-Keyboards werden beim Einstecken erkannt, ein Bluetooth-Keyboard verbindest du mit „Bluetooth-Keyboard koppeln“.'
            : plat === 'ioswrap' ? '' : 'Einstecken genügt, es wird sofort erkannt.')).trim())   // in the iOS app: the lead below says how
            : droid ? 'Noch nicht verbunden. Bluetooth-Keyboard: „Bluetooth-Keyboard koppeln“. Per USB-Kabel: „MIDI-Keyboard verbinden“.'
              : MIDI_AUTO ? 'Beim Klangstart fragt der Browser einmal nach der Erlaubnis für MIDI-Geräte.' : 'Noch nicht verbunden. Tippe auf „MIDI-Keyboard verbinden“ und erlaube den Zugriff.';
  if (E.midiStatus.textContent !== status) E.midiStatus.textContent = status;
  E.midiStatus.dataset.st = names.length ? 'on' : (st === 'blocked' && !droid) || (st === 'unsupported' && !bt) ? 'warn' : '';
  E.midiBtn.hidden = !(st === 'idle' && navigator.requestMIDIAccess);
  E.midiScanBtn.hidden = !((st === 'ready' || st === 'blocked') && navigator.requestMIDIAccess && !inViewer);
  E.midiScanBtn.textContent = st === 'blocked' ? 'Erneut versuchen' : 'Neu suchen';
  // after a reload the last keyboard is one tap away
  const last = !BLE.devs.size && BLE.last && BLE.last.name ? BLE.last.name : '';
  const promote = bt && !BLE.devs.size && (!navigator.requestMIDIAccess || st === 'blocked' || st === 'unsupported' || droid);
  E.bleBtn.hidden = E.bleAll.hidden = !bt;
  E.bleBtn.disabled = E.bleAll.disabled = E.bleAgain.disabled = bleAsking();
  E.bleBtn.lab.textContent = bleAsking() ? 'Bluetooth-Liste ist offen …' : 'Bluetooth-Keyboard koppeln';
  E.bleBtn.classList.toggle('primary', !!(promote && !last));
  E.bleAgain.hidden = !(bt && last);
  E.bleAgain.lab.textContent = 'Wieder verbinden: ' + last;
  E.bleAgain.classList.toggle('primary', !!promote);
  E.midiBtn.classList.toggle('primary', !promote && !names.length);
  // the first choice comes first (moved only when the order changes: moving a node takes its focus)
  const order = promote ? [E.bleAgain, E.bleBtn, E.midiBtn, E.gkBtn] : [E.bleAgain, E.midiBtn, E.bleBtn, E.gkBtn];
  // Gestik: the tile while it is off – or when its permission needs another tap
  E.gkBtn.hidden = GK.on && GK.perm !== 'tap' && GK.perm !== 'denied';
  E.gkBtn.lab.textContent = GK.on ? 'Gestik: Erlaubnis erteilen' : 'Gestik einschalten';
  // what it does here: a phone moves, a computer or the claude.ai view drags the Wasserwaage
  const gs = GK.on ? 'Bewegung und Ausrichtung erlauben' : gkBlocked() ? 'Hier ohne Sensor: die Spore in der Wasserwaage ziehen' : !gkExists() || !MOBILE ? 'Neigen, schütteln, umdrehen – ohne Sensor die Wasserwaage ziehen' : 'Neigen, schütteln, umdrehen';
  if (E.gkBtn.dataset.sub !== gs) E.gkBtn.dataset.sub = gs;
  E.gkBtn.classList.toggle('primary', kcNoMidi() && !inViewer);   // iPhone, iPad: the first controller there is
  if (order.some((el, i) => E.goRow.children[i] !== el)) E.goRow.append(...order);
  // why the Bluetooth search did not open, until it does (Android's permission: the player goes to the settings)
  const aw = bt && BLE.askWhy ? BLE.askWhy : '';
  if (E.bleWhy.textContent !== aw) E.bleWhy.textContent = aw;
  E.bleWhy.hidden = !aw;
  E.bleTim.hidden = !BLE.devs.size;
  for (const r of [E.goRow, E.tools]) r.hidden = [...r.children].every((c) => c.hidden);
  // the address to open elsewhere (another app, Chrome), as a link and to copy
  E.appRow.hidden = !/^(ios|viewer|webview|ffandroid)$/.test(plat);
  // what to do on this platform, unless the status line already says it or a keyboard already plays (then only "Hilfe")
  E.platLead.textContent = help.lead;
  E.platLead.hidden = status === help.lead || plat === 'viewer' || names.length > 0;
  E.platHelp.hidden = !help.steps.length;
  if (E.platSteps.dataset.lead !== help.lead) {
    E.platSteps.dataset.lead = help.lead; E.platSteps.textContent = '';
    for (const [b, t] of help.steps) E.platSteps.append(h('li', null, h('b', null, b + ': '), t));
  }
  kcDevsUI();
  // the parts that need a device: hidden where none can connect (viewer, iPhone Safari)
  const none = kcNone(), any = MIDI.srcs.size > 0 || BLE.devs.size > 0;
  E.mapSec.hidden = none || !(any || MAP.user.length);
  E.setSec.hidden = E.monSec.hidden = kcNoMidi();
  if (!E.mapSec.hidden) kcBindsUI();
  // the folded settings say what is set; the fixed velocity only matters with "Fest"
  const opt = (id) => (PD[id].opts.find((o) => o[0] === P[id]) || [0, ''])[1];
  E.setSec.sub.textContent = opt('midi.map') + ' · ' + (P['midi.vel'] ? opt('midi.curve') : 'ohne Dynamik') + ' · Rad ' + fmt(PD['midi.bend'], P['midi.bend']) + (P['midi.mpe'] === 'on' ? ' · MPE' : '');
  for (const w of CTLWRAP['midi.fix'] || []) w.hidden = P['midi.curve'] !== 'fix';
  for (const id of ['midi.curve', 'midi.fix']) for (const el of document.querySelectorAll('#p-' + id.replace('.', '-'))) el.closest('.ctl').classList.toggle('inactive', !P['midi.vel']);
  E.monSec.sub.textContent = KCM.on ? (KCM.hold ? 'angehalten' : 'schreibt mit') : any ? 'aus' : '';
}

/* ---------- device cards ---------- */
// Web MIDI cannot tell USB from a Bluetooth link the system made; the name sometimes can (BlueZ adds " Bluetooth",
// adapters and bridges say BLE / BT / WIDI)
const kcBtName = (n) => /bluetooth|\bble\b|ble[-_ ]?midi|\bbt\b|widi|md-bt01|ud-bt01/i.test(n) || [...BLE.devs.values()].some((B) => sameDev(B.name, n));
// the output that belongs to an input (same device name), for its clock
function kcOut(s) {
  if (!s) return null;
  if (s.kind === 'ble') return MIDI.outs.get(s.key) || null;
  for (const o of MIDI.outs.values()) if (o.kind === 'webmidi' && sameDev(o.name, s.name)) return o;
  return null;
}
function kcItems() {
  const l = [];
  for (const s of MIDI.srcs.values()) if (s.kind !== 'ble') l.push({ key: s.key, name: s.name, src: s });
  for (const B of BLE.devs.values()) l.push({ key: 'ble:' + B.id, name: B.name, src: B.src, B });
  // playing first, then switched off, then the second ports nobody needs
  const rank = (it) => (!it.src || it.B ? 0 : it.src.enabled ? 0 : it.src.secondary ? 2 : 1);
  return l.map((it, i) => [rank(it), i, it]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
}
const kcSigOf = (it) => {
  const s = it.src, o = kcOut(s), B = it.B;
  return it.key + ':' + (s && s.name && midiIface(s.name) ? (cbData(s).model || '') : '') + (s ? (s.enabled ? 1 : 0) + (s.dup ? 'd' : '') + (profOn(s) ? 'p' : '') + (s.secondary ? 's' : '') + (s.gkr ? 'g' : '') + (s.kind === 'motion' && GK.rem ? 'r' : '') + (s.nkHx ? 'H' : '') + (hxPadsHx(s) ? 'X' : '') : '-') + (o ? 'o' + (o.clock ? 1 : 0) + (o.noClock ? 'n' : '') : '') + (B ? (B.state === 'err' || B.state === 'off' ? 'x' : 'y') + (B.dev && typeof B.dev.forget === 'function' ? 'f' : '') : '');
};
// rebuilt when a device comes, goes or changes a switch; the texts and lights are refreshed in place (devFrame)
function kcDevsUI() {
  const el = devEls.devs, items = kcItems();
  const outs = [];
  for (const o of MIDI.outs.values()) if (o.kind === 'webmidi' && !items.some((it) => it.src && it.src.kind === 'webmidi' && sameDev(o.name, it.name))) outs.push(o);
  const sig = items.map(kcSigOf).join('|') + '#' + outs.map((o) => o.key + (o.clock ? 1 : 0)).join(',');
  if (sig !== KC.sig) {
    KC.sig = sig;
    const f = kcFocus(el);
    el.textContent = ''; KC.cards.clear();
    for (const it of items) { const C = kcCard(it); KC.cards.set(it.key, C); el.append(C.el); }
    // outputs without an input of the same name (a synth, a clock-only box): only their clock
    if (outs.length) {
      const box = h('div', { class: 'kc-opts' });
      for (const o of outs) box.append(kcSwitch(o.name, o.clock, (on) => midiSetClockOut(o, on), { aria: 'Tempo an ' + o.name + ' senden (MIDI-Clock)', key: 'out:' + o.key }));
      el.append(h('details', { class: 'kc-more', open: KC.open.outs || null, ontoggle: (e) => kcKeep('outs', e.target.open) }, h('summary', null, 'Tempo an weitere MIDI-Ausgänge senden (' + outs.length + ')'), box));
    }
    kcFocus(el, f);
  }
  kcBleLines();
}
// a rebuild must not throw the keyboard focus away: the control with the same data-kc gets it back
function kcFocus(el, k) {
  if (k === undefined) { const a = document.activeElement; return a && el.contains(a) && a.dataset ? a.dataset.kc || null : null; }
  if (k) { const n = el.querySelector('[data-kc="' + CSS.escape(k) + '"]'); if (n) n.focus({ preventScroll: true }); }
}
// which instrument plays through an interface's MIDI input (midi.js MIDI_IFACE): chosen once, kept per port (cbData,
// by the port's name) – the card names it, the Gerätebild draws it
function kcModelSel(s, it) {
  const keys = CB_MODELS.filter((m) => m.id !== 'generic').sort((a, b) => (b.keys > 0) - (a.keys > 0) || (a.maker + a.name).localeCompare(b.maker + b.name, 'de'));
  const cur = cbData(s).model || '';
  const sel = h('select', { class: 'kc-msel', 'data-kc': it.key + ':model', 'aria-label': 'Gerät an diesem MIDI-Anschluss' },
    h('option', { value: '' }, '– welches Gerät hängt daran? –'),
    ...keys.map((m) => h('option', { value: m.id, selected: m.id === cur ? '' : null }, (m.maker ? m.maker + ' ' : '') + m.name)));
  sel.addEventListener('change', () => { const d = cbData(s); d.model = sel.value || null; cbSave(s.name, d); MIDI.zv++; KC.sig = ''; updDevUI(); });
  return h('label', { class: 'kc-mlab' }, 'Am Anschluss: ', sel);
}
function kcCard(it) {
  if (it.src && it.src.kind === 'motion') return gkCard(it);
  const s = it.src, B = it.B, C = { it, lit: false, lastT: null };
  const bt = !!B || kcBtName(it.name), on = !!s && s.enabled && !s.dup;
  C.led = h('i', { class: 'kc-led', 'aria-hidden': 'true' });
  const head = h('div', { class: 'kc-dh' }, C.led, h('span', { class: 'kc-dn', title: it.name }, it.name),
    h('span', { class: 'kc-badge' + (bt ? ' bt' : ''), title: B ? 'Direkt aus dem Browser verbunden' : bt ? 'Über das System verbunden' : 'Per Kabel oder über das System verbunden' }, B ? 'Bluetooth direkt' : bt ? 'Bluetooth (System)' : 'USB'));
  if (s && !B) head.append(kcSwitch(it.name, s.enabled, (v) => midiSetPort(s, v), { bare: true, cls: 'kc-tog', aria: it.name + ' spielt', title: s.enabled ? 'Ausschalten' : 'Einschalten', key: it.key + ':on' }));
  const el = C.el = h('div', { class: 'kc-dev' + (B ? ' bledev' : '') + (on || (B && !s) ? '' : ' off'), role: 'group', 'aria-label': it.name }, head);
  if (B) { C.line = h('p', { class: 'note' }); C.warn = h('p', { class: 'note warn' }); el.append(C.line, C.warn); }
  // for when something goes wrong: links, packets, what the browser said last
  if (B) C.diag = h('p', { class: 'kc-diag' });
  if (s && !s.enabled) el.append(h('p', { class: 'kc-prof' }, s.secondary ? 'Zweiter Anschluss des Geräts (für Musikprogramme, DAW) – meist nicht nötig. Einschalten, wenn darüber etwas ankommen soll.' : 'Ausgeschaltet – es spielt nicht.'));
  if (on) {
    mapOf(s);
    const p = s.prof, po = profOn(s), o = kcOut(s);
    // (owner, 26.10.2026: the PCR-M50 „nirgends erkannt“ – the Gerätebild's model, named here too; 26./30.10.2026: „mein
    // Keyboard ist nicht gelistet“ – it plays through the MIDI input of a Steinberg interface, whose port carries the
    // interface's name, and „das Gerätebild des Interfaces streichen“) an interface's port names no instrument: the
    // player says which one hangs on it; until then no Gerätebild – it would draw the interface as a controller
    const iface = midiIface(s.name), cd = cbData(s), chosen = cd.model && cd.model !== 'generic' ? cbModelOf(cd.model) : null;
    const gm = iface ? chosen : cbModelFor(s), gmn = gm && gm.id !== 'generic' ? (gm.maker ? gm.maker + ' ' : '') + gm.name : '';
    el.append(h('p', { class: 'kc-prof' }, p ? [h('b', null, p.name), ' erkannt – ' + p.what + (po ? '' : ' (Profil aus)')]
      : iface && !gmn ? ['MIDI-Anschluss eines Audio-Interfaces – wähle unten, welches Keyboard oder welcher Controller daran hängt. Tasten, Räder und Pedale spielen schon.']
      : gmn && iface ? [h('b', null, gmn), ' – über diesen MIDI-Anschluss. Tasten, Räder und Pedale spielen; seine Regler und Fader zeigt und belegt das „Gerätebild“.']
      : gmn ? [h('b', null, gmn), ' erkannt – Tasten, Räder und Pedale spielen; seine Regler und Fader zeigt und belegt das „Gerätebild“' + (cbData(s).model ? '' : ' (dort auch ein anderes Modell wählen)') + '.']
      : ['Kein eigenes Profil: Tasten, Räder und Pedale spielen', P['midi.std'] ? ', übliche Regler (CC 7, 10, 74, 91 …) wirken' : '', '. Modell nicht erkannt – im „Gerätebild“ wählst du es aus der Liste, weitere Regler weist du unter „Zuordnungen“ zu.']));
    C.last = h('p', { class: 'kc-last idle' });
    el.append(C.last);
    const opts = h('div', { class: 'kc-opts' });
    if (p) opts.append(kcSwitch('Profil nutzen', po, (v) => midiSetProfile(s, v), { aria: 'Profil ' + p.name + ' nutzen', key: it.key + ':prof' }));
    if (o && !o.noClock) opts.append(kcSwitch('Tempo senden', o.clock, (v) => midiSetClockOut(o, v), { aria: 'Tempo an ' + it.name + ' senden (MIDI-Clock)', key: it.key + ':clock' }));
    if (iface && !p) opts.append(kcModelSel(s, it));
    if (!iface || gmn) opts.append(h('button', { type: 'button', class: 'btn', 'data-kc': it.key + ':bild', title: 'Das Gerät gezeichnet, mit allem, was jeder Regler steuert – einmessen, logisch belegen, einzeln ändern', onclick: () => cbOpen(s) }, 'Gerätebild'));   // (26.10.2026)
    if (opts.childNodes.length) el.append(opts);
    if (p && p.id === 'nks' && po) {   // Hexenring: the pads either strike the Spuren or play the Schleifen (pad 8 stays Stille)
      const hx = hxPadsHx(s), pc = (t, on, v, aria) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), 'data-kc': it.key + ':pads' + v, 'aria-label': aria, onclick: () => hxPadsSet(s, v === 'hx') }, t);
      el.append(h('div', { class: 'kc-pads' }, h('span', { class: 'lab' }, 'Pads:'), h('div', { class: 'chips small', role: 'group', 'aria-label': 'Pads' }, pc('Spuren', !hx, 'sp', 'Pads: Spur 1–4, Puls, Bordun, Freeze, Stille'), pc('Hexenring', hx, 'hx', 'Pads: Schleife 1–4, Korb, Zurück, nächste Lichtung, Stille'))));
    }
    if (p && p.id === 'tch' && po) {   // (Touché, 25.10.2026: its Spielweise – the knob on the device sends nothing)
      const tip = { finger: 'weg/heran: Höhe · links/rechts: Tonhöhe', atem: 'weg: anschwellen · heran: dunkel · links/rechts: Vibrato', raum: 'weg: Hall · heran: Echo · links/rechts: Panorama', verw: 'weg/heran: Mixer-Szene B/A · links/rechts: Filter', gleiten: 'weg/heran: Höhe · links/rechts: Tonhöhe bis eine Quinte', streichen: 'ohne Druck still · weg: Bogen- oder Atemdruck · heran: leicht und luftig · links/rechts: Intonation', platte: 'Hand auf der Schleife: weg bremst · heran schiebt an · links/rechts kleine Schübe', vokal: 'Druck öffnet den Mund · weg/heran: a ↔ i/u · links/rechts: u/o ↔ e/i' , koerner: 'Körnerwolke aus dem eben Gespielten · weg: dichter · heran: Tonhöhen streuen, rückwärts · links: zurück in der Zeit · rechts: weit streuen', eis: 'Drücken friert ein (Druck = Lautstärke) · links/rechts: Tonhöhe ±1 Oktave · weg: verwischen · heran: dunkler, Oktave darunter', oberton: 'weg: Antrieb · links: gerade Obertöne (warm) · rechts: ungerade (hohl) · heran: Welle falten (rau, metallisch)', faecher: 'weg: verstimmtes Paar, breit · links: Oktave darunter · rechts: Oktave darüber · heran: Quinte', ort: 'weg: weit weg (verhallt, dumpfer, später) · heran: nah am Ohr · links/rechts: um den Kopf herum (Kopfhörer!)', stottern: 'Drücken wiederholt den Moment im Tempo · links: lang (ein Schlag) · rechts: kurz (1/16) · weg: Band langsamer · heran: ausklingen, dunkler', resonanz: 'Saiten auf deine Töne gestimmt · Druck: länger klingen · weg: heller · heran: glockig · links/rechts: Stimmung ±1 Oktave', arp: 'Druck startet das Arpeggio (und ist seine Stärke) · weg: schneller · heran: mehr Oktaven, kürzer · rechts: aufwärts · links: abwärts · beide: zufällig', gestik: 'die Hand als Handy – alles aus „Gestik“: links/rechts und weg/heran neigen · zittern: Bebung · kreisen: Drehen und Schwenken · schnell hin und her: Ladung und Schütteln · zweimal kurz heran: Schlafen · Hand weg: Ruhe'};
      // (owner, 31.10.2026: no keys on them any more; laid out as a grid – the four families of four in rows)
      el.append(h('div', { class: 'kc-pads kc-tch' }, h('span', { class: 'lab' }, 'Spielweise'), h('div', { class: 'chips small', role: 'group', 'aria-label': 'Touché-Spielweise' },
        ...TCH_W.map(([w, nm]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(P['midi.tch'] === w), 'data-kc': it.key + ':tch' + w, title: nm + ': ' + tip[w], onclick: () => tchWeise(w, true) }, nm))),
        tchEigRow(it.key),   // (31.10.2026: own Spielweisen – touche-eigen.js)
        h('button', { type: 'button', class: 'chip', 'data-kc': it.key + ':tchcal', title: 'Myzel misst, wie weit du jede Richtung drückst – danach reicht jede über ihren ganzen Weg. Neu einmessen: jede Richtung einmal kräftig drücken.', onclick: () => tchEinmessen() }, 'Neu einmessen')));
    }
    if (p && p.id === 'nk2' && po) el.append(h('p', { class: 'kc-hint' }, s.nkHx ? 'Seite Hexenring (SET leuchtet) – SET noch einmal: Mixer.' : 'SET: Seite Hexenring (Schleifen statt Mixer).'));
    const more = [];
    if (p && p.ctrls) { const dl = h('dl', { class: 'kc-ctrls' }); for (const [a, b] of p.ctrls) dl.append(h('dt', null, a), h('dd', null, b)); more.push(dl); }
    if (p && p.hint) more.push(h('p', { class: 'kc-hint' }, p.hint));
    if (p && p.binds.some((b) => b.tent)) more.push(h('p', { class: 'kc-hint' }, 'Szenen 2 und 3 der Regler: ' + TENT_TXT + ' (unter „Zuordnungen“ und im MIDI-Monitor siehst du, was ankommt).'));
    if (p && p.clock) more.push(h('p', { class: 'kc-hint' }, o && !o.noClock ? '„Tempo senden“: der Arpeggiator des Geräts läuft im Tempo des Pulses.' : 'Den Arpeggiator im Tempo des Pulses gibt es nur über USB – über Bluetooth nimmt KORG kein Tempo an.'));
    if (more.length) el.append(h('details', { class: 'kc-more', open: KC.open['m:' + it.name] || null, ontoggle: (e) => kcKeep('m:' + it.name, e.target.open) }, h('summary', null, p ? 'Was es in Myzel steuert' : 'Hinweise'), ...more));
  }
  if (B) {
    const up = B.state !== 'err' && B.state !== 'off';
    const forget = !up && B.dev && typeof B.dev.forget === 'function' ? h('button', { type: 'button', class: 'btn ghost', 'data-ble': 'forget', 'data-kc': it.key + ':forget', onclick: () => bleForget(B) }, 'Vergessen') : null;
    el.append(h('details', { class: 'kc-more', open: KC.open.diag || null, ontoggle: (e) => kcKeep('diag', e.target.open) }, h('summary', null, 'Diagnose'), C.diag),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', 'data-ble': up ? 'off' : 'on', 'data-kc': it.key + ':link', onclick: () => (up ? bleOff(B) : bleConnect(B)) }, up ? 'Trennen' : 'Wieder verbinden'), forget));
  }
  return C;
}
// the Gestik card says when a Schleife of Bewegung plays (its ghost spore is in the Wasserwaage)
function gkFaeSync(C) {
  if (!C || !C.fae || !C.el.isConnected) return;
  const L = hxBewDisp(), t = L ? hxName(L) + ': Bewegung spielt – die blasse Spore in der Wasserwaage zeigt sie.' : '';
  if (C.fae.textContent !== t) C.fae.textContent = t;
  C.fae.hidden = !t;
}
// the Funkstrecke in the Gestik card: send this device's Gestik as MIDI (not while a phone's Gestik arrives here)
function gkfCardUI(C) {
  C.fsBox = h('div', { class: 'chips small', role: 'radiogroup', 'aria-label': 'Gestik als MIDI senden an' });
  C.fsAsk = h('button', { type: 'button', class: 'btn ghost', onclick: () => midiInit(true) }, 'MIDI-Ausgänge suchen');
  C.fsDark = h('button', { type: 'button', class: 'btn ghost', onclick: () => gkfDark(true) }, 'Nur die Wasserwaage zeigen (dunkel)');
  C.fsTxt = h('p', { class: 'note' }); C.fsSum = h('span', { class: 'gk-sum' });
  const nr = [['42/0, 42/1', 'Neigen ↔ und ↕ in Grad (±180°, 8192 = 0°)'], ['42/2, 42/3', 'Bebung, Drehen (8192 = Ruhe)'], ['42/4', 'Ladung'], ['42/5–7', 'Schwenken: Stärke, Tempo (0–4 Hz), Richtung'],
    ['42/8', 'Verzögerung des Sensors in ms'], ['42/127', 'Kennung, 10-mal pro Sekunde'], ['Noten 48–52', 'Wenden, Ruhe, Schütteln, Schüttel-Schlag, neuer Nullpunkt']];
  C.fs = h('details', { class: 'kc-more gk-anl gk-fs', open: KC.open.gkf || null, ontoggle: (e) => { kcKeep('gkf', e.target.open); gkCardSync(); } }, h('summary', null, 'Funkstrecke – als MIDI senden', C.fsSum),
    h('p', { class: 'note' }, 'Schickt die Bewegung dieses Geräts als MIDI an einen Ausgang – etwa per USB-Kabel an einen Computer, auf dem Myzel läuft: dort erscheint „Gestik (Handy)“, und Anlehnen, Ladung, Schlafen und die Bewegung im Hexenring wirken dort mit deinem Keyboard. Auch jedes Musikprogramm kann es lesen.'),
    h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, 'Senden an'), C.fsBox), h('div', { class: 'row' }, C.fsAsk, C.fsDark), C.fsTxt, h('p', { class: 'note' }, GKF_UNTESTED),
    h('details', { class: 'kc-more' }, h('summary', null, 'Belegung für Musikprogramme (Kanal 16, 14 Bit)'), h('dl', { class: 'kc-ctrls' }, ...nr.flatMap(([a, b]) => [h('dt', null, a), h('dd', null, b)]))));
  return C.fs;
}
function gkfCardSync(C) {
  const tx = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  C.fs.hidden = !!GK.rem;
  if (GK.rem) return;
  const api = !!navigator.requestMIDIAccess && !inViewer, outs = [...MIDI.outs.values()].filter((o) => o.port), cur = GK.p.fs, have = gkfOut();
  const opts = [['', 'Aus'], ...outs.map((o) => [o.name, devShort(o.name)])];
  if (cur && !have) opts.push([cur, devShort(cur) + ' (nicht da)']);
  const sig = opts.map((o) => o[0]).join('\u0001');
  if (C.fsBox.sig !== sig) {   // the outputs changed: new chips in place of the old
    const ch = gkChips('Gestik als MIDI senden an', opts, () => GK.p.fs, (v) => gkfPick(v));
    ch.sig = sig; C.fsBox.replaceWith(ch); C.fsBox = ch;
  }
  if (C.fsBox.sync) C.fsBox.sync();
  C.fsAsk.hidden = !(api && MIDI.state !== 'ready' && MIDI.state !== 'asking');
  C.fsDark.hidden = !(cur && have);
  tx(C.fsTxt, !api && !BLE.devs.size ? 'Dieser Browser hat kein Web MIDI – senden geht hier nicht.' : !cur ? (outs.length ? 'Wähle den Ausgang, an dem der Computer (oder das Musikprogramm) hängt.' : MIDI.state === 'ready' ? 'Kein MIDI-Ausgang gefunden.' : 'Erst „MIDI-Ausgänge suchen“ – der Browser fragt nach der Erlaubnis.')
    : !have ? 'Der Ausgang „' + devShort(cur) + '“ ist gerade nicht da.' : !GK.live ? 'Sendet an ' + devShort(have.name) + ', sobald der Sensor antwortet.' : 'Sendet an ' + devShort(have.name) + ' · ' + (GKS.rate || '…') + ' Nachrichten/s');
  tx(C.fsSum, cur ? ' · ' + (have ? 'sendet' : 'Ausgang fehlt') : '');
}
