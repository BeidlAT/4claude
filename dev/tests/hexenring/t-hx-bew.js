// Hexenring – the Fährte's checks, ported (SPEC §18; tests §22): the Fährte's button, tap/hold/double tap and panel are
// retired; its clock is the Taktgeber's, its lanes the Humus's Bewegung, its loop a Schleife of Bewegung. Ported here
// (the list of what each old check covered and where it went is in SPEC §18 „As built (step 1d)“):
//   Bewegung layer – a Formen source is written down by itself; the Korb with nothing heard but movement takes the bars
//     before the bar line as a Schleife of Bewegung; it plays back where it was played, exactly, on the audio thread
//     (a probe samples the Filter target); Verblassen per pass; the patch is never written; deleting it leaves the
//     Filter exactly at the patch; nothing moved: nothing taken; a knob (a patch parameter) loops relative to where it was
//     left and keeps playing around a new position; an X-Y pad's height is part of an audio Schleife's Bewegung (it
//     sounded – the Korb takes the sound); a pad on the Korb takes Bewegung and plays no note; it takes no sound (never
//     the Fokus, no overdub into it)
//   clock – a tempo change mid-pass (it follows in beats); a 300-ms stall of the page (the audio thread plays on); the
//     Puls starting (it joins the Schleife's bar lines); an external MIDI clock (it follows its tempo and bars)
//   latency shift – Gestik's lanes are written earlier by the sensor's measured delay than a knob's
//   Gestik – leaning writes Anlehnen's lanes and the tilt; taken, they play with the ghost spore; live leaning adds on top;
//     a new note takes the looped lean; Tonhöhe as the lean toward the step; „Hinlegen erntet“ (Ruhe)
//   save format – user presets (format 2) carry it (16-bit, small), loading brings it on the current bar, format 1 and
//     built-ins leave it, format 2 without one removes it, „Rückgängig“; the file v2/v1; the mixer's scenes A/B; a reload
// node t-hx-bew.js (slot hx; gf-h's helpers: fake MIDI, motion events, the probe)
const GF = require('../motion-tests/gf-h'), H = require('./hx-h');
const { ok, model } = GF;
const fs = require('fs'), path = require('path');
const URL_HX = H.URL_HX;
const F1 = '0.55*Math.sin(2*Math.PI*t/0.7)+0.25*Math.sin(2*Math.PI*t/0.23)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, passes = 0; const ck = (c, m) => { ok(c, m); if (!c) fails++; else passes++; };
async function tools(page) {
  await page.evaluate(() => {
    const M = window.__M;
    // the newest Schleife of Bewegung as plain data (gf-h's model() computes what must sound from it)
    window.__bew = () => {
      const L = M.hxLoopsLive().filter((x) => x.bew).sort((a, b) => b.made - a.made)[0];
      if (!L) return null;
      const B = L.bew;
      return { id: L.id, key: L.key, slot: L.slot, state: L.state, a: M.hxBewA(L), n: B.n, len: B.n / 48, gs: B.gs, g0: B.g0, fade: B.fade, why: B.why, t0: M.FA.t0, b0: M.FA.b0, bpm: M.FA.bpm, R: M.FA_R,
        lanes: B.lanes.map((x) => ({ k: x.k, src: x.src, v: Array.from(x.v) })), disp: B.disp ? Object.keys(B.disp) : null };
    };
    // the Korb just after a bar line (within its grace): the bar before it, at once
    window.__korbAfterBar = async (bars) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', bars || 1);
      const bh = M.tgBeat(M.heardT()), E = Math.ceil(bh / 4 + 1e-9) * 4;
      while (M.tgBeat(M.heardT()) < E + 0.25) await window.__sleep(5);
      const n = M.hxLoopsLive().length;
      M.hxKorb(null);
      for (let i = 0; i < 60 && !(window.__bew() && window.__bew().lanes.length); i++) await window.__sleep(20);
      return { E, made: M.hxLoopsLive().length > n };
    };
    window.__mods = (pre) => Object.values(M.MOD.t).flatMap((T) => [...T.s.keys()]).filter((k) => k.startsWith(pre));
  });
}
const same = (A, B) => A && B && A.n === B.n && A.lanes.length === B.lanes.length && A.lanes.every((l, i) => l.k === B.lanes[i].k && l.src === B.lanes[i].src && l.v.every((x, j) => Math.abs(x - B.lanes[i].v[j]) <= 1 / 4096 + 1e-6));
// what must sound at each probe sample: gf-h's model, with the beat of each sample read from the Taktgeber's own map
// (a device's clock slews in slopes – one segment's tempo does not hold across them)
function modelB(L, fb) {
  const s = fb * L.R, i0 = Math.floor(s), fr = s - i0, md = (x, n) => ((x % n) + n) % n;
  const p0 = md(i0 - L.a, L.n), p1 = md(i0 + 1 - L.a, L.n);
  const gain = (b) => (b <= L.gs ? L.g0 : L.g0 * Math.pow(L.fade, (b - L.gs) / L.len));
  let v = 0;
  for (const ln of L.lanes) v += ln.v[p0] * gain(i0 / L.R) * (1 - fr) + ln.v[p1] * gain((i0 + 1) / L.R) * fr;
  return Math.max(-1, Math.min(1, v));
}
async function check(page, t0, t1) {
  const L = await page.evaluate(() => window.__bew());
  const pts = await page.evaluate(([a, b]) => window.__PR.pts.filter((p) => p[0] >= a && p[0] <= b && Number.isFinite(p[1])).map((p) => [p[0], p[1], window.__M.faeB(p[0])]), [t0, t1]);
  let err = 0, n = 0, mx = 0;
  for (const [, v, fb] of pts) { const e = Math.abs(v / 2400 - modelB(L, fb)); err += e; n++; if (e > mx) mx = e; }
  return { L, n, mean: n ? err / n : 1, mx };
}
(async () => {
  // ================= the Bewegung layer, the Korb, playback, the clock =================
  {
    const { page, errors } = await GF.open({ url: URL_HX, cfg: {} });
    await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await tools(page);
    await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); M.FA.p.trim = 0; });
    await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
    await sleep(150);
    await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
    await sleep(2400);
    const lanes = await page.evaluate(() => [...window.__M.FA.lanes.keys()]);
    ck(lanes.includes('m|flt|map:test:1'), 'Bewegung: a Formen source is written down by itself (lane m|flt|map:test:1), nothing armed');
    const plan = await page.evaluate(() => { const p = window.__M.hxKorbPlan(window.__M.heardT()); return p.kind + ' · ' + p.label; });
    const tk = await page.evaluate(() => window.__korbAfterBar(1));
    const shift = await page.evaluate(() => window.__M.faeShift(false));
    const tStop = await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    const L0 = await page.evaluate(() => window.__bew());
    ck(/^bew/.test(plan) && L0 && L0.n === 192 && L0.lanes.length === 1 && L0.lanes[0].k === 'flt' && L0.lanes[0].src === 'map:test:1' && L0.state === 'spielt', `the Korb, nothing heard but movement („${plan}“): a Schleife of Bewegung – the last bar (192 steps), one lane, Filter from the source`);
    ck(L0 && (((L0.a / 48 - tk.E) % 4) + 4) % 4 < 1e-9, '  its bar is the one before the bar line the Korb was tapped just after (a step on the bar line)');
    await sleep(4200);
    {
      const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])), tStop + 0.08);
      const L = L0, md = (x, n) => ((x % n) + n) % n;
      const orig = (T, d) => { const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, pos = md(fb * L.R - L.a, L.n) / L.R, bOrig = (tk.E - 4) + pos + (L.a / L.R - tk.E) + (tk.E - L.a / L.R); return L.t0 + ((bOrig + (L.a / L.R - tk.E) - L.b0) * 60) / L.bpm + shift + d; };
      const log = await page.evaluate(() => window.__drv['map:test:1']);
      const held = (t) => { let lo = 0, hi = log.length - 1; if (t < log[0][0]) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (log[m][0] <= t) lo = m; else hi = m - 1; } return log[lo][1]; };
      let best = null;
      for (let d = -0.08; d <= 0.0801; d += 0.001) {
        let e = 0, n = 0;
        for (const [T, v] of pts) { const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, pos = md(fb * L.R - L.a, L.n); if (pos < 3 || pos > L.n - 3) continue; e += Math.abs(v / 2400 - held(orig(T, d))); n++; }
        if (!best || e / n < best.e) best = { d, e: e / n, n };
      }
      ck(best && Math.abs(best.d) <= 0.025, '  played back where it was played: best match at ' + (best.d * 1000).toFixed(0) + ' ms (one tick: 25 ms) over ' + best.n + ' audio-thread samples');
      ck(best && best.e < 0.03, '  the waveform itself comes back (mean error ' + best.e.toFixed(4) + ' of ±0.8)');
    }
    const c1 = await check(page, tStop + 0.08, tStop + 4);
    ck(c1.mean < 0.004 && c1.mx < 0.03, '  it plays its own points exactly (mean ' + c1.mean.toFixed(5) + ', max ' + c1.mx.toFixed(4) + ', ' + c1.n + ' samples)');
    const pf = await page.evaluate(() => { const M = window.__M; return [M.P['flt.freq'], M.UI.preset]; });
    // Verblassen × 0.5 per pass (the card's chips set it this way)
    const tf = await page.evaluate(() => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew), B = L.bew, b = M.faeB(M.A.ctx.currentTime); B.g0 = M.hxBewGain(L, b); B.gs = b; B.fade = 0.5; B.re = true; return M.A.ctx.currentTime; });
    await sleep(4200);
    {
      const L = await page.evaluate(() => window.__bew());
      const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])), tf + 0.1);
      const flat = Object.assign({}, L, { fade: 1, g0: 1 }), r = [];
      for (const [T, v] of pts) { const fb = L.b0 + ((T - L.t0) * L.bpm) / 60, raw = model(flat, T); if (Math.abs(raw) < 0.3) continue; r.push([fb, v / 2400 / raw]); }
      let pairs = 0, bad = 0;
      for (const [b, g] of r) { const q = r.find((x) => Math.abs(x[0] - (b + 4)) < 0.01); if (q) { pairs++; if (Math.abs(q[1] / g - 0.5) > 0.05) bad++; } }
      ck(pairs > 50 && bad / pairs < 0.05, '  Verblassen × 0.5: one pass later every place is half as strong (' + pairs + ' pairs, ' + bad + ' off)');
    }
    await page.evaluate(() => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew), B = L.bew, b = M.faeB(M.A.ctx.currentTime); B.g0 = 1; B.gs = b; B.fade = 1; B.re = true; });
    const pf2 = await page.evaluate(() => { const M = window.__M; return [M.P['flt.freq'], M.UI.preset]; });
    ck(JSON.stringify(pf) === JSON.stringify(pf2), '  playing it never writes the patch (Filter ' + pf2[0] + ' Hz, preset mark unchanged)');
    // tempo change mid-pass: it follows in beats
    const tt = await page.evaluate(() => { window.__M.setParam('seq.bpm', 90); return window.__M.A.ctx.currentTime; });
    await sleep(3200);
    const c3 = await check(page, tt + 0.1, tt + 3);
    ck(c3.L.bpm === 90 && c3.mean < 0.004 && c3.mx < 0.04, 'clock: tempo 120 → 90 mid-pass – it follows the new tempo at once, in beats (mean ' + c3.mean.toFixed(5) + ', max ' + c3.mx.toFixed(4) + ')');
    // a 300-ms stall of the page
    const st = await page.evaluate(() => { const M = window.__M, t0 = M.A.ctx.currentTime, w = performance.now(); while (performance.now() - w < 300); return [t0, M.A.ctx.currentTime]; });
    await sleep(400);
    const c4 = await check(page, st[0], st[0] + 0.32);
    ck(st[1] - st[0] > 0.28 && c4.n > 80 && c4.mean < 0.004 && c4.mx < 0.04, '  a 300-ms stall of the page (audio clock +' + (st[1] - st[0]).toFixed(3) + ' s): the audio thread played it through unchanged (' + c4.n + ' samples, mean ' + c4.mean.toFixed(5) + ')');
    // the Puls starts: it joins the Schleife's bar lines; the Schleife plays on in its beat
    const ps = await page.evaluate(async () => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew), a0 = M.hxBewA(L); M.seqStart(); await window.__sleep(400); return { da: (M.hxBewA(L) - a0) / 48, bar: (((M.hxBewA(L) / 48 - M.TG.o) % 4) + 4) % 4, on: M.SEQ.on }; });
    ck(ps.on && ps.da === 0 && (ps.bar < 0.011 || ps.bar > 4 - 0.011), '  the Puls starts: it joins the Schleife\'s bar lines (the Schleife moves by ' + ps.da + ' beats, on a bar line)');
    const tp = await page.evaluate(() => window.__M.A.ctx.currentTime);
    await sleep(1500);
    const c5 = await check(page, tp + 0.05, tp + 1.4);
    ck(c5.mean < 0.004 && c5.mx < 0.04, '  and plays on with the Puls (mean ' + c5.mean.toFixed(5) + ')');
    // it takes no sound: never the Fokus – the Hauptknopf in „dieselbe Schleife“ records a new Schleife, no overdub into it
    const fk = await page.evaluate(async () => {
      const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew), o = { fok: M.HX.fokus === L.id || !!M.hxFok() };
      M.setParam('hx.modus', 'dieselbe'); M.HX.fokus = L.id;
      M.hxHaupt(null); o.punch = !!M.HX.punch; o.rec = !!M.HX.rec; o.sch = L.sch.length;
      if (M.HX.rec) M.hxRecCancel(); if (M.HX.punch) M.hxPunchEnd(M.A.ctx.currentTime);
      M.setParam('hx.modus', 'neu');
      return o;
    });
    ck(!fk.fok && !fk.punch && fk.rec && fk.sch === 0, `  it takes no sound: never the Fokus; „dieselbe Schleife“ records a new one instead of overdubbing it (${JSON.stringify(fk)})`);
    // deleting it (its card – ↶ undoes): its sources leave the layer, the Filter is back at the patch exactly
    await page.evaluate(() => { const M = window.__M; M.hxDelete(M.hxLoopsLive().find((x) => x.bew)); });
    await sleep(600);
    const cl = await page.evaluate(() => ({ loop: !!window.__bew(), src: window.__mods('hxb').length }));
    const tq = await page.evaluate(() => window.__M.A.ctx.currentTime);
    await sleep(300);
    const quiet = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])).every((p) => Math.abs(p[1]) < 0.5), tq + 0.06);
    ck(!cl.loop && !cl.src && quiet, 'deleting the Schleife: its sources leave the layer, the Filter is back at the patch exactly (0 cents)');
    // nothing moved and nothing heard: nothing to take
    await page.evaluate(() => window.__M.seqStop());
    await sleep(2600);
    const em = await page.evaluate(() => { const M = window.__M, p = M.hxKorbPlan(M.heardT()); M.hxKorb(null); return { kind: p.kind, loops: M.hxLoopsLive().length }; });
    ck(em.kind === 'leer' && em.loops === 0, 'nothing moved, nothing heard: the Korb takes nothing (leer)');
    ck(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await GF.close();
  }
  // ================= an external MIDI clock leads =================
  {
    const { page, errors } = await GF.open({ url: URL_HX, cfg: { ins: [['c1', 'Clock Box']] } });
    await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await tools(page);
    await page.evaluate(() => { const M = window.__M; M.setParam('midi.clock', 'follow'); M.setParam('midi.transport', true); M.setParam('seq.bpm', 120); });
    // the device starts at 100 BPM (24 pulses a beat); its tempo can change (window.__per: ms per pulse)
    await page.evaluate(() => {
      const inp = window.__midi.inputs.get('c1'), snd = (b, ts) => inp.onmidimessage({ data: new Uint8Array(b), timeStamp: ts });
      window.__per = 25; let next = performance.now() + 20;
      snd([0xfa], performance.now());
      window.__ck = setInterval(() => { const now = performance.now(); while (next <= now) { snd([0xf8], next); next += window.__per; } }, 5);
    });
    await sleep(1500);
    await page.evaluate((F) => window.__drive('map:test:1', 'flt', F), F1);
    await sleep(150);
    await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
    await sleep(2600);
    await page.evaluate(() => window.__korbAfterBar(1));
    await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    await sleep(600);
    const c = await page.evaluate(() => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew); return { on: M.SEQ.on, ext: M.SEQ.ext && M.SEQ.ext.bpm, fbpm: M.FA.bpm, n: L && L.bew.n, bar: L ? (((M.hxBewA(L) / 48 - M.TG.o) % 4) + 4) % 4 : -1, t: M.A.ctx.currentTime }; });
    ck(c.on && Math.abs(c.ext - 100) < 1.5 && Math.abs(c.fbpm - 100) < 1.5 && c.n === 192, 'clock: an external clock at 100 BPM leads – the Korb takes a bar of Bewegung in its beat (' + c.fbpm.toFixed(2) + ' BPM)');
    ck(c.bar <= 1 / 96 + 1e-6 || c.bar >= 4 - 1 / 96 - 1e-6, '  on the clock\'s bar lines, to half a step (the device\'s Start owns the downbeat; ' + Math.min(c.bar, 4 - c.bar).toFixed(4) + ' beats)');
    await sleep(1500);
    let r = await check(page, c.t + 0.1, c.t + 1.4);
    ck(r.n > 200 && r.mean < 0.01, '  it plays in the clock\'s beat, slopes and all (mean ' + r.mean.toFixed(5) + ', max ' + r.mx.toFixed(4) + ', ' + r.n + ' samples)');
    // the device speeds up to 110 BPM: it follows in beats
    const t2 = await page.evaluate(() => { window.__per = 60000 / (110 * 24); return window.__M.A.ctx.currentTime; });
    await sleep(3500);
    const c2 = await page.evaluate(() => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew); return { ext: M.SEQ.ext && M.SEQ.ext.bpm, fbpm: M.FA.bpm, bar: (((M.hxBewA(L) / 48 - M.TG.o) % 4) + 4) % 4 }; });
    r = await check(page, t2 + 0.1, t2 + 3.3);
    ck(Math.abs(c2.ext - 110) < 1.5 && Math.abs(c2.fbpm - 110) < 1.5 && (c2.bar <= 1 / 96 + 1e-6 || c2.bar >= 4 - 1 / 96 - 1e-6) && r.mean < 0.01, '  the device speeds up to 110 BPM: it follows, on the same bar lines (' + c2.fbpm.toFixed(2) + ' BPM, mean ' + r.mean.toFixed(5) + ')');
    await page.evaluate(() => { clearInterval(window.__ck); window.__send([0xfc], 'c1'); });
    ck(!errors.length, 'no page errors (clock)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await GF.close();
  }
  // ================= a computer: the X-Y pad, a knob, a pad =================
  {
    const { page, errors } = await GF.open({ url: URL_HX, cfg: { ins: [['k1', 'KORG nanoKEY Studio'], ['p2', 'Pad Box']], noMotion: true } });
    await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await tools(page);
    await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 120); });
    ck(await page.evaluate(() => !document.getElementById('btnFae') && !document.getElementById('faeTag') && !document.querySelector('.fae-sec')), 'the Fährte\'s button, its tag and its panel section are gone');
    // knob 1 (Filter, a patch parameter): looped as Formen · Filter relative to where the knob was left
    await page.evaluate(async () => {
      for (let v = 0; v <= 127; v += 4) { window.__send([0xb0, 20, v], 'k1'); await window.__sleep(8); }
      const t0 = performance.now();
      window.__kn = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__send([0xb0, 20, Math.round(70 + 14 * Math.sin((2 * Math.PI * t) / 1.1))], 'k1'); }, 20);
    });
    await sleep(2500);
    await page.evaluate(() => window.__korbAfterBar(1));
    await page.evaluate(() => clearInterval(window.__kn));
    const K = await page.evaluate(() => window.__bew());
    ck(K && K.lanes.length === 1 && K.lanes[0].k === 'flt' && K.lanes[0].src === 'p:flt.freq', 'a knob: its Filter is written down and loops as Formen · Filter (lane p:flt.freq)');
    ck(K && Math.abs(K.lanes[0].v[K.lanes[0].v.length - 1]) < 0.02, '  relative to where the knob was left: the loop\'s last value is its rest (' + (K && K.lanes[0].v[K.lanes[0].v.length - 1].toFixed(4)) + ')');
    await sleep(200);
    const p0 = await page.evaluate(() => window.__M.P['flt.freq']);
    await page.evaluate(() => window.__probe(window.__M.MOD.t.flt.cs));
    const tk = await page.evaluate(() => window.__M.A.ctx.currentTime);
    await sleep(1800);
    const p1 = await page.evaluate(() => window.__M.P['flt.freq']);
    const K2 = await page.evaluate(() => window.__bew());
    const pts = await page.evaluate((a) => window.__PR.pts.filter((p) => p[0] > a && Number.isFinite(p[1])).map((p) => [p[0], p[1], window.__M.faeB(p[0])]), tk + 0.05);
    let e2 = 0, rng = 0;
    for (const [, v, fb] of pts) { e2 = Math.max(e2, Math.abs(v / 2400 - modelB(K2, fb))); rng = Math.max(rng, Math.abs(v)); }
    ck(p0 === p1 && rng > 300 && e2 < 0.002, '  while it loops the patch stays where the knob left it; the Filter sweeps as the knob did, on top (±' + Math.round(rng) + ' cents, off by ' + (e2 * 2400).toFixed(1) + ' cents)');
    await page.evaluate(() => window.__send([0xb0, 20, 100], 'k1'));
    await sleep(150);
    ck(await page.evaluate(() => window.__bew() && window.__bew().state === 'spielt'), '  turning the knob again: it keeps playing around the new position');
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(200); });
    // a pad learned to the Korb (momentary) takes Bewegung and plays no note
    await page.evaluate(async () => { const M = window.__M; M.midiLearn(true); M.learnPick('hx.korb'); window.__send([0x99, 40, 100], 'p2'); await window.__sleep(60); window.__send([0x89, 40, 0], 'p2'); await window.__sleep(600); M.midiLearn(false); window.__drive('map:test:9', 'pan', '0.6*Math.sin(2*Math.PI*t/0.7)'); });
    await sleep(2400);
    await page.evaluate(async () => { const M = window.__M, E = Math.ceil(M.tgBeat(M.heardT()) / 4 + 1e-9) * 4; while (M.tgBeat(M.heardT()) < E + 0.25) await window.__sleep(5); window.__send([0x99, 40, 100], 'p2'); await window.__sleep(60); window.__send([0x89, 40, 0], 'p2'); for (let i = 0; i < 40 && !(window.__bew() && window.__bew().lanes.length); i++) await window.__sleep(25); });
    let r = await page.evaluate(() => ({ b: window.__bew(), notes: window.__M.touches.size }));
    ck(r.b && r.b.lanes[0].k === 'pan' && r.notes === 0, 'a pad on the Korb takes the last bar of Bewegung (Panorama) and plays no note');
    await page.evaluate(() => window.__undrive('map:test:9', 'pan'));
    // (last: a note sounded – the Korb takes sound from here on)
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(100); });
    // the X-Y pad as a finger: a note that sounds – the Korb takes the sound; its height is the Schleife's Bewegung
    await page.evaluate(() => {
      window.__send([0xb0, 16, 64], 'k1'); window.__send([0xb0, 17, 64], 'k1'); window.__send([0xb0, 18, 127], 'k1');
      const t0 = performance.now();
      window.__xy = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__send([0xb0, 17, Math.round(127 * (0.5 + 0.35 * Math.sin((2 * Math.PI * t) / 0.9)))], 'k1'); }, 20);
    });
    await sleep(2600);
    ck(await page.evaluate(() => window.__M.FA.lanes.has('y')), 'Bewegung: the X-Y pad plays as a finger, its height is written down (lane y)');
    r = await page.evaluate(async () => { await window.__korbAfterBar(1); const M = window.__M, L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0]; return L && { bew: !!L.bew, y: !!(L.mv && L.mv.lanes.some((x) => x.key === 'y')), sch: L.sch.length }; });
    await page.evaluate(() => { clearInterval(window.__xy); window.__send([0xb0, 18, 0], 'k1'); });
    ck(r && !r.bew && r.sch === 1 && r.y, '  it sounded: the Korb takes the sound (an audio Schleife) – the height is in its Bewegung (lane y), not replayed onto live notes');
    // „nur Bewegung“: the pad's height alone, looped – a key held later takes it as its timbre
    await page.click('.hx-chip:text-is("nur Bewegung")').catch(() => {});
    await page.waitForFunction(() => !!(window.__bew() && window.__bew().lanes.length), null, { timeout: 3000 }).catch(() => {});
    r = await page.evaluate(async () => {
      const M = window.__M, B = window.__bew(), o = { lanes: B ? B.lanes.map((x) => x.k + '|' + x.src) : [] };
      await window.__sleep(300);
      window.__send([0x90, 62, 100], 'k1');
      await window.__sleep(100);
      let mx = 0;
      for (let i = 0; i < 25; i++) { const tt = [...M.touches.values()][0]; if (tt) mx = Math.max(mx, Math.abs(M.modY(tt) - tt.y)); await window.__sleep(60); }
      window.__send([0x80, 62, 0], 'k1');
      o.mx = mx;
      return o;
    });
    ck(r.lanes.includes('hoehe|y') && r.mx > 0.05, '  „nur Bewegung“: the pad\'s height alone loops – a key held later takes it as its timbre (deflection up to ' + r.mx.toFixed(2) + ')');
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(200); });
    ck(!errors.length, 'no page errors (computer)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await GF.close();
  }
  // ================= Gestik: real DeviceMotionEvents =================
  {
    const { page, errors } = await GF.open({ url: URL_HX, mobile: true, cfg: { perm: 'granted' } });
    await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await tools(page);
    await GF.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(1500);
    await page.evaluate(() => { const M = window.__M; M.closePanel(); M.setParam('seq.bpm', 120); M.GK.p.latS = 80; });
    const down = (id, x, y) => page.evaluate(([id, x, y]) => window.__M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * 300, py: (1 - y) * 500 } }), [id, x, y]);
    const up = (id) => page.evaluate((id) => window.__M.onUp({ pointerId: id }), id);
    // the sensor's delay: Gestik's lanes are written earlier by it than a knob's (latency shift)
    let r = await page.evaluate(() => {
      const M = window.__M, a = M.faeShift(true) - M.faeShift(false);
      M.faeIn('m|pan|gk:probe', 0.5, 'm', 'pan', 'gk:probe', true, 0); M.faeIn('m|pan|map:probe:1', 0.5, 'm', 'pan', 'map:probe:1', false, 0);
      const s1 = M.FA.lanes.get('m|pan|gk:probe').s, s2 = M.FA.lanes.get('m|pan|map:probe:1').s;
      M.faeIn('m|pan|gk:probe', 0, 'm', 'pan', 'gk:probe', true, 0); M.faeIn('m|pan|map:probe:1', 0, 'm', 'pan', 'map:probe:1', false, 0);
      M.FA.lanes.delete('m|pan|gk:probe'); M.FA.lanes.delete('m|pan|map:probe:1');
      return { a, d: s2 - s1, want: ((0.08 * M.FA.bpm) / 60) * 48 };
    });
    ck(Math.abs(r.a - 0.08) < 1e-9 && Math.abs(r.d - r.want) <= 1, `latency shift: a measured sensor delay of 80 ms – Gestik's values are written ${r.d} steps earlier than a knob's (${r.want.toFixed(1)} expected)`);
    // a note held, the phone leant forward and back for a bar (Anlehnen · Höhe): written down; the Korb takes the sound,
    // its chip „nur Bewegung“ makes the bars a Schleife of Bewegung
    await down(1, 0.35, 0.5);
    await sleep(300);
    await page.evaluate(() => { const t0 = performance.now(); window.__lean = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__setPose({ beta: 45 + 14 * Math.sin((2 * Math.PI * t) / 1.3), roll: 0 }); }, 30); });
    await sleep(2600);
    r = await page.evaluate(() => [...window.__M.FA.lanes.keys()]);
    ck(r.includes('m|hoehe|gk:anl.h') && r.includes('d|ty'), 'Gestik: while leaning, Anlehnen\'s Höhe and the tilt are written down (' + r.join(', ') + ')');
    r = await page.evaluate(async () => { await window.__korbAfterBar(1); await window.__sleep(150); const M = window.__M, L = M.hxLoopsLive()[0]; return { bew: !!(L && L.bew), mv: !!(L && L.mv && L.mv.lanes.some((x) => x.key === 'm|hoehe|gk:anl.h')), chip: [...document.querySelectorAll('.hx-chip')].map((b) => b.textContent) }; });
    ck(!r.bew && r.chip.includes('nur Bewegung'), '  the Korb takes the sound (the lean is in it, and in its Bewegung) – and offers „nur Bewegung“ (chips: ' + r.chip.join(' · ') + ')');
    await page.click('.hx-chip:text-is("nur Bewegung")');
    await page.waitForFunction(() => !!(window.__bew() && window.__bew().lanes.length), null, { timeout: 3000 }).catch(() => {});
    const LG = await page.evaluate(() => window.__bew());
    ck(LG && LG.lanes.some((x) => x.k === 'hoehe' && x.src === 'gk:anl.h') && LG.disp && LG.disp.includes('ty') && LG.n >= 96 && (await page.evaluate(() => window.__M.hxLoopsLive().length)) === 1, '  „nur Bewegung“: the lean loops on Höhe in the sound\'s place, as long as its window – with its tilt for the ghost spore (' + (LG && LG.lanes.map((x) => x.src).join(', ') + ', ' + LG.n + ' steps') + ')');
    // leaning still: live and loop add up on the held note
    r = await page.evaluate(async () => {
      const M = window.__M, T = M.MOD.t.hoehe;
      let nl = 0, nf = 0, n = 0;
      for (; n < 20; n++) { const t = M.A.ctx.currentTime; if (T.s.has('gk:anl.h')) nl++; for (const k of T.s.keys()) if (k.startsWith('hxb')) { nf++; break; } await window.__sleep(30); }
      return { nl, nf, n };
    });
    ck(r.nl >= 0.6 * r.n && r.nf === r.n, '  live leaning goes on: both act on Höhe – live (' + r.nl + '/' + r.n + ') plus the Schleife (' + r.nf + '/' + r.n + ')');
    // the note let go, the phone held still: a new note takes the looped lean as its timbre
    await page.evaluate(() => { clearInterval(window.__lean); window.__setPose({ beta: 45, roll: 0 }); });
    await up(1);
    await sleep(600);
    await down(2, 0.6, 0.5);
    await sleep(150);
    const ys = [];
    for (let i = 0; i < 20; i++) { ys.push(await page.evaluate(() => { const M = window.__M, tt = M.touches.get(2), t = M.A.ctx.currentTime, live = M.MOD.t.hoehe.s.get('gk:anl.h'); return [M.faeB(t), M.modY(tt) - tt.y, live ? M.modPt(live, t) : 0]; })); await sleep(70); }
    const L2 = await page.evaluate(() => window.__bew());
    let err = 0, mv = 0;
    for (const [fb, d, lv] of ys) { const e = Math.max(-0.5, Math.min(0.5, (modelB(L2, fb) + lv) * 0.5)); err = Math.max(err, Math.abs(d - e)); mv = Math.max(mv, Math.abs(d)); }
    ck(mv > 0.05 && err < 0.03, '  a new note takes the looped lean as its timbre (up to ' + mv.toFixed(2) + ', off by ' + err.toFixed(3) + ')');
    await up(2);
    // the Gestik card says it (its ghost spore in the Wasserwaage)
    await page.evaluate(() => window.__M.openPanel('dev'));
    await sleep(400);
    r = await page.evaluate(() => { const p = document.querySelector('.gk-fae'); return p && !p.hidden ? p.textContent : ''; });
    ck(/Bewegung spielt/.test(r) && /Spore/.test(r), `  the Gestik card says it: „${r}“`);
    await page.evaluate(() => window.__M.closePanel());
    // ↶ brings the sound back; ↷ the Bewegung again
    r = await page.evaluate(async () => { const M = window.__M; M.hxUndoStep(); await window.__sleep(100); const a = M.hxLoopsLive().map((L) => (L.bew ? 'b' : 'a')).join(''); M.hxRedoStep(); await window.__sleep(100); return [a, M.hxLoopsLive().map((L) => (L.bew ? 'b' : 'a')).join('')]; });
    ck(r[0] === 'a' && r[1] === 'b', '  ↶ brings the sound\'s Schleife back, ↷ the Bewegung again (' + r.join(' → ') + ')');
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); });
    // Tonhöhe: the lean toward the neighbour step, looped – and played back in key on another note
    await down(3, 0.3, 0.5);
    await sleep(300);
    await page.evaluate(() => window.__setPose({ beta: 45, roll: 26 }));
    await sleep(500);
    r = await page.evaluate(() => { const M = window.__M, tt = M.touches.get(3); return { snap: tt.ga && tt.ga.snap, v: M.gaFaeV() }; });
    ck(r.snap === 1 && r.v === 1, 'Tonhöhe: leaning right, the newest note snaps onto its upper neighbour – written down as +1 (the lean toward the step)');
    await sleep(2200);
    await page.evaluate(async () => { await window.__korbAfterBar(1); await window.__sleep(150); });
    await page.click('.hx-chip:text-is("nur Bewegung")').catch(() => {});
    await page.waitForFunction(() => !!(window.__bew() && window.__bew().lanes.length), null, { timeout: 3000 }).catch(() => {});
    await page.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
    await up(3);
    r = await page.evaluate(() => { const M = window.__M, L = M.hxLoopsLive().find((x) => x.bew), t = L && L.bew.lanes.find((x) => x.src === 'gk:anl.t'); return t ? { max: Math.max(...t.v), per: !!t.o.per } : null; });
    ck(r && Math.abs(r.max - 1) < 1e-6 && r.per, '  the Schleife has Tonhöhe as the lean toward the step (+1 = snapped), with its own way onto the notes');
    await sleep(500);
    await down(4, 0.72, 0.5);
    await sleep(200);
    r = await page.evaluate(() => {
      const M = window.__M, tt = M.touches.get(4), up = M.gaStep(tt.f, 1), dn = M.gaStep(tt.f, -1), t = M.A.ctx.currentTime;
      let e = null; for (const [k, x] of M.MOD.t.bend.s) if (k.startsWith('hxb') && k.endsWith('|gk:anl.t')) e = x;
      const v = e ? M.modPt(e, t) : null;
      return { full: M.gaFaePer(tt, 1, true), half: M.gaFaePer(tt, -0.5, true), older: M.gaFaePer(tt, 1, false), I: 1200 * Math.log2(up.f / tt.f), D: 1200 * Math.log2(dn.f / tt.f), v, now: v == null ? null : M.gaFaePer(tt, v, true) };
    });
    ck(Math.abs(r.full - r.I) < 1e-9 && Math.abs(r.half - 0.5 * r.D) < 1e-9 && r.older === 0 && r.v != null && Math.abs(r.now) <= Math.max(Math.abs(r.I), Math.abs(r.D)) + 1e-9, '  played back onto another note: +1 is ITS upper neighbour (' + r.I.toFixed(1) + ' cents), −0.5 half way to its lower one, older notes stay; the Schleife bends it now by ' + (r.now || 0).toFixed(1) + ' cents');
    await up(4);
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(2600); });
    // „Hinlegen erntet“: a binding of Ruhe – putting the phone down tips the Korb
    r = await page.evaluate(async () => {
      const M = window.__M, o = {};
      M.hxHinSet(true); o.bind = M.MAP.user.some((b) => b.type === 'gest' && b.num === 1 && b.target === 'hx.hin');
      window.__drive('map:test:7', 'pan', '0.5*Math.sin(2*Math.PI*t/0.6)'); await window.__sleep(2400);
      const n = M.hxLoopsLive().length;
      window.__sensor(true, { beta: 0, roll: 0 }, 0);   // lying flat and still: Ruhe
      for (let i = 0; i < 80 && M.hxLoopsLive().length === n; i++) await window.__sleep(50);
      o.made = M.hxLoopsLive().length - n; o.ruhe = !!M.GK.ev.ruhe;
      window.__undrive('map:test:7', 'pan'); M.hxHinSet(false); o.off = !M.MAP.user.some((b) => b.target === 'hx.hin');
      return o;
    });
    ck(r.bind && r.ruhe && r.made === 1 && r.off, `„Hinlegen erntet“ (opt-in, a binding of Ruhe): the phone put down – the Korb takes what came before (${r.made} Schleife); off again`);
    ck(!errors.length, 'no page errors (Gestik)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await GF.close();
  }
  // ================= the save format: presets, files, scenes, a reload =================
  {
    let { page, errors } = await GF.open({ url: URL_HX, cfg: {} });
    await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
    await tools(page);
    await page.evaluate(() => { window.__M.setParam('seq.bpm', 120); });
    const mk = async (k, f) => { await page.evaluate(([k, f]) => window.__drive('map:mk:' + k, k, f), [k, f]); await sleep(2400); await page.evaluate(() => window.__korbAfterBar(1)); await page.evaluate((k) => window.__undrive('map:mk:' + k, k), k); return page.evaluate(() => window.__bew()); };
    const L1 = await mk('flt', '0.5*Math.sin(2*Math.PI*t/0.6)');
    await page.evaluate(() => window.__M.openPanel('presets'));
    await page.fill('#presetName', 'Mit Bewegung');
    await page.click('#presetName + button');
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('myzel.user.v1'))[0]);
    ck(st.name === 'Mit Bewegung' && st.fmt === 2 && st.fae && st.fae.v === 1 && st.fae.lanes.length === 1 && st.v['flt.freq'] != null && JSON.stringify(st.fae).length < 4000, 'save format: an own preset (format 2) carries the Schleife of Bewegung as the Fährte did – 16-bit lanes, small (' + JSON.stringify(st.fae).length + ' characters)');
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(100); });
    await page.evaluate(() => { const b = [...document.querySelectorAll('.urow')].find((r) => r.textContent.includes('Mit Bewegung')); b.querySelector('.btn').click(); });
    await sleep(250);
    const L2 = await page.evaluate(() => window.__bew());
    ck(L2 && L2.why === 'preset' && same(L1, L2) && L2.state === 'spielt', '  loading it brings it back as a Schleife of Bewegung – every value within 1/4096');
    ck(await page.evaluate(() => { const M = window.__M, L = window.__bew(); return Math.abs((((L.a / 48 - M.TG.o) % 4) + 4) % 4) < 1e-6 || Math.abs((((L.a / 48 - M.TG.o) % 4) + 4) % 4 - 4) < 1e-6; }), '  starting on the current bar');
    await page.evaluate(() => { const M = window.__M, list = M.userPresets(); list.push({ name: 'Alt', v: Object.assign({}, list[0].v, { 'rev.mix': 0.42 }) }); M.setUserPresets(list); M.closePanel(); });
    await page.evaluate(() => { const M = window.__M; window.__keep = window.__bew().key; M.loadPreset(M.userPresets().find((p) => p.name === 'Alt')); });
    await sleep(150);
    let r = await page.evaluate(() => ({ same: window.__bew() && window.__bew().key === window.__keep, rev: window.__M.P['rev.mix'] }));
    ck(r.same && Math.abs(r.rev - 0.42) < 1e-9, '  a preset of format 1: its sound loads, the Schleife plays on');
    await page.evaluate(() => { window.__M.loadPreset(window.__M.PRESETS[2]); });
    await sleep(150);
    ck(await page.evaluate(() => window.__bew() && window.__bew().key === window.__keep), '  a built-in preset: it plays on');
    await page.evaluate(() => { const M = window.__M, list = M.userPresets(); list.push(Object.assign({ name: 'Ohne', v: list[0].v }, { fmt: 2, fae: null, gk: M.presetExtra().gk })); M.setUserPresets(list); M.loadPreset(M.userPresets().find((p) => p.name === 'Ohne')); });
    await sleep(200);
    ck(await page.evaluate(() => !window.__bew() && !window.__mods('hxb').length), '  a preset of format 2 saved without one: it goes');
    await page.evaluate(() => window.__M.undo());
    await sleep(200);
    ck(same(L1, await page.evaluate(() => window.__bew())), '  „Rückgängig“: the one it replaced is back');
    // the file: version 2 out, both versions in
    const x = await page.evaluate(() => { const M = window.__M, e = M.presetExtra(); return { app: 'Myzel', version: 2, name: 'Datei', values: M.userPresets()[0].v, faehrte: e.fae, gestik: e.gk }; });
    const dir = path.join(__dirname, 'out'); fs.mkdirSync(dir, { recursive: true });
    const f2 = path.join(dir, 'bew-v2.json'), f1 = path.join(dir, 'bew-v1.json');
    fs.writeFileSync(f2, JSON.stringify(x)); fs.writeFileSync(f1, JSON.stringify({ app: 'Myzel', version: 1, name: 'Alt-Datei', values: x.values }));
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); M.closePanel(); M.openPanel('presets'); await window.__sleep(100); });
    await page.setInputFiles('#presetFile', f2); await sleep(300);
    ck(x.faehrte && same(L1, await page.evaluate(() => window.__bew())), '  the file (version 2) has it; importing it, it plays');
    await page.evaluate(() => { window.__keep = window.__bew().key; });
    await page.setInputFiles('#presetFile', f1); await sleep(300);
    ck(await page.evaluate(() => window.__bew() && window.__bew().key === window.__keep), '  a version-1 file loads as before and leaves it alone');
    // the mixer's scenes
    await page.evaluate(() => { const M = window.__M; M.closePanel(); M.mxSnapLoad(); M.setParam('xfin.vol', -3); M.mxSnapStore('a'); });
    ck(await page.evaluate(() => !!window.__M.MX.snap.fae.a && /mit der Bewegung/.test(document.getElementById('toastMsg').textContent)), 'scenes: storing A while it plays keeps it with the scene (the toast says so)');
    const LB = await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(50); return true; }) && await mk('pan', '0.6*Math.sin(2*Math.PI*t/0.5)');
    await page.evaluate(() => { const M = window.__M; M.setParam('xfin.vol', -9); M.mxSnapStore('b'); });
    await page.evaluate(() => { const M = window.__M; M.mxMorphApply(0); });
    await sleep(150);
    const LA = await page.evaluate(() => window.__bew());
    ck(LA && LA.why === 'scene' && same(L1, LA), '  going to scene A brings its one (the Filter)');
    await page.evaluate(() => window.__M.mxMorphApply(0.3)); await sleep(100);
    ck(await page.evaluate(() => window.__bew().lanes[0].k === 'flt'), '  the morph inside A\'s half: nothing changes');
    await page.evaluate(() => window.__M.mxMorphApply(0.7)); await sleep(100);
    const LB2 = await page.evaluate(() => window.__bew());
    ck(same(LB, LB2), '  past half way to B: B\'s one (Panorama)');
    await page.evaluate(() => { const M = window.__M; M.mxMorphApply(0); });
    await sleep(100);
    await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(50); M.mxSnapStore('a'); });
    ck(await page.evaluate(() => !window.__M.MX.snap.fae.a && !!window.__M.MX.snap.fae.b), '  storing A with none playing: A has none any more, B keeps its');
    await page.evaluate(() => { const M = window.__M; M.mxMorphApply(0.0001); M.mxMorphApply(0); });
    ck(await page.evaluate(() => !window.__bew()), '  going to a scene without one leaves things as they are (here: none)');
    await page.evaluate(() => window.__M.mxSnapSwap());
    ck(await page.evaluate(() => !!window.__M.MX.snap.fae.a && !window.__M.MX.snap.fae.b), '  swapping A and B swaps their Schleifen of Bewegung');
    const snap = await page.evaluate(() => localStorage.getItem('myzel.mixsnap.v1'));
    await sleep(700);
    ck(JSON.parse(await page.evaluate(() => localStorage.getItem('myzel.mixsnap.v1')) || snap).fae.a, '  they are stored with the scenes');
    ck(!errors.length, 'no page errors (save)' + (errors.length ? ': ' + errors.join(' | ') : ''));
    // after a reload: scene A brings its one, the own preset its own; a broken stored loop is ignored
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await sleep(1500);
    await tools(page);
    await page.evaluate(() => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); M.mxSnapLoad(); M.mxMorphApply(1); M.mxMorphApply(0); });
    await sleep(200);
    ck(await page.evaluate(() => window.__bew() && window.__bew().lanes[0].k === 'pan'), '  after a reload: scene A brings its one');
    await page.evaluate(() => { const M = window.__M; M.loadPreset(M.userPresets().find((p) => p.name === 'Mit Bewegung')); });
    await sleep(200);
    ck(await page.evaluate(() => window.__bew() && window.__bew().lanes[0].k === 'flt'), '  and the own preset its own');
    r = await page.evaluate(() => { const M = window.__M; return [M.faeDecode({ v: 1, R: 48, n: 192, lanes: [{ k: 'flt', s: 'x', d: 'AAAA' }] }), M.faeDecode({ v: 2 }), M.faeImport({ v: 1, R: 48, n: 5 }, 'x')].map((x) => !!x); });
    ck(r.every((x) => x === false) && (await page.evaluate(() => !!window.__bew())), '  a broken stored loop is ignored (the one that plays goes on)');
    ck(!errors.length, 'no page errors after the reload' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await GF.close();
  }
  console.log('== ' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await GF.close(); process.exit(1); });
