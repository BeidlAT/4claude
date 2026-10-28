// (owner, 28.10.2026, iPad: „wenn ich die klangquelle während eines schleifen-spiels ändere, ertönt kurz der sound der
// neuen klangquelle … obwohl die app beendet wurde, spielt der sound weiter … akkuschonender, ohne an soundqualität und
// funktionalität einzubüßen … fürs ipad extra, ohne dass die pc version berührt wird“) – as an iPad (its user agent,
// touch): Hintergrund off and Akku schonen on by default; hidden, closed or frozen it falls silent (Puls and a loop
// running), back it plays; the field draws at 30 frames a second without a hand, at 60 with one; a new source makes no
// probe sound while something plays; on a computer nothing of this changes.   node t-ipad.js   (Chromium; Safari not here)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const IPAD = { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
async function open(browser, o) {
  const ctx = await browser.newContext(o), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { let vis = 'visible'; Object.defineProperty(document, 'visibilityState', { get: () => vis, configurable: true }); window.__vis = (v) => { vis = v; document.dispatchEvent(new Event('visibilitychange')); }; });
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(600);
  await H.tools(page); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(800);
  return { page, errors };
}
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await open(browser, IPAD);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    o.def = [M.P['dev.bg'], M.P['dev.akku']];
    await window.__reset(); window.__grid(110); await sl(300);
    // a loop playing, the Puls running
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 7, 4], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null); await sl(3000); M.HX.chips = null;
    o.loop = M.hxLoopsLive().some((L) => L.state === 'spielt'); o.puls = M.SEQ.on;
    const cyc = async (how) => { how(); await sl(400); const s = A.ctx.state; window.__vis('visible'); await sl(500); return [s, A.ctx.state]; };
    o.hide = await cyc(() => window.__vis('hidden'));
    o.pagehide = await cyc(() => { window.__vis('hidden'); window.dispatchEvent(new Event('pagehide')); });
    o.freeze = await cyc(() => document.dispatchEvent(new Event('freeze')));
    // a new source while the loop plays: no probe (the voices that start)
    const T = M.kqTarget('v.eng'), cnt = () => A.voices.size;
    await sl(200); const v0 = cnt(); M.kqChoose(T, M.P['v.eng'] === 'glo' ? 'mem' : 'glo', 'pick'); await sl(30); o.probeLoud = cnt() - v0;
    // the drawing: frames drawn a second, without a hand and with one
    const rate = async (hand) => { const t0 = M.VIS.t; let n = 0, last = M.VIS.t; const end = performance.now() + 2000; while (performance.now() < end) { if (hand) document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })); await new Promise((r) => requestAnimationFrame(r)); if (M.VIS.t !== last) { n++; last = M.VIS.t; } } return Math.round(n / 2); };
    await sl(1800); o.fpsIdle = await rate(false); o.fpsHand = await rate(true);
    // nothing sounding: a probe again
    for (const L of M.hxLoopsLive()) M.hxDelete(L); M.seqStop(); await sl(600);
    const v1 = cnt(); M.kqChoose(T, M.P['v.eng'] === 'glo' ? 'mem' : 'glo', 'pick'); await sl(30); o.probeQuiet = cnt() - v1;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.def[0] === false && r.def[1] === true, `iPad: „Im Hintergrund weiterspielen“ off, „Akku schonen“ on (${r.def})`);
  ok(r.loop && r.puls && r.hide[0] === 'suspended' && r.hide[1] === 'running', `hidden with a loop and the Puls running: silent (${r.hide[0]}), back: it plays (${r.hide[1]})`);
  ok(r.pagehide[0] === 'suspended' && r.freeze[0] === 'suspended' && r.freeze[1] === 'running', `closed (pagehide) or frozen: silent (${r.pagehide[0]}, ${r.freeze[0]})`);
  ok(r.probeLoud === 0 && r.probeQuiet > 0, `a new source while a loop plays: no probe (${r.probeLoud} voices); in a silence its probe (${r.probeQuiet})`);
  ok(r.fpsIdle >= 25 && r.fpsIdle <= 34 && r.fpsHand >= 50, `the field draws ${r.fpsIdle} frames a second without a hand, ${r.fpsHand} with one`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  // a computer: unchanged
  const pc = await open(browser, { viewport: { width: 1440, height: 900 } });
  const q = await pc.page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep; await sl(1800);
    let n = 0, last = M.VIS.t; const end = performance.now() + 2000; while (performance.now() < end) { await new Promise((r) => requestAnimationFrame(r)); if (M.VIS.t !== last) { n++; last = M.VIS.t; } }
    M.seqStart(); await sl(300); window.__vis('hidden'); await sl(400); const s = M.A.ctx.state; window.__vis('visible');
    return { def: [M.P['dev.bg'], M.P['dev.akku']], fps: Math.round(n / 2), hiddenPuls: s };
  });
  console.log(JSON.stringify(q));
  ok(q.def[0] === true && q.def[1] === false && q.fps >= 50 && q.hiddenPuls === 'running', `computer: as before – background on, Akku schonen off, ${q.fps} frames a second, the Puls plays on hidden`);
  ok(!pc.errors.length, 'computer: no page errors ' + pc.errors.slice(0, 3).join(' | '));
  H.summary(); await browser.close(); process.exit(0);
})();
