/* ---------- metering ---------- */
// Each strip is tapped after fader, width, balance and "Pumpen", before mute (a muted channel still shows what it would do).
// The taps exist only while a meter is on screen.
function mkMeter(n) {
  const m = { sp: A.ctx.createChannelSplitter(2), L: A.ctx.createAnalyser(), R: A.ctx.createAnalyser() };
  m.L.fftSize = m.R.fftSize = n; m.L.smoothingTimeConstant = m.R.smoothingTimeConstant = 0;
  m.sp.connect(m.L, 0); m.sp.connect(m.R, 1);
  m.bl = new Float32Array(n); m.br = new Float32Array(n);
  m.pk = [0, 0]; m.rms = [0, 0]; m.hold = [0, 0]; m.holdT = [0, 0]; m.clipT = -1e9;
  return m;
}
function meterTaps(on) {
  if (!A.ctx || !MIX.list.length || MIX.meter === !!on) return;
  MIX.meter = !!on;
  for (const st of MIX.list) {
    if (!st.m) st.m = mkMeter(1024);
    if (on) st.duck.connect(st.m.sp); else { try { st.duck.disconnect(st.m.sp); } catch (e) {} }
  }
  if (!A.mm) {
    A.mm = mkMeter(2048); A.km = mkMeter(2048);
    // K-weighting (ITU-R BS.1770): high shelf +4 dB around 1.7 kHz, high-pass at 38 Hz
    A.kw1 = BQ('highshelf', 1681.97); A.kw1.gain.value = 4; A.kw2 = BQ('highpass', 38.13, -6.015);
    A.kw1.connect(A.kw2).connect(A.km.sp);
    A.lufs = { hist: [], blocks: [], lastB: 0, m: -Infinity, s: -Infinity, i: -Infinity, corr: 1 };
  }
  if (on) { A.out.connect(A.mm.sp); A.out.connect(A.kw1); }
  else { try { A.out.disconnect(A.mm.sp); A.out.disconnect(A.kw1); } catch (e) {} }
}
const PK_FALL = 13;   // dB per second
function meterRead(m, dt, now) {
  m.L.getFloatTimeDomainData(m.bl); m.R.getFloatTimeDomainData(m.br);
  const k = 1 - Math.exp(-dt / 0.3), fall = Math.pow(10, -PK_FALL * dt / 20);
  for (let c = 0; c < 2; c++) {
    const b = c ? m.br : m.bl;
    let pk = 0, ss = 0;
    for (let i = 0; i < b.length; i++) { const x = b[i], a = x < 0 ? -x : x; if (a > pk) pk = a; ss += x * x; }
    m.ms = m.ms || [0, 0]; m.ms[c] = ss / b.length;
    m.pk[c] = Math.max(pk, m.pk[c] * fall);
    m.rms[c] += (m.ms[c] - m.rms[c]) * k;
    if (pk >= m.hold[c] || now - m.holdT[c] > 1.8) { m.hold[c] = pk; m.holdT[c] = now; }
    if (pk >= 1) m.clipT = now;
  }
}
// loudness after ITU-R BS.1770 / EBU R 128 from the K-weighted taps: momentary 400 ms, short-term 3 s, integrated with
// the absolute (−70 LUFS) and relative (−10 LU) gates; plus the phase correlation of the sum
function loudRead(now) {
  const km = A.km, Lz = A.lufs, mm = A.mm;
  const z = (km.ms[0] + km.ms[1]);
  Lz.hist.push([now, z]);
  while (Lz.hist.length && Lz.hist[0][0] < now - 3) Lz.hist.shift();
  let sm = 0, nm = 0, ss = 0;
  for (const [t, v] of Lz.hist) { ss += v; if (t >= now - 0.4) { sm += v; nm++; } }
  const lu = (p) => (p > 1e-12 ? -0.691 + 10 * Math.log10(p) : -Infinity);
  const zm = nm ? sm / nm : 0;
  Lz.m = lu(zm); Lz.s = lu(Lz.hist.length ? ss / Lz.hist.length : 0);
  if (now - Lz.lastB >= 0.1) { Lz.lastB = now; if (Lz.m > -70) Lz.blocks.push(zm); if (Lz.blocks.length > 40000) Lz.blocks.shift(); }
  if (Lz.blocks.length) {
    let a = 0; for (const v of Lz.blocks) a += v;
    const gate = (a / Lz.blocks.length) * 0.1;   // −10 LU, as power
    let g = 0, n = 0; for (const v of Lz.blocks) if (v > gate) { g += v; n++; }
    Lz.i = n ? lu(g / n) : -Infinity;
  }
  let lr = 0, ll = 0, rr = 0;
  for (let i = 0; i < mm.bl.length; i++) { const l = mm.bl[i], r = mm.br[i]; lr += l * r; ll += l * l; rr += r * r; }
  const c = ll > 1e-9 && rr > 1e-9 ? lr / Math.sqrt(ll * rr) : ll + rr > 1e-9 ? 0 : 1;
  Lz.corr += (c - Lz.corr) * 0.15;
}
function loudReset() { if (A.lufs) { A.lufs.blocks = []; A.lufs.i = -Infinity; } }
function mixMeters(dt) {
  if (!MIX.meter || !A.ctx) return;
  const now = A.ctx.currentTime;
  dt = clamp(dt || 0.016, 0.001, 0.25);
  for (const st of MIX.list) meterRead(st.m, dt, now);
  meterRead(A.mm, dt, now); meterRead(A.km, dt, now);
  loudRead(now);
}

