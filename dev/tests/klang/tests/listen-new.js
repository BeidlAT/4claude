// Listening demos of the new sources for the owner: the real app offline, its default effects, level 3 (desktop) –
// a held source: a note whose Höhe rises and falls, a slide, a two-note chord, Puls hits; a struck source: a little
// melody of strikes across the field at rising Höhe, a pair, a run of quick hits.   node listen-new.js OUTDIR [keys…]
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2], SR = 48000;
const KEYS = process.argv.slice(3).length ? process.argv.slice(3) : ['hlm:floete', 'hlm:flamme', 'boe', 'amo', 'shn', 'shn:jawari', 'khl', 'khl:triller', 'khl:ruf', 'mdr', 'gsp', 'rhz', 'rhz:glas'];
const VAR = { 'hlm:floete': { 'hlm.rohr': 'floete' }, 'hlm:flamme': { 'hlm.rohr': 'flamme' }, 'shn:jawari': { 'shn.steg': 'jawari' }, 'khl:triller': { 'khl.silbe': 'triller' }, 'khl:ruf': { 'khl.silbe': 'ruf' }, 'rhz:glas': { 'rhz.knoten': 'glas' }, 'glt:nativ': {}, 'zpf:fels': { 'zpf.koerper': 'fels' } };
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html', false);
  await page.evaluate(() => {
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  });
  for (const kv of KEYS) {
    const key = kv.split(':')[0], extra = VAR[kv] || {};
    const r = await page.evaluate(async ([key, extra]) => {
      const M = window.__M; M.P['dev.q'] = '3';
      const ctx = await window.__off(48000, 16, Object.assign({ 'v.eng': key, 'dev.lat': 'std' }, extra));
      M.getQ().budget = 1e4; await M.ensureDSP(ctx);
      const used = new Set(), q = (t) => { let k = Math.round(t * 375) / 375; while (used.has(k)) k += 1 / 375; used.add(k); return k; };
      const at = (t, fn) => ctx.suspend(q(t)).then(() => { fn(ctx.currentTime); ctx.resume(); });
      const n = (x) => M.noteAt(x).f, held = M.ENGINES[key].sustain;
      if (held) {
        let a = null, b = null, c = null;
        at(0.2, (t) => { a = M.playNote(key, t, n(0.35), 0.15, 0.75, { pan: -0.15 }); });
        for (let i = 0; i <= 50; i++) at(0.5 + i * 0.1, () => { if (a) a.setY(i <= 30 ? 0.15 + 0.85 * i / 30 : 1 - 0.6 * (i - 30) / 20); });
        at(5.8, () => { if (a) a.setF(n(0.5), 0.25); });
        at(6.9, () => { if (a) a.release(); });
        at(7.6, (t) => { b = M.playNote(key, t, n(0.2), 0.55, 0.7, { pan: -0.4 }); c = M.playNote(key, t + 0.08, n(0.6), 0.6, 0.7, { pan: 0.4 }); });
        at(10.4, () => { if (b) b.release(); if (c) c.release(); });
        [[11.6, 0.11, 0.7], [11.85, 0.11, 0.5], [12.1, 0.11, 0.6], [12.5, 0.4, 0.8], [13.2, 0.4, 0.3]].forEach(([tt, g, x]) => at(tt, (t) => M.hit(key, t, n(x), 0.6, 0.75, { gate: g, pan: x - 0.5 })));
      } else {
        const mel = [0.2, 0.35, 0.5, 0.3, 0.6, 0.45, 0.75, 0.55];
        mel.forEach((x, i) => at(0.3 + i * 0.9, (t) => M.playNote(key, t, n(x), 0.1 + 0.8 * i / 7, 0.7, { pan: x - 0.5 })));
        at(7.8, (t) => { M.playNote(key, t, n(0.25), 0.5, 0.7, { pan: -0.4 }); M.playNote(key, t + 0.05, n(0.65), 0.5, 0.7, { pan: 0.4 }); });
        for (let i = 0; i < 16; i++) at(10 + i * 0.2, (t) => M.hit(key, t, n([0.3, 0.45, 0.6, 0.5][i % 4]), 0.4, 0.6 + 0.2 * (i % 2), { gate: 0.11, pan: ((i % 5) - 2) * 0.2 }));
      }
      for (let t = 0.3; t < 15.9; t += 0.37) ctx.suspend(q(t)).then(() => ctx.resume());
      const out = await ctx.startRendering();
      M.P['dev.q'] = '1';
      return { L: window.__b64(out.getChannelData(0)), R: window.__b64(out.getChannelData(1)) };
    }, [key, extra]);
    const x = { L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)) };
    const name = { hlm: 'halm', boe: 'boee', amo: 'amoebe', shn: 'sehne', khl: 'kehlchen', mdr: 'moder', gsp: 'gespinst', rhz: 'rhizom', glt: 'glut', zpf: 'zapfen' }[key] + (kv.includes(':') ? '-' + kv.split(':')[1] : '');
    const file = path.join(OUT, name + '.wav');
    L.wav(file, x.L, x.R, SR);
    console.log(file, 'peak', L.db(Math.max(L.peak(x.L), L.peak(x.R))).toFixed(1), 'dBFS, rms', L.db(L.rms(x.L)).toFixed(1));
  }
  await browser.close();
})();
