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
    const osc = A.ctx.createOscillator(), g = A.ctx.createGain(); osc.frequency.value = 440; g.gain.value = 0.06; osc.connect(g).connect(M.stripIn('fin')); osc.start();
    const f = new Float32Array(A.analyser.frequencyBinCount), bin = A.ctx.sampleRate / A.analyser.fftSize;
    const h3 = async () => { await sl(500); A.analyser.smoothingTimeConstant = 0; let a = -999, b = -999;   // (unsmoothed: the last measure's harmonics must not linger)
      for (let n = 0; n < 6; n++) { A.analyser.getFloatFrequencyData(f); const pk = (hz) => { const i = Math.round(hz / bin); return Math.max(f[i - 1], f[i], f[i + 1]); }; a = Math.max(a, pk(440)); b = Math.max(b, pk(1320)); await sl(60); } A.analyser.smoothingTimeConstant = 0.6; return +(b - a).toFixed(1); };
    o.all = await h3();
    M.wfxSet('fin', 1); o.v = await h3(); o.vIn = M.MIX.s.fin.dTo === (A.fxm && A.fxm[1] && A.fxm[1].in);
    M.wfxSet('fin', 4); o.f = await h3(); o.fIn = M.MIX.s.fin.dTo === (A.fxm && A.fxm[4] && A.fxm[4].in);
    M.wfxSet('fin', 0); o.d = await h3(); o.dRoute = M.P['xfin.route'];
    M.wfxSet('fin', 31); o.back = await h3(); o.bIn = M.MIX.s.fin.dTo === A.voiceBus;
    osc.stop(); M.setParam('drv.mix', 0); M.setParam('drv.amt', 0.35);
    return o;
  });
  ok(r.all > -30 && r.v > -30, `the whole chain and only Verzerrung: its harmonics (3rd at ${r.all} / ${r.v} dB)`);
  ok(r.f < r.v - 15 && r.d < r.v - 15 && r.dRoute === 'dir', `only Filter and Direkt: the sine stays clean (${r.f} / ${r.d} dB)`);
  ok(r.vIn && r.fIn && r.bIn, 'the strip into the chain of exactly its effects, back into the whole one');
  // the Pult, played as the owner plays it (31.10.2026: „mehrere aktivieren oder deaktivieren … es macht keinen Unterschied,
  // ob F angeklickt wurde“): a strip selected, its effects switched on the beads – heard in the sum
  await page.evaluate(async () => { const M = window.__M; M.openPanel('mix'); await window.__sleep(500); if (M.mxSetView) M.mxSetView('pult'); await window.__sleep(700); });
  const box = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const b = e.getBoundingClientRect(); return b.width ? [b.left + b.width / 2, b.top + b.height / 2] : null; }, sel);
  const mask = (k) => page.evaluate((k) => window.__M.wfxGet(k), k);
  const bead = (n) => box('.mx-bead[data-n="' + n + '"]');
  const click = async (p, mod) => { if (mod) await page.keyboard.down(mod); await page.mouse.click(p[0], p[1]); if (mod) await page.keyboard.up(mod); await page.waitForTimeout(250); };
  const pressed = () => page.evaluate(() => [...document.querySelectorAll('.mx-bead')].map((b) => (b.getAttribute('aria-pressed') === 'true' ? b.dataset.n[0] : '·')).join(''));
  const u = {};
  // Klang selected (a tap on its strip's name): all five lit – it goes through the whole chain
  await page.evaluate(() => window.__M.selectChannel('fin')); await page.waitForTimeout(200);
  u.t0 = await page.evaluate(() => window.__M.wfxTarget()); u.p0 = await pressed();
  // a hot drive on a sine, heard: V off → clean, V on again → driven
  u.h = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    M.setParam('drv.mix', 1); M.setParam('drv.amt', 0.95);
    const osc = A.ctx.createOscillator(), g = A.ctx.createGain(); osc.frequency.value = 440; g.gain.value = 0.06; osc.connect(g).connect(M.stripIn('fin')); osc.start();
    window.__osc = osc; await sl(300); return true; });
  const h3 = () => page.evaluate(async () => { const M = window.__M, A = M.A, sl = window.__sleep, f = new Float32Array(A.analyser.frequencyBinCount), bin = A.ctx.sampleRate / A.analyser.fftSize; A.analyser.smoothingTimeConstant = 0; await sl(500); let a = -999, b = -999; for (let n = 0; n < 6; n++) { A.analyser.getFloatFrequencyData(f); const pk = (hz) => { const i = Math.round(hz / bin); return Math.max(f[i - 1], f[i], f[i + 1]); }; a = Math.max(a, pk(440)); b = Math.max(b, pk(1320)); await sl(60); } A.analyser.smoothingTimeConstant = 0.6; return +(b - a).toFixed(1); });
  u.hOn = await h3();
  const V = await bead('Verzerrung'), R = await bead('Ring'), F = await bead('Filter'), Pp = await bead('Phaser');
  await click(V); u.mV = await mask('fin'); u.pV = await pressed(); u.hOff = await h3();
  // several at once: F and P off as well, then P on again
  await click(F); await click(Pp); u.m3 = await mask('fin'); await click(Pp); u.m4 = await mask('fin'); u.p4 = await pressed();
  // Alt: only the Ring
  await click(R, 'Alt'); u.mR = await mask('fin'); u.pR = await pressed();
  // its knot: Direkt – the beads go dark; Kette again – its Ring alone comes back (the choice is kept)
  const n0 = await box('[data-fxk="fin"]');
  await click(n0); u.dir = await mask('fin'); u.pDir = await pressed(); await click(n0); u.back = await mask('fin');
  // another strip selected: the beads show its own (the whole chain), and switch it
  const other = await page.evaluate(() => [...document.querySelectorAll('[data-fxk]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.fxk).find((k) => k !== 'fin' && !k.startsWith('hl:') && k !== 'puls'));
  await page.evaluate((k) => window.__M.selectChannel(k), other); await page.waitForTimeout(250);
  u.other = other; u.pO = await pressed(); await click(F); u.mO = await mask(other); u.finStill = await mask('fin');
  // a strip on Direkt that gets one effect: on Kette with just it
  await page.evaluate((k) => window.__M.wfxSet(k, 0), other); await page.waitForTimeout(150); await click(F); u.fromDir = [await mask(other), await page.evaluate((k) => window.__M.P['x' + k + '.route'], other)];
  // the Puls: all four Spuren
  await page.evaluate(() => window.__M.selectChannel('puls')); await page.waitForTimeout(200); await click(V);
  u.puls = await page.evaluate(() => ['l0', 'l1', 'l2', 'l3'].map((l) => window.__M.wfxGet(l) & 1));
  await page.screenshot({ path: __dirname + '/out/wege-fx.png' });
  await page.evaluate(() => { window.__osc.stop(); window.__M.setParam('drv.mix', 0); window.__M.setParam('drv.amt', 0.35); });
  ok(u.t0 === 'fin' && u.p0 === 'VRFPS', `Klang selected: the beads are its switches, all lit – the whole chain (${u.p0})`);
  ok(u.mV === 30 && u.pV === '·RFPS' && u.hOn > -30 && u.hOff < u.hOn - 15, `V tapped: Klang without the Verzerrung – heard (3rd harmonic ${u.hOn} → ${u.hOff} dB), bead dark (${u.pV})`);
  ok(u.m3 === 18 && u.m4 === 26 && u.p4 === '·R·PS', `several: F and P off (${u.m3}), P on again (${u.m4}, ${u.p4})`);
  ok(u.mR === 2 && u.pR === '·R···', `Alt-tap: only the Ring (${u.mR}, ${u.pR})`);
  ok(u.dir === 0 && u.pDir === '·····' && u.back === 2, `its knot: Direkt (beads dark), Kette again with its Ring alone (${u.back})`);
  ok(u.pO === 'VRFPS' && u.mO === 27 && u.finStill === 2, `another strip (${u.other}) selected: its own switches (${u.pO}); F off for it (${u.mO}), Klang untouched (${u.finStill})`);
  ok(u.fromDir[0] === 4 && u.fromDir[1] === 'fx', `a strip on Direkt that gets F: on Kette with just the Filter (${u.fromDir})`);
  ok(u.puls.every((x) => x === 0), `the Puls selected: V off for all four Spuren (${u.puls})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
