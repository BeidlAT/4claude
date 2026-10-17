// Review-fix checks: re-cue on a tempo change while waiting, wrap-around fold for a ring-out longer than the loop,
// the invited second tap after the end, and names of bar takes.
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
    const M = window.__M, set = (k, v) => M.setParam(k, v);
    window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__untilIdle = async (max = 20000) => { const t0 = performance.now(); while ((M.CAP.state !== 'idle' || M.CAP.finishing) && performance.now() - t0 < max) await window.__wait(50); };
    window.__last = () => { const tk = M.takes[0]; let n = 0; for (const a of tk.L) n += a.length; const L = new Float32Array(n); let o = 0; for (const a of tk.L) { L.set(a, o); o += a.length; } return { tk, L }; };
    window.__onsets = (L, thr = 0.02, gap = 2000) => { const out = []; let last = -1e9; for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) > thr && i - last > gap) { out.push(i); last = i; } else if (Math.abs(L[i]) > thr) last = i; return out; };
    set('rev.mix', 0); set('dly.mix', 0); set('cho.mix', 0); set('pha.mix', 0); set('bor.on', false); set('seq.swing', 0); set('v.human', 0);
    for (let i = 1; i < 4; i++) set('l' + i + '.on', false);
    set('l0.on', true); set('l0.eng', 'mem'); set('l0.steps', 4); set('l0.puls', 4); set('l0.rot', 0); set('l0.div', '1'); set('l0.prob', 1); set('l0.walk', 0); set('l0.vol', 0.9);
    set('rec.len', 'bars'); set('rec.tail', false); set('rec.arm', false); set('seq.bpm', 120);
  });
  const SR = await page.evaluate(() => window.__M.A.ctx.sampleRate);
  // 1) tempo change while cueing: the window follows the new grid
  let r = await page.evaluate(async () => {
    const M = window.__M; M.seqStart(); await window.__wait(700);
    while (((M.beatAt(M.A.ctx.currentTime) % 4) + 4) % 4 < 0.5 || ((M.beatAt(M.A.ctx.currentTime) % 4) + 4) % 4 > 1.5) await window.__wait(20);
    M.setParam('rec.bars', 1); M.recToggle();
    for (let i = 0; i < 100 && M.CAP.state !== 'cue'; i++) await window.__wait(10);
    const st = M.CAP.state, f0a = M.CAP.bar.f0;
    await window.__wait(100); M.setParam('seq.bpm', 100); const moved = M.CAP.bar && M.CAP.bar.f0 !== f0a;
    await window.__untilIdle(); M.seqStop(); await window.__wait(500);
    const { tk, L } = window.__last(); return { st, moved, frames: tk.frames, bpm: tk.bpm, name: tk.name, on: window.__onsets(L) };
  });
  const barF100 = 4 * 60 / 100 * SR, q = barF100 / 4;
  ok(r.st === 'cue' && r.moved && r.frames === Math.round(barF100) && r.bpm === 100 && r.on.length === 4 && r.on.every((x, i) => Math.abs(x - i * q) < 48), `1) tempo change while waiting → new grid: ${JSON.stringify(r)}`);
  // 2) ring-out longer than a 1-bar loop at 200 BPM wraps around (and stays exact)
  r = await page.evaluate(async () => {
    const M = window.__M; M.setParam('seq.bpm', 200); M.setParam('rec.tail', true); M.setParam('rec.bars', 1);
    M.setParam('rev.mix', 0.7); M.setParam('rev.size', 9);
    M.recToggle(); await window.__wait(300);
    M.playNote('glo', M.A.ctx.currentTime, 330, 0.8, 0.9, {});
    await window.__untilIdle(30000);
    const { tk, L } = window.__last(); let e1 = 0, e2 = 0, n = L.length;
    for (let i = 0; i < Math.floor(SR_ = M.A.ctx.sampleRate * 0.25); i++) e1 += L[i] * L[i];
    for (let i = n - Math.floor(M.A.ctx.sampleRate * 0.25); i < n; i++) e2 += L[i] * L[i];
    M.setParam('rev.mix', 0);
    return { frames: tk.frames, seamless: tk.seamless, startDb: 10 * Math.log10(e1 + 1e-20), endDb: 10 * Math.log10(e2 + 1e-20) };
  });
  ok(r.frames === Math.round(4 * 60 / 200 * SR) && r.seamless && Math.abs(r.startDb - r.endDb) < 8, `2) long ring-out wraps: exact ${r.frames} frames, start ${r.startDb.toFixed(1)} dB vs end ${r.endDb.toFixed(1)} dB, seamless ${r.seamless}`);
  // 3) the invited second tap just after the end does not start a new take
  r = await page.evaluate(async () => {
    const M = window.__M; M.setParam('rec.tail', false); M.setParam('seq.bpm', 120); M.setParam('rec.bars', 4); M.seqStart(); await window.__wait(400);
    M.recToggle(); while (M.CAP.state !== 'rec') await window.__wait(20);
    // tap shortly before the end of bar 1 so the take finishes while the second tap is on its way
    const b = M.CAP.bar, sr = M.A.ctx.sampleRate; while ((M.A.ctx.currentTime * sr - b.f0) / b.barF < 0.93) await window.__wait(5);
    M.recToggle(); const n0 = M.takes.length;
    await window.__untilIdle(); M.recToggle(); await window.__wait(100);
    const st = M.CAP.state; M.seqStop();
    return { st, newTakes: M.takes.length - n0, name: M.takes[0].name };
  });
  ok(r.st === 'idle' && r.newTakes === 1 && /1 Takt · 120 BPM/.test(r.name), `3) second tap after the end is ignored (${r.name})`);
  ok(!errors.length, 'no errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
