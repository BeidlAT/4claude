/* ---------- live microphone as grain material (8 s ring, refreshed while you play) ---------- */
const MIC = { on: false, starting: false, stream: null, src: null, node: null, ringL: null, ringR: null, pos: 0, fill: 0, cache: null };
async function micStart() {
  if (MIC.on || MIC.starting || !A.ctx) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Hier gibt es keinen Zugriff auf das Mikrofon.', 4000); return; }
  MIC.starting = true;
  const gen = (MIC.gen = (MIC.gen || 0) + 1);
  // iOS: the "playback" session (set at start against the silent switch) allows no input
  try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (gen !== MIC.gen || P['kor.src'] !== 'mikro') { for (const tr of stream.getTracks()) tr.stop(); micStop(); return; }   // switched away meanwhile
    MIC.stream = stream;
    if (!(await ensureCapture())) throw new Error('kein Abgriff');
    if (gen !== MIC.gen || P['kor.src'] !== 'mikro') { micStop(); return; }
    const n = Math.floor(SR * 8);
    MIC.ringL = new Float32Array(n); MIC.ringR = new Float32Array(n); MIC.pos = 0; MIC.fill = 0; MIC.cache = null;
    MIC.src = A.ctx.createMediaStreamSource(MIC.stream);
    if (CAP.mode === 'worklet') {
      MIC.node = new AudioWorkletNode(A.ctx, 'myzel-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
      MIC.node.port.onmessage = (e) => { micChunk(e.data.l, e.data.r); if (!e.data.flush && e.data.l.length === 2048) { try { MIC.node.port.postMessage({ back: [e.data.l, e.data.r] }, [e.data.l.buffer, e.data.r.buffer]); } catch (err) {} } };
    } else {
      MIC.node = A.ctx.createScriptProcessor(4096, 2, 2);
      MIC.node.onaudioprocess = (ev) => { const ib = ev.inputBuffer; micChunk(ib.getChannelData(0), ib.numberOfChannels > 1 ? ib.getChannelData(1) : ib.getChannelData(0)); };
    }
    MIC.src.connect(MIC.node);
    MIC.mute = G(0); MIC.node.connect(MIC.mute).connect(A.ctx.destination);
    MIC.on = true;
    toast('Mikrofon an: Die Körner greifen auf die letzten Sekunden zu. Mit Kopfhörern gibt es keine Rückkopplung.', 5500);
  } catch (e) {
    console.warn(e); micStop();
    toast(e && e.name === 'NotAllowedError' ? (inViewer ? 'In dieser Ansicht ist das Mikrofon gesperrt. In der App geht es: beidlat.github.io/4claude' : 'Der Zugriff auf das Mikrofon wurde abgelehnt.') : 'Das Mikrofon lässt sich nicht öffnen.', 5500);
  } finally {
    if (gen === MIC.gen) MIC.starting = false;
  }
  updUserTexUI();
}
function micStop() {
  MIC.gen = (MIC.gen || 0) + 1; MIC.starting = false;   // also cancels a request that is still open
  if (MIC.stream) for (const tr of MIC.stream.getTracks()) tr.stop();
  for (const n of [MIC.src, MIC.node, MIC.mute]) { try { if (n) n.disconnect(); } catch (e) {} }
  MIC.stream = MIC.src = MIC.node = MIC.mute = null; MIC.on = false; MIC.cache = null;
  try { if (navigator.audioSession && navigator.audioSession.type === 'play-and-record') navigator.audioSession.type = 'playback'; } catch (e) {}
}
function micChunk(l, r) {
  const n = MIC.ringL.length;
  for (let i = 0; i < l.length; i++) { MIC.ringL[MIC.pos] = l[i]; MIC.ringR[MIC.pos] = r[i]; if (++MIC.pos === n) MIC.pos = 0; }
  MIC.fill = Math.min(n, MIC.fill + l.length);
}
// the last seconds of the microphone, normalised; rebuilt at most every 0.6 s
function micSource() {
  if (!MIC.on) {
    if (!MIC.hinted) { MIC.hinted = true; toast('Mikrofon ist aus – unter „Klang → Körner“ auf „Mikrofon (live)“ tippen.', 4500); }
    return null;
  }
  const now = A.ctx.currentTime;
  if (MIC.cache && now - MIC.cache.at < 0.6) return MIC.cache;
  const fill = MIC.fill, n = MIC.ringL.length;
  if (fill < SR * 0.5) return MIC.cache;
  const buf = A.ctx.createBuffer(2, fill, SR), L = buf.getChannelData(0), R = buf.getChannelData(1);
  let k = (MIC.pos - fill + n) % n, pk = 0;
  for (let i = 0; i < fill; i++) { L[i] = MIC.ringL[k]; R[i] = MIC.ringR[k]; const x = Math.abs(L[i]); if (x > pk) pk = x; if (++k === n) k = 0; }
  if (pk < 0.003) return MIC.cache;   // silence: keep the last material
  const g = Math.min(40, 0.8 / pk);
  for (let i = 0; i < fill; i++) { L[i] *= g; R[i] *= g; }
  MIC.cache = { buf, rev: reversed(buf), ref: N.notes[Math.floor(N.notes.length / 2)].f, at: now };
  return MIC.cache;
}

