// Hexenring – the Werk-Rahmen's render time (SPEC §10.5, §21; step 2a): what the CPU guard predicts a Wuchs pass from.
// In the Werk-Rahmen itself (the job 'wuchs', the app's whole graph offline), per source and level: a phrase of four
// notes (held 0.6 s where the source holds, struck else) against the empty graph, every case ROUNDS times interleaved,
// the fastest kept (this machine scatters ±20 %). The model the page uses (hxWPredict):
//   render s = CAL.unit · (perS · dur + Σ c[src][q] · min(dur, held + 3 s)) + perRender
// perS and perRender from empty renders of 2 s and 8 s; c from the phrase. Prints HX_WRT / HX_WBASE (+15 % on the
// highest of RUNS runs, as the other costs).
//   node wrt.js            env: ENGS=…, Q=1,2,3, ROUNDS=3, RUNS=2, HX_URL
const H = require('./hx-h');
const ALL = ['hau', 'obt', 'stm', 'hlm', 'boe', 'elm', 'khl', 'neb', 'kor', 'swm', 'amo', 'hrz', 'shn', 'zpf', 'rnk', 'sai', 'jrg', 'glo', 'sch', 'gng', 'klb', 'gsp', 'tie', 'glt', 'mem', 'trp', 'mdr', 'rhz'];
const ENGS = process.env.ENGS ? process.env.ENGS.split(',') : ALL, QS = (process.env.Q || '1,2,3').split(','), ROUNDS = +process.env.ROUNDS || 3, RUNS = +process.env.RUNS || 2;
(async () => {
  const { page } = await H.open({});
  page.setDefaultTimeout(0);
  const runs = [];
  for (let run = 0; run < RUNS; run++) {
    const r = await page.evaluate(async ({ ENGS, QS, ROUNDS }) => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate;
      await M.hxWerk();
      // this machine's unit, as the app measures it (the fastest of a few)
      let unit = Infinity; for (let i = 0; i < 3; i++) { M.CAL.unit = 0; await M.calibrate(); unit = Math.min(unit, M.CAL.unit); }
      const phrase = (eng) => [[0.05, 0, 0.8, 0.7], [0.55, 2, 0.6, 0.5], [1.0, 4, 0.9, 0.9], [1.45, 1, 0.7, 0.4]].map(([t, d, v, y]) => {
        const sus = M.ENGINES[eng].sustain;
        return { t0: t, t1: sus ? t + 0.6 : null, eng, f: M.N.notes[3 + d].f, y0: y, vel: v, pan: d / 6 - 0.3, src: 'fin', burst: false, hold: !!sus, curves: { y: [], f: [] } };
      });
      const job = (notes, dur, q, eng) => M.hxwCall('wuchs', { sr: SR, dur, notes, P: Object.assign({}, M.P, eng ? { 'v.eng': eng } : {}, { 'rhz.reiz': 1 }), q, seed: 3, jrg: { age: 2, season: 0.3 } }).then((m) => (m && m.rms ? m.rms / 1000 : NaN));
      const best = {}, keep = (k, v) => { if (Number.isFinite(v)) best[k] = Math.min(best[k] == null ? Infinity : best[k], v); };
      for (let i = 0; i < ROUNDS; i++) for (const q of QS) {
        keep('e2|' + q, await job([], 2, q)); keep('e8|' + q, await job([], 8, q));
        for (const eng of ENGS) keep(eng + '|' + q, await job(phrase(eng), 4, q, eng));
      }
      const out = { unit, base: {}, c: {} };
      for (const q of QS) {
        const e2 = best['e2|' + q], e8 = best['e8|' + q], perS = (e8 - e2) / 6, perRender = e2 - 2 * perS;
        out.base[q] = { perS: perS / unit, perRender: perRender * 1000 };
        for (const eng of ENGS) {
          const notes = phrase(eng), vs = notes.reduce((a, n) => a + Math.min(4, (n.t1 != null ? n.t1 - n.t0 : 0) + 3), 0), rt = best[eng + '|' + q];
          const c = (rt - (perS * 4 + perRender)) / (unit * vs);
          (out.c[eng] || (out.c[eng] = {}))[q] = +c.toFixed(3);
        }
      }
      return out;
    }, { ENGS, QS, ROUNDS });
    console.log('RUN ' + run + ' ' + JSON.stringify(r));
    runs.push(r);
  }
  // the highest of the runs + 15 %
  const tab = {}, base = {};
  for (const eng of ENGS) tab[eng] = QS.map((q) => +(1.15 * Math.max(...runs.map((r) => Math.max(0, r.c[eng][q])))).toFixed(2));
  for (const q of QS) base[q] = { perS: +(1.15 * Math.max(...runs.map((r) => r.base[q].perS))).toFixed(2), perRender: Math.round(1.15 * Math.max(...runs.map((r) => r.base[q].perRender))) };
  console.log('HX_WRT = ' + JSON.stringify(tab));
  console.log('HX_WBASE = ' + JSON.stringify(base));
  console.log('units (s per voice-second, CAL.unit): ' + runs.map((r) => r.unit.toExponential(3)).join(' '));
  await H.close();
})().catch(async (e) => { console.log('FATAL ' + (e && e.stack || e)); await H.close(); process.exit(1); });
