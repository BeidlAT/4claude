// Gestik in Zuweisen: a source like a keyboard but no MIDI port (no toast, no extra strings, no MIDI light, no status
// line change), the device light and the monitor throttled, learn picking the axis with the largest deliberate
// excursion (sideways, forward, Drehen), a shake learned as Schütteln (not as an axis), a tap on an axis in the card,
// bindings acting, the editor's Ruhezone/Glätte/Kurve (stored, Glätte gliding on after the phone stops), the
// Zuordnungen on an iPad-like browser, Gestik switched by a learned pad.   node t-gk-learn.js
const { open, ok, close, gestikOn } = require('./gk-h');
// a smooth change of the running sensor's pose
const glide = (page, from, to, ms = 500) => page.evaluate(async ([a, b, ms]) => { for (let i = 1; i <= 10; i++) { const k = i / 10; window.__setPose({ beta: a.beta + (b.beta - a.beta) * k, roll: a.roll + (b.roll - a.roll) * k }); await window.__sleep(ms / 10); } }, [from, to, ms]);
const user = (page) => page.evaluate(() => window.__M.MAP.user.filter((b) => b.dev === 'Gestik').map((b) => ({ type: b.type, num: b.num, target: b.target, mode: b.mode, ch: b.ch, dz: b.dz, sm: b.sm, cv: b.cv })));
(async () => {
  {
    const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => ({ ports: [...window.__M.MIDI.ports.values()], status: document.querySelector('.kc-status').textContent, dot: document.querySelector('#midiDot').className, mx: window.__M.KC.mx ? window.__M.KC.mx.hidden : null }));
    await page.evaluate(() => document.querySelector('#toast').classList.remove('show'));
    await gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ ports: [...window.__M.MIDI.ports.values()], status: document.querySelector('.kc-status').textContent, dot: document.querySelector('#midiDot').className, mx: window.__M.KC.mx ? window.__M.KC.mx.hidden : null, toast: document.querySelector('#toast').classList.contains('show') ? document.querySelector('#toastMsg').textContent : '', src: window.__M.MIDI.srcs.get('gestik') && window.__M.MIDI.srcs.get('gestik').kind }));
    ok(JSON.stringify(after.ports) === JSON.stringify(before.ports) && after.ports.length === 1, 'MIDI.ports unchanged (' + after.ports.join(', ') + ') – so no extra strings, no mixer learn button');
    ok(after.status === before.status && after.dot === before.dot && after.mx === before.mx, 'status line, MIDI light and mixer button unchanged ("' + after.status.slice(0, 40) + '…")');
    ok(!after.toast && after.src === 'motion', 'no toast; the source is of kind "motion"');
    // the device light: a trembling hand never lights it, a deliberate tilt does
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    const acts = await page.evaluate(async () => { const s = window.__M.GK.src, a = []; let last = s.act; for (let i = 0; i < 40; i++) { await window.__sleep(25); if (s.act !== last) { a.push(s.act); last = s.act; } } return a.length; });
    ok(acts === 0, 'holding still (tremor): the device light stays dark');
    // ---- learn ----
    await page.click('.kc-learn');
    await page.waitForTimeout(150);
    let banner = await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent);
    ok(/neige das Handy/.test(banner), 'the banner names the phone: "' + banner + '"');
    await page.evaluate(() => window.__M.learnPick('flt.freq'));
    await glide(page, { beta: 45, roll: 0 }, { beta: 47, roll: 20 });
    await page.waitForTimeout(700);
    let u = await user(page);
    ok(u.length === 1 && u[0].type === 'axis' && u[0].num === 0 && u[0].target === 'mod.flt' && u[0].mode === 'abs' && u[0].ch === -1, 'a sideways tilt (with a little forward) learns Neigen ↔ → Filter – as Formen · Filter (Gestik never writes the patch) ' + JSON.stringify(u[0]));
    await glide(page, { beta: 47, roll: 20 }, { beta: 45, roll: 0 }, 300);
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__M.learnPick('dly.mix'));
    await glide(page, { beta: 45, roll: 0 }, { beta: 22, roll: -3 });
    await page.waitForTimeout(700);
    u = await user(page);
    ok(u.length === 2 && u[1].num === 1 && u[1].target === 'mod.dly', 'the top edge tilted away learns Neigen ↕ → Echo (Formen · Echo-Anteil)');
    // Drehen: a turn about the vertical (rotation rates, gravity unchanged)
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__M.learnPick('rev.mix'));
    await page.evaluate(async () => {
      window.__sensor(false);
      const b = (22 * Math.PI) / 180, up = [0, Math.sin(b), Math.cos(b)], L = [];
      for (let t = 0; t <= 900; t += 1000 / 60) { const w = t < 400 ? -200 * Math.sin((Math.PI * t) / 400) : 0; L.push({ t, g: up.map((x) => x * 9.81), a: [0, 0, 0], r: up.map((x) => x * w + (Math.random() - 0.5) * 4) }); }
      await window.__dmPlay(L);
      window.__sensor(true, { beta: 22, roll: 0 });
    });
    await page.waitForTimeout(700);
    u = await user(page);
    ok(u.length === 3 && u[2].type === 'axis' && u[2].num === 3 && u[2].target === 'mod.rev', 'turning it like a knob learns Drehen → Hall (Formen · Hall-Anteil) ' + JSON.stringify(u[2] || null));
    // a shake: Schütteln, never an axis
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__M.learnPick('freeze'));
    await page.evaluate(async () => {
      window.__sensor(false);
      const b = (22 * Math.PI) / 180, up = [0, Math.sin(b), Math.cos(b)], L = [];
      for (let t = 0; t <= 1300; t += 1000 / 60) { const l = t < 1100 ? [16 * Math.sin((2 * Math.PI * 5 * t) / 1000), 3 * Math.sin((2 * Math.PI * 5 * t) / 1000), 0] : [0, 0, 0], r = t < 1100 ? [120 * Math.cos((2 * Math.PI * 5 * t) / 1000), 0, 80 * Math.cos((2 * Math.PI * 5 * t) / 1000)] : [0, 0, 0]; L.push({ t, g: up.map((x, i) => x * 9.81 + l[i]), a: l, r }); }
      await window.__dmPlay(L);
      window.__sensor(true, { beta: 22, roll: 0 });
    });
    await page.waitForTimeout(700);
    u = await user(page);
    ok(u.length === 4 && u[3].type === 'gest' && u[3].num === 2 && u[3].target === 'freeze' && u[3].mode === 'toggle', 'a shake learns Schütteln → Echo einfrieren (umschalten) ' + JSON.stringify(u[3] || null));
    // a tap on an axis in the card: Ladung, without shaking
    await page.waitForTimeout(900);
    await page.click('.gk-ax[data-gk="axis:4"]');
    banner = await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent);
    ok(/Gestik · Ladung – tippe jetzt auf das Ziel/.test(banner), 'a tap on "Ladung" in the card captures it: "' + banner + '"');
    await page.evaluate(() => window.__M.learnPick('cho.mix'));
    await page.waitForTimeout(100);
    u = await user(page);
    ok(u.length === 5 && u[4].type === 'axis' && u[4].num === 4 && u[4].target === 'mod.cho', 'Ladung → Schweben (Formen · Schweben-Anteil)');
    await page.click('.mlearn-bar .btn:not(.ghost)');   // Fertig
    // ---- bindings act (Immer: no note needed) ----
    await page.waitForTimeout(300);
    const f0 = await page.evaluate(() => [window.__M.P['flt.freq'], window.__M.modVal('flt')]);
    await glide(page, { beta: 22, roll: 0 }, { beta: 22, roll: 25 });
    await page.waitForTimeout(400);
    const f1 = await page.evaluate(() => [window.__M.P['flt.freq'], window.__M.modVal('flt')]);
    ok(f1[1] > f0[1] + 0.4 && f1[0] === f0[0], 'tilting right opens the learned Filter through the mod layer (deflection ' + f0[1].toFixed(2) + ' → ' + f1[1].toFixed(2) + '; the patch keeps ' + Math.round(f1[0]) + ' Hz)');
    const rows = await page.evaluate(() => [...document.querySelectorAll('.kc-bg')].filter((g) => /Gestik/.test(g.querySelector('.kc-bgh b').textContent)).map((g) => [...g.querySelectorAll('.kc-b')].map((r) => r.querySelector('.kc-bc').textContent + ' ' + r.querySelector('.kc-bt').textContent)));
    ok(rows.length === 1 && rows[0].length === 5 && /^Neigen ↔ → Formen · Filter/.test(rows[0][0]) && rows[0].some((r) => /^Schütteln → Echo einfrieren/.test(r)) && !/Standard/.test(JSON.stringify(rows)), 'the Zuordnungen list Gestik like a device, without General MIDI defaults: ' + JSON.stringify(rows[0].slice(0, 2)));
    // ---- the editor: Ruhezone, Glätte, Kurve ----
    const edBtn = page.locator('.kc-bg', { hasText: 'Gestik' }).locator('.kc-be').first();
    await edBtn.click();
    const ed = await page.evaluate(() => { const e = document.querySelector('.kc-ed'); return { labs: [...e.querySelectorAll('.kc-rng span:first-child, .lab')].map((x) => x.textContent), rel: [...e.querySelectorAll('.chip')].filter((c) => /relativ/.test(c.textContent) && !c.hidden).length }; });
    ok(ed.labs.includes('Ruhezone') && ed.labs.includes('Glätte') && ed.labs.includes('Kurve') && ed.rel === 0, 'the editor of an axis: Ruhezone, Glätte, Kurve; no relative modes (' + ed.labs.join(', ') + ')');
    await page.evaluate(() => { const i = document.querySelector('.kc-ed input[aria-label="Glätte"]'); i.value = 100; i.dispatchEvent(new Event('change')); const z = document.querySelector('.kc-ed input[aria-label="Ruhezone"]'); z.value = 10; z.dispatchEvent(new Event('change')); });
    await page.click('.kc-ed .chip:has-text("Fein")');
    u = await user(page);
    ok(u[0].sm === 1 && u[0].dz === 0.1 && u[0].cv === 1, 'stored on the binding: Glätte 100 %, Ruhezone 10 %, Kurve fein');
    // Glätte: a sudden tilt is followed slowly and still after the phone stopped
    await page.evaluate(() => window.__setPose({ beta: 22, roll: 0 }));
    await page.waitForTimeout(2500);
    const g = await page.evaluate(async () => { window.__setPose({ beta: 22, roll: 30 }); const v = []; for (let i = 0; i < 12; i++) { await window.__sleep(100); v.push(1000 + 1000 * window.__M.modVal('flt')); } return { v, smo: window.__M.GK.smo.size }; });
    const rising = g.v.every((x, i) => i === 0 || x >= g.v[i - 1] - 1) && g.v[11] > g.v[3] * 1.05;
    ok(rising, 'Glätte: the Filter glides up over a second, not at once (' + g.v.filter((x, i) => i % 3 === 0).map(Math.round).join(' → ') + ')');
    // reload: the binding keeps its shaping
    await page.click('.kc-ed .btn:has-text("Fertig")');
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    const kept = await page.evaluate(() => window.__M.MAP.user.filter((b) => b.dev === 'Gestik' && b.type === 'axis' && b.num === 0).map((b) => [b.dz, b.sm, b.cv]));
    ok(JSON.stringify(kept) === '[[0.1,1,1]]', 'after a reload the binding still has Ruhezone, Glätte and Kurve');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- the monitor shows Gestik, a few times a second at most ----
  {
    const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } });
    await gestikOn(page);
    await page.evaluate(() => { window.__M.gkSet('clutch', 'immer'); window.__M.kcMonOn(true); window.__sensor(true, { beta: 45, roll: 0 }); });
    await page.waitForTimeout(300);
    await page.evaluate(async () => { for (let i = 0; i < 40; i++) { window.__setPose({ beta: 45 - 15 * Math.sin(i / 6), roll: 25 * Math.sin(i / 4) }); await window.__sleep(50); } });
    const m = await page.evaluate(() => { const L = window.__M.KCM.list.filter((r) => r.name === 'Gestik'), per = {}; for (const r of L) per[r.ev.num] = (per[r.ev.num] || 0) + 1; return { n: L.length, per, txt: L.slice(0, 2).map((r) => r.ev.type === 'axis' ? 'ok' : r.ev.type) }; });
    ok(m.n > 0 && Object.values(m.per).every((c) => c <= 9), '2 s of tilting: the monitor shows Gestik at most 4× a second per axis (' + JSON.stringify(m.per) + ')');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- an iPad-like browser: no Web MIDI, no Bluetooth – Gestik brings the Zuordnungen ----
  {
    const { page, errors } = await open({ cfg: { noMidi: true, perm: 'gesture' } });
    await page.evaluate(() => { try { delete Navigator.prototype.bluetooth; } catch (e) {} });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.evaluate(() => window.__M.updDevUI());
    const pre = await page.evaluate(() => ({ none: window.__M.kcNone(), noMidi: window.__M.kcNoMidi(), map: document.querySelector('.kc-learn').closest('.sec').hidden }));
    ok(!pre.none && pre.noMidi && pre.map, 'no MIDI, no Bluetooth: kcNone is false (Gestik exists); the Zuordnungen wait for Gestik');
    await page.click('[data-gk="on"]');
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
    await page.waitForTimeout(400);
    const post = await page.evaluate(() => { const sec = (el) => el.closest('.sec'); const E = window.__M.getDevEls(); return { map: E.mapSec.hidden, set: E.setSec.hidden, mon: E.monSec.hidden }; });
    ok(!post.map && post.set && post.mon, 'Gestik on: Zuordnungen shown; keyboard settings and MIDI monitor stay hidden');
    await page.click('.kc-learn');
    await page.waitForTimeout(150);   // the banner speaks a frame after it appears
    const banner = await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent);
    ok(/^Neige oder bewege das Handy – oder tippe in der Gestik-Karte auf eine Achse\.$/.test(banner), 'learn without a keyboard: "' + banner + '"');
    await page.evaluate(() => window.__M.learnPick('rev.mix'));
    await glide(page, { beta: 45, roll: 0 }, { beta: 45, roll: -22 });
    await page.waitForTimeout(700);
    const u = await user(page);
    ok(u.length === 1 && u[0].num === 0 && u[0].target === 'mod.rev', 'learning works without any MIDI');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- a pad switches Gestik off and on (learned like any target) ----
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard']] } });
    await gestikOn(page);
    await page.evaluate(() => { window.__M.MAP.user.push({ dev: 'Testkeyboard', ch: -1, type: 'note', num: 36, target: 'gk.on', mode: 'toggle' }); window.__M.MAP.v++; });
    await page.evaluate(() => { window.__send([0x90, 36, 100]); window.__send([0x80, 36, 0]); });
    const a = await page.evaluate(() => window.__M.GK.on);
    await page.evaluate(() => { window.__send([0x90, 36, 100]); window.__send([0x80, 36, 0]); });
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
    await page.waitForTimeout(300);
    const b = await page.evaluate(() => ({ on: window.__M.GK.on, live: window.__M.GK.live }));
    ok(!a && b.on && b.live, 'a learned pad "Gestik an/aus" switches it off and on again');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
