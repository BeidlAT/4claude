/* ---------- the Fährte in the Gerät panel ---------- */
// For every device (a computer without sensors loops its knobs, the X-Y pad and the finger's height): the button
// (tap, hold, double tap – like the one in the bar), what is written down or playing, the length, Verblassen, the
// trim of the delay, "Hinlegen wird Schleife" where Gestik can be.
function faeSecUI() {
  const U = (FA.sec = {});
  const row = (lab, el) => h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, lab), el);
  U.go = h('button', { type: 'button', class: 'btn primary fae-go', 'data-act': 'fae' }, 'Fährte');
  faeWire(U.go);
  U.clr = h('button', { type: 'button', class: 'btn ghost', onclick: () => faeClear(true) }, 'Löschen');
  U.st = h('p', { class: 'note fae-st' });
  U.len = gkChips('Länge', [[1, '1 Takt'], [2, '2 Takte'], [4, '4 Takte']], () => FA.p.len, (v) => { FA.p.len = +v; faeSave(); faeUI(); });
  U.fade = gkChips('Verblassen', [[0.6, '× 0,6'], [0.75, '× 0,75'], [0.85, '× 0,85'], [0.95, '× 0,95'], [1, 'nie']], () => FA.p.fade, (v) => faeFade(+v));
  U.fTxt = h('p', { class: 'note' });
  const tr = h('input', { type: 'range', min: -20, max: 20, step: 1, value: FA.p.trim, 'aria-label': 'Feinregler der Verzögerung, in Millisekunden' }), to = h('span', { class: 'val' });
  const tSync = () => { to.textContent = (FA.p.trim > 0 ? '+' : FA.p.trim < 0 ? '−' : '±') + Math.abs(FA.p.trim) + ' ms'; tr.style.setProperty('--p', ((FA.p.trim + 20) / 40) * 100 + '%'); };
  tr.addEventListener('input', () => { FA.p.trim = +tr.value; faeSave(); tSync(); faeSecSync(); });
  tSync();
  U.lat = h('p', { class: 'note' });
  U.hin = kcSwitch('Hinlegen wird Schleife', FA.p.hin, (v) => { FA.p.hin = v; faeSave(); }, { aria: 'Hinlegen wird Schleife: legst du das Gerät ab, werden die letzten Takte zur Fährte', key: 'fae:hin' });
  U.hinBox = h('div', null, h('div', { class: 'kc-opts' }, U.hin),
    h('p', { class: 'note' }, 'Mit Gestik: legst du das Gerät ab (Ruhe), werden die letzten Takte davor zur Schleife. Zuerst aus – oft legt man es nur ab, um ans Keyboard zu greifen.'));
  U.el = section('Fährte', 'Bewegung als Schleife – auch nachträglich', h('div', { class: 'row fae-row' }, U.go, U.clr), U.st,
    row('Länge', U.len), row('Verblassen', U.fade), U.fTxt, h('div', { class: 'kc-rng fae-trim' }, h('span', null, 'Feinregler'), tr, to), U.lat, U.hinBox,
    h('details', { class: 'kc-more', open: KC.open.fae || null, ontoggle: (e) => kcKeep('fae', e.target.open) }, h('summary', null, 'So geht die Fährte'), h('ul', { class: 'help' },
      h('li', null, h('b', null, 'Tippen: '), 'die letzten Takte (Länge) werden sofort zur Schleife – ohne vorher etwas scharf zu schalten.'),
      h('li', null, h('b', null, 'Halten: '), 'ab dem nächsten Takt neu aufnehmen. Läuft schon eine Schleife, spielst du einen Durchgang darüber.'),
      h('li', null, h('b', null, 'Doppelt tippen: '), 'löschen.'),
      h('li', null, h('b', null, 'Mitgeschrieben '), 'wird, was den Klang formt, ohne das Preset zu ändern: Gestik, Regler und Räder, die du auf „Formen“ gelegt hast, das X-Y-Pad und die Fingerhöhe – und Filter, Echo, Hall, Körner und der A/B-Morph des Mixers, wenn du sie bewegst. Auch ohne Bewegungssensor.'),
      h('li', null, h('b', null, 'Im Takt: '), 'die Schleife lebt in den Takten des Pulses – steht er, zählt Myzel im selben Tempo weiter. Sie folgt Tempo und MIDI-Clock und spielt genauer ab, als sie gespielt wurde. Deine Bewegung kommt live obendrauf.'),
      h('li', null, h('b', null, 'Zuweisen: '), 'lege „Fährte“ auf ein Pad – dann geht alles mit der Hand am Keyboard.'),
      h('li', null, h('b', null, 'Gespeichert '), 'wird sie mit deinen eigenen Presets und mit den Szenen A und B des Mixers.'))));
  U.el.classList.add('fae-sec');
  faeSecSync();
  return U.el;
}
function faeSecSync() {
  const U = FA.sec, tx = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  const st = faeState();
  tx(U.st, faeText());
  if (U.go.dataset.st !== st) U.go.dataset.st = st;
  U.clr.disabled = !(FA.loop || FA.win || FA.pend);
  U.len.sync(); U.fade.sync();
  const bars = FA.loop ? Math.round(FA.loop.len / 4) : FA.p.len, n = Math.ceil(Math.log(0.1) / Math.log(Math.min(0.999, FA.p.fade)));
  tx(U.fTxt, FA.p.fade >= 1 ? 'Die Schleife läuft, bis du sie löschst.' : 'Jeder Durchgang × ' + dec(String(FA.p.fade)) + ' – nach etwa ' + n * bars + ' Takten ist sie verklungen.');
  const c = A.ctx, out = c ? Math.round(((c.baseLatency || 0) + (c.outputLatency || 0) + graphLatency()) * 1000) : null;
  const sens = GK.rem && GK.rem.src.gkr && GK.rem.src.gkr.latS != null ? [GK.rem.src.gkr.latS, 'gemessen am Handy'] : GK.p.latS != null ? [GK.p.latS, 'gemessen'] : [40, 'geschätzt'];
  tx(U.lat, out == null ? 'Die Fährte rechnet die Verzögerung von Bewegung zu Klang heraus.' : 'Verschoben um die Ausgabe (' + out + ' ms)' + (GK.on ? ', bei Gestik auch den Sensor (' + sens[0] + ' ms, ' + sens[1] + ')' : '') + ' – der Feinregler gleicht den Rest aus.');
  U.hinBox.hidden = !gkExists() && !GK.on;
  if (U.hin.getAttribute('aria-checked') !== String(FA.p.hin)) U.hin.setAttribute('aria-checked', String(FA.p.hin));
}
// the Gestik card says when a Fährte runs (its ghost spore is in the Wasserwaage)
function gkFaeSync(C) {
  if (!C || !C.fae || !C.el.isConnected) return;
  const t = FA.loop ? faeText() + ' – die blasse Spore in der Wasserwaage zeigt sie.' : FA.win ? faeText() : '';
  if (C.fae.textContent !== t) C.fae.textContent = t;
  C.fae.hidden = !t;
}
// the Funkstrecke in the Gestik card: send this device's Gestik as MIDI (not while a phone's Gestik arrives here)
function gkfCardUI(C) {
  C.fsBox = h('div', { class: 'chips small', role: 'radiogroup', 'aria-label': 'Gestik als MIDI senden an' });
  C.fsAsk = h('button', { type: 'button', class: 'btn ghost', onclick: () => midiInit(true) }, 'MIDI-Ausgänge suchen');
  C.fsTxt = h('p', { class: 'note' }); C.fsSum = h('span', { class: 'gk-sum' });
  const nr = [['42/0, 42/1', 'Neigen ↔ und ↕ in Grad (±180°, 8192 = 0°)'], ['42/2, 42/3', 'Bebung, Drehen (8192 = Ruhe)'], ['42/4', 'Ladung'], ['42/5–7', 'Schwenken: Stärke, Tempo (0–4 Hz), Richtung'],
    ['42/8', 'Verzögerung des Sensors in ms'], ['42/127', 'Kennung, 10-mal pro Sekunde'], ['Noten 48–52', 'Wenden, Ruhe, Schütteln, Schüttel-Schlag, neuer Nullpunkt']];
  C.fs = h('details', { class: 'kc-more gk-anl gk-fs', open: KC.open.gkf || null, ontoggle: (e) => { kcKeep('gkf', e.target.open); gkCardSync(); } }, h('summary', null, 'Funkstrecke – als MIDI senden', C.fsSum),
    h('p', { class: 'note' }, 'Schickt die Bewegung dieses Geräts als MIDI an einen Ausgang – etwa per USB-Kabel an einen Computer, auf dem Myzel läuft: dort erscheint „Gestik (Handy)“, und Anlehnen, Ladung, Schlafen und die Fährte wirken dort mit deinem Keyboard. Auch jedes Musikprogramm kann es lesen.'),
    h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, 'Senden an'), C.fsBox), h('div', { class: 'row' }, C.fsAsk), C.fsTxt, h('p', { class: 'note' }, GKF_UNTESTED),
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
  tx(C.fsTxt, !api && !BLE.devs.size ? 'Dieser Browser hat kein Web MIDI – senden geht hier nicht.' : !cur ? (outs.length ? 'Wähle den Ausgang, an dem der Computer (oder das Musikprogramm) hängt.' : MIDI.state === 'ready' ? 'Kein MIDI-Ausgang gefunden.' : 'Erst „MIDI-Ausgänge suchen“ – der Browser fragt nach der Erlaubnis.')
    : !have ? 'Der Ausgang „' + devShort(cur) + '“ ist gerade nicht da.' : !GK.live ? 'Sendet an ' + devShort(have.name) + ', sobald der Sensor antwortet.' : 'Sendet an ' + devShort(have.name) + ' · ' + (GKS.rate || '…') + ' Nachrichten/s');
  tx(C.fsSum, cur ? ' · ' + (have ? 'sendet' : 'Ausgang fehlt') : '');
}
