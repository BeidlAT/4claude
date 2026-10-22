// C2: a gesture inside the current bar, tapped in the same bar (len 1): the loop is the bar BEFORE it
process.env.GF = process.env.GF || 'http://127.0.0.1:8790/fx-inst/index.html';
const H = require('../motion-tests/gf-h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { page } = await H.open({});
  await page.evaluate(() => { const M = window.__M; M.FA.p.len = 1; M.FA.p.fade = 1; });
  const g = await page.evaluate(() => { const M = window.__M, b = M.faeB(M.A.ctx.currentTime), E = M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4 + 1e-9) + 4; return { tE: M.faeT(E), beat: 60 / M.FA.bpm }; });
  const ts = g.tE + 0.3 * g.beat, te = g.tE + 2.3 * g.beat;   // beats 0.3 … 2.3 of a bar
  await page.evaluate(([a, b]) => window.__drive('map:test:1', 'flt', '(t>' + a + '&&t<' + b + ')?0.7*Math.sin(Math.PI*(t-' + a + ')/' + (b - a) + '):0'), [ts, te]);
  await page.waitForFunction((t) => window.__M.A.ctx.currentTime > t, g.tE + 3.0 * g.beat, { timeout: 15000 });
  await page.evaluate(() => { const M = window.__M; M.faePress(); M.faeRelease(false); });   // tapped on beat 3 of the same bar
  await sleep(1200);
  const r = await page.evaluate(() => ({ loop: !!window.__M.FA.loop, toast: document.getElementById('toastMsg').textContent }));
  console.log('REPRO C2: gesture on beats 0.3–2.3 of a bar, Fährte tapped on beat 3 of the same bar (1 bar): loop=' + r.loop + ', toast "' + r.toast + '"');
  await H.close();
})().catch((e) => { console.log('ERR ' + e.stack); return H.close(); });
