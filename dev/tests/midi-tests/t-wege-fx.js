// Wege durch einzelne Effekte (owner, 31.10.2026: „eine Spur geht nur durch einen Effekt, wenn man das möchte – unten im
// Pult zu setzen, das Design so behalten“): a sine into the strip „Klang“ with a hot Verzerrung –
//  1 the whole chain and „only Verzerrung“ add its harmonics; „only Filter“ (open) and Direkt keep the sine clean; the
//    strip goes into the chain of exactly its effects (one per set, shared)
//  2 the Pult: a bead is the effect view; a knot pressed switches that effect for its channel, a stroke across knots paints,
//    Alt-click only this channel, Esc back; in the overview a knot switches the whole chain as before
//                                                         node t-wege-fx.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({});
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    M.setParam('drv.mix', 1); M.setParam('drv.amt', 0.95); M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 20000);
    for (const id of ['rev.mix', 'dly.mix', 'rng.mix', 'pha.mix', 'cho.mix']) M.setParam(id, 0);
    const osc = A.ctx.createOscillator(), g = A.ctx.createGain(); osc.frequency.value = 440; g.gain.value = 0.25; osc.connect(g).connect(M.stripIn('fin')); osc.start();
    const f = new Float32Array(A.analyser.frequencyBinCount), bin = A.ctx.sampleRate / A.analyser.fftSize;
    const h3 = async () => { await sl(500); let a = -999, b = -999; for (let n = 0; n < 6; n++) { A.analyser.getFloatFrequencyData(f); const pk = (hz) => { const i = Math.round(hz / bin); return Math.max(f[i - 1], f[i], f[i + 1]); }; a = Math.max(a, pk(440)); b = Math.max(b, pk(1320)); await sl(60); } return +(b - a).toFixed(1); };
    o.all = await h3();
    M.wfxSet('fin', 1); o.v = await h3(); o.vIn = M.MIX.s.fin.dTo === (A.fxm && A.fxm[1] && A.fxm[1].in);
    M.wfxSet('fin', 4); o.f = await h3(); o.fIn = M.MIX.s.fin.dTo === (A.fxm && A.fxm[4] && A.fxm[4].in);
    M.wfxSet('fin', 0); o.d = await h3(); o.dRoute = M.P['xfin.route'];
    M.wfxSet('fin', 31); o.back = await h3(); o.bIn = M.MIX.s.fin.dTo === A.voiceBus;
    osc.stop(); M.setParam('drv.mix', 0); M.setParam('drv.amt', 0.35);
    return o;
  });
  ok(r.all > -30 && r.v > -30, `the whole chain and only Verzerrung: its harmonics (3rd at ${r.all} / ${r.v} dB)`);
  ok(r.f < r.v - 20 && r.d < r.v - 20 && r.dRoute === 'dir', `only Filter and Direkt: the sine stays clean (${r.f} / ${r.d} dB)`);
  ok(r.vIn && r.fIn && r.bIn, 'the strip into the chain of exactly its effects, back into the whole one');
  // the Pult
  await page.evaluate(async () => { const M = window.__M; M.openPanel('mix'); await window.__sleep(500); if (M.mxSetView) M.mxSetView('pult'); await window.__sleep(700); });
  const box = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel);
  const mask = (k) => page.evaluate((k) => window.__M.wfxGet(k), k);
  const u = {};
  const fB = await box('.mx-bead[data-n="Filter"]');
  u.bead = !!fB;
  if (fB) { await page.mouse.click(fB[0], fB[1]); await page.waitForTimeout(200); u.view = await page.evaluate(() => window.__M.FXV.j); }
  const n0 = await box('[data-fxk="fin"]');
  if (n0) { await page.mouse.move(n0[0], n0[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150); u.fin = await mask('fin'); }
  // a stroke from Ebene 2 across Ebene 3: both lose the Filter
  const a = await box('[data-fxk="eb2"]'), b = await box('[data-fxk="eb3"]');
  if (a && b) { await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move((a[0] + b[0]) / 2, a[1], { steps: 4 }); await page.mouse.move(b[0], b[1], { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(150); u.eb2 = await mask('eb2'); u.eb3 = await mask('eb3'); }
  // Alt-click Klang: only it goes through the Filter
  if (n0) { await page.keyboard.down('Alt'); await page.mouse.click(n0[0], n0[1]); await page.keyboard.up('Alt'); await page.waitForTimeout(150); u.only = await page.evaluate(() => window.__M.wfxKeys().filter((k) => window.__M.wfxGet(k) & 4)); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(150); u.esc = await page.evaluate(() => window.__M.FXV.j);
  if (n0) { await page.mouse.click(n0[0], n0[1]); await page.waitForTimeout(150); u.ov = await mask('fin'); await page.mouse.click(n0[0], n0[1]); await page.waitForTimeout(150); u.ov2 = await mask('fin'); }
  await page.screenshot({ path: __dirname + '/out/wege-fx.png' });
  ok(u.bead && u.view === 2, `a bead (Filter): the effect view (${u.view})`);
  ok(u.fin === 27, `in it a knot switches the Filter for its channel (Klang ${u.fin})`);
  ok(u.eb2 === 27 && u.eb3 === 27, `a stroke across knots paints (Ebene 2 ${u.eb2}, Ebene 3 ${u.eb3})`);
  ok(JSON.stringify(u.only) === '["fin"]', `Alt-click: only this channel through the Filter (${JSON.stringify(u.only)})`);
  ok(u.esc === -1 && u.ov === 0 && u.ov2 === 31, `Esc back; in the overview a knot switches the whole chain (${u.ov} → ${u.ov2})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
