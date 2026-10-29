// ---- (owner, 29.10.2026: „mach alles aus Punkt 3“) the stretch edits off the main thread: what a stretch becomes
// (hxRxOp, and its crossfade into the audio around it – hxRxApply) is worked out in Workers, the very same functions
// (copied by toString), so the result is the same to the bit; the main thread only writes it in. A Tonhöhe over a
// whole loop of three Schichten froze the page for ≈ 8–9 s before. Without Workers (or a Worker that fails) it runs
// here as before. ----
const HXRW = { pool: [], seq: 0, wait: new Map(), broken: false, src: null };
// the Worker's source: the stretch functions and the constants they read (SR comes with every job)
function hxRwSrc() {
  if (HXRW.src) return HXRW.src;
  const fn = (f) => { const s = f.toString(); return /^(function|\(|[A-Za-z_$][\w$]*\s*=>|async)/.test(s) ? s : 'function ' + s; };   // (a method's shorthand made a function)
  const named = [hxRxOp, hxRvIn, hxRvLevel, hxRvBq, hxRvAt, hxRvShift, hxRvPv, hxRvPitch, hxRvNebel, hxRsWin, hxRsRead, hxFFT, hxRxRho, hxRxXf, hxRwRun].map(fn);
  const vars = { clamp, hxRng, hxRxGet, hxRvRms, hxRvHm };
  HXRW.src = 'var SR=48000;var HX_CH=' + HX_CH + ';var HX_RX=' + HX_RX + ';var HX_RS={T:' + HX_RS.T + ',n:' + HX_RS.n + ',w:null};var HX_RSO=[0,0];var HX_RX1=[1,0],HX_RX2=[0,0];var HX_RV_K,HX_RV_PP;\n' +
    Object.entries(vars).map(([k, f]) => 'var ' + k + '=' + f.toString() + ';').join('\n') + '\n' + named.join('\n') + '\n' +
    'var HX_RV={' + Object.keys(HX_RV).map((k) => JSON.stringify(k) + ':' + fn(HX_RV[k])).join(',\n') + '};\n' +
    'onmessage=function(e){var d=e.data;if(d.init){HX_RV_K=d.init.K;HX_RV_PP=d.init.PP;return;}var r=null;try{SR=d.o.sr;r=hxRwRun(d.o);}catch(x){r=null;}postMessage({id:d.id,r:r},r?[r[0].buffer,r[1].buffer]:[]);};';
  return HXRW.src;
}
// the job itself (here and in the Worker): the stretch [r0, r1) of the chunk list – as hxRxApply writes it in
function hxRwRun(o) {
  const ch = o.ch, r0 = o.r0, N = o.r1 - o.r0, out = hxRxOp(ch, r0, o.r1, o.op, o.v, o.u, o.seed), get = hxRxGet(ch), X = Math.min(HX_RX, Math.floor(N / 4)), rho = hxRxRho(out, get, r0, N, X);
  const l = new Float32Array(N), r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const y = out(i), x = get(r0 + i), [e, q] = hxRxXf(i, N, X, rho);
    l[i] = y[0] * e + x[0] * q; r[i] = y[1] * e + x[1] * q;
  }
  return [l, r];
}
// the chunks a job reads (the stretch, the sinc's taps around it, a faster tape's last tile and its fade) – copied, the
// others left out
function hxRwChunks(ch, r0, r1, op, v) {
  const lo = Math.max(0, Math.floor((r0 - 32) / HX_CH)), ex = op === 'band' ? Math.ceil((HX_RX + 2) * Math.max(1, v)) + 64 : 32, hi = Math.min(ch.length - 1, Math.floor((r1 + ex) / HX_CH)), o = [];
  for (let k = lo; k <= hi; k++) if (ch[k]) o[k] = [ch[k][0].slice(), ch[k][1].slice()];
  return o;
}
function hxRwWorker() {
  if (HXRW.broken) return null;
  const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  if (HXRW.pool.length < n) {
    try {
      const w = new Worker(URL.createObjectURL(new Blob([hxRwSrc()], { type: 'text/javascript' })));
      w.postMessage({ init: { K: HX_RV_K, PP: HX_RV_PP } });
      w.busy = 0;
      w.onmessage = (e) => { w.busy--; const j = HXRW.wait.get(e.data.id); if (!j) return; HXRW.wait.delete(e.data.id); j.resolve(e.data.r || hxRwRun(j.o)); };
      w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); HXRW.broken = true; HXRW.pool.forEach((x) => x.terminate()); HXRW.pool.length = 0; for (const j of HXRW.wait.values()) j.resolve(hxRwRun(j.o)); HXRW.wait.clear(); };
      HXRW.pool.push(w);
    } catch (e) { HXRW.broken = true; }
  }
  return HXRW.pool.length ? HXRW.pool.reduce((a, b) => (b.busy < a.busy ? b : a)) : null;
}
// a stretch worked out off the thread: → [left, right] of its N frames (the same as hxRwRun here)
function hxRw(ch, r0, r1, op, v, u, seed) {
  const o = { ch: hxRwChunks(ch, r0, r1, op, v), r0, r1, op, v, u, seed, sr: SR }, w = hxRwWorker();
  if (!w) return Promise.resolve(hxRwRun(o));
  return new Promise((resolve) => { const id = ++HXRW.seq; HXRW.wait.set(id, { resolve, o }); w.busy++; w.postMessage({ id, o }); });
}
// the ops that go there (Einspielen, Tauschen and Einsetzen are quick and stay here)
const hxRwOk = (op) => op !== 'take' && op !== 'swap' && op !== 'paste';
// the Vorhören's quick version (one pass's stretch): only the heavy ones there – the others are heard at once, as before
const HX_RW_PV = new Set(['pitch', 'wurzel', 'krone', 'nebel', 'sporen', 'band']);
