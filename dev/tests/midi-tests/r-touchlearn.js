// Review probe: learn with real touch taps (390×844): a knob caught, then a finger tap on a slider / a chip / a mixer
// fader must choose it without changing it; then the knob drives it.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
(async () => {
  const { page, errors } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
  const P = (id) => page.evaluate((i) => window.__M.P[i], id);
  // 1) quick bar Filter slider
  await page.evaluate(() => window.__M.midiLearn(true));
  await page.evaluate(() => { window.__send([0xb0, 30, 10], 'k1'); window.__send([0xb0, 30, 30], 'k1'); });
  const q = await page.$('.quick [data-pid="flt.freq"], .quick input[type=range]');
  const qb = await q.boundingBox();
  const f0 = await P('flt.freq');
  await page.touchscreen.tap(qb.x + qb.width * 0.15, qb.y + qb.height / 2);
  await page.waitForTimeout(800);
  const f1 = await P('flt.freq');
  const m1 = await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target));
  ok(f0 === f1, 'tap on the quick Filter slider leaves it (' + f0 + ' → ' + f1 + ')');
  ok(m1.some((x) => /^30:/.test(x)), 'and assigns CC 30: ' + JSON.stringify(m1));
  // 2) a chip in the Klang panel (engine)
  await page.click('#tab-klang'); await page.waitForTimeout(400);
  await page.evaluate(() => { window.__send([0xb0, 31, 10], 'k1'); window.__send([0xb0, 31, 40], 'k1'); });
  const e0 = await P('v.eng');
  const chip = await page.$('.sheet .chip:not([aria-checked="true"])');
  const cb = await chip.boundingBox();
  await page.touchscreen.tap(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.waitForTimeout(800);
  ok(e0 === await P('v.eng'), 'tap on an engine chip does not switch the engine (' + e0 + ' → ' + await P('v.eng') + ')');
  console.log('  assigned:', JSON.stringify(await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target + ':' + u.mode))));
  // 3) a mixer fader by touch drag-like tap
  await page.click('#tab-mix'); await page.waitForTimeout(700);
  await page.evaluate(() => { window.__send([0xb0, 32, 10], 'k1'); window.__send([0xb0, 32, 40], 'k1'); });
  const v0 = await P('xfin.vol');
  const cap = await page.$('.mx-st[data-k="fin"] .mx-cap');
  const capb = cap && await cap.boundingBox();
  console.log('  Klang fader cap', JSON.stringify(capb));
  if (capb) { await page.touchscreen.tap(capb.x + capb.width / 2, capb.y + capb.height / 2); await page.waitForTimeout(800); }
  ok(v0 === await P('xfin.vol'), 'tap on the Klang fader leaves its level (' + v0 + ' → ' + await P('xfin.vol') + ')');
  const m3 = await page.evaluate(() => window.__M.MAP.user.map((u) => u.num + ':' + u.target));
  ok(m3.includes('32:xfin.vol'), 'and assigns it: ' + JSON.stringify(m3));
  await page.evaluate(() => window.__M.midiLearn(false));
  // the knob now drives the fader (soft takeover: it starts where the gesture left it)
  await page.evaluate(async () => { for (let v = 40; v <= 110; v += 5) { window.__send([0xb0, 32, v], 'k1'); await window.__sleep(30); } });
  await page.waitForTimeout(200);
  console.log('  fader after the knob turned up:', v0, '→', await P('xfin.vol'), 'shown', await page.evaluate(() => document.querySelector('.mx-st[data-k="fin"] .mx-val') && document.querySelector('.mx-st[data-k="fin"] .mx-val').textContent));
  if (errors.length) console.log('errors', errors);
  await close();
})();
