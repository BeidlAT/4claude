// Böe: loudness calibration in the real app (slot kd-boe-inst): the standard phrase (bench.js) at levels 1 and 3, the
// Puls phrase, peaks – against the references' mean (cached in out/boe/refs.json) – and level 3 vs level 1 per channel
// for single held notes at pan 0 / ±0.4 over seeds.   node cal-boe.js [phrase|parity|all]
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const fs = require('fs'), path = require('path');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-boe-inst/index.html';
const what = process.argv[2] || 'all', OUT = path.join(__dirname, 'out', 'boe');
fs.mkdirSync(OUT, { recursive: true });
const DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 };
const PRM = JSON.parse(process.env.PRM || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  await page.evaluate(() => {
    const M = window.__M;
    window.__ctx = async (dur, params, q = '1') => { M.P['dev.q'] = q; const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params)); M.getQ().budget = 1e4; window.__dspOk = await M.ensureDSP(ctx); return ctx; };
    window.__phr = async (ctx, dur, eng, opts = {}) => {
      const sr = ctx.sampleRate, step = opts.step || 0.5, hold = opts.hold || 0.4, all = [];
      for (let j = 0; (j + 1) * step < dur - 2.5; j++) {
        const t = 0.1 + j * step;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05), y = opts.y != null ? opts.y : 0.3 + 0.5 * ((j * 0.61) % 1);
          const v = opts.burst ? M.hit(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2, gate: opts.gate || 0.2 }) : M.playNote(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2 });
          if (v && M.ENGINES[eng].sustain && !opts.burst) { v._rel = now + hold; all.push(v); }
          ctx.resume();
        });
        ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume());
      }
      return ctx.startRendering();
    };
  });
  const st = (o) => page.evaluate(async (o) => { if (o.seed) { let x = o.seed; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; } const ctx = await window.__ctx(10, Object.assign({ 'v.eng': o.k, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, o.prm), o.q); return window.__stats(await window.__phr(ctx, 10, o.k, { burst: o.burst }), 0.2); }, o);
  if (what !== 'parity') {
    let ref; const rf = path.join(OUT, 'refs.json');
    if (fs.existsSync(rf)) ref = JSON.parse(fs.readFileSync(rf)); else { ref = {}; for (const k of ['neb', 'glo', 'mem']) ref[k] = await st({ k, q: '1', prm: {} }); fs.writeFileSync(rf, JSON.stringify(ref)); }
    const mean = 10 * Math.log10((Math.pow(10, ref.neb.rms / 10) + Math.pow(10, ref.glo.rms / 10) + Math.pow(10, ref.mem.rms / 10)) / 3);
    for (let rep = 0; rep < (+process.env.REP || 1); rep++) {
      const sd = process.env.SAME ? 1000 + 77 * rep : 0, l1 = await st({ k: 'boe', q: '1', prm: PRM, seed: sd }), l3 = await st({ k: 'boe', q: '3', prm: PRM, seed: sd }), bu = await st({ k: 'boe', q: '1', prm: PRM, burst: true });
      console.log(`refs mean ${mean.toFixed(2)} dB | L1 ${l1.rms} (Δ ${(l1.rms - mean).toFixed(2)}) peak ${l1.peak} | L3 ${l3.rms} (Δ L1 ${(l3.rms - l1.rms).toFixed(2)}) peak ${l3.peak} | burst ${bu.rms} peak ${bu.peak} nan ${l1.nan + l3.nan + bu.nan}`);
    }
  }
  if (what !== 'phrase') {
    // single held notes, 4 s, per channel (as the panner passes them), L3 vs L1, several seeds, pans 0 / ±0.4; and short
    const res = {};
    for (const [nm, dur, rel] of [['held', 4, null], ['short', 2, 0.4]]) for (const pan of [0, 0.4, -0.4]) {
      let a = 0, c = 0;
      for (let i = 0; i < (+process.env.NN || 6); i++) {
        const go = (q) => page.evaluate(async (o) => {
          { let x = 777 + 31 * o.i; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }   // (the same seeds at both levels)
          const M = window.__M, ctx = await window.__ctx(o.dur, Object.assign({ 'v.eng': 'boe' }, o.dry, o.prm), o.q);
          let v; ctx.suspend(19 / 375).then(() => { v = M.playNote('boe', ctx.currentTime, M.noteAt(0.1 + 0.13 * o.i).f, 0.15 + 0.12 * o.i, 0.75, { pan: o.pan }); ctx.resume(); });
          if (o.rel != null) { ctx.suspend(Math.round(o.rel * 375) / 375).then(() => { v.release(); ctx.resume(); }); ctx.suspend(Math.round(o.rel * 375 + 1) / 375).then(() => ctx.resume()); }
          const b = await ctx.startRendering(); const l = b.getChannelData(0), r = b.getChannelData(1); let s = 0; for (let j = 4800; j < l.length; j++) s += l[j] * l[j] + r[j] * r[j]; return s;
        }, { dur, rel, pan, i, q, dry: DRY, prm: PRM });
        a += await go('1'); c += await go('3');
      }
      res[nm + '@' + pan] = +(10 * Math.log10(c / a)).toFixed(2);
    }
    console.log('L3 − L1 (dB, per channel, 6 notes each): ' + JSON.stringify(res));
  }
  if (errors.length) console.log('errors: ' + errors.join(' | '));
  await browser.close();
})().catch((e) => { console.log('fatal ' + (e.stack || e)); process.exit(1); });
