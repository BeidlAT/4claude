// Fix phase: the reviewers' findings that no reproducer covers end to end – MPE detection (profile and by playing),
// relative encoders corrected at run time, note counting per device, expression shown and released, Android's
// Bluetooth-first panel, the chooser's error kept in the panel, „Mit <Keyboard> starten“, the monitor drawn
// incrementally, learn's focus, target search, the brightness wording.   node t-fix.js   (BASE: the 'mf' slot)
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mf-inst/index.html';
const { open, ok, close, pair, showDev } = require('./hb');
const ev = (page, fn, a) => page.evaluate(fn, a);
(async () => {
  // ---------- MPE: a known MPE controller in Auto, and one found by how it plays ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'LUMI Keys BLOCK'], ['k2', 'Expressive Pad'], ['k3', 'Split Keys']] } });
    let r = await ev(page, async () => {
      const M = window.__M, S = window.__send;
      M.setParam('midi.mpe', 'auto');
      S([0xe1, 0x7f, 0x7f], 'k1'); S([0x91, 60, 100], 'k1');   // member ch 2: full bend before the note
      const tt = M.touches.get('midi-k1-1-60'), lumi = { mpe: !!(tt && tt.mpe), mb: tt && +tt.mb.toFixed(1) };
      S([0x81, 60, 0], 'k1');
      // the profile switched off: no zone assumed
      const src = M.MIDI.srcs.get('k1');
      M.midiSetProfile(src, false);
      S([0x91, 62, 100], 'k1'); const off = !!(M.touches.get('midi-k1-1-62') || {}).mpe; S([0x81, 62, 0], 'k1');
      M.midiSetProfile(src, true);
      return { lumi, off, prof: M.profText(src) };
    });
    ok(r.lumi.mpe && r.lumi.mb === 48, 'LUMI in MPE Auto without MCM: member note is MPE, full bend 48 semitones ' + JSON.stringify(r.lumi) + ' (' + r.prof + ')');
    ok(!r.off, 'LUMI with its profile off: no MPE zone assumed');
    r = await ev(page, async () => {
      const M = window.__M, S = window.__send, sl = window.__sleep;
      // a split keyboard: wheel on two channels, notes long after – never MPE
      S([0xe1, 0, 0x50], 'k3'); S([0xe2, 0, 0x50], 'k3'); await sl(120);
      S([0x91, 60, 90], 'k3'); S([0x92, 64, 90], 'k3'); S([0x81, 60, 0], 'k3'); S([0x82, 64, 0], 'k3');
      const split = !!M.MIDI.srcs.get('k3').mpeAuto;
      // a split keyboard with aftertouch streaming on both zones while playing: two channels only – never MPE
      for (let i = 0; i < 4; i++) { S([0xd1, 40 + i], 'k3'); S([0x91, 50 + i, 90], 'k3'); S([0xd2, 40 + i], 'k3'); S([0x92, 70 + i, 90], 'k3'); }
      const split2 = !!M.MIDI.srcs.get('k3').mpeAuto;
      // an MPE controller without profile or MCM: bend / pressure right before each note, a new channel per note
      S([0xe1, 0, 0x40], 'k2'); S([0x91, 60, 90], 'k2');
      S([0xd2, 30], 'k2'); S([0x92, 64, 90], 'k2');
      const first = !!M.MIDI.srcs.get('k2').mpeAuto;
      S([0xe3, 0, 0x40], 'k2'); S([0x93, 67, 90], 'k2');
      const det = !!M.MIDI.srcs.get('k2').mpeAuto, msg = document.querySelector('#toastMsg').textContent;
      S([0x92, 64, 0], 'k2'); S([0xd2, 0], 'k2'); S([0x92, 64, 90], 'k2');   // the next note: now in the zone
      S([0xe2, 0x7f, 0x7f], 'k2');
      const tt = M.touches.get('midi-k2-2-64');
      return { split, split2, first, det, msg, mpe: !!(tt && tt.mpe), mb: tt && +tt.mb.toFixed(1) };
    });
    ok(!r.split && !r.split2, 'split keyboard (wheel on two channels; aftertouch streaming on both while playing): not taken for MPE');
    ok(!r.first && r.det && /MPE erkannt/.test(r.msg), 'unknown MPE controller: detected on its third channel, toast „' + r.msg + '“');
    ok(r.mpe && r.mb === 48, 'after detection its notes bend on their own (48 semitones) ' + JSON.stringify(r));
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- relative encoders: signed bit learned one way, corrected at the first impossible value ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Encoder Box']] } });
    const r = await ev(page, async () => {
      const M = window.__M, S = window.__send;
      M.setParam('dly.mix', 0.5);
      M.MAP.user = [{ dev: 'Encoder Box', ch: -1, type: 'cc', num: 21, target: 'dly.mix', mode: 'rel2c' }]; M.MAP.v++;
      S([0xb0, 21, 1]); M.mapFlush(); const a = M.P['dly.mix'];
      S([0xb0, 21, 65]); M.mapFlush(); const b = M.P['dly.mix'];
      S([0xb0, 21, 66]); M.mapFlush(); const c = M.P['dly.mix'];
      const saved = JSON.parse(localStorage.getItem('myzel.midimap.v1')).binds[0].mode;
      // a profile's binding is not rewritten (MiniLab 3's preset knob is relBO), but this device reads it as signed bit
      return { a: +a.toFixed(3), b: +b.toFixed(3), c: +c.toFixed(3), mode: M.MAP.user[0].mode, saved };
    });
    ok(r.a === 0.51 && r.b === 0.5 && r.c === 0.48, 'learned rel2c, signed-bit encoder: +1, then 65 → −1 (not −63), 66 → −2: ' + [r.a, r.b, r.c].join(' → '));
    ok(r.mode === 'relSB' && r.saved === 'relSB', 'the binding is signed bit from then on, stored ' + r.saved);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- notes: counted where producers overlap, one note-off elsewhere (until the device shows otherwise) ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard'], ['k2', 'nanoKEY Studio KEYBOARD/CTRL']] } });
    const r = await ev(page, () => {
      const M = window.__M, S = window.__send, has = (id) => M.touches.has(id);
      S([0x90, 60, 100], 'k1'); S([0x90, 60, 90], 'k1'); S([0x80, 60, 0], 'k1');
      const plain = !has('midi-k1-0-60');
      S([0x80, 60, 0], 'k1');   // the second note-off of the doubled note: this device counts
      S([0x90, 62, 100], 'k1'); S([0x90, 62, 90], 'k1'); S([0x80, 62, 0], 'k1');
      const learned = has('midi-k1-0-62'); S([0x80, 62, 0], 'k1'); const gone = !has('midi-k1-0-62');
      S([0x90, 64, 100], 'k2'); S([0x90, 64, 90], 'k2'); S([0x80, 64, 0], 'k2');
      const nks = has('midi-k2-0-64'); S([0x80, 64, 0], 'k2');
      return { plain, learned, gone, nks, nksGone: !has('midi-k2-0-64') };
    });
    ok(r.plain, 'plain keyboard: a repeated note-on ends with the first note-off (as before)');
    ok(r.learned && r.gone, 'after it sent a matched second note-off, the device counts');
    ok(r.nks && r.nksGone, 'nanoKEY Studio (arpeggiator, chord pads) counts from the start');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- expression: shown in the mixer, released when its device goes ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard']] } });
    await ev(page, () => window.__M.openPanel('mix'));
    await page.waitForTimeout(300);
    let r = await ev(page, async () => {
      const M = window.__M; window.__send([0xb0, 11, 0]); await window.__sleep(120);
      return { expr: M.MIDI.expr, txt: M.MX.ch.fin.srcEl.textContent };
    });
    ok(r.expr === 0 && /Ausdruck 0 %/.test(r.txt), 'CC 11 = 0: the Klang strip says „' + r.txt + '“');
    r = await ev(page, async () => { const M = window.__M; window.__midi.unplug('k1'); await window.__sleep(150); return { expr: M.MIDI.expr, txt: M.MX.ch.fin.srcEl.textContent }; });
    ok(r.expr === 1 && !/Ausdruck/.test(r.txt), 'device unplugged: expression back to full, strip „' + r.txt + '“');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- Android: Bluetooth first in the panel, whatever Web MIDI's state ----------
  for (const deny of [false, true]) {
    const { page, errors } = await open({ ua: 'android', vp: [390, 844], touch: true, bt: {}, cfg: { denyMidi: deny }, start: false });
    await page.click('#btnStart'); await page.waitForTimeout(300);
    if (deny) { await ev(page, () => window.__M.midiInit(true)); await page.waitForTimeout(200); }
    await showDev(page); await page.waitForTimeout(150);
    const r = await ev(page, () => {
      const E = window.__M.getDevEls();
      return { st: window.__M.MIDI.state, first: E.goRow.firstElementChild === E.bleAgain ? [...E.goRow.children].find((c) => !c.hidden).dataset.ble || 'midi' : E.goRow.firstElementChild.dataset.ble, vis: [...E.goRow.children].filter((c) => !c.hidden).map((c) => (c.dataset.ble || 'midi') + (c.classList.contains('primary') ? '*' : '')), status: E.midiStatus.textContent, dot: E.midiStatus.dataset.st, toast: document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '' };
    });
    // refused: no „MIDI-Keyboard verbinden“ (only „Erneut versuchen“ below)
    ok(r.vis[0] === 'ask*' && (deny || r.vis.includes('midi')), 'Android, MIDI ' + r.st + ': „Bluetooth-Keyboard koppeln“ first and primary ' + JSON.stringify(r.vis));
    ok(/Bluetooth-Keyboard koppeln/.test(r.status) && r.dot !== 'warn' && !/neu\b|lade die Seite/.test(r.status), 'Android, MIDI ' + r.st + ': neutral status „' + r.status + '“');
    if (deny) ok(!/abgelehnt/.test(r.toast), 'Android, MIDI refused: no alarm toast (' + (r.toast || 'none') + ')');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- the chooser's error stays in the panel ----------
  {
    const { page, errors } = await open({ ua: 'android', vp: [390, 844], touch: true, bt: {} });
    await showDev(page);
    await ev(page, () => { window.__bt.next = { reject: ['NotFoundError', 'User cancelled the requestDevice() chooser.'], after: 80 }; });
    await page.click('[data-ble="ask"]'); await page.waitForTimeout(400);
    let r = await ev(page, () => { const E = window.__M.getDevEls(); return { why: E.bleWhy.hidden ? '' : E.bleWhy.textContent, toast: document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '' }; });
    ok(/Geräte in der Nähe/.test(r.why) && !r.toast, 'missing permission: explained under the Bluetooth button, no toast over it (' + r.why.slice(0, 60) + '…)');
    await page.waitForTimeout(1500);
    await ev(page, () => window.__M.updDevUI());
    r = await ev(page, () => { const E = window.__M.getDevEls(); return E.bleWhy.hidden ? '' : E.bleWhy.textContent; });
    ok(!!r, 'the explanation is still there later');
    await pair(page, { id: 'dev1', name: 'microKEY Air-25' });
    r = await ev(page, () => window.__M.getDevEls().bleWhy.hidden);
    ok(r, 'a chooser that works clears it');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- „Mit microKEY Air-25 starten“: the keyboard of last time, chooser in the same tap ----------
  {
    const { page, errors } = await open({ ua: 'android', vp: [390, 844], touch: true, bt: {}, cfg: { perm: 'granted' }, storage: { 'myzel.ble.v1': JSON.stringify({ name: 'microKEY Air-25', id: 'dev1' }) }, start: false });
    await page.waitForTimeout(300);
    let r = await ev(page, () => { const b = document.querySelector('#btnStartKeys'); return { hidden: b.hidden, txt: b.textContent, st: window.__M.MIDI.state }; });
    ok(!r.hidden && r.txt === 'Mit microKEY Air-25 starten', 'MIDI ' + r.st + ', microKEY Air last time: start screen offers „' + r.txt + '“');
    await ev(page, () => { window.__bt.next = { id: 'dev1', name: 'microKEY Air-25' }; });
    await page.click('#btnStartKeys');
    await page.waitForFunction(() => { const B = [...window.__M.BLE.devs.values()][0]; return B && B.state === 'on'; }, null, { timeout: 5000 }).catch(() => {});
    r = await ev(page, () => ({ reqs: window.__bt.reqs.map((q) => q.active), on: [...window.__M.BLE.devs.values()].map((B) => B.state), started: window.__M.A.started }));
    ok(r.started && r.reqs.length === 1 && r.reqs[0] === true && r.on[0] === 'on', 'one tap: sound on, chooser opened inside the tap, connected ' + JSON.stringify(r));
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  {
    // „Klang starten“ instead: a hint where the keyboard of last time is
    const { page } = await open({ ua: 'android', vp: [390, 844], touch: true, bt: {}, cfg: { perm: 'granted' }, storage: { 'myzel.ble.v1': JSON.stringify({ name: 'microKEY Air-25', id: 'dev1' }) } });
    await page.waitForTimeout(1300);
    const t = await ev(page, () => document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '');
    ok(/Wieder verbinden: microKEY Air-25/.test(t), '„Klang starten“: toast „' + t + '“');
    await page.context().close();
  }
  // ---------- monitor: new rows on top, old ones kept; at most 30; four updates a second ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard']] }, storage: { 'myzel.kcui.v1': JSON.stringify({ mon: true }) } });
    await showDev(page); await page.waitForTimeout(200);
    const r = await ev(page, async () => {
      const M = window.__M, E = M.getDevEls(), S = window.__send, sl = window.__sleep;
      E.monList.scrollIntoView(); await sl(100);   // drawn only while it can be seen
      for (let i = 0; i < 5; i++) S([0xb0, 21, i]);
      await sl(400);
      const n1 = E.monList.children.length, first = E.monList.lastElementChild;
      S([0xb0, 21, 99]); await sl(400);
      const kept = first.isConnected, n2 = E.monList.children.length, top = E.monList.firstElementChild.textContent;
      for (let i = 0; i < 40; i++) S([0xb0, 22, i]);
      await sl(400);
      let adds = 0; const mo = new MutationObserver((l) => { for (const m of l) adds += m.addedNodes.length; }); mo.observe(E.monList, { childList: true });
      for (let i = 0; i < 100; i++) { S([0xb0, 23, i]); await sl(5); }
      await sl(300); mo.disconnect();
      document.querySelector('#sheetBody').scrollTop = 0; await sl(150);
      let hid = 0; const mo2 = new MutationObserver((l) => { for (const m of l) hid += m.addedNodes.length; }); mo2.observe(E.monList, { childList: true });
      for (let i = 0; i < 20; i++) { S([0xb0, 24, i]); await sl(20); }
      await sl(300); mo2.disconnect();
      return { hid, n1, kept, n2, top, n3: E.monList.children.length, adds, t: E.monList.firstElementChild.querySelector('.t').textContent };
    });
    ok(r.n1 === 5 && r.kept && r.n2 === 6 && /CC 21 = 99/.test(r.top), 'monitor: a new message is added on top, the rows before stay (' + r.n1 + ' → ' + r.n2 + ')');
    ok(r.n3 === 30 && r.adds <= 30 * 3, 'monitor: at most 30 rows; 100 messages in ~1 s added ' + r.adds + ' rows (few redraws)');
    ok(/^\d+,\d\d s$/.test(r.t), 'monitor time with its unit: ' + r.t);
    ok(r.hid === 0, 'monitor scrolled out of sight: nothing drawn (' + r.hid + ' rows added)');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- learn: focus stays in the banner; targets found by the words people type ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard']] } });
    await showDev(page); await page.waitForTimeout(200);
    await page.focus('.kc-learn'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    let r = await ev(page, () => ({ on: window.__M.LEARN.on, inBar: document.querySelector('.mlearn-bar').contains(document.activeElement), tag: document.activeElement.className }));
    ok(r.on && r.inBar, 'learn started from the keyboard: focus in the banner (' + r.tag + ')');
    await page.keyboard.type('klang pegel'); await page.waitForTimeout(100);
    r = await ev(page, () => [...document.querySelectorAll('.mlearn-bar .ml-list button')].map((b) => b.textContent));
    ok(r[0] === 'Mixer · Klang · Pegel', '„klang pegel“ finds the Klang fader first: ' + r.slice(0, 3).join(' / '));
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    r = await ev(page, () => ({ tgt: window.__M.LEARN.tgt, inBar: document.querySelector('.mlearn-bar').contains(document.activeElement), tag: document.activeElement.tagName }));
    ok(r.tgt === 'xfin.vol' && r.inBar, 'picked from the list: target ' + r.tgt + ', focus still in the banner (' + r.tag + ')');
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    r = await ev(page, () => ({ on: window.__M.LEARN.on, back: document.activeElement.classList.contains('kc-learn') }));
    ok(!r.on && r.back, 'Escape ends learn, focus back on „Zuweisen“');
    r = await ev(page, () => { const M = window.__M, q = (s) => M.mapSearch(s).map((t) => t.key); return { mixer: q('mixer').length, fader: q('fader'), master: q('master'), laut: q('lautstärke'), expr: q('ausdruck') }; });
    ok(r.mixer > 10 && r.fader.includes('xfin.vol') && r.master[0] === 'mst.vol' && r.laut.includes('xeb2.vol') && r.expr.includes('expr'), 'search: mixer ' + r.mixer + ', fader → ' + r.fader.slice(0, 3) + ', master → ' + r.master[0] + ', lautstärke → ' + r.laut.slice(0, 4));
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- clock out to a device whose Start comes back: its echo is dropped, its own Play button still works ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'nanoKEY Studio']], outs: [['o1', 'nanoKEY Studio']] } });
    const r = await ev(page, async () => {
      const M = window.__M, S = window.__send, sl = window.__sleep, out = window.__midi.outputs.get('o1');
      M.midiSetClockOut([...M.MIDI.outs.values()][0], true);
      M.seqStart(); await sl(30);
      const fa = out.sent.filter((x) => x.d[0] === 0xfa).length;
      S([0xfa]); await sl(250);   // the echo of our Start, 30 ms later
      const fa2 = out.sent.filter((x) => x.d[0] === 0xfa).length;
      M.seqStop(); await sl(400);
      S([0xfa]); await sl(250);   // the device's own Play, long after: the standing Puls starts
      const on = M.SEQ.on;
      M.seqStop();
      return { fa, fa2, on };
    });
    ok(r.fa === 1 && r.fa2 === 1, 'our Start echoed back within 300 ms: ignored, no second Start sent (' + r.fa + ' → ' + r.fa2 + ')');
    ok(r.on, 'Start from the clocked device while the Puls stands: the Puls starts');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---------- wording: brightness is colour, not pitch ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'microKEY Air-25']] } });
    const r = await ev(page, () => {
      const M = window.__M, s = M.MIDI.srcs.get('k1'), w = (n) => M.kcWhat(s, { type: 'cc', ch: 0, num: n, val: 64 });
      const mk = M.MPROF.find((p) => p.id === 'mk').ctrls.map((c) => c.join(': ')).join(' | ');
      return { cc1: w(1), cc2: w(2), cc67: w(67), up: M.MTARGETS.get('up').label, dark: M.MTARGETS.get('dark').label, xy: M.MTARGETS.get('xy.y').label, mk };
    });
    ok(r.cc1 === 'Klangfarbe heller' && r.cc2 === 'Klangfarbe dunkler' && r.cc67 === 'Leisepedal', 'monitor words: CC 1 ' + r.cc1 + ', CC 2 ' + r.cc2 + ', CC 67 ' + r.cc67);
    ok(!/\bHöhe\b(?! auf)|tiefer/i.test(r.mk + r.xy + r.dark) && /Klangfarbe/.test(r.up), 'targets and the microKEY card speak of colour: ' + r.up + ' / ' + r.dark + ' / ' + r.xy + ' / ' + r.mk);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
