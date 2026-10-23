// The owner's phone report (23.10.2026: „Am Handy ist die App am Anschlag … zwischen den 3 Qualitätsstufen merke ich
// keinen Unterschied … Sound wird nicht flüssig wiedergegeben, alles laggy“), emulated: an Android phone with a 120-Hz
// display (RAF120), DPR 2.75, touch playing across the field, the main thread slowed by CDP (--thr, default 4×) and – as
// root – the render threads in a cgroup with a share of a core (--slow <percent>; the phone report's method, t-hx-phone
// part 8). Per run: CPU per thread group (/proc), the page's frames (every frame callback's interval: late = over 1.5 ×
// the median), long tasks, a touch's wait for the main thread (pointerdown's timeStamp → its handler), the tick's gaps,
// the device's underruns (playoutStats, Chromium's experimental figures) and the audio clock's speed; a build with
// „Leistung messen“ (LM) adds its own report – the main thread's time per part.
//   node phone.js [--thr 4] [--slow 30] [--q 1,2,3] [--handy aus,auto] [--runs 1] [--secs 20] [--json out.json] <slot>…
// Builds and settings alternate run by run (this machine's load drifts). Slots are -inst builds (sh ../v2/mk.sh …).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const { execSync } = require('child_process');
const L = require('./lib.js');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const THR = +arg('thr', 4), SLOW = +arg('slow', 0), QS = arg('q', '1').split(','), HANDY = arg('handy', 'auto').split(','), RUNS = +arg('runs', 1), SECS = +arg('secs', 20), JSONF = arg('json', '');
const flags = new Set(['thr', 'slow', 'q', 'handy', 'runs', 'secs', 'json']);
const SLOTS = process.argv.slice(2).filter((x, i, a) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && flags.has(a[i - 1].slice(2))));
const PHONE = Object.assign({}, L.VPS.a, { deviceScaleFactor: 2.75 });
// the page's own figures, for any build: frame intervals, long tasks, a touch's wait, the tick's gaps
const PROBE = () => {
  const W = (window.__ph = { on: false, raf: [], lt: 0, ltMs: 0, tq: [] });
  const raf = window.requestAnimationFrame.bind(window); let prev = 0;
  const loop = (ts) => { if (W.on && prev) W.raf.push(ts - prev); prev = ts; raf(loop); }; raf(loop);
  try { new PerformanceObserver((l) => { if (W.on) for (const e of l.getEntries()) { W.lt++; W.ltMs += e.duration; } }).observe({ type: 'longtask' }); } catch (e) {}
  window.addEventListener('pointerdown', (e) => { if (W.on && e.timeStamp > 0) W.tq.push(performance.now() - e.timeStamp); }, true);
};
const CG = '/sys/fs/cgroup/cpu/phslow';
function slowCore(pct) {
  try { fs.mkdirSync(CG, { recursive: true }); fs.writeFileSync(CG + '/cpu.cfs_period_us', '4000'); fs.writeFileSync(CG + '/cpu.cfs_quota_us', String(Math.round(40 * pct))); } catch (e) { return -1; }
  let moved = 0;
  for (const p of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(p)) continue;
    let ts = []; try { ts = fs.readdirSync('/proc/' + p + '/task'); } catch (e) { continue; }
    for (const t of ts) { let c = ''; try { c = fs.readFileSync('/proc/' + p + '/task/' + t + '/comm', 'utf8').trim(); } catch (e) {} if (/^(Realtime AudioW|AudioWorklet|AudioOutputDevi)/.test(c)) { try { execSync('chrt -o -p 0 ' + t + ' 2>/dev/null'); fs.writeFileSync(CG + '/tasks', t); moved++; } catch (e) {} } }
  }
  return moved;
}
const q = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
async function run(slot, qv, handy) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-experimental-web-platform-features'] });
  try {
    const ctx = await b.newContext(PHONE);
    await ctx.addInitScript(L.RAF120);
    await ctx.addInitScript(PROBE);
    // (--handy: aus, auto (an on this phone), an; the profile's parts alone, for their savings: dpr – the field's
    // resolution only, never 30 frames; fps30 – 30 frames always, the resolution as without it)
    await ctx.addInitScript((h) => { try { if (h === 'auto' || h === 'dpr') localStorage.removeItem('myzel.handy'); else localStorage.setItem('myzel.handy', h === 'fps30' ? 'aus' : h); } catch (e) {} }, handy);
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
    await pg.goto(L.HOST + slot + '/index.html'); await pg.waitForTimeout(1200);
    await pg.click('#btnStart'); await pg.waitForTimeout(1500);
    await pg.evaluate((qv) => window.__M.setParam('dev.q', qv), qv);
    if (handy === 'dpr' || handy === 'fps30') await pg.evaluate((h) => { const M = window.__M, PH = M.PH; clearInterval(PH.timer); PH.timer = 0; PH.load = h === 'fps30'; }, handy);
    await pg.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(pg);
    if (THR > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR });
    const moved = SLOW ? slowCore(SLOW) : 0;
    await pg.waitForTimeout(1000);
    const st0 = await pg.evaluate(() => { const M = window.__M, s = M.A.ctx.playoutStats; window.__ph.on = true; if (M.lmStart) M.lmStart(); return { fb: s ? s.fallbackFramesEvents : null, t: M.A.ctx.currentTime, p: performance.now() }; });
    const s0 = L.snap(process.pid), t0 = Date.now();
    await L.phrase(pg, 'a', SECS - 0.5);
    while (Date.now() - t0 < SECS * 1000 + 300) await pg.waitForTimeout(100);
    const s1 = L.snap(process.pid), el = (Date.now() - t0) / 1000;
    const r = await pg.evaluate(() => { const M = window.__M, s = M.A.ctx.playoutStats, W = window.__ph; W.on = false; return { fb: s ? s.fallbackFramesEvents : null, t: M.A.ctx.currentTime, p: performance.now(), raf: W.raf, lt: W.lt, ltMs: W.ltMs, tq: W.tq, lm: M.LM && M.LM.res ? { res: M.LM.res, txt: M.LM.txt } : null, ph: M.PH ? { on: M.PH.on, dpr: M.VIS.dpr } : null, vb: M.VBUDGET, q: M.P['dev.q'] }; });
    if (THR > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const g = L.groups(s0, s1, el), med = q(r.raf, 0.5);
    return { slot, q: r.q, handy, ph: r.ph, main: g.main, audio: g.audio, gpu: g.gpu, comp: g.comp, moved,
      hz: med ? Math.round(1000 / med) : 0, late: r.raf.length ? +(100 * r.raf.filter((d) => d > 1.5 * med).length / r.raf.length).toFixed(1) : 0,
      draw: r.lm ? r.lm.res.draw.fps : null, lt: r.lt, ltMs: Math.round(r.ltMs), tq50: +q(r.tq, 0.5).toFixed(1), tq95: +q(r.tq, 0.95).toFixed(1), taps: r.tq.length,
      under: r.fb != null && st0.fb != null ? r.fb - st0.fb : null, speed: +((r.t - st0.t) / ((r.p - st0.p) / 1000)).toFixed(4),
      ton: r.lm && r.lm.res.touch ? r.lm.res.touch.ton : null, tonP95: r.lm && r.lm.res.touch ? r.lm.res.touch.tonP95 : null, parts: r.lm ? r.lm.res.parts : null, tick: r.lm ? r.lm.res.tick : null, errs };
  } finally { await b.close(); }
}
(async () => {
  if (!SLOTS.length) { console.log('usage: node phone.js [--thr 4] [--slow 30] [--q 1,2,3] [--handy aus,auto] [--runs 1] <slot>…'); return; }
  console.log(`== phone emulation: 412×915 @2.75, 120 Hz, touch; main thread ${THR}× slower${SLOW ? ', render threads ' + SLOW + ' % of a core (cgroup)' : ''}; ${SECS} s per run`);
  const out = [];
  for (let k = 0; k < RUNS; k++) for (const qv of QS) for (const slot of SLOTS) for (const hd of HANDY) {
    const r = await run(slot, qv, hd); out.push(r);
    console.log(`${slot.padEnd(10)} q${r.q} handy=${hd.padEnd(4)}${r.ph ? (r.ph.on ? '(an,dpr ' + r.ph.dpr + ')' : '(aus)') : ''}  main ${r.main}  audio ${r.audio}  gpu ${r.gpu} | ${r.hz} Hz late ${r.late}%  draw ${r.draw}  longtasks ${r.lt} (${r.ltMs} ms)  touch wait ${r.tq50}/${r.tq95} ms (${r.taps})${r.ton != null ? '  touch→sound ' + r.ton + '/' + r.tonP95 + ' ms' : ''} | underruns ${r.under}  clock ×${r.speed}${SLOW ? ' (' + r.moved + ' threads slowed)' : ''}${r.errs.length ? '  ERR ' + r.errs[0] : ''}`);
    if (r.parts) console.log('           main ms/s: ' + Object.entries(r.parts).filter(([, v]) => v >= 0.5).map(([k, v]) => k + ' ' + v).join(', ') + (r.tick ? ' · tick gaps p95 ' + r.tick.gapP95 + ' max ' + r.tick.gapMax + ' ms' : ''));
    if (JSONF) fs.writeFileSync(JSONF, JSON.stringify(out, null, 1));
  }
})().catch((e) => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; });
