// Hexenring – the Werk-Rahmen (SPEC §8; tests §22): a hidden frame of the page itself (?werk=1) that renders offline.
//  1 it boots render-only (no UI built, no storage writes, its own realm) and answers on its port; ping
//  2 isolation – the port of ideas/check-engineer-experiments/c1-swap.js: while it renders Gong, Gespinst, Elmsfeuer,
//    Jahresring and Rhizom jobs, the live instrument keeps every voice (a full budget of held notes: none stolen), its
//    Gespinst web, its Rhizom charges still to come, its Jahresring age and A.elmDrift; the live audio callback's gaps
//    (a headless check) are not more frequent while it renders
//  3 determinism per source: a phrase rendered twice from the same pass seed differs by ≤ −100 dB (all 28 sources);
//    another seed renders another performance (INFO); the render's own time (the Werk-Rahmen's CPU, not voices)
//  4 the fallback: a frame that cannot boot – the bake is off, a new loop follows the live chain and the card says so
//   node t-hx-werk.js        env: ENGS=gng,kor (a subset for 3), Q=3 (the level)
const H = require('./hx-h');
const { ok } = H;
const ALL = ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch', 'gng', 'klb', 'obt', 'stm', 'swm', 'tie', 'trp', 'hlm', 'rnk', 'elm', 'jrg', 'hrz', 'mdr', 'boe', 'amo', 'gsp', 'rhz', 'shn', 'khl', 'zpf', 'glt'];
const ENGS = process.env.ENGS ? process.env.ENGS.split(',') : ALL, QL = process.env.Q || '3';
const GAP_SRC = `class HxGap extends AudioWorkletProcessor {
  constructor() { super(); this.last = 0; this.g = 0; this.n = 0; this.port.onmessage = () => { this.port.postMessage({ g: this.g, n: this.n }); this.g = 0; this.n = 0; }; }
  process() { const t = Date.now(); if (this.last && t - this.last > 30) this.g++; this.last = t; this.n++; return true; }
}
registerProcessor('hx-gap', HxGap);`;
(async () => {
  const { page, errors } = await H.open({});
  const ev = (fn, a) => page.evaluate(fn, a);

  // ---------- 1 · boot ----------
  let r = await ev(async () => {
    const M = window.__M, t0 = performance.now(), okk = await M.hxWerk(), ms = performance.now() - t0;
    const f = M.HXW.frame, w = f && f.contentWindow, cm = w && w.__M;
    const p = await M.hxwCall('ping', {});
    return { okk, ms, st: M.HXW.st, ping: !!(p && p.pong), hidden: !!(f && f.hidden), werk: !!(cm && cm.HXW.on), ctx: !!(cm && cm.A.ctx), started: !!(cm && cm.A.started), rail: !!(w && w.document.querySelector('#hxRail') && !w.document.querySelector('#hxRail').hidden),
      ls: w ? (() => { try { w.localStorage.setItem('hx.werk.probe', '1'); const v = w.localStorage.getItem('hx.werk.probe'); w.localStorage.removeItem('hx.werk.probe'); return v; } catch (e) { return 'x'; } })() : null,
      store: cm ? cm.store.set('hx.werk.t', '1') : null, midi: cm ? cm.MIDI.state : null, gk: cm ? !!cm.GK.on : null };
  });
  ok(r.okk && r.st === 'ok' && r.ping, `the Werk-Rahmen boots and answers on its port (${r.ms.toFixed(0)} ms to ready, ping ${r.ping})`);
  ok(r.hidden && r.werk && !r.ctx && !r.started && !r.rail, `render-only: a hidden frame of this page with ?werk=1 – no live context (${r.ctx}), no sound started, no Ringleiste shown`);
  ok(r.store === false && r.midi !== 'ok' && !r.gk, `no storage writes from it (store.set → ${r.store}), no MIDI (${r.midi}), no Gestik`);

  // ---------- 2 · isolation (c1-swap, ported) ----------
  r = await ev(async (GAP_SRC) => {
    const M = window.__M, A = M.A, live = A.ctx, sleep = window.__sleep, out = {}, SR = live.sampleRate, pkOf = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
    await live.audioWorklet.addModule(URL.createObjectURL(new Blob([GAP_SRC], { type: 'text/javascript' })));
    const gap = new AudioWorkletNode(live, 'hx-gap'), z = live.createGain(); z.gain.value = 0; gap.connect(z).connect(live.destination);
    const gaps = () => new Promise((res) => { gap.port.onmessage = (e) => res(e.data); gap.port.postMessage(1); });
    const job = (eng, n, extra) => {
      const notes = []; for (let i = 0; i < n; i++) notes.push({ t0: 0.02 + i * 0.05, t1: 1.2 + i * 0.05, eng, f: 220 * Math.pow(2, (i % 12) / 12), y0: 0.6, vel: 0.9, pan: 0, src: 'fin', burst: false, hold: true, curves: { y: [], f: [] } });
      return M.hxwCall('wuchs', Object.assign({ sr: SR, dur: 3, notes, P: Object.assign({}, M.P, { 'rhz.reiz': 1 }), q: '3', seed: 5 }, extra || {}));
    };
    await gaps(); await sleep(3000); out.gIdle = await gaps();
    // a full live budget of held Nebel notes, then 12 Gong voices in the Werk-Rahmen
    M.P['v.eng'] = 'neb';
    const [VB] = M.getBudget(), held = [];
    for (let i = 0; i < 60 && M.voiceLoad() < VB - 1; i++) held.push(M.playNote('neb', live.currentTime + 0.01, 110 * Math.pow(2, i / 7), 0.5, 0.5, {}));
    await sleep(100);
    const load0 = M.voiceLoad(), n0 = A.voices.size;
    const g = await job('gng', 12);
    out.steal = { budget: VB, held: held.length, load0: +load0.toFixed(2), err: g && g.err, killed: held.filter((v) => !v || !v.alive || !A.voices.has(v) || v.released).length, voices: [n0, A.voices.size], load1: +M.voiceLoad().toFixed(2), werkPk: g && g.L ? pkOf(g.L.subarray(0, 48000)) : 0 };
    out.gBusy = await gaps();
    for (const v of held) if (v && v.release) v.release();
    M.panic(); await sleep(400);
    // Gespinst: a live note builds the live web, a Werk-Rahmen job renders its own
    M.P['v.eng'] = 'gsp';
    M.playNote('gsp', live.currentTime + 0.01, 220, 0.6, 0.8, {}); await sleep(300);
    const web = A.gsp;
    const gs = await job('gsp', 3);
    out.gsp = { before: !!(web && web.ctx === live), same: A.gsp === web, ctx: A.gsp ? (A.gsp.ctx === live ? 'live' : 'other') : 'none', err: gs && gs.err, werkPk: gs && gs.L ? pkOf(gs.L) : 0 };
    M.panic(); await sleep(400);
    // Elmsfeuer: A.elmDrift hangs off the live drift
    const ve = M.playNote('elm', live.currentTime + 0.01, 220, 0.7, 0.8, {}); await sleep(200);
    const ed = A.elmDrift;
    const ge = await job('elm', 2);
    out.elm = { live: !!(ed && ed.context === live), same: A.elmDrift === ed, err: ge && ge.err, werkPk: ge && ge.L ? pkOf(ge.L) : 0 };
    if (ve && ve.release) ve.release();
    M.panic(); await sleep(400);
    // Jahresring: the Werk-Rahmen's hits do not age the live bar (the live year held still meanwhile: a fixed season)
    const jz = M.P['jrg.jahreszeit']; M.P['jrg.jahreszeit'] = 'herbst';
    M.playNote('jrg', live.currentTime + 0.01, 330, 0.5, 0.8, {}); await sleep(600);
    const age0 = A.jrgAge, se0 = A.season;
    const gj = await job('jrg', 6, { jrg: { age: 3, season: 0.4 } });
    out.jrg = { age: [age0, A.jrgAge], season: [se0, A.season], err: gj && gj.err };
    M.P['jrg.jahreszeit'] = jz; M.panic(); await sleep(300);
    // Rhizom: a live strike with charges still to come (the live clock held for a moment, so they wait), then a
    // Werk-Rahmen strike: the live queue is exactly as it was
    M.P['rhz.reiz'] = 1; M.P['v.eng'] = 'rhz';
    try { A.clock.postMessage('stop'); } catch (e) {}
    await sleep(60);
    M.playNote('rhz', live.currentTime + 0.01, M.N.notes[5].f, 1, 1, {});
    const q0 = M.RHZ.q.map((c) => c);
    const gr = await M.hxwCall('wuchs', { sr: SR, dur: 0.6, notes: [{ t0: 0.02, t1: null, eng: 'rhz', f: 220, y0: 1, vel: 1, pan: 0, src: 'fin', burst: false, hold: false, curves: { y: [], f: [] } }], P: Object.assign({}, M.P, { 'rhz.reiz': 1 }), q: '3', seed: 5 });
    out.rhz = { queued: q0.length, ahead: q0.length, kept: q0.filter((c) => M.RHZ.q.includes(c)).length, now: M.RHZ.q.length, err: gr && gr.err, werkPk: gr && gr.L ? pkOf(gr.L) : 0 };
    try { A.clock.postMessage('start'); } catch (e) {}
    M.panic(); await sleep(300);
    gap.disconnect();
    return out;
  }, GAP_SRC);
  console.log('INFO isolation', JSON.stringify(r));
  ok(!r.steal.err && r.steal.killed === 0 && r.steal.werkPk > 0.01 && Math.abs(r.steal.load1 - r.steal.load0) < 0.01, `a full live budget (${r.steal.held} held Nebel notes, load ${r.steal.load0} of ${r.steal.budget}) while the Werk-Rahmen renders 12 Gong voices (peak ${r.steal.werkPk.toFixed(3)}): ${r.steal.killed} live voices stolen, load ${r.steal.load1}`);
  ok(r.gsp.before && r.gsp.same && r.gsp.ctx === 'live' && !r.gsp.err && r.gsp.werkPk > 0.001, `the live Gespinst web stays (the same node, ${r.gsp.ctx}) while the Werk-Rahmen renders a web of its own (peak ${r.gsp.werkPk.toFixed(3)})`);
  ok(r.elm.live && r.elm.same && !r.elm.err && r.elm.werkPk > 0.001, `A.elmDrift stays on the live drift (the same node) through an Elmsfeuer render (peak ${r.elm.werkPk.toFixed(3)})`);
  ok(r.jrg.age[0] > 0 && r.jrg.age[0] === r.jrg.age[1] && r.jrg.season[0] === r.jrg.season[1] && !r.jrg.err, `the live Jahresring's age (${r.jrg.age.join(' → ')}) and season (${r.jrg.season[1].toFixed(3)}) do not move with six Werk-Rahmen hits (its job: age 3, season 0.4)`);
  ok(r.rhz.queued > 0 && r.rhz.kept === r.rhz.queued && r.rhz.now === r.rhz.queued && !r.rhz.err && r.rhz.werkPk > 0.001, `the live Rhizom charges still to come stay queued, every one (${r.rhz.kept} of ${r.rhz.queued}), while the Werk-Rahmen strikes its own net (peak ${r.rhz.werkPk.toFixed(3)})`);
  const gi = r.gIdle.g, gb = r.gBusy.g;
  ok(gb <= Math.max(3, 2 * gi + 2), `live audio callback gaps > 30 ms: ${gi} in 3 s idle, ${gb} while the Werk-Rahmen rendered (headless; not more frequent)`);

  // ---------- 3 · determinism per source ----------
  r = await ev(async ({ ENGS, QL }) => {
    const M = window.__M, A = M.A, SR = A.ctx.sampleRate, out = {};
    const phrase = (eng) => [[0.05, 0, 0.8, 0.7], [0.55, 2, 0.6, 0.5], [1.0, 4, 0.9, 0.9], [1.45, 1, 0.7, 0.4]].map(([t, d, v, y]) => {
      const sus = M.ENGINES[eng].sustain;
      return { t0: t, t1: sus ? t + 0.6 : null, eng, f: M.N.notes[3 + d].f, y0: y, vel: v, pan: d / 6 - 0.3, src: 'fin', burst: false, hold: !!sus, curves: { y: sus ? [[t + 0.3, Math.min(1, y + 0.2)]] : [], f: [] } };
    });
    for (const eng of ENGS) {
      const job = (seed) => M.hxwCall('wuchs', { sr: SR, dur: 4, notes: phrase(eng), P: Object.assign({}, M.P, { 'v.eng': eng }), q: QL, seed, jrg: { age: 2, season: 0.3 } });
      const a = await job(11), b = await job(11), c = await job(12);
      if (!a || !b || a.err || b.err) { out[eng] = { err: (a && a.err) || (b && b.err) || 'none' }; continue; }
      let pk = 0, d = 0, dc = 0;
      for (let i = 0; i < a.L.length; i++) { pk = Math.max(pk, Math.abs(a.L[i]), Math.abs(a.R[i])); d = Math.max(d, Math.abs(a.L[i] - b.L[i]), Math.abs(a.R[i] - b.R[i])); if (c && c.L) dc = Math.max(dc, Math.abs(a.L[i] - c.L[i]), Math.abs(a.R[i] - c.R[i])); }
      const db = (x) => +(20 * Math.log10(x / (pk || 1) + 1e-30)).toFixed(1);
      out[eng] = { pk: +pk.toFixed(4), same: db(d), other: db(dc), rt: +(a.rms / 1000 / 4).toFixed(3) };
    }
    return out;
  }, { ENGS, QL });
  const rows = Object.entries(r);
  console.log('INFO determinism (dB re peak: same seed / another seed; render time per second of audio)');
  for (const [k, v] of rows) console.log(`INFO   ${k.padEnd(4)} ${v.err ? 'error ' + v.err : `peak ${v.pk}  same ${v.same}  other ${v.other}  rt ${v.rt}`}`);
  // documented exceptions (SPEC §8 as built 1c): Chromium sums three or more connections into a node or a param in an
  // order it picks anew in every context (a last-bit difference, measured −137 dB in a plain graph); Schwarm's coupled
  // sines blow it up to another performance, Tropfen's chirped droplets carry it into their phase (−84 … −92 dB)
  const EXC = { swm: 'chaotic FM loop', trp: 'chirped droplets' };
  const bad = rows.filter(([k, v]) => v.err || !(v.pk > 1e-3) || (!(v.same <= -100) && !EXC[k]));
  const held = rows.filter(([k, v]) => !EXC[k] && !v.err), worst = Math.max(...held.map(([, v]) => v.same));
  ok(!bad.length, `determinism, level ${QL}: ${held.length - bad.filter(([k]) => !EXC[k]).length} of ${held.length} sources render the same pass seed twice within −100 dB (worst ${worst} dB)` + (bad.length ? ' – off: ' + bad.map(([k, v]) => k + ' ' + (v.err || v.same)).join(', ') : ''));
  for (const k in EXC) if (r[k]) console.log(`INFO   exception ${k} (${EXC[k]}): ${r[k].same} dB – the browser's summing order, amplified`);
  const rts = rows.filter(([, v]) => !v.err).map(([, v]) => v.rt);
  console.log(`INFO Werk-Rahmen render time per second of audio (level ${QL}, a 4-note phrase): median ${rts.sort((a, b) => a - b)[rts.length >> 1]} s, max ${Math.max(...rts)} s`);
  ok(rows.filter(([k, v]) => !v.err && !EXC[k]).every(([, v]) => v.other > v.same + 20), `another seed renders another performance for every source (its difference ≫ the same seed's)`);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await page.context().close();

  // ---------- 4 · the fallback: no Werk-Rahmen ----------
  {
    const { page: fp, errors: fe } = await H.open({});
    // (blocked: the frame's URL, and – Leistung, 23.10.2026: a realm boots from srcdoc with the page's script from a Blob
    // – the page's read of itself, so it falls back to the URL)
    await fp.route('**/*', (route) => { const r = route.request(); if (/werk=1/.test(r.url()) || r.resourceType() === 'fetch') return route.abort(); return route.continue(); });
    const q = await fp.evaluate(async () => {
      const M = window.__M, A = M.A, t0 = performance.now(), okk = await M.hxWerk();
      M.setParam('v.human', 0); M.setParam('rev.mix', 0); M.setParam('dly.mix', 0);
      const t = A.ctx.currentTime + 0.1;
      for (let i = 0; i < 8; i++) M.playNote('glo', t + i * 0.25, M.N.notes[3 + (i % 4)].f, 0.5, 0.7, { bus: M.stripIn('fin') });
      await window.__sleep(2600);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      await window.__sleep(4000);
      const S = L && M.HX.sch.get(L.sch[0]);
      M.openPanel('rec'); M.hxCardRender(); await window.__sleep(300);
      const txt = document.querySelector('#hxSec') ? document.querySelector('#hxSec').textContent : '';
      return { okk, ms: performance.now() - t0, st: M.HXW.st, why: M.HXW.why, out: S && S.out, chain: S && S.chain, baked: S && S.baked, note: /kein Werk-Rahmen/.test(txt), folgt: /Einbrennen geht hier nicht/.test(txt) };
    });
    ok(!q.okk && q.st === 'kein', `a frame that cannot boot (its URL blocked): no Werk-Rahmen (${q.why}), known after ${(q.ms / 1000).toFixed(1)} s`);
    ok(q.chain && q.out === 1 && !q.baked && q.note && q.folgt, `…the bake is off: a new loop plays dry through the live chain (out ${q.out}), the card says so`);
    const fe2 = fe.filter((x) => !/Failed to load resource: net::ERR_FAILED/.test(x));   // (the blocked requests themselves)
    ok(!fe2.length, 'no page errors (fallback)' + (fe2.length ? ': ' + fe2.join(' | ') : ''));
  }
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
