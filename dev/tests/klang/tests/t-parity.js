// Old engines only = the app before stage 1 (klang/index.base.html, slot kbase) – no worklet module is ever loaded, and
// offline renders of all 14 old engines keep their loudness (renders are not reproducible to the sample, even within
// one build: compared by RMS within 0.5 dB, random numbers reseeded, as motion-tests/t-gk-parity.js). Then: the first
// worklet engine selected loads the module exactly once.   node t-parity.js   (needs the slots: run-all.sh builds them)
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib');
const OLD = 'http://127.0.0.1:8790/kbase-inst/index.html', NEW = process.env.KN_URL || 'http://127.0.0.1:8790/kn-inst/index.html';
const OLD_ENGS = ['neb', 'kor', 'hau', 'obt', 'stm', 'swm', 'tie', 'glo', 'mem', 'sai', 'sch', 'klb', 'gng', 'trp'];
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // -- a live session with the old engines: no module, the real-time thread stays
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__addMod = [];
      const am = AudioWorklet.prototype.addModule;
      AudioWorklet.prototype.addModule = function (u, o) { window.__addMod.push(String(u).slice(0, 40)); return am.call(this, u, o); };
    });
    await page.goto(NEW); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(400);
    const r = await page.evaluate(async (OLD_ENGS) => {
      const M = window.__M, A = M.A, t0 = A.ctx.currentTime;
      for (const k of OLD_ENGS) { M.setParam('v.eng', k); M.setParam('v.layer', OLD_ENGS[(OLD_ENGS.indexOf(k) + 3) % 14]); M.setParam('l0.eng', k); }
      let n = 0;
      for (const k of OLD_ENGS) { const v = M.playNote(k, A.ctx.currentTime + 0.01, 220 + 20 * n++, 0.5, 0.6, {}); if (v && v.release) setTimeout(() => v.release(), 150); M.hit(k, A.ctx.currentTime + 0.05, 330, 0.5, 0.6, { gate: 0.1 }); }
      M.setParam('l0.on', true); M.seqStart();
      await new Promise((r) => setTimeout(r, 1500));
      M.seqStop(); M.panic();
      await new Promise((r) => setTimeout(r, 400));
      return { mods: window.__addMod.slice(), dsp: !!A.ctx.__dsp, state: M.DSP.state, ok: A.workletOK, as: [...A.voices].map((v) => v.as) };
    }, OLD_ENGS);
    // (Hexenring, owner 18.10.2026: the module now loads at sound start – the Humus records from the first note; before,
    // a session with the old engines never loaded it. The old engines still play their own native voices.)
    const blob0 = r.mods.filter((u) => u.startsWith('blob:')).length;
    L.ok(blob0 === 1 && r.dsp && r.state === 'ok' && r.as.every((k) => OLD_ENGS.includes(k)), `old engines everywhere (Klang, Ebene, Puls, hits, panic): the module loaded once, at sound start, for the Hexenring (addModule calls: ${r.mods.length}, DSP.state '${r.state}'), the voices native (${[...new Set(r.as)].join(' ') || 'none left'})`);
    // the first worklet engine: the module, once
    const r2 = await page.evaluate(async () => {
      const M = window.__M; M.setParam('v.eng', 'hlm');
      for (let i = 0; i < 100 && M.DSP.state !== 'ok' && M.DSP.state !== 'kein'; i++) await new Promise((r) => setTimeout(r, 20));
      M.setParam('v.layer', 'rnk'); M.setParam('l1.eng', 'rnk'); M.setParam('v.eng', 'neb'); M.setParam('v.eng', 'hlm');
      await new Promise((r) => setTimeout(r, 200));
      const v = M.playNote('hlm', M.A.ctx.currentTime + 0.02, 220, 0.6, 0.6, {}); await new Promise((r) => setTimeout(r, 300)); v.release();
      return { mods: window.__addMod.slice(), state: M.DSP.state, as: v.as };
    });
    const blob = r2.mods.filter((u) => u.startsWith('blob:')).length;
    L.ok(r2.state === 'ok' && blob === 1 && r2.as === 'hlm', `selecting Halm reuses the module of sound start (calls: ${r2.mods.join(' | ')}), the voice plays its processor`);
    L.ok(!errors.filter((e) => !/myzel-dsp\.js|Failed to load resource/.test(e)).length, 'no errors in the live session ' + errors.join(' | '));
    await ctx.close();
  }
  // -- the presets and an old saved patch load unchanged in the new build
  {
    const { page } = await openInst(browser, NEW);
    const { page: po } = await openInst(browser, OLD);
    const oldKeys = await po.evaluate(() => window.__M.PRESETS.map((p) => p.key));   // (the presets of the app before stage 1; the klang presets play the new sources)
    const r = await page.evaluate(() => { const M = window.__M, out = []; for (const p of M.PRESETS) { M.loadPreset(p); out.push([p.key, M.P['v.eng'] === (p.v['v.eng'] || 'neb'), M.dspWanted()]); } return out; });
    const old = r.filter((x) => oldKeys.includes(x[0])), nw = r.filter((x) => !oldKeys.includes(x[0]));
    L.ok(r.every((x) => x[1]) && old.length === oldKeys.length && old.every((x) => !x[2]), `all ${r.length} presets load their engines; the ${old.length} old ones ask for no worklet (of the ${nw.length} new ones ${nw.filter((x) => x[2]).length} do)`);
    const vals = await po.evaluate(() => { const M = window.__M; M.setParam('v.eng', 'gng'); M.setParam('v.layer', 'trp'); M.setParam('l2.eng', 'klb'); return M.patchValues(); });
    const back = await page.evaluate((vals) => { const M = window.__M; M.loadValues(vals, false); return [M.P['v.eng'], M.P['v.layer'], M.P['l2.eng'], M.P['hlm.atem'], M.P['rnk.feder'], M.dspWanted()]; }, vals);
    L.ok(back[0] === 'gng' && back[1] === 'trp' && back[2] === 'klb' && back[3] === 0.5 && back[4] === 0.5 && !back[5], 'an old saved patch loads: its engines, defaults for the new knobs ' + JSON.stringify(back));
    await page.context().close(); await po.context().close();
  }
  // -- renders: every old engine, the old build against the new, same loudness
  {
    const O = await openInst(browser, OLD), N = await openInst(browser, NEW);
    const diffs = [];
    for (const eng of OLD_ENGS) {
      const h = [];
      for (const X of [O, N]) {
        h.push(await X.page.evaluate(async (eng) => {
          const sr = 48000, dur = 6, ctx = await window.__off(sr, dur, { 'v.eng': eng, 'dev.q': '2', 'v.layer': 'off' });
          { let x = 4242; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
          const buf = await window.__phrase(ctx, sr, dur, { step: 0.4, hold: 0.5 });
          return Object.assign(window.__stats(buf, 0.2), { dsp: !!ctx.__dsp });
        }, eng));
      }
      diffs.push([eng, +(h[1].rms - h[0].rms).toFixed(2), h[1].dsp]);
    }
    const worst = diffs.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    L.ok(diffs.every((d) => Math.abs(d[1]) <= 0.5 && !d[2]), `14 old engines render as before (RMS new − old: ${diffs.map((d) => d[0] + ' ' + d[1]).join(', ')}; worst ${worst[0]} ${worst[1]} dB), no module in their contexts`);
    await O.page.context().close(); await N.page.context().close();
  }
  await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
