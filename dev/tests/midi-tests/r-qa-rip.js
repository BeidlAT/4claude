// Final QA probe: MIDI notes while no frame runs (a hidden tab: the keyboard plays on, the drawing stops) must not
// pile up ripples for the next frame to draw. 2000 notes in one task (no frame between them).   node r-qa-rip.js
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mq-inst/index.html';
const { open, close, ok } = require('./hb');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Digital Piano']] } });
  await page.evaluate(() => window.__M.midiInit(true));
  await page.waitForTimeout(200);
  const n = await page.evaluate(() => {
    for (let i = 0; i < 2000; i++) { const k = 40 + (i % 40); window.__midi.send([0x90, k, 90], 'k1'); window.__midi.send([0x80, k, 0], 'k1'); }
    return { rip: window.__M.VIS.rip.length, hy: window.__M.VIS.hy.length };
  });
  ok(n.rip <= 150, 'ripples stay bounded without frames: ' + JSON.stringify(n));
  await page.evaluate(() => window.__M.panic());
  ok(!errors.length, 'no errors ' + JSON.stringify(errors.slice(0, 2)));
  await close();
})().catch((e) => { console.log('FAIL crashed ' + e); process.exit(1); });
