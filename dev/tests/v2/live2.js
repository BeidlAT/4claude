const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.grantPermissions(['microphone'], { origin: 'http://127.0.0.1:8790' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1500);
  let r = await page.evaluate(() => ({ tex: Object.keys(window.__M.A.tex).sort(), ir: !!window.__M.A.revActive }));
  ok(r.ir && r.tex.join() === 'glas', 'start renders the reverb and only the chosen texture: ' + r.tex.join());
  await page.click('#tab-klang'); await page.click('#p-v-eng [data-val="kor"]');
  await page.click('#p-kor-src [data-val="voegel"]'); await page.waitForTimeout(1500);
  r = await page.evaluate(() => Object.keys(window.__M.A.tex).sort().join());
  ok(/voegel/.test(r), 'a chosen texture renders on demand: ' + r);
  // microphone follows the source through preset loads and undo
  await page.click('#p-kor-src [data-val="mikro"]');
  await page.waitForFunction(() => window.__M.MIC.on, null, { timeout: 5000 });
  await page.click('#tab-presets'); await page.click('.pcard >> nth=0'); await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ on: window.__M.MIC.on, src: window.__M.P['kor.src'] }));
  ok(!r.on && r.src !== 'mikro', 'loading a preset closes the microphone');
  await page.click('#toastAct').catch(() => {}); await page.waitForTimeout(1200);   // Rückgängig
  r = await page.evaluate(() => ({ on: window.__M.MIC.on, src: window.__M.P['kor.src'] }));
  ok(r.src === 'mikro' && r.on, 'undo back to the microphone opens it again: ' + JSON.stringify(r));
  // re-tapping the chosen chip opens a closed microphone
  await page.evaluate(() => window.__M.MIC && (window.__stop = 1));
  r = await page.evaluate(async () => { const M = window.__M; M.setParam('kor.src', 'glas'); M.setParam('kor.src', 'mikro'); for (let i = 0; i < 100 && !M.MIC.on; i++) await new Promise((r) => setTimeout(r, 30)); const a = M.MIC.on; M.setParam('kor.src', 'glas'); await new Promise((r) => setTimeout(r, 50)); return { a, b: M.MIC.on }; });
  ok(r.a && !r.b, 'switching away closes it at once');
  // a long WAV: only its head is decoded
  await page.click('#tab-klang');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#p-kor-src [data-val="datei"]')]);
  await chooser.setFiles('/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad/v2/src2/lang180.wav');
  await page.waitForFunction(() => window.__M.USERTEX.name === 'lang180', null, { timeout: 15000 });
  r = await page.evaluate(() => ({ dur: +window.__M.A.userTex.buf.duration.toFixed(2), ref: Math.round(window.__M.A.userTex.ref) }));
  ok(r.dur === 30 && Math.abs(r.ref - 220) < 3, 'a 3-minute, 31 MB WAV loads its first 30 s (pitch ' + r.ref + ' Hz)');
  ok(!errors.length, 'no errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
