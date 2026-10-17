// Helpers for the Fährte / Funkstrecke suites (slot gf: sh ../v2/mk.sh /home/user/4claude/myzel gf): gk-h's open()
// (fake Web MIDI, motion events, permission mocks) on the gf-inst build, plus in-page tools:
//   __probe(node)  – an AudioWorklet that samples a node's output on the audio thread (time, value per render quantum):
//                    what really sounds, also while the main thread stalls; samples in window.__PR.pts
//   __drive(name, k, f) – a mod-layer source following f(audio time) at 100 Hz (like a knob or Gestik would)
//   __loop()       – the running Fährte as plain data (lanes, clock, strength), to compute what must sound
//   __outs(id, name) – a fake MIDI output whose sent bytes are kept (Funkstrecke)
// and in node: model(L, T) – the loop's value at audio time T (as the mod layer interpolates its points).
const H = require('./gk-h');
const URL_GF = process.env.GF || 'http://127.0.0.1:8790/gf-inst/index.html';
const open = async (o = {}) => { const r = await H.open(Object.assign({ url: URL_GF }, o)); await tools(r.page); return r; };
async function tools(page) {
  await page.evaluate(() => {
    const M = window.__M;
    window.__probe = async (node) => {
      const ctx = M.A.ctx;
      if (!ctx.__faeProbe) {
        const src = "class P extends AudioWorkletProcessor{constructor(){super();this.b=[]}process(i){const x=i[0]&&i[0][0];this.b.push(currentFrame/sampleRate,x?x[0]:NaN);if(this.b.length>=128){this.port.postMessage(this.b);this.b=[]}return true}}registerProcessor('fae-probe',P);";
        await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        ctx.__faeProbe = true;
      }
      const n = new AudioWorkletNode(ctx, 'fae-probe', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      const P = (window.__PR = { pts: [], n });
      n.port.onmessage = (e) => { const b = e.data; for (let i = 0; i < b.length; i += 2) P.pts.push([b[i], b[i + 1]]); };
      node.connect(n);
      const g = ctx.createGain(); g.gain.value = 0; n.connect(g); g.connect(ctx.destination);
      P.stop = () => { try { node.disconnect(n); } catch (e) {} try { n.disconnect(); g.disconnect(); } catch (e) {} };
      return true;
    };
    window.__drives = {};
    window.__drv = {};
    window.__drive = (name, k, fsrc) => {
      const f = new Function('t', 'return ' + fsrc), log = (window.__drv[name] = []);
      clearInterval(window.__drives[name]);
      const go = () => { const v = f(M.A.ctx.currentTime); log.push([M.ctxAt(performance.now()), v]); M.modSet(name, k, v); };
      go();
      window.__drives[name] = setInterval(go, 10);
    };
    window.__undrive = (name, k) => { clearInterval(window.__drives[name]); delete window.__drives[name]; M.modSet(name, k, 0); return M.A.ctx.currentTime; };
    window.__loop = () => {
      const L = M.FA.loop;
      if (!L) return null;
      return { a: L.a, n: L.n, len: L.len, gs: L.gs, g0: L.g0, why: L.why, fade: M.FA.p.fade, t0: M.FA.t0, b0: M.FA.b0, bpm: M.FA.bpm, R: M.FA_R,
        lanes: L.lanes.map((x) => ({ k: x.k, src: x.src, name: x.name, v: Array.from(x.v) })), disp: L.disp ? Object.keys(L.disp) : null };
    };
    window.__outs = (id, name) => {
      const o = { id, name, state: 'connected', sent: [], send(d) { this.sent.push({ d: Array.from(d), at: performance.now() }); } };
      window.__midi.outputs.set(id, o);
      if (window.__midi.access.onstatechange) window.__midi.access.onstatechange({});
      return true;
    };
  });
}
// the loop's value at audio time T: the steps' values joined by straight lines, times its strength
function model(L, T, scale = 1) {
  const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, s = fb * L.R, i0 = Math.floor(s), fr = s - i0;
  const md = (x, n) => ((x % n) + n) % n;
  const p0 = md(i0 - L.a, L.n), p1 = md(i0 + 1 - L.a, L.n);
  const gain = (b) => (b <= L.gs ? L.g0 : L.g0 * Math.pow(L.fade, (b - L.gs) / L.len));
  let v = 0;
  for (const ln of L.lanes) v += (ln.v[p0] * gain(i0 / L.R)) * (1 - fr) + (ln.v[p1] * gain((i0 + 1) / L.R)) * fr;
  return Math.max(-1, Math.min(1, v)) * scale;   // the target's range (Formen clamps the sum)
}
module.exports = Object.assign({}, H, { open, tools, model, URL_GF });
