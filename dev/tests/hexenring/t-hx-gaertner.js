// Hexenring – Mitspieler II (SPEC §12.3, §12.5, §22 t-hx-ki): roles, the Gärtner (schaut zu · pflegt · antwortet),
// answers, Begleiten with Klangverwandtschaft, Wiederkehr, Puls lernt, the Handschrift.
//  roles    synthetic parts read as Bass, Akkorde, Melodie, Fläche, Schlag; loops played live: their roles; the tap overrides
//  target   the rules on one loop: Treu only lower / pause (never its notes), Variieren thins or fills; Platz machen in
//           the player's register most; die anderen spielen – melody, bass, stop
//  pflegt   live: the player goes into the bass – the bass loop's pause planned a bar ahead (chips ✕ n · ✓), done at
//           the bar line (its level), its notes untouched; a tap on its ring takes it back at once, eight bars left alone;
//           a loop the player muted is never touched; the player stops – all play; „schaut zu“ takes everything back
//  antw     the answer's rules over many seeds (length ±1 bar of the call, from the next beat, a stable degree on a strong
//           beat at the end, never seven tokens as played, the scale); live: silent below 40 notes, then an answer after a
//           phrase – real voices on the Hexenring's strip, never in the Humus, the graph woken (Ruhe); the player plays: it
//           yields; ✕ ends it
//  begl     Begleiten: bass and chords in the scale, the melody's strong notes in the fields, the chords' source the least
//           rough against the melody's partials, two silent dashed suggestions; a tap plays one (taken), ↶ takes them away
//  wk       Wiederkehr: a marked loop at rest comes back on the next four-bar line after its motif is played (announced a
//           bar ahead); one the player muted in the last eight bars never; ✕ refuses
//  puls     Puls lernt: a Euclidean rhythm found exactly (steps, pulses, rotation), written into a lane, ↶ back
//  hand     the Handschrift: off – nothing stored; on – the session waits, „übernehmen“ merges it (tokens, tempi), ≤ 1 MB
//           pruned; after a reload: the tempo prior and answers from the first minute; export, import, Vergessen
//   node t-hx-gaertner.js      env: PARTS=roles,target,pflegt,antw,begl,wk,puls,hand
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const PARTS = (process.env.PARTS || 'roles,target,pflegt,antw,begl,wk,puls,hand').split(',');
const has = (p) => PARTS.includes(p);

async function ktools(page) {
  await page.evaluate(() => {
    const M = window.__M, A = M.A;
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'v.human': 0 })) M.setParam(k, v);
    // notes at given frequencies (or field degrees): [[t, f | {d}, vel, dur]]
    window.__playF = (list, o = {}) => {
      for (const [t, f, vel, dur] of list) {
        const fr = typeof f === 'object' ? M.N.notes[Math.max(0, Math.min(M.N.notes.length - 1, f.d))].f : f;
        const v = M.playNote(o.eng || 'glo', t, fr, o.y != null ? o.y : 0.5, vel != null ? vel : 0.7, { bus: M.stripIn('fin') });
        const hold = dur != null ? dur : 0.3;
        if (v && v.release) setTimeout(() => v.release(), Math.max(0, (t + hold - A.ctx.currentTime) * 1000));
      }
    };
    // a loop of `bars` bars from notes played from the next bar line: [[beat, f | {d}, vel, dur(beats)]]
    window.__mkL = async (notes, o = {}) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', o.bars || 1);
      window.__grid(o.bpm || 120); await window.__sleep(500);
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__playF(notes.map(([b, f, v, d]) => [t0 + b * beat, f, v, (d || 0.5) * beat]), o);
      await window.__until(t0 + 4 * beat * (o.bars || 1) + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      if (!L) return null;
      const S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 80 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      M.HX.chips = null;
      return L;
    };
    window.__untilBar = async (n) => { const b = Math.ceil(M.tgBeat(A.ctx.currentTime) / 4 + 1e-6) * 4 + 4 * (n - 1); await window.__until(M.tgTime(b) + 0.03); return b; };
    window.__lvl = async (L, ms) => { const m = await window.__meter(L.id, ms); return m.reduce((a, x) => Math.max(a, x[1]), 0); };
  });
}

