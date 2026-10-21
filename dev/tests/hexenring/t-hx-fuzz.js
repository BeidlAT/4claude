// Hexenring – hardening (SPEC §22): random sequences of every Hexenring action – the Korb (tap and held), the
// Hauptknopf (tap, held, in both modes and every start), rings, ↶/↷, Leeren, Löschen, level, Eigensinn, the form
// (Lichtungen, Kern, Lücke, Schluss), Nähren, Auslese, corrections, chips, „nur Bewegung“, Bewegung from a preset –
// mixed with notes, movement, Stille, presets, the mixer's scenes and morph, tempo changes, the Puls, Schlafen and
// waking, a hidden tab and reloads. After every sequence Stille: no note may stay (A.voices.size === 0, no finger);
// never a NaN or an infinity at the master or out of the processor; no exception; the books match (every Schicht with
// its Schleife, every cleared Schleife given back); memory bounded – the Hexenring's own count within its Speichergrenze,
// the page's heap after a collection not growing past it.
// (Etappe 3) the Mitspieler's actions join the bag (the Gärtner at every step, answers, Begleiten, Puls lernt, …).
// (step 2b) Wuchs's own actions (the key, the card's choices, ✓ ✕ ⚓) and every tool of step 2b join the bag; the
// processor's and the realms' tripwires (non-finite samples scrubbed and reported) must never fire; FUZZ_DBG=1 puts a
// detector on every strip too and prints the first non-finite sample's place and the actions before it.
//   node t-hx-fuzz.js            FUZZ_N=2000 actions (default), FUZZ_SEED=1, FUZZ_W=0 (step 2a's bag), FUZZ_URL (a slot)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const N = +(process.env.FUZZ_N || 2000), SEQ = 20, MEM_MB = 300;
let seed = +(process.env.FUZZ_SEED || 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ACTS = { notes: 14, move: 4, korb: 9, korbHold: 3, haupt: 7, ring: 7, undo: 4, redo: 3, leeren: 1, del: 2, level: 2, eig: 2, form: 3, merken: 2, lichGo: 2, kern: 2, luecke: 2,
  schluss: 2, schlussAb: 1, gsp: 2, kor: 1, ausl: 1, korr: 2, chipTo: 2, bewOnly: 1, bewImport: 1, stille: 2, preset: 2, scene: 2, morph: 2, tempo: 2, puls: 2, sleep: 1, wake: 1,
  hide: 1, show: 1, param: 3 };
// (step 2b) Wuchs's own actions – the key, the card's choices, ✓ ✕ ⚓ – and the tools: the tape, the slices, the ageing,
// the notes, Erstarren, the consensus, export, Puls ernten, Folge, Klang aufs Feld, Bühnenansicht, Setliste
Object.assign(ACTS, { key: 3, wuchs: 4, lob: 2, nein: 2, anker: 1, beginn: 1, speed: 3, stopp: 2, rev: 1, trim: 2, dbl: 1, vb: 2, abr: 2, slc: 2, nt: 3, erst: 1, auslW: 1, export: 1, pulsE: 1, folge: 1, feld: 1, buehne: 1, lied: 1 });
// (Etappe 3) the Mitspieler: the Gärtner's step and behaviours, its ✕ ✓, a ring's veto, roles, Wiederkehr marks,
// Begleiten, Puls lernt, an answer started at once, the Handschrift's switch and its take; FUZZ_M=0: step 2b's bag
Object.assign(ACTS, { gst: 3, gbeh: 1, gnein: 2, glob: 1, rolle: 1, wkMark: 1, begl: 1, pulsL: 1, antw: 2, hand: 1 });
if (process.env.FUZZ_M === '0') for (const k of ['gst', 'gbeh', 'gnein', 'glob', 'rolle', 'wkMark', 'begl', 'pulsL', 'antw', 'hand']) delete ACTS[k];
if (process.env.FUZZ_W === '0') for (const k of ['key', 'wuchs', 'lob', 'nein', 'anker', 'beginn', 'speed', 'stopp', 'rev', 'trim', 'dbl', 'vb', 'abr', 'slc', 'nt', 'erst', 'auslW', 'export', 'pulsE', 'folge', 'feld', 'buehne', 'lied']) delete ACTS[k];   // (the sequences of step 2a's fuzz)
const BAG = Object.entries(ACTS).flatMap(([k, w]) => Array(w).fill(k));
async function install(page) {
  await page.evaluate(async (MEM_MB) => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    M.setParam('hx.mem', MEM_MB);
    const SRC = `class HxNan extends AudioWorkletProcessor {
      constructor() { super(); this.n = 0; this.k = 0; }
      process(inp) { let b = 0; for (const ch of inp[0] || []) for (let i = 0; i < ch.length; i++) { const x = ch[i]; if (x !== x || x === Infinity || x === -Infinity) { this.n++; b++; } }
        if (b && !this.f) { this.f = 1; this.port.postMessage({ first: currentTime }); }
        if (++this.k % 50 === 0 && this.n) { this.port.postMessage(this.n); this.n = 0; } return true; }
    }
    registerProcessor('hx-nan', HxNan);`;
    if (!ctx.__nan) { await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }))); ctx.__nan = true; }
    const F = (window.__fz = window.__fz || { nan: 0, exc: [], acts: {} });
    F.last = F.last || []; F.firsts = F.firsts || [];
    const det = (node, out, chs, nm) => { const d = new AudioWorkletNode(ctx, 'hx-nan', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: chs, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; node.connect(d, out); d.connect(z).connect(ctx.destination);
      d.port.onmessage = (e) => { if (e.data && e.data.first != null) { F.firsts.push([nm, +e.data.first.toFixed(4)]); if (!F.at) F.at = F.last.slice(); return; } if (nm === 'master' || nm.startsWith('hx')) F.nan += e.data; else F.nanX = (F.nanX || 0) + e.data; }; };
    det(A.out, 0, 2, 'master');
    if (window.__DBG) { for (const st of M.MIX.list) { det(st.in, 0, 2, 'in:' + st.k); det(st.dry || st.out, 0, 2, 'out:' + st.k); } det(A.masterIn, 0, 2, 'masterIn'); }
    if (M.HX.node) { det(M.HX.node, 0, 2, 'hx0'); det(M.HX.node, 1, 2, 'hx1'); det(M.HX.node, 2, 16, 'hx2'); }
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
      key: (a, b) => { if (a < 0.5) M.setParam('t.root', String(Math.floor(b * 12))); else M.setParam('t.scale', Object.keys(M.SCALES)[Math.floor(b * Object.keys(M.SCALES).length)]); },
      wuchs: (a, b) => { const L = pickL(a); if (!L || L.bew) return; const w = ['wahl', 'klang', 'stufe', 'wurf', 'eig', 'ton'][Math.floor(b * 6)]; M.hxWSet(L, w, w === 'wahl' ? b < 0.5 : w === 'klang' ? ['eigen', 'feld', 'glo', 'hrz', 'kor'][Math.floor(b * 5)] : w === 'stufe' ? [null, 1, 3][Math.floor(b * 3)] : w === 'eig' ? ['treu', 'lebendig'][Math.floor(b * 2)] : w === 'ton' ? ['diatonisch', 'transponieren', 'fest'][Math.floor(b * 3)] : 0); },
      lob: () => M.hxWLob(), nein: () => M.hxWNein(), anker: () => M.hxWAnker(),
      beginn: (a) => M.setParam('hx.beginn', a < 0.5 ? 'abdruck' : 'wuchs'),
      speed: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxSpeed(L, M.HX_SP[Math.floor(b * M.HX_SP.length)][0]); },
      stopp: (a, b) => M.hxBandstopp(b < 0.5 ? null : [pickL(a)].filter(Boolean)),
      rev: (a) => { const L = pickL(a); if (L && !L.bew) M.hxRev(L); },
      trim: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxBandTrim(L, ['h', 'v', '<', '>', 'ganz'][Math.floor(b * 5)]); },
      dbl: async (a) => { const L = pickL(a); if (L && !L.bew && L.d.beats <= 16) await M.hxDouble(L); },
      vb: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxVbSet(L, [1, 0.97, 0.9, 0.75][Math.floor(b * 4)]); },
      abr: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxAbSet(L, [0, 0.04, 0.1, 0.25][Math.floor(b * 4)], b > 0.9); },
      slc: (a, b, c) => { const L = pickL(a); if (L && !L.bew) M.hxSlcSet(L, c < 0.4 ? 'pd' : c < 0.8 ? 'pw' : 'neu', [0, 0.15, 0.3, 0.5][Math.floor(b * 4)]); },
      nt: (a, b) => { const L = pickL(a); if (!L || L.bew) return; const w = ['tr', 'tr', 'dens', 'dens', 'gq', 'krebs', 'umk', 'zurueck'][Math.floor(b * 8)]; M.hxNtSet(L, w, w === 'tr' ? (b < 0.125 ? -1 : 1) : w === 'dens' ? (b < 0.375 ? -1 : 1) : w === 'gq' ? 0.5 : 0); },
      erst: async (a) => { const L = pickL(a); if (L && !L.bew) await M.hxErstarren(L); },
      auslW: (a) => { const L = pickL(a); if (L && L.ausl && L.ausl.cons) M.hxAusleseWuchs(L); },
      export: async (a, b) => { const L = pickL(a); if (!L || L.bew) return; if (b < 0.5) { const tk = await M.hxExportTake(L); if (tk) { M.takes.splice(M.takes.indexOf(tk), 1); } } else M.hxMidiOf([L]); },
      pulsE: (a) => { if (M.SEQ.on) M.hxPulsErnten([1, 2][Math.floor(a * 2)], a > 0.7); },
      folge: (a) => { const l = M.HX.lich; if (a < 0.6 && l.length) { M.hxFolgeSet(l.slice(0, 3).map((x, i) => ({ lich: x.id, n: 1 + i })), a < 0.3); M.hxFolgeStart(); } else M.hxFolgeStop(); },
      feld: (a) => { const L = pickL(a); if (L && !L.bew) M.hxKlangFeld(L); },
      buehne: () => M.setParam('hx.buehne', !M.P['hx.buehne']),
      lied: (a) => { const S = M.hxSetGet(); if (a < 0.4 || S.list.length < 2) M.hxSetAdd(); else M.hxSetNext(); },
      gst: (a) => M.setParam('hx.gaertner', ['schaut', 'pflegt', 'antwortet'][Math.floor(a * 3)]),
      gbeh: (a, b) => M.setParam(['hx.gPlatz', 'hx.gRollen', 'hx.gAntw', 'hx.gBegl', 'hx.gWk'][Math.floor(a * 5)], b < 0.7),
      gnein: (a) => { if (a < 0.5) M.hxMachNein(); else { const L = pickL(a); if (L && !L.bew) M.hxGdNein(L); } },
      glob: () => M.hxMachLob(),
      rolle: (a, b) => { const L = pickL(a); if (L && !L.bew) { M.hxMi(L).rolle = b < 0.3 ? null : ['bass', 'akkorde', 'melodie', 'flaeche', 'schlag'][Math.floor(b * 5)]; M.hxMi(L).rc = null; } },
      wkMark: (a) => { const L = pickL(a); if (L && !L.bew) M.hxMi(L).wk = !M.hxMi(L).wk; },
      begl: async (a) => { const L = pickL(a); if (L && !L.bew) await M.hxBegleiten(L, { quiet: true }); },
      pulsL: (a, b) => { const L = pickL(a); if (L && !L.bew) M.hxPulsLernt(L, Math.floor(b * 4)); },
      antw: (a) => { const ns = M.HXA.notes.slice(-6); if (ns.length >= 3) M.hxAntStart({ notes: ns.map((x) => Object.assign({}, x, { tok: x.tok || '1:1:0' })), id: 1e6 + Math.floor(a * 1e5), mi: 0.3 }, M.A.ctx.currentTime); },
      hand: async (a) => { if (a < 0.4) M.setParam('hx.hand', M.P['hx.hand'] === 'an' ? 'aus' : 'an'); else if (M.P['hx.hand'] === 'an') await M.hxHandTake(null); },
      param: (a, b) => { const [k, v] = [['hx.modus', ['neu', 'dieselbe']], ['hx.start', ['takt', 'ton', 'sofort']], ['hx.laenge', ['auto', 'wie1', 'fest']]][Math.floor(a * 3)]; M.setParam(k, v[Math.floor(b * v.length)]); },
    };
    window.__act = async (name, a, b, c) => {
      F.acts[name] = (F.acts[name] || 0) + 1; F.last.push(name + ' ' + [a, b, c].map((x) => x.toFixed(2)).join(' ') + ' @' + M.A.ctx.currentTime.toFixed(3)); if (F.last.length > 16) F.last.shift();
      try { await window.__A[name](a, b, c); } catch (e) { F.exc.push(name + ': ' + (e && e.message)); }
      if (M.HX.nan && M.HX.nan.length && !F.trip0) F.trip0 = { acts: F.last.slice(), t: M.A.ctx.currentTime, first: M.HX.nan[0] };   // (the actions just before the first tripwire's report)
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
      if (M.HX.nan && M.HX.nan.length) { F.trip = (F.trip || []).concat(M.HX.nan); if (!F.tripAt) F.tripAt = F.last.slice(); M.HX.nan.length = 0; }
      return { voices: M.A.voices.size, touches: M.touches.size, ms: i * 50, loops: M.hxLoopsLive().length, mem: M.hxMemUsed(), cap: M.P['hx.mem'] * 1048576, state: M.A.ctx.state, orph, weg };
    };
  }, MEM_MB);
}
(async () => {
  let { page, errors } = await G.open({ w: 1280, h: 800, url: process.env.FUZZ_URL });
  const cdp0 = async () => { const s = await page.context().newCDPSession(page); return s; };
  let cdp = await cdp0();
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const u = await cdp.send('Runtime.getHeapUsage'); return Math.round(u.usedSize / 1048576); };
  await page.evaluate(async () => { await window.__reset(); window.__grid(110); await window.__sleep(300); });
  await page.evaluate((d) => { window.__DBG = d; }, !!+process.env.FUZZ_DBG);
  await install(page);
  const stuck = [], over = [], heaps = [], books = [];
  let weg0 = [];
  let trips = 0, done = 0, seqs = 0, reloads = 0, h0 = null, nan = 0, exc = [], acts = {};
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
      const f = await page.evaluate(() => window.__fz); if ((f.nan || f.nanX || (f.trip && f.trip.length)) && !global.__shown) { global.__shown = 1; console.log('NANDUMP seq', seqs, 'nan', f.nan, 'nanX', f.nanX, 'firsts', JSON.stringify((f.firsts || []).sort((x, y) => x[1] - y[1]).slice(0, 12)), 'at', JSON.stringify(f.at)); console.log('TRIP', JSON.stringify((f.trip || []).slice(0, 4)), 'tripAt', JSON.stringify(f.tripAt)); console.log('TRIP0', JSON.stringify(f.trip0 || null)); } trips += (f.trip || []).length; nan += f.nan; exc = exc.concat(f.exc); for (const k in f.acts) acts[k] = (acts[k] || 0) + f.acts[k];
      await page.reload(); await page.waitForFunction(() => !!window.__M);
      await H.tools(page); await G.gtools(page);
      await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 });
      await page.waitForTimeout(800);
      await page.evaluate((d) => { window.__DBG = d; }, !!+process.env.FUZZ_DBG);
      await install(page);
      cdp = await cdp0(); weg0 = [];
      reloads++;
    }
  }
  const f = await page.evaluate(() => window.__fz); if ((f.nan || f.nanX || (f.trip && f.trip.length)) && !global.__shown) { global.__shown = 1; console.log('NANDUMP seq', seqs, 'nan', f.nan, 'nanX', f.nanX, 'firsts', JSON.stringify((f.firsts || []).sort((x, y) => x[1] - y[1]).slice(0, 12)), 'at', JSON.stringify(f.at)); console.log('TRIP', JSON.stringify((f.trip || []).slice(0, 4)), 'tripAt', JSON.stringify(f.tripAt)); console.log('TRIP0', JSON.stringify(f.trip0 || null)); } trips += (f.trip || []).length; nan += f.nan; exc = exc.concat(f.exc); for (const k in f.acts) acts[k] = (acts[k] || 0) + f.acts[k];
  const hEnd = await heap();
  console.log('INFO ' + done + ' actions in ' + seqs + ' sequences, ' + reloads + ' reloads, ' + Math.round((Date.now() - t0) / 1000) + ' s; actions: ' + JSON.stringify(acts));
  console.log('INFO heap after GC [sequence, MB, Hexenring MB, Schleifen]: ' + JSON.stringify(heaps) + ' → end ' + hEnd + ' MB');
  const missing = Object.keys(ACTS).filter((k) => !acts[k]);
  ok(done === N && !missing.length, `${N} random actions in ${seqs} sequences of ${SEQ}, every kind of action done (${Object.keys(acts).length} kinds)` + (missing.length ? ' – never: ' + missing.join(', ') : ''));
  ok(!stuck.length, 'after every Stille: no note and no finger stays (A.voices.size === 0)' + (stuck.length ? ' – ' + stuck.slice(0, 5).join('; ') : ''));
  ok(nan === 0, `never a NaN or an infinity at the master or out of the processor (${nan} samples)`);
  ok(trips === 0, `the processor's and the realms' tripwires never fired (${trips} reports)`);
  ok(!exc.length && !errors.length, 'no exception in an action, no page error' + (exc.length || errors.length ? ': ' + exc.concat(errors).slice(0, 6).join(' | ') : ''));
  ok(!books.length, 'the books match: no Schicht left without its Schleife, no cleared Schleife held past a sequence (the processor gave every buffer back)' + (books.length ? ' – ' + books.slice(0, 3).join('; ') : ''));
  ok(!over.length, `memory bounded: the Hexenring's own count stays within its Speichergrenze (${MEM_MB} MB)` + (over.length ? ' – ' + over.slice(0, 3).join('; ') : ''));
  ok(h0 != null && hEnd - h0 < MEM_MB + 64, `  the page's heap after a collection: ${h0} MB after 5 sequences → ${hEnd} MB at the end (bound: + ${MEM_MB + 64} MB)`);
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
