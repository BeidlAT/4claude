/* ---------- record state machine ---------- */
const takes = [];
let takeCounter = 0;
function recToggle() {
  if (!A.started || CAP.finishing) return;
  if (CAP.state === 'idle' && performance.now() < (CAP.quietUntil || 0)) return;
  if (!CAP.node) {
    if (!CAP.pending) toast('Aufnahme wird vorbereitet …', 1500);
    // a new tap needs a few blocks before its stream runs without gaps
    ensureCapture().then(async (ok) => {
      const t0 = performance.now();
      while (ok && (CAP.chunks || 0) < 3 && performance.now() - t0 < 1500) await new Promise((r) => setTimeout(r, 20));
      if (ok && CAP.state === 'idle') recStart();
    });
    return;
  }
  if (CAP.state === 'idle') recStart();
  else if (CAP.state === 'armed') { CAP.state = 'idle'; CAP.hold = []; updRecUI(); }
  else if (CAP.state === 'cue') barCancel();
  else if (CAP.state === 'rec') recStop();
  else if (CAP.state === 'tail') finishRec();
}
function recStart() {
  ensureRunning();
  if (P['rec.len'] === 'bars') { barStart(); return; }
  if (P['rec.arm']) { CAP.state = 'armed'; CAP.hold = []; updRecUI(); return; }
  beginRec([]);
}
// called for every note the player or the Puls starts (t: when it sounds); an armed recorder begins here – a free one
// with ~130 ms of pre-roll, one in bars on the note itself or, while the Puls runs, on the downbeat of its bar
function noteEvent(t) {
  if (CAP.state !== 'armed') return;
  if (P['rec.len'] !== 'bars') { beginRec(CAP.hold); return; }
  CAP.hold = [];
  const at = t != null ? t : A.ctx.currentTime;
  beginBar(SEQ.on ? timeAt(Math.floor(beatAt(at) / 4 + 1e-6) * 4) : at, SEQ.on);
}
function newRec(extra) {
  return Object.assign({ id: Date.now(), name: 'Aufnahme ' + (++takeCounter), sr: SR, L: [], R: [], frames: 0, peak: 0, date: new Date(), patch: patchValues(),
    segIdx: 0, segChunk: 0, segFrames: 0, tailFrames: 0, quiet: 0, done: false }, extra);
}
function beginRec(pre) {
  CAP.rec = newRec();
  CAP.state = 'rec';
  CAP.pkL = CAP.pkR = 0;
  for (const [l, r] of pre) pushRec(CAP.rec, l, r, 0, 0);
  CAP.hold = [];
  idbDo('takes', 'readwrite', (st) => st.put(takeMeta(CAP.rec)));
  recRunning();
}
// MediaRecorder copy and screen wake lock, once samples are really being kept
function recRunning() {
  startCompressed();
  keepAwake().then((ok) => {
    if (!ok && !A.wakeHinted) { A.wakeHinted = true; toast('Hinweis: Diese Ansicht kann die Bildschirmsperre nicht verhindern. Für lange Aufnahmen die automatische Sperre in den Geräte-Einstellungen verlängern.', 7000); }
  });
  updRecUI();
}
// (Sporenregen goes on raining from its Keime for bars after the last note – sound that goes on, like the Puls)
const rgSounds = () => RG.on && RG.k.length > 0;
const soundGoesOn = () => SEQ.on || A.bor || A.frozen || touches.size > 0 || rgSounds();
function recStop() {
  if (CAP.bar) { barStop(); return; }
  if (P['rec.tail'] && !soundGoesOn()) { CAP.state = 'tail'; CAP.rec.quiet = 0; CAP.rec.tailFrames = 0; updRecUI(); return; }
  finishRec();
}

