// Hexenring – hardening (SPEC §22): random sequences of every Hexenring action – the Korb (tap and held), the
// Hauptknopf (tap, held, in both modes and every start), rings, ↶/↷, Leeren, Löschen, level, Eigensinn, the form
// (Lichtungen, Kern, Lücke, Schluss), Nähren, Auslese, corrections, chips, „nur Bewegung“, Bewegung from a preset –
// mixed with notes, movement, Stille, presets, the mixer's scenes and morph, tempo changes, the Puls, Schlafen and
// waking, a hidden tab and reloads. After every sequence Stille: no note may stay (A.voices.size === 0, no finger);
// never a NaN or an infinity at the master or out of the processor; no exception; the books match (every Schicht with
// its Schleife, every cleared Schleife given back); memory bounded – the Hexenring's own count within its Speichergrenze,
// the page's heap after a collection not growing past it.
//   node t-hx-fuzz.js            FUZZ_N=2000 actions (default), FUZZ_SEED=1
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const N = +(process.env.FUZZ_N || 2000), SEQ = 20, MEM_MB = 300;
let seed = +(process.env.FUZZ_SEED || 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ACTS = { notes: 14, move: 4, korb: 9, korbHold: 3, haupt: 7, ring: 7, undo: 4, redo: 3, leeren: 1, del: 2, level: 2, eig: 2, form: 3, merken: 2, lichGo: 2, kern: 2, luecke: 2,
  schluss: 2, schlussAb: 1, gsp: 2, kor: 1, ausl: 1, korr: 2, chipTo: 2, bewOnly: 1, bewImport: 1, stille: 2, preset: 2, scene: 2, morph: 2, tempo: 2, puls: 2, sleep: 1, wake: 1,
  hide: 1, show: 1, param: 3 };
const BAG = Object.entries(ACTS).flatMap(([k, w]) => Array(w).fill(k));
async function install(page) {
  await page.evaluate(async (MEM_MB) => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    M.setParam('hx.mem', MEM_MB);
    const SRC = `class HxNan extends AudioWorkletProcessor {
      constructor() { super(); this.n = 0; this.k = 0; }
      process(inp) { for (const ch of inp[0] || []) for (let i = 0; i < ch.length; i++) { const x = ch[i]; if (x !== x || x === Infinity || x === -Infinity) this.n++; }
        if (++this.k % 50 === 0 && this.n) { this.port.postMessage(this.n); this.n = 0; } return true; }
    }
    registerProcessor('hx-nan', HxNan);`;
    if (!ctx.__nan) { await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }))); ctx.__nan = true; }
    const F = (window.__fz = window.__fz || { nan: 0, exc: [], acts: {} });
    const det = (node, out, chs) => { const d = new AudioWorkletNode(ctx, 'hx-nan', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: chs, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; node.connect(d, out); d.connect(z).connect(ctx.destination); d.port.onmessage = (e) => { F.nan += e.data; }; };
    det(A.out, 0, 2);
    if (M.HX.node) { det(M.HX.node, 0, 2); det(M.HX.node, 2, 16); }
    // the hidden tab: the page's visibility as the browser reports it
    let vis = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => vis !== 'visible' });
    window.__vis = (v) => { vis = v; document.dispatchEvent(new Event('visibilitychange')); };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const pickL = (a) => { const Ls = M.hxLoopsLive(); return Ls.length ? Ls[Math.floor(a * Ls.length) % Ls.length] : null; };
    const ENG = ['klb', 'glo', 'neb', 'mem', 'sai', 'kor', 'hau'];
    window.__A = {
      notes: async (a, b, c) => { const n = 1 + Math.floor(a * 6), t0 = A.ctx.currentTime + 0.03; const list = []; for (let i = 0; i < n; i++) list.push([t0 + i * (0.08 + 0.3 * b), Math.floor(((a * 97 + i * c * 13) % 1) * 10), 0.4 + 0.5 * c, 0.1 + 0.6 * b]); window.__play(list, { eng: ENG[Math.floor(c * ENG.length) % ENG.length] }); },
      move: (a, b) => M.modSet('map:fz:1', ['flt', 'pan', 'dly', 'hoehe'][Math.floor(a * 4)], b < 0.2 ? 0 : b - 0.5),
      korb: () => M.hxKorb(null),
      korbHold: async (a) => { M.hxKorbPress({ pointerId: 31 }); await sleep(200 + 900 * a); M.hxKorbRelease({ pointerId: 31 }); },
      haupt: async (a) => { M.hxHaupt({ pointerId: 32 }); await sleep(a < 0.5 ? 40 : 300 + 1500 * a); M.hxHauptUp({ pointerId: 32 }); },
      ring: (a) => M.hxRingTap(Math.floor(a * 8), null),
      undo: () => M.hxUndoStep(), redo: () => M.hxRedoStep(), leeren: () => M.hxLeeren(),
      del: (a) => { const L = pickL(a); if (L) M.hxDelete(L); },
      level: (a, b) => { const L = pickL(a); if (L) M.hxLevel(L, 1.6 * b); },
      eig: (a, b) => { const L = pickL(a); if (L) M.hxEigSet(L, ['treu', 'lebendig', 'variieren', 'wandern'][Math.floor(b * 4)]); },
      form: () => M.hxFormTap(), merken: () => M.hxLichMerken(),
      lichGo: (a) => { const l = M.HX.lich; if (l.length) M.hxLichGo(l[Math.floor(a * l.length)]); },
      kern: () => M.hxKern(), luecke: (a) => M.hxLuecke(a < 0.5 ? 1 : 4),
      schluss: (a) => M.hxSchluss(['ende', 'welkend', 'abbauend'][Math.floor(a * 3)]), schlussAb: () => M.hxSchlussAb(),
      gsp: (a) => { const L = pickL(a); if (L && !L.bew) M.hxNaehrGsp(L, !(L.naehrt && L.naehrt.gsp)); },
      kor: (a) => { const L = pickL(a); if (L && !L.bew) M.hxNaehrKor(L, !(L.naehrt && L.naehrt.kor)); },
      ausl: (a) => { const L = pickL(a); if (L && L.ausl) M.hxAusleseDo(L); },
      korr: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxKorr(L, ['x2', 'h2', 'l+', 'l-', 'e<', 'e>', '3er', 'davor', 'in0', 'in1'][Math.floor(b * 10)]); },
      chipTo: () => { const C = M.HX.chips; if (C && C.kind === 'ernte' && C.to && C.to.length) M.hxChipTo(C.to[0]); },
      bewOnly: () => { const C = M.HX.chips, L = C && C.kind === 'ernte' && M.hxLoopsLive().find((x) => x.key === C.key); if (L && C.bew) M.hxBewOnly(L); },
      bewImport: () => { const p = M.PRESETS.find((x) => x.key === 'sporenfaehrte'); if (p && p.fae) M.faeImport(p.fae, 'fuzz'); },
      stille: () => M.panic(),
      preset: (a) => M.loadPreset(M.PRESETS[Math.floor(a * M.PRESETS.length)]),
      scene: (a) => M.mxSnapStore(a < 0.5 ? 'a' : 'b'),
      morph: (a) => M.mxMorphApply(a),
      tempo: (a) => M.setParam('seq.bpm', 70 + Math.floor(a * 100)),
      puls: () => (M.SEQ.on ? M.seqStop() : M.seqStart()),
      sleep: () => M.slpEnter(), wake: () => M.slpWake(),
      hide: () => window.__vis('hidden'), show: () => window.__vis('visible'),
      param: (a, b) => { const [k, v] = [['hx.modus', ['neu', 'dieselbe']], ['hx.start', ['takt', 'ton', 'sofort']], ['hx.laenge', ['auto', 'wie1', 'fest']]][Math.floor(a * 3)]; M.setParam(k, v[Math.floor(b * v.length)]); },
    };
    window.__act = async (name, a, b, c) => {
      F.acts[name] = (F.acts[name] || 0) + 1;
      try { await window.__A[name](a, b, c); } catch (e) { F.exc.push(name + ': ' + (e && e.message)); }
    };
    // Stille and the end of a sequence: every hand off, awake, visible – then no note may stay
    window.__settle = async () => {
      try { M.hxHauptUp({ pointerId: 32 }); M.hxKorbRelease({ pointerId: 31 }); } catch (e) { F.exc.push('settle: ' + e.message); }
      if (M.SLP.on) M.slpWake();
      if (document.visibilityState !== 'visible') window.__vis('visible');
      M.modSet('map:fz:1', 'flt', 0); M.modSet('map:fz:1', 'pan', 0); M.modSet('map:fz:1', 'dly', 0); M.modSet('map:fz:1', 'hoehe', 0);
      M.panic();
      let i = 0; for (; i < 60 && (M.A.voices.size || M.touches.size); i++) await sleep(50);
      await sleep(300);
      const orph = [...M.HX.sch.values()].filter((S) => !M.HX.loops.has(S.loop)).length, weg = [...M.HX.loops.values()].filter((L) => L.state === 'weg').map((L) => L.id);
      return { voices: M.A.voices.size, touches: M.touches.size, ms: i * 50, loops: M.hxLoopsLive().length, mem: M.hxMemUsed(), cap: M.P['hx.mem'] * 1048576, state: M.A.ctx.state, orph, weg };
    };
  }, MEM_MB);
}
(async () => {
  let { page, errors } = await G.open({ w: 1280, h: 800 });
  const cdp0 = async () => { const s = await page.context().newCDPSession(page); return s; };
  let cdp = await cdp0();
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const u = await cdp.send('Runtime.getHeapUsage'); return Math.round(u.usedSize / 1048576); };
  await page.evaluate(async () => { await window.__reset(); window.__grid(110); await window.__sleep(300); });
  await install(page);
  const stuck = [], over = [], heaps = [], books = [];
  let weg0 = [];
  let done = 0, seqs = 0, reloads = 0, h0 = null, nan = 0, exc = [], acts = {};
  const t0 = Date.now();
  while (done < N) {
    for (let i = 0; i < SEQ && done < N; i++, done++) {
      const name = BAG[Math.floor(rnd() * BAG.length)], a = rnd(), b = rnd(), c = rnd();
      await page.evaluate(([n, a, b, c]) => window.__act(n, a, b, c), [name, a, b, c]);
      await page.waitForTimeout(Math.floor(rnd() * 160));
    }
    seqs++;
    const s = await page.evaluate(() => window.__settle());
    if (s.voices || s.touches) stuck.push(`seq ${seqs}: ${s.voices} voices, ${s.touches} fingers after Stille`);
    const stale = s.weg.filter((id) => weg0.includes(id)); weg0 = s.weg;
    if (s.orph || stale.length) books.push(`seq ${seqs}: ${s.orph} Schichten without their Schleife, Schleifen ${stale.join(',') || '–'} cleared a sequence ago and still held`);
    if (s.mem > s.cap + 64 * 1048576) over.push(`seq ${seqs}: ${Math.round(s.mem / 1048576)} MB of ${Math.round(s.cap / 1048576)}`);
    if (seqs % 25 === 0 || seqs === 5) { const hp = await heap(); heaps.push([seqs, hp, Math.round(s.mem / 1048576), s.loops]); if (seqs === 5) h0 = hp; }
    // a reload now and then: the Schleifen come back from storage, the fuzz goes on with them
    if (seqs % 30 === 0 && done < N) {
      const f = await page.evaluate(() => window.__fz); nan += f.nan; exc = exc.concat(f.exc); for (const k in f.acts) acts[k] = (acts[k] || 0) + f.acts[k];
      await page.reload(); await page.waitForFunction(() => !!window.__M);
      await H.tools(page); await G.gtools(page);
      await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 });
      await page.waitForTimeout(800);
      await install(page);
      cdp = await cdp0(); weg0 = [];
      reloads++;
    }
  }
  const f = await page.evaluate(() => window.__fz); nan += f.nan; exc = exc.concat(f.exc); for (const k in f.acts) acts[k] = (acts[k] || 0) + f.acts[k];
  const hEnd = await heap();
  console.log('INFO ' + done + ' actions in ' + seqs + ' sequences, ' + reloads + ' reloads, ' + Math.round((Date.now() - t0) / 1000) + ' s; actions: ' + JSON.stringify(acts));
  console.log('INFO heap after GC [sequence, MB, Hexenring MB, Schleifen]: ' + JSON.stringify(heaps) + ' → end ' + hEnd + ' MB');
  const missing = Object.keys(ACTS).filter((k) => !acts[k]);
  ok(done === N && !missing.length, `${N} random actions in ${seqs} sequences of ${SEQ}, every kind of action done (${Object.keys(acts).length} kinds)` + (missing.length ? ' – never: ' + missing.join(', ') : ''));
  ok(!stuck.length, 'after every Stille: no note and no finger stays (A.voices.size === 0)' + (stuck.length ? ' – ' + stuck.slice(0, 5).join('; ') : ''));
  ok(nan === 0, `never a NaN or an infinity at the master or out of the processor (${nan} samples)`);
  ok(!exc.length && !errors.length, 'no exception in an action, no page error' + (exc.length || errors.length ? ': ' + exc.concat(errors).slice(0, 6).join(' | ') : ''));
  ok(!books.length, 'the books match: no Schicht left without its Schleife, no cleared Schleife held past a sequence (the processor gave every buffer back)' + (books.length ? ' – ' + books.slice(0, 3).join('; ') : ''));
  ok(!over.length, `memory bounded: the Hexenring's own count stays within its Speichergrenze (${MEM_MB} MB)` + (over.length ? ' – ' + over.slice(0, 3).join('; ') : ''));
  ok(h0 != null && hEnd - h0 < MEM_MB + 64, `  the page's heap after a collection: ${h0} MB after 5 sequences → ${hEnd} MB at the end (bound: + ${MEM_MB + 64} MB)`);
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
