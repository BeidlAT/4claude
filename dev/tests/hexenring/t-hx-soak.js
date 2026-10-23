// Hexenring – memory while loops only play (the owner's desktop report, 23.10.2026: „RAM füllt sich stetig, nach 10 min
// 80 %“, the screen hitching every few seconds): desktop, three loops – one Lebendig, one Treu, one Abdruck – with Taumeln,
// nothing played or changed for SOAK_MIN minutes (default 10). Each minute, after a forced GC: the JS heap of the page and
// its same-origin Werk-Rahmen frames (performance.memory, precise), the renderer's resident memory (/proc), and per realm
// the OfflineAudioContexts still alive (CDP queryObjects in each frame's context – Chromium keeps one that loaded an
// AudioWorklet module for as long as its document lives, so the realms are renewed: HX_WRENEW).
//   1. the living loop renders on (passes done grow), every loop plays
//   2. the heap and the renderer's memory reach a plateau: the last third's peak within 60 MB (heap) / 150 MB (resident)
//      of the first third's peak after the warm-up, and no steady climb (the last third's mean under the middle's + 40 MB)
//   3. no realm holds more than HX_WRENEW + 2 offline contexts; at least one realm was renewed
//   node t-hx-soak.js        env SOAK_MIN (default 10)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const H = require('./hx-h');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html', MIN = +(process.env.SOAK_MIN || 10);
function rss(root) {
  const par = {}; for (const p of fs.readdirSync('/proc')) { if (!/^\d+$/.test(p)) continue; try { const s = fs.readFileSync('/proc/' + p + '/stat', 'utf8'); par[p] = s.slice(s.lastIndexOf(')') + 2).split(' ')[1]; } catch (e) {} }
  const kids = new Set([String(root)]); for (let g = true; g;) { g = false; for (const p in par) if (!kids.has(p) && kids.has(par[p])) { kids.add(p); g = true; } }
  let t = 0; for (const p of kids) { try { if (!/--type=renderer/.test(fs.readFileSync('/proc/' + p + '/cmdline', 'utf8'))) continue; t += +fs.readFileSync('/proc/' + p + '/status', 'utf8').match(/VmRSS:\s+(\d+)/)[1]; } catch (e) {} }
  return Math.round(t / 1024);
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage(), errors = [];
  pg.on('pageerror', (e) => errors.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(pg);
  const cx = new Map(); cdp.on('Runtime.executionContextCreated', (e) => { if (e.context.auxData && e.context.auxData.isDefault) cx.set(e.context.id, e.context.auxData.frameId); }); cdp.on('Runtime.executionContextDestroyed', (e) => cx.delete(e.executionContextId));
  await cdp.send('Runtime.enable');
  await pg.goto(URL); await pg.waitForFunction(() => !!window.__M); await pg.waitForTimeout(600);
  await pg.click('#btnStart'); await pg.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await pg.waitForTimeout(800);
  // three loops of two bars from notes on the field's strip (the setup's internal calls): Lebendig, Treu, Abdruck
  await pg.evaluate(async () => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), keys = [];
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2); M.setParam('seq.bpm', 110); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.seqStart(); await sl(700);
    for (let j = 0; j < 3; j++) {
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4), degs = [[0, 2, 4, 7], [4, 2, 1, 3], [7, 5, 4, 2]][j];
      for (let r = 0; r < 2; r++) degs.forEach((d, i) => { const f = M.N.notes[Math.min(M.N.notes.length - 1, d + 5 * j)].f, t = t0 + (r * 4 + i) * beat; const v = M.playNote(['glo', 'neb', 'glo'][j], t, f, 0.5, i ? 0.6 : 0.9, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), (t + beat * 0.6 - A.ctx.currentTime) * 1000); });
      while (A.ctx.currentTime < t0 + 8 * beat + 0.05) await sl(30);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); if (L) keys.push(L.key); await sl(300);
    }
    M.seqStop();
    for (let i = 0; i < 100; i++) { let all = true; for (const k of keys) { const L = M.hxByKey(k); for (const id of L.sch) { const S = M.HX.sch.get(id); if (!(S && S.wn && S.aud)) { all = false; M.hxWNotesAll(L); } } } if (all) break; await sl(100); }
    M.hxWSet(M.hxByKey(keys[0]), 'eig', 'lebendig'); M.hxWSet(M.hxByKey(keys[1]), 'wahl', true);
    window.__keys = keys;
  });
  const oac = async () => {
    const out = [];
    for (const id of cx.keys()) {
      const p = await cdp.send('Runtime.evaluate', { expression: 'OfflineAudioContext.prototype', contextId: id }).catch(() => null); if (!p || !p.result.objectId) continue;
      const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: p.result.objectId }).catch(() => null); if (!q) continue;
      const r = await cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function () { return this.length; }', returnByValue: true }).catch(() => null);
      if (r) out.push(r.result.value);
    }
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: '' }).catch(() => {});
    return out;
  };
  const rows = [], t0 = Date.now();
  for (let m = 0; m <= MIN; m++) {
    if (m) await pg.waitForTimeout(Math.max(0, t0 + m * 60000 - Date.now()));
    await pg.evaluate(() => { if (window.gc) window.gc(); }); await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); await pg.waitForTimeout(300);
    const s = await pg.evaluate(() => { const M = window.__M; return { heap: Math.round(performance.memory.usedJSHeapSize / 1048576), done: M.HX.wSt ? M.HX.wSt.done : 0, renew: M.HXW.renew || 0, spielt: M.hxLoopsLive().filter((L) => L.state === 'spielt').length }; });
    const row = Object.assign({ m, rss: rss(process.pid), oac: await oac() }, s);
    rows.push(row); console.log('INFO ' + JSON.stringify(row));
  }
  const third = Math.max(1, Math.floor((rows.length - 2) / 3)), warm = rows.slice(2), A1 = warm.slice(0, third), A2 = warm.slice(third, 2 * third), A3 = warm.slice(-third);
  const mx = (a, k) => Math.max(...a.map((r) => r[k])), mean = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  const last = rows[rows.length - 1];
  ok(last.done > rows[1].done + 20 && last.spielt === 3, `1. ${MIN} min of playback: the living loop rendered ${last.done} passes, ${last.spielt} loops play`);
  ok(mx(A3, 'heap') <= mx(A1, 'heap') + 60 && mean(A3, 'heap') <= mean(A2, 'heap') + 40, `2. the heap reaches a plateau: ${rows.map((r) => r.heap).join(', ')} MB (peaks ${mx(A1, 'heap')} → ${mx(A3, 'heap')})`);
  ok(mx(A3, 'rss') <= mx(A1, 'rss') + 150 && mean(A3, 'rss') <= mean(A2, 'rss') + 80, `2.   the renderer's resident memory too: ${rows.map((r) => r.rss).join(', ')} MB`);
  const most = Math.max(...rows.map((r) => Math.max(0, ...r.oac)));
  ok(most <= 14 && last.renew >= 1, `3. offline contexts alive per realm at most ${most} (renewal after 12 renders), realms renewed ${last.renew} times`);
  ok(!errors.length, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  await b.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exit(1); });
