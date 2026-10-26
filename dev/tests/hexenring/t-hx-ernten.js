// Hexenring – Ernten (SPEC §6.2, KONZEPT §2.3; tests §22): every row of the harvest table, the automatic length and
// the fixed ones, the precedence list, the Korb's labels and its light, and the corrections (Tempo ½ · ×2, Länge −1 · +1,
// Eins ← →, 3er, Runde davor) re-cut from the Humus without the music stopping, each undoable.   node t-hx-ernten.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const near = (a, b, e) => Math.abs(a - b) <= e;

  // ---- nothing in the Humus: nothing, a hint ----
  let r = await ev(async () => {
    const M = window.__M; await window.__reset(); await window.__sleep(400);
    const plan = M.hxKorbPlan(M.heardT()); M.hxKorb(null); await window.__sleep(300);
    M.hxRailState();
    return { kind: plan.kind, label: plan.label, loops: M.hxLoopsLive().length, toast: document.getElementById('toastMsg').textContent, word: M.HXU.korb.textContent };
  });
  ok(r.kind === 'leer' && r.loops === 0 && /nichts/.test(r.toast) && r.word === 'leer', `nothing in the Humus: the Korb says „${r.word}“, a tap makes nothing and says so („${r.toast}“)`);

  // ---- row 1: a Takt runs, the tap ≤ ⅛ bar after a bar line → N bars up to it, at once, in time ----
  r = await ev(async () => {
    const M = window.__M, A = M.A; await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4, t0 = M.tgTime(B0);
    const end = window.__riff(t0, 0.5, [0, 2, 4, 7], 2, { eng: 'mem' });   // a 1-bar figure twice after a rest (too short for a repetition: ≥ 5 events must match) → a 2-bar phrase up to E = B0 + 8
    if (!window.__recMod) { window.__recMod = 1; await A.ctx.audioWorklet.addModule(window.__testUrl); }
    await window.__until(end + 0.04 + (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0));
    const rec = new AudioWorkletNode(A.ctx, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), rz = A.ctx.createGain(); rz.gain.value = 0; M.HX.node.connect(rec, 0); M.HX.node.connect(rec, 1); rec.connect(rz).connect(A.ctx.destination);   // (both outputs: a new Schicht plays dry through the live chain – out 1 – until baked)
    await window.__until(end + 0.1 + (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0));
    const T = M.heardT(), plan = M.hxKorbPlan(T);
    M.hxRailState(); const word = M.HXU.korb.textContent, lit = M.HXU.korb.classList.contains('lit');
    // (when it sounds: the processor's output recorded frame by frame from before the tap – the meter's reports come every
    // 67 ms and summed the past 67, so their arrival said up to 80 ms later than the sound began)
    const tap = A.ctx.currentTime;
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    await window.__sleep(600);
    const rg = await window.__recGet(rec); M.HX.node.disconnect(rec, 0); M.HX.node.disconnect(rec, 1);
    let fi = -1; for (let i = 0; i < rg.L.length; i++) if (Math.abs(rg.L[i]) > 1e-4 || Math.abs(rg.R[i]) > 1e-4) { fi = i; break; }
    const on = fi >= 0 ? [M.hxT(rg.f0 + fi)] : null;
    await window.__sleep(7700);
    const ps = L.ps.map(([k, f]) => ({ k, dt: M.hxT(f) - M.tgTime(B0 + 8 + L.d.beats * k), exact: f === Math.round(M.hxFrameAt(L.d.b0 + k * L.d.beats)) }));
    // the Schicht's audio = the Humus's window, sample for sample (the copy arrives once its Ausklang is in)
    const S = M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 80 && !S.aud; i++) await window.__sleep(100);
    let same = null;
    if (S.aud) { const g = await M.hxGrab({ in: 0, f0: S.cut.f0, f1: S.cut.f0 + S.n }); same = 0; for (let i = 0; i < S.n; i++) { const a = S.aud[Math.floor(i / 8192)], b = g.chunks[Math.floor(i / 8192)], j = i % 8192; if (a[0][j] !== b[0][j] || a[1][j] !== b[1][j]) same++; } }
    return { kind: plan.kind, now: plan.entry.now, w1: plan.w1 - t0, bars: plan.bars, label: plan.label, word, lit, b0: L.d.b0 - M.TG.o - B0, beats: L.d.beats, onAfter: on ? on[0] - tap : null, ps, same, n: S.n, join: S.join, cut: S.cut.w1 - S.cut.w0 };
  });
  ok(r.kind === 'grid' && r.now && near(r.w1, 4, 1e-6) && r.bars === 2 && r.label === '2 T' && r.word === '2 T', `Takt running, tap 100 ms after the bar line: ${r.bars} bars up to that bar line (the phrase from its start after the rest), at once; the Korb said „${r.word}“`);
  ok(near(r.b0, 8, 1e-6) && r.beats === 8 && r.onAfter != null && r.onAfter < 0.12, `  the Schleife's pass 0 is that bar line, it sounds ${r.onAfter != null ? Math.round(r.onAfter * 1000) : '—'} ms after the tap (phase-correct, mid-pass)`);
  ok(r.ps.length >= 2 && r.ps.every((p) => p.exact && Math.abs(p.dt) < 0.0011), `  its passes start on the bar lines (${r.ps.map((p) => (p.dt * 1000).toFixed(2)).join(', ')} ms; the processor's frames as computed here)`);
  ok(r.same === 0, `  its audio is the Humus's window, sample for sample (${r.n} frames, ${r.same} differ; seam ${r.join})`);

  // ---- row 2: a tap later in the bar → up to the next bar line, which it waits for („ab Takt N“); ↶ cancels ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0); await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4, t0 = M.tgTime(B0);
    window.__riff(t0, 0.5, [0, 4, 2, 5, 4, 7, 9, 7], 2, { eng: 'mem' });   // a 2-bar phrase, twice → its end E = B0 + 16
    const E = M.tgTime(B0 + 16);
    await window.__until(E - 1.0 + lat);
    const plan = M.hxKorbPlan(M.heardT());
    M.hxKorb(null); M.hxRailState();
    const o = { kind: plan.kind, now: plan.entry.now, eb: plan.entry.b - B0, bars: plan.bars, word: M.HXU.korb.textContent, want: 'ab Takt ' + (Math.floor((B0 + 16) / 4) + 1), pend: M.HX.pend.length, rep: plan.rep && [plan.rep.p, plan.rep.m, !!plan.rep.start] };
    M.hxUndoStep();
    o.afterUndo = { loops: M.hxLoopsLive().length, hist: M.HX.hist.length, pend: M.HX.pend.length };
    await window.__until(E - 0.8 + lat);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    const met = await window.__meter(L.id, 1400);
    o.before = Math.max(...met.filter((m) => m[0] < E - 0.03).map((m) => m[1]), 0);
    const on = met.find((m) => m[1] > 1e-4); o.on = on ? on[0] - E : null;
    await window.__sleep(200);
    o.k0 = L.ps.length ? [L.ps[0][0], M.hxT(L.ps[0][1]) - E] : null;
    return o;
  });
  ok(r.kind === 'grid' && !r.now && r.eb === 16 && r.bars === 2 && r.word === r.want && r.pend === 1, `tap in the middle of the bar: ${r.bars} bars (the phrase, repeating from its start: ${JSON.stringify(r.rep)}) up to the next bar line, waiting – the Korb says „${r.word}“`);
  ok(r.afterUndo.loops === 0 && r.afterUndo.hist === 0 && r.afterUndo.pend === 0, '  ↶ cancels the waiting harvest (no Schleife, nothing in the history)');
  ok(r.before < 1e-5 && r.on != null && r.on > -0.03 && r.on < 0.09 && r.k0 && r.k0[0] === 0 && Math.abs(r.k0[1]) < 0.0011, `  tapped again: silent until the bar line, then from its start there (sounds ${r.on != null ? Math.round(r.on * 1000) : '—'} ms after it, pass 0 at ${r.k0 ? (r.k0[1] * 1000).toFixed(2) : '—'} ms)`);

  // ---- row 3: no Takt, a repetition → the running cycle, entering at the seam where it ends; it sets the Takt ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0); await window.__reset(); await window.__sleep(1500);
    const t0 = A.ctx.currentTime + 0.3;
    const end = window.__riff(t0, 0.5, [0, 4, 2, 5, 4, 7, 2, 0], 3, { eng: 'mem' });   // 8 quarters at 120 BPM (4 s), three times
    await window.__until(t0 + 9.6 + lat);
    const plan = M.hxKorbPlan(M.heardT());
    M.hxRailState();
    const o = { kind: plan.kind, label: plan.label, lit: M.HXU.korb.classList.contains('lit'), word: M.HXU.korb.textContent, seam: plan.entry.t - end, w: plan.w1 - plan.w0, grid0: M.hxGrid() };
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    o.tg = { on: M.TG.hxOn, bpm: M.TG.hx };
    const met = await window.__meter(L.id, 3200);
    o.before = Math.max(...met.filter((m) => m[0] < end - 0.03).map((m) => m[1]), 0);
    const on = met.find((m) => m[1] > 1e-4); o.on = on ? on[0] - end : null;
    o.bar = ((M.tgBeat(end) % 4) + 4) % 4;
    o.lock = L.d.lock; o.beats = L.d.beats; o.notes = L.notes.length; o.grid = M.hxGrid();
    return o;
  });
  ok(r.kind === 'rep' && r.label === '2 T · 120' && r.word === r.label && r.lit && !r.grid0, `no Takt, a figure played three times: the Korb lights and says „${r.word}“ (repetition, Takt found)`);
  ok(near(r.seam, 0, 0.03) && near(r.w, 4, 0.03), `  it takes the running cycle (${r.w.toFixed(3)} s) and enters where it ends (${(r.seam * 1000).toFixed(1)} ms from the figure's end)`);
  ok(r.before < 1e-5 && r.on != null && r.on < 0.09, `  silent until that seam, then it plays on seamlessly (${r.on != null ? Math.round(r.on * 1000) : '—'} ms)`);
  ok(r.tg.on && near(r.tg.bpm, 120, 1) && r.grid && r.lock === 'takt' && r.beats === 8 && (r.bar < 0.01 || r.bar > 3.99) && r.notes === 8, `  the first Schleife sets the Takt: ${r.tg.bpm.toFixed(2)} BPM, 8 beats, a bar line at its seam (beat ${r.bar.toFixed(3)} of the bar), its 8 notes`);
  // the corrections on it (it set the Takt): Tempo ×2 / ½, Eins → – the sound stays, only the grid moves
  r = await ev(async () => {
    const M = window.__M, A = M.A, L = M.hxLoopsLive()[0], o = {};
    o.chips = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent);
    // (a tempo correction acts at the loop's next seam: the passes after it, and the bar lines on them)
    const nx = () => { const k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime + 0.06))); return { len: (M.hxPassF(L, k + 2) - M.hxPassF(L, k + 1)) / A.ctx.sampleRate, bar: ((M.tgBeat(M.hxT(M.hxPassF(L, k + 2))) % 4) + 4) % 4 }; };
    const len0 = nx().len, bpm0 = M.TG.hx;
    const watch = window.__meter(L.id, 9000);
    M.hxKorr(L, 'x2'); await window.__sleep(100);
    const a = nx(); o.x2 = { bpm: M.TG.hx / bpm0, beats: L.d.beats, len: a.len - len0, bar: a.bar };
    await window.__sleep(4300);
    M.hxKorr(L, 'h2'); await window.__sleep(100);
    const b = nx(); o.h2 = { bpm: M.TG.hx / bpm0, beats: L.d.beats, len: b.len - len0, bar: b.bar };
    await window.__sleep(4300);
    const k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))), f1 = M.hxPassF(L, k + 1), b1 = ((M.tgBeat(M.hxT(f1)) % 4) + 4) % 4;
    M.hxKorr(L, 'e>'); await window.__sleep(300);
    o.eins = { f: M.hxPassF(L, k + 1) - f1, beat: ((M.tgBeat(M.hxT(f1)) % 4) + 4) % 4, b1 };
    const met = await watch; o.min = Math.min(...met.slice(4).map((m) => m[1]));
    M.hxUndoStep(); await window.__sleep(200);
    o.undo = ((M.tgBeat(M.hxT(f1)) % 4) + 4) % 4;
    o.hist = M.HX.hist.map((s) => s.label);
    return o;
  });
  ok(r.chips.join(' ').includes('Tempo ½') && r.chips.join(' ').includes('×2') && r.chips.join(' ').includes('Eins ←') && r.chips.join(' ').includes('3er'), `the corrections stand in the Ringleiste after the harvest: ${r.chips.join(' · ')}`);
  ok(r.x2.bpm === 2 && r.x2.beats === 16 && Math.abs(r.x2.len) < 0.001 && r.h2.bpm === 1 && r.h2.beats === 8 && Math.abs(r.h2.len) < 0.001, `Tempo ×2 and ½: the Takt doubles and halves from the next seam, the Schleife counts 16 / 8 beats, its length stays (${(r.x2.len * 1000).toFixed(2)} / ${(r.h2.len * 1000).toFixed(2)} ms)`);
  ok([r.x2.bar, r.h2.bar].every((b) => b < 0.001 || b > 3.999), `  its seams stay on bar lines (beat ${r.x2.bar.toFixed(4)}, ${r.h2.bar.toFixed(4)} of the bar)`);
  ok(r.eins.f === 0 && near(r.eins.beat, 3, 0.01) && near(r.undo, 0, 0.01) || near(r.undo, 4, 0.01), `Eins →: the bar lines move a beat (the seam was on beat ${r.eins.b1.toFixed(2)}, now ${r.eins.beat.toFixed(2)}), the sound not at all (${r.eins.f} frames); ↶ moves them back (${r.undo.toFixed(2)})`);
  ok(r.min > 1e-4, `  the Schleife sounds through every correction (lowest level ${r.min.toExponential(1)})`);

  // ---- row 4: no Takt, no repetition → from the first note after ≥ 1 s of silence to the tap; at once from its start ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0); await window.__reset(); await window.__sleep(1800);
    const t0 = A.ctx.currentTime + 0.2, offs = [0, 0.135, 0.314, 0.541, 0.867, 1.262, 1.597, 1.934, 2.064, 2.19, 2.435], degs = [3, 8, 1, 6, 10, 4, 12, 2, 9, 5, 11];   // (rubato: it hurries, lingers, hurries – no grid fits it, pulse clarity ≈ 0.3–0.4)
    window.__play(offs.map((o, i) => [t0 + o, degs[i], 0.6 + 0.03 * i]), { eng: 'mem' });
    await window.__until(t0 + 3.0 + lat);
    const T = M.heardT(), plan = M.hxKorbPlan(T);
    M.hxRailState(); const word = M.HXU.korb.textContent;
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    return { clar: plan.tk && plan.tk.clarity, kind: plan.kind, lock: plan.lock, w0: plan.w0 - t0, w1: plan.w1 - T, word, start: M.hxT(L.d.ph0) - A.ctx.currentTime, Lf: L.d.L / M.A.ctx.sampleRate, span: (() => { const S = M.HX.sch.get(L.sch[0]); return S && S.cut ? (S.cut.w1 - S.cut.w0) / M.A.ctx.sampleRate : plan.w1 - plan.w0; })(), llock: L.d.lock, pend: M.HX.pend.length };
  });
  ok(r.kind === 'phrase' && r.lock === 'frei' && near(r.w0, 0, 0.002) && near(r.w1, 0, 0.002) && /^frei · 3 s$/.test(r.word), `no Takt, no repetition: from the first note after the silence (${(r.w0 * 1000).toFixed(1)} ms) to the tap (${(r.w1 * 1000).toFixed(1)} ms) – „${r.word}“ (pulse clarity ${r.clar != null ? r.clar.toFixed(2) : '–'})`);
  ok(r.llock === 'frei' && r.start > 0 && r.start < 0.06 && near(r.Lf, r.span, 0.002) && near(r.span, 3.0, 0.15), `  a Frei Schleife (no clear pulse) from its start right after the tap (${Math.round(r.start * 1000)} ms ahead), the tap is the seam (${r.Lf.toFixed(3)} s – the window it cut up to the tap ${r.span.toFixed(3)} s; the tap came ${Math.round((r.span - 3) * 1000)} ms after the 3 s the page waited for)`);

  // ---- row 5: the player stopped before the tap → that phrase, from its start: at the tap (no Takt), at the next 1 (Takt) ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); await window.__sleep(1800);
    let t0 = A.ctx.currentTime + 0.2;
    window.__play([[t0, 2, 0.8], [t0 + 0.4, 5, 0.6], [t0 + 0.9, 3, 0.7], [t0 + 1.25, 9, 0.6]], { eng: 'mem' });
    await window.__until(t0 + 4.6 + lat);
    let plan = M.hxKorbPlan(M.heardT());
    M.hxKorb(null);
    let L = M.hxLoopsLive()[0];
    o.free = { kind: plan.kind, stopped: plan.stopped, w0: plan.w0 - t0, len: plan.w1 - plan.w0, start: M.hxT(L.d.ph0) - A.ctx.currentTime };
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4; t0 = M.tgTime(B0);
    window.__play([[t0, 2, 0.8], [t0 + 0.5, 5, 0.6], [t0 + 1.0, 3, 0.7], [t0 + 1.5, 9, 0.6]], { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 10.5) + lat);   // two and a half bars of rest after it
    plan = M.hxKorbPlan(M.heardT());
    M.hxKorb(null);
    L = M.hxLoopsLive()[0];
    o.grid = { kind: plan.kind, stopped: plan.stopped, w0: plan.w0 - t0, w1: plan.w1 - t0, b0: L.d.b0 - M.TG.o - B0, beats: L.d.beats, tap: M.tgBeat(M.heardT()) - B0 };
    return o;
  });
  ok(r.free.kind === 'phrase' && r.free.stopped && near(r.free.w0, 0, 0.002) && r.free.len > 1.3 && r.free.len < 4 && r.free.start > 0 && r.free.start < 0.15, `stopped before the tap, no Takt: the phrase from its first note to its ring's end (${r.free.len.toFixed(2)} s), from its start at the tap (${Math.round(r.free.start * 1000)} ms)`);
  ok(r.grid.kind === 'grid' && r.grid.stopped && near(r.grid.w0, 0, 1e-6) && r.grid.w1 >= 2 && near(r.grid.w1 % 2, 0, 1e-6) && near(r.grid.b0, Math.ceil(r.grid.tap / 4) * 4, 1e-6) && near(r.grid.beats, r.grid.w1 * 2, 1e-6), `  with a Takt: the bars it was played in, with its ring (${r.grid.beats / 4} bars), from its start on the next 1 (bar ${r.grid.b0 / 4 + 1} after it began), never mid-phrase`);

  // ---- the length: automatic (phrase boundary, repetition), fixed, „wie Schleife 1“; the labels; a full Hexenring ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(2500);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, t0 = M.tgTime(B0);
    // a 2-bar phrase after silence (no repetition): its boundary picks 2 bars
    window.__play([0, 0.5, 1, 1.5, 2, 2.75, 3, 3.5].map((x, i) => [t0 + x, [0, 2, 4, 5, 7, 5, 4, 2][i], 0.7]), { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
    o.auto = M.hxKorbPlan(M.heardT()).bars;
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 3); o.fest = M.hxKorbPlan(M.heardT()).bars;
    M.setParam('hx.laenge', 'auto');
    M.hxKorb(null); const L1 = M.hxLoopsLive()[0]; o.l1 = L1.d.beats;
    M.setParam('hx.laenge', 'wie1');
    window.__play([0, 1, 2, 3].map((x, i) => [M.tgTime(B0 + 8) + x * 0.5, i, 0.7]), { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 12) + 0.05 + lat);
    o.wie1 = M.hxKorbPlan(M.heardT()).bars;
    M.setParam('hx.laenge', 'auto');
    // every place taken (8 on touch devices, 24 on a PC): „voll“, nothing more
    for (let s = 1; s < M.HX.slot.length; s++) M.hxHarvest({ kind: 'grid', in: 0, w0: M.tgTime(B0), w1: M.tgTime(B0 + 4), b0: B0 + 4, beats: 4, bars: 1, lock: 'takt', entry: { b: B0 + 4, t: M.tgTime(B0 + 4), now: true } });
    const plan = M.hxKorbPlan(M.heardT()); M.hxKorb(null); await window.__sleep(320); M.hxRailState();
    o.slots = M.HX.slot.length; o.full = { kind: plan.kind, word: M.HXU.korb.textContent, n: M.hxLoopsLive().length, toast: document.getElementById('toastMsg').textContent };
    return o;
  });
  ok(r.auto === 2 && r.l1 === 8, `automatic length: a 2-bar phrase after a rest is taken whole (${r.auto} bars) – the phrase's boundary at both ends`);
  ok(r.fest === 3 && r.wie1 === 2, `fixed lengths: „fest 3 Takte“ → ${r.fest}, „wie Schleife 1“ → ${r.wie1} bars`);
  ok(r.full.kind === 'voll' && r.full.word === 'voll' && r.full.n === r.slots && /belegt/.test(r.full.toast), `all ${r.slots} places taken: the Korb says „${r.full.word}“, a tap overwrites nothing („${r.full.toast}“)`);

  // ---- precedence: the Korb replaces a recording or a wait; twice over one window is one Schleife; a second tap on a
  // waiting harvest cancels it ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4, t0 = M.tgTime(B0);
    window.__riff(t0, 0.5, [0, 2, 4, 7], 3, { eng: 'mem' });
    M.hxHaupt(null);   // a recording waits for the next bar line
    o.rec = M.HX.rec && M.HX.rec.phase;
    await window.__until(M.tgTime(B0 + 8) + 0.08 + lat);
    M.hxKorb(null);
    o.afterKorb = { rec: !!M.HX.rec, loops: M.hxLoopsLive().length };
    M.hxKorb(null);   // the same window again (still within the grace)
    o.twice = M.hxLoopsLive().length;
    await window.__until(M.tgTime(B0 + 10) + lat);
    M.hxKorb(null); o.pend = M.HX.pend.length; const n1 = M.hxLoopsLive().length;
    M.hxKorb(null); o.cancel = { pend: M.HX.pend.length, loops: M.hxLoopsLive().length, n1 };
    return o;
  });
  ok((r.rec === 'wait' || r.rec === 'rec') && !r.afterKorb.rec && r.afterKorb.loops === 1, `the Korb during a recording (${r.rec}): the harvest replaces it (one Schleife, the recording gone)`);
  ok(r.twice === 1, 'a second Korb tap over the same window: a re-cut at most, never a second Schleife');
  ok(r.pend === 1 && r.cancel.n1 === 2 && r.cancel.pend === 0 && r.cancel.loops === 1, 'a second tap on a waiting harvest cancels it');

  // ---- the corrections that re-cut from the Humus: Länge +1 / −1, Runde davor, 3er – at the next seam, sounding on ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4, t0 = M.tgTime(B0);
    window.__riff(t0, 0.5, [0, 2, 4, 7, 5, 4, 2, 9], 3, { eng: 'mem', dur: 0.4 });
    await window.__until(M.tgTime(B0 + 24) + 0.08 + lat);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]), bar = 2 * A.ctx.sampleRate;
    o.b = L.d.beats; o.chips = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent);
    const watch = window.__meter(L.id, 9000);
    const len0 = S.len, w00 = S.cut.w0, seam1 = M.hxT(M.hxNextSeam(L).f);
    M.hxKorr(L, 'l+'); o.lp = { beats: L.d.beats, len: (S.len - len0) / bar };
    await window.__until(seam1 + 0.2);
    o.lpPass = M.hxLen(L);
    M.hxKorr(L, 'l-'); o.lm = { beats: L.d.beats, len: (S.len - len0) / bar };
    await window.__sleep(200);
    M.hxKorr(L, 'davor'); o.davor = (w00 - S.cut.w0) / S.len;
    await window.__sleep(300);
    const seam = M.hxT(M.hxNextSeam(L).f);
    M.hxKorr(L, '3er'); o.drei = { bpb: L.bpb, beats: L.d.beats };
    await window.__until(seam + 0.2);
    o.dreiPass = M.hxLen(L);
    const met = await watch; o.min = Math.min(...met.slice(5).map((m) => m[1]));
    o.hist = M.HX.hist.map((s) => s.label);
    M.hxUndoStep(); await window.__sleep(200); o.undo = { bpb: L.bpb, beats: L.d.beats };
    return o;
  });
  ok(r.b === 8 && r.lp.beats === 12 && r.lp.len === 1 && near(r.lpPass, 6, 0.002), `Länge +1: 2 → 3 bars, the window a bar longer, the next pass ${r.lpPass.toFixed(3)} s`);
  ok(r.lm.beats === 8 && r.lm.len === 0 && near(r.davor, 1, 1e-9), 'Länge −1 back to 2 bars; Runde davor: the window one length earlier');
  ok(r.drei.bpb === 3 && r.drei.beats === 6 && near(r.dreiPass, 3, 0.002), `3er: two bars of three (${r.drei.beats} beats, a pass of ${r.dreiPass.toFixed(3)} s)`);
  ok(r.min > 1e-4, `  the Schleife sounds through every re-cut (lowest level ${r.min.toExponential(1)})`);
  ok(r.hist.length === 5 && r.undo.bpb === 4 && r.undo.beats === 8, `  each correction is a step of the history (${r.hist.slice(1).join(' · ')}); ↶ takes the 3er back`);

  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
