// A loop looked at and edited (owner, 25.10.2026): a right click on a ring opens its menu (an empty ring: „Hier
// aufnehmen“); „Ansehen und bearbeiten“ – also Umschalt+1…8 and a strip's head in the mixer's view „Schleifen“ – opens
// the editor over the field: the waveform (bars, notes, playhead), the Schichten, the tools; a stretch dragged over the
// waveform plays alone (any whole beats, ↶ undoes); ½, ◀ ▶ and „ganz“ still work.   node t-hx-bearbeiten.js
// (screenshots out/edit-*.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(async () => {
    const M = window.__M, A = M.A;
    await window.__reset(); window.__grid(110); await window.__sleep(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null); await window.__sleep(7000); M.HX.chips = null; M.setParam('hx.laenge', 'auto'); M.hxRailDirty(); await window.__sleep(300);
  });
  // 1. the menu
  const rb = await (await page.$('.hx-ring[data-slot="0"]')).boundingBox();
  await page.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2, { button: 'right' }); await page.waitForTimeout(250);
  const m1 = await page.evaluate(() => { const b = document.querySelector('.hx-cm'); return b && { items: [...b.querySelectorAll('.hx-cm-i')].map((x) => x.textContent), head: b.querySelector('.hx-cm-h').textContent, focus: document.activeElement && document.activeElement.classList.contains('hx-cm-i'), tips: [...b.querySelectorAll('.hx-cm-i')].every((x) => x.title.length > 8) }; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const gone = await page.evaluate(() => !document.querySelector('.hx-cm'));
  const eb = await (await page.$('.hx-ring[data-slot="3"]')).boundingBox();
  await page.mouse.click(eb.x + eb.width / 2, eb.y + eb.height / 2, { button: 'right' }); await page.waitForTimeout(200);
  const m2 = await page.evaluate(() => [...document.querySelectorAll('.hx-cm .hx-cm-i')].map((x) => x.textContent));
  await page.mouse.click(700, 300); await page.waitForTimeout(100);
  ok(m1 && /^Ansehen und bearbeiten/.test(m1.items[0]) && m1.items.includes('Karte – alle Einstellungen') && m1.items.includes('Stumm') && m1.items.includes('Solo') && m1.items.includes('Löschen') && /SCHLEIFE 1|Schleife 1/i.test(m1.head) && m1.focus && m1.tips, `a right click on a ring: its menu (${m1 && m1.items.join(' | ')})`);
  ok(gone && m2.length === 1 && m2[0] === 'Hier aufnehmen', `Escape closes it; an empty ring offers „Hier aufnehmen“ (${m2.join(', ')})`);
  // 2. Umschalt+1: the editor
  await page.keyboard.press('Shift+Digit1'); await page.waitForTimeout(700);
  const e1 = await page.evaluate(() => {
    const ed = document.querySelector('.hx-ed'), cv = ed && ed.querySelector('.hx-ed-cv'); if (!ed || ed.hidden) return null;
    const x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height).data; let wave = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] > 110 && d[i + 1] < 190 && d[i + 2] < 120) wave++;
    const st = ed.getBoundingClientRect(), stage = document.getElementById('stage').getBoundingClientRect();
    return { h: ed.querySelector('h3').textContent, wave, rows: ed.querySelectorAll('.hx-ed-srow').length, tools: [...ed.querySelectorAll('.hx-ed-row > .lab')].map((l) => l.textContent), over: st.top >= stage.top && st.bottom <= stage.bottom + 1 };
  });
  ok(e1 && e1.h === 'Schleife 1' && e1.wave > 2000 && e1.rows === 1 && ['Band', 'Trimmen', 'Zeit', 'Weglassen', 'Tauschen', 'Altern', 'Noten'].every((t) => e1.tools.includes(t)) && e1.over, `Umschalt+1 opens the editor over the field: waveform drawn, its Schicht, the tools (${JSON.stringify(e1)})`);
  await page.screenshot({ path: 'out/edit-open.png' });
  // the chips light what is set (owner, 26.10.2026: „weg 15 %“ changed the sound, the mark stayed on „weg aus“)
  const lit = await page.evaluate(async () => { const o = {}; const c = (row, t) => { const r = [...document.querySelectorAll('.hx-ed-row')].find((x) => x.querySelector('.lab').textContent === row); return [...r.querySelectorAll('.chip')].find((x) => x.textContent === t); };
    c('Weglassen', '15 %').click(); await window.__sleep(250); o.w = c('Weglassen', '15 %').getAttribute('aria-pressed') + c('Weglassen', 'aus').getAttribute('aria-pressed');
    c('Tauschen', '30 %').click(); await window.__sleep(250); o.t = c('Tauschen', '30 %').getAttribute('aria-pressed');
    c('Weglassen', 'aus').click(); await window.__sleep(250); o.a = c('Weglassen', 'aus').getAttribute('aria-pressed'); c('Tauschen', 'aus').click(); await window.__sleep(250); return o; });
  ok(lit.w === 'truefalse' && lit.t === 'true' && lit.a === 'true', `the gap chips light what is set (${JSON.stringify(lit)})`);
  // 3. a stretch dragged over the waveform: beats 3–5 of 8 play alone; ↶ gives the whole back
  const cb = await (await page.$('.hx-ed-cv')).boundingBox();
  await page.mouse.move(cb.x + cb.width * 0.27, cb.y + 50); await page.mouse.down(); await page.mouse.move(cb.x + cb.width * 0.6, cb.y + 60, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ sel: window.__M.HXE.sel, txt: document.querySelector('.hx-ed-sel .hx-ms').textContent }));
  await page.click('.hx-ed-sel .btn.primary'); await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => { const L = window.__M.hxLoopsLive()[0]; return { trim: L.trim, beats: L.d.beats, notes: L.notes.length }; });
  await page.screenshot({ path: 'out/edit-trim.png' });
  const u1 = await page.evaluate(async () => { const M = window.__M; M.hxUndoStep(); await window.__sleep(400); const L = M.hxLoopsLive()[0]; return { trim: L.trim, beats: L.d.beats, notes: L.notes.length }; });
  ok(s1.sel && s1.sel.a === 0.25 && s1.sel.b === 0.625 && /Schlag 3–5 von 8/.test(s1.txt), `a drag chooses whole beats (${JSON.stringify(s1)})`);
  ok(t1.beats === 3 && t1.trim && Math.abs(t1.trim.a - 0.25) < 1e-9 && Math.abs(t1.trim.f - 0.375) < 1e-9 && t1.notes === 3, `„Schleife auf die Auswahl kürzen“: 3 beats from beat 3, its 3 notes (${JSON.stringify(t1)})`);
  ok(u1.beats === 8 && !u1.trim && u1.notes === 8, `↶ gives the whole loop back (${JSON.stringify(u1)})`);
  // 4. ½, ▶ and ganz still work (the card's chips)
  const t2 = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {};
    M.hxBandTrim(L, 'h'); await window.__sleep(200); o.h = [L.trim.f, M.hxTrA(L.trim), L.d.beats];
    M.hxBandTrim(L, '>'); await window.__sleep(200); o.r = [L.trim.f, M.hxTrA(L.trim), L.d.beats];
    M.hxBandTrim(L, '>'); await window.__sleep(200); o.r2 = M.hxTrA(L.trim);
    M.hxBandTrim(L, 'ganz'); await window.__sleep(200); o.g = [L.trim, L.d.beats];
    o.short = M.hxBandTrimTo(L, 0, 1 / 16);
    return o;
  });
  ok(t2.h.join() === '0.5,0,4' && t2.r.join() === '0.5,0.5,4' && t2.r2 === 0 && t2.g[0] === null && t2.g[1] === 8 && t2.short === false, `½, ▶ (wraps), ganz as before; less than a beat is refused (${JSON.stringify(t2)})`);
  // 4b. (owner, 26.10.2026) Weglassen and Tauschen each switch off again; every edit undoable at once; „Grundeinstellung“
  const u = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {}, c = (row, t) => { const r = [...document.querySelectorAll('.hx-ed-row')].find((x) => x.querySelector('.lab').textContent === row); return r && [...r.querySelectorAll('.chip')].find((x) => x.textContent === t); };
    const pr = (row, t) => { const x = c(row, t); return x ? x.getAttribute('aria-pressed') : 'none'; };
    c('Tauschen', '15 %').click(); await window.__sleep(250); o.t1 = [pr('Tauschen', '15 %'), L.slc.pw];
    c('Tauschen', 'aus').click(); await window.__sleep(250); o.t0 = [pr('Tauschen', 'aus'), pr('Tauschen', '15 %'), L.slc.pw];
    c('Weglassen', '30 %').click(); await window.__sleep(250); o.w1 = [pr('Weglassen', '30 %'), L.slc.pd];
    // ↶ after each: Weglassen, Verblassen, Abrieb, a Schicht stumm, rückwärts, Noten
    const und = async () => { document.querySelector('.hx-ed-hb .btn[aria-label="Rückgängig"]').click(); await window.__sleep(250); };
    await und(); o.uw = L.slc.pd;
    c('Altern', 'verblassen mittel').click(); await window.__sleep(200); o.vb = L.vb; await und(); o.uvb = L.vb;
    c('Altern', 'Abrieb mittel').click(); await window.__sleep(200); o.ab = L.ab && L.ab.rate; await und(); o.uab = L.ab;
    [...document.querySelectorAll('.hx-ed-srow .chip')].find((x) => x.textContent === 'stumm').click(); await window.__sleep(200); const S = M.HX.sch.get(L.sch[0]); o.m = S.mute; await und(); o.um = M.HX.sch.get(L.sch[0]).mute;
    c('Noten', 'Umkehrung').click(); await window.__sleep(200); o.nt = L.nt && L.nt.umk; await und(); o.unt = !!(L.nt && L.nt.umk);
    c('Band', '½').click(); await window.__sleep(150); o.sp = L.sp; await und(); o.usp = L.sp;
    // Grundeinstellung: many at once, one step back
    M.hxRev(L); M.hxSlcSet(L, 'pd', 0.5); M.hxSlcSet(L, 'pw', 0.3); M.hxVbSet(L, 0.75); M.hxAbSet(L, 0.25); M.hxNtSet(L, 'umk'); await window.__sleep(400);
    const n0 = M.HX.hist.length;
    [...document.querySelectorAll('.hx-ed-hb .btn')].find((x) => x.textContent === 'Grundeinstellung').click(); await window.__sleep(500);
    o.def = { rev: L.rev, pd: L.slc.pd, pw: L.slc.pw, vb: L.vb, ab: L.ab, umk: !!(L.nt && L.nt.umk), steps: M.HX.hist.length - n0, last: M.HX.hist[M.HX.hist.length - 1].label };
    await und(); await window.__sleep(300);
    o.back = { rev: L.rev, pd: L.slc.pd, pw: L.slc.pw, vb: L.vb, ab: L.ab && L.ab.rate, umk: !!(L.nt && L.nt.umk) };
    M.hxDefaults(L); await window.__sleep(400);
    return o;
  });
  ok(u.t1[0] === 'true' && u.t1[1] === 0.15 && u.t0.join() === 'true,false,0' && u.w1[0] === 'true' && u.w1[1] === 0.3, `Tauschen on and off again, Weglassen on its own row (${JSON.stringify([u.t1, u.t0, u.w1])})`);
  ok(u.uw === 0 && u.vb === 0.9 && u.uvb === 1 && u.ab === 0.1 && !u.uab && u.m === true && u.um === false && u.nt === true && !u.unt && u.sp === 0.5 && u.usp === 1, `every edit undone at once by ↶: Weglassen, Verblassen, Abrieb, a Schicht stumm, Umkehrung, Band (${JSON.stringify(u)})`);
  ok(!u.def.rev && u.def.pd === 0 && u.def.pw === 0 && u.def.vb === 1 && !u.def.ab && !u.def.umk && u.def.steps === 1 && /Grundeinstellung/.test(u.def.last), `„Grundeinstellung“: all back as one step (${JSON.stringify(u.def)})`);
  ok(u.back.rev === true && u.back.pd === 0.5 && u.back.pw === 0.3 && u.back.vb === 0.75 && u.back.ab === 0.25 && u.back.umk === true, `… and ↶ gives every edit back (${JSON.stringify(u.back)})`);
  // 4c. the waveform shows what sounds: rendered by the processor, it changes with the edits
  const wv = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], q = async () => { for (let i = 0; i < 60 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && !M.HXE.rw.none); i++) await window.__sleep(100); const r = M.HXE.rw; if (!r || r.none) return null; let e = 0, quiet = 0; for (let x = 0; x < r.mx.length; x++) { const v = r.mx[x] - r.mn[x]; e += v; if (v < 0.004) quiet++; } return { e: +e.toFixed(2), quiet }; };
    const a = await q(); M.hxSlcSet(L, 'pd', 0.5); await window.__sleep(300); const b = await q(); M.hxVbSet(L, 0.75); await window.__sleep(300); const c2 = await q();
    M.hxDefaults(L); await window.__sleep(300); const d = await q();
    return { a, b, c: c2, d };
  });
  ok(wv.a && wv.b && wv.c && wv.d && wv.b.e < wv.a.e * 0.85 && wv.b.quiet > wv.a.quiet && wv.c.e < wv.b.e && Math.abs(wv.d.e - wv.a.e) < wv.a.e * 0.05, `the waveform is the loop as it sounds: 50 % weggelassen emptier, Verblassen quieter, Grundeinstellung as before (${JSON.stringify(wv)})`);
  await page.screenshot({ path: 'out/edit-render.png' });
  // 4d. (owner, 26.10.2026) a stretch edited on its own: the rest stays sample for sample; one step each, ↶ back exactly
  const rg = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {};
    const S0 = () => M.HX.sch.get(L.sch[0]), rd = (S, f) => { const c = S.aud[Math.floor(f / 8192)]; return c ? c[0][f % 8192] : 0; };
    const fp = (S, f0, f1) => { let h = 0; for (let f = f0; f < f1; f += 7) h = (h * 31 + Math.round(rd(S, f) * 1e6)) | 0; return h; };
    let S = S0(); const half = Math.round(S.len / 2), X = 260;
    const fA = fp(S, S.pre, S.pre + half - X), fB = fp(S, S.pre + half + X, S.pre + S.len), n0 = M.HX.hist.length;
    M.HXE.sel = { a: 0, b: 0.5 }; M.hxEdRender(); await window.__sleep(200);
    const part = document.querySelector('.hx-ed-part'); o.part = part && part.querySelector('.hx-ed-st').textContent;
    [...part.querySelectorAll('.chip')].find((x) => x.textContent === '×2').click(); await window.__sleep(400);
    S = S0(); o.x2 = { first: fp(S, S.pre, S.pre + half - X) !== fA, rest: fp(S, S.pre + half + X, S.pre + S.len) === fB, steps: M.HX.hist.length - n0, label: M.HX.hist[M.HX.hist.length - 1].label, len: S.len };
    // the second half on its own: still ×1 – then softer only there
    M.HXE.sel = { a: 0.5, b: 1 }; M.hxEdRender(); await window.__sleep(150);
    const fA2 = fp(S, S.pre, S.pre + half - X);
    [...document.querySelectorAll('.hx-ed-part .chip')].find((x) => x.textContent === 'stumm').click(); await window.__sleep(400);
    S = S0(); let e2 = 0; for (let f = S.pre + half + X; f < S.pre + S.len - X; f += 5) e2 += Math.abs(rd(S, f));
    o.mute = { firstKept: fp(S, S.pre, S.pre + half - X) === fA2, silent: e2 < 1e-6 };
    for (const t of ['rückwärts', '30 %']) { const c = [...document.querySelectorAll('.hx-ed-part .chip')].find((x) => x.textContent === t); c.click(); await window.__sleep(300); }
    const tw = [...document.querySelectorAll('.hx-ed-part .hx-ed-row')].find((r) => r.querySelector('.lab').textContent === 'Tauschen'); [...tw.querySelectorAll('.chip')][0].click(); await window.__sleep(300);
    o.steps = M.HX.hist.length - n0;
    for (let i = 0; i < o.steps; i++) { M.hxUndoStep(); await window.__sleep(150); }
    S = S0(); o.back = fp(S, S.pre, S.pre + half - X) === fA && fp(S, S.pre + half + X, S.pre + S.len) === fB;
    // the whole tape ×2: the waveform shows a loop half as long
    M.HXE.sel = null; M.hxSpeed(L, 2); await window.__sleep(300); o.wf = M.hxEdWf(L); M.hxUndoStep(); await window.__sleep(200); o.wf1 = M.hxEdWf(L);
    return o;
  });
  ok(/^Abschnitt bearbeiten – Takt 1/.test(rg.part) && rg.x2.first && rg.x2.rest && rg.x2.steps === 1 && /Abschnitt Takt 1 Band ×2/.test(rg.x2.label), `a stretch on its own: Takt 1 ×2 changes it, the rest stays sample for sample, one step (${JSON.stringify(rg.x2)}; „${rg.part}“)`);
  ok(rg.mute.firstKept && rg.mute.silent, `the next stretch still as it was, then silenced alone (${JSON.stringify(rg.mute)})`);
  ok(rg.steps === 5 && rg.back, `rückwärts, Weglassen, Tauschen too – each a step; ↶ five times: the audio exactly as before (${rg.steps}, ${rg.back})`);
  ok(rg.wf === 0.5 && rg.wf1 === 1, `the whole tape ×2: the waveform shows the loop half as long (${rg.wf} → ${rg.wf1})`);
  // 4e. (owner, 26.10.2026: „die Waveform wird nicht aktualisiert“) a change waiting for the next seam: the picture is the
  // coming pass – filled to its end, not cut off at the old pass's length – and says when it is heard
  const pend = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], q = async () => { for (let i = 0; i < 80 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && !M.HXE.rw.none); i++) await window.__sleep(100); const r = M.HXE.rw; if (!r || r.none) return null; const n = r.mx.length, a = Math.floor(n * 0.8); let tail = 0; for (let x = a; x < n; x++) tail += r.mx[x] - r.mn[x]; return +tail.toFixed(2); };
    M.hxSpeed(L, 0.5); await window.__sleep(250); const t1 = await q(); const w = document.querySelector('.hx-ed-wait'); const say = w && w.textContent;
    M.hxUndoStep(); await window.__sleep(300);
    M.hxBandTrimTo(L, 0, 0.5); await window.__sleep(250); const t2 = await q(); M.hxUndoStep(); await window.__sleep(300);
    return { t1, t2, say };
  });
  ok(pend.t1 > 1 && pend.t2 > 1 && /ab der nächsten Naht, in \d+ s/.test(pend.say || ''), `a change still waiting for its seam is drawn whole – Band ½ and „nur die erste Hälfte“ fill the picture to its end, and it says when (${JSON.stringify(pend)})`);
  // 5. Escape closes; the mixer's strip head opens it
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  const closed = await page.evaluate(() => document.querySelector('.hx-ed').hidden);
  await page.evaluate(async () => { const M = window.__M; M.openPanel('mix'); await window.__sleep(300); M.mxSetView('schleifen'); await window.__sleep(500); document.querySelector('.hxm-st .hxm-sh').click(); await window.__sleep(400); });
  const fromMix = await page.evaluate(() => { const ed = document.querySelector('.hx-ed'); return !ed.hidden && ed.querySelector('h3').textContent; });
  ok(closed && fromMix === 'Schleife 1', `Escape closes the editor; a strip's head in the mixer opens it (${fromMix})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
