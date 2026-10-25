// Every press answers (owner, 25.10.2026: a click often seemed to do nothing): the pressed button flashes (.hx-blitz),
// what happened shows as a line over the rail (#hxMsg, what hxSay says), a change waiting for its bar line keeps its
// ring marked (L.pendTo); a toast for the same moment wins over the line.   node t-hx-rueck.js   (screenshot out/rail-rueck.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(async () => {
    const M = window.__M, A = M.A;
    await window.__reset(); window.__grid(100); await window.__sleep(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null); await window.__sleep(600);
    M.HX.chips = null; M.hxRailDirty(); await window.__sleep(5000);
  });
  // a real press on ring 1, at mid-bar (so the change waits for the bar line)
  await page.evaluate(async () => { const M = window.__M; const A = M.A, b = M.tgBeat(A.ctx.currentTime); const t = M.tgTime(Math.floor(b / 4) * 4 + 5.5); while (A.ctx.currentTime < t) await window.__sleep(20); });
  const box = await (await page.$('.hx-ring[data-slot="0"]')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  const r1 = await page.evaluate(async () => { await window.__sleep(60); const m = document.getElementById('hxMsg'); return { blitz: document.querySelectorAll('.hx-blitz').length, on: m.classList.contains('an'), msg: m.textContent, vis: getComputedStyle(m).opacity }; });
  await page.mouse.up();
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toast, #toast')) t.style.display = 'none'; });
  await page.screenshot({ path: 'out/rail-rueck.png', clip: { x: 0, y: box.y - 90, width: 1440, height: 160 } });
  const r2 = await page.evaluate(async () => { const M = window.__M, L = M.hxLoopsLive()[0]; const o = { pendTo: L.pendTo, pend: M.HX.pend.length }; await window.__sleep(5200); const m = document.getElementById('hxMsg'); o.later = m.classList.contains('an'); o.blitz = document.querySelectorAll('.hx-blitz').length; o.state = L.state; return o; });
  // a toast for the same moment: the line gives way
  const r3 = await page.evaluate(async () => { const M = window.__M; M.hxUndoStep(); await window.__sleep(50); M.hxUndoStep(); await window.__sleep(50); return document.getElementById('hxMsg').classList.contains('an'); });
  // a key press flashes too
  const r4 = await page.evaluate(async () => { const b = document.getElementById('hxUndo'); b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); return document.querySelectorAll('.hx-blitz').length; });
  ok(r1.blitz >= 1, `the pressed ring flashes (${r1.blitz})`);
  ok(r1.on && /Schleife 1/.test(r1.msg) && /Takt/.test(r1.msg), `the line over the rail says what happens: „${r1.msg}“`);
  ok(r2.pendTo === 'stumm' && r2.pend === 1, `the change waits for its bar line, its ring marked (${r2.pendTo}, ${r2.pend} pending)`);
  ok(!r2.later && r2.blitz === 0 && r2.state === 'stumm', `line and flash are gone afterwards, the loop is stumm (${r2.later}, ${r2.blitz}, ${r2.state})`);
  ok(!r3, `a toast for the same moment wins over the line (${r3})`);
  ok(r4 >= 1, `a key press flashes too (${r4})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
