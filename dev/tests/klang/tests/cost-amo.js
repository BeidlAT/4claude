// Amöbe: render time of 24 voices at one pitch/height in the browser (offline), against Halm and an empty processor –
// to find where the browser's cost comes from.   node cost-amo.js [rounds]
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const ROUNDS = +process.argv[2] || 4;
const CASES = JSON.parse(process.env.CASES || '[["null",110,0.6],["hlm",110,0.6],["amo",55,0.6],["amo",110,0.6],["amo",440,0.6],["amo",110,0],["amo",110,1]]');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-amo-inst/index.html', false);
  const r = await page.evaluate(async ([ROUNDS, CASES]) => {
    const M = window.__M;
    async function run(eng, f, y, n, q) {
      M.P['dev.q'] = q || '1';
      const ctx = await window.__off(48000, 4, Object.assign({ 'v.eng': eng === 'null' ? 'hlm' : eng, 'rev.mix': 0, 'dly.mix': 0 }));
      await M.ensureDSP(ctx);
      ctx.suspend(19 / 375).then(() => {
        for (let k = 0; k < n; k++) {
          if (eng === 'null') { const nd = new AudioWorkletNode(ctx, 'myzel-null', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { on: { on: 0 } } }); nd.connect(ctx.destination); }
          else M.playNote(eng, ctx.currentTime, f * Math.pow(2, (k % 5) / 60), y, 0.5, {});
        }
        ctx.resume();
      });
      const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
    }
    const best = {};
    for (let i = 0; i < ROUNDS; i++) {
      const b0 = await run('neb', 110, 0.5, 0); best.base = Math.min(best.base || 1e9, b0);
      const nb = await run('neb', 110, 0.5, 24); best.neb = Math.min(best.neb || 1e9, nb);
      for (const [e, f, y, q] of CASES) { const k = e + '@' + f + '/' + y + (q ? '/L' + q : ''); best[k] = Math.min(best[k] || 1e9, await run(e, f, y, 24, q)); }
    }
    const u = best.neb - best.base, out = {};
    for (const k in best) if (k !== 'base' && k !== 'neb') out[k] = +((best[k] - best.base) / u).toFixed(3);
    return out;
  }, [ROUNDS, CASES]);
  console.log(JSON.stringify(r));
  await browser.close();
})();
