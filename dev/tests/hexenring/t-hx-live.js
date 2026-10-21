// Hexenring – Etappe 4, the loops played live and what grows out of them (SPEC §10.6 Live mode in full, §17 Ladung on
// loops, §13 Knospen's vetoes, §12 Wiederkehr without a Takt; §22 Etappe 4's rows):
//  live   „Wiedergabe: Live“ chosen while the Werk-Rahmen works: real voices play the notes, the Schicht falls silent
//         at the seam; the voices are loop voices on the Hexenring's way, never in the notes Humus; they give way to
//         the player's notes and a loop note that does not fit is not played; the card, the record; off: the Schicht
//         again, no more voices
//  midi   MIDI out (a fake output): every note of every pass, on time, its pitch exact by a bend before it, a channel
//         of its own in turn (never 10), its note-off; a Live loop's too
//  lad    Ladung on loops: only where it is switched on; an Abdruck's slices (Auslassen, Stottern) by the charge, back
//         to clean when it drops; a varied loop's passes boil (more changes, fewer kept) – Treu stays Treu
//  veto   the planned changes of a varied loop listed with ✕: one refused goes back to what the pass before had, the
//         passes after it grow from the corrected one, its operator counts less; in the card
//  wk     Wiederkehr without a Takt: a free loop at rest, its motif played freely – it comes back on its own next pass
//   node t-hx-live.js      env: PARTS=live,midi,lad,veto,wk
const H = require('./hx-h'), G = require('./hx-g');
const { ok } = H;
const PARTS = (process.env.PARTS || 'live,midi,lad,veto,wk').split(',');
const has = (p) => PARTS.includes(p);
(async () => {
  const { page, errors } = await G.open({});
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    const M = window.__M, A = M.A;
    for (const [k, v] of Object.entries({ 'mov.vib': 0, 'mov.drift': 0, 'rev.mix': 0, 'dly.mix': 0, 'v.human': 0 })) M.setParam(k, v);
    // a loop of `bars` bars from field degrees played on the grid from the next bar line: [[beat, degree, vel, dur(beats)]]
    window.__mkL = async (notes, o = {}) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', o.bars || 1);
      window.__grid(o.bpm || 120); await window.__sleep(400);
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      window.__play(notes.map(([b, d, v, du]) => [t0 + b * beat, d, v || 0.7, (du || 0.5) * beat]), { eng: o.eng || 'klb' });
      await window.__until(t0 + 4 * beat * (o.bars || 1) + 0.05);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); if (!L) return null;
      const S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 80 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      M.HX.chips = null;
      return L;
    };
    window.__nextPass = (L, ahead = 1) => { const k = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime))) + ahead; return { k, a: M.hxT(M.hxPassF(L, k)), b: M.hxT(M.hxPassF(L, k + 1)) }; };
  });
  const MOTIF = [[0, 3], [0.5, 5], [1, 4], [1.5, 6], [2, 5], [2.5, 7], [3, 6]];
  let r;

  // ---------- live ----------
  if (has('live')) {
    r = await ev(async (MOTIF) => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset();
      const L = await window.__mkL(MOTIF); o.L = !!L; if (!L) return o;
      o.st = M.HXW.st; await window.__sleep(300);
      M.hxWSet(L, 'live', true);
      const P = window.__nextPass(L, 1); o.lm = false;
      const seen = new Set(), ev0 = M.hxEvents(0, A.ctx.currentTime + 60, true).length;
      while (A.ctx.currentTime < P.b + M.hxLen(L)) { for (const v of A.voices) if (v.loop) seen.add(v); o.lm = o.lm || M.HX.sch.get(L.sch[0]).lm; await window.__sleep(25); }
      o.voices = seen.size; o.allLoop = [...seen].every((v) => v.loop && v.bus === M.hxChain('fx1').in || v.loop);
      o.humus = M.hxEvents(0, A.ctx.currentTime + 60, true).length - ev0;
      o.notes = M.hxPassNotes(L, P.k).length;
      const mt = await window.__meter(L.id, 800); o.schLvl = Math.max(...mt.map((x) => x[1]));
      M.hxCardOpen(L.slot); await window.__sleep(400);
      const chips = [...document.querySelectorAll('.hx-card .chip')];
      o.chipLive = chips.some((b) => b.textContent === 'Live' && b.getAttribute('aria-pressed') === 'true');
      o.chipWuchs = chips.some((b) => b.textContent === 'Wuchs' && b.getAttribute('aria-pressed') === 'true');
      o.rec = (M.hxEcoOf(L) || {}).live === 1;
      // the player floods the voices, one note at a time: the loop's give way first; once full, a loop note that does
      // not fit is not played
      for (let i = 0; i < 100 && ![...A.voices].some((v) => v.loop); i++) await window.__sleep(10);
      const mine = []; o.lv0 = [...A.voices].filter((v) => v.loop).length; o.stolenMine = 0; o.loopGone = false;
      for (let i = 0; i < 96; i++) {
        const v = M.playNote('glo', A.ctx.currentTime + 0.01, M.N.notes[i % M.N.notes.length].f, 0.5, 0.25, { bus: M.stripIn('fin') }); if (v) mine.push(v);
        const loopN = [...A.voices].filter((x) => x.loop).length, lost = mine.filter((x) => !A.voices.has(x)).length;
        if (loopN > 0 && lost > 0) o.stolenMine++;
        if (!loopN) { o.loopGone = true; o.mine = mine.length; break; }
      }
      const kept = mine.filter((x) => A.voices.has(x));
      await window.__sleep(M.hxLen(L) * 600);
      o.loopWhileFull = [...A.voices].filter((v) => v.loop).length; o.keptAfter = kept.filter((x) => A.voices.has(x)).length; o.kept = kept.length;
      for (const v of mine) try { v.release && v.release(); } catch (e) {}
      await window.__sleep(1500);
      // off: the Schicht again
      M.hxWSet(L, 'live', false);
      const Q = window.__nextPass(L, 1); await window.__until(Q.a + 0.3);
      const seen2 = new Set(); const end = performance.now() + 900; while (performance.now() < end) { for (const v of A.voices) if (v.loop) seen2.add(v); await window.__sleep(25); }
      o.after = seen2.size; o.lmOff = !M.HX.sch.get(L.sch[0]).lm;
      const mt2 = await window.__meter(L.id, 800); o.schLvl2 = Math.max(...mt2.map((x) => x[1]));
      const S0 = M.HX.sch.get(L.sch[0]); o.dbg = JSON.stringify({ st: L.state, gg: L.gg, gain: S0.gain, mute: S0.mute, lm: S0.lm, wu: M.hxWAktiv(L), n: mt2.length, sch: L.sch.length, idle: M.IDLE.on, off: M.IDLE.hxOff });
      return o;
    }, MOTIF);
    ok(r.L && r.st !== 'kein' && r.lm && r.voices >= r.notes && r.notes >= 6, `Live chosen while the Werk-Rahmen works (${r.st}): real voices play the notes (${r.voices} in a pass of ${r.notes} notes and the next), the Schicht falls silent at the seam (its level ${r.schLvl != null ? r.schLvl.toFixed(4) : '?'})`);
    ok(r.allLoop && r.humus === 0 && r.schLvl < 1e-4, `  loop voices on the Hexenring's way – none in the notes Humus (${r.humus})`);
    ok(r.chipLive && !r.chipWuchs && r.rec, `  the card shows „Live“ chosen, the record keeps it`);
    ok(r.lv0 > 0 && r.loopGone && r.stolenMine === 0 && r.loopWhileFull === 0 && r.keptAfter === r.kept, `  the player's notes come first: the loop's ${r.lv0} voices gave way before any of the player's ${r.mine} (none of them taken), and while all are held no loop note is played (${r.loopWhileFull})`);
    ok(r.lmOff && r.after === 0 && r.schLvl2 > 0.003, `  Live off: from the seam the Schicht again (level ${r.schLvl2 ? r.schLvl2.toFixed(3) : '?'}), no voices` + (r.schLvl2 > 0.003 ? '' : ' ' + r.dbg));
  }

  // ---------- midi ----------
  if (has('midi')) {
    r = await ev(async (MOTIF) => {
      const M = window.__M, A = M.A, o = {}, log = [];
      await window.__reset();
      M.MIDI.outs.set('fake', { key: 'fake', dir: 'out', kind: 'webmidi', port: { send: (b, ts) => log.push([[...b], ts, A.ctxOff]) } });
      const L = await window.__mkL(MOTIF); o.L = !!L; if (!L) return o;
      await window.__sleep(300);
      M.hxMidiSet(L, true);
      const P = window.__nextPass(L, 1), want = [];
      for (const k of [P.k, P.k + 1]) { const a = M.hxT(M.hxPassF(L, k)); for (const n of M.hxPassNotes(L, k)) want.push({ t: a + n.t0, f: n.f }); }   // (audio time)
      await window.__until(P.a + 2 * M.hxLen(L) + 0.4);
      const ons = [], offs = []; let lastBend = {};
      // each timestamp back on the audio clock by the mapping the page sent it with (the container's audio clock runs
      // slow against the wall clock; the page follows it – ctxSync – as its MIDI clock does): its offset from the note
      for (const [b, ts, off] of log) { const st = b[0] & 0xf0, ch = b[0] & 15, ta = (ts - off) / 1000; if (st === 0xe0) lastBend[ch] = [((b[2] << 7) | b[1]), ts]; else if (st === 0x90 && b[2] > 0) ons.push({ ch, key: b[1], ts, ta, bend: lastBend[ch] }); else if (st === 0x80) offs.push({ ch, key: b[1], ts }); }
      const inWin = ons.filter((x) => x.ta >= want[0].t - 0.06 && x.ta <= want[want.length - 1].t + 0.06);
      o.n = inWin.length; o.want = want.length;
      const ds = inWin.map((x) => { const w = want.reduce((p, q) => (Math.abs(q.t - x.ta) < Math.abs(p.t - x.ta) ? q : p)); return (x.ta - w.t) * 1000; }), md = ds.slice().sort((a, b) => a - b)[ds.length >> 1];
      o.lat = md; let dt = 0, dc = 0, bendFirst = true;
      inWin.forEach((x, i) => {
        const w = want.reduce((p, q) => (Math.abs(q.t - x.ta) < Math.abs(p.t - x.ta) ? q : p));
        dt = Math.max(dt, Math.abs(ds[i] - md));
        const st = x.key + ((x.bend ? x.bend[0] : 8192) - 8192) / 8192 * 2, sw = 69 + 12 * Math.log2(w.f / 440); dc = Math.max(dc, Math.abs(st - sw) * 100);
        if (!x.bend || Math.abs(x.bend[1] - x.ts) > 1e-6) bendFirst = false;
      });
      o.dt = dt; o.dc = dc; o.bendFirst = bendFirst;
      o.chans = [...new Set(inWin.map((x) => x.ch))].sort((a, b) => a - b); o.no10 = !inWin.some((x) => x.ch === 9);
      o.offs = inWin.every((x) => offs.some((y) => y.ch === x.ch && y.key === x.key && y.ts > x.ts));
      // a Live loop's notes too
      M.hxWSet(L, 'live', true); const Q = window.__nextPass(L, 2); await window.__until(Q.b + 0.4);
      o.liveN = log.filter(([b, ts, off]) => { const ta = (ts - off) / 1000 - o.lat / 1000; return (b[0] & 0xf0) === 0x90 && ta >= Q.a - 0.002 && ta < Q.b - 0.002; }).length; o.liveWant = M.hxPassNotes(L, Q.k).length;
      M.hxWSet(L, 'live', false); M.hxMidiSet(L, false); const n1 = log.length; await window.__sleep(M.hxLen(L) * 1000 + 300); o.offN = log.slice(n1).filter(([b]) => (b[0] & 0xf0) === 0x90).length;
      M.MIDI.outs.delete('fake');
      return o;
    }, MOTIF);
    ok(r.L && r.n === r.want && r.dt < 1 && Math.abs(r.lat) < 1, `MIDI out: every note of two passes (${r.n} of ${r.want}), stamped ahead at its time on the page's MIDI clock (the Puls's clock's mapping: at most ${r.dt != null ? r.dt.toFixed(2) : '?'} ms off, none late)`);
    ok(r.bendFirst && r.dc < 1, `  each pitch exact by the bend sent with it (at most ${r.dc != null ? r.dc.toFixed(2) : '?'} cents)`);
    ok(r.no10 && r.chans && r.chans.length >= Math.min(r.n, 8) && r.offs, `  a channel of its own in turn (${(r.chans || []).map((c) => c + 1).join(' ')} – never 10), each with its note-off`);
    ok(r.liveN === r.liveWant && r.offN === 0, `  a Live loop's notes too (${r.liveN} of ${r.liveWant}); off: none more`);
  }

  // ---------- lad ----------
  if (has('lad')) {
    r = await ev(async (MOTIF) => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset();
      const L = await window.__mkL(MOTIF); o.L = !!L; if (!L) return o;
      await window.__sleep(300);
      const sent = [], pp = M.HX.node.port.postMessage.bind(M.HX.node.port);
      M.HX.node.port.postMessage = (m, t) => { if (m && m.slice) sent.push(JSON.parse(JSON.stringify(m.slice))); return pp(m, t); };
      const gk = M.GK.on, gl = M.GK.p.lad; M.GK.on = true; M.GK.p.lad = true;
      M.LAD.lvl = 0.8; M.hxLadTick(); M.HX.ladT = 0; await window.__sleep(300); M.HX.ladT = 0; M.hxLadTick();
      o.offQ = L.ladQ || 0; o.offSent = sent.length;
      M.hxLadSet(L, true); M.HX.ladT = 0; M.hxLadTick(); await window.__sleep(250);
      o.q = L.ladQ; o.sl = sent.length ? sent[sent.length - 1] : null;
      M.LAD.lvl = 0; M.HX.ladT = 0; M.hxLadTick(); await window.__sleep(250);
      o.q0 = L.ladQ; o.sl0 = sent.length ? sent[sent.length - 1] : null;
      M.HX.node.port.postMessage = pp;
      // a varied loop boils: the same seeds, with and without the charge
      M.hxWSet(L, 'eig', 'variieren'); M.hxWSet(L, 'wahl', true); await window.__sleep(300);
      const S = M.HX.sch.get(L.sch[0]), W0 = M.hxWBase(L, S), chg = (lad) => { let c = 0, kept = 0, n = 0; for (let seed = 1; seed <= 60; seed++) { let prev = { n: W0.n, hist: [] }; for (let q = 0; q < 6; q++) { const st = M.hxVarStep(W0, W0.n, prev, { seed: seed * 977 + q, lvl: 2, wts: M.HX.vw, gd: 0, guard: false, segs: [], bpb: 4, lad }); c += (st.chg || []).length; n++; if (!(st.chg || []).length) kept++; prev = st; } } return { c: c / n, kept: kept / n }; };
      o.v0 = chg(0); o.v9 = chg(0.9);
      // Treu stays Treu
      M.hxWSet(L, 'eig', 'treu'); M.LAD.lvl = 0.9; M.HX.ladT = 0; M.hxLadTick(); await window.__sleep(250);
      M.hxCardOpen(L.slot); await window.__sleep(400);
      o.treu = [...document.querySelectorAll('.hx-card .hx-ms')].some((x) => x.textContent === 'Treu bleibt Treu');
      M.LAD.lvl = 0; M.GK.on = gk; M.GK.p.lad = gl;
      return o;
    }, MOTIF);
    ok(r.L && r.offQ === 0, `Ladung on loops only where switched on: the charge at 0,8, a loop without it unchanged (${r.offQ})`);
    const s1 = r.sl && [].concat(r.sl)[0], s0 = r.sl0 && [].concat(r.sl0)[0];
    ok(r.q === 0.8 && s1 && s1.pd > 0.2 && s1.ps > 0.3, `  switched on: an Abdruck's slices by the charge (Auslassen ${s1 ? s1.pd.toFixed(2) : '?'}, Stottern ${s1 ? s1.ps.toFixed(2) : '?'} at 0,8)`);
    ok(r.q0 === 0 && (!s0 || (!(s0.pd > 0) && !(s0.ps > 0))), `  the charge gone: clean again`);
    ok(r.v9 && r.v9.c > 1.5 * r.v0.c && r.v9.kept < r.v0.kept, `  a varied loop's passes boil: ${r.v0.c.toFixed(2)} → ${r.v9.c.toFixed(2)} changes a pass, passes kept as they were ${(100 * r.v0.kept).toFixed(0)} → ${(100 * r.v9.kept).toFixed(0)} %`);
    ok(r.treu, `  Treu stays Treu (the card says so)`);
  }

  // ---------- veto ----------
  if (has('veto')) {
    r = await ev(async (MOTIF) => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset();
      const L = await window.__mkL(MOTIF.concat([[3.5, 8]])); o.L = !!L; if (!L) return o;
      M.hxWSet(L, 'eig', 'variieren'); M.hxWSet(L, 'wahl', true);
      let vt = []; for (let i = 0; i < 80 && !vt.length; i++) { await window.__sleep(150); vt = M.hxVetoList(L); }
      o.n = vt.length; if (!vt.length) return o;
      const v = vt[0], S = v.S, W0 = v.W0, key = M.hxVKey(W0, v.x), vw0 = Object.assign({}, M.HX.vw), ops = (v.r.ops || []).filter((x) => x !== 'ret' && x !== 'nein');
      o.text = M.hxVetoText(L, v);
      const before = S.vc.m.get(v.k).n.map((x) => M.hxVKey(W0, x)); o.had = before.includes(key);
      const later = [...S.vc.m.keys()].filter((x) => x > v.k).length;
      o.ok = M.hxVeto(L, v);
      const after = S.vc.m.get(v.k).n.map((x) => M.hxVKey(W0, x)); o.gone = !after.includes(key);
      const prev = (S.vc.m.get(v.k - 1) || { n: W0.n }).n, t = v.x.t; o.back = prev.filter((x) => Math.abs(x.t - t) < 1 / 16).every((x) => after.includes(M.hxVKey(W0, x)));
      o.later = later; o.laterNow = [...S.vc.m.keys()].filter((x) => x > v.k).length;
      o.less = ops.length ? ops.every((op) => (M.HX.vw[op] || 1) < (vw0[op] != null ? vw0[op] : 1)) : true; o.ops = ops;
      // in the card: the list with ✕, one refused there
      M.hxCardOpen(L.slot); await window.__sleep(500);
      let box = null; for (let i = 0; i < 40 && !(box && box.querySelector('button')); i++) { M.hxCardRender(); await window.__sleep(100); box = document.querySelector('.hx-card .hx-veto'); }   // (a pass between two plans may have none)
      o.card = !!box; const bs = box ? [...box.querySelectorAll('button')] : []; o.cardN = bs.length;
      if (bs.length) { const lab = bs[0].getAttribute('aria-label'); bs[0].click(); await window.__sleep(400); M.hxCardRender(); await window.__sleep(200); const b2 = document.querySelector('.hx-card .hx-veto'); o.cardGone = !b2 || ![...b2.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === lab) || M.hxVetoList(L).length < bs.length; }
      return o;
    }, MOTIF);
    ok(r.L && r.n > 0 && r.had && r.ok && r.gone, `vetoes: a varied loop's planned changes listed (${r.n}; „${r.text}“) – one refused is gone from its pass`);
    ok(r.back && r.laterNow === 0, `  what the pass before had there is back; the passes after it grow again from the corrected one (${r.later} planned → ${r.laterNow})`);
    ok(r.less, `  its operator counts less for the session (${(r.ops || []).join(', ') || '–'})`);
    ok(r.card && r.cardN > 0 && r.cardGone, `  in the card: „Knospen – geplant“ with ✕ each (${r.cardN}), one refused there`);
  }

  // ---------- wk ----------
  if (has('wk')) {
    r = await ev(async () => {
      const M = window.__M, A = M.A, o = {};
      await window.__reset();   // (no grid, the tempo free)
      M.setParam('hx.laenge', 'auto');
      // a free figure, played three times without a grid
      const degs = [3, 5, 4, 7, 6], gaps = [0.31, 0.47, 0.29, 0.53, 0.62], P0 = gaps.reduce((a, b) => a + b, 0);
      const fig = (t0) => { let t = t0; const list = []; degs.forEach((d, i) => { list.push([t, d, i ? 0.6 : 0.9, 0.2]); t += gaps[i]; }); window.__play(list, { eng: 'glo' }); return t; };
      let t = A.ctx.currentTime + 0.3; for (let i = 0; i < 3; i++) t = fig(t);
      await window.__until(t - gaps[gaps.length - 1] + 0.25);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); o.L = !!L; if (!L) return o;
      const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 80 && !(S.wn && S.aud); i++) { await window.__sleep(100); M.hxWNotesAll(L); }
      o.free = !M.hxGrid(); o.len = M.hxLen(L); o.P0 = P0;
      M.hxMi(L).wk = true; M.hxState(L.id, 'stumm', null, { X: 0.02 }); M.hxMi(L).uMute = -1e6;
      M.setParam('hx.gaertner', 'antwortet'); M.setParam('hx.gBegl', false); M.setParam('hx.gAntw', false);
      await window.__sleep(1500);
      o.seq = (M.hxWkSeqD(L) || []).length;
      t = A.ctx.currentTime + 0.2; for (let i = 0; i < 3; i++) t = fig(t);
      let K = null; const tEnd = t + 6; while (A.ctx.currentTime < tEnd && !K) { await window.__sleep(50); K = M.HXW_K.wk; }
      o.wk = !!K && M.hxByKey(K.key) === L; o.b = K && K.b;
      if (K) { o.lead = K.t - A.ctx.currentTime; const want = M.hxT(M.hxPassF(L, M.hxPassK(L, Math.round(M.hxF(K.t))))); o.onPass = Math.abs(want - K.t) < 0.002; await window.__until(K.t + 0.3); }
      o.state = L.state;
      M.setParam('hx.gaertner', 'schaut'); M.setParam('hx.gBegl', true); M.setParam('hx.gAntw', true);
      return o;
    });
    ok(r.L && r.free && r.seq >= 4, `Wiederkehr without a Takt: a free loop (${r.len ? r.len.toFixed(2) : '?'} s, no grid) – its motif as steps and durations (${r.seq} tokens)`);
    ok(r.wk && r.b == null && r.onPass, `  its motif played freely: it comes back on its own next pass (announced ${r.lead != null ? r.lead.toFixed(1) : '?'} s ahead)`);
    ok(r.state === 'spielt', `  …and plays again (${r.state})`);
  }
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
