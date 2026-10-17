const H = require('./gk-h');
(async () => {
  const { page, errors } = await H.open({ url: 'http://127.0.0.1:8790/gf-inst/index.html', cfg: { perm: 'granted' } });
  const r = await page.evaluate(async () => {
    const M = window.__M;
    await window.__sleep(300);
    return { t0: M.FA.t0, bpm: M.FA.bpm, lanes: M.FA.lanes.size, st: M.faeState(), txt: M.faeText(), btn: document.getElementById('btnFae').hidden };
  });
  console.log(JSON.stringify(r));
  await H.gestikOn(page);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => ({ live: window.__M.GK.live, btn: document.getElementById('btnFae').hidden, sec: !!document.querySelector('.fae-sec'), fs: !!document.querySelector('.gk-fs'), txt: window.__M.faeText() }));
  console.log(JSON.stringify(r2));
  console.log('errors', errors);
  await H.close();
})();
