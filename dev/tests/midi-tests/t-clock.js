// MIDI clock in (DLL, fractional tempo, Start/Stop/Continue/SPP, lost clock, loop guard) and clock out (timestamped
// F8 at 24 ppqn from the audio clock, FA/FC with the Puls).   node t-clock.js
const { open, ok, close } = require('./h');
const SETUP = () => {
  // pulses on an ideal grid with random jitter on their timeStamps; extra messages before chosen pulses
  window.__clock = (o) => new Promise((res) => {
    const per = 60000 / (24 * o.bpm), t0 = o.t0 || performance.now() + 2, log = [], offs = [];   // (offs: the audio↔performance mapping each pulse met)
    let k = 0;
    const step = () => {
      const now = performance.now();
      while (k < o.n && t0 + k * per <= now) {
        const ideal = t0 + k * per;
        for (const e of o.events || []) if (e.k === k) window.__send(e.bytes, o.id || 'c1', ideal - per / 2);
        window.__send([0xf8], o.id || 'c1', ideal + (Math.random() * 2 - 1) * (o.jit || 0));
        log.push(ideal); offs.push(window.__M.A.ctxOff); k++;
      }
      if (k >= o.n) res({ log, offs, per, t0, end: t0 + k * per }); else setTimeout(step, 1);
    };
    step();
  });
  // every Puls hit: its scheduled audio time and the audio↔performance mapping it was scheduled with (the headless audio
  // device stalls now and then; the mapping follows such a stall, so a later mapping would misjudge earlier hits)
  window.__hits = [];
  const M = window.__M;
  for (const k of Object.keys(M.ENGINES)) {
    const E = M.ENGINES[k], orig = E.start;
    E.start = function (v, t, ...rest) { window.__hits.push([t, M.A.ctxOff]); return orig.call(this, v, t, ...rest); };
  }
};
(async () => {
  // ---------- clock in ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['c1', 'Arturia KeyStep 37'], ['c2', 'Zweite Uhr']] } });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    await ev(SETUP);
    await ev(() => { const M = window.__M; M.setParam('v.human', 0); M.setParam('seq.swing', 0); });
    for (const [bpm, jit] of [[100, 1.5], [120, 1.5], [140, 1.5], [120, 6]]) {
      const r = await ev(async ({ bpm, jit }) => {
        const M = window.__M;
        await window.__clock({ bpm, n: 8 * 24, jit });
        const ext = M.SEQ.ext && M.SEQ.ext.bpm;
        await window.__sleep(700);   // clock gone → back to the Puls's own tempo
        return { ext, seq: M.SEQ.bpm, param: M.P['seq.bpm'], after: M.SEQ.ext };
      }, { bpm, jit });
      ok(r.ext && Math.abs(r.ext - bpm) < 0.5, `clock in ${bpm} BPM ±${jit} ms jitter → EXT ${r.ext && r.ext.toFixed(2)} BPM`);
      ok(r.param === 84 && r.after === null && r.seq === 84, `  lost after 0.5 s → back to 84; the tempo parameter never changed`);
    }
    // fractional tempo sticks while the Puls runs, phase-locked after Start: hits on the device's beats
    let r = await ev(async () => {
      const M = window.__M;
      M.setParam('l0.on', true); M.setParam('l0.div', '0.25'); M.setParam('l0.steps', 16); M.setParam('l0.puls', 16); M.setParam('l0.prob', 1);
      for (const i of [1, 2, 3]) M.setParam('l' + i + '.on', false);
      window.__hits.length = 0;
      const p = window.__clock({ bpm: 118.7, n: 12 * 24, jit: 1.5, events: [{ k: 48, bytes: [0xfa] }] });
      await window.__sleep(1500);
      const mid = { on: M.SEQ.on, ext: M.SEQ.ext && M.SEQ.ext.bpm, seq: M.SEQ.bpm, ring: M.SEQ.ext ? 'EXT' : '' };
      const { log, per } = await p;
      // beat 0 = pulse 48; every 16th (6 pulses) a hit at the device's time for it
      const t48 = log[48], errs = [];
      for (const [t, off] of window.__hits) {
        if (t <= 0) continue;   // calibration renders voices at t = 0 offline
        const at = t * 1000 + off - t48, n = Math.round(at / (6 * per));
        if (n >= 4 && n * 6 + 48 < log.length - 6) errs.push(at - n * 6 * per);
      }
      await window.__sleep(700);
      return { mid, errs, after: { on: M.SEQ.on, ext: M.SEQ.ext, seq: M.SEQ.bpm } };
    });
    const mx = Math.max(...r.errs.map(Math.abs)), avg = r.errs.reduce((a, b) => a + Math.abs(b), 0) / r.errs.length;
    ok(r.mid.on && Math.abs(r.mid.ext - 118.7) < 0.4 && r.mid.seq === r.mid.ext, 'Start (FA) starts the Puls; fractional 118,7 BPM sticks (' + r.mid.ext.toFixed(2) + ')');
    ok(r.errs.length > 20 && mx < 6 && avg < 2.5, 'Puls hits land on the device’s sixteenths (' + r.errs.length + ' hits, mean ' + avg.toFixed(2) + ' ms, max ' + mx.toFixed(2) + ' ms)');
    ok(r.after.on && r.after.ext === null && r.after.seq === 84, 'clock lost: the Puls keeps running on its own tempo');
    // Stop, Song Position, Continue
    r = await ev(async () => {
      const M = window.__M, out = {};
      const p = window.__clock({ bpm: 120, n: 6 * 24, jit: 1, events: [{ k: 24, bytes: [0xfa] }, { k: 72, bytes: [0xfc] }, { k: 84, bytes: [0xf2, 8, 0] }, { k: 96, bytes: [0xfb] }] });
      await window.__sleep(24 * 20.8 + 10 * 20.8 + 50); out.started = M.SEQ.on;
      await window.__sleep(48 * 20.8 + 30); out.stopped = !M.SEQ.on;
      const { log, offs } = await p;
      // continue at pulse 96 from song position 8 sixteenths = beat 2 – each pulse on the audio clock as the app read it
      // then (the mapping of that moment: a later one, moved by a stall of the headless audio device meanwhile, put
      // beat 2 at 1.971)
      out.on = M.SEQ.on; out.beat = M.beatAt((log[96] - offs[96]) / 1000); out.beat2 = M.beatAt((log[120] - offs[120]) / 1000);
      await window.__sleep(700); window.__send([0xfc], 'c1');
      return out;
    });
    ok(r.started && r.stopped, 'Start and Stop (FC) from the device run the Puls');
    ok(r.on && Math.abs(r.beat - 2) < 0.02 && Math.abs(r.beat2 - 3) < 0.03, 'Song Position + Continue resume at beat 2 (' + r.beat.toFixed(3) + ', +24 pulses ' + r.beat2.toFixed(3) + ')');
    // transport off; clock follow off; a second clock while one leads; our own clock coming back
    r = await ev(async () => {
      const M = window.__M, out = {};
      M.setParam('midi.transport', false);
      window.__send([0xfa], 'c1'); await window.__sleep(200); out.noStart = !M.SEQ.on;
      M.setParam('midi.transport', true); M.setParam('midi.clock', 'off');
      await window.__clock({ bpm: 150, n: 48, jit: 0, events: [{ k: 10, bytes: [0xfa] }] });
      out.noExt = M.SEQ.ext === null && M.SEQ.on && M.SEQ.bpm === 84;
      window.__send([0xfc], 'c1'); M.setParam('midi.clock', 'follow');
      const a = window.__clock({ bpm: 100, n: 96, jit: 0.5, id: 'c1' });
      await window.__sleep(300);
      const b = window.__clock({ bpm: 160, n: 48, jit: 0.5, id: 'c2' });
      await Promise.all([a, b]);
      out.lead = M.SEQ.ext && Math.abs(M.SEQ.ext.bpm - 100) < 1 && M.SEQ.ext.name === 'Arturia KeyStep 37';
      await window.__sleep(700);
      return out;
    });
    ok(r.noStart, '"Start/Stop vom Gerät" off: Start is ignored');
    ok(r.noExt, '"Tempo vom Gerät" off: no EXT tempo, Start still starts the Puls');
    ok(r.lead, 'with two clocks the first one leads');
    console.log('errors:', errors.length ? errors.join('\n') : 'none');
    ok(!errors.length, 'no console errors (clock in)');
    await close();
  }

  // ---------- clock out, loop guard ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['n1', 'nanoKEY Studio KEYBOARD/CTRL']], outs: [['o1', 'nanoKEY Studio KEYBOARD/CTRL'], ['o2', 'Anderes Gerät']] } });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    await ev(SETUP);
    let r = await ev(async () => {
      const M = window.__M, F = window.__midi, o = M.MIDI.outs.get('o1'), out = { outs: M.MIDI.outs.size };
      out.ctxOk = Math.abs(performance.now() - M.perfAt(M.A.ctx.currentTime)) < 40;
      M.midiSetClockOut(o, true);
      await window.__sleep(600);
      const free = F.outputs.get('o1').sent.slice();
      M.seqStart(); const anchor = M.perfAt(M.SEQ.anchorT);
      await window.__sleep(900);
      M.setParam('seq.bpm', 120); const tChange = performance.now();
      await window.__sleep(700);
      M.seqStop();
      await window.__sleep(400);
      const all = F.outputs.get('o1').sent.slice();
      M.midiSetClockOut(o, false);
      const nOff = F.outputs.get('o1').sent.length;
      await window.__sleep(300);
      return Object.assign(out, { free, all, anchor, tChange, nOff, after: F.outputs.get('o1').sent.length, other: F.outputs.get('o2').sent.length, pref: M.portPref(o).clock });
    });
    const per = (bpm) => 60000 / (24 * bpm);
    const f8 = (a) => a.filter((m) => m.d[0] === 0xf8);
    const gaps = (a) => a.slice(1).map((m, i) => m.ts - a[i].ts);
    const freeG = gaps(f8(r.free)).slice(1);   // the grid starts at 'now': its first gap is shorter
    ok(r.outs === 2 && r.ctxOk, 'outputs scanned; audio clock mapped onto performance.now()');
    // (as for the running Puls below: exact on the audio clock; on performance.now() the mapping walks a fraction of a
    // millisecond a pulse while the headless audio device stalls – it measured 28.99–29.44 ms gaps then, the audio
    // clock's exactly 29.76)
    const freeA = gaps(f8(r.free).map((m) => ({ ts: m.ts - m.off }))).slice(1);
    ok(freeG.length > 12 && freeA.every((g) => Math.abs(g - per(84)) < 0.01) && freeG.every((g) => Math.abs(g - per(84)) < 1.1), 'while the Puls stands: steady F8 at 84 BPM (' + freeG.length + ' gaps on the audio clock ' + Math.min(...freeA).toFixed(3) + '–' + Math.max(...freeA).toFixed(3) + ' ms; stamped on performance.now() ' + Math.min(...freeG).toFixed(2) + '–' + Math.max(...freeG).toFixed(2) + ' ms)');
    const iFA = r.all.findIndex((m) => m.d[0] === 0xfa), FA = r.all[iFA];
    const before = r.all.slice(0, iFA).filter((m) => m.d[0] === 0xf8), afterFA = f8(r.all.slice(iFA + 1));
    ok(FA && Math.abs(FA.ts - (r.anchor - 1)) < 0.01 && before.every((m) => m.ts < FA.ts), 'Puls start sends Start (FA) just before beat 0; no earlier pulse after it');
    ok(Math.abs(afterFA[0].ts - r.anchor) < 0.01, 'first pulse after Start is the Puls’s beat 0');
    // in audio time (stamp minus the mapping used for it) the pulses are exact; on performance.now() the mapping may step
    // a fraction of a millisecond when the (headless) audio device stalls – below one USB MIDI frame
    const aud = (a) => a.map((m) => ({ ts: m.ts - m.off })), steps = (a) => a.slice(1).map((m, i) => Math.abs(m.off - a[i].off));
    const run = afterFA.filter((m) => m.ts < r.tChange - 50), runG = gaps(aud(run)), runW = gaps(run);
    ok(runG.length > 20 && runG.every((g) => Math.abs(g - per(84)) < 0.01), '24 ppqn at 84 BPM on the audio clock (' + runG.length + ' gaps)');
    ok(runW.every((g) => Math.abs(g - per(84)) < 1.1) && Math.max(...steps(run)) <= 1.0, '  stamps on performance.now() within ' + Math.max(...runW.map((g) => Math.abs(g - per(84)))).toFixed(2) + ' ms');
    const fast = afterFA.filter((m) => m.ts > r.tChange + 150 && m.ts < r.tChange + 600), fastG = gaps(aud(fast));
    ok(fastG.length > 10 && fastG.every((g) => Math.abs(g - per(120)) < 0.01), 'tempo change → pulses at 120 BPM (' + fastG.length + ' gaps)');
    const ahead = r.all.filter((m) => m.d[0] === 0xf8).map((m) => m.ts - m.at);
    // as far ahead as the Puls schedules (0.12–0.35 s), never behind
    ok(ahead.every((a) => a > -1 && a < 351), 'pulses are stamped ahead by at most the Puls look-ahead (max ' + Math.max(...ahead).toFixed(1) + ' ms)');
    const iFC = r.all.findIndex((m) => m.d[0] === 0xfc);
    const post = f8(r.all.slice(iFC + 1)).filter((m) => m.ts > r.all[iFC].at + 120);
    ok(iFC > iFA && post.length > 5 && gaps(aud(post)).every((g) => Math.abs(g - per(120)) < 0.01) && gaps(post).every((g) => Math.abs(g - per(120)) < 1.1), 'Puls stop sends Stop (FC); the clock keeps running at the tempo (on the audio clock exactly, stamps within 1.1 ms)');
    ok(r.after === r.nOff && r.all[r.all.length - 1] && r.other === 0 && r.pref === false, 'clock out off: stops at once; other outputs never got clock; choice remembered');

    // our clock coming back on the same device's input is never followed
    r = await ev(async () => {
      const M = window.__M, o = M.MIDI.outs.get('o1');
      M.midiSetClockOut(o, true);
      await window.__clock({ id: 'n1', bpm: 100, n: 72, jit: 0 });
      const res = { ext: M.SEQ.ext };
      M.midiSetClockOut(o, false);
      await window.__clock({ id: 'n1', bpm: 100, n: 72, jit: 0 });
      res.ext2 = M.SEQ.ext && Math.round(M.SEQ.ext.bpm);
      return res;
    });
    ok(r.ext === null && r.ext2 === 100, 'clock from a device we send clock to is ignored (no feedback loop)');
    console.log('errors:', errors.length ? errors.join('\n') : 'none');
    ok(!errors.length, 'no console errors (clock out)');
    await close();
  }
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
