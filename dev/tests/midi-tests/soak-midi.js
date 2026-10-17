// Final QA soak: a fake KORG nanoKEY Studio (Web MIDI, USB) and a fake microKEY Air (Web Bluetooth, real BLE-MIDI
// packets) stream notes, chords, arpeggio bursts, knobs, X-Y pad, Touch Scale, pads, wheels, pedals, active sensing and
// MIDI clock with Start/Stop, while the panels and the mixer are switched. Twice the Bluetooth link drops and comes back.
// Checks: no console errors, no stuck notes (a MIDI finger alive > 8 s while its generator holds ≤ 3 s), all MIDI notes
// gone at the end, heap after forced GC does not grow, DOM nodes / listeners stable, clock followed and sent.
// node soak-midi.js [seconds=180] [p390|d1280]     needs slot 'mq': sh ../v2/mk.sh /home/user/4claude/myzel mq
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mq-inst/index.html';
const { open, close, pair, ok } = require('./hb');
const SECS = +(process.argv[2] || 180), SIZE = process.argv[3] || 'd1280';
const VP = { p390: { vp: [390, 844], touch: true, ua: 'android' }, d1280: { vp: [1280, 800], ua: 'windows' } };
const NKS = [['k1', 'nanoKEY Studio KEYBOARD/CTRL']], NKO = [['o1', 'nanoKEY Studio KEYBOARD/CTRL']];
(async () => {
  const { page, errors, ctx } = await open(Object.assign({ bt: {}, cfg: { ins: NKS, outs: NKO } }, VP[SIZE]));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const mem = async () => {
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(200);
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(100);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    return { heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, lis: m.JSEventListeners };
  };
  // SNAP=dir: heap snapshots at 30 s and at the end, for: node heapcmp.js dir/a.heapsnapshot dir/b.heapsnapshot
  const snapTo = async (file) => {
    if (!process.env.SNAP) return;
    const chunks = [], on = (e) => chunks.push(e.chunk);
    cdp.on('HeapProfiler.addHeapSnapshotChunk', on);
    await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
    cdp.off('HeapProfiler.addHeapSnapshotChunk', on);
    require('fs').writeFileSync(process.env.SNAP + '/' + file, chunks.join(''));
  };
  await page.evaluate(() => window.__M.midiInit(true));
  await page.waitForTimeout(200);
  await pair(page, { id: 'air', name: 'microKEY Air-25' });
  ok(await page.evaluate(() => window.__M.MIDI.ports.size === 2), 'both keyboards play: ' + await page.evaluate(() => JSON.stringify([...window.__M.MIDI.ports.values()])));
  // ---------- the generators (in the page, so the rates are real) ----------
  await page.evaluate(() => {
    const M = window.__M, F = window.__midi;
    let r = 4242; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const nk = (b, ts) => { const i = F.inputs.get('k1'); if (i && i.onmidimessage) i.onmidimessage({ data: new Uint8Array(b), timeStamp: ts == null ? performance.now() : ts }); };
    const G = (window.__G = { on: true, nkHeld: new Map(), airHeld: new Map(), airQ: [], cnt: { nk: 0, air: 0, pk: 0, clk: 0, drop: 0 }, stuck: [], first: new WeakMap(), maxHold: 0 });
    const now = () => performance.now();
    // nanoKEY Studio: keys, chord pad, arp bursts, knobs, X-Y, Touch Scale, pads, wheels, sustain
    const nkNote = (n, vel, dur, ch = 0) => {
      const k = ch + ':' + n, c = (G.nkHeld.get(k) || 0) + 1;   // a note held twice (keys + arp) gets two offs
      G.nkHeld.set(k, c); nk([0x90 | ch, n, vel]); G.cnt.nk++;
      setTimeout(() => { const c2 = (G.nkHeld.get(k) || 1) - 1; if (c2) G.nkHeld.set(k, c2); else G.nkHeld.delete(k); nk(rnd() < 0.5 ? [0x80 | ch, n, 64] : [0x90 | ch, n, 0]); }, dur);
    };
    let sus = false, susT = 0, xy = false, xyT = 0, xyX = 64, xyY = 64, bend = 8192, mod = 0, knobs = [64, 64, 64, 64, 64, 64, 64, 64];
    G.iv1 = setInterval(() => {
      if (!G.on) return;
      const t = now(), p = rnd();
      if (p < 0.10) nkNote(ri(48, 72), ri(20, 127), ri(40, 800));
      else if (p < 0.115) { const root = ri(48, 64); for (const d of [0, 4, 7, 11]) nkNote(root + d, ri(60, 110), ri(300, 900)); }   // chord pad
      else if (p < 0.125) { const root = ri(48, 64); for (let j = 0; j < 8; j++) setTimeout(() => G.on && nkNote(root + [0, 4, 7, 12][j % 4], 100, 90), j * 110); }   // arp burst
      else if (p < 0.135) nkNote([36, 38, 42, 46, 43, 48, 50, 49][ri(0, 7)], ri(40, 127), 120, rnd() < 0.3 ? 9 : 0);   // pads (ch 1 or 10)
      else if (p < 0.30) { const k = ri(0, 7); knobs[k] = Math.max(0, Math.min(127, knobs[k] + ri(-6, 6))); nk([0xb0, 20 + k, knobs[k]]); }   // knobs 1–8
      else if (p < 0.36) { bend = Math.max(0, Math.min(16383, bend + ri(-900, 900))); if (rnd() < 0.1) bend = 8192; nk([0xe0, bend & 127, bend >> 7]); }
      else if (p < 0.40) { mod = Math.max(0, Math.min(127, mod + ri(-8, 8))); nk([0xb0, 1, mod]); }
      else if (p < 0.42) nk([0xb0, 19, ri(0, 127)]);   // Touch Scale Y
      if (!xy && rnd() < 0.004) { xy = true; xyT = t + ri(300, 2000); nk([0xb0, 18, 127]); }
      if (xy) { xyX = Math.max(0, Math.min(127, xyX + ri(-5, 5))); xyY = Math.max(0, Math.min(127, xyY + ri(-5, 5))); nk([0xb0, 16, xyX]); nk([0xb0, 17, xyY]); if (t > xyT) { xy = false; nk([0xb0, 18, 0]); } }
      if (!sus && rnd() < 0.002) { sus = true; susT = t + ri(500, 3000); nk([0xb0, 64, 127]); }
      if (sus && t > susT) { sus = false; nk([0xb0, 64, 0]); }
      G.sus = sus; G.xy = xy;
    }, 12);
    // active sensing every 250 ms (a KORG over USB does not, a DIN interface does – the watch must not misfire)
    G.iv2 = setInterval(() => { if (G.on) nk([0xfe]); }, 250);
    // clock: 24 ppqn at ~121.4 BPM, stamped at the ideal time ± 1 ms; Start/Stop every ~15 s
    G.clk = { next: now() + 20, per: 60000 / (121.4 * 24), run: false, toggle: now() + 3000 };
    G.iv3 = setInterval(() => {
      if (!G.on || !G.clkOn) return;
      const C = G.clk, t = now();
      while (C.next <= t) { nk([0xf8], C.next + (rnd() - 0.5) * 2); C.next += C.per; G.cnt.clk++; }
      if (t > C.toggle) { C.run = !C.run; nk([C.run ? 0xfa : 0xfc]); C.toggle = t + ri(8000, 18000); }
    }, 4);
    // microKEY Air over Bluetooth: messages queue, one packet per connection event (15 ms), timestamp per message
    const air = (m) => G.airQ.push(m);
    const airNote = (n, vel, dur) => {
      const c = (G.airHeld.get(n) || 0) + 1; G.airHeld.set(n, c); air([0x90, n, vel]); G.cnt.air++;
      setTimeout(() => { const c2 = (G.airHeld.get(n) || 1) - 1; if (c2) G.airHeld.set(n, c2); else G.airHeld.delete(n); air([0x80, n, 64]); }, dur);
    };
    let asus = false, asusT = 0, soft = false, softT = 0, ab = 8192, ay = 0;
    G.iv4 = setInterval(() => {
      if (!G.on) return;
      const t = now(), p = rnd();
      if (p < 0.12) airNote(ri(41, 77), ri(30, 127), ri(50, 700));
      else if (p < 0.13) { const root = ri(48, 60); for (let j = 0; j < 6; j++) setTimeout(() => G.on && airNote(root + [0, 3, 7, 12, 7, 3][j], 90, 100), j * 125); }   // its arpeggiator
      else if (p < 0.20) { ab = Math.max(0, Math.min(16383, ab + ri(-1200, 1200))); if (rnd() < 0.15) ab = 8192; air([0xe0, ab & 127, ab >> 7]); }   // joystick X
      else if (p < 0.26) { ay = Math.max(-127, Math.min(127, ay + ri(-12, 12))); if (ay >= 0) { air([0xb0, 1, ay]); air([0xb0, 2, 0]); } else { air([0xb0, 2, -ay]); air([0xb0, 1, 0]); } }   // joystick ±Y
      if (!soft && rnd() < 0.004) { soft = true; softT = t + ri(300, 1500); air([0xb0, 67, 127]); }   // joystick press
      if (soft && t > softT) { soft = false; air([0xb0, 67, 0]); }
      if (!asus && rnd() < 0.003) { asus = true; asusT = t + ri(500, 3000); air([0xb0, 64, 127]); }
      if (asus && t > asusT) { asus = false; air([0xb0, 64, 0]); }
      G.asus = asus;
      // one packet: header + (timestamp + message)… ≤ 20 bytes, the rest waits for the next event
      const d = window.__bt.dev('air');
      if (!d) return;
      while (G.airQ.length) {
        const ms = Math.floor(t) & 8191, pkt = [0x80 | (ms >> 7)];
        while (G.airQ.length && pkt.length + 1 + G.airQ[0].length <= 20) pkt.push(0x80 | (ms & 127), ...G.airQ.shift());
        if (!d.send(pkt)) { G.airQ.length = 0; G.airHeld.clear(); break; }   // link down: the keyboard's notes are gone with it
        G.cnt.pk++;
      }
    }, 15);
    // stuck-note watch: one MIDI finger (the same touch object) alive longer than any generator holds it
    G.iv5 = setInterval(() => {
      const t = now();
      for (const tt of M.touches.values()) {
        if (typeof tt.id !== 'string' || !tt.id.startsWith('midi-')) continue;
        if (!G.first.has(tt)) G.first.set(tt, t);
        const age = t - G.first.get(tt);
        if (age > G.maxHold) G.maxHold = age;
        if (age > 8000 && !tt.__rep) { tt.__rep = 1; G.stuck.push(tt.id + ' ' + Math.round(age) + 'ms'); }
      }
    }, 250);
    G.stop = () => { G.on = false; for (const k of ['iv1', 'iv2', 'iv3', 'iv4', 'iv5']) clearInterval(G[k]); };
  });
  const st = () => page.evaluate(() => {
    const M = window.__M, G = window.__G, mt = [...M.touches.keys()].filter((k) => typeof k === 'string' && k.startsWith('midi-'));
    return { notes: M.MIDI.notes.size, mtouch: mt.length, voices: M.A.voices.size, srcs: M.MIDI.srcs.size, ble: [...M.BLE.devs.values()].map((b) => b.state).join(','), ext: M.SEQ.ext ? +M.SEQ.ext.bpm.toFixed(2) : null, seq: M.SEQ.on, stuck: G.stuck.length, maxHold: Math.round(G.maxHold), cnt: G.cnt, panel: M.UI.panel };
  });
  // ---------- the person meanwhile: panels, the mixer, the monitor ----------
  let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (a) => a[Math.floor(rnd() * a.length)];
  const PAN = ['klang', 'fx', 'puls', 'mix', 'rec', 'presets', 'dev', 'mix', 'dev'];
  const act = {
    panel: async () => { const k = pick(PAN); await page.evaluate((k) => { if (window.__M.UI.panel !== k) window.__M.openPanel(k); }, k); },
    tab: async () => { const k = pick(PAN); const e = await page.$('#tab-' + k); if (e && await e.isVisible()) await e.click(); },
    mixview: async () => { await page.evaluate(() => { if (window.__M.UI.panel !== 'mix') window.__M.openPanel('mix'); }); await page.waitForTimeout(400); const b = await page.$$('.mx-vsw button'); if (b.length) await pick(b).click().catch(() => {}); },
    mixfader: async () => {
      await page.evaluate(() => { if (window.__M.UI.panel !== 'mix') window.__M.openPanel('mix'); }); await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const els = [...document.querySelectorAll('.mx-st .mx-stem, .mxg-f')].filter((e) => e.offsetParent); if (!els.length) return null; const e = els[Math.floor(Math.random() * els.length)]; const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height * 0.5, q.height]; });
      if (!r) return; const [x, y, hh] = r, d = Math.min(60, hh * 0.3) * (rnd() < 0.5 ? -1 : 1);
      await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(x, y + d * i / 10); await page.waitForTimeout(16); } await page.mouse.up();
    },
    monitor: async () => {
      await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); }); await page.waitForTimeout(300);
      await page.evaluate(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Monitor/.test(x.textContent)); if (b) b.click(); const sb = document.querySelector('#sheetBody'); sb.scrollTop = Math.random() * sb.scrollHeight; });
    },
    devscroll: async () => { await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); const sb = document.querySelector('#sheetBody'); sb.scrollTop = Math.random() * sb.scrollHeight; }); },
    close: async () => { await page.evaluate(() => { if (window.__M.UI.panel) window.__M.openPanel(window.__M.UI.panel); }); },
  };
  const names = Object.keys(act), cnt = {}, fails = [], snaps = [];
  // warm-up: every panel and both mixer views built once (first visits build DOM that stays – not growth)
  for (const k of ['klang', 'fx', 'puls', 'mix', 'rec', 'presets', 'dev']) { await page.evaluate((k) => { if (window.__M.UI.panel !== k) window.__M.openPanel(k); }, k); await page.waitForTimeout(600); if (k === 'mix') for (const b of await page.$$('.mx-vsw button')) { await b.click().catch(() => {}); await page.waitForTimeout(500); } }
  await act.monitor(); await page.waitForTimeout(800); await act.monitor();
  await page.waitForTimeout(2000);
  await page.evaluate(() => { window.__G.clkOn = true; });
  const t0 = Date.now(); let next = 30, dropped = { 60: false, 120: false }, clkOut = false, sent0 = 0;
  snaps.push({ t: 0, ...(await mem()), ...(await st()) });
  console.log('t=0', JSON.stringify(snaps[0]));
  while ((Date.now() - t0) / 1000 < SECS) {
    const el = (Date.now() - t0) / 1000;
    // the Bluetooth link drops twice (out of range / power save) and comes back by itself
    for (const k of [60, 120]) if (el >= k && !dropped[k]) { dropped[k] = true; await page.evaluate(() => { window.__G.cnt.drop++; window.__bt.dev('air').drop(); }); console.log('t=' + Math.round(el) + ' BLE drop'); }
    // second half: Myzel sends its clock to the nanoKEY Studio's output (the device's own clock is then not followed)
    if (el >= SECS / 2 && !clkOut) { clkOut = true; sent0 = await page.evaluate(() => { const M = window.__M, o = [...M.MIDI.outs.values()].find((x) => /nanoKEY/.test(x.name)); M.midiSetClockOut(o, true); return window.__midi.outputs.get('o1').sent.length; }); console.log('t=' + Math.round(el) + ' clock out on'); }
    const a = pick(names); cnt[a] = (cnt[a] || 0) + 1;
    try { await act[a](); } catch (e) { fails.push(a + ': ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(700 + rnd() * 1500);
    if ((Date.now() - t0) / 1000 >= next) {
      next += 30;
      const sn = { t: Math.round((Date.now() - t0) / 1000), ...(await mem()), ...(await st()), err: errors.length };
      snaps.push(sn); console.log('t=' + sn.t, JSON.stringify(sn));
      if (sn.t < 45) await snapTo('a.heapsnapshot');
    }
  }
  // ---------- the end: every key lifted, pedals up, transport stopped ----------
  const end = await page.evaluate(async () => {
    const G = window.__G, F = window.__midi, nk = (b) => F.inputs.get('k1').onmidimessage({ data: new Uint8Array(b), timeStamp: performance.now() });
    G.stop();
    await window.__sleep(1300);   // the generators' pending note-offs go first
    nk([0xfc]);
    for (const [k, c] of G.nkHeld) { const [ch, n] = k.split(':').map(Number); for (let i = 0; i < c; i++) nk([0x80 | ch, n, 64]); }
    nk([0xb0, 64, 0]); nk([0xb0, 18, 0]); nk([0xe0, 0, 64]);
    const d = window.__bt.dev('air');
    const pend = G.airQ.map((m) => m.join(' '));
    const off = G.airQ.splice(0).concat([[0xb0, 64, 0], [0xb0, 67, 0], [0xe0, 0, 64]]);   // note-offs still queued for the next packet first
    for (const [n, c] of G.airHeld) for (let i = 0; i < c; i++) off.push([0x80, n, 64]);
    for (let i = 0; i < off.length; i += 4) { const ms = Math.floor(performance.now()) & 8191, p = [0x80 | (ms >> 7)]; for (const m of off.slice(i, i + 4)) p.push(0x80 | (ms & 127), ...m); d.send(p); await window.__sleep(15); }
    await window.__sleep(2500);
    const M = window.__M;
    return { pend, notes: M.MIDI.notes.size, left: [...M.MIDI.notes.keys()], mtouch: [...M.touches.keys()].filter((k) => typeof k === 'string' && k.startsWith('midi-')), seq: M.SEQ.on, stuck: G.stuck, maxHold: Math.round(G.maxHold), cnt: G.cnt, ble: [...M.BLE.devs.values()].map((b) => b.state + ' links=' + b.links), ci: [...M.BLE.devs.values()].map((b) => b.ci) };
  });
  // pads on channel 10 toggled Freeze, Bordun and the Puls along the way: those hold voices on purpose
  await page.evaluate(() => { const M = window.__M; M.setFreeze(false); M.setParam('bor.on', false); if (M.SEQ.on) M.seqStop(); });
  await page.waitForTimeout(4000);
  const vEnd = await page.evaluate(() => ({ voices: window.__M.A.voices.size, touches: window.__M.touches.size }));
  const clkSent = await page.evaluate((n0) => { const s = window.__midi.outputs.get('o1').sent.slice(n0); return { f8: s.filter((x) => x.d[0] === 0xf8).length, fa: s.filter((x) => x.d[0] === 0xfa).length, fc: s.filter((x) => x.d[0] === 0xfc).length }; }, sent0);
  const fin = await mem(); snaps.push({ t: 'end', ...fin });
  await snapTo('b.heapsnapshot');
  console.log('end', JSON.stringify(end), JSON.stringify(vEnd), 'clock out', JSON.stringify(clkSent));
  console.log('actions', JSON.stringify(cnt), 'failures', fails.length, JSON.stringify(fails.slice(0, 6)));
  console.log('mem', JSON.stringify(snaps.map((x) => [x.t, x.heapMB, x.nodes, x.lis])));
  // ---------- verdict ----------
  ok(!errors.length, 'no console errors (' + errors.length + ')' + (errors.length ? ' ' + errors.slice(0, 5).join(' | ') : ''));
  ok(!end.stuck.length, 'no stuck MIDI finger during the run (longest ' + end.maxHold + ' ms)' + (end.stuck.length ? ' ' + end.stuck.slice(0, 6).join(', ') : ''));
  ok(end.notes === 0 && !end.mtouch.length, 'every MIDI note ended at the end ' + JSON.stringify({ left: end.left, touches: end.mtouch }));
  ok(vEnd.voices <= 4, 'voices die out after the last note (' + vEnd.voices + ' left)');
  ok(end.cnt.drop === 2 && end.ble.every((b) => /^on/.test(b)) && / links=3/.test(end.ble[0]), 'Bluetooth dropped twice and came back each time ' + JSON.stringify(end.ble));
  ok(snaps.some((x) => x.ext && Math.abs(x.ext - 121.4) < 0.5), 'clock from the nanoKEY Studio followed (EXT ≈ 121,4 BPM): ' + JSON.stringify(snaps.map((x) => x.ext)));
  ok(clkSent.f8 > 24 * 2 * (SECS / 2 - 10) * 0.3, 'clock sent to the nanoKEY Studio in the second half: ' + JSON.stringify(clkSent));
  const w = snaps.filter((x) => typeof x.t === 'number' && x.t >= 30), h0 = w.length ? w[0].heapMB : snaps[0].heapMB;
  ok(fin.heapMB - h0 < 3, 'heap after GC stable: ' + h0 + ' MB at 30 s → ' + fin.heapMB + ' MB at the end');
  ok(fin.nodes - (w.length ? w[0].nodes : snaps[0].nodes) < 3000 && fin.lis - (w.length ? w[0].lis : snaps[0].lis) < 300, 'DOM nodes and listeners stable ' + JSON.stringify(snaps.map((x) => [x.nodes, x.lis])));
  ok(fails.length === 0, 'UI actions all ran (' + fails.length + ' failed)');
  await close();
})().catch((e) => { console.log('FAIL soak crashed: ' + (e && e.stack || e)); process.exit(1); });
