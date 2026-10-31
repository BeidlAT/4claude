// Touché „Gestik“ (owner, 31.10.2026: „mit dem Touché die Gestik des Handys vollständig nachmachen“): chosen, the Touché
// is Gestik's phone (as over the Funkstrecke): tilt both ways (Anlehnen moves the Höhe), Bebung from a trembling hand,
// Drehen and Schwenken from circling, Ladung and Schütteln from a brisk to-and-fro, Wenden from two flicks toward you
// (and back), Ruhe with the hand off; another Spielweise hands Gestik back.     node t-tch-gestik.js   (slot 'mm')
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Touché SE'], ['k2', 'Testkeyboard']] } });
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep, o = {}, GK = M.GK;
    const cc = (n, v) => { window.__send([0xb0, n, Math.max(0, Math.min(127, Math.round(v)))], 'k1'); M.mapFlush(); };
    const D = { weg: 17, her: 16, li: 18, re: 19 };
    for (const n of [16, 17, 18, 19]) { cc(n, 127); await sl(20); cc(n, 0); await sl(20); }   // (calibrated: 127 is the full way)
    M.tchWeise('gestik'); await sl(200);
    o.on = !!GK.on && !!GK.rem && GK.rem.src.key === 'tch:gestik';
    window.__send([0x90, 60, 100], 'k2'); await sl(300);
    cc(D.re, 127); await sl(250); o.tiltX = +GK.raw.tiltX.toFixed(2); cc(D.re, 0);
    cc(D.weg, 127); await sl(250); o.tiltY = +GK.raw.tiltY.toFixed(2); o.hoehe = +M.modVal('hoehe').toFixed(2); cc(D.weg, 0); await sl(300);
    // a trembling hand: 6 Hz, a tenth of the way, around a light press to the right
    let beb = 0; const t0 = performance.now();
    while (performance.now() - t0 < 1200) { const t = (performance.now() - t0) / 1000; cc(D.re, 45 + 13 * Math.sin(2 * Math.PI * 6 * t)); await sl(8); beb = Math.max(beb, Math.abs(GK.raw.bebung || 0)); }
    cc(D.re, 0); o.beb = +beb.toFixed(2); await sl(400);
    // circling, about 1.2 times a second, clockwise
    let drh = 0, sw = 0; const t1 = performance.now();
    while (performance.now() - t1 < 2200) { const a = 2 * Math.PI * 1.2 * (performance.now() - t1) / 1000, x = Math.sin(a), y = Math.cos(a);
      cc(D.re, 110 * Math.max(0, x)); cc(D.li, 110 * Math.max(0, -x)); cc(D.weg, 110 * Math.max(0, y)); cc(D.her, 110 * Math.max(0, -y)); await sl(10);
      drh = Math.max(drh, Math.abs(GK.raw.drehen || 0)); sw = Math.max(sw, GK.R.st.sw || 0); }
    for (const n of [16, 17, 18, 19]) cc(n, 0);
    o.drh = +drh.toFixed(2); o.sw = +sw.toFixed(2); await sl(300);
    // a brisk to-and-fro, 5 Hz, left ↔ right
    let lad = 0, shake = false; const t2 = performance.now();
    while (performance.now() - t2 < 1500) { const s = Math.sin(2 * Math.PI * 5 * (performance.now() - t2) / 1000); cc(D.re, 127 * Math.max(0, s)); cc(D.li, 127 * Math.max(0, -s)); await sl(8); lad = Math.max(lad, GK.raw.ladung || 0); shake = shake || !!GK.R.st.shake; }
    cc(D.re, 0); cc(D.li, 0); o.lad = +lad.toFixed(2); o.shake = shake; await sl(700); o.shakeOff = !GK.R.st.shake;
    // two quick flicks toward you: Wenden – and again: back
    const flick = async () => { cc(D.her, 120); await sl(70); cc(D.her, 0); await sl(120); };
    await flick(); await flick(); await sl(80); o.wend = !!GK.R.st.wenden;
    await flick(); await flick(); await sl(80); o.wendBack = !GK.R.st.wenden;
    window.__send([0x80, 60, 0], 'k2');
    await sl(1800); o.ruhe = !!GK.R.st.ruhe;
    M.tchWeise('finger'); await sl(150); o.back = !GK.rem;
    return o;
  });
  ok(r.on, 'Gestik: the Touché becomes Gestik\'s phone');
  ok(r.tiltX > 0.9 && r.tiltY > 0.9 && r.hoehe > 0.3, `tilt: rechts → Neigen ↔, weg → Neigen ↕, Anlehnen raises the Höhe (${JSON.stringify([r.tiltX, r.tiltY, r.hoehe])})`);
  ok(r.beb > 0.1, `a trembling hand: Bebung (${r.beb})`);
  ok(r.drh > 0.3 && r.sw > 0.1, `circling: Drehen and Schwenken (${r.drh}, ${r.sw})`);
  ok(r.lad > 0.2 && r.shake && r.shakeOff, `a brisk to-and-fro: Ladung fills, Schütteln comes and goes (${r.lad}, ${r.shake}, ${r.shakeOff})`);
  ok(r.wend && r.wendBack, `two flicks toward you: Wenden (Schlafen) – and back (${r.wend}, ${r.wendBack})`);
  ok(r.ruhe && r.back, `the hand off: Ruhe; another Spielweise hands Gestik back (${r.ruhe}, ${r.back})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
