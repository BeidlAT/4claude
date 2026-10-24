// live: 6 loops with Taumeln (drift 8 ct), the audio threads' CPU over 20 s, builds alternating – node live-tau.js hb hx [rounds]
const H = require('./hx-h'), G = require('./hx-g'), P = require('../perf/lib');
const slots = [process.argv[2] || 'hb', process.argv[3] || 'hx'], R = +process.argv[4] || 3;
const init = () => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); }; };
(async () => {
  const res = {}; for (const s of slots) res[s] = [];
  for (let r = 0; r < R; r++) for (const s of slots) {
    const { page } = await G.open({ url: `http://127.0.0.1:8790/${s}-inst/index.html`, init });
    const info = await page.evaluate(async () => {
      const M = window.__M, A = M.A;
      await window.__reset(); window.__grid(120); M.setParam('mov.drift', 8); await window.__sleep(400);
      const degs = [[0, 4, 7, 4, 2, 5, 9, 5], [11, 9, 7, 9, 11, 12, 14, 12], [2, 2, 4, 4, 5, 5, 7, 7], [7, 5, 4, 2, 0, 2, 4, 5], [9, 7, 9, 11, 12, 11, 9, 7], [4, 4, 2, 2, 0, 0, 2, 4]];
      for (const d of degs) {
        M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
        const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
        window.__riff(M.tgTime(B0), 0.5, d.concat(d), 1, { eng: 'klb', dur: 0.3 });
        await window.__until(M.tgTime(B0 + 8) + 0.06);
        M.hxKorb(null); await window.__sleep(300);
      }
      for (let i = 0; i < 60; i++) { M.hxCount(); if (M.HX.rs <= 6 && !M.HX.dd) break; await window.__sleep(1000); }
      M.hxCount(); return { loops: M.hxLoopsLive().length, rs: M.HX.rs, dd: M.HX.dd };
    });
    await page.waitForTimeout(3000);
    const s0 = P.snap(process.pid), t0 = Date.now(); await page.waitForTimeout(20000); const s1 = P.snap(process.pid);
    const g = P.groups(s0, s1, (Date.now() - t0) / 1000);
    const rsw = await page.evaluate(() => window.__M.HX.rsw);
    res[s].push(g.audio); console.log(s, JSON.stringify(info), 'audio', g.audio, 'main', g.main, 'rsw', rsw);
    await H.close();
  }
  for (const s of slots) console.log(s, 'median audio % of a core', P.median(res[s]));
})();
