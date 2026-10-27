// (owner, 27.10.2026: „dass presets automatisch die schleifen mitspeichern. und dass VERLÄSSLICH nie mehr was verloren
// geht“) An own preset keeps its Leiste; what leaves the Leiste unkept becomes an automatic Kreis.
// node t-hx-presetleiste.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    for (const k of (await M.hxKrList()) || []) M.hxKrDel(k.id, true);
    M.setUserPresets([]); M.UI.upr = null;
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const rec = async (degs, eng) => {
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.6, degs, 1, { eng, dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null);
      const done = () => M.hxLoopsLive().every((L) => L.sch.every((id) => M.HX.sch.get(id).aud));
      for (let i = 0; i < 100 && !done(); i++) await sl(100);
      await sl(2600);
    };
    const sig = () => M.hxLoopsLive().sort((a, b) => a.slot - b.slot).map((L) => { const S = M.HX.sch.get(L.sch[0]); let h = 0; for (let i = 0; i < S.n; i += 97) { const c = S.aud[Math.floor(i / M.HX_CH)]; h = (h * 31 + Math.round(c[0][i % M.HX_CH] * 1e6)) | 0; } return S.n + ':' + h; }).join(' ');
    const idle = async () => { for (let i = 0; i < 300 && (M.HXKR.busy || M.HXKR.q.length); i++) await sl(100); await sl(100); };
    const save = (name) => { const inp = document.getElementById('presetName'); inp.value = name; inp.parentElement.querySelector('button.primary').click(); };
    const own = (name) => M.userPresets().find((p) => p.name === name);
    const kreise = async () => { M.HXKR.list = null; return (await M.hxKrList()) || []; };
    // 1. two Schleifen, saved as preset A (through its button)
    await rec([0, 4, 7, 4], 'klb'); await rec([12, 9, 7, 5], 'mem');
    o.sigA = sig();
    save('A'); await idle();
    o.krA = own('A').kr; o.k1 = (await kreise()).map((k) => k.name + '/' + k.n + '/' + (k.preset || '') + '/' + (k.auto || ''));
    // 2. Alle leeren: kept already (A holds them) – no automatic Kreis
    M.hxLeeren(); await idle(); o.k2 = (await kreise()).length; o.n2 = M.hxLoopsLive().length;
    // 3. A loaded: its two back, the same audio
    M.loadPreset(own('A'), true); for (let i = 0; i < 50 && M.hxLoopsLive().length < 2; i++) await sl(100);
    await sl(300); o.sig3 = sig(); o.upr3 = M.UI.upr && M.UI.upr.name;
    // 4. one more Schleife while A is current; a built-in preset loaded: A keeps the three, the Leiste stays
    await rec([3, 3, 5, 3], 'klb');
    o.sig4 = sig();
    M.loadPreset(M.PRESET_LEER); await idle();
    o.n4 = M.hxLoopsLive().length; o.krA4 = own('A').kr; o.k4 = (await kreise()).map((k) => k.name + '/' + k.n);
    o.oldGone = !(await kreise()).some((k) => k.id === o.krA);
    // 5. an empty Leiste saved as B; B loaded clears, A brings the three back
    M.hxLeeren(); await idle(); o.k5 = (await kreise()).length;
    save('B'); await idle(); o.krB = own('B').kr;
    M.loadPreset(own('A'), true); for (let i = 0; i < 50 && M.hxLoopsLive().length < 3; i++) await sl(100); await sl(300);
    o.sig5 = sig();
    M.loadPreset(own('B'), true); await sl(500); o.n5b = M.hxLoopsLive().length; await idle(); o.k5b = (await kreise()).length;
    M.loadPreset(own('A'), true); for (let i = 0; i < 50 && M.hxLoopsLive().length < 3; i++) await sl(100); await sl(300);
    o.sig5a = sig();
    // 6. a new Schleife, then one deleted: an automatic Kreis holds it; its record stays in „rings“ until that is written
    await rec([7, 5, 4, 2], 'mem');
    const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0], key = L.key;
    M.hxDelete(L);
    o.held = !!(await M.idbDo('rings', 'readonly', (st) => st.get(key)));
    await idle();
    o.after = !!(await M.idbDo('rings', 'readonly', (st) => st.get(key)));
    o.auto6 = (await kreise()).filter((k) => k.auto).map((k) => k.name + '/' + k.n);
    // 7. a Schleife recorded under preset C that has none yet (an older preset): leaving C keeps it with C
    M.setUserPresets([{ name: 'C', v: M.userPresets()[0].v }].concat(M.userPresets()));
    M.hxLeeren(); await idle();
    M.loadPreset(own('C'), true); await sl(200);
    await rec([0, 2, 4, 5], 'klb'); o.sigC = sig();
    M.loadPreset(own('A'), true); for (let i = 0; i < 50 && M.hxLoopsLive().length < 3; i++) await sl(100); await idle();
    o.krC = own('C').kr; o.sig7 = sig();
    M.loadPreset(own('C'), true); for (let i = 0; i < 50 && sig() !== o.sigC; i++) await sl(100);
    o.sig7c = sig();
    o.all = (await kreise()).map((k) => k.name + '/' + k.n);
    return o;
  });
  console.log(JSON.stringify(r, null, 1));
  ok(r.krA && r.krA !== 'leer' && r.k1.length === 1 && /^Preset „A“\/2\/A\//.test(r.k1[0]), `preset A saved with its two Schleifen as its Kreis (${r.k1})`);
  ok(r.n2 === 0 && r.k2 === 1, `„Alle leeren“ of Schleifen A holds: no automatic Kreis (${r.k2} Kreis)`);
  ok(r.sig3 === r.sigA && r.upr3 === 'A', `A loaded: the same two back, sample for sample`);
  ok(r.n4 === 3 && r.krA4 !== r.krA && r.oldGone && r.k4.some((x) => x === 'Preset „A“/3'), `leaving A for a built-in preset: A keeps the three (${r.k4}), the Leiste stays (${r.n4})`);
  ok(r.k5 === 1 && r.krB === 'leer', `an empty Leiste saved as B (${r.krB})`);
  ok(r.sig5 === r.sig4 && r.n5b === 0 && r.k5b === 1 && r.sig5a === r.sig4, `A ↔ B: three, none, three again – no Kreis more (${r.k5b})`);
  ok(r.held && !r.after && r.auto6.length === 1 && /^Gelöscht: Schleife \d+ – .*\/1$/.test(r.auto6[0]), `a deleted Schleife: kept as an automatic Kreis (${r.auto6}); its record in „rings“ until then (${r.held}/${r.after})`);
  ok(r.krC && r.krC !== 'leer' && r.sig7c === r.sigC, `an older preset without a Leiste keeps the one it ends with (${r.all})`);
  // 8. a reload: the presets' Kreise are there, A loads its three
  await page.reload(); await page.waitForFunction(() => !!window.__M); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.waitForTimeout(2500);
  const n = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms));
    M.loadPreset(M.userPresets().find((p) => p.name === 'A'), true);
    for (let i = 0; i < 80 && M.hxLoopsLive().length < 3; i++) await sl(100);
    await sl(500);
    return M.hxLoopsLive().length;
  });
  ok(n === 3, `after a reload: A brings its three (${n})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
