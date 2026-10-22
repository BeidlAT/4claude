// More Fährte reproductions (slot fx): J – an external MIDI clock with realistic timestamp jitter; L – a stall longer
// than the scheduled window; F2 – how long a hold waits for the unseen bar line.
process.env.GF = process.env.GF || 'http://127.0.0.1:8790/fx-inst/index.html';
const H = require('../motion-tests/gf-h');
const { model } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (k, m) => console.log('REPRO ' + k + ': ' + m);
const want = process.argv.slice(2);
const run = (k) => !want.length || want.includes(k);
const F1 = '0.55*Math.sin(2*Math.PI*t/0.7)+0.25*Math.sin(2*Math.PI*t/0.23)';
async function check(page, t0, t1) {
  const L = await page.evaluate(() => window.__loop());
  const pts = await page.evaluate(([a, b]) => window.__PR.pts.filter((p) => p[0] >= a && p[0] <= b), [t0, t1]);
  let err = 0, n = 0, mx = 0;
  for (const [T, v] of pts) { if (!Number.isFinite(v)) continue; const e = Math.abs(v / 2400 - model(L, T)); err += e; n++; if (e > mx) mx = e; }
  return { n, mean: n ? err / n : 1, mx };
}
(async () => {
  if (run('J')) {
    for (const jit of (process.env.JITS || "0,1,2,4").split(",").map(Number)) {
      const { page } = await H.open({ cfg: { ins: [['c1', 'Clock Box']] } });
      await page.evaluate(() => { const M = window.__M; M.setParam('midi.clock', 'follow'); M.setParam('midi.transport', true); M.FA.p.len = 1; M.FA.p.fade = 1; M.setParam('seq.bpm', 120); });
      await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
      await sleep(150);
      await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
      await sleep(2600);
      await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
      await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 3000 });
      await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
      await page.evaluate((J) => {
        const inp = window.__midi.inputs.get('c1'), snd = (b, ts) => inp.onmidimessage({ data: new Uint8Array(b), timeStamp: ts });
        const t0 = performance.now() + 20;
        let k = 0;
        if (J < 0) { window.__M.seqStart(); window.__ck = 0; return; }
        snd([0xfa], performance.now());
        window.__ck = setInterval(() => { const now = performance.now(); while (t0 + k * 25 <= now) { snd([0xf8], t0 + 25 * k + (Math.random() * 2 - 1) * J); k++; } }, 5);
      }, jit);
      await sleep(7000);
      const p0 = await page.evaluate(() => ({ pv: window.__M.MOD.t.flt.pv, t: window.__M.A.ctx.currentTime, d: window.__M.FA.d }));
      await sleep(6000);
      const p1 = await page.evaluate(() => ({ pv: window.__M.MOD.t.flt.pv, t: window.__M.A.ctx.currentTime, bpm: window.__M.FA.bpm, d: window.__M.FA.d }));
      // steps in what sounds: successive render quanta against the loop's own change between them (model on the current clock)
      const L = await page.evaluate(() => window.__loop());
      const pts = await page.evaluate(([a, b]) => window.__PR.pts.filter((p) => p[0] >= a && p[0] <= b && Number.isFinite(p[1])), [p0.t, p1.t - 0.1]);
      let big = 0, worst = 0, ms = 0;
      for (const ln of L.lanes) for (let i = 0; i < L.n; i++) ms = Math.max(ms, Math.abs(ln.v[(i + 1) % L.n] - ln.v[i]));
      const stepS = 60 / L.bpm / L.R, lim = ms * (128 / 48000) / stepS;   // the most the loop itself can move in one render quantum
      for (let i = 1; i < pts.length; i++) { const dv = Math.abs(pts[i][1] - pts[i - 1][1]) / 2400; if (dv > worst) worst = dv; if (dv > 1.5 * lim + 1e-4) big++; }
      worst = worst / lim;
      const c = await check(page, p1.t - 0.9, p1.t - 0.1);
      say('J', 'external clock 100 BPM, pulse stamps ±' + jit + ' ms: laid anew ' + ((p1.pv - p0.pv) / (p1.t - p0.t)).toFixed(1) + '×/s over 6 s; quanta moving faster than the loop itself can: ' + big + ' (worst ' + worst.toFixed(1) + '× its steepest); last 0.8 s vs. loop: mean ' + Math.round(c.mean * 2400) + ' cents; realigned=' + (p0.d !== p1.d) + '; tempo ' + p1.bpm.toFixed(2));
      await page.evaluate(() => { clearInterval(window.__ck); window.__send([0xfc], 'c1'); });
      await H.close();
    }
  }
  if (run('L')) {
    const { page } = await H.open({});
    await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.len = 1; M.FA.p.fade = 1; });
    await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
    await sleep(150);
    await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
    await sleep(2600);
    await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
    await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 3000 });
    await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    await sleep(1000);
    for (const ms of [300, 450, 700, 1200]) {
      const st = await page.evaluate((ms) => { const M = window.__M, t0 = M.A.ctx.currentTime, w = performance.now(); while (performance.now() - w < ms); return [t0, M.A.ctx.currentTime]; }, ms);
      await sleep(600);
      const c = await check(page, st[0], st[1] + 0.1);
      say('L', 'main thread blocked ' + ms + ' ms (audio +' + (st[1] - st[0]).toFixed(2) + ' s): error vs. the loop mean ' + c.mean.toFixed(4) + ', max ' + c.mx.toFixed(3) + ' (' + Math.round(c.mx * 2400) + ' cents)');
      await sleep(400);
    }
    await H.close();
  }
  if (run('F2')) {
    const { page } = await H.open({});
    const w = [];
    for (let i = 0; i < 6; i++) {
      await sleep(300 + Math.random() * 2500);
      w.push(await page.evaluate(async () => {
        const M = window.__M; M.FA.p.len = 1; M.faeClear(false);
        const t = performance.now(); M.faePress(); await window.__sleep(450); M.faeRelease(false);
        const W = M.FA.win; if (!W) return null;
        return M.faeT(W.a / 48) - M.ctxAt(t);   // from the press to the start of the recording (audio time)
      }));
    }
    say('F2', 'press → recording starts after: ' + w.map((x) => (x == null ? '–' : x.toFixed(2) + ' s')).join(', ') + ' (84 BPM, bar 2.86 s; release changes nothing)');
    await H.close();
  }
  await H.close();
})().catch((e) => { console.log('ERR ' + e.stack); process.exitCode = 1; return H.close(); });
