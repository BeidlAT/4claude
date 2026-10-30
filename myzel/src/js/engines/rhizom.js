// ---------- Rhizom: avalanches through the field's scale degrees ----------
// One net for everything that plays Rhizom – finger, Ebene 2, the Puls lanes, Sporenregen, the Rassel. A node that
// fires pings and hands a full charge to each neighbour with probability p = Reiz · (0.3 + 1.1 y) (≤ 0.8; the strike's
// own first step a little more with a harder hit, a lane's short gate a little less), to the next but one with p/3.5,
// and – rarely, ≤ 0.2 – an octave or a fifth away; then it rests for Erholung, and a charge that reaches it meanwhile
// dies. So the same tap answers alone or rolls over the whole field: at Reiz 0.5, y 0 a tired net (six strikes in ten
// stay single), y 0.5 every size (mean 6: 15 % single, 40 % 4–8, 25 % 9–15), y 1 a rolling wave (one in five the whole
// field of three octaves); and a net that just ran is exhausted.
// The charges are events in the clock (rhzRun, exact times, scheduled ahead like the Puls); each ping sounds on the
// voice that carries the charge (its lane's channel). Caps: 40 firings and 2.5 s per strike. A free field has no
// degrees: there each strike runs its own small net (a pentatonic around its note).
const RHZ = { q: [], vs: new Set(), h: 0, sp: null, step: false };
// level: the standard phrase as loud as Nebel/Glocke/Membran (klang/tests/bench.js); at most 12 pings a voice at once
// (level 3: 20); the budget counts each voice while it lives by its pings ringing at once and how short they ring:
// base + ping × pings + gl / τ^ex, τ = the voice's Glimmen × its body's decay (klang/tests/rhz-fit.js, final pass: cost.js
// and rhz-pings.js over five settings – one long ping, a long cascade, the default, the default high, the shortest
// Glimmen –, each in the player's net and in nets of their own as a nourishing loop's: a short ping costs its start, so
// the default and short Glimmen cost more per second alive than the step-1 law – base + ping alone, from long pings –
// said: up to 1.7× at level 3; entered so every setting is covered + 15 %, the most 1.28 / 1.42 × measured; VCOST = one
// ping at the current Glimmen)
const RHZ_PEAK = 0.375, RHZ_CAP = [12, 20], RHZ_MAXF = 40, RHZ_MAXT = 2.5, RHZ_COST = { base: [0.36, 0], ping: [0.24, 0.51], gl: [0.088, 0.646], ex: [0.8, 0.6] };
const rhzPrice = (i, n, tau) => RHZ_COST.base[i] + RHZ_COST.ping[i] * n + RHZ_COST.gl[i] / Math.pow(Math.max(0.03, tau), RHZ_COST.ex[i]);
const rhzTau = (dm) => P['rhz.glimmen'] * (RHZ_KN[P['rhz.knoten']] || RHZ_KN.holz).tau * (dm || 1);
for (const [i, T] of [[0, VCOST1], [1, VCOST3]]) Object.defineProperty(T, 'rhz', { get: () => rhzPrice(i, 1, rhzTau()), enumerable: true, configurable: true });
// the bodies: partials (ratio, level, decay factor), the decay against Glimmen, the knock's band (× the ping's note),
// its Q, length and level; lv: the body's level (the longer rings sit lower: one phrase loudness for all three)
const RHZ_KN = {
  holz: { r: [1, 1.5, 3.95], a: [1, 0.3, 0.12], d: [1, 0.45, 0.22], tau: 1, bp: 3.2, q: 1.2, ck: 0.0018, cl: 0.55, lv: 1 },
  metall: { r: [1, 2.76, 5.4], a: [1, 0.45, 0.2], d: [1, 0.7, 0.45], tau: 1.8, bp: 5, q: 2, ck: 0.0011, cl: 0.35, lv: 0.69 },
  glas: { r: [1, 2.32, 4.25], a: [1, 0.38, 0.16], d: [1, 0.8, 0.5], tau: 1.4, bp: 7, q: 3, ck: 0.0008, cl: 0.3, lv: 0.87 },
};
const rhzInUse = () => [...ebEngs(), ...[0, 1, 2, 3].map((i) => P['l' + i + '.on'] && P['l' + i + '.eng']), RG.on && GK.p && GK.p.rgS, GK.p && GK.p.ras && GK.p.rasS].includes('rhz');
const rhzReiz = (t) => clamp(P['rhz.reiz'] + (MOD.t.rhzR && MOD.t.rhzR.s.size ? 0.6 * modVal('rhzR', t) : 0), 0, 1);   // (Gestik: tilt and Ladung)
// offline (tests) or a stopped clock: a strike's whole cascade is laid out at once (RHZ.step: tests run the clock themselves)
const rhzAhead = () => !RHZ.step && ((typeof OfflineAudioContext !== 'undefined' && A.ctx instanceof OfflineAudioContext) || A.ctx.state !== 'running');
// a net: its nodes' notes (without the octave), when each may fire again, octave step, each node's fifth up and down
function rhzNet(f) {
  const n = f.length, fu = new Int16Array(n).fill(-1), fd = new Int16Array(n).fill(-1);
  for (let j = 0; j < n; j++) for (let k = j + 1; k < n; k++) { const c = 1200 * Math.log2(f[k] / f[j]); if (Math.abs(c - 702) < 40) { fu[j] = k; fd[k] = j; break; } if (c > 760) break; }
  let per = 0; for (let k = 1; k < n; k++) if (Math.abs(1200 * Math.log2(f[k] / f[0]) - 1200) < 40) { per = k; break; }
  return { f, n, refr: new Float64Array(n), per, fu, fd };
}
function rhzShared() {
  if (!RHZ.sp || RHZ.sp.src !== N.notes) { RHZ.sp = rhzNet(Float64Array.from(N.notes, (x) => x.f)); RHZ.sp.src = N.notes; RHZ.sp.vis = true; }
  return RHZ.sp;
}
// Hexenring: a loop that nourishes Rhizom strikes a net of its own (owner, 21.10.2026) – the field's degrees as the
// shared one, but its avalanches and its exhaustion are the loop's: the player's net is never tired by a loop, nor the
// loop's by the player (as a Werk-Rahmen render's own net); built at the loop's first strike, rebuilt with the scale
function rhzOwn(key) {
  const M = RHZ.own || (RHZ.own = new Map()); let sp = M.get(key);
  if (!sp || sp.src !== N.notes) { sp = rhzNet(Float64Array.from(N.notes, (x) => x.f)); sp.src = N.notes; sp.vis = true; M.set(key, sp); }
  return sp;
}
const rhzRetune = () => { RHZ.sp = null; if (RHZ.own) RHZ.own.clear(); };   // (a new scale: the net is rebuilt at the next strike, rested; charges underway land on the new degrees)
// the struck note's node and octave in the field (a note between degrees: the nearest)
function rhzSpot(f, sp) {
  let o = P['v.oct'], g = f / Math.pow(2, o);
  while (g < sp.f[0] * 0.97 && o > -6) { o--; g *= 2; }
  while (g > sp.f[sp.n - 1] * 1.03 && o < 6) { o++; g /= 2; }
  let i0 = 0, bd = Infinity; for (let j = 0; j < sp.n; j++) { const d = Math.abs(Math.log2(g / sp.f[j])); if (d < bd) { bd = d; i0 = j; } }
  return { i0, mul: Math.pow(2, o) };
}
function rhzVoice(v, t, f, y, vel, o) {
  let sp, i0, mul = 1;
  if (N.free || N.notes.length < 2) {   // its own net: two octaves of a pentatonic either side of the note
    const fr = []; for (let oc = -2; oc <= 2; oc++) for (const s of [0, 2, 4, 7, 9]) if (oc < 2 || s === 0) fr.push(f * Math.pow(2, oc + s / 12));
    sp = rhzNet(Float64Array.from(fr)); i0 = 10;
  } else { sp = o.rhzNet ? rhzOwn(o.rhzNet) : rhzShared(); ({ i0, mul } = rhzSpot(f, sp)); }   // (Hexenring: a nourishing loop's own net)
  const kn = RHZ_KN[P['rhz.knoten']] || RHZ_KN.holz, rich = Q.rich, sr = A.ctx.sampleRate;
  // the knock: one noise for every ping of the voice, its band moved to each ping's note
  const mid = v.n(G(1)); mid.connect(v.out);
  const ns = v.s(noiseSrc()), bp = v.n(BQ('bandpass', clamp(f * kn.bp, 400, 0.4 * sr), kn.q)), cg = v.n(G(0));
  ns.connect(bp).connect(cg).connect(mid); ns.start(t);
  const R = v.rz = { sp, i0, mul, f0: f, y, vel, t0: t, fired: 0, pend: 0, pings: [], log: [], lastEnd: t, kn, rich, mid, bp, cg, done: false,
    gate: o.gate ? clamp(0.55 + o.gate / 0.45, 0.55, 1) : 1, dm: o.decayMul || 1, cap: RHZ_CAP[rich ? 1 : 0] };
  RHZ.vs.add(v);
  return R;
}
// a charge on its way: kept in time order
function rhzPush(e) {
  const q = RHZ.q; let lo = 0, hi = q.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (q[m].at <= e.at) lo = m + 1; else hi = m; }
  q.splice(lo, 0, e); e.v.rz.pend++;
}
function rhzFire(v, at, j, g, strike) {
  const R = v.rz, sp = R.sp, sc = P['rhz.streuung'];
  sp.refr[j] = at + P['rhz.erholung']; R.fired++; R.log.push(at, j);
  rhzPing(v, at, j, g, strike);
  if (R.fired >= RHZ_MAXF || at - R.t0 >= RHZ_MAXT) return;
  let p = rhzReiz(at) * (0.3 + 1.1 * R.y) * R.gate;
  p = strike ? clamp(p * (0.75 + 0.45 * R.vel), 0, 0.85) : clamp(p, 0, 0.8);
  const pt = Math.min(0.2, 0.2 * p), weg = P['rhz.weg'] / 1000;
  const go = (k, pk, dm) => {
    if (k < 0 || k >= sp.n || !(Math.random() < pk * (1 + sc * (Math.random() - 0.5)))) return;
    rhzPush({ at: at + Math.max(0.008, weg * dm * (1 + 0.7 * sc * (2 * Math.random() - 1))), j: k, v, g: g + 1 });
  };
  go(j - 1, p, 1); go(j + 1, p, 1); go(j - 2, p / 3.5, 1.6); go(j + 2, p / 3.5, 1.6);
  if (sp.per) { go(j - sp.per, pt, 2.2); go(j + sp.per, pt, 2.2); }
  go(sp.fu[j], pt, 1.8); go(sp.fd[j], pt, 1.8);
}
// one ping: the node's note on the voice's body – two partials (level 3: three, placed by pitch), a knock in front
function rhzPing(v, at, j, g, strike) {
  const R = v.rz, sp = R.sp, kn = R.kn, sr = A.ctx.sampleRate, sc = P['rhz.streuung'];
  const fr = strike ? R.f0 : sp.f[j] * R.mul;
  const amp = strike ? 1 : (0.8 - 0.32 * Math.min(g, 8) / 8) * (1 + 0.3 * sc * (2 * Math.random() - 1));
  const tau = P['rhz.glimmen'] * kn.tau * R.dm * clamp(Math.pow(330 / fr, 0.3), 0.6, 1.6);
  // room: at the cap the oldest ping still ringing gives way (8 ms)
  R.pings = R.pings.filter((x) => x.end > at);
  if (R.pings.length >= R.cap) {
    const x = R.pings.shift();
    x.kill.gain.setValueAtTime(x.kill.gain.value, at); x.kill.gain.linearRampToValueAtTime(0, at + 0.008);
    for (const o of x.srcs) { o._end = at + 0.01; try { o.stop(o._end); } catch (e) {} }   // (_end: the voice's finish must not lengthen it again)
  }
  let dst = R.mid;
  if (R.rich && sp.vis) { dst = v.n(PAN(clamp((2 * noteX(j) - 1) * 0.7 * P['v.width'], -1, 1))); dst.connect(v.out); }
  const kill = v.n(G(dst === R.mid ? 1 : 0.8)); kill.connect(dst);   // (placed by pitch, level 3: past the voice's centre panner – as loud as level 1)
  const x = { end: at, kill, srcs: [] }, bright = (0.45 + 1.1 * R.y) * (0.6 + 0.8 * R.vel);
  for (let k = 0; k < (R.rich ? 3 : 2); k++) {
    const fk = fr * kn.r[k]; if (fk > 0.45 * sr) break;
    const a = amp * kn.a[k] * (k ? bright : 1), tk = tau * kn.d[k], o = v.s(OSC('sine', fk)), gg = v.n(G(0));
    v.mod(o.detune);
    gg.gain.setValueAtTime(0, at); gg.gain.linearRampToValueAtTime(a, at + 0.0012); gg.gain.setTargetAtTime(0, at + 0.0012, tk);
    o.connect(gg).connect(kill); o.start(at);
    o._end = at + 0.0012 + 6.91 * tk + 0.02; o.stop(o._end);
    x.srcs.push(o); x.end = Math.max(x.end, o._end);
  }
  // the knock, at the ping's note, harder with the hit
  R.bp.frequency.setValueAtTime(clamp(fr * kn.bp, 400, 0.4 * sr), at);
  const ca = amp * kn.cl * (0.35 + 0.65 * R.vel) * (0.6 + 0.6 * R.y);
  R.cg.gain.setValueAtTime(0, at); R.cg.gain.linearRampToValueAtTime(ca, at + 0.0004); R.cg.gain.setTargetAtTime(0, at + 0.0004, kn.ck);
  R.pings.push(x); R.lastEnd = Math.max(R.lastEnd, x.end, at + 0.02);
  v.cost = Math.max(v.cost, rhzPrice(R.rich ? 1 : 0, R.pings.length, rhzTau(R.dm)));   // (the budget hears a big cascade)
  if (sp.vis) visPush({ t: at, kind: 'hit', x: noteX(j), y: 0.15 + 0.7 * R.y, s: 0.3 + 0.5 * amp });
}
// the clock: every charge due before the horizon arrives (a node still resting swallows it); a voice whose charges
// are all spent ends after its last ping
function rhzRun(h) {
  RHZ.h = Math.max(RHZ.h, h < Infinity ? h : 0);
  const q = RHZ.q;
  while (q.length && q[0].at < h) {
    const e = q.shift(), v = e.v, R = v.rz; R.pend--;
    if (!v.alive || e.at >= v.endAt || R.done || e.j >= R.sp.n || e.at < R.sp.refr[e.j]) continue;
    if (R.fired >= RHZ_MAXF || e.at - R.t0 > RHZ_MAXT) continue;
    rhzFire(v, e.at, e.j, e.g, false);
  }
  for (const v of RHZ.vs) {
    const R = v.rz;
    if (!v.alive || v.endAt < Infinity && !R.done) { RHZ.vs.delete(v); continue; }   // (stolen, killed)
    if (R.pend <= 0 && !R.done) { R.done = true; RHZ.vs.delete(v); v.finish(Math.max(R.lastEnd, A.ctx.currentTime) + 0.03); }
  }
}
// Stille, Schlafen: every charge underway is dropped, the net rests
function rhzClear() {
  for (const e of RHZ.q) e.v.rz.pend--;
  RHZ.q = [];
  if (RHZ.sp) RHZ.sp.refr.fill(0);
  if (RHZ.own) for (const sp of RHZ.own.values()) sp.refr.fill(0);   // (Hexenring: the loops' own nets rest too)
  if (A.ctx) rhzRun(0);
}
// held: the native release on v.out and the processor's own end ({off}: breath stops, the ring loses its drive)
function wkHold(v, t, peak, att, rel) {
  adsrStart(v, t, peak, att);
  const r = sustainRelease(v, rel);
  v.release = (k, at) => { if (v.alive && !v.released && v.wk) v.wk.port.postMessage({ off: relT(at) }); r(k, at); };
}
// Gestik: each swing of a shake is one more hammer on every Ranke ring that sounds (KONZEPT §2.6), a burst on every
// Amöbe (§2.5)
function wkShake(e) {
  for (const v of A.voices) {
    if (!v.alive || v.released || !v.wk) continue;
    if (v.as === 'rnk') v.wk.port.postMessage({ hammer: 0.3 + 0.7 * clamp(e.v, 0, 1) });   // (as strong as a touch at a full swing: the held ring carries its push and taps)
    else if (v.as === 'amo') v.wk.port.postMessage({ zuck: 0.4 + 0.6 * clamp(e.v, 0, 1) });   // Amöbe: each swing a burst of the form that heals (KONZEPT §2.5)
    else if (v.as === 'khl') v.wk.port.postMessage({ silbe: 1 });   // Kehlchen: each swing a syllable
  }
}

