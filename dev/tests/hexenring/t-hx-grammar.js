// Hexenring – the grammar (SPEC §6, KONZEPT §2.2–2.5; tests §22): the Hauptknopf (tap, push-to-talk, a nervous short
// press, the start at the bar line, auto-close after the base length ×1/×2/×4, a tap during auto-length), the modes
// („neue Schleife“, „dieselbe Schleife“: punch overdub from the press frame, one Schicht per pass in a group), Ziel and
// Fokus, the „→ N“ chips, the retro rule (the last ¼ of a pass: this pass, pending), stumm vs angehalten (re-entry in
// phase vs from the start on the next 1), Stille → Weiter / Leeren, deleting into the graveyard, alle leeren (↶ held)
// and its undo, the history with ↶ (pending first) and ↷, the tempo release with „Tempo behalten“.
// Real pointer presses on the Ringleiste where the gesture matters.   node t-hx-grammar.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const near = (a, b, e) => Math.abs(a - b) <= e;
  const box = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const press = async (sel, ms) => { const p = await box(sel); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); };

  // ---- the Hauptknopf without a Takt: a tap starts at once, a tap closes – the first Schleife, Takt found ----
  let r = await ev(async () => {
    const M = window.__M, A = M.A; await window.__reset(); await window.__sleep(1200);
    M.setParam('hx.start', 'sofort');
    const t0 = A.ctx.currentTime;
    M.hxHaupt(null);
    const o = { phase: M.HX.rec && M.HX.rec.phase, slot: M.HX.rec && M.HX.rec.slot };
    window.__riff(t0 + 0.15, 0.5, [0, 4, 2, 5, 4, 7, 2, 0], 1, { eng: 'mem' });
    await window.__until(t0 + 0.15 + 4.0 + 0.02);
    M.hxHaupt(null);
    const L = M.hxLoopsLive()[0];
    o.loop = L && { slot: L.slot, lock: L.d.lock, beats: L.d.beats, bpm: M.TG.hx, on: M.TG.hxOn, start: L.d.lock === 'takt' ? M.tgTime(L.d.b0 - M.TG.o) - A.ctx.currentTime : 0 };
    o.ziel = M.hxZiel(); o.fokus = M.HX.fokus === (L && L.id); o.rec = !!M.HX.rec;
    o.hist = M.HX.hist.map((s) => s.label);
    return o;
  });
  ok(r.phase === 'rec' && r.slot === 0, 'Hauptknopf (no Takt, „sofort“): a tap records at once into the Ziel, slot 1');
  ok(r.loop && r.loop.lock === 'takt' && r.loop.beats === 8 && near(r.loop.bpm, 120, 2) && r.loop.on && r.loop.start > 0 && r.loop.start < 0.1 && !r.rec, `  a second tap closes it: the first Schleife, Takt found (${r.loop && r.loop.beats} beats, ${r.loop && r.loop.bpm.toFixed(1)} BPM), from its start at once`);
  ok(r.ziel === 1 && r.fokus && r.hist.length === 1, `  the Ziel moved on to slot ${r.ziel + 1}, the Fokus is the new Schleife; one history step (${r.hist.join(', ')})`);

  // ---- with its Takt: the next recording waits for the bar line, closes after the base length; ×2 doubles it; a tap
  // during auto-length closes at the next bar line ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, o = {};
    M.setParam('hx.start', 'takt');
    const now = A.ctx.currentTime, nb = Math.ceil(M.tgBeat(now + 0.3) / 4) * 4;
    await window.__until(M.tgTime(nb) - 0.6);   // well inside a bar: it waits for the next one
    M.hxHaupt(null);
    const R = M.HX.rec;
    M.hxRailState();
    o.wait = { phase: R && R.phase, b0: R && R.b0 - nb, slot: R && R.slot, base: R && R.base, word: M.HXU.haupt.textContent }; o.chips = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent).join(' ');
    // ×2 while waiting
    const x2 = [...M.HXU.chips.querySelectorAll('button')].find((b) => b.textContent === '×2'); if (x2) x2.click();
    const L2 = M.hxByKey(M.HX.rec.loopKey);
    o.x2 = L2 && { beats: L2.d.beats, b0: L2.d.b0 - M.TG.o - nb };
    await window.__until(M.tgTime(nb) + 0.1);
    o.rec = M.HX.rec && M.HX.rec.phase;
    // a tap after one bar closes at the next bar line: two bars, not four
    await window.__until(M.tgTime(nb + 4) + 0.5);
    M.hxHaupt(null);
    const L3 = M.hxLoopsLive().find((x) => x.slot === 1);
    o.close = L3 && { beats: L3.d.beats, b0: L3.d.b0 - M.TG.o - nb, rec: !!M.HX.rec };
    return o;
  });
  ok(r.wait.phase === 'wait' && r.wait.b0 === 0 && r.wait.slot === 1 && r.wait.base === 8 && r.wait.word === 'abbrechen', `with the Takt: the Hauptknopf waits for the next bar line (count-in, „${r.wait.word}“), base length ${r.wait.base} beats`);
  ok(/×1 ×2 ×4/.test(r.chips) && r.x2 && r.x2.beats === 16 && r.x2.b0 === 16, `  while it waits: ×1 ×2 ×4 (${r.chips}); ×2 makes it close after 16 beats, entering there`);
  ok(r.rec === 'rec' && r.close && r.close.beats === 8 && r.close.b0 === 8 && !r.close.rec, '  it records from the bar line; a tap during auto-length closes at the next bar line (2 bars, entering there)');

  // ---- push-to-talk: held ≥ 0.5 s (and a beat) records while held; a nervous short press is a tap ----
  r = await ev(async () => { const M = window.__M; await window.__reset(); await window.__sleep(800); M.setParam('hx.start', 'sofort'); M.HXU.w = 0; M.hxRailState(); return 1; });
  await page.waitForTimeout(300);
  await ev(() => { const M = window.__M, A = M.A; window.__riff(A.ctx.currentTime + 0.1, 0.4, [0, 3, 5, 7, 5, 3], 1, { eng: 'mem' }); });
  await press('#hxHaupt', 1500);
  r = await ev(async () => { const M = window.__M; await window.__sleep(100); const L = M.hxLoopsLive()[0]; return { rec: !!M.HX.rec, loops: M.hxLoopsLive().length, len: L && M.hxLen(L) }; });
  ok(!r.rec && r.loops === 1 && r.len > 1.2 && r.len < 1.8, `push-to-talk: held 1.5 s, released – the Schleife closes at the release (${r.len && r.len.toFixed(2)} s)`);
  await press('#hxHaupt', 300);
  r = await ev(() => ({ rec: window.__M.HX.rec && window.__M.HX.rec.phase }));
  ok(r.rec === 'rec', 'a short press (0.3 s) is a tap: the recording goes on');
  await press('#hxHaupt', 80);
  r = await ev(() => ({ rec: !!window.__M.HX.rec, loops: window.__M.hxLoopsLive().length }));
  ok(!r.rec && r.loops === 2, '  a tap closes it');

  // ---- stumm vs angehalten: stumm at the bar line (≤ ⅛ bar after it: at once); back in phase; angehalten re-enters from
  // its start on the next 1 ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7], 1, { eng: 'mem', dur: 0.45 });
    await window.__until(M.tgTime(B0 + 4) + 0.05 + lat);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    await window.__until(M.tgTime(B0 + 6) + lat);   // mid-bar: the tap waits for the bar line
    M.hxRingTap(L.slot, null);
    o.pend = M.HX.pend.length && M.HX.pend[0].label; o.word = (M.hxRailState(), M.HXU.rings[0].textContent);
    const m1 = await window.__meter(L.id, 1500);
    o.mute = { before: Math.max(...m1.filter((x) => x[0] < M.tgTime(B0 + 8) - 0.02).map((x) => x[1])), after: Math.max(...m1.filter((x) => x[0] > M.tgTime(B0 + 8) + 0.15).map((x) => x[1]), 0), state: L.state };   // (a meter report trails its window)
    const kMute = L.ps[L.ps.length - 1][0];
    // back, within the grace after the next bar line: at once, in phase (its pass index ran on while it was stumm)
    await window.__until(M.tgTime(B0 + 12) + 0.06 + lat);
    const k0 = kMute;
    M.hxRingTap(L.slot, null);
    await window.__sleep(400);
    o.back = { state: L.state, pend: M.HX.pend.length, k: L.ps[L.ps.length - 1][0], k0, ph: M.hxPhase(L, A.ctx.currentTime) };
    // angehalten (Stille) → a ring tap: from its start on the next 1 (pass 0 there)
    M.panic();
    o.toast = { msg: document.getElementById('toastMsg').textContent, a1: document.getElementById('toastAct').textContent, a2: document.getElementById('toastAct2').textContent, h2: document.getElementById('toastAct2').hidden };
    o.halt = { state: L.state, ruht: M.HX.ruht, word: (M.hxRailState(), M.HXU.haupt.textContent) };
    window.__grid(120); await window.__sleep(200);
    M.hxRingTap(L.slot, null);
    const nb = M.HX.pend[0] && M.HX.pend[0].t;
    await window.__until(nb + 0.3);
    o.re = { k: L.ps[L.ps.length - 1][0], at: M.hxT(L.ps[L.ps.length - 1][1]) - nb, bar: ((M.tgBeat(nb) % 4) + 4) % 4 };
    return o;
  });
  ok(/^stumm mit Takt/.test(r.pend) && r.word === 'abbrechen', `a ring tap mid-bar: pending („${r.pend}“), the ring's word is now „${r.word}“`);
  ok(r.mute.before > 1e-4 && r.mute.after < 1e-6 && r.mute.state === 'stumm', '  stumm from the bar line on (it sounded until then)');
  ok(r.back.state === 'spielt' && r.back.pend === 0 && r.back.k > r.back.k0, `  tapped within ⅛ bar after a bar line: back at once, in phase – its passes ran on while stumm (pass ${r.back.k} after ${r.back.k0})`);
  ok(/Schleife angehalten/.test(r.toast.msg) && r.toast.a1 === 'Weiter' && r.toast.a2 === 'Leeren' && !r.toast.h2 && r.halt.state === 'angehalten' && r.halt.ruht && r.halt.word === 'weiter', `Stille: angehalten, the toast „${r.toast.msg}“ · ${r.toast.a1} · ${r.toast.a2}; the Hauptknopf says „${r.halt.word}“`);
  ok(r.re.k === 0 && Math.abs(r.re.at) < 0.0011 && (r.re.bar < 0.001 || r.re.bar > 3.999), `  a ring tap brings it back from its start on the next 1 (pass 0 at ${(r.re.at * 1000).toFixed(2)} ms of the bar line)`);

  // ---- Weiter: every angehalten Schleife from its start on the same 1 (they meet anew); Leeren: everything, undoable ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [5, 7, 9, 7, 5, 4], 1, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
    M.hxKorb(null);
    await window.__sleep(500);
    M.panic();
    window.__grid(120); await window.__sleep(200);
    document.getElementById('toastAct').click();   // Weiter
    const t = M.HX.pend.map((p) => p.t);
    await window.__until(Math.max(...t) + 0.3);
    const ls = M.hxLoopsLive();
    o.weiter = { n: ls.length, same: t.length === 2 && t[0] === t[1], k0: ls.map((L) => L.ps[L.ps.length - 1][0]), ruht: M.HX.ruht };
    M.panic(); await window.__sleep(100);
    document.getElementById('toastAct2').click();   // Leeren
    o.leer = { n: M.hxLoopsLive().length, grave: M.HX.grave.length, hist: M.HX.hist[M.HX.hist.length - 1].label };
    M.hxUndoStep(); await window.__sleep(200);
    o.undo = { n: M.hxLoopsLive().length, grave: M.HX.grave.length, states: M.hxLoopsLive().map((L) => L.state).join(' ') };
    return o;
  });
  ok(r.weiter.n === 2 && r.weiter.same && r.weiter.k0.every((k) => k === 0) && !r.weiter.ruht, 'Weiter: both Schleifen come back from their starts on the same 1');
  ok(r.leer.n === 0 && r.leer.grave === 2 && /geleert/.test(r.leer.hist), `Leeren (the toast's second button): all gone, into the graveyard; a history step („${r.leer.hist}“)`);
  ok(r.undo.n === 2 && r.undo.grave === 0, `  ↶ brings them back (${r.undo.states})`);

  // ---- ↶ held 1.5 s: alle leeren (a ring fills); a tap undoes; ↷ for 8 s; the tempo is held 8 s with „Tempo behalten“ ----
  // (a Schleife that gave the Takt: no Puls, a figure repeated, the Korb)
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0);
    await window.__reset(); await window.__sleep(1500);
    const t0 = A.ctx.currentTime + 0.2, end = window.__riff(t0, 0.5, [0, 4, 2, 5, 4, 7, 2, 0], 2, { eng: 'mem' });
    await window.__until(t0 + 6 + lat);
    M.hxKorb(null);
    await window.__until(end + 0.3);
    return { n: M.hxLoopsLive().length, on: M.TG.hxOn };
  });
  await press('#hxUndo', 1700);
  r = await ev(async () => {
    const M = window.__M, o = {}; await window.__sleep(100); M.hxRailState();
    o.n = M.hxLoopsLive().length; o.chips = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent).join(' '); o.keep = M.TG.keep;
    return o;
  });
  ok(r.n === 0 && /Tempo behalten/.test(r.chips) && r.keep, `↶ held 1.5 s: alle leeren; the tempo the Schleife gave is held with a chip („${r.chips}“)`);
  await press('#hxUndo', 120);
  r = await ev(async () => { const M = window.__M; await window.__sleep(150); M.HXU.w = 0; M.hxRailState(); return { n: M.hxLoopsLive().length, redo: !M.HXU.redo.hidden, keepT: !!M.HX.keepT }; });
  ok(r.n === 1 && r.redo && !r.keepT, '  ↶ tapped: it is back; ↷ stands next to ↶');
  await page.click('#hxRedo');
  r = await ev(async () => { const M = window.__M; await window.__sleep(150); return { n: M.hxLoopsLive().length }; });
  ok(r.n === 0, '  ↷: cleared again');
  r = await ev(async () => { const M = window.__M; await window.__sleep(8400); M.hxRailState(); return { on: M.TG.hxOn, keep: M.TG.keep, redo: !M.HXU.redo.hidden }; });
  ok(!r.on && !r.keep && !r.redo, '  8 s later: the tempo is released (no „Tempo behalten“ tapped), ↷ is gone');

  // ---- mode „dieselbe Schleife“: the Hauptknopf punches the Fokus from the press frame, one Schicht per pass (a group),
  // each entering after its pass; ↶ takes the group back; the Korb in that mode layers the pass (retro rule) ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7], 1, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 4) + 0.05 + lat);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];   // a 1-bar loop from B0 + 4
    M.setParam('hx.modus', 'dieselbe');
    await window.__until(M.tgTime(B0 + 5) + lat);   // a beat into its pass: punch in
    const pin = M.heardT();
    M.hxHaupt(null);
    o.punch = !!M.HX.punch;
    window.__riff(M.tgTime(B0 + 5.5), 0.5, [9, 11, 9, 11, 12, 9], 1, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 10) + lat);   // into the second pass after: punch out
    M.hxHaupt(null);
    await window.__sleep(300);
    const sch = L.sch.map((id) => M.HX.sch.get(id)).filter((S) => S.kind === 'punch');
    o.sch = sch.map((S) => ({ group: S.group, w0: (S.cut.w0 - M.hxF(M.tgTime(B0 + 4))) / (2 * A.ctx.sampleRate), len: S.len / (2 * A.ctx.sampleRate) }));
    // the first one: silent before the press (the punch's start), from the Humus after it
    await window.__sleep(2600);
    const S0 = sch[0];
    if (S0 && S0.aud) { const a = Math.round(M.hxF(pin)) - S0.cut.f0, at = (i) => S0.aud[Math.floor(i / 8192)][0][i % 8192]; let pre = 0, post = 0; for (let i = 0; i < a - 10; i++) pre = Math.max(pre, Math.abs(at(i))); for (let i = a + 600; i < a + 20000; i++) post = Math.max(post, Math.abs(at(i))); o.gate = { pre, post }; }
    o.hist = M.HX.hist[M.HX.hist.length - 1].label;
    M.hxUndoStep(); await window.__sleep(200);
    o.undo = L.sch.length;
    // the Korb in this mode: the pass just played becomes a Schicht of the Fokus
    const n0 = L.sch.length;
    await window.__until(M.hxT(M.hxPassF(L, M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + 1)) + 0.3 + lat);
    M.hxKorb(null);
    o.korb = { sch: L.sch.length - n0, loops: M.hxLoopsLive().length, kind: M.HX.sch.get(L.sch[L.sch.length - 1]).kind };
    M.setParam('hx.modus', 'neu');
    return o;
  });
  ok(r.punch && r.sch.length === 2 && r.sch.every((s) => s.group === r.sch[0].group) && r.sch.every((s) => near(s.len, 1, 1e-3)), `„dieselbe Schleife“: the Hauptknopf punched the Fokus over two passes – ${r.sch.length} Schichten in one group, one per pass`);
  ok(r.gate && r.gate.pre === 0 && r.gate.post > 1e-3, `  the first from the press frame on: silent before it, the Humus after (peak ${r.gate && r.gate.post.toFixed(3)})`);
  ok(/2 Schichten/.test(r.hist) && r.undo === 1, `  one history step („${r.hist}“); ↶ takes the group out at once`);
  ok(r.korb.sch === 1 && r.korb.loops === 1 && r.korb.kind === 'retro', '  the Korb in this mode: the pass just played becomes a Schicht of the Fokus (no new Schleife)');

  // ---- „→ N“: a harvest over a playing loop becomes its Schicht, re-cut to that loop's last pass; the retro rule:
  // decided in the last ¼ of a pass → this pass, pending (↶ cancels); else the pass just completed, at once ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7, 5, 4, 2, 0], 1, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
    M.hxKorb(null);
    const L1 = M.hxLoopsLive()[0];   // 2 bars from B0 + 8
    window.__riff(M.tgTime(B0 + 8), 0.5, [9, null, 11, null, 12, null, 11, 9], 1, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 16) + 0.05 + lat);
    M.hxKorb(null);
    M.hxRailState();
    o.chips = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent);
    const T = M.HX.chips.T, k = M.hxPassK(L1, Math.round(M.hxF(T))), want = [M.hxPassF(L1, k - 1), M.hxPassF(L1, k)];
    [...M.HXU.chips.querySelectorAll('button')].find((b) => b.textContent === '→ 1').click();
    await window.__sleep(200);
    const S = M.HX.sch.get(L1.sch[L1.sch.length - 1]);
    o.to = { loops: M.hxLoopsLive().length, sch: L1.sch.length, w: [S.cut.w0 - want[0], S.cut.w1 - want[1]], fokus: M.HX.fokus === L1.id, hist: M.HX.hist.map((s) => s.label) };
    // the retro rule, in the last quarter of a pass: this pass, at its end – pending, cancellable
    M.setParam('hx.modus', 'dieselbe');
    const kk = M.hxPassK(L1, Math.round(M.hxF(A.ctx.currentTime))), a = M.hxT(M.hxPassF(L1, kk + 1)), b = M.hxT(M.hxPassF(L1, kk + 2));
    await window.__until(a + 0.8 * (b - a) + lat);
    const n0 = L1.sch.length;
    M.hxKorb(null);
    o.late = { pend: M.HX.pend.length && M.HX.pend[0].label, sch: L1.sch.length - n0 };
    M.hxUndoStep();
    o.late.after = { pend: M.HX.pend.length, sch: L1.sch.length - n0 };
    M.setParam('hx.modus', 'neu');
    return o;
  });
  ok(r.chips[0] === '→ 1' && r.to.loops === 1 && r.to.sch === 2 && r.to.w[0] === 0 && r.to.w[1] === 0 && r.to.fokus, `„→ 1“ after a harvest over Schleife 1: it becomes Schleife 1's Schicht, cut to its last pass exactly; Schleife 1 is the Fokus (${r.to.hist.join(' · ')})`);
  ok(r.late.pend === 'am Ende der Runde' && r.late.sch === 1 && r.late.after.pend === 0 && r.late.after.sch === 0, 'retro rule: decided in the last ¼ of a pass – this pass, at its end (pending); ↶ cancels it');

  // ---- Ziel and Fokus; an empty ring records into it; deleting one Schleife (its card) into the graveyard, back ----
  r = await ev(async () => {
    const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
    await window.__reset(); window.__grid(120); await window.__sleep(300);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7], 2, { eng: 'mem' });
    await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
    M.hxKorb(null);
    M.hxRingTap(3, null);   // an empty ring: records into it (it becomes the Ziel)
    o.rec = M.HX.rec && M.HX.rec.slot;
    M.hxRecCancel(true);
    M.hxCardOpen(0); await window.__sleep(400);
    const card = document.getElementById('hxc-0');
    o.card = !!card && /Schleife 1/.test(card.textContent);
    [...card.querySelectorAll('button')].find((b) => b.textContent === 'Löschen').click();
    await window.__sleep(200);
    o.del = { n: M.hxLoopsLive().length, grave: M.HX.grave.length };
    M.hxCardRender();
    const back = [...document.querySelectorAll('.hx-grave button')].find((b) => b.textContent === 'Zurückholen');
    back.click(); await window.__sleep(200);
    o.back = { n: M.hxLoopsLive().length, grave: M.HX.grave.length, slot: M.hxLoopsLive()[0] && M.hxLoopsLive()[0].slot };
    M.closePanel();
    return o;
  });
  ok(r.rec === 3, 'a tap on an empty ring records into it');
  ok(r.card && r.del.n === 0 && r.del.grave === 1 && r.back.n === 1 && r.back.grave === 0 && r.back.slot === 0, 'deleting a Schleife from its card puts it into the graveyard; „Zurückholen“ brings it back into its slot');

  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
