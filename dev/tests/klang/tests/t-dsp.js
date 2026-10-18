// The worklet processors on their own, in Node (no browser): myzelDsp() taken from the app and run block by block.
// Contract (timing, done, kill, NaN guard), robustness under every knob at its extremes, tuning of the reed across
// Mund/Blatt, the ring's update artefacts and pitch, Moder's digestion and crackle.   node t-dsp.js
const L = require('./dsplib');
const SR = 48000;
const D = L.loadDsp(SR);
const R = (o) => L.render(D, o);
const note = (name, f, y, o = {}) => R({ name, po: Object.assign({ rich: !!o.rich, prm: o.prm, seed: 5 }, o.po), ch: o.rich ? 2 : 1, dur: o.dur || 1.2, params: o.params || { freq: f, hoehe: y },
  msgs: (o.on === false ? [] : [[o.at || 0, { on: o.at || 0, f, y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: o.seed || 1234, life: o.life, sc: o.sc }]]).concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });

// the strongest line within ±4 % of f (Hann, parabolic on dB)
function peakHz(sig, f, at, N) {
  const { p, hz } = L.spectrum(sig, SR, at, N); let b = Math.round(f / hz);
  for (let k = Math.floor(f * 0.96 / hz); k <= Math.ceil(f * 1.04 / hz); k++) if (p[k] > p[b]) b = k;
  const a = 10 * Math.log10(p[b - 1] + 1e-30), c = 10 * Math.log10(p[b] + 1e-30), d = 10 * Math.log10(p[b + 1] + 1e-30);
  return (b + 0.5 * (a - d) / (a - 2 * c + d)) * hz;
}
// -- the contract
L.ok(['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot', 'myzel-null'].every((k) => D.procs[k]), 'module registers myzel-blow, myzel-scan, myzel-bow, myzel-rot, myzel-null: ' + Object.keys(D.procs).join(', '));
for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot']) {
  const r = note(name, 220, 0.6, { at: 0.3, dur: 0.6 });
  const pre = L.rms(r.L, 0, Math.floor(0.3 * SR) - 1), post = L.rms(r.L, Math.floor(0.33 * SR), Math.floor(0.6 * SR));
  L.ok(pre === 0 && post > 1e-3, `${name}: a note posted ahead waits for its time (silent before 0.3 s, ${L.db(post).toFixed(1)} dB after)`);
  const k = R({ name, po: { seed: 1 }, dur: 1, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }], [0.5, { kill: 1 }]] });
  L.ok(!k.alive && k.done > 0.25 && k.done < 0.52, `${name}: {kill} stops the processor at once (process() false at ${k.done.toFixed(3)} s, the message arrives ahead of 0.5 s)`);
  // (Moder is struck: no {off} – it reports {done} by itself once its modes are below −60 dB, here a Nachklang of 2 s)
  const struck = name === 'myzel-rot', d = struck ? note(name, 220, 0.6, { prm: { nachklang: 2 }, dur: 4 }) : note(name, 220, 0.6, { off: 0.5, dur: 4 });
  const dn = d.posted.find((p) => p[1].done);
  L.ok(dn && !d.alive && dn[0] < 3.5 && (!struck || dn[0] <= 2.6), `${name}: ${struck ? 'struck, at its end' : 'after {off}'} it reports {done} once silent (${dn ? dn[0].toFixed(2) : '–'} s) and becomes collectable`);
  // a NaN anywhere: the guard clears the state and the voice plays on
  const n = R({ name, po: { seed: 1 }, dur: 1, params: (t) => ({ freq: t > 0.3 && t < 0.31 ? NaN : 220, hoehe: 0.6 }), msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }]] });
  L.ok(L.nanCount(n.L) === 0, `${name}: a NaN frequency for one block never reaches the output`);
}
// -- every knob at its extremes, pitches 16 Hz … 8 kHz, bursts and held, both levels: bounded, finite, ends
{
  let x = 99; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot']) {
    let worst = 0, bad = 0, notDone = 0;
    const keys = name === 'myzel-blow' ? ['atem', 'mund', 'blatt', 'luft', 'zunge'] : name === 'myzel-bow' ? ['druck', 'bogen', 'daempfung', 'schwebung', 'harz'] : name === 'myzel-rot' ? ['pilz', 'knistern', 'schwellen', 'schlaegel'] : ['masse', 'feder', 'mitte', 'daempfung', 'hammer', 'holz'];
    for (let i = 0; i < 40; i++) {
      const prm = {}; for (const k of keys) prm[k] = i < 4 ? [0, 1, 0, 1][i] * (k.length % 2 ? 1 : 1) : rnd() < 0.3 ? Math.round(rnd()) : rnd();
      if (name === 'myzel-bow') prm.koerper = ['glas', 'schale', 'stab', 'zunge', 'teich'][i % 5];
      if (name === 'myzel-blow') prm.rohr = ['rohrblatt', 'floete', 'flamme'][i % 3];
      if (name === 'myzel-rot') { prm.koerper = ['glocke', 'holz', 'knochen'][i % 3]; prm.nachklang = i < 4 ? [1, 12, 1, 12][i] : 1 + 11 * rnd(); }
      const f = [16, 30, 55, 220, 1000, 3000, 8000][i % 7] * (0.9 + 0.2 * rnd()), y = i % 5 === 0 ? 1 : i % 5 === 1 ? 0 : rnd(), rich = i % 2 === 1, burst = i % 3 === 0;
      // (a bow's modes ring as Dämpfung and the body say – up to 16 s: it must end within two of its rings)
      const ring = name === 'myzel-bow' ? (0.4 + 6 * (1 - prm.daempfung) * (1 - prm.daempfung)) * { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 }[prm.koerper] : 0;
      // (Moder: struck – its life from the Nachklang, a Puls step's gate as the app passes it: life × 0.25–1, the compost × 1–6)
      const rot = name === 'myzel-rot', gt = burst ? 0.02 + rnd() : 0, life = rot ? prm.nachklang * (gt ? Math.max(0.25, Math.min(1, gt)) : 1) : 0;
      const r = note(name, f, y, { prm, rich, burst: rot ? false : burst, gate: rot ? 0 : gt, off: burst || rot ? null : 1.0, dur: rot ? 1.3 * life + 1 : Math.max(4, 2 + 2 * ring), vel: rnd(), msgs: name === 'myzel-scan' ? [[0.5, { hammer: 1 }], [0.55, { hammer: 1 }], [0.6, { hammer: 1 }]] : [], life: rot ? life : undefined, sc: rot && gt ? Math.max(Math.min(6, Math.max(1, 1 / gt)), Math.min(6, Math.max(1, 5 / life))) : undefined });
      const pk = Math.max(L.peak(r.L), r.R ? L.peak(r.R) : 0);
      if (L.nanCount(r.L) || (r.R && L.nanCount(r.R))) bad++;
      worst = Math.max(worst, pk); if (r.alive) notDone++;
    }
    L.ok(!bad && worst <= 1.2, `${name}: 40 random knob sets (extremes included, 16 Hz–8 kHz, L1/L3, held/burst, shakes${name === 'myzel-blow' ? ', all three pipes' : ''}): no NaN, peak ${worst.toFixed(3)} (≤ 1.2)`);
    L.ok(notDone === 0, `${name}: every one of them ends within ${name === 'myzel-bow' ? 'two rings' : name === 'myzel-rot' ? '1.3 × its life + 1 s' : '3 s'} after its end (${notDone} still running)`);
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
// -- flute and flame: in tune at their knobs' extremes; the pipe changed under a sounding note; after underruns (lite)
{
  let worst = 0, at = '';
  for (const mund of [0, 1]) for (const blatt of [0, 1]) for (const [f, y, reg] of [[220, 0.4, 1], [880, 0.4, 1], [220, 0.92, 2]]) {
    const r = note('myzel-blow', f, y, { prm: { rohr: 'floete', mund, blatt }, dur: 1.6 });
    const want = blatt === 1 && y === 0.4 ? 1 : reg, c = Math.abs(L.cents(L.combPitch(r.L, SR, f * want, 0.9, 16384), f * want));
    if (c > worst) { worst = c; at = `${f} Hz × ${want}, Lippe ${mund}, Strahl ${blatt}`; }
  }
  L.ok(worst <= 10, `flute in tune at Lippe/Strahl's extremes, registers 1 and 2: worst ${worst.toFixed(2)} ct (${at})`);
  worst = 0; at = '';
  for (const mund of [0, 1]) for (const atem of [0, 1]) for (const f of [110, 440, 1320]) {
    const r = note('myzel-blow', f, 0.65, { prm: { rohr: 'flamme', mund, atem, luft: 0.2 }, dur: 3.4 });
    const c = Math.abs(L.cents(peakHz(r.L, f, 1.4, 65536), f));   // (the fundamental's line: the fire's noise rings the tube's own, slightly stretched modes – a harmonic comb reads them)
    if (c > worst) { worst = c; at = `${f} Hz, Rohr ${mund}, Hitze ${atem}`; }
  }
  L.ok(worst <= 3, `flame in tune at Rohr/Hitze's extremes (y 0.65, the fundamental's line): worst ${worst.toFixed(2)} ct (${at})`);
  const sw = R({ name: 'myzel-blow', po: { seed: 1, prm: { rohr: 'rohrblatt' } }, dur: 2.4, params: { freq: 330, hoehe: 0.7 }, msgs: [[0, { on: 0, f: 330, y: 0.7, vel: 0.8 }], [0.6, { set: { rohr: 'floete' } }], [1.2, { set: { rohr: 'flamme' } }], [1.8, { set: { rohr: 'rohrblatt' } }]] });
  L.ok(!L.nanCount(sw.L) && L.peak(sw.L) < 1 && [0.9, 1.5, 2.2].every((t) => L.rms(sw.L, Math.round(t * SR), Math.round((t + 0.15) * SR)) > 1e-3), `blow: the pipe changed three times under a sounding note – bounded (peak ${L.peak(sw.L).toFixed(2)}), each pipe sounds`);
  for (const rohr of ['floete', 'flamme']) {
    const lt = R({ name: 'myzel-blow', po: { rich: true, lite: 1, seed: 1, prm: { rohr } }, ch: 2, dur: 1, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.8 }]] });
    let same = true; for (let i = 0; i < lt.L.length; i++) if (lt.L[i] !== lt.R[i]) { same = false; break; }
    L.ok(same && L.rms(lt.L, 0.5 * SR, SR) > 1e-3, `${rohr} after underruns (lite): one pipe, the same on both channels, sounding`);
    const st = R({ name: 'myzel-blow', po: { rich: true, seed: 1, prm: { rohr } }, ch: 2, dur: 2, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.8 }]] });
    let sl = 0, sr = 0, sx = 0; for (let i = SR; i < 2 * SR; i++) { sl += st.L[i] ** 2; sr += st.R[i] ** 2; sx += st.L[i] * st.R[i]; }
    const cc = sx / Math.sqrt(sl * sr);
    L.ok(cc > -0.2 && cc < 0.98, `${rohr} level 3: two pipes, ±4 ct apart – L/R correlation ${cc.toFixed(2)} (neither one pipe nor mirrored)`);
  }
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
// -- Moder: the digestion as the processor runs it (its ODE state per block), the crackle's events, the end, level 3,
// after underruns six modes, the pitch exact and moved by detune, no offset
{
  const C = D.procs['myzel-rot'], db = (x) => 10 * Math.log10(x + 1e-30);
  const run = (o) => {   // one hit, block by block, keeping P_k at chosen times
    const f = o.f || 220, y = o.y != null ? o.y : 0.7, node = new C({ processorOptions: { rich: !!o.rich, lite: o.lite ? 1 : 0, prm: o.prm || {}, seed: 5, on: { on: 0, f, y, vel: o.vel != null ? o.vel : 0.8, life: o.life, sc: o.sc, seed: o.seed || 1234 } } });
    const P = { freq: [f], detune: [o.detune || 0], hoehe: [y] }, at = {}, marks = o.marks || [], n = Math.ceil((o.dur || 6) * SR / 128), Lo = new Float32Array(n * 128), Ro = new Float32Array(n * 128); let mi = 0, end = null;
    for (let b = 0; b < n; b++) {
      D.scope.currentTime = b * 128 / SR;
      const Lb = new Float32Array(128), Rb = new Float32Array(128);
      if (end == null && !node.process([], [o.rich ? [Lb, Rb] : [Lb]], P)) end = b * 128 / SR;
      Lo.set(Lb, b * 128); Ro.set(Rb, b * 128);
      const t = (b + 1) * 128 / SR; while (mi < marks.length && t >= marks[mi]) at[marks[mi++]] = [...node.Pw.slice(0, node.K)];
    }
    return { node, at, end, L: Lo, R: Ro, done: node.port.out.some((m) => m.done) };
  };
  // the ODE: the stem swells ≥ 6 dB (power) from 0.1 s to its top in 1–1.8 s, mode 5 down ≥ 20 dB by 1.5 s, the end
  // within the Nachklang (y 0.7, vel 0.8, Nachklang 5)
  const r = run({ marks: [0.003, 0.1, 1.0, 1.2, 1.4, 1.6, 1.8, 3], dur: 6 });
  const sw = Math.max(...[1.0, 1.2, 1.4, 1.6, 1.8].map((t) => r.at[t][0])) / r.at[0.1][0], f5 = r.at[1.6][4] / r.at[0.003][4];
  L.ok(db(sw) >= 6 && db(f5) <= -20 && r.done && r.end <= 5 * 1.3, `rot: the stem swells ${db(sw).toFixed(1)} dB (power, 0.1 s → its top in 1–1.8 s), mode 5 ${db(f5).toFixed(1)} dB by 1.5 s, {done} and the end at ${r.end && r.end.toFixed(2)} s (≤ 6.5)`);
  L.ok(r.at[3][0] > r.at[0.003][0] && r.at[3][1] < r.at[0.003][1] * 0.01, `rot: at 3 s the hum still stands above its strike (${db(r.at[3][0] / r.at[0.003][0]).toFixed(1)} dB), mode 2 eaten (${db(r.at[3][1] / r.at[0.003][1]).toFixed(1)} dB)`);
  // energy only flows down: no mode above the stem ever grows
  { const q = run({ marks: Array.from({ length: 40 }, (_, i) => 0.003 + i * 0.1), dur: 4.2, y: 1, prm: { pilz: 1, schwellen: 1 } }); let up = 0;
    for (let i = 1; i < 40; i++) for (let k = 1; k < 8; k++) { const a = q.at[+(0.003 + (i - 1) * 0.1).toFixed(3)] || q.at[0.003 + (i - 1) * 0.1], b = q.at[+(0.003 + i * 0.1).toFixed(3)] || q.at[0.003 + i * 0.1]; if (a && b && b[k] > a[k] * 1.0001) up++; }
    L.ok(up === 0, `rot: digestion flows downward only – no upper mode ever grows (${up} rises; Pilz 1, Schwellen 1, y 1)`); }
  // crackle: events while digested, none at Knistern 0; the stem crackles as it dries; one grain at a time per mode
  { const a = run({ dur: 6 }), b = run({ dur: 6, prm: { knistern: 0 } }), c = run({ dur: 6, y: 0 });
    L.ok(a.node.nev >= 100 && b.node.nev === 0 && c.node.nev < a.node.nev, `rot: crackle events – ${a.node.nev} per hit at Knistern 0.4 (wet), ${c.node.nev} dry, ${b.node.nev} at Knistern 0`); }
  // a Puls step (gate 0.11 → life 1.25 s, compost × 6) and a Nachklang of 1 s and 12 s end in time
  { const g = run({ life: 1.25, sc: 6, dur: 2, vel: 1, y: 1, prm: { schwellen: 1, schlaegel: 1 } }), s1 = run({ prm: { nachklang: 1 }, dur: 2, vel: 1, y: 1 }), s12 = run({ prm: { nachklang: 12 }, dur: 16, vel: 1, y: 1 });
    L.ok(g.end && g.end <= 1.25 && s1.end && s1.end <= 1.3 && s12.end && s12.end <= 15.6, `rot: ends – a Puls step at ${g.end && g.end.toFixed(2)} s (life 1.25, ≤ 1.25: 8 hits/s keep ≤ 10 voices), Nachklang 1 → ${s1.end && s1.end.toFixed(2)} s, 12 → ${s12.end && s12.end.toFixed(2)} s`); }
  // level 3: each side as loud as level 1's mono (the panner passes a stereo voice at full gain: ½ the power per side,
  // each mode on both sides at equal power) – and decorrelated (the softer side a quarter period late)
  { const m1 = run({ dur: 3 }), m3 = run({ dur: 3, rich: true }), e = (x, a, b) => { let s = 0; for (let i = a * SR; i < b * SR; i++) s += x[i] * x[i]; return s; };
    const d = [m3.L, m3.R].map((x) => db(e(x, 0, 3) / (0.5 * e(m1.L, 0, 3))));
    let lr = 0, ll = 0, rr = 0; for (let i = 0.5 * SR; i < 2.5 * SR; i++) { lr += m3.L[i] * m3.R[i]; ll += m3.L[i] * m3.L[i]; rr += m3.R[i] * m3.R[i]; }
    const cor = lr / Math.sqrt(ll * rr);
    L.ok(d.every((x) => Math.abs(x) <= 1.5) && Math.abs(cor) < 0.3, `rot: level 3 per side ${d.map((x) => x.toFixed(2)).join(' / ')} dB vs level 1 (±1.5), sides decorrelated (r = ${cor.toFixed(2)})`); }
  // after underruns six modes: modes 7–8 silent
  { const a = run({ dur: 0.5, lite: true }), b = run({ dur: 0.5 }); const sp = (x) => L.spectrum(x, SR, 0.05, 8192), m8 = (x) => L.harm(sp(x), 220 * 6.8, 1) - L.harm(sp(x), 220 * 1.794, 1);
    L.ok(m8(a.L) < m8(b.L) - 40, `rot: after underruns (lite) six modes – mode 8 ${m8(a.L).toFixed(1)} dB re mode 2 (full: ${m8(b.L).toFixed(1)})`); }
  // pitch: the swollen stem exactly on f, detune moves every mode; no offset
  { const a = run({ dur: 1.6 }), b = run({ dur: 1.6, detune: 100 });
    const fa = L.pitchFine(a.L, SR, 220, 0.8, 16384), fb = L.pitchFine(b.L, SR, 220 * Math.pow(2, 1 / 12), 0.8, 16384);
    const sp = L.spectrum(b.L, SR, 0.05, 16384), up = L.harm(sp, 220 * 1.794 * Math.pow(2, 1 / 12), 1) - L.harm(sp, 220 * 1.794, 1);
    L.ok(Math.abs(L.cents(fa, 220)) <= 0.5 && Math.abs(L.cents(fb, 220) - 100) <= 0.5 && up > 20, `rot: the stem at ${L.cents(fa, 220).toFixed(2)} ct, detune +100 → ${L.cents(fb, 220).toFixed(2)} ct, mode 2 moved along (+${up.toFixed(0)} dB at its new place)`);
    const w = run({ dur: 4, y: 1, vel: 1, prm: { schwellen: 1, schlaegel: 1 } }); L.ok(Math.abs(L.mean(w.L)) < 1e-3, `rot: no offset (mean ${L.mean(w.L).toExponential(1)} on a loud wet hit)`); }
}
process.exit(L.summary() ? 1 : 0);
