// Review probe: main-thread cost while a knob streams (≈200 CC/s) and keys play, with the Gerät panel closed, open, and
// open with the monitor and all bindings unfolded – 4× CPU throttling on a 390 px phone.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
(async () => {
  const { page, ctx } = await open({ vp: [390, 844], touch: true, ua: 'android', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(300);
  const run = async (label) => page.evaluate(async (label) => {
    const lt = []; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push(e.duration); }); po.observe({ type: 'longtask', buffered: false });
    const frames = []; let last = performance.now(), go = true;
    const raf = (t) => { frames.push(t - last); last = t; if (go) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const t0 = performance.now();
    let i = 0;
    while (performance.now() - t0 < 3000) {
      window.__send([0xb0, 20 + (i % 3), 20 + (i % 100)], 'k1');
      if (i % 40 === 0) window.__send([0x90, 48 + (i % 12), 90], 'k1');
      if (i % 40 === 20) window.__send([0x80, 48 + ((i - 20) % 12), 0], 'k1');
      i++; await new Promise((r) => setTimeout(r, 5));
    }
    go = false; po.disconnect();
    frames.sort((a, b) => a - b);
    const p = (q) => frames[Math.floor(frames.length * q)] || 0;
    return label + ': msgs ' + i + ', frames ' + frames.length + ', p50 ' + p(0.5).toFixed(1) + ' ms, p95 ' + p(0.95).toFixed(1) + ' ms, max ' + frames[frames.length - 1].toFixed(1) + ' ms, long tasks ' + lt.length + ' (sum ' + Math.round(lt.reduce((a, b) => a + b, 0)) + ' ms)';
  }, label);
  console.log(await run('panel closed'));
  await page.evaluate(() => window.__M.openPanel('dev')); await page.waitForTimeout(300);
  console.log(await run('Gerät open'));
  await page.evaluate(() => { for (const b of document.querySelectorAll('.fold-b')) if (b.getAttribute('aria-expanded') !== 'true') b.click(); for (const d of document.querySelectorAll('#sheetBody details')) d.open = true; });
  await page.waitForTimeout(300);
  console.log(await run('Gerät open, monitor + all folds open'));
  await close();
})();
