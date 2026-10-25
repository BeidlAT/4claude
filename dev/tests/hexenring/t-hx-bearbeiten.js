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
  ok(e1 && e1.h === 'Schleife 1' && e1.wave > 2000 && e1.rows === 1 && ['Band', 'Trimmen', 'Zeit', 'Lücken', 'Noten'].every((t) => e1.tools.includes(t)) && e1.over, `Umschalt+1 opens the editor over the field: waveform drawn, its Schicht, the tools (${JSON.stringify(e1)})`);
  await page.screenshot({ path: 'out/edit-open.png' });
  // 3. a stretch dragged over the waveform: beats 3–5 of 8 play alone; ↶ gives the whole back
  const cb = await (await page.$('.hx-ed-cv')).boundingBox();
  await page.mouse.move(cb.x + cb.width * 0.27, cb.y + 50); await page.mouse.down(); await page.mouse.move(cb.x + cb.width * 0.6, cb.y + 60, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ sel: window.__M.HXE.sel, txt: document.querySelector('.hx-ed-sel .hx-ms').textContent }));
  await page.click('.hx-ed-sel .btn.primary'); await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => { const L = window.__M.hxLoopsLive()[0]; return { trim: L.trim, beats: L.d.beats, notes: L.notes.length }; });
  await page.screenshot({ path: 'out/edit-trim.png' });
  const u1 = await page.evaluate(async () => { const M = window.__M; M.hxUndoStep(); await window.__sleep(400); const L = M.hxLoopsLive()[0]; return { trim: L.trim, beats: L.d.beats, notes: L.notes.length }; });
  ok(s1.sel && s1.sel.a === 0.25 && s1.sel.b === 0.625 && /Schlag 3–5 von 8/.test(s1.txt), `a drag chooses whole beats (${JSON.stringify(s1)})`);
  ok(t1.beats === 3 && t1.trim && Math.abs(t1.trim.a - 0.25) < 1e-9 && Math.abs(t1.trim.f - 0.375) < 1e-9 && t1.notes === 3, `„Nur die Auswahl spielen“: 3 beats from beat 3, its 3 notes (${JSON.stringify(t1)})`);
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
  // 5. Escape closes; the mixer's strip head opens it
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  const closed = await page.evaluate(() => document.querySelector('.hx-ed').hidden);
  await page.evaluate(async () => { const M = window.__M; M.openPanel('mix'); await window.__sleep(300); M.mxSetView('schleifen'); await window.__sleep(500); document.querySelector('.hxm-st .hxm-sh').click(); await window.__sleep(400); });
  const fromMix = await page.evaluate(() => { const ed = document.querySelector('.hx-ed'); return !ed.hidden && ed.querySelector('h3').textContent; });
  ok(closed && fromMix === 'Schleife 1', `Escape closes the editor; a strip's head in the mixer opens it (${fromMix})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
