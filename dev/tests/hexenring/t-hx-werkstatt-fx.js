// (28.10.2026) Werkstatt, Etappe 2: Effekte as a change (a creation's colours burnt into its audio), creations clearly
// other than the original (≥ 30 % of the notes), and each one in the automatic run at least 10 s („geht viel zu
// schnell“); a Trieb with its colours comes back after a reload.   node t-hx-werkstatt-fx.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(120); await sl(500);
    for (const [k, v] of [['hx.laenge', 'fest'], ['hx.festT', 1], ['hx.ws.anzahl', '5'], ['hx.ws.umfang', 'schleife'], ['hx.ws.noten', true], ['hx.ws.rhythmus', true], ['hx.ws.oktaven', false], ['hx.ws.klang', false], ['hx.ws.effekte', true], ['hx.ws.durchg', 'auto']]) M.setParam(k, v);
    const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
    window.__riff(t0, beat, [0, 2, 4, 7, 9, 7, 4, 2], 0.5, { eng: 'klb', dur: beat * 0.4 });
    await window.__until(t0 + 4 * beat + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
    const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    await M.hxWsGrow(L);
    const K = L.krea, ready = K.list.filter((x) => x.V);
    o.n = ready.length;
    o.what = ready.map((x) => M.hxWsWhat(x)).join(' | ');
    o.fx = ready.filter((x) => Object.values(x.sch).some((y) => y.fx)).length;
    o.dist = ready.map((x) => { const y = x.sch[0]; return y && y.vn ? M.hxVDist(S.wn, S.wn.n, y.vn) : 0; });
    // the sound of the original and of the creation with the strongest colour, at the loop's own output
    const prof = async (ms) => {
      const an = A.ctx.createAnalyser(); an.fftSize = 8192; M.A.out.connect(an); const sr = A.ctx.sampleRate, b = new Float32Array(an.frequencyBinCount), acc = new Float64Array(b.length); let n = 0;
      const end = performance.now() + ms; while (performance.now() < end) { an.getFloatFrequencyData(b); for (let i = 0; i < b.length; i++) acc[i] += Math.pow(10, b[i] / 10); n++; await sl(40); }
      try { M.A.out.disconnect(an); } catch (e) {}
      const bands = []; for (let f = 80; f < 12000; f *= 1.26) { let e = 0; const i0 = Math.floor(f / 1.12 / (sr / 8192)), i1 = Math.ceil(f * 1.12 / (sr / 8192)); for (let i = i0; i <= i1; i++) e += acc[i] / n; bands.push(e); }
      return bands;
    };
    const cmp = (a, b) => { const ta = a.reduce((x, y) => x + y, 0), tb = b.reduce((x, y) => x + y, 0); let w = 0; for (let i = 0; i < a.length; i++) if (a[i] > ta * 1e-3) w = Math.max(w, Math.abs(10 * Math.log10((b[i] / tb) / (a[i] / ta)))); return w; };
    const p0 = await prof(4000);
    const pick = ready.find((x) => Object.values(x.sch).some((y) => y.fx && y.fx.k.some((k) => k === 'filter' || k === 'band'))) || ready.find((x) => Object.values(x.sch).some((y) => y.fx));
    o.pick = pick ? M.hxWsWhat(pick) : '-';
    if (pick) {
      M.hxWsPlay(L, pick.i); await sl(3000); const p1 = await prof(4000);
      o.fxDb = cmp(p0, p1);
      o.play = M.HX.sch.get(L.sch[0]).play;
    }
    // the automatic run: each creation at least 10 s
    M.hxWsPlay(L, null); await sl(2500);
    const k0 = M.hxNextSeam(L).k, pass = (M.hxPassF(L, k0 + 1) - M.hxPassF(L, k0)) / A.ctx.sampleRate;
    o.passS = pass; o.passes = M.hxWsPasses(L, k0); o.runS = o.passes * pass;
    // Ja on the coloured one: a Trieb with its colours, after a reload too
    if (pick) { M.hxWsPlay(L, pick.i); await sl(300); M.hxWsJa(L); }
    o.trFx = K.triebe.length && Object.values(K.triebe[0].sch).some((y) => y.fx) ? 1 : 0;
    return o;
  });
  await page.waitForTimeout(1200);
  await page.reload(); await page.waitForFunction(() => !!window.__M); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  Object.assign(r, await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < 80 && !M.hxLoopsLive().length; i++) await sl(100);
    M.hxWeiter();
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !(L.krea && L.krea.sel === 't0' && M.HX.sch.get(L.sch[0]).play === 'krea'); i++) await sl(100);
    return { rFx: L.krea && L.krea.triebe[0] && Object.values(L.krea.triebe[0].sch).some((y) => y.fx) ? 1 : 0, rPlay: M.HX.sch.get(L.sch[0]).play };
  }));
  console.log(JSON.stringify(r));
  ok(r.n === 5 && r.fx === 5, `5 creations, each with colours (${r.what})`);
  ok(Math.min(...r.dist) >= 0.3, `each clearly another than the original (notes changed: ${r.dist.map((x) => Math.round(100 * x) + ' %').join(', ')})`);
  ok(r.play === 'krea' && r.fxDb > 3, `a creation with colours sounds other (${r.pick}: ${r.fxDb && r.fxDb.toFixed(1)} dB in a band)`);
  ok(r.runS >= 10 - 1e-6 && r.passes >= 2, `automatic run: ${r.passes} passes of ${r.passS.toFixed(2)} s = ${r.runS.toFixed(1)} s each`);
  ok(r.trFx === 1 && r.rFx === 1 && r.rPlay === 'krea', 'Ja: a Trieb with its colours – after a reload too, playing');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
