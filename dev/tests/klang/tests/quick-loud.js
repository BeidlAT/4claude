// Quick level check for the Klangbibliothek II sources: the standard phrase (as bench.js) at level 1 and 3, Puls
// bursts, against the references' mean; and the centroid at three heights.   node quick-loud.js key …
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html';
const SR = 48000;
async function setup(page) {
  await page.evaluate(() => {
    const M = window.__M;
    // a fresh offline context with the defaults + params, the engine module loaded when one is selected
    window.__ctx = async (dur, params, q = '1', nodsp = false) => {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params, nodsp ? { 'v.eng': 'neb', 'v.layer': 'off' } : {}));   // (nodsp: nothing selected that would load the module)
      M.getQ().budget = 1e4; M.A.jrgAge = 0;   // (Jahresring: a fresh bar for every render)
      window.__dspOk = nodsp ? false : await M.ensureDSP(ctx);   // (nodsp: no module in this context – Glut plays its own native loop)
      return ctx;
    };
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.__ret = (b) => ({ L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), sr: b.sampleRate });
    // the standard phrase (snd/render.js): one note every `step` s across the field, held `hold` s (or Puls hits)
    window.__phr = async (ctx, dur, eng, opts = {}) => {
      const sr = ctx.sampleRate, step = opts.step || 0.5, hold = opts.hold || 0.4, all = [];
      for (let j = 0; (j + 1) * step < dur - 2.5; j++) {
        const t = 0.1 + j * step;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05);
          const y = opts.y != null ? opts.y : 0.3 + 0.5 * ((j * 0.61) % 1);
          const v = opts.burst ? M.hit(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2, gate: opts.gate || 0.2 }) : M.playNote(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2 });
          if (v && M.ENGINES[eng].sustain && !opts.burst) { v._rel = now + hold; all.push(v); }
          if (eng === 'kor') M.grainTick(now + step + 0.05);
          ctx.resume();
        });
        // offline, port messages (a worklet voice's release) reach the processor only at the next suspend
        ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume());
      }
      return ctx.startRendering();
    };
  });
}
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)), sr: r.sr });
function stats(x, from = 0.2) {
  const a = Math.floor(from * x.sr); let pk = 0, ss = 0, n = 0, nan = 0, dc = 0;
  for (let i = a; i < x.L.length; i++) { const l = x.L[i], r = x.R[i]; if (!Number.isFinite(l) || !Number.isFinite(r)) { nan++; continue; } pk = Math.max(pk, Math.abs(l), Math.abs(r)); ss += (l * l + r * r) / 2; dc += (l + r) / 2; n++; }
  return { rms: +(10 * Math.log10(ss / Math.max(1, n) + 1e-20)).toFixed(2), peak: +L.db(pk).toFixed(2), nan, dc: +(dc / Math.max(1, n)).toFixed(5) };
}

const DRYP = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, URL_, false);
  await setup(page);
  const phr = async (k, q, burst, y) => stats(pull(await page.evaluate(async ([k, q, burst, y, D]) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': k }, D), q), 10, k, { burst, y })), [k, q, burst, y, DRYP])));
  const ref = {}; for (const k of ['neb', 'glo', 'mem']) ref[k] = await phr(k, '1', false);
  const refMean = 10 * Math.log10((Math.pow(10, ref.neb.rms / 10) + Math.pow(10, ref.glo.rms / 10) + Math.pow(10, ref.mem.rms / 10)) / 3);
  const cen = async (k, y) => { const x = pull(await page.evaluate(async ([k, y, D]) => { const M = window.__M; const ctx = await window.__ctx(1.2, Object.assign({ 'v.eng': k }, D)); ctx.suspend(0.05).then(() => { M.playNote(k, ctx.currentTime, 220, y, 0.75, {}); ctx.resume(); }); return window.__ret(await ctx.startRendering()); }, [k, y, DRYP])); const m = new Float32Array(x.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (x.L[i] + x.R[i]); const sp = L.spectrum(m, SR, 0.5, 8192); let a = 0, b = 0; for (let i = 1; i < sp.p.length; i++) { a += sp.p[i] * i * sp.hz; b += sp.p[i]; } return Math.round(a / b); };
  for (const k of process.argv.slice(2)) {
    const a = await phr(k, '1', false), c = await phr(k, '3', false), d = await phr(k, '1', true);
    const cs = [await cen(k, 0.05), await cen(k, 0.5), await cen(k, 0.95)];
    console.log(JSON.stringify({ k, dB: +(a.rms - refMean).toFixed(2), L3: +(c.rms - a.rms).toFixed(2), burst: +(d.rms - a.rms).toFixed(2), peak: Math.max(a.peak, c.peak, d.peak), dc: Math.max(Math.abs(a.dc), Math.abs(c.dc)), nan: a.nan + c.nan + d.nan, cen: cs }));
  }
  await browser.close(); process.exit(0);
})();
