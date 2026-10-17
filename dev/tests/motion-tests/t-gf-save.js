// Fährte in presets and scenes (slot gf; node t-gf-save.js): an own preset saved through the panel is format 2 (the
// loop and Gestik's settings ride along); loading it brings its loop back (16-bit exact); a preset saved without a loop
// stops the running one; presets of format 1 (saved before) and the built-in ones leave the Fährte alone; "Rückgängig"
// brings back the loop a preset replaced; the file export is version 2 and its import restores the loop, a version 1
// file loads as before; the mixer's scenes: storing A/B with a loop keeps it, going there brings it back, a scene
// stored without one leaves the Fährte alone, swapping A/B swaps them, and all of it survives a reload.
const H = require('./gf-h');
const { ok } = H;
const fs = require('fs'), path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a loop made the quick way: a Formen source moves for a bar, a tap takes it
async function makeLoop(page, k, f) {
  await page.evaluate(([k, f]) => window.__drive('map:mk:' + k, k, f), [k, f]);
  const b1 = await page.evaluate(() => { const M = window.__M, b = M.faeHeard(performance.now()); return M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4) + 4.3; });
  await page.waitForFunction((b) => window.__M.faeHeard(performance.now()) >= b, b1, { timeout: 9000 });
  await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
  await page.waitForFunction(() => !!window.__M.FA.loop && window.__M.FA.loop.why === 'tap', null, { timeout: 2500 });
  await page.evaluate((k) => window.__undrive('map:mk:' + k, k), k);
  return page.evaluate(() => window.__loop());
}
const same = (A, B) => A && B && A.n === B.n && A.lanes.length === B.lanes.length && A.lanes.every((l, i) => l.k === B.lanes[i].k && l.src === B.lanes[i].src && l.v.every((x, j) => Math.abs(x - B.lanes[i].v[j]) <= 1 / 4096 + 1e-6));
(async () => {
  let { page, errors, ctx } = await H.open({ cfg: {} });
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.len = 1; M.FA.p.fade = 1; });
  const L1 = await makeLoop(page, 'flt', '0.5*Math.sin(2*Math.PI*t/0.6)');
  // ---- save through the panel
  await page.evaluate(() => window.__M.openPanel('presets'));
  await page.fill('#presetName', 'Mit Fährte');
  await page.click('#presetName + button');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('myzel.user.v1'))[0]);
  ok(st.name === 'Mit Fährte' && st.fmt === 2 && st.fae && st.fae.v === 1 && st.fae.lanes.length === 1 && st.gk && st.gk.neigen === 'anl' && st.v['flt.freq'] != null, 'saved through the panel: format 2 – the patch, the Fährte (16-bit lanes) and Gestik\'s settings');
  ok(JSON.stringify(st.fae).length < 4000, 'small: a bar of one lane is ' + JSON.stringify(st.fae).length + ' characters');
  await page.evaluate(() => window.__M.faeClear(false));
  // ---- load it: the loop is back, the same
  await page.evaluate(() => { const b = [...document.querySelectorAll('.urow')].find((r) => r.textContent.includes('Mit Fährte')); b.querySelector('.btn').click(); });
  await sleep(200);
  const L2 = await page.evaluate(() => window.__loop());
  ok(L2 && L2.why === 'preset' && same(L1, L2), 'loading it brings the loop back – every value within 1/4096');
  ok(await page.evaluate(() => { const M = window.__M, L = M.FA.loop; return L.a % 192 === Math.round((M.FA.ph * 48) % 192) || (((L.a / 48 - M.FA.ph) % 4) + 4) % 4 < 1e-6; }), 'starting on the current bar');
  // ---- a format-1 preset (saved before) and a built-in one: the loop runs on untouched
  await page.evaluate(() => { const M = window.__M, list = M.userPresets(); list.push({ name: 'Alt', v: Object.assign({}, list[0].v, { 'rev.mix': 0.42 }) }); M.setUserPresets(list); M.closePanel(); });
  await page.evaluate(() => { const M = window.__M; window.__keep = M.FA.loop; M.loadPreset(M.userPresets().find((p) => p.name === 'Alt')); });
  await sleep(150);
  const old = await page.evaluate(() => ({ same: window.__M.FA.loop === window.__keep, rev: window.__M.P['rev.mix'] }));
  ok(old.same && Math.abs(old.rev - 0.42) < 1e-9, 'a preset of format 1: its sound loads, the running Fährte goes on as it was');
  await page.evaluate(() => { window.__keep = window.__M.FA.loop; window.__M.loadPreset(window.__M.PRESETS[2]); });
  await sleep(150);
  ok(await page.evaluate(() => window.__M.FA.loop === window.__keep), 'a built-in preset: the Fährte goes on');
  // ---- a format-2 preset saved without a loop stops it; "Rückgängig" brings it back
  await page.evaluate(() => { const M = window.__M, L = M.FA.loop; M.FA.loop = null; const x = M.presetExtra(); M.FA.loop = L; const list = M.userPresets(); list.push(Object.assign({ name: 'Ohne', v: list[0].v }, x)); M.setUserPresets(list); });
  await page.evaluate(() => { const M = window.__M; M.loadPreset(M.userPresets().find((p) => p.name === 'Ohne')); });
  await sleep(150);
  ok(await page.evaluate(() => !window.__M.FA.loop && ![...window.__M.MOD.t.flt.s.keys()].some((k) => k.startsWith('fae:'))), 'a preset of format 2 saved without a loop: the running one stops');
  await page.evaluate(() => window.__M.undo());
  await sleep(150);
  const L3 = await page.evaluate(() => window.__loop());
  ok(same(L1, L3), '„Rückgängig“: the loop it replaced is back');
  // ---- Gestik's settings ride along: they act only while Gestik is on
  await page.evaluate(() => { const M = window.__M, list = M.userPresets(); list.push(Object.assign({ name: 'GkSet', v: list[0].v, fmt: 2, gk: { seit: 'raum', entl: 2, slArt: 'stille', neigen: 'kaputt' } })); M.setUserPresets(list); });
  await page.evaluate(() => { const M = window.__M; M.loadPreset(M.userPresets().find((p) => p.name === 'GkSet')); });
  ok(await page.evaluate(() => window.__M.GK.p.seit === 'ton'), 'Gestik off: a preset\'s Gestik settings wait (Seitlich still Tonhöhe)');
  ok(await page.evaluate(() => !!window.__M.FA.loop), '(and with no word on the Fährte, it goes on)');
  await H.gestikOn(page);
  await sleep(300);
  await page.evaluate(() => { const M = window.__M; M.loadPreset(M.userPresets().find((p) => p.name === 'GkSet')); });
  const gp = await page.evaluate(() => { const p = window.__M.GK.p; return [p.seit, p.entl, p.slArt, p.neigen]; });
  ok(gp[0] === 'raum' && gp[1] === 2 && gp[2] === 'stille' && gp[3] === 'anl', 'Gestik on: the preset\'s Gestik settings act, a value it cannot have falls back (' + gp.join(', ') + ')');
  await page.evaluate(() => window.__M.gkDisable());
  // ---- the file: version 2 out, both versions in
  const x = await page.evaluate(() => { const M = window.__M, e = M.presetExtra(); return { app: 'Myzel', version: 2, name: 'Datei', values: M.userPresets()[0].v, faehrte: e.fae, gestik: e.gk }; });
  ok(x.faehrte && x.faehrte.lanes.length === 1, 'the export has the Fährte (version 2)');
  const dir = path.join(__dirname, 'out'); fs.mkdirSync(dir, { recursive: true });
  const f2 = path.join(dir, 'gf-v2.json'), f1 = path.join(dir, 'gf-v1.json');
  fs.writeFileSync(f2, JSON.stringify(x));
  fs.writeFileSync(f1, JSON.stringify({ app: 'Myzel', version: 1, name: 'Alt-Datei', values: x.values }));
  await page.evaluate(() => window.__M.faeClear(false));
  await page.evaluate(() => { const M = window.__M; M.closePanel(); M.openPanel('presets'); });
  await page.setInputFiles('#presetFile', f2);
  await sleep(300);
  const L4 = await page.evaluate(() => window.__loop());
  ok(L4 && same(L1, L4), 'importing a version-2 file: its loop plays');
  await page.evaluate(() => { window.__keep = window.__M.FA.loop; });
  await page.setInputFiles('#presetFile', f1);
  await sleep(300);
  ok(await page.evaluate(() => window.__M.FA.loop === window.__keep && /Alt-Datei/.test(document.getElementById('toastMsg').textContent)), 'a version-1 file loads as before and leaves the Fährte alone');
  // ---- the mixer's scenes
  await page.evaluate(() => { const M = window.__M; M.closePanel(); M.mxSnapLoad(); M.setParam('xfin.vol', -3); M.mxSnapStore('a'); });
  ok(await page.evaluate(() => !!window.__M.MX.snap.fae.a && /mit der Fährte/.test(document.getElementById('toastMsg').textContent)), 'storing scene A while a loop runs keeps it with the scene (the toast says so)');
  await page.evaluate(() => window.__M.faeClear(false));
  const LB = await makeLoop(page, 'pan', '0.6*Math.sin(2*Math.PI*t/0.9)');
  await page.evaluate(() => { const M = window.__M; M.setParam('xfin.vol', -12); M.mxSnapStore('b'); });
  await page.evaluate(() => window.__M.mxMorphApply(0));
  await sleep(100);
  const LA = await page.evaluate(() => window.__loop());
  ok(LA && LA.why === 'scene' && same(L1, LA), 'going to scene A brings its loop (the Filter one)');
  await page.evaluate(() => window.__M.mxMorphApply(0.3));
  ok(await page.evaluate(() => window.__M.FA.loop.lanes[0].k === 'flt'), 'the morph inside A\'s half: nothing changes');
  await page.evaluate(() => window.__M.mxMorphApply(0.8));
  const LB2 = await page.evaluate(() => window.__loop());
  ok(same(LB, LB2), 'past half way to B: B\'s loop (the Panorama one)');
  // scene A stored again without a loop: going there leaves the Fährte alone
  await page.evaluate(() => { const M = window.__M; M.faeClear(false); M.mxMorphApply(0); });
  ok(await page.evaluate(() => window.__M.FA.loop && window.__M.FA.loop.lanes[0].k === 'flt'), '(A brings its loop again)');
  await page.evaluate(() => { const M = window.__M; M.faeClear(false); M.mxSnapStore('a'); });
  ok(await page.evaluate(() => !window.__M.MX.snap.fae.a && !!window.__M.MX.snap.fae.b), 'storing A with no loop running: A has no Fährte any more, B keeps its');
  await page.evaluate(() => { const M = window.__M; M.mxMorphApply(1); M.faeClear(false); M.mxMorphApply(0); });
  ok(await page.evaluate(() => !window.__M.FA.loop), 'going to a scene without a Fährte leaves it as it is (here: none)');
  await page.evaluate(() => window.__M.mxSnapSwap());
  ok(await page.evaluate(() => !!window.__M.MX.snap.fae.a && !window.__M.MX.snap.fae.b), 'swapping A and B swaps their loops');
  await sleep(700);   // the scenes are saved after 500 ms
  // ---- a reload: presets and scenes keep their loops
  const user = await page.evaluate(() => localStorage.getItem('myzel.user.v1')), snap = await page.evaluate(() => localStorage.getItem('myzel.mixsnap.v1'));
  ok(JSON.parse(snap).fae && JSON.parse(snap).fae.a, 'the scenes\' loops are stored with the scenes');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  ({ page, errors } = await H.open({ cfg: { storage: { 'myzel.user.v1': user, 'myzel.mixsnap.v1': snap } } }));
  await page.evaluate(() => { const M = window.__M; M.mxSnapLoad(); M.MX.snap.m = 1; M.mxMorphApply(0); });
  await sleep(100);
  ok(await page.evaluate(() => !!window.__M.FA.loop && window.__M.FA.loop.lanes[0].k === 'pan'), 'after a reload: scene A brings its loop');
  await page.evaluate(() => { const M = window.__M; M.faeClear(false); M.loadPreset(M.userPresets().find((p) => p.name === 'Mit Fährte')); });
  await sleep(100);
  ok(await page.evaluate(() => !!window.__M.FA.loop && window.__M.FA.loop.lanes[0].k === 'flt'), 'and the own preset its own');
  // broken data never breaks anything
  const bad = await page.evaluate(() => { const M = window.__M; const r = [M.faeImport({ v: 1, R: 48, n: 192, lanes: [{ k: 'nope', s: 'x', d: 'AAAA' }] }), M.faeImport({ v: 9 }), M.faeImport({ v: 1, R: 48, n: 192, lanes: [{ k: 'flt', s: 'x', d: '%%%' }] })]; return r; });
  ok(bad.every((x) => x === false) && (await page.evaluate(() => !!window.__M.FA.loop)), 'a broken stored loop is ignored (the running one goes on)');
  ok(!errors.length, 'no page errors after the reload' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
