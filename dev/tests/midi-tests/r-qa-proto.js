// Final QA probe: a bindings file (import or a stored map) whose target is the name of an Object.prototype member
// ("constructor", "toString", "__proto__") must be an unknown target – not a parameter that throws on every message
// and breaks the bindings list.   node r-qa-proto.js   (BASE: slot mq)
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mq-inst/index.html';
const { open, close, ok } = require('./hb');
(async () => {
  const binds = [{ dev: '*', ch: -1, type: 'cc', num: 30, target: 'constructor', mode: 'abs' }, { dev: '*', ch: -1, type: 'cc', num: 31, target: 'toString', mode: 'toggle' }];
  const { page, errors } = await open({ bt: {}, cfg: { ins: [['k1', 'Testkeyboard']] }, storage: { 'myzel.midimap.v1': JSON.stringify({ v: 1, binds }) } });
  await page.evaluate(() => window.__M.midiInit(true));
  await page.waitForTimeout(200);
  await page.evaluate(() => { for (let v = 0; v < 128; v += 9) { window.__send([0xb0, 30, v], 'k1'); window.__send([0xb0, 31, v & 1 ? 127 : 0], 'k1'); } });
  await page.waitForTimeout(150);
  ok(!errors.length, 'messages to a prototype-named target throw nothing ' + JSON.stringify(errors.slice(0, 2)));
  const n0 = errors.length;
  await page.evaluate(() => window.__M.openPanel('dev'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const d = document.querySelector('details.kc-bd'); if (d) d.open = true; window.__send([0xb0, 30, 64], 'k1'); });
  await page.waitForTimeout(300);
  ok(errors.length === n0, 'the Gerät panel lists such a binding without errors ' + JSON.stringify(errors.slice(n0, n0 + 2)));
  const imp = await page.evaluate(() => window.__M.mapImport(JSON.stringify({ binds: [{ type: 'cc', num: 40, target: '__proto__' }] })));
  await page.evaluate(() => window.__send([0xb0, 40, 99], 'k1'));
  await page.waitForTimeout(200);
  ok(errors.length === n0, 'imported "__proto__" target is inert (import returned ' + imp + ') ' + JSON.stringify(errors.slice(n0, n0 + 2)));
  await close();
})().catch((e) => { console.log('FAIL crashed ' + e); process.exit(1); });
