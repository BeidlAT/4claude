// Shared parts of the performance harness: the viewports, CPU per thread from /proc, the scenarios a page is put in, and
// one measurement (a fresh browser per measurement, so builds and runs never share a process).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const HOST = 'http://127.0.0.1:8790/';
const TCK = 100;   // clock ticks per second (/proc stat utime + stime)
// d: a desktop window; a: an Android phone (Pixel-7-like: 412 × 915 CSS px at DPR 2.625, touch, a mobile UA – Myzel's
// MOBILE switches on (pointer: coarse): a phone's budget, oversampling and latency defaults)
const VPS = {
  d: { viewport: { width: 1280, height: 800 } },
  a: { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' },
};
// every thread of the browser started here, by process kind and thread name: ticks used so far
function snap(root) {
  const par = {};
  for (const p of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(p)) continue;
    try { const s = fs.readFileSync('/proc/' + p + '/stat', 'utf8'); par[p] = s.slice(s.lastIndexOf(')') + 2).split(' ')[1]; } catch (e) {}
  }
  const kids = new Set([String(root)]);
  for (let grew = true; grew;) { grew = false; for (const p in par) if (!kids.has(p) && kids.has(par[p])) { kids.add(p); grew = true; } }
  const m = {};
  for (const p of kids) {
    let pc = ''; try { pc = fs.readFileSync('/proc/' + p + '/cmdline', 'utf8'); } catch (e) { continue; }
    const kind = /--type=renderer/.test(pc) ? 'R' : /--type=gpu/.test(pc) ? 'G' : /--type=utility/.test(pc) ? 'U' : /chrom|headless/.test(pc) ? 'B' : 'N';
    if (kind === 'N') continue;   // (node itself)
    let ts = []; try { ts = fs.readdirSync('/proc/' + p + '/task'); } catch (e) { continue; }
    for (const t of ts) {
      try {
        const comm = t === p ? 'main' : fs.readFileSync('/proc/' + p + '/task/' + t + '/comm', 'utf8').trim().replace(/\d+$/, '#');
        const s = fs.readFileSync('/proc/' + p + '/task/' + t + '/stat', 'utf8'), r = s.slice(s.lastIndexOf(')') + 2).split(' ');
        const k = kind + ':' + comm; m[k] = (m[k] || 0) + (+r[11]) + (+r[12]);
      } catch (e) {}
    }
  }
  return m;
}
// CPU % of one core per thread group over secs
const GROUPS = {
  audio: (k) => /^R:(AudioOutputDevi|Realtime AudioW|AudioWorklet)/.test(k),   // the render thread(s): the device's, or the worklet's that it hands to
  conv: (k) => /^R:Reverb convolut/.test(k),   // Chromium's background thread for a convolver's long tail
  main: (k) => k === 'R:main',
  comp: (k) => /^R:(Compositor|CompositorTile)/.test(k),
  gpu: (k) => k.startsWith('G:'),
  total: () => true,
};
function groups(a, b, secs) {
  const o = {};
  for (const [g, f] of Object.entries(GROUPS)) { let x = 0; for (const k in b) if (f(k)) x += b[k] - (a[k] || 0); o[g] = +(x / TCK / secs * 100).toFixed(2); }
  return o;
}
function threads(a, b, secs) { const o = {}; for (const k in b) { const d = (b[k] - (a[k] || 0)) / TCK / secs * 100; if (d >= 0.3) o[k] = +d.toFixed(1); } return o; }
// the frame callbacks' own time (every requestAnimationFrame callback timed; counted from window.__raf.on)
const RAF_HOOK = () => {
  const R = (window.__raf = { on: false, n: 0, ms: 0, max: 0 });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => { const t0 = performance.now(); try { cb(ts); } finally { if (R.on) { const d = performance.now() - t0; R.n++; R.ms += d; if (d > R.max) R.max = d; } } });
};
// a 120-Hz display, emulated (this headless browser draws at 60): every real frame runs the page's frame callbacks twice,
// 8.3 ms apart in their timestamps – the page's own drawing work as on a 120-Hz phone (the compositing itself not doubled)
const RAF120 = () => {
  const raf = window.requestAnimationFrame.bind(window); let q = [], id = 0; const dead = new Set();
  const tick = (ts) => { for (const t of [ts - 8.333, ts]) { const c = q; q = []; for (const [i, f] of c) if (!dead.delete(i)) f(t); } raf(tick); };
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { dead.add(i); };
  raf(tick);
};
// the scenarios: what is set up after the sound starts, how long it settles, whether notes are played while measuring
const SC = {
  idle: { settle: 16, about: 'default patch, nothing played' },
  tiefsee: { settle: 6, pre: 'Tiefsee', about: 'Tiefsee (Nebel + Schale, Bordun on), nothing played' },
  regenwald: { settle: 6, pre: 'Regenwald', seq: true, about: 'Regenwald, the Puls running (an old preset)' },
  kompost: { settle: 6, pre: 'Kompostgarten', seq: true, about: 'Kompostgarten, the Puls running (new sources)' },
  play: { settle: 3, play: true, about: 'default patch, a phrase of held notes across the field' },
  after: { settle: 18, before: 8, about: 'default patch, 18 s after 8 s of playing: back to idle?' },
};
async function phrase(pg, vp, secs) {
  const box = await pg.evaluate(() => { const r = document.getElementById('cvFx').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const t0 = Date.now();
  for (let i = 0; Date.now() - t0 < secs * 1000; i++) {
    const x = box[0] + box[2] * (0.2 + 0.6 * ((i * 0.37) % 1)), y = box[1] + box[3] * (0.3 + 0.4 * ((i * 0.61) % 1));
    if (vp === 'a') { const c = await pg.context().newCDPSession(pg); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await pg.waitForTimeout(1200); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); }
    else { await pg.mouse.move(x, y); await pg.mouse.down(); await pg.waitForTimeout(1200); await pg.mouse.up(); }
    await pg.waitForTimeout(300);
  }
}
// one measurement: slot (built by v2/mk.sh, plain or -inst), scenario key, viewport key, window in seconds
async function measure(slot, sc, vp, secs = 10, o = {}) {
  const S = SC[sc];
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await b.newContext(VPS[vp]);
    if (o.hz120) await ctx.addInitScript(RAF120);
    await ctx.addInitScript(RAF_HOOK);
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await pg.goto(HOST + slot + '/index.html'); await pg.waitForTimeout(1200);
    await pg.click('#btnStart'); await pg.waitForTimeout(2000);
    // presets and the Puls through the instrumented build's exports, else through the UI's own calls (window.__M is absent
    // in a plain build: then the scenario needs an -inst slot)
    if (S.pre || S.seq) await pg.evaluate(([n, seq]) => { const M = window.__M; if (n) M.loadPreset(M.PRESETS.find((x) => x.name === n)); if (seq && !M.SEQ.on) M.seqStart(); }, [S.pre || '', !!S.seq]);
    if (o.setup) await pg.evaluate(o.setup);
    if (S.before) await phrase(pg, vp, S.before);
    await pg.waitForTimeout(S.settle * 1000);
    await pg.evaluate(() => { window.__raf.on = true; window.__raf.n = 0; window.__raf.ms = 0; window.__raf.max = 0; });
    const s0 = snap(process.pid), t0 = Date.now();
    if (S.play) await phrase(pg, vp, secs); else await pg.waitForTimeout(secs * 1000);
    const s1 = snap(process.pid), el = (Date.now() - t0) / 1000;
    const raf = await pg.evaluate(() => ({ n: window.__raf.n, ms: window.__raf.ms, max: window.__raf.max }));
    const st = await pg.evaluate(() => { const M = window.__M; if (!M || !M.A || !M.A.ctx) return {}; const a = M.A.ctx; return { sr: a.sampleRate, lat: M.P['dev.lat'], q: M.P['dev.q'], idle: M.IDLE ? M.IDLE.on : null }; });
    const g = groups(s0, s1, el);
    return Object.assign(g, { fps: +(raf.n / el).toFixed(1), rafMs: raf.n ? +(raf.ms / raf.n).toFixed(2) : 0, rafMax: +raf.max.toFixed(1), st, errs, thr: o.threads ? threads(s0, s1, el) : undefined });
  } finally { await b.close(); }
}
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
module.exports = { HOST, VPS, SC, snap, groups, threads, measure, median, phrase, RAF_HOOK, RAF120 };
