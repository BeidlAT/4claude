// (owner, 28.10.2026: „Instrument folgt dem Preset – separat zuschaltbar, zusätzlich zur Tonart“) ui.instrument: off, a
// preset loaded under two loops leaves their sound as it was; on, they sound with the preset's instrument (as Klang
// „Spielfeld“); off again, their own once more.   node t-hx-instrument.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(120); await sl(500);
    M.setParam('ui.instrument', 'eigen'); M.setParam('ui.tonart', 'schleifen');
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('v.eng', 'glo');
    const beat = 60 / M.tgBpm(A.ctx.currentTime);
    for (const degs of [[0, 2, 4, 7], [7, 4, 2, 0]]) {
      const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat, degs, 1, { eng: 'glo', dur: beat * 0.6 });
      await window.__until(t0 + 4 * beat + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    }
    await sl(3000);
    const prof = async (ms) => {
      const an = A.ctx.createAnalyser(); an.fftSize = 8192; M.A.out.connect(an); const sr = A.ctx.sampleRate, b = new Float32Array(an.frequencyBinCount), acc = new Float64Array(b.length); let n = 0;
      const end = performance.now() + ms; while (performance.now() < end) { an.getFloatFrequencyData(b); for (let i = 0; i < b.length; i++) acc[i] += Math.pow(10, b[i] / 10); n++; await sl(40); }
      try { M.A.out.disconnect(an); } catch (e) {}
      const bands = []; for (let f = 80; f < 12000; f *= 1.26) { let e = 0; const i0 = Math.floor(f / 1.12 / (sr / 8192)), i1 = Math.ceil(f * 1.12 / (sr / 8192)); for (let i = i0; i <= i1; i++) e += acc[i] / n; bands.push(e); }
      return bands;
    };
    const cmp = (a, b) => { const ta = a.reduce((x, y) => x + y, 0), tb = b.reduce((x, y) => x + y, 0); let w = 0; for (let i = 0; i < a.length; i++) if (a[i] > ta * 1e-3) w = Math.max(w, Math.abs(10 * Math.log10((b[i] / tb) / (a[i] / ta)))); return w; };
    const play = () => M.hxLoopsLive().map((L) => M.HX.sch.get(L.sch[0]).play).join(',');
    const p0 = await prof(3000); o.play0 = play();
    // a preset in the same key – only its instrument is another; the field is kept silent (the loops alone are measured)
    const pr = { name: 'Anderes Instrument', v: Object.assign(M.patchValues(), { 'v.eng': 'mem', 'flt.freq': 1400, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false }) };
    M.loadPreset(pr); await sl(6000);
    const p1 = await prof(3000); o.play1 = play();
    M.setParam('ui.instrument', 'preset'); await sl(7000);
    const p2 = await prof(3000); o.play2 = play();
    M.setParam('ui.instrument', 'eigen'); await sl(7000);
    const p3 = await prof(3000); o.play3 = play();
    o.off = cmp(p0, p1); o.on = cmp(p0, p2); o.back = cmp(p0, p3);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.off < 2.5, `off: a preset with another instrument leaves the loops as they were (${r.off.toFixed(1)} dB, ${r.play1})`);
  ok(r.on > 3, `on: the loops sound with the preset's instrument (${r.on.toFixed(1)} dB in a band, ${r.play2})`);
  ok(r.back < 2.5, `off again: their own instrument once more (${r.back.toFixed(1)} dB, ${r.play3})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
