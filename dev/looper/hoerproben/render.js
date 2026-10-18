// Hörproben für den Hexenring (dev/looper/KONZEPT.md §4.2 Abdruck/Wuchs, §5.4 Treu/Lebendig, §13 Frage 3 „Wuchs in
// der besten Stufe“). Myzel selbst (eine instrumentierte Kopie von myzel/index.html mit window.__M) spielt eine
// Zwei-Takt-Phrase in OfflineAudioContexts – jeder Durchgang ein eigenes Rendern ab Sample 0, wie ein Wuchs-Durchgang
// (§4.2). Die Durchgänge liegen dann Stoß an Stoß, der Nachklang jedes Durchgangs klingt in die folgenden hinein (wie
// eine Schleife spielt), und vor dem ersten liegt der Nachklang desselben Durchgangs, als liefe die Schleife schon.
//
//   node render.js OUTDIR [boe rhz hrz gng]      (Server: $S/v2 auf :8790, Slot hp-inst: sh $S/v2/mk.sh myzel hp)
// Die Seite läuft als Handy (pointer: coarse): Stufe 1 ist die Stufe 1 eines Handys (Budget 14, Treiber 2×). Das
// Stimmenbudget wird zum Rendern aufgehoben, die Last aber mitgeschrieben (maxLoad: Stufe 1 bleibt unter 14).
//
// Der Wurf: Math.random ist ein xorshift mit Startwert. Vor dem Kontext steht immer derselbe Startwert (ROOM: der
// Hall-IR – ohne Worker im Hauptthread gerechnet –, Rauschpuffer, Taumeln), danach der Wurf des Durchgangs: Er setzt
// jede Zufallszahl der Stimmen (Verstimmungen, Prozessor-Startwerte wkSeed, den Weg der Rhizom-Lawine).
// Ausgabe: OUTDIR/<name>.wav (24 bit, 48 kHz, Stereo, auf gleiche Lautheit), OUTDIR/<name>.m4a (AAC 256 kb/s),
// OUTDIR/report.json (Messungen: Unterschied der Durchgänge in dB, Lautheit, Spitzen, Stereo).
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL_ = process.env.HP_URL || 'http://127.0.0.1:8790/hp-inst/index.html';
const OUT = process.argv[2] || '.', ONLY = process.argv.slice(3);
const SR = 48000, BPM = 84, BEAT = 60 / BPM, LOOP = Math.round(8 * BEAT * SR);   // zwei Takte 4/4 bei 84 bpm (Myzels Grundtempo; das Echo läuft im Tempo des Pulses mit) = 5,714 s
const ROOM = 777, TARGET = -16;   // der Raum (für alle Durchgänge gleich); Ziel-Lautheit LUFS
// Ereignisse: [Schlag (0–8), Tonstufe (Index in N.notes: D-Moll-Pentatonik ab D3, 0 = D3 … 10 = D5), Höhe, Anschlag, Dauer in Schlägen (gehaltene Klangquellen), Pan]
const DEMOS = {
  boe: { name: '1-boe-treu-dann-lebendig', eng: 'boe', tail: 7, params: { 'boe.boeen': 0.65 },
    // die Windharfe: ein D3, das beide Takte hält, darüber A3, im zweiten Takt C4 und F4. Lange Töne, damit Wind und
    // Böen (65 % statt 40: der Wind wandert weiter) Zeit haben, andere Saiten (Teiltöne) zu fangen
    ev: [[0, 0, 0.55, 0.75, 7.6, -0.3], [0.5, 3, 0.65, 0.65, 3.4, 0.3], [4, 4, 0.7, 0.6, 3.6, 0.35], [5, 6, 0.75, 0.5, 2.6, -0.1]],
    passes: [['3', 1001], ['3', 1001], ['3', 2002], ['3', 3003], ['3', 4004], ['3', 5005]] },
  rhz: { name: '2-rhizom-treu-dann-lebendig', eng: 'rhz', tail: 6, params: { 'rhz.reiz': 0.62 },
    // fünf Anschläge durch die Skala; jeder stößt eine Lawine durch das Netz der Tonstufen an (Reiz 62 %)
    ev: [[0, 5, 0.6, 0.8, 0, 0], [1.5, 3, 0.5, 0.65, 0, -0.3], [3, 7, 0.55, 0.6, 0, 0.3], [4, 2, 0.65, 0.8, 0, -0.15], [6, 8, 0.5, 0.6, 0, 0.2]],
    passes: [['3', 1001], ['3', 1001], ['3', 2002], ['3', 3003], ['3', 4004], ['3', 5005]] },
  hrz: { name: '3-harz-stufe1-dann-stufe3', eng: 'hrz', tail: 6, params: { 'hrz.koerper': 'glas' },
    // gestrichenes Glas: d-Moll (D3 A3 F4) → F-Dur (F3 C4 A4), dazu ein G4 im zweiten Takt
    ev: [[0, 0, 0.5, 0.7, 3.7, -0.35], [0.06, 3, 0.48, 0.65, 3.64, 0], [0.12, 6, 0.45, 0.6, 3.58, 0.35],
      [4, 1, 0.5, 0.7, 3.6, -0.3], [4.06, 4, 0.48, 0.65, 3.54, 0.05], [4.12, 8, 0.45, 0.6, 3.48, 0.35], [6, 7, 0.55, 0.5, 1.6, 0.15]],
    passes: [['1', 1001], ['1', 1001], ['3', 1001], ['3', 1001]] },
  gng: { name: '4-gong-stufe1-dann-stufe3', eng: 'gng', tail: 13, params: {},
    // Gongs: D3+A3, ein leises F4, dann F3+C4, zum Schluss ein leises A4
    ev: [[0, 0, 0.6, 0.8, 0, -0.2], [0.08, 3, 0.5, 0.6, 0, 0.25], [2.5, 6, 0.45, 0.5, 0, 0.35], [4, 1, 0.6, 0.75, 0, 0.2], [4.08, 4, 0.5, 0.6, 0, -0.3], [6.5, 8, 0.4, 0.45, 0, 0]],
    passes: [['1', 1001], ['1', 1001], ['3', 1001], ['3', 1001]] },
};

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });   // ein Handy: Stufe 1 so, wie ein Handy sie spielt (pointer: coarse → MOBILE)
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;   // (die Bilder ziehen Zufallszahlen)
    window.Worker = function () { throw new Error('Hörproben: kein Worker'); };   // der Hall-IR im Hauptthread, mit dem festen Raum-Startwert
    window.__seed = (s) => { let x = s >>> 0 || 1; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; };
    window.__seed(12345);
  });
  await page.goto(URL_); await page.waitForFunction(() => !!window.__M);
  await page.evaluate(() => {
    window.__off = async (sr, dur, params) => {   // (wie v2/lib.js: ein frischer Kontext mit den Standardwerten + params)
      const M = window.__M, A = M.A;
      window.__mkCtx = () => new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      A.voices.clear(); A.grainVoices.clear(); A.revActive = null; A.revWant = 0; A.drvKey = null; A.bor = null; A.frozen = false; A.tex = {}; A.texWait = {}; A.grains = 0; A.irJob = 0;
      M.KS_CACHE.clear(); M.KS_CACHE.frames = 0;
      for (const id in M.PD) if (!M.PD[id].dev) M.P[id] = M.PD[id].d;
      Object.assign(M.P, params);
      M.RHZ.q = []; M.RHZ.vs.clear(); M.RHZ.h = 0; M.RHZ.sp = null;
      M.applyQuality(); M.buildNotes(); M.initAudio();
      for (let i = 0; i < 500 && !A.revActive; i++) await new Promise((r) => setTimeout(r, 10));
      return A.ctx;
    };
    window.__b64 = (f32) => { const u = new Uint8Array(f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    // ein Durchgang: die Phrase in einem eigenen Kontext, ab Sample 0
    window.__pass = async (o) => {
      const M = window.__M, sr = o.sr, Q = 128 / sr;
      M.P['dev.q'] = o.q;
      M.CAL.unit = 1e-6; M.QP[1].budget = 1e3; M.QP[1].maxv = 400;   // keine Stimme wird gestohlen (die Last wird mitgeschrieben: maxLoad)
      window.__seed(o.room);
      const ctx = await window.__off(sr, o.dur, Object.assign({ 'dev.lat': 'std', 'v.eng': o.eng, 'v.layer': 'off', 'seq.bpm': o.bpm }, o.params));
      const dsp = await M.ensureDSP(ctx);
      window.__seed(o.seed);   // der Wurf
      const at = new Map(), add = (t, fn) => { const k = Math.max(1, Math.round(t / Q)); if (!at.has(k)) at.set(k, []); if (fn) at.get(k).push(fn); return k; };
      const info = { maxLoad: 0, maxVoices: 0, voices: 0, fired: [], dsp, as: [] };
      for (const [b, idx, y, vel, durB, pan] of o.ev) {
        const t = b * o.beat; let v = null;
        add(t, (now) => {
          v = M.playNote(o.eng, now, M.N.notes[idx].f, y, vel, { pan });
          if (!v) return;
          info.voices++; info.as.push(v.as);
          if (v.rz) info.fired.push(v.rz.fired);   // (Rhizom offline: die ganze Lawine ist beim Anschlag gelegt)
        });
        if (durB > 0) { const k = add(t + durB * o.beat, (now) => { if (v && v.release && !v.released) v.release(); }); add(k * Q + Q, null); }   // (offline erreicht die Port-Nachricht den Prozessor erst beim nächsten suspend)
        add(t + Q, null);
      }
      for (let t = 0.25; t < o.dur - 0.1; t += 0.25) add(t, null);   // (die Last mitschreiben; Port-Nachrichten zustellen)
      for (const [k, fns] of at) ctx.suspend(k * Q).then(() => {
        const now = ctx.currentTime;
        for (const fn of fns) fn(now);
        info.maxLoad = Math.max(info.maxLoad, M.voiceLoad()); info.maxVoices = Math.max(info.maxVoices, M.A.voices.size);
        ctx.resume();
      });
      const b = await ctx.startRendering();
      M.P['dev.q'] = '1';
      return { L: window.__b64(b.getChannelData(0)), R: window.__b64(b.getChannelData(1)), info };
    };
  });
  return { page, errors };
}
const pull = (r) => ({ L: new Float32Array(Buffer.from(r.L, 'base64').buffer.slice(0)), R: new Float32Array(Buffer.from(r.R, 'base64').buffer.slice(0)), info: r.info });

// ---- Messen ----
const db = (x) => 10 * Math.log10(x + 1e-30);
const energy = (x, a = 0, b = x.L.length) => { let s = 0; for (let i = a; i < b; i++) s += x.L[i] * x.L[i] + x.R[i] * x.R[i]; return s; };
// der Unterschied zweier Durchgänge: Energie der Differenz gegen die Energie des ersten (dB; −∞ = bitgleich)
function diffDb(a, b) { let d = 0; for (let i = 0; i < a.L.length; i++) { const l = a.L[i] - b.L[i], r = a.R[i] - b.R[i]; d += l * l + r * r; } return d === 0 ? -Infinity : db(d / energy(a)); }
// Seite gegen Mitte (dB): wie breit
function sideMid(x) { let m = 0, s = 0; for (let i = 0; i < x.L.length; i++) { const a = x.L[i] + x.R[i], b = x.L[i] - x.R[i]; m += a * a; s += b * b; } return db(s / m); }
// Schwerpunkt des Spektrums (Hz) über die ganze Phrase, Mono, Hann-Fenster à 4096
function centroid(x, a = 0, b = x.L.length) {
  const N = 4096, re = new Float64Array(N), im = new Float64Array(N); let num = 0, den = 0;
  for (let s = a; s + N <= b; s += N) {
    for (let i = 0; i < N; i++) { re[i] = 0.5 * (x.L[s + i] + x.R[s + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; num += p * k * SR / N; den += p; }
  }
  return num / den;
}
// wie verschieden es klingt (nicht nur in der Phase): Terzband-Spektrogramm (85-ms-Fenster, 50 Hz–16 kHz), mittlere
// Abweichung in dB über alle Felder, die in einem der beiden Durchgänge höchstens 50 dB unter dessen lautestem Feld liegen
function bands(x) {
  const N = 4096, H = 2048, re = new Float64Array(N), im = new Float64Array(N), out = [];
  const edges = []; for (let f = 50 / Math.pow(2, 1 / 6); f < 16000; f *= Math.pow(2, 1 / 3)) edges.push(Math.round(f * N / SR));
  for (let s = 0; s + N <= x.L.length; s += H) {
    for (let i = 0; i < N; i++) { re[i] = 0.5 * (x.L[s + i] + x.R[s + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); im[i] = 0; }
    fft(re, im);
    const row = []; for (let b = 0; b + 1 < edges.length; b++) { let e = 0; for (let k = edges[b]; k < Math.max(edges[b] + 1, edges[b + 1]); k++) e += re[k] * re[k] + im[k] * im[k]; row.push(db(e)); }
    out.push(row);
  }
  return out;
}
function specDiff(a, b) {
  const A = bands(a), B = bands(b); let top = -Infinity; for (const S of [A, B]) for (const r of S) for (const v of r) top = Math.max(top, v);
  let s = 0, n = 0; for (let i = 0; i < A.length; i++) for (let j = 0; j < A[i].length; j++) if (A[i][j] > top - 50 || B[i][j] > top - 50) { s += Math.abs(Math.max(A[i][j], top - 50) - Math.max(B[i][j], top - 50)); n++; }
  return s / n;
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) {
      const ar = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, ai = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
      re[i + j + len / 2] = re[i + j] - ar; im[i + j + len / 2] = im[i + j] - ai; re[i + j] += ar; im[i + j] += ai;
      const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
// ---- WAV ----
function wav(file, L, R, bits) {
  const n = L.length, bps = bits / 8, buf = Buffer.alloc(44 + n * 2 * bps);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2 * bps, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(bits === 32 ? 3 : 1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2 * bps, 28); buf.writeUInt16LE(2 * bps, 32); buf.writeUInt16LE(bits, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2 * bps, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (const c of [L[i], R[i]]) {
    if (bits === 32) { buf.writeFloatLE(c, o); o += 4; continue; }
    // 24 bit mit TPDF-Dither
    let v = Math.round(Math.max(-1, Math.min(1, c)) * 8388607 + (Math.random() - Math.random()));
    v = Math.max(-8388608, Math.min(8388607, v)); buf.writeIntLE(v, o, 3); o += 3;
  }
  fs.writeFileSync(file, buf);
}
// Lautheit (EBU R128, integriert) und True Peak mit ffmpeg
function loudOf(file) {
  let s = '';
  try { s = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: 'utf8' }); } catch (e) { s = String(e.stdout || ''); }
  const sum = s.slice(s.lastIndexOf('Summary:'));
  const I = parseFloat((sum.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]), TP = parseFloat((sum.match(/Peak:\s+(-?[\d.inf]+) dBFS/) || [])[1]);
  return { I, TP };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openPage(browser);
  const rep = { bpm: BPM, loopSec: +(LOOP / SR).toFixed(3), room: ROOM, demos: {} };
  const mixes = {};
  for (const key of Object.keys(DEMOS)) {
    if (ONLY.length && !ONLY.includes(key)) continue;
    const D = DEMOS[key], dur = LOOP / SR + D.tail, P = [];
    for (const [q, seed] of D.passes) {
      const t0 = Date.now();
      const x = pull(await page.evaluate((o) => window.__pass(o), { sr: SR, dur, q, seed, room: ROOM, eng: D.eng, params: D.params, ev: D.ev, beat: BEAT, bpm: BPM }));
      x.q = q; x.seed = seed; P.push(x);
      console.log(`${key} Stufe ${q} Wurf ${seed}: ${((Date.now() - t0) / 1000).toFixed(1)} s, ${JSON.stringify(x.info)}`);
    }
    // ein Durchgang endet mit seinem Nachklang: die letzten 1,5 s ausgeblendet (der Kontext ist dort zu Ende)
    const fade = Math.round(1.5 * SR);
    for (const x of P) for (const c of [x.L, x.R]) for (let i = 0; i < fade; i++) c[c.length - fade + i] *= 0.5 + 0.5 * Math.cos(Math.PI * i / fade);
    // Stoß an Stoß, die Nachklänge übereinander; davor der Nachklang des ersten Durchgangs, als liefe die Schleife schon
    const n = P.length * LOOP + (P[0].L.length - LOOP), L = new Float32Array(n), R = new Float32Array(n);
    for (let p = 0; p < P.length; p++) for (let i = 0; i < P[p].L.length; i++) { L[p * LOOP + i] += P[p].L[i]; R[p * LOOP + i] += P[p].R[i]; }
    for (let k = 1; k * LOOP < P[0].L.length; k++) for (let i = k * LOOP; i < P[0].L.length; i++) { L[i - k * LOOP] += P[0].L[i]; R[i - k * LOOP] += P[0].R[i]; }
    const fin = Math.round(0.02 * SR); for (let i = 0; i < fin; i++) { const g = Math.sin(0.5 * Math.PI * i / fin); L[i] *= g; R[i] *= g; }   // (der Nachklang am Dateianfang: 20 ms eingeblendet)
    // Messungen
    const r = { name: D.name, eng: D.eng, params: D.params, passes: D.passes.map(([q, s]) => ({ q, seed: s })), sec: +(n / SR).toFixed(2), info: P.map((x) => x.info) };
    r.diffToPass1Db = P.map((x) => +diffDb(P[0], x).toFixed(1));   // ganzer Durchgang samt Nachklang
    r.pairwiseDb = []; for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) r.pairwiseDb.push([a + 1, b + 1, +diffDb(P[a], P[b]).toFixed(1)]);
    r.specDiffToPass1Db = P.map((x) => +specDiff(P[0], x).toFixed(2));
    r.rmsDb = P.map((x) => +db(energy(x) / (2 * x.L.length)).toFixed(2));
    r.sideMidDb = P.map((x) => +sideMid(x).toFixed(1));
    r.centroidHz = P.map((x) => Math.round(centroid(x, 0, LOOP)));
    // im fertigen Stück: Durchgang 1 gegen 2 (beide mit dem Nachklang desselben Wurfs davor)
    { const a = { L: L.subarray(fin, LOOP), R: R.subarray(fin, LOOP) }, b = { L: L.subarray(LOOP + fin, 2 * LOOP), R: R.subarray(LOOP + fin, 2 * LOOP) }; r.mixPass1vs2Db = +diffDb(a, b).toFixed(1); }
    rep.demos[key] = r; mixes[key] = { L, R };
    const raw = path.join(OUT, D.name + '.raw.wav'); wav(raw, L, R, 32);
    r.raw = loudOf(raw);
    console.log(key, JSON.stringify({ sec: r.sec, diffToPass1Db: r.diffToPass1Db, spec: r.specDiffToPass1Db, mix12: r.mixPass1vs2Db, rmsDb: r.rmsDb, sideMidDb: r.sideMidDb, centroidHz: r.centroidHz, raw: r.raw }));
  }
  // gleiche Lautheit: −16 LUFS, außer ein True Peak käme über −1 dBTP – dann alle gemeinsam leiser
  const keys = Object.keys(mixes);
  let target = TARGET; for (const k of keys) { const { I, TP } = rep.demos[k].raw; target = Math.min(target, I + (-1 - TP)); }
  rep.targetLufs = +target.toFixed(2);
  for (const k of keys) {
    const D = DEMOS[k], r = rep.demos[k], g = Math.pow(10, (target - r.raw.I) / 20), { L, R } = mixes[k];
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
    const w = path.join(OUT, D.name + '.wav'); wav(w, L, R, 24); fs.unlinkSync(path.join(OUT, D.name + '.raw.wav'));
    r.gainDb = +(20 * Math.log10(g)).toFixed(2); r.final = loudOf(w);
    try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', path.join(OUT, D.name + '.m4a')]); r.m4a = true; } catch (e) { r.m4a = false; }
    console.log(k, 'gain', r.gainDb, 'dB →', JSON.stringify(r.final));
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 1));
  if (errors.length) console.log('page errors:', errors.slice(0, 10));
  await browser.close();
})();
