// (owner, 26.10.2026: „einzelne Schleifen werden nicht gespielt, wenn ich ein älteres eigenes Preset lade“) three
// Schleifen play; an own preset (another key, sound, tempo) is loaded: every Schleife still sounds afterwards.
//                                                                                     node t-hx-preset.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  if (process.env.OV) await page.evaluate((s) => { window.__ov = JSON.parse(s); }, process.env.OV);
  if (process.env.BARS) await page.evaluate((b) => { window.__bars = b; }, process.env.BARS);
  if (process.env.DBG) await page.evaluate(() => { window.__dbg = 1; });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); M.setParam('t.root', '2'); M.setParam('t.scale', 'akebono'); window.__grid(88); await sl(300);
    const T = +(window.__bars || 2); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', T);
    const rec = async (degs, eng) => {
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 60 / 88, degs, T, { eng, dur: 0.3 }); await window.__until(M.tgTime(B0 + 4 * T) + 0.06);
      M.hxKorb(null); await sl(300);
    };
    await rec([0, 4, 7, 4], 'hng'); await rec([2, 5, 9, 5], 'hng'); await rec([7, 9, 11, 9], 'klb');
    const done = () => M.hxLoopsLive().every((L) => L.sch.every((id) => M.HX.sch.get(id).aud));
    for (let i = 0; i < 100 && !done(); i++) await sl(100);
    await sl(3000);
    const lv = async () => { const out = {}; for (const L of M.hxLoopsLive()) { const m = await window.__meter(L.id, 2800); out[L.slot] = +Math.max(...m.map((x) => x[1])).toFixed(4); } return out; };
    o.before = await lv(); o.states0 = M.hxLoopsLive().map((L) => L.state);
    // an own preset, as an older version saved it: all of its values at that time (another key, sound and tempo)
    const v = M.patchValues(); Object.assign(v, window.__ov || { 't.root': '7', 't.scale': 'dor', 'seq.bpm': 100, 'v.eng': 'glo' }); delete v['rev.raum'];
    M.loadPreset({ name: 'Alt', v });
    // how long each one is silent: its level every 100 ms for 8 s – the first moment it sounds again (after 0.3 s)
    const t0 = performance.now(), back = {}, ids = M.hxLoopsLive().map((L) => [L.slot, L.id]);
    o.tl = []; let tk = 0;
    while (performance.now() - t0 < 8000) {
      if (window.__dbg && tk++ % 5 === 0) { const f = Math.round(M.hxF(M.A.ctx.currentTime)); o.tl.push(Math.round(performance.now() - t0) + ' ' + M.hxLoopsLive().map((L) => { const S = M.HX.sch.get(L.sch[0]), m = (M.HX.meter || []).find((x) => x[0] === L.id); return L.slot + ':' + S.play + ' sw' + ((S.swapF - f) / 48000).toFixed(1) + ' pend' + [...(S.wPend || [])].join('/') + ' wk' + S.wk + ' k' + M.hxPassK(L, f) + ' busy' + (S.wBusy ? 1 : 0) + ' lv' + (m ? m[1].toFixed(3) : '-'); }).join(' | ')); } for (const [sl_, id] of ids) { const m = (M.HX.meter || []).find((x) => x[0] === id); if (back[sl_] == null && performance.now() - t0 > 300 && m && m[1] > 0.002) back[sl_] = Math.round(performance.now() - t0); } await sl(100); }
    o.back = back;
    o.states = M.hxLoopsLive().map((L) => L.slot + ':' + L.state + (L.gain != null ? ':' + L.gain : ''));
    o.after = await lv();
    o.pend = M.HX.pend.map((p) => p.kind);
    if (window.__dbg) {
      o.dbg = M.hxLoopsLive().map((L) => L.sch.map((id) => { const S = M.HX.sch.get(id); return { play: S.play, busy: !!S.wBusy, again: !!S.wAgain, wu: S.wu && S.wu.sig && String(S.wu.sig).slice(0, 40), cur: String(M.hxWSig(L, S)).slice(0, 40), wk: S.wk, can: M.hxWCan(S), ver: S.ver }; }));
      await sl(10000); o.later = await lv();
      o.dbg2 = M.hxLoopsLive().map((L) => L.sch.map((id) => { const S = M.HX.sch.get(id); return { play: S.play, busy: !!S.wBusy, wu: S.wu && String(S.wu.sig).slice(0, 40) }; }));
    }
    return o;
  });
  console.log(JSON.stringify(r));
  const s = Object.keys(r.before);
  ok(s.length === 3 && s.every((k) => r.before[k] > 0.002), `three Schleifen sound before (${JSON.stringify(r.before)})`);
  ok(s.every((k) => r.back[k] != null && r.back[k] < 2500), `each sounds again within 2.5 s of the load (ms: ${JSON.stringify(r.back)})`);
  ok(s.every((k) => r.after[k] > 0.002), `after loading the own preset every one still sounds (${JSON.stringify(r.after)}; ${r.states.join(' ')})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
