// The worklet processors on their own, in Node (no browser): myzelDsp() taken from the app and run block by block.
// Contract (timing, done, kill, NaN guard), robustness under every knob at its extremes, tuning of the reed across
// Mund/Blatt, the ring's update artefacts and pitch.   node t-dsp.js
const L = require('./dsplib');
const SR = 48000;
const D = L.loadDsp(SR);
const R = (o) => L.render(D, o);
const note = (name, f, y, o = {}) => R({ name, po: Object.assign({ rich: !!o.rich, prm: o.prm, seed: 5 }, o.po), ch: o.rich ? 2 : 1, dur: o.dur || 1.2, params: o.params || { freq: f, hoehe: y },
  msgs: (o.on === false ? [] : [[o.at || 0, { on: o.at || 0, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234 }]]).concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });

// -- the contract
L.ok(['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-null'].every((k) => D.procs[k]), 'module registers myzel-blow, myzel-scan, myzel-bow, myzel-null: ' + Object.keys(D.procs).join(', '));
for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow']) {
  const r = note(name, 220, 0.6, { at: 0.3, dur: 0.6 });
  const pre = L.rms(r.L, 0, Math.floor(0.3 * SR) - 1), post = L.rms(r.L, Math.floor(0.33 * SR), Math.floor(0.6 * SR));
  L.ok(pre === 0 && post > 1e-3, `${name}: a note posted ahead waits for its time (silent before 0.3 s, ${L.db(post).toFixed(1)} dB after)`);
  const k = R({ name, po: { seed: 1 }, dur: 1, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }], [0.5, { kill: 1 }]] });
  L.ok(!k.alive && k.done > 0.25 && k.done < 0.52, `${name}: {kill} stops the processor at once (process() false at ${k.done.toFixed(3)} s, the message arrives ahead of 0.5 s)`);
  const d = note(name, 220, 0.6, { off: 0.5, dur: 4 });
  const dn = d.posted.find((p) => p[1].done);
  L.ok(dn && !d.alive && dn[0] < 3.5, `${name}: after {off} it reports {done} once silent (${dn ? dn[0].toFixed(2) : '–'} s) and becomes collectable`);
  // a NaN anywhere: the guard clears the state and the voice plays on
  const n = R({ name, po: { seed: 1 }, dur: 1, params: (t) => ({ freq: t > 0.3 && t < 0.31 ? NaN : 220, hoehe: 0.6 }), msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }]] });
  L.ok(L.nanCount(n.L) === 0, `${name}: a NaN frequency for one block never reaches the output`);
}
// -- every knob at its extremes, pitches 16 Hz … 8 kHz, bursts and held, both levels: bounded, finite, ends
{
  let x = 99; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow']) {
    let worst = 0, bad = 0, notDone = 0;
    const keys = name === 'myzel-blow' ? ['atem', 'mund', 'blatt', 'luft', 'zunge'] : name === 'myzel-bow' ? ['druck', 'bogen', 'daempfung', 'schwebung', 'harz'] : ['masse', 'feder', 'mitte', 'daempfung', 'hammer', 'holz'];
    for (let i = 0; i < 40; i++) {
      const prm = {}; for (const k of keys) prm[k] = i < 4 ? [0, 1, 0, 1][i] * (k.length % 2 ? 1 : 1) : rnd() < 0.3 ? Math.round(rnd()) : rnd();
      if (name === 'myzel-bow') prm.koerper = ['glas', 'schale', 'stab', 'zunge', 'teich'][i % 5];
      const f = [16, 30, 55, 220, 1000, 3000, 8000][i % 7] * (0.9 + 0.2 * rnd()), y = i % 5 === 0 ? 1 : i % 5 === 1 ? 0 : rnd(), rich = i % 2 === 1, burst = i % 3 === 0;
      // (a bow's modes ring as Dämpfung and the body say – up to 16 s: it must end within two of its rings)
      const ring = name === 'myzel-bow' ? (0.4 + 6 * (1 - prm.daempfung) * (1 - prm.daempfung)) * { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 }[prm.koerper] : 0;
      const r = note(name, f, y, { prm, rich, burst, gate: burst ? 0.02 + rnd() : 0, off: burst ? null : 1.0, dur: Math.max(4, 2 + 2 * ring), vel: rnd(), msgs: name === 'myzel-scan' ? [[0.5, { hammer: 1 }], [0.55, { hammer: 1 }], [0.6, { hammer: 1 }]] : [] });
      const pk = Math.max(L.peak(r.L), r.R ? L.peak(r.R) : 0);
      if (L.nanCount(r.L) || (r.R && L.nanCount(r.R))) bad++;
      worst = Math.max(worst, pk); if (r.alive) notDone++;
    }
    L.ok(!bad && worst <= 1.2, `${name}: 40 random knob sets (extremes included, 16 Hz–8 kHz, L1/L3, held/burst, shakes): no NaN, peak ${worst.toFixed(3)} (≤ 1.2)`);
    L.ok(notDone === 0, `${name}: every one of them ends within ${name === 'myzel-bow' ? 'two rings' : '3 s'} after its end (${notDone} still running)`);
  }
}
// -- reed: tuning holds across Mund (loss) and Blatt (reed opening), 110–1760 Hz
{
  let worst = 0, at = '';
  for (const mund of [0, 1]) for (const blatt of [0, 1]) for (const f of [110, 440, 1760]) {
    const r = note('myzel-blow', f, 0.65, { prm: { mund, blatt, zunge: 0.5 }, dur: 1.4 });
    const fm = L.pitchFine(r.L, SR, L.yin(r.L.subarray(0.7 * SR, 0.7 * SR + 4096), SR, f / 1.5, f * 1.5), 0.7), c = Math.abs(L.cents(fm, f));
    if (c > worst) { worst = c; at = `${f} Hz, Mund ${mund}, Blatt ${blatt}`; }
  }
  L.ok(worst <= 5, `reed in tune at the knobs' extremes: worst ${worst.toFixed(2)} ct (${at})`);
}
// -- ring: no update artefacts, exact pitch, also with Holz and Masse at their extremes
{
  let worstA = -999, worstP = 0;
  for (const prm of [{}, { holz: 1, masse: 0 }, { feder: 1, mitte: 1 }, { feder: 0, daempfung: 0 }]) for (const f of [82, 220, 500, 880]) {
    const r = note('myzel-scan', f, 0.5, { prm, dur: 2.2 });
    const n = Math.ceil(f / 400); if (n > 1) worstA = Math.max(worstA, L.subharm(L.spectrum(r.L, SR, 0.4, 32768), f, n));
    worstP = Math.max(worstP, Math.abs(L.cents(L.combPitch(r.L, SR, f, 0.6), f)));
  }
  L.ok(worstA <= -40, `ring: update artefacts ≤ −40 dB at every setting (worst ${worstA.toFixed(1)} dB)`);
  L.ok(worstP <= 1.5, `ring: pitch at every setting within 1.5 ct (worst ${worstP.toFixed(2)} ct)`);
}
// -- Harz: a body changed while a note sounds rebuilds its bands without a blow-up; after underruns (lite) at most
// three bands; a glide of an octave in 50 ms stays bounded and lands in tune
{
  const sw = R({ name: 'myzel-bow', po: { seed: 1, prm: { koerper: 'glas' } }, dur: 2, params: { freq: 330, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 330, y: 0.6, vel: 0.8 }], [0.6, { set: { koerper: 'teich' } }], [1.1, { set: { koerper: 'zunge' } }]] });
  L.ok(!L.nanCount(sw.L) && L.peak(sw.L) < 1 && L.rms(sw.L, 1.6 * SR, 2 * SR) > 1e-3, `bow: the body changed twice under a sounding note – bounded (peak ${L.peak(sw.L).toFixed(2)}) and sounding on`);
  // (after underruns the processor computes three bands from the next block on: the others' filters stay at rest)
  const lt = R({ name: 'myzel-bow', po: { rich: true, lite: 1, seed: 1, prm: { koerper: 'glas' } }, ch: 2, dur: 0.5, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.8 }]] });
  const fu = R({ name: 'myzel-bow', po: { rich: true, seed: 1, prm: { koerper: 'glas' } }, ch: 2, dur: 0.5, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.8 }]] });
  const busy = (nd) => [...nd.z1].filter((x) => x !== 0).length;
  L.ok(fu.node.J === 10 && busy(fu.node) === 10 && busy(lt.node) === 3 && !L.nanCount(lt.L), `bow: level 3 rings ${busy(fu.node)} bands (Glas: five pairs), after underruns ${busy(lt.node)}`);
  const gl = R({ name: 'myzel-bow', po: { seed: 1, prm: { koerper: 'stab', schwebung: 0 } }, dur: 2.2, params: (t) => ({ freq: t < 1 ? 220 : 220 * Math.pow(2, Math.min(1, (t - 1) / 0.05)), hoehe: 0.55 }), msgs: [[0, { on: 0, f: 220, y: 0.55, vel: 0.8 }]] });
  const c = L.cents(L.combPitch(gl.L, SR, 440, 1.6, 16384, 1), 440);
  L.ok(!L.nanCount(gl.L) && L.peak(gl.L) < 1 && Math.abs(c) <= 3, `bow: an octave's glide in 50 ms stays bounded and lands at ${c.toFixed(2)} ct`);
}
process.exit(L.summary() ? 1 : 0);
