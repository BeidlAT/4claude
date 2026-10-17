// Helpers for the mod-layer suites (slot gm: sh ../v2/mk.sh /home/user/4claude/myzel gm). open() is gk-h's (fake Web
// MIDI, motion mocks) on the gm-inst build; probes() installs in-page measuring tools on window.__g:
//   rms(node), spec(node, hz) – a real-time analyser hung on any node (fan-out, the graph is not changed otherwise);
//   tone(hz, dest, gain) – a test sine into a node; quiet() – Stille and every modulator of the patch at rest;
//   patch() – the patch values (to prove nothing was written).
const H = require('./gk-h');
const URL_GM = process.env.GM || 'http://127.0.0.1:8790/gm-inst/index.html';
const open = (o = {}) => H.open(Object.assign({ url: URL_GM }, o));
async function probes(page) {
  await page.evaluate(() => {
    const M = window.__M, A = M.A;
    const G = (window.__g = {});
    G.an = (node, n = 8192) => { const an = A.ctx.createAnalyser(); an.fftSize = n; an.smoothingTimeConstant = 0; node.connect(an); return an; };
    // a fresh analyser holds silence from before it was connected: the first read waits for a full buffer
    G.rms = async (node, reads = 3) => {
      const an = G.an(node), b = new Float32Array(an.fftSize);
      let s = 0;
      await window.__sleep(Math.ceil((an.fftSize / A.ctx.sampleRate) * 1000) + 40);
      for (let k = 0; k < reads; k++) { if (k) await window.__sleep(60); an.getFloatTimeDomainData(b); let x = 0; for (const v of b) x += v * v; s += Math.sqrt(x / b.length); }
      try { node.disconnect(an); } catch (e) {}
      return s / reads;
    };
    // the level (dB) at hz, the strongest bin within ±2 bins
    G.spec = async (node, hzs, n = 16384) => {
      const an = G.an(node, n), b = new Float32Array(an.frequencyBinCount);
      await window.__sleep(Math.ceil((n / A.ctx.sampleRate) * 1000) + 80);
      an.getFloatFrequencyData(b);
      try { node.disconnect(an); } catch (e) {}
      const bin = A.ctx.sampleRate / n;
      return hzs.map((hz) => { const i = Math.round(hz / bin); let m = -Infinity; for (let j = i - 2; j <= i + 2; j++) if (b[j] > m) m = b[j]; return m; });
    };
    // the mean power (dB) between lo and hi Hz
    G.band = async (node, lo, hi, n = 16384) => {
      const an = G.an(node, n), b = new Float32Array(an.frequencyBinCount);
      await window.__sleep(Math.ceil((n / A.ctx.sampleRate) * 1000) + 80);
      an.getFloatFrequencyData(b);
      try { node.disconnect(an); } catch (e) {}
      const bin = A.ctx.sampleRate / n;
      let s = 0, k = 0;
      for (let j = Math.round(lo / bin); j <= Math.round(hi / bin); j++) { s += Math.pow(10, b[j] / 10); k++; }
      return 10 * Math.log10(s / k);
    };
    // the frequency of the strongest bin between lo and hi (parabolic interpolation)
    G.peak = async (node, lo, hi, n = 32768) => {
      const an = G.an(node, n), b = new Float32Array(an.frequencyBinCount);
      await window.__sleep(Math.ceil((n / A.ctx.sampleRate) * 1000) + 100);
      an.getFloatFrequencyData(b);
      try { node.disconnect(an); } catch (e) {}
      const bin = A.ctx.sampleRate / n;
      let k = Math.round(lo / bin);
      for (let j = k; j <= Math.round(hi / bin); j++) if (b[j] > b[k]) k = j;
      const a = b[k - 1], c = b[k], d = b[k + 1], off = (a - d) / (2 * (a - 2 * c + d)) || 0;
      return (k + off) * bin;
    };
    G.tones = [];
    G.tone = (hz, dest, gain = 0.2) => { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.frequency.value = hz; g.gain.value = gain; o.connect(g).connect(dest); o.start(); G.tones.push([o, g]); return o; };
    G.untone = () => { for (const [o, g] of G.tones) { try { o.stop(); o.disconnect(); g.disconnect(); } catch (e) {} } G.tones = []; };
    G.quiet = () => {
      M.panic();
      for (const [k, v] of [['flt.lfoDepth', 0], ['drv.mix', 0], ['rng.mix', 0], ['pha.mix', 0], ['pha.depth', 0], ['cho.mix', 0], ['cho.depth', 0], ['mov.pan', 0], ['mov.vib', 0], ['mov.drift', 0], ['dly.wow', 0], ['bor.breath', 0], ['v.layer', 'off'], ['v.human', 0]]) M.setParam(k, v);
    };
    G.patch = () => { const o = {}; for (const id in M.PD) if (!M.PD[id].dev && !M.PD[id].rec) o[id] = M.P[id]; return JSON.stringify(o); };
    G.flush = async (ms = 120) => { M.modFlush(); await window.__sleep(ms); };
  });
}
module.exports = Object.assign({}, H, { open, probes, URL_GM });
