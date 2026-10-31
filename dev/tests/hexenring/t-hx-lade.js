// Hexenring – the new sound of the Schleifen always arrives (owner, 31.10.2026: „drei Schleifen in der Leiste, Neustart,
// Preset Leere Erde – die Neugenerierung bleibt stecken … sorge dafür, dass sie immer und unter allen Umständen
// zuverlässig passiert; und ein X zum Abbrechen“):
//  1 a preset: the bar comes and goes, every Schicht free
//  2 after a reload (the Schleifen restored), Leere Erde: the same – never stuck
//  3 a realm that does not answer (its port swallowed): taken down, booted again, the render tried again – the bar ends
//  4 ✕ on the bar: it ends at once, nothing waits, what comes back is not played; the same wish is not asked again
//                                                                                              node t-hx-lade.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const ev = (fn, a) => page.evaluate(fn, a);
  // waits until the bar is done (or s seconds): [done, seconds, Schichten still busy]
  const barDone = (s) => ev(async (s) => { const M = window.__M, t0 = performance.now(); let seen = false; while (performance.now() - t0 < s * 1000) { if (M.HXLD.on) seen = true; if (seen && !M.HXLD.on) break; if (!seen && performance.now() - t0 > 4000) break; await new Promise((r) => setTimeout(r, 200)); }
    return [!M.HXLD.on, +((performance.now() - t0) / 1000).toFixed(1), [...M.HX.sch.values()].filter((S) => S.wBusy).length, seen]; }, s);
  const r1 = await ev(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep;
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('ui.instrument', 'preset');   // (the Schleifen take the preset's instrument: a new sound to render)
    for (let n = 0; n < 2; n++) {
      const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
      for (let i = 0; i < 8; i++) list.push([M.tgTime(B0) + i * beat / 2, [0, 2, 4, 2][i % 4] + n, 0.9, 0.3]);
      window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(1200);
    }
    const pr = M.PRESETS.find((p) => p.key !== 'leer' && p.v['v.eng'] && p.v['v.eng'] !== 'glo'); M.loadPreset(pr);
    return { n: M.hxLoopsLive().length, preset: pr.name };
  }, BPM);
  const b1 = await barDone(120);
  ok(r1.n === 2 && b1[0] && b1[2] === 0, `a preset (${r1.preset}): the new sound arrives in ${b1[1]} s (bar seen ${b1[3]}, ${b1[2]} still busy)`);
  // 2: reload, the Schleifen restored, Leere Erde
  await page.waitForTimeout(3000);
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart'); await G.gtools(page); await page.waitForTimeout(2500);
  const r2 = await ev(async () => { const M = window.__M; for (let i = 0; i < 50 && M.hxLoopsLive().length < 2; i++) await new Promise((r) => setTimeout(r, 200)); M.loadPreset(M.PRESET_LEER); return { n: M.hxLoopsLive().length }; });
  const b2 = await barDone(150);
  ok(r2.n === 2 && b2[0] && b2[2] === 0, `after a reload (${r2.n} Schleifen back), Leere Erde: done in ${b2[1]} s (bar seen ${b2[3]}, ${b2[2]} still busy)`);
  // 3: a realm that swallows its jobs
  const r3 = await ev(async () => {
    const M = window.__M, W = M.HXW; W.limK = 0.05;
    const realms = [W, ...(W.pool || [])]; for (const R of realms) if (R && R.port) { const real = R.port; R.port = { postMessage: (m) => { if (m && m.job === 'wuchs') return; real.postMessage(m); }, close: () => real.close() }; }
    const pr = M.PRESETS.find((p) => p.key !== 'leer' && p.v['v.eng'] && p.v['v.eng'] !== 'neb' && p.v['v.eng'] !== 'glo'); M.loadPreset(pr);
    return { preset: pr.name };
  });
  const b3 = await barDone(120);
  const log3 = await ev(() => (window.__M.HXW.log || []).slice(-40).map((x) => (Array.isArray(x) ? x[1] : x)).join(' | '));
  ok(b3[0] && b3[2] === 0 && /haengt/.test(log3), `a realm that does not answer: taken down, the bar ends anyway in ${b3[1]} s (${b3[2]} busy; log: …${log3.slice(-160)})`);
  await ev(() => { window.__M.HXW.limK = 1; });
  // 4: ✕
  const r4 = await ev(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    const pr = M.PRESETS.filter((p) => p.key !== 'leer' && p.v['v.eng'])[3]; M.loadPreset(pr);
    for (let i = 0; i < 40 && !M.HXLD.on; i++) await sl(100);
    o.on = M.HXLD.on; const x = document.querySelector('#hxLade .x'); o.btn = !!x && getComputedStyle(x).pointerEvents !== 'none';
    if (x) x.click(); await sl(50);
    o.off = !M.HXLD.on; o.busy = [...M.HX.sch.values()].filter((S) => S.wBusy || S.wAgain).length; o.skip = [...M.HX.sch.values()].filter((S) => S.wSkip).length;
    const plays = () => [...M.HX.sch.values()].map((S) => S.play + ':' + (S.wu && S.wu.sig)).join(',');
    o.p0 = plays(); await sl(8000); o.p1 = plays(); o.again = M.HXLD.on;
    return o;
  });
  ok(r4.on && r4.btn && r4.off && r4.busy === 0 && r4.skip > 0, `✕: the bar ends at once, nothing waits (${r4.busy} busy, ${r4.skip} let go)`);
  ok(r4.p0 === r4.p1 && !r4.again, 'what the realm brings back later is not played, and it is not asked again');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
