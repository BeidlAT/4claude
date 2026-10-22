// Bar recording in real time (headless Chromium): exact length, downbeat on sample 0, early stop, immediate stop,
// cancel while cueing, tail folding, armed start, Standard latency (oversampled drive).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const M = window.__M;
    window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__untilIdle = async (max = 20000) => { const t0 = performance.now(); while ((M.CAP.state !== 'idle' || M.CAP.finishing) && performance.now() - t0 < max) await window.__wait(50); };
    window.__last = () => { const tk = M.takes[0]; let n = 0; for (const a of tk.L) n += a.length; const L = new Float32Array(n); let o = 0; for (const a of tk.L) { L.set(a, o); o += a.length; } return { tk, L }; };
    window.__onsets = (L, thr = 0.02, gap = 2000) => { const out = []; let last = -1e9; for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) > thr && i - last > gap) { out.push(i); last = i; } else if (Math.abs(L[i]) > thr) last = i; return out; };
    // clean, dry percussive Puls: one Membran hit on every beat, everything else off
    const set = (k, v) => M.setParam(k, v);
    set('rev.mix', 0); set('dly.mix', 0); set('cho.mix', 0); set('pha.mix', 0); set('drv.mix', 0.35); set('bor.on', false);
    set('seq.bpm', 120); set('seq.swing', 0); set('v.human', 0);
    for (let i = 1; i < 4; i++) set('l' + i + '.on', false);
    set('l0.on', true); set('l0.eng', 'mem'); set('l0.steps', 4); set('l0.puls', 4); set('l0.rot', 0); set('l0.div', '1'); set('l0.prob', 1); set('l0.walk', 0); set('l0.vol', 0.9);
    set('rec.len', 'bars'); set('rec.tail', false); set('rec.arm', false);
  });
  const SR = await page.evaluate(() => window.__M.A.ctx.sampleRate);
  const barF = 4 * 60 / 120 * SR;
  // A: Puls off, starts at once, exact length
  let r = await page.evaluate(async () => { const M = window.__M; M.setParam('rec.bars', 2); M.recToggle(); for (let i = 0; i < 150 && M.CAP.state === 'idle'; i++) await window.__wait(10); await window.__wait(100); const st = M.CAP.state; await window.__untilIdle(); const { tk } = window.__last(); return { st, frames: tk.frames, bars: tk.bars, name: tk.name, bpm: tk.bpm }; });
  ok(r.st === 'rec' && r.frames === Math.round(2 * barF) && r.bars === 2 && r.bpm === 120, `A: Puls off → starts at once, ${r.frames} frames = 2 bars exactly (${r.name})`);
  // B: Puls on → begins on a downbeat; hits land on sample 0 and every beat
  for (const lat of ['min', 'std']) {
    r = await page.evaluate(async (lat) => {
      const M = window.__M; M.setParam('dev.lat', lat); M.updDrive();
      M.seqStart(); await window.__wait(1300);
      M.setParam('rec.bars', 1); M.recToggle(); await window.__wait(80); const st = M.CAP.state;
      await window.__untilIdle(); M.seqStop(); await window.__wait(600);
      const { tk, L } = window.__last(); return { st, frames: tk.frames, on: window.__onsets(L), os: M.A.drvShaper.oversample };
    }, lat);
    const beats = r.on.map((x) => x / (barF / 4));
    ok(r.frames === Math.round(barF) && r.on.length === 4 && beats.every((b, i) => Math.abs(b - i) * (barF / 4) < 48), `B/${lat} (drive ${r.os}): 1 bar, ${r.st === 'cue' ? 'waited for' : 'took'} the downbeat, hits at samples ${r.on.join(', ')}`);
  }
  // C: tapping during bar 2 of 8 ends after bar 2
  r = await page.evaluate(async () => {
    const M = window.__M; M.seqStart(); await window.__wait(600);
    M.setParam('rec.bars', 8); M.recToggle();
    while (M.CAP.state !== 'rec') await window.__wait(20);
    await window.__wait(3000); M.recToggle(); const label = document.querySelector('#recLabel').textContent;
    await window.__untilIdle(); M.seqStop(); const { tk } = window.__last(); return { frames: tk.frames, bars: tk.bars, name: tk.name, label };
  });
  ok(r.frames === Math.round(2 * barF) && r.bars === 2 && /2 Takte/.test(r.name), `C: early stop rounds to the bar: ${r.frames} frames, "${r.name}", label ${r.label}`);
  // D: second tap stops at once
  r = await page.evaluate(async () => {
    const M = window.__M; await window.__wait(700); M.setParam('rec.bars', 8); M.recToggle(); await window.__wait(1000); M.recToggle(); M.recToggle();
    await window.__untilIdle(); const { tk } = window.__last(); return { frames: tk.frames, bars: tk.bars };
  });
  ok(r.bars === 0 && r.frames > SR * 0.8 && r.frames < SR * 1.6, `D: double tap stops at once (${(r.frames / SR).toFixed(2)} s, no longer a loop)`);
  // E: cancel while waiting for the downbeat
  r = await page.evaluate(async () => {
    const M = window.__M; const n0 = M.takes.length; M.seqStart(); await window.__wait(300);
    // make sure we are early in a bar so it has to wait
    while (((M.beatAt(M.A.ctx.currentTime) % 4) + 4) % 4 < 0.6 || ((M.beatAt(M.A.ctx.currentTime) % 4) + 4) % 4 > 2) await window.__wait(20);
    M.recToggle(); const st = M.CAP.state; await window.__wait(200); M.recToggle(); await window.__wait(300); M.seqStop();
    return { st, after: M.CAP.state, same: M.takes.length === n0 };
  });
  ok(r.st === 'cue' && r.after === 'idle' && r.same, 'E: tapping while it waits for the downbeat cancels without a take');
  // F: tail folding – a ringing bell at the end shows up at the start of the loop
  r = await page.evaluate(async () => {
    const M = window.__M, res = {};
    M.setParam('rev.mix', 0.6); M.setParam('rev.size', 6);
    for (const tail of [false, true]) {
      M.setParam('rec.tail', tail); M.setParam('rec.bars', 1);
      M.recToggle(); await window.__wait(1200);
      const n = M.noteAt(0.5); M.playNote('glo', M.A.ctx.currentTime, n.f, 0.6, 0.9, {});
      await window.__untilIdle();
      const { tk, L } = window.__last(); let e = 0; for (let i = 0; i < Math.floor(tk.sr * 0.5); i++) e += L[i] * L[i];
      res[tail] = { frames: tk.frames, startDb: +(10 * Math.log10(e / (tk.sr * 0.5) + 1e-20)).toFixed(1) };
      await window.__wait(2500);
    }
    M.setParam('rev.mix', 0);
    return res;
  });
  ok(r.true.frames === Math.round(barF) && r.false.frames === Math.round(barF) && r.true.startDb > r.false.startDb + 12, `F (${r.false.frames}/${r.true.frames}): tail folded into the start (${r.false.startDb} dB → ${r.true.startDb} dB in the first 0.5 s), length unchanged`);
  // G: armed, Puls off – the first note starts bar 1
  r = await page.evaluate(async () => {
    const M = window.__M; M.setParam('rec.tail', false); M.setParam('rec.arm', true); M.setParam('rec.bars', 1);
    M.recToggle(); const st = M.CAP.state; await window.__wait(700);
    // (a struck note – its onset is where it starts, not where a slow attack crosses the threshold – tapped as played: the
    // release in a task of its own; a voice starts only once the task that made it has ended)
    M.setParam('v.eng', 'mem'); M.setParam('v.layer', 'off'); await window.__wait(300);
    M.onDown({ pointerId: 'k', pt: { x: 0.3, y: 0.5, px: 100, py: 100 } }); await window.__wait(30); M.onUp({ pointerId: 'k' });
    await window.__untilIdle(); const { tk, L } = window.__last(); M.setParam('rec.arm', false);
    return { st, frames: tk.frames, first: window.__onsets(L, 0.005)[0] };
  });
  ok(r.st === 'armed' && r.frames === Math.round(barF) && r.first < 256, `G: armed recording starts on the first note (onset at sample ${r.first})`);
  console.log('gaps', JSON.stringify(await page.evaluate(() => window.__gaps || [])));
  ok(!errors.length, 'no errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
