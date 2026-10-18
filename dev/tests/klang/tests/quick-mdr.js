// Moder in the real app (slot kd-mdr): health, the standard phrase's loudness at L1/L3 against Nebel/Glocke/Membran,
// peaks, the voice's end – quick, for calibrating MDR_PEAK.   KD_URL=… node quick-mdr.js
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-mdr-inst/index.html';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  const r = await page.evaluate(async () => {
    const M = window.__M, out = {};
    const ctxOf = async (dur, params, q = '1') => { M.P['dev.q'] = q; const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params)); M.getQ().budget = 1e4; out.dsp = await M.ensureDSP(ctx); return ctx; };
    const DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 };
    const phr = async (eng, q) => { const ctx = await ctxOf(10, Object.assign({ 'v.eng': eng }, DRY), q); const sr = 48000;
      for (let j = 0; (j + 1) * 0.5 < 7.5; j++) { const t = 0.1 + j * 0.5; ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05); M.playNote(eng, ctx.currentTime, n.f, 0.3 + 0.5 * ((j * 0.61) % 1), 0.75, { pan: ((j % 5) - 2) * 0.2 }); ctx.resume(); }); ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume()); }
      return window.__stats(await ctx.startRendering(), 0.2); };
    for (const k of ['neb', 'glo', 'mem']) out[k] = (await phr(k, '1')).rms;
    out.L1 = await phr('mdr', '1'); out.L3 = await phr('mdr', '3');
    // one hit: alive, as, its end
    const ctx = await ctxOf(7, Object.assign({ 'v.eng': 'mdr' }, DRY)); let v = null, ends = [];
    ctx.suspend(0.05).then(() => { v = M.playNote('mdr', ctx.currentTime, 220, 0.7, 0.8, {}); ctx.resume(); });
    for (let t = 0.5; t < 6.9; t += 0.25) ctx.suspend(t).then(() => { ends.push([+ctx.currentTime.toFixed(2), +(v.endAt - v.t0).toFixed(2)]); ctx.resume(); });
    const b = await ctx.startRendering(); out.one = window.__stats(b, 0); out.as = v.as; out.wk = !!v.wk; out.endAt = +(v.endAt - v.t0).toFixed(2); out.ends = ends.filter((e, i) => !i || e[1] !== ends[i - 1][1]);
    return out;
  });
  console.log(JSON.stringify(r));
  const ref = 10 * Math.log10((10 ** (r.neb / 10) + 10 ** (r.glo / 10) + 10 ** (r.mem / 10)) / 3);
  console.log('ref mean', ref.toFixed(2), 'L1', r.L1.rms, '(' + (r.L1.rms - ref).toFixed(2) + ')', 'L3', r.L3.rms, '(L3−L1 ' + (r.L3.rms - r.L1.rms).toFixed(2) + ')', 'peaks', r.L1.peak, r.L3.peak);
  console.log('errors', errors.join(' | '));
  await browser.close();
})();
