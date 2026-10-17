// Every preset: keys exist and values are valid; new presets render (offline, Puls running) without errors at sane loudness.
const { chromium, openInst } = require('./lib');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const X = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html', false);
  const bad = await X.page.evaluate(() => {
    const M = window.__M, out = [];
    for (const p of M.PRESETS) for (const k in p.v) {
      const d = M.PD[k], v = p.v[k];
      if (!d) { out.push(p.key + ': unknown ' + k); continue; }
      if (d.kind === 'sel' && !d.opts.some((o) => o[0] === v)) out.push(p.key + ': ' + k + '=' + v + ' not an option');
      if (d.kind === 'num' && (typeof v !== 'number' || v < d.min || v > d.max)) out.push(p.key + ': ' + k + '=' + v + ' out of range');
      if (d.kind === 'bool' && typeof v !== 'boolean') out.push(p.key + ': ' + k + ' not boolean');
    }
    return out;
  });
  ok(!bad.length, 'all preset values valid ' + bad.join(' | '));
  const keys = ['obertonhoehle', 'geisterchor', 'regenwald', 'kalimbatraum', 'kurzwelle', 'zikadennacht', 'gongbad', 'tiefsee', 'pilzregen'];
  for (const key of keys) {
    const r = await X.page.evaluate(async (key) => {
      const M = window.__M, sr = 48000, dur = 14, pr = M.PRESETS.find((p) => p.key === key);
      const params = Object.assign({ 'dev.q': '2', 'dev.lat': 'std' }, pr.v);
      const ctx = await window.__off(sr, dur, params);
      M.preloadTextures(); for (let i = 0; i < 300 && !(M.A.tex.glas && (!M.A.tex.hasOwnProperty || M.A.tex[M.P['kor.src']] || ['echo','datei','mikro'].includes(M.P['kor.src']))); i++) await new Promise((r) => setTimeout(r, 20));
      if (M.warmKS) { M.warmKS(); await new Promise((r) => setTimeout(r, 600)); }
      if (M.P['bor.on']) M.updBordun();
      M.seqStart();
      for (let t = 0.2; t < dur - 0.3; t += 0.1) ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.seqTick(ctx.currentTime + 0.15); M.grainTick(ctx.currentTime + 0.15); ctx.resume(); });
      const buf = await window.__phrase(ctx, sr, dur, { step: 0.9, hold: 0.7 });
      M.seqStop();
      return window.__stats(buf, 0.5);
    }, key);
    ok(r.nan === 0 && r.peak <= 0 && r.rms > -36 && r.rms < -10, `${key}: rms ${r.rms} dB, peak ${r.peak} dBFS`);
  }
  console.log('errors', X.errors.slice(0, 5));
  await browser.close();
})();
