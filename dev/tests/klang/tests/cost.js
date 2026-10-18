// Cost of the worklet engines in Nebel units – the SPEC §7.1 method (NV voices of an engine vs NV level-1 Nebel voices,
// offline render time minus an empty render), made sturdier against a noisy machine: all candidates are measured in
// interleaved rounds and each keeps its fastest round. Native engines are measured alongside: their VCOST entries
// (from an earlier calibration on another machine) give the scale between this machine's raw ratio and the table.
//   node cost.js [rounds]      env: ENGS=hlm1,hlm3,… NV=24 DUR=4 PARAMS='{"jrg.holz":1}' Y=0.6 (the voices' height)     prints one JSON line
// (NW=6: 'web' renders six of Gespinst's webs at once – one web alone is a small difference, its noise multiplied by NV)
// (a struck engine needs DUR within its voices' life – Jahresring: PARAMS holz 1 and a summer, DUR 2)
// A candidate written 'gltN1' is Glut's own native loop: its context gets no module.
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const ROUNDS = +process.argv[2] || 6, DUR = +process.env.DUR || 4, NV = +process.env.NV || 24, NW = +process.env.NW || 1;
const ENGS = (process.env.ENGS || 'null1,hlm1,hlm3,rnk1,rnk3,hau1,hau3,obt1,obt3,neb3').split(',');
const XP = JSON.parse(process.env.PARAMS || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html', false);
  const r = await page.evaluate(async ([ROUNDS, DUR, NV, ENGS, XP, YH]) => {
    const M = window.__M;
    async function run(eng, q, n) {
      M.P['dev.q'] = q;
      const nat = /N$/.test(eng); if (nat) eng = eng.slice(0, -1);   // (zpfN, gltN: the native stand-in of an engine with fallback 'native' – the engine marked broken for the run)
      const ctx = await window.__off(48000, DUR, Object.assign({ 'v.eng': eng === 'null' ? 'hlm' : eng === 'web' ? 'gsp' : eng, 'rev.mix': 0, 'dly.mix': 0 }, XP, nat ? { 'v.eng': 'neb' } : {}));
      if (!nat) await M.ensureDSP(ctx);
      ctx.suspend(19 / 375).then(() => {
        for (let k = 0; k < n; k++) {
          if (eng === 'web') {   // Gespinst's web alone, kept ringing by a steady noise (NW nodes: their cost × NV / NW below)
            if (k >= NW) continue;
            M.A.gsp = null;   // (a fresh web each: gspWeb() builds one when none is held)
            const W = M.gspWeb(), nb = ctx.createBuffer(1, 48000, 48000), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.05;
            const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; src.connect(W.inp); src.start();
            continue;
          }
          if (eng === 'null') { const nd = new AudioWorkletNode(ctx, 'myzel-null', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { on: { on: 0 } } }); nd.connect(ctx.destination); }
          else { if (nat) M.A.workletBroken.add(eng); M.playNote(eng, ctx.currentTime, M.noteAt((k * 0.37) % 1).f, YH, 0.5, {}); if (nat) M.A.workletBroken.delete(eng); }
        }
        ctx.resume();
      });
      const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
    }
    const best = {}; const keep = (k, v) => { best[k] = Math.min(best[k] || Infinity, v); };
    for (let i = 0; i < ROUNDS; i++) {
      keep('base', await run('neb', '1', 0)); keep('neb1', await run('neb', '1', NV));
      if (ENGS.includes('web3')) keep('base3', await run('neb', '3', 0));   // (the web is one node: level 3's own graph must not be counted ×NV)
      for (const eq of ENGS) keep(eq, await run(eq.slice(0, -1), eq.slice(-1), NV));
    }
    const unit = best.neb1 - best.base, out = { nebMs: +unit.toFixed(1), rounds: ROUNDS, nv: NV, nw: NW };
    for (const eq of ENGS) out[eq] = +((best[eq] - (eq === 'web3' ? best.base3 : best.base)) / unit * (eq.startsWith('web') ? NV / NW : 1)).toFixed(3);
    const tab = (k, q) => (q === '3' ? M.VCOST3 : M.VCOST1)[k];
    // the scale: table / measured, over the held native engines measured here
    const refs = ENGS.filter((eq) => !/^(hlm|rnk|null|web|elm|jrg|hrz|glt|boe|amo|shn|zpf|mdr|gsp|khl|rhz)/.test(eq)), sc = refs.map((eq) => tab(eq.slice(0, -1), eq.slice(-1)) / out[eq]);
    const med = sc.slice().sort((a, b) => a - b), mid = med.length >> 1;   // the median: one disturbed reference moves it least
    out.scale = +(med.length % 2 ? med[mid] : (med[mid - 1] + med[mid]) / 2).toFixed(3); out.scaleEach = Object.fromEntries(refs.map((eq, i) => [eq, +sc[i].toFixed(2)]));
    M.P['dev.q'] = '1';
    return out;
  }, [ROUNDS, DUR, NV, ENGS, XP, +(process.env.Y || 0.6)]);
  console.log(JSON.stringify(r));
  await browser.close();
})();
