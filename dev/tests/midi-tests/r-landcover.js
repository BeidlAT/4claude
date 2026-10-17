// Review probe: landscape phone (844×390), learn armed with a knob caught, mixer open – which targets sit under the banner.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
(async () => {
  for (const vp of [[844, 390], [740, 360]]) {
    const { page } = await open({ vp, touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio']] } });
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.click('#tab-mix'); await page.waitForTimeout(700);
    await page.evaluate(() => { window.__M.midiLearn(true); window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 47], 'k1'); });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const bar = document.querySelector('.mlearn-bar'), out = [];
      for (const el of document.querySelectorAll('#sheet [data-pid], #sheet [data-act]')) {
        const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const top = document.elementFromPoint(x, y);
        if (top && bar.contains(top)) out.push((el.dataset.pid || el.dataset.act) + '@' + Math.round(x) + ',' + Math.round(y));
      }
      return out;
    });
    console.log(vp.join('×') + ': targets under the banner (' + r.length + '): ' + r.join(' '));
    await close();
  }
})();
