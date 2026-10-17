// Per engine: loudness and peaks at level 1 vs 3 (same phrase), stereo width, and render cost per voice (for VCOST3).
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const X = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html', false);
  const ENGS = ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch'];
  const loud = await X.page.evaluate(async (ENGS) => {
    const M = window.__M, sr = 48000, out = {};
    for (const eng of ENGS) for (const q of ['1', '3']) {
      M.P['dev.q'] = q; M.P['dev.lat'] = 'std';
      const ctx = await window.__off(sr, 10, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0 });
      if (eng === 'sai') { M.warmKS(); await new Promise((r) => setTimeout(r, 1200)); }
      const buf = await window.__phrase(ctx, sr, 10, { step: 0.5, hold: 0.4 });
      const st = window.__stats(buf, 0.3);
      // side/mid ratio as a width measure
      const L = buf.getChannelData(0), R = buf.getChannelData(1); let m = 0, s = 0; for (let i = 0; i < L.length; i++) { const a = (L[i] + R[i]) / 2, b = (L[i] - R[i]) / 2; m += a * a; s += b * b; }
      out[eng + q] = Object.assign(st, { width: +(10 * Math.log10(s / m)).toFixed(1) });
    }
    return out;
  }, ENGS);
  for (const e of ENGS) console.log(e.padEnd(4), 'L1', JSON.stringify(loud[e + '1']), ' L3', JSON.stringify(loud[e + '3']), ' dRms', (loud[e + '3'].rms - loud[e + '1'].rms).toFixed(2), 'dPk', (loud[e + '3'].peak - loud[e + '1'].peak).toFixed(2));
  // reverb level: 2-ch vs 4-ch IR on the same phrase (wet only)
  const rv = await X.page.evaluate(async () => {
    const M = window.__M, sr = 48000, out = {};
    for (const q of ['1', '3']) {
      M.P['dev.q'] = q;
      const ctx = await window.__off(sr, 8, { 'v.eng': 'glo', 'rev.mix': 1, 'dly.mix': 0, 'mst.comp': 0 });
      // keep only the wet: mute the dry insert → master path
      M.A.insertOut.disconnect(M.A.masterSum);
      const buf = await window.__phrase(ctx, sr, 8, { step: 0.7 });
      out[q] = window.__stats(buf, 0.3);
    }
    return out;
  });
  console.log('reverb wet L1', JSON.stringify(rv['1']), 'L3', JSON.stringify(rv['3']));
  // cost: N held voices of one engine, offline render time per voice, relative to one level-1 Nebel voice
  const cost = await X.page.evaluate(async (ENGS) => {
    const M = window.__M, A = M.A, sr = 48000, out = {};
    async function run(eng, q, n) {
      M.P['dev.q'] = q;
      const ctx = await window.__off(sr, 3, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0, 'kor.dens': 22 });
      if (eng === 'kor') { M.preloadTextures(); for (let i = 0; i < 300 && !A.tex.glas; i++) await new Promise((r) => setTimeout(r, 20)); }
      if (eng === 'sai') { M.warmKS(); await new Promise((r) => setTimeout(r, 800)); }
      M.getQ().budget = 1e4; M.applyQuality && 0;
      const sus = M.ENGINES[eng].sustain;
      // percussive engines: retrigger so n voices sound on average; sustained: n held voices
      for (let j = 0; j < (sus ? 1 : 6); j++) {
        const t = 0.05 + j * 0.45;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          for (let k = 0; k < n; k++) { const nn = M.noteAt(((k * 0.37) % 1)); M.playNote(eng, ctx.currentTime, nn.f, 0.5, 0.5, {}); }
          if (eng === 'kor') { for (let s = 0; s < 30; s++) {} }
          ctx.resume();
        });
      }
      if (eng === 'kor') for (let j = 1; j < 28; j++) { const t = j * 0.1; ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => { M.grainTick(ctx.currentTime + 0.12); ctx.resume(); }); }
      const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
    }
    const base = await run('neb', '1', 0);
    let unit = 0;
    for (let rep = 0; rep < 2; rep++) {
      for (const eng of ENGS) for (const q of ['1', '3']) {
        const ms = await run(eng, q, 16) - base;
        out[eng + q] = Math.min(out[eng + q] || Infinity, ms / 16);
      }
    }
    unit = out.neb1;
    const rel = {}; for (const k in out) rel[k] = +(out[k] / unit).toFixed(2);
    return { baseMs: +base.toFixed(1), unitMs: +unit.toFixed(2), rel };
  }, ENGS);
  console.log('cost', JSON.stringify(cost));
  console.log('errors', X.errors);
  await browser.close();
})();
