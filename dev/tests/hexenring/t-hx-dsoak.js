// A desktop soak (desktop report 24.10.2026: 8 short dropouts in 20 s with 6 loops playing): the desktop viewport, the
// guard held back (it must not mask anything), live notes by mouse all along; underruns polled every 10 ms (the browser's
// playoutStats), the AudioWorklet thread's own gaps (a probe processor's Date.now between quanta ≥ 10 ms), the render
// threads' CPU from /proc, and what happened around each underrun (graph links made and taken out, port messages, the main
// thread's heap falling). Two runs, the same length, alternating: A – live notes only; B – 8 loops, 6 playing, 4 of them
// Lebendig (their passes rendered in the Werk-Rahmen). The machine's own dropouts are A's; what the loops add is B − A.
//   SECS=120 [LAT=safe|std|min] node t-hx-dsoak.js     (slot hx; never beside another heavy test; not in run-all – a soak)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const H = require('./hx-h');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const SECS = +process.env.SECS || 120;
// CPU (ticks of 10 ms) per thread name of this process's browsers
function threads() {
  const out = {}, kids = (pid) => { let r = [pid]; try { for (const t of fs.readdirSync('/proc/' + pid + '/task')) { try { for (const c of fs.readFileSync('/proc/' + pid + '/task/' + t + '/children', 'utf8').trim().split(/\s+/).filter(Boolean)) r = r.concat(kids(c)); } catch (e) {} } } catch (e) {} return r; };
  for (const p of kids(String(process.pid))) { let ts = []; try { ts = fs.readdirSync('/proc/' + p + '/task'); } catch (e) { continue; } for (const t of ts) { try { const st = fs.readFileSync('/proc/' + p + '/task/' + t + '/stat', 'utf8'), c = st.slice(st.indexOf('(') + 1, st.lastIndexOf(')')), f = st.slice(st.lastIndexOf(')') + 2).split(' '); const k = c.replace(/\d+$/, ''); out[k] = (out[k] || 0) + (+f[11]) + (+f[12]); } catch (e) {} } }
  return out;
}
async function run(loops) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-experimental-web-platform-features', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); };
    const T = () => performance.timeOrigin + performance.now(), EV = (window.__ev = []); window.__evOn = false; window.__T = T;
    const log = (k) => { if (window.__evOn && EV.length < 200000) EV.push([T(), k]); };
    const C = AudioNode.prototype.connect, D = AudioNode.prototype.disconnect, PM = MessagePort.prototype.postMessage;
    AudioNode.prototype.connect = function (...a) { log('link'); return C.apply(this, a); };
    AudioNode.prototype.disconnect = function (...a) { log('unlink'); return D.apply(this, a); };
    MessagePort.prototype.postMessage = function (m, tr) { let k = 'msg'; try { k = 'msg:' + (m && typeof m === 'object' ? Object.keys(m)[0] : typeof m); } catch (e) {} log(k); return PM.call(this, m, tr); };
  });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(600);
  await page.evaluate((l) => window.__M.setParam('dev.lat', l), process.env.LAT || 'safe');   // (the report's context: „Sicher“, a 10-ms buffer; LAT=min for the smallest)
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(800);
  let info = {};
  if (loops) {
    info = await page.evaluate(async () => {
      const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), ENGS = ['glo', 'neb'];
      M.setParam('v.human', 0); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
      M.setParam('seq.bpm', 110); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart();
      await sl(700);
      const keys = [];
      for (let j = 0; j < 12 && keys.length < 8; j++) {
        const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
        const degs = [[0, 2, 4, 7], [4, 2, 1, 3], [7, 5, 4, 2], [0, 4, 7, 9]][j % 4];
        for (let r = 0; r < 2; r++) degs.forEach((d, i) => { const f = M.N.notes[Math.min(M.N.notes.length - 1, d + 7 * (j % 3))].f, t = t0 + (r * 4 + i) * beat; const v = M.playNote(ENGS[j % 2], t, f, 0.5, i ? 0.6 : 0.9, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), (t + beat * 0.6 - A.ctx.currentTime) * 1000); });
        while (A.ctx.currentTime < t0 + 8 * beat + 0.05) await sl(30);
        const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
        if (L) keys.push(L.key);
        await sl(300);
      }
      if (M.SEQ.on) M.seqStop();
      for (let i = 0; i < 100; i++) { let all = true; for (const k of keys) { const L = M.hxByKey(k); for (const id of L.sch) { const S = M.HX.sch.get(id); if (!(S && S.wn && S.aud)) { all = false; M.hxWNotesAll(L); } } } if (all) break; await sl(100); }
      keys.forEach((k, i) => { const L = M.hxByKey(k); if (i < 4) M.hxWSet(L, 'eig', 'lebendig'); if (i >= 6) M.hxState(L.id, 'angehalten', null); });
      await sl(15000);
      const live = M.hxLoopsLive();
      return { loops: live.length, spielt: live.filter((L) => L.state === 'spielt').length, leb: live.filter((L) => M.hxWLebt(L) && L.state === 'spielt').length };
    });
  }
  await page.evaluate(async () => {
    const M = window.__M, a = M.A.ctx;
    const probe = `class Q extends AudioWorkletProcessor { constructor() { super(); this.t = 0; this.g = []; this.n = 0; this.port.onmessage = () => this.port.postMessage({ g: this.g, n: this.n }); } process() { const t = Date.now(); if (this.t && t - this.t >= 10 && this.g.length < 5000) this.g.push([this.t, t - this.t]); this.t = t; this.n++; return true; } } registerProcessor('hx-qrt', Q);`;
    await a.audioWorklet.addModule(URL.createObjectURL(new Blob([probe], { type: 'text/javascript' })));
    const q = new AudioWorkletNode(a, 'hx-qrt'), z = a.createGain(); z.gain.value = 0; M.A.masterIn.connect(q); q.connect(z).connect(a.destination); window.__q = q;
    const ps = a.playbackStats || a.playoutStats, U = (window.__u = []), Hp = (window.__h = []);
    const cnt = () => (ps ? (ps.underrunEvents != null ? ps.underrunEvents : ps.fallbackFramesEvents) : 0);
    let last = cnt(), hl = performance.memory ? performance.memory.usedJSHeapSize : 0;
    window.__evOn = true; window.__t0 = window.__T();
    window.__pi = setInterval(() => { const u = cnt(); if (u > last) U.push([window.__T(), u - last]); last = u; const h = performance.memory ? performance.memory.usedJSHeapSize : 0; if (h < hl - 2e6) Hp.push([window.__T(), (hl - h) / 1e6]); hl = h; }, 10);
  });
  info.lat = await page.evaluate(() => [window.__M.A.ctx.baseLatency, window.__M.A.ctx.outputLatency, window.__M.A.latMode]);
  const box = await page.evaluate(() => { const r = document.getElementById('cvFx').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const th0 = threads(), w0 = Date.now(), tEnd = Date.now() + SECS * 1000;
  for (let i = 0; Date.now() < tEnd; i++) {
    const x = box[0] + box[2] * (0.15 + 0.08 * (i % 9)), y = box[1] + box[3] * (0.3 + 0.05 * (i % 5));
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up(); await page.waitForTimeout(250);
  }
  const th1 = threads(), dw = (Date.now() - w0) / 1000;
  const qg = await page.evaluate(() => new Promise((r) => { window.__q.port.onmessage = (e) => r(e.data); window.__q.port.postMessage(1); }));
  const R = await page.evaluate(() => { clearInterval(window.__pi); window.__evOn = false; const M = window.__M; return { t0: window.__t0, u: window.__u, h: window.__h, ev: window.__ev, wst: M.HX.wSt, vmax: M.A.voices.size }; });
  await browser.close();
  const cpu = (re) => Object.keys(th1).filter((k) => re.test(k)).reduce((s, k) => s + (th1[k] - (th0[k] || 0)), 0) / dw;
  const under = R.u.reduce((s, x) => s + x[1], 0), stalls = qg.g.filter((x) => x[0] >= R.t0);
  // around each underrun cluster (±50 ms): which kinds were there, against random instants
  const U = []; for (const [t] of R.u) if (!U.length || t - U[U.length - 1] > 100) U.push(t);
  const kinds = new Map(); for (const e of R.ev) { if (!kinds.has(e[1])) kinds.set(e[1], []); kinds.get(e[1]).push(e[0]); } kinds.set('gc', R.h.map((x) => x[0]));
  const near = (ts, t) => ts.some((x) => x >= t - 50 && x <= t + 50), tE = R.t0 + SECS * 1000, rnd = []; for (let i = 0; i < 3000; i++) rnd.push(R.t0 + Math.random() * (tE - R.t0));
  const corr = [...kinds].map(([k, ts]) => [k, U.length ? U.filter((t) => near(ts, t)).length / U.length : 0, rnd.filter((t) => near(ts, t)).length / rnd.length]).sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]));
  return { info, under, clusters: U.length, stalls: stalls.length, stallMax: Math.max(0, ...stalls.map((x) => x[1])), quanta: qg.n, audio: cpu(/^(Realtime AudioW|AudioWorklet)/), offline: cpu(/^Offline AudioW/), main: cpu(/^headless_shell/), corr, wst: R.wst, errors };
}
(async () => {
  const A1 = await run(false), B = await run(true);
  const f = (r) => `${r.under} underruns (${r.clusters} moments), worklet gaps ≥ 10 ms ${r.stalls} (longest ${r.stallMax} ms), audio thread ${r.audio.toFixed(0)} % of a core, offline renders ${r.offline.toFixed(0)} %, main ${r.main.toFixed(0)} %`;
  console.log('INFO A (live notes only, ' + JSON.stringify(A1.info.lat) + '): ' + f(A1));
  console.log('INFO B (' + JSON.stringify(B.info) + ', living passes begun ' + B.wst.n + '): ' + f(B));
  console.log('INFO B, kinds near the underruns (±50 ms) against random instants: ' + B.corr.slice(0, 8).map(([k, a, r]) => k + ' ' + Math.round(100 * a) + '/' + Math.round(100 * r) + '%').join(', '));
  ok(B.info.spielt === 6 && B.info.leb >= 3, `the scene: ${B.info.loops} loops, ${B.info.spielt} playing, ${B.info.leb} living`);
  // what the loops add, beyond this machine's own dropouts (A, measured the same way just before): no event kind of the
  // app's coincides with the underruns clearly more than with random instants
  const strong = B.corr.filter(([k, a, r]) => B.clusters >= 8 && a > 2 * r + 0.25);
  ok(!strong.length, `no event of the app coincides with the underruns (${strong.map(([k, a, r]) => k + ' ' + Math.round(100 * a) + '/' + Math.round(100 * r) + '%').join(', ') || 'none clearly'})`);
  if (B.under === 0) ok(true, `B: 0 underruns in ${SECS} s with 6 loops playing`);
  else console.log(`INFO B: ${B.under} underruns in ${SECS} s with 6 loops – this machine alone, with live notes and no loops: ${A1.under}`);
  ok(!A1.errors.length && !B.errors.length, `no error (${A1.errors.concat(B.errors).slice(0, 2).join(' | ')})`);
  process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exit(1); });
