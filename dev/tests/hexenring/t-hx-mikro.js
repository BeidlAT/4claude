// Hexenring – Etappe 4, the microphone (SPEC §15 Mikro-Schleifen, Gesang als Noten; §22 Etappe 4's rows):
//  A in the page, no audio graph: YIN on synthetic tones (sines, a band-limited saw, a voice without its fundamental,
//    noise at −20 dB) and on a recorded-like voice (glottal pulses through vowel formants, vibrato, jitter, shimmer,
//    breath, a room) – frame by frame against the pitch it was made with; Gesang als Noten's segmentation of that voice
//    (its notes, their degrees and onsets: legato steps split, a repeated pitch re-attacked)
//  B live: the microphone is off until the player switches it on – no getUserMedia before (a faked one counts the
//    calls), no sign, no Mikro source; switched on in the card: the constraints (no echo cancellation, noise
//    suppression, gain control), the sign in the Ringleiste, the card; refused: a word, stays off; off: its tracks end,
//    the sign goes, the ring hears nothing more. A loopback (the monitor out → a DelayNode → the „microphone“):
//    „Verzögerung messen“ finds the round trip to ±1 ms; a Korb from the Mikro sits on the beat (what was sung to the
//    Takt arrives its round trip later), overdub and Dieselbe-Ernte from it too; Bluetooth (an output latency of
//    210 ms) refuses the overdub with a word, a new Mikro-Schleife still goes; Gesang als Noten on a sung Mikro-Schleife
//    (its notes on their degrees, Wuchs on) and the loop then plays them with Myzel's voices; the cost while it is on;
//    the settings fit 360 px
//   node t-hx-mikro.js        env: PARTS=A,B (default both)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const PARTS = (process.env.PARTS || 'A,B').split(',');
// a fake getUserMedia: counts its calls, keeps the constraints, refuses on demand, else a 330 Hz tone of its own context
const INIT = () => {
  window.__gum = { n: 0, deny: false, last: null, tracks: [] };
  const md = navigator.mediaDevices; if (!md) return;
  md.getUserMedia = async (c) => {
    window.__gum.n++; window.__gum.last = JSON.parse(JSON.stringify(c));
    if (window.__gum.deny) throw new DOMException('denied', 'NotAllowedError');
    const ac = window.__gumCtx || (window.__gumCtx = new AudioContext()), o = ac.createOscillator(), d = ac.createMediaStreamDestination();
    o.frequency.value = 330; o.connect(d); o.start();
    const s = d.stream; window.__gum.tracks.push(...s.getTracks()); return s;
  };
};
// (in the page) a voice as sung: notes [[t0, dur, f, legato-from-previous]], at sr – returns {x, f (the pitch it was made with, per sample; 0 between notes)}
const VOICE = () => {
  window.__voice = (notes, sr, seed = 7) => {
    let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const T = notes.reduce((a, n) => Math.max(a, n[0] + n[1]), 0) + 0.4, n = Math.round(T * sr), x = new Float32Array(n), fT = new Float32Array(n);
    const FM = [[800, 80, 1], [1150, 90, 0.5], [2900, 120, 0.12], [3900, 130, 0.06]];   // (an open „a“)
    const amp = (hf) => FM.reduce((a, [F, B, g]) => a + g / (1 + ((hf - F) / B) ** 2), 0.02);
    let ph = 0, jit = 0, shim = 0;
    for (const [t0, dur, f, leg] of notes) {
      const i0 = Math.round(t0 * sr), i1 = Math.round((t0 + dur) * sr), prev = leg ? notes[notes.indexOf(notes.find((q) => q[0] + q[1] >= t0 - 1e-6 && q[0] < t0))] : null;
      for (let i = i0; i < i1 + Math.round(0.04 * sr) && i < n; i++) {
        const t = (i - i0) / sr, rel = i >= i1 ? 1 - (i - i1) / (0.04 * sr) : 1, att = leg ? 1 : Math.min(1, t / 0.03);
        // the pitch: a scoop into a note sung fresh (−50 cents, 30 ms), a 40 ms glide from the note before when legato, vibrato after 150 ms
        let c = leg && prev ? 1200 * Math.log2(prev[2] / f) * Math.max(0, 1 - t / 0.04) : -50 * Math.exp(-t / 0.03);
        c += 30 * Math.min(1, Math.max(0, (t - 0.15) / 0.2)) * Math.sin(2 * Math.PI * 5.5 * t);
        if ((i & 63) === 0) { jit = 0.9 * jit + 0.1 * (rnd() - 0.5) * 8; shim = 0.9 * shim + 0.1 * (rnd() - 0.5) * 0.1; }
        const fi = f * Math.pow(2, (c + jit) / 1200); if (i < i1) fT[i] = fi;
        ph += fi / sr; if (ph > 1e6) ph -= 1e6;
        let v = 0; for (let h = 1; h * fi < 5000; h++) v += amp(h * fi) * Math.pow(h, -0.6) * Math.sin(2 * Math.PI * h * ph);
        x[i] += 0.25 * att * rel * (1 + shim) * v + 0.004 * att * rel * (rnd() - 0.5);
      }
    }
    // a room as a microphone half a metre away hears it: RT60 0.45 s, its reverberant energy 10 dB under the direct
    // sound (four combs, then two allpasses for density)
    const y = Float32Array.from(x), D = [1557, 1617, 1491, 1422].map((d) => Math.round(d * sr / 44100)), w = new Float32Array(n);
    for (const d of D) { const g = Math.pow(10, -3 * d / (0.45 * sr)), b = new Float32Array(d); let k = 0; for (let i = 0; i < n; i++) { const o = b[k]; b[k] = x[i] + g * o; k = (k + 1) % d; w[i] += o; } }
    for (const d of [225, 556].map((q) => Math.round(q * sr / 44100))) { const b = new Float32Array(d); let k = 0; for (let i = 0; i < n; i++) { const o = b[k], v = w[i] + 0.5 * o; b[k] = v; k = (k + 1) % d; w[i] = o - 0.5 * v; } }
    let ex = 0, ew = 0; for (let i = 0; i < n; i++) { ex += x[i] * x[i]; ew += w[i] * w[i]; }
    const m = Math.sqrt(0.1 * ex / Math.max(1e-12, ew)); for (let i = 0; i < n; i++) y[i] += m * w[i];
    return { x: y, f: fT };
  };
};
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800, init: INIT });
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.evaluate(VOICE);
  // the melody (2 bars at 120 bpm): degrees (N.notes indices), start, length, legato into it
  const MEL = [[6, 0, 0.5, 0], [7, 0.5, 0.45, 1], [9, 1.0, 0.2, 0], [8, 1.25, 0.2, 0], [6, 1.5, 0.9, 0], [5, 2.5, 0.42, 0], [5, 3.0, 0.42, 0], [4, 3.5, 0.4, 0]];
  if (PARTS.includes('A')) {
    // ---------- A1 · YIN on synthetic tones ----------
    let r = await ev(() => {
      const M = window.__M, sr = 48000, out = {};
      const cents = (a, b) => Math.abs(1200 * Math.log2(a / b));
      const run = (name, f0, gen) => {
        const n = Math.round(0.6 * sr), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = gen(i / sr);
        const Y = M.hxYin(x, sr, 70, 1100), e = Y.f.slice(4).map((f) => (f > 0 ? cents(f, f0) : 1e4)).sort((a, b) => a - b);
        out[name] = { med: e[e.length >> 1], gross: e.filter((c) => c > 50).length / e.length };
      };
      let s = 3; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5);
      for (const f of [82.41, 110, 196, 261.63, 440, 659.26, 987.77]) run('sin' + f, f, (t) => 0.3 * Math.sin(2 * Math.PI * f * t));
      for (const f of [98, 220, 523.25]) run('saw' + f, f, (t) => { let v = 0; for (let h = 1; h * f < 20000; h++) v += Math.sin(2 * Math.PI * h * f * t) / h; return 0.2 * v; });
      run('nofund150', 150, (t) => { let v = 0; for (let h = 2; h <= 8; h++) v += Math.sin(2 * Math.PI * h * 150 * t) / h; return 0.3 * v; });
      run('noise330', 330, (t) => 0.3 * Math.sin(2 * Math.PI * 330 * t) + 0.3 * Math.sqrt(12) * 0.1 * rnd());
      const t0 = performance.now(); M.hxYin(new Float32Array(48000 * 4).map((_, i) => Math.sin(i * 0.03)), 48000, 70, 1100); out.ms4 = performance.now() - t0;
      return out;
    });
    const sy = Object.entries(r).filter(([k]) => k !== 'ms4'), clean = sy.filter(([k]) => !/noise/.test(k));
    ok(clean.every(([, v]) => v.med < 1 && v.gross === 0), `YIN on sines 82–988 Hz, saws, a voice without its fundamental: median error ${clean.map(([k, v]) => k.replace(/[a-z]+/, '') + ' ' + v.med.toFixed(2)).join(', ')} cents, no frame off by more than 50 cents`);
    ok(r.noise330.med < 3 && r.noise330.gross < 0.01, `  with noise at −20 dB: median ${r.noise330.med.toFixed(2)} cents, ${(100 * r.noise330.gross).toFixed(1)} % frames off; 4 s of voice read in ${r.ms4.toFixed(0)} ms (in the Worker)`);
    // ---------- A2 · YIN and Gesang als Noten on a recorded-like voice ----------
    r = await ev((MEL) => {
      const M = window.__M, sr = 48000, fOf = (d) => [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33][d];   // (D-Moll-Pentatonik, as the field's notes)
      const notes = MEL.map(([d, t0, dur, leg]) => [t0, dur, fOf(d), leg]), V = window.__voice(notes, sr), Y = M.hxYin(V.x, sr, 70, 1100);
      const e = [], es = []; for (let i = 0; i < Y.f.length; i++) { const c = Math.round(i * Y.hop + 0.015 * sr), ft = V.f[c], fa = V.f[Math.max(0, c - 700)], fb = V.f[Math.min(V.f.length - 1, c + 700)], f0 = V.f[Math.max(0, c - Math.round(0.12 * sr))]; if (ft > 0 && fa > 0 && fb > 0 && Y.f[i] > 0) { const x = Math.abs(1200 * Math.log2(Y.f[i] / ft)); e.push(x); if (f0 > 0 && Math.abs(1200 * Math.log2(f0 / ft)) < 100) es.push(x); } }
      e.sort((a, b) => a - b); es.sort((a, b) => a - b);
      const seg = M.hxGesangSeg(Y);
      return { med: e[e.length >> 1], p95: es[Math.floor(es.length * 0.95)], gross: e.filter((c) => c > 50).length / e.length, grossS: es.filter((c) => c > 50).length / es.length,
        seg: seg.map((s) => ({ t0: s.t0, st: s.st, cf: s.cf.length })), want: notes.map((n) => ({ t0: n[0], st: 12 * Math.log2(n[2] / 440) + 69 })) };
    }, MEL);
    ok(r.med < 3 && r.grossS < 0.02 && r.p95 < 20, `YIN on a recorded-like voice (formants, vibrato ±30 cents, jitter, shimmer, breath, a room at −10 dB, RT60 0.45 s): median ${r.med.toFixed(1)} cents against the pitch it was sung with; 120 ms into a note 95 % within ${r.p95.toFixed(0)} cents, ${(100 * r.grossS).toFixed(2)} % of frames off by > 50 cents – before that, where the room still rings with the note before, ${(100 * r.gross).toFixed(1)} % of all frames read an octave low (the notes take their octave from all their frames)`);
    const pair = r.want.map((w, i) => r.seg[i] ? { dt: Math.abs(r.seg[i].t0 - w.t0), dst: Math.abs(r.seg[i].st - w.st) } : null);
    ok(r.seg.length === r.want.length && pair.every((p) => p && p.dst < 0.3 && p.dt < 0.05), `Gesang als Noten: ${r.seg.length} notes from the ${r.want.length} sung (a legato step split, a repeated pitch re-attacked) – each within ${Math.max(...pair.map((p) => (p ? p.dst : 9))).toFixed(2)} semitones, its onset within ${(1000 * Math.max(...pair.map((p) => (p ? p.dt : 9)))).toFixed(0)} ms`);
    ok(r.seg.some((s) => s.cf > 0), `  the scoops and glides kept as each note's curve (${r.seg.filter((s) => s.cf > 0).length} notes with one)`);
  }
  if (PARTS.includes('B')) {
    await ev(async () => { await window.__reset(); window.__grid(120); await window.__sleep(300); });
    // ---------- B1 · off until switched on ----------
    let r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      o.on = M.HX.mic.on; o.sign = !document.querySelector('#hxMic').hidden; o.inp = M.hxInp(); o.ring = M.HX.mic.ring;
      // a whole loop played and harvested: nothing asks for the microphone
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4;
      window.__play([0, 1, 2, 3].map((i) => [M.tgTime(B0) + i * 0.5, 7 + i, 0.8, 0.25]), { eng: 'klb' });
      await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await window.__sleep(400);
      o.loops = M.hxLoopsLive().length;
      M.hxCardOpen(M.hxLoopsLive()[0].slot); await window.__sleep(300);
      o.chipMikro = [...document.querySelectorAll('.hx-card .chip')].some((b) => b.textContent === 'Mikro');
      o.gum = window.__gum.n;
      return o;
    });
    ok(!r.on && !r.sign && r.inp === 0 && !r.ring && r.loops === 1 && r.gum === 0 && !r.chipMikro, `the microphone is off until it is switched on: no getUserMedia (${r.gum} calls, a loop played and harvested), no sign, the Korb takes what is played, no „Mikro“ source in the card`);
    // ---------- B2 · switched on in the card; refused; off ----------
    r = await ev(async () => {
      const M = window.__M, o = {}, find = (t) => [...M.HXK.mic.querySelectorAll('button')].find((b) => b.textContent === t);
      M.hxCardRender(); await window.__sleep(100);
      window.__gum.deny = true; find('Mikrofon an').click(); await window.__sleep(400);
      o.denyOn = M.HX.mic.on; o.denyMsg = document.querySelector('#toastMsg').textContent; o.denySign = !document.querySelector('#hxMic').hidden;
      window.__gum.deny = false; M.hxCardRender(); await window.__sleep(100);
      const ld0 = M.hxLoad();
      find('Mikrofon an').click(); for (let i = 0; i < 40 && !M.HX.mic.on; i++) await window.__sleep(50);
      await window.__sleep(400);
      o.on = M.HX.mic.on; o.c = window.__gum.last; o.n = window.__gum.n; o.sign = !document.querySelector('#hxMic').hidden; o.signT = document.querySelector('#hxMic').textContent;
      o.card = M.HXK.mic.textContent; o.inp = M.hxInp(); o.dLoad = M.hxLoad() - ld0; o.cost = M.HX_COST.mic;
      // the ring hears it (the fake's 330 Hz tone)
      await window.__sleep(600); o.lvl = M.hxLvlAt(M.A.ctx.currentTime - 0.5, M.A.ctx.currentTime, 3);
      M.hxCardOpen(M.hxLoopsLive()[0].slot); await window.__sleep(300);
      o.chipMikro = [...document.querySelectorAll('.hx-card .chip')].some((b) => b.textContent === 'Mikro');
      M.hxCardRender(); await window.__sleep(100);
      find('Mikrofon aus').click(); await window.__sleep(400);
      o.off = !M.HX.mic.on; o.ended = window.__gum.tracks.every((t) => t.readyState === 'ended'); o.signOff = document.querySelector('#hxMic').hidden;
      await window.__sleep(700); o.lvlOff = M.hxLvlAt(M.A.ctx.currentTime - 0.4, M.A.ctx.currentTime, 3);
      return o;
    });
    ok(!r.denyOn && /abgelehnt/.test(r.denyMsg) && !r.denySign, `refused by the browser: a word („${r.denyMsg}“), it stays off, no sign`);
    ok(r.on && r.n === 2 && r.c.audio && r.c.audio.echoCancellation === false && r.c.audio.noiseSuppression === false && r.c.audio.autoGainControl === false, `„Mikrofon an“ in the settings opens it – mono, without echo cancellation, noise suppression and gain control`);
    ok(r.sign && /Mikro/.test(r.signT) && /● an/.test(r.card) && r.inp === 3 && r.chipMikro, `  its sign in the Ringleiste („${r.signT}“), the card says „● an“, the Korb takes the Mikro, the card offers „Mikro“ as a source`);
    ok(r.lvl > 0.01 && Math.abs(r.dLoad - r.cost) < 1e-9, `  its ring hears it (level ${r.lvl.toFixed(3)}); its cost counted while it is on (+${r.dLoad.toFixed(2)})`);
    ok(r.off && r.ended && r.signOff && r.lvlOff === 0, `„Mikrofon aus“: its tracks ended, the sign gone, the ring hears nothing more (level ${r.lvlOff})`);
    // ---------- B3 · the loopback: the round trip measured ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, ctx = A.ctx, SR = ctx.sampleRate, D = Math.round(0.0371 * SR) / SR, o = { D: D * SR };
      await window.__reset(); window.__grid(120);
      const bus = ctx.createGain(), dl = ctx.createDelay(1), vd = ctx.createDelay(1); dl.delayTime.value = D; vd.delayTime.value = D;
      // the loopback carries what the monitor plays while it measures (a tap in front of the monitor strip: behind the
      // processor's output it would close a cycle, where Chrome's DelayNode adds a render quantum)
      const tap = ctx.createGain(), mon = A.monSt; tap.connect(mon); tap.connect(dl); dl.connect(bus); vd.connect(bus);
      window.__lb = { bus, dl, vd, D };
      // what is sung: a buffer started at a time, through the same round trip
      window.__sing = (x, t) => { const b = ctx.createBuffer(1, x.length, SR); b.copyToChannel(x, 0); const s = ctx.createBufferSource(); s.buffer = b; s.connect(vd); s.start(t); return s; };
      window.__clicks = (ts) => { const n = Math.round((Math.max(...ts) + 0.1) * SR), x = new Float32Array(n); for (const t of ts) { const i0 = Math.round(t * SR); for (let i = 0; i < 0.004 * SR; i++) x[i0 + i] += 0.4 * Math.sin(2 * Math.PI * 1000 * i / SR) * Math.exp(-i / (0.001 * SR)); } return x; };
      // the first onset after a frame in a Schicht's audio, relative to its pre
      window.__onset = (S, from = -2000, thr = 0.05) => { for (let i = Math.max(-S.pre, from); i < S.n - S.pre; i++) { const p = S.pre + i, c = S.aud[Math.floor(p / M.HX_CH)]; if (c && Math.abs(c[0][p % M.HX_CH]) > thr) return i; } return null; };
      o.on = await M.hxMicOn({ src: bus }); o.est = M.HX.mic.rt; o.estM = M.HX.mic.rtM;
      A.monSt = tap; const t0 = performance.now(), rt = await M.hxMicMessen(); o.ms = performance.now() - t0; A.monSt = mon; tap.disconnect();
      o.rt = rt; o.rtM = M.HX.mic.rtM; o.saved = M.hxDev().mrt;
      M.hxCardRender(); await window.__sleep(100); o.card = M.HXK.mic.textContent;
      return o;
    });
    ok(r.on && !r.estM && r.est > 0, `switched on through a loopback (the monitor out → ${r.D} frames → the „microphone“): until measured the browser's latencies stand for the round trip (${r.est} frames, „geschätzt“)`);
    ok(r.rt != null && Math.abs(r.rt - r.D) <= 48 && r.rtM && r.saved && r.saved.rt === r.rt, `„Verzögerung messen“: eight clicks found in the Mikro's ring – ${r.rt} frames for ${r.D} (±1 ms: ${Math.abs(r.rt - r.D)}), kept for this output, in ${(r.ms / 1000).toFixed(1)} s`);
    ok(/37 ms/.test(r.card) && !/geschätzt/.test(r.card), `  the card shows it („${(r.card.match(/● an[^M]*/) || [''])[0].trim()}“)`);
    // ---------- B4 · a Korb from the Mikro sits on the beat ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, o = {};
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, t0 = M.tgTime(B0), beat = 60 / M.tgBpm(t0);
      window.__sing(window.__clicks([0, 1, 2, 3, 4, 5, 6, 7].map((i) => i * beat)), t0);   // (two bars sung on the beat)
      await window.__until(M.tgTime(B0 + 8) + 0.04); M.hxKorb(null); await window.__sleep(300);
      const L = M.hxLoopsLive()[0]; o.L = !!L; if (!L) return o;
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 60 && !S.aud; i++) await window.__sleep(100);
      o.in = S.cut.in; o.src = L.src; o.on = window.__onset(S); o.on2 = window.__onset(S, Math.round(0.45 * SR)) - Math.round(beat * SR);
      window.__LK = L.key;
      return o;
    });
    ok(r.L && r.in === 3 && r.src === 3 && r.on != null && Math.abs(r.on) <= 48 && Math.abs(r.on2) <= 48, `a Korb from the Mikro: what was sung on the beat sits on it in the Schicht (its first onset ${r.on} frames from the window's start, the second ${r.on2} from its beat; ±1 ms)`);
    // ---------- B5 · overdub and Dieselbe from the Mikro; Bluetooth ----------
    r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, o = {}, L = M.hxLoopsLive().find((x) => x.key === window.__LK);
      // overdub one pass: a note sung 1 s into it
      let k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + 2, a = M.hxT(M.hxPassF(L, k)), b = M.hxT(M.hxPassF(L, k + 1));
      window.__sing(window.__clicks([1.0]), a);
      await window.__until(a - 0.08); M.hxPunchStart(L, a); o.punch = !!M.HX.punch;
      await window.__until(b + 0.02); M.hxPunchEnd(b);
      await window.__sleep(300);
      const P = L.sch.map((id) => M.HX.sch.get(id)).find((S) => S && S.kind === 'punch'); o.P = !!P;
      if (P) { for (let i = 0; i < 60 && !P.aud; i++) await window.__sleep(100); o.pin = P.cut.in; o.pon = P.aud ? window.__onset(P, 0) - Math.round(1.0 * SR) : null; }
      // Dieselbe: a pass sung to, then gathered into the loop
      M.setParam('hx.modus', 'dieselbe'); M.HX.fokus = L.slot + 1;
      k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + 2; a = M.hxT(M.hxPassF(L, k)); b = M.hxT(M.hxPassF(L, k + 1));
      window.__sing(window.__clicks([0.5]), a);
      await window.__until(b + 0.05);
      const n0 = L.sch.length, plan = M.hxRetroPlan(L, A.ctx.currentTime); o.plan = plan ? plan.kind : null;
      if (plan) M.hxRetroDo(plan);
      await window.__sleep(300);
      const R = L.sch.length > n0 ? M.HX.sch.get(L.sch[L.sch.length - 1]) : null; o.R = !!R;
      if (R) { for (let i = 0; i < 60 && !R.aud; i++) await window.__sleep(100); o.rin = R.cut.in; o.ron = R.aud ? window.__onset(R, 0) - Math.round(0.5 * SR) : null; }
      M.setParam('hx.modus', 'neu'); M.HX.fokus = 0;
      // Bluetooth: Myzel 210 ms late
      Object.defineProperty(A.ctx, 'outputLatency', { configurable: true, get: () => 0.21 });
      o.blue = M.hxBlue(); M.hxPunchStart(L, A.ctx.currentTime + 0.1); o.bPunch = !!M.HX.punch; o.bMsg = document.querySelector('#toastMsg').textContent; o.bNew = M.hxMicOk(false);
      if (M.HX.punch) M.hxPunchEnd(A.ctx.currentTime + 0.2);
      delete A.ctx.outputLatency; o.unblue = !M.hxBlue();
      return o;
    });
    ok(r.punch && r.P && r.pin === 3 && r.pon != null && Math.abs(r.pon) <= 48, `overdub from the Mikro: a note sung 1 s into the pass sits there in the new Schicht (${r.pon} frames off; ±1 ms)`);
    ok(r.plan && r.R && r.rin === 3 && r.ron != null && Math.abs(r.ron) <= 48, `Dieselbe from the Mikro: the pass sung to, gathered into the loop (${r.plan}) – a note 0.5 s in sits there (${r.ron} frames off)`);
    ok(r.blue && !r.bPunch && /Bluetooth/.test(r.bMsg) && r.bNew && r.unblue, `Bluetooth (an output latency of 210 ms): an overdub with the microphone refused with a word („${r.bMsg.slice(0, 60)}…“), a new Mikro-Schleife still goes`);
    // ---------- B6 · Gesang als Noten on a sung Mikro-Schleife; it then plays with Myzel's voices ----------
    r = await ev(async (MEL) => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, o = {};
      await window.__reset(); window.__grid(120);
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4, t0 = M.tgTime(B0), sp = (60 / M.tgBpm(t0)) / 0.5;
      const notes = MEL.map(([d, s, dur, leg]) => [s * sp, dur * sp, M.N.notes[d].f, leg]), V = window.__voice(notes, SR);
      window.__sing(V.x, t0);
      await window.__until(M.tgTime(B0 + 8) + 0.04); M.hxKorb(null); await window.__sleep(300);
      const L = M.hxLoopsLive()[0]; o.L = !!L; if (!L) return o;
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 80 && !S.aud; i++) await window.__sleep(100);
      M.hxCardOpen(L.slot); await window.__sleep(300);
      o.btn = [...document.querySelectorAll('.hx-card button')].some((b) => b.textContent === 'Gesang als Noten');
      const tg = performance.now(); o.n = await M.hxGesang(L); o.ms = performance.now() - tg;
      const rec = S.wn; o.gesang = !!(rec && rec.gesang && L.gesang); o.wahl = M.hxWAktiv(L);
      o.degs = rec ? rec.n.map((x) => [x.deg, x.oct]) : []; o.want = MEL.map(([d]) => { const D = M.hxDeg(M.N.notes[d].f); return [D.deg, D.oct]; });
      o.ts = rec ? rec.n.map((x) => x.t) : []; o.wt = MEL.map(([, s]) => s * 2);   // (beats)
      // the loop then grows on them: its passes rendered from the notes with Myzel's voices (Wuchs, the Werk-Rahmen)
      const k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + 2; o.pn = M.hxPassNotes(L, k).length;
      await window.__until(M.hxT(M.hxPassF(L, k)) + 0.2);
      const mt = await window.__meter(L.id, 1500); o.lvl = Math.max(...mt.map((x) => x[1])); o.wu = [...L.sch].some((id) => { const X = M.HX.sch.get(id); return X && (X.wu || X.ws); }) || M.HX.ws > 0;
      return o;
    }, MEL);
    ok(r.L && r.btn && r.n === MEL.length && r.gesang && r.wahl, `Gesang als Noten on a sung Mikro-Schleife: ${r.n} notes (${MEL.length} sung), read in ${r.ms ? r.ms.toFixed(0) : '?'} ms; Wuchs on it`);
    const degOk = r.degs && r.degs.length === r.want.length && r.degs.every((d, i) => d[0] === r.want[i][0] && d[1] === r.want[i][1]);
    const tOk = r.ts && r.ts.length === r.wt.length && r.ts.every((t, i) => Math.abs(t - r.wt[i]) < 0.1);
    ok(degOk && tOk, `  each on the degree it was sung on (${(r.degs || []).map((d) => d.join('/')).join(' ')}), its onset within a tenth of a beat`);
    ok(r.pn === MEL.length && r.wu && r.lvl > 0.003, `  the loop then grows on them: a pass of ${r.pn} notes rendered with Myzel's voices, streamed and heard (level ${r.lvl ? r.lvl.toFixed(3) : '?'})`);
    // ---------- B7 · the settings at 360 px ----------
    await page.setViewportSize({ width: 360, height: 740 });
    r = await ev(async () => {
      const M = window.__M; M.hxCardRender(); await window.__sleep(300);
      let box = M.HXK.mic.firstElementChild; if (!box) return { dbg: [M.HXK.mic.isConnected, M.HXK.mic.childNodes.length, !!M.HXK.sec, M.HXK.mic.innerHTML.slice(0, 80)] };
      M.hxCardOpen(M.hxLoopsLive()[0].slot); await window.__sleep(600);
      const fb = document.querySelector('[aria-controls="kc-hxset"]'), body = document.getElementById('kc-hxset'); if (body && body.hidden && fb) fb.click(); await window.__sleep(300);
      box = M.HXK.mic.firstElementChild; box.scrollIntoView(); await window.__sleep(200);
      const rc = box.getBoundingClientRect(), over = [...box.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && q.right > 360 + 0.5; }).length;
      const sign = document.querySelector('#hxMic').getBoundingClientRect();
      return { w: rc.width, right: rc.right, over, sr: sign.right, sw: sign.width };
    });
    await page.evaluate(() => window.__M.hxMicOn({ src: window.__lb.bus })).catch(() => {}); await page.waitForTimeout(400);
    await page.evaluate(() => { window.__M.hxCardRender(); window.__M.HXK.mic.firstElementChild.scrollIntoView(); }); await page.waitForTimeout(300);
    await page.screenshot({ path: (process.env.SHOTS || __dirname + '/out') + '/mikro-360.png' });   // (look at it: the settings and the sign)
    ok(r.w > 0 && r.right <= 360.5 && r.over === 0 && r.sr <= 360.5, `the microphone's settings fit 360 px (${r.w ? r.w.toFixed(0) : '?'} px wide, nothing beyond), its sign too` + (r.dbg ? ' ' + JSON.stringify(r.dbg) : ''));
    await page.setViewportSize({ width: 1280, height: 800 });
    await ev(() => { window.__M.hxMicOff(); });
  }
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
