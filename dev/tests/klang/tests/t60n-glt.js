// Glut native loop: the afterglow T60 / Nachglühen at 55/220/1760 Hz, with Glimmen and the shaper switched off in turn
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const SR = 48000;
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html', false);
  for (const variant of ['all', 'nowalk', 'nowalk-nodf']) {
    const row = [];
    for (const f of [55, 220, 1760]) for (const ng of [1.5, 4]) {
      const r = await page.evaluate(async ([f, ng, variant]) => {
        const M = window.__M; M.P['dev.q'] = '1';
        const ctx = await window.__off(48000, 1.3 + 1.2 * ng, { 'dev.lat': 'std', 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'glt.nachgluehen': ng });
        M.getQ().budget = 1e4; let v = null;
        ctx.suspend(19 / 375).then(() => { v = M.playNote('glt', ctx.currentTime, f, 0.7, 0.75, {}); if (variant !== 'all') { v.gltN.gWr.disconnect(); } if (variant === 'nowalk-nodf') { v.gltN.sh.curve = null; } ctx.resume(); });
        ctx.suspend(Math.round(1.2 * 375) / 375).then(() => { v.release(); ctx.resume(); });
        const b = await ctx.startRendering(); return { x: Array.from(b.getChannelData(0)), st: JSON.stringify(v.gltN.st) };
      }, [f, ng, variant]);
      const m = Float32Array.from(r.x), e = L.env(m, SR, 0.05).map(L.db), a = Math.round(1.3 / 0.05);
      let sx = 0, sy = 0, sxx = 0, sxy = 0, k = 0; for (let i = a; i < e.length && e[i] > e[a] - 35; i++, k++) { const tt = (i - a) * 0.05; sx += tt; sy += e[i]; sxx += tt * tt; sxy += tt * e[i]; }
      const t = -60 / ((k * sxy - sx * sy) / (k * sxx - sx * sx));
      row.push(f + '/' + ng + ': ' + (t == null ? '–' : (t / ng).toFixed(2)));
      if (variant === 'all' && f === 55 && ng === 1.5) console.log(r.st);
    }
    console.log(variant + ' → T60 / Nachglühen: ' + row.join(', '));
  }
  await browser.close();
})();
