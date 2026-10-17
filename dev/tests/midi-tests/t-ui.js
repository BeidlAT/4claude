// MIDI part 4: the Gerät panel's "Keyboard & Controller" UI with real taps – the order of the sections, the connect
// tiles, device cards (name, transport badge, profile, activity light, last event, enable / profile / clock switches,
// Bluetooth line and Trennen), second ports and outputs without an input, the folded settings (all MIDI device
// parameters, remembered), the bindings list (lights, editor: mode, range, invert, takeover, target, delete; a profile
// binding becomes a learned copy; restore with confirmation; export / import), the monitor, the learn banner (steps,
// target first, undo), the mixer's learn button, platform wording on the start screen, keyboard focus after a rebuild.
// Needs the 'mu' slot: sh ../v2/mk.sh /home/user/4claude/myzel mu        node t-ui.js
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mu-inst/index.html';
const fs = require('fs');
const { open, ok, close, pair, summary } = require('./hb');
const NKS = 'nanoKEY Studio KEYBOARD/CTRL';
const ev = (page, fn, arg) => page.evaluate(fn, arg);
(async () => {
  // ---------- desktop: nanoKEY Studio over USB (with its output), a DAW port, a synth output, microKEY Air over Bluetooth ----------
  {
    const { page, errors } = await open({ bt: {}, ua: 'windows', cfg: { ins: [['k1', NKS], ['d1', 'MPK mini IV DAW Port']], outs: [['o1', NKS], ['o2', 'Microsoft GS Wavetable Synth']] } });
    await pair(page, { id: 'air', name: 'microKEY Air-25' });
    let r = await ev(page, () => [...document.querySelectorAll('#sheetBody > div > .sec')].filter((s) => !s.closest('[hidden]')).map((s) => s.querySelector('h3').textContent.trim()));
    ok(r.join('|') === 'Keyboard & Controller|Zuordnungen|Spielweise am Keyboard|MIDI-Monitor|Qualität|Latenz|Computertastatur', 'sections in order, keyboards first: ' + r.join(' | '));

    r = await ev(page, () => [...document.querySelectorAll('.kc-dev')].map((c) => ({ name: c.querySelector('.kc-dn').textContent, badge: c.querySelector('.kc-badge').textContent, off: c.classList.contains('off'), ble: c.classList.contains('bledev'), txt: c.textContent })));
    const nk = r.find((c) => c.name === NKS), air = r.find((c) => c.name === 'microKEY Air-25'), daw = r.find((c) => /DAW/.test(c.name));
    ok(r.length === 3 && nk && air && daw, 'one card per device: ' + r.map((c) => c.name).join(', '));
    ok(nk.badge === 'USB' && air.badge === 'Bluetooth direkt' && air.ble, 'transport badges: USB, Bluetooth direkt');
    ok(/KORG nanoKEY Studio erkannt – Regler, X-Y-Pad, Pads, Pitch\/Mod/.test(nk.txt) && /KORG microKEY erkannt – Tasten, Joystick, Sustain/.test(air.txt), 'recognised profiles named with their features');
    ok(daw.off && /Zweiter Anschluss/.test(daw.txt) && r.indexOf(daw) === 2, 'the DAW port: last, off, explained');
    ok(/Tempo senden/.test(nk.txt) && !/Tempo senden/.test(air.txt) && /nur über USB/.test(air.txt), 'clock out offered for the USB output, not over Bluetooth to KORG (explained)');
    ok(/verbunden/.test(air.txt) && /Trennen/.test(air.txt), 'Bluetooth card: state line and Trennen');
    r = await ev(page, () => { const d = [...document.querySelectorAll('.kc-devs > details')].pop(); return d ? d.querySelector('summary').textContent + ' / ' + d.textContent : ''; });
    ok(/weitere MIDI-Ausgänge senden \(1\)/.test(r) && /Microsoft GS Wavetable Synth/.test(r), 'an output without an input: offered for clock in a fold');
    ok(await ev(page, () => !!document.querySelector('.kc-tools .btn:not([hidden])') && [...document.querySelectorAll('.kc-tools .btn')].some((b) => b.textContent === 'Neu suchen' && !b.hidden)), '"Neu suchen" offered once MIDI is ready');

    // activity light and last line
    await ev(page, () => window.__send([0xb0, 22, 81], 'k1'));
    await page.waitForTimeout(40);
    r = await ev(page, () => { const c = [...document.querySelectorAll('.kc-dev')].find((x) => x.querySelector('.kc-dn').textContent.startsWith('nanoKEY')); return { on: c.querySelector('.kc-led').classList.contains('on') }; });
    await page.waitForTimeout(260);
    const r2 = await ev(page, () => { const c = [...document.querySelectorAll('.kc-dev')].find((x) => x.querySelector('.kc-dn').textContent.startsWith('nanoKEY')); return { on: c.querySelector('.kc-led').classList.contains('on'), ok: c.querySelector('.kc-led').classList.contains('ok'), last: c.querySelector('.kc-last').textContent }; });
    ok(r.on && !r2.on && r2.ok, 'activity light: on with a message, back to idle (connected) after it');
    ok(/^Regler 3 · CC 22 → Klang-Makro B \(Nebel: Resonanz\)/.test(r2.last), 'last line names the knob, its CC and target: ' + r2.last);
    await ev(page, () => { window.__send([0x90, 60, 100], 'k1'); });
    await page.waitForTimeout(150);
    await ev(page, () => { window.__send([0x80, 60, 0], 'k1'); });
    await page.waitForTimeout(150);
    r = await ev(page, () => [...document.querySelectorAll('.kc-last')].map((x) => x.textContent).find((t) => /Taste/.test(t)));
    ok(r === 'Taste C4 · 100 · Kanal 1 → Ton auf der Spielfläche', 'a key: its strike stays on the line after it is let go: ' + r);
    await ev(page, () => { const d = window.__bt.dev('air'); d.send([0x80, 0x80, 0xb0, 2, 90]); });
    await page.waitForTimeout(150);
    r = await ev(page, () => document.querySelector('.bledev .kc-last').textContent);
    ok(r === 'CC 2 = 90 · Kanal 1 → Klangfarbe dunkler', 'Bluetooth joystick down (CC 2): ' + r);

    // switches: enable (with keyboard focus kept through the rebuild), profile, clock out – all remembered
    await page.focus('[data-kc="k1:on"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    r = await ev(page, () => ({ en: window.__M.MIDI.srcs.get('k1').enabled, focus: document.activeElement && document.activeElement.dataset.kc, off: document.querySelector('[data-kc="k1:on"]').closest('.kc-dev').classList.contains('off'), pref: JSON.parse(localStorage.getItem('myzel.midiports.v1'))['in:' + 'nanoKEY Studio KEYBOARD/CTRL'].on }));
    ok(!r.en && r.off && r.pref === false && r.focus === 'k1:on', 'enable switch: off, stored, the card dims, keyboard focus stays on the switch');
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
    ok(await ev(page, () => window.__M.MIDI.srcs.get('k1').enabled), 'Space switches it on again');
    await page.click('[data-kc="k1:prof"]');
    r = await ev(page, () => ({ prof: window.__M.profText(window.__M.MIDI.srcs.get('k1')), sw: document.querySelector('[data-kc="k1:prof"]').getAttribute('aria-checked') }));
    ok(/Profil aus/.test(r.prof) && r.sw === 'false', 'profile switch: off (' + r.prof + ')');
    await page.click('[data-kc="k1:prof"]');
    await page.click('[data-kc="k1:clock"]');
    await page.waitForTimeout(400);
    r = await ev(page, () => { const o = [...window.__M.MIDI.outs.values()].find((x) => x.key === 'o1'); return { clock: o.clock, sent: window.__midi.outputs.get('o1').sent.filter((m) => m.d[0] === 0xf8).length, pref: JSON.parse(localStorage.getItem('myzel.midiports.v1'))['out:' + 'nanoKEY Studio KEYBOARD/CTRL'].clock }; });
    ok(r.clock && r.pref === true && r.sent > 5, 'clock switch: on, stored, F8 pulses go out (' + r.sent + ')');
    await page.click('[data-kc="k1:clock"]');

    // the settings: folded, every MIDI device parameter inside, remembered open
    r = await ev(page, () => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Spielweise/.test(x.textContent)); return { exp: b.getAttribute('aria-expanded'), body: document.getElementById(b.getAttribute('aria-controls')).hidden, sub: b.closest('.sec-h').querySelector('p').textContent }; });
    ok(r.exp === 'false' && r.body && r.sub === 'Skala · Mittel · Rad ±2 HT', 'Spielweise folded, its summary: ' + r.sub);
    await page.click('.fold-b:has-text("Spielweise")');
    r = await ev(page, () => ['midi-map', 'midi-y', 'midi-vel', 'midi-bend', 'midi-curve', 'midi-fix', 'midi-mpe', 'midi-pc', 'midi-transport', 'midi-clock', 'midi-pads', 'midi-std', 'midi-ble'].filter((id) => !document.getElementById('p-' + id)));
    ok(!r.length, 'all MIDI device parameters are in the panel' + (r.length ? ' – missing ' + r.join(', ') : ''));
    r = await ev(page, () => ({ fix: document.getElementById('p-midi-fix').closest('.ctl').hidden, open: JSON.parse(localStorage.getItem('myzel.kcui.v1')).set }));
    await page.click('#p-midi-curve [data-val="fix"]');
    const fixShown = await ev(page, () => !document.getElementById('p-midi-fix').closest('.ctl').hidden);
    await page.click('#p-midi-vel');
    const inact = await ev(page, () => document.getElementById('p-midi-curve').closest('.ctl').classList.contains('inactive'));
    await page.click('#p-midi-vel'); await page.click('#p-midi-curve [data-val="mid"]');
    ok(r.fix && fixShown && inact && r.open === true, 'fixed velocity shown only with „Fest“; the curve greys without dynamics; the open fold is remembered');
    ok(await ev(page, () => !document.querySelector('.kc-devs + div [aria-label^="Bluetooth-Timing"]') || !!document.querySelector('[aria-label^="Bluetooth-Timing"]').offsetParent), 'Bluetooth-Timing next to the Bluetooth card');

    // the bindings: learned rows first, profile folded, lights, the editor
    await ev(page, async () => {
      const M = window.__M; M.midiLearn(true);
      window.__send([0xb0, 20, 60], 'k1'); window.__send([0xb0, 20, 64], 'k1'); M.learnPick('cho.mix');
      await window.__sleep(20); M.midiLearn(false);
    });
    await page.waitForTimeout(250);
    r = await ev(page, () => { const g = document.querySelector('.kc-bg'); return { head: g.querySelector('.kc-bgh b').textContent, rows: [...g.querySelectorAll(':scope > .kc-bl > .kc-b')].map((x) => x.querySelector('.kc-bc').textContent + ' ' + x.querySelector('.kc-bt').textContent), folds: [...g.querySelectorAll('details.kc-bd > summary')].map((x) => x.textContent) }; });
    ok(r.head === NKS && r.rows.length === 1 && /^Regler 1 · CC 20 · Kanal 1 → Schweben · Anteil/.test(r.rows[0]), 'learned binding listed: ' + r.rows.join(' / '));
    ok(r.folds[0] === 'Profil KORG nanoKEY Studio · 44' && /^Standard \(General MIDI\)/.test(r.folds[1]), 'profile and General MIDI bindings folded: ' + r.folds.join(' / '));
    await ev(page, () => window.__send([0xb0, 20, 66], 'k1'));
    await page.waitForTimeout(150);
    ok(await ev(page, () => document.querySelector('.kc-bg .kc-b .kc-led').classList.contains('on')), 'a binding row lights when its control acts');
    await page.click('.kc-bg > .kc-bl .kc-be');
    await page.click('.kc-ed .chip:text-is("Umschalten")');
    r = await ev(page, () => JSON.parse(localStorage.getItem('myzel.midimap.v1')).binds.find((b) => b.num === 20 && b.dev === 'nanoKEY Studio KEYBOARD/CTRL').mode);
    await page.click('.kc-ed .chip:text-is("Regler")');
    await page.$eval('.kc-ed .kc-rng input', (i) => { i.value = 20; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); });
    await page.click('.kc-ed [role=switch]:has-text("Umkehren")');
    const b1 = await ev(page, () => Object.assign({}, window.__M.MAP.user.find((b) => b.num === 20)));
    ok(r === 'toggle' && b1.mode === 'abs' && b1.min === 0.2 && b1.inv === true, 'editor: mode, range (from 20 %), invert – stored at once');
    await page.click('.kc-ed button:text-is("Ziel ändern")');
    await page.fill('.kc-ed input[type=search]', 'phaser anteil');
    await page.click('.kc-ed .kc-res button >> nth=0');
    r = await ev(page, () => ({ t: window.__M.MAP.user.find((b) => b.num === 20).target, row: document.querySelector('.kc-bg > .kc-bl .kc-bt').textContent, focus: document.activeElement.textContent }));
    ok(r.t === 'pha.mix' && /Phaser · Anteil/.test(r.row) && r.focus === 'Ziel ändern', 'target changed from the search: ' + r.row);
    await page.keyboard.press('Escape');
    r = await ev(page, () => ({ ed: !!document.querySelector('.kc-ed'), panel: window.__M.UI.panel, focus: document.activeElement && document.activeElement.classList.contains('kc-be') }));
    ok(!r.ed && r.panel === 'dev' && r.focus, 'Escape closes the editor (not the panel), focus back on its button');
    // a profile binding: edited → a learned copy
    await page.click('.kc-bg details.kc-bd > summary >> nth=0');
    await page.click('.kc-bg details.kc-bd .kc-b:nth-child(2) .kc-be');
    await page.click('.kc-ed .kc-opts [role=switch]:has-text("Umkehren")');
    await page.click('.kc-ed button:text-is("Fertig")');
    r = await ev(page, () => ({ u: window.__M.MAP.user.filter((b) => b.dev === 'nanoKEY Studio KEYBOARD/CTRL').map((b) => b.num + ':' + b.target + ':' + !!b.inv), rows: document.querySelectorAll('.kc-bg > .kc-bl > .kc-b').length }));
    ok(r.u.includes('21:macro.a:true') && r.rows === 2, 'editing a profile knob makes a learned copy (now listed with the learned): ' + r.u.join(', '));
    // delete: the learned one goes; a profile binding is switched off
    await page.click('.kc-bg > .kc-bl .kc-b:first-child .kc-be');
    await page.click('.kc-ed button:text-is("Löschen")');
    r = await ev(page, () => window.__M.MAP.user.filter((b) => b.dev === 'nanoKEY Studio KEYBOARD/CTRL').map((b) => b.num));
    ok(r.join() === '21', 'Löschen removes a learned binding');
    await page.click('.kc-bg details.kc-bd .kc-b:nth-child(3) .kc-be');
    await page.click('.kc-ed button:text-is("Abschalten")');
    r = await ev(page, () => window.__M.MAP.user.find((b) => b.num === 22));
    ok(r && r.target === null, '„Abschalten“ silences a profile knob (a learned „nichts“)');
    // restore asks once more
    await page.click('.kc-bgh button:text-is("Profil wiederherstellen")');
    const n1 = await ev(page, () => window.__M.MAP.user.length);
    await page.click('.kc-bgh button:text-is("Wirklich?")');
    const n2 = await ev(page, () => window.__M.MAP.user.length);
    ok(n1 === 2 && n2 === 0, '„Profil wiederherstellen“ asks „Wirklich?“, then drops what was learned for the device');
    // export / import
    await ev(page, () => { const M = window.__M; M.MAP.user.push({ dev: 'nanoKEY Studio KEYBOARD/CTRL', ch: 0, type: 'cc', num: 30, target: 'rev.mix', mode: 'abs' }); M.MAP.v++; });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:text-is("Zuordnungen exportieren")')]);
    const file = await dl.path();
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    ok(dl.suggestedFilename() === 'myzel-midi-zuordnungen.json' && json.kind === 'midimap' && json.binds.length === 1, 'export: a JSON file of the learned bindings');
    await ev(page, () => { window.__M.MAP.user.length = 0; window.__M.MAP.v++; });
    await page.setInputFiles('#kcMapFile', { name: 'z.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
    await page.waitForTimeout(200);
    r = await ev(page, () => ({ n: window.__M.MAP.user.length, toast: document.querySelector('#toastMsg').textContent }));
    ok(r.n === 1 && r.toast === '1 Zuordnung übernommen.', 'import: ' + r.toast);
    await page.setInputFiles('#kcMapFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('kein json') });
    await page.waitForTimeout(200);
    ok(/keine Myzel-Zuordnungen/.test(await ev(page, () => document.querySelector('#toastMsg').textContent)), 'import of junk is refused with a message');

    // the monitor: records only while open
    ok(await ev(page, () => window.__M.MIDI.tap === null), 'monitor closed: no tap');
    await page.click('.fold-b:has-text("MIDI-Monitor")');
    await ev(page, () => { window.__send([0xb0, 1, 70], 'k1'); window.__send([0xc0, 3], 'k1'); window.__send([0xe0, 0, 80], 'k1'); window.__bt.dev('air').send([0x80, 0x80, 0xb0, 67, 127]); });
    await page.waitForTimeout(250);
    r = await ev(page, () => [...document.querySelectorAll('.kc-mon li')].map((l) => l.querySelector('.m').textContent + ' ' + l.querySelector('.c').textContent + ' ' + l.querySelector('.x').textContent));
    ok(r.length === 4 && /^CC 67 = 127 K1 microKEY Air-25→ Leisepedal/.test(r[0]) && /^Tonhöhenrad \+2048 K1 nanoKEY Studio→ Tonhöhe/.test(r[1]) && /^Programm 4 .*Preset laden/.test(r[2]) && /^CC 1 = 70 .*Klangfarbe heller/.test(r[3]), 'monitor: newest first, device, channel, effect: ' + r.join(' | '));
    await page.click('.kc-mon ~ * button:text-is("Anhalten"), button:text-is("Anhalten")');
    await ev(page, () => window.__send([0xb0, 5, 1], 'k1'));
    await page.waitForTimeout(150);
    const held = await ev(page, () => document.querySelectorAll('.kc-mon li').length);
    await page.click('button:text-is("Weiter")');
    await ev(page, () => { for (let i = 0; i < 40; i++) window.__send([0xb0, 7, i], 'k1'); });
    await page.waitForTimeout(150);
    const max = await ev(page, () => document.querySelectorAll('.kc-mon li').length);
    await page.click('button:text-is("Leeren")');
    const empty = await ev(page, () => document.querySelector('.kc-mon').textContent);
    await page.click('.fold-b:has-text("MIDI-Monitor")');
    ok(held === 4 && max === 30 && /Noch nichts angekommen/.test(empty) && (await ev(page, () => window.__M.MIDI.tap === null)), '„Anhalten“ holds the list, at most 30 lines, „Leeren“, closing stops recording');

    // learn: the banner's steps, target first, undo; buttons in sync
    await page.click('.sheet button:text-is("Zuweisen")');
    r = await ev(page, () => ({ step: document.querySelector('.mlearn-bar').dataset.step, n: document.querySelector('.mlearn-bar .ml-n').textContent, pressed: document.querySelector('.kc-learn').getAttribute('aria-pressed'), want: document.body.classList.contains('ml-want') }));
    ok(r.step === '1' && r.n === '1' && r.pressed === 'true' && !r.want, 'learn armed: step 1, the button shows it');
    await ev(page, () => { window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 44], 'k1'); });
    r = await ev(page, () => ({ step: document.querySelector('.mlearn-bar').dataset.step, b: document.querySelector('.mlearn-bar .ml-msg b').textContent, want: document.body.classList.contains('ml-want') }));
    ok(r.step === '2' && r.b === 'nanoKEY Studio · Regler CC 23 · Kanal 1' && r.want, 'a control caught: step 2, it is named, every target glows (ml-want)');
    await page.click('#quick [data-pid="rev.mix"] input');
    r = await ev(page, () => ({ step: document.querySelector('.mlearn-bar').dataset.step, n: document.querySelector('.mlearn-bar .ml-n').textContent, undo: !document.querySelector('.mlearn-bar .ml-top div .btn').hidden, ok: document.querySelector('#quick [data-pid="rev.mix"]').classList.contains('ml-ok'), want: document.body.classList.contains('ml-want'), b: window.__M.MAP.user.find((x) => x.num === 23) }));
    ok(r.step === 'ok' && r.n === '✓' && r.undo && r.ok && !r.want && r.b && r.b.target === 'rev.mix', 'assigned: ✓, „Rückgängig“ offered, the control flashes');
    await page.click('.mlearn-bar button:text-is("Rückgängig")');
    ok(!(await ev(page, () => window.__M.MAP.user.some((x) => x.num === 23))), '„Rückgängig“ takes the assignment back');
    await page.click('#quick [data-pid="dly.mix"] input');
    r = await ev(page, () => ({ sel: document.querySelector('#quick [data-pid="dly.mix"]').classList.contains('ml-sel'), step: document.querySelector('.mlearn-bar').dataset.step }));
    await ev(page, () => { window.__send([0xb0, 24, 10], 'k1'); window.__send([0xb0, 24, 14], 'k1'); });
    await page.waitForTimeout(550);
    const sel2 = await ev(page, () => document.querySelector('#quick [data-pid="dly.mix"]').classList.contains('ml-sel'));
    ok(r.sel && r.step === '1' && !sel2 && (await ev(page, () => window.__M.MAP.user.some((x) => x.num === 24 && x.target === 'dly.mix'))), 'target first: the control stays outlined (ml-sel) until a device control arrives');
    // the mixer's button
    await page.click('#tab-mix'); await page.waitForTimeout(400);
    r = await ev(page, () => { const b = document.querySelector('.mx-ml'); const rc = b.getBoundingClientRect(); return { vis: !b.hidden && rc.width >= 44 && rc.height >= 44, pressed: b.getAttribute('aria-pressed'), name: b.getAttribute('aria-label') }; });
    ok(r.vis && r.pressed === 'true' && /Zuweisen/.test(r.name), 'mixer: the learn button shows (44 px), pressed while learn is on');
    await page.click('.mx-ml');
    ok(!(await ev(page, () => window.__M.LEARN.on)), 'and ends learn');
    await page.click('.mx-ml');
    ok(await ev(page, () => window.__M.LEARN.on && !document.querySelector('.mlearn-bar').hidden), 'and starts it');
    await page.keyboard.press('Escape');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- the mixer button needs a device; viewer and iPhone: no keyboard parts, platform words on the start screen ----------
  {
    const { page, errors } = await open({ bt: false, cfg: { ins: [] } });
    await page.click('#tab-mix'); await page.waitForTimeout(300);
    ok(await ev(page, () => document.querySelector('.mx-ml').hidden), 'no controller connected: no learn button in the mixer');
    await ev(page, () => window.__midi.plug('k7', 'Arturia MiniLab 3'));
    await page.waitForTimeout(100);
    ok(!(await ev(page, () => document.querySelector('.mx-ml').hidden)), 'one plugged in: it appears');
    await ev(page, () => window.__M.openPanel('dev'));
    r = await ev(page, () => ({ mapSec: [...document.querySelectorAll('.sec')].find((s) => s.querySelector('h3').textContent === 'Zuordnungen').hidden, prof: document.querySelector('.kc-dev .kc-prof').textContent }));
    ok(!r.mapSec && /Arturia MiniLab 3 erkannt/.test(r.prof), 'a device appears with its profile, Zuordnungen shows');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  var r;
  for (const [o, want, line] of [[{ viewer: true, bt: {}, cfg: { denyMidi: true } }, 'viewer', /in der App unter beidlat\.github\.io\/4claude/], [{ ua: 'ipad', bt: false, noMidi: true, vp: [390, 844], touch: true }, 'ios', /Auf dem iPad nur in einer App wie „Web MIDI Browser“ oder „Bluefy“/]]) {
    const { page, errors } = await open(Object.assign({ start: false }, o));
    const t = await ev(page, () => document.querySelector('#startKeysLine').textContent);
    await page.click('#btnStart'); await page.waitForTimeout(250);
    await ev(page, () => window.__M.openPanel('dev'));
    r = await ev(page, () => [...document.querySelectorAll('#sheetBody .sec')].filter((s) => !s.closest('[hidden]')).map((s) => s.querySelector('h3').textContent.trim()).join('|'));
    ok(line.test(t) && r === 'Keyboard & Controller|Qualität|Latenz|Computertastatur', want + ': start line „' + t + '“; only the explanation, no bindings, settings or monitor');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- phones: targets ≥ 44 px, no sideways scrolling, the start screen ----------
  for (const vp of [[390, 844], [360, 740]]) {
    const { page, errors } = await open({ bt: {}, ua: 'android', vp, touch: true, cfg: { ins: [['k1', NKS]], outs: [['o1', NKS]] } });
    const t = await ev(page, () => document.querySelector('#startKeysLine').textContent);
    await ev(page, () => window.__M.midiInit(true)); await page.waitForTimeout(150);
    await pair(page, { id: 'air', name: 'microKEY Air-25' });
    await ev(page, () => { for (const b of document.querySelectorAll('.fold-b')) b.click(); for (const d of document.querySelectorAll('#sheetBody details')) d.open = true; window.__M.midiLearn(false); });
    await page.waitForTimeout(200);
    r = await ev(page, () => {
      // the four keyboard sections themselves (not the first four of the sheet, which may be another panel's)
      const E = window.__M.getDevEls(), secs = [E.midiSec, E.mapSec, E.setSec, E.monSec], small = [];
      if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev');
      for (const s of secs) for (const el of s.querySelectorAll('button, summary, input, [role=switch]')) {
        const rc = el.getBoundingClientRect();
        if (!rc.width || el.closest('[hidden]')) continue;
        const hgt = el.matches('input[type=range]') ? 34 : 44;   // the app's sliders: 34 px tall, 24 px thumb, like every slider here
        if (rc.height < hgt - 0.5 || (rc.width < 44 - 0.5 && !el.matches('input'))) small.push((el.textContent || el.getAttribute('aria-label') || el.type || el.tagName).trim().slice(0, 30) + ' ' + Math.round(rc.width) + '×' + Math.round(rc.height));
      }
      return { small, wide: document.documentElement.scrollWidth <= innerWidth && document.querySelector('#sheetBody').scrollWidth <= document.querySelector('#sheetBody').clientWidth + 1 };
    });
    ok(!r.small.length, vp[0] + ' px: every control in the keyboard sections is at least 44 px' + (r.small.length ? ' – too small: ' + r.small.join(', ') : ''));
    ok(r.wide, vp[0] + ' px: no sideways scrolling');
    ok(/USB oder Bluetooth/.test(t), 'start line mentions Bluetooth: ' + t);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  // ---------- reduced motion: no breathing outlines, no pulsing step ----------
  {
    const { chromium } = require('/opt/node22/lib/node_modules/playwright');
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['k', { id: 'k', name: 'nanoKEY Studio', state: 'connected', onmidimessage: null }]]), outputs: new Map(), onstatechange: null }); });
    await page.goto(process.env.BASE);
    await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(400);
    r = await ev(page, () => {
      const M = window.__M; M.midiLearn(true);
      const n = getComputedStyle(document.querySelector('.mlearn-bar .ml-n')).animationName;
      M.MIDI.srcs.get('k').onMsg({ data: new Uint8Array([0xb0, 21, 40]), timeStamp: performance.now() });
      const q = getComputedStyle(document.querySelector('#quick [data-pid="rev.mix"]')).animationName;
      return { n, q, want: document.body.classList.contains('ml-want') };
    });
    ok(r.want && r.n === 'none' && r.q === 'none', 'reduced motion: the step badge and the targets do not pulse');
    await b.close();
  }
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
