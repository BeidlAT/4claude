// Smoke test: boots Myzel in headless Chromium (phone viewport, touch), plays every engine,
// runs the sequencer, records, and saves through a fake `downloads` capability.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'out';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    window.__saved = [];
    const dl = { save: async ({ filename, data }) => {
      const buf = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      window.__saved.push({ filename, b64: btoa(s) });
      return { status: 'saved' };
    } };
    window.claude = { use: (n) => Promise.resolve(n === 'downloads' ? dl : null) };
  });
  await page.goto('http://127.0.0.1:8790/new/index.html');
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/01-start.png' });
  await page.click('#btnStart');
  await page.waitForTimeout(800);
  const box = await page.locator('#cvFx').boundingBox();
  const tap = async (x, y, holdMs = 150, moveTo) => {
    const cdp = await ctx.newCDPSession(page);
    const pt = (xx, yy) => [{ x: box.x + box.width * xx, y: box.y + box.height * (1 - yy), id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x, y) });
    if (moveTo) {
      for (let k = 1; k <= 10; k++) { await page.waitForTimeout(holdMs / 10); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x + (moveTo[0] - x) * k / 10, y + (moveTo[1] - y) * k / 10) }); }
    } else await page.waitForTimeout(holdMs);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  };
  // start recording
  await page.click('#btnRec');
  const engines = ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch'];
  const names = { neb: 'Nebel', kor: 'Körner', hau: 'Hauch', glo: 'Glocke', mem: 'Membran', sai: 'Saite', sch: 'Schale' };
  await page.click('#tab-klang');
  for (const e of engines) {
    await page.locator('#p-v-eng .chip', { hasText: names[e] }).click();
    console.log('eng', e, JSON.stringify(await page.evaluate(() => ({ iw: innerWidth, vv: visualViewport.scale, cv: document.getElementById('cvFx').width, st: document.getElementById('stage').getBoundingClientRect().width }))));
    try { await page.click('#btnClose', { timeout: 3000 }); } catch (err) { await page.screenshot({ path: OUT + '/fail.png' }); throw err; }
    await tap(0.3, 0.6, 700, [0.7, 0.4]);
    await page.waitForTimeout(500);
    await page.click('#tab-klang');
  }
  await page.click('#btnClose');
  await page.screenshot({ path: OUT + '/02-play.png' });
  // sequencer
  await page.click('#btnPuls');
  await page.waitForTimeout(2500);
  await page.click('#tab-puls');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/03-puls.png' });
  await page.click('#btnPuls');
  await page.click('#tab-fx'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/04-fx.png' });
  await page.click('#tab-presets'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/05-presets.png' });
  // freeze
  await page.click('#btnFreeze'); await page.waitForTimeout(800); await page.click('#btnFreeze');
  // stop rec
  await page.click('#btnRec');
  await page.waitForTimeout(400);
  await page.click('#tab-rec'); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/06-rec.png' });
  await page.locator('.take .btn.primary').first().click();
  await page.waitForFunction(() => window.__saved.length > 0, null, { timeout: 20000 });
  const saved = await page.evaluate(() => window.__saved);
  for (const s of saved) fs.writeFileSync(OUT + '/' + s.filename, Buffer.from(s.b64, 'base64'));
  // landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.click('#tab-klang'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/07-landscape.png' });
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(JSON.stringify({ saved: saved.map((s) => s.filename), errors, metrics }, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
