// The looper explains itself (owner, 25.10.2026): every visible control of the Ringleiste and of the card has a tooltip
// (title) in plain words, the rows' labels too; a playing loop lights up – its ring button carries .spielt (its word in
// lumen; the canvas draws the glow), a muted one not; no word under a loop's ring; the row after a harvest stays.   node t-hx-tips.js   (screenshot out/rail-glow.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(async () => {
    const M = window.__M, A = M.A;
    await window.__reset(); window.__grid(110); await window.__sleep(300);
    for (const d of [[0, 4, 7, 4, 2, 5, 9, 5], [7, 9, 11, 12, 11, 9, 7, 4], [0, 0, 2, 2, 4, 4, 5, 5]]) {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, d, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null); await window.__sleep(400);
    }
    await window.__sleep(10500);
    window.__chipsLeft = M.HX.chips ? M.HX.chips.kind : null;   // (owner, 25.10.2026: the row after a harvest stays until closed)
    M.hxState(M.hxLoopsLive()[1].id, 'stumm'); await window.__sleep(2500);
    M.openPanel('rec'); await window.__sleep(800);
    M.HX.chips = null; M.hxRailDirty(); await window.__sleep(600);
  });
  const r = await page.evaluate(() => {
    const miss = [], n = { all: 0, ok: 0 };
    for (const root of [document.getElementById('hxRail'), document.getElementById('hxSec')]) for (const el of root.querySelectorAll('button, select, input[type="range"]')) {
      if (el.hidden || !el.offsetParent) continue; n.all++; if (el.title && el.title.length > 8) n.ok++; else miss.push((el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30));
    }
    const labs = [...document.querySelectorAll('#hxSec .hx-row > .lab')].filter((l) => l.offsetParent), labOk = labs.filter((l) => l.title).length;
    const rings = [...document.querySelectorAll('.hx-ring')].slice(0, 3).map((b) => b.classList.contains('spielt'));
    const words = [...document.querySelectorAll('.hx-ring')].slice(0, 3).map((b) => b.querySelector('.w').textContent);
    return { n, miss, labs: labs.length, labOk, rings, words, chips: window.__chipsLeft };
  });
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toast, #toast')) t.style.display = 'none'; });
  await (await page.$('#hxRail')).screenshot({ path: 'out/rail-glow.png' });
  ok(r.n.all > 100 && r.n.ok === r.n.all, `every visible control of the rail and the card has a tooltip (${r.n.ok} of ${r.n.all}${r.miss.length ? '; without: ' + r.miss.join(', ') : ''})`);
  ok(r.labs > 10 && r.labOk >= r.labs - 1, `the card's rows explain themselves on their label (${r.labOk} of ${r.labs})`);
  ok(r.rings[0] && !r.rings[1] && r.rings[2], `playing loops light up, a muted one not (${r.rings.join(', ')})`);
  ok(r.chips === 'ernte', `the row after a harvest is still there 10 s later (${r.chips}) – it stays until you close it`);
  ok(r.words.every((w) => w === ''), `no word under a loop's ring – it glows while it plays (${JSON.stringify(r.words)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
