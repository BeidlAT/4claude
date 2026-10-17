const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const B = await openInst(browser, 'http://127.0.0.1:8790/mbase-inst/index.html');
  const N = await openInst(browser, 'http://127.0.0.1:8790/mnew-inst/index.html');
  const one = (X, v) => X.page.evaluate(async (v) => {
    const M = window.__M, A = M.A, sr = 48000, dur = 8;
    const ctx = await window.__off(sr, dur, { 'dev.q': '2', 'dev.lat': 'std', 'glo.decay': 12 });
    if (v.includes('fin')) M.MIX.s.fin.in = A.voiceBus;
    if (v.includes('ret')) { A.dlyRet.disconnect(); A.dlyRet.connect(A.masterSum); const g = ctx.createGain(); g.gain.value = 0.3; A.dlyRet.connect(g).connect(A.revIn); A.revRet.disconnect(); A.revRet.connect(A.masterSum); }
    if (v.includes('mon')) { A.out.disconnect(); A.out.connect(ctx.destination); A.out.connect(A.analyser); }
    if (v.includes('mw')) { A.highSh.disconnect(); A.highSh.connect(A.masterVol); }
    if (v.includes('snd')) { A.insertOut.disconnect(); A.insertOut.connect(A.masterSum); A.insertOut.connect(A.dlySend); A.insertOut.connect(A.revSend); }
    for (let i = 0; i < 24; i++) M.playNote('glo', 0.01 + i * 0.002, 110 * Math.pow(2, (i % 12) / 12), 0.5, 0.5, { pan: (i % 5 - 2) * 0.2 });
    const t0 = performance.now(); await ctx.startRendering(); return (performance.now() - t0) / dur / 10;
  }, v);
  const variants = ['', 'fin', 'ret', 'mon', 'mw', 'snd', 'fin ret mon mw snd'];
  const res = { base: [] }; variants.forEach((v) => (res['new ' + v] = []));
  for (let k = 0; k < 6; k++) { res.base.push(await one(B, '')); for (const v of variants) res['new ' + v].push(await one(N, v)); }
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  for (const k in res) console.log(k.padEnd(26), 'min', Math.min(...res[k]).toFixed(2), 'med', med(res[k]).toFixed(2));
  await browser.close();
})();
