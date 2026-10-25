// The Raster of a recording by hand (owner, 25.10.2026): Frei stays as it was; Takt, ½ Takt, ¼ – the recording begins
// and ends exactly on that grid, the first loop too: without a Takt one is set at the Puls's tempo and one bar counted
// in.   node t-hx-raster.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    const play = (t0, n) => window.__riff(t0, 0.3, [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 4, 2, 5, 9, 5].slice(0, n), 1, { eng: 'klb', dur: 0.25 });
    const geo = () => { const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0]; return L ? { beats: L.d.beats, b0: +(L.d.b0 - M.TG.o).toFixed(3), lock: L.d.lock } : null; };
    // 1. Frei, no Takt: free as always (the tempo found from the notes)
    await window.__reset(); M.setParam('hx.raster', 'frei');
    M.hxHaupt(null); o.frei = { grid: M.HX.rec && M.HX.rec.grid, phase: M.HX.rec && M.HX.rec.phase };
    play(A.ctx.currentTime + 0.1, 16); await sl(5200); M.hxHaupt(null); await sl(600); o.freiL = !!geo();
    // 2. Takt, no Takt yet: one is set at the Puls's tempo, a bar counted in, the loop whole bars
    await window.__reset(); M.setParam('seq.bpm', 100); M.setParam('hx.raster', 'takt');
    const t0 = A.ctx.currentTime; M.hxHaupt(null); const R = M.HX.rec;
    o.cin = { grid: R.grid, phase: R.phase, wait: +(R.t0 - t0).toFixed(2), bpm: +M.tgBpm(A.ctx.currentTime + 3).toFixed(1), b0: R.b0 % 4 };
    play(R.t0, 16); await window.__until(R.t0 + 2.4 * 4 * 0.6 + 0.3);   // a little over two bars of 2.4 s
    M.hxHaupt(null); await sl(400); o.takt = geo();
    // 3. ¼ with a Takt (the Puls): it begins on the next beat and closes on a beat – 6 beats
    await window.__reset(); window.__grid(100); M.setParam('hx.raster', 'viertel'); await sl(300);
    const b = M.tgBeat(A.ctx.currentTime); await window.__until(M.tgTime(Math.floor(b) + 1.5));
    M.hxHaupt(null); const R2 = M.HX.rec; o.q = { phase: R2.phase, b0frac: +(R2.b0 % 1).toFixed(3), b0mod4: R2.b0 % 4 };
    play(R2.t0, 10); await window.__until(M.tgTime(R2.b0 + 6) + 0.08);   // a tap a moment after its sixth beat: that beat
    M.hxHaupt(null); await sl(400); o.qL = geo();
    // … and a tap well after a beat (0.3 s of 0.6): the next one
    await window.__reset(); window.__grid(100); M.setParam('hx.raster', 'viertel'); await sl(300);
    M.hxHaupt(null); const R4 = M.HX.rec; play(R4.t0, 10); await window.__until(M.tgTime(R4.b0 + 5) + 0.3);
    M.hxHaupt(null); await sl(400); o.qL2 = geo();
    // 4. ½ Takt: a length of two beats each
    await window.__reset(); window.__grid(100); M.setParam('hx.raster', 'halb'); await sl(300);
    M.hxHaupt(null); const R3 = M.HX.rec; o.h = { b0mod2: R3.b0 % 2 };
    play(R3.t0, 12); await window.__until(M.tgTime(R3.b0 + 5) + 0.05);   // in the middle of the third half-bar: closes at its end (6)
    M.hxHaupt(null); await sl(400); o.hL = geo();
    M.setParam('hx.raster', 'frei');
    return o;
  });
  ok(r.frei.grid === false && r.frei.phase === 'rec' && r.freiL, `Frei without a Takt: free, at once, as always (${JSON.stringify(r.frei)})`);
  ok(r.cin.grid && r.cin.phase === 'wait' && Math.abs(r.cin.wait - 2.4) < 0.05 && r.cin.bpm === 100 && r.cin.b0 === 0, `Takt without a Takt: one set at the Puls's 100, one bar counted in (${JSON.stringify(r.cin)})`);
  ok(r.takt && r.takt.lock === 'takt' && r.takt.beats % 4 === 0 && r.takt.beats >= 8, `… the loop whole bars (${JSON.stringify(r.takt)})`);
  ok(r.q.phase === 'wait' && r.q.b0frac === 0 && r.q.b0mod4 !== 0, `¼ on the Puls: it begins on the next beat, not the bar line (${JSON.stringify(r.q)})`);
  ok(r.qL && r.qL.beats === 6, `… a tap a moment after a beat closes on it: 6 beats (${JSON.stringify(r.qL)})`);
  ok(r.qL2 && r.qL2.beats === 6, `… a tap half a beat late closes on the next: 6 beats (${JSON.stringify(r.qL2)})`);
  ok(r.h.b0mod2 === 0 && r.hL && r.hL.beats === 6, `½ Takt: begins on a half bar, ends at the next one – 6 beats (${JSON.stringify(r.hL)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
