// ---- the Werk-Rahmen, the parent's side: a hidden frame of this page (?werk=1), everything through a transferred
// MessagePort (postMessage only – on file:// the frame is an origin of its own); booted at the first need. When it
// cannot boot (a sandbox without frames, a blocked URL) the bake is off: loops follow the live chain, the card says so.
Object.assign(HXW, { frame: null, port: null, st: '', p: null, wait: new Map(), id: 0, why: '', ver: 1, ms: [] });
// (Leistung, 23.10.2026) a realm's document: this page's own HTML with its app script loaded from one Blob made once –
// Chromium keeps ≈ 5 MB of every document it loaded whose 2.3 MB script was inline, also after the frame went (measured:
// 40 loads, +4.8 MB each, no plateau; from a script file or a Blob, +0.5–1 MB): the realms are renewed (HX_WRENEW), so
// each load counted. Not over http(s), or when the page cannot read itself: the frame loads ?werk=1 as before
function hxwShell() {
  if (HXW.shellP) return HXW.shellP;
  return (HXW.shellP = (async () => {
    try {
      if (!/^https?:$/.test(location.protocol)) return null;
      const sc = [...document.scripts].find((s) => !s.src && s.text.includes('function hxwBoot('));
      if (!sc) return null;
      const r = await fetch(location.href.split('#')[0]); if (!r.ok) return null;
      const html = await r.text(), i = html.indexOf(sc.text); if (i < 0) return null;
      const a = html.lastIndexOf('<script', i), b = html.indexOf('<\/script>', i + sc.text.length); if (a < 0 || b < 0) return null;
      const url = URL.createObjectURL(new Blob([sc.text], { type: 'text/javascript' }));
      return html.slice(0, a) + '<script src="' + url + '"><\/script>' + html.slice(b + 9);   // (escaped: this text sits in the page's own inline script)
    } catch (e) { return null; }
  })());
}
function hxWerk(R0) {
  const R = R0 || HXW;   // (step 2a: one of the realms – HXW, the first, or one of its pool)
  if (HXW.on) return Promise.resolve(false);
  if (R.p) return R.p;
  R.st = 'laden';
  R.p = hxwShell().then((shell) => new Promise((res) => {
    let done = false, tA = 0;
    const fail = (why) => {
      if (done) return; done = true; clearTimeout(tA); R.st = 'kein'; R.why = why;
      try { if (R.frame) R.frame.remove(); } catch (e) {}
      R.frame = null; R.port = null;
      for (const w of R.wait.values()) w(null);
      R.wait.clear(); res(false); hxCardDirty();
    };
    let url = '';
    try { if (!/^(https?|file):$/.test(location.protocol)) throw new Error('ort'); const u = new URL(location.href); u.hash = ''; u.searchParams.set('werk', '1'); url = u.href; } catch (e) { fail('ort'); return; }
    let f;
    try {
      f = document.createElement('iframe');
      f.hidden = true; f.tabIndex = -1; f.title = 'Werk-Rahmen'; f.setAttribute('aria-hidden', 'true');
    } catch (e) { fail('rahmen'); return; }
    tA = setTimeout(() => fail('zeit'), 45000);
    f.addEventListener('load', () => {
      if (done) return;
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => {
        const m = e.data;
        if (m && m.ready) { if (done) return; done = true; clearTimeout(tA); R.port = ch.port1; R.st = 'ok'; res(true); hxwWport(R); hxCardDirty(); return; }
        const w = m && R.wait.get(m.id);
        if (m && m.nan) { (HX.nan = HX.nan || []).push({ realm: m.job, n: m.nan }); console.warn('Hexenring: a render held non-finite samples (scrubbed)', m.job, m.nan); }   // (step 2b: the realm's tripwire)
        if (w) { R.wait.delete(m.id); if (m.ms) { R.ms.push([m.job, m.ms, m.dur || 0]); if (R.ms.length > 50) R.ms.shift(); } w(m); }
      };
      // (the frame's script has run once it loaded: its answer comes at once – a frame that does not answer is no Werk-Rahmen)
      try { f.contentWindow.postMessage({ hxWerk: 1 }, '*', [ch.port2]); } catch (e) { fail('post'); return; }
      clearTimeout(tA); tA = setTimeout(() => fail('antwort'), 4000);
    });
    f.addEventListener('error', () => fail('laden'));
    if (shell) { f.name = 'myzel-werk'; f.srcdoc = shell; } else f.src = url;
    try { document.body.appendChild(f); } catch (e) { fail('rahmen'); return; }
    R.frame = f;
  }));
  return R.p;
}
const hxwOk = () => HXW.st !== 'kein';
function hxwRenew() {
  const now = performance.now();
  for (const R of [HXW, ...HXW.pool]) {
    if (R && !R.old && R.used && now - R.t0 > HX_WRENEW_S * 1000) { R.old = true; R.oldT = now; }   // (one used seldom fills slowly: renewed after a while too)
    if (!R || !R.old || R.st !== 'ok' || R.n || R.wait.size || now - R.oldT < 3000) continue;
    let still = false;   // (a pass it rendered that sounds now or comes: its stream reads its port, ✓ asks it for that pass)
    for (const S of HX.sch.values()) {
      if (!S.wRe) continue;
      const L = HX.loops.get(S.loop), kNow = L ? hxPassK(L, Math.round(hxF(hxNowT()))) : -Infinity;
      for (const k in S.wRe) if (S.wRe[k] === R && +k >= kNow) { still = true; break; }
      if (still) break;
    }
    if (still) continue;
    for (const S of HX.sch.values()) if (S.wRe) for (const k in S.wRe) if (S.wRe[k] === R) delete S.wRe[k];
    try { if (R.port) R.port.close(); } catch (e) {}
    try { if (R.frame) R.frame.remove(); } catch (e) {}
    if (R.wid != null) hxPost({ wportOff: R.wid });   // (the live ring's port to it)
    Object.assign(R, { st: '', p: null, frame: null, port: null, wait: new Map(), n: 0, used: 0, old: false, ms: [] });
    HXW.renew = (HXW.renew || 0) + 1;
    if (R !== HXW && [...HX.sch.values()].some((S) => S.wLive)) hxwCall('warm', { sr: SR }, [], R);   // (booted again before a pass needs it)
  }
}
// a job → Promise of its reply (null when there is no Werk-Rahmen); tr: buffers handed over (the caller keeps none);
// R: the realm (step 2a; the first one unless told)
// (Leistung, 23.10.2026 – the owner's desktop report: the memory filled while loops only played, the screen hitched in
// the garbage collector's pauses) Chromium keeps every OfflineAudioContext that loaded an AudioWorklet module alive for
// as long as its document lives – each render of a realm (a living pass ≈ 4 MB: its graph, its buffers) stayed for good;
// measured, 8 % of a living pass's memory came back. Only the frame's going frees them: a realm is renewed after
// HX_WRENEW renders or HX_WRENEW_S seconds – it takes no new living pass, and once nothing it rendered still sounds or may be kept (✓) and it
// waits for nothing, its frame goes (hxwRenew, in hxWTick); the next job boots a fresh one. Every render is its own
// (seeded, built afresh), so the sound does not change.
const HX_WRENEW = +(window.__hxRenew || 0) || 12;   // (window.__hxRenew: tests only)
const HX_WRENEW_S = 90;   // (… or this many seconds after its first render)
function hxwCall(job, d, tr, R0) {
  const R = R0 || HXW;
  if (job === 'wuchs' || job === 'bake' || job === 'tail') { if (!R.used) R.t0 = performance.now(); R.used = (R.used || 0) + 1; if (R.used >= HX_WRENEW && !R.old) { R.old = true; R.oldT = performance.now(); } }
  return hxWerk(R).then((ok) => new Promise((res) => {
    if (!ok || !R.port) { res(null); return; }
    const id = ++R.id;
    R.wait.set(id, res);
    try { R.port.postMessage(Object.assign({ job, id }, d), tr || []); } catch (e) { R.wait.delete(id); res(null); }
  }));
}

