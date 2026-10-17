// Review probe: a learned knob far from its fader (soft takeover) – what the player sees while turning it and nothing
// changes yet (card line, monitor, mixer).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
(async () => {
  const { page } = await open({ vp: [1280, 800], ua: 'windows', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
  await page.evaluate(() => { const M = window.__M; M.midiLearn(true); window.__send([0xb0, 22, 100], 'k1'); window.__send([0xb0, 22, 110], 'k1'); M.learnPick('xfin.vol'); M.midiLearn(false); });
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__M.openPanel('dev'));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Monitor/.test(x.textContent)); b.click(); });
  // the player sets the fader by finger to −20 dB, then turns the knob down slowly from 10
  await page.evaluate(() => window.__M.setParam ? window.__M.setParam('xfin.vol', -20) : null);
  const v0 = await page.evaluate(() => window.__M.P['xfin.vol']);
  await page.evaluate(async () => { for (let v = 10; v <= 40; v += 3) { window.__send([0xb0, 22, v], 'k1'); await window.__sleep(40); } });
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => ({ v: window.__M.P['xfin.vol'], line: [...document.querySelectorAll('.kc-last')].map((e) => e.textContent), mon: [...document.querySelectorAll('.kc-mon li')].slice(0, 2).map((l) => l.textContent), row: [...document.querySelectorAll('.kc-b')].filter((b) => /CC 22/.test(b.textContent)).map((b) => b.textContent + ' wait-class:' + b.className) }));
  console.log('fader', v0, '→', r.v);
  console.log('card line:', JSON.stringify(r.line));
  console.log('monitor:', JSON.stringify(r.mon));
  console.log('row:', JSON.stringify(r.row));
  await close();
})();
