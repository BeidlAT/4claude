// ---- Mikro-Schleifen (SPEC §15): the microphone – only when the player switches it on (in the card), with its own sign
// in the Ringleiste while it is open – into the processor's fourth ring (its chunks made at the first switch-on), mono
// on both sides, echo cancellation, noise suppression and automatic gain off. Nothing of it is heard: it only records.
// The round trip (out of the speaker, into the microphone) is measured with clicks the microphone hears (the
// „Klopf mit“ precedent; a DelayNode loopback in the tests) and read off the ring: what is sung to the loops sits where
// it was meant. With Bluetooth headphones (output latency over 80 ms) an overdub with the microphone is refused – they
// make it impossible (KONZEPT §11). The Korb and the Hauptknopf take the Mikro while „Korb: Mikro“ is chosen. ----
HX.mic = { on: false, ring: false, rt: 0, rtM: false, korb: true, stream: null, src: null, g: null, test: null };
const hxMicRt = () => (HX.mic && HX.mic.rt) || 0;
const hxInp = () => (HX.mic.on && HX.mic.korb ? 3 : 0);
const hxBlue = () => !!(A.ctx && (A.ctx.outputLatency || 0) > 0.08);
function hxMicOk(overdub) {
  if (overdub && hxInp() === 3 && hxBlue()) { toast('Bluetooth-Kopfhörer: Myzel klingt ' + Math.round((A.ctx.outputLatency || 0) * 1000) + ' ms zu spät – Überspielen mit dem Mikrofon geht so nicht. Mit Kabel oder Lautsprecher geht es.', 6000); hxSay('Überspielen mit dem Mikrofon geht mit Bluetooth nicht'); return false; }
  return true;
}
// on (a user gesture – the card's button; o.src: a node in its place, for the tests' loopback)
async function hxMicOn(o = {}) {
  if (!A.ctx || !HX.node || HX.mic.on || HX.mic.starting) return false;
  HX.mic.starting = true;
  try {
    let src = o.src || null, stream = null;
    if (!src) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Hier gibt es keinen Zugriff auf das Mikrofon.', 4000); return false; }
      try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      src = A.ctx.createMediaStreamSource(stream);
    }
    if (!HX.node) { if (stream) for (const t of stream.getTracks()) t.stop(); return false; }
    if (!HX.mic.ring) {   // the ring's chunks, made once (the Humus's length) and moved over
      const n = Math.ceil((P['hx.humus'] * SR) / HX_CH), pool = [], tr = [];
      for (let i = 0; i < n; i++) { const a = new Float32Array(HX_CH), b = new Float32Array(HX_CH); pool.push([a, b]); tr.push(a.buffer, b.buffer); }
      HX.node.port.postMessage({ pool, ring: 3 }, tr); HX.mic.ring = true; HX.mic.ringN = n;
    }
    const g = G(1); g.channelCount = 2; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers';
    src.connect(g); g.connect(HX.node, 0, 3);
    Object.assign(HX.mic, { on: true, stream, src, g, test: o.src || null });
    const d = hxDev().mrt; if (d && d.dev === hxOutDev()) { HX.mic.rt = d.rt; HX.mic.rtM = true; } else if (!HX.mic.rtM) { HX.mic.rt = Math.round(((A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0) + 0.01) * SR); }   // (not measured on this output yet: what the browser says, plus the input's ≈ 10 ms)
    hxPost({ mic: { on: 1 } }); hxMicTagSync();
    hxSay('Mikrofon an'); toast('Mikrofon an: Der Hexenring nimmt es in den Humus auf – zu hören ist es nicht. „Mikro“ in der Ringleiste zeigt es.', 5000);
    if (hxBlue()) toast('Bluetooth-Kopfhörer: Überspielen mit dem Mikrofon geht so nicht (Verzögerung ' + Math.round(A.ctx.outputLatency * 1000) + ' ms). Neue Mikro-Schleifen gehen.', 6000);
    hxRailDirty(); hxCardDirty();
    return true;
  } catch (e) {
    console.warn(e);
    toast(e && e.name === 'NotAllowedError' ? 'Der Zugriff auf das Mikrofon wurde abgelehnt.' : 'Das Mikrofon lässt sich nicht öffnen.', 5000);
    return false;
  } finally { HX.mic.starting = false; }
}
function hxMicOff() {
  const M = HX.mic; if (!M.on) return;
  if (M.stream) for (const t of M.stream.getTracks()) t.stop();
  try { if (M.g) M.g.disconnect(); if (M.src && !M.test) M.src.disconnect(); else if (M.src) M.src.disconnect(M.g); } catch (e) {}
  Object.assign(M, { on: false, stream: null, src: null, g: null, test: null });
  try { if (navigator.audioSession && navigator.audioSession.type === 'play-and-record' && !MIC.on) navigator.audioSession.type = 'playback'; } catch (e) {}
  hxPost({ mic: { on: 0 } }); hxMicTagSync();
  hxSay('Mikrofon aus'); hxRailDirty(); hxCardDirty();
}
const hxOutDev = () => (A.ctx && A.ctx.sinkId) || 'standard';
// the round trip: eight clicks, each found in the Mikro's ring by its own shape (a matched filter around where it can be);
// the median of their delays (at least five must agree within 2 ms)
async function hxMicMessen() {
  if (!HX.mic.on || !A.ctx) return null;
  HX.mic.mess = true; hxCardDirty();
  const t0 = A.ctx.currentTime + 0.3, gap = 0.45, n = 8, ts = [];
  for (let i = 0; i < n; i++) { const t = t0 + i * gap; ts.push(t); hxClickAt(t, true); }
  await new Promise((r) => setTimeout(r, (t0 + n * gap + 0.6 - A.ctx.currentTime) * 1000));
  const g = await hxGrab({ in: 3, t0: ts[0] - 0.05, t1: ts[n - 1] + gap, pre: 0, post: 0, tail: 0 });
  HX.mic.mess = false;
  if (!g) { hxCardDirty(); return null; }
  const at = (i) => { const c = g.chunks[Math.floor(i / HX_CH)]; return c ? c[0][i % HX_CH] : 0; };
  // the click's own shape (2093 Hz, its attack and decay) as the filter
  const K = Math.round(0.03 * SR), tpl = new Float32Array(K); let te = 0;
  for (let i = 0; i < K; i++) { const t = i / SR, e = t < 0.0015 ? t / 0.0015 : Math.exp(-(t - 0.0015) / 0.012); tpl[i] = e * Math.sin(2 * Math.PI * 2093 * t); te += tpl[i] * tpl[i]; }
  const ds = [];
  for (const t of ts) {
    const c0 = Math.round(hxF(t)) - g.f0, lo = c0, hi = c0 + Math.round(0.4 * SR);
    let best = -1, bv = 0, en = 0;
    for (let s = lo; s < hi; s++) { let q = 0; for (let i = 0; i < K; i += 1) q += at(s + i) * tpl[i]; if (q > bv) { bv = q; best = s; } }
    for (let i = 0; i < K; i++) en += at(best + i) * at(best + i);
    if (best >= 0 && bv > 0.3 * Math.sqrt(en * te)) ds.push(best - c0);
  }
  ds.sort((a, b) => a - b);
  const med = ds.length ? ds[ds.length >> 1] : null, agree = ds.filter((d) => med != null && Math.abs(d - med) <= 0.002 * SR).length;
  if (med == null || agree < 5) { toast('Die Klicks waren im Mikrofon nicht deutlich zu hören – lauter stellen und noch einmal (mit Kopfhörern geht es nicht).', 5000); hxCardDirty(); return null; }
  HX.mic.rt = med; HX.mic.rtM = true; hxDev('mrt', { rt: med, dev: hxOutDev() });
  hxSay('Mikrofon: ' + Math.round((med / SR) * 1000) + ' Millisekunden'); hxCardDirty();
  return med;
}

