// Moder's crackle in Node: the voice with Knistern minus the same voice without (same seeds) = the crackle alone.
// Events per second (transients in its envelope), its share of energy within ±5 % of the modes, its level against the
// voice – in 0.3–1.5 s (SPEC §3.10's window) and over the end.   node crk-mdr.js '{"y":0.7}' …
const L = require('./dsplib');
const { hit, RAT } = require('./proto-mdr');
const SR = 48000;
// transient events: 1-ms RMS envelope; a peak counts when it rises ≥ 6 dB over the envelope's minimum of the last 10 ms
// and stands ≥ −35 dB re the crackle's loudest moment in the window, with 4 ms between counted peaks
function events(x, t0, t1) {
  const w = Math.round(0.001 * SR), e = []; for (let i = Math.floor(t0 * SR); i + w <= t1 * SR; i += w) e.push(L.rms(x, i, i + w));
  const mx = Math.max(...e); let n = 0, last = -99;
  for (let i = 10; i < e.length - 1; i++) {
    if (!(e[i] >= e[i - 1] && e[i] > e[i + 1])) continue;
    const mn = Math.min(...e.slice(i - 10, i));
    if (e[i] > 2 * mn && e[i] > mx * 0.0178 && i - last >= 4) { n++; last = i; }
  }
  return n / (t1 - t0);
}
// share of the energy within ±5 % of the modes' frequencies (Hann, 8192 points, averaged over the window)
function conc(x, f, ratios, t0, t1) {
  let inn = 0, tot = 0;
  for (let t = t0; t + 8192 / SR <= t1; t += 4096 / SR) {
    const sp = L.spectrum(x, SR, t, 8192);
    for (let k = Math.round(30 / sp.hz); k < sp.p.length; k++) { const hz = k * sp.hz; tot += sp.p[k]; if (ratios.some((r) => Math.abs(hz / (f * r) - 1) <= 0.05)) inn += sp.p[k]; }
  }
  return inn / tot;
}
function crackle(o) {
  const a = hit(o), b = hit(Object.assign({}, o, { prm: Object.assign({}, o.prm || {}, { knistern: 0 }) }));
  const c = new Float32Array(a.L.length); for (let i = 0; i < c.length; i++) c[i] = a.L[i] - b.L[i];
  return { c, a: a.L, b: b.L, ev: a.node.nev };
}
module.exports = { events, conc, crackle };
if (require.main === module) {
  const base = JSON.parse(process.argv[2] || '{}'), list = process.argv.slice(3).map((s) => JSON.parse(s));
  for (const cc of list.length ? list : [{}]) {
    const o = Object.assign({}, base, cc, { prm: Object.assign({}, base.prm || {}, cc.prm || {}) }), f = o.f || 220, body = o.prm.koerper || 'glocke';
    const { c, a, ev } = crackle(o), life = o.prm.nachklang || 5, rr = RAT[body].slice(0, o.rich ? 12 : 8).filter((r) => f * r < 16000);
    const lvl = (x, t0, t1) => L.db(L.rms(x, t0 * SR, t1 * SR));
    console.log(JSON.stringify(cc), JSON.stringify({ evPerS: +events(c, 0.3, 1.5).toFixed(1), evInternal: ev, conc: +conc(c, f, rr, 0.3, 1.5).toFixed(2), concEnd: +conc(c, f, rr, 0.6 * life, 0.9 * life).toFixed(2),
      crk: +(lvl(c, 0.3, 1.5) - lvl(a, 0.3, 1.5)).toFixed(1), crkEnd: +(lvl(c, 0.7 * life, 0.9 * life) - lvl(a, 0.7 * life, 0.9 * life)).toFixed(1), crk03: +(lvl(c, 0.05, 0.3) - lvl(a, 0.05, 0.3)).toFixed(1) }));
    if (o.wav) { L.wav(o.wav, a, a, SR); L.wav(o.wav.replace('.wav', '-crk.wav'), c, c, SR); }
  }
}
