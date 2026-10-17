// MIDI learn ("Zuweisen") end to end with real taps: the button in the Gerät panel, the banner, a knob then a mixer
// fader (stem), a generic slider then a knob, the mixer's M button and balance knob, a top-bar action with a pad, the
// searchable list, Enter on a focused control, what learn ignores; then the bindings at work, edit / delete / restore,
// export / import, and persistence across a reload (myzel.midimap.v1, myzel.midiports.v1).   node t-map-learn.js
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['g', 'Generic Keys'], ['nks', 'nanoKEY Studio']] } });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const S = (bytes, id = 'g') => page.evaluate(([b, i]) => window.__send(b, i), [bytes, id]);
  // the banner's words come a frame after it appears (so its live region reads them): wait for them
  const msg = async () => { await page.waitForFunction(() => { const e = document.querySelector('.mlearn-bar .ml-msg'); return !e || e.closest('[hidden]') || e.textContent; }, null, { timeout: 1000 }).catch(() => {}); return page.evaluate(() => { const e = document.querySelector('.mlearn-bar .ml-msg'); return e && !e.closest('[hidden]') ? e.textContent : null; }); };
  const last = () => page.evaluate(() => { const u = window.__M.MAP.user; return u.length ? Object.assign({}, u[u.length - 1]) : null; });

  // arm from the Gerät panel
  await ev(() => window.__M.openPanel('dev'));
  await page.click('.sheet button:text-is("Zuweisen")');
  let r = await ev(() => ({ on: window.__M.LEARN.on, body: document.body.classList.contains('mlearn'), marked: document.querySelectorAll('[data-pid],[data-act]').length }));
  ok(r.on && r.body, '"Zuweisen" in the Gerät panel arms learn');
  ok((await msg()) === 'Bewege einen Regler oder drücke ein Pad am Gerät.', 'banner: ' + (await msg()));

  // 1) a knob, then the mixer's Klang fader (its stem)
  await S([0xb0, 21, 40]); await S([0xb0, 21, 41]); await S([0xb0, 21, 43]);
  ok((await msg()) === 'Generic Keys · Regler CC 21 · Kanal 1 – tippe jetzt auf das Ziel oder suche es.', 'captured: ' + (await msg()));
  await page.click('#tab-mix');
  await page.waitForTimeout(400);
  const v0 = await ev(() => window.__M.P['xfin.vol']);
  await page.click('.mx-st[data-k="fin"] .mx-stem', { position: { x: 20, y: 60 } });
  await page.waitForTimeout(100);
  r = await last();
  ok(r && r.target === 'xfin.vol' && r.num === 21 && r.ch === 0 && r.mode === 'abs' && r.dev === 'Generic Keys', 'tap on the mixer fader assigns it: ' + JSON.stringify(r));
  ok((await ev(() => window.__M.P['xfin.vol'])) === v0, 'the tap did not move the fader');
  ok(/^Zugewiesen: Generic Keys · Regler CC 21 · Kanal 1 → Mixer · Klang · Pegel/.test(await msg()), 'banner confirms: ' + (await msg()));

  // 2) target first: the mixer's M button of Spur 2, then a button on the device (127, 0) → toggle
  const m0 = await ev(() => window.__M.P['xl1.mute']);
  await page.click('.mx-st[data-k="l1"] [data-pid="xl1.mute"]');
  ok(/^Ziel: Mixer · Spur 2 · Stumm – bewege jetzt/.test(await msg()) && (await ev(() => window.__M.P['xl1.mute'])) === m0, 'tap on M (target first): ' + (await msg()));
  await S([0xb0, 23, 127]); await S([0xb0, 23, 0]);
  await page.waitForTimeout(500);
  r = await last();
  ok(r.target === 'xl1.mute' && r.num === 23 && r.mode === 'toggle', 'button on M → toggle binding');

  // 3) the balance knob of Ebene 2 (a gill knob)
  await page.click('.mx-st[data-k="eb2"] .mx-kw[data-pid="xeb2.pan"]');
  await S([0xb0, 24, 60]); await S([0xb0, 24, 61]);
  await page.waitForTimeout(500);
  r = await last();
  ok(r.target === 'xeb2.pan' && r.num === 24, 'mixer knob (balance) assigned');

  // 4) a generic slider (quick strip "Hall"), then a knob
  await page.click('#tab-mix');   // close the mixer
  await page.waitForTimeout(200);
  const h0 = await ev(() => window.__M.P['rev.mix']);
  await page.click('#quick [data-pid="rev.mix"] input');
  ok((await ev(() => window.__M.P['rev.mix'])) === h0 && /^Ziel: Hall · Anteil/.test(await msg()), 'tap on a slider chooses it without moving it');
  await S([0xb0, 22, 10]); await S([0xb0, 22, 12]); await S([0xb0, 22, 15]);
  await page.waitForTimeout(500);
  r = await last();
  ok(r.target === 'rev.mix' && r.num === 22 && r.mode === 'abs', 'knob → Hall (slider) assigned');

  // 5) a top-bar action with a pad on channel 10
  const p0 = await ev(() => window.__M.SEQ.on);
  await page.click('#btnPuls');
  await S([0x99, 40, 100]); await S([0x89, 40, 0]);
  await page.waitForTimeout(500);
  r = await last();
  ok(r.target === 'puls' && r.type === 'note' && r.ch === 9 && r.num === 40 && r.mode === 'toggle' && (await ev(() => window.__M.SEQ.on)) === p0, 'Puls button + pad (ch 10) → toggle, the tap did not start the Puls');

  // 6) from the searchable list
  await S([0xb0, 25, 50]); await S([0xb0, 25, 52]);
  await page.fill('.mlearn-bar input', 'morph');
  const items = await page.$$eval('.mlearn-bar .ml-list button', (l) => l.map((b) => b.textContent));
  await page.click('.mlearn-bar .ml-list button:text-is("Mixer · Morph A↔B")');
  r = await last();
  ok(items.includes('Mixer · Morph A↔B') && r.target === 'morph' && r.num === 25, 'list search "morph" → ' + items.join(' / '));

  // 7) Enter on a focused control picks it (keyboard)
  await page.focus('#quick [data-pid="dly.mix"] input');
  await page.keyboard.press('Enter');
  ok((await ev(() => window.__M.LEARN.tgt)) === 'dly.mix', 'Enter on a focused slider chooses it');

  // 8) what learn ignores: clock and active sensing, a key while a knob target waits (it plays), a brushed wheel
  await S([0xf8]); await S([0xfe]);
  await S([0x90, 60, 100]);
  r = await ev(() => ({ cap: window.__M.LEARN.cap, note: window.__M.touches.has('midi-g-0-60') }));
  await S([0x80, 60, 0]);
  ok(!r.cap && r.note, 'clock, active sensing and keys are not captured while a knob target waits; the key plays');
  await S([0xb0, 1, 60]); await S([0xb0, 1, 64]);
  ok(!(await ev(() => window.__M.LEARN.cap)), 'a mod wheel brushed by 4 is not captured');
  await S([0xb0, 1, 75]);
  await page.waitForTimeout(500);
  r = await last();
  ok(r.target === 'dly.mix' && r.num === 1, 'moved by 10 or more it is: CC 1 → Echo');
  await ev(() => { const M = window.__M, b = M.MAP.user.find((x) => x.num === 1); M.mapDel(M.MIDI.srcs.get('g'), b); });
  ok(!(await ev(() => window.__M.MAP.user.some((x) => x.num === 1))), 'a learned binding can be deleted');

  // 9) Escape ends learn; the "Fertig" button too
  await page.keyboard.press('Escape');
  ok(!(await ev(() => window.__M.LEARN.on)) && (await msg()) === null, 'Escape ends learn (banner gone)');
  await ev(() => window.__M.midiLearn(true));
  await page.click('.mlearn-bar button:text-is("Fertig")');
  ok(!(await ev(() => window.__M.LEARN.on || document.body.classList.contains('mlearn'))), '"Fertig" ends learn');

  // the bindings at work
  r = await ev(async () => {
    const M = window.__M, S = (b, i = 'g') => window.__send(b, i), o = {};
    M.setParam('xfin.vol', 0); S([0xb0, 21, 102]); S([0xb0, 21, 60]); M.mapFlush(); o.vol = M.P['xfin.vol']; o.wantVol = M.mxDb(60 / 127);
    const mu = M.P['xl1.mute']; S([0xb0, 23, 127]); S([0xb0, 23, 0]); o.mute = M.P['xl1.mute'] !== mu; S([0xb0, 23, 127]); S([0xb0, 23, 0]);
    M.setParam('xeb2.pan', 0); S([0xb0, 24, 64]); S([0xb0, 24, 127]); M.mapFlush(); o.pan = M.P['xeb2.pan'];
    M.setParam('rev.mix', 0.45); S([0xb0, 22, 57]); S([0xb0, 22, 100]); M.mapFlush(); o.hall = M.P['rev.mix'];
    const p = M.SEQ.on; S([0x99, 40, 90]); S([0x89, 40, 0]); o.puls = M.SEQ.on !== p; if (M.SEQ.on) M.seqStop();
    o.line = M.mapLine(M.MIDI.srcs.get('g'));
    return o;
  });
  ok(Math.abs(r.vol - r.wantVol) < 0.06 && r.mute && r.pan === 1 && Math.abs(r.hall - 100 / 127) < 0.01 && r.puls, 'learned bindings act: fader law, mute toggle, balance, Hall, Puls by pad');

  // edit: range and invert
  r = await ev(() => {
    const M = window.__M, src = M.MIDI.srcs.get('g'), b = M.MAP.user.find((x) => x.num === 22);
    M.mapEdit(src, b, { min: 0.2, max: 0.6, inv: true, to: false });
    window.__send([0xb0, 22, 127], 'g'); M.mapFlush(); const a = M.P['rev.mix'];
    window.__send([0xb0, 22, 0], 'g'); M.mapFlush();
    return { a, b: M.P['rev.mix'], stored: JSON.parse(localStorage.getItem('myzel.midimap.v1')).binds.find((x) => x.num === 22) };
  });
  ok(Math.abs(r.a - 0.2) < 1e-6 && Math.abs(r.b - 0.6) < 1e-6 && r.stored.inv === true && r.stored.min === 0.2, 'edit: range 20–60 %, inverted (127 → 20 %, 0 → 60 %), stored');
  r = await ev(() => {
    const M = window.__M, src = M.MIDI.srcs.get('g'), b = M.MAP.user.find((x) => x.num === 22);
    M.mapEdit(src, b, { min: 0, max: 1, inv: false });
    window.__send([0xb0, 22, 127], 'g'); M.mapFlush();
    return { v: M.P['rev.mix'], keys: Object.keys(M.MAP.user.find((x) => x.num === 22)).sort().join() };
  });
  ok(r.v === 1 && !/inv|min|max/.test(r.keys) && /to/.test(r.keys), 'edit back to full range, not inverted (the takeover choice stays): ' + r.keys);

  // a profile binding: override by learn, delete, restore
  r = await ev(async () => {
    const M = window.__M, src = M.MIDI.srcs.get('nks'), S = (b) => window.__send(b, 'nks'), o = {};
    M.midiLearn(true); S([0xb0, 20, 64]); S([0xb0, 20, 65]); M.learnPick('cho.mix'); M.midiLearn(false);
    await new Promise((res) => setTimeout(res, 50));
    M.setParam('flt.freq', 1000); M.setParam('cho.mix', 0.5);
    S([0xb0, 20, 64]); S([0xb0, 20, 100]); M.mapFlush();
    o.over = M.P['flt.freq'] === 1000 && Math.abs(M.P['cho.mix'] - 100 / 127) < 0.01;
    o.listed = M.mapList(src).some((x) => x.layer === 'p' && x.b.num === 20 && x.off);
    o.name = M.MAP.user.find((x) => x.num === 20 && x.dev === 'nanoKEY Studio').name;
    // delete the profile's knob 2 (Makro A): it does nothing then
    const pb = M.mapList(src).find((x) => x.layer === 'p' && x.b.num === 21).b;
    M.mapDel(src, pb);
    const a = M.P['neb.cut']; S([0xb0, 21, 0]); S([0xb0, 21, 127]); M.mapFlush(); o.del = M.P['neb.cut'] === a;
    M.mapRestore(src);
    M.setParam('flt.freq', 9000); S([0xb0, 20, 113]); S([0xb0, 20, 20]); M.mapFlush(); o.restored = M.P['flt.freq'] < 200;
    o.users = M.MAP.user.filter((x) => x.dev === 'nanoKEY Studio').length;
    return o;
  });
  ok(r.over && r.listed && r.name === 'Regler 1', 'learn overrides a profile knob (named "Regler 1"); the profile entry is shown as shadowed');
  ok(r.del, 'deleting a profile binding silences that control');
  ok(r.restored && r.users === 0, '"Profil wiederherstellen" brings the profile back');

  // export / import
  r = await ev(() => {
    const M = window.__M, json = M.mapExport(), n = M.MAP.user.length;
    M.mapImport('{"binds": []}', true);
    const empty = M.MAP.user.length;
    const back = M.mapImport(json, true), bad = M.mapImport('nicht json');
    const junk = M.mapImport(JSON.stringify({ binds: [{ type: 'cc', num: 300, target: 'x' }, { type: 'hack', num: 1 }, { type: 'cc', num: 9, ch: 0, target: 'flt.q', mode: 'evil' }] }));
    return { n, empty, back, bad, junk, mode: M.MAP.user.find((b) => b.num === 9).mode, total: M.MAP.user.length };
  });
  ok(r.empty === r.n && r.back === r.n && r.bad === -1, 'export → import restores ' + r.n + ' bindings; unreadable text is refused');
  ok(r.junk === 1 && r.mode === 'abs' && r.total === r.n + 1, 'import cleans entries: bad numbers and types dropped, unknown modes → abs');

  // persistence: reload, start again – the learned bindings and the profile switch are still there
  await ev(() => { const M = window.__M; M.midiSetProfile(M.MIDI.srcs.get('nks'), false); });
  const before = await ev(() => window.__M.MAP.user.length);
  await page.reload();
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart');
  await page.waitForFunction(() => window.__M.MIDI.state === 'ready');
  await page.waitForTimeout(200);
  r = await ev(() => {
    const M = window.__M, S = (b, i = 'g') => window.__send(b, i), o = {};
    o.n = M.MAP.user.length;
    M.setParam('xfin.vol', 0); S([0xb0, 21, 102]); S([0xb0, 21, 60]); M.mapFlush(); o.vol = M.P['xfin.vol']; o.want = M.mxDb(60 / 127);
    o.prof = M.profText(M.MIDI.srcs.get('nks'));
    M.setParam('flt.freq', 9000); S([0xb0, 20, 113], 'nks'); S([0xb0, 20, 20], 'nks'); M.mapFlush(); o.knob = M.P['flt.freq'];
    M.midiSetProfile(M.MIDI.srcs.get('nks'), true);
    return o;
  });
  ok(r.n === before && Math.abs(r.vol - r.want) < 0.06, 'after a reload the learned bindings act (' + r.n + ' from myzel.midimap.v1)');
  ok(/Profil aus/.test(r.prof) && r.knob === 9000, 'after a reload the nanoKEY Studio profile is still off (myzel.midiports.v1)');

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exitCode = 1; close(); });
