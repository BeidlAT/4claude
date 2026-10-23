/* ---------- Messen: rate, sign, the turning angle, Klopf-Messung, Spur aufnehmen ---------- */
// The sign of the acceleration, as the recogniser knows it: checked against deviceorientation's beta/gamma (their
// sign never flips – compared in the device's own axes, before the screen's turn), remembered from an earlier check
// on this device, or – without deviceorientation – the spec's, turned only by long play in the mirrored pose.
function gkSignText() {
  const st = GK.R && GK.R.st;
  if (!st || !st.u) return '–';
  const k = st.signK, how = k === 'ori' ? 'an der Lage geprüft' : k === 'stored' ? 'auf diesem Gerät früher geprüft' : k === 'pose' ? 'aus der Haltung geschätzt' : 'angenommen – noch nicht geprüft';
  return (st.sign > 0 ? 'normal' : 'gespiegelt') + ' (' + how + ')' + (st.sign > 0 ? '' : ' – Myzel gleicht das aus');
}
// Klopf-Messung: the phone lies on the table, you knock beside it 8 times. The microphone hears each knock, the
// accelerometer feels it a little later: that difference, plus the microphone's own delay and the output's, is how
// long a movement takes to become sound on this device. Stored for this device (the Fährte shifts by it).
async function gkKlopf() {
  if (GK.kl) { gkKlopfStop(); return; }
  if (GK.rem) { toast('Die Klopf-Messung macht das Handy selbst – ihr Wert kommt über die Funkstrecke mit.', 4000); return; }
  if (!A.ctx) { toast('Erst den Klang starten.', 3000); return; }
  if (!GK.live) { toast('Die Klopf-Messung braucht den Bewegungssensor.', 3500); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Hier gibt es keinen Zugriff auf das Mikrofon.', 4000); return; }
  const K = (GK.kl = { mic: [], acc: [], d: [], buf: new Float32Array(2048), fl: 0.004, fa: 0.05, lastG: null, lastM: 0, lastA: 0, msg: 'Mikrofon wird geöffnet …' });
  gkCardSync();
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) {}
    K.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (GK.kl !== K) { for (const tr of K.stream.getTracks()) tr.stop(); return; }
    const set = K.stream.getAudioTracks()[0] && K.stream.getAudioTracks()[0].getSettings ? K.stream.getAudioTracks()[0].getSettings() : {};
    K.lin = (set.latency > 0 && set.latency < 0.5 ? set.latency : A.ctx.baseLatency || 0.01) * 1000;
    K.src = A.ctx.createMediaStreamSource(K.stream); K.an = A.ctx.createAnalyser(); K.an.fftSize = 2048;
    K.src.connect(K.an);
    K.iv = setInterval(gkKlopfMic, 20);
    K.end = setTimeout(() => { if (GK.kl === K) { K.msg = 'Abgebrochen – zu wenige Klopfer erkannt.'; gkKlopfStop(true); } }, 40000);
    K.msg = 'Leg das Handy auf den Tisch und klopf 8-mal kräftig daneben (0/8).';
  } catch (e) {
    K.msg = e && e.name === 'NotAllowedError' ? (inViewer ? 'In dieser Ansicht ist das Mikrofon gesperrt. In der App geht es: ' + APP_URL : 'Der Zugriff auf das Mikrofon wurde abgelehnt.') : 'Das Mikrofon lässt sich nicht öffnen.';
    gkKlopfStop(true);
  }
  gkCardSync();
}
// the microphone: the first sample over the threshold after a quiet stretch is the knock (in ms of the page's clock)
function gkKlopfMic() {
  const K = GK.kl;
  if (!K || !K.an) return;
  ctxSync();
  const b = K.buf, n = b.length, sr = A.ctx.sampleRate, endT = perfAt(A.ctx.currentTime);
  K.an.getFloatTimeDomainData(b);
  let pk = 0;
  for (let i = 0; i < n; i++) { const x = Math.abs(b[i]); if (x > pk) pk = x; }
  const thr = Math.max(0.05, 8 * K.fl);
  for (let i = 64; i < n; i++) {
    if (Math.abs(b[i]) < thr) continue;
    const t = endT - ((n - i) / sr) * 1000;
    if (t - K.lastM > 250) { K.lastM = t; K.mic.push(t); gkKlopfPair(); }
    break;
  }
  if (pk < thr) K.fl += 0.05 * (pk - K.fl);
}
// the accelerometer: a jump of the raw values well above their rest
function gkKlopfAcc(s) {
  const K = GK.kl;
  if (!K || !K.an) return;
  if (K.lastG) {
    const d = Math.hypot(s.g[0] - K.lastG[0], s.g[1] - K.lastG[1], s.g[2] - K.lastG[2]), thr = Math.max(0.25, 6 * K.fa);
    if (d > thr && s.t - K.lastA > 250) { K.lastA = s.t; K.acc.push(s.t); gkKlopfPair(); }
    else if (d < thr) K.fa += 0.02 * (d - K.fa);
  }
  K.lastG = s.g.slice();
}
function gkKlopfPair() {
  const K = GK.kl;
  for (const m of K.mic.slice()) {
    const a = K.acc.find((x) => x - m > -40 && x - m < 300);
    if (a == null) { if (performance.now() - m > 400) K.mic.splice(K.mic.indexOf(m), 1); continue; }
    K.d.push(a - m); K.mic.splice(K.mic.indexOf(m), 1); K.acc.splice(K.acc.indexOf(a), 1);
  }
  if (K.d.length >= 8) {
    const d = K.d.slice().sort((x, y) => x - y), med = (d[3] + d[4]) / 2, out = ((A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0) + graphLatency()) * 1000;
    const sens = Math.max(0, med + K.lin);
    GK.p.latS = Math.round(sens); GK.p.lat = Math.round(sens + out); gkSave();
    K.msg = 'Gemessen: ' + GK.p.lat + ' ms von der Bewegung bis zum Klang (Sensor ' + GK.p.latS + ' ms, Ausgabe ' + Math.round(out) + ' ms).';
    gkKlopfStop(true);
  } else K.msg = 'Leg das Handy auf den Tisch und klopf 8-mal kräftig daneben (' + K.d.length + '/8).';
  gkCardSync();
}
function gkKlopfStop(keepMsg) {
  const K = GK.kl;
  if (!K) return;
  clearInterval(K.iv); clearTimeout(K.end);
  if (K.stream) for (const tr of K.stream.getTracks()) tr.stop();
  for (const n of [K.src, K.an]) { try { if (n) n.disconnect(); } catch (e) {} }
  try { if (navigator.audioSession && navigator.audioSession.type === 'play-and-record' && !MIC.on) navigator.audioSession.type = 'playback'; } catch (e) {}
  GK.kl = null; GK.klMsg = keepMsg ? K.msg : '';
  gkCardSync();
}
// "Spur aufnehmen": 30 s of the raw samples as JSON – to save or share, so real traces can become test material
const GK_COLS = ['t', 'gx', 'gy', 'gz', 'ax', 'ay', 'az', 'ra', 'rb', 'rg', 'orient', 'lock'];
function gkRec() {
  if (GK.rec) { gkRecStop(true); return; }
  if (GK.rem) { toast('Spuren nimmt das Handy selbst auf.', 3000); return; }
  if (!GK.live) { toast('Die Spur braucht den Bewegungssensor.', 3500); return; }
  GK.rec = { t0: null, s: [], end: setTimeout(() => gkRecStop(true), 30000), at: performance.now() };
  gkCardSync();
}
function gkRecPush(s) {
  const R = GK.rec, r1 = (x) => Math.round(x * 1000) / 1000;
  if (R.t0 == null) R.t0 = s.t;
  R.s.push([Math.round((s.t - R.t0) * 10) / 10, ...(s.g || [null, null, null]).map(r1), ...(s.a || [null, null, null]).map((x) => (x == null ? null : r1(x))), ...(s.r || [null, null, null]).map((x) => (x == null ? null : r1(x))), s.orient || 0, s.lock ? 1 : 0]);
}
function gkRecStop(save) {
  const R = GK.rec;
  if (!R) return;
  clearTimeout(R.end); GK.rec = null;
  gkCardSync();
  if (!save || !R.s.length) return;
  const st = GK.R && GK.R.st;
  const o = { app: 'myzel', kind: 'gestik-spur', v: 1, made: new Date().toISOString(), rate: gkRateText(), gyro: !!(st && st.gyro), sign: st ? st.sign : 0, rot: GK.p.rot, lat: GK.p.lat, cols: GK_COLS, samples: R.s };
  if (st) o.signK = st.signK;
  offerFile('myzel-gestik-spur-' + stamp(new Date()) + '.json', new Blob([JSON.stringify(o)], { type: 'application/json' }));
}
// The test hook: feed samples ({ t, g, a, r, orient } – t defaults to now) or play a trace (a recorded "Spur" or a
// list of samples) in real time; resolves when it is through.
GK.feed = (s) => gkSample(Object.assign({ t: performance.now() }, s));
GK.play = (tr, speed = 1) => new Promise((done) => {
  const L = Array.isArray(tr) ? tr : tr && tr.samples ? tr.samples : [];
  const S = L.map((x) => (Array.isArray(x) ? { t: x[0], g: x.slice(1, 4), a: x[4] == null ? null : x.slice(4, 7), r: x[7] == null ? null : x.slice(7, 10), orient: x[10] || 0 } : x));
  if (!S.length) { done(0); return; }
  const t0 = performance.now(), s0 = S[0].t;
  let i = 0;
  const go = () => {
    const el = (performance.now() - t0) * speed;
    while (i < S.length && S[i].t - s0 <= el) { const s = S[i++]; gkSample(Object.assign({}, s, { t: t0 + (s.t - s0) / speed })); }
    if (i < S.length) setTimeout(go, 8); else done(i);
  };
  go();
});

