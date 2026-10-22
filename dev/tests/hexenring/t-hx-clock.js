// Hexenring – the Taktgeber (SPEC §2; tests §22): the beat map never jumps (the past is never rewritten, segments join
// without a step, bar lines move only by whole bars while a Schleife exists); a Puls start with a Schleife joins its grid
// (the first step on the loop's pass start, ≤ 1 frame); an external MIDI clock is followed by slews into the future –
// Puls and loop on the device's beat; the fractional tempo of a Schleife (seq.bpm keeps its whole number, the slider
// shows the exact one) and its release; seq.bpm still rounds.   node t-hx-clock.js
const H = require('./hx-h'), MH = require('../midi-tests/h');
const { ok } = H;
const SETUP = () => {
  const M = window.__M;
  // every Puls hit: its scheduled time (and the audio↔performance mapping it was made with)
  window.__hits = [];
  for (const k of Object.keys(M.ENGINES)) { const E = M.ENGINES[k], orig = E.start; E.start = function (v, t, ...rest) { window.__hits.push([t, M.A.ctxOff]); return orig.call(this, v, t, ...rest); }; }
  // a device's clock: pulses on an ideal grid, jittered stamps, extra bytes before chosen pulses (as midi-tests/t-clock.js)
  window.__clock = (o) => new Promise((res) => {
    const per = 60000 / (24 * o.bpm), t0 = o.t0 || performance.now() + 2, log = [];
    let k = 0;
    const step = () => {
      const now = performance.now();
      while (k < o.n && t0 + k * per <= now) {
        const ideal = t0 + k * per;
        for (const e of o.events || []) if (e.k === k) window.__send(e.bytes, o.id || 'c1', ideal - per / 2);
        window.__send([0xf8], o.id || 'c1', ideal + (Math.random() * 2 - 1) * (o.jit || 0));
        log.push(ideal); k++;
      }
      if (k >= o.n) res({ log, per, t0 }); else setTimeout(step, 1);
    };
    step();
  });
  // the map's past: the continuous beat at fixed times, to compare before and after
  window.__past = (span = 4) => { const now = M.A.ctx.currentTime, ts = []; for (let i = 0; i <= 200; i++) ts.push(now - span + (span * i) / 200); return ts.map((t) => [t, M.tgCb(t)]); };
  window.__same = (p) => Math.max(...p.map(([t, b]) => Math.abs(M.tgCb(t) - b)));
  window.__joins = () => { const s = M.TG.seg; let mx = 0; for (let i = 1; i < s.length; i++) { const a = s[i - 1], b = a.b + ((s[i].t - a.t) * a.bpm) / 60; mx = Math.max(mx, Math.abs(b - s[i].b)); if (s[i].t <= a.t) mx = Infinity; } return mx; };
};
(async () => {
  // ---------- the map never jumps; a Puls start joins the grid ----------
  {
    const { page, errors } = await MH.open({ url: H.URL_HX, cfg: { ins: [['c1', 'Clock Box']] } });
    await H.tools(page); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.evaluate(SETUP);
    let r = await page.evaluate(async () => {
      const M = window.__M, out = {}, chk = async (name, fn, wait = 300) => { const p = window.__past(); await fn(); await window.__sleep(wait); out[name] = window.__same(p); };
      M.setParam('v.human', 0); M.setParam('seq.swing', 0);
      await chk('retempo', () => M.setParam('seq.bpm', 120));
      await chk('Puls start (no Schleife)', () => M.seqStart());
      await chk('Puls stop', () => M.seqStop());
      await chk('preset', () => M.loadPreset(M.PRESETS[3]));
      await chk('undo', () => M.undo());
      await chk('fractional tempo', () => M.hxTempo(91.37));
      await chk('slider', () => M.setParam('seq.bpm', 100));
      out.joins = window.__joins(); out.segs = M.TG.seg.length;
      return out;
    });
    const past = Object.entries(r).filter(([k]) => k !== 'joins' && k !== 'segs');
    ok(past.every(([, v]) => v < 1e-9), 'the map\'s past is never rewritten – ' + past.map(([k, v]) => k + ' ' + v.toExponential(1)).join(', ') + ' beats');
    ok(r.joins < 1e-9, `every segment begins where the one before it stands (${r.segs} segments, the largest step ${r.joins.toExponential(1)} beats)`);
    // a Schleife plays (one bar, on the grid): the Puls starts on its pass start; its count began at 0 there, the grid moved by whole bars
    r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate;
      M.setParam('seq.bpm', 96);
      for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
      M.setParam('l0.on', true); M.setParam('l0.eng', 'mem'); M.setParam('l0.div', '0.25'); M.setParam('l0.steps', 16); M.setParam('l0.puls', 16); M.setParam('l0.prob', 1);
      await window.__sleep(200);
      const len = Math.round(4 * 60 / 96 * SR), ch = window.__chunks(len + 2000, (i) => 0.05 * Math.sin(i / 30));
      const id = M.hxLoopNew({ beats: 4 }); M.hxSchichtAdd(id, { chunks: ch, n: len + 2000, pre: 0, len });
      const starts = []; M.HX.loops.get(id).on = (L) => starts.push(L.f);
      await window.__sleep(1500);
      const o0 = M.TG.o, p = window.__past(), t = ctx.currentTime;
      window.__hits.length = 0;
      M.seqStart();
      await window.__sleep(4500);
      const hits = window.__hits.filter(([h]) => h > t).map(([h]) => h).sort((a, b) => a - b);
      M.seqStop(); await M.hxClear('all');
      const first = hits[0], f = M.hxF(first), near = starts.reduce((a, s) => (Math.abs(s - f) < Math.abs(a - f) ? s : a), Infinity);
      return { dF: f - near, shift: M.TG.o - o0, past: window.__same(p), wait: first - t, bars: ((M.tgCb(first) - o0) % 4 + 4) % 4, n: hits.length, starts: starts.length, anchor: M.SEQ.anchorB };
    });
    ok(Math.abs(r.dF) <= 1 && Math.abs(r.shift / 4 - Math.round(r.shift / 4)) < 1e-9 && r.past < 1e-9,
      `with a Schleife the Puls joins its grid: the first step ${r.dF.toFixed(2)} frames from the loop's pass start (≤ 1), after ${r.wait.toFixed(2)} s; the count's origin moved by ${(r.shift / 4).toFixed(6)} bars`);
    ok(r.bars < 1e-6 || r.bars > 4 - 1e-6, `  …on a bar line of the grid as it stood (${r.bars.toExponential(1)} beats off), the Puls counts from 0 there (anchor ${r.anchor})`);
    console.log('errors:', errors.length ? errors.join(' | ') : 'none');
    ok(!errors.length, 'no page errors');
    await MH.close();
  }
  // ---------- MIDI clock: followed by slews into the future ----------
  // (the headless audio device stalls now and then – its clock then lags the device's by the stall, and the Taktgeber
  // slews back over about a beat instead of jumping: errors are judged outside 1.5 s after a stall, the stalls counted)
  {
    const { page, errors } = await MH.open({ url: H.URL_HX, cfg: { ins: [['c1', 'Clock Box']] } });
    await H.tools(page); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.evaluate(SETUP);
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, BPM = 118.7;
      M.setParam('v.human', 0); M.setParam('seq.swing', 0);
      M.setParam('l0.on', true); M.setParam('l0.eng', 'mem'); M.setParam('l0.div', '0.25'); M.setParam('l0.steps', 16); M.setParam('l0.puls', 16); M.setParam('l0.prob', 1);
      for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
      window.__hits.length = 0;
      const pasts = [], tick = setInterval(() => pasts.push(window.__past(1.5)), 400);
      let seen = 0; const chk = setInterval(() => { for (const p of pasts.splice(0)) seen = Math.max(seen, window.__same(p)); }, 150);
      // the Taktgeber's beat against the device's, sampled as the pulses go out (the audio↔performance mapping of that moment)
      const per = 60000 / (24 * BPM), T0 = performance.now() + 2, bErr = [], stalls = [], offs = []; let lastOff = null, k = 0;
      const id = { v: null }, sErr = [];
      const done = new Promise((res) => {
        const step = () => {
          const now = performance.now();
          while (k < 20 * 24 && T0 + k * per <= now) {
            const ideal = T0 + k * per;
            if (k === 48) window.__send([0xfa], 'c1', ideal - per / 2);
            window.__send([0xf8], 'c1', ideal + (Math.random() * 2 - 1) * 1.5);
            offs.push([now, A.ctxOff]);
            if (lastOff != null && Math.abs(A.ctxOff - lastOff) > 1) stalls.push(now);
            lastOff = A.ctxOff;
            if (k >= 72 && k % 6 === 0) bErr.push([now, (M.tgBeat(M.ctxAt(ideal)) - (k - 48) / 24) * 60000 / BPM]);
            if (k === 120) {   // a loop of one bar on the device's grid: its pass starts against the device's bar lines
              const len = Math.round(4 * 60 / BPM * SR), ch = window.__chunks(len + 4000, (i) => 0.02 * Math.sin(i / 40));
              id.v = M.hxLoopNew({ beats: 4 }); M.hxSchichtAdd(id.v, { chunks: ch, n: len + 4000, pre: 0, len });
              M.HX.loops.get(id.v).on = (L) => { const at = M.hxT(L.f) * 1000 + A.ctxOff - (T0 + 48 * per), n = Math.round(at / (96 * per)); sErr.push([performance.now(), at - n * 96 * per]); };
            }
            k++;
          }
          if (k >= 20 * 24) res(); else setTimeout(step, 1);
        };
        step();
      });
      await done;
      clearInterval(tick); clearInterval(chk);
      await window.__sleep(200);
      // calm: the audio↔performance mapping moved less than 1.5 ms over the 1.5 s before (else the audio clock stalled
      // and the Taktgeber is still slewing back – by design it never jumps)
      const calm = (t) => { const w = offs.filter(([u]) => u <= t + 30 && u >= t - 1500).map((x) => x[1]); return !w.length || Math.max(...w) - Math.min(...w) < 1.5; };
      const t48 = T0 + 48 * per, errs = [];
      for (const [t, off] of window.__hits) { if (t <= 0) continue; const pt = t * 1000 + off, at = pt - t48, n = Math.round(at / (6 * per)); if (n >= 4 && n * 6 + 48 < 20 * 24 - 6 && calm(pt)) errs.push(at - n * 6 * per); }
      const segs = M.TG.seg.slice(-80), slope = Math.max(...segs.map((s) => Math.abs(s.bpm / BPM - 1)));
      const o = { ext: M.SEQ.ext && M.SEQ.ext.bpm, seq: M.SEQ.bpm, errs, bErr: bErr.filter(([t]) => calm(t)).map((x) => x[1]), bAll: bErr.map((x) => x[1]), sErr: sErr.filter(([t]) => calm(t)).map((x) => x[1]), stalls: stalls.length, seen, joins: window.__joins(), segs: M.TG.seg.length, slope, run: M.CLK.run };
      window.__send([0xfc], 'c1'); await M.hxClear('all');
      return o;
    });
    const st = (a) => ({ mean: a.reduce((x, y) => x + Math.abs(y), 0) / Math.max(1, a.length), max: Math.max(...a.map(Math.abs)) });
    const e = st(r.errs), b = st(r.bErr), s = st(r.sErr);
    ok(Math.abs(r.ext - 118.7) < 0.4 && r.run && r.seq === r.ext, `a device's clock (118.7 BPM, ±1.5 ms jitter) leads: EXT ${r.ext.toFixed(2)} BPM, the Puls's tempo is it, Start followed`);
    ok(r.seen < 1e-9 && r.joins < 1e-9 && r.slope < 0.11, `followed by slews into the future: the map's past never moved (${r.seen.toExponential(1)} beats), every segment joins (${r.joins.toExponential(1)}), slopes within ${(r.slope * 100).toFixed(2)} % of the device's tempo (${r.stalls} audio stalls meanwhile)`);
    // (a machine whose audio stalls several times a second leaves few calm samples: at least 8 sixteenths and one pass
    // there, and every sample – calm or not – within the 6 ms a Puls hit may be off in midi-tests/t-clock)
    const ba = st(r.bAll);
    ok(r.bErr.length >= 8 && b.mean < 1.5 && b.max < 4, `the Taktgeber on the device's beat: mean ${b.mean.toFixed(2)} ms, max ${b.max.toFixed(2)} ms (${r.bErr.length} calm sixteenths)`);
    ok(r.bAll.length > 40 && ba.max < 6, `  …and over all ${r.bAll.length} sixteenths, stalls and their walk included: mean ${ba.mean.toFixed(2)} ms, max ${ba.max.toFixed(2)} ms`);
    ok(r.errs.length >= 8 && e.mean < 2.5 && e.max < 6, `the Puls on the device's sixteenths: mean ${e.mean.toFixed(2)} ms, max ${e.max.toFixed(2)} ms (${r.errs.length} hits)`);
    ok(r.sErr.length >= 1 && s.max < 4, `a Schleife's pass starts on the device's bar lines: max ${s.max.toFixed(2)} ms (${r.sErr.length} passes)`);
    console.log('errors:', errors.length ? errors.join(' | ') : 'none');
    ok(!errors.length, 'no page errors (clock)');
    await MH.close();
  }
  // ---------- fractional tempo, the slider, the release; seq.bpm rounds ----------
  {
    const { page, errors } = await H.open({});
    await page.evaluate(SETUP);
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, o = {};
      M.openPanel('puls'); await window.__sleep(300);
      const txt = () => { const el = [...document.querySelectorAll('[data-pid="seq.bpm"], #p-seq-bpm')][0]; return el ? el.textContent : M.fmt(M.PD['seq.bpm'], M.P['seq.bpm']); };
      M.setParam('seq.bpm', 84);
      const id = M.hxLoopNew({ beats: 4 });
      M.hxTempo(91.37); await window.__sleep(200);
      o.tg = M.tgBpm(ctx.currentTime + 0.1); o.param = M.P['seq.bpm']; o.src = M.TG.src; o.text = txt(); o.seqBpm = M.seqBpm();
      // the Puls at the exact tempo
      M.setParam('v.human', 0); M.setParam('seq.swing', 0); M.setParam('l0.on', true); M.setParam('l0.div', '0.25'); M.setParam('l0.steps', 16); M.setParam('l0.puls', 16); M.setParam('l0.prob', 1);
      for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
      window.__hits.length = 0; const t0 = ctx.currentTime;
      M.seqStart(); await window.__sleep(3500); M.seqStop();
      const h = window.__hits.map(([t]) => t).filter((t) => t > t0).sort((a, b) => a - b), gaps = h.slice(1).map((t, i) => t - h[i]);
      o.gap = Math.max(...gaps.map((g) => Math.abs(g - 60 / 91.37 / 4)));
      o.preset = (M.loadPreset(M.PRESETS[2]), M.tgBpm(ctx.currentTime + 0.1));   // a preset's own tempo does not move a Schleife's
      // the slider takes the tempo back
      M.setParam('seq.bpm', 100); await window.__sleep(100); o.slider = M.tgBpm(ctx.currentTime + 0.1); o.src2 = M.TG.src;
      // the release: the last Schleife cleared, the tempo returns to the slider's; „Tempo behalten“ keeps it
      M.hxTempo(77.7); await M.hxClear(id); await window.__sleep(100); o.rel = M.tgBpm(ctx.currentTime + 0.1); o.src3 = M.TG.src;
      const id2 = M.hxLoopNew({ beats: 4 }); M.hxTempo(77.7); M.TG.keep = true; await M.hxClear(id2); await window.__sleep(100); o.keep = M.tgBpm(ctx.currentTime + 0.1); M.TG.keep = false; M.TG.hxOn = false; M.seqRetempo();
      // seq.bpm still whole numbers
      M.setParam('seq.bpm', 91.37); await window.__sleep(100); o.round = [M.P['seq.bpm'], M.tgBpm(ctx.currentTime + 0.1)];
      return o;
    });
    ok(r.tg === 91.37 && r.seqBpm === 91.37 && r.param === 84 && r.src === 'hx', `a Schleife's tempo 91.37 BPM: the Taktgeber holds it exactly (${r.tg}), seq.bpm keeps the patch's ${r.param} (TG.src ${r.src})`);
    ok(/91,4/.test(r.text), `  the slider shows the exact tempo („${r.text.replace(/\s+/g, ' ').trim().slice(0, 40)}“)`);
    ok(r.gap < 1e-6, `  the Puls runs on it: sixteenths 60/91.37/4 s apart (largest error ${r.gap.toExponential(1)} s)`);
    ok(r.preset === 91.37, `  a preset with its own tempo leaves a Schleife's (${r.preset})`);
    ok(r.slider === 100 && r.src2 === 'seq', `the slider takes the tempo back (${r.slider}, TG.src ${r.src2})`);
    ok(r.rel === 100 && r.src3 === 'seq' && r.keep === 77.7, `the last Schleife cleared: the tempo returns to the slider's (${r.rel}); with „Tempo behalten“ it stays (${r.keep})`);
    ok(r.round[0] === 91 && r.round[1] === 91, `seq.bpm still takes whole numbers (91.37 → ${r.round[0]}, the Taktgeber ${r.round[1]})`);
    console.log('errors:', errors.length ? errors.join(' | ') : 'none');
    ok(!errors.length, 'no page errors');
    await H.close();
  }
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); await MH.close(); process.exit(1); });
