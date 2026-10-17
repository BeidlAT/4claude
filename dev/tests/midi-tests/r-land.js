// Review probe: phone in landscape (844×390) – start screen, Gerät panel, learn banner in Gerät and in the mixer; and
// the mixer's learn button at every size.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close, pair } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  {
    const { page, errors } = await open({ vp: [844, 390], touch: true, ua: 'android', bt: {}, cfg: { ins: [] }, start: false });
    await page.screenshot({ path: OUT + 'land-start.png' });
    const bb = await (await page.$('#btnStartKeys')).boundingBox();
    console.log('landscape start keys button', JSON.stringify(bb), 'scrollable start:', await page.evaluate(() => { const s = document.querySelector('#start'); return s.scrollHeight + '/' + s.clientHeight; }));
    await page.click('#btnStartKeys'); await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + 'land-dev.png' });
    const b2 = await (await page.$('[data-ble="ask"]')).boundingBox();
    console.log('  Bluetooth tile after tap', JSON.stringify(b2));
    await page.evaluate(() => { window.__bt.next = { id: 'air', name: 'microKEY Air-25' }; });
    await page.click('[data-ble="ask"]');
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__midi.plug('k1', 'nanoKEY Studio KEYBOARD/CTRL'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.__M.midiLearn(true); window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 47], 'k1'); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: OUT + 'land-learn-dev.png' });
    await page.click('#tab-mix'); await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + 'land-learn-mix.png' });
    const r = await page.evaluate(() => { const bar = document.querySelector('.mlearn-bar').getBoundingClientRect(), sh = document.querySelector('#sheet').getBoundingClientRect(); const ml = document.querySelector('.mx-ml'); return { bar: [bar.left, bar.right, bar.top, bar.bottom].map(Math.round), sheet: [sh.left, sh.right].map(Math.round), mxml: ml ? getComputedStyle(ml).display : 'none' }; });
    console.log('  landscape: banner', JSON.stringify(r));
    if (errors.length) console.log('errors', errors);
    await close();
  }
  for (const [nm, o] of Object.entries({ p390: { vp: [390, 844], touch: true, ua: 'android' }, p360: { vp: [360, 740], touch: true, ua: 'android' }, ipad: { vp: [1180, 820], touch: true, tablet: true, ua: 'mac' }, d1280: { vp: [1280, 800], ua: 'windows' } })) {
    const { page } = await open(Object.assign({ bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } }, o));
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(150);
    await page.click('#tab-mix'); await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const b = document.querySelector('.mx-ml'), s = b.querySelector('span'); const r = b.getBoundingClientRect(), q = s.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { hit: [Math.round(r.width), Math.round(r.height)], vis: [Math.round(q.width), Math.round(q.height)], disp: getComputedStyle(b).display, top: top === b || b.contains(top) ? 'itself' : top && (top.className || top.tagName) }; });
    console.log(nm, 'mixer learn button', JSON.stringify(r));
    await close();
  }
})();
