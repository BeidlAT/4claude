// Review probe: keyboard-only learn onto the mixer's Klang fader (its cap is the focusable slider).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
const desc = (page) => page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return a.tagName.toLowerCase() + '.' + a.className + ' "' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40) + '" in-pid=' + ((a.closest('[data-pid]') || {}).dataset || {}).pid; });
(async () => {
  for (const vp of [[1280, 800], [390, 844]]) {
    const { page, errors } = await open({ ua: 'windows', vp, bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
    await page.evaluate(() => window.__M.openPanel('mix')); await page.waitForTimeout(600);
    await page.evaluate(() => window.__M.midiLearn(true));
    await page.evaluate(() => { window.__send([0xb0, 22, 40], 'k1'); window.__send([0xb0, 22, 50], 'k1'); });
    const caps = await page.evaluate(() => [...document.querySelectorAll('.mx-cap')].map((c) => c.getAttribute('aria-label') + ' pid=' + ((c.closest('[data-pid]') || {}).dataset || {}).pid));
    console.log(vp[0], 'caps:', caps.slice(0, 4).join(' | '));
    await page.evaluate(() => document.querySelector('.mx-cap').focus());
    console.log('  focus', await desc(page));
    const v0 = await page.evaluate(() => window.__M.P['xfin.vol']);
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const m = await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target));
    ok(m.includes('22:xfin.vol'), vp[0] + ': Enter on the Klang fader assigns it: ' + JSON.stringify(m));
    console.log('  value unchanged', v0, await page.evaluate(() => window.__M.P['xfin.vol']), 'banner:', await page.evaluate(() => document.querySelector('.mlearn-bar .ml-msg').textContent));
    // and an arrow key while learn is on?
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(80);
    console.log('  ArrowUp while learning changes the fader:', v0, '→', await page.evaluate(() => window.__M.P['xfin.vol']));
    if (errors.length) console.log('errors', errors);
    await close();
  }
})();
