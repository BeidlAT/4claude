// ---- Nähren (SPEC §15, Etappe 1: Gespinst and Körner). Gespinst: each feeding Schleife gets a web of its own (myzel-web,
// tuned to the field's scale like the live one – gspFreqs, retuned with it), fed from the processor's output 2 – a pair
// per slot, post level and state, that no tap hears – its halo into the strip „Hexenring“; it costs GSP_COST while it
// rings (voiceLoad). Körner: the Schleife's steady pass becomes grain material (Körner-Quelle „Schleife“). ----
const HXN = { webs: new Map(), split: null, kor: null };
function hxSplit() {
  if (HXN.split && HXN.split.context === A.ctx) return HXN.split;
  const sp = A.ctx.createChannelSplitter(2 * HX_SENDS); HX.node.connect(sp, 2); return (HXN.split = sp);
}
// (26.10.2026: 24 places – an output has at most 32 channels) a feeding loop's send pair: its own while it feeds, the
// first free of HX_SENDS otherwise; -1 when all are taken
const HX_SENDS = 16;
function hxSendCh(L) {
  if (L.sendCh != null && L.sendCh >= 0) return L.sendCh;
  const used = new Set(); for (const X of HX.loops.values()) if (X !== L && X.sendCh != null && X.sendCh >= 0 && X.state !== 'weg') used.add(X.sendCh);
  for (let c = 0; c < HX_SENDS; c++) if (!used.has(c)) return (L.sendCh = c);
  toast('Höchstens ' + HX_SENDS + ' Schleifen nähren gleichzeitig.'); return -1;
}
function hxWebMake(L) {
  if (!A.ctx || !A.ctx.__dspOK || !HX.node || A.workletBroken.has('gsp')) return null;
  try {
    const i = hxSendCh(L); if (i < 0) return null;
    const sp = hxSplit(), mg = A.ctx.createChannelMerger(2);
    sp.connect(mg, 2 * i, 0); sp.connect(mg, 2 * i + 1, 1);
    const node = new AudioWorkletNode(A.ctx, 'myzel-web', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
      processorOptions: { rich: !!Q.rich, lite: A.lite ? 1 : 0, prm: gspPrm(), freqs: gspFreqs(), seed: wkSeed() } });
    const out = G(dbToGain(P['gsp.halo']));
    mg.connect(node); node.connect(out).connect(stripIn('hxr'));
    const W = { node, mg, out, slot: i, active: false, cost: GSP_COST[Q.rich ? 1 : 0], ctx: A.ctx };
    node.port.onmessage = (e) => { const m = e.data; if (!m) return; if (m.active) W.active = true; if (m.idle) W.active = false; };
    node.onprocessorerror = () => { console.warn('Hexenring: Gespinst einer Schleife – Prozessorfehler'); hxWebDrop(L.id); };
    return W;
  } catch (e) { console.warn(e); return null; }
}
function hxWebDrop(id, later) {
  const W = HXN.webs.get(id); if (!W) return;
  HXN.webs.delete(id);
  const kill = () => { try { W.node.port.postMessage({ kill: 1 }); W.mg.disconnect(); W.node.disconnect(); W.out.disconnect(); } catch (e) {} };
  if (later) { setP(W.out.gain, 0, 0.6); setTimeout(kill, 3000); } else kill();   // (switched off: its halo rings out first)
}
const hxWebsMsg = (m) => { for (const W of HXN.webs.values()) try { W.node.port.postMessage(m); } catch (e) {} };
const hxWebsHalo = () => { for (const W of HXN.webs.values()) setP(W.out.gain, dbToGain(P['gsp.halo']), 0.05); };
const hxWebsCost = () => { let c = 0; for (const W of HXN.webs.values()) if (W.active) c += W.cost; return c; };
// Nähren · Gespinst for a Schleife: on – its own web and the send; off – the send fades, the web rings out and goes
function hxNaehrGsp(L, on) {
  L.naehrt = Object.assign({}, L.naehrt, { gsp: !!on });
  if (on) {
    if (!HXN.webs.has(L.id)) { const W = hxWebMake(L); if (!W) { L.naehrt.gsp = false; toast('Das Gespinst geht hier nicht (kein AudioWorklet).', 3000); hxCardDirty(); return false; } HXN.webs.set(L.id, W); }
    hxSendSync(L);
  } else { hxSendSync(L); hxWebDrop(L.id, true); }   // (step 4: the send stays while a Hof of Glut or Sehne feeds from it)
  hxSay(hxName(L) + (on ? ' nährt das Gespinst' : ': Gespinst aus')); hxSaveMeta(L.id); hxCardDirty();
  return true;
}
// Nähren · Körner: the Schleife's steady pass (its audible Schichten summed over one pass, ≤ 30 s, baked where baked) as
// the grain material; the Körner switch to the source „Schleife“. One Schleife feeds them at a time.
function hxKorTex() { const K = HXN.kor; return K && K.tex && A.ctx && K.ctx === A.ctx ? K.tex : null; }
function hxNaehrKor(L, on) {
  if (!on) { if (HXN.kor && HXN.kor.key === L.key) HXN.kor = null; L.naehrt = Object.assign({}, L.naehrt, { kor: false }); if (P['kor.src'] === 'schleife') setParam('kor.src', 'glas'); hxSay(hxName(L) + ': Körner aus'); hxSaveMeta(L.id); hxCardDirty(); return true; }
  const sch = L.sch.map((id) => HX.sch.get(id)).filter((S) => S && !S.mute && S.aud);
  if (!sch.length) { toast('Einen Moment – die Schleife wird noch aufgenommen.', 2500); return false; }
  const len = Math.min(...sch.map((S) => S.len)), n = Math.min(len, Math.round(USER_MAX_S * SR)), Lb = new Float32Array(n), Rb = new Float32Array(n);
  for (const S of sch) { const src = S.baked && S.bak ? S.bak : S.aud, g = S.gain; for (let i = 0; i < n; i++) { const p = S.pre + i, c = src[Math.floor(p / HX_CH)]; if (c) { Lb[i] += g * c[0][p % HX_CH]; Rb[i] += g * c[1][p % HX_CH]; } } }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(Lb[i]), Math.abs(Rb[i]));
  if (pk < 1e-4) { toast('Die Schleife ist (fast) still.'); return false; }
  const gN = 0.8 / pk, fd = Math.min(Math.floor(SR * 0.01), n >> 2);
  for (let i = 0; i < n; i++) { let e = gN; if (i < fd) e *= i / fd; else if (i > n - fd) e *= (n - i) / fd; Lb[i] *= e; Rb[i] *= e; }
  const fs = L.notes.map((x) => x.f).filter((f) => f > 0).sort((a, b) => a - b), ref = fs.length ? fs[fs.length >> 1] : guessPitch(Lb, SR) || TEX_F;
  const buf = A.ctx.createBuffer(2, n, SR); buf.getChannelData(0).set(Lb); buf.getChannelData(1).set(Rb);
  for (const X of hxLoopsLive()) if (X !== L && X.naehrt && X.naehrt.kor) X.naehrt = Object.assign({}, X.naehrt, { kor: false });
  HXN.kor = { key: L.key, ctx: A.ctx, tex: { buf, rev: reversed(buf), ref }, name: hxName(L) };
  L.naehrt = Object.assign({}, L.naehrt, { kor: true });
  for (const v of A.grainVoices) if (P['kor.src'] === 'schleife') v.kor.buf = null;   // (running fingers pick it up)
  if (P['kor.src'] !== 'schleife') setParam('kor.src', 'schleife');
  A.hxKorWarned = false;
  toast('Körner spielen jetzt ' + hxName(L) + (len > n ? ' (die ersten ' + USER_MAX_S + ' Sekunden)' : '') + '.', 3000);
  hxSay(hxName(L) + ' nährt die Körner'); hxSaveMeta(L.id); hxCardDirty();
  return true;
}

