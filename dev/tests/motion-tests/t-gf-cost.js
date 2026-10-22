// What the Humus's Bewegung and the Funkstrecke cost, on a CPU throttled 4× (slot gf; node t-gf-cost.js): writing down
// (one value of a lane, as every live mod source and Gestik update does), the scheduler's part with nothing to play, the
// same with a 4-bar Schleife of Bewegung of 8 lanes laid half a second ahead (Hexenring; the Fährte's loop before), the mod layer's flush with those points (the audio
// targets append), and the Funkstrecke's sender per Gestik update and its receiver per message.
// Budget: writing < 0.02 ms, an idle tick < 0.02 ms, a tick with the loop < 0.4 ms, a flush < 0.3 ms, the sender
// < 0.05 ms an update, the receiver < 0.05 ms a message.
const H = require('./gf-h');
const { ok } = H;
// the reference: the build the Schleife of Bewegung rows were written on (4d6d233, run-all.sh builds slot gfref), measured
// in turns with this one – there this headless machine measures it over the budgets too (a flush 0.29–0.44 ms against
// 0.3): a row asks its budget, or no more than the reference + 10 %
const URL_REF = process.env.GFREF || 'http://127.0.0.1:8790/gfref-inst/index.html';
async function lane(url) {
  const { page, errors } = await H.open(Object.assign({ mobile: true, cfg: { perm: 'granted' } }, url ? { url } : {}));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, now = () => performance.now();
    const time = (n, f) => { const t0 = now(); for (let i = 0; i < n; i++) f(i); return (now() - t0) / n; };
    // writing: a lane's value (a live source moving)
    const w = time(3000, (i) => M.faeIn('m|flt|map:cost:1', Math.sin(i / 30), 'm', 'flt', 'map:cost:1', false, 0));
    M.faeIn('m|flt|map:cost:1', 0, 'm', 'flt', 'map:cost:1', false, 0);
    // an idle tick: the clock, the finger's height
    const idle = time(400, () => M.faeTick(A.ctx.currentTime + 0.12));
    // a Schleife of Bewegung: 4 bars, 8 lanes on audio and other targets
    const ks = ['flt', 'pha', 'pan', 'dly', 'rev', 'korD', 'pulsD', 'hoehe'], n = 16 * 48;
    const cut = { n, lanes: ks.map((k, j) => ({ k, src: 'map:cost:' + j, v: Float32Array.from({ length: n }, (_, i) => 0.4 * Math.sin((2 * Math.PI * i * (j + 1)) / n)) })), disp: null };
    for (let i = 0; i < 100 && M.HX.state !== 'ok'; i++) await window.__sleep(50);
    const L = M.hxBewMake(cut, { b0: Math.floor(M.tgBeat(A.ctx.currentTime) / 4) * 4, why: 'cost' });
    await window.__sleep(400);
    // ticks as they come (most lay nothing, every few lay the new points – the mean is the cost), 160 after 10 to warm
    // up; and the tick that lays it all again (the clock moved), the median of 10 (one reading on the 0.1-ms clock of a
    // headless machine scattered 1.5–4.4 ms for the same build)
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length % 2 ? b[b.length >> 1] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
    const tk = [], tf = [], rl = [];
    for (let i = 0; i < 170; i++) {
      await window.__sleep(25);
      let t0 = now(); M.faeTick(A.ctx.currentTime + 0.12); const a = now() - t0;
      t0 = now(); M.modFlush(true); M.modFlush(); const b = now() - t0;
      if (i >= 10) { tk.push(a); tf.push(b); }
      if (i % 16 === 15) { t0 = now(); L.bew.re = true; M.faeTick(A.ctx.currentTime + 0.12); rl.push(now() - t0); M.modFlush(true); M.modFlush(); }
    }
    M.hxDrop(L);
    return { w, idle, tick: tk.reduce((x, y) => x + y, 0) / tk.length, flush: tf.reduce((x, y) => x + y, 0) / tf.length, relay: med(rl) };
  });
  // the Funkstrecke: sender per Gestik update, receiver per message
  await H.gestikOn(page);
  await page.evaluate(() => window.__outs('o1', 'Kabel'));
  await page.evaluate(() => window.__M.midiInit(true));
  await page.waitForTimeout(400);
  const f = await page.evaluate(async () => {
    const M = window.__M, now = () => performance.now();
    window.__sensor(true, { beta: 45, roll: 0 }, 3);
    await window.__sleep(800);
    window.__sensor(false);
    M.gkfPick('Kabel');
    // the sender, worst case: every axis changed and due (as if 10 ms had passed), the signature due too
    const st = M.GK.R.st, raw = M.GK.raw;
    let t = 0;
    for (let i = 0; i < 2000; i++) {
      st.roll = 10 * Math.sin(i / 10); st.pitch = 5 * Math.cos(i / 13); raw.bebung = 0.3 * Math.sin(i); raw.drehen = 0.2 * Math.cos(i / 3); raw.ladung = (i % 100) / 100;
      M.GKS.t.fill(0);
      const t0 = now(); M.gkfSub(M.GK.out, raw, [], now()); t += now() - t0;
    }
    const withSend = t / 2000, without = 0;
    M.gkfPick('');
    // the receiver: NRPN parts on channel 16 of a recognised source (the takeover path, before Gestik's own update)
    const src = M.midiSource('cost-in', 'Kostenhandy', 'webmidi');
    src.enabled = true;
    src.gkr = { t: now(), flags: 1, latS: null, v: new Float64Array(8), ev: [], due: true, n: 0, rn: 0, rt: now(), rate: 0 };
    let tr = 0;
    for (let i = 0; i < 2000; i++) {
      const t0 = now();
      M.gkrTake(src, { type: 'cc', ch: 15, num: [99, 98, 6, 38][i % 4], val: [42, i % 8, 64, i % 128][i % 4] });
      tr += now() - t0;
    }
    M.midiDrop && M.midiDrop(src);
    return { send: withSend - without, upd: without, recv: tr / 2000 };
  });
  await page.context().close();
  return { r, f, errors };
}
(async () => {
  const runs = [], refs = [];
  for (let i = 0; i < 2; i++) { runs.push(await lane()); refs.push(await lane(URL_REF)); }
  const pick = (L, k, g) => { const v = L.map((x) => x[g][k]).sort((a, b) => a - b); return v[v.length >> 1]; };   // (the higher of two: v[1])
  const errors = runs.flatMap((x) => x.errors);
  const r = {}, f = {}, R = {}, F = {};
  for (const k of ['w', 'idle', 'tick', 'flush', 'relay']) { r[k] = pick(runs, k, 'r'); R[k] = pick(refs, k, 'r'); }
  for (const k of ['send', 'recv']) { f[k] = pick(runs, k, 'f'); F[k] = pick(refs, k, 'f'); }
  const ref = (x, y) => ' – the reference build ' + y + (x <= 1.1 * y ? '' : ' (+ 10 % exceeded)');
  const fit = (x, lim, y) => x < lim || x <= 1.1 * y;
  ok(fit(r.w, 0.02, R.w), 'writing a value down: ' + (r.w * 1000).toFixed(1) + ' µs (< 20 µs)' + ref((r.w * 1000).toFixed(1), (R.w * 1000).toFixed(1)));
  ok(fit(r.idle, 0.02, R.idle), 'the scheduler\'s part with nothing to play: ' + (r.idle * 1000).toFixed(1) + ' µs (< 20 µs)' + ref((r.idle * 1000).toFixed(1), (R.idle * 1000).toFixed(1)));
  ok(fit(r.tick, 0.4, R.tick), 'with a 4-bar Schleife of Bewegung of 8 lanes: ' + r.tick.toFixed(3) + ' ms a tick, the mean of 160 (< 0.4 ms)' + ref(r.tick.toFixed(3), R.tick.toFixed(3)));
  ok(fit(r.flush, 0.3, R.flush), 'the mod layer\'s flush with the points (appended, not laid anew): ' + r.flush.toFixed(3) + ' ms, the mean of 160 (< 0.3 ms)' + ref(r.flush.toFixed(3), R.flush.toFixed(3)));
  ok(fit(r.relay, 2, R.relay), 'laying half a second of all 8 lanes anew (a tempo change): ' + r.relay.toFixed(3) + ' ms, the median of 10 (< 2 ms)' + ref(r.relay.toFixed(3), R.relay.toFixed(3)));
  ok(fit(f.send, 0.05, F.send), 'the Funkstrecke\'s sender: ' + (f.send * 1000).toFixed(1) + ' µs per Gestik update with every axis to send (< 50 µs)' + ref((f.send * 1000).toFixed(1), (F.send * 1000).toFixed(1)));
  ok(fit(f.recv, 0.05, F.recv), 'its receiver: ' + (f.recv * 1000).toFixed(1) + ' µs a message (< 50 µs)' + ref((f.recv * 1000).toFixed(1), (F.recv * 1000).toFixed(1)));
  console.log('INFO each figure the higher of two rounds, this build and the reference in turns: ' + JSON.stringify(runs.map((x) => x.r)) + ' / ' + JSON.stringify(refs.map((x) => x.r)));
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
