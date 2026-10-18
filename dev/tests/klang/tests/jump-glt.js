// Glut's Sprung in the browser: held y 0.6 → the jump at 1.2 s; the dip and when the new mode leads (worklet, native)
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const SR = 48000;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html', false);
  for (const nat of [true, false]) for (const [sp, yy, mm] of [['3', 0.85, 3], ['2', 0.82, 2]]) for (const f of [110, 440, 1000]) {
    const x = await page.evaluate(async ([nat, sp, yy, f]) => {
      const M = window.__M; M.P['dev.q'] = '1';
      const ctx = await window.__off(48000, 3, { 'dev.lat': 'std', 'v.eng': nat ? 'neb' : 'glt', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'glt.sprung': sp });
      M.getQ().budget = 1e4; if (!nat) await M.ensureDSP(ctx); let v = null;
      ctx.suspend(19 / 375).then(() => { v = M.playNote('glt', ctx.currentTime, f, 0.6, 0.75, {}); ctx.resume(); });
      ctx.suspend(Math.round(1.2 * 375) / 375).then(() => { v.setY(yy); ctx.resume(); });
      ctx.suspend(Math.round(1.2 * 375) / 375 + 1 / 375).then(() => ctx.resume());
      const b = await ctx.startRendering(); return Array.from(b.getChannelData(0));
    }, [nat, sp, yy, f]);
    const m = Float32Array.from(x), e = L.env(m, SR, 0.01).map(L.db), a = Math.round(1.1 / 0.01), lo = Math.min(...e.slice(a, a + 60));
    let td = null; for (let t = 1.2; t < 2.5; t += 0.01) { const s2 = L.spectrum(m, SR, t, 2048); if (L.harm(s2, f, mm) > L.harm(s2, f, 1) + 10) { td = t - 1.2; break; } }
    console.log(`${nat ? 'native ' : 'worklet'} Sprung ${sp} at ${f} Hz: dip ${(lo - e[a]).toFixed(1)} dB, leads after ${td == null ? '–' : Math.round(td * 1000)} ms, env ${e.slice(a, a + 40).filter((_, i) => i % 4 === 0).map((v) => v.toFixed(0)).join(' ')}`);
  }
  await browser.close();
})();
