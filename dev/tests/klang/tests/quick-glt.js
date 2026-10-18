// Quick browser renders of Glut (worklet or native): one note, envelope + pitch + WAV.   node quick-glt.js [nat] [f] [y] [dur] [rel]
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'), path = require('path');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html';
const [nat, f, y, dur, rel] = [process.argv[2] === 'nat', +(process.argv[3] || 220), +(process.argv[4] || 0.6), +(process.argv[5] || 3), process.argv[6] != null ? +process.argv[6] : null];
const PP = JSON.parse(process.env.PP || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  const r = await page.evaluate(async ([nat, f, y, dur, rel, PP]) => {
    const M = window.__M; M.P['dev.q'] = PP.q || '1';
    const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std', 'v.eng': 'glt', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0 }, PP, nat ? { 'v.eng': 'neb' } : {}));
    M.getQ().budget = 1e4; if (!nat) await M.ensureDSP(ctx);
    let v = null;
    ctx.suspend(19 / 375).then(() => { v = PP.burst ? M.hit('glt', ctx.currentTime, f, y, 0.75, { gate: PP.burst }) : M.playNote('glt', ctx.currentTime, f, y, 0.75, {}); ctx.resume(); });
    if (rel != null) { ctx.suspend(Math.round(rel * 375) / 375).then(() => { if (v && v.release) v.release(); ctx.resume(); }); ctx.suspend(Math.round(rel * 375) / 375 + 1 / 375).then(() => ctx.resume()); }
    const b = await ctx.startRendering();
    const toA = (x) => Array.from(x);
    return { L: toA(b.getChannelData(0)), R: toA(b.getChannelData(1)), as: v && v.as, wk: !!(v && v.wk), nat: !!(v && v.gltN), cost: v && v.cost };
  }, [nat, f, y, dur, rel, PP]);
  const m = Float32Array.from(r.L.map((x, i) => 0.5 * (x + r.R[i])));
  console.log(JSON.stringify({ as: r.as, wk: r.wk, nat: r.nat, cost: r.cost }));
  console.log('env (0.1 s, dBFS): ' + L.env(m, 48000, 0.1).map((v) => L.db(v).toFixed(1)).join(' '));
  const at = Math.min(dur - 0.8, 1.2); const sp = L.spectrum(m, 48000, at, 16384), h1 = L.harm(sp, f, 1);
  console.log(`at ${at} s: pitch (comb) ${L.cents(L.combPitch(m, 48000, f, at, 16384), f).toFixed(2)} ct, h2 ${(L.harm(sp, f, 2) - h1).toFixed(1)} h3 ${(L.harm(sp, f, 3) - h1).toFixed(1)}, peak ${L.db(L.peak(m)).toFixed(1)} dBFS`);
  const out = path.join(__dirname, '..', 'demo', `quick-${nat ? 'nat' : 'wk'}-${f}-${y}.wav`); L.wav(out, Float32Array.from(r.L), Float32Array.from(r.R), 48000);
  console.log('errors: ' + errors.join(' | '));
  await browser.close();
})();
