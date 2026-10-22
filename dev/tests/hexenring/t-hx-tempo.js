// Hexenring – audio loops on a tempo change (SPEC §11, owner: „what makes most sense“; tests §22 t-hx-audio-tempo):
//  kind     the harvest's analysis: a drum-like loop (onsets on eighths, accents) is rhythmic, a pad (a slow chord) a
//           Fläche, random onsets mostly not rhythmic
//  schnitt  offline, the processor: a rhythmic loop at ±10 % tempo – its slices re-placed on the new grid: every onset
//           within 2 ms of its beat, each slice's pitch unchanged (never stretched), the first passes at its own tempo
//           the tape exactly (bit for bit), back at its tempo exactly again
//  frei     offline: a Fläche told „frei“ keeps its length – its samples exactly, its seams one own length apart, whatever
//           the tempo does
//  live     in the app: a drum loop and a pad loop at 120 BPM, the tempo to 132 – the pad runs frei at once (its ring
//           says so), the drum loop stays in the Takt and plays in slices (the processor's report), back at 120 the
//           tape; nothing non-finite
//   node t-hx-tempo.js        env: PARTS=kind,schnitt,frei,live
const H = require('./hx-h');
const { ok } = H;
const PARTS = (process.env.PARTS || 'kind,schnitt,frei,live').split(','), has = (p) => PARTS.includes(p);
(async () => {
  const { page, errors } = await H.open({ start: has('live') });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    // a drum-like loop: bursts of a tone (1 kHz, 1-ms attack, 30-ms decay) on every eighth, the downbeats louder; a pad:
    // three sines with a slow swell; random onsets
    window.__drum = (SR, bars, bpm, f = 1000, per = 8, jit) => {
      const beat = (SR * 60) / bpm, len = Math.round(bars * 4 * beat), n = len + Math.round(beat), on = [];
      for (let i = 0; i < bars * per + per / 4; i++) on.push(Math.round((i * 4 * beat) / per + (jit ? jit(i) : 0)));
      const x = new Float32Array(n);
      for (const [i, o] of on.entries()) { const a = (i % per === 0 ? 0.9 : 0.5); for (let j = 0; j < Math.round(0.25 * SR) && o + j < n; j++) { const t = j / SR, e = Math.min(1, t / 0.001) * Math.exp(-t / 0.03); x[o + j] += a * e * Math.sin(2 * Math.PI * f * t); } }
      return { x, len, n, on: on.filter((o) => o < len) };
    };
    window.__pad = (SR, bars, bpm) => {
      const beat = (SR * 60) / bpm, len = Math.round(bars * 4 * beat), n = len + Math.round(beat), x = new Float32Array(n);
      for (let i = 0; i < n; i++) { const t = i / SR; x[i] = 0.2 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.3 * t)) * (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 277.2 * t) + 0.7 * Math.sin(2 * Math.PI * 329.6 * t)); }
      return { x, len, n };
    };
    window.__ch = (x) => window.__chunks(x.length, (i) => x[i]);
    // onsets of a rendered signal: the envelope (1 ms) rising past 0.06 after it was under 0.03
    window.__onsets = (y, from, to) => { const out = []; let e = 0, low = true; const a = Math.exp(-1 / 48); for (let i = from; i < to; i++) { const v = Math.abs(y[i]); e = v > e ? v : a * e; if (low && e > 0.06) { out.push(i); low = false; } else if (!low && e < 0.03) low = true; } return out; };
    // the frequency of a burst: zero crossings over 8 ms from 1 ms after its onset
    window.__freq = (y, o, SR) => { let z = [], p = y[o + 48]; for (let i = o + 49; i < o + 48 + Math.round(0.008 * SR); i++) { if (p < 0 && y[i] >= 0) z.push(i - 1 + -p / (y[i] - p)); p = y[i]; } return z.length > 2 ? ((z.length - 1) * SR) / (z[z.length - 1] - z[0]) : 0; };
  });

  // ---------- kind ----------
  if (has('kind')) {
    const r = await ev(() => {
      const M = window.__M, SR = 48000, L = { d: { lock: 'takt', beats: 8 }, bpb: 4 };
      const art = (x, len) => M.hxArtOf(L, { aud: window.__ch(x), pre: 0, len });
      const d = window.__drum(SR, 2, 120), p = window.__pad(SR, 2, 120), d16 = window.__drum(SR, 2, 120, 600, 16);
      let seed = 3; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      let rnd = 0; for (let k = 0; k < 20; k++) { const x = new Float32Array(192000 + 24000); for (let i = 0; i < 12; i++) { const o = Math.floor(R() * 190000); for (let j = 0; j < 9600 && o + j < x.length; j++) x[o + j] += 0.6 * Math.exp(-j / 1440) * Math.sin(2 * Math.PI * 800 * j / SR); } if (art(x, 192000).art === 'schlag') rnd++; }
      const a1 = art(d.x, d.len), a2 = art(p.x, p.len), a3 = art(d16.x, d16.len);
      return { d: a1.art, dk: a1.k, dn: a1.u.length, p: a2.art, pk: a2.k, s16: a3.art, rnd, uErr: Math.max(...a1.u.map((u) => Math.min(...d.on.map((o) => Math.abs(u * d.len - o))))) };
    });
    ok(r.d === 'schlag' && r.s16 === 'schlag', `a drum loop (eighths, accents) reads rhythmic (clarity ${r.dk.toFixed(2)}, ${r.dn} onsets), sixteenths too`);
    ok(r.uErr <= 48, `  its onsets found within 1 ms of where they are (${r.uErr} frames at most)`);
    ok(r.p === 'flaeche', `a pad (a slow chord) reads as a Fläche (clarity ${r.pk.toFixed(2)})`);
    ok(r.rnd <= 4, `random onsets read rhythmic in ${r.rnd} of 20 – mostly a Fläche (≤ 4)`);
  }

  // ---------- schnitt (offline) ----------
  if (has('schnitt')) for (const f of [1.1, 0.9]) {
    const r = await ev(async (f) => {
      const SR = 48000, d = window.__drum(SR, 2, 120), ch = window.__ch(d.x), u = d.on.map((o) => o / d.len);
      const P0 = 24000, P1 = P0 / f, f1 = 2 * d.len, f2 = f1 + 2 * Math.round(8 * P1), N = f2 + 2 * d.len + 4800;
      const seg = [[0, 0, P0], [f1, 16, P1], [f2, 16 + (f2 - f1) / P1, P0]];
      const ctx = await window.__ringCtx(N, SR);
      const ring = window.__ring(ctx, { msgs: [{ seg, reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: ch, n: d.n, pre: 0, len: d.len, join: 'xf', X: 480, fin: 0 } }, { slice: { loop: 1, u, schnitt: 1 } }] });
      ring.connect(ctx.destination, 0);
      const buf = await ctx.startRendering(), y = buf.getChannelData(0);
      // the first two passes (its own tempo): the tape exactly
      // (outside the seams' crossfade: the pass that ended going on under the start – equal power, not equal samples)
      let ex = 0; for (let i = 0; i < f1 - 480; i++) { if (i >= d.len && i % d.len < 480) continue; ex = Math.max(ex, Math.abs(y[i] - d.x[i % d.len])); }
      // in the new tempo: every onset against its grid place, every burst's pitch
      const fa = (b) => { let i = seg.length - 1; while (i > 0 && seg[i][1] > b) i--; return seg[i][0] + (b - seg[i][1]) * seg[i][2]; };
      const want = []; for (let k = 2; k < 4; k++) for (const o of d.on) want.push(fa(k * 8 + (o / d.len) * 8));
      const got = window.__onsets(y, f1 - 200, f2 - 200);
      let err = 0, miss = 0; for (const w of want) { let b = Infinity; for (const g of got) b = Math.min(b, Math.abs(g - w)); if (b > 480) miss++; else err = Math.max(err, b); }
      let fm = 0; for (const g of got) { const q = window.__freq(y, g, SR); if (q) fm = Math.max(fm, Math.abs(q / 1000 - 1)); }
      // back at its tempo: the tape again (the first pass back after a slice's overhang has rung out)
      const ps = ring.__got.filter((m) => m.passStart).map((m) => m.passStart.f), k2 = ps.find((p) => p > f2 + 1000);   // (the second pass back at its tempo – the first carries the last slice's crossfade)
      let ex2 = k2 == null ? 1 : 0; if (k2 != null) for (let i = k2 + 480; i < k2 + d.len - 480; i++) ex2 = Math.max(ex2, Math.abs(y[i] - d.x[(i - k2) % d.len]));
      return { ex, n: got.length, want: want.length, err: err / 48, miss, fm, ex2, P1 };
    }, f);
    ok(r.ex === 0, `Schnitt ${f > 1 ? '+' : '−'}10 %: at its own tempo the tape exactly (max |d| ${r.ex})`);
    ok(r.miss === 0 && r.err <= 2, `  at ${f > 1 ? 132 : 108} BPM every onset on its grid place: ${r.want} wanted, ${r.n} found, error ≤ ${r.err.toFixed(2)} ms (≤ 2)`);
    ok(r.fm < 0.003, `  no slice changes pitch: every burst at 1000 Hz within ${(r.fm * 100).toFixed(3)} % (never stretched)`);
    ok(r.ex2 === 0, `  back at its tempo: the tape exactly again (max |d| ${r.ex2})`);
  }

  // ---------- frei (offline) ----------
  if (has('frei')) {
    const r = await ev(async () => {
      const SR = 48000, p = window.__pad(SR, 2, 120), ch = window.__ch(p.x), fg = 100000, N = 5 * p.len;
      const seg = [[0, 0, 24000], [150000, 150000 / 24000, 24000 / 1.15]];
      const ctx = await window.__ringCtx(N, SR);
      const ring = window.__ring(ctx, { msgs: [{ seg, reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: ch, n: p.n, pre: 0, len: p.len, join: 'xf', X: 1920, fin: 0 } }, { geom: { loop: 1, lock: 'frei', L: p.len, f: fg } }] });
      ring.connect(ctx.destination, 0);
      const buf = await ctx.startRendering(), y = buf.getChannelData(0);
      const starts = ring.__got.filter((m) => m.passStart).map((m) => m.passStart.f);
      let ex = 0; for (let i = 0; i < N; i++) { const j = i % p.len; if (j < 1920 + 4 && i > 1920) continue; ex = Math.max(ex, Math.abs(y[i] - p.x[j])); }
      return { starts, len: p.len, ex };
    });
    ok(r.starts.length >= 4 && r.starts.every((f, i) => f === i * r.len), `frei: passes one own length apart while the tempo changes (+15 %): ${r.starts.join(', ')}`);
    ok(r.ex === 0, `  the pad's samples exactly, outside its seams' crossfade (max |d| ${r.ex})`);
  }

  // ---------- live ----------
  if (has('live')) {
    const r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate;
      M.setParam('seq.bpm', 120); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart();
      await window.__sleep(600);
      const mk = (o, slot) => {
        const nb = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, [aud] = M.hxChunks(o.n); for (let i = 0; i < o.n; i++) { aud[Math.floor(i / 8192)][0][i % 8192] = o.x[i]; aud[Math.floor(i / 8192)][1][i % 8192] = o.x[i]; }
        const L = M.hxLoopMake({ slot, lock: 'takt', b0: nb, beats: 8, bpm: 120 });
        const id = M.hxSchNew(L.id, { in: 1, w0: 0, w1: o.len, f0: 0, pre: 0, len: o.len, post: o.n - o.len, n: o.n, aus: null, stale: true }, { aud, join: 'xf', X: 0.01, rho: 0, probe: false, chain: false });
        M.hxBandFill(M.HX.sch.get(id));
        return L;
      };
      const D = mk(window.__drum(SR, 2, 120), 0), Pd = mk(window.__pad(SR, 2, 120), 1);
      await window.__sleep(4500);
      const rep0 = await M.hxReport();
      M.setParam('seq.bpm', 132); await window.__sleep(300);
      const frei = Pd.d.lock, word = M.hxLenText(Pd), drumLock = D.d.lock;
      await window.__sleep(4500);
      const rep1 = await M.hxReport();
      M.setParam('seq.bpm', 120); await window.__sleep(4800);
      const rep2 = await M.hxReport();
      const sl = (rep, L) => { const x = rep && rep.sl && rep.sl.find((q) => q[0] === L.id); return x ? x[1] : null; };
      const out = { arts: [D.art, Pd.art], frei, word, drumLock, sl0: sl(rep0, D), sl1: sl(rep1, D), sl2: sl(rep2, D), nan: (M.HX.nan || []).length };
      M.hxDelete(D); M.hxDelete(Pd); M.seqStop();
      return out;
    });
    ok(r.arts[0] === 'schlag' && r.arts[1] === 'flaeche', `live: the drum loop rhythmic, the pad a Fläche (${r.arts.join(', ')})`);
    ok(r.frei === 'frei' && /frei/.test(r.word) && r.drumLock === 'takt', `  tempo 120 → 132: the pad runs frei at once („${r.word}“), the drum loop stays in the Takt`);
    ok(r.sl0 === 0 && r.sl1 === 1 && r.sl2 === 0, `  the drum loop: the tape at 120 (${r.sl0}), slices at 132 (${r.sl1}), the tape again back at 120 (${r.sl2})`);
    ok(r.nan === 0 && !errors.length, 'nothing non-finite, no page error' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  }
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
