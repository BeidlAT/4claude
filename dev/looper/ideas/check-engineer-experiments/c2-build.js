// C2: main-thread time to BUILD one Wuchs pass (the e1 phrase: 2 bars at 84 BPM, 22 notes with chords, level 3) –
// the JS work inside the suspend callbacks (playNote, releases), not the audio render. This is what the Wuchs renderer
// costs on the main thread, next to the UI and the live scheduler. Also: nodes created per pass.
process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const CASES = (process.env.CASES || 'neb3,gng3,hrz3,rhz3,kor3,elm3,gsp3,jrg3,sch3,swm3,amo3').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/crit-inst/index.html', false);
  const r = await page.evaluate(async (CASES) => {
    const M = window.__M, SR = 48000, PASS = 2 * 4 * 60 / 84, DUR = PASS + 1.5, out = {};
    for (const c of CASES) {
      const eng = c.slice(0, -1), q = c.slice(-1); M.P['dev.q'] = q;
      let best = Infinity, nodes = 0, maxCb = 0;
      for (let run = 0; run < 3; run++) {
        const ctx = await window.__off(SR, DUR, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0, 'rhz.reiz': 0.8 });
        try { M.A.clock && M.A.clock.postMessage('stop'); } catch (e) {} if (M.A.clockId) { clearInterval(M.A.clockId); M.A.clockId = 0; }
        if (M.WORKLET_ENGINES.has(eng)) await M.ensureDSP(ctx);
        if (eng === 'kor') { M.preloadTextures(); for (let i = 0; i < 300 && !M.A.tex.glas; i++) await new Promise((r) => setTimeout(r, 20)); }
        const step = PASS / 16, all = []; let ms = 0, n = 0, mx = 0;
        for (let j = 0; j < 16; j++) {
          const t = 0.02 + j * step;
          ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => {
            const t0 = performance.now(), now = ctx.currentTime;
            for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
            const xs = j % 3 === 0 ? [(j * 0.37) % 1 * 0.8 + 0.1, ((j * 0.37) % 1 * 0.8 + 0.3) % 1] : [(j * 0.37) % 1 * 0.9 + 0.05];
            for (const x of xs) {
              const v = M.playNote(eng, now, M.noteAt(x).f, 0.3 + 0.5 * ((j * 0.61) % 1), 0.75, { pan: ((j % 5) - 2) * 0.2 });
              if (v) { all.push(v); if (M.ENGINES[eng].sustain) v._rel = now + 0.6; }
            }
            if (eng === 'kor') M.grainTick(now + step + 0.05);
            const d = performance.now() - t0; ms += d; mx = Math.max(mx, d);
            ctx.resume();
          });
        }
        await ctx.startRendering();
        n = all.reduce((s, v) => s + v.nodes.length, 0);
        if (ms < best) { best = ms; nodes = n; maxCb = mx; }
      }
      out[c] = { buildMsPerPass: +best.toFixed(1), worstCallbackMs: +maxCb.toFixed(1), nodesPerPass: nodes, msPerSecondOfMusic: +(best / PASS).toFixed(1) };
    }
    M.P['dev.q'] = '1';
    return out;
  }, CASES);
  for (const k in r) console.log(k.padEnd(5), JSON.stringify(r[k]));
  if (errors.length) console.log('errors', errors.slice(0, 5));
  await browser.close();
})();
