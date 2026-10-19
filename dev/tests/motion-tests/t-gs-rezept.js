// Gestik-Rezepte (slot gs; node t-gs-rezept.js): built-in presets bring a recipe for Gestik – only its own settings and
// routes on the mod layer, never a value of the patch. Gestik off: nothing happens. Gestik on: loading the preset makes
// its recipe act; a preset without one, "Rezepte der Presets" off or Gestik off bring back exactly the player's own
// settings (which are what is stored meanwhile); a setting changed by hand stays the player's; a learned binding of an
// axis rests the recipe's route; "Rückgängig" brings the recipe back; a reload with Gestik on finds it again. User
// presets keep Gestik's settings (Sporenregen's too). The demo "Sporenregen + Bewegung" (a Schleife of Bewegung) rains by itself.
const { open, ok, close, rain, tools, gestikOn } = require('./gs-h');
const load = (page, key) => page.evaluate((key) => { const M = window.__M; M.loadPreset(M.PRESETS.find((p) => p.key === key)); return { p: JSON.stringify(M.patchValues ? M.patchValues() : null) }; }, key);
const st = (page) => page.evaluate(() => { const M = window.__M, p = M.GK.p; return { neigen: p.neigen, rgS: p.rgS, seit: p.seit, lad: p.lad, tank: p.tank, ras: p.ras, rasS: p.rasS, sw: p.sw, entl: p.entl, rzK: p.rzK, rz: M.GK.rz && M.GK.rz.key, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1') || 'null'), routes: [...M.GKR.keys()].filter((k) => k.startsWith('rz.')), toast: (document.querySelector('.toast') || {}).textContent || '' }; });
(async () => {
  const { page, errors } = await open({ cfg: { seed: 3 } });
  // Gestik never on: a preset with a recipe changes nothing of Gestik, writes nothing
  await load(page, 'tempel');
  let s = await st(page);
  ok(s.neigen === 'anl' && !s.rz && s.stored === null, 'Gestik off: loading Tempelglocken changes nothing of Gestik and stores nothing');
  ok(!/Rezept/.test(s.toast), '   … and says nothing of a recipe');
  // Gestik on: the recipe of the preset loaded last acts at once
  await gestikOn(page); await page.waitForTimeout(300); await tools(page);
  s = await st(page);
  ok(s.neigen === 'regen' && s.rgS === 'glo' && s.rz === 'tempel', 'Gestik switched on: the current preset\'s recipe acts – Sporenregen with Glocke');
  ok(s.stored.neigen === 'anl' && s.stored.rgS === 'trp' && s.stored.rzK === 'tempel', '   … what is stored are the player\'s own settings (Anlehnen, Tropfen)');
  await page.evaluate(() => window.__M.closePanel());
  await load(page, 'kristall'); s = await st(page);
  ok(s.neigen === 'regen' && s.rgS === 'sai' && s.rz === 'kristall' && /Gestik-Rezept: Sporenregen mit Saite/.test(s.toast), 'Kristallhöhle: Sporenregen with Saite, and loading it says so (' + s.toast + ')');
  await load(page, 'pilzregen'); s = await st(page);
  ok(s.neigen === 'anl' && s.rgS === 'trp' && s.lad && s.tank && s.ras && s.rasS === 'trp', 'Pilzregen: Ladung as Tank, Rassel-Schläge on – Sporenregen\'s settings back to the own');
  await load(page, 'maschine'); s = await st(page);
  ok(s.ras && s.rasS === 'mem' && s.entl === 0.6 && !s.tank && s.routes.length === 1, 'Maschinenträume: a short Ladung (0,6 s) with Membran strikes, plus the Ring on the charge; the Tank of Pilzregen gone');
  let r = await page.evaluate(async () => { const M = window.__M; const r = M.GKR.get('rz.0'); return { axis: r.axis, target: r.target, on: r.on() }; });
  ok(r.axis === 'ladung' && r.target === 'rng' && r.on, '   … its route: Ladung → Ring-Frequenz, while Ladung charges');
  await load(page, 'tiefsee'); s = await st(page);
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__key(0.4, 0.5, 'n1');
    await window.__sleep(150);
    window.__tilt(0, 0.6); await window.__sleep(300);
    const o = { bor: M.modVal('bor'), h: M.MOD.t.hoehe.s.has('gk:anl.h') };
    // a learned binding of Neigen ↕ ("Eigene") wins: the recipe's route rests
    M.MAP.user.push({ dev: 'Gestik', ch: 0, type: 'axis', num: 1, target: 'mod.flt', mode: 'abs' }); M.MAP.v++;
    window.__tilt(0, 0.61); await window.__sleep(300);
    o.own = M.MOD.t.bor.s.has('gk:rz.0');
    M.MAP.user.pop(); M.MAP.v++;
    window.__tilt(0, 0); window.__up('n1');
    return o;
  });
  ok(s.neigen === 'anl' && Math.abs(r.bor - 0.42) < 1e-6 && r.h, 'Tiefsee: Anlehnen – leaning away opens the Nebel (Höhe) and the Bordun (' + r.bor.toFixed(2) + ')');
  ok(r.own === false, '   … a learned binding of „Neigen ↕“ wins: the recipe\'s route on it rests');
  // a preset without a recipe: exactly the own settings
  await load(page, 'sonnenwind'); s = await st(page);
  ok(!s.rz && s.neigen === 'anl' && s.rgS === 'trp' && !s.ras && !s.tank && s.entl === 8 && s.routes.length === 0, 'Sonnenwind (no recipe): exactly the player\'s own settings again, no recipe route left');
  // the player wins: a setting changed by hand while a recipe acts stays theirs
  await load(page, 'tempel');
  await page.evaluate(() => window.__M.gkSet('rgS', 'klb'));
  s = await st(page);
  ok(s.stored.rgS === 'klb', 'Tempelglocken, then Kalimba chosen by hand: stored as the player\'s own');
  await load(page, 'sonnenwind'); s = await st(page);
  ok(s.rgS === 'klb' && s.neigen === 'anl', '   … a preset without recipe: Anlehnen again, but the Kalimba stays (the player won)');
  await page.evaluate(() => window.__M.gkSet('rgS', 'trp'));
  // "Rezepte der Presets" off: the own settings; on again: the recipe
  await load(page, 'kristall');
  await page.evaluate(() => { window.__M.openPanel('dev'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.gk-card details.gk-mehr').open = true; });   // (the switch is under „Mehr“ since the fix phase)
  await page.click('[data-kc$=":rez"]');
  s = await st(page);
  ok(!s.rz && s.neigen === 'anl' && s.stored.rez === false, '„Rezepte der Presets“ off: the own settings at once (stored: off)');
  r = await page.evaluate(() => document.querySelector('.gk-rz').textContent);
  await page.click('[data-kc$=":rez"]');
  s = await st(page);
  ok(s.rz === 'kristall' && s.neigen === 'regen' && /Rezepte aus/.test(r), '   … on again: the recipe of Kristallhöhle is back (the card said: ' + r.slice(0, 40) + '…)');
  r = await page.evaluate(() => document.querySelector('.gk-rz').textContent);
  ok(/Rezept von „Kristallhöhle“: Sporenregen mit Saite/.test(r), 'the card names the recipe acting: ' + r.slice(0, 60) + '…');
  // Gestik off: the own settings; on: the recipe again
  await page.evaluate(() => window.__M.gkDisable());
  s = await st(page);
  ok(!s.rz && s.neigen === 'anl' && s.routes.length === 0, 'Gestik off: the own settings again');
  await page.evaluate(() => window.__M.gkEnable(true));
  s = await st(page);
  ok(s.rz === 'kristall' && s.neigen === 'regen', 'Gestik on again: the recipe of Kristallhöhle acts again');
  // Rückgängig: the preset before, and its recipe
  await load(page, 'pilzregen');
  await page.evaluate(() => window.__M.undo());
  s = await st(page);
  ok(s.rz === 'kristall' && s.neigen === 'regen' && !s.tank, '„Rückgängig“ after Pilzregen: Kristallhöhle and its recipe again');
  // never the patch: a recipe changes no value of it
  r = await page.evaluate(async () => {
    const M = window.__M, pre = M.PRESETS.find((p) => p.key === 'tempel');
    M.loadPreset(pre);
    const a = JSON.stringify(M.UI.preset) + JSON.stringify(Object.keys(pre.v).map((k) => M.P[k]));
    M.gkSet('rez', false); M.rzSync(); M.gkSet('rez', true); M.rzSync();
    return { same: a === JSON.stringify(M.UI.preset) + JSON.stringify(Object.keys(pre.v).map((k) => M.P[k])), preset: M.UI.preset, vals: Object.keys(pre.v).every((k) => JSON.stringify(M.P[k]) === JSON.stringify(pre.v[k])) };
  });
  ok(r.same && r.preset === 'tempel' && r.vals, 'a recipe never touches the patch: Tempelglocken stays exactly as loaded, not „geändert“');
  // user presets keep Gestik's settings, Sporenregen's too; loading one: no recipe, its own settings
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('rgK', 2); M.gkSet('rgN', 14);
    const x = M.presetExtra();
    M.loadPreset(Object.assign({ name: 'Mein Regen', v: M.patchValues() }, x));
    const after = { rz: M.GK.rz, neigen: M.GK.p.neigen, rgS: M.GK.p.rgS, rgK: M.GK.p.rgK, rgN: M.GK.p.rgN, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1')) };
    return { gk: x.gk, after };
  });
  ok(r.gk.neigen === 'regen' && r.gk.rgS === 'glo' && r.gk.rgK === 2 && r.gk.rgN === 14 && 'rgP' in r.gk && !('rez' in r.gk) && !('rzK' in r.gk), 'a user preset keeps Gestik\'s settings as they act – Sporenregen with Glocke, 2 bars, 14 spores (not the recipes switch)');
  ok(!r.after.rz && r.after.neigen === 'regen' && r.after.rgS === 'glo' && r.after.stored.neigen === 'regen' && r.after.stored.rgS === 'glo', '   … loading it: no recipe – its settings are the player\'s own now');
  // a reload with Gestik on: the start tap brings Gestik and the recipe of the preset loaded last
  await page.evaluate(() => { const M = window.__M; M.gkSet('neigen', 'anl'); M.gkSet('rgS', 'trp'); M.loadPreset(M.PRESETS.find((p) => p.key === 'tempel')); });
  await page.waitForTimeout(600);   // (the patch is stored after 400 ms)
  await page.reload();
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart');
  await page.waitForFunction(() => window.__M.A.started);
  await page.waitForTimeout(400);
  s = await st(page);
  ok(s.rz === 'tempel' && s.neigen === 'regen' && s.rgS === 'glo', 'reloaded, Gestik back on with the start tap: Tempelglocken\'s recipe acts again');
  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await page.context().close();
  // the demo: Gestik on (a computer: no sensor), load it, play a few notes – its Schleife of Bewegung leans the rain, it plays by itself
  {
    const { page, errors } = await open({ cfg: { seed: 8 } });
    await gestikOn(page); await page.waitForTimeout(300); await tools(page);
    r = await page.evaluate(async () => {
      const M = window.__M;
      M.closePanel();
      for (let i = 0; i < 100 && M.HX.state !== 'ok'; i++) await window.__sleep(50);
      M.loadPreset(M.PRESETS.find((p) => p.key === 'sporenfaehrte'));
      const B = M.hxLoopsLive().find((x) => x.bew);
      const o = { rz: M.GK.rz && M.GK.rz.key, neigen: M.GK.p.neigen, rgS: M.GK.p.rgS, loop: !!B, lanes: B && B.bew.lanes.map((l) => l.k).join(','), live: M.GK.live };
      for (const x of [0.2, 0.4, 0.6, 0.8]) { window.__key(x, 0.5, 'd' + x); await window.__sleep(120); window.__up('d' + x); }
      window.__collect();
      await window.__sleep(5000);
      const h = window.__stop();
      o.n = h.length; o.keys = new Set(h.map((x) => x.key)).size; o.up = h.filter((x) => x.f > 0).length;
      return o;
    });
    ok(r.rz === 'sporenfaehrte' && r.neigen === 'regen' && r.rgS === 'klb' && r.loop && r.lanes === 'rgx,rgy', 'the demo „Sporenregen + Bewegung“: its recipe (Sporenregen with Kalimba) and a Schleife of Bewegung on the rain\'s slope');
    ok(!r.live && r.n >= 8 && r.keys >= 3, '   … no sensor, the hand still: four notes played, the rain plays them by itself (' + r.n + ' strikes on ' + r.keys + ' Keime in 5 s)');
    ok(errors.length === 0, 'no errors in the page (demo)' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  }
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
