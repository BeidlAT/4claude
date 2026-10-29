// Effekt 2, Einschub, Formen (mod.fx), Geflecht's effect threads – live in Chromium
const { launch, page, start, ok } = require('./lib.js');
const OUT = process.env.OUT || require('os').tmpdir() + '/fxret';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await launch();
  const { ctx, pg } = await page(b, 'd1440');
  await start(pg); await pg.waitForTimeout(1500);
  const E = (f, a) => pg.evaluate(f, a);
  // the return Effekt 2
  let r = await E(async () => { const M = window.__M, A = M.A; M.setParam('fx2.mix', 0.8); await new Promise((r) => setTimeout(r, 600)); const S = A.fxR.fx2; return { cur: !!S.cur, typ: S.cur && S.cur.typ, fx1: !!A.fxR.fx.cur, send: !!M.MIX.s.l0.fS.fx2 }; });
  ok(r.cur && r.typ === 'wolke' && !r.fx1 && r.send, 'Effekt 2: Wolke made, Effekt 1 not ' + JSON.stringify(r));
  // its sound: a tap on its return
  const lvl = async (expr) => E(async (expr) => { const M = window.__M, A = M.A, an = A.ctx.createAnalyser(); an.fftSize = 2048; eval(expr).connect(an); const b = new Float32Array(2048); let s = 0, n = 0; const end = performance.now() + 2500; while (performance.now() < end) { an.getFloatTimeDomainData(b); for (const x of b) s += x * x; n += b.length; await new Promise((r) => setTimeout(r, 40)); } return 10 * Math.log10(s / n + 1e-20); }, expr);
  const r2 = await lvl('A.fxR.fx2.ret');
  ok(r2 > -70, 'Effekt 2 sounds: ' + r2.toFixed(1) + ' dB');
  // the Einschub on Spur 1
  r = await E(async () => { const M = window.__M; M.setParam('xl0.ins', 'fx2'); M.setParam('xl0.insmix', 0.7); await new Promise((r) => setTimeout(r, 600)); const x = M.MIX.s.l0.proc; return { proc: !!x, on: M.MIX.s.l0.procOn, ins: !!(x && x.ins && x.ins.cur), r: x && x.ins && x.ins.r, typ: x && x.ins && x.ins.cur && x.ins.cur.typ }; });
  ok(r.on && r.ins && r.r === 'fx2' && r.typ === 'wolke', 'Einschub on Spur 1: ' + JSON.stringify(r));
  const w1 = await lvl('M.MIX.s.l0.proc.ins.wet');
  ok(w1 > -70, 'Einschub sounds: ' + w1.toFixed(1) + ' dB');
  r = await E(async () => { const M = window.__M, A = M.A; M.setParam('fx2.typ', 'vokal'); await new Promise((r) => setTimeout(r, 900)); return { ret: A.fxR.fx2.cur.typ, ins: M.MIX.s.l0.proc.ins.cur.typ }; });
  ok(r.ret === 'vokal' && r.ins === 'vokal', 'a new choice reaches the return and the Einschub ' + JSON.stringify(r));
  r = await E(async () => { const M = window.__M; M.setParam('xl0.ins', '0'); await new Promise((r) => setTimeout(r, 900)); const x = M.MIX.s.l0.proc; return { cur: x.ins.cur, on: M.MIX.s.l0.procOn }; });
  ok(!r.cur && !r.on, 'Keiner: the Einschub goes, the strip transparent again ' + JSON.stringify(r));
  // the budget knows them: an Einschub of Spektral-Nebel costs what FX_COST says
  r = await E(async () => { const M = window.__M; const l0 = M.fxLoad(); M.setParam('fx2.typ', 'spektral'); M.setParam('xl1.ins', 'fx2'); await new Promise((r) => setTimeout(r, 900)); const l1 = M.fxLoad(); M.setParam('xl1.ins', '0'); await new Promise((r) => setTimeout(r, 900)); return { l0, l1, l2: M.fxLoad(), lim: !!M.A.lim }; });
  ok(r.lim && Math.abs(r.l1 - r.l0 - (2 * 6.29 - 1.32)) < 0.01 && Math.abs(r.l2 - r.l0 - (6.29 - 1.32)) < 0.01, 'fxLoad: Effekt 2 from Vokal (1.32) to Spektral-Nebel (6.29) and an Einschub of it – each counts, the Einschub gone it is off the bill ' + JSON.stringify(r));
  // Formen: Effekt-Anteil from 0 makes the processor and opens the send
  r = await E(async () => { const M = window.__M, A = M.A; M.modSet('t:test', 'fx', 0.6); await new Promise((r) => setTimeout(r, 600)); return { cur: !!A.fxR.fx.cur, typ: A.fxR.fx.cur && A.fxR.fx.cur.typ }; });
  ok(r.cur && r.typ === 'netz', 'Formen · Effekt-Anteil makes Effekt 1 play ' + JSON.stringify(r));
  const r3 = await lvl('A.fxR.fx.ret');
  ok(r3 > -70, 'Effekt 1 through Formen sounds: ' + r3.toFixed(1) + ' dB');
  await E(() => window.__M.modSet('t:test', 'fx', 0));
  // the views: Pult with each layer, Geflecht, the detail of a channel and of Effekt 2
  await pg.click('#tab-mix'); await pg.waitForTimeout(1200);
  await E(() => { const X = window.__MX; X.mxSetLayer('fx2'); window.__M.setParam('xl0.ins', 'fx'); X.selectChannel('l0'); });
  await pg.waitForTimeout(800); await pg.screenshot({ path: OUT + '/pult.png' });
  await E(() => window.__MX.mxSetView('geflecht')); await pg.waitForTimeout(1500); await pg.screenshot({ path: OUT + '/geflecht.png' });
  await E(() => window.__M.setParam('fx.mix', 0.6)); await pg.waitForTimeout(1200); await pg.screenshot({ path: OUT + '/geflecht2.png' });
  await E(() => window.__MX.openDetail('l0')); await pg.waitForTimeout(1200); await pg.screenshot({ path: OUT + '/detail-l0.png', fullPage: true });
  await E(() => { const el = document.querySelector('.mxd-fo'); el && el.scrollIntoView(); }); await pg.waitForTimeout(500); await pg.screenshot({ path: OUT + '/detail-l0-formen.png' });
  await E(() => window.__MX.openDetail('fx2')); await pg.waitForTimeout(1000); await pg.screenshot({ path: OUT + '/detail-fx2.png' });
  r = await E(() => { const b = [...document.querySelectorAll('.mxd-insc button')].map((x) => x.textContent + ':' + x.getAttribute('aria-checked')); return b; });
  console.log('chips', JSON.stringify(r));
  ok(!pg.errors.length, 'no errors ' + JSON.stringify(pg.errors.slice(0, 4)));
  // phone
  const P2 = await page(b, 'phone'); await start(P2.pg); await P2.pg.click('#tab-mix'); await P2.pg.waitForTimeout(1000);
  await P2.pg.evaluate(() => { window.__M.setParam('fx2.mix', 0.5); window.__M.setParam('xfin.ins', 'fx2'); window.__MX.mxSetView('geflecht'); }); await P2.pg.waitForTimeout(1500); await P2.pg.screenshot({ path: OUT + '/phone-geflecht.png' });
  await P2.pg.evaluate(() => window.__MX.openDetail('fin')); await P2.pg.waitForTimeout(1000);
  await P2.pg.evaluate(() => { const el = document.querySelector('.mxd-ins'); el && el.scrollIntoView({ block: 'center' }); }); await P2.pg.waitForTimeout(500); await P2.pg.screenshot({ path: OUT + '/phone-einschub.png' });
  await P2.pg.evaluate(() => { const el = document.querySelector('.mxd-snds'); el && el.scrollIntoView({ block: 'center' }); }); await P2.pg.waitForTimeout(500); await P2.pg.screenshot({ path: OUT + '/phone-wege.png' });
  ok(!P2.pg.errors.length, 'phone: no errors ' + JSON.stringify(P2.pg.errors.slice(0, 4)));
  await b.close(); process.exit(0);
})();
