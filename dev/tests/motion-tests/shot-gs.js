// screenshots of part 6: the field raining (phone portrait and landscape, desktop), the Gestik card's Sporenregen and
// recipe, the mixer's Regen strip (Pult and Geflecht, phone)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://127.0.0.1:8790/gs-inst/index.html', out = __dirname + '/shots/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [name, vp] of [['phone', { width: 390, height: 844, m: 1 }], ['land', { width: 844, height: 390, m: 1 }], ['desk', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext(vp.m ? { viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.addInitScript(() => { let x = 77; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; });
    await page.goto(URL); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(300);
    await page.evaluate(async () => {
      const M = window.__M, s = (ms) => new Promise((r) => setTimeout(r, ms));
      M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum'));
      M.gkEnable(true); await s(300); M.gkSet('neigen', 'regen'); M.closePanel();
      const W = M.VIS.w, H = M.VIS.h;
      for (const [x, y] of [[0.18, 0.35], [0.38, 0.55], [0.52, 0.45], [0.7, 0.6], [0.86, 0.3]]) { const id = 'p' + x; M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * W, py: (1 - y) * H } }); await s(60); M.onUp({ pointerId: id, pointerType: 'touch' }); }
      M.GK.virt = { x: 0.7, y: -0.25 }; M.gkUpdate(performance.now(), []);
      await s(3500);
    });
    await page.screenshot({ path: out + 'gs-field-' + name + '.png' });
    if (name !== 'land') {
      await page.evaluate(async () => { const M = window.__M; M.openPanel('dev'); await new Promise((r) => setTimeout(r, 400)); const d = document.querySelector('.gk-rg'); d.open = true; M.gkCardSync(); document.querySelector('.gk-card .gk-set:nth-of-type(1)'); const c = document.querySelector('.gk-rg'); c.scrollIntoView({ block: 'start' }); });
      await page.waitForTimeout(400);
      await page.screenshot({ path: out + 'gs-card-' + name + '.png' });
      await page.evaluate(() => document.querySelector('.gk-rz').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(200);
      await page.screenshot({ path: out + 'gs-rez-' + name + '.png' });
      await page.evaluate(async () => { const M = window.__M; M.closePanel(); M.openPanel('mix'); });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: out + 'gs-mix-' + name + '.png' });
      await page.evaluate(() => { const g = [...document.querySelectorAll('button')].find((x) => /^geflecht$/i.test(x.textContent.trim())); if (g) g.click(); });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: out + 'gs-gefl-' + name + '.png' });
    }
    console.log(name, errs);
    await ctx.close();
  }
  await b.close();
})();
