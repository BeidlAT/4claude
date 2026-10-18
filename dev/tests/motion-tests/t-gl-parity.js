// Gestik off = the app before Gestik on every path Ladung and Schlafen touch (slot gkbase from ./orig against slot gl):
// the Puls's schedule (seqTick reads the Tank's lanes and the bar end), rendered offline – every hit identical; the
// strips' gains (stripGain's fade) and the sum (updMaster's Stille) for a mixer with faders, mutes and the Puls group;
// the field's visuals frame by frame (spores' speed and brightness); freeze and Stille; a touch on the field; the top
// bar's layout (the hidden Gestik symbol) at three widths.   node t-gl-parity.js
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const OLD = 'http://127.0.0.1:8790/gkbase-inst/index.html', NEW = process.env.GLN || 'http://127.0.0.1:8790/gl-inst/index.html';
async function pulsRender(page) {
  return page.evaluate(async () => {
    const M = window.__M, sr = 48000, dur = 7;
    const ctx = await window.__off(sr, dur, { 'seq.bpm': 132, 'seq.swing': 0.3, 'l0.on': true, 'l1.on': true, 'l2.on': false, 'l3.on': true, 'l1.prob': 0.7, 'l3.walk': 0.5, 'v.human': 0.4, 'dev.q': '2' });
    { let x = 99; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
    M.VIS.events.length = 0;
    M.seqStart();
    const hits = [];
    for (let k = 1; k * 0.1 < dur - 0.5; k++) {
      ctx.suspend(Math.round(k * 0.1 * sr / 128) * 128 / sr).then(() => {
        M.seqTick(ctx.currentTime + 0.2);
        for (const e of M.VIS.events.splice(0)) if (e.kind === 'hit') hits.push([+e.t.toFixed(9), e.lane, +e.x.toFixed(9), +e.y.toFixed(9), +e.s.toFixed(9)]);
        ctx.resume();
      });
    }
    const buf = await ctx.startRendering();
    M.seqStop();
    return { hits, st: window.__stats(buf, 0.1) };
  });
}
async function mixer(page) {
  return page.evaluate(async () => {
    const M = window.__M;
    await window.__off(48000, 1, { 'xfin.vol': -6, 'xeb2.vol': 3, 'xl0.vol': -12, 'xl2.mute': true, 'xbor.vol': -60, 'mix.pulsVol': -4, 'mst.vol': -2.5, 'xdly.vol': -3 });
    M.updMix(true); M.updMaster();
    const g = M.MIX.list.map((st) => [st.k, st.in.gain.value, st.dry.gain.value]);
    // the master param: its scheduled target (setTargetAtTime) is what updMaster asked for
    return { g, n: M.MIX.list.length };
  });
}
async function frames(page) {
  return page.evaluate(() => {
    const M = window.__M;
    { let x = 31337; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
    M.VIS.spores.forEach((s, i) => { s.x = (i * 0.37) % 1; s.y = (i * 0.61) % 1; s.p = i; });
    M.VIS.hy.length = 0; M.VIS.rip.length = 0; M.VIS.t = 0;
    M.VIS.burst(100, 200, 40, 12, 1);
    M.touches.set('fake', { id: 'fake', px: 180, py: 320, hue: 200, name: 'C4', voices: [] });   // a held finger keeps sprouting hyphae
    for (let i = 1; i <= 150; i++) M.frame(1000 + i * 16.667);
    M.touches.delete('fake');
    return { sp: JSON.stringify(M.VIS.spores.map((s) => [s.x.toFixed(9), s.y.toFixed(9)])), hy: M.VIS.hy.length, rip: M.VIS.rip.length, hy0: JSON.stringify(M.VIS.hy.slice(0, 5).map((f) => [f.x.toFixed(6), f.y.toFixed(6), f.life.toFixed(6)])) };
  });
}
async function states(page) {
  await page.click('#btnStart'); await page.waitForTimeout(300);
  return page.evaluate(async () => {
    const M = window.__M, out = [];
    const st = () => [M.A.frozen, M.SEQ.on, M.touches.size, M.A.voices.size > 0, document.querySelector('#btnFreeze').getAttribute('aria-pressed')].join();
    M.seqStart(); out.push(st());
    document.querySelector('#btnFreeze').click(); out.push(st());
    document.querySelector('#btnFreeze').click(); out.push(st());
    M.onDown({ pointerId: 9, pointerType: 'touch', pt: { x: 0.4, y: 0.5, px: 100, py: 300 } }); out.push(st());
    M.onUp({ pointerId: 9 }); out.push(st());
    document.querySelector('#btnFreeze').click(); M.panic(); out.push(st());
    return out;
  });
}
async function bar(browser, url, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 600, isMobile: width < 600 });
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(200);
  const r = await page.evaluate(() => [...document.querySelectorAll('#bar > *')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const b = e.getBoundingClientRect(); return (e.id || e.className) + ':' + [b.x, b.y, b.width, b.height].map((x) => Math.round(x * 10) / 10).join(','); }).join(' '));
  await ctx.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const O = await openInst(browser, OLD), N = await openInst(browser, NEW);
  const p0 = await pulsRender(O.page), p1 = await pulsRender(N.page);
  ok(p0.hits.length > 40 && JSON.stringify(p0.hits) === JSON.stringify(p1.hits), 'the Puls rendered offline: every hit identical – time, lane, place, brightness, strength (' + p0.hits.length + ' hits)');
  ok(Math.abs(p0.st.rms - p1.st.rms) <= 0.15 && Math.abs(p0.st.peak - p1.st.peak) <= 1 && !p1.st.nan, 'and the same loudness (rms ' + p0.st.rms + ' / ' + p1.st.rms + ' dB)');
  const m0 = await mixer(O.page), m1 = await mixer(N.page);
  // (part 6 adds the rain's own strip "Regen": silent while it does not rain, and at its defaults a plain unity gain)
  // (and Gespinst's web its own strip „Gespinst“: silent while no Gespinst plays, at its defaults a plain unity gain)
  const g1 = m1.g.filter((x) => x[0] !== 'rgn' && x[0] !== 'gsp'), rg = m1.g.find((x) => x[0] === 'rgn'), gs = m1.g.find((x) => x[0] === 'gsp');
  ok(m0.n === 9 && JSON.stringify(m0.g) === JSON.stringify(g1), 'the strips’ gains, bit for bit (' + m0.g.map((x) => x[0] + ' ' + x[1].toFixed(4)).join(', ') + ')');
  ok(m1.n === m0.n + (rg ? 1 : 0) + (gs ? 1 : 0) && (!rg || (rg[1] === 1 && rg[2] === 1)) && (!gs || (gs[1] === 1 && gs[2] === 1)), '   … the new strips „Regen“ and „Gespinst“ (if there) at unity: in ' + (rg ? rg[1] : '–') + '/' + (gs ? gs[1] : '–') + ', dry ' + (rg ? rg[2] : '–') + '/' + (gs ? gs[2] : '–'));
  const f0 = await frames(O.page), f1 = await frames(N.page);
  ok(f0.sp === f1.sp && f0.hy === f1.hy && f0.rip === f1.rip && f0.hy0 === f1.hy0, 'the field drawn for 150 frames: the same spores, hyphae and ripples (' + f0.hy + ' hyphae)');
  ok(!O.errors.length && !N.errors.length, 'no errors ' + O.errors.concat(N.errors).join(' | '));
  await O.page.context().close(); await N.page.context().close();
  const O2 = await openInst(browser, OLD), N2 = await openInst(browser, NEW);
  const s0 = await states(O2.page), s1 = await states(N2.page);
  ok(JSON.stringify(s0) === JSON.stringify(s1), 'Puls, freeze, a touch on the field, Stille: the same states (' + s1.join(' | ') + ')');
  await O2.page.context().close(); await N2.page.context().close();
  for (const w of [320, 390, 1280]) {
    const b0 = await bar(browser, OLD, w), b1 = await bar(browser, NEW, w);
    ok(b0 === b1, w + ' px: the top bar laid out exactly as before (the Gestik symbol hidden)');
  }
  await browser.close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; });