// ---- the Werk-Rahmen, the child's side (?werk=1): boot render-only, then its jobs one after another ----
// Determinism: Math.random here is this realm's own, seeded per render (xorshift); what engines build lazily and share
// (Schwarm's chirps and flight, Kalimba's knock, Obertöne's walk, Elmsfeuer's loops, the Jahresring's and Zapfen's
// buffers, the grain textures) is built at once from fixed seeds and kept; strings are rendered exact (never a
// neighbour retuned); the Jahresring's age and season come with the job and count hits in render time; every render
// builds its own graph, its own Gespinst web (before it renders) and its own Rhizom net.
const HXW_FIX = 0x5eed1c;
function hxwSeed(s) { let x = (s | 0) || 1; const R = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; Math.random = R; return R; }
// (step 2a: the browser's own – what runs in the realm between a render's blocks draws from it, never from the render's)
const HXW_RND = Math.random;
function hxwBoot() {
  DSPW.broken = true;   // (heavy buffers on this thread, from this realm's seeded random – never a worker's)
  Object.assign(HXW, { jobs: [], busy: false, port: null, sr: 0 });
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || !e.data || !e.data.hxWerk || !e.ports || !e.ports[0]) return;
    HXW.port = e.ports[0];
    HXW.port.onmessage = (ev) => {
      const d = ev.data;
      if (d && d.job === 'wport') { hxwPort(d.port); return; }   // (step 2a: the live frame, straight from myzel-ring)
      if (d && d.job === 'feld') { HXW.feld = d.P || null; return; }   // (a loop that follows the field: its sound's knobs, at the next suspend)
      if (d && d.job === 'drop') { HXW.jobs = HXW.jobs.filter((j) => j.keep !== d.keep || (HXW.port.postMessage({ id: j.id, job: j.job, stopped: 1 }), false)); return; }   // (Leistung: a pass whose time has passed before its render began – nothing of it was heard)
      if (d && d.job === 'stop') { if (HXW.cur && HXW.cur.key === d.keep) HXW.cur.stop = true; HXW.jobs = HXW.jobs.filter((j) => j.keep !== d.keep || (HXW.port.postMessage({ id: j.id, job: j.job, stopped: 1 }), false)); return; }   // (step 2a: a stream no longer wanted)
      HXW.jobs.push(d); hxwNext();
    };
    HXW.port.postMessage({ ready: 1, ver: HXW.ver });
  });
}
// (step 2a) myzel-ring reports its frame here every 0.1 s – a streamed pass is paced by it (≤ 1.25 s ahead of what plays)
function hxwPort(port) {
  if (HXW.fp) try { HXW.fp.close(); } catch (e) {}
  HXW.fp = port; HXW.fr = null;
  port.onmessage = (e) => { const d = e.data; if (d && d.fr != null) { HXW.fr = { F: d.fr, at: performance.now() }; if (HXW.paceW) { const w = HXW.paceW; HXW.paceW = null; w(); } } };
}
const hxwLive = () => (HXW.fr ? HXW.fr.F + ((performance.now() - HXW.fr.at) * SR) / 1000 : null);
const HXW_JOB = { ping: async () => ({ pong: 1 }), warm: async (d) => { SR = d.sr || SR; await hxwShared(['glas']); return { warm: 1 }; }, bake: (d) => hxwBake(d), tail: (d) => hxwNotes(d), wuchs: (d) => hxwNotes(d),
  keep: async (d) => { const k = HXW.keep && HXW.keep.get(d.key); if (!k) return { none: 1 }; const L = k.L.slice(), R = k.R.slice(); return { L, R, n: k.n, tr: [L.buffer, R.buffer] }; } };
