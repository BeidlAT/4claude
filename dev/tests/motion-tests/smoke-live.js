const { open, ok, close, gestikOn } = require('./gk-h');
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(() => window.__pose(45, 0, 600));
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => { const M = window.__M; return { on: M.GK.on, live: M.GK.live, perm: M.GK.perm, src: !!M.GK.src, ports: M.MIDI.ports.size, msg: M.GK.msgT, card: !!document.querySelector('.gk-card'), asked: window.__mo.asked, tile: document.querySelector('[data-gk="on"]').hidden }; });
  console.log(s);
  await page.evaluate(() => window.__pose(45, 25, 600));
  const r = await page.evaluate(() => ({ raw: window.__M.GK.raw, out: window.__M.GK.out, mode: window.__M.GK.mode }));
  console.log(JSON.stringify(r));
  await page.screenshot({ path: 'shots/smoke.png' });
  console.log(errors);
  await close();
})().catch(async (e) => { console.error(e); await close(); process.exitCode = 1; });
