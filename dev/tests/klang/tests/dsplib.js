// Shared helpers for the klang tests: run the app's worklet processors in Node (myzelDsp() extracted from the app and
// evaluated with a minimal AudioWorkletGlobalScope shim), and the analysis used by every bench (rms, pitch, FFT,
// centroid, WAV, spectrogram).
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const APP = process.env.MYZEL_SRC || '/home/user/4claude/myzel/index.html';

function dspSource(file = APP) {
  const s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('function myzelDsp()'), b = s.indexOf('// end myzelDsp', a);
  if (a < 0 || b < 0) throw new Error('myzelDsp() not found in ' + file);
  return s.slice(a, b);
}
// evaluate the module in a fresh scope: returns { procs: {name: Class}, scope }
function loadDsp(sr = 48000, src = dspSource()) {
  const procs = {};
  const scope = { currentTime: 0, currentFrame: 0 };
  class AudioWorkletProcessor { constructor() { this.port = { onmessage: null, out: [], postMessage(m) { this.out.push(m); } }; } }
  const fn = new Function('sampleRate', 'AudioWorkletProcessor', 'registerProcessor', 'scope',
    'return (function(){ ' + src.replace(/\bcurrentTime\b/g, 'scope.currentTime') + '; return myzelDsp(); })();');
  fn(sr, AudioWorkletProcessor, (n, C) => { procs[n] = C; }, scope);
  return { procs, scope, sr };
}
// render one processor offline. opts: {name, po (processorOptions), dur, ch (1|2), params: {freq, detune, hoehe} or a
// function (t) → params, msgs: [[t, msg], …] (msg.on/off get t filled in)}
function render(D, o) {
  const { procs, scope, sr } = D, C = procs[o.name];
  const node = new C({ processorOptions: o.po || {} });
  const n = Math.ceil(o.dur * sr), ch = o.ch || 1, outL = new Float32Array(n), outR = ch > 1 ? new Float32Array(n) : null;
  const msgs = (o.msgs || []).slice().sort((x, y) => x[0] - y[0]);
  const bs = o.block || 128, P = { freq: [220], detune: [0], hoehe: [0.5] };
  let mi = 0, alive = true, done = -1; const posted = [];
  const t0 = process.hrtime.bigint();
  for (let f0 = 0; f0 < n; f0 += bs) {
    scope.currentTime = f0 / sr; scope.currentFrame = f0;
    while (mi < msgs.length && msgs[mi][0] < (f0 + bs) / sr + 0.2) { node.port.onmessage({ data: msgs[mi][1] }); mi++; }   // posted ahead, as the main thread does
    const p = typeof o.params === 'function' ? o.params(f0 / sr) : o.params || {};
    P.freq[0] = p.freq != null ? p.freq : 220; P.detune[0] = p.detune || 0; P.hoehe[0] = p.hoehe != null ? p.hoehe : 0.5;
    const L = new Float32Array(bs), R = ch > 1 ? new Float32Array(bs) : null;
    if (alive) alive = node.process([], [ch > 1 ? [L, R] : [L]], P);
    else if (done < 0) done = f0 / sr;
    const m = Math.min(bs, n - f0);
    outL.set(L.subarray(0, m), f0); if (outR) outR.set(R.subarray(0, m), f0);
    while (node.port.out.length) posted.push([f0 / sr, node.port.out.shift()]);
  }
  const ns = Number(process.hrtime.bigint() - t0) / n;
  return { L: outL, R: outR, sr, posted, alive, done, nsPerSample: ns, node };
}
// ---- analysis ----
const db = (x) => 20 * Math.log10(Math.abs(x) + 1e-12);
function rms(a, from = 0, to = a.length) { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, to - from)); }
function peak(a) { let p = 0; for (let i = 0; i < a.length; i++) { const x = Math.abs(a[i]); if (x > p) p = x; } return p; }
function mean(a, from = 0, to = a.length) { let s = 0; for (let i = from; i < to; i++) s += a[i]; return s / Math.max(1, to - from); }
function nanCount(a) { let c = 0; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) c++; return c; }
// pitch: normalised difference function (YIN) with parabolic interpolation; fmin..fmax
function yin(seg, sr, fmin = 40, fmax = 3000, thr = 0.12) {
  const tmin = Math.floor(sr / fmax), tmax = Math.ceil(sr / fmin), W = seg.length - tmax;
  if (W < 256) return 0;
  const d = new Float64Array(tmax + 2);
  for (let t = 1; t <= tmax + 1; t++) { let s = 0; for (let i = 0; i < W; i++) { const x = seg[i] - seg[i + t]; s += x * x; } d[t] = s; }
  const c = new Float64Array(tmax + 2); c[0] = 1; let acc = 0;
  for (let t = 1; t <= tmax + 1; t++) { acc += d[t]; c[t] = acc > 0 ? d[t] * t / acc : 1; }
  let best = -1;
  for (let t = tmin; t <= tmax; t++) if (c[t] < thr) { while (t + 1 <= tmax && c[t + 1] < c[t]) t++; best = t; break; }
  if (best < 0) { let mv = Infinity; for (let t = tmin; t <= tmax; t++) if (c[t] < mv) { mv = c[t]; best = t; } }
  const a = c[best - 1], b = c[best], e = c[best + 1], den = a - 2 * b + e;
  const sh = den > 0 ? 0.5 * (a - e) / den : 0;
  return sr / (best + sh);
}
// refine a pitch estimate by the phase of the fundamental across two windows (sub-cent accuracy on steady tones)
function pitchFine(sig, sr, f0, at, len = 8192) {
  const ph = (i0) => { let re = 0, im = 0; const w = 2 * Math.PI * f0 / sr; for (let i = 0; i < len; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / len), x = sig[i0 + i] * h; re += x * Math.cos(w * (i0 + i)); im -= x * Math.sin(w * (i0 + i)); } return Math.atan2(im, re); };
  const gap = Math.round(sr * 0.05), a = Math.floor(at * sr);
  if (a + gap + len >= sig.length) return f0;
  let d = ph(a + gap) - ph(a); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return f0 + d / (2 * Math.PI * gap / sr);
}
const cents = (f, ref) => 1200 * Math.log2(f / ref);
// pitch of a tone whose harmonics carry symmetric sidebands (scanned synthesis: every ring mode is an AM of the scan):
// the power-weighted mean frequency in ±f/2 around each harmonic, divided by its number, weighted by its power
function combPitch(sig, sr, f, at, N = 32768, hmax = 8) {
  const sp = spectrum(sig, sr, at, N); let num = 0, den = 0;
  for (let m = 1; m <= hmax && m * f < Math.min(5000, sr / 2 - f); m++) {
    const a = Math.ceil((m * f - 0.45 * f) / sp.hz), b = Math.floor((m * f + 0.45 * f) / sp.hz);
    let s = 0, w = 0; for (let k = a; k <= b; k++) { s += sp.p[k] * k * sp.hz; w += sp.p[k]; }
    if (w > 0) { num += (s / w / m) * w; den += w; }
  }
  return den > 0 ? num / den : 0;
}
function fft(re, im) {   // in place, radix 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const k = i + j, l = k + len / 2, tr = re[l] * cr - im[l] * ci, ti = re[l] * ci + im[l] * cr; re[l] = re[k] - tr; im[l] = im[k] - ti; re[k] += tr; im[k] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
function spectrum(sig, sr, at, N = 8192) {   // power spectrum (Hann) of N samples from `at` s
  const re = new Float64Array(N), im = new Float64Array(N), a = Math.floor(at * sr);
  for (let i = 0; i < N; i++) re[i] = (sig[a + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  fft(re, im);
  const p = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
  return { p, hz: sr / N };
}
function centroid(sig, sr, at, N = 4096) { const { p, hz } = spectrum(sig, sr, at, N); let a = 0, b = 0; for (let k = 1; k < p.length; k++) { a += p[k] * k * hz; b += p[k]; } return b > 0 ? a / b : 0; }
// level of harmonic h (dB, power peak within ±2 bins)
function harm(sp, f, h) { const k = Math.round(f * h / sp.hz); let m = 0; for (let j = k - 2; j <= k + 2; j++) if (sp.p[j] > m) m = sp.p[j]; return 10 * Math.log10(m + 1e-30); }
// strongest component away from all harmonics of f (more than `guard` Hz from any k·f), relative to the strongest
// harmonic, in dB – below 6 kHz
function inharmonic(sp, f, guard = 25, fmax = 6000) {
  let top = 0, off = 0;
  for (let k = 1; k * sp.hz < fmax; k++) {
    const hz = k * sp.hz, h = Math.round(hz / f), dist = Math.abs(hz - h * f);
    if (dist <= guard) top = Math.max(top, sp.p[k]); else off = Math.max(off, sp.p[k]);
  }
  return 10 * Math.log10((off + 1e-30) / (top + 1e-30));
}
// the scan's update artefacts: strongest line within ±6 Hz of (m + j/n)·f (j = 1 … n−1), relative to the strongest
// harmonic, in dB (n = updates per n periods; physical sidebands of the ring stay below 100 Hz and never land there)
function subharm(sp, f, n, fmax = 8000) {
  let top = 0, off = 0;
  for (let m = 0; m * f < fmax; m++) {
    for (let k = Math.round((m * f - 6) / sp.hz); k <= Math.round((m * f + 6) / sp.hz); k++) if (m > 0) top = Math.max(top, sp.p[k] || 0);
    for (let j = 1; j < n; j++) { const c = (m + j / n) * f; for (let k = Math.round((c - 6) / sp.hz); k <= Math.round((c + 6) / sp.hz); k++) off = Math.max(off, sp.p[k] || 0); }
  }
  return 10 * Math.log10((off + 1e-30) / (top + 1e-30));
}
// envelope: RMS per `win` s
function env(sig, sr, win = 0.01) { const w = Math.round(win * sr), out = []; for (let i = 0; i + w <= sig.length; i += w) out.push(rms(sig, i, i + w)); return out; }
function t90(sig, sr, from, ref) { const e = env(sig, sr, 0.005), a = Math.floor(from / 0.005); for (let i = a; i < e.length; i++) if (e[i] >= 0.9 * ref) return (i - a) * 0.005; return Infinity; }
function wav(file, L, R, sr) {
  R = R || L; const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}
function spectro(file) { const png = file.replace(/\.wav$/, '.png'); try { execSync(`ffmpeg -v error -y -i "${file}" -lavfi showspectrumpic=s=1024x384:legend=1:scale=log:fscale=log "${png}"`); return png; } catch (e) { return null; } }
// PASS/FAIL bookkeeping
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('PASS ' + msg); } else { fails++; console.log('FAIL ' + msg); } return cond; }
function summary() { console.log(`\n${passes} passed, ${fails} failed`); return fails; }
module.exports = { APP, dspSource, loadDsp, render, db, rms, peak, mean, nanCount, yin, pitchFine, cents, combPitch, subharm, fft, spectrum, centroid, harm, inharmonic, env, t90, wav, spectro, ok, summary };
