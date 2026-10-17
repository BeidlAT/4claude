// Mixer parity: published build vs build with channel strips at their defaults, sample by sample (seeded random).
// Renders every preset with touch notes, the Puls lanes (seqTick driven from the offline clock) and the Bordun.
const { chromium, openInst } = require('./lib');
const BASE = process.argv[2] || 'mbase-inst', NEW = process.argv[3] || 'mnew-inst';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // workers get a seeded Math.random too (impulse responses, strings, textures are made there)
  const seedBlobs = (ctx) => ctx.addInitScript(() => {
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => (b && /javascript/.test(b.type || '') ? orig(new Blob(['{let x=777;Math.random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e9)/1e9;};}\n', b], { type: b.type })) : orig(b));
  });

  const B0 = await openInst(browser, 'http://127.0.0.1:8790/' + BASE + '/index.html');
  const presets = await B0.page.evaluate(() => window.__M.PRESETS.map((p) => p.key));
  const errs = [];
  // a fresh page per render, so both builds start from the same random state
  const render = async (url, cs) => { const X = await openInst(browser, 'http://127.0.0.1:8790/' + url + '/index.html'); const r = await render1(X, cs); errs.push(...X.errors); await X.page.context().close(); return r; };
  const render1 = async (X, cs) => X.page.evaluate(async (cs) => {
    const M = window.__M, sr = 48000, dur = 7;
    const params = Object.assign({ 'dev.q': cs.q || '1', 'dev.lat': 'std' }, cs.preset ? M.PRESETS.find((p) => p.key === cs.preset).v : {}, cs.extra || {});
    const ctx = await window.__off(sr, dur, params);
    if (cs.stereo) { const c = ctx.createConstantSource(); c.offset.value = 0; const mg = ctx.createChannelMerger(2); c.connect(mg, 0, 0); c.connect(mg, 0, 1); mg.connect(M.A.voiceBus); c.start(0); }
    if ([0, 1, 2, 3].some((i) => M.P['l' + i + '.on'] && M.P['l' + i + '.eng'] === 'kor') || M.P['v.eng'] === 'kor' || M.P['v.layer'] === 'kor') {
      M.preloadTextures(); const src = M.P['kor.src'];
      for (let i = 0; i < 500 && !(M.A.tex[src] && M.A.tex.glas); i++) await new Promise((r) => setTimeout(r, 20));
    }
    const S = M.SEQ;
    S.on = true; S.anchorT = 0.05; S.anchorB = 0; S.bpm = M.P['seq.bpm'];
    S.lanes.forEach((L, i) => { L.n = 0; L.div = 0; L.walk = 0; L.cur = -1; L.last = 0; });
    for (let t = 0.05; t < dur - 0.3; t += 0.1) ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.seqTick(ctx.currentTime + 0.12); ctx.resume(); });
    const buf = await window.__phrase(ctx, sr, dur, { step: 0.5, hold: 0.7 });
    S.on = false;
    return [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))];
  }, cs);
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  let cases = presets.filter((k) => !only || only.includes(k)).map((k) => ({ preset: k })).concat([{ preset: null, q: '3', extra: { 'v.eng': 'neb', 'bor.on': true } }]);
  if (process.env.DBG) { const off = { 'rev.mix': 0, 'dly.mix': 0, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false };
    cases = [{ preset: null, extra: Object.assign({ 'v.eng': 'neb' }, off), name: 'neb dry' }, { preset: null, extra: Object.assign({ 'v.eng': 'neb' }, off, { 'rev.mix': 0.4 }), name: 'neb rev' },
      { preset: null, extra: Object.assign({ 'v.eng': 'glo' }, off, { 'l0.on': true, 'l0.eng': 'glo' }), name: 'glo lane' }, { preset: null, extra: Object.assign({ 'v.eng': 'neb' }, off, { 'bor.on': true }), name: 'bordun' }]; }
  let worst = -Infinity;
  if (process.env.STEREO) cases.forEach((c) => (c.stereo = true));
  for (const cs of cases) {
    const a = await render(BASE, cs), b = await render(NEW, cs);
    let md = 0, ss = 0, sd = 0, n = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < a[c].length; i++) { const d = Math.abs(a[c][i] - b[c][i]); if (d > md) md = d; ss += a[c][i] * a[c][i]; sd += d * d; n++; }
    if (process.env.FIRST) { let fi = -1; for (let i = 0; i < a[0].length && fi < 0; i++) if (Math.abs(a[0][i] - b[0][i]) > 1e-4) fi = i; console.log('first divergence at', fi, (fi / 48000).toFixed(4), 's'); if (fi >= 0) console.log(a[0].slice(fi - 2, fi + 6).map((v) => v.toFixed(5)).join(' '), '|', b[0].slice(fi - 2, fi + 6).map((v) => v.toFixed(5)).join(' ')); }
    let ss2 = 0, sd2 = 0; for (let c = 0; c < 2; c++) for (let i = 24000; i < a[c].length; i++) { const d = a[c][i] - b[c][i]; ss2 += a[c][i] * a[c][i]; sd2 += d * d; }
    const rel2 = 10 * Math.log10((sd2 + 1e-30) / (ss2 + 1e-30));
    const rel = 10 * Math.log10((sd + 1e-30) / (ss + 1e-30));
    worst = Math.max(worst, cs.preset === 'kurzwelle' ? -999 : rel2);
    console.log((cs.name || cs.preset || 'neb q3 + bordun').padEnd(16), 'signal', (10 * Math.log10(ss / n + 1e-30)).toFixed(1), 'dB  diff/signal', rel.toFixed(1), 'dB  after 0.5 s', rel2.toFixed(1), 'dB  max|d|', md.toExponential(2));
  }
  console.log('worst diff/signal', worst.toFixed(1), 'dB');
  console.log('errors', errs);
  await browser.close();
})();
