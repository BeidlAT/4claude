// Helpers for the grammar suites (t-hx-ernten, t-hx-grammar, t-hx-ohr, t-hx-persist, t-hx-ui), on top of hx-h.js.
// In the page (gtools(page)):
//   __play(list, o)  – notes [[t (audio time), degree, vel, dur]] on the field's strip (o.eng, o.y); a held note is
//                      released after dur, a struck one rings
//   __riff(t0, beat, degs, reps, o) – a figure of quarter notes (or any beat), repeated; returns its end time
//   __until(t)       – wait until the audio clock reaches t
//   __meter(id, ms)  – the loop's level as the processor reports it, [audio time, rms] for ms
//   __grid(bpm)      – the Puls running silently (all lanes off): a Takt
//   __reset()        – every Schleife cleared, the history and the graveyard empty, the Puls stopped, the tempo free
const H = require('./hx-h');
async function gtools(page) {
  await page.evaluate(() => {
    const M = window.__M, A = M.A;
    window.__play = (list, o = {}) => {
      for (const [t, d, vel, dur] of list) {
        const f = M.N.notes[Math.max(0, Math.min(M.N.notes.length - 1, d))].f;
        const v = M.playNote(o.eng || 'glo', t, f, o.y != null ? o.y : 0.5, vel != null ? vel : 0.7, { bus: M.stripIn('fin') });
        const hold = dur != null ? dur : 0.3;   // (every note is let go, as a finger is lifted – a note never released holds the Humus „sounding“)
        if (v && hold && v.release) setTimeout(() => v.release(), Math.max(0, (t + hold - A.ctx.currentTime) * 1000));
      }
    };
    window.__riff = (t0, beat, degs, reps, o = {}) => {
      const list = [];
      for (let r = 0; r < reps; r++) degs.forEach((d, i) => { if (d != null) list.push([t0 + (r * degs.length + i) * beat, d, i === 0 ? 0.95 : 0.6, o.dur]); });
      window.__play(list, o);
      return t0 + reps * degs.length * beat;
    };
    window.__until = async (t) => { while (A.ctx.currentTime < t) await window.__sleep(Math.min(50, Math.max(5, (t - A.ctx.currentTime) * 1000))); };
    window.__meter = async (id, ms) => { const out = [], end = performance.now() + ms; while (performance.now() < end) { const m = (M.HX.meter || []).find((x) => x[0] === id); out.push([A.ctx.currentTime, m ? m[1] : 0]); await window.__sleep(15); } return out; };
    window.__grid = (bpm) => { M.setParam('seq.bpm', bpm); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart(); };
    window.__reset = async () => {
      if (M.HX.rec) M.hxRecCancel(true);
      for (const L of M.hxLoopsLive()) M.hxClear(L.id, null, 0.005);
      for (const [i] of M.HX.slot.entries()) M.HX.slot[i] = 0;
      M.HX.hist.length = 0; M.HX.redo.length = 0; M.HX.grave.length = 0; M.HX.pend.length = 0; M.HX.chips = null; M.HX.ruht = false; M.HX.fokus = 0; M.HX.lastHarvest = null; M.HX.memFull = false; M.HX.punch = null;
      if (M.SEQ.on) M.seqStop();
      M.TG.keep = false; M.HX.keepT = null; M.hxTempoFree();
      M.setParam('hx.modus', 'neu'); M.setParam('hx.start', 'takt'); M.setParam('hx.laenge', 'auto');
      await window.__sleep(1200);   // (a rest: what was played before is another phrase)
    };
    // a quiet stretch so the Humus holds no notes in the planner's view
    window.__quiet = async (s) => { await window.__sleep(s * 1000); };
  });
}
async function open(o = {}) {
  const r = await H.open(o);
  await gtools(r.page);
  await r.page.evaluate(() => { window.__M.setParam('v.human', 0); window.__M.setParam('rev.mix', 0.1); window.__M.setParam('dly.mix', 0); });
  return r;
}
module.exports = { open, gtools };
