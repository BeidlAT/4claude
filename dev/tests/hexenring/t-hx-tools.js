// Hexenring – Werkzeug (SPEC §14, §12.1c/d, §13 Folge/Puls ernten/Klang aufs Feld, §16 Bühnenansicht; tests §22):
//  speed    offline: a speed step at the seam glides with the motor's inertia and lands in phase (the content where a
//           switch at once would have put it, within ½ frame), an octave down / a fifth up at the pitch it should be;
//           an octave up through the narrower kernel – a 15-kHz tone's fold to 18 kHz ≤ −80 dB
//  stopp    offline: Bandstopp – the pitch falls to standstill, silence after it, no edge, {bandstopp} reported
//  vb       offline: Verblassen – pass k at fb^k (each Schicht by its own age)
//  abr      offline: Abrieb – deeper every pass at the same places, the same seed the same wear, off: the tape exactly
//  slices   offline: Auslassen (a share of the onsets rests, the same seed the same pattern, another seed another),
//           Würfeln (every grid place sounds, slices thrown), the slices' edges no harder than the material's own
//  band     live: rückwärts (the audio mirrored exactly, ↶ back), Trimmen (½, ◀ ▶, ganz), Verdoppeln (twice as long,
//           both halves alike), the tools' settings in the processor, back after a reload
//  notes    the notes' tools: Stufe ±1, Krebs, Umkehrung, dünner, dichter, straffen (unit, on a note record), the
//           Wuchs pass made with them; the groove's swing → „Puls übernimmt“
//  wuchs    live with the Werk-Rahmen: a tool makes the loop grow (Treu); Erstarren – the pass that sounds becomes the
//           Abdruck, exactly; the Auslese's consensus as Wuchs
//  export   a loop as a take (one pass, seamless, as it sounds), its notes as a Standard MIDI File (format 1)
//  feld     Klang aufs Feld; Puls ernten (the lanes' audio from their own ring, their notes, „danach stumm“)
//  form     Folge: Lichtungen in order with pass counts, in a circle
//  stage    Bühnenansicht (big rail, a pedal legend, few toasts, the sheet on a long press), Setliste (next song: the
//           loops to the graveyard with their song, back with it)
//  ruhe     a take's preview counts as sound (idleSrc) and wakes the graph
//   node t-hx-tools.js        env: PARTS=speed,stopp,…
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const PARTS = (process.env.PARTS || 'speed,stopp,vb,abr,slices,band,notes,wuchs,export,feld,form,stage,ruhe').split(','), has = (p) => PARTS.includes(p);
async function otools(page) {
  await page.evaluate(() => {
    window.__ch = (x, y) => window.__chunks(x.length, (i) => x[i], y ? (i) => y[i] : null);
    window.__sinx = (n, f, a, SR) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin((2 * Math.PI * f * i) / SR); return x; };
    window.__rms = (y, a, b) => { let s = 0; for (let i = a; i < b; i++) s += y[i] * y[i]; return Math.sqrt(s / Math.max(1, b - a)); };
    window.__gz = (y, a, n, f, SR) => { const w = (2 * Math.PI * f) / SR, c = 2 * Math.cos(w); let s1 = 0, s2 = 0; for (let i = 0; i < n; i++) { const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n), s0 = y[a + i] * h + c * s1 - s2; s2 = s1; s1 = s0; } return (2 * Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2))) / (n / 2); };
    window.__zc = (y, a, b, SR) => { let z = [], p = y[a]; for (let i = a + 1; i < b; i++) { if (p < 0 && y[i] >= 0) z.push(i - 1 + -p / (y[i] - p)); p = y[i]; } return z.length > 2 ? ((z.length - 1) * SR) / (z[z.length - 1] - z[0]) : 0; };
    window.__drumx = (SR, bars, bpm, per = 8) => {
      const beat = (SR * 60) / bpm, len = Math.round(bars * 4 * beat), n = len + Math.round(beat), on = [], x = new Float32Array(n);
      for (let i = 0; i < bars * per + per / 4; i++) on.push(Math.round((i * 4 * beat) / per));
      for (const [i, o] of on.entries()) { const a = i % per === 0 ? 0.9 : 0.3 + 0.1 * (i % 5); for (let j = 0; j < Math.round(0.25 * SR) && o + j < n; j++) { const t = j / SR, e = Math.min(1, t / 0.001) * Math.exp(-t / 0.03); x[o + j] += a * e * Math.sin(2 * Math.PI * 1000 * t); } }
      return { x, len, n, on: on.filter((o) => o < len) };
    };
    // an offline ring: messages, frames; → {y (left), z (right), got}
    window.__orun = async (N, msgs, SR = 48000) => { const ctx = await window.__ringCtx(N, SR), ring = window.__ring(ctx, { msgs }); ring.connect(ctx.destination, 0); const b = await ctx.startRendering(); await window.__sleep(0); return { y: b.getChannelData(0), z: b.getChannelData(1), got: ring.__got }; };
  });
}
(async () => {
  let { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await otools(page);

  // ---------- speed ----------
  if (has('speed')) {
    const r = await ev(async () => {
      const SR = 48000, len = 96000, n = len + 9600, idx = new Float32Array(n); for (let i = 0; i < n; i++) idx[i] = i / 1048576;
      const seg = [[0, 0, 24000]], f = 2 * len, T = 24000;
      const base = [{ seg, reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } }];
      // the servo: an octave down from the third pass – the position at the glide's end and at the pass's end
      const a = await window.__orun(f + 2 * 2 * len + 10, base.concat([{ schicht: { loop: 1, id: 1, chunks: window.__ch(idx), n, pre: 0, len, join: 'cut', fin: 0 } }, { geom: { loop: 1, beats: 8, f } }, { band: { loop: 1, vs: 0.5, T, f } }]));
      const pos = (i) => a.y[i] * 1048576, P1 = 2 * len;
      const landT = pos(f + T) - 0.5 * T, endP = pos(f + P1 - 1) - (len - 0.5), next = pos(f + P1 + 100) - 50;
      let minR = 9, maxR = 0; for (let i = f + 64; i < f + T; i += 64) { const q = (pos(i + 32) - pos(i - 32)) / 64; minR = Math.min(minR, q); maxR = Math.max(maxR, q); }
      const after = (pos(f + T + 9000) - pos(f + T + 1000)) / 8000;
      // pitch: a 1-kHz sine an octave down and a fifth up
      const sx = window.__sinx(n, 1000, 0.5, SR), out = {};
      for (const [vs, beats] of [[0.5, 8], [1.5, 8 / 3]]) {
        const b = await window.__orun(f + 3 * len, base.concat([{ schicht: { loop: 1, id: 1, chunks: window.__ch(sx), n, pre: 0, len, join: 'xf', X: 480, fin: 0 } }, { geom: { loop: 1, beats, f } }, { band: { loop: 1, vs, T: 4800, f } }]));
        out[vs] = window.__zc(b.y, f + 9600, f + 9600 + 24000, SR);
      }
      // an octave up: a 15-kHz tone – its fold (30 kHz → 18 kHz) through the narrow kernel
      const hx = window.__sinx(n, 15000, 0.5, SR);
      const c = await window.__orun(f + 2 * len, base.concat([{ schicht: { loop: 1, id: 1, chunks: window.__ch(hx), n, pre: 0, len, join: 'xf', X: 480, fin: 0 } }, { geom: { loop: 1, beats: 2, f } }, { band: { loop: 1, vs: 2, T: 480, f } }]));
      const fold = window.__gz(c.y, f + 4800, 16384, 18000, SR), ref = window.__gz(c.y, 4800, 16384, 15000, SR);
      return { landT, endP, next, minR, maxR, after, f05: out[0.5], f15: out[1.5], fold: 20 * Math.log10(Math.max(1e-12, fold / 0.5)), ref: 20 * Math.log10(ref / 0.5) };
    });
    ok(Math.abs(r.landT) < 0.5 && Math.abs(r.endP) < 0.6 && Math.abs(r.after - 0.5) < 1e-4, `speed ½ at the seam: the servo lands in phase (at the glide's end ${r.landT.toFixed(3)} frames, at the pass's end ${r.endP.toFixed(3)}), then 0.5 exactly (${r.after.toFixed(5)})`);
    ok(r.minR < 0.5 && r.minR > 0.35 && r.maxR <= 1.0001, `  the motor's inertia: from 1 down to ${r.minR.toFixed(3)} (passes the target by ≤ 22 % of the step) and back to 0.5`);
    ok(Math.abs(r.next) < 1, `  the next pass starts from the tape's start (${r.next.toFixed(2)})`);
    ok(Math.abs(r.f05 - 500) < 0.5 && Math.abs(r.f15 - 1500) < 1.5, `  pitch follows: 1000 Hz → ${r.f05.toFixed(2)} Hz (½), ${r.f15.toFixed(2)} Hz (1½)`);
    ok(r.fold < -80, `  an octave up: a 15-kHz tone's fold at 18 kHz ${r.fold.toFixed(1)} dB (≤ −80; the tone at the tape's speed ${r.ref.toFixed(1)} dB)`);
  }

  // ---------- stopp ----------
  if (has('stopp')) {
    const r = await ev(async () => {
      const SR = 48000, len = 96000, n = len + 9600, x = window.__sinx(n, 440, 0.5, SR), f = 120000, T = 24000;
      const a = await window.__orun(f + T + 24000, [{ seg: [[0, 0, 24000]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } }, { schicht: { loop: 1, id: 1, chunks: window.__ch(x), n, pre: 0, len, join: 'xf', X: 480, fin: 0 } }, { band: { loop: 1, stop: 1, T, f } }]);
      const fr = [0, 0.1, 0.2, 0.3].map((u) => window.__zc(a.y, f + u * T, f + u * T + 1200, SR));
      let tail = 0; for (let i = f + T; i < a.y.length; i++) tail = Math.max(tail, Math.abs(a.y[i]));
      let d0 = 0, d1 = 0; for (let i = 1000; i < f; i++) d0 = Math.max(d0, Math.abs(a.y[i] - a.y[i - 1])); for (let i = f; i < f + T + 10; i++) d1 = Math.max(d1, Math.abs(a.y[i] - a.y[i - 1]));
      const ek = Math.exp(-5), rr = (x) => (Math.exp(-5 * x) - ek) / (1 - ek), want = [0, 0.1, 0.2, 0.3].map((u) => { let s = 0; for (let j = 0; j < 1200; j++) s += rr(u + j / T); return (440 * s) / 1200; });
      return { fr, want, tail, d0, d1, msg: a.got.some((m) => m.bandstopp) };
    });
    ok(r.fr.every((v, i) => Math.abs(v / r.want[i] - 1) < 0.03), `Bandstopp: the pitch runs down exponentially (${r.fr.map((v) => v.toFixed(0)).join(' → ')} Hz; the law ${r.want.map((v) => v.toFixed(0)).join(' → ')})`);
    ok(r.tail === 0 && r.msg, `  standstill: silence after it (${r.tail}), {bandstopp} reported`);
    ok(r.d1 <= r.d0 * 1.0001, `  no edge: the largest step ${r.d1.toFixed(4)} ≤ the tone's own ${r.d0.toFixed(4)}`);
  }

  // ---------- vb ----------
  if (has('vb')) {
    const r = await ev(async () => {
      const SR = 48000, len = 96000, n = len + 9600, x = window.__sinx(n, 500, 0.5, SR);
      const a = await window.__orun(6 * len, [{ seg: [[0, 0, 24000]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } }, { schicht: { loop: 1, id: 1, chunks: window.__ch(x), n, pre: 0, len, join: 'xf', X: 480, fin: 0 } }, { vb: { schicht: 1, fb: 0.8 } }]);
      return [0, 1, 2, 3, 4, 5].map((k) => window.__rms(a.y, k * len + 24000, k * len + 72000) / (0.5 / Math.SQRT2));
    });
    ok(r.every((g, k) => Math.abs(g - Math.pow(0.8, k)) < 0.002), `Verblassen 0.8: pass k at 0.8^k (${r.map((g) => g.toFixed(3)).join(', ')})`);
  }

  // ---------- abr ----------
  if (has('abr')) {
    const r = await ev(async () => {
      const SR = 48000, len = 96000, n = len + 9600, x = window.__sinx(n, 1000, 0.5, SR), N = 7 * len;
      const m = (o) => [{ seg: [[0, 0, 24000]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 4 } }, { schicht: { loop: 1, id: 1, chunks: window.__ch(x), n, pre: 0, len, join: 'xf', X: 480, fin: 0 } }].concat(o ? [{ abr: Object.assign({ schicht: 1 }, o) }] : []);
      const a = await window.__orun(N, m({ rate: 0.25, seed: 7 })), b = await window.__orun(N, m({ rate: 0.25, seed: 7 })), c = await window.__orun(N, m({ rate: 0.25, seed: 7 }).concat([{ abr: { schicht: 1, off: 1, reset: 1 } }]));
      const same = a.y.every((v, i) => v === b.y[i]);
      const lv = [1, 3, 6].map((k) => window.__rms(a.y, k * len + 2000, (k + 1) * len - 2000));
      // where it is worn: per 1/64 of the pass, the level against the clean one – pass 3 and pass 6
      const prof = (k) => Array.from({ length: 64 }, (_, j) => window.__rms(a.y, k * len + j * 1500, k * len + (j + 1) * 1500) / (0.5 / Math.SQRT2));
      const p3 = prof(3), p6 = prof(6); let cor = 0, sa = 0, sb = 0; const m3 = p3.reduce((u, v) => u + v) / 64, m6 = p6.reduce((u, v) => u + v) / 64; for (let j = 0; j < 64; j++) { cor += (p3[j] - m3) * (p6[j] - m6); sa += (p3[j] - m3) ** 2; sb += (p6[j] - m6) ** 2; }
      let ex = 0; for (let i = 1000; i < N; i++) { if (i % len < 480) continue; ex = Math.max(ex, Math.abs(c.y[i] - x[i % len])); }   // (outside the seams' crossfade)
      const drop = p6.filter((v) => v < 0.05).length;
      return { same, lv, cor: cor / Math.sqrt(sa * sb), ex, drop };
    });
    ok(r.lv[0] > r.lv[1] && r.lv[1] > r.lv[2], `Abrieb: deeper every pass (level ${r.lv.map((v) => v.toFixed(3)).join(' → ')})`);
    ok(r.cor > 0.8 && r.drop >= 1, `  at the same places (the wear's profile, pass 3 against 6: r ${r.cor.toFixed(2)}), worn through: ${r.drop} of 64 places drop out`);
    ok(r.same, '  seeded: the same seed wears the same, sample for sample');
    ok(r.ex === 0, `  off (Auffrischen): the tape exactly (max |d| ${r.ex})`);
  }

  // ---------- slices ----------
  if (has('slices')) {
    const r = await ev(async () => {
      const SR = 48000, d = window.__drumx(SR, 2, 120), u = d.on.map((o) => o / d.len), N = 6 * d.len;
      const m = (o) => [{ seg: [[0, 0, 24000]], reset: 1 }, { loop: { id: 1, lock: 'takt', b0: 0, beats: 8 } }, { schicht: { loop: 1, id: 1, chunks: window.__ch(d.x), n: d.n, pre: 0, len: d.len, join: 'xf', X: 480, fin: 0 } }, { slice: Object.assign({ loop: 1, u }, o) }];
      const a = await window.__orun(N, m({ pd: 0.5, seed: 9 })), b = await window.__orun(N, m({ pd: 0.5, seed: 9 })), c = await window.__orun(N, m({ pd: 0.5, seed: 10 })), w = await window.__orun(N, m({ pw: 0.5, seed: 9 }));
      const at = (y) => { const s = []; for (let k = 0; k < 6; k++) for (const o of d.on) s.push(window.__rms(y, k * d.len + o + 48, k * d.len + o + 1440) > 0.02 ? 1 : 0); return s; };
      const sa = at(a.y), sb = at(b.y), sc = at(c.y), sw = at(w.y);
      const amp = (y) => { const s = []; for (let k = 0; k < 6; k++) for (const o of d.on) s.push(Math.round(100 * window.__rms(y, k * d.len + o + 48, k * d.len + o + 1440))); return s; };
      const aw = amp(w.y), a0 = amp(d.x.length >= 6 * d.len ? d.x : (() => { const z = new Float32Array(6 * d.len); for (let i = 0; i < z.length; i++) z[i] = d.x[i % d.len]; return z; })());
      let dm = 0, dx = 0; for (let i = 1; i < d.len; i++) dx = Math.max(dx, Math.abs(d.x[i] - d.x[i - 1])); for (const y of [a.y, w.y]) for (let i = 1; i < N; i++) dm = Math.max(dm, Math.abs(y[i] - y[i - 1]));
      return { on: sa.reduce((p, q) => p + q, 0), tot: sa.length, same: sa.join() === sb.join() && a.y.every((v, i) => v === b.y[i]), other: sa.join() !== sc.join(), won: sw.reduce((p, q) => p + q, 0), moved: aw.filter((v, i) => Math.abs(v - a0[i]) > 3).length, dm, dx };
    });
    ok(r.on > r.tot * 0.3 && r.on < r.tot * 0.7, `Auslassen 50 %: ${r.on} of ${r.tot} onsets sound`);
    ok(r.same && r.other, '  seeded: the same seed the same pattern, sample for sample; another seed another');
    ok(r.won === r.tot && r.moved >= 8, `Würfeln 50 %: every grid place sounds (${r.won} of ${r.tot}), ${r.moved} slices thrown from elsewhere`);
    ok(r.dm <= r.dx * 1.05, `  the slices' edges: largest step ${r.dm.toFixed(4)} ≤ the material's own ${r.dx.toFixed(4)} (micro-fades)`);
  }

  // ---------- band (live) ----------
  if (has('band')) {
    await ev(async () => { await window.__reset(); window.__grid(120); await window.__sleep(400); });
    const r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, beat = SR / 2, len = 4 * beat, n = len + 2 * beat;
      const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.3 * Math.sin((2 * Math.PI * 300 * i) / SR) * (0.5 + 0.5 * ((i % beat) / beat));   // (a ramp each beat: forward and back are not alike)
      const [aud] = M.hxChunks(n); for (let i = 0; i < n; i++) { aud[Math.floor(i / 8192)][0][i % 8192] = x[i]; aud[Math.floor(i / 8192)][1][i % 8192] = x[i]; }
      const nb = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, L = M.hxLoopMake({ slot: 0, lock: 'takt', b0: nb, beats: 4, bpm: 120 });
      const id = M.hxSchNew(L.id, { in: 1, w0: 0, w1: len, f0: 0, pre: beat, len, post: beat, n: n, aus: null, stale: true }, { aud, join: 'xf', X: 0.01, rho: 0, probe: false, chain: false });
      const S = M.HX.sch.get(id), o = {};
      await window.__sleep(300);
      M.hxRev(L); const a1 = S.aud; let ex = 0; for (let i = 0; i < n; i++) ex = Math.max(ex, Math.abs(a1[Math.floor(i / 8192)][0][i % 8192] - x[n - 1 - i]));
      o.rev = { ex, pre: S.pre, flag: L.rev };
      M.hxUndoStep(); o.revBack = S.aud === aud && !L.rev;
      M.hxBandTrim(L, 'h'); o.trim = { beats: L.d.beats, len: S.len, pre: S.pre };
      M.hxBandTrim(L, '>'); o.trim2 = S.pre;
      M.hxBandTrim(L, 'ganz'); o.ganz = { beats: L.d.beats, len: S.len, pre: S.pre };
      await window.__sleep(2200);
      const ok2 = await M.hxDouble(L); const S2 = M.HX.sch.get(L.sch[0]);
      let dd = 0; for (let i = 0; i < len; i++) { const p = S2.pre + 2000 + i; if (p + len >= S2.n || i > len - 4000) break; const c1 = S2.aud[Math.floor(p / 8192)], c2 = S2.aud[Math.floor((p + len) / 8192)]; dd = Math.max(dd, Math.abs(c1[0][p % 8192] - c2[0][(p + len) % 8192])); }
      o.dbl = { ok: ok2, beats: L.d.beats, len: S2.len, dd };
      M.hxVbSet(L, 0.9); M.hxAbSet(L, 0.1); M.hxSlcSet(L, 'pd', 0.3); M.hxSpeed(L, 0.5);
      o.key = L.key;
      return o;
    });
    ok(r.rev.ex === 0 && r.rev.flag, `rückwärts: the Schicht's audio mirrored exactly (max |d| ${r.rev.ex}), its margins swapped (pre ${r.rev.pre})`);
    ok(r.revBack, '  ↶: forward again, the same audio');
    ok(r.trim.beats === 2 && r.trim.pre > 0 && r.trim2 !== r.trim.pre && r.ganz.beats === 4, `Trimmen ½: 2 beats (${r.trim.len} frames), ▶ shifts the window (pre ${r.trim.pre} → ${r.trim2}), ganz: 4 beats again`);
    ok(r.dbl.ok && r.dbl.beats === 8 && r.dbl.dd < 1e-6, `Verdoppeln: 8 beats, ${r.dbl.len} frames, the two halves alike (max |d| ${r.dbl.dd.toExponential(1)})`);
    // the settings in the processor, and back after a reload
    await page.waitForTimeout(4500);
    let rep = await ev(async (key) => { const M = window.__M, L = M.hxByKey(key), r = await M.hxReport(); const x = r.sl.find((q) => q[0] === L.id); return { vs: x && x[2], sp: L.sp, beats: L.d.beats }; }, r.key);
    ok(rep.vs === 0.5 && rep.sp === 0.5 && rep.beats === 16, `Band ½ from the seam: the loop 16 beats long, the processor's tape at ${rep.vs}`);
    await page.waitForTimeout(1500);
    await page.reload(); await page.waitForFunction(() => !!window.__M); await H.tools(page); await G.gtools(page); await otools(page);
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(2500);
    rep = await ev(async (key) => { const M = window.__M, L = M.hxByKey(key); if (!L) return null; M.hxWeiter(); await window.__sleep(3000); const r = await M.hxReport(), x = r.sl.find((q) => q[0] === L.id); return { vs: x && x[2], sp: L.sp, vb: L.vb, ab: L.ab && L.ab.rate, pd: L.slc && L.slc.pd, dbl: L.dbl }; }, r.key);
    ok(rep && rep.vs === 0.5 && rep.sp === 0.5 && rep.vb === 0.9 && rep.ab === 0.1 && rep.pd === 0.3 && rep.dbl === 2, `  after a reload: Band ½ in the processor, Verblassen, Abrieb, Auslassen, Verdoppeln kept (${JSON.stringify(rep)})`);
    await ev(async () => { await window.__reset(); });
  }

  // ---------- notes (unit) ----------
  if (has('notes')) {
    const r = await ev(() => {
      const M = window.__M, key = Object.assign({ base: 130.81 }, M.hxWScale('0', 'lyd'));
      const mk = (t, deg, oct, vel, d) => ({ t, held: false, d, eng: 'glo', f: 130.81 * Math.pow(2, oct) * key.rat[deg], deg, oct, alt: 0, y0: 0.5, vel, pan: 0, src: 'fin', burst: false, gate: null, hold: true, cy: [], cf: [] });
      const W = { u: 'b', len: 4, key, sd: 0, lanes: [], n: [mk(0, 0, 1, 0.9, 0.4), mk(1.02, 4, 1, 0.5, 0.4), mk(1.5, 2, 1, 0.3, 0.2), mk(2.01, 0, 2, 0.7, 0.4), mk(3.03, 4, 1, 0.5, 0.4)] };
      const S = { wn: W, wseed: 5 }, L = { nt: {}, bpb: 4 }, T = (nt) => { L.nt = nt; S.wnT = null; return M.hxWNotesT(L, S); };
      const up = T({ tr: 1 }), kr = T({ krebs: true }), um = T({ umk: true }), th = T({ dens: -1 }), fi = T({ dens: 1 }), gq = T({ gq: 1 }), lo = T({ gq: -1 });
      const off = (w) => w.n.map((x) => x.t - Math.round(x.t * 4) / 4);
      return { up: up.n.map((x) => x.deg + 7 * x.oct), w: W.n.map((x) => x.deg + 7 * x.oct), upF: up.n[0].f / W.n[0].f, want: key.rat[1] / key.rat[0], kr: kr.n.map((x) => +x.t.toFixed(3)), um: um.n.map((x) => x.deg + 7 * x.oct), th: th.n.length, fi: fi.n.length, gq: off(gq).map((v) => +v.toFixed(4)), lo: off(lo).map((v) => +v.toFixed(4)), ow: off(W).map((v) => +v.toFixed(4)) };
    });
    ok(r.up.every((v, i) => v === r.w[i] + 1) && Math.abs(r.upF - r.want) < 1e-6, `Stufe +1: every note a degree higher in its key (${r.w.join(',')} → ${r.up.join(',')}, C → D ×${r.upF.toFixed(4)})`);
    ok(r.kr.join() === '0.57,1.59,2.3,2.58,3.6', `Krebs: the onsets mirrored at their ends (${r.kr.join(', ')})`);
    ok(r.um.join() === '15,11,13,8,11', `Umkehrung in the scale around the middle note (${r.um.join(',')})`);
    ok(r.th === 4 && r.fi > 5, `dünner: the weakest note goes (5 → ${r.th}); dichter: passing tones (5 → ${r.fi})`);
    const sd = (a) => Math.sqrt(a.reduce((p, q) => p + q * q, 0) / a.length);
    ok(sd(r.gq) < sd(r.ow) && sd(r.lo) > sd(r.ow), `straffen toward the grid and the player's template (spread ${sd(r.ow).toFixed(4)} → ${sd(r.gq).toFixed(4)} beats), lockern wider (${sd(r.lo).toFixed(4)})`);
    const g = await ev(() => {
      const M = window.__M, key = Object.assign({ base: 130.81 }, M.hxWScale('0', 'lyd')), n = [];
      for (let b = 0; b < 2; b++) for (let i = 0; i < 8; i++) n.push({ t: b * 4 + i * 0.5 + (i % 2 ? 0.06 : 0), held: false, d: 0.2, eng: 'glo', f: 261, deg: 0, oct: 1, vel: 0.6, src: 'fin', cy: [], cf: [] });
      const G2 = M.hxGrooveOf({ u: 'b', n, len: 8, key }, 4);
      M.setParam('seq.swing', 0);
      const L = { sch: [1], bpb: 4 }; M.HX.sch.set(1e9, { wn: { u: 'b', n, len: 8, key } }); L.sch = [1e9];
      const sw = M.hxGroovePuls(L); M.HX.sch.delete(1e9);
      return { sw8: G2.sw8, sw, p: M.P['seq.swing'] };
    });
    ok(Math.abs(g.sw8 - 0.06) < 1e-6 && Math.abs(g.p - 0.24) < 0.011, `the groove: off-beat eighths 0.06 beats late → „Puls übernimmt“ sets Swing ${Math.round(g.p * 100)} % (offset ${(g.p * 0.5 * 0.5).toFixed(3)} beats)`);
  }

  // ---------- wuchs (live, Werk-Rahmen) ----------
  if (has('wuchs')) {
    await ev(async () => { await window.__reset(); });
    const r = await ev(async () => {
      const M = window.__M, A = M.A;
      for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'v.human': 0 })) M.setParam(k, v);
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); window.__grid(120); await window.__sleep(700);
      const beat = 0.5, t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__riff(t0, beat, [0, 2, 4, 7], 1, { eng: 'glo', dur: 0.3 });
      await window.__until(t0 + 2 + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}), S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 100 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      const k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))), f0 = M.hxWPass(L, S, k).notes.map((n) => n.f);
      M.hxNtSet(L, 'tr', 1);
      const f1 = M.hxWPass(L, S, k).notes.map((n) => n.f), akt = M.hxWAktiv(L);
      for (let i = 0; i < 120 && S.play !== 'wu'; i++) await window.__sleep(100);
      const play = S.play, wu = S.wu;
      await window.__sleep(2500);
      const ok3 = await M.hxErstarren(L);
      const ex = (() => { if (!wu || !S.aud) return -1; let m = 0; for (let i = 0; i < wu.n; i++) m = Math.max(m, Math.abs(S.aud[Math.floor(i / 8192)][0][i % 8192] - wu.aud[Math.floor(i / 8192)][0][i % 8192])); return m; })();
      const after = { play: S.play, akt: M.hxWAktiv(L), nt: L.nt };
      M.hxUndoStep(); await window.__sleep(200);
      return { n: f0.length, up: f1.map((f, i) => f / f0[i]), akt, play, ok3, ex, after, undoAkt: M.hxWAktiv(L) };
    });
    ok(r.n === 4 && r.up.every((x) => x > 1.05 && x < 1.27) && r.akt, `Stufe +1 on a played loop: it grows (Wuchs), every note of its pass a degree up (×${r.up.map((x) => x.toFixed(3)).join(', ')})`);
    ok(r.play === 'wu', `  its Treu render plays (${r.play})`);
    ok(r.ok3 && r.ex === 0 && r.after.play === 'ab' && !r.after.akt && !r.after.nt, `Erstarren: the pass that sounded is the Abdruck now, exactly (max |d| ${r.ex}), the loop plays it (no Wuchs, the tools baked in)`);
    ok(r.undoAkt, '  ↶: it grows again');
    // the Auslese's consensus (four bars, the last sloppy – as t-hx-ohr – then the meant version as Wuchs)
    const c = await ev(async () => {
      const M = window.__M, A = M.A, beat = 0.5; for (const L of M.hxLoopsLive()) M.hxDelete(L); await window.__sleep(2500);
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, F = [0, 2, 4, 5, 7, 5, 4, 2], list = [];
      for (let c2 = 0; c2 < 4; c2++) for (let i = 0; i < 8; i++) list.push([M.tgTime(B0 + 4 * c2) + (i * beat) / 2 + (c2 === 3 && i % 2 ? 0.03 : 0) + (c2 === 1 && i === 3 ? 0.012 : 0), F[i], i ? 0.6 : 0.9, 0.18]);
      window.__play(list, { eng: 'klb' });
      await window.__until(M.tgTime(B0 + 16) + 0.06);
      M.hxKorb(null); await window.__sleep(1500);
      const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0], S = L && M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 50 && !(S.wn && S.aud); i++) await window.__sleep(100);
      if (!L.ausl) M.hxAusleseFor(L, L.rep);
      const A0 = L.ausl, cons = A0 && A0.cons;
      const offs = cons ? cons.n.map((n) => (n.t * 2 - Math.round(n.t * 2)) * 250) : null;   // (ms off the eighths at 120 BPM)
      const did = M.hxAusleseWuchs(L);
      return { k: A0 && A0.k, p: A0 && A0.p, n: cons && cons.n.length, offs, did, akt: M.hxWAktiv(L), wn: S.wn === cons };
    });
    // (bar 4: every second note 30 ms late; bar 2: the fourth note 12 ms late – the median of four: 0 ms, and 6 ms there)
    ok(c.n === 8 && c.offs.every((v, i) => Math.abs(v - (i === 3 ? 6 : 0)) < 1), `Auslese aus ${c.k} · ${c.p} %, the consensus itself: 8 notes at the median of the four bars (ms off the eighths: ${c.offs ? c.offs.map((v) => v.toFixed(1)).join(' ') : '–'}; the sloppy bar's 30 ms gone)`);
    ok(c.did && c.akt && c.wn, '  „Gemeinte Fassung“: it grows from the consensus (Wuchs)');
  }

  // ---------- export ----------
  if (has('export')) {
    const r = await ev(async () => {
      const M = window.__M, L = M.hxLoopsLive()[0]; if (!L) return null;
      await window.__sleep(1500);
      const n0 = M.takes.length, tk = await M.hxExportTake(L), b = M.hxMidiOf([L]), u = b ? new Uint8Array(await b.arrayBuffer()) : null;
      const str = (a, i, n) => String.fromCharCode(...a.slice(i, i + n));
      let ons = 0; if (u) for (let i = 14; i < u.length - 2; i++) if ((u[i] & 0xf0) === 0x90 && u[i + 2] > 0 && u[i + 1] < 128) ons++;
      const S = M.HX.sch.get(L.sch[0]), W = M.hxWNotesT(L, S);
      return { more: M.takes.length === n0 + 1, seam: tk && tk.seamless, frames: tk && tk.frames, pass: M.hxPassF(L, 1) - M.hxPassF(L, 0), peak: tk && tk.peak, mthd: u && str(u, 0, 4), fmt: u && (u[8] << 8) | u[9], ntrk: u && (u[10] << 8) | u[11], mtrk: u && str(u, 14, 4), ons, notes: W ? W.n.length : 0 };
    });
    ok(r && r.more && r.seam && Math.abs(r.frames - r.pass) <= 1 && r.peak > 0.01, `Als Aufnahme: a take of one pass (${r && r.frames} frames, the pass ${r && r.pass}), seamless, peak ${r && r.peak.toFixed(3)}`);
    ok(r && r.mthd === 'MThd' && r.fmt === 1 && r.ntrk === 2 && r.mtrk === 'MTrk' && r.ons >= r.notes - 1, `MIDI: a Standard MIDI File, format 1, ${r && r.ntrk} tracks (tempo map + the Schicht), ${r && r.ons} note-ons for ${r && r.notes} notes`);
  }

  // ---------- feld ----------
  if (has('feld')) {
    const r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      // a loop played with the Glasharfe while the field plays Nebel
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); window.__grid(120); await window.__sleep(600);
      const t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4); window.__riff(t0, 0.5, [0, 2, 4, 7], 1, { eng: 'glo', dur: 0.3 });
      await window.__until(t0 + 2.05); const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); await window.__sleep(600);
      M.setParam('v.eng', 'neb');
      if (L) { o.feld = M.hxKlangFeld(L); o.eng = M.P['v.eng']; }
      // Puls ernten: one lane playing, two bars, then the last bar as a loop
      for (const X of M.hxLoopsLive()) M.hxDelete(X); await window.__sleep(2500);
      M.setParam('seq.bpm', 120); for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
      M.setParam('l0.on', true); M.setParam('l0.eng', 'klb'); M.setParam('l0.steps', 8); M.setParam('l0.puls', 8); M.setParam('l0.prob', 1); M.setParam('l0.vol', 0.8);
      if (!M.SEQ.on) M.seqStart();
      await window.__sleep(4500);
      const L2 = M.hxPulsErnten(1, true);
      o.stopB = M.SEQ.stopB;
      const S = L2 && M.HX.sch.get(L2.sch[0]);
      for (let i = 0; i < 100 && S && !S.aud; i++) await window.__sleep(100);   // (its Ausklang rings to its end – the Puls stopped)
      let pk = 0; if (S && S.aud) for (const c of S.aud) for (let i = 0; i < c[0].length; i++) pk = Math.max(pk, Math.abs(c[0][i]));
      o.puls = L2 ? { inp: S.cut.in, notes: L2.notes.length, srcs: [...new Set(L2.notes.map((n) => n.src))], pk, beats: L2.d.beats } : null;
      o.seqOn = M.SEQ.on;
      M.setParam('l0.on', false); if (M.SEQ.on) M.seqStop();
      return o;
    });
    ok(r.feld && r.eng === 'glo', `Klang aufs Feld: the field plays the loop's source (${r.eng})`);
    ok(r.puls && r.puls.inp === 2 && r.puls.notes >= 6 && r.puls.srcs.join() === 'l0' && r.puls.pk > 0.01 && r.puls.beats === 4, `Puls ernten: a bar of the lane as a Schleife – its ${r.puls && r.puls.notes} notes (${r.puls && r.puls.srcs}), its audio from the Puls's own ring (peak ${r.puls && r.puls.pk.toFixed(3)})`);
    ok(r.stopB != null && !r.seqOn, `  „danach stumm“: the Puls stops at the bar line (${r.stopB})`);
  }

  // ---------- form: Folge ----------
  if (has('form')) {
    await ev(async () => { await window.__reset(); window.__grid(120); await window.__sleep(400); });
    const r = await ev(async () => {
      const M = window.__M, A = M.A, SR = A.ctx.sampleRate, len = SR * 2;
      const mk = (slot, f) => { const n = len + SR, [aud] = M.hxChunks(n); for (let i = 0; i < n; i++) { const v = 0.2 * Math.sin((2 * Math.PI * f * i) / SR); aud[Math.floor(i / 8192)][0][i % 8192] = v; aud[Math.floor(i / 8192)][1][i % 8192] = v; } const nb = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, L = M.hxLoopMake({ slot, lock: 'takt', b0: nb, beats: 4, bpm: 120 }); M.hxSchNew(L.id, { in: 1, w0: 0, w1: len, f0: 0, pre: 0, len, post: SR, n, aus: null, stale: true }, { aud, join: 'xf', X: 0.01, rho: 0, probe: false, chain: false }); return L; };
      const L1 = mk(0, 300), L2 = mk(1, 450);
      await window.__sleep(500);
      M.hxState(L2.id, 'stumm'); await window.__sleep(100); const A1 = M.hxLichMerken();
      M.hxState(L2.id, 'spielt'); M.hxState(L1.id, 'stumm'); await window.__sleep(100); const A2 = M.hxLichMerken();
      M.hxFolgeSet([{ lich: A1.id, n: 1 }, { lich: A2.id, n: 2 }], true);
      M.hxFolgeStart();
      const seen = [];
      for (let i = 0; i < 90; i++) { await window.__sleep(100); const b = Math.floor(M.tgBeat(A.ctx.currentTime) / 4); const c = M.HX.lichCur === A1.id ? 1 : M.HX.lichCur === A2.id ? 2 : 0; if (!seen.length || seen[seen.length - 1][1] !== c) seen.push([b, c]); }
      M.hxFolgeStop();
      return { seen };
    });
    const s0 = r.seen.filter((x) => x[1]), s = s0.slice(Math.max(0, s0.findIndex((x) => x[1] === 1)));   // (from the Folge's first entry)
    const steps = s.slice(1).map((x, i) => x[0] - s[i][0]);
    ok(s.length >= 3 && s.map((x) => x[1]).slice(0, 3).join() === '1,2,1' && steps[0] === 1 && steps[1] === 2, `Folge 1 ×1 → 2 ×2 ↺: ${s.map((x) => 'L' + x[1] + '@' + x[0]).join(' → ')} (bars)`);
  }

  // ---------- stage ----------
  if (has('stage')) {
    const r = await ev(async () => {
      const M = window.__M, o = {};
      M.setParam('hx.buehne', true); M.hxRailShow(); await window.__sleep(150);
      o.h = document.querySelector('#hxRail').getBoundingClientRect().height;
      o.leg = !!document.querySelector('.hx-leg') && getComputedStyle(document.querySelector('.hx-leg')).display !== 'none';
      M.toast('Nur eine Nachricht'); await window.__sleep(50); o.toast = document.querySelector('#toast').classList.contains('show');
      M.closePanel && M.closePanel(); await window.__sleep(100);
      const tab = document.querySelector('#tab-rec'); tab.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); await window.__sleep(100); o.tapOpen = M.UI.panel === 'rec';
      tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await window.__sleep(650); tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); tab.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); await window.__sleep(100);
      o.holdOpen = M.UI.panel === 'rec';
      M.closePanel(); M.setParam('hx.buehne', false); M.hxRailShow(); await window.__sleep(150);
      o.h0 = document.querySelector('#hxRail').getBoundingClientRect().height;
      // Setliste: two songs, the next one – the loops to the graveyard with their song, back with it
      const S = M.hxSetGet(); S.list.length = 0; S.cur = -1;
      M.hxSetAdd(); M.hxSetAdd(); S.list[0].name = 'Erstes'; S.list[0].bpm = 120; S.list[1].name = 'Zweites'; S.list[1].bpm = 96; S.cur = 0;
      const n0 = M.hxLoopsLive().length;
      M.hxSetNext(); await window.__sleep(300);
      o.set = { loops: M.hxLoopsLive().length, n0, grave: M.HX.grave.filter((g) => g.song === 'Erstes').length, bpm: M.P['seq.bpm'], cur: S.cur };
      M.hxSetGo(0); await window.__sleep(300);
      o.set.back = M.HX.grave.filter((g) => g.song === 'Erstes').length;
      return o;
    });
    ok(r.h === 84 && r.h0 === 56 && r.leg, `Bühnenansicht: the rail 84 px with the pedals' legend (56 px without)`);
    ok(!r.toast, '  few toasts: a plain message is said, not shown');
    ok(!r.tapOpen && r.holdOpen, '  the sheet opens on a long press only');
    ok(r.set.n0 > 0 && r.set.loops === 0 && r.set.grave === r.set.n0 && r.set.bpm === 96 && r.set.cur === 1, `Setliste: „nächstes Lied“ – ${r.set.n0} Schleifen to the graveyard with their song, the next one's tempo (${r.set.bpm} BPM)`);
  }

  // ---------- ruhe ----------
  if (has('ruhe')) {
    const r = await ev(async () => {
      const M = window.__M; for (const L of M.hxLoopsLive()) M.hxDelete(L); M.HX.grave.length = 0; if (M.SEQ.on) M.seqStop(); M.panic();
      const SR = M.A.ctx.sampleRate, tk = { id: Date.now(), name: 'Probe', sr: SR, L: [new Float32Array(SR).fill(0.01)], R: [new Float32Array(SR).fill(0.01)], frames: SR, peak: 0.01, date: new Date(), bars: 0 };
      for (let i = 0; i < 300 && !M.IDLE.on; i++) await window.__sleep(100);   // (nothing sounds: the graph falls asleep)
      const slept = M.IDLE.on, why = { v: M.A.voices.size, bor: !!M.A.bor, seq: M.SEQ.on, loops: M.HX.loops.size, webs: M.HXN.webs.size, ws: M.HX.ws, frozen: M.A.frozen };
      const was = M.idleSrc();
      await M.playTake(tk); await window.__sleep(200);
      const during = M.idleSrc(), awake = !M.IDLE.on;
      M.stopPreview();
      return { slept, was, during, awake, why };
    });
    ok(r && r.slept && !r.was && r.during && r.awake, `Ruhe: a take's preview counts as sound and the graph is awake (${JSON.stringify(r)})`);
  }
  ok(!errors.length, 'no page error' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
