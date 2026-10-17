// Final QA soak (Gestik): a phone (390×844, Android, sensor at 60 Hz through real DeviceMotionEvents) played for 3
// minutes – tilting while notes sound, shaking (Ladung), face down and up again (Schlafen), a stretch replayed through
// the app's own trace player (GK.play) – while a fake KORG microKEY over USB plays chords, joystick bends and the
// sustain pedal, fingers slide on the field, the Puls runs (stopped and restarted once), the Fährte takes the last bars
// as a loop three times (and is cleared once by a double tap), and the Sporenregen rains for a minute. Meanwhile the
// panels and the mixer's views are switched and the Gestik card's Messen fold opened.
// Checks: no console errors; no stuck note (a finger / MIDI note alive > 8 s while its generator holds ≤ 4 s); at the
// end every note gone and the voices die out; heap after forced GC does not grow; DOM nodes and listeners stable; the
// patch never written (values, myzel.patch.v1 / myzel.user.v1 / myzel.mixsnap.v1, the preset stays unmarked).
//   node t-gq-soak.js [seconds=180]      needs slot 'gq': sh ../v2/mk.sh /home/user/4claude/myzel gq
const { open, ok, close, gestikOn } = require('./gk-h');
const URL = process.env.GQ || 'http://127.0.0.1:8790/gq-inst/index.html';
const SECS = +(process.argv[2] || 180);
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
(async () => {
  const { page, errors, ctx } = await open({ url: URL, vp: { width: 390, height: 844, touch: true, mobile: true, ua: DROID_UA }, cfg: { perm: 'granted', seed: 4711, ins: [['k1', 'microKEY2-37 KEYBOARD']] } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const mem = async () => {
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(200);
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(100);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    return { heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, lis: m.JSEventListeners };
  };
  // probes: localStorage writes per key, the patch (as review/ir-h.js)
  await page.evaluate(() => {
    const M = window.__M, W = (window.__ir = { ls: {} });
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { W.ls[k] = (W.ls[k] || 0) + 1; return si.call(this, k, v); };
    W.patch = () => { const o = {}; for (const id in M.PD) if (!M.PD[id].dev && !M.PD[id].rec) o[id] = M.P[id]; return o; };
    W.diff = (a, b) => Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => k + ': ' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k]));
  });
  ok(await page.evaluate(() => [...window.__M.MIDI.ports.values()].some((p) => /microKEY/.test(p.name || p))), 'the microKEY plays: ' + await page.evaluate(() => JSON.stringify([...window.__M.MIDI.ports.values()].map((p) => p.name || p))));
  await gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  // a preset loaded first: its marker would go ("Preset geändert") if anything wrote the patch
  await page.evaluate(() => { const M = window.__M; M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum') || M.PRESETS[1]); });
  await page.waitForTimeout(1500);
  const on = await page.evaluate(() => ({ on: window.__M.GK.on, live: window.__M.GK.live, mode: window.__M.GK.mode, schlaf: window.__M.GK.p.schlaf, lad: window.__M.GK.p.lad }));
  ok(on.on && on.live, 'Gestik on with a live sensor ' + JSON.stringify(on));
  // warm-up: every panel and both mixer views built once (first visits build DOM that stays – not growth)
  for (const k of ['klang', 'fx', 'puls', 'mix', 'rec', 'presets', 'dev']) {
    await page.evaluate((k) => { if (window.__M.UI.panel !== k) window.__M.openPanel(k); }, k); await page.waitForTimeout(600);
    if (k === 'mix') for (const b of await page.$$('.mx-vsw button')) { await b.click().catch(() => {}); await page.waitForTimeout(500); }
  }
  await page.evaluate(() => window.__M.closePanel());
  // ---------- the generators (in the page, so the rates are real) ----------
  await page.evaluate((SECS) => {
    const M = window.__M, F = window.__midi, S = window.__S;
    let r = 9001; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const G = (window.__G = { on: true, t0: performance.now(), cnt: { chord: 0, note: 0, touch: 0, two: 0, shake: 0, face: 0, fae: 0, faeClr: 0, play: 0, slept: 0, loops: 0, rgOn: 0, strikes0: M.RG.n }, stuck: [], first: new WeakMap(), maxHold: 0, held: new Map(), log: [], face: false, playing: false });
    const el = () => (performance.now() - G.t0) / 1000;
    const mk = (b) => { const i = F.inputs.get('k1'); if (i && i.onmidimessage) i.onmidimessage({ data: new Uint8Array(b), timeStamp: performance.now() }); };
    // ---- the microKEY: chords, single notes, joystick X (bend) and ±Y (CC 1/2), the sustain pedal ----
    const note = (n, vel, dur) => {
      G.held.set(n, (G.held.get(n) || 0) + 1); mk([0x90, n, vel]);
      setTimeout(() => { const c = (G.held.get(n) || 1) - 1; if (c) G.held.set(n, c); else G.held.delete(n); mk(rnd() < 0.5 ? [0x80, n, 64] : [0x90, n, 0]); }, dur);
    };
    let sus = false, susT = 0, bend = 8192, joyY = 0;
    G.iv1 = setInterval(() => {
      if (!G.on) return;
      const p = rnd(), t = performance.now();
      if (p < 0.02) { const root = ri(48, 64), d = rnd() < 0.5 ? [0, 4, 7] : [0, 3, 7, 10], dur = ri(300, 1500); for (const x of d) note(root + x, ri(60, 115), dur); G.cnt.chord++; }
      else if (p < 0.035) { note(ri(55, 79), ri(30, 127), ri(80, 900)); G.cnt.note++; }
      else if (p < 0.06) { bend = Math.max(0, Math.min(16383, bend + ri(-1500, 1500))); if (rnd() < 0.2) bend = 8192; mk([0xe0, bend & 127, bend >> 7]); }
      else if (p < 0.075) { joyY = Math.max(-127, Math.min(127, joyY + ri(-20, 20))); if (rnd() < 0.2) joyY = 0; if (joyY >= 0) { mk([0xb0, 1, joyY]); mk([0xb0, 2, 0]); } else { mk([0xb0, 2, -joyY]); mk([0xb0, 1, 0]); } }
      if (!sus && rnd() < 0.002) { sus = true; susT = t + ri(500, 2500); mk([0xb0, 64, 127]); }
      if (sus && t > susT) { sus = false; mk([0xb0, 64, 0]); }
      G.sus = sus;
    }, 20);
    // ---- fingers on the field: real PointerEvents on the canvas (one, sometimes two), sliding; none while face down ----
    const cv = document.getElementById('cvFx');
    let pid = 500;
    const finger = (dur) => {
      const r0 = cv.getBoundingClientRect(), id = ++pid;
      let x = r0.left + r0.width * (0.08 + 0.84 * rnd()), y = r0.top + r0.height * (0.15 + 0.7 * rnd());
      const ev = (type) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id % 2 === 0, clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      ev('pointerdown'); G.cnt.touch++;
      const steps = ri(3, 10), dx = (rnd() - 0.5) * 60, dy = (rnd() - 0.5) * 80;
      for (let i = 1; i <= steps; i++) setTimeout(() => { x += dx / steps; y += dy / steps; ev('pointermove'); }, (dur * i) / (steps + 1));
      setTimeout(() => ev('pointerup'), dur);
    };
    const nextFinger = () => {
      if (!G.on) return;
      if (!G.face) { finger(ri(250, 1500)); if (rnd() < 0.3) { finger(ri(250, 1200)); G.cnt.two++; } }
      G.tf = setTimeout(nextFinger, ri(500, 1600));
    };
    G.tf = setTimeout(nextFinger, 300);
    // ---- the hand: playing tilts with tremor, a shake every ~25 s, face down every ~45 s, rain wants it flatter ----
    let shakeAt = 12, faceAt = 35, faceEnd = 0;
    G.iv2 = setInterval(() => {
      if (!G.on || G.playing) return;
      const t = el(), base = M.GK.p.neigen === 'regen' ? 15 : 45;
      if (t >= faceAt && !G.face) { G.face = true; faceEnd = t + 5.6; G.cnt.face++; G.log.push('face down ' + t.toFixed(1)); }
      if (G.face) {
        const u = t - (faceEnd - 5.6), b = u < 0.8 ? base + (180 - base) * (u / 0.8) : t < faceEnd - 0.8 ? 180 : 180 - (180 - base) * ((u - 4.8) / 0.8);
        S.p = { beta: Math.max(base, Math.min(180, b)), roll: 0 };
        S.tremor = u > 0.9 && u < 4.8 ? 0.05 : 3;   // laid on its face on the table: still (held face down in the hand while keys play, a key's zero mid-turn keeps it awake – reported)
        if (u > 2.5 && M.SLP.on && !G.sleptNow) { G.sleptNow = true; G.cnt.slept++; }
        if (t >= faceEnd) { G.face = false; G.sleptNow = false; S.p = { beta: base, roll: 0 }; S.tremor = 3; faceAt = t + 40 + 10 * rnd(); }
        return;
      }
      if (t >= shakeAt && t < shakeAt + 1.6) { const k = Math.sin(2 * Math.PI * 5 * (t - shakeAt)); S.p = { beta: base, roll: 6 * k, lin: [16 * k, 3.2 * k, 0] }; if (!G.shaking) { G.shaking = true; G.cnt.shake++; } return; }
      if (G.shaking) { G.shaking = false; shakeAt = t + 22 + 6 * rnd(); }
      else if (t >= shakeAt + 1.6) shakeAt = t + 3;   // (it fell into a face-down stretch: soon after)
      S.p = { beta: base + 12 * Math.sin(t * 0.7) + 4 * Math.sin(t * 2.3), roll: 18 * Math.sin(t * 0.45) + (rnd() < 0.02 ? 10 : 0) };
    }, 30);
    // ---- the timeline: Puls, Fährte, Sporenregen, the trace player ----
    const at = (s, fn) => setTimeout(() => { if (G.on) { try { fn(); } catch (e) { console.error('soak step ' + s + ': ' + e.message); } } }, s * 1000);
    at(1, () => M.seqStart());
    const tapFae = () => { M.faePress(); setTimeout(() => M.faeRelease(false), 60); G.cnt.fae++; };
    for (const s of [0.14, 0.42, 0.78].map((k) => Math.round(k * SECS))) at(s, tapFae);
    at(Math.round(0.6 * SECS), () => { M.faePress(); setTimeout(() => M.faeRelease(false), 50); setTimeout(() => { M.faePress(); setTimeout(() => M.faeRelease(false), 50); }, 180); G.cnt.faeClr++; });   // double tap: cleared
    at(Math.round(0.31 * SECS), () => { M.gkSet('neigen', 'regen'); M.gkCardSync(); G.cnt.rgOn++; G.log.push('regen on'); });
    at(Math.round(0.65 * SECS), () => { M.gkSet('neigen', 'anl'); M.gkCardSync(); G.log.push('regen off'); });
    at(Math.round(0.5 * SECS), () => { M.seqStop(); G.log.push('puls stop'); });
    at(Math.round(0.55 * SECS), () => { M.seqStart(); G.log.push('puls start'); });
    // the trace player: 6 s of tilts and a shake, generated as the recogniser's test traces are (gk-lib), sensor paused
    at(Math.round(0.85 * SECS), () => {
      G.playing = true; window.__sensor(false);
      const L = [];
      for (let i = 0; i <= 360; i++) {
        const t = i / 60, b = (45 + 15 * Math.sin(t * 1.3)) * Math.PI / 180, c = (25 * Math.sin(t * 0.9)) * Math.PI / 180;
        const sh = t > 3 && t < 4.5 ? Math.sin(2 * Math.PI * 5 * (t - 3)) : 0, lin = [16 * sh, 3.2 * sh, 0], n = () => (rnd() - 0.5) * 0.04;
        L.push({ t: t * 1000, g: [-9.81 * Math.sin(c) + lin[0] + n(), 9.81 * Math.sin(b) * Math.cos(c) + lin[1] + n(), 9.81 * Math.cos(b) * Math.cos(c) + n()], a: [lin[0] + n(), lin[1] + n(), n()], r: [n() * 50, n() * 50 + 10 * Math.cos(t * 0.9), n() * 50] });
      }
      M.GK.play(L).then((n) => { G.cnt.play = n; G.playing = false; window.__S.p = { beta: 45, roll: 0 }; window.__sensor(true, null, 3); });
    });
    // ---- the watch: a finger (the same touch object) alive longer than any generator holds it ----
    G.iv5 = setInterval(() => {
      const t = performance.now();
      for (const tt of M.touches.values()) {
        if (!G.first.has(tt)) G.first.set(tt, t);
        const age = t - G.first.get(tt);
        if (age > G.maxHold) G.maxHold = age;
        if (age > 8000 && !tt.__rep && !tt.carry) { tt.__rep = 1; G.stuck.push(String(tt.id) + ' ' + Math.round(age) + 'ms'); }
      }
      if (M.FA.loop && !G.hadLoop) { G.hadLoop = true; G.cnt.loops++; }
      if (!M.FA.loop) G.hadLoop = false;
    }, 250);
    G.stop = () => { G.on = false; for (const k of ['iv1', 'iv2', 'iv5']) clearInterval(G[k]); clearTimeout(G.tf); };
  }, SECS);
  const st = () => page.evaluate(() => {
    const M = window.__M, G = window.__G;
    return { touches: M.touches.size, notes: M.MIDI.notes.size, voices: M.A.voices.size, seq: M.SEQ.on, slp: M.SLP.on, rg: M.RG.on, keime: M.RG.k.length, strikes: M.RG.n - G.cnt.strikes0, loop: !!M.FA.loop, mode: M.GK.mode, lad: +M.GK.raw.ladung.toFixed(2), stuck: G.stuck.length, maxHold: Math.round(G.maxHold), panel: M.UI.panel };
  });
  // ---------- the person meanwhile: panels, the mixer's views, the Gestik card ----------
  let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (a) => a[Math.floor(rnd() * a.length)];
  const PAN = ['klang', 'fx', 'puls', 'mix', 'rec', 'presets', 'dev', 'mix', 'dev'];
  const act = {
    panel: async () => { const k = pick(PAN); await page.evaluate((k) => { if (window.__M.UI.panel !== k) window.__M.openPanel(k); }, k); },
    tab: async () => { const k = pick(PAN); const e = await page.$('#tab-' + k); if (e && await e.isVisible()) await e.click(); },
    mixview: async () => { await page.evaluate(() => { if (window.__M.UI.panel !== 'mix') window.__M.openPanel('mix'); }); await page.waitForTimeout(400); const b = await page.$$('.mx-vsw button'); if (b.length) await pick(b).click().catch(() => {}); },
    card: async () => {
      await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); }); await page.waitForTimeout(300);
      await page.evaluate(() => { const C = window.__M.GK.card; if (!C || !C.el.isConnected) return; C.el.querySelector('.gk-mehr').open = true; C.messD.open = !C.messD.open; C.el.scrollIntoView({ block: 'start' }); window.__M.gkCardSync(); });
    },
    devscroll: async () => { await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); const sb = document.querySelector('#sheetBody'); if (sb) sb.scrollTop = Math.random() * sb.scrollHeight; }); },
    close: async () => { await page.evaluate(() => { if (window.__M.UI.panel) window.__M.closePanel(); }); },
    close2: async () => { await page.evaluate(() => { if (window.__M.UI.panel) window.__M.closePanel(); }); },
  };
  const names = Object.keys(act), cnt = {}, fails = [], snaps = [];
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ patch: window.__ir.patch(), preset: window.__M.UI.preset, dirty: !!document.querySelector('.preset-dirty, [data-dirty="1"]') }));
  await page.evaluate(() => { window.__ir.ls = {}; });
  const t0 = Date.now(); let next = 30;
  snaps.push({ t: 0, ...(await mem()), ...(await st()) });
  console.log('t=0', JSON.stringify(snaps[0]));
  while ((Date.now() - t0) / 1000 < SECS) {
    const a = pick(names); cnt[a] = (cnt[a] || 0) + 1;
    try { await act[a](); } catch (e) { fails.push(a + ': ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(600 + rnd() * 1400);
    if ((Date.now() - t0) / 1000 >= next) {
      next += 30;
      const sn = { t: Math.round((Date.now() - t0) / 1000), ...(await mem()), ...(await st()), err: errors.length };
      snaps.push(sn); console.log('t=' + sn.t, JSON.stringify(sn));
    }
  }
  // ---------- the end: the patch as it was, then every key and finger lifted ----------
  const mid = await page.evaluate((p) => ({ diff: window.__ir.diff(p, window.__ir.patch()), ls: Object.assign({}, window.__ir.ls), preset: window.__M.UI.preset, G: window.__G.cnt, log: window.__G.log }), before.patch);
  const end = await page.evaluate(async () => {
    const G = window.__G, M = window.__M, F = window.__midi, mk = (b) => F.inputs.get('k1').onmidimessage({ data: new Uint8Array(b), timeStamp: performance.now() });
    G.stop();
    await window.__sleep(1700);   // the generators' pending note-offs and finger lifts go first
    for (const [n, c] of G.held) for (let i = 0; i < c; i++) mk([0x80, n, 64]);
    mk([0xb0, 64, 0]); mk([0xe0, 0, 64]); mk([0xb0, 1, 0]); mk([0xb0, 2, 0]);
    window.__S.p = { beta: 45, roll: 0 };
    await window.__sleep(1500);
    return { notes: M.MIDI.notes.size, left: [...M.MIDI.notes.keys()], touches: [...M.touches.keys()].map(String), stuck: G.stuck, maxHold: Math.round(G.maxHold), slp: M.SLP.on, loop: !!M.FA.loop };
  });
  // the Puls, the rain, the loop and Gestik itself stopped: the voices die out, the mod layer is empty
  const fin0 = await page.evaluate(async () => {
    const M = window.__M;
    if (M.SEQ.on) M.seqStop();
    M.faeClear(false);
    M.gkDisable(); window.__sensor(false);
    if (M.A.frozen) M.setFreeze(false);
    await window.__sleep(6000);
    const left = {}; for (const k in M.MOD.t) if (M.MOD.t[k].s.size) left[k] = [...M.MOD.t[k].s.keys()];
    return { voices: M.A.voices.size, touches: M.touches.size, mod: left, rg: M.RG.on, slp: M.SLP.on, frozen: M.A.frozen };
  });
  const fin = await mem(); snaps.push({ t: 'end', ...fin });
  console.log('counts', JSON.stringify(mid.G), 'log', JSON.stringify(mid.log));
  console.log('end', JSON.stringify(end), JSON.stringify(fin0));
  console.log('actions', JSON.stringify(cnt), 'failures', fails.length, JSON.stringify(fails.slice(0, 6)));
  console.log('mem', JSON.stringify(snaps.map((x) => [x.t, x.heapMB, x.nodes, x.lis])));
  console.log('storage writes during the soak', JSON.stringify(mid.ls));
  // ---------- verdict ----------
  ok(!errors.length, 'no console errors (' + errors.length + ')' + (errors.length ? ' ' + errors.slice(0, 5).join(' | ') : ''));
  ok(mid.G.chord > 20 && mid.G.touch > 40 && mid.G.shake >= 2 && mid.G.face >= 2 && mid.G.fae >= 3 && mid.G.play > 300 && mid.G.rgOn === 1, 'everything was played: ' + JSON.stringify(mid.G));
  ok(mid.G.slept === mid.G.face, 'face down on the table put Myzel to sleep every time (' + mid.G.slept + ' of ' + mid.G.face + ' times)');
  ok(mid.G.loops >= 2, 'the Fährte took the last bars as a loop (' + mid.G.loops + ' loops started)');
  ok(Math.max(...snaps.map((x) => x.strikes || 0)) >= 10, 'the Sporenregen struck (Kalimbatraum\'s recipe, the Puls running): ' + JSON.stringify(snaps.map((x) => x.strikes)));
  ok(!end.stuck.length, 'no stuck note during the run (longest ' + end.maxHold + ' ms)' + (end.stuck.length ? ' ' + end.stuck.slice(0, 6).join(', ') : ''));
  ok(end.notes === 0 && !end.touches.length, 'every note ended at the end ' + JSON.stringify({ left: end.left, touches: end.touches }));
  ok(fin0.voices <= 4 && !fin0.touches, 'voices die out once all is stopped (' + fin0.voices + ' left)');
  ok(!Object.keys(fin0.mod).length && !fin0.rg && !fin0.slp, 'Gestik off and the loop cleared: the mod layer is empty, no rain, awake ' + JSON.stringify(fin0));
  ok(mid.diff.length === 0, 'the patch was never written' + (mid.diff.length ? ' – changed: ' + mid.diff.slice(0, 8).join('; ') : ''));
  const bad = ['myzel.patch.v1', 'myzel.user.v1', 'myzel.mixsnap.v1'].filter((k) => mid.ls[k]);
  ok(!bad.length, 'no write of the patch, the user presets or the scenes: ' + JSON.stringify(mid.ls));
  ok(before.preset && mid.preset === before.preset, 'the preset stays marked as loaded (no "Preset geändert"): ' + before.preset + ' → ' + mid.preset);
  const w = snaps.filter((x) => typeof x.t === 'number' && x.t >= 30), h0 = w.length ? w[0].heapMB : snaps[0].heapMB;
  ok(fin.heapMB - h0 < 3, 'heap after GC stable: ' + h0 + ' MB at 30 s → ' + fin.heapMB + ' MB at the end');
  ok(fin.nodes - (w.length ? w[0].nodes : snaps[0].nodes) < 3000 && fin.lis - (w.length ? w[0].lis : snaps[0].lis) < 300, 'DOM nodes and listeners stable ' + JSON.stringify(snaps.map((x) => [x.nodes, x.lis])));
  ok(fails.length === 0, 'UI actions all ran (' + fails.length + ' failed)');
  await close();
})().catch(async (e) => { console.log('FAIL soak crashed: ' + (e && e.stack || e)); process.exitCode = 1; await close(); process.exit(1); });
