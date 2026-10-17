// Review probe: iPad portrait (820×1180, touch) in a Web MIDI app with the nanoKEY Studio: learn from the Gerät panel
// onto the mixer – where the banner sits against the open sheet.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  for (const vp of [[820, 1180], [1180, 820]]) {
    const { page } = await open({ vp, touch: true, tablet: true, ua: 'ipad', bt: false, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(200);
    await page.evaluate(() => { window.__M.midiLearn(true); window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 47], 'k1'); });
    await page.waitForTimeout(150);
    const g = () => page.evaluate(() => { const b = document.querySelector('.mlearn-bar').getBoundingClientRect(), s = document.querySelector('#sheet').getBoundingClientRect(); const ov = Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left)) * Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top)); return { bar: [b.left, b.top, b.right, b.bottom].map(Math.round), sheet: [s.left, s.top, s.right, s.bottom].map(Math.round), overlapPx2: Math.round(ov) }; });
    console.log(vp.join('×'), 'Gerät:', JSON.stringify(await g()));
    await page.screenshot({ path: OUT + 'ipadp-dev-' + vp[0] + '.png' });
    await page.click('#tab-mix'); await page.waitForTimeout(700);
    console.log(vp.join('×'), 'Mixer:', JSON.stringify(await g()));
    await page.screenshot({ path: OUT + 'ipadp-mix-' + vp[0] + '.png' });
    await close();
  }
  // phones too
  for (const vp of [[390, 844], [360, 740], [844, 390], [740, 360]]) {
    const { page } = await open({ vp, touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(200);
    await page.evaluate(() => { window.__M.midiLearn(true); window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 47], 'k1'); });
    await page.waitForTimeout(150);
    for (const p of ['dev', 'mix']) {
      if (p === 'mix') { await page.click('#tab-mix'); await page.waitForTimeout(700); }
      const r = await page.evaluate(() => { const b = document.querySelector('.mlearn-bar').getBoundingClientRect(), s = document.querySelector('#sheet').getBoundingClientRect(); const ov = Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left)) * Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top)); const fin = document.querySelector('.mx-st[data-k="fin"] .mx-cap'); let finCovered = null; if (fin && fin.offsetParent) { const f = fin.getBoundingClientRect(); const top = document.elementFromPoint(f.left + f.width / 2, f.top + f.height / 2); finCovered = !(top === fin || fin.contains(top)) ? (top ? top.className : 'none') : false; } return { bar: [b.left, b.top, b.right, b.bottom].map(Math.round), sheet: [s.left, s.top, s.right, s.bottom].map(Math.round), overlapPx2: Math.round(ov), finCovered }; });
      console.log(vp.join('×'), p, JSON.stringify(r));
    }
    await page.screenshot({ path: OUT + 'phone-mix-' + vp.join('x') + '.png' });
    await close();
  }
})();
