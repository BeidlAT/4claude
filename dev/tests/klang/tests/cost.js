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
// both rings recording (ring 1 written by its myzel-ring-in node, as in the app) – HX_COST.capture = hxc − hxq (the nodes and taps); 'hx01' a bare node (NV), 'hxs1' with one
// playing Schicht (a 2-bar loop at 120 BPM, a crossfaded seam every pass), 'hxr1' resampled ({rate} 17 ct) –
// HX_COST.schicht = hxs − hx0, HX_COST.rs = hxr − hxs; (step 1c) 'hxf1' NV copies of the live chain (makeChain with the
// patch's settings, as hxChain builds out 1's), each fed by a noise source, 'hxz1' the NV sources alone –
// HX_COST.fx1 = hxf − hxz; (step 1d) 'hxm1' a loop of four Schichten at the loop's own rate (17 ct) – summed, resampled
// once – and 'hxp1' the same read one by one (po.noSum, step 1c's way): the summed loop costs 4 × schicht + one rs;
// 'hxd1' one Schicht being de-drifted (Taumeln: drift 4 ct live, its own 8 ct at 2.5 Hz, the job running all along) –
// HX_COST.dd = hxd − hxr; (step 2a) 'hxw1' a Schicht fed by a Wuchs stream – a 1-s pass every second, each streamed
// through a port of its own with 1.5 s of tail, so two passes' tails ring under each body (k = 3 streams) – and 'hxx1'
// the same at the loop's own rate (17 ct: one resampling, as Taumeln reads a Wuchs version): HX_COST.stream = hxw − hxs
// (step 2b) 'hxc1' builds the app's node with its third ring (the Puls's lanes into input 2); the tape: 'hxu1' the
// Schicht at speed 1½ (the 56-tap kernel), 'hxv1' at ×2 (the 80-tap kernel), 'hxh1' at ½ (the shared one) –
// HX_COST.k16 = hxu − hxs, k24 = hxv − hxs; 'hxl1' in slices (Schnitt: a 2-bar loop of 16 onsets at 108 BPM, every slice
// read through the resampler with its micro-fades) – HX_COST.slice = hxl − hxs; 'hxa1' worn (Abrieb: its own pair, the
// low pass and the gate per frame) – HX_COST.abr = hxa − hxs
// (step 4) 'hxi1' the app's node with the Mikro's ring (po.mic, four rings, its pool, the microphone on and a source into
// input 3) – HX_COST.mic = hxi − hxc; 'hxk1' two loops, the second a Sammelschleife recording the first every pass
// (fb 0.7, its tape playing) and 'hxj1' the same without the recording – HX_COST.acc = hxk − hxj; 'fglt1' / 'fshn1'
// NV Höfe voices as hxFeedMake builds them (the engine's processor alone with its pan, fed through its input by a noise
// source, inj as HX_FEED) – the Hof's price per voice, against the engine's VCOST of a played voice
// (final pass) 'rhzo1' Rhizom's voices each striking a net of its own (rhzNet, as a loop nourishing Rhizom) – with
// rhz-pings.js OWN=1 the pings they ring – rhz-fit.js fits RHZ_COST over both
// (29.10.2026) 'fxnetzS1' / 'fxnetzG1' / 'fxnetzK1' (Resonanz-Netz: Saiten, Glocken, Holzkörper), 'fxwolke1', 'fxspek1',
// 'fxoktav1', 'fxvokal1', 'fxharmo1', 'fxtrans1', 'fxsat1', 'fxlim1', 'fxkomp1': NV of the mixer's processors fed by noise – FX_COST = fx… − hxz
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
      const own = eng === 'rhzo'; if (own) eng = 'rhz';   // (Hexenring Nähren: each voice strikes a net of its own, as a nourishing loop's notes do)
      const nat = /N$/.test(eng); if (nat) eng = eng.slice(0, -1);   // (zpfN, gltN: the native stand-in of an engine with fallback 'native' – the engine marked broken for the run)
      const ctx = await window.__off(48000, DUR, Object.assign({ 'v.eng': eng === 'null' ? 'hlm' : eng === 'web' ? 'gsp' : /^hx/.test(eng) ? 'neb' : eng, 'rev.mix': 0, 'dly.mix': 0 }, XP, nat ? { 'v.eng': 'neb' } : {}));
      if (!nat) await M.ensureDSP(ctx);
      if (eng === 'hxf') {   // the live chain's copy, NV of them (built before the render)
        const SR = 48000, nb = ctx.createBuffer(2, SR, SR);
        for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1; }
        for (let k = 0; k < NV; k++) {
          const c = M.makeChain(); M.updDrive(c); M.updRing(c); M.updFilter(c); M.updPhaser(c); M.updChorus(c);
          const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.connect(c.in); sr.start(); c.out.connect(ctx.destination);
        }
        const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
      }
      if (eng.startsWith('fx')) {   // (29.10.2026) the mixer's own processors, NV of them, each fed by a noise source – against 'hxz1' (the sources alone): FX_COST
        const kind = eng.slice(2), SR = 48000, nb = ctx.createBuffer(2, SR, SR), FX = { netzS: ['myzel-netz', { art: 0 }], netzG: ['myzel-netz', { art: 1 }], netzK: ['myzel-netz', { art: 2 }], wolke: ['myzel-wolke', { dichte: 1 }], spek: ['myzel-spek', {}], oktav: ['myzel-oktav', { onach: 1 }], vokal: ['myzel-vokal', { beweg: 1 }], harmo: ['myzel-harmo', { v1: 2, v2: 4, v3: -3, modus: 1, form: 0.6 }], trans: ['myzel-trans', null], sat: ['myzel-sat', null], lim: ['myzel-lim', null], komp: ['myzel-komp', null], flecht: ['myzel-flecht', { schl: 6, steps: 16, filt: 0.6, tiefe: 0.8 }] }[kind];
        for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3; }
        for (let k = 0; k < NV; k++) {
          const nd = new AudioWorkletNode(ctx, FX[0], { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: FX[1] ? { set: FX[1], beat: 0.5, freqs: [220, 247, 294, 330, 392] } : {} });
          if (kind === 'trans') nd.port.postMessage({ a: 0.6, s: -0.4 }); else if (kind === 'sat') nd.port.postMessage({ a: 0.5 }); else if (kind === 'komp') nd.port.postMessage({ ratio: 4, thr: -30, att: 0.005, rel: 0.1, knee: 6, mk: 3, mix: 0.8 });
          const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.connect(nd).connect(ctx.destination); sr.start();
        }
        const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
      }
      if (eng === 'hxz') {   // its stand-in without the chain: the NV noise sources alone
        const SR = 48000, nb = ctx.createBuffer(2, SR, SR);
        for (let k = 0; k < NV; k++) { const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.connect(ctx.destination); sr.start(); }
        const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
      }
      if (eng === 'fglt' || eng === 'fshn') {   // (step 4) the Höfe: NV fed voices, each with its pan, one noise source into their inputs
        const kind = eng.slice(1), F = M.HX_FEED[kind], SR = 48000, nb = ctx.createBuffer(2, SR, SR), rich = !!M.Q.rich;
        for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1; }
        const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.start();
        for (let k = 0; k < NV; k++) {
          const f = M.noteAt((k * 0.37) % 1).f, node = new AudioWorkletNode(ctx, F.proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [rich ? 2 : 1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
            processorOptions: { rich, lite: 0, prm: M.wkPrm(kind), seed: k + 1, inj: F.inj, on: { on: 0, f, y: F.y, vel: kind === 'glt' ? 0 : 0.5, silent: 1, seed: k + 7 } } });
          node.parameters.get('freq').value = f; node.parameters.get('hoehe').value = F.y;
          const pan = ctx.createStereoPanner(); pan.pan.value = ((k % 5) / 4 - 0.5) * 0.8; sr.connect(node); node.connect(pan).connect(ctx.destination);
        }
        const t0 = performance.now(); await ctx.startRendering(); return performance.now() - t0;
      }
      if (eng.startsWith('hx')) {   // (built before the render starts: making and cloning the buffers is not the render's time)
        const SR = 48000, cap = /^hx[qnci]$/.test(eng), N = cap ? Math.min(NV, NH) : NV;
        if (!window.__hxCh) { const len = 4 * SR, nn = len + SR, ch = []; for (let c = 0; c * 8192 < nn; c++) { const L = new Float32Array(8192), R = new Float32Array(8192); for (let j = 0; j < 8192; j++) { L[j] = Math.sin((c * 8192 + j) * 0.031) * 0.1; R[j] = Math.sin((c * 8192 + j) * 0.029) * 0.1; } ch.push([L, R]); } window.__hxCh = { ch, len, n: nn }; }
        const srcs = cap ? [0, 1, 2, 3].map(() => { const nb = ctx.createBuffer(2, SR, SR); for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.1; } const sr = ctx.createBufferSource(); sr.buffer = nb; sr.loop = true; sr.start(); return sr; }) : [];
        if (eng === 'hxq') for (const sr of srcs) sr.connect(ctx.destination);
        for (let k = 0; k < (eng === 'hxq' ? 0 : N); k++) {
          let sum = null;
          if (cap) { sum = ctx.createGain(); for (const sr of srcs) { const g = ctx.createGain(); sr.connect(g).connect(sum); } }   // the Gespielt tap's shape: four strip gains into a sum
          if (eng === 'hxn') { sum.connect(ctx.destination); continue; }
          const msgs = [], C = window.__hxCh;
          let po = {};
          if (eng === 'hxw' || eng === 'hxx') {   // (step 2a: the stream's slots come through their ports, below)
            msgs.push({ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 2 } }, { schicht: { loop: 1, id: 1, chunks: C.ch.slice(0, 6), n: SR, pre: 0, len: SR, join: 'ola', X: 480, rho: 0, dd: 1, wu: 1 } });
            if (eng === 'hxx') msgs.push({ rate: { loop: 1, cents: 17 } });
          }
          if (eng === 'hxu' || eng === 'hxv' || eng === 'hxh' || eng === 'hxl' || eng === 'hxa') {   // (step 2b)
            const sp = { hxu: 1.5, hxv: 2, hxh: 0.5 }[eng] || 1;
            msgs.push({ seg: [[0, 0, SR * 60 / (eng === 'hxl' ? 108 : 120)]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 / sp } }, { schicht: { loop: 1, id: 1, chunks: C.ch, n: C.n, pre: 0, len: C.len, join: 'xf', X: 480, rho: 0.2 } });
            if (sp !== 1) msgs.push({ band: { loop: 1, vs: sp, T: 1 } });
            if (eng === 'hxl') msgs.push({ slice: { loop: 1, u: Array.from({ length: 16 }, (_, i) => i / 16), schnitt: 1 } });
            if (eng === 'hxa') msgs.push({ abr: { schicht: 1, rate: 0.1, seed: 3, age: 4 } });
          }
          if (eng === 'hxk' || eng === 'hxj') {   // (step 4) A plays a Schicht; B (1½ its length) plays its tape – and, hxk, records A into it every pass
            msgs.push({ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: C.ch, n: C.n, pre: 0, len: C.len, join: 'xf', X: 480, rho: 0.2 } });
            const Lf = Math.round(C.len * 1.5), nB = Lf + 960, chB = []; for (let c = 0; c * 8192 < nB; c++) chB.push([new Float32Array(8192), new Float32Array(8192)]);
            msgs.push({ loop: { id: 2, lock: 'frei', Lf, ph0: 0 } }, { schicht: { loop: 2, id: 2, chunks: chB, n: nB, pre: 0, len: Lf, join: 'cut', X: 240, rho: 0 } });
            if (eng === 'hxk') msgs.push({ acc: { loop: 2, src: [1], fb: 0.7, gi: 1 } });
          }
          if (eng === 'hxs' || eng === 'hxr' || eng === 'hxm' || eng === 'hxp') {
            msgs.push({ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } });
            for (let s = 0; s < (eng === 'hxm' || eng === 'hxp' ? 4 : 1); s++) msgs.push({ schicht: { loop: 1, id: s + 1, chunks: C.ch, n: C.n, pre: 0, len: C.len, join: 'xf', X: 480, rho: 0.2 } });
            if (eng !== 'hxs') msgs.push({ rate: { loop: 1, cents: 17 } });
            if (eng === 'hxp') po = { noSum: 1 };
          }
          if (eng === 'hxd') {   // (a long Schicht: its de-drift job runs through the whole render, at the app's pace)
            if (!window.__hxChD) { const nn = 14 * SR, ch = []; for (let c = 0; c * 8192 < nn; c++) { const L = new Float32Array(8192), R = new Float32Array(8192); for (let j = 0; j < 8192; j++) { L[j] = Math.sin((c * 8192 + j) * 0.031) * 0.1; R[j] = L[j]; } ch.push([L, R]); } const dr = new Float32Array(Math.ceil(nn / 128) + 1); for (let k = 0; k < dr.length; k++) dr[k] = 8 * Math.sin(2 * Math.PI * 2.5 * k * 128 / SR); window.__hxChD = { ch, n: nn, dr }; }
            const D = window.__hxChD, pool = []; for (let i = 0; i < 12 + Math.ceil(D.n * 1.02 / 8192) + 2; i++) pool.push([new Float32Array(8192), new Float32Array(8192)]);
            msgs.push({ seg: [[0, 0, SR * 60 / 120]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 24 } }, { schicht: { loop: 1, id: 1, chunks: D.ch, n: D.n, pre: SR, len: 12 * SR, join: 'xf', X: 480, rho: 0.2, tau: true, dd: 1, dr: D.dr } }, { pool });
            po = { rid: 5000 + k, drift: 1, ddPool: 1, humusS: 1 };
          }
          if (eng === 'hxc' || eng === 'hxi') { const hN = Math.ceil(16 * SR / 8192), pool = []; for (let i = 0; i < 3 * hN; i++) pool.push([new Float32Array(8192), new Float32Array(8192)]); msgs.push({ pool }); }   // (step 2b: three rings)
          if (eng === 'hxi') { const hN = Math.ceil(16 * SR / 8192), pool = []; for (let i = 0; i < hN; i++) pool.push([new Float32Array(8192), new Float32Array(8192)]); msgs.push({ pool, ring: 3 }, { mic: { on: 1 } }); po = { mic: 1 }; }   // (step 4: the Mikro's ring, the microphone on)
          const nd = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: eng === 'hxi' ? 4 : 3, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: Object.assign({ humusS: 16, msgs }, cap ? { rid: k + 1, rings: eng === 'hxi' ? 4 : 3 } : {}, po) });
          if (eng === 'hxi') srcs[1].connect(nd, 0, 3);   // (what the microphone hears)
          if (cap) {   // (as the app: Gespielt into input 0; „Alles“ through its own node myzel-ring-in, silent into the output; step 2b: the Puls's lanes into input 2)
            sum.connect(nd, 0, 0);
            const ps = ctx.createGain(); srcs[2].connect(ps); srcs[3].connect(ps); ps.connect(nd, 0, 2);
            const rin = new AudioWorkletNode(ctx, 'myzel-ring-in', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers', processorOptions: { rid: k + 1 } }), z = ctx.createGain();
            z.gain.value = 0; srcs[0].connect(rin); rin.connect(z).connect(ctx.destination);
          }
          if (eng === 'hxd') { const cs = ctx.createConstantSource(); cs.offset.value = 4; cs.connect(nd, 0, 1); cs.start(); }   // (the live drift: 4 ct)
          if (eng === 'hxw' || eng === 'hxx') {   // every pass of the render: its slot and its chunks (2.5 s: the body and its tail), all there before it plays
            const n = Math.round(2.5 * SR), nc = Math.ceil(n / 8192);
            for (let kk = 0; kk < Math.ceil(DUR) + 1; kk++) {
              const mc = new MessageChannel();
              nd.port.postMessage({ wst: { schicht: 1, k: kk, len: SR, cap: n + 8192, port: mc.port1 } }, [mc.port1]);
              for (let i = 0; i < nc; i++) { const L = new Float32Array(8192), R = new Float32Array(8192); for (let j = 0; j < 8192; j++) { const x = i * 8192 + j; L[j] = x < n ? Math.sin(x * (0.03 + 0.001 * kk)) * 0.1 * Math.exp(-x / SR) : 0; R[j] = L[j] * 0.9; } mc.port2.postMessage({ i, L, R }, [L.buffer, R.buffer]); }
              mc.port2.postMessage({ end: n });
            }
          }
          nd.connect(ctx.destination, 0);
        }
        if (eng === 'hxw' || eng === 'hxx') ctx.suspend(128 / SR).then(() => ctx.resume());   // (offline: port messages arrive at a suspend)
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
          else { if (nat) M.A.workletBroken.add(eng); M.playNote(eng, ctx.currentTime, M.noteAt((k * 0.37) % 1).f, YH, 0.5, own ? { rhzNet: 'c' + k } : {}); if (nat) M.A.workletBroken.delete(eng); }
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
    for (const eq of ENGS) out[eq] = +((best[eq] - (eq === 'web3' ? best.base3 : best.base)) / unit * (eq.startsWith('web') ? NV / NW : /^hx[qnci]/.test(eq) ? NV / Math.min(NV, NH) : 1)).toFixed(3);
    const tab = (k, q) => (q === '3' ? M.VCOST3 : M.VCOST1)[k];
    // the scale: table / measured, over the held native engines measured here
    const refs = ENGS.filter((eq) => !/^(hlm|rnk|null|web|elm|jrg|hrz|glt|boe|amo|shn|zpf|mdr|gsp|khl|rhz|hx|fglt|fshn|fx)/.test(eq)), sc = refs.map((eq) => tab(eq.slice(0, -1), eq.slice(-1)) / out[eq]);
    const med = sc.slice().sort((a, b) => a - b), mid = med.length >> 1;   // the median: one disturbed reference moves it least
    out.scale = +(med.length % 2 ? med[mid] : (med[mid - 1] + med[mid]) / 2).toFixed(3); out.scaleEach = Object.fromEntries(refs.map((eq, i) => [eq, +sc[i].toFixed(2)]));
    M.P['dev.q'] = '1';
    return out;
  }, [ROUNDS, DUR, NV, ENGS, XP, +(process.env.Y || 0.6), NW, NH]);
  console.log(JSON.stringify(r));
  await browser.close();
})();
