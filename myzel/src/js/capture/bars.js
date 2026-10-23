/* ---------- recording in bars: an exact number of 4/4 bars at the Puls tempo, ready to loop ---------- */
// The window [f0, f1) is counted in frames of the audio clock, which the tap reports with every block, so the file is
// exactly bars × 4 beats long and starts on the downbeat. The oversampled drive's delay (Standard latency) is added so
// the downbeat lands on sample 0. If nothing keeps sounding at the end, the tail is laid over the start: the loop
// then continues seamlessly instead of jumping from reverb into silence.
function barGrid() { const bpm = SEQ.on ? SEQ.bpm : seqBpm(); return { bpm, barF: 4 * 60 / bpm * SR }; }
// what the player hears now: the audio clock minus the output delay
const heardT = () => A.ctx.currentTime - (A.ctx.baseLatency || 0) - (A.ctx.outputLatency || 0);
const latF = () => Math.round(graphLatency() * SR);
// the downbeat a REC tap means on the Puls clock: the one just heard if the tap came a moment late and the ring still
// holds it, otherwise the next one
function nextDownbeat() {
  const heard = heardT(), prev = Math.floor(beatAt(heard) / 4 + 1e-9) * 4;
  const inRing = Math.round(timeAt(prev) * SR) + latF() >= CAP.ringF - CAP.fill;
  return heard - timeAt(prev) < 0.2 && inRing ? prev : prev + 4;
}
function barStart() {
  if (SEQ.on) beginBar(timeAt(nextDownbeat()), true);
  else if (P['rec.arm']) { CAP.state = 'armed'; CAP.hold = []; updRecUI(); }
  else beginBar(A.ctx.currentTime, false);
}
// grid: the window sits on the Puls's bar lines and may only move by whole bars
function beginBar(t0, grid) {
  const { bpm, barF } = barGrid(), bars = P['rec.bars'];
  let f0 = Math.round(t0 * SR) + latF();
  const total = Math.round(bars * barF), have = CAP.ringF - CAP.fill;
  if (f0 < have) f0 = grid ? f0 + Math.round(Math.ceil((have - f0) / barF - 1e-9) * barF) : have;
  CAP.bar = { f0, f1: f0 + total, total, barF, bars, bpm, grid, stopAt: 0 };
  // music already running before the window (the Puls, the drone, frozen echo) makes the loop seamless by itself
  CAP.rec = newRec({ bars, bpm: Math.round(bpm * 100) / 100, liveStart: !!(SEQ.on || A.bor || A.frozen || rgSounds()) });
  CAP.pkL = CAP.pkR = 0;
  CAP.hold = [];
  CAP.state = 'cue';
  if (f0 < CAP.ringF) barChunkFromRing(f0, Math.min(CAP.ringF, CAP.bar.f1));
  updRecUI();
}
// while a bar take waits for its downbeat nothing is kept yet: a new tempo, a different length or a (re)started Puls
// moves the window to the new grid
function barRecue() {
  if (CAP.state !== 'cue' || !CAP.bar || !A.ctx) return;
  const b = CAP.bar, { bpm, barF } = barGrid();
  const t0 = SEQ.on ? timeAt(Math.ceil(beatAt(A.ctx.currentTime) / 4 - 1e-9) * 4) : A.ctx.currentTime;
  b.f0 = Math.round(t0 * SR) + latF(); b.barF = barF; b.bpm = bpm; b.grid = SEQ.on;
  b.bars = P['rec.bars']; b.total = Math.round(b.bars * barF); b.f1 = b.f0 + b.total;
  CAP.rec.bars = b.bars; CAP.rec.bpm = Math.round(bpm * 100) / 100; CAP.rec.liveStart = !!(SEQ.on || A.bor || A.frozen || rgSounds());
}
function barChunkFromRing(fa, fz) {
  const n = CAP.ringL.length, len = fz - fa;
  if (len <= 0) return;
  const L = new Float32Array(len), R = new Float32Array(len);
  let k = ((CAP.pos - (CAP.ringF - fa)) % n + n) % n;
  for (let i = 0; i < len; i++) { L[i] = CAP.ringL[k]; R[i] = CAP.ringR[k]; if (++k === n) k = 0; }
  barChunk(L, R, fa, len, absPeak(L), absPeak(R));
}
function absPeak(a) { let p = 0; for (let i = 0; i < a.length; i++) { const x = a[i] < 0 ? -a[i] : a[i]; if (x > p) p = x; } return p; }
const TAIL_MAX_S = 8;
// keeps the part of a block that falls into the window (or the tail); returns true if the block itself was stored
function barChunk(l, r, f, len, pl, pr) {
  const b = CAP.bar, rec = CAP.rec;
  if (CAP.state === 'cue' || CAP.state === 'rec') {
    // the tap's first block can begin after the window's start (a tap just created): on the Puls grid wait for the next
    // bar line, otherwise begin with this block – the length stays the same either way
    if (CAP.state === 'cue' && f > b.f0) {
      b.f0 += b.grid ? Math.round(Math.ceil((f - b.f0) / b.barF - 1e-9) * b.barF) : f - b.f0;
      b.f1 = b.f0 + b.total;
    }
    // a gap in the tap's stream inside the window becomes silence, so the take keeps its exact length
    const exp = b.f0 + rec.frames;
    if (CAP.state === 'rec' && f > exp && exp < b.f1) { const g = Math.min(f, b.f1) - exp; pushRec(rec, new Float32Array(g), new Float32Array(g), 0, 0); }
    // (never take a frame twice, should a block overlap what is already kept)
    const a = Math.max(f, b.f0, CAP.state === 'rec' ? exp : -Infinity), z = Math.min(f + len, b.f1);
    let kept = false;
    if (z > a) {
      if (CAP.state === 'cue') {
        CAP.state = 'rec';
        idbDo('takes', 'readwrite', (st) => st.put(takeMeta(rec)));
        recRunning();
      }
      if (a === f && z === f + len) { pushRec(rec, l, r, pl, pr); kept = true; }
      else { const ls = l.slice(a - f, z - f), rs = r.slice(a - f, z - f); pushRec(rec, ls, rs, absPeak(ls), absPeak(rs)); }
    }
    if (f + len < b.f1 || CAP.state === 'cue') return kept;
    // the window is complete: hold the ring-out for the loop's start, or finish
    if (P['rec.tail'] && !b.noFold && !soundGoesOn()) {
      CAP.state = 'tail'; rec.tailL = []; rec.tailR = []; rec.tailFrames = 0; rec.quiet = 0;
      if (rec.segFrames) backupSegment(rec);   // the finished window is safe even if the page dies during the ring-out
      updRecUI();
      return f + len > b.f1 ? barChunk(l, r, f, len, pl, pr) || kept : kept;   // the rest of this block is tail
    }
    finishRec();
    return kept;
  }
  if (CAP.state === 'tail') {
    const e = b.f1 + rec.tailFrames;
    if (f > e) {   // a gap in the stream: silence, so the ring-out stays in place
      const g = Math.min(f - e, Math.round(SR * TAIL_MAX_S));
      barTail(new Float32Array(g), new Float32Array(g));
      if (CAP.state !== 'tail') return false;
    }
    const a = Math.max(f, b.f1 + rec.tailFrames);
    if (a < f + len) { const whole = a === f; barTail(whole ? l : l.slice(a - f), whole ? r : r.slice(a - f)); return whole; }
  }
  return false;
}
// the ring-out, up to 8 s (also longer than a short loop: folding wraps it around)
function barTail(l, r) {
  const rec = CAP.rec, room = Math.round(SR * TAIL_MAX_S) - rec.tailFrames;
  if (room <= 0) { rec.tailCapped = true; finishRec(); return; }
  if (l.length > room) { l = l.slice(0, room); r = r.slice(0, room); }
  rec.tailL.push(l); rec.tailR.push(r); rec.tailFrames += l.length;
  rec.quiet = Math.max(absPeak(l), absPeak(r)) < 0.002 ? rec.quiet + l.length : 0;   // done after 0.4 s below −54 dBFS
  if (rec.quiet >= SR * 0.4) finishRec();
  else if (rec.tailFrames >= SR * TAIL_MAX_S) { rec.tailCapped = true; finishRec(); }
}
// REC during a bar recording ends it with the bar the player is hearing; a second tap stops at once (then not a loop)
function barStop() {
  const b = CAP.bar;
  if (!b.stopAt) {
    const heardF = Math.round(heardT() * SR) + latF();
    const k = clamp(Math.max(Math.ceil((heardF - b.f0) / b.barF - 1e-9), Math.ceil(CAP.rec.frames / b.barF - 1e-9)), 1, b.bars);
    b.stopAt = k; b.f1 = b.f0 + Math.round(k * b.barF); b.total = b.f1 - b.f0;
    CAP.rec.bars = k;
    toast((k === b.bars ? 'Endet wie geplant nach ' + k + (k === 1 ? ' Takt.' : ' Takten.') : 'Endet mit Takt ' + k + '.') + ' Nochmal tippen beendet sofort.', 3000);
    updRecUI();
    return;
  }
  // immediately: the window ends with what has been rendered; collect what the tap still holds
  const nowF = Math.round(A.ctx.currentTime * SR) + latF();
  b.f1 = Math.max(b.f0 + 1, Math.min(b.f1, nowF)); b.total = b.f1 - b.f0; b.noFold = true;
  CAP.rec.bars = 0;
  if (CAP.mode === 'worklet') {
    CAP.flushWait = () => {};
    CAP.node.port.postMessage('flush');
  }
  setTimeout(() => { if (CAP.bar === b && CAP.state === 'rec') finishRec(); }, 400);
}
function barCancel() {
  if (CAP.rec) { forgetTake(CAP.rec); takeCounter = Math.max(0, takeCounter - 1); }
  CAP.rec = null; CAP.bar = null; CAP.state = 'idle';
  updRecUI();
  toast('Aufnahme abgebrochen.', 1800);
}
// adds the ring-out to the first samples of the take (in place, wrapping around a loop shorter than the ring-out) and
// rewrites the affected backup segments; a ring-out cut by the 8 s limit fades over 40 ms instead of stopping with a step
function foldTail(rec) {
  if (!rec.tailL || !rec.tailFrames || !rec.frames) return;
  if (rec.tailCapped) {
    let left = Math.min(rec.tailFrames, Math.round(SR * 0.04));
    const n = left;
    for (let t = rec.tailL.length - 1; t >= 0 && left > 0; t--) {
      const tl = rec.tailL[t], tr = rec.tailR[t];
      for (let i = tl.length - 1; i >= 0 && left > 0; i--, left--) { const g = (n - left) / n; tl[i] *= g; tr[i] *= g; }
    }
  }
  let ci = 0, co = 0, wrapped = false;
  for (let t = 0; t < rec.tailL.length; t++) {
    const tl = rec.tailL[t], tr = rec.tailR[t];
    for (let i = 0; i < tl.length; i++) {
      while (co >= rec.L[ci].length) { co = 0; if (++ci >= rec.L.length) { ci = 0; wrapped = true; } }
      rec.L[ci][co] += tl[i]; rec.R[ci][co] += tr[i];
      co++;
    }
  }
  const last = wrapped ? rec.L.length - 1 : ci;
  let pk = rec.peak;
  for (let c = 0; c <= last; c++) pk = Math.max(pk, absPeak(rec.L[c]), absPeak(rec.R[c]));
  rec.peak = pk;
  for (const [i, from, to] of rec.segs || []) if (from <= last) putSegment(rec, i, from, to);
  rec.tailL = rec.tailR = null;
  rec.folded = true;
}
function finishRec() {
  const r = CAP.rec;
  if (!r || CAP.finishing) return;
  CAP.finishing = true;
  CAP.state = 'idle';
  const bar = CAP.bar;
  const done = () => {
    CAP.finishing = false;
    CAP.rec = null; CAP.bar = null;
    r.done = true;
    let seamless = false;
    if (bar) {
      foldTail(r);
      if (r.bars) r.name += ' · ' + r.bars + (r.bars === 1 ? ' Takt' : ' Takte') + ' · ' + Math.round(r.bpm) + ' BPM';
      seamless = !!r.bars && (r.folded || (r.liveStart && soundGoesOn()));
      if (bar.stopAt && !bar.noFold) CAP.quietUntil = performance.now() + 600;   // the second tap the toast invited may come just late
    }
    const take = { id: r.id, name: r.name, sr: r.sr, L: r.L, R: r.R, frames: r.frames, peak: r.peak, date: r.date, patch: r.patch, comp: null, compExt: '', saved: false, done: true, bars: r.bars || 0, bpm: r.bpm || 0, seamless };
    stopCompressed(take);
    CAP.pkL = CAP.pkR = 0;
    updRecUI();
    if (r.frames < SR * 0.2) { forgetTake(r); toast('Die Aufnahme war kürzer als 0,2 Sekunden und wurde verworfen.'); return; }
    if (r.segFrames) backupSegment(r);
    idbDo('takes', 'readwrite', (st) => st.put(takeMeta(take)));
    takes.unshift(take);
    renderTakes();
    toast(take.bars ? 'Schleife fertig: ' + take.bars + (take.bars === 1 ? ' Takt' : ' Takte') + ' bei ' + Math.round(take.bpm) + ' BPM. Unter „Aufnahme“ anhören und speichern.' : 'Aufnahme fertig. Unter „Aufnahme“ kannst du sie anhören und speichern.');
  };
  // collect the samples still inside the worklet's block buffer (a bar recording already has its whole window)
  if (CAP.mode === 'worklet' && !bar) {
    const t = setTimeout(() => { if (CAP.flushWait) { CAP.flushWait = null; done(); } }, 300);
    CAP.flushWait = () => { clearTimeout(t); done(); };
    CAP.node.port.postMessage('flush');
  } else done();
  updRecUI();
}
function startCompressed() {
  CAP.mr = null;
  if (!P['rec.comp'] || !window.MediaRecorder) return;
  try {
    if (!A.mdest) { A.mdest = A.ctx.createMediaStreamDestination(); A.out.connect(A.mdest); }
    const types = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    const mime = types.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(A.mdest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 256000 } : undefined);
    const parts = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
    mr.start(1000);
    CAP.mr = { mr, parts, mime: mr.mimeType || mime };
  } catch (e) { CAP.mr = null; }
}
function stopCompressed(take) {
  const m = CAP.mr; CAP.mr = null;
  if (!m) return;
  m.mr.onstop = () => {
    const type = m.mime || 'audio/webm';
    take.comp = new Blob(m.parts, { type });
    take.compExt = /mp4/.test(type) ? 'mp4' : 'webm';
    renderTakes();
  };
  try { m.mr.stop(); } catch (e) {}
  try { A.out.disconnect(A.mdest); } catch (e) {}
  A.mdest = null;
}

