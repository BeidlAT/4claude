// Screenshots for part 4 (not a test): the card's Ladung and Schlafen sections (phone, desktop), the field glowing with
// the ring filling, the veil while asleep, the bar at 360 px.   node shot-gl.js
const { open, close, M, play, gestik, gestikOn } = require('./gl-h');
(async () => {
  {
    const { page } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await page.evaluate(() => { const M = window.__M; M.openPanel('dev'); });
    await page.waitForSelector('.gk-card .gk-lad');
    await page.evaluate(() => { const C = window.__M.GK.card; C.lad.open = true; C.slp.open = true; window.__M.gkSet('ras', true); window.__M.gkCardSync(); C.ladSw.parentNode.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/gl-card-1.png' });
    await page.evaluate(() => { window.__M.GK.card.slp.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/gl-card-2.png' });
    await page.evaluate(() => window.__M.closePanel());
    await page.evaluate(() => { const M = window.__M; M.seqStart(); M.onDown({ pointerId: 5, pt: { x: 0.4, y: 0.5, px: 0.4 * M.VIS.w, py: 0.5 * M.VIS.h } }); });
    await play(page, 2.6, M.shake(2.3, 16, 5, 0.2));
    await page.screenshot({ path: 'shots/gl-glow.png' });
    await page.evaluate(() => window.__M.onUp({ pointerId: 5 }));
    await play(page, 2.4, M.faceDown(45));
    await play(page, 1.5, M.hold(180));
    await page.screenshot({ path: 'shots/gl-sleep.png' });
    await play(page, 1.3, M.faceUp(45));
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'shots/gl-wake.png' });
    await page.context().close();
  }
  {
    const { page } = await open({ cfg: { perm: 'granted' } });
    await gestik(page);
    await page.evaluate(() => { const M = window.__M; M.openPanel('dev'); });
    await page.waitForSelector('.gk-card .gk-lad');
    await page.evaluate(() => { const C = window.__M.GK.card; C.lad.open = true; C.slp.open = true; window.__M.gkCardSync(); C.ladSw.parentNode.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/gl-card-desk.png' });
    await page.context().close();
  }
  {
    const { chromium } = require('/opt/node22/lib/node_modules/playwright');
    for (const w of [320, 360]) {
      const { page } = await open({ mobile: true, cfg: { perm: 'granted' } });
      await page.setViewportSize({ width: w, height: 700 });
      await gestik(page);
      await play(page, 2.2, M.shake(1.6, 16, 5, 0.2));
      await page.screenshot({ path: 'shots/gl-bar-' + w + '.png', clip: { x: 0, y: 0, width: w, height: 60 } });
      await page.context().close();
    }
  }
  await close();
})();
