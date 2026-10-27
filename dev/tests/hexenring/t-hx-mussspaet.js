// (owner, 27.10.2026, Firefox: „wenn ich eine schleife erstelle, dann das preset wechsle, verstummt alles“) A pass that must
// come after a follow change (a preset in another key) and never arrives – the Werk-Rahmen rendered nothing there – left
// the Schicht silent for good (ch 0, tot 0). Now the version it has plays on until the new one is there.
// node t-hx-mussspaet.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.6, [0, 4, 7, 4], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null);
    for (let i = 0; i < 100 && !M.hxLoopsLive().every((L) => L.sch.every((id) => M.HX.sch.get(id).aud)); i++) await sl(100);
    await sl(3000);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]);
    const rep = async () => (await M.hxReport()).lp.find((x) => x.id === L.id);
    const lvl = async (ms) => { const m = await window.__meter(L.id, ms); return Math.max(...m.map((x) => x[1])); };
    o.before = await lvl(1200);
    // the pass after the next: a slot that must come, whose blocks never do (its port stays silent)
    const p = await rep(), ch = new MessageChannel();
    M.hxPost({ wst: { schicht: S.id, k: p.k + 1, len: p.s1 - p.s0, cap: (p.s1 - p.s0) + 4096, must: true, from: 0, port: ch.port1 } }, [ch.port1]);
    await sl(Math.ceil(((p.s1 - p.s0) * 2) / 48)); 
    const q = await rep(); o.ch = q.sch[0].ch; o.tot = q.sch[0].tot; o.k = q.k - p.k;
    o.after = await lvl(2500);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.before > 0.02, `the loop sounds (${r.before.toFixed(3)})`);
  ok(r.k >= 2 && r.ch > 0 && r.tot > 0, `the pass that must come never came: the Schicht keeps its version (${r.ch} chunks, ${r.tot} frames)`);
  ok(r.after > r.before * 0.5, `…and goes on sounding (${r.after.toFixed(3)})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
