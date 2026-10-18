// The worklet processors on their own, in Node (no browser): myzelDsp() taken from the app and run block by block.
// Contract (timing, done, kill, NaN guard), robustness under every knob at its extremes, tuning of the reed across
// Mund/Blatt, the ring's update artefacts and pitch, Moder's digestion and crackle; the aeolian harp's capture, floor, stereo and Puls; Zapfen's teeth, Rast and stone.   node t-dsp.js
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
L.ok(['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot', 'myzel-aeol', 'myzel-gendy', 'myzel-web', 'myzel-string', 'myzel-syrinx', 'myzel-scrape', 'myzel-null'].every((k) => D.procs[k]), 'module registers myzel-blow, myzel-scan, myzel-bow, myzel-rot, myzel-aeol, myzel-gendy, myzel-web, myzel-string, myzel-syrinx, myzel-scrape, myzel-null: ' + Object.keys(D.procs).join(', '));
for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot', 'myzel-aeol', 'myzel-gendy', 'myzel-string', 'myzel-syrinx', 'myzel-scrape']) {
  const r = note(name, 220, 0.6, { at: 0.3, dur: 0.6 });
  const pre = L.rms(r.L, 0, Math.floor(0.3 * SR) - 1), post = L.rms(r.L, Math.floor(0.33 * SR), Math.floor(0.6 * SR));
  L.ok(pre === 0 && post > 1e-3, `${name}: a note posted ahead waits for its time (silent before 0.3 s, ${L.db(post).toFixed(1)} dB after)`);
  const k = R({ name, po: { seed: 1 }, dur: 1, params: { freq: 220, hoehe: 0.6 }, msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }], [0.5, { kill: 1 }]] });
  L.ok(!k.alive && k.done > 0.25 && k.done < 0.52, `${name}: {kill} stops the processor at once (process() false at ${k.done.toFixed(3)} s, the message arrives ahead of 0.5 s)`);
  // (Moder is struck: no {off} – it reports {done} by itself once its modes are below −60 dB, here a Nachklang of 2 s;
  // the aeolian harp's strings ring on after the wind: Nachklang 3 s → −100 dB ≈ 5 s later)
  const struck = name === 'myzel-rot', aeol = name === 'myzel-aeol', d = struck ? note(name, 220, 0.6, { prm: { nachklang: 2 }, dur: 4 }) : note(name, 220, 0.6, { off: 0.5, dur: aeol ? 8 : 4 });
  const dn = d.posted.find((p) => p[1].done);
  L.ok(dn && !d.alive && dn[0] < (aeol ? 7 : 3.5) && (!struck || dn[0] <= 2.6), `${name}: ${struck ? 'struck, at its end' : 'after {off}'} it reports {done} once silent (${dn ? dn[0].toFixed(2) : '–'} s) and becomes collectable`);
  // a NaN anywhere: the guard clears the state and the voice plays on
  const n = R({ name, po: { seed: 1 }, dur: 1, params: (t) => ({ freq: t > 0.3 && t < 0.31 ? NaN : 220, hoehe: 0.6 }), msgs: [[0, { on: 0, f: 220, y: 0.6, vel: 0.7 }]] });
  L.ok(L.nanCount(n.L) === 0, `${name}: a NaN frequency for one block never reaches the output`);
}
// -- every knob at its extremes, pitches 16 Hz … 8 kHz, bursts and held, both levels: bounded, finite, ends
{
  let x = 99; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  for (const name of ['myzel-blow', 'myzel-scan', 'myzel-bow', 'myzel-rot', 'myzel-aeol', 'myzel-gendy', 'myzel-string', 'myzel-syrinx', 'myzel-scrape']) {
    let worst = 0, bad = 0, notDone = 0;
    const keys = name === 'myzel-blow' ? ['atem', 'mund', 'blatt', 'luft', 'zunge'] : name === 'myzel-bow' ? ['druck', 'bogen', 'daempfung', 'schwebung', 'harz'] : name === 'myzel-string' ? ['daempfung', 'steifheit', 'zupfort', 'hand', 'ebow'] : name === 'myzel-scrape' ? ['schuppen', 'rast', 'klang', 'strich', 'kratzen'] : name === 'myzel-syrinx' ? ['spannung', 'druck', 'schnabel', 'rauheit', 'anstieg'] : name === 'myzel-rot' ? ['pilz', 'knistern', 'schwellen', 'schlaegel'] : name === 'myzel-aeol' ? ['wind', 'boeen', 'nachklang', 'rauschen', 'fang', 'dunkel'] : name === 'myzel-gendy' ? ['zeit', 'rueck'] : ['masse', 'feder', 'mitte', 'daempfung', 'hammer', 'holz'];
    for (let i = 0; i < 40; i++) {
      const prm = {}; for (const k of keys) prm[k] = i < 4 ? [0, 1, 0, 1][i] * (k.length % 2 ? 1 : 1) : rnd() < 0.3 ? Math.round(rnd()) : rnd();
      if (name === 'myzel-bow') prm.koerper = ['glas', 'schale', 'stab', 'zunge', 'teich'][i % 5];
      if (name === 'myzel-blow') prm.rohr = ['rohrblatt', 'floete', 'flamme'][i % 3];
      if (name === 'myzel-aeol') prm.nachklang = 0.5 * Math.pow(12, prm.nachklang);   // (0.5–6 s, exp)
      if (name === 'myzel-gendy') { prm.verteilung = ['linear', 'cauchy', 'logist', 'sinus'][i % 4]; prm.punkte = 3 + Math.floor(rnd() * 22); prm.att = 0.005 * Math.pow(400, rnd()); prm.rel = 0.05 * Math.pow(120, i < 4 ? [0, 1, 0, 1][i] : rnd()); }
      if (name === 'myzel-rot') { prm.koerper = ['glocke', 'holz', 'knochen'][i % 3]; prm.nachklang = i < 4 ? [1, 12, 1, 12][i] : 1 + 11 * rnd(); }
      if (name === 'myzel-syrinx') prm.silbe = ['aus', 'chip', 'triller', 'ruf'][i % 4];
      if (name === 'myzel-string') { prm.steg = (i >> 1) % 2 ? 'jawari' : 'flach'; prm.daempfung = 0.3 * Math.pow(8 / 0.3, prm.daempfung); prm.zupfort = 0.05 + 0.45 * prm.zupfort; }   // (the knobs' own ranges)
      if (name === 'myzel-scrape') prm.koerper = ['zapfen', 'holz', 'panzer', 'kuerbis', 'fels'][i % 5];
      const f = [16, 30, 55, 220, 1000, 3000, 8000][i % 7] * (0.9 + 0.2 * rnd()), y = i % 5 === 0 ? 1 : i % 5 === 1 ? 0 : rnd(), rich = i % 2 === 1, burst = i % 3 === 0;
      // (a bow's modes ring as Dämpfung and the body say – up to 16 s: it must end within two of its rings)
      const ring = name === 'myzel-bow' ? (0.4 + 6 * (1 - prm.daempfung) * (1 - prm.daempfung)) * { glas: 0.6, schale: 2.5, stab: 1.6, zunge: 0.35, teich: 2 }[prm.koerper] : name === 'myzel-aeol' ? prm.nachklang : name === 'myzel-gendy' ? 4.5 * prm.rel : 0;   // (Amöbe: its own fade τ = 0.8·rel down to −100 dB ≈ 8·rel – in the app the voice's release ends it at 1.6·rel)
      // (Moder: struck – its life from the Nachklang, a Puls step's gate as the app passes it: life × 0.25–1, the compost × 1–6)
      const rot = name === 'myzel-rot', gt = burst ? 0.02 + rnd() : 0, life = rot ? prm.nachklang * (gt ? Math.max(0.25, Math.min(1, gt)) : 1) : 0;
      const r = note(name, f, y, { prm, rich, burst: rot ? false : burst, gate: rot ? 0 : gt, off: burst || rot ? null : 1.0, dur: rot ? 1.3 * life + 1 : Math.max(4, 2 + 2 * ring), vel: rnd(), msgs: name === 'myzel-scan' ? [[0.5, { hammer: 1 }], [0.55, { hammer: 1 }], [0.6, { hammer: 1 }]] : name === 'myzel-gendy' ? [[0.5, { zuck: 1, t: 0.5 }], [0.6, { zuck: 1, t: 0.6 }], [0.7, { set: { punkte: 3 + (i % 22) } }]] : [], life: rot ? life : undefined, sc: rot && gt ? Math.max(Math.min(6, Math.max(1, 1 / gt)), Math.min(6, Math.max(1, 5 / life))) : undefined });
      const pk = Math.max(L.peak(r.L), r.R ? L.peak(r.R) : 0);
      if (L.nanCount(r.L) || (r.R && L.nanCount(r.R))) bad++;
      worst = Math.max(worst, pk); if (r.alive) notDone++;
    }
    L.ok(!bad && worst <= 1.2, `${name}: 40 random knob sets (extremes included, 16 Hz–8 kHz, L1/L3, held/burst, shakes${name === 'myzel-blow' ? ', all three pipes' : name === 'myzel-scrape' ? ', all five bodies' : ''}): no NaN, peak ${worst.toFixed(3)} (≤ 1.2)`);
    L.ok(notDone === 0, `${name}: every one of them ends within ${name === 'myzel-bow' || name === 'myzel-aeol' ? 'two rings' : name === 'myzel-rot' ? '1.3 × its life + 1 s' : name === 'myzel-gendy' ? 'its own fade (9 × Ausklingen)' : '3 s'} after its end (${notDone} still running)`);
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
// -- Gespinst's web (myzel-web): idle without input, bounded at every knob, never singing by itself, the halo and the
// exchange on the strings themselves, glides, clears, level 3 / lite
{
  const C = D.procs['myzel-web'];
  // drive the web: input(t) per sample, messages [[t, msg]], string levels (rms of each ring) every 50 ms
  const web = (o) => {
    const node = new C({ processorOptions: Object.assign({ seed: 3 }, o.po) }), n = Math.round(o.dur * SR), Lo = new Float32Array(n), Ro = new Float32Array(n), posted = [], msgs = (o.msgs || []).slice(), str = [];
    let cpu = 0;
    for (let f0 = 0; f0 < n; f0 += 128) {
      while (msgs.length && msgs[0][0] * SR <= f0) node.port.onmessage({ data: msgs.shift()[1] });
      const x = new Float32Array(128); for (let i = 0; i < 128; i++) x[i] = o.input ? o.input((f0 + i) / SR) : 0;
      const Lb = new Float32Array(128), Rb = new Float32Array(128), t0 = process.hrtime.bigint();
      node.process([[x]], [[Lb, Rb]], {}); cpu += Number(process.hrtime.bigint() - t0);
      Lo.set(Lb.subarray(0, Math.min(128, n - f0)), f0); Ro.set(Rb.subarray(0, Math.min(128, n - f0)), f0);
      while (node.port.out && node.port.out.length) posted.push([f0 / SR, node.port.out.shift()]);
      if (o.strings && f0 % 2400 < 128) str.push([f0 / SR, node.bufs.map((b) => { let e = 0; for (let k = 0; k < b.length; k++) e += b[k] * b[k]; return 10 * Math.log10(e / b.length + 1e-30); })]);
    }
    return { L: Lo, R: Ro, posted, node, cpu: cpu / n, str };
  };
  let x = 7; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  const noise = (a, t0, t1) => (t) => (t >= t0 && t < t1 ? a * (2 * rnd() - 1) : 0);
  // a plucked string (Karplus-Strong, T60 2 s) as a voice's send
  const pluck = (f, t0, a = 0.3) => { const P = Math.round(SR / f), b = new Float32Array(P); let s = 1234567; for (let i = 0; i < P; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; b[i] = a * s / 2147483648; } const g = Math.pow(10, -3 / (2 * f)); const out = new Float32Array(3 * SR); let p = 0, prev = 0; for (let i = 0; i < out.length; i++) { const v = b[p]; out[i] = v; b[p] = g * 0.5 * (v + prev); prev = v; p = (p + 1) % P; } return (t) => { const i = Math.round((t - t0) * SR); return i >= 0 && i < out.length ? out[i] : 0; }; };
  const sum = (...fs) => (t) => fs.reduce((a, g) => a + g(t), 0);
  const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26].map((k) => 220 * Math.pow(2, k / 12));
  const idle = web({ po: { freqs: sc }, dur: 0.5 }), busy = web({ po: { freqs: sc }, dur: 0.5, input: (t) => 0.1 * Math.sin(1000 * t) });
  L.ok(L.peak(idle.L) === 0 && !idle.posted.length && idle.cpu < 0.4 * busy.cpu, `web: idle without input – silent, no message, ${idle.cpu.toFixed(1)} ns per sample (ringing: ${busy.cpu.toFixed(1)}; the harness's own share included)`);
  let worst = 0, bad = 0, stuck = 0;
  for (let i = 0; i < 40; i++) {
    const prm = { kopplung: i < 4 ? [0, 1, 1, 0][i] : rnd(), nachklang: i < 4 ? [0.5, 8, 8, 0.5][i] : 0.5 + 7.5 * rnd(), metall: rnd() < 0.3 ? Math.round(rnd()) : rnd(), steg: rnd() < 0.3 ? Math.round(rnd()) : rnd() };
    const base = [20, 55, 110, 440, 1500, 4000][i % 6] * (0.9 + 0.2 * rnd()), fr = sc.map((f) => f / 220 * base);
    const r = web({ po: { freqs: fr, prm, rich: i % 2 === 1, lite: i % 7 === 3 ? 1 : 0 }, dur: 16, input: noise(i % 3 === 0 ? 1 : 0.2, 0.05, 0.05 + 0.5 * rnd()) });
    if (L.nanCount(r.L) || L.nanCount(r.R)) bad++;
    worst = Math.max(worst, L.peak(r.L), L.peak(r.R));
    if (!r.posted.some((p) => p[1].idle)) stuck++;
  }
  L.ok(!bad && worst <= 1, `web: 40 random knob sets (Kopplung/Steg at their extremes, strings 20 Hz–8 kHz, loud bursts, both levels, lite): no NaN, peak ${worst.toFixed(2)} (≤ 1)`);
  L.ok(stuck === 0, `web: every one of them falls still and idles within 16 s (Ruhe) – ${stuck} still ringing`);
  // Kopplung 1, Nachklang 8, Steg 1: after the input the web dies away, its common mode ≤ 4 × Nachklang
  const k1 = web({ po: { freqs: sc.slice(0, 8), prm: { kopplung: 1, nachklang: 8, steg: 1 } }, dur: 9, input: noise(0.5, 0.05, 0.6) });
  const lv = (a, b) => L.db(L.rms(k1.L, Math.round(a * SR), Math.round(b * SR)));
  L.ok(lv(8, 9) < lv(2, 3) - 11.25, `web: Kopplung 1, Nachklang 8, Steg 1 – no self-oscillation, the common mode rings ≤ 4 × Nachklang (${lv(2, 3).toFixed(1)} dB at 2 s, ${lv(8, 9).toFixed(1)} at 8 s: T60 ${(360 / Math.max(1e-3, lv(2, 3) - lv(8, 9))).toFixed(1)} s)`);
  // short Nachklang, close strings (chromatic), Kopplung 1, also lite: below the strings every one answers in phase – a
  // sub-audio mode (14 Hz) rang 19 × Nachklang before the bridge's high-pass; now ≤ 4 × and nothing under 40 Hz
  for (const lite of [0, 1]) {
    const ch = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => 220 * Math.pow(2, k / 12)), r = web({ po: { freqs: ch, lite, prm: { kopplung: 1, nachklang: 0.5 } }, dur: 3, input: noise(0.3, 0.05, 0.5) });
    const l = (a, b) => L.db(L.rms(r.L, Math.round(a * SR), Math.round(b * SR))), t60 = 60 / Math.max(1e-3, l(0.7, 0.9) - l(1.7, 1.9));
    let lf = 0, all = 0; const a0 = Math.round(0.7 * SR), nn = SR / 2; for (let f = 4; f < 40; f += 2) { let re = 0, im = 0; for (let i = 0; i < nn; i++) { const w = 2 * Math.PI * f * i / SR; re += r.L[a0 + i] * Math.cos(w); im += r.L[a0 + i] * Math.sin(w); } lf = Math.max(lf, Math.hypot(re, im) / nn); }
    all = L.rms(r.L, a0, a0 + nn);
    L.ok(t60 <= 4 * 0.5 && L.db(lf) - L.db(all) < -30, `web: Kopplung 1, Nachklang 0.5, chromatic strings${lite ? ', lite' : ''} – T60 ${t60.toFixed(2)} s (≤ 2), the strongest line under 40 Hz ${(L.db(lf) - L.db(all)).toFixed(1)} dB rel. the whole (< −30)`);
  }
  // the halo: a pluck on the root – the fifth's and the octave's strings within 0.5 s, rel. the root's (≥ −25 dB)
  const at = (r, t) => r.str.find((e) => e[0] >= t)[1];
  const hl = web({ po: { freqs: sc.slice(0, 8), prm: { kopplung: 0.4, nachklang: 2 } }, dur: 0.8, input: pluck(220, 0.05), strings: true }), e5 = at(hl, 0.5);
  L.ok(e5[3] - e5[0] >= -25 && e5[5] - e5[0] >= -25, `web: the halo – a pluck on the root, after 0.5 s the fifth's string ${(e5[3] - e5[0]).toFixed(1)} dB, the octave's ${(e5[5] - e5[0]).toFixed(1)} dB rel. the root's (≥ −25)`);
  // the exchange: the fifth plucked alone vs with the root plucked beside it 0.9 s later – its string ≥ 6 dB over its own decay
  const ex = (both) => web({ po: { freqs: sc.slice(0, 8), prm: { kopplung: 0.4, nachklang: 2 } }, dur: 1.8, input: both ? sum(pluck(330, 0.1), pluck(220, 1.0)) : pluck(330, 0.1), strings: true });
  const ea = at(ex(false), 1.5)[3], eb = at(ex(true), 1.5)[3];
  L.ok(eb - ea >= 6, `web: energy exchange – the fifth's string 0.5 s after a pluck on the root ${ea.toFixed(1)} → ${eb.toFixed(1)} dB (≥ +6)`);
  // a new tuning under a ringing web glides: no jump between samples above the ringing's own
  const g = web({ po: { freqs: sc.slice(0, 8), prm: { kopplung: 0.5, nachklang: 4 } }, dur: 2, input: noise(0.3, 0.05, 0.3), msgs: [[1.0, { tune: sc.slice(0, 8).map((f) => f * 1.12), glide: true }]] });
  const jump = (a, b) => { let m = 0; for (let i = Math.round(a * SR) + 1; i < Math.round(b * SR); i++) m = Math.max(m, Math.abs(g.L[i] - g.L[i - 1])); return m; };
  L.ok(jump(0.98, 1.2) <= 1.5 * jump(0.7, 0.92), `web: a retune glides – largest step ${jump(0.98, 1.2).toFixed(4)} vs ${jump(0.7, 0.92).toFixed(4)} before`);
  const cl = web({ po: { freqs: sc.slice(0, 8), prm: { kopplung: 0.8, nachklang: 8 } }, dur: 1.2, input: noise(0.5, 0.05, 0.3), msgs: [[1.0, { clear: 1 }]] });
  L.ok(L.rms(cl.L, Math.round(1.02 * SR), Math.round(1.2 * SR)) === 0 && L.rms(cl.L, Math.round(0.9 * SR), SR) > 1e-4, 'web: {clear} – silent 20 ms later (a 10-ms fade)');
  const lt = web({ po: { freqs: sc, rich: true, lite: 1 }, dur: 0.3, input: noise(0.3, 0, 0.2) });
  L.ok(lt.node.N === 12 && L.rms(lt.L) > 1e-4, 'web: level 3 hangs 12 strings; after underruns (lite) it rings 6 of them');
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
// -- Böe (myzel-aeol): the capture state machine and the strings, read from the processor block by block
{
  const C = D.procs['myzel-aeol'];
  // run a note block by block; yAt(t) the height, each(node, t) after every block; returns the node and the output
  const run = (o) => {
    const node = new C({ processorOptions: { rich: !!o.rich, prm: o.prm || {}, seed: 5, lite: o.lite ? 1 : 0 } });
    node.port.onmessage({ data: { on: 0, f: o.f || 220, y: o.yAt(0), vel: o.vel == null ? 0.75 : o.vel, seed: o.seed || 1234, burst: !!o.gate, gate: o.gate || 0 } });
    if (o.off != null) node.port.onmessage({ data: { off: o.off } });
    const P = { freq: [o.f || 220], detune: [0], hoehe: [0] }, n = Math.ceil(o.dur * SR / 128), Lo = new Float32Array(n * 128), Ro = o.rich ? new Float32Array(n * 128) : null;
    for (let b = 0; b < n; b++) {
      const t = b * 128 / SR; D.scope.currentTime = t; P.hoehe[0] = o.yAt(t); if (o.fAt) P.freq[0] = o.fAt(t);
      const l = new Float32Array(128), r = o.rich ? new Float32Array(128) : null;
      node.process([], [o.rich ? [l, r] : [l]], P); Lo.set(l, b * 128); if (r) Ro.set(r, b * 128);
      if (o.each) o.each(node, t + 128 / SR);
    }
    return { node, L: Lo, R: Ro };
  };
  const yOf = (ratio, wind = 0.4) => (ratio - 0.7) / 7 / (0.5 + wind);   // the height whose shedding sits at `ratio` harmonics (no walk, no gust)
  const e2 = (node, k) => node.re[k - 1] * node.re[k - 1] + node.im[k - 1] * node.im[k - 1];
  const dB = (x) => 10 * Math.log10(x + 1e-30);
  // the capture event (SPEC): the shedding swept up across strings 2…6 (Böen 0: no gusts, the walk small); when a
  // string catches, its energy rises ≥ 10 dB within 150 ms
  { const caps = [], hist = [];
    run({ dur: 5, prm: { boeen: 0 }, vel: 0, yAt: (t) => yOf(t < 1 ? 1.45 : Math.min(6.4, 1.45 + 2 * (t - 1))), each: (nd, t) => { hist.push([t, nd.cap, [1, 2, 3, 4, 5, 6, 7].map((k) => e2(nd, k))]); } });
    for (let i = 1; i < hist.length; i++) if (hist[i][1] && hist[i][1] !== hist[i - 1][1] && hist[i][0] > 1) {
      const k = hist[i][1], j = Math.min(hist.length - 1, i + Math.round(0.15 * SR / 128)), pre = hist[Math.max(0, i - Math.round(0.15 * SR / 128))][2][k - 1];
      caps.push([k, +(dB(hist[j][2][k - 1]) - dB(hist[i][2][k - 1])).toFixed(1), +(dB(hist[j][2][k - 1]) - dB(pre)).toFixed(1)]);
    }
    L.ok(caps.length >= 4 && caps.every((c) => c[1] >= 10), `aeol: the capture event – sweeping the wind across the strings, each catches in turn and its energy rises ≥ 10 dB within 150 ms: ${caps.map((c) => 'k' + c[0] + ' +' + c[1] + ' dB (vs 150 ms before +' + c[2] + ')').join(', ')}`); }
  // one string at a time: the caught one at full, its neighbours leak at −20 dB, the fundamental always a little
  { let worst = 0, n2 = 0;
    run({ dur: 4, prm: { boeen: 0 }, yAt: (t) => yOf(1 + (t * 1.7) % 6), each: (nd) => { const w = [...nd.ex].map((e, k) => e / (nd.gk[k] * Math.max(1e-9, nd.wa * (1 + nd.gu)))); const big = w.filter((x) => x > 0.5).length; if (big > 1) n2++; for (let k = 0; k < w.length; k++) if (k + 1 !== nd.cap && k !== 0) worst = Math.max(worst, w[k]); } });
    L.ok(n2 === 0 && worst <= 0.1 + 1e-9, `aeol: one-mode capture – never two strings driven at full (${n2} blocks), the others at most ${worst.toFixed(3)} (the neighbours' leak 0.1 = −20 dB)`); }
  // hysteresis: the same shedding (1.3 bands above string 3) holds string 3 when it came from below, catches nothing
  // when it came from above (string 3 catches only within one band)
  { const band = 0.06 + 0.19 * 0.3, r0 = 3 * (1 + 1.3 * band);
    const up = run({ dur: 3, prm: { boeen: 0 }, vel: 0, yAt: (t) => yOf(t < 1 ? 3 : r0) }).node.cap, dn = run({ dur: 3, prm: { boeen: 0 }, vel: 0, yAt: (t) => yOf(t < 1 ? 4.6 : r0) }).node.cap;
    L.ok(up === 3 && dn !== 3, `aeol: hysteresis – at ${r0.toFixed(2)} harmonics string 3 holds the wind it caught (cap ${up}), coming from above it does not catch there (cap ${dn})`); }
  // between the harmonics (strings only, Rauschen 0; Nachklang 0.5 so the strings caught at the touch have rung out):
  // the excitation drops ≥ 15 dB, the output stays ≥ −45 dB under the caught string's peak (the fundamental's floor)
  { const P0 = { boeen: 0, rauschen: 0, nachklang: 0.5 };
    let exC = 0, exD = 0;
    const exw = (nd) => { let s = 0; for (let k = 0; k < nd.K; k++) { const w = nd.ex[k] / (nd.gk[k] || 1); s += w * w; } return s; };
    const c = run({ dur: 4, prm: P0, yAt: () => yOf(2), each: (nd, t) => { if (t > 2) exC = Math.max(exC, exw(nd)); } }), d = run({ dur: 4, prm: P0, yAt: () => yOf(1.45), each: (nd, t) => { if (t > 2) exD = Math.max(exD, exw(nd)); } });
    const pk = L.peak(c.L.subarray(2 * SR)), dl = L.rms(d.L, 2.5 * SR, 4 * SR), cl = L.rms(c.L, 2.5 * SR, 4 * SR);
    L.ok(dB(exC) - dB(exD) >= 15 && L.db(dl) - L.db(pk) >= -45, `aeol: between strings 1 and 2 the excitation drops ${(dB(exC) - dB(exD)).toFixed(1)} dB (≥ 15; output ${(L.db(dl) - L.db(cl)).toFixed(1)} dB vs caught), the output stays at ${(L.db(dl) - L.db(pk)).toFixed(1)} dB under the caught string's peak (≥ −45: the floor)`); }
  // the strings in tune (Rauschen 0: no wind band among them), 55 Hz – 1.76 kHz, both levels
  { let worst = 0, at = '';
    for (const f of [55, 110, 440, 1760]) for (const rich of [false, true]) { const r = run({ f, rich, dur: 1.5, prm: { rauschen: 0 }, yAt: () => 0.5 }); const m = rich ? r.L.map((x, i) => 0.5 * (x + r.R[i])) : r.L; const c = Math.abs(L.cents(L.combPitch(m, SR, f, 0.8, 32768), f)); if (process.env.V) console.log(f, rich, c.toFixed(2)); if (c > worst) { worst = c; at = f + (rich ? ' L3' : ' L1'); } }
    L.ok(worst <= 2, `aeol: the strings in tune (≤ 2 ct) within ${worst.toFixed(2)} ct (worst ${at})`); }
  // a glide of an octave in 50 ms (setF): bounded, lands in tune
  { const r = run({ dur: 2.2, prm: { rauschen: 0 }, yAt: () => 0.4, fAt: (t) => (t < 1 ? 220 : 220 * Math.pow(2, Math.min(1, (t - 1) / 0.05))) });
    const c = L.cents(L.combPitch(r.L, SR, 440, 1.6, 16384), 440);
    L.ok(!L.nanCount(r.L) && L.peak(r.L) < 1 && Math.abs(c) <= 2, `aeol: an octave's glide in 50 ms stays bounded and lands at ${c.toFixed(2)} ct`); }
  // level 3: fourteen strings, the odd ones louder left, the even ones right, the sides uncorrelated (the panner sums
  // coherent channels louder); after underruns six strings
  { const r = run({ rich: true, dur: 3, prm: { boeen: 0, rauschen: 0, nachklang: 0.5 }, vel: 0, yAt: () => yOf(3) }), r2 = run({ rich: true, dur: 3, prm: { boeen: 0, rauschen: 0, nachklang: 0.5 }, vel: 0, yAt: () => yOf(4) });
    const lr = (x) => 10 * Math.log10(L.rms(x.L, 1.5 * SR, 3 * SR) ** 2 / L.rms(x.R, 1.5 * SR, 3 * SR) ** 2);
    const w = run({ rich: true, dur: 4, yAt: (t) => 0.2 + 0.15 * t }); let ab = 0, aa = 0, bb = 0; for (let i = 0.3 * SR; i < 4 * SR; i++) { ab += w.L[i] * w.R[i]; aa += w.L[i] ** 2; bb += w.R[i] ** 2; }
    const cor = ab / Math.sqrt(aa * bb), lite = run({ rich: true, lite: true, dur: 1, yAt: () => 0.95 });
    L.ok(r.node.K === 14 && lr(r) > 5 && lr(r2) < -5 && Math.abs(cor) < 0.2 && Math.max(...[...lite.node.re].slice(6).map(Math.abs)) === 0, `aeol: level 3 – ${r.node.K} strings; string 3 ${lr(r).toFixed(1)} dB left of right, string 4 ${lr(r2).toFixed(1)}; the sides' correlation ${cor.toFixed(2)} (|·| < 0.2); after underruns the strings above 6 stay silent`); }
  // the gust-pluck: an onset in the first 10 ms (the impulse) ≥ −10 dB vs the gate's end, the strings ≥ 3 dB over the
  // wind inside the gate, and the ring after the gate capped (T60 ≤ 1.5 s, even at Nachklang 6)
  { const g = 0.22, x = run({ dur: 3, gate: g, prm: { nachklang: 6 }, yAt: () => 0.5 }), s = run({ dur: 3, gate: g, prm: { nachklang: 6, rauschen: 0 }, yAt: () => 0.5 });
    const on = L.rms(x.L, 0, 0.01 * SR), end = L.rms(x.L, (g - 0.03) * SR, g * SR), sw = L.rms(s.L, 0, g * SR), all = L.rms(x.L, 0, g * SR);
    const e = L.env(s.L, SR, 0.02).map(L.db), a = Math.round((g + 0.4) / 0.02), b = Math.round((g + 1.2) / 0.02), t60 = 60 * 0.8 / (e[a] - e[b]);
    L.ok(L.db(on) - L.db(end) >= -10 && L.db(sw) - L.db(Math.sqrt(Math.max(1e-20, all * all - sw * sw))) >= 3 && t60 <= 1.8, `aeol: gust-pluck – onset ${(L.db(on) - L.db(end)).toFixed(1)} dB vs the gate's end (≥ −10), strings ${(L.db(sw) - L.db(Math.sqrt(Math.max(1e-20, all * all - sw * sw)))).toFixed(1)} dB over the wind (≥ 3), ring T60 ${t60.toFixed(2)} s after the gate at Nachklang 6 (capped 1.5 s, ≤ 1.8)`); }
  // the wind lives: at Böen 0.4 a held note changes its string now and then (walk, gusts) – more with more Böen
  { const changes = (boeen) => { let n = 0, last = -1; run({ dur: 40, prm: { boeen }, seed: 777, yAt: () => 0.45, each: (nd) => { if (nd.cap !== last) { if (last >= 0) n++; last = nd.cap; } } }); return n; };
    const c0 = changes(0), c4 = changes(0.4), c1 = changes(1);
    L.ok(c4 >= 3 && c4 <= 60 && c1 > c0, `aeol: the wind moves on by itself – string changes in 40 s held at y 0.45: Böen 0 ${c0}, 0.4 ${c4} (3–60), 1 ${c1}`); }
}
// -- Amöbe (myzel-gendy): the polygon's points follow the period (K_eff), Punkte live, the seed free of DC, level 3 at
// twice the rate (and without after underruns), the release follows Ausklingen, aliasing against a 4× reference
{
  const G = (f, o = {}) => R({ name: 'myzel-gendy', po: { rich: !!o.rich, lite: o.lite ? 1 : 0, prm: o.prm }, ch: o.rich ? 2 : 1, dur: o.dur || 0.6, params: { freq: f, hoehe: o.y == null ? 0.5 : o.y }, msgs: [[0, { on: 0, f, y: o.y == null ? 0.5 : o.y, vel: 0.75, seed: o.seed || 7 }]].concat(o.msgs || []) });
  const ks = [[55, 12], [500, 12], [1000, 8], [1760, 4], [4000, 2]].map(([f, k]) => { const r = G(f); return [f, r.node.G[0].K, k]; });
  const k3 = G(1760, { rich: true }).node.G.map((g) => g.K);
  L.ok(ks.every(([, K, k]) => K === k) && k3.every((K) => K === 9), 'amo: the polygon keeps ≥ 6 samples per segment – points at 55/500/1000/1760/4000 Hz: ' + ks.map((x) => x[1]).join('/') + ' (Punkte 12), level 3 at 1760 Hz (2× rate): ' + k3.join('/'));
  const pl = G(110, { dur: 1.5, msgs: [[0.4, { set: { punkte: 24 } }], [0.9, { set: { punkte: 3 } }]] });
  L.ok(pl.node.G[0].Kp === 3 && !L.nanCount(pl.L) && L.peak(pl.L) < 1 && L.rms(pl.L, 1.3 * SR, 1.5 * SR) > 0.05, `amo: Punkte turned 12 → 24 → 3 under a sounding note: one point per period, bounded (peak ${L.peak(pl.L).toFixed(2)}), sounding on`);
  { let worst = 0; for (let s = 1; s <= 20; s++) { const r = G(110, { seed: s * 977 }), g = r.node.G[0]; let sd = 0, mn = 0; for (let i = 0; i < g.Kp; i++) sd += g.d0[i]; for (let i = 0; i < g.Kp; i++) mn += g.d0[i] * (g.a0[i] + (i + 1 < g.Kp ? g.a0[i + 1] : 0)) / 2; worst = Math.max(worst, Math.abs(mn / sd)); }
    L.ok(worst < 1e-9, `amo: every seed polygon is free of DC (worst mean ${worst.toExponential(1)} of 20)`); }
  const l3 = G(110, { rich: true, dur: 1 }), lt = G(110, { rich: true, lite: true, dur: 1 });
  L.ok(l3.node.G.length === 2 && l3.node.G[1].two && !l3.node.G[0].two && l3.node.G[0].hw && !lt.node.G[0].hw && L.rms(lt.R, 0.5 * SR, SR) > 0.05, 'amo: level 3 = two amoebas (the right one Gendy2) at twice the rate; after underruns at the plain rate, still stereo');
  const rl = (rel) => { const r = G(110, { dur: 10 * rel + 1, prm: { rel }, msgs: [[0.5, { off: 0.5 }]] }); const dn = r.posted.find((p) => p[1].done); return dn ? dn[0] - 0.5 : null; };
  const r1 = rl(0.3), r2 = rl(1.5);
  L.ok(r1 != null && r2 != null && r1 > 1.5 && r1 < 3.2 && r2 > 9 && r2 < 15, `amo: after {off} it fades by itself (τ 0.8·Ausklingen: the voice's release slowed to match) and ends – done after ${r1 && r1.toFixed(2)} s (0.3 s), ${r2 && r2.toFixed(2)} s (1.5 s)`);
  const sn = G(110, { dur: 3, y: 1, prm: { verteilung: 'sinus', zeit: 1, rueck: 0 } });
  L.ok(!L.nanCount(sn.L) && L.peak(sn.L) < 1.2 && L.rms(sn.L, 2 * SR, 3 * SR) > 0.05, `amo: Sinus at the top without Rückkehr stays bounded (peak ${L.peak(sn.L).toFixed(2)}) and sounding`);
  const { aliasAt } = require('./alias-amo');
  const al = [1013, 2011].map((f) => aliasAt(f, 0.5, { prm: { zeit: 0.15 } }));
  L.ok(al.every((a) => a.worst <= -30 && a.total <= -30), 'amo: aliasing above 1 kHz ≤ −30 dB against a 4× reference (worst line / between the harmonics): ' + al.map((a) => a.worst.toFixed(1) + '/' + a.total.toFixed(1)).join(', '));
}
// -- Sehne (myzel-string): tuning at the knobs' extremes; the glide's per-sample length (a per-block variant as the
// control); the flageolet's node exact under stiffness; the jawari keeps its energy and piles up no DC; the E-Bow's
// ceiling; the bridge changed under a sounding note; level 3 and after underruns
{
  const SN = 'myzel-string', fine = (sig, f, at, N = 32768) => peakHz(sig, f, at, N);
  let worst = 0, at = '';
  for (const prm of [{ steifheit: 0 }, { steifheit: 1 }, { daempfung: 0.3 }, { daempfung: 8, steifheit: 1 }, { steg: 'jawari' }]) for (const f of [55, 220, 880, 2000]) {
    const r = note(SN, f, 0.5, { prm, dur: 1.2 }), c = Math.abs(L.cents(fine(r.L, f, prm.daempfung === 0.3 ? 0.02 : 0.4, prm.daempfung === 0.3 ? 16384 : 32768), f));   // (a 0.3-s note: the whole of it in one long window – a 4096-point read is off 4–6 ct even on a long note)
    if (c > worst) { worst = c; at = `${f} Hz ${JSON.stringify(prm)}`; }
  }
  L.ok(worst <= 3, `string: in tune at the knobs' extremes (Steifheit 0/1, Nachklang 0.3/8 s, Jawari), 55–2000 Hz: worst ${worst.toFixed(2)} ct (${at})`);
  // the stiffness stretches the partials sharp, and more with Steifheit (h10 at 220 Hz)
  const st = [0, 0.25, 1].map((v) => { const r = note(SN, 220, 0.5, { prm: { steifheit: v }, dur: 1.2 }); const f1 = fine(r.L, 220, 0.4); return L.cents(fine(r.L, 2200 * 1.01, 0.4, 32768), 10 * f1); });
  L.ok(Math.abs(st[0]) <= 2 && st[1] >= 4 && st[2] >= 4 * st[1], `string: Steifheit stretches the 10th partial at 220 Hz ${st.map((c) => c.toFixed(1)).join(' / ')} ct (Steifheit 0 / 0.25 / 1)`);
  // glide: per sample vs once per block (the zipper above 12 kHz, see glide-shn.js)
  const G = require('./glide-shn'), gz = G.glide(G.base), gs = G.glide(G.stairs);
  L.ok(gz <= 10 && gs >= gz + 15, `string: a glide 220 → 330 Hz in 0.2 s – above 12 kHz while gliding vs held: per sample ${gz.toFixed(1)} dB, a per-block length (control) ${gs.toFixed(1)} dB`);
  // the node at ½ is exact even when the stiffness stretches the modes: 2f rings on (its decay within 25 % of the open
  // string's 2f), the fundamental is gone
  const gz2 = (x, a, b, fq) => { a = Math.round(a); b = Math.round(b); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return 2 * Math.hypot(re, im) / Math.max(1, b - a); };
  const node = [];
  for (const sf of [0, 1]) {
    const o = note(SN, 220, 0.5, { prm: { steifheit: sf, daempfung: 4 }, dur: 2.2 }), g = note(SN, 220, 0.75, { prm: { steifheit: sf, daempfung: 4 }, dur: 2.2 });
    const f2 = fine(o.L, 440 * 1.002, 0.5), dk = (x) => L.db(gz2(x, 0.5 * SR, 0.7 * SR, f2)) - L.db(gz2(x, 1.6 * SR, 1.8 * SR, f2));
    node.push([sf, +(dk(g.L) / dk(o.L)).toFixed(2), +(L.db(gz2(g.L, 0.5 * SR, 0.7 * SR, 220)) - L.db(gz2(g.L, 0.5 * SR, 0.7 * SR, f2))).toFixed(1)]);
  }
  L.ok(node.every((x) => Math.abs(x[1] - 1) <= 0.25 && x[2] <= -30), 'string: the ½ node exact – 2f decays as on the open string (ratio ' + node.map((x) => x[1]).join(' / ') + '), the fundamental ' + node.map((x) => x[2] + ' dB').join(' / ') + ' under it (Steifheit 0 / 1)');
  // jawari: as long as the flat bridge (the lattice is lossless); no DC piled up in the waves
  const jl = [], dc = [];
  for (const f of [110, 220, 440]) {
    const j = note(SN, f, 0.5, { prm: { steg: 'jawari' }, dur: 1.2 }), fl = note(SN, f, 0.5, { prm: { steg: 'flach' }, dur: 1.2 });
    jl.push(+(L.db(L.rms(j.L, 0.9 * SR, 1.1 * SR)) - L.db(L.rms(fl.L, 0.9 * SR, 1.1 * SR))).toFixed(1));
    const sp = L.spectrum(j.L, SR, 0.25, 8192); let a = 0, b = 0; for (let k = 0; k * sp.hz < 20; k++) a += sp.p[k]; for (let k = Math.round(f * 0.9 / sp.hz); k < f * 1.1 / sp.hz; k++) b += sp.p[k];
    dc.push(+(10 * Math.log10((a + 1e-30) / (b + 1e-30))).toFixed(0));
  }
  L.ok(jl.every((d) => d >= -8) && dc.every((d) => d <= -30), `string: jawari keeps its energy (level at 1 s vs flat ${jl.join(' / ')} dB, ≥ −8) and piles up no DC (below 20 Hz vs f at 0.25 s ${dc.join(' / ')} dB, ≤ −30)`);
  // E-Bow at full strength: under the −6 dBFS ceiling (RMS), bounded, held
  const eb = note(SN, 220, 1, { prm: { ebow: 1 }, dur: 4, vel: 1 }), er = L.rms(eb.L, 2.5 * SR, 3.9 * SR);
  L.ok(er <= 0.52 && er > 0.03 && L.peak(eb.L) < 1, `string: E-Bow 1 at the top – RMS ${L.db(er).toFixed(1)} dBFS (≤ −6), peak ${L.db(L.peak(eb.L)).toFixed(1)} dBFS`);
  // the bridge and the hand changed under a sounding note: bounded, sounding
  const sw = R({ name: SN, po: { seed: 1, prm: { steg: 'flach' } }, dur: 3, params: (t) => ({ freq: 196, hoehe: t < 1 ? 0.5 : t < 2 ? 0.92 : 0.75 }), msgs: [[0, { on: 0, f: 196, y: 0.5, vel: 0.8 }], [0.5, { set: { steg: 'jawari' } }], [1.5, { set: { steg: 'flach' } }], [2.2, { set: { hand: 1, steifheit: 1 } }]] });
  L.ok(!L.nanCount(sw.L) && L.peak(sw.L) < 1 && [0.8, 1.8, 2.6].every((t) => L.rms(sw.L, Math.round(t * SR), Math.round((t + 0.15) * SR)) > 1e-3), `string: Steg and hand changed under a sounding note – bounded (peak ${L.peak(sw.L).toFixed(2)}), sounding`);
  // level 3: two strings, decorrelated, as loud as level 1 per channel (mono halves through the panner); after
  // underruns (lite) one string on both sides
  const l1 = note(SN, 220, 0.5, { dur: 1.5 }), l3 = note(SN, 220, 0.5, { rich: true, dur: 1.5 });
  let x = 0, a = 0, b = 0; for (let i = 0.1 * SR; i < 1.5 * SR; i++) { x += l3.L[i] * l3.R[i]; a += l3.L[i] ** 2; b += l3.R[i] ** 2; }
  const d13 = 10 * Math.log10((0.5 * (a + b) / (1.4 * SR)) / (0.5 * Math.pow(L.rms(l1.L, 0.1 * SR, 1.5 * SR), 2)));
  L.ok(x / Math.sqrt(a * b) < 0.6 && Math.abs(d13) <= 1.5, `string: level 3 – L/R correlation ${(x / Math.sqrt(a * b)).toFixed(2)} (two strings ±3 ct), per channel ${d13.toFixed(2)} dB vs level 1 through the panner`);
  const lt = R({ name: SN, po: { rich: true, lite: 1, seed: 1 }, ch: 2, dur: 1, params: { freq: 220, hoehe: 0.5 }, msgs: [[0, { on: 0, f: 220, y: 0.5, vel: 0.8 }]] });
  let same = true; for (let i = 0; i < lt.L.length; i++) if (lt.L[i] !== lt.R[i]) { same = false; break; }
  L.ok(same && L.rms(lt.L, 0.1 * SR, 0.5 * SR) > 1e-3 && Math.abs(L.cents(fine(lt.L, 220, 0.3, 16384), 220)) <= 3, 'string after underruns (lite): one string, the same on both channels, in tune');
}
// -- Kehlchen (myzel-syrinx): the frequency-locked loop over (f, pressure); the threshold; a chip's flick; Triller's
// pulses; Ruf repeats; Rauheit's period doubling; the end
{
  const K = (f, y, prm, o = {}) => R({ name: 'myzel-syrinx', po: { seed: 5, rich: !!o.rich, prm: Object.assign({ silbe: 'aus', rauheit: 0 }, prm || {}) }, dur: o.dur || 1, ch: 2, params: o.params || { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 5 }]].concat(o.msgs || []) });
  const bpf = (x, f) => { const w = 2 * Math.PI * f / SR, al = Math.sin(w) / 2, a0 = 1 + al, b0 = al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
      const zc = (x0, a, b, f) => { const x = bpf(x0, f); a = Math.round(a * SR); b = Math.round(b * SR); const c = []; let l = x[a]; for (let i = a + 1; i < b; i++) { if (l < 0 && x[i] >= 0) c.push(i - x[i] / (x[i] - l)); l = x[i]; } return c.length > 2 ? SR * (c.length - 1) / (c[c.length - 1] - c[0]) : 0; };
  let worst = 0, at = '';
  for (const f of [110, 220, 440, 880, 1760, 3000, 4500, 6000]) for (const y of [0.25, 0.5, 0.75, 1]) { const c = L.cents(zc(K(f, y, {}, { dur: 0.8 }).L, 0.45, 0.8, f), f); if (Math.abs(c) > Math.abs(worst)) { worst = c; at = f + ' Hz, y ' + y; } }
  L.ok(Math.abs(worst) <= 10, `khl: the loop holds the pitch over 110 Hz–6 kHz × y 0.25–1 (worst ${worst.toFixed(2)} ct at ${at}; SPEC ≤ 10, the bare labia drift up to two semitones)`);
  const r1 = K(880, 0.1), r2 = K(880, 0.3); L.ok(L.db(L.rms(r2.L, 0.5 * SR)) - L.db(L.rms(r1.L, 0.5 * SR)) >= 20, `khl: the threshold – y 0.1 ${L.db(L.rms(r1.L, 0.5 * SR)).toFixed(1)} dB, y 0.3 ${L.db(L.rms(r2.L, 0.5 * SR)).toFixed(1)} dB (≥ 20 dB jump)`);
  const ch = K(2000, 0.6, { silbe: 'chip' }, { dur: 0.4 }), c0 = L.cents(zc(ch.L, 0.006, 0.014, 2000), 2000), c1 = L.cents(zc(ch.L, 0.2, 0.35, 2000), 2000);
  L.ok(c0 <= -40 && Math.abs(c1) <= 5, `khl: Chip – ${c0.toFixed(0)} ct at 6–14 ms (≤ −40), ${c1.toFixed(1)} ct after`);
  const tr = K(2500, 0.6, { silbe: 'triller' }, { dur: 1.5 }), e = L.env(tr.L.subarray(0.3 * SR), SR, 0.004).map((v) => L.db(v)), mx = Math.max(...e), mn = Math.min(...e); let cr = 0; for (let i = 1; i < e.length; i++) if (e[i - 1] < (mx + mn) / 2 && e[i] >= (mx + mn) / 2) cr++;
  L.ok(cr / 1.2 >= 13 && cr / 1.2 <= 25 && mx - mn >= 15, `khl: Triller – ${(cr / 1.2).toFixed(1)} syllables a second at y 0.6 (13 + 12 y), swing ${(mx - mn).toFixed(1)} dB`);
  const rf = K(1500, 0.6, { silbe: 'ruf' }, { dur: 3 }), s0 = L.cents(zc(rf.L, 0.008, 0.03, 1500), 1500);
  L.ok(s0 >= 150, `khl: Ruf – slurred down from ${s0.toFixed(0)} ct`);
  const sub = (rr, rich) => { const x = K(440, 1, { rauheit: rr }, { rich, dur: 1 }); const sp = L.spectrum(x.L, SR, 0.5, 16384); return Math.max(L.harm(sp, 220, 1), L.harm(sp, 660, 1)) - L.harm(sp, 440, 1); };
  const a = sub(0, false), b = sub(1, false), c = sub(1, true);
  L.ok(a <= -45 && b >= -30 && c >= -30, `khl: Rauheit at the top – subharmonics ${a.toFixed(1)} dB at 0, ${b.toFixed(1)} at 1, level 3 (the pair on one air sac) ${c.toFixed(1)}`);
  const end = K(440, 0.6, {}, { dur: 1.5, msgs: [[0.5, { off: 0.5 }]] }); L.ok(!end.alive && end.done < 0.6, `khl: after {off} the labia stop within milliseconds – done at ${end.done.toFixed(3)} s`);
  const t0 = process.hrtime.bigint(); K(440, 0.6, {}, { dur: 4 }); const ns1 = Number(process.hrtime.bigint() - t0) / (4 * SR); const t1 = process.hrtime.bigint(); K(440, 0.6, {}, { dur: 4, rich: true }); const ns3 = Number(process.hrtime.bigint() - t1) / (4 * SR);
  console.log(`INFO khl: ${ns1.toFixed(1)} ns/sample level 1, ${ns3.toFixed(1)} level 3 (the harness included)`);
}
// -- Zapfen (myzel-scrape): the teeth keep the rate exactly (the jitter never accumulates); sub-sample teeth (vs whole
// samples: the same processor with u = 0); the Rast's hysteresis; the finger's speed; the stone's rasps; after
// underruns; a body changed under a note; the stroke; the coast after the end
{
  const ZD = (subs) => { process.env.SUBS = JSON.stringify(subs); return require('./zsrc').load(SR); };
  const scr = (o) => L.render(o.D || D, { name: 'myzel-scrape', po: Object.assign({ seed: 5, rich: !!o.rich, prm: o.prm || {} }, o.po), ch: o.rich ? 2 : 1, dur: o.dur || 2, params: o.params || { freq: o.f, hoehe: o.y }, each: o.each,
    msgs: [[0, { on: 0, f: o.f, y: o.y, vel: o.vel == null ? 0.75 : o.vel, burst: o.burst, gate: o.gate, seed: 99 }]].concat(o.off != null ? [[o.off, { off: o.off }]] : []).concat(o.msgs || []) });
  // the mean rate at the top is the note: 2 s → 2·f teeth (+ the first at once)
  const cnt = [];
  for (const f of [110, 220, 1003]) for (const b of ['zapfen', 'fels']) { const r = scr({ f, y: 1, dur: 2, prm: { koerper: b, schuppen: 1 } }); cnt.push([f, b, r.node.nT, Math.round(2 * f * (2 - 1 / SR * 0) )]); }
  L.ok(cnt.every((c) => Math.abs(c[2] - 2 * c[0]) <= 2), 'Zapfen: at the top the teeth come at exactly f (Schuppen 1: their jitter never accumulates) – f/body/teeth in 2 s: ' + cnt.map((c) => c.slice(0, 3).join('/')).join(', '));
  // sub-sample teeth: a strictly regular train (no jitter, no height variation, no noise) at 1003 Hz (47.86 samples) is
  // clean between its harmonics; placed on whole samples the rounding pattern rings sidebands
  { const reg = [['const J = fels ?', 'const J = 0 * (fels ?'], ['(1 + 3 * (1 - ry));\n', '(1 + 3 * (1 - ry)));\n'], ['const hA = 0.2 + 0.3 * p.schuppen;', 'const hA = 0;']];
    const Dsub = ZD(reg), Dint = ZD(reg.concat([['const u = tk ? 0 : Math.min(1, (ph - nx) / inc); this.nT++;', 'const u = 0; this.nT++;']]));
    const fl = (Dx) => require('./zpflib').floor(scr({ D: Dx, f: 1003, y: 1, dur: 2, prm: { kratzen: 0 } }).L, SR, 1003, 1.0);
    const a = fl(Dsub), b = fl(Dint);
    L.ok(a <= -60 && b - a >= 15, `Zapfen: sub-sample teeth – a strictly regular train at 1003 Hz is clean between its harmonics (${a.toFixed(1)} dB), on whole samples it is not (${b.toFixed(1)} dB)`); }
  // Rast: Höhe trembling ±0.01 at a step's edge (10 Hz) flips the step at most once; the rate on the step stays exact
  { const f = 220, oc = Math.log2(f / 3), yb = 1 - 2.5 / oc; let flips = 0, last = null;   // (between f/4 and f/8)
    scr({ f, y: yb, dur: 2, params: (t) => ({ freq: f, hoehe: yb + (Math.floor(t * 20) % 2 ? 0.01 : -0.01) }), each: (nd, t) => { if (t > 0.2) { if (last != null && nd.lock !== last) flips++; last = nd.lock; } } });
    L.ok(flips <= 1, `Zapfen: Rast hysteresis (±8 %) – Höhe trembling ±0.01 at the f/4 | f/8 edge flips the step ${flips} times in 1.8 s`); }
  // the finger's speed: a trembling height (±0.002 at 30 Hz) adds next to nothing, a swinging one up to half the rate
  { const sp = (amp, hz) => { let mx = 0, ys = 0.3; scr({ f: 220, y: 0.3, dur: 2, prm: { rast: 0 }, params: (t) => { ys += (0.3 + amp * Math.sin(2 * Math.PI * hz * t) - ys) * (1 - Math.exp(-128 / (0.04 * SR))); return { freq: 220, hoehe: ys }; }, each: (nd, t) => { if (t > 0.5) mx = Math.max(mx, Math.min(0.5, nd.sp)); } }); return mx; };   // (Höhe as the app delivers it: setP, τ 40 ms)
    const a = sp(0.002, 30), b = sp(0.12, 1);
    L.ok(a <= 0.12 && b >= 0.4, `Zapfen: finger speed – trembling ±0.002 at 30 Hz adds ≤ ${(100 * a).toFixed(0)} % to the rate, swinging ±0.12 at 1 Hz up to ${(100 * b).toFixed(0)} % (≤ 50)`); }
  // the stone: low on the field each creak is a rasp of slips (a falling chatter), at the top one slip a period
  { const lo = scr({ f: 220, y: 0.2, dur: 3, prm: { koerper: 'fels' } }), hi = scr({ f: 220, y: 1, dur: 1, prm: { koerper: 'fels' } });
    const a = lo.node.nS / Math.max(1, lo.node.nT), b = hi.node.nS / Math.max(1, hi.node.nT);
    L.ok(a >= 3 && a <= 10 && b >= 0.95 && b <= 1.3, `Zapfen Fels: ${a.toFixed(1)} slips per creak low (3–10), ${b.toFixed(2)} per period at the top (≈ 1)`); }
  // after underruns (lite): three modes, mono; level 3: six, two different sides
  { const lt = scr({ f: 220, y: 0.6, rich: true, po: { lite: 1 }, dur: 1 }), fu = scr({ f: 220, y: 0.6, rich: true, dur: 1 });
    let same = true; for (let i = 0; i < lt.L.length; i++) if (lt.L[i] !== lt.R[i]) { same = false; break; }
    let diff = false; for (let i = 0; i < fu.L.length; i++) if (fu.L[i] !== fu.R[i]) { diff = true; break; }
    L.ok(lt.node.K === 3 && same && fu.node.K === 6 && diff && L.rms(lt.L, 0.5 * SR, SR) > 1e-3, `Zapfen: level 3 ${fu.node.K} modes in stereo, after underruns ${lt.node.K}, one channel`); }
  // the body changed four times under a sounding note: bounded, sounding on
  { const sw = scr({ f: 330, y: 0.7, dur: 2.5, msgs: [[0.5, { set: { koerper: 'fels' } }], [1, { set: { koerper: 'panzer' } }], [1.5, { set: { koerper: 'kuerbis' } }], [2, { set: { koerper: 'holz' } }]] });
    L.ok(!L.nanCount(sw.L) && L.peak(sw.L) < 1 && [0.7, 1.2, 1.7, 2.2].every((t) => L.rms(sw.L, Math.round(t * SR), Math.round((t + 0.2) * SR)) > 1e-3), `Zapfen: the body changed four times under a note – bounded (peak ${L.peak(sw.L).toFixed(2)}), each sounds`); }
  // the stroke: 30–60-ms gates are a blip of 5–10 teeth (KONZEPT), low and high on the field, wood and stone
  { const bl = []; for (const b of ['zapfen', 'fels']) for (const y of [0, 0.6]) for (const g of [0.03, 0.045, 0.06]) { const r = scr({ f: 220, y, burst: true, gate: g, dur: 0.6, prm: { koerper: b } }); bl.push([b, y, g, r.node.nT]); }
    L.ok(bl.every((x) => x[3] >= 5 && x[3] <= 10), 'Zapfen: 30–60-ms strokes are a blip of 5–10 teeth (body/y/gate/teeth): ' + bl.map((x) => x.join('/')).join(', ')); }
  // the stroke: ≥ 5 teeth in 112 ms and its last knock, then nothing; the coast after the end
  { const st = scr({ f: 220, y: 0.3, burst: true, gate: 0.112, dur: 1.5 });
    const late = L.rms(st.L, Math.round(0.2 * SR), Math.round(1.5 * SR));
    L.ok(st.node.nT >= 6 && st.node.nT <= 12 && !st.alive, `Zapfen: a 112-ms stroke passes ${st.node.nT} teeth with its last knock (6–12), then rings out and ends (${L.db(late).toFixed(0)} dB after)`);
    let n1 = 0; const co = scr({ f: 220, y: 0.6, dur: 3, off: 1, each: (nd, t) => { if (t < 1.0) n1 = nd.nT; } });
    const after = co.node.nT - n1;
    L.ok(after >= 2 && after <= 40 && !co.alive, `Zapfen: let go, the stick coasts – ${after} more teeth, slowing, then it ends`); }
}
process.exit(L.summary() ? 1 : 0);
