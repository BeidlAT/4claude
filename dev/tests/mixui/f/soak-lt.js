// 3-minute soak: sound + Puls running, mixer open; switch views, open/step/close details, morph, drag faders, toggle
// mute/solo, visit the Puls panel and come back. Watches console errors, heap after forced GC, DOM nodes, listeners,
// mixerFrame cost and long rAF gaps.   node soak.js d1280|phone [seconds]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./lib.js');
const which = process.argv[2] || 'd1280', SECS = +(process.argv[3] || 180);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
  const { ctx, pg } = await L.page(b, which);
  const mob = !!L.VP[which].mobile;
  await L.start(pg);
  await pg.click('#tab-mix'); await pg.waitForTimeout(1500);
  // rAF gaps (whole page) and long tasks
  await pg.evaluate(() => {
    window.__GAP = { n: 0, g50: 0, g100: 0, max: 0 }; window.__LT = [];
    let last = performance.now();
    const f = (t) => { const d = t - last; last = t; const G = window.__GAP; G.n++; if (d > 50) G.g50++; if (d > 100) G.g100++; if (d > G.max) G.max = d; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__LT.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
  });
  const c = pg.cdp; await c.send('Performance.enable');
  const mem = async () => {
    await c.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(150);
    const m = Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    return { heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, lis: m.JSEventListeners, docs: m.Documents };
  };
  const audio = () => pg.evaluate(() => { const a = window.__M.A.ctx; const ps = a && a.playoutStats; return { state: a && a.state, t: a && +a.currentTime.toFixed(1), fallback: ps ? ps.fallbackFramesEvents : null, seq: window.__M.SEQ.on }; });
  const snaps = [{ t: 0, ...(await mem()) }];
  console.log(which, 'start', JSON.stringify(snaps[0]), JSON.stringify(await audio()));
  const KS = ['fin', 'eb2', 'l0', 'l1', 'l2', 'l3', 'puls', 'bor', 'dly', 'rev', 'sum'];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const S = (id, v) => pg.evaluate(([i, v]) => window.__M.setParam(i, v), [id, v]);
  const press = async (sel) => { const e = await pg.$(sel); if (!e || !(await e.isVisible())) return false; if (mob) await e.tap(); else await e.click(); return true; };
  const actions = {
    view: async () => { const v = await pg.evaluate(() => window.__MX.MX.view); await press('.mx-vsw button[data-v="' + (v === 'pult' ? 'geflecht' : 'pult') + '"]'); },
    detail: async () => { await pg.evaluate((k) => window.__MX.openDetail(k), pick(KS)); await pg.waitForTimeout(900); for (let i = 0; i < 3; i++) { await press('.mxd-nav >> nth=' + (rnd() < 0.5 ? 0 : 1)); await pg.waitForTimeout(500); } await pg.evaluate(() => { const b = document.querySelector('.mxd-body'); if (b) b.scrollTop = 300 + Math.random() * 600; }); await pg.waitForTimeout(500); if (!(await press('.mxd-back'))) await pg.evaluate(() => window.__MX.closeDetail()); },
    morph: async () => {
      await pg.evaluate(() => { const M = window.__M, X = window.__MX; X.mxSnapStore('a'); for (const k of ['fin', 'l0', 'l1', 'bor', 'rev']) { M.setParam('x' + k + '.vol', -30 + Math.random() * 30); M.setParam('x' + k + '.pan', Math.random() * 2 - 1); } M.setParam('xl2.mid', Math.random() * 20 - 10); X.mxSnapStore('b'); X.mxMorphTo(Math.random(), true); });
      await pg.waitForTimeout(900);
      const r = await pg.evaluate(() => { const e = document.querySelector('.mx-morph'); if (!e || !e.offsetParent) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; });
      if (r) { const y = r[1] + r[3] / 2, x0 = r[0] + r[2] * 0.2, x1 = r[0] + r[2] * 0.8; if (mob) await L.touchDrag(pg, L.line(x0, y, x1, y, 16)); else { await pg.mouse.move(x0, y); await pg.mouse.down(); for (let i = 1; i <= 16; i++) { await pg.mouse.move(x0 + (x1 - x0) * i / 16, y); await pg.waitForTimeout(16); } await pg.mouse.up(); } }
    },
    fader: async () => {
      // a real drag on a visible stem (pult) or a spore column (geflecht)
      const r = await pg.evaluate(() => { const els = [...document.querySelectorAll('.mx-st .mx-stem, .mxg-f')].filter((e) => e.offsetParent); if (!els.length) return null; const e = els[Math.floor(Math.random() * els.length)]; const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height * 0.5, q.height]; });
      if (!r) return;
      const [x, y, hgt] = r, d = Math.min(80, hgt * 0.3) * (rnd() < 0.5 ? -1 : 1);
      if (mob) await L.touchDrag(pg, L.line(x, y, x, y + d, 14)); else { await pg.mouse.move(x, y); await pg.mouse.down(); for (let i = 1; i <= 14; i++) { await pg.mouse.move(x, y + d * i / 14); await pg.waitForTimeout(16); } await pg.mouse.up(); }
    },
    keys: async () => { const ok = await pg.evaluate(() => { const els = [...document.querySelectorAll('[role="slider"]')].filter((e) => e.offsetParent && e.closest('.mx')); if (!els.length) return false; els[Math.floor(Math.random() * els.length)].focus(); return true; }); if (ok) for (let i = 0; i < 6; i++) await pg.keyboard.press(pick(['ArrowUp', 'ArrowDown', 'Shift+ArrowUp', 'ArrowLeft', 'ArrowRight'])); },
    params: async () => { const k = pick(['fin', 'eb2', 'l0', 'l1', 'l2', 'l3', 'bor', 'dly', 'rev']); await S('x' + k + '.mute', rnd() < 0.3); await S('x' + k + '.solo', rnd() < 0.15); await S('x' + k + '.hi', Math.round(rnd() * 20 - 10)); await S('x' + k + '.sat', rnd() * 0.5); await S('x' + k + '.duck', rnd() * 0.6); await S('x' + k + '.wid', rnd() * 2); await S('mix.pulsVol', -12 + rnd() * 12); await S('mst.comp', rnd()); },
    layer: async () => { await pg.evaluate(() => { const L = ['dly', 'rev', 'duck', 'wid']; window.__MX.mxSetLayer(L[Math.floor(Math.random() * 4)]); }); },
    puls: async () => { await pg.evaluate(() => window.__MX.openPanel('puls')); await pg.waitForTimeout(1500); await pg.evaluate(() => { const s = document.querySelector('#sheetBody'); if (s) s.scrollTop = s.scrollHeight; }); await pg.waitForTimeout(1200); await pg.evaluate(() => window.__MX.openPanel('mix')); },
    legend: async () => { await pg.evaluate(() => window.__MX.mxLegend(true)); await pg.waitForTimeout(700); await pg.evaluate(() => window.__MX.mxLegend(false)); },
  };
  const names = Object.keys(actions), cnt = {}, fails = [];
  const t0 = Date.now(); let nextSnap = 30, win = 0;
  await pg.evaluate(() => { window.__MXT = []; });
  while ((Date.now() - t0) / 1000 < SECS) {
    const a = pick(names);
    cnt[a] = (cnt[a] || 0) + 1;
    const __t = Date.now(); try { await actions[a](); } catch (e) { fails.push(a + ': ' + e.message.split('\n')[0]); }
    await pg.waitForTimeout(400 + rnd() * 800); if (process.env.LTLOG) { const lt = await pg.evaluate(() => window.__LT.slice(-3)); const g = await pg.evaluate(() => Math.round(window.__GAP.max)); console.log("  ", a, Date.now() - __t, "ms", "lt", JSON.stringify(lt), "gapmax", g); await pg.evaluate(() => { window.__LT.length = 0; window.__GAP.max = 0; }); }
    const el = (Date.now() - t0) / 1000;
    if (el >= nextSnap) {
      nextSnap += 30; win++;
      const t = await pg.evaluate(() => { const t = window.__MXT; window.__MXT = []; return t; });
      const g = await pg.evaluate(() => { const g = Object.assign({}, window.__GAP); Object.assign(window.__GAP, { n: 0, g50: 0, g100: 0, max: 0 }); const lt = window.__LT.splice(0); return Object.assign(g, { lt: lt.length, ltMax: lt.length ? Math.max(...lt) : 0 }); });
      const m = await mem(); snaps.push({ t: Math.round(el), ...m });
      console.log(which, 't=' + Math.round(el) + 's', 'frame', JSON.stringify(L.stat(t)), 'raf', JSON.stringify({ n: g.n, g50: g.g50, g100: g.g100, max: Math.round(g.max), lt: g.lt, ltMax: g.ltMax }), 'mem', JSON.stringify(m), 'err', pg.errors.length);
    }
  }
  // settle: back to a clean state and measure once more
  await pg.evaluate(() => { const X = window.__MX; X.closeDetail(); X.mxSetView('pult'); for (const k of ['fin', 'eb2', 'l0', 'l1', 'l2', 'l3', 'bor', 'dly', 'rev']) { window.__M.setParam('x' + k + '.solo', false); window.__M.setParam('x' + k + '.mute', false); } });
  await pg.waitForTimeout(2000);
  const fin = await mem(); snaps.push({ t: 'end', ...fin });
  console.log(which, 'actions', JSON.stringify(cnt));
  console.log(which, 'action failures', fails.length, JSON.stringify(fails.slice(0, 8)));
  console.log(which, 'audio', JSON.stringify(await audio()));
  console.log(which, 'heap trail', snaps.map((s) => s.t + ':' + s.heapMB + 'MB/' + s.nodes + 'n/' + s.lis + 'l').join('  '));
  console.log(which, 'errors', pg.errors.length ? JSON.stringify(pg.errors.slice(0, 10)) : 'none');
  await ctx.close(); await b.close();
})();
