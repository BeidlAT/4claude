// The guard's rules per device class (desktop report 24.10.2026: on a computer the old last step had cut the live budget
// six times to 26 % and set A.lite for the rest of the session). The device's underrun counter is faked (playbackStats on
// the context, raised by the test), watchUnderruns started from a known state; everything else is the app's own.
//   1. a computer, no loops: lasting underruns give a voice limit (budget × 0.8, at most every 5 s, never under half),
//      never A.lite; 30 s quiet → the budget a step back up, then the next, to the full budget; said once
//   2. a computer, loops playing (one Lebendig): Lebendig holds first, Taumeln rests next, never A.lite, the live budget
//      only after the loops' steps; after the quiet span Taumeln is back by itself and Lebendig lives again
//   3. an iPad: as a computer (a voice limit, never A.lite)
//   4. a phone, no loops: the old step (budget × 0.8 and A.lite) – unchanged –, and the budget comes back after 30 s quiet
//   node t-hx-guard.js        (slot hx: sh ../v2/mk.sh /home/user/4claude/myzel hx – run-all.sh builds it)
//   PARTS=1,4 node t-hx-guard.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const H = require('./hx-h');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const PARTS = (process.env.PARTS || '1,2,3,4').split(',');
const DESK = { viewport: { width: 1280, height: 800 } };
const IPAD = { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const PHONE = { viewport: { width: 412, height: 915 }, screen: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' };
let browser = null;
async function open(dev) {
  if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript(() => {
    // the device's figures, raised by the test; the app's own guard timer held back until the test starts it
    window.__fu = { underrunEvents: 0, underrunDuration: 0 };
    Object.defineProperty(BaseAudioContext.prototype, 'playbackStats', { configurable: true, get() { return window.__fu; } });
    const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f)) && !window.__guardOk) return 0; return si.call(this, f, ms, ...a); };
  });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(500);
  if (dev.hasTouch) await page.tap('#btnStart'); else await page.click('#btnStart');
  await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(800);
  await page.waitForTimeout(2500); await page.waitForFunction(() => !window.__M.CAL.running, null, { timeout: 20000 });   // (the device's own calibration first)
  // a known quality: level 3 with a fixed calibration (the budget the device would have)
  await page.evaluate(() => { const M = window.__M; M.CAL.unit = 0.0045; M.setParam('dev.q', '3'); M.applyQuality(); });
  return { page, ctx, errors };
}
const guardOn = (P) => P.page.evaluate(() => { window.__guardOk = true; window.__gT = performance.now(); window.__M.watchUnderruns(); });
const st = (P) => P.page.evaluate(() => { const M = window.__M; return { vb: M.vbudget(), sc: M.A.budgetScale || 1, lite: !!M.A.lite, tau: !!M.HX.tauRest, log: (M.HX.gLog || []).filter((e) => e.t >= window.__gT).map((e) => e.step + (e.v !== '' ? ':' + e.v : '')), toasts: [...document.querySelectorAll('.toast, #toast')].map((x) => x.textContent).join(' | ') }; });
// underruns: one more each second for s seconds
async function drop(P, s) { for (let i = 0; i < s; i++) { await P.page.evaluate(() => { window.__fu.underrunEvents++; window.__fu.underrunDuration += 0.012; }); await P.page.waitForTimeout(1000); } }
async function mkLoops(P, n, nl) {
  return P.page.evaluate(async ({ n, nl }) => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), ENGS = ['glo', 'neb'];
    M.setParam('v.human', 0); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    M.setParam('seq.bpm', 120); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart();
    await sl(700);
    const keys = [];
    for (let j = 0; j < n; j++) {
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      [0, 2, 4, 7].forEach((d, i) => { const f = M.N.notes[Math.min(M.N.notes.length - 1, d + 7 * j)].f, t = t0 + i * beat; const v = M.playNote(ENGS[j % 2], t, f, 0.5, 0.8, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), (t + beat * 0.6 - A.ctx.currentTime) * 1000); });
      while (A.ctx.currentTime < t0 + 4 * beat + 0.05) await sl(30);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      if (L) keys.push(L.key);
      await sl(300);
    }
    if (M.SEQ.on) M.seqStop();
    for (let i = 0; i < 100; i++) { let all = true; for (const k of keys) { const L = M.hxByKey(k); for (const id of L.sch) { const S = M.HX.sch.get(id); if (!(S && S.wn && S.aud)) { all = false; M.hxWNotesAll(L); } } } if (all) break; await sl(100); }
    for (let i = 0; i < nl && i < keys.length; i++) M.hxWSet(M.hxByKey(keys[i]), 'eig', 'lebendig');
    return keys;
  }, { n, nl });
}
(async () => {
  if (PARTS.includes('1')) {
    // ---- 1. a computer, no loops ----
    const P = await open(DESK);
    const s0 = await st(P);
    await guardOn(P);
    await drop(P, 14);
    const s1 = await st(P);
    ok(!s1.lite && s1.sc < 1 && s1.sc >= 0.5 && s1.log.every((x) => /^stimmen/.test(x)) && s1.log.length >= 2 && s1.log.length <= 3, `1. a computer, 14 s of underruns, no loops: a voice limit in steps at most every 5 s (${s1.log.join(' → ')}; budget ${s0.vb} → ${s1.vb}, scale ${s1.sc.toFixed(2)}), A.lite ${s1.lite}`);
    ok(/weniger Stimmen gleichzeitig/.test(s1.toasts), `1.   said once: „${(s1.toasts.match(/Das Gerät kam an seine Grenze[^|]*/) || [''])[0].slice(0, 70)}…“`);
    await drop(P, 1);   // (one more: the 5-s rule)
    await P.page.waitForTimeout(31500);
    const s2 = await st(P);
    ok(s2.sc > s1.sc - 1e-9 && s2.log.filter((x) => /^mehr/.test(x)).length === 1, `1.   30 s quiet: a step back up (scale ${s2.sc.toFixed(2)}, budget ${s2.vb}; ${s2.log.slice(-2).join(' → ')})`);
    await P.page.waitForTimeout(30500 * Math.max(0, Math.ceil(Math.log(1 / s2.sc) / Math.log(1.25))));
    const s3 = await st(P);
    ok(s3.sc === 1 && s3.vb === s0.vb && !s3.lite, `1.   and on, a step each 30 s, to the full budget (${s0.vb} → ${s3.vb}, scale ${s3.sc}; ${s3.log.join(' → ')})`);
    ok(!P.errors.length, `1. no error (${P.errors.slice(0, 2).join(' | ')})`);
    await P.ctx.close();
  }
  if (PARTS.includes('2')) {
    // ---- 2. a computer, two loops playing, one Lebendig ----
    const P = await open(DESK);
    const keys = await mkLoops(P, 2, 1);
    await P.page.evaluate(() => window.__M.setParam('mov.drift', 0.5));
    await P.page.waitForFunction(() => [...window.__M.HX.sch.values()].some((S) => S.wLive) && window.__M.HX.wJobs > 0, null, { timeout: 30000 }).catch(() => {});
    const s0 = await st(P);
    await guardOn(P);
    await drop(P, 16);
    const s1 = await st(P);
    const w1 = await P.page.evaluate((k) => window.__M.hxWWord(window.__M.hxByKey(k)), keys[0]);
    const iT = s1.log.indexOf('taumeln'), iV = s1.log.findIndex((x) => /^stimmen/.test(x));
    ok(s1.log[0] === 'lebendig:30' && iT > 0 && (iV < 0 || iV > iT) && !s1.lite && !s1.log.some((x) => /^lite/.test(x)), `2. a computer, two loops (one Lebendig), 16 s of underruns: Lebendig holds first, then Taumeln rests, a voice limit only after them (${s1.log.join(' → ')}); the live budget ${s0.vb} → ${s1.vb}, A.lite ${s1.lite}`);
    ok(/letzten Durchgang – das Gerät ist ausgelastet/.test(w1), `2.   the card: „${w1}“`);
    await P.page.waitForTimeout(31500);
    const s2 = await st(P);
    const w2 = await P.page.evaluate((k) => ({ w: window.__M.hxWWord(window.__M.hxByKey(k)), leb: window.__M.hxWLebt(window.__M.hxByKey(k)) }), keys[0]);
    ok(!s2.tau && s2.log.includes('taumelt') && s2.log.includes('zurueck') && w2.leb && !s2.lite, `2.   30 s quiet: Taumeln back by itself, Lebendig lives again (${s2.log.join(' → ')}; „${w2.w}“), A.lite ${s2.lite}`);
    ok(!P.errors.length, `2. no error (${P.errors.slice(0, 2).join(' | ')})`);
    await P.ctx.close();
  }
  if (PARTS.includes('3')) {
    // ---- 3. an iPad: as a computer ----
    const P = await open(IPAD);
    const d = await P.page.evaluate(() => ({ m: window.__M.MOBILE, t: window.__M.HX_TABLET }));
    await guardOn(P); await drop(P, 8);
    const s1 = await st(P);
    ok(d.m && d.t && !s1.lite && s1.sc < 1 && s1.log.every((x) => /^stimmen/.test(x)), `3. an iPad (mobile ${d.m}, tablet ${d.t}): a voice limit (${s1.log.join(' → ')}, scale ${s1.sc.toFixed(2)}), A.lite ${s1.lite}`);
    await P.ctx.close();
  }
  if (PARTS.includes('4')) {
    // ---- 4. a phone, no loops: the old step, and the budget back after the quiet ----
    const P = await open(PHONE);
    const s0 = await st(P);
    await guardOn(P); await drop(P, 3);
    const s1 = await st(P);
    ok(s1.lite && s1.log.length === 3 && s1.log.every((x) => /^lite/.test(x)) && Math.abs(s1.sc - 0.512) < 1e-6, `4. a phone, 3 s of underruns, no loops: the old step each second (${s1.log.join(' → ')}; budget ${s0.vb} → ${s1.vb}, A.lite ${s1.lite})`);
    await P.page.waitForTimeout(31500);
    const s2 = await st(P);
    ok(Math.abs(s2.sc - 0.64) < 1e-6 && s2.log[s2.log.length - 1] === 'mehr:' + s2.vb && s2.lite, `4.   30 s quiet: the budget a step back up (scale ${s2.sc.toFixed(2)}, budget ${s2.vb}); A.lite stays on the phone (${s2.lite})`);
    ok(!P.errors.length, `4. no error (${P.errors.slice(0, 2).join(' | ')})`);
    await P.ctx.close();
  }
  await browser.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); try { await browser.close(); } catch (x) {} process.exit(1); });
