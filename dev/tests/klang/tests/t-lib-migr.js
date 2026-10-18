// Klangquellen: migration – the built-in presets, old exports (version 1 and 2, by the real file input), a stored user
// preset and the stored patch load unchanged; a source this version lacks gives one hint and plays Nebel (the lane its
// default); ENG_ALIAS renames before the check; the Sporenregen's old strikes stay valid.   node t-lib-migr.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const L = require('./dsplib'), K = require('./klh');
const TMP = path.join(__dirname, 'out');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // 1. the stored patch names Glut (a later version's source): one hint at boot, Nebel plays
  let { page, errors, ctx } = await K.open(browser, { w: 390, h: 844, start: false, store: { 'myzel.patch.v1': JSON.stringify({ values: { 'v.eng': 'glt', 'v.layer': 'glo', 'l0.eng': 'kor', 'rev.mix': 0.31 } }) } });
  let r = await page.evaluate(() => ({ eng: window.__M.P['v.eng'], layer: window.__M.P['v.layer'], l0: window.__M.P['l0.eng'], rev: window.__M.P['rev.mix'], t: document.querySelector('#toastMsg').textContent, show: document.querySelector('#toast').classList.contains('show') }));
  L.ok(r.eng === 'neb' && r.layer === 'glo' && r.l0 === 'kor' && r.rev === 0.31 && r.show && r.t === 'Klangquelle „Glut“ gibt es in dieser Version nicht – Nebel gewählt.', 'stored patch with Glut: „' + r.t + '“ – the rest of it kept');
  await ctx.close();
  ({ page, errors, ctx } = await K.open(browser, { w: 390, h: 844 }));
  const M = (fn, a) => page.evaluate(fn, a);
  // 2. every built-in preset: its engines as written, no hint
  r = await M(() => {
    const M = window.__M, bad = [];
    for (const p of M.PRESETS) {
      M.loadPreset(p);
      for (const id of M.KQ_PIDS) if (p.v[id] !== undefined && M.P[id] !== p.v[id]) bad.push(p.key + ':' + id);
      if (/gibt es in dieser Version nicht/.test(document.querySelector('#toastMsg').textContent)) bad.push(p.key + ':hint');
    }
    return { n: M.PRESETS.length, bad };
  });
  L.ok(!r.bad.length, 'all ' + r.n + ' built-in presets load their sources unchanged, without a hint (' + r.bad.join() + ')');
  // 3. old export files through the real file input
  await M(() => window.__M.openPanel('presets')); await page.waitForTimeout(200);
  const files = {
    v1: { app: 'Myzel', version: 1, name: 'Alt eins', values: { 'v.eng': 'glo', 'v.layer': 'sch', 'l0.eng': 'trp', 'l1.eng': 'hau', 'dly.mix': 0.4 } },
    v2: { app: 'Myzel', version: 2, name: 'Alt zwei', values: { 'v.eng': 'klb', 'v.layer': 'off', 'l2.eng': 'swm' }, faehrte: null, gestik: { rgS: 'sai' } },
    bare: { 'v.eng': 'stm', 'l3.eng': 'mem' },
    newer: { app: 'Myzel', version: 2, name: 'Aus der Zukunft', values: { 'v.eng': 'rhz', 'v.layer': 'unk', 'l1.eng': 'unk', 'l2.eng': 'gng' } },
  };
  const out = {};
  for (const k in files) {
    const f = path.join(TMP, 'migr-' + k + '.json'); fs.writeFileSync(f, JSON.stringify(files[k]));
    await page.setInputFiles('#presetFile', f); await page.waitForTimeout(250);
    out[k] = await M(() => { const P = window.__M.P; return { e: P['v.eng'], ly: P['v.layer'], l: [0, 1, 2, 3].map((i) => P['l' + i + '.eng']), t: document.querySelector('#toastMsg').textContent, dly: P['dly.mix'] }; });
  }
  L.ok(out.v1.e === 'glo' && out.v1.ly === 'sch' && out.v1.l[0] === 'trp' && out.v1.l[1] === 'hau' && out.v1.dly === 0.4 && /„Alt eins“ geladen\.$/.test(out.v1.t), 'version 1 export: Glocke + Schale, lanes Tropfen/Hauch („' + out.v1.t + '“)');
  L.ok(out.v2.e === 'klb' && out.v2.ly === 'off' && out.v2.l[2] === 'swm' && !/nicht –/.test(out.v2.t), 'version 2 export: Kalimba, no layer, lane 3 Schwarm');
  L.ok(out.bare.e === 'stm' && out.bare.l[3] === 'mem', 'a bare values object: Stimme, lane 4 Membran');
  L.ok(out.newer.e === 'neb' && out.newer.ly === 'off' && out.newer.l[1] === 'hau' && out.newer.l[2] === 'gng' && out.newer.t === '„Aus der Zukunft“ geladen. Klangquellen „Rhizom“ und „Unke“ gibt es in dieser Version nicht – Nebel gewählt, zweite Ebene aus und Spur 2 spielt Hauch.',
    'a newer export: one toast „' + out.newer.t + '“');
  r = await M(() => { const a = document.querySelector('#toastAct'); return !a.hidden && a.textContent; });
  L.ok(r === 'Rückgängig', '… and it keeps its Rückgängig');
  // 4. a stored user preset in the old shape
  r = await M(() => {
    const M = window.__M; localStorage.setItem('myzel.user.v1', JSON.stringify([{ name: 'Mein altes', v: { 'v.eng': 'tie', 'v.layer': 'mem', 'l0.eng': 'sai' } }]));
    M.loadPreset(M.userPresets()[0]); return { e: M.P['v.eng'], ly: M.P['v.layer'], l0: M.P['l0.eng'] };
  });
  L.ok(r.e === 'tie' && r.ly === 'mem' && r.l0 === 'sai', 'a stored user preset: Tiefe + Membran, lane 1 Saite');
  // 5. ENG_ALIAS: a renamed key follows before the check, no hint
  r = await M(() => { const M = window.__M; M.ENG_ALIAS.alt = 'glo'; M.loadPreset({ name: 'Umbenannt', v: { 'v.eng': 'alt', 'l3.eng': 'alt' } }); const o = { e: M.P['v.eng'], l3: M.P['l3.eng'], t: document.querySelector('#toastMsg').textContent }; delete M.ENG_ALIAS.alt; return o; });
  L.ok(r.e === 'glo' && r.l3 === 'glo' && r.t === '„Umbenannt“ geladen.', 'ENG_ALIAS {alt: glo}: both places play Glocke, no hint');
  // 6. the rain's old strikes stay valid (RG_S derived); an unknown one falls back to Tropfen
  r = await M(() => { const M = window.__M, ok = []; for (const k of ['trp', 'klb', 'glo', 'sch', 'mem', 'sai', 'hlm', 'gng', 'xyz']) { M.GK.p.rgS = k; M.gkCheck(); ok.push(k + '→' + M.GK.p.rgS); } M.GK.p.rgS = 'trp'; return ok.join(' '); });
  L.ok(r === 'trp→trp klb→klb glo→glo sch→sch mem→mem sai→sai hlm→trp gng→trp xyz→trp', 'Sporenregen strikes: ' + r);
  // 7. loading presets again and again: only real sources
  r = await M(() => { const M = window.__M, keys = new Set(M.ENG_OPTS.map((o) => o[0])), bad = []; for (let i = 0; i < 30; i++) { M.loadPreset(M.PRESETS[i % M.PRESETS.length]); for (const id of M.KQ_PIDS) if (M.P[id] !== 'off' && !keys.has(M.P[id])) bad.push(M.P[id]); } return bad; });
  L.ok(!r.length, 'presets loaded 30 times: only sources of this version');
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close(); await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
