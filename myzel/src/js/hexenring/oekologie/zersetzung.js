// ---- Zersetzung per Schicht (SPEC §15, KONZEPT §6) – the clean Schicht is always kept, every pass gets a version of its
// own, swapped in at its seam (out of time: the next one). Both work on the Schicht's steady pass – rendered once by the
// processor offline (its Ausklang folded in, as it plays at the loop's length), periodic: its seam joins it to itself.
//   Einwurzeln (Lucier): each pass the version plays through a web of its own, tuned to the scale now (gspFreqs, the
//   live web's settings, level 3), the web's steady answer mixed in by the depth d and the loudness kept –
//   v' = norm((1 − d)·v + d·web(v)); after 10–30 passes what is left is what the scale makes ring, and a new scale
//   draws the roots after it slowly. Rendered offline (an OfflineAudioContext, its own thread): no live voice budget.
//   Abrieb nach Moder: from the clean pass and its age, in a Worker: STFT (1024, hop 256), the partials above a cutoff
//   falling with the age crumble – per frame and third of an octave a grain kept by chance, its bins with a random
//   phase (seeded: the same pass the same crackle), crackle at their own pitches – and a low shelf warms. ----
const HX_EINW = [[0, 'aus'], [0.03, 'sanft'], [0.08, 'mittel'], [0.2, 'tief']];
const HX_MODER = [[0, 'aus'], [0.04, 'langsam'], [0.1, 'mittel'], [0.25, 'schnell']];
const hxZersOn = (L) => !!(L && !L.bew && !L.acc && ((L.einw || 0) > 0 || (L.moder && L.moder.rate > 0)));
function hxEinwSet(L, d) { L.einw = d; if (!(d > 0)) hxZersOff(L, 'einw'); hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Einwurzeln ' + HX_EINW.find((x) => x[0] === d)[1]); }
function hxModerSet(L, rate, fresh) {
  const seed = (L.moder && L.moder.seed) || (((Math.random() * 2147483646) | 0) + 1);
  if (fresh) { for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.zr) S.zr.age = 0; } hxSay(hxName(L) + ': Moder aufgefrischt'); return; }
  L.moder = rate > 0 ? { rate, seed } : null;
  if (!(rate > 0)) hxZersOff(L, 'moder');
  hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Abrieb nach Moder ' + HX_MODER.find((x) => x[0] === rate)[1]);
}
// one of them off: the clean Schicht (or the roots alone) from the next seam
function hxZersOff(L, what) {
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!S || !S.zr) continue;
    if (what === 'einw') { S.zr.cur = null; S.zr.gen = 0; }
    if (what === 'moder') S.zr.age = 0;
    if (!hxZersOn(L)) { S.zr = null; if (S.zrV && (!S.play || S.play === 'ab')) hxZersBack(L, S); }
  }
}
// what the Schicht plays as an Abdruck: baked (out 0), or dry where the loop follows the live chain
const hxZersSrc = (L, S) => (S.bak && S.chain && !L.folgt ? S.bak : S.aud);
// back to the clean Schicht at the next seam (with the drift it was played with: the version's own was its map)
function hxZersBack(L, S) {
  S.zrV = false;
  const bak = !!(S.bak && S.chain && !L.folgt), aud = bak ? S.bak : S.aud; if (!aud || !HX.node) return;
  const [cp, tr] = hxCopy(aud), out = bak || !S.chain ? 0 : 1, au = S.aus ? { off: S.aus.off, len: S.aus.len, fade: S.aus.fade != null ? S.aus.fade : Math.min(Math.round(0.03 * SR), S.aus.len) } : null;
  const d = { loop: S.loop, schicht: S.id, chunks: cp, n: S.n, pre: S.pre, len: S.len, ausklang: au, f: hxNextSeam(L).f, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: (bak ? S.kcB : S.kc) || 0, out, dd: out && !L.folgt ? 0 : 1 };
  if (S.dr) { d.dr = Float32Array.from(S.dr); tr.push(d.dr.buffer); }
  hxPost({ replace: d }, tr); S.out = out; S.baked = bak; hxCount();
}
// the Schicht's steady pass at the loop's length: one period, its seam inside (as Zusammenlegen renders one, §14)
async function hxZersBase(L, S) {
  const k = hxPassK(L, Math.round(hxF(hxNowT()))), Lf = hxPassF(L, k + 1) - hxPassF(L, k), src = hxZersSrc(L, S);
  if (!src || Lf < 64) return null;
  const tail = S.aus ? S.aus.len : 0, passes = Math.ceil(tail / Lf) + 2, ctx = new OfflineAudioContext(2, Lf * (passes + 1), SR);
  if (!(await ensureDSP(ctx))) return null;
  const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gain: 1 } }, { schicht: { loop: 1, id: 1, chunks: src, n: S.n, pre: S.pre, len: S.len, ausklang: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, gain: 1, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: (S.baked ? S.kcB : S.kc) || 0, fin: 0 } }];
  const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: HX_CH, msgs } });
  node.connect(ctx.destination, 0);
  const buf = await ctx.startRendering(), a = passes * Lf;
  const Lb = buf.getChannelData(0).slice(a, a + Lf), Rb = buf.getChannelData(1).slice(a, a + Lf);
  return { L: Lb, R: Rb, Lf, ver: S.ver || 0, rms: hxRms2(Lb, Rb), src };
}
const hxRms2 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i] + b[i] * b[i]; return Math.sqrt(s / Math.max(1, 2 * a.length)); };
// one generation of Einwurzeln: the pass looped through a web of its own until it answers steadily, its last pass. As in
// Lucier's room, every re-recording carries a little noise (−45 dB under the pass, seeded by the generation): the web
// rings it at its own tones – that is where new roots grow from after a scale change (a tone the loop does not hold at
// all would otherwise never come); the noise itself is never mixed in, only the web's answer to it
async function hxEinwPass(V, d, gen) {
  const Lf = V.L.length, warm = Math.max(2, Math.ceil((4 + 2 * P['gsp.nachklang']) * SR / Lf)), ctx = new OfflineAudioContext(2, Lf * (warm + 1), SR);
  if (!(await ensureDSP(ctx))) return null;
  const ab = ctx.createBuffer(2, Lf, SR), aL = ab.getChannelData(0), aR = ab.getChannelData(1), nz = hxRms2(V.L, V.R) * Math.pow(10, -45 / 20) * Math.sqrt(3);
  let h = ((gen | 0) * 2654435761 + 12345) >>> 0; const rnd = () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 2147483648 - 1; };
  for (let i = 0; i < Lf; i++) { aL[i] = V.L[i] + nz * rnd(); aR[i] = V.R[i] + nz * rnd(); }
  const src = ctx.createBufferSource(); src.buffer = ab; src.loop = true;
  const web = new AudioWorkletNode(ctx, 'myzel-web', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { rich: true, lite: 0, prm: gspPrm(), freqs: gspFreqs(), seed: 7 } });
  src.connect(web).connect(ctx.destination); src.start(0);
  const buf = await ctx.startRendering(), a = warm * Lf, WL = buf.getChannelData(0).subarray(a, a + Lf), WR = buf.getChannelData(1).subarray(a, a + Lf);
  const rv = hxRms2(V.L, V.R), rw = hxRms2(WL, WR), kw = rw > 1e-9 ? rv / rw : 0, oL = new Float32Array(Lf), oR = new Float32Array(Lf);
  for (let i = 0; i < Lf; i++) { oL[i] = (1 - d) * V.L[i] + d * kw * WL[i]; oR[i] = (1 - d) * V.R[i] + d * kw * WR[i]; }
  const r = hxRms2(oL, oR), g = r > 1e-9 ? V.rms0 / r : 1;   // (the loudness kept: the clean pass's)
  for (let i = 0; i < Lf; i++) { oL[i] *= g; oR[i] *= g; }
  return { L: oL, R: oR, rms0: V.rms0 };
}
// a periodic pass as a version: its end before it, its start after it (the resampler's taps and the seam read across)
function hxZersVer(V) {
  const Lf = V.L.length, M = 64, X = Math.round(0.01 * SR), n = M + Lf + X + M, [aud] = hxChunks(n);
  for (let i = 0; i < n; i++) { const j = (((i - M) % Lf) + Lf) % Lf, c = aud[Math.floor(i / HX_CH)]; c[0][i % HX_CH] = V.L[j]; c[1][i % HX_CH] = V.R[j]; }
  return { aud, n, pre: M, len: Lf, X };
}
// every tick (cheap): each Schicht of a rooting or rotting loop gets the next pass's version made, one job at a time
function hxZersTick(now) {
  if (HX.zBusy) return;
  for (const L of hxLoopsLive()) {
    if (!hxZersOn(L) || L.state !== 'spielt' || hxWAktiv(L) || L.live) continue;
    const kNow = hxPassK(L, Math.round(hxF(now))), kN = kNow + 1;
    for (const id of L.sch) {
      const S = HX.sch.get(id); if (!S || !S.aud || S.mute || (S.chain && !S.baked && !L.folgt)) continue;   // (a dry one waiting for its bake waits)
      const Z = S.zr || (S.zr = { gen: 0, age: 0, k: -1, cur: null, base: null });
      if (Z.k >= kN) continue;
      HX.zBusy = true; Z.k = kN;
      hxZersJob(L, S, Z, kN).catch((e) => console.warn(e)).finally(() => { HX.zBusy = false; });
      return;
    }
  }
}
async function hxZersJob(L, S, Z, k) {
  const t0 = performance.now(), lk = L.key, Lf = hxPassF(L, k + 1) - hxPassF(L, k);
  if ((!Z.base || !S.zrV) && !hxMemOk(2 * Lf)) return;   // (final pass: its steady pass, roots and versions within the Speichergrenze – else the clean Schicht plays on)
  if (!Z.base || Z.base.ver !== (S.ver || 0) || Math.abs(Z.base.Lf - Lf) > 8 || Z.base.src !== hxZersSrc(L, S)) { Z.base = await hxZersBase(L, S); Z.cur = null; Z.gen = 0; if (!Z.base) return; }
  const X = hxByKey(lk); if (!X || !HX.sch.has(S.id) || !hxZersOn(X)) return;
  let V = Z.cur || { L: Z.base.L, R: Z.base.R, rms0: Z.base.rms };
  if ((X.einw || 0) > 0) { const nV = await hxEinwPass(V, X.einw, Z.gen + 1); if (nV) { V = nV; Z.cur = nV; Z.gen++; } }
  let out = V;
  if (X.moder && X.moder.rate > 0) { Z.age++; const m = await hxWk('moder', { L: V.L, R: V.R, age: Z.age, rate: X.moder.rate, seed: X.moder.seed, sr: SR }); if (m) out = { L: m.L, R: m.R }; }
  if (!hxByKey(lk) || !HX.sch.has(S.id) || !hxZersOn(X) || hxWAktiv(X) || X.live) return;
  const f = Math.max(hxPassF(X, k), hxNextSeam(X).f), ver = hxZersVer(out), [cp, tr] = hxCopy(ver.aud);
  const out1 = S.chain && hxZersSrc(X, S) !== S.bak ? 1 : 0;   // (as the Schicht plays: baked on out 0, dry through the live chain on out 1)
  const drM = S.dr ? Float32Array.from({ length: Math.ceil(ver.n / 128) + 1 }, (_, q) => S.dr[Math.min(S.dr.length - 1, Math.max(0, Math.floor((S.pre + ((((q * 128 - ver.pre) % ver.len) + ver.len) % ver.len)) / 128)))]) : null;
  const d = { loop: X.id, schicht: S.id, chunks: cp, n: ver.n, pre: ver.pre, len: ver.len, ausklang: null, f, join: 'xf', X: ver.X, rho: 1, zo: 0, kc: 0, out: out1, dd: 1 };
  if (drM) { d.dr = drM; tr.push(drM.buffer); }
  hxPost({ replace: d }, tr);
  S.zrV = true; S.out = out1; S.zrT = performance.now() - t0; HX.zN = (HX.zN || 0) + 1; HX.zMs = S.zrT;
}

