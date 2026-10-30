// (owner, 29.10.2026: „beim Presetwechsel … passt sich der neue Sound verspätet an – manchmal schneller, manchmal nach
// 1–2 Minuten“ – „es macht nichts wenn es laden muss … dann einen Ladebalken“) „Schleifen spielen mit dem Instrument des
// Presets“: a preset loaded just after a long loop's seam (4 bars at 60 BPM, 16 s a pass) is heard in the loop as soon
// as its Treu version is rendered – mid-pass, not at the seam after it – and stays; a loading bar over the rail shows
// it coming („Neuer Klang da“, then gone).   node t-hx-sofort.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(60); await sl(500);
    M.setParam('ui.instrument', 'preset'); M.setParam('ui.tonart', 'preset');
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4); M.setParam('v.eng', 'glo');
    const beat = 60 / M.tgBpm(A.ctx.currentTime);
    const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
    window.__riff(t0, beat, [0, 2, 4, 7], 4, { eng: 'glo', dur: beat * 0.6 });
    await window.__until(t0 + 16 * beat + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
    const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await sl(100); M.hxWNotesAll(L); }
    await sl(2000);
    // the share of the loop's energy above 2 kHz, in dB – the preset below (another source, its filter at 1.4 kHz) has
    // far less there; 1-s windows (the field silent: its lanes off, nothing played)
    const an = A.ctx.createAnalyser(); an.fftSize = 8192; M.A.out.connect(an);
    const sr = A.ctx.sampleRate, b = new Float32Array(an.frequencyBinCount), i2k = Math.round(2000 / (sr / 8192));
    const hf = async (ms) => {
      let lo = 0, hi = 0; const end = performance.now() + ms;
      while (performance.now() < end) { an.getFloatFrequencyData(b); for (let i = 2; i < b.length; i++) { const e = Math.pow(10, b[i] / 10); if (i < i2k) lo += e; else hi += e; } await sl(40); }
      return 10 * Math.log10(hi / (lo + hi) + 1e-12);
    };
    o.old = []; for (let i = 0; i < 16; i++) o.old.push(await hf(1000));   // (one whole pass in the old sound)
    const oMin = Math.min(...o.old);
    // just after a seam: the old way waited for the next one, 16 s on (and longer when the render was not done by then)
    const fNow = () => Math.round(M.hxF(A.ctx.currentTime)), k = M.hxPassK(L, fNow());
    while (M.hxPassK(L, fNow()) === k) await sl(20);
    await sl(400);
    const pr = { name: 'Anderes Instrument', v: Object.assign(M.patchValues(), { 'v.eng': 'mem', 'flt.freq': 1400, 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false }) };
    const bar = document.getElementById('hxLade'); o.bar = { seen: 0, max: 0, txt: '', end: '' };
    const bt = setInterval(() => { if (!bar) return; if (!bar.hidden && !bar.classList.contains('fertig')) { o.bar.seen++; o.bar.max = Math.max(o.bar.max, parseInt(bar.querySelector('i').style.width) || 0); o.bar.txt = bar.querySelector('.t').textContent; } if (bar.classList.contains('fertig')) o.bar.end = bar.querySelector('.t').textContent; }, 50);
    const tl = performance.now(); M.loadPreset(pr);
    let done = null; const dt = setInterval(() => { if (done == null && !S.wBusy && !S.wAgain && S.play === 'wu') done = (performance.now() - tl) / 1000; }, 20);
    o.win = []; let heard = null;
    for (let i = 0; i < 20 && heard == null; i++) { const w = await hf(1000); o.win.push(Math.round(w * 10) / 10); if (w < oMin - 6) heard = (performance.now() - tl) / 1000; }
    o.heard = heard; o.oMin = oMin;
    await sl(Math.max(0, 24000 - (performance.now() - tl)));
    o.later = []; for (let i = 0; i < 16; i++) o.later.push(await hf(1000));
    o.done = done; o.play = S.play;
    clearInterval(bt); clearInterval(dt); o.bar.hidden = bar ? bar.hidden : null;
    try { M.A.out.disconnect(an); } catch (e) {}
    return o;
  });
  console.log(JSON.stringify(r));
  const lat = Math.max(...r.later);
  ok(r.done != null && r.heard != null && r.heard <= r.done + 2.2, `the preset's instrument heard ${r.heard != null ? r.heard.toFixed(1) + ' s' : 'not within 20 s'} after loading – its Treu version was there after ${r.done != null ? r.done.toFixed(1) : '?'} s (the pass 16 s; windows ${r.win.join(', ')} dB above 2 kHz, the old sound ≥ ${r.oMin.toFixed(1)})`);
  ok(lat < r.oMin - 6, `and it stays (the next pass: at most ${lat.toFixed(1)} dB above 2 kHz, ${r.play})`);
  ok(r.bar.seen > 3 && /Schleife 1/.test(r.bar.txt) && r.bar.end === 'Neuer Klang da' && r.bar.hidden, `the loading bar: shown (${r.bar.seen}×, up to ${r.bar.max} %, „${r.bar.txt}“), then „${r.bar.end}“, then gone (${r.bar.hidden})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
