// E8: is a re-render deterministic when the randomness is seeded? (a) the same phrase rendered twice from the same seed;
// (b) the same, but every note 37 frames later (not on the 128-frame block grid), compared after shifting back;
// (c) a different seed (how different is "alive"); (d) one note removed from the phrase: is (full − without) equal to
// that note rendered alone (superposition, the basis for delta re-rendering)?
process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const ENGS = (process.env.ENGS || 'neb1,hrz3,gng3,amo3,shn3,glt3,rhz3,kor1').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/eng-inst/index.html', false);
  await page.evaluate((w) => { window.__TAP = true; window.__WARM = w; }, !!process.env.WARM);
  const r = await page.evaluate(async (ENGS) => {
    const M = window.__M, SR = 48000, DUR = 4;
    let sx = 1; const seed = (s) => { sx = s | 0 || 1; Math.random = () => { sx ^= sx << 13; sx ^= sx >>> 17; sx ^= sx << 5; return ((sx >>> 0) % 1e9) / 1e9; }; };
    // notes: [t, x, y]; skip: index of a note to leave out; only: render only that note
    async function render(eng, q, s, off, skip = -1, only = -1) {
      M.P['dev.q'] = q;
      seed(999);   // the graph (LFO phases, noise buffers) from one seed
      try { M.A.clock && M.A.clock.postMessage('stop'); } catch (e) {} if (M.A.clockId) { clearInterval(M.A.clockId); M.A.clockId = 0; }
      const ctx = await window.__off(SR, DUR, { 'v.eng': eng, 'rev.mix': 0, 'dly.mix': 0, 'cho.mix': 0, 'pha.mix': 0 });
      // the capture point of the proposal: the strip before Pumpen; the master (compressor, drive) is silenced
      if (window.__TAP) { M.A.masterVol.gain.value = 0; const st = M.MIX.s.fin; st.mBy.connect(ctx.destination); st.mWet.connect(ctx.destination); }
      if (M.WORKLET_ENGINES.has(eng)) await M.ensureDSP(ctx);
      if (eng === 'kor') { M.preloadTextures(); for (let i = 0; i < 300 && !M.A.tex.glas; i++) await new Promise((r) => setTimeout(r, 20)); }
      const notes = [[0.05, 0.2, 0.4], [0.4, 0.55, 0.7], [0.75, 0.35, 0.3], [1.1, 0.8, 0.6], [1.3, 0.1, 0.5], [1.7, 0.65, 0.8]];
      const all = [];
      // every note draws from its own seed (s·1000 + i): the per-note PRNG the proposal asks for, simulated by reseeding
      // the global Math.random right before the note is built (and before each grain tick for Körner)
      // one suspend per block that has work: note starts (inside that block, at their exact time) and releases
      const work = new Map(); const add = (blk, fn) => { if (!work.has(blk)) work.set(blk, []); work.get(blk).push(fn); };
      notes.forEach(([t, x, y], i) => {
        if (i === skip || (only >= 0 && i !== only)) return;
        const at = t + off / SR, blk = Math.floor(at * SR / 128);
        add(blk, () => {
          seed(s * 1000 + i);
          const v = M.playNote(eng, at, M.noteAt(x).f, y, 0.7, { pan: x - 0.5 });
          if (v) { v._i = i; all.push(v); }
          if (eng === 'kor') { seed(s * 1000 + i + 500); M.grainTick(at + 0.6); }
        });
        add(Math.floor((at + 0.5) * SR / 128), () => { for (const v of all) if (v._i === i && v.alive && v.release && !v.released) { seed(s * 7777 + i); v.release(); } });
      });
      if (window.__WARM) add(0, () => { seed(4242); const v = M.playNote(eng, 0.001, M.noteAt(0.5).f, 0.5, 1e-6, {}); if (v) { v._i = -9; all.push(v); } });
      for (const [blk, fns] of work) ctx.suspend(blk * 128 / SR).then(() => { for (const f of fns) f(); ctx.resume(); });
      const buf = await ctx.startRendering();
      return [buf.getChannelData(0).slice(), buf.getChannelData(1).slice()];
    }
    const db = (x) => +(20 * Math.log10(x + 1e-30)).toFixed(1);
    function cmp(a, b, shift = 0) {   // max |a − b| (b shifted back by `shift` frames) against a's peak, in dB
      let pk = 0, d = 0;
      for (let c = 0; c < 2; c++) for (let i = 0; i + shift < a[c].length; i++) { const x = a[c][i], y = b[c][i + shift]; pk = Math.max(pk, Math.abs(x)); d = Math.max(d, Math.abs(x - y)); }
      return { peak: db(pk), maxDiffRel: db(d / (pk || 1)) };
    }
    function cmpSum(full, without, one) {   // superposition: full − without vs one
      let pk = 0, d = 0;
      for (let c = 0; c < 2; c++) for (let i = 0; i < full[c].length; i++) { const x = full[c][i] - without[c][i], y = one[c][i]; pk = Math.max(pk, Math.abs(y)); d = Math.max(d, Math.abs(x - y)); }
      return { onePeak: db(pk), maxDiffRel: db(d / (pk || 1)) };
    }
    const out = {};
    for (const e of ENGS) {
      const eng = e.slice(0, -1), q = e.slice(-1);
      const a = await render(eng, q, 1, 0), b = await render(eng, q, 1, 0), c = await render(eng, q, 1, 37), d = await render(eng, q, 2, 0);
      const wo = await render(eng, q, 1, 0, 2), one = await render(eng, q, 1, 0, -1, 2);
      out[e] = { same: cmp(a, b), shifted37: cmp(a, c, 37), otherSeed: cmp(a, d), superpos: cmpSum(a, wo, one) };
    }
    M.P['dev.q'] = '1';
    return out;
  }, ENGS);
  for (const k in r) console.log(k.padEnd(5), JSON.stringify(r[k]));
  if (errors.length) console.log('errors', errors.slice(0, 5));
  await browser.close();
})();
