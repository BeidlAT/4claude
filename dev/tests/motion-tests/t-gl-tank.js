// The Tank (slot gl): the Ladung switches Puls lanes in one after another – the lanes the arrangement has off, or with
// the Puls stopped all of them, the Puls started for them – and takes them out again as it drains, in reverse and
// without flicker, until exactly the arrangement is back (the patch never changes); the player stopping the Puls wins;
// switched off, or Gestik off, it gives everything back at once.   node t-gl-tank.js
const { open, ok, close, probes, M, play, gestik } = require('./gl-h');
const track = (page) => page.evaluate(() => {
  const M = window.__M; window.__tk = []; window.__lanes = new Set();
  clearInterval(window.__ti);
  window.__ti = setInterval(() => {
    const k = (M.SEQ.tk ? M.SEQ.tk.map((x) => (x ? 1 : 0)).join('') : '-') + (M.SEQ.on ? '' : ' stop');
    const L = window.__tk;
    if (!L.length || L[L.length - 1].k !== k) L.push({ k, lvl: +M.LAD.lvl.toFixed(3), t: Math.round(performance.now()) });
    for (const e of M.VIS.events) if (e.kind === 'hit' && e.lane != null) window.__lanes.add(e.lane);
  }, 30);
});
const tracked = (page) => page.evaluate(() => { clearInterval(window.__ti); return { seq: window.__tk.map((x) => x.k), lv: window.__tk, lanes: [...window.__lanes].sort() }; });
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await probes(page);
  await gestik(page);
  // an arrangement: lane 1 on, lanes 2–4 off (all with pulses), 120 BPM
  await page.evaluate(() => {
    const M = window.__M, set = (k, v) => M.setParam(k, v);
    set('seq.bpm', 120);
    for (let i = 0; i < 4; i++) { set('l' + i + '.on', i === 0); set('l' + i + '.puls', 3 + i); set('l' + i + '.steps', 8); set('l' + i + '.prob', 1); set('l' + i + '.div', '16'); }
  });
  const P0 = await page.evaluate(() => window.__g.patch());
  // off by default
  await page.evaluate(() => window.__M.seqStart());
  await track(page);
  await play(page, 3, M.shake(2, 16, 5, 0.3));
  let r = await tracked(page);
  ok(r.seq.length === 1 && r.seq[0] === '-' && r.lanes.join() === '0', 'the Tank is off by default: the Ladung adds no lane (only lane 1 plays)');
  // on: lanes come in one after another as it charges
  await page.evaluate(() => { const M = window.__M; M.gkSet('tank', true); M.GK.R.st.lad = 0; });
  await play(page, 0.6, M.hold(45));
  await track(page);
  await play(page, 3.2, M.shake(2.6, 14, 5, 0.3));
  const up = await tracked(page);
  ok(up.seq.slice(0, 4).join(' ') === '- 1100 1110 1111', 'charging, the lanes the arrangement has off come in one after another: ' + up.seq.join(' → '));
  const th = up.lv.slice(1, 4).map((x) => x.lvl);
  ok(th[0] >= 0.12 && th[0] < 0.2 && th[1] >= 0.353 && th[1] < 0.43 && th[2] >= 0.587 && th[2] < 0.66, 'at 12 %, 35 %, 59 % of the charge (' + th.map((x) => Math.round(x * 100) + ' %').join(', ') + ')');
  ok(up.lanes.join() === '0,1,2,3', 'the added lanes really play (hits on lanes ' + up.lanes.map((x) => x + 1).join(', ') + ')');
  // draining: out again in reverse, without flicker, back to exactly the arrangement
  await track(page);
  await play(page, 9, M.hold(45));
  const dn = await tracked(page);
  ok(dn.seq.join(' ') === '1111 1110 1100 -', 'draining, they leave in reverse, each once: ' + dn.seq.join(' → '));
  const P1 = await page.evaluate(() => window.__g.patch());
  ok(P1 === P0 && await page.evaluate(() => window.__M.SEQ.on && window.__M.SEQ.tk === null), 'drained: exactly the arrangement – SEQ.tk gone, the Puls running as before, the patch unchanged');
  // the Puls stopped: the Tank starts it for its lanes – all four, from the first – and stops it when drained
  await page.evaluate(() => { const M = window.__M; M.seqStop(); M.GK.R.st.lad = 0; });
  await play(page, 0.5, M.hold(45));
  await track(page);
  await play(page, 3.2, M.shake(2.6, 14, 5, 0.3));
  const st = await tracked(page);
  ok(st.seq.slice(0, 2).join(' ') === '- stop 1000' && st.seq.includes('1100') && st.seq[st.seq.length - 1] === '1111', 'the Puls stopped: the Tank starts it, lane after lane from the first (' + st.seq.join(' → ') + ')');
  await track(page);
  await play(page, 9, M.hold(45));
  const st2 = await tracked(page);
  ok(st2.seq[st2.seq.length - 1] === '- stop' && await page.evaluate(() => !window.__M.SEQ.on && !window.__M.LAD.tStart), 'drained: the Puls stops again (' + st2.seq.join(' → ') + ')');
  ok(await page.evaluate(() => window.__g.patch()) === P0, 'the patch is still unchanged');
  // the player stops the Puls the Tank started: it stays stopped while charged
  await play(page, 3, M.shake(2.4, 14, 5, 0.3));
  const run1 = await page.evaluate(() => ({ on: window.__M.SEQ.on, ts: window.__M.LAD.tStart }));
  await page.click('#btnPuls');
  await play(page, 2.2, M.shake(1.8, 14, 5, 0.1));
  const usr = await page.evaluate(() => ({ on: window.__M.SEQ.on, tk: window.__M.SEQ.tk, lvl: window.__M.LAD.lvl }));
  ok(run1.on && run1.ts && !usr.on && usr.tk === null && usr.lvl > 0.5, 'the player stops the Puls the Tank had started: it stays stopped, though still charged (' + usr.lvl.toFixed(2) + ')');
  await page.evaluate(() => { window.__M.GK.R.st.lad = 0; });
  await play(page, 0.8, M.hold(45));
  // switched off while it holds lanes: all back at once
  await page.evaluate(() => window.__M.seqStart());
  await play(page, 3, M.shake(2.4, 14, 5, 0.3));
  const held = await page.evaluate(() => (window.__M.SEQ.tk || []).filter(Boolean).length);
  await page.evaluate(() => window.__M.gkSet('tank', false));
  await play(page, 0.3, M.hold(45));
  const offr = await page.evaluate(() => ({ tk: window.__M.SEQ.tk, on: window.__M.SEQ.on, n: window.__M.LAD.tk }));
  ok(held === 4 && offr.tk === null && offr.on && offr.n === 0, 'Tank switched off while it holds 3 extra lanes: the arrangement is back at once, the Puls plays on');
  // asleep while the Tank runs a Puls it started: the Puls ends with its bar, and waking brings back the arrangement's
  // stopped Puls (the Tank rests until drained)
  await page.evaluate(() => { const M = window.__M; M.seqStop(); M.gkSet('tank', true); M.GK.R.st.lad = 0; });
  await play(page, 0.5, M.hold(45));
  await play(page, 3, M.shake(2.4, 14, 5, 0.3));
  const z0 = await page.evaluate(() => ({ on: window.__M.SEQ.on, ts: window.__M.LAD.tStart, tk: window.__M.LAD.tk }));
  await play(page, 2.4, M.faceDown(45));
  await play(page, 2.4, M.hold(180));
  const z1 = await page.evaluate(() => ({ slp: window.__M.SLP.on, on: window.__M.SEQ.on, was: window.__M.SLP.pulsWas }));
  await play(page, 1.6, M.faceUp(45));
  await play(page, 6, M.hold(45));
  const z2 = await page.evaluate(() => ({ slp: window.__M.SLP.on, on: window.__M.SEQ.on, tk: window.__M.SEQ.tk, n: window.__M.LAD.tk }));
  ok(z0.on && z0.ts && z0.tk >= 3 && z1.slp && !z1.on && !z1.was && !z2.slp && !z2.on && z2.tk === null && z2.n === 0, 'asleep while the Tank runs the Puls it started: it ends with its bar; awake, the arrangement’s stopped Puls stays stopped, the Tank’s lanes are gone');
  await page.evaluate(() => { window.__M.GK.R.st.lad = 0; });
  // Gestik off while the Tank started the Puls: stopped again, nothing left
  await page.evaluate(() => { const M = window.__M; M.seqStop(); M.gkSet('tank', true); M.GK.R.st.lad = 0; });
  await play(page, 0.5, M.hold(45));
  await play(page, 3, M.shake(2.4, 14, 5, 0.3));
  const b4 = await page.evaluate(() => ({ on: window.__M.SEQ.on, ts: window.__M.LAD.tStart }));
  await page.evaluate(() => window.__M.gkDisable());
  const aft = await page.evaluate(() => ({ on: window.__M.SEQ.on, tk: window.__M.SEQ.tk, n: window.__M.LAD.tk, ico: document.querySelector('#btnGk').hidden }));
  ok(b4.on && b4.ts && !aft.on && aft.tk === null && aft.n === 0 && aft.ico, 'Gestik switched off while the Tank runs the Puls: stopped, no lane left, the symbol gone');
  ok(await page.evaluate(() => window.__g.patch()) === P0, 'and the patch never changed');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
