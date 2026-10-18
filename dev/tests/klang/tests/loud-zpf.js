// Zapfen's loudness in the real app: the bench's standard phrase (L1, L3, Puls) for the processor and the native stand-in,
// against Nebel/Glocke/Membran.   node loud-zpf.js   env KD_URL, PRM='{"zpf.koerper":"fels"}'
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-zpf-inst/index.html', PRM = JSON.parse(process.env.PRM || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, URL_, false);
  const r = await page.evaluate(async (PRM) => {
    const M = window.__M, DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, out = {};
    const phr = async (eng, q, burst, native) => {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, 10, Object.assign({ 'v.eng': native ? 'neb' : eng, 'dev.lat': 'std' }, DRY, PRM)); M.getQ().budget = 1e4;
      if (!native && eng !== 'neb' && eng !== 'glo' && eng !== 'mem') await M.ensureDSP(ctx);
      const sr = 48000, all = [];
      for (let j = 0; (j + 1) * 0.5 < 10 - 2.5; j++) {
        const t = 0.1 + j * 0.5;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05), y = 0.3 + 0.5 * ((j * 0.61) % 1);
          const v = burst ? M.hit(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2, gate: 0.2 }) : M.playNote(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2 });
          if (v && M.ENGINES[eng].sustain && !burst) { v._rel = now + 0.4; all.push(v); }
          ctx.resume();
        });
        ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume());
      }
      return window.__stats(await ctx.startRendering(), 0.2);
    };
    for (const k of ['neb', 'glo', 'mem']) out[k] = (await phr(k, '1', false, false)).rms;
    for (const native of [false, true]) for (const [n, q, b] of [['L1', '1', false], ['L3', '3', false], ['burst', '1', true]]) { const s = await phr('zpf', q, b, native); out[(native ? 'nat ' : 'wk ') + n] = s.rms + ' / pk ' + s.peak; }
    return out;
  }, PRM);
  const ref = 10 * Math.log10((Math.pow(10, r.neb / 10) + Math.pow(10, r.glo / 10) + Math.pow(10, r.mem / 10)) / 3);
  console.log('refs mean ' + ref.toFixed(2) + '  ' + JSON.stringify(r));
  await browser.close();
})();
