// Rhizom's price per ping: counts the pings that ring during cost.js's render (the same 24 strikes at Y, DUR), as the
// time-averaged number ringing per voice and the most at once (what voiceLoad() charges), and how much of the window
// the voices live (a voice ends with its cascade – cost.js averages over the whole window). With cost.js's per-voice
// cost for the same settings, cost = base × live + ping × ringing over two or more settings gives RHZ_COST.
//   node rhz-pings.js [runs]      env: DUR=3 Y=0.6 PARAMS='{"rhz.reiz":0}' Q=1     prints one JSON line
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const RUNS = +process.argv[2] || 4, DUR = +process.env.DUR || 3, NV = +process.env.NV || 24;
const XP = JSON.parse(process.env.PARAMS || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html', false);
  const r = await page.evaluate(async ([RUNS, DUR, NV, XP, YH, Q]) => {
    const M = window.__M, t0 = 19 / 375, avg = [], peak = [], live = [];
    for (let run = 0; run < RUNS; run++) {
      M.P['dev.q'] = Q;
      const ctx = await window.__off(48000, DUR, Object.assign({ 'v.eng': 'rhz', 'rev.mix': 0, 'dly.mix': 0 }, XP));
      const oscs = [], st = OscillatorNode.prototype.start, sp = OscillatorNode.prototype.stop;   // (every ping is 2 sines, 3 at level 3)
      OscillatorNode.prototype.start = function (w) { if (this.context === ctx) oscs.push(this._r = { a: w || 0, b: Infinity }); return st.apply(this, arguments); };
      OscillatorNode.prototype.stop = function (w) { if (this._r) this._r.b = w; return sp.apply(this, arguments); };
      const vs = []; ctx.suspend(t0).then(() => { for (let k = 0; k < NV; k++) vs.push(M.playNote('rhz', ctx.currentTime, M.noteAt((k * 0.37) % 1).f, YH, 0.5, {})); ctx.resume(); });
      await ctx.startRendering();
      OscillatorNode.prototype.start = st; OscillatorNode.prototype.stop = sp;
      const per = Q === '3' ? 3 : 2, ring = oscs.reduce((s, o) => s + Math.max(0, Math.min(o.b, DUR) - Math.max(o.a, t0)), 0) / per;
      avg.push(ring / (DUR - t0) / NV);
      live.push(vs.reduce((s, v) => s + Math.max(0, Math.min(v.rz.lastEnd + 0.03, DUR) - t0), 0) / (DUR - t0) / NV);   // (v.finish: the last ping's end + 30 ms)
      // the most at once per voice, as the budget charges it: v.cost = max(table, base + ping × ringing)
      const ev = []; for (const o of oscs) { ev.push([o.a, 1]); ev.push([Math.min(o.b, DUR), -1]); } ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      let n = 0, mx = 0; for (const [, d] of ev) { n += d; mx = Math.max(mx, n); }
      peak.push(mx / per / NV);
    }
    M.P['dev.q'] = '1';
    const mean = (a) => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
    return { runs: RUNS, q: Q, ringingPerVoice: mean(avg), ringingEach: avg.map((x) => +x.toFixed(2)), allAtOncePerVoice: mean(peak), live: mean(live) };
  }, [RUNS, DUR, NV, XP, +(process.env.Y || 0.6), process.env.Q || '1']);
  console.log(JSON.stringify(r));
  await browser.close();
})();