// state: idle → (armed →) (cue →) rec → (tail →) idle; 'cue' waits for the downbeat of a recording in bars.
// ringF is the audio-clock frame that follows the newest sample in the ring; bar holds the window of a bar recording.
const CAP = { node: null, mode: '', ringL: null, ringR: null, pos: 0, fill: 0, ringF: 0, state: 'idle', rec: null, bar: null, hold: [], mL: 0, mR: 0, pkL: 0, pkR: 0, mr: null, flushWait: null };
const REC_MAX_S = 20 * 60;
const SEG_FRAMES = 4 * 48000;             // backup segment size (≈4 s)
const PART_BYTES = 180 * 1024 * 1024;     // split size when a host refuses one big file

// The tap is created only when it is needed (recording, echo grains). As soon as an AudioWorklet exists, Chrome in a
// frame and Safari render the whole graph on the worklet thread, which has a lower priority than their real-time audio
// thread – so plain playing stays on the real-time thread until the first recording.
function ensureCapture() {
  if (CAP.node && CAP.node.context !== A.ctx) capDrop();   // (phone report: a tap of an earlier context hears nothing)
  if (CAP.node) return Promise.resolve(true);
  if (!CAP.pending) {
    CAP.pending = setupCapture().then(() => true, (e) => { console.error(e); toast('Die Aufnahme ist in diesem Browser nicht verfügbar.'); return false; });
    CAP.pending.then(() => { CAP.pending = null; });
  }
  return CAP.pending;
}
function capDrop() {
  const o = CAP.node; CAP.node = null; CAP.chunks = 0; CAP.sf = null; CAP.fill = 0; CAP.pos = 0;
  if (o) { try { o.port.onmessage = null; } catch (e) {} try { o.disconnect(); } catch (e) {} try { A.out.disconnect(o); } catch (e) {} }
}
async function setupCapture() {
  const ctx = A.ctx;
  const n = Math.floor(SR * 8);
  CAP.ringL = new Float32Array(n); CAP.ringR = new Float32Array(n);
  let node = null;
  if (ctx.audioWorklet && window.AudioWorkletNode) {
    const urls = [];
    try { urls.push(new URL('tap-worklet.js', document.baseURI).href); } catch (e) {}
    try { urls.push(URL.createObjectURL(new Blob([TAP_SRC], { type: 'text/javascript' }))); } catch (e) {}
    if (ctx.__dsp && await ctx.__dsp) urls.splice(0, urls.length, null);   // the engine module (klang) holds myzel-tap already
    for (const url of urls) {
      if (url) try { await ctx.audioWorklet.addModule(url); } catch (e) { continue; }
      try {
        node = new AudioWorkletNode(ctx, 'myzel-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
        node.port.onmessage = (e) => onChunk(e.data.l, e.data.r, e.data.flush, e.data.f);
        CAP.mode = 'worklet';
        break;
      } catch (e) { node = null; }
    }
  }
  if (!node) {
    // fallback: larger blocks ride out main-thread stalls better
    node = ctx.createScriptProcessor(16384, 2, 2);
    node.onaudioprocess = (ev) => {
      const ib = ev.inputBuffer;
      const l = ib.getChannelData(0).slice();
      const r = (ib.numberOfChannels > 1 ? ib.getChannelData(1) : ib.getChannelData(0)).slice();
      // no frame positions here: count from an estimate at the first block (bar grid then off by a few ms at most)
      if (CAP.sf == null) CAP.sf = Math.max(0, Math.round(ctx.currentTime * SR) - l.length);
      onChunk(l, r, false, CAP.sf);
      CAP.sf += l.length;
    };
    CAP.mode = 'script';
  }
  A.out.connect(node);
  const z = G(0); node.connect(z).connect(ctx.destination);
  CAP.node = node; CAP.lastP = performance.now();
  renderRecInfo();
}
function onChunk(l, r, isFlush, f) {
  const n = CAP.ringL.length, len = l.length;
  // an older cached tap without positions: estimate the first block from the clock, then count on
  if (f == null) f = CAP.chunks ? CAP.ringF : Math.max(0, Math.round(A.ctx.currentTime * SR) - len);
  let pl = 0, pr = 0;
  for (let i = 0; i < len; i++) {
    const a = l[i], b = r[i];
    CAP.ringL[CAP.pos] = a; CAP.ringR[CAP.pos] = b;
    if (++CAP.pos === n) CAP.pos = 0;
    const aa = a < 0 ? -a : a, bb = b < 0 ? -b : b;
    if (aa > pl) pl = aa; if (bb > pr) pr = bb;
  }
  CAP.fill = Math.min(n, CAP.fill + len);
  if (len) { CAP.ringF = f + len; CAP.chunks = (CAP.chunks || 0) + 1; CAP.lastP = performance.now(); }   // an empty flush must not move the clock
  if (pl > CAP.mL) CAP.mL = pl; if (pr > CAP.mR) CAP.mR = pr;
  if (CAP.bar) {
    const kept = barChunk(l, r, f, len, pl, pr);
    if (!kept && CAP.mode === 'worklet' && !isFlush && len === 2048) { try { CAP.node.port.postMessage({ back: [l, r] }, [l.buffer, r.buffer]); } catch (e) {} }
    if (isFlush && CAP.flushWait) { const fw = CAP.flushWait; CAP.flushWait = null; fw(); }
    return;
  }
  if (CAP.state === 'armed') { CAP.hold.push([l, r]); if (CAP.hold.length > 3) CAP.hold.shift(); return; }
  const rec = CAP.rec;
  if (!rec || (CAP.state !== 'rec' && CAP.state !== 'tail' && !CAP.flushWait)) {
    // not kept: hand the block back to the worklet's pool so its thread does not allocate
    if (CAP.mode === 'worklet' && !isFlush && len === 2048) { try { CAP.node.port.postMessage({ back: [l, r] }, [l.buffer, r.buffer]); } catch (e) {} }
    return;
  }
  pushRec(rec, l, r, pl, pr);
  if (isFlush && CAP.flushWait) { const f = CAP.flushWait; CAP.flushWait = null; f(); return; }
  if (CAP.state === 'tail') {
    rec.tailFrames += len;
    rec.quiet = Math.max(pl, pr) < 0.002 ? rec.quiet + len : 0;   // tail ends after 0.4 s below −54 dBFS, at most 8 s
    if (rec.quiet >= SR * 0.4 || rec.tailFrames >= SR * 8) finishRec();
  } else if (rec.frames / SR > REC_MAX_S) {
    finishRec();
    toast('Aufnahme nach 20 Minuten beendet, damit der Speicher des Geräts reicht.');
  }
}
function pushRec(rec, l, r, pl, pr) {
  if (!l.length) return;
  rec.L.push(l); rec.R.push(r); rec.frames += l.length;
  if (pl > rec.peak) rec.peak = pl; if (pr > rec.peak) rec.peak = pr;
  if (pl > CAP.pkL) CAP.pkL = pl; if (pr > CAP.pkR) CAP.pkR = pr;
  rec.segFrames += l.length;
  if (rec.segFrames >= SEG_FRAMES) backupSegment(rec);
}
function echoBuffer() {
  const fill = CAP.fill;
  if (!CAP.ringL || fill < SR * 0.5) return null;
  const n = CAP.ringL.length, buf = A.ctx.createBuffer(2, fill, SR);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let start = (CAP.pos - fill + n) % n, sum = 0;
  for (let i = 0; i < fill; i++) { const k = (start + i) % n; L[i] = CAP.ringL[k]; R[i] = CAP.ringR[k]; sum += L[i] * L[i]; }
  if (Math.sqrt(sum / fill) < 0.002) return null;
  return buf;
}

