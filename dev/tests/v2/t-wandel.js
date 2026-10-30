// The return „Wandel“ (owner, 30.10.2026: one instead of „Effekt“/„Effekt 2“, a short name, a way through the chain, a new
// effect): 1 one return only, named Wandel, its texts short; 2 fx.weg „kette“ sends the return through a copy of the
// chain into the sum (dTo), „dir“ straight; 3 Flechtwerk: a steady tone through it comes out gated in a Euclidean
// pattern on the Takt (6 of 16 sixteenths at 120 BPM: ≈ 6 hits per bar, the level between hits down by the Tiefe), its
// hits on the Puls's grid.                                                                    node t-wandel.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.ctx && window.__M.A.ctx.__dspOK, null, { timeout: 15000 }); await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    o.rets = M.FX_RETS.map((x) => x[1]); o.strip2 = !!M.MIX.s.fx2; o.texts = Object.values(M.FX_TYPES).map((T) => T.i.length);
    o.typs = Object.keys(M.FX_TYPES);
    // 2 · the way
    const st = M.MIX.s.fx; M.setParam('fx.weg', 'kette'); await sl(200); o.ketteTo = !!(A.fxKette && st.dTo === A.fxKette.in); o.inChains = !!(A.fxKette && A.chains.includes(A.fxKette));
    M.setParam('fx.weg', 'dir'); await sl(200); o.dirTo = st.dTo === A.masterSum;
    // 3 · Flechtwerk on a steady tone: the Puls gives the Takt (120 BPM), the pattern 6 of 16 sixteenths
    M.setParam('seq.bpm', 120); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart(); await sl(300);
    M.setParam('fx.typ', 'flecht'); M.setParam('fx.fsteps', '16'); M.setParam('fx.fschl', 6); M.setParam('fx.fdreh', 0); M.setParam('fx.fraster', '0.25'); M.setParam('fx.ftiefe', 1); M.setParam('fx.ffilt', 0); M.setParam('fx.fweich', 0); M.setParam('fx.fseite', 0); M.setParam('fx.mix', 1);
    await sl(400); const S = A.fxR.fx; o.proc = !!(S.cur && S.cur.typ === 'flecht');
    // a tone into the return's input, its output recorded
    const REC = `class WRec extends AudioWorkletProcessor { constructor() { super(); this.b = []; this.port.onmessage = () => { this.port.postMessage(this.b); this.b = []; }; }
      process(inp) { const a = inp[0]; this.b.push([currentFrame, a && a[0] ? a[0].slice() : new Float32Array(128)]); return true; } } registerProcessor('w-rec', WRec);`;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'text/javascript' })));
    const osc = ctx.createOscillator(); osc.frequency.value = 220; const g = ctx.createGain(); g.gain.value = 0.3; osc.connect(g).connect(S.in);
    const rec = new AudioWorkletNode(ctx, 'w-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; S.ret.connect(rec); rec.connect(z).connect(ctx.destination);
    osc.start(); await sl(2600); osc.stop();
    const got = await new Promise((res) => { rec.port.onmessage = (e) => res(e.data); rec.port.postMessage(1); });
    try { S.ret.disconnect(rec); } catch (e) {}
    const f0 = got[0][0], n = got[got.length - 1][0] + 128 - f0, d = new Float32Array(n); for (const [f, a] of got) d.set(a, f - f0);
    // the envelope in sixteenths of the Takt (125 ms at 120 BPM), aligned to the grid: RMS per sixteenth, over 2 s
    const SR = ctx.sampleRate, fpb = 60 / 120 * SR, f16 = fpb / 4, b0f = M.tgTime(0) * SR, first = Math.ceil((f0 + 0.3 * SR - b0f) / f16) * f16 + b0f;
    const cells = []; for (let k = 0; k < 16; k++) { const a = Math.round(first + k * f16 - f0) + Math.round(0.01 * SR), b = Math.round(first + (k + 1) * f16 - f0) - Math.round(0.01 * SR); let s = 0, m = 0; for (let i = a; i < b; i++) { s += d[i] * d[i]; m++; } cells.push(Math.sqrt(s / Math.max(1, m))); }
    const mx = Math.max(...cells), loud = cells.filter((x) => x > mx * 0.5).length, quiet = cells.filter((x) => x < mx * 0.1).length;
    o.cells = cells.map((x) => +(x / mx).toFixed(2)); o.loud = loud; o.quiet = quiet; o.mx = +mx.toFixed(3);
    // the pattern 6 of 16 (Euclid): hits at 0, 3, 5, 8, 11, 13 – the cells' first step is some step of it; the loud cells' spacing fits
    const idx = o.cells.map((v, i) => (v > 0.5 ? i : -1)).filter((i) => i >= 0), gaps = idx.slice(1).map((v, i) => v - idx[i]);
    o.gaps = gaps;
    M.seqStop(); M.setParam('fx.mix', 0); M.setParam('fx.typ', 'netz');
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.rets.length === 1 && r.rets[0] === 'Wandel' && !r.strip2 && r.texts.every((n) => n <= 70) && r.typs.includes('flecht'), `one return „${r.rets[0]}“, no second strip, every text short (${r.texts.join('/')} chars), Flechtwerk among the choices`);
  ok(r.ketteTo && r.inChains && r.dirTo, `Weg „kette“: through a copy of the chain into the sum (${r.ketteTo}, it follows the knobs ${r.inChains}); „dir“ straight (${r.dirTo})`);
  ok(r.proc && r.mx > 0.05 && r.loud === 6 && r.quiet >= 8 && r.gaps.every((g) => g === 2 || g === 3), `Flechtwerk 6 of 16 on the Takt: ${r.loud} loud sixteenths of 16, ${r.quiet} silent, gaps ${r.gaps.join(',')} (cells ${r.cells.join(' ')})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
