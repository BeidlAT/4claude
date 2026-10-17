const H = require('./gf-h');
(async () => {
  const { page, errors } = await H.open({ cfg: { ins: [['c1', 'Clock Box']] } });
  await page.evaluate(() => { const M = window.__M; M.setParam('midi.clock', 'follow'); M.setParam('midi.transport', true); M.setParam('seq.bpm', 120); });
  await page.evaluate(() => { window.__send([0xfa], 'c1'); window.__ck = setInterval(() => window.__send([0xf8], 'c1'), 25); });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(400);
    console.log(JSON.stringify(await page.evaluate(() => { const M = window.__M; return { on: M.SEQ.on, ext: M.SEQ.ext && +M.SEQ.ext.bpm.toFixed(2), sbpm: +M.SEQ.bpm.toFixed(2), fbpm: +M.FA.bpm.toFixed(2), d: +M.FA.d.toFixed(3), clk: M.CLK.n, run: M.CLK.run }; })));
  }
  console.log(errors);
  await H.close();
})();
