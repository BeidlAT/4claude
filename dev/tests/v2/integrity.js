// A steady sine through the master, recorded in bars and freely: no dropped, doubled or zeroed samples.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(500);
  for (const mode of ['bars', 'free', 'bars']) {
    const r = await page.evaluate(async (mode) => {
      const M = window.__M, A = M.A, w = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const k of ['rev.mix', 'dly.mix', 'cho.mix', 'pha.mix', 'drv.mix', 'rng.mix', 'mov.pan']) M.setParam(k, 0);
      M.setParam('mst.comp', 0); M.setParam('flt.freq', 18000); M.setParam('seq.bpm', 100); M.setParam('rec.len', mode); M.setParam('rec.bars', 3); M.setParam('rec.tail', false);
      const o = A.ctx.createOscillator(); o.frequency.value = 440; const g = A.ctx.createGain(); g.gain.value = 0.2; o.connect(g).connect(A.masterSum); o.start();
      await w(300);
      M.recToggle(); await w(mode === 'free' ? 3000 : 200);
      if (mode === 'free') M.recToggle();
      while (M.CAP.state !== 'idle' || M.CAP.finishing) await w(50);
      o.stop(); o.disconnect();
      const tk = M.takes[0]; let n = 0; for (const a of tk.L) n += a.length; const L = new Float32Array(n); let off = 0; for (const a of tk.L) { L.set(a, off); off += a.length; }
      let maxStep = 0, zeros = 0, run = 0, pk = 0;
      for (let i = 1; i < L.length; i++) { maxStep = Math.max(maxStep, Math.abs(L[i] - L[i - 1])); pk = Math.max(pk, Math.abs(L[i])); run = L[i] === 0 ? run + 1 : 0; zeros = Math.max(zeros, run); }
      return { frames: tk.frames, expect: Math.round(3 * 4 * 60 / 100 * A.ctx.sampleRate), maxStep, pk, zeros, mode, sr: A.ctx.sampleRate };
    }, mode);
    const limit = 2 * Math.PI * 440 / r.sr * r.pk * 1.05;
    ok(r.maxStep <= limit && r.zeros < 4 && (r.mode === 'free' || r.frames === r.expect), `${r.mode}: ${r.frames} frames, largest step ${r.maxStep.toFixed(4)} (smooth ≤ ${limit.toFixed(4)}), zero run ${r.zeros}`);
  }
  await browser.close();
})();
