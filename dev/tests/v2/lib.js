const { chromium } = require('/opt/node22/lib/node_modules/playwright');
async function openInst(browser, url, mobile = true) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (process.env.NO_RAF) await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });   // visuals draw random particles
  if (process.env.SEED_BLOBS) await page.addInitScript(() => {
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => (b && /javascript/.test(b.type || '') ? orig(new Blob(['{let x=777;Math.random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e9)/1e9;};}\n', b], { type: b.type })) : orig(b));
  });
  await page.addInitScript(() => {   // seeded Math.random so both builds draw the same detunes and noise offsets
    let x = 12345; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
  });
  await page.goto(url); await page.waitForFunction(() => !!window.__M);
  await page.evaluate(() => {
    window.__off = async (sr, dur, params) => {
      const M = window.__M, A = M.A;
      window.__mkCtx = () => new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      A.voices.clear(); A.grainVoices.clear(); A.revActive = null; A.revWant = 0; A.drvKey = null; A.bor = null; A.frozen = false; A.tex = {}; A.texWait = {}; A.grains = 0; A.irJob = 0;
      M.KS_CACHE.clear(); M.KS_CACHE.frames = 0;
      for (const id in M.PD) if (!M.PD[id].dev) M.P[id] = M.PD[id].d;
      Object.assign(M.P, params);
      if (M.applyQuality) M.applyQuality();
      M.buildNotes(); M.initAudio();
      for (let i = 0; i < 500 && !A.revActive; i++) await new Promise((r) => setTimeout(r, 10));
      return A.ctx;
    };
    window.__stats = (buf, from = 0) => {
      const sr = buf.sampleRate, a = Math.floor(from * sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
      let pk = 0, ss = 0, n = 0, win = Math.floor(0.4 * sr), wmax = 0, ws = 0, wn = 0, nan = 0;
      for (let i = a; i < buf.length; i++) {
        const l = L[i], r = R[i]; if (!Number.isFinite(l) || !Number.isFinite(r)) { nan++; continue; }
        const m = Math.max(Math.abs(l), Math.abs(r)); if (m > pk) pk = m;
        const e = (l * l + r * r) / 2; ss += e; n++; ws += e; wn++;
        if (wn === win) { wmax = Math.max(wmax, ws / wn); ws = 0; wn = 0; }
      }
      const db = (p) => +(10 * Math.log10(p + 1e-20)).toFixed(2);
      return { rms: db(ss / Math.max(1, n)), stMax: db(wmax), peak: +(20 * Math.log10(pk + 1e-12)).toFixed(2), nan };
    };
    // a phrase: one note every `step` s across the field, sustained engines held for `hold` s
    window.__phrase = async (ctx, sr, dur, opts = {}) => {
      const M = window.__M, A = M.A, step = opts.step || 0.45, hold = opts.hold || 0.35, all = [];
      const ly = [[M.P['v.eng'], 1, 1]]; if (M.P['v.layer'] !== 'off') ly.push([M.P['v.layer'], Math.pow(2, M.P['v.layerInt'] / 12), M.P['v.layerLvl']]);
      if (ly.some(([e]) => e === 'kor')) { M.preloadTextures(); for (let i = 0; i < 300 && !A.tex.glas; i++) await new Promise((r) => setTimeout(r, 20)); }
      for (let j = 0; (j + 1) * step < dur - 3; j++) {
        const t = 0.1 + j * step;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) { if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release(); }
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05);
          for (const [eng, ratio, lvl] of ly) {
            const v = M.playNote(eng, now, n.f * ratio, 0.3 + 0.5 * ((j * 0.61) % 1), 0.75 * lvl, { pan: ((j % 5) - 2) * 0.2, bend: !!opts.bend });
            if (v && M.ENGINES[eng].sustain) { v._rel = now + hold; all.push(v); }
          }
          if (ly.some(([e]) => e === 'kor')) M.grainTick(now + step + 0.05);
          ctx.resume();
        });
      }
      const buf = await ctx.startRendering();
      return buf;
    };
  });
  return { page, errors };
}
module.exports = { chromium, openInst };
