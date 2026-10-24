// ---- the processor (myzel-ring, inside myzelDsp): made at sound start – the Humus records from the first note ----
const HX_CH = 8192;
// measured (klang/tests/cost.js, candidates hxq/hxn/hxc/hx0/hxs/hxr, two runs on this machine, the higher + 15 %,
// SPEC §21): the processor with both rings recording, its Gespielt taps and (step 1b) the node myzel-ring-in that writes
// the Alles ring, with both rings' input level, 0.71–0.81 (step 1a, without that node: 0.55–0.59); per playing Schicht, its
// seams included, 0.19–0.27; extra per Schicht while its loop is resampled 0.75–0.84
const HX_COST = { capture: 1.38, schicht: 0.39, rs: 1.32, fx1: 2.71, dd: 3.5, stream: 0.1, k16: 2.06, k24: 2.69, slice: 0.77, abr: 0.21, acc: 0.33, mic: 0.47, hof: { glt: [0.8, 1.05], shn: [0.77, 1.16] } };   // (step 4, cost.js three runs, table units, the higher + 15 %: the Mikro's ring hxi − hxc 0.13 / 0.41 / 0.33; a Sammelschleife recording hxk − hxj 0.19 / 0.17 / 0.28; a Hof's voice as built – its processor fed, its pan – Glut 0.65 / 0.70 at level 1, 0.91 / 0.92 at 3, Sehne 0.65 / 0.67, 0.94 / 1.01)   // (step 2b, cost.js two runs, the higher + 15 %: capture with the Puls's ring 1.20 / 1.07; a loop's speed through the 56-tap kernel hxu − hxs 1.79 / 1.56, the 80-tap 2.34 / 2.22 (½: the shared one, as rs); a Schicht in slices 0.67 / 0.65; worn 0.18 / 0.17)   // (klang/tests/cost.js, re-measured in step 1d: SPEC §21; stream: step 2a – a living Schicht's streams beyond its schicht, hxw − hxs 0.084 / 0.064, +15 %)
const HX = { node: null, ctx: null, state: '', fR: 0, tR: 0, loops: new Map(), sch: new Map(), lid: 0, sid: 0, gid: 0, wait: new Map(), meter: [], back: [], ddRun: new Set(), dd: 0,
  mask: new Set(['fin', 'eb2', 'rgn', 'gsp']), fx: null, fx1: null, play: 0, rs: 0, ev: [], evI: 0, evId: 0 };
