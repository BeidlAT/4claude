// Fix phase screenshots, part 2 (not a test): the settings fold and a binding editor on a phone (touch targets), the iPad
// in "Web MIDI Browser", the claude.ai viewer, the mixer in low landscape at 740 px. Writes shots-mf/fix2-*.png.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mf-inst/index.html';
const { open, close, showDev } = require('./hb');
const OUT = __dirname + '/shots-mf/';
const shot = async (page, name) => { await page.evaluate(() => document.querySelector('#toast').classList.remove('show')); await page.waitForTimeout(300); await page.screenshot({ path: OUT + 'fix2-' + name + '.png' }); };
(async () => {
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] }, storage: { 'myzel.kcui.v1': JSON.stringify({ set: true }) } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await showDev(page);
    await page.evaluate(() => window.__M.getDevEls().setSec.scrollIntoView()); await shot(page, 'set-390');
    await page.evaluate(() => { const E = window.__M.getDevEls(); E.mapSec.scrollIntoView(); const b = E.binds.querySelector('details.kc-bd'); if (b) b.open = true; b.dispatchEvent(new Event('toggle')); });
    await page.waitForTimeout(100);
    await page.evaluate(() => { const b = document.querySelector('.kc-be'); b.click(); b.scrollIntoView(); });
    await shot(page, 'edit-390');
    await page.context().close();
  }
  {
    const { page } = await open({ vp: [1180, 820], touch: true, tablet: true, ua: 'ipad', bt: false, cfg: { ins: [] } });
    await showDev(page); await shot(page, 'ipad-wmb');
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(300); await shot(page, 'ipad-wmb-ready');
    await page.context().close();
  }
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'ipad', bt: false, noMidi: true, start: false });
    await shot(page, 'ios-start');
    await page.click('#btnStart'); await page.waitForTimeout(300); await showDev(page); await shot(page, 'ios-dev');
    await page.context().close();
  }
  {
    const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, viewer: true, cfg: { denyMidi: true } });
    await showDev(page); await shot(page, 'viewer-dev');
    await page.context().close();
  }
  {
    const { page } = await open({ vp: [740, 360], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('mix')); await page.waitForTimeout(500);
    await shot(page, 'mix-land-740');
    await page.context().close();
  }
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
