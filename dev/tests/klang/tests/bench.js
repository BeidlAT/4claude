// Offline render bench for the new engines (klang SPEC §7.1 + the acceptance rows of §3 and the check files): the
// worklet engines Halm, Ranke, Harz, Sehne, Zapfen (and Zapfen's own native stand-in), Glut (and its own native loop), Kehlchen, Moder, Böe, Amöbe, Gespinst and the native ones Elmsfeuer, Jahresring, Rhizom.
// Renders the real app (slot kd-inst, built by run-all.sh) in OfflineAudioContexts with the engine module loaded, pulls
// the samples into Node and measures there.   node bench.js [hlm|rnk|hrz|mdr|boe|elm|jrg ...]   → PASS/FAIL lines, out/<key>/report.json,
// demo WAVs and spectrogram PNGs in out/<key>/. Exit code = number of failures.
process.env.SEED_BLOBS = '';   // the module must load unchanged (the seed shim is for workers)
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'), Z = require('./zpflib');
const fs = require('fs'), path = require('path');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-inst/index.html';
const KEYS = process.argv.slice(2).length ? process.argv.slice(2) : ['hlm', 'khl', 'rnk', 'hrz', 'shn', 'zpf', 'mdr', 'boe', 'amo', 'gsp', 'elm', 'jrg', 'rhz'];
const OUT = path.join(__dirname, 'out');
const SR = 48000;
const DRY = { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 };

