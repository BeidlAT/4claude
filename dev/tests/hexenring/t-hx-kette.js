// (owner, 27.10.2026: „wenn ich es auf eingebrannt lasse, kann ich mittels Filter den Sound immer noch ändern … nur bei
// neu dürfte der Filter greifen“) measured where it is heard – the master, the field silent: the Hexenring channel set to
// KETTE (as the owner had it) no longer takes the live chain over baked loops – a filter closed, the drive full,
// Maschinenträume loaded: the Schleife the same; its node KETTE/DIREKT is the switch „Effekte des Presets wirken auf die
// Schleifen“; a Schleife set to follow the chain („folgt“) – the filter acts on it.                  node t-hx-kette.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, SR = A.ctx.sampleRate, ctx = A.ctx, o = {};
    const quiet = () => { for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.setParam('bor.on', false); M.setParam('dly.wow', 0); };
    await window.__reset(); await sl(300);
    M.loadPreset(M.PRESETS.find((p) => p.key === 'handpankreis')); await sl(1200); quiet();
    window.__grid(100); await sl(600);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.6, [0, 4, 7, 4], 1, { eng: 'hng', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null); const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 150 && !S.baked; i++) await sl(100);
    // the owner's console: the Hexenring channel on KETTE – as stored before (set past the switch)
    M.P['xhxr.route'] = 'fx'; M.wireStrip && M.wireStrip(M.MIX.s.hxr);
    await sl(6000);
    const grab = async (sec) => { const sp = ctx.createScriptProcessor(4096, 1, 1), buf = []; sp.onaudioprocess = (e) => buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); const z = ctx.createGain(); z.gain.value = 0; A.out.connect(sp); sp.connect(z); z.connect(ctx.destination); await sl(sec * 1000); A.out.disconnect(sp); sp.disconnect(); const a = new Float32Array(buf.reduce((x, c) => x + c.length, 0)); let p = 0; for (const c of buf) { a.set(c, p); p += c.length; } return a; };
    const pass = Math.round(2.4 * SR), ref = (await grab(5)).slice(pass, 2 * pass);
    const same = (all) => { let best = -2, bl = 0; for (let lag = 0; lag < pass; lag += 1) { let xy = 0, xx = 0, yy = 0; for (let i = 0; i < 24000; i += 4) { const a = ref[i], b = all[pass + lag + i] || 0; xy += a * b; xx += a * a; yy += b * b; } const c = xy / Math.sqrt(xx * yy + 1e-30); if (c > best) { best = c; bl = lag; } }
      let xy = 0, xx = 0, yy = 0; for (let i = 0; i < pass; i++) { const a = ref[i], b = all[pass + bl + i] || 0; xy += a * b; xx += a * a; yy += b * b; } return xy / Math.sqrt(xx * yy + 1e-30); };
    const meas = async () => { let c = same(await grab(7.5)); if (!(c > 0.9999)) { await sl(1500); c = same(await grab(7.5)); } return +c.toFixed(6); };
    // eingebrannt: the filter closed, the drive full
    M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 300); M.setParam('drv.mix', 1); M.setParam('drv.amt', 0.9); await sl(500);
    o.filter = await meas();
    M.loadPreset(M.PRESETS.find((p) => p.key === 'maschine')); quiet(); await sl(800);
    o.maschine = await meas();
    o.fx = M.P['hx.fx'];
    // „folgt“ for this Schleife: now the filter acts
    M.hxFolgt(L, true); await sl(3500);
    M.setParam('flt.type', 'lowpass'); M.setParam('flt.freq', 300); await sl(300);
    o.folgt = await meas(); o.out = S.out;
    M.hxFolgt(L, false); await sl(3500);
    // the node in the console: KETTE turns the switch on, DIREKT off
    M.setParam('xhxr.route', 'dir'); await sl(200); M.setParam('xhxr.route', 'fx'); await sl(300); o.nodeOn = M.P['hx.fx'];
    M.setParam('xhxr.route', 'dir'); await sl(300); o.nodeOff = M.P['hx.fx'];
    M.setParam('hx.fx', true); await sl(200); o.mirror = M.P['xhxr.route']; M.setParam('hx.fx', false); await sl(200); o.mirror2 = M.P['xhxr.route'];
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.filter > 0.9999, `the channel on KETTE, the Schleife eingebrannt: the filter closed and the drive full leave it as it was (master, correlation ${r.filter})`);
  ok(r.maschine > 0.9999, `…Maschinenträume loaded: the same (${r.maschine})`);
  ok(r.out === 1 && r.folgt < 0.99, `the Schleife set to „folgt“: the filter acts on it (correlation ${r.folgt})`);
  ok(r.nodeOn === true && r.nodeOff === false && r.mirror === 'fx' && r.mirror2 === 'dir', 'the channel\'s node KETTE/DIREKT is the switch „Effekte des Presets wirken auf die Schleifen“ – both ways');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
