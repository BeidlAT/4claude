// the standard phrase per pipe: L1, L3, bursts – RMS and peak (to calibrate FLUTE_OUT / FLAME_OUT)
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html', false);
  const src = require('fs').readFileSync(__dirname + '/bench.js', 'utf8');
  const setup = src.slice(src.indexOf('async function setup(page)'), src.indexOf('const pull = '));
  eval(setup.replace('async function setup', 'global.setup = async function'));
  await global.setup(page);
  const st = (r) => { const x = { L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) }; let ss = 0, n = 0, pk = 0; for (let i = 0.2 * 48000; i < x.L.length; i++) { ss += (x.L[i] ** 2 + x.R[i] ** 2) / 2; n++; pk = Math.max(pk, Math.abs(x.L[i]), Math.abs(x.R[i])); } return [+(10 * Math.log10(ss / n)).toFixed(2), +L.db(pk).toFixed(1)]; };
  const D = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 };
  for (const k of (process.env.REFS || 'neb,glo,mem').split(',').filter(Boolean)) console.log(k, st(await page.evaluate(async ([k, D]) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': k }, D)), 10, k)), [k, D])));
  for (const rohr of (process.env.ROHR || 'rohrblatt,floete,flamme').split(',')) {
    const row = [];
    for (const [q, burst] of [['1', false], ['3', false], ['1', true]]) row.push(st(await page.evaluate(async ([rohr, q, burst, D]) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': 'hlm', 'hlm.rohr': rohr }, D), q), 10, 'hlm', { burst })), [rohr, q, burst, D])));
    console.log(rohr, 'L1', row[0], 'L3', row[1], 'burst', row[2]);
  }
  await browser.close();
})();
