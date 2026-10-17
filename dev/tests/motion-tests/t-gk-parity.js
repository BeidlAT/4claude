// Gestik off = the app before Gestik, bit for bit: the build in ./orig (slot gkbase) against the current one (slot gk)
// – a MIDI keyboard's notes, wheels and pedals (as midi-tests/t-parity.js), fingers on the field, and offline renders of
// six engines compared by loudness (renders are not reproducible to the sample, even within one build); the notes once
// more after Gestik was switched on and off again.   node t-gk-parity.js
const { open, ok, close } = require('./gk-h');
// the renders: no visuals drawing random particles, the workers' random numbers seeded too (v2/lib.js switches)
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const OLD = 'http://127.0.0.1:8790/gkbase-inst/index.html', NEW = 'http://127.0.0.1:8790/gk-inst/index.html';
const SEQ = [
  [[0x90, 60, 100]], [[0x90, 64, 30]], [[0x90, 67, 127]], [[0x90, 50, 1]],
  [[0xb0, 1, 64]], [[0xb0, 1, 127]], [[0xd0, 80]], [[0xa0, 64, 100]], [[0xd0, 0]], [[0xb0, 1, 0]],
  [[0xe0, 0x7f, 0x7f]], [[0xe0, 0, 0]], [[0xe0, 0x11, 0x50]], [[0xe0, 0, 0x40]],
  [[0xb0, 64, 127]], [[0x80, 60, 0]], [[0x90, 72, 90]], [[0x80, 72, 64]], [[0x90, 60, 77]], [[0x80, 60, 0]], [[0xb0, 64, 0]],
  ['midi.y', 0.3], [[0x90, 62, 88]], ['midi.bend', 7], [[0xe0, 0x7f, 0x60]], ['midi.vel', false], [[0x90, 65, 120]], ['midi.vel', true],
  ['v.eng', 'glo'], [[0x90, 70, 50]], [[0x80, 70, 0]], ['v.eng', 'neb'],
  [[0xb0, 64, 127]], [[0x80, 62, 0]], [[0xb0, 1, 99]], [[0xb0, 121, 0]], [[0x90, 66, 66]], [[0xb0, 123, 0]],
  [[0x90, 59, 45]], [[0x90, 59, 0]],
];
async function notes(url, onOff) {
  const { page, errors } = await open({ url, cfg: { ins: [['k1', 'Testkeyboard']], seed: 777 } });
  if (onOff) {   // Gestik on, played with, off again
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.click('[data-gk="on"]');
    await page.evaluate(async () => { await window.__pose(45, 0, 200); await window.__pose(45, 20, 200); });
    await page.click('.gk-card .kc-tog');
    await page.evaluate(() => window.__M.closePanel && window.__M.closePanel());
  }
  await page.evaluate(() => { window.__M.setParam('v.eng', 'neb'); window.__M.setParam('v.layer', 'off'); });
  const snaps = await page.evaluate(async (steps) => {
    const M = window.__M, out = [];
    for (const st of steps) {
      if (typeof st[0] === 'string') M.setParam(st[0], st[1]); else for (const m of st) window.__send(m);
      await window.__sleep(5);
      const t = {};
      for (const [id, tt] of M.touches) {
        const k = String(id).replace(/^midi-(k1-)?/, '');
        t[k] = { f: tt.f, y: tt.y, py: tt.py, x: tt.x, vel: tt.vel, vn: tt.vn, name: tt.name, col: tt.col, pp: tt.pp || 0, nv: tt.voices.length, rel: tt.voices.map((x) => x.v.released).join() };
      }
      out.push({ t, bend: M.A.bendCents, voices: M.A.voices.size, ports: M.MIDI.ports.size });
    }
    return out;
  }, SEQ);
  // fingers on the field: down, slide across columns, a second finger, up
  const box = await page.locator('#cvFx').boundingBox();
  const fing = [];
  const snap = () => page.evaluate(() => { const M = window.__M; return JSON.stringify([[...M.touches.values()].filter((tt) => !String(tt.id).startsWith('midi')).map((tt) => [tt.f, tt.y, tt.col, tt.voices.length, tt.name]), M.A.voices.size]); });
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6); await page.mouse.down(); fing.push(await snap());
  for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.width * (0.2 + i * 0.07), box.y + box.height * (0.6 - i * 0.05)); fing.push(await snap()); }
  await page.mouse.up(); fing.push(await snap());
  await page.context().close();
  return { snaps, fing, errors };
}
(async () => {
  const a = await notes(OLD), b = await notes(NEW), c = await notes(NEW, true);
  await close();
  for (const [nm, x] of [['Gestik never on', b], ['Gestik on, then off', c]]) {
    let same = 0;
    for (let i = 0; i < SEQ.length; i++) {
      const p = JSON.stringify(a.snaps[i]), q = JSON.stringify(x.snaps[i]);
      if (p === q) same++; else if (same === i) { console.log('  step', i, JSON.stringify(SEQ[i])); console.log('    old', p.slice(0, 300)); console.log('    new', q.slice(0, 300)); }
    }
    ok(same === SEQ.length, nm + ': a MIDI keyboard – ' + same + '/' + SEQ.length + ' steps identical (pitch, height, velocity, voices, bend, ports)');
    ok(JSON.stringify(a.fing) === JSON.stringify(x.fing), nm + ': a finger sliding over the field – identical (' + x.fing.length + ' snapshots)');
  }
  ok(!a.errors.length && !b.errors.length && !c.errors.length, 'no errors ' + a.errors.concat(b.errors, c.errors).join(' | '));
  // offline renders: not reproducible to the sample even within one build (main-thread timers move parameters while a
  // render runs faster than real time), so: the same loudness within that noise, with the random numbers reseeded
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const O = await openInst(browser, OLD), N = await openInst(browser, NEW);
  for (const eng of ['neb', 'kor', 'stm', 'glo', 'sai', 'trp']) {
    const h = [];
    for (const X of [O, N]) {
      h.push(await X.page.evaluate(async (eng) => {
        const sr = 48000, dur = 6, ctx = await window.__off(sr, dur, { 'v.eng': eng, 'dev.q': '2', 'v.layer': 'off' });
        { let x = 4242; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
        const buf = await window.__phrase(ctx, sr, dur, { step: 0.4, hold: 0.5 });
        return window.__stats(buf, 0.2);
      }, eng));
    }
    ok(h[0].rms > -40 && Math.abs(h[0].rms - h[1].rms) <= 0.15 && Math.abs(h[0].peak - h[1].peak) <= 1 && !h[1].nan, 'offline render ' + eng + ': same loudness (rms ' + h[0].rms + ' / ' + h[1].rms + ' dB, peak ' + h[0].peak + ' / ' + h[1].peak + ')');
  }
  ok(!O.errors.length && !N.errors.length, 'no render errors ' + O.errors.concat(N.errors).join(' | '));
  await browser.close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
