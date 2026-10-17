// Sporenregen, the motion (slot gs; node t-gs-regen.js): leaning right the spores play your Keime upward, left
// downward, toward you down through the Höhe (bright to dark); steeper is faster and denser, level is silence; "Harfe"
// glides through the columns; without a sensor the dragged Wasserwaage leans it; shaking sprinkles spores, Schlafen
// lets them seep away; a Fährte leans it by itself; a real sensor leans it, a phone leaned on a stand keeps it raining.
const { open, ok, close, rain, pairs, tools } = require('./gs-h');
const G = require('./gl-h');
const run = (page, tilt, ms, setup) => page.evaluate(async ([tilt, ms, setup]) => {
  const M = window.__M;
  if (setup) await new Function('M', 'return (async () => {' + setup + '})()')(M);
  window.__tilt(tilt[0], tilt[1]);
  await window.__sleep(400);   // under way
  window.__collect();
  await window.__sleep(ms);
  const hits = window.__stop();
  return { hits, sp: M.RG.sp.length, speed: M.RG.sp.reduce((a, s) => a + Math.hypot(s.vu, s.vv), 0) / Math.max(1, M.RG.sp.length) };
}, [tilt, ms, setup || '']);
// the strikes as heard (all spores, in time; repeats merged): how many steps go the slope's way (dir +1 up, −1 down) –
// round again from the far end is allowed (the fix phase's Ordnung: after a Keim only the next one downhill sounds, a
// spore passing out of order rolls through silently, so one spore's own run has fewer steps); −1 if any goes against it
const heard = (hits, by, dir) => {
  const s = hits.slice().sort((a, b) => a.t - b.t).map((h) => Math.round(by(h) * 100) / 100).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  const lo = Math.min(...s), hi = Math.max(...s);
  let n = 0;
  for (let i = 1; i < s.length; i++) { const a = s[i - 1], b = s[i]; if ((b - a) * dir > 0) n++; else if (!(dir > 0 ? a === hi && b === lo : a === lo && b === hi)) return -1; }
  return n;
};
(async () => {
  const { page, errors } = await open({ cfg: { seed: 99 } });
  await page.evaluate(() => { const M = window.__M; for (const [k, v] of [['seq.bpm', 90], ['seq.swing', 0], ['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['bor.on', false]]) M.setParam(k, v); });
  await rain(page, { rgO: 1, rgK: 8, rgQ: 'frei' });
  // a chord in a row: three Keime at the same height
  const chord = "M.RG.k.length = 0; for (const x of [0.2, 0.45, 0.7]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }";
  let r = await run(page, [0.8, 0], 4000, chord);
  let pr = pairs(r.hits);
  let hd = heard(r.hits, (h) => h.f, 1);
  ok(r.hits.length >= 8 && hd >= 4 && pr.every(([a, b]) => b > a), 'leaning right: the strikes climb through the chord, round again from the bottom (' + r.hits.length + ' strikes, ' + hd + ' steps up as heard; within a spore\'s run ' + pr.length + ', all upward)');
  ok(new Set(r.hits.map((h) => h.key)).size === 3, '   … all three Keime sound');
  r = await run(page, [-0.8, 0], 4000);
  pr = pairs(r.hits);
  hd = heard(r.hits, (h) => h.f, -1);
  ok(r.hits.length >= 8 && hd >= 4 && pr.every(([a, b]) => b < a), 'leaning left: they fall through it (' + r.hits.length + ' strikes, ' + hd + ' steps down as heard; within a run ' + pr.length + ', all downward)');
  // toward you: Keime in one column at three heights – the spores fall down through the Höhe: bright to dark
  r = await run(page, [0, -0.8], 4000, "M.RG.k.length = 0; for (const y of [0.2, 0.5, 0.8]) { window.__key(0.5, y, 'h' + y); window.__up('h' + y); }");
  pr = pairs(r.hits, (h) => h.y);
  ok(r.hits.length >= 6 && pr.length >= 3 && pr.every(([a, b]) => b < a), 'leaning toward you: they fall through the Höhe – each run from bright to dark (' + r.hits.length + ' strikes, ' + pr.length + ' steps)');
  r = await run(page, [0, 0.8], 3000);
  pr = pairs(r.hits, (h) => h.y);
  hd = heard(r.hits, (h) => h.y, 1);
  ok(hd >= 2 && pr.every(([a, b]) => b > a), 'away from you: dark to bright (' + hd + ' steps as heard, ' + pr.length + ' within a run)');
  // steeper: faster and denser
  const flat = await run(page, [0.3, 0], 4000, chord + " M.gkSet('rgZ', 0.6);");
  const steep = await run(page, [0.9, 0], 4000);
  ok(steep.hits.length > 1.4 * flat.hits.length && flat.hits.length > 0, 'steeper is denser: ' + flat.hits.length + ' strikes at 30 % → ' + steep.hits.length + ' at 90 % (4 s)');
  ok(steep.speed > 2 * flat.speed, 'and faster: mean speed ' + flat.speed.toFixed(3) + ' → ' + steep.speed.toFixed(3) + ' fields/s');
  // level again: they settle in hollows, silence
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__tilt(0, 0);
    await window.__sleep(2500);
    window.__collect();
    await window.__sleep(2500);
    return { n: window.__stop().length, speed: Math.max(...M.RG.sp.map((s) => Math.hypot(s.vu, s.vv))) };
  });
  ok(r.n === 0 && r.speed < 0.02, 'level: the spores settle (fastest ' + r.speed.toFixed(4) + ' fields/s) and it is silent (' + r.n + ' strikes in 2.5 s)');
  // Harfe: a quarter of the spores, every column crossed sounds – a glissando
  r = await run(page, [0.7, 0], 3000, "M.gkSet('rgArt', 'harfe'); M.gkSet('rgQ', '16'); M.RG.k.length = 0; await window.__sleep(200);");
  pr = pairs(r.hits, (h) => +h.key.slice(1));
  ok(r.sp === 3 && r.hits.length >= 8 && r.hits.every((h) => /^c\d+$/.test(h.key)), 'Harfe: 3 spores (a quarter of 10), no Keime needed – columns sound (' + r.hits.length + ' strikes)');
  ok(pr.length >= 5 && pr.every(([a, b]) => b > a) && pr.filter(([a, b]) => b === a + 1).length >= pr.length * 0.6, 'Harfe leaning right: each spore glides up the scale, column by column (' + pr.filter(([a, b]) => b === a + 1).length + '/' + pr.length + ' next-door steps)');
  r = await page.evaluate(() => { const M = window.__M; return M.N.notes.length; });
  // shaking (Ladung) sprinkles new spores, for 8 s
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('rgArt', 'keime'); M.gkSet('rgQ', 'frei'); await window.__sleep(100);
    for (const x of [0.2, 0.45, 0.7]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }
    const n0 = M.RG.sp.length;
    for (const f of M.GK.subs) f(M.GK.out, M.GK.raw, [{ type: 'peak', v: 1 }], performance.now());
    const n1 = M.RG.sp.length, x = M.RG.sp.filter((s) => s.x).map((s) => s.x - M.RG.t);
    for (let i = 0; i < 10; i++) for (const f of M.GK.subs) f(M.GK.out, M.GK.raw, [{ type: 'peak', v: 1 }], performance.now());
    const n2 = M.RG.sp.length;
    for (const s of M.RG.sp) if (s.x) s.x = M.RG.t - 0.01;   // their time ran out
    await window.__sleep(100);
    M.gkSet('lad', false);
    for (const f of M.GK.subs) f(M.GK.out, M.GK.raw, [{ type: 'peak', v: 1 }], performance.now());
    const n4 = M.RG.sp.length;
    M.gkSet('lad', true);
    return { n0, n1, n2, n3: M.RG.sp.length, n4, x };
  });
  ok(r.n1 === r.n0 + 3 && r.x.every((x) => Math.abs(x - 8) < 0.2), 'a shake (Ladung) sprinkles 3 new spores, for 8 s');
  ok(r.n2 === 24 && r.n3 === 10, '   … up to 24 in all; their time run out, the rain is back to its 10');
  ok(r.n4 === 10, '   … Ladung off: shaking sprinkles nothing');
  // without a sensor: dragging the Wasserwaage leans the rain, and it stays where it was left
  await page.evaluate(() => { window.__tilt(null); window.__M.openPanel('dev'); });
  await page.waitForTimeout(400);
  const cv = await page.$('.gk-ww');
  await cv.scrollIntoViewIfNeeded();
  const bb = await cv.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(bb.x + bb.width / 2 + i * 7, bb.y + bb.height / 2);
  await page.mouse.up();
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.closePanel();
    await window.__sleep(300);
    window.__collect();
    await window.__sleep(2500);
    return { v: M.GK.virt, rgx: M.modVal('rgx'), n: window.__stop().length, live: M.GK.live };
  });
  ok(!r.live && r.v && r.v.x > 0.6 && Math.abs(r.rgx - r.v.x) < 1e-9 && r.n > 0, 'no sensor: the dragged Wasserwaage leans the rain (' + r.rgx.toFixed(2) + ') and it keeps raining after letting go (' + r.n + ' strikes)');
  // a control on its target (as a learned knob would): it leans the rain too
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__tilt(0, 0); await window.__sleep(2000);
    M.modSet('map:test:1', 'rgx', -0.7);
    await window.__sleep(400); window.__collect(); await window.__sleep(2000);
    const h = window.__stop();
    M.modSet('map:test:1', 'rgx', 0);
    return { n: h.length, down: h.length > 1 };
  });
  ok(r.n > 0, 'a control bound to „Sporenregen: Neigung ↔“ leans it as well (' + r.n + ' strikes)');
  // the Fährte: the demo's loop leans it by itself
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__tilt(0, 0); await window.__sleep(1500);
    const pre = M.PRESETS.find((p) => p.key === 'sporenfaehrte');
    M.faeImport(pre.fae, 'test');
    const xs = [];
    window.__collect();
    for (let i = 0; i < 30; i++) { await window.__sleep(100); xs.push(M.modVal('rgx')); }
    const h = window.__stop();
    const lanes = M.FA.loop && M.FA.loop.lanes.map((l) => l.name);
    M.faeClear(false);
    return { n: h.length, max: Math.max(...xs.map(Math.abs)), lanes };
  });
  ok(r.lanes && r.lanes.includes('fae:rgx|gk:regen.x') && r.max > 0.2 && r.n > 0, 'a Fährte on the rain\'s slope leans it while the hand rests – the rain plays itself (' + r.n + ' strikes, slope up to ' + r.max.toFixed(2) + ')');
  // the Fährte writes the rain's slope down like any of Gestik's functions
  r = await page.evaluate(async () => { const M = window.__M; window.__tilt(0.5, 0); await window.__sleep(400); const L = M.FA.lanes.get('m|rgx|gk:regen.x'), o = { v: L ? L.v : null, keys: [...M.FA.lanes.keys()].join(' ') }; window.__tilt(0, 0); return o; });
  ok(r.v != null && Math.abs(r.v - 0.5) < 1e-9, 'the Fährte writes the rain\'s slope down (lane m|rgx|gk:regen.x: ' + JSON.stringify(r) + ')');
  // a recognised own binding of the tilt ("Eigene") takes the axis: the rain's route rests
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.MAP.user.push({ dev: 'Gestik', ch: 0, type: 'axis', num: 0, target: 'mod.flt', mode: 'abs' }); M.MAP.v++;
    window.__tilt(0.8, 0); await window.__sleep(300);
    const own = M.MOD.t.rgx.s.has('gk:regen.x');
    M.MAP.user.pop(); M.MAP.v++;
    window.__tilt(0.8, 0.0001); await window.__sleep(300);
    const back = M.MOD.t.rgx.s.has('gk:regen.x');
    window.__tilt(0, 0);
    return { own, back };
  });
  ok(!r.own && r.back, 'a learned binding of „Neigen ↔“ wins: the rain\'s slope from it rests meanwhile');
  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await page.context().close();
  // a real sensor: the pose when Sporenregen is chosen is level; leaning rains; lying still leaned on a stand (Ruhe) it
  // keeps raining
  {
    const { page, errors } = await open({ cfg: { seed: 5 } });
    await page.evaluate(() => { const M = window.__M; for (const [k, v] of [['seq.bpm', 90], ['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false]]) M.setParam(k, v); });
    await page.evaluate(() => window.__sensor(true, { beta: 30, roll: 0 }, 2));
    await rain(page, { rgO: 1 });
    await page.waitForTimeout(1200);
    let s = await page.evaluate(async () => {
      const M = window.__M;
      for (const x of [0.2, 0.45, 0.7]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }
      const z = { x: M.GK.out.tiltX, live: M.GK.live };
      window.__setPose({ beta: 30, roll: 22 });
      await window.__sleep(800);
      window.__collect(); await window.__sleep(3000);
      const h = window.__stop();
      return { z, out: M.GK.out.tiltX, rgx: M.modVal('rgx'), n: h.length, up: h.length > 1 };
    });
    ok(s.z.live && Math.abs(s.z.x) < 0.05 && s.out > 0.5 && Math.abs(s.rgx - s.out) < 1e-9 && s.n > 0, 'with the sensor: the pose when chosen is level (' + s.z.x.toFixed(3) + '); leaning right 22° rains (slope ' + s.out.toFixed(2) + ', ' + s.n + ' strikes)');
    s = await page.evaluate(async () => {
      const M = window.__M;
      window.__sensor(true, { beta: 30, roll: 22 }, 0);   // laid against a stand: perfectly still
      await window.__sleep(2600);
      window.__collect(); await window.__sleep(2000);
      return { ruhe: M.GK.ev.ruhe, mode: M.GK.mode, n: window.__stop().length };
    });
    ok(s.ruhe && s.mode === 'live' && s.n > 0, 'leaned against a stand, lying still (Ruhe): it keeps raining (' + s.n + ' strikes)');
    // Schlafen: turned over onto its screen (a real turn, 1 s) the spores seep away, silent; turned back they come again
    await page.evaluate(() => window.__sensor(false));
    await page.evaluate(() => window.__collect());
    await G.play(page, 1.6, G.M.faceDown(30));
    await page.evaluate(() => window.__sensor(true, { beta: 180, roll: 0 }, 1));
    await page.waitForTimeout(2300);
    s = await page.evaluate(() => { const M = window.__M; return { n: window.__stop().filter((h) => h.t > M.A.ctx.currentTime - 2.2).length, sp: M.RG.sp.length, slp: M.SLP.on, wenden: M.GK.ev.wenden }; });
    s = { asleep: s };
    await page.evaluate(() => window.__sensor(false));
    await G.play(page, 1.6, G.M.faceUp(30));
    await page.evaluate(() => window.__sensor(true, { beta: 30, roll: 0 }, 2));
    await page.waitForTimeout(500);
    Object.assign(s, await page.evaluate(async () => {
      const M = window.__M;
      const back = M.RG.sp.length, fade0 = M.RG.fade, slp = M.SLP.on, keime = M.RG.k.length;
      for (const x of [0.2, 0.45, 0.7]) { window.__key(x, 0.5, 'd' + x); window.__up('d' + x); }
      window.__setPose({ beta: 30, roll: 22 });
      await window.__sleep(2300);
      window.__collect();
      await window.__sleep(2000);
      return { back, fade0, slp, keime, fade: M.RG.fade, after: window.__stop().length, out: M.GK.out.tiltX };
    }));
    ok(s.asleep.slp && s.asleep.n === 0 && s.asleep.sp === 0, 'Schlafen (screen down): the spores seep away within 2 s (' + s.asleep.sp + ' left), not a strike ' + JSON.stringify(s.asleep));
    ok(!s.slp && s.back === 10 && s.fade0 < 1 && s.fade === 1 && s.after > 0, 'turned back, awake: the spores come again (fading in) and it rains again (' + s.after + ' strikes) ' + JSON.stringify(s));
    ok(errors.length === 0, 'no errors in the page (sensor)' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  }
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
