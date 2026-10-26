// (owner, 26.10.2026) the Aufnahme panel: each Schleife's entry folds (closed: only its line; a tap opens it, remembered);
// the length note is one sentence („64 Takte … = 2:45,5“, the rest on hover); „Alle löschen“ removes every take after a
// second tap.                                                                         node t-hx-falten.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    for (let k = 0; k < 2; k++) { const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4; window.__riff(M.tgTime(B0), 0.3, [k, 4, 7, 4], 1, { eng: 'klb', dur: 0.25 }); await window.__until(M.tgTime(B0 + 4) + 0.06); M.hxKorb(null); }
    // two takes of a bar each
    M.setParam('rec.len', 'bars'); M.setParam('rec.bars', 1);
    for (let k = 0; k < 2; k++) { const n0 = M.takes.length; M.recToggle(); for (let i = 0; i < 80 && M.takes.length === n0; i++) await sl(100); await sl(600); }
    M.openPanel('rec'); await sl(800);
    const cards = () => [...document.querySelectorAll('.hx-card')];
    o.n = cards().length; o.closed = cards().filter((c) => c.classList.contains('zu')).length;
    o.hidden = cards()[0] && getComputedStyle(cards()[0].querySelector('.hx-row')).display === 'none';
    cards()[0].querySelector('.hx-fold').click(); await sl(400);
    o.open1 = cards().filter((c) => !c.classList.contains('zu')).length;
    o.store = localStorage.getItem('myzel.hxAuf');
    o.bar = document.querySelector('.recbig').closest('.sec').querySelector('p.note').textContent;
    const ta = document.querySelector('.take-all button'); o.takes0 = M.takes.length;
    if (ta) { ta.click(); await sl(100); o.ask = ta.textContent; ta.click(); await sl(300); }
    o.takes1 = M.takes.length;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.n === 2 && r.closed === 2 && r.hidden, `two Schleifen, both folded (only their line)`);
  ok(r.open1 === 1 && /\[.+\]/.test(r.store), `a tap opens one, remembered (${r.store})`);
  ok(/^1 Takt im 4\/4-Takt bei [\d,]+ BPM \(.+\) = [\d:,]+\.$/.test(r.bar), `the length note is one sentence: „${r.bar}“`);
  ok(r.takes0 >= 2 && /Wirklich alle/.test(r.ask || '') && r.takes1 === 0, `„Alle löschen“: ${r.takes0} takes, „${r.ask}“, then ${r.takes1}`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
