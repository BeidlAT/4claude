// debug (gq): why the soak's rain hardly struck – Kalimbatraum's recipe vs Sporenregen chosen by hand, Puls on/off
const { open, close } = require('./gk-h');
const URL = process.env.GQ || 'http://127.0.0.1:8790/gq2-inst/index.html';
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
(async () => {
  for (const mode of (process.argv[2] || 'preset,hand,preset-nopuls').split(',')) {
    const { page, errors } = await open({ url: URL, vp: { width: 390, height: 844, touch: true, mobile: true, ua: DROID_UA }, cfg: { perm: 'granted', seed: 4711 } });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.click('[data-gk="on"]');
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await page.waitForTimeout(800);
    const r = await page.evaluate(async (mode) => {
      const M = window.__M, s = window.__sleep, out = [];
      if (mode.startsWith('preset')) M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum')); else M.gkSet('neigen', 'regen');
      M.closePanel();
      await s(800);
      if (mode.endsWith('nopuls')) { if (M.SEQ.on) M.seqStop(); } else if (!M.SEQ.on) M.seqStart();
      const W = M.VIS.w, H = M.VIS.h;
      for (const [x, y] of [[0.2, 0.5], [0.45, 0.5], [0.7, 0.5]]) { const id = 'k' + x; M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * W, py: (1 - y) * H } }); await s(60); M.onUp({ pointerId: id, pointerType: 'touch' }); }
      window.__setPose({ beta: 30, roll: 18 });
      const n0 = M.RG.n;
      for (let i = 0; i < 16; i++) {
        await s(500);
        const sp = M.RG.sp, v = sp.reduce((a, q) => a + Math.hypot(q.vu, q.vv), 0) / Math.max(1, sp.length);
        out.push({ n: M.RG.n - n0, sp: sp.length, v: +v.toFixed(3), k: M.RG.k.length, rgx: +M.modVal('rgx').toFixed(2), rgy: +M.modVal('rgy').toFixed(2), mute: M.RG.mute, fade: +M.RG.fade.toFixed(2), on: M.RG.on, vo: M.A.voices.size, vb: M.getVB(), load: M.voiceLoad ? M.voiceLoad() : -1, rel: [...M.A.voices].filter((v) => v.released).length, kinds: [...new Set([...M.A.voices].map((v) => v.eng || v.kind || '?'))].join(','), bk: M.RG.bk.length, pq: M.RG.pq.length, seq: M.SEQ.on, mode: M.GK.mode, slp: M.SLP.on, q: M.GK.p.rgQ, rgS: M.GK.p.rgS });
      }
      return out;
    }, mode);
    console.log('#### ' + mode);
    for (const x of r) console.log(JSON.stringify(x));
    if (errors.length) console.log('errors', errors.slice(0, 3));
    await page.context().close();
  }
  await close();
})();
