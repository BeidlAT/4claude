// Hexenring – (review 30.10.2026) a halt now overrides what a Schleife still had coming: ▶ Weiter (or a Lichtung's
// start) waits for the next 1, Stille before it – the Schleife stays angehalten at that 1 (ring.js at(): an immediate
// 'angehalten' with over drops the loop's queued state events). Control: Weiter alone does start it.
//                                                                                         node t-hx-stillevor.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(async (BPM) => {
    const M = window.__M, A = M.A;
    // a Schleife's loudest level over ms, as the processor reports it (dB)
    window.__lv = async (id, ms) => { const m = await window.__meter(id, ms), mx = Math.max(0, ...m.map((x) => x[1])); return mx > 0 ? +(20 * Math.log10(mx)).toFixed(1) : -200; };
    window.__nextBar = (lead = 0.15) => Math.ceil(M.tgBeat(A.ctx.currentTime + lead) / 4 - 1e-9) * 4;
    await window.__reset(); window.__grid(BPM); await window.__sleep(400);
    // a Schleife of one bar: a figure from the next bar line, harvested right after its end
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, beat = 60 / BPM, list = [];
    for (let i = 0; i < 4; i++) list.push([M.tgTime(B0) + i * beat, [0, 2, 4, 2][i], 0.9, 0.4]);
    window.__play(list, { eng: 'glo' });
    await window.__until(M.tgTime(B0 + 4) + 0.04);
    M.hxKorb(null); await window.__sleep(300);
  }, BPM);

  const r = await ev(async () => {
    const M = window.__M, o = {}, L = M.hxLoopsLive()[0];
    o.n = M.hxLoopsLive().length;
    await window.__sleep(1200); o.plays = await window.__lv(L.id, 600);
    M.hxStille(); await window.__sleep(500); o.still = await window.__lv(L.id, 400);
    // Weiter waits for the next 1 – Stille before it
    M.hxWeiter(); const b = window.__nextBar(0.05); o.pend = M.HX.pend.some((p) => p.kind === 'weiter');
    await window.__sleep(30); M.hxStille();
    await window.__until(M.tgTime(b) + 0.3); o.after = await window.__lv(L.id, 700); o.st = L.state;
    // control: Weiter alone starts it at the 1
    M.hxWeiter(); const b2 = window.__nextBar(0.05);
    await window.__until(M.tgTime(b2) + 0.3); o.back = await window.__lv(L.id, 700); o.st2 = L.state;
    M.hxStille();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.n === 1 && r.plays > -60 && r.still < -90, `a Schleife plays (${r.plays} dB), Stille halts it (${r.still} dB)`);
  ok(r.pend && r.after < -90 && r.st === 'angehalten', `▶ Weiter, then Stille before the next 1: it stays angehalten at that 1 (${r.after} dB, ${r.st})`);
  ok(r.back > -60 && r.st2 === 'spielt', `▶ Weiter alone starts it at the next 1 (${r.back} dB, ${r.st2})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
