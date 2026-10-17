// Fährte – the loop itself (slot gf; node t-gf-loop.js): a known waveform on a Formen source (as a knob or Gestik
// would move it) is written down always; a tap makes the last bar a loop at once; what the audio thread then really
// plays (an AudioWorklet samples the Filter target's node) matches the waveform at the same place in the bar within one
// 25 ms tick; Verblassen per pass; overdub (hold while it runs); double tap / clear; a tempo change in the middle of a
// pass; an external MIDI clock leading the Puls; a 300 ms main-thread stall does not shift or interrupt it; the Puls
// starting moves the loop onto its bar lines; the patch is never written.
const H = require('./gf-h');
const { ok, model } = H;
const F1 = '0.55*Math.sin(2*Math.PI*t/0.7)+0.25*Math.sin(2*Math.PI*t/0.23)';
const f1 = (t) => 0.55 * Math.sin((2 * Math.PI * t) / 0.7) + 0.25 * Math.sin((2 * Math.PI * t) / 0.23);
const F2 = '0.3*Math.sin(2*Math.PI*t/0.37)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the probe's samples in [t0, t1] against what the loop must play (cents of the Filter target: × 2400)
async function check(page, t0, t1) {
  const L = await page.evaluate(() => window.__loop());
  const pts = await page.evaluate(([a, b]) => window.__PR.pts.filter((p) => p[0] >= a && p[0] <= b), [t0, t1]);
  let err = 0, n = 0, mx = 0;
  for (const [T, v] of pts) { if (!Number.isFinite(v)) continue; const e = Math.abs(v / 2400 - model(L, T)); err += e; n++; if (e > mx) mx = e; }
  return { L, n, mean: n ? err / n : 1, mx };
}
(async () => {
  const { page, errors } = await H.open({ cfg: {} });
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.len = 1; M.FA.p.fade = 1; M.FA.p.trim = 0; });
  const patch0 = await page.evaluate(() => JSON.stringify(window.__M.PATCH_IDS ? null : null));
  // ---- a waveform on Formen · Filter, written down without anything armed
  await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
  await sleep(150);
  await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
  // a whole bar of it, heard, before the tap's bar line: wait until the heard beat is a bar past the first bar line
  // after the drive began
  const b1 = await page.evaluate(() => { const M = window.__M, b = M.faeHeard(performance.now()); return M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4) + 4.4; });
  await page.waitForFunction((b) => window.__M.faeHeard(performance.now()) >= b, b1, { timeout: 8000 });
  const lanes = await page.evaluate(() => [...window.__M.FA.lanes.keys()]);
  ok(lanes.includes('m|flt|map:test:1'), 'a Formen source is written down by itself (lane m|flt|map:test:1), nothing armed');
  const tap = await page.evaluate(() => { const M = window.__M; const bh = M.faeHeard(performance.now()); M.faeTake(bh, 'tap', 1); return { bh, ph: M.FA.ph, shift: M.faeShift(false) }; });
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2000 });
  const tStop = await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
  const L0 = await page.evaluate(() => window.__loop());
  ok(L0 && L0.n === 4 * 48 && L0.lanes.length === 1 && L0.lanes[0].k === 'flt' && L0.lanes[0].src === 'map:test:1', 'tap: the last bar became a loop at once (1 bar = 192 steps, one lane: Filter from the test source)');
  const E = tap.ph + 4 * Math.floor((tap.bh - tap.ph) / 4);
  ok(Math.abs(L0.a / 48 - (E - 4)) < 1e-9 || Math.abs(L0.a / 48 - E) < 1e-9, 'the loop is the bar before the tap\'s bar line (heard beat ' + tap.bh.toFixed(2) + ', bar line ' + E.toFixed(2) + ')');
  await sleep(4200);
  // what sounds against the waveform itself: f at the same place in the bar it was played (t − loop + shift)
  {
    const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])), tStop + 0.08);
    const L = L0, md = (x, n) => ((x % n) + n) % n;
    const orig = (T, d) => {   // the time the value at T was played: the same beat one loop (or more) earlier, plus the shift
      const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, pos = md(fb * L.R - L.a, L.n) / L.R, bOrig = L.a / L.R + pos;
      return L.t0 + ((bOrig - L.b0) * 60) / L.bpm + tap.shift + d;
    };
    // what the source really set, and when (a busy page's timer runs late: the values hold meanwhile, as they did)
    const log = await page.evaluate(() => window.__drv['map:test:1']);
    const held = (t) => { let lo = 0, hi = log.length - 1; if (t < log[0][0]) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (log[m][0] <= t) lo = m; else hi = m - 1; } return log[lo][1]; };
    let best = null;
    for (let d = -0.08; d <= 0.0801; d += 0.001) {
      let e = 0, n = 0;
      for (const [T, v] of pts) {
        const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, pos = md(fb * L.R - L.a, L.n);
        if (pos < 3 || pos > L.n - 3) continue;   // the wrap: the waveform jumps there
        e += Math.abs(v / 2400 - held(orig(T, d))); n++;
      }
      if (!best || e / n < best.e) best = { d, e: e / n, n };
    }
    ok(best && Math.abs(best.d) <= 0.025, 'played back where it was played: best match at ' + (best.d * 1000).toFixed(0) + ' ms (one tick: 25 ms) over ' + best.n + ' audio-thread samples');
    ok(best && best.e < 0.03, 'the waveform itself comes back, as it was set (mean error ' + best.e.toFixed(4) + ' of ±0.8)');
  }
  const c1 = await check(page, tStop + 0.08, tStop + 4);
  ok(c1.mean < 0.004 && c1.mx < 0.03, 'the loop plays its own points exactly (mean ' + c1.mean.toFixed(5) + ', max ' + c1.mx.toFixed(4) + ', ' + c1.n + ' samples)');
  // ---- the patch is never written by the playback
  const pf = await page.evaluate(() => { const M = window.__M; return [M.P['flt.freq'], M.UI.preset]; });
  // ---- Verblassen: × 0.5 per pass
  const tf = await page.evaluate(() => { window.__M.faeFade(0.5); return window.__M.A.ctx.currentTime; });
  await sleep(4200);
  {
    const L = await page.evaluate(() => window.__loop());
    const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])), tf + 0.1);
    const flat = Object.assign({}, L, { fade: 1, g0: 1 });   // the loop's own curve at full strength
    let r = [];
    for (const [T, v] of pts) {
      const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, raw = model(flat, T);
      if (Math.abs(raw) < 0.3) continue;
      r.push([fb, v / 2400 / raw]);
    }
    // the strength one pass (4 beats) later is half
    let pairs = 0, bad = 0;
    for (const [b, g] of r) { const q = r.find((x) => Math.abs(x[0] - (b + 4)) < 0.01); if (q) { pairs++; if (Math.abs(q[1] / g - 0.5) > 0.05) bad++; } }
    ok(pairs > 50 && bad / pairs < 0.05, 'Verblassen × 0.5: one pass later every place is half as strong (' + pairs + ' pairs, ' + bad + ' off)');
    const gNow = await page.evaluate(() => { const M = window.__M, L = M.FA.loop; return M.faeGain(L, M.faeB(M.A.ctx.currentTime)); });
    ok(gNow < 0.4 && gNow > 0.05, 'the loop fades as it plays (now ' + Math.round(gNow * 100) + ' %)');
  }
  await page.evaluate(() => window.__M.faeFade(1));
  const pf2 = await page.evaluate(() => { const M = window.__M; return [M.P['flt.freq'], M.UI.preset]; });
  ok(JSON.stringify(pf) === JSON.stringify(pf2), 'playing the loop never writes the patch (Filter ' + pf2[0] + ' Hz, preset mark unchanged)');
  // ---- overdub: hold while it runs → one pass of a second source on top
  const od = await page.evaluate((F) => { const M = window.__M; M.faeHold(); window.__drive('map:test:2', 'flt', F); return { win: M.FA.win && { a: M.FA.win.a, b: M.FA.win.b, od: M.FA.win.od }, st: M.faeState() }; }, F2);
  ok(od.win && od.win.od && od.win.b - od.win.a === 192 && (od.st === 'oda' || od.st === 'od'), 'hold while a loop runs: one pass over it, from the next bar line (' + od.st + ')');
  await page.waitForFunction(() => !window.__M.FA.win, null, { timeout: 6000 });
  const t3 = await page.evaluate(() => window.__undrive('map:test:2', 'flt'));
  const L2 = await page.evaluate(() => window.__loop());
  ok(L2.why === 'od' && L2.lanes.length === 2 && L2.lanes.some((x) => x.src === 'map:test:2') && L2.g0 === 1, 'after the pass: the loop has both (old × its strength + the new one), full strength again');
  await sleep(2300);
  const c2 = await check(page, t3 + 0.08, t3 + 2.2);
  ok(c2.mean < 0.004 && c2.mx < 0.03, 'what plays is old + new (mean ' + c2.mean.toFixed(5) + ', max ' + c2.mx.toFixed(4) + ')');
  // ---- tempo change in the middle of a pass (the Puls stands: the Fährte counts on at the new tempo)
  const tt = await page.evaluate(() => { window.__M.setParam('seq.bpm', 90); return window.__M.A.ctx.currentTime; });
  await sleep(3200);
  const c3 = await check(page, tt + 0.06, tt + 3);
  ok(c3.L.bpm === 90 && c3.mean < 0.004 && c3.mx < 0.04, 'tempo 120 → 90 mid-pass: the loop follows the new tempo at once, in beats (mean ' + c3.mean.toFixed(5) + ', max ' + c3.mx.toFixed(4) + ')');
  // ---- a 300 ms main-thread stall: the points laid ahead keep playing, exactly
  const st = await page.evaluate(() => { const M = window.__M, t0 = M.A.ctx.currentTime, w = performance.now(); while (performance.now() - w < 300); return [t0, M.A.ctx.currentTime]; });
  await sleep(400);
  const c4 = await check(page, st[0], st[0] + 0.32);
  ok(st[1] - st[0] > 0.28 && c4.n > 80 && c4.mean < 0.004 && c4.mx < 0.04, 'a 300 ms stall of the page (audio clock +' + (st[1] - st[0]).toFixed(3) + ' s): the audio thread played the loop through it unchanged (' + c4.n + ' samples, mean ' + c4.mean.toFixed(5) + ', max ' + c4.mx.toFixed(4) + ')');
  // ---- the Puls starts: the loop moves onto its bar lines once (less than half a bar), then plays in its beat
  const ps = await page.evaluate(async () => {
    const M = window.__M, a0 = M.FA.loop.a;
    M.seqStart();
    await window.__sleep(300);
    return { da: (M.FA.loop.a - a0) / 48, bar: (((M.FA.loop.a / 48 + M.FA.d) % 4) + 4) % 4, on: M.SEQ.on };
  });
  ok(ps.on && Math.abs(ps.da) <= 2 && (ps.bar < 0.011 || ps.bar > 4 - 0.011), 'the Puls starts: the loop moves onto its bar lines (by ' + ps.da.toFixed(2) + ' beats, ≤ half a bar)');
  const tp = await page.evaluate(() => window.__M.A.ctx.currentTime);
  await sleep(1500);
  const c5 = await check(page, tp + 0.05, tp + 1.4);
  ok(c5.mean < 0.004 && c5.mx < 0.04, 'and plays on the Puls\'s beat (mean ' + c5.mean.toFixed(5) + ')');
  // ---- double tap clears (the button's own gesture)
  await page.evaluate(async () => { const M = window.__M; M.faePress(); M.faeRelease(); await window.__sleep(120); M.faePress(); M.faeRelease(); });
  await sleep(600);
  const cl = await page.evaluate(() => { const M = window.__M; return { loop: !!M.FA.loop, src: [...M.MOD.t.flt.s.keys()].filter((k) => k.startsWith('fae:')).length, st: M.faeState() }; });
  ok(!cl.loop && !cl.src && cl.st === '', 'double tap: the Fährte is cleared – its sources left the layer');
  const tq = await page.evaluate(() => window.__M.A.ctx.currentTime);
  await sleep(300);
  const quiet = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])).every((p) => Math.abs(p[1]) < 0.5), tq + 0.06);
  ok(quiet, 'and the Filter is back at the patch exactly (0 cents)');
  // ---- a tap with nothing moving: no loop, a word
  await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
  await sleep(700);
  const em = await page.evaluate(() => ({ loop: !!window.__M.FA.loop, toast: document.getElementById('toastMsg').textContent }));
  ok(!em.loop && /nichts bewegt/.test(em.toast), 'nothing moved in the last bar: no loop, the toast says so (“' + em.toast + '”)');
  await page.evaluate(() => window.__M.seqStop());
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();

  // ---- an external MIDI clock leads: the loop follows its tempo and its bars
  {
    const { page, errors } = await H.open({ cfg: { ins: [['c1', 'Clock Box']] } });
    await page.evaluate(() => { const M = window.__M; M.setParam('midi.clock', 'follow'); M.setParam('midi.transport', true); M.FA.p.len = 1; M.FA.p.fade = 1; M.setParam('seq.bpm', 120); });
    await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
    await sleep(150);
    await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
    await sleep(2600);
    await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
    await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2000 });
    await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    // 100 BPM: a pulse every 25 ms, Start first
    // pulses stamped exactly (a device's clock), sent whenever the page gets to it
    await page.evaluate(() => {
      const inp = window.__midi.inputs.get('c1'), snd = (b, ts) => inp.onmidimessage({ data: new Uint8Array(b), timeStamp: ts });
      const t0 = performance.now() + 20;
      let k = 0;
      snd([0xfa], performance.now());
      window.__ck = setInterval(() => { const now = performance.now(); while (t0 + k * 25 <= now) snd([0xf8], t0 + 25 * k++); }, 5);
    });
    await sleep(2500);
    const ck = await page.evaluate(() => { const M = window.__M; return { on: M.SEQ.on, ext: M.SEQ.ext && M.SEQ.ext.bpm, sbpm: M.SEQ.bpm, fbpm: M.FA.bpm, bar: (((M.FA.loop.a / 48 + M.FA.d) % 4) + 4) % 4, t: M.A.ctx.currentTime }; });
    ok(ck.on && Math.abs(ck.ext - 100) < 1.5 && Math.abs(ck.fbpm - ck.sbpm) < 0.05, 'external clock at 100 BPM: the Puls follows it, and so does the Fährte (' + ck.fbpm.toFixed(2) + ' BPM)');
    ok(ck.bar < 0.02 || ck.bar > 3.98, 'the loop sits on the clock\'s bar lines');
    await sleep(1200);
    const c = await check(page, ck.t + 0.3, ck.t + 1.1);
    ok(c.mean < 0.01, 'and plays in the clock\'s beat (mean ' + c.mean.toFixed(5) + ')');
    await page.evaluate(() => { clearInterval(window.__ck); window.__send([0xfc], 'c1'); });
    ok(!errors.length, 'no page errors (clock)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await H.close();
  }
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
