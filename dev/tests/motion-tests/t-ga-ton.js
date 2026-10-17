// Anlehnen · Tonhöhe: sideways tilt bends the NEWEST note toward the neighbouring step of the current scale and tuning –
// continuous to 80 %, then a magnetic snap onto the exact step (hysteresis to 65 %), back to exactly its own pitch at
// rest. Checked against neighbour steps computed here from the scale tables (12-TET, Just, the harmonic series, the
// chromatic and the free field), at the field's edges, for chromatic keys between steps, by the finger bus's value, the
// AudioParam and a measured frequency; "alle Töne" (each note to its own neighbour – the chord stays in the scale), a
// note struck while leaning, the haptic and visible tick, MIDI keys, the nanoKEY X-Y finger, MPE untouched.
//   node t-ga-ton.js      (slot ga: sh ../v2/mk.sh /home/user/4claude/myzel ga)
const { open, ok, close, probes, gestikOn, drivers } = require('./ga-h');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'microKEY Air'], ['k2', 'nanoKEY Studio KEYBOARD/CTRL'], ['k3', 'Testkeyboard']] } });
  await probes(page); await drivers(page);
  await gestikOn(page);
  await page.evaluate(() => {
    const M = window.__M;
    M.closePanel(); window.__g.quiet();
    M.setParam('v.eng', 'obt'); M.setParam('v.layer', 'off'); M.setParam('v.glide', 0);
    window.__vib = 0;
    navigator.vibrate = () => { window.__vib++; return true; };
    // the steps of the current scale and tuning, from the tables (independent of the app's search)
    window.__grid = () => {
      const sc = M.SCALES[M.P['t.scale']], base = M.N.base, L = [], just = M.P['t.just'];
      const rat = (s) => (just ? Math.pow(2, Math.floor(s / 12)) * M.JUST[((s % 12) + 12) % 12] : Math.pow(2, s / 12));
      for (let o = -4; o <= 7; o++) {
        if (sc.free) for (let k = 0; k < 12; k++) L.push(base * rat(o * 12 + k));
        else if (sc.r) for (const r of sc.r) L.push(base * Math.pow(2, o) * r);
        else for (const s of sc.s) L.push(base * Math.pow(2, o) * rat(s));
      }
      return L.sort((a, b) => a - b);
    };
    window.__nb = (f, dir) => { const L = window.__grid(), t = Math.pow(2, 30 / 1200); return dir > 0 ? L.find((x) => x > f * t) : L.reverse().find((x) => x < f / t); };
  });
  // one bend: a note at x, its zero taken, a lean of v, the cents it got against the table's neighbour
  const bend = (x, v, wait = 160) => page.evaluate(async ([x, v, wait]) => {
    const M = window.__M, W = window.__a;
    const tt = W.note('b', x);
    await window.__sleep(150);
    W.tilt(v); await window.__sleep(wait);
    const nb = window.__nb(tt.f, v > 0 ? 1 : -1), want = 1200 * Math.log2(nb / tt.f);
    const r = { f: tt.f, nb, want, c: tt.ga ? tt.ga.c : null, own: tt.fb ? tt.fb.own : null, prm: tt.fb ? tt.fb.src.offset.value : null, snap: tt.ga && tt.ga.snap, tn: tt.ga && tt.ga.tn, name: tt.name };
    W.tilt(0); await window.__sleep(450);
    r.back = tt.fb ? tt.fb.own : 0; r.backPrm = tt.fb ? tt.fb.src.offset.value : 0;
    W.up('b'); W.virtOff(); await window.__sleep(120);
    return r;
  }, [x, v, wait]);
  const setP = (kv) => page.evaluate((kv) => { for (const [k, v] of kv) window.__M.setParam(k, v); }, kv);
  const colX = (i) => page.evaluate((i) => window.__M.N.free ? i / (12 * window.__M.P['t.range']) : (i + 0.5) / window.__M.N.notes.length, i);
  const len = () => page.evaluate(() => window.__M.N.notes.length);

  // ---- exact landing: 12-TET, Just, the harmonic series, chromatic – up and down, middle and edges ----
  const cases = [
    ['Moll-Pentatonik', [['t.scale', 'mpent'], ['t.just', false]]],
    ['Dorisch, rein gestimmt (Just)', [['t.scale', 'dor'], ['t.just', true]]],
    ['Obertonreihe 8–15', [['t.scale', 'harm'], ['t.just', false]]],
    ['Pelog', [['t.scale', 'pelog'], ['t.just', false]]],
    ['Chromatisch, rein', [['t.scale', 'chrom'], ['t.just', true]]],
  ];
  for (const [nm, kv] of cases) {
    await setP(kv);
    const n = await len();
    for (const [i, where] of [[Math.floor(n / 2), 'Mitte'], [0, 'unterster Ton'], [n - 1, 'oberster Ton']]) {
      const x = await colX(i);
      for (const v of [0.9, -0.9]) {
        const r = await bend(x, v);
        ok(r.snap === Math.sign(v) && near(r.c, r.want, 1e-9) && near(r.own, r.want, 1e-9) && near(r.prm, r.want, 1e-3),
          nm + ', ' + where + ' ' + r.name + (v > 0 ? ' rechts → ' : ' links → ') + r.tn + ': ' + r.c.toFixed(4) + ' ct = Nachbarstufe ' + r.want.toFixed(4) + ' ct (Bus ' + (r.prm == null ? '–' : r.prm.toFixed(4)) + ')');
        ok(r.back === 0 && r.backPrm === 0, '   … zurück in der Mitte: genau 0 ct (' + r.back + ', Param ' + r.backPrm + ')');
      }
    }
  }
  // ---- measured: the oscillator really sounds the neighbour (Obertöne: a clean fundamental) ----
  for (const [nm, kv] of [['Moll-Pentatonik', [['t.scale', 'mpent'], ['t.just', false]]], ['Obertonreihe', [['t.scale', 'harm'], ['t.just', false]]]]) {
    await setP(kv);
    const x = await colX(3);
    const m = await page.evaluate(async (x) => {
      const M = window.__M, W = window.__a, G = window.__g;
      const tt = W.note('m', x);
      await window.__sleep(150);
      W.tilt(0.95); await window.__sleep(250);
      const nb = window.__nb(tt.f, 1), pk = await G.peak(M.A.out, nb * 0.94, nb * 1.06);
      W.tilt(0); await window.__sleep(400);
      const pk0 = await G.peak(M.A.out, tt.f * 0.94, tt.f * 1.06);
      W.up('m'); W.virtOff(); await window.__sleep(300); M.panic(); await window.__sleep(200);
      return { f: tt.f, nb, pk, pk0 };
    }, x);
    const ct = 1200 * Math.log2(m.pk / m.nb), ct0 = 1200 * Math.log2(m.pk0 / m.f);
    ok(Math.abs(ct) < 3 && Math.abs(ct0) < 3, nm + ': gemessen ' + m.pk.toFixed(2) + ' Hz für die Stufe ' + m.nb.toFixed(2) + ' Hz (' + ct.toFixed(2) + ' ct), zurück ' + m.pk0.toFixed(2) + ' Hz für ' + m.f.toFixed(2) + ' Hz (' + ct0.toFixed(2) + ' ct)');
  }
  // ---- notes between steps: a chromatic key in a pentatonic scale, the free field ----
  await setP([['t.scale', 'mpent'], ['t.just', false], ['midi.map', 'chrom']]);
  const chromKey = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, out = [];
    // a key between two steps of the scale (one semitone above a step that has a step two semitones above it)
    const base = 12 * (M.P['t.oct'] + 1) + Number(M.P['t.root']), steps = M.SCALES.mpent.s;
    const k = steps.findIndex((s, i) => i + 1 < steps.length && steps[i + 1] - s >= 2), key = base + 12 + steps[k] + 1;
    for (const v of [0.9, -0.9]) {
      window.__send([0x90, key, 90], 'k3');
      await window.__sleep(160);
      const tt = M.touches.get('midi-k3-0-' + key);
      W.tilt(v); await window.__sleep(160);
      const nb = window.__nb(tt.f, v > 0 ? 1 : -1);
      out.push({ v, f: tt.f, nb, c: tt.ga.c, want: 1200 * Math.log2(nb / tt.f), snap: tt.ga.snap });
      W.tilt(0); await window.__sleep(300);
      window.__send([0x80, key, 0], 'k3'); W.virtOff(); await window.__sleep(100);
    }
    return out;
  });
  for (const r of chromKey) ok(r.snap && near(r.c, r.want, 1e-9) && Math.abs(r.want) < 250 && Math.abs(r.want) > 90, 'eine chromatische Taste zwischen zwei Stufen (' + r.f.toFixed(2) + ' Hz) ' + (r.v > 0 ? 'hinauf' : 'hinab') + ' auf die nächste echte Stufe: ' + r.c.toFixed(3) + ' ct = ' + r.want.toFixed(3) + ' ct');
  await setP([['midi.map', 'scale'], ['t.scale', 'free'], ['t.just', false]]);
  const free = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, out = [], total = 12 * M.P['t.range'];
    for (const [semi, v] of [[7.4, 0.9], [7.4, -0.9], [6.9, 0.9], [7.0, 0.9]]) {
      const tt = W.note('fr', semi / total);
      await window.__sleep(150);
      W.tilt(v); await window.__sleep(160);
      const nb = window.__nb(tt.f, v > 0 ? 1 : -1);
      out.push({ semi, v, c: tt.ga.c, want: 1200 * Math.log2(nb / tt.f) });
      W.tilt(0); await window.__sleep(300); W.up('fr'); W.virtOff(); await window.__sleep(100);
    }
    return out;
  });
  for (const r of free) ok(near(r.c, r.want, 1e-9) && Math.abs(r.c) >= 30, 'Stufenlos, ' + r.semi + ' Halbtöne ' + (r.v > 0 ? 'hinauf' : 'hinab') + ': auf den nächsten Halbton der Stimmung, mindestens 30 ct weit (' + r.c.toFixed(2) + ' ct = ' + r.want.toFixed(2) + ' ct)');
  await setP([['t.scale', 'mpent']]);

  // ---- continuous, the snap, its hysteresis, the tick ----
  const hy = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, steps = [];
    window.__vib = 0;
    const tt = W.note('h', 0.42);
    await window.__sleep(150);
    const I = 1200 * Math.log2(window.__nb(tt.f, 1) / tt.f);
    W.tilt(0.01); await window.__sleep(150);   // the clutch's glide into the drag is done
    let ticks = 0, lastT = tt.gaT;
    for (const v of [0.3, 0.5, 0.79, 0.82, 0.7, 0.68, 0.6, 0.5, 0.78, 0.83, 0.78, 0.83, 0.78, 0.83, 0.7, 1]) {
      W.tilt(v); await window.__sleep(70);
      if (tt.gaT !== lastT) { ticks++; lastT = tt.gaT; }
      steps.push([v, tt.ga.c / I, tt.ga.snap]);
    }
    const vib = window.__vib;
    W.tilt(0); await window.__sleep(400); W.up('h'); W.virtOff(); await window.__sleep(100);
    return { steps, ticks, vib, I };
  });
  const S = Object.fromEntries(hy.steps.map((s, i) => [i, s]));
  // the way past Tonhöhe's own rest (a fifth of the way, soft at its edge): 30 % → 6.7 %, 50 % → 33 %
  const p = (v) => { const e = v - 0.2; return e <= 0 ? 0 : Math.min(1, (e < 0.1 ? (e * e) / 0.2 : e - 0.05) / 0.75); };
  ok(near(S[0][1], p(0.3), 1e-9) && near(S[1][1], p(0.5), 1e-9) && near(S[2][1], p(0.79), 1e-9) && !S[2][2], 'stetig bis 80 % (nach der Ruhe der Tonhöhe): 30 % → ' + (S[0][1] * 100).toFixed(1) + ' %, 50 % → ' + (S[1][1] * 100).toFixed(1) + ' %, 79 % → ' + (S[2][1] * 100).toFixed(1) + ' % des Wegs, nicht eingerastet');
  ok(S[3][1] === 1 && S[3][2] === 1, 'ab 80 % rastet er ein: genau die Stufe (' + S[3][1] + ')');
  ok(S[4][1] === 1 && S[5][1] === 1, 'Hysterese: bei 70 % und 68 % Neigung (67 % des Wegs) bleibt er auf der Stufe');
  ok(S[6][2] === 0 && near(S[6][1], p(0.6), 1e-9), 'erst unter 65 % löst er sich (60 % → ' + (S[6][1] * 100).toFixed(1) + ' %)');
  const flips = hy.steps.slice(8).reduce((n, s, i, a) => n + (i && s[2] !== a[i - 1][2] ? 1 : 0), 0);
  ok(flips === 1 && hy.steps[hy.steps.length - 1][1] === 1, 'wackelt die Hand um die Schwelle (78 ↔ 83 %), rastet er einmal ein und klappert nicht (' + flips + ' Wechsel)');
  ok(hy.ticks === 2 && hy.vib === 2, 'jedes Einrasten: ein sichtbarer Tick auf dem Feld und ein Vibrationstick (' + hy.ticks + ' Ticks, ' + hy.vib + '× vibriert)');
  const noHap = await page.evaluate(async () => {
    const M = window.__M, W = window.__a;
    M.gkSet('haptik', false); window.__vib = 0;
    const tt = W.note('h2', 0.42); await window.__sleep(150);
    W.tilt(0.9); await window.__sleep(120);
    const r = { vib: window.__vib, tick: !!tt.gaT };
    W.tilt(0); await window.__sleep(300); W.up('h2'); W.virtOff(); M.gkSet('haptik', true); await window.__sleep(100);
    return r;
  });
  ok(noHap.vib === 0 && noHap.tick, 'Haptik aus: kein Vibrieren, der sichtbare Tick bleibt (iOS hat keine Vibration im Browser)');

  // ---- newest only; a note struck while leaning; older notes back to their pitch ----
  const nw = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    const a = W.note('a', 0.3); await window.__sleep(150);
    W.tilt(0.9); await window.__sleep(150);
    r.a1 = a.ga.c; r.aWant = 1200 * Math.log2(window.__nb(a.f, 1) / a.f);
    const b = W.note('b2', 0.62); await window.__sleep(60);
    r.b0 = b.fb ? b.fb.own : 0;
    await window.__sleep(400);
    r.a2 = a.fb.own; r.b1 = b.ga.c; r.bz = b.ga.z;
    W.tilt(0.9 + 0.1); await window.__sleep(150);   // leaning on from the pose b was struck in: 10 % of the way
    r.b2 = b.ga.c; r.bI = 1200 * Math.log2(window.__nb(b.f, 1) / b.f);
    W.tilt(0); await window.__sleep(200);
    r.b3 = b.ga.c; r.bDn = 1200 * Math.log2(window.__nb(b.f, -1) / b.f);
    W.up('b2'); await window.__sleep(250);
    r.aBack = a.ga.c;   // a is the newest again: a new zero, at rest it is unbent
    W.tilt(-0.9); await window.__sleep(150);
    r.aDn = a.ga.c; r.aDnWant = 1200 * Math.log2(window.__nb(a.f, -1) / a.f);
    W.tilt(0); await window.__sleep(300); W.up('a'); W.virtOff(); await window.__sleep(100);
    return r;
  });
  ok(near(nw.a1, nw.aWant, 1e-9), 'der neueste Ton biegt (' + nw.a1.toFixed(2) + ' ct)');
  ok(nw.b0 === 0 && nw.b1 === 0 && near(nw.bz, 0.9, 1e-9), 'ein Ton, angeschlagen während das Handy geneigt ist, klingt wie angeschlagen (0 ct) – sein Nullpunkt ist die Neigung beim Anschlag');
  ok(nw.a2 === 0, 'der ältere Ton gleitet zurück auf seine eigene Tonhöhe (genau 0 ct)');
  ok(near(nw.b2, p(0.1) * nw.bI, 1e-9) && nw.b2 === 0, 'weiter neigen gilt ab seinem Nullpunkt: 10 % weiter bleibt in seiner Ruhe (' + nw.b2.toFixed(2) + ' ct von ' + nw.bI.toFixed(2) + ')');
  ok(nw.b3 === nw.bDn, 'zurück in die Mitte ist für ihn „links“: er rastet auf seiner unteren Nachbarstufe ein (' + nw.b3.toFixed(2) + ' ct)');
  ok(nw.aBack === 0 && near(nw.aDn, nw.aDnWant, 1e-9), 'der alte Ton wird wieder der neueste: ab seiner neuen Ruhe biegt er, links hinab (' + nw.aDn.toFixed(2) + ' ct)');

  // ---- alle Töne: a chord shifts in the scale, each note to its own neighbour ----
  for (const sc of ['dor', 'harm']) {
    await setP([['t.scale', sc], ['t.just', false]]);
    const ch = await page.evaluate(async () => {
      const M = window.__M, W = window.__a, n = M.N.notes.length, out = [];
      M.gkSet('viele', 'alle');
      const ids = [2, 4, 6].map((i) => { const id = 'c' + i; W.note(id, (i + 0.5) / n); return id; });
      await window.__sleep(150);
      for (const v of [1, -1]) {
        W.tilt(v); await window.__sleep(160);
        const L = window.__grid();
        for (const id of ids) {
          const tt = M.touches.get(id), want = 1200 * Math.log2(window.__nb(tt.f, v) / tt.f), sound = tt.f * Math.pow(2, tt.fb.own / 1200);
          out.push({ v, name: tt.name, c: tt.fb.own, want, inScale: L.some((x) => Math.abs(1200 * Math.log2(x / sound)) < 1e-6) });
        }
      }
      W.tilt(0); await window.__sleep(300);
      const back = ids.every((id) => M.touches.get(id).fb.own === 0);
      for (const id of ids) W.up(id);
      M.gkSet('viele', 'neu'); W.virtOff(); await window.__sleep(100);
      return { out, back };
    });
    ok(ch.out.every((r) => near(r.c, r.want, 1e-9) && r.inScale), (sc === 'dor' ? 'Dorisch' : 'Obertonreihe') + ', „Alle gleich“: jeder Ton des Akkords auf seine eigene Nachbarstufe, der Akkord bleibt in der Skala (' + ch.out.map((r) => r.name + (r.v > 0 ? '+' : '') + r.c.toFixed(1)).join(', ') + ')');
    ok(ch.back, '   … und zurück: alle genau auf ihrer Tonhöhe');
  }
  await setP([['t.scale', 'mpent']]);

  // ---- keyboard notes, the nanoKEY's X-Y finger, MPE ----
  const kb = await page.evaluate(async () => {
    const M = window.__M, W = window.__a, r = {};
    window.__send([0x90, 57, 100], 'k1'); window.__send([0x90, 60, 100], 'k1');
    await window.__sleep(160);
    W.tilt(0.9); await window.__sleep(160);
    const a = M.touches.get('midi-k1-0-57'), b = M.touches.get('midi-k1-0-60');
    r.old = a.fb ? a.fb.own : 0; r.nw = b.fb.own; r.want = 1200 * Math.log2(window.__nb(b.f, 1) / b.f);
    // the keyboard's own wheel adds (a channel bus under the note's own)
    window.__send([0xe0, 0x7f, 0x7f], 'k1'); await window.__sleep(120);
    r.cents = b.fb.cents; r.wheel = M.A.bendCents != null ? M.A.bendCents : null; r.par = b.fb.par ? b.fb.par.cents : null;
    window.__send([0xe0, 0, 0x40], 'k1');
    W.tilt(0); await window.__sleep(300);
    r.back = b.fb.own;
    window.__send([0x80, 57, 0], 'k1'); window.__send([0x80, 60, 0], 'k1'); W.virtOff(); await window.__sleep(150);
    // the X-Y pad as a finger (CC 16/17 position, CC 18 touch)
    window.__send([0xb0, 16, 50], 'k2'); window.__send([0xb0, 17, 64], 'k2'); window.__send([0xb0, 18, 127], 'k2');
    await window.__sleep(200);
    const xy = M.touches.get('midi-xy-k2');
    r.xy = !!xy;
    if (xy) {
      W.tilt(-0.9); await window.__sleep(160);
      r.xyC = xy.fb ? xy.fb.own : 0; r.xyWant = 1200 * Math.log2(window.__nb(xy.f, -1) / xy.f);
      W.tilt(0, 0.6); await window.__sleep(200);
      r.xyMy = xy.my; r.xyY = xy.y;
    }
    window.__send([0xb0, 18, 0], 'k2'); W.virtOff(); await window.__sleep(150);
    // MPE: a note on a member channel brings its own bend and height
    M.setParam('midi.mpe', 'on');
    window.__send([0x91, 62, 100], 'k3');
    await window.__sleep(160);
    const mp = M.touches.get('midi-k3-1-62');
    r.mpe = !!(mp && mp.mpe);
    W.tilt(0.9, 0.7); await window.__sleep(200);
    r.mpeC = mp && mp.fb ? mp.fb.own : 0; r.mpeMy = mp ? mp.my : null; r.mpeY = mp ? mp.y : null; r.mpeGa = mp && mp.ga ? mp.ga.c : 0;
    W.tilt(0); await window.__sleep(200);
    window.__send([0x81, 62, 0], 'k3'); M.setParam('midi.mpe', 'auto'); W.virtOff(); await window.__sleep(100);
    return r;
  });
  ok(kb.old === 0 && near(kb.nw, kb.want, 1e-9), 'Keyboard-Akkord: die zuletzt gedrückte Taste biegt genau auf die Stufe (' + kb.nw.toFixed(2) + ' ct), die ältere bleibt (0 ct)');
  ok(kb.par != null ? near(kb.cents, kb.par + kb.nw, 1e-6) && kb.par > 100 : kb.cents > kb.nw + 100, 'das Pitch-Rad des Keyboards kommt obendrauf (' + kb.cents.toFixed(1) + ' ct = Rad ' + (kb.par != null ? kb.par.toFixed(1) : '?') + ' + Anlehnen ' + kb.nw.toFixed(1) + ')');
  ok(kb.back === 0, '   … und Anlehnen kehrt genau zurück (0 ct)');
  ok(kb.xy && near(kb.xyC, kb.xyWant, 1e-9), 'der X-Y-Finger des nanoKEY Studio biegt links hinab auf seine Stufe (' + (kb.xyC || 0).toFixed(2) + ' ct)');
  ok(kb.xy && near(kb.xyMy, Math.min(1, kb.xyY + 0.6 * 0.5), 1e-3), '   … und vor/zurück formt seine Höhe (' + (kb.xyY || 0).toFixed(3) + ' → ' + (kb.xyMy || 0).toFixed(3) + ')');
  ok(kb.mpe && kb.mpeC === 0 && kb.mpeGa === 0 && kb.mpeMy === kb.mpeY, 'MPE-Ton: keine Biegung, keine Höhe aus Anlehnen – er bringt beides selbst mit');

  ok(errors.length === 0, 'keine Fehler im Browser' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exitCode = 1; await close(); });
