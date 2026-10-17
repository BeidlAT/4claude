// debug (gq): face down from the playing pose (beta 45, in the hand, tremor 3) – when does Wenden / Schlafen come?
const { open, close } = require('./gk-h');
const URL = process.env.GQ || 'http://127.0.0.1:8790/gq2-inst/index.html';
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
(async () => {
  for (const [base, roll0, keys] of [[45, 0, false], [45, 0, true], [15, 0, false], [45, 15, false], [57, 10, true]]) {
    const { page } = await open({ url: URL, vp: { width: 390, height: 844, touch: true, mobile: true, ua: DROID_UA }, cfg: { perm: 'granted', seed: 4711, ins: [['k1', 'microKEY2-37 KEYBOARD']] } });
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.click('[data-gk="on"]');
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await page.waitForTimeout(800);
    const r = await page.evaluate(async ([base, roll0, keys]) => {
      const M = window.__M, s = window.__sleep, out = [];
      M.closePanel(); M.seqStart();
      window.__setPose({ beta: base, roll: roll0 }); await s(1500);
      let iv = 0;
      if (keys) iv = setInterval(() => { const n = 48 + Math.floor(Math.random() * 12); window.__send([0x90, n, 90]); setTimeout(() => window.__send([0x80, n, 0]), 400); }, 900);
      const t0 = performance.now();
      while (performance.now() - t0 < 5600) {
        const u = (performance.now() - t0) / 1000, b = u < 0.8 ? base + (180 - base) * (u / 0.8) : u < 4.8 ? 180 : 180 - (180 - base) * ((u - 4.8) / 0.8);
        window.__S.p = { beta: Math.max(base, Math.min(180, b)), roll: u < 0.8 ? roll0 * (1 - u / 0.8) : 0 };
        out.push((M.GK.ev.wenden ? 'W' : '.') + (M.SLP.on ? 'S' : '_'));
        await s(100);
      }
      clearInterval(iv);
      return out.join(' ');
    }, [base, roll0, keys]);
    console.log('base', base, 'roll', roll0, 'keys', keys, r);
    await page.context().close();
  }
  await close();
})();
