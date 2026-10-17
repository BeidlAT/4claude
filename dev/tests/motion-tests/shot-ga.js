// Screenshots for part 3 (not a test): the Gestik card's "Neigen formt" and Anlehnen settings (phone, desktop), the
// field with a snapped note (label + glow leaning), a carried note.   node shot-ga.js
const { open, close, gestikOn } = require('./ga-h');
(async () => {
  {
    const { page } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestikOn(page);
    await page.evaluate(() => { window.__sensor(true, { beta: 45, roll: 0 }); });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const C = window.__M.GK.card; C.ga.open = true; C.neigen.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/ga-card-1.png' });
    await page.evaluate(() => { window.__M.GK.card.ga.querySelector('.kc-opts').scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/ga-card-2.png' });
    // the field: a note bent and snapped, another one held
    await page.evaluate(async () => {
      const M = window.__M;
      M.closePanel();
      M.onDown({ pointerId: 5, pointerType: 'touch', pt: { x: 0.25, y: 0.45, px: 0.25 * M.VIS.w, py: 0.55 * M.VIS.h } });
      await window.__sleep(150);
      M.onDown({ pointerId: 6, pointerType: 'touch', pt: { x: 0.62, y: 0.6, px: 0.62 * M.VIS.w, py: 0.4 * M.VIS.h } });
      await window.__sleep(200);
      for (let i = 1; i <= 10; i++) { window.__setPose({ beta: 45 - i * 1.5, roll: i * 3.2 }); await window.__sleep(40); }
      await window.__sleep(150);
    });
    await page.screenshot({ path: 'shots/ga-field-snap.png' });
    await page.context().close();
  }
  {
    const { page } = await open({ cfg: { perm: 'granted' } });
    await gestikOn(page);
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const C = window.__M.GK.card; C.ga.open = true; window.__M.gkCardSync(); C.neigen.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/ga-card-desk.png' });
    await page.context().close();
  }
  await close();
})();
