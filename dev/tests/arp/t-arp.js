// Sporenwerk (owner, 29.10.2026: „bau einen ausgefuchsten Arpeggiator … eine richtige Trickkiste“) and the Harmonizer –
// live in Chromium:   node t-arp.js   (from <scratch>/hexenring, the hx slot built)
//  1 held notes do not sound themselves; the Sporenwerk plays them on the 1/16 grid, Aufwärts in order
//  2 the ring (8 steps, 3 hits) rests where it should; Ratschen strike a step several times; Stimmen add the third
//  3 Schleife: a loop's notes are its chord, the loop itself goes quiet – and comes back when it stops
//  4 the Harmonizer: Effekt → Harmonizer makes its processor, it sounds
//  5 the panel draws (screenshot), no page errors
const G = require('../hexenring/hx-g'), H = require('../hexenring/hx-h');
const { ok } = H;
const OUT = process.env.OUT || require('os').tmpdir();
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900, init: () => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); }; } });
  let r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(120); await sl(300);
    M.setParam('v.eng', 'klb'); M.setParam('v.layer', 'off'); M.setParam('arp.on', true); M.setParam('arp.form', 'auf'); M.setParam('arp.rate', '0.25'); M.setParam('arp.okt', 1); M.setParam('arp.chance', 1);
    const down = (id, x) => M.onDown({ pointerId: id, pt: { x, y: 0.5, px: 0, py: 0 }, note: M.noteAt(x) });
    const v0 = A.voices.size; down('a1', 0.2); down('a2', 0.45); down('a3', 0.7); await sl(20);
    o.selfVoices = [...M.touches.values()].reduce((s, t) => s + t.voices.length, 0);
    await sl(1300);
    const ev = M.ARP.ev.filter((e) => !e.rest).slice(-6); o.fs = ev.map((e) => Math.round(e.f)); o.dts = ev.slice(1).map((e, i) => +(e.t - ev[i].t).toFixed(3));
    o.notes = [0.2, 0.45, 0.7].map((x) => Math.round(M.noteAt(x).f));
    // the ring: 8 steps, 3 hits
    M.setParam('arp.schritte', 8); M.setParam('arp.treffer', 3); const tc = A.ctx.currentTime + 0.15; await sl(2200);
    const ring = M.ARP.ev.filter((e) => e.t > tc && e.t < A.ctx.currentTime).slice(-16); o.ringOn = ring.filter((e) => !e.rest).length; o.ringN = ring.length;
    o.ringPat = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (M.arpRing(k) ? 'x' : '.')).join('');
    M.setParam('arp.treffer', 8); M.setParam('arp.ratsche', 1); M.setParam('arp.stimmen', 'terz'); await sl(800);
    const rs = M.ARP.ev.filter((e) => !e.rest).slice(-6); o.rat = Math.min(...rs.map((e) => e.rat)); o.terz = rs.some((e) => e.d === 2);
    M.setParam('arp.ratsche', 0); M.setParam('arp.stimmen', '0');
    for (const id of ['a1', 'a2', 'a3']) M.onUp({ pointerId: id }); await sl(400);
    o.afterUp = M.arpPool(A.ctx.currentTime).length;
    return o;
  });
  const asc = r.fs.length >= 3 && r.fs.slice(0, 3).every((f, i, a) => !i || f !== a[i - 1]);
  ok(r.selfVoices === 0, `held notes do not sound themselves (${r.selfVoices} voices of their own)`);
  ok(r.dts.every((d) => Math.abs(d - 0.125) < 0.004) && asc && r.notes.every((f) => r.fs.includes(f)), `Aufwärts on the 1/16 grid at 120 BPM: ${r.fs.join(' ')} (held ${r.notes.join(' ')}), steps ${r.dts.join(' ')} s`);
  ok(r.ringPat.split('x').length - 1 === 3 && Math.abs(r.ringOn / r.ringN - 3 / 8) < 0.15, `the ring 8/3 (${r.ringPat}): ${r.ringOn} of ${r.ringN} steps sound`);
  ok(r.rat >= 2 && r.terz, `Ratschen strike each step ${r.rat}+ times; Stimmen add the third (${r.terz})`);
  ok(r.afterUp === 0, `let go: the pool is empty (${r.afterUp})`);
  // ---------- 3 · Schleife ----------
  r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    M.setParam('arp.on', false); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.5, [0, 2, 4, 2], 4, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 8) + 0.06);
    M.hxKorb(null); const L = M.hxLoopsLive().slice(-1)[0];
    for (let i = 0; i < 100 && !(L && L.sch.length && M.HX.sch.get(L.sch[0]).aud && M.HX.sch.get(L.sch[0]).wn); i++) await sl(100);
    M.HX.fokus = L.id;
    M.setParam('arp.quelle', 'schleife'); M.setParam('arp.schl', '0'); M.setParam('arp.schlStill', true); M.setParam('arp.on', true); await sl(1500);
    o.pool = M.arpPool(A.ctx.currentTime).length; o.ev = M.ARP.ev.filter((e) => !e.rest && e.t > A.ctx.currentTime - 1).length; o.still = !!M.ARP.still;
    M.setParam('arp.on', false); await sl(300); o.back = !M.ARP.still;
    return o;
  });
  ok(r.pool >= 1 && r.ev >= 4 && r.still && r.back, `Schleife: its notes are the chord (${r.pool} now, ${r.ev} steps in a second), the loop quiet while played (${r.still}), back after (${r.back})`);
  // ---------- 4 · Harmonizer ----------
  r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    M.setParam('fx.typ', 'harmo'); M.setParam('fx.mix', 0.8); await sl(600);
    const S = A.fxR.fx, an = A.ctx.createAnalyser(); an.fftSize = 2048; S.ret.connect(an);
    window.__play([[A.ctx.currentTime + 0.05, 3, 0.8, 0.8], [A.ctx.currentTime + 0.4, 5, 0.8, 0.8]], { eng: 'klb' });
    const b = new Float32Array(2048); let s = 0, n = 0; const end = performance.now() + 1500; while (performance.now() < end) { an.getFloatTimeDomainData(b); for (const x of b) s += x * x; n += b.length; await sl(40); }
    return { typ: S.cur && S.cur.typ, db: 10 * Math.log10(s / n + 1e-20) };
  });
  ok(r.typ === 'harmo' && r.db > -70, `the Harmonizer plays (${r.typ}, ${r.db.toFixed(1)} dB)`);
  // ---------- 5 · the panel ----------
  await page.evaluate(async () => { const M = window.__M; M.setParam('arp.quelle', 'spiel'); M.setParam('arp.on', true); M.setParam('arp.form', 'hyphe'); M.setParam('arp.mutation', 0.5); M.setParam('arp.okt', 2); M.setParam('arp.ratsche', 0.3); M.openPanel('arp'); const down = (id, x) => M.onDown({ pointerId: id, pt: { x, y: 0.5, px: 0, py: 0 }, note: M.noteAt(x) }); down('b1', 0.15); down('b2', 0.35); down('b3', 0.55); down('b4', 0.8); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '/sporenwerk.png' });
  await page.evaluate(() => document.querySelector('.spw-stage').scrollIntoView({ block: 'start' })); await page.waitForTimeout(800);
  await (await page.$('.spw-stage')).screenshot({ path: OUT + '/sporenwerk-bild.png' });
  ok(!errors.length, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  process.exit(H.summary() ? 1 : 0);
})();
