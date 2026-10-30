// Own presets saved again (owner, 30.10.2026: „eigene Presets überschreiben – noch einmal speichern bei Änderungen, die
// einem gefallen“): save one, change the sound, „Überschreiben“ in its row (one tap for the loaded one) and Strg+S write
// the sound of now over it; the loaded one is marked in the list; another one asks once.      node t-presets-own.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1000);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {}, NM = 'Testklang ' + Date.now();
    const own = () => M.userPresets().find((p) => p.name === NM);
    M.openPanel('presets'); await sl(400);
    M.setParam('rev.mix', 0.21); M.saveUserPreset(NM); await sl(300);
    o.saved = own() && own().v['rev.mix']; o.cur = M.UI.upr && M.UI.upr.name === NM;
    const row = () => [...document.querySelectorAll('.urow')].find((x) => x.textContent.includes(NM));
    o.rowCur = row() && row().classList.contains('cur') && /geladen/.test(row().textContent);
    // change, overwrite by the row's button (one tap: it is the loaded one)
    M.setParam('rev.mix', 0.44); const b = [...row().querySelectorAll('button')].find((x) => x.textContent === 'Überschreiben'); o.primary = b && b.classList.contains('primary'); b.click(); await sl(300);
    o.over = own().v['rev.mix'];
    // Strg+S
    M.setParam('rev.mix', 0.63); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })); await sl(300);
    o.ctrlS = own().v['rev.mix'];
    // another own preset: its button asks first
    M.saveUserPreset(NM + ' b', { quiet: true }); M.loadPreset(own(), true); await sl(300);
    const rowB = [...document.querySelectorAll('.urow')].find((x) => x.textContent.includes(NM + ' b')), bb = rowB && [...rowB.querySelectorAll('button')].find((x) => /Überschreiben|Wirklich/.test(x.textContent));
    bb.click(); await sl(100); o.ask = bb.textContent; const vB0 = M.userPresets().find((p) => p.name === NM + ' b').v['rev.mix']; M.setParam('rev.mix', 0.05); bb.click(); await sl(300);
    o.askThen = { before: vB0, after: M.userPresets().find((p) => p.name === NM + ' b').v['rev.mix'] };
    // tidy up
    M.setUserPresets(M.userPresets().filter((p) => !p.name.startsWith(NM))); M.setParam('rev.mix', 0.3); M.closePanel();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.saved === 0.21 && r.cur && r.rowCur, `saved, loaded and marked in the list (${JSON.stringify({ saved: r.saved, cur: r.cur, rowCur: r.rowCur })})`);
  ok(r.primary && r.over === 0.44, `„Überschreiben“ in its row (primary) writes the sound of now: rev.mix ${r.over}`);
  ok(r.ctrlS === 0.63, `Strg+S writes it again: rev.mix ${r.ctrlS}`);
  ok(r.ask === 'Wirklich?' && r.askThen.before === 0.63 && r.askThen.after === 0.05, `another own preset asks once (${r.ask}), then writes (${JSON.stringify(r.askThen)})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
