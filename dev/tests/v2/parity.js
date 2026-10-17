// Loudness parity: published build (browser compressor) vs new build (native-node compressor), same patch, level 1.
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const B = await openInst(browser, 'http://127.0.0.1:8790/base-inst/index.html');
  const N = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html');
  const presets = await B.page.evaluate(() => window.__M.PRESETS.map((p) => p.key));
  const cases = presets.map((k) => ({ preset: k })).concat([0, 0.35, 0.7, 1].map((c) => ({ preset: null, comp: c })));
  const rows = [];
  for (const cs of cases) {
    const res = {};
    for (const [name, X] of [['old', B], ['new', N]]) {
      res[name] = await X.page.evaluate(async (cs) => {
        const M = window.__M, sr = 48000, dur = 12;
        const params = { 'dev.q': '1', 'dev.lat': 'std' };
        if (cs.preset) Object.assign(params, M.PRESETS.find((p) => p.key === cs.preset).v);
        else Object.assign(params, { 'v.eng': 'neb', 'mst.comp': cs.comp, 'mst.vol': 6 });
        const ctx = await window.__off(sr, dur, params);
        const buf = await window.__phrase(ctx, sr, dur, { step: 0.3, hold: 0.6 });
        return window.__stats(buf, 0.5);
      }, cs);
    }
    rows.push({ case: cs.preset || 'comp ' + cs.comp, old: res.old, new: res.new, dRms: +(res.new.rms - res.old.rms).toFixed(2), dSt: +(res.new.stMax - res.old.stMax).toFixed(2), dPk: +(res.new.peak - res.old.peak).toFixed(2) });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  console.log('errors', B.errors, N.errors);
  await browser.close();
})();
