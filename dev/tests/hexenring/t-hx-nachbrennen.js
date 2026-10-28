// (owner, 28.10.2026, iPad report: every loop „out1“) a Schicht that should play baked and has lost its baked version
// (stored at another sample rate – the iPad's speaker 48 kHz, a headset or an interface 44.1 –, never stored, a bake that
// failed) is baked again from the chain stored with its loop: it plays baked again (out 0, the live chain's copy free),
// the same as its first bake (the filter's LFO where it was); the Leistungsbericht names the rate and the state; loaded at
// another rate, its baked version is converted with it (before: dropped).
//   node t-hx-nachbrennen.js   (Chromium)
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, ctx = A.ctx, sl = window.__sleep, o = {};
    await M.hxWerk();
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 600, 'flt.q': 4, 'flt.lfoRate': 0.9, 'flt.lfoDepth': 1, 'drv.mix': 0.4, 'drv.amt': 0.3, 'rng.mix': 0, 'pha.mix': 0, 'cho.mix': 0, 'mov.pan': 0, 'xfin.route': 'fx' })) M.setParam(k, v);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2); window.__grid(120); await sl(1500);
    const t0 = M.tgTime(Math.ceil(M.tgBeat(ctx.currentTime + 1.2) / 4) * 4), vs = [0, 2, 4].map((d) => M.playNote('neb', t0 - 1, M.N.notes[Math.min(M.N.notes.length - 1, 5 + d)].f, 0.55, 0.7, { bus: M.stripIn('fin') }));
    await window.__until(t0 + 4 + 0.05);
    const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 160 && !S.baked; i++) await sl(100);
    for (const v of vs) if (v && v.release) v.release();
    for (let i = 0; i < 100 && !L.chainRec; i++) await sl(100);   // (its chain is written down once its window has sounded – hxNotesRefresh)
    o.first = { chain: S.chain, baked: S.baked, rec: !!L.chainRec };
    const flat = (ch) => { const n = S.len, l = new Float32Array(n); for (let i = 0; i < n; i++) { const p = S.pre + i, c = ch[Math.floor(p / M.HX_CH)]; if (c) l[i] = c[0][p % M.HX_CH]; } return l; };
    const b1 = flat(S.bak);
    // as after a start at another rate: no baked version, dry through the live chain's copy
    S.bak = null; S.kcB = null; S.sr0 = 44100; S.bakWhy = 'rate'; M.hxSchPlay(S, false, M.hxNextSeam(L).f); await sl(300);
    o.lost = { out: S.out, baked: S.baked, rep: M.lmSchDesc(L) };
    // the chain moved meanwhile – the new bake takes the loop's own, not the live one
    M.setParam('flt.freq', 4000); M.setParam('drv.mix', 0);
    M.hxRebakeLater(L);
    for (let i = 0; i < 200 && !S.baked; i++) await sl(100);
    o.again = { out: S.out, baked: S.baked, why: S.bakWhy, rep: M.lmSchDesc(L) };
    if (S.bak) {
      const b2 = flat(S.bak); let d = 0, s = 0; for (let i = 0; i < b1.length; i++) { d += (b2[i] - b1[i]) ** 2; s += b1[i] * b1[i]; }
      o.nullDb = +(10 * Math.log10(d / s + 1e-30)).toFixed(1);
    }
    o.key = L.key;
    // stored: wait until its audio and baked version are written
    for (let i = 0; i < 300 && !(S.saved >= Math.ceil(S.n / (4 * ctx.sampleRate)) && S.savedB >= Math.ceil(S.n / (4 * ctx.sampleRate))); i++) await sl(100);
    o.stored = [S.saved, S.savedB];
    await sl(1500);   // (the record notes it once the last segment is written – hxSaveMeta)
    // as if recorded at another rate (48 kHz – the iPad's speaker): the record says so
    const rec = await M.idbDo('rings', 'readonly', (st) => st.get(L.key));
    rec.sr = 48000; for (const x of rec.sch) x.sr = 48000;
    await M.idbDo('rings', 'readwrite', (st) => st.put(rec));
    M.IDB.ok = false;   // (nothing written over it before the reload)
    return o;
  });
  // a reload: the loop comes back at this page's rate – its baked version converted with it, not dropped
  await page.waitForTimeout(500);
  await page.reload(); await page.waitForFunction(() => !!window.__M); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  Object.assign(r, await page.evaluate(async (key) => {
    const M = window.__M, sl = (ms) => new Promise((res) => setTimeout(res, ms));
    let L = null; for (let i = 0; i < 100 && !(L = M.hxByKey(key)); i++) await sl(100);
    if (!L) return { re: null };
    const S = M.HX.sch.get(L.sch[0]);
    return { re: { bak: !!S.bak, sr0: S.sr0, desc: M.lmSchDesc(L), out: S.out, why: S.bakWhy } };
  }, r.key));
  console.log(JSON.stringify(r));
  ok(r.first.chain && r.first.baked && r.first.rec, 'a loop through the chain: baked, its chain stored with it');
  ok(r.lost.out === 1 && !r.lost.baked && /:live\/rate/.test(r.lost.rep), `without its baked version: dry through the live chain's copy (out ${r.lost.out}); the report says why (${r.lost.rep})`);
  ok(r.again.baked && r.again.out === 0 && /gebrannt\/nach/.test(r.again.rep), `baked again from its stored chain: out 0 (${r.again.rep})`);
  ok(r.nullDb < -30, `…as its first bake – the filter's LFO where it was, not the live chain of now (difference ${r.nullDb} dB)`);
  ok(r.re && r.re.bak && r.re.sr0 === 48000 && !r.re.why && /48000>\d+:/.test(r.re.desc), `stored at another rate and loaded: its baked version converted with it, nothing dropped (${r.re && r.re.desc})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
