// The length of a new loop in bars and where you are while you play it in (owner, 25.10.2026): the button „Länge“ beside
// the Hauptknopf and its popover (auto · 1 … 16 Takte, the tempo a first loop is counted in at, count-in, click); a
// fixed length counts in one bar at the Puls's tempo when no Takt runs yet and closes by itself after its bars; with a
// Takt it begins on the next bar line; a length changed while the recording waits takes effect; the position (bar of
// bars, beat) as the field shows it, its box drawn at the field's top; the controller targets.   node t-hx-laenge.js
// (screenshots out/len-*.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  // 1. the button and its popover
  const ui = await page.evaluate(async () => {
    const M = window.__M, o = {};
    await window.__reset(); M.setParam('hx.raster', 'frei');
    const b = document.getElementById('hxLen'), pop = document.getElementById('hxLenPop');
    o.btn = { vis: !!b.offsetParent, face: b.textContent, title: b.title.length, exp: b.getAttribute('aria-expanded') };
    b.click(); await window.__sleep(150);
    o.open = { vis: !pop.hidden && !!pop.offsetParent, exp: b.getAttribute('aria-expanded'), chips: [...pop.querySelectorAll('.chip')].map((c) => c.textContent), noTitle: [...pop.querySelectorAll('button')].filter((c) => !c.title || c.title.length < 8).map((c) => c.textContent),
      pressed: [...pop.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.textContent), above: pop.getBoundingClientRect().bottom <= document.getElementById('hxRail').getBoundingClientRect().top + 1 };
    pop.querySelector('.chip[aria-label="Länge 4 Takte"]').click(); await window.__sleep(100);
    o.four = { l: M.P['hx.laenge'], n: M.P['hx.festT'], face: b.textContent, pressed: [...pop.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.textContent).join(' '), note: pop.querySelector('.note').textContent };
    pop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await window.__sleep(100);
    o.esc = { hidden: pop.hidden, exp: b.getAttribute('aria-expanded') };
    return o;
  });
  ok(ui.btn.vis && ui.btn.face === 'autoLänge' && ui.btn.title > 20 && ui.btn.exp === 'false', `the button „Länge“ beside the Hauptknopf (${JSON.stringify(ui.btn)})`);
  ok(ui.open.vis && ui.open.exp === 'true' && ui.open.above && ui.open.chips.slice(0, 9).join(' ') === 'auto 1 2 3 4 6 8 12 16' && ui.open.pressed.includes('auto'), `a click opens its popover over the rail: auto, 1 … 16 Takte (${ui.open.chips.join(' ')}; pressed ${ui.open.pressed.join(', ')})`);
  ok(!ui.open.noTitle.length, `every button in it explains itself (${ui.open.noTitle.join(', ') || 'all'})`);
  ok(ui.four.l === 'fest' && ui.four.n === 4 && ui.four.face === '4Takte' && /^4\b/.test(ui.four.pressed) && /einen Takt ein/.test(ui.four.note), `„4“: a fixed length of 4 bars, the button says so (${JSON.stringify(ui.four)})`);
  ok(ui.esc.hidden && ui.esc.exp === 'false', 'Escape closes it');
  // the tempo without a Takt: „+“ held repeats, its button stays under the finger, letting go stops it
  await page.evaluate(async () => { const M = window.__M; await window.__reset(); M.setParam('seq.bpm', 100); document.getElementById('hxLen').click(); await window.__sleep(150); });
  const plus = await page.$('#hxLenPop .chip[aria-label="Tempo schneller"]'), bx = await plus.boundingBox();
  await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down(); await page.waitForTimeout(900);
  const held = await page.evaluate(() => ({ bpm: window.__M.P['seq.bpm'], txt: document.querySelector('#hxLenPop .hx-bpmv').textContent }));
  await page.mouse.up(); await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__M.P['seq.bpm']); await page.waitForTimeout(400);
  const later = await page.evaluate(() => { const M = window.__M, v = M.P['seq.bpm']; M.hxLenOpen(false); M.setParam('seq.bpm', 100); return v; });
  ok(held.bpm >= 104 && held.txt === held.bpm + ' BPM' && after === later && after >= held.bpm, `the tempo: „+“ held counts on (100 → ${held.bpm} in 0.9 s, shown „${held.txt}“), letting go stops it (${after} → ${later})`);
  // 2. fixed 4 bars, no Takt yet: counted in one bar at the Puls's tempo, closes by itself after 4 bars
  const a = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); M.setParam('hx.raster', 'frei'); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4); M.setParam('seq.bpm', 100);
    const T0 = A.ctx.currentTime; M.hxHaupt(null); const R = M.HX.rec;
    o.start = { grid: R.grid, phase: R.phase, wait: +(R.t0 - T0).toFixed(2), base: R.base, made: !!R.loopKey, bpm: +M.tgBpm(A.ctx.currentTime + 3).toFixed(1) };
    await window.__sleep(300);
    const p0 = M.hxRecPos(A.ctx.currentTime); o.ein = { kind: p0.kind, left: p0.left, beats: p0.beats, words: M.hxPosWords(p0) };
    window.__riff(R.t0, 0.6, [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 });
    await window.__until(R.t0 + 0.6 * 5.5);   // beat 6 of 16: bar 2, beat 2
    const p1 = M.hxRecPos(R.t0 + 0.6 * 5.5); o.rec = { kind: p1.kind, bar: p1.bar, beat: p1.beat, beats: p1.beats, words: M.hxPosWords(p1) };
    await window.__sleep(80);
    o.box = M.HXLEN.box ? Object.assign({}, M.HXLEN.box) : null;
    if (o.box) {   // the box at the field's top: its first cells red (beats past), the last ones open
      const cv = document.getElementById('cvFx'), d = devicePixelRatio || 1, cx = cv.getContext('2d'), B = o.box, x1 = B.x0 + (B.W - (B.n * B.cw + (B.n - B.n / 4) * 2 + (B.n / 4 - 1) * 6)) / 2;
      const px = (x, y) => Array.from(cx.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data);
      o.cell0 = px(x1 + B.cw / 2, B.y0 + 38 + 10); o.cellEnd = px(x1 + (B.n - 1) * (B.cw + 2) + 3 * 4 + B.cw / 2, B.y0 + 38 + 7);
    }
    await window.__until(R.t0 + 0.6 * 16 + 0.4);
    const L = M.hxLoopsLive()[0];
    o.end = { rec: !!M.HX.rec, n: M.hxLoopsLive().length, beats: L && L.d.beats, lock: L && L.d.lock, st: L && L.state };
    return o;
  });
  ok(a.start.grid && a.start.phase === 'wait' && Math.abs(a.start.wait - 2.4) < 0.05 && a.start.base === 16 && a.start.made && a.start.bpm === 100, `fixed 4 bars without a Takt: one set at the Puls's 100 BPM, one bar counted in, the loop made with its end (${JSON.stringify(a.start)})`);
  ok(a.ein.kind === 'ein' && a.ein.left >= 1 && a.ein.left <= 4 && a.ein.beats === 16 && /^Einzählen/.test(a.ein.words[0]) && /4 Takte/.test(a.ein.words[2]), `… the count-in counts down (${JSON.stringify(a.ein)})`);
  ok(a.rec.kind === 'rec' && a.rec.bar === 2 && a.rec.beat === 2 && a.rec.beats === 16 && a.rec.words[1] === 'Takt 2 / 4' && a.rec.words[2] === 'Schlag 2', `… while it records: „Takt 2 / 4 · Schlag 2“ at the sixth beat (${JSON.stringify(a.rec)})`);
  ok(a.box && a.box.kind === 'rec' && a.box.n === 16 && a.box.y0 < 20, `… drawn at the field's top: 16 beat cells (${JSON.stringify(a.box)})`);
  ok(a.cell0 && a.cell0[0] > 150 && a.cell0[0] > a.cell0[1] + 60 && a.cellEnd && a.cellEnd[0] < 120, `… the beats past are red, the last bar still open (first ${a.cell0}, last ${a.cellEnd})`);
  ok(!a.end.rec && a.end.n === 1 && a.end.beats === 16 && a.end.lock === 'takt' && a.end.st === 'spielt', `… it closes by itself after 4 bars and plays – no second tap (${JSON.stringify(a.end)})`);
  // 3. with a Takt (the Puls): fixed 2 bars begin on the next bar line and close after 2
  const b = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); window.__grid(120); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2); await window.__sleep(300);
    const bb = M.tgBeat(A.ctx.currentTime); await window.__until(M.tgTime(Math.floor(bb / 4) * 4 + 4 + 1.5));   // mid-bar
    M.hxHaupt(null); const R = M.HX.rec; o.r = { phase: R.phase, b0: R.b0 % 4, base: R.base };
    window.__riff(R.t0, 0.5, [0, 2, 4, 5, 7, 5, 4, 2], 1, { eng: 'klb', dur: 0.3 });
    await window.__until(R.t0 + 0.5 * 8 + 0.4);
    const L = M.hxLoopsLive()[0]; o.L = L && { beats: L.d.beats, st: L.state }; o.rec = !!M.HX.rec;
    return o;
  });
  ok(b.r.phase === 'wait' && b.r.b0 === 0 && b.r.base === 8 && b.L && b.L.beats === 8 && b.L.st === 'spielt' && !b.rec, `with the Puls: fixed 2 bars begin on the next bar line and close after them (${JSON.stringify(b)})`);
  // 4. a length changed while the recording counts in takes effect; back to auto: open again
  const c = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2); M.setParam('seq.bpm', 90);
    M.hxHaupt(null); const R = M.HX.rec; o.b1 = R.base;
    M.hxLenSet(8); await window.__sleep(50); const L = M.hxByKey(R.loopKey); o.b2 = R.base; o.L2 = L && L.d.beats;
    M.hxLenSet('auto'); await window.__sleep(50); o.b3 = R.base; o.key3 = R.loopKey; o.w3 = R.w1;
    const p = M.hxRecPos(A.ctx.currentTime); o.p3 = p && p.kind;
    M.hxRecCancel(true);
    return o;
  });
  ok(c.b1 === 8 && c.b2 === 32 && c.L2 === 32 && c.b3 === 0 && !c.key3 && !c.w3 && c.p3 === 'ein', `a length changed while it counts in: 2 → 8 bars (${c.b2 / 4} bars made), → auto: open again (${JSON.stringify(c)})`);
  // 5. an open recording with a Takt counts the bars up; a free one shows its seconds; an overdub its loop's bar
  const d = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); window.__grid(100); M.setParam('hx.laenge', 'auto'); M.setParam('hx.raster', 'takt'); await window.__sleep(200);
    M.hxHaupt(null); const R = M.HX.rec; await window.__until(R.t0 + 2.4 + 0.3);
    const p = M.hxRecPos(R.t0 + 2.4 + 0.3); o.open = { kind: p.kind, bar: p.bar, beats: p.beats, w: M.hxPosWords(p)[1] };
    await window.__reset(); M.setParam('hx.raster', 'frei');
    M.hxHaupt(null); await window.__sleep(1200); const q = M.hxRecPos(A.ctx.currentTime); o.frei = { kind: q.kind, s: +q.s.toFixed(1), w: M.hxPosWords(q)[1] };
    window.__riff(A.ctx.currentTime + 0.05, 0.4, [0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 }); await window.__sleep(3400); M.hxHaupt(null); await window.__sleep(800);
    const L = M.hxLoopsLive()[0]; M.setParam('hx.modus', 'dieselbe'); M.HX.fokus = L.id; M.hxHaupt(null); await window.__sleep(600);
    const u = M.hxRecPos(A.ctx.currentTime); o.over = u && { kind: u.kind, slot: u.slot, runde: u.runde, w: M.hxPosWords(u)[0] };
    M.hxHaupt(null); M.setParam('hx.modus', 'neu');
    return o;
  });
  ok(d.open.kind === 'rec' && d.open.bar === 2 && d.open.beats === 0 && d.open.w === 'Takt 2', `an open recording on the Takt counts its bars up (${JSON.stringify(d.open)})`);
  ok(d.frei.kind === 'frei' && d.frei.s > 0.8 && /^0:0\d$/.test(d.frei.w), `a free one shows its seconds (${JSON.stringify(d.frei)})`);
  ok(d.over && d.over.kind === 'ueber' && d.over.slot === 0 && /^Überspielen · Schleife 1/.test(d.over.w), `an overdub shows its loop (${JSON.stringify(d.over)})`);
  // 6. the controller: a knob sets the length in steps, a button one step
  const e = await page.evaluate(() => {
    const M = window.__M, T = M.MTARGETS.get('hx.len'), up = M.MTARGETS.get('hx.len.next'), o = {};
    T.set(0); o.a = M.P['hx.laenge']; T.set(0.5); o.b = M.P['hx.festT']; up.run(1); o.c = M.P['hx.festT']; T.step(-1); o.d = M.P['hx.festT']; o.g = +T.get().toFixed(3);
    M.hxLenSet('auto');
    return o;
  });
  ok(e.a === 'auto' && e.b === 8 && e.c === 12 && e.d === 8 && e.g === 0.545, `the controller: a knob sets the length (auto … 128), a button steps it (${JSON.stringify(e)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
