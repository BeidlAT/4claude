// E1: how fast does an OfflineAudioContext render one pass (2 bars at 84 BPM = 5.714 s, + 1.5 s margin) of a played
// phrase of an expensive source, at level 1 and level 3? Compared with the Nebel unit (24 Nebel voices, cost.js method).
// node e1-render.js [rounds]
process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const ROUNDS = +process.argv[2] || 3;
const CASES = (process.env.CASES || 'neb1,neb3,hrz3,shn3,glt3,gng3,rhz3,elm3,gsp3,amo3,hlm3').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/eng-inst/index.html', false);
  const r = await page.evaluate(async ([ROUNDS, CASES]) => {
    const M = window.__M, SR = 48000, PASS = 2 * 4 * 60 / 84, DUR = PASS + 1.5;
    // a phrase: 16 eighth notes over two bars, every third a two-note chord, held 0.6 s (struck engines just strike)
    async function phrase(eng, q) {
      M.P['dev.q'] = q;
      const ctx = await window.__off(SR, DUR, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0 });
      if (M.WORKLET_ENGINES.has(eng)) await M.ensureDSP(ctx);
      const step = PASS / 16, all = [];
      let notes = 0;
      for (let j = 0; j < 16; j++) {
        const t = 0.02 + j * step;
        ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const xs = j % 3 === 0 ? [(j * 0.37) % 1 * 0.8 + 0.1, ((j * 0.37) % 1 * 0.8 + 0.3) % 1] : [(j * 0.37) % 1 * 0.9 + 0.05];
          for (const x of xs) {
            const v = M.playNote(eng, now, M.noteAt(x).f, 0.3 + 0.5 * ((j * 0.61) % 1), 0.75, { pan: ((j % 5) - 2) * 0.2 });
            notes++;
            if (v && M.ENGINES[eng].sustain) { v._rel = now + 0.6; all.push(v); }
          }
          ctx.resume();
        });
      }
      // the releases of the last notes
      for (const tr of [PASS + 0.2, PASS + 0.7]) ctx.suspend(Math.round(tr * SR / 128) * 128 / SR).then(() => { const now = ctx.currentTime; for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release(); ctx.resume(); });
      const t0 = performance.now(); const buf = await ctx.startRendering(); const ms = performance.now() - t0;
      return { ms, notes, peak: window.__stats(buf).peak };
    }
    async function base(q) { M.P['dev.q'] = q; const ctx = await window.__off(SR, DUR, { 'rev.mix': 0, 'dly.mix': 0 }); const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0; }
    async function nebUnit() {   // cost.js: 24 held Nebel voices, level 1, 4 s, minus an empty render → ms per voice-second
      M.P['dev.q'] = '1'; const D = 4;
      const c0 = await window.__off(SR, D, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0 }); let t0 = performance.now(); await c0.startRendering(); const b = performance.now() - t0;
      const c = await window.__off(SR, D, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0 });
      c.suspend(19 / 375).then(() => { for (let k = 0; k < 24; k++) M.playNote('neb', c.currentTime, M.noteAt((k * 0.37) % 1).f, 0.6, 0.5, {}); c.resume(); });
      t0 = performance.now(); await c.startRendering(); return (performance.now() - t0 - b) / 24 / D;
    }
    const best = {}, keep = (k, v) => { best[k] = Math.min(best[k] == null ? Infinity : best[k], v); };
    const info = {};
    for (let i = 0; i < ROUNDS; i++) {
      keep('unit', await nebUnit());
      keep('base1', await base('1')); keep('base3', await base('3'));
      for (const c of CASES) { const x = await phrase(c.slice(0, -1), c.slice(-1)); keep(c, x.ms); info[c] = { notes: x.notes, peak: x.peak }; }
    }
    const out = { passS: +PASS.toFixed(3), durS: +DUR.toFixed(3), unitMsPerVoiceS: +best.unit.toFixed(2), base1Ms: +best.base1.toFixed(0), base3Ms: +best.base3.toFixed(0) };
    for (const c of CASES) {
      const b = c.endsWith('3') ? best.base3 : best.base1, net = best[c] - b;
      out[c] = { ms: +best[c].toFixed(0), rtWhole: +(best[c] / 1000 / DUR).toFixed(3), rtVoicesOnly: +(net / 1000 / DUR).toFixed(3), units: +(net / DUR / best.unit).toFixed(2), notes: info[c].notes, peak: info[c].peak };
    }
    M.P['dev.q'] = '1';
    return out;
  }, [ROUNDS, CASES]);
  console.log(JSON.stringify(r, null, 1));
  if (errors.length) console.log('errors', errors.slice(0, 5));
  await browser.close();
})();
