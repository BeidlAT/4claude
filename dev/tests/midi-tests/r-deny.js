// Review probe: Android, "Mit Keyboard starten", the MIDI prompt answered with "Blockieren" – what the player is told.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
(async () => {
  const { page } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [], denyMidi: true }, start: false });
  await page.click('#btnStartKeys'); await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ panel: window.__M.UI.panel, toast: document.querySelector('#toastMsg').textContent, status: window.__M.getDevEls().midiStatus.textContent, tiles: [...document.querySelectorAll('.kc-go')].filter((b) => !b.hidden).map((b) => b.textContent + (b.classList.contains('primary') ? ' [primary]' : '')), tools: [...document.querySelectorAll('.kc-tools .btn')].filter((b) => !b.hidden).map((b) => b.textContent) }));
  console.log(JSON.stringify(r, null, 1));
  await page.screenshot({ path: __dirname + '/rshots/deny-390.png' });
  await close();
})();
