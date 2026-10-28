// (owner, 27.10.2026: „man muss erst auf stille gehen, vorher spielt der falsche sound. dann ein preset auswählen. dann auf
// weiter … dann geht es“) Loops that sound as the field (Klang: Spielfeld) take a preset's sound when it is loaded while
// they play – the same sound as after Stille and Weiter.   node t-hx-feldpreset.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(120); await sl(500);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('v.eng', 'glo');
    const beat = 60 / M.tgBpm(A.ctx.currentTime);
    for (const degs of [[0, 2, 4, 7], [7, 4, 2, 0]]) {
      const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat, degs, 1, { eng: 'glo', dur: beat * 0.6 });
      await window.__until(t0 + 4 * beat + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    }
    for (const L of M.hxLoopsLive()) { M.hxWSet(L, 'wahl', true); M.hxWSet(L, 'klang', 'feld'); }
    await sl(5000);
    const prof = async (ms) => {
      const an = A.ctx.createAnalyser(); an.fftSize = 8192; M.A.out.connect(an); const sr = A.ctx.sampleRate, b = new Float32Array(an.frequencyBinCount), acc = new Float64Array(b.length); let n = 0;
      const end = performance.now() + ms; while (performance.now() < end) { an.getFloatFrequencyData(b); for (let i = 0; i < b.length; i++) acc[i] += Math.pow(10, b[i] / 10); n++; await sl(40); }
      try { M.A.out.disconnect(an); } catch (e) {}
      const bands = []; for (let f = 80; f < 12000; f *= 1.26) { let e = 0; const i0 = Math.floor(f / 1.12 / (sr / 8192)), i1 = Math.ceil(f * 1.12 / (sr / 8192)); for (let i = i0; i <= i1; i++) e += acc[i] / n; bands.push(e); }
      return bands;
    };
    const cmp = (a, b) => { const ta = a.reduce((x, y) => x + y, 0), tb = b.reduce((x, y) => x + y, 0); let w = 0; for (let i = 0; i < a.length; i++) if (a[i] > ta * 1e-3) w = Math.max(w, Math.abs(10 * Math.log10((b[i] / tb) / (a[i] / ta)))); return w; };
    const sig = () => M.hxLoopsLive().map((L) => (M.HX.sch.get(L.sch[0]).wu || {}).sig).join('|');
    o.s0 = sig(); const p0 = await prof(3000);
    // a preset in the same key and tempo – only its sound is another (the owner's case: nothing else makes the loops anew)
    const pr = { name: 'Anderer Klang', v: Object.assign(M.patchValues(), { 'v.eng': 'mem', 'flt.freq': 1400, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false }) };
    o.pr = 'gleiche Tonart/mem';
    M.loadPreset(pr); await sl(6000);   // (no Stille: while the loops play)
    o.s1 = sig(); const p1 = await prof(3000);
    M.hxStille(); await sl(800); M.hxWeiter(); await sl(6000);   // (the owner's way round)
    const p2 = await prof(3000);
    o.changed = cmp(p0, p1); o.likeStille = cmp(p2, p1);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.s1 !== r.s0, `a preset loaded while the field loops play (${r.pr}): they are rendered anew`);
  ok(r.changed > 3, `…their sound changes with it (${r.changed.toFixed(1)} dB in a band)`);
  ok(r.likeStille < 2.5, `…the same sound as after Stille and Weiter (within ${r.likeStille.toFixed(1)} dB)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
