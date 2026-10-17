// Final QA (gq): the rain and the rattle in a busy preset. Kalimbatraum (its Gestik recipe: Sporenregen with Kalimba)
// with its Puls running keeps the voice budget full of ringing Kalimba tails; before the fix the rain struck once and
// fell silent (it made room only from its own voices). Now a fading tail makes room – faded out in ~25 ms (steal(…, soft)),
// never cut by kill() (a click), never a held note. The same for the Rassel (Ladung's strikes while shaking).
//   node t-gq-rain.js        (slot gq: sh ../v2/mk.sh /home/user/4claude/myzel gq)
const { open, ok, close, tools } = require('./gs-h');
const URL = process.env.GQ || 'http://127.0.0.1:8790/gq-inst/index.html';
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
(async () => {
  const { page, errors } = await open({ url: URL, vp: { width: 390, height: 844, touch: true, mobile: true, ua: DROID_UA }, cfg: { seed: 31 } });
  await page.evaluate(() => window.__M.openPanel('dev'));
  await page.click('[data-gk="on"]');
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  await page.waitForTimeout(800);
  await tools(page);
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, s = window.__sleep, K = [];
    M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum'));
    M.closePanel();
    await s(600);
    if (!M.SEQ.on) M.seqStart();
    const kill = M.Voice.prototype.kill;
    M.Voice.prototype.kill = function () { if (window.__rec) K.push({ g: this.out.gain.value, own: /rgStrike|ladRassel/.test(new Error().stack) }); return kill.call(this); };
    const W = M.VIS.w, H = M.VIS.h;
    for (const [x, y] of [[0.2, 0.5], [0.45, 0.5], [0.7, 0.5]]) { const id = 'k' + x; M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * W, py: (1 - y) * H } }); await s(60); M.onUp({ pointerId: id, pointerType: 'touch' }); }
    // a note held through it all (a finger resting on the field): never taken for the rain
    M.onDown({ pointerId: 'held', pointerType: 'touch', pt: { x: 0.9, y: 0.8, px: 0.9 * W, py: 0.2 * H } });
    const held = M.touches.get('held'), hv = held.voices.map((x) => x.v);
    window.__setPose({ beta: 30, roll: 18 });
    await s(1500);
    const n0 = M.RG.n, full0 = { vo: A.voices.size, rel: [...A.voices].filter((v) => v.released).length };
    window.__rec = true;
    await s(6000);
    const rain = { strikes: M.RG.n - n0, recipe: M.GK.rz && M.GK.rz.key, seq: M.SEQ.on, full0 };
    // the Rassel: Sporenregen off, Ladung's strikes on, two seconds of shaking
    M.gkSet('neigen', 'anl'); M.gkSet('ras', true);
    window.__setPose({ beta: 45, roll: 0 }); await s(600);
    const l0 = M.LAD.n, t0 = performance.now();
    while (performance.now() - t0 < 2200) { const k = Math.sin(2 * Math.PI * 5 * (performance.now() - t0) / 1000); window.__S.p = { beta: 45, roll: 6 * k, lin: [16 * k, 3.2 * k, 0] }; await s(8); }
    window.__S.p = { beta: 45, roll: 0 };
    await s(300);
    window.__rec = false;
    const ras = { strikes: M.LAD.n - l0 };
    const heldAlive = hv.every((v) => v.alive && A.voices.has(v)) && M.touches.has('held');
    M.onUp({ pointerId: 'held', pointerType: 'touch' });
    M.Voice.prototype.kill = kill;
    return { rain, ras, kills: K.length, loud: K.filter((k) => k.g > 0.02).length, own: K.filter((k) => k.own).length, heldAlive };
  });
  console.log('INFO ' + JSON.stringify(r));
  ok(r.rain.recipe === 'kalimbatraum' && r.rain.seq && r.rain.full0.rel >= 6, 'Kalimbatraum\'s recipe rains, its Puls running, the budget full of ringing tails (' + JSON.stringify(r.rain.full0) + ')');
  ok(r.rain.strikes >= 6, 'the rain keeps striking: ' + r.rain.strikes + ' strikes in 6 s (before the fix: one, then silence)');
  ok(r.ras.strikes >= 3, 'shaking with Rassel-Schläge: ' + r.ras.strikes + ' strikes in 2 s over the same Puls');
  // (the Puls's own voice stealing – playNote → kill(), as in the app before Gestik – cuts some ringing tails at once:
  // review/tq-kill.js; not the rain's or the rattle's doing)
  ok(r.own === 0, 'the rain and the rattle never cut a voice with kill() – they fade it (' + r.own + ' of ' + r.kills + ' kills from them; ' + r.loud + ' loud ones by the Puls\'s own stealing)');
  ok(r.heldAlive, 'a held note is never taken for them');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close();
})().catch(async (e) => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
