// The module: the processors above plus the recording tap (registered only if tap-worklet.js did not already – a name
// registered twice throws, and an exception in a module fails the whole addModule).
const MYZEL_DSP_SRC = '(' + myzelDsp + ')();\ntry {\n' + TAP_SRC + '\n} catch (e) {}\n';
// Loading (klang SPEC §2.1; Hexenring SPEC §3): the module is added to the live context at sound start, because the
// Hexenring's Humus records from the first note (owner, 18.10.2026) – before, only once a worklet engine was chosen.
// As soon as an AudioWorklet exists, Chrome in a frame and Safari render the whole graph on the worklet thread: every
// session now does (the target devices carry it). Offline contexts (tests, calibrate) load their
// own copy: await ensureDSP(ctx) before rendering. Without AudioWorklet (old WebViews, blocked blob: URLs) a worklet
// engine plays its stand-in (ENGINES[k].fallback) and keeps its key in the patch.
// DSP.state for the UI: '' not asked yet · 'laden' loading · 'ok' · 'kein' this browser cannot (stand-ins play).
const DSP = { state: '', toldFrame: false };
const WORKLET_ENGINES = new Set(['hrz', 'hlm', 'glt', 'boe', 'amo', 'rnk', 'shn', 'zpf', 'mdr', 'gsp', 'khl']);
A.workletOK = false; A.workletBroken = new Set();
function dspWanted() {
  const g = GK.p ? [GK.p.rgS, GK.p.rasS] : [];
  return [P['v.eng'], P['v.layer'], P['l0.eng'], P['l1.eng'], P['l2.eng'], P['l3.eng'], ...g].some((k) => WORKLET_ENGINES.has(k));
}
function ensureDSP(ctx = A.ctx, quiet) {   // idempotent per context; resolves true when the processors are registered
  if (!ctx) return Promise.resolve(false);
  // (quiet: the Hexenring's load at sound start – a browser without AudioWorklet says so when a source needs it)
  if (ctx.__dsp) { if (!quiet && DSP.owe && ctx === A.ctx) { DSP.owe = false; ctx.__dsp.then((ok) => { if (!ok) toast('Dieser Browser spielt die neuen Quellen vereinfacht (kein AudioWorklet).', 6000); }); } return ctx.__dsp; }
  const live = ctx === A.ctx && !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);
  if (!ctx.audioWorklet || !window.AudioWorkletNode) {
    ctx.__dsp = Promise.resolve(false);
    if (live) { A.workletOK = false; dspState('kein'); if (quiet) DSP.owe = true; else toast('Dieser Browser spielt die neuen Quellen vereinfacht (kein AudioWorklet).', 6000); }
    return ctx.__dsp;
  }
  if (live) dspState('laden');
  ctx.__dsp = (async () => {
    // the Blob first: no sibling file ships (one would have to be rebuilt with every change of the source above, and
    // a stale one would win); a sibling myzel-dsp.js is only the way out where a CSP forbids blob: (the tap's order is
    // the other way round – its file exists)
    const urls = [];
    // (Leistung, 23.10.2026: one Blob for every context of this page – the Werk-Rahmen loads the module into each render's
    // context, and a Blob per render stayed in the browser's blob storage for the frame's life)
    try { urls.push(DSP.url || (DSP.url = URL.createObjectURL(new Blob([MYZEL_DSP_SRC], { type: 'text/javascript' })))); } catch (e) {}
    try { urls.push(new URL('myzel-dsp.js', document.baseURI).href); } catch (e) {}
    for (const u of urls) {
      try { await ctx.audioWorklet.addModule(u); } catch (e) { continue; }
      ctx.__dspOK = true;
      if (ctx === A.ctx) { A.workletOK = true; if (live) dspState('ok'); }
      return true;
    }
    if (ctx === A.ctx) { A.workletOK = false; if (live) { dspState('kein'); if (quiet) DSP.owe = true; else toast('Dieser Browser spielt die neuen Quellen vereinfacht (kein AudioWorklet).', 6000); } }
    return false;
  })();
  // Chrome in a frame renders a worklet graph on a thread of lower priority: say once where it plays best
  if (live && !DSP.toldFrame) { DSP.toldFrame = true; let framed = false; try { framed = window.top !== window; } catch (e) { framed = true; } if (framed) toast('Im eigenen Tab öffnen – dort läuft der Klang auf dem Echtzeit-Thread.', 6000); }
  return ctx.__dsp;
}
function dspState(s) { DSP.state = s; wkUiSync(); if (MX.root) mxSrcAll(); kqSyncAll(); }
// the engine sections say when this browser plays a stand-in (the library UI shows „⌁ spielt als …“ itself)
function wkUiSync() {
  for (const k of WORKLET_ENGINES) {
    const s = engSecs[k]; if (!s || !s.wkNote) continue;
    const fb = DSP.state === 'kein' || A.workletBroken.has(k);
    s.wkNote.hidden = !fb;
    if (fb) s.wkNote.textContent = '⌁ Dieser Browser spielt ' + ENG_NAME[k] + ' vereinfacht' + (ENGINES[k].fallback === 'native' ? '' : ' als ' + ENG_NAME[ENGINES[k].fallback]) + ' (kein AudioWorklet).';
  }
}
const dspMaybe = () => { if (A.ctx && dspWanted()) ensureDSP(); };
// the engine a key really plays now: itself, or its stand-in while the module is missing (or still loading). A source
// with a native stand-in of its own (fallback 'native': Zapfen, SPEC §0.4) plays itself either way – its start() asks
// wkReady() which of its two it builds
function wkReady(k) { return !!(A.ctx && A.ctx.__dspOK && !A.workletBroken.has(k)); }
function wkPlays(k) {
  const E = ENGINES[k];
  if (!E || E.needs !== 'worklet') return k;
  return wkReady(k) || E.fallback === 'native' ? k : E.fallback;
}
// for texts: "Halm", or "Halm (als Hauch)" when this browser cannot play it
const engLabel = (k) => (ENGINES[k] && ENGINES[k].needs === 'worklet' && ENGINES[k].fallback !== 'native' && (DSP.state === 'kein' || A.workletBroken.has(k)) ? ENG_NAME[k] + ' (als ' + ENG_NAME[ENGINES[k].fallback] + ')' : ENG_NAME[k]);
// a worklet voice: one AudioWorkletNode, k-rate freq/detune/hoehe (detune on the voice's pitch bus: vibrato, drift,
// Bebung, wheel, a finger's bend); the processor posts {done} when it fell silent after its end – the voice is then
// freed at once. A processor that throws marks the engine broken for the session (it plays its stand-in from then on).
function wkVoice(v, proc, f, y, po) {
  const node = v.n(new AudioWorkletNode(A.ctx, proc, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [Q.rich ? 2 : 1], processorOptions: Object.assign({ rich: !!Q.rich, lite: A.lite ? 1 : 0 }, po) }));
  const pf = node.parameters.get('freq'), py = node.parameters.get('hoehe');
  pf.value = clamp(f, 16, 8000); py.value = clamp(y, 0, 1);
  v.mod(node.parameters.get('detune'));
  node.connect(v.out);
  v.wk = node;
  node.port.onmessage = (e) => { if (e.data && e.data.done && v.alive && v.released) v.finish(Math.min(v.endAt, A.ctx.currentTime + 0.03)); };
  node.onprocessorerror = () => { A.workletBroken.add(v.eng); console.warn('Klangquelle ' + v.eng + ': Prozessorfehler'); if (v.alive) v.cleanup(); dspState(DSP.state); };
  v.setF = (nf, glide) => glideTo(pf, clamp(nf, 16, 8000), glide);
  v.setY = (ny) => setP(py, clamp(ny, 0, 1), 0.04);
  return node;
}
// the engine's own parameters for its processor (live changes follow through {set})
const WK_IDS = {};
function wkPrm(k) {
  const ids = WK_IDS[k] || (WK_IDS[k] = Object.keys(PD).filter((id) => id.startsWith(k + '.')));
  const o = {}; for (const id of ids) o[id.slice(k.length + 1)] = P[id];
  return o;
}
const wkSeed = () => ((Math.random() * 2147483647) | 0) || 1;

