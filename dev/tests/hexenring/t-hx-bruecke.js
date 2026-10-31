// Hexenring – ein gewählter Klang ohne Warten, mit Sekunden (owner, 31.10.2026: „sind diese langen Wartezeiten
// unvermeidlich?“ … „da waren immer Sekunden angegeben … kompletter Fail“): a Schleife of 8 s a pass, another instrument
// chosen while it plays –
//  1 the editor says in seconds when it sets in („setzt in N s ein“), and nothing once it plays (owner: „wieso eine
//    Sekundenanzeige, wenn es währenddessen gestreamt wird?“) – never a word without a number
//  2 the pass playing streams the new sound from a moment ahead (not after the whole render): the stream's slot taken
//    within ~2 s of the choice; the loop never falls silent meanwhile
//  3 the render done: the whole new version plays, the stream ended
//                                                                                        node t-hx-bruecke.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const r = await page.evaluate(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 32; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2, 5, 4, 2, 1][i % 8], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 16) + 0.04); M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]); M.hxWNotesAll(L);
    for (let i = 0; i < 300 && !(S.aud && (S.baked || !S.chain) && S.wn); i++) { await sl(100); M.hxWNotesAll(L); }
    // just after a seam: most of the pass still to come
    const k = M.hxPassK(L, M.hxF(A.ctx.currentTime)); await window.__until(M.hxT(M.hxPassF(L, k + 1)) + 0.3);
    M.hxEdOpen(L); await sl(300);
    const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.out.connect(an); const b = new Float32Array(2048);
    const sel = document.querySelector('.hx-ed-instrow select'); sel.value = 'hau'; const t0 = A.ctx.currentTime; sel.dispatchEvent(new Event('change'));
    o.texts = []; o.minDb = 0; let took = null;
    for (let i = 0; i < 400; i++) {
      await sl(100);
      const tx = (document.querySelector('.hx-ed-wait') || document.querySelector('.hx-ed .hx-ed-w') || {}).textContent || [...document.querySelectorAll('.hx-ed *')].map((e) => (!e.children.length ? e.textContent : '')).find((x) => /neue Klang|neu gespielt/.test(x)) || '';
      if (tx) o.texts.push(tx); if (took != null && A.ctx.currentTime > M.hxT(S.wBrAt) + 0.5 && tx) o.after = tx;
      an.getFloatTimeDomainData(b); let q = 0; for (const x of b) q += x * x; o.minDb = Math.min(o.minDb, 10 * Math.log10(q / b.length + 1e-20));
      if (took == null && S.wBrAt != null && A.ctx.currentTime >= M.hxT(S.wBrAt)) took = +(M.hxT(S.wBrAt) - t0).toFixed(2);
      if (!S.wBusy && S.wu && S.wu.aud && S.play === 'wu') break;
    }
    A.out.disconnect(an);
    o.took = took; o.end = { play: S.play, br: !!S.wBr, busy: !!S.wBusy }; o.renderS = +(A.ctx.currentTime - t0).toFixed(1);
    o.texts = [...new Set(o.texts)];
    return o;
  }, BPM);
  const noNum = r.texts.filter((t) => !/\d+ s/.test(t));
  ok(r.texts.length && !noNum.length, `the wait said in seconds: ${r.texts.slice(0, 4).join(' | ')}${noNum.length ? ' — without: ' + noNum.join(' | ') : ''}`);
  ok(!r.after, `once it plays: no wait shown${r.after ? ' (but: ' + r.after + ')' : ''}`);
  ok(r.took != null && r.took < 2.5, `the new sound sets in ${r.took} s after the choice (the whole render took ${r.renderS} s)`);
  ok(r.minDb > -60, `never silent meanwhile (quietest 46 ms: ${r.minDb.toFixed(1)} dB)`);
  ok(r.end.play === 'wu' && !r.end.br && !r.end.busy, `the render done: the whole new version plays, the stream ended (${JSON.stringify(r.end)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
