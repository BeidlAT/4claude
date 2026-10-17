// Formen in Zuweisen: the group and its targets in the search; a controller learned on a Formen target (abs, rest at
// the bottom, Umkehren the other way, a pitch wheel's rest in the middle, a pad acting while held); Gestik learned on a
// patch parameter takes its Formen counterpart, on one without counterpart it is refused (banner) and waits for
// another target; old bindings of Gestik on a parameter act through the layer; the editor offers an axis only what
// forms; a deleted binding or a device switched off leaves the layer. Gestik's own routes (gkRoute): on/off, a learned
// binding of the same axis wins, Gestik off clears them. Points set ahead (Fährte's way) play as ramps in the audio
// clock.   node t-gm-learn.js
const { open, ok, close, probes, gestikOn } = require('./gm-h');
const glide = (page, from, to, ms = 500) => page.evaluate(async ([a, b, ms]) => { for (let i = 1; i <= 10; i++) { const k = i / 10; window.__setPose({ beta: a.beta + (b.beta - a.beta) * k, roll: a.roll + (b.roll - a.roll) * k }); await window.__sleep(ms / 10); } }, [from, to, ms]);
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } });
  await probes(page);
  // ---- the group ----
  const s = await page.evaluate(() => {
    const M = window.__M, all = M.mapSearch('formen', 60), flt = M.mapSearch('filter', 60).map((r) => r.key);
    return { n: all.filter((r) => r.key.startsWith('mod.')).length, groups: [...new Set(all.filter((r) => r.key.startsWith('mod.')).map((r) => r.group))], flt, name: M.tName(M.mtOf('mod.flt')), keys: Object.keys(M.MODT).length };
  });
  ok(s.n === s.keys && s.n >= 17 && s.groups.length === 1 && s.groups[0] === 'Formen (ohne Preset zu ändern)', 'all ' + s.n + ' targets in their own group "' + s.groups[0] + '"');
  ok(s.flt.includes('mod.flt') && s.flt.includes('flt.freq') && s.name === 'Formen · Filter', 'searching "Filter" finds the knob and Formen · Filter');
  const never = await page.evaluate(() => { const M = window.__M, keys = [...M.MTARGETS.keys()].filter((k) => k.startsWith('mod.')); return keys.filter((k) => /rev\.size|rev\.damp|drv|t\.|sai|v\.eng|v\.oct/.test(k)); });
  ok(!never.length, 'never a target: hall size and damping, distortion, tuning, strings, engine, octave');
  // ---- a controller on Formen ----
  const m = await page.evaluate(async () => {
    const M = window.__M, o = {};
    M.midiLearn(true);
    M.learnPick('mod.flt');
    for (const v of [10, 30, 60]) { window.__send([0xb0, 21, v]); await window.__sleep(20); }
    await window.__sleep(500);
    const b = M.MAP.user.find((x) => x.type === 'cc' && x.num === 21);
    o.b = b && { target: b.target, mode: b.mode };
    M.learnPick('mod.hoehe');
    window.__send([0xe0, 0, 0x50]); await window.__sleep(20); window.__send([0xe0, 0, 0x70]); await window.__sleep(20); window.__send([0xe0, 0, 0x7f]);
    await window.__sleep(500);
    const pb = M.MAP.user.find((x) => x.type === 'bend');
    o.pb = pb && pb.target;
    window.__send([0x99, 40, 100]); await window.__sleep(30); window.__send([0x89, 40, 0]);   // a pad first, then its target
    await window.__sleep(50);
    M.learnPick('mod.dly');
    await window.__sleep(100);
    const pad = M.MAP.user.find((x) => x.type === 'note' && x.num === 40);
    o.pad = pad && pad.mode;
    M.midiLearn(false);
    // the knob: rest at the bottom, top = +1
    window.__send([0xb0, 21, 0]); await window.__sleep(30); o.k0 = M.modVal('flt');
    window.__send([0xb0, 21, 127]); await window.__sleep(30); o.k1 = M.modVal('flt');
    window.__send([0xb0, 21, 64]); await window.__sleep(30); o.kh = M.modVal('flt');
    M.mapEdit(M.MIDI.srcs.get('k1'), b, { inv: true });
    const b2 = M.MAP.user.find((x) => x.type === 'cc' && x.num === 21);
    window.__send([0xb0, 21, 0]); await window.__sleep(30); o.i0 = M.modVal('flt');
    window.__send([0xb0, 21, 127]); await window.__sleep(30); o.i1 = M.modVal('flt');
    // the pitch wheel: rest in the middle
    window.__send([0xe0, 0, 0x40]); await window.__sleep(30); o.w0 = M.modVal('hoehe');
    window.__send([0xe0, 0x7f, 0x7f]); await window.__sleep(30); o.w1 = M.modVal('hoehe');
    window.__send([0xe0, 0, 0]); await window.__sleep(30); o.w2 = M.modVal('hoehe');
    window.__send([0xe0, 0, 0x40]); await window.__sleep(30);
    // the pad: the Echo-Anteil while held
    window.__send([0x99, 40, 100]); await window.__sleep(30); o.p1 = M.modVal('dly');
    window.__send([0x89, 40, 0]); await window.__sleep(30); o.p0 = M.modVal('dly');
    // the binding deleted: its deflection leaves
    window.__send([0xb0, 21, 0]); await window.__sleep(30); o.before = M.modVal('flt');
    M.mapDel(M.MIDI.srcs.get('k1'), b2);
    await window.__sleep(80);
    o.del = M.modVal('flt');
    // a device switched off: its deflections leave
    M.MAP.user.push({ dev: 'Testkeyboard', ch: -1, type: 'cc', num: 23, target: 'mod.rev', mode: 'abs' }); M.MAP.v++;
    window.__send([0xb0, 23, 100]); await window.__sleep(30); o.on = M.modVal('rev');
    M.midiSetPort(M.MIDI.srcs.get('k1'), false);
    await window.__sleep(80);
    o.off = M.modVal('rev');
    M.midiSetPort(M.MIDI.srcs.get('k1'), true);
    o.P = M.P['flt.freq'];
    return o;
  });
  ok(m.b && m.b.target === 'mod.flt' && m.b.mode === 'abs', 'a knob learned on Formen · Filter (' + JSON.stringify(m.b) + ')');
  ok(m.k0 === 0 && m.k1 === 1 && Math.abs(m.kh - 64 / 127) < 1e-9, 'its rest is at the bottom: 0 → 0, 127 → +1, 64 → ' + m.kh.toFixed(3));
  ok(m.i0 === 0 && m.i1 === -1, 'Umkehren: the other way (0 → 0, 127 → −1)');
  ok(m.pb === 'mod.hoehe' && m.w0 === 0 && Math.abs(m.w1 - 1) < 1e-3 && m.w2 === -1, 'a pitch wheel on Formen · Höhe rests in the middle (0, +' + m.w1.toFixed(4) + ', ' + m.w2 + ')');
  ok(m.pad === 'momentary' && m.p1 === 1 && m.p0 === 0, 'a pad learned on Formen acts while held (' + m.pad + ': ' + m.p1 + ' → ' + m.p0 + ')');
  ok(m.before === 0 && m.del === 0, 'a deleted binding leaves the layer');
  ok(m.on > 0.7 && m.off === 0, 'a device switched off: its deflection leaves (' + m.on.toFixed(2) + ' → ' + m.off + ')');
  // ---- Gestik learns: counterparts and refusals ----
  await page.evaluate(() => window.__M.openPanel('dev'));
  await gestikOn(page);
  await page.evaluate(async () => { window.__M.gkSet('clutch', 'immer'); window.__sensor(true, { beta: 45, roll: 0 }); await window.__sleep(400); });
  await page.click('.kc-learn');
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__M.learnPick('flt.freq'));
  await glide(page, { beta: 45, roll: 0 }, { beta: 46, roll: 22 });
  await page.waitForTimeout(700);
  const g1 = await page.evaluate(() => ({ b: window.__M.MAP.user.filter((b) => b.dev === 'Gestik').map((b) => b.target), msg: document.querySelector('.mlearn-bar .ml-msg').textContent }));
  ok(g1.b.join() === 'mod.flt' && /Formen · Filter/.test(g1.msg), 'Gestik on the Filter knob becomes Formen · Filter: "' + g1.msg + '"');
  await glide(page, { beta: 46, roll: 22 }, { beta: 45, roll: 0 }, 300);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__M.learnPick('rev.size'));
  await glide(page, { beta: 45, roll: 0 }, { beta: 20, roll: -2 });
  await page.waitForTimeout(700);
  const g2 = await page.evaluate(() => ({ b: window.__M.MAP.user.filter((b) => b.dev === 'Gestik').map((b) => b.target), msg: document.querySelector('.mlearn-bar .ml-msg').textContent, cap: !!window.__M.LEARN.cap }));
  ok(g2.b.join() === 'mod.flt' && /formt nur, ohne das Preset zu ändern/.test(g2.msg) && g2.cap, 'Gestik on Hallgröße is refused, the tilt waits for another target: "' + g2.msg.slice(0, 90) + '…"');
  await page.evaluate(() => window.__M.learnPick('mod.pan'));
  await page.waitForTimeout(500);
  const g3 = await page.evaluate(() => window.__M.MAP.user.filter((b) => b.dev === 'Gestik').map((b) => b.num + ':' + b.target));
  ok(g3.join() === '0:mod.flt,1:mod.pan', 'then tapping Formen · Panorama assigns it (' + g3.join() + ')');
  await page.click('.mlearn-bar .btn:not(.ghost)');
  // the editor: an axis offers only what forms
  const ed = await page.evaluate(async () => {
    const M = window.__M;
    M.kcBindsUI(true);
    await window.__sleep(100);
    const g = [...document.querySelectorAll('.kc-bg')].find((x) => /Gestik/.test(x.querySelector('.kc-bgh b').textContent));
    g.querySelector('.kc-be').click();
    await window.__sleep(50);
    const q = document.querySelector('.kc-ed input[type=search]');
    q.hidden = false; q.value = 'filter'; q.dispatchEvent(new Event('input'));
    const r = [...document.querySelectorAll('.kc-ed .kc-res button')].map((b) => b.textContent);
    q.value = 'hall'; q.dispatchEvent(new Event('input'));
    const h = [...document.querySelectorAll('.kc-ed .kc-res button')].map((b) => b.textContent);
    document.querySelector('.kc-ed .btn:not(.ghost)').click();
    return { r, h };
  });
  ok(ed.r.length > 0 && ed.r.every((t) => /^Formen/.test(t)) && ed.h.some((t) => /Hall-Anteil/.test(t)) && !ed.h.some((t) => /Größe|Dämpfung/.test(t)), 'the editor offers a Gestik axis only Formen targets (' + ed.r.join(' | ') + ')');
  // an old binding of Gestik on a parameter acts through the layer, never on the patch
  const old = await page.evaluate(async () => {
    const M = window.__M, f0 = M.P['flt.freq'], s0 = M.P['rev.size'];
    M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 3, target: 'flt.freq', mode: 'abs' }, { dev: 'Gestik', ch: -1, type: 'axis', num: 3, target: 'rev.size', mode: 'abs' }); M.MAP.v++;
    window.__sensor(false);
    const b = (45 * Math.PI) / 180, up = [0, Math.sin(b), Math.cos(b)], L = [];
    for (let t = 0; t <= 600; t += 1000 / 60) { const w = t < 400 ? -220 * Math.sin((Math.PI * t) / 400) : 0; L.push({ t, g: up.map((x) => x * 9.81), a: [0, 0, 0], r: up.map((x) => x * w) }); }
    let mx = 0;
    const p = window.__dmPlay(L);
    for (let i = 0; i < 30; i++) { await window.__sleep(20); mx = Math.max(mx, Math.abs(M.modVal('flt'))); }
    await p;
    window.__sensor(true, { beta: 45, roll: 0 });
    return { mx, f: M.P['flt.freq'] === f0, s: M.P['rev.size'] === s0 };
  });
  ok(old.mx > 0.1 && old.f && old.s, 'an old Gestik binding on "Filter Frequenz" deflects Formen · Filter (' + old.mx.toFixed(2) + '); the one on Hallgröße does nothing; the patch stays');
  // ---- Gestik's own routes ----
  const rt = await page.evaluate(async () => {
    const M = window.__M, o = {};
    M.MAP.user = M.MAP.user.filter((b) => b.dev !== 'Gestik'); M.MAP.v++;
    M.gkRoute('test', { axis: 'tiltY', target: 'korS', amt: 0.5 });
    window.__setPose({ beta: 20, roll: 0 });
    await window.__sleep(500);
    o.v = M.modVal('korS'); o.src = [...M.MOD.t.korS.s.keys()].join();
    M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 1, target: 'mod.trp', mode: 'abs' }); M.MAP.v++;
    await window.__sleep(200);
    o.own = M.modVal('korS'); o.trp = M.modVal('trp');
    M.MAP.user = M.MAP.user.filter((b) => b.dev !== 'Gestik'); M.MAP.v++;
    await window.__sleep(200);
    o.back = M.modVal('korS');
    M.gkRoute('off', { axis: 'tiltY', target: 'pulsH', on: () => false });
    await window.__sleep(100);
    o.offRoute = M.modVal('pulsH');
    M.gkDisable();
    await window.__sleep(100);
    o.gone = M.modVal('korS'); o.srcs = Object.values(M.MOD.t).map((T) => [...T.s.keys()]).flat().filter((k) => k.startsWith('gk:'));
    M.gkRoute('test', null); M.gkRoute('off', null);
    return o;
  });
  ok(rt.v > 0.2 && rt.src === 'gk:test', 'a route takes Neigen ↕ (× 0.5) to Körner-Streuung as source gk:test (' + rt.v.toFixed(2) + ')');
  ok(rt.own === 0 && rt.trp !== 0, 'a learned binding of the same axis wins: the route rests (' + rt.own + '), the binding acts (' + rt.trp.toFixed(2) + ')');
  ok(rt.back > 0.2 && rt.offRoute === 0, 'the binding gone, the route acts again; a route whose on() says no rests');
  ok(rt.gone === 0 && !rt.srcs.length, 'Gestik off: every route leaves the layer');
  // ---- points set ahead: ramps in the audio clock (Fährte will play this way) ----
  const tm = await page.evaluate(async () => {
    const M = window.__M, A = M.A, t0 = A.ctx.currentTime + 0.3;
    M.modSet('f', 'flt', 0, { at: t0 }); M.modSet('f', 'flt', 1, { at: t0 + 0.6 }); M.modSet('f', 'flt', -0.5, { at: t0 + 0.9 }); M.modSet('f', 'flt', 0, { at: t0 + 1.2 });
    const smp = [];
    while (A.ctx.currentTime < t0 + 1.6) { smp.push([+(A.ctx.currentTime - t0).toFixed(3), M.MOD.t.flt.cs ? M.MOD.t.flt.cs.offset.value : 0]); await window.__sleep(25); }
    await window.__sleep(200); M.modFlush();
    return { smp, left: M.MOD.t.flt.s.size, tm: M.MOD.tm };
  });
  const at = (t) => { let best = null; for (const s of tm.smp) if (!best || Math.abs(s[0] - t) < Math.abs(best[0] - t)) best = s; return best; };
  const a3 = at(0.3), a6 = at(0.6), a9 = at(0.9), a14 = at(1.45);
  const exp = (t) => (t < 0 ? 0 : t < 0.6 ? (t / 0.6) * 2400 : t < 0.9 ? 2400 - ((t - 0.6) / 0.3) * 3600 : t < 1.2 ? -1200 + ((t - 0.9) / 0.3) * 1200 : 0);
  const err = [a3, a6, a9, a14].map((s) => Math.abs(s[1] - exp(s[0])));
  ok(err.every((e) => e < 260), 'points set ahead play as ramps: at ' + [a3, a6, a9, a14].map((s) => s[0].toFixed(2) + ' s ' + Math.round(s[1])).join(', ') + ' cents (expected ' + [a3, a6, a9, a14].map((s) => Math.round(exp(s[0]))).join(', ') + ')');
  ok(tm.left === 0 && tm.tm === 0, 'after the last point at rest the source leaves (scheduler flush off again)');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
