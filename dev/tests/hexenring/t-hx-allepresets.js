// (owner, 27.10.2026: „endgültig und funktionierend“) a Schleife recorded in Handpan-Kreis; every Klangwelt is loaded in
// turn over it: the loops' whole path – the ring's output, the Hexenring channel, the loops' own echo and hall – pass for
// pass the same as before each time; the tempo stays. (The sum's own EQ, compressor and width – mst.* – act on all.)
//                                                                                     node t-hx-allepresets.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, SR = A.ctx.sampleRate, ctx = A.ctx, o = { bad: [], n: 0, worst: 1, bpm: [] };
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
    await sl(6000);   // (echo and hall of the loops settled)
    // the loops' path: the ring's output 0 and the two returns of their room, summed in a tap (the Hexenring channel's
    // fader is the user's – unchanged)
    const sum = ctx.createGain(); M.HX.node.connect(sum, 0); for (const U of M.HXR.rooms.values()) { U.revRet.connect(sum); U.dlyRet.connect(sum); }
    const grab = async (sec) => { const sp = ctx.createScriptProcessor(4096, 1, 1), buf = []; sp.onaudioprocess = (e) => buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); const z = ctx.createGain(); z.gain.value = 0; sum.connect(sp); sp.connect(z); z.connect(ctx.destination); await sl(sec * 1000); sum.disconnect(sp); sp.disconnect(); const a = new Float32Array(buf.reduce((x, c) => x + c.length, 0)); let p = 0; for (const c of buf) { a.set(c, p); p += c.length; } return a; };
    const pass = Math.round(2.4 * SR), ref = (await grab(5)).slice(pass, 2 * pass);
    const same = (all) => { let best = -2, bl = 0; for (let lag = 0; lag < pass; lag += 1) { let xy = 0, xx = 0, yy = 0; for (let i = 0; i < 24000; i += 4) { const a = ref[i], b = all[pass + lag + i] || 0; xy += a * b; xx += a * a; yy += b * b; } const c = xy / Math.sqrt(xx * yy + 1e-30); if (c > best) { best = c; bl = lag; } }
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i < pass; i++) { const a = ref[i], b = all[pass + bl + i] || 0; xy += a * b; xx += a * a; yy += b * b; } return xy / Math.sqrt(xx * yy + 1e-30); };
    for (const p of M.PRESETS) {
      M.loadPreset(p); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.setParam('bor.on', false);
      await sl(700);
      let c = same(await grab(7.5));
      if (!(c > 0.9999)) { await sl(2000); c = same(await grab(7.5)); }   // (the page busy loading a long hall: the capture may lose a block – measured again)
      o.n++; o.worst = Math.min(o.worst, c);
      if (!(c > 0.9999)) o.bad.push(p.key + ':' + c.toFixed(4));
      const b = M.tgBpm(A.ctx.currentTime); if (Math.abs(b - 100) > 0.01) o.bpm.push(p.key + ':' + b.toFixed(1));
    }
    o.mst = M.PRESETS.filter((p) => Object.keys(p.v).some((k) => k.startsWith('mst.'))).map((p) => p.key);
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.n === r.n && r.bad.length === 0, `${r.n} Klangwelten loaded over a Schleife: its path the same each time (worst correlation ${r.worst.toFixed(6)})${r.bad.length ? ' – changed: ' + r.bad.join(', ') : ''}`);
  ok(r.bpm.length === 0, `…the tempo stays 100 BPM${r.bpm.length ? ' – not: ' + r.bpm.join(', ') : ''}`);
  console.log('INFO the sum (mst.*) is set by: ' + r.mst.join(', '));
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
