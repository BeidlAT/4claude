// Touché F5–F12 (owner, 26.10.2026: „acht weitere F-Tasten, jede klingt fundamental anders, umfassende Klangformung“):
//   1. the processor offline, each Spielweise on a test sound: at rest the output is the input sample for sample; with
//      the hand it does what it says (a cloud that outlasts the sound, a freeze that holds, new harmonics, octaves and
//      the fifth, a repetition of what was just heard, strings that ring on at their tuning); never NaN, never wild
//   2. with a Touché (fake MIDI): F5–F12 choose them, the insert enters the strip when the hand moves and leaves it at
//      rest; Ort places the sound (the panner moves, far away the hall comes up); Arpeggio plays the held note's steps
//                                                       node t-tch-fx.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Touché SE'], ['k2', 'Testkeyboard']] } });
  // 1. offline
  const off = await page.evaluate(async () => {
    const M = window.__M, SR = M.A.ctx.sampleRate, T = 3.5, n = Math.round(T * SR);
    const mkIn = (kind) => {   // a test sound, stereo, sounding for the first second
      const L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / SR; let v = 0;
        if (kind === 'chord' && t < 1) v = 0.2 * (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 277.18 * t) + Math.sin(2 * Math.PI * 329.63 * t));
        else if (kind === 'sine' && t < 1) v = 0.5 * Math.sin(2 * Math.PI * 440 * t);
        else if (kind === 'sweep' && t < 1.2) v = 0.4 * Math.sin(2 * Math.PI * (200 * t + 300 * t * t));
        else if (kind === 'burst' && t < 0.04) v = 0.6 * (Math.random() * 2 - 1);
        else if (kind === 'tone') v = 0.5 * Math.sin(2 * Math.PI * 330 * t + 3 * Math.sin(2 * Math.PI * 0.7 * t));
        L[i] = v; R[i] = v * 0.9;
      }
      return [L, R];
    };
    const run = async (mode, kind, c, steps = [], o = {}) => {
      const ctx = new OfflineAudioContext(2, n, SR); await M.ensureDSP(ctx);
      const [L, R] = mkIn(kind), b = ctx.createBuffer(2, n, SR); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
      const src = ctx.createBufferSource(); src.buffer = b;
      const node = new AudioWorkletNode(ctx, 'myzel-tfx', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: Object.assign({ mode, c }, o) });
      const idle = []; node.port.onmessage = (e) => { if (e.data && e.data.idle != null) idle.push([ctx.currentTime, e.data.idle]); };
      src.connect(node).connect(ctx.destination); src.start(0);
      for (const [t, cc] of steps) ctx.suspend(Math.round(t * SR / 128) * 128 / SR).then(async () => { node.port.postMessage({ c: cc }); await new Promise((r) => setTimeout(r, 30)); ctx.resume(); });
      const out = await ctx.startRendering(), oL = out.getChannelData(0), oR = out.getChannelData(1);
      let bad = false, pk = 0, same = true; for (let i = 0; i < n; i++) { const v = oL[i], u = oR[i]; if (!Number.isFinite(v) || !Number.isFinite(u)) bad = true; pk = Math.max(pk, Math.abs(v), Math.abs(u)); if (v !== L[i] || u !== R[i]) same = false; }
      const rms = (a, b2) => { let s = 0; const i0 = Math.round(a * SR), i1 = Math.round(b2 * SR); for (let i = i0; i < i1; i++) s += oL[i] * oL[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };
      const gz = (f, a, b2) => { const i0 = Math.round(a * SR), i1 = Math.round(b2 * SR), w = 2 * Math.PI * f / SR, cf = 2 * Math.cos(w); let s1 = 0, s2 = 0; for (let i = i0; i < i1; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i - i0) / (i1 - i0)); const s0 = oL[i] * h + cf * s1 - s2; s2 = s1; s1 = s0; } return 10 * Math.log10((s1 * s1 + s2 * s2 - cf * s1 * s2) / ((i1 - i0) * (i1 - i0)) + 1e-30); };
      return { bad, pk: +pk.toFixed(3), same, rms, gz, oL, L, idle };
    };
    const o = {};
    // at rest: every Spielweise passes the sound through bit for bit
    o.rest = {};
    for (const md of ['koerner', 'eis', 'oberton', 'stottern', 'resonanz']) { const r = await run(md, 'chord', [0, 0, 0, 0]); o.rest[md] = r.same && !r.bad; }
    // Körner: the cloud outlasts the sound (it reads back in time)
    let r = await run('koerner', 'chord', [0.6, 0, 0.35, 0.2]); o.koerner = { bad: r.bad, pk: r.pk, after: +r.rms(1.2, 1.8).toFixed(4), dry: +r.rms(3.0, 3.4).toFixed(4) };
    // Eis: pressed at 0.5 s, the sound stops at 1 s – the frozen moment goes on; let go at 2 s – it fades, then idle
    r = await run('eis', 'chord', [0, 0, 0, 0], [[0.5, [0.8, 0, 0, 0]], [2.0, [0, 0, 0, 0]]]); o.eis = { bad: r.bad, pk: r.pk, held: +r.rms(1.3, 1.9).toFixed(4), gone: +r.rms(3.0, 3.4).toFixed(5), idle: r.idle.map((x) => x[1]).join('') };
    r = await run('eis', 'chord', [0, 0, 0, 0], [[0.5, [0.8, 0, 0, 1]]]); o.eisUp = { a220: +r.gz(220, 1.2, 1.9).toFixed(1), a440: +r.gz(440, 1.2, 1.9).toFixed(1) };   // (rechts: an octave up – 220 Hz becomes 440 Hz)
    // Obertöne: a pure sine gets harmonics – odd ones rechts, even ones links
    r = await run('oberton', 'sine', [0.6, 0, 0, 0.9]); o.odd = { bad: r.bad, pk: r.pk, h1: +r.gz(440, 0.3, 0.9).toFixed(1), h3: +r.gz(1320, 0.3, 0.9).toFixed(1), h2: +r.gz(880, 0.3, 0.9).toFixed(1) };
    r = await run('oberton', 'sine', [0.6, 0, 0.9, 0]); o.even = { h1: +r.gz(440, 0.3, 0.9).toFixed(1), h2: +r.gz(880, 0.3, 0.9).toFixed(1) };
    r = await run('oberton', 'sine', [0, 0, 0, 0]); o.clean = { h3: +r.gz(1320, 0.3, 0.9).toFixed(1), same: r.same };
    // Stottern: pressed at 0.6 s, a beat of 0.5 s (links): what plays then is the half second before – again and again
    r = await run('stottern', 'sweep', [0, 0, 0, 0], [[0.6, [0, 0, 1, 0]]], { beat: 0.5 });
    { const i0 = Math.round(0.68 * SR), N = Math.round(0.3 * SR), off2 = Math.round(0.5 * SR), off3 = Math.round(1.0 * SR); let sxy = 0, sxx = 0, syy = 0, s2 = 0, s3 = 0, s4 = 0; for (let i = i0; i < i0 + N; i++) { const x = r.oL[i], y = r.L[i - off2], z = r.oL[i + off2]; sxy += x * y; sxx += x * x; syy += y * y; s2 += x * z; s3 += z * z; }
      o.stottern = { bad: r.bad, pk: r.pk, corrIn: +(sxy / Math.sqrt(sxx * syy + 1e-30)).toFixed(3), corrRep: +(s2 / Math.sqrt(sxx * s3 + 1e-30)).toFixed(3) }; }
    // (31.10.2026, owner: „Stottern knackst, wenn ich stärker nach links oder rechts drücke“) pressed in the middle, then
    // harder left (a whole beat – it read past the ring's head), right (a sixteenth), heran (each repetition a step down):
    // the output's curvature stays that of a gliding tone – no jump anywhere
    r = await run('stottern', 'tone', [0, 0, 0, 0], [[0.6, [0.3, 0, 0, 0]], [0.75, [0.3, 0, 1, 0]], [1.6, [0.3, 0, 0, 1]], [2.0, [0.3, 0.8, 0.2, 0.6]], [2.6, [0.3, 0, 0.7, 0]]], { beat: 0.5 });
    { let mx = 0, at = 0; for (let i = Math.round(0.5 * SR); i < n; i++) { const d = Math.abs(r.oL[i] - 2 * r.oL[i - 1] + r.oL[i - 2]); if (d > mx) { mx = d; at = i / SR; } } o.stClick = { bad: r.bad, d2: +mx.toFixed(4), at: +at.toFixed(3) }; }
    // Resonanz: a short noise burst – the strings (tuned 220, 330 …) ring on long after it
    r = await run('resonanz', 'burst', [0.9, 0, 0, 0], [], { freqs: [220, 330, 440, 550, 660, 880] });
    o.res = { bad: r.bad, pk: r.pk, ring: +r.rms(0.5, 1.0).toFixed(4), a220: +r.gz(220, 0.4, 1.2).toFixed(1), a300: +r.gz(300, 0.4, 1.2).toFixed(1) };
    return o;
  });
  const restOk = Object.entries(off.rest).filter(([, v]) => !v).map(([k]) => k);
  ok(!restOk.length, `at rest each of the five passes the sound through bit for bit${restOk.length ? ' – not: ' + restOk.join(', ') : ''}`);
  ok(!off.koerner.bad && off.koerner.after > 0.02 && off.koerner.pk < 2, `Körner: a cloud from what was played – it goes on after the sound (${JSON.stringify(off.koerner)})`);
  ok(!off.eis.bad && off.eis.held > 0.03 && off.eis.gone < 1e-3 && /01$/.test(off.eis.idle) && off.eis.pk < 2, `Eis: a press freezes the moment, it holds after the sound has gone; let go, it fades and rests (${JSON.stringify(off.eis)})`);
  ok(off.eisUp.a440 > off.eisUp.a220 + 6, `Eis rechts: the frozen chord an octave up (${JSON.stringify(off.eisUp)})`);
  ok(!off.odd.bad && off.odd.h3 > off.odd.h1 - 30 && off.odd.h3 > off.odd.h2 + 10 && off.even.h2 > off.even.h1 - 35 && off.clean.h3 < off.odd.h3 - 60, `Obertöne: rechts odd harmonics, links even ones, at rest none (${JSON.stringify([off.odd, off.even, off.clean])})`);
  ok(!off.stottern.bad && off.stottern.corrIn > 0.9 && off.stottern.corrRep > 0.9, `Stottern: the half second before is played again, and again (${JSON.stringify(off.stottern)})`);
  ok(!off.stottern.bad && off.stClick.d2 < 0.03, `Stottern: links/rechts/heran harder while it repeats – no click (${JSON.stringify(off.stClick)})`);
  ok(!off.res.bad && off.res.ring > 0.005 && off.res.a220 > off.res.a300 + 15 && off.res.pk < 2, `Resonanz: strings tuned to the notes ring on after a short burst (${JSON.stringify(off.res)})`);
  // 2. with a Touché
  const live = await page.evaluate(async () => {
    const M = window.__M, T = (b) => window.__send(b, 'k1'), K = (b) => window.__send(b, 'k2'), sl = window.__sleep, o = {};
    const key = (k) => M.tchWeise(M.TCH_W[+k.slice(1) <= 4 ? +k.slice(1) - 1 : +k.slice(1) + 3][0]);   // (31.10.2026: the F keys are unbound – the old numbering, chosen directly)
    const st = M.MIX.s.fin, path = () => [+st.tD.gain.value.toFixed(2), +st.tW.gain.value.toFixed(2)];
    o.keys = []; for (const k of ['F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']) { key(k); await sl(40); o.keys.push(M.P['midi.tch']); }
    key('F5'); await sl(300); o.made = !!M.TFX.ins.get('fin'); o.rest = path();
    K([0x90, 60, 100]); await sl(100);
    T([0xb0, 17, 110]); M.mapFlush(); await sl(150); o.press = path(); o.busy = M.TFX.busy;
    T([0xb0, 17, 0]); M.mapFlush(); await sl(1600); o.after = path();
    key('F9'); await sl(150); T([0xb0, 19, 127]); T([0xb0, 17, 127]); M.mapFlush(); await sl(250);
    const I = M.TFX.ins.get('fin'); o.ort = { w: I && I.w, x: I && +(I.pn.positionX ? I.pn.positionX.value : 0).toFixed(2), rev: +M.modVal('rev').toFixed(2), path: path() };
    T([0xb0, 19, 0]); T([0xb0, 17, 0]); M.mapFlush(); await sl(600); o.ortRest = { rev: M.modVal('rev'), path: path() };
    // Fächer: links – the held note's octave below, a voice of its own; let go of the note, it ends with it
    key('F8'); await sl(120); const tt = M.touches.get('midi-k2-0-60');
    T([0xb0, 18, 120]); M.mapFlush(); await sl(200); o.fan = { n: tt ? tt.voices.filter((x) => x.fan).length : -1, kinds: tt && tt.fan ? Object.keys(tt.fan).join() : '' };
    T([0xb0, 17, 120]); M.mapFlush(); await sl(200); o.fan.kinds2 = tt && tt.fan ? Object.keys(tt.fan).sort().join() : '';
    T([0xb0, 18, 0]); T([0xb0, 17, 0]); M.mapFlush(); await sl(100);
    const fv = tt ? tt.voices.filter((x) => x.fan).map((x) => x.v) : [];
    K([0x80, 60, 0]); await sl(900); o.fan.ended = fv.every((v) => !v.alive || v.rel || v.released || !M.A.voices.has(v)) ; o.fan.set = M.TFX.fans.size;
    K([0x90, 60, 100]); await sl(100);
    key('F12'); await sl(150); o.dropped = !M.TFX.ins.get('fin');
    const seen = new Set(); T([0xb0, 17, 90]); T([0xb0, 19, 90]); M.mapFlush();
    for (let i = 0; i < 30; i++) { for (const v of M.A.voices) seen.add(v); await sl(25); }
    T([0xb0, 17, 0]); T([0xb0, 19, 0]); M.mapFlush(); await sl(200);
    o.arp = seen.size;
    K([0x80, 60, 0]); await sl(100);
    key('F1'); await sl(100); o.back = M.P['midi.tch'];
    return o;
  });
  ok(live.keys.join() === 'koerner,eis,oberton,faecher,ort,stottern,resonanz,arp', `F5–F12 choose the eight (${live.keys.join(', ')})`);
  ok(live.made && live.rest.join() === '1,0' && live.press.join() === '0,1' && live.busy && live.after.join() === '1,0', `the insert: made, out of the path at rest, in it while the hand moves, out again at rest (${JSON.stringify([live.rest, live.press, live.after])})`);
  ok(live.ort.w === 'ort' && live.ort.x > 0.5 && live.ort.rev > 0.3 && live.ort.path.join() === '0,1' && live.ortRest.rev === 0 && live.ortRest.path.join() === '1,0', `Ort: rechts and far – the sound moves right, the hall comes up; let go, all as before (${JSON.stringify([live.ort, live.ortRest])})`);
  ok(live.fan.n === 1 && live.fan.kinds === 'lo' && live.fan.kinds2 === 'dd,du,lo' && live.fan.set === 0, `Fächer: links the octave below as a voice of the note, weg the detuned pair; the note let go, they end with it (${JSON.stringify(live.fan)})`);
  ok(live.dropped && live.arp >= 5 && live.back === 'finger', `Arpeggio: the hand plays the held note's steps (${live.arp} voices in 0.75 s); F1 back to Finger`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
