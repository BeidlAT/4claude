// The Touché's Platte (owner, 25.10.2026; IDEEN Touché 5): the hand on a loop's tape – away brakes down to nearly
// standing, toward pushes, let go the motor takes it back; the processor glides straight (band {lin}) and the loop
// stays on its grid; a loop's own speed step is its rest.   node t-hx-touche.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    await window.__reset(); window.__grid(100); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 4, 7, 4, 2, 5, 9, 5], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0], vs = async () => { const rep = await M.hxReport(); const x = rep.sl.find((q) => q[0] === L.id); return x && +x[2].toFixed(3); };
    const o = { state: L.state, v0: await vs() };
    M.tchPlatte(0.5); await sl(250); o.half = await vs(); o.held = M.TCH.pl && M.TCH.pl.id === L.id;
    M.tchPlatte(0.03); await sl(250); o.stand = await vs();
    M.tchPlatte(1.6); await sl(250); o.push = await vs();
    M.tchPlatte(1); await sl(400); o.back = await vs(); o.free = !M.TCH.pl;
    o.b0 = L.d.beats; o.k = L.state;
    return o;
  });
  ok(r.state === 'spielt' && r.v0 === 1, `a loop plays at its own speed (${r.v0})`);
  ok(r.half === 0.5 && r.held, `the hand brakes it to half (${r.half})`);
  ok(r.stand === 0.03, `pressed hard: nearly standing (${r.stand})`);
  ok(r.push === 1.6, `pulled toward you: pushed faster (${r.push})`);
  ok(r.back === 1 && r.free && r.b0 === 4 && r.k === 'spielt', `let go: back at its speed, its length and state unchanged (${r.back}, ${r.b0} beats, ${r.k})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
