// (owner, 27.10.2026: „wenn ich das Preset wechsle, ändert sich der Klang der laufenden Schleife, auch wenn nur leicht –
// er muss 1:1 original bleiben“) a Schleife plays alone; a preset with another echo, hall, room, Taumeln and chain is
// loaded: what comes out (the master) pass for pass the same as before; its Taumeln off by default. (owner: „mit
// Maschinenträume hört man es deutlich“) recorded in Handpan-Kreis, then Maschinenträume (128 BPM, crush, ring, band-pass,
// echo): the Schleife the same – the tempo stays; „Effekte des Presets wirken auf die Schleifen“ (hx.fx): the loops dry
// through the live chain into the field's echo and hall – off: baked again, their own room.        node t-hx-raum.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {}, SR = A.ctx.sampleRate;
    await window.__reset(); window.__grid(100); await sl(300);
    for (const [k, v] of Object.entries({ 'rev.raum': 'nebel', 'rev.size': 5, 'rev.mix': 0.45, 'dly.mix': 0.35, 'dly.fb': 0.4, 'mov.drift': 6, 'cho.mix': 0.3, 'dly.wow': 0 })) M.setParam(k, v);
    await sl(800);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.6, [0, 4, 7, 4], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).baked); i++) await sl(100);
    o.tau = L.taumeln; o.room = !!M.HXR.u && M.HXR.v && M.HXR.v['rev.size'];
    // capture the master, pass by pass (a pass = one bar at 100 BPM = 2.4 s)
    const ctx = A.ctx, sp = ctx.createScriptProcessor(4096, 2, 2), buf = []; let t0 = null;
    sp.onaudioprocess = (e) => { if (t0 == null) t0 = e.playbackTime; buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    const z = ctx.createGain(); z.gain.value = 0; A.out.connect(sp); sp.connect(z); z.connect(ctx.destination);
    const bar = (b) => M.tgTime(b), nowB = () => Math.ceil(M.tgBeat(A.ctx.currentTime) / 4) * 4;
    const b1 = nowB() + 8; await window.__until(bar(b1 + 8) + 0.3);   // (a whole pass, echo and hall settled before it; and the next, the control)
    // another preset: other echo, hall, room, Taumeln, chain
    M.loadPreset({ name: 'Anders', v: Object.assign(M.patchValues(), { 'rev.raum': 'stein', 'rev.size': 2, 'rev.mix': 0.8, 'dly.mix': 0.1, 'dly.fb': 0.7, 'dly.div': '0.5', 'mov.drift': 30, 'cho.mix': 0.9, 'drv.mix': 0.8, 'dly.wow': 0.9 }) });
    const b2 = nowB() + 12; await window.__until(bar(b2 + 4) + 0.3);
    A.out.disconnect(sp); sp.disconnect();
    const all = new Float32Array(buf.reduce((a, c) => a + c.length, 0)); let p = 0; for (const c of buf) { all.set(c, p); p += c.length; }
    const seg = (b) => { const a = Math.round((bar(b) - t0) * SR); return all.subarray(a, a + Math.round(2.4 * SR)); };
    const cmp = (x, y) => { let xy = 0, xx = 0, yy = 0; for (let i = 0; i < x.length; i++) { xy += x[i] * y[i]; xx += x[i] * x[i]; yy += y[i] * y[i]; } return xy / Math.sqrt(xx * yy); };
    o.ctl = cmp(seg(b1), seg(b1 + 4));
    const x = seg(b1), y = seg(b2);
    let xy = 0, xx = 0, yy = 0, d = 0; for (let i = 0; i < x.length; i++) { xy += x[i] * y[i]; xx += x[i] * x[i]; yy += y[i] * y[i]; d = Math.max(d, Math.abs(x[i] - y[i])); }
    o.corr = xy / Math.sqrt(xx * yy); o.rms = Math.sqrt(xx / x.length); o.diffDb = 20 * Math.log10(Math.sqrt(Math.max(1e-20, xx + yy - 2 * xy) / x.length) / o.rms);
    o.fieldRev = M.P['rev.size']; o.loopRev = M.HXR.v['rev.size'];
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.tau === false, 'a new Schleife does not taumeln with the field (its own tuning)');
  ok(r.room === 5 && r.loopRev === 5 && r.fieldRev === 2, `its room: the hall it was played in (${r.loopRev} s) – the field's is now ${r.fieldRev} s`);
  ok(r.corr > 0.995 && r.corr >= r.ctl - 0.003, `a pass before and after another preset: the same as two passes before it (correlation ${r.corr.toFixed(5)}; pass to pass without a change ${r.ctl.toFixed(5)}; difference ${r.diffDb.toFixed(1)} dB)`);
  // the owner's case: Handpan-Kreis, then Maschinenträume
  const r2 = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {}, SR = A.ctx.sampleRate;
    await window.__reset(); await sl(300);
    M.loadPreset(M.PRESETS.find((p) => p.key === 'handpankreis')); await sl(1200);
    for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false);
    window.__grid(100); M.setParam('dly.wow', 0); await sl(600);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.6, [0, 4, 7, 4], 1, { eng: 'hng', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0];
    for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).baked); i++) await sl(100);
    await sl(800);
    const ctx = A.ctx, taps = { master: A.out, ring: M.HX.node }, rec = {};
    for (const k in taps) { const sp = ctx.createScriptProcessor(4096, 2, 2), buf = []; sp.onaudioprocess = (e) => buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); const z = ctx.createGain(); z.gain.value = 0; if (k === 'ring') taps[k].connect(sp, 0); else taps[k].connect(sp); sp.connect(z); z.connect(ctx.destination); rec[k] = buf; }
    const bar = (b) => M.tgTime(b), nowB = () => Math.ceil(M.tgBeat(A.ctx.currentTime) / 4) * 4;
    const tA = A.ctx.currentTime; await window.__until(bar(nowB() + 12));
    M.loadPreset(M.PRESETS.find((p) => p.key === 'maschine'));
    for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.setParam('dly.wow', 0);   // (the field's Puls and its tape wobble: not the Schleife)
    await sl(9000);
    o.bpm = M.tgBpm(A.ctx.currentTime); o.slider = M.P['seq.bpm'];
    // a pass before the preset against one after it, aligned by their correlation (the capture may drop a block while the preset loads)
    const flat = (b) => { const a = new Float32Array(b.reduce((x, c) => x + c.length, 0)); let p = 0; for (const c of b) { a.set(c, p); p += c.length; } return a; };
    const pass = Math.round(2.4 * SR);
    for (const k in rec) {
      const all = flat(rec[k]), x = all.subarray(2 * pass, 3 * pass), a2 = all.length - 2 * pass;
      let best = -2, bl = 0; for (let lag = 0; lag < pass; lag += 1) { let xy = 0, xx = 0, yy = 0; for (let i = 0; i < 24000; i += 3) { const a = x[i], b = all[a2 + lag - pass / 2 + i] || 0; xy += a * b; xx += a * a; yy += b * b; } const c = xy / Math.sqrt(xx * yy + 1e-30); if (c > best) { best = c; bl = lag; } }
      const y = all.subarray(a2 + bl - pass / 2, a2 + bl + pass / 2);
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i < pass; i++) { xy += x[i] * y[i]; xx += x[i] * x[i]; yy += y[i] * y[i]; }
      o[k] = { c: xy / Math.sqrt(xx * yy), db: 10 * Math.log10((xx + yy - 2 * xy + 1e-30) / xx) };
    }
    // the switch
    const S = M.HX.sch.get(L.sch[0]), st = M.MIX.src.find((s) => s.k === 'hxr');
    M.setParam('hx.fx', true); await sl(3500);
    o.on = { out: S.out, rev: st.to.rev === M.A.send.rev.target, dly: st.to.dly === M.A.send.dly.target, folgt: L.folgt };
    M.setParam('hx.fx', false); await sl(3500);
    o.off = { out: S.out, baked: !!S.baked, rev: st.to.rev === M.HXR.u.revSend, folgt: L.folgt };
    return o;
  });
  console.log(JSON.stringify(r2));
  ok(Math.abs(r2.bpm - 100) < 0.01 && r2.slider === 100, `Maschinenträume (128 BPM) loaded over a Schleife: the tempo stays ${r2.bpm} BPM`);
  ok(r2.ring.c > 0.9999 && r2.master.c > 0.999, `…the Schleife the same before and after: its own output ${r2.ring.c.toFixed(5)} (${r2.ring.db.toFixed(0)} dB), at the master ${r2.master.c.toFixed(5)} (${r2.master.db.toFixed(0)} dB)`);
  ok(r2.on.out === 1 && r2.on.rev && r2.on.dly && r2.on.folgt, `„Effekte des Presets wirken auf die Schleifen“: dry through the live chain, the field's echo and hall (${JSON.stringify(r2.on)})`);
  ok(r2.off.out === 0 && r2.off.baked && r2.off.rev && !r2.off.folgt, `…off: its baked version, its own room again (${JSON.stringify(r2.off)})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
