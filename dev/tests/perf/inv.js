// The live audio graph at a moment, as Chromium renders it: which nodes the render pulls (reachable from the
// destination or from a node pulled on its own – an analyser, a worklet whose outputs are not connected) and which of
// them carry a non-silent signal (fed, through audio connections, by a running source: an oscillator, a buffer source,
// a constant source whose offset is not 0, a worklet). Chromium skips the work of a node whose inputs are silent (after
// its tail), so the second set is what costs at idle.
//   node graph.js <slot> [vp d|a]   env PRE=<preset>, SEQ=1 (Puls running), WAIT=<s>, JSON=1
// Exported for the other perf scripts: hook (the init script) and analyse (runs in the page).
const hook = () => {
  const G = (window.__G = { id: 0, nodes: new Map(), edges: [], pm: new WeakMap(), ctx: null });
  const P = BaseAudioContext.prototype, AN = AudioNode.prototype;
  const stackTag = () => { const s = new Error().stack.split('\n').slice(3).map((l) => l.trim().replace(/^at /, '').replace(/ \(.*:(\d+):\d+\)$/, ':$1').replace(/^.*\/index\.html:(\d+):\d+$/, 'l$1')); return s.slice(0, 3).join(' < '); };
  const reg = (n, type, ctx) => {
    if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) return n;
    if (!G.ctx) G.ctx = ctx;
    if (ctx !== G.ctx) { G.ctx = ctx; G.nodes.clear(); G.edges = []; }   // a new live context: start over
    const id = ++G.id; n.__id = id;
    G.nodes.set(id, { id, type, n, at: stackTag(), start: null, stop: null });
    for (let o = n; o && o !== AudioNode.prototype; o = Object.getPrototypeOf(o)) for (const k of Object.getOwnPropertyNames(o)) {
      let v; try { v = n[k]; } catch (e) { continue; }
      if (v instanceof AudioParam) G.pm.set(v, [id, k]);
    }
    if (n.parameters) for (const [k, v] of n.parameters) G.pm.set(v, [id, 'p:' + k]);
    return n;
  };
  for (const k of Object.getOwnPropertyNames(P)) if (/^create/.test(k) && typeof P[k] === 'function' && !/Buffer$|PeriodicWave/.test(k)) {
    const f = P[k]; P[k] = function (...a) { return reg(f.apply(this, a), k.slice(6), this); };
  }
  const W = window.AudioWorkletNode;
  if (W) window.AudioWorkletNode = class extends W { constructor(c, name, o) { super(c, name, o); reg(this, 'Worklet:' + name, c); } };
  const dst = new WeakSet();
  const C = AN.connect;
  AN.connect = function (d, o = 0, i = 0) {
    const r = C.apply(this, arguments);
    if (this.__id) {
      if (d instanceof AudioParam) { const p = G.pm.get(d); G.edges.push({ s: this.__id, d: p ? p[0] : -1, prm: p ? p[1] : '?', o }); }
      else { if (d instanceof AudioDestinationNode && !d.__id) { d.__id = 'dest'; } G.edges.push({ s: this.__id, d: d.__id || -1, o, i }); }
    }
    return r;
  };
  const D = AN.disconnect;
  AN.disconnect = function (...a) {
    const r = D.apply(this, a);
    if (!this.__id) return r;
    const s = this.__id;
    if (!a.length) G.edges = G.edges.filter((e) => e.s !== s);
    else if (typeof a[0] === 'number') G.edges = G.edges.filter((e) => !(e.s === s && e.o === a[0]));
    else {
      const t = a[0] instanceof AudioParam ? G.pm.get(a[0]) : null, tid = t ? t[0] : a[0].__id, tp = t ? t[1] : null;
      G.edges = G.edges.filter((e) => !(e.s === s && e.d === tid && (tp == null ? !e.prm : e.prm === tp) && (a.length < 2 || e.o === a[1]) && (a.length < 3 || e.i === a[2])));
    }
    return r;
  };
  for (const Cl of [AudioScheduledSourceNode, AudioBufferSourceNode]) {
    if (!Object.prototype.hasOwnProperty.call(Cl.prototype, 'start')) continue;
    const st = Cl.prototype.start, sp = Cl.prototype.stop;
    Cl.prototype.start = function (...a) { const x = this.__id && G.nodes.get(this.__id); if (x) x.start = a[0] || 0; return st.apply(this, a); };
    Cl.prototype.stop = function (...a) { const x = this.__id && G.nodes.get(this.__id); if (x) x.stop = a[0] || 0; return sp.apply(this, a); };
  }
};
// runs in the page: the pulled set, the busy set, counts by type, the busy nodes by where they were made
const analyse = () => {
  const G = window.__G, now = G.ctx.currentTime, N = G.nodes;
  const alive = (x) => x.n.context === G.ctx;
  const ins = new Map(), outs = new Map();
  for (const e of G.edges) { if (!ins.has(e.d)) ins.set(e.d, []); ins.get(e.d).push(e); if (!outs.has(e.s)) outs.set(e.s, []); outs.get(e.s).push(e); }
  // pulled: upstream of the destination and of nodes pulled on their own
  const pulled = new Set(), st = ['dest'];
  for (const [id, x] of N) {
    if (x.type === 'Analyser') st.push(id);
    if (x.type.startsWith('Worklet:') && !(outs.get(id) || []).some((e) => !e.prm)) st.push(id);
  }
  while (st.length) { const id = st.pop(); if (pulled.has(id)) continue; pulled.add(id); for (const e of ins.get(id) || []) st.push(e.s); }
  // running sources and silence: a source is busy while started and not stopped; a gain at exactly 0 without automation
  // or param inputs zeroes its output (Chromium sets the silence hint), a constant source at 0 too
  const running = (x) => x.start != null && (x.stop == null || x.stop > now);
  const gainZero = (x) => x.type === 'Gain' && x.n.gain.value === 0 && !(ins.get(x.id) || []).some((e) => e.prm === 'gain');
  const busy = new Set(), q = [];
  // never silent, whatever their input: a running source, a worklet (its output is written every quantum), a node that
  // mixes several channels down to fewer (Chromium's down-mix writes its bus: e.g. an explicit mono gain fed stereo),
  // and every node of a cycle (Chromium's cycles – the echo's ping-pong – are never silent)
  const downmix = (x) => x.n.channelCountMode === 'explicit' && x.n.channelCount === 1 && x.n.channelInterpretation === 'speakers' && (ins.get(x.id) || []).some((e) => !e.prm && N.get(e.s) && !/ChannelSplitter/.test(N.get(e.s).type) && (N.get(e.s).n.channelCount > 1 || N.get(e.s).n.channelCountMode !== 'explicit'));
  const cyc = new Set();
  { // Tarjan over the pulled nodes' audio links
    let idx = 0; const I = new Map(), low = new Map(), st2 = [], on = new Set();
    const sc = (v) => { I.set(v, idx); low.set(v, idx); idx++; st2.push(v); on.add(v);
      for (const e of outs.get(v) || []) { if (e.prm || !pulled.has(e.d) || e.d === 'dest') continue; const w = e.d; if (!I.has(w)) { sc(w); low.set(v, Math.min(low.get(v), low.get(w))); } else if (on.has(w)) low.set(v, Math.min(low.get(v), I.get(w))); }
      if (low.get(v) === I.get(v)) { const comp = []; let w; do { w = st2.pop(); on.delete(w); comp.push(w); } while (w !== v); if (comp.length > 1) for (const c of comp) cyc.add(c); } };
    for (const id of pulled) if (id !== 'dest' && !I.has(id)) sc(id);
  }
  for (const [id, x] of N) {
    if (!pulled.has(id)) continue;
    const src = (/^(Oscillator|BufferSource)$/.test(x.type) && running(x)) || (x.type === 'ConstantSource' && running(x) && (x.n.offset.value !== 0 || (ins.get(id) || []).some((e) => e.prm === 'offset'))) || x.type.startsWith('Worklet:') || x.type === 'MediaStreamSource' || x.type === 'MediaElementSource' || downmix(x) || cyc.has(id);
    if (src) { busy.add(id); q.push(id); }
  }
  while (q.length) {
    const id = q.shift();
    for (const e of outs.get(id) || []) {
      if (e.d === 'dest' || busy.has(e.d) || !pulled.has(e.d)) continue;
      const x = N.get(e.d); if (!x) continue;
      if (e.prm) { if (x.type === 'Gain' && e.prm === 'gain' && (ins.get(e.d) || []).some((f) => !f.prm && busy.has(f.s))) { busy.add(e.d); q.push(e.d); } continue; }
      if (gainZero(x)) continue;
      busy.add(e.d); q.push(e.d);
    }
  }
  const cnt = (set) => { const c = {}; for (const id of set) { const x = N.get(id); if (x) c[x.type] = (c[x.type] || 0) + 1; } return c; };
  const all = new Set([...N.keys()].filter((id) => alive(N.get(id))));
  const by = {};
  for (const id of busy) { const x = N.get(id); const k = x.type + ' @ ' + x.at; by[k] = (by[k] || 0) + 1; }
  return { t: +now.toFixed(2), made: cnt(all), pulled: cnt(pulled), busy: cnt(busy), nPulled: pulled.size - 1, nBusy: busy.size, busyAt: by };
};
module.exports = { hook, analyse };
if (require.main === module) (async () => {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const slot = process.argv[2], VP = process.argv[3] || 'd';
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(VP === 'a' ? { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' } : { viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(hook);
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:8790/' + slot + '/index.html'); await pg.waitForTimeout(1200);
  await pg.click('#btnStart'); await pg.waitForTimeout(2000);
  if (process.env.PRE) await pg.evaluate((n) => { const M = window.__M; M.loadPreset(M.PRESETS.find((x) => x.name === n)); }, process.env.PRE);
  if (process.env.SEQ) await pg.evaluate(() => { if (!window.__M.SEQ.on) window.__M.seqStart(); });
  await pg.waitForTimeout(1000 * (+process.env.WAIT || 6));
  const r = await pg.evaluate(analyse);
  if (process.env.JSON) console.log(JSON.stringify(r));
  else {
    console.log('== ' + slot + ' vp=' + VP + ' pre=' + (process.env.PRE || '') + ' t=' + r.t + ' s: pulled ' + r.nPulled + ', busy ' + r.nBusy);
    console.log('made   ', JSON.stringify(r.made)); console.log('pulled ', JSON.stringify(r.pulled)); console.log('busy   ', JSON.stringify(r.busy));
    for (const [k, v] of Object.entries(r.busyAt).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
  }
  await b.close();
})().catch((e) => { console.log('FAIL', e && e.stack || e); process.exit(1); });
