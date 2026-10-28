// (owner, 28.10.2026, PC log: the only dropouts of 20 s fell together with the Werk-Rahmen's first boot mid-performance)
// a computer boots the realm early – in the first quiet moment after „Klang starten“, its buffers warmed – and never
// while voices sound (a dense arpeggio from the start: the boot waits for the silence after it); the werklog tells the
// boot's phases; the audio thread's own watch (gap / block) stands in the Leistungsbericht.   node t-hx-preboot.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  // 1. quiet after the start: booted within a few seconds, warmed
  const A1 = await G.open({ w: 1440, h: 900 });
  const q = await A1.page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep, o = { t: [] };
    const t0 = performance.now();
    for (let i = 0; i < 120 && M.HXW.st !== 'ok'; i++) await sl(100);
    o.bootS = +((performance.now() - t0) / 1000).toFixed(1); o.st = M.HXW.st;
    await sl(2500);
    o.log = (M.HXW.log || []).map((x) => (Array.isArray(x) ? x.join(' ') : String(x))).filter((x) => /vorab|rahmen|warm/.test(x));
    o.warm = !!(M.HXW.sr) || o.log.some((x) => /warm/.test(x));
    o.thr = M.HX.thr || null;
    M.lmStart(); await sl(1500); M.lmStop && M.lmStop();
    o.rep = (document.querySelector('#lmOut, .lm-out, textarea') || {}).value || (M.LM && M.LM.res) || '';
    return o;
  });
  console.log(JSON.stringify(q).slice(0, 600));
  ok(q.st === 'ok' && q.bootS < 8, `quiet after the start: the Werk-Rahmen boots by itself (after ${q.bootS} s)`);
  ok(q.log.some((x) => /vorab/.test(x)) && q.log.some((x) => /rahmen-start/.test(x)) && q.log.some((x) => /rahmen-ok:(srcdoc|url):\d+ms/.test(x)), `…the werklog tells its phases (${q.log.join(' | ')})`);
  ok(!A1.errors.length, 'no page errors ' + A1.errors.slice(0, 3).join(' | '));
  await A1.page.close();
  // 2. playing from the start: no boot while voices sound; booted in the silence after
  const A2 = await G.open({ w: 1440, h: 900 });
  const p = await A2.page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    const notes = M.N.notes, f0 = notes[Math.floor(notes.length / 2)].f;
    let next = A.ctx.currentTime + 0.05, step = 0; const t0 = performance.now(), seen = new Set();
    while (performance.now() - t0 < 12000) {   // (12 s: past the 2.5-s first look and three of its retries)
      const now = A.ctx.currentTime;
      while (next < now + 0.1) { M.hit('klb', next, f0 * Math.pow(2, (step % 5) * 2 / 12), 0.5, 0.7, { gate: 0.2 }); next += 0.2; step++; }
      seen.add(M.HXW.st || '-'); await sl(25);
    }
    o.during = [...seen]; o.voicesEnd = A.voices.size;
    for (let i = 0; i < 100 && A.voices.size; i++) await sl(100);   // (the Kalimba rings out)
    const t1 = performance.now();
    for (let i = 0; i < 120 && M.HXW.st !== 'ok'; i++) await sl(100);
    o.afterS = +((performance.now() - t1) / 1000).toFixed(1); o.st = M.HXW.st;
    o.log = (M.HXW.log || []).map((x) => (Array.isArray(x) ? x.join(' ') : String(x))).filter((x) => /rahmen-start/.test(x));
    return o;
  });
  console.log(JSON.stringify(p));
  ok(p.during.length === 1 && p.during[0] === '-' , `playing from the start: no boot while voices sound (states seen: ${p.during.join(',')})`);
  ok(p.st === 'ok' && p.afterS < 5 && p.log.every((x) => !/stimmen/.test(x)), `…booted in the silence after (${p.afterS} s; ${p.log.join(' | ')})`);
  ok(!A2.errors.length, 'no page errors ' + A2.errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
