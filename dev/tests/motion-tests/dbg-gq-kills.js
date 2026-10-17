// debug (gq): Voice.kill() calls (and how loud the voice still was) in Kalimbatraum: the Puls alone (no Gestik), the
// app before Gestik, and with the rain – who makes the loud cuts?
const { open, close } = require('./gk-h');
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
(async () => {
  for (const [name, url, gk] of [['old app, Puls only', 'http://127.0.0.1:8790/gqbase-inst/index.html', false], ['new app, Puls only', 'http://127.0.0.1:8790/gq-inst/index.html', false], ['new app, Puls + rain', 'http://127.0.0.1:8790/gq-inst/index.html', true]]) {
    const { page } = await open({ url, vp: { width: 390, height: 844, touch: true, mobile: true, ua: DROID_UA }, cfg: { perm: 'granted', seed: 31 } });
    if (gk) { await page.evaluate(() => window.__M.openPanel('dev')); await page.click('[data-gk="on"]'); await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3)); await page.waitForTimeout(800); }
    const r = await page.evaluate(async (gk) => {
      const M = window.__M, A = M.A, s = window.__sleep, K = [];
      M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum'));
      if (M.closePanel) M.closePanel();
      await s(600);
      if (!M.SEQ.on) M.seqStart();
      const kill = M.Voice.prototype.kill;
      M.Voice.prototype.kill = function () { if (window.__rec) K.push(this.out.gain.value); return kill.call(this); };
      const W = M.VIS.w, H = M.VIS.h;
      for (const [x, y] of [[0.2, 0.5], [0.45, 0.5], [0.7, 0.5]]) { const id = 'k' + x; M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * W, py: (1 - y) * H } }); await s(60); M.onUp({ pointerId: id, pointerType: 'touch' }); }
      if (gk) window.__setPose({ beta: 30, roll: 18 });
      await s(1500);
      const n0 = M.RG ? M.RG.n : 0;
      window.__rec = true; await s(6000); window.__rec = false;
      return { kills: K.length, loud: K.filter((g) => g > 0.02).length, max: +Math.max(0, ...K).toFixed(3), strikes: M.RG ? M.RG.n - n0 : 0, vb: M.getVB ? M.getVB() : null };
    }, gk);
    console.log(name, JSON.stringify(r));
    await page.context().close();
  }
  await close();
})();
