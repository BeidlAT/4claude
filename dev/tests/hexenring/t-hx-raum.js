// (owner, 27.10.2026: „aufgenommene Schleifen werden nicht mehr von Effekten berührt“) each Schleife plays into the echo
// and hall it was played in, whatever preset comes after; Taumeln off; the tempo stays. The owner's way: Schleife 1 in
// Handpan-Kreis, Maschinenträume loaded, Schleife 2 played there, then other Klangwelten – both stay as they were,
// each in its own room; a Schleife saved before the rooms: the room of its patch after a reload; one that cannot be
// baked plays dry; „Effekte des Presets wirken auf die Schleifen“ (hx.fx): dry through the live chain into the field's
// echo and hall – off: baked, own rooms again.                                                     node t-hx-raum.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {}, SR = A.ctx.sampleRate, ctx = A.ctx;
    await window.__reset(); await sl(300);
    const lanesOff = () => { for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.setParam('bor.on', false); M.setParam('dly.wow', 0); };
    M.loadPreset(M.PRESETS.find((p) => p.key === 'handpankreis')); await sl(1200); lanesOff();
    window.__grid(100); await sl(800);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const rec = async (degs, eng) => {
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.6, degs, 1, { eng, dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null); const L = M.hxLoopsLive().sort((a, b) => b.made - a.made)[0];
      for (let i = 0; i < 150 && !L.sch.every((id) => M.HX.sch.get(id).baked); i++) await sl(100);
      return L;
    };
    const L1 = await rec([0, 4, 7, 4], 'hng');
    o.tau = L1.taumeln;
    M.loadPreset(M.PRESETS.find((p) => p.key === 'maschine')); lanesOff(); await sl(1500);
    const L2 = await rec([7, 9, 11, 9], 'mem');
    await sl(6000);   // (their echoes and halls settled)
    o.rooms = M.HXR_rooms ? 0 : [...M.HXR.rooms.values()].filter((U) => !U.dead && U.n > 0).map((U) => U.v['rev.size'] + '/' + U.v['dly.fb']);
    o.own = [L1, L2].map((L) => L.rm && L.rm.U.v['rev.size'] + '/' + L.rm.U.v['dly.fb']);
    o.bpm0 = M.tgBpm(A.ctx.currentTime);
    // the loops' whole path: the ring's output and every room's returns
    const sum = ctx.createGain(); M.HX.node.connect(sum, 0); for (const U of M.HXR.rooms.values()) { U.revRet.connect(sum); U.dlyRet.connect(sum); }
    const grab = async (sec) => { const sp = ctx.createScriptProcessor(4096, 1, 1), buf = []; sp.onaudioprocess = (e) => buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); const z = ctx.createGain(); z.gain.value = 0; sum.connect(sp); sp.connect(z); z.connect(ctx.destination); await sl(sec * 1000); sum.disconnect(sp); sp.disconnect(); const a = new Float32Array(buf.reduce((x, c) => x + c.length, 0)); let p = 0; for (const c of buf) { a.set(c, p); p += c.length; } return a; };
    const pass = Math.round(2.4 * SR), ref = (await grab(5)).slice(pass, 2 * pass);
    const same = (all) => { let best = -2, bl = 0; for (let lag = 0; lag < pass; lag += 1) { let xy = 0, xx = 0, yy = 0; for (let i = 0; i < 24000; i += 4) { const a = ref[i], b = all[pass + lag + i] || 0; xy += a * b; xx += a * a; yy += b * b; } const c = xy / Math.sqrt(xx * yy + 1e-30); if (c > best) { best = c; bl = lag; } }
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i < pass; i++) { const a = ref[i], b = all[pass + bl + i] || 0; xy += a * b; xx += a * a; yy += b * b; } return xy / Math.sqrt(xx * yy + 1e-30); };
    o.after = {};
    for (const k of ['handpankreis', 'nordlichtfeld', 'maschine', 'leer']) {
      M.loadPreset(k === 'leer' ? M.PRESET_LEER : M.PRESETS.find((p) => p.key === k)); lanesOff(); await sl(700);
      o.after[k] = +same(await grab(7.5)).toFixed(6);
    }
    o.bpm = M.tgBpm(A.ctx.currentTime);
    // the switch
    const st = M.MIX.src.find((s) => s.k === 'hxr'), S1 = M.HX.sch.get(L1.sch[0]);
    M.setParam('hx.fx', true); await sl(3500);
    o.on = { out: S1.out, rev: st.to.rev === M.A.send.rev.target, dly: st.to.dly === M.A.send.dly.target, rm: !!L1.rm };
    M.setParam('hx.fx', false); await sl(3500);
    o.off = { out: S1.out, baked: !!S1.baked, strip: st.to.rev == null && st.to.dly == null, rm: !!L1.rm && !!L2.rm };
    // a Schicht whose bake cannot happen: dry
    const S2 = M.HX.sch.get(L2.sch[0]); S2.bak = null; S2.baked = false; S2.cut = Object.assign({}, S2.cut, { stale: true }); L2.chainRec = null;
    await M.hxAfterFill(S2); await sl(3500); o.dry = S2.out;
    // as if saved before the rooms: no room of their own
    for (const L of M.hxLoopsLive()) L.room = null;
    o.p1 = L1.P['rev.size'] + '/' + L1.P['dly.fb'];
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.tau === false, 'a new Schleife does not taumeln with the field');
  ok(r.own[0] === '4.5/0.3' && r.own[1] === '3/0.68', `each in the room it was played in: Schleife 1 Handpan-Kreis (${r.own[0]}), Schleife 2 Maschinenträume (${r.own[1]})`);
  const v = Object.values(r.after);
  ok(v.every((c) => c > 0.9999), `four Klangwelten loaded over both: their sound the same each time (${Object.entries(r.after).map(([k, c]) => k + ' ' + c).join(', ')})`);
  ok(Math.abs(r.bpm - r.bpm0) < 0.01, `…the tempo stays ${r.bpm.toFixed(1)} BPM`);
  ok(r.on.out === 1 && r.on.rev && r.on.dly && !r.on.rm, `„Effekte des Presets wirken auf die Schleifen“: dry through the live chain into the field's echo and hall (${JSON.stringify(r.on)})`);
  ok(r.off.out === 0 && r.off.baked && r.off.strip && r.off.rm, `…off: baked, each its own room, the channel's own sends closed (${JSON.stringify(r.off)})`);
  ok(r.dry === 0, `a Schicht that cannot be baked plays dry – never through the preset's chain (out ${r.dry})`);
  // saved before the rooms existed: after a reload, the room of their patch
  await page.evaluate(async () => { const M = window.__M; for (const L of M.hxLoopsLive()) M.hxSaveLoop(L); await new Promise((r) => setTimeout(r, 2500)); });
  await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart').catch(() => {}); await page.waitForTimeout(6000);
  const r3 = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive().sort((a, b) => a.slot - b.slot)[0];
    M.loadPreset(M.PRESETS.find((p) => p.key === 'maschine')); await new Promise((r) => setTimeout(r, 1500));
    return { n: M.hxLoopsLive().length, room: L && L.rm && L.rm.U.v['rev.size'] + '/' + L.rm.U.v['dly.fb'], send: L && L.rm && L.rm.U.revSend.gain.value, p: L && L.P && L.P['rev.mix'] };
  });
  console.log(JSON.stringify(r3));
  ok(r3.n === 2 && r3.room === r.p1 && Math.abs(r3.send - r3.p) < 0.01, `a Schleife saved without a room: after a reload the room of its patch (${r3.room}, Hall ${r3.send && r3.send.toFixed(2)}) – not Maschinenträume's`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
