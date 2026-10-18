// Every source in the real app (a running AudioContext, the module loaded): each one sounds when played, nothing throws.
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, process.env.KN_URL || 'http://127.0.0.1:8790/kn-inst/index.html', true);
  await page.click('#btnStart'); await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, out = [];
    const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
    for (const [k] of M.ENG_OPTS) {
      M.setParam('v.eng', k);
      for (let i = 0; i < 100 && M.DSP.state === 'laden'; i++) await new Promise((r) => setTimeout(r, 20));
      const v = M.playNote(k, A.ctx.currentTime + 0.01, M.noteAt(0.5).f, 0.6, 0.8, {});
      let mx = -200; for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 70)); mx = Math.max(mx, rms()); }
      if (v && v.release && !v.released) v.release();
      out.push([k, v && v.as, +mx.toFixed(1)]);
      await new Promise((r) => setTimeout(r, 250)); M.panic();
      await new Promise((r) => setTimeout(r, 150));
    }
    return { out, dsp: M.DSP.state };
  });
  const bad = r.out.filter(([k, as, lv]) => as !== k || lv < -60);
  console.log('DSP', r.dsp); for (const x of r.out) console.log((x[1] === x[0] && x[2] > -60 ? 'ok  ' : 'BAD ') + x.join(' '));
  const errs = errors.filter((e) => !/Failed to load resource|fonts\.g/.test(e));
  console.log(bad.length || errs.length ? 'FAIL' : 'PASS', r.out.length + ' sources, ' + bad.length + ' silent or stand-in, errors: ' + errs.join(' | '));
  await browser.close();
})();
