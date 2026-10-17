// Final screenshots of every view → mixui/final/   node final.js phone d1280
const L = require('./lib.js');
const fs = require('fs');
const OUT = __dirname + '/../final/';
fs.mkdirSync(OUT, { recursive: true });
const which = process.argv.slice(2).length ? process.argv.slice(2) : ['phone', 'd1280'];
(async () => {
  const b = await L.launch();
  for (const w of which) {
    const mob = !!L.VP[w].mobile;
    const shot = async (pg, n, opt = {}) => { await pg.waitForTimeout(opt.wait || 900); await pg.screenshot({ path: OUT + w + '-' + n + '.png', ...opt.s }); };
    const clipOf = (pg, sel, pad = 8) => pg.evaluate(([s, p]) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const x = Math.max(0, r.left - p), y = Math.max(0, r.top - p); return { x, y, width: Math.min(innerWidth - x, r.width + 2 * p), height: Math.min(innerHeight - y, r.height + 2 * p) }; }, [sel, pad]);
    // 1) before the sound: the start dialog, then the mixer behind it (as if the dialog were gone, no AudioContext yet)
    let { ctx, pg } = await L.page(b, w);
    await shot(pg, '0-start');
    await pg.evaluate(() => { document.querySelector('#start').hidden = true; for (const id of ['bar', 'main', 'quick', 'tabs']) document.getElementById(id).inert = false; window.__MX.openPanel('mix'); });
    await shot(pg, '1-nosound', { wait: 1500 });
    await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await shot(pg, '1-nosound-geflecht');
    await pg.evaluate(() => window.__MX.mxSetView('pult'));
    const pre = pg.errors.slice();
    await ctx.close();
    // 2) with sound and the Puls running
    ({ ctx, pg } = await L.page(b, w));
    await L.start(pg);
    await pg.evaluate(() => window.__M.setParam('v.layer', window.__M.P['v.layer'])); // no-op, keeps the default mix
    await pg.click('#tab-mix'); await pg.waitForTimeout(2500);
    await shot(pg, '2-console');
    // the Summe: desktop shows it at the rack's end; on phones the rack scrolls there
    await pg.evaluate(() => { const s = document.querySelector('.mx-scroll'); if (s) s.scrollLeft = s.scrollWidth; });
    await shot(pg, '3-console-end');
    const cs = await clipOf(pg, '.mx-sum', 6);
    if (cs) await shot(pg, '3-summe-strip', { s: { clip: cs }, wait: 200 });
    const cb = await clipOf(pg, '.mx-band', 0);
    if (cb) await shot(pg, '3-summe-band', { s: { clip: cb }, wait: 200 });
    await pg.evaluate(() => { const s = document.querySelector('.mx-scroll'); if (s) s.scrollLeft = 0; });
    await pg.evaluate(() => window.__MX.mxSetView('geflecht')); await shot(pg, '4-geflecht', { wait: 1500 });
    await pg.evaluate(() => window.__MX.mxSetView('pult'));
    for (const k of ['fin', 'l0', 'sum']) {
      await pg.evaluate((k) => window.__MX.openDetail(k), k); await shot(pg, '5-detail-' + k, { wait: 1300 });
      if (mob) {
        const H = await pg.evaluate(() => { const b = document.querySelector('.mxd-body'); return b ? [b.scrollHeight, b.clientHeight] : [0, 0]; });
        let i = 2;
        for (let y = H[1] - 60; y < H[0] - 20 && i < 6; y += H[1] - 60, i++) { await pg.evaluate((y) => { document.querySelector('.mxd-body').scrollTop = y; }, y); await shot(pg, '5-detail-' + k + '-p' + i, { wait: 700 }); }
      }
      await pg.evaluate(() => window.__MX.closeDetail());
    }
    // 3) the Puls panel's block
    await pg.click('#tab-puls'); await pg.waitForTimeout(900);
    await pg.evaluate(() => document.querySelector('.mxp').scrollIntoView({ block: 'start' })); await shot(pg, '6-puls-block', { wait: 1200 });
    const cp = await clipOf(pg, '.mxp', 4);
    if (cp) await shot(pg, '6-puls-block-crop', { s: { clip: cp }, wait: 200 });
    console.log(w, 'pre-sound errors', pre.length ? pre : 'none', '| errors', pg.errors.length ? pg.errors : 'none');
    await ctx.close();
  }
  await b.close();
})();
