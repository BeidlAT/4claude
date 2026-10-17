// Review probe: which open part of the Gerät panel costs the frames (4× CPU throttling, 390 px): the monitor, the
// unfolded profile bindings, "Spielweise"; with a CPU profile of the worst case.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
const fs = require('fs');
async function measure(setup, label, prof) {
  const { page, ctx } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(300);
  await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(200);
  await page.evaluate(setup); await page.waitForTimeout(300);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (prof) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
  const r = await page.evaluate(async () => {
    const lt = []; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push(e.duration); }); po.observe({ type: 'longtask' });
    const frames = []; let last = performance.now(), go = true;
    const raf = (t) => { frames.push(t - last); last = t; if (go) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const t0 = performance.now(); let i = 0;
    const iv = setInterval(() => { for (let k = 0; k < 4; k++) { window.__send([0xb0, 20 + (i % 3), 20 + (i % 100)], 'k1'); i++; } }, 20);   // ≈200 CC/s
    await new Promise((r) => setTimeout(r, 3000)); clearInterval(iv); go = false; po.disconnect();
    frames.sort((a, b) => a - b); const p = (q) => frames[Math.floor(frames.length * q)] || 0;
    return 'msgs ' + i + ', frames ' + frames.length + ', p50 ' + p(0.5).toFixed(1) + ', p95 ' + p(0.95).toFixed(1) + ', long tasks ' + lt.length + ' (' + Math.round(lt.reduce((a, b) => a + b, 0)) + ' ms)';
  });
  console.log(label + ': ' + r);
  if (prof) {
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const dt = profile.timeDeltas, s = profile.samples;
    for (let k = 0; k < s.length; k++) { const n = byId.get(s[k]); const key = n.callFrame.functionName || '(anon)'; self.set(key, (self.get(key) || 0) + (dt[k] || 0) / 1000); }
    console.log('  top self time:', [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + v.toFixed(0) + 'ms').join(', '));
  }
  await close();
}
(async () => {
  await measure(() => {}, 'Gerät open (folds closed)');
  await measure(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Monitor/.test(x.textContent)); b.click(); }, 'monitor open');
  await measure(() => { for (const d of document.querySelectorAll('details.kc-bd')) d.open = true; }, 'profile bindings unfolded');
  await measure(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Monitor/.test(x.textContent)); b.click(); }, 'monitor open (profile)', true);
})();
