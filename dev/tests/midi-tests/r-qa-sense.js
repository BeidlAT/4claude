// Final QA probe: a USB keyboard that sends Active Sensing (FE every 300 ms / 270 ms, as Roland and Yamaha pianos do)
// holds a note while the main thread stalls 60–220 ms now and then (a panel opening on a phone, a preset load). The
// stall delays the FE and the watch alike; the watch must not take the queued FE for silence and cut the note.
// node r-qa-sense.js   (BASE: slot mq)
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mq-inst/index.html';
const { open, close, ok } = require('./hb');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Digital Piano']] } });
  await page.evaluate(() => window.__M.midiInit(true));
  await page.waitForTimeout(200);
  for (const P of [300, 270]) {
    const r = await page.evaluate(async (P) => {
      const M = window.__M, F = window.__midi;
      let x = 77; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      const res = { stalls: 0, cuts: 0, at: [] };
      for (let trial = 0; trial < 14; trial++) {
        M.panic(); await window.__sleep(150);
        F.send([0xfe], 'k1'); F.send([0x90, 60, 100], 'k1');
        const iv = setInterval(() => F.send([0xfe], 'k1'), P);
        for (let k = 0; k < 4; k++) {
          await window.__sleep(200 + rnd() * 400);
          const len = 60 + rnd() * 160, a = performance.now();
          while (performance.now() - a < len) {}   // a long task
          res.stalls++;
          await window.__sleep(0);
          await window.__sleep(120);
          if (!M.touches.has('midi-k1-0-60')) { res.cuts++; res.at.push(Math.round(len)); break; }
        }
        clearInterval(iv);
        F.send([0x80, 60, 0], 'k1');
      }
      M.panic();
      return res;
    }, P);
    console.log('FE every ' + P + ' ms: ' + r.cuts + ' cuts in ' + r.stalls + ' stalls (stall lengths ' + r.at.join(', ') + ' ms)');
    ok(r.cuts === 0, 'FE every ' + P + ' ms, stalls of 60–220 ms: a held note is never cut (' + r.cuts + ' cuts)');
  }
  // a real disconnect still ends the note: FE stops, the note goes within ~0,5 s
  const gone = await page.evaluate(async () => {
    const M = window.__M, F = window.__midi;
    M.panic(); await window.__sleep(150);
    F.send([0xfe], 'k1'); F.send([0x90, 62, 100], 'k1');
    const t0 = performance.now();
    while (M.touches.has('midi-k1-0-62') && performance.now() - t0 < 2000) await window.__sleep(10);
    return Math.round(performance.now() - t0);
  });
  ok(gone >= 330 && gone < 600, 'FE stops: the note ends after ' + gone + ' ms');
  ok(!errors.length, 'no errors ' + JSON.stringify(errors.slice(0, 2)));
  await close();
})().catch((e) => { console.log('FAIL crashed ' + e); process.exit(1); });
