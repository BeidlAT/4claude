// Ruhe (the idle switch) changes no sample. Offline renders of a phrase, a silence long enough for the switch to unplug
// the graph, and a phrase again – the switch driven every 25 ms of the render's clock, as tick() does live – against
// the same build without it and against the build before it (OLD).
//   node t-idle-parity.js     env OLD=<slot> (default pe341c1b-inst: the build before Ruhe), NEW=<slot>, ONLY=<name part>
// Chromium's offline render is bit-reproducible only where at most two signals meet: a node or a param that sums three
// or more (unison oscillators, the echo's wow and flutter on top of its delay time, a ping-pong's crossed feedback) adds
// them in an order that changes from one context to the next (a hash of addresses) – the same build twice differs there
// (measured: −80 … −140 dB). So:
//  · exact cases (max |difference| 0 required): voices of one oscillator each, the echo without wow and ping-pong, the
//    hall, the mixer's EQ, width, balance, saturation, the compressor driven hard, a frozen echo – everything the switch
//    unplugs and plugs in again;
//  · the presets with their own engines, and knobs turned or a slow ramp running in the silence (their sums turn
//    order-dependent): after the wake the renders differ no more than before the switch engaged, or than the old
//    build's two renders do (a step at the wake – a glide that waited for it – would be the switch's).
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const OLD = process.env.OLD || 'pe341c1b-inst', NEW = process.env.NEW || 'perfnew-inst';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const EXACT = { 'dly.wow': 0, 'dly.pp': 0, 'v.layer': 'off', 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false };
// ph: phrases [from, to] s (a note every 0.45 s, held 0.35 s); at: actions; idle: the switch must engage; test: one
// oscillator per note (exact cases), else the patch's own engine
const CASES = [
  { name: 'echo (no wow, no ping-pong) at 60 %, no hall', test: true, extra: Object.assign({}, EXACT, { 'rev.mix': 0, 'xdly.rev': 0, 'dly.fb': 0.6 }), dur: 42, ph: [[0.1, 3], [33, 36]], idle: true },
  // (the sum of the chain, the echo and the hall would add three: heard here is the hall's return alone, which the echo feeds)
  { name: 'the echo into the hall, the hall heard alone (the echo sleeps, the hall runs on)', test: true, extra: Object.assign({}, EXACT, { 'rev.mix': 0 }), dur: 42, ph: [[0.1, 3], [33, 36]], idle: true,
    tap: 'A.monSt.disconnect(); A.revRet.connect(ctx.destination);' },
  { name: 'hall 5 s, no echo', test: true, extra: Object.assign({}, EXACT, { 'dly.mix': 0 }), dur: 30, ph: [[0.1, 3], [21, 24]], idle: true },
  { name: 'hall 12 s with its pre-delay, no echo', test: true, extra: Object.assign({}, EXACT, { 'dly.mix': 0, 'rev.size': 12, 'rev.pre': 0.3 }), dur: 42, ph: [[0.1, 3], [32, 35]], idle: true },
  { name: 'mixer: EQ, saturation and width on the echo, width and balance on Klang, master EQ and width, compressor hard', test: true, dur: 30, ph: [[0.1, 3], [21, 24]], idle: true,
    extra: Object.assign({}, EXACT, { 'rev.mix': 0, 'xdly.rev': 0, 'xdly.lo': 4, 'xdly.hi': -3, 'xdly.sat': 0.4, 'xdly.wid': 1.5, 'xfin.wid': 0.6, 'xfin.pan': -0.3, 'mst.low': 3, 'mst.high': -2, 'mst.wid': 1.3, 'mst.comp': 1, 'mst.vol': 6, 'xfin.vol': 6 }) },
  { name: 'mixer: the hall return EQ\'d, Klang straight to the sum, its echo send apart (the chain copy)', test: true, dur: 30, ph: [[0.1, 3], [21, 24]], idle: true,
    extra: Object.assign({}, EXACT, { 'dly.mix': 0, 'xrev.mid': 5, 'xrev.lc': 120, 'xrev.hc': 6000, 'xfin.route': 'dir', 'xfin.rev': 0.5 }) },
  { name: 'a frozen echo, thawed later', test: true, extra: Object.assign({}, EXACT, { 'rev.mix': 0, 'xdly.rev': 0 }), dur: 34, ph: [[0.1, 3], [25, 28]], at: [[2.5, 'freeze'], [8, 'thaw']], idle: true },
  // the owner's options (not the default): the hall, the echo asleep too – what moves, measured
  { name: 'option: the hall asleep too (IDLE.hall)', test: true, opt: 'hall', extra: Object.assign({}, EXACT, { 'dly.mix': 0 }), dur: 30, ph: [[0.1, 3], [21, 24]], idle: true, bound: 3.2e-5 },
  { name: 'option: the echo asleep too (IDLE.echo), its time moving (Leiern)', test: true, opt: 'echo', extra: Object.assign({}, EXACT, { 'dly.wow': 0.35, 'rev.mix': 0, 'xdly.rev': 0 }), dur: 42, ph: [[0.1, 3], [33, 36]], idle: true, bound: 3e-3 },
  // knobs turned in the silence (a cutoff, a strip's level, the master's EQ): the graph wakes before their glides start
  { name: 'knobs turned in the silence (the chain\'s cutoff, Klang\'s balance, the master\'s bass)', test: true, spread: true, extra: Object.assign({}, EXACT), dur: 40, ph: [[0.1, 3], [31, 34]], idle: true,
    at: [[27, "js:M.setParam('flt.freq', 700); M.setParam('xfin.pan', -0.4); M.setParam('mst.low', 4);"]] },
  // a slow move scheduled before the silence and running through it (a ramp of 20 s): the graph does not fall asleep before
  // it has ended
  { name: 'a ramp of 20 s through the silence (the chain\'s cutoff)', test: true, spread: true, extra: Object.assign({}, EXACT), dur: 40, ph: [[0.1, 3], [33, 36]], idle: true,
    at: [[4, 'js:const p = M.A.chains[0].flt.frequency, t = ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(3000, t); p.linearRampToValueAtTime(400, t + 20);']] },
  { name: 'echo at 105 % (never silent: never idle)', test: true, extra: Object.assign({}, EXACT, { 'rev.mix': 0, 'xdly.rev': 0, 'dly.fb': 1.05 }), dur: 20, ph: [[0.1, 2], [15, 17]], idle: false },
  // the presets' own engines (sums of three or more: compared with the old build's own spread)
  { name: 'default patch (Nebel)', dur: 34, ph: [[0.1, 3], [24, 27]], idle: true },
  { name: 'Tiefsee without its Bordun and Puls (hall 11 s, echo 0.55 with wow)', preset: 'tiefsee', extra: { 'bor.on': false, 'l0.on': false, 'l3.on': false }, dur: 80, ph: [[0.1, 3], [69, 72]], idle: true },
  { name: 'Tempelglocken (ping-pong echo, phaser)', preset: 'tempel', extra: { 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false }, dur: 52, ph: [[0.1, 3], [41, 44]], idle: true },
  { name: 'the Bordun after the silence', dur: 32, ph: [[0.1, 3]], at: [[23, 'bor']], idle: true },
];
async function render(url, cs, drive) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const { page, errors } = await openInst(b, 'http://127.0.0.1:8790/' + url + '/index.html');
    const r = await page.evaluate(async ([cs, drive]) => {
      const M = window.__M, sr = 44100, dur = cs.dur;
      const seed = (s) => { let x = s; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; };
      const params = Object.assign({ 'dev.q': '1', 'dev.lat': 'std' }, cs.preset ? M.PRESETS.find((p) => p.key === cs.preset).v : {}, cs.extra || {});
      seed(4242);
      const ctx = await window.__off(sr, dur, params);
      seed(777);
      if (cs.tap) (new Function('M', 'A', 'ctx', cs.tap))(M, M.A, ctx);
      const I = M.IDLE, log = [], q = (t) => Math.round(t * sr / 128) * 128 / sr;
      if (I && cs.opt) I[cs.opt] = true;
      const ev = new Map(), add = (t, f) => { const k = q(t); if (!ev.has(k)) ev.set(k, []); ev.get(k).push(f); };
      const vs = [];
      // a note: the patch's engine (playNote), or one sawtooth with a short envelope – a Voice all the same (its start
      // wakes the switch, it counts while it sounds)
      const test = (t, f) => {
        const v = new M.Voice('test'); M.A.voices.add(v);
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = 0;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.setValueAtTime(0.3, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.36);
        o.connect(g).connect(M.stripIn('fin')); o.start(t); o.stop(t + 0.4);
        o.onended = () => {}; vs.push([v, t + 0.45, true]);
      };
      let j = 0;
      for (const [a, z] of cs.ph) for (let t = a; t < z; t += 0.45, j++) {
        const jj = j;
        add(t, () => {
          const n = M.noteAt(((jj * 0.37) % 1) * 0.9 + 0.05);
          if (cs.test) { test(ctx.currentTime, 110 * Math.pow(2, (jj * 5 % 12) / 12)); return; }
          const v = M.playNote(M.P['v.eng'], ctx.currentTime, n.f, 0.3 + 0.5 * ((jj * 0.61) % 1), 0.75, { pan: ((jj % 5) - 2) * 0.2 }); if (v) vs.push([v, ctx.currentTime + 0.35]);
        });
      }
      for (const [t, k] of cs.at || []) add(t, () => { if (k === 'bor') { M.P['bor.on'] = true; M.updBordun(); } if (k === 'freeze') M.setFreeze(true); if (k === 'thaw') M.setFreeze(false); if (k.startsWith('js:')) (new Function('M', 'ctx', k.slice(3)))(M, ctx); });
      for (let t = 0.025; t < dur - 0.05; t += 0.025) add(t, () => {});
      for (const [t, fs] of ev) ctx.suspend(t).then(() => {
        const was = I ? I.on : false;   // (before the moment's actions: a voice or a knob wakes the switch itself)
        for (const f of fs) f();
        for (const x of vs) if (x[1] != null && ctx.currentTime >= x[1]) { if (x[2]) M.A.voices.delete(x[0]); else if (x[0].release) x[0].release(); x[1] = null; }
        // (a voice's clean-up runs on a wall-clock timer, and this render runs many times faster than the clock: done here
        // on the render's clock, 150 ms after the voice's end as live – the same in every build and mode)
        for (const v of [...M.A.voices]) if (v.endAt < ctx.currentTime - 0.15) v.cleanup();
        if (drive && I) { M.idleTick(true); if (I.on !== was) log.push([+ctx.currentTime.toFixed(2), I.on ? 'idle' : 'wake']); }
        ctx.resume();
      });
      const buf = await ctx.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let e = 0; for (let i = 0; i < L.length; i++) e += L[i] * L[i] + R[i] * R[i];
      return { L: Array.from(L), R: Array.from(R), e, log, n: I ? I.n : null, late: I ? I.late : null };
    }, [cs, drive]);
    r.errors = errors;
    return r;
  } finally { await b.close(); }
}
const cmp = (a, b, t0 = 0, t1 = Infinity) => { let md = 0, at = -1; for (const c of ['L', 'R']) for (let i = Math.floor(t0 * 44100); i < Math.min(a[c].length, t1 * 44100); i++) { const d = Math.abs(a[c][i] - b[c][i]); if (d > md) { md = d; at = i; } } return { md, at }; };
const db = (x) => (x.md ? (20 * Math.log10(x.md)).toFixed(1) + ' dB at ' + (x.at / 44100).toFixed(2) + ' s' : '0');
(async () => {
  for (const cs of CASES) {
    if (process.env.ONLY && !cs.name.includes(process.env.ONLY)) continue;
    const o = await render(OLD, cs, false), d = await render(NEW, cs, true);
    const errs = o.errors.concat(d.errors);
    if (cs.test && !cs.opt && !cs.spread) {
      const n = await render(NEW, cs, false), a = cmp(o, n), c = cmp(n, d), e = cmp(o, d);
      console.log(`INFO ${cs.name}: energy ${o.e.toFixed(1)}; the switch ${JSON.stringify(d.log)}; old↔new ${db(a)}, new↔new with Ruhe ${db(c)}, old↔Ruhe ${db(e)}`);
      ok(a.md === 0 && c.md === 0 && e.md === 0, `${cs.name}: every sample identical – the old build, the new one, the new one with the switch (max |d| ${a.md} / ${c.md} / ${e.md})`);
      errs.push(...n.errors);
    } else if (cs.opt) {   // (not the default: what the owner would choose – the rounding grid moved by the pause)
      const x = cmp(o, d);
      console.log(`INFO ${cs.name}: the switch ${JSON.stringify(d.log)}; old↔Ruhe ${db(x)}`);
      ok(x.md < cs.bound, `${cs.name}: its own grid moved by the pause – a difference of rounding only (${db(x)}, under ${(20 * Math.log10(cs.bound)).toFixed(0)} dB)`);
    } else {
      const o2 = await render(OLD, cs, false), s = cmp(o, o2);
      const tI = (d.log.find((x) => x[1] === 'idle') || [cs.dur])[0], tW = (d.log.find((x) => x[1] === 'wake' && x[0] > tI) || [cs.dur])[0];
      const before = Math.max(cmp(o, d, 0, tI).md, cmp(o2, d, 0, tI).md), after = Math.max(cmp(o, d, tW).md, cmp(o2, d, tW).md);
      const L = (x) => (20 * Math.log10(x || 1e-30)).toFixed(1);
      console.log(`INFO ${cs.name}: energy ${o.e.toFixed(1)}; the switch ${JSON.stringify(d.log)}; old↔old ${db(s)} (Chromium's summing order); old↔Ruhe before the switch ${L(before)} dB, after the wake ${L(after)} dB`);
      ok((tW < cs.dur || !cs.idle) && (after <= Math.max(before, s.md) * 2 || after < 1e-6), `${cs.name}: after the wake (at ${tW} s) the render differs from the old build no more than before the switch or than the old build from itself (${L(after)} against ${L(Math.max(before, s.md))} dB)`);
    }
    ok(cs.idle ? d.n >= 1 : d.n === 0, `${cs.name}: the switch ${cs.idle ? 'unplugged the graph in the silence' : 'never engaged'} (${d.n} times)`);
    ok(d.late === 0 && !errs.length, `${cs.name}: no late wake (${d.late}), no page errors ${errs.slice(0, 2).join(' | ')}`);
  }
})().catch((e) => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; });
