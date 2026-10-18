// E6: storage formats for loop audio on real Myzel material. A phrase of Gong and Glocke (level 3, with hall and echo)
// rendered offline, then stored as (a) Float32, (b) Int16 + TPDF dither, (c) block-floating Int16 (256 frames share
// a power-of-two scale, TPDF dither), (d) Int24. Per 256-frame block: signal RMS against error RMS; the worst block
// among those above −100 dBFS, and the error's own level.
process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, 'http://127.0.0.1:8790/eng-inst/index.html', false);
  const out = {};
  for (const eng of ['gng', 'glo', 'hrz']) {
    const b64 = await page.evaluate(async (eng) => {
      const M = window.__M, SR = 48000, DUR = 12;
      M.P['dev.q'] = '3';
      const ctx = await window.__off(SR, DUR, { 'v.eng': eng });
      if (M.WORKLET_ENGINES.has(eng)) await M.ensureDSP(ctx);
      for (let j = 0; j < 8; j++) {
        const t = 0.1 + j * 0.45;
        ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => { const v = M.playNote(eng, ctx.currentTime, M.noteAt((j * 0.37) % 1).f, 0.5, 0.4 + 0.08 * j, {}); if (v && M.ENGINES[eng].sustain) v._rel = 1; ctx.resume(); });
      }
      ctx.suspend(4.5).then(() => { for (const v of M.A.voices) if (v.release && !v.released) v.release(); ctx.resume(); });
      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1), all = new Float32Array(L.length * 2);
      all.set(L, 0); all.set(R, L.length);
      let s = ''; const u8 = new Uint8Array(all.buffer); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      M.P['dev.q'] = '1';
      return btoa(s);
    }, eng);
    const u8 = Buffer.from(b64, 'base64'); const x = new Float32Array(u8.buffer, u8.byteOffset, u8.length / 4);
    out[eng] = analyse(x);
  }
  for (const k in out) console.log(k, JSON.stringify(out[k]));
  await browser.close();
})();
function analyse(x) {
  let s = 0x9E3779B9; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const tpdf = () => rnd() - rnd();
  const f32 = (v) => Math.fround(v);
  const q16 = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32768 + tpdf()))) / 32768;
  const q24 = (v) => Math.max(-8388608, Math.min(8388607, Math.round(v * 8388608 + tpdf()))) / 8388608;
  const B = 256, res = {};
  const formats = { int16: (blk) => blk.map(q16), blockfloat16: (blk) => {
      let pk = 0; for (const v of blk) pk = Math.max(pk, Math.abs(v));
      const e = pk > 0 ? Math.ceil(Math.log2(pk)) : -126, sc = Math.pow(2, -e);   // block scaled so its peak sits in [0.5, 1)
      return blk.map((v) => Math.max(-32768, Math.min(32767, Math.round(v * sc * 32767 + tpdf()))) / 32767 / sc);
    }, int24: (blk) => blk.map(q24) };
  const db = (p) => 10 * Math.log10(p + 1e-30);
  for (const [name, fn] of Object.entries(formats)) {
    let worst = Infinity, errAll = 0, sigAll = 0, n = 0, blocks = 0, quietWorst = Infinity;
    for (let i = 0; i + B <= x.length; i += B) {
      const blk = Array.from(x.subarray(i, i + B)), y = fn(blk);
      let es = 0, ss = 0; for (let k = 0; k < B; k++) { const d = y[k] - blk[k]; es += d * d; ss += blk[k] * blk[k]; }
      errAll += es; sigAll += ss; n += B;
      const sdb = db(ss / B);
      if (sdb > -100) { blocks++; const snr = db(ss / B) - db(es / B); if (snr < worst) worst = snr; if (sdb < -70 && snr < quietWorst) quietWorst = snr; }
    }
    res[name] = { worstBlockSNR: +worst.toFixed(1), worstQuietBlockSNR: quietWorst === Infinity ? null : +quietWorst.toFixed(1), errDbFS: +db(errAll / n).toFixed(1), bytesPerFrameStereo: name === 'int16' ? 4 : name === 'int24' ? 6 : 4 + 2 / B * 1 };
  }
  // the material: how much of it is quiet (tails)?
  let ss = 0, pk = 0, quiet = 0, tot = 0; for (let i = 0; i + B <= x.length; i += B) { let s2 = 0; for (let k = 0; k < B; k++) { s2 += x[i + k] * x[i + k]; pk = Math.max(pk, Math.abs(x[i + k])); } tot++; if (db(s2 / B) < -60 && db(s2 / B) > -100) quiet++; ss += s2; }
  res.material = { peakDbFS: +(20 * Math.log10(pk)).toFixed(1), rmsDbFS: +db(ss / x.length).toFixed(1), shareOfBlocksBelow60dB: +(quiet / tot).toFixed(2) };
  return res;
}
