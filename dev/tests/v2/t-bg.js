// (owner, 26.10.2026, iPad: „Myzel spielt weiter, obwohl geschlossen“) „Im Hintergrund weiterspielen“: off – hidden,
// the sound stops even while the Puls runs, and comes back when visible; on – the Puls plays on hidden; with nothing
// playing it stops either way.                                                                     node t-bg.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { let vis = 'visible'; Object.defineProperty(document, 'visibilityState', { get: () => vis, configurable: true }); window.__vis = (v) => { vis = v; document.dispatchEvent(new Event('visibilitychange')); }; });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    o.def = M.P['dev.bg'];   // (desktop Chromium: on)
    const cycle = async () => { window.__vis('hidden'); await sl(400); const h = A.ctx.state; window.__vis('visible'); await sl(400); return [h, A.ctx.state]; };
    M.seqStart(); await sl(300);
    M.setParam('dev.bg', false); o.offPuls = await cycle();
    M.setParam('dev.bg', true); o.onPuls = await cycle();
    M.seqStop(); await sl(300); o.onIdle = await cycle();
    o.ui = !!document.querySelector('#p-dev-bg') || [...document.querySelectorAll('label')].some((l) => /Im Hintergrund weiterspielen/.test(l.textContent));
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.def === true, 'desktop: plays on in the background by default');
  ok(r.offPuls[0] === 'suspended' && r.offPuls[1] === 'running', `off: hidden with the Puls running – silent (${r.offPuls[0]}), back – it plays (${r.offPuls[1]})`);
  ok(r.onPuls[0] === 'running', `on: the Puls plays on hidden (${r.onPuls[0]})`);
  ok(r.onIdle[0] === 'suspended' && r.onIdle[1] === 'running', `on, nothing playing: silent hidden (${r.onIdle.join(' → ')})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
