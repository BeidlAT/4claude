// Static curve + time behaviour of the master compressor: sine bursts into the master sum, old vs new.
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const B = await openInst(browser, 'http://127.0.0.1:8790/base-inst/index.html');
  const N = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html');
  for (const comp of [0, 0.35, 1]) {
    const line = { comp };
    for (const [name, X] of [['old', B], ['new', N]]) {
      line[name] = await X.page.evaluate(async (comp) => {
        const M = window.__M, A = M.A, sr = 48000, out = [];
        for (const db of [-40, -30, -24, -18, -12, -6, 0]) {
          const ctx = await window.__off(sr, 2, { 'dev.q': '1', 'dev.lat': 'std', 'mst.comp': comp, 'mst.vol': 0, 'mst.low': 0, 'mst.high': 0, 'rev.mix': 0, 'dly.mix': 0 });
          const o = ctx.createOscillator(); o.frequency.value = 220; const g = ctx.createGain(); g.gain.value = Math.pow(10, db / 20);
          o.connect(g).connect(A.masterSum); o.start(0);
          const buf = await ctx.startRendering();
          const d = buf.getChannelData(0); let pk = 0; for (let i = Math.floor(1.5 * sr); i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
          out.push(+(20 * Math.log10(pk) - db).toFixed(2));
        }
        return out.join(' ');
      }, comp);
    }
    console.log(JSON.stringify(line));
  }
  await browser.close();
})();
