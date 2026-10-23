/* ---------- take preview: streamed in short blocks, no full copy ---------- */
let preview = null;
function stopPreview() {
  if (!preview) return;
  const p = preview; preview = null;
  for (const s of p.srcs) { try { s.stop(); } catch (e) {} }
  try { p.g.disconnect(); } catch (e) {}
  renderTakes();
}
async function playTake(tk) {
  if (preview && preview.id === tk.id) { stopPreview(); return; }
  stopPreview();
  ensureRunning();
  if (!(await ensureTakeData(tk))) { toast('Die Daten dieser Aufnahme sind nicht mehr vorhanden.'); return; }
  if (IDLE.on) idleWake();   // Hexenring (step 2b): a preview counts as sound (idleSrc)
  const g = A.ctx.createGain(); g.connect(A.ctx.destination);
  preview = { id: tk.id, tk, g, ci: 0, next: A.ctx.currentTime + 0.05, srcs: [] };
  renderTakes();
}
function previewTick(horizon) {
  const p = preview;
  if (!p) return;
  const tk = p.tk, now = A.ctx.currentTime;
  p.srcs = p.srcs.filter((s) => s.endT > now);
  if (tk.bars && p.ci >= tk.L.length) p.ci = 0;   // a take in bars plays as a loop until stopped
  while (p.next < horizon + 0.4 && p.ci < tk.L.length) {
    let n = 0, c = p.ci;
    while (c < tk.L.length && n < tk.sr * 0.5) n += tk.L[c++].length;
    const buf = A.ctx.createBuffer(2, n, tk.sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let o = 0; p.ci < c; p.ci++) { L.set(tk.L[p.ci], o); R.set(tk.R[p.ci], o); o += tk.L[p.ci].length; }
    const s = A.ctx.createBufferSource(); s.buffer = buf; s.connect(p.g);
    s.start(p.next); s.endT = p.next + buf.duration; p.next = s.endT;
    p.srcs.push(s);
    if (tk.bars && p.ci >= tk.L.length) p.ci = 0;
  }
  if (p.ci >= tk.L.length && now > p.next) stopPreview();
}

