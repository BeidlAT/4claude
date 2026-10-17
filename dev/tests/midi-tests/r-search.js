// Review probe: what the learn banner's search offers for words a musician would type.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, close } = require('./hb');
(async () => {
  const { page } = await open({ ua: 'windows', bt: {}, cfg: { ins: [['k1', 'nanoKEY Studio KEYBOARD/CTRL']] } });
  const r = await page.evaluate(() => {
    const M = window.__M, o = {};
    for (const q of ['klang pegel', 'pegel', 'lautstärke', 'fader', 'klang', 'hall', 'filter', 'spur 1', 'puls', 'mixer', 'summe', 'echo', 'master']) o[q] = M.mapSearch(q, 8).map((t) => (t.group ? t.group + ' · ' : '') + t.label + ' {' + t.key + '}');
    o.total = M.mapTargets().length;
    o.groups = [...new Set(M.mapTargets().map((t) => t.group))];
    return o;
  });
  for (const k in r) console.log(k + ':', Array.isArray(r[k]) ? '\n   ' + r[k].join('\n   ') : r[k]);
  await close();
})();
