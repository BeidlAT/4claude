// Helpers for the Hexenring suites (slot hx: sh ../v2/mk.sh /home/user/4claude/myzel hx – run-all.sh builds it):
//   open({ start, url, w, h, init }) → { page, errors, ctx }: a page on hx-inst (window.__M), sound started unless start: false
//   ok(cond, msg) / summary() – PASS/FAIL lines; summary() returns the number of failures
// and in the page (tools()):
//   __ringCtx(frames, sr, extraSrc) – an OfflineAudioContext with the app's module (myzel-ring) and the test processors
//   __ring(ctx, po)                – a myzel-ring node (2 inputs, 2 stereo outputs); its replies in node.__got
//   __chunks(n, fL, fR)            – n frames as 8192-frame [L, R] chunks, fL(i)/fR(i) the samples
//   __read(chunks, i)              – one frame [l, r]
//   (processors 'hx-rec' and 'hx-recf' – the latter also gives the frame it began at: __recGet(node).f0)
//   __sleep(ms)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL_HX = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
let browser = null, fails = 0, passes = 0;
function ok(c, msg) { if (c) passes++; else fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); return !!c; }
function summary() { console.log('== ' + passes + ' passed, ' + fails + ' failed'); return fails; }
// the test processors: an index checker (a sample holds its own index × 2^-20: does it run on by one, where does it
// restart, and how far from the clock's exact bar line) and a recorder (keeps the input in chunks for the page)
const TEST_SRC = `
class HxCheck extends AudioWorkletProcessor {
  constructor(o) { super(); const po = o.processorOptions || {}; this.st = po.st || { prev: null, pass: 0, maxE: 0, glitch: 0, gaps: [], starts: [], frames: 0 };
    this.seg = po.seg || null; this.beats = po.beats || 0; this.k0 = po.k0 || 0; this.fOff = po.fOff || 0; this.len = po.len || 0; this.sent = false; this.F = 0;
    this.port.onmessage = () => this.port.postMessage(this.st); }
  frameAt(b) { const s = this.seg; let lo = 0, hi = s.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m][1] <= b) lo = m; else hi = m - 1; } return s[lo][0] + (b - s[lo][1]) * s[lo][2]; }
  process(inp) {
    const a = inp[0] && inp[0][0], n = a ? a.length : 128, st = this.st, F0 = this.fOff + this.F;
    if (a) for (let k = 0; k < n; k++) {
      const idx = Math.round(a[k] * 1048576), F = F0 + k;
      if (st.prev != null && idx !== st.prev + 1) {
        if (idx === 0) {
          st.pass++;
          if (this.seg) { const e = F - this.frameAt((this.k0 + st.pass) * this.beats); if (Math.abs(e) > Math.abs(st.maxE)) st.maxE = e; }
          if (st.starts.length < 4000) st.starts.push(F);
        } else { st.glitch++; if (st.gaps.length < 20) st.gaps.push([F, st.prev, idx]); }
      }
      st.prev = idx;
    }
    this.F += n; st.frames += n;
    if (this.len && this.F >= this.len && !this.sent) { this.sent = true; this.port.postMessage(st); }
    return true;
  }
}
registerProcessor('hx-check', HxCheck);
class HxRec extends AudioWorkletProcessor {
  constructor(o) { super(); this.L = []; this.R = []; this.n = 0; this.port.onmessage = () => { this.port.postMessage({ L: this.L, R: this.R, n: this.n }); }; }
  process(inp) { const a = inp[0]; if (a && a[0]) { this.L.push(a[0].slice()); this.R.push((a[1] || a[0]).slice()); this.n += a[0].length; } return true; }
}
registerProcessor('hx-rec', HxRec);
// a recorder that knows the frame it began at (currentFrame: the live myzel-ring counts the same frames)
class HxRecF extends AudioWorkletProcessor {
  constructor(o) { super(); this.L = []; this.R = []; this.n = 0; this.f0 = -1; this.port.onmessage = () => { this.port.postMessage({ L: this.L, R: this.R, n: this.n, f0: this.f0 }); }; }
  process(inp) { const a = inp[0]; if (this.f0 < 0) this.f0 = currentFrame; if (a && a[0]) { this.L.push(a[0].slice()); this.R.push((a[1] || a[0]).slice()); this.n += a[0].length; } else { const z = new Float32Array(128); this.L.push(z); this.R.push(z); this.n += 128; } return true; }
}
registerProcessor('hx-recf', HxRecF);`;
async function tools(page) {
  await page.evaluate((TEST_SRC) => {
    const M = window.__M;
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__testUrl = URL.createObjectURL(new Blob([TEST_SRC], { type: 'text/javascript' }));
    window.__ringCtx = async (frames, sr = 48000, src) => {
      const ctx = new OfflineAudioContext(2, frames, sr);
      if (src) await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      else await M.ensureDSP(ctx);
      await ctx.audioWorklet.addModule(window.__testUrl);
      return ctx;
    };
    window.__ring = (ctx, po = {}) => {
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: po });
      node.__got = []; node.port.onmessage = (e) => node.__got.push(e.data);
      return node;
    };
    window.__chunks = (n, fL, fR) => {
      const out = [];
      for (let c = 0; c * 8192 < n; c++) {
        const L = new Float32Array(8192), R = new Float32Array(8192);
        for (let j = 0; j < 8192 && c * 8192 + j < n; j++) { const i = c * 8192 + j; L[j] = fL(i); R[j] = fR ? fR(i) : L[j]; }
        out.push([L, R]);
      }
      return out;
    };
    window.__read = (ch, i) => { const c = ch[Math.floor(i / 8192)]; return c ? [c[0][i % 8192], c[1][i % 8192]] : [0, 0]; };
    // the app's whole graph in an offline context (as v2/lib's __off): params reset to the defaults, then `params`
    window.__off = async (sr, dur, params) => {
      const A = M.A;
      window.__mkCtx = () => new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      A.voices.clear(); A.grainVoices.clear(); A.revActive = null; A.revWant = 0; A.drvKey = null; A.bor = null; A.frozen = false; A.tex = {}; A.texWait = {}; A.grains = 0; A.irJob = 0;
      M.KS_CACHE.clear(); M.KS_CACHE.frames = 0;
      for (const id in M.PD) if (!M.PD[id].dev) M.P[id] = M.PD[id].d;
      Object.assign(M.P, params);
      if (M.applyQuality) M.applyQuality();
      M.buildNotes(); M.initAudio();
      for (let i = 0; i < 500 && !A.revActive; i++) await new Promise((r) => setTimeout(r, 10));
      return A.ctx;
    };
    // a recorder's chunks as one Float32Array per channel
    window.__recGet = (node) => new Promise((res) => { node.port.onmessage = (e) => { const d = e.data, L = new Float32Array(d.n), R = new Float32Array(d.n); let o = 0; for (let i = 0; i < d.L.length; i++) { L.set(d.L[i], o); R.set(d.R[i], o); o += d.L[i].length; } res({ L, R, f0: d.f0 }); }; node.port.postMessage(1); });
  }, TEST_SRC);
}
async function open(o = {}) {
  if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: o.h || 800 } });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || /^Hexenring: (non-finite|a render held non-finite)/.test(m.text())) errors.push(m.text()); });   // (step 2b: a tripwire's or the guard's report counts as an error)
  if (o.init) await page.addInitScript(o.init);
  await page.goto(o.url || URL_HX); await page.waitForFunction(() => !!window.__M);
  await tools(page);
  if (o.start !== false) { await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok' || window.__M.HX.state === 'kein', null, { timeout: 8000 }); await page.waitForTimeout(300); }
  return { page, errors, ctx };
}
async function close() { if (browser) await browser.close(); browser = null; }
module.exports = { open, close, ok, summary, tools, URL_HX, TEST_SRC };
