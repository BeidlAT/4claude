// (owner, 28.10.2026) the Gärtner's Werkstatt: creations grown in the background, chosen from the list, played through
// automatically (each for its passes), „Ja“ keeps one as a Trieb, the original stays; the Trieb comes back after a reload;
// Umfang „Leiste“: every loop together.   node t-hx-werkstatt.js <outdir>
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const mk = async () => page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
    window.__riff(t0, beat, [0, 2, 4, 7], 1, { eng: 'klb', dur: beat * 0.6 });
    await window.__until(t0 + 4 * beat + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
    const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    M.HX.chips = null; M.hxRailDirty();   // (the chips after the harvest: gone, as after a while or a tap)
    return L.slot;
  });
  await page.evaluate(async () => { const M = window.__M; await window.__reset(); window.__grid(120); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('hx.ws.anzahl', '5'); M.setParam('hx.ws.umfang', 'schleife'); M.setParam('hx.ws.klang', true); M.setParam('hx.ws.effekte', false); M.setParam('hx.ws.durchg', '1'); await window.__sleep(500); });
  const slot = await mk();
  await page.waitForSelector('.hx-wsg:not([hidden])', { timeout: 30000 }).catch(() => {});   // (the chips after a harvest take the rings' place a while)
  const r = {};
  r.glyph = await page.evaluate((s) => { const g = window.__M.HXWS.glyphs[s]; return !!g && !g.hidden; }, slot);
  await page.click('.hx-wsg:not([hidden])');
  await page.waitForTimeout(300);
  await page.click('.hx-wsb.grow');
  const t0 = Date.now();
  await page.waitForFunction(() => !window.__M.HXWS.gen, null, { timeout: 180000 });
  r.growS = ((Date.now() - t0) / 1000).toFixed(1);
  await page.screenshot({ path: (process.argv[2] || '.') + '/ws-liste.png' });
  Object.assign(r, await page.evaluate(async (s) => {
    const M = window.__M, L = M.hxRingL(s), K = L.krea, sl = window.__sleep, o = {};
    o.n = K.list.filter((x) => x.V).length;
    o.engs = K.list.map((x) => Object.values(x.sch || {}).map((y) => y.eng || '-').join(',')).join(' ');
    const meter = async () => { const m = await window.__meter(L.id, 1500); return Math.max(...m.map((x) => x[1])); };
    // a click on creation 2 in the list
    const row = [...document.querySelectorAll('.hx-ws .hx-wsr')].find((x) => x.textContent.trim() === '2'); row.click();
    for (let i = 0; i < 60 && M.HX.sch.get(L.sch[0]).play !== 'krea'; i++) await sl(100);
    await sl(2600);
    o.play = M.HX.sch.get(L.sch[0]).play; o.sel = K.sel; o.lvl = await meter();
    // the automatic run: two creations in turn, each one pass
    const seen = new Set(); M.hxWsAuto(L);
    const end = performance.now() + 5000; while (performance.now() < end) { if (typeof K.sel === 'number') seen.add(K.sel); await sl(100); }
    o.auto = [...seen].join(',');
    // Ja
    M.hxWsJa(L); await sl(300);
    o.triebe = K.triebe.length; o.selT = K.sel; o.autoOff = !M.HXWS.auto;
    o.lvl2 = await meter();
    return o;
  }, slot));
  // a reload: the Trieb comes back and plays again
  await page.waitForTimeout(800);
  await page.reload(); await page.waitForFunction(() => !!window.__M); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  Object.assign(r, await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < 80 && !M.hxLoopsLive().length; i++) await sl(100);
    M.hxWeiter();
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !(L.krea && L.krea.sel === 't0' && M.HX.sch.get(L.sch[0]).play === 'krea'); i++) await sl(100);
    return { rTriebe: L.krea ? L.krea.triebe.length : 0, rSel: L.krea && L.krea.sel, rPlay: M.HX.sch.get(L.sch[0]).play };
  }));
  console.log(JSON.stringify(r));
  ok(r.glyph, 'a loop with notes: the Keimling at its ring');
  ok(r.n === 5, `5 creations grown in the background (${r.growS} s) – each its own source too (${r.engs})`);
  ok(r.play === 'krea' && r.sel === 1 && r.lvl > 0.01, `a click on creation 2: it plays from the next 1 (level ${r.lvl.toFixed(3)})`);
  ok(r.auto.split(',').length >= 2, `▶: the creations in turn, each for its passes (${r.auto})`);
  ok(r.triebe === 1 && r.selT === 't0' && r.autoOff && r.lvl2 > 0.01, `„Ja“: kept as a Trieb, it plays on, the run stops`);
  ok(r.rTriebe === 1 && r.rSel === 't0' && r.rPlay === 'krea', `after a reload the Trieb is there and plays again (${r.rSel}, ${r.rPlay})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
