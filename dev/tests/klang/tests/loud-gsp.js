process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
async function setup(page) {
  await page.evaluate(() => {
    const M = window.__M;
    // a fresh offline context with the defaults + params, the engine module loaded when one is selected
    window.__ctx = async (dur, params, q = '1') => {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params));
      M.getQ().budget = 1e4; M.A.jrgAge = 0;   // (Jahresring: a fresh bar for every render)
      window.__dspOk = await M.ensureDSP(ctx);
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

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await setup(page);
  const key = process.argv[2] || 'gsp', extra = JSON.parse(process.argv[3] || '{}');
  for (let r = 0; r < 4; r++) { const row = [];
    for (const [q, mute] of [['1', false], ['3', false], ['1', true], ['3', true]]) {
      const x = pull(await page.evaluate(async ([key, q, mute, extra]) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': key, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'xgsp.mute': mute }, extra), q), 10, key, {})), [key, q, mute, extra]));
      row.push('L' + q + (mute ? ' dry' : '') + ' ' + stats(x).rms);
    }
    console.log(row.join('  '));
  }
  await browser.close();
})();
