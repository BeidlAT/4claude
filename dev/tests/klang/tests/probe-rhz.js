// Rhizom in the app, offline: strikes at y 0 / 0.5 / 1, cascade sizes and spans, levels; a WAV per y
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'); const path = require('path'), fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, 'out', 'rhz'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => {
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  });
  // cascade statistics: 200 strikes per y, nothing rendered (sizes, durations)
  const st = await page.evaluate(async () => {
    const M = window.__M, out = {};
    for (const y of [0, 0.25, 0.5, 0.75, 1]) {
      const sz = [], du = [];
      const ctx = await window.__off(48000, 0.1, { 'v.eng': 'rhz', 't.scale': 'mpent', 't.range': 3 }); M.getQ().budget = 1e4;
      for (let r = 0; r < 150; r++) {
        M.rhzClear();
        const v = M.playNote('rhz', 0.0, M.N.notes[7].f, y, 0.75, {});
        sz.push(v.rz.fired); du.push(v.endAt - 0);
      }
      sz.sort((a, b) => a - b);
      out[y] = { mean: +(sz.reduce((a, b) => a + b, 0) / sz.length).toFixed(1), single: sz.filter((x) => x === 1).length / sz.length, big: sz.filter((x) => x >= 12).length / sz.length, med: sz[sz.length >> 1], max: sz[sz.length - 1], life: +(du.reduce((a, b) => a + b, 0) / du.length).toFixed(2) };
    }
    return out;
  });
  console.log('cascades (150 strikes each, vel 0.75, mpent over 3 octaves, node 7):'); for (const y in st) console.log('  y', y, JSON.stringify(st[y]));
  for (const kn of ['holz', 'metall', 'glas']) for (const q of ['1', '3']) {
    const r = await page.evaluate(async ([kn, q]) => {
      const M = window.__M; M.P['dev.q'] = q;
      const ctx = await window.__off(48000, 9, { 'v.eng': 'rhz', 'rhz.knoten': kn, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 });
      M.getQ().budget = 1e4;
      const at = (t, fn) => ctx.suspend(Math.round(t * 375) / 375).then(() => { fn(ctx.currentTime); ctx.resume(); });
      const info = [];
      [[0.2, 0.3, 0.1], [1.4, 0.5, 0.5], [2.8, 0.7, 0.8], [4.3, 0.95, 0.4], [6.2, 0.5, 0.6], [6.45, 0.5, 0.6], [6.7, 0.5, 0.6]].forEach(([t, x, y]) => at(t, (tt) => { const v = M.playNote('rhz', tt, M.noteAt(x).f, y, 0.75, {}); info.push([t, y, v.rz.fired, +(v.endAt - tt).toFixed(2)]); }));
      const b = await ctx.startRendering(); M.P['dev.q'] = '1';
      return { L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), info };
    }, [kn, q]);
    const x = { L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) };
    L.wav(path.join(OUT, `rhizom-${kn}-L${q}.wav`), x.L, x.R, 48000);
    console.log(kn, 'L' + q, 'peak', L.db(Math.max(L.peak(x.L), L.peak(x.R))).toFixed(1), 'rms', L.db(L.rms(x.L)).toFixed(1), 'nan', L.nanCount(x.L), 'strikes [t, y, fired, life]', JSON.stringify(r.info));
  }
  console.log('errors', errors.join(' | '));
  await browser.close();
})();
