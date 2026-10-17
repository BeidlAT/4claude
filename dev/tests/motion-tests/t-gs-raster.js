// Sporenregen, the grid and the limits (slot gs; node t-gs-raster.js): hits are predicted in the scheduler's look-ahead
// and sound exactly on the Puls's grid – its swing included – never before the spore got there, the strike's audio
// scheduled for that very time; 1/16 up to 100 BPM, 1/8 above, or 1/8, 1/16, 1/8T, frei. Limits: one strike per Keim
// and grid point, three per grid point, about twelve a second, at most eight of its own ringing, and never a held note
// pushed out for the rain.
const { open, ok, close, rain } = require('./gs-h');
const EPS = 1e-9;
(async () => {
  const { page, errors } = await open({ cfg: { seed: 31 } });
  await page.evaluate(() => { const M = window.__M; for (const [k, v] of [['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['bor.on', false], ['v.human', 0]]) M.setParam(k, v); });
  await rain(page, { rgO: 0.7, rgK: 8, rgS: 'glo' });
  // 1 the Puls runs at 90 BPM with swing; its lane 1 steps every 1/16 (muted): the rain lands on exactly its steps
  let r = await page.evaluate(async () => {
    const M = window.__M;
    for (const [k, v] of [['seq.bpm', 90], ['seq.swing', 0.3], ['l0.on', true], ['l0.div', '0.25'], ['l0.steps', 16], ['l0.puls', 16], ['l0.prob', 1], ['xl0.mute', true]]) M.setParam(k, v);
    M.VIS.events.length = 0;
    M.seqStart();
    for (const x of [0.15, 0.35, 0.55, 0.75]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }
    window.__tilt(0.85, 0);
    await window.__sleep(500);
    // every step of the lane as the Puls pushes it (the frame draws and drops them – a poll could miss one)
    const steps = new Set();
    let arr = M.VIS.events;
    const wrap = (a) => { a.push = function (...x) { for (const e of x) if (e.kind === 'step' && e.lane === 0) steps.add(e.t); return Array.prototype.push.apply(this, x); }; return a; };
    wrap(arr);
    Object.defineProperty(M.VIS, 'events', { get: () => arr, set: (v) => { arr = wrap(v); }, configurable: true });
    window.__startsOn(); window.__collect();
    await window.__sleep(4000);
    const hits = window.__stop();
    await window.__sleep(800);   // the steps of the last strikes too (a strike waits at most three steps)
    const st = [...steps], starts = window.__starts.slice();
    window.__startsRec = false;
    const div = M.rgDiv(), A0 = { t: M.SEQ.anchorT, b: M.SEQ.anchorB, bpm: M.SEQ.bpm };
    M.seqStop();
    return { hits, st, starts, div, A0 };
  });
  const onStep = r.hits.filter((h) => r.st.some((t) => Math.abs(t - h.t) < EPS));
  ok(r.div === 0.25 && r.hits.length >= 10, 'Auto at 90 BPM: the grid is 1/16 (' + r.hits.length + ' strikes in 4 s)');
  ok(onStep.length === r.hits.length, 'every strike lies exactly on a step of the Puls (lane 1 at 1/16, swing 30 %): ' + onStep.length + '/' + r.hits.length + (onStep.length === r.hits.length ? '' : ' – off: ' + JSON.stringify(r.hits.filter((h) => !onStep.includes(h)).map((h) => [h.t, h.te]))));
  const sw = r.hits.filter((h) => { const b = r.A0.b + ((h.t - r.A0.t) * r.A0.bpm) / 60, n = b / 0.25; return Math.abs(n - Math.round(n)) > 1e-4; });
  ok(sw.length > 0 && sw.every((h) => { const sh = (0.3 * 0.25 * 30) / r.A0.bpm, b = r.A0.b + ((h.t - sh - r.A0.t) * r.A0.bpm) / 60, n = Math.round(b / 0.25); return Math.abs(b / 0.25 - n) < 1e-6 && Math.abs(n % 2) === 1; }), '   … the off-beat 16ths swung by the Puls\'s swing (' + sw.length + ' of them)');
  ok(r.hits.every((h) => h.t >= h.te - EPS && h.t - h.te < 3 * 0.1667 + 0.05), 'never before the spore got there, at most a few steps later (it waits)');
  ok(r.hits.filter((h) => h.t > h.te + 1e-3).length >= r.hits.length * 0.8, 'the spores land and wait for the grid: ' + r.hits.filter((h) => h.t > h.te + 1e-3).length + '/' + r.hits.length + ' waited');
  ok(r.hits.every((h) => r.starts.some((s) => Math.abs(s - h.t) < EPS)), 'the strike\'s audio is scheduled for exactly that time (the bell\'s oscillators start at it)');
  // 2 the other grids (the Puls standing: its clock runs on)
  const grid = async (q, bpm) => page.evaluate(async ([q, bpm]) => {
    const M = window.__M;
    M.setParam('seq.bpm', bpm); M.setParam('seq.swing', 0); M.gkSet('rgQ', q);
    await window.__sleep(300);
    window.__collect(); await window.__sleep(2500);
    const hits = window.__stop();
    return { div: M.rgDiv(), hits, bs: hits.map((h) => M.beatAt(h.t)) };
  }, [q, bpm]);
  for (const [q, bpm, d, name] of [['auto', 130, 0.5, 'Auto at 130 BPM: 1/8'], ['8', 90, 0.5, '1/8'], ['16', 130, 0.25, '1/16 (at 130 BPM)'], ['8t', 90, 1 / 3, '1/8T']]) {
    r = await grid(q, bpm);
    ok(Math.abs(r.div - d) < EPS && r.hits.length >= 4 && r.bs.every((b) => Math.abs(b / d - Math.round(b / d)) < 1e-6), name + ': every strike on a grid point (' + r.hits.length + ')');
  }
  r = await grid('frei', 90);
  ok(r.div === 0 && r.hits.length >= 4 && r.hits.every((h) => h.t === h.te), 'frei: each strike at the moment its spore reaches the Keim (' + r.hits.length + ')');
  // 3 the limits: twelve Keime in two rows, sixteen fast spores, steep
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.setParam('seq.bpm', 100); M.gkSet('rgQ', 'auto'); M.gkSet('rgN', 16); M.gkSet('rgZ', 0); M.gkSet('rgS', 'trp');
    M.RG.k.length = 0;
    for (let i = 0; i < 12; i++) { const x = 0.06 + (i % 6) * 0.16, y = i < 6 ? 0.3 : 0.7; window.__key(x, y, 'k' + i); window.__up('k' + i); }
    window.__tilt(1, 0.25);
    await window.__sleep(500);
    let vmax = 0;
    const iv = setInterval(() => { vmax = Math.max(vmax, M.RG.vs.filter((v) => v.alive).length); }, 10);
    window.__collect(); await window.__sleep(5000);
    clearInterval(iv);
    return { hits: window.__stop(), vmax };
  });
  const byKT = new Map(), byT = new Map();
  for (const h of r.hits) { const k = h.key + '@' + h.t.toFixed(9); byKT.set(k, (byKT.get(k) || 0) + 1); byT.set(h.t.toFixed(9), (byT.get(h.t.toFixed(9)) || 0) + 1); }
  let win = 0;
  const ts = r.hits.map((h) => h.t).sort((a, b) => a - b);
  for (let i = 0, j = 0; i < ts.length; i++) { while (ts[i] - ts[j] >= 1) j++; win = Math.max(win, i - j + 1); }
  ok(r.hits.length >= 30, 'a dense rain (12 Keime, 16 fast spores, steep): ' + r.hits.length + ' strikes in 5 s');
  ok([...byKT.values()].every((n) => n === 1), 'at most one strike per Keim and grid point');
  ok(Math.max(...byT.values()) <= 3, 'at most three per grid point (' + Math.max(...byT.values()) + ')');
  ok(win <= 12, 'at most twelve in any second (' + win + ')');
  ok(r.vmax <= 8, 'at most eight of its own strikes ring at once (' + r.vmax + ')');
  // 4 the voices: held notes fill the budget – the rain stays silent rather than take one of them
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__tilt(0, 0);
    M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'off');
    M.A.budgetScale = 0.01; M.applyQuality();
    const [vb] = M.getVB();
    await window.__sleep(1500);
    const held = [];
    for (let i = 0; i < 6; i++) { window.__key(0.1 + i * 0.12, 0.9, 'n' + i); held.push(M.touches.get('n' + i)); }
    await window.__sleep(100);
    const load0 = M.voiceLoad();
    window.__tilt(1, -0.3);
    const n0 = M.RG.n;
    await window.__sleep(3000);
    const o = { vb, load0, struck: M.RG.n - n0, alive: held.every((tt) => tt.voices.every((x) => x.v.alive && M.A.voices.has(x.v))), n: held.length };
    for (let i = 0; i < 6; i++) window.__up('n' + i);
    M.A.budgetScale = 1; M.applyQuality();
    window.__tilt(0, 0);
    return o;
  });
  ok(r.vb === 6 && r.load0 >= r.vb && r.struck === 0 && r.alive, 'held notes fill the voice budget (' + r.load0 + '/' + r.vb + '): the rain stays silent (' + r.struck + ' strikes), every held note sounds on');
  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
