// Bluetooth timing: a player's even notes (every 37 ms by the keyboard's clock) arrive bunched on connection events
// (15 or 45 ms apart). "Direkt" plays on arrival; "Gleichmäßig" restores the spacing behind a jitter budget J. Also:
// the interval estimate, order, switching modes with events waiting, a drop with events waiting.   node t-ble-timing.js
const { open, ok, close, pair, summary } = require('./hb');
(async () => {
  const { page, errors } = await open({ bt: {} });
  await pair(page, { id: 'dev1', name: 'microKEY Air-25' });
  // one run: N CC messages every 37 ms of sender time, delivered on a CI grid (several per packet when they share one
  // connection event), the sender clock wrapping past 8191; returns spacing errors of what the app dispatched
  const run = (mode, CI, N = 48) => page.evaluate(async ([mode, CI, N]) => {
    const M = window.__M, d = window.__bt.dev('dev1'), b = [...M.BLE.devs.values()][0];
    M.setParam('midi.ble', mode);
    const got = [];
    M.MIDI.tap = (src, ev) => { if (ev.type === 'cc' && ev.num === 21) got.push([ev.val, performance.now()]); };
    const s0 = 7900 + Math.floor(Math.random() * 100), t0 = performance.now() + 60, ev = new Map();
    for (let k = 0; k < N; k++) { const e = Math.ceil((37 * k + 3 + (k % 3)) / CI); if (!ev.has(e)) ev.set(e, []); ev.get(e).push(k); }
    for (const [e, ks] of ev) {
      const p = [0x80 | (((s0 + 37 * ks[0]) & 0x1fff) >> 7)];
      for (const k of ks) p.push(0x80 | ((s0 + 37 * k) & 0x7f), 0xb0, 21, k & 0x7f);
      setTimeout(() => d.send(p), t0 + e * CI - performance.now());
    }
    await window.__sleep(t0 + N * 37 + 200 - performance.now());
    M.MIDI.tap = null;
    const errs = [];
    for (let i = 1; i < got.length; i++) errs.push(Math.abs(got[i][1] - got[i - 1][1] - 37));
    const order = got.every((g, i) => g[0] === (i & 0x7f));
    const late = got.length ? got.map((g) => g[1]) : [];
    const st = errs.slice(12).sort((a, b) => a - b);
    return { n: got.length, order, p90: st[Math.floor(st.length * 0.9)] || 0, warm: Math.max(0, ...errs.slice(0, 12)), max: Math.max(0, ...errs.slice(12)), mean: errs.slice(12).reduce((a, x) => a + x, 0) / Math.max(1, errs.length - 12), J: b.J, ci: M.bleCI(b) };
  }, [mode, CI, N]);
  const r = {};
  for (const [m, ci] of [['direct', 45], ['even', 45], ['direct', 15], ['even', 15]]) r[m + ci] = await run(m, ci);
  // a main-thread hiccup of the test page can delay one timer: the 90th percentile carries the claim, the maximum a loose bound
  const f = (x) => 'p90 ' + x.p90.toFixed(1) + ' / max ' + x.max.toFixed(1) + ' / mean ' + x.mean.toFixed(1) + ' ms';
  ok(r.direct45.n === 48 && r.direct45.order && r.direct45.p90 > 20, 'Direkt, CI 45 ms: plays on arrival, spacing error ' + f(r.direct45));
  ok(r.even45.n === 48 && r.even45.order && r.even45.p90 <= 5 && r.even45.max <= 14 && r.even45.mean <= 3, 'Gleichmäßig, CI 45 ms: spacing restored, ' + f(r.even45) + ' (J ' + Math.round(r.even45.J) + ' ms)');
  ok(r.direct15.max > 5, 'Direkt, CI 15 ms: ' + f(r.direct15));
  ok(r.even15.order && r.even15.p90 <= 5 && r.even15.p90 < r.direct15.p90 / 1.6 && r.even15.max <= 12 && r.even15.mean <= 2.5 && r.even15.J <= 20, 'Gleichmäßig, CI 15 ms: ' + f(r.even15) + ' (J ' + Math.round(r.even15.J) + ' ms)');
  ok(Math.abs(r.direct45.ci - 45) <= 3 && Math.abs(r.even15.ci - 15) <= 3, 'connection interval estimate: ' + Math.round(r.direct45.ci) + ' ms and ' + Math.round(r.even15.ci) + ' ms');

  // the interval estimator on its own: gaps are multiples of the interval, with jitter and an outlier
  const est = await page.evaluate(() => {
    const M = window.__M, j = (k) => ((k * 7919) % 11) / 5 - 1, mk = (xs) => ({ gaps: xs });
    const rep = (pat, n) => Array.from({ length: n }, (_, k) => pat[k % pat.length] + j(k));
    return [
      M.bleCI(mk(rep([30, 45], 48))), M.bleCI(mk([122.3].concat(rep([45, 45, 90], 47)))), M.bleCI(mk(rep([33.75, 45, 33.75], 48))),
      M.bleCI(mk(rep([7.5, 15, 22.5], 48))), M.bleCI(mk(rep([30, 60, 30], 48))), M.bleCI(mk(rep([50], 20))),
      M.bleCI(mk(Array.from({ length: 48 }, (_, k) => 20 + ((k * 7919) % 97) / 2))), M.bleCI(mk([30, 45])),
    ].map((x) => Math.round(x * 100) / 100);
  });
  ok(Math.abs(est[0] - 15) <= 0.5 && Math.abs(est[1] - 45) <= 0.75 && Math.abs(est[2] - 11.25) <= 0.5 && Math.abs(est[3] - 7.5) <= 0.5 && Math.abs(est[4] - 30) <= 0.5 && Math.abs(est[5] - 50) <= 0.75,
    'interval from gap multiples: 15 / 45 (with an outlier) / 11,25 / 7,5 / 30 / 50 ms → ' + est.slice(0, 6).join(' / '));
  ok(est[6] > 20 && est[6] < 50 && est[7] === 0, 'no grid in noise → lower quartile (' + est[6] + '); too few gaps → none');

  // panel shows interval and J
  await page.evaluate(() => { const M = window.__M; if (M.UI.panel !== 'dev') M.openPanel('dev'); M.setParam('midi.ble', 'even'); });
  await page.waitForTimeout(500);
  // the interval and the smoothing delay are diagnostics: under „Diagnose“, not in the device line
  let t = await page.evaluate(() => document.querySelector('.bledev .kc-diag').textContent);
  const line = await page.evaluate(() => document.querySelector('.bledev .note').textContent);
  ok(/Intervall ≈ 1\d ms/.test(t) && /Ausgleich \d+ ms/.test(t) && !/Intervall/.test(line), 'diagnosis: ' + t + ' / device line: ' + line);
  ok(await page.isVisible('#dev-midi\\.ble, [aria-label^="Bluetooth-Timing"]'), 'Bluetooth-Timing chips shown when Bluetooth is possible');

  // switching to Direkt with events waiting plays them at once, in order; a drop clears what waits
  t = await page.evaluate(async () => {
    const M = window.__M, d = window.__bt.dev('dev1'), b = [...M.BLE.devs.values()][0], got = [];
    M.setParam('midi.ble', 'even');
    b.J = 200; b.lags = Array(64).fill(200); b.lagN = 1;   // a long budget so the events surely wait
    M.MIDI.tap = (src, ev) => { if (ev.type === 'cc' && ev.num === 22) got.push(ev.val); };
    d.send([0x80, 0x80, 0xb0, 22, 1, 0x81, 0xb0, 22, 2, 0x82, 0xb0, 22, 3]);
    const waited = got.length === 0 && b.evq.length === 3;
    M.setParam('midi.ble', 'direct');
    const flushed = got.join() === '1,2,3' && !b.evq.length;
    M.setParam('midi.ble', 'even'); b.J = 200; b.lags = Array(64).fill(200);
    d.send([0x80, 0x90, 0xb0, 22, 4, 0x91, 0x90, 0x40, 0x64]);
    const q = b.evq.length;
    d.drop();
    await window.__sleep(400);
    M.MIDI.tap = null; M.setParam('midi.ble', 'direct');
    return { waited, flushed, q, after: got.join(), note: M.touches.has('midi-ble:dev1-0-64'), evT: b.evT };
  });
  ok(t.waited && t.flushed, 'switching to Direkt plays what waits, at once and in order');
  ok(t.q === 2 && t.after === '1,2,3' && !t.note && !t.evT, 'a drop clears the waiting events: nothing plays after the link is gone');
  ok(!errors.length, 'no page errors ' + errors.join(' | '));
  await close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
