// Screenshots for part 5 (Fährte, Funkstrecke): the bar at 320/360/390 px with Gestik and the Fährte button, the Gerät
// panel's Fährte section (idle and playing), the Gestik card with the ghost spore and the Funkstrecke fold, a
// computer's card receiving a phone. → shots/gf-*.png
const H = require('./gf-h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = __dirname + '/shots/';
async function loop(page) {
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.len = 1; window.__drive('map:shot:1', 'flt', '0.5*Math.sin(2*Math.PI*t/0.8)'); });
  const b1 = await page.evaluate(() => { const M = window.__M, b = M.faeHeard(performance.now()); return M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4) + 4.3; });
  await page.waitForFunction((b) => window.__M.faeHeard(performance.now()) >= b, b1, { timeout: 9000 });
  await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  await page.evaluate(() => window.__undrive('map:shot:1', 'flt'));
}
(async () => {
  for (const w of [320, 360, 390]) {
    const { page } = await H.open({ mobile: true, cfg: { perm: 'granted' } });
    await page.setViewportSize({ width: w, height: 760 });
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(800);
    await page.evaluate(() => window.__M.closePanel());
    await loop(page);
    await sleep(700);
    await page.screenshot({ path: dir + 'gf-bar-' + w + '.png', clip: { x: 0, y: 0, width: w, height: 60 } });
    if (w === 390) {
      await page.evaluate(() => window.__M.openPanel('dev'));
      await sleep(400);
      await page.evaluate(() => document.querySelector('.gk-card').scrollIntoView({ block: 'start' }));
      await sleep(400);
      await page.screenshot({ path: dir + 'gf-card.png' });
      await page.evaluate(() => { const d = document.querySelector('.gk-fs'); d.open = true; d.scrollIntoView({ block: 'start' }); });
      await sleep(400);
      await page.screenshot({ path: dir + 'gf-funk-fold.png' });
      await page.evaluate(() => document.querySelector('.fae-sec').scrollIntoView({ block: 'start' }));
      await sleep(400);
      await page.screenshot({ path: dir + 'gf-sec-play.png' });
      await page.evaluate(() => { window.__M.faeHold(); });
      await sleep(300);
      await page.screenshot({ path: dir + 'gf-sec-arm.png' });
    }
    await page.context().close();
  }
  // a computer: idle section, no Gestik
  {
    const { page } = await H.open({ cfg: { noMotion: true, ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
    await page.screenshot({ path: dir + 'gf-bar-pc.png', clip: { x: 0, y: 0, width: 1280, height: 60 } });
    await page.evaluate(() => { const M = window.__M; M.FA.p.seen = true; M.openPanel('dev'); M.faeUI(); });
    await sleep(500);
    await page.evaluate(() => document.querySelector('.fae-sec').scrollIntoView({ block: 'start' }));
    await sleep(300);
    await page.screenshot({ path: dir + 'gf-sec-pc.png' });
    await page.context().close();
  }
  // a computer receiving a phone
  {
    const A = await H.open({ mobile: true, cfg: { perm: 'granted' } });
    const B = await H.open({ cfg: { noMotion: true, ins: [['p1', 'Pixel 7 USB-MIDI']] } });
    await A.page.evaluate(() => window.__outs('o1', 'Pixel 7 USB-MIDI'));
    await A.page.evaluate(() => window.__M.midiInit(true));
    await sleep(300);
    await H.gestikOn(A.page);
    await A.page.evaluate(() => window.__sensor(true, { beta: 45, roll: 12 }, 3));
    await sleep(800);
    await A.page.evaluate(() => window.__M.gkfPick('Pixel 7 USB-MIDI'));
    let on = true;
    (async () => { while (on) { const m = await A.page.evaluate(() => window.__midi.outputs.get('o1').sent.splice(0)).catch(() => []); if (m.length) await B.page.evaluate((l) => { for (const x of l) window.__send(x.d, 'p1'); }, m).catch(() => {}); await sleep(12); } })();
    await sleep(1500);
    await B.page.evaluate(() => window.__M.openPanel('dev'));
    await sleep(800);
    await B.page.screenshot({ path: dir + 'gf-remote.png' });
    on = false;
    await sleep(50);
  }
  await H.close();
})().catch((e) => { console.log('FAIL ' + e.stack); return H.close(); });
