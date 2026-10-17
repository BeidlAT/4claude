// Sporenregen and the recipes off = the app before Gestik (slot gkbase from ./orig against slot gs; node t-gs-parity.js):
// the mix rendered offline sample for sample (the new strip "Regen" carries silence), a keyboard's notes and a finger
// sliding (they would seed Keime – nothing may change), the Puls scheduled live (the tick also runs the rain's part),
// a preset with a recipe loaded while Gestik was never on (the same toast, nothing stored), the field's picture, the
// top bar's layout.
process.env.SEED_BLOBS = '1';
const { open, ok, close } = require('./gk-h');
const OLD = 'http://127.0.0.1:8790/gkbase-inst/index.html', NEW = process.env.GSN || 'http://127.0.0.1:8790/gs-inst/index.html';
async function render(url) {
  const { page, errors } = await open({ url, cfg: { seed: 5 } });
  await page.evaluate(() => {
    // as v2/lib.js: an offline context in place of the live one
    window.__off = async (sr, dur, params) => {
      const M = window.__M, A = M.A;
      window.__mkCtx = () => new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      A.voices.clear(); A.grainVoices.clear(); A.revActive = null; A.revWant = 0; A.drvKey = null; A.bor = null; A.frozen = false; A.tex = {}; A.texWait = {}; A.grains = 0; A.irJob = 0;
      for (const id in M.PD) if (!M.PD[id].dev) M.P[id] = M.PD[id].d;
      Object.assign(M.P, params);
      if (M.applyQuality) M.applyQuality();
      M.buildNotes(); M.initAudio();
      for (let i = 0; i < 500 && !A.revActive; i++) await new Promise((r) => setTimeout(r, 10));
      return A.ctx;
    };
  });
  const r = await page.evaluate(async () => {
    const M = window.__M, out = {};
    for (const [name, pre] of [['plain', {}], ['mixer', { 'xfin.vol': -4, 'xfin.pan': 0.3, 'xfin.lo': 3, 'xfin.wid': 1.4, 'xeb2.vol': -2, 'mst.vol': -3 }]]) {
      const ctx = await window.__off(48000, 0.6, Object.assign({ 'dly.mix': 0, 'rev.mix': 0, 'cho.mix': 0, 'pha.mix': 0, 'drv.mix': 0, 'rng.mix': 0, 'mst.comp': 0, 'mov.pan': 0, 'flt.lfoDepth': 0, 'bor.on': false }, pre));
      M.updMix(true); M.updMaster();
      const o = ctx.createOscillator(), o2 = ctx.createOscillator();
      o.frequency.value = 220; o2.type = 'sawtooth'; o2.frequency.value = 331;
      o.connect(M.stripIn('fin')); o2.connect(M.stripIn('eb2'));
      o.start(0.01); o2.start(0.02);
      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let h = 0, e = 0;
      for (let i = 0; i < L.length; i++) { const a = Math.fround(L[i]), b = Math.fround(R[i]); h = (h * 31 + Math.round(a * 1e7) + 7 * Math.round(b * 1e7)) % 1000000007; e += a * a + b * b; }
      out[name] = { h, e: +e.toFixed(6), n: L.length };
    }
    return out;
  });
  await page.context().close();
  return { r, errors };
}
async function run(url) {
  const { page, errors } = await open({ url, cfg: { ins: [['k1', 'Testkeyboard']], seed: 777 } });
  await page.evaluate(() => { window.__M.setParam('v.eng', 'neb'); window.__M.setParam('v.layer', 'off'); });
  const keys = await page.evaluate(async () => {
    const M = window.__M, out = [];
    for (const m of [[0x90, 60, 100], [0x90, 64, 80], [0xb0, 64, 127], [0x80, 60, 0], [0x90, 67, 90], [0xb0, 64, 0], [0x80, 64, 0], [0x80, 67, 0]]) {
      window.__send(m); await window.__sleep(5);
      out.push(JSON.stringify([[...M.touches.values()].map((tt) => [tt.f, tt.y, tt.name, tt.voices.length]), M.A.voices.size]));
    }
    return out;
  });
  const box = await page.locator('#cvFx').boundingBox();
  const snap = () => page.evaluate(() => JSON.stringify([[...window.__M.touches.values()].map((tt) => [tt.f, tt.y, tt.col, tt.voices.length, tt.name]), window.__M.A.voices.size]));
  const fing = [];
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5); await page.mouse.down(); fing.push(await snap());
  for (let i = 1; i <= 5; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.08), box.y + box.height * (0.5 - i * 0.05)); fing.push(await snap()); }
  await page.mouse.up(); fing.push(await snap());
  const hits = await page.evaluate(async () => {
    const M = window.__M;
    for (const [k, v] of [['v.human', 0], ['l0.on', true], ['l1.on', true], ['l0.prob', 1], ['l1.prob', 1], ['l0.walk', 0], ['l1.walk', 0], ['seq.swing', 0.2], ['seq.bpm', 121]]) M.setParam(k, v);
    // every event as it is pushed (the frame draws and drops them; a page that stalls would hide some from a poll)
    const rec = [];
    let arr = M.VIS.events;
    const wrap = (a) => { a.push = function (...x) { rec.push(...x); return Array.prototype.push.apply(this, x); }; return a; };
    wrap(arr);
    Object.defineProperty(M.VIS, 'events', { get: () => arr, set: (v) => { arr = wrap(v); }, configurable: true });
    // (t0 read before the start it anchors: the audio clock may move on a render quantum between two reads)
    M.VIS.events.length = 0;
    const t0 = M.A.ctx.currentTime, out = [];
    M.seqStart(0, t0 + 0.1);
    await window.__sleep(1500);
    M.seqStop();
    for (const e of rec) if (e.kind === 'hit' && e.t < t0 + 1.3) out.push([+(e.t - t0).toFixed(6), e.lane]);
    return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  });
  const pre = await page.evaluate(async () => {
    const M = window.__M;
    M.loadPreset(M.PRESETS.find((p) => p.key === 'tempel'));
    await window.__sleep(50);
    return { toast: (document.querySelector('.toast') || {}).textContent || '', preset: M.UI.preset, stored: localStorage.getItem('myzel.gestik.v1'), gk: M.GK ? JSON.stringify(M.GK.p) : null };
  });
  const rg = await page.evaluate(() => { const M = window.__M; return M.RG ? { on: M.RG.on, k: M.RG.k.length, sp: M.RG.sp.length, vis: M.VIS.rg, lx: M.VIS.lx, ly: M.VIS.ly, src: M.MOD.t.rgx.s.size + M.MOD.t.rgy.s.size, rz: M.GK.rz } : null; });
  await page.context().close();
  return { keys, fing, hits, pre, rg, errors };
}
async function bar(url, width) {
  const { page } = await open({ url, cfg: {}, start: false });
  await page.setViewportSize({ width, height: 800 });
  await page.click('#btnStart'); await page.waitForTimeout(400);
  const r = await page.evaluate(() => [...document.querySelectorAll('#bar > *')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const b = e.getBoundingClientRect(); return (e.id || e.className) + ':' + [b.x, b.y, b.width, b.height].map((x) => Math.round(x * 10) / 10).join(','); }).join(' '));
  await page.context().close();
  return r;
}
(async () => {
  const r0 = await render(OLD), r1 = await render(NEW);
  ok(r0.r.plain.e > 1 && JSON.stringify(r0.r) === JSON.stringify(r1.r), 'the mix rendered offline, sample for sample: the same sound with the strip „Regen“ silent among the others (' + JSON.stringify(r1.r) + ')');
  const a = await run(OLD), b = await run(NEW);
  ok(JSON.stringify(a.keys) === JSON.stringify(b.keys), 'a keyboard\'s notes and its pedal: the same notes and voices, step by step');
  ok(JSON.stringify(a.fing) === JSON.stringify(b.fing), 'a finger sliding on the field: the same notes, heights and columns');
  ok(a.hits.length > 3 && JSON.stringify(a.hits) === JSON.stringify(b.hits), 'the Puls scheduled live (the tick also runs the rain\'s part): the same hits (' + a.hits.length + ')' + (JSON.stringify(a.hits) === JSON.stringify(b.hits) ? '' : ' ' + JSON.stringify(a.hits) + ' vs ' + JSON.stringify(b.hits)));
  ok(a.pre.toast === b.pre.toast && a.pre.preset === b.pre.preset && b.pre.stored === null, 'Tempelglocken (it has a recipe) loaded with Gestik never on: the same toast („' + b.pre.toast.replace(/Rückgängig$/, '') + '“), nothing of Gestik stored');
  ok(b.rg && !b.rg.on && b.rg.k === 0 && b.rg.sp === 0 && !b.rg.vis && b.rg.lx === 0 && b.rg.ly === 0 && b.rg.src === 0 && !b.rg.rz, 'nothing of Sporenregen or the recipes woke up: no Keime, no spores, nothing drawn, nothing on its targets');
  ok(!a.errors.length && !b.errors.length && !r0.errors.length && !r1.errors.length, 'no errors ' + a.errors.concat(b.errors, r0.errors, r1.errors).join(' | '));
  for (const w of [320, 390, 1280]) {
    const b0 = await bar(OLD, w), b1 = await bar(NEW, w);
    ok(b0 === b1, w + ' px: the top bar laid out exactly as before');
  }
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