const hxF = (t) => HX.fR + (t - HX.tR) * SR;   // audio time → the processor's frame (its own count, mapped by its reports)
const hxT = (f) => HX.tR + (f - HX.fR) / SR;
const hxLive = () => !!(A.ctx && !(typeof OfflineAudioContext !== 'undefined' && A.ctx instanceof OfflineAudioContext));
// a Schleife that may sound now: playing, about to change, or a Sammelschleife (it records every frame)
const hxSounds = () => { for (const L of HX.loops.values()) if (L.state === 'spielt' || L.pendTo || (L.acc && L.acc.on)) return true; return false; };
const hxOut1Of = (id) => { const L = HX.loops.get(id); return !!L && L.sch.some((x) => { const S = HX.sch.get(x); return S && S.out; }); };
function hxPost(m, tr) {
  if (!HX.node || HX.ctx !== A.ctx) return false;
  if (HXF1.off) for (const k in m) { const v = m[k]; if (v && typeof v === 'object' && (v.out || (k === 'state' && v.to === 'spielt' && hxOut1Of(v.loop)))) { hxF1Wake(); break; } }   // (phone report: whatever is sent to play on out 1 finds the chain copy awake; Leistung: a halted loop with a Schicht on out 1 that plays again)
  if (m.loop || (m.state && m.state.to === 'spielt')) { if (IDLE.on) idleWake(); if (IDLE.hxOff) hxGates(true); IDLE.hxT = null; }   // Ruhe: a Schleife will sound (Leistung: or a halted one again)
  else if ((m.wst || m.replace || m.schicht) && (IDLE.on || IDLE.hxOff)) { if (IDLE.on) idleWake(); if (IDLE.hxOff) hxGates(true); IDLE.hxT = null; }   // (step 2a: a Wuchs pass, a version – it sounds through the same way)
  if (HX.batch) {   // (hxBatch: one message – a key twice sends what is there first)
    const B = HX.batch;
    if (Object.keys(m).some((k) => k in B.m)) { const o = B.m, t = B.tr; B.m = {}; B.tr = []; try { HX.node.port.postMessage(o, t); } catch (e) { console.warn(e); } }
    Object.assign(B.m, m); if (tr) B.tr.push(...tr); return true;
  }
  try { HX.node.port.postMessage(m, tr || []); return true; } catch (e) { console.warn(e); return false; }
}
// the Taktgeber's segments from index i on, in the processor's frames (it replaces its own from the first one's frame)
function hxSeg(i, reset) {
  if (!HX.node || HX.ctx !== A.ctx) return;
  const s = TG.seg, out = [];
  for (let k = Math.max(0, i); k < s.length; k++) out.push([hxF(s[k].t), s[k].b, (SR * 60) / s[k].bpm]);
  hxSegMirror(out, reset);   // (the grammar computes pass starts exactly as the processor does)
  hxPost(reset ? { seg: out, reset: 1 } : { seg: out });
}
function hxStart() {
  HX.state = 'laden';
  ensureDSP(A.ctx, true).then((ok) => { if (ok && A.ctx && A.started) hxNode(); else HX.state = 'kein'; });
}
function hxNode() {
  if (IDLE.on) idleWake();   // Ruhe
  const ctx = A.ctx, hum = P['hx.humus'];
  let node;
  try {
    node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 4, numberOfOutputs: 3, outputChannelCount: [2, 2, 2 * HX_SLOTS], channelCount: 2, channelCountMode: 'explicit',
      channelInterpretation: 'speakers', processorOptions: { humusS: hum, chunk: HX_CH, rid: (HX.rid = (HX.rid || 0) + 1), drift: 1, rings: 4, mic: 1 } });   // (step 4: in 3 and a fourth ring – the Mikro's, its chunks when it is first switched on)   // (step 1d: out 2 – the sends of Nähren, a pair per slot; step 2b: in 2 and a third ring – the Puls's lanes)
  } catch (e) { console.warn(e); HX.state = 'kein'; return; }
  // „Alles“ = what is heard, the Schleifen included: the master's input, into a node of its own downstream of it
  // (myzel-ring-in) that writes this node's ring 1 at its frames – no cycle, so no delay that depends on the graph
  A.hxIn0.connect(node, 0, 0);
  A.driftG.connect(node, 0, 1);   // (step 1c: the shared drift, for Taumeln – input 1 is free: myzel-ring-in writes the Alles ring)
  if (A.hxIn2) A.hxIn2.connect(node, 0, 2);   // (step 2b: the Puls's lanes, always – Puls ernten takes their audio)
  try {
    const rin = new AudioWorkletNode(ctx, 'myzel-ring-in', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers', processorOptions: { rid: HX.rid } });
    const z = G(0); A.masterIn.connect(rin); rin.connect(z).connect(ctx.destination); HX.rin = rin;   // (pulled through a silent path)
  } catch (e) { console.warn(e); }
  // out 0: what is burnt in → the strip „Hexenring“ → A.masterIn (Ruhe: through a gate – a worklet's output is never
  // silent, the gate's is; closed from the start, as no Schleife exists yet (nothing but a Schleife sounds from the
  // processor), opened by the first (hxPost) and closed again 20 s after the last (idleTick); a gain, not a link taken
  // out, so a Schleife that sounds at once finds it open – its value is read by the very quantum that plays the message)
  HX.g0 = G(1); node.connect(HX.g0, 0).connect(stripIn('hxr')); HX.g1 = null; IDLE.hxT = null;
  if (IDLE.keeper && IDLE.ctx === ctx) node.connect(IDLE.keeper.gain, 0);   // Ruhe: it records while the rest sleeps
  node.port.onmessage = (e) => { if (!LM.on) { hxMsg(e.data); return; } const t0 = performance.now(); try { hxMsg(e.data); } finally { lmPart(31, performance.now() - t0); } };   // („Leistung messen“ counts its time)
  node.onprocessorerror = () => { console.warn('Hexenring: Prozessorfehler'); HX.state = 'kein'; HX.node = null; };
  HX.node = node; HX.ctx = ctx; HX.state = 'ok'; HX.fR = Math.round(ctx.currentTime * SR); HX.tR = ctx.currentTime; HXN.split = null; HXN.webs.clear(); HXN.feed.clear();
  if (HX.mic.on) hxMicOff(); HX.mic.ring = false;   // (step 4: a new processor – its Mikro ring is made again when it is switched on)
  hxGates(false);   // (Ruhe: closed until the first Schleife)
  // the Humus's chunks, made here and moved over (the audio thread never allocates): two rings of hx.humus seconds
  const n = 3 * Math.ceil((hum * SR) / HX_CH), pool = [], tr = [];   // (step 2b: three rings)
  for (let i = 0; i < n; i++) { const L = new Float32Array(HX_CH), R = new Float32Array(HX_CH); pool.push([L, R]); tr.push(L.buffer, R.buffer); }
  node.port.postMessage({ pool }, tr);
  HX.segF = [];
  hxSeg(tgIdx(ctx.currentTime), true);
  hxMaskSync();
  hxRailShow();
  hxwWportAll(); HX.tonP = { root: P['t.root'], scale: P['t.scale'] };
  hxHandLoad();   // (Etappe 3: the Handschrift, when it is on)   // (step 2a: the realms' pacing; the key the field plays in)
  if (HX.restore) setTimeout(hxRestoreApply, 300);   // Hexenring: the Schleifen of the last session come back, angehalten
}
// which strips „Gespielt“ hears: the sources always, the Puls and the Bordun when asked
function hxMaskSync() { hxMask(['fin', 'eb2', 'rgn', 'gsp'].concat(P['hx.pulsMit'] ? ['l0', 'l1', 'l2', 'l3'] : [], P['hx.borMit'] ? ['bor'] : [])); }
function hxParam(id) {
  if (id === 'hx.rail' || id === 'hx.buehne') hxRailShow();
  if (/^hx\.(gaertner|gPlatz|gRollen|gAntw|gBegl|gWk|hand)$/.test(id)) hxGdParam(id);   // (Etappe 3)
  if (id === 'hx.stufe') for (const L of hxLoopsLive()) if (hxWAktiv(L)) hxWUpdate(L);   // (step 2a)
  if ((id === 'hx.pulsMit' || id === 'hx.borMit') && A.ctx) hxMaskSync();
  if (id === 'hx.laenge') for (const w of CTLWRAP['hx.festT'] || []) w.classList.toggle('inactive', P['hx.laenge'] !== 'fest');
  hxRailDirty(); hxCardDirty();
}
function hxMsg(m) {
  if (!m) return;
  if (m.frame != null) { HX.fR = m.frame; HX.tR = m.t; }
  if (m.nan) { (HX.nan = HX.nan || []).push(m.nan); if (HX.nan.length > 8) HX.nan.shift(); console.warn('Hexenring: non-finite samples scrubbed', JSON.stringify(m.nan)); }   // (step 2b: the processor's tripwire)
  if (m.passStart) { const L = HX.loops.get(m.passStart.loop); if (L) { L.k = m.passStart.k; L.f = m.passStart.f; L.t = hxT(L.f); if (L.on) L.on(L); } }
  if (m.grabbed) { const w = HX.wait.get('g' + m.grabbed.id); if (w) { HX.wait.delete('g' + m.grabbed.id); w(m.grabbed); } }
  if (m.freed) {
    const d = m.freed, key = d.schicht != null && !d.old ? 's' + d.schicht : d.loop != null ? 'l' + d.loop : null, w = key && HX.wait.get(key);
    if (d.schicht != null && !d.old) HX.sch.delete(d.schicht);
    if (d.loop != null) {
      const L = HX.loops.get(d.loop); if (L) for (const id of L.sch) HX.sch.delete(id);
      for (const [id, S] of HX.sch) if (S.loop === d.loop) { HX.sch.delete(id); const ws = HX.wait.get('s' + id); if (ws) { HX.wait.delete('s' + id); ws(null); } }   // Hexenring: (step 1d) one taken back while it faded came back with its loop
      HX.loops.delete(d.loop); hxCount(); hxStripSync();
    }
    if (w) { HX.wait.delete(key); w(d.chunks); } else if (!d.ws) HX.back.push(d.chunks);   // (kept for a redo; dropped once the next step's history knows better – step 2a: a stream's chunks never)
    if (HX.back.length > 64) HX.back.shift();
  }
  if (m.meter) HX.meter = m.meter.loops;
  if (m.report) { const w = HX.wait.get('r'); if (w) { HX.wait.delete('r'); w(m.report); } }
  hxMsg2(m);
}
const hxReport = () => new Promise((res) => { HX.wait.set('r', res); if (!hxPost({ report: 1 })) { HX.wait.delete('r'); res(null); } });

