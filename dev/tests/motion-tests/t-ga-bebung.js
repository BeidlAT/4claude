// Anlehnen · Bebung and Ocarina: sensor traces (gk-lib's motion generator: poses → accelerationIncludingGravity,
// linear acceleration, rotation rate at 60 Hz) played through the app in real time while a note is held. Bebung's
// vibrato follows the hand – a 6 Hz wrist wobble gives a 6 Hz vibrato whose depth doubles with the wobble – and ignores
// a slow 1 Hz drift; the phone's own loud bass rattling it on a table (50 Hz, folded to 10 Hz at 60 Hz sampling) gives
// none; older notes half, "Alle gleich" full; on by default on a phone, off on a big screen; without a gyroscope the
// choice shows as unavailable and Ocarina (a steady LFO, depth from the forward lean) still works.
//   node t-ga-bebung.js      (slot ga)
const { open, ok, close, probes, gestikOn, drivers } = require('./ga-h');
const L = require('./gk-lib');
const smooth = L.smooth;
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await probes(page); await drivers(page);
  await gestikOn(page);
  const dflt = await page.evaluate(() => { const M = window.__M; M.closePanel(); window.__g.quiet(); M.setParam('v.eng', 'obt'); M.setParam('v.layer', 'off'); M.gkSet('seit', 'aus'); return { beb: M.gaBeb(), sw: screen.width, sh: screen.height, stored: M.GK.p.beb }; });
  ok(dflt.beb === 'hand' && dflt.stored === null, 'auf dem Handy (' + dflt.sw + '×' + dflt.sh + ') ist Bebung zuerst an (Hand)');

  // a trace played while one (or two) notes are held; what the notes' own bend gets, every 4 ms
  const play = (tr, o = {}) => page.evaluate(async ([tr, o]) => {
    const M = window.__M, W = window.__a, rec = [];
    let a = null, b = null;
    setTimeout(() => { a = W.note('ba', 0.4, 0.5); }, o.noteAt || 400);
    if (o.second) setTimeout(() => { b = W.note('bb', 0.7, 0.5); }, o.second);
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (!a || !M.A.ctx) return;
      const now = M.A.ctx.currentTime, nw = M.modNewest();
      rec.push([performance.now() - t0, M.modCents(a, nw, now), b ? M.modCents(b, nw, now) : 0, M.GK.out.bebung, a.fb ? a.fb.own : 0]);
    }, 4);
    await M.GK.play(tr);
    clearInterval(iv);
    W.up('ba'); if (b) W.up('bb');
    await window.__sleep(400);
    return rec;
  }, [tr, o]);
  // depth (half the peak-to-peak, 5th–95th percentile) and rate (zero crossings around the mean) in a window
  const stats = (rec, from, to, col = 1) => {
    const v = rec.filter((r) => r[0] >= from && r[0] <= to).map((r) => r[col]);
    if (v.length < 10) return { depth: 0, hz: 0, max: 0 };
    const s = v.slice().sort((x, y) => x - y), m = v.reduce((x, y) => x + y, 0) / v.length;
    let zc = 0;
    for (let i = 1; i < v.length; i++) if ((v[i - 1] - m) * (v[i] - m) < 0 && Math.abs(v[i] - m) > 0.05) zc++;
    return { depth: (s[Math.floor(s.length * 0.95)] - s[Math.floor(s.length * 0.05)]) / 2, hz: zc / 2 / ((to - from) / 1000), max: Math.max(...v.map(Math.abs)) };
  };
  const wob = (amp, hz, extra = {}) => L.trace(5, (t) => ({ beta: 45, roll: t > 1.4 && t < 4.4 ? amp * Math.sin(2 * Math.PI * hz * t) * smooth(1.4, 1.6, t) : 0 }), Object.assign({ seed: 11 }, extra));

  const w2 = await play(wob(2, 6)), w4 = await play(wob(4, 6));
  const s2 = stats(w2, 2200, 4200), s4 = stats(w4, 2200, 4200), r2 = stats(w2, 500, 1300);
  ok(s2.depth > 5 && Math.abs(s2.hz - 6) < 1, 'Handgelenk ±2° bei 6 Hz → Vibrato ±' + s2.depth.toFixed(1) + ' ct mit ' + s2.hz.toFixed(1) + ' Hz');
  ok(Math.abs(s4.hz - 6) < 1 && s4.depth / s2.depth > 1.5 && s4.depth / s2.depth < 2.8, 'doppelt so weit gewackelt (±4°) → ±' + s4.depth.toFixed(1) + ' ct, ' + (s4.depth / s2.depth).toFixed(2) + '× so tief, ' + s4.hz.toFixed(1) + ' Hz – Tiefe und Tempo macht die Hand');
  ok(r2.max < 0.5, 'vor dem Wackeln, in Ruhe gehalten: kein Vibrato (' + r2.max.toFixed(2) + ' ct)');
  const w4s = stats(w4, 2200, 4200, 4);
  ok(w4s.depth > 0.5 * s4.depth, '   … und es kommt am Biege-Bus des Tons an (±' + w4s.depth.toFixed(1) + ' ct)');
  const w3 = await play(L.trace(5, (t) => ({ beta: 45, roll: t > 1.4 && t < 4.4 ? 3 * Math.sin(2 * Math.PI * 3.5 * t) * smooth(1.4, 1.6, t) : 0 }), { seed: 12 }));
  const s3 = stats(w3, 2200, 4200);
  ok(Math.abs(s3.hz - 3.5) < 0.8 && s3.depth > 5, 'langsameres Wackeln (3,5 Hz) → das Vibrato wird langsamer: ' + s3.hz.toFixed(1) + ' Hz, ±' + s3.depth.toFixed(1) + ' ct');
  // a slow drift: the lean itself, not Bebung
  const dr = await play(L.trace(5.5, (t) => ({ beta: 45, roll: t > 1.2 ? 8 * Math.sin(2 * Math.PI * 1 * (t - 1.2)) : 0 }), { seed: 13 }));
  const sd = stats(dr, 2000, 5300);
  ok(sd.max < 3, 'langsames Hin und Her (1 Hz, ±8°): keine Bebung (höchstens ' + sd.max.toFixed(2) + ' ct)');
  // the phone's own speaker: loud bass rattling it on the table
  const rumble = L.trace(5, (t) => ({ beta: 0, roll: 0.15 * Math.sin(2 * Math.PI * 50 * t) }), { seed: 14, noise: { g: 0.05, r: 1 } }).map((s) => Object.assign(s, { bass: 1 }));
  const rb = await play(rumble);
  const sr = stats(rb, 1500, 4800);
  const guard = await page.evaluate(() => window.__M.GK.R.st.guard);
  ok(sr.max < 1, 'Handy auf dem Tisch, lauter Bass rüttelt mit 50 Hz am Gyroskop: keine Bebung (höchstens ' + sr.max.toFixed(2) + ' ct, Bass-Schutz ' + (guard ? 'greift' : 'aus') + ')');
  // two notes: the older one half; Alle gleich: both full
  const two = await play(wob(4, 6), { noteAt: 300, second: 600 });
  const sa = stats(two, 2200, 4200, 1), sb = stats(two, 2200, 4200, 2);
  ok(sb.depth > 5 && sa.depth / sb.depth > 0.4 && sa.depth / sb.depth < 0.6, 'zwei Töne: der neueste ±' + sb.depth.toFixed(1) + ' ct, der ältere halb so tief (±' + sa.depth.toFixed(1) + ')');
  await page.evaluate(() => window.__M.gkSet('viele', 'alle'));
  const two2 = await play(wob(4, 6), { noteAt: 300, second: 600 });
  const sa2 = stats(two2, 2200, 4200, 1), sb2 = stats(two2, 2200, 4200, 2);
  ok(sa2.depth / sb2.depth > 0.85 && sa2.depth / sb2.depth < 1.15, 'Alle gleich: beide gleich tief (±' + sa2.depth.toFixed(1) + ' / ±' + sb2.depth.toFixed(1) + ')');
  await page.evaluate(() => window.__M.gkSet('viele', 'neu'));
  // with Tonhöhe on, the wobble shakes the bend only a little: the lean bends, the wobble is vibrato
  await page.evaluate(() => window.__M.gkSet('seit', 'ton'));
  const tb = await play(L.trace(5.5, (t) => ({ beta: 45, roll: 14 * smooth(1.0, 1.6, t) + (t > 2.4 && t < 5 ? 3 * Math.sin(2 * Math.PI * 6 * t) : 0) }), { seed: 15 }));
  const ton = await page.evaluate(() => window.__M.gkSet('seit', 'aus'));
  const st = stats(tb, 3000, 4800);
  const mean = tb.filter((r) => r[0] >= 3000 && r[0] <= 4800).reduce((s, r, i, a) => s + r[1] / a.length, 0);
  ok(mean > 40 && st.depth > 5 && Math.abs(st.hz - 6) < 1.2, 'Tonhöhe und Bebung zusammen: geneigt biegt (Mitte ' + mean.toFixed(0) + ' ct), das Wackeln schwingt darum (±' + st.depth.toFixed(1) + ' ct, ' + st.hz.toFixed(1) + ' Hz)');
  // Bebung off / Ocarina chosen: the hand's wobble gives nothing
  await page.evaluate(() => window.__M.gkSet('beb', 'aus'));
  const off = stats(await play(wob(4, 6)), 2200, 4200);
  ok(off.max < 0.5, 'Bebung aus: das Wackeln macht kein Vibrato (' + off.max.toFixed(2) + ' ct)');

  // ---- Ocarina: a steady LFO, its depth from the forward lean (exact values through the dragged Wasserwaage) ----
  await page.evaluate(() => window.__M.gkSet('beb', 'oca'));
  const oca = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    const a = W.note('oa', 0.3, 0.5); await window.__sleep(150);
    W.tilt(0, 0.6); await window.__sleep(600);
    r.g1 = a.fb && a.fb.lg ? a.fb.lg.gain.value : null; r.hz1 = M.GA.lfo ? M.GA.lfo.o.frequency.value : null;
    const b = W.note('ob', 0.6, 0.5); await window.__sleep(200);
    r.ga = a.fb.lg.gain.value; r.gb = b.fb && b.fb.lg ? b.fb.lg.gain.value : null;
    W.tilt(0, -0.6); await window.__sleep(200);
    r.back = [a.fb.lg.gain.value, b.fb.lg.gain.value];
    W.tilt(0, 1); await window.__sleep(600);
    r.hz2 = M.GA.lfo.o.frequency.value; r.gFull = b.fb.lg.gain.value;
    // the vibrato is heard: the note's pitch swings (strongest bin moves between two reads)
    const pk = []; for (let i = 0; i < 6; i++) { pk.push(await window.__g.peak(M.A.out, b.f * 0.9, b.f * 1.1, 4096)); await window.__sleep(37); }
    r.swing = 1200 * Math.log2(Math.max(...pk) / Math.min(...pk));
    W.tilt(0, 0); await window.__sleep(250);
    r.rest = [a.fb.lg.gain.value, b.fb.lg.gain.value];
    W.up('oa'); W.up('ob'); W.virtOff(); await window.__sleep(200);
    return r;
  });
  ok(Math.abs(oca.g1 - 0.6 * 45) < 0.5 && Math.abs(oca.hz1 - (4.6 + 1.6 * 0.6)) < 0.2, 'Ocarina: nach vorn geneigt (60 %) → gleichmäßiges Vibrato ±' + (oca.g1 || 0).toFixed(1) + ' ct mit ' + (oca.hz1 || 0).toFixed(2) + ' Hz');
  ok(Math.abs(oca.gb - 27) < 0.5 && Math.abs(oca.ga - 13.5) < 0.5, '   … der neueste voll (' + (oca.gb || 0).toFixed(1) + ' ct), der ältere halb (' + oca.ga.toFixed(1) + ' ct)');
  ok(oca.back[0] === 0 && oca.back[1] === 0, '   … nach hinten geneigt: kein Vibrato');
  ok(Math.abs(oca.gFull - 45) < 0.5 && oca.hz2 > 6, '   … ganz nach vorn: ±' + oca.gFull.toFixed(1) + ' ct, schneller (' + oca.hz2.toFixed(2) + ' Hz)');
  ok(oca.swing > 15, '   … und man hört es: die Tonhöhe schwingt um ' + oca.swing.toFixed(0) + ' ct');
  ok(oca.rest[0] === 0 && oca.rest[1] === 0, '   … zurück in der Mitte: ruhig');
  // Ocarina with the sensor and no gyroscope
  const og = await page.evaluate(async () => {
    const M = window.__M, W = window.__a;
    M.gkDisable(); M.gkEnable(false); await window.__sleep(100);   // a device without gyroscope: a fresh start
    const L = [];
    for (let t = 0; t <= 3000; t += 1000 / 60) { const b = (45 - 25 * Math.min(1, Math.max(0, (t - 1200) / 400))) * Math.PI / 180; L.push({ t, g: [0, 9.81 * Math.sin(b), 9.81 * Math.cos(b)], a: [0, 0, 0], r: null }); }
    let a = null; setTimeout(() => { a = W.note('og', 0.5, 0.5); }, 300);
    await M.GK.play(L);
    const r = { gyro: M.GK.R.st.gyro, g: a && a.fb && a.fb.lg ? a.fb.lg.gain.value : 0, lean: M.GK.out.tiltY };
    W.up('og'); await window.__sleep(300);
    return r;
  });
  ok(!og.gyro && og.g > 20, 'ohne Gyroskop: Ocarina geht trotzdem – 25° nach vorn → ±' + og.g.toFixed(1) + ' ct (Neigung ' + og.lean.toFixed(2) + ')');
  const noGyroCard = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('beb', 'hand');
    M.openPanel('dev'); await window.__sleep(300);
    const C = M.GK.card; C.ga.open = true; M.gkCardSync();
    const hb = C.beb.querySelector('[data-v="hand"]');
    const r = { dis: hb.disabled, title: hb.title, txt: C.bTxt.textContent, sum: C.gaSum.textContent };
    M.closePanel();
    return r;
  });
  ok(noGyroCard.dis && /braucht Gyroskop – dieses Gerät hat keins/.test(noGyroCard.title) && /Ocarina geht auch ohne/.test(noGyroCard.txt), 'ohne Gyroskop: „Hand“ ist ausgegraut („' + noGyroCard.title + '“), der Text bietet Ocarina an');
  // a big screen: Bebung starts off (by size, not by name) – the user's choice is kept
  const big = await page.evaluate(() => {
    const M = window.__M, r = {};
    M.GK.p.beb = null;
    Object.defineProperty(screen, 'width', { get: () => 820, configurable: true }); Object.defineProperty(screen, 'height', { get: () => 1180, configurable: true });
    r.big = M.gaBeb();
    M.gkSet('beb', 'hand'); r.chosen = M.gaBeb();
    M.gkSet('beb', null);
    Object.defineProperty(screen, 'width', { get: () => 390, configurable: true }); Object.defineProperty(screen, 'height', { get: () => 844, configurable: true });
    r.phone = M.gaBeb();
    return r;
  });
  ok(big.big === 'aus' && big.chosen === 'hand' && big.phone === 'hand', 'großer Bildschirm (820×1180): Bebung zuerst aus, einschaltbar; Handy: an');

  ok(errors.length === 0, 'keine Fehler im Browser' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
