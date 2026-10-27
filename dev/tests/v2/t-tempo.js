// (owner, 27.10.2026: „eine zentrale BPM-Anzeige, dort auch änderbar“) the Taktgeber in the bar: shows the tempo with a
// tenth; drag, wheel, arrow keys (Shift: tenths), typed, TAP, ½× / 2× change it; its source (Puls, Schleife); its ring
// turns with the beat.                                                                                  node t-tempo.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const P = () => page.evaluate(() => window.__M.P['seq.bpm']);
  const txt = () => page.evaluate(() => document.querySelector('#tempo .tmp-n').textContent);
  const o = {};
  await page.evaluate(() => window.__M.setParam('seq.bpm', 100)); await page.waitForTimeout(100);
  o.show = await txt();
  const v = await page.$('#tempo .tmp-v'), b = await v.boundingBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy - 40, { steps: 8 }); await page.mouse.up();
  o.drag = await P();
  await page.mouse.move(cx, cy); await page.mouse.wheel(0, -100); await page.waitForTimeout(50); o.wheel = await P();
  await page.keyboard.down('Shift'); await page.mouse.wheel(0, -100); await page.keyboard.up('Shift'); await page.waitForTimeout(50); o.fine = await P();
  await v.focus(); await page.keyboard.press('ArrowDown'); o.key = await P();
  await page.dblclick('#tempo .tmp-v'); await page.waitForSelector('.tmp-in'); await page.fill('.tmp-in', '92,5'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  o.typed = await P(); o.typedShow = await txt();
  // a click opens the panel: 2× and ½×
  await page.click('#tempo .tmp-v'); await page.waitForSelector('.tmp-pop');
  await page.click('.tmp-pop button:has-text("2 ×")'); o.dbl = await P();
  await page.click('.tmp-pop button:has-text("½ ×")'); o.half = await P();
  await page.screenshot({ path: 'out/tempo-pop.png', clip: { x: 0, y: 0, width: 1600, height: 240 } });
  await page.mouse.click(10, 600); await page.waitForTimeout(100); o.closed = !(await page.$('.tmp-pop'));
  // TAP: four taps at 120 BPM
  await page.evaluate(() => new Promise((res) => { const t = document.querySelector('#tempo .tmp-tap'); let n = 0; const go = () => { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); if (++n < 4) setTimeout(go, 500); else setTimeout(res, 50); }; go(); }));   // (in the page: the test's own click latency would slow the taps)
  o.tap = await P();
  // the Puls running: its source, the ring turning
  o.src0 = await page.evaluate(() => document.querySelector('#tempo').dataset.src);
  await page.evaluate(() => window.__M.seqStart()); await page.waitForTimeout(700);
  o.src = await page.evaluate(() => document.querySelector('#tempo').dataset.src);
  const px = () => page.evaluate(() => { const c = document.querySelector('#tempo .tmp-ring'), d = c.getContext('2d').getImageData(0, 0, 64, 64).data; let h = 0; for (let i = 0; i < d.length; i += 37) h = (h * 31 + d[i]) | 0; return h; });
  const p1 = await px(); await page.waitForTimeout(260); const p2 = await px(); o.ringMoves = p1 !== p2;
  await page.screenshot({ path: 'out/tempo-bar.png', clip: { x: 0, y: 0, width: 1600, height: 70 } });
  await page.evaluate(() => window.__M.seqStop());
  console.log(JSON.stringify(o));
  ok(o.show === '100,0', `shown with a tenth: ${o.show}`);
  ok(o.drag >= 108 && o.drag <= 112, `dragged up 40 px: ${o.drag}`);
  ok(o.wheel === o.drag + 1 && Math.abs(o.fine - (o.wheel + 0.1)) < 1e-6 && Math.abs(o.key - (o.fine - 1)) < 1e-6, `wheel +1 (${o.wheel}), Shift +0,1 (${o.fine}), ↓ −1 (${o.key})`);
  ok(o.typed === 92.5 && o.typedShow === '92,5', `typed „92,5“: ${o.typed}`);
  ok(o.dbl === 185 && o.half === 92.5 && o.closed, `2× ${o.dbl}, ½× ${o.half}; the panel closes outside`);
  ok(Math.abs(o.tap - 120) <= 2, `TAP four times at 120: ${o.tap}`);
  ok(o.src === 'Puls' && o.ringMoves, `the Puls running: source „${o.src}“ (before: ${o.src0}), the ring turns with the beat`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
