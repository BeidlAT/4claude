// (owner, 26.10.2026: „Vorige Skala“ on a slider reacted only now and then) a fader on a stepping target browses:
// every sixteenth of its travel one step – up the target's way, down back; a CC button (0/127 only) still presses once.
//                                                                                                node t-fstep.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const inputs = new Map([['k1', { id: 'k1', name: 'PCR-M50 MIDI', manufacturer: 'Roland', state: 'connected', onmidimessage: null }]]);
    window.__midi = { inputs, access: { inputs, outputs: new Map(), onstatechange: null } };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__midi.access);
    window.__send = (bytes) => { const i = inputs.get('k1'); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    const dev = [...M.MIDI.srcs.values()][0].name;
    M.MAP.user = M.MAP.user.filter((u) => !(u.type === 'cc' && (u.num === 26 || u.num === 80))).concat([
      { dev, ch: 0, type: 'cc', num: 26, target: 'scale.down', mode: 'abs' }, { dev, ch: 0, type: 'cc', num: 80, target: 'scale.up', mode: 'abs' }]); M.MAP.v++;
    const PD = M.PD['t.scale'], keys = PD.opts.map((x) => x[0]), n = keys.length, at = () => keys.indexOf(M.P['t.scale']), md = (x) => ((x % n) + n) % n;
    M.setParam('t.scale', keys[Math.floor(keys.length / 2)]); await sl(50);
    const send = async (cc, a, b) => { const s = b > a ? 1 : -1; for (let v = a; v !== b + s; v += s) { window.__send([0xb0, cc, v]); await sl(2); } await sl(80); };
    // the slider starts above the middle (where it crossed before) and goes on up: it still steps
    const i0 = at(); await send(26, 70, 127); o.upTop = md(i0 - at());
    // down again: back
    const i1 = at(); await send(26, 127, 70); o.down = md(at() - i1);
    // a whole sweep from the bottom: 16 steps (one per sixteenth)
    await send(26, 70, 0); const i2 = at(); await send(26, 0, 127); o.sweep = md(i2 - at());
    // a button sending CC (only 127 and 0): one press, one step
    const i3 = at(); window.__send([0xb0, 80, 127]); await sl(30); window.__send([0xb0, 80, 0]); await sl(80); o.btn = md(at() - i3);
    o.n = keys.length;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.upTop === 7, `slider already above the middle (70), pulled on up: ${r.upTop} scales back (sixteenths 8 → 15)`);
  ok(r.down === 7, `down again: ${r.down} forward`);
  ok(r.sweep === 15 % r.n, `a whole sweep from the bottom: 15 steps (around ${r.n} scales: ${r.sweep} on)`);
  ok(r.btn === 1, `a CC button: one press, one step (${r.btn})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
