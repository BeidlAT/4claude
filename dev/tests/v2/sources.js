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
  await page.click('#btnStart'); await page.waitForTimeout(500);
  const pickEng = async (k) => { await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="alle"]'); await page.click(`.kq-tile[data-k="${k}"] .kq-pick`); await page.click('.kq-done'); };   // (stage 1b: the chips became the row + library)
  await page.click('#tab-klang'); await pickEng('kor'); await page.waitForTimeout(200);
  // own file via the picker
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#p-kor-src [data-val="datei"]')]);
  await chooser.setFiles('/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad/v2/src2/ton330.wav');
  await page.waitForFunction(() => !!window.__M.A.userTex, null, { timeout: 5000 });
  let r = await page.evaluate(() => { const M = window.__M, t = M.A.userTex; return { dur: +t.buf.duration.toFixed(2), ref: Math.round(t.ref), src: M.P['kor.src'], ui: document.querySelector('#sheetBody').innerText.match(/Geladen:[^\n]*/)?.[0], same: M.korSource() === t }; });
  ok(r.src === 'datei' && r.dur === 1.5 && Math.abs(r.ref - 330) < 4 && r.same, 'file loaded: ' + JSON.stringify(r));
  // grains really play from it
  r = await page.evaluate(async () => { const M = window.__M, n = M.noteAt(0.5); const v = M.playNote('kor', M.A.ctx.currentTime, n.f, 0.5, 0.8, {}); M.grainTick(M.A.ctx.currentTime + 0.3); const g = M.A.grains; await new Promise((r) => setTimeout(r, 400)); v.release(); return { buf: v.kor.buf === M.A.userTex.buf, grains: g }; });
  ok(r.buf && r.grains > 0, 'grains read the file');
  // survives a reload (IndexedDB)
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(500);
  await page.click('#btnStart'); await page.waitForTimeout(800);
  r = await page.evaluate(() => ({ has: !!window.__M.A.userTex, name: window.__M.USERTEX.name, src: window.__M.P['kor.src'] }));
  ok(r.has && r.name === 'ton330' && r.src === 'datei', 'file restored after reload');
  // microphone (fake device)
  await page.click('#tab-klang'); await page.click('#p-kor-src [data-val="mikro"]');
  await page.waitForFunction(() => window.__M.MIC.on, null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => { const M = window.__M, s = M.korSource(); return { on: M.MIC.on, fill: +(M.MIC.fill / M.A.ctx.sampleRate).toFixed(1), buf: !!(s && s.buf), dur: s && +s.buf.duration.toFixed(1) }; });
  ok(r.on && r.buf && r.fill >= 1, 'microphone feeds the grains: ' + JSON.stringify(r));
  await page.click('#p-kor-src [data-val="glas"]'); await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ on: window.__M.MIC.on }));
  ok(!r.on, 'leaving the microphone source turns it off');
  // a take as grain material
  r = await page.evaluate(async () => {
    const M = window.__M; M.recToggle(); await new Promise((r) => setTimeout(r, 900)); const n = M.noteAt(0.4); M.playNote('glo', M.A.ctx.currentTime, n.f, 0.5, 0.9, {}); await new Promise((r) => setTimeout(r, 900)); M.recToggle();
    while (M.CAP.state !== 'idle' || M.CAP.finishing) await new Promise((r) => setTimeout(r, 50));
    return M.takes.length;
  });
  await page.click('#tab-rec'); await page.waitForTimeout(200);
  await page.click('text=Als Körner-Quelle');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ name: window.__M.USERTEX.name, src: window.__M.P['kor.src'] }));
  ok(/Aufnahme/.test(r.name) && r.src === 'datei', 'a take becomes the grain source: ' + r.name);
  ok(!errors.length, 'no errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
