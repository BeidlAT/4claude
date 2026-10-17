// debug (gq): the rain's strikes leaning right/left/away with Ordnung 1 – per spore and as heard (global order)
const { open, close, rain, pairs } = require('./gs-h');
(async () => {
  const { page } = await open({ url: process.env.GS, cfg: { seed: 99 } });
  await page.evaluate(() => { const M = window.__M; for (const [k, v] of [['seq.bpm', 90], ['seq.swing', 0], ['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['bor.on', false]]) M.setParam(k, v); });
  await rain(page, { rgO: 1, rgK: 8, rgQ: 'frei' });
  for (const [tilt, setup, by] of [[[0.8, 0], "M.RG.k.length = 0; for (const x of [0.2, 0.45, 0.7]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }", 'f'], [[-0.8, 0], '', 'f'], [[0, -0.8], "M.RG.k.length = 0; for (const y of [0.2, 0.5, 0.8]) { window.__key(0.5, y, 'h' + y); window.__up('h' + y); }", 'y'], [[0, 0.8], '', 'y']]) {
    const hits = await page.evaluate(async ([tilt, setup]) => { const M = window.__M; if (setup) await new Function('M', 'return (async () => {' + setup + '})()')(M); window.__tilt(tilt[0], tilt[1]); await window.__sleep(400); window.__collect(); await window.__sleep(4000); return window.__stop(); }, [tilt, setup]);
    const seq = hits.slice().sort((a, b) => a.t - b.t).map((h) => +h[by].toFixed(by === 'f' ? 0 : 2));
    let up = 0, dn = 0; for (let i = 1; i < seq.length; i++) { if (seq[i] > seq[i - 1]) up++; else if (seq[i] < seq[i - 1]) dn++; }
    console.log(JSON.stringify(tilt), 'strikes', hits.length, 'per-spore steps', pairs(hits, (h) => h[by]).length, 'heard order', seq.join(' '), 'up', up, 'down', dn);
  }
  await close();
})();