async function hxwNext() {
  if (HXW.busy) return;
  HXW.busy = true;
  while (HXW.jobs.length) {
    const d = HXW.jobs.shift(), t0 = performance.now();
    let r;
    try { r = await (HXW_JOB[d.job] || (async () => ({ err: 'job' })))(d); } catch (e) { console.warn(e); r = { err: String((e && e.message) || e) }; }
    r = r || {};
    const tr = r.tr || []; delete r.tr;
    try { HXW.port.postMessage(Object.assign({ id: d.id, job: d.job, ms: performance.now() - t0 }, r), tr); } catch (e) {}
  }
  HXW.busy = false;
}
// the shared state, once per sample rate, each from its own fixed seed (the textures a job needs, too)
async function hxwShared(kinds) {
  const keep = A.ctx;
  if (HXW.sr !== SR) {
    HXW.sr = SR; A.tex = {}; A.texWait = {};
    A.swmChirps = A.swmFly = A.klbKnock = A.obtWalk = null; ELM.bufs = null; JRG_IMP = null; ZPF_BUF = null;
    A.ctx = new OfflineAudioContext(1, 128, SR);
    try { [() => ENGINES.swm.chirps(), () => ENGINES.swm.flutter(), () => ENGINES.klb.knock(), () => ENGINES.obt.walk(), () => ELM.loops(), () => jrgImp(), () => zpfBufs()].forEach((fn, i) => { hxwSeed(HXW_FIX + i); fn(); }); }
    finally { A.ctx = keep; }
  }
  for (const k of kinds) {
    if (A.tex[k] || LIVE_SRC.has(k)) continue;
    A.ctx = new OfflineAudioContext(1, 128, SR);
    try { hxwSeed(HXW_FIX + 100 + [...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)); texture(k); await A.texWait[k]; } finally { A.ctx = keep; }
  }
}
// a note list rendered as the Gespielt tap heard it: the app's whole graph in an offline context with the patch d.P,
// level d.q and the mask's strips; the notes (times from the render's start) from the pass seed d.seed; the voices
// that end are cleaned after the render. → {L, R} from d.from (s) on, and the render's own time.
// (step 2a, Wuchs) d.chain: the insert chain as recorded with the loop, burnt in (hxwChain); d.port: streamed – the
// blocks go straight to myzel-ring through that port (the sink myzel-wsend: from d.from on, the tail ending at −90 dB),
// paced by the live frame the ring reports (render time t is ring frame d.F0 + t·SR; ≤ d.lead s ahead) while the pass
// body (d.body s) renders – the tail after it renders at once; d.feld: the field's knobs, as they move, at each suspend
async function hxwNotes(d) {
  const T0 = performance.now();
  SR = d.sr || SR;
  for (const id in PD) if (!PD[id].dev) P[id] = PD[id].d;
  Object.assign(P, d.P || {});
  P['bor.on'] = false; P['rev.mix'] = 0; P['dly.mix'] = 0; P['kor.src'] = LIVE_SRC.has(P['kor.src']) ? 'glas' : P['kor.src'];
  await hxwShared(['glas', P['kor.src']]);
  Q = QP[d.q] || QP[3]; VBUDGET = MAXV = 1e9; A.lite = false; A.budgetScale = 1;
  buildNotes();
  A.voices.clear(); A.grainVoices.clear(); A.revActive = null; A.revWant = 0; A.drvKey = null; A.bor = null; A.frozen = false; A.grains = 0; A.irJob = 0; A.gsp = null; A.elmDrift = null; A.echoCache = null;
  KS_CACHE.clear(); KS_CACHE.frames = 0; ksBuffer.wait.clear();
  RHZ.q.length = 0; RHZ.vs.clear(); RHZ.h = 0; RHZ.sp = null; RHZ.own = null;
  HX.mask = new Set(d.mask || ['fin', 'eb2', 'rgn', 'gsp']);
  const dur = Math.max(0.05, +d.dur || 1), len = Math.ceil(dur * SR), ctx = new OfflineAudioContext(2, len, SR), notes = d.notes || [];
  hxwSeed(HXW_FIX);   // (the graph's own noise and drift buffers: the same in every render)
  HXW.ctx = ctx;
  try { initAudio(); } finally { HXW.ctx = null; }
  try { A.out.disconnect(); } catch (e) {}
  const strm = !!d.port;
  if (strm || d.chain || notes.some((n) => ENGINES[n.eng] && ENGINES[n.eng].needs) || notes.some((n) => n.eng === 'gsp')) await ensureDSP(ctx);
  let tap = A.hxIn0, chainEv = [], snk = null;
  if (d.chain) { const k = hxwChain(d.chain); A.hxIn0.connect(k.c.in); tap = k.c.out; chainEv = k.ev; }
  if (strm) {
    snk = new AudioWorkletNode(ctx, 'myzel-wsend', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
      processorOptions: { n: len, body: Math.round((+d.body || dur) * SR), from: Math.round((+d.from || 0) * SR), chunk: HX_CH } });
    tap.connect(snk); snk.connect(ctx.destination); tap.connect(ctx.destination); snk.port.postMessage({ port: d.port }, [d.port]);   // (the render's own buffer holds the pass too: ✓ keeps it, its tail is measured on it)
    if (d.keep) HXW.cur = { key: d.keep, stop: false };   // (the page may stop it: hxwStop)
  } else tap.connect(ctx.destination);
  if (d.jrg) { A.jrgAge = +d.jrg.age || 0; A.season = +d.jrg.season || 0; A.jrgSec = -1; A.jrgN = 0; }
  if (notes.some((n) => n.eng === 'gsp')) gspWeb();   // (its own web, built before the render)
  const RND = hxwSeed(d.seed || 1);
  HXW.dead = [];
  // the work per render block (one suspend each): starts at their exact time, curves, releases, and what tick() does
  // live – the grains' and Rhizom's scheduling – every 25 ms ahead of the render
  const work = new Map(), add = (t, fn) => { const b = Math.max(0, Math.floor(t * SR / 128)); if (b * 128 >= len) return; if (!work.has(b)) work.set(b, []); work.get(b).push(fn); };
  notes.forEach((n, i) => {
    if (n.eng === 'bor') {   // (step 2a: the Bordun – a drone, no voice: its start and stop)
      add(n.t0, () => { if (!A.bor) startBordun(); });
      if (n.t1 != null) add(n.t1, () => { if (A.bor) stopBordun(); });
      return;
    }
    add(n.t0, () => {
      const E = ENGINES[n.eng]; if (!E || !(n.f > 0 && Number.isFinite(n.f))) return;   // (never a note without a pitch)
      const o = { pan: n.pan || 0, bus: stripIn(n.src && MIX.s[n.src] ? n.src : 'fin') };
      const v = n.burst ? hit(n.eng, n.t0, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, Object.assign(o, { burst: true, gate: n.gate != null ? n.gate : 0.22 })) : E.sustain || n.hold ? playNote(n.eng, n.t0, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, o) : hit(n.eng, n.t0, n.f, n.y0 != null ? n.y0 : 0.5, n.vel, o);
      n._v = v;
    });
    for (const [t, y] of (n.curves && n.curves.y) || []) add(t, () => { if (n._v && n._v.alive && n._v.setY) n._v.setY(y); });
    for (const [t, f] of (n.curves && n.curves.f) || []) add(t, () => { if (n._v && n._v.alive && n._v.setF) n._v.setF(f, P['v.glide']); });
    if (n.t1 != null && !n.burst) add(n.t1, () => { if (n._v && n._v.alive && n._v.release && !n._v.released) n._v.release(); });
  });
  if (notes.some((n) => n.eng === 'kor' || n.eng === 'rhz')) for (let t = 0; t < dur; t += 0.025) add(t, () => { const h = ctx.currentTime + 0.12; grainTick(h); if (RHZ.vs.size || RHZ.q.length) rhzRun(h); });
  for (const [t, fn] of chainEv) add(t, fn);
  for (const [t, id, v] of d.prm || []) add(t, () => { if (PD[id]) P[id] = v; });   // (step 2a: the engines' Bewegung lanes, as they were turned)
  // the pacing: a suspend every 0.25 s of the body from where it is heard (d.from) – each waits until its frame is at
  // most d.lead s ahead of the live one; the field's knobs (d.feld) are taken there too
  const pace = new Set();
  if (strm) { add(0, () => {}); for (let t = Math.max(0, +d.from || 0); t < (+d.body || dur); t += 0.25) { const b = Math.max(0, Math.floor(t * SR / 128)); if (b * 128 < len) { pace.add(b); add(t, () => {}); } } }
  const lead = Math.round((+d.lead || 1.25) * SR), F0 = d.F0 != null ? +d.F0 : null;
  const C0 = HXW.cur;
  for (const [b, fns] of work) ctx.suspend(b * 128 / SR).then(async () => {
    // (stopped by the page – the Schicht went, the loop rests, a newer render took its pass: nothing more is streamed,
    // played or waited for; the rest renders silent at once – an offline render cannot end early)
    if (C0 && C0.stop) { if (snk) { try { snk.disconnect(); tap.disconnect(); } catch (e) {} } for (const v of A.voices) try { v.cleanup(); } catch (e) {} ctx.resume(); return; }
    if (d.feld && HXW.feld) { Object.assign(P, HXW.feld); HXW.feld = null; }
    // (the render's throw is its own: drawn only here, in its blocks – a timer of the realm between two blocks drew from
    // it before, and a source's noise phases or a grain's place came out another way now and then: Elmsfeuer)
    Math.random = RND;
    for (const fn of fns) { try { fn(); } catch (e) { console.warn(e); } }
    Math.random = HXW_RND;
    if (pace.has(b) && F0 != null) await hxwPace(F0 + b * 128, lead, C0);
    ctx.resume();
  });
  Math.random = HXW_RND;
  const setup = (performance.now() - T0) / 1000;   // (graph, module, the notes scheduled: before a sample renders)
  const t0 = performance.now(), buf = await ctx.startRendering(), ms = performance.now() - t0;
  if (snk) { try { snk.port.onmessage = null; snk.port.close(); snk.disconnect(); tap.disconnect(); } catch (e) {} }   // (Leistung: nothing of this render is kept but its buffer – see WSend)
  const dead = HXW.dead; HXW.dead = null;
  for (const v of dead) v.cleanup();
  for (const v of A.voices) v.cleanup();
  gspDrop(); A.started = false;
  if (strm) {   // (its blocks went to the ring; the realm keeps its last passes whole – ✓ makes one of them the anchor)
    if (HXW.cur === C0) HXW.cur = null;
    if (C0 && C0.stop) return { n: len, dur, rms: ms, stopped: 1 };
    // (what the sink streamed, by its own rule on the render's buffer: chunk by chunk from `from`, the body's peak, the end
    // at the first whole chunk after the body 90 dB under it – else the render's end, its last 30 ms faded. ✓ keeps exactly
    // that; the tail's length teaches the next render's)
    const bL = buf.getChannelData(0), bR = buf.getChannelData(1), body = Math.round((+d.body || dur) * SR), f0 = Math.floor(Math.round((+d.from || 0) * SR) / HX_CH) * HX_CH;
    let pk = 0, e = len;
    for (let st = f0; st < len; st += HX_CH) {
      let cp = 0; for (let i = st; i < Math.min(len, st + HX_CH); i++) { const x = Math.abs(bL[i]), y = Math.abs(bR[i]); if (x > cp) cp = x; if (y > cp) cp = y; }
      if (st < body) pk = Math.max(pk, cp);
      if (st >= body && cp <= pk * 3.2e-5) { e = st; break; }
    }
    const cut = e >= len && len > body;
    if (cut) { const N = Math.min(Math.max(1, len - body), Math.round(0.03 * SR)), a0 = len - N; for (let i = a0; i < len; i++) { const w = Math.cos(Math.PI / 2 * (0.5 - 0.5 * Math.cos(Math.PI * (i - a0 + 0.5) / N))); bL[i] *= w; bR[i] *= w; } }
    const nan = hxwScrub(bL, bR) || undefined;   // (the sink scrubbed what it streamed; ✓ keeps this buffer)
    if (d.keep) { const K = HXW.keep || (HXW.keep = new Map()); K.set(d.keep, { L: bL.subarray(0, e), R: bR.subarray(0, e), n: e }); while (K.size > 10) K.delete(K.keys().next().value); }
    return { n: len, dur, rms: ms, tail: Math.max(0, e - body) / SR, cut, setup, nan };
  }
  const a = Math.max(0, Math.min(len, Math.round((+d.from || 0) * SR))), L = buf.getChannelData(0).slice(a), R = buf.getChannelData(1).slice(a);
  return { L, R, dur, rms: ms, tr: [L.buffer, R.buffer], nan: hxwScrub(L, R) || undefined };
}
// (step 2b) the realm's tripwire: a render's non-finite samples are zeroed before they leave the realm, and counted
function hxwScrub(L, R) { let n = 0; for (const a of [L, R]) for (let i = 0; i < a.length; i++) if (!(a[i] - a[i] === 0)) { a[i] = 0; n++; } return n; }
// a streamed pass's suspend waits here until its frame is no more than `lead` frames ahead of the ring's (its reports
// extrapolated by the clock between them; none yet: no wait – at most 30 s, then on)
async function hxwPace(F, lead, C0) {
  const t0 = performance.now();
  for (;;) {
    const live = hxwLive();
    if (live == null || F - live <= lead || performance.now() - t0 > 30000 || (C0 && C0.stop)) return;
    await new Promise((res) => { HXW.paceW = res; setTimeout(res, Math.min(100, Math.max(4, ((F - live - lead) / SR) * 1000))); });
  }
}
// the bake: a Schicht's dry audio through a copy of the insert chain with the settings, changes, LFO phases and
// deflections recorded while it was played (d.chain, hxChainRec) – what the live chain did to it then
// (step 2a: shared by the bake and the Wuchs renders) the insert chain as it was recorded, built into A.ctx: its settings,
// its modulators at their recorded phase and rate, the mod layer's lines; its changes come back as [time, fn] for the
// render's suspends. Its own drive oversampling and lightness only while its parts are set – never the voices'.
function hxwChain(C) {
  const ctx = A.ctx, keepQ = Q, keepLite = A.lite, ws = (fn) => { const q = Q, l = A.lite; Q = Object.assign({}, q, { os: C.os }); A.lite = !!C.lite; try { fn(); } finally { Q = q; A.lite = l; } };
  C.ids.forEach((id, i) => { P[id] = C.snap[i]; });
  const osc = (k) => { const L = C.lfo[k], ph = 2 * Math.PI * ((L[0] % 1) + 1), o = ctx.createOscillator(); o.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)]), { disableNormalization: true })); o.frequency.value = L[1]; KR(o.detune); o.start(0); return o; };
  A.rngOsc = osc('rng');
  A.fltLfo = osc('flt'); A.fltLfoG = G(0); A.fltLfo.connect(A.fltLfoG);
  A.phaLfo = osc('pha'); A.phaLfoG = G(0); A.phaLfo.connect(A.phaLfoG);
  A.choL1 = osc('cho1'); A.choL2 = osc('cho2'); A.choG1 = G(0); A.choG2 = G(0); A.choL1.connect(A.choG1); A.choL2.connect(A.choG2);
  A.panLfo = osc('pan'); A.panLfoG = G(0); A.panLfo.connect(A.panLfoG);
  let c; ws(() => { c = makeChain(); });
  const pan = () => { setP(A.panLfo.frequency, P['mov.panRate']); setP(A.panLfoG.gain, P['mov.pan']); };
  const all = (os, lite) => { const q = Q, l = A.lite; Q = Object.assign({}, q, { os }); A.lite = !!lite; A.drvKey = null; try { updDrive(); updRing(); updFilter(); updPhaser(); updChorus(); pan(); } finally { Q = q; A.lite = l; } };   // (as the bake: every chain of this render – the graph's own is not heard)
  HXW.now = true; A.drvKey = null;
  try { all(C.os, C.lite); } finally { HXW.now = false; }
  for (const [k, nm] of Object.entries(HX_LFO)) { const L = C.lfo[k], p = A[nm].frequency; setNow(p, L[1]); if (L[2] != null && Math.abs(L[2] - L[1]) > 1e-9) p.setTargetAtTime(L[2], 0, L[3]); }
  for (const k in C.mod) {
    const pts = C.mod[k], cs = ctx.createConstantSource(), o = cs.offset;
    o.value = pts[0][1]; o.setValueAtTime(pts[0][1], 0);
    for (const [t, v] of pts.slice(1)) o.linearRampToValueAtTime(v, t);
    cs.start(0);
    if (k === 'rng') cs.connect(A.rngOsc.detune);
    else if (k === 'flt') cs.connect(c.flt.detune);
    else if (k === 'pha') for (const ap of c.phaAps) cs.connect(ap.detune);
    else if (k === 'pan') { if (c.apan.pan) cs.connect(c.apan.pan); }
    else if (k === 'cho') { const w = G(0.7), dr = G(-0.4); cs.connect(w).connect(c.choWet.gain); cs.connect(dr).connect(c.choDry.gain); }
  }
  const ev = C.ev.map((e) => [e[0], () => { C.ids.forEach((id, i) => { P[id] = e[1][i]; }); HXW.t = e[0]; try { all(e[2], e[3]); } finally { HXW.t = null; } }]);
  Q = keepQ; A.lite = keepLite;
  return { c, ev };
}
async function hxwBake(d) {
  SR = d.sr || SR;
  const C = d.chain, n = d.n, ctx = new OfflineAudioContext(2, n, SR), keepQ = Q;
  A.ctx = ctx; A.chains = [];
  C.ids.forEach((id, i) => { P[id] = C.snap[i]; });
  Q = Object.assign({}, QP[3], { os: C.os }); A.lite = !!C.lite;
  // the modulators at their recorded phase (a sine whose wave starts there) and rate
  const osc = (k) => { const L = C.lfo[k], ph = 2 * Math.PI * ((L[0] % 1) + 1), o = ctx.createOscillator(); o.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)]), { disableNormalization: true })); o.frequency.value = L[1]; KR(o.detune); o.start(0); return o; };
  A.rngOsc = osc('rng');
  A.fltLfo = osc('flt'); A.fltLfoG = G(0); A.fltLfo.connect(A.fltLfoG);
  A.phaLfo = osc('pha'); A.phaLfoG = G(0); A.phaLfo.connect(A.phaLfoG);
  A.choL1 = osc('cho1'); A.choL2 = osc('cho2'); A.choG1 = G(0); A.choG2 = G(0); A.choL1.connect(A.choG1); A.choL2.connect(A.choG2);
  A.panLfo = osc('pan'); A.panLfoG = G(0); A.panLfo.connect(A.panLfoG);
  const c = makeChain();
  const pan = () => { setP(A.panLfo.frequency, P['mov.panRate']); setP(A.panLfoG.gain, P['mov.pan']); };   // (as updMove: Kreisen)
  const all = () => { updDrive(); updRing(); updFilter(); updPhaser(); updChorus(); pan(); };
  HXW.now = true; A.drvKey = null;
  try { all(); } finally { HXW.now = false; }
  // the rates as they were at the window's start: the value, and a glide still under way
  for (const [k, nm] of Object.entries(HX_LFO)) { const L = C.lfo[k], p = A[nm].frequency; setNow(p, L[1]); if (L[2] != null && Math.abs(L[2] - L[1]) > 1e-9) p.setTargetAtTime(L[2], 0, L[3]); }
  // the mod layer's deflections, as lines
  for (const k in C.mod) {
    const pts = C.mod[k], cs = ctx.createConstantSource(), o = cs.offset;
    o.value = pts[0][1]; o.setValueAtTime(pts[0][1], 0);
    for (const [t, v] of pts.slice(1)) o.linearRampToValueAtTime(v, t);
    cs.start(0);
    if (k === 'rng') cs.connect(A.rngOsc.detune);
    else if (k === 'flt') cs.connect(c.flt.detune);
    else if (k === 'pha') for (const ap of c.phaAps) cs.connect(ap.detune);
    else if (k === 'pan') { if (c.apan.pan) cs.connect(c.apan.pan); }
    else if (k === 'cho') { const w = G(0.7), dr = G(-0.4); cs.connect(w).connect(c.choWet.gain); cs.connect(dr).connect(c.choDry.gain); }
  }
  // the recorded changes, each at its moment (its block's suspend; the glides start at the exact time)
  const work = new Map();
  for (const e of C.ev) { const b = Math.floor(e[0] * SR / 128); if (b * 128 >= n) continue; if (!work.has(b)) work.set(b, []); work.get(b).push(e); }
  for (const [b, list] of work) ctx.suspend(b * 128 / SR).then(() => {
    for (const e of list) { C.ids.forEach((id, i) => { P[id] = e[1][i]; }); Q.os = e[2]; A.lite = !!e[3]; HXW.t = e[0]; try { all(); } finally { HXW.t = null; } }
    ctx.resume();
  });
  const b = ctx.createBuffer(2, n, SR); b.getChannelData(0).set(d.L); b.getChannelData(1).set(d.R);
  const src = ctx.createBufferSource(); src.buffer = b; src.connect(c.in); c.out.connect(ctx.destination); src.start(0);
  const t0 = performance.now(), buf = await ctx.startRendering(), ms = performance.now() - t0;
  Q = keepQ; A.chains = [];
  const L = buf.getChannelData(0).slice(), R = buf.getChannelData(1).slice();
  return { L, R, dur: n / SR, rms: ms, tr: [L.buffer, R.buffer], nan: hxwScrub(L, R) || undefined };
}

