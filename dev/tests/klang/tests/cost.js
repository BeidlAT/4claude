// Cost of the worklet engines in Nebel units – the SPEC §7.1 method (NV voices of an engine vs NV level-1 Nebel voices,
// offline render time minus an empty render), made sturdier against a noisy machine: all candidates are measured in
// interleaved rounds and each keeps its fastest round. Native engines are measured alongside: their VCOST entries
// (from an earlier calibration on another machine) give the scale between this machine's raw ratio and the table.
//   node cost.js [rounds]      env: ENGS=hlm1,hlm3,… NV=24 DUR=4 PARAMS='{"jrg.holz":1}' Y=0.6 (the voices' height)     prints one JSON line
// (NW=24: 'web' renders 24 of Gespinst's webs at once, the voices' method – one web alone carries the worklet's fixed
// share of the render and its noise, both multiplied by NV)
// (a struck engine needs DUR within its voices' life – Jahresring: PARAMS holz 1 and a summer, DUR 2)
// A candidate written 'gltN1' is Glut's own native loop: its context gets no module.
// Hexenring (SPEC §21), myzel-ring nodes against NV Nebel voices: 'hxq1' four noise sources (the strips' stand-in),
// 'hxn1' those into NH tap sets (four strip gains into a sum, as the Gespielt tap), 'hxc1' each set into a node with
// both rings recording – HX_COST.capture = hxc − hxq (the node and its taps); 'hx01' a bare node (NV), 'hxs1' with one
// playing Schicht (a 2-bar loop at 120 BPM, a crossfaded seam every pass), 'hxr1' resampled ({rate} 17 ct) –
// HX_COST.schicht = hxs − hx0, HX_COST.rs = hxr − hxs
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const ROUNDS = +process.argv[2] || 6, DUR = +process.env.DUR || 4, NV = +process.env.NV || 24, NW = +process.env.NW || 1, NH = +process.env.NH || 8;
const ENGS = (process.env.ENGS || 'null1,hlm1,hlm3,rnk1,rnk3,hau1,hau3,obt1,obt3,neb3').split(',');
const XP = JSON.parse(process.env.PARAMS || '{}');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html', false);
  const r = await page.evaluate(async ([ROUNDS, DUR, NV, ENGS, XP, YH, NW, NH]) => {
    const M = window.__M;
    async function run(eng, q, n) {
      M.P['dev.q'] = q;
      const nat = /N$/.test(eng); if (nat) eng = eng.slice(0, -1);   // (zpfN, gltN: the native stand-in of an engine with fallback 'native' – the engine marked broken for the run)
      const ctx = await window.__off(48000, DUR, Object.assign({ 'v.eng': eng === 'null' ? 'hlm' : eng === 'web' ? 'gsp' : /^hx/.test(eng) ? 'neb' : eng, 'rev.mix': 0, 'dly.mix': 0 }, XP, nat ? { 'v.eng': 'neb' } : {}));
      if (!nat) await M.ensureDSP(ctx);
      if (eng.startsWith('hx')) {   // (built before the render starts: making and cloning the buffers is not the render's time)
        const SR = 48000, cap = /^hx[qnc]$/.test(eng), N = cap ? Math.min(NV, NH) : NV;
        if (!window.__hxCh) { const len = 4 * SR, nn = len + SR, ch = []; for (let c = 0; c * 8192 < nn; c++) { const L = new Float32Array(8192), R = new Float32Array(8192); for (let j = 0; j < 8192; j++) { L[j] = Math.sin((c * 8192 + j) * 0.031) * 0.1; R[j] = Math.sin((c * 8192 + j) * 0.029) * 0.1; } ch.push([L, R]); } window.__hxCh = { ch, len, n: nn }; }
        const srcs = cap ? [0, 1, 2, 3].map(() => { const nb = ctx.createBuffer(2, SR, SR); for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1; } const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.start(); return sr; }) : [];
        if (eng === 'hxq') for (const sr of srcs) sr.connect(ctx.destination);
        for (let k = 0; k < (eng === 'hxq' ? 0 : N); k++) {
          let sum = null;
          if (cap) { sum = ctx.createGain(); for (const sr of srcs) { const g = ctx.createGain(); sr.connect(g).connect(sum); } }   // the Gespielt tap's shape: four strip gains into a sum
          if (eng === 'hxn') { sum.connect(ctx.destination); continue; }
          const msgs = [], C = window.__hxCh;
          if (eng === 'hxs' || eng === 'hxr') {
            msgs.push({ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: C.ch, n: C.n, pre: 0, len: C.len, join: 'xf', X: 480, rho: 0.2 } });
            if (eng === 'hxr') msgs.push({ rate: { loop: 1, cents: 17 } });
          }
          if (eng === 'hxc') { const hN = Math.ceil(16 * SR / 8192), pool = []; for (let i = 0; i < 2 * hN; i++) pool.push([new Float32Array(8192), new Float32Array(8192)]); msgs.push({ pool }); }
          const nd = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 16, msgs } });
          if (cap) { sum.connect(nd, 0, 0); srcs[0].connect(nd, 0, 1); }
          nd.connect(ctx.destination, 0);
        }
        const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
      }
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
    for (const eq of ENGS) out[eq] = +((best[eq] - (eq === 'web3' ? best.base3 : best.base)) / unit * (eq.startsWith('web') ? NV / NW : /^hx[qnc]/.test(eq) ? NV / Math.min(NV, NH) : 1)).toFixed(3);
    const tab = (k, q) => (q === '3' ? M.VCOST3 : M.VCOST1)[k];
    // the scale: table / measured, over the held native engines measured here
    const refs = ENGS.filter((eq) => !/^(hlm|rnk|null|web|elm|jrg|hrz|glt|boe|amo|shn|zpf|mdr|gsp|khl|rhz|hx)/.test(eq)), sc = refs.map((eq) => tab(eq.slice(0, -1), eq.slice(-1)) / out[eq]);
    const med = sc.slice().sort((a, b) => a - b), mid = med.length >> 1;   // the median: one disturbed reference moves it least
    out.scale = +(med.length % 2 ? med[mid] : (med[mid - 1] + med[mid]) / 2).toFixed(3); out.scaleEach = Object.fromEntries(refs.map((eq, i) => [eq, +sc[i].toFixed(2)]));
    M.P['dev.q'] = '1';
    return out;
  }, [ROUNDS, DUR, NV, ENGS, XP, +(process.env.Y || 0.6), NW, NH]);
  console.log(JSON.stringify(r));
  await browser.close();
})();