(async () => {
  const { page, errors } = await G.open({});
  const ev = (fn, a) => page.evaluate(fn, a);
  await ktools(page);
  let r;

  // ---------- roles ----------
  if (has('roles')) {
    r = await ev(async () => {
      const M = window.__M, out = {}, mk = (list) => list.map(([t, m, d, eng]) => ({ t, f: 440 * Math.pow(2, (m - 69) / 12), d, vel: 0.7, eng: eng || 'glo' }));
      const parts = {
        bass: mk([[0, 36, 0.9], [1, 36, 0.9], [2, 43, 0.9], [3, 41, 0.9], [4, 36, 0.9], [5, 38, 0.9], [6, 43, 0.9], [7, 41, 0.9]].map((x) => x.concat(['amo']))),
        akkorde: mk([0, 4, 7].flatMap((m) => [[0, 60 + m, 3.8], [4, 62 + m, 3.8]]).map((x) => x.concat(['hrz']))),
        melodie: mk([[0, 72, 0.4], [0.5, 74, 0.4], [1, 76, 0.4], [1.5, 79, 0.4], [2, 81, 0.4], [3, 79, 0.4], [3.5, 76, 0.4], [4, 74, 0.4], [5, 72, 0.4], [6, 69, 0.8]].map((x) => x.concat(['hlm']))),
        flaeche: mk([[0, 60, 7.8], [0, 67, 7.8]].map((x) => x.concat(['neb']))),
        schlag: mk([0, 1, 2, 3, 4, 5, 6, 7].flatMap((b) => [[b, 50, 0.1], [b + 0.5, 50, 0.1]]).map((x) => x.concat(['mem']))),
      };
      for (const [k, ns] of Object.entries(parts)) { const F = M.hxRoleFeat(ns, 8); out[k] = M.hxRoleScore(F); }
      // loops played: a low line and a high one
      const Lb = await window.__mkL([[0, 55, 0.9, 0.9], [1, 55, 0.8, 0.9], [2, 73.4, 0.8, 0.9], [3, 65.4, 0.8, 0.9]], { eng: 'amo' });
      const Lm = await window.__mkL([[0, { d: 7 }, 0.8, 0.4], [0.5, { d: 8 }], [1, { d: 9 }], [1.5, { d: 10 }], [2, { d: 9 }], [3, { d: 7 }], [3.5, { d: 8 }]], { eng: 'glo' });
      out.lb = (M.hxRoleOf(Lb) || {}).role; out.lm = (M.hxRoleOf(Lm) || {}).role;
      M.hxMi(Lm).rolle = 'akkorde'; out.over = M.hxRoleOf(Lm).role; out.user = !!M.hxRoleOf(Lm).user; M.hxMi(Lm).rolle = null;
      await window.__reset();
      return out;
    });
    for (const k of ['bass', 'akkorde', 'melodie', 'flaeche', 'schlag']) ok(r[k].role === k, `role: a ${k} part reads as ${r[k].role} (confidence ${r[k].conf.toFixed(2)})`);
    ok(r.lb === 'bass' && r.lm === 'melodie', `loops played: the low Amöbe line is ${r.lb}, the high Glocke figure ${r.lm}`);
    ok(r.over === 'akkorde' && r.user, `a tap in the card overrides the role (${r.over})`);
  }

  // ---------- target ----------
  if (has('target')) {
    r = await ev(() => {
      const M = window.__M, out = {}, L = (eig, role) => ({ eig, mi: { rolle: role }, sch: [], notes: [], bew: null, key: 'x' });
      M.setParam('hx.gaertner', 'pflegt');
      const T = (l, want, E) => M.hxGdTarget(l, want, E, null);
      out.treuBass = T(L('treu', 'bass'), 'bass', 0.2); out.treuMel = T(L('treu', 'melodie'), 'melodie', 0.2); out.varMel = T(L('variieren', 'melodie'), 'melodie', 0.2);
      out.still = T(L('treu', 'bass'), 'still', 0.1); out.dense = T(L('treu', 'akkorde'), 'still', 0.9); out.denseV = T(L('variieren', 'akkorde'), 'still', 0.9); out.sparseV = T(L('wandern', 'akkorde'), 'still', 0.05);
      out.lebDense = T(L('lebendig', 'akkorde'), 'still', 0.9);
      M.setParam('hx.gRollen', false); out.off = T(L('treu', 'bass'), 'bass', 0.2); M.setParam('hx.gRollen', true);
      M.setParam('hx.gaertner', 'schaut'); out.schaut = T(L('treu', 'bass'), 'bass', 0.9);
      return out;
    });
    ok(r.treuBass.gt === 0 && r.treuBass.gd === 0, `the player in the bass: a Treu bass loop pauses (gain ×${r.treuBass.gt}), its notes stay (density ${r.treuBass.gd})`);
    ok(r.treuMel.gt < 1 && r.treuMel.gt > 0.4 && r.treuMel.gd === 0 && r.varMel.gt === 1 && r.varMel.gd < 0, `the player plays melody: a Treu melody loop is lowered (×${r.treuMel.gt.toFixed(2)}), one at Variieren thins instead (density ${r.varMel.gd}) – Eigensinn is the ceiling`);
    ok(r.still.gt === 1 && r.still.gd === 0, `the player stops: everything plays as it was`);
    ok(r.dense.gt < 1 && r.dense.gt >= 0.6 && r.dense.gd === 0 && r.lebDense.gd === 0, `Platz machen: dense playing lowers a Treu loop by ${(20 * Math.log10(r.dense.gt)).toFixed(0)} dB (−4 at most), a Lebendig one too (×${r.lebDense.gt.toFixed(2)}), never their notes`);
    ok(r.denseV.gd < 0 && r.denseV.gt === 1 && r.sparseV.gd > 0, `…a Variieren loop thins when the playing is dense (${r.denseV.gd}) and fills when it is sparse (${r.sparseV.gd})`);
    ok(r.off.gt === 1 && r.schaut.gt === 1, `„die anderen spielen“ off, or „schaut zu“: nothing changes`);
  }

  // ---------- pflegt ----------
  if (has('pflegt')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, out = {};
      const Lb = await window.__mkL([[0, 55, 0.9, 0.9], [1, 55, 0.8, 0.9], [2, 73.4, 0.8, 0.9], [3, 65.4, 0.8, 0.9]], { eng: 'amo' });
      const Lm = await window.__mkL([[0, { d: 7 }, 0.8, 0.4], [0.5, { d: 8 }], [1, { d: 9 }], [1.5, { d: 10 }], [2, { d: 9 }], [3, { d: 7 }], [3.5, { d: 8 }]], { eng: 'glo' });
      const Lu = await window.__mkL([[0, { d: 3 }, 0.5, 3.5], [0, { d: 5 }, 0.5, 3.5], [0, { d: 7 }, 0.5, 3.5]], { eng: 'neb' });
      M.HX.fokus = 0;
      M.hxState(Lu.id, 'stumm', null, { X: 0.02 });   // (the player mutes one: the Gärtner never touches it)
      const sB = M.HX.sch.get(Lb.sch[0]), sig0 = sB.play || 'ab';
      out.roles = [M.hxRoleOf(Lb).role, M.hxRoleOf(Lm).role];
      M.setParam('hx.gaertner', 'pflegt');
      await window.__sleep(200);
      out.lvl0 = await window.__lvl(Lb, 500);
      // the player plays a bass line: two bars of low notes, legato quarter notes
      const b0 = await window.__untilBar(1), beat = 0.5;
      const line = []; for (let i = 0; i < 12; i++) line.push([M.tgTime(b0 + i), [49, 55, 61.7, 55][i % 4], 0.8, beat * 0.9]);
      window.__playF(line, { eng: 'amo' });
      let planAt = null, chips = null;
      for (let i = 0; i < 120 && !M.HXG.plan; i++) await window.__sleep(50);
      const G0 = M.HXG.plan; planAt = A.ctx.currentTime; chips = M.HX.chips && M.HX.chips.kind;
      out.plan = G0 ? G0.items.map((x) => [M.hxByKey(x.key).slot, x.gt]) : null; out.lead = G0 ? G0.t - planAt : null; out.chips = chips;
      out.planU = G0 ? G0.items.some((x) => x.key === Lu.key) : null;
      // the chips in the rail: ✕ n · ✓
      M.hxRailState(); out.chipTxt = [...M.HXU.chips.querySelectorAll('button')].map((b) => b.textContent).join(' ');
      if (G0) await window.__until(G0.t + 0.3);
      out.gg = Lb.gg; out.stance = M.hxStance(Lb); out.lvl1 = await window.__lvl(Lb, 400);
      out.notesSame = (sB.play || 'ab') === sig0 && !M.hxWAktiv(Lb);
      out.uTouched = Lu.gg != null && Lu.gg !== 1;
      // a tap on its ring: back at once
      const t0 = A.ctx.currentTime; M.hxRingTap(Lb.slot, null); out.tap = Lb.gg; out.hold = M.hxMi(Lb).gHold != null && M.hxMi(Lb).gHold > M.tgBeat(t0) + 30;
      await window.__sleep(150); out.lvl2 = await window.__lvl(Lb, 400);
      // it keeps playing the bass for another two bars: no new plan for that loop (eight bars left alone)
      const b1 = await window.__untilBar(1); const line2 = []; for (let i = 0; i < 8; i++) line2.push([M.tgTime(b1 + i), [49, 55, 61.7, 55][i % 4], 0.8, 0.45]); window.__playF(line2, { eng: 'amo' });
      let again = false; for (let i = 0; i < 90; i++) { if (M.HXG.plan && M.HXG.plan.items.some((x) => x.key === Lb.key)) again = true; await window.__sleep(50); }
      out.again = again;
      // „schaut zu“: everything back
      Lm.gg = 0.5; M.setParam('hx.gaertner', 'schaut'); out.reset = Lm.gg === 1 && !M.HXG.plan;
      await window.__reset();
      return out;
    });
    ok(r.roles[0] === 'bass' && r.roles[1] === 'melodie', `two loops: ${r.roles.join(', ')}; a third, muted by the player`);
    ok(r.plan && r.plan.some(([s, g]) => g === 0) && r.lead > 0.3 && r.chips === 'gd', `the player goes into the bass: the Gärtner plans the bass loop's pause ${r.lead && r.lead.toFixed(2)} s ahead – at the next bar line (${JSON.stringify(r.plan)}), its chips in the rail`);
    ok(/✕ \d/.test(r.chipTxt) && /✓/.test(r.chipTxt), `…the rail shows „${r.chipTxt}“`);
    ok(r.gg === 0 && r.lvl0 > 0.005 && r.lvl1 < r.lvl0 * 0.05 && /Platz|pausiert/.test(r.stance), `…at the bar line it pauses: level ${r.lvl0.toFixed(4)} → ${r.lvl1.toExponential(1)}, the ring says „${r.stance}“`);
    ok(r.notesSame, `…its notes untouched: it still plays its Abdruck (a Treu loop only gets quieter)`);
    ok(r.planU === false && !r.uTouched, `the loop the player muted is never touched`);
    ok(r.tap === 1 && r.hold && r.lvl2 > r.lvl0 * 0.5, `a tap on its ring takes it back at once (level ${r.lvl2.toFixed(4)}) and the Gärtner leaves it alone for eight bars`);
    ok(!r.again, `…while the player stays in the bass, no new plan for that loop`);
    ok(r.reset, `„schaut zu“: every change taken back at once`);
  }

  // ---------- antw ----------
  if (has('antw')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, out = { bad: [], n: 0 };
      // a synthetic session: a corpus of 400 tokens from a few phrases
      const HXA = M.HXA; HXA.tok.length = 0; HXA.c.clear(); HXA.sc.clear(); HXA.g7.clear(); HXA.n = 0;
      const per = M.hxScPer(), phrases = [[0, 2, 4, 2, 1, 0], [4, 5, 7, 5, 4, 2, 0], [2, 4, 7, 9, 7, 4], [7, 5, 4, 2, 4, 0]];
      let prev = 5;
      for (let r = 0; r < 20; r++) for (const ph of phrases) ph.forEach((d, i) => { const I = 5 + d; M.hxAntLearn(Math.max(-7, Math.min(7, I - prev)) + ':' + (i % 3 === 2 ? 2 : 1) + ':' + [0, 2, 1, 2, 0, 3, 1][i % 7]); prev = I; });
      for (let s = 1; s <= 120; s++) {
        const call = [5, 7, 9, 7, 5, 6].map((I, i) => ({ I, b: i * 0.5, tok: HXA.tok[i + 3], vel: 0.7, t: i * 0.25 }));
        const lenB = 2 + (s % 4) * 2, b0 = 16 + (s % 3);
        const g = M.hxAntGen({ call, seed: s * 7919, lenB, b0, strong: (b) => M.hxVMet(b, 4) >= 0.7 });
        out.n++;
        const last = g[g.length - 1], span = last.b;
        if (!(span >= lenB - 4 - 1e-6 && span <= lenB + 4 + 1e-6)) out.bad.push(['len', s, span, lenB]);
        if (g[0].b !== 0) out.bad.push(['start', s]);
        if (!M.hxStable(last.I) || M.hxVMet(b0 + last.b, 4) < 0.7) out.bad.push(['end', s, last.I, b0 + last.b]);
        if (g.some((x) => !(M.hxIdxF(x.I) > 0))) out.bad.push(['pitch', s]);
        // never seven tokens as played: the answer's own steps against the corpus's 7-grams (with the call's tail)
        const toks = []; let p = call[call.length - 1].I; for (const x of g) { toks.push(x.I - p); p = x.I; }
        const ivs = HXA.tok.map((t) => +t.split(':')[0]), cs = ivs.join(',');
        for (let i = 0; i + 7 <= toks.length; i++) if (cs.includes(toks.slice(i, i + 7).join(',')) && toks.slice(i, i + 7).some((v) => v !== 0)) { out.copy7 = (out.copy7 || 0) + 1; break; }
      }
      { const t0 = performance.now(); for (let s = 1; s <= 20; s++) M.hxAntGen({ call: [5, 7, 9, 7, 5, 6, 8, 9].map((I, i) => ({ I, b: i * 0.5, tok: HXA.tok[i + 3], vel: 0.7 })), seed: s, lenB: 8, b0: 16, strong: (b) => M.hxVMet(b, 4) >= 0.7 }); out.ms = (performance.now() - t0) / 20; }
      out.distinct = new Set([1, 2, 3, 4, 5].map((s) => JSON.stringify(M.hxAntGen({ call: [5, 7, 9, 7, 5, 6].map((I, i) => ({ I, b: i * 0.5, tok: HXA.tok[i + 3], vel: 0.7 })), seed: s, lenB: 4, b0: 16, strong: (b) => M.hxVMet(b, 4) >= 0.7 })))).size;
      // live: an empty corpus – silence; then a phrase after 40 notes – an answer
      HXA.tok.length = 0; HXA.c.clear(); HXA.sc.clear(); HXA.g7.clear(); HXA.n = 0; HXA.ph = null; HXA.lastId = 0;
      M.setParam('hx.gaertner', 'antwortet'); M.setParam('hx.gBegl', false);
      window.__grid(120); await window.__sleep(500);
      const say = []; const keep = M.hxSay; window.__sayLog = say;
      const phr = async (degs) => { const b = await window.__untilBar(1); window.__playF(degs.map((d, i) => [M.tgTime(b + i * 0.5), { d }, 0.7, 0.2])); await window.__until(M.tgTime(b + degs.length * 0.5) + 0.05); };
      await phr([3, 5, 6, 5, 4]);
      await window.__sleep(1800);
      out.early = M.hxAntOn(); out.n0 = HXA.n;
      for (let k = 0; k < 6; k++) await phr([[3, 5, 6, 5, 4, 3, 2, 3], [5, 6, 8, 6, 5, 3, 5, 6], [6, 5, 3, 2, 3, 5, 6, 8]][k % 3]);
      out.n1 = HXA.n;
      await phr([3, 5, 6, 8, 6, 5]);
      let C = null; for (let i = 0; i < 80 && !C; i++) { await window.__sleep(50); C = M.HXA.cur; }
      out.ans = !!C; out.callN = C && C.call; out.ansN = C && C.n;
      if (C) {
        const sb = M.tgBeat(C.t0); out.startBeat = sb - Math.round(sb); out.knA = [...M.HX.kn.values()].filter((b) => b.kind === 'ant').length;
        await window.__until(C.notes[0].t + 0.05);
        const vs = [...A.voices].filter((v) => v.loop); out.voices = vs.length;
        const evs = M.hxEvents(C.notes[0].t - 0.01, C.notes[0].t + 0.05, false); out.inHumus = evs.filter((e) => Math.abs(e.f - C.notes[0].f) < 0.5).length;
        out.gate = M.IDLE.hxOff === false;
        // the player plays: it yields
        if (C.notes.length > 2) { window.__playF([[A.ctx.currentTime + 0.02, { d: 4 }, 0.7, 0.3]]); await window.__sleep(400); out.yield = C.stop === true || !M.HXA.cur; const after = C.notes.filter((n) => n.t > A.ctx.currentTime + 0.3 && n.v).length; out.after = after; }
      }
      // Ruhe: an answer opens the Hexenring's way when it was closed (no Schleife)
      M.hxGates(false); M.IDLE.hxT = A.ctx.currentTime - 30;
      const F = { notes: M.HXA.notes.slice(-6).map((x) => Object.assign({}, x, { tok: x.tok || '1:1:0' })), id: 999, mi: 0.25 };
      const C2 = M.hxAntStart(F, A.ctx.currentTime);
      out.woke = !!C2 && M.IDLE.hxOff === false;
      await window.__sleep(300); M.hxMachNein(); out.nein = !M.hxAntOn();
      M.setParam('hx.gaertner', 'schaut'); M.setParam('hx.gBegl', true);
      await window.__reset();
      return out;
    });
    ok(r.n === 120 && r.bad.length === 0, `answers over 120 seeds: as long as the call ±1 bar, from the next beat, a stable degree on a strong beat at the end, every pitch in the scale (${JSON.stringify(r.bad.slice(0, 3))})`);
    ok(r.ms < 20, `…an answer takes ${r.ms.toFixed(2)} ms to write (≤ 20 ms per decision)`);
    ok(!r.copy7, `…never seven steps in a row as they were played (${r.copy7 || 0} answers did)`);
    ok(r.distinct >= 3, `…another seed another answer (${r.distinct} of 5 different)`);
    ok(!r.early && r.n0 < 40, `live: with ${r.n0} notes heard the Gärtner does not answer yet`);
    ok(r.ans && r.ansN >= 2 && Math.abs(r.startBeat) < 0.01, `after ${r.n1} notes a phrase of ${r.callN} is answered: ${r.ansN} notes from the next beat`);
    ok(r.knA >= r.ansN, `…its notes keim as a chain of Knospen before they sound (${r.knA})`);
    ok(r.voices >= 1 && r.inHumus === 0 && r.gate, `…real voices (a loop's: they give way first), on the Hexenring's strip – never in the Humus (${r.inHumus}), its way to the master open`);
    ok(r.yield !== false && !r.after, `the player plays again: the answer yields – no new note starts (${r.after || 0})`);
    ok(r.woke && r.nein, `Ruhe: an answer opens the Hexenring's way when it was closed; ✕ ends it`);
  }

  // ---------- begl ----------
  if (has('begl')) {
    await ev(async () => { await window.__M.hxWerk(); });
    r = await ev(async () => {
      const M = window.__M, out = {};
      const Lm = await window.__mkL([[0, { d: 7 }, 0.8, 0.4], [0.5, { d: 8 }], [1, { d: 9 }], [1.5, { d: 10 }], [2, { d: 9 }], [3, { d: 7 }], [3.5, { d: 8 }], [4, { d: 6 }], [5, { d: 5 }], [6, { d: 6 }], [7, { d: 7 }, 0.8, 0.9]], { eng: 'klb', bars: 2 });
      out.role = M.hxRoleOf(Lm).role;
      const S = M.HX.sch.get(Lm.sch[0]), W = M.hxWBase(Lm, S);
      const res = await M.hxBegleiten(Lm);
      out.made = res ? res.made.length : 0;
      if (res) {
        const P0 = res.plan, per = W.key.per;
        out.chEng = P0.chEng; out.bars = P0.fields.length;
        // the strong melody notes inside the bar's field
        let st = 0, inF = 0; for (const x of W.n) { if (M.hxVMet(x.t, 4) < 0.7) continue; st++; if (P0.fields[Math.floor(x.t / 4)].pcs.includes(((x.deg % per) + per) % per)) inF++; } out.strongIn = [inF, st];
        // the chords' source: the least rough of the candidates
        { const t0 = performance.now(); M.hxBeglPlan(W, { bpb: 4 }); out.ms = performance.now() - t0; }
        const others = ['boe', 'neb', 'stm', 'hrz', 'obt', 'glt', 'hlm', 'sai'].filter((k) => k !== P0.chEng).map((k) => M.hxBeglPlan(W, { bpb: 4, chEng: k }).rough);
        out.rough = P0.rough; out.minOther = Math.min(...others);
        const Ls = res.made.map((k) => M.hxByKey(k));
        out.states = Ls.map((L) => L.state + ':' + M.hxMi(L).sugg);
        // in the scale: every note of both parts
        const sc = (W.key.rat || []).map((x) => 1200 * Math.log2(x));
        let off = 0; for (const L of Ls) { const X = M.HX.sch.get(L.sch[0]); for (const n of X.wn.n) { const c = ((1200 * Math.log2(n.f / (261.63 * Math.pow(2, W.key.root / 12) / 2)) % 1200) + 1200) % 1200; if (!sc.some((s) => Math.abs(s - c) < 1 || Math.abs(s - c) > 1199)) off++; } } out.off = off;
        out.aud = Ls.every((L) => { const X = M.HX.sch.get(L.sch[0]); let pk = 0; for (const ch of X.aud) for (let i = 0; i < ch[0].length; i += 7) pk = Math.max(pk, Math.abs(ch[0][i])); return pk > 1e-3; });
        // a tap on the bass's ring: it plays, the suggestion is taken
        M.hxRingTap(Ls[0].slot, null); await window.__sleep(2500);
        out.tap = Ls[0].state + ':' + (M.hxMi(Ls[0]).sugg || '');
        M.HX.pend.length = 0;
        M.hxUndoStep(); await window.__sleep(300);
        out.undo = res.made.filter((k) => M.hxByKey(k)).length;
      }
      await window.__reset();
      return out;
    });
    ok(r.role === 'melodie' && r.made === 2, `Begleiten: a Kalimba melody (${r.role}) gets two suggestions (${r.made})`);
    ok(r.states && r.states.every((s) => /^stumm:/.test(s)), `…both silent, dashed suggestions (${r.states})`);
    ok(r.off === 0 && r.aud, `…every note of bass and chords in the scale (${r.off} not), both rendered in the Werk-Rahmen`);
    ok(r.strongIn && r.strongIn[0] >= 0.7 * r.strongIn[1], `…the melody's strong notes lie in the bar's Klangfeld (${r.strongIn})`);
    ok(r.rough <= r.minOther + 1e-9, `Klangverwandtschaft: the chords on ${r.chEng} stand least rough against the Kalimba's partials (${r.rough.toFixed(3)} against ${r.minOther.toFixed(3)} the next best)`);
    ok(r.ms < 60, `…the plan over nine sources takes ${r.ms && r.ms.toFixed(1)} ms (once, on a tap – not in the audio path)`);
    ok(/^spielt:$/.test(r.tap), `a tap on a suggestion's ring plays it – taken (${r.tap})`);
    ok(r.undo === 0, `↶ takes the suggestions away (${r.undo} left)`);
  }

  // ---------- wk ----------
  if (has('wk')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, out = {};
      const motif = [[0, { d: 5 }, 0.8, 0.4], [0.5, { d: 7 }], [1, { d: 6 }], [1.5, { d: 8 }], [2, { d: 7 }], [2.5, { d: 9 }], [3, { d: 8 }]];
      const La = await window.__mkL(motif, { eng: 'glo' });
      const Lo = await window.__mkL([[0, { d: 2 }, 0.5, 3.5]], { eng: 'neb' });
      M.hxMi(La).wk = true; M.hxMi(Lo).wk = true;
      M.hxState(La.id, 'stumm', null, { X: 0.02 }); M.hxState(Lo.id, 'stumm', null, { X: 0.02 });
      M.hxMi(La).uMute = -1e6;   // (as if muted long ago – the eight bars are long over; Lo was muted just now)
      M.setParam('hx.gaertner', 'antwortet'); M.setParam('hx.gBegl', false); M.setParam('hx.gAntw', false);
      for (let k = 0; k < 3; k++) { const b = await window.__untilBar(1); window.__playF(motif.map(([bb, f, v]) => [M.tgTime(b + bb), f, v || 0.7, 0.2])); }
      let K = null; for (let i = 0; i < 100 && !K; i++) { await window.__sleep(50); K = M.HXW_K.wk; }
      out.wk = K ? M.hxByKey(K.key) === La : false; out.b = K && K.b; out.lead = K ? K.t - A.ctx.currentTime : null; out.on16 = K ? K.b % 16 === 0 : null;
      out.kn = [...M.HX.kn.values()].some((b) => b.kind === 'wk'); out.chips = M.HX.chips && M.HX.chips.kind;
      if (K) await window.__until(K.t + 0.2);
      out.state = La.state; out.lo = Lo.state;
      // ✕ refuses one
      M.hxState(La.id, 'stumm', null, { X: 0.02 }); M.hxMi(La).uMute = -1e6; M.hxMi(La).act = 5;
      await window.__untilBar(2); out.k2 = !!M.HXW_K.wk; M.hxMachNein(); out.refused = !M.HXW_K.wk && M.hxMi(La).wkHold > M.tgBeat(A.ctx.currentTime);
      M.setParam('hx.gaertner', 'schaut'); M.setParam('hx.gBegl', true); M.setParam('hx.gAntw', true);
      await window.__reset();
      return out;
    });
    ok(r.wk && r.on16 && r.lead > 1.5, `Wiederkehr: the marked loop's motif played – it comes back on the four-bar line (beat ${r.b}), announced ${r.lead && r.lead.toFixed(1)} s ahead`);
    ok(r.kn && r.chips === 'wk', `…a ring forms at the field's edge, the rail shows its chips`);
    ok(r.state === 'spielt', `…it plays again (${r.state})`);
    ok(r.lo === 'stumm', `the loop the player muted just now stays muted (${r.lo})`);
    ok(r.k2 && r.refused, `✕ refuses a Wiederkehr (eight bars left alone)`);
  }

  // ---------- puls ----------
  if (has('puls')) {
    r = await ev(async () => {
      const M = window.__M, out = {}, pat = M.euclid(16, 5, 2), notes = [];
      pat.forEach((on, i) => { if (on) notes.push([i * 0.25, { d: 1 }, 0.8, 0.2]); });
      const L = await window.__mkL(notes, { eng: 'mem' });
      out.fit = M.hxPulsFit(L);
      const before = ['steps', 'puls', 'rot', 'div', 'on'].map((k) => M.P['l2.' + k]);
      M.hxPulsLernt(L, 2);
      out.set = ['steps', 'puls', 'rot', 'div', 'on', 'eng'].map((k) => M.P['l2.' + k]);
      M.undo(); out.back = ['steps', 'puls', 'rot', 'div', 'on'].map((k) => M.P['l2.' + k]); out.before = before;
      await window.__reset();
      return out;
    });
    ok(r.fit && r.fit.steps === 16 && r.fit.puls === 5 && r.fit.rot === 2 && r.fit.ham === 0, `Puls lernt: E(5, 16) rotated by 2 found exactly (${r.fit && [r.fit.steps, r.fit.puls, r.fit.rot, r.fit.ham]})`);
    ok(r.set[0] === 16 && r.set[1] === 5 && r.set[2] === 2 && r.set[3] === '0.25' && r.set[4] === true && r.set[5] === 'mem', `…written into lane 3 (${r.set})`);
    ok(JSON.stringify(r.back) === JSON.stringify(r.before), `…↶ (the patch's undo) brings the lane back (${r.back})`);
  }

  // ---------- hand ----------
  if (has('hand')) {
    r = await ev(async () => {
      const M = window.__M, out = {};
      await M.hxHandDel('main'); await M.hxHandDel('pend');
      M.setParam('hx.hand', 'aus');
      for (let i = 0; i < 20; i++) M.hxAntLearn('1:1:0');
      await M.hxHandPend(); out.offPend = !!(await M.hxHandGet('pend'));
      M.setParam('hx.hand', 'an'); await window.__sleep(200);
      const L = await window.__mkL([[0, { d: 5 }, 0.8, 0.4], [1, { d: 7 }], [2, { d: 6 }], [3, { d: 5 }]], { eng: 'glo', bpm: 92 });
      for (let i = 0; i < 60; i++) M.hxAntLearn(['2:1:0', '-1:1:2', '1:2:1', '-2:1:0'][i % 4]);
      await M.hxHandPend(); const pend = await M.hxHandGet('pend'); out.pend = !!(pend && pend.d && pend.d.tok);
      const hs = await M.hxHandTake(null); out.main = !!hs; out.tempi = hs && hs.tempi; out.toks = hs ? Object.keys(hs.tok).length : 0; out.bytes = hs && hs.bytes; out.pendGone = !(await M.hxHandGet('pend'));
      // pruning: a huge one stays under 1 MB
      const big = { v: 1, tok: {}, tempi: {}, scales: {}, srcs: {}, grooves: {}, prog: {}, ow: {}, n: 1 }; for (let i = 0; i < 60000; i++) big.tok['c' + i + '|' + (i % 7)] = { [(i % 15) - 7 + ':1:0']: 1 + (i % 5) };
      out.pruned = M.hxHandPrune(big).bytes;
      out.prior = M.hxTempoPrior();
      const ex = await M.hxHandExport(); out.ex = !!ex;
      M.HX.hs = null; // (the reload checks the store)
      return out;
    });
    ok(!r.offPend, `Handschrift off (the default): nothing is stored`);
    ok(r.pend && r.main && r.pendGone && r.toks > 4 && r.tempi && r.tempi['92'], `on: the session waits as „pend“; „übernehmen“ merges it – ${r.toks} contexts, the tempo 92 among its tempi (${JSON.stringify(r.tempi)}), ${r.bytes} bytes`);
    ok(r.pruned <= 1000000, `…a Handschrift is pruned under 1 MB (${r.pruned} bytes)`);
    ok(r.ex, `…export as a file`);
    // a reload: the Handschrift is there from the first minute
    await page.reload(); await page.waitForFunction(() => !!window.__M); await H.tools(page); await G.gtools(page); await ktools(page);
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok' || window.__M.HX.state === 'kein', null, { timeout: 8000 });
    await page.waitForTimeout(1200);
    r = await ev(async () => {
      const M = window.__M, out = {};
      out.hand = M.P['hx.hand']; out.hs = !!M.HX.hs; out.hsN = M.HXA.hsN; out.n = M.HXA.n; out.prior = M.hxTempoPrior();
      // the Takt finder leans to the player's tempo: an even line of eighths at 184 – read at 92 with the Handschrift's prior
      out.dist = M.hxAntDist(['2:1:0']).length;
      await M.hxHandForget(); out.forgot = !(await M.hxHandGet('main')) && !M.HX.hs;
      M.setParam('hx.hand', 'aus');
      return out;
    });
    ok(r.hand === 'an' && r.hs && r.hsN + r.n >= 40, `after a reload the Handschrift is in play: answers from the first minute (${r.hsN} notes known, ${r.n} played)`);
    ok(Math.abs(r.prior - 92) < 1, `…the Takt finder leans to the player's tempo (${r.prior} instead of 100)`);
    ok(r.dist > 0, `…the model knows the player's turns from the start`);
    ok(r.forgot, `Vergessen: the Handschrift is gone`);
  }

  ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  const f = H.summary();
  await H.close();
  process.exit(f ? 1 : 0);
})();
