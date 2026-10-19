// Hexenring – the controls (SPEC §17; tests §22): every hx.* target of the registry; learn gives hx.korb, hx.haupt and
// hx.schicht the momentary mode (their release counts); a pad on the Hauptknopf (tap, push-to-talk), on the Korb (tap
// harvests; held while the harvest still waits: layers into the Fokus while held), on the Schicht (committed at the
// release); the Fährte's old bindings migrate; the pedal profiles with the learn step's hold test (a page-turner that
// sends down and up at once: the tap-only profile is offered and says what is lost); a learned pedal key is taken
// before a focused mixer knob (it does not step), an unlearned arrow still steps it; the computer's keys (Space, E,
// 1–8, Ctrl+Z, Ctrl+Shift+Z) with the note row still playing; rail buttons keep no focus; the nanoKONTROL2's Hexenring
// page on SET (its binds, the LED via MIDI out, the field's hint); the nanoKEY Studio's chip „Pads: Spuren /
// Hexenring“; „Hinlegen erntet“ as a binding of Ruhe.   node t-hx-ctl.js
const G = require('./hx-g'), H = require('./hx-h'), MH = require('../midi-tests/h');
const { ok } = H;
const BPM = 150;
(async () => {
  // a stored Fährte binding of the old kind, to see it migrate; the old „Hinlegen wird Schleife“ setting
  const storage = { 'myzel.midimap.v1': JSON.stringify({ v: 1, binds: [{ dev: 'Testkeyboard', ch: 0, type: 'note', num: 60, target: 'fae', mode: 'momentary' }, { dev: 'Testkeyboard', ch: 0, type: 'note', num: 61, target: 'fae.take', mode: 'trigger' }, { dev: 'Testkeyboard', ch: 0, type: 'note', num: 62, target: 'fae.rec', mode: 'trigger' }, { dev: 'Testkeyboard', ch: 0, type: 'note', num: 63, target: 'fae.clear', mode: 'trigger' }] }),
    'myzel.faehrte.v1': JSON.stringify({ len: 2, fade: 0.85, trim: 0, hin: true, seen: true }) };
  const { page, errors } = await MH.open({ url: H.URL_HX, cfg: { ins: [['k1', 'Testkeyboard'], ['n2', 'nanoKONTROL2'], ['nk', 'nanoKEY Studio']], outs: [['n2o', 'nanoKONTROL2']], storage } });
  await H.tools(page); await G.gtools(page);
  await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(async (BPM) => { const M = window.__M; M.setParam('v.human', 0); M.setParam('rev.mix', 0.1); M.setParam('dly.mix', 0); await window.__reset(); window.__grid(BPM); await window.__sleep(300); }, BPM);

  // ---- the targets, the migration ----
  let r = await ev(() => {
    const M = window.__M, want = ['hx.korb', 'hx.haupt', 'hx.zurueck', 'hx.wieder', 'hx.leeren', 'hx.schicht', 'hx.form', 'hx.kern', 'hx.luecke', 'hx.schluss', 'hx.lob', 'hx.nein', 'hx.anker', 'hx.gaertner'];
    for (let n = 1; n <= 8; n++) want.push('hx.ring.' + n, 'hx.ring.' + n + '.pegel', 'hx.ring.' + n + '.eigensinn');
    const miss = want.filter((k) => !M.MTARGETS.has(k)), cont = ['hx.ring.3.pegel', 'hx.ring.3.eigensinn', 'hx.gaertner'].every((k) => M.MTARGETS.get(k).cont);
    const mig = M.MAP.user.filter((b) => b.dev === 'Testkeyboard').map((b) => b.num + ':' + b.target);
    return { miss, cont, mig, fae: [...M.MTARGETS.keys()].filter((k) => k.startsWith('fae')), hin: M.MAP.user.some((b) => b.type === 'gest' && b.num === 1 && b.target === 'hx.hin'), hinOld: M.FA.p.hin };
  });
  ok(!r.miss.length && r.cont, `every hx.* target of SPEC §17 is in the registry (${r.miss.length ? 'missing ' + r.miss.join(' ') : 'all'}); levels, Eigensinn and the Gärtner are knobs`);
  ok(r.mig.join() === '60:hx.korb,61:hx.korb,62:hx.haupt,63:hx.zurueck' && !r.fae.length, `the Fährte's old bindings migrate: fae, fae.take → Korb, fae.rec → Hauptknopf, fae.clear → ↶ (${r.mig.join(' ')}); its targets are gone`);
  ok(r.hin && r.hinOld === false, '„Hinlegen wird Schleife“ (the old setting) became a binding of Ruhe to „Hinlegen erntet“ (hx.hin)');

  // ---- learn: momentary for the Korb, the Hauptknopf, the Schicht; a button for ↶ ----
  r = await ev(async () => {
    const M = window.__M, out = {};
    M.midiLearn(true);
    let n = 36;
    for (const k of ['hx.korb', 'hx.haupt', 'hx.schicht', 'hx.zurueck', 'hx.ring.2']) {
      M.learnPick(k); window.__send([0x90, n, 100], 'k1'); window.__send([0x80, n, 0], 'k1');
      await window.__sleep(500);
      const b = M.MAP.user.find((x) => x.num === n && x.type === 'note');
      out[k] = b && b.target === k ? b.mode : 'none';
      n++;
    }
    M.midiLearn(false);
    return out;
  });
  ok(r['hx.korb'] === 'momentary' && r['hx.haupt'] === 'momentary' && r['hx.schicht'] === 'momentary' && r['hx.zurueck'] === 'trigger' && r['hx.ring.2'] === 'trigger', `learn: a pad on the Korb, the Hauptknopf, the Schicht is „halten“ (momentary – their release counts); ↶ and a ring are buttons (${JSON.stringify(r)})`);

  // ---- the learned pads act: Hauptknopf tap / push-to-talk; Korb tap; Korb held while its harvest waits: layers ----
  r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, o = {}, beat = 60 / BPM;
    M.setParam('hx.start', 'takt'); M.setParam('hx.laenge', 'auto');
    // push-to-talk: pad 37 pressed just after a bar line (that bar line), held for two bars
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.2) / 4) * 4;
    await window.__until(M.tgTime(B0) + 0.05);
    window.__riff(M.tgTime(B0), beat, [0, 4, 7, 4], 2, { eng: 'glo', dur: 0.2 });
    window.__send([0x90, 37, 100], 'k1');
    o.rec = M.HX.rec && M.HX.rec.phase;
    await window.__until(M.tgTime(B0 + 8) - 0.05);
    window.__send([0x80, 37, 0], 'k1');
    await window.__sleep(200);
    const L = M.hxLoopsLive()[0];
    o.ptt = L && { beats: L.d.beats, rec: !!M.HX.rec };
    // the Korb pad tapped later in a bar: its harvest waits for the bar line …
    await window.__until(M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime) / 4) * 4) + 0.5);
    window.__riff(A.ctx.currentTime + 0.05, beat / 2, [9, 11, 12, 11], 2, { eng: 'mem', dur: 0.1 });
    await window.__sleep(500);
    window.__send([0x90, 36, 100], 'k1');
    const p = M.HX.pend.find((x) => x.kind === 'ernte' || x.kind === 'schicht');
    o.korbPend = !!p;
    // … held on (0.7 s): the pedal rule – it was still waiting, so the hold takes it back and layers into the Fokus
    await window.__sleep(750);
    o.punch = !!(M.HX.punch && M.HX.punch.korb); o.pendGone = !M.HX.pend.some((x) => x === p);
    await window.__sleep(900);
    window.__send([0x80, 36, 0], 'k1');
    await window.__sleep(200);
    o.after = { punch: !!M.HX.punch, sch: L.sch.length, loops: M.hxLoopsLive().length };
    // the Schicht pad: nothing at the press, a Schicht at the release
    const n0 = L.sch.length;
    window.__send([0x90, 38, 100], 'k1'); await window.__sleep(300); o.atPress = L.sch.length - n0;
    window.__send([0x80, 38, 0], 'k1'); await window.__sleep(200); o.atRelease = L.sch.length - n0;
    return o;
  }, BPM);
  ok(r.rec === 'rec' && r.ptt && r.ptt.beats === 8 && !r.ptt.rec, `a pad on the Hauptknopf: pressed it records, held two bars and let go – push-to-talk closes it (${r.ptt && r.ptt.beats} beats)`);
  ok(r.korbPend && r.punch && r.pendGone && !r.after.punch && r.after.sch >= 2 && r.after.loops === 1, `a pad on the Korb: its harvest waited for the bar line – held, it took that back and layered into the Fokus while held (${r.after.sch} Schichten, ${r.after.loops} Schleife)`);
  ok(r.atPress === 0 && r.atRelease === 1, '„Durchgang als Schicht“ on a pad: nothing at the press, the Schicht at the release');

  // ---- pedals: the learn step tests hold; a page-turner gets the tap-only profile, the card says what is lost ----
  r = await ev(async () => {
    const M = window.__M, o = {}, kd = (code, key, repeat) => window.dispatchEvent(new KeyboardEvent('keydown', { code, key, repeat: !!repeat, bubbles: true, cancelable: true })), ku = (code, key) => window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
    M.hxPedLearn('zwei');
    o.s0 = M.HXPED.learn.say;
    kd('PageDown', 'PageDown'); ku('PageDown', 'PageDown'); await window.__sleep(50);   // A: a tap …
    kd('PageDown', 'PageDown'); for (let i = 0; i < 6; i++) { await window.__sleep(120); kd('PageDown', 'PageDown', true); } ku('PageDown', 'PageDown');   // … then held 0.8 s (the key repeats meanwhile)
    o.s1 = M.HXPED.learn.say;
    kd('PageUp', 'PageUp'); ku('PageUp', 'PageUp'); await window.__sleep(50);   // B: a page-turner – down and up at once, also when held
    kd('PageUp', 'PageUp'); await window.__sleep(4); ku('PageUp', 'PageUp');
    await window.__sleep(50);
    o.stage = M.HXPED.learn && M.HXPED.learn.stage; o.say = M.HXPED.learn && M.HXPED.learn.say;
    M.hxCardOpen(); await window.__sleep(400);
    o.offer = [...document.querySelectorAll('.hx-ped button')].map((b) => b.textContent);
    [...document.querySelectorAll('.hx-ped button')].find((b) => b.textContent === 'Nur tippen übernehmen').click();
    await window.__sleep(100);
    const P0 = M.hxPedGet(); o.saved = P0 && { prof: P0.prof, hold: P0.hold, sw: P0.sw.map((s) => s.id + ':' + s.code + ':' + s.fn + ':' + s.mode) };
    return o;
  });
  ok(/Schalter A/.test(r.s0) && /Schalter B/.test(r.s1), `pedals, two switches: the learn asks for each („${r.s0}“ … „${r.s1}“)`);
  ok(r.stage === 'offer' && /kann nicht halten/.test(r.say) && /Zurück durch Halten/.test(r.say) && r.offer.includes('Nur tippen übernehmen') && r.offer.includes('Noch einmal'), `  a page-turner that cannot hold (down and up at once): the tap-only profile is offered with what is lost („${r.say}“)`);
  ok(r.saved && r.saved.prof === 'zwei' && !r.saved.hold && r.saved.sw.join() === 'A:PageDown:hx.korb:trigger,B:PageUp:hx.schicht:trigger', `  taken: ${r.saved && r.saved.sw.join(', ')}`);
  // a pedal that holds: the full profile
  r = await ev(async () => {
    const M = window.__M, kd = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true })), ku = (code) => window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true, cancelable: true }));
    M.hxPedLearn('zwei');
    for (const c of ['PageDown', 'PageUp']) { kd(c); ku(c); await window.__sleep(30); kd(c); await window.__sleep(700); ku(c); await window.__sleep(30); }
    const P0 = M.hxPedGet(); return P0 && { hold: P0.hold, sw: P0.sw.map((s) => s.id + ':' + s.fn + ':' + s.mode) };
  });
  ok(r && r.hold && r.sw.join() === 'A:hx.korb:momentary,B:hx.pedb:momentary', `  a pedal that holds (down … up after 0.7 s): the full profile (${r && r.sw.join(', ')})`);

  // ---- a learned pedal key goes before a focused mixer knob; an unlearned arrow still steps it (real key presses) ----
  await ev(async () => { const M = window.__M; M.closePanel(); M.openPanel('mix'); await window.__sleep(900);
    const kn = [...document.querySelectorAll('.mx-kn')].find((k) => k.offsetParent && k.getBoundingClientRect().height > 10 && k.closest('[data-pid]'));
    kn.id = 'hxTestKnob'; await window.__sleep(2600); document.getElementById('hxLive').textContent = ''; });
  await page.focus('#hxTestKnob');
  let k0 = await ev(() => { const kn = document.getElementById('hxTestKnob'), id = kn.closest('[data-pid]').dataset.pid; return { id, v: window.__M.P[id], focus: document.activeElement === kn }; });
  await page.keyboard.down('PageDown'); await page.waitForTimeout(60); await page.keyboard.up('PageDown'); await page.waitForTimeout(150);
  r = await ev((k0) => ({ same: window.__M.P[k0.id] === k0.v, said: document.getElementById('hxLive').textContent }), k0);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  const st = await ev((k0) => window.__M.P[k0.id] !== k0.v, k0);
  await ev(() => { window.__M.closePanel(); window.__M.hxPedClear(); });
  ok(k0.focus && r.same && r.said.length > 0, `a learned pedal key (PageDown) is taken before the focused mixer knob: the knob stays (${k0.id}), the Korb acted („${r.said}“)`);
  ok(st, '  an arrow that is no pedal still steps the focused knob');

  // ---- the computer's keys; the note row plays on; rail buttons keep no focus ----
  r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, o = {}, kd = (code, o2 = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ code, key: code, bubbles: true, cancelable: true }, o2))), ku = (code, o2 = {}) => document.body.dispatchEvent(new KeyboardEvent('keyup', Object.assign({ code, key: code, bubbles: true, cancelable: true }, o2)));
    document.activeElement && document.activeElement.blur();
    await window.__reset(); window.__grid(BPM); await window.__sleep(300);
    M.setParam('hx.start', 'sofort');
    kd('Space'); o.rec = M.HX.rec && M.HX.rec.phase; await window.__sleep(80); ku('Space');
    await window.__sleep(200); o.still = !!M.HX.rec;
    kd('Space'); ku('Space'); await window.__sleep(200);
    o.loops = M.hxLoopsLive().length;
    const B1 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B1), 60 / BPM, [2, 5, 9, 5], 1, { eng: 'glo', dur: 0.2 });
    await window.__until(M.tgTime(B1 + 4) + 0.05);   // (just after the bar line: the harvest enters at once)
    const h0 = M.HX.hist.length; kd('KeyE'); ku('KeyE'); await window.__sleep(150); o.korb = M.HX.hist.length - h0; o.n1 = M.hxLoopsLive().length;
    kd('KeyZ', { ctrlKey: true }); ku('KeyZ', { ctrlKey: true }); await window.__sleep(150); o.n2 = M.hxLoopsLive().length;
    kd('KeyZ', { ctrlKey: true, shiftKey: true }); ku('KeyZ', { ctrlKey: true, shiftKey: true }); await window.__sleep(150); o.n3 = M.hxLoopsLive().length;
    const L = M.hxLoopsLive().find((x) => x.slot === 0);
    kd('Digit1'); ku('Digit1'); await window.__sleep(100); o.ring1 = L ? (L.pendTo || L.state) : null;
    // the note row on the field
    const cv = document.getElementById('cvFx'); cv.focus();
    cv.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true, cancelable: true })); await window.__sleep(50);
    o.note = M.touches.has('key-KeyA');
    cv.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true, cancelable: true }));
    return o;
  }, BPM);
  ok(r.rec === 'rec' && r.still && r.loops === 1, `the computer: Space is the Hauptknopf (a tap starts, a second closes – ${r.loops} Schleife)`);
  ok(r.korb === 1 && r.n1 === 2 && r.n2 === 1 && r.n3 === 2 && r.ring1 === 'stumm', `  E harvests (the Korb: ${r.n1} Schleifen), Ctrl+Z / Ctrl+Shift+Z undo and redo it (${r.n2} → ${r.n3}), 1 taps ring 1 (${r.ring1})`);
  ok(r.note, '  the note row plays on (A on the field is a note)');
  const kb = await page.locator('#hxKorb').boundingBox();
  await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2);
  r = await ev(() => ({ inRail: document.getElementById('hxRail').contains(document.activeElement) }));
  ok(!r.inRail, 'a tap on the Ringleiste leaves no focus there (a page-turner\'s keys reach no button)');

  // ---- the nanoKONTROL2: SET switches to the Hexenring page and back; LED; the field's hint ----
  r = await ev(async () => {
    const M = window.__M, o = {}, cc = (n, v) => window.__send([0xb0, n, v], 'n2'), out = window.__midi.outputs.get('n2o');
    const src = [...M.MIDI.srcs.values()].find((s) => /KONTROL/.test(s.name));
    o.prof = src && src.prof && src.prof.id;
    cc(60, 127); cc(60, 0); await window.__sleep(150);
    o.page = !!src.nkHx; o.led = out.sent.some((m) => m.d.join() === '176,60,127'); o.tag = document.getElementById('hxTag').textContent; o.tagShown = !document.getElementById('hxTag').hidden;
    const L = M.hxLoopsLive()[0];
    for (let v = 127; v >= 40; v -= 3) { cc(0, v); await window.__sleep(8); }   // (a fader moved through where the level is: soft takeover)
    await window.__sleep(150); o.fader = L && +L.gain.toFixed(3);
    const was = L.pendTo || L.state; cc(48, 127); cc(48, 0); await window.__sleep(100); o.m1 = [was, L.pendTo || L.state];
    const e = M.HX.slot.findIndex((x) => !x); cc(64 + e, 127); cc(64 + e, 0); await window.__sleep(100); o.r = !!(M.HX.rec && M.HX.rec.slot === e) || !!M.HX.slot[e];   // (recording into it – with a base length it is made at once)
    M.hxRecCancel(true);
    const h0 = M.HX.hist.length; cc(43, 127); cc(43, 0); await window.__sleep(100); o.undo = M.HX.hist.length < h0 || M.HX.redo.length > 0;
    const vfin = M.P['xfin.vol'];
    cc(60, 127); cc(60, 0); await window.__sleep(150);
    o.back = !src.nkHx; o.ledOff = out.sent.some((m) => m.d.join() === '176,60,0'); o.tag2 = document.getElementById('hxTag').hidden;
    cc(0, 100); await window.__sleep(150); o.mixer = M.P['xfin.vol'] !== vfin;
    return o;
  });
  ok(r.prof === 'nk2' && r.page && r.led && r.tagShown && /Seite Hexenring/.test(r.tag), `nanoKONTROL2: SET switches to the Hexenring page – the SET LED lights (MIDI out), the field says „${r.tag}“`);
  ok(r.fader != null && r.fader < 1 && r.m1[0] !== r.m1[1] && r.r && r.undo, `  there: fader 1 is Schleife 1's level (${r.fader}), M 1 stumm am Takt (${r.m1.join(' → ')}), R on an empty ring records, ◀◀ is ↶`);
  ok(r.back && r.ledOff && r.tag2 && r.mixer, '  SET again: the mixer page (LED off, the hint gone, fader 1 is Klang again)');

  // ---- the nanoKEY Studio's chip: Pads Spuren / Hexenring ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    M.openPanel('dev'); await window.__sleep(500);
    const card = [...document.querySelectorAll('.kc-dev')].find((c) => /nanoKEY Studio/.test(c.getAttribute('aria-label') || ''));
    const chips = card ? [...card.querySelectorAll('.kc-pads .chip')] : [];
    o.chips = chips.map((c) => c.textContent + ':' + c.getAttribute('aria-pressed'));
    const hx = chips.find((c) => c.textContent === 'Hexenring'); if (hx) hx.click();
    await window.__sleep(200);
    const src = [...M.MIDI.srcs.values()].find((s) => /nanoKEY/.test(s.name)), map = M.mapOf(src);
    const t = (n) => { const e = map.get('note:9:' + n); return e && e.p[0] && e.p[0].target; };
    o.pads = [43, 48, 50, 49, 36, 38, 42, 46].map(t);
    const card2 = [...document.querySelectorAll('.kc-dev')].find((c) => /nanoKEY Studio/.test(c.getAttribute('aria-label') || ''));
    o.chips2 = card2 ? [...card2.querySelectorAll('.kc-pads .chip')].map((c) => c.textContent + ':' + c.getAttribute('aria-pressed')) : [];
    M.closePanel();
    return o;
  });
  ok(r.chips.join() === 'Spuren:true,Hexenring:false' && r.chips2.join() === 'Spuren:false,Hexenring:true', `nanoKEY Studio: its card has the chip „Pads: Spuren / Hexenring“ (${r.chips2.join(' ')})`);
  ok(r.pads.join() === 'hx.ring.1,hx.ring.2,hx.ring.3,hx.ring.4,hx.korb,hx.zurueck,hx.form,stille', `  Hexenring: pads 1–4 the Schleifen, 5 Korb, 6 ↶, 7 the next Lichtung, 8 stays Stille (${r.pads.join(' ')})`);

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await MH.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await MH.close(); process.exit(1); });
