// Qualitätsstufen (owner, 31.10.2026: „nicht nachvollziehbar und widersprüchlich“): for every measure of the device the
// three budgets stand in order (a higher level never gets less of the core), unmeasured level 3 holds as many Nebel voices
// as level 2, and the card names all three counts.            node t-qstufen.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({});
  const r = await page.evaluate(async () => {
    const M = window.__M, o = { rows: [] };
    for (const u of [0, 0.0005, 0.002, 0.006, 0.012, 0.02, 0.03, 0.08]) {
      M.CAL.unit = u; const b = M.qBudgets(), row = { u, b1: b[1], b2: b[2], b3: b[3] };
      for (const q of ['1', '2', '3']) { M.setParam('dev.q', q); row['v' + q] = M.getBudget()[0]; }
      o.rows.push(row);
    }
    M.CAL.unit = 0; M.setParam('dev.q', '2'); M.openPanel('dev'); await window.__sleep(400);
    o.text = (document.querySelector('#panel-dev .note') || {}).textContent || [...document.querySelectorAll('.note')].map((e) => e.textContent).find((t) => /Stufe 1 bis/.test(t)) || '';
    return o;
  });
  const bad = r.rows.filter((x) => !(x.b1 <= x.b2 && x.b2 <= x.b3) || x.v1 !== Math.max(6, x.b1) || x.v2 !== Math.max(6, x.b2) || x.v3 !== Math.max(6, x.b3));
  ok(!bad.length, `budgets in order for every measure, applied as given (${JSON.stringify(r.rows.map((x) => [x.u, x.b1, x.b2, x.b3]))})`);
  const u0 = r.rows[0];
  ok(Math.floor(u0.b3 / 1.9) >= u0.b2, `unmeasured: level 3 holds as many Nebel voices as level 2 (${u0.b2} / ${Math.floor(u0.b3 / 1.9)})`);
  ok(/Stufe 1 bis \d+ · Stufe 2 bis \d+ · Stufe 3 bis \d+/.test(r.text), `the card names all three counts („${r.text.slice(-120)}“)`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
