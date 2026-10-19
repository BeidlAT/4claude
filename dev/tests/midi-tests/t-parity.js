// Bit-for-bit parity for a plain keyboard: the original build (slot mrbase, from midi-tests/orig) and the new one get
// the same messages; every MIDI finger's pitch, height, velocity, voices and the bend must match exactly.
// Differences by design (per-channel state, ref counting) are not exercised here.   node t-parity.js
const { open, ok, close } = require('./h');
const OLD = process.env.OLD || 'http://127.0.0.1:8790/mrbase-inst/index.html';
const SEQ = [
  [[0x90, 60, 100]], [[0x90, 64, 30]], [[0x90, 67, 127]], [[0x90, 50, 1]],
  [[0xb0, 1, 64]], [[0xb0, 1, 127]], [[0xd0, 80]], [[0xa0, 64, 100]], [[0xd0, 0]], [[0xb0, 1, 0]],
  [[0xe0, 0x7f, 0x7f]], [[0xe0, 0, 0]], [[0xe0, 0x11, 0x50]], [[0xe0, 0, 0x40]],
  [[0xb0, 64, 127]], [[0x80, 60, 0]], [[0x90, 72, 90]], [[0x80, 72, 64]], [[0x90, 60, 77]], [[0x80, 60, 0]], [[0xb0, 64, 0]],
  ['midi.y', 0.3], [[0x90, 62, 88]], ['midi.bend', 7], [[0xe0, 0x7f, 0x60]], ['midi.vel', false], [[0x90, 65, 120]], ['midi.vel', true],
  ['midi.map', 'white'], [[0x90, 48, 70]], [[0x90, 53, 70]], ['midi.map', 'chrom'], [[0x90, 61, 70]], ['midi.map', 'scale'],
  ['v.eng', 'glo'], [[0x90, 70, 50]], [[0x80, 70, 0]], ['v.eng', 'neb'],
  [[0xb0, 64, 127]], [[0x80, 62, 0]], [[0xb0, 1, 99]], [[0xb0, 121, 0]], [[0x90, 66, 66]], [[0xb0, 123, 0]],
  [[0x90, 59, 45]], [[0x90, 59, 0]],
];
// (the Hexenring's Ringleiste, shown once sound runs, takes its height from the field: the window grows by it, so the
// field is the one before, pixel for pixel)
async function fieldAsBefore(page) {
  const h = await page.evaluate(() => { const r = document.getElementById('hxRail'); return r && !r.hidden ? r.getBoundingClientRect().height : 0; });
  if (h) { const v = page.viewportSize(); await page.setViewportSize({ width: v.width, height: v.height + Math.round(h) }); await page.waitForTimeout(200); }
}
async function run(url) {
  const { page, errors } = await open({ url, cfg: { ins: [['k1', 'Testkeyboard']], seed: 777 } });
  await fieldAsBefore(page);
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
      out.push({ t, bend: M.A.bendCents, voices: M.A.voices.size });
    }
    return out;
  }, SEQ);
  return { snaps, errors };
}
(async () => {
  const a = await run(OLD); await close();
  const b = await run(undefined); await close();
  let same = 0;
  for (let i = 0; i < SEQ.length; i++) {
    const x = JSON.stringify(a.snaps[i]), y = JSON.stringify(b.snaps[i]);
    if (x === y) same++; else { console.log('step', i, JSON.stringify(SEQ[i])); console.log('  old', x.slice(0, 400)); console.log('  new', y.slice(0, 400)); }
  }
  ok(same === SEQ.length, 'plain keyboard: ' + same + '/' + SEQ.length + ' steps identical to the original build (pitch, height, velocity, voices, bend)');
  ok(!a.errors.length && !b.errors.length, 'no errors ' + a.errors.concat(b.errors).join(' | '));
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
