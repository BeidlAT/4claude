// Delay of the playing path (voice bus → output) per latency mode and level, plus what dropping oversampling costs.
const { chromium, openInst } = require('./lib');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const mobile of [false, true]) {
    const X = await openInst(browser, 'http://127.0.0.1:8790/new-inst/index.html', mobile);
    const r = await X.page.evaluate(async () => {
      const M = window.__M, A = M.A, sr = 48000, out = {};
      for (const lat of ['min', 'std']) for (const q of ['1', '2', '3']) {
        M.P['dev.lat'] = lat; M.P['dev.q'] = q;
        const ctx = await window.__off(sr, 0.5, { 'rev.mix': 0, 'dly.mix': 0, 'cho.mix': 0, 'pha.mix': 0 });
        const b = ctx.createBuffer(1, 64, sr); b.getChannelData(0)[0] = 0.3;
        const s = ctx.createBufferSource(); s.buffer = b; s.connect(A.voiceBus); s.start(0.1);
        const buf = await ctx.startRendering(); const d = buf.getChannelData(0);
        let pk = 0, at = -1; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk) { pk = Math.abs(d[i]); at = i; }
        out[lat + q] = { frames: at - Math.round(0.1 * sr), os: A.drvShaper.oversample, shown: +(M.graphLatency() * sr).toFixed(0) };
      }
      return out;
    });
    console.log(mobile ? 'mobile' : 'desktop', JSON.stringify(r));
    if (!mobile) {
      const al = await X.page.evaluate(async () => {
        const M = window.__M, A = M.A, sr = 48000, res = {};
        for (const os of ['none', '2x', '4x']) {
          M.P['dev.lat'] = 'std'; M.P['dev.q'] = '2';
          const ctx = await window.__off(sr, 1.2, { 'rev.mix': 0, 'dly.mix': 0, 'cho.mix': 0, 'pha.mix': 0, 'drv.amt': 0.5, 'drv.mix': 0.6, 'mst.comp': 0 });
          A.drvShaper.oversample = os;
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 1760; const g = ctx.createGain(); g.gain.value = 0.25;
          o.connect(g).connect(A.voiceBus); o.start(0);
          const buf = await ctx.startRendering(); res[os] = buf.getChannelData(0).slice(sr * 0.5, sr * 0.5 + 32768);
        }
        // spectrum: energy away from the harmonics of 1760 Hz = aliasing (and other junk), relative to total
        const fft = (x) => { const n = x.length, re = Float64Array.from(x, (v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)))), im = new Float64Array(n);
          for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
          for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; } }
          const p = new Float64Array(n / 2); for (let i = 0; i < n / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i]; return p; };
        const out = {};
        for (const os in res) {
          const p = fft(res[os]), n = 32768, binHz = sr / n; let tot = 0, off = 0, offAud = 0;
          for (let i = 1; i < n / 2; i++) { const f = i * binHz, h = f / 1760, near = Math.abs(h - Math.round(h)) * 1760 < 40; tot += p[i]; if (!near) { off += p[i]; if (f < 8000) offAud += p[i]; } }
          out[os] = { aliasDb: +(10 * Math.log10(off / tot)).toFixed(1), aliasBelow8k: +(10 * Math.log10(offAud / tot)).toFixed(1) };
        }
        return out;
      });
      console.log('aliasing (hard drive, 1760 Hz saw)', JSON.stringify(al));
    }
  }
  await browser.close();
})();
