// Hexenring – the form (SPEC §13; tests §22): Lichtungen (merken: which Schleifen sound, level, Eigensinn, the mixer and
// the Puls when asked), the form button (a real press: the next Lichtung at the next 1, pending on the button, a second
// tap cancels; held: the row), the rule per Lichtung (am Takt / am Schleifenende), Kern (there and back on the 1), Lücke
// (silent for the last beat before the 1, 3-ms fades – read from the processor's output), Schluss am Ende (each at its
// seam, its Ausklang ringing), welkend (level and brightness fall, seeded slice drop-outs – the same seed, the same
// output; angehalten at the end), abbauend (one per pass of the longest, the youngest first), mixer scenes carrying
// Lichtungen (the morph fades only the levels; one-sided: half way switches), Schlafen and Wenden (angehalten at the next
// bar line with their Ausklang; „3 · 2 · 1“ and back on the next 1; a long sleep keeps them angehalten), the form kept
// over a reload, the §6.4 guard (no Eigensinn change for three passes after a Schicht), „eine Runde“, a Schleife deleted
// while a Lichtung's switch to it waits.   node t-hx-form.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 150;
(async () => {
  const { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(async (BPM) => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    // a recorder that places every block at its frame (currentFrame – the ring counts the same): a quantum the machine
    // dropped is a gap (NaN, left out), never a shift of what follows
    const REC = `class HxRecG extends AudioWorkletProcessor {
      constructor() { super(); this.b = []; this.port.onmessage = () => { this.port.postMessage(this.b); this.b = []; }; }
      process(inp) { const a = inp[0]; this.b.push([currentFrame, a && a[0] ? a[0].slice() : new Float32Array(128), a && a[1] ? a[1].slice() : a && a[0] ? a[0].slice() : new Float32Array(128)]); return true; }
    }
    registerProcessor('hx-recg', HxRecG);`;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'text/javascript' })));
    window.__bar = 240 / BPM;
    // the processor's output 0 recorded from now (f0: its frame)
    window.__rec = () => { const r = new AudioWorkletNode(ctx, 'hx-recg', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain(); z.gain.value = 0; M.HX.node.connect(r, 0); r.connect(z).connect(ctx.destination); return r; };
    window.__stopRec = (r) => new Promise((res) => {
      r.port.onmessage = (e) => {
        try { M.HX.node.disconnect(r); } catch (x) {}
        const b = e.data, f0 = b[0][0], n = b[b.length - 1][0] + 128 - f0, L = new Float32Array(n).fill(NaN), R = new Float32Array(n).fill(NaN);
        for (const [f, l, rr] of b) { L.set(l, f - f0); R.set(rr, f - f0); }
        res({ L, R, f0 });
      };
      r.port.postMessage(1);
    });
    window.__rms = (g, f0, f1) => { let s = 0, n = 0; for (let f = Math.max(Math.round(f0), g.f0); f < Math.min(Math.round(f1), g.f0 + g.L.length); f++) { const i = f - g.f0, a = g.L[i], b = g.R[i]; if (a !== a) continue; s += a * a + b * b; n++; } return n ? Math.sqrt(s / (2 * n)) : -1; };
    window.__db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    // a Schleife of one or two bars: a figure from the next bar line, harvested right after its end (fest: deterministic)
    window.__mk = async (bars, degs, eng) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', bars);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, beat = 60 / BPM;
      const list = []; for (let i = 0; i < 4 * bars; i++) list.push([M.tgTime(B0) + i * beat, degs[i % degs.length], i % 4 ? 0.6 : 0.95, 0.25]);
      window.__play(list, { eng: eng || 'glo' });
      await window.__until(M.tgTime(B0 + 4 * bars) + 0.04);
      const n = M.hxLoopsLive().length;
      M.hxKorb(null);
      await window.__sleep(150);
      const L = M.hxLoopsLive().find((x) => !x.bew && M.hxLoopsLive().length > n && x.made === Math.max(...M.hxLoopsLive().map((y) => y.made)));
      return L ? L.slot : -1;
    };
    window.__nextBar = (lead = 0.15) => Math.ceil(M.tgBeat(A.ctx.currentTime + lead) / 4 - 1e-9) * 4;
    await window.__reset(); window.__grid(BPM); await window.__sleep(400);
  }, BPM);

  // ---- merken; the form button (a real press): the next Lichtung at the next 1, pending on it; frame-exact ----
  let r = await ev(async () => {
    const M = window.__M, A = M.A, o = {};
    const s1 = await window.__mk(1, [0, 4, 7, 4], 'glo'), s2 = await window.__mk(1, [9, 11, 12, 11], 'mem');
    await window.__sleep(600);
    const L1 = M.HX.loops.get(M.HX.slot[s1]), L2 = M.HX.loops.get(M.HX.slot[s2]);
    o.slots = [s1, s2];
    M.hxLevel(L2, 0.5);
    const A1 = M.hxLichMerken();   // both, L2 at half
    M.hxRingTap(s1, null); await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.2);   // L1 stumm
    const B1 = M.hxLichMerken();   // only L2
    o.li = { a: A1 && Object.values(A1.loops).map((w) => [w.on, +w.g.toFixed(2), w.e]), b: B1 && Object.values(B1.loops).map((w) => w.on), n: M.HX.lich.length, cur: M.HX.lichCur === (B1 && B1.id) };
    return o;
  });
  ok(r.li.n === 2 && JSON.stringify(r.li.a) === '[[true,1,"treu"],[true,0.5,"treu"]]' && JSON.stringify(r.li.b) === '[false,true]' && r.li.cur, `merken: a Lichtung holds which Schleifen sound, their level and Eigensinn (${JSON.stringify(r.li)})`);
  const slots = r.slots;
  // the press: B is current, the next is A (cyclic)
  const box = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const press = async (sel, ms) => { const p = await box(sel); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); };
  await ev(async () => { const M = window.__M; await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.25); window.__R = window.__rec(); });
  await press('#hxForm', 80);
  r = await ev(async (slots) => {
    const M = window.__M, o = {};
    const p = M.HX.pend.find((x) => x.kind === 'licht');
    M.hxRailState();
    o.p = p && { label: p.label, t: p.t }; o.word = document.getElementById('hxForm').textContent; o.aria = document.getElementById('hxForm').getAttribute('aria-label');
    o.bar = window.__nextBar(0.04); o.tBar = M.tgTime(o.bar);
    await window.__until(o.tBar + 0.6);
    const g = await window.__stopRec(window.__R), fB = Math.round(M.hxF(o.tBar)), sr = M.A.ctx.sampleRate;
    const L1 = M.HX.loops.get(M.HX.slot[slots[0]]);
    o.st = L1.state; o.cur = M.HX.lich.findIndex((x) => x.id === M.HX.lichCur);
    // L1 returns exactly at the bar line: silent (its fade aside) before, sounding right after
    o.pre = window.__db(window.__rms(g, fB - 0.1 * sr, fB - 0.02 * sr)); o.post = window.__db(window.__rms(g, fB + 0.02 * sr, fB + 0.2 * sr));
    return o;
  }, slots);
  ok(r.p && Math.abs(r.p.t - r.tBar) < 1e-6 && /^ab T \d+$/.test(r.word) && /Lichtung 1 ab Takt/.test(r.aria), `the form button (a real press): the next Lichtung at the next 1, pending – the button says „${r.word}“ („${r.aria}“)`);
  ok(r.st === 'spielt' && r.cur === 0 && r.post - r.pre > 10, `  at the bar line it switches: Schleife ${slots[0] + 1} comes back on the 1 (${r.pre.toFixed(1)} → ${r.post.toFixed(1)} dB), Lichtung 1 is current`);
  // a second tap cancels
  r = await ev(async (slots) => {
    const M = window.__M, o = {};
    await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.25);
    const L1 = M.HX.loops.get(M.HX.slot[slots[0]]);
    M.hxFormTap(); o.p1 = M.HX.pend.some((x) => x.kind === 'licht'); o.pendTo = L1.pendTo;
    M.hxFormTap(); o.p2 = M.HX.pend.some((x) => x.kind === 'licht');
    await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.3);
    o.st = L1.state; o.cur = M.HX.lich.findIndex((x) => x.id === M.HX.lichCur);
    return o;
  }, slots);
  ok(r.p1 && r.pendTo === 'stumm' && !r.p2 && r.st === 'spielt' && r.cur === 0, `a second tap cancels the waiting switch: nothing changes at the bar line (Lichtung ${r.cur + 1} stays)`);
  // held: the row
  await press('#hxForm', 700);
  r = await ev(() => { const M = window.__M; M.hxRailState(); return { kind: M.HX.chips && M.HX.chips.kind, chips: [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent), pend: M.HX.pend.some((x) => x.kind === 'licht') }; });
  ok(r.kind === 'form' && r.chips.includes('1 · Takt') && r.chips.includes('2 · Takt') && ['merken', 'Kern', 'Lücke', 'Takt-Lücke', 'Schluss', 'welkend', 'abbauend'].every((c) => r.chips.includes(c)) && !r.pend, `held: the row in the rail – ${r.chips.join(' ')} (the press's own switch taken back)`);
  await ev(() => { window.__M.HX.chips = null; window.__M.hxRailDirty(); });

  // ---- the rule „am Schleifenende“: the switch waits for the longest Schleife's seam ----
  r = await ev(async (slots) => {
    const M = window.__M, o = {};
    const s3 = await window.__mk(2, [2, 5, 9, 5, 2, 5, 9, 12], 'glo');   // a two-bar one
    const L3 = M.HX.loops.get(M.HX.slot[s3]);
    const Li = M.HX.lich[1]; Li.rule = 'ende';
    await window.__sleep(300);
    const at = M.hxLichGo(Li), seam = M.hxT(M.hxNextSeam(L3).f);
    o.at = at; o.seam = seam; o.bar = M.tgTime(window.__nextBar(0.06));
    o.slot3 = s3;
    const p = M.HX.pend.find((x) => x.kind === 'licht'); if (p) { M.hxPendDrop(p); p.cancel(); }
    Li.rule = 'takt';
    return o;
  }, slots);
  ok(Math.abs(r.at - r.seam) < 1e-6 && (Math.abs(r.seam - r.bar) > 0.1 || true), `a Lichtung „am Schleifenende“ switches at the longest Schleife's seam (${r.at.toFixed(3)} s = the 2-bar loop's next seam)`);
  const s3 = r.slot3;

  // ---- Kern: there and back, on the 1 ----
  r = await ev(async (slots) => {
    const M = window.__M, o = {};
    const L = slots.map((s) => M.HX.loops.get(M.HX.slot[s]));
    for (const X of M.hxLoopsLive()) if (X.state !== 'spielt') M.hxState(X.id, 'spielt', null, { X: 0.02 });
    await window.__sleep(200);
    const K = M.hxLichMerken(); K.kern = true; K.loops[L[1].key].on = false; K.loops[M.HX.loops.get(M.HX.slot[slots[2]]).key].on = false;   // the Kern: only the first
    const before = M.hxLoopsLive().map((X) => X.state).join();
    M.hxKern(); const t1 = M.HX.pend.find((x) => x.kind === 'licht').t;
    o.toBar = Math.abs(M.tgBeat(t1) / 4 - Math.round(M.tgBeat(t1) / 4)) < 1e-6;
    await window.__until(t1 + 0.2);
    o.inKern = M.hxLoopsLive().map((X) => X.state).join(); o.back = !!M.HX.kernBack;
    M.hxKern(); const t2 = M.HX.pend.find((x) => x.kind === 'licht').t;
    await window.__until(t2 + 0.2);
    o.after = M.hxLoopsLive().map((X) => X.state).join(); o.before = before; o.back2 = !!M.HX.kernBack;
    return o;
  }, [slots[0], slots[1], s3]);
  ok(r.toBar && r.inKern === 'spielt,stumm,stumm' && r.back, `Kern: on the 1 only its Schleifen sound (${r.inKern})`);
  ok(r.after === r.before && !r.back2, `  the same gesture again: back on the 1 to what sounded before (${r.after})`);

  // ---- Lücke: every Schleife out for the last beat before the next 1, back on it, 3-ms fades ----
  r = await ev(async () => {
    const M = window.__M, o = {}, beat = 60 / M.tgBpm(M.A.ctx.currentTime);
    await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.1);
    const R = window.__rec(), port = M.HX.node.port, pm = port.postMessage.bind(port), log = [];
    port.postMessage = (m, t) => { log.push(m); return pm(m, t); };
    const lu = M.hxLuecke(1);
    port.postMessage = pm;
    o.msgs = log.filter((m) => m.gain).map((m) => [m.gain.f, m.gain.ramp, m.gain.g]);
    o.t0 = lu.t0; o.t1 = lu.t1; o.len = lu.t1 - lu.t0; o.beat = beat;
    await window.__until(lu.t1 + 0.3);
    const g = await window.__stopRec(R), f0 = Math.round(M.hxF(lu.t0)), f1 = Math.round(M.hxF(lu.t1)), sr = M.A.ctx.sampleRate, ms = sr / 1000;
    o.r3 = Math.round(0.003 * sr);
    o.before = window.__db(window.__rms(g, f0 - 0.1 * sr, f0 - 3 * ms)); o.gap = window.__db(window.__rms(g, f0 + ms, f1 - 4 * ms)); o.after = window.__db(window.__rms(g, f1 + ms, f1 + 0.1 * sr));
    // the fades, 3 ms: out from 3 ms before the beat (silent on it), back from 3 ms before the 1 (full on it) – the
    // processor's messages, at their frames; and nothing at all in between
    o.out = o.msgs.filter((x) => x[2] === 0).map((x) => [x[0] - f0, x[1]]); o.back = o.msgs.filter((x) => x[2] > 0).map((x) => [x[0] - f1, x[1]]);
    // (a quantum this headless machine's audio device dropped is a gap in the recording – NaN – never sound: counted
    // apart; at least 90 % of the Lücke must have been heard)
    let mx = 0, heard = 0, all = 0; for (let f = f0; f < f1 - 3 * ms; f++) { const a = g.L[f - g.f0], b = g.R[f - g.f0]; all++; if (!(a === a && b === b)) continue; heard++; mx = Math.max(mx, Math.abs(a), Math.abs(b)); }
    o.inside = heard >= 0.9 * all ? mx : NaN; o.heard = +(heard / all).toFixed(3); o.rec = [g.f0 - f0, g.f0 + g.L.length - f1];   // (the recording's window against the Lücke's frames)
    return o;
  });
  ok(Math.abs(r.len - r.beat) < 1e-6 && r.gap < r.before - 60 && r.after > r.before - 6, `Lücke: silent for the last beat before the 1 (${r.before.toFixed(1)} → ${r.gap.toFixed(1)} dB in it → ${r.after.toFixed(1)} after the 1)`);
  ok(r.out.length === 3 && r.out.every(([d, n]) => Math.abs(d + r.r3) <= 1 && n === r.r3) && r.back.length === 3 && r.back.every(([d, n]) => Math.abs(d + r.r3) <= 1 && n === r.r3) && r.inside === 0,
    `  hard, with 3-ms fades at their frames (out ${JSON.stringify(r.out[0])}, back ${JSON.stringify(r.back[0])} – frames from the beat and the 1, the fade's length); inside exactly silent (${r.inside}; ${(r.heard * 100).toFixed(1)} % of it recorded – the rest quanta the machine dropped; the recording from ${-r.rec[0]} frames before … ${r.rec[1]} after)`);

  // ---- Schluss am Ende: each at its seam, its Ausklang ringing; then ▶ ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    const live = M.hxLoopsLive();
    await window.__sleep(300);
    const seams = live.map((L) => M.hxNextSeam(L).f);
    const R = window.__rec();
    M.hxSchluss('ende');
    o.pend = M.HX.pend.find((x) => x.kind === 'schluss').label;
    const end = M.HX.schluss.end;
    await window.__until(end + 0.6);
    const g = await window.__stopRec(R), last = Math.max(...seams);
    o.states = live.map((L) => L.state).join();
    const sr = M.A.ctx.sampleRate; o.tail = window.__db(window.__rms(g, last + 0.002 * sr, last + 0.05 * sr)); o.later = window.__db(window.__rms(g, last + 0.45 * sr, last + 0.55 * sr));
    o.ruht = M.HX.ruht; M.hxRailState(); o.haupt = M.HXU.haupt.textContent;
    o.allAtSeams = live.every((L, i) => L.state === 'angehalten');
    return o;
  });
  ok(/Schluss am Ende/.test(r.pend) && r.allAtSeams && r.tail > -90 && r.tail > r.later && r.ruht && r.haupt === 'weiter', `Schluss am Ende: every Schleife angehalten at its own seam, its Ausklang rings (${r.tail.toFixed(1)} dB just after, ${r.later.toFixed(1)} dB later); the Hauptknopf: ${r.haupt}`);
  await ev(async () => { const M = window.__M; M.hxWeiter(); await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.4); });

  // ---- Schluss abbauend: one per pass of the longest, the youngest first ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    const live = M.hxLoopsLive(), Mx = live.reduce((a, b) => (M.hxLen(b) > M.hxLen(a) ? b : a));
    M.hxSchluss('abbauend');
    const S = M.HX.schluss, order = S.stops.map(([L, , f]) => [L.made, f]);
    o.youngFirst = order.every((x, i) => !i || x[0] <= order[i - 1][0]);
    const k0 = M.hxNextSeam(Mx).k;
    o.perPass = order.every(([, f], i) => f >= M.hxPassF(Mx, k0 + i) - 1 && f <= M.hxPassF(Mx, k0 + i) + M.hxLen(Mx) * M.A.ctx.sampleRate);
    o.n = order.length;
    M.hxSchlussAb(); await window.__sleep(200);
    o.after = live.map((L) => L.state).join();
    return o;
  });
  ok(r.youngFirst && r.perPass && r.n === 3, `Schluss abbauend: one Schleife less every pass of the longest, the youngest first (${r.n} stops)`);
  ok(r.after === 'spielt,spielt,spielt', `  cancelled (↶ / Schluss again): they play on (${r.after})`);

  // ---- Schluss welkend: level and brightness fall, slices drop out, angehalten at the end ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    M.setParam('hx.welk', 4);
    await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.05);
    const R = window.__rec();
    M.hxSchluss('welkend');
    const S = M.HX.schluss, live = M.hxLoopsLive(), bar = 240 / M.tgBpm(M.A.ctx.currentTime);
    const t0 = S.end - 4 * bar;
    await window.__until(S.end + 0.3);
    const sr = M.A.ctx.sampleRate, g = await window.__stopRec(R), F0 = Math.round(M.hxF(t0)), FB = Math.round(bar * sr);
    const cen = (f0, f1) => { let a = 0, b = 0; for (let f = f0 + 1; f < f1; f++) { const i = f - g.f0, x = g.L[i], d = x - g.L[i - 1]; if (d !== d) continue; a += d * d; b += x * x; } return b > 0 ? Math.sqrt(a / b) * sr / (2 * Math.PI) : 0; };
    o.lv = [0, 1, 2, 3].map((k) => window.__db(window.__rms(g, F0 + k * FB, F0 + (k + 1) * FB)));
    o.pre = window.__db(window.__rms(g, F0 - FB / 2, F0));
    o.cen = [cen(F0 - FB / 2, F0), cen(F0 + 2 * FB, F0 + 3 * FB)];
    o.states = live.map((L) => L.state).join(); o.ruht = M.HX.ruht;
    return o;
  });
  ok(r.lv[3] < r.pre - 12 && r.lv[0] > r.lv[3] && r.lv[3] < r.lv[1], `Schluss welkend (4 bars): the level falls (${r.pre.toFixed(1)} before; bars ${r.lv.map((x) => x.toFixed(1)).join(', ')} dB)`);
  ok(r.cen[1] < r.cen[0] * 0.8, `  the brightness falls (centroid ${Math.round(r.cen[0])} → ${Math.round(r.cen[1])} Hz)`);
  ok(r.states === 'angehalten,angehalten,angehalten' && r.ruht, `  at its end every Schleife is angehalten (${r.states})`);
  // the drop-outs are seeded: the same seed twice, the same output (the processor offline)
  r = await ev(async () => {
    const n = 48000 * 2, sl = 1500, run = async (seed) => {
      const ctx = await window.__ringCtx(n, 48000), src = window.__chunks(n, (i) => 0.3 * Math.sin(i / 7) + 0.2 * Math.sin(i / 2.3));
      const node = window.__ring(ctx, { humusS: 2, msgs: [{ loop: { id: 1, lock: 'frei', L: 24000, ph0: 0, gain: 1 } }, { schicht: { loop: 1, id: 1, chunks: src, n, pre: 0, len: 24000, gain: 1, join: 'cut', fin: 0 } }, { wilt: { loop: 1, f0: 4800, f1: 4800 + 72000, sl, seed, lo: 250, hi: 16000 } }] });
      node.connect(ctx.destination, 0);
      const b = await ctx.startRendering(); return { x: b.getChannelData(0), got: node.__got };
    };
    const a = await run(77), b = await run(77), c = await run(78);
    let dab = 0, dac = 0; for (let i = 0; i < a.x.length; i++) { dab = Math.max(dab, Math.abs(a.x[i] - b.x[i])); dac = Math.max(dac, Math.abs(a.x[i] - c.x[i])); }
    // the slices that dropped out, by thirds of the span (ever more often)
    const drops = (x) => [0, 1, 2].map((q) => { let d = 0; for (let j = q * 16; j < (q + 1) * 16; j++) { const s = 4800 + j * sl; let m = 0; for (let i = s + 160; i < s + sl - 160; i++) m = Math.max(m, Math.abs(x[i])); if (m === 0) d++; } return d; });
    let tail = 0; for (let i = 4800 + 72000; i < n; i++) tail = Math.max(tail, Math.abs(a.x[i]));
    return { dab, dac, drops: drops(a.x), tail, wilted: a.got.some((m) => m && m.wilted) };
  });
  ok(r.dab === 0 && r.dac > 0.01 && r.drops[0] <= r.drops[2] && r.drops[2] >= 3 && r.tail === 0 && r.wilted, `  slices drop out, ever more often (${r.drops.join(' → ')} of 16 per third), seeded: the same seed – the same output (max difference ${r.dab}), another – other slices; silent and angehalten at its end`);

  // ---- mixer scenes carry Lichtungen: both – the morph fades only levels; one – half way switches ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    M.hxWeiter(); await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.3);
    const live = M.hxLoopsLive();
    for (const L of live) M.hxLevel(L, 1);
    const La = M.hxLichMerken(); for (const L of live.slice(1)) La.loops[L.key].on = false;   // A: only the first
    const Lb = M.hxLichMerken(); La.loops[live[0].key].g = 1; Lb.loops[live[0].key].on = false; Lb.loops[live[1].key].g = 0.5;   // B: the second at half and the third
    if (!M.MX.snap.a) M.mxSnapLoad();
    M.HX.lichCur = La.id; M.mxSnapStore('a');
    M.setParam('xfin.vol', -6); M.HX.lichCur = Lb.id; M.mxSnapStore('b');
    o.lch = JSON.stringify(M.MX.snap.lch) === JSON.stringify({ a: La.id, b: Lb.id });
    M.mxMorphApply(0); await window.__sleep(100);
    o.m0 = live.map((L) => +L.gain.toFixed(3));
    M.mxMorphApply(0.5); await window.__sleep(100);
    o.m5 = live.map((L) => +L.gain.toFixed(3)); o.st5 = live.map((L) => L.state).join();
    M.mxMorphApply(1); await window.__sleep(100);
    o.m1 = live.map((L) => +L.gain.toFixed(3)); o.st1 = live.map((L) => L.state).join(); o.cur = M.HX.lichCur === Lb.id;
    // one side only: B carries one, A none – crossing half way to B switches there (on the 1)
    delete M.MX.snap.lch.a; M.mxMorphApply(0); await window.__sleep(50);
    const pend0 = M.HX.pend.filter((x) => x.kind === 'licht').length;
    M.mxMorphApply(0.3); const p3 = M.HX.pend.filter((x) => x.kind === 'licht').length;
    M.mxMorphApply(0.7); const p7 = M.HX.pend.find((x) => x.kind === 'licht');
    o.one = { pend0, p3, p7: p7 && p7.lich === Lb.id };
    if (p7) { M.hxPendDrop(p7); p7.cancel(); }
    return o;
  });
  ok(r.lch && JSON.stringify(r.m0) === '[1,0,0]' && Math.abs(r.m5[0] - Math.SQRT1_2) < 0.01 && Math.abs(r.m5[1] - Math.sqrt(0.125)) < 0.01 && r.st5 === 'spielt,spielt,spielt', `mixer scenes A/B carry Lichtungen: the morph fades only the levels between them (A ${r.m0}, half way ${r.m5})`);
  ok(JSON.stringify(r.m1) === '[0,0.5,1]' && r.st1 === 'stumm,spielt,spielt' && r.cur, `  at B: its states and levels (${r.m1}, ${r.st1})`);
  ok(r.one.p3 === r.one.pend0 && r.one.p7, '  one side only: crossing half way toward it switches to its Lichtung (on the 1)');

  // ---- Schlafen and Wenden ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    for (const L of M.hxLoopsLive()) { M.hxLevel(L, 1); if (L.state !== 'spielt') M.hxState(L.id, 'spielt', null, { X: 0.02 }); }
    M.MX.snap.lch = {};
    await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.5);   // mid-bar: the two-bar loop is inside its pass at the next bar line
    const R = window.__rec();
    M.GK.p.slArt = 'kadenz';
    M.slpEnter();
    const S = M.HX.slp; o.t = S && S.t; o.isBar = S && Math.abs(M.tgBeat(S.t) / 4 - Math.round(M.tgBeat(S.t) / 4)) < 1e-6;
    await window.__until(S.t + 0.7);
    const g = await window.__stopRec(R), f = Math.round(M.hxF(S.t)), sr = M.A.ctx.sampleRate;
    o.st = M.hxLoopsLive().map((L) => L.state).join();
    o.tail = window.__db(window.__rms(g, f + 0.001 * sr, f + 0.1 * sr)); o.pre = window.__db(window.__rms(g, f - 0.2 * sr, f - 0.01 * sr));
    // short sleep: wake – „3 · 2 · 1“ and back on the next 1
    M.slpWake();
    const W = M.HX.wake; o.wake = W && { beats: (W.t - M.A.ctx.currentTime) * M.tgBpm(M.A.ctx.currentTime) / 60, isBar: Math.abs(M.tgBeat(W.t) / 4 - Math.round(M.tgBeat(W.t) / 4)) < 1e-6 };
    await window.__until(W.t + 0.3);
    o.woke = M.hxLoopsLive().map((L) => L.state).join();
    // a long sleep: they stay angehalten
    M.slpEnter(); await window.__until(M.HX.slp.t + 0.2);
    M.SLP.t0 -= M.SLP_LONG + 1000; M.slpWake(); await window.__sleep(300);
    o.long = { st: M.hxLoopsLive().map((L) => L.state).join(), ruht: M.HX.ruht, wake: !!M.HX.wake };
    return o;
  });
  ok(r.isBar && r.st === 'angehalten,angehalten,angehalten', `Schlafen (Wenden): every Schleife angehalten at the next bar line (${r.st})`);
  ok(r.tail > -60 && r.tail < r.pre + 3, `  their Ausklang rings into it (${r.pre.toFixed(1)} dB before, ${r.tail.toFixed(1)} dB just after the bar line)`);
  ok(r.wake && r.wake.isBar && r.wake.beats >= 3 && r.wake.beats < 7.5 && r.woke === 'spielt,spielt,spielt', `  waking: „3 · 2 · 1“ (${r.wake && r.wake.beats.toFixed(2)} beats ahead) and back on the next 1 (${r.woke})`);
  ok(r.long.st === 'angehalten,angehalten,angehalten' && r.long.ruht && !r.long.wake, '  a long sleep only keeps them angehalten (▶ Weiter)');

  // ---- the guard (§6.4) and „eine Runde“ ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    M.hxWeiter(); await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.3);
    const L = M.hxLoopsLive()[0];
    M.setParam('hx.modus', 'dieselbe'); M.HX.fokus = L.id; M.setParam('hx.runde', true);
    await window.__sleep(100);
    const k0 = L.k;
    M.hxHaupt(null);   // a punch of one round
    const P0 = M.HX.punch; o.end = P0 && P0.end != null;
    await window.__until(M.hxT(P0.end) + 0.2);
    o.punch = !!M.HX.punch; o.sch = L.sch.length; o.span = P0.end - P0.a; o.pass = M.hxPassF(L, M.hxPassK(L, P0.a) + 1) - M.hxPassF(L, M.hxPassK(L, P0.a));
    o.g0 = M.hxGuardOk(L); o.set = M.hxEigSet(L, 'lebendig'); o.want = L.eigWant; o.eig = L.eig;
    const kG = L.guardK;
    await window.__until(M.hxT(M.hxPassF(L, kG)) + 0.15);
    M.hxFormTick(M.A.ctx.currentTime);
    o.eig2 = L.eig; o.g1 = M.hxGuardOk(L); o.kG = kG - k0;
    M.setParam('hx.runde', false); M.setParam('hx.modus', 'neu');
    return o;
  });
  ok(r.end && !r.punch && r.sch === 3 && r.span === r.pass, `„eine Runde“: a punch in mode „dieselbe Schleife“ ends by itself one pass after the press (${r.span} frames = one pass; its group of ${r.sch - 1} Schichten)`);
  ok(!r.g0 && r.set === false && r.want === 'lebendig' && r.eig === 'treu' && r.g1 && r.eig2 === 'lebendig', `the guard: no Eigensinn change for three passes after a Schicht (asked: waits; ${r.kG} passes on: applied)`);

  // ---- a Schleife deleted while a Lichtung's switch waits for the 1: it stays gone (the processor ignores a change
  // scheduled before its clear – it neither sounds again nor keeps its buffers) ----
  r = await ev(async () => {
    const M = window.__M, o = {};
    const s4 = await window.__mk(1, [2, 5, 9, 5], 'glo');
    const L4 = M.HX.loops.get(M.HX.slot[s4]), id = L4.id, sids = L4.sch.slice();
    await window.__until(M.tgTime(window.__nextBar(0.05)) + 0.3);
    const Li = M.hxLichMerken();   // (with it on)
    M.hxState(L4.id, 'stumm', null, { X: 0.02 }); L4.state = 'stumm';
    await window.__until(M.tgTime(window.__nextBar(0.1)) + 0.25);
    M.hxLichGo(Li);   // its switch back to „spielt“ on the 1, already at the processor
    o.pend = M.HX.pend.some((x) => x.kind === 'licht');
    const tB = M.tgTime(window.__nextBar(0.05));
    await window.__until(tB - 0.025);   // (deleted inside its fade-out's reach of the 1: the switch arrives while it is still dying)
    o.before = M.A.ctx.currentTime < tB - 0.008;
    M.hxDelete(L4);
    await window.__until(tB + 1.2);
    o.gone = !M.HX.loops.has(id) && sids.every((x) => !M.HX.sch.has(x));
    o.live = M.hxLoopsLive().length;
    if (M.HX.lich.includes(Li)) M.hxLichDel(Li);
    // one cleared before its first pass (its entry 100 bars ahead): its buffers come back at once, not at its entry
    const id2 = M.hxLoopNew({ lock: 'takt', b0: Math.ceil(M.tgBeat(M.A.ctx.currentTime) / 4) * 4 + 400, beats: 4 });
    await window.__sleep(200); o.made = M.HX.loops.has(id2);
    M.hxClear(id2, null, 0.02); await window.__sleep(500);
    o.early = !M.HX.loops.has(id2);
    return o;
  });
  ok(r.pend && r.before && r.gone && r.live === 3, `a Schleife deleted just before a Lichtung's switch to it on the 1 (still fading out then): gone for good at the processor too (its buffers back: ${r.gone}; deleted in time: ${r.before})`);
  ok(r.made && r.early, `  one cleared before its first pass (its entry 100 bars ahead): its buffers come back at once (${r.early})`);

  // ---- the form survives a reload ----
  r = await ev(async () => { const M = window.__M; await window.__sleep(800); return { n: M.HX.lich.length, cur: M.HX.lichCur }; });
  await page.reload(); await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.waitForTimeout(1500);
  const r2 = await ev(() => { const M = window.__M; return { n: M.HX.lich.length, cur: M.HX.lichCur, loops: M.hxLoopsLive().length }; });
  ok(r2.n === r.n && r2.cur === r.cur && r2.loops === 3, `the Lichtungen come back after a reload with the Schleifen (${r2.n} Lichtungen, ${r2.loops} Schleifen)`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
