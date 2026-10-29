/* ---------- Karplus-Strong string: rendered once per pitch, pre-rendered in the background ---------- */
function genKS(f, bright, decaySec, damp, pos, sr) {
  const dur = Math.min(decaySec * 1.05 + 0.05, 8);
  const len = Math.max(64, Math.floor(dur * sr));
  const y = new Float32Array(len);
  const s = 0.5 * damp;                         // loop low-pass amount (0 = bright, 0.5 = classic average)
  const L = sr / f - s;                         // compensate the filter's group delay
  const g = Math.pow(10, -3 / (decaySec * f));  // per-period loss for a T60 of decaySec
  const exLen = Math.max(2, Math.floor(sr / f));
  const ex = new Float32Array(exLen);
  let lp = 0;
  const a = 0.05 + bright * 0.95;
  for (let i = 0; i < exLen; i++) { lp += a * ((Math.random() * 2 - 1) - lp); ex[i] = lp; }
  const pd = Math.max(1, Math.round(pos * exLen));
  for (let i = exLen - 1; i >= pd; i--) ex[i] -= ex[i - pd];
  // the fraction of the delay in a first-order Thiran allpass (flat), plus a fixed two-tap of weight W – the old linear
  // read's mean loss, now the same for every note
  const W = 0.2, Lw = L - W, D = Math.floor(Lw - 0.5), d = Lw - D, ca = (1 - d) / (1 + d);
  let xa = 0, ya = 0, t1 = 0, u1 = 0;
  for (let n = 0; n < len; n++) {
    let v = n < exLen ? ex[n] : 0;
    const xi = n - D >= 0 ? y[n - D] : 0;
    ya = ca * xi + xa - ca * ya; xa = xi;
    const u = (1 - W) * ya + W * t1; t1 = ya;
    v += g * ((1 - s) * u + s * u1); u1 = u;
    y[n] = v;
  }
  let peak = 0;
  for (let n = 0; n < len; n++) peak = Math.max(peak, Math.abs(y[n]));
  const norm = peak > 0 ? 0.6 / peak : 1;
  const fade = Math.floor(sr * 0.03);
  for (let n = 0; n < len; n++) { y[n] *= norm; if (n > len - fade) y[n] *= (len - n) / fade; }
  return y;
}
const KS_CACHE = new Map();
KS_CACHE.frames = 0;
const ksArgs = (f, decaySec) => [f, Math.round(P['sai.bright'] * 20) / 20, decaySec, P['sai.damp'], P['sai.pos']];
const ksKey = (f, bright, decaySec, damp, pos) => [Math.round(f * 10), bright, decaySec.toFixed(2), damp.toFixed(2), pos.toFixed(2), SR].join('|');
function ksStore(key, data, f) {
  const buf = A.ctx.createBuffer(1, data.length, SR);
  buf.getChannelData(0).set(data);
  buf._f = f;
  KS_CACHE.set(key, buf);
  KS_CACHE.frames += data.length;
  while (KS_CACHE.size > 1 && (KS_CACHE.size > 80 || KS_CACHE.frames > 1e7)) {
    const k0 = KS_CACHE.keys().next().value;
    KS_CACHE.frames -= KS_CACHE.get(k0).length;
    KS_CACHE.delete(k0);
  }
  return buf;
}
// → { buf, rate }: the exact string, or – on a miss – the nearest string with the same settings, retuned by playback
// rate, while the exact one renders in the worker. Only the very first string renders on the spot.
function ksBuffer(f, bright, decaySec, damp, pos) {
  const key = ksKey(f, bright, decaySec, damp, pos);
  const hit = KS_CACHE.get(key);
  if (hit) { KS_CACHE.delete(key); KS_CACHE.set(key, hit); return { buf: hit, rate: 1 }; }
  const tail = key.slice(key.indexOf('|'));
  let near = null, nd = Math.log(4);   // up to two octaves away
  // (29.10.2026) a higher string read slower before a lower one read faster: a buffer read faster folds in Chrome and Safari
  for (const [k, b] of KS_CACHE) if (k.endsWith(tail)) { const d = Math.abs(Math.log(f / b._f)) + (b._f < f ? 0.75 : 0); if (d < nd) { nd = d; near = b; } }
  if (near && !HXW.on) {   // (Hexenring: the Werk-Rahmen renders the exact string at once)
    if (!ksBuffer.wait.has(key)) {
      ksBuffer.wait.add(key);
      dspJob('ks', [f, bright, decaySec, damp, pos, SR]).then(([data]) => { ksBuffer.wait.delete(key); if (A.ctx && !KS_CACHE.has(key)) ksStore(key, data, f); });
    }
    return { buf: near, rate: f / near._f };
  }
  return { buf: ksStore(key, genKS(f, bright, decaySec, damp, pos, SR), f), rate: 1 };
}
ksBuffer.wait = new Set();
// While Saite is in use, render every note of the current scale in the worker so taps never wait for it.
function saiInUse() {
  if (P['v.eng'] === 'sai' || P['v.layer'] === 'sai' || (RG.on && GK.p.rgS === 'sai')) return true;   // (Sporenregen striking strings)
  for (let i = 0; i < 4; i++) if (P['l' + i + '.on'] && P['l' + i + '.eng'] === 'sai') return true;
  return false;
}
function warmKS() {
  clearTimeout(warmKS.tm);
  if (!A.ctx) return;
  warmKS.tm = setTimeout(async () => {
    if (!saiInUse()) return;
    const job = (warmKS.job = (warmKS.job || 0) + 1);
    const freqs = new Set();
    for (const ly of layers()) {
      if (ly.eng !== 'sai') continue;
      N.notes.forEach((n, i) => freqs.add(+lyF(ly, n.f, i).toFixed(3)));
      // with a keyboard attached also the three octaves around middle C, so no key has to render a string while playing
      if (MIDI.ports.size) for (let m = 48; m <= 84; m++) { const mn = midiNote(m); freqs.add(+lyF(ly, mn.f, mn.idx).toFixed(3)); }
    }
    // Puls lanes with Saite play the field's notes shifted by their octave
    for (let i = 0; i < 4; i++) if (P['l' + i + '.on'] && P['l' + i + '.eng'] === 'sai') for (const n of N.notes) freqs.add(+(n.f * Math.pow(2, P['l' + i + '.oct'])).toFixed(3));
    if (RG.on && GK.p.rgS === 'sai') for (const n of N.notes) freqs.add(+n.f.toFixed(3));   // Sporenregen strikes the field's notes
    for (const f of freqs) {
      if (job !== warmKS.job) return;   // settings changed again: a newer run takes over
      const args = ksArgs(f, P['sai.decay']);
      const key = ksKey(...args);
      if (KS_CACHE.has(key)) continue;
      const [data] = await dspJob('ks', [...args, SR]);
      if (job === warmKS.job && !KS_CACHE.has(key)) ksStore(key, data, f);
    }
  }, 300);
}

