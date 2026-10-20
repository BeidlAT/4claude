// Ruhe, live: in a silence the switch unplugs the graph (what still runs: the LFOs, the echo's loop (the hall sleeps), the
// Hexenring's processor and its drift, the compressor's detector – the master, the channel strips and the insert chains
// rest); a finger, the Bordun, the mixer's meters and a Schleife each find it plugged in before they sound; a knob
// turned in the silence wakes it (its glide keeps its time); it never wakes late.   node t-idle-live.js   env URL=<inst page> (default perfnew-inst)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { hook, analyse, parts } = require('./inv');
const URL = process.env.URL || 'http://127.0.0.1:8790/perfnew-inst/index.html';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(hook);
  const pg = await ctx.newPage(), errors = [];
  pg.on('pageerror', (e) => errors.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error' || /zu spät/.test(m.text())) errors.push(m.text()); });
  await pg.goto(URL); await pg.waitForFunction(() => !!window.__M);
  await pg.click('#btnStart');
  const until = (fn, s) => pg.evaluate(async ([f, s]) => { const t0 = performance.now(), F = new Function('M', 'return ' + f); while (performance.now() - t0 < s * 1000) { if (F(window.__M)) return +((performance.now() - t0) / 1000).toFixed(1); await new Promise((r) => setTimeout(r, 100)); } return -1; }, [fn, s]);
  const peak = (ms) => pg.evaluate(async (ms) => { const A = window.__M.A, b = new Float32Array(2048); let pk = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { A.analyser.getFloatTimeDomainData(b); for (const x of b) pk = Math.max(pk, Math.abs(x)); await new Promise((r) => setTimeout(r, 30)); } return pk; }, ms);
  // 1 the silence after the sound starts
  let t = await until('M.IDLE.on', 30);
  ok(t > 0, `the switch unplugs the graph in a silence (after ${t} s; the hall ${await pg.evaluate(() => window.__M.P['rev.size'])} s needs its whole response of zeros)`);
  let a = await pg.evaluate(analyse), q = await pg.evaluate(parts);
  ok(!q.master && !q.strips.length && !q.chains && !q.chainsPulled && q.echo && !q.hall && !q.hxStrip, `while it sleeps the master, the strips (${q.strips.join(' ') || 'none'} busy, ${q.stripsPulled.join(' ') || 'none'} pulled) and the chains (${q.chainsPulled} pulled) rest, the echo's loop runs on, the hall sleeps (${q.echo}/${q.hall}): busy ${JSON.stringify(a.busy)}, pulled ${a.nPulled} of ${Object.values(a.made).reduce((x, y) => x + y, 0)} nodes`);
  // 2 a finger: plugged in at once, heard
  let r = await pg.evaluate(async () => { const M = window.__M; M.onDown({ pointerId: 'p', pt: { x: 0.4, y: 0.5, px: 300, py: 300 } }); const on = M.IDLE.on; await new Promise((r) => setTimeout(r, 400)); M.onUp({ pointerId: 'p' }); return { on, late: M.IDLE.late }; });
  const pk = await peak(400);
  ok(!r.on && r.late === 0 && pk > 0.01, `a finger plugs it in before its voice starts (asleep after the touch: ${r.on}), heard (peak ${pk.toFixed(3)})`);
  t = await until('M.IDLE.on', 40);
  ok(t > 0, `…and after the note and its echo and hall have died to exactly zero it sleeps again (${t} s)`);
  // 3 the Bordun
  r = await pg.evaluate(async () => { const M = window.__M; M.setParam('bor.on', true); const on = M.IDLE.on; await new Promise((r) => setTimeout(r, 2500)); return { on }; });
  const pb = await peak(500);
  ok(!r.on && pb > 0.005, `the Bordun plugs it in (asleep after: ${r.on}), heard (peak ${pb.toFixed(3)})`);
  await pg.evaluate(() => window.__M.setParam('bor.on', false));
  t = await until('M.IDLE.on', 45);
  ok(t > 0, `the Bordun off: asleep again after its fade, echo and hall (${t} s)`);
  // 4 the mixer open: the meters read on, the switch still works
  // (opening it makes the meters' filters – their params set wake the graph, which falls asleep again with it open)
  await pg.evaluate(() => window.__M.openPanel('mix'));
  t = await until('M.IDLE.on', 40);
  r = await pg.evaluate(async () => { const M = window.__M; await new Promise((r) => setTimeout(r, 500)); return { meter: M.MIX.meter, on: M.IDLE.on, pk: M.A.mm ? M.A.mm.pk[0] : -1 }; });
  ok(t > 0 && r.meter && r.on && r.pk === 0, `the mixer's meters on while it sleeps (asleep again after ${t} s): they read silence (${r.pk})`);
  r = await pg.evaluate(async () => { const M = window.__M; M.onDown({ pointerId: 'q', pt: { x: 0.6, y: 0.5, px: 500, py: 300 } }); await new Promise((r) => setTimeout(r, 500)); const pk = M.A.mm.pk[0]; M.onUp({ pointerId: 'q' }); return { pk, late: M.IDLE.late }; });
  ok(r.pk > 0.005 && r.late === 0, `a note with the mixer open: its meter moves (${r.pk.toFixed(3)})`);
  await pg.evaluate(() => window.__M.closePanel && window.__M.closePanel());
  t = await until('M.IDLE.on', 45);
  // a knob turned in the silence: the graph wakes before the glide starts, and the glide keeps its time
  r = await pg.evaluate(async () => { const M = window.__M, c = M.A.chains[0].flt.frequency, was = M.IDLE.on; M.setParam('flt.freq', M.P['flt.freq'] > 1000 ? 600 : 2400); const on = M.IDLE.on; await new Promise((r) => setTimeout(r, 600)); return { was, on, v: c.value, want: M.P['flt.freq'] }; });
  ok(r.was && !r.on && Math.abs(r.v - r.want) / r.want < 0.02, `a knob turned while it sleeps wakes it first (asleep after: ${r.on}), the cutoff glides to its value in time (${r.v.toFixed(0)} of ${r.want} Hz after 0.6 s)`);
  t = await until('M.IDLE.on', 45);
  ok(t > 0, `…and it sleeps again once the glide has ended (${t} s)`);
  // 5 a Schleife: harvested, it plays from the processor through its strip
  r = await pg.evaluate(async () => {
    const M = window.__M, A = M.A, f = M.N.notes[4].f;
    for (let i = 0; i < 6; i++) { const v = M.playNote('glo', A.ctx.currentTime + 0.05 + i * 0.25, f * (1 + (i % 3) * 0.25), 0.5, 0.7, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), 250 * i + 200); }
    await new Promise((r) => setTimeout(r, 2200));
    M.hxKorb(null); await new Promise((r) => setTimeout(r, 300));
    const n = M.HX.loops.size, on = M.IDLE.on;
    return { n, on };
  });
  const pl = await peak(1500);
  ok(r.n >= 1 && !r.on && pl > 0.005, `a Schleife (harvested: ${r.n}) plays while the graph is plugged in (peak ${pl.toFixed(3)})`);
  await pg.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxClear(L.id, null, 0.005); });
  t = await until('M.IDLE.on && !window.__M.HX.loops.size', 50);
  ok(t > 0, `the Schleife cleared: asleep again (${t} s)`);
  // (its first pass played through out 1 and the chain's copy: those run on, their rounding kept – the master rests)
  a = await pg.evaluate(analyse); q = await pg.evaluate(parts);
  r = await pg.evaluate(() => ({ out1: window.__M.HX.out1, off: window.__M.IDLE.hxOff }));
  ok(!q.master && r.off, `…and the master rests behind the Hexenring's gate (out 1 used: ${r.out1}; its strip ${q.hxStrip ? 'runs on' : 'rests'}, chain copies busy ${q.chains}), busy ${a.nBusy} of ${a.nPulled} pulled`);
  r = await pg.evaluate(() => ({ late: window.__M.IDLE.late, n: window.__M.IDLE.n }));
  ok(r.late === 0, `never woken late (${r.n} sleeps)`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await b.close();
})().catch((e) => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; });
