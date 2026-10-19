// Fährte and Funkstrecke off = the app before Gestik (slot gkbase from ./orig against slot gf; node t-gf-parity.js):
// a keyboard's notes, wheels, pedals and fingers on the field (the Fährte writes them down meanwhile – nothing else may
// change); channel 16 of an ordinary device – NRPNs (also 42/n, the Funkstrecke's numbers, without its signature), a
// learned NRPN binding, notes 48–52, CC 7 – exactly as before; the bar laid out as before (the Fährte button hidden);
// the scheduler's tick with the Fährte idle leaves the Puls's schedule as it was.
const { open, ok, close } = require('./gk-h');
const OLD = 'http://127.0.0.1:8790/gkbase-inst/index.html', NEW = process.env.GFN || 'http://127.0.0.1:8790/gf-inst/index.html';
const NRPN = (ch, msb, lsb, v) => [[0xb0 | ch, 99, msb], [0xb0 | ch, 98, lsb], [0xb0 | ch, 6, v >> 7], [0xb0 | ch, 38, v & 127]];
const SEQ = [
  [[0x90, 60, 100]], [[0x90, 64, 30]], [[0xb0, 1, 64]], [[0xb0, 1, 127]], [[0xd0, 80]], [[0xb0, 1, 0]],
  [[0xe0, 0x7f, 0x7f]], [[0xe0, 0, 0x40]], [[0xb0, 64, 127]], [[0x80, 60, 0]], [[0x90, 72, 90]], [[0x80, 72, 64]], [[0xb0, 64, 0]],
  // channel 16 of an ordinary keyboard
  [[0x9f, 48, 100]], [[0x9f, 50, 90]], [[0x8f, 48, 0]], [[0x9f, 52, 70]], [[0x8f, 50, 0]], [[0x8f, 52, 0]],
  NRPN(15, 42, 3, 9000), NRPN(15, 42, 127, (71 << 7) | 1).slice(0, 3), [[0xbf, 7, 0]], [[0xbf, 7, 40]], [[0xbf, 7, 80]], [[0xbf, 7, 127]], [[0xbf, 7, 20]], NRPN(15, 42, 3, 2000), NRPN(15, 1, 8, 5000),
  [[0x9f, 49, 64]], [[0xbf, 64, 127]], [[0x8f, 49, 0]], [[0xbf, 64, 0]], [[0xbf, 123, 0]],
  [[0x90, 59, 45]], [[0x90, 59, 0]],
];
// (the Hexenring's Ringleiste, shown once sound runs, takes its height from the field: the window grows by it, so the
// field is the one before, pixel for pixel)
async function fieldAsBefore(page) {
  const h = await page.evaluate(() => { const r = document.getElementById('hxRail'); return r && !r.hidden ? r.getBoundingClientRect().height : 0; });
  if (h) { const v = page.viewportSize(); await page.setViewportSize({ width: v.width, height: v.height + Math.round(h) }); await page.waitForTimeout(200); }
}
async function run(url) {
  const { page, errors } = await open({ url, cfg: { ins: [['k1', 'Testkeyboard']], seed: 777, storage: { 'myzel.midimap.v1': JSON.stringify({ v: 1, binds: [{ dev: 'Testkeyboard', ch: 15, type: 'nrpn', num: 42 * 128 + 3, target: 'rev.mix', mode: 'abs', to: false }] }) } } });
  await fieldAsBefore(page);
  await page.evaluate(() => { window.__M.setParam('v.eng', 'neb'); window.__M.setParam('v.layer', 'off'); });
  const snaps = await page.evaluate(async (steps) => {
    const M = window.__M, out = [];
    for (const st of steps) {
      for (const m of st) window.__send(m);
      await window.__sleep(5);
      if (M.mapFlush) M.mapFlush();   // controller writes land once a frame: compare after them
      const t = {};
      for (const [id, tt] of M.touches) { const k = String(id).replace(/^midi-(k1-)?/, ''); t[k] = { f: tt.f, y: tt.y, vel: tt.vel, name: tt.name, nv: tt.voices.length, rel: tt.voices.map((x) => x.v.released).join() }; }
      out.push({ t, bend: M.A.bendCents, voices: M.A.voices.size, rev: M.P['rev.mix'], vol: M.P['xfin.vol'], flt: M.P['flt.freq'] });
    }
    return out;
  }, SEQ);
  const box = await page.locator('#cvFx').boundingBox();
  const fing = [];
  const snap = () => page.evaluate(() => { const M = window.__M; return JSON.stringify([[...M.touches.values()].filter((tt) => !String(tt.id).startsWith('midi')).map((tt) => [tt.f, tt.y, tt.col, tt.voices.length, tt.name]), M.A.voices.size]); });
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6); await page.mouse.down(); fing.push(await snap());
  for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.width * (0.2 + i * 0.07), box.y + box.height * (0.6 - i * 0.05)); fing.push(await snap()); }
  await page.mouse.up(); fing.push(await snap());
  // the Puls scheduled live for 1.5 s (the tick also runs the Fährte now): the same hits
  const hits = await page.evaluate(async () => {
    const M = window.__M;
    // every step of the patterns sounds (no chance, no humanising): the schedule alone, whatever else draws random numbers
    for (const [k, v] of [['v.human', 0], ['l0.on', true], ['l1.on', true], ['l0.prob', 1], ['l1.prob', 1], ['l0.walk', 0], ['l1.walk', 0], ['seq.swing', 0.2], ['seq.bpm', 133]]) M.setParam(k, v);
    // (t0 read before the start it anchors: the audio clock may move on a render quantum between two reads – as t-gs-parity)
    M.VIS.events.length = 0;
    const t0 = M.A.ctx.currentTime, seen = new Set(), out = [];
    M.seqStart(0, t0 + 0.1);
    const iv = setInterval(() => { for (const e of M.VIS.events) if (e.kind === 'hit' && !seen.has(e)) { seen.add(e); if (e.t < t0 + 1.3) out.push([+(e.t - t0).toFixed(6), e.lane]); } }, 5);   // (drawn events leave the list)
    await window.__sleep(1500);
    clearInterval(iv);
    M.seqStop();
    return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  });
  const fa = await page.evaluate(() => { const M = window.__M; return M.FA ? { loop: !!M.FA.loop || (M.hxLoopsLive ? M.hxLoopsLive().length > 0 : false), src: Object.values(M.MOD.t).some((T) => [...T.s.keys()].some((k) => k.startsWith('fae:') || k.startsWith('hxb'))), rem: !!M.GK.rem, gk: M.GK.on, gkr: [...M.MIDI.srcs.values()].some((s) => s.gkr) } : null; });
  await page.context().close();
  return { snaps, fing, hits, fa, errors };
}
async function bar(url, width) {
  const { page } = await open({ url, cfg: {}, start: false });
  await page.setViewportSize({ width, height: 800 });
  await page.click('#btnStart'); await page.waitForTimeout(400);
  const r = await page.evaluate(() => [...document.querySelectorAll('#bar > *')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const b = e.getBoundingClientRect(); return (e.id || e.className) + ':' + [b.x, b.y, b.width, b.height].map((x) => Math.round(x * 10) / 10).join(','); }).join(' '));
  await page.context().close();
  return r;
}
(async () => {
  const a = await run(OLD), b = await run(NEW);
  let same = 0, first = -1;
  for (let i = 0; i < SEQ.length; i++) { if (JSON.stringify(a.snaps[i]) === JSON.stringify(b.snaps[i])) same++; else if (first < 0) first = i; }
  ok(same === SEQ.length, 'a keyboard\'s notes, wheels, pedals – and channel 16 (NRPN 42/3 learned, 42/127 without its data, notes 48–52, CC 7, pedal, all-off): ' + same + '/' + SEQ.length + ' steps identical' + (first >= 0 ? ' (first difference at ' + first + ': ' + JSON.stringify(a.snaps[first]) + ' vs ' + JSON.stringify(b.snaps[first]) + ')' : ''));
  ok(a.snaps.some((s) => s.rev !== a.snaps[0].rev) && a.snaps.some((s) => s.vol !== a.snaps[0].vol), '(the learned NRPN and CC 7 on channel 16 did act – in both)');
  ok(JSON.stringify(a.fing) === JSON.stringify(b.fing), 'a finger sliding on the field: the same notes, heights and columns');
  ok(a.hits.length > 3 && JSON.stringify(a.hits) === JSON.stringify(b.hits), 'the Puls scheduled live with the Bewegung\'s part in the tick: the same hits (' + a.hits.length + ')' + (JSON.stringify(a.hits) === JSON.stringify(b.hits) ? '' : ' ' + JSON.stringify(a.hits) + ' vs ' + JSON.stringify(b.hits)));
  ok(b.fa && !b.fa.loop && !b.fa.src && !b.fa.rem && !b.fa.gk && !b.fa.gkr, 'nothing of the Bewegung (Hexenring) or the Funkstrecke woke up: no Schleife, no source on the mod layer, no phone recognised');
  ok(!a.errors.length && !b.errors.length, 'no errors ' + a.errors.concat(b.errors).join(' | '));
  for (const w of [320, 390, 1280]) {
    const b0 = await bar(OLD, w), b1 = await bar(NEW, w);
    ok(b0 === b1, w + ' px: the top bar laid out exactly as before (the Fährte button retired)');
  }
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