async function setup(page) {
  await page.evaluate(() => {
    const M = window.__M;
    // a fresh offline context with the defaults + params, the engine module loaded when one is selected
    window.__ctx = async (dur, params, q = '1', nodsp = false) => {
      M.P['dev.q'] = q;
      const ctx = await window.__off(48000, dur, Object.assign({ 'dev.lat': 'std' }, params, nodsp ? { 'v.eng': 'neb', 'v.layer': 'off' } : {}));   // (nodsp: nothing selected that would load the module)
      M.getQ().budget = 1e4; M.A.jrgAge = 0;   // (Jahresring: a fresh bar for every render)
      window.__dspOk = nodsp ? false : await M.ensureDSP(ctx);   // (nodsp: no module in this context – Glut plays its own native loop)
      return ctx;
    };
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    window.__ret = (b) => ({ L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), sr: b.sampleRate });
    // the standard phrase (snd/render.js): one note every `step` s across the field, held `hold` s (or Puls hits)
    window.__phr = async (ctx, dur, eng, opts = {}) => {
      const sr = ctx.sampleRate, step = opts.step || 0.5, hold = opts.hold || 0.4, all = [];
      for (let j = 0; (j + 1) * step < dur - 2.5; j++) {
        const t = 0.1 + j * step;
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const now = ctx.currentTime;
          for (const v of all) if (v.alive && v._rel && now >= v._rel && v.release && !v.released) v.release();
          const n = M.noteAt(((j * 0.37) % 1) * 0.9 + 0.05);
          const y = opts.y != null ? opts.y : 0.3 + 0.5 * ((j * 0.61) % 1);
          const v = opts.burst ? M.hit(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2, gate: opts.gate || 0.2 }) : M.playNote(eng, now, n.f, y, 0.75, { pan: ((j % 5) - 2) * 0.2 });
          if (v && M.ENGINES[eng].sustain && !opts.burst) { v._rel = now + hold; all.push(v); }
          if (eng === 'kor') M.grainTick(now + step + 0.05);
          ctx.resume();
        });
        // offline, port messages (a worklet voice's release) reach the processor only at the next suspend
        ctx.suspend((Math.round(t * sr / 128) + 1) * 128 / sr).then(() => ctx.resume());
      }
      return ctx.startRendering();
    };
  });
}
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)), sr: r.sr });
function stats(x, from = 0.2) {
  const a = Math.floor(from * x.sr); let pk = 0, ss = 0, n = 0, nan = 0, dc = 0;
  for (let i = a; i < x.L.length; i++) { const l = x.L[i], r = x.R[i]; if (!Number.isFinite(l) || !Number.isFinite(r)) { nan++; continue; } pk = Math.max(pk, Math.abs(l), Math.abs(r)); ss += (l * l + r * r) / 2; dc += (l + r) / 2; n++; }
  return { rms: +(10 * Math.log10(ss / Math.max(1, n) + 1e-20)).toFixed(2), peak: +L.db(pk).toFixed(2), nan, dc: +(dc / Math.max(1, n)).toFixed(5) };
}
// the strongest spectral line within ±4 % of f (Hann, parabolic on dB) – a struck bar's fundamental among its modes
function peakHz(sig, sr, f, at, N) {
  const { p, hz } = L.spectrum(sig, sr, at, N); let b = Math.round(f / hz);
  for (let k = Math.floor(f * 0.96 / hz); k <= Math.ceil(f * 1.04 / hz); k++) if (p[k] > p[b]) b = k;
  const a = 10 * Math.log10(p[b - 1] + 1e-30), c = 10 * Math.log10(p[b] + 1e-30), d = 10 * Math.log10(p[b + 1] + 1e-30);
  return (b + 0.5 * (a - d) / (a - 2 * c + d)) * hz;
}
const mono = (x) => { const m = new Float32Array(x.L.length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (x.L[i] + x.R[i]); return m; };

// a single voice: play at 0.05 s, optional moves [[t, fn-name, arg]], release at `rel` (null = held)
async function one(page, o) {
  return pull(await page.evaluate(async (o) => {
    const M = window.__M, ctx = await window.__ctx(o.dur, Object.assign({ 'v.eng': o.eng }, o.params || {}), o.q || '1', !!o.nodsp);
    if (o.age != null) M.A.jrgAge = o.age;
    if (o.cents) { const c = ctx.createConstantSource(); c.offset.value = o.cents; c.connect(M.A.pitchMod); c.start(); }
    if (o.rseed) { let x = o.rseed; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }   // (the same voice seeds for two renders: level 1 against level 3)
    if (o.vib) { const lf = ctx.createOscillator(), lg = ctx.createGain(); lf.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; lf.connect(lg).connect(M.A.pitchMod); lf.start(); }   // (a vibrato on the pitch bus: [Hz, ±cents])
    let v = null;
    const vel = o.vel != null ? o.vel : 0.75;
    ctx.suspend(19 / 375).then(() => { v = o.burst ? M.hit(o.eng, ctx.currentTime, o.f, o.y, vel, { gate: o.gate, pan: o.pan || 0 }) : M.playNote(o.eng, ctx.currentTime, o.f, o.y, vel, { pan: o.pan || 0 }); window.__v = v; ctx.resume(); });
    const q = (t) => Math.round(t * 375) / 375, kick = (t) => ctx.suspend(q(t) + 1 / 375).then(() => ctx.resume());   // deliver port messages (offline: only at a suspend)
    for (const [t, what, arg] of o.moves || []) { ctx.suspend(q(t)).then(() => { if (v && v.alive) { if (what === 'setY') v.setY && v.setY(arg); else if (what === 'setF') v.setF(arg, 0.1); else if (what === 'hammer') M.wkShake({ v: arg }); } ctx.resume(); }); if (what === 'hammer') kick(t); }
    if (o.rel != null) { ctx.suspend(q(o.rel)).then(() => { if (v && v.release) v.release(); ctx.resume(); }); kick(o.rel); }
    const b = await ctx.startRendering();
    window.__lastV = v;
    return window.__ret(b);
  }, o));
}

// The VCOST table is the final calibration (73ab260, 18.10.2026, a quiet machine), kept as it is (owner, 22.10.2026). Its
// rows are machine-dependent: a machine of another make scales the engines differently against the native references.
// Measured after the container moved hosts on 22.10. – this build and the calibration build in turns, two runs each:
// Elmsfeuer 1.55 / 5.31 against 1.53 / 6.14, Amöbe 0.53 / 1.23 against 0.56 / 1.43, Böe 0.71 / 1.17 against 0.77 / 1.15,
// Gespinst 0.46 / 0.82 against 0.43 / 1.03, Halm 0.72 / 1.27 against 0.68 / 1.11 – the calibration build as dear there as
// this one; the empty worklet voice of the contract row scattered 0.17–0.29 over 16 runs (bound 0.25). So where an entry
// does not cover this machine the row is reported as MACHINE (with the numbers), not as a failure; COST_STRICT=1 measures
// the calibration build in turns (slot calref) and asks this build to be no dearer + 10 %. Sound and correctness rows are
// untouched by this.
const CALREF = '73ab260', CALURL = 'http://127.0.0.1:8790/calref-inst/index.html';
function calrefSlot() {
  const { execFileSync } = require('child_process'), v2 = path.join(__dirname, '../../v2'), d = path.join(__dirname, 'ref', 'calref');
  if (fs.existsSync(path.join(v2, 'calref-inst', 'index.html'))) return;
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), execFileSync('git', ['-C', '/home/user/4claude', 'show', CALREF + ':myzel/index.html'], { maxBuffer: 1 << 28 }));
  fs.copyFileSync('/home/user/4claude/myzel/tap-worklet.js', path.join(d, 'tap-worklet.js'));
  execFileSync('sh', [path.join(v2, 'mk.sh'), d, 'calref'], { stdio: 'ignore' });
}
// cost.js once: the parsed line (env as the row's own call)
function costRun(env, url) {
  const { execFileSync } = require('child_process');
  return JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, env, url ? { KD_URL: url } : {}), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
}
// the row: covered by the entry, or reported as machine-dependent (COST_STRICT=1: against the calibration build). f(c) → [L1, L3]
function costRow(okf, what, tab, cur, env, f) {
  const two = tab[1] < 1e8, fx = (a) => (two ? a : a.slice(0, 1)).map((x) => x.toFixed(2)).join(', ');
  if (tab[0] >= cur[0] && tab[1] >= cur[1]) return okf(true, `${what}${two ? 'VCOST entries ' + tab : 'bound ' + tab[0]} cover the measurement: ${fx(cur)}`);
  if (process.env.COST_STRICT !== '1') { console.log(`MACHINE ${what}${two ? 'VCOST entries ' + tab : 'bound ' + tab[0]} under this machine's ${fx(cur)} – machine-dependent (the table kept, owner 22.10.; the calibration build measures as dear here, see bench.js's head)`); return true; }
  calrefSlot();
  // (fresh runs on both sides – the run that missed the entry is not among them: picked for being high, it would weigh
  // against this build)
  const r1 = f(costRun(env, CALURL)), c1 = f(costRun(env)), r2 = f(costRun(env, CALURL)), c2 = f(costRun(env));
  const c = [Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1])], r = [Math.max(r1[0], r2[0]), Math.max(r1[1], r2[1])];
  return okf(c[0] <= 1.1 * r[0] && c[1] <= 1.1 * r[1], `${what}${two ? 'VCOST entries ' + tab : 'bound ' + tab[0]} under this machine's ${fx(cur)}; in turns, two runs each: this build ${fx(c)}, the calibration build (${CALREF}) ${fx(r)} – no dearer + 10 % (the table kept, owner 22.10.)`);
}
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(browser, URL_, false);
  await setup(page);
  const ref = {};
  // references: the standard phrase, dry, level 1
  for (const k of ['neb', 'glo', 'mem']) ref[k] = stats(pull(await page.evaluate(async (k) => window.__ret(await window.__phr(await window.__ctx(10, Object.assign({ 'v.eng': k }, { 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 })), 10, k)), k)));
  const refMean = 10 * Math.log10((Math.pow(10, ref.neb.rms / 10) + Math.pow(10, ref.glo.rms / 10) + Math.pow(10, ref.mem.rms / 10)) / 3);
  console.log('references (phrase RMS dBFS): neb ' + ref.neb.rms + ', glo ' + ref.glo.rms + ', mem ' + ref.mem.rms + ' → mean ' + refMean.toFixed(2));
  // the contract's own price: an empty processor voice (SPEC §8 step 1 gate ≈ 0.06 + 3 × 0.03)
  { const { execFileSync } = require('child_process');
    const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), '6'], { env: Object.assign({}, process.env, { ENGS: 'null1,hau1,obt1,neb3' }), encoding: 'utf8', timeout: 900000 }).trim().split('\n').pop());
    costRow(L.ok, 'contract: an empty worklet voice – ', [0.25, 1e9], [c.null1 * c.scale, 0], { ENGS: 'null1,hau1,obt1,neb3' }, (x) => [x.null1 * x.scale, 0]); }
  let fails = 0;
  const T = {
    hlm: { f0: [110, 220, 440, 880, 1760, 2500], ys: [0.45, 0.6, 0.8], tol: 5, costMax: 0.55 },
    rnk: { f0: [55, 110, 220, 440, 880, 1760], ys: [0.2, 0.5, 0.8], tol: 1, costMax: 0.5 },
    // Kehlchen: pitch over the (f, pressure) grid with the syllables off and no roughness (SPEC: ≤ 10 ct)
    // (a whistle: its partials, not a centroid that the fundamental holds near 220 Hz – the khl block's „partials rise
    // with pressure“; below the threshold there is only breath)
    khl: { f0: [220, 440, 880, 1760, 3000, 4500], ys: [0.35, 0.6, 0.9, 1], tol: 10, costMax: 0.5, pp: { 'khl.silbe': 'aus', 'khl.rauheit': 0 }, cYs: [0.35, 0.6, 1], partials: true },
    hrz: { f0: [110, 220, 440, 880, 1568], ys: [0.45], tol: 5, costMax: 1.2 },
    // ---- Klangbibliothek II, Etappe 1 (26.10.2026): Welt ----
    hng: { struck: true, f0: [110, 220, 440, 880, 1760], ys: [0.2, 0.8], tol: 3, costMax: 1.2, ring: 9, cost: { DUR: '3' } },
    gml: { struck: true, f0: [110, 220, 440, 880, 1760], ys: [0.2, 0.8], tol: 3, costMax: 1.0, ring: 9, cost: { DUR: '3' }, pp: { 'gml.ombak': 0 } },   // (pitch on the pair's centre: with Ombak its two keys stand ± 2.6 Hz apart – the beat – and a 16k window picks one of them)
    sit: { struck: true, f0: [110, 220, 440, 880], ys: [0.2], tol: 8, costMax: 1.5, ring: 9, line: true, cost: { DUR: '3' } },
    tbl: { f0: [220, 440, 880, 1760], ys: [0.45], tol: 6, costMax: 0.8 },
    did: { f0: [55, 110, 220, 440], ys: [0.3, 0.7], tol: 5, costMax: 1.0 },
    mtr: { f0: [110, 220, 440, 880], ys: [0.3, 0.7], tol: 3, costMax: 1.0 },   // (the default body, Glas; every body below)
    // ---- Etappe 2/3 (Sphäre, Psyche) ----
    nrd: { f0: [55, 110, 220, 440, 880], ys: [0.5], tol: 5, costMax: 3.09 },   // (48 partials, 64 at level 3: the price of the surface – sound first)
    // Schimmer: its room is the instrument – a halo that rings for seconds: pitch and glide with the room small and no
    // shimmer (else the tail still sings the last note), the release and the Puls hits measured to their end
    sht: { f0: [110, 220, 440, 880], ys: [0.3], tol: 8, costMax: 2.13, pp: { 'sht.raum': 0, 'sht.schimmer': 0 }, rel: { dur: 6.5, t60max: 5200, quiet: [5.9, 6.5] }, burstDur: (g) => g + 2.0 },
    ond: { f0: [110, 220, 440, 880, 1760], ys: [0.3, 0.7], tol: 5, costMax: 1.51, pp: { 'ond.vibrato': 0 } },
    wal: { f0: [55, 110, 220, 440], ys: [0.5], tol: 15, costMax: 2.33, line: true, lineAt: 1.4, pp: { 'wal.knarren': 0 } },   // (the cry arrives on the note in its arc: measured on the line after it)
    stp: { pitchless: 'a Shepard tone has no single pitch (its octave voices glide forever)', costMax: 1.51 },
    atr: { f0: [110, 220, 440], ys: [0.1], tol: 10, costMax: 0.95 },   // (the lock on the note: low on the field the orbit is periodic)
    tnl: { f0: [110, 220, 440, 880], ys: [0.8], tol: 8, costMax: 1.05, line: true },
    // ---- Etappe 4 (Strom, Trap, LoFi, Welt) ----
    wkg: { f0: [55, 110, 220, 440, 880], ys: [0.2, 0.7], tol: 5, costMax: 1.49 },
    bnt: { f0: [110, 220, 440, 880], ys: [0.05], tol: 6, costMax: 0.95 },   // (low on the field the clean toy; up the field it jumps – by design)
    kas: { f0: [110, 220, 440, 880], ys: [0.5], tol: 8, costMax: 1.16, pp: { 'kas.alter': 0 }, line: true },   // (the tape's wow is the instrument: pitch on a new tape)
    bit: { f0: [110, 220, 440, 880, 1760], ys: [0.2, 0.8], tol: 3, costMax: 1.16, pp: { 'bit.leben': 0 } },
    gbs: { f0: [41, 55, 82, 110, 220], ys: [0.1, 0.6], tol: 5, costMax: 1.31, line: true },
    hht: { struck: true, pitchless: 'a hi-hat: six squares in a cluster, tuned with the note but no pitch of its own', loud: [-11, 2], costMax: 0.94 },   // (ticks against held tones: it sits ≈ 9 dB lower, its peak at −3 dBFS)
    vox: { f0: [110, 220, 440, 660], ys: [0.5], tol: 8, costMax: 1.16, pp: { 'vox.vibrato': 0, 'vox.konsonant': 0 }, cYs: [0, 0.25, 0.5] },   // (u → o → a: the centroid rises; e and i are brighter by F2 but their low F1 holds it)
    spu: { struck: true, f0: [262, 523, 1047, 2093], ys: [0.8], tol: 5, costMax: 1.08, ring: 5, cost: { DUR: '2.5' } },
    kto: { f0: [110, 220, 440, 880], ys: [0.5], tol: 6, costMax: 0.81, line: true },
    gsp: { struck: true, web: true, ring: 4.5, f0: [110, 220, 440, 880, 1760], ys: [0.5], tol: 3, costMax: 0.45, cost: { DUR: '2' } },   // (a native pluck; the web is measured on its own below)
    // Moder: struck – pitch on the fundamental's line at the strike (wet: the swell's moisture), the voice lives its Nachklang
    mdr: { struck: true, f0: [110, 220, 440, 880, 1760], ys: [0.7], tol: 2, costMax: 0.65, ring: 5 * 1.3 + 0.15, cost: { DUR: '4' } },
    boe: { f0: [110, 220, 440, 880, 1760], ys: [0.2, 0.5, 0.8], tol: 5, costMax: 0.8, pp: { 'boe.rauschen': 0 } },   // (pitch: the strings, without the wind's band among them)
    // Amöbe: the lock at Zeit 0 (SPEC: ≤ 3 ct, 50–500 Hz; a short window's estimate scatters with the harmonics' wander
    // higher up – the long-window lock is amoLock below); every note has its own seed polygon: centroids averaged
    amo: { f0: [55, 110, 220, 440], ys: [0.2, 0.5], tol: 3, costMax: 0.45, pp: { 'amo.zeit': 0 }, cAvg: 16 },   // (16 notes: one note's centroid at 0.3 s spans 300–600 Hz at y 0 and 320–770 at y 0.5 – means 395 / 445, the same in the calibration build; six read the scatter: 2 of 4 runs on 22.10.)
    // Sehne: pitch on the fundamental's line (the stiffness stretches the partials: a harmonic comb reads them sharp),
    // open and under the E-Bow; Höhe's colour at the pluck (held, the hand is the palm, a node or the E-Bow – not a filter)
    shn: { f0: [55, 110, 220, 440, 880, 2000], ys: [0.5, 0.9], tol: 3, costMax: 0.7, line: true, cAt: 0.055, cN: 4 },
    // native: pitch on the hum with Netz 0 (the note itself) low on the field; the bar's fundamental at the strike
    elm: { native: true, f0: [55, 110, 220, 440, 880, 1760], ys: [0.1], tol: 5, costMax: 0.8, pp: { 'elm.netz': 0 } },
    jrg: { native: true, struck: true, f0: [110, 220, 440, 880, 1760], ys: [0, 0.3], tol: 2, costMax: 0.75, pp: { 'jrg.jahreszeit': 'sommer' },
      cost: { DUR: '2', PARAMS: '{"jrg.holz":1,"jrg.jahreszeit":"sommer"}' } },   // (the cost run inside the voices' life)
    // Rhizom: native; pitch on the struck ping with Reiz 0 (no cascade); the voice lives its cascade and the last ping
    rhz: { native: true, struck: true, f0: [110, 220, 440, 880, 1760], ys: [0, 0.5], tol: 3, costMax: 0.65, ring: 4, pp: { 'rhz.reiz': 0 }, cAvg: 6, cost: { DUR: '3' } },
    // Zapfen: the pitch at the top (SPEC §3.8: y 1, Rast) on the fundamental's line (a harmonic comb would read the
    // body's inharmonic modes beside the harmonics)
    zpf: { f0: [55, 110, 220, 440, 880, 1760], ys: [1], tol: 5, costMax: 0.55, line: true, lineAt: 1.0, cWin: true },
    // Glut: a self-oscillating loop – its pitch is its fundamental's line (lesson 12); held below the jump (y < 0.75);
    // let go it glows Nachglühen (1.5 s) long, so the release and the bursts render longer
    glt: { f0: [55, 110, 220, 440, 880, 1760], ys: [0.45, 0.6, 0.7], tol: 8, costMax: 0.55, line: true, rel: { dur: 4.6, t60max: 2600, quiet: [4.0, 4.6] }, burstDur: (g) => g + 2.3 },
  };
  for (const key of KEYS) {
    const tc = T[key], dir = path.join(OUT, key), rep = { key };
    fs.mkdirSync(dir, { recursive: true });
    console.log('\n=== ' + key + ' ===');
    const ok = (c, m) => { const r = L.ok(c, key + ': ' + m); if (!r) fails++; return r; };
    // -- health: the module loads in an offline context, a voice plays its own processor
    const health = await page.evaluate(async (key) => { const M = window.__M; const ctx = await window.__ctx(1, { 'v.eng': key }); const v = M.playNote(key, 0.05, 220, 0.6, 0.7, {}); await ctx.startRendering(); return { ok: window.__dspOk, as: v && v.as, wk: !!(v && v.wk), want: M.dspWanted(), web: !!(M.A.gsp && M.A.gsp.node) }; }, key);
    if (tc.native) ok(health.as === key && !health.wk && !health.want, 'native: plays with standard nodes, needs no module ' + JSON.stringify(health));
    else if (tc.web) ok(health.ok && health.as === key && !health.wk && health.web, 'module loads in the offline context, the voice plucks natively and feeds the web ' + JSON.stringify(health));
    else ok(health.ok && health.as === key && health.wk, 'module loads in the offline context, the voice runs its own processor ' + JSON.stringify(health));
    // -- loudness: the standard phrase, L1 and L3, Puls bursts
    const loud = {};
    for (const [name, q, burst] of [['L1', '1', false], ['L3', '3', false], ['burst', '1', true]]) {
      const x = pull(await page.evaluate(async ([key, q, burst]) => window.__ret(await window.__phr(await window.__ctx(10, { 'v.eng': key, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, q), 10, key, { burst })), [key, q, burst]));
      loud[name] = stats(x);
      if (name === 'L1') { L.wav(path.join(dir, 'phrase-L1.wav'), x.L, x.R, SR); }
    }
    rep.loud = loud; rep.ref = ref;
    { const [lo, hi] = tc.loud || [-2, 2], d = loud.L1.rms - refMean;   // (tc.loud: a source that sits lower by its nature – a hi-hat's ticks against held tones – with its window)
      ok(d >= lo && d <= hi, `loudness L1 ${loud.L1.rms} dB vs references' mean ${refMean.toFixed(2)} (${lo} … +${hi} dB; neb ${ref.neb.rms}, glo ${ref.glo.rms}, mem ${ref.mem.rms})`); }
    ok(Math.abs(loud.L3.rms - loud.L1.rms) <= 1.5, `level 3 ${loud.L3.rms} within ±1.5 dB of level 1 ${loud.L1.rms}`);
    ok(Math.max(loud.L1.peak, loud.L3.peak, loud.burst.peak) <= -1, `peak ≤ −1 dBFS (L1 ${loud.L1.peak}, L3 ${loud.L3.peak}, burst ${loud.burst.peak})`);
    ok(!loud.L1.nan && !loud.L3.nan && !loud.burst.nan, 'no NaN');
    ok(Math.max(Math.abs(loud.L1.dc), Math.abs(loud.L3.dc), Math.abs(loud.burst.dc)) < 0.01, `no DC (|dc| < 0.01: ${loud.L1.dc}, ${loud.L3.dc}, ${loud.burst.dc})`);
    ok(loud.burst.rms >= loud.L1.rms - 12, `Puls bursts audible: phrase of 0.2-s hits ${loud.burst.rms} dB vs held phrase ${loud.L1.rms}`);
    // -- timbre vs height: one note at 220 Hz, centroid 0.3–0.4 s
    const yc = {};
    for (const y of tc.cYs || [0, 0.5, 1]) {
      if (tc.cWin) { const m = mono(await one(page, { eng: key, f: 220, y, dur: 2.2, params: DRY })); let c = 0, n = 0; for (let t = 0.3; t < 2.05; t += 0.05) { c += L.centroid(m, SR, t, 4096); n++; } yc[y] = Math.round(c / n); continue; }   // (Zapfen: over many windows – at y 0 a 85-ms window holds a knock or none)
      let c = 0; const cn = tc.cN || tc.cAvg || 1; for (let i = 0; i < cn; i++) { const x = await one(page, { eng: key, f: 220, y, dur: 1, params: DRY }); c += L.centroid(mono(x), SR, tc.cAt || (tc.struck ? 0.055 : 0.3), 4096) / cn; } yc[y] = Math.round(c); }   // (a struck bar: its strike; a seeded engine: the mean of cAvg notes)
    rep.yCentroidHz = yc;
    if (key === 'glt') {   // (a loop: at 0.3 s every height is still a near-sine on its note – lesson 5. Höhe saturates the settled tone – h3/h1 rises – and at the top jumps to the twelfth)
      const hc = []; for (const y of [0.35, 0.5, 0.74]) { const sp = L.spectrum(mono(await one(page, { eng: key, f: 220, y, dur: 2, params: DRY })), SR, 1.5, 16384); hc.push(+(L.harm(sp, 220, 3) - L.harm(sp, 220, 1)).toFixed(1)); }
      rep.yColour = hc;
      ok(yc[1] > 2 * yc[0.5] && hc[0] < hc[1] && hc[1] < hc[2], `Höhe colours the tone: h3/h1 at 1.5 s for y 0.35/0.5/0.74 ${hc.join(' / ')} dB, at the top the twelfth (centroid y 0 ${yc[0]} Hz, 0.5 ${yc[0.5]} Hz, 1 ${yc[1]} Hz)`); }
    else if (key === 'mdr') console.log(`INFO mdr: centroid at the strike y 0/0.5/1: ${yc[0]}/${yc[0.5]}/${yc[1]} Hz – Höhe is the moisture, not the strike's colour (its rows: mdrWet below)`);
    else if (tc.struck) ok(yc[0] < yc[1], `centroid: the bar's end brighter than its centre (the nodal line between may stand out): y 0 ${yc[0]} Hz, 0.5 ${yc[0.5]} Hz, 1 ${yc[1]} Hz`);
    else if (tc.partials) console.log(`INFO ${key}: centroid at y ${(tc.cYs || []).join('/')}: ${(tc.cYs || []).map((y) => yc[y]).join('/')} Hz (a whistle: the rows on its partials below)`);
    else { const ys = tc.cYs || [0, 0.5, 1], c = ys.map((y) => yc[y]); ok(c[0] < c[1] && c[1] < c[2], `centroid rises with Höhe: ${ys.map((y, i) => 'y ' + y + ' ' + c[i] + ' Hz').join(', ')}`); }
    const PP = Object.assign({}, DRY, tc.pp || {}), pitchAt = (m, f, at) => (tc.struck ? peakHz(m, SR, f, 0.15, 16384) : tc.line ? peakHz(m, SR, f, at || tc.lineAt || (key === 'glt' ? 1.2 : 0.6), 32768) : L.combPitch(m, SR, f, at || 0.6, key === 'rnk' ? 32768 : 16384));
    if (tc.pitchless) console.log(`INFO ${key}: no pitch grid – ${tc.pitchless}`);   // (Klangbibliothek II: a hi-hat, the Shepard tone)
    else {
    // -- pitch: the grid at 0.6 s (reed: YIN + phase refinement; ring: comb of harmonics with their sidebands)
    const pit = [];
    for (const f of tc.f0) for (const y of tc.ys) {
      const x = await one(page, { eng: key, f, y, dur: 2.2, params: PP }); const m = mono(x);
      const fm = pitchAt(m, f);   // (power-weighted harmonic comb: exact on the reed; the ring's sidebands need the longer window; the bar: its fundamental's line)
      pit.push([f, y, +L.cents(fm, f).toFixed(2)]);
    }
    rep.f0 = pit;
    const worst = pit.reduce((a, b) => (Math.abs(b[2]) > Math.abs(a[2]) ? b : a));
    ok(Math.abs(worst[2]) <= tc.tol, `f0 within ${tc.tol} ct on ${pit.length} notes ${tc.f0[0]}–${tc.f0[tc.f0.length - 1]} Hz (worst ${worst[2]} ct at ${worst[0]} Hz, y ${worst[1]})`);
    // -- Bebung: the pitch bus +50 ct moves the note by 50 ct
    { const f = 220, x = await one(page, { eng: key, f, y: tc.ys[0] != null && (tc.native || tc.lineAt) ? tc.ys[0] : 0.6, dur: 2.2, params: PP, cents: 50 }); const m = mono(x);
      const fm = tc.struck ? peakHz(m, SR, f * Math.pow(2, 50 / 1200), 0.15, 16384) : tc.line ? peakHz(m, SR, f * Math.pow(2, 50 / 1200), tc.lineAt || (key === 'glt' ? 1.2 : 0.6), tc.lineAt || key === 'glt' ? 32768 : 16384) : L.combPitch(m, SR, f * Math.pow(2, 50 / 1200), 0.6, 16384);
      const c = L.cents(fm, f); rep.bebung = +c.toFixed(2); ok(Math.abs(c - 50) <= 5, `Bebung: pitch bus +50 ct → ${c.toFixed(2)} ct`); }
    // -- glide: setF moves the pitch (k-rate freq through glideTo)
    if (!tc.struck) { const x = await one(page, { eng: key, f: 220, y: tc.native ? 0.1 : tc.lineAt ? 1 : 0.6, dur: 2.5, params: PP, moves: [[1.0, 'setF', 330]] }); const m = mono(x);
      const fm = tc.line ? peakHz(m, SR, 330, 1.6, tc.lineAt || key === 'glt' ? 32768 : 16384) : L.combPitch(m, SR, 330, 1.6, 16384);
      ok(Math.abs(L.cents(fm, 330)) <= tc.tol + 1, `setF 220 → 330 Hz lands at ${fm.toFixed(2)} Hz`); }
    }
    // -- held: Höhe moves the timbre on a sounding voice (Gestik's Höhe arrives through setY)
    if (key === 'hlm' || key === 'elm' || key === 'hrz' || key === 'glt') { const y0 = key === 'elm' ? 0.2 : 0.4, x = await one(page, { eng: key, f: 220, y: y0, dur: 3, params: DRY, moves: [[1.0, 'setY', 0.85]] }); const m = mono(x);
      const mc = (t0, t1) => { let s = 0, n = 0; for (let t = t0; t < t1; t += 0.05) { s += L.centroid(m, SR, t, 4096); n++; } return s / n; };
      const a = mc(0.5, 0.9), b = mc(1.5, 2.8); rep.setY = [Math.round(a), Math.round(b)];
      ok(b > a * 1.1, `setY ${y0} → 0.85 on a held voice: centroid ${Math.round(a)} → ${Math.round(b)} Hz`); }
    else if (key === 'rnk') {   // Ranke: Höhe sets the width of the stroking taps and the push, and the damping – the held tone follows
      const mc = async (moves) => { const x = mono(await one(page, { eng: key, f: 220, y: 0.2, dur: 4, params: DRY, moves })); let s = 0, n = 0; for (let t = 1.5; t < 3.7; t += 0.1) { s += L.centroid(x, SR, t, 4096); n++; } return s / n; };
      const c = [await mc([]), await mc([[1.0, 'setY', 0.95]])];
      rep.setY = c.map(Math.round);
      ok(c[1] > c[0] * 1.15, `setY 0.2 → 0.95 on a held ring: mean centroid 1.5–3.7 s ${Math.round(c[0])} → ${Math.round(c[1])} Hz`); }
    // -- release: the voice ends, nothing left (a struck bar: it rings out by itself)
    if (tc.struck) { const rg = tc.ring || 3.5, x = await one(page, { eng: key, f: 440, y: 0.3, dur: rg + 0.5, params: PP }); const m = mono(x);
      const fin = await page.evaluate(async () => { const v = window.__lastV; await new Promise((r) => setTimeout(r, (v.endAt - v.t0) * 1000 + 400)); return { alive: v.alive, life: +(v.endAt - v.t0).toFixed(2) }; });   // (the voice's timer runs on the wall clock)
      rep.life = fin.life;
      const tl = L.db(L.rms(m, rg * SR, (rg + 0.5) * SR));
      ok(tl < -100 && !fin.alive && fin.life < rg + 0.5, `rings out and is freed (life ${fin.life} s, ${tl.toFixed(1)} dB at ${rg}–${rg + 0.5} s${fin.alive ? ', still alive' : ''})`); }
    else if (key === 'boe') {   // the strings ring on with Nachklang (3 s): SPEC – after release ≥ 1 s; the voice ends by itself
      const x = await one(page, { eng: key, f: 440, y: 0.36, dur: 8, params: DRY, rel: 1.0 }); const m = mono(x);
      const held = L.rms(m, 0.6 * SR, 0.95 * SR), e = L.env(m, SR, 0.005); let t60 = Infinity; for (let i = 200; i < e.length; i++) if (e[i] < held * 0.001) { t60 = (i - 200) * 5; break; }
      rep.release60ms = t60;
      ok(t60 >= 1000 && t60 < 6000, `boeRing: after release the strings ring ${t60} ms to −60 dB (SPEC ≥ 1 s at Nachklang 3)`);
      const tail = L.env(m, SR, 0.1).slice(14); let worstUp = 0; for (let i = 1; i < tail.length; i++) if (tail[i] > 1e-5) worstUp = Math.max(worstUp, L.db(tail[i]) - L.db(tail[i - 1]));
      rep.tailRise = +worstUp.toFixed(2);
      ok(worstUp <= 1.5, `release tail monotone once the wind is gone (largest rise between 100-ms windows ${worstUp.toFixed(2)} dB ≤ 1.5: the ringing strings beat a little)`);
      const fin = await page.evaluate(async () => { const v = window.__lastV; await new Promise((r) => setTimeout(r, 300)); return { alive: v.alive }; });
      ok(L.rms(m, 7.5 * SR, 8 * SR) < 1e-5 && !fin.alive, 'silent after the ring, the voice freed (the processor ends it)'); }
    else { const rl = tc.rel || { dur: 3, t60max: 2500, quiet: [2.6, 3] }, x = await one(page, { eng: key, f: 440, y: 0.6, dur: rl.dur, params: DRY, rel: 1.0 }); const m = mono(x);
      const held = L.rms(m, 0.6 * SR, 0.95 * SR), e = L.env(m, SR, 0.005); let t60 = Infinity; for (let i = 200; i < e.length; i++) if (e[i] < held * 0.001) { t60 = (i - 200) * 5; break; }
      rep.release60ms = t60;
      if (key === 'hlm') ok(t60 <= 60, `decay after release to −60 dB in ${t60} ms (≤ 60)`);
      else ok(t60 < rl.t60max, `release reaches −60 dB in ${t60} ms`);
      const tail = L.env(m, SR, 0.1).slice(10); let worstUp = 0; for (let i = 1; i < tail.length; i++) if (tail[i] > 1e-5) worstUp = Math.max(worstUp, L.db(tail[i]) - L.db(tail[i - 1]));
      rep.tailRise = +worstUp.toFixed(2);
      const upMax = key === 'elm' ? 4 : key === 'hrz' ? 3 : 1;   // (Elmsfeuer's last crackles are sparse: 100-ms windows hold a few or none; Harz's glass rings on with its doublets beating)
      ok(worstUp <= upMax, `release tail monotone (largest rise between 100-ms windows ${worstUp.toFixed(2)} dB ≤ ${upMax}, no pumping)`);
      ok(L.rms(m, rl.quiet[0] * SR, rl.quiet[1] * SR) < 1e-5, 'silent after the release'); }
    // -- Puls: hit() with short gates – audible inside the gate, the voice finishes
    { const held = await one(page, { eng: key, f: 440, y: 0.6, dur: 1.2, params: DRY }); const hRms = L.rms(mono(held), 0.6 * SR, 1.1 * SR);
      const bl = [];
      for (const g of [0.06, 0.112, 0.22, 0.5]) {
        const d = tc.burstDur ? tc.burstDur(g) : tc.struck ? (key === 'mdr' ? 3.2 : key === 'gsp' ? 5 : 4) : key === 'boe' ? 4 : 1.6, x = await one(page, { eng: key, f: 440, y: 0.6, dur: d, params: DRY, burst: true, gate: g }); const m = mono(x);   // (a struck voice rings out its own time – Gespinst's web its Nachklang after it; Böe's gust-pluck rings past the gate, ≤ 1.5 s)
        const e = L.env(m.subarray(0.05 * SR, (0.05 + g) * SR), SR, 0.02); const mx = Math.max(...e);
        bl.push([g, +(L.db(mx) - L.db(hRms)).toFixed(1), +L.db(L.rms(m, Math.round((d - 0.3) * SR), Math.round(d * SR))).toFixed(1)]);   // (indices rounded: lesson 11)
      }
      const fin = await page.evaluate(async () => { const v = window.__lastV; await new Promise((r) => setTimeout(r, Math.max(900, v ? (v.endAt - v.t0) * 1000 + 400 : 0))); return !v || !v.alive; });
      rep.burst = bl;
      ok(bl.every((b) => b[1] >= -20), 'burst level inside the gate ≥ −20 dB vs held: ' + bl.map((b) => b[0] * 1000 + ' ms ' + b[1] + ' dB').join(', '));
      ok(bl.every((b) => b[2] < -100) && fin, 'burst voices end (silent after the gate + release, voice freed): ' + bl.map((b) => b[2] + ' dB').join(', ') + (fin ? '' : ', the last still alive')); }
    // -- lane: 8 hits/s for 3 s, gate 0.11 – voices and budget stay bounded
    { const r = await page.evaluate(async (key) => {
        const M = window.__M, ctx = await window.__ctx(4, { 'v.eng': key, 'rev.mix': 0, 'dly.mix': 0 });
        M.applyQuality(); let maxV = 0, maxL = 0; const vb = M.getBudget ? M.getBudget()[0] : 14;
        for (let j = 0; j < 24; j++) ctx.suspend(Math.round((0.1 + j / 8) * 375) / 375).then(() => { M.hit(key, ctx.currentTime, M.noteAt((j * 0.37) % 1).f, 0.6, 0.7, { gate: 0.11 }); let n = 0; for (const v of M.A.voices) if (v.alive && ctx.currentTime < v.endAt) n++; maxV = Math.max(maxV, n); maxL = Math.max(maxL, M.voiceLoad()); ctx.resume(); });
        const b = await ctx.startRendering(); return { maxV, maxL, vb, st: window.__stats(b, 0.2) };
      }, key);
      rep.lane = r;
      ok(r.maxL <= r.vb && r.st.nan === 0 && r.st.rms > -60 && (key !== 'shn' || r.maxV <= 8), `Puls lane 8 hits/s: at most ${r.maxV} sounding voices${key === 'shn' ? ' (≤ 8: 16ths at 120 bpm finish)' : ''}, load ${r.maxL.toFixed(2)} ≤ budget ${r.vb}, RMS ${r.st.rms} dB`); }
    // -- cost: cost.js (24 voices vs 24 Nebel, interleaved rounds), scaled to the VCOST table by the native engines
    { const { execFileSync } = require('child_process');
      const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, { ENGS: key + '1,' + key + '3,' + (tc.web ? 'web1,web3,' : '') + 'hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }, tc.cost || {}), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());   // (more references: this machine's runs scatter)
      const nv = 24, c1 = (c[key + '1'] - (tc.web ? c.web1 / nv : 0)) * c.scale, c3 = (c[key + '3'] - (tc.web ? c.web3 / nv : 0)) * c.scale;   // (Gespinst: its voices share one web – its 1/NV taken off, the web measured on its own)
      rep.cost = { raw: [c[key + '1'], c[key + '3']], scale: c.scale, L1: +c1.toFixed(3), L3: +c3.toFixed(3), table: await page.evaluate((k) => [window.__M.VCOST1[k], window.__M.VCOST3[k]], key) };
      // (the owner's rule: best sound first – cost is measured and entered honestly, never a limit; SPEC's target for
      // reference only. Repeated runs on this machine scatter by ±10–20 %)
      console.log(`INFO ${key}: cost level 1: ${c1.toFixed(3)} Nebel units (raw ${c[key + '1']} × table scale ${c.scale}; SPEC's estimate ${tc.costMax})`);
      console.log(`INFO ${key}: cost level 3: ${c3.toFixed(3)} = ${(c3 / c1).toFixed(2)}× level 1`);
      costRow(ok, '', rep.cost.table, [c1, c3], Object.assign({ ENGS: key + '1,' + key + '3,' + (tc.web ? 'web1,web3,' : '') + 'hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }, tc.cost || {}), (x) => [(x[key + '1'] - (tc.web ? x.web1 / nv : 0)) * x.scale, (x[key + '3'] - (tc.web ? x.web3 / nv : 0)) * x.scale]); }
    // -- engine-specific acceptance rows
    if (key === 'hlm') {
      const lv = {};
      for (const y of [0, 0.2, 0.35, 0.6]) for (const f of [110, 440]) { const x = await one(page, { eng: key, f, y, dur: 1.2, params: DRY }); lv[f + '@' + y] = L.db(L.rms(mono(x), 0.7 * SR, 1.15 * SR)); }
      rep.levels = lv;
      for (const f of [110, 440]) ok(lv[f + '@0.35'] - lv[f + '@0.2'] >= 20, `threshold between y 0.2 and 0.35 at ${f} Hz: ${lv[f + '@0.2'].toFixed(1)} → ${lv[f + '@0.35'].toFixed(1)} dB (jump ≥ 20 dB)`);
      for (const f of [110, 440]) ok(lv[f + '@0'] - lv[f + '@0.6'] >= -40 && lv[f + '@0'] - lv[f + '@0.6'] < -6, `air at y 0, ${f} Hz: ${(lv[f + '@0'] - lv[f + '@0.6']).toFixed(1)} dB vs the tone at y 0.6 (≥ −40)`);
      const on = [];
      for (const [f, lim] of [[110, 250], [440, 100]]) { const x = await one(page, { eng: key, f, y: 0.6, dur: 1.4, params: DRY }); const m = mono(x); const t = L.t90(m, SR, 0.05, L.rms(m, 0.9 * SR, 1.3 * SR)); on.push([f, Math.round(t * 1000)]); ok(t * 1000 <= lim, `onset t90 at ${f} Hz, y 0.6: ${Math.round(t * 1000)} ms (≤ ${lim})`); }
      rep.t90 = on;
      const hh = [];
      for (const f of [110, 220, 440, 880]) for (const y of [0.45, 0.7]) { const x = await one(page, { eng: key, f, y, dur: 1.4, params: DRY }); const sp = L.spectrum(mono(x), SR, 0.8, 16384); hh.push([f, y, +(L.harm(sp, f, 2) - L.harm(sp, f, 3)).toFixed(1)]); }
      rep.h2h3 = hh;
      ok(hh.every((h) => h[2] <= -20), 'odd harmonics dominate (h2 ≤ h3 − 20 dB): ' + hh.map((h) => h[0] + '/' + h[1] + ' ' + h[2]).join(', '));
      // the top: squeezed but sounding most of the time
      { const x = await one(page, { eng: key, f: 220, y: 1, dur: 3, params: DRY }); const e = L.env(mono(x), SR, 0.05).slice(10); const on2 = e.filter((v) => L.db(v) > -30).length / e.length; rep.top = +on2.toFixed(2); ok(on2 > 0.6, `y 1 (Quietschen): sounding ${(on2 * 100).toFixed(0)} % of the time (chokes, comes back)`); }
      // ---- the flute and the flame (SPEC §3.2: they ship only if their rows pass) ----
      const gz = (x, a, b, fq) => { a = Math.round(a); b = Math.round(b); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return Math.hypot(re, im) / Math.max(1, b - a); };
      const tone = (m, f, w = 30) => { const o = new Float32Array(m.length), wq = 2 * Math.PI * f / SR, r = 1 - wq / w, c = 2 * r * Math.cos(wq); let y1 = 0, y2 = 0; for (let i = 0; i < m.length; i++) { const v = m[i] + c * y1 - r * r * y2; y2 = y1; y1 = v; o[i] = v * (1 - r); } return o; };   // (a resonator at f: the tone out of the air or the fire)
      for (const rohr of ['floete', 'flamme']) {
        const PR = (x) => Object.assign({}, DRY, { 'hlm.rohr': rohr }, x || {}), tag = rohr === 'floete' ? 'flute' : 'flame';
        const okr = (c, m) => ok(c, tag + ': ' + m);
        const ld = {};
        for (const [name, q, burst] of [['L1', '1', false], ['L3', '3', false], ['burst', '1', true]]) {
          const x = pull(await page.evaluate(async ([key, q, burst, rohr]) => window.__ret(await window.__phr(await window.__ctx(10, { 'v.eng': key, 'hlm.rohr': rohr, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }, q), 10, key, { burst })), [key, q, burst, rohr]));
          ld[name] = stats(x); if (name === 'L1') L.wav(path.join(dir, 'phrase-' + rohr + '-L1.wav'), x.L, x.R, SR);
        }
        rep[rohr] = { loud: ld };
        okr(Math.abs(ld.L1.rms - refMean) <= 2, `loudness L1 ${ld.L1.rms} dB vs references' mean ${refMean.toFixed(2)} (±2 dB)`);
        okr(Math.abs(ld.L3.rms - ld.L1.rms) <= 1.5, `level 3 ${ld.L3.rms} within ±1.5 dB of level 1 ${ld.L1.rms}`);
        okr(Math.max(ld.L1.peak, ld.L3.peak, ld.burst.peak) <= -1, `peak ≤ −1 dBFS (L1 ${ld.L1.peak}, L3 ${ld.L3.peak}, burst ${ld.burst.peak})`);
        okr(!ld.L1.nan && !ld.L3.nan && !ld.burst.nan && Math.max(Math.abs(ld.L1.dc), Math.abs(ld.L3.dc), Math.abs(ld.burst.dc)) < 0.01, 'no NaN, no DC');
        okr(ld.burst.rms >= ld.L1.rms - 12, `Puls bursts audible: ${ld.burst.rms} dB vs held phrase ${ld.L1.rms}`);
        if (rohr === 'floete') {
          // registers: 1 low, the octave above the overblowing point (Strahl 0.5: y 0.72), the twelfth at the very top
          const fr = [];
          for (const f of [110, 220, 440, 880, 1320]) for (const [y, reg] of [[0.4, 1], [0.85, 2], [0.97, 3]]) {
            if (reg * f >= 2600) continue;
            const m = mono(await one(page, { eng: key, f, y, dur: 2.2, params: PR() }));
            fr.push([f, reg, +L.cents(L.combPitch(m, SR, f * reg, 1.2, 32768), f * reg).toFixed(1)]);
          }
          rep.floete.f0 = fr;
          const core = fr.filter((r) => r[0] >= 220 && r[0] <= 880 && r[1] <= 2), wr = fr.reduce((a, b) => (Math.abs(b[2]) > Math.abs(a[2]) ? b : a));
          okr(core.every((r) => Math.abs(r[2]) <= 10), 'f0 ≤ 10 ct in registers 1 and 2 at 220–880 Hz (SPEC): ' + core.map((r) => r[0] + '×' + r[1] + ' ' + r[2]).join(', '));
          okr(Math.abs(wr[2]) <= 10, `every register at 110–1320 Hz within 10 ct (worst ${wr[2]} ct at ${wr[0]} Hz × ${wr[1]}; ${fr.length} notes)`);
          // a held note blown over: y 0.4 → 0.85 jumps to the octave
          { const m = mono(await one(page, { eng: key, f: 220, y: 0.4, dur: 2.6, params: PR(), moves: [[1.0, 'setY', 0.85]] }));
            const a = gz(m, 1.8 * SR, 2.5 * SR, 440), b = gz(m, 1.8 * SR, 2.5 * SR, 220), c = L.cents(L.combPitch(m, SR, 440, 1.8, 16384), 440); rep.floete.overblow = [+(L.db(a) - L.db(b)).toFixed(1), +c.toFixed(1)];
            okr(L.db(a) - L.db(b) >= 20 && Math.abs(c) <= 10, `held y 0.4 → 0.85 overblows: the octave ${(L.db(a) - L.db(b)).toFixed(1)} dB over the fundamental, ${c.toFixed(1)} ct`); }
          // air: at y 0 only breath, the tone grows out of it
          { const lv = {}; for (const y of [0, 0.3]) for (const f of [110, 440]) { const m = mono(await one(page, { eng: key, f, y, dur: 1.2, params: PR() })); lv[f + '@' + y] = [L.db(L.rms(m, 0.7 * SR, 1.15 * SR)), L.db(L.rms(tone(m, f), 0.7 * SR, 1.15 * SR))]; }
            rep.floete.air = lv;
            for (const f of [110, 440]) { const d = lv[f + '@0'][0] - lv[f + '@0.3'][0], t = lv[f + '@0'][1] - lv[f + '@0.3'][1];
              okr(d >= -30 && d <= -8 && t <= -20, `air at y 0, ${f} Hz: ${d.toFixed(1)} dB vs y 0.3 (−30…−8), its tone ${t.toFixed(1)} dB (≤ −20)`); } }
          { const m = mono(await one(page, { eng: key, f: 440, y: 0.6, dur: 1.4, params: PR() })); const t = L.t90(m, SR, 0.05, L.rms(m, 0.9 * SR, 1.3 * SR)); rep.floete.t90 = Math.round(t * 1000); okr(t <= 0.1, `onset t90 at 440 Hz, y 0.6: ${Math.round(t * 1000)} ms (≤ 100)`); }
        } else {
          // the fire, the threshold, the song: the tone (a resonator at f) and the whole, per height
          const lv = {};
          for (const f of [110, 440]) for (const y of [0.1, 0.25, 0.5, 0.7]) { const m = mono(await one(page, { eng: key, f, y, dur: 3, params: PR() })); lv[f + '@' + y] = [L.db(L.rms(m, Math.round(1.8 * SR), Math.round(2.9 * SR))), L.db(gz(m, 1.8 * SR, 2.9 * SR, f))]; }   // (the tone: its line over 1.1 s – the fire's rumble lies in a resonator's band)
          rep.flamme.levels = lv;
          for (const f of [110, 440]) {
            okr(lv[f + '@0.5'][1] - lv[f + '@0.1'][1] >= 20, `threshold: the tone at ${f} Hz from y 0.1 to 0.5 ${lv[f + '@0.1'][1].toFixed(1)} → ${lv[f + '@0.5'][1].toFixed(1)} dB (≥ 20 dB)`);
            const d = lv[f + '@0.1'][0] - lv[f + '@0.7'][0]; okr(d >= -25 && d <= -8, `the fire under the threshold carries at ${f} Hz: y 0.1 ${d.toFixed(1)} dB vs the song at y 0.7 (−25…−8)`);
          }
          const fr = [];
          for (const f of [110, 220, 440, 880, 1320]) { const m = mono(await one(page, { eng: key, f, y: 0.6, dur: 3, params: PR() })); fr.push([f, +L.cents(peakHz(m, SR, f, 1.5, 65536), f).toFixed(1)]); }   // (the fundamental's line: the fire rings the tube's own modes)
          rep.flamme.f0 = fr;
          okr(fr.every((r) => Math.abs(r[1]) <= 5), 'f0 ≤ 5 ct at y 0.6 (the FLL; the fundamental\'s line): ' + fr.map((r) => r[0] + ' ' + r[1]).join(', '));
          // brighter with heat (King's law: the flow reverses, even harmonics grow)
          { const h = []; for (const y of [0.45, 0.85]) { const sp = L.spectrum(mono(await one(page, { eng: key, f: 220, y, dur: 2, params: PR({ 'hlm.luft': 0 }) })), SR, 1.2, 16384); h.push(L.harm(sp, 220, 2) - L.harm(sp, 220, 1)); }
            rep.flamme.h2 = h.map((v) => +v.toFixed(1)); okr(h[1] - h[0] >= 6, `brighter with heat: h2 − h1 at y 0.45 ${h[0].toFixed(1)} dB → y 0.85 ${h[1].toFixed(1)} dB (≥ +6)`); }
          // overblowing: from rest at the top and from a sounding fundamental (y 0.85 → 1), 110–880 Hz
          { const ob = [];
            for (const f of [110, 220, 440, 880]) for (const flip of [false, true]) {
              const m = mono(await one(page, { eng: key, f, y: flip ? 0.85 : 1, dur: 3, params: PR(), moves: flip ? [[1.2, 'setY', 1]] : [] }));
              ob.push([f, flip ? 'flip' : 'top', +(L.db(gz(m, 2.2 * SR, 2.9 * SR, 2 * f)) - L.db(gz(m, 2.2 * SR, 2.9 * SR, f))).toFixed(1)]);
            }
            rep.flamme.overblow = ob; okr(ob.every((o) => o[2] >= 10), 'overblows into the octave at the top (h2 − h1 ≥ 10 dB): ' + ob.map((o) => o[0] + '/' + o[1] + ' ' + o[2]).join(', ')); }
          // the surge at the threshold (wumm … wumm) and a steady song above it: the tone's 100-ms envelope, 3–6 s
          { const wb = []; for (const y of [0.33, 0.7]) { let r = 0; for (const f of [220, 440]) { const t = tone(mono(await one(page, { eng: key, f, y, dur: 6, params: PR() })), f); const e = L.env(t, SR, 0.1).slice(30, 59).map((v) => L.db(v)).sort((a, b) => a - b); r += (e[e.length - 2] - e[1]) / 2; } wb.push(+r.toFixed(1)); }
            rep.flamme.surge = wb; okr(wb[0] >= 6 && wb[1] <= 4, `surges at the threshold: tone envelope range at y 0.33 ${wb[0]} dB (≥ 6), at y 0.7 ${wb[1]} dB (≤ 4)`); }
          // cracks: sparse low, dense high (transients ≥ 12 dB over the 20-ms median)
          { const cr = []; for (const y of [0.1, 0.9]) { const m = mono(await one(page, { eng: key, f: 220, y, dur: 6, params: PR({ 'hlm.luft': 0.6 }) })), hp = new Float32Array(m.length);
              { const w = 2 * Math.PI * 5000 / SR, al = Math.sin(w) / 1.4, c = Math.cos(w), a0 = 1 + al, b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, v1 = 0, v2 = 0;   // (above 5 kHz, 4th order: the song's harmonics do not hide them)
                for (let i = 0; i < m.length; i++) { const u = b0 * m[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = m[i]; y2 = y1; y1 = u; const v = b0 * u + b1 * z1 + b0 * z2 - a1 * v1 - a2 * v2; z2 = z1; z1 = u; v2 = v1; v1 = v; hp[i] = v; } } const e = L.env(hp, SR, 0.002).slice(500); const med = e.slice().sort((a, b) => a - b)[e.length >> 1]; let n = 0, last = -99; for (let i = 0; i < e.length; i++) if (e[i] > 4 * med && i - last > 10) { n++; last = i; } cr.push(+(n / 5).toFixed(1)); }
            rep.flamme.cracks = cr; okr(cr[0] >= 0.5 && cr[1] > cr[0] * 2, `cracks per second: y 0.1 ${cr[0]}, y 0.9 ${cr[1]} (sparse low, denser with heat)`); }
          // let go: the tube rings out in its hiss within the release; nothing after
          { const m = mono(await one(page, { eng: key, f: 220, y: 0.6, dur: 3.5, params: PR(), rel: 1.2 })); const e = L.env(m, SR, 0.01); const held = L.rms(m, 0.9 * SR, 1.15 * SR); let t40 = Infinity; for (let i = 120; i < e.length; i++) if (e[i] < held * 0.01) { t40 = (i - 120) * 10; break; }
            rep.flamme.release40ms = t40; okr(t40 >= 100 && t40 <= 1500 && L.rms(m, 3.0 * SR, 3.5 * SR) < 1e-5, `let go: the tone dies within ${t40} ms to −40 dB (100–1500, a tail of hiss), silent after`); }
        }
        // Puls: inside the gate, then the voice ends
        { const held = L.rms(mono(await one(page, { eng: key, f: 440, y: 0.6, dur: 1.4, params: PR() })), 0.8 * SR, 1.3 * SR); const bl = [];
          for (const g of [0.06, 0.22]) { const d = 2.2, m = mono(await one(page, { eng: key, f: 440, y: 0.6, dur: d, params: PR(), burst: true, gate: g })); const e = L.env(m.subarray(0.05 * SR, (0.05 + g) * SR), SR, 0.02); bl.push([g, +(L.db(Math.max(...e)) - L.db(held)).toFixed(1), +L.db(L.rms(m, (d - 0.3) * SR, d * SR)).toFixed(1)]); }
          rep[rohr].burst = bl; okr(bl.every((b) => b[1] >= -20 && b[2] < -100), 'Puls: inside the gate ≥ −20 dB vs held, silent after: ' + bl.map((b) => b[0] * 1000 + ' ms ' + b[1] + '/' + b[2] + ' dB').join(', ')); }
        // cost (the whole pipe with its knobs at their defaults)
        { const { execFileSync } = require('child_process');
          const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, { ENGS: 'hlm1,hlm3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3', PARAMS: JSON.stringify({ 'hlm.rohr': rohr }) }), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
          const c1 = c.hlm1 * c.scale, c3 = c.hlm3 * c.scale; rep[rohr].cost = { L1: +c1.toFixed(3), L3: +c3.toFixed(3) };
          console.log(`INFO ${key} ${tag}: cost level 1 ${c1.toFixed(3)}, level 3 ${c3.toFixed(3)} Nebel units`);
          const tab = await page.evaluate((rohr) => { const M = window.__M, was = M.P['hlm.rohr']; M.P['hlm.rohr'] = rohr; const t = [M.VCOST1.hlm, M.VCOST3.hlm]; M.P['hlm.rohr'] = was; return t; }, rohr);   // (a voice is priced by its pipe)
          costRow(okr, '', tab, [c1, c3], { ENGS: 'hlm1,hlm3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3', PARAMS: JSON.stringify({ 'hlm.rohr': rohr }) }, (x) => [x.hlm1 * x.scale, x.hlm3 * x.scale]); }
      }
    }
    if (key === 'rnk') {
      const sh = [];
      for (const f of [500, 880, 1760]) { const x = await one(page, { eng: key, f, y: 0.5, dur: 1.5, params: DRY }); const n = Math.ceil(f / 400); sh.push([f, n, +L.subharm(L.spectrum(mono(x), SR, 0.4, 32768), f, n).toFixed(1)]); }
      rep.updateArtefacts = sh;
      ok(sh.every((s) => s[2] <= -40), 'no update sidebands > −40 dB (lines at (m + j/n)·f): ' + sh.map((s) => s[0] + ' Hz/n' + s[1] + ' ' + s[2] + ' dB').join(', '));
      { const x = await one(page, { eng: key, f: 220, y: 0.5, dur: 10.6, params: DRY }); const m = mono(x);
        const cs = [0.05, 0.5, 1, 2, 3].map((t) => L.centroid(m, SR, t, 4096)); const drift = Math.max(...cs.map((c) => Math.abs(c / cs[0] - 1)));
        const e = L.env(m, SR, 0.5); const first = Math.max(...e.slice(0, 2)), low = Math.min(...e.slice(0, 20));
        rep.held = { centroid: cs.map(Math.round), envDb: e.map((v) => +L.db(v).toFixed(1)), dc: +L.mean(m).toFixed(5) };
        ok(drift >= 0.15, `held: centroid drifts ${(drift * 100).toFixed(0)} % within 3 s (${cs.map(Math.round).join(' → ')} Hz)`);
        ok(L.db(low) - L.db(first) >= -30, `held: stays ≥ −30 dB for 10 s (lowest 0.5-s window ${(L.db(low) - L.db(first)).toFixed(1)} dB)`);
        ok(Math.abs(L.mean(m)) < 0.005, `DC ${L.mean(m).toFixed(5)} (< 0.005)`);
        L.wav(path.join(dir, 'held-10s.wav'), x.L, x.R, SR); rep.pngHeld = L.spectro(path.join(dir, 'held-10s.wav')); }
      { const c = []; for (const y of [0.2, 0.9]) { const x = await one(page, { eng: key, f: 220, y, dur: 0.6, params: DRY }); c.push(L.centroid(mono(x), SR, 0.06, 2048)); }
        rep.hammer = c.map(Math.round); ok(c[1] / c[0] - 1 >= 0.3, `hammer at y 0.2 vs 0.9: centroid ${Math.round(c[0])} → ${Math.round(c[1])} Hz (+${((c[1] / c[0] - 1) * 100).toFixed(0)} %, ≥ 30 %)`); }
      { const x = await one(page, { eng: key, f: 220, y: 0.5, dur: 2.5, params: DRY, moves: [[1.0, 'hammer', 1], [1.25, 'hammer', 1]] }); const m = mono(x);
        const a = L.rms(m, 0.8 * SR, 0.98 * SR), b = L.rms(m, 1.02 * SR, 1.2 * SR); rep.shake = +(L.db(b) - L.db(a)).toFixed(1);
        ok(b > a * 1.2, `Gestik shake = an extra hammer: +${(L.db(b) - L.db(a)).toFixed(1)} dB right after it`); }
    }
    if (key === 'hrz') {
      const BODIES = ['glas', 'schale', 'stab', 'zunge', 'teich'], R2 = { glas: 2.32, schale: 2.778, stab: 2.756, zunge: 6.27, teich: 6.27 };
      const P_ = (b, x) => Object.assign({}, DRY, { 'hrz.koerper': b }, x || {});
      const chan = (x, a, b) => 10 * Math.log10((Math.pow(L.rms(x.L, a * SR, b * SR), 2) + Math.pow(L.rms(x.R, a * SR, b * SR), 2)) / 2 + 1e-20);
      // every body: in tune at five pitches, swelling within 0.8 s (SPEC: p 0.45 → y 0.55)
      const pit = {}, sw = {};
      for (const b of BODIES) { pit[b] = []; sw[b] = [];
        for (const f of [110, 220, 440, 880, 1568]) { const m = mono(await one(page, { eng: key, f, y: 0.55, dur: 2.2, params: P_(b, { 'hrz.schwebung': 0 }) }));   // (tuning: without Schwebung's doublets, walk and water)
          pit[b].push(+L.cents(L.combPitch(m, SR, f, 1.2, 32768, 1), f).toFixed(1)); sw[b].push(Math.round(1000 * L.t90(m, SR, 0.05, L.rms(m, 1.4 * SR, 2.1 * SR)))); } }
      rep.bodies = { f0: pit, t90ms: sw };
      ok(BODIES.every((b) => pit[b].every((c) => Math.abs(c) <= 5)), 'every body in tune, Schwebung 0 (≤ 5 ct at 110–1568 Hz): ' + BODIES.map((b) => b + ' ' + pit[b].join('/')).join(', '));
      ok(BODIES.every((b) => sw[b].every((t) => t <= 800)), 'every body swells within 0.8 s (t90, ms): ' + BODIES.map((b) => b + ' ' + sw[b].join('/')).join(', '));
      // the fundamental wins the race: mode 2 ≥ 20 dB down at light and at strong pressure
      const race = {};
      for (const b of BODIES) { race[b] = []; for (const y of [0.1, 0.85]) { const sp = L.spectrum(mono(await one(page, { eng: key, f: 220, y, dur: 2, params: P_(b) })), SR, 1.2, 32768); race[b].push(+(L.harm(sp, 220 * R2[b], 1) - L.harm(sp, 220, 1)).toFixed(1)); } }
      rep.race = race;
      ok(BODIES.every((b) => race[b].every((d) => d <= -20)), 'mode 1 dominant (mode 2 vs mode 1 at y 0.1 / 0.85, dB): ' + BODIES.map((b) => b + ' ' + race[b].join('/')).join(', '));
      // Druck is heard: the friction's harmonics and noise grow with the height; low on the field still a tone
      const fp = {};
      for (const b of ['glas', 'stab', 'zunge']) { fp[b] = []; for (const y of [0, 0.2, 0.5, 0.8]) { const m = mono(await one(page, { eng: key, f: 220, y, dur: 2, params: P_(b) })); const sp = L.spectrum(m, SR, 1.2, 16384), h1 = L.harm(sp, 220, 1); fp[b].push({ y, lvl: +L.db(L.rms(m, 1.2 * SR, 1.9 * SR)).toFixed(1), h2: +(L.harm(sp, 220, 2) - h1).toFixed(1), h3: +(L.harm(sp, 220, 3) - h1).toFixed(1) }); } }
      rep.friction = fp;
      ok(Object.values(fp).every((r) => r[1].h2 < r[2].h2 && r[2].h2 < r[3].h2 && r[1].h3 < r[2].h3 && r[2].h3 < r[3].h3), 'h2 and h3 rise with the height (y 0.2/0.5/0.8): ' + Object.entries(fp).map(([b, r]) => b + ' h2 ' + r.slice(1).map((x) => x.h2).join('/') + ' h3 ' + r.slice(1).map((x) => x.h3).join('/')).join(', '));
      ok(Object.values(fp).every((r) => r[0].lvl - r[2].lvl >= -35), 'y 0 (flautando) audible: ' + Object.entries(fp).map(([b, r]) => b + ' ' + (r[0].lvl - r[2].lvl).toFixed(1) + ' dB vs y 0.5').join(', ') + ' (≥ −35)');
      // the ring after the bow lifts follows Dämpfung (the voice as the app plays it: its native release three times slower)
      const rg = {};
      for (const b of BODIES) for (const d of [0.6, 0.2]) {
        const map = await page.evaluate(([b, d]) => { const M = window.__M; const k = M.P['hrz.koerper']; M.P['hrz.koerper'] = b; const t = (0.4 + 6 * (1 - d) * (1 - d)) * { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 }[b]; M.P['hrz.koerper'] = k; return t; }, [b, d]);
        const dur = Math.min(14, 1.6 + 1.2 * map), m = mono(await one(page, { eng: key, f: 440, y: 0.55, dur, params: P_(b, { 'hrz.daempfung': d }), rel: 1.2 }));
        const e = L.env(m, SR, 0.02).map(L.db), a = Math.round(1.3 / 0.02); let t1 = null;
        for (let i = a; i < e.length; i++) if (e[i] < e[a] - 20) { t1 = (i - a) * 0.02; break; }
        rg[b + '@' + d] = [t1 == null ? null : +(3 * t1).toFixed(2), +map.toFixed(2)];
      }
      rep.ring = rg;
      ok(Object.values(rg).every(([t, m]) => t != null && Math.abs(t / m - 1) <= 0.3), 'ring after release within ±30 % of Dämpfung (T60 s measured/mapped): ' + Object.entries(rg).map(([k, v]) => k + ' ' + v.join('/')).join(', '));
      // level 3 as loud as level 1 for every body (per channel, as the panner passes them)
      const l13 = {};
      for (const b of BODIES) {   // (four notes each, 3 s: the contact's place against the doublets and the wah average out)
        let pa = 0, pc = 0;
        for (let i = 0; i < 4; i++) { const a = await one(page, { eng: key, f: 440, y: 0.5, dur: 4, params: P_(b) }), c = await one(page, { eng: key, f: 440, y: 0.5, dur: 4, params: P_(b), q: '3' }); pa += Math.pow(10, chan(a, 1, 3.9) / 10); pc += Math.pow(10, chan(c, 1, 3.9) / 10); }
        l13[b] = +(10 * Math.log10(pc / pa)).toFixed(1); }
      rep.l3vsl1 = l13;
      ok(Object.values(l13).every((d) => Math.abs(d) <= 1.5), 'level 3 within ±1.5 dB of level 1 per body: ' + JSON.stringify(l13));
      // Glas and Schale: the circling finger – a wah on one side (level 1), the sides in turn at level 3
      const wah = {};
      for (const b of ['glas', 'schale']) {
        const x1 = mono(await one(page, { eng: key, f: 440, y: 0.5, dur: 4, params: P_(b) })), e1 = L.env(x1, SR, 0.04).slice(30, 95).map(L.db);
        const x3 = await one(page, { eng: key, f: 440, y: 0.5, dur: 4, params: P_(b), q: '3' }), eL = L.env(x3.L, SR, 0.04).slice(30, 95), eR = L.env(x3.R, SR, 0.04).slice(30, 95);
        const mL = L.mean(eL), mR = L.mean(eR); let cl = 0, aa = 0, bb = 0; for (let i = 0; i < eL.length; i++) { cl += (eL[i] - mL) * (eR[i] - mR); aa += (eL[i] - mL) ** 2; bb += (eR[i] - mR) ** 2; }
        wah[b] = { depthL1: +(Math.max(...e1) - Math.min(...e1)).toFixed(1), corrLR: +(cl / Math.sqrt(aa * bb)).toFixed(2) };
      }
      rep.wah = wah;
      ok(Object.values(wah).every((w) => w.depthL1 >= 1.5 && w.depthL1 <= 9), 'the circling finger: wah depth on level 1 (dB): ' + JSON.stringify(wah) + ' (1.5–9)');
      ok(Object.values(wah).every((w) => w.corrLR < -0.2), 'level 3: the sides swell in turn (envelope correlation L/R < −0.2)');
      // Zunge: the bite (mode 2 in the first moment, not later) and the growl at the top (the bow arm at 25–45 Hz)
      { const m = mono(await one(page, { eng: key, f: 220, y: 0.5, dur: 1.5, params: P_('zunge') }));
        const s0 = L.spectrum(m, SR, 0.06, 2048), s1 = L.spectrum(m, SR, 1.1, 2048);
        const bite = [+(L.harm(s0, 220 * 6.27, 1) - L.harm(s0, 220, 1)).toFixed(1), +(L.harm(s1, 220 * 6.27, 1) - L.harm(s1, 220, 1)).toFixed(1)];
        const am = async (y) => { const x = mono(await one(page, { eng: key, f: 220, y, dur: 2.5, params: P_('zunge') })), e = L.env(x, SR, 0.002).slice(500, 1012); const mu = L.mean(e); const re = new Float64Array(512), im = new Float64Array(512); for (let i = 0; i < 512; i++) re[i] = (e[i] - mu) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / 511)); L.fft(re, im); let g = 0, lo = 0; for (let k = 1; k < 256; k++) { const hz = k * 500 / 512, p = re[k] * re[k] + im[k] * im[k]; if (hz >= 25 && hz <= 45) g += p; else if (hz >= 5 && hz < 20) lo += p; } return 10 * Math.log10(g / (mu * mu) + 1e-20); };
        const g5 = await am(0.5), g9 = await am(0.95);
        rep.zunge = { bite, growl: [+g5.toFixed(1), +g9.toFixed(1)] };
        ok(bite[0] >= -30 && bite[0] - bite[1] >= 10, `Zunge: the bite – mode 2 at the onset ${bite[0]} dB vs the fundamental (≥ −30), later ${bite[1]} dB (≥ 10 dB less)`);
        ok(g9 - g5 >= 10, `Zunge: the growl at the top – envelope modulation 25–45 Hz ${g5.toFixed(1)} → ${g9.toFixed(1)} dB (y 0.5 → 0.95, ≥ +10)`); }
      // Teich: the rod screams at the top; the water bends it while it sounds
      { const sp = L.spectrum(mono(await one(page, { eng: key, f: 220, y: 1, dur: 2, params: P_('teich') })), SR, 1.2, 32768); const sc = L.harm(sp, 220 * 6.27, 1) - L.harm(sp, 220, 1);
        const m = mono(await one(page, { eng: key, f: 220, y: 0.5, dur: 6, params: P_('teich') })); const pc = []; for (let t = 1; t < 5.6; t += 0.25) pc.push(L.cents(L.combPitch(m, SR, 220, t, 16384, 1), 220));
        const wob = Math.max(...pc) - Math.min(...pc);
        rep.teich = { scream: +sc.toFixed(1), waterCents: +wob.toFixed(1) };
        ok(sc >= 0, `Teich: at the top the rod screams on its second mode (${sc.toFixed(1)} dB vs the fundamental)`);
        ok(wob >= 3 && wob <= 40, `Teich: the water bends the sounding rod by ${wob.toFixed(1)} ct over 4.5 s (3–40)`); }
    }
    if (key === 'gsp') {
      // one render: notes [[t, degree, y, vel]], optional moves [[t, what]]; the field: major pentatonic on A 220
      // (degrees 0 220, 1 247, 2 277, 3 330, 4 370, 5 440 …)
      const G = async (dur, notes, params, moves) => pull(await page.evaluate(async ([dur, notes, params, moves]) => {
        const M = window.__M, ctx = await window.__ctx(dur, Object.assign({ 'v.eng': 'gsp', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 't.scale': 'dpent', 't.root': 9, 't.oct': 3 }, params));
        const q = (t) => Math.round(t * 375) / 375, used = new Set();
        const at = (t, fn) => { let k = q(t); while (used.has(k)) k += 1 / 375; used.add(k); ctx.suspend(k).then(() => { fn(); ctx.resume(); }); };
        const kick = (t) => { let k = q(t) + 1 / 375; while (used.has(k)) k += 1 / 375; used.add(k); ctx.suspend(k).then(() => ctx.resume()); };   // (offline, port messages arrive at the next suspend)
        for (const [t, d, y, vel] of notes) at(t, () => M.playNote('gsp', ctx.currentTime, M.N.notes[d].f, y, vel, {}));
        for (const [t, what, arg] of moves || []) { kick(t); at(t, () => { if (what === 'root') M.setParam('t.root', arg); else if (what === 'panic') M.panic(); else if (what === 'load') window.__load = M.voiceLoad(); }); }
        for (let t = 0.2; t < dur - 0.1; t += 0.25) { const k = q(t); if (!used.has(k)) { used.add(k); ctx.suspend(k).then(() => ctx.resume()); } }
        const b = await ctx.startRendering();
        return window.__ret(b);
      }, [dur, notes, params || {}, moves || []]));
      const gz = (x, a, b, fq) => { a = Math.round(a * SR); b = Math.round(b * SR); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return Math.hypot(re, im) / Math.max(1, b - a); };
      const lv = (x, a, b) => L.db(L.rms(x, Math.round(a * SR), Math.round(b * SR)));
      // the halo: a pluck on the root; the web's own share (with it − without it, by power) on the octave and on the
      // fifth's string (its 2nd partial: 3f) within 0.5 s, against the direct fundamental (SPEC ≥ −25 dB)
      { const w = mono(await G(2, [[0.1, 0, 0.6, 0.8]])), d = mono(await G(2, [[0.1, 0, 0.6, 0.8]], { 'xgsp.mute': true })), f = 220;
        const web = w.map((v, i) => v - d[i]);   // (the direct pluck is the same in both renders: the difference is the web alone)
        const share = (k) => L.db(gz(web, 0.15, 0.6, k * f)), f1 = L.db(gz(d, 0.15, 0.6, f));
        const h = { oct: share(2) - f1, fifth: share(3) - f1 }; rep.halo = { oct: +h.oct.toFixed(1), fifth: +h.fifth.toFixed(1) };
        ok(h.oct >= -25 && h.fifth >= -25, `halo: a pluck on the root – the web adds the octave ${h.oct.toFixed(1)} dB and the fifth's string (3f) ${h.fifth.toFixed(1)} dB rel. the direct fundamental within 0.5 s (≥ −25)`); }
      // Kopplung 1: no self-oscillation without input (dies away), the common mode rings ≤ 4 × Nachklang
      { const x = mono(await G(10, [[0.1, 0, 0.6, 0.9], [0.12, 2, 0.6, 0.9], [0.14, 3, 0.6, 0.9]], { 'gsp.kopplung': 1, 'gsp.halo': 0 }));
        const a = lv(x, 3, 3.5), b = lv(x, 5, 5.5), c = lv(x, 6.5, 7), t60 = 60 * 2 / Math.max(1e-3, a - b); rep.edge = [+a.toFixed(1), +b.toFixed(1), +c.toFixed(1), +t60.toFixed(2)];
        ok(c < b - 3, `Kopplung 1 without input: the web dies away – ${a.toFixed(1)} dB at 3 s, ${b.toFixed(1)} at 5 s, ${c.toFixed(1)} at 6.5 s`);
        ok(t60 <= 4 * 2, `Kopplung 1: the web's T60 3–5 s ${t60.toFixed(2)} s (≤ 4 × Nachklang 2 s)`); }
      // a scale change glides (90 ms) – no click: the crest over the change as without it (≤ +6 dB)
      { const notes = [[0.1, 0, 0.6, 0.8], [0.12, 3, 0.6, 0.8], [0.14, 5, 0.6, 0.8]], cr = (x) => { const a = Math.round(0.95 * SR), b = Math.round(1.4 * SR); let pk = 0; for (let i = a; i < b; i++) pk = Math.max(pk, Math.abs(x[i])); return L.db(pk) - L.db(L.rms(x, a, b)); };
        const c0 = cr(mono(await G(2, notes, { 'gsp.halo': 0 }))), c1 = cr(mono(await G(2, notes, { 'gsp.halo': 0 }, [[1.0, 'root', 11]])));
        rep.retune = [+c0.toFixed(1), +c1.toFixed(1)]; ok(c1 - c0 <= 6, `scale change under a ringing web: crest ${c1.toFixed(1)} dB vs ${c0.toFixed(1)} without (≤ +6)`); }
      // Stille (panic) clears within 100 ms; the budget counts the web while it rings; the mixer has its channel
      { const x = mono(await G(2, [[0.1, 0, 0.6, 0.9], [0.12, 3, 0.6, 0.9]], { 'gsp.halo': 0, 'gsp.kopplung': 1 }, [[0.6, 'load'], [1.0, 'panic']])); const l = lv(x, 1.1, 1.3), load = await page.evaluate(() => window.__load);
        const st = await page.evaluate(() => ({ strip: !!window.__M.MIX.s.gsp, k: window.__M.MIX.list.map((s) => s.k).join(' '), cost: window.__M.GSP_COST, vc: window.__M.VCOST1.gsp }));
        rep.clear = [+l.toFixed(1), load, st];
        ok(l < -80, `Stille clears the web: ${l.toFixed(1)} dB 0.1–0.3 s after`);
        ok(load >= 2 * st.vc + st.cost[0] - 1e-6 && st.strip, `the budget counts the web while it rings (load ${load} with two voices), the mixer has its channel (${st.k})`); }
      // the web on its own: its cost with a steady input (cost.js 'web', 24 webs against 24 Nebel voices – one web alone
      // carries the module's fixed share ×24), against its budget entry
      { const { execFileSync } = require('child_process');
        const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, { ENGS: 'web1,web3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3', NW: '24' }), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
        const w1 = c.web1 * c.scale, w3 = c.web3 * c.scale; rep.webCost = [+w1.toFixed(3), +w3.toFixed(3)];
        console.log(`INFO gsp: the web costs ${w1.toFixed(3)} (8 strings) / ${w3.toFixed(3)} (12) Nebel units`);
        const tab = await page.evaluate(() => window.__M.GSP_COST);
        costRow(ok, 'the web (GSP_COST): ', tab, [w1, w3], { ENGS: 'web1,web3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3', NW: '24' }, (x) => [x.web1 * x.scale, x.web3 * x.scale]); }
    }
    if (key === 'mdr') {
      // SPEC §3.10's rows and the check's fixes (biologist-mdr): the swell, the upper modes eaten, the crackle (events,
      // tuned), the end within 1.3 × Nachklang, a fast lane's voices, the swell under the strike, level 3 = level 1 per
      // channel at any pan, Höhe as the moisture, the three bodies
      const T0 = 19 / 375, RAT = { glocke: [1, 1.794, 2.52, 2.991, 3.786, 4.5, 5.4, 6.8], holz: [1, 2.572, 4.644, 6.984, 9.723, 12, 14.5, 17], knochen: [1, 2.756, 5.404, 8.933, 12.9, 17.6, 22.5, 28] };
      // one hit through the app, Math.random seeded (the voice's seeds: two renders with the same seed differ only in what is changed)
      const mh = async (o) => pull(await page.evaluate(async (o) => {
        const M = window.__M, ctx = await window.__ctx(o.dur || 3.5, Object.assign({ 'v.eng': 'mdr', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'mov.vib': 0, 'mov.drift': 0, 'mov.pan': 0 }, o.params || {}), o.q || '1');
        let x = o.seed || 777; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
        ctx.suspend(19 / 375).then(() => { window.__lastV = M.playNote('mdr', ctx.currentTime, o.f || 220, o.y != null ? o.y : 0.7, o.vel != null ? o.vel : 0.8, { pan: o.pan || 0, gate: o.gate }); ctx.resume(); });
        return window.__ret(await ctx.startRendering());
      }, o));
      // a spectral line's level (dB) at t s after the hit (Hann, N points, centred)
      const line = (x, f, t, N = 4096) => { const a = Math.floor((T0 + t) * SR - N / 2); let re = 0, im = 0; for (let i = 0; i < N; i++) { const s = (x[a + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)), w = 2 * Math.PI * f * (a + i) / SR; re += s * Math.cos(w); im -= s * Math.sin(w); } return 10 * Math.log10((re * re + im * im) / (N * N / 16) + 1e-30); };
      const swellOf = (m, f) => { const s0 = line(m, f, 0.1); let mx = -999, at = 0; for (let t = 1.0; t <= 1.8001; t += 0.05) { const v = line(m, f, t); if (v > mx) { mx = v; at = t; } } return [+(mx - s0).toFixed(1), +at.toFixed(2)]; };
      // the swell (y 0.7, vel 0.8): ≥ +6 dB from 0.1 s to its top in 1.0–1.8 s – every body, three pitches, level 3
      const sw = {};
      for (const [b, f, q] of [['glocke', 220, '1'], ['glocke', 110, '1'], ['glocke', 440, '1'], ['holz', 220, '1'], ['knochen', 220, '1'], ['glocke', 220, '3']]) sw[b + '@' + f + (q === '3' ? '/L3' : '')] = swellOf(mono(await mh({ f, q, params: { 'mdr.koerper': b } })), f);
      rep.swell = sw;
      ok(Object.values(sw).every((s) => s[0] >= 6), 'mdrSwell: the fundamental swells ≥ +6 dB between 0.1 s and 1.0–1.8 s (y 0.7, vel 0.8; dB/at s): ' + JSON.stringify(sw));
      // the upper modes are eaten: k ≥ 5 down ≥ 20 dB by 1.5 s (vs. the strike, 40 ms after it)
      { const m = mono(await mh({ f: 220 })), fa = [4, 5, 6, 7].map((k) => +(line(m, 220 * RAT.glocke[k], 1.5, 2048) - line(m, 220 * RAT.glocke[k], 0.04, 2048)).toFixed(1));
        rep.fall = fa; ok(fa.every((d) => d <= -20), `mdrFall: modes 5–8 at 1.5 s vs the strike ${fa.join(' / ')} dB (≤ −20 each)`); }
      // the crackle alone: the same hit (same seeds) with Knistern 0.4 minus with 0 – transients per second in 0.3–1.5 s,
      // the share of its energy within ±5 % of the modes
      const crk = async (o) => { const a = mono(await mh(o)), b = mono(await mh(Object.assign({}, o, { params: Object.assign({}, o.params || {}, { 'mdr.knistern': 0 }) })));
        const c = new Float32Array(a.length); for (let i = 0; i < c.length; i++) c[i] = a[i] - b[i]; return { a, c }; };
      const evs = (x, t0, t1) => {   // 1-ms RMS envelope; a peak ≥ 6 dB over the last 10 ms' minimum, ≥ −35 dB re the loudest, 4 ms apart
        const w = Math.round(0.001 * SR), e = []; for (let i = Math.floor((T0 + t0) * SR); i + w <= (T0 + t1) * SR; i += w) e.push(L.rms(x, i, i + w));
        const mx = Math.max(...e); let n = 0, last = -99;
        for (let i = 10; i < e.length - 1; i++) { if (!(e[i] >= e[i - 1] && e[i] > e[i + 1])) continue; const mn = Math.min(...e.slice(i - 10, i)); if (e[i] > 2 * mn && e[i] > mx * 0.0178 && i - last >= 4) { n++; last = i; } }
        return n / (t1 - t0);
      };
      const conc = (x, f, rr, t0, t1) => { let inn = 0, tot = 0; for (let t = T0 + t0; t + 8192 / SR <= T0 + t1; t += 4096 / SR) { const sp = L.spectrum(x, SR, t, 8192); for (let k = Math.round(30 / sp.hz); k < sp.p.length; k++) { const hz = k * sp.hz; tot += sp.p[k]; if (rr.some((r) => Math.abs(hz / (f * r) - 1) <= 0.05)) inn += sp.p[k]; } } return inn / tot; };
      const lv = (x, t0, t1) => L.db(L.rms(x, Math.floor((T0 + t0) * SR), Math.floor((T0 + t1) * SR)));
      const cr = {};
      for (const [b, f] of [['glocke', 220], ['glocke', 440], ['holz', 220], ['knochen', 220]]) { const { a, c } = await crk({ f, params: { 'mdr.koerper': b } }); cr[b + '@' + f] = { evPerS: +evs(c, 0.3, 1.5).toFixed(1), conc: +conc(c, f, RAT[b], 0.3, 1.5).toFixed(2), dB: +(lv(c, 0.3, 1.5) - lv(a, 0.3, 1.5)).toFixed(1) }; if (b === 'glocke' && f === 220) { L.wav(path.join(dir, 'crackle-only.wav'), c, c, SR); rep.pngCrackle = L.spectro(path.join(dir, 'crackle-only.wav')); } }
      rep.crackle = cr;
      ok(Object.values(cr).every((c) => c.evPerS >= 10), 'mdrCrackle: ≥ 10 transient events/s in 0.3–1.5 s at Knistern 0.4: ' + Object.entries(cr).map(([k, c]) => k + ' ' + c.evPerS).join(', '));
      ok(Object.values(cr).every((c) => c.conc >= 0.6), 'mdrCrackle: tuned – its energy within ±5 % of the modes (share ≥ 0.6; ten periods of tick hold 80 % in theory): ' + Object.entries(cr).map(([k, c]) => k + ' ' + c.conc).join(', '));
      { const k1 = await crk({ params: { 'mdr.knistern': 1 } }); const d1 = lv(k1.c, 0.3, 1.5) - lv(k1.a, 0.3, 1.5); rep.crackleK1 = +d1.toFixed(1);
        ok(d1 > cr['glocke@220'].dB + 1.5, `Knistern 1 crackles more than 0.4: ${d1.toFixed(1)} vs ${cr['glocke@220'].dB} dB re the voice (0.3–1.5 s)`); }
      // Höhe = the moisture: dry nearly an ordinary bell (little swell, little crackle), wet faster and stronger
      const wet = {};
      for (const y of [0, 0.5, 1]) { const { a, c } = await crk({ y }); wet[y] = { swell: swellOf(a, 220)[0], crk: +(lv(c, 0.3, 1.5) - lv(a, 0.3, 1.5)).toFixed(1), fall5: +(line(a, 220 * 3.786, 1.5, 2048) - line(a, 220 * 3.786, 0.04, 2048)).toFixed(1) }; }
      rep.wet = wet;
      ok(wet[0].swell < wet[0.5].swell && wet[0].crk < wet[0.5].crk - 6 && wet[0.5].crk < wet[1].crk && wet[0].fall5 > wet[0.5].fall5 && wet[0.5].fall5 > wet[1].fall5, 'mdrWet: Höhe is the moisture – swell, crackle and the eating of mode 5 grow from dry to wet: ' + JSON.stringify(wet));
      ok(wet[0].swell <= wet[0.5].swell - 3 && wet[0].crk <= -25, `mdrWet: dry (y 0) nearly an ordinary bell – swell ${wet[0].swell} dB (≥ 3 dB under the wet ${wet[0.5].swell}: the hum emerges as the partials fade), crackle ${wet[0].crk} dB re the voice (≤ −25)`);
      // the end: ≤ 1.3 × Nachklang (loudest: vel 1, y 1, Schwellen 1), silent after, the voice freed – also in a lane step
      const ends = {};
      for (const [nk, gate] of [[1, 0], [5, 0], [12, 0], [5, 0.11]]) {
        const life = nk * (gate ? Math.max(0.25, Math.min(1, gate)) : 1), x = mono(await mh({ dur: 1.3 * life + 0.6, vel: 1, y: 1, gate: gate || undefined, params: { 'mdr.nachklang': nk, 'mdr.schwellen': 1, 'mdr.schlaegel': 1 } }));
        const fin = await page.evaluate(async () => { const v = window.__lastV; await new Promise((r) => setTimeout(r, Math.max(0, (v.endAt - v.t0) * 1000) + 400)); return { alive: v.alive, life: +(v.endAt - v.t0).toFixed(2) }; });
        ends[nk + (gate ? '/gate ' + gate : '')] = [fin.life, +(1.3 * life).toFixed(2), +L.db(L.rms(x, Math.floor((T0 + fin.life + 0.05) * SR), x.length)).toFixed(0), fin.alive];
      }
      rep.ends = ends;
      ok(Object.values(ends).every(([l, mx, db, al]) => l <= mx && db < -100 && !al), 'mdrEnd: the voice ends within 1.3 × Nachklang ({done} at −60 dB; life/limit s, after, alive): ' + JSON.stringify(ends));
      // a fast lane: 8 hits/s, gate 0.11 s – at most 10 voices sounding
      { const r = await page.evaluate(async () => {
          const M = window.__M, ctx = await window.__ctx(4.5, { 'v.eng': 'mdr', 'rev.mix': 0, 'dly.mix': 0 });
          let maxV = 0;
          for (let j = 0; j < 30; j++) ctx.suspend(Math.round((0.1 + j / 8) * 375) / 375).then(() => { M.hit('mdr', ctx.currentTime, M.noteAt((j * 0.37) % 1).f, 0.6, 0.7, { gate: 0.11 }); let n = 0; for (const v of M.A.voices) if (v.alive && ctx.currentTime < v.endAt) n++; maxV = Math.max(maxV, n); ctx.resume(); });
          const b = await ctx.startRendering(); return { maxV, st: window.__stats(b, 0.2) };
        });
        rep.laneVoices = r; ok(r.maxV <= 10 && r.st.nan === 0, `mdrLane: 8 hits/s with gate 0.11 s – at most ${r.maxV} voices sounding (≤ 10)`); }
      // the swell stays under the strike: the loudest swell's peak ≤ the strike's + 3 dB
      { const x = await mh({ vel: 1, y: 1, params: { 'mdr.schwellen': 1, 'mdr.schlaegel': 1 } }), m = mono(x); let p0 = 0, p1 = 0;
        for (let i = 0; i < m.length; i++) { const t = i / SR - T0, a = Math.max(Math.abs(x.L[i]), Math.abs(x.R[i])); if (t >= 0 && t < 0.1) p0 = Math.max(p0, a); else if (t >= 0.5 && t < 3) p1 = Math.max(p1, a); }
        rep.swellPeak = [+L.db(p0).toFixed(1), +L.db(p1).toFixed(1)]; ok(L.db(p1) <= L.db(p0) + 3, `the swell's peak ${L.db(p1).toFixed(1)} dBFS ≤ the strike's ${L.db(p0).toFixed(1)} + 3 dB (vel 1, y 1, Schwellen 1)`);
        rep.dcOne = +L.mean(m).toFixed(5); ok(Math.abs(rep.dcOne) < 0.005, `DC of a loud hit ${rep.dcOne} (< 0.005)`); }
      // level 3 as loud as level 1, per channel, at pan 0 and ±0.4, four seeds and two pitches each – the strike and the
      // swell/hum on their own (lesson 3: two coherent sides sum louder off centre)
      { const pw = (x, ch, a, b) => { const s = ch ? x.R : x.L; let e = 0; for (let i = Math.floor((T0 + a) * SR); i < (T0 + b) * SR; i++) e += s[i] * s[i]; return e; };
        const res = {};
        for (const pan of [0, -0.4, 0.4]) { const acc = { s1: [0, 0], s3: [0, 0], h1: [0, 0], h3: [0, 0] };
          for (const seed of [11, 22, 33, 44]) for (const f of [220, 440]) for (const q of ['1', '3']) { const x = await mh({ f, pan, seed, q, dur: 3.2 }); for (const ch of [0, 1]) { acc['s' + q][ch] += pw(x, ch, 0, 0.3); acc['h' + q][ch] += pw(x, ch, 0.5, 3); } }
          // (both channels' power summed: off centre a stereo voice's sides pass the panner by another law than a mono
          // voice's (L·cos 0.2π vs cos 0.35π at +0.4: +2 dB on the near side by itself) – what must hold is the sum, which
          // two coherent sides would push up; per channel as information)
          const db2 = (a, b) => +(10 * Math.log10(a / b)).toFixed(2);
          res[pan] = { strike: db2(acc.s3[0] + acc.s3[1], acc.s1[0] + acc.s1[1]), hum: db2(acc.h3[0] + acc.h3[1], acc.h1[0] + acc.h1[1]), perChannel: { strike: [0, 1].map((ch) => db2(acc.s3[ch], acc.s1[ch])), hum: [0, 1].map((ch) => db2(acc.h3[ch], acc.h1[ch])) } }; }
        rep.l3 = res;
        ok(Object.values(res).every((r) => Math.abs(r.strike) <= 1.5 && Math.abs(r.hum) <= 1.5), 'mdrL3: level 3 within ±1.5 dB of level 1 (both channels through the voice\'s panner, 4 seeds × 2 pitches) at pan 0/−0.4/+0.4, strike and hum: ' + Object.entries(res).map(([p, r]) => p + ' ' + r.strike + '/' + r.hum).join(', '));
        console.log('INFO mdr: level 3 − level 1 per channel (L, R) by pan: ' + JSON.stringify(Object.fromEntries(Object.entries(res).map(([p, r]) => [p, r.perChannel])))); }
      // the Sporenregen and the Rassel take it
      { const r = await page.evaluate(() => ({ rg: window.__M.RG_S.some((x) => x[0] === 'mdr') })); ok(r.rg, 'Sporenregen strikes it (RG_S derived: struck, regen ≠ 0)'); }
      // demo: the three bodies, dry → wet, at level 3 with the default effects
      { const x = pull(await page.evaluate(async () => { const M = window.__M, ctx = await window.__ctx(16, { 'v.eng': 'mdr' }, '3');
          [['glocke', 196, 0.2], ['glocke', 196, 0.8], ['holz', 147, 0.7], ['knochen', 262, 0.7]].forEach(([b, f, y], i) => ctx.suspend(Math.round((0.1 + 3.7 * i) * 375) / 375).then(() => { M.P['mdr.koerper'] = b; M.playNote('mdr', ctx.currentTime, f, y, 0.8, {}); ctx.resume(); }));
          return window.__ret(await ctx.startRendering()); }));
        L.wav(path.join(dir, 'bodies-L3.wav'), x.L, x.R, SR); rep.pngBodies = L.spectro(path.join(dir, 'bodies-L3.wav')); }
    }
    if (key === 'boe') {
      const P_ = (x) => Object.assign({}, DRY, x || {});
      const yOf = (ratio, wind = 0.4) => (ratio - 0.7) / 7 / (0.5 + wind);   // the height whose shedding sits at `ratio` harmonics (no walk, no gust)
      const band = (m, f, k, t, N = 2048) => { const sp = L.spectrum(m, SR, t, N); let e = 0; for (let i = Math.round((k - 0.25) * f / sp.hz); i <= Math.round((k + 0.25) * f / sp.hz); i++) e += sp.p[i]; return 10 * Math.log10(e + 1e-30); };
      const rise = (m, f, k, t0, win, tb = t0) => { const b = [], a = []; for (let t = tb - 0.15; t + 2048 / SR <= tb; t += 0.01) b.push(Math.pow(10, band(m, f, k, t) / 10)); for (let t = t0; t + 2048 / SR <= t0 + win; t += 0.01) a.push(band(m, f, k, t)); return Math.max(...a) - 10 * Math.log10(b.reduce((x, y) => x + y, 0) / b.length); };
      // boeCapture (SPEC): the wind moved from string k−1 to 0.3 harmonics past string k (Böen 0, Rauschen 0: the strings
      // alone) – when the shedding crosses k·f (Höhe follows in 40 ms: 59 ms after the move) string k catches and its
      // energy rises ≥ 10 dB within 150 ms (stepping only onto k·f the hysteresis of the strings above 4 – 1.6 bands =
      // 0.94 harmonics at string 5 – may hold the old string: that is the hysteresis, not a missed capture)
      const cp = {};
      for (const k of [2, 3, 4, 5, 6]) { const m = mono(await one(page, { eng: key, f: 220, y: yOf(k - 1), vel: 0.05, dur: 2.2, params: P_({ 'boe.boeen': 0, 'boe.rauschen': 0 }), moves: [[1.5, 'setY', yOf(k + 0.3)]] })); cp[k] = +rise(m, 220, k, 1.5 + 0.04 * Math.log(1.3 / 0.3), 0.15, 1.5).toFixed(1); }
      rep.capture = cp;
      ok(Object.values(cp).every((d) => d >= 10), 'boeCapture: the wind moves onto string k – its energy rises within 150 ms (dB, k 2–6): ' + JSON.stringify(cp) + ' (≥ 10)');
      // the finger drives the capture on a sounding voice, default knobs (wind band, walk, gusts): string 2 → 6
      { const m = mono(await one(page, { eng: key, f: 220, y: yOf(2), dur: 2.4, params: DRY, rseed: 4242, moves: [[1.5, 'setY', yOf(6)]] })); rep.setY = +rise(m, 220, 6, 1.5, 0.3).toFixed(1);
        ok(rep.setY >= 10, `Höhe drives the capture on a held voice (default knobs): string 2 → 6, string 6 rises ${rep.setY} dB within 0.3 s (≥ 10)`); }
      // boeFloor (SPEC): between strings 1 and 2 (Böen 0, Nachklang 0.5: what the touch caught has rung out) the strings'
      // excitation drops ≥ 15 dB, the output stays ≥ −45 dB under the caught string's peak – the fundamental's floor
      { const P0 = P_({ 'boe.boeen': 0, 'boe.nachklang': 0.5 }), S0 = Object.assign({}, P0, { 'boe.rauschen': 0 });
        const c = mono(await one(page, { eng: key, f: 220, y: yOf(2), vel: 0.05, dur: 4, params: S0 })), d = mono(await one(page, { eng: key, f: 220, y: yOf(1.45), vel: 0.05, dur: 4, params: S0 })), dw = mono(await one(page, { eng: key, f: 220, y: yOf(1.45), vel: 0.05, dur: 4, params: P0 }));
        const pk = L.peak(c.subarray(2 * SR)), drop = L.db(L.rms(d, 2.5 * SR, 4 * SR)) - L.db(L.rms(c, 2.5 * SR, 4 * SR)), fl = L.db(L.rms(d, 2.5 * SR, 4 * SR)) - L.db(pk), flw = L.db(L.rms(dw, 2.5 * SR, 4 * SR)) - L.db(pk);
        const k1 = band(d, 220, 1, 3, 16384) - Math.max(...[2, 3, 4].map((k) => band(d, 220, k, 3, 16384)));
        rep.floor = { drop: +drop.toFixed(1), strings: +fl.toFixed(1), withWind: +flw.toFixed(1), fundamentalOverOthers: +k1.toFixed(1) };
        ok(drop <= -15 && fl >= -45 && k1 >= 6, `boeFloor: between strings 1 and 2 the strings drop ${drop.toFixed(1)} dB (≤ −15) and stay at ${fl.toFixed(1)} dB under the caught peak (≥ −45; with the wind ${flw.toFixed(1)}), carried by the fundamental (${k1.toFixed(1)} dB over strings 2–4)`); }
      // one string at a time (check): its neighbours ≥ 17 dB under it (their excitation is −20 dB; noise-driven bands wander ±3 dB)
      { const m = mono(await one(page, { eng: key, f: 220, y: yOf(4), vel: 0.05, dur: 4.5, params: P_({ 'boe.boeen': 0, 'boe.rauschen': 0, 'boe.nachklang': 0.5 }) }));
        const lv = (k) => { let s = 0, n = 0; for (let t = 2; t < 4.1; t += 0.1) { s += Math.pow(10, band(m, 220, k, t, 8192) / 10); n++; } return 10 * Math.log10(s / n); };
        const l4 = lv(4), nb = [+(lv(3) - l4).toFixed(1), +(lv(5) - l4).toFixed(1)]; rep.leak = nb;
        ok(nb.every((d) => d <= -17), `one string at a time: string 4 caught, its neighbours 3 and 5 at ${nb.join(' / ')} dB (≤ −17)`); }
      // boeLevel (SPEC): the level across the field within ±4 dB – held 5 s at each string's centre (default knobs,
      // 220/440 Hz, two seeds each); the dead zones between them for information
      { const lv = {}, dz = {};
        const meas = async (y) => { let s = 0, n = 0; for (const f of [220, 440]) for (const rs of [101, 202]) { const m = mono(await one(page, { eng: key, f, y, dur: 5, params: DRY, rseed: rs + Math.round(y * 1000) })); s += Math.pow(L.rms(m, 1 * SR, 5 * SR), 2); n++; } return 10 * Math.log10(s / n); };
        for (const k of [1, 2, 3, 4, 5, 6, 7]) lv[k] = await meas(yOf(k));
        for (const r of [1.45, 2.45]) dz[r] = await meas(yOf(r));
        const vals = Object.values(lv), mid = (Math.max(...vals) + Math.min(...vals)) / 2;
        rep.levelY = { strings: Object.fromEntries(Object.entries(lv).map(([k, v]) => [k, +(v - mid).toFixed(1)])), deadZones: Object.fromEntries(Object.entries(dz).map(([k, v]) => [k, +(v - mid).toFixed(1)])) };
        ok(Math.max(...vals) - Math.min(...vals) <= 8, 'boeLevel: level across the field within ±4 dB (held at the strings 1–7, dB around the middle): ' + JSON.stringify(rep.levelY.strings) + '; between strings 1|2 and 2|3: ' + JSON.stringify(rep.levelY.deadZones)); }
      // Nachklang is a timbre, not a volume (check): a held note at Nachklang 1 vs 6 within ±3 dB
      { const lv = []; for (const nk of [1, 6]) { let s = 0; for (const rs of [11, 22, 33]) { const m = mono(await one(page, { eng: key, f: 330, y: 0.45, dur: 5, params: P_({ 'boe.nachklang': nk }), rseed: rs })); s += Math.pow(L.rms(m, 1 * SR, 5 * SR), 2); } lv.push(10 * Math.log10(s / 3)); }
        rep.nachklangLevel = +(lv[1] - lv[0]).toFixed(1); ok(Math.abs(lv[1] - lv[0]) <= 3, `Nachklang 6 vs 1: held level ${rep.nachklangLevel} dB (±3: the excitation is normalised to the ring)`); }
      // level 3 vs level 1 per channel (the panner folds a stereo voice's sides off centre): the same seeds, short (0.45 s)
      // and held notes, pan 0 / ±0.4, six notes each; and the sides decorrelated
      { const chan = (x) => { let s = 0; for (let i = 0.1 * SR; i < x.L.length; i++) s += x.L[i] * x.L[i] + x.R[i] * x.R[i]; return s; }, l13 = {};
        for (const [nm, dur, rel] of [['short', 2.5, 0.45], ['held', 4, null]]) for (const pan of [0, 0.4, -0.4]) { let a = 0, c = 0; for (let i = 0; i < 6; i++) { const o = { eng: key, f: [147, 196, 262, 330, 440, 587][i], y: 0.15 + 0.13 * i, dur, params: DRY, rel, pan, rseed: 900 + i }; a += chan(await one(page, o)); c += chan(await one(page, Object.assign({}, o, { q: '3' }))); } l13[nm + '@' + pan] = +(10 * Math.log10(c / a)).toFixed(2); }
        rep.l3vsl1 = l13;
        ok(Object.values(l13).every((d) => Math.abs(d) <= 1.5), 'level 3 within ±1.5 dB of level 1 per channel (same seeds): ' + JSON.stringify(l13));
        const x = await one(page, { eng: key, f: 220, y: 0.45, dur: 4, params: DRY, q: '3' }); let ab = 0, aa = 0, bb = 0; for (let i = 0.5 * SR; i < 4 * SR; i++) { ab += x.L[i] * x.R[i]; aa += x.L[i] ** 2; bb += x.R[i] ** 2; }
        rep.l3corr = +(ab / Math.sqrt(aa * bb)).toFixed(2); ok(Math.abs(rep.l3corr) < 0.3, `level 3: the sides decorrelated (L/R correlation ${rep.l3corr}, |·| < 0.3)`); }
      // dice: no silent corner – y 0 (the wind under the fundamental) audible against y 0.5
      { const a = mono(await one(page, { eng: key, f: 220, y: 0, dur: 2, params: DRY })), b = mono(await one(page, { eng: key, f: 220, y: 0.5, dur: 2, params: DRY }));
        rep.y0 = +(L.db(L.rms(a, 0.5 * SR, 2 * SR)) - L.db(L.rms(b, 0.5 * SR, 2 * SR))).toFixed(1); ok(rep.y0 >= -35, `y 0 audible: ${rep.y0} dB vs y 0.5 (≥ −35)`); }
      // demos: a sweep up through the strings and a rest (the chord of memory), and 24 s held at default (walk, gusts)
      { const moves = []; for (let i = 0; i <= 30; i++) moves.push([0.5 + i * 0.2, 'setY', 0.05 + 0.8 * i / 30]); moves.push([7, 'setY', 0.3]);
        const x = await one(page, { eng: key, f: 147, y: 0.05, dur: 16, params: Object.assign({}, DRY, { 'rev.mix': 0.3 }), moves, rel: 12, q: '3' });
        L.wav(path.join(dir, 'ghost-chord.wav'), x.L, x.R, SR); rep.pngGhost = L.spectro(path.join(dir, 'ghost-chord.wav'));
        const h = await one(page, { eng: key, f: 196, y: 0.45, dur: 24, params: Object.assign({}, DRY, { 'rev.mix': 0.3 }), rel: 20, q: '3' });
        L.wav(path.join(dir, 'held-24s.wav'), h.L, h.R, SR); rep.pngHeld = L.spectro(path.join(dir, 'held-24s.wav')); }
    }
    if (key === 'amo') {
      const P_ = (x) => Object.assign({}, DRY, x || {});
      // the waveform's change from one period to the next (rms, relative; T in whole samples) and its largest local step
      const perFlux = (m, T, t0, t1) => { const out = [], pk = []; for (let s = Math.round(t0 * SR); s + 2 * T < t1 * SR; s += T) { let dd = 0, ee = 0, mx = 0; for (let i = 0; i < T; i++) { const q = m[s + i + T] - m[s + i]; dd += q * q; ee += m[s + i] * m[s + i]; mx = Math.max(mx, Math.abs(q)); } out.push(Math.sqrt(dd / ee)); pk.push(mx / Math.sqrt(ee / T)); } return { flux: L.mean(out), pk, all: out }; };
      // distance of one period from a reference period (relative rms)
      const dist = (m, T, ref, t) => { const a = Math.round(t * SR), r = Math.round(ref * SR); let dd = 0, ee = 0; for (let i = 0; i < T; i++) { const q = m[a + i] - m[r + i]; dd += q * q; ee += m[r + i] * m[r + i]; } return Math.sqrt(dd / ee); };
      // amoLock: the period holds (Gendy3) – the autocorrelation's peak near the period over 3.5 s (a short window's
      // harmonic estimate scatters with the harmonics' wander, the fundamental's phase too at y 0.8 low down: ±5 ct with
      // no drift; see lock-amo.js)
      const { lockAC } = require('./lock-amo'), lockC = lockAC;
      const lk = [];
      for (const f of [50, 82.4, 110, 220, 330, 440, 500]) for (const y of [0.2, 0.5, 0.8]) lk.push([f, y, +lockC(mono(await one(page, { eng: key, f, y, dur: 4.2, params: P_({ 'amo.zeit': 0 }) })), f, 0.5, 4.1).toFixed(2)]);
      rep.lock = lk;
      const lw = lk.reduce((a, b) => (Math.abs(b[2]) > Math.abs(a[2]) ? b : a));
      ok(Math.abs(lw[2]) <= 3, `amoLock: the pitch holds at Zeit 0, 50–500 Hz, y 0.2/0.5/0.8 (the autocorrelation's peak over 3.5 s): worst ${lw[2]} ct at ${lw[0]} Hz, y ${lw[1]} (≤ 3)`);
      { const zl = []; for (const f of [55, 110, 220]) zl.push(+lockC(mono(await one(page, { eng: key, f, y: 0.6, dur: 4.2, params: P_() })), f, 0.5, 4.1).toFixed(2));
        rep.lockZeit = zl; ok(zl.every((c) => Math.abs(c) <= 3), `amoLock: with Zeit's wandering durations (0.15, y 0.6) the period still holds: ${zl.join(' / ')} ct at 55/110/220 Hz`); }
      // amoSteady: the level over 2 s at y 0.3 (per-period normalisation)
      { const st = []; for (const f of [55, 110, 220]) { const e = L.env(mono(await one(page, { eng: key, f, y: 0.3, dur: 2.6, params: P_() })), SR, 0.1).slice(4, 24).map(L.db); const mu = L.db(Math.sqrt(L.mean(e.map((d) => Math.pow(10, d / 10))))); st.push([f, +(Math.max(...e) - mu).toFixed(1), +(Math.min(...e) - mu).toFixed(1)]); }
        rep.steady = st; ok(st.every((s) => s[1] <= 3 && s[2] >= -3), 'amoSteady: RMS over 2 s at y 0.3 within ±3 dB (100-ms windows, max/min vs mean): ' + st.map((s) => s[0] + ' Hz +' + s[1] + '/' + s[2]).join(', ')); }
      // DC at the wildest corner (y 1, Zeit 1, Ausreißer, 55 Hz) – the seed is DC-free, the blocker takes the period's wander
      { const x = await one(page, { eng: key, f: 55, y: 1, dur: 3, params: P_({ 'amo.zeit': 1, 'amo.verteilung': 'cauchy' }) }); const m = mono(x), dc = L.mean(m, 0.3 * SR), r = L.rms(m, 0.3 * SR);
        rep.dcWild = [+dc.toFixed(5), +L.db(r).toFixed(1)]; ok(Math.abs(dc) < 0.01, `DC at y 1, Zeit 1, Ausreißer, 55 Hz: ${dc.toFixed(5)} (< 0.01; RMS ${L.db(r).toFixed(1)} dBFS)`); }
      // amoHoehe: Höhe = unrest – the noise between the harmonics, the per-period change and the energy above 2 kHz rise
      // (band energies, not a power centroid: lesson 5); three notes each
      const hh = {};
      for (const f of [55, 110, 220]) { hh[f] = [];
        for (const y of [0, 0.5, 1]) { let on = 0, off = 0, hi = 0, tot = 0, fl = 0;
          for (let i = 0; i < 3; i++) { const fq = f === 220 ? 200 : f === 110 ? 100 : 50, m = mono(await one(page, { eng: key, f: fq, y, dur: 2, params: P_() })), sp = L.spectrum(m, SR, 0.6, 32768);
            for (let k = 1; k * sp.hz < 16000; k++) { const hz = k * sp.hz, d = Math.abs(hz - Math.round(hz / fq) * fq); if (d > fq / 4) off += sp.p[k]; else on += sp.p[k]; tot += sp.p[k]; if (hz > 2000) hi += sp.p[k]; }
            fl += perFlux(m, Math.round(SR / fq), 0.5, 1.9).flux / 3; }
          hh[f].push({ y, noise: +(10 * Math.log10(off / on)).toFixed(1), hi: +(10 * Math.log10(hi / tot)).toFixed(1), flux: +fl.toFixed(3) }); } }
      rep.hoehe = hh;
      ok(Object.values(hh).every((r) => r[1].noise - r[0].noise >= 8 && r[2].noise - r[1].noise >= 8), 'amoHoehe: the noise between the harmonics rises with Höhe (y 0/0.5/1, ≥ 8 dB a step): ' + Object.entries(hh).map(([f, r]) => f + ' Hz ' + r.map((x) => x.noise).join('/')).join(', '));
      ok(Object.values(hh).every((r) => r[1].flux > 2 * r[0].flux && r[2].flux > 2 * r[1].flux), 'amoHoehe: the change from period to period rises with Höhe (calm → wandering → raging): ' + Object.entries(hh).map(([f, r]) => f + ' Hz ' + r.map((x) => x.flux).join('/')).join(', '));
      ok(Object.values(hh).every((r) => r[2].hi > r[0].hi + 3), 'amoHoehe: more energy above 2 kHz at the top (share, dB): ' + Object.entries(hh).map(([f, r]) => f + ' Hz ' + r.map((x) => x.hi).join('/')).join(', '));
      // amoAlias: above 1 kHz the folded products stay ≤ −30 dB (K_eff) – against a 4×-rate reference in Node (the same
      // processor, the same seed; see alias-amo.js)
      { const { aliasAt } = require('./alias-amo'); const al = [];
        for (const rich of [false, true]) for (const f of [1013, 1511, 2011]) for (const y of [0.5, 1]) { const r = aliasAt(f, y, { rich, prm: { zeit: 0.15 } }); al.push([rich ? 'L3' : 'L1', f, y, +r.worst.toFixed(1), +r.total.toFixed(1)]); }
        rep.alias = al;
        ok(al.every((a) => a[3] <= -30 && a[4] <= -30), 'amoAlias: above 1 kHz the strongest folded line and the folded energy between the harmonics ≤ −30 dB: ' + al.map((a) => a[0] + ' ' + a[1] + '/' + a[2] + ' ' + a[3] + '/' + a[4]).join(', ')); }
      // amoZucken: a Puls hit is a 35-ms wild run, every hit freshly seeded – two hits at the same (f, y) differ; the run
      // shows as change between periods in its window against later
      { const h = async () => mono(await one(page, { eng: key, f: 200, y: 0.6, dur: 0.6, params: P_(), burst: true, gate: 0.22 }));
        const a = await h(), b = await h(); let ab = 0, aa = 0, bb = 0; for (let i = Math.round(0.06 * SR); i < 0.25 * SR; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
        const cor = ab / Math.sqrt(aa * bb), z1 = perFlux(a, 240, 0.055, 0.09).flux, z2 = perFlux(a, 240, 0.12, 0.25).flux;
        rep.zucken = { corr: +cor.toFixed(2), fluxRun: +z1.toFixed(3), fluxAfter: +z2.toFixed(3) };
        ok(Math.abs(cor) < 0.9, `amoZucken: two Puls hits at 200 Hz, y 0.6 differ (waveform correlation ${cor.toFixed(2)} < 0.9)`);
        ok(z1 >= 2 * z2, `amoZucken: the 35-ms run – change per period ${z1.toFixed(3)} in it vs ${z2.toFixed(3)} after (≥ 2×)`); }
      // amoHeal: a Höhe spike (Gestik's shake through Höhe) and a shake's swing (wkShake) break the form; Rückkehr heals
      // it (the distance of a period from one before the burst: up, then back), without Rückkehr it stays broken
      { const heal = async (moves, rueck) => { const m = mono(await one(page, { eng: key, f: 200, y: 0.3, dur: 3.4, params: P_({ 'amo.rueck': rueck }), moves })); return [dist(m, 240, 0.9, 0.95), Math.max(...[1.05, 1.1, 1.15, 1.2].map((t) => dist(m, 240, 0.9, t))), L.mean([2.6, 2.8, 3.0].map((t) => dist(m, 240, 0.9, t)))].map((v) => +v.toFixed(2)); };
        const sp = await heal([[1.0, 'setY', 1], [1.12, 'setY', 0.3]], 0.3), sk = await heal([[1.0, 'hammer', 1]], 0.3), s0 = await heal([[1.0, 'setY', 1], [1.12, 'setY', 0.3]], 0);
        rep.heal = { spike: sp, shake: sk, spikeNoReturn: s0 };
        ok(sp[1] >= 3 * sp[0] && sp[2] <= 0.5 * sp[1], `amoHeal: a Höhe spike breaks the form and it heals (distance from before: ${sp.join(' → ')}; Rückkehr 0: ${s0.join(' → ')})`);
        ok(s0[2] > 1.5 * sp[2], `amoHeal: without Rückkehr it stays changed (${s0[2]} vs ${sp[2]} after 1.6 s)`);
        ok(sk[1] >= 2 * sk[0] && sk[2] <= 0.6 * sk[1], `amoHeal: a shake's swing (Gestik) is a burst that heals (${sk.join(' → ')})`); }
      // amoDist: the distributions differ – Ausreißer: still, now and then a big jump (the change from one period to the
      // next: 99th percentile vs median) where the uniform moves evenly; Sinus: no dice – still low on the field, moving above
      { const pk = async (d, y) => { let r = 0; for (let i = 0; i < 3; i++) { const p = perFlux(mono(await one(page, { eng: key, f: 200, y, dur: 2.5, params: P_({ 'amo.verteilung': d }) })), 240, 0.5, 2.4); const s = p.all.sort((a, b) => a - b); r += s[Math.floor(0.99 * s.length)] / s[Math.floor(0.5 * s.length)] / 3; } return r; };
        const pl = await pk('linear', 0.5), pc = await pk('cauchy', 0.5), pg = await pk('logist', 0.5);
        const sn = async (y) => perFlux(mono(await one(page, { eng: key, f: 200, y, dur: 2.5, params: P_({ 'amo.verteilung': 'sinus' }) })), 240, 1.0, 2.4).flux;
        const s0 = await sn(0), s6 = await sn(0.6);
        rep.dist = { outliers: { linear: +pl.toFixed(2), logist: +pg.toFixed(2), cauchy: +pc.toFixed(2) }, sinus: [+s0.toFixed(4), +s6.toFixed(3)] };
        ok(pc >= 3 * pl && pg >= 0.9 * pl, `amoDist: Ausreißer – the change per period, 99th percentile / median: linear ${pl.toFixed(2)}, logistisch ${pg.toFixed(2)}, Ausreißer ${pc.toFixed(2)} (≥ 3× linear: rare big jumps)`);
        ok(s0 < 0.01 && s6 > 0.03, `amoDist: Sinus – still at y 0 (change per period ${s0.toFixed(4)}), moving at y 0.6 (${s6.toFixed(3)})`); }
      // the envelope knobs: Einschwingen (att 1 s → t90 ≈ 0.9 s) and Ausklingen (rel 2 s: −20 dB ≈ 0.9 s after the lift)
      { const ma = mono(await one(page, { eng: key, f: 110, y: 0.4, dur: 2.5, params: P_({ 'amo.att': 1 }) })), t9 = L.t90(ma, SR, 0.05, L.rms(ma, 1.6 * SR, 2.4 * SR));
        const mr = mono(await one(page, { eng: key, f: 110, y: 0.4, dur: 3.5, params: P_({ 'amo.rel': 2 }), rel: 1.0 })), e = L.env(mr, SR, 0.02).map(L.db), a = Math.round(0.95 / 0.02); let t20 = null; for (let i = a; i < e.length; i++) if (e[i] < e[a] - 20) { t20 = (i - a) * 0.02; break; }
        rep.knobs = { t90: +t9.toFixed(2), rel20: t20 };
        ok(t9 >= 0.6 && t9 <= 1.2 && t20 != null && t20 >= 0.6 && t20 <= 1.4, `Einschwingen 1 s: t90 ${t9.toFixed(2)} s; Ausklingen 2 s: −20 dB after ${t20} s`); }
      // level 3: two amoebas, decorrelated (L/R correlation of a held note), as loud as level 1 per channel at pan 0 and
      // ±0.4, held notes (four seeds)
      { let cr = 0; const lv = {};
        for (const pan of [0, -0.4, 0.4]) { let p1 = 0, p3 = 0;
          for (let i = 0; i < 4; i++) { const f = [55, 98, 147, 220][i], a = await one(page, { eng: key, f, y: 0.5, dur: 2, params: P_(), pan }), c = await one(page, { eng: key, f, y: 0.5, dur: 2, params: P_(), pan, q: '3' });
            const pw = (x) => (Math.pow(L.rms(x.L, 0.4 * SR, 1.9 * SR), 2) + Math.pow(L.rms(x.R, 0.4 * SR, 1.9 * SR), 2)) / 2; p1 += pw(a); p3 += pw(c);
            if (pan === 0) { let ab = 0, aa = 0, bb = 0; for (let k = 0.4 * SR; k < 1.9 * SR; k++) { ab += c.L[k] * c.R[k]; aa += c.L[k] ** 2; bb += c.R[k] ** 2; } cr += ab / Math.sqrt(aa * bb) / 4; } }
          lv[pan] = +(10 * Math.log10(p3 / p1)).toFixed(2); }
        rep.l3 = { held: lv, corrLR: +cr.toFixed(2) };
        ok(Object.values(lv).every((d) => Math.abs(d) <= 1.5), 'level 3 as loud as level 1, held notes at pan 0/−0.4/0.4 (dB): ' + JSON.stringify(lv));
        ok(Math.abs(cr) < 0.5, `level 3: the two amoebas are decorrelated (L/R correlation ${cr.toFixed(2)})`); }
      // above the declared range: the level holds (normalised), the polygon keeps fewer points (K_eff) – INFO
      { const hi = []; for (const f of [55, 220, 880, 1760, 3520]) { const m = mono(await one(page, { eng: key, f, y: 0.5, dur: 1.5, params: P_() })); hi.push([f, +L.db(L.rms(m, 0.5 * SR, 1.4 * SR)).toFixed(1), Math.round(L.centroid(m, SR, 0.8, 8192))]); }
        rep.high = hi;
        console.log('INFO amo: above 500 Hz (level dBFS, centroid Hz): ' + hi.map((h) => h[0] + ' Hz ' + h[1] + '/' + h[2]).join(', '));
        ok(hi.every((h) => Math.abs(h[1] - hi[1][1]) <= 3), 'the level holds from 55 Hz to 3.5 kHz within ±3 dB of 220 Hz: ' + hi.map((h) => h[0] + ' ' + h[1]).join(', ')); }
      // demos: a bass line low on the field, the y sweep at 55 Hz, a healing shake, the four distributions
      { const x = await one(page, { eng: key, f: 55, y: 0, dur: 8, params: P_({ 'rev.mix': 0.2 }), moves: Array.from({ length: 31 }, (_, i) => [0.5 + i * 0.2, 'setY', i <= 15 ? i / 15 : (30 - i) / 15]), rel: 7 });
        L.wav(path.join(dir, 'sweep-55.wav'), x.L, x.R, SR); rep.pngSweep55 = L.spectro(path.join(dir, 'sweep-55.wav')); }
      { const x = await one(page, { eng: key, f: 82.4, y: 0.35, dur: 6, params: P_({ 'rev.mix': 0.2 }), moves: [[1.5, 'hammer', 1], [1.62, 'hammer', 1], [3.5, 'setY', 1], [3.65, 'setY', 0.35]], rel: 5.4 });
        L.wav(path.join(dir, 'heal.wav'), x.L, x.R, SR); rep.pngHeal = L.spectro(path.join(dir, 'heal.wav')); }
      for (const d of ['linear', 'cauchy', 'logist', 'sinus']) { const x = await one(page, { eng: key, f: 73.4, y: 0.6, dur: 4, params: P_({ 'amo.verteilung': d, 'rev.mix': 0.2 }), rel: 3.4, q: '3' }); L.wav(path.join(dir, 'dist-' + d + '.wav'), x.L, x.R, SR); }
    }
    if (key === 'shn') {
      const PS = (x) => Object.assign({}, DRY, x || {});
      const pw = (x, a, b) => { const r = L.rms(x, Math.round(a * SR), Math.round(b * SR)); return r * r; };
      const dB = (p) => 10 * Math.log10(p + 1e-30);
      const hp12 = (x) => { const w = 2 * Math.PI * 12000 / SR, al = Math.sin(w) / (2 * 0.7071), c = Math.cos(w), a0 = 1 + al, b0 = (1 + c) / 2 / a0, b1 = -(1 + c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, o = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, v1 = 0, v2 = 0; for (let i = 0; i < x.length; i++) { const u = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = u; const v = b0 * u + b1 * z1 + b0 * z2 - a1 * v1 - a2 * v2; z2 = z1; z1 = u; v2 = v1; v1 = v; o[i] = v; } return o; };
      const avg = async (n, o) => { const xs = []; for (let i = 0; i < n; i++) xs.push(mono(await one(page, o))); return xs; };
      // 1. glide 220 → 330 Hz over 0.2 s (a linear ramp on the k-rate freq: Chromium samples it once a block). Per sample
      // the length moves smoothly; a length set once per block would jump the read point at every block boundary (here
      // 0.6 samples, a 9.4-ct step a block): clicks at the block rate – +33 dB above 12 kHz while gliding (t-dsp, a
      // variant of the processor). The glide itself only moves the string's content up (+6 dB there in Node).
      { const g = async (glide) => mono(pull(await page.evaluate(async ([glide, dry]) => {
          const M = window.__M, ctx = await window.__ctx(1.1, Object.assign({ 'v.eng': 'shn' }, dry));
          ctx.suspend(19 / 375).then(() => { window.__v = M.playNote('shn', ctx.currentTime, 220, 0.5, 0.75, {}); ctx.resume(); });
          ctx.suspend(0.5).then(() => { const p = window.__v.wk.parameters.get('freq'); p.cancelScheduledValues(0); p.setValueAtTime(220, ctx.currentTime); if (glide) p.linearRampToValueAtTime(330, ctx.currentTime + 0.2); ctx.resume(); });
          return window.__ret(await ctx.startRendering());
        }, [glide, DRY])));
        const a = await g(true), b = await g(false), ha = hp12(a), hb = hp12(b);
        const zip = L.db(L.rms(ha, Math.round(0.51 * SR), Math.round(0.7 * SR))) - L.db(L.rms(hb, Math.round(0.51 * SR), Math.round(0.7 * SR)));
        const land = L.cents(peakHz(a, SR, 330, 0.75, 8192), 330);
        rep.glide = { zipDb: +zip.toFixed(1), landCt: +land.toFixed(2) };
        ok(zip <= 10 && Math.abs(land) <= 3, `glide 220 → 330 Hz in 0.2 s: no stairs – above 12 kHz while gliding ${zip.toFixed(1)} dB vs held (≤ +10; a per-block length +33), lands at ${land.toFixed(2)} ct`); }
      // 2. palm (y 0): the ring dies within 0.15 s (T60 from the pluck's peak); a thud, not silence
      { const pr = [];
        for (const f of [110, 220, 440]) { const m = mono(await one(page, { eng: key, f, y: 0, dur: 0.8, params: PS() })), e = L.env(m, SR, 0.005); let mx = 0; for (let i = 0; i < e.length; i++) if (e[i] > e[mx]) mx = i; let t = Infinity; for (let i = mx; i < e.length; i++) if (e[i] < e[mx] * 0.001) { t = (i - mx) * 0.005; break; }
          const open = mono(await one(page, { eng: key, f, y: 0.5, dur: 0.3, params: PS() })); pr.push([f, +t.toFixed(3), +(L.db(L.rms(m, 0.05 * SR, 0.07 * SR)) - L.db(L.rms(open, 0.05 * SR, 0.07 * SR))).toFixed(1)]); }
        rep.palm = pr;
        ok(pr.every((p) => p[1] <= 0.15 && p[2] >= -15), 'palm at y 0: T60 ≤ 0.15 s, the thud (its first 20 ms) within 15 dB of the open pluck: ' + pr.map((p) => p[0] + ' Hz ' + p[1] + ' s / ' + p[2] + ' dB').join(', ')); }
      // 3. flageolet at y 0.75 (½): the fundamental ≤ −20 dB vs 2f, the level within 6 dB of the open string (3 plucks each)
      { const fl = [];
        for (const f of [110, 220, 440]) {
          const a = await avg(3, { eng: key, f, y: 0.75, dur: 0.6, params: PS() }), o = await avg(3, { eng: key, f, y: 0.5, dur: 0.6, params: PS() });
          let h1 = 0, h2 = 0, la = 0, lo = 0; for (const m of a) { const sp = L.spectrum(m, SR, 0.3, 16384); h1 += Math.pow(10, L.harm(sp, f, 1) / 10); h2 += Math.pow(10, L.harm(sp, f, 2) / 10); la += pw(m, 0.05, 0.55); } for (const m of o) lo += pw(m, 0.05, 0.55);
          fl.push([f, +(dB(h1) - dB(h2)).toFixed(1), +(dB(la) - dB(lo)).toFixed(1)]);
        }
        rep.flageolet = fl;
        ok(fl.every((x) => x[1] <= -20), 'flageolet ½ (y 0.75): the fundamental vs 2f ' + fl.map((x) => x[0] + ' Hz ' + x[1] + ' dB').join(', ') + ' (≤ −20)');
        ok(fl.every((x) => Math.abs(x[2]) <= 6), 'flageolet ½ level vs the open string: ' + fl.map((x) => x[0] + ' Hz ' + x[2] + ' dB').join(', ') + ' (within 6 dB)');
        const th = []; for (const [y, h] of [[0.79, 3], [0.83, 4]]) { const m = mono(await one(page, { eng: key, f: 220, y, dur: 0.6, params: PS() })), sp = L.spectrum(m, SR, 0.3, 16384); th.push([y, h, +(Math.max(L.harm(sp, 220, 1), L.harm(sp, 220, 2)) - L.harm(sp, 220, h)).toFixed(1)]); }
        rep.flageoletUpper = th;
        ok(th.every((x) => x[2] <= -20), 'flageolet ⅓ / ¼ (y 0.79 / 0.83): the fundamental and 2f vs 3f / 4f ' + th.map((x) => x[2] + ' dB').join(', ') + ' (≤ −20)'); }
      // 4. E-Bow at y 0.95: ≥ −12 dB after 4 s (vs the pluck), gone within 0.5 s after release
      { const eb = [];
        for (const f of [110, 220, 440]) { const m = mono(await one(page, { eng: key, f, y: 0.95, dur: 5.4, params: PS(), rel: 4.6 })); const pl = L.rms(m, 0.06 * SR, 0.26 * SR), st = L.rms(m, 4.0 * SR, 4.5 * SR), e = L.env(m, SR, 0.01); let t = Infinity; const a = Math.round(4.62 / 0.01); for (let i = a; i < e.length; i++) if (e[i] < st * 0.001) { t = (i - a) * 0.01; break; }
          eb.push([f, +(L.db(st) - L.db(pl)).toFixed(1), +t.toFixed(2)]); }
        rep.ebow = eb;
        ok(eb.every((x) => x[1] >= -12), 'E-Bow at y 0.95: level 4.0–4.5 s vs the pluck ' + eb.map((x) => x[0] + ' Hz ' + x[1] + ' dB').join(', ') + ' (≥ −12)');
        ok(eb.every((x) => x[2] <= 0.5), 'E-Bow: after release −60 dB within ' + eb.map((x) => x[2] + ' s').join(', ') + ' (≤ 0.5)');
        // the dying pluck swells back: under the E-Bow (y 0.9) the level climbs again after its dip
        const m = mono(await one(page, { eng: key, f: 220, y: 0.9, dur: 3, params: PS() })), e = L.env(m, SR, 0.05).map(L.db); let lo = 1; for (let i = 1; i < 30; i++) if (e[i] < e[lo]) lo = i;
        rep.ebowSwell = { dip: +(e[lo] - e[1]).toFixed(1), at: lo * 0.05, back: +(e[55] - e[lo]).toFixed(1) };
        ok(e[55] - e[lo] >= 6, `E-Bow at y 0.9: the pluck dies ${(e[lo] - e[1]).toFixed(1)} dB by ${(lo * 0.05).toFixed(2)} s and swells back ${(e[55] - e[lo]).toFixed(1)} dB (≥ 6)`); }
      // 5. jawari: the pluck blooms – its centroid rises for ≥ 0.5 s; the flat bridge's falls (3 plucks each, 110 and 220 Hz;
      // the default touch and a soft one: the first note must sirr)
      { const ts = []; for (let t = 0.03; t < 2.4; t += 0.05) ts.push(t);
        const track = async (f, steg, vel) => { const c = ts.map(() => 0); for (let i = 0; i < 3; i++) { const m = mono(await one(page, { eng: key, f, y: 0.5, dur: 2.5, vel, params: PS({ 'shn.steg': steg }) })); ts.forEach((t, k) => { c[k] += L.centroid(m, SR, t, 2048) / 3; }); } return c; };
        const rise = (c) => { let pk = 0; for (let i = 1; i < c.length; i++) if (c[i] > c[pk]) pk = i; return [ts[pk] - ts[0], c[pk] / c[0]]; };
        const jr = [];
        for (const [f, vel] of [[110, 0.75], [220, 0.75], [220, 0.4]]) { const j = await track(f, 'jawari', vel), fl = await track(f, 'flach', vel); const [rt, gain] = rise(j); jr.push({ f, vel, rise: +rt.toFixed(2), gain: +gain.toFixed(2), flach: +(fl[10] / fl[0]).toFixed(2), track: [0, 4, 9, 14, 19, 29, 39].map((k) => Math.round(j[k])) }); }
        rep.jawari = jr;
        ok(jr.every((x) => x.rise >= 0.5 && x.gain >= 1.5 && x.flach < 1), 'jawari blooms: centroid rising for ' + jr.map((x) => x.f + ' Hz/vel ' + x.vel + ' ' + x.rise + ' s (×' + x.gain + ')').join(', ') + ' (≥ 0.5 s); the flat bridge falls (×' + jr.map((x) => x.flach).join('/') + ' at 0.5 s)');
        const m = mono(await one(page, { eng: key, f: 220, y: 0.5, dur: 1.4, params: PS({ 'shn.steg': 'jawari' }) })), sp = L.spectrum(m, SR, 1, 16384); let hb = 0; for (let k = Math.round(2000 / sp.hz); k < 8000 / sp.hz; k++) hb += sp.p[k];
        rep.jawariFund = +(L.harm(sp, 220, 1) - dB(hb)).toFixed(1);
        console.log(`INFO shn: jawari at 1 s – the fundamental vs the 2–8 kHz band ${rep.jawariFund} dB (phone speakers: a thin rattle if far below)`);
        ok(Math.abs(L.cents(peakHz(m, SR, 220, 0.6, 32768), 220)) <= 5, `jawari in tune: ${L.cents(peakHz(m, SR, 220, 0.6, 32768), 220).toFixed(2)} ct at 0.6 s (≤ 5)`); }
      // 6. a held string under the moving hand (Höhe live): open → node (the fundamental goes, the octave stays) → E-Bow
      // (the fundamental swells back) → palm (it dies)
      { const m = mono(await one(page, { eng: key, f: 220, y: 0.5, dur: 4.2, params: PS(), moves: [[0.6, 'setY', 0.75], [1.4, 'setY', 0.9], [3.0, 'setY', 0.05]] }));
        const s1 = L.spectrum(m, SR, 1.1, 8192), h12 = L.harm(s1, 220, 1) - L.harm(s1, 220, 2), sw = L.db(L.rms(m, 2.6 * SR, 2.95 * SR)) - L.db(L.rms(m, 1.2 * SR, 1.38 * SR)), pm = L.db(L.rms(m, 3.6 * SR, 4.1 * SR)) - L.db(L.rms(m, 2.6 * SR, 2.95 * SR));
        rep.handLive = { node: +h12.toFixed(1), ebow: +sw.toFixed(1), palm: +pm.toFixed(1) };
        ok(h12 <= -20 && sw >= 6 && pm <= -40, `the hand on a sounding string: at the node the fundamental ${h12.toFixed(1)} dB vs 2f (≤ −20), under the E-Bow it swells ${sw.toFixed(1)} dB (≥ 6), the palm mutes it ${pm.toFixed(1)} dB (≤ −40)`); }
      // 7. the E-Bow boundary under vibrato (y 0.85 ± 0.006, Gestik): the hysteresis holds the zone – no level jumps
      { const mv = []; for (let i = 0; i < 40; i++) mv.push([0.4 + i * 0.05, 'setY', i % 2 ? 0.856 : 0.844]);
        const m = mono(await one(page, { eng: key, f: 220, y: 0.86, dur: 2.6, params: PS(), moves: mv })), e = L.env(m, SR, 0.02).map(L.db).slice(25, 120); let jmp = 0; for (let i = 1; i < e.length; i++) jmp = Math.max(jmp, Math.abs(e[i] - e[i - 1]));
        rep.ebowEdge = +jmp.toFixed(2);
        ok(jmp <= 1.5 && L.peak(m) < 1, `the E-Bow's edge under vibrato (y 0.844 ↔ 0.856 every 50 ms): largest level step between 20-ms windows ${jmp.toFixed(2)} dB (≤ 1.5)`); }
      // 8. Puls lanes: 16ths (8 hits/s, gate 0.112) at y 0.5 and at y 0.95 (the lane stays below the E-Bow) – ≤ 8 voices, all end
      { const ln = [];
        for (const y of [0.5, 0.95]) { const r = await page.evaluate(async ([y, dry]) => {
            const M = window.__M, ctx = await window.__ctx(4.5, Object.assign({ 'v.eng': 'shn' }, dry)); M.applyQuality(); let maxV = 0;
            for (let j = 0; j < 24; j++) ctx.suspend(Math.round((0.1 + j / 8) * 375) / 375).then(() => { M.hit('shn', ctx.currentTime, M.noteAt((j * 0.37) % 1).f, y, 0.7, { gate: 0.112 }); let n = 0; for (const v of M.A.voices) if (v.alive && ctx.currentTime < v.endAt) n++; maxV = Math.max(maxV, n); ctx.resume(); });
            const b = await ctx.startRendering(); await new Promise((r) => setTimeout(r, 1200)); const st = window.__stats(b, 3.9);
            return { maxV, left: [...M.A.voices].filter((v) => v.alive && v.eng === 'shn').length, tail: st.rms };
          }, [y, DRY]); ln.push([y, r.maxV, r.left, r.tail]); }
        rep.lanes16 = ln;
        ok(ln.every((x) => x[1] <= 8 && x[2] === 0 && x[3] < -90), '16th lanes: ' + ln.map((x) => 'y ' + x[0] + ' at most ' + x[1] + ' voices, ' + x[2] + ' left, tail ' + x[3] + ' dB').join('; ') + ' (≤ 8, all end)'); }
      // demos (default effects): glides with Bebung, the hand from palm to E-Bow and back, a tanpura on jawari, a palm-mute riff
      { const dd = path.join(__dirname, '..', 'demo'); fs.mkdirSync(dd, { recursive: true });
        const demo = async (name, fn, dur) => { const x = pull(await page.evaluate(async ([fn, dur]) => { const M = window.__M; return window.__ret(await (new Function('M', 'ctx', fn))(M, await window.__ctx(dur, { 'v.eng': 'shn' }, '3'))); }, [fn, dur])); L.wav(path.join(dir, name + '.wav'), x.L, x.R, SR); fs.copyFileSync(path.join(dir, name + '.wav'), path.join(dd, name + '.wav')); const png = L.spectro(path.join(dir, name + '.wav')); if (png) fs.copyFileSync(png, path.join(dd, name + '.png')); return png; };
        const at = (t, body) => `ctx.suspend(Math.round(${t} * 375) / 375).then(() => { ${body}; ctx.resume(); });`;
        rep.demos = [];
        rep.demos.push(await demo('demo-gleiten', [at(0.1, "window.__a = M.playNote('shn', ctx.currentTime, 196, 0.5, 0.8, {})"), at(1.2, 'window.__a.setF(262, 0.25)'), at(2.0, 'window.__a.setF(233, 0.12)'), at(2.6, 'window.__a.setF(294, 0.4)'), at(3.6, 'window.__a.setY(0.92)'), at(6.0, 'window.__a.release()'), 'return ctx.startRendering();'].join('\n'), 7));
        rep.demos.push(await demo('demo-hand', [at(0.1, "window.__a = M.playNote('shn', ctx.currentTime, 147, 0.5, 0.8, {})"), ...Array.from({ length: 50 }, (_, i) => at(0.4 + i * 0.12, 'window.__a.setY(' + (i < 25 ? 0.5 + 0.5 * i / 24 : 1 - (i - 24) / 25).toFixed(3) + ')')), at(6.8, 'window.__a.release()'), 'return ctx.startRendering();'].join('\n'), 7.5));
        rep.demos.push(await demo('demo-jawari', ["M.P['shn.steg'] = 'jawari'; M.P['shn.daempfung'] = 6;", ...[[0.1, 98], [1.6, 147], [3.1, 131], [4.6, 98]].map(([t, f]) => at(t, `const v = M.hit('shn', ctx.currentTime, ${f}, 0.5, 0.7, { gate: 1.4 })`)), 'return ctx.startRendering();'].join('\n'), 8));
        rep.demos.push(await demo('demo-puls-palm', ["M.P['seq.bpm'] = 120;", ...Array.from({ length: 32 }, (_, i) => at(0.1 + i * 0.125, `M.hit('shn', ctx.currentTime, ${[82, 82, 98, 82, 110, 82, 98, 123][i % 8]}, ${i % 4 === 3 ? 0.5 : 0.08}, 0.8, { gate: 0.1 })`)), 'return ctx.startRendering();'].join('\n'), 5));
        console.log('demos: ' + rep.demos.filter(Boolean).join(' ')); }
    }
    if (key === 'glt') {
      // ---- Glut: every acceptance row of SPEC §3.3 and the fixes of inventor-glt / composer-kre, for the worklet loop and
      // for its own native loop (a context without the module) ----
      const PG = (x) => Object.assign({}, DRY, x || {}), FS = [55, 110, 220, 440, 880, 1760];
      const envDb = (m, win) => L.env(m, SR, win).map((v) => L.db(v));
      // the swell's slope (dB/s) from 25 to 8 dB under the settled level (the linear part, before the knee)
      const slope = (e, win) => { const fin = Math.max(...e.slice(-40)); let a = -1, b = -1; for (let i = 0; i < e.length; i++) { if (a < 0 && e[i] > fin - 25) a = i; if (a >= 0 && e[i] > fin - 8) { b = i; break; } } return a < 0 || b <= a ? NaN : (e[b] - e[a]) / ((b - a) * win); };
      // T60 after the release at `at`: the decay's slope, fitted over 50-ms windows (≥ 2 periods at 55 Hz) from 0.1 s after it
      // down to 35 dB under its start
      const t60 = (m, at) => { const e = envDb(m, 0.05), a = Math.round((at + 0.1) / 0.05); let sx = 0, sy = 0, sxx = 0, sxy = 0, k = 0;
        for (let i = a; i < e.length && e[i] > e[a] - 35; i++, k++) { const t = (i - a) * 0.05; sx += t; sy += e[i]; sxx += t * t; sxy += t * e[i]; }
        const sl = (k * sxy - sx * sy) / (k * sxx - sx * sx); return k > 2 && sl < 0 ? -60 / sl : Infinity; };
      for (const nat of [false, true]) {
        const tag = nat ? 'native loop' : 'worklet', okg = (c, msg) => ok(c, tag + ': ' + msg), R_ = {};
        const play = (o) => one(page, Object.assign({ eng: key, nodsp: nat, params: PG(o.pp) }, o));
        if (nat) { const r = await page.evaluate(async () => { const M = window.__M, ctx = await window.__ctx(0.5, { 'v.eng': 'glt' }, '1', true); const v = M.playNote('glt', 0.05, 220, 0.6, 0.7, {}); await ctx.startRendering(); return { as: v && v.as, wk: !!(v && v.wk), nat: !!(v && v.gltN), dsp: window.__dspOk, cost: v && v.cost }; });
          okg(r.as === 'glt' && !r.wk && r.nat && !r.dsp, 'no module in the context: Glut plays its own native loop (as glt, no worklet node) ' + JSON.stringify(r)); }
        // 1. growth per second at y 0.6, 55–1760 Hz (±25 %): from a dying ping (y 0.2) the finger flares to 0.6 at 1 s –
        // the slope from 25 to 8 dB under the settled level (the onset's own seed and ramp stay out of it)
        const gr = []; for (const f of FS) { const m = mono(await play({ f, y: 0.2, dur: 3.5, moves: [[1.0, 'setY', 0.6]] })); gr.push(+slope(envDb(m, 0.01).slice(105), 0.01).toFixed(1)); }
        const gm = L.mean(gr); R_.growth = gr;
        okg(gr.every((g) => Math.abs(g / gm - 1) <= 0.25), `growth at y 0.6 the same at every pitch (±25 %): ${FS.map((f, i) => f + ' Hz ' + gr[i]).join(', ')} dB/s (mean ${gm.toFixed(1)})`);
        // 2. afterglow T60 = Nachglühen ±20 % across octaves
        const ag = [];
        for (const ng of [0.5, 1.5, 4]) for (const f of [55, 220, 880, 1760]) { const m = mono(await play({ f, y: 0.7, dur: 1.5 + 0.8 * ng, pp: { 'glt.nachgluehen': ng }, rel: 1.2 })); ag.push([ng, f, +t60(m, 1.2).toFixed(2)]); }
        R_.afterglow = ag;
        okg(ag.every((a) => Math.abs(a[2] / a[0] - 1) <= 0.2), 'afterglow T60 = Nachglühen ±20 %: ' + ag.map((a) => a[0] + 's@' + a[1] + ' ' + a[2]).join(', '));
        // the settled level: the same at every pitch (the knee per second; a tanh alone saturates high notes lower)
        const lv = []; for (const f of FS) { const m = mono(await play({ f, y: 0.6, dur: 3.5 })); lv.push(+L.db(L.rms(m, 2.5 * SR, 3.5 * SR)).toFixed(1)); }
        R_.settled = lv;
        okg(Math.max(...lv) - Math.min(...lv) <= 3, `settled level at y 0.6 within ±1.5 dB across 55–1760 Hz: ${lv.join(' / ')} dBFS`);
        // 3. y 0 ≥ −40 dB: the knock and its ping (0.05–0.55 s) against the held tone at y 0.6
        const ping = []; for (const f of [110, 440]) { const h = mono(await play({ f, y: 0.6, dur: 3 })), p0 = mono(await play({ f, y: 0, dur: 1 })); ping.push(+(L.db(L.rms(p0, 0.05 * SR, 0.55 * SR)) - L.db(L.rms(h, 2 * SR, 3 * SR))).toFixed(1)); }
        R_.ping = ping; okg(ping.every((d) => d >= -40 && d <= -10), `y 0 is a soft ping: ${ping.join(' / ')} dB vs held at y 0.6 (≥ −40, a ping not a tone)`);
        // the threshold: under y 0.3 a note dies, above it grows
        { const lo = mono(await play({ f: 220, y: 0.15, dur: 2.5 })), hi = mono(await play({ f: 220, y: 0.4, dur: 2.5 }));   // (y 0.15: r −3 ± Glimmen's 1.5 – just under 0.3 Glimmen may hold a note for seconds)
          const d0 = L.db(L.rms(lo, 2 * SR, 2.5 * SR)) - L.db(L.rms(lo, 0.05 * SR, 0.3 * SR)), d1 = L.db(L.rms(hi, 2 * SR, 2.5 * SR)) - L.db(L.rms(hi, 0.05 * SR, 0.3 * SR)); R_.threshold = [+d0.toFixed(1), +d1.toFixed(1)];
          okg(d0 <= -20 && d1 >= 4, `threshold near y 0.3: y 0.15 dies ${d0.toFixed(1)} dB, y 0.4 grows +${d1.toFixed(1)} dB in 2 s`); }
        // the knee: the settled level rises with the height (A² ∝ r: y 0.4 ≈ −6.5, 0.6 ≈ −1.8 dB under y 1 – Glimmen wanders it)
        { const kn = []; for (const y of [0.4, 0.6, 1]) { const m = mono(await play({ f: 220, y: y > 0.75 ? 0.74 : y, dur: 4.5, pp: y > 0.75 ? { 'glt.gluehen': 1 } : {} })); kn.push(+L.db(L.rms(m, 2.5 * SR, 4.5 * SR)).toFixed(1)); } R_.knee = kn;
          okg(kn[0] < kn[1] - 2 && kn[1] <= kn[2] + 1, `a soft knee: the settled level rises with Höhe (y 0.4 / 0.6 / top: ${kn.join(' / ')} dBFS)`); }
        // 4. Puls: 112 ms at 55 Hz ≥ −20 dB inside the gate; the state is set – a hit sounds within its first 30 ms
        const bu = [];
        for (const f of [55, 220, 880]) { const h = L.rms(mono(await play({ f, y: 0.6, dur: 2.5 })), 1.5 * SR, 2.5 * SR); const m = mono(await play({ f, y: 0.6, dur: 2.6, burst: true, gate: 0.112 }));
          const e = L.env(m.subarray(Math.round(0.052 * SR), Math.round(0.164 * SR)), SR, 0.02); bu.push([f, +(L.db(Math.max(...e)) - L.db(h)).toFixed(1), +(L.db(L.rms(m, Math.round(0.055 * SR), Math.round(0.085 * SR))) - L.db(h)).toFixed(1)]); }
        R_.burst = bu;
        okg(bu[0][1] >= -20, `Puls 112 ms at 55 Hz inside the gate: ${bu[0][1]} dB vs held (≥ −20)`);
        okg(bu.every((b) => b[2] >= (nat ? -20 : -12)), `a hit lands at once: its first 30 ms ${bu.map((b) => b[0] + ' Hz ' + b[2]).join(', ')} dB vs held (≥ ${nat ? -20 : -12}${nat ? ' – natively the seed charges the loop within a pass' : ''})`);
        // 5. f0 ≤ 8 ct, also under Bebung: static ±50 ct, and a vibrato ±50 ct at 5 Hz followed (the band and the delay move together)
        const fb = [];
        for (const f of [110, 440, 1760]) for (const c of [-50, 50]) { const m = mono(await play({ f, y: 0.6, dur: 2.4, cents: c })); const ft = f * Math.pow(2, c / 1200); fb.push([f, c, +L.cents(peakHz(m, SR, ft, 1.2, 32768), ft).toFixed(2)]); }
        R_.bebung = fb;
        okg(fb.every((b) => Math.abs(b[2]) <= 8), 'f0 under Bebung ±50 ct within 8 ct: ' + fb.map((b) => b[0] + (b[1] > 0 ? '+' : '') + b[1] + ' ' + b[2]).join(', '));
        { const vt = [];
          for (const f of [110, 440, 1760]) {
            const m = mono(await play({ f, y: 0.6, dur: 3, vib: [5, 50] })); let err = 0, n = 0;
            for (let t = 1.2; t < 2.7; t += 0.02) {
              const a = Math.round(t * SR), N = f < 200 ? 2048 : 1024, fm = L.yin(m.subarray(a, a + N + Math.ceil(SR / (f * 0.8))), SR, f * 0.8, f * 1.25);
              let ce = 0; for (let k = 0; k < N; k += 32) ce += 50 * Math.sin(2 * Math.PI * 5 * ((a + k) / SR - 19 / 375)); ce /= Math.ceil(N / 32);   // (the vibrato averaged over the window; started with the note)
              err += Math.abs(L.cents(fm, f) - ce); n++;
            }
            vt.push([f, +(err / n).toFixed(2)]);
          }
          R_.vibrato = vt;
          okg(vt.every((v) => v[1] <= 8), 'a vibrato ±50 ct at 5 Hz followed: mean |pitch − vibrato| ' + vt.map((v) => v[0] + ' Hz ' + v[1] + ' ct').join(', ') + ' (≤ 8)'); }
        // native: the in-cycle delay of n periods is exact (n = 1, 2, 6 at 110, 440, 1760 Hz) – SPEC: native fallback f0 exact
        if (nat) { const fn = []; for (const f of FS) for (const y of [0.45, 0.7]) { const m = mono(await play({ f, y, dur: 2.4 })); fn.push([f, y, +L.cents(peakHz(m, SR, f, 1.2, 32768), f).toFixed(2)]); }
          R_.f0 = fn; okg(fn.every((r) => Math.abs(r[2]) <= 3), 'f0 of the native loop (n periods in the cycle, n = 1…6) within 3 ct at 55–1760 Hz: ' + fn.map((r) => r[0] + '/' + r[1] + ' ' + r[2]).join(', ')); }
        // 6. peak after v.out ≤ −1 dBFS at any y / Hitze (one voice at velocity 1, held, and a Puls hit)
        { let pk = -200, at = '';
          for (const y of [0, 0.35, 0.6, 0.85, 1]) for (const h of [0, 0.5, 1]) for (const burst of [false, true]) {
            const x = await play({ f: y > 0.8 ? 110 : 220, y, vel: 1, dur: 2.5, pp: { 'glt.hitze': h, 'glt.zunder': 1, 'glt.kasten': 1 }, burst, gate: 0.5 }); const p = L.db(Math.max(L.peak(x.L), L.peak(x.R)));
            if (p > pk) { pk = p; at = `y ${y}, Hitze ${h}${burst ? ', Puls' : ''}`; }
          }
          R_.peak = [+pk.toFixed(2), at]; okg(pk <= -1, `peak after v.out ${pk.toFixed(2)} dBFS (≤ −1) at its loudest (${at}; velocity 1, Zunder and Kasten full)`); }
        // Glimmen: the settled tone breathes (level and pitch wander) – never a static sine (the check)
        { const m = mono(await play({ f: 220, y: 0.6, dur: 9 })); const e = envDb(m, 0.2).slice(15, 44); const pc = []; for (let t = 3; t < 8.4; t += 0.3) pc.push(L.cents(peakHz(m, SR, 220, t, 16384), 220));
          const lr = Math.max(...e) - Math.min(...e), pr = Math.max(...pc) - Math.min(...pc); R_.glimmen = [+lr.toFixed(2), +pr.toFixed(2)];
          okg(lr >= 0.4 && lr <= 6 && pr >= 0.5 && pr <= 8, `Glimmen: over 6 s the settled tone's level wanders ${lr.toFixed(2)} dB (0.4–6) and its pitch ${pr.toFixed(2)} ct (0.5–8)`); }
        // Sprung: held at y 0.6 → 0.85 jumps to the twelfth (Sprung 3) / octave (Sprung 2) – quickly, without a hole
        { const sj = [];
          for (const [sp, yy, mm] of [['3', 0.85, 3], ['2', 0.82, 2]]) for (const f of [110, 440]) {
            const m = mono(await play({ f, y: 0.6, dur: 3, pp: { 'glt.sprung': sp }, moves: [[1.2, 'setY', yy]] })); const e = envDb(m, 0.01), a = Math.round(1.1 / 0.01), lo = Math.min(...e.slice(a, a + 60));
            let td = null; for (let t = 1.2; t < 2.5; t += 0.01) { const s2 = L.spectrum(m, SR, t, 2048); if (L.harm(s2, f, mm) > L.harm(s2, f, 1) + 10) { td = t - 1.2; break; } }
            const s3 = L.spectrum(m, SR, 2.3, 16384); sj.push([sp, f, td == null ? null : Math.round(td * 1000), +(lo - e[a]).toFixed(1), +(L.harm(s3, f, mm) - L.harm(s3, f, 1)).toFixed(1)]);
          }
          R_.sprung = sj;
          okg(sj.every((j) => j[2] != null && j[2] <= 150 && j[3] >= (nat ? -12 : -6) && j[4] >= 20), 'Sprung: the mode leads (+10 dB, a 43-ms window) within 150 ms of the move (Höhe arrives smoothed), the dip ≥ ' + (nat ? -12 : -6) + ' dB, 20 dB over the old mode at 2.3 s: ' + sj.map((j) => j[0] + '@' + j[1] + ' ' + j[2] + ' ms ' + j[3] + ' dB ' + j[4] + ' dB').join(', ')); }
        // Hitze colours the settled tone (h3 rises); Sprung 2's bias seeds even harmonics (the check)
        { const h3 = []; for (const h of [0, 0.5, 1]) { const sp = L.spectrum(mono(await play({ f: 220, y: 0.6, dur: 2.5, pp: { 'glt.hitze': h, 'glt.kasten': 1 } })), SR, 1.8, 16384); h3.push(+(L.harm(sp, 220, 3) - L.harm(sp, 220, 1)).toFixed(1)); }
          R_.hitze = h3; okg(h3[0] < h3[1] - 6 && h3[1] < h3[2] - 3 && h3[1] >= -35, `Hitze saturates: h3 at y 0.6 for Hitze 0/0.5/1 ${h3.join(' / ')} dB`);
          if (!nat) { const sp2 = L.spectrum(mono(await play({ f: 220, y: 0.6, dur: 2.5, pp: { 'glt.sprung': '2' } })), SR, 1.8, 16384), sp3 = L.spectrum(mono(await play({ f: 220, y: 0.6, dur: 2.5 })), SR, 1.8, 16384);
            const e2 = L.harm(sp2, 220, 2) - L.harm(sp2, 220, 1), e3 = L.harm(sp3, 220, 2) - L.harm(sp3, 220, 1); R_.even = [+e2.toFixed(1), +e3.toFixed(1)];
            okg(e2 >= -45 && e3 < -70, `Sprung 2 seeds even harmonics: h2 ${e2.toFixed(1)} dB (Sprung 3: ${e3.toFixed(1)})`); } }
        // level 3: two loops, uncorrelated sides, as loud as level 1 per side at pan 0 and ±0.4 (lesson 3) – the worklet
        if (!nat) { const r3 = []; let cc = 0;
          for (const pan of [0, -0.4, 0.4]) { let p1 = 0, p3 = 0; for (const f of [110, 330, 880]) { const a = await play({ f, y: 0.6, dur: 3, pan }), b = await play({ f, y: 0.6, dur: 3, pan, q: '3' }); for (const ch of ['L', 'R']) { p1 += L.rms(a[ch], 1.5 * SR, 3 * SR) ** 2; p3 += L.rms(b[ch], 1.5 * SR, 3 * SR) ** 2; } if (!pan) { let sx = 0, sl = 0, sr = 0; for (let i = 1.5 * SR; i < 3 * SR; i++) { sx += b.L[i] * b.R[i]; sl += b.L[i] ** 2; sr += b.R[i] ** 2; } cc = Math.max(cc, Math.abs(sx / Math.sqrt(sl * sr))); } } r3.push([pan, +(10 * Math.log10(p3 / p1)).toFixed(2)]); }
          R_.l3 = { perPan: r3, corr: +cc.toFixed(2) };
          okg(r3.every((r) => Math.abs(r[1]) <= 1.5) && cc < 0.5, 'level 3 vs 1 (both sides, 110/330/880 Hz): ' + r3.map((r) => 'pan ' + r[0] + ' ' + r[1] + ' dB').join(', ') + `; L/R correlation ≤ ${cc.toFixed(2)} (< 0.5)`); }
        // the native loop's price (cost.js, its context without the module) against its VCOST (the getter reads the context)
        if (nat) { const { execFileSync } = require('child_process');
          const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, { ENGS: 'gltN1,gltN3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
          const c1 = c.gltN1 * c.scale, c3 = c.gltN3 * c.scale, tab = await page.evaluate(async () => { const M = window.__M; await window.__ctx(0.2, {}, '1', true); return [M.VCOST1.glt, M.VCOST3.glt]; });
          R_.cost = { L1: +c1.toFixed(3), L3: +c3.toFixed(3), table: tab };
          console.log(`INFO glt native loop: cost level 1 ${c1.toFixed(3)}, level 3 ${c3.toFixed(3)} Nebel units (SPEC's estimate 0.35)`);
          costRow(okg, '(read without the module) ', tab, [c1, c3], { ENGS: 'gltN1,gltN3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }, (x) => [x.gltN1 * x.scale, x.gltN3 * x.scale]); }
        rep[nat ? 'native' : 'worklet'] = R_;
      }
      // native: the release ends the voice; a knob turned reaches a sounding native voice (v.upd)
    }
    if (key === 'elm') {
      // stages on their own (the voice's parts muted after it is built): hum, corona, arc
      const part = async (y, keep, extra = {}) => pull(await page.evaluate(async (o) => {
        const M = window.__M, ctx = await window.__ctx(o.dur, Object.assign({ 'v.eng': 'elm' }, o.params));
        ctx.suspend(19 / 375).then(() => {
          const v = window.__v = M.playNote('elm', ctx.currentTime, o.f, o.y, 0.75, {});
          if (!o.keep.includes('hum')) v.parts.hum.disconnect();
          for (const S of v.parts.sides) { if (!o.keep.includes('cor')) S.cg.disconnect(); if (S.arc && !o.keep.includes('arc')) S.arc.ag.disconnect(); }
          ctx.resume();
        });
        if (o.kill) ctx.suspend(Math.round(o.kill * 375) / 375).then(() => { for (const S of window.__v.parts.sides) { const g = S.pre.gain; g.cancelScheduledValues(0); g.value = 0; } ctx.resume(); });
        if (o.tick) for (let t = 0.1; t < o.dur - 0.2; t += 0.1) ctx.suspend(Math.round(t * 375) / 375).then(() => { M.elmTick(ctx.currentTime + 0.15); ctx.resume(); });
        return window.__ret(await ctx.startRendering());
      }, Object.assign({ f: 220, y, keep, dur: 2.5, params: DRY }, extra)));
      const events = (m, from) => { let n = 0, q = 1e9; const a = Math.floor(from * SR); for (let i = a; i < m.length; i++) { if (Math.abs(m[i]) > 1e-3) { if (q > 48) n++; q = 0; } else q++; } return n / ((m.length - a) / SR); };
      const ev = {}, lv = {};
      for (const y of [0, 0.5, 0.9]) {
        ev[y] = +events(mono(await part(y, ['cor'])), 0.5).toFixed(1);
        for (const k of ['hum', 'cor', 'arc']) lv[k + y] = +L.db(L.rms(mono(await part(y, [k])), 0.5 * SR, 2.4 * SR)).toFixed(1);
      }
      rep.corona = ev; rep.stages = lv;
      ok(lv.hum0 >= -30 && ev[0] < 5, `y 0: the hum ${lv.hum0} dBFS (≥ −30), crackle ${ev[0]} events/s (< 5)`);
      ok(ev[0.5] >= 50 && ev[0.5] <= 300, `y 0.5: corona ${ev[0.5]} events/s (50–300)`);
      ok(lv['arc0.9'] >= lv['hum0.9'] + 6 && lv['arc0.9'] >= lv['cor0.9'] + 6, `y 0.9: the arc leads (arc ${lv['arc0.9']}, hum ${lv['hum0.9']}, corona ${lv['cor0.9']} dBFS)`);
      // the arc as a tone on f·2^Reichweite and its steps: per 0.1-s window the share of its energy (200 Hz–12 kHz) on the
      // harmonics (±50 ct) of the step that fits best (a step's 3rd harmonic is another's fundamental: only a comb tells)
      const arcSteps = (m, t0, t1) => {
        const steps = [0, 700, 1200, -500, 1900], fits = [], hit = {};
        for (let t = t0; t < t1; t += 0.1) {
          const sp = L.spectrum(m, SR, t, 8192); let tot = 0; for (let k = Math.round(200 / sp.hz); k < Math.round(12000 / sp.hz); k++) tot += sp.p[k];
          let best = 0, bs = 0;
          for (const s0 of steps) { const fs = 880 * Math.pow(2, s0 / 1200); let e = 0; for (let h = 1; fs * h < 12000; h++) { const a = Math.round(fs * h * Math.pow(2, -50 / 1200) / sp.hz), b = Math.round(fs * h * Math.pow(2, 50 / 1200) / sp.hz); for (let k = a; k <= b; k++) e += sp.p[k]; } if (e / tot > best) { best = e / tot; bs = s0; } }
          fits.push(best); hit[bs] = (hit[bs] || 0) + 1;
        }
        return { share: fits.reduce((a, b) => a + b, 0) / fits.length, hit };
      };
      { const a = arcSteps(mono(await part(0.9, ['arc'], { dur: 3 })), 0.5, 2.8), mf = a.share, hit = a.hit; rep.arcTone = { share: +mf.toFixed(2), steps: hit };
        ok(mf >= 0.5, `the arc is a tone on f·2^Reichweite and its steps: ${(mf * 100).toFixed(0)} % of its energy on the harmonics of a step (${JSON.stringify(hit)})`); }
      { const m = mono(await part(0.9, ['arc', 'cor', 'hum'], { kill: 0.6, dur: 2 })); const a = L.db(L.rms(m, 0.3 * SR, 0.55 * SR)), b = L.db(L.rms(m, 1.0 * SR, 1.9 * SR));
        const ma = mono(await part(0.9, ['arc'], { kill: 0.6, dur: 2 })), c = L.db(L.rms(ma, 1.0 * SR, 1.9 * SR));
        rep.noCrackle = [+a.toFixed(1), +b.toFixed(1), +c.toFixed(1)];
        ok(c < -70, `no crackle, no arc: the corona stopped at 0.6 s → the arc ${c.toFixed(1)} dBFS (whole voice ${a.toFixed(1)} → ${b.toFixed(1)}, the hum stays)`); }
      { const r = await page.evaluate(() => { const d = window.__M.ELM.loops().steps, x = d.getChannelData(0); let n = 0; for (let i = 1; i < x.length; i++) if (x[i] !== x[i - 1]) n++; return n / d.duration; });   // the shared step loop
        const seen = Object.keys(arcSteps(mono(await part(0.9, ['arc'], { dur: 8 })), 0.3, 7.7).hit).map(Number);
        rep.jumps = { perS: +(r * 1.1).toFixed(2), steps: seen.sort((a, b) => a - b) };
        ok(r * 1.1 <= 3 && seen.length >= 2, `held arc: ≤ ${(r * 1.1).toFixed(2)} jumps/s (the loop's steps at the fastest speed, ≤ 3), heard on ${seen.length} steps in 7 s (${rep.jumps.steps.join(', ')} ct)`); }
      { const zap = async () => mono(pull(await page.evaluate(async (dry) => { const M = window.__M, ctx = await window.__ctx(1, Object.assign({ 'v.eng': 'elm' }, dry)); ctx.suspend(0.1).then(() => { M.hit('elm', ctx.currentTime, 220, 0.5, 0.8, { gate: 0.112 }); ctx.resume(); }); return window.__ret(await ctx.startRendering()); }, DRY)));   // (dry: a chorus would fill in after 15 ms)
        const a = await zap(), b = await zap(), e = L.env(a, SR, 0.002), on = Math.round(0.1 / 0.002); let mx = on; for (let i = on; i < on + 100; i++) if (e[i] > e[mx]) mx = i;
        let pk = on; while (L.db(e[pk]) < L.db(e[mx]) - 3) pk++;   // the attack: within 3 dB of the strongest moment
        const t30 = (() => { for (let i = mx; i < e.length; i++) if (L.db(e[i]) < L.db(e[mx]) - 30) return (i - on) * 2; return Infinity; })();
        let ab = 0, aa = 0, bb = 0; for (let i = 0.1 * SR; i < 0.2 * SR; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } const cor = ab / Math.sqrt(aa * bb);   // (the flare's first 100 ms)
        rep.zap = { peakMs: (pk - on) * 2, t30ms: t30, corr: +cor.toFixed(2) };
        ok((pk - on) * 2 <= 10 && t30 <= 400, `the zap: within 3 dB of its peak after ${(pk - on) * 2} ms (≤ 10; the strongest moment at ${(mx - on) * 2} ms), −30 dB after ${t30} ms (≤ 400)`);
        ok(cor < 0.9, `two zaps differ (correlation ${cor.toFixed(2)})`); }
      { const m = mono(await part(0.9, ['hum', 'cor', 'arc'], { dur: 3 })); rep.dc = +L.mean(m, 0.3 * SR).toFixed(5); ok(Math.abs(rep.dc) < 0.005, `DC ${rep.dc} (< 0.005) with the whole voice at y 0.9`); }
    }
    if (key === 'jrg') {
      const hit1 = async (f, y, params, at = 0.05) => mono(await one(page, { eng: 'jrg', f, y, dur: 2, params: Object.assign({}, DRY, { 'jrg.jahreszeit': 'sommer' }, params || {}) }));
      const r2 = Math.sqrt(2.7565 * 3.932);   // mode 2 at Schnitt 0.5
      // (four hits each, powers averaged: the mallet's noise burst varies every hit by a few dB)
      const lvl = {}; for (const y of [0, 0.55]) { const acc = [0, 0]; for (let i = 0; i < 4; i++) { const sp = L.spectrum(await hit1(220, y), SR, 0.06, 16384); acc[0] += Math.pow(10, L.harm(sp, 220, 1) / 10); acc[1] += Math.pow(10, L.harm(sp, 220 * r2, 1) / 10); } lvl[y] = acc.map((a) => 10 * Math.log10(a / 4)); }
      rep.node = lvl;
      ok(lvl[0.55][0] - lvl[0][0] <= -20, `the nodal line (y 0.55): fundamental ${(lvl[0.55][0] - lvl[0][0]).toFixed(1)} dB vs the centre (≤ −20)`);
      ok(lvl[0.55][1] >= lvl[0][1] + 6, `…while mode 2 rises ${(lvl[0.55][1] - lvl[0][1]).toFixed(1)} dB above its level at the centre (≥ +6)`);
      const f1 = async (season, age, ratio = 1) => peakHz(mono(await one(page, { eng: 'jrg', f: 220, y: 0.3, dur: 2, params: Object.assign({}, DRY, { 'jrg.jahreszeit': season }), age })), SR, 220 * ratio, 0.15, 16384);
      const so = await f1('sommer', 0), wi = await f1('winter', 0), wi2 = await f1('winter', 0, r2 * 1.02), so2 = await f1('sommer', 0, r2);
      rep.winter = [+L.cents(wi, so).toFixed(2), +L.cents(wi2, so2).toFixed(1)];
      ok(Math.abs(L.cents(wi, so)) <= 1 && Math.abs(L.cents(wi2, so2) - 34) <= 6, `winter: the fundamental stays (${L.cents(wi, so).toFixed(2)} ct), mode 2 goes up ${L.cents(wi2, so2).toFixed(1)} ct (2 % ≈ 34)`);
      const ag = []; for (const n of [600, 1e6]) ag.push(+L.cents(await f1('sommer', n), so).toFixed(2));
      rep.age = ag;
      ok(Math.abs(ag[0] + 6 * (1 - Math.exp(-1))) <= 0.6 && ag[1] >= -6.5 && ag[1] <= -5.4, `age: 600 hits → ${ag[0]} ct (−3.8), any number → ${ag[1]} ct (never past −6)`);
      const rl = await page.evaluate(async () => { const M = window.__M; await window.__ctx(1, { 'v.eng': 'jrg' }); M.A.jrgAge = 0; const s0 = Math.floor(performance.now() / 1000); while (Math.floor(performance.now() / 1000) === s0) await new Promise((r) => setTimeout(r, 1)); for (let i = 0; i < 20; i++) M.playNote('jrg', 0.05, 220, 0.3, 0.7, {}); return M.A.jrgAge; });
      ok(rl <= 2, `20 hits in one moment age the bar by ${rl} (≤ 2 a second)`);
      { const sp = await one(page, { eng: 'jrg', f: 880, y: 0.3, dur: 1, params: Object.assign({}, DRY, { 'jrg.jahreszeit': 'fruehling' }) }); const m = mono(sp);
        const early = peakHz(m, SR, 880 * Math.pow(2, 20 / 1200), 0.052, 2048), late = peakHz(m, SR, 880, 0.3, 8192); rep.spring = [+L.cents(early, 880).toFixed(1), +L.cents(late, 880).toFixed(1)];
        ok(L.cents(early, 880) >= 8 && Math.abs(L.cents(late, 880)) <= 3, `spring: the pitch starts high (${L.cents(early, 880).toFixed(1)} ct in the first 40 ms) and settles (${L.cents(late, 880).toFixed(1)} ct)`); }
      { const band = (m, a, b, N = 512, pk = false) => { let s = 0, n = 0, mx = 0; for (let t = a; t < b; t += N / 2 / SR) { const sp = L.spectrum(m, SR, t, N); let e = 0; for (let k = Math.round(3000 / sp.hz); k < Math.round(7000 / sp.hz); k++) { e += sp.p[k]; n++; } s += e; mx = Math.max(mx, e); } return 10 * Math.log10((pk ? mx : s / n) + 1e-30); };
        const au0 = await hit1(330, 0.3, { 'jrg.laub': 0, 'jrg.jahreszeit': 'herbst' }), au = await hit1(330, 0.3, { 'jrg.laub': 1, 'jrg.jahreszeit': 'herbst' });
        const wi0 = await hit1(165, 0.3, { 'jrg.laub': 0, 'jrg.jahreszeit': 'winter' }), wi = await hit1(165, 0.3, { 'jrg.laub': 1, 'jrg.jahreszeit': 'winter' });   // (165 Hz: its 4th mode stays under the band)
        const la = band(au, 0.06, 0.3) - band(au0, 0.06, 0.3), ic = band(wi, 0.073, 0.115, 128, true) - band(wi0, 0.073, 0.115, 128, true);   // (the hit at 0.05 s: its own knock stays outside) rep.seasons = { leaves: +la.toFixed(1), ice: +ic.toFixed(1) };
        ok(la >= 6, `autumn: leaves rustle after the knock (3–7 kHz, 60–300 ms: +${la.toFixed(1)} dB with Laub 1 vs 0)`);
        ok(ic >= 3, `winter: an ice crack 25–60 ms after the knock (3–7 kHz, strongest 2.7-ms moment 23–65 ms after the hit: +${ic.toFixed(1)} dB with Laub 1 vs 0)`); }
    }
    if (key === 'khl') {
      const K = (f, y, prm, o = {}) => one(page, Object.assign({ eng: 'khl', f, y, dur: o.dur || 1.2, params: Object.assign({}, DRY, { 'khl.silbe': 'aus', 'khl.rauheit': 0 }, prm || {}) }, o)).then(mono);
      const T0 = 19 / 375, lv = (m, a, b) => L.db(L.rms(m, Math.round((T0 + a) * SR), Math.round((T0 + b) * SR)));
      const bpf = (x, f) => { const w = 2 * Math.PI * f / SR, al = Math.sin(w) / 2, a0 = 1 + al, b0 = al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
      const zc = (x0, a, b, f) => { const x = bpf(x0, f); a = Math.round((T0 + a) * SR); b = Math.round((T0 + b) * SR); const c = []; let l = x[a]; for (let i = a + 1; i < b; i++) { if (l < 0 && x[i] >= 0) c.push(i - x[i] / (x[i] - l)); l = x[i]; } return c.length > 2 ? SR * (c.length - 1) / (c[c.length - 1] - c[0]) : 0; };
      // Höhe is the pressure: past the rest opening the labia shut for part of each cycle – more partials higher up
      { const pa = []; for (const y of [0.35, 0.65, 1]) { const sp = L.spectrum(await K(220, y), SR, 0.6, 16384), h1 = L.harm(sp, 220, 1); pa.push(10 * Math.log10([2, 3, 4, 5].reduce((a, k) => a + Math.pow(10, (L.harm(sp, 220 * k, 1) - h1) / 10), 0))); }
        rep.partials = pa.map((v) => +v.toFixed(1)); ok(pa[0] < pa[1] && pa[1] < pa[2] && pa[2] - pa[0] >= 15, `partials rise with the pressure: h2–h5 vs the fundamental ${pa.map((v) => v.toFixed(1)).join(' → ')} dB at y 0.35/0.65/1 (≥ 15 dB from bottom to top)`); }
      // the threshold: below it air, above it the labia sing (SPEC: B = −0.3 + 1.6 y, at y ≈ 0.19)
      for (const f of [440, 2000]) { const a = lv(await K(f, 0.1), 0.6, 1.1), b = lv(await K(f, 0.3), 0.6, 1.1), c = lv(await K(f, 0), 0.6, 1.1), d = lv(await K(f, 0.6), 0.6, 1.1);
        rep['thr' + f] = [+a.toFixed(1), +b.toFixed(1), +(c - d).toFixed(1)];
        ok(b - a >= 20, `threshold between y 0.1 and 0.3 at ${f} Hz: ${a.toFixed(1)} → ${b.toFixed(1)} dB (jump ≥ 20 dB)`);
        ok(c - d >= -40 && c - d <= -18, `air at y 0, ${f} Hz: ${(c - d).toFixed(1)} dB vs the tone at y 0.6 (−40…−18: a breath)`); }
      // onsets: the labia's own speed (Anstieg 0) – a chip within 1–64 ms (SPEC)
      { const row = []; for (const f of [500, 2000]) for (const y of [0.3, 0.5, 1]) { const m = await K(f, y, { 'khl.anstieg': 0 }, { dur: 0.8 }); const ref = L.rms(m, Math.round(0.5 * SR), Math.round(0.75 * SR)); row.push(+(L.t90(m, SR, T0, ref) * 1000).toFixed(0)); }
        rep.onset = row; ok(row.every((t) => t >= 1 && t <= 64), `onsets t90 at 500/2000 Hz, y 0.3/0.5/1: ${row.join(', ')} ms (1–64)`); }
      // Chip: an upward flick into the note – the first milliseconds below it, then on it
      { const m = await K(2000, 0.6, { 'khl.silbe': 'chip' }, { dur: 0.6 }); const a = L.cents(zc(m, 0.006, 0.014, 2000), 2000), b = L.cents(zc(m, 0.06, 0.1, 2000), 2000), c = L.cents(zc(m, 0.2, 0.4, 2000), 2000);
        rep.chip = [+a.toFixed(0), +b.toFixed(1), +c.toFixed(1)];
        ok(a <= -40 && Math.abs(b) <= 25 && Math.abs(c) <= 5, `Chip: ${a.toFixed(0)} ct at 6–14 ms (≤ −40), ${b.toFixed(1)} ct at 60–100 ms, ${c.toFixed(1)} ct after (≤ 5)`); }
      // Triller: pressure pulses, 13–25 syllables a second, a deep swing
      { const res = []; for (const y of [0.4, 0.9]) { const m = await K(2500, y, { 'khl.silbe': 'triller' }, { dur: 2 }); const e = L.env(m.subarray(Math.round((T0 + 0.4) * SR), Math.round((T0 + 1.8) * SR)), SR, 0.004).map((v) => L.db(v)); const mx = Math.max(...e), mn = Math.min(...e), mid = (mx + mn) / 2; let cr = 0; for (let i = 1; i < e.length; i++) if (e[i - 1] < mid && e[i] >= mid) cr++; res.push([+(cr / 1.4).toFixed(1), +(mx - mn).toFixed(1)]); }
        rep.trill = res; ok(res.every(([r, d]) => r >= 12 && r <= 26 && d >= 15), `Triller: y 0.4 ${res[0][0]}/s, swing ${res[0][1]} dB; y 0.9 ${res[1][0]}/s, ${res[1][1]} dB (13–25 a second, ≥ 15 dB)`); }
      // Ruf: a down-slurred call, again and again while held
      { const m = await K(1500, 0.6, { 'khl.silbe': 'ruf' }, { dur: 4.2 }); const e = L.env(m.subarray(Math.round((T0 + 0.2) * SR)), SR, 0.01).map((v) => L.db(v)); const mx = Math.max(...e); let g = 0, inG = false; for (const v of e) { if (v < mx - 12 && !inG) { g++; inG = true; } else if (v >= mx - 6) inG = false; }
        const s0 = L.cents(zc(m, 0.008, 0.03, 1500), 1500); rep.call = [g, +s0.toFixed(0)];
        ok(g >= 3 && s0 >= 150, `Ruf: ${g} calls after the first in 4 s (≥ 3), each slurred down from ${s0.toFixed(0)} ct (≥ 150)`); }
      // Rauheit: at the top every other cycle (f/2, 3f/2); none without it
      { const sub = async (rr, q) => { const m = mono(await one(page, { eng: 'khl', f: 440, y: 1, dur: 1.2, q, params: Object.assign({}, DRY, { 'khl.silbe': 'aus', 'khl.rauheit': rr }) })); const sp = L.spectrum(m, SR, 0.6, 16384), h1 = L.harm(sp, 440, 1); return Math.max(L.harm(sp, 220, 1), L.harm(sp, 660, 1)) - h1; };
        const r0 = await sub(0, '1'), r1 = await sub(1, '1'), r3 = await sub(1, '3'), m3 = await sub(0.3, '3'); rep.rough = [+r0.toFixed(1), +r1.toFixed(1), +r3.toFixed(1), +m3.toFixed(1)];
        ok(r0 <= -45 && r1 >= -30 && r3 >= -30, `Rauheit at the top: the subharmonics (f/2, 3f/2) ${r0.toFixed(1)} dB at 0 (≤ −45), ${r1.toFixed(1)} at 1 (≥ −30), level 3 with the pair ${r3.toFixed(1)} (≥ −30); default at level 3 ${m3.toFixed(1)} dB`); }
      // level 3: two sides of the throat – left and right not the same (the pair a few cents apart)
      { const x = await one(page, { eng: 'khl', f: 880, y: 0.6, dur: 1.5, q: '3', params: Object.assign({}, DRY, { 'khl.silbe': 'aus' }) }); let lr = 0, ll = 0, rr = 0; for (let i = Math.round(0.5 * SR); i < Math.round(1.4 * SR); i++) { lr += x.L[i] * x.R[i]; ll += x.L[i] * x.L[i]; rr += x.R[i] * x.R[i]; } const c = lr / Math.sqrt(ll * rr);
        rep.pairCorr = +c.toFixed(2); ok(c < 0.97 && c > 0.2, `level 3: two sides, L/R correlation ${c.toFixed(2)} (between 0.2 and 0.97)`); }
      // let go: the pressure falls, the labia stop within milliseconds
      { const m = await K(880, 0.6, {}, { dur: 1.2, rel: 0.6 }); const a = lv(m, 0.3, 0.5), b = lv(m, 0.62, 0.72); rep.stop = +(b - a).toFixed(1); ok(b - a <= -60, `let go: ${(b - a).toFixed(1)} dB 20–120 ms after the release (≤ −60)`); }
    }
    if (key === 'rhz') {
      // the net without sound: strikes in one offline context (a cascade is laid out at once there), the net cleared
      // before each; mpent over three octaves (16 nodes), the struck node 7 (the middle octave's third degree)
      const nets = (o) => page.evaluate(async (o) => {
        const M = window.__M, ctx = await window.__off(48000, 0.1, Object.assign({ 'v.eng': 'rhz', 't.scale': 'mpent', 't.range': 3, 't.root': 9, 't.oct': 2 }, o.params || {})); M.getQ().budget = 1e4;
        const out = [];
        M.RHZ.step = o.second != null;   // (two strikes: the clock run by hand, so the second meets the net as it is then)
        for (let r = 0; r < (o.n || 150); r++) {
          M.rhzClear(); M.RHZ.h = 0;
          const a = M.playNote('rhz', 0, M.N.notes[o.i || 7].f, o.y, o.vel || 0.75, o.lane ? { bus: M.stripIn('l0') } : {});
          let b = null;
          if (o.second != null) { M.rhzRun(o.second); b = M.playNote('rhz', o.second, M.N.notes[o.i2 != null ? o.i2 : o.i || 7].f, o.y2 != null ? o.y2 : o.y, 0.75, {}); }
          M.rhzRun(Infinity);
          const row = { n: a.rz.fired, life: a.endAt, log: Array.from(a.rz.log), i0: a.rz.i0 };
          if (b) { row.n2 = b.rz.fired; row.first2 = b.rz.log[1]; row.i02 = b.rz.i0; }
          out.push(row);
        }
        M.RHZ.step = false;
        return out;
      }, o);
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, pc = (a, f) => Math.round(100 * a.filter(f).length / a.length);
      const sz = {}; for (const y of [0, 0.5, 1]) sz[y] = (await nets({ y })).map((r) => r.n);
      rep.sizes = Object.fromEntries(Object.entries(sz).map(([y, a]) => [y, { mean: +mean(a).toFixed(1), single: pc(a, (x) => x === 1), mid: pc(a, (x) => x >= 4 && x <= 8), big: pc(a, (x) => x >= 9), whole: pc(a, (x) => x >= 16) }]));
      const S = rep.sizes;
      ok(S[0].mean <= 2.6 && S[0].single >= 40, `y 0: a tired net – mean size ${S[0].mean} (≤ 2.6), ${S[0].single} % single strikes (≥ 40)`);
      ok(S[0.5].mean >= 4 && S[0.5].mean <= 8 && S[0.5].single >= 5 && S[0.5].mid >= 25 && S[0.5].big >= 10, `y 0.5: every size – mean ${S[0.5].mean} (4–8), single ${S[0.5].single} % (≥ 5), 4–8 nodes ${S[0.5].mid} % (≥ 25), 9 or more ${S[0.5].big} % (≥ 10)`);
      ok(S[1].mean >= 9 && S[1].whole >= 8, `y 1: a rolling wave – mean ${S[1].mean} (≥ 9), the whole field (16 or more) ${S[1].whole} % (≥ 8)`);
      { const z = (await nets({ y: 1, n: 60, params: { 'rhz.reiz': 0 } })).map((r) => r.n), hi = await nets({ y: 1, n: 60, params: { 'rhz.reiz': 1, 'rhz.erholung': 0.1 } });
        const mx = Math.max(...hi.map((r) => r.n)), span = Math.max(...hi.map((r) => r.log[r.log.length - 2] - r.log[0]));
        rep.caps = { reiz0: Math.max(...z), max: mx, span: +span.toFixed(2) };
        ok(Math.max(...z) === 1, 'Reiz 0: the strike pings alone, every time');
        ok(mx <= 40 && span <= 2.5, `Reiz 1, Erholung 0.1, y 1 (the net fires again and again): capped – at most ${mx} firings (≤ 40) within ${span.toFixed(2)} s (≤ 2.5)`); }
      { const r = await nets({ y: 0.5, n: 300 }), steps = r.filter((x) => x.log.length >= 4).map((x) => Math.abs(x.log[3] - x.i0));
        rep.steps = { near: pc(steps, (d) => d <= 2), n: steps.length };
        ok(pc(steps, (d) => d <= 2) >= 85, `the first answer is a neighbour on the scale (±1 or ±2) in ${pc(steps, (d) => d <= 2)} % (≥ 85; else an octave or a fifth)`); }
      // exhaustion: the same node struck twice, 0.3 s apart – the second strike pings, its cascade finds the net tired
      // (600 pairs: a rolling wave's size scatters so much that 120 pairs put the rested ratio anywhere in 0.55–0.79 –
      // 1200 pairs, four times: 0.64–0.69; at 0.3 s the first wave still runs, re-firing every 0.1 s, so the second strike
      // meets it: Erholung 0.1 lets it spread at least twice as far as the tired net – its real 0.68 against 0.29 –, not
      // to 70 % of a fresh strike, which the 120-pair sample had passed by chance)
      { const ex = await nets({ y: 0.75, n: 600, second: 0.3 }), rc = await nets({ y: 0.75, n: 600, second: 0.3, params: { 'rhz.erholung': 0.1 } });
        const a = mean(ex.map((r) => r.n)), b = mean(ex.map((r) => r.n2)), c = mean(rc.map((r) => r.n)), d = mean(rc.map((r) => r.n2));
        rep.tired = { first: +a.toFixed(1), second: +b.toFixed(1), rested: [+c.toFixed(1), +d.toFixed(1)] };
        ok(ex.every((r) => r.n2 >= 1 && r.first2 === r.i02), 'a strike on a resting node still pings (always)');
        ok(b <= 0.6 * a && d / c >= 2 * (b / a), `exhaustion: 0.3 s after a cascade the same strike spreads to ${b.toFixed(1)} nodes vs ${a.toFixed(1)} (${Math.round(100 * b / a)} %, ≤ 60 %); with Erholung 0.1 s to ${d.toFixed(1)} vs ${c.toFixed(1)} (${Math.round(100 * d / c)} %, at least twice the tired net's share)`); }
      // one net for all: a lane's strike (its own channel) tires the finger's neighbour
      { const lane = await nets({ y: 1, n: 120, lane: true, second: 0.15, i2: 8 }), solo = await nets({ y: 1, n: 120, i: 8 });
        const a = mean(lane.map((r) => r.n2)), b = mean(solo.map((r) => r.n));
        rep.shared = [+a.toFixed(1), +b.toFixed(1)];
        ok(a <= 0.6 * b, `one net: 0.15 s after a lane's strike a finger's cascade next to it spreads to ${a.toFixed(1)} nodes vs ${b.toFixed(1)} alone (≤ 60 %)`); }
      // a free field: each strike its own small net
      { const fr = await nets({ y: 1, n: 60, params: { 't.scale': 'free' } }); rep.free = +mean(fr.map((r) => r.n)).toFixed(1);
        ok(mean(fr.map((r) => r.n)) >= 4, `Stufenlos: each strike runs a net of its own (mean ${rep.free} nodes at y 1)`); }
      // the voice ends with its cascade: the last ping's ring (−60 dB) after the last firing, nothing more
      { const r = await nets({ y: 0.75, n: 80 }), tau = 0.12 * 1.6 * 6.91, over = r.map((x) => x.life - x.log[x.log.length - 2]);
        rep.tail = +Math.max(...over).toFixed(2);
        ok(Math.max(...over) <= tau + 0.1 && Math.min(...over) > 0.1, `the voice ends ${Math.min(...over).toFixed(2)}–${Math.max(...over).toFixed(2)} s after its last firing (the ping's ring, ≤ ${(tau + 0.1).toFixed(2)})`); }
      // Stille: everything underway dropped, the net rested, the voices out
      { const r = await page.evaluate(async () => {
          const M = window.__M, ctx = await window.__off(48000, 3, { 'v.eng': 'rhz', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0, 'rhz.reiz': 1, 'rhz.weg': 120 }); M.getQ().budget = 1e4;
          let q = -1, rest = -1, alive = -1;
          ctx.suspend(0.1).then(() => { for (const x of [0.2, 0.5, 0.8]) M.playNote('rhz', ctx.currentTime, M.noteAt(x).f, 1, 0.8, {}); ctx.resume(); });
          // (offline the cascades are laid out at once: Stille at 0.6 s cuts what is scheduled after it)
          ctx.suspend(0.6).then(() => { M.panic(); q = M.RHZ.q.length; rest = M.RHZ.sp ? Math.max(...M.RHZ.sp.refr) : 0; ctx.resume(); });
          ctx.suspend(0.8).then(() => { alive = Array.from(M.A.voices).filter((v) => v.eng === 'rhz' && v.endAt > ctx.currentTime).length; ctx.resume(); });
          const b = await ctx.startRendering(); return { x: window.__b64(b.getChannelData(0)), q, rest, alive };
        });
        const x = new Float32Array(Buffer.from(r.x, 'base64').buffer.slice(0)), after = L.db(L.rms(x, Math.round(0.75 * SR), Math.round(2.9 * SR)));
        rep.panic = { q: r.q, rest: r.rest, alive: r.alive, after: +after.toFixed(1) };
        ok(r.q === 0 && r.rest === 0 && r.alive === 0 && after < -80, `Stille: no charge underway, the net rested, no voice left (${r.alive}), ${after.toFixed(1)} dB after 0.15 s`); }
      // level 3: the cascade runs across the stereo field with the pitch
      { const pan = await page.evaluate(async () => {
          const M = window.__M, res = [];
          for (const x of [0.03, 0.97]) {
            const ctx = await window.__ctx(1.2, { 'v.eng': 'rhz', 'rev.mix': 0, 'dly.mix': 0, 'cho.mix': 0, 'pha.mix': 0, 'mst.comp': 0, 'rhz.reiz': 0 }, '3');
            M.playNote('rhz', 0.05, M.noteAt(x).f, 0.5, 0.75, {});   // (Reiz 0: the struck ping alone, placed by its pitch)
            const b = await ctx.startRendering(); const l = b.getChannelData(0), r = b.getChannelData(1); let a = 0, c = 0; for (let i = 0; i < l.length; i++) { a += l[i] * l[i]; c += r[i] * r[i]; } res.push(10 * Math.log10(c / a));
          }
          return res;
        });
        rep.pan = pan.map((v) => +v.toFixed(1));
        ok(pan[0] <= -3 && pan[1] >= 3, `level 3: low pings sound left (R − L ${pan[0].toFixed(1)} dB), high ones right (${pan[1].toFixed(1)} dB; ≥ 3 each)`); }
      // the three bodies at the same loudness (the standard phrase, level 1)
      { const lv = {}; for (const kn of ['holz', 'metall', 'glas']) lv[kn] = stats(pull(await page.evaluate(async (kn) => window.__ret(await window.__phr(await window.__ctx(10, { 'v.eng': 'rhz', 'rhz.knoten': kn, 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }), 10, 'rhz')), kn)));
        rep.bodies = lv; const r = Object.values(lv).map((x) => x.rms);
        ok(Math.max(...r) - Math.min(...r) <= 2.5 && Object.values(lv).every((x) => x.peak <= -1), `Holz, Metall, Glas: phrase RMS ${Object.entries(lv).map(([k, x]) => k + ' ' + x.rms).join(', ')} (within 2.5 dB), peaks ${Object.values(lv).map((x) => x.peak).join(', ')} (≤ −1)`); }
      { const r = await page.evaluate(() => ({ rg: window.__M.RG_S.some((x) => x[0] === 'rhz') })); ok(r.rg, 'Sporenregen strikes it (RG_S derived: struck, regen ≠ 0)'); }
    }
    if (key === 'zpf') {
      const BODIES = ['zapfen', 'holz', 'panzer', 'kuerbis', 'fels'];
      const P_ = (b, x) => Object.assign({}, DRY, { 'zpf.koerper': b }, x || {});
      const chan = (x, a, b) => 10 * Math.log10((Math.pow(L.rms(x.L, Math.round(a * SR), Math.round(b * SR)), 2) + Math.pow(L.rms(x.R, Math.round(a * SR), Math.round(b * SR)), 2)) / 2 + 1e-20);
      // y 1 with Rast: the note itself, every body, 55–1760 Hz – the fundamental's line (teeth on whole samples would
      // jitter the period by ±18–35 ct at 1–2 kHz, the check)
      const top = {};
      for (const b of BODIES) { top[b] = []; for (const f of [55, 110, 220, 440, 880, 1760]) { const m = mono(await one(page, { eng: key, f, y: 1, dur: 1.8, params: P_(b) })); top[b].push(+L.cents(Z.peakHz(m, SR, f, 1.0, 32768), f).toFixed(2)); } }
      rep.top = top;
      ok(BODIES.every((b) => top[b].every((c) => Math.abs(c) <= 5)), 'y 1 with Rast: the note within ±5 ct, every body, 55–1760 Hz (ct): ' + BODIES.map((b) => b + ' ' + top[b].join('/')).join(', '));
      // the ladder below: at the middle of each step the lowest line is f/2ⁿ (f/8, f/4, f/2 at 880 Hz)
      { const lad = [], f = 880, oc = Math.log2(f / 3);
        for (const n of [1, 2, 3]) { const y = 1 - n / oc, m = mono(await one(page, { eng: key, f, y, dur: 1.8, params: P_('zapfen') })); lad.push([n, +y.toFixed(3), +L.cents(Z.peakHz(m, SR, f / Math.pow(2, n), 1.0, 32768), f / Math.pow(2, n)).toFixed(2)]); }
        rep.ladder = lad; ok(lad.every((l) => Math.abs(l[2]) <= 5), 'Rast ladder at 880 Hz: the rate on f/2ⁿ within ±5 ct (n/y/ct): ' + lad.map((l) => l.join('/')).join(', ')); }
      // the scales are irregular: the top tone's sideband floor (the power between the harmonics re their lines) – and a
      // strictly periodic tooth train through the same measure
      { const fl = {}, pure = (() => { const f = 220, n = 3 * SR, x = new Float32Array(n); for (let k = 1; k * f < 20000; k++) for (let i = 0; i < n; i++) x[i] += Math.cos(2 * Math.PI * k * f * i / SR) / 40; return Z.floor(x, SR, f, 1.0); })();
        for (const b of ['zapfen', 'fels']) for (const f of [110, 220, 440, 880]) { const m = mono(await one(page, { eng: key, f, y: 1, dur: 2, params: P_(b) })); fl[b + '@' + f] = +Z.floor(m, SR, f, 1.0).toFixed(1); }
        { const m = mono(await one(page, { eng: key, f: 220, y: 1, dur: 2, params: P_('zapfen', { 'zpf.schuppen': 0 }) })); fl['schuppen0@220'] = +Z.floor(m, SR, 220, 1.0).toFixed(1); }
        rep.floor = fl; rep.floorPure = +pure.toFixed(1);
        ok(Object.entries(fl).every(([k, v]) => k.startsWith('schuppen0') || v >= -35), `the top's sideband floor ≥ −35 dB (irregular scales; a strictly periodic train: ${pure.toFixed(1)} dB): ` + JSON.stringify(fl)); }
      // low on the field: 3–10 ticks per second at every pitch (the stone: creaks), every body
      const tk = {};
      for (const b of BODIES) { tk[b] = []; for (const f of [55, 110, 220, 440, 880]) { const m = mono(await one(page, { eng: key, f, y: 0.2, dur: 3, params: P_(b) })); tk[b].push(+Z.ticks(m, SR, 0.3, 2.9, null, b === 'fels' ? 40 : 25).toFixed(1)); } }   // (a refractory of 25 ms: a tooth's click and its noise are one tick)
      rep.ticks02 = tk;
      ok(BODIES.every((b) => tk[b].every((r) => r >= 3 && r <= 10)), 'y 0.2: 3–10 ticks per second at 55–880 Hz, every body (the stone: creaks): ' + BODIES.map((b) => b + ' ' + tk[b].join('/')).join(', '));
      // the first tooth at once (a lane's short hit low on the field is never empty; the stone slips at once)
      { const o0 = []; for (const b of ['zapfen', 'fels']) { const m = mono(await one(page, { eng: key, f: 220, y: 0, dur: 0.5, params: P_(b) })); o0.push(+L.db(L.rms(m, Math.round(0.05 * SR), Math.round(0.08 * SR))).toFixed(1)); }
        rep.onset = o0; ok(o0.every((d) => d > -40), `y 0: the stick sets on with a tooth at once (first 30 ms ${o0.join(' / ')} dBFS, Zapfen / Fels)`); }
      // Rast steps: Höhe 0.3 → 1 in 7 s – the largest 10-ms moment within 150 ms of each step vs the running RMS (the
      // 250 ms before it); the same measure away from the steps for comparison (a tick train has its own crest)
      { const rs = {};
        for (const f of [220, 880]) {
          const moves = [], ys = []; for (let i = 0; i <= 140; i++) { const y = 0.3 + 0.7 * i / 140; moves.push([0.5 + i * 0.05, 'setY', y]); }
          for (let t = 0; t < 8; t += 0.005) ys.push(t < 0.5 ? 0.3 : Math.min(1, 0.3 + 0.7 * Math.floor((t - 0.5) / 0.05) / 140));
          const m = mono(await one(page, { eng: key, f, y: 0.3, dur: 8, params: P_('zapfen'), moves })), e = L.env(m, SR, 0.01);
          const steps = Z.rastSteps(f, ys, 0.005), run = (t) => L.rms(m, Math.round((t - 0.27) * SR), Math.round((t - 0.02) * SR));
          const pk = (t) => { let x = 0; for (let i = Math.round((t - 0.02) / 0.01); i < Math.round((t + 0.15) / 0.01); i++) x = Math.max(x, e[i] || 0); return x; };
          const at = steps.filter((s) => s[0] > 0.8 && s[0] < 7.7).map((s) => [+s[0].toFixed(2), s[1] + '→' + s[2], +(L.db(pk(s[0])) - L.db(run(s[0]))).toFixed(1)]);
          const away = []; for (let t = 0.9; t < 7.6; t += 0.17) if (steps.every((s) => Math.abs(s[0] - t) > 0.3)) away.push(L.db(pk(t)) - L.db(run(t)));
          rs[f] = { steps: at, steadyMax: +Math.max(...away).toFixed(1) };
          if (f === 220) { L.wav(path.join(dir, 'rast-sweep.wav'), m, m, SR); rep.pngRast = L.spectro(path.join(dir, 'rast-sweep.wav')); }
        }
        rep.rast = rs;
        // (a step between two tick trains – f/16, f/8 at 220 Hz: 14 and 28 a second – has the trains' own crest: there it
        // must stay within the largest such moment away from the steps)
        ok(Object.values(rs).every((r) => r.steps.length >= 3 && r.steps.every((s) => s[2] <= 6 || s[2] <= r.steadyMax + 1)), 'Rast steps: no 10-ms peak > 6 dB above the running RMS (between tick trains: none above their own crest away from the steps): ' + Object.entries(rs).map(([f, r]) => f + ' Hz ' + r.steps.map((s) => s[1] + ' ' + s[2]).join(', ') + ' (away from the steps up to ' + r.steadyMax + ')').join('; ')); }
      // Puls: a stroke passes ≥ 5 teeth in 112 ms; 30–60-ms gates are a 5–10-tick blip (KONZEPT), low on the field too
      { const st = [];
        for (const b of ['zapfen', 'fels']) for (const y of [0, 0.6]) for (const g of [0.03, 0.06, 0.112]) { const m = mono(await one(page, { eng: key, f: 220, y, dur: 0.8, params: P_(b), burst: true, gate: g })); st.push([b, y, g, Math.round(Z.ticks(m, SR, 0.045, 0.06 + g, null, 2, 1000) * (0.015 + g))]); }   // (the stone's slips: counted from 1 kHz)
        rep.stroke = st;
        // (counted from the sound: at a 30-ms stroke's 380 teeth a second they run together – t-dsp counts them in the processor: 5–10)
        // (the stone: every slip of its rasps is heard – its teeth are counted in t-dsp)
        ok(st.every((s) => (s[2] < 0.05 || s[3] >= 5) && (s[2] > 0.06 || s[0] === 'fels' || s[3] <= 10)), 'Puls strokes: teeth heard in the gate (body/y/gate/count): ' + st.map((s) => s.join('/')).join(', ') + ' (60 and 112 ms ≥ 5; Zapfen\'s 30–60 ms ≤ 10)'); }
      // Bebung: +50 ct on the pitch bus moves the rate at the top (above) and the body's ring low on the field
      // (the first knock's ring alone, 85 ms from 15 ms after it: over several knocks the spectrum is the tick rate's comb
      // across the mode; its first milliseconds hold the attack)
      { const m = mono(await one(page, { eng: key, f: 440, y: 0.2, dur: 1, params: P_('zapfen'), cents: 50 })); const c = L.cents(Z.peakHz(m, SR, 440 * Math.pow(2, 50 / 1200), 0.065, 4096), 440);
        rep.bebungLow = +c.toFixed(2); ok(Math.abs(c - 50) <= 5, `Bebung low on the field (y 0.2, 440 Hz): the knock rings ${c.toFixed(2)} ct higher (+50)`); }
      // the finger's speed adds rate below the Rast; a trembling finger does not (dead zone, leak)
      { const rate = async (moves) => { const m = mono(await one(page, { eng: key, f: 220, y: 0.3, dur: 4.2, params: P_('zapfen', { 'zpf.rast': 0 }), moves })); return Z.ticks(m, SR, 0.6, 4.1); };
        const still = await rate([]), tr = [], sw = [];
        for (let t = 0.3; t < 4.1; t += 1 / 30) tr.push([t, 'setY', 0.3 + 0.002 * (Math.round(t * 30) % 2 ? 1 : -1)]);
        for (let t = 0.3; t < 4.1; t += 1 / 30) sw.push([t, 'setY', 0.3 + 0.12 * Math.sin(2 * Math.PI * t)]);
        const trem = await rate(tr), swing = await rate(sw);
        rep.speed = { still: +still.toFixed(1), tremble: +trem.toFixed(1), swing: +swing.toFixed(1) };
        ok(Math.abs(trem / still - 1) <= 0.12 && swing / still >= 1.2, `finger speed: still ${still.toFixed(1)}/s, trembling ±0.002 ${trem.toFixed(1)}/s (≤ +12 %), swinging ±0.12 at 1 Hz ${swing.toFixed(1)}/s (≥ +20 %)`); }
      // the bodies differ (the check: a 0.5 f body with T60 ≤ 200 ms reads as a woodblock): a knock's band levels
      // (⅓ octaves 100 Hz–8 kHz) and its ring
      { const bl = {}, ring = {};
        for (const b of BODIES) { const m = mono(await one(page, { eng: key, f: 220, y: 0, dur: 0.4, params: P_(b) })); const sp = L.spectrum(m, SR, 0.045, 8192), bands = [];
          for (let c = 100; c < 8000; c *= Math.pow(2, 1 / 3)) { let e = 0; for (let k = Math.round(c / Math.pow(2, 1 / 6) / sp.hz); k < Math.round(c * Math.pow(2, 1 / 6) / sp.hz); k++) e += sp.p[k]; bands.push(10 * Math.log10(e + 1e-30)); }
          bl[b] = bands; const e = L.env(m, SR, 0.01).map(L.db); let t20 = null; for (let i = 7; i < e.length; i++) if (e[i] < e[6] - 20) { t20 = (i - 6) * 10; break; } ring[b] = t20; }
        const dist = []; for (let i = 0; i < BODIES.length; i++) for (let j = i + 1; j < BODIES.length; j++) { const a = bl[BODIES[i]], c = bl[BODIES[j]], ma = L.mean(a), mc = L.mean(c); let d = 0; for (let k = 0; k < a.length; k++) d += Math.pow(a[k] - ma - (c[k] - mc), 2); dist.push([BODIES[i] + '/' + BODIES[j], +Math.sqrt(d / a.length).toFixed(1)]); }
        rep.bodies = { ring20ms: ring, spectralDistanceDb: dist };
        ok(dist.every((d) => d[1] >= 3), 'the five bodies sound different: a knock\'s ⅓-octave shape differs by ≥ 3 dB RMS between any two: ' + dist.map((d) => d.join(' ')).join(', ') + '; ring to −20 dB (ms) ' + JSON.stringify(ring)); }
      // the click rises with Höhe and with velocity (Fels' scream, the check)
      // (on 112-ms strokes: their rate is the stroke's at y 0.2 and 0.6 – only the load differs, not the tone's saw; the
      // scream is the stone's band 2.6–6 kHz, against its modes' and saw's 1–2.6 kHz – without the click it is 13–22 dB
      // lower, klang/tests/click-zpf.js)
      { const hc = async (y, vel) => { const m = mono(await one(page, { eng: key, f: 220, y, vel, dur: 0.5, params: P_('fels'), burst: true, gate: 0.112 })); const sp = L.spectrum(m, SR, 0.05, 4096), e = (lo, hi) => { let x = 0; for (let k = Math.round(lo / sp.hz); k < Math.round(hi / sp.hz); k++) x += sp.p[k]; return x; }; return 10 * Math.log10(e(2600, 6000) / e(1000, 2600)); };
        const c = [await hc(0.2, 0.75), await hc(0.6, 0.75), await hc(0.2, 0.3), await hc(0.2, 1)].map((v) => +v.toFixed(1));
        rep.click = c; ok(c[1] - c[0] >= 3 && c[3] - c[2] >= 3, `the stone's scream (2.6–6 kHz re 1–2.6 kHz, 112-ms strokes): y 0.2 → 0.6 ${c[0]} → ${c[1]} dB, velocity 0.3 → 1 ${c[2]} → ${c[3]} dB (each ≥ +3)`); }
      // level 3 as loud as level 1 per body, per channel; its two sides differ
      { const l13 = {}, cor = {};
        for (const b of BODIES) { let pa = 0, pc = 0;
          for (const y of [0.2, 0.6, 1]) { const a = await one(page, { eng: key, f: 330, y, dur: 2.5, params: P_(b) }), c = await one(page, { eng: key, f: 330, y, dur: 2.5, params: P_(b), q: '3' }); pa += Math.pow(10, chan(a, 0.5, 2.4) / 10); pc += Math.pow(10, chan(c, 0.5, 2.4) / 10);
            if (y === 1) { let s = 0, sl = 0, sr = 0; for (let i = SR; i < 2 * SR; i++) { s += c.L[i] * c.R[i]; sl += c.L[i] ** 2; sr += c.R[i] ** 2; } cor[b] = +(s / Math.sqrt(sl * sr)).toFixed(2); } }
          l13[b] = +(10 * Math.log10(pc / pa)).toFixed(1); }
        rep.l3vsl1 = l13; rep.l3corr = cor;
        ok(Object.values(l13).every((d) => Math.abs(d) <= 1.5), 'level 3 within ±1.5 dB of level 1 per body (y 0.2/0.6/1): ' + JSON.stringify(l13));
        ok(Object.values(cor).every((c) => c < 0.9), 'level 3: real stereo – L/R correlation at the top < 0.9: ' + JSON.stringify(cor)); }
      // ---- the native stand-in (no AudioWorklet in the context): it plays the same source ----
      { const nat = (o) => page.evaluate(async (o) => {
          const M = window.__M; M.P['dev.q'] = o.q || '1';
          const ctx = await window.__off(48000, o.dur, Object.assign({ 'v.eng': 'neb', 'dev.lat': 'std' }, o.params || {}));   // (Nebel selected: no module in this context)
          M.getQ().budget = 1e4;
          if (o.cents) { const c = ctx.createConstantSource(); c.offset.value = o.cents; c.connect(M.A.pitchMod); c.start(); }
          let v = null; ctx.suspend(19 / 375).then(() => { v = o.burst ? M.hit('zpf', ctx.currentTime, o.f, o.y, o.vel || 0.75, { gate: o.gate }) : M.playNote('zpf', ctx.currentTime, o.f, o.y, o.vel || 0.75, {}); window.__lastV = v; ctx.resume(); });
          if (o.rel != null) ctx.suspend(Math.round(o.rel * 375) / 375).then(() => { if (v && v.release) v.release(); ctx.resume(); });
          const b = await ctx.startRendering();
          return Object.assign(window.__ret(b), { as: v && v.as, wk: !!(v && v.wk), dsp: !!ctx.__dspOK });
        }, o);
        const NP = (x) => Object.assign({}, DRY, x || {}), nm = async (o) => { const r = await nat(o); const x = pull(r); x.as = r.as; x.wk = r.wk; x.dsp = r.dsp; return x; };
        const h = await nm({ f: 220, y: 0.6, dur: 1, params: NP() });
        ok(h.as === 'zpf' && !h.wk && !h.dsp && L.rms(mono(h), 0.3 * SR, 0.9 * SR) > 1e-3, `native: without the module Zapfen plays its own stand-in (as ${h.as}, no processor)`);
        { const o0 = []; for (let i = 0; i < 4; i++) for (const b of ['zapfen', 'fels']) { const m = mono(await nm({ f: 220 * (1 + 0.1 * i), y: 0, dur: 0.3, params: NP({ 'zpf.koerper': b }) })); o0.push(+L.db(L.rms(m, Math.round(0.05 * SR), Math.round(0.08 * SR))).toFixed(1)); }
          rep.nativeOnset = o0; ok(o0.every((d) => d > -40), `native: y 0 – the stick sets on with a tooth at once, every time (first 30 ms, dBFS: ${o0.join(' / ')})`); }
        const ld = {}; for (const [name, burst] of [['L1', false], ['burst', true]]) { const x = pull(await page.evaluate(async ([burst]) => { const M = window.__M; M.P['dev.q'] = '1'; const ctx = await window.__off(48000, 10, { 'v.eng': 'neb', 'rev.mix': 0, 'dly.mix': 0, 'mst.comp': 0, 'cho.mix': 0, 'pha.mix': 0 }); M.getQ().budget = 1e4; return window.__ret(await window.__phr(ctx, 10, 'zpf', { burst })); }, [burst])); ld[name] = stats(x); if (name === 'L1') L.wav(path.join(dir, 'native-phrase-L1.wav'), x.L, x.R, SR); }
        rep.native = { loud: ld };
        ok(Math.abs(ld.L1.rms - refMean) <= 2 && Math.abs(ld.L1.rms - loud.L1.rms) <= 2, `native: loudness L1 ${ld.L1.rms} dB vs references' mean ${refMean.toFixed(2)} (±2) and the processor's ${loud.L1.rms}`);
        ok(Math.max(ld.L1.peak, ld.burst.peak) <= -1 && !ld.L1.nan && !ld.burst.nan && Math.abs(ld.L1.dc) < 0.01, `native: peak ≤ −1 dBFS (${ld.L1.peak}, burst ${ld.burst.peak}), no NaN, no DC`);
        const nt = []; for (const f of [55, 110, 220, 440, 880, 1760]) { const m = mono(await nm({ f, y: 1, dur: 1.8, params: NP() })); nt.push(+L.cents(Z.peakHz(m, SR, f, 1.0, 32768), f).toFixed(2)); }
        rep.native.top = nt; ok(nt.every((c) => Math.abs(c) <= 5), 'native: y 1 with Rast the note within ±5 ct, 55–1760 Hz: ' + nt.join(' / '));
        const ntk = {}; for (const b of ['zapfen', 'fels']) { ntk[b] = []; for (const f of [55, 110, 220, 440, 880]) { const m = mono(await nm({ f, y: 0.2, dur: 3, params: NP({ 'zpf.koerper': b }) })); ntk[b].push(+Z.ticks(m, SR, 0.3, 2.9, null, b === 'fels' ? 40 : 25).toFixed(1)); } }
        rep.native.ticks02 = ntk; ok(Object.values(ntk).every((r) => r.every((x) => x >= 3 && x <= 10)), 'native: y 0.2 3–10 ticks/creaks per second at 55–880 Hz: ' + JSON.stringify(ntk));
        { const a = mono(await nm({ f: 220, y: 1, dur: 2.2, params: NP(), cents: 50 })), b = mono(await nm({ f: 440, y: 0.2, dur: 1, params: NP(), cents: 50 }));
          const c1 = L.cents(Z.peakHz(a, SR, 220 * Math.pow(2, 50 / 1200), 1.0, 32768), 220), c2 = L.cents(Z.peakHz(b, SR, 440 * Math.pow(2, 50 / 1200), 0.065, 4096), 440);
          rep.native.bebung = [+c1.toFixed(2), +c2.toFixed(2)]; ok(Math.abs(c1 - 50) <= 5 && Math.abs(c2 - 50) <= 5, `native: Bebung +50 ct moves the rate at the top (${c1.toFixed(2)}) and the knocks' ring low (${c2.toFixed(2)})`); }
        { const st = []; for (const g of [0.06, 0.112]) { const m = mono(await nm({ f: 220, y: 0.6, dur: 0.8, params: NP(), burst: true, gate: g })); st.push([g, Math.round(Z.ticks(m, SR, 0.045, 0.06 + g, null, 2) * (0.015 + g))]); }
          rep.native.stroke = st; ok(st.every((s) => s[1] >= 5), 'native: a stroke passes ≥ 5 teeth (gate/count): ' + st.map((s) => s.join('/')).join(', ')); }
        { const m = mono(await nm({ f: 440, y: 0.6, dur: 2.5, params: NP(), rel: 1.0 })); const fin = await page.evaluate(async () => { const v = window.__lastV; await new Promise((r) => setTimeout(r, Math.max(300, (v.endAt - v.t0) * 1000 + 400))); return !v.alive; });
          rep.native.release = +L.db(L.rms(m, 2.0 * SR, 2.5 * SR)).toFixed(1); ok(L.rms(m, 2.0 * SR, 2.5 * SR) < 1e-5 && fin, `native: let go, it coasts out and the voice is freed (${rep.native.release} dB at 2–2.5 s)`); }
        { const moves = []; for (let i = 0; i <= 40; i++) moves.push([0.5 + i * 0.1, 'setY', i <= 20 ? i / 20 : (40 - i) / 20]);
          const x = pull(await page.evaluate(async (moves) => { const M = window.__M; M.P['dev.q'] = '1'; const ctx = await window.__off(48000, 6, { 'v.eng': 'neb', 'rev.mix': 0.3 }); let v = null;
            ctx.suspend(19 / 375).then(() => { v = M.playNote('zpf', ctx.currentTime, 147, 0, 0.75, {}); ctx.resume(); });
            for (const [t, , y] of moves) ctx.suspend(Math.round(t * 375) / 375).then(() => { if (v && v.alive) v.setY(y); ctx.resume(); });
            ctx.suspend(Math.round(4.8 * 375) / 375).then(() => { v.release(); ctx.resume(); });
            return window.__ret(await ctx.startRendering()); }, moves));
          L.wav(path.join(dir, 'native-sweep.wav'), x.L, x.R, SR); rep.pngNative = L.spectro(path.join(dir, 'native-sweep.wav')); }
        { const { execFileSync } = require('child_process');
          const c = JSON.parse(execFileSync('node', [path.join(__dirname, 'cost.js'), process.env.COST_ROUNDS || '6'], { env: Object.assign({}, process.env, { ENGS: 'zpfN1,zpfN3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }), encoding: 'utf8', timeout: 1800000 }).trim().split('\n').pop());
          const c1 = c.zpfN1 * c.scale, c3 = c.zpfN3 * c.scale; rep.native.cost = { L1: +c1.toFixed(3), L3: +c3.toFixed(3) };
          console.log(`INFO zpf native: cost level 1 ${c1.toFixed(3)}, level 3 ${c3.toFixed(3)} Nebel units`);
          const tab = await page.evaluate(() => { const M = window.__M; M.A.workletBroken.add('zpf'); const t = [M.VCOST1.zpf, M.VCOST3.zpf]; M.A.workletBroken.delete('zpf'); return t; });
          costRow(ok, 'native: ', tab, [c1, c3], { ENGS: 'zpfN1,zpfN3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3' }, (x) => [x.zpfN1 * x.scale, x.zpfN3 * x.scale]); } }
    }
    // -- demos for listening and the spectrogram: level 3, default effects (12-s phrase), and a held gesture
    { const x = pull(await page.evaluate(async (key) => window.__ret(await window.__phr(await window.__ctx(12, { 'v.eng': key }, '3'), 12, key, { step: 0.7, hold: 0.6 })), key));
      L.wav(path.join(dir, 'demo-L3.wav'), x.L, x.R, SR); rep.pngDemo = L.spectro(path.join(dir, 'demo-L3.wav')); rep.demo = stats(x); }
    if (tc.struck) {   // the position sweep: centre → end → centre, a hit every 0.25 s
      const x = pull(await page.evaluate(async (key) => { const M = window.__M, ctx = await window.__ctx(8, { 'v.eng': key, 'rev.mix': 0.3 });
        for (let i = 0; i <= 24; i++) ctx.suspend(Math.round((0.2 + i * 0.25) * 375) / 375).then(() => { M.playNote(key, ctx.currentTime, 196, i <= 12 ? i / 12 : (24 - i) / 12, 0.7, {}); ctx.resume(); });
        return window.__ret(await ctx.startRendering()); }, key));
      L.wav(path.join(dir, 'gesture-y-sweep.wav'), x.L, x.R, SR); rep.pngGesture = L.spectro(path.join(dir, 'gesture-y-sweep.wav')); }
    else { const moves = []; for (let i = 0; i <= 40; i++) moves.push([0.5 + i * 0.1, 'setY', i <= 20 ? i / 20 : (40 - i) / 20]);
      const x = await one(page, { eng: key, f: 147, y: 0, dur: 6, params: Object.assign({}, DRY, { 'rev.mix': 0.3 }), moves, rel: 4.8 });
      L.wav(path.join(dir, 'gesture-y-sweep.wav'), x.L, x.R, SR); rep.pngGesture = L.spectro(path.join(dir, 'gesture-y-sweep.wav')); }
    { const x = pull(await page.evaluate(async (key) => window.__ret(await window.__phr(await window.__ctx(8, { 'v.eng': key, 'rev.mix': 0.2 }, '1'), 8, key, { burst: true, step: 0.25, gate: 0.11 })), key));
      L.wav(path.join(dir, 'puls.wav'), x.L, x.R, SR); rep.pngPuls = L.spectro(path.join(dir, 'puls.wav')); }
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(rep, null, 1));
    console.log('spectrograms: ' + [rep.pngDemo, rep.pngGesture, rep.pngPuls, rep.pngHeld, rep.pngGhost].filter(Boolean).join(' '));
  }
  // -- fallback: no module in this context → the stand-in plays, the key stays
  { const r = await page.evaluate(async () => {
      const M = window.__M; const ctx = await window.__off(48000, 1, { 'v.eng': 'neb', 'rev.mix': 0 });   // nothing loaded
      const W = [['hlm', 'hau', 220], ['rnk', 'neb', 330], ['hrz', 'sch', 440], ['mdr', 'glo', 550], ['boe', 'obt', 294], ['amo', 'tie', 110], ['gsp', 'sai', 247], ['shn', 'sai', 262], ['khl', 'swm', 523], ['zpf', 'zpf', 587], ['glt', 'glt', 659]], vs = W.map(([k, , f]) => M.playNote(k, 0.05, f, 0.6, 0.7, {}));
      const st = window.__stats(await ctx.startRendering(), 0.1);
      return { got: vs.map((v) => v && [v.eng, v.as]), st, plays: W.map(([k]) => M.wkPlays(k)), dsp: !!ctx.__dsp, want: W.map(([k, s]) => [k, s]), zn: vs.map((v) => !!(v && v.zn && !v.wk)), gn: vs.map((v) => !!(v && v.gltN && !v.wk)) };
    });
    const pass = L.ok(r.want.every(([k, s], i) => r.got[i] && r.got[i][0] === k && r.got[i][1] === s) && r.zn[r.want.findIndex((w) => w[0] === 'zpf')] && r.gn[r.want.findIndex((w) => w[0] === 'glt')] && r.st.rms > -50 && !r.dsp, 'fallback without the module: Halm plays as Hauch, Ranke as Nebel, Harz as Schale, Moder as Glocke, Böe as Obertöne, Amöbe as Tiefe, Gespinst as Saite, Sehne as Saite, Kehlchen as Schwarm, Zapfen as its own native stand-in, Glut its own native loop, the key stays (' + JSON.stringify(r.got) + ')');
    if (!pass) fails++; }
  const errs = errors.filter((e) => !/Failed to load resource|fonts\.g|myzel-dsp\.js/.test(e));
  if (!L.ok(!errs.length, 'no console errors ' + errs.join(' | '))) fails++;
  await browser.close();
  L.summary();
  process.exit(Math.min(fails, 100));
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