// the material low-passed for a speed of up to 2^j (genLP, in the worker; until it is there the grain reads the material
// itself), kept with the source: its copy and the copy reversed
function korMip(k, j, rev) {
  const S = k.src || k; if (!S.buf) return null;
  const M = S.mip || (S.mip = []), e = M[j];
  if (e === undefined) {
    M[j] = null;
    const b = S.buf, c0 = b.getChannelData(0), c1 = b.getChannelData(Math.min(1, b.numberOfChannels - 1));
    const put = (r) => { if (!r || !A.ctx) return; const m = A.ctx.createBuffer(2, b.length, b.sampleRate); m.getChannelData(0).set(r[0]); m.getChannelData(1).set(r[1]); M[j] = { buf: m, rev: reversed(m) }; };
    // (the Werk-Rahmen renders exactly: the copy at once, so every render of a seed reads the same – live, in the worker)
    if (HXW.on) put(genLP(c0, c1, Math.pow(2, j)));
    else dspJob('lp', [c0.slice(), c1.slice(), Math.pow(2, j)]).then(put).catch(() => {});
  }
  const f = M[j];
  return f ? (rev ? f.rev : f.buf) : null;
}
const HANN = (() => { const n = 64, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.sin(Math.PI * i / (n - 1)) ** 2; return c; })();
// Q.grainMax counts grains already scheduled ahead, too; Q.overlap is the most grains sounding at once per finger
function spawnGrain(v, when) {
  const k = v.kor;
  if (A.grains >= Q.grainMax) return;
  const useRev = Math.random() < P['kor.rev'];
  const buf = useRev ? k.rev : k.buf;
  let rate = (k.f / k.ref) * Math.pow(2, (gauss() * P['kor.pjit'] + (v.bend ? (v.bend.node ? v.bend.cents : A.bendCents || 0) : 0)) / 1200);
  if (Math.random() < P['kor.oct']) rate *= pick([0.5, 2]);
  rate = clamp(rate, 0.0625, 16);
  const mip = rate > 1.02 ? korMip(k, Math.min(4, Math.ceil(Math.log2(rate) - 1e-9)), useRev) : null;   // (29.10.2026: faster – its low-passed copy, once made)
  const dur = buf.duration;
  const size = Math.min(P['kor.size'] * rand(0.8, 1.2), (dur / rate) * 0.9);
  const span = size * rate;
  const scat = MOD.t.korS.s.size ? clamp(P['kor.scat'] + 0.5 * modVal('korS', when), 0, 1) : P['kor.scat'];   // Formen · Körner-Streuung
  let pos = k.y * dur + (Math.random() * 2 - 1) * scat * dur * 0.5;
  if (useRev) pos = dur - pos;
  pos = clamp(pos, 0, Math.max(0, dur - span - 0.001));
  const src = A.ctx.createBufferSource(); src.buffer = mip || buf; src.playbackRate.value = rate;
  const g = A.ctx.createGain(); g.gain.value = 0;
  const overlap = Math.max(1, P['kor.dens'] * Q.korDens * (MOD.t.korD.s.size ? modKorD(when) : 1) * P['kor.size']);
  const amp = 0.9 / Math.sqrt(Math.min(overlap, Q.overlap));
  if (!A.hann || A.hann.amp !== amp) {   // the envelope curve is copied by the browser, so one array can be reused
    const curve = new Float32Array(HANN.length);
    for (let i = 0; i < curve.length; i++) curve[i] = HANN[i] * amp;
    A.hann = { amp, curve };
  }
  try { g.gain.setValueCurveAtTime(A.hann.curve, when, size); } catch (e) { g.gain.setValueAtTime(amp, when); }
  src.connect(g).connect(pick(k.pans));
  src.start(when, pos);
  src.stop(when + size + 0.02);
  A.grains++;
  let ended = false;
  src.onended = () => {
    if (ended) return;   // Chromium may fire onended twice for a source that runs out exactly at its stop time
    ended = true;
    A.grains--;
    try { src.disconnect(); g.disconnect(); } catch (e) {}
  };
}

