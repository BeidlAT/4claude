// Anlehnen · Höhe, Raum, Platzierung, "Neigen formt", Festhalten: forward/back is Höhe in every engine (held voices
// take the shifted height through setY, struck ones at the strike; the newest note full, older ones half, "Alle gleich"
// all full); "Raum" leans pan and echo instead of bending; "Unterarm" makes the roll Höhe and bends nothing; "Aus" and
// "Eigene" switch Anlehnen off (Aus silences tilt for assignments too, Eigene leaves them), a learned binding of an
// axis wins over Anlehnen's use of it; the sustain pedal (Festhalten) keeps bend and height; a real sensor stream with
// notes held never writes the patch; the card's chips and texts.
//   node t-ga-hoehe.js      (slot ga)
const { open, ok, close, probes, gestikOn, drivers } = require('./ga-h');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'microKEY Air']] } });
  await probes(page); await drivers(page);
  await gestikOn(page);
  await page.evaluate(() => { const M = window.__M; M.closePanel(); window.__g.quiet(); M.setParam('v.layer', 'off'); });

  // ---- Höhe in every engine ----
  const eng = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, out = {};
    for (const e of ['neb', 'kor', 'hau', 'obt', 'stm', 'swm', 'tie']) {
      M.setParam('v.eng', e);
      const tt = W.note('e', 0.4, 0.4), seen = [];
      for (const { v } of tt.voices) { const f = v.setY; v.setY = function (y) { seen.push(y); return f.call(this, y); }; }
      await window.__sleep(150);
      W.tilt(0, 0.6); await window.__sleep(220);
      out[e] = { n: tt.voices.length, last: seen[seen.length - 1], my: tt.my, want: 0.4 + 0.6 * 0.5 };
      W.tilt(0, 0); await window.__sleep(400);
      out[e].back = seen[seen.length - 1];
      W.up('e'); W.virtOff(); await window.__sleep(200); M.panic(); await window.__sleep(150);
    }
    // struck sounds: the height at the strike
    for (const e of ['glo', 'sai', 'klb', 'trp']) {
      M.setParam('v.eng', e);
      const st = M.ENGINES[e].start, ys = [];
      M.ENGINES[e].start = function (v, t, f, y, ...r) { ys.push(y); return st.call(this, v, t, f, y, ...r); };
      W.tilt(0, 0); W.note('p0', 0.5, 0.3); await window.__sleep(150); W.up('p0'); W.virtOff();
      W.note('hold', 0.2, 0.5); await window.__sleep(150);   // something sounds: the clutch acts, the lean counts
      W.tilt(0, -0.4); await window.__sleep(200);
      W.note('p1', 0.5, 0.3); await window.__sleep(80);
      out[e] = { ys: ys.slice(), want: 0.3 - 0.4 * 0.5 };   // the struck note is the newest: the full share
      M.ENGINES[e].start = st;
      W.up('p1'); W.up('hold'); W.virtOff(); await window.__sleep(200); M.panic(); await window.__sleep(150);
    }
    return out;
  });
  for (const e of ['neb', 'kor', 'hau', 'obt', 'stm', 'swm', 'tie']) {
    const r = eng[e];
    ok(r.n > 0 && near(r.last, r.want, 2e-3) && near(r.my, r.want, 2e-3) && near(r.back, 0.4, 2e-3), 'Höhe in ' + e + ': nach vorn neigen hebt die Höhe der gehaltenen Stimme 0,40 → ' + (r.last != null ? r.last.toFixed(3) : '–') + ', zurück ' + (r.back != null ? r.back.toFixed(3) : '–'));
  }
  for (const e of ['glo', 'sai', 'klb', 'trp']) {
    const r = eng[e];
    ok(r.ys.length === 3 && near(r.ys[0], 0.3, 1e-9) && near(r.ys[2], r.want, 2e-3), 'Höhe in ' + e + ' (angeschlagen): Helligkeit beim Anschlag folgt der Neigung (' + r.ys.map((y) => y.toFixed(3)).join(' → ') + ')');
  }
  // the sound itself: Nebel opens with the lean (energy above 2 kHz)
  const bright = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, G = window.__g;
    M.setParam('v.eng', 'neb');
    W.note('br', 0.35, 0.3); await window.__sleep(400);
    const a = await G.band(M.A.out, 2000, 6000);
    W.tilt(0, 1); await window.__sleep(500);
    const b = await G.band(M.A.out, 2000, 6000);
    W.tilt(0, 0); await window.__sleep(200); W.up('br'); W.virtOff(); await window.__sleep(200); M.panic(); await window.__sleep(200);
    return { a, b };
  });
  ok(bright.b > bright.a + 6, 'Nebel öffnet sich hörbar: über 2 kHz ' + bright.a.toFixed(1) + ' → ' + bright.b.toFixed(1) + ' dB');

  // ---- newest full, older half, Alle gleich ----
  const many = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    M.setParam('v.eng', 'neb');
    const a = W.note('ma', 0.2, 0.3);
    await window.__sleep(60);   // (notes within 40 ms are one stroke – a chord – and share the full share)
    const b = W.note('mb', 0.6, 0.3);
    await window.__sleep(150);
    W.tilt(0, 0.8); await window.__sleep(250);
    r.a = a.my; r.b = b.my;
    M.gkSet('viele', 'alle'); await window.__sleep(250);
    r.a2 = a.my; r.b2 = b.my;
    M.gkSet('viele', 'neu');
    W.tilt(0, 0); await window.__sleep(300); W.up('ma'); W.up('mb'); W.virtOff(); await window.__sleep(150);
    return r;
  });
  ok(near(many.b, 0.3 + 0.8 * 0.5, 2e-3) && near(many.a, 0.3 + 0.8 * 0.5 * 0.5, 2e-3), 'Neuester voll, ältere halb: ' + many.b.toFixed(3) + ' / ' + many.a.toFixed(3));
  ok(near(many.a2, 0.7, 2e-3) && near(many.b2, 0.7, 2e-3), 'Alle gleich: beide voll (' + many.a2.toFixed(3) + ' / ' + many.b2.toFixed(3) + ')');

  // ---- Raum, Unterarm, nichts ----
  const raum = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    M.gkSet('seit', 'raum');
    const tt = W.note('r', 0.4, 0.4); await window.__sleep(150);
    W.tilt(0.6, 0); await window.__sleep(200);
    r.pan = M.modVal('pan'); r.dly = M.modVal('dly'); r.bend = tt.fb ? tt.fb.own : 0; r.ga = tt.ga ? tt.ga.c : 0;
    W.tilt(-0.5, 0); await window.__sleep(200);
    r.pan2 = M.modVal('pan'); r.dly2 = M.modVal('dly');
    W.tilt(0, 0); await window.__sleep(200);
    r.pan0 = M.modVal('pan'); r.dly0 = M.modVal('dly');
    W.up('r'); W.virtOff(); await window.__sleep(100);
    M.gkSet('seit', 'aus');
    const t2 = W.note('r2', 0.4, 0.4); await window.__sleep(150);
    W.tilt(0.9, 0.5); await window.__sleep(200);
    r.nichts = { bend: t2.fb ? t2.fb.own : 0, pan: M.modVal('pan'), my: t2.my };
    W.tilt(0, 0); await window.__sleep(250); W.up('r2'); W.virtOff(); await window.__sleep(100);
    M.gkSet('seit', 'ton'); M.gkSet('platz', 'arm');
    const t3 = W.note('r3', 0.4, 0.4); await window.__sleep(150);
    W.tilt(0.6, 0.9); await window.__sleep(250);
    r.arm = { bend: t3.fb ? t3.fb.own : 0, my: t3.my, pan: M.modVal('pan') };
    W.tilt(0, 0); await window.__sleep(250); W.up('r3'); W.virtOff(); M.gkSet('platz', 'hand'); await window.__sleep(100);
    return r;
  });
  ok(near(raum.pan, 0.6, 1e-9) && near(raum.dly, 0.24, 1e-9) && raum.bend === 0 && raum.ga === 0, 'Raum: rechts neigen lenkt das Panorama nach rechts (' + raum.pan.toFixed(2) + ') und gibt Echo dazu (+' + raum.dly.toFixed(2) + '), keine Biegung');
  ok(near(raum.pan2, -0.5, 1e-9) && near(raum.dly2, 0.2, 1e-9), '   … links: Panorama ' + raum.pan2.toFixed(2) + ', Echo +' + raum.dly2.toFixed(2));
  ok(raum.pan0 === 0 && raum.dly0 === 0, '   … Mitte: beides in Ruhe');
  ok(raum.nichts.bend === 0 && raum.nichts.pan === 0 && near(raum.nichts.my, 0.65, 2e-3), 'seitlich „nichts“: keine Biegung, kein Panorama, die Höhe wirkt weiter (' + raum.nichts.my.toFixed(3) + ')');
  ok(raum.arm.bend === 0 && raum.arm.pan === 0 && near(raum.arm.my, 0.4 + 0.6 * 0.5, 2e-3), 'Unterarm: das Rollen (seitlich) ist die Höhe (' + raum.arm.my.toFixed(3) + '), vor/zurück und Biegung ruhen');

  // ---- Neigen formt: Aus, Eigene; a learned binding wins ----
  const nf = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    const run = async (tag) => {
      const tt = W.note('nf', 0.4, 0.4); await window.__sleep(150);
      W.tilt(0.9, 0.6); await window.__sleep(250);
      r[tag] = { bend: tt.fb ? tt.fb.own : 0, my: tt.my, flt: M.modVal('flt'), out: [M.GK.out.tiltX, M.GK.out.tiltY] };
      W.tilt(0, 0); await window.__sleep(300); W.up('nf'); W.virtOff(); await window.__sleep(120);
    };
    M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 1, target: 'mod.flt', mode: 'abs' }); M.MAP.v++;
    await run('anl');
    M.gkSet('neigen', 'eigene'); await run('eigene');
    M.gkSet('neigen', 'aus'); await run('aus');
    M.MAP.user.pop(); M.MAP.v++;
    M.gkSet('neigen', 'anl'); await run('ohne');
    return r;
  });
  ok(near(nf.anl.flt, 0.6, 0.02) && nf.anl.my === 0.4 && nf.anl.bend > 100, 'Anlehnen mit einer eigenen Zuweisung „Neigen ↕ → Filter“: die Zuweisung gewinnt (Filter ' + nf.anl.flt.toFixed(2) + ', Höhe ruht), seitlich biegt weiter (' + nf.anl.bend.toFixed(1) + ' ct)');
  ok(nf.eigene.bend === 0 && nf.eigene.my === 0.4 && near(nf.eigene.flt, 0.6, 0.02), 'Eigene: Anlehnen ruht, die Zuweisung wirkt (Filter ' + nf.eigene.flt.toFixed(2) + ')');
  ok(nf.aus.bend === 0 && nf.aus.my === 0.4 && nf.aus.flt === 0 && nf.aus.out[0] === 0 && nf.aus.out[1] === 0, 'Aus: Neigen formt nichts, auch nicht über Zuweisungen');
  ok(nf.ohne.bend > 100 && near(nf.ohne.my, 0.7, 2e-3), 'wieder Anlehnen ohne Zuweisung: Höhe (' + nf.ohne.my.toFixed(3) + ') und Biegung (' + nf.ohne.bend.toFixed(1) + ' ct)');

  // ---- Festhalten: the sustain pedal keeps the shape ----
  const fest = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    M.gkSet('ped', true);   // "Haltepedal hält fest" (off by default: legato pedalling would freeze Anlehnen)
    const tt = W.note('fh', 0.4, 0.4); await window.__sleep(150);
    W.tilt(0.9, 0.6); await window.__sleep(250);
    r.c0 = tt.fb.own; r.my0 = tt.my;
    window.__send([0xb0, 64, 127]); await window.__sleep(120);
    r.mode = M.GK.mode;
    W.tilt(0, 0); await window.__sleep(400);
    r.c1 = tt.fb.own; r.my1 = tt.my;
    window.__send([0xb0, 64, 0]); await window.__sleep(500);
    r.c2 = tt.fb.own; r.my2 = tt.my; r.mode2 = M.GK.mode;
    W.up('fh'); W.virtOff(); M.gkSet('ped', false); await window.__sleep(150);
    return r;
  });
  ok(fest.mode === 'hold' && fest.c1 === fest.c0 && fest.my1 === fest.my0, 'Haltepedal: Festhalten – Biegung (' + fest.c1.toFixed(1) + ' ct) und Höhe (' + fest.my1.toFixed(3) + ') bleiben, auch wenn die Hand zurückgeht');
  ok(fest.c2 === 0 && near(fest.my2, 0.4, 2e-3), 'Pedal los: beides gleitet zurück (' + fest.c2 + ' ct, ' + fest.my2.toFixed(3) + ', ' + fest.mode2 + ')');

  // ---- a real sensor stream with notes held: the sound moves, the patch never ----
  await page.evaluate(async () => {
    const M = window.__M;
    M.loadPreset(M.PRESETS.find((p) => p.key) || M.PRESETS[0]);
    await window.__sleep(1200);
  });
  const before = await page.evaluate(async () => {
    const M = window.__M, Wt = (window.__w = { set: {}, toast: 0 });
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { Wt.set[k] = (Wt.set[k] || 0) + 1; return si.call(this, k, v); };
    new MutationObserver(() => { if (document.querySelector('#toast').classList.contains('show')) Wt.toast++; }).observe(document.querySelector('#toast'), { attributes: true, attributeFilter: ['class'] });
    return { P: window.__g.patch(), preset: M.UI.preset, ir: M.A.irJob, ks: M.KS_CACHE.frames };
  });
  const seen = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, s = { bend: 0, my: 0, beb: 0, n: 0 };
    window.__sensor(true, { beta: 45, roll: 0 }, 3);
    await window.__sleep(400);
    const a = W.note(41, 0.3, 0.4), b = W.note(42, 0.6, 0.5);
    window.__send([0x90, 60, 90]);
    const t0 = performance.now();
    while (performance.now() - t0 < 6000) {
      const t = (performance.now() - t0) / 1000;
      window.__setPose({ beta: 45 + 18 * Math.sin(t * 1.1), roll: 26 * Math.sin(t * 0.8) });
      const k = M.touches.get('midi-k1-0-60');
      if (k && k.fb) s.bend = Math.max(s.bend, Math.abs(k.fb.own));
      s.my = Math.max(s.my, Math.abs(a.my - a.y), Math.abs(b.my - b.y));
      s.n++;
      await window.__sleep(1000 / 60);
    }
    window.__send([0x80, 60, 0]); W.up(41); W.up(42);
    window.__sensor(false);
    await window.__sleep(400);
    return s;
  });
  const after = await page.evaluate(() => { const M = window.__M; return { P: window.__g.patch(), preset: M.UI.preset, ir: M.A.irJob, ks: M.KS_CACHE.frames, w: window.__w }; });
  ok(seen.bend > 100 && seen.my > 0.1, 'mit Sensor, 6 s neigen und spielen: der neueste Ton biegt (bis ' + seen.bend.toFixed(0) + ' ct), die Höhe bewegt sich (±' + seen.my.toFixed(2) + ')');
  ok(after.P === before.P && after.preset === before.preset && !!before.preset, 'das Patch bleibt genau wie es war, das Preset behält seine Marke („' + after.preset + '“)');
  const saves = Object.keys(after.w.set).filter((k) => k !== 'myzel.gestik.v1');
  ok(!saves.length && after.w.toast === 0 && after.ir === before.ir && after.ks === before.ks, 'nichts gespeichert, kein Toast, kein neuer Hall, keine neuen Saiten (' + JSON.stringify(after.w.set) + ')');

  // ---- the card: chips, texts, settings stored with Gestik (never in the patch) ----
  const card = await page.evaluate(async () => {
    const M = window.__M, r = {};
    M.openPanel('dev'); await window.__sleep(300);
    const C = M.GK.card, q = (sel) => C.el.querySelector(sel);
    C.ga.open = true;
    r.neigen = [...C.neigen.querySelectorAll('.chip')].map((b) => b.textContent + (b.getAttribute('aria-checked') === 'true' ? '*' : ''));
    r.txt = C.neTxt.textContent;
    r.sum = C.gaSum.textContent;
    C.seit.querySelector('[data-v="raum"]').click(); await window.__sleep(50);
    r.txtRaum = C.neTxt.textContent; r.seit = M.GK.p.seit;
    C.seit.querySelector('[data-v="ton"]').click();
    C.platz.querySelector('[data-v="arm"]').click(); await window.__sleep(50);
    r.armHidden = C.seitRow.hidden; r.txtArm = C.neTxt.textContent;
    C.platz.querySelector('[data-v="hand"]').click();
    C.beb.querySelector('[data-v="oca"]').click(); await window.__sleep(50);
    r.bTxt = C.bTxt.textContent;
    q('[data-kc$=":tragen"]').click(); await window.__sleep(50);
    r.tragen = M.GK.p.tragen;
    q('[data-kc$=":tragen"]').click();
    C.neigen.querySelector('[data-v="eigene"]').click(); await window.__sleep(50);
    r.hiddenEigene = C.ga.hidden;
    C.neigen.querySelector('[data-v="anl"]').click(); await window.__sleep(50);
    r.stored = JSON.parse(M.store.get('myzel.gestik.v1'));
    r.inPatch = Object.keys(M.PD).some((k) => /neigen|tragen|bebung/i.test(k));
    C.beb.querySelector('[data-v="hand"]').click();
    M.closePanel();
    return r;
  });
  ok(card.neigen.join(' ') === 'Aus Anlehnen* Sporenregen Eigene' && /Höhe/.test(card.txt) && /Nachbarstufe/.test(card.txt), '„Neigen formt: Aus · Anlehnen · Sporenregen · Eigene“, Anlehnen gewählt; Text: ' + card.txt);
  ok(/Tonhöhe/.test(card.sum) && /Bebung/.test(card.sum), 'Zusammenfassung: „Anlehnen einstellen' + card.sum + '“');
  ok(card.seit === 'raum' && /Panorama und Echo/.test(card.txtRaum), 'Raum gewählt: ' + card.txtRaum);
  ok(card.armHidden && /Unterarm/.test(card.txtArm), 'Unterarm: „Seitlich“ verschwindet, Text: ' + card.txtArm);
  ok(/Ocarina/.test(card.bTxt), 'Ocarina: ' + card.bTxt);
  ok(card.tragen === true, 'der Tragen-Schalter schaltet');
  ok(card.hiddenEigene, 'Eigene: die Anlehnen-Einstellungen verschwinden');
  ok(card.stored.seit === 'ton' && card.stored.platz === 'hand' && card.stored.beb === 'oca' && card.stored.neigen === 'anl' && !card.inPatch, 'alles steht in Gestiks eigenen Einstellungen (myzel.gestik.v1), nichts im Patch');

  ok(errors.length === 0, 'keine Fehler im Browser' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
