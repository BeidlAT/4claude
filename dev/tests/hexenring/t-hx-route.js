// Hexenring – a Schleife's way, as every channel's (owner, 31.10.2026: „die Schleifen so routen wie andere Spuren … wurde
// mit Effekten aufgenommen, schaltet Myzel sie auf Direkt; auf Kette jagt man sie noch einmal durch die Effekte“ – and
// „eine Schleife geht nur durch einen Effekt, wenn man das möchte“):
//  1 the strip „Hexenring“ goes straight to the master; a Schleife recorded through the chain is burnt in and plays Direkt
//  2 Kette with only the Verzerrung: the processor hands it to its pair, the page takes the pair into the chain of just that
//    effect – a hot drive adds harmonics it did not have on Direkt; the loop still sounds (no hole)
//  3 Kette with only the Filter (open): about the level of Direkt (no drive twice); back to Direkt: its way gone
//  4 the Hexenring's own channel sets every Schleife; a new Schleife plays Direkt
//                                                                                              node t-hx-route.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const r = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('xhxr.route', 'dir'); M.setParam('drv.mix', 0); M.setParam('rev.mix', 0); M.setParam('dly.mix', 0);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const mk = async () => {
      const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
      for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4], 0.9, 0.3]);
      window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(800);
      const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0], S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 300 && !(S.aud && (S.baked || !S.chain)); i++) await sl(100);
      return [L, S];
    };
    const [L, S] = await mk();
    o.n = M.hxLoopsLive().length; o.chain = !!S.chain; o.baked0 = !!S.baked; o.weg0 = M.hxWegM(L); o.out0 = S.out;
    // the sum: its RMS (dB) and how much of it lies above 2.5 kHz (the drive's harmonics; a Glocke's own partials are few)
    const lvl = async (ms) => { const b = new Float32Array(2048), f = new Float32Array(A.analyser.frequencyBinCount); let s = 0, hi = 0, all = 0, k = 0; const t0 = performance.now(), bin = A.ctx.sampleRate / A.analyser.fftSize;
      while (performance.now() - t0 < ms) { A.analyser.getFloatTimeDomainData(b); let q = 0; for (const x of b) q += x * x; s += q / b.length; A.analyser.getFloatFrequencyData(f); for (let i = 1; i < f.length; i++) { const p = Math.pow(10, f[i] / 10); all += p; if (i * bin > 2500) hi += p; } k++; await sl(40); }
      return [+(10 * Math.log10(s / k + 1e-20)).toFixed(1), +(10 * Math.log10(hi / (all + 1e-30) + 1e-20)).toFixed(1)]; };
    const st = M.MIX.s.hxr, gM = M.hxGateM(), wait = async () => { await sl(Math.round(M.hxLen(L) * 1000) + 700); };
    await sl(1000); [o.dirLvl, o.dirHi] = await lvl(2500); o.dirTo = st.dTo === gM;
    // Kette with only the Verzerrung, hot
    M.setParam('drv.mix', 1); M.setParam('drv.amt', 0.95);
    M.hxWegSet(L, 'fx', 1); await wait();
    o.vR = !!M.HXWG.r.get(L.id); o.vM = M.HXWG.r.get(L.id) && M.HXWG.r.get(L.id).m; o.vSend = L.sendCh;
    [o.vLvl, o.vHi] = await lvl(2500);
    // only the Filter (open, low pass at 20 kHz): no drive on it
    M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 20000);
    M.hxWegSet(L, 'fx', 4); await wait(); [o.fLvl, o.fHi] = await lvl(2500); o.fM = M.HXWG.r.get(L.id) && M.HXWG.r.get(L.id).m;
    // back to Direkt
    M.hxWegSet(L, 'dir'); await wait(); o.back = !M.HXWG.r.get(L.id); [o.bLvl] = await lvl(2000);
    // the Hexenring's channel: every Schleife; a new one plays Direkt
    const [L2] = await mk(); o.new2 = M.hxWegM(L2);
    M.setParam('xhxr.fxm', 2); M.setParam('xhxr.route', 'fx'); await sl(500); o.allM = [M.hxWegM(L), M.hxWegM(L2)];
    M.setParam('xhxr.route', 'dir'); await sl(500); o.allD = [M.hxWegM(L), M.hxWegM(L2)];
    M.setParam('drv.mix', 0); M.setParam('drv.amt', 0.35); M.setParam('rev.mix', 0.3); M.setParam('xhxr.fxm', 31); M.hxStille();
    return o;
  }, BPM);
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.chain && r.baked0 && r.weg0 === 0 && r.out0 === 0 && r.dirTo, `recorded through the chain: burnt in, plays Direkt (way ${r.weg0}, out ${r.out0}); the strip straight to the master`);
  ok(r.vR && r.vM === 1 && r.vSend >= 0 && r.vLvl > r.dirLvl - 6 && r.vHi > r.dirHi + 6, `Kette, only Verzerrung: its pair into that chain (send ${r.vSend}) – it sounds (${r.vLvl} dB vs ${r.dirLvl}), the drive's harmonics come (${r.vHi} vs ${r.dirHi} dB above 2.5 kHz)`);
  ok(r.fM === 4 && Math.abs(r.fLvl - r.dirLvl) < 2 && r.fHi < r.vHi - 4, `Kette, only Filter (open): as loud as Direkt (${r.fLvl} vs ${r.dirLvl} dB), no drive (${r.fHi} dB above 2.5 kHz)`);
  ok(r.back && Math.abs(r.bLvl - r.dirLvl) < 1.5, `back to Direkt: its way gone, the level as before (${r.bLvl} dB)`);
  ok(r.new2 === 0 && r.allM[0] === 2 && r.allM[1] === 2 && r.allD[0] === 0 && r.allD[1] === 0, `a new Schleife plays Direkt; the Hexenring's channel sets every one (${r.allM} → ${r.allD})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
