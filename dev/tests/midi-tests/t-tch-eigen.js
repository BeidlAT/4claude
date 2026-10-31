// Touché: eigene Spielweisen (owner, 31.10.2026: „je Richtung Ziel, Stärke und Kurve – eigene Spielweisen speichern und
// benennen“): a new one sounds exactly as its Grundlage; a direction led elsewhere (Hall), swapped (links → Grundlage
// rechts), curved; kept over a reload; the editor builds and plays; a built-in chosen leaves it, its targets go.
//                                                        node t-tch-eigen.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Touché SE'], ['k2', 'Testkeyboard']] } });
  await page.evaluate(async () => { window.__send([0x90, 60, 100], 'k2'); await window.__sleep(1300); });
  const r = await page.evaluate(async () => {
    const M = window.__M, T = (b) => window.__send(b, 'k1'), sl = window.__sleep, o = {};
    const mv = () => ({ h: +M.modVal('hoehe').toFixed(3), b: +M.modVal('bend').toFixed(3), r: +M.modVal('rev').toFixed(3) });
    const press = async (cc, v) => { T([0xb0, cc, v]); M.mapFlush(); await sl(60); };
    M.tchWeise('finger');
    await press(17, 127); o.builtin = mv(); await press(17, 0);
    const E = M.tchEigNew(); o.sel = M.TCHE.sel === E.id; o.base = E.base;
    await press(17, 127); o.same = mv(); await press(17, 0);
    // weg → Hall 80 % instead of the Grundlage's Höhe
    E.dirs.weg = [{ z: 'rev', s: 0.8, k: 'lin' }]; M.tchApply();
    await press(17, 127); o.rev = mv(); await press(17, 0); o.rest = mv();
    // links → Grundlage rechts (swapped): the pitch goes up
    E.dirs.li = [{ z: 'b:re', s: 1, k: 'lin' }]; M.tchApply();
    await press(18, 127); o.swap = mv(); await press(18, 0);
    // curves
    o.curve = ['lin', 'weich', 'schnell', 's', 'spaet'].map((k) => +M.tchEigRoute({ base: '', dirs: { weg: [{ z: 'flt', s: 1, k }] } }, { weg: 0.5 }).t.flt.toFixed(3));
    E.name = 'Hallhand'; M.tchEigSel(null, true); M.tchEigSel(E.id, true);
    localStorage.setItem('probe', '1');
    return o;
  });
  ok(r.sel && r.base === 'finger' && JSON.stringify(r.same) === JSON.stringify(r.builtin), `a new own Spielweise sounds exactly as its Grundlage (${JSON.stringify([r.builtin, r.same])})`);
  ok(r.rev.r === 0.8 && r.rev.h === 0 && r.rest.r === 0, `weg led to Hall 80 %: the hall comes, Höhe no longer moves; let go, all back (${JSON.stringify([r.rev, r.rest])})`);
  ok(r.swap.b > 0.4, `links led to the Grundlage's rechts: the pitch goes up (${JSON.stringify(r.swap)})`);
  ok(JSON.stringify(r.curve) === JSON.stringify([0.5, 0.25, 0.707, 0.5, 0.25]), `curves at half the way: linear, sanft, schnell, S, ab einem Drittel (${r.curve})`);
  // kept over a reload; the editor
  await page.evaluate(() => window.__M.tchEigSave && window.__M.tchEigSave());
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart'); await page.waitForTimeout(1200);
  const r2 = await page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep, o = {};
    o.kept = M.TCHE.list.length === 1 && M.TCHE.list[0].name === 'Hallhand' && M.TCHE.sel === M.TCHE.list[0].id && M.TCHE.list[0].dirs.weg[0].z === 'rev';
    window.__send([0x90, 60, 100], 'k2'); await sl(1300);
    M.openPanel('dev'); await sl(500);
    o.chip = !!document.querySelector('[data-kc$=":tche:' + M.TCHE.list[0].id + '"][aria-pressed="true"]');
    document.querySelector('[data-kc$=":tchedit"]').click(); await sl(300);
    const ed = document.querySelector('.tche'); o.open = !!ed && !ed.hidden; o.dirs = ed ? ed.querySelectorAll('.tche-dir').length : 0;
    const s = ed.querySelector('.tche-dir input[type=range]'); s.value = '-50'; s.dispatchEvent(new Event('input')); await sl(50);
    o.edited = M.TCHE.list[0].dirs.weg[0].s;
    ed.querySelector('.tche-add').click(); await sl(50); o.added = M.TCHE.list[0].dirs.weg.length;
    ed.querySelector('.tche-foot .btn.primary').click(); await sl(100); o.closed = ed.hidden;
    // a built-in chosen: the own one is left, its targets go
    window.__send([0xb0, 17, 127], 'k1'); M.mapFlush(); await sl(60); o.revOn = +M.modVal('rev').toFixed(3);
    M.tchWeise('finger'); await sl(60); o.left = M.TCHE.sel === null; o.revOff = +M.modVal('rev').toFixed(3);
    window.__send([0xb0, 17, 0], 'k1'); M.mapFlush(); window.__send([0x80, 60, 0], 'k2');
    return o;
  });
  ok(r2.kept && r2.chip, `kept over a reload, named and chosen; its chip on the card is pressed (${JSON.stringify(r2)})`);
  ok(r2.open && r2.dirs === 4 && r2.edited === -0.5 && r2.added === 2 && r2.closed, 'the editor: four directions, a strength changed, a target added, closed');
  ok(r2.revOn < 0 && r2.left && r2.revOff === 0, `a built-in chosen leaves the own one – its Hall goes (${r2.revOn} → ${r2.revOff})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