// ---- the taps (SPEC §4): „Gespielt“ = each source strip after its mute/solo gate (fin, eb2, rgn, gsp; l0–l3 and bor
// by the mask), „Alles“ = A.masterSum. The strip „Hexenring“ plays into A.masterIn behind both: no tap hears a Schleife.
// (A masked-out strip has no tap at all – a tap is a node the browser runs.)
function hxGraph() {
  HX.node = null; HX.ctx = null; HX.fx = HX.fx1 = null; HX.out1 = false; HX.g0 = HX.g1 = HX.gM = null;
  A.hxIn0 = G(1); A.hxIn0.channelCount = 2; A.hxIn0.channelCountMode = 'explicit'; A.hxIn0.channelInterpretation = 'speakers';
  for (const st of MIX.src) { st.hxT = null; if (st.k !== 'hxr' && HX.mask.has(st.k)) hxTap(st, true, true); }
  // (step 2b) the Puls's lanes into a ring of their own, always (Puls ernten: their audio, whatever the mask)
  A.hxIn2 = G(1); A.hxIn2.channelCount = 2; A.hxIn2.channelCountMode = 'explicit'; A.hxIn2.channelInterpretation = 'speakers';
  for (const st of MIX.src) if (/^l\d$/.test(st.k)) st.dry.connect(A.hxIn2);
}
function hxTap(st, on, now) {
  if (on) {
    if (!st.hxT) { st.hxT = G(now ? 1 : 0); st.dry.connect(st.hxT).connect(A.hxIn0); }
    if (!now) setP(st.hxT.gain, 1, 0.003);
  } else if (st.hxT) {
    const g = st.hxT; st.hxT = null;
    setP(g.gain, 0, 0.003);
    setTimeout(() => { try { st.dry.disconnect(g); g.disconnect(); } catch (e) {} }, 60);
  }
}
// which strips the Gespielt ring hears: „Puls mit“ (l0–l3), „Bordun mit“ (bor) – a smooth step, never a click in the Humus
function hxMask(keys) {
  HX.mask = new Set(keys);
  if (A.ctx) for (const st of MIX.src) if (st.k !== 'hxr') hxTap(st, HX.mask.has(st.k), false);
}
// the strip „Hexenring“: straight to the master (its chain is burnt in) – or, set to the chain, through a copy of it
// (the same settings and modulators) that ends at the master as well, never in A.masterSum where „Alles“ listens
function hxRoute() { return P['xhxr.route'] !== 'dir' ? hxChain('fx').in : hxGateM(); }
// the Hexenring's way into the master's input, straight or through the chain's copy: a gate at 1 (Ruhe: at 0 while the
// graph sleeps, so the master rests while what is before it runs on – hxGates)
function hxGateM() { if (!HX.gM || HX.gM.context !== A.ctx) { HX.gM = G(1); HX.gM.connect(A.masterIn); } return HX.gM; }
function hxChain(k) {
  if (HX[k] && HX[k].ctx === A.ctx) return HX[k];
  const c = makeChain(); c.ctx = A.ctx;
  updDrive(c); updRing(c); updFilter(c); updPhaser(c); updChorus(c);
  c.out.connect(k === 'fx' ? hxGateM() : stripIn('hxr'));
  return (HX[k] = c);
}
// out 1: the loops that follow the live chain go through their own copy of it, then the strip (nothing taps either)
function hxOut1() { if (HXF1.off) hxF1Wake(); if (HX.node && !HX.out1) { if (IDLE.on) idleWake(); HX.g1 = G(1); HX.node.connect(HX.g1, 1).connect(hxChain('fx1').in); HX.out1 = true; } }   // (Ruhe: its gate as out 0's)
// Ruhe for that copy (phone report 22.10.2026). It costs what the live chain costs (drive with its oversampling, ring,
// filter, phaser, chorus, pan – measured in the Android emulation 3–4 % of a core, an eighth of everything while loops
// play) and ran from the first Schleife on for good, though after the bake every Schicht plays on out 0 and only zeros
// pass it. It now rests – its link to the strip taken out, so the browser no longer runs it – once nothing has played
// through it for 10 s (no Schicht on out 1 – one that left it counts a pass of its loop longer –, no Hof, no answer, no
// loop played live), its input and its output have been exact zeros for 2 s (taps as Ruhe's, plugged in only for that
// check) and no move of one of its own params is under way. Every use puts the link back first: hxOut1 (a voice, a Hof
// into it), any message to the processor that plays on out 1 (hxPost), any move of one of its params (the AudioParam
// hook – a param keeps its time only where the render pulls it). What it holds then is zeros – its filters, delays and
// the drive's oversampler have had nothing else for long enough – and its LFOs are the live chain's: it plays on sample
// for sample as if it had run.
function hxF1Busy(now) {
  let busy = !!((HXN.feed && HXN.feed.size) || hxAntOn());
  const o1 = HXF1.o1 || (HXF1.o1 = new Map());
  // (Leistung, 23.10.2026: a Schicht of a loop that is halted or muted plays nothing through it – the processor reads
  // nothing of it then; its stop's Ausklang still ringing keeps the taps from seeing zeros. It wakes before the loop
  // plays again: hxPost with a state „spielt“)
  for (const S of HX.sch.values()) if (S.out) { const L = HX.loops.get(S.loop); if (L && L.state !== 'spielt' && !L.pendTo) continue; busy = true; o1.set(S.id, S.loop); }
  for (const [id, lp] of o1) {
    const S = HX.sch.get(id); if (S && S.out) continue;
    o1.delete(id); const L = HX.loops.get(lp); HXF1.useT = Math.max(HXF1.useT, now + (L ? Math.min(120, hxLen(L)) : 0));
  }
  if (!busy) for (const L of HX.loops.values()) if (L.live || (L.sch.some((id) => { const S = HX.sch.get(id); return S && S.lm; }))) { busy = true; break; }
  return busy;
}
function hxF1Reset(c) {
  Object.assign(HXF1, { c, off: false, autoT: 0, useT: hxNowT(), taps: null, tapOn: false, z: null, pT: -1, o1: new Map() });
  HXF1.p.clear(); hxF1On = false;
  if (!c) return;
  const keys = ['gain', 'frequency', 'Q', 'detune', 'delayTime', 'pan'];
  for (const v of Object.values(c)) for (const n of Array.isArray(v) ? v : [v]) if (n && typeof n === 'object' && n.context) for (const k of keys) if (n[k] && typeof n[k].setValueAtTime === 'function') HXF1.p.add(n[k]);
  const an = () => { const a = A.ctx.createAnalyser(); a.fftSize = IDLE_FFT; return a; };
  const two = (src) => { const sp = A.ctx.createChannelSplitter(2), L = an(), R = an(); sp.connect(L, 0); sp.connect(R, 1); return [[src, sp], [L, R]]; };
  hxF1On = HXF1.p.size > 0;
  const [li, gi] = two(c.in), [lo, go] = two(c.out);
  HXF1.taps = { links: [li, lo], g: [gi, go], buf: new Float32Array(IDLE_FFT) };
}
function hxF1Taps(on) {
  const T = HXF1.taps; if (!T || HXF1.tapOn === on) return;
  HXF1.tapOn = on;
  for (const [a, b] of T.links) { try { if (on) a.connect(b); else a.disconnect(b); } catch (e) {} }
  if (on) { HXF1.tapT = hxNowT(); HXF1.z = null; }
}
function hxF1Wake() {
  const c = HXF1.c;
  HXF1.off = false;
  if (!c || c.ctx !== A.ctx) return;
  if (IDLE.on) idleWake();
  try { c.out.connect(stripIn('hxr')); } catch (e) {}
  HXF1.useT = hxNowT(); HXF1.z = null;
}
// (in hxTick) – sleeps only from the quiet the taps saw; a Schicht still on out 1, a Hof, an answer, a loop played live,
// or a move of its params under way keeps it awake
function hxF1Tick(now) {
  if (HXF1.c !== HX.fx1) hxF1Reset(HX.fx1 && HX.fx1.ctx === A.ctx ? HX.fx1 : null);
  const c = HXF1.c; if (!c || HXF1.off) return;
  if (hxF1Busy(now)) HXF1.useT = Math.max(HXF1.useT, now);
  if (now - HXF1.useT < 10 || now < HXF1.autoT) { HXF1.z = null; hxF1Taps(false); return; }
  hxF1Taps(true);
  if (now - HXF1.tapT < (IDLE_FFT + 256) / SR) return;
  const T = HXF1.taps, b = T.buf, gap = now - HXF1.pT > (IDLE_FFT - 256) / SR;
  HXF1.pT = now;
  let zero = true;
  for (const g of T.g) { for (const a of g) { a.getFloatTimeDomainData(b); for (let k = 0; k < b.length; k++) if (b[k] !== 0) { zero = false; break; } if (!zero) break; } if (!zero) break; }
  if (!zero) { HXF1.z = null; return; }
  if (HXF1.z == null || gap) HXF1.z = now - IDLE_FFT / SR;
  if (now - HXF1.z < 2) return;
  hxF1Taps(false);
  try { c.out.disconnect(stripIn('hxr')); } catch (e) { return; }
  HXF1.off = true; HXF1.n++;
}
const hxSrcText = () => { const n = HX.loops.size; return n ? n + (n === 1 ? ' Schleife' : ' Schleifen') : 'aus'; };
// the mixer shows the strip from the first Schleife on (or once something of it was set)
function hxStripSync() { if (MX.root) { mxRgnSync(); mxSrcAll(); } }

