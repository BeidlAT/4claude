// Forensic reproductions for the Fährte report (slot fx: sh ../v2/mk.sh /home/user/4claude/myzel fx).
// node repro.js [A B C ...]  – each scenario in a fresh page; prints REPRO lines with numbers.
process.env.GF = process.env.GF || 'http://127.0.0.1:8790/fx-inst/index.html';
const H = require('../motion-tests/gf-h');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (k, m) => console.log('REPRO ' + k + ': ' + m);
const want = process.argv.slice(2);
const run = (k) => !want.length || want.includes(k);
const toastOf = (page) => page.evaluate(() => (document.getElementById('toastMsg') || {}).textContent || '');
// wait until the heard beat has passed the next Fährte bar line (+ extra beats)
const pastBar = (page, extra = 0.3) => page.evaluate(async (x) => {
  const M = window.__M, b = M.faeHeard(performance.now()), E = M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4 + 1e-9) + x;
  while (M.faeHeard(performance.now()) < E) await window.__sleep(20);
  return E;
}, extra);

(async () => {
  // ---- A: discoverability – where is the button?
  if (run('A')) {
    for (const [name, o] of [['phone, no Gestik, no MIDI', { mobile: true, cfg: { noMidi: true } }], ['desktop, no MIDI device', { cfg: { noMidi: true } }], ['desktop + MIDI keyboard', { cfg: { ins: [['k1', 'microKEY Air']] } }]]) {
      const { page } = await H.open(o);
      await sleep(400);
      const r = await page.evaluate(() => { const M = window.__M; M.faeUI(); M.openPanel('dev'); M.faeUI(); const s = document.querySelector('.fae-sec'); return { btnHidden: document.getElementById('btnFae').hidden, secHidden: s ? s.hidden : 'absent', gk: M.GK.on, seen: M.FA.p.seen }; });
      say('A', name + ': bar button hidden=' + r.btnHidden + ', Gerät-panel section hidden=' + r.secHidden + ' (Gestik on=' + r.gk + ', seen=' + r.seen + ')');
      await H.close();
    }
  }

  // ---- B: notes are not looped. Play a little melody on the field (clean taps, then taps with 1-2 px of finger drift), tap Fährte
  if (run('B')) {
    for (const drift of [0, 2]) {
      const { page } = await H.open({});
      await page.evaluate(() => { const M = window.__M; M.FA.p.len = 1; M.FA.p.fade = 0.85; });
      const box = await (await page.$('#cvFx')).boundingBox();
      // four notes per second for ~3.5 s
      for (let i = 0; i < 14; i++) {
        const x = box.x + box.width * (0.2 + 0.05 * (i % 8)), y = box.y + box.height * 0.5;
        await page.mouse.move(x, y); await page.mouse.down();
        if (drift) { await sleep(60); await page.mouse.move(x, y - drift); }
        await sleep(drift ? 120 : 180); await page.mouse.up(); await sleep(70);
      }
      await page.evaluate(() => { const M = window.__M; M.faePress(); M.faeRelease(false); });
      await sleep(1600);
      const r = await page.evaluate(() => { const M = window.__M, L = M.FA.loop; return { loop: !!L, lanes: L ? L.lanes.map((x) => x.k + '<-' + x.src + ' peak ' + Math.max(...Array.from(x.v).map(Math.abs)).toFixed(3)) : [], touches: M.touches.size, voices: [...M.A.voices].filter((v) => v.alive && !v.released).length, st: M.faeState(), tag: document.getElementById('faeTag').textContent, hoeheSrc: [...M.MOD.t.hoehe.s.keys()] }; });
      const t = await toastOf(page);
      say('B', 'field melody, finger drift ' + drift + ' px: loop=' + r.loop + ' lanes=[' + r.lanes.join('; ') + '] state=' + r.st + ' tag="' + r.tag + '" toast="' + t + '" | held touches now ' + r.touches + ', sounding voices ' + r.voices + ' -> the notes are not repeated; Höhe sources: ' + r.hoeheSrc.join(','));
      await H.close();
    }
  }

  // ---- C: invisible bar grid with the Puls off – a 1.6 s gesture across a bar line is cut, the seam jumps
  if (run('C')) {
    const { page } = await H.open({});
    await page.evaluate(() => { const M = window.__M; M.FA.p.len = 1; M.FA.p.fade = 1; });
    const g = await page.evaluate(() => {
      const M = window.__M, now = M.A.ctx.currentTime, b = M.faeB(now), E = M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4 + 1e-9) + 4, tE = M.faeT(E);
      return { now, E, tE, bpm: M.FA.bpm, ph: M.FA.ph, puls: M.SEQ.on, barSec: 240 / M.FA.bpm };
    });
    // the swell starts 1.0 s before the bar line (in heard time ≈ audio time minus output latency: ignore, it's ms)
    const ts = g.tE - 1.0;
    await page.evaluate((ts) => window.__drive('map:test:1', 'flt', '(t>' + ts + '&&t<' + (ts + 1.6) + ')?0.8*Math.sin(Math.PI*(t-' + ts + ')/1.6):0'), ts);
    await page.waitForFunction((t) => window.__M.A.ctx.currentTime > t, ts + 1.6 + 0.3, { timeout: 15000 });
    await page.evaluate(() => { const M = window.__M; M.faePress(); M.faeRelease(false); });
    await sleep(1200);
    const r = await page.evaluate(() => { const M = window.__M, L = M.FA.loop; if (!L) return null; const v = L.lanes[0].v; let mx = 0; for (const x of v) mx = Math.max(mx, Math.abs(x)); return { n: v.length, first: v[0], last: v[v.length - 1], peak: mx, aBeat: L.a / 48 }; });
    say('C', 'Puls off=' + !g.puls + ', the Fährte\'s own bars at ' + g.bpm + ' BPM (bar = ' + g.barSec.toFixed(2) + ' s, nothing shows where they are); a 1.6 s swell (peak 0.8) begun 1.0 s before an unseen bar line, Fährte tapped 0.3 s after it ended');
    say('C', r ? 'the loop: ' + r.n + ' steps, first value ' + r.first.toFixed(3) + ', last value ' + r.last.toFixed(3) + ' (peak ' + r.peak.toFixed(3) + ') -> every pass the filter jumps by ' + Math.round(Math.abs(r.last - r.first) * 2400) + ' cents at the seam; the swell\'s fall (0.6 s after the bar line) is lost' : 'no loop: ' + (await toastOf(page)));
    await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    await H.close();
  }

  // ---- D: phantom jump – a parameter lane keeps the value from before a preset load (loadValues bypasses setParam)
  if (run('D')) {
    const { page } = await H.open({});
    const r0 = await page.evaluate(async () => {
      const M = window.__M; M.FA.p.len = 2; M.FA.p.fade = 1;
      M.setParam('flt.freq', 700);   // the knob touched once (a lane for flt.freq exists from now on)
      await window.__sleep(300);
      const p = M.PRESETS.find((q) => q.v && q.v['flt.freq'] && q.v['flt.freq'] / 700 > 4.5) || M.PRESETS.find((q) => q.v && q.v['flt.freq'] > 3000);
      M.loadPreset(p);
      await window.__sleep(400);
      const f0 = M.P['flt.freq'];
      M.setParam('flt.freq', Math.round(f0 * 1.03));   // a 3 % nudge of the knob
      return { preset: p.name, f0, f1: M.P['flt.freq'] };
    });
    await pastBar(page, 0.2);
    await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 2); });
    await sleep(900);
    const r = await page.evaluate(async () => {
      const M = window.__M, L = M.FA.loop; if (!L) return null;
      const ln = L.lanes.find((x) => x.src === 'p:flt.freq'); if (!ln) return { lanes: L.lanes.map((x) => x.src) };
      let mn = 0; for (const x of ln.v) mn = Math.min(mn, x);
      // what the loop does to the filter during the pass (sampled over 6 s)
      let lo = 0; const t0 = performance.now();
      while (performance.now() - t0 < 6000) { lo = Math.min(lo, M.modVal('flt')); await window.__sleep(20); }
      return { min: mn, played: lo };
    });
    say('D', 'filter knob set to 700 Hz, preset "' + r0.preset + '" loaded (Filter ' + r0.f0 + ' Hz), knob nudged by 3 % to ' + r0.f1 + ' Hz, Fährte tapped (2 bars)');
    say('D', r && r.min != null ? 'the loop\'s Filter lane holds the OLD value until the nudge: deepest step ' + r.min.toFixed(2) + ' (= ' + Math.round(r.min * 2400) + ' cents), the Formen sum clamps it: the loop pulls the filter down by ' + Math.round(-r.played * 2400) + ' cents (' + (-r.played * 2).toFixed(1) + ' octaves) for part of each pass – what was heard was a 3 % nudge' : JSON.stringify(r));
    await H.close();
  }

  // ---- E: what survives Stille, a built-in preset and the field going quiet
  if (run('E')) {
    const { page } = await H.open({});
    await page.evaluate(() => { const M = window.__M; M.FA.p.len = 1; M.FA.p.fade = 1; window.__drive('map:test:1', 'flt', '0.6*Math.sin(2*Math.PI*t/0.9)'); });
    await pastBar(page, 0.3); await pastBar(page, 0.3);
    await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
    await sleep(800);
    await page.evaluate(() => window.__undrive('map:test:1', 'flt'));
    const a = await page.evaluate(async () => { const M = window.__M; M.panic(); await window.__sleep(600); let mx = 0; for (let i = 0; i < 50; i++) { mx = Math.max(mx, Math.abs(M.modVal('flt'))); await window.__sleep(20); } return { loop: !!M.FA.loop, mx }; });
    say('E', 'after "Stille" (panic): loop still running=' + a.loop + ', it still moves the Filter (|deflection| up to ' + Math.round(a.mx * 2400) + ' cents)');
    const b = await page.evaluate(async () => { const M = window.__M, p = M.PRESETS.find((q) => !(q.fmt >= 2)); M.loadPreset(p); await window.__sleep(600); let mx = 0; for (let i = 0; i < 50; i++) { mx = Math.max(mx, Math.abs(M.modVal('flt'))); await window.__sleep(20); } return { name: p.name, loop: !!M.FA.loop, mx, tag: document.getElementById('faeTag').textContent }; });
    say('E', 'after loading the built-in preset "' + b.name + '": loop still running=' + b.loop + ', it deflects the NEW sound\'s Filter by up to ' + Math.round(b.mx * 2400) + ' cents; the only sign on the field: "' + b.tag + '"');
    const c = await page.evaluate(async () => { const M = window.__M; M.FA.p.fade = 0.85; M.faeFade(0.85); return null; });
    await H.close();
  }

  // ---- F: hold = arm a fixed-length recording from the next (unseen) bar line; releasing does not stop it
  if (run('F')) {
    const { page } = await H.open({});
    await page.evaluate(() => { const M = window.__M; M.FA.p.len = 2; });
    const r = await page.evaluate(async () => {
      const M = window.__M;
      M.faePress(); await window.__sleep(650); M.faeRelease(false);
      const w = M.FA.win, now = M.A.ctx.currentTime, st = M.faeState();
      return { st, waitS: M.faeT(w.a / 48) - now, recS: M.faeT(w.b / 48) - M.faeT(w.a / 48), bpm: M.FA.bpm };
    });
    say('F', 'held 650 ms and let go: state "' + r.st + '" (blinking red), recording begins in ' + r.waitS.toFixed(2) + ' s (anywhere from 0 to one bar = ' + (240 / r.bpm).toFixed(2) + ' s), then runs ' + r.recS.toFixed(2) + ' s whatever the hand does');
    // two quick taps to "cancel" while it is armed, with a loop running: the second tap clears the loop too
    const r2 = await page.evaluate(async () => {
      const M = window.__M;
      M.faeClear(false); M.FA.p.len = 1;
      M.modSet('map:test:2', 'pan', 0.5); await window.__sleep(100);
      // a loop from a constant Panorama deflection (not interesting, just a loop)
      const b = M.faeHeard(performance.now()); const E = M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4 + 1e-9) + 0.3;
      while (M.faeHeard(performance.now()) < E + 4) await window.__sleep(20);
      M.faeTake(M.faeHeard(performance.now()), 'tap', 1); await window.__sleep(600);
      M.modSet('map:test:2', 'pan', 0);
      const had = !!M.FA.loop;
      M.faePress(); await window.__sleep(500); M.faeRelease(false);   // hold: one pass over it is armed
      const armed = M.faeState();
      M.faePress(); M.faeRelease(false); await window.__sleep(150); M.faePress(); M.faeRelease(false);   // tap tap
      await window.__sleep(600);
      return { had, armed, loopAfter: !!M.FA.loop, toast: document.getElementById('toastMsg').textContent };
    });
    say('F', 'loop running=' + r2.had + ', hold -> "' + r2.armed + '", then two quick taps to cancel: loop still there=' + r2.loopAfter + ' (toast "' + r2.toast + '")');
    await H.close();
  }

  // ---- G: a knob sweep wider than two octaves comes back clipped (Formen's ±1 = ±2400 cents)
  if (run('G')) {
    const { page } = await H.open({});
    await page.evaluate(() => { const M = window.__M; M.FA.p.len = 1; M.FA.p.fade = 1; M.setParam('flt.freq', 8000); });
    await pastBar(page, 0.05);
    await page.evaluate(async () => {   // one bar: 8000 → 150 Hz and back, as a hand on the knob (every 20 ms)
      const M = window.__M, T = 240 / M.FA.bpm * 1000 * 0.9, t0 = performance.now();
      while (performance.now() - t0 < T) { const x = (performance.now() - t0) / T, o = Math.sin(Math.PI * x); M.setParam('flt.freq', Math.round(8000 * Math.pow(150 / 8000, o))); await window.__sleep(20); }
      M.setParam('flt.freq', 8000);
    });
    await pastBar(page, 0.2);
    await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
    await sleep(900);
    const r = await page.evaluate(async () => { const M = window.__M, L = M.FA.loop; let lo = 0; const t0 = performance.now(); while (performance.now() - t0 < 3500) { lo = Math.min(lo, M.modVal('flt')); await window.__sleep(15); } const ln = L && L.lanes.find((x) => x.src === 'p:flt.freq'); let mn = 0; if (ln) for (const x of ln.v) mn = Math.min(mn, x); return { lane: mn, played: lo }; });
    say('G', 'knob swept 8000 → 150 Hz → 8000 (5.7 octaves): lane depth ' + (r.lane * 2).toFixed(2) + ' octaves, played back ' + (r.played * 2).toFixed(2) + ' octaves (Formen clamps the sum at ±1 = ±2 octaves): the loop reaches ' + Math.round(8000 * Math.pow(2, r.played * 2)) + ' Hz, the hand reached 150 Hz');
    await H.close();
  }

  // ---- H: a pad in toggle mode (CC 127 on one press, 0 on the next) learned as "momentary": every first press is a HOLD
  if (run('H')) {
    const { page } = await H.open({ cfg: { ins: [['p1', 'Pad Box']] } });
    const r = await page.evaluate(async () => {
      const M = window.__M;
      M.MAP.user.push({ dev: 'Pad Box', ch: -1, type: 'cc', num: 50, target: 'fae', mode: 'momentary' }); M.MAP.v = (M.MAP.v || 0) + 1;
      const snd = (v) => window.__send([0xb0, 50, v], 'p1');
      snd(127); await window.__sleep(150);   // a short press on a toggle pad: only "127" is sent
      const st1 = M.faeState(); await window.__sleep(500);
      const st2 = M.faeState();
      snd(0); await window.__sleep(100);     // the next press sends "0"
      return { st1, st2, st3: M.faeState(), win: !!M.FA.win };
    });
    say('H', 'toggle-mode pad on "Fährte": short press -> "' + r.st1 + '", 500 ms later "' + r.st2 + '" (a hold: recording armed); next press (value 0) -> "' + r.st3 + '"');
    await H.close();
  }

  // ---- I: the default fade, in seconds at the default tempo
  if (run('I')) {
    const { page } = await H.open({});
    const r = await page.evaluate(() => { const M = window.__M; return { fade: M.FA.p.fade, len: M.FA.p.len, bpm: M.FA.bpm || M.P['seq.bpm'] }; });
    const pass = (r.len * 4 * 60) / r.bpm, rows = [1, 2, 4, 8].map((k) => k + ' passes (' + (k * pass).toFixed(0) + ' s): ' + Math.round(Math.pow(r.fade, k) * 100) + ' %');
    const gone = Math.ceil(Math.log(0.04) / Math.log(r.fade));
    say('I', 'defaults: Verblassen ×' + r.fade + ', ' + r.len + ' bars at ' + r.bpm + ' BPM (a pass = ' + pass.toFixed(1) + ' s): ' + rows.join(', ') + '; removed after ' + gone + ' passes (' + Math.round(gone * pass) + ' s)');
    await H.close();
  }
  await H.close();
})().catch((e) => { console.log('ERR ' + e.stack); process.exitCode = 1; return H.close(); });
