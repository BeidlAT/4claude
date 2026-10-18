// how long common actions block the main thread (desktop Chromium here; a phone is several times slower)
process.env.GF = process.env.GF || 'http://127.0.0.1:8790/fx-inst/index.html';
const H = require('../motion-tests/gf-h');
(async () => {
  const { page } = await H.open({});
  const r = await page.evaluate(async () => {
    const M = window.__M, out = [];
    for (const p of M.PRESETS.slice(0, 12)) { const t = performance.now(); M.loadPreset(p); out.push([p.name, Math.round(performance.now() - t)]); await window.__sleep(700); }
    for (const k of ['mix', 'dev', 'klang']) { const t = performance.now(); try { M.openPanel(k); } catch (e) {} out.push(['openPanel ' + k, Math.round(performance.now() - t)]); await window.__sleep(500); }
    return out;
  });
  console.log('STALL ' + r.map((x) => x[0] + ' ' + x[1] + ' ms').join(' | '));
  await H.close();
})().catch((e) => { console.log('ERR ' + e.stack); return H.close(); });
