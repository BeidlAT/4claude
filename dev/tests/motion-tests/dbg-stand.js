process.env.BASE = 'http://127.0.0.1:8790/gx-inst/index.html';
const H = require('./gk-h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { page, errors } = await H.open({ vp: { width: 1180, height: 820, touch: true, mobile: true }, cfg: { perm: 'granted', noMidi: true } });
  await H.gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 70, roll: 0 }, 0.05));
  await sleep(800);
  await page.evaluate(() => window.__M.gkSet('neigen', 'regen'));
  for (let i = 0; i < 6; i++) {
    await sleep(500);
    console.log(await page.evaluate(() => { const M = window.__M, st = M.GK.R.st; return JSON.stringify({ ruhe: st.ruhe, still: +st.still.toFixed(2), zWhy: st.zWhy, zN: st.zN, n: st.n, rf: M.GK.R.opts.restFlat, pz: M.GK.R.opts.pickZero, ty: +M.GK.out.tiltY.toFixed(2), raw: +M.GK.raw.tiltY.toFixed(2), ax: st.axes.tiltY, pitch: st.pitch, z: st.z, u: st.u, ang: st.ang, mode: M.GK.mode, rw: +Math.sqrt(st.rw2).toFixed(2), ra: +Math.sqrt(st.ra2).toFixed(3) }); }));
  }
  console.log(await page.evaluate(() => { const c = document.querySelector('.gk-ww'); const r = c.getBoundingClientRect(); return JSON.stringify({ panel: window.__M.UI.panel, r: [r.x, r.y, r.width, r.height], disp: getComputedStyle(c).display, hidden: document.querySelector('#sheet').hidden }); }));
  console.log(errors);
  await H.close();
})();
